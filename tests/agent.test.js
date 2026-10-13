import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
    tokenize, parseSpanishDate, expandSlashCommand, searchKnowledge, executeAgentAction, runLocalAgent, runGeminiAgent, findTask,
} from '../server/agent.js';

const TODAY = new Date(2026, 9, 13, 10, 0); // martes 13 oct 2026

const makeDb = () => ({
    projects: [
        { id: 'p1', name: 'App de Reservas', status: 'active', priority: 'high', milestones: [{ title: 'MVP', done: true }, { title: 'Lanzamiento', done: false }] },
        { id: 'client-terraplen', name: 'Terraplén Rooftop', isClient: true, status: 'active' },
    ],
    events: [
        { id: 'e1', name: 'Sunset Session', date: '2026-10-16', location: 'Terraplén', status: 'activo' },
        { id: 'e0', name: 'Fiesta Pasada', date: '2026-09-01', status: 'completado' },
    ],
    tasks: [
        { id: 't1', text: 'Confirmar DJ para Furia', status: 'pending', priority: 'high', assignee: 'MARIO', due: '2026-10-10' },
        { id: 't2', text: 'Enviar propuesta a cliente', status: 'pending', assignee: 'GG' },
        { id: 't3', text: 'Diseñar flyer del sábado', status: 'done' },
    ],
    notes: [],
    ragDocuments: [
        { id: 'doc-sop', title: 'SOP Operación de Barra', namespace: 'default', category: 'sop', content: 'La operación de barra empieza a las 6pm. El inventario de hielo se pide al proveedor Polar los jueves.' },
        { id: 'entity-task-old', title: 'Espejo viejo', content: 'operación barra hielo' },
    ],
});

test('tokenize quita acentos, stopwords y plurales simples', () => {
    assert.deepEqual(tokenize('¿Cuáles son las operaciones de barra?'), ['operacion', 'barra']);
});

test('parseSpanishDate entiende fechas comunes', () => {
    assert.equal(parseSpanishDate('para mañana', TODAY), '2026-10-14');
    assert.equal(parseSpanishDate('el viernes', TODAY), '2026-10-16');
    assert.equal(parseSpanishDate('el 24 de octubre', TODAY), '2026-10-24');
    assert.equal(parseSpanishDate('el 5 de enero', TODAY), '2027-01-05');
    assert.equal(parseSpanishDate('2026-12-01', TODAY), '2026-12-01');
    assert.equal(parseSpanishDate('sin fecha', TODAY), null);
});

test('searchKnowledge encuentra por términos con acentos y no devuelve relleno', () => {
    const db = makeDb();
    const hit = searchKnowledge(db, '¿cuándo se pide el hielo?');
    assert.equal(hit.results[0].id, 'doc-sop');
    assert.match(hit.context, /proveedor Polar/);
    assert.ok(!hit.results.some(r => r.id === 'entity-task-old'), 'ignora espejos viejos de entidades');
    assert.equal(searchKnowledge(db, 'xilofono submarino').results.length, 0);
});

test('searchKnowledge incluye datos vivos (eventos, tareas)', () => {
    const db = makeDb();
    const { results } = searchKnowledge(db, 'Sunset Session');
    assert.equal(results[0].entityId, 'e1');
});

test('executeAgentAction: acción desconocida y datos faltantes fallan', () => {
    const db = makeDb();
    assert.equal(executeAgentAction('borrar_todo', {}, db).success, false);
    assert.equal(executeAgentAction('add_task', {}, db).success, false);
    const r = executeAgentAction('complete_task', { text: '' }, db);
    assert.equal(r.success, false);
    assert.ok(db.tasks.every(t => t.id === 't3' ? t.status === 'done' : t.status === 'pending'), 'no completa nada al azar');
});

test('executeAgentAction: add_task normaliza prioridad, responsable y fecha', () => {
    const db = makeDb();
    const r = executeAgentAction('add_task', { text: 'Pedir hielo', priority: 'alta', assignee: 'andrea', due: 'mañana' }, db, { today: TODAY });
    assert.equal(r.success, true);
    assert.equal(r.task.priority, 'high');
    assert.equal(r.task.assignee, 'ANDREA');
    assert.equal(r.task.due, '2026-10-14');
    assert.equal(db.tasks[0].id, r.task.id);
});

test('findTask exige coincidencia clara', () => {
    const db = makeDb();
    assert.equal(findTask(db, { text: 'dj furia' }).task.id, 't1');
    assert.equal(findTask(db, { text: 'flyer' }).task, null, 'no toma tareas ya hechas');
});

test('create_client_post guarda el post en la ficha del cliente, no en redes sociales', () => {
    const db = makeDb();
    db.socialMedia = [];
    const r = executeAgentAction('create_client_post', { clientName: 'terraplen rooftop', title: 'Reel sunset' }, db, { today: TODAY });
    assert.equal(r.success, true);
    assert.equal(db.projects[1].posts[0].title, 'Reel sunset');
    assert.equal(db.socialMedia.length, 0);
});

test('runLocalAgent: una pregunta nunca crea tareas', () => {
    const db = makeDb();
    const r = runLocalAgent('¿Qué tareas tengo pendientes?', db, { today: TODAY });
    assert.equal(r.executedTools.length, 0);
    assert.equal(db.tasks.length, 3);
    assert.match(r.reply, /Confirmar DJ para Furia/);
    assert.match(r.reply, /vencida/);
});

test('runLocalAgent: filtra tareas por responsable', () => {
    const r = runLocalAgent('tareas de MARIO', makeDb(), { today: TODAY });
    assert.match(r.reply, /Confirmar DJ/);
    assert.doesNotMatch(r.reply, /Enviar propuesta/);
});

test('runLocalAgent: crea tarea con responsable y fecha', () => {
    const db = makeDb();
    const r = runLocalAgent('crea una tarea para ANDREA: llamar al proveedor de hielo el viernes', db, { today: TODAY });
    assert.equal(r.executedTools[0].name, 'add_task');
    const t = r.executedTools[0].result.task;
    assert.equal(t.assignee, 'ANDREA');
    assert.equal(t.due, '2026-10-16');
    assert.equal(t.text, 'Llamar al proveedor de hielo');
});

test('runLocalAgent: completa la tarea correcta', () => {
    const db = makeDb();
    const r = runLocalAgent('completa la tarea confirmar DJ', db, { today: TODAY });
    assert.equal(r.executedTools[0].result.task.id, 't1');
    assert.equal(db.tasks.find(t => t.id === 't1').status, 'done');
});

test('runLocalAgent: próximo evento y agendar evento', () => {
    const db = makeDb();
    assert.match(runLocalAgent('¿cuál es el próximo evento?', db, { today: TODAY }).reply, /Sunset Session/);
    const r = runLocalAgent('agenda evento Noche Latina el 24 de octubre en Furia', db, { today: TODAY });
    const ev = r.executedTools[0].result.event;
    assert.equal(ev.name, 'Noche Latina');
    assert.equal(ev.date, '2026-10-24');
    assert.equal(ev.location, 'Furia');
});

test('runLocalAgent: responde con el RAG', () => {
    const r = runLocalAgent('proveedor de hielo', makeDb(), { today: TODAY });
    assert.match(r.reply, /SOP Operación de Barra/);
    assert.equal(r.executedTools.length, 0);
});

// ─── Gemini con servidor falso ───────────────────────────────

function fakeGemini(handler) {
    return new Promise(resolve => {
        const calls = [];
        const server = http.createServer((req, res) => {
            let body = '';
            req.on('data', c => { body += c; });
            req.on('end', () => {
                const call = { url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body) };
                calls.push(call);
                const { status = 200, json } = handler(call, calls.length);
                res.writeHead(status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(json));
            });
        });
        server.listen(0, () => {
            process.env.GEMINI_API_BASE = `http://127.0.0.1:${server.address().port}`;
            resolve({ server, calls });
        });
    });
}

test('runGeminiAgent ejecuta herramientas, devuelve resultados al modelo y cae al siguiente modelo si uno no existe', async () => {
    const { server, calls } = await fakeGemini((call) => {
        if (call.url.includes('modelo-inexistente')) return { status: 404, json: { error: { message: 'model not found' } } };
        const last = call.body.contents.at(-1);
        if (last.parts[0].functionResponse) {
            const result = last.parts[0].functionResponse.response.result;
            return { json: { candidates: [{ content: { role: 'model', parts: [{ text: `Creé la tarea "${result.task.text}" para ${result.task.assignee}.` }] } }] } };
        }
        return { json: { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'add_task', args: { text: 'Pedir hielo', assignee: 'MARIO' } } }] } }] } };
    });
    try {
        const db = makeDb();
        const r = await runGeminiAgent({ apiKey: 'k', model: 'modelo-inexistente', systemPrompt: 'sys', prompt: 'crea tarea pedir hielo para mario', db, today: TODAY });
        assert.equal(r.error, undefined);
        assert.equal(r.reply, 'Creé la tarea "Pedir hielo" para MARIO.');
        assert.equal(r.executedTools.length, 1);
        assert.equal(db.tasks[0].text, 'Pedir hielo');
        assert.equal(calls[0].key, 'k', 'la clave va en cabecera, no en la URL');
        assert.ok(!calls.some(c => c.url.includes('key=')));
        assert.equal(calls.length, 3); // 404 + functionCall + respuesta final
    } finally {
        server.close();
        delete process.env.GEMINI_API_BASE;
    }
});

test('runGeminiAgent: clave inválida devuelve error sin probar más modelos', async () => {
    const { server, calls } = await fakeGemini(() => ({ status: 400, json: { error: { message: 'API key not valid. Please pass a valid API key.' } } }));
    try {
        const r = await runGeminiAgent({ apiKey: 'mala', model: 'x', systemPrompt: 's', prompt: 'hola', db: makeDb() });
        assert.equal(r.authError, true);
        assert.equal(calls.length, 1);
    } finally {
        server.close();
        delete process.env.GEMINI_API_BASE;
    }
});

test('comandos rápidos de la UI funcionan con el agente local', () => {
    assert.equal(expandSlashCommand('/tarea comprar hielo').prompt, 'crea una tarea: comprar hielo');
    const db = makeDb();
    const t = runLocalAgent('/tarea comprar hielo para MARIO mañana', db, { today: TODAY });
    assert.equal(t.executedTools[0].result.task.text, 'Comprar hielo');
    assert.equal(t.executedTools[0].result.task.assignee, 'MARIO');
    assert.equal(t.executedTools[0].result.task.due, '2026-10-14');
    assert.match(runLocalAgent('/rag hielo', db, { today: TODAY }).reply, /SOP Operación de Barra/);
    assert.match(runLocalAgent('/reporte', db, { today: TODAY }).reply, /Resumen/);
    assert.equal(runLocalAgent('/evento Noche Latina el 24 de octubre', db, { today: TODAY }).executedTools[0].result.event.date, '2026-10-24');
});
