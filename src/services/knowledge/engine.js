// Motor de conocimiento del Command Center.
// Junta en un solo índice: conversaciones de ChatGPT (resumidas por IA), memoria por proyecto,
// perfil de trabajo del usuario, datos del dashboard y memorias que guardan los agentes.
// Todo se guarda en <dataDir>/ (fuera de git y de db.json).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { KnowledgeStore } from './store.js';
import { QuotaError } from './embeddings.js';
import { chunkText, hash, fold } from './text.js';
import { readExportFile, normalizeConversation, transcriptText, digestInput, isChatGptExportZip } from './chatgptExport.js';
import {
    DigestSchema, DIGEST_SYSTEM, digestPrompt, digestToText,
    SynthesisSchema, SYNTHESIS_SYSTEM, synthesisPrompt, synthesisToText,
    ProfileSchema, PROFILE_SYSTEM, profileToText,
} from './digest.js';

const CONCURRENCY = 3;
const PROFILE_EVERY = 25; // rehacer el perfil cada N conversaciones nuevas resumidas
const MAX_DIGEST_ATTEMPTS = 3;

const isQuotaError = err => err instanceof QuotaError || /\b429\b|quota|RESOURCE_EXHAUSTED/i.test(err.message);

export const projectKeyOf = d => (d.projectId ? `id:${d.projectId}` : d.project ? `name:${fold(d.project).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : null);

function atomicWriteJson(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
}

export function createKnowledgeEngine({ dataDir, readDB, getGeminiKey, generateStructured, availableProviders, embedder, log = console }) {
    fs.mkdirSync(dataDir, { recursive: true });
    const rawDir = path.join(dataDir, 'raw', 'chatgpt');
    fs.mkdirSync(rawDir, { recursive: true });
    const stateFile = path.join(dataDir, 'state.json');
    const store = new KnowledgeStore(path.join(dataDir, 'index'), { dims: embedder.dims, model: embedder.model });

    const defaultWatchDir = process.env.RENDER ? '' : path.join(os.homedir(), 'Downloads');
    let state = {
        conversations: {}, imports: [], projects: {}, profile: null,
        config: { watchEnabled: !process.env.RENDER, watchDir: process.env.CHATGPT_EXPORT_DIR || defaultWatchDir },
        watchSeen: {}, digestsSinceProfile: 0,
        staleProjects: {}, // memorias de proyecto por rehacer (sobreviven a reinicios y a errores de la IA)
    };
    if (fs.existsSync(stateFile)) {
        try { state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) }; } catch (e) { log.error('[Knowledge] state.json ilegible:', e.message); }
    }
    // Lo que quedó a medias al apagar el servidor vuelve a la cola.
    for (const c of Object.values(state.conversations)) if (c.status === 'processing') c.status = 'pending';

    let stateTimer = null;
    const saveState = () => {
        clearTimeout(stateTimer);
        stateTimer = setTimeout(() => atomicWriteJson(stateFile, state), 800);
    };
    const flush = () => { clearTimeout(stateTimer); atomicWriteJson(stateFile, state); store.save(); };

    const worker = { running: false, paused: false, blockedReason: '', current: [], processedThisRun: 0, lastRunAt: null, lastError: '' };

    const llmOk = () => availableProviders({ geminiApiKey: getGeminiKey() }).length > 0;
    const llm = (opts) => generateStructured({
        ...opts,
        geminiApiKey: getGeminiKey(),
        provider: getGeminiKey() ? 'gemini' : undefined,
        geminiModel: process.env.KNOWLEDGE_LLM_MODEL || 'gemini-3.8-flash',
    });

    const rawPath = id => path.join(rawDir, `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    const loadRaw = id => JSON.parse(fs.readFileSync(rawPath(id), 'utf8'));

    // ─── Embeddings ───
    // Por tandas de 50, guardando cada una: si la cuota se corta a mitad, lo avanzado no se pierde.
    async function embedMissing(limit = Infinity) {
        if (!embedder.available()) return 0;
        let done = 0;
        while (done < limit) {
            const slice = store.missingVectors(Math.min(20, limit - done));
            if (!slice.length) break;
            const vectors = await embedder.embedDocuments(slice.map(c => store.textForEmbedding(c)));
            slice.forEach((c, i) => store.setVector(c.id, vectors[i]));
            done += slice.length;
        }
        return done;
    }

    // Un fallo de embeddings no debe frenar nada: los trozos quedan buscables por palabras y se vectorizan después.
    // Las llamadas se encadenan para no pedir dos veces los mismos vectores.
    let embedChain = Promise.resolve(0);
    function embedSafe() {
        embedChain = embedChain.then(() => embedMissing()).catch(e => { worker.lastError = `Embeddings: ${e.message.slice(0, 200)}`; return 0; });
        return embedChain;
    }

    /** Indexa el texto completo de una conversación; si no cambió desde la última vez, solo actualiza sus metadatos. */
    function indexTranscript(conv, docMeta) {
        const id = `chatgpt:${conv.id}`;
        const h = hash(`${conv.updateTime}|${conv.messages.length}|${conv.title}`);
        if (store.getDoc(id)?.hash === h) { store.updateDocMeta(id, docMeta); return false; }
        store.upsertDoc({ id, source: 'chatgpt', kind: 'transcript', title: conv.title, hash: h, meta: docMeta }, chunkText(transcriptText(conv.messages)));
        return true;
    }

    // ─── Importación ───
    function importExport(filePath, { origin = 'upload', fileName = path.basename(filePath) } = {}) {
        return importConversations(readExportFile(filePath), { origin, fileName });
    }

    /** Importa conversaciones en formato de ChatGPT (exportación o API web). Solo procesa lo nuevo o cambiado. */
    function importConversations(rawConvs, { origin = 'upload', fileName = '', record = true } = {}) {
        const summary = { at: new Date().toISOString(), origin, file: fileName, total: 0, added: 0, updated: 0, unchanged: 0, empty: 0 };
        for (const rc of rawConvs) {
            const conv = normalizeConversation(rc);
            if (!conv) continue;
            summary.total++;
            if (!conv.messages.length) { summary.empty++; continue; }
            const prev = state.conversations[conv.id];
            if (prev?.status === 'excluded') { summary.unchanged++; continue; }
            const sameTime = prev && Math.abs(new Date(prev.updateTime) - new Date(conv.updateTime)) < 1500;
            if (prev && sameTime && prev.messageCount === conv.messages.length) { summary.unchanged++; continue; }
            fs.writeFileSync(rawPath(conv.id), JSON.stringify(conv));
            // Buscable de inmediato: el resumen de la IA llega después y no hace falta esperarlo.
            indexTranscript(conv, {
                conversationId: conv.id, date: conv.updateTime, namespace: 'chatgpt', chatgptProjectId: conv.chatgptProjectId,
                projectId: prev?.digest?.projectId || '', project: prev?.digest?.project || '', relevance: '', type: '', tags: [],
            });
            state.conversations[conv.id] = {
                ...(prev || {}),
                id: conv.id, title: conv.title, createTime: conv.createTime, updateTime: conv.updateTime,
                chatgptProjectId: conv.chatgptProjectId, archived: conv.archived,
                messageCount: conv.messages.length,
                chars: conv.messages.reduce((n, m) => n + m.text.length, 0),
                status: 'pending', error: '',
            };
            prev ? summary.updated++ : summary.added++;
        }
        if (record) state.imports = [summary, ...state.imports].slice(0, 30);
        flush();
        if (summary.added || summary.updated) { embedSafe(); runWorker(); }
        return summary;
    }

    // ─── Sincronización desde la extensión de Chrome ───
    /** Lo que ya tiene el dashboard: { id: updateTime } para que la extensión pida solo lo cambiado. */
    function syncState() {
        const known = {};
        for (const c of Object.values(state.conversations)) known[c.id] = c.status === 'excluded' ? 'excluded' : c.updateTime;
        return { known, lastSync: state.extensionSync || null };
    }

    function ingestFromExtension(rawConvs, { client = 'extension' } = {}) {
        const summary = importConversations(rawConvs, { origin: 'extension', fileName: client, record: false });
        const prev = state.extensionSync || { totals: { added: 0, updated: 0 } };
        state.extensionSync = {
            at: summary.at, client,
            last: summary,
            totals: { added: prev.totals.added + summary.added, updated: prev.totals.updated + summary.updated },
        };
        saveState();
        return summary;
    }

    function reportExtensionRun(report = {}) {
        state.extensionSync = { ...(state.extensionSync || { totals: { added: 0, updated: 0 } }), at: new Date().toISOString(), run: { ...report, at: new Date().toISOString() } };
        saveState();
        return state.extensionSync;
    }

    function siblingTitles(conv) {
        if (!conv.chatgptProjectId) return [];
        return Object.values(state.conversations)
            .filter(c => c.chatgptProjectId === conv.chatgptProjectId && c.id !== conv.id)
            .map(c => c.title);
    }

    async function processConversation(id, { skipLLM = false } = {}) {
        const meta = state.conversations[id];
        const conv = loadRaw(id);
        const db = readDB();
        const projects = (db.projects || []).map(p => ({ id: p.id, name: p.name, description: p.description }));

        let digest = null;
        let quotaHit = null;
        if (llmOk() && !skipLLM) {
            try {
                const { data, model } = await llm({
                    system: DIGEST_SYSTEM,
                    prompt: digestPrompt({ conv, transcript: digestInput(conv.messages), projects, siblingTitles: siblingTitles(conv) }),
                    schema: DigestSchema,
                });
                digest = data;
                if (digest.projectId && !projects.some(p => p.id === digest.projectId)) digest.projectId = '';
                meta.digestModel = model;
                meta.digestError = '';
            } catch (err) {
                // Si la IA falla, la conversación igual queda buscable en crudo; se reintenta el resumen más tarde.
                // Una cuota agotada no cuenta como intento fallido.
                if (isQuotaError(err)) quotaHit = err;
                else meta.digestAttempts = (meta.digestAttempts || 0) + 1;
                meta.digestError = err.message.slice(0, 300);
                worker.lastError = `${conv.title}: ${meta.digestError}`;
            }
        }

        const docMeta = {
            conversationId: id, date: conv.updateTime, namespace: 'chatgpt',
            projectId: digest?.projectId || '', project: digest?.project || '',
            relevance: digest?.relevance || '', type: digest?.type || '', tags: digest?.tags || [],
            chatgptProjectId: conv.chatgptProjectId,
        };
        store.removeDoc(`chatgpt:${id}:digest`, { save: false });
        if (digest) {
            store.upsertDoc({ id: `chatgpt:${id}:digest`, source: 'chatgpt', kind: 'digest', title: `Resumen · ${conv.title}`, meta: docMeta }, [digestToText(conv, digest)]);
        }
        // Las consultas sueltas solo quedan como resumen; lo útil se indexa completo para encontrar detalles exactos.
        const keepTranscript = !digest || (digest.relevance !== 'baja' && digest.type !== 'trivial');
        if (keepTranscript) indexTranscript(conv, docMeta);
        else store.removeDoc(`chatgpt:${id}`, { save: false });
        embedSafe(); // los vectores se calculan aparte, al ritmo que permite la cuota

        Object.assign(meta, {
            status: digest ? 'done' : 'indexed_raw',
            digest, processedAt: new Date().toISOString(), error: '',
            projectKey: digest ? projectKeyOf(digest) : null,
            transcriptIndexed: keepTranscript,
        });
        if (digest) state.digestsSinceProfile++;
        saveState();
        return { ...meta, quotaHit };
    }

    /** Al arrancar: lo que quedó en cola sin indexar (versiones anteriores) se vuelve buscable ya. */
    function indexPendingTranscripts() {
        let n = 0;
        for (const c of Object.values(state.conversations)) {
            if (c.status !== 'pending' || store.getDoc(`chatgpt:${c.id}`)) continue;
            try {
                const conv = loadRaw(c.id);
                indexTranscript(conv, { conversationId: c.id, date: conv.updateTime, namespace: 'chatgpt', chatgptProjectId: conv.chatgptProjectId, projectId: '', project: '', relevance: '', type: '', tags: [] });
                n++;
            } catch { /* sin archivo crudo: se reprocesa cuando vuelva a llegar */ }
        }
        if (n) embedSafe();
        return n;
    }

    // ─── Memoria por proyecto y perfil ───
    async function refreshProjectMemory(key) {
        const convs = Object.values(state.conversations)
            .filter(c => c.digest && c.projectKey === key && c.digest.relevance !== 'baja')
            .sort((a, b) => String(a.updateTime).localeCompare(String(b.updateTime)));
        if (!convs.length) {
            // Ya no quedan conversaciones relevantes de ese proyecto: se borra su memoria.
            delete state.projects[key];
            store.removeDoc(`project-memory:${key}`);
            saveState();
            return null;
        }
        const db = readDB();
        const projectId = convs.find(c => c.digest.projectId)?.digest.projectId || '';
        const name = (projectId && (db.projects || []).find(p => p.id === projectId)?.name) || convs[convs.length - 1].digest.project;
        const recent = convs.slice(-60).map(c => ({ ...c.digest, title: c.title, date: String(c.updateTime).slice(0, 7) }));
        const { data } = await llm({ system: SYNTHESIS_SYSTEM, prompt: synthesisPrompt(name, recent), schema: SynthesisSchema });
        const text = synthesisToText(name, data);
        state.projects[key] = {
            key, name, projectId, synthesis: data, text, updatedAt: new Date().toISOString(),
            conversationIds: convs.map(c => c.id), conversationCount: convs.length,
            firstDate: convs[0].updateTime, lastDate: convs[convs.length - 1].updateTime,
        };
        store.upsertDoc({ id: `project-memory:${key}`, source: 'chatgpt', kind: 'project_memory', title: `Memoria del proyecto · ${name}`, meta: { projectId, project: name, namespace: 'chatgpt' } }, chunkText(text, 2400, 200));
        embedSafe(); // los vectores se calculan aparte, al ritmo que permite la cuota
        saveState();
        return state.projects[key];
    }

    async function refreshProfile() {
        const digests = Object.values(state.conversations)
            .filter(c => c.digest && c.digest.relevance !== 'baja')
            .sort((a, b) => String(b.updateTime).localeCompare(String(a.updateTime)))
            .slice(0, 200);
        if (!digests.length) return null;
        const reasoning = digests.flatMap(c => c.digest.reasoning).slice(0, 300);
        const projects = Object.values(state.projects).map(p => `- ${p.name} (${p.conversationCount} conversaciones, última ${String(p.lastDate).slice(0, 10)}): ${p.synthesis.overview}`);
        const { data } = await llm({
            system: PROFILE_SYSTEM,
            prompt: `Proyectos:\n${projects.join('\n') || '(aún sin memorias de proyecto)'}\n\nLógica observada en conversaciones recientes:\n${reasoning.map(r => `- ${r}`).join('\n')}\n\nTemas recientes:\n${digests.slice(0, 60).map(c => `- ${c.title}: ${c.digest.summary}`).join('\n')}`,
            schema: ProfileSchema,
        });
        state.profile = { data, text: profileToText(data), updatedAt: new Date().toISOString(), basedOn: digests.length };
        state.digestsSinceProfile = 0;
        store.upsertDoc({ id: 'profile:user', source: 'chatgpt', kind: 'profile', title: 'Perfil de trabajo del usuario', meta: { namespace: 'chatgpt' } }, chunkText(state.profile.text, 2400, 200));
        embedSafe(); // los vectores se calculan aparte, al ritmo que permite la cuota
        saveState();
        return state.profile;
    }

    // ─── Cola en segundo plano ───
    let rerun = false;
    async function runWorker() {
        if (worker.paused) return;
        // Si ya está trabajando, se anota otra vuelta para lo que llegó mientras tanto.
        if (worker.running) { rerun = true; return; }
        rerun = false;
        worker.running = true;
        worker.blockedReason = '';
        worker.processedThisRun = 0;
        worker.lastRunAt = new Date().toISOString();
        const touched = new Set(Object.keys(state.staleProjects || {}));
        try {
            // Primero lo más reciente: es lo que más probablemente sigue vivo.
            const queue = Object.values(state.conversations)
                .filter(c => c.status === 'pending' || (c.status === 'indexed_raw' && llmOk() && (c.digestAttempts || 0) < MAX_DIGEST_ATTEMPTS))
                .sort((a, b) => String(b.updateTime).localeCompare(String(a.updateTime)))
                .map(c => c.id);
            const next = async () => {
                while (queue.length && !worker.paused) {
                    const id = queue.shift();
                    const meta = state.conversations[id];
                    // Sin cuota, lo que ya está indexado en crudo espera a la próxima vuelta (no se reindexa).
                    if (worker.blockedReason && meta.status === 'indexed_raw') continue;
                    const prevKey = meta.projectKey;
                    meta.status = 'processing';
                    worker.current.push(meta.title);
                    try {
                        // Sin cuota de IA se sigue indexando en crudo: los agentes ya pueden encontrarlo y el resumen llega después.
                        const done = await processConversation(id, { skipLLM: !!worker.blockedReason });
                        if (done.quotaHit && !worker.blockedReason) {
                            worker.blockedReason = `Cuota de la IA agotada: las conversaciones se indexan sin resumen y se resumen solas más tarde (${done.quotaHit.message.slice(0, 160)})`;
                        }
                        worker.processedThisRun++;
                        for (const key of [done.projectKey, prevKey]) {
                            if (!key) continue;
                            touched.add(key);
                            state.staleProjects[key] = true;
                        }
                    } catch (err) {
                        if (isQuotaError(err)) {
                            meta.status = 'pending';
                            worker.blockedReason = `Cuota de la IA agotada, se reintenta solo en 10 minutos (${err.message.slice(0, 160)})`;
                        } else {
                            meta.status = 'error';
                            meta.error = err.message.slice(0, 300);
                            worker.lastError = `${meta.title}: ${meta.error}`;
                        }
                        saveState();
                    } finally {
                        worker.current = worker.current.filter(t => t !== meta.title);
                    }
                }
            };
            await Promise.all(Array.from({ length: CONCURRENCY }, next));

            if (llmOk() && !worker.blockedReason) {
                for (const key of touched) {
                    try {
                        await refreshProjectMemory(key);
                        delete state.staleProjects[key];
                    } catch (e) {
                        worker.lastError = `Memoria ${key}: ${e.message.slice(0, 200)}`;
                    }
                }
                const hasDigests = Object.values(state.conversations).some(c => c.digest);
                if (hasDigests && (!state.profile || state.digestsSinceProfile >= PROFILE_EVERY)) {
                    try { await refreshProfile(); } catch (e) { worker.lastError = `Perfil: ${e.message.slice(0, 200)}`; }
                }
            }
            embedSafe();
        } finally {
            worker.running = false;
            worker.current = [];
            flush();
            if (rerun) setTimeout(runWorker, 0);
        }
    }

    // ─── Datos del dashboard (proyectos, tareas, eventos, notas, documentos subidos) ───
    async function syncDashboard() {
        const db = readDB();
        const docs = (db.ragDocuments || []).concat(db.customDocuments || []);
        const seen = new Set();
        let changed = 0;
        for (const d of docs) {
            const id = `dash:${d.id}`;
            seen.add(id);
            const title = d.title || d.filename || 'Documento';
            const h = hash(`${title}\n${d.content || ''}`);
            if (store.getDoc(id)?.hash === h) continue;
            store.upsertDoc({ id, source: 'dashboard', kind: d.category || 'document', title, hash: h, meta: { namespace: d.namespace || 'default', legacyId: d.id, date: d.updatedAt || d.addedAt } }, chunkText(d.content || title));
            changed++;
        }
        let removed = 0;
        for (const doc of store.listDocs(x => x.source === 'dashboard')) {
            if (!seen.has(doc.id)) { store.removeDoc(doc.id); removed++; }
        }
        if (changed || removed) store.scheduleSave();
        embedSafe();
        return { changed, removed, pendingVectors: store.missingVectors().length, total: docs.length };
    }

    // ─── Memorias que guardan agentes o el usuario ───
    async function saveMemory({ title, content, source = 'agent', agent = '', projectId = '', tags = [] }) {
        if (!content) throw new Error('Falta content');
        const id = `memory:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const doc = store.upsertDoc({ id, source: 'memory', kind: 'memory', title: title || content.slice(0, 80), meta: { origin: source, agent, projectId, tags, namespace: 'memory', date: new Date().toISOString() } }, chunkText(content));
        embedSafe(); // ya es buscable por palabras; el vector llega en segundo plano
        return doc;
    }

    // ─── Búsqueda ───
    async function search({ query, topK = 8, source, kind, projectId, namespace } = {}) {
        let queryVector = null;
        if (query && embedder.available() && store.stats().embedded) {
            try { queryVector = await embedder.embedQuery(query); } catch (e) { log.warn('[Knowledge] Búsqueda solo por palabras:', e.message); }
        }
        const results = store.search({ query, queryVector, topK, filter: { source, kind, projectId, namespace } });
        return { mode: queryVector ? 'hybrid' : 'keyword', results };
    }

    // ─── Vigilancia de la carpeta de descargas ───
    function scanWatchDir() {
        const dir = state.config.watchDir;
        if (!state.config.watchEnabled || !dir || !fs.existsSync(dir)) return [];
        const imported = [];
        const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
        for (const name of fs.readdirSync(dir)) {
            if (!/\.zip$/i.test(name)) continue;
            const full = path.join(dir, name);
            let st;
            try { st = fs.statSync(full); } catch { continue; }
            if (!st.isFile() || st.mtimeMs < monthAgo) continue;
            const key = `${name}:${st.size}:${Math.round(st.mtimeMs)}`;
            if (state.watchSeen[key]) continue;
            state.watchSeen[key] = new Date().toISOString();
            if (!isChatGptExportZip(full)) continue;
            try {
                imported.push(importExport(full, { origin: 'watch', fileName: name }));
                log.log(`[Knowledge] Exportación de ChatGPT detectada e importada: ${name}`);
            } catch (e) {
                log.error(`[Knowledge] No se pudo importar ${name}:`, e.message);
            }
        }
        saveState();
        return imported;
    }

    // ─── Consultas para la UI y los agentes ───
    function status() {
        const convs = Object.values(state.conversations);
        const count = pred => convs.filter(pred).length;
        return {
            chatgpt: {
                total: convs.length,
                done: count(c => c.status === 'done'),
                pending: count(c => c.status === 'pending' || c.status === 'processing'),
                indexedRaw: count(c => c.status === 'indexed_raw'),
                digestFailed: count(c => c.status === 'indexed_raw' && c.digestError),
                errors: count(c => c.status === 'error'),
                excluded: count(c => c.status === 'excluded'),
                byRelevance: { alta: count(c => c.digest?.relevance === 'alta'), media: count(c => c.digest?.relevance === 'media'), baja: count(c => c.digest?.relevance === 'baja') },
                lastImport: state.imports[0] || null,
                extension: state.extensionSync
                    ? { ...state.extensionSync, stale: Date.now() - new Date(state.extensionSync.at).getTime() > 2 * 24 * 3600 * 1000 }
                    : null,
                imports: state.imports.slice(0, 5),
            },
            projects: Object.values(state.projects).length,
            profileUpdatedAt: state.profile?.updatedAt || null,
            worker: { ...worker },
            store: store.stats(),
            ai: { llm: llmOk(), embeddings: embedder.available(), embedModel: embedder.model },
            config: state.config,
        };
    }

    function listConversations({ q = '', projectKey, relevance, status: st, limit = 50, offset = 0 } = {}) {
        const fq = fold(q);
        let rows = Object.values(state.conversations).filter(c => c.status !== 'excluded' || st === 'excluded');
        if (fq) rows = rows.filter(c => fold(`${c.title} ${c.digest?.summary || ''} ${c.digest?.project || ''} ${(c.digest?.tags || []).join(' ')}`).includes(fq));
        if (projectKey) rows = rows.filter(c => c.projectKey === projectKey);
        if (relevance) rows = rows.filter(c => c.digest?.relevance === relevance);
        if (st) rows = rows.filter(c => c.status === st);
        rows.sort((a, b) => String(b.updateTime).localeCompare(String(a.updateTime)));
        return {
            total: rows.length,
            items: rows.slice(offset, offset + limit).map(c => ({
                id: c.id, title: c.title, updateTime: c.updateTime, createTime: c.createTime, messageCount: c.messageCount,
                status: c.status, error: c.error, projectKey: c.projectKey, chatgptProjectId: c.chatgptProjectId,
                project: c.digest?.project || '', projectId: c.digest?.projectId || '', relevance: c.digest?.relevance || '',
                type: c.digest?.type || '', summary: c.digest?.summary || '', tags: c.digest?.tags || [],
            })),
        };
    }

    function getConversation(id) {
        const meta = state.conversations[id];
        if (!meta) return null;
        let messages = [];
        try { messages = loadRaw(id).messages; } catch { /* importada pero el archivo crudo se borró */ }
        return { ...meta, messages };
    }

    /** Saca una conversación del RAG y evita que se vuelva a importar. */
    function excludeConversation(id) {
        const meta = state.conversations[id];
        if (!meta) return false;
        store.removeDoc(`chatgpt:${id}`);
        store.removeDoc(`chatgpt:${id}:digest`);
        try { fs.unlinkSync(rawPath(id)); } catch { /* ya no estaba */ }
        if (meta.projectKey) state.staleProjects[meta.projectKey] = true;
        state.conversations[id] = { id, title: meta.title, updateTime: meta.updateTime, status: 'excluded', projectKey: null };
        flush();
        return true;
    }

    function retryErrors() {
        for (const c of Object.values(state.conversations)) {
            if (c.status === 'error') { c.status = 'pending'; c.error = ''; }
            if (c.status === 'indexed_raw') c.digestAttempts = 0;
        }
        saveState();
        runWorker();
    }

    function setConfig(patch) {
        if (typeof patch.watchEnabled === 'boolean') state.config.watchEnabled = patch.watchEnabled;
        if (typeof patch.watchDir === 'string') state.config.watchDir = patch.watchDir.replace(/^~(?=\/|$)/, os.homedir());
        flush();
        return state.config;
    }

    return {
        store,
        /** Espera a que terminen los vectores pendientes (útil en pruebas y scripts). */
        waitForEmbeddings: () => embedSafe(),
        importExport, importConversations, indexPendingTranscripts, syncState, ingestFromExtension, reportExtensionRun, runWorker, syncDashboard, saveMemory, search, scanWatchDir, embedMissing,
        refreshProjectMemory, refreshProfile,
        status, listConversations, getConversation, excludeConversation, retryErrors, setConfig,
        pause() { worker.paused = true; },
        resume() { worker.paused = false; worker.blockedReason = ''; runWorker(); },
        /** Reintento periódico: respeta una pausa manual, pero vuelve a probar tras un bloqueo por cuota. */
        tick() { if (!worker.paused) { worker.blockedReason = ''; runWorker(); } },
        projects: () => Object.values(state.projects).sort((a, b) => String(b.lastDate).localeCompare(String(a.lastDate))),
        profile: () => state.profile,
        flush,
    };
}
