import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOfficeService } from '../src/services/office/officeService.js';
import { createArtifactStore, extractFileBlocks } from '../src/services/office/artifacts.js';

function setup({ run, artifacts = null, onApproved = null }) {
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
        runModel: async ({ model, prompt, attachments }) => { prompts.push(prompt); return run(model, prompt, attachments); },
        artifacts, onApproved,
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

test('artifacts: extrae los archivos que escribe el modelo y deja el resumen', () => {
    const out = extractFileBlocks('Listo.\n<<<ARCHIVO: propuesta.md>>>\n# Propuesta\nTexto\n<<<FIN ARCHIVO>>>\nFalta enviarla.');
    assert.equal(out.files.length, 1);
    assert.equal(out.files[0].name, 'propuesta.md');
    assert.equal(out.files[0].content, '# Propuesta\nTexto');
    assert.match(out.text, /Archivo creado: propuesta.md/);
    assert.match(out.text, /Falta enviarla/);
});

test('officeService: el agente interno lee los archivos de la tarea, crea documentos y deja su informe; aprobar lo indexa', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'office-files-'));
    const indexed = [];
    let seenMedia = [];
    const { office, prompts, db } = setup({
        artifacts: createArtifactStore({ dir }),
        onApproved: async (task, files) => { indexed.push({ task: task.id, files: files.map(f => f.name) }); return ['memory:1']; },
        run: (model, prompt, attachments) => {
            seenMedia = attachments;
            return { text: 'Hice la propuesta.\n<<<ARCHIVO: propuesta-hotel.md>>>\n# Propuesta Hotel\n<<<FIN ARCHIVO>>>', tokensIn: 10, tokensOut: 10, provider: 'google', model, ms: 5 };
        },
    });
    try {
        office.attachFiles('t1', [
            { name: 'brief.txt', content: 'Presupuesto 3000 USD' },
            { name: 'foto.png', content: Buffer.from('89504e470d0a1a0a', 'hex'), mime: 'image/png' },
        ]);
        office.startInternalRun('t1');
        await until(() => db().agentTasks[0].status === 'review');
        assert.match(prompts[0], /Presupuesto 3000 USD/, 'El brief del CEO entra al prompt');
        assert.match(prompts[0], /<<<ARCHIVO:/, 'Se le explica cómo crear archivos');
        assert.equal(seenMedia.length, 1, 'La imagen se le pasa al modelo');

        const t = db().agentTasks[0];
        const byName = Object.fromEntries(t.artifacts.map(f => [f.name, f]));
        assert.equal(byName['propuesta-hotel.md'].role, 'deliverable');
        const report = t.artifacts.find(f => f.role === 'report');
        assert.ok(report, 'Queda un informe de lo que hizo');
        assert.match(fs.readFileSync(path.join(dir, 't1', byName['propuesta-hotel.md'].file), 'utf-8'), /Propuesta Hotel/);
        assert.match(t.result, /Hice la propuesta/);

        // Seguimiento: hereda archivos por referencia y el nuevo agente los lee.
        const child = office.createFollowUp('t1', { task: 'Enviar la propuesta', fileIds: ['propuesta-hotel.md'], autoRun: false });
        assert.equal(child.parentTaskId, 't1');
        assert.equal(child.artifacts[0].inheritedFrom, 't1');
        assert.equal(child.assignedAgentId, 'open');

        office.review('t1', { decision: 'approve' });
        await until(() => (db().agentTasks.find(x => x.id === 't1').knowledgeDocIds || []).length);
        assert.deepEqual(indexed[0].files, ['propuesta-hotel.md']);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('modelRunner: catálogo de OpenRouter, búsqueda por nombre y validación', async () => {
    const { openRouterCatalog, searchModels, isKnownModel, listModels, estimateCost } = await import('../src/services/office/modelRunner.js');
    const data = [
        { id: 'anthropic/claude-sonnet-5', name: 'Anthropic: Claude Sonnet 5', context_length: 1000000, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] }, pricing: { prompt: '0.000003', completion: '0.000015' } },
        { id: 'meta-llama/llama-4-70b:free', name: 'Meta: Llama 4 70B (free)', context_length: 131072, architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' } },
        { id: 'openrouter/auto', name: 'Auto Router', architecture: {}, pricing: { prompt: '-1', completion: '-1' } },
        { id: 'google/gemini-4-neon:batch', name: 'Gemini 4 Neon (batch)', architecture: {}, pricing: { prompt: '0.000001', completion: '0.000002' } },
        { id: 'black-forest/flux', name: 'Flux', architecture: { output_modalities: ['image'] }, pricing: { prompt: '0', completion: '0' } },
    ];
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, json: async () => ({ data }) }; };
    const { models } = await openRouterCatalog({ force: true, fetchImpl });
    assert.equal(models.length, 3, 'sin :batch ni modelos que no devuelven texto');
    await openRouterCatalog({ fetchImpl });
    assert.equal(calls, 1, 'la segunda vez sale de la caché');

    const sonnet = models.find(m => m.slug === 'anthropic/claude-sonnet-5');
    assert.equal(sonnet.id, 'openrouter/anthropic/claude-sonnet-5');
    assert.deepEqual(sonnet.price, [3, 15]);
    assert.equal(sonnet.vision, true);
    assert.equal(models.find(m => m.slug === 'meta-llama/llama-4-70b:free').free, true);
    assert.equal(models.find(m => m.slug === 'openrouter/auto').price, null, 'precio variable');

    assert.deepEqual(searchModels(models, 'llama 70b').map(m => m.slug), ['meta-llama/llama-4-70b:free']);
    assert.deepEqual(searchModels(models, 'CLAUDE').map(m => m.slug), ['anthropic/claude-sonnet-5']);
    assert.equal(searchModels(models, '').length, 3);

    assert.equal(await isKnownModel('openrouter/anthropic/claude-sonnet-5'), true);
    assert.equal(await isKnownModel('openrouter/nadie/no-existe'), false);
    assert.equal(await isKnownModel('gemini-3.8-flash'), true);
    assert.equal(await isKnownModel('cualquier-cosa'), false);

    const list = listModels(['openrouter/anthropic/claude-sonnet-5', 'openrouter/x/sin-cache', 'gemini-3.8-flash']);
    assert.equal(list.models.find(m => m.id === 'openrouter/anthropic/claude-sonnet-5').label, 'Anthropic: Claude Sonnet 5');
    assert.equal(list.models.find(m => m.id === 'openrouter/x/sin-cache').label, 'x/sin-cache');
    assert.equal(estimateCost('openrouter/anthropic/claude-sonnet-5', 1e6, 1e6), 18);
});
