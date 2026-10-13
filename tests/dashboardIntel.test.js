import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    localDateKey, daysUntil, buildPortfolioPulse, summarizeSubscriptions, buildDecisionInbox, buildDailyPriorityPanel,
} from '../src/lib/dashboardIntel.js';

const TODAY = new Date(2026, 9, 13, 21, 30); // 13 oct 2026, 9:30pm hora local

test('localDateKey usa la fecha local, no UTC', () => {
    assert.equal(localDateKey(TODAY), '2026-10-13');
});

test('daysUntil cuenta días de calendario', () => {
    assert.equal(daysUntil('2026-10-13', TODAY), 0);
    assert.equal(daysUntil('2026-10-20', TODAY), 7);
    assert.equal(daysUntil('2026-10-10', TODAY), -3);
    assert.equal(daysUntil('', TODAY), null);
    assert.equal(daysUntil('no-es-fecha', TODAY), null);
});

test('buildPortfolioPulse: progreso por hitos, ignora cerrados y ordena por urgencia', () => {
    const projects = [
        { id: 'a', name: 'A', priority: 'low', deadline: '2027-06-01', milestones: [{ done: true }, { done: false, title: 'Siguiente' }] },
        { id: 'b', name: 'B', priority: 'critical', deadline: '2026-10-15', milestones: [] },
        { id: 'c', name: 'C', status: 'completed' },
    ];
    const tasks = [
        { id: 't1', projectId: 'b', status: 'pending' },
        { id: 't2', projectId: 'b', status: 'done' },
    ];
    const pulse = buildPortfolioPulse({ projects, tasks }, TODAY);
    assert.deepEqual(pulse.map(p => p.id), ['b', 'a']);
    assert.equal(pulse[0].openTasks, 1);
    assert.equal(pulse[0].daysLeft, 2);
    assert.equal(pulse[1].progress, 50);
    assert.equal(pulse[1].nextMilestone, 'Siguiente');
});

test('summarizeSubscriptions: gasto mensual equivalente y renovaciones próximas', () => {
    const subs = [
        { id: 's1', name: 'Mensual', cost: 20, cycle: 'Monthly', nextPayment: '2026-10-15', status: 'Active' },
        { id: 's2', name: 'Anual', cost: 120, cycle: 'Yearly', nextPayment: '2027-01-01', status: 'Active' },
        { id: 's3', name: 'Cancelada', cost: 99, cycle: 'Monthly', status: 'Cancelled' },
    ];
    const summary = summarizeSubscriptions(subs, TODAY);
    assert.equal(summary.activeCount, 2);
    assert.equal(summary.monthlyBurn, 30);
    assert.deepEqual(summary.upcomingRenewals.map(s => s.id), ['s1']);
});

test('buildDecisionInbox solo pide dueño para tareas críticas sin asignar', () => {
    const tasks = [
        { id: 'x', text: 'Sin dueño', priority: 'high', status: 'pending' },
        { id: 'y', text: 'Con dueño', priority: 'high', status: 'pending', assignee: 'GG' },
    ];
    const inbox = buildDecisionInbox({ events: [], tasks });
    assert.deepEqual(inbox.map(d => d.linkedId), ['x']);
});

test('buildDailyPriorityPanel: una tarea que vence hoy no cuenta como vencida', () => {
    const today = localDateKey();
    const yesterday = localDateKey(new Date(Date.now() - 86400000));
    const tasks = [
        { id: 'hoy', text: 'Hoy', due: today, status: 'pending' },
        { id: 'ayer', text: 'Ayer', due: yesterday, status: 'pending' },
    ];
    const { overdue } = buildDailyPriorityPanel({ events: [], tasks });
    assert.deepEqual(overdue.map(t => t.id), ['ayer']);
});
