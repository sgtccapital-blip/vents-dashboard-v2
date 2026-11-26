// Jev (TypeSafe, vía OpenRouter): modelo de decisiones, no de texto. Responde sí/no, elige opciones
// o da puntajes con probabilidades, en milisegundos y cobrando solo la entrada.
// Aquí lo usamos como filtro barato: decide si una conversación merece un resumen con un LLM
// o si es una consulta suelta que basta con dejar archivada. Así el LLM se gasta solo en lo que importa.
const ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
const MAX_STATE_CHARS = 24000; // por debajo de ~32 KB: más allá Jev pasa a un modo más lento y menos preciso

export const jevModel = () => process.env.JEV_MODEL || 'typesafe/jev-1.13';
export const jevAvailable = () => !!process.env.OPENROUTER_API_KEY && process.env.JEV_TRIAGE !== 'off';

export async function decide({ state, questions }) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        body: JSON.stringify({ model: jevModel(), state, questions }),
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
}

/**
 * ¿Vale la pena resumir esta conversación? → { worth (0-1), relevance, confidence, cost }
 * Si Jev se niega o falla, devuelve null y la conversación sigue el camino normal.
 */
export async function triageConversation({ title, transcript }) {
    const state = `Conversación de ChatGPT del dueño de una agencia de eventos y nightlife (ARRIVE).\nTítulo: ${title}\n\n${String(transcript).slice(0, MAX_STATE_CHARS)}`;
    const out = await decide({
        state,
        questions: {
            worth: {
                type: 'noul',
                instructions: '¿Esta conversación tiene algo que valga la pena recordar a futuro sobre el trabajo o la vida del usuario?',
                criteria: {
                    true: 'Hay decisiones, definiciones de un proyecto o negocio, ideas a retomar, datos concretos (precios, nombres, fechas, herramientas), aprendizajes o forma de pensar del usuario.',
                    false: 'Es una consulta suelta sin contexto propio: traducción, corrección de un texto, dato de cultura general, curiosidad, prueba o charla.',
                },
            },
            relevance: {
                type: 'score',
                instructions: '¿Qué tan importante es para los proyectos y el negocio del usuario?',
                criteria: ['baja: consulta suelta o curiosidad', 'media: trabajo útil o ideas a retomar', 'alta: decisiones o definiciones de un proyecto o del negocio'],
            },
        },
    });
    const w = out.answers?.worth;
    const r = out.answers?.relevance;
    if (!w || w.type === 'refusal') return null;
    const level = r && r.type !== 'refusal' ? Math.round(r.score) : null;
    return {
        worth: Number(w.noul),
        confidence: Number(w.confidence ?? 0),
        relevance: level === null ? null : ['baja', 'media', 'alta'][Math.max(0, Math.min(2, level))],
        cost: out.usage?.cost ?? null,
        model: out.model,
    };
}
