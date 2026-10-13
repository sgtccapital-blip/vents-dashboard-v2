/**
 * Notificaciones push (Web Push / VAPID) para el Command Center.
 *
 * - Las claves VAPID salen de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY o se generan una vez y se
 *   guardan en db.pushConfig (viajan a Supabase con el resto; el respaldo nunca incluye la privada).
 * - Cada suscripción guarda a quién pertenece (GG, MARIO…) para avisar solo a esa persona.
 * - buildDailyBrief / buildEveningReminders son puros (se prueban sin enviar nada).
 */
import webpush from 'web-push';
import { TEAM_MEMBERS } from './agent.js';

const isDone = (t) => t.done === true || ['done', 'completed', 'completada', 'hecha'].includes(String(t.status || '').toLowerCase());
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Fecha de hoy en la zona del negocio (el servidor corre en UTC). */
export function todayIn(timeZone, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const get = (t) => Number(parts.find(p => p.type === t).value);
    return new Date(get('year'), get('month') - 1, get('day'));
}

export function ensureVapid(db) {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, created: false };
    }
    if (db.pushConfig?.publicKey && db.pushConfig?.privateKey) return { ...db.pushConfig, created: false };
    const keys = webpush.generateVAPIDKeys();
    db.pushConfig = { publicKey: keys.publicKey, privateKey: keys.privateKey, createdAt: new Date().toISOString() };
    return { ...keys, created: true };
}

const ownerOf = (t) => t.assignee || t.assignedTo || null;

/** Resumen de la mañana por persona: sus tareas de hoy/vencidas y los eventos de hoy y mañana. */
export function buildDailyBrief(db, today) {
    const todayKey = dateKey(today);
    const tomorrowKey = dateKey(addDays(today, 1));
    const events = (db.events || []).filter(e => e.category !== 'project' && !['cancelado', 'cancelled'].includes(String(e.status || '').toLowerCase()));
    const eventsOn = (key) => events.filter(e => e.date === key || (e.instances || []).some(i => i.date === key));
    const todayEvents = eventsOn(todayKey);
    const tomorrowEvents = eventsOn(tomorrowKey);
    const pending = (db.tasks || []).filter(t => !isDone(t));

    const messages = [];
    for (const user of TEAM_MEMBERS) {
        const mine = pending.filter(t => ownerOf(t) === user);
        const due = (t) => t.due || t.dueDate || '';
        const overdue = mine.filter(t => due(t) && due(t) < todayKey);
        const dueToday = mine.filter(t => due(t) === todayKey);
        if (mine.length === 0 && todayEvents.length === 0 && tomorrowEvents.length === 0) continue;
        const lines = [];
        if (overdue.length) lines.push(`⚠️ ${overdue.length} vencida${overdue.length > 1 ? 's' : ''}: ${overdue.slice(0, 2).map(t => t.text).join(', ')}`);
        if (dueToday.length) lines.push(`📌 Para hoy: ${dueToday.slice(0, 3).map(t => t.text).join(', ')}`);
        if (!overdue.length && !dueToday.length && mine.length) lines.push(`📋 ${mine.length} pendiente${mine.length > 1 ? 's' : ''}`);
        if (todayEvents.length) lines.push(`🎉 Hoy: ${todayEvents.map(e => e.name).join(', ')}`);
        else if (tomorrowEvents.length) lines.push(`📅 Mañana: ${tomorrowEvents.map(e => e.name).join(', ')}`);
        messages.push({
            user,
            title: `Buenos días, ${user}`,
            body: lines.join('\n'),
            url: overdue.length || dueToday.length ? '/workspace' : '/',
            tag: `brief-${todayKey}`,
        });
    }
    return messages;
}

/** Recordatorio de la tarde: eventos de mañana (para todo el equipo). */
export function buildEveningReminders(db, today) {
    const tomorrowKey = dateKey(addDays(today, 1));
    const events = (db.events || []).filter(e => e.category !== 'project' && !['cancelado', 'cancelled'].includes(String(e.status || '').toLowerCase()))
        .filter(e => e.date === tomorrowKey || (e.instances || []).some(i => i.date === tomorrowKey));
    if (events.length === 0) return [];
    return TEAM_MEMBERS.map(user => ({
        user,
        title: `Mañana: ${events.length === 1 ? events[0].name : `${events.length} eventos`}`,
        body: events.map(e => `${e.icon || '🎉'} ${e.name}${e.time ? ` · ${e.time}` : ''}${e.location ? ` · ${e.location}` : ''}`).join('\n'),
        url: events.length === 1 ? `/eventos/${events[0].id}` : '/calendar',
        tag: `evening-${tomorrowKey}`,
    }));
}

/**
 * Envía mensajes a las suscripciones de cada usuario. Borra las suscripciones caducadas (404/410).
 * @returns {{ sent: number, removed: number }}
 */
export async function sendToUsers(db, messages, { publicKey, privateKey, subject = 'mailto:admin@arriveservices.com' }) {
    const subs = Array.isArray(db.pushSubscriptions) ? db.pushSubscriptions : [];
    if (!subs.length || !messages.length) return { sent: 0, removed: 0 };
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const dead = new Set();
    let sent = 0;
    await Promise.all(messages.flatMap(msg => subs
        .filter(s => !msg.user || s.user === msg.user)
        .map(async s => {
            try {
                await webpush.sendNotification(s.subscription, JSON.stringify({ title: msg.title, body: msg.body, url: msg.url || '/', tag: msg.tag }), { TTL: 6 * 3600 });
                sent++;
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) dead.add(s.subscription.endpoint);
                else console.warn('[Push] Error enviando a', s.user, err.statusCode || err.message);
            }
        })));
    if (dead.size) db.pushSubscriptions = subs.filter(s => !dead.has(s.subscription.endpoint));
    return { sent, removed: dead.size };
}
