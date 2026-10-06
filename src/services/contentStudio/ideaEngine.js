// Del material raw a la pieza: ideas → desarrollo (guion de edición) → paquete de producción.
// Todo se construye desde el ADN de la cuenta, su línea gráfica y su línea de contenido.
import { z } from 'zod';

export const IdeaSchema = z.object({
    ideas: z.array(z.object({
        title: z.string().describe('Título interno corto de la pieza'),
        format: z.string().describe('Formato: Reel 9:16, Carrusel, Story, etc. según la mezcla de la cuenta'),
        pillar: z.string().describe('Pilar de contenido del ADN'),
        concept: z.string().describe('Qué es la pieza y por qué funciona para esta cuenta, 1-2 frases'),
        hook: z.string().describe('Gancho de los primeros 1-3 segundos (visual + texto/voz)'),
        overlayText: z.string().describe('Texto en pantalla principal, con el estilo de la cuenta'),
        assetIds: z.array(z.string()).describe('Ids de los assets raw a usar, en orden'),
        durationSec: z.number().describe('Duración objetivo en segundos'),
        caption: z.string(),
        cta: z.string(),
        why: z.string().describe('Por qué esta idea encaja con la línea de la cuenta y el material disponible'),
    })),
});

export const DevelopmentSchema = z.object({
    hookVerbal: z.string(),
    hookVisual: z.string(),
    durationSec: z.number(),
    edl: z.array(z.object({
        order: z.number(),
        assetId: z.string().describe('Id del asset raw, o "grafico" si es un gráfico/tarjeta'),
        inSec: z.number().describe('Segundo de entrada sugerido dentro del clip (0 si es foto o no aplica)'),
        outSec: z.number().describe('Segundo de salida sugerido'),
        purpose: z.string().describe('Para qué sirve el plano: gancho, desarrollo, pico, cierre…'),
        overlay: z.string().describe('Texto en pantalla en este plano, vacío si no lleva'),
        subtitle: z.string().describe('Subtítulo/voz en este plano, vacío si no lleva'),
        transition: z.string().describe('Transición hacia el siguiente plano'),
    })),
    music: z.string(),
    cover: z.object({ title: z.string(), assetId: z.string() }),
    endcard: z.string(),
    stories: z.array(z.object({
        type: z.enum(['announce', 'countdown', 'poll', 'repost', 'link']),
        text: z.string(),
        when: z.string().describe('Cuándo publicarla respecto al post'),
    })),
    caption: z.string(),
    hashtags: z.string(),
    cta: z.string(),
    checklist: z.array(z.string()).describe('Checklist de edición y publicación para el editor'),
});

const SYSTEM = `Eres el director creativo y editor jefe de ARRIVE Agency (Panamá). Diseñas piezas para Instagram/TikTok a partir de material raw real grabado en eventos.
Reglas:
- Respeta al pie de la letra el ADN, la línea gráfica y la línea de contenido de la cuenta: voz, pilares, mezcla, estructura del reel, textos en pantalla, subtítulos, portada y cierre.
- Usa solo los assets que te paso, por su id. No inventes material que no existe. Si falta algo, dilo en la idea o en el checklist.
- Prioriza video orgánico vertical. Los ganchos van en el primer segundo.
- Escribe en el idioma y la jerga de la cuenta. Captions breves con el CTA de la cuenta.`;

const list = arr => (arr || []).filter(Boolean).map(x => `- ${x}`).join('\n');

export function accountContext(account, brand) {
    const dna = account.dna || {};
    const c = brand?.content;
    const v = c?.video;
    return `# Cuenta ${account.handler} (${account.type || ''})
## ADN
Concepto: ${dna.concept || ''}
Objetivo: ${dna.mission || ''}
Audiencia: ${dna.audience || ''}
Voz: ${dna.voice || ''} · Idioma: ${dna.language || ''}
Pilares:\n${list(dna.pillars)}
Hooks que funcionan:\n${list(dna.hooks)}
CTAs:\n${list(dna.ctas)}
Siempre:\n${list(dna.dos)}
Nunca:\n${list(dna.donts)}
Hashtags base: ${dna.hashtags || ''}
${brand ? `
## Línea gráfica (${brand.name})
${brand.tagline} — ${brand.essence}
Paleta: ${brand.colors.map(x => `${x.name} ${x.hex}`).join(', ')}
Tipografías: ${Object.entries(brand.typography).map(([r, f]) => `${r} ${f.family}`).join(', ')}
` : ''}${c ? `
## Línea de contenido
Lo que ya publica: ${c.observed}
Mezcla: ${c.mix.map(m => `${m.type} ${m.pct}%`).join(' · ')}
Duraciones: ${v.lengths}
Gancho: ${v.hook}
Estructura: ${v.structure.map(s => `${s.t} ${s.label}: ${s.desc}`).join(' → ')}
Cámara: ${v.camera} · Color: ${v.grade} · Transiciones: ${v.transitions}
Texto sobre video: ${v.overlay.style}
Subtítulos: ${v.subtitles.style}
Portada: ${v.cover.style}
Cierre: ${v.endcard.style}
Música: ${v.music}
Historias: ${c.stories.principles.join(' · ')}
` : ''}`;
}

export function assetCatalog(assets) {
    return assets.map((a, i) => [
        `[${i + 1}] id=${a.id}`,
        a.kind,
        a.name,
        a.durationSec ? `${a.durationSec}s` : '',
        a.width && a.height ? `${a.width}x${a.height} ${a.orientation}` : '',
        `noche: ${a.nightName}${a.nightDate ? ` (${a.nightDate})` : ''}`,
        a.notes ? `notas: ${a.notes}` : '',
    ].filter(Boolean).join(' · ')).join('\n');
}

export function ideasPrompt({ account, brand, assets, count = 5, direction = '', hasImages = false }) {
    return `${accountContext(account, brand)}
## Material raw disponible (${assets.length} archivos)
${assetCatalog(assets)}
${hasImages ? '\nTe adjunto miniaturas de algunos archivos, en el mismo orden del catálogo hasta donde alcanzan, para que veas qué hay en cada toma.\n' : ''}
${direction ? `## Dirección del equipo\n${direction}\n` : ''}
Propón ${count} ideas de piezas distintas entre sí para ${account.handler}, respetando la mezcla de contenido de la cuenta (mayoría video orgánico). Cada idea debe poder producirse solo con este material.`;
}

export function developPrompt({ account, brand, task, assets, hasImages = false }) {
    return `${accountContext(account, brand)}
## Idea aprobada
Título: ${task.title}
Formato: ${task.format} · Pilar: ${task.pillar}
Concepto: ${task.scriptBody || task.concept || ''}
Gancho propuesto: ${task.hookVerbal || ''} ${task.hookVisual || ''}
Texto en pantalla propuesto: ${task.overlayText || ''}
Caption propuesto: ${task.caption || ''}

## Material raw asignado
${assetCatalog(assets)}
${hasImages ? '\nMiniaturas adjuntas en el mismo orden.\n' : ''}
Desarrolla la pieza lista para editar: guion de edición plano a plano (EDL) usando los ids de los assets, textos en pantalla y subtítulos con el estilo de la cuenta, música, portada, cierre, historias de apoyo, caption final, hashtags y checklist para el editor. La estructura debe seguir la del reel de la cuenta.`;
}

export const SYSTEM_PROMPT = SYSTEM;
