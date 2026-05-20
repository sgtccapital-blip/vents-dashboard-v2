import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckSquare, FolderKanban, StickyNote,
    Clock, Plus, DollarSign, Rocket, Lightbulb, UserPlus,
    Instagram, Users, CalendarDays, MapPin, Timer, ArrowRight, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Home() {
    const { events, socialMedia, tasks, toggleTask, notes, addNote: cxAddNote, activityFeed, addActivity, subscriptions } = useApp();
    const navigate = useNavigate();
    const [newNote, setNewNote] = useState('');
    const [now, setNow] = useState(new Date());

    // Live clock for countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        cxAddNote({ id: `note-${Date.now()}`, text: newNote, date: new Date().toISOString().split('T')[0] });
        addActivity(`Added quick note: "${newNote.substring(0, 20)}${newNote.length > 20 ? '...' : ''}"`, 'var(--accent-yellow)');
        setNewNote('');
    };

    const handleToggleTask = (task) => {
        toggleTask(task.id);
        const action = !task.done ? 'Completed' : 'Reopened';
        const color = !task.done ? 'var(--accent-green)' : 'var(--text-secondary)';
        addActivity(`${action} dashboard task: "${task.text.substring(0, 30)}${task.text.length > 30 ? '...' : ''}"`, color);
    };

    const activeEvents = events?.filter(e => ['planeacion', 'planificacion', 'ejecucion', 'activo', 'upcoming', 'ongoing'].includes(e.status)) || [];
    const todaysTasks = tasks.filter(t => !t.done).sort((a, b) => new Date(a.due || '2099') - new Date(b.due || '2099')).slice(0, 15);
    const completedTasks = tasks.filter(t => t.done).slice(0, 5);

    const totalAudience = socialMedia ? socialMedia.reduce((acc, account) => {
        let count = 0;
        const followers = String(account.followers || '0').toUpperCase();
        if (followers.includes('K')) count = parseFloat(followers) * 1000;
        else if (followers.includes('M')) count = parseFloat(followers) * 1000000;
        else count = parseFloat(followers);
        return acc + (isNaN(count) ? 0 : count);
    }, 0) : 0;

    const totalMonthlyCost = subscriptions ? subscriptions.reduce((acc, sub) => acc + (sub.cost || 0), 0) : 0;

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Number.isInteger(num) ? num.toString() : num.toFixed(2);
    };

    // --- Next Event Countdown ---
    const allDates = (events || []).flatMap(e => {
        if (e.date) return [{ name: e.name, date: e.date, icon: e.icon, color: e.color, location: e.location, id: e.id }];
        if (e.instances) return e.instances.map(inst => ({ name: e.name, date: inst.date, icon: e.icon, color: e.color, location: e.location || '', id: e.id }));
        return [];
    }).filter(e => new Date(e.date + 'T23:59') >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextEvent = allDates[0] || null;

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

    // --- Mini Calendar (next 7 days) ---
    const next7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayEvents = allDates.filter(e => e.date === dateStr);
        return { date: d, dateStr, events: dayEvents, isToday: i === 0 };
    });

    // --- Tasks by Event ---
    const tasksByEvent = activeEvents.map(ev => {
        const evTasks = tasks.filter(t => t.eventId === ev.id);
        const pending = evTasks.filter(t => !t.done).length;
        const done = evTasks.filter(t => t.done).length;
        return { ...ev, pending, done, total: evTasks.length };
    }).filter(ev => ev.total > 0);

    const countdown = nextEvent ? getCountdown(nextEvent.date) : null;

    return (
        <div className="page-content animate-in">
            <div className="page-header">
                <div>
                    <h1>⚡ Command Center</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Tu sistema operativo personal
                    </p>
                </div>
                <div className="page-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {new Date().toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* ══════ NEXT EVENT COUNTDOWN HERO ══════ */}
            {nextEvent && countdown && (
                <div onClick={() => navigate('/eventos')} className="cc-countdown-hero" style={{
                    background: `linear-gradient(135deg, ${nextEvent.color}18, ${nextEvent.color}08, transparent)`,
                    borderColor: `${nextEvent.color}30`
                }}>
                    <div className="cc-countdown-bg" style={{
                        background: `radial-gradient(circle at 100% 50%, ${nextEvent.color}10, transparent 70%)`
                    }} />
                    <div className="cc-countdown-icon" style={{
                        background: `${nextEvent.color}25`, borderColor: `${nextEvent.color}40`
                    }}>{nextEvent.icon || '📅'}</div>
                    <div className="cc-countdown-info">
                        <div className="cc-countdown-label" style={{ color: nextEvent.color }}>
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
                                <div className="cc-countdown-time-val" style={{ color: nextEvent.color }}>{String(val).padStart(2, '0')}</div>
                                <div className="cc-countdown-time-lbl">{label}</div>
                            </div>
                        ))}
                    </div>
                    <ChevronRight size={20} className="cc-countdown-chevron" />
                </div>
            )}

            {/* ══════ METRICS BANNER ══════ */}
            <div className="cc-metrics-banner">
                <div className="cc-metric-card">
                    <div className="cc-metric-label"><DollarSign size={14} style={{ color: 'var(--accent-green)' }} /> Monthly Opex</div>
                    <div className="cc-metric-value">${formatNumber(totalMonthlyCost)}</div>
                    <div className="cc-metric-sub">{subscriptions?.length || 0} suscripciones activas</div>
                </div>
                <div className="cc-metric-card">
                    <div className="cc-metric-label"><FolderKanban size={14} style={{ color: 'var(--accent-primary)' }} /> Eventos Activos</div>
                    <div className="cc-metric-value">{activeEvents.length}</div>
                    <div className="cc-metric-sub">En ejecución o planificación</div>
                </div>
                <div className="cc-metric-card">
                    <div className="cc-metric-label"><CheckSquare size={14} style={{ color: 'var(--accent-yellow)' }} /> Tareas Pendientes</div>
                    <div className="cc-metric-value">{todaysTasks.length}</div>
                    <div className="cc-metric-sub">{completedTasks.length} completadas recientemente</div>
                </div>
                <div className="cc-metric-card">
                    <div className="cc-metric-label"><Instagram size={14} style={{ color: '#E1306C' }} /> Audiencia Total</div>
                    <div className="cc-metric-value">{formatNumber(totalAudience)}</div>
                    <div className="cc-metric-sub">{socialMedia?.length || 0} cuentas activas</div>
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

            {/* ══════ MAIN GRID ══════ */}
            <div className="dashboard-grid">

                {/* Tasks Widget */}
                <div className="widget widget-md">
                    <div className="widget-header">
                        <div className="widget-title"><CheckSquare size={16} /> Tareas Activas</div>
                        <span className="tag tag-active">{todaysTasks.length} pendientes</span>
                    </div>
                    <div className="widget-body">
                        {todaysTasks.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay tareas pendientes 🎉</div>
                        )}
                        {todaysTasks.map(task => (
                            <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                                <label className="checkbox">
                                    <input type="checkbox" checked={task.done} onChange={() => handleToggleTask(task)} />
                                </label>
                                <span className="task-text">{task.text}</span>
                                <span className={`tag tag-${task.priority === 'high' ? 'active' : task.priority === 'medium' ? 'paused' : 'idea'}`} style={{ fontSize: '10px' }}>
                                    {task.priority}
                                </span>
                            </div>
                        ))}
                        {completedTasks.length > 0 && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>✓ {completedTasks.length} completadas</p>
                                {completedTasks.map(task => (
                                    <div key={task.id} className="task-item done">
                                        <label className="checkbox"><input type="checkbox" checked={true} onChange={() => handleToggleTask(task)} /></label>
                                        <span className="task-text">{task.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
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
                            <div key={event.id} className="quick-link" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => navigate('/eventos')}>
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
                                    {tasks.filter(t => !t.done && t.eventId === event.id).length} tareas
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
                                        <div style={{ height: '6px', background: 'var(--bg-canvas)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${pct}%`, height: '100%', borderRadius: '3px',
                                                background: pct >= 100 ? 'var(--accent-green)' : (ev.color || 'var(--accent-primary)'),
                                                transition: 'width 0.8s ease'
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
                        {notes.map(note => (
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
