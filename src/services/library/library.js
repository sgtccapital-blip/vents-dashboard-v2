// Biblioteca de repos de GitHub: se clonan en local, se detectan sus skills (SKILL.md) y agentes,
// se indexan en el RAG y se pueden instalar en ~/.claude o en cualquier proyecto.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

export const INTEREST = ['por_probar', 'usando', 'favorito', 'archivado'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.venv', 'venv']);
const README_MAX = 30000;
const SKILL_MAX = 24000;

/** "https://github.com/owner/repo/tree/main/x", "git@github.com:owner/repo.git", "owner/repo" → { owner, name, subpath } */
export function parseGithubUrl(input) {
    const s = String(input || '').trim();
    let m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/(?:tree|blob)\/[^/]+\/?(.*))?\/?(?:[?#].*)?$/i)
        || s.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/i)
        || s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)$/);
    if (!m) return null;
    const [, owner, name, subpath = ''] = m;
    if (owner === '.' || owner === '..' || name === '.' || name === '..') return null;
    return { owner, name, id: `${owner}/${name}`, subpath: subpath.replace(/\/$/, '') };
}

/** Frontmatter YAML simple (clave: valor, con valores entre comillas o en bloque >/|). */
export function parseFrontmatter(text) {
    const m = String(text).match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { data: {}, body: String(text) };
    const data = {};
    const lines = m[1].split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!kv) continue;
        let [, key, value] = kv;
        if (/^[>|][-+]?$/.test(value.trim())) {
            const block = [];
            while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1] === '')) block.push(lines[++i].trim());
            value = block.join(value.trim().startsWith('>') ? ' ' : '\n').trim();
        }
        data[key] = value.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    }
    return { data, body: String(text).slice(m[0].length) };
}

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '').slice(0, 80) || 'skill';

function walk(dir, visit, depth = 0, maxDepth = 7) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
        if (e.isSymbolicLink()) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(full, visit, depth + 1, maxDepth); } else visit(full, e.name);
    }
}

function countFiles(dir) {
    let n = 0;
    walk(dir, () => { n++; }, 0, 5);
    return n;
}

/** Busca skills (carpetas con SKILL.md) y agentes (.md con name+description dentro de una carpeta "agents"). */
export function scanRepo(repoDir) {
    const skills = [];
    const agents = [];
    walk(repoDir, (full, name) => {
        const rel = path.relative(repoDir, full);
        if (name.toLowerCase() === 'skill.md') {
            const { data, body } = parseFrontmatter(fs.readFileSync(full, 'utf8'));
            const dir = path.dirname(rel);
            const skillName = data.name || path.basename(dir === '.' ? repoDir : dir);
            skills.push({ kind: 'skill', name: skillName, slug: slug(skillName), description: data.description || body.trim().split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim() || '', path: rel, dir, files: countFiles(path.dirname(full)) });
        } else if (/\.md$/i.test(name) && /(^|\/)agents\//.test(rel.split(path.sep).join('/'))) {
            const { data } = parseFrontmatter(fs.readFileSync(full, 'utf8').slice(0, 8000));
            if (data.name && data.description) agents.push({ kind: 'agent', name: data.name, slug: slug(data.name), description: data.description, path: rel, dir: path.dirname(rel), files: 1 });
        }
    });
    const byPath = (a, b) => a.path.localeCompare(b.path);
    return { skills: skills.sort(byPath), agents: agents.sort(byPath) };
}

function readReadme(repoDir) {
    const f = fs.readdirSync(repoDir).find(n => /^readme(\.(md|markdown|txt|rst))?$/i.test(n));
    return f ? fs.readFileSync(path.join(repoDir, f), 'utf8').slice(0, README_MAX) : '';
}

function atomicWriteJson(file, data) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
}

/**
 * @param opts { dataDir, projectDir, knowledge?, git?, fetchMeta?, log? }
 *   git(args, opts) y fetchMeta(owner, name) se pueden sustituir en pruebas.
 */
export function createLibrary({ dataDir, projectDir, knowledge = null, git, fetchMeta, log = console }) {
    const reposDir = path.join(dataDir, 'repos');
    fs.mkdirSync(reposDir, { recursive: true });
    const stateFile = path.join(dataDir, 'library.json');
    let state = { repos: {}, installTargets: [] };
    if (fs.existsSync(stateFile)) {
        try { state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) }; } catch (e) { log.error('[Library] library.json ilegible:', e.message); }
    }
    // Un clonado que quedó a medias al apagar el servidor se reintenta.
    const interrupted = Object.values(state.repos).filter(r => r.status === 'cloning');
    const save = () => atomicWriteJson(stateFile, state);

    const runGit = git || ((args, opts = {}) => run('git', args, { timeout: 5 * 60 * 1000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, ...opts }));
    const getMeta = fetchMeta || defaultFetchMeta;
    const repoDir = id => path.join(reposDir, id.replace('/', '__'));
    const busy = new Set();

    // ─── RAG ───
    function reindex() {
        if (!knowledge?.indexSource) return null;
        const docs = [];
        for (const r of Object.values(state.repos)) {
            if (r.status !== 'ready') continue;
            const dir = repoDir(r.id);
            const items = [...(r.skills || []), ...(r.agents || [])];
            const meta = { repo: r.id, url: r.url, tags: r.tags || [], interest: r.interest, projectIds: r.projectIds || [], date: r.syncedAt };
            let readme = '';
            try { readme = readReadme(dir); } catch { /* repo borrado a mano */ }
            docs.push({
                id: `repo:${r.id}`, kind: 'repo', title: `Repo · ${r.id}`, meta,
                text: [
                    `# ${r.id}`, r.description, r.url,
                    r.topics?.length ? `Temas: ${r.topics.join(', ')}` : '', r.language ? `Lenguaje: ${r.language}` : '',
                    r.tags?.length ? `Etiquetas: ${r.tags.join(', ')}` : '', r.notes ? `## Notas del usuario\n${r.notes}` : '',
                    items.length ? `## Skills y agentes\n${items.map(s => `- ${s.kind} ${s.name}: ${s.description}`).join('\n')}` : '',
                    readme ? `## README\n${readme}` : '',
                ].filter(Boolean).join('\n\n'),
            });
            for (const s of items) {
                let content = '';
                try { content = fs.readFileSync(path.join(dir, s.path), 'utf8').slice(0, SKILL_MAX); } catch { continue; }
                docs.push({ id: `${s.kind}:${r.id}:${s.path}`, kind: s.kind, title: `${s.kind === 'skill' ? 'Skill' : 'Agente'} · ${s.name} (${r.id})`, text: `${s.description}\n\n${content}`, meta: { ...meta, itemPath: s.path, name: s.name } });
            }
        }
        try { return knowledge.indexSource('library', docs); } catch (e) { log.warn('[Library] Índice:', e.message); return null; }
    }

    // ─── Clonar / actualizar ───
    async function sync(id) {
        const r = state.repos[id];
        if (!r || busy.has(id)) return;
        busy.add(id);
        const dir = repoDir(id);
        r.status = r.syncedAt ? 'updating' : 'cloning';
        r.error = '';
        save();
        try {
            if (fs.existsSync(path.join(dir, '.git'))) {
                await runGit(['-C', dir, 'fetch', '--depth', '1', 'origin', 'HEAD']);
                await runGit(['-C', dir, 'reset', '--hard', 'FETCH_HEAD']);
            } else {
                fs.rmSync(dir, { recursive: true, force: true });
                try {
                    await runGit(['clone', '--depth', '1', '--single-branch', `https://github.com/${id}.git`, dir]);
                } catch (e) {
                    // Repos privados: gh usa la sesión de GitHub CLI.
                    fs.rmSync(dir, { recursive: true, force: true });
                    await run('gh', ['repo', 'clone', id, dir, '--', '--depth', '1', '--single-branch'], { timeout: 5 * 60 * 1000 }).catch(() => { throw e; });
                }
            }
            const { stdout } = await runGit(['-C', dir, 'rev-parse', 'HEAD']);
            const { skills, agents } = scanRepo(dir);
            const meta = await getMeta(r.owner, r.name).catch(e => { log.warn('[Library] Metadatos de GitHub:', e.message); return null; });
            if (meta) Object.assign(r, meta);
            Object.assign(r, { status: 'ready', commit: String(stdout).trim().slice(0, 12), skills, agents, syncedAt: new Date().toISOString(), hasReadme: !!readReadme(dir) });
        } catch (e) {
            r.status = 'error';
            r.error = String(e.stderr || e.message || e).split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 300);
        } finally {
            busy.delete(id);
            save();
            reindex();
        }
    }

    function addRepo({ url, notes = '', tags = [], interest = 'por_probar', projectIds = [], addedBy = 'usuario' }) {
        const parsed = parseGithubUrl(url);
        if (!parsed) { const err = new Error('No reconozco ese enlace. Usa https://github.com/dueño/repo'); err.status = 400; throw err; }
        const existing = Object.values(state.repos).find(r => r.id.toLowerCase() === parsed.id.toLowerCase());
        if (existing) {
            const err = new Error(`${existing.id} ya está en la biblioteca`); err.status = 409; err.repo = existing; throw err;
        }
        const r = {
            id: parsed.id, owner: parsed.owner, name: parsed.name, url: `https://github.com/${parsed.id}`, focusPath: parsed.subpath,
            description: '', stars: null, topics: [], language: '', license: '', homepage: '',
            notes: String(notes).slice(0, 4000), tags: cleanTags(tags), interest: INTEREST.includes(interest) ? interest : 'por_probar',
            projectIds: Array.isArray(projectIds) ? projectIds.map(String) : [], addedBy, addedAt: new Date().toISOString(),
            status: 'cloning', error: '', skills: [], agents: [],
        };
        state.repos[r.id] = r;
        save();
        sync(r.id);
        return r;
    }

    function updateRepo(id, patch = {}) {
        const r = state.repos[id];
        if (!r) return null;
        if (patch.notes !== undefined) r.notes = String(patch.notes).slice(0, 4000);
        if (patch.tags !== undefined) r.tags = cleanTags(patch.tags);
        if (patch.interest !== undefined && INTEREST.includes(patch.interest)) r.interest = patch.interest;
        if (patch.projectIds !== undefined && Array.isArray(patch.projectIds)) r.projectIds = patch.projectIds.map(String);
        save();
        reindex();
        return r;
    }

    function removeRepo(id) {
        if (!state.repos[id]) return false;
        delete state.repos[id];
        fs.rmSync(repoDir(id), { recursive: true, force: true });
        save();
        reindex();
        return true;
    }

    // ─── Instalación ───
    const globalClaude = path.join(os.homedir(), '.claude');
    function targetRoot(target, customPath) {
        if (target === 'global') return globalClaude;
        if (target === 'project') return path.join(projectDir, '.claude');
        const p = String(customPath || '').trim().replace(/^~(?=$|\/)/, os.homedir());
        if (!path.isAbsolute(p)) { const err = new Error('Indica la ruta absoluta de la carpeta del proyecto'); err.status = 400; throw err; }
        if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) { const err = new Error(`No existe la carpeta ${p}`); err.status = 400; throw err; }
        return path.join(p, '.claude');
    }

    function findItem(repoId, itemPath) {
        const r = state.repos[repoId];
        const item = r && [...(r.skills || []), ...(r.agents || [])].find(s => s.path === itemPath);
        if (!item) { const err = new Error('Skill no encontrada'); err.status = 404; throw err; }
        return { r, item };
    }

    function destinationOf(item, root) {
        return item.kind === 'skill' ? path.join(root, 'skills', item.slug) : path.join(root, 'agents', `${item.slug}.md`);
    }

    function install({ repoId, itemPath, target = 'project', path: customPath, overwrite = false }) {
        const { item } = findItem(repoId, itemPath);
        const root = targetRoot(target, customPath);
        const src = path.join(repoDir(repoId), item.kind === 'skill' ? item.dir : item.path);
        const dest = destinationOf(item, root);
        if (!path.resolve(src).startsWith(path.resolve(repoDir(repoId)))) { const err = new Error('Ruta inválida'); err.status = 400; throw err; }
        if (fs.existsSync(dest) && !overwrite) { const err = new Error(`Ya existe ${dest}`); err.status = 409; err.dest = dest; throw err; }
        fs.rmSync(dest, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(src, dest, { recursive: true, filter: s => !s.split(path.sep).some(part => SKIP_DIRS.has(part)) });
        if (target === 'path') {
            const p = path.dirname(root);
            state.installTargets = [p, ...(state.installTargets || []).filter(x => x !== p)].slice(0, 8);
            save();
        }
        return { dest, kind: item.kind, name: item.name };
    }

    /** Dónde está ya instalada cada skill (global, este proyecto, rutas usadas). */
    function installedIn(item) {
        const places = [['global', globalClaude], ['project', path.join(projectDir, '.claude')], ...(state.installTargets || []).map(p => [p, path.join(p, '.claude')])];
        return places.filter(([, root]) => fs.existsSync(destinationOf(item, root))).map(([k]) => k);
    }

    // ─── Lectura ───
    function list() {
        return Object.values(state.repos)
            .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))
            .map(r => ({ ...r, localPath: repoDir(r.id), skills: (r.skills || []).map(s => ({ ...s, installed: installedIn(s) })), agents: (r.agents || []).map(s => ({ ...s, installed: installedIn(s) })) }));
    }

    function getItem(repoId, itemPath) {
        const { r, item } = findItem(repoId, itemPath);
        const full = path.join(repoDir(repoId), item.path);
        const dir = item.kind === 'skill' ? path.dirname(full) : null;
        const files = [];
        if (dir) walk(dir, f => files.push(path.relative(dir, f)), 0, 5);
        return { repo: r.id, ...item, localPath: item.kind === 'skill' ? dir : full, content: fs.readFileSync(full, 'utf8'), files: files.sort().slice(0, 200), installed: installedIn(item) };
    }

    function getReadme(id) {
        if (!state.repos[id]) return null;
        try { return readReadme(repoDir(id)); } catch { return ''; }
    }

    function stats() {
        const repos = Object.values(state.repos);
        return { repos: repos.length, skills: repos.reduce((n, r) => n + (r.skills?.length || 0), 0), agents: repos.reduce((n, r) => n + (r.agents?.length || 0), 0), installTargets: state.installTargets || [], projectDir, globalDir: globalClaude };
    }

    for (const r of interrupted) sync(r.id);

    return { addRepo, updateRepo, removeRepo, sync, syncAll: () => Promise.all(Object.keys(state.repos).map(id => sync(id))), list, getItem, getReadme, install, stats, reindex, get: id => state.repos[id] || null, repoDir };
}

function cleanTags(tags) {
    const arr = Array.isArray(tags) ? tags : String(tags || '').split(',');
    return [...new Set(arr.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

let ghToken;
async function githubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    if (ghToken === undefined) {
        try { ghToken = (await run('gh', ['auth', 'token'], { timeout: 5000 })).stdout.trim(); } catch { ghToken = ''; }
    }
    return ghToken;
}

async function defaultFetchMeta(owner, name) {
    const token = await githubToken();
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'command-center-library', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const d = await res.json();
    return { description: d.description || '', stars: d.stargazers_count ?? null, topics: d.topics || [], language: d.language || '', license: d.license?.spdx_id || '', homepage: d.homepage || '', defaultBranch: d.default_branch || '', private: !!d.private, pushedAt: d.pushed_at || null };
}
