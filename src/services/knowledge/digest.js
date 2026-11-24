// Resumen inteligente de conversaciones: qué se decidió, qué falta, cómo razona el usuario.
// Esto es lo que hace que el RAG "entienda" los proyectos en vez de guardar chats crudos.
import { z } from 'zod';

export const DigestSchema = z.object({
    summary: z.string().describe('2 a 4 frases: de qué trató la conversación y a qué se llegó'),
    project: z.string().describe('Nombre del proyecto al que pertenece. Usa el nombre exacto de la lista de proyectos del dashboard si coincide; si es un proyecto nuevo, ponle un nombre corto; vacío si no es de ningún proyecto'),
    projectId: z.string().describe('id del proyecto del dashboard si coincide con uno de la lista; vacío si no'),
    type: z.enum(['proyecto', 'idea', 'investigacion', 'operacion', 'creativo', 'tecnico', 'aprendizaje', 'personal', 'trivial']),
    relevance: z.enum(['alta', 'media', 'baja']).describe('alta: decisiones o definiciones de un proyecto/negocio; media: trabajo útil o ideas a retomar; baja: consultas sueltas, traducciones, curiosidades'),
    decisions: z.array(z.string()).describe('Decisiones tomadas o definiciones cerradas'),
    ideas: z.array(z.string()).describe('Ideas, propuestas o caminos posibles que quedaron abiertos'),
    pending: z.array(z.string()).describe('Pendientes, próximos pasos o tareas que se mencionaron'),
    reasoning: z.array(z.string()).describe('Cómo piensa y decide el usuario en esta conversación: criterios, prioridades, preferencias, forma de estructurar el problema'),
    facts: z.array(z.string()).describe('Datos concretos útiles a futuro: cifras, precios, nombres, fechas, herramientas, stack, contactos'),
    tags: z.array(z.string()).describe('3 a 8 etiquetas cortas en minúscula'),
});

export const DIGEST_SYSTEM = `Eres el archivista del Command Center de ARRIVE Agency. Lees conversaciones que el usuario tuvo con ChatGPT y extraes lo que importa para que otros agentes de IA entiendan sus proyectos, su contexto y su forma de pensar.
Reglas:
- Escribe en español, en frases cortas y concretas, sin relleno.
- No inventes: si un campo no aplica, déjalo vacío.
- "Yo" es el usuario; "ChatGPT" es el asistente. Lo que el usuario decide o pide pesa más que lo que ChatGPT propone.
- Distingue lo decidido (decisions) de lo solo propuesto (ideas).
- En reasoning describe criterios reutilizables ("prioriza X sobre Y", "valida con números antes de…"), no un resumen.`;

export function digestPrompt({ conv, transcript, projects, siblingTitles = [] }) {
    const projectList = projects.length
        ? projects.map(p => `- ${p.id}: ${p.name}${p.description ? ` — ${String(p.description).slice(0, 120)}` : ''}`).join('\n')
        : '(sin proyectos)';
    return `Proyectos del dashboard:
${projectList}

Conversación: "${conv.title}" (${conv.createTime?.slice(0, 10) || 'sin fecha'} → ${conv.updateTime?.slice(0, 10) || ''})
${conv.chatgptProjectId ? `Está dentro de un Proyecto de ChatGPT junto a estas conversaciones: ${siblingTitles.slice(0, 15).map(t => `"${t}"`).join(', ') || '(ninguna más)'}\n` : ''}
${transcript}`;
}

export const SynthesisSchema = z.object({
    overview: z.string().describe('Qué es el proyecto, para qué existe y en qué estado está, en un párrafo'),
    timeline: z.array(z.string()).describe('Hitos en orden cronológico con fecha aproximada (AAAA-MM)'),
    decisions: z.array(z.string()).describe('Decisiones vigentes más importantes (si una se reemplazó, solo la última)'),
    openQuestions: z.array(z.string()).describe('Temas abiertos, pendientes y próximos pasos'),
    howUserThinks: z.array(z.string()).describe('Lógica del usuario en este proyecto: criterios, prioridades y estilo de trabajo'),
    keyFacts: z.array(z.string()).describe('Datos clave: cifras, stack, nombres, herramientas, socios'),
});

export const SYNTHESIS_SYSTEM = `Consolidas la memoria de un proyecto a partir de resúmenes de conversaciones con ChatGPT, para que cualquier agente de IA pueda retomarlo sin preguntar todo de nuevo. Español, concreto, sin relleno, sin inventar. Si hay contradicciones, gana lo más reciente.`;

export function synthesisPrompt(name, digests) {
    return `Proyecto: ${name}

Resúmenes de conversaciones (de más antigua a más reciente):
${digests.map(d => `### ${d.date} — ${d.title}
${d.summary}
${d.decisions.length ? `Decisiones: ${d.decisions.join(' | ')}` : ''}
${d.pending.length ? `Pendientes: ${d.pending.join(' | ')}` : ''}
${d.reasoning.length ? `Lógica: ${d.reasoning.join(' | ')}` : ''}
${d.facts.length ? `Datos: ${d.facts.join(' | ')}` : ''}`).join('\n\n')}`;
}

export const ProfileSchema = z.object({
    whoIs: z.string().describe('Quién es el usuario profesionalmente y a qué se dedica, en un párrafo'),
    workStyle: z.array(z.string()).describe('Cómo trabaja y desarrolla proyectos: método, etapas, herramientas'),
    decisionCriteria: z.array(z.string()).describe('Criterios que repite al decidir'),
    preferences: z.array(z.string()).describe('Preferencias de formato, tono, estilo y entregables'),
    activeFronts: z.array(z.string()).describe('Frentes o proyectos activos y su prioridad aparente'),
    instructionsForAgents: z.array(z.string()).describe('Reglas prácticas para un agente que trabaje para el usuario'),
});

export const PROFILE_SYSTEM = `Construyes el perfil de trabajo del usuario a partir de cómo razona en sus conversaciones con ChatGPT y de la memoria de sus proyectos. Sirve como contexto fijo para todos sus agentes de IA. Español, concreto, sin halagos ni inventos.`;

export function digestToText(conv, d) {
    const list = (label, arr) => (arr?.length ? `\n${label}:\n${arr.map(x => `- ${x}`).join('\n')}` : '');
    return `Conversación de ChatGPT: ${conv.title} (${conv.updateTime?.slice(0, 10) || ''})
Proyecto: ${d.project || 'sin proyecto'} · Tipo: ${d.type} · Relevancia: ${d.relevance}
${d.summary}${list('Decisiones', d.decisions)}${list('Ideas', d.ideas)}${list('Pendientes', d.pending)}${list('Lógica del usuario', d.reasoning)}${list('Datos', d.facts)}
Etiquetas: ${(d.tags || []).join(', ')}`;
}

export function synthesisToText(name, s) {
    const list = (label, arr) => (arr?.length ? `\n\n${label}:\n${arr.map(x => `- ${x}`).join('\n')}` : '');
    return `MEMORIA DEL PROYECTO: ${name}\n\n${s.overview}${list('Línea de tiempo', s.timeline)}${list('Decisiones vigentes', s.decisions)}${list('Abierto / próximos pasos', s.openQuestions)}${list('Cómo piensa el usuario en este proyecto', s.howUserThinks)}${list('Datos clave', s.keyFacts)}`;
}

export function profileToText(p) {
    const list = (label, arr) => (arr?.length ? `\n\n${label}:\n${arr.map(x => `- ${x}`).join('\n')}` : '');
    return `PERFIL DE TRABAJO DEL USUARIO\n\n${p.whoIs}${list('Cómo trabaja', p.workStyle)}${list('Criterios de decisión', p.decisionCriteria)}${list('Preferencias', p.preferences)}${list('Frentes activos', p.activeFronts)}${list('Reglas para agentes', p.instructionsForAgents)}`;
}
