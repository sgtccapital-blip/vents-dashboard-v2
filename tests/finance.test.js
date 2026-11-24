import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, monthlyCost, nextPaymentDay, upcomingPayments, subscriptionSummary, budgetLines, normalizeCycle } from '../src/lib/finance.js';

const TODAY = '2026-11-24';

test('parseMoney acepta textos con símbolos y rechaza basura', () => {
    assert.equal(parseMoney('$1,200.50'), 1200.5);
    assert.equal(parseMoney('15000'), 15000);
    assert.equal(parseMoney(''), 0);
    assert.equal(parseMoney('abc'), 0);
});

test('ciclos: alias en español e inglés', () => {
    assert.equal(normalizeCycle('Anual'), 'Yearly');
    assert.equal(normalizeCycle('monthly'), 'Monthly');
    assert.equal(normalizeCycle(undefined), 'Monthly');
});

test('costo mensual equivalente y suscripciones pausadas en 0', () => {
    assert.equal(monthlyCost({ cost: 120, cycle: 'Yearly' }), 10);
    assert.equal(monthlyCost({ cost: 30, cycle: 'Quarterly' }), 10);
    assert.equal(monthlyCost({ cost: 20, cycle: 'Monthly', status: 'Paused' }), 0);
});

test('próximo cobro avanza fechas viejas por ciclo y respeta fin de mes', () => {
    assert.equal(nextPaymentDay({ nextPayment: '2026-05-01', cycle: 'Monthly' }, TODAY), '2026-12-01');
    assert.equal(nextPaymentDay({ nextPayment: '2026-01-31', cycle: 'Monthly' }, TODAY), '2026-11-30');
    assert.equal(nextPaymentDay({ nextPayment: '2026-03-15', cycle: 'Yearly' }, TODAY), '2027-03-15');
    assert.equal(nextPaymentDay({ nextPayment: '2026-11-24', cycle: 'Monthly' }, TODAY), '2026-11-24');
    assert.equal(nextPaymentDay({ nextPayment: '2026-11-10', cycle: 'Weekly' }, TODAY), '2026-11-24');
    assert.equal(nextPaymentDay({}, TODAY), null);
});

test('próximos cobros y resumen', () => {
    const subs = [
        { id: 'a', cost: 20, cycle: 'Monthly', nextPayment: '2026-05-28' },
        { id: 'b', cost: 0, cycle: 'Monthly', nextPayment: '2026-05-01' },
        { id: 'c', cost: 240, cycle: 'Yearly', nextPayment: '2026-06-01' },
        { id: 'd', cost: 50, cycle: 'Monthly', nextPayment: '2026-11-25', status: 'Cancelled' },
    ];
    assert.deepEqual(upcomingPayments(subs, { today: TODAY, days: 7 }).map(p => `${p.sub.id}@${p.day}`), ['a@2026-11-28', 'b@2026-12-01']);
    assert.deepEqual(subscriptionSummary(subs), { activeCount: 3, monthly: 40, yearly: 480, missingCost: 1, missingDate: 0 });
});

test('presupuestos: solo con monto, de mayor a menor', () => {
    const rows = budgetLines([{ id: 'p', name: 'P', budget: '15000' }, { id: 'q', name: 'Q' }], [{ id: 'e', name: 'E', budget: '0', estimatedBudget: '3500' }]);
    assert.deepEqual(rows.map(r => `${r.id}:${r.budget}`), ['p:15000', 'e:3500']);
});
