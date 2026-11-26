import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOfficeService } from '../src/services/office/officeService.js';
import { createArtifactStore, extractFileBlocks } from '../src/services/office/artifacts.js';
import { createAgentTools, parseToolCalls, toolInstructions } from '../src/services/office/agentTools.js';

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

test('modelRunner: si el proveedor principal falla, responde el respaldo de otro proveedor', async () => {
    const { runModel } = await import('../src/services/office/modelRunner.js');
    const saved = { g: process.env.GEMINI_API_KEY, o: process.env.OPENROUTER_API_KEY };
    process.env.GEMINI_API_KEY = 'test';
    process.env.OPENROUTER_API_KEY = 'test';
    try {
        const calls = [];
        const runners = {
            google: async m => { calls.push(m); throw new Error('API key not valid'); },
            openrouter: async m => { calls.push(m); return { text: 'hecho', tokensIn: 10, tokensOut: 5, costFromProvider: 0.0001 }; },
        };
        const out = await runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [], runners, fallbacks: ['openrouter/deepseek/deepseek-v4.1-flash'] });
        assert.equal(out.model, 'openrouter/deepseek/deepseek-v4.1-flash');
        assert.equal(out.provider, 'openrouter');
        assert.equal(out.fallbackFrom, 'gemini-3.8-flash');
        assert.equal(out.failures[0].model, 'gemini-3.8-flash');
        assert.equal(out.costUSD, 0.0001);
        assert.equal(calls[0], 'gemini-3.8-flash', 'error no pasajero: no reintenta el mismo modelo');

        // Proveedor principal sin llave: va directo al respaldo.
        delete process.env.GEMINI_API_KEY;
        const out2 = await runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [], runners, fallbacks: ['openrouter/x/y'] });
        assert.equal(out2.model, 'openrouter/x/y');

        // Un modelo colgado no bloquea: pasa al respaldo cuando vence el tiempo.
        process.env.GEMINI_API_KEY = 'test';
        const hang = { google: () => new Promise(() => {}), openrouter: runners.openrouter };
        const out3 = await runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [0], runners: hang, fallbacks: ['openrouter/x/y'], timeoutMs: 30 });
        assert.equal(out3.model, 'openrouter/x/y');
        assert.match(out3.failures[0].error, /no respondió/);
        delete process.env.GEMINI_API_KEY;

        // Todos fallan: el error resume cada intento.
        runners.openrouter = async () => { throw new Error('sin saldo'); };
        await assert.rejects(runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [], runners, fallbacks: ['openrouter/x/y'] }), /openrouter\/x\/y: sin saldo/);
        // Sin respaldo y sin llave: el error de siempre.
        await assert.rejects(runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [], runners }), /no está configurado/);
    } finally {
        process.env.GEMINI_API_KEY = saved.g ?? '';
        if (saved.o === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = saved.o;
    }
});

test('router: BART elige con IA, valida la respuesta y cae a palabras clave si falla', async () => {
    const { routeMission, keywordRoute, parseRouterReply } = await import('../src/services/office/router.js');
    const agents = [
        { id: 'agent-bart', name: 'BART (COO)', role: 'COO', kind: 'internal' },
        { id: 'agent-echo', name: 'Echo (Social)', role: 'Social media', kind: 'internal' },
        { id: 'agent-pulse', name: 'Pulse', role: 'WhatsApp', kind: 'internal' },
    ];
    const accounts = [{ id: 'ignite', name: 'IGNITE CLUB', handler: '@theigniteclubb' }];

    assert.equal(keywordRoute('Haz un reel', agents).agentId, 'agent-echo');
    assert.equal(keywordRoute('Algo raro', agents).agentId, 'agent-bart');

    const parsed = parseRouterReply('Claro: {"agentId":"agent-echo","confidence":1.4,"reason":"Es contenido","alternatives":[{"agentId":"agent-pulse","reason":"difusión"},{"agentId":"nadie"}],"account":"ignite"}', agents, accounts);
    assert.equal(parsed.confidence, 1);
    assert.equal(parsed.alternatives.length, 1);
    assert.equal(parsed.account, 'ignite');
    assert.throws(() => parseRouterReply('{"agentId":"agent-x"}', agents), /no existe/);

    const saved = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test';
    try {
        let prompt = '';
        const ok = await routeMission({
            mission: 'Mensaje para invitar a la fiesta de Ignite', agents, accounts, load: { 'agent-echo': 3 },
            runModel: async opts => { prompt = opts.prompt; return { text: '{"agentId":"agent-pulse","confidence":0.8,"reason":"Es una invitación por WhatsApp","alternatives":[],"account":"ignite"}', model: opts.model }; },
        });
        assert.equal(ok.by, 'ai');
        assert.equal(ok.agentId, 'agent-pulse');
        assert.equal(ok.account, 'ignite');
        assert.match(prompt, /tareas abiertas: 3/);
        assert.match(prompt, /@theigniteclubb/);

        const bad = await routeMission({ mission: 'Haz un reel', agents, runModel: async () => ({ text: 'no sé' }) });
        assert.equal(bad.by, 'keywords');
        assert.equal(bad.agentId, 'agent-echo');
        assert.match(bad.fallbackReason, /JSON/);

        const slow = await routeMission({ mission: 'Haz un reel', agents, timeoutMs: 20, runModel: () => new Promise(() => {}) });
        assert.equal(slow.by, 'keywords');
        assert.match(slow.fallbackReason, /tardó/);
    } finally {
        process.env.GEMINI_API_KEY = saved ?? '';
    }
});

test('brandContext: detecta la cuenta de la tarea y carga su ADN y línea de marca', async () => {
    const { createBrandContext } = await import('../src/services/office/brandContext.js');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
    const brands = path.join(tmp, 'brands');
    const dna = path.join(tmp, 'content-dna');
    fs.mkdirSync(path.join(brands, 'ignite'), { recursive: true });
    fs.mkdirSync(path.join(brands, 'elemento'), { recursive: true });
    fs.writeFileSync(path.join(brands, 'ignite', 'brand.json'), JSON.stringify({ slug: 'ignite', name: 'IGNITE CLUB', handler: '@theigniteclubb', driveAliases: ['ignite'] }));
    fs.writeFileSync(path.join(brands, 'ignite', 'BRAND.md'), '# IGNITE — Línea gráfica\nRojo #E3262B');
    fs.writeFileSync(path.join(brands, 'elemento', 'brand.json'), JSON.stringify({ slug: 'elemento', name: 'ELEMENTO', handler: '@Elemento.techno', driveAliases: ['elemento'] }));
    fs.mkdirSync(path.join(dna, 'theigniteclubb'), { recursive: true });
    fs.writeFileSync(path.join(dna, 'theigniteclubb', 'DNA.md'), '# ADN — @theigniteclubb\nTono: eléctrico');
    fs.mkdirSync(path.join(dna, 'music-pty'), { recursive: true });
    fs.writeFileSync(path.join(dna, 'music-pty', 'DNA.md'), '# ADN de contenido — @Music.pty\n\n> Instagram · Booking');

    const bc = createBrandContext({ brandsDir: brands, contentDnaDir: dna });
    assert.equal(bc.detect('3 hooks para el reel de Ignite del sábado')?.id, 'ignite');
    assert.equal(bc.detect('Post para @theigniteclubb')?.id, 'ignite');
    assert.equal(bc.detect('Revisa cada elemento del montaje'), null, 'palabra común en minúscula no es la marca');
    assert.equal(bc.detect('Flyer de Elemento para el viernes')?.id, 'elemento');
    assert.equal(bc.detect('booking para music pty')?.id, 'music-pty');
    assert.equal(bc.detect('Contrato con el proveedor de barra'), null);

    const loaded = bc.load('ignite');
    assert.deepEqual(loaded.files.map(f => f.name), ['DNA.md', 'BRAND.md']);
    assert.match(loaded.files[0].text, /eléctrico/);
    assert.equal(bc.load('no-existe'), null);
});

test('officeService: las revisiones con comentario quedan como lecciones y el agente las recibe con su contexto', async () => {
    process.env.GEMINI_API_KEY = 'test';
    let db = {
        agents: [{ id: 'agent-echo', name: 'Echo (Social)', model: 'gemini-3.8-flash', status: 'available', fallbackModels: [] }],
        agentTasks: [{ id: 't1', task: 'Hooks para reel', assignedAgentId: 'agent-echo', assignedAgent: 'Echo (Social)', assignedKind: 'internal', status: 'queued', account: { id: 'ignite', name: 'IGNITE CLUB' } }],
        activityFeed: [],
    };
    const calls = [];
    const office = createOfficeService({
        readDB: () => structuredClone(db),
        writeDB: d => { db = structuredClone(d); },
        getAgents: d => d.agents,
        buildPrompt: async opts => { calls.push(opts); return { prompt: `PROMPT ${opts.task}`, context: { knowledge: [{ title: 'Doc', relevance: 100 }], lessons: opts.lessons } }; },
        runModel: async ({ model }) => ({ text: 'Hook A', tokensIn: 1, tokensOut: 1, provider: 'google', model, ms: 5 }),
    });
    office.startInternalRun('t1');
    await until(() => db.agentTasks[0].status === 'review');
    assert.equal(calls[0].accountId, 'ignite');
    assert.deepEqual(calls[0].lessons, []);
    assert.equal(db.agentTasks[0].runs[0].context.knowledge[0].title, 'Doc');

    office.review('t1', { decision: 'changes', notes: 'Menos emojis, más directo' });
    await until(() => db.agentTasks[0].runs.length === 2 && db.agentTasks[0].status === 'review');
    assert.equal(calls[1].lessons.length, 1);
    assert.equal(calls[1].lessons[0].notes, 'Menos emojis, más directo');
    assert.equal(calls[1].lessons[0].kind, 'changes');

    office.review('t1', { decision: 'approve', notes: 'Así me gusta' });
    const lessons = office.listLessons('agent-echo');
    assert.deepEqual(lessons.map(l => l.kind), ['approve', 'changes']);
    office.removeLesson(lessons[1].id);
    assert.equal(office.listLessons('agent-echo').length, 1);
    assert.throws(() => office.removeLesson('nada'), /no encontrada/);
    // Aprobar sin comentario no crea lección.
    assert.equal((db.agentLessons || []).length, 1);
});

test('modelRunner: si responde un modelo hermano del mismo proveedor, queda marcado como respaldo', async () => {
    const { runModel } = await import('../src/services/office/modelRunner.js');
    const saved = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test';
    try {
        const runners = { google: async m => { if (m === 'gemini-3.8-flash') throw Object.assign(new Error('503 UNAVAILABLE'), { status: 503 }); return { text: 'ok', tokensIn: 1, tokensOut: 1 }; } };
        const out = await runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [], runners });
        assert.equal(out.model, 'gemini-3.6-flash');
        assert.equal(out.fallbackFrom, 'gemini-3.8-flash');
    } finally {
        process.env.GEMINI_API_KEY = saved ?? '';
    }
});

// ─── Fase 2: herramientas, preguntas, traspasos, misiones, presupuesto y calidad por modelo ───
function setup2({ replies, agents, tasks, extra = {} }) {
    let db = {
        agents: agents || [
            { id: 'agent-echo', name: 'Echo (Social)', role: 'Social', model: 'gemini-3.8-flash', status: 'available', fallbackModels: [] },
            { id: 'agent-pulse', name: 'Pulse', role: 'WhatsApp', model: 'gemini-3.8-flash', status: 'available', fallbackModels: [] },
            { id: 'agent-bart', name: 'BART (COO)', role: 'COO', model: 'gemini-3.8-flash', status: 'available', fallbackModels: [] },
        ],
        agentTasks: tasks || [{ id: 't1', task: 'Hooks para reel', assignedAgentId: 'agent-echo', assignedAgent: 'Echo (Social)', assignedKind: 'internal', status: 'queued' }],
        activityFeed: [],
        ...extra,
    };
    const prompts = [];
    const searches = [];
    const queue = [...replies];
    const office = createOfficeService({
        readDB: () => structuredClone(db),
        writeDB: d => { db = structuredClone(d); },
        getAgents: d => d.agents,
        buildPrompt: async opts => ({ prompt: `PROMPT ${opts.task}\n${opts.description || ''}`, context: { knowledge: [], lessons: opts.lessons } }),
        runModel: async ({ model, prompt }) => {
            prompts.push(prompt);
            const next = queue.length ? queue.shift() : 'Entrega final';
            return { text: typeof next === 'function' ? next(prompt) : next, tokensIn: 10, tokensOut: 5, costUSD: 0.01, provider: 'google', model, ms: 5 };
        },
        tools: createAgentTools({
            searchKnowledge: async q => { searches.push(q.query); return { results: [{ docId: 'd1', doc: { title: 'Precios 2026' }, text: 'Mesa VIP: $300' }] }; },
            readDB: () => structuredClone(db),
            agentsFor: () => db.agents,
        }),
    });
    return { office, prompts, searches, db: () => db };
}

test('herramientas: el agente busca en la memoria, recibe el resultado y luego entrega', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, prompts, searches, db } = setup2({ replies: [
        'Voy a buscar.\n<<<HERRAMIENTA buscar_memoria>>>\n{"consulta": "precio mesa VIP"}\n<<<FIN HERRAMIENTA>>>',
        'La mesa VIP cuesta $300.',
    ] });
    office.startInternalRun('t1');
    await until(() => db().agentTasks[0].status === 'review');
    const t = db().agentTasks[0];
    assert.equal(t.result, 'La mesa VIP cuesta $300.');
    assert.deepEqual(searches, ['precio mesa VIP']);
    assert.equal(prompts.length, 2);
    assert.match(prompts[0], /HERRAMIENTAS \(opcionales\)/);
    assert.match(prompts[1], /Mesa VIP: \$300/);
    const run = t.runs[0];
    assert.equal(run.steps.length, 1);
    assert.equal(run.steps[0].tool, 'buscar_memoria');
    assert.equal(run.tokensIn, 20, 'suma los tokens de todos los turnos');
    assert.equal(run.costUSD, 0.02);
});

test('herramientas: sin herramientas activadas el agente entrega en un solo turno; el último turno no acepta herramientas', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const off = setup2({ replies: ['Directo'] , agents: [{ id: 'agent-echo', name: 'Echo', model: 'gemini-3.8-flash', toolsEnabled: false, fallbackModels: [] }] });
    off.office.startInternalRun('t1');
    await until(() => off.db().agentTasks[0].status === 'review');
    assert.doesNotMatch(off.prompts[0], /HERRAMIENTAS/);

    const loop = '<<<HERRAMIENTA buscar_memoria>>>\n{"consulta": "x"}\n<<<FIN HERRAMIENTA>>>';
    const busy = setup2({ replies: Array(10).fill(loop) });
    busy.office.startInternalRun('t1');
    await until(() => busy.db().agentTasks[0].status !== 'in_progress' && busy.db().agentTasks[0].status !== 'queued');
    assert.equal(busy.prompts.length, 6, 'máximo 6 turnos');
    assert.match(busy.prompts[5], /YA NO PUEDES USAR HERRAMIENTAS/);
});

test('preguntar_al_ceo: la tarea se pausa con la pregunta y tu respuesta no se guarda como lección', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, prompts, db } = setup2({ replies: [
        '<<<HERRAMIENTA preguntar_al_ceo>>>\n{"pregunta": "¿Para qué fecha es?"}\n<<<FIN HERRAMIENTA>>>',
        'Listo para el sábado 30.',
    ] });
    office.startInternalRun('t1');
    await until(() => db().agentTasks[0].status === 'review');
    assert.equal(db().agentTasks[0].question.text, '¿Para qué fecha es?');
    assert.match(db().agentTasks[0].currentStep, /pregunta/);

    office.review('t1', { decision: 'changes', notes: 'Sábado 30' });
    await until(() => db().agentTasks[0].status === 'review' && !db().agentTasks[0].question);
    assert.equal(db().agentTasks[0].result, 'Listo para el sábado 30.');
    assert.match(prompts[1], /Respuesta del CEO a tu pregunta «¿Para qué fecha es\?»: Sábado 30/);
    assert.equal((db().agentLessons || []).length, 0);
    assert.equal(db().agentTasks[0].feedback[0].answer, true);
});

test('pasar_tarea: el traspaso propuesto se crea al aprobar, con los archivos de la entrega', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, db } = setup2({ replies: [
        '<<<HERRAMIENTA pasar_tarea>>>\n{"agente": "agent-pulse", "tarea": "Mandar el copy por WhatsApp"}\n<<<FIN HERRAMIENTA>>>',
        'Copy listo: Hola VIP',
    ] });
    office.startInternalRun('t1');
    await until(() => db().agentTasks.find(t => t.id === 't1').status === 'review');
    const t1 = db().agentTasks.find(t => t.id === 't1');
    assert.equal(t1.proposedHandoffs.length, 1);
    assert.equal(t1.proposedHandoffs[0].agentId, 'agent-pulse');

    office.review('t1', { decision: 'approve' });
    const child = db().agentTasks.find(t => t.parentTaskId === 't1');
    assert.ok(child, 'se creó la tarea para Pulse');
    assert.equal(child.assignedAgentId, 'agent-pulse');
    assert.equal(db().agentTasks.find(t => t.id === 't1').proposedHandoffs[0].createdTaskId, child.id);
});

test('misiones: cada paso arranca al aprobar el anterior, recibe su entrega y la misión se cierra al final', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, prompts, db } = setup2({ tasks: [], replies: ['Cotización: $500', 'Propuesta final con $500'] });
    const { mission, steps } = office.createMission({
        mission: 'Propuesta para Hotel Central', steps: [
            { agentId: 'agent-pulse', task: 'Cotizar', why: 'conoce precios' },
            { agentId: 'agent-echo', task: 'Redactar la propuesta' },
        ],
    });
    assert.equal(steps[1].status, 'blocked');
    assert.throws(() => office.startInternalRun(steps[1].id), /espera que termine el anterior/);
    assert.throws(() => office.startInternalRun(mission.id), /avanza sola/);
    await until(() => db().agentTasks.find(t => t.id === steps[0].id).status === 'review');
    assert.match(db().agentTasks.find(t => t.id === mission.id).currentStep, /Paso 1 de 2: Pulse — entregó/);
    assert.equal(db().agentTasks.find(t => t.id === steps[1].id).status, 'blocked', 'sin autoAdvance espera tu aprobación');

    office.review(steps[0].id, { decision: 'approve' });
    await until(() => db().agentTasks.find(t => t.id === steps[1].id).status === 'review');
    assert.match(prompts[1], /ENTREGA DEL PASO 1 \(Pulse\):\nCotización: \$500/);

    office.review(steps[1].id, { decision: 'approve' });
    const parent = db().agentTasks.find(t => t.id === mission.id);
    assert.equal(parent.status, 'done');
    assert.match(parent.result, /Paso 2: Redactar la propuesta/);
});

test('misiones: descartar un paso detiene la misión; con autoAdvance el siguiente arranca al entregar', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const a = setup2({ tasks: [], replies: ['uno', 'dos', 'tres'] });
    const m = a.office.createMission({ mission: 'M', steps: [{ agentId: 'agent-pulse', task: 'A' }, { agentId: 'agent-echo', task: 'B' }, { agentId: 'agent-pulse', task: 'C' }] });
    await until(() => a.db().agentTasks.find(t => t.id === m.steps[0].id).status === 'review');
    a.office.review(m.steps[0].id, { decision: 'reject', notes: 'No va' });
    assert.equal(a.db().agentTasks.find(t => t.id === m.mission.id).status, 'failed');
    assert.equal(a.db().agentTasks.find(t => t.id === m.steps[2].id).status, 'cancelled');

    const b = setup2({ tasks: [], replies: ['uno', 'dos'] });
    const m2 = b.office.createMission({ mission: 'M', autoAdvance: true, steps: [{ agentId: 'agent-pulse', task: 'A' }, { agentId: 'agent-echo', task: 'B' }] });
    await until(() => b.db().agentTasks.find(t => t.id === m2.steps[1].id).status === 'review');
    assert.equal(b.db().agentTasks.find(t => t.id === m2.steps[0].id).status, 'review', 'el paso 1 sigue esperando tu revisión');
});

test('presupuesto: al llegar al tope la tarea pide aprobación; aprobada, corre', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const month = new Date().toISOString().slice(0, 7);
    const { office, db } = setup2({
        replies: ['ok'],
        agents: [{ id: 'agent-echo', name: 'Echo', model: 'gemini-3.8-flash', monthlyBudgetUSD: 1, fallbackModels: [] }],
        tasks: [
            { id: 'old', task: 'vieja', assignedAgentId: 'agent-echo', status: 'done', runs: [{ at: `${month}-01T10:00:00Z`, agentId: 'agent-echo', model: 'gemini-3.8-flash', ok: true, costUSD: 1.2 }] },
            { id: 't1', task: 'nueva', assignedAgentId: 'agent-echo', assignedAgent: 'Echo', assignedKind: 'internal', status: 'queued' },
        ],
    });
    assert.deepEqual(office.budgetStatus('agent-echo'), { month, spent: 1.2, limit: 1, pct: 120 });
    const r = office.startInternalRun('t1');
    assert.equal(r.started, false);
    const t = db().agentTasks.find(x => x.id === 't1');
    assert.equal(t.status, 'waiting_approval');
    assert.equal(db().approvalRequests[0].kind, 'budget');
    office.startInternalRun('t1');
    assert.equal(db().approvalRequests.length, 1, 'no duplica la solicitud');

    const d = db();
    d.agentTasks.find(x => x.id === 't1').budgetOverride = true;
    d.agentTasks.find(x => x.id === 't1').status = 'queued';
    assert.equal(office.startInternalRun('t1').started, true);
});

test('calidad por modelo: aprobadas, a la primera, cambios, fallos y costo por aprobada', () => {
    const { office } = setup2({ replies: [] });
    const run = (model, extra = {}) => ({ at: '2026-11-01T00:00:00Z', agentId: 'agent-echo', model, provider: 'google', ok: true, costUSD: 0.1, ms: 1000, ...extra });
    const db = {
        agents: [{ id: 'agent-echo', name: 'Echo', model: 'm1' }],
        agentTasks: [
            { id: 'a', assignedAgentId: 'agent-echo', status: 'done', runs: [run('m1')] },
            { id: 'b', assignedAgentId: 'agent-echo', status: 'done', feedback: [{ notes: 'cambia' }], runs: [run('m1'), run('m1')] },
            { id: 'c', assignedAgentId: 'agent-echo', status: 'cancelled', runs: [run('m1')] },
            { id: 'd', assignedAgentId: 'agent-echo', status: 'failed', runs: [run('m2', { ok: false, costUSD: null })] },
            { id: 'e', assignedAgentId: 'agent-echo', status: 'done', feedback: [{ notes: 'x', answer: true }], runs: [run('m2', { steps: [{ tool: 'buscar_memoria' }] })] },
        ],
    };
    const by = Object.fromEntries(office.computeStats(db, office.allAgents(db)).byModel.map(m => [m.model, m]));
    assert.equal(by.m1.delivered, 3);
    assert.equal(by.m1.approved, 2);
    assert.equal(by.m1.approvalRate, 67);
    assert.equal(by.m1.firstTryRate, 50);
    assert.equal(by.m1.changes, 1);
    assert.equal(by.m1.costPerApproved, 0.2);
    assert.equal(by.m2.failRate, 50);
    assert.equal(by.m2.firstTryRate, 100, 'responder una pregunta no cuenta como cambio');
    assert.equal(by.m2.toolRuns, 1);
});

test('parseToolCalls: lee varios bloques y marca el JSON roto', () => {
    const calls = parseToolCalls('a\n<<<HERRAMIENTA leer_marca>>>\n{"cuenta":"Ignite"}\n<<<FIN HERRAMIENTA>>>\n<<<HERRAMIENTA buscar_memoria>>>\n{roto\n<<<FIN HERRAMIENTA>>>');
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], { name: 'leer_marca', input: { cuenta: 'Ignite' } });
    assert.match(calls[1].input._error, /No es JSON/);
});

test('router: propone pasos solo si son 2 o más agentes distintos', async () => {
    const { parseRouterReply } = await import('../src/services/office/router.js');
    const agents = [{ id: 'a' }, { id: 'b' }];
    const ok = parseRouterReply('{"agentId":"a","confidence":0.7,"reason":"r","steps":[{"agentId":"a","task":"uno"},{"agentId":"b","task":"dos","why":"w"}]}', agents);
    assert.deepEqual(ok.steps.map(s => s.agentId), ['a', 'b']);
    assert.equal(parseRouterReply('{"agentId":"a","steps":[{"agentId":"a","task":"uno"},{"agentId":"a","task":"dos"}]}', agents).steps.length, 0);
    assert.equal(parseRouterReply('{"agentId":"a","steps":[{"agentId":"zz","task":"uno"},{"agentId":"b","task":"dos"}]}', agents).steps.length, 0);
    assert.equal(parseRouterReply('{"agentId":"a"}', agents).steps.length, 0);
});

test('misiones: un traspaso al agente del paso siguiente no se duplica', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, prompts, db } = setup2({ tasks: [], replies: [
        '<<<HERRAMIENTA pasar_tarea>>>\n{"agente": "agent-echo", "tarea": "Redactar"}\n<<<FIN HERRAMIENTA>>>',
        'Costos listos',
        'Propuesta',
    ] });
    const { steps } = office.createMission({ mission: 'M', steps: [{ agentId: 'agent-pulse', task: 'Cotizar' }, { agentId: 'agent-echo', task: 'Redactar' }] });
    await until(() => db().agentTasks.find(t => t.id === steps[0].id).status === 'review');
    assert.match(prompts[0], /eres el paso 1 de 2/);
    assert.doesNotMatch(prompts[0].split('AGENTES A LOS QUE PUEDES PASAR TRABAJO')[1] || '', /agent-echo/);
    office.review(steps[0].id, { decision: 'approve' });
    const echoTasks = db().agentTasks.filter(t => t.assignedAgentId === 'agent-echo');
    assert.equal(echoTasks.length, 1, 'solo el paso 2 de la misión');
    assert.match(db().agentTasks.find(t => t.id === steps[0].id).proposedHandoffs[0].skipped, /paso 2/);
});

// ─── Fase 3: recurrentes, avisos al teléfono y hub MCP para agentes internos ───
test('recurrentes: próxima ejecución en hora de Panamá para cada frecuencia', async () => {
    const { nextRun, normalizeCadence, describeCadence } = await import('../src/services/office/schedules.js');
    // Martes 25-nov-2026 08:00 en Panamá = 13:00 UTC
    const from = new Date('2026-11-25T13:00:00Z');
    assert.equal(nextRun(normalizeCadence({ every: 'daily', time: '09:00' }), from).toISOString(), '2026-11-25T14:00:00.000Z');
    assert.equal(nextRun(normalizeCadence({ every: 'daily', time: '07:30' }), from).toISOString(), '2026-11-26T12:30:00.000Z');
    // Viernes 27 a las 18:00 → la siguiente de lunes a viernes es el lunes 30
    assert.equal(nextRun(normalizeCadence({ every: 'weekdays', time: '09:00' }), new Date('2026-11-27T23:00:00Z')).toISOString(), '2026-11-30T14:00:00.000Z');
    // Semanal lunes y jueves desde el miércoles 25 → jueves 26
    assert.equal(nextRun(normalizeCadence({ every: 'weekly', time: '09:00', days: [4, 1] }), from).toISOString(), '2026-11-26T14:00:00.000Z');
    // Día 31 en febrero → último día del mes
    assert.equal(nextRun(normalizeCadence({ every: 'monthly', time: '09:00', monthDay: 31 }), new Date('2027-02-01T00:00:00Z')).toISOString(), '2027-02-28T14:00:00.000Z');
    // A las 23:30 de Panamá ya es el día siguiente en UTC: no debe saltarse el día
    assert.equal(nextRun(normalizeCadence({ every: 'daily', time: '23:30' }), from).toISOString(), '2026-11-26T04:30:00.000Z');
    assert.equal(describeCadence(normalizeCadence({ every: 'weekly', time: '9:05', days: [1, 4] })), 'Cada lunes y jueves a las 09:05');
    assert.throws(() => normalizeCadence({ every: 'weekly', days: [] }), /al menos un día/);
    assert.throws(() => normalizeCadence({ every: 'daily', time: '25:00' }), /HH:MM/);
    assert.throws(() => normalizeCadence({ every: 'hourly' }), /Frecuencia no válida/);
});

test('recurrentes: el reloj crea la tarea, arranca sola y no apila copias si la anterior sigue abierta', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const { office, db } = setup2({ tasks: [], replies: ['Resumen listo', 'Otro'] });
    const sc = office.saveSchedule({ agentId: 'agent-echo', task: 'Resumen del lunes', cadence: { every: 'daily', time: '09:00' } });
    assert.ok(sc.nextRunAt);
    assert.equal(sc.cadenceText, 'Todos los días a las 09:00');
    assert.deepEqual(office.tickSchedules(new Date(Date.parse(sc.nextRunAt) - 1000)), [], 'antes de la hora no hace nada');

    const due = new Date(Date.parse(sc.nextRunAt) + 1000);
    const [r] = office.tickSchedules(due);
    assert.equal(r.created, true);
    const t = db().agentTasks.find(x => x.id === r.taskId);
    assert.equal(t.scheduleId, sc.id);
    assert.equal(t.delegatedBy, 'Programación');
    await until(() => db().agentTasks.find(x => x.id === r.taskId).status === 'review');
    const after = db().officeSchedules[0];
    assert.equal(Date.parse(after.nextRunAt) - Date.parse(sc.nextRunAt), 24 * 3600 * 1000, 'la próxima pasa al día siguiente');

    // La de ayer sigue en revisión → la vuelta de hoy se salta
    const [r2] = office.tickSchedules(new Date(Date.parse(after.nextRunAt) + 1000));
    assert.equal(r2.created, false);
    assert.equal(db().officeSchedules[0].skipped, 1);
    // «Correr ahora» sí crea aunque haya una abierta y no mueve la próxima fecha
    const before = db().officeSchedules[0].nextRunAt;
    assert.equal(office.runSchedule(sc.id, { manual: true }).created, true);
    assert.equal(db().officeSchedules[0].nextRunAt, before);

    office.saveSchedule({ enabled: false }, sc.id);
    assert.equal(db().officeSchedules[0].nextRunAt, null);
    office.removeSchedule(sc.id);
    assert.equal(db().officeSchedules.length, 0);
});

test('avisos: ntfy solo para los eventos activos, con enlace a la tarea, sin repetir y sin romper nada si falla', async () => {
    const { createNotifier, notifySettings, normalizeNotifyInput } = await import('../src/services/office/notify.js');
    let db = { officeSettings: {} };
    const sent = [];
    let fail = false;
    const n = createNotifier({
        readDB: () => db, env: {}, publicUrl: () => 'https://cc.example.test/',
        fetchImpl: async (url, opts) => { sent.push({ url, body: JSON.parse(opts.body), headers: opts.headers }); return fail ? { ok: false, status: 429 } : { ok: true }; },
    });
    assert.equal(notifySettings(db, {}).enabled, false);
    assert.equal((await n.send('delivered', { title: 'x', taskId: 't1' })).skipped, 'desactivado');

    db.officeSettings.notify = normalizeNotifyInput({ topic: 'arrive-office-abc123', enabled: true });
    await n.send('delivered', { title: '📬 Echo entregó', message: 'Hooks', taskId: 't1' });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://ntfy.sh/');
    assert.equal(sent[0].body.topic, 'arrive-office-abc123');
    assert.equal(sent[0].body.click, 'https://cc.example.test/office?task=t1');
    assert.equal(sent[0].body.actions[0].label, 'Abrir tarea');
    assert.equal((await n.send('delivered', { title: '📬 Echo entregó', taskId: 't1' })).skipped, 'repetido');
    assert.equal((await n.send('schedule', { title: 'r', taskId: 't2' })).skipped, 'desactivado', 'recurrentes apagado por defecto');

    db.officeSettings.notify = normalizeNotifyInput({ events: { failed: false } }, db.officeSettings.notify);
    assert.equal((await n.send('failed', { title: 'f', taskId: 't3' })).skipped, 'desactivado');

    fail = true;
    const r = await n.send('question', { title: 'q', taskId: 't4' });
    assert.match(r.error, /429/);
    await assert.rejects(() => n.test(), /No se pudo enviar: ntfy respondió 429/);
    assert.throws(() => normalizeNotifyInput({ topic: 'a b' }), /6 a 64/);
    assert.throws(() => normalizeNotifyInput({ server: 'ftp://x' }), /URL http/);
});

test('avisos: la oficina avisa al entregar y al preguntar', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const pings = [];
    let db = {
        agents: [{ id: 'agent-echo', name: 'Echo', model: 'gemini-3.8-flash', fallbackModels: [] }],
        agentTasks: [{ id: 't1', task: 'Hooks', assignedAgentId: 'agent-echo', assignedKind: 'internal', status: 'queued' }, { id: 't2', task: 'Copy', assignedAgentId: 'agent-echo', assignedKind: 'internal', status: 'queued' }],
    };
    const replies = ['Listo', '<<<HERRAMIENTA preguntar_al_ceo>>>\n{"pregunta": "¿Qué fecha?"}\n<<<FIN HERRAMIENTA>>>'];
    const office = createOfficeService({
        readDB: () => structuredClone(db), writeDB: d => { db = structuredClone(d); }, getAgents: d => d.agents,
        buildPrompt: async () => 'P', runModel: async ({ model }) => ({ text: replies.shift(), model, tokensIn: 1, tokensOut: 1 }),
        tools: createAgentTools({ readDB: () => db, agentsFor: () => db.agents }),
        notify: { send: (kind, p) => pings.push({ kind, ...p }) },
    });
    office.startInternalRun('t1');
    await until(() => db.agentTasks[0].status === 'review');
    office.startInternalRun('t2');
    await until(() => db.agentTasks[1].status === 'review');
    assert.deepEqual(pings.map(p => [p.kind, p.taskId]), [['delivered', 't1'], ['question', 't2']]);
    assert.match(pings[1].message, /¿Qué fecha\?/);
});

test('hub MCP: el agente interno ve solo las herramientas permitidas, las usa y la conexión se cierra', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const calls = [];
    let closed = 0;
    const fakeClient = {
        listTools: async () => ({ tools: [
            { name: 'query_records', description: 'Consulta registros de un módulo. Con filtros y orden.', inputSchema: { type: 'object', properties: { module: { type: 'string' } } } },
            { name: 'get_my_office_tasks', description: 'Para agentes externos.' },
        ] }),
        callTool: async ({ name, arguments: args }) => {
            calls.push({ name, args });
            if (args.module === 'secreto') return { isError: true, structuredContent: { error: { code: 'PERMISSION_DENIED', message: 'Necesitas data:write', hint: 'Pide permiso al CEO' } } };
            return { structuredContent: { items: [{ id: 'p1', name: 'Hotel Central' }] } };
        },
    };
    const prompts = [];
    let db = {
        agents: [{ id: 'agent-atlas', name: 'Atlas', model: 'gemini-3.8-flash', fallbackModels: [] }],
        agentTasks: [{ id: 't1', task: 'Proyectos activos', assignedAgentId: 'agent-atlas', assignedKind: 'internal', status: 'queued' }],
    };
    const replies = [
        '<<<HERRAMIENTA usar_hub>>>\n{"herramienta": "query_records", "argumentos": {"module": "projects"}}\n<<<FIN HERRAMIENTA>>>\n<<<HERRAMIENTA usar_hub>>>\n{"herramienta": "query_records", "argumentos": {"module": "secreto"}}\n<<<FIN HERRAMIENTA>>>\n<<<HERRAMIENTA usar_hub>>>\n{"herramienta": "deploy"}\n<<<FIN HERRAMIENTA>>>',
        'Hay 1 proyecto: Hotel Central',
    ];
    const principals = [];
    const office = createOfficeService({
        readDB: () => structuredClone(db), writeDB: d => { db = structuredClone(d); }, getAgents: d => d.agents,
        buildPrompt: async () => 'P',
        runModel: async ({ model, prompt }) => { prompts.push(prompt); return { text: replies.shift(), model }; },
        tools: createAgentTools({
            readDB: () => db, agentsFor: () => db.agents,
            connectHub: async agent => { principals.push(`office:${agent.id}`); return { client: fakeClient, close: async () => { closed++; } }; },
        }),
    });
    office.startInternalRun('t1');
    await until(() => db.agentTasks[0].status === 'review');
    assert.deepEqual(principals, ['office:agent-atlas']);
    assert.match(prompts[0], /HERRAMIENTAS DEL HUB QUE TIENES PERMITIDAS[\s\S]*- query_records: Consulta registros de un módulo\./);
    assert.doesNotMatch(prompts[0], /get_my_office_tasks/);
    assert.match(prompts[1], /Hotel Central/);
    assert.match(prompts[1], /Error del hub \(PERMISSION_DENIED\): Necesitas data:write\nQué hacer: Pide permiso al CEO/);
    assert.match(prompts[1], /«deploy» no existe o no tienes permiso/);
    assert.equal(calls.length, 2);
    assert.equal(db.agentTasks[0].runs[0].hubCalls, 3);
    assert.equal(closed, 1, 'cierra la conexión al terminar');
});

test('hub MCP: sin hub, el agente no ve las herramientas del hub', () => {
    const txt = toolInstructions({ agents: [] });
    assert.doesNotMatch(txt, /usar_hub|ver_herramienta_hub/);
});

test('officeService: tras un reinicio, las tareas cortadas vuelven a empezar y a la 3.ª fallan', async () => {
    let calls = 0;
    // Estado que deja un reinicio a mitad de corrida: tarea en curso y el agente «trabajando».
    let state = {
        agents: [{ id: 'agent-echo', name: 'Echo (Social)', model: 'gemini-3.8-flash', status: 'executing', activeTaskId: 't1' }],
        agentTasks: [
            { id: 't1', task: 'Hooks para reel', assignedAgentId: 'agent-echo', assignedAgent: 'Echo (Social)', assignedKind: 'internal', status: 'in_progress' },
            { id: 'm1', kind: 'mission', task: 'Misión', assignedAgentId: 'agent-echo', status: 'in_progress' },
        ],
        activityFeed: [],
    };
    const office = createOfficeService({
        readDB: () => structuredClone(state), writeDB: d => { state = structuredClone(d); }, broadcast: () => {},
        getAgents: d => d.agents, buildPrompt: async o => o.task,
        runModel: async ({ model }) => { calls++; return { text: 'listo', tokensIn: 1, tokensOut: 1, provider: 'google', model, ms: 1 }; },
    });
    const t1 = () => state.agentTasks.find(t => t.id === 't1');

    assert.deepEqual(office.recoverInterrupted({ restart: true }), [{ id: 't1', status: 'queued' }], 'la misión (padre) no se toca');
    await until(() => t1().status === 'review');
    assert.equal(t1().status, 'review', 'volvió a correr y entregó');
    assert.equal(t1().interruptions, 1);
    assert.equal(calls, 1);
    assert.match(JSON.stringify(state.activityFeed), /reinicio/);
    assert.equal(state.agents[0].status, 'available');

    // Sin reanudar (OFFICE_RESUME_ON_BOOT=0): queda en cola y no corre.
    t1().status = 'in_progress';
    assert.deepEqual(office.recoverInterrupted({ restart: false }), [{ id: 't1', status: 'queued' }]);
    assert.equal(calls, 1);

    // A la tercera interrupción se da por fallida en vez de entrar en un bucle.
    t1().status = 'in_progress';
    assert.deepEqual(office.recoverInterrupted({ restart: true }), [{ id: 't1', status: 'failed' }]);
    assert.match(t1().error, /3 veces/);
    assert.equal(calls, 1);
});

test('modelRunner: precios por fecha y por el modelo que respondió de verdad', async () => {
    const { priceOf, estimateCost } = await import('../src/services/office/modelRunner.js');
    assert.deepEqual(priceOf('gemini-3.6-flash', '2026-12-31T12:00:00Z'), [0.75, 3.75]);
    assert.deepEqual(priceOf('gemini-3.6-flash', '2027-01-01T12:00:00Z'), [1.5, 7.5], 'aplica la subida anunciada');
    assert.equal(priceOf('gemini-3.5-flash'), null, 'sin precio publicado no se inventa');
    assert.equal(estimateCost('gemini-3.5-flash', 1e6, 1e6, { servedBy: 'gemini-3.6-flash', at: '2026-11-26' }), 4.5, 'se cobra como el modelo que respondió');
    assert.equal(estimateCost('gemini-3.5-flash', 1e6, 1e6), null);
});

test('modelRunner: un modelo saturado queda en pausa y las siguientes llamadas van directo al respaldo', async () => {
    const { runModel, isSaturated, resetSaturation } = await import('../src/services/office/modelRunner.js');
    const saved = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test';
    resetSaturation();
    try {
        const calls = [];
        const runners = {
            google: async m => {
                calls.push(m);
                if (m === 'gemini-3.8-flash') { const e = new Error('This model is currently experiencing high demand'); e.status = 503; throw e; }
                return { text: 'hecho', tokensIn: 10, tokensOut: 5, servedBy: m };
            },
        };
        const out = await runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [0], runners });
        assert.equal(out.model, 'gemini-3.6-flash');
        assert.deepEqual(calls, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.6-flash'], 'agota sus reintentos la primera vez');
        assert.ok(isSaturated('gemini-3.8-flash'));
        assert.ok(out.costUSD > 0, 'el costo ya no sale en 0');

        calls.length = 0;
        const again = await runModel({ model: 'gemini-3.8-flash', prompt: 'hola', retryDelays: [0], runners });
        assert.deepEqual(calls, ['gemini-3.6-flash'], 'en pausa: no se pierde tiempo en reintentos');
        assert.equal(again.skippedSaturated, 'gemini-3.8-flash');
    } finally {
        resetSaturation();
        if (saved === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved;
    }
});
