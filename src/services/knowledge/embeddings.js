// Embeddings con Gemini (batchEmbedContents). Reintenta ante saturación y avisa si se agotó la cuota.
export const EMBED_MODEL = () => process.env.KNOWLEDGE_EMBED_MODEL || 'gemini-embedding-2';
export const EMBED_DIMS = () => Number(process.env.KNOWLEDGE_EMBED_DIMS) || 768;

const BATCH = 20;
const MAX_CHARS = 7000; // ~2k tokens: de sobra para un trozo de 1600 caracteres más el título

export class QuotaError extends Error {
    constructor(message, { daily = false } = {}) { super(message); this.daily = daily; }
}

/** Próxima medianoche del Pacífico, cuando Google renueva las cuotas diarias. */
export function nextQuotaReset(now = new Date()) {
    const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const msToMidnight = (24 * 3600 - (pt.getHours() * 3600 + pt.getMinutes() * 60 + pt.getSeconds())) * 1000;
    return new Date(now.getTime() + msToMidnight + 5 * 60 * 1000);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Limitador por minuto: el plan gratuito de Gemini cuenta cada texto como una petición (100/min).
 * Se deja margen para las consultas de los agentes. KNOWLEDGE_EMBED_RPM lo sube si hay facturación.
 */
export function createRateLimiter(perMinute, { tokensPerMinute = Infinity, now = () => Date.now(), sleep: wait = sleep } = {}) {
    let used = []; // [timestamp, peticiones, tokens]
    return async function reserve(n, tokens = 0) {
        n = Math.min(n, perMinute);
        tokens = Math.min(tokens, tokensPerMinute);
        for (;;) {
            const t = now();
            used = used.filter(([ts]) => t - ts < 60000);
            const reqs = used.reduce((sum, [, k]) => sum + k, 0);
            const toks = used.reduce((sum, [, , k]) => sum + k, 0);
            if (reqs + n <= perMinute && toks + tokens <= tokensPerMinute) { used.push([t, n, tokens]); return; }
            await wait(Math.max(250, 60000 - (t - used[0][0]) + 50));
        }
    };
}

// Aproximación conservadora: ~3,5 caracteres por token en español.
const estimateTokens = texts => texts.reduce((n, t) => n + Math.ceil(String(t).length / 3.5), 0);

export function createGeminiEmbedder(getApiKey) {
    const model = EMBED_MODEL();
    const dims = EMBED_DIMS();

    // Tope diario del plan gratis (1.000 textos/día; se reinicia a medianoche del Pacífico).
    // KNOWLEDGE_EMBED_RPD=0 lo desactiva con plan de pago.
    const rpd = Number(process.env.KNOWLEDGE_EMBED_RPD ?? 950);
    const day = { key: '', count: 0 };
    const dayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    function countDaily(n) {
        if (!rpd) return;
        if (day.key !== dayKey()) Object.assign(day, { key: dayKey(), count: 0 });
        if (day.count + n > rpd) throw new QuotaError(`Cuota diaria de embeddings alcanzada (${day.count}/${rpd}); sigue mañana`);
        day.count += n;
    }
    const reserve = createRateLimiter(Number(process.env.KNOWLEDGE_EMBED_RPM) || 90, {
        tokensPerMinute: Number(process.env.KNOWLEDGE_EMBED_TPM) || 25000,
    });

    let pausedUntil = 0;

    // interactive: consultas de agentes; nunca esperan al limitador ni reintentan (si falla, se busca por palabras).
    async function call(texts, taskType, { interactive = false } = {}) {
        if (Date.now() < pausedUntil) throw new QuotaError(`Cuota diaria de embeddings agotada hasta ${new Date(pausedUntil).toLocaleString('es')}`, { daily: true });
        const apiKey = getApiKey();
        if (!apiKey) throw new Error('Falta GEMINI_API_KEY para calcular embeddings');
        countDaily(texts.length);
        const body = {
            requests: texts.map(text => ({
                model: `models/${model}`,
                content: { parts: [{ text: String(text).slice(0, MAX_CHARS) || ' ' }] },
                outputDimensionality: dims,
                taskType,
            })),
        };
        if (!interactive) await reserve(texts.length, estimateTokens(body.requests.map(r => r.content.parts[0].text)));
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
            if (res.status === 429 && /per day/i.test(text)) {
                pausedUntil = nextQuotaReset().getTime();
                throw new QuotaError(`Cuota diaria de embeddings de Gemini agotada; se reanuda sola ${new Date(pausedUntil).toLocaleString('es')}`, { daily: true });
            }
            const retryable = [429, 500, 502, 503, 504].includes(res.status);
            if (retryable && attempt < 5 && !interactive) {
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
            // Tandas de hasta BATCH textos sin pasar de un tercio del límite de tokens por minuto.
            const maxTok = Math.max(2000, (Number(process.env.KNOWLEDGE_EMBED_TPM) || 25000) / 3);
            for (let i = 0; i < texts.length;) {
                let j = i;
                let tok = 0;
                while (j < texts.length && j - i < BATCH && (j === i || tok + estimateTokens([texts[j]]) <= maxTok)) tok += estimateTokens([texts[j++]]);
                out.push(...await call(texts.slice(i, j), 'RETRIEVAL_DOCUMENT'));
                i = j;
            }
            return out;
        },
        async embedQuery(text) {
            return (await call([text], 'RETRIEVAL_QUERY', { interactive: true }))[0];
        },
        pausedUntil: () => (Date.now() < pausedUntil ? new Date(pausedUntil).toISOString() : null),
    };
}
