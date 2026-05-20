import { useState } from 'react';
import { ChevronDown, Plus, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Monday.com style status aesthetic
const MONDAY_STATUS_COLORS = {
    'done': { label: 'Done', bg: '#00c875', text: '#fff' },
    'working': { label: 'Working on it', bg: '#fdab3d', text: '#fff' },
    'stuck': { label: 'Stuck', bg: '#e2445c', text: '#fff' },
    'pending': { label: '', bg: '#c4c4c4', text: '#fff' }
};

const MONDAY_PRIORITY_COLORS = {
    'critical': { label: 'Critical ⚠️', bg: '#333333', text: '#fff' },
    'high': { label: 'High', bg: '#e2445c', text: '#fff' },
    'medium': { label: 'Medium', bg: '#a25ddc', text: '#fff' },
    'low': { label: 'Low', bg: '#579bfc', text: '#fff' },
    'default': { label: '', bg: '#c4c4c4', text: '#fff' }
};

export default function EventTableView({ events, filterEventId }) {
    const { tasks, updateTask: globalUpdateTask, addTask, addActivity, addEvent } = useApp();

    const filteredTasks = filterEventId 
        ? tasks.filter(t => t.eventId === filterEventId)
        : tasks;

    // Group tasks by event
    const grouped = {};
    
    // Create groups for each event that has tasks
    (events || []).forEach(e => {
        const eventTasks = filteredTasks.filter(t => t.eventId === e.id);
        if (eventTasks.length > 0) {
            grouped[e.id] = {
                name: e.name,
                icon: e.icon || '📅',
                color: e.color || '#ec4899',
                tasks: eventTasks
            };
        }
    });

    // Gather unassigned tasks (no eventId)
    const unassigned = filteredTasks.filter(t => !t.eventId || !events?.find(e => e.id === t.eventId));
    if (unassigned.length > 0) {
        grouped['_unassigned'] = {
            name: 'Sin Evento Asignado',
            icon: '📋',
            color: '#64748b',
            tasks: unassigned
        };
    }

    // If no tasks at all, show empty state
    if (Object.keys(grouped).length === 0) {
        grouped['_empty'] = {
            name: 'Workspace',
            icon: '📋',
            color: '#6366f1',
            tasks: []
        };
    }

    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = (groupKey) => {
        setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const updateTaskLocal = (taskId, field, value) => {
        const payload = { [field]: value };
        if (field === 'status') {
            payload.done = value === 'done';
        }
        if (field === 'eventId') {
            const ev = events?.find(e => e.id === value);
            payload.eventName = ev?.name || '';
        }
        globalUpdateTask(taskId, payload);
    };

    const updateTaskContextLocal = (taskId, contextValue) => {
        if (!contextValue) {
            globalUpdateTask(taskId, { eventId: null, eventName: '' });
            return;
        }

        if (contextValue === 'create_event') {
            const name = window.prompt("Nombre del nuevo evento:");
            if (name) {
                const newId = `ev-${Date.now()}`;
                addEvent({ id: newId, name, status: 'planeacion', color: '#ec4899', icon: '📅' });
                globalUpdateTask(taskId, { eventId: newId, eventName: name });
            }
            return;
        }

        if (contextValue.startsWith('event_')) {
            const eId = contextValue.replace('event_', '');
            const ev = events?.find(e => e.id === eId);
            globalUpdateTask(taskId, { 
                eventId: eId, 
                eventName: ev?.name || ''
            });
        }
    };

    const mapStatusForKanban = (status) => {
        if (status === 'done' || status === 'pending') return status;
        if (status === 'in-progress') return 'working';
        return status;
    };

    const mapBackToKanban = (status) => {
        if (status === 'working') return 'in-progress';
        return status;
    };

    const handleAddTask = (groupKey) => {
        const event = events?.find(e => e.id === groupKey) || (filterEventId ? events?.find(e => e.id === filterEventId) : null);
        addTask({
            id: `k-${Date.now()}`,
            text: 'New Task...',
            status: 'pending',
            done: false,
            eventId: event ? event.id : '',
            eventName: event ? event.name : '',
            priority: 'medium',
            due: '',
            createdAt: new Date().toISOString()
        });
        addActivity(`Added new task to ${group?.name || 'workspace'}`, 'var(--accent-primary)', 'global');
    };

    return (
        <div className="ws2-table-card" style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius-xl)', minHeight: '100%', overflowX: 'auto', padding: '24px', border: '1px solid var(--border-subtle)' }}>
            
            <div style={{ paddingBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
                    Master Table — By Event
                </h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
                    Tasks organized by event. Click statuses to edit. Changes sync with Kanban.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {Object.entries(grouped).map(([groupKey, group], groupIndex) => {
                    const isCollapsed = collapsedGroups[groupKey];
                    const gColor = group.color;
                    const doneCount = group.tasks.filter(t => t.status === 'done' || t.done).length;
                    const totalCount = group.tasks.length;

                    return (
                        <div key={groupKey} className="pulse-group" style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Group Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px',
                                padding: '8px 12px', borderRadius: '10px',
                                background: `linear-gradient(135deg, ${gColor}10, transparent)`,
                            }}>
                                <button onClick={() => toggleGroup(groupKey)} style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: gColor, display: 'flex', alignItems: 'center',
                                }}>
                                    <ChevronDown size={20} style={{
                                        transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                                        transition: 'transform 0.2s'
                                    }} />
                                </button>
                                <span style={{ fontSize: '20px' }}>{group.icon}</span>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: gColor }}>{group.name}</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                                    {totalCount > 0 && (
                                        <>
                                            <div style={{
                                                width: '80px', height: '4px', borderRadius: '2px',
                                                background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${totalCount > 0 ? (doneCount / totalCount * 100) : 0}%`,
                                                    height: '100%', borderRadius: '2px',
                                                    background: gColor,
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600 }}>
                                                {doneCount}/{totalCount}
                                            </span>
                                        </>
                                    )}
                                    <span className="tag" style={{
                                        background: `${gColor}15`, color: gColor,
                                        border: `1px solid ${gColor}30`, fontSize: '11px',
                                    }}>
                                        {totalCount} task{totalCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {!isCollapsed && (
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    {/* Table Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(250px, 2fr) 180px 140px 140px 140px',
                                        gap: '4px', paddingBottom: '8px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 600,
                                        position: 'sticky', top: 0, background: 'var(--bg-canvas)', zIndex: 10,
                                    }}>
                                        <div style={{ paddingLeft: '24px' }}>Item Name</div>
                                        <div style={{ textAlign: 'center' }}>Evento</div>
                                        <div style={{ textAlign: 'center' }}>Status</div>
                                        <div style={{ textAlign: 'center' }}>Priority</div>
                                        <div style={{ textAlign: 'center' }}>Timeline</div>
                                    </div>

                                    {/* Table Rows */}
                                    {group.tasks.map((task) => {
                                        const statusKey = mapStatusForKanban(task.status) || 'pending';
                                        const sColorInfo = MONDAY_STATUS_COLORS[statusKey] || MONDAY_STATUS_COLORS['pending'];
                                        const pColorInfo = MONDAY_PRIORITY_COLORS[task.priority] || MONDAY_PRIORITY_COLORS['default'];
                                        const taskEvent = events?.find(e => e.id === task.eventId);

                                        return (
                                            <div key={task.id} style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'minmax(250px, 2fr) 180px 140px 140px 140px', 
                                                gap: '4px',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: 'var(--bg-card)',
                                                position: 'relative',
                                            }}
                                            className="pulse-row"
                                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: 'var(--bg-primary)' })}
                                            onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: 'var(--bg-card)' })}
                                            >
                                                {/* Left color bar */}
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: gColor, borderTopRightRadius: '2px', borderBottomRightRadius: '2px' }} />

                                                {/* ITEM NAME */}
                                                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 8px 24px' }}>
                                                    <input 
                                                        value={task.text} 
                                                        onChange={(e) => updateTaskLocal(task.id, 'text', e.target.value)}
                                                        style={{ background: 'transparent', border: '1px solid transparent', color: task.done ? 'var(--text-tertiary)' : 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '14px', textDecoration: task.done ? 'line-through' : 'none', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                                                        onFocus={(e) => Object.assign(e.currentTarget.style, { border: '1px solid var(--border-subtle)', background: 'var(--bg-base)' })}
                                                        onBlur={(e) => Object.assign(e.currentTarget.style, { border: '1px solid transparent', background: 'transparent' })}
                                                    />
                                                </div>

                                                {/* EVENTO */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border-subtle)', padding: '4px' }}>
                                                    <select 
                                                        value={task.eventId ? `event_${task.eventId}` : ''} 
                                                        onChange={(e) => updateTaskContextLocal(task.id, e.target.value)}
                                                        style={{ 
                                                            appearance: 'none', border: '1px solid transparent', background: 'transparent',
                                                            color: taskEvent ? taskEvent.color : 'var(--text-tertiary)',
                                                            fontSize: '11px', textAlign: 'center', cursor: 'pointer', outline: 'none',
                                                            padding: '4px 6px', borderRadius: '4px', transition: 'all 0.2s', width: '100%',
                                                            fontWeight: taskEvent ? 600 : 400,
                                                        }}
                                                        onMouseEnter={(e) => Object.assign(e.currentTarget.style, { border: '1px solid var(--border-subtle)', background: 'var(--bg-base)' })}
                                                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { border: '1px solid transparent', background: 'transparent' })}
                                                    >
                                                        <option value="">— None —</option>
                                                        <optgroup label="Eventos">
                                                            {(events || []).map(ev => <option key={`e-${ev.id}`} value={`event_${ev.id}`}>{ev.icon || '📅'} {ev.name}</option>)}
                                                            <option value="create_event" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>➕ Crear Evento...</option>
                                                        </optgroup>
                                                    </select>
                                                </div>


                                                {/* STATUS (Interactive Solid Block) */}
                                                <div style={{ 
                                                    borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', 
                                                    background: sColorInfo.bg, color: sColorInfo.text,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    fontSize: '13px', fontWeight: 500
                                                }}
                                                className="pulse-cell-interactive"
                                                >
                                                    <select 
                                                        value={statusKey} 
                                                        onChange={(e) => updateTaskLocal(task.id, 'status', mapBackToKanban(e.target.value))}
                                                        style={{ 
                                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                            opacity: 0, cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="working">Working on it</option>
                                                        <option value="stuck">Stuck</option>
                                                        <option value="done">Done</option>
                                                    </select>
                                                    <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{sColorInfo.label}</span>
                                                    {/* Corner fold effect */}
                                                    <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '10px solid rgba(0,0,0,0.15)', borderLeft: '10px solid transparent' }} />
                                                </div>

                                                {/* PRIORITY (Interactive Solid Block) */}
                                                <div style={{ 
                                                    borderRight: '1px solid var(--border-subtle)', 
                                                    background: pColorInfo.bg, color: pColorInfo.text,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    position: 'relative', cursor: 'pointer',
                                                    fontSize: '13px', fontWeight: 500
                                                }}>
                                                    <select 
                                                        value={task.priority || 'default'} 
                                                        onChange={(e) => updateTaskLocal(task.id, 'priority', e.target.value)}
                                                        style={{ 
                                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                            opacity: 0, cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="default"></option>
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                        <option value="critical">Critical ⚠️</option>
                                                    </select>
                                                    <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{pColorInfo.label}</span>
                                                </div>

                                                {/* TIMELINE */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                                                    <input 
                                                        value={task.due || ''} 
                                                        onChange={(e) => updateTaskLocal(task.id, 'due', e.target.value)}
                                                        style={{ 
                                                            background: 'transparent', border: '1px solid transparent', 
                                                            color: 'var(--text-secondary)', textAlign: 'center', width: '100%', fontSize: '13px',
                                                            borderRadius: '4px'
                                                        }}
                                                        placeholder="Add date"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add task simple row */}
                                    <div style={{ 
                                        display: 'grid', gridTemplateColumns: 'minmax(250px, 2fr) 180px 140px 140px 140px', gap: '4px',
                                    }}>
                                        <div style={{ position: 'relative', borderLeft: `6px solid ${gColor}33`, paddingLeft: '18px' }}>
                                            <button 
                                                onClick={() => handleAddTask(groupKey)}
                                                style={{ 
                                                    background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '13px',
                                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 8px', width: '100%',
                                                    cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                <Plus size={14} /> Add Task
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty event rows for untracked events */}
            {(events || []).filter(e => !grouped[e.id]).length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>
                        Eventos sin tareas
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(events || []).filter(e => !grouped[e.id]).map(e => (
                            <button
                                key={e.id}
                                className="btn btn-ghost"
                                onClick={() => handleAddTask(e.id)}
                                style={{
                                    fontSize: '12px', padding: '6px 14px', borderRadius: '10px',
                                    background: `${e.color || '#ec4899'}08`,
                                    border: `1px solid ${e.color || '#ec4899'}20`,
                                    color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}
                            >
                                <span style={{ fontSize: '14px' }}>{e.icon || '📅'}</span> {e.name}
                                <Plus size={12} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
