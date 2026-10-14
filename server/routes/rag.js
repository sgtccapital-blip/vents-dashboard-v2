/**
 * Cerebro RAG: motor embebido (búsqueda BM25 en server/agent.js), documentos subidos,
 * vault de notas, sesiones/presets del agente y endpoints /api/rag y /api/brain.
 */
import fs from 'fs';
import path from 'path';
import { searchKnowledge, getKnowledgeDoc } from '../agent.js';
import { collectVaultFiles, toRagDocument } from '../brainVault.js';

export function registerRagRoutes(app, ctx) {
    const { readDB, writeDB, upload, extractPdfText, rootDir } = ctx;

    // ─── Native Embedded OpenClaw RAG Engine ────────────────────────
    const EmbeddedRAGEngine = {
        // Proyectos, eventos, tareas, notas y contactos se buscan en vivo desde db.json (server/agent.js),
        // así que ya no hace falta copiarlos al índice: estos ganchos se mantienen por compatibilidad.
        async upsertEntity() {
            return { success: true, live: true };
        },

        async deleteEntity() {
            return { success: true, live: true };
        },

        async indexCustomDocument(docId, title, content, category, extraMetadata, namespace = 'default') {
            const db = readDB();
            if (!db.ragDocuments) db.ragDocuments = [];
            const docObj = {
                id: docId || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                filename: title,
                title: title || 'Sin título',
                content: content || '',
                category: category || 'custom_document',
                namespace: namespace || 'default',
                addedAt: new Date().toISOString()
            };
            db.ragDocuments.unshift(docObj);
            writeDB(db);
            return { success: true, documentId: docObj.id, indexed: true };
        },

        /**
         * Indexa una carpeta de notas (el BrainVault): título y categoría desde el encabezado YAML,
         * omite "_plantillas", "_archivo" y ocultos, y quita del índice lo que ya no existe en la carpeta.
         */
        async indexObsidianVault(vaultPath, namespace = 'default') {
            if (!vaultPath || !fs.existsSync(vaultPath)) return { success: false, error: 'Ruta de vault inválida o inexistente' };
            const root = path.resolve(vaultPath);
            const files = collectVaultFiles(root);
            const db = readDB();
            db.ragDocuments = db.ragDocuments || [];

            const seen = new Set();
            for (const f of files) {
                const rel = path.relative(root, f);
                const doc = toRagDocument(fs.readFileSync(f, 'utf-8'), rel);
                const docId = `obsidian-${rel.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                seen.add(docId);
                const docObj = {
                    id: docId,
                    filename: path.basename(f),
                    title: doc.title,
                    content: doc.content,
                    category: doc.category,
                    tags: doc.tags,
                    namespace: namespace || 'default',
                    path: f,
                    source: 'brainvault',
                    updatedAt: doc.updated || new Date().toISOString(),
                };
                const existing = db.ragDocuments.findIndex(d => d.id === docId);
                if (existing >= 0) db.ragDocuments[existing] = docObj;
                else db.ragDocuments.push(docObj);
            }

            // Documentos de esta carpeta que ya no existen (borrados, renombrados o movidos a _archivo)
            const before = db.ragDocuments.length;
            db.ragDocuments = db.ragDocuments.filter(d => !(
                String(d.id).startsWith('obsidian-') &&
                typeof d.path === 'string' &&
                path.resolve(d.path).startsWith(root + path.sep) &&
                !seen.has(d.id)
            ));
            writeDB(db);
            return { success: true, count: files.length, removed: before - db.ragDocuments.length };
        },

        async indexAllData() {
            // Limpia los espejos viejos de entidades (ahora se leen en vivo) y reporta el tamaño del corpus
            const db = readDB();
            const before = (db.ragDocuments || []).length;
            db.ragDocuments = (db.ragDocuments || []).filter(d => !String(d.id || '').startsWith('entity-'));
            if (db.ragDocuments.length !== before) writeDB(db);
            const live = ['projects', 'events', 'tasks', 'notes', 'contacts', 'ideas', 'decisionLog']
                .reduce((acc, k) => acc + (Array.isArray(db[k]) ? db[k].length : 0), 0);
            const stored = db.ragDocuments.length + (db.customDocuments || []).length;
            return { success: true, indexed: stored + live, documents: stored, liveEntities: live, total: stored + live, removedStale: before - db.ragDocuments.length };
        },

        async query(question, topK = 5, namespace = 'default') {
            const db = readDB();
            const { results, context } = searchKnowledge(db, question || '', { namespace, topK });
            if (results.length === 0) {
                return { answer: 'No encontré información relevante en la base de conocimiento.', context: '', sources: [], count: 0 };
            }
            return {
                answer: `Se encontraron ${results.length} fuentes relevantes.`,
                context,
                sources: results.map(({ id, title, category, namespace: ns, similarity, snippet }) => ({ id, title, category, namespace: ns, similarity, snippet })),
                count: results.length,
            };
        },

        async getStatus() {
            const db = readDB();
            const docs = (db.ragDocuments || []).concat(db.customDocuments || []).filter(d => !String(d.id || '').startsWith('entity-'));
            const namespaces = [...new Set(docs.map(d => d.namespace || 'default'))];
            const live = ['projects', 'events', 'tasks', 'notes', 'contacts', 'ideas', 'decisionLog']
                .reduce((acc, k) => acc + (Array.isArray(db[k]) ? db[k].length : 0), 0);
            return {
                ready: true,
                provider: 'Bart RAG (BM25 local sobre documentos + datos en vivo)',
                indexed: docs.length + live,
                documents: docs.length,
                liveEntities: live,
                namespaces,
                lastSync: new Date().toISOString()
            };
        }
    };

    app.set('ragEngine', EmbeddedRAGEngine);

    // ─── Direct RAG REST Endpoints ───────────────────────────────

    app.get('/api/rag/status', async (req, res) => {
        res.json(await EmbeddedRAGEngine.getStatus());
    });

    app.post('/api/rag/sync', async (req, res) => {
        const result = await EmbeddedRAGEngine.indexAllData();
        res.json(result);
    });

    // Detalle completo de un documento específico
    app.get(['/api/rag-doc/:id', '/api/rag/documents/:id'], (req, res) => {
        const db = readDB();
        const doc = getKnowledgeDoc(db, req.params.id);
        if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
        res.json(doc);
    });

    // Búsqueda semántica con scoring porcentual y snippets
    app.post('/api/rag/search', async (req, res) => {
        const { query, namespace = 'default', category, topK = 6 } = req.body || {};
        if (!query) return res.status(400).json({ error: 'Falta término de búsqueda' });
        const db = readDB();
        const { results } = searchKnowledge(db, query, { namespace, topK: Math.min(Number(topK) || 6, 20), category });
        res.json({
            query,
            count: results.length,
            results: results.map(({ chunk, ...r }) => ({ ...r, textLength: chunk.length })),
        });
    });

    app.get('/api/rag/:namespace', (req, res) => {
        const db = readDB();
        const ns = req.params.namespace || 'default';
        const docs = (db.ragDocuments || []).concat(db.customDocuments || [])
            .filter(d => !String(d.id || '').startsWith('entity-'))
            .filter(d => !ns || ns === 'default' ? true : d.namespace === ns);
        res.json(docs);
    });

    app.post('/api/rag/:namespace', (req, res) => {
        const db = readDB();
        if (!db.ragDocuments) db.ragDocuments = [];
        const ns = req.params.namespace || 'default';
        const doc = {
            id: req.body.id || `rag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            filename: req.body.filename || req.body.title || 'Documento sin título',
            title: req.body.title || req.body.filename || 'Documento',
            content: req.body.content || '',
            category: req.body.category || 'document',
            namespace: ns,
            addedAt: req.body.addedAt || new Date().toISOString()
        };
        db.ragDocuments.unshift(doc);
        writeDB(db);
        res.status(201).json({ success: true, doc });
    });

    app.delete('/api/rag/:namespace', (req, res) => {
        const db = readDB();
        const ns = req.params.namespace;
        if (db.ragDocuments) {
            db.ragDocuments = db.ragDocuments.filter(d => d.namespace !== ns);
            writeDB(db);
        }
        res.json({ success: true, message: `Namespace ${ns} limpiado` });
    });

    app.delete('/api/rag/:namespace/:id', (req, res) => {
        const db = readDB();
        const before = (db.ragDocuments || []).length + (db.customDocuments || []).length;
        db.ragDocuments = (db.ragDocuments || []).filter(d => d.id !== req.params.id);
        db.customDocuments = (db.customDocuments || []).filter(d => d.id !== req.params.id);
        const removed = before - db.ragDocuments.length - db.customDocuments.length;
        if (removed) writeDB(db);
        res.status(removed ? 200 : 404).json({ success: !!removed });
    });

    // ─── Hermes Chat Sessions Persistence ─────────────────────────
    app.get(['/api/hermes/sessions', '/api/openclaw/sessions'], (req, res) => {
        const db = readDB();
        res.json(db.hermesSessions || []);
    });

    app.post(['/api/hermes/sessions', '/api/openclaw/sessions'], (req, res) => {
        const db = readDB();
        if (!db.hermesSessions) db.hermesSessions = [];

        const session = {
            id: req.body.id || `sess-${Date.now()}`,
            title: req.body.title || `Sesión ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            messages: req.body.messages || [],
            mode: req.body.mode || 'ejecutivo',
            namespace: req.body.namespace || 'default',
            updatedAt: new Date().toISOString()
        };

        const existingIdx = db.hermesSessions.findIndex(s => s.id === session.id);
        if (existingIdx >= 0) {
            db.hermesSessions[existingIdx] = session;
        } else {
            db.hermesSessions.unshift(session);
        }
        db.hermesSessions = db.hermesSessions.slice(0, 20); // max 20 sessions
        writeDB(db);
        res.json({ success: true, session });
    });

    app.delete(['/api/hermes/sessions/:id', '/api/openclaw/sessions/:id'], (req, res) => {
        const db = readDB();
        if (db.hermesSessions) {
            db.hermesSessions = db.hermesSessions.filter(s => s.id !== req.params.id);
            writeDB(db);
        }
        res.json({ success: true });
    });

    // ─── Hermes Skill Presets ─────────────────────────────────────
    app.get(['/api/hermes/skills/presets', '/api/openclaw/skills/presets'], (req, res) => {
        const db = readDB();
        res.json(db.hermesSkillPresets || [
            { id: 'budget_calc', name: 'Presupuestos & Costos', icon: '💰', enabled: true, prompt: 'Calcula siempre presupuestos detallados con contingencia del 10%.' },
            { id: 'casco_safety', name: 'Logística & Casco Peatonal', icon: '🚶‍♂️', enabled: true, prompt: 'Aplica normativas de seguridad vial, inspectores y cierres de calles de Casco Antiguo.' },
            { id: 'social_copy', name: 'Estrategia de Redes & Copy', icon: '📱', enabled: true, prompt: 'Genera copies virales con hooks, emojis y llamadas a la acción claras.' },
            { id: 'dev_architect', name: 'Arquitectura de Software', icon: '💻', enabled: true, prompt: 'Estructura proyectos modulares, APIs limpias y stacks modernos.' }
        ]);
    });

    app.post(['/api/hermes/skills/presets', '/api/openclaw/skills/presets'], (req, res) => {
        const db = readDB();
        db.hermesSkillPresets = req.body.presets || [];
        writeDB(db);
        res.json({ success: true, presets: db.hermesSkillPresets });
    });

    // ─── RAG Brain Endpoints ──────────────────────────────────────

    app.post('/api/brain/query', async (req, res) => {
        try {
            const { question, topK, namespace } = req.body;
            if (!question) return res.status(400).json({ error: 'Missing "question" field' });
            const result = await EmbeddedRAGEngine.query(question, topK || 5, namespace);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/brain/index', async (req, res) => {
        try {
            const result = await EmbeddedRAGEngine.indexAllData();
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/brain/status', async (req, res) => {
        try {
            res.json(await EmbeddedRAGEngine.getStatus());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/brain/upload', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            const namespace = req.body.namespace || 'default';
            let content = req.body.content || '';
            let title = req.body.title || 'Sin título';
            const category = req.body.category || 'document';

            if (file) {
                // multer entrega el nombre en latin1: recuperar acentos/ñ
                title = Buffer.from(file.originalname, 'latin1').toString('utf8');
                if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
                    const pdfData = await extractPdfText(fs.readFileSync(file.path));
                    content = pdfData.text;
                } else {
                    content = fs.readFileSync(file.path, 'utf-8');
                }
                fs.unlinkSync(file.path);
            }

            content = String(content || '').split(String.fromCharCode(0)).join('').trim();
            if (!content) return res.status(400).json({ error: 'No se pudo extraer texto del archivo (¿PDF escaneado o vacío?)' });
            if (content.length > 300000) content = content.slice(0, 300000);

            const docId = `custom-${Date.now()}`;
            const result = await EmbeddedRAGEngine.indexCustomDocument(docId, title, content, category, {}, namespace);
            res.status(201).json({ ...result, success: true, documentId: docId, title, characters: content.length });
        } catch (err) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/brain/sync-vault', async (req, res) => {
        try {
            const namespace = req.body.namespace || 'default';
            // Sin ruta: indexa el BrainVault del repo (lo que existe también en Render)
            const paths = req.body.path ? [req.body.path] : [path.join(rootDir, 'BrainVault')];
            let processed = 0;
            for (const p of paths) {
                const result = await EmbeddedRAGEngine.indexObsidianVault(p, namespace);
                if (!result.success) return res.status(400).json({ success: false, error: `${result.error}: ${p}`, processed });
                processed += result.count;
            }
            res.json({ success: true, processed, count: processed, paths });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/brain/documents', (req, res) => {
        const db = readDB();
        res.json(db.ragDocuments || []);
    });

    app.delete('/api/brain/documents/:id', (req, res) => {
        const db = readDB();
        if (db.ragDocuments) {
            db.ragDocuments = db.ragDocuments.filter(d => d.id !== req.params.id);
            writeDB(db);
        }
        res.json({ success: true });
    });

    return { EmbeddedRAGEngine };
}
