// Embeddings con Gemini (batchEmbedContents). Reintenta ante saturación y avisa si se agotó la cuota.
export const EMBED_MODEL = () => process.env.KNOWLEDGE_EMBED_MODEL || 'gemini-embedding-2';
export const EMBED_DIMS = () => Number(process.env.KNOWLEDGE_EMBED_DIMS) || 768;

const BATCH = 50;
const MAX_CHARS = 7000; // ~2k tokens: de sobra para un trozo de 1600 caracteres más el título

export class QuotaError extends Error {}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Limitador por minuto: el plan gratuito de Gemini cuenta cada texto como una petición (100/min).
 * Se deja margen para las consultas de los agentes. KNOWLEDGE_EMBED_RPM lo sube si hay facturación.
 */
export function createRateLimiter(perMinute, { now = () => Date.now(), sleep: wait = sleep } = {}) {
    let used = []; // [timestamp, n]
    return async function reserve(n) {
        n = Math.min(n, perMinute);
        for (;;) {
            const t = now();
            used = used.filter(([ts]) => t - ts < 60000);
            const inWindow = used.reduce((sum, [, k]) => sum + k, 0);
            if (inWindow + n <= perMinute) { used.push([t, n]); return; }
            await wait(Math.max(250, 60000 - (t - used[0][0]) + 50));
        }
    };
}

export function createGeminiEmbedder(getApiKey) {
    const model = EMBED_MODEL();
    const dims = EMBED_DIMS();
    const reserve = createRateLimiter(Number(process.env.KNOWLEDGE_EMBED_RPM) || 90);

    async function call(texts, taskType) {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error('Falta GEMINI_API_KEY para calcular embeddings');
        const body = {
            requests: texts.map(text => ({
                model: `models/${model}`,
                content: { parts: [{ text: String(text).slice(0, MAX_CHARS) || ' ' }] },
                outputDimensionality: dims,
                taskType,
            })),
        };
        await reserve(texts.length);
        for (let attempt = 0; ; attempt++) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(60000),
            });
            if (res.ok) {
                const data = await res.json();
                return data.embeddings.map(e => e.values);
            }
            const text = await res.text();
            const retryable = [429, 500, 502, 503, 504].includes(res.status);
            if (retryable && attempt < 5) {
                // Gemini dice cuánto esperar ("Please retry in 26.1s"); si no, espera creciente.
                const hinted = Number(text.match(/retry in ([\d.]+)s/i)?.[1]);
                await sleep(Math.min(65000, hinted ? hinted * 1000 + 500 : 2000 * 2 ** attempt));
                continue;
            }
            if (res.status === 429) throw new QuotaError(`Cuota de embeddings de Gemini agotada: ${text.slice(0, 200)}`);
            throw new Error(`Embeddings Gemini ${res.status}: ${text.slice(0, 200)}`);
        }
    }

    return {
        model,
        dims,
        available: () => !!getApiKey(),
        async embedDocuments(texts) {
            const out = [];
            for (let i = 0; i < texts.length; i += BATCH) out.push(...await call(texts.slice(i, i + BATCH), 'RETRIEVAL_DOCUMENT'));
            return out;
        },
        async embedQuery(text) {
            return (await call([text], 'RETRIEVAL_QUERY'))[0];
        },
    };
}
