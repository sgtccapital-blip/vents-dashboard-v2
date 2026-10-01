import { useState, useMemo } from 'react';
import { ChevronDown, Plus, Building2, Search, Filter, Users, MapPin, Share2, MessageCircle, Sparkles, CheckCircle2, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import WhatsAppExportModal from './WhatsAppExportModal';

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

const MONDAY_ASSIGNEE_COLORS = {
    'GG': { bg: 'rgba(129, 140, 248, 0.15)', border: '1px solid rgba(129, 140, 248, 0.3)', text: '#818cf8' },
    'JOSHUA': { bg: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', text: '#10b981' },
    'MARIO': { bg: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', text: '#38bdf8' },
    'ANDREA': { bg: 'rgba(244, 114, 182, 0.15)', border: '1px solid rgba(244, 114, 182, 0.3)', text: '#f472b6' },
    'FANNY': { bg: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
    'JEIKOB': { bg: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', text: '#c084fc' },
    'FIVVR': { bg: 'rgba(20, 184, 166, 0.15)', border: '1px solid rgba(20, 184, 166, 0.3)', text: '#2dd4bf' }
};

export default function EventTableView({ events, filterEventId }) {
    const { tasks, projects, updateTask: globalUpdateTask, addTask, addActivity, addEvent } = useApp();

    const [selectedAssignee, setSelectedAssignee] = useState('all');
    const [selectedVenue, setSelectedVenue] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});

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

    // Filter tasks based on all active criteria
    const filteredTasks = useMemo(() => {
        return (tasks || []).filter(t => {
            // Venue / Project filter
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

            // Assignee filter
            const taskAssignee = t.assignedTo || t.assignee || '';
            if (selectedAssignee !== 'all') {
                if (taskAssignee.toUpperCase() !== selectedAssignee.toUpperCase()) return false;
            }

            // Status filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'done' && !t.done && t.status !== 'done') return false;
                if (statusFilter === 'working' && t.status !== 'working' && t.status !== 'in-progress') return false;
                if (statusFilter === 'pending' && (t.done || t.status === 'done' || t.status === 'working' || t.status === 'in-progress')) return false;
            }

            // Search query filter
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
    }, [tasks, filterEventId, selectedVenue, selectedAssignee, statusFilter, searchQuery]);

    // Group tasks by project or event
    const grouped = {};
    
    // 1. Create groups for each project that has tasks
    sortedProjects.forEach(p => {
        if (selectedVenue !== 'all' && selectedVenue !== `project_${p.id}`) return;
        const projTasks = filteredTasks.filter(t => 
            t.projectId === p.id || 
            (p.id === 'proj-arrive-agency' && (t.agency === 'arrive' || t.projectId === 'proj-arrive-agency' || t.id?.startsWith('arr-')))
        );
        if (projTasks.length > 0 || selectedVenue === `project_${p.id}`) {
            grouped[`project_${p.id}`] = {
                name: p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY — Creative, Talent & Operaciones' : `🚀 ${p.name}`,
                icon: p.id === 'proj-arrive-agency' ? '🌟' : '🚀',
                color: p.id === 'proj-arrive-agency' ? '#fbbf24' : (p.color || '#3b82f6'),
                tasks: projTasks,
                isProject: true,
                projectId: p.id
            };
        }
    });

    // 2. Create groups for each event that has tasks
    (events || []).forEach(e => {
        if (selectedVenue !== 'all' && selectedVenue !== e.id) return;
        const eventTasks = filteredTasks.filter(t => t.eventId === e.id);
        if (eventTasks.length > 0 || selectedVenue === e.id) {
            grouped[e.id] = {
                name: e.name,
                icon: e.icon || '📅',
                color: e.color || '#ec4899',
                tasks: eventTasks
            };
        }
    });

    // 3. Gather unassigned tasks (no eventId and no recognized project) if not filtering for a specific venue
    if (selectedVenue === 'all') {
        const unassigned = filteredTasks.filter(t => {
            const hasEvent = t.eventId && events?.some(e => e.id === t.eventId);
            const hasProj = (t.projectId && sortedProjects?.some(p => p.id === t.projectId)) || (t.agency === 'arrive' || t.id?.startsWith('arr-'));
            return !hasEvent && !hasProj;
        });
        if (unassigned.length > 0) {
            grouped['_unassigned'] = {
                name: 'Sin Asignar (General)',
                icon: '📋',
                color: '#64748b',
                tasks: unassigned
            };
        }
    }

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
            globalUpdateTask(taskId, { eventId: null, eventName: '', projectId: null, projectName: '', project: '' });
            return;
        }

        if (contextValue === 'create_event') {
            const name = window.prompt("Nombre del nuevo evento:");
            if (name) {
                const newId = `ev-${Date.now()}`;
                addEvent({ id: newId, name, status: 'planeacion', color: '#ec4899', icon: '📅' });
                globalUpdateTask(taskId, { eventId: newId, eventName: name, projectId: null, projectName: '', project: '' });
            }
            return;
        }

        if (contextValue.startsWith('project_')) {
            const pId = contextValue.replace('project_', '');
            const proj = sortedProjects.find(p => p.id === pId);
            const pName = proj?.name || (pId === 'proj-arrive-agency' ? 'ARRIVE AGENCY' : pId);
            globalUpdateTask(taskId, { 
                projectId: pId, 
                projectName: pName,
                project: pName,
                agency: pId === 'proj-arrive-agency' ? 'arrive' : undefined,
                eventId: null,
                eventName: ''
            });
            return;
        }

        if (contextValue.startsWith('event_')) {
            const eId = contextValue.replace('event_', '');
            const ev = events?.find(e => e.id === eId);
            globalUpdateTask(taskId, { 
                eventId: eId, 
                eventName: ev?.name || '',
                projectId: null,
                projectName: '',
                project: ''
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
        let pId = null, pName = '', eId = null, eName = '';
        if (groupKey && groupKey.startsWith('project_')) {
            pId = groupKey.replace('project_', '');
            const p = sortedProjects.find(x => x.id === pId);
            pName = p?.name || (pId === 'proj-arrive-agency' ? 'ARRIVE AGENCY' : pId);
        } else if (groupKey && groupKey !== '_unassigned') {
            const ev = events?.find(e => e.id === groupKey);
            if (ev) {
                eId = ev.id;
                eName = ev.name;
            }
        }
        addTask({
            id: `k-${Date.now()}`,
            text: 'Nueva tarea...',
            status: 'pending',
            done: false,
            projectId: pId,
            projectName: pName,
            project: pName,
            agency: pId === 'proj-arrive-agency' ? 'arrive' : undefined,
            eventId: eId || '',
            eventName: eName || '',
            priority: 'medium',
            due: '',
            createdAt: new Date().toISOString()
        });
        addActivity(`Added new task to ${pName || eName || 'workspace'}`, 'var(--accent-primary)', 'global');
    };

    return (
        <div className="ws2-table-card" style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius-xl)', minHeight: '100%', overflowX: 'auto', padding: '24px', border: '1px solid var(--border-subtle)' }}>
            
            <div style={{ paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
                            Master Table — Operaciones por Evento
                        </h2>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                            Gestiona tareas, asignaciones de equipo y estados en tiempo real. Sincronizado con Kanban.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => setShowWhatsAppModal(true)}
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <MessageCircle size={16} />
                            📲 Exportar Cartelera WhatsApp
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px'
                }}>
                    {/* Search & Venue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Buscar tareas, eventos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '6px 12px 6px 30px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-canvas)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-primary)',
                                    fontSize: '12.5px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Venue selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                            <select
                                value={selectedVenue}
                                onChange={(e) => setSelectedVenue(e.target.value)}
                                style={{
                                    background: 'var(--bg-canvas)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    fontSize: '12.5px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">📍 Todos los Venues & Proyectos</option>
                                <optgroup label="🌟 Agencia & Proyectos">
                                    {sortedProjects.map(p => (
                                        <option key={`flt-tbl-p-${p.id}`} value={`project_${p.id}`}>
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
                    </div>

                    {/* Assignee Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginRight: '2px' }}>
                            RESPONSABLE:
                        </span>
                        <button
                            onClick={() => setSelectedAssignee('all')}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: selectedAssignee === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                background: selectedAssignee === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                color: selectedAssignee === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Todos
                        </button>
                        {['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'].map(name => {
                            const active = selectedAssignee.toUpperCase() === name;
                            const colors = MONDAY_ASSIGNEE_COLORS[name] || { text: '#fff' };
                            return (
                                <button
                                    key={name}
                                    onClick={() => setSelectedAssignee(active ? 'all' : name)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: active ? `1px solid ${colors.text}` : '1px solid var(--border-subtle)',
                                        background: active ? colors.bg : 'transparent',
                                        color: colors.text,
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <User size={11} />
                                    {name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                background: 'var(--bg-canvas)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">⚡ Todos los Estados</option>
                            <option value="working">En Progreso</option>
                            <option value="pending">Pendientes</option>
                            <option value="done">Completadas</option>
                        </select>

                        {(selectedAssignee !== 'all' || selectedVenue !== 'all' || statusFilter !== 'all' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setSelectedAssignee('all');
                                    setSelectedVenue('all');
                                    setStatusFilter('all');
                                    setSearchQuery('');
                                }}
                                style={{
                                    background: 'transparent',
                                    border: '1px dashed var(--border-subtle)',
                                    color: 'var(--text-tertiary)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                }}
                            >
                                Limpiar Filtros
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {Object.keys(grouped).length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                        <Filter size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '10px' }} />
                        <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>No se encontraron tareas con los filtros seleccionados</h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: 'var(--text-tertiary)' }}>Prueba seleccionando otro responsable, venue o limpiando la búsqueda.</p>
                    </div>
                ) : Object.entries(grouped).map(([groupKey, group], groupIndex) => {
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
                                        gridTemplateColumns: 'minmax(250px, 2fr) 180px 140px 140px 140px 140px',
                                        gap: '4px', paddingBottom: '8px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 600,
                                        position: 'sticky', top: 0, background: 'var(--bg-canvas)', zIndex: 10,
                                    }}>
                                        <div style={{ paddingLeft: '24px' }}>Item Name</div>
                                        <div style={{ textAlign: 'center' }}>Proyecto / Evento</div>
                                        <div style={{ textAlign: 'center' }}>Asignado</div>
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
                                        const isArriveTask = task.projectId === 'proj-arrive-agency' || task.agency === 'arrive';
                                        const taskProj = sortedProjects.find(p => p.id === task.projectId);
                                        const cellColor = isArriveTask ? '#fbbf24' : (taskProj ? taskProj.color || '#3b82f6' : (taskEvent ? taskEvent.color : 'var(--text-tertiary)'));
                                        const currentVal = task.projectId ? `project_${task.projectId}` : (task.agency === 'arrive' ? 'project_proj-arrive-agency' : (task.eventId ? `event_${task.eventId}` : ''));

                                        return (
                                            <div key={task.id} style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'minmax(250px, 2fr) 180px 140px 140px 140px 140px', 
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

                                                {/* PROYECTO / EVENTO */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border-subtle)', padding: '4px' }}>
                                                    <select 
                                                        value={currentVal} 
                                                        onChange={(e) => updateTaskContextLocal(task.id, e.target.value)}
                                                        style={{ 
                                                            appearance: 'none', border: '1px solid transparent', background: 'transparent',
                                                            color: cellColor,
                                                            fontSize: '11px', textAlign: 'center', cursor: 'pointer', outline: 'none',
                                                            padding: '4px 6px', borderRadius: '4px', transition: 'all 0.2s', width: '100%',
                                                            fontWeight: 600,
                                                        }}
                                                        onMouseEnter={(e) => Object.assign(e.currentTarget.style, { border: '1px solid var(--border-subtle)', background: 'var(--bg-base)' })}
                                                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { border: '1px solid transparent', background: 'transparent' })}
                                                    >
                                                        <option value="">— Sin Asignar —</option>
                                                        <optgroup label="🌟 Agencia & Proyectos">
                                                            {sortedProjects.map(p => (
                                                                <option key={`tbl-p-${p.id}`} value={`project_${p.id}`}>
                                                                    {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `🚀 ${p.name}`}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                        <optgroup label="🎪 Eventos & Venues">
                                                            {(events || []).map(ev => <option key={`e-${ev.id}`} value={`event_${ev.id}`}>{ev.icon || '📅'} {ev.name}</option>)}
                                                            <option value="create_event" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>➕ Crear Evento...</option>
                                                        </optgroup>
                                                    </select>
                                                </div>

                                                {/* ASIGNADO (Interactive Cell) */}
                                                <div style={{ 
                                                    borderLeft: '1px solid var(--border-subtle)', 
                                                    background: task.assignee && MONDAY_ASSIGNEE_COLORS[task.assignee] ? MONDAY_ASSIGNEE_COLORS[task.assignee].bg : 'rgba(255,255,255,0.02)', 
                                                    color: task.assignee && MONDAY_ASSIGNEE_COLORS[task.assignee] ? MONDAY_ASSIGNEE_COLORS[task.assignee].text : 'var(--text-tertiary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    position: 'relative', cursor: 'pointer',
                                                    fontSize: '13px', fontWeight: 600,
                                                    borderRight: '1px solid var(--border-subtle)',
                                                    borderBottom: task.assignee && MONDAY_ASSIGNEE_COLORS[task.assignee] ? MONDAY_ASSIGNEE_COLORS[task.assignee].border : 'none',
                                                }}
                                                className="pulse-cell-interactive"
                                                >
                                                    <select 
                                                        value={task.assignee || ''} 
                                                        onChange={(e) => updateTaskLocal(task.id, 'assignee', e.target.value || null)}
                                                        style={{ 
                                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                            opacity: 0, cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="">— Sin Asignar —</option>
                                                        <option value="GG">👤 GG</option>
                                                        <option value="JOSHUA">👤 JOSHUA</option>
                                                        <option value="MARIO">👤 MARIO</option>
                                                        <option value="ANDREA">👤 ANDREA</option>
                                                        <option value="FANNY">👤 FANNY</option>
                                                        <option value="JEIKOB">👤 JEIKOB</option>
                                                        <option value="FIVVR">👤 FIVVR</option>
                                                    </select>
                                                    <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                                        {task.assignee ? `👤 ${task.assignee}` : '—'}
                                                    </span>
                                                </div>

                                                {/* STATUS (Interactive Solid Block) */}
                                                <div style={{ 
                                                    borderRight: '1px solid var(--border-subtle)', 
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
                                        display: 'grid', gridTemplateColumns: 'minmax(250px, 2fr) 180px 140px 140px 140px 140px', gap: '4px',
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

            {/* WhatsApp Export Modal */}
            <WhatsAppExportModal
                events={events}
                tasks={tasks}
                isOpen={showWhatsAppModal}
                onClose={() => setShowWhatsAppModal(false)}
            />
        </div>
    );
}
