// Embeddings locales en la Mac (sin internet, sin cuota, sin mandar los chats a nadie).
// Modelo multilingual-e5-small (384 dimensiones): en pruebas con textos reales en español acertó 7/7
// búsquedas, igual que su versión grande, al doble de velocidad. El modelo (~120 MB) se descarga
// una vez de Hugging Face y queda en ~/Library/Caches/arrive-command-center/models.
import os from 'os';
import path from 'path';

const MODEL = () => process.env.KNOWLEDGE_LOCAL_MODEL || 'Xenova/multilingual-e5-small';
const BATCH = 16;

export function createLocalEmbedder({ cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'arrive-command-center', 'models'), log = console } = {}) {
    let extractor = null;
    let loading = null;
    let failed = '';

    async function load() {
        if (extractor) return extractor;
        loading ||= (async () => {
            const { pipeline, env } = await import('@huggingface/transformers');
            env.cacheDir = cacheDir;
            extractor = await pipeline('feature-extraction', MODEL(), { dtype: 'q8' });
            log.log?.(`   🧠 Embeddings locales listos (${MODEL()})`);
            return extractor;
        })().catch(err => {
            failed = err.message;
            loading = null;
            throw new Error(`No se pudo cargar el modelo local de embeddings: ${err.message}`);
        });
        return loading;
    }

    // e5 necesita saber si el texto es una consulta o un pasaje.
    async function embed(texts, prefix) {
        const fe = await load();
        const out = [];
        for (let i = 0; i < texts.length; i += BATCH) {
            const batch = texts.slice(i, i + BATCH).map(t => `${prefix}${String(t).slice(0, 4000)}`);
            const res = await fe(batch, { pooling: 'mean', normalize: true });
            out.push(...res.tolist());
            await new Promise(r => setImmediate(r)); // deja respirar al servidor entre tandas
        }
        return out;
    }

    return {
        model: `local:${MODEL()}`,
        dims: 384,
        batchSize: 32,
        available: () => !failed,
        embedDocuments: texts => embed(texts, 'passage: '),
        embedQuery: async text => (await embed([text], 'query: '))[0],
        pausedUntil: () => null,
        warmUp: () => load().catch(() => {}),
        lastError: () => failed,
    };
}
