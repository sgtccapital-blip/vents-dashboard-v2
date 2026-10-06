// Generación estructurada para el estudio de contenido.
// Proveedor principal: Claude (ANTHROPIC_API_KEY o perfil de `ant auth login`). Respaldo: Gemini.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Se leen al usarse (no al importar): server.js carga el .env después de resolver los imports.
const claudeModel = () => process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const geminiModel = () => process.env.GEMINI_STUDIO_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// Respaldo cuando el modelo principal está saturado (503) o no disponible.
const geminiModels = () => [...new Set([geminiModel(), 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])];

export function availableProviders({ geminiApiKey } = {}) {
    const providers = [];
    if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE) providers.push('claude');
    if (process.env.GEMINI_API_KEY || geminiApiKey) providers.push('gemini');
    return providers;
}

let anthropic = null;
const claudeClient = () => (anthropic ||= new Anthropic());

async function withClaude({ system, prompt, images, schema }) {
    const content = [
        ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } })),
        { type: 'text', text: prompt },
    ];
    const response = await claudeClient().beta.messages.parse({
        model: claudeModel(),
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

async function withGemini({ system, prompt, schema, geminiApiKey, images = [], model = geminiModel() }) {
    const key = process.env.GEMINI_API_KEY || geminiApiKey;
    const jsonSchema = z.toJSONSchema(schema);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [...images.map(img => ({ inlineData: { mimeType: img.mediaType, data: img.data } })), { text: `${prompt}\n\nResponde solo con JSON que cumpla este esquema:\n${JSON.stringify(jsonSchema)}` }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
        }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    return { data: schema.parse(JSON.parse(text)), model };
}

/**
 * @param {{ system: string, prompt: string, schema: z.ZodType, images?: {mediaType: string, data: string}[], geminiApiKey?: string, provider?: 'claude'|'gemini' }} opts
 */
export async function generateStructured(opts) {
    const providers = availableProviders(opts);
    if (!providers.length) throw new Error('No hay LLM configurado: define ANTHROPIC_API_KEY (recomendado) o GEMINI_API_KEY en .env');
    const order = opts.provider ? [opts.provider, ...providers.filter(p => p !== opts.provider)] : providers;
    const errors = [];
    // Errores pasajeros (sobrecarga, 5xx, 429 corto): se reintenta con espera creciente antes de pasar al siguiente proveedor.
    const transient = msg => /\b(429|500|502|503|504|529)\b|UNAVAILABLE|overloaded|high demand|ECONNRESET|ETIMEDOUT/i.test(msg) && !/limit: 0/.test(msg);
    const attempts = [];
    for (const provider of order.filter(p => providers.includes(p))) {
        if (provider === 'claude') attempts.push({ provider, run: () => withClaude({ ...opts, images: opts.images || [] }) });
        else for (const model of geminiModels()) attempts.push({ provider, run: () => withGemini({ ...opts, images: opts.images || [], model }) });
    }
    for (const { provider, run } of attempts) {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                return { ...(await run()), provider, errors };
            } catch (err) {
                if (attempt < 2 && transient(err.message)) {
                    await new Promise(r => setTimeout(r, [3000, 10000][attempt]));
                    continue;
                }
                errors.push(`${provider}: ${err.message.slice(0, 200)}`);
                break;
            }
        }
    }
    throw new Error(`No se pudo generar: ${errors.join(' | ')}`);
}
