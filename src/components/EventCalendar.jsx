import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Parse due date strings into Date objects
function parseDueDate(due) {
    if (!due) return null;
    const d = new Date(due);
    if (!isNaN(d.getTime())) return d;

    const today = new Date();
    const lower = due.toLowerCase().trim();
    if (lower === 'today') return today;
    if (lower === 'tomorrow') { const t = new Date(today); t.setDate(t.getDate() + 1); return t; }
    if (lower === 'this week' || lower === 'esta semana') {
        const t = new Date(today);
        t.setDate(t.getDate() + (5 - t.getDay()));
        return t;
    }
    if (lower === 'next week' || lower === 'próxima semana') {
        const t = new Date(today);
        t.setDate(t.getDate() + (12 - t.getDay()));
        return t;
    }
    if (lower === 'next month' || lower === 'próximo mes') {
        const t = new Date(today);
        t.setMonth(t.getMonth() + 1);
        return t;
    }
    return null;
}

const PRIORITY_BG = {
    'critical': 'rgba(239,68,68,0.25)',
    'high': 'rgba(239,68,68,0.15)',
    'medium': 'rgba(99,102,241,0.15)',
    'low': 'rgba(34,197,94,0.15)',
};
const PRIORITY_BORDER = {
    'critical': 'rgba(239,68,68,0.5)',
    'high': 'rgba(239,68,68,0.3)',
    'medium': 'rgba(99,102,241,0.3)',
    'low': 'rgba(34,197,94,0.3)',
};

export default function EventCalendar() {
    const { tasks, addTask, events } = useApp();
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanksArray = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    // Map tasks to their due dates
    const scheduledTasks = useMemo(() => {
        return tasks.map(t => {
            const dueDate = parseDueDate(t.due);
            if (!dueDate) return null;
            if (dueDate.getMonth() !== viewMonth || dueDate.getFullYear() !== viewYear) return null;
            return { ...t, dueDay: dueDate.getDate() };
        }).filter(Boolean);
    }, [tasks, viewMonth, viewYear]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const goToday = () => {
        setViewMonth(today.getMonth());
        setViewYear(today.getFullYear());
    };

    const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();

    return (
        <div className="card animate-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-lg)', color: 'var(--accent-primary)' }}>
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{monthNames[viewMonth]} {viewYear}</h2>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {scheduledTasks.length} task{scheduledTasks.length !== 1 ? 's' : ''} this month
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <button className="btn btn-ghost" style={{ fontSize: '13px', fontWeight: 600 }} onClick={goToday}>Today</button>
                    <button className="btn-icon" onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* Days of week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)', flexShrink: 0 }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '1px' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Monthly Grid — fills remaining space */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gridTemplateRows: `repeat(${Math.ceil((blanksArray.length + daysArray.length) / 7)}, 1fr)`,
                    background: 'var(--border-subtle)',
                    gap: '1px',
                    minHeight: 0,
                }}>
                    
                    {/* Blanks */}
                    {blanksArray.map(b => (
                        <div key={`blank-${b}`} style={{ background: 'var(--bg-canvas)' }} />
                    ))}

                    {/* Actual Days */}
                    {daysArray.map(day => {
                        const dayTasks = scheduledTasks.filter(t => t.dueDay === day);
                        const isToday = isCurrentMonth && day === today.getDate();

                        return (
                            <div key={day} style={{ background: isToday ? 'rgba(99,102,241,0.05)' : 'var(--bg-surface)', padding: '6px', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'background 0.2s', overflow: 'hidden', minHeight: 0 }}
                                onMouseEnter={(e) => { 
                                    if(!isToday) e.currentTarget.style.background = 'var(--bg-card)'; 
                                    const btn = e.currentTarget.querySelector('.ws2-add-btn');
                                    if (btn) btn.style.opacity = 1;
                                }}
                                onMouseLeave={(e) => { 
                                    if(!isToday) e.currentTarget.style.background = 'var(--bg-surface)'; 
                                    const btn = e.currentTarget.querySelector('.ws2-add-btn');
                                    if (btn) btn.style.opacity = 0;
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: isToday ? '#fff' : 'var(--text-secondary)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? 'var(--accent-primary)' : 'transparent' }}>
                                        {day}
                                    </div>
                                    <button 
                                        className="ws2-add-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const text = prompt(`Añadir tarea para el ${day} de ${monthNames[viewMonth]} de ${viewYear}:`);
                                            if (text) {
                                                const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                                addTask({
                                                    id: `ct-${Date.now()}`,
                                                    text,
                                                    status: 'pending',
                                                    done: false,
                                                    eventId: events?.[0]?.id || '',
                                                    due: dateStr,
                                                    priority: 'medium',
                                                    createdAt: new Date().toISOString()
                                                });
                                            }
                                        }}
                                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '1px', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Añadir evento/tarea"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', scrollbarWidth: 'none', minHeight: 0 }}>
                                    {dayTasks.map(t => (
                                        <div key={t.id} style={{ 
                                            fontSize: '10px', 
                                            padding: '2px 4px', 
                                            borderRadius: '3px', 
                                            background: t.done ? 'var(--bg-canvas)' : (PRIORITY_BG[t.priority] || PRIORITY_BG['medium']),
                                            color: t.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                            border: t.done ? '1px dashed var(--border-subtle)' : `1px solid ${PRIORITY_BORDER[t.priority] || PRIORITY_BORDER['medium']}`,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            textDecoration: t.done ? 'line-through' : 'none',
                                            flexShrink: 0,
                                            lineHeight: '1.4',
                                        }}>
                                            {t.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    
                </div>
            </div>
        </div>
    );
}
