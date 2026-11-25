// Ejecuta un prompt con el proveedor que corresponda al modelo (Gemini, Claude u OpenAI)
// y devuelve texto + uso de tokens + costo estimado. Un proveedor sin llave en .env queda
// visible en el catálogo pero deshabilitado.

function envList(name, fallback) {
    return String(process.env[name] || fallback).split(',').map(x => x.trim()).filter(Boolean);
}

// Precios en USD por millón de tokens (entrada / salida). Estimados: revisa la página
// de precios de cada proveedor si necesitas cifras exactas.
export const modelCatalog = () => [
    { id: 'gemini-3.8-flash', provider: 'google', label: 'Gemini 3.8 Flash', use: 'Rápido: tareas operativas, copys, resúmenes', price: null },
    { id: 'gemini-3.5-flash', provider: 'google', label: 'Gemini 3.5 Flash', use: 'Rápido y estable; respaldo cuando 3.8 está saturado', price: null },
    { id: 'gemini-3.5-flash-lite', provider: 'google', label: 'Gemini 3.5 Flash Lite', use: 'Lo más barato de Gemini para volumen', price: null },
    { id: 'gemini-pro-latest', provider: 'google', label: 'Gemini Pro (última)', use: 'Análisis largos, estrategia, documentos complejos', price: null },
    { id: 'gemma-4-31b-it', provider: 'google', label: 'Gemma 4 31B', use: 'Gratis en la API de Google (cuota diaria)', price: [0, 0] },
    { id: 'claude-opus-5-5', provider: 'anthropic', label: 'Claude Opus 5.5', use: 'Máxima calidad: estrategia, redacción, código', price: [4.00, 20.00] },
    { id: 'claude-sonnet-5-5', provider: 'anthropic', label: 'Claude Sonnet 5.5', use: 'Equilibrio calidad/velocidad para trabajo diario', price: [2.00, 10.00] },
    { id: 'claude-haiku-5-5', provider: 'anthropic', label: 'Claude Haiku 5.5', use: 'Volumen alto y respuestas cortas', price: [0.10, 0.50] },
    ...envList('OPENAI_MODELS', 'gpt-5,gpt-5-mini').map(id => ({ id, provider: 'openai', label: id, use: 'Modelos de OpenAI', price: null })),
    ...envList('OPENROUTER_MODELS', 'deepseek/deepseek-v4-flash').map(id => ({ id: `openrouter/${id}`, provider: 'openrouter', label: id, use: 'Vía OpenRouter (respaldo barato)', price: null })),
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

export function listModels() {
    return {
        defaultModel: defaultModel(),
        providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p, enabled: providerEnabled(id) })),
        models: modelCatalog().map(m => ({ ...m, enabled: providerEnabled(m.provider) })),
    };
}

export function estimateCost(model, tokensIn = 0, tokensOut = 0) {
    const price = modelCatalog().find(m => m.id === model)?.price;
    if (!price) return null;
    return Number(((tokensIn * price[0] + tokensOut * price[1]) / 1e6).toFixed(6));
}

async function runGoogle(model, prompt, maxTokens) {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await genai.models.generateContent({ model, contents: prompt, config: { maxOutputTokens: maxTokens } });
    const u = response.usageMetadata || {};
    return { text: response.text || '', tokensIn: u.promptTokenCount || 0, tokensOut: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) };
}

async function runAnthropic(model, prompt, maxTokens) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();
    // Opus/Sonnet 5.5: si el modelo declina, la API reintenta sola con otro modelo (fallbacks "default").
    const withFallback = /^claude-(opus|sonnet)-5-5/.test(model);
    const params = {
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
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

const runOpenAI = (model, prompt, maxTokens) => chatCompletions('https://api.openai.com/v1/chat/completions', process.env.OPENAI_API_KEY, 'OpenAI',
    { model, messages: [{ role: 'user', content: prompt }], max_completion_tokens: maxTokens });

const runOpenRouter = (model, prompt, maxTokens) => chatCompletions('https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, 'OpenRouter',
    { model: model.replace(/^openrouter\//, ''), messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, usage: { include: true } });

const RUNNERS = { google: runGoogle, anthropic: runAnthropic, openai: runOpenAI, openrouter: runOpenRouter };

/**
 * @returns {Promise<{ text, tokensIn, tokensOut, costUSD, provider, model, ms }>}
 */
// Respaldo dentro del mismo proveedor cuando el modelo está saturado.
// (No usar alias tipo "-latest": suelen apuntar al mismo modelo saturado.)
const SAME_PROVIDER_FALLBACK = { google: ['gemini-3.5-flash', 'gemini-3.5-flash-lite'], anthropic: ['claude-sonnet-5-5'] };
const RETRY_DELAYS_MS = [2000, 6000];

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

/**
 * Corre el prompt con reintentos ante errores pasajeros (saturación, cuota por minuto, red)
 * y, si el modelo sigue caído, con un modelo hermano del mismo proveedor.
 * @returns {Promise<{ text, tokensIn, tokensOut, costUSD, provider, model, ms, attempts }>}
 */
export async function runModel({ model: requested, prompt, maxTokens = 8192, retryDelays = RETRY_DELAYS_MS }) {
    const model = resolveModel(requested);
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Prompt vacío');
    const provider = providerOf(model);
    if (!providerEnabled(provider)) {
        throw Object.assign(new Error(`${PROVIDERS[provider]?.label || provider} no está configurado: falta ${PROVIDERS[provider]?.env} en .env`), { code: 'provider_disabled' });
    }
    const fallbacks = (SAME_PROVIDER_FALLBACK[provider] || []).filter(m => m !== model);
    const plan = [...[0, ...retryDelays].map(wait => ({ model, wait })), ...fallbacks.map(m => ({ model: m, wait: 0 }))];
    const started = Date.now();
    let lastErr;
    for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        if (step.wait) await sleep(step.wait);
        try {
            const out = await RUNNERS[provider](step.model, prompt, maxTokens);
            if (!out.text.trim()) throw new Error(`${step.model} no devolvió contenido`);
            const { costFromProvider, ...rest } = out;
            return {
                ...rest, provider, model: step.model, attempts: i + 1, ms: Date.now() - started,
                costUSD: typeof costFromProvider === 'number' ? costFromProvider : estimateCost(step.model, out.tokensIn, out.tokensOut),
            };
        } catch (err) {
            lastErr = err;
            if (!isTransient(err)) break;
        }
    }
    throw new Error(cleanError(lastErr));
}
