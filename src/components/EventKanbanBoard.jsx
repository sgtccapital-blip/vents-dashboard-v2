import { AlertCircle, Clock, Send, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';

const statusMap = {
    'pending': 'pending',
    'active': 'in-progress',
    'in-progress': 'in-progress',
    'done': 'done'
};

const statusConfig = {
    'pending': { label: 'Pending / Backlog', color: 'var(--text-tertiary)', bg: 'var(--bg-surface)' },
    'in-progress': { label: 'In Progress / Active', color: 'var(--accent-primary)', bg: 'rgba(99, 102, 241, 0.1)' },
    'done': { label: 'Done / Completed', color: 'var(--accent-green)', bg: 'rgba(34, 197, 94, 0.1)' }
};

// ── Individual Card Component (to allow useState per-card) ──
const ASSIGNEE_CONFIG = {
    'GG': { bg: 'rgba(129, 140, 248, 0.15)', border: '1px solid rgba(129, 140, 248, 0.3)', color: '#818cf8' },
    'GEN': { bg: 'rgba(244, 114, 182, 0.15)', border: '1px solid rgba(244, 114, 182, 0.3)', color: '#f472b6' },
    'ITA': { bg: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399' }
};

function KanbanCard({ t, colStatus, events, deleteTask, updateTaskStatus, updateTaskContext, updateTaskDate, updateTaskAssignee }) {
    const taskEvent = events?.find(e => e.id === t.eventId);
    const eventColor = taskEvent?.color || null;

    return (
        <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('taskId', t.id)} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            borderLeft: eventColor ? `3px solid ${eventColor}` : '1px solid var(--border-subtle)',
            padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            opacity: t.done ? 0.6 : 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            cursor: 'grab'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ fontSize: '12.5px', lineHeight: '1.4', fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-tertiary)' : '#fff' }}>
                        {t.text}
                    </div>
                </div>
                <button 
                    className="btn-icon" 
                    onClick={() => deleteTask(t.id)} 
                    style={{ color: 'var(--text-tertiary)', padding: '2px', width: '18px', height: '18px', flexShrink: 0, opacity: 0.7 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.opacity = 0.7; }}
                    title="Delete Task"
                >
                    <Trash2 size={13} />
                </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                {/* Event Selector */}
                <select
                    value={t.eventId ? `event_${t.eventId}` : ''}
                    onChange={(e) => updateTaskContext(t.id, e.target.value)}
                    style={{
                        padding: '1px 4px', fontSize: '9.5px', height: '20px',
                        width: 'auto', maxWidth: '120px',
                        background: eventColor ? `${eventColor}15` : 'rgba(255,255,255,0.02)',
                        color: eventColor || 'var(--text-tertiary)',
                        border: eventColor ? `1px solid ${eventColor}25` : '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '6px', fontWeight: 600,
                        outline: 'none', cursor: 'pointer'
                    }}
                >
                    <option value="">📅 Evento...</option>
                    <optgroup label="Eventos">
                        {(events || []).map(ev => (
                            <option key={`e-${ev.id}`} value={`event_${ev.id}`}>{ev.icon || '📅'} {ev.name}</option>
                        ))}
                        <option value="create_event" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>➕ Crear...</option>
                    </optgroup>
                </select>

                {/* Assignee Selector */}
                <select
                    value={t.assignee || ''}
                    onChange={(e) => updateTaskAssignee(t.id, e.target.value)}
                    style={{
                        padding: '1px 4px', fontSize: '9.5px', height: '20px',
                        width: 'auto',
                        background: t.assignee && ASSIGNEE_CONFIG[t.assignee] ? ASSIGNEE_CONFIG[t.assignee].bg : 'rgba(255,255,255,0.02)',
                        color: t.assignee && ASSIGNEE_CONFIG[t.assignee] ? ASSIGNEE_CONFIG[t.assignee].color : 'var(--text-tertiary)',
                        border: t.assignee && ASSIGNEE_CONFIG[t.assignee] ? `1px solid ${ASSIGNEE_CONFIG[t.assignee].border.replace('0.3', '0.15')}` : '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '6px', fontWeight: t.assignee ? 600 : 400,
                        outline: 'none', cursor: 'pointer'
                    }}
                >
                    <option value="">👤 Asignado...</option>
                    <option value="GG">👤 GG</option>
                    <option value="GEN">👤 GEN</option>
                    <option value="ITA">👤 ITA</option>
                </select>

                {/* Date Picker */}
                <input 
                    type="date"
                    value={t.due || ''}
                    onChange={(e) => updateTaskDate(t.id, e.target.value)}
                    style={{
                        padding: '1px 4px', fontSize: '9.5px', height: '20px',
                        width: 'auto',
                        background: 'rgba(255,255,255,0.02)',
                        color: t.due ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '6px',
                        outline: 'none', cursor: 'pointer'
                    }}
                />

                {/* Status Selector */}
                <select
                    style={{ 
                        padding: '1px 4px', fontSize: '9.5px', height: '20px', width: 'auto', 
                        background: 'rgba(255,255,255,0.02)', 
                        color: 'var(--text-secondary)',
                        borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)',
                        outline: 'none', cursor: 'pointer'
                    }}
                    value={colStatus}
                    onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
            </div>
        </div>
    );
}

export default function EventKanbanBoard({ events, filterEventId }) {
    const { tasks, addTask, updateTask, deleteTask: contextDeleteTask, addActivity, addEvent } = useApp();
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskContext, setNewTaskContext] = useState(filterEventId ? `event_${filterEventId}` : '');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskStatus, setNewTaskStatus] = useState('pending');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');

    const updateTaskStatus = (id, newStatus) => {
        const isDone = newStatus === 'done';
        updateTask(id, { status: newStatus, done: isDone });
        const taskObj = tasks.find(t => t.id === id);
        if (taskObj) {
            addActivity(`Moved task "${taskObj.text}" to ${newStatus}`, 'var(--accent-blue)', taskObj.projectId);
        }
    };

    const updateTaskDate = (id, date) => {
        updateTask(id, { due: date });
    };

    const updateTaskAssignee = (id, assignee) => {
        updateTask(id, { assignee: assignee || null });
        const taskObj = tasks.find(t => t.id === id);
        if (taskObj) {
            addActivity(`Assigned task "${taskObj.text}" to ${assignee || 'unassigned'}`, 'var(--accent-primary)', taskObj.projectId);
        }
    };

    const updateTaskContext = (id, contextValue) => {
        if (!contextValue) {
            updateTask(id, { eventId: null, eventName: '' });
            return;
        }

        if (contextValue === 'create_event') {
            const name = window.prompt("Nombre del nuevo evento:");
            if (name) {
                const newId = `ev-${Date.now()}`;
                addEvent({ id: newId, name, status: 'planeacion', color: '#ec4899', icon: '📅' });
                updateTask(id, { eventId: newId, eventName: name });
            }
            return;
        }

        if (contextValue.startsWith('event_')) {
            const eventId = contextValue.replace('event_', '');
            const event = events.find(e => e.id === eventId);
            updateTask(id, { 
                eventId, eventName: event?.name || ''
            });
        }
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        let eventId = '', eventName = '';

        if (newTaskContext.startsWith('event_')) {
            eventId = newTaskContext.replace('event_', '');
            const event = events.find(e => e.id === eventId);
            eventName = event?.name || '';
        } else if (newTaskContext === 'create_event') {
            const name = window.prompt("Nombre del nuevo evento:");
            if (name) {
                eventId = `ev-${Date.now()}`;
                addEvent({ id: eventId, name, status: 'planeacion', color: '#ec4899', icon: '📅' });
                eventName = name;
            } else { return; }
        }

        addTask({
            id: `k-${Date.now()}`,
            text: newTaskText,
            status: newTaskStatus,
            done: newTaskStatus === 'done',
            eventId,
            eventName,
            priority: 'medium',
            due: newTaskDate,
            assignee: newTaskAssignee || null,
            createdAt: new Date().toISOString()
        });
        setNewTaskText('');
        setNewTaskDate('');
        setNewTaskStatus('pending');
        setNewTaskAssignee('');
        if (!filterEventId) {
            setNewTaskContext('');
        }
        addActivity(`Added new task to backlog: "${newTaskText}"`, 'var(--accent-primary)', 'global');
    };

    const deleteTask = (id) => {
        contextDeleteTask(id);
        addActivity(`Deleted task`, 'var(--accent-red)', 'global');
    };

    const groupedTasks = {
        'pending': [],
        'in-progress': [],
        'done': []
    };

    const filteredTasks = filterEventId 
        ? tasks.filter(t => t.eventId === filterEventId)
        : tasks;

    filteredTasks.forEach(t => {
        const mappedStatus = statusMap[t.status || (t.done ? 'done' : 'active')] || 'pending';
        if (groupedTasks[mappedStatus]) {
            groupedTasks[mappedStatus].push(t);
        }
    });

    return (
        <div className="card animate-in" style={{ marginTop: '0', marginBottom: '0', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexShrink: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>📋 Kanban (Eventos)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    Manage task tracking across events. Send tasks direct to Agents.
                </div>
            </div>

            <div className="drag-drop-context" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(300px, 1fr))', gap: '14px', paddingBottom: '8px', flex: '1 1 0%', minHeight: 0 }}>
                {Object.entries(groupedTasks).map(([colStatus, colTasks]) => (
                    <div key={colStatus} className="drag-drop-column" style={{
                        background: colStatus === 'in-progress' ? 'linear-gradient(180deg, rgba(30,30,40,0.6) 0%, rgba(20,20,30,0.8) 100%)' : 'rgba(30, 30, 40, 0.4)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '16px',
                        border: colStatus === 'in-progress' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        display: 'flex', flexDirection: 'column', gap: '16px',
                        minHeight: 0,
                        flex: '1 1 0%',
                        overflowY: 'auto'
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.border = '1px solid rgba(255,255,255,0.3)'; }}
                    onDragLeave={(e) => { e.currentTarget.style.border = colStatus === 'in-progress' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)'; }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = colStatus === 'in-progress' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)';
                        const taskId = e.dataTransfer.getData('taskId');
                        if (taskId) updateTaskStatus(taskId, colStatus);
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: '4px', padding: '0 4px'
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: statusConfig[colStatus].color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusConfig[colStatus].color }} />
                                {statusConfig[colStatus].label}
                            </div>
                            <span className="tag" style={{ background: statusConfig[colStatus].bg }}>
                                {colTasks.length}
                            </span>
                        </div>

                        {colStatus === 'pending' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input 
                                        className="form-input" 
                                        placeholder="Quick add task..." 
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                        style={{ flex: 1, background: 'var(--bg-base)', padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                                    />
                                    <button className="btn btn-primary" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleAddTask}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {/* Unified context selector for new task */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                    <select
                                        value={newTaskStatus}
                                        onChange={e => setNewTaskStatus(e.target.value)}
                                        style={{
                                            padding: '2px 6px', fontSize: '9.5px', height: '22px',
                                            background: 'rgba(255,255,255,0.02)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            borderRadius: '6px',
                                            flex: 1,
                                            minWidth: '60px',
                                            outline: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="done">Done</option>
                                    </select>
                                    <select
                                        value={newTaskAssignee}
                                        onChange={e => setNewTaskAssignee(e.target.value)}
                                        style={{
                                            padding: '2px 6px', fontSize: '9.5px', height: '22px',
                                            background: 'rgba(255,255,255,0.02)',
                                            color: newTaskAssignee ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            borderRadius: '6px',
                                            flex: 1,
                                            minWidth: '65px',
                                            fontWeight: newTaskAssignee ? 600 : 400,
                                            outline: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <option value="">👤 Asignado...</option>
                                        <option value="GG">👤 GG</option>
                                        <option value="GEN">👤 GEN</option>
                                        <option value="ITA">👤 ITA</option>
                                    </select>
                                    {!filterEventId && (
                                        <select
                                            value={newTaskContext}
                                            onChange={(e) => setNewTaskContext(e.target.value)}
                                            style={{
                                                padding: '2px 6px', fontSize: '9.5px', height: '22px',
                                                background: 'rgba(255,255,255,0.02)',
                                                color: newTaskContext ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                borderRadius: '6px',
                                                flex: 1.5,
                                                minWidth: '85px',
                                                outline: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">📅 Evento...</option>
                                            <optgroup label="Eventos">
                                                {(events || []).map(ev => (
                                                    <option key={`e-${ev.id}`} value={`event_${ev.id}`}>{ev.icon || '📅'} {ev.name}</option>
                                                ))}
                                                <option value="create_event" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>➕ Crear Evento...</option>
                                            </optgroup>
                                        </select>
                                    )}
                                    <input
                                        type="date"
                                        value={newTaskDate}
                                        onChange={(e) => setNewTaskDate(e.target.value)}
                                        style={{
                                            padding: '2px 4px', fontSize: '9.5px', height: '22px',
                                            background: 'rgba(255,255,255,0.02)',
                                            color: newTaskDate ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            borderRadius: '6px',
                                            width: 'auto',
                                            flex: filterEventId ? 1 : 'unset',
                                            minWidth: '90px',
                                            outline: 'none', cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {colTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)', fontSize: '13px', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-base)' }}>
                                Drop zone empty
                            </div>
                        )}

                        {colTasks.map(t => (
                                <KanbanCard 
                                    t={t} 
                                    colStatus={colStatus} 
                                    events={events}
                                    deleteTask={deleteTask}
                                    updateTaskStatus={updateTaskStatus}
                                    updateTaskContext={updateTaskContext}
                                    updateTaskDate={updateTaskDate}
                                    updateTaskAssignee={updateTaskAssignee}
                                />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
