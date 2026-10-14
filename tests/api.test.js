// Pruebas de la API contra un servidor real con una copia temporal de la base.
// No toca db.json, BrainVault ni Supabase del proyecto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}/api`;
const PASSWORD = 'test-password';
const TOKEN = 'test-token';

let tmp, dbPath, server;

const seed = {
    events: [{ id: 'ev-1', name: 'Evento', status: 'activo' }],
    tasks: [
        { id: 't-1', text: 'Uno', done: false },
        { id: 't-2', text: 'Dos', done: true },
    ],
    contacts: [{ id: 'c-1', name: 'Ana' }],
    contentTasks: { ideas: [], production: [], ready: [], published: [] },
};

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const api = (p, opts = {}) => fetch(`${BASE}${p}`, { ...opts, headers: { ...auth, ...(opts.headers || {}) } });
const json = (body) => JSON.stringify(body);

before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-test-'));
    dbPath = path.join(tmp, 'db.json');
    fs.writeFileSync(dbPath, json(seed));
    server = spawn(process.execPath, ['server.js'], {
        cwd: ROOT,
        env: {
            ...process.env,
            PORT: String(PORT),
            DB_PATH: dbPath,
            VAULT_PATH: path.join(tmp, 'vault'),
            BRAIN_VAULT_DIR: path.join(tmp, 'BrainVault'),
            DASHBOARD_PASSWORD: PASSWORD,
            TEAM_PASSWORDS: 'MARIO:mario-secreto',
            API_TOKEN: TOKEN,
            SUPABASE_URL: '', SUPABASE_KEY: '', VITE_SUPABASE_URL: '', VITE_SUPABASE_KEY: '',
            RENDER: '',
        },
        stdio: 'ignore',
    });
    for (let i = 0; i < 100; i++) {
        try {
            const r = await fetch(`${BASE}/auth/session`);
            if (r.ok) return;
        } catch { /* todavía arrancando */ }
        await new Promise(r => setTimeout(r, 150));
    }
    throw new Error('El servidor de prueba no arrancó');
});

after(() => {
    server?.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('sin credenciales la API privada responde 401', async () => {
    for (const p of ['/tasks', '/contacts', '/state', '/openclaw/config', '/agent/whatsapp-groups']) {
        const r = await fetch(`${BASE}${p}`);
        assert.equal(r.status, 401, p);
    }
    const bad = await fetch(`${BASE}/tasks`, { headers: { Authorization: 'Bearer nope' } });
    assert.equal(bad.status, 401);
});

const login = (body) => fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json(body) });
const cookieOf = (res) => res.headers.get('set-cookie').split(';')[0];

test('login: pide usuario, contraseña mala 401, buena da cookie HttpOnly con el usuario', async () => {
    assert.equal((await login({ password: PASSWORD })).status, 400, 'sin usuario');
    assert.equal((await login({ user: 'GG', password: 'x' })).status, 401);

    const ok = await login({ user: 'gg', password: PASSWORD });
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('set-cookie'), /HttpOnly/);
    const cookie = cookieOf(ok);
    assert.equal((await fetch(`${BASE}/tasks`, { headers: { Cookie: cookie } })).status, 200);
    const session = await (await fetch(`${BASE}/auth/session`, { headers: { Cookie: cookie } })).json();
    assert.equal(session.user, 'GG');
    assert.deepEqual(session.personalPasswords, ['MARIO']);
});

test('contraseña individual: MARIO entra con la suya, no con la compartida', async () => {
    assert.equal((await login({ user: 'MARIO', password: PASSWORD })).status, 401);
    assert.equal((await login({ user: 'MARIO', password: 'mario-secreto' })).status, 200);
});

test('sesión manipulada (cambiar el usuario) no sirve', async () => {
    const cookie = cookieOf(await login({ user: 'ANDREA', password: PASSWORD }));
    const forged = cookie.replace(/\.ANDREA\./, '.MARIO.');
    assert.equal((await fetch(`${BASE}/tasks`, { headers: { Cookie: forged } })).status, 401);
});

test('se registra quién crea y completa tareas', async () => {
    const cookie = cookieOf(await login({ user: 'ANDREA', password: PASSWORD }));
    const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
    const created = await (await fetch(`${BASE}/tasks`, { method: 'POST', headers, body: json({ text: 'Con autora', status: 'pending' }) })).json();
    assert.equal(created.createdBy, 'ANDREA');
    const done = await (await fetch(`${BASE}/tasks/${created.id}`, { method: 'PUT', headers, body: json({ status: 'done' }) })).json();
    assert.equal(done.completedBy, 'ANDREA');
    assert.ok(done.completedAt);
    const reopened = await (await fetch(`${BASE}/tasks/${created.id}`, { method: 'PUT', headers, body: json({ status: 'pending' }) })).json();
    assert.equal(reopened.completedAt, undefined);
    const act = await (await fetch(`${BASE}/activity`, { method: 'POST', headers, body: json({ text: 'hola' }) })).json();
    assert.equal(act.user, 'ANDREA');
    await fetch(`${BASE}/tasks/${created.id}`, { method: 'DELETE', headers });
});

test('CORS no se abre a otros orígenes', async () => {
    const r = await api('/tasks', { headers: { Origin: 'https://evil.example' } });
    assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('PUT [] no borra una colección con datos sin confirmación', async () => {
    const r = await api('/tasks', { method: 'PUT', body: '[]' });
    assert.equal(r.status, 409);
    const tasks = await (await api('/tasks')).json();
    assert.equal(tasks.length, 2);
});

test('validación de tareas: estado inválido, id duplicado, done no booleano', async () => {
    assert.equal((await api('/tasks', { method: 'POST', body: json({ text: 'x', status: 'lol' }) })).status, 400);
    assert.equal((await api('/tasks', { method: 'POST', body: json({ id: 't-1', text: 'dup' }) })).status, 409);
    assert.equal((await api('/tasks/t-1', { method: 'PUT', body: json({ done: 'yes' }) })).status, 400);
});

test('status y done nunca se contradicen', async () => {
    let t = await (await api('/tasks/t-1', { method: 'PUT', body: json({ status: 'done', done: false }) })).json();
    assert.equal(t.status, 'done');
    assert.equal(t.done, true);
    t = await (await api('/tasks/t-1', { method: 'PUT', body: json({ done: false }) })).json();
    assert.equal(t.status, 'pending');
    assert.equal(t.done, false);
    const created = await (await api('/tasks', { method: 'POST', body: json({ text: 'nueva' }) })).json();
    assert.equal(created.status, 'pending');
    assert.equal(created.done, false);
});

test('los estados de evento se normalizan y se rechazan los inválidos', async () => {
    assert.equal((await api('/events/ev-1', { method: 'PUT', body: json({ status: 'lol' }) })).status, 400);
    const ev = await (await api('/events/ev-1', { method: 'PUT', body: json({ status: 'planeacion' }) })).json();
    assert.equal(ev.status, 'planificacion');
});

test('contentTasks se migra a lista y admite crear/editar', async () => {
    assert.equal((await api('/contentTasks', { method: 'POST', body: json({ id: 'ct-1', title: 'Reel' }) })).status, 201);
    const r = await api('/contentTasks/ct-1', { method: 'PUT', body: json({ title: 'Reel 2' }) });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).title, 'Reel 2');
});

test('/api/state solo descarga cuando hay cambios', async () => {
    const first = await (await api('/state')).json();
    assert.equal(first.changed, true);
    assert.ok(Array.isArray(first.data.tasks));
    const same = await (await api(`/state?since=${first.version}`)).json();
    assert.equal(same.changed, false);
    await new Promise(r => setTimeout(r, 20));
    await api('/contacts', { method: 'POST', body: json({ name: 'Nuevo' }) });
    const after = await (await api(`/state?since=${first.version}`)).json();
    assert.equal(after.changed, true);
});

test('100 creaciones simultáneas: sin pérdidas ni ids repetidos', async () => {
    const before = (await (await api('/tasks')).json()).length;
    await Promise.all([...Array(100)].map((_, i) => api('/tasks', { method: 'POST', body: json({ text: `carga ${i}` }) })));
    const tasks = await (await api('/tasks')).json();
    assert.equal(tasks.length, before + 100);
    assert.equal(new Set(tasks.map(t => t.id)).size, tasks.length);
});

test('si db.json está dañado no se escribe encima', async () => {
    const good = fs.readFileSync(dbPath, 'utf-8');
    fs.writeFileSync(dbPath, '{"events": [');
    try {
        const w = await api('/tasks', { method: 'POST', body: json({ text: 'x' }) });
        assert.equal(w.status, 500);
        assert.equal(fs.readFileSync(dbPath, 'utf-8'), '{"events": [');
    } finally {
        fs.writeFileSync(dbPath, good);
    }
});

test('la configuración nunca devuelve claves guardadas', async () => {
    await api('/openclaw/config', { method: 'POST', body: json({ geminiApiKey: 'secreto', apiKey: 'otro' }) });
    const cfg = await (await api('/openclaw/config')).json();
    assert.equal(cfg.geminiApiKey, undefined);
    assert.equal(cfg.apiKey, undefined);
    assert.equal(cfg.hasGeminiApiKey, true);
});

test('puente con OpenClaw: sin Mac → 409; con puente → entrega el mensaje y devuelve la respuesta', async () => {
    const cookie = cookieOf(await login({ user: 'GG', password: PASSWORD }));
    const ask = () => fetch(`${BASE}/bart/orchestrator`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: json({ prompt: 'hola Bart' }) });

    const offline = await ask();
    assert.equal(offline.status, 409);
    assert.equal((await offline.json()).offline, true);

    // Un usuario normal no puede hacerse pasar por el puente
    assert.equal((await fetch(`${BASE}/bridge/next`, { headers: { Cookie: cookie } })).status, 403);

    // El "Mac" abre un long-poll con el API_TOKEN y queda conectado
    const poll = api('/bridge/next?agentId=bart&agentName=Bart&gateway=ok');
    await new Promise(r => setTimeout(r, 100));
    const status = await (await fetch(`${BASE}/bridge/status`, { headers: { Cookie: cookie } })).json();
    assert.equal(status.online, true);
    assert.equal(status.agentId, 'bart');

    const answer = ask();
    const { job } = await (await poll).json();
    assert.equal(job.prompt, 'hola Bart');
    assert.equal(job.user, 'GG');
    await api('/bridge/reply', { method: 'POST', body: json({ id: job.id, reply: 'Hola GG, soy Bart' }) });
    const res = await answer;
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.reply, 'Hola GG, soy Bart');
    assert.equal(body.via, 'openclaw');
});

test('instalador del puente: público y sin rutas fuera de la lista', async () => {
    assert.equal((await fetch(`http://127.0.0.1:${PORT}/bridge/setup-mac.sh`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${PORT}/bridge/SKILL.md`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${PORT}/bridge/..%2Fserver.js`)).status, 404);
});
