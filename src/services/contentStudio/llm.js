// Generación estructurada (JSON validado con zod) para todo el dashboard.
// Cada tarea tiene una cadena de modelos: se prueba el primero y, si falla o se queda sin cuota,
// pasa al siguiente. Proveedores: Gemini/Gemma (API de Google), Claude (Anthropic) y OpenRouter (respaldo barato).
//
// Cadenas por defecto (se cambian con <TAREA>_MODELS="proveedor:modelo,proveedor:modelo"):
//   knowledge → resúmenes del RAG, memoria de proyectos, perfil. Gemma primero: 14.400 consultas/día gratis.
//   reference → análisis de texto de referencias (los videos los ve references.js directo con Gemini).
//   studio    → ideas, guiones de edición y briefs: calidad primero.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Se leen al usarse (no al importar): server.js carga el .env después de resolver los imports.
const claudeModel = () => process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const geminiModel = () => process.env.GEMINI_STUDIO_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const openrouterModels = () => (process.env.OPENROUTER_MODELS || 'typesafe/jev-router,deepseek/deepseek-v4-flash').split(',').map(s => s.trim()).filter(Boolean);

const DEFAULT_CHAINS = {
    knowledge: ['gemini:gemma-4-31b-it', 'gemini:gemma-4-26b-a4b-it', 'gemini:gemini-3.5-flash-lite', 'gemini:gemini-3.1-flash-lite', 'openrouter:*'],
    reference: ['gemini:gemini-3.5-flash-lite', 'gemini:gemma-4-31b-it', 'gemini:gemini-3.1-flash-lite', 'openrouter:*'],
    studio: ['claude:*', 'gemini:gemini-3.8-flash', 'gemini:gemini-3-flash-preview', 'gemini:gemini-3.5-flash-lite', 'openrouter:*'],
};

export function availableProviders({ geminiApiKey } = {}) {
    const providers = [];
    if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE) providers.push('claude');
    if (process.env.GEMINI_API_KEY || geminiApiKey) providers.push('gemini');
    if (process.env.OPENROUTER_API_KEY) providers.push('openrouter');
    return providers;
}

/** "gemini:gemma-4-31b-it,openrouter:*" → [{provider, model}] ; "*" = el modelo por defecto del proveedor. */
function chainFor(task, opts) {
    const raw = (task && process.env[`${task.toUpperCase()}_MODELS`]) ? process.env[`${task.toUpperCase()}_MODELS`].split(',') : DEFAULT_CHAINS[task];
    let steps;
    if (raw) {
        steps = raw.map(s => s.trim()).filter(Boolean).map(s => {
            const i = s.indexOf(':');
            return { provider: s.slice(0, i), model: s.slice(i + 1) };
        });
    } else {
        // Compatibilidad: sin tarea, el orden de antes (provider preferido, Claude, Gemini) y OpenRouter al final.
        const gem = [...new Set([opts.geminiModel, geminiModel(), 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].filter(Boolean))];
        const order = opts.provider ? [opts.provider, ...['claude', 'gemini', 'openrouter'].filter(p => p !== opts.provider)] : ['claude', 'gemini', 'openrouter'];
        steps = order.flatMap(p => (p === 'gemini' ? gem.map(model => ({ provider: p, model })) : [{ provider: p, model: '*' }]));
    }
    // Expande "*" y descarta proveedores sin llave.
    const providers = availableProviders(opts);
    return steps.filter(s => providers.includes(s.provider)).flatMap(s => {
        if (s.model !== '*') return [s];
        if (s.provider === 'claude') return [{ provider: 'claude', model: claudeModel() }];
        if (s.provider === 'gemini') return [{ provider: 'gemini', model: opts.geminiModel || geminiModel() }];
        return openrouterModels().map(model => ({ provider: 'openrouter', model }));
    });
}

/** Saca el JSON de una respuesta de texto (con o sin ```json y texto alrededor). */
function extractJson(text) {
    const t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(t); } catch { /* se busca el bloque abajo */ }
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error(`Respuesta sin JSON válido: ${t.slice(0, 120)}`);
}

const schemaPrompt = (prompt, schema) => `${prompt}\n\nResponde solo con JSON (sin texto antes ni después) que cumpla este esquema:\n${JSON.stringify(z.toJSONSchema(schema))}`;

let anthropic = null;
const claudeClient = () => (anthropic ||= new Anthropic());

async function withClaude({ system, prompt, images, schema, model }) {
    const content = [
        ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } })),
        { type: 'text', text: prompt },
    ];
    const response = await claudeClient().beta.messages.parse({
        model,
        max_tokens: 16000,
        // Si el modelo declina por política, la API reintenta en otro modelo dentro de la misma llamada.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') throw new Error(`Claude declinó la solicitud (${response.stop_details?.category || 'sin categoría'})`);
    if (response.stop_reason === 'max_tokens') throw new Error('La respuesta de Claude se cortó por longitud');
    if (!response.parsed_output) throw new Error('Claude no devolvió un JSON válido');
    return { data: response.parsed_output, model: response.model };
}

async function withGemini({ system, prompt, schema, geminiApiKey, images = [], model }) {
    const key = process.env.GEMINI_API_KEY || geminiApiKey;
    // Gemma no acepta systemInstruction ni modo JSON: va todo en el mensaje y se extrae el JSON del texto.
    const gemma = model.startsWith('gemma');
    const text = gemma ? `${system}\n\n${schemaPrompt(prompt, schema)}` : schemaPrompt(prompt, schema);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
            ...(gemma ? {} : { systemInstruction: { parts: [{ text: system }] } }),
            contents: [{ role: 'user', parts: [...images.map(img => ({ inlineData: { mimeType: img.mediaType, data: img.data } })), { text }] }],
            generationConfig: { ...(gemma ? {} : { responseMimeType: 'application/json' }), temperature: 0.6 },
        }),
        signal: AbortSignal.timeout(5 * 60000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const out = json.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
    if (!out) throw new Error(`Gemini sin respuesta (${json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason || 'vacía'})`);
    return { data: schema.parse(extractJson(out)), model };
}

async function withOpenRouter({ system, prompt, schema, images = [], model }) {
    const router = model === 'typesafe/jev-router';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'X-Title': 'ARRIVE Command Center',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: [...images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mediaType};base64,${img.data}` } })), { type: 'text', text: schemaPrompt(prompt, schema) }] },
            ],
            temperature: 0.6,
            ...(router
                ? { plugins: [{ id: 'jev-router', cost_tier: process.env.OPENROUTER_JEV_COST_TIER || 'low', ...(process.env.OPENROUTER_JEV_EXCLUDE ? { excluded_models: process.env.OPENROUTER_JEV_EXCLUDE.split(',').map(s => s.trim()) } : {}) }] }
                : { response_format: { type: 'json_object' } }),
            // Solo proveedores que no guardan ni entrenan con los datos.
            provider: { data_collection: 'deny' },
        }),
        signal: AbortSignal.timeout(5 * 60000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const out = json.choices?.[0]?.message?.content || '';
    if (!out) throw new Error(`OpenRouter sin respuesta (${json.choices?.[0]?.finish_reason || 'vacía'})`);
    return { data: schema.parse(extractJson(out)), model: json.model ? `openrouter/${json.model}` : `openrouter/${model}` };
}

const RUNNERS = { claude: withClaude, gemini: withGemini, openrouter: withOpenRouter };

// Modelos en pausa: si uno está saturado o sin cuota, se salta un rato en vez de esperar su error en cada llamada
// (Gemma tarda ~50 s en contestar "high demand").
const cooldown = new Map(); // "proveedor/modelo" → hasta cuándo
const coolFor = msg => (/quota|RESOURCE_EXHAUSTED|limit: 0|\b402\b/i.test(msg) ? 60 * 60000 : /\b(503|529)\b|UNAVAILABLE|high demand|overloaded/i.test(msg) ? 5 * 60000 : /\b404\b/.test(msg) ? 24 * 3600000 : 0);

/**
 * @param {{ system: string, prompt: string, schema: z.ZodType, task?: 'knowledge'|'reference'|'studio', images?: {mediaType: string, data: string}[], geminiApiKey?: string, geminiModel?: string, provider?: 'claude'|'gemini'|'openrouter' }} opts
 */
export async function generateStructured(opts) {
    if (!availableProviders(opts).length) throw new Error('No hay LLM configurado: define GEMINI_API_KEY, OPENROUTER_API_KEY o ANTHROPIC_API_KEY en .env');
    const chain = chainFor(opts.task, opts);
    if (!chain.length) throw new Error(`Ningún modelo disponible para la tarea ${opts.task || 'general'}`);
    // Cuota diaria agotada o modelo inexistente: no vale la pena reintentar el mismo, se salta al siguiente.
    const hardStop = msg => /quota|RESOURCE_EXHAUSTED|limit: 0|\b40[0134]\b|\b402\b/i.test(msg);
    const transient = msg => !hardStop(msg) && /\b(429|500|502|503|504|529)\b|UNAVAILABLE|overloaded|high demand|ECONNRESET|ETIMEDOUT|timeout/i.test(msg);
    const errors = [];
    const live = chain.filter(({ provider, model }) => (cooldown.get(`${provider}/${model}`) || 0) < Date.now());
    // Si todos están en pausa se prueban igual: mejor un intento que fallar sin preguntar.
    for (const { provider, model } of live.length ? live : chain) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                return { ...(await RUNNERS[provider]({ ...opts, images: opts.images || [], model })), provider, errors };
            } catch (err) {
                if (attempt < 1 && transient(err.message)) {
                    await new Promise(r => setTimeout(r, 4000));
                    continue;
                }
                errors.push(`${provider}/${model}: ${err.message.slice(0, 200)}`);
                const ms = coolFor(err.message);
                if (ms) cooldown.set(`${provider}/${model}`, Date.now() + ms);
                break;
            }
        }
    }
    throw new Error(`No se pudo generar: ${errors.join(' | ')}`);
}
