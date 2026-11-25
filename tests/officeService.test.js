import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOfficeService } from '../src/services/office/officeService.js';

function setup({ run }) {
    let db = {
        agents: [{ id: 'agent-echo', name: 'Echo (Social)', model: 'gemini-3.8-flash', status: 'available' }],
        agentTasks: [{ id: 't1', task: 'Hooks para reel', assignedAgentId: 'agent-echo', assignedAgent: 'Echo (Social)', assignedKind: 'internal', status: 'queued' }],
        activityFeed: [],
    };
    const prompts = [];
    const events = [];
    const office = createOfficeService({
        readDB: () => structuredClone(db),
        writeDB: d => { db = structuredClone(d); },
        broadcast: type => events.push(type),
        getAgents: d => d.agents,
        buildPrompt: async opts => `PROMPT de ${opts.agentName}: ${opts.task}`,
        runModel: async ({ model, prompt }) => { prompts.push(prompt); return run(model, prompt); },
    });
    return { office, prompts, events, db: () => db };
}

const until = async fn => { for (let i = 0; i < 50 && !fn(); i++) await new Promise(r => setTimeout(r, 5)); };

test('officeService: un agente interno corre con su modelo, entrega a revisión y registra la corrida', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, prompts, events, db } = setup({ run: model => ({ text: '1. Hook A', tokensIn: 100, tokensOut: 20, costUSD: 0.001, provider: 'google', model, ms: 50 }) });
    const r = office.startInternalRun('t1');
    assert.equal(r.started, true);
    assert.equal(db().agents[0].status, 'executing');
    await until(() => db().agentTasks[0].status === 'review');

    const t = db().agentTasks[0];
    assert.equal(t.status, 'review');
    assert.equal(t.result, '1. Hook A');
    assert.equal(typeof prompts[0], 'string');
    assert.match(prompts[0], /Hooks para reel/);
    assert.equal(t.runs.length, 1);
    assert.equal(t.runs[0].model, 'gemini-3.8-flash');
    assert.equal(db().agents[0].status, 'available');
    assert.ok(events.includes('task_delivered'));

    const stats = office.computeStats(db(), office.allAgents(db())).agentStats['agent-echo'];
    assert.equal(stats.review, 1);
    assert.equal(stats.tokensIn + stats.tokensOut, 120);

    // Pedir cambios vuelve a correr con la corrección y la entrega anterior en el prompt.
    office.review('t1', { decision: 'changes', notes: 'Más cortos' });
    await until(() => db().agentTasks[0].runs.length === 2 && db().agentTasks[0].status === 'review');
    assert.equal(db().agentTasks[0].feedback[0].notes, 'Más cortos');
});

test('officeService: un error del modelo deja la tarea fallida con el motivo y libera al agente', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, db } = setup({ run: () => { throw new Error('cuota agotada'); } });
    office.startInternalRun('t1');
    await until(() => db().agentTasks[0].status === 'failed');
    assert.equal(db().agentTasks[0].error, 'cuota agotada');
    assert.equal(db().agentTasks[0].runs[0].ok, false);
    assert.equal(db().agents[0].status, 'available');
});

test('officeService: el kill switch descarta el resultado que llegue después', async () => {
    process.env.GEMINI_API_KEY = 'test';
    let release;
    const { office, db } = setup({ run: model => new Promise(res => { release = () => res({ text: 'tarde', tokensIn: 1, tokensOut: 1, provider: 'google', model, ms: 1 }); }) });
    office.startInternalRun('t1');
    await until(() => typeof release === 'function');
    office.haltAll();
    release();
    await new Promise(r => setTimeout(r, 20));
    assert.notEqual(db().agentTasks[0].status, 'review');
    assert.equal(db().agentTasks[0].result, undefined);
});

test('modelRunner: mensajes de error legibles y detección de modelos retirados', async () => {
    const { cleanError, resolveModel, defaultModel } = await import('../src/services/office/modelRunner.js');
    assert.equal(cleanError(new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand."}}')), 'This model is currently experiencing high demand.');
    assert.equal(cleanError(new Error('algo simple')), 'algo simple');
    assert.equal(resolveModel('gemini-2.5-flash'), defaultModel());
    assert.equal(resolveModel('claude-opus-5-5'), 'claude-opus-5-5');
});
