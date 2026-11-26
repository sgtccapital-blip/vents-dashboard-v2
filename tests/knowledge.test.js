// Motor de conocimiento: lectura de la exportación de ChatGPT, troceo, búsqueda híbrida y cola de importación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { listZip, readZipEntry } from '../src/services/knowledge/zip.js';
import { linearize, normalizeConversation, readExportFile, isChatGptExportZip, digestInput } from '../src/services/knowledge/chatgptExport.js';
import { chunkText, terms } from '../src/services/knowledge/text.js';
import { KnowledgeStore } from '../src/services/knowledge/store.js';
import { createKnowledgeEngine } from '../src/services/knowledge/engine.js';

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cc-knowledge-'));

// Conversación con una rama editada: el nodo "u1-old" quedó fuera de la rama visible.
function conversation(id, title, turns, { update = 1760000000, gizmo = null } = {}) {
    const mapping = { root: { id: 'root', message: null, parent: null, children: ['sys'] } };
    mapping.sys = { id: 'sys', parent: 'root', children: ['u0'], message: { author: { role: 'system' }, content: { content_type: 'text', parts: [''] }, metadata: { is_visually_hidden_from_conversation: true } } };
    let parent = 'sys';
    turns.forEach(([role, text], i) => {
        const nid = `${role[0]}${i}`;
        mapping[nid] = { id: nid, parent, children: [], message: { author: { role }, create_time: update - 100 + i, content: { content_type: 'text', parts: [text] }, recipient: 'all' } };
        mapping[parent].children.push(nid);
        parent = nid;
    });
    mapping['u1-old'] = { id: 'u1-old', parent: 'sys', children: [], message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['versión descartada'] } } };
    return { id, conversation_id: id, title, create_time: update - 1000, update_time: update, current_node: parent, gizmo_id: gizmo, mapping };
}

const sample = [
    conversation('c1', 'Precios Hang Out', [['user', 'Quiero definir el precio de entrada de Hang Out para diciembre'], ['assistant', 'Propongo 15 dólares en preventa y 20 en puerta.'], ['user', 'Decidido: 15 preventa, 20 puerta, y validamos con la venta de la primera semana']], { gizmo: 'g-p-abc' }),
    conversation('c2', 'Receta de pan', [['user', '¿Cómo hago pan de masa madre?'], ['assistant', 'Mezcla harina, agua y masa madre…']], { update: 1750000000 }),
];

test('linearize sigue la rama visible y omite mensajes ocultos', () => {
    const msgs = linearize(sample[0]);
    assert.deepEqual(msgs.map(m => m.role), ['user', 'assistant', 'user']);
    assert.ok(!msgs.some(m => m.text.includes('descartada')));
    const conv = normalizeConversation(sample[0]);
    assert.equal(conv.chatgptProjectId, 'g-p-abc');
    assert.equal(conv.updateTime, new Date(1760000000 * 1000).toISOString());
});

test('lee conversations.json desde el ZIP de la exportación', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'conversations.json'), JSON.stringify(sample));
    fs.writeFileSync(path.join(dir, 'chat.html'), '<html></html>');
    const zip = path.join(dir, 'export.zip');
    execFileSync('zip', ['-q', zip, 'conversations.json', 'chat.html'], { cwd: dir });
    assert.deepEqual(listZip(zip).map(e => e.name).sort(), ['chat.html', 'conversations.json']);
    assert.equal(readZipEntry(zip, listZip(zip).find(e => e.name === 'chat.html')).toString(), '<html></html>');
    assert.equal(isChatGptExportZip(zip), true);
    assert.equal(readExportFile(zip).length, 2);

    const other = path.join(dir, 'otro.zip');
    execFileSync('zip', ['-q', other, 'chat.html'], { cwd: dir });
    assert.equal(isChatGptExportZip(other), false);
});

test('chunkText respeta el tamaño y no pierde texto', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Párrafo ${i} ${'palabra '.repeat(30)}`).join('\n\n');
    const chunks = chunkText(text, 800, 100);
    assert.ok(chunks.length > 5);
    assert.ok(chunks.every(c => c.length <= 1000));
    assert.ok(chunks.join(' ').includes('Párrafo 39'));
    assert.deepEqual(chunkText('corto'), ['corto']);
});

test('digestInput recorta conversaciones larguísimas guardando inicio y final', () => {
    const msgs = Array.from({ length: 200 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `mensaje ${i} ${'x'.repeat(600)}` }));
    const out = digestInput(msgs, 20000);
    assert.ok(out.length <= 20100);
    assert.ok(out.includes('mensaje 0 ') && out.includes('mensaje 199 ') && out.includes('omitida'));
});

test('búsqueda híbrida: palabras clave con tildes y vectores', () => {
    const store = new KnowledgeStore(tmpDir(), { dims: 3, model: 'fake' });
    store.upsertDoc({ id: 'a', source: 'chatgpt', kind: 'transcript', title: 'Decisión de precios', meta: {} }, ['El precio de la entrada quedó en 15']);
    store.upsertDoc({ id: 'b', source: 'dashboard', kind: 'event', title: 'Evento', meta: {} }, ['Montaje del escenario y luces']);
    store.setVector('a#0', [1, 0, 0]);
    store.setVector('b#0', [0, 1, 0]);
    assert.equal(store.search({ query: 'decision precio' })[0].docId, 'a');
    assert.equal(store.search({ query: 'zzz', queryVector: [0, 1, 0] })[0].docId, 'b');
    assert.equal(store.search({ query: 'precio', filter: { source: 'dashboard' } }).length, 0);
    assert.deepEqual(terms('¿Qué decidimos del PRECIO?'), ['decidimos', 'precio']);

    store.save();
    const reloaded = new KnowledgeStore(store.dir, { dims: 3, model: 'fake' });
    assert.equal(reloaded.stats().embedded, 2);
    // Otro modelo de embeddings invalida los vectores guardados.
    assert.equal(new KnowledgeStore(store.dir, { dims: 3, model: 'otro' }).stats().embedded, 0);
});

test('importación: resume, indexa, arma memoria de proyecto y no reprocesa lo que no cambió', async () => {
    const dir = tmpDir();
    const exportFile = path.join(dir, 'conversations.json');
    fs.writeFileSync(exportFile, JSON.stringify(sample));
    const db = { projects: [{ id: 'p-hang', name: 'Hang Out' }], ragDocuments: [{ id: 'entity-task-1', title: 'Comprar luces', content: 'TAREA: comprar luces para Hang Out' }] };
    const calls = [];
    const generateStructured = async ({ schema, prompt }) => {
        calls.push(prompt.slice(0, 40));
        if (prompt.includes('Pan') || prompt.includes('pan')) {
            return { data: schema.parse({ summary: 'Receta de pan', project: '', projectId: '', type: 'personal', relevance: 'baja', decisions: [], ideas: [], pending: [], reasoning: [], facts: [], tags: ['cocina'] }), model: 'fake' };
        }
        if (prompt.startsWith('Proyecto:')) {
            return { data: schema.parse({ overview: 'Fiesta semanal', timeline: [], decisions: ['15 preventa'], openQuestions: [], howUserThinks: ['valida con ventas reales'], keyFacts: [] }), model: 'fake' };
        }
        if (prompt.startsWith('Proyectos:')) {
            return { data: schema.parse({ whoIs: 'Productor de eventos', workStyle: [], decisionCriteria: [], preferences: [], activeFronts: [], instructionsForAgents: [] }), model: 'fake' };
        }
        return { data: schema.parse({ summary: 'Se definió el precio', project: 'Hang Out', projectId: 'p-hang', type: 'proyecto', relevance: 'alta', decisions: ['15 preventa, 20 puerta'], ideas: [], pending: ['revisar ventas semana 1'], reasoning: ['valida con datos de venta'], facts: [], tags: ['precios'], evidence: [{ category: 'decisions', text: '15 preventa, 20 puerta', messageIds: ['u2'] }, { category: 'pending', text: 'revisar ventas semana 1', messageIds: ['u2'] }, { category: 'reasoning', text: 'valida con datos de venta', messageIds: ['u2'] }] }), model: 'fake' };
    };
    const embedder = {
        model: 'fake', dims: 2, available: () => true,
        embedDocuments: async texts => texts.map(t => (/precio|hang/i.test(t) ? [1, 0] : [0, 1])),
        embedQuery: async t => (/precio|entrada/i.test(t) ? [1, 0] : [0, 1]),
    };
    const engine = createKnowledgeEngine({
        dataDir: path.join(dir, 'knowledge'), readDB: () => db, getGeminiKey: () => 'k',
        generateStructured, availableProviders: () => ['gemini'], embedder, log: { log() {}, warn() {}, error() {} },
    });

    const summary = engine.importExport(exportFile);
    assert.equal(summary.added, 2);
    while (engine.status().worker.running) await new Promise(r => setTimeout(r, 10));
    await engine.runWorker();

    const st = engine.status();
    assert.equal(st.chatgpt.done, 2);
    assert.equal(st.chatgpt.byRelevance.alta, 1);
    // La consulta trivial solo deja el resumen; la importante deja resumen + transcripción.
    assert.ok(engine.store.getDoc('chatgpt:c1') && engine.store.getDoc('chatgpt:c1:digest'));
    assert.ok(!engine.store.getDoc('chatgpt:c2') && engine.store.getDoc('chatgpt:c2:digest'));
    assert.equal(engine.projects()[0].projectId, 'p-hang');
    assert.ok(engine.profile().text.includes('Productor de eventos'));

    const { results, mode } = await engine.search({ query: '¿a cuánto quedó la entrada?' });
    assert.equal(mode, 'hybrid');
    assert.equal(results[0].doc.meta.projectId, 'p-hang');

    await engine.syncDashboard();
    assert.ok(engine.store.getDoc('dash:entity-task-1'));

    const before = calls.length;
    assert.equal(engine.importExport(exportFile).unchanged, 2);
    await engine.runWorker();
    assert.equal(calls.length, before);

    assert.ok(engine.excludeConversation('c2'));
    assert.equal(engine.importExport(exportFile).added, 0);
    assert.equal(engine.store.getDoc('chatgpt:c2:digest'), null);
    engine.flush();
});

test('lo que llega mientras la cola trabaja se procesa al terminar, sin esperar al siguiente ciclo', async () => {
    const dir = tmpDir();
    let release;
    const gate = new Promise(r => { release = r; });
    let first = true;
    const generateStructured = async ({ schema }) => {
        if (first) { first = false; await gate; }
        return { data: schema.parse({ summary: 's', project: '', projectId: '', type: 'idea', relevance: 'baja', decisions: [], ideas: [], pending: [], reasoning: [], facts: [], tags: [] }), model: 'fake' };
    };
    const engine = createKnowledgeEngine({
        dataDir: dir, readDB: () => ({ projects: [] }), getGeminiKey: () => '', generateStructured, availableProviders: () => ['gemini'],
        embedder: { model: 'none', dims: 2, available: () => false }, log: { log() {}, warn() {}, error() {} },
    });
    engine.importConversations([sample[0]]);
    await new Promise(r => setTimeout(r, 20));
    engine.importConversations([sample[1]]); // llega con la cola ocupada
    release();
    for (let i = 0; i < 100 && engine.status().chatgpt.done < 2; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(engine.status().chatgpt.done, 2);
    engine.flush();
});

test('sin cuota de IA las conversaciones quedan buscables igual y se resumen después', async () => {
    const dir = tmpDir();
    let quota = true;
    const generateStructured = async ({ schema }) => {
        if (quota) throw new Error('No se pudo generar: gemini: Gemini 429: quota exceeded');
        return { data: schema.parse({ summary: 'resumido', project: '', projectId: '', type: 'idea', relevance: 'media', decisions: [], ideas: [], pending: [], reasoning: [], facts: [], tags: [] }), model: 'fake' };
    };
    const engine = createKnowledgeEngine({
        dataDir: dir, readDB: () => ({ projects: [] }), getGeminiKey: () => '', generateStructured, availableProviders: () => ['gemini'],
        embedder: { model: 'none', dims: 2, available: () => false }, log: { log() {}, warn() {}, error() {} },
    });
    engine.importConversations(sample);
    for (let i = 0; i < 100 && engine.status().worker.running; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(engine.status().chatgpt.indexedRaw, 2);
    assert.match(engine.status().worker.blockedReason, /Cuota/);
    assert.equal((await engine.search({ query: 'precio preventa hang out' })).results[0].docId, 'chatgpt:c1');

    quota = false;
    engine.retryErrors();
    for (let i = 0; i < 100 && engine.status().chatgpt.done < 2; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(engine.status().chatgpt.done, 2);
    engine.flush();
});

test('una conversación es buscable apenas llega, antes de que la IA la resuma, y el resumen no la reindexa', async () => {
    const dir = tmpDir();
    let release;
    const gate = new Promise(r => { release = r; });
    const generateStructured = async ({ schema }) => {
        await gate;
        return { data: schema.parse({ summary: 'precios', project: 'Hang Out', projectId: '', type: 'proyecto', relevance: 'alta', decisions: [], ideas: [], pending: [], reasoning: [], facts: [], tags: [] }), model: 'fake' };
    };
    let embedded = 0;
    const engine = createKnowledgeEngine({
        dataDir: dir, readDB: () => ({ projects: [] }), getGeminiKey: () => '', generateStructured, availableProviders: () => ['gemini'],
        embedder: { model: 'fake', dims: 2, available: () => true, embedDocuments: async t => { embedded += t.length; return t.map(() => [1, 0]); }, embedQuery: async () => [1, 0] },
        log: { log() {}, warn() {}, error() {} },
    });
    engine.importConversations([sample[0]]);
    const { results } = await engine.search({ query: 'precio preventa hang out' });
    assert.equal(results[0].docId, 'chatgpt:c1');
    assert.equal(engine.status().chatgpt.done, 0);

    const transcriptEmbeds = embedded;
    release();
    for (let i = 0; i < 100 && engine.status().chatgpt.done < 1; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(engine.status().chatgpt.done, 1);
    // Solo se vectorizaron el resumen y la memoria del proyecto; la transcripción ya estaba.
    assert.ok(engine.store.getDoc('chatgpt:c1').meta.relevance === 'alta');
    assert.ok(embedded - transcriptEmbeds <= 3);
    engine.flush();
});

test('un trozo sin vector todavía compite en igualdad con los vectorizados', () => {
    const store = new KnowledgeStore(tmpDir(), { dims: 2, model: 'fake' });
    store.upsertDoc({ id: 'viejo', source: 'dashboard', kind: 'task', title: 'Lista de invitados', meta: {} }, ['Completar la lista de invitados del domingo']);
    store.setVector('viejo#0', [1, 0]);
    store.upsertDoc({ id: 'nuevo', source: 'chatgpt', kind: 'transcript', title: 'Quitar números lista', meta: {} }, ['Quitar los números de la lista de contactos y dejar solo nombres']);
    assert.equal(store.search({ query: 'quitar números lista', queryVector: [1, 0] })[0].docId, 'nuevo');
});

test('el limitador de embeddings respeta el máximo por minuto', async () => {
    const { createRateLimiter } = await import('../src/services/knowledge/embeddings.js');
    let t = 0;
    const waits = [];
    const reserve = createRateLimiter(90, { now: () => t, sleep: async ms => { waits.push(ms); t += ms; } });
    await reserve(50);
    await reserve(40);
    assert.equal(waits.length, 0);
    await reserve(50); // pasaría de 90 en el mismo minuto: espera a que se libere
    assert.ok(waits.length > 0 && t >= 60000);
});

test('el limitador también respeta los tokens por minuto y los resúmenes se vectorizan antes que las transcripciones', async () => {
    const { createRateLimiter } = await import('../src/services/knowledge/embeddings.js');
    let t = 0;
    const reserve = createRateLimiter(90, { tokensPerMinute: 1000, now: () => t, sleep: async ms => { t += ms; } });
    await reserve(1, 900);
    await reserve(1, 200);
    assert.ok(t >= 60000);

    const store = new KnowledgeStore(tmpDir(), { dims: 2, model: 'fake' });
    store.upsertDoc({ id: 't', source: 'chatgpt', kind: 'transcript', title: 'x', meta: {} }, ['a', 'b']);
    store.upsertDoc({ id: 'd', source: 'chatgpt', kind: 'digest', title: 'y', meta: {} }, ['c']);
    store.upsertDoc({ id: 'p', source: 'chatgpt', kind: 'profile', title: 'z', meta: {} }, ['d']);
    assert.deepEqual(store.missingVectors(2).map(c => c.docId), ['p', 'd']);
});

test('la cuota diaria se renueva a medianoche del Pacífico', async () => {
    const { nextQuotaReset } = await import('../src/services/knowledge/embeddings.js');
    const now = new Date('2026-11-24T15:00:00Z'); // 07:00 en Los Ángeles
    const reset = nextQuotaReset(now);
    const hours = (reset - now) / 3600000;
    assert.ok(hours > 16.9 && hours < 17.2, String(hours));
});

test('embeddings locales: ordenan bien búsquedas en español', { skip: !fs.existsSync(path.join(os.homedir(), 'Library/Caches/arrive-command-center/models')) && 'modelo local no descargado' }, async () => {
    const { createLocalEmbedder } = await import('../src/services/knowledge/localEmbedder.js');
    const e = createLocalEmbedder({ log: {} });
    const docs = ['Precio de Hang Out en diciembre: preventa 15 y puerta 20.', 'Receta de pan de masa madre con harina y agua.', 'Waller cobra 5% por transacción a los venues.'];
    const store = new KnowledgeStore(tmpDir(), { dims: e.dims, model: e.model });
    docs.forEach((d, i) => store.upsertDoc({ id: `d${i}`, source: 'chatgpt', kind: 'transcript', title: '', meta: {} }, [d]));
    const vecs = await e.embedDocuments(docs);
    vecs.forEach((v, i) => store.setVector(`d${i}#0`, v));
    const top = async q => store.search({ query: '', queryVector: await e.embedQuery(q) })[0].docId;
    assert.equal(await top('¿a cuánto quedó la entrada?'), 'd0');
    assert.equal(await top('cuánto cobra Waller a los venues'), 'd2');
});
