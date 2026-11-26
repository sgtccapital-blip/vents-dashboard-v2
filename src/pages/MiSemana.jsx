import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Circle, Plus, AlertTriangle, Sun, CalendarRange, Inbox, UserX, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildWeekPlan, eventsThisWeek, localDay, addDays, taskDueDay, ownerName } from '../lib/weekPlan';
import { upcomingPayments, parseMoney, formatMoney } from '../lib/finance';
import './MiSemana.css';

const SECTIONS = [
    { id: 'overdue', label: 'Vencidas', icon: AlertTriangle, tone: 'red', empty: 'Nada vencido.' },
    { id: 'today', label: 'Hoy', icon: Sun, tone: 'orange', empty: 'Nada para hoy.' },
    { id: 'week', label: 'Próximos 7 días', icon: CalendarRange, tone: 'blue', empty: 'Semana libre.' },
    { id: 'nodate', label: 'Sin fecha', icon: Inbox, tone: 'muted', empty: 'Todas tienen fecha.' },
    { id: 'later', label: 'Más adelante', icon: CalendarClock, tone: 'muted', empty: 'Nada más adelante.', collapsed: true },
];

const PRIORITY_LABEL = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };

const shortDay = (day) => {
    if (!day) return '';
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
};

function TaskRow({ task, today, projectsById, eventsById, people, onToggle, onChange }) {
    const due = taskDueDay(task);
    const owner = ownerName(task);
    const project = projectsById.get(task.projectId);
    const event = eventsById.get(task.eventId);
    const overdueDays = due && due < today
        ? Math.round((new Date(today) - new Date(due)) / 86400000)
        : 0;

    const setOwner = (name) => onChange(task.id, { assignedTo: name, assignee: name });
    const setDue = (day) => onChange(task.id, { due: day, dueDate: day });

    return (
        <div className={`ms-task prio-${task.priority || 'medium'}`}>
            <button className="ms-check" onClick={() => onToggle(task.id)} title="Marcar como hecha" aria-label="Marcar como hecha">
                <Circle size={18} />
            </button>
            <div className="ms-task-body">
                <div className="ms-task-text">{task.text || task.title}</div>
                <div className="ms-task-meta">
                    {project && (
                        <Link to={`/eventos/${project.id}`} className="ms-chip" style={{ '--chip': project.color || 'var(--accent-primary)' }}>
                            {project.icon ? `${project.icon} ` : ''}{project.name}
                        </Link>
                    )}
                    {event && <Link to={`/eventos/${event.id}`} className="ms-chip ms-chip-event">{event.name}</Link>}
                    {task.priority && task.priority !== 'medium' && <span className={`ms-prio ms-prio-${task.priority}`}>{PRIORITY_LABEL[task.priority] || task.priority}</span>}
                    {overdueDays > 0 && <span className="ms-late">hace {overdueDays} {overdueDays === 1 ? 'día' : 'días'}</span>}
                </div>
            </div>
            <div className="ms-task-controls">
                <select className={`ms-owner ${owner ? '' : 'is-empty'}`} value={owner} onChange={e => setOwner(e.target.value)} title="Responsable">
                    <option value="">Sin asignar</option>
                    {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="date" className="ms-date" value={due || ''} onChange={e => setDue(e.target.value)} title="Fecha límite" />
                {(!due || due < today) && (
                    <div className="ms-quick">
                        <button onClick={() => setDue(today)}>Hoy</button>
                        <button onClick={() => setDue(addDays(today, 7))}>+1 sem</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MiSemana() {
    const { tasks, projects, events, subscriptions, addTask, updateTask, toggleTask } = useApp();
    const [owner, setOwner] = useState('');
    const [open, setOpen] = useState(() => Object.fromEntries(SECTIONS.map(s => [s.id, !s.collapsed])));
    const [draft, setDraft] = useState({ text: '', owner: '', projectId: '', due: '' });

    const today = localDay();
    const plan = useMemo(() => buildWeekPlan(tasks || [], { today, owner }), [tasks, today, owner]);
    const weekEvents = useMemo(() => eventsThisWeek(events || [], today), [events, today]);
    const weekPayments = useMemo(() => upcomingPayments(subscriptions || [], { today, days: 6 }), [subscriptions, today]);
    const projectsById = useMemo(() => new Map((projects || []).map(p => [p.id, p])), [projects]);
    const eventsById = useMemo(() => new Map((events || []).map(e => [e.id, e])), [events]);
    // Personas: las que ya tienen tareas (pendientes o hechas), para poder reasignar a cualquiera.
    const people = useMemo(
        () => [...new Set((tasks || []).map(ownerName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [tasks]
    );

    const changeTask = (id, data) => updateTask(id, data);

    const createTask = async (e) => {
        e.preventDefault();
        const text = draft.text.trim();
        if (!text) return;
        await addTask({
            id: `task-${Date.now()}`,
            text, title: text,
            assignedTo: draft.owner, assignee: draft.owner,
            projectId: draft.projectId || null, eventId: null,
            due: draft.due, dueDate: draft.due,
            priority: 'medium', status: 'pending', done: false,
            createdAt: new Date().toISOString(),
        });
        setDraft(d => ({ ...d, text: '' }));
    };

    const counters = [
        { id: 'overdue', label: 'Vencidas', value: plan.buckets.overdue.length, tone: 'red' },
        { id: 'today', label: 'Hoy', value: plan.buckets.today.length, tone: 'orange' },
        { id: 'week', label: 'Próx. 7 días', value: plan.buckets.week.length, tone: 'blue' },
        { id: 'nodate', label: 'Sin fecha', value: plan.buckets.nodate.length, tone: 'muted' },
    ];

    return (
        <div className="page-content animate-in ms-page">
            <div className="ms-header">
                <div>
                    <h1>Mi semana</h1>
                    <p>{shortDay(today)} → {shortDay(addDays(today, 6))} · {plan.totalPending} tareas pendientes en total</p>
                </div>
                <div className="ms-counters">
                    {counters.map(c => (
                        <a key={c.id} href={`#ms-${c.id}`} className={`ms-counter tone-${c.tone}`}>
                            <strong>{c.value}</strong><span>{c.label}</span>
                        </a>
                    ))}
                </div>
            </div>

            <form className="ms-add card" onSubmit={createTask}>
                <Plus size={16} />
                <input className="ms-add-text" placeholder="Nueva tarea…" value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} />
                <input list="ms-people" className="ms-add-owner" placeholder="Responsable" value={draft.owner} onChange={e => setDraft({ ...draft, owner: e.target.value })} />
                <datalist id="ms-people">{people.map(p => <option key={p} value={p} />)}</datalist>
                <select value={draft.projectId} onChange={e => setDraft({ ...draft, projectId: e.target.value })}>
                    <option value="">Sin proyecto</option>
                    {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="date" value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })} />
                <button className="btn btn-primary" type="submit" disabled={!draft.text.trim()}>Agregar</button>
            </form>

            <div className="ms-people">
                <button className={`ms-person ${owner === '' ? 'active' : ''}`} onClick={() => setOwner('')}>
                    Todos <span>{plan.totalPending}</span>
                </button>
                {plan.owners.map(o => (
                    <button key={o.name} className={`ms-person ${owner === o.name ? 'active' : ''}`} onClick={() => setOwner(o.name)}
                        title={`${o.pending} pendientes · ${o.overdue} vencidas · ${o.today} para hoy`}>
                        {o.name} <span>{o.pending}</span>
                        {o.overdue > 0 && <em>{o.overdue} venc.</em>}
                    </button>
                ))}
                {plan.unassigned > 0 && (
                    <button className={`ms-person ms-person-none ${owner === '__none__' ? 'active' : ''}`} onClick={() => setOwner('__none__')}>
                        <UserX size={13} /> Sin asignar <span>{plan.unassigned}</span>
                    </button>
                )}
            </div>

            {weekEvents.length > 0 && (
                <div className="ms-events">
                    <span className="ms-events-label">Eventos esta semana</span>
                    {weekEvents.map(ev => (
                        <Link key={`${ev.id}-${ev.day}`} to={`/eventos/${ev.id}`} className="ms-event" style={{ '--chip': ev.color || 'var(--accent-primary)' }}>
                            <strong>{shortDay(ev.day)}</strong> {ev.name}{ev.label ? ` · ${ev.label}` : ''}
                        </Link>
                    ))}
                </div>
            )}

            {weekPayments.length > 0 && (
                <div className="ms-events">
                    <Link to="/finanzas" className="ms-events-label">Cobros esta semana</Link>
                    {weekPayments.map(({ sub, day }) => (
                        <Link key={sub.id} to="/finanzas" className="ms-event" style={{ '--chip': 'var(--accent-green)' }}>
                            <strong>{shortDay(day)}</strong> {sub.name} · {parseMoney(sub.cost) > 0 ? formatMoney(sub.cost) : 'sin costo'}
                        </Link>
                    ))}
                </div>
            )}

            <div className="ms-sections">
                {SECTIONS.map(section => {
                    const list = plan.buckets[section.id];
                    const isOpen = open[section.id];
                    return (
                        <section key={section.id} id={`ms-${section.id}`} className={`ms-section tone-${section.tone}`}>
                            <button className="ms-section-head" onClick={() => setOpen(o => ({ ...o, [section.id]: !o[section.id] }))}>
                                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                <section.icon size={15} />
                                <span>{section.label}</span>
                                <span className="ms-count">{list.length}</span>
                            </button>
                            {isOpen && (list.length === 0
                                ? <div className="ms-empty"><CheckCircle2 size={14} /> {section.empty}</div>
                                : list.map(t => (
                                    <TaskRow key={t.id} task={t} today={today} projectsById={projectsById} eventsById={eventsById}
                                        people={people} onToggle={toggleTask} onChange={changeTask} />
                                )))}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
