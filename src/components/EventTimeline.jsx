import { useState, useMemo } from 'react';
import { CalendarDays, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Parse a due string or ISO date into a Date object
function parseDueDate(due) {
    if (!due) return null;
    // ISO date or date strings like "2026-04-14"
    const d = new Date(due);
    if (!isNaN(d.getTime())) return d;

    // Relative strings
    const today = new Date();
    const lower = due.toLowerCase().trim();
    if (lower === 'today') return today;
    if (lower === 'tomorrow') { const t = new Date(today); t.setDate(t.getDate() + 1); return t; }
    if (lower === 'this week' || lower === 'esta semana') {
        const t = new Date(today);
        t.setDate(t.getDate() + (5 - t.getDay())); // Friday of this week
        return t;
    }
    if (lower === 'next week' || lower === 'próxima semana') {
        const t = new Date(today);
        t.setDate(t.getDate() + (12 - t.getDay())); // Friday of next week
        return t;
    }
    if (lower === 'next month' || lower === 'próximo mes') {
        const t = new Date(today);
        t.setMonth(t.getMonth() + 1);
        return t;
    }
    return null;
}

export default function EventTimeline() {
    const { tasks, agents } = useApp();
    const [offsetWeeks, setOffsetWeeks] = useState(0);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDate.getDay() + (offsetWeeks * 7)); // Start of week (Sunday)

    // Generate 28 days (4 weeks)
    const days = Array.from({ length: 28 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Map tasks to timeline
    const mappedTasks = useMemo(() => {
        return tasks.map(t => {
            const dueDate = parseDueDate(t.due);
            const createdDate = t.createdAt ? new Date(t.createdAt) : null;

            // Calculate start and end positions relative to view window
            let startIdx = -1;
            let endIdx = -1;

            if (dueDate) {
                const dueDiff = Math.floor((dueDate - startDate) / (1000 * 60 * 60 * 24));
                // Approximate a 2-day duration for tasks, or use created → due span
                let taskStart = dueDiff - 2;
                let taskEnd = dueDiff;

                if (createdDate) {
                    const createDiff = Math.floor((createdDate - startDate) / (1000 * 60 * 60 * 24));
                    if (createDiff >= 0 && createDiff < dueDiff) {
                        taskStart = createDiff;
                    }
                }

                startIdx = Math.max(0, taskStart);
                endIdx = Math.min(27, taskEnd);
            }

            const agent = agents.find(a => a.id === t.agentId);

            return {
                ...t,
                startIdx,
                endIdx,
                duration: endIdx - startIdx + 1,
                visible: startIdx >= 0 && startIdx <= 27 && endIdx >= 0,
                agentName: agent ? agent.name.split(' ')[0] : null,
            };
        }).filter(t => t.visible);
    }, [tasks, agents, startDate]);

    const todayIdx = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            
            {/* Toolbar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CalendarDays size={20} style={{ color: 'var(--accent-primary)' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Roadmap Timeline</h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {days[27].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost" style={{ fontSize: '13px', padding: '6px 10px' }} onClick={() => setOffsetWeeks(prev => prev - 4)}>
                        <ChevronLeft size={14} />
                    </button>
                    <button className="btn btn-primary" style={{ fontSize: '13px' }} onClick={() => setOffsetWeeks(0)}>Today</button>
                    <button className="btn btn-ghost" style={{ fontSize: '13px', padding: '6px 10px' }} onClick={() => setOffsetWeeks(prev => prev + 4)}>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Gantt Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                
                {/* Left Panel: Task List */}
                <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-card)', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '48px', borderBottom: '1px solid var(--border-subtle)', padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-surface)' }}>
                        ITEM NAME ({mappedTasks.length} in view)
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none' }}>
                        {mappedTasks.map(t => (
                            <div key={t.id} style={{ height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: t.done ? 'var(--text-tertiary)' : 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: t.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.text}</span>
                                {t.agentName && (
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', flexShrink: 0 }}>
                                        {t.agentName}
                                    </span>
                                )}
                            </div>
                        ))}
                        {mappedTasks.length === 0 && (
                            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                No tasks with dates in this range.
                                <br /><span style={{ fontSize: '11px' }}>Give tasks a due date to see them here.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Gantt Chart Grid */}
                <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', background: 'var(--bg-base)', position: 'relative', scrollbarWidth: 'thin' }}>
                    <div style={{ minWidth: '1200px' }}>
                        
                        {/* Day Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(28, 1fr)', height: '48px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                            {days.map((d, i) => {
                                const isToday = i === todayIdx;
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                    <div key={i} style={{ 
                                        borderRight: '1px solid rgba(255,255,255,0.03)', 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
                                        background: isToday ? 'rgba(99,102,241,0.1)' : isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    }}>
                                        <span style={{ color: isToday ? 'var(--accent-primary)' : 'var(--text-tertiary)', fontWeight: isToday ? 700 : 400 }}>{dayLabels[d.getDay()]}</span>
                                        <strong style={{ color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: isToday ? '13px' : '11px' }}>{d.getDate()}</strong>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Today marker line */}
                        {todayIdx >= 0 && todayIdx <= 27 && (
                            <div style={{
                                position: 'absolute', top: '48px', bottom: 0,
                                left: `calc((100% / 28) * ${todayIdx} + (100% / 28) / 2)`,
                                width: '2px', background: 'var(--accent-primary)', opacity: 0.5, zIndex: 5,
                            }} />
                        )}

                        {/* Task Bars */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {mappedTasks.map(t => {
                                const priorityColors = {
                                    'high': 'linear-gradient(90deg, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.6) 100%)',
                                    'critical': 'linear-gradient(90deg, rgba(239,68,68,0.9) 0%, rgba(168,38,38,0.8) 100%)',
                                    'medium': 'linear-gradient(90deg, rgba(99,102,241,0.8) 0%, rgba(139,94,253,0.8) 100%)',
                                    'low': 'linear-gradient(90deg, rgba(34,197,94,0.7) 0%, rgba(34,197,94,0.5) 100%)',
                                };
                                return (
                                    <div key={t.id} style={{ height: '48px', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'grid', gridTemplateColumns: 'repeat(28, 1fr)' }}>
                                            {days.map((d, i) => (
                                                <div key={i} style={{ borderRight: '1px dotted rgba(255,255,255,0.04)', background: (d.getDay() === 0 || d.getDay() === 6) ? 'rgba(255,255,255,0.01)' : 'transparent' }} />
                                            ))}
                                        </div>
                                        
                                        {/* The Gantt Bar */}
                                        <div style={{
                                            position: 'absolute',
                                            left: `calc((100% / 28) * ${t.startIdx})`,
                                            width: `calc((100% / 28) * ${t.duration})`,
                                            top: '8px',
                                            bottom: '8px',
                                            background: t.done ? 'var(--bg-surface)' : (priorityColors[t.priority] || priorityColors['medium']),
                                            borderRadius: 'var(--radius-md)',
                                            border: t.done ? '1px dashed var(--border-subtle)' : '1px solid rgba(99,102,241,0.3)',
                                            boxShadow: t.done ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: t.done ? 'var(--text-tertiary)' : '#fff',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.3s ease',
                                        }}>
                                            {t.duration > 2 ? t.text : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
