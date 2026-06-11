import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, X, Edit3, Trash2, CalendarDays, Phone, Mail, Globe, MapPin,
    User, FileText, ExternalLink, ChevronDown, ChevronUp, Search, CalendarClock,
    Instagram, Linkedin, Map, FolderOpen, Users, DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Eventos() {
    const { events, addEvent, updateEvent, deleteEvent, tasks } = useApp();
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
        name: '', type: '', description: '', status: 'upcoming',
        date: '', time: '', location: '', capacity: '', estimatedBudget: '',
        organizer: '', contactPerson: '', phone: '', email: '',
        notes: '', color: '#f43f5e', icon: '🎉', driveFolderId: '',
        agenda: [], requirements: []
    };

    const [form, setForm] = useState(emptyForm);

    const filteredEvents = (events || []).filter(e => {
        if (!e) return false;
        const q = (searchQuery || '').toLowerCase();
        const n = (e.name || '').toLowerCase();
        const t = (e.type || '').toLowerCase();
        return n.includes(q) || t.includes(q);
    });

    const upcomingCount = (events || []).filter(e => ['upcoming', 'planificacion', 'planeacion'].includes(e.status)).length;
    const types = [...new Set((events || []).map(e => e.type).filter(Boolean))];

    const openModal = (eventItem = null) => {
        if (eventItem) {
            setEditingEvent(eventItem);
            setForm({ 
                ...emptyForm, 
                ...eventItem, 
                agenda: eventItem.agenda ? JSON.parse(JSON.stringify(eventItem.agenda)) : [],
                requirements: eventItem.requirements ? JSON.parse(JSON.stringify(eventItem.requirements)) : []
            });
        } else {
            setEditingEvent(null);
            setForm({ ...emptyForm, agenda: [], requirements: [] });
        }
        setShowModal(true);
    };

    const saveEvent = () => {
        if (!form.name.trim()) return;
        const syncedForm = { ...form, budget: form.estimatedBudget || form.budget || '', estimatedBudget: form.estimatedBudget || form.budget || '' };
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

    return (
        <div className="page-content animate-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1>🎉 Eventos</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Planificación y gestión de eventos corporativos y sociales
                    </p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={16} /> Nuevo Evento
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="empresas-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <MetricCard icon={<CalendarDays size={22} />} color="#f43f5e" label="Total Eventos" value={(events || []).length} />
                <MetricCard icon={<CalendarClock size={22} />} color="#38bdf8" label="Próximos" value={upcomingCount} />
                <MetricCard icon={<Users size={22} />} color="#a855f7" label="Tipos de Evento" value={types.length} />
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input className="form-input" placeholder="Buscar evento o tipo..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '40px', width: '100%', maxWidth: '400px' }} />
            </div>

            {/* Cards Grid */}
            <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {filteredEvents.map(eventItem => {
                    const color = eventItem.color || '#f43f5e';
                    const statusStyle = getStatusStyle(eventItem.status);
                    return (
                        <div key={eventItem.id}
                            onClick={() => navigate(`/eventos/${eventItem.id}`)}
                            style={{
                                cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '24px',
                                background: 'linear-gradient(145deg, rgba(25, 25, 40, 0.6), rgba(15, 15, 25, 0.8))',
                                backdropFilter: 'blur(20px)',
                                padding: '24px',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                            }}
                            onMouseEnter={e => { 
                                e.currentTarget.style.border = `1px solid ${color}60`; 
                                e.currentTarget.style.boxShadow = `0 20px 40px ${color}20, 0 0 0 1px ${color}40 inset`; 
                                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                            }}
                            onMouseLeave={e => { 
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.05)'; 
                                e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.2)'; 
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            }}
                        >
                            {/* Animated Background Glow */}
                            <div style={{
                                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                                width: '150%', height: '100px', background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                                opacity: 0.8, pointerEvents: 'none', filter: 'blur(30px)'
                            }} />

                            <div className="card-header" style={{ marginBottom: '16px', position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '18px',
                                        background: `linear-gradient(135deg, ${color}22, ${color}05)`, 
                                        border: `1px solid ${color}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
                                        boxShadow: `inset 0 0 20px ${color}10, 0 8px 16px rgba(0,0,0,0.2)`
                                    }}>{eventItem.icon || '📅'}</div>
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
                                {eventItem.description || "Sin descripción proporcionada."}
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
                                {eventItem.organizer && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        <User size={12} /> {eventItem.organizer}
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
                                    <p style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '8px' }}>¿Eliminar evento?</p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Esta acción no se puede deshacer.</p>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="btn btn-secondary" style={{ padding: '8px 20px', borderRadius: '12px' }} onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
                                        <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(239,68,68,0.4)' }} onClick={() => handleDelete(eventItem.id)}>Sí, eliminar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

            </div>

            {/* ===== MODAL ===== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingEvent ? 'Editar' : 'Nuevo'} Evento</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>

                            {/* ── BASIC INFO ── */}
                            <ModalSectionLabel>Información Principal</ModalSectionLabel>
                            <div className="form-group">
                                <label className="form-label">Nombre del Evento *</label>
                                <input className="form-input" placeholder="Ej: Tech Summit 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Tipo / Categoría</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="">-- Seleccionar Tipo --</option>
                                        <option value="social">Social</option>
                                        <option value="corporativo">Corporativo</option>
                                        <option value="nightclub">Nightclub / Discoteca</option>
                                        <option value="tvshow">TV Show / Programa</option>
                                        <option value="local">Local / Establecimiento</option>
                                        <option value="festival">Festival</option>
                                        <option value="virtual">Virtual</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Estado</label>
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
                                <textarea className="form-textarea" rows={2} placeholder="De qué trata el evento..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Ícono</label>
                                    <input className="form-input" style={{ textAlign: 'center', fontSize: '20px' }} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Color</label>
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
                                    <label className="form-label">Fecha</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hora</label>
                                    <input type="time" className="form-input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ubicación / Lugar</label>
                                <input className="form-input" placeholder="Centro de Convenciones Atlapa" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>

                            <ModalDivider />

                            {/* ── LOGISTICS ── */}
                            <ModalSectionLabel>Logística y Contacto</ModalSectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Asistentes Esperados / Capacidad</label>
                                    <input type="number" className="form-input" placeholder="Ej: 500" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Presupuesto Estimado</label>
                                    <input className="form-input" placeholder="$5,000" value={form.estimatedBudget} onChange={e => setForm({ ...form, estimatedBudget: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Organizador / Empresa</label>
                                    <input className="form-input" placeholder="Nombre de la empresa u organizador" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Persona de Contacto</label>
                                    <input className="form-input" placeholder="Nombre" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input className="form-input" placeholder="+507 6000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" placeholder="info@evento.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>

                            <ModalDivider />

                            {/* ── GOOGLE DRIVE ── */}
                            <ModalSectionLabel>Carpeta Compartida (Drive)</ModalSectionLabel>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FolderOpen size={13} style={{ color: '#4285f4' }} /> Enlace a la carpeta del evento
                                </label>
                                <input className="form-input" placeholder="https://drive.google.com/..." value={form.driveFolderId || ''} onChange={e => setForm({ ...form, driveFolderId: e.target.value })} />
                            </div>

                            <ModalDivider />

                            {/* ── AGENDA ── */}
                            <ModalSectionLabel>Agenda / Programa</ModalSectionLabel>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', marginTop: '-6px' }}>
                                Agrega las actividades del evento (hora, título, descripción).
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
                                        <input className="form-input" placeholder="Ubicación / Speaker (opcional)"
                                            value={ag.speaker || ''} onChange={e => updateAgendaItemField(idx, 'speaker', e.target.value)}
                                            style={{ fontSize: '11px' }} />
                                        <input className="form-input" placeholder="Breve descripción (opcional)"
                                            value={ag.description || ''} onChange={e => updateAgendaItemField(idx, 'description', e.target.value)}
                                            style={{ fontSize: '11px' }} />
                                    </div>
                                </div>
                            ))}

                            <button className="btn btn-secondary" onClick={addAgendaItem} style={{ fontSize: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Plus size={14} /> Nueva Actividad de Agenda
                            </button>

                            <ModalDivider />

                            {/* ── NOTES ── */}
                            <div className="form-group">
                                <label className="form-label">Notas Adicionales</label>
                                <textarea className="form-textarea" rows={3} placeholder="Instrucciones especiales, código de vestimenta..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveEvent}>
                                {editingEvent ? 'Guardar Cambios' : 'Crear Evento'}
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
