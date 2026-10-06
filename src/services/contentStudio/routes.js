// Rutas del estudio de contenido: Drive → biblioteca raw → ideas → desarrollo → paquete de producción.
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { parseFolderId, createDriveClient, driveCredentialsFromEnv, crawlFolder } from './drive.js';
import { buildAliases, toAsset, mergeAssets, groupNights } from './rawLibrary.js';
import { generateStructured, availableProviders } from './llm.js';
import { IdeaSchema, DevelopmentSchema, SYSTEM_PROMPT, ideasPrompt, developPrompt } from './ideaEngine.js';
import { renderBrief, slugify } from './brief.js';

const MAX_IMAGES = 12;

export function registerContentStudio(app, { readDB, writeDB, loadBrands, accountSlug, contentDnaPath, rootDir, cron }) {
    const brandForAccount = accountId => {
        try { return loadBrands().find(b => b.accountId === accountId) || null; } catch { return null; }
    };
    const geminiKey = () => readDB().openclawConfig?.geminiApiKey || '';
    const driveClient = () => createDriveClient(driveCredentialsFromEnv());
    const studioConfig = db => ({ folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '', ...(db.studioConfig || {}) });

    async function thumbnailsFor(assets) {
        let client;
        try { client = driveClient(); } catch { return []; }
        const out = [];
        for (const a of assets.filter(x => x.thumbnailLink).slice(0, MAX_IMAGES)) {
            try {
                const res = await client.fetchThumbnail(a.thumbnailLink, 512);
                if (!res.ok) continue;
                const mediaType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
                if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType)) continue;
                out.push({ mediaType, data: Buffer.from(await res.arrayBuffer()).toString('base64') });
            } catch { /* una miniatura que falla no detiene la generación */ }
        }
        return out;
    }

    async function syncDrive() {
        const db = readDB();
        const cfg = studioConfig(db);
        if (!cfg.folderId) throw new Error('Falta la carpeta de Drive: pega el link en Estudio → Configurar');
        const client = driveClient();
        const { root, entries } = await crawlFolder(client, cfg.folderId);
        const aliases = buildAliases(loadBrands());
        const incoming = entries.map(e => toAsset(e, aliases)).filter(a => a.kind !== 'other');
        const fresh = readDB();
        const { assets, added, missing } = mergeAssets(fresh.rawAssets || [], incoming);
        fresh.rawAssets = assets;
        fresh.studioConfig = { ...studioConfig(fresh), folderName: root.name, lastSyncAt: new Date().toISOString(), lastSync: { total: incoming.length, added, missing, mode: client.mode } };
        writeDB(fresh);
        return fresh.studioConfig.lastSync;
    }

    // ─── Configuración y sync ───
    app.get('/api/studio/config', (req, res) => {
        const db = readDB();
        let drive = { configured: false, mode: null, serviceAccountEmail: null, error: null };
        try {
            const c = driveClient();
            drive = { configured: true, mode: c.mode, serviceAccountEmail: c.serviceAccountEmail, error: null };
        } catch (err) {
            drive.error = err.message;
        }
        res.json({ ...studioConfig(db), drive, llm: availableProviders({ geminiApiKey: geminiKey() }), assetCount: (db.rawAssets || []).length });
    });

    app.post('/api/studio/config', (req, res) => {
        const folderId = parseFolderId(req.body?.folderUrl);
        if (!folderId) return res.status(400).json({ error: 'Link de carpeta de Drive no válido' });
        const db = readDB();
        db.studioConfig = { ...(db.studioConfig || {}), folderId, folderUrl: req.body.folderUrl };
        writeDB(db);
        res.json(db.studioConfig);
    });

    app.post('/api/studio/sync', async (req, res) => {
        try {
            res.json(await syncDrive());
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    // ─── Biblioteca ───
    app.get('/api/studio/library', (req, res) => {
        const { accountId } = req.query;
        const all = readDB().rawAssets || [];
        const assets = accountId ? all.filter(a => (a.accountIds || []).includes(accountId)) : all;
        res.json({ nights: groupNights(assets), assets });
    });

    app.patch('/api/studio/assets', (req, res) => {
        const { ids, changes } = req.body || {};
        if (!Array.isArray(ids) || !changes) return res.status(400).json({ error: 'ids y changes requeridos' });
        const allowed = {};
        if (Array.isArray(changes.accountIds)) Object.assign(allowed, { accountIds: changes.accountIds, accountIdsManual: true });
        if (['new', 'used', 'discarded'].includes(changes.status)) allowed.status = changes.status;
        if (typeof changes.notes === 'string') allowed.notes = changes.notes;
        const db = readDB();
        const set = new Set(ids);
        db.rawAssets = (db.rawAssets || []).map(a => (set.has(a.id) ? { ...a, ...allowed } : a));
        writeDB(db);
        res.json({ updated: ids.length });
    });

    app.get('/api/studio/thumb/:driveId', async (req, res) => {
        const asset = (readDB().rawAssets || []).find(a => a.driveId === req.params.driveId);
        if (!asset?.thumbnailLink) return res.status(404).end();
        try {
            const upstream = await driveClient().fetchThumbnail(asset.thumbnailLink, Number(req.query.s) || 480);
            if (!upstream.ok) return res.status(upstream.status).end();
            res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
            res.set('Cache-Control', 'private, max-age=3600');
            res.send(Buffer.from(await upstream.arrayBuffer()));
        } catch {
            res.status(502).end();
        }
    });

    // ─── Ideas desde el raw ───
    app.post('/api/studio/ideas', async (req, res) => {
        const { accountId, assetIds = [], count = 5, direction = '', provider } = req.body || {};
        const db = readDB();
        const account = (db.socialMedia || []).find(a => a.id === accountId);
        if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
        const pool = (db.rawAssets || []).filter(a => a.status !== 'missing' && a.status !== 'discarded');
        const assets = assetIds.length ? pool.filter(a => assetIds.includes(a.id)) : pool.filter(a => (a.accountIds || []).includes(accountId) && a.status === 'new').slice(0, 40);
        if (!assets.length) return res.status(400).json({ error: 'No hay material raw seleccionado para esta cuenta' });
        try {
            const brand = brandForAccount(accountId);
            const images = await thumbnailsFor(assets);
            const out = await generateStructured({
                system: SYSTEM_PROMPT,
                prompt: ideasPrompt({ account, brand, assets, count: Math.min(Number(count) || 5, 10), direction, hasImages: images.length > 0 }),
                schema: IdeaSchema,
                images,
                geminiApiKey: geminiKey(),
                provider,
            });
            const valid = new Set(assets.map(a => a.id));
            const ideas = out.data.ideas.map(i => ({ ...i, assetIds: i.assetIds.filter(id => valid.has(id)) }));
            res.json({ ideas, provider: out.provider, model: out.model, usedImages: images.length });
        } catch (err) {
            res.status(502).json({ error: err.message });
        }
    });

    // ─── Desarrollo: guion de edición completo ───
    app.post('/api/studio/develop/:taskId', async (req, res) => {
        const db = readDB();
        const task = (db.contentTasks || []).find(t => t.id === req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Pieza no encontrada' });
        const account = (db.socialMedia || []).find(a => a.id === task.accountId);
        if (!account) return res.status(400).json({ error: 'La pieza no tiene cuenta' });
        const assets = (db.rawAssets || []).filter(a => (task.rawAssetIds || []).includes(a.id));
        try {
            const brand = brandForAccount(account.id);
            const images = await thumbnailsFor(assets);
            const out = await generateStructured({
                system: SYSTEM_PROMPT,
                prompt: developPrompt({ account, brand, task, assets, hasImages: images.length > 0 }),
                schema: DevelopmentSchema,
                images,
                geminiApiKey: geminiKey(),
                provider: req.body?.provider,
            });
            const d = out.data;
            const fresh = readDB();
            const idx = fresh.contentTasks.findIndex(t => t.id === task.id);
            fresh.contentTasks[idx] = {
                ...fresh.contentTasks[idx],
                development: { ...d, generatedBy: `${out.provider}:${out.model}`, generatedAt: new Date().toISOString() },
                hookVerbal: d.hookVerbal,
                hookVisual: d.hookVisual,
                scriptBody: d.edl.slice().sort((a, b) => a.order - b.order).map(s => `${s.order}. [${s.inSec}-${s.outSec}s] ${s.purpose}${s.overlay ? ` · Texto: "${s.overlay}"` : ''}${s.subtitle ? ` · Voz: "${s.subtitle}"` : ''}`).join('\n'),
                caption: d.caption,
                hashtags: d.hashtags,
                cta: d.cta,
                status: ['idea'].includes(fresh.contentTasks[idx].status) ? 'script' : fresh.contentTasks[idx].status,
            };
            writeDB(fresh);
            res.json(fresh.contentTasks[idx]);
        } catch (err) {
            res.status(502).json({ error: err.message });
        }
    });

    // ─── Ejecutar: paquete de producción ───
    app.post('/api/studio/execute/:taskId', (req, res) => {
        const db = readDB();
        const idx = (db.contentTasks || []).findIndex(t => t.id === req.params.taskId);
        if (idx < 0) return res.status(404).json({ error: 'Pieza no encontrada' });
        const current = db.contentTasks[idx];
        if (!current.development) return res.status(400).json({ error: 'Primero desarrolla la pieza' });
        const task = { ...current, status: ['idea', 'script', 'shooting'].includes(current.status) ? 'editing' : current.status };
        const account = (db.socialMedia || []).find(a => a.id === task.accountId);
        const brand = brandForAccount(task.accountId);
        const slug = accountSlug(account);
        const assets = db.rawAssets || [];
        const markdown = renderBrief({ task, account, brand, assets, accountSlug: slug });
        const file = `${(task.publishDate || new Date().toISOString().slice(0, 10))}-${slugify(task.title)}.md`;
        const dir = path.join(contentDnaPath, slug, 'briefs');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, file), markdown, 'utf-8');

        const used = new Set(task.rawAssetIds || []);
        db.rawAssets = assets.map(a => (used.has(a.id) ? { ...a, status: 'used', usedIn: [...new Set([...(a.usedIn || []), task.id])] } : a));
        db.contentTasks[idx] = { ...task, briefPath: `content-dna/${slug}/briefs/${file}`, executedAt: new Date().toISOString() };
        writeDB(db);
        res.json({ task: db.contentTasks[idx], markdown });
    });

    // ─── Render: máquina de contenido (studio/) ───
    // Un render a la vez; los demás esperan en cola. El estado vive en memoria y el log en disco.
    const jobs = new Map();
    const queue = [];
    let running = null;
    const studioDir = path.join(rootDir, 'studio');
    const projectRoot = path.dirname(contentDnaPath); // las rutas guardadas son relativas a la carpeta que contiene content-dna/

    function startNext() {
        if (running || !queue.length) return;
        const job = queue.shift();
        running = job;
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        const args = ['bin/render-brief.mjs', job.taskId, ...(job.captions ? ['--captions'] : [])];
        const child = spawn(process.execPath, args, {
            cwd: studioDir,
            env: { ...process.env, CONTENT_DNA_PATH: contentDnaPath, DASHBOARD_URL: `http://127.0.0.1:${process.env.PORT || 8090}` },
        });
        const onData = chunk => {
            job.log = (job.log + chunk.toString()).slice(-6000);
            const pct = [...job.log.matchAll(/›\s+(\d+)%/g)].pop();
            if (pct) job.progress = Number(pct[1]);
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('close', code => {
            job.status = code === 0 ? 'done' : 'error';
            job.finishedAt = new Date().toISOString();
            running = null;
            startNext();
        });
    }

    app.post('/api/studio/render/:taskId', (req, res) => {
        const task = (readDB().contentTasks || []).find(t => t.id === req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Pieza no encontrada' });
        if (!task.development?.edl?.length) return res.status(400).json({ error: 'Primero desarrolla la pieza' });
        if (!fs.existsSync(path.join(studioDir, 'node_modules'))) return res.status(500).json({ error: 'La máquina de contenido no está instalada: cd studio && npm install' });
        const existing = jobs.get(task.id);
        if (existing && ['queued', 'running'].includes(existing.status)) return res.json(existing);
        const job = { taskId: task.id, status: 'queued', progress: 0, log: '', captions: Boolean(req.body?.captions), queuedAt: new Date().toISOString() };
        jobs.set(task.id, job);
        queue.push(job);
        startNext();
        res.json(job);
    });

    app.get('/api/studio/render/:taskId', (req, res) => {
        res.json(jobs.get(req.params.taskId) || { status: 'idle' });
    });

    // Archivos generados (renders, portadas, gráficos) para verlos en el dashboard. Solo dentro de content-dna/.
    app.get('/api/studio/media', (req, res) => {
        const rel = String(req.query.path || '');
        const abs = path.resolve(projectRoot, rel);
        if (!abs.startsWith(contentDnaPath + path.sep) || !fs.existsSync(abs)) return res.status(404).end();
        if (req.query.download) res.attachment(path.basename(abs));
        res.sendFile(abs);
    });

    // Sync automático: cada mañana (después de la noche) y a media tarde, hora de Panamá.
    cron.schedule('0 7,15 * * *', async () => {
        const cfg = studioConfig(readDB());
        if (!cfg.folderId) return;
        try {
            const r = await syncDrive();
            console.log(`[Studio] Sync Drive: ${r.total} archivos, ${r.added} nuevos`);
        } catch (err) {
            console.warn('[Studio] Sync Drive falló:', err.message);
        }
    }, { timezone: 'America/Panama' });
}
