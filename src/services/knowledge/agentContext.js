// Qué memoria se le da a un agente para una tarea.
// Calibrado el 26-nov-2026 sobre el índice real (7.7k trozos, e5-small): la similitud de e5 apenas
// separa (ruido 0.80–0.85, relevante 0.85–0.88), pero la cobertura de la consulta sí: en temas que
// no existen en la memoria (recetas, Pitágoras) ningún trozo pasa de 0.25; los relevantes, ≥ 0.36.
// Eso vale si la consulta es corta: con toda la descripción la cobertura se diluye y entran
// resultados genéricos, así que se busca por el título y solo se suma un poco de descripción
// cuando el título dice poco.
import { terms } from './text.js';

export const MIN_COVERAGE = () => Number(process.env.KNOWLEDGE_MIN_COVERAGE ?? 0.34);

/** Consulta para la memoria: el título; si tiene menos de 3 palabras útiles, el inicio de la descripción. */
export function agentKnowledgeQuery(task = '', description = '') {
    const title = String(task || '').trim();
    // Las entregas de pasos anteriores (misiones) y el contexto pegado no describen lo que se pide.
    const desc = String(description || '').split(/\n\s*(?:ENTREGA DEL PASO|CONTEXTO|---)/i)[0].trim();
    if (terms(title).length >= 3 || !desc) return title.slice(0, 300);
    return `${title}\n${desc.slice(0, 200)}`.trim();
}

/**
 * Filtra resultados de la búsqueda híbrida: sin cobertura suficiente no entran (mejor nada que ruido),
 * y un mismo documento indexado dos veces (p. ej. una tarea como `task` y como `tasks`) cuenta una vez.
 */
export function pickAgentKnowledge(results = [], { minCoverage = MIN_COVERAGE(), limit = 6 } = {}) {
    const seen = new Set();
    const out = [];
    for (const r of results) {
        if ((r.coverage || 0) < minCoverage) continue;
        const key = `${String(r.doc?.title || r.docId).toLowerCase()}|${String(r.text || '').slice(0, 120)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
        if (out.length >= limit) break;
    }
    return out;
}
