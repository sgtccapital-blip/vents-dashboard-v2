// Pruebas de la API contra un servidor real con una copia temporal de la base.
// No toca db.json, BrainVault ni Supabase del proyecto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Puerto libre asignado por el sistema (uno al azar podía chocar con otro servicio local).
const PORT = await new Promise((resolve, reject) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
        const { port } = srv.address();
        srv.close(() => resolve(port));
    }).on('error', reject);
});
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
            API_TOKEN: TOKEN,
            SUPABASE_URL: '', SUPABASE_KEY: '', VITE_SUPABASE_URL: '', VITE_SUPABASE_KEY: '',
            RENDER: '',
            // El motor de conocimiento no debe llamar a Gemini ni leer la carpeta de Descargas real.
            GEMINI_API_KEY: '',
            KNOWLEDGE_EMBEDDER: 'none',
            CHATGPT_EXPORT_DIR: path.join(tmp, 'downloads'),
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

after(async () => {
    // Al recibir SIGTERM el servidor guarda el índice de conocimiento: se espera a que termine antes de borrar.
    if (server && server.exitCode === null) await new Promise(r => { server.once('exit', r); server.kill(); });
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('sin credenciales la API privada responde 401', async () => {
    for (const p of ['/tasks', '/contacts', '/state', '/openclaw/config', '/agent/whatsapp-groups', '/jarvis/skills', '/jarvis/openjarvis/status']) {
        const r = await fetch(`${BASE}${p}`);
        assert.equal(r.status, 401, p);
    }
    const bad = await fetch(`${BASE}/tasks`, { headers: { Authorization: 'Bearer nope' } });
    assert.equal(bad.status, 401);
    // Jarvis ejecuta comandos locales: nunca sin sesión
    const exec = await fetch(`${BASE}/jarvis/openjarvis/exec`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ command: 'doctor' }) });
    assert.equal(exec.status, 401);
});

test('login: contraseña mala 401, buena da cookie HttpOnly que funciona', async () => {
    const bad = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ password: 'x' }) });
    assert.equal(bad.status, 401);

    const ok = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ password: PASSWORD }) });
    assert.equal(ok.status, 200);
    const cookie = ok.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    const r = await fetch(`${BASE}/tasks`, { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(r.status, 200);
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

test('las tareas se guardan con un solo formato aunque lleguen con nombres distintos', async () => {
    const created = await (await api('/tasks', { method: 'POST', body: json({ title: 'Con alias', dueDate: '2026-12-01', assignee: 'Dalia' }) })).json();
    let stored = await (await api(`/tasks/${created.id}`)).json();
    assert.equal(stored.text, 'Con alias');
    assert.equal(stored.due, '2026-12-01');
    assert.equal(stored.assignedTo, 'Dalia');
    assert.equal(stored.projectId, null);

    // Cambiar un nombre actualiza también su alias: nunca quedan dos fechas distintas.
    await api(`/tasks/${created.id}`, { method: 'PUT', body: json({ due: '2026-12-05' }) });
    stored = await (await api(`/tasks/${created.id}`)).json();
    assert.equal(stored.due, '2026-12-05');
    assert.equal(stored.dueDate, '2026-12-05');
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

test('jarvis skills: listar, crear, controlar música, pedir comida y ejecutar macro', async () => {
    // 1. Listar skills iniciales
    const skillsRes = await api('/jarvis/skills');
    assert.equal(skillsRes.status, 200);
    const skills = await skillsRes.json();
    assert.ok(Array.isArray(skills));
    assert.ok(skills.length >= 3);

    // 2. Control de música
    const musicRes = await api('/jarvis/music', {
        method: 'POST',
        body: json({ action: 'play', preset: 'casco_sunset', volume: 85 })
    });
    assert.equal(musicRes.status, 200);
    const musicData = await musicRes.json();
    assert.equal(musicData.success, true);
    assert.equal(musicData.music.preset, 'casco_sunset');

    // 3. Orden de comida
    const foodRes = await api('/jarvis/food', {
        method: 'POST',
        body: json({
            restaurant: 'Sushi Market Casco',
            items: ['Dragon Roll', 'Spicy Tuna Bowl'],
            diners: ['Gabriel', 'Joshua', 'Suira']
        })
    });
    assert.equal(foodRes.status, 200);
    const foodData = await foodRes.json();
    assert.equal(foodData.success, true);
    assert.equal(foodData.order.restaurant, 'Sushi Market Casco');

    // 4. Enseñar nueva habilidad
    const newSkillRes = await api('/jarvis/skills', {
        method: 'POST',
        body: json({
            name: 'Modo Noche Furia VIP',
            trigger: 'noche furia',
            category: 'musica',
            description: 'Enciende alta energía y setea luces',
            steps: [
                { type: 'music', preset: 'furia' },
                { type: 'notification', text: 'Noche Furia iniciada' }
            ]
        })
    });
    assert.equal(newSkillRes.status, 200);
    const newSkill = (await newSkillRes.json()).skill;
    assert.equal(newSkill.trigger, 'noche furia');

    // 5. Ejecutar habilidad
    const execRes = await api('/jarvis/execute', {
        method: 'POST',
        body: json({ skillNameOrTrigger: 'noche furia' })
    });
    assert.equal(execRes.status, 200);
    const execData = await execRes.json();
    assert.equal(execData.success, true);
    assert.ok(execData.executedSteps.length >= 2);

    // 6. Estado de Jarvis
    const stateRes = await api('/jarvis/state');
    assert.equal(stateRes.status, 200);
    const stateData = await stateRes.json();
    assert.ok(stateData.skillsCount >= 4);

    // 7. OpenJarvis Engine Status & Exec
    const ojStatus = await api('/jarvis/openjarvis/status');
    assert.equal(ojStatus.status, 200);
    const ojData = await ojStatus.json();
    assert.equal(ojData.installed, true);
    assert.ok(ojData.version);

    const ojExec = await api('/jarvis/openjarvis/exec', {
        method: 'POST',
        body: json({ command: '--version' })
    });
    assert.equal(ojExec.status, 200);
    const ojExecData = await ojExec.json();
    assert.equal(ojExecData.success, true);
});

test('jarvis config: se guarda y solo acepta campos conocidos', async () => {
    const def = await (await api('/jarvis/config')).json();
    assert.equal(def.voiceName, 'Charon');
    assert.equal(def.language, 'auto');
    const saved = await (await api('/jarvis/config', { method: 'POST', body: json({ voiceName: 'Orus', language: 'en', hack: 'x' }) })).json();
    assert.equal(saved.voiceName, 'Orus');
    assert.equal(saved.language, 'en');
    assert.equal(saved.hack, undefined);
    const tts = await api('/jarvis/tts', { method: 'POST', body: json({ text: '' }) });
    assert.ok([400, 503].includes(tts.status));
});

test('jarvis live tools: snapshot del dashboard y solo herramientas conocidas', async () => {
    const snap = await (await api('/jarvis/live/tool', { method: 'POST', body: json({ name: 'get_dashboard_snapshot' }) })).json();
    assert.equal(typeof snap.result.totalEvents, 'number');
    assert.ok(Array.isArray(snap.result.activeTasks));
    const bad = await api('/jarvis/live/tool', { method: 'POST', body: json({ name: 'rm_rf' }) });
    assert.equal(bad.status, 400);
    const task = await (await api('/jarvis/live/tool', { method: 'POST', body: json({ name: 'add_task', args: { text: 'Desde Jarvis en vivo' } }) })).json();
    assert.ok(task.result);
});

test('conocimiento: importa la exportación de ChatGPT y el RAG la encuentra', async () => {
    const r401 = await fetch(`${BASE}/knowledge/status`);
    assert.equal(r401.status, 401);

    const conv = {
        id: 'conv-test', title: 'Plan de precios Hang Out', create_time: 1760000000, update_time: 1760000500, current_node: 'b',
        mapping: {
            a: { id: 'a', parent: null, children: ['b'], message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['Definamos el precio de la entrada de Hang Out: quince dólares en preventa'] } } },
            b: { id: 'b', parent: 'a', children: [], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['Perfecto, preventa a 15 y puerta a 20.'] } } },
        },
    };
    const form = new FormData();
    form.append('file', new Blob([JSON.stringify([conv])], { type: 'application/json' }), 'conversations.json');
    const imp = await (await fetch(`${BASE}/knowledge/chatgpt/import`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form })).json();
    assert.equal(imp.added, 1);

    // Sin IA configurada queda indexada en crudo (solo palabras clave), sin perderse.
    let status;
    for (let i = 0; i < 50; i++) {
        status = await (await api('/knowledge/status')).json();
        if (!status.worker.running && status.chatgpt.indexedRaw === 1) break;
        await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(status.chatgpt.indexedRaw, 1);

    const found = await (await api('/knowledge/search', { method: 'POST', body: json({ query: 'precio preventa hang out' }) })).json();
    assert.equal(found.results[0].docId, 'chatgpt:conv-test');

    const brain = await (await api('/brain/query', { method: 'POST', body: json({ question: 'precio de la preventa' }) })).json();
    assert.ok(brain.context.includes('preventa'));

    const detail = await (await api('/knowledge/chatgpt/conversations/conv-test')).json();
    assert.equal(detail.messages.length, 2);

    const mem = await api('/knowledge/memory', { method: 'POST', body: json({ title: 'Nota de agente', content: 'El venue Furia cierra a las 3am', agent: 'test' }) });
    assert.equal(mem.status, 201);
    const memFound = await (await api('/knowledge/search', { method: 'POST', body: json({ query: 'Furia cierra', source: 'memory' }) })).json();
    assert.equal(memFound.count, 1);
});

test('hub de agentes: MCP con tokens por agente, permisos y registro de actividad', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const ROOT_URL = BASE.replace(/\/api$/, '');
    const connect = async (url, headers = {}) => {
        const client = new Client({ name: 'test-agent', version: '1.0.0' });
        await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));
        return client;
    };

    // Sin token: 401
    const anon = await fetch(`${ROOT_URL}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    assert.equal(anon.status, 401);

    const writer = await (await api('/agent-hub/tokens', { method: 'POST', body: json({ name: 'Claude Code', scope: 'write' }) })).json();
    const reader = await (await api('/agent-hub/tokens', { method: 'POST', body: json({ name: 'Solo lectura', scope: 'read' }) })).json();
    assert.match(writer.token, /^cc_/);
    assert.equal(writer.record.hash, undefined);

    const client = await connect(`${ROOT_URL}/mcp`, { Authorization: `Bearer ${writer.token}` });
    const names = (await client.listTools()).tools.map(t => t.name);
    for (const n of ['get_context', 'search_knowledge', 'get_project', 'list_tasks', 'create_task', 'update_task', 'save_memory', 'log_activity', 'get_sync_status', 'list_recent_conversation_updates', 'get_conversation_summary', 'reprocess_conversation', 'capture_conversation_knowledge']) assert.ok(names.includes(n), n);

    const ctx = JSON.parse((await client.callTool({ name: 'get_context', arguments: {} })).content[0].text);
    assert.equal(typeof ctx.tasks.pending, 'number');
    const sync = JSON.parse((await client.callTool({ name: 'get_sync_status', arguments: {} })).content[0].text);
    assert.equal(typeof sync.total, 'number');
    assert.ok(Array.isArray(ctx.recentConversationUpdates));

    const created = JSON.parse((await client.callTool({ name: 'create_task', arguments: { text: 'Tarea creada por MCP', priority: 'high' } })).content[0].text);
    assert.equal(created.status, 'pending');
    const done = JSON.parse((await client.callTool({ name: 'update_task', arguments: { id: created.id, status: 'done', note: 'listo' } })).content[0].text);
    assert.equal(done.status, 'done');
    const stored = await (await api(`/tasks/${created.id}`)).json();
    assert.equal(stored.createdBy, 'Claude Code');

    // Formato que exige ChatGPT: search → { results: [{ id, title, url }] }, fetch → { id, title, text, url }
    const found = JSON.parse((await client.callTool({ name: 'search', arguments: { query: 'precio preventa hang out' } })).content[0].text);
    assert.ok(found.results.length > 0 && found.results.every(r => r.id && r.title && r.url));
    const doc = JSON.parse((await client.callTool({ name: 'fetch', arguments: { id: found.results[0].id } })).content[0].text);
    assert.ok(doc.text.length > 0 && doc.url);

    const bad = await client.callTool({ name: 'get_project', arguments: { project: 'no-existe-xyz' } });
    assert.equal(bad.isError, true);
    await client.close();

    // Token de solo lectura: no ve herramientas de escritura. El token también funciona en la URL.
    const ro = await connect(`${ROOT_URL}/mcp/${reader.token}`);
    const roNames = (await ro.listTools()).tools.map(t => t.name);
    assert.ok(roNames.includes('search_knowledge') && roNames.includes('get_sync_status') && !roNames.includes('create_task') && !roNames.includes('reprocess_conversation'));
    await ro.close();

    const activity = await (await api('/agent-hub/activity?agent=Claude%20Code')).json();
    assert.ok(activity.some(a => a.tool === 'create_task' && a.ok));
    assert.ok(activity.some(a => a.tool === 'get_project' && !a.ok));
    const feed = await (await api('/activity')).json();
    assert.ok(feed.some(a => a.text.includes('Claude Code')));

    // Revocado: deja de funcionar
    await api(`/agent-hub/tokens/${reader.record.id}`, { method: 'DELETE' });
    const revoked = await fetch(`${ROOT_URL}/mcp/${reader.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: json({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    assert.equal(revoked.status, 401);
});

test('ingesta de la extensión: requiere llave con escritura y suma conversaciones al RAG', async () => {
    const ROOT_URL = BASE.replace(/\/api$/, '');
    const tasksBefore = (await (await api('/tasks')).json()).length;
    const eventsBefore = (await (await api('/events')).json()).length;
    assert.equal((await fetch(`${ROOT_URL}/ingest/chatgpt/state`)).status, 401);
    const ro = await (await api('/agent-hub/tokens', { method: 'POST', body: json({ name: 'RO', scope: 'read' }) })).json();
    assert.equal((await fetch(`${ROOT_URL}/ingest/chatgpt/state`, { headers: { Authorization: `Bearer ${ro.token}` } })).status, 403);

    const ext = await (await api('/agent-hub/tokens', { method: 'POST', body: json({ name: 'ChatGPT Sync', scope: 'write' }) })).json();
    const h = { Authorization: `Bearer ${ext.token}`, 'Content-Type': 'application/json' };
    const v2 = { ...h, 'X-Extension-Version': '1.1.3' };
    assert.equal((await fetch(`${ROOT_URL}/ingest/chatgpt/state`, { headers: v2 })).status, 400);
    const conv = {
        id: 'ext-1', title: 'Idea de merch Hang Out', update_time: 1764000000, create_time: 1763990000, current_node: 'b',
        mapping: {
            a: { id: 'a', parent: null, children: ['b'], message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['Quiero vender gorras de Hang Out a 25 dólares'] } } },
            b: { id: 'b', parent: 'a', children: [], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['Buena idea, empieza con 50 unidades.'] } } },
        },
    };
    const r = await (await fetch(`${ROOT_URL}/ingest/chatgpt/conversations`, { method: 'POST', headers: h, body: json({ conversations: [conv] }) })).json();
    assert.equal(r.added, 1);
    const state = await (await fetch(`${ROOT_URL}/ingest/chatgpt/state`, { headers: h })).json();
    assert.ok(state.known['ext-1']);
    await fetch(`${ROOT_URL}/ingest/chatgpt/report`, { method: 'POST', headers: h, body: json({ scanned: 10, changed: 1, sent: 1 }) });

    let found;
    for (let i = 0; i < 30; i++) {
        found = await (await api('/knowledge/search', { method: 'POST', body: json({ query: 'gorras merch hang out' }) })).json();
        if (found.results[0]?.docId === 'chatgpt:ext-1') break;
        await new Promise(res => setTimeout(res, 100));
    }
    assert.equal(found.results[0].docId, 'chatgpt:ext-1');
    const st = await (await api('/knowledge/status')).json();
    assert.equal(st.chatgpt.extension.run.scanned, 10);
    assert.equal((await fetch(`${ROOT_URL}/ingest/chatgpt/conversations`, { method: 'POST', headers: v2, body: json({ conversations: [conv] }) })).status, 400);
    const identified = await (await fetch(`${ROOT_URL}/ingest/chatgpt/conversations`, { method: 'POST', headers: v2, body: json({ conversations: [conv], identity: { accountId: 'a', workspaceId: 'personal' } }) })).json();
    assert.equal(identified.added + identified.updated, 1);
    assert.equal((await (await api('/tasks')).json()).length, tasksBefore);
    assert.equal((await (await api('/events')).json()).length, eventsBefore);
});
