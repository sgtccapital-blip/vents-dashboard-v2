import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckSquare, CalendarDays, Share2, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import CalendarItemModal from '../components/CalendarItemModal';

// Utility to calculate exact dates for social media content based on weekOffset and dayIndex
const getContentDate = (weekOffset, dayIndex) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    monday.setDate(monday.getDate() + weekOffset * 7 + dayIndex);
    monday.setHours(0, 0, 0, 0);
    return monday;
};

// Same utility from EventCalendar
function parseDueDate(due) {
    if (!due) return null;
    
    let d;
    if (typeof due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due.trim())) {
        d = new Date(due.trim() + 'T12:00:00');
    } else {
        d = new Date(due);
    }
    
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

const isSameDay = (d1, d2) => d1 && d2 && d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

export default function MasterCalendar() {
    const { tasks, events, addTask } = useApp();
    const navigate = useNavigate();
    const today = new Date();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'day', 'week', '2week', 'month'
    
    const [contentEntries, setContentEntries] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        const loadContent = () => {
            try {
                const saved = localStorage.getItem('os_contentCalendar');
                if (saved) setContentEntries(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading content calendar', e);
            }
        };

        loadContent();
        
        window.addEventListener('storage', loadContent);
        window.addEventListener('contentCalendarUpdated', loadContent);

        return () => {
            window.removeEventListener('storage', loadContent);
            window.removeEventListener('contentCalendarUpdated', loadContent);
        };
    }, []);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

    // Generate days to display based on viewMode
    const daysToDisplay = useMemo(() => {
        const arr = [];
        const start = new Date(currentDate);
        start.setHours(0,0,0,0);
        
        if (viewMode === 'month') {
            start.setDate(1);
            const blanks = start.getDay();
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            const numDays = end.getDate();
            
            for (let i = 0; i < blanks; i++) {
                arr.push(null);
            }
            for (let i = 1; i <= numDays; i++) {
                arr.push(new Date(start.getFullYear(), start.getMonth(), i));
            }
            const totalCells = Math.ceil(arr.length / 7) * 7;
            const extraBlanks = totalCells - arr.length;
            for (let i = 0; i < extraBlanks; i++) {
                arr.push(null);
            }
        } else if (viewMode === 'week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                arr.push(d);
            }
        } else if (viewMode === '2week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            for (let i = 0; i < 14; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                arr.push(d);
            }
        } else if (viewMode === 'day') {
            arr.push(new Date(start));
        }
        
        return arr;
    }, [currentDate, viewMode]);

    // Merge and map all items to their dates
    const unifiedItems = useMemo(() => {
        const items = [];

        tasks.forEach(t => {
            const dueDate = parseDueDate(t.due);
            if (!dueDate) return;
            items.push({
                id: `task-${t.id}`,
                type: 'task',
                title: t.text,
                dateObj: dueDate,
                done: t.done,
                priority: t.priority || 'medium',
                fullItem: t
            });
        });

        events.forEach(e => {
            if (!e.date) {
                if (e.instances) {
                    e.instances.forEach(inst => {
                        const evtDate = new Date(inst.date + 'T12:00:00'); 
                        items.push({
                            id: `evt-inst-${inst.id}`,
                            eventId: e.id,
                            type: 'event',
                            title: `${e.name} ${inst.day || ''}`.trim(),
                            dateObj: evtDate,
                            color: e.color || '#ef4444',
                            fullItem: e
                        });
                    });
                }
                return;
            }

            const evtDate = new Date(e.date + 'T12:00:00');
            items.push({
                id: `evt-${e.id}`,
                eventId: e.id,
                type: 'event',
                title: e.name,
                dateObj: evtDate,
                color: e.color || '#10b981',
                fullItem: e
            });
        });

        contentEntries.forEach(c => {
            const contentDate = getContentDate(c.weekOffset, c.dayIndex);
            items.push({
                id: `content-${c.id}`,
                type: 'content',
                title: `${c.contentType} - ${c.topic || 'Sin tema'}`,
                dateObj: contentDate,
                status: c.status,
                fullItem: c
            });
        });

        return items;
    }, [tasks, events, contentEntries]);

    // MAIN ARROWS ALWAYS JUMP BY MONTH
    const prevMonth = () => {
        const nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() - 1);
        setCurrentDate(nextDate);
    };

    const nextMonth = () => {
        const nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        setCurrentDate(nextDate);
    };

    // NEW BUTTONS TO JUMP BY DAY/WEEK DEPENDING ON VIEW
    const jumpBack = () => {
        const nextDate = new Date(currentDate);
        if (viewMode === 'week') nextDate.setDate(nextDate.getDate() - 7);
        else if (viewMode === '2week') nextDate.setDate(nextDate.getDate() - 14);
        else if (viewMode === 'day') nextDate.setDate(nextDate.getDate() - 1);
        setCurrentDate(nextDate);
    };

    const jumpForward = () => {
        const nextDate = new Date(currentDate);
        if (viewMode === 'week') nextDate.setDate(nextDate.getDate() + 7);
        else if (viewMode === '2week') nextDate.setDate(nextDate.getDate() + 14);
        else if (viewMode === 'day') nextDate.setDate(nextDate.getDate() + 1);
        setCurrentDate(nextDate);
    };

    const goToday = () => {
        setCurrentDate(new Date());
    };

    const getHeaderText = () => {
        if (viewMode === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else if (viewMode === 'day') {
            return `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else {
            const start = daysToDisplay.find(d => d !== null); 
            const end = daysToDisplay[daysToDisplay.length - 1]; 
            if (start && end) {
                if (start.getMonth() === end.getMonth()) {
                    return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
                } else {
                    return `${start.getDate()} ${monthNames[start.getMonth()].substring(0,3)} - ${end.getDate()} ${monthNames[end.getMonth()].substring(0,3)} ${end.getFullYear()}`;
                }
            }
            return '';
        }
    };

    const visibleItemsCount = useMemo(() => {
        let count = 0;
        daysToDisplay.forEach(day => {
            if (day) count += unifiedItems.filter(i => isSameDay(i.dateObj, day)).length;
        });
        return count;
    }, [daysToDisplay, unifiedItems]);

    const PRIORITY_BG = { 'critical': 'rgba(239,68,68,0.25)', 'high': 'rgba(239,68,68,0.15)', 'medium': 'rgba(99,102,241,0.15)', 'low': 'rgba(34,197,94,0.15)' };
    const PRIORITY_BORDER = { 'critical': 'rgba(239,68,68,0.5)', 'high': 'rgba(239,68,68,0.3)', 'medium': 'rgba(99,102,241,0.3)', 'low': 'rgba(34,197,94,0.3)' };

    let numRows = 1;
    if (viewMode === 'month') numRows = Math.ceil(daysToDisplay.length / 7);
    else if (viewMode === '2week') numRows = 2;

    return (
        <div className="page-content animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height))', overflow: 'hidden', boxSizing: 'border-box' }}>
            <div className="page-header" style={{ marginBottom: '12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)' }}>
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '20px', margin: 0 }}>Master Calendar</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                            Visualiza tareas, eventos y contenido de redes sociales en un solo lugar
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                
                {/* Main Action Bar */}
                <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
                    
                    {/* View Options (Large Buttons) */}
                    <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-canvas)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        {[
                            { id: 'day', label: 'Día' },
                            { id: 'week', label: '1 Semana' },
                            { id: '2week', label: '2 Semanas' },
                            { id: 'month', label: 'Mes Completo' }
                        ].map(mode => (
                            <button 
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                style={{
                                    padding: '6px 14px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    background: viewMode === mode.id ? 'var(--accent-primary)' : 'transparent',
                                    color: viewMode === mode.id ? '#ffffff' : 'var(--text-secondary)',
                                    border: 'none',
                                    boxShadow: viewMode === mode.id ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {/* Navigation Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        
                        {/* Detail Navigation (Days/Weeks) - Only shown if not in month view */}
                        {viewMode !== 'month' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-canvas)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                <button className="btn-icon" onClick={jumpBack} title="Anterior periodo"><ArrowLeft size={18} color="var(--accent-primary)" /></button>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', padding: '0 8px' }}>
                                    Mover {viewMode === 'day' ? 'Día' : 'Semana'}
                                </span>
                                <button className="btn-icon" onClick={jumpForward} title="Siguiente periodo"><ArrowRight size={18} color="var(--accent-primary)" /></button>
                            </div>
                        )}

                        {/* Master Navigation (Months) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button className="btn-icon" onClick={prevMonth} title="Mes anterior"><ChevronLeft size={24} /></button>
                            <div style={{ textAlign: 'center', minWidth: '180px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{getHeaderText()}</h2>
                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                    {visibleItemsCount} elementos visibles
                                </span>
                            </div>
                            <button className="btn-icon" onClick={nextMonth} title="Mes siguiente"><ChevronRight size={24} /></button>
                            <button className="btn" style={{ marginLeft: '8px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }} onClick={goToday}>
                                Hoy
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters / Legend */}
                <div style={{ padding: '8px 24px', background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckSquare size={14} color="var(--accent-primary)" /> Tareas</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} color="#10b981" /> Eventos</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Share2 size={14} color="#f59e0b" /> Redes Sociales</span>
                </div>

                {/* Grid Container */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)', minHeight: 0, overflow: 'hidden' }}>
                    
                    {/* Days of week Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'day' ? '1fr' : 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)', flexShrink: 0 }}>
                        {viewMode === 'day' ? (
                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '1px' }}>
                                {dayNames[currentDate.getDay()]}
                            </div>
                        ) : (
                            dayNames.map(day => (
                                <div key={day} style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '1px' }}>
                                    {day}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Calendar Grid */}
                    <div style={{ 
                        flex: 1, 
                        display: 'grid', 
                        gridTemplateColumns: viewMode === 'day' ? '1fr' : 'repeat(7, 1fr)', 
                        gridTemplateRows: `repeat(${numRows}, 1fr)`, 
                        background: 'var(--border-subtle)', 
                        gap: '1px',
                        minHeight: 0,
                    }}>
                        {daysToDisplay.map((dayDate, i) => {
                            if (!dayDate) {
                                return <div key={`blank-${i}`} style={{ background: 'var(--bg-canvas)' }} />;
                            }

                            const dayItems = unifiedItems.filter(item => isSameDay(item.dateObj, dayDate));
                            const isToday = isSameDay(dayDate, today);

                            return (
                                <div key={`day-${i}`} style={{ background: isToday ? 'rgba(99,102,241,0.05)' : 'var(--bg-surface)', padding: '8px', display: 'flex', flexDirection: 'column', transition: 'background 0.2s', height: '100%', minHeight: 0, overflow: 'hidden' }}
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexShrink: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: isToday ? '#fff' : 'var(--text-secondary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? 'var(--accent-primary)' : 'transparent' }}>
                                            {dayDate.getDate()}
                                        </div>
                                        <button 
                                            className="ws2-add-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const text = prompt(`Añadir tarea para el ${dayDate.getDate()} de ${monthNames[dayDate.getMonth()]} de ${dayDate.getFullYear()}:`);
                                                if (text) {
                                                    const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;
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
                                            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Añadir evento/tarea"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', scrollbarWidth: 'none', minHeight: 0 }}>
                                        {dayItems.map(item => {
                                            if (item.type === 'task') {
                                                return (
                                                    <div key={item.id} 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                        style={{ 
                                                        fontSize: '10px', 
                                                        padding: '4px 6px', 
                                                        borderRadius: '4px', 
                                                        background: item.done ? 'var(--bg-canvas)' : (PRIORITY_BG[item.priority] || PRIORITY_BG['medium']),
                                                        color: item.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                        border: item.done ? '1px dashed var(--border-subtle)' : `1px solid ${PRIORITY_BORDER[item.priority] || PRIORITY_BORDER['medium']}`,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        textDecoration: item.done ? 'line-through' : 'none',
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <CheckSquare size={10} /> {item.title}
                                                    </div>
                                                );
                                            }
                                            if (item.type === 'event') {
                                                return (
                                                    <div key={item.id} 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                        style={{ 
                                                        fontSize: '10px', 
                                                        padding: '4px 6px', 
                                                        borderRadius: '4px', 
                                                        background: `${item.color}20`,
                                                        color: item.color,
                                                        border: `1px solid ${item.color}50`,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <CalendarDays size={10} /> {item.title}
                                                    </div>
                                                );
                                            }
                                            if (item.type === 'content') {
                                                const statusColor = item.status === 'published' ? '#22c55e' : item.status === 'ready' ? '#3b82f6' : item.status === 'draft' ? '#f59e0b' : '#6b7280';
                                                return (
                                                    <div key={item.id} 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                        style={{ 
                                                        fontSize: '10px', 
                                                        padding: '4px 6px', 
                                                        borderRadius: '4px', 
                                                        background: `${statusColor}20`,
                                                        color: statusColor,
                                                        border: `1px solid ${statusColor}50`,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <Share2 size={10} /> {item.title}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedItem && (
                <CalendarItemModal 
                    item={selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                />
            )}
        </div>
    );
}
