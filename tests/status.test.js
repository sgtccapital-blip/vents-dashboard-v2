import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeTaskStatus, taskStatus, isDone, taskStats,
    normalizeEventStatus, isActiveEvent, isStaleEvent, eventStats,
} from '../src/lib/status.js';

const daysFromToday = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

test('los alias de estado de tarea se normalizan', () => {
    assert.equal(normalizeTaskStatus('working'), 'in-progress');
    assert.equal(normalizeTaskStatus('completed'), 'done');
    assert.equal(normalizeTaskStatus('blocked_auth'), 'blocked');
    assert.equal(normalizeTaskStatus('lol'), null);
    assert.equal(normalizeTaskStatus(undefined), null);
});

test('status manda sobre done; sin status se usa done', () => {
    assert.equal(taskStatus({ status: 'pending', done: true }), 'pending');
    assert.equal(taskStatus({ done: true }), 'done');
    assert.equal(taskStatus({}), 'pending');
    assert.equal(isDone({ status: 'completed' }), true);
});

test('taskStats cuadra con los datos reales (tareas sin status)', () => {
    const tasks = [...Array(7)].map(() => ({ done: false })).concat([{ done: true }]);
    assert.deepEqual(taskStats(tasks), { total: 8, done: 1, pending: 7, inProgress: 0, blocked: 0, completionRate: 13 });
});

test('eventos: alias y vigencia por fecha', () => {
    assert.equal(normalizeEventStatus('active'), 'activo');
    assert.equal(normalizeEventStatus('planeacion'), 'planificacion');
    assert.equal(normalizeEventStatus('upcoming'), 'planificacion');

    assert.equal(isActiveEvent({ status: 'activo' }), true, 'sin fecha y activo cuenta');
    assert.equal(isActiveEvent({ status: 'activo', date: daysFromToday(-3) }), false, 'ya pasó');
    assert.equal(isActiveEvent({ status: 'planificacion', date: daysFromToday(10) }), true);
    assert.equal(isActiveEvent({ status: 'activo', date: daysFromToday(0) }), true, 'hoy sigue vigente');
    assert.equal(isActiveEvent({ status: 'borrador', date: daysFromToday(10) }), false);
    assert.equal(isActiveEvent({ status: 'cancelado' }), false);

    assert.equal(isStaleEvent({ status: 'activo', date: daysFromToday(-3) }), true);
    assert.equal(isStaleEvent({ status: 'completado', date: daysFromToday(-3) }), false);
    assert.deepEqual(eventStats([{ status: 'activo' }, { status: 'activo', date: daysFromToday(-1) }]), { total: 2, active: 1, stale: 1 });
});
