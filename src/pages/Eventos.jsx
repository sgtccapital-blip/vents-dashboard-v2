import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Plus, X, Edit3, Trash2, CalendarDays, MapPin, User,
    FolderOpen, Users, DollarSign, GripVertical, Search,
    CalendarClock, Sparkles, Building2, Footprints
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// --- DEFINICIÓN DE PLANTILLAS PARA LOS BOXES ---
export const EVENT_TEMPLATES = {
    eventos: {
        id: 'eventos',
        name: '🎉 Evento Estándar',
        badgeLabel: '🎉 EVENTO',
        color: '#f43f5e',
        icon: '🎉',
        type: 'eventos',
        description: 'Eventos corporativos, activaciones de marca, fiestas o conciertos generales.',
        defaultAgenda: [
            { id: 'ag-1', time: '20:00', title: 'Apertura de puertas y bienvenida', speaker: 'Staff', description: 'Recepción de invitados y registro' },
            { id: 'ag-2', time: '21:30', title: 'Acto principal / Show central', speaker: 'Artistas / DJ', description: 'Presentación principal' },
            { id: 'ag-3', time: '00:00', title: 'Cierre del evento', speaker: 'Staff', description: 'Despedida y cierre de instalaciones' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Equipo de sonido y luces profesional', done: false },
            { id: 'req-2', name: 'Permiso municipal / seguridad de alcaldía', done: false },
            { id: 'req-3', name: 'Staff de protocolo y barra', done: false }
        ]
    },
    casco_peatonal: {
        id: 'casco_peatonal',
        name: '🚶‍♂️ Casco Peatonal (Especial)',
        badgeLabel: '🚶‍♂️ CASCO PEATONAL',
        color: '#f59e0b',
        icon: '🚶‍♂️',
        type: 'casco_peatonal',
        description: 'Operación de calles peatonales en Casco Antiguo, logística urbana, cierres viales y seguridad peatonal.',
        defaultAgenda: [
            { id: 'ag-1', time: '16:00', title: 'Montaje de vallas y canalización vial', speaker: 'Logística Urbana', description: 'Colocación de conos y vallas' },
            { id: 'ag-2', time: '17:00', title: 'Cierre de acceso vehicular y peatonalización', speaker: 'Inspectores', description: 'Control de acceso y paso peatonal' },
            { id: 'ag-3', time: '22:00', title: 'Desmontaje, apertura de vía y limpieza urbana', speaker: 'Equipo Operativo', description: 'Limpieza y apertura al tráfico' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Permiso de la Autoridad de Tránsito y Alcaldía', done: false },
            { id: 'req-2', name: 'Personal de inspección y seguridad urbana', done: false },
            { id: 'req-3', name: 'Contenedores de reciclaje y barrido rápido', done: false }
        ]
    },
    '212_admin': {
        id: '212_admin',
        name: '🏢 212 (Administración del Club)',
        badgeLabel: '🏢 212 CLUB ADMIN',
        color: '#3b82f6',
        icon: '🏢',
        type: '212_admin',
        description: 'Administración, control operativo diario, inventarios y gestión interna del Club 212.',
        defaultAgenda: [
            { id: 'ag-1', time: '10:00', title: 'Auditoría de inventario y pedido de insumos', speaker: 'Administración', description: 'Verificación de stock y compras' },
            { id: 'ag-2', time: '15:00', title: 'Briefing operativo con barra y sala', speaker: 'Capitán de Meseros', description: 'Asignación de estaciones y metas' },
            { id: 'ag-3', time: '23:00', title: 'Arqueo de caja y reporte financiero', speaker: 'Gerencia', description: 'Cierre de ventas diarias y depósito' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Cuadrante de turnos del personal', done: false },
            { id: 'req-2', name: 'Reporte diario de caja e inventarios', done: false },
            { id: 'req-3', name: 'Mantenimiento preventivo de equipos del club', done: false }
        ]
    }
};

export default function Eventos() {
    const { events, addEvent, updateEvent, deleteEvent, reorderEvents } = useApp();
    const navigate = useNavigate();

    const formatEventDate = (dateStr) => {
        if (!dateStr) return 'Fecha por definir';
        try {
            const date = new Date(dateStr + 'T12:00');
            const formatted = date.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch (e) {
            return dateStr;
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const emptyForm = {
        name: '',
        templateKey: 'eventos',
        type: 'eventos',
        description: EVENT_TEMPLATES.eventos.description,
        status: 'upcoming',
        date: '', time: '', location: '', capacity: '', estimatedBudget: '',
        organizer: '', contactPerson: '', phone: '', email: '',
        notes: '', color: EVENT_TEMPLATES.eventos.color, icon: EVENT_TEMPLATES.eventos.icon, driveFolderId: '',
        agenda: EVENT_TEMPLATES.eventos.defaultAgenda,
        requirements: EVENT_TEMPLATES.eventos.defaultRequirements
    };

    const [form, setForm] = useState(emptyForm);

    const filteredEvents = (events || []).filter(e => {
        if (!e) return false;
        const q = (searchQuery || '').toLowerCase();
        const n = (e.name || '').toLowerCase();
        const t = (e.type || '').toLowerCase();
        const tmpl = (e.templateKey || '').toLowerCase();
        return n.includes(q) || t.includes(q) || tmpl.includes(q);
    });

    const upcomingCount = (events || []).filter(e => ['upcoming', 'planificacion', 'planeacion'].includes(e.status)).length;
    const types = [...new Set((events || []).map(e => e.type).filter(Boolean))];

    // --- DRAG AND DROP REORDER ---
    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const sourceIdx = result.source.index;
        const destIdx = result.destination.index;
        if (sourceIdx === destIdx) return;

        const currentList = [...filteredEvents];
        const [movedItem] = currentList.splice(sourceIdx, 1);
        currentList.splice(destIdx, 0, movedItem);

        if (searchQuery.trim()) {
            const newFullList = [...(events || [])];
            currentList.forEach((item, newPos) => {
                const origPos = newFullList.findIndex(e => e.id === item.id);
                if (origPos !== -1) {
                    const [removed] = newFullList.splice(origPos, 1);
                    newFullList.splice(newPos, 0, removed);
                }
            });
            if (reorderEvents) reorderEvents(newFullList);
        } else {
            if (reorderEvents) reorderEvents(currentList);
        }
    };

    const openModal = (eventItem = null) => {
        if (eventItem) {
            setEditingEvent(eventItem);
            const tmplKey = eventItem.templateKey || (
                eventItem.type === 'casco_peatonal' ? 'casco_peatonal' :
                eventItem.type === '212_admin' ? '212_admin' : 'eventos'
            );
            setForm({
                ...emptyForm,
                ...eventItem,
                templateKey: tmplKey,
                agenda: eventItem.agenda ? JSON.parse(JSON.stringify(eventItem.agenda)) : [],
                requirements: eventItem.requirements ? JSON.parse(JSON.stringify(eventItem.requirements)) : []
            });
        } else {
            setEditingEvent(null);
            setForm({ ...emptyForm });
        }
        setShowModal(true);
    };

    const handleTemplateChange = (newKey) => {
        const tmpl = EVENT_TEMPLATES[newKey] || EVENT_TEMPLATES.eventos;
        setForm(prev => ({
            ...prev,
            templateKey: newKey,
            type: tmpl.type,
            icon: tmpl.icon,
            color: tmpl.color,
            description: prev.description && prev.description !== emptyForm.description ? prev.description : tmpl.description,
            agenda: prev.agenda && prev.agenda.length > 0 ? prev.agenda : tmpl.defaultAgenda,
            requirements: prev.requirements && prev.requirements.length > 0 ? prev.requirements : tmpl.defaultRequirements
        }));
    };

    const saveEvent = () => {
        if (!form.name.trim()) return;
        const syncedForm = {
            ...form,
            budget: form.estimatedBudget || form.budget || '',
            estimatedBudget: form.estimatedBudget || form.budget || ''
        };
        if (editingEvent) {
            updateEvent(editingEvent.id, syncedForm);
        } else {
            const newEvent = { id: `evt-${Date.now()}`, ...syncedForm };
            addEvent(newEvent);
        }
        setShowModal(false);
    };

    const handleDelete = (id) => {
        deleteEvent(id);
        setShowDeleteConfirm(null);
    };

    // Agenda form helpers
    const addAgendaItem = () => {
        setForm(prev => ({
            ...prev,
            agenda: [...(prev.agenda || []), { id: `ag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, time: '20:00', title: '', speaker: '', description: '' }]
        }));
    };

    const updateAgendaItemField = (idx, field, value) => {
        setForm(prev => {
            const a = [...(prev.agenda || [])];
            a[idx] = { ...a[idx], [field]: value };
            return { ...prev, agenda: a };
        });
    };

    const removeAgendaItem = (idx) => {
        setForm(prev => ({
            ...prev,
            agenda: (prev.agenda || []).filter((_, i) => i !== idx)
        }));
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'upcoming':
            case 'planificacion':
            case 'planeacion':
                return { bg: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.2)', label: status === 'upcoming' ? 'Próximo' : 'Planificación' };
            case 'ongoing':
            case 'ejecucion':
            case 'activo':
                return { bg: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.2)', label: status === 'activo' ? 'Activo' : 'En Curso' };
            case 'completed':
            case 'finalizado':
                return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)', label: 'Completado' };
            case 'cancelled':
            case 'cancelado':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)', label: 'Cancelado' };
            case 'pausado':
                return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.2)', label: 'Pausado' };
            default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)', label: status || 'Sin estado' };
        }
    };

    const getTemplateBadge = (item) => {
        const key = item.templateKey || (
            item.type === 'casco_peatonal' ? 'casco_peatonal' :
            item.type === '212_admin' ? '212_admin' : 'eventos'
        );
        return EVENT_TEMPLATES[key] || EVENT_TEMPLATES.eventos;
    };

    return (
        <div className="page-content animate-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🎉 Gestión de Eventos & Boxes
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Planificación por prioridades (Arrastra y Suelta) y plantillas operativas.
                    </p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Nuevo Box de Evento
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="empresas-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <MetricCard icon={<CalendarDays size={22} />} color="#f43f5e" label="Total Boxes" value={(events || []).length} />
                <MetricCard icon={<CalendarClock size={22} />} color="#38bdf8" label="Próximos / Activos" value={upcomingCount} />
                <MetricCard icon={<Users size={22} />} color="#a855f7" label="Tipos de Plantilla" value={Object.keys(EVENT_TEMPLATES).length} />
            </div>

            {/* Search Bar & Drag Tip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input className="form-input" placeholder="Buscar box, plantilla o tipo..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
                    <GripVertical size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Arrastra los boxes para ordenar prioridades (de mayor a menor)</span>
                </div>
            </div>

            {/* Cards Grid with Drag & Drop */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="events-grid" direction="horizontal">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="grid-auto"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}
                        >
                            {filteredEvents.map((eventItem, index) => {
                                const tmpl = getTemplateBadge(eventItem);
                                const color = eventItem.color || tmpl.color;
                                const statusStyle = getStatusStyle(eventItem.status);

                                return (
                                    <Draggable key={eventItem.id} draggableId={eventItem.id} index={index}>
                                        {(draggableProvided, snapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                onClick={() => navigate(`/eventos/${eventItem.id}`)}
                                                style={{
                                                    ...draggableProvided.draggableProps.style,
                                                    cursor: 'pointer',
                                                    transition: snapshot.isDragging ? 'none' : 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                                    border: snapshot.isDragging ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.06)',
                                                    borderRadius: '24px',
                                                    background: 'linear-gradient(145deg, rgba(25, 25, 40, 0.7), rgba(15, 15, 25, 0.9))',
                                                    backdropFilter: 'blur(20px)',
                                                    padding: '24px',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    boxShadow: snapshot.isDragging ? `0 20px 50px ${color}40` : '0 10px 40px rgba(0, 0, 0, 0.25)',
                                                    transform: snapshot.isDragging ? 'scale(1.03)' : undefined
                                                }}
                                                onMouseEnter={e => {
                                                    if (!snapshot.isDragging) {
                                                        e.currentTarget.style.border = `1px solid ${color}60`;
                                                        e.currentTarget.style.boxShadow = `0 20px 40px ${color}20, 0 0 0 1px ${color}40 inset`;
                                                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (!snapshot.isDragging) {
                                                        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.06)';
                                                        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.25)';
                                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                    }
                                                }}
                                            >
                                                {/* Animated Background Glow */}
                                                <div style={{
                                                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                                                    width: '150%', height: '100px', background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                                                    opacity: 0.8, pointerEvents: 'none', filter: 'blur(30px)'
                                                }} />

                                                {/* Drag Handle & Priority Rank Badge */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', position: 'relative', zIndex: 2 }}>
                                                    <div
                                                        {...draggableProvided.dragHandleProps}
                                                        onClick={e => e.stopPropagation()}
                                                        title="Arrastrar para reordenar prioridad"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            padding: '4px 8px', borderRadius: '8px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'grab', fontSize: '11px', fontWeight: 600
                                                        }}
                                                    >
                                                        <GripVertical size={14} style={{ color: color }} />
                                                        <span>Prioridad #{index + 1}</span>
                                                    </div>

                                                    {/* Template Tag Badge */}
                                                    <span style={{
                                                        fontSize: '10.5px',
                                                        fontWeight: 700,
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        background: `${color}18`,
                                                        color: color,
                                                        border: `1px solid ${color}35`,
                                                        letterSpacing: '0.5px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {tmpl.badgeLabel}
                                                    </span>
                                                </div>

                                                <div className="card-header" style={{ marginBottom: '16px', position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{
                                                            width: '52px', height: '52px', borderRadius: '16px',
                                                            background: `linear-gradient(135deg, ${color}22, ${color}05)`,
                                                            border: `1px solid ${color}40`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                                                            boxShadow: `inset 0 0 20px ${color}10, 0 8px 16px rgba(0,0,0,0.2)`
                                                        }}>{eventItem.icon || tmpl.icon}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px', marginBottom: '4px' }}>{eventItem.name}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px' }}>
                                                        <button className="btn-icon" style={{ padding: '6px', borderRadius: '8px' }} onClick={e => { e.stopPropagation(); openModal(eventItem); }}><Edit3 size={14} /></button>
                                                        <button className="btn-icon" style={{ padding: '6px', borderRadius: '8px' }} onClick={e => { e.stopPropagation(); setShowDeleteConfirm(eventItem.id); }}><Trash2 size={14} /></button>
                                                    </div>
                                                </div>

                                                <p style={{
                                                    fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6',
                                                    marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical', overflow: 'hidden', position: 'relative', zIndex: 1
                                                }}>
                                                    {eventItem.description || tmpl.description}
                                                </p>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                                                    {(eventItem.date || eventItem.time) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            <CalendarDays size={12} /> {formatEventDate(eventItem.date)}{eventItem.time ? ` · ${eventItem.time}` : ''}
                                                        </div>
                                                    )}
                                                    {eventItem.location && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            <MapPin size={12} /> {eventItem.location}
                                                        </div>
                                                    )}
                                                    {eventItem.capacity && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            <Users size={12} /> Capacidad: {eventItem.capacity} {!isNaN(eventItem.capacity) ? 'personas' : ''}
                                                        </div>
                                                    )}
                                                    {(eventItem.budget || eventItem.estimatedBudget) && parseFloat(eventItem.budget || eventItem.estimatedBudget) > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            <DollarSign size={12} /> ${parseFloat(eventItem.budget || eventItem.estimatedBudget).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', position: 'relative', zIndex: 1
                                                }}>
                                                    <span style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                                                        borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                        background: statusStyle.bg,
                                                        color: statusStyle.color,
                                                        border: `1px solid ${statusStyle.border}`
                                                    }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }} />
                                                        {statusStyle.label}
                                                    </span>

                                                    {eventItem.type && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                                                            {eventItem.type}
                                                        </span>
                                                    )}
                                                </div>

                                                {showDeleteConfirm === eventItem.id && (
                                                    <div style={{
                                                        position: 'absolute', inset: 0, background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(8px)',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                                                        borderRadius: '24px', animation: 'fadeIn 0.2s ease'
                                                    }} onClick={e => e.stopPropagation()}>
                                                        <Trash2 size={32} style={{ color: '#ef4444', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }} />
                                                        <p style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '8px' }}>¿Eliminar box?</p>
                                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Esta acción no se puede deshacer.</p>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            <button className="btn btn-secondary" style={{ padding: '8px 20px', borderRadius: '12px' }} onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
                                                            <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(239,68,68,0.4)' }} onClick={() => handleDelete(eventItem.id)}>Sí, eliminar</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* ===== MODAL CREAR / EDITAR BOX CON PLANTILLA ===== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingEvent ? 'Editar' : 'Nuevo'} Box de Evento</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                            {/* ── SELECTOR DE PLANTILLA DE BOX ── */}
                            <ModalSectionLabel>Plantilla de Box / Categoría Base</ModalSectionLabel>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label">Seleccionar Plantilla Preconfigurada</label>
                                <select
                                    className="form-select"
                                    value={form.templateKey || 'eventos'}
                                    onChange={e => handleTemplateChange(e.target.value)}
                                    style={{
                                        background: 'rgba(124, 92, 252, 0.1)',
                                        borderColor: 'var(--accent-primary)',
                                        color: '#fff',
                                        fontWeight: '600'
                                    }}
                                >
                                    <option value="eventos">🎉 Evento Estándar (Corporativo / Fiesta / Concierto)</option>
                                    <option value="casco_peatonal">🚶‍♂️ Casco Peatonal (Logística de Vías & Seguridad Peatonal)</option>
                                    <option value="212_admin">🏢 212 (Administración del Club / Inventario & Caja)</option>
                                </select>
                            </div>

                            <ModalDivider />

                            {/* ── BASIC INFO ── */}
                            <ModalSectionLabel>Información Principal del Box</ModalSectionLabel>
                            <div className="form-group">
                                <label className="form-label">Nombre del Box / Evento *</label>
                                <input className="form-input" placeholder="Ej: Casco Peatonal - Fin de Semana" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Tipo Específico</label>
                                    <input className="form-input" placeholder="Ej: casco_peatonal, social, 212_admin" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Estado Operativo</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="planificacion">En Planificación</option>
                                        <option value="ejecucion">En Ejecución</option>
                                        <option value="activo">Activo</option>
                                        <option value="upcoming">Próximo</option>
                                        <option value="ongoing">En Curso</option>
                                        <option value="completed">Completado</option>
                                        <option value="finalizado">Finalizado</option>
                                        <option value="pausado">Pausado</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descripción</label>
                                <textarea className="form-textarea" rows={2} placeholder="Objetivo operativo de este box..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Ícono</label>
                                    <input className="form-input" style={{ textAlign: 'center', fontSize: '20px' }} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Color de Distintivo</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                                        <input className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                </div>
                            </div>

                            <ModalDivider />

                            {/* ── DATE, TIME, LOCATION ── */}
                            <ModalSectionLabel>Cuándo y Dónde</ModalSectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Fecha Principal</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hora de Inicio</label>
                                    <input type="time" className="form-input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ubicación / Área</label>
                                <input className="form-input" placeholder="Ej: Casco Antiguo, Calle 3ra / Club 212" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>

                            <ModalDivider />

                            {/* ── LOGISTICS ── */}
                            <ModalSectionLabel>Logística y Presupuesto</ModalSectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Aforo / Capacidad</label>
                                    <input type="number" className="form-input" placeholder="Ej: 500" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Presupuesto Estimado ($)</label>
                                    <input className="form-input" placeholder="5000" value={form.estimatedBudget} onChange={e => setForm({ ...form, estimatedBudget: e.target.value })} />
                                </div>
                            </div>

                            <ModalDivider />

                            {/* ── GOOGLE DRIVE ── */}
                            <ModalSectionLabel>Carpeta de Documentos / Drive</ModalSectionLabel>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FolderOpen size={13} style={{ color: '#4285f4' }} /> Enlace a carpeta de archivos
                                </label>
                                <input className="form-input" placeholder="https://drive.google.com/..." value={form.driveFolderId || ''} onChange={e => setForm({ ...form, driveFolderId: e.target.value })} />
                            </div>

                            <ModalDivider />

                            {/* ── AGENDA DE PLANTILLA ── */}
                            <ModalSectionLabel>Agenda Preconfigurada</ModalSectionLabel>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', marginTop: '-6px' }}>
                                La plantilla seleccionada ha cargado las siguientes actividades iniciales:
                            </p>

                            {(form.agenda || []).map((ag, idx) => (
                                <div key={ag.id || idx} style={{
                                    padding: '14px', borderRadius: '12px', marginBottom: '12px',
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                                }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input type="time" className="form-input" style={{ width: '90px', fontSize: '12px' }}
                                            value={ag.time || ''} onChange={e => updateAgendaItemField(idx, 'time', e.target.value)} />
                                        <input className="form-input" placeholder="Título de la Actividad"
                                            value={ag.title || ''} onChange={e => updateAgendaItemField(idx, 'title', e.target.value)}
                                            style={{ flex: 1, fontSize: '12px', fontWeight: '600' }} />
                                        <button className="btn-icon" onClick={() => removeAgendaItem(idx)} title="Eliminar actividad">
                                            <Trash2 size={14} style={{ color: 'var(--accent-red, #ef4444)' }} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <input className="form-input" placeholder="Responsable / Ubicación"
                                            value={ag.speaker || ''} onChange={e => updateAgendaItemField(idx, 'speaker', e.target.value)}
                                            style={{ fontSize: '11px' }} />
                                        <input className="form-input" placeholder="Detalle adicional"
                                            value={ag.description || ''} onChange={e => updateAgendaItemField(idx, 'description', e.target.value)}
                                            style={{ fontSize: '11px' }} />
                                    </div>
                                </div>
                            ))}

                            <button className="btn btn-secondary" onClick={addAgendaItem} style={{ fontSize: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Plus size={14} /> Nueva Actividad
                            </button>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveEvent}>
                                {editingEvent ? 'Guardar Cambios' : 'Crear Box con Plantilla'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Helper Components ── */

function MetricCard({ icon, color, label, value }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '20px', padding: '24px',
            background: `linear-gradient(135deg, rgba(22, 22, 35, 0.8), rgba(20, 20, 30, 0.9))`,
            border: `1px solid ${color}30`,
            borderRadius: '20px',
            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`,
            backdropFilter: 'blur(12px)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
                background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, filter: 'blur(20px)', opacity: 0.6
            }} />
            <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `inset 0 2px 10px ${color}20`
            }}>
                <span style={{ color, filter: `drop-shadow(0 0 8px ${color}80)` }}>{icon}</span>
            </div>
            <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
            </div>
        </div>
    );
}

function ModalSectionLabel({ children }) {
    return <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</div>;
}

function ModalDivider() {
    return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '20px 0' }} />;
}
