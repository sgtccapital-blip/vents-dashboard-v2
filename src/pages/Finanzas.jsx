import { useMemo, useState } from 'react';
import { Wallet, Plus, Trash2, ExternalLink, AlertTriangle, CalendarClock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCurrentUser } from '../lib/currentUser';
import { isDone, eventStatus } from '../lib/status.js';
import { summarizeSubscriptions, daysUntil, localDateKey } from '../lib/dashboardIntel.js';
import './Finanzas.css';

// ─── Formato ──────────────────────────────────────────────────
const usd = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
const usdCompact = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: 1 });
const fmtUSD = (n) => usd.format(Number(n) || 0);
const usdWhole = new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
/** En los KPI: sin centavos a partir de $1,000 para que la cifra quepa en una línea. */
const fmtUSDTile = (n) => (Math.abs(n) >= 1000 ? usdWhole.format(n) : usd.format(n));
const fmtUSDShort = (n) => (Math.abs(n) >= 10000 ? usdCompact.format(n) : usd.format(n));
const fmtDayMonth = new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short' });
const fmtMonth = new Intl.DateTimeFormat('es-PA', { month: 'short', year: '2-digit' });

const CYCLES = [
    { value: 'Monthly', label: 'Mensual' },
    { value: 'Yearly', label: 'Anual' },
    { value: 'Weekly', label: 'Semanal' },
    { value: 'Quarterly', label: 'Trimestral' },
];
const STATUSES = [
    { value: 'Active', label: 'Activa' },
    { value: 'Paused', label: 'Pausada' },
    { value: 'Cancelled', label: 'Cancelada' },
];
const CYCLE_TO_MONTHLY = { monthly: 1, mensual: 1, yearly: 1 / 12, annual: 1 / 12, anual: 1 / 12, weekly: 52 / 12, semanal: 52 / 12, quarterly: 1 / 3, trimestral: 1 / 3 };
const INACTIVE_SUB = ['cancelled', 'cancelado', 'inactive', 'paused'];
const TEAM = ['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'];

const isActiveSub = (s) => !INACTIVE_SUB.includes(String(s.status || '').toLowerCase());
const monthlyCost = (s) => (parseFloat(s.cost) || 0) * (CYCLE_TO_MONTHLY[String(s.cycle || 'monthly').toLowerCase()] ?? 1);
const parseMoney = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
};
const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime()) ? null : d;
};
const startOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const offset = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - offset);
    return d;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Fechas de ocurrencia de un evento: sus instancias si las tiene, si no su fecha. */
const eventOccurrences = (ev) => {
    if (Array.isArray(ev.instances) && ev.instances.length > 0) {
        return ev.instances
            .filter(i => i?.date && !['cancelled', 'cancelado', 'canceled'].includes(String(i.status || '').toLowerCase()))
            .map(i => i.date);
    }
    return ev.date ? [ev.date] : [];
};
const isRealEvent = (ev) => ev && ev.category !== 'project' && eventStatus(ev) !== 'cancelado';

/** Responsable canónico de una tarea: uno del equipo, 'Otros' o 'Sin asignar'. */
const ownerOf = (task) => {
    const raw = String(task.assignee || task.assignedTo || '').trim();
    if (!raw) return 'Sin asignar';
    const upper = raw.toUpperCase();
    return TEAM.find(m => new RegExp(`(^|[^A-Z])${m}([^A-Z]|$)`).test(upper)) || 'Otros';
};

// ─── Piezas de UI ─────────────────────────────────────────────
function StatTile({ label, value, note, tone }) {
    return (
        <div className={`fin-tile ${tone ? `fin-tile--${tone}` : ''}`}>
            <div className="fin-tile-label">{label}</div>
            <div className="fin-tile-value">{value}</div>
            {note && <div className="fin-tile-note">{note}</div>}
        </div>
    );
}

function ChartCard({ title, subtitle, legend, children, table }) {
    return (
        <section className="fin-card fin-chart" aria-label={title}>
            <header className="fin-chart-head">
                <h3>{title}</h3>
                {subtitle && <p>{subtitle}</p>}
                {legend && <div className="fin-legend">{legend}</div>}
            </header>
            {children}
            {table && (
                <details className="fin-table-toggle">
                    <summary>Ver tabla</summary>
                    <table className="fin-data-table">
                        <thead><tr>{table.head.map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                            {table.rows.map((r, i) => (
                                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </details>
            )}
        </section>
    );
}

function EmptyState({ children }) {
    return <div className="fin-empty">{children}</div>;
}

/** Barras horizontales de una serie, valor al final de la barra. */
function HBarChart({ rows, format }) {
    const max = Math.max(...rows.map(r => r.value), 0) || 1;
    return (
        <ul className="fin-hbars">
            {rows.map(r => (
                <li key={r.label} className="fin-hbar-row">
                    <span className="fin-hbar-label" title={r.label}>{r.label}</span>
                    <span className="fin-hbar-track">
                        <span
                            className="fin-hbar-fill"
                            style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 1.5 : 0)}%` }}
                            tabIndex={0}
                            title={`${r.label}: ${format(r.value)}${r.hint ? ` · ${r.hint}` : ''}`}
                            aria-label={`${r.label}: ${format(r.value)}`}
                        />
                        <span className="fin-hbar-value">{format(r.value)}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** Columnas de una serie con valor sobre la barra (solo si > 0) y etiqueta debajo. */
function ColumnChart({ cols, unit }) {
    const max = Math.max(...cols.map(c => c.value), 0) || 1;
    return (
        <div className="fin-cols" role="list">
            {cols.map(c => (
                <div key={c.key} className={`fin-col ${c.current ? 'is-current' : ''}`} role="listitem">
                    <div className="fin-col-plot">
                        {c.value > 0 && <span className="fin-col-value">{c.value}</span>}
                        <span
                            className="fin-col-bar"
                            style={{ height: `${(c.value / max) * 100}%` }}
                            tabIndex={0}
                            title={`${c.long}: ${plural(c.value, unit[0], unit[1])}`}
                            aria-label={`${c.long}: ${plural(c.value, unit[0], unit[1])}`}
                        />
                    </div>
                    <span className="fin-col-label">{c.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Gestor de suscripciones ──────────────────────────────────
const EMPTY_NEW = { name: '', type: '', provider: '', cost: '', cycle: 'Monthly', nextPayment: '', status: 'Active', url: '', account: '' };

function SubscriptionRow({ sub, today, onUpdate, onDelete }) {
    const [draft, setDraft] = useState(() => ({ ...sub, cost: sub.cost ?? '' }));
    const [prevSub, setPrevSub] = useState(sub);
    // Si la suscripción cambia por fuera (otro dispositivo / sync), se refleja en el borrador
    if (prevSub !== sub) {
        setPrevSub(sub);
        setDraft({ ...sub, cost: sub.cost ?? '' });
    }

    const commit = (field, rawValue) => {
        let value = rawValue;
        if (field === 'cost') {
            const n = parseMoney(rawValue);
            value = n == null ? 0 : Math.round(n * 100) / 100;
        }
        if (field === 'name' && !String(value).trim()) {
            setDraft(d => ({ ...d, name: sub.name }));
            return;
        }
        if (sub[field] === value) return;
        onUpdate(sub.id, { [field]: value });
    };
    const bind = (field) => ({
        value: draft[field] ?? '',
        onChange: e => setDraft(d => ({ ...d, [field]: e.target.value })),
        onBlur: e => commit(field, e.target.value),
        onKeyDown: e => { if (e.key === 'Enter') e.currentTarget.blur(); },
    });
    const bindSelect = (field) => ({
        value: draft[field] ?? '',
        onChange: e => { setDraft(d => ({ ...d, [field]: e.target.value })); commit(field, e.target.value); },
    });

    const noPrice = !(parseFloat(sub.cost) > 0);
    const active = isActiveSub(sub);
    const days = daysUntil(sub.nextPayment, today);
    const renewsSoon = active && days != null && days >= 0 && days <= 7;
    const overdueDate = active && days != null && days < 0;
    const cycleKnown = CYCLES.some(c => c.value === draft.cycle);
    const statusKnown = STATUSES.some(s => s.value === draft.status);

    return (
        <li className={`fin-sub ${noPrice ? 'is-noprice' : ''} ${renewsSoon ? 'is-soon' : ''} ${!active ? 'is-inactive' : ''}`}>
            <div className="fin-sub-field fin-f-name">
                <label htmlFor={`n-${sub.id}`}>Nombre</label>
                <input id={`n-${sub.id}`} className="fin-input" {...bind('name')} />
                <div className="fin-sub-meta">
                    {sub.account && <span className="fin-sub-account" title={sub.account}>{sub.account}</span>}
                    {noPrice && <span className="fin-badge fin-badge--warn"><AlertTriangle size={11} aria-hidden="true" /> Sin precio</span>}
                    {renewsSoon && <span className="fin-badge fin-badge--soon"><CalendarClock size={11} aria-hidden="true" /> {days === 0 ? 'Renueva hoy' : `Renueva en ${plural(days, 'día', 'días')}`}</span>}
                    {overdueDate && <span className="fin-badge fin-badge--muted">Fecha de pago pasada</span>}
                </div>
            </div>
            <div className="fin-sub-field fin-f-type">
                <label htmlFor={`t-${sub.id}`}>Tipo</label>
                <input id={`t-${sub.id}`} className="fin-input" placeholder="Ej. AI Tool" {...bind('type')} />
            </div>
            <div className="fin-sub-field fin-f-provider">
                <label htmlFor={`p-${sub.id}`}>Proveedor</label>
                <input id={`p-${sub.id}`} className="fin-input" {...bind('provider')} />
            </div>
            <div className="fin-sub-field fin-f-cost">
                <label htmlFor={`c-${sub.id}`}>Costo (USD)</label>
                <input id={`c-${sub.id}`} className="fin-input fin-input--num" type="text" inputMode="decimal" placeholder="0.00" {...bind('cost')} />
            </div>
            <div className="fin-sub-field fin-f-cycle">
                <label htmlFor={`y-${sub.id}`}>Ciclo</label>
                <select id={`y-${sub.id}`} className="fin-input" {...bindSelect('cycle')}>
                    {!cycleKnown && <option value={draft.cycle}>{draft.cycle || '—'}</option>}
                    {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
            <div className="fin-sub-field fin-f-date">
                <label htmlFor={`d-${sub.id}`}>Próximo pago</label>
                <input id={`d-${sub.id}`} className="fin-input" type="date" {...bindSelect('nextPayment')} />
            </div>
            <div className="fin-sub-field fin-f-status">
                <label htmlFor={`s-${sub.id}`}>Estado</label>
                <select id={`s-${sub.id}`} className="fin-input" {...bindSelect('status')}>
                    {!statusKnown && <option value={draft.status}>{draft.status || '—'}</option>}
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
            <div className="fin-sub-field fin-f-url">
                <label htmlFor={`u-${sub.id}`}>URL</label>
                <div className="fin-url-wrap">
                    <input id={`u-${sub.id}`} className="fin-input" type="url" placeholder="https://" {...bind('url')} />
                    {/^https?:\/\//i.test(sub.url || '') && (
                        <a href={sub.url} target="_blank" rel="noopener noreferrer" className="fin-icon-btn" aria-label={`Abrir ${sub.name}`} title="Abrir">
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </div>
            <div className="fin-sub-actions">
                <span className="fin-sub-monthly" title="Equivalente mensual">{active ? `${fmtUSD(monthlyCost(sub))}/mes` : 'No cuenta'}</span>
                <button
                    type="button"
                    className="fin-icon-btn fin-icon-btn--danger"
                    aria-label={`Eliminar ${sub.name}`}
                    title="Eliminar"
                    onClick={() => { if (window.confirm(`¿Eliminar la suscripción "${sub.name}"? No se puede deshacer.`)) onDelete(sub.id); }}
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </li>
    );
}

function NewSubscriptionForm({ onAdd, onCancel }) {
    const [form, setForm] = useState(EMPTY_NEW);
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const submit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        const cost = parseMoney(form.cost);
        onAdd({
            ...form,
            id: `sub-${Date.now()}`,
            name: form.name.trim(),
            cost: cost == null ? 0 : Math.round(cost * 100) / 100,
        });
        setForm(EMPTY_NEW);
    };
    return (
        <form className="fin-new" onSubmit={submit}>
            <div className="fin-new-grid">
                <label>Nombre*<input className="fin-input" required value={form.name} onChange={set('name')} placeholder="Ej. Figma Pro" /></label>
                <label>Tipo<input className="fin-input" value={form.type} onChange={set('type')} placeholder="Ej. Design Tool" /></label>
                <label>Proveedor<input className="fin-input" value={form.provider} onChange={set('provider')} /></label>
                <label>Costo (USD)<input className="fin-input fin-input--num" inputMode="decimal" value={form.cost} onChange={set('cost')} placeholder="0.00" /></label>
                <label>Ciclo
                    <select className="fin-input" value={form.cycle} onChange={set('cycle')}>
                        {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </label>
                <label>Próximo pago<input className="fin-input" type="date" value={form.nextPayment} onChange={set('nextPayment')} /></label>
                <label>Estado
                    <select className="fin-input" value={form.status} onChange={set('status')}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </label>
                <label>URL<input className="fin-input" type="url" value={form.url} onChange={set('url')} placeholder="https://" /></label>
                <label>Cuenta<input className="fin-input" value={form.account} onChange={set('account')} placeholder="correo de la cuenta" /></label>
            </div>
            <div className="fin-new-actions">
                <button type="button" className="fin-btn fin-btn--ghost" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="fin-btn fin-btn--primary"><Plus size={14} /> Guardar suscripción</button>
            </div>
        </form>
    );
}

// ─── Página ───────────────────────────────────────────────────
export default function Finanzas() {
    const { subscriptions = [], addSubscription, updateSubscription, deleteSubscription, tasks = [], events = [] } = useApp();
    const { user: currentUser } = useCurrentUser();
    const me = String(currentUser || '').toUpperCase();
    const [showNew, setShowNew] = useState(false);
    const [today] = useState(() => new Date());
    const todayKey = localDateKey(today);

    const subs = useMemo(() => (Array.isArray(subscriptions) ? subscriptions : []), [subscriptions]);
    const taskList = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
    const eventList = useMemo(() => (Array.isArray(events) ? events : []).filter(isRealEvent), [events]);

    const summary = useMemo(() => summarizeSubscriptions(subs, today), [subs, today]);
    const activeSubs = useMemo(() => subs.filter(isActiveSub), [subs]);
    const noPriceActive = activeSubs.filter(s => !(parseFloat(s.cost) > 0));
    const noPriceAll = subs.filter(s => !(parseFloat(s.cost) > 0));

    const nextRenewal = useMemo(() => activeSubs
        .map(s => ({ name: s.name, days: daysUntil(s.nextPayment, today) }))
        .filter(s => s.days != null && s.days >= 0)
        .sort((a, b) => a.days - b.days)[0] || null, [activeSubs, today]);
    const pastDue = activeSubs.filter(s => { const d = daysUntil(s.nextPayment, today); return d != null && d < 0; }).length;

    // Presupuesto de eventos próximos
    const eventBudget = useMemo(() => {
        let total = 0, withBudget = 0, without = 0;
        eventList.forEach(ev => {
            const s = eventStatus(ev);
            if (s === 'completado') return;
            const upcoming = eventOccurrences(ev).some(d => d >= todayKey);
            if (!upcoming) return;
            const b = parseMoney(ev.budget) ?? parseMoney(ev.estimatedBudget);
            if (b && b > 0) { total += b; withBudget += 1; } else without += 1;
        });
        return { total, withBudget, without };
    }, [eventList, todayKey]);

    // Tareas completadas por semana (8 semanas, lunes a domingo)
    const weekly = useMemo(() => {
        const thisWeek = startOfWeek(today);
        const weeks = Array.from({ length: 8 }, (_, i) => {
            const start = new Date(thisWeek);
            start.setDate(start.getDate() - (7 - i) * 7);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return { start, end, value: 0 };
        });
        let dated = 0, undated = 0;
        taskList.filter(isDone).forEach(t => {
            const d = parseDate(t.completedAt);
            if (!d) { undated += 1; return; }
            dated += 1;
            const w = weeks.find(wk => d >= wk.start && d < wk.end);
            if (w) w.value += 1;
        });
        const cols = weeks.map((w, i) => ({
            key: w.start.toISOString(),
            label: fmtDayMonth.format(w.start),
            long: i === 7 ? `Esta semana (desde ${fmtDayMonth.format(w.start)})` : `Semana del ${fmtDayMonth.format(w.start)}`,
            value: w.value,
            current: i === 7,
        }));
        return { cols, dated, undated, thisWeek: cols[7].value, inRange: cols.reduce((a, c) => a + c.value, 0) };
    }, [taskList, today]);

    // Gasto mensual por tipo
    const byType = useMemo(() => {
        const map = new Map();
        activeSubs.forEach(s => {
            const key = String(s.type || '').trim() || 'Sin tipo';
            const cur = map.get(key) || { label: key, value: 0, count: 0, unpriced: 0 };
            cur.value += monthlyCost(s);
            cur.count += 1;
            if (!(parseFloat(s.cost) > 0)) cur.unpriced += 1;
            map.set(key, cur);
        });
        const rows = [...map.values()].sort((a, b) => b.value - a.value || b.count - a.count);
        const top = rows.slice(0, 7);
        if (rows.length > 7) {
            const rest = rows.slice(7);
            top.push({ label: 'Otros', value: rest.reduce((a, r) => a + r.value, 0), count: rest.reduce((a, r) => a + r.count, 0), unpriced: rest.reduce((a, r) => a + r.unpriced, 0) });
        }
        return top.map(r => ({ ...r, hint: `${plural(r.count, 'suscripción', 'suscripciones')}${r.unpriced ? `, ${r.unpriced} sin precio` : ''}` }));
    }, [activeSubs]);

    // Carga por persona
    const workload = useMemo(() => {
        const base = [...TEAM, 'Otros', 'Sin asignar'].map(name => ({ name, onTime: 0, overdue: 0 }));
        taskList.filter(t => !isDone(t)).forEach(t => {
            const row = base.find(b => b.name === ownerOf(t));
            const d = daysUntil(t.due, today);
            if (d != null && d < 0) row.overdue += 1; else row.onTime += 1;
        });
        return base.filter(r => TEAM.includes(r.name) || r.onTime + r.overdue > 0);
    }, [taskList, today]);
    const workloadMax = Math.max(...workload.map(r => r.onTime + r.overdue), 0);
    const totalPending = workload.reduce((a, r) => a + r.onTime + r.overdue, 0);
    const totalOverdue = workload.reduce((a, r) => a + r.overdue, 0);

    // Eventos por mes (6 meses desde el actual)
    const eventsByMonth = useMemo(() => {
        const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return { key, d, value: 0, names: [] };
        });
        eventList.forEach(ev => {
            eventOccurrences(ev).forEach(date => {
                if (date < todayKey) return;
                const m = months.find(mo => String(date).startsWith(mo.key));
                if (m) { m.value += 1; m.names.push(ev.name); }
            });
        });
        return months.map((m, i) => ({
            key: m.key,
            label: fmtMonth.format(m.d),
            long: new Intl.DateTimeFormat('es-PA', { month: 'long', year: 'numeric' }).format(m.d) + (i === 0 ? ' (desde hoy)' : ''),
            value: m.value,
            current: i === 0,
            names: m.names,
        }));
    }, [eventList, today, todayKey]);
    const eventsTotal = eventsByMonth.reduce((a, m) => a + m.value, 0);

    const sortedSubs = useMemo(() => [...subs].sort((a, b) => {
        const act = Number(isActiveSub(b)) - Number(isActiveSub(a));
        if (act) return act;
        const da = daysUntil(a.nextPayment, today), db = daysUntil(b.nextPayment, today);
        const ka = da == null || da < 0 ? 9999 : da, kb = db == null || db < 0 ? 9999 : db;
        return ka - kb || String(a.name).localeCompare(String(b.name));
    }), [subs, today]);
    // El orden se fija al cargar/añadir/borrar, no al editar (para que la fila no salte mientras escribes)
    const orderKey = subs.map(s => s.id).join('|');
    const order = useMemo(() => sortedSubs.map(s => s.id), [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
    const subsInOrder = order.map(id => subs.find(s => s.id === id)).filter(Boolean);

    return (
        <div className="page-content animate-in fin-page">
            <div className="page-header fin-header">
                <div>
                    <h1><Wallet size={20} aria-hidden="true" /> Finanzas &amp; Analítica</h1>
                    <p className="fin-header-sub">Gasto recurrente, presupuesto de eventos y ritmo del equipo.</p>
                </div>
            </div>

            {/* 1. KPIs */}
            <section className="fin-tiles" aria-label="Indicadores clave">
                <StatTile
                    label="Gasto mensual"
                    value={fmtUSDTile(summary.monthlyBurn)}
                    note={noPriceActive.length ? `${plural(noPriceActive.length, 'activa', 'activas')} sin precio` : 'Normalizado a mensual'}
                    tone={noPriceActive.length ? 'warn' : undefined}
                />
                <StatTile label="Gasto anual proyectado" value={fmtUSDTile(summary.monthlyBurn * 12)} note="Gasto mensual × 12" />
                <StatTile label="Suscripciones activas" value={summary.activeCount} note={`${subs.length} en total`} />
                <StatTile
                    label="Próxima renovación"
                    value={nextRenewal ? nextRenewal.name : 'Sin fecha futura'}
                    note={nextRenewal
                        ? (nextRenewal.days === 0 ? 'Hoy' : `En ${plural(nextRenewal.days, 'día', 'días')}`)
                        : (pastDue ? `${plural(pastDue, 'fecha de pago pasada', 'fechas de pago pasadas')}: actualízalas` : 'Agrega la fecha de próximo pago')}
                    tone="text"
                />
                <StatTile
                    label="Presupuesto eventos próximos"
                    value={fmtUSDTile(eventBudget.total)}
                    note={eventBudget.withBudget + eventBudget.without === 0
                        ? 'No hay eventos próximos'
                        : `${plural(eventBudget.withBudget, 'evento', 'eventos')} con presupuesto${eventBudget.without ? ` · ${eventBudget.without} sin presupuesto` : ''}`}
                />
                <StatTile
                    label="Tareas completadas esta semana"
                    value={weekly.dated === 0 && weekly.undated > 0 ? '—' : weekly.thisWeek}
                    note={weekly.undated > 0
                        ? `${plural(weekly.undated, 'completada', 'completadas')} sin fecha de cierre`
                        : 'Lunes a hoy'}
                />
            </section>

            {/* 2. Suscripciones */}
            <section className="fin-card fin-subs" aria-labelledby="fin-subs-title">
                <div className="fin-subs-head">
                    <div>
                        <h2 id="fin-subs-title">Suscripciones</h2>
                        <p>Los cambios se guardan al salir de cada campo.</p>
                    </div>
                    {!showNew && (
                        <button type="button" className="fin-btn fin-btn--primary" onClick={() => setShowNew(true)}>
                            <Plus size={14} /> Nueva suscripción
                        </button>
                    )}
                </div>

                {noPriceAll.length > 0 && (
                    <div className="fin-banner" role="status">
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span><strong>{plural(noPriceAll.length, 'suscripción sin precio', 'suscripciones sin precio')}</strong> — agrega el costo para que el gasto mensual sea real.</span>
                    </div>
                )}

                {showNew && (
                    <NewSubscriptionForm
                        onAdd={(s) => { addSubscription(s); setShowNew(false); }}
                        onCancel={() => setShowNew(false)}
                    />
                )}

                {subs.length === 0 ? (
                    <EmptyState>Aún no hay suscripciones registradas. Agrega la primera para empezar a medir el gasto recurrente.</EmptyState>
                ) : (
                    <>
                        <div className="fin-sub-header" aria-hidden="true">
                            <span>Nombre</span><span>Tipo</span><span>Proveedor</span><span>Costo</span><span>Ciclo</span><span>Próximo pago</span><span>Estado</span><span>URL</span><span />
                        </div>
                        <ul className="fin-sub-list">
                            {subsInOrder.map(s => (
                                <SubscriptionRow key={s.id} sub={s} today={today} onUpdate={updateSubscription} onDelete={deleteSubscription} />
                            ))}
                        </ul>
                    </>
                )}
            </section>

            {/* 3. Gráficos */}
            <div className="fin-charts">
                <ChartCard
                    title="Gasto mensual por tipo"
                    subtitle="Suscripciones activas, normalizado a USD por mes"
                    table={byType.length ? { head: ['Tipo', 'USD/mes', 'Suscripciones', 'Sin precio'], rows: byType.map(r => [r.label, fmtUSD(r.value), r.count, r.unpriced]) } : null}
                >
                    {activeSubs.length === 0 ? (
                        <EmptyState>No hay suscripciones activas.</EmptyState>
                    ) : summary.monthlyBurn === 0 ? (
                        <EmptyState>
                            Las {plural(activeSubs.length, 'suscripción activa', 'suscripciones activas')} tienen costo $0, así que no hay gasto que graficar.
                            Agrega el costo en la tabla de arriba y este gráfico se llenará solo.
                        </EmptyState>
                    ) : (
                        <HBarChart rows={byType} format={fmtUSDShort} />
                    )}
                </ChartCard>

                <ChartCard
                    title="Carga de trabajo por persona"
                    subtitle={`${plural(totalPending, 'tarea pendiente', 'tareas pendientes')}${totalOverdue ? `, ${totalOverdue} vencidas` : ''}`}
                    legend={totalPending > 0 && (
                        <>
                            <span className="fin-key"><i className="fin-swatch fin-swatch--ontime" />A tiempo o sin fecha</span>
                            <span className="fin-key"><i className="fin-swatch fin-swatch--overdue" />Vencidas</span>
                        </>
                    )}
                    table={totalPending > 0 ? { head: ['Persona', 'A tiempo / sin fecha', 'Vencidas', 'Total'], rows: workload.map(r => [r.name, r.onTime, r.overdue, r.onTime + r.overdue]) } : null}
                >
                    {totalPending === 0 ? (
                        <EmptyState>No hay tareas pendientes. Todo el equipo está al día.</EmptyState>
                    ) : (
                        <ul className="fin-hbars">
                            {workload.map(r => {
                                const total = r.onTime + r.overdue;
                                return (
                                    <li key={r.name} className={`fin-hbar-row ${r.name === me ? 'is-me' : ''}`}>
                                        <span className="fin-hbar-label">{r.name}{r.name === me ? ' (tú)' : ''}</span>
                                        <span className="fin-hbar-track">
                                            <span className="fin-stack" style={{ width: `${(total / workloadMax) * 100}%` }}>
                                                {r.onTime > 0 && (
                                                    <span className="fin-seg fin-seg--ontime" style={{ flexGrow: r.onTime }} tabIndex={0}
                                                        title={`${r.name}: ${r.onTime} a tiempo o sin fecha`} aria-label={`${r.name}: ${r.onTime} a tiempo o sin fecha`} />
                                                )}
                                                {r.overdue > 0 && (
                                                    <span className="fin-seg fin-seg--overdue" style={{ flexGrow: r.overdue }} tabIndex={0}
                                                        title={`${r.name}: ${r.overdue} vencidas`} aria-label={`${r.name}: ${r.overdue} vencidas`} />
                                                )}
                                            </span>
                                            <span className="fin-hbar-value">
                                                {total}{r.overdue > 0 && <span className="fin-overdue-note"> · {r.overdue} venc.</span>}
                                            </span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ChartCard>

                <ChartCard
                    title="Tareas completadas por semana"
                    subtitle="Últimas 8 semanas, según fecha de cierre"
                    table={weekly.dated > 0 ? { head: ['Semana', 'Completadas'], rows: weekly.cols.map(c => [c.long, c.value]) } : null}
                >
                    {weekly.dated === 0 ? (
                        <EmptyState>
                            {weekly.undated > 0
                                ? `Hay ${plural(weekly.undated, 'tarea completada', 'tareas completadas')}, pero ninguna tiene fecha de cierre registrada (completedAt), así que no se puede saber en qué semana se cerraron.`
                                : 'Todavía no hay tareas completadas con fecha de cierre.'}
                            {' '}Cuando las tareas guarden su fecha de cierre, el ritmo semanal aparecerá aquí.
                        </EmptyState>
                    ) : (
                        <>
                            <ColumnChart cols={weekly.cols} unit={['tarea', 'tareas']} />
                            {weekly.inRange === 0 && <p className="fin-chart-foot">Ninguna tarea se cerró en estas 8 semanas.</p>}
                            {weekly.undated > 0 && <p className="fin-chart-foot">{plural(weekly.undated, 'tarea completada', 'tareas completadas')} sin fecha de cierre no aparecen.</p>}
                        </>
                    )}
                </ChartCard>

                <ChartCard
                    title="Eventos por mes"
                    subtitle="Próximos 6 meses · sin proyectos ni cancelados"
                    table={eventsTotal > 0 ? { head: ['Mes', 'Eventos', 'Nombres'], rows: eventsByMonth.map(m => [m.long, m.value, [...new Set(m.names)].join(', ') || '—']) } : null}
                >
                    {eventsTotal === 0 ? (
                        <EmptyState>
                            No hay eventos con fecha en los próximos 6 meses
                            {eventList.length ? ` (${plural(eventList.length, 'evento registrado', 'eventos registrados')}, ninguno con fecha futura)` : ''}.
                            Agrega fechas en Proyectos &amp; Eventos para ver la agenda aquí.
                        </EmptyState>
                    ) : (
                        <ColumnChart cols={eventsByMonth} unit={['evento', 'eventos']} />
                    )}
                </ChartCard>
            </div>
        </div>
    );
}
