import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createKnowledgeEngine } from '../src/services/knowledge/engine.js';
import { DigestSchema, SynthesisSchema, ProfileSchema } from '../src/services/knowledge/digest.js';
import { buildMcpServer } from '../src/services/agentHub/mcpServer.js';

const make = (id, texts) => ({
    id, title: 'Plan multiproyecto', create_time: 1793000000, update_time: 1793000000,
    current_node: `n${texts.length - 1}`,
    mapping: Object.fromEntries(texts.map((text, i) => [`n${i}`, {
        id: `n${i}`, parent: i ? `n${i - 1}` : null, children: i + 1 < texts.length ? [`n${i + 1}`] : [],
        message: { id: `m${i}`, create_time: 1793000000 + i, author: { role: i % 2 ? 'assistant' : 'user' }, content: { content_type: 'text', parts: [text] } },
    }])),
});

const waitFor = async predicate => {
    for (let i = 0; i < 200; i++) {
        if (predicate()) return;
        await new Promise(r => setTimeout(r, 10));
    }
    assert.fail('La cola no terminó');
};

test('captura incremental, resumen completo con evidencia, búsqueda y aislamiento por cuenta', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-knowledge-flow-'));
    const db = { projects: [{ id: 'p1', name: 'Uno' }, { id: 'p2', name: 'Dos' }], tasks: [], events: [] };
    const seen = [];
    const engine = createKnowledgeEngine({
        dataDir: dir, readDB: () => db, getGeminiKey: () => '', availableProviders: () => ['mock'],
        embedder: { model: 'none', dims: 2, available: () => false }, log: { log() {}, warn() {}, error() {} },
        generateStructured: async ({ prompt, schema }) => {
            if (schema === DigestSchema) {
                seen.push(prompt);
                return { model: 'mock', data: schema.parse({ summary: prompt.includes('MARCADOR_CENTRAL') ? 'MARCADOR_CENTRAL confirmado' : 'Contexto multiproyecto', project: 'Uno', projectId: 'p1', projects: [{ project: 'Uno', projectId: 'p1' }, { project: 'Dos', projectId: 'p2' }], type: 'proyecto', relevance: 'alta', decisions: [], ideas: ['Idea del asistente, sin aprobar'], pending: ['Pendiente mencionado, sin crear tarea'], reasoning: [], facts: [], tags: ['contexto'], topics: ['planes'], corrections: [], openQuestions: [], evidence: [{ category: 'topics', text: 'planes', messageIds: ['m0'] }, { category: 'ideas', text: 'Idea del asistente, sin aprobar', messageIds: ['m1'] }, { category: 'pending', text: 'Pendiente mencionado, sin crear tarea', messageIds: ['m0'] }] }) };
            }
            if (schema === SynthesisSchema) return { model: 'mock', data: schema.parse({ overview: 'Contexto', timeline: [], decisions: [], openQuestions: [], howUserThinks: [], keyFacts: [] }) };
            if (schema === ProfileSchema) return { model: 'mock', data: schema.parse({ whoIs: 'Usuario', workStyle: [], decisionCriteria: [], preferences: [], activeFronts: [], instructionsForAgents: [] }) };
            throw new Error('Schema inesperado');
        },
    });
    const identity = { accountId: 'account-a', workspaceId: 'personal' };
    const texts = Array.from({ length: 35 }, (_, i) => i === 16 ? `MARCADOR_CENTRAL ${'x'.repeat(1000)}` : `Mensaje ${i} ${'x'.repeat(1000)}`);
    const raw = make('shared-id', texts);
    const first = engine.ingestFromExtension([raw], { identity });
    assert.equal(first.added, 1);
    await waitFor(() => !engine.status().worker.running && engine.status().chatgpt.done === 1);
    const c = engine.listConversations().items[0];
    assert.equal(c.accountId, 'account-a');
    assert.equal(seen.length > 1, true);
    assert.equal(seen.some(p => p.includes('MARCADOR_CENTRAL')), true);
    assert.equal(engine.getConversation(c.id).digest.evidence[0].messageIds[0], 'm0');
    assert.deepEqual(engine.getConversation(c.id).projectKeys.sort(), ['id:p1', 'id:p2']);
    const result = await engine.search({ query: 'MARCADOR_CENTRAL', source: 'chatgpt' });
    assert.equal(result.results[0].doc.source, 'chatgpt');
    assert.equal(result.results[0].doc.meta.date, new Date(raw.update_time * 1000).toISOString());
    assert.equal(result.results[0].doc.meta.accountId, 'account-a');
    const mcp = buildMcpServer({ agent: 'test', scope: 'read', tokenId: null }, { readDB: () => db, knowledge: engine, hub: { logActivity() {} } });
    const found = JSON.parse((await mcp._registeredTools.search_knowledge.handler({ query: 'MARCADOR_CENTRAL', source: 'chatgpt' })).content[0].text);
    assert.equal(found.results[0].source, 'chatgpt');
    assert.equal(found.results[0].date, new Date(raw.update_time * 1000).toISOString().slice(0, 10));
    assert.match(found.results[0].text, /MARCADOR_CENTRAL/);
    const summary = JSON.parse((await mcp._registeredTools.get_conversation_summary.handler({ id: c.id })).content[0].text);
    assert.equal(summary.digest.evidence[0].messageIds[0], 'm0');
    await mcp.close();
    assert.equal(db.tasks.length, 0);
    assert.equal(db.events.length, 0);
    assert.equal(db.projects.length, 2);
    assert.equal(engine.importConversations([raw], { origin: 'upload', identity }).unchanged, 1);
    assert.equal(engine.importConversations([raw], { origin: 'mcp', identity }).unchanged, 1);
    assert.equal(engine.ingestFromExtension([raw], { identity: { accountId: 'account-b', workspaceId: 'personal' } }).added, 1);
    await waitFor(() => !engine.status().worker.running && engine.status().chatgpt.done === 2);
    assert.equal(engine.status().chatgpt.total, 2);
    raw.mapping.n16.message.content.parts = ['MARCADOR_CENTRAL corregido por usuario'];
    assert.equal(engine.ingestFromExtension([raw], { identity }).updated, 1);
    await waitFor(() => !engine.status().worker.running && engine.status().chatgpt.done === 2);
    assert.equal(engine.getConversation(c.id).messages[16].text, 'MARCADOR_CENTRAL corregido por usuario');
    assert.equal(engine.ingestFromExtension([raw], { identity: { accountId: 'account-a', workspaceId: 'workspace-2' } }).updated, 1);
    await waitFor(() => !engine.status().worker.running && engine.status().chatgpt.done === 2);
    assert.equal(engine.status().chatgpt.total, 2);
    assert.equal(engine.listConversations().items.find(x => x.accountId === 'account-a').workspaceId, 'workspace-2');
    assert.equal(engine.listRecentConversationUpdates({ from: '2026-10-01' }).length, 2);
    engine.flush();
    assert.equal(fs.readdirSync(path.join(dir, 'raw/chatgpt/original')).length >= 3, true);
});

test('la cola persiste un fallo, espera y se recupera tras reinicio sin operaciones', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-knowledge-restart-'));
    const db = { projects: [], tasks: [], events: [] };
    let fail = true;
    const create = () => createKnowledgeEngine({
        dataDir: dir, readDB: () => db, getGeminiKey: () => '', availableProviders: () => ['mock'],
        embedder: { model: 'none', dims: 2, available: () => false }, log: { log() {}, warn() {}, error() {} },
        generateStructured: async ({ schema }) => {
            if (fail) throw new Error('Desconexión simulada');
            if (schema === DigestSchema) return { model: 'mock', data: schema.parse({ summary: 'Recuperada tras desconexión', project: '', projectId: '', type: 'idea', relevance: 'media', decisions: [], ideas: [], pending: ['mencionado'], reasoning: [], facts: [], tags: [], evidence: [{ category: 'pending', text: 'mencionado', messageIds: ['m0'] }] }) };
            if (schema === ProfileSchema) return { model: 'mock', data: schema.parse({ whoIs: 'Usuario', workStyle: [], decisionCriteria: [], preferences: [], activeFronts: [], instructionsForAgents: [] }) };
            throw new Error('Schema inesperado');
        },
    });
    const first = create();
    first.ingestFromExtension([make('restart', ['Consulta tras desconexión'])], { identity: { accountId: 'a', workspaceId: 'w' } });
    await waitFor(() => !first.status().worker.running);
    assert.equal(first.status().chatgpt.indexedRaw, 1);
    const entry = first.listConversations().items[0];
    assert.ok(first.getConversation(entry.id).nextRetryAt);
    first.flush();
    fail = false;
    const recovered = create();
    assert.equal(recovered.status().chatgpt.indexedRaw, 1);
    assert.equal(recovered.reprocessConversation(entry.id), true);
    await waitFor(() => !recovered.status().worker.running && recovered.status().chatgpt.done === 1);
    assert.equal((await recovered.search({ query: 'Recuperada tras desconexión', source: 'chatgpt' })).results[0].doc.source, 'chatgpt');
    assert.deepEqual(db.tasks, []);
    assert.deepEqual(db.events, []);
    recovered.flush();
});
