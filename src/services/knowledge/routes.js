// Rutas del motor de conocimiento: importación de ChatGPT, búsqueda unificada y memorias de agentes.
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { createKnowledgeEngine } from './engine.js';
import { createGeminiEmbedder } from './embeddings.js';
import { createReferenceLibrary } from './references.js';

export function registerKnowledge(app, { readDB, getGeminiKey, generateStructured, availableProviders, dataDir, uploadDir, cron, extensionDir = '' }) {
    const embedder = createGeminiEmbedder(getGeminiKey);
    const engine = createKnowledgeEngine({ dataDir, readDB, getGeminiKey, generateStructured, availableProviders, embedder });
    const references = createReferenceLibrary({ dataDir, store: engine.store, embedMissing: engine.embedMissing, getGeminiKey, generateStructured });
    engine.references = references;

    const upload = multer({
        dest: uploadDir,
        limits: { fileSize: 8 * 1024 * 1024 * 1024 },
        fileFilter: (req, file, cb) => cb(null, /\.(zip|json)$/i.test(file.originalname)),
    });

    const wrap = fn => async (req, res) => {
        try { await fn(req, res); } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
    };

    app.get('/api/knowledge/status', (req, res) => res.json({ ...engine.status(), extensionDir }));

    app.post('/api/knowledge/chatgpt/import', upload.single('file'), wrap(async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'Sube el .zip de la exportación de ChatGPT (o conversations.json)' });
        // multer guarda sin extensión y el lector decide ZIP/JSON por la extensión.
        const filePath = `${req.file.path}${path.extname(req.file.originalname).toLowerCase()}`;
        fs.renameSync(req.file.path, filePath);
        try {
            res.json(engine.importExport(filePath, { origin: 'upload', fileName: req.file.originalname }));
        } finally {
            fs.rmSync(filePath, { force: true });
        }
    }));

    app.post('/api/knowledge/chatgpt/scan', wrap(async (req, res) => res.json({ imported: engine.scanWatchDir(), config: engine.status().config })));
    app.post('/api/knowledge/chatgpt/pause', (req, res) => { engine.pause(); res.json(engine.status().worker); });
    app.post('/api/knowledge/chatgpt/resume', (req, res) => { engine.resume(); res.json(engine.status().worker); });
    app.post('/api/knowledge/chatgpt/retry-errors', (req, res) => { engine.retryErrors(); res.json({ ok: true }); });

    app.get('/api/knowledge/chatgpt/conversations', (req, res) => {
        const { q, projectKey, relevance, status, limit, offset } = req.query;
        res.json(engine.listConversations({ q, projectKey, relevance, status, limit: Math.min(Number(limit) || 50, 200), offset: Number(offset) || 0 }));
    });

    app.get('/api/knowledge/chatgpt/conversations/:id', (req, res) => {
        const conv = engine.getConversation(req.params.id);
        if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
        res.json(conv);
    });

    app.delete('/api/knowledge/chatgpt/conversations/:id', (req, res) => {
        if (!engine.excludeConversation(req.params.id)) return res.status(404).json({ error: 'Conversación no encontrada' });
        res.json({ ok: true });
    });

    app.get('/api/knowledge/projects', (req, res) => res.json(engine.projects()));
    app.post('/api/knowledge/projects/:key/refresh', wrap(async (req, res) => {
        const p = await engine.refreshProjectMemory(req.params.key);
        if (!p) return res.status(404).json({ error: 'Ese proyecto no tiene conversaciones resumidas' });
        res.json(p);
    }));

    app.get('/api/knowledge/profile', (req, res) => res.json(engine.profile()));
    app.post('/api/knowledge/profile/refresh', wrap(async (req, res) => res.json(await engine.refreshProfile())));

    app.post('/api/knowledge/search', wrap(async (req, res) => {
        const { query, topK = 8, source, kind, projectId } = req.body || {};
        if (!query) return res.status(400).json({ error: 'Falta query' });
        const { mode, results } = await engine.search({ query, topK: Math.min(Number(topK) || 8, 50), source, kind, projectId });
        res.json({
            query, mode, count: results.length,
            results: results.map(r => ({ docId: r.docId, chunkId: r.chunkId, title: r.doc.title, source: r.doc.source, kind: r.doc.kind, meta: r.doc.meta, snippet: r.snippet, text: r.text, score: r.score, similarity: r.similarity })),
        });
    }));

    // Memoria corta que guarda un agente (o el usuario) para que la vean todos los demás.
    app.post('/api/knowledge/memory', wrap(async (req, res) => {
        const { title, content, agent, projectId, tags } = req.body || {};
        if (!content) return res.status(400).json({ error: 'Falta content' });
        res.status(201).json(await engine.saveMemory({ title, content, agent, projectId, tags: Array.isArray(tags) ? tags : [] }));
    }));

    // ─── Referencias: links de YouTube / Instagram / TikTok… analizados por IA y metidos al RAG ───
    app.get('/api/knowledge/references', (req, res) => {
        const { q, type, status } = req.query;
        res.json({ items: references.list({ q, type, status }), status: references.status() });
    });
    app.get('/api/knowledge/references/:id', (req, res) => {
        const it = references.get(req.params.id);
        if (!it) return res.status(404).json({ error: 'Referencia no encontrada' });
        res.json(it);
    });
    app.post('/api/knowledge/references', wrap(async (req, res) => {
        const { urls, url, note, account, tags } = req.body || {};
        res.status(201).json(references.add({ urls: urls || url, note, account, tags: Array.isArray(tags) ? tags : String(tags || '').split(',').map(t => t.trim()).filter(Boolean) }));
    }));
    app.patch('/api/knowledge/references/:id', (req, res) => {
        const it = references.update(req.params.id, req.body || {});
        if (!it) return res.status(404).json({ error: 'Referencia no encontrada' });
        res.json(it);
    });
    app.post('/api/knowledge/references/:id/retry', (req, res) => {
        const it = references.retry(req.params.id);
        if (!it) return res.status(404).json({ error: 'Referencia no encontrada' });
        res.json(it);
    });
    app.delete('/api/knowledge/references/:id', (req, res) => {
        if (!references.remove(req.params.id)) return res.status(404).json({ error: 'Referencia no encontrada' });
        res.json({ ok: true });
    });

    app.post('/api/knowledge/config', (req, res) => res.json(engine.setConfig(req.body || {})));

    app.post('/api/knowledge/sync-dashboard', wrap(async (req, res) => res.json(await engine.syncDashboard())));

    // Arranque: índice del dashboard, cola pendiente y vigilancia de Descargas.
    setTimeout(async () => {
        engine.indexPendingTranscripts();
        try {
            const r = await engine.syncDashboard();
            console.log(`   🧠 Conocimiento: ${engine.store.stats().docs} documentos (${r.changed} del dashboard actualizados)`);
        } catch (e) { console.warn('[Knowledge] Sync inicial falló:', e.message); }
        engine.scanWatchDir();
        engine.runWorker();
        references.runWorker();
    }, 3000);
    cron?.schedule('*/10 * * * *', () => {
        engine.scanWatchDir();
        engine.tick();
        references.runWorker();
        engine.syncDashboard().catch(e => console.warn('[Knowledge] Sync del dashboard falló:', e.message));
    });

    const shutdown = () => { try { engine.flush(); } catch { /* nada que guardar */ } };
    process.once('SIGINT', () => { shutdown(); process.exit(0); });
    process.once('SIGTERM', () => { shutdown(); process.exit(0); });

    return engine;
}
