import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit3, Calendar, MapPin, Clock, Users, DollarSign,
    FileText, CheckSquare, ListTodo, MoreHorizontal, Copy,
    CalendarDays, Target, Briefcase, Plus, X, Trash2, Map,
    User, Mic, Package, StickyNote, ChevronRight, Save, TrendingUp,
    Share2, MessageSquare, ExternalLink, Instagram, Sparkles, Star, Phone, MessageCircle,
    FolderOpen, Mail, Globe
} from 'lucide-react';
import LeadsFunnel from '../components/events/LeadsFunnel';
import PromoterTracking from '../components/events/PromoterTracking';
import OperativeChecklist from '../components/events/OperativeChecklist';
import ContentCalendarGrid from '../components/ContentCalendarGrid';
import MasterChecklist from '../components/events/MasterChecklist';
import EventKanbanBoard from '../components/EventKanbanBoard';
import EventTableView from '../components/EventTableView';
import EventAnalytics from '../components/EventAnalytics';
import EventCanvas from '../components/EventCanvas';
import { useApp } from '../context/AppContext';

export default function EventoDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { events, updateEvent, tasks, updateTask, promoters, imageGirls, socialMedia } = useApp();
    const event = events.find(e => e.id === id);

    const [activeTab, setActiveTab] = useState(event?.type === 'nightclub' ? 'inicio' : 'perfil');
    const [showModal, setShowModal] = useState(false);
    const [selectedInstanceId, setSelectedInstanceId] = useState(null);
    const [contentSubTab, setContentSubTab] = useState('all');
    
    // Tareas
    const [taskViewMode, setTaskViewMode] = useState('kanban'); // 'kanban' or 'table'

    // Agenda & Requerimientos
    const [editingAgenda, setEditingAgenda] = useState(null);
    const [editingReq, setEditingReq] = useState(null);
    const [selectedMapLocation, setSelectedMapLocation] = useState(null);
    const [viewingActivity, setViewingActivity] = useState(null);
    const [editingArt, setEditingArt] = useState(null);

    const emptyForm = {
        name: '', date: '', time: '', location: '', capacity: '',
        budget: '', estimatedBudget: '', type: 'corporativo', status: 'planificacion',
        description: '', color: '#8b5cf6', icon: '📅',
        organizer: '', contactPerson: '', phone: '', email: '',
        notes: '', driveFolderId: '',
    };
    const [form, setForm] = useState(emptyForm);

    if (!event) {
        return (
            <div className="page-content animate-in">
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                    <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Evento no encontrado</h2>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginBottom: '20px' }}>El evento que buscas no existe o fue eliminado.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/eventos')}>
                        <ArrowLeft size={14} /> Volver a Eventos
                    </button>
                </div>
            </div>
        );
    }

    const color = event.color || '#8b5cf6';

    const openEditModal = () => {
        setForm({ ...emptyForm, ...event });
        setShowModal(true);
    };

    const saveEvent = () => {
        if (!form.name.trim()) return;
        updateEvent(event.id, form);
        setShowModal(false);
    };

    // === Nightclub Methods ===
    const getActiveInstance = () => {
        if (!event?.instances) return null;
        if (selectedInstanceId) return event.instances.find(i => i.id === selectedInstanceId);
        return event.instances[0]; // Default to first
    };
    
    const updateInstance = (instanceId, updatedData) => {
        const updatedInstances = event.instances.map(inst => 
            inst.id === instanceId ? { ...inst, ...updatedData } : inst
        );
        updateEvent(event.id, { instances: updatedInstances });
    };

    const updateLeadStatus = (instanceId, leadId, newStatus) => {
        const instance = event.instances.find(i => i.id === instanceId);
        if (!instance) return;
        const updatedLeads = instance.leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
        updateInstance(instanceId, { leads: updatedLeads });
    };

    const addLead = (instanceId) => {
        const name = prompt("Nombre del invitado:");
        if (!name) return;
        const phone = prompt("Teléfono:") || '';
        const promoter = prompt("Promotor:") || '';
        const interest = prompt("Interés (Ej: Ticket general):") || 'General';
        
        const instance = event.instances.find(i => i.id === instanceId);
        if (!instance) return;
        const newLead = { id: `lead-${Date.now()}`, name, phone, promoter, interest, status: 'Contactado' };
        updateInstance(instanceId, { leads: [...(instance.leads || []), newLead] });
    };

    const addGirl = (instanceId) => {
        const name = prompt("Nombre de la modelo/chica:");
        if (!name) return;
        const phone = prompt("Teléfono:") || '';
        const role = prompt("Rol (Ej: Hostess, VIP, Promo):") || 'Hostess';
        const time = prompt("Hora Citada (Ej: 10:00 PM):") || '10:00 PM';
        
        const instance = event.instances.find(i => i.id === instanceId);
        if (!instance) return;
        const newGirl = { id: `ag-${Date.now()}`, name, phone, role, time }; 
        updateInstance(instanceId, { assignedGirls: [...(instance.assignedGirls || []), newGirl] });
    };

    const updateChecklistItem = (instanceId, category, itemId, completed) => {
        const instance = event.instances.find(i => i.id === instanceId);
        if (!instance) return;
        // Map category 'Promo' back to 'promo', etc. since we used capitalized ones in component
        const categoryMap = { 'Promo': 'promo', 'Logística': 'logistica', 'Imagen': 'imagen' };
        const key = categoryMap[category] || category.toLowerCase();
        
        const catItems = instance.checklist[key] || [];
        const updatedItems = catItems.map(item => item.id === itemId ? { ...item, done: completed } : item);
        const updatedChecklist = { ...instance.checklist, [key]: updatedItems };
        updateInstance(instanceId, { checklist: updatedChecklist });
    };

    // === Tareas del Evento ===
    // Removed old local eventTodos implementation. EventKanbanBoard and EventTableView now handle this.


    // === Agenda ===
    const agenda = event.agenda || [];
    const openAgendaEdit = (item = null) => {
        if (item) setEditingAgenda({ ...item });
        else setEditingAgenda({ id: `ag-${Date.now()}`, time: '', title: '', speaker: '', description: '' });
    };
    const closeAgendaEdit = () => setEditingAgenda(null);
    const saveAgenda = () => {
        if (!editingAgenda.title.trim()) return;
        const updated = agenda.find(a => a.id === editingAgenda.id)
            ? agenda.map(a => a.id === editingAgenda.id ? editingAgenda : a)
            : [...agenda, editingAgenda];
        // Sort by time
        updated.sort((a, b) => a.time.localeCompare(b.time));
        updateEvent(event.id, { agenda: updated });
        closeAgendaEdit();
    };
    const deleteAgenda = (id) => {
        updateEvent(event.id, { agenda: agenda.filter(a => a.id !== id) });
    };

    // === Activity Organization ===
    const openActivityOrg = (item) => {
        setViewingActivity({
            ...item,
            responsible: item.responsible || '',
            responsiblePhone: item.responsiblePhone || '',
            infrastructure: item.infrastructure || [],
            artists: item.artists || [],
            orgNotes: item.orgNotes || '',
            orgStatus: item.orgStatus || 'pendiente',
        });
    };
    const saveActivityOrg = () => {
        const updated = agenda.map(a => a.id === viewingActivity.id ? { ...a, ...viewingActivity } : a);
        updateEvent(event.id, { agenda: updated });
        setViewingActivity(null);
    };
    const addInfraItem = () => {
        setViewingActivity(prev => ({
            ...prev,
            infrastructure: [...(prev.infrastructure || []), { id: `inf-${Date.now()}`, name: '', quantity: 1, status: 'pendiente' }]
        }));
    };
    const updateInfraItem = (idx, field, value) => {
        setViewingActivity(prev => {
            const infra = [...(prev.infrastructure || [])];
            infra[idx] = { ...infra[idx], [field]: value };
            return { ...prev, infrastructure: infra };
        });
    };
    const removeInfraItem = (idx) => {
        setViewingActivity(prev => ({
            ...prev,
            infrastructure: (prev.infrastructure || []).filter((_, i) => i !== idx)
        }));
    };
    const addArtistItem = () => {
        setViewingActivity(prev => ({
            ...prev,
            artists: [...(prev.artists || []), { id: `art-${Date.now()}`, name: '', role: '', confirmed: false }]
        }));
    };
    const updateArtistItem = (idx, field, value) => {
        setViewingActivity(prev => {
            const arts = [...(prev.artists || [])];
            arts[idx] = { ...arts[idx], [field]: value };
            return { ...prev, artists: arts };
        });
    };
    const removeArtistItem = (idx) => {
        setViewingActivity(prev => ({
            ...prev,
            artists: (prev.artists || []).filter((_, i) => i !== idx)
        }));
    };

    // === Requerimientos Logisticos ===
    const requirements = event.requirements || [];
    const openReqEdit = (item = null) => {
        if (item) setEditingReq({ ...item });
        else setEditingReq({ id: `req-${Date.now()}`, category: 'General', name: '', quantity: 1, cost: 0, provider: '', status: 'pendiente' });
    };
    const closeReqEdit = () => setEditingReq(null);
    const saveReq = () => {
        if (!editingReq.name.trim()) return;
        const updated = requirements.find(r => r.id === editingReq.id)
            ? requirements.map(r => r.id === editingReq.id ? editingReq : r)
            : [...requirements, editingReq];
        updateEvent(event.id, { requirements: updated });
        closeReqEdit();
    };
    const deleteReq = (id) => {
        updateEvent(event.id, { requirements: requirements.filter(r => r.id !== id) });
    };
    const totalReqCost = requirements.reduce((acc, r) => acc + (parseFloat(r.cost) || 0) * (parseFloat(r.quantity) || 1), 0);

    // === Artes y Material Visual ===
    const closeArtEdit = () => setEditingArt(null);
    const saveArt = () => {
        if (!editingArt.title.trim()) return;
        const currentArtes = event.artes || [];
        
        let updatedArt = { ...editingArt };
        if (updatedArt.type === 'Story' || updatedArt.type === 'Reel') {
            updatedArt.format = '1080x1920';
        } else {
            updatedArt.format = '1080x1080';
        }

        const updated = currentArtes.find(a => a.id === editingArt.id)
            ? currentArtes.map(a => a.id === editingArt.id ? updatedArt : a)
            : [...currentArtes, updatedArt];
        updateEvent(event.id, { artes: updated });
        closeArtEdit();
    };
    const deleteArt = (id) => {
        const currentArtes = event.artes || [];
        updateEvent(event.id, { artes: currentArtes.filter(a => a.id !== id) });
        closeArtEdit();
    };

    // Map logic
    const getCoordinates = (name) => {
        const mapCoordinates = {
            'Plaza V Centenario': { top: '26%', left: '32%' },
            'Playa Prieta': { top: '24%', left: '43%' },
            'Casco Viejo': { top: '38%', left: '35%' },
            'Plaza Simón Bolívar': { top: '41%', left: '57%' },
            'Plaza De La Independencia': { top: '50%', left: '41%' },
            'Plaza Catedral': { top: '50%', left: '41%' }, // alias
            'La Fishería Seafood': { top: '47%', left: '27%' },
            'Plaza Herrera': { top: '59%', left: '29%' },
            'Arco Chato': { top: '63%', left: '58%' },
            'Playa Malecón': { top: '50%', left: '67%' },
            'Fuente Casco Antiguo': { top: '58%', left: '66%' },
            'Playa Santo Domingo': { top: '73%', left: '58%' },
            'Playa Punta Chiriquí': { top: '66%', left: '73%' },
            'Plaza de Francia': { top: '84%', left: '69%' },
            'Viewpoint on Cinta Costera': { top: '30%', left: '92%' },
            'Cinta Costera 3': { top: '59%', left: '98%' },
            // Keep aliases and existing ones as fallback
            'Plaza Bolívar': { top: '41%', left: '57%' },
            'Compañía de Jesús': { top: '60%', left: '45%' },
            'Mercado San Felipe Neri': { top: '20%', left: '20%' },
            'Playita Las Garzas': { top: '15%', left: '80%' },
            'Calle de la Mola': { top: '50%', left: '85%' },
        };
        if (mapCoordinates[name]) return mapCoordinates[name];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const top = 20 + (Math.abs(hash) % 60);
        const left = 20 + (Math.abs(hash * 3) % 60);
        return { top: `${top}%`, left: `${left}%` };
    };

    const uniqueLocations = agenda.reduce((acc, item) => {
        if (!item.speaker) return acc;
        const existing = acc.find(l => l.name === item.speaker);
        if (existing) {
            existing.items.push(item);
        } else {
            acc.push({ name: item.speaker, items: [item] });
        }
        return acc;
    }, []).map((loc, i) => {
        const palette = [
            '#ef4444', // red
            '#3b82f6', // blue
            '#f59e0b', // amber
            '#8b5cf6', // violet
            '#10b981', // emerald
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#f97316', // orange
            '#84cc16', // lime
        ];
        return { ...loc, color: palette[i % palette.length] };
    });
    const tabs = event.type === 'nightclub' ? [
        { id: 'inicio', label: 'Inicio', icon: CalendarDays },
        { id: 'invitados', label: 'Invitados', icon: Users },
        { id: 'chicas', label: 'Modelos / Chicas', icon: Star },
        { id: 'organizacion', label: 'Organización', icon: Briefcase },
        { id: 'tareas', label: 'Tareas', icon: ListTodo },
        { id: 'redes', label: 'Redes & Contenido', icon: Share2 },
        { id: 'masterplan', label: 'Master Plan', icon: Target },
        { id: 'spam', label: 'Mensajes SPAM', icon: MessageSquare },
    ] : [
        { id: 'perfil', label: 'Resumen', icon: FileText },
        { id: 'agenda', label: 'Agenda del Día', icon: Clock },
        { id: 'logistica', label: 'Logística & Req.', icon: Briefcase },
        { id: 'tareas', label: 'Tareas', icon: ListTodo },
        { id: 'redes', label: 'Redes & Contenido', icon: Share2 },
        { id: 'masterplan', label: 'Master Plan', icon: Target },
    ];

    return (
        <div className="page-content animate-in">
            {/* Back Button */}
            <div className="detail-back" onClick={() => navigate('/eventos')} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <ArrowLeft size={16} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Volver a Eventos</span>
            </div>

            {/* ═══ HERO HEADER ═══ */}
            <div style={{
                padding: '32px', borderRadius: '16px', marginBottom: '28px', position: 'relative',
                background: `linear-gradient(135deg, ${color}18, ${color}06)`,
                border: `1px solid ${color}25`,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '22px', flexShrink: 0,
                        background: `${color}20`, border: `2px solid ${color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px',
                    }}>{event.icon}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>{event.name}</h1>
                            <span className={`tag tag-${event.status === 'planificacion' || event.status === 'upcoming' ? 'pending' : event.status === 'ejecucion' || event.status === 'ongoing' || event.status === 'activo' ? 'active' : event.status === 'finalizado' || event.status === 'completed' ? 'done' : 'paused'}`}>
                                {event.status === 'planificacion' ? 'En Planificación' : event.status === 'upcoming' ? 'Próximo' : event.status === 'ejecucion' ? 'En Ejecución' : event.status === 'ongoing' ? 'En Curso' : event.status === 'activo' ? 'Activo' : event.status === 'finalizado' || event.status === 'completed' ? 'Finalizado' : event.status === 'pausado' ? 'Pausado' : event.status === 'cancelado' || event.status === 'cancelled' ? 'Cancelado' : event.status}
                            </span>
                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }}>
                                {event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Sin tipo'}
                            </span>
                        </div>

                        {/* Info Row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '14px' }}>
                            {event.date && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <CalendarDays size={14} style={{ color }} /> {new Date(event.date + 'T12:00').toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            )}
                            {event.time && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <Clock size={14} style={{ color }} /> {event.time}
                                </div>
                            )}
                            {event.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <MapPin size={14} style={{ color }} /> {event.location}
                                </div>
                            )}
                            {(event.capacity) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <Users size={14} style={{ color }} /> {event.capacity} {!isNaN(event.capacity) ? 'personas' : ''}
                                </div>
                            )}
                            {(event.budget || event.estimatedBudget) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <DollarSign size={14} style={{ color }} /> ${parseFloat(event.budget || event.estimatedBudget || 0).toLocaleString()}
                                </div>
                            )}
                        </div>

                        {/* Contact Row */}
                        {(event.organizer || event.contactPerson || event.phone || event.email) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${color}15` }}>
                                {event.organizer && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        <Briefcase size={12} /> {event.organizer}
                                    </div>
                                )}
                                {event.contactPerson && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        <User size={12} /> {event.contactPerson}
                                    </div>
                                )}
                                {event.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        <Phone size={12} /> {event.phone}
                                    </div>
                                )}
                                {event.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        <Mail size={12} /> {event.email}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ position: 'absolute', top: '32px', right: '32px', display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={openEditModal}>
                                <Edit3 size={13} /> Editar Evento
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ TAB NAVIGATION ═══ */}
            <div style={{
                display: 'flex', background: 'var(--bg-surface)', padding: '4px',
                borderRadius: 'var(--radius-md)', marginBottom: '28px', width: 'fit-content',
                border: '1px solid var(--border-subtle)',
            }}>
                {tabs.map(tab => (
                    <button key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ TAB CONTENT ═══ */}
            
            {/* NIGHTCLUB: INSTANCE SELECTOR (for Inicio, Invitados, Chicas) */}
            {event.type === 'nightclub' && ['inicio', 'invitados', 'chicas'].includes(activeTab) && (
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
                    {event.instances?.map(inst => (
                        <button
                            key={inst.id}
                            onClick={() => setSelectedInstanceId(inst.id)}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '12px',
                                background: selectedInstanceId === inst.id || (!selectedInstanceId && event.instances[0].id === inst.id) ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                color: selectedInstanceId === inst.id || (!selectedInstanceId && event.instances[0].id === inst.id) ? '#fff' : 'var(--text-primary)',
                                border: `1px solid ${selectedInstanceId === inst.id || (!selectedInstanceId && event.instances[0].id === inst.id) ? 'transparent' : 'var(--border-color)'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '4px',
                                minWidth: '150px',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ fontSize: '12px', opacity: 0.8 }}>{inst.day}</span>
                            <span style={{ fontWeight: '600', fontSize: '15px' }}>{inst.date}</span>
                            <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginTop: '4px' }}>{inst.status}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* NIGHTCLUB: INICIO */}
            {event.type === 'nightclub' && activeTab === 'inicio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {(() => {
                        const activeInstance = getActiveInstance();
                        if (!activeInstance) return <div>No hay fechas creadas</div>;

                        // Normalize checklist field names for OperativeChecklist component
                        const normalizedChecklist = {};
                        if (activeInstance.checklist) {
                            Object.keys(activeInstance.checklist).forEach(cat => {
                                const newCat = cat === 'promo' ? 'Promo' : cat === 'logistica' ? 'Logística' : cat === 'imagen' ? 'Imagen' : cat;
                                normalizedChecklist[newCat] = activeInstance.checklist[cat].map(i => ({...i, completed: i.done}));
                            });
                        }

                        return (
                            <div className="grid-2" style={{ alignItems: 'start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <LeadsFunnel 
                                        leads={activeInstance.leads} 
                                        updateLeadStatus={(leadId, status) => updateLeadStatus(activeInstance.id, leadId, status)} 
                                        onManageLeads={() => setActiveTab('invitados')}
                                        onManageGirls={() => setActiveTab('chicas')}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <PromoterTracking 
                                        promoters={promoters}
                                        leads={activeInstance.leads}
                                        assignedPromoterIds={activeInstance.assignedPromoters || []}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* NIGHTCLUB: INVITADOS */}
            {event.type === 'nightclub' && activeTab === 'invitados' && (() => {
                const activeInstance = getActiveInstance();
                if (!activeInstance) return <div>No hay fechas creadas</div>;
                
                const leads = activeInstance.leads || [];
                const statuses = ['Contactado', 'Respondió', 'Confirmado', 'No llegó', 'Llegó'];

                // Top Promoter calculation
                const promoterCounts = {};
                leads.forEach(l => {
                    if (l.promoter) {
                        promoterCounts[l.promoter] = (promoterCounts[l.promoter] || 0) + 1;
                    }
                });
                const topPromoter = Object.keys(promoterCounts).sort((a, b) => promoterCounts[b] - promoterCounts[a])[0];

                return (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', margin: 0 }}>Lista de Invitados</h3>
                            <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => addLead(activeInstance.id)}>
                                <Plus size={14} /> Agregar
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Nombre</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Contacto</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Promotor</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Interés</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay leads registrados aún</td>
                                        </tr>
                                    ) : leads.map(lead => (
                                        <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px 8px' }}>{lead.name}</td>
                                            <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {lead.phone.includes('@') ? <MessageCircle size={14} /> : <Phone size={14} />}
                                                    {lead.phone}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', 
                                                    background: lead.promoter === topPromoter ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)', 
                                                    color: lead.promoter === topPromoter ? '#fbbf24' : 'var(--text-secondary)',
                                                    borderRadius: '12px', 
                                                    fontSize: '12px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontWeight: lead.promoter === topPromoter ? '600' : '400'
                                                }}>
                                                    {lead.promoter === topPromoter && <Star size={10} fill="currentColor" />}
                                                    {lead.promoter}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>{lead.interest}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <select 
                                                    value={lead.status}
                                                    onChange={(e) => updateLeadStatus(activeInstance.id, lead.id, e.target.value)}
                                                    style={{ 
                                                        background: 'var(--bg-secondary)', 
                                                        border: '1px solid var(--border-color)', 
                                                        color: 'var(--text-primary)',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* NIGHTCLUB: CHICAS */}
            {event.type === 'nightclub' && activeTab === 'chicas' && (() => {
                const activeInstance = getActiveInstance();
                if (!activeInstance) return <div>No hay fechas creadas</div>;

                return (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', margin: 0 }}>Lista de Modelos / Chicas</h3>
                            <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => addGirl(activeInstance.id)}>
                                <Plus size={14} /> Agregar
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Nombre</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Contacto</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Rol / Función</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Hora Citada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!activeInstance.assignedGirls || activeInstance.assignedGirls.length === 0) ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay chicas asignadas a esta fecha</td>
                                        </tr>
                                    ) : activeInstance.assignedGirls.map(ag => {
                                        const girlInfo = imageGirls.find(g => g.id === ag.id) || { name: ag.name || 'Desconocida', phone: ag.phone || 'N/A' };
                                        return (
                                            <tr key={ag.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Star size={14} className="text-primary" />
                                                        <span style={{ fontWeight: '500' }}>{girlInfo.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {girlInfo.phone.includes('@') ? <MessageCircle size={14} /> : <Phone size={14} />}
                                                        {girlInfo.phone}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <span style={{ padding: '4px 8px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '12px', fontSize: '12px' }}>
                                                        {ag.role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>{ag.time}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}


            {/* NIGHTCLUB: ORGANIZACIÓN */}
            {event.type === 'nightclub' && activeTab === 'organizacion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Briefcase size={24} style={{ color: color }} />
                            <h3 style={{ fontSize: '18px', margin: 0 }}>Lienzo Organizativo (Canvas)</h3>
                        </div>
                        <div style={{ minHeight: '500px', flex: 1, marginTop: '-20px' }}>
                            <EventCanvas />
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <StickyNote size={24} style={{ color: color }} />
                            <h3 style={{ fontSize: '18px', margin: 0 }}>Bloc de Notas</h3>
                        </div>
                        <textarea 
                            placeholder="Escribe aquí notas, ideas, requerimientos o recordatorios..."
                            defaultValue={event.notes || ''}
                            onBlur={(e) => updateEvent(event.id, { notes: e.target.value })}
                            style={{
                                width: '100%',
                                minHeight: '300px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                resize: 'vertical',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* NIGHTCLUB: MENSAJES SPAM */}
            {event.type === 'nightclub' && activeTab === 'spam' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <MessageSquare size={24} style={{ color: color }} />
                            <h3 style={{ fontSize: '18px', margin: 0 }}>Plantillas de SPAM / Difusión</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            {/* Template 1 */}
                            <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Invitación General</h4>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => navigator.clipboard.writeText(`¡Hola! Te invito este finde a ${event.name} 🥂. Mandame tu lista o reserva tu mesa. ¡Te esperamos!`)}><Copy size={14} /></button>
                                </div>
                                <textarea
                                    readOnly
                                    value={`¡Hola! Te invito este finde a ${event.name} 🥂. Mandame tu lista o reserva tu mesa. ¡Te esperamos!`}
                                    style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', resize: 'none', outline: 'none' }}
                                />
                            </div>
                            
                            {/* Template 2 */}
                            <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Recordatorio a Promotores</h4>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => navigator.clipboard.writeText(`Equipo, recuerden que hoy cerramos listas para ${event.name} a las 9 PM. ¡A darle con todo! 🔥`)}><Copy size={14} /></button>
                                </div>
                                <textarea
                                    readOnly
                                    value={`Equipo, recuerden que hoy cerramos listas para ${event.name} a las 9 PM. ¡A darle con todo! 🔥`}
                                    style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', resize: 'none', outline: 'none' }}
                                />
                            </div>

                            {/* Custom Template Placeholder */}
                            <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Mensaje Personalizado</h4>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => navigator.clipboard.writeText(event.spamMessage || '')}><Copy size={14} /></button>
                                </div>
                                <textarea
                                    placeholder="Escribe aquí un mensaje personalizado para copiar y pegar rápidamente..."
                                    defaultValue={event.spamMessage || ''}
                                    onBlur={(e) => updateEvent(event.id, { spamMessage: e.target.value })}
                                    style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PERFIL / RESUMEN */}
            {event.type !== 'nightclub' && activeTab === 'perfil' && (
                <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <FileText size={16} color={color} /> Descripción del Evento
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line', margin: 0 }}>
                                {event.description || 'Sin descripción detallada.'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Target size={16} color={color} /> Detalles Clave
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Capacidad</span>
                                    <span style={{ fontWeight: 600 }}>{event.capacity ? `${event.capacity} personas` : 'No definida'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={14} /> Presupuesto Estimado</span>
                                    <span style={{ fontWeight: 600 }}>${parseFloat(event.budget || 0).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> Requerimientos Costo</span>
                                    <span style={{ fontWeight: 600, color: totalReqCost > (parseFloat(event.budget) || 0) ? '#ef4444' : '#22c55e' }}>
                                        ${totalReqCost.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AGENDA */}
            {activeTab === 'agenda' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header */}
                    <div className="card" style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Clock size={18} color={color} /> Cronograma / Agenda
                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                    — {agenda.length} actividades en {uniqueLocations.length} zonas
                                </span>
                            </h3>
                            <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => openAgendaEdit()}>
                                <Plus size={14} /> Agregar Actividad
                            </button>
                        </div>
                    </div>

                    {/* MAP */}
                    {agenda.length > 0 && uniqueLocations.length > 0 && (
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {/* Map Container */}
                                <div style={{ position: 'relative', height: '420px' }}>
                                    {/* OpenStreetMap iframe background */}
                                    <iframe
                                        title="Casco Antiguo Map"
                                        src="https://www.openstreetmap.org/export/embed.html?bbox=-79.5385%2C8.9495%2C-79.5285%2C8.9565&layer=mapnik"
                                        style={{
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                            border: 'none', filter: 'brightness(0.35) saturate(0.6) contrast(1.2)',
                                            pointerEvents: 'none'
                                        }}
                                    />
                                    {/* Dark overlay */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'linear-gradient(180deg, rgba(10,10,20,0.3) 0%, rgba(10,10,20,0.5) 100%)',
                                        pointerEvents: 'none'
                                    }} />

                                    {/* Markers */}
                                    {uniqueLocations.map((loc, i) => {
                                        const coords = getCoordinates(loc.name);
                                        const isSelected = selectedMapLocation === loc.name;
                                        const locColor = loc.color || color;
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedMapLocation(isSelected ? null : loc.name)}
                                                style={{
                                                    position: 'absolute', top: coords.top, left: coords.left,
                                                    transform: 'translate(-50%, -100%)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                    cursor: 'pointer', zIndex: isSelected ? 40 : 10,
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.zIndex = 50; e.currentTarget.style.transform = 'translate(-50%, -100%) scale(1.05)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.zIndex = isSelected ? 40 : 10; e.currentTarget.style.transform = 'translate(-50%, -100%) scale(1)'; }}
                                            >
                                                {/* Label Container */}
                                                <div style={{
                                                    background: isSelected ? `${locColor}30` : 'var(--bg-secondary)',
                                                    color: isSelected ? '#fff' : 'var(--text-primary)',
                                                    padding: '6px 10px', borderRadius: '8px',
                                                    fontSize: '11px', fontWeight: 600,
                                                    marginBottom: '6px', whiteSpace: 'nowrap',
                                                    border: `1px solid ${isSelected ? locColor : 'var(--border-subtle)'}`,
                                                    backdropFilter: 'blur(12px)',
                                                    boxShadow: isSelected ? `0 0 20px ${locColor}40` : '0 4px 12px rgba(0,0,0,0.5)',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    position: 'relative'
                                                }}>
                                                    {loc.name}
                                                    <span style={{
                                                        background: isSelected ? locColor : `${locColor}20`,
                                                        padding: '2px 6px', borderRadius: '10px', fontSize: '10px',
                                                        color: isSelected ? '#fff' : locColor, fontWeight: 700
                                                    }}>
                                                        {loc.items.length}
                                                    </span>
                                                    
                                                    {/* Triangle Pointer */}
                                                    <div style={{
                                                        position: 'absolute', bottom: '-5px', left: '50%',
                                                        transform: 'translateX(-50%) rotate(45deg)',
                                                        width: '10px', height: '10px',
                                                        background: isSelected ? `${locColor}30` : 'var(--bg-secondary)',
                                                        borderRight: `1px solid ${isSelected ? locColor : 'var(--border-subtle)'}`,
                                                        borderBottom: `1px solid ${isSelected ? locColor : 'var(--border-subtle)'}`,
                                                        zIndex: -1
                                                    }} />
                                                </div>

                                                {/* Pin Icon */}
                                                <div style={{
                                                    color: locColor,
                                                    filter: isSelected ? `drop-shadow(0 0 8px ${locColor})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                                                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex', justifyContent: 'center'
                                                }}>
                                                    <MapPin size={24} fill={`${locColor}30`} strokeWidth={2.5} />
                                                </div>
                                                
                                                {/* Pulse ring when selected */}
                                                {isSelected && (
                                                    <div style={{
                                                        position: 'absolute', bottom: '0px',
                                                        width: '30px', height: '30px', borderRadius: '50%',
                                                        border: `2px solid ${locColor}`,
                                                        animation: 'pulse-ring 1.5s ease-out infinite',
                                                        opacity: 0.5, pointerEvents: 'none'
                                                    }} />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Legend */}
                                    <div style={{
                                        position: 'absolute', bottom: '12px', left: '12px',
                                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                                        padding: '10px 14px', borderRadius: '8px',
                                        fontSize: '11px', color: 'var(--text-secondary)',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <MapPin size={12} color={color} /> <strong style={{ color: 'var(--text-primary)' }}>Casco Antiguo, Panamá</strong>
                                        </div>
                                        <span>Haz clic en un punto para ver sus actividades</span>
                                    </div>

                                    {selectedMapLocation && (
                                        <button
                                            onClick={() => setSelectedMapLocation(null)}
                                            style={{
                                                position: 'absolute', top: '12px', right: '12px',
                                                background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff', borderRadius: '8px', padding: '6px 12px',
                                                fontSize: '12px', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)'
                                            }}
                                        >
                                            <X size={12} /> Mostrar todos
                                        </button>
                                    )}

                                    <style>{`
                                        @keyframes pulse-ring {
                                            0% { transform: scale(0.8); opacity: 0.6; }
                                            100% { transform: scale(2.2); opacity: 0; }
                                        }
                                    `}</style>
                                </div>

                                {/* Selected Location Panel */}
                                {selectedMapLocation && (() => {
                                    const loc = uniqueLocations.find(l => l.name === selectedMapLocation);
                                    if (!loc) return null;
                                    const locColor = loc.color || color;
                                    return (
                                        <div style={{
                                            padding: '20px 24px',
                                            borderTop: `2px solid ${locColor}`,
                                            background: `linear-gradient(135deg, ${locColor}08, transparent)`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <div>
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <MapPin size={16} color={locColor} /> {loc.name}
                                                    </h4>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                        {loc.items.length} actividad{loc.items.length > 1 ? 'es' : ''} programada{loc.items.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ fontSize: '12px', padding: '6px 12px' }}
                                                    onClick={() => {
                                                        setEditingAgenda({
                                                            id: `ag-${Date.now()}`, time: '', title: '',
                                                            speaker: loc.name, description: ''
                                                        });
                                                    }}
                                                >
                                                    <Plus size={12} /> Agregar aquí
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {loc.items.sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(item => {
                                                    const statusColor = item.orgStatus === 'listo' ? '#22c55e' : item.orgStatus === 'en-progreso' ? '#3b82f6' : item.orgStatus === 'problema' ? '#ef4444' : '#f59e0b';
                                                    return (
                                                    <div key={item.id} onClick={() => openActivityOrg(item)} style={{
                                                        display: 'flex', gap: '14px', padding: '12px 14px',
                                                        background: 'var(--bg-secondary)', borderRadius: '10px',
                                                        borderLeft: `3px solid ${locColor}`, alignItems: 'center',
                                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                                    }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                                                        <div style={{
                                                            width: '50px', flexShrink: 0, fontWeight: 700,
                                                            fontSize: '14px', color: locColor
                                                        }}>
                                                            {item.time || '—'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{item.title}</div>
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                                {item.responsible && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${locColor}15`, color: locColor }}><User size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{item.responsible}</span>}
                                                                {(item.infrastructure || []).length > 0 && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Package size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{item.infrastructure.length}</span>}
                                                                {(item.artists || []).length > 0 && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Mic size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{item.artists.length}</span>}
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={14} style={{ opacity: 0.4 }} />
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* FULL AGENDA LIST */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <ListTodo size={15} /> {selectedMapLocation ? `Actividades en ${selectedMapLocation}` : 'Todas las actividades'}
                            {selectedMapLocation && (
                                <span
                                    onClick={() => setSelectedMapLocation(null)}
                                    style={{ fontSize: '11px', color: color, cursor: 'pointer', marginLeft: '8px', textDecoration: 'underline' }}
                                >
                                    ver todas
                                </span>
                            )}
                        </h4>

                        {agenda.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <Clock size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Agenda vacía</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Aún no hay actividades programadas para este evento.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {agenda
                                    .filter(item => !selectedMapLocation || item.speaker === selectedMapLocation)
                                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                                    .map((item) => (
                                    (() => {
                                        const loc = uniqueLocations.find(l => l.name === item.speaker);
                                        const locColor = loc ? loc.color : color;
                                        const statusColor = item.orgStatus === 'listo' ? '#22c55e' : item.orgStatus === 'en-progreso' ? '#3b82f6' : item.orgStatus === 'problema' ? '#ef4444' : '#f59e0b';
                                        return (
                                        <div key={item.id} onClick={() => openActivityOrg(item)} style={{
                                            display: 'flex', gap: '16px', padding: '14px 16px', background: 'var(--bg-secondary)',
                                            borderRadius: '12px', borderLeft: `4px solid ${locColor}`, position: 'relative',
                                            transition: 'all 0.15s ease', cursor: 'pointer'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '60px', flexShrink: 0 }}>
                                                <span style={{ fontWeight: 700, fontSize: '14px', color: locColor }}>{item.time || '00:00'}</span>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{item.title}</h4>
                                                {item.speaker && (
                                                    <div style={{
                                                        fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px',
                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <MapPin size={11} color={locColor} /> <span style={{color: locColor}}>{item.speaker}</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                    {item.responsible && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${locColor}15`, color: locColor }}><User size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{item.responsible}</span>}
                                                    {(item.infrastructure || []).length > 0 && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Package size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{item.infrastructure.length} items</span>}
                                                    {(item.artists || []).length > 0 && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Mic size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{item.artists.length} artistas</span>}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} style={{ opacity: 0.3, alignSelf: 'center' }} />
                                        </div>
                                        );
                                    })()
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LOGISTICA / REQUERIMIENTOS */}
            {activeTab === 'logistica' && (
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <Briefcase size={18} color={color} /> Logística y Requerimientos
                            </h3>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Costo total estimado: <strong style={{ color: 'var(--text-primary)' }}>${totalReqCost.toLocaleString()}</strong>
                            </span>
                        </div>
                        <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => openReqEdit()}>
                            <Plus size={14} /> Nuevo Requerimiento
                        </button>
                    </div>

                    {requirements.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            <Briefcase size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Sin requerimientos</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Agrega equipos, catering, personal, etc.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Categoría</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Ítem</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Proveedor</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Cant.</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Costo Un.</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requirements.map(req => (
                                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '11px' }}>
                                                    {req.category}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', fontWeight: 500 }}>{req.name}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{req.provider || '-'}</td>
                                            <td style={{ padding: '12px' }}>{req.quantity}</td>
                                            <td style={{ padding: '12px' }}>${parseFloat(req.cost || 0).toLocaleString()}</td>
                                            <td style={{ padding: '12px', fontWeight: 600 }}>${(parseFloat(req.cost || 0) * parseFloat(req.quantity || 1)).toLocaleString()}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                    background: req.status === 'aprobado' ? 'rgba(34,197,94,0.15)' : req.status === 'pagado' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                                                    color: req.status === 'aprobado' ? '#22c55e' : req.status === 'pagado' ? '#38bdf8' : '#f59e0b'
                                                }}>
                                                    {req.status === 'aprobado' ? 'Aprobado' : req.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => openReqEdit(req)}><Edit3 size={14} /></button>
                                                <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => deleteReq(req.id)}><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'redes' && (() => {
                const eventSocialAccounts = (socialMedia || []).filter(a => (a.linkedEventIds || []).includes(event.id));

                const platformColors = {
                    Instagram: '#E1306C', YouTube: '#FF0000', TikTok: '#00f2ea',
                    Twitter: '#1DA1F2', Facebook: '#1877F2', LinkedIn: '#0A66C2',
                };

                const addArtForAccount = (accountId) => {
                    setEditingArt({ id: `art-${Date.now()}`, accountId, title: '', description: '', references: '', type: 'Post', format: '1080x1080', status: 'Pendiente' });
                };

                const allArtes = event.artes || [
                    { id: 1, title: 'Flyer Oficial', format: '1080x1350', type: 'Post', status: 'Aprobado' },
                    { id: 2, title: 'Lineup Art', format: '1080x1920', type: 'Story', status: 'Revisión' },
                    { id: 3, title: 'Promo Video', format: '9:16', type: 'Reel', status: 'Pendiente' },
                ];

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* LINKED SOCIAL ACCOUNTS HEADER */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <Share2 size={18} color={color} /> Cuentas Vinculadas
                                </h3>
                                <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}
                                    onClick={() => navigate('/social')}>
                                    Gestionar Redes
                                </button>
                            </div>
                            {eventSocialAccounts.length === 0 ? (
                                <div style={{
                                    padding: '24px', textAlign: 'center', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)',
                                }}>
                                    <Share2 size={28} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
                                        No hay cuentas vinculadas a este evento
                                    </p>
                                    <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}
                                        onClick={() => navigate('/social')}>
                                        Vincular Cuentas
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {eventSocialAccounts.map(acc => {
                                        const pColor = platformColors[acc.platform] || '#8b5cf6';
                                        const isActive = contentSubTab === acc.id;
                                        return (
                                            <button key={acc.id}
                                                onClick={() => setContentSubTab(isActive ? 'all' : acc.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
                                                    background: isActive ? `${pColor}18` : 'rgba(255,255,255,0.03)',
                                                    border: isActive ? `2px solid ${pColor}` : '1px solid var(--border-subtle)',
                                                    transition: 'all 0.2s', color: 'var(--text-primary)',
                                                }}
                                            >
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: `${pColor}20`, color: pColor,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Instagram size={16} />
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{acc.handler}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                        {acc.platform} {acc.followers ? `· ${acc.followers}` : ''}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* PER-ACCOUNT CONTENT SECTIONS */}
                        {eventSocialAccounts.length > 0 && (() => {
                            const accountsToShow = contentSubTab === 'all'
                                ? eventSocialAccounts
                                : eventSocialAccounts.filter(a => a.id === contentSubTab);

                            return accountsToShow.map(acc => {
                                const pColor = platformColors[acc.platform] || '#8b5cf6';
                                const accountCalendarAccounts = [{ id: acc.id, handler: acc.handler, platform: acc.platform, companyId: acc.companyId }];
                                const accountArtes = allArtes.filter(a => a.accountId === acc.id || !a.accountId);

                                return (
                                    <div key={acc.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Account Header */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px 20px', borderRadius: '12px',
                                            background: `linear-gradient(135deg, ${pColor}10, ${pColor}04)`,
                                            border: `1px solid ${pColor}25`,
                                        }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '12px',
                                                background: `${pColor}20`, color: pColor,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Instagram size={20} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: pColor }}>{acc.handler}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {acc.platform} · {acc.type || 'Cuenta'} {acc.followers ? `· ${acc.followers} seguidores` : ''}
                                                </div>
                                            </div>
                                            {acc.url && (
                                                <a href={acc.url} target="_blank" rel="noreferrer"
                                                    className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>
                                                    <ExternalLink size={12} /> Abrir
                                                </a>
                                            )}
                                        </div>

                                        {/* Calendar for this account */}
                                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '12px 20px',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: `${pColor}06`,
                                            }}>
                                                <div style={{ padding: '6px', borderRadius: '8px', background: `${pColor}15`, color: pColor }}>
                                                    <CalendarDays size={14} />
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Calendario — {acc.handler}</h3>
                                                    <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>
                                                        Contenido semanal para {acc.platform}
                                                    </p>
                                                </div>
                                            </div>
                                            <ContentCalendarGrid accounts={accountCalendarAccounts} companies={[]} />
                                        </div>

                                        {/* Artes for this account */}
                                        <div className="card" style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h3 style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                                    <Instagram size={16} color={pColor} /> Artes — {acc.handler}
                                                </h3>
                                                <button className="btn btn-primary" style={{ fontSize: '11px', padding: '5px 12px' }} onClick={() => addArtForAccount(acc.id)}>
                                                    <Plus size={12} /> Subir Arte
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', alignItems: 'start' }}>
                                                {accountArtes.map(art => {
                                                    const isVertical = art.type === 'Story' || art.type === 'Reel';
                                                    return (
                                                        <div key={art.id} style={{
                                                            background: 'var(--bg-secondary)', borderRadius: '10px',
                                                            border: '1px solid var(--border-subtle)', overflow: 'hidden',
                                                            transition: 'all 0.2s', cursor: 'pointer'
                                                        }}
                                                            onClick={() => setEditingArt({ ...art })}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${pColor}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                        >
                                                            <div style={{
                                                                aspectRatio: isVertical ? '9/16' : '1/1',
                                                                background: `linear-gradient(45deg, ${pColor}15, transparent)`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                borderBottom: '1px solid var(--border-subtle)', position: 'relative'
                                                            }}>
                                                                <Instagram size={isVertical ? 32 : 24} style={{ opacity: 0.15, color: pColor }} />
                                                                <span style={{
                                                                    position: 'absolute', top: '6px', right: '6px',
                                                                    fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px',
                                                                    background: art.status === 'Aprobado' ? 'rgba(34,197,94,0.15)' : art.status === 'Revisión' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
                                                                    color: art.status === 'Aprobado' ? '#4ade80' : art.status === 'Revisión' ? '#fbbf24' : 'var(--text-tertiary)'
                                                                }}>{art.status}</span>
                                                            </div>
                                                            <div style={{ padding: '12px' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{art.title}</div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{art.format}</span>
                                                                    <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', color: 'var(--text-secondary)' }}>{art.type}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{
                                                    border: '2px dashed var(--border-subtle)', borderRadius: '10px',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    aspectRatio: '1/1', cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'all 0.2s'
                                                }}
                                                    onClick={() => addArtForAccount(acc.id)}
                                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                                                >
                                                    <Plus size={20} style={{ marginBottom: '6px' }} />
                                                    <span style={{ fontSize: '11px', fontWeight: 500 }}>Añadir Arte</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                );
            })()}

            {/* TAREAS */}
            {activeTab === 'tareas' && (() => {
                const activeInstance = getActiveInstance();
                const normalizedChecklist = {};
                if (activeInstance && activeInstance.checklist) {
                    Object.keys(activeInstance.checklist).forEach(cat => {
                        const newCat = cat === 'promo' ? 'Promo' : cat === 'logistica' ? 'Logística' : cat === 'imagen' ? 'Imagen' : cat;
                        normalizedChecklist[newCat] = activeInstance.checklist[cat].map(i => ({...i, completed: i.done}));
                    });
                }

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {event.type === 'nightclub' && activeInstance && (
                            <OperativeChecklist 
                                checklist={normalizedChecklist}
                                updateChecklistItem={(cat, itemId, completed) => updateChecklistItem(activeInstance.id, cat, itemId, completed)}
                            />
                        )}

                        <div style={{ padding: 0 }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <button 
                                    className={`btn ${taskViewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setTaskViewMode('kanban')}
                                    style={{ padding: '6px 12px', fontSize: '13px', background: taskViewMode === 'kanban' ? color : 'transparent', borderColor: taskViewMode === 'kanban' ? color : 'var(--border-subtle)' }}
                                >
                                    Kanban
                                </button>
                                <button 
                                    className={`btn ${taskViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setTaskViewMode('table')}
                                    style={{ padding: '6px 12px', fontSize: '13px', background: taskViewMode === 'table' ? color : 'transparent', borderColor: taskViewMode === 'table' ? color : 'var(--border-subtle)' }}
                                >
                                    Tabla
                                </button>
                            </div>
                            
                            <div style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                                {taskViewMode === 'kanban' ? (
                                    <EventKanbanBoard events={events} filterEventId={event.id} />
                                ) : (
                                    <EventTableView events={events} filterEventId={event.id} />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* === MODALES === */}

            {/* Modal Editar Evento Principal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                        <div className="modal-header" style={{ borderBottom: `2px solid ${color}` }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '22px' }}>{form.icon || '📅'}</span> Editar Evento
                            </h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {/* ── INFORMACIÓN PRINCIPAL ── */}
                            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Información Principal</div>
                            <div className="form-group">
                                <label>Nombre del Evento *</label>
                                <input className="form-input" placeholder="Ej: Tech Summit 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Tipo / Categoría</label>
                                    <input className="form-input" placeholder="social, corporativo, nightclub..." value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="planificacion">En Planificación</option>
                                        <option value="ejecucion">En Ejecución</option>
                                        <option value="activo">Activo</option>
                                        <option value="upcoming">Próximo</option>
                                        <option value="ongoing">En Curso</option>
                                        <option value="finalizado">Finalizado</option>
                                        <option value="completed">Completado</option>
                                        <option value="pausado">Pausado</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descripción / Objetivos</label>
                                <textarea className="form-textarea" rows={3} style={{ resize: 'vertical' }} placeholder="De qué trata el evento..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Ícono</label>
                                    <input className="form-input" style={{ textAlign: 'center', fontSize: '20px' }} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                                        <input className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '20px 0' }} />

                            {/* ── CUÁNDO Y DÓNDE ── */}
                            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cuándo y Dónde</div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Fecha</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Hora</label>
                                    <input type="time" className="form-input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Ubicación / Lugar</label>
                                <input className="form-input" placeholder="Centro de Convenciones Atlapa" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>

                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '20px 0' }} />

                            {/* ── LOGÍSTICA Y CONTACTO ── */}
                            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logística y Contacto</div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Capacidad / Asistentes</label>
                                    <input className="form-input" placeholder="Ej: 500" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Presupuesto Estimado ($)</label>
                                    <input className="form-input" placeholder="$5,000" value={form.budget || form.estimatedBudget || ''} onChange={e => setForm({ ...form, budget: e.target.value, estimatedBudget: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Organizador / Empresa</label>
                                    <input className="form-input" placeholder="Nombre del organizador" value={form.organizer || ''} onChange={e => setForm({ ...form, organizer: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Persona de Contacto</label>
                                    <input className="form-input" placeholder="Nombre" value={form.contactPerson || ''} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input className="form-input" placeholder="+507 6000-0000" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input className="form-input" placeholder="info@evento.com" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '20px 0' }} />

                            {/* ── CARPETA DRIVE ── */}
                            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carpeta Compartida (Drive)</div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FolderOpen size={13} style={{ color: '#4285f4' }} /> Enlace a la carpeta del evento
                                </label>
                                <input className="form-input" placeholder="https://drive.google.com/..." value={form.driveFolderId || ''} onChange={e => setForm({ ...form, driveFolderId: e.target.value })} />
                            </div>

                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '20px 0' }} />

                            {/* ── NOTAS ── */}
                            <div className="form-group">
                                <label>Notas Adicionales</label>
                                <textarea className="form-textarea" rows={3} style={{ resize: 'vertical' }} placeholder="Instrucciones especiales, código de vestimenta..." value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveEvent} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Save size={14} /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Agenda */}
            {editingAgenda && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Actividad de Agenda</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeAgendaEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Hora</label>
                                <input type="time" className="form-input" value={editingAgenda.time} onChange={e => setEditingAgenda({ ...editingAgenda, time: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Título de la actividad</label>
                                <input className="form-input" value={editingAgenda.title} onChange={e => setEditingAgenda({ ...editingAgenda, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Expositor / Responsable (Opcional)</label>
                                <input className="form-input" value={editingAgenda.speaker} onChange={e => setEditingAgenda({ ...editingAgenda, speaker: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Descripción (Opcional)</label>
                                <textarea className="form-textarea" rows={3} value={editingAgenda.description} onChange={e => setEditingAgenda({ ...editingAgenda, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-ghost" onClick={closeAgendaEdit}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveAgenda}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Requerimiento */}
            {editingReq && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Requerimiento Logístico</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeReqEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Categoría</label>
                                    <select className="form-select" value={editingReq.category} onChange={e => setEditingReq({ ...editingReq, category: e.target.value })}>
                                        <option value="General">General</option>
                                        <option value="Equipamiento">Equipamiento</option>
                                        <option value="Catering">Catering</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Mobiliario">Mobiliario</option>
                                        <option value="Marketing">Marketing/Impresos</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select className="form-select" value={editingReq.status} onChange={e => setEditingReq({ ...editingReq, status: e.target.value })}>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="aprobado">Aprobado</option>
                                        <option value="pagado">Pagado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Ítem / Descripción</label>
                                <input className="form-input" value={editingReq.name} onChange={e => setEditingReq({ ...editingReq, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Proveedor (Opcional)</label>
                                <input className="form-input" value={editingReq.provider} onChange={e => setEditingReq({ ...editingReq, provider: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Cantidad</label>
                                    <input type="number" className="form-input" value={editingReq.quantity} onChange={e => setEditingReq({ ...editingReq, quantity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Costo Unitario ($)</label>
                                    <input type="number" className="form-input" value={editingReq.cost} onChange={e => setEditingReq({ ...editingReq, cost: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-ghost" onClick={closeReqEdit}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveReq}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Organización de Actividad */}
            {viewingActivity && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header" style={{ borderBottom: `2px solid ${color}` }}>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📋 Organización de Actividad
                                </h3>
                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                                    {viewingActivity.speaker} — {viewingActivity.time || 'Sin hora'}
                                </span>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setViewingActivity(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                            {/* Activity title + status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '14px 16px', background: `linear-gradient(135deg, ${color}10, transparent)`, borderRadius: '10px', border: `1px solid ${color}20` }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px' }}>{viewingActivity.title}</h4>
                                    {viewingActivity.description && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>{viewingActivity.description}</p>}
                                </div>
                                <select
                                    className="form-select"
                                    style={{ width: '140px', fontSize: '12px' }}
                                    value={viewingActivity.orgStatus}
                                    onChange={e => setViewingActivity({ ...viewingActivity, orgStatus: e.target.value })}
                                >
                                    <option value="pendiente">🟡 Pendiente</option>
                                    <option value="en-progreso">🔵 En Progreso</option>
                                    <option value="listo">🟢 Listo</option>
                                    <option value="problema">🔴 Problema</option>
                                </select>
                            </div>

                            {/* Persona Encargada */}
                            <div style={{ marginBottom: '20px' }}>
                                <h5 style={{ margin: '0 0 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color }}>
                                    <User size={14} /> Persona Encargada
                                </h5>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label style={{ fontSize: '12px' }}>Nombre</label>
                                        <input className="form-input" placeholder="Nombre del responsable" value={viewingActivity.responsible} onChange={e => setViewingActivity({ ...viewingActivity, responsible: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '12px' }}>Teléfono / Contacto</label>
                                        <input className="form-input" placeholder="Tel. o email" value={viewingActivity.responsiblePhone} onChange={e => setViewingActivity({ ...viewingActivity, responsiblePhone: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Infraestructura y Logística */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h5 style={{ margin: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color }}>
                                        <Package size={14} /> Infraestructura y Logística
                                    </h5>
                                    <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={addInfraItem}>
                                        <Plus size={12} /> Agregar
                                    </button>
                                </div>
                                {(viewingActivity.infrastructure || []).length === 0 ? (
                                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        Sin requerimientos de infraestructura aún
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(viewingActivity.infrastructure || []).map((inf, idx) => (
                                            <div key={inf.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input className="form-input" style={{ flex: 1, fontSize: '12px' }} placeholder="Ej: Tarima, Tolda, Sillas..." value={inf.name} onChange={e => updateInfraItem(idx, 'name', e.target.value)} />
                                                <input type="number" className="form-input" style={{ width: '60px', fontSize: '12px' }} placeholder="Cant." value={inf.quantity} onChange={e => updateInfraItem(idx, 'quantity', e.target.value)} />
                                                <select className="form-select" style={{ width: '110px', fontSize: '11px' }} value={inf.status} onChange={e => updateInfraItem(idx, 'status', e.target.value)}>
                                                    <option value="pendiente">Pendiente</option>
                                                    <option value="confirmado">Confirmado</option>
                                                    <option value="entregado">Entregado</option>
                                                </select>
                                                <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => removeInfraItem(idx)}><Trash2 size={13} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Artistas / Invitados */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h5 style={{ margin: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color }}>
                                        <Mic size={14} /> Artistas / Invitados
                                    </h5>
                                    <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={addArtistItem}>
                                        <Plus size={12} /> Agregar
                                    </button>
                                </div>
                                {(viewingActivity.artists || []).length === 0 ? (
                                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        Sin artistas o invitados registrados
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(viewingActivity.artists || []).map((art, idx) => (
                                            <div key={art.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input className="form-input" style={{ flex: 1, fontSize: '12px' }} placeholder="Nombre" value={art.name} onChange={e => updateArtistItem(idx, 'name', e.target.value)} />
                                                <input className="form-input" style={{ width: '130px', fontSize: '12px' }} placeholder="Rol (DJ, Banda...)" value={art.role} onChange={e => updateArtistItem(idx, 'role', e.target.value)} />
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '4px 8px', fontSize: '11px', color: art.confirmed ? '#22c55e' : 'var(--text-tertiary)', border: `1px solid ${art.confirmed ? '#22c55e40' : 'var(--border-subtle)'}`, borderRadius: '6px' }}
                                                    onClick={() => updateArtistItem(idx, 'confirmed', !art.confirmed)}
                                                >
                                                    {art.confirmed ? '✓ Confirmado' : 'Confirmar'}
                                                </button>
                                                <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => removeArtistItem(idx)}><Trash2 size={13} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notas */}
                            <div>
                                <h5 style={{ margin: '0 0 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color }}>
                                    <StickyNote size={14} /> Notas de Organización
                                </h5>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    style={{ resize: 'vertical', fontSize: '12px' }}
                                    placeholder="Notas internas, observaciones, coordinaciones..."
                                    value={viewingActivity.orgNotes}
                                    onChange={e => setViewingActivity({ ...viewingActivity, orgNotes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-ghost" onClick={() => setViewingActivity(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveActivityOrg} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Save size={14} /> Guardar Organización
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Arte */}
            {editingArt && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>{editingArt.id.toString().startsWith('art-') ? 'Añadir Nuevo Arte' : 'Editar Arte'}</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeArtEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Título de la imagen</label>
                                <input className="form-input" placeholder="Ej: Flyer Oficial, Lineup, etc." value={editingArt.title} onChange={e => setEditingArt({ ...editingArt, title: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Tipo de formato</label>
                                    <select className="form-select" value={editingArt.type} onChange={e => setEditingArt({ ...editingArt, type: e.target.value })}>
                                        <option value="Post">Post (1:1 / 4:5)</option>
                                        <option value="Story">Story (9:16)</option>
                                        <option value="Reel">Reel (9:16)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select className="form-select" value={editingArt.status} onChange={e => setEditingArt({ ...editingArt, status: e.target.value })}>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Revisión">En Revisión</option>
                                        <option value="Aprobado">Aprobado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descripción para el copy / Indicaciones</label>
                                <textarea className="form-textarea" rows={3} placeholder="Texto de la publicación o indicaciones para el diseñador..." value={editingArt.description || ''} onChange={e => setEditingArt({ ...editingArt, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Referencias Visuales (Links)</label>
                                <input className="form-input" placeholder="Enlace a Drive, Pinterest, etc." value={editingArt.references || ''} onChange={e => setEditingArt({ ...editingArt, references: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {!editingArt.id.toString().startsWith('art-') ? (
                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => deleteArt(editingArt.id)}>Eliminar</button>
                            ) : <div></div>}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn btn-ghost" onClick={closeArtEdit}>Cancelar</button>
                                <button className="btn btn-primary" onClick={saveArt}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MASTER PLAN TAB ═══ */}
            {activeTab === 'masterplan' && (
                <MasterChecklist
                    event={event}
                    onUpdateChecklist={(checklist) => updateEvent(event.id, { masterChecklist: checklist })}
                />
            )}
        </div>
    );
}
