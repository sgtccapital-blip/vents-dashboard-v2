import { AlertCircle, Clock, Send, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { taskStatus } from '../lib/status';

// Columna del tablero para cada estado canónico (las bloqueadas esperan en Pending).
const statusMap = {
    'pending': 'pending',
    'blocked': 'pending',
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
    'JOSHUA': { bg: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' },
    'MARIO': { bg: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' },
    'ANDREA': { bg: 'rgba(244, 114, 182, 0.15)', border: '1px solid rgba(244, 114, 182, 0.3)', color: '#f472b6' },
    'FANNY': { bg: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24' },
    'JEIKOB': { bg: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc' },
    'FIVVR': { bg: 'rgba(20, 184, 166, 0.15)', border: '1px solid rgba(20, 184, 166, 0.3)', color: '#2dd4bf' }
};

function KanbanCard({ t, colStatus, events, projects, deleteTask, updateTaskStatus, updateTaskContext, updateTaskDate, updateTaskAssignee }) {
    const taskEvent = events?.find(e => e.id === t.eventId);
    const taskProject = (projects || []).find(p => p.id === t.projectId) || (t.projectId === 'proj-arrive-agency' || t.agency === 'arrive' ? { id: 'proj-arrive-agency', name: 'ARRIVE AGENCY', color: '#fbbf24' } : null);
    const leftColor = (t.projectId === 'proj-arrive-agency' || t.agency === 'arrive') ? '#fbbf24' : (taskProject?.color || taskEvent?.color || null);
    const currentContext = t.projectId ? `project_${t.projectId}` : (t.agency === 'arrive' ? 'project_proj-arrive-agency' : (t.eventId ? `event_${t.eventId}` : ''));

    return (
        <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('taskId', t.id)} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            borderLeft: leftColor ? `3px solid ${leftColor}` : '1px solid var(--border-subtle)',
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
                {/* Project or Event Context Selector */}
                <select
                    value={currentContext}
                    onChange={(e) => updateTaskContext(t.id, e.target.value)}
                    style={{
                        padding: '1px 5px', fontSize: '9.5px', height: '20px',
                        width: 'auto', maxWidth: '135px',
                        background: leftColor ? `${leftColor}18` : 'rgba(255,255,255,0.02)',
                        color: leftColor || 'var(--text-tertiary)',
                        border: leftColor ? `1px solid ${leftColor}35` : '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '6px', fontWeight: 600,
                        outline: 'none', cursor: 'pointer'
                    }}
                >
                    <option value="">🎯 Asignar...</option>
                    <optgroup label="🌟 Agencia & Proyectos">
                        {(projects || []).map(p => (
                            <option key={`card-p-${p.id}`} value={`project_${p.id}`}>
                                {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `🚀 ${p.name}`}
                            </option>
                        ))}
                    </optgroup>
                    <optgroup label="🎪 Eventos & Venues">
                        {(events || []).map(ev => (
                            <option key={`card-e-${ev.id}`} value={`event_${ev.id}`}>{ev.icon || '📅'} {ev.name}</option>
                        ))}
                        <option value="create_event" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>➕ Crear Evento...</option>
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
                    <option value="JOSHUA">👤 JOSHUA</option>
                    <option value="MARIO">👤 MARIO</option>
                    <option value="ANDREA">👤 ANDREA</option>
                    <option value="FANNY">👤 FANNY</option>
                    <option value="JEIKOB">👤 JEIKOB</option>
                    <option value="FIVVR">👤 FIVVR</option>
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
    const { tasks, projects, addTask, updateTask, deleteTask: contextDeleteTask, addActivity, addEvent } = useApp();
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskContext, setNewTaskContext] = useState(filterEventId ? `event_${filterEventId}` : '');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskStatus, setNewTaskStatus] = useState('pending');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');

    const [selectedAssignee, setSelectedAssignee] = useState('all');
    const [selectedVenue, setSelectedVenue] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Ensure ARRIVE Agency is always first among projects
    const sortedProjects = useMemo(() => {
        const list = [...(projects || [])];
        if (!list.find(p => p.id === 'proj-arrive-agency')) {
            list.unshift({
                id: 'proj-arrive-agency',
                name: 'ARRIVE AGENCY — Creative, Talent & Experiences',
                color: '#fbbf24'
            });
        }
        return list.sort((a, b) => (a.id === 'proj-arrive-agency' ? -1 : b.id === 'proj-arrive-agency' ? 1 : 0));
    }, [projects]);

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
            updateTask(id, { eventId: null, eventName: '', projectId: null, projectName: '', project: '' });
            return;
        }

        if (contextValue === 'create_event') {
            const name = window.prompt("Nombre del nuevo evento:");
            if (name) {
                const newId = `ev-${Date.now()}`;
                addEvent({ id: newId, name, status: 'planeacion', color: '#ec4899', icon: '📅' });
                updateTask(id, { eventId: newId, eventName: name, projectId: null, projectName: '', project: '' });
            }
            return;
        }

        if (contextValue.startsWith('project_')) {
            const projectId = contextValue.replace('project_', '');
            const proj = sortedProjects.find(p => p.id === projectId);
            const projName = proj?.name || (projectId === 'proj-arrive-agency' ? 'ARRIVE AGENCY' : projectId);
            updateTask(id, {
                projectId,
                projectName: projName,
                project: projName,
                agency: projectId === 'proj-arrive-agency' ? 'arrive' : undefined,
                eventId: null,
                eventName: ''
            });
            return;
        }

        if (contextValue.startsWith('event_')) {
            const eventId = contextValue.replace('event_', '');
            const event = events.find(e => e.id === eventId);
            updateTask(id, { 
                eventId, 
                eventName: event?.name || '',
                projectId: null,
                projectName: '',
                project: ''
            });
        }
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        let eventId = '', eventName = '', projectId = '', projectName = '';

        if (newTaskContext.startsWith('project_')) {
            projectId = newTaskContext.replace('project_', '');
            const proj = sortedProjects.find(p => p.id === projectId);
            projectName = proj?.name || (projectId === 'proj-arrive-agency' ? 'ARRIVE AGENCY' : projectId);
        } else if (newTaskContext.startsWith('event_')) {
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
            eventId: eventId || null,
            eventName: eventName || '',
            projectId: projectId || null,
            projectName: projectName || '',
            project: projectName || '',
            agency: projectId === 'proj-arrive-agency' ? 'arrive' : undefined,
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
        addActivity(`Added new task to backlog: "${newTaskText}"`, 'var(--accent-primary)', projectId || 'global');
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

    const filteredTasks = (tasks || []).filter(t => {
        if (filterEventId && t.eventId !== filterEventId) return false;
        if (selectedVenue !== 'all') {
            if (selectedVenue.startsWith('project_')) {
                const pId = selectedVenue.replace('project_', '');
                const isArrive = pId === 'proj-arrive-agency' && (t.agency === 'arrive' || t.projectId === 'proj-arrive-agency' || t.id?.startsWith('arr-'));
                if (t.projectId !== pId && !isArrive) return false;
            } else {
                if (t.eventId !== selectedVenue) return false;
            }
        }
        const taskAssignee = t.assignedTo || t.assignee || '';
        if (selectedAssignee !== 'all' && taskAssignee.toUpperCase() !== selectedAssignee.toUpperCase()) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchText = (t.text || t.title || '').toLowerCase().includes(q);
            const matchEvent = (t.eventName || '').toLowerCase().includes(q);
            const matchProject = (t.projectName || t.project || '').toLowerCase().includes(q);
            const matchAssignee = taskAssignee.toLowerCase().includes(q);
            if (!matchText && !matchEvent && !matchProject && !matchAssignee) return false;
        }
        return true;
    });

    filteredTasks.forEach(t => {
        const mappedStatus = statusMap[taskStatus(t)] || 'pending';
        if (groupedTasks[mappedStatus]) {
            groupedTasks[mappedStatus].push(t);
        }
    });

    return (
        <div className="card animate-in" style={{ marginTop: '0', marginBottom: '0', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0 }}>
            {/* Header & Filter Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>📋 Kanban de Operaciones, Agencia & Eventos</div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            {filteredTasks.length} de {tasks.length} tareas
                        </span>
                    </div>
                </div>

                {/* Filter Controls Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '8px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
                        <input
                            type="text"
                            placeholder="Buscar en Kanban..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'var(--bg-canvas)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                outline: 'none'
                            }}
                        />

                        <select
                            value={selectedVenue}
                            onChange={(e) => setSelectedVenue(e.target.value)}
                            style={{
                                background: 'var(--bg-canvas)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                fontSize: '11.5px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">📍 Todos los Venues & Proyectos</option>
                            <optgroup label="🌟 Agencia & Proyectos">
                                {sortedProjects.map(p => (
                                    <option key={`flt-p-${p.id}`} value={`project_${p.id}`}>
                                        {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `🚀 ${p.name}`}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="🎪 Eventos & Venues">
                                {(events || []).map(e => (
                                    <option key={e.id} value={e.id}>{e.icon || '🍸'} {e.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Assignee Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            RESPONSABLE:
                        </span>
                        <button
                            onClick={() => setSelectedAssignee('all')}
                            style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: selectedAssignee === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                background: selectedAssignee === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                color: selectedAssignee === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Todos
                        </button>
                        {['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'].map(name => {
                            const active = selectedAssignee.toUpperCase() === name;
                            const colors = ASSIGNEE_CONFIG[name] || { color: '#fff' };
                            return (
                                <button
                                    key={name}
                                    onClick={() => setSelectedAssignee(active ? 'all' : name)}
                                    style={{
                                        padding: '3px 8px',
                                        borderRadius: '5px',
                                        border: active ? `1px solid ${colors.color}` : '1px solid var(--border-subtle)',
                                        background: active ? colors.bg : 'transparent',
                                        color: colors.color,
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
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
                                        <option value="JOSHUA">👤 JOSHUA</option>
                                        <option value="MARIO">👤 MARIO</option>
                                        <option value="ANDREA">👤 ANDREA</option>
                                        <option value="FANNY">👤 FANNY</option>
                                        <option value="JEIKOB">👤 JEIKOB</option>
                                        <option value="FIVVR">👤 FIVVR</option>
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
                                            <option value="">🎯 Asignar a...</option>
                                            <optgroup label="🌟 Agencia & Proyectos">
                                                {sortedProjects.map(p => (
                                                    <option key={`new-p-${p.id}`} value={`project_${p.id}`}>
                                                        {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `🚀 ${p.name}`}
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="🎪 Eventos & Venues">
                                                {(events || []).map(ev => (
                                                    <option key={`new-e-${ev.id}`} value={`event_${ev.id}`}>{ev.icon || '📅'} {ev.name}</option>
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
                                    key={t.id}
                                    t={t} 
                                    colStatus={colStatus} 
                                    events={events}
                                    projects={sortedProjects}
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
