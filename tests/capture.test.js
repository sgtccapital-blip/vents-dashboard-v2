import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createCaptureService } from '../src/services/agentHub/captureService.js';

function fixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrive-capture-'));
    const db = { projects: [{ id: 'existing', name: 'Hang Out', status: 'active', objective: 'Actual' }], tasks: [], events: [] };
    let seq = 0;
    const readDB = () => structuredClone(db);
    const createEntity = (kind, data) => { const row = { id: `${kind}-${++seq}`, ...data }; db[kind].push(row); return row; };
    const updateEntity = (kind, id, changes) => { const row = db[kind].find(x => x.id === id); Object.assign(row, changes); return row; };
    const capture = createCaptureService({ dir, readDB, createEntity, updateEntity });
    return { db, capture, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('captura: conserva el proyecto actual, versiona briefs y no duplica el lote', () => {
    const f = fixture();
    try {
        const batch = { capture_id: 'batch-a', projects: [{ id: 'existing', external_id: 'gg-hangout', name: 'HangOut Panamá', status: 'needs-review', objective: 'Borrador' }], briefs: [{ project_id: 'gg-hangout', content: '# Brief' }], tasks: [{ external_id: 'gg-hangout-t01', project_external_id: 'gg-hangout', text: 'Revisar lanzamiento', due: null, assigned_to: null }] };
        const first = f.capture.apply(batch);
        assert.equal(first.errors, 0);
        assert.equal(f.db.projects[0].status, 'active');
        assert.equal(f.db.projects[0].objective, 'Actual');
        assert.equal(f.db.projects[0].briefVersions.length, 1);
        assert.equal(f.db.tasks.length, 1);
        assert.equal(f.db.tasks[0].due, '');
        assert.equal(f.db.tasks[0].assignedTo, '');
        f.capture.apply(batch);
        assert.equal(f.db.projects.length, 1);
        assert.equal(f.db.tasks.length, 1);
        assert.equal(f.db.projects[0].briefVersions.length, 1);
        assert.equal(f.capture.upsertBrief({ project_id: 'existing', content: '# Brief' }).action, 'existing');
        assert.equal(f.capture.upsertBrief({ project_id: 'existing', content: '# Brief revised' }).version, 2);
    } finally { f.cleanup(); }
});

test('captura: reintenta errores, valida dependencias, agenda y transfiere bytes', () => {
    const f = fixture();
    try {
        const batch = { capture_id: 'batch-b', tasks: [{ project_id: 'new-project', text: 'Tarea pendiente' }] };
        assert.equal(f.capture.apply(batch).errors, 1);
        f.capture.upsertProject({ name: 'Proyecto nuevo', external_id: 'new-project' });
        const resumed = f.capture.apply(batch);
        assert.equal(resumed.errors, 0);
        assert.equal(f.db.tasks.length, 1);
        assert.throws(() => f.capture.upsertTask({ text: 'Otra', dependencies: ['missing'] }), /Dependencia/);
        const dependent = f.capture.upsertTask({ text: 'Otra', project_id: 'new-project', dependencies: [f.db.tasks[0].id] });
        assert.equal(f.db.tasks.find(t => t.id === dependent.id).dependencies[0], f.db.tasks[0].id);
        assert.throws(() => f.capture.upsertEvent({ name: 'Sin fecha' }), /fecha/);
        const event = f.capture.upsertEvent({ name: 'Prueba', date: '2030-01-01', time: '09:30', timezone: 'America/Panama', project_id: 'new-project' });
        assert.equal(f.db.events.find(e => e.id === event.id).timezone, 'America/Panama');
        const content = Buffer.from('Documento real de prueba.');
        const sha256 = crypto.createHash('sha256').update(content).digest('hex');
        const file = f.capture.attach({ project_id: 'new-project', task_id: dependent.id, name: 'nota.txt', content_base64: content.toString('base64'), sha256 });
        assert.equal(f.capture.readFile(file.id).bytes.toString(), content.toString());
        assert.equal(f.capture.attach({ project_id: 'new-project', task_id: dependent.id, name: 'nota.txt', content_base64: content.toString('base64') }).action, 'existing');
    } finally { f.cleanup(); }
});
