// Rutas de la biblioteca de repos y skills (Agent & RAG → Marketplace de Skills).
import { createLibrary } from './library.js';

export function registerLibrary(app, { dataDir, projectDir, knowledge, cron }) {
    const lib = createLibrary({ dataDir, projectDir, knowledge });

    const wrap = fn => async (req, res) => {
        try { await fn(req, res); } catch (err) { res.status(err.status || 500).json({ error: err.message, ...(err.repo ? { repo: err.repo } : {}), ...(err.dest ? { dest: err.dest } : {}) }); }
    };
    // El id del repo lleva "/" (dueño/repo): viaja como query ?id=
    const repoId = req => String(req.query.id || req.body?.id || '');

    app.get('/api/library', (req, res) => res.json({ repos: lib.list(), stats: lib.stats() }));

    app.post('/api/library/repos', wrap(async (req, res) => res.status(201).json(lib.addRepo(req.body || {}))));

    app.patch('/api/library/repo', wrap(async (req, res) => {
        const r = lib.updateRepo(repoId(req), req.body || {});
        if (!r) return res.status(404).json({ error: 'Repo no encontrado' });
        res.json(r);
    }));

    app.delete('/api/library/repo', wrap(async (req, res) => {
        if (!lib.removeRepo(repoId(req))) return res.status(404).json({ error: 'Repo no encontrado' });
        res.json({ ok: true });
    }));

    app.post('/api/library/repo/sync', wrap(async (req, res) => {
        const id = repoId(req);
        if (!lib.get(id)) return res.status(404).json({ error: 'Repo no encontrado' });
        lib.sync(id);
        res.json({ ok: true });
    }));

    app.get('/api/library/repo/readme', (req, res) => {
        const readme = lib.getReadme(repoId(req));
        if (readme === null) return res.status(404).json({ error: 'Repo no encontrado' });
        res.json({ readme });
    });

    app.get('/api/library/item', wrap(async (req, res) => res.json(lib.getItem(repoId(req), String(req.query.path || '')))));

    app.post('/api/library/install', wrap(async (req, res) => {
        const { id, path: itemPath, target, targetPath, overwrite } = req.body || {};
        res.json(lib.install({ repoId: id, itemPath, target, path: targetPath, overwrite: !!overwrite }));
    }));

    // Al arrancar, el índice del RAG se pone al día; cada noche se actualizan los repos.
    setTimeout(() => lib.reindex(), 5000);
    cron?.schedule('30 4 * * *', () => lib.syncAll().catch(e => console.warn('[Library] Actualización nocturna:', e.message)));

    return lib;
}
