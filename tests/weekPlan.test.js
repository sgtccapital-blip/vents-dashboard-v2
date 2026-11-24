import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, taskBucket, taskDueDay, ownerName, buildWeekPlan, eventsThisWeek } from '../src/lib/weekPlan.js';

const TODAY = '2026-11-24';

test('addDays cruza fin de mes y de año', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('fecha límite: acepta due o dueDate, ignora textos como "Jueves"', () => {
    assert.equal(taskDueDay({ dueDate: '2026-11-30T10:00:00Z' }), '2026-11-30');
    assert.equal(taskDueDay({ due: 'Jueves 8:30 PM' }), null);
    assert.equal(taskDueDay({}), null);
});

test('bloques: vencida, hoy, semana, más adelante, sin fecha', () => {
    assert.equal(taskBucket({ due: '2026-11-23' }, TODAY), 'overdue');
    assert.equal(taskBucket({ due: TODAY }, TODAY), 'today');
    assert.equal(taskBucket({ due: '2026-11-30' }, TODAY), 'week');
    assert.equal(taskBucket({ due: '2026-12-01' }, TODAY), 'later');
    assert.equal(taskBucket({}, TODAY), 'nodate');
});

test('el dueño se agrupa sin el cargo', () => {
    assert.equal(ownerName({ assignedTo: 'Dalia (Asistente Ejecutiva)' }), 'Dalia');
    assert.equal(ownerName({ assignee: 'Dalia' }), 'Dalia');
    assert.equal(ownerName({}), '');
});

test('plan semanal: ignora hechas, cuenta carga y filtra por persona', () => {
    const tasks = [
        { id: 1, text: 'a', due: '2026-11-20', assignedTo: 'Dalia (Asistente)', status: 'pending' },
        { id: 2, text: 'b', due: TODAY, assignedTo: 'Dalia', status: 'pending' },
        { id: 3, text: 'c', due: TODAY, assignedTo: 'Mario', status: 'done', done: true },
        { id: 4, text: 'd', status: 'pending' },
    ];
    const all = buildWeekPlan(tasks, { today: TODAY });
    assert.equal(all.totalPending, 3);
    assert.equal(all.unassigned, 1);
    assert.deepEqual(all.owners, [{ name: 'Dalia', pending: 2, overdue: 1, today: 1 }]);
    assert.deepEqual(all.buckets.overdue.map(t => t.id), [1]);
    assert.deepEqual(all.buckets.nodate.map(t => t.id), [4]);

    assert.deepEqual(buildWeekPlan(tasks, { today: TODAY, owner: '__none__' }).buckets.nodate.map(t => t.id), [4]);
    assert.equal(buildWeekPlan(tasks, { today: TODAY, owner: 'Dalia' }).buckets.nodate.length, 0);
});

test('eventos de la semana incluyen instancias', () => {
    const events = [
        { id: 'e1', name: 'Casco', instances: [{ date: '2026-11-29' }, { date: '2026-12-27' }] },
        { id: 'e2', name: 'Viejo', date: '2026-10-01' },
    ];
    assert.deepEqual(eventsThisWeek(events, TODAY).map(e => `${e.id}@${e.day}`), ['e1@2026-11-29']);
});
