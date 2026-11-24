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
    assert.ok(data.rooms.length >= 10, 'Debe incluir las salas');
    assert.equal(data.stats.systemStatus, 'nominal');

    // Verificar que BART (COO) existe y está disponible
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
    assert.equal(data.status, 'in_progress');

    // Verificar que el estado de Nexus se actualizó a executing en la oficina
    const stateRes = await api('/office/state');
    const stateData = await stateRes.json();
    const nexus = stateData.agents.find(a => a.id === 'agent-nexus');
    assert.equal(nexus.status, 'executing');
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

    // Verificar que aparece en la lista de aprobaciones
    const stateRes = await api('/office/state');
    const stateData = await stateRes.json();
    assert.ok(stateData.approvals.length > 0);
    const pendingAppr = stateData.approvals[0];
    assert.equal(pendingAppr.status, 'pending');

    // Aprobar la solicitud como CEO
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

test('AI Office HQ: Kill Switch detiene inmediatamente las operaciones activas', async () => {
    const r = await api('/office/kill-switch', {
        method: 'POST'
    });

    assert.equal(r.status, 200);
    const stateRes = await api('/office/state');
    const stateData = await stateRes.json();
    assert.equal(stateData.stats.activeExecuting, 0, 'No deben quedar agentes en ejecución activa tras kill switch');
});
