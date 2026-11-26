// Referencias y tutoriales: de un video viral o un tutorial a una receta que la máquina puede recrear
// con el material y la línea de cada cuenta. Se recrea el formato y la técnica, nunca el contenido ajeno.
import { z } from 'zod';

export const REFERENCE_TYPES = { viral: 'Video viral / referencia', tutorial: 'Tutorial (técnica)' };

export const ReferenceAnalysisSchema = z.object({
    title: z.string().describe('Nombre corto y descriptivo de la referencia'),
    summary: z.string().describe('Qué pasa en el video, en 2-3 frases'),
    hook: z.object({
        seconds: z.number().describe('Cuántos segundos dura el gancho'),
        description: z.string(),
        whyItWorks: z.string(),
    }),
    structure: z.array(z.object({ t: z.string().describe('Rango de tiempo, ej. 0-1.5s'), beat: z.string(), description: z.string() })),
    editing: z.object({
        pace: z.string().describe('Ritmo: cortes por segundo, duración media de plano, cómo cambia'),
        transitions: z.array(z.string()),
        effects: z.array(z.string()),
        cameraMoves: z.array(z.string()),
        textStyle: z.string().describe('Texto en pantalla: tipografía, tamaño, posición, animación'),
        captions: z.string().describe('Subtítulos: estilo y ritmo, o "sin subtítulos"'),
        color: z.string(),
        audio: z.string().describe('Música, SFX, voz, cómo se sincroniza con los cortes'),
    }),
    retentionTactics: z.array(z.string()),
    whyItWorks: z.string(),
    technique: z.object({
        name: z.string().describe('Técnica principal (ej. transición de máscara, speed ramp, texto cinético)'),
        category: z.enum(['transición', 'texto', 'color', 'efecto', 'montaje', 'motion graphics', 'cámara', 'audio', 'formato']),
        originalTool: z.string().describe('Herramienta usada en la referencia (CapCut, After Effects, Premiere, celular…) o "desconocida"'),
        steps: z.array(z.string()).describe('Pasos para lograrla'),
        parameters: z.array(z.string()).describe('Valores concretos: duraciones, curvas, opacidades, tamaños'),
    }),
    recreate: z.object({
        difficulty: z.enum(['fácil', 'media', 'difícil']),
        ourTools: z.array(z.object({
            tool: z.enum(['Remotion', 'ffmpeg', 'Veo / Flow', 'Nano Banana', 'Higgsfield', 'Grabación']),
            how: z.string(),
        })).describe('Cómo se hace con las herramientas de la máquina'),
        shotList: z.array(z.string()).describe('Tomas que hay que grabar o generar'),
        assetsNeeded: z.array(z.string()),
        needsNewBuild: z.boolean().describe('true si la máquina todavía no tiene un componente para esta técnica y hay que programarlo'),
        buildNotes: z.string().describe('Qué habría que programar en Remotion/ffmpeg para tenerla como plantilla reutilizable'),
    }),
    adaptations: z.array(z.object({
        accountHandler: z.string(),
        idea: z.string(),
        hook: z.string(),
        why: z.string(),
    })).describe('Cómo la usaría cada cuenta que encaje, con su propia línea'),
    // Campos de tutorial (opcionales para que las referencias viejas sigan validando).
    tools: z.array(z.string()).default([]).describe('Programas, plugins, efectos, apps o equipos que se usan o se mencionan'),
    timeline: z.array(z.object({ t: z.string().describe('mm:ss'), what: z.string() })).default([])
        .describe('Tutorial: paso a paso con su minuto. Viral: momentos clave. Vacío si no aplica'),
    transcriptSummary: z.string().default('').describe('Lo que se dice, condensado y fiel (no inventes); vacío si no hay voz'),
});

export const AdaptationSchema = z.object({
    title: z.string(),
    format: z.string(),
    pillar: z.string(),
    concept: z.string(),
    hook: z.string(),
    overlayText: z.string(),
    durationSec: z.number(),
    caption: z.string(),
    cta: z.string(),
    shotList: z.array(z.string()),
    why: z.string(),
});

export const REFERENCE_SYSTEM = `Eres editor jefe y director creativo de ARRIVE Agency (Panamá). Analizas videos virales y tutoriales de edición para que el equipo recree el FORMATO y la TÉCNICA con su propio material y la línea gráfica de cada cuenta.
Reglas:
- Describe lo que ves en los frames y lo que dicen las métricas (cortes, duración). No inventes: si algo no se puede saber, dilo.
- Sé concreto y técnico: tiempos en segundos, tipos de transición, curvas de velocidad, tamaños y posiciones de texto.
- Nunca propongas copiar el contenido, la música con derechos ni la imagen de otra persona o marca: se recrea la estructura con material propio.
- Si ves el video completo, usa lo que ves y oyes; en un tutorial sigue el paso a paso con su minuto (mm:ss) y anota herramientas, efectos, atajos y valores exactos.
- Escribe en español aunque el video esté en otro idioma (los nombres de herramientas y efectos van como en el programa).
- La máquina del equipo tiene: Remotion (motion graphics, textos, montaje), ffmpeg (cortes, velocidad, color, audio), Whisper (subtítulos), Veo 3.1 / Google Flow y Nano Banana (generar video e imagen), Higgsfield (video e imagen con IA) y grabación propia en eventos.`;

export function referencePrompt({ ref, stats, cuts, transcript, info, accounts, hasImages, hasVideo = false }) {
    return `# Referencia (${REFERENCE_TYPES[ref.type] || ref.type})
${ref.url ? `Link: ${ref.url}` : 'Archivo subido'}
${info?.title ? `Título original: ${info.title}` : ''}
${info?.uploader ? `Autor: ${info.uploader}` : ''}
${info?.description ? `Descripción: ${String(info.description).slice(0, 800)}` : ''}
${ref.notes ? `\nNotas del equipo: ${ref.notes}` : ''}

## Métricas medidas
Duración: ${stats.duration.toFixed(1)} s · Formato: ${stats.width}×${stats.height} · Audio: ${stats.hasAudio ? 'sí' : 'no'}
Cortes detectados: ${cuts.length} · Planos: ${cuts.length + 1} · Duración media de plano: ${(stats.duration / (cuts.length + 1)).toFixed(2)} s
Tiempos de corte (s): ${cuts.map(c => c.toFixed(2)).join(', ') || 'ninguno'}

## Transcripción
${transcript || '(sin voz o sin transcripción)'}
${hasVideo ? '\nTe adjunto el video completo (imagen y audio): míralo entero.' : hasImages ? '\nTe adjunto un frame por plano, en orden cronológico.' : ''}

## Cuentas del equipo (para las adaptaciones)
${accounts.map(a => `- ${a.handler}: ${a.concept || a.description || a.type}`).join('\n')}

${ref.type === 'tutorial'
        ? 'Es un TUTORIAL: lo importante es la técnica. Extrae los pasos y parámetros exactos y explica cómo implementarla en la máquina (marca needsNewBuild si hay que programar una plantilla nueva).'
        : 'Es un VIDEO VIRAL de referencia: desarma por qué funciona (gancho, estructura, ritmo, texto, audio) y cómo recrear el formato con material propio.'}
Incluye adaptaciones solo para las cuentas donde encaje de verdad.`;
}

const list = arr => (arr || []).map(x => `- ${x}`).join('\n');

export function playbookMarkdown(ref, a, stats) {
    return `# ${a.title}

> ${REFERENCE_TYPES[ref.type] || ref.type}${ref.url ? ` · ${ref.url}` : ''} · ${stats ? `${stats.duration.toFixed(1)} s · ${stats.cuts} cortes (${stats.avgShot.toFixed(2)} s por plano)` : ''}

${a.summary}

## Gancho (0–${a.hook.seconds}s)
${a.hook.description}

**Por qué funciona:** ${a.hook.whyItWorks}

## Estructura
| Tiempo | Momento | Qué pasa |
|---|---|---|
${a.structure.map(s => `| ${s.t} | ${s.beat} | ${s.description.replace(/\|/g, '/')} |`).join('\n')}

## Edición
- **Ritmo:** ${a.editing.pace}
- **Transiciones:** ${a.editing.transitions.join(', ') || '—'}
- **Efectos:** ${a.editing.effects.join(', ') || '—'}
- **Cámara:** ${a.editing.cameraMoves.join(', ') || '—'}
- **Texto en pantalla:** ${a.editing.textStyle}
- **Subtítulos:** ${a.editing.captions}
- **Color:** ${a.editing.color}
- **Audio:** ${a.editing.audio}

## Retención
${list(a.retentionTactics)}

**Por qué funciona:** ${a.whyItWorks}

## Técnica: ${a.technique.name} (${a.technique.category})
Herramienta original: ${a.technique.originalTool}

${a.technique.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Parámetros:**
${list(a.technique.parameters)}

## Cómo recrearla en la máquina (${a.recreate.difficulty})
${a.recreate.ourTools.map(t => `- **${t.tool}:** ${t.how}`).join('\n')}

**Tomas:**
${list(a.recreate.shotList)}

**Material necesario:**
${list(a.recreate.assetsNeeded)}
${a.recreate.needsNewBuild ? `\n> **Plantilla por construir:** ${a.recreate.buildNotes}\n` : ''}
${a.tools?.length ? `## Herramientas\n${a.tools.join(' · ')}\n\n` : ''}${a.timeline?.length ? `## ${ref.type === 'tutorial' ? 'Paso a paso' : 'Momentos clave'}\n${a.timeline.map(x => `- **${x.t}** ${x.what}`).join('\n')}\n\n` : ''}## Adaptaciones
${a.adaptations.map(x => `- **${x.accountHandler}:** ${x.idea} — gancho: "${x.hook}". ${x.why}`).join('\n') || '- Ninguna cuenta encaja directamente.'}
${a.transcriptSummary ? `\n## Lo que se dice\n${a.transcriptSummary}\n` : ''}`;
}
