// Ejecuta un prompt con el proveedor que corresponda al modelo (Gemini, Claude, OpenAI u OpenRouter)
// y devuelve texto + uso de tokens + costo estimado. Un proveedor sin llave en .env queda
// visible en el catálogo pero deshabilitado.

function envList(name, fallback) {
    return String(process.env[name] || fallback).split(',').map(x => x.trim()).filter(Boolean);
}

// Precios en USD por millón de tokens (entrada / salida), tarifa estándar de pago.
// Gemini: aistudio.google.com/docs/pricing (consultado el 26-nov-2026; la salida incluye los tokens
// de razonamiento). `priceFrom` = cambios de precio ya anunciados, por fecha de inicio.
// Si tu llave está en el nivel gratuito, el costo real es 0: esto es lo que costaría en el de pago.
// null = sin precio publicado (no se inventa).
const GEMINI_FLASH = { price: [0.75, 3.75], priceFrom: { '2027-01-01': [1.50, 7.50] } };
export const modelCatalog = () => [
    { id: 'gemini-3.8-flash', provider: 'google', label: 'Gemini 3.8 Flash', use: 'El más nuevo; a menudo saturado (respaldo automático a 3.6)', ...GEMINI_FLASH },
    { id: 'gemini-3.6-flash', provider: 'google', label: 'Gemini 3.6 Flash', use: 'Rápido y estable: tareas operativas, copys, resúmenes', ...GEMINI_FLASH },
    { id: 'gemini-3.5-flash', provider: 'google', label: 'Gemini 3.5 Flash', use: 'Google lo sirve hoy con 3.6 Flash (se cobra como 3.6)', price: null },
    { id: 'gemini-3.5-flash-lite', provider: 'google', label: 'Gemini 3.5 Flash Lite', use: 'Lo más barato de Gemini para volumen', price: [0.30, 2.50] },
    { id: 'gemini-3.1-pro-preview', provider: 'google', label: 'Gemini 3.1 Pro', use: 'Análisis largos, estrategia, documentos complejos (sin nivel gratuito)', price: [2.00, 12.00] },
    { id: 'gemini-pro-latest', provider: 'google', label: 'Gemini Pro (última)', use: 'Alias de Google; sin precio publicado', price: null },
    { id: 'gemma-4-31b-it', provider: 'google', label: 'Gemma 4 31B', use: 'Gratis en la API de Google (cuota diaria)', price: [0, 0] },
    { id: 'claude-opus-5-5', provider: 'anthropic', label: 'Claude Opus 5.5', use: 'Máxima calidad: estrategia, redacción, código', price: [4.00, 20.00] },
    { id: 'claude-sonnet-5-5', provider: 'anthropic', label: 'Claude Sonnet 5.5', use: 'Equilibrio calidad/velocidad para trabajo diario', price: [2.00, 10.00] },
    { id: 'claude-haiku-5-5', provider: 'anthropic', label: 'Claude Haiku 5.5', use: 'Volumen alto y respuestas cortas', price: [0.10, 0.50] },
    ...envList('OPENAI_MODELS', 'gpt-5,gpt-5-mini').map(id => ({ id, provider: 'openai', label: id, use: 'Modelos de OpenAI', price: null })),
    ...envList('OPENROUTER_MODELS', 'deepseek/deepseek-v4.1-flash').map(id => ({ id: `openrouter/${id}`, provider: 'openrouter', label: id, use: 'Destacado en OpenRouter', price: null })),
];

export const PROVIDERS = {
    google: { label: 'Google Gemini', env: 'GEMINI_API_KEY' },
    anthropic: { label: 'Anthropic Claude', env: 'ANTHROPIC_API_KEY' },
    openai: { label: 'OpenAI', env: 'OPENAI_API_KEY' },
    openrouter: { label: 'OpenRouter', env: 'OPENROUTER_API_KEY' },
};

// Modelos que el proveedor ya no sirve: se reemplazan por el modelo por defecto.
export const RETIRED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'claude-3-7-sonnet'];
export const resolveModel = model => (!model || RETIRED_MODELS.includes(model) ? defaultModel() : model);

// Se lee al usarse: server.js carga el .env después de resolver los imports.
export const defaultModel = () => process.env.OFFICE_DEFAULT_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export function providerOf(model = '') {
    const m = String(model).toLowerCase();
    if (m.startsWith('claude')) return 'anthropic';
    if (m.startsWith('openrouter/')) return 'openrouter';
    if (m.startsWith('gemini') || m.startsWith('gemma')) return 'google';
    if (/^(gpt|o\d|chatgpt)/.test(m)) return 'openai';
    return modelCatalog().find(x => x.id === model)?.provider || 'google';
}

export function providerEnabled(provider) {
    if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
    const env = PROVIDERS[provider]?.env;
    return Boolean(env && process.env[env]);
}

/** inUse: modelos ya asignados (agentes, tareas) que se agregan aunque no estén en el catálogo fijo, para tener su nombre. */
export function listModels(inUse = []) {
    // Los destacados de OpenRouter toman nombre y precio de su catálogo cuando ya está en memoria.
    const catalog = modelCatalog().map(m => (m.provider === 'openrouter' && cachedOpenRouterModel(m.id) ? { ...cachedOpenRouterModel(m.id), use: m.use } : m));
    const extra = [...new Set(inUse)]
        .filter(id => typeof id === 'string' && id.startsWith('openrouter/') && !catalog.some(m => m.id === id))
        .map(id => cachedOpenRouterModel(id) || { id, provider: 'openrouter', label: id.replace(/^openrouter\//, ''), use: 'OpenRouter', price: null });
    return {
        defaultModel: defaultModel(),
        defaultFallbacks: defaultFallbacks(),
        providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p, enabled: providerEnabled(id) })),
        models: [...catalog, ...extra].map(m => ({ ...m, enabled: providerEnabled(m.provider) })),
    };
}

// ─── Catálogo completo de OpenRouter ─────────────────────────────
// OpenRouter tiene cientos de modelos: se consulta su lista pública (no necesita llave)
// y se guarda en memoria unas horas. Precio en USD por millón de tokens; null = variable.
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_TTL_MS = 6 * 60 * 60 * 1000;
let openRouterCache = { at: 0, models: null, pending: null };

const perMillion = v => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Number((n * 1e6).toFixed(4)) : null;
};

export function slimOpenRouterModel(m) {
    const input = m.architecture?.input_modalities || ['text'];
    const pin = perMillion(m.pricing?.prompt);
    const pout = perMillion(m.pricing?.completion);
    return {
        id: `openrouter/${m.id}`,
        provider: 'openrouter',
        label: m.name || m.id,
        slug: m.id,
        use: (m.description || '').replace(/\s+/g, ' ').slice(0, 140),
        price: pin == null || pout == null ? null : [pin, pout],
        free: pin === 0 && pout === 0,
        vision: input.includes('image'),
        context: m.context_length || m.top_provider?.context_length || null,
        created: m.created || 0,
    };
}

/** Lista de modelos de OpenRouter que sirven texto (sin variantes :batch). Cacheada. */
export async function openRouterCatalog({ force = false, fetchImpl = fetch } = {}) {
    const fresh = openRouterCache.models && Date.now() - openRouterCache.at < OPENROUTER_TTL_MS;
    if (fresh && !force) return { models: openRouterCache.models, cachedAt: openRouterCache.at };
    if (!openRouterCache.pending) {
        openRouterCache.pending = (async () => {
            try {
                const r = await fetchImpl(OPENROUTER_MODELS_URL, { signal: AbortSignal.timeout(15000) });
                if (!r.ok) throw new Error(`OpenRouter respondió ${r.status} al pedir su lista de modelos`);
                const { data = [] } = await r.json();
                const models = data
                    .filter(m => m?.id && !m.id.endsWith(':batch') && (m.architecture?.output_modalities || ['text']).includes('text'))
                    .map(slimOpenRouterModel);
                openRouterCache = { at: Date.now(), models, pending: null };
            } catch (err) {
                openRouterCache.pending = null;
                // Si ya había una lista vieja, se sigue usando aunque haya vencido.
                if (!openRouterCache.models) throw err;
            }
        })();
    }
    await openRouterCache.pending;
    return { models: openRouterCache.models, cachedAt: openRouterCache.at };
}

/** Lo que ya se sabe de un modelo de OpenRouter sin ir a la red (para etiquetas y costos). */
const cachedOpenRouterModel = id => openRouterCache.models?.find(m => m.id === id) || null;

/** Busca por nombre o id: todas las palabras deben aparecer ("claude sonnet", "llama 70b"). */
export function searchModels(models, query = '') {
    const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return models;
    const hay = m => `${m.label} ${m.slug || m.id}`.toLowerCase();
    return models
        .filter(m => words.every(w => hay(m).includes(w)))
        .sort((a, b) => Number(!a.label.toLowerCase().startsWith(words[0])) - Number(!b.label.toLowerCase().startsWith(words[0])));
}

/** ¿Existe el modelo? Los de OpenRouter se validan contra su lista (si no se pudo traer, basta el formato). */
export async function isKnownModel(model) {
    if (modelCatalog().some(m => m.id === model)) return true;
    if (!/^openrouter\/[\w.~-]+\/[\w.:~-]+$/.test(String(model))) return false;
    try {
        const { models } = await openRouterCatalog();
        return models.some(m => m.id === model);
    } catch {
        return true;
    }
}

/** Precio vigente en una fecha (los anuncios de cambio de precio se aplican desde su día). */
export function priceOf(model, at = new Date()) {
    const entry = modelCatalog().find(m => m.id === model) || cachedOpenRouterModel(model);
    if (!entry?.price) return null;
    const day = new Date(at).toISOString().slice(0, 10);
    const changes = Object.entries(entry.priceFrom || {}).filter(([from]) => from <= day).sort(([a], [b]) => a.localeCompare(b));
    return changes.length ? changes.at(-1)[1] : entry.price;
}

/** `servedBy`: el modelo que el proveedor dice que respondió (un alias puede servir otro modelo). */
export function estimateCost(model, tokensIn = 0, tokensOut = 0, { servedBy = null, at = new Date() } = {}) {
    const price = (servedBy && priceOf(servedBy, at)) || priceOf(model, at);
    if (!price) return null;
    return Number(((tokensIn * price[0] + tokensOut * price[1]) / 1e6).toFixed(6));
}

// attachments: [{ mime, data (base64) }] — imágenes (y PDF en Gemini/Claude) que el modelo puede ver.
async function runGoogle(model, prompt, maxTokens, attachments = []) {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const contents = attachments.length
        ? [{ role: 'user', parts: [{ text: prompt }, ...attachments.map(a => ({ inlineData: { mimeType: a.mime, data: a.data } }))] }]
        : prompt;
    const response = await genai.models.generateContent({ model, contents, config: { maxOutputTokens: maxTokens } });
    const u = response.usageMetadata || {};
    return { text: response.text || '', tokensIn: u.promptTokenCount || 0, tokensOut: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), servedBy: response.modelVersion || null };
}

async function runAnthropic(model, prompt, maxTokens, attachments = []) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();
    // Opus/Sonnet 5.5: si el modelo declina, la API reintenta sola con otro modelo (fallbacks "default").
    const withFallback = /^claude-(opus|sonnet)-5-5/.test(model);
    const params = {
        model,
        max_tokens: maxTokens,
        messages: [{
            role: 'user',
            content: attachments.length
                ? [...attachments.map(a => ({ type: a.mime === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: a.mime, data: a.data } })), { type: 'text', text: prompt }]
                : prompt,
        }],
        ...(model.startsWith('claude-opus-5-5') || model.startsWith('claude-haiku-5-5') ? { output_config: { effort: 'medium' } } : {}),
    };
    const response = withFallback
        ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        : await client.messages.create(params);
    if (response.stop_reason === 'refusal') {
        throw new Error(`Claude declinó la tarea${response.stop_details?.category ? ` (${response.stop_details.category})` : ''}`);
    }
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const u = response.usage || {};
    return { text, tokensIn: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), tokensOut: u.output_tokens || 0, servedBy: response.model };
}

// OpenAI y OpenRouter comparten el formato de chat completions.
async function chatCompletions(url, key, label, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error?.message || `${label} respondió ${r.status}`);
    return { text: data.choices?.[0]?.message?.content || '', tokensIn: data.usage?.prompt_tokens || 0, tokensOut: data.usage?.completion_tokens || 0, costFromProvider: data.usage?.cost };
}

const chatContent = (prompt, attachments = []) => {
    const images = attachments.filter(a => a.mime.startsWith('image/'));
    return images.length
        ? [{ type: 'text', text: prompt }, ...images.map(a => ({ type: 'image_url', image_url: { url: `data:${a.mime};base64,${a.data}` } }))]
        : prompt;
};

const runOpenAI = (model, prompt, maxTokens, attachments) => chatCompletions('https://api.openai.com/v1/chat/completions', process.env.OPENAI_API_KEY, 'OpenAI',
    { model, messages: [{ role: 'user', content: chatContent(prompt, attachments) }], max_completion_tokens: maxTokens });

const runOpenRouter = (model, prompt, maxTokens, attachments) => chatCompletions('https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, 'OpenRouter',
    { model: model.replace(/^openrouter\//, ''), messages: [{ role: 'user', content: chatContent(prompt, attachments) }], max_tokens: maxTokens, usage: { include: true } });

const RUNNERS = { google: runGoogle, anthropic: runAnthropic, openai: runOpenAI, openrouter: runOpenRouter };

// Respaldo dentro del mismo proveedor cuando el modelo está saturado.
// (No usar alias tipo "-latest": suelen apuntar al mismo modelo saturado.)
// gemini-3.5-flash no: Google lo sirve con 3.6 y tarda mucho más que pedir 3.6 directo.
const SAME_PROVIDER_FALLBACK = { google: ['gemini-3.6-flash', 'gemini-3.5-flash-lite'], anthropic: ['claude-sonnet-5-5'] };
const RETRY_DELAYS_MS = [2000, 6000];

// Modelos saturados: después de agotar sus reintentos quedan en pausa unos minutos y las
// siguientes llamadas van directo al respaldo (sin pagar otra vez ~15 s de reintentos).
const saturatedUntil = new Map();
const cooldownMs = () => Number(process.env.OFFICE_SATURATION_COOLDOWN_MS ?? 3 * 60 * 1000);
const isSaturation = err => [503, 529].includes(Number(err?.status || err?.code)) || /\b(503|529)\b|UNAVAILABLE|overloaded|high demand/i.test(err?.message || '');
export const isSaturated = model => (saturatedUntil.get(model) || 0) > Date.now();
export const resetSaturation = () => saturatedUntil.clear();

/** Mensaje legible: los SDK a veces devuelven el JSON crudo del proveedor. */
export function cleanError(err) {
    const raw = err?.message || String(err);
    try {
        const parsed = JSON.parse(raw.slice(raw.indexOf('{')));
        return parsed.error?.message || raw;
    } catch {
        return raw;
    }
}

function isTransient(err) {
    const status = err?.status || err?.code;
    if ([429, 500, 502, 503, 504, 529].includes(Number(status))) return true;
    return /\b(429|500|502|503|504|529)\b|UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED|ECONNRESET|ETIMEDOUT|fetch failed/i.test(err?.message || '');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Tiempo máximo por intento: un modelo colgado no debe dejar la tarea "en curso" para siempre.
const attemptTimeoutMs = () => Number(process.env.OFFICE_MODEL_TIMEOUT_MS) || 150000;

function withTimeout(promise, ms, model) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error(`${model} no respondió en ${Math.round(ms / 1000)} s`), { code: 'model_timeout' })), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Un modelo con reintentos ante errores pasajeros y, si se pide, sus hermanos del mismo proveedor. */
async function runOnProvider(model, { prompt, maxTokens, retryDelays, attachments, siblings, runners, timeoutMs = attemptTimeoutMs() }) {
    const provider = providerOf(model);
    const others = siblings ? (SAME_PROVIDER_FALLBACK[provider] || []).filter(m => m !== model) : [];
    // Un modelo en pausa por saturación no se intenta (si hay a quién pasarle la llamada).
    const resting = isSaturated(model) && others.some(m => !isSaturated(m));
    const plan = [
        ...(resting ? [] : [0, ...retryDelays].map(wait => ({ model, wait }))),
        ...others.filter(m => !isSaturated(m)).map(m => ({ model: m, wait: 0 })),
    ];
    if (!plan.length) plan.push({ model, wait: 0 });
    let lastErr = resting ? new Error(`${model} está saturado (en pausa)`) : null;
    let saturationErrors = 0;
    const timedOut = new Set();
    for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        if (timedOut.has(step.model)) continue; // no se reintenta un modelo que ya se colgó
        if (step.wait) await sleep(step.wait);
        try {
            const out = await withTimeout(runners[provider](step.model, prompt, maxTokens, attachments), timeoutMs, step.model);
            if (!String(out.text || '').trim()) throw new Error(`${step.model} no devolvió contenido`);
            const { costFromProvider, ...rest } = out;
            return {
                ...rest, provider, model: step.model, attempts: i + 1,
                ...(resting ? { skippedSaturated: model } : {}),
                costUSD: typeof costFromProvider === 'number' ? costFromProvider : estimateCost(step.model, out.tokensIn, out.tokensOut, { servedBy: out.servedBy }),
            };
        } catch (err) {
            lastErr = err;
            if (isSaturation(err) && step.model === model && ++saturationErrors > retryDelays.length) {
                saturatedUntil.set(model, Date.now() + cooldownMs()); // agotó sus reintentos: en pausa
            } else if (isSaturation(err) && step.model !== model) {
                saturatedUntil.set(step.model, Date.now() + cooldownMs());
            }
            if (err.code === 'model_timeout') { timedOut.add(step.model); continue; }
            if (!isTransient(err)) break;
        }
    }
    throw Object.assign(new Error(cleanError(lastErr)), { attempts: plan.length });
}

/** Cadena de respaldo por defecto cuando el agente no tiene una propia ("none" la desactiva). */
export function defaultFallbacks() {
    const raw = process.env.OFFICE_FALLBACK_MODELS || 'gemini-3.5-flash-lite,openrouter/deepseek/deepseek-v4.1-flash,gemma-4-31b-it';
    return raw.trim().toLowerCase() === 'none' ? [] : envList('OFFICE_FALLBACK_MODELS', raw);
}

/**
 * Corre el prompt con reintentos ante errores pasajeros (saturación, cuota por minuto, red),
 * luego con un modelo hermano del mismo proveedor y, si el proveedor sigue fallando o no tiene
 * llave, con los modelos de respaldo (otros proveedores) en orden.
 * @returns {Promise<{ text, tokensIn, tokensOut, costUSD, provider, model, ms, attempts, fallbackFrom?, failures? }>}
 */
export async function runModel({ model: requested, prompt, maxTokens = 8192, retryDelays = RETRY_DELAYS_MS, attachments = [], fallbacks = [], runners = RUNNERS, timeoutMs }) {
    const model = resolveModel(requested);
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Prompt vacío');
    const provider = providerOf(model);
    const chain = [...new Set((fallbacks || []).map(resolveModel))].filter(m => m !== model && providerEnabled(providerOf(m)));
    if (!providerEnabled(provider) && !chain.length) {
        throw Object.assign(new Error(`${PROVIDERS[provider]?.label || provider} no está configurado: falta ${PROVIDERS[provider]?.env} en .env`), { code: 'provider_disabled' });
    }
    const started = Date.now();
    const failures = [];
    let attempts = 0;
    const opts = { prompt, maxTokens, attachments, runners, ...(timeoutMs ? { timeoutMs } : {}) };
    if (providerEnabled(provider)) {
        try {
            const out = await runOnProvider(model, { ...opts, retryDelays, siblings: true });
            // Si respondió un modelo hermano (mismo proveedor), también es un respaldo.
            return { ...out, ms: Date.now() - started, ...(out.model !== model ? { fallbackFrom: model } : {}) };
        } catch (err) {
            attempts += err.attempts || 1;
            failures.push({ model, error: err.message });
            if (!chain.length) throw new Error(err.message);
        }
    } else {
        failures.push({ model, error: `${PROVIDERS[provider]?.label || provider} no está configurado (falta ${PROVIDERS[provider]?.env})` });
    }
    for (const [i, fb] of chain.entries()) {
        // Respaldo en pausa por saturación: se salta, salvo que sea la última opción.
        if (isSaturated(fb) && i < chain.length - 1) { failures.push({ model: fb, error: 'saturado (en pausa)' }); continue; }
        try {
            const out = await runOnProvider(fb, { ...opts, retryDelays: retryDelays.slice(0, 1), siblings: false });
            return { ...out, attempts: attempts + out.attempts, ms: Date.now() - started, fallbackFrom: model, failures };
        } catch (err) {
            attempts += err.attempts || 1;
            failures.push({ model: fb, error: err.message });
        }
    }
    throw Object.assign(new Error(failures.map(f => `${f.model}: ${f.error}`).join(' · ')), { failures });
}
