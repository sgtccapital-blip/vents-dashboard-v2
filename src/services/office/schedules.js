// Tareas recurrentes de AI Office: cuándo toca la próxima. Hora de Panamá (UTC-5 todo el año,
// sin horario de verano), igual que el resto del Command Center.

const OFFSET_MS = 5 * 60 * 60 * 1000;
export const EVERY = {
    daily: 'Todos los días',
    weekdays: 'De lunes a viernes',
    weekly: 'Cada semana',
    monthly: 'Cada mes',
};
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const pad = n => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Valida y normaliza lo que manda el panel. Lanza un error con status 400 si algo no cuadra. */
export function normalizeCadence(input = {}) {
    const bad = msg => Object.assign(new Error(msg), { status: 400 });
    const every = input.every || 'daily';
    if (!EVERY[every]) throw bad(`Frecuencia no válida: ${every}. Usa ${Object.keys(EVERY).join(', ')}`);
    const time = String(input.time || '09:00');
    const m = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw bad('La hora debe ir como HH:MM (24 h)');
    const out = { every, time: `${pad(m[1])}:${m[2]}` };
    if (every === 'weekly') {
        const days = [...new Set((Array.isArray(input.days) ? input.days : [input.days]).map(Number))].filter(d => d >= 0 && d <= 6).sort();
        if (!days.length) throw bad('Elige al menos un día de la semana');
        out.days = days;
    }
    if (every === 'monthly') {
        const day = Number(input.monthDay);
        if (!(day >= 1 && day <= 31)) throw bad('El día del mes va de 1 a 31');
        out.monthDay = Math.round(day);
    }
    return out;
}

/** La primera vez estrictamente después de `from` en que toca correr. */
export function nextRun(cadence, from = new Date()) {
    const [hh, mm] = cadence.time.split(':').map(Number);
    // "Reloj de Panamá" como si fuera UTC: así las cuentas de días no dependen de la zona del servidor.
    const local = new Date(new Date(from).getTime() - OFFSET_MS);
    const at = (y, mo, d) => new Date(Date.UTC(y, mo, d, hh, mm) + OFFSET_MS);
    const y = local.getUTCFullYear(), mo = local.getUTCMonth(), d = local.getUTCDate();
    const after = t => t.getTime() > new Date(from).getTime();

    if (cadence.every === 'monthly') {
        for (let i = 0; i < 3; i++) {
            const yy = y + Math.floor((mo + i) / 12), mi = (mo + i) % 12;
            const t = at(yy, mi, Math.min(cadence.monthDay, daysInMonth(yy, mi)));
            if (after(t)) return t;
        }
    }
    for (let i = 0; i < 8; i++) {
        const t = at(y, mo, d + i);
        const dow = new Date(Date.UTC(y, mo, d + i)).getUTCDay();
        const ok = cadence.every === 'daily'
            || (cadence.every === 'weekdays' && dow >= 1 && dow <= 5)
            || (cadence.every === 'weekly' && cadence.days.includes(dow));
        if (ok && after(t)) return t;
    }
    throw new Error('No se pudo calcular la próxima ejecución');
}

/** "Lunes y jueves a las 09:00" — para el panel y el registro. */
export function describeCadence(c) {
    if (!c) return '';
    if (c.every === 'weekly') {
        const names = c.days.map(d => WEEKDAYS[d]);
        const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0];
        return `Cada ${list} a las ${c.time}`;
    }
    if (c.every === 'monthly') return `El día ${c.monthDay} de cada mes a las ${c.time}`;
    return `${EVERY[c.every]} a las ${c.time}`;
}
