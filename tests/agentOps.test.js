// Pruebas de integración del MCP operativo: servidor HTTP real, cliente MCP del SDK,
// ejecutor en un proceso aparte y un repositorio Git temporal.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { registerAgentHub } from '../src/services/agentHub/routes.js';
import { refreshSecretEnv } from '../src/services/agentHub/redact.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAKE_SECRET = `sk-ant-${'Zq9'.repeat(12)}`;
const ENV_SECRET = `envsecret-${crypto.randomBytes(12).toString('hex')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const F = {};

function dataLayer() {
    const db = { projects: [{ id: 'proj-1', name: 'Hang Out', status: 'active', priority: 'alta' }], tasks: [], events: [], notes: [], decisionLog: [{ id: 'dec-1', date: '2026-09-15', projectId: 'proj-1', project: 'Hang Out', decision: 'Hang Out será mobile first centrado en nightlife y mesas VIP', decisor: 'Equipo' }], activityFeed: [], archivedRecords: [] };
    let seq = 0;
    const readDB = () => structuredClone(db);
    const createEntity = (kind, data) => { db[kind] ||= []; const row = { ...data, id: data.id || `${kind.slice(0, 4)}-${++seq}` }; if (kind === 'tasks') { row.status ||= 'pending'; row.done = row.status === 'done'; } db[kind].push(row); return structuredClone(row); };
    const updateEntity = (kind, id, changes) => { const row = (db[kind] || []).find(x => x.id === id); if (!row) return null; Object.assign(row, changes); if (kind === 'tasks' && changes.status) row.done = changes.status === 'done'; return structuredClone(row); };
    const archiveEntity = (kind, id, meta) => { const i = db[kind].findIndex(x => x.id === id); const [r] = db[kind].splice(i, 1); db.archivedRecords.push({ collection: kind, record: r, archivedAt: new Date().toISOString(), ...meta }); return r; };
    const restoreEntity = (kind, id) => { if (db[kind].some(x => x.id === id)) throw new Error('ocupado'); const i = db.archivedRecords.findIndex(a => a.collection === kind && a.record.id === id); const [e] = db.archivedRecords.splice(i, 1); db[kind].push(e.record); return e.record; };
    const addActivityFeed = text => db.activityFeed.unshift({ text });
    return { db, readDB, createEntity, updateEntity, archiveEntity, restoreEntity, addActivityFeed };
}

const memories = [];
const knowledge = {
    projects: () => [], profile: () => ({ text: 'Decide rápido, prioriza caja.' }), status: () => ({ chatgpt: { total: 0 }, projects: 0, store: { docs: memories.length } }),
    search: async () => ({ mode: 'keyword', results: [] }), listConversations: () => ({ items: [] }), getConversation: () => null,
    saveMemory: async m => { const h = crypto.createHash('sha256').update(`${m.title}\n${m.content}\n${m.projectId}`).digest('hex'); const ex = memories.find(x => x.h === h); if (ex) return { ...ex, deduplicated: true }; const d = { id: `memory:${memories.length + 1}`, title: m.title, h }; memories.push(d); return d; },
    store: { getDoc: () => null, chunksOf: () => [], listDocs: () => [] },
};

function git(cwd, ...args) { return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim(); }

function makeRepo(dir) {
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'demo', version: '1.0.0', private: true, type: 'module',
        scripts: {
            test: 'node --test',
            build: 'node build.mjs',
            slow: 'node -e "setTimeout(()=>{},60000)"',
            leak: 'node -e "console.log(require(\'fs\').readFileSync(\'src/config.txt\',\'utf8\')); console.log(\'ENV=\'+(process.env.LEAKY_TOKEN||\'none\'))"',
        },
    }, null, 2));
    fs.writeFileSync(path.join(dir, 'build.mjs'), "import fs from 'node:fs';\nfs.mkdirSync('dist',{recursive:true});\nfs.writeFileSync('dist/index.html', fs.readFileSync('src/app.js','utf8'));\n");
    fs.writeFileSync(path.join(dir, 'src', 'app.js'), "export const greet = () => 'hola';\n");
    fs.writeFileSync(path.join(dir, 'src', 'config.txt'), `api=${FAKE_SECRET}\n`);
    fs.writeFileSync(path.join(dir, 'app.test.js'), "import test from 'node:test';\nimport assert from 'node:assert';\nimport { greet } from './src/app.js';\ntest('saluda', () => assert.equal(greet(), 'hola'));\n");
    fs.writeFileSync(path.join(dir, '.env'), `SECRET=${ENV_SECRET}\n`);
    fs.writeFileSync(path.join(dir, '.gitignore'), 'dist\n.env\n');
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'inicio');
}

function startRunner() {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts/arrive-runner.mjs'), '--root', F.hubDir], { stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: process.env.HOME, LEAKY_TOKEN: 'should-not-pass' } });
    child.stdout.on('data', () => {}); child.stderr.on('data', d => { if (process.env.DEBUG_RUNNER) process.stderr.write(d); });
    return child;
}
async function waitRunner(online = true) {
    for (let i = 0; i < 100; i++) { const r = await F.adminGet('/api/agent-hub/ops/overview'); if (r.executor.online === online) return r; await sleep(100); }
    throw new Error('El ejecutor no cambió de estado');
}

async function connect(token) {
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${F.base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
    return client;
}
async function call(client, name, args = {}) {
    const r = await client.callTool({ name, arguments: args });
    return { ...r, data: r.structuredContent || JSON.parse(r.content?.[0]?.text || '{}'), text: r.content?.map(c => c.text).join('\n') || '' };
}
async function waitJob(client, id, final = ['succeeded', 'failed', 'cancelled', 'timed_out', 'interrupted'], ms = 60000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const r = await call(client, 'get_job', { job_id: id }); if (final.includes(r.data.status)) return r.data; await sleep(200); }
    throw new Error(`El trabajo ${id} no terminó`);
}

before(async () => {
    process.env.TEST_SERVICE_TOKEN = ENV_SECRET; // valor de entorno con aspecto de secreto: debe redactarse siempre
    refreshSecretEnv();
    F.tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arrive-ops-'));
    F.hubDir = path.join(F.tmp, 'hub');
    F.repo = path.join(F.tmp, 'repo');
    F.target = path.join(F.tmp, 'site');
    fs.mkdirSync(F.repo);
    makeRepo(F.repo);
    F.data = dataLayer();
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    F.hub = registerAgentHub(app, { dataDir: F.hubDir, knowledge, ...F.data, isAdminRequest: req => req.headers['x-admin'] === 'yes', rootDir: F.tmp, protectedPaths: [], runnerScript: path.join(ROOT, 'scripts/arrive-runner.mjs') });
    await new Promise(r => { F.server = app.listen(0, '127.0.0.1', r); });
    F.base = `http://127.0.0.1:${F.server.address().port}`;
    process.env.PUBLIC_URL = F.base;
    const req = async (method, url, body) => { const r = await fetch(`${F.base}${url}`, { method, headers: { 'Content-Type': 'application/json', 'x-admin': 'yes' }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json(); if (!r.ok) throw new Error(`${url}: ${j.error}`); return j; };
    F.adminGet = url => req('GET', url);
    F.admin = req;
    await req('PUT', '/api/agent-hub/workspaces/demo', { name: 'Demo', path: F.repo, allowedScripts: ['slow', 'leak'], deploy: { provider: 'static-release', targetDir: F.target } });
    F.readToken = (await req('POST', '/api/agent-hub/tokens', { name: 'Lector', scope: 'read' })).token;
    F.writeToken = (await req('POST', '/api/agent-hub/tokens', { name: 'Escritor', scope: 'write' })).token;
    const dev = await req('POST', '/api/agent-hub/tokens', { name: 'Dev', scope: 'write', policy: { data: 'write', documents: 'write', memory: 'write', code: 'commit', exec: 'run', deploy: 'release', workspaces: ['demo'] } });
    F.devToken = dev.token;
    F.devId = dev.record.id;
    F.runner = startRunner();
    await waitRunner(true);
});

after(async () => {
    F.hub.flush();
    try { F.runner?.kill('SIGKILL'); } catch { /* ya terminó */ }
    try { F.runner2?.kill('SIGKILL'); } catch { /* ya terminó */ }
    await new Promise(r => F.server.close(r));
    // Mata procesos huérfanos de la prueba de interrupción.
    try { execFileSync('pkill', ['-f', 'setTimeout\\(\\(\\)=>\\{\\},60000\\)']); } catch { /* nada */ }
    fs.rmSync(F.tmp, { recursive: true, force: true });
});

test('descubrimiento: capacidades, estado y permisos reales', async () => {
    const c = await connect(F.readToken);
    const caps = await call(c, 'get_capabilities');
    assert.ok(caps.data.modules.some(m => m.id === 'data:tasks' && m.actions.includes('query') && !m.actions.includes('create')));
    assert.equal(caps.data.executor.online, true);
    const st = await call(c, 'get_connection_status');
    assert.equal(st.data.caller.kind, 'token');
    assert.ok(st.data.availability.executor.available.length > 0);
    const perms = await call(c, 'get_permissions');
    assert.equal(perms.data.functions.data.level, 'read');
    assert.equal(perms.data.functions.code.level, 'none');
    assert.ok(perms.data.tools.denied.some(t => t.name === 'apply_patch' && t.needs === 'code:write'));
    const listed = (await c.listTools()).tools;
    const apply = listed.find(t => t.name === 'create_record');
    assert.equal(apply, undefined, 'una herramienta sin permiso no se lista');
    const q = listed.find(t => t.name === 'query_records');
    assert.equal(q.annotations.readOnlyHint, true);
    assert.ok(q.outputSchema, 'las herramientas nuevas declaran outputSchema');
    await c.close();
});

test('rechaza operaciones sin permiso (servidor, no anotaciones) y respeta revocación', async () => {
    const reader = await connect(F.readToken);
    const denied = await call(reader, 'create_record', { collection: 'notes', data: { title: 'x' } });
    assert.equal(denied.isError, true);
    assert.equal(denied.data.error.code, 'PERMISSION_DENIED');
    const writer = await connect(F.writeToken);
    const noWs = await call(writer, 'apply_patch', { workspace: 'demo', edits: [{ path: 'a.txt', content: 'x' }] });
    assert.equal(noWs.data.error.code, 'PERMISSION_DENIED');
    const approve = await call(writer, 'approve_decision', { id: 'dec-1' });
    assert.equal(approve.data.error.code, 'PERMISSION_DENIED');
    // Política persistente: se amplía sin otra confirmación y se revoca.
    const tokens = await F.adminGet('/api/agent-hub/tokens');
    const writerId = tokens.find(t => t.name === 'Escritor').id;
    await F.admin('PUT', `/api/agent-hub/policies/${writerId}`, { code: 'read', workspaces: ['demo'] });
    const ok = await call(writer, 'read_file', { workspace: 'demo', path: 'src/app.js' });
    assert.equal(ok.isError, undefined);
    await F.admin('POST', `/api/agent-hub/policies/${writerId}/revoke`);
    const r = await fetch(`${F.base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${F.writeToken}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    assert.equal(r.status, 401);
    await reader.close();
});

test('agentes internos de AI Office: cliente en proceso con permisos por función', async () => {
    await assert.rejects(F.hub.connectInternal({ agent: 'x', principal: 'tok-falso' }), /office:/);
    const a = await F.hub.connectInternal({ agent: 'Atlas', principal: 'office:agent-atlas' });
    const names = (await a.client.listTools()).tools.map(t => t.name);
    assert.ok(names.includes('get_context') && names.includes('query_records'));
    assert.ok(!names.includes('create_record') && !names.includes('read_file') && !names.includes('start_job'));
    const denied = await call(a.client, 'create_record', { collection: 'notes', data: { title: 'x' } });
    assert.equal(denied.data.error.code, 'PERMISSION_DENIED');
    await a.close();
    // Política guardada desde el panel: amplía sin otra confirmación.
    await F.admin('PUT', '/api/agent-hub/policies/office:agent-atlas', { data: 'write', documents: 'read', memory: 'read', code: 'read', workspaces: ['demo'] });
    const b = await F.hub.connectInternal({ agent: 'Atlas', principal: 'office:agent-atlas' });
    const made = await call(b.client, 'create_record', { collection: 'ideas', data: { title: 'Idea de Atlas' }, idempotency_key: 'atlas-1' });
    assert.equal(made.isError, undefined);
    assert.equal((await call(b.client, 'read_file', { workspace: 'demo', path: 'src/app.js' })).isError, undefined);
    await b.close();
    const overview = await F.adminGet('/api/agent-hub/ops/overview');
    assert.ok(overview.principals.some(p => p.principal === 'office:agent-atlas' && p.kind === 'office' && p.effective.data === 'write'));
    // Revocar desde el panel lo corta en la siguiente conexión.
    await F.admin('POST', '/api/agent-hub/policies/office:agent-atlas/revoke');
    const c = await F.hub.connectInternal({ agent: 'Atlas', principal: 'office:agent-atlas' });
    assert.ok(!(await c.client.listTools()).tools.some(t => t.name === 'query_records'));
    await c.close();
    const acts = await F.adminGet('/api/agent-hub/activity?limit=200');
    assert.ok(acts.some(x => x.principal === 'office:agent-atlas' && x.tool === 'create_record' && x.ok));
});

test('crear y actualizar sin duplicados, con control de concurrencia', async () => {
    const c = await connect(F.devToken);
    const a = await call(c, 'create_record', { collection: 'notes', data: { title: 'Acta lunes', text: 'v1' }, idempotency_key: 'nota-acta-1' });
    const b = await call(c, 'create_record', { collection: 'notes', data: { title: 'Acta lunes', text: 'v1' }, idempotency_key: 'nota-acta-1' });
    assert.equal(a.data.action, 'created');
    assert.equal(b.data.id, a.data.id);
    assert.equal(b.data.deduplicated, true);
    assert.equal(F.data.db.notes.length, 1);
    const t1 = await call(c, 'create_task', { text: 'Confirmar DJ', project_id: 'proj-1', idempotency_key: 'dj-1' });
    await call(c, 'create_task', { text: 'Confirmar DJ', project_id: 'proj-1', idempotency_key: 'dj-1' });
    assert.equal(F.data.db.tasks.length, 1);
    const ext1 = await call(c, 'create_record', { collection: 'tasks', data: { text: 'Pagar sonido' }, external_id: 'gg-t-9' });
    const ext2 = await call(c, 'create_record', { collection: 'tasks', data: { text: 'Pagar sonido' }, external_id: 'gg-t-9' });
    assert.equal(ext2.data.action, 'existing');
    assert.equal(ext2.data.id, ext1.data.id);
    const rec = await call(c, 'get_record', { collection: 'tasks', id: t1.data.id });
    const up = await call(c, 'update_record', { collection: 'tasks', id: t1.data.id, data: { status: 'in-progress', priority: 'alta' }, expected_etag: rec.data._etag });
    assert.equal(up.data.action, 'updated');
    assert.equal(F.data.db.tasks.find(t => t.id === t1.data.id).priority, 'high');
    const stale = await call(c, 'update_record', { collection: 'tasks', id: t1.data.id, data: { status: 'done' }, expected_etag: rec.data._etag });
    assert.equal(stale.data.error.code, 'VERSION_CONFLICT');
    assert.ok(stale.data.error.details.changedFields.includes('status'));
    // Lote idempotente: reintentar no repite.
    const ops = [{ op: 'create', collection: 'notes', data: { title: 'L1' } }, { op: 'create', collection: 'notes', data: { title: 'L2' } }];
    await call(c, 'batch_records', { operations: ops, idempotency_key: 'lote-1' });
    const again = await call(c, 'batch_records', { operations: ops, idempotency_key: 'lote-1' });
    assert.equal(again.data.ok, 2);
    assert.equal(F.data.db.notes.length, 3);
    // Archivar y restaurar.
    const arch = await call(c, 'archive_record', { collection: 'notes', id: a.data.id });
    assert.equal(arch.data.action, 'archived');
    assert.equal(F.data.db.notes.some(n => n.id === a.data.id), false);
    assert.equal((await call(c, 'restore_record', { collection: 'notes', id: a.data.id })).data.action, 'restored');
    const mem1 = await call(c, 'save_memory', { title: 'Precio mesa', content: 'La mesa VIP cuesta 300 USD.' });
    const mem2 = await call(c, 'save_memory', { title: 'Precio mesa', content: 'La mesa VIP cuesta 300 USD.' });
    assert.equal(mem2.data.id, mem1.data.id);
    assert.equal(mem2.data.action, 'existing');
    await c.close();
});

test('recupera una versión sin pisar trabajo posterior', async () => {
    const c = await connect(F.devToken);
    const p = await call(c, 'create_record', { collection: 'projects', data: { name: 'Elemento', objective: 'A', nextAction: 'llamar' } });
    const id = p.data.id;
    await call(c, 'update_record', { collection: 'projects', id, data: { objective: 'B' } });
    // Otro actor (la interfaz) cambia nextAction después.
    F.data.updateEntity('projects', id, { nextAction: 'enviar propuesta' });
    const versions = await call(c, 'list_record_versions', { collection: 'projects', id });
    const current = versions.data.current;
    const stale = await call(c, 'restore_record_version', { collection: 'projects', id, version: 1, expected_version: current - 1 });
    assert.equal(stale.data.error.code, 'VERSION_CONFLICT');
    const blocked = await call(c, 'restore_record_version', { collection: 'projects', id, version: 1, expected_version: current });
    assert.equal(blocked.data.error.code, 'RESTORE_WOULD_OVERWRITE');
    assert.deepEqual(blocked.data.error.details.wouldOverwrite, ['nextAction']);
    const ok = await call(c, 'restore_record_version', { collection: 'projects', id, version: 1, expected_version: current, fields: ['objective'] });
    assert.equal(ok.data.action, 'restored_version');
    const row = F.data.db.projects.find(x => x.id === id);
    assert.equal(row.objective, 'A');
    assert.equal(row.nextAction, 'enviar propuesta', 'el cambio posterior se conserva');
    assert.ok((await call(c, 'list_record_versions', { collection: 'projects', id })).data.versions.length >= 4, 'el historial no se reescribe');
    await c.close();
});

test('aplica un parche y detecta un conflicto de versión', async () => {
    const c = await connect(F.devToken);
    const f = await call(c, 'read_file', { workspace: 'demo', path: 'src/app.js' });
    const prep = await call(c, 'prepare_patch', { workspace: 'demo', edits: [{ path: 'src/app.js', expected_sha256: f.data.sha256, replacements: [{ old_text: "'hola';", new_text: "'hola'; // revisado" }] }] });
    assert.equal(prep.data.status, 'prepared');
    assert.match(prep.data.diff, /revisado/);
    const late = await call(c, 'prepare_patch', { workspace: 'demo', edits: [{ path: 'src/app.js', expected_sha256: f.data.sha256, content: "export const greet = () => 'otro';\n" }] });
    const applied = await call(c, 'apply_patch', { patch_id: prep.data.patchId });
    assert.equal(applied.data.status, 'applied');
    assert.match(fs.readFileSync(path.join(F.repo, 'src/app.js'), 'utf8'), /revisado/);
    const again = await call(c, 'apply_patch', { patch_id: prep.data.patchId });
    assert.equal(again.data.alreadyApplied, true);
    const conflict = await call(c, 'apply_patch', { patch_id: late.data.patchId });
    assert.equal(conflict.data.error.code, 'VERSION_CONFLICT');
    assert.match(fs.readFileSync(path.join(F.repo, 'src/app.js'), 'utf8'), /revisado/, 'el conflicto no toca el archivo');
    // Rutas fuera del workspace, enlaces simbólicos y credenciales.
    fs.symlinkSync('/etc', path.join(F.repo, 'fuera'));
    assert.equal((await call(c, 'read_file', { workspace: 'demo', path: '../../etc/hosts' })).data.error.code, 'OUTSIDE_WORKSPACE');
    assert.equal((await call(c, 'read_file', { workspace: 'demo', path: 'fuera/hosts' })).data.error.code, 'OUTSIDE_WORKSPACE');
    assert.equal((await call(c, 'read_file', { workspace: 'demo', path: '.env' })).data.error.code, 'PATH_DENIED');
    assert.equal((await call(c, 'read_file', { workspace: 'demo', path: '.git/config' })).data.error.code, 'PATH_DENIED');
    fs.unlinkSync(path.join(F.repo, 'fuera'));
    const secretPatch = await call(c, 'prepare_patch', { workspace: 'demo', edits: [{ path: 'src/keys.js', content: `export const k = '${`ghp_${'A1b2'.repeat(9)}`}';\n` }] });
    assert.equal(secretPatch.data.error.code, 'SECRET_DETECTED');
    // Rama en worktree y commit solo de lo indicado; main está protegida.
    const onMain = await call(c, 'commit_changes', { workspace: 'demo', message: 'cambio', paths: ['src/app.js'] });
    assert.equal(onMain.data.error.code, 'PROTECTED_BRANCH');
    const br = await call(c, 'create_branch', { workspace: 'demo', name: 'agente/saludo' });
    assert.equal(br.data.action, 'created');
    const wf = await call(c, 'read_file', { workspace: br.data.workspace, path: 'src/app.js' });
    await call(c, 'apply_patch', { workspace: br.data.workspace, edits: [{ path: 'src/app.js', expected_sha256: wf.data.sha256, content: "export const greet = () => 'hola';\nexport const bye = () => 'chao';\n" }] });
    const cm = await call(c, 'commit_changes', { workspace: br.data.workspace, message: 'Añade bye', paths: ['src/app.js'] });
    assert.match(cm.data.commit, /^[0-9a-f]{40}$/);
    assert.match(git(F.repo, 'log', '-1', '--format=%B', 'agente/saludo'), /Agent: Dev/);
    await c.close();
});

test('ejecuta pruebas, recupera resultados y los consulta tras reconectar', async () => {
    const c = await connect(F.devToken);
    const started = await call(c, 'start_job', { workspace: 'demo', type: 'test', idempotency_key: 'tests-1' });
    assert.equal(started.data.status, 'queued');
    const dup = await call(c, 'start_job', { workspace: 'demo', type: 'test', idempotency_key: 'tests-1' });
    assert.equal(dup.data.id, started.data.id, 'reintentar no relanza');
    await c.close();
    // Otra conexión (otro chat) consulta el mismo trabajo.
    const c2 = await connect(F.devToken);
    const done = await waitJob(c2, started.data.id);
    assert.equal(done.status, 'succeeded', JSON.stringify(done));
    assert.equal(done.exitCode, 0);
    assert.equal(done.summary.pass, 1);
    assert.match(done.commit, /^[0-9a-f]{40}$/);
    const logs = await call(c2, 'get_job_logs', { job_id: started.data.id });
    assert.match(logs.data.text, /saluda/);
    assert.equal(logs.data.complete, true);
    const badArg = await call(c2, 'start_job', { workspace: 'demo', type: 'test', args: ['; rm -rf /'] });
    assert.equal(badArg.data.error.code, 'INVALID_INPUT');
    const notAllowed = await call(c2, 'start_job', { workspace: 'demo', type: 'script', script: 'build' });
    assert.equal(notAllowed.data.error.code, 'NOT_ALLOWED');
    await c2.close();
});

test('cancela trabajos y detecta los interrumpidos por un reinicio del ejecutor', async () => {
    const c = await connect(F.devToken);
    const a = await call(c, 'start_job', { workspace: 'demo', type: 'script', script: 'slow' });
    await waitJob(c, a.data.id, ['running']);
    const cancel = await call(c, 'cancel_job', { job_id: a.data.id });
    assert.equal(cancel.data.action, 'cancel_requested');
    assert.equal((await waitJob(c, a.data.id)).status, 'cancelled');
    const b = await call(c, 'start_job', { workspace: 'demo', type: 'script', script: 'slow' });
    await waitJob(c, b.data.id, ['running']);
    F.runner.kill('SIGKILL');
    await sleep(300);
    F.runner2 = startRunner();
    const after = await waitJob(c, b.data.id, ['interrupted'], 20000);
    assert.match(after.error, /se detuvo/);
    const logs = await call(c, 'get_job_logs', { job_id: b.data.id, tail: true });
    assert.match(logs.data.text, /interrumpido/);
    await c.close();
});

test('despliega el artefacto exacto de un commit y revierte', async () => {
    const c = await connect(F.devToken);
    const head1 = git(F.repo, 'rev-parse', 'HEAD');
    const d1 = await call(c, 'prepare_deployment', { workspace: 'demo', idempotency_key: 'dep-a' });
    assert.equal(d1.data.commit, head1);
    const again = await call(c, 'prepare_deployment', { workspace: 'demo', idempotency_key: 'dep-a' });
    assert.equal(again.data.deploymentId, d1.data.deploymentId);
    const waitStatus = async (id, statuses) => { for (let i = 0; i < 300; i++) { const s = await call(c, 'get_deployment_status', { deployment_id: id }); if (statuses.includes(s.data.status)) return s.data; await sleep(200); } throw new Error('timeout'); };
    const prepared = await waitStatus(d1.data.deploymentId, ['prepared', 'prepare_failed']);
    assert.equal(prepared.status, 'prepared', JSON.stringify(prepared.prepare));
    assert.match(prepared.artifact.sha256, /^[0-9a-f]{64}$/);
    const early = await call(c, 'deploy', { deployment_id: d1.data.deploymentId });
    assert.equal(early.data.error.code, 'INVALID_STATE', 'no se despliega sin validar');
    await call(c, 'validate_deployment', { deployment_id: d1.data.deploymentId });
    assert.equal((await waitStatus(d1.data.deploymentId, ['validated', 'validation_failed'])).status, 'validated');
    await call(c, 'deploy', { deployment_id: d1.data.deploymentId, expected_current_release: null });
    const rel1 = await waitStatus(d1.data.deploymentId, ['released', 'release_failed']);
    assert.equal(rel1.currentRelease.deploymentId, d1.data.deploymentId);
    assert.equal(rel1.currentRelease.commit, head1);
    // Segundo commit y despliegue.
    fs.writeFileSync(path.join(F.repo, 'src/app.js'), "export const greet = () => 'hola';\n// v2\n");
    git(F.repo, 'commit', '-qam', 'v2');
    const d2 = await call(c, 'prepare_deployment', { workspace: 'demo' });
    await waitStatus(d2.data.deploymentId, ['prepared']);
    await call(c, 'validate_deployment', { deployment_id: d2.data.deploymentId });
    await waitStatus(d2.data.deploymentId, ['validated']);
    const stale = await call(c, 'deploy', { deployment_id: d2.data.deploymentId, expected_current_release: null });
    assert.equal(stale.data.error.code, 'VERSION_CONFLICT');
    await call(c, 'deploy', { deployment_id: d2.data.deploymentId, expected_current_release: d1.data.deploymentId });
    await waitStatus(d2.data.deploymentId, ['released']);
    assert.match(fs.readFileSync(path.join(F.target, 'current', 'index.html'), 'utf8'), /v2/);
    const rb = await call(c, 'rollback_deployment', { workspace: 'demo', to_deployment_id: d1.data.deploymentId });
    const rolled = await waitStatus(rb.data.deploymentId, ['rolled_back', 'rollback_failed']);
    assert.equal(rolled.status, 'rolled_back');
    assert.doesNotMatch(fs.readFileSync(path.join(F.target, 'current', 'index.html'), 'utf8'), /v2/);
    assert.equal(rolled.currentRelease.commit, head1);
    await c.close();
});

test('archivos grandes con transferencia autenticada, hash y versiones', async () => {
    const c = await connect(F.devToken);
    const bytes = crypto.randomBytes(300 * 1024);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const up = await call(c, 'create_upload', { name: 'video-ref.bin', size: bytes.length, sha256, project_id: 'proj-1' });
    const bad = await fetch(up.data.url.replace(/t=[^&]+/, 't=nope'), { method: 'PUT', body: bytes });
    assert.equal(bad.status, 401);
    const put = await fetch(up.data.url, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes });
    assert.equal(put.status, 201);
    const st = await call(c, 'get_upload', { upload_id: up.data.uploadId });
    assert.equal(st.data.status, 'completed');
    const link = await call(c, 'create_download_link', { file_id: st.data.result.id });
    const dl = Buffer.from(await (await fetch(link.data.url)).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(dl).digest('hex'), sha256);
    // Versiones de documentos: v2 sustituye a v1; recuperar v1 crea v3 sin borrar v2.
    const v1 = await call(c, 'attach_project_document', { project_id: 'proj-1', name: 'brief.md', content: '# v1' });
    const v2 = await call(c, 'attach_project_document', { project_id: 'proj-1', name: 'brief.md', content: '# v2' });
    assert.equal(v2.data.version, 2);
    const conflict = await call(c, 'restore_document_version', { file_id: v1.data.id, expected_current_id: v1.data.id });
    assert.equal(conflict.data.error.code, 'VERSION_CONFLICT');
    const v3 = await call(c, 'restore_document_version', { file_id: v1.data.id, expected_current_id: v2.data.id });
    assert.equal(v3.data.version, 3);
    const vers = await call(c, 'list_document_versions', { file_id: v1.data.id });
    assert.deepEqual(vers.data.versions.map(v => v.status), ['superseded', 'superseded', 'current']);
    await c.close();
});

test('decisiones: propuesta con procedencia y contradicciones, sin aprobación automática', async () => {
    const c = await connect(F.devToken);
    const r = await call(c, 'record_decision', { decision: 'Hang Out ya no será mobile first; primero web para mesas VIP', project_id: 'proj-1', topic: 'plataforma', provenance: { source: 'chatgpt', conversation_id: 'abc' } });
    assert.equal(r.data.status, 'proposed');
    assert.ok(r.data.possibleContradictions.some(x => x.id === 'dec-1'));
    const row = F.data.db.decisionLog.find(d => d.id === r.data.id);
    assert.equal(row.status, 'proposed');
    assert.equal(row.provenance.conversationId, 'abc');
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/);
    const list = await call(c, 'list_decisions', { project_id: 'proj-1' });
    assert.equal(list.data.decisions.find(d => d.id === 'dec-1').status, 'approved');
    const ctx = await call(c, 'get_context', {});
    assert.equal(ctx.data.timezone, 'America/Panama');
    assert.ok(ctx.data.more.length > 0);
    assert.ok(JSON.stringify(ctx.data).length < 6000, 'el contexto por defecto es breve');
    await c.close();
});

test('respuestas, logs y trabajos no exponen credenciales', async () => {
    const c = await connect(F.devToken);
    const f = await call(c, 'read_file', { workspace: 'demo', path: 'src/config.txt' });
    assert.equal(f.data.redacted, true);
    assert.doesNotMatch(f.text, new RegExp(FAKE_SECRET));
    const s = await call(c, 'search_files', { workspace: 'demo', query: 'api=' });
    assert.doesNotMatch(s.text, new RegExp(FAKE_SECRET));
    const job = await call(c, 'start_job', { workspace: 'demo', type: 'script', script: 'leak' });
    const done = await waitJob(c, job.data.id);
    const logs = await call(c, 'get_job_logs', { job_id: job.data.id });
    assert.equal(done.status, 'succeeded');
    assert.doesNotMatch(logs.data.text, new RegExp(FAKE_SECRET));
    assert.match(logs.data.text, /ENV=none/, 'el entorno del trabajo no hereda variables del proceso');
    // Un argumento con un secreto del entorno queda redactado en la auditoría.
    await call(c, 'search_knowledge', { query: `buscar ${ENV_SECRET}` });
    await sleep(100);
    const audit = fs.readFileSync(path.join(F.hubDir, 'activity.jsonl'), 'utf8');
    for (const secret of [FAKE_SECRET, ENV_SECRET, F.devToken, F.readToken]) assert.equal(audit.includes(secret), false, 'la auditoría no guarda secretos');
    assert.match(audit, /"opId":"op-/);
    const overview = JSON.stringify(await F.adminGet('/api/agent-hub/ops/overview'));
    for (const secret of [FAKE_SECRET, ENV_SECRET, F.devToken]) assert.equal(overview.includes(secret), false);
    for (const file of fs.readdirSync(path.join(F.hubDir, 'jobs')).filter(d => d.startsWith('job-'))) {
        const txt = fs.readFileSync(path.join(F.hubDir, 'jobs', file, 'log.txt'), 'utf8');
        assert.equal(txt.includes(FAKE_SECRET), false);
    }
    await c.close();
});
