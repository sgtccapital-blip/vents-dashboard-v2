import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const PORT = await new Promise((resolve, reject) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
        const { port } = srv.address();
        srv.close(() => resolve(port));
    }).on('error', reject);
});
const BASE = `http://127.0.0.1:${PORT}/api`;
const PASSWORD = 'test-password';
const TOKEN = 'test-token';

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const api = (p, opts = {}) => fetch(`${BASE}${p}`, { ...opts, headers: { ...auth, ...(opts.headers || {}) } });

let tmp, dbPath, server;

const seed = {
    agents: [],
    agentTasks: [],
    approvalRequests: [],
    activityFeed: [],
    events: [{ id: 'ev-1', name: 'HangOut Panamá', status: 'activo' }],
    tasks: [],
    notes: [],
    whatsappCampaigns: [],
    projects: [{ id: 'proj-hangout', name: 'HangOut Panamá', category: 'project' }]
};

before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'office-test-'));
    dbPath = path.join(tmp, 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify(seed));

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
            GEMINI_API_KEY: '',
            CHATGPT_EXPORT_DIR: path.join(tmp, 'downloads'),
        },
        stdio: 'ignore'
    });

    for (let i = 0; i < 100; i++) {
        try {
            const r = await fetch(`${BASE}/auth/session`);
            if (r.ok) return;
        } catch { /* todavía arrancando */ }
        await new Promise(r => setTimeout(r, 150));
    }
    throw new Error('Servidor no levantó a tiempo para pruebas de oficina');
});

after(async () => {
    if (server && server.exitCode === null) {
        await new Promise(r => { server.once('exit', r); server.kill(); });
    }
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

test('AI Office HQ: /api/office/state devuelve agentes, salas y métricas nominales', async () => {
    const r = await api('/office/state');
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.success, true);
    assert.ok(data.agents.length >= 8, 'Debe incluir al menos los 8 agentes clave');
    assert.ok(data.departments.length >= 7, 'Debe incluir los departamentos');
    assert.ok(data.rooms.length >= 8, 'Debe incluir las salas');
    assert.equal(data.stats.systemStatus, 'nominal');

    const bart = data.agents.find(a => a.id === 'agent-bart');
    assert.ok(bart, 'BART debe estar en el roster');
    assert.equal(bart.role, 'Chief Operating Officer & Head Orchestrator');
});

test('AI Office HQ: Escenario de prueba — "Campaña de lanzamiento de HangOut Panamá" es triada por BART a Nexus (Marketing)', async () => {
    const r = await api('/office/dispatch', {
        method: 'POST',
        body: JSON.stringify({
            mission: 'Preparar la campaña de lanzamiento y ads para HangOut Panamá',
            priority: 'high',
            companyName: 'HangOut Panamá'
        })
    });

    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.success, true);
    assert.equal(data.assignedAgent, 'Nexus (Marketing)', 'BART debe delegar misiones de lanzamiento a Nexus');
    assert.ok(data.priorityScore > 6, 'Prioridad alta debe tener score > 6');
    // Sin llave de Gemini en las pruebas: la tarea queda en cola explicando qué falta, no simula que corre.
    assert.equal(data.status, 'queued');

    const stateRes = await api('/office/state');
    const stateData = await stateRes.json();
    const task = stateData.activeTasks.find(t => t.id === data.task.id);
    assert.match(task.currentStep, /no está configurado/);
    const nexus = stateData.agents.find(a => a.id === 'agent-nexus');
    assert.equal(nexus.kind, 'internal');
    assert.notEqual(nexus.status, 'executing');
});

test('AI Office HQ: Gobernanza — Misión de alto presupuesto (> $5000) genera solicitud de aprobación para el CEO', async () => {
    const r = await api('/office/dispatch', {
        method: 'POST',
        body: JSON.stringify({
            mission: 'Contratación de vallas publicitarias en Cinta Costera para HangOut Panamá',
            estimatedBudget: 6500,
            priority: 'high'
        })
    });

    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.status, 'waiting_approval');
    assert.equal(data.autonomyLevel, 4);

    const stateRes = await api('/office/state');
    const stateData = await stateRes.json();
    assert.ok(stateData.approvals.length > 0);
    const pendingAppr = stateData.approvals[0];
    assert.equal(pendingAppr.status, 'pending');

    const decideRes = await api(`/office/approval/${pendingAppr.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
            decision: 'approved',
            notes: 'Aprobado por el CEO para arrancar campaña.'
        })
    });

    assert.equal(decideRes.status, 200);
    const decideData = await decideRes.json();
    assert.equal(decideData.approval.status, 'approved');
});

test('AI Office HQ: War Room — Simula deliberación multiagente con entregables accionables', async () => {
    const r = await api('/office/war-room/simulate', {
        method: 'POST',
        body: JSON.stringify({
            topic: 'Activación nocturna HangOut Panamá con DJs',
            companyName: 'HangOut Panamá'
        })
    });

    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.success, true);
    assert.ok(data.turns.length >= 5, 'Debe incluir al menos 5 turnos de diálogo');
    assert.ok(data.deliverables.length >= 3, 'Debe incluir al menos 3 entregables');

    // Probar inyección de un entregable en el dashboard
    const deliv = data.deliverables[0];
    const injectRes = await api('/office/deliverable/inject', {
        method: 'POST',
        body: JSON.stringify({
            type: deliv.type,
            title: deliv.title,
            assignedAgent: deliv.assignedAgent
        })
    });

    assert.equal(injectRes.status, 200);
    const injectData = await injectRes.json();
    assert.equal(injectData.success, true);
});

test('AI Office HQ: Kill Switch detiene inmediatamente las operaciones activas', async () => {
    const r = await api('/office/kill-switch', {
        method: 'POST'
    });

    assert.equal(r.status, 200);
    const stateRes = await api('/office/state');
    const stateData = await stateRes.json();
    assert.equal(stateData.stats.activeExecuting, 0, 'No deben quedar agentes en ejecución activa tras kill switch');
});

test('AI Office HQ: Creación y listado de documentos por agente', async () => {
    const r = await api('/office/agent/agent-echo/document', {
        method: 'POST',
        body: JSON.stringify({
            title: 'Guion TikTok #1 Lanzamiento HangOut',
            type: 'script',
            content: 'POV: Descubriendo la terraza secreta de Casco Antiguo...',
            company: 'HangOut Panamá'
        })
    });

    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.success, true);
    assert.equal(data.document.title, 'Guion TikTok #1 Lanzamiento HangOut');
    assert.equal(data.document.agentId, 'agent-echo');

    // Listar documentos del agente
    const listRes = await api('/office/agent/agent-echo/documents');
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(listData.documents.length >= 1);
});

test('AI Office HQ: Avance gradual y aprobación de tareas de agente', async () => {
    // 1. Crear una tarea para probar avance
    const dispRes = await api('/office/dispatch', {
        method: 'POST',
        body: JSON.stringify({
            mission: 'Diseñar flyers promocionales de apertura',
            priority: 'medium',
            companyName: 'HangOut Panamá'
        })
    });
    const dispData = await dispRes.json();
    const taskId = dispData.task.id;

    // 2. Avanzar paso (+25%)
    const progRes = await api(`/office/task/${taskId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
            currentStep: 'Bocetos preliminares generados',
            progress: 50,
            status: 'in_progress'
        })
    });
    assert.equal(progRes.status, 200);
    const progData = await progRes.json();
    assert.equal(progData.task.progress, 50);
    assert.equal(progData.task.currentStep, 'Bocetos preliminares generados');

    // 3. Aprobar tarea por el CEO o BART
    const apprRes = await api(`/office/task/${taskId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
            approver: 'Gabriel (CEO)',
            notes: 'Aprobado excelente diseño'
        })
    });
    assert.equal(apprRes.status, 200);
    const apprData = await apprRes.json();
    assert.equal(apprData.task.status, 'done');
    assert.equal(apprData.task.progress, 100);
});

test('AI Office HQ: Canal de filtro (inbox) lista tickets en disco y tareas activas', async () => {
    const r = await api('/office/inbox');
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.diskTickets));
    assert.ok(Array.isArray(data.activeTasks));
});

const ROOT_URL = BASE.replace(/\/api$/, '');

async function mcpCall(token, name, args = {}) {
    const r = await fetch(`${ROOT_URL}/mcp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
    });
    const data = await r.json();
    const res = data.result;
    assert.ok(res, `MCP sin resultado: ${JSON.stringify(data)}`);
    if (res.isError) throw new Error(res.content[0].text);
    return JSON.parse(res.content[0].text);
}

test('AI Office HQ: modelos por agente — catálogo multi-proveedor y cambio de modelo', async () => {
    const models = await (await api('/office/models')).json();
    const providers = models.providers.map(p => p.id);
    for (const p of ['google', 'anthropic', 'openai']) assert.ok(providers.includes(p), `Falta proveedor ${p}`);
    assert.ok(models.models.some(m => m.id === 'claude-opus-5-5'));

    const ok = await api('/office/agent/agent-echo/config', { method: 'POST', body: JSON.stringify({ model: 'claude-sonnet-5-5' }) });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).agent.model, 'claude-sonnet-5-5');

    const bad = await api('/office/agent/agent-echo/config', { method: 'POST', body: JSON.stringify({ model: 'modelo-inventado' }) });
    assert.equal(bad.status, 400);

    // Sin ANTHROPIC_API_KEY la corrida no arranca y lo explica.
    const disp = await (await api('/office/dispatch', { method: 'POST', body: JSON.stringify({ mission: 'Guion de reels para el fin de semana', targetAgent: 'agent-echo' }) })).json();
    assert.equal(disp.status, 'queued');
    const task = (await (await api(`/office/task/${disp.task.id}`)).json()).task;
    assert.equal(task.model, 'claude-sonnet-5-5');
    assert.match(task.currentStep, /ANTHROPIC_API_KEY/);
});

test('AI Office HQ: agente externo por MCP toma, avanza y entrega; el CEO revisa', async () => {
    const created = await (await api('/agent-hub/tokens', { method: 'POST', body: JSON.stringify({ name: 'Claude Code (Mac)', scope: 'write' }) })).json();
    const token = created.token;
    const extId = `ext-${created.record.id}`;

    // Aparece en la oficina como agente conectado.
    let state = await (await api('/office/state')).json();
    const ext = state.agents.find(a => a.id === extId);
    assert.ok(ext, 'El agente conectado debe aparecer en la oficina');
    assert.equal(ext.kind, 'external');

    const disp = await (await api('/office/dispatch', { method: 'POST', body: JSON.stringify({ mission: 'Investigar 3 venues nuevos en Casco Antiguo', targetAgent: extId }) })).json();
    assert.equal(disp.assignedAgent, 'Claude Code (Mac)');
    assert.equal(disp.status, 'queued');
    const taskId = disp.task.id;

    const mine = await mcpCall(token, 'get_my_office_tasks', { include_open: false });
    assert.ok(mine.tasks.some(t => t.id === taskId));

    await mcpCall(token, 'claim_office_task', { task_id: taskId });
    const prog = await mcpCall(token, 'report_office_progress', { task_id: taskId, progress: 50, step: 'Comparando precios' });
    assert.equal(prog.progress, 50);
    const sub = await mcpCall(token, 'submit_office_result', { task_id: taskId, result: '# Venues\n1. A\n2. B\n3. C', model: 'claude-opus-5-5' });
    assert.equal(sub.status, 'review');

    // Otro agente no puede tocar una tarea ajena.
    const other = await (await api('/agent-hub/tokens', { method: 'POST', body: JSON.stringify({ name: 'Otro agente', scope: 'write' }) })).json();
    await assert.rejects(() => mcpCall(other.token, 'claim_office_task', { task_id: taskId }), /asignada a/);

    // El CEO pide cambios: vuelve a la cola del mismo agente con la corrección.
    const changes = await api(`/office/task/${taskId}/review`, { method: 'POST', body: JSON.stringify({ decision: 'changes', notes: 'Agrega capacidad de cada venue' }) });
    assert.equal(changes.status, 200);
    const again = await mcpCall(token, 'get_my_office_tasks', { include_open: false });
    const t = again.tasks.find(x => x.id === taskId);
    assert.equal(t.status, 'queued');
    assert.equal(t.feedback[0].notes, 'Agrega capacidad de cada venue');
    assert.ok(t.previousResult.includes('Venues'));

    await mcpCall(token, 'claim_office_task', { task_id: taskId });
    await mcpCall(token, 'submit_office_result', { task_id: taskId, result: '# Venues con capacidad' });
    const approve = await (await api(`/office/task/${taskId}/review`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) })).json();
    assert.equal(approve.task.status, 'done');

    state = await (await api('/office/state')).json();
    const st = state.metrics.agentStats[extId];
    assert.equal(st.done, 1);
    assert.equal(st.runs, 2);
    assert.ok(state.completedTasks.some(x => x.id === taskId));
});
