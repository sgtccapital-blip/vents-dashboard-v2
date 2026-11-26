// Fechas operativas del Command Center: siempre America/Panama (UTC-5, sin horario de verano).
export const TIMEZONE = 'America/Panama';

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });

/** AAAA-MM-DD en Panamá. */
export const panamaDate = (d = new Date()) => dateFmt.format(new Date(d));

/** { date, time, iso, timezone } del instante actual (o de `d`) en Panamá. */
export function panamaNow(d = new Date()) {
    const at = new Date(d);
    return { date: panamaDate(at), time: timeFmt.format(at), iso: at.toISOString(), timezone: TIMEZONE };
}

export const isIsoDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());
