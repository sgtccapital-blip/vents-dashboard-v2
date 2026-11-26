// Avisos al teléfono con ntfy (https://ntfy.sh): la oficina publica en un canal y la app de ntfy
// del CEO, suscrita a ese canal, muestra la notificación. Sin cuentas: el nombre del canal es la
// clave, así que debe ser difícil de adivinar. Para un canal protegido o un servidor propio:
// NTFY_SERVER y NTFY_TOKEN en .env (el token nunca se guarda en db.json).
import crypto from 'node:crypto';

export const NOTIFY_EVENTS = {
    delivered: { label: 'Entregas por revisar', tags: ['inbox_tray'], priority: 3 },
    question: { label: 'Un agente te pregunta algo', tags: ['question'], priority: 4 },
    failed: { label: 'Tareas que fallan', tags: ['warning'], priority: 3 },
    budget: { label: 'Presupuesto al 80 % y al tope', tags: ['money_with_wings'], priority: 4 },
    mission: { label: 'Misión completa', tags: ['checkered_flag'], priority: 3 },
    schedule: { label: 'Tarea recurrente creada', tags: ['repeat'], priority: 2 },
};
const DEFAULT_EVENTS = { delivered: true, question: true, failed: true, budget: true, mission: true, schedule: false };
const TOPIC_RE = /^[A-Za-z0-9_-]{6,64}$/;
const DEDUPE_MS = 60 * 1000;

export const randomTopic = () => `arrive-office-${crypto.randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toLowerCase()}`;

/** Ajustes guardados + .env. `env` permite probar sin tocar process.env. */
export function notifySettings(db, env = process.env) {
    const saved = db.officeSettings?.notify || {};
    const topic = saved.topic || env.NTFY_TOPIC || '';
    return {
        enabled: saved.enabled !== undefined ? Boolean(saved.enabled) : Boolean(topic),
        topic,
        server: (saved.server || env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, ''),
        events: { ...DEFAULT_EVENTS, ...(saved.events || {}) },
        hasToken: Boolean(env.NTFY_TOKEN),
    };
}

/** Valida lo que manda el panel y devuelve lo que se guarda en db.officeSettings.notify. */
export function normalizeNotifyInput(input = {}, current = {}) {
    const bad = msg => Object.assign(new Error(msg), { status: 400 });
    const out = { ...current };
    if (input.topic !== undefined) {
        const t = String(input.topic || '').trim();
        if (t && !TOPIC_RE.test(t)) throw bad('El canal debe tener de 6 a 64 caracteres: letras, números, guion o guion bajo');
        out.topic = t;
    }
    if (input.server !== undefined) {
        const s = String(input.server || '').trim();
        if (s && !/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(s)) throw bad('El servidor debe ser una URL http(s)');
        out.server = s;
    }
    if (input.enabled !== undefined) out.enabled = Boolean(input.enabled);
    if (input.events && typeof input.events === 'object') {
        out.events = { ...(current.events || {}) };
        for (const k of Object.keys(NOTIFY_EVENTS)) if (typeof input.events[k] === 'boolean') out.events[k] = input.events[k];
    }
    return out;
}

/**
 * @param {{ readDB: Function, fetchImpl?: Function, publicUrl?: () => string, env?: object, log?: Function }} deps
 */
export function createNotifier({ readDB, fetchImpl = globalThis.fetch, publicUrl = () => process.env.PUBLIC_URL || process.env.DASHBOARD_URL || '', env = process.env, log = () => {} }) {
    const recent = new Map();

    async function publish(settings, { title, message, priority = 3, tags = [], taskId = null }) {
        const base = publicUrl().replace(/\/+$/, '');
        const click = base ? `${base}/office${taskId ? `?task=${encodeURIComponent(taskId)}` : ''}` : undefined;
        const body = {
            topic: settings.topic,
            title: String(title).slice(0, 120),
            message: String(message || title).slice(0, 900),
            priority, tags,
            ...(click ? { click, actions: [{ action: 'view', label: taskId ? 'Abrir tarea' : 'Abrir oficina', url: click, clear: true }] } : {}),
        };
        const headers = { 'Content-Type': 'application/json' };
        if (env.NTFY_TOKEN) headers.Authorization = `Bearer ${env.NTFY_TOKEN}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
            const r = await fetchImpl(`${settings.server}/`, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
            if (!r.ok) throw new Error(`ntfy respondió ${r.status}${r.statusText ? ` ${r.statusText}` : ''}`);
            return { ok: true };
        } finally {
            clearTimeout(timer);
        }
    }

    /** Aviso de la oficina. Nunca lanza: si ntfy falla, la oficina sigue igual. */
    function send(kind, payload) {
        let settings;
        try { settings = notifySettings(readDB(), env); } catch { return Promise.resolve({ ok: false, skipped: 'sin ajustes' }); }
        if (!settings.enabled || !settings.topic || !settings.events[kind]) return Promise.resolve({ ok: false, skipped: 'desactivado' });
        const key = `${kind}:${payload.taskId || payload.title}`;
        const now = Date.now();
        for (const [k, at] of recent) if (now - at > DEDUPE_MS) recent.delete(k);
        if (recent.has(key)) return Promise.resolve({ ok: false, skipped: 'repetido' });
        recent.set(key, now);
        const meta = NOTIFY_EVENTS[kind] || {};
        return publish(settings, { priority: meta.priority, tags: meta.tags, ...payload })
            .catch(err => { log(`Aviso ntfy no enviado (${kind}): ${err.message}`); return { ok: false, error: err.message }; });
    }

    /** Botón «Enviar prueba» del panel: aquí sí devolvemos el error para mostrarlo. */
    async function test() {
        const settings = notifySettings(readDB(), env);
        if (!settings.topic) throw Object.assign(new Error('Primero elige un canal'), { status: 400 });
        try {
            await publish(settings, { title: '✅ AI Office conectada', message: 'Así te llegarán las entregas, preguntas y alertas de tus agentes.', priority: 3, tags: ['white_check_mark'] });
        } catch (err) {
            throw Object.assign(new Error(`No se pudo enviar: ${err.message}`), { status: 502 });
        }
        return { ok: true, topic: settings.topic, server: settings.server };
    }

    return { send, test };
}
