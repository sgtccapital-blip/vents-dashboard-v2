// Sincronización de la extensión de Chrome contra un ChatGPT simulado y el motor de conocimiento real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createKnowledgeEngine } from '../src/services/knowledge/engine.js';

const require = createRequire(import.meta.url);
const { runChatGPTSync } = require('../extensions/chatgpt-sync/sync-core.js');

test('el content script entrega cuenta y workspace activos en cada mensaje al dashboard', async () => {
    const calls = [];
    let listener;
    const context = {
        chrome: { runtime: {
            onMessage: { addListener(fn) { listener = fn; } },
            sendMessage(msg, cb) { calls.push(msg); cb(msg.type === 'dashboard:state' ? { known: {} } : { ok: true }); },
        } },
        document: { cookie: '', addEventListener() {} },
        fetch: async () => ({ ok: true, json: async () => ({ accessToken: 'test', user: { id: 'user-1' }, account: { id: 'workspace-2' } }) }),
        console: { debug() {} },
    };
    context.globalThis = context;
    context.runChatGPTSync = async ({ bridge }) => {
        await bridge.state();
        await bridge.push([{ id: 'conversation-3' }]);
        await bridge.report({ scanned: 1, sent: 1 });
        return { complete: true };
    };
    vm.runInNewContext(fs.readFileSync(new URL('../extensions/chatgpt-sync/content.js', import.meta.url), 'utf8'), context);
    await new Promise(resolve => listener({ type: 'sync-v2', full: false }, null, resolve));
    for (const msg of calls.filter(x => x.type.startsWith('dashboard:'))) assert.deepEqual(JSON.parse(JSON.stringify(msg.identity)), { accountId: 'user-1', workspaceId: 'workspace-2' });
});

function fakeChatGPT(count, { skewSeconds = 0 } = {}) {
    const base = Date.parse('2026-11-01T00:00:00Z');
    const convs = new Map();
    const make = (id, i, gizmo = null) => {
        const t = (base + i * 60000) / 1000;
        convs.set(id, {
            id, title: `Conversación ${id}`, update_time: t, create_time: t - 100, current_node: `${id}-b`, gizmo_id: gizmo,
            mapping: {
                [`${id}-a`]: { id: `${id}-a`, parent: null, children: [`${id}-b`], message: { author: { role: 'user' }, content: { content_type: 'text', parts: [`Pregunta ${id}`] } } },
                [`${id}-b`]: { id: `${id}-b`, parent: `${id}-a`, children: [], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: [`Respuesta ${id}`] } } },
            },
        });
    };
    for (let i = 0; i < count; i++) make(`c${i}`, i);
    make('p1', count + 1, 'g-p-demo');
    make('p2', count + 2, 'g-p-demo');
    const calls = { detail: 0 };
    // La API real trae en la lista una fecha distinta a la del detalle (skewSeconds lo simula).
    const listItem = c => ({ id: c.id, title: c.title, update_time: new Date((c.update_time + skewSeconds) * 1000).toISOString(), gizmo_id: c.gizmo_id });
    const chatgpt = {
        async get(p) {
            const url = new URL(p, 'https://chatgpt.com');
            if (url.pathname === '/backend-api/conversations') {
                const main = [...convs.values()].filter(c => !c.gizmo_id).sort((a, b) => b.update_time - a.update_time);
                const offset = Number(url.searchParams.get('offset')), limit = Number(url.searchParams.get('limit'));
                return { items: main.slice(offset, offset + limit).map(listItem), total: main.length };
            }
            if (url.pathname === '/backend-api/gizmos/snorlax/sidebar') return { items: [{ gizmo: { gizmo: { id: 'g-p-demo' } } }] };
            if (url.pathname === '/backend-api/gizmos/g-p-demo/conversations') return { items: [...convs.values()].filter(c => c.gizmo_id).map(listItem), cursor: null };
            const m = url.pathname.match(/^\/backend-api\/conversation\/(.+)$/);
            if (m) { calls.detail++; return structuredClone(convs.get(m[1])); }
            throw new Error(`404 ${p}`);
        },
    };
    return { chatgpt, convs, calls };
}

test('sincroniza el historial por tandas, incluye Proyectos y luego solo lo cambiado', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-sync-'));
    const engine = createKnowledgeEngine({
        dataDir: dir, readDB: () => ({ projects: [] }), getGeminiKey: () => '',
        generateStructured: async () => { throw new Error('sin IA'); }, availableProviders: () => [],
        embedder: { model: 'none', dims: 2, available: () => false }, log: { log() {}, warn() {}, error() {} },
    });
    const reports = [];
    const bridge = {
        state: async () => engine.syncState(),
        push: async convs => engine.ingestFromExtension(convs, { client: 'test' }),
        report: async r => reports.push(engine.reportExtensionRun(r)),
    };
    const { chatgpt, convs, calls } = fakeChatGPT(250);
    const sleep = async () => {};

    const r1 = await runChatGPTSync({ chatgpt, bridge, full: true, maxFetch: 150, sleep });
    assert.equal(r1.error, '');
    assert.equal(r1.changed, 252);
    assert.equal(r1.sent, 150);
    assert.equal(r1.complete, false);

    const r2 = await runChatGPTSync({ chatgpt, bridge, full: true, maxFetch: 150, sleep });
    assert.equal(r2.sent, 102);
    assert.equal(r2.complete, true);
    assert.equal(engine.status().chatgpt.total, 252);
    assert.equal(engine.getConversation('p1').chatgptProjectId, 'g-p-demo');

    // Una conversación vieja recibe un mensaje nuevo: solo se vuelve a pedir esa.
    const c = convs.get('c3');
    c.update_time = Date.parse('2026-12-01T00:00:00Z') / 1000;
    c.mapping['c3-c'] = { id: 'c3-c', parent: 'c3-b', children: [], message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['Seguimos con esto'] } } };
    c.mapping['c3-b'].children.push('c3-c');
    c.current_node = 'c3-c';
    engine.excludeConversation('c10');
    const before = calls.detail;
    const r3 = await runChatGPTSync({ chatgpt, bridge, full: false, maxFetch: 150, sleep });
    assert.equal(r3.changed, 1);
    assert.equal(calls.detail - before, 1);
    assert.equal(engine.getConversation('c3').messageCount, 3);
    assert.equal(engine.status().chatgpt.extension.totals.updated, 1);
    assert.ok(reports.at(-1).run.scanned > 0);
    engine.flush();
});

test('un error de ChatGPT se reporta sin romper', async () => {
    const reports = [];
    const r = await runChatGPTSync({
        chatgpt: { get: async () => { throw new Error('ChatGPT 403'); } },
        bridge: { state: async () => ({ known: {} }), push: async () => {}, report: async x => reports.push(x) },
        sleep: async () => {},
    });
    assert.equal(r.error, 'ChatGPT 403');
    assert.equal(reports[0].error, 'ChatGPT 403');
});

test('un 429 conserva el conteo de conversaciones que faltan', async () => {
    const { chatgpt } = fakeChatGPT(2);
    const get = chatgpt.get;
    let details = 0;
    chatgpt.get = async path => {
        if (path.startsWith('/backend-api/conversation/') && ++details > 1) throw new Error('ChatGPT 429');
        return get(path);
    };
    const reports = [];
    const sent = [];
    const report = await runChatGPTSync({ chatgpt, bridge: { state: async () => ({ known: {} }), push: async batch => sent.push(...batch), report: async value => reports.push(value) }, batch: 1, sleep: async () => {} });
    assert.equal(report.sent, 1);
    assert.equal(report.changed, 4);
    assert.equal(report.remaining, 3);
    assert.equal(report.complete, false);
    assert.equal(reports[0].remaining, 3);
});

test('si la lista y el detalle de ChatGPT traen fechas distintas, no se vuelve a pedir lo ya importado', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-sync-skew-'));
    const engine = createKnowledgeEngine({
        dataDir: dir, readDB: () => ({ projects: [] }), getGeminiKey: () => '',
        generateStructured: async () => { throw new Error('sin IA'); }, availableProviders: () => [],
        embedder: { model: 'none', dims: 2, available: () => false }, log: { log() {}, warn() {}, error() {} },
    });
    const bridge = { state: async () => engine.syncState(), push: async c => engine.ingestFromExtension(c), report: async r => engine.reportExtensionRun(r) };
    const { chatgpt, calls } = fakeChatGPT(30, { skewSeconds: 45 });
    const sleep = async () => {};
    const r1 = await runChatGPTSync({ chatgpt, bridge, full: true, sleep });
    assert.equal(r1.sent, 32);
    const before = calls.detail;
    const r2 = await runChatGPTSync({ chatgpt, bridge, full: true, sleep });
    assert.equal(r2.changed, 0);
    assert.equal(calls.detail, before);
    engine.flush();
});
