// Lógica de "Mi semana": en qué bloque cae cada tarea y cuánta carga tiene cada persona.
// Sin React para poder probarla con node --test.
import { isDone } from './status.js';

const ISO_DAY = /^(\d{4}-\d{2}-\d{2})/;

/** Fecha local de hoy como YYYY-MM-DD (no UTC: a las 9 pm en Panamá ya sería mañana). */
export function localDay(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    return localDay(new Date(y, m - 1, d + n));
}

/** Fecha límite de la tarea como YYYY-MM-DD, o null si no tiene una fecha válida. */
export function taskDueDay(task) {
    const raw = String(task?.due || task?.dueDate || '');
    return raw.match(ISO_DAY)?.[1] || null;
}

/** Nombre de la persona sin el cargo: "Dalia (Asistente Ejecutiva)" → "Dalia". */
export function ownerName(task) {
    const raw = String(task?.assignedTo || task?.assignee || '').trim();
    return raw.split(' (')[0].trim();
}

export const BUCKETS = ['overdue', 'today', 'week', 'later', 'nodate'];

export function taskBucket(task, today = localDay()) {
    const due = taskDueDay(task);
    if (!due) return 'nodate';
    if (due < today) return 'overdue';
    if (due === today) return 'today';
    if (due <= addDays(today, 6)) return 'week';
    return 'later';
}

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const byDueThenPriority = (a, b) =>
    (taskDueDay(a) || '9999').localeCompare(taskDueDay(b) || '9999') ||
    (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);

/**
 * Agrupa las tareas pendientes por bloque y calcula la carga por persona.
 * `owner`: '' = todas, '__none__' = sin asignar, otro valor = esa persona.
 */
export function buildWeekPlan(tasks = [], { today = localDay(), owner = '' } = {}) {
    const pending = tasks.filter(t => !isDone(t));

    const load = new Map();
    for (const t of pending) {
        const name = ownerName(t);
        if (!name) continue;
        const entry = load.get(name) || { name, pending: 0, overdue: 0, today: 0 };
        entry.pending++;
        const bucket = taskBucket(t, today);
        if (bucket === 'overdue') entry.overdue++;
        if (bucket === 'today') entry.today++;
        load.set(name, entry);
    }

    const visible = pending.filter(t =>
        !owner ? true : owner === '__none__' ? !ownerName(t) : ownerName(t) === owner
    );
    const buckets = Object.fromEntries(BUCKETS.map(b => [b, []]));
    for (const t of visible) buckets[taskBucket(t, today)].push(t);
    for (const b of BUCKETS) buckets[b].sort(byDueThenPriority);

    return {
        buckets,
        owners: [...load.values()].sort((a, b) => b.overdue - a.overdue || b.pending - a.pending),
        unassigned: pending.filter(t => !ownerName(t)).length,
        totalPending: pending.length,
    };
}

/** Fechas de eventos (fecha principal e instancias) entre hoy y dentro de 6 días. */
export function eventsThisWeek(events = [], today = localDay()) {
    const end = addDays(today, 6);
    const out = [];
    for (const e of events) {
        const dates = [
            { date: e.date, label: '' },
            ...(e.instances || []).map(i => ({ date: i.date, label: i.name || i.title || '' })),
        ];
        for (const { date, label } of dates) {
            const day = String(date || '').match(ISO_DAY)?.[1];
            if (day && day >= today && day <= end) out.push({ id: e.id, name: e.name, day, label, color: e.color });
        }
    }
    return out.sort((a, b) => a.day.localeCompare(b.day));
}
