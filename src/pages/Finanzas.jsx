import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Plus, Trash2, ExternalLink, AlertTriangle, CalendarClock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CYCLES, normalizeCycle, parseMoney, formatMoney, monthlyCost, nextPaymentDay, upcomingPayments, subscriptionSummary, budgetLines, isActiveSubscription } from '../lib/finance';
import { localDay } from '../lib/weekPlan';
import './Finanzas.css';

const STATUSES = [['Active', 'Activa'], ['Paused', 'Pausada'], ['Cancelled', 'Cancelada']];

const shortDay = (day) => {
    if (!day) return '—';
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: y === new Date().getFullYear() ? undefined : 'numeric' });
};

// Campo que guarda al salir (no en cada tecla, para no mandar una petición por letra).
function BlurInput({ value, onSave, ...props }) {
    const [draft, setDraft] = useState(value ?? '');
    const [prev, setPrev] = useState(value);
    if (value !== prev) { setPrev(value); setDraft(value ?? ''); }
    return (
        <input {...props} value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={() => { if (String(draft) !== String(value ?? '')) onSave(draft); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    );
}

export default function Finanzas() {
    const { subscriptions, addSubscription, updateSubscription, deleteSubscription, projects, events } = useApp();
    const subs = useMemo(() => subscriptions || [], [subscriptions]);
    const today = localDay();
    const summary = useMemo(() => subscriptionSummary(subs), [subs]);
    const upcoming = useMemo(() => upcomingPayments(subs, { today, days: 30 }), [subs, today]);
    const upcomingTotal = upcoming.reduce((s, p) => s + parseMoney(p.sub.cost), 0);
    const budgets = useMemo(() => budgetLines(projects || [], events || []), [projects, events]);
    const budgetTotal = budgets.reduce((s, b) => s + b.budget, 0);

    const [draft, setDraft] = useState({ name: '', cost: '', cycle: 'Monthly', nextPayment: '', account: '' });

    const save = (id, data) => updateSubscription(id, data);

    const create = async (e) => {
        e.preventDefault();
        if (!draft.name.trim()) return;
        await addSubscription({
            id: `sub-${Date.now()}`,
            name: draft.name.trim(),
            cost: parseMoney(draft.cost),
            cycle: draft.cycle,
            nextPayment: draft.nextPayment,
            account: draft.account.trim(),
            status: 'Active',
            type: '', provider: '', url: '',
        });
        setDraft({ name: '', cost: '', cycle: 'Monthly', nextPayment: '', account: '' });
    };

    const remove = (s) => {
        if (window.confirm(`¿Eliminar la suscripción "${s.name}"${s.account ? ` (${s.account})` : ''}?`)) deleteSubscription(s.id);
    };

    const sorted = [...subs].sort((a, b) =>
        Number(isActiveSubscription(b)) - Number(isActiveSubscription(a)) ||
        (nextPaymentDay(a, today) || '9999').localeCompare(nextPaymentDay(b, today) || '9999'));

    return (
        <div className="page-content animate-in fz-page">
            <div className="fz-header">
                <div>
                    <h1><Wallet size={22} /> Finanzas</h1>
                    <p>Suscripciones, próximos cobros y presupuestos. Montos en USD.</p>
                </div>
            </div>

            <div className="fz-kpis">
                <div className="fz-kpi"><span>Gasto mensual</span><strong>{formatMoney(summary.monthly)}</strong><small>{summary.activeCount} suscripciones activas</small></div>
                <div className="fz-kpi"><span>Al año</span><strong>{formatMoney(summary.yearly)}</strong><small>a este ritmo</small></div>
                <div className="fz-kpi"><span>Próximos 30 días</span><strong>{formatMoney(upcomingTotal)}</strong><small>{upcoming.length} cobros</small></div>
                <div className="fz-kpi"><span>Presupuestos</span><strong>{formatMoney(budgetTotal)}</strong><small>{budgets.length} proyectos y eventos</small></div>
            </div>

            {summary.missingCost > 0 && (
                <div className="fz-warning">
                    <AlertTriangle size={15} />
                    {summary.missingCost} de {summary.activeCount} suscripciones activas no tienen costo: el gasto mensual está incompleto hasta que lo pongas.
                </div>
            )}

            <section className="fz-card">
                <h2><CalendarClock size={16} /> Próximos cobros (30 días)</h2>
                {upcoming.length === 0
                    ? <p className="fz-empty">Ningún cobro en los próximos 30 días.</p>
                    : <div className="fz-upcoming">
                        {upcoming.map(({ sub, day }) => (
                            <div key={sub.id} className={`fz-pay ${day <= today ? 'is-today' : ''}`}>
                                <strong>{shortDay(day)}</strong>
                                <span>{sub.name}{sub.account ? <em> · {sub.account}</em> : ''}</span>
                                <b className={parseMoney(sub.cost) > 0 ? '' : 'fz-nocost'}>{parseMoney(sub.cost) > 0 ? formatMoney(sub.cost) : 'sin costo'}</b>
                            </div>
                        ))}
                    </div>}
            </section>

            <section className="fz-card">
                <h2>Suscripciones</h2>
                <form className="fz-add" onSubmit={create}>
                    <input placeholder="Nombre" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    <input placeholder="Costo" inputMode="decimal" value={draft.cost} onChange={e => setDraft({ ...draft, cost: e.target.value })} />
                    <select value={draft.cycle} onChange={e => setDraft({ ...draft, cycle: e.target.value })}>
                        {Object.entries(CYCLES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                    </select>
                    <input type="date" value={draft.nextPayment} onChange={e => setDraft({ ...draft, nextPayment: e.target.value })} title="Próximo cobro" />
                    <input placeholder="Cuenta" value={draft.account} onChange={e => setDraft({ ...draft, account: e.target.value })} />
                    <button className="btn btn-primary" type="submit" disabled={!draft.name.trim()}><Plus size={14} /> Agregar</button>
                </form>

                <div className="fz-table-wrap">
                    <table className="fz-table">
                        <thead>
                            <tr><th>Servicio</th><th>Cuenta</th><th>Costo</th><th>Ciclo</th><th>Al mes</th><th>Próximo cobro</th><th>Estado</th><th /></tr>
                        </thead>
                        <tbody>
                            {sorted.map(s => {
                                const next = nextPaymentDay(s, today);
                                const active = isActiveSubscription(s);
                                return (
                                    <tr key={s.id} className={active ? '' : 'is-inactive'}>
                                        <td>
                                            <BlurInput className="fz-cell" value={s.name} onSave={v => save(s.id, { name: v })} />
                                            {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="fz-link" title="Abrir"><ExternalLink size={12} /></a>}
                                        </td>
                                        <td><BlurInput className="fz-cell fz-muted" value={s.account} onSave={v => save(s.id, { account: v })} /></td>
                                        <td><BlurInput className={`fz-cell fz-money ${parseMoney(s.cost) > 0 ? '' : 'fz-nocost'}`} inputMode="decimal" value={parseMoney(s.cost) || ''} placeholder="$ ?" onSave={v => save(s.id, { cost: parseMoney(v) })} /></td>
                                        <td>
                                            <select className="fz-cell" value={normalizeCycle(s.cycle)} onChange={e => save(s.id, { cycle: e.target.value })}>
                                                {Object.entries(CYCLES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="fz-money">{active && parseMoney(s.cost) > 0 ? formatMoney(monthlyCost(s)) : '—'}</td>
                                        <td>
                                            <input type="date" className="fz-cell" value={next || ''} onChange={e => save(s.id, { nextPayment: e.target.value })}
                                                title={s.nextPayment && s.nextPayment !== next ? `Guardado: ${s.nextPayment} (se avanza solo por ciclo)` : 'Próximo cobro'} />
                                        </td>
                                        <td>
                                            <select className="fz-cell" value={STATUSES.find(([k]) => k.toLowerCase() === String(s.status || 'Active').toLowerCase())?.[0] || 'Active'} onChange={e => save(s.id, { status: e.target.value })}>
                                                {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                            </select>
                                        </td>
                                        <td><button className="fz-del" onClick={() => remove(s)} title="Eliminar"><Trash2 size={14} /></button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="fz-card">
                <h2>Presupuestos de proyectos y eventos</h2>
                <p className="fz-note">Monto planeado de cada ficha. Todavía no hay gasto real registrado contra ellos.</p>
                {budgets.length === 0
                    ? <p className="fz-empty">Ningún proyecto o evento tiene presupuesto.</p>
                    : <div className="fz-budgets">
                        {budgets.map(b => (
                            <Link key={b.id} to={`/eventos/${b.id}`} className="fz-budget">
                                <span className="fz-kind">{b.kind}</span>
                                <span className="fz-bname">{b.name}</span>
                                <span className="fz-bar"><i style={{ width: `${Math.max(2, (b.budget / budgets[0].budget) * 100)}%` }} /></span>
                                <strong>{formatMoney(b.budget)}</strong>
                            </Link>
                        ))}
                    </div>}
            </section>
        </div>
    );
}
