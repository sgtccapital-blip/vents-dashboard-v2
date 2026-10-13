import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckSquare, FolderKanban, StickyNote,
    Clock, Plus, DollarSign, Rocket, UserPlus, Briefcase,
    Instagram, CalendarDays, MapPin, Timer, ArrowRight, ChevronRight,
    Target, AlertTriangle, AlarmClock, Gavel
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ArriveAgencyBox from '../components/ArriveAgencyBox';
import ArriveTasksBox from '../components/ArriveTasksBox';
import { isActiveEvent, isDone } from '../lib/status';
import {
    buildDailyPriorityPanel, buildDecisionInbox, buildPortfolioPulse,
    summarizeSubscriptions, localDateKey, daysUntil
} from '../lib/dashboardIntel';

const PRIORITY_COLORS = { critical: 'var(--accent-red)', high: 'var(--accent-orange)', medium: 'var(--accent-blue)', low: 'var(--text-tertiary)' };

const formatMoney = (num) => `$${Math.round(num).toLocaleString('es-PA')}`;

const dueLabel = (days) => {
    if (days == null) return null;
    if (days < 0) return `vencida ${Math.abs(days)}d`;
    if (days === 0) return 'hoy';
    if (days === 1) return 'mañana';
    return `en ${days}d`;
};

export default function Home() {
    const {
        events, projects, socialMedia, tasks, toggleTask, notes, addNote: cxAddNote,
        activityFeed, addActivity, subscriptions
    } = useApp();
    const navigate = useNavigate();
    const [newNote, setNewNote] = useState('');
    const [now, setNow] = useState(() => new Date());

    // Live clock for countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Cambia una vez al día: los cálculos pesados no se rehacen con cada tic del reloj
    const todayKey = localDateKey(now);

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        cxAddNote({ id: `note-${Date.now()}`, text: newNote, date: localDateKey() });
        addActivity(`Nota rápida: "${newNote.substring(0, 20)}${newNote.length > 20 ? '...' : ''}"`, 'var(--accent-yellow)');
        setNewNote('');
    };

    const handleToggleTask = (task) => {
        const completing = !isDone(task);
        toggleTask(task.id);
        const color = completing ? 'var(--accent-green)' : 'var(--text-secondary)';
        addActivity(`${completing ? 'Completada' : 'Reabierta'}: "${task.text.substring(0, 30)}${task.text.length > 30 ? '...' : ''}"`, color);
    };

    const safeEvents = useMemo(() => events || [], [events]);
    const safeTasks = useMemo(() => tasks || [], [tasks]);
    const safeProjects = useMemo(() => projects || [], [projects]);

    const activeEvents = useMemo(
        () => safeEvents.filter(isActiveEvent),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- todayKey hace que la vigencia se recalcule al cambiar de día
        [safeEvents, todayKey]
    );

    const pendingTasks = useMemo(() => {
        const today = new Date(`${todayKey}T00:00:00`);
        return safeTasks
            .filter(t => !isDone(t))
            .map(t => ({ ...t, daysLeft: daysUntil(t.due, today) }))
            .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
    }, [safeTasks, todayKey]);
    const overdueCount = pendingTasks.filter(t => t.daysLeft != null && t.daysLeft < 0).length;
    const doneCount = safeTasks.length - pendingTasks.length;

    const pulse = useMemo(
        () => buildDailyPriorityPanel({ events: safeEvents, tasks: safeTasks }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcular al cambiar de día
        [safeEvents, safeTasks, todayKey]
    );
    const decisions = useMemo(
        () => buildDecisionInbox({ events: safeEvents, tasks: safeTasks }).slice(0, 4),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcular al cambiar de día
        [safeEvents, safeTasks, todayKey]
    );
    const portfolio = useMemo(
        () => buildPortfolioPulse({ projects: safeProjects, tasks: safeTasks }, new Date(`${todayKey}T00:00:00`)),
        [safeProjects, safeTasks, todayKey]
    );
    const avgProgress = portfolio.length > 0
        ? Math.round(portfolio.reduce((acc, p) => acc + p.progress, 0) / portfolio.length)
        : 0;
    const subs = useMemo(
        () => summarizeSubscriptions(subscriptions || [], new Date(`${todayKey}T00:00:00`)),
        [subscriptions, todayKey]
    );

    const totalAudience = socialMedia ? socialMedia.reduce((acc, account) => {
        let count = 0;
        const followers = String(account.followers || '0').toUpperCase();
        if (followers.includes('K')) count = parseFloat(followers) * 1000;
        else if (followers.includes('M')) count = parseFloat(followers) * 1000000;
        else count = parseFloat(followers);
        return acc + (isNaN(count) ? 0 : count);
    }, 0) : 0;

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Number.isInteger(num) ? num.toString() : num.toFixed(2);
    };

    // --- Next Event Countdown ---
    const allDates = safeEvents.flatMap(e => {
        if (e.date) return [{ name: e.name, date: e.date, icon: e.icon, color: e.color, location: e.location, id: e.id }];
        if (e.instances) return e.instances.map(inst => ({ name: e.name, date: inst.date, icon: e.icon, color: e.color, location: e.location || '', id: e.id }));
        return [];
    }).filter(e => e.date && new Date(e.date + 'T23:59') >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextEvent = allDates[0] || null;
    const accentColor = nextEvent?.color || '#8b5cf6';

    const getCountdown = (dateStr) => {
        const target = new Date(dateStr + 'T00:00');
        const diff = target - now;
        if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            mins: Math.floor((diff % 3600000) / 60000),
            secs: Math.floor((diff % 60000) / 1000)
        };
    };

    // --- Mini Calendar (next 7 days, en fecha local) ---
    const next7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const dateStr = localDateKey(d);
        const dayEvents = allDates.filter(e => e.date === dateStr);
        return { date: d, dateStr, events: dayEvents, isToday: i === 0 };
    });

    // --- Tasks by Event ---
    const tasksByEvent = activeEvents.map(ev => {
        const evTasks = safeTasks.filter(t => t.eventId === ev.id);
        const done = evTasks.filter(isDone).length;
        return { ...ev, pending: evTasks.length - done, done, total: evTasks.length };
    }).filter(ev => ev.total > 0);

    const countdown = nextEvent ? getCountdown(nextEvent.date) : null;

    const openDecision = (d) => {
        if (d.id.startsWith('event-')) navigate(`/eventos/${d.linkedId}`);
        else navigate('/workspace');
    };

    const pulseColumns = [
        {
            key: 'priorities', icon: Target, label: 'Prioridades', color: 'var(--accent-primary)',
            items: pulse.topPriorities.map(p => ({ id: p.id, title: p.title, sub: p.subtitle, onClick: () => navigate(`/eventos/${p.id}`) })),
            empty: 'Sin eventos activos'
        },
        {
            key: 'risks', icon: AlertTriangle, label: 'Riesgos', color: 'var(--accent-orange)',
            items: pulse.topRisks.map(r => ({ id: r.id, title: r.title, sub: r.subtitle, onClick: () => navigate(`/eventos/${r.id.replace(/^risk-(overdue-)?/, '')}`) })),
            empty: 'Nada en riesgo 👌'
        },
        {
            key: 'overdue', icon: AlarmClock, label: 'Vencidas', color: 'var(--accent-red)',
            items: pulse.overdue.map(o => ({ id: o.id, title: o.title, sub: o.subtitle, onClick: () => navigate('/workspace') })),
            empty: 'Cero tareas vencidas'
        },
        {
            key: 'decisions', icon: Gavel, label: 'Decisiones', color: 'var(--accent-cyan)',
            items: decisions.map(d => ({ id: d.id, title: d.title, sub: `${d.priority} · ${d.summary}`, onClick: () => openDecision(d) })),
            empty: 'Nada por decidir'
        },
    ];

    return (
        <div className="page-content animate-in">
            <div className="page-header">
                <div>
                    <h1>⚡ Command Center</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Agencia, proyectos y eventos en un solo lugar
                    </p>
                </div>
                <div className="page-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {now.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* ══════ NEXT EVENT COUNTDOWN HERO ══════ */}
            {nextEvent && countdown && (
                <div onClick={() => navigate(`/eventos/${nextEvent.id}`)} className="cc-countdown-hero" style={{
                    background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08, transparent)`,
                    borderColor: `${accentColor}30`
                }}>
                    <div className="cc-countdown-bg" style={{
                        background: `radial-gradient(circle at 100% 50%, ${accentColor}10, transparent 70%)`
                    }} />
                    <div className="cc-countdown-icon" style={{
                        background: `${accentColor}25`, borderColor: `${accentColor}40`
                    }}>{nextEvent.icon || '📅'}</div>
                    <div className="cc-countdown-info">
                        <div className="cc-countdown-label" style={{ color: accentColor }}>
                            <Timer size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Próximo Evento
                        </div>
                        <div className="cc-countdown-title">{nextEvent.name}</div>
                        <div className="cc-countdown-meta">
                            <span className="cc-countdown-meta-item">
                                <CalendarDays size={12} /> {new Date(nextEvent.date + 'T12:00').toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            {nextEvent.location && (
                                <span className="cc-countdown-meta-item">
                                    <MapPin size={12} /> {nextEvent.location}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="cc-countdown-timer">
                        {[
                            { val: countdown.days, label: 'Días' },
                            { val: countdown.hours, label: 'Hrs' },
                            { val: countdown.mins, label: 'Min' },
                            { val: countdown.secs, label: 'Seg' }
                        ].map(({ val, label }) => (
                            <div key={label} className="cc-countdown-time-box">
                                <div className="cc-countdown-time-val" style={{ color: accentColor }}>{String(val).padStart(2, '0')}</div>
                                <div className="cc-countdown-time-lbl">{label}</div>
                            </div>
                        ))}
                    </div>
                    <ChevronRight size={20} className="cc-countdown-chevron" />
                </div>
            )}

            {/* ══════ PULSO DEL DÍA ══════ */}
            <div className="cc-pulse-grid">
                {pulseColumns.map(({ key, icon, label, color, items, empty }) => {
                    const Icon = icon;
                    return (
                    <div key={key} className="cc-pulse-col">
                        <div className="cc-pulse-title" style={{ color }}>
                            <span><Icon size={13} /> {label}</span>
                            <span className="tag" style={{ background: 'var(--bg-tertiary)', color }}>{items.length}</span>
                        </div>
                        {items.length === 0 ? (
                            <div className="cc-pulse-empty">{empty}</div>
                        ) : items.map(item => (
                            <button key={item.id} type="button" className="cc-pulse-item" onClick={item.onClick} title={item.title}>
                                <div className="cc-pulse-item-title">{item.title}</div>
                                {item.sub && <div className="cc-pulse-item-sub">{item.sub}</div>}
                            </button>
                        ))}
                    </div>
                    );
                })}
            </div>

            {/* ══════ ARRIVE AGENCY EXECUTIVE HUB ══════ */}
            <ArriveAgencyBox />

            {/* ══════ METRICS BANNER ══════ */}
            <div className="cc-metrics-banner cc-metrics-wide">
                <div className="cc-metric-card" onClick={() => navigate('/eventos')} style={{ cursor: 'pointer' }}>
                    <div className="cc-metric-label"><FolderKanban size={14} style={{ color: 'var(--accent-primary)' }} /> Eventos Activos</div>
                    <div className="cc-metric-value">{activeEvents.length}</div>
                    <div className="cc-metric-sub">{pulse.topRisks.length > 0 ? `${pulse.topRisks.length} en riesgo` : 'En ejecución o planificación'}</div>
                </div>
                <div className="cc-metric-card" onClick={() => navigate('/portfolio')} style={{ cursor: 'pointer' }}>
                    <div className="cc-metric-label"><Briefcase size={14} style={{ color: 'var(--accent-cyan)' }} /> Proyectos</div>
                    <div className="cc-metric-value">{portfolio.length}</div>
                    <div className="cc-metric-sub">{avgProgress}% avance promedio</div>
                </div>
                <div className="cc-metric-card" onClick={() => navigate('/workspace')} style={{ cursor: 'pointer' }}>
                    <div className="cc-metric-label"><CheckSquare size={14} style={{ color: 'var(--accent-yellow)' }} /> Tareas Pendientes</div>
                    <div className="cc-metric-value">{pendingTasks.length}</div>
                    <div className="cc-metric-sub" style={overdueCount > 0 ? { color: 'var(--accent-red)' } : undefined}>
                        {overdueCount > 0 ? `${overdueCount} vencidas · ${doneCount} hechas` : `${doneCount} completadas`}
                    </div>
                </div>
                <div className="cc-metric-card" onClick={() => navigate('/social')} style={{ cursor: 'pointer' }}>
                    <div className="cc-metric-label"><Instagram size={14} style={{ color: '#E1306C' }} /> Audiencia Total</div>
                    <div className="cc-metric-value">{formatNumber(totalAudience)}</div>
                    <div className="cc-metric-sub">{socialMedia?.length || 0} cuentas activas</div>
                </div>
                <div className="cc-metric-card">
                    <div className="cc-metric-label"><DollarSign size={14} style={{ color: 'var(--accent-green)' }} /> Gasto Mensual</div>
                    <div className="cc-metric-value">{formatMoney(subs.monthlyBurn)}</div>
                    <div className="cc-metric-sub" title={subs.upcomingRenewals.map(r => `${r.name} (${dueLabel(r.daysLeft)})`).join(', ')}>
                        {subs.upcomingRenewals.length > 0
                            ? `${subs.upcomingRenewals.length} renovación(es) esta semana`
                            : `${subs.activeCount} suscripciones activas`}
                    </div>
                </div>
            </div>

            {/* ══════ QUICK ACTIONS ══════ */}
            <div className="cc-quick-actions">
                <button className="cc-action-btn" onClick={() => navigate('/eventos')}>
                    <UserPlus size={16} /> Nuevo Evento
                </button>
                <button className="cc-action-btn" onClick={() => navigate('/workspace')}>
                    <CheckSquare size={16} /> Nueva Tarea
                </button>
                <button className="cc-action-btn" onClick={() => navigate('/social')}>
                    <Instagram size={16} /> Redes Sociales
                </button>
                <button className="cc-action-btn" onClick={() => navigate('/calendar')}>
                    <CalendarDays size={16} /> Calendario
                </button>
            </div>

            {/* ══════ MINI CALENDAR (7 days) ══════ */}
            <div className="cc-mini-calendar">
                {next7Days.map(({ date, dateStr, events: dayEvts, isToday }) => (
                    <div key={dateStr} className={`cc-mini-calendar-day ${isToday ? 'is-today' : ''}`}>
                        <div className="cc-mini-day-name" style={{ color: isToday ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                            {date.toLocaleDateString('es-PA', { weekday: 'short' })}
                        </div>
                        <div className="cc-mini-day-number" style={{ fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {date.getDate()}
                        </div>
                        <div className="cc-mini-day-dots">
                            {dayEvts.slice(0, 3).map((ev, i) => (
                                <div key={i} className="cc-mini-day-dot" style={{ background: ev.color || 'var(--accent-primary)' }} title={ev.name} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* ══════ ARRIVE AGENCY CUSTOM TASKS & OPERATIONS BOX ══════ */}
            <ArriveTasksBox />

            {/* ══════ MAIN GRID ══════ */}
            <div className="dashboard-grid">

                {/* Pending Tasks Widget */}
                <div className="widget widget-md">
                    <div className="widget-header">
                        <div className="widget-title"><CheckSquare size={16} /> Tareas Pendientes</div>
                        <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => navigate('/workspace')}>
                            Workspace <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="widget-body">
                        {pendingTasks.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Todo al día ✅</div>
                        )}
                        {pendingTasks.slice(0, 8).map(task => {
                            const label = dueLabel(task.daysLeft);
                            const dueClass = task.daysLeft == null ? '' : task.daysLeft < 0 ? 'is-overdue' : task.daysLeft === 0 ? 'is-today' : '';
                            const owner = task.assignee || task.assignedTo;
                            return (
                                <div key={task.id} className="task-item">
                                    <label className="checkbox">
                                        <input type="checkbox" checked={false} onChange={() => handleToggleTask(task)} aria-label={`Completar ${task.text}`} />
                                    </label>
                                    <span className="task-text" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.text}>
                                        {['critical', 'high'].includes(task.priority) && (
                                            <span style={{ color: PRIORITY_COLORS[task.priority], marginRight: '6px' }}>●</span>
                                        )}
                                        {task.text}
                                    </span>
                                    {owner && <span className="tag tag-purple" style={{ fontSize: '10px', padding: '2px 8px' }}>{owner}</span>}
                                    {label && <span className={`cc-task-due ${dueClass}`}>{label}</span>}
                                </div>
                            );
                        })}
                        {pendingTasks.length > 8 && (
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>+{pendingTasks.length - 8} más en Workspace</div>
                        )}
                    </div>
                </div>

                {/* Portfolio Projects Widget */}
                <div className="widget widget-md">
                    <div className="widget-header">
                        <div className="widget-title"><Briefcase size={16} /> Portafolio de Proyectos</div>
                        <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => navigate('/portfolio')}>
                            Portfolio OS <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="widget-body">
                        {portfolio.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay proyectos activos</div>
                        )}
                        {portfolio.slice(0, 6).map(p => {
                            const deadline = dueLabel(p.daysLeft);
                            return (
                                <div key={p.id} style={{ marginBottom: '14px', cursor: 'pointer' }} onClick={() => navigate('/portfolio')}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                                            <span style={{ color: PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.medium, marginRight: '6px' }}>●</span>
                                            {p.name}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{p.progress}%</span>
                                    </div>
                                    <div className="cc-progress-track">
                                        <div className="cc-progress-fill" style={{
                                            width: `${p.progress}%`,
                                            background: p.progress >= 100 ? 'var(--accent-green)' : 'var(--accent-primary)'
                                        }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.nextMilestone ? `Siguiente: ${p.nextMilestone}` : `${p.openTasks} tareas abiertas`}
                                        </span>
                                        {deadline && (
                                            <span className={`cc-task-due ${p.daysLeft < 0 ? 'is-overdue' : p.daysLeft <= 7 ? 'is-today' : ''}`}>
                                                deadline {deadline}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Active Events Widget */}
                <div className="widget widget-md">
                    <div className="widget-header">
                        <div className="widget-title"><FolderKanban size={16} /> Eventos Activos</div>
                        <span className="tag tag-purple">{activeEvents.length}</span>
                    </div>
                    <div className="widget-body">
                        {activeEvents.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay eventos activos</div>
                        )}
                        {activeEvents.map(event => (
                            <div key={event.id} className="quick-link" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => navigate(`/eventos/${event.id}`)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '18px' }}>{event.icon || '📅'}</span>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{event.name}</span>
                                        {event.date && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                {new Date(event.date + 'T12:00').toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                    {safeTasks.filter(t => !isDone(t) && t.eventId === event.id).length} tareas
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tareas por Evento Breakdown */}
                {tasksByEvent.length > 0 && (
                    <div className="widget widget-md">
                        <div className="widget-header">
                            <div className="widget-title"><Rocket size={16} /> Progreso por Evento</div>
                        </div>
                        <div className="widget-body">
                            {tasksByEvent.map(ev => {
                                const pct = ev.total > 0 ? Math.round((ev.done / ev.total) * 100) : 0;
                                return (
                                    <div key={ev.id} style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '16px' }}>{ev.icon || '📅'}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{ev.name}</span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ev.done}/{ev.total} ({pct}%)</span>
                                        </div>
                                        <div className="cc-progress-track">
                                            <div className="cc-progress-fill" style={{
                                                width: `${pct}%`,
                                                background: pct >= 100 ? 'var(--accent-green)' : (ev.color || 'var(--accent-primary)')
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Social Media Summary */}
                <div className="widget widget-md">
                    <div className="widget-header">
                        <div className="widget-title"><Instagram size={16} /> Redes Sociales</div>
                        <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => navigate('/social')}>
                            Ver todas <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="widget-body">
                        {(socialMedia || []).slice(0, 6).map(account => (
                            <div key={account.id} className="quick-link" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <Instagram size={14} style={{ color: 'white' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{account.handler}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{account.description}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{account.followers}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>seguidores</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Notes */}
                <div className="widget widget-sm">
                    <div className="widget-header">
                        <div className="widget-title"><StickyNote size={16} /> Notas Rápidas</div>
                    </div>
                    <div className="widget-body">
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <input
                                className="form-input" placeholder="Escribe algo..."
                                style={{ flex: 1 }} value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            />
                            <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={handleAddNote}>
                                <Plus size={14} />
                            </button>
                        </div>
                        {notes.length === 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin notas todavía</div>
                        )}
                        {notes.slice(0, 6).map(note => (
                            <div key={note.id} className="note-item">
                                <div className="note-text">{note.text}</div>
                                <div className="note-date">{note.date}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="widget widget-sm">
                    <div className="widget-header">
                        <div className="widget-title"><Clock size={16} /> Actividad Reciente</div>
                    </div>
                    <div className="widget-body">
                        {activityFeed.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Sin actividad reciente</div>
                        ) : (
                            activityFeed.slice(0, 6).map((activity) => {
                                const date = new Date(activity.timestamp);
                                const diffMs = now - date;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHrs = Math.floor(diffMins / 60);
                                const diffDays = Math.floor(diffHrs / 24);
                                let timeStr = 'Ahora';
                                if (diffDays > 0) timeStr = `hace ${diffDays}d`;
                                else if (diffHrs > 0) timeStr = `hace ${diffHrs}h`;
                                else if (diffMins > 0) timeStr = `hace ${diffMins}m`;
                                return (
                                    <div key={activity.id} className="quick-link" style={{ gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: activity.color || 'var(--accent-primary)', flexShrink: 0, marginTop: '6px'
                                        }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', lineHeight: 1.4, wordBreak: 'break-word' }}>{activity.text}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{timeStr}</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
