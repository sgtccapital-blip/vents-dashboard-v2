/**
 * Reglas de estado compartidas por el frontend (Topbar, Mission Control, Kanban, War Room…)
 * y por el servidor (validación en la API). Cualquier contador de "hecho", "pendiente"
 * o "evento activo" debe salir de aquí.
 */

// ─── Tareas ───────────────────────────────────────────────────

export const TASK_STATUSES = ['pending', 'in-progress', 'blocked', 'done'];

const TASK_STATUS_ALIASES = {
    pending: 'pending',
    pendiente: 'pending',
    todo: 'pending',
    backlog: 'pending',
    'in-progress': 'in-progress',
    in_progress: 'in-progress',
    working: 'in-progress',
    active: 'in-progress',
    'en proceso': 'in-progress',
    blocked: 'blocked',
    blocked_auth: 'blocked',
    bloqueada: 'blocked',
    done: 'done',
    completed: 'done',
    completada: 'done',
    hecha: 'done',
};

/** Devuelve el estado canónico, o null si el valor no es un estado de tarea conocido. */
export function normalizeTaskStatus(status) {
    if (status === undefined || status === null || status === '') return null;
    return TASK_STATUS_ALIASES[String(status).trim().toLowerCase()] || null;
}

/** Estado efectivo de una tarea: `status` manda; si falta, se deduce de `done`. */
export function taskStatus(task) {
    return normalizeTaskStatus(task?.status) || (task?.done ? 'done' : 'pending');
}

export const isDone = (task) => taskStatus(task) === 'done';
export const isPending = (task) => !isDone(task);

/** Resumen único para todos los contadores de tareas. */
export function taskStats(tasks = []) {
    const list = Array.isArray(tasks) ? tasks : [];
    const done = list.filter(isDone).length;
    const total = list.length;
    return {
        total,
        done,
        pending: total - done,
        inProgress: list.filter(t => taskStatus(t) === 'in-progress').length,
        blocked: list.filter(t => taskStatus(t) === 'blocked').length,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
}

// ─── Eventos ──────────────────────────────────────────────────

export const EVENT_STATUSES = ['borrador', 'planificacion', 'activo', 'pausado', 'completado', 'cancelado'];

export const EVENT_STATUS_LABELS = {
    borrador: 'Borrador',
    planificacion: 'En Planificación',
    activo: 'Activo',
    pausado: 'Pausado',
    completado: 'Completado',
    cancelado: 'Cancelado',
};

const EVENT_STATUS_ALIASES = {
    borrador: 'borrador',
    draft: 'borrador',
    planificacion: 'planificacion',
    planeacion: 'planificacion',
    'planeación': 'planificacion',
    planning: 'planificacion',
    upcoming: 'planificacion',
    activo: 'activo',
    active: 'activo',
    ejecucion: 'activo',
    'en curso': 'activo',
    pausado: 'pausado',
    paused: 'pausado',
    completado: 'completado',
    completed: 'completado',
    finalizado: 'completado',
    done: 'completado',
    cancelado: 'cancelado',
    cancelled: 'cancelado',
    canceled: 'cancelado',
};

export function normalizeEventStatus(status) {
    if (status === undefined || status === null || status === '') return null;
    return EVENT_STATUS_ALIASES[String(status).trim().toLowerCase()] || null;
}

export function eventStatus(event) {
    return normalizeEventStatus(event?.status) || 'borrador';
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Fecha del evento como Date, o null si no tiene una fecha válida (YYYY-MM-DD o ISO). */
export function eventDate(event) {
    if (!event?.date) return null;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(event.date) ? `${event.date}T00:00:00` : event.date);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** El evento ya pasó: tiene fecha y es anterior a hoy. */
export function isPastEvent(event) {
    const d = eventDate(event);
    return !!d && d < startOfToday();
}

/** Evento vivo: no está terminado, cancelado ni en borrador, y su fecha (si la tiene) no ha pasado. */
export function isActiveEvent(event) {
    const s = eventStatus(event);
    if (s === 'completado' || s === 'cancelado' || s === 'borrador') return false;
    return !isPastEvent(event);
}

/** Evento que dice estar en marcha pero cuya fecha ya pasó: hay que cerrarlo o reprogramarlo. */
export function isStaleEvent(event) {
    const s = eventStatus(event);
    return (s === 'activo' || s === 'planificacion' || s === 'pausado') && isPastEvent(event);
}

export function eventStats(events = []) {
    const list = Array.isArray(events) ? events : [];
    return {
        total: list.length,
        active: list.filter(isActiveEvent).length,
        stale: list.filter(isStaleEvent).length,
    };
}
