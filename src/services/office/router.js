// BART: decide qué agente toma una misión. Primero con un modelo barato que lee la misión y
// los roles de cada agente; si no hay modelo disponible o responde mal, con palabras clave.
import { providerEnabled, providerOf } from './modelRunner.js';

// Reglas de respaldo (las de siempre). Orden = prioridad.
const KEYWORD_RULES = [
    ['agent-echo', ['redes', 'social', 'reel', 'tiktok', 'guion', 'copy', 'caption', 'post ']],
    ['agent-nexus', ['campaña', 'lanzamiento', 'ads', 'marketing', 'growth']],
    ['agent-atlas', ['venue', 'logistica', 'operacion', 'suministro', 'dj', 'barra']],
    ['agent-closerops', ['venta', 'mesa vip', 'crm', 'cliente', 'lead', 'sponsor']],
    ['agent-scout', ['cotiz', 'costo', 'proveedor', 'compras']],
    ['agent-sentinel', ['licitaci', 'pliego', 'analisis de mercado', 'competidor']],
    ['agent-pulse', ['whatsapp', 'comunidad', 'broadcast', 'difusion', 'invitaci']],
    ['agent-antigravity', ['codigo', 'ui', 'frontend', 'componente', 'react', 'bug']],
];

export const ROUTER_DEFAULT_AGENT = 'agent-bart';

export function keywordRoute(mission, agents = []) {
    const text = String(mission || '').toLowerCase();
    const hit = KEYWORD_RULES.find(([id, words]) => agents.some(a => a.id === id) && words.some(w => text.includes(w)));
    const agentId = hit?.[0] || ROUTER_DEFAULT_AGENT;
    return {
        by: 'keywords',
        agentId,
        reason: hit ? `Palabra clave: "${hit[1].find(w => text.includes(w))}"` : 'Sin palabra clave clara: la toma BART para repartirla',
        confidence: hit ? 0.5 : 0.3,
    };
}

/** Modelos para enrutar: baratos y rápidos. OFFICE_ROUTER_MODEL manda si está definido. */
export function routerModels() {
    const raw = process.env.OFFICE_ROUTER_MODEL || 'gemini-3.5-flash-lite,openrouter/deepseek/deepseek-v4.1-flash,claude-haiku-5-5,gemma-4-31b-it';
    return raw.split(',').map(s => s.trim()).filter(Boolean).filter(m => providerEnabled(providerOf(m)));
}

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function agentLine(a, load) {
    const kind = a.kind === 'external' ? `externo por MCP, ${a.online ? 'conectado' : 'desconectado'}` : 'interno';
    const skills = (a.skills || []).slice(0, 6).join(', ');
    return `- id: ${a.id} | ${a.name} | rol: ${a.role || '—'}${skills ? ` | habilidades: ${skills}` : ''} | ${kind} | tareas abiertas: ${load || 0}`;
}

export function buildRouterPrompt({ mission, description, agents, accounts = [], load = {} }) {
    return `Eres BART, COO de ARRIVE Agency (agencia de eventos, nightlife y contenido en Panamá).
Debes decidir qué agente de la oficina ejecuta esta misión del CEO.

MISIÓN:
${clip(mission, 1500)}
${description ? `\nDETALLES:\n${clip(description, 1500)}\n` : ''}
AGENTES DISPONIBLES:
${agents.map(a => agentLine(a, load[a.id])).join('\n')}

CUENTAS Y MARCAS DE LA AGENCIA:
${accounts.length ? accounts.map(b => `- id: ${b.id} | ${b.name}${b.handler ? ` (${b.handler})` : ''}${b.descriptor ? ` — ${b.descriptor}` : ''}`).join('\n') : '- (ninguna)'}

REGLAS:
- Elige al agente cuyo rol y habilidades encajan mejor con lo que hay que ENTREGAR, no por una palabra suelta.
- Si la misión es amplia, estratégica o mezcla varias áreas, asígnala a agent-bart para que la reparta.
- Evita agentes externos desconectados salvo que la misión los pida por nombre.
- Si dos agentes encajan igual, prefiere el que tenga menos tareas abiertas.
- "account" es el id de la cuenta o marca de la que trata la misión, o null si no trata de ninguna en particular.
- "confidence" va de 0 a 1: qué tan claro es que ese agente es el correcto.

Responde SOLO con JSON válido, sin texto adicional:
{"agentId": "...", "confidence": 0.0, "reason": "una frase corta en español", "alternatives": [{"agentId": "...", "reason": "..."}], "account": null}`;
}

export function parseRouterReply(text, agents, accounts = []) {
    const raw = String(text || '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('El router no devolvió JSON');
    const data = JSON.parse(raw.slice(start, end + 1));
    const ids = new Set(agents.map(a => a.id));
    if (!ids.has(data.agentId)) throw new Error(`El router eligió un agente que no existe: ${data.agentId}`);
    const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
    const accountIds = new Set(accounts.map(b => b.id));
    return {
        agentId: data.agentId,
        confidence,
        reason: clip(data.reason, 240) || 'Sin explicación',
        alternatives: (Array.isArray(data.alternatives) ? data.alternatives : [])
            .filter(x => ids.has(x?.agentId) && x.agentId !== data.agentId)
            .slice(0, 2)
            .map(x => ({ agentId: x.agentId, reason: clip(x.reason, 160) })),
        account: accountIds.has(data.account) ? data.account : null,
    };
}

/**
 * Decide el agente con IA. Nunca lanza: si algo falla, cae a palabras clave y lo dice en `fallbackReason`.
 * @returns {Promise<{ by: 'ai'|'keywords', agentId, confidence, reason, alternatives?, account?, model?, ms?, fallbackReason? }>}
 */
export async function routeMission({ mission, description = '', agents, accounts = [], load = {}, runModel, timeoutMs = 12000 }) {
    const keyword = () => keywordRoute(`${mission}\n${description}`, agents);
    if (process.env.OFFICE_ROUTER === 'keywords') return keyword();
    const [model, ...fallbacks] = routerModels();
    if (!model) return { ...keyword(), fallbackReason: 'No hay un modelo con llave para enrutar' };
    const started = Date.now();
    try {
        const prompt = buildRouterPrompt({ mission, description, agents, accounts, load });
        let timer;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('El router tardó demasiado')), timeoutMs); });
        const out = await Promise.race([runModel({ model, prompt, maxTokens: 1500, retryDelays: [], fallbacks }), timeout]).finally(() => clearTimeout(timer));
        return { by: 'ai', ...parseRouterReply(out.text, agents, accounts), model: out.model, ms: Date.now() - started, costUSD: out.costUSD ?? null };
    } catch (err) {
        return { ...keyword(), fallbackReason: clip(err.message, 200), ms: Date.now() - started };
    }
}
