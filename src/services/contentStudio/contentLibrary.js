// Biblioteca general de contenido: líneas (formatos/series repetibles) y hooks, asignables a cada cuenta.
// Las referencias y tutoriales viven en db.references (con su análisis); aquí solo líneas y hooks.

export const LIBRARY_TYPES = ['linea', 'hook'];

const DEFAULT_HOOKS = [
    { category: 'Negativo / Shock', text: 'El peor error que cometen al salir de noche en Panamá...', why: 'Genera miedo a perderse algo (FOMO) o a tomar una mala decisión.', pillar: 'Nightlife & Venues' },
    { category: 'POV & Experiencia', text: 'POV: Fuiste invitada a la mesa imperial de ARRIVE Models en Casco...', why: 'Inmersión instantánea. Ideal para creadoras de contenido y quien quiere pertenecer al grupo VIP.', pillar: 'ARRIVE Models & Talento' },
    { category: 'Curiosidad / Secretos', text: 'Existe una puerta escondida en el Casco que el 99% de la gente ignora...', why: 'Despierta el instinto de exploración y exclusividad. Fomenta guardados.', pillar: 'Speakeasy & Coctelería' },
    { category: 'Gastronomía & Rooftops', text: '5 razones por las que este atardecer arruinará todos los demás rooftops para ti.', why: 'Polarización sutil que obliga a ver las 5 razones para corroborarlo.', pillar: 'Rooftops' },
    { category: 'Shock & Beat Drop', text: 'Cuando la cena tranquila de un viernes termina convirtiéndose en esto...', why: 'Perfecto para Reels con beat drop: de la cena al show de botellas.', pillar: 'Nightlife & Energy' },
    { category: 'Negocios & Autoridad', text: 'Deja de quemar plata en anuncios de Instagram si tu local sigue vacío los jueves.', why: 'Ataca un dolor directo de dueños de negocios y posiciona a ARRIVE como autoridad.', pillar: 'ARRIVE Agency Growth' },
    { category: 'Behind The Scenes', text: 'Lo que nadie te cuenta de cómo se eligen las invitadas a las cenas VIP de Panamá.', why: 'Detrás de escena aspiracional que genera comentarios y DMs.', pillar: 'ARRIVE Models' },
    { category: 'Curiosidad / Secretos', text: 'Pedí el cóctel más caro de la carta y esto fue lo que me trajeron.', why: 'Curiosidad por el lujo y la estética. Destaca mixología de autor.', pillar: 'Gastronomía' },
    { category: 'Behind The Scenes', text: 'Así grabamos 12 Reels en una sola tarde con el equipo de ARRIVE Studio.', why: 'Muestra rigor técnico y velocidad de entrega para clientes.', pillar: 'ARRIVE Studio' },
    { category: 'Listas & Ranking', text: 'Los únicos 3 spots en Casco Antiguo donde la música realmente vale la pena.', why: 'Genera debate en comentarios y shares por WhatsApp.', pillar: 'Nightlife' },
];

const str = v => (typeof v === 'string' ? v.trim() : '');
const num = v => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : null);
const ids = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(x => String(x).trim()).filter(Boolean);
const lines = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(x => String(x).trim()).filter(Boolean);

/** Primera vez: siembra los hooks que antes estaban fijos en el frontend. */
export function ensureLibrary(db) {
    if (Array.isArray(db.libraryItems)) return false;
    const now = new Date().toISOString();
    db.libraryItems = DEFAULT_HOOKS.map((h, i) => ({ id: `hook-${i + 1}`, type: 'hook', accountIds: [], createdAt: now, ...h }));
    return true;
}

/** Limpia el cuerpo de un POST/PATCH según el tipo; solo devuelve los campos presentes. */
export function pickFields(type, body = {}) {
    const has = k => Object.prototype.hasOwnProperty.call(body, k);
    const out = {};
    if (has('accountIds')) out.accountIds = ids(body.accountIds);
    if (has('notes')) out.notes = str(body.notes);
    if (type === 'linea') {
        for (const k of ['name', 'goal', 'format', 'pillar', 'textStyle']) if (has(k)) out[k] = str(body[k]);
        for (const k of ['durationSec', 'perWeek']) if (has(k)) out[k] = num(body[k]);
        if (has('beats')) out.beats = lines(body.beats);
        if (has('referenceIds')) out.referenceIds = ids(body.referenceIds);
    } else {
        for (const k of ['text', 'category', 'why', 'pillar']) if (has(k)) out[k] = str(body[k]);
    }
    return out;
}

export const itemsForAccount = (db, accountId) => (db.libraryItems || []).filter(i => (i.accountIds || []).includes(accountId));

/** Bloque de prompt con las líneas y hooks asignados a la cuenta. */
export function kitContext(items) {
    const ls = items.filter(i => i.type === 'linea');
    const hs = items.filter(i => i.type === 'hook');
    if (!ls.length && !hs.length) return '';
    const lineText = l => `### ${l.name}${l.format ? ` (${l.format})` : ''}
Objetivo: ${l.goal || '—'}${l.durationSec ? ` · Duración: ${l.durationSec}s` : ''}${l.perWeek ? ` · ${l.perWeek} por semana` : ''}
Estructura:\n${(l.beats || []).map((b, i) => `${i + 1}. ${b}`).join('\n') || '—'}
Texto/subtítulos: ${l.textStyle || 'según la línea de la cuenta'}${l.notes ? `\nNotas: ${l.notes}` : ''}`;
    return `\n## Líneas de contenido asignadas (formatos que la cuenta repite; prioriza encajar las ideas en ellas)
${ls.map(lineText).join('\n\n') || '—'}
${hs.length ? `\n## Hooks de la biblioteca asignados (adáptalos, no los copies literal)\n${hs.map(h => `- ${h.text}`).join('\n')}\n` : ''}`;
}

export function lineIdeaPrompt(line) {
    return `## Línea a ejecutar\n${kitContext([line]).trim()}\n\nDiseña UNA pieza nueva para la cuenta que siga exactamente esta línea (estructura, duración y estilo de texto), con material propio y la línea gráfica de la cuenta.`;
}
