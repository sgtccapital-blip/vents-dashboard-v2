// Cálculos de Finanzas: gasto mensual de suscripciones, próximos cobros y presupuestos.
// Sin React para poder probarlo con node --test.
import { localDay, addDays } from './weekPlan.js';

export const CYCLES = {
    Weekly: { label: 'Semanal', months: 12 / 52 },
    Monthly: { label: 'Mensual', months: 1 },
    Quarterly: { label: 'Trimestral', months: 3 },
    Yearly: { label: 'Anual', months: 12 },
};
const CYCLE_ALIASES = { annual: 'Yearly', anual: 'Yearly', yearly: 'Yearly', mensual: 'Monthly', monthly: 'Monthly', trimestral: 'Quarterly', quarterly: 'Quarterly', semanal: 'Weekly', weekly: 'Weekly' };

export const normalizeCycle = (cycle) => CYCLE_ALIASES[String(cycle || '').trim().toLowerCase()] || 'Monthly';

/** "$1,200.50", "1200", 1200 → 1200.5; vacío o inválido → 0. */
export function parseMoney(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export const formatMoney = (n) =>
    `$${parseMoney(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const isActiveSubscription = (s) => !['cancelled', 'canceled', 'cancelada', 'paused', 'pausada'].includes(String(s?.status || 'Active').toLowerCase());

/** Costo equivalente por mes (una anual de $120 cuenta $10/mes). */
export function monthlyCost(sub) {
    if (!isActiveSubscription(sub)) return 0;
    return parseMoney(sub.cost) / CYCLES[normalizeCycle(sub.cycle)].months;
}

function addMonths(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    const lastDay = new Date(y, m - 1 + n + 1, 0).getDate();
    const pad = v => String(v).padStart(2, '0');
    const target = new Date(y, m - 1 + n, 1);
    return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(Math.min(d, lastDay))}`;
}

/**
 * Próximo cobro desde hoy. Si la fecha guardada ya pasó, avanza por ciclos
 * (un cobro mensual del 31 cae el 30 en noviembre). null si no hay fecha.
 */
export function nextPaymentDay(sub, today = localDay()) {
    const raw = String(sub?.nextPayment || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!raw) return null;
    const cycle = normalizeCycle(sub.cycle);
    let day = raw;
    for (let i = 1; day < today && i < 1000; i++) {
        day = cycle === 'Weekly' ? addDays(raw, 7 * i) : addMonths(raw, CYCLES[cycle].months * i);
    }
    return day;
}

/** Cobros de suscripciones activas entre hoy y dentro de `days` días, ordenados por fecha. */
export function upcomingPayments(subs = [], { today = localDay(), days = 30 } = {}) {
    const end = addDays(today, days);
    return subs
        .filter(isActiveSubscription)
        .map(s => ({ sub: s, day: nextPaymentDay(s, today) }))
        .filter(p => p.day && p.day <= end)
        .sort((a, b) => a.day.localeCompare(b.day));
}

export function subscriptionSummary(subs = []) {
    const active = subs.filter(isActiveSubscription);
    const monthly = active.reduce((sum, s) => sum + monthlyCost(s), 0);
    return {
        activeCount: active.length,
        monthly,
        yearly: monthly * 12,
        missingCost: active.filter(s => parseMoney(s.cost) <= 0).length,
        missingDate: active.filter(s => !nextPaymentDay(s)).length,
    };
}

/** Presupuestos de proyectos y eventos (solo los que tienen monto). */
export function budgetLines(projects = [], events = []) {
    const rows = [
        ...projects.map(p => ({ id: p.id, name: p.name, kind: 'Proyecto', budget: parseMoney(p.budget) || parseMoney(p.estimatedBudget), status: p.status })),
        ...events.map(e => ({ id: e.id, name: e.name, kind: 'Evento', budget: parseMoney(e.budget) || parseMoney(e.estimatedBudget), status: e.status })),
    ];
    return rows.filter(r => r.budget > 0).sort((a, b) => b.budget - a.budget);
}
