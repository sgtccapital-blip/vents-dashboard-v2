// ADN de cada cuenta de redes: la fuente de verdad de qué contenido sube esa cuenta y cómo se ve.
// Lo usan el editor del dashboard y el servidor, que lo exporta a content-dna/<cuenta>/DNA.md
// para que Claude Code y otros agentes lo lean antes de diseñar, editar o escribir guiones.

export const LIST_FIELDS = ['pillars', 'formats', 'hooks', 'ctas', 'dos', 'donts'];

export function emptyDna() {
    return {
        concept: '',
        mission: '',
        audience: '',
        voice: '',
        language: '',
        pillars: [],
        formats: [],
        hooks: [],
        ctas: [],
        visual: {
            palette: [],
            typography: '',
            logoUrl: '',
            style: '',
            editing: '',
            subtitles: '',
            music: '',
        },
        references: [],
        dos: [],
        donts: [],
        hashtags: '',
        cadence: '',
        notes: '',
        updatedAt: null,
    };
}

// Completa un ADN parcial (o inexistente) con la estructura vacía, sin perder lo guardado.
export function normalizeDna(dna) {
    const base = emptyDna();
    if (!dna || typeof dna !== 'object') return base;
    const out = { ...base, ...dna, visual: { ...base.visual, ...(dna.visual || {}) } };
    for (const key of LIST_FIELDS) out[key] = Array.isArray(out[key]) ? out[key] : [];
    out.visual.palette = Array.isArray(out.visual.palette) ? out.visual.palette : [];
    out.references = (Array.isArray(out.references) ? out.references : [])
        .filter(r => r && r.url)
        .map(r => ({ url: r.url, note: r.note || '' }));
    return out;
}

// Campos que cuentan para el % de completitud: lo mínimo para que un agente genere contenido coherente.
const COMPLETENESS_CHECKS = [
    d => d.concept,
    d => d.mission,
    d => d.audience,
    d => d.voice,
    d => d.pillars.length,
    d => d.formats.length,
    d => d.hooks.length,
    d => d.visual.palette.length,
    d => d.visual.typography,
    d => d.visual.style || d.visual.editing,
    d => d.references.length,
    d => d.dos.length || d.donts.length,
];

export function dnaCompleteness(dna) {
    const d = normalizeDna(dna);
    const filled = COMPLETENESS_CHECKS.filter(check => {
        const v = check(d);
        return typeof v === 'string' ? v.trim() !== '' : Boolean(v);
    }).length;
    return Math.round((filled / COMPLETENESS_CHECKS.length) * 100);
}

// "@Elemento.techno" -> "elemento-techno"
export function accountSlug(account) {
    const raw = account?.handler || account?.id || 'cuenta';
    return raw.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cuenta';
}

// ─── Conversión texto <-> listas para el editor (una entrada por línea) ───

export function linesToList(text) {
    return String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
}

export function listToLines(list) {
    return (list || []).join('\n');
}

// "https://... — nota" (o separado por espacio) -> { url, note }
export function linesToReferences(text) {
    return linesToList(text).map(line => {
        const match = line.match(/^(\S+)\s*(?:[—–|-]\s*)?(.*)$/);
        return { url: match[1], note: match[2].trim() };
    });
}

export function referencesToLines(refs) {
    return (refs || []).map(r => (r.note ? `${r.url} — ${r.note}` : r.url)).join('\n');
}

// Acepta "#000, #d4af37 #fff" y devuelve solo hex válidos en mayúscula.
export function parsePalette(text) {
    return (String(text || '').match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || []).map(c => c.toUpperCase());
}

// ─── Exportación a Markdown (lo que leen los LLMs) ───

const bullets = list => list.map(item => `- ${item}`).join('\n');

function section(title, body) {
    return body && String(body).trim() ? `## ${title}\n\n${String(body).trim()}\n` : '';
}

export function dnaToMarkdown(account) {
    const d = normalizeDna(account?.dna);
    const v = d.visual;

    const visualLines = [
        v.palette.length && `- **Paleta:** ${v.palette.map(c => `\`${c}\``).join(' ')}`,
        v.typography && `- **Tipografía:** ${v.typography}`,
        v.logoUrl && `- **Logo:** ${v.logoUrl}`,
        v.style && `- **Estilo visual / diseño:** ${v.style}`,
        v.editing && `- **Edición y ritmo:** ${v.editing}`,
        v.subtitles && `- **Subtítulos / texto en pantalla:** ${v.subtitles}`,
        v.music && `- **Música y sonido:** ${v.music}`,
    ].filter(Boolean).join('\n');

    const identityLines = [
        d.concept && `- **Concepto:** ${d.concept}`,
        d.mission && `- **Objetivo del contenido:** ${d.mission}`,
        d.audience && `- **Audiencia:** ${d.audience}`,
        d.voice && `- **Tono de voz:** ${d.voice}`,
        d.language && `- **Idioma / jerga:** ${d.language}`,
        d.cadence && `- **Frecuencia de publicación:** ${d.cadence}`,
    ].filter(Boolean).join('\n');

    const header = [
        `# ADN de contenido — ${account?.handler || 'Cuenta'}`,
        '',
        `> ${account?.platform || 'Instagram'} · ${account?.type || ''}${account?.followers ? ` · ${account.followers} seguidores` : ''}`,
        account?.url ? `> ${account.url}` : null,
        account?.description ? `>\n> ${account.description}` : null,
        '',
        'Todo contenido para esta cuenta (diseño, motion, edición, guiones, captions, prompts de imagen/video)',
        'debe respetar este documento. Si algo no está definido aquí, pregunta antes de inventarlo.',
        '',
    ].filter(l => l !== null).join('\n');

    const references = d.references.map(r => `- ${r.url}${r.note ? ` — ${r.note}` : ''}`).join('\n');

    return [
        header,
        section('Identidad', identityLines),
        section('Pilares de contenido', bullets(d.pillars)),
        section('Formatos que sube', bullets(d.formats)),
        section('Identidad visual', visualLines),
        section('Fórmulas de hooks que funcionan', bullets(d.hooks)),
        section('CTAs', bullets(d.ctas)),
        section('Siempre', bullets(d.dos)),
        section('Nunca', bullets(d.donts)),
        section('Referencias', references),
        section('Hashtags base', d.hashtags),
        section('Notas', d.notes),
        d.updatedAt ? `---\n_Actualizado: ${d.updatedAt.slice(0, 10)}_\n` : '',
    ].filter(Boolean).join('\n');
}
