// Registro de workspaces/repositorios y acceso tipado a su código.
// Todo opera dentro de la ruta real del workspace (se resuelven `..` y enlaces simbólicos),
// nunca toca .git por dentro ni archivos de credenciales, y las escrituras exigen el hash
// del archivo que el agente vio para no pisar cambios concurrentes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ToolError } from './toolkit.js';
import { redactText, containsSecret } from './redact.js';

const run = promisify(execFile);
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const writeJson = (file, value) => { const tmp = `${file}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2)); fs.renameSync(tmp, file); };
const MAX_READ_BYTES = 256 * 1024;
const MAX_PATCH_BYTES = 5 * 1024 * 1024;
const ID_RE = /^[a-z0-9][a-z0-9_.-]{0,39}$/;

const SECRET_FILE = [
    /^\.env(?!\.(example|sample|template)$)(\..*)?$/i, /\.(pem|key|p12|pfx|keystore|jks|kdbx)$/i, /^id_(rsa|dsa|ecdsa|ed25519)/i,
    /^(credentials|service[-_]?account|client[-_]?secret|secrets?)([-_.].*)?\.(json|ya?ml|txt)$/i, /^\.(npmrc|netrc|pgpass|git-credentials)$/i,
];
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', '.turbo']);

export const isSecretFile = rel => SECRET_FILE.some(re => re.test(path.basename(rel)));
const within = (root, p) => p === root || p.startsWith(root + path.sep);

function globToRegex(glob) {
    let re = '';
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === '*' && glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
        else if (c === '*') re += '[^/]*';
        else if (c === '?') re += '[^/]';
        else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${re}$`);
}

async function git(cwd, args, { input, maxBuffer = 20 * 1024 * 1024, allowFail = false } = {}) {
    try {
        const child = run('git', args, { cwd, maxBuffer, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' } });
        if (input !== undefined) { child.child.stdin.write(input); child.child.stdin.end(); }
        const { stdout } = await child;
        return stdout;
    } catch (err) {
        if (allowFail) return null;
        throw new ToolError('GIT_ERROR', `git ${args[0]} falló: ${redactText(String(err.stderr || err.message).trim().slice(0, 500))}`);
    }
}

function defaultJobs(dir) {
    let scripts = {};
    try { scripts = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts || {}; } catch { return {}; }
    const jobs = {};
    if (scripts.test) jobs.test = { command: 'npm', args: ['test', '--'], timeoutSec: 900, allowArgs: true, allowedFlags: ['--test-name-pattern=', '--test-only'] };
    if (scripts.lint) jobs.lint = { command: 'npm', args: ['run', 'lint', '--'], timeoutSec: 600, allowArgs: true, allowedFlags: [] };
    if (scripts.build) jobs.build = { command: 'npm', args: ['run', 'build'], timeoutSec: 1200, allowArgs: false, artifacts: ['dist'] };
    return jobs;
}

/**
 * @param dir             carpeta del hub (agents-hub/)
 * @param protectedPaths  rutas absolutas que ninguna herramienta de código puede leer ni escribir (db.json, datos del hub…)
 * @param seed            workspaces iniciales si el registro no existe
 */
export function createWorkspaceRegistry({ dir, protectedPaths = [], seed = [] }) {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'workspaces.json');
    const patchDir = path.join(dir, 'patches');
    const worktreeDir = path.join(dir, 'worktrees');
    fs.mkdirSync(patchDir, { recursive: true });
    let list = [];
    if (fs.existsSync(file)) list = JSON.parse(fs.readFileSync(file, 'utf8'));
    else { list = seed.map(s => normalize(s)); writeJson(file, list); }
    const save = () => writeJson(file, list);
    const protectedReal = () => [dir, ...protectedPaths].map(p => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } });

    function normalize(input, prev = {}) {
        const id = String(input.id ?? prev.id ?? '').trim();
        if (!ID_RE.test(id.split(':')[0])) throw Object.assign(new Error('id de workspace inválido (minúsculas, números, - _ .)'), { status: 400 });
        const p = path.resolve(String(input.path ?? prev.path ?? ''));
        if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) throw Object.assign(new Error(`La ruta no existe o no es carpeta: ${p}`), { status: 400 });
        const real = fs.realpathSync(p);
        if (real === '/' || real === fs.realpathSync(os.homedir())) throw Object.assign(new Error('No se puede registrar la raíz ni la carpeta personal completa'), { status: 400 });
        if (within(fs.realpathSync(dir), real)) {
            if (!input.parent && !prev.parent) throw Object.assign(new Error('No se puede registrar la carpeta de datos del hub'), { status: 400 });
        }
        const isGit = fs.existsSync(path.join(real, '.git'));
        return {
            id, name: String(input.name ?? prev.name ?? id).slice(0, 80), path: real, kind: isGit ? 'git' : 'dir',
            enabled: input.enabled ?? prev.enabled ?? true,
            description: String(input.description ?? prev.description ?? '').slice(0, 300),
            deny: (input.deny ?? prev.deny ?? []).map(String).slice(0, 50),
            jobs: input.jobs ?? prev.jobs ?? defaultJobs(real),
            allowedScripts: (input.allowedScripts ?? prev.allowedScripts ?? []).map(String).filter(s => /^[\w:.-]{1,60}$/.test(s)),
            protectedBranches: input.protectedBranches ?? prev.protectedBranches ?? ['main', 'master', 'production'],
            deploy: input.deploy ?? prev.deploy ?? null,
            parent: input.parent ?? prev.parent ?? null,
            branch: input.branch ?? prev.branch ?? null,
            updatedAt: new Date().toISOString(),
        };
    }

    const get = id => list.find(w => w.id === id) || null;
    function require(id) {
        const ws = get(id);
        if (!ws) throw new ToolError('NOT_FOUND', `No existe el workspace "${id}".`, { hint: 'Usa list_workspaces para ver los autorizados.' });
        if (!ws.enabled) throw new ToolError('WORKSPACE_DISABLED', `El workspace "${id}" está deshabilitado.`, { hint: 'Actívalo en el panel de workspaces.' });
        if (!fs.existsSync(ws.path)) throw new ToolError('WORKSPACE_MISSING', `La carpeta del workspace "${id}" ya no existe: ${ws.path}`);
        return ws;
    }

    /** Ruta segura dentro del workspace. mode: 'read' | 'write'. */
    function resolvePath(ws, rel, { mode = 'read' } = {}) {
        if (typeof rel !== 'string' || !rel.length || rel.includes('\0')) throw new ToolError('INVALID_PATH', 'Ruta vacía o inválida.');
        const root = fs.realpathSync(ws.path);
        const abs = path.resolve(root, rel.replace(/^\/+/, ''));
        if (!within(root, abs)) throw new ToolError('OUTSIDE_WORKSPACE', `La ruta sale del workspace: ${rel}`);
        let probe = abs;
        while (!fs.existsSync(probe) && within(root, probe) && probe !== root) probe = path.dirname(probe);
        const real = path.join(fs.realpathSync(probe), path.relative(probe, abs));
        if (!within(root, real)) throw new ToolError('OUTSIDE_WORKSPACE', `La ruta apunta fuera del workspace mediante un enlace simbólico: ${rel}`);
        const relative = path.relative(root, real).split(path.sep).join('/');
        if (relative.split('/').includes('.git')) throw new ToolError('PATH_DENIED', 'El interior de .git no es accesible; usa las herramientas git_*.');
        if (isSecretFile(relative)) throw new ToolError('PATH_DENIED', `${relative} es un archivo de credenciales y no se expone.`);
        // Solo cuenta lo protegido que está DENTRO del workspace (los worktrees de agentes viven bajo la carpeta del hub).
        if (protectedReal().some(p => within(p, real) && !within(p, root))) throw new ToolError('PATH_DENIED', `${relative} contiene datos internos del dashboard; usa las herramientas de datos.`);
        if ((ws.deny || []).some(g => globToRegex(g).test(relative) || relative.startsWith(g.replace(/\/?\*\*$/, '') + '/'))) throw new ToolError('PATH_DENIED', `${relative} está excluido en la configuración del workspace.`);
        if (mode === 'write' && fs.existsSync(real) && fs.lstatSync(real).isSymbolicLink()) throw new ToolError('PATH_DENIED', 'No se escribe a través de enlaces simbólicos.');
        return { abs: real, rel: relative || '.' };
    }
    const allowedRel = (ws, rel) => { try { resolvePath(ws, rel); return true; } catch { return false; } };

    async function listFiles(id, { glob, cursor = 0, limit = 200, includeIgnored = false } = {}) {
        const ws = require(id);
        let files;
        if (ws.kind === 'git' && !includeIgnored) {
            files = (await git(ws.path, ['ls-files', '-co', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
        } else {
            files = [];
            const walk = (d, prefix) => {
                for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                    if (files.length > 50000) return;
                    if (e.isDirectory()) { if (!IGNORED_DIRS.has(e.name)) walk(path.join(d, e.name), `${prefix}${e.name}/`); }
                    else if (e.isFile()) files.push(`${prefix}${e.name}`);
                }
            };
            walk(ws.path, '');
        }
        const re = glob ? globToRegex(glob) : null;
        files = files.filter(f => (!re || re.test(f)) && allowedRel(ws, f)).sort();
        const page = files.slice(cursor, cursor + limit);
        return { workspace: id, total: files.length, files: page, nextCursor: cursor + limit < files.length ? cursor + limit : null };
    }

    async function searchFiles(id, { query, regex = false, caseSensitive = false, glob, limit = 100 } = {}) {
        const ws = require(id);
        if (!query) throw new ToolError('INVALID_INPUT', 'Falta query.');
        const matches = [];
        if (ws.kind === 'git') {
            const args = ['grep', '-n', '-I', '--no-color', '--untracked', '--full-name', regex ? '-E' : '-F'];
            if (!caseSensitive) args.push('-i');
            args.push('-e', query);
            if (glob) args.push('--', `:(glob)${glob}`);
            const out = await git(ws.path, args, { allowFail: true }) || '';
            for (const line of out.split('\n')) {
                const m = line.match(/^(.+?):(\d+):(.*)$/);
                if (!m || !allowedRel(ws, m[1])) continue;
                matches.push({ path: m[1], line: Number(m[2]), text: redactText(m[3].slice(0, 300), { contextual: false }) });
                if (matches.length >= limit) break;
            }
        } else {
            const { files } = await listFiles(id, { glob, limit: 5000 });
            const re = regex ? new RegExp(query, caseSensitive ? '' : 'i') : null;
            const q = caseSensitive ? query : query.toLowerCase();
            outer: for (const f of files) {
                const abs = path.join(ws.path, f);
                if (fs.statSync(abs).size > 1024 * 1024) continue;
                const lines = fs.readFileSync(abs, 'utf8').split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const hit = re ? re.test(lines[i]) : (caseSensitive ? lines[i] : lines[i].toLowerCase()).includes(q);
                    if (hit) { matches.push({ path: f, line: i + 1, text: redactText(lines[i].slice(0, 300), { contextual: false }) }); if (matches.length >= limit) break outer; }
                }
            }
        }
        return { workspace: id, query, count: matches.length, truncated: matches.length >= limit, matches };
    }

    function readFile(id, rel, { startLine = 1, endLine } = {}) {
        const ws = require(id);
        const { abs, rel: clean } = resolvePath(ws, rel);
        if (!fs.existsSync(abs)) throw new ToolError('NOT_FOUND', `No existe ${clean}.`);
        const stat = fs.statSync(abs);
        if (!stat.isFile()) throw new ToolError('INVALID_PATH', `${clean} no es un archivo.`);
        const buf = fs.readFileSync(abs);
        const digest = sha256(buf);
        if (buf.subarray(0, 8000).includes(0)) return { workspace: id, path: clean, sha256: digest, size: stat.size, binary: true, content: '', startLine: 0, endLine: 0, totalLines: 0, truncated: false, redacted: false };
        const lines = buf.toString('utf8').split('\n');
        const from = Math.max(1, startLine);
        let to = Math.min(lines.length, endLine || from + 1999);
        let text = lines.slice(from - 1, to).join('\n');
        let truncated = to < lines.length;
        if (Buffer.byteLength(text) > MAX_READ_BYTES) {
            while (Buffer.byteLength(text) > MAX_READ_BYTES && to > from) { to = Math.max(from, Math.floor(from + (to - from) / 2)); text = lines.slice(from - 1, to).join('\n'); }
            truncated = true;
        }
        const safe = redactText(text, { contextual: false });
        return { workspace: id, path: clean, sha256: digest, size: stat.size, binary: false, totalLines: lines.length, startLine: from, endLine: to, truncated, redacted: safe !== text, content: safe };
    }

    async function gitStatus(id) {
        const ws = require(id);
        if (ws.kind !== 'git') throw new ToolError('NOT_A_REPO', `"${id}" no es un repositorio Git.`);
        const out = await git(ws.path, ['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all']);
        const res = { workspace: id, branch: null, head: null, upstream: null, ahead: 0, behind: 0, files: [], clean: true };
        for (const rec of out.split('\0').filter(Boolean)) {
            if (rec.startsWith('# branch.oid ')) res.head = rec.slice(13);
            else if (rec.startsWith('# branch.head ')) res.branch = rec.slice(14);
            else if (rec.startsWith('# branch.upstream ')) res.upstream = rec.slice(18);
            else if (rec.startsWith('# branch.ab ')) { const [a, b] = rec.slice(12).split(' '); res.ahead = Number(a); res.behind = -Number(b); }
            else if (rec.startsWith('1 ') || rec.startsWith('2 ')) { const parts = rec.split(' '); const p = parts.slice(rec.startsWith('1 ') ? 8 : 9).join(' '); res.files.push({ path: p, index: parts[1][0], worktree: parts[1][1] }); }
            else if (rec.startsWith('? ')) res.files.push({ path: rec.slice(2), index: '?', worktree: '?' });
            else if (rec.startsWith('u ')) res.files.push({ path: rec.split(' ').slice(10).join(' '), index: 'U', worktree: 'U' });
        }
        res.clean = res.files.length === 0;
        res.files = res.files.map(f => ({ ...f, hidden: !allowedRel(ws, f.path) }));
        return res;
    }

    async function gitDiff(id, { paths = [], staged = false, base, maxBytes = 200 * 1024 } = {}) {
        const ws = require(id);
        if (ws.kind !== 'git') throw new ToolError('NOT_A_REPO', `"${id}" no es un repositorio Git.`);
        if (base && !/^[\w./~^@{}-]{1,100}$/.test(base)) throw new ToolError('INVALID_INPUT', 'base inválida');
        const scope = [...(staged ? ['--cached'] : []), ...(base ? [base] : [])];
        const names = (await git(ws.path, ['diff', '--name-only', '-z', ...scope, '--', ...paths.map(p => resolvePath(ws, p).rel)])).split('\0').filter(Boolean);
        const allowed = names.filter(n => allowedRel(ws, n));
        if (!allowed.length) return { workspace: id, files: [], diff: '', truncated: false, hiddenFiles: names.length };
        const stat = await git(ws.path, ['diff', '--numstat', ...scope, '--', ...allowed]);
        let diff = await git(ws.path, ['diff', '--no-color', ...scope, '--', ...allowed]);
        const truncated = Buffer.byteLength(diff) > maxBytes;
        if (truncated) diff = diff.slice(0, maxBytes);
        return {
            workspace: id,
            files: stat.trim().split('\n').filter(Boolean).map(l => { const [a, d, ...p] = l.split('\t'); return { path: p.join('\t'), added: Number(a) || 0, deleted: Number(d) || 0 }; }),
            diff: redactText(diff, { contextual: false }), truncated, hiddenFiles: names.length - allowed.length,
        };
    }

    // ─── Parches ───
    const patchFile = pid => path.join(patchDir, `${pid}.json`);
    const loadPatch = pid => {
        if (!/^patch-[a-z0-9-]+$/.test(pid)) throw new ToolError('INVALID_INPUT', 'patch_id inválido');
        if (!fs.existsSync(patchFile(pid))) throw new ToolError('NOT_FOUND', `No existe el parche ${pid}.`);
        return JSON.parse(fs.readFileSync(patchFile(pid), 'utf8'));
    };

    async function previewDiff(rel, before, after) {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arrive-patch-'));
        try {
            const a = path.join(tmp, 'a'), b = path.join(tmp, 'b');
            fs.writeFileSync(a, before ?? ''); fs.writeFileSync(b, after ?? '');
            const out = await run('git', ['diff', '--no-index', '--no-color', '--', a, b], { maxBuffer: 20 * 1024 * 1024 }).then(r => r.stdout).catch(e => e.stdout || '');
            return out.split(a).join(`a/${rel}`).split(b).join(`b/${rel}`).replace(/^diff --git .*$/m, `diff --git a/${rel} b/${rel}`);
        } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    }

    /**
     * edits: [{ path, expected_sha256, action: 'create'|'update'|'delete', content?, replacements?: [{ old_text, new_text, replace_all? }] }]
     * expected_sha256 es obligatorio para update/delete: el hash que devolvió read_file.
     */
    async function preparePatch(id, { edits = [], diff, description = '' }, actor = 'agent') {
        const ws = require(id);
        const pid = `patch-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
        const files = [];
        let total = 0;
        if (diff) {
            if (ws.kind !== 'git') throw new ToolError('NOT_A_REPO', 'Los diffs unificados necesitan un repositorio Git; usa edits.');
            if (Buffer.byteLength(diff) > MAX_PATCH_BYTES) throw new ToolError('TOO_LARGE', 'Diff mayor de 5 MB.');
            if (containsSecret(diff, { contextual: false })) throw new ToolError('SECRET_DETECTED', 'El diff contiene lo que parece una credencial.', { hint: 'Usa variables de entorno; nunca escribas llaves en el código.' });
            await git(ws.path, ['apply', '--check', '--whitespace=nowarn', '-'], { input: diff }).catch(e => { throw new ToolError('PATCH_DOES_NOT_APPLY', e.message); });
            const numstat = await git(ws.path, ['apply', '--numstat', '-z', '-'], { input: diff });
            for (const rec of numstat.split('\0').filter(Boolean)) {
                const p = rec.split('\t').slice(2).join('\t');
                if (!p) continue;
                const { abs, rel } = resolvePath(ws, p, { mode: 'write' });
                files.push({ path: rel, action: fs.existsSync(abs) ? 'update' : 'create', baseSha256: fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : null, resultSha256: null });
            }
            for (const ed of edits) {
                const f = files.find(x => x.path === resolvePath(ws, ed.path).rel);
                if (f && ed.expected_sha256 && f.baseSha256 !== ed.expected_sha256) throw new ToolError('VERSION_CONFLICT', `${f.path} cambió desde que lo leíste.`, { details: { path: f.path, expected: ed.expected_sha256, current: f.baseSha256 }, hint: 'Vuelve a leerlo con read_file y prepara el parche de nuevo.' });
            }
            const record = { id: pid, workspace: id, kind: 'diff', description, createdBy: actor, createdAt: new Date().toISOString(), status: 'prepared', files, diff: redactText(diff, { contextual: false }) };
            writeJson(patchFile(pid), { ...record, rawDiff: diff });
            return patchView(record);
        }
        if (!edits.length) throw new ToolError('INVALID_INPUT', 'Envía edits o diff.');
        const seen = new Set();
        for (const ed of edits) {
            const { abs, rel } = resolvePath(ws, ed.path, { mode: 'write' });
            if (seen.has(rel)) throw new ToolError('INVALID_INPUT', `${rel} aparece dos veces; combina sus cambios.`);
            seen.add(rel);
            const exists = fs.existsSync(abs);
            const action = ed.action || (exists ? 'update' : 'create');
            const before = exists ? fs.readFileSync(abs) : null;
            const baseSha256 = before ? sha256(before) : null;
            if (action === 'create' && exists) throw new ToolError('VERSION_CONFLICT', `${rel} ya existe.`, { details: { path: rel, current: baseSha256 }, hint: 'Usa action "update" con expected_sha256.' });
            if (action !== 'create') {
                if (!exists) throw new ToolError('NOT_FOUND', `No existe ${rel}.`);
                if (!ed.expected_sha256) throw new ToolError('INVALID_INPUT', `Falta expected_sha256 para ${rel}.`, { hint: 'Léelo con read_file y envía su sha256.' });
                if (ed.expected_sha256 !== baseSha256) throw new ToolError('VERSION_CONFLICT', `${rel} cambió desde que lo leíste.`, { details: { path: rel, expected: ed.expected_sha256, current: baseSha256 }, hint: 'Vuelve a leerlo con read_file y prepara el parche de nuevo.' });
            }
            let after = null;
            if (action === 'delete') after = null;
            else if (ed.content !== undefined) after = String(ed.content);
            else if (ed.replacements?.length) {
                after = before.toString('utf8');
                for (const r of ed.replacements) {
                    const count = after.split(r.old_text).length - 1;
                    if (!r.old_text || count === 0) throw new ToolError('PATCH_DOES_NOT_APPLY', `No encontré el texto a reemplazar en ${rel}.`, { details: { old_text: String(r.old_text).slice(0, 200) } });
                    if (count > 1 && !r.replace_all) throw new ToolError('PATCH_DOES_NOT_APPLY', `El texto aparece ${count} veces en ${rel}; añade contexto o usa replace_all.`);
                    after = r.replace_all ? after.split(r.old_text).join(r.new_text) : after.replace(r.old_text, () => r.new_text);
                }
            } else throw new ToolError('INVALID_INPUT', `Indica content o replacements para ${rel}.`);
            if (after !== null) {
                total += Buffer.byteLength(after);
                if (total > MAX_PATCH_BYTES) throw new ToolError('TOO_LARGE', 'El parche supera 5 MB.');
                const prevSecret = before ? containsSecret(before.toString('utf8'), { contextual: false }) : false;
                if (!prevSecret && containsSecret(after, { contextual: false })) throw new ToolError('SECRET_DETECTED', `El nuevo contenido de ${rel} parece incluir una credencial.`, { hint: 'Léela de una variable de entorno.' });
            }
            const contentFile = after !== null ? `${pid}.${files.length}.blob` : null;
            if (contentFile) fs.writeFileSync(path.join(patchDir, contentFile), after);
            files.push({ path: rel, action, baseSha256, resultSha256: after !== null ? sha256(Buffer.from(after)) : null, contentFile, preview: await previewDiff(rel, before?.toString('utf8'), after) });
        }
        const record = { id: pid, workspace: id, kind: 'edits', description, createdBy: actor, createdAt: new Date().toISOString(), status: 'prepared', files };
        writeJson(patchFile(pid), record);
        return patchView(record);
    }

    function patchView(p) {
        return {
            patchId: p.id, workspace: p.workspace, status: p.status, kind: p.kind, description: p.description, createdBy: p.createdBy, createdAt: p.createdAt,
            appliedAt: p.appliedAt || null, appliedBy: p.appliedBy || null, conflicts: p.conflicts || [],
            files: p.files.map(f => ({ path: f.path, action: f.action, baseSha256: f.baseSha256, resultSha256: f.resultSha256 })),
            diff: redactText(p.kind === 'diff' ? p.diff : p.files.map(f => f.preview || '').join('\n'), { contextual: false }).slice(0, 200 * 1024),
        };
    }

    /** Aplica un parche preparado si ningún archivo cambió desde entonces. Repetirlo no vuelve a aplicarlo. */
    async function applyPatch(pid, actor = 'agent') {
        const p = loadPatch(pid);
        const ws = require(p.workspace);
        if (p.status === 'applied') return { ...patchView(p), alreadyApplied: true };
        const conflicts = [];
        for (const f of p.files) {
            const { abs } = resolvePath(ws, f.path, { mode: 'write' });
            const current = fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : null;
            if (current !== f.baseSha256) conflicts.push({ path: f.path, expected: f.baseSha256, current });
        }
        if (conflicts.length) {
            // ¿Ya estaba aplicado (p. ej. reintento tras un corte)? Todos los archivos tienen el resultado esperado.
            const applied = p.kind === 'edits' && p.files.every(f => { const { abs } = resolvePath(ws, f.path); const cur = fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : null; return cur === f.resultSha256; });
            if (applied) { Object.assign(p, { status: 'applied', appliedAt: new Date().toISOString(), appliedBy: actor }); writeJson(patchFile(pid), p); return { ...patchView(p), alreadyApplied: true }; }
            p.conflicts = conflicts; p.status = 'conflict';
            writeJson(patchFile(pid), p);
            throw new ToolError('VERSION_CONFLICT', `El parche no se aplicó: ${conflicts.length} archivo(s) cambiaron desde que se preparó.`, { details: { conflicts }, hint: 'Lee de nuevo los archivos, prepara otro parche y aplícalo.' });
        }
        if (p.kind === 'diff') {
            await git(ws.path, ['apply', '--whitespace=nowarn', '-'], { input: p.rawDiff });
            for (const f of p.files) { const { abs } = resolvePath(ws, f.path); f.resultSha256 = fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : null; }
        } else {
            const undo = [];
            try {
                for (const f of p.files) {
                    const { abs } = resolvePath(ws, f.path, { mode: 'write' });
                    const prev = fs.existsSync(abs) ? { data: fs.readFileSync(abs), mode: fs.statSync(abs).mode } : null;
                    undo.push({ abs, prev });
                    if (f.action === 'delete') { fs.unlinkSync(abs); continue; }
                    fs.mkdirSync(path.dirname(abs), { recursive: true });
                    const tmp = `${abs}.arrive-${process.pid}.tmp`;
                    fs.writeFileSync(tmp, fs.readFileSync(path.join(patchDir, f.contentFile)), prev ? { mode: prev.mode } : undefined);
                    fs.renameSync(tmp, abs);
                }
            } catch (err) {
                for (const u of undo.reverse()) { if (u.prev) fs.writeFileSync(u.abs, u.prev.data, { mode: u.prev.mode }); else fs.rmSync(u.abs, { force: true }); }
                throw new ToolError('APPLY_FAILED', `No se pudo escribir el parche (se revirtieron los archivos): ${err.message}`, { retryable: true });
            }
        }
        Object.assign(p, { status: 'applied', appliedAt: new Date().toISOString(), appliedBy: actor, conflicts: [] });
        writeJson(patchFile(pid), p);
        return patchView(p);
    }

    const getPatch = pid => patchView(loadPatch(pid));
    function listPatches({ workspace, limit = 50 } = {}) {
        return fs.readdirSync(patchDir).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(patchDir, f), 'utf8')); } catch { return null; } })
            .filter(p => p && (!workspace || p.workspace === workspace))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
            .map(p => ({ patchId: p.id, workspace: p.workspace, status: p.status, createdBy: p.createdBy, createdAt: p.createdAt, appliedAt: p.appliedAt || null, files: p.files.map(f => f.path), description: p.description }));
    }

    // ─── Ramas y commits ───
    async function createBranch(id, { name, from = 'HEAD', worktree = true }, actor = 'agent') {
        const ws = require(id);
        if (ws.kind !== 'git') throw new ToolError('NOT_A_REPO', `"${id}" no es un repositorio Git.`);
        const ok = await git(ws.path, ['check-ref-format', '--branch', name], { allowFail: true });
        if (!ok || name.startsWith('-')) throw new ToolError('INVALID_INPUT', `Nombre de rama inválido: ${name}`);
        if (!/^[\w./~^@{}-]{1,100}$/.test(from)) throw new ToolError('INVALID_INPUT', 'from inválido');
        const exists = await git(ws.path, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`], { allowFail: true });
        const derivedId = `${ws.id.split(':')[0]}:${name.replace(/[^a-z0-9_.-]+/gi, '-').toLowerCase()}`.slice(0, 80);
        if (exists) {
            const existing = get(derivedId);
            if (existing) return { workspace: derivedId, branch: name, head: exists.trim(), action: 'existing', path: existing.path };
            if (!worktree) return { workspace: id, branch: name, head: exists.trim(), action: 'existing' };
        }
        if (!worktree) {
            await git(ws.path, ['branch', name, from]);
            return { workspace: id, branch: name, head: (await git(ws.path, ['rev-parse', name])).trim(), action: 'created' };
        }
        const target = path.join(worktreeDir, ws.id.split(':')[0], derivedId.split(':')[1]);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        await git(ws.path, exists ? ['worktree', 'add', target, name] : ['worktree', 'add', '-b', name, target, from]);
        const nm = path.join(ws.path, 'node_modules');
        if (fs.existsSync(nm) && !fs.existsSync(path.join(target, 'node_modules'))) fs.symlinkSync(nm, path.join(target, 'node_modules'), 'dir');
        const base = get(ws.id.split(':')[0]) || ws;
        list = list.filter(w => w.id !== derivedId);
        list.push({ ...normalize({ id: derivedId, name: `${base.name} · ${name}`, path: target, parent: base.id, branch: name, jobs: base.jobs, allowedScripts: base.allowedScripts, protectedBranches: base.protectedBranches, deny: base.deny, deploy: null }), createdBy: actor });
        save();
        return { workspace: derivedId, branch: name, head: (await git(target, ['rev-parse', 'HEAD'])).trim(), action: 'created', path: target };
    }

    async function commit(id, { message, paths = [], expectedHead }, actor = 'agent', operationId = '') {
        const ws = require(id);
        if (ws.kind !== 'git') throw new ToolError('NOT_A_REPO', `"${id}" no es un repositorio Git.`);
        if (!message?.trim()) throw new ToolError('INVALID_INPUT', 'Falta el mensaje del commit.');
        if (!paths.length) throw new ToolError('INVALID_INPUT', 'Indica los archivos a incluir (paths). No se hacen commits de "todo".');
        if (containsSecret(message)) throw new ToolError('SECRET_DETECTED', 'El mensaje del commit contiene lo que parece una credencial.');
        const status = await gitStatus(id);
        if (!status.branch || status.branch === '(detached)') throw new ToolError('DETACHED_HEAD', 'No hay rama activa en este workspace.');
        if ((ws.protectedBranches || []).includes(status.branch)) throw new ToolError('PROTECTED_BRANCH', `La rama ${status.branch} está protegida.`, { hint: 'Crea una rama con create_branch (worktree) y haz el commit ahí.' });
        if (expectedHead && expectedHead !== status.head) throw new ToolError('VERSION_CONFLICT', 'La rama avanzó desde que la consultaste.', { details: { expected: expectedHead, current: status.head } });
        const rels = paths.map(p => resolvePath(ws, p).rel);
        const changed = new Set(status.files.map(f => f.path));
        const missing = rels.filter(r => !changed.has(r));
        if (missing.length === rels.length) throw new ToolError('NOTHING_TO_COMMIT', 'Esos archivos no tienen cambios.', { details: { paths: rels } });
        const include = rels.filter(r => changed.has(r));
        await git(ws.path, ['add', '--', ...include]);
        const staged = await git(ws.path, ['diff', '--cached', '--no-color', '--', ...include]);
        if (containsSecret(staged, { contextual: false })) {
            await git(ws.path, ['reset', '-q', '--', ...include], { allowFail: true });
            throw new ToolError('SECRET_DETECTED', 'Los cambios a confirmar contienen lo que parece una credencial; no se hizo el commit.');
        }
        const ident = (await git(ws.path, ['config', 'user.email'], { allowFail: true }))?.trim() ? [] : ['-c', 'user.name=ARRIVE Agent', '-c', 'user.email=agents@arrive.local'];
        const full = `${message.trim()}\n\nAgent: ${actor}${operationId ? `\nOperation: ${operationId}` : ''}`;
        await git(ws.path, [...ident, 'commit', '-q', '-m', full, '--', ...include]);
        const head = (await git(ws.path, ['rev-parse', 'HEAD'])).trim();
        return { workspace: id, branch: status.branch, commit: head, files: include, skipped: missing };
    }

    // ─── Administración ───
    function upsert(input) {
        const prev = get(input.id) || {};
        const ws = normalize(input, prev);
        list = list.filter(w => w.id !== ws.id);
        list.push(ws);
        save();
        return ws;
    }
    function remove(id) {
        const before = list.length;
        list = list.filter(w => w.id !== id);
        save();
        return list.length < before;
    }

    return {
        list: () => list.map(w => ({ ...w })), get, require, resolvePath, upsert, remove, git,
        listFiles, searchFiles, readFile, gitStatus, gitDiff, preparePatch, applyPatch, getPatch, listPatches, createBranch, commit,
        dir, worktreeDir,
    };
}
