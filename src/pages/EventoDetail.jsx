import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit3, Calendar, MapPin, Clock, Users, DollarSign,
    FileText, CheckSquare, ListTodo, MoreHorizontal, Copy,
    CalendarDays, Target, Briefcase, Plus, X, Trash2, Map,
    User, Mic, Package, StickyNote, ChevronRight, Save, TrendingUp,
    Share2, MessageSquare, ExternalLink, Instagram, Sparkles, Star, Phone, MessageCircle,
    FolderOpen, Mail, Globe, Tv, Video, Film, Radio, Layers, Hash, PlayCircle
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
    const { events, updateEvent, tasks, updateTask, promoters, imageGirls, socialMedia, gcalToken, googleCalendarEvents, connectGoogleCalendar, disconnectGoogleCalendar, fetchGoogleCalendarEvents, syncEventToGoogleCalendar } = useApp();
    const event = events.find(e => e.id === id);

    const zones = event ? (event.zones || Array.from(new Set((event.agenda || []).map(a => a.speaker).filter(Boolean)))) : [];
    
    const addZone = (zoneName) => {
        if (!zoneName || !zoneName.trim() || !event) return;
        const trimmed = zoneName.trim();
        if (zones.includes(trimmed)) return;
        const updatedZones = [...zones, trimmed];
        updateEvent(event.id, { zones: updatedZones });
    };

    const removeZone = (zoneName) => {
        if (!event) return;
        const updatedZones = zones.filter(z => z !== zoneName);
        const updatedAgenda = (event.agenda || []).map(a => a.speaker === zoneName ? { ...a, speaker: '' } : a);
        updateEvent(event.id, { zones: updatedZones, agenda: updatedAgenda });
        if (selectedMapLocation === zoneName) {
            setSelectedMapLocation(null);
        }
    };

    const [activeTab, setActiveTab] = useState(event?.type === 'nightclub' ? 'inicio' : event?.type === 'local' ? 'local_inicio' : 'perfil');
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
    const [isManagingZones, setIsManagingZones] = useState(false);
    const [newZoneName, setNewZoneName] = useState('');

    // Listas Especiales Tabs & Modals
    const [listSubTab, setListSubTab] = useState('promoters'); // 'promoters' | 'girls' | 'invitations'
    const [editingListPromoter, setEditingListPromoter] = useState(null);
    const [editingListGirl, setEditingListGirl] = useState(null);
    const [editingListInvitation, setEditingListInvitation] = useState(null);

    // Local / Establecimiento specific states
    const [editingTable, setEditingTable] = useState(null);
    const [editingInventory, setEditingInventory] = useState(null);
    const [editingStaff, setEditingStaff] = useState(null);
    const [draggedTableIdx, setDraggedTableIdx] = useState(null);
    const [dragOverTableIdx, setDragOverTableIdx] = useState(null);
    const [calYear, setCalYear] = useState(() => new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
    const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (gcalToken && event?.type === 'local' && activeTab === 'local_agenda') {
            const timeMin = new Date(calYear, calMonth, 1).toISOString();
            const timeMax = new Date(calYear, calMonth + 1, 1).toISOString();
            fetchGoogleCalendarEvents(timeMin, timeMax);
        }
    }, [gcalToken, calYear, calMonth, activeTab, event?.type, fetchGoogleCalendarEvents]);

    // TV Show specific states
    const [tvSubTab, setTvSubTab] = useState('segments'); // 'segments' | 'episodes' | 'crew'
    const [editingSegment, setEditingSegment] = useState(null);
    const [editingEpisode, setEditingEpisode] = useState(null);
    const [editingCrew, setEditingCrew] = useState(null);

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
    const openAgendaEdit = (item = null, defaultDate = '') => {
        if (item) setEditingAgenda({ ...item });
        else {
            const todayStr = defaultDate || event.date || new Date().toISOString().split('T')[0];
            setEditingAgenda({ id: `ag-${Date.now()}`, date: todayStr, time: '20:00', title: '', speaker: '', description: '' });
        }
    };
    const closeAgendaEdit = () => setEditingAgenda(null);
    const saveAgenda = () => {
        if (!editingAgenda.title.trim()) return;
        const updated = agenda.find(a => a.id === editingAgenda.id)
            ? agenda.map(a => a.id === editingAgenda.id ? editingAgenda : a)
            : [...agenda, editingAgenda];
        // Sort by date then time
        updated.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            const timeA = a.time || '';
            const timeB = b.time || '';
            return timeA.localeCompare(timeB);
        });
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

    // === Listas Especiales (Promotores, Chicas de Imagen, Invitaciones) ===
    const openListPromoterEdit = (item = null) => {
        if (item) {
            setEditingListPromoter({ ...item });
        } else {
            setEditingListPromoter({
                id: `list-prom-${Date.now()}`,
                name: '',
                code: '',
                phone: '',
                targetGuests: 50,
                commission: 0,
                status: 'Confirmado'
            });
        }
    };
    const closeListPromoterEdit = () => setEditingListPromoter(null);
    const saveListPromoter = () => {
        if (!editingListPromoter.name.trim()) return;
        const currentList = event.promotersList || [];
        const updated = currentList.find(p => p.id === editingListPromoter.id)
            ? currentList.map(p => p.id === editingListPromoter.id ? editingListPromoter : p)
            : [...currentList, editingListPromoter];
        updateEvent(event.id, { promotersList: updated });
        closeListPromoterEdit();
    };
    const deleteListPromoter = (itemId) => {
        const currentList = event.promotersList || [];
        const updated = currentList.filter(p => p.id !== itemId);
        updateEvent(event.id, { promotersList: updated });
    };

    const openListGirlEdit = (item = null) => {
        if (item) {
            setEditingListGirl({ ...item });
        } else {
            setEditingListGirl({
                id: `list-girl-${Date.now()}`,
                name: '',
                role: 'Mesa',
                entryTime: '22:00',
                phone: '',
                fee: 0,
                status: 'Confirmada'
            });
        }
    };
    const closeListGirlEdit = () => setEditingListGirl(null);
    const saveListGirl = () => {
        if (!editingListGirl.name.trim()) return;
        const currentList = event.girlsList || [];
        const updated = currentList.find(g => g.id === editingListGirl.id)
            ? currentList.map(g => g.id === editingListGirl.id ? editingListGirl : g)
            : [...currentList, editingListGirl];
        updateEvent(event.id, { girlsList: updated });
        closeListGirlEdit();
    };
    const deleteListGirl = (itemId) => {
        const currentList = event.girlsList || [];
        const updated = currentList.filter(g => g.id !== itemId);
        updateEvent(event.id, { girlsList: updated });
    };

    const openListInvitationEdit = (item = null) => {
        if (item) {
            setEditingListInvitation({ ...item });
        } else {
            setEditingListInvitation({
                id: `list-inv-${Date.now()}`,
                name: '',
                phone: '',
                invitedBy: 'Organizador',
                accessType: 'General',
                companions: 0,
                status: 'Pendiente'
            });
        }
    };
    const closeListInvitationEdit = () => setEditingListInvitation(null);
    const saveListInvitation = () => {
        if (!editingListInvitation.name.trim()) return;
        const currentList = event.invitationsList || [];
        const updated = currentList.find(i => i.id === editingListInvitation.id)
            ? currentList.map(i => i.id === editingListInvitation.id ? editingListInvitation : i)
            : [...currentList, editingListInvitation];
        updateEvent(event.id, { invitationsList: updated });
        closeListInvitationEdit();
    };
    const deleteListInvitation = (itemId) => {
        const currentList = event.invitationsList || [];
        const updated = currentList.filter(i => i.id !== itemId);
        updateEvent(event.id, { invitationsList: updated });
    };

    // === TV Show Handlers (Segments, Episodes, Crew) ===
    const isTvShow = event.type === 'tvshow';

    const openSegmentEdit = (item = null) => {
        if (item) { setEditingSegment({ ...item }); }
        else {
            const segments = event.segments || [];
            setEditingSegment({
                id: `seg-${Date.now()}`, name: '', duration: '10 min', type: 'Entrevista',
                description: '', order: segments.length + 1
            });
        }
    };
    const saveSegment = () => {
        if (!editingSegment.name.trim()) return;
        const list = event.segments || [];
        const updated = list.find(s => s.id === editingSegment.id)
            ? list.map(s => s.id === editingSegment.id ? editingSegment : s)
            : [...list, editingSegment];
        updateEvent(event.id, { segments: updated });
        setEditingSegment(null);
    };
    const deleteSegment = (itemId) => {
        updateEvent(event.id, { segments: (event.segments || []).filter(s => s.id !== itemId) });
    };

    const openEpisodeEdit = (item = null) => {
        if (item) { setEditingEpisode({ ...item }); }
        else {
            const eps = event.episodes || [];
            const nextNum = eps.length > 0 ? Math.max(...eps.map(e => e.number)) + 1 : 1;
            setEditingEpisode({
                id: `ep-${Date.now()}`, number: nextNum, title: `Episodio ${nextNum}`,
                date: '', guest: '', status: 'Planeación', notes: ''
            });
        }
    };
    const saveEpisode = () => {
        if (!editingEpisode.title.trim()) return;
        const list = event.episodes || [];
        const updated = list.find(e => e.id === editingEpisode.id)
            ? list.map(e => e.id === editingEpisode.id ? editingEpisode : e)
            : [...list, editingEpisode];
        updateEvent(event.id, { episodes: updated });
        setEditingEpisode(null);
    };
    const deleteEpisode = (itemId) => {
        updateEvent(event.id, { episodes: (event.episodes || []).filter(e => e.id !== itemId) });
    };

    const openCrewEdit = (item = null) => {
        if (item) { setEditingCrew({ ...item }); }
        else {
            setEditingCrew({
                id: `crew-${Date.now()}`, name: '', role: '', department: 'Producción', status: 'Por asignar'
            });
        }
    };
    const saveCrew = () => {
        if (!editingCrew.role.trim()) return;
        const list = event.crew || [];
        const updated = list.find(c => c.id === editingCrew.id)
            ? list.map(c => c.id === editingCrew.id ? editingCrew : c)
            : [...list, editingCrew];
        updateEvent(event.id, { crew: updated });
        setEditingCrew(null);
    };
    const deleteCrew = (itemId) => {
        updateEvent(event.id, { crew: (event.crew || []).filter(c => c.id !== itemId) });
    };

    // === Local / Establecimiento Handlers (Tables, Inventory, Staff) ===
    const isLocal = event.type === 'local';

    const openTableEdit = (table) => {
        setEditingTable({ ...table });
    };

    const saveTable = () => {
        if (!editingTable.name.trim()) return;
        const list = event.tables || [];
        const updated = list.map(t => t.id === editingTable.id ? editingTable : t);
        updateEvent(event.id, { tables: updated });
        setEditingTable(null);
    };

    const releaseTable = (tableId) => {
        const list = event.tables || [];
        const updated = list.map(t => t.id === tableId ? {
            ...t,
            status: 'Disponible',
            client: '',
            promoter: '',
            phone: '',
            deposit: 0
        } : t);
        updateEvent(event.id, { tables: updated });
    };

    const occupyTable = (tableId) => {
        const list = event.tables || [];
        const updated = list.map(t => t.id === tableId ? { ...t, status: 'Ocupado' } : t);
        updateEvent(event.id, { tables: updated });
    };

    // Drag and Drop & Ordering handlers for VIP tables/boxes
    const handleTableDragStart = (e, index) => {
        setDraggedTableIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleTableDragOver = (e, index) => {
        e.preventDefault();
        if (dragOverTableIdx !== index) {
            setDragOverTableIdx(index);
        }
    };

    const handleTableDrop = (e, targetIndex) => {
        e.preventDefault();
        const sourceIndexStr = e.dataTransfer.getData('text/plain');
        const sourceIndex = sourceIndexStr !== '' ? parseInt(sourceIndexStr, 10) : draggedTableIdx;
        
        setDraggedTableIdx(null);
        setDragOverTableIdx(null);

        if (sourceIndex === null || sourceIndex === undefined || sourceIndex === targetIndex) return;

        const defaultTables = [
            { id: 't-b1', name: 'Box VIP 1', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-b2', name: 'Box VIP 2', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-b3', name: 'Box VIP 3', capacity: 12, minConsumption: 600, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-b4', name: 'Box VIP 4', capacity: 8, minConsumption: 400, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m1', name: 'Mesa Gold 1', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m2', name: 'Mesa Gold 2', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m3', name: 'Mesa Silver 1', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m4', name: 'Mesa Silver 2', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 }
        ];

        const list = [...(event.tables || defaultTables)];
        const [movedItem] = list.splice(sourceIndex, 1);
        list.splice(targetIndex, 0, movedItem);

        updateEvent(event.id, { tables: list });
    };

    const handleTableDragEnd = () => {
        setDraggedTableIdx(null);
        setDragOverTableIdx(null);
    };

    const moveTable = (index, direction) => {
        const defaultTables = [
            { id: 't-b1', name: 'Box VIP 1', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-b2', name: 'Box VIP 2', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-b3', name: 'Box VIP 3', capacity: 12, minConsumption: 600, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-b4', name: 'Box VIP 4', capacity: 8, minConsumption: 400, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m1', name: 'Mesa Gold 1', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m2', name: 'Mesa Gold 2', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m3', name: 'Mesa Silver 1', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
            { id: 't-m4', name: 'Mesa Silver 2', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 }
        ];
        const list = [...(event.tables || defaultTables)];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;

        updateEvent(event.id, { tables: list });
    };

    const openInventoryEdit = (item = null) => {
        if (item) {
            setEditingInventory({ ...item });
        } else {
            setEditingInventory({
                id: `inv-${Date.now()}`,
                name: '',
                category: 'Licores',
                quantity: 10,
                cost: 0,
                price: 0,
                minStock: 5,
                status: 'Normal'
            });
        }
    };

    const saveInventory = () => {
        if (!editingInventory.name.trim()) return;
        
        let qty = parseInt(editingInventory.quantity) || 0;
        let min = parseInt(editingInventory.minStock) || 0;
        let status = 'Normal';
        if (qty === 0) status = 'Sin Stock';
        else if (qty <= min) status = 'Bajo Stock';
        
        const itemToSave = {
            ...editingInventory,
            quantity: qty,
            minStock: min,
            cost: parseFloat(editingInventory.cost) || 0,
            price: parseFloat(editingInventory.price) || 0,
            status: status
        };

        const list = event.inventory || [];
        const updated = list.find(i => i.id === itemToSave.id)
            ? list.map(i => i.id === itemToSave.id ? itemToSave : i)
            : [...list, itemToSave];
        updateEvent(event.id, { inventory: updated });
        setEditingInventory(null);
    };

    const deleteInventory = (itemId) => {
        updateEvent(event.id, { inventory: (event.inventory || []).filter(i => i.id !== itemId) });
    };

    const adjustStock = (itemId, delta) => {
        const list = event.inventory || [];
        const updated = list.map(i => {
            if (i.id === itemId) {
                const newQty = Math.max(0, (i.quantity || 0) + delta);
                let status = 'Normal';
                if (newQty === 0) status = 'Sin Stock';
                else if (newQty <= (i.minStock || 0)) status = 'Bajo Stock';
                return { ...i, quantity: newQty, status };
            }
            return i;
        });
        updateEvent(event.id, { inventory: updated });
    };

    const openStaffEdit = (item = null) => {
        if (item) {
            setEditingStaff({ ...item });
        } else {
            setEditingStaff({
                id: `st-${Date.now()}`,
                name: '',
                role: '',
                phone: '',
                shift: '20:00 - 04:00',
                pay: 0,
                status: 'Presente'
            });
        }
    };

    const saveStaff = () => {
        if (!editingStaff.name.trim()) return;
        const list = event.staff || [];
        const itemToSave = {
            ...editingStaff,
            pay: parseFloat(editingStaff.pay) || 0
        };
        const updated = list.find(s => s.id === itemToSave.id)
            ? list.map(s => s.id === itemToSave.id ? itemToSave : s)
            : [...list, itemToSave];
        updateEvent(event.id, { staff: updated });
        setEditingStaff(null);
    };

    const deleteStaff = (itemId) => {
        updateEvent(event.id, { staff: (event.staff || []).filter(s => s.id !== itemId) });
    };

    const toggleStaffStatus = (itemId, newStatus) => {
        const list = event.staff || [];
        const updated = list.map(s => s.id === itemId ? { ...s, status: newStatus } : s);
        updateEvent(event.id, { staff: updated });
    };

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
    const isSpecialProject = event.id === 'ev-casco-peatonal' || event.id === 'ev-grafiti-tour';
    const tabs = event.type === 'nightclub' ? [
        { id: 'inicio', label: 'Inicio', icon: CalendarDays },
        { id: 'invitados', label: 'Invitados', icon: Users },
        { id: 'chicas', label: 'Modelos / Chicas', icon: Star },
        { id: 'organizacion', label: 'Organización', icon: Briefcase },
        { id: 'tareas', label: 'Tareas', icon: ListTodo },
        { id: 'redes', label: 'Redes & Contenido', icon: Share2 },
        { id: 'masterplan', label: 'Master Plan', icon: Target },
        { id: 'spam', label: 'Mensajes SPAM', icon: MessageSquare },
    ] : isTvShow ? [
        { id: 'perfil', label: 'Resumen', icon: Tv },
        { id: 'produccion', label: 'Producción', icon: Film },
        { id: 'listas', label: 'Listas', icon: Users },
        { id: 'logistica', label: 'Logística & Req.', icon: Briefcase },
        { id: 'tareas', label: 'Tareas', icon: ListTodo },
        { id: 'redes', label: 'Redes & Contenido', icon: Share2 },
        { id: 'masterplan', label: 'Master Plan', icon: Target },
    ] : isLocal ? [
        { id: 'local_inicio', label: 'Resumen Local', icon: CalendarDays },
        { id: 'local_reservas', label: 'Boxes & Mesas VIP', icon: Star },
        { id: 'local_inventario', label: 'Inventario Barra', icon: Package },
        { id: 'local_staff', label: 'Equipo / Staff', icon: Users },
        { id: 'local_agenda', label: 'Programación', icon: Clock },
        { id: 'tareas', label: 'Tareas', icon: ListTodo },
        { id: 'redes', label: 'Redes & Contenido', icon: Share2 },
        { id: 'masterplan', label: 'Master Plan', icon: Target },
    ] : [
        { id: 'perfil', label: 'Resumen', icon: FileText },
        { id: 'agenda', label: 'Agenda del Día', icon: Clock },
        ...(!isSpecialProject ? [{ id: 'listas', label: 'Listas del Evento', icon: Users }] : []),
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

            {/* LOCAL: RESUMEN INICIO */}
            {event.type === 'local' && activeTab === 'local_inicio' && (() => {
                const tables = event.tables || [];
                const inventory = event.inventory || [];
                const staff = event.staff || [];
                
                const reservedTablesCount = tables.filter(t => t.status === 'Reservado').length;
                const occupiedTablesCount = tables.filter(t => t.status === 'Ocupado').length;
                const totalTablesCount = tables.length;
                
                const activeBookingsRatio = totalTablesCount > 0 ? ((reservedTablesCount + occupiedTablesCount) / totalTablesCount) * 100 : 0;
                
                const vipDeposits = tables.reduce((acc, t) => acc + (parseFloat(t.deposit) || 0), 0);
                const barSalesEst = inventory.reduce((acc, item) => {
                    if (item.status === 'Bajo Stock' || item.status === 'Sin Stock') {
                        const estimatedSold = Math.max(0, (item.minStock + 5) - item.quantity);
                        return acc + (estimatedSold * item.price);
                    }
                    return acc;
                }, 0);
                const totalIncomeEst = vipDeposits + barSalesEst + (occupiedTablesCount * 150);
                
                const presentStaffCount = staff.filter(s => s.status === 'Presente').length;
                const totalStaffCount = staff.length;
                
                const lowStockCount = inventory.filter(i => i.status === 'Bajo Stock' || i.status === 'Sin Stock').length;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${color}` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                                    <Star size={22} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Reservas VIP</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        {reservedTablesCount + occupiedTablesCount} / {totalTablesCount} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>({activeBookingsRatio.toFixed(0)}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                        <div style={{ width: `${activeBookingsRatio}%`, height: '100%', background: color }} />
                                    </div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid #10b981` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `#10b98115`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                    <DollarSign size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Caja / Ingresos Est.</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        ${totalIncomeEst.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        Abonos: ${vipDeposits} | Consumos Est: ${barSalesEst}
                                    </div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid #3b82f6` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `#3b82f615`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                    <Users size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Staff Activo</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        {presentStaffCount} / {totalStaffCount} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>en turno</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        Roster completo: {totalStaffCount} personas
                                    </div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid #f59e0b` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `#f59e0b15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                    <Package size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Alertas Inventario</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        {lowStockCount} alertas <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>críticas</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        Total botellas/ítems: {inventory.length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Split Section */}
                        <div className="grid-2" style={{ alignItems: 'start' }}>
                            {/* Left: Quick Schedule / Upcoming */}
                            <div className="card" style={{ padding: '24px' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} color={color} /> Programación de Noches
                                </h3>
                                {(event.agenda || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px', background: 'var(--bg-secondary)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                                        Sin noches temáticas registradas.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {(event.agenda || []).map((ag) => (
                                            <div key={ag.id} style={{ display: 'flex', gap: '16px', padding: '14px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: color, minWidth: '60px' }}>{ag.time}</div>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{ag.title}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{ag.speaker}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{ag.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right: Venue Notes */}
                            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} color={color} /> Notas del Establecimiento
                                </h3>
                                <textarea
                                    className="form-textarea"
                                    rows={8}
                                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', resize: 'vertical' }}
                                    placeholder="Escribe indicaciones operativas para el local, claves del wifi, contactos de proveedores de hielo/bebidas..."
                                    value={event.notes || ''}
                                    onChange={(e) => updateEvent(event.id, { notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* LOCAL: RESERVAS & BOXES VIP */}
            {event.type === 'local' && activeTab === 'local_reservas' && (() => {
                const defaultTables = [
                    { id: 't-b1', name: 'Box VIP 1', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-b2', name: 'Box VIP 2', capacity: 10, minConsumption: 500, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-b3', name: 'Box VIP 3', capacity: 12, minConsumption: 600, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-b4', name: 'Box VIP 4', capacity: 8, minConsumption: 400, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-m1', name: 'Mesa Gold 1', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-m2', name: 'Mesa Gold 2', capacity: 6, minConsumption: 250, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-m3', name: 'Mesa Silver 1', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 },
                    { id: 't-m4', name: 'Mesa Silver 2', capacity: 4, minConsumption: 150, status: 'Disponible', client: '', promoter: '', phone: '', deposit: 0 }
                ];
                const tables = event.tables || defaultTables;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Mapa & Reservas de Boxes / Mesas VIP</h3>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#22c55e' }} /> Disponible</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b' }} /> Reservado</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4444' }} /> Ocupado</span>
                                </div>
                            </div>

                            {/* Tables Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                {tables.map((table, idx) => {
                                    const isReserved = table.status === 'Reservado';
                                    const isOccupied = table.status === 'Ocupado';
                                    const isAvailable = table.status === 'Disponible' || (!isReserved && !isOccupied);
                                    
                                    const statusColor = isAvailable ? '#22c55e' : isReserved ? '#f59e0b' : '#ef4444';
                                    const statusBg = isAvailable ? 'rgba(34,197,94,0.1)' : isReserved ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                                    
                                    const isDragging = draggedTableIdx === idx;
                                    const isOver = dragOverTableIdx === idx;

                                    return (
                                        <div key={table.id}
                                            draggable
                                            onDragStart={(e) => handleTableDragStart(e, idx)}
                                            onDragOver={(e) => handleTableDragOver(e, idx)}
                                            onDrop={(e) => handleTableDrop(e, idx)}
                                            onDragEnd={handleTableDragEnd}
                                            className="card" style={{
                                                padding: '16px',
                                                border: isOver ? `2px dashed ${color}` : `1px solid ${statusColor}30`,
                                                background: isDragging ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--bg-surface), rgba(15,15,25,0.4))',
                                                borderRadius: '16px',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                opacity: isDragging ? 0.4 : 1,
                                                transform: isDragging ? 'scale(0.98)' : 'none',
                                            }}>
                                            <div style={{
                                                position: 'absolute', top: 0, right: 0,
                                                padding: '4px 10px', borderRadius: '0 0 0 12px',
                                                fontSize: '10px', fontWeight: 700,
                                                color: statusColor, background: statusBg,
                                                textTransform: 'uppercase'
                                            }}>{table.status}</div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingRight: '65px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'grab' }} title="Arrastra para reordenar">
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginRight: '2px', userSelect: 'none', fontWeight: 'bold' }}>⋮⋮</span>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Star size={14} color={statusColor} fill={!isAvailable ? statusColor : 'none'} />
                                                        {table.name}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button 
                                                        disabled={idx === 0} 
                                                        onClick={(e) => { e.stopPropagation(); moveTable(idx, -1); }}
                                                        style={{ 
                                                            background: 'rgba(255,255,255,0.05)', 
                                                            border: 'none', 
                                                            color: idx === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', 
                                                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                                            fontSize: '10px',
                                                            padding: '4px 6px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Mover antes"
                                                    >
                                                        ◀
                                                    </button>
                                                    <button 
                                                        disabled={idx === tables.length - 1} 
                                                        onClick={(e) => { e.stopPropagation(); moveTable(idx, 1); }}
                                                        style={{ 
                                                            background: 'rgba(255,255,255,0.05)', 
                                                            border: 'none', 
                                                            color: idx === tables.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)', 
                                                            cursor: idx === tables.length - 1 ? 'not-allowed' : 'pointer',
                                                            fontSize: '10px',
                                                            padding: '4px 6px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Mover después"
                                                    >
                                                        ▶
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                                <div>Capacidad: <strong style={{ color: '#fff' }}>{table.capacity} pax</strong></div>
                                                <div>Consumo Min: <strong style={{ color: '#fff' }}>${table.minConsumption}</strong></div>
                                                {!isAvailable && (
                                                    <>
                                                        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '6px 0' }} />
                                                        <div>Cliente: <strong style={{ color: '#fff' }}>{table.client}</strong></div>
                                                        {table.promoter && <div>Promotor: <strong>{table.promoter}</strong></div>}
                                                        {table.phone && <div>Contacto: <strong>{table.phone}</strong></div>}
                                                        <div>Abono: <strong style={{ color: '#22c55e' }}>${table.deposit}</strong></div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                                                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => openTableEdit(table)}>
                                                    <Edit3 size={11} /> {isAvailable ? 'Reservar' : 'Editar'}
                                                </button>
                                                {!isAvailable && (
                                                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', color: '#ef4444' }} onClick={() => releaseTable(table.id)}>
                                                        Liberar
                                                    </button>
                                                )}
                                                {isReserved && (
                                                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px', background: '#22c55e', borderColor: '#22c55e', color: '#fff' }} onClick={() => occupyTable(table.id)}>
                                                        Llegó
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal: Reservar/Editar Mesa */}
                        {editingTable && (
                            <div className="modal-overlay" style={{ zIndex: 1000 }}>
                                <div className="modal" style={{ maxWidth: '420px' }}>
                                    <div className="modal-header">
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Reservación: {editingTable.name}</h3>
                                        <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setEditingTable(null)}><X size={18} /></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Estado de la Mesa</label>
                                            <select className="form-select" value={editingTable.status} onChange={e => setEditingTable({ ...editingTable, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                                <option value="Disponible">Disponible</option>
                                                <option value="Reservado">Reservado</option>
                                                <option value="Ocupado">Ocupado</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Nombre del Cliente</label>
                                            <input className="form-input" value={editingTable.client || ''} onChange={e => setEditingTable({ ...editingTable, client: e.target.value })} placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Instagram / Teléfono</label>
                                            <input className="form-input" value={editingTable.phone || ''} onChange={e => setEditingTable({ ...editingTable, phone: e.target.value })} placeholder="Ej. @juanp.pty" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Promotor Asignado</label>
                                            <select className="form-select" value={editingTable.promoter || ''} onChange={e => setEditingTable({ ...editingTable, promoter: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                                <option value="">-- Sin Promotor --</option>
                                                {promoters.map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Consumo Mínimo ($)</label>
                                                <input type="number" className="form-input" value={editingTable.minConsumption || 0} onChange={e => setEditingTable({ ...editingTable, minConsumption: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Abono / Depósito ($)</label>
                                                <input type="number" className="form-input" value={editingTable.deposit || 0} onChange={e => setEditingTable({ ...editingTable, deposit: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                                        <button className="btn btn-ghost" onClick={() => setEditingTable(null)}>Cancelar</button>
                                        <button className="btn btn-primary" style={{ background: color, borderColor: color }} onClick={saveTable}>Guardar Reserva</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* LOCAL: INVENTARIO DE BARRA */}
            {event.type === 'local' && activeTab === 'local_inventario' && (() => {
                const defaultInventory = [
                    { id: 'inv-1', name: 'Ron Abuelo 12 Años', category: 'Licores', quantity: 24, cost: 25.0, price: 90.0, minStock: 5, status: 'Normal' },
                    { id: 'inv-2', name: 'Whisky Old Parr 12 Años', category: 'Licores', quantity: 18, cost: 30.0, price: 110.0, minStock: 6, status: 'Normal' },
                    { id: 'inv-3', name: 'Vodka Grey Goose', category: 'Licores', quantity: 4, cost: 35.0, price: 120.0, minStock: 5, status: 'Bajo Stock' },
                    { id: 'inv-4', name: 'Ginebra Tanqueray', category: 'Licores', quantity: 15, cost: 20.0, price: 85.0, minStock: 4, status: 'Normal' },
                    { id: 'inv-5', name: 'Tequila Don Julio Reposado', category: 'Licores', quantity: 0, cost: 45.0, price: 150.0, minStock: 3, status: 'Sin Stock' },
                    { id: 'inv-6', name: 'Cerveza Corona (Caja x24)', category: 'Cervezas', quantity: 12, cost: 18.0, price: 48.0, minStock: 10, status: 'Normal' },
                    { id: 'inv-7', name: 'Red Bull (Caja x24)', category: 'Bebidas/Mixers', quantity: 8, cost: 22.0, price: 72.0, minStock: 15, status: 'Bajo Stock' },
                    { id: 'inv-8', name: 'Agua Tónica Fever-Tree (Caja)', category: 'Bebidas/Mixers', quantity: 20, cost: 15.0, price: 50.0, minStock: 5, status: 'Normal' }
                ];
                const inventory = event.inventory || defaultInventory;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Inventario de Barra</h3>
                                <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 14px', background: color, borderColor: color }} onClick={() => openInventoryEdit()}>
                                    <Plus size={14} /> Agregar Producto
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '12px' }}>Producto</th>
                                            <th style={{ padding: '12px' }}>Categoría</th>
                                            <th style={{ padding: '12px', textAlign: 'center' }}>Stock Cantidad</th>
                                            <th style={{ padding: '12px' }}>Costo Compra</th>
                                            <th style={{ padding: '12px' }}>Precio Venta</th>
                                            <th style={{ padding: '12px' }}>Estado Stock</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventory.map(item => {
                                            const statusStyle = 
                                                item.status === 'Sin Stock' ? { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' } :
                                                item.status === 'Bajo Stock' ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' } :
                                                { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };

                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <td style={{ padding: '12px', fontWeight: 600 }}>{item.name}</td>
                                                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.category}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '14px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => adjustStock(item.id, -1)}>-</button>
                                                            <strong style={{ fontSize: '14px', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</strong>
                                                            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '14px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => adjustStock(item.id, 1)}>+</button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>${item.cost}</td>
                                                    <td style={{ padding: '12px', fontWeight: 600, color: '#10b981' }}>${item.price}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: statusStyle.color, background: statusStyle.bg }}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => openInventoryEdit(item)}><Edit3 size={13} /></button>
                                                            <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => deleteInventory(item.id)}><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal: Agregar/Editar Producto */}
                        {editingInventory && (
                            <div className="modal-overlay" style={{ zIndex: 1000 }}>
                                <div className="modal" style={{ maxWidth: '420px' }}>
                                    <div className="modal-header">
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{editingInventory.name ? 'Editar Producto' : 'Nuevo Producto Barra'}</h3>
                                        <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setEditingInventory(null)}><X size={18} /></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Nombre del Producto</label>
                                            <input className="form-input" value={editingInventory.name} onChange={e => setEditingInventory({ ...editingInventory, name: e.target.value })} placeholder="Ej. Whisky Chivas 12 Años" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Categoría</label>
                                                <select className="form-select" value={editingInventory.category} onChange={e => setEditingInventory({ ...editingInventory, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                                    <option value="Licores">Licores</option>
                                                    <option value="Cervezas">Cervezas</option>
                                                    <option value="Bebidas/Mixers">Bebidas/Mixers</option>
                                                    <option value="Otros">Otros</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Stock Mínimo Alerta</label>
                                                <input type="number" className="form-input" value={editingInventory.minStock} onChange={e => setEditingInventory({ ...editingInventory, minStock: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Cantidad Inicial en Stock</label>
                                            <input type="number" className="form-input" value={editingInventory.quantity} onChange={e => setEditingInventory({ ...editingInventory, quantity: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Costo Compra ($)</label>
                                                <input type="number" className="form-input" value={editingInventory.cost} onChange={e => setEditingInventory({ ...editingInventory, cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Precio Venta ($)</label>
                                                <input type="number" className="form-input" value={editingInventory.price} onChange={e => setEditingInventory({ ...editingInventory, price: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                                        <button className="btn btn-ghost" onClick={() => setEditingInventory(null)}>Cancelar</button>
                                        <button className="btn btn-primary" style={{ background: color, borderColor: color }} onClick={saveInventory}>Guardar Producto</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* LOCAL: STAFF Y TURNOS */}
            {event.type === 'local' && activeTab === 'local_staff' && (() => {
                const defaultStaff = [
                    { id: 'st-1', name: 'Alejandro G.', role: 'Gerente de Turno', phone: '6789-0123', shift: '19:00 - 04:00', pay: 80, status: 'Presente' },
                    { id: 'st-2', name: 'David M.', role: 'Bartender Principal', phone: '6543-0987', shift: '20:00 - 04:00', pay: 50, status: 'Presente' },
                    { id: 'st-3', name: 'Laura S.', role: 'Bartender', phone: '6211-5432', shift: '20:00 - 04:00', pay: 45, status: 'Retrasado' },
                    { id: 'st-4', name: 'Moisés R.', role: 'Seguridad Jefe', phone: '6333-8888', shift: '19:00 - 04:00', pay: 60, status: 'Presente' },
                    { id: 'st-5', name: 'Grupo Seguridad (x4)', role: 'Seguridad Externo', phone: '-', shift: '21:00 - 04:00', pay: 160, status: 'Presente' },
                    { id: 'st-6', name: 'Estefanía L.', role: 'Cajera', phone: '6999-7777', shift: '20:00 - 04:00', pay: 40, status: 'Presente' },
                    { id: 'st-7', name: 'DJ Gianluca', role: 'DJ Residente', phone: '6111-9999', shift: '22:00 - 03:30', pay: 150, status: 'Ausente' }
                ];
                const staff = event.staff || defaultStaff;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Roster de Personal y Control de Asistencia</h3>
                                <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 14px', background: color, borderColor: color }} onClick={() => openStaffEdit()}>
                                    <Plus size={14} /> Agregar Personal
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '12px' }}>Empleado</th>
                                            <th style={{ padding: '12px' }}>Rol / Función</th>
                                            <th style={{ padding: '12px' }}>Shift Horario</th>
                                            <th style={{ padding: '12px' }}>Pago Diario</th>
                                            <th style={{ padding: '12px' }}>Contacto</th>
                                            <th style={{ padding: '12px' }}>Asistencia</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staff.map(member => {
                                            const statusColor = 
                                                member.status === 'Presente' ? '#22c55e' : 
                                                member.status === 'Retrasado' ? '#f59e0b' : 
                                                member.status === 'Ausente' ? '#ef4444' : 'var(--text-secondary)';

                                            return (
                                                <tr key={member.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <td style={{ padding: '12px', fontWeight: 600 }}>{member.name}</td>
                                                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{member.role}</td>
                                                    <td style={{ padding: '12px' }}>{member.shift}</td>
                                                    <td style={{ padding: '12px', fontWeight: 600 }}>${member.pay}</td>
                                                    <td style={{ padding: '12px', color: 'var(--text-tertiary)' }}>{member.phone}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <select
                                                            value={member.status}
                                                            onChange={e => toggleStaffStatus(member.id, e.target.value)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                background: `${statusColor}15`,
                                                                color: statusColor
                                                            }}
                                                        >
                                                            {['Presente', 'Retrasado', 'Ausente', 'Libre'].map(st => (
                                                                <option key={st} value={st}>{st}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => openStaffEdit(member)}><Edit3 size={13} /></button>
                                                            <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => deleteStaff(member.id)}><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal: Agregar/Editar Personal */}
                        {editingStaff && (
                            <div className="modal-overlay" style={{ zIndex: 1000 }}>
                                <div className="modal" style={{ maxWidth: '420px' }}>
                                    <div className="modal-header">
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{editingStaff.name ? 'Editar Empleado' : 'Nuevo Miembro de Staff'}</h3>
                                        <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setEditingStaff(null)}><X size={18} /></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Nombre</label>
                                            <input className="form-input" value={editingStaff.name} onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })} placeholder="Ej. David Méndez" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Rol / Puesto</label>
                                            <input className="form-input" value={editingStaff.role} onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value })} placeholder="Ej. Bartender, Dj, Seguridad, Cajera..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Horario del Turno</label>
                                            <input className="form-input" value={editingStaff.shift} onChange={e => setEditingStaff({ ...editingStaff, shift: e.target.value })} placeholder="Ej. 20:00 - 04:00" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                        </div>
                                        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Contacto / Teléfono</label>
                                                <input className="form-input" value={editingStaff.phone} onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })} placeholder="Ej. 6543-2109" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Pago / Tarifa Diaria ($)</label>
                                                <input type="number" className="form-input" value={editingStaff.pay} onChange={e => setEditingStaff({ ...editingStaff, pay: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                                        <button className="btn btn-ghost" onClick={() => setEditingStaff(null)}>Cancelar</button>
                                        <button className="btn btn-primary" style={{ background: color, borderColor: color }} onClick={saveStaff}>Guardar Personal</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* LOCAL: PROGRAMACIÓN */}
            {event.type === 'local' && activeTab === 'local_agenda' && (() => {
                const monthNames = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ];
                const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                
                const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
                const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
                
                const days = [];
                const totalDays = getDaysInMonth(calYear, calMonth);
                const firstDayIndex = getFirstDayOfMonth(calYear, calMonth);
                
                // Prev month padding
                const prevMonth = calMonth === 0 ? 11 : calMonth - 1;
                const prevYear = calMonth === 0 ? calYear - 1 : calYear;
                const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
                for (let i = firstDayIndex - 1; i >= 0; i--) {
                    days.push({
                        day: daysInPrevMonth - i,
                        month: prevMonth,
                        year: prevYear,
                        isCurrentMonth: false
                    });
                }
                
                // Current month
                for (let i = 1; i <= totalDays; i++) {
                    days.push({
                        day: i,
                        month: calMonth,
                        year: calYear,
                        isCurrentMonth: true
                    });
                }
                
                // Next month padding to keep 6 rows grid
                const remaining = 42 - days.length;
                const nextMonth = calMonth === 11 ? 0 : calMonth + 1;
                const nextYear = calMonth === 11 ? calYear + 1 : calYear;
                for (let i = 1; i <= remaining; i++) {
                    days.push({
                        day: i,
                        month: nextMonth,
                        year: nextYear,
                        isCurrentMonth: false
                    });
                }

                const handlePrevMonth = () => {
                    if (calMonth === 0) {
                        setCalMonth(11);
                        setCalYear(calYear - 1);
                    } else {
                        setCalMonth(calMonth - 1);
                    }
                };

                const handleNextMonth = () => {
                    if (calMonth === 11) {
                        setCalMonth(0);
                        setCalYear(calYear + 1);
                    } else {
                        setCalMonth(calMonth + 1);
                    }
                };

                const handleGoToToday = () => {
                    const today = new Date();
                    setCalMonth(today.getMonth());
                    setCalYear(today.getFullYear());
                    setSelectedDateStr(today.toISOString().split('T')[0]);
                };

                const handleSyncToGoogle = async (agItem) => {
                    const res = await syncEventToGoogleCalendar(agItem);
                    if (res.success) {
                        const updatedAgenda = (event.agenda || []).map(a => 
                            a.id === agItem.id ? { ...a, googleEventId: res.googleEventId } : a
                        );
                        updateEvent(event.id, { agenda: updatedAgenda });
                        alert("¡Sincronizado con éxito en tu Google Calendar!");
                    } else {
                        alert(`Error de sincronización: ${res.error}`);
                    }
                };

                const getWeekDays = (dateStr) => {
                    const date = new Date(dateStr + 'T12:00:00');
                    const day = date.getDay();
                    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday adjustment
                    
                    const weekdaysList = [];
                    const monday = new Date(date.setDate(diff));
                    
                    for (let i = 0; i < 7; i++) {
                        const d = new Date(monday);
                        d.setDate(monday.getDate() + i);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const dateString = `${yyyy}-${mm}-${dd}`;
                        
                        // Capitalize Spanish weekday names
                        const rawDayName = d.toLocaleDateString('es-PA', { weekday: 'long' });
                        const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);
                        
                        weekdaysList.push({
                            dateStr: dateString,
                            dateObj: d,
                            dayName,
                            dayNum: d.getDate(),
                            monthNameShort: d.toLocaleDateString('es-PA', { month: 'short' })
                        });
                    }
                    return weekdaysList;
                };

                const weekDays = getWeekDays(selectedDateStr);
                const mondayInfo = weekDays[0];
                const sundayInfo = weekDays[6];

                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '20px', alignItems: 'start' }}>
                        {/* CALENDAR COLUMN */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                                        {monthNames[calMonth]} {calYear}
                                    </h3>
                                    <span style={{ fontSize: '11px', background: `${color}15`, color: color, padding: '4px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                        Calendario 212 Club
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {gcalToken ? (
                                        <button 
                                            className="btn btn-ghost" 
                                            style={{ padding: '6px 12px', fontSize: '11px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={disconnectGoogleCalendar}
                                            title="Cerrar sesión de Google"
                                        >
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                            GCal Conectado
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={connectGoogleCalendar}
                                        >
                                            🔌 Google Calendar
                                        </button>
                                    )}
                                    <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={handleGoToToday}>Hoy</button>
                                    <button className="btn btn-ghost" style={{ padding: '6px', minWidth: '30px' }} onClick={handlePrevMonth}>◀</button>
                                    <button className="btn btn-ghost" style={{ padding: '6px', minWidth: '30px' }} onClick={handleNextMonth}>▶</button>
                                </div>
                            </div>

                            {/* Weekdays Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', marginBottom: '10px', textAlign: 'center' }}>
                                {weekdays.map(d => (
                                    <div key={d} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '6px 0' }}>{d}</div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
                                {days.map((d, index) => {
                                    const dateStr = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                                    const isSelected = dateStr === selectedDateStr;
                                    const dayEvents = [
                                        ...(event.agenda || []).filter(ag => ag.date === dateStr),
                                        ...googleCalendarEvents.filter(ag => ag.date === dateStr)
                                    ];
                                    
                                    const today = new Date();
                                    const isToday = today.getDate() === d.day && today.getMonth() === d.month && today.getFullYear() === d.year;

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedDateStr(dateStr)}
                                            onDoubleClick={() => openAgendaEdit(null, dateStr)}
                                            style={{
                                                height: '80px',
                                                padding: '6px',
                                                borderRadius: '8px',
                                                background: isSelected ? 'rgba(16, 185, 129, 0.05)' : d.isCurrentMonth ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.15)',
                                                border: `1px solid ${isSelected ? color : isToday ? `${color}40` : 'var(--border-subtle)'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                opacity: d.isCurrentMonth ? 1 : 0.4
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = `${color}40`;
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                                    e.currentTarget.style.background = d.isCurrentMonth ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.15)';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '12px', 
                                                    fontWeight: isToday || isSelected ? 700 : 500, 
                                                    color: isToday ? color : isSelected ? '#fff' : 'var(--text-primary)',
                                                    background: isToday ? `${color}20` : 'transparent',
                                                    width: isToday ? '20px' : 'auto',
                                                    height: isToday ? '20px' : 'auto',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {d.day}
                                                </span>
                                                {dayEvents.length > 0 && (
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dayEvents.some(x => x.isGoogleEvent) ? '#4285f4' : color }} />
                                                )}
                                            </div>

                                            {/* Small Event Pill list */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                                {dayEvents.slice(0, 2).map((ag, eidx) => {
                                                    const isGCal = ag.isGoogleEvent;
                                                    return (
                                                        <div 
                                                            key={ag.id || eidx} 
                                                            style={{ 
                                                                fontSize: '9px', 
                                                                background: isGCal ? 'rgba(66, 133, 244, 0.15)' : `${color}15`, 
                                                                color: '#fff', 
                                                                padding: '2px 4px', 
                                                                borderRadius: '4px', 
                                                                borderLeft: `2px solid ${isGCal ? '#4285f4' : color}`,
                                                                overflow: 'hidden', 
                                                                textOverflow: 'ellipsis', 
                                                                whiteSpace: 'nowrap' 
                                                            }}
                                                            title={`${isGCal ? '[Google] ' : ''}${ag.title}`}
                                                        >
                                                            {ag.time} {ag.title}
                                                        </div>
                                                    );
                                                })}
                                                {dayEvents.length > 2 && (
                                                    <div style={{ fontSize: '8px', color: 'var(--text-tertiary)', textAlign: 'right', fontWeight: 600 }}>
                                                        +{dayEvents.length - 2} más
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* AGENDA DETAILS SIDEBAR */}
                        <div className="card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                                        Programación Semanal
                                    </h4>
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                        {mondayInfo.dayNum} {mondayInfo.monthNameShort} - {sundayInfo.dayNum} {sundayInfo.monthNameShort}
                                    </span>
                                </div>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ fontSize: '12px', padding: '6px 12px', background: color, borderColor: color, display: 'flex', alignItems: 'center', gap: '4px' }} 
                                    onClick={() => openAgendaEdit(null, selectedDateStr)}
                                >
                                    <Plus size={12} /> Programar
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                                {weekDays.map((wd) => {
                                    const isSelectedDay = wd.dateStr === selectedDateStr;
                                    const dayEvents = [
                                        ...(event.agenda || []).filter(ag => ag.date === wd.dateStr),
                                        ...googleCalendarEvents.filter(ag => ag.date === wd.dateStr)
                                    ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                                    return (
                                        <div 
                                            key={wd.dateStr} 
                                            style={{ 
                                                padding: '12px', 
                                                borderRadius: '10px', 
                                                background: isSelectedDay ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.1)', 
                                                border: isSelectedDay ? `1px solid ${color}` : '1px solid var(--border-subtle)',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isSelectedDay ? `0 0 10px ${color}15` : 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedDateStr(wd.dateStr)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ 
                                                        fontSize: '12px', 
                                                        fontWeight: 700, 
                                                        color: isSelectedDay ? '#fff' : 'var(--text-secondary)'
                                                    }}>
                                                        {wd.dayName} {wd.dayNum}
                                                    </span>
                                                    {isSelectedDay && (
                                                        <span style={{ 
                                                            fontSize: '9px', 
                                                            background: `${color}20`, 
                                                            color: color, 
                                                            padding: '1px 5px', 
                                                            borderRadius: '4px',
                                                            fontWeight: 600
                                                        }}>
                                                            Seleccionado
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    className="btn-icon" 
                                                    style={{ 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        fontSize: '10px', 
                                                        background: 'rgba(255,255,255,0.05)', 
                                                        border: '1px solid var(--border-subtle)',
                                                        color: 'var(--text-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '2px'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openAgendaEdit(null, wd.dateStr);
                                                    }}
                                                    title="Programar para este día"
                                                >
                                                    <Plus size={10} /> Add
                                                </button>
                                            </div>

                                            {dayEvents.length === 0 ? (
                                                <div style={{ padding: '6px 4px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                                    Sin noches temáticas
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {dayEvents.map((ag) => (
                                                        <div 
                                                            key={ag.id} 
                                                            style={{ 
                                                                padding: '8px 10px', 
                                                                borderRadius: '6px', 
                                                                background: 'rgba(255,255,255,0.02)', 
                                                                border: '1px solid rgba(255,255,255,0.03)'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDateStr(wd.dateStr);
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                                <span style={{ 
                                                                    fontSize: '10px', 
                                                                    fontWeight: 700, 
                                                                    color: ag.isGoogleEvent ? '#4285f4' : color, 
                                                                    background: ag.isGoogleEvent ? 'rgba(66, 133, 244, 0.15)' : `${color}15`, 
                                                                    padding: '1px 4px', 
                                                                    borderRadius: '3px' 
                                                                }}>
                                                                    {ag.time}
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    {ag.isGoogleEvent ? (
                                                                        <span style={{ fontSize: '9px', color: '#4285f4', fontWeight: 600, background: 'rgba(66, 133, 244, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>GCal</span>
                                                                    ) : (
                                                                        <>
                                                                            {gcalToken && !ag.googleEventId && (
                                                                                <button 
                                                                                    className="btn btn-ghost" 
                                                                                    style={{ padding: '1px 4px', fontSize: '9px', color: '#4285f4', border: '1px solid rgba(66, 133, 244, 0.2)', background: 'rgba(66, 133, 244, 0.05)', borderRadius: '3px' }} 
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleSyncToGoogle(ag);
                                                                                    }}
                                                                                    title="Sincronizar a Google Calendar"
                                                                                >
                                                                                    Sync ⬆
                                                                                </button>
                                                                            )}
                                                                            {ag.googleEventId && (
                                                                                <span style={{ fontSize: '8px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 3px', borderRadius: '3px', display: 'flex', alignItems: 'center' }} title="Sincronizado con Google Calendar">✓ GCal</span>
                                                                            )}
                                                                            <button 
                                                                                className="btn-icon" 
                                                                                style={{ padding: '2px', borderRadius: '4px' }} 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    openAgendaEdit(ag);
                                                                                }}
                                                                            >
                                                                                <Edit3 size={10} />
                                                                            </button>
                                                                            <button 
                                                                                className="btn-icon" 
                                                                                style={{ padding: '2px', borderRadius: '4px', color: '#ef4444' }} 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const updated = (event.agenda || []).filter(x => x.id !== ag.id);
                                                                                    updateEvent(event.id, { agenda: updated });
                                                                                }}
                                                                            >
                                                                                <Trash2 size={10} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <h5 style={{ margin: '2px 0', fontSize: '12px', fontWeight: 600, color: '#fff' }}>{ag.title}</h5>
                                                            {ag.speaker && <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>🎧 {ag.speaker}</div>}
                                                            {ag.description && <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '1.3' }}>{ag.description}</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Upcoming Events Mini-list */}
                            <div style={{ marginTop: '24px' }}>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Próximos Eventos
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                    {[...(event.agenda || []), ...googleCalendarEvents]
                                        .filter(ag => {
                                            const today = new Date().toISOString().split('T')[0];
                                            return (ag.date || '') >= today;
                                        })
                                        .sort((a, b) => {
                                            const dateA = a.date || '';
                                            const dateB = b.date || '';
                                            if (dateA !== dateB) return dateA.localeCompare(dateB);
                                            return (a.time || '').localeCompare(b.time || '');
                                        })
                                        .slice(0, 5)
                                        .map(ag => (
                                            <div 
                                                key={ag.id} 
                                                onClick={() => setSelectedDateStr(ag.date)}
                                                style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center', 
                                                    padding: '8px 10px', 
                                                    borderRadius: '8px', 
                                                    background: ag.date === selectedDateStr ? 'rgba(255,255,255,0.05)' : 'transparent', 
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontWeight: 600, color: '#fff' }}>{ag.title}</span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{ag.date} · {ag.time} {ag.isGoogleEvent ? '· [Google]' : ''}</span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: ag.isGoogleEvent ? '#4285f4' : color, fontWeight: 600 }}>▶</span>
                                            </div>
                                        ))
                                    }
                                    {[...(event.agenda || []), ...googleCalendarEvents].filter(ag => (ag.date || '') >= new Date().toISOString().split('T')[0]).length === 0 && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                            No hay eventos futuros programados.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* TV Show quick info bar */}
                    {isTvShow && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: `4px solid ${color}` }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}><Tv size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Frecuencia</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{event.showFrequency || 'Semanal'}</div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #8b5cf6' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#8b5cf615', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><Calendar size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Día de Emisión</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{event.showDay || 'Por definir'}</div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Clock size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Duración</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{event.showDuration || '60 min'}</div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #3b82f6' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#3b82f615', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}><Radio size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Canal / Plataforma</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{event.showChannel || 'Por definir'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="card" style={{ padding: '24px' }}>
                                <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <FileText size={16} color={color} /> {isTvShow ? 'Sobre el Programa' : 'Descripción del Evento'}
                                </h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line', margin: 0 }}>
                                    {event.description || 'Sin descripción detallada.'}
                                </p>
                            </div>

                            {/* TV Show segment preview */}
                            {isTvShow && (
                                <div className="card" style={{ padding: '24px' }}>
                                    <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Layers size={16} color={color} /> Estructura del Programa
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(event.segments || []).sort((a, b) => a.order - b.order).map((seg, idx) => (
                                            <div key={seg.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '10px 14px', borderRadius: '10px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-subtle)'
                                            }}>
                                                <div style={{
                                                    width: '28px', height: '28px', borderRadius: '8px',
                                                    background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '12px', fontWeight: 700
                                                }}>{idx + 1}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{seg.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{seg.type} · {seg.duration}</div>
                                                </div>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                    background: `${color}12`, color
                                                }}>{seg.duration}</span>
                                            </div>
                                        ))}
                                        {(event.segments || []).length === 0 && (
                                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>
                                                Ve a la pestaña "Producción" para definir los segmentos.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="card" style={{ padding: '24px' }}>
                                <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Target size={16} color={color} /> Detalles Clave
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {isTvShow ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={14} /> Segmentos</span>
                                                <span style={{ fontWeight: 600 }}>{(event.segments || []).length} segmentos</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><PlayCircle size={14} /> Episodios</span>
                                                <span style={{ fontWeight: 600 }}>{(event.episodes || []).length} programados</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Crew</span>
                                                <span style={{ fontWeight: 600 }}>{(event.crew || []).filter(c => c.name).length} / {(event.crew || []).length} asignados</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> Requerimientos</span>
                                                <span style={{ fontWeight: 600 }}>{requirements.length} items</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* TV Show: upcoming episodes quick view */}
                            {isTvShow && (event.episodes || []).length > 0 && (
                                <div className="card" style={{ padding: '24px' }}>
                                    <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <PlayCircle size={16} color={color} /> Próximos Episodios
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {(event.episodes || []).slice(0, 4).map(ep => (
                                            <div key={ep.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px', borderRadius: '10px',
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Hash size={14} style={{ color: 'var(--text-tertiary)' }} />
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Ep. {ep.number} — {ep.title}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{ep.date || 'Sin fecha'} · {ep.guest || 'Sin invitado'}</div>
                                                    </div>
                                                </div>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                    background: ep.status === 'Grabado' ? 'rgba(34,197,94,0.15)' : ep.status === 'Pre-producción' ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.15)',
                                                    color: ep.status === 'Grabado' ? '#22c55e' : ep.status === 'Pre-producción' ? '#f59e0b' : 'var(--text-secondary)'
                                                }}>{ep.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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

                    {/* ZONAS DEL FESTIVAL */}
                    <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={16} color={color} /> Zonas y Escenarios del Festival
                                </h4>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                    Define y selecciona las zonas para organizar las actividades del festival.
                                </p>
                            </div>
                            <button 
                                className="btn btn-ghost" 
                                style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)' }}
                                onClick={() => setIsManagingZones(true)}
                            >
                                <Edit3 size={12} /> Administrar Zonas
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={() => setSelectedMapLocation(null)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: !selectedMapLocation ? `${color}20` : 'rgba(255,255,255,0.05)',
                                    color: !selectedMapLocation ? color : 'var(--text-secondary)',
                                    border: `1px solid ${!selectedMapLocation ? color : 'var(--border-subtle)'}`,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Todas las Zonas ({agenda.length})
                            </button>
                            
                            {zones.map((zoneName, idx) => {
                                const isSelected = selectedMapLocation === zoneName;
                                const palette = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];
                                const zoneColor = palette[idx % palette.length];
                                const zoneActivities = agenda.filter(a => a.speaker === zoneName);

                                return (
                                    <button
                                        key={zoneName}
                                        onClick={() => setSelectedMapLocation(isSelected ? null : zoneName)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: isSelected ? `${zoneColor}20` : 'rgba(255,255,255,0.02)',
                                            color: isSelected ? '#fff' : 'var(--text-primary)',
                                            border: `1px solid ${isSelected ? zoneColor : 'var(--border-subtle)'}`,
                                            boxShadow: isSelected ? `0 0 10px ${zoneColor}25` : 'none',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: zoneColor }} />
                                        {zoneName}
                                        <span style={{ 
                                            background: isSelected ? zoneColor : 'rgba(255,255,255,0.08)', 
                                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                                            padding: '1px 5px', 
                                            borderRadius: '10px', 
                                            fontSize: '10px',
                                            fontWeight: 700
                                        }}>
                                            {zoneActivities.length}
                                        </span>
                                    </button>
                                );
                            })}

                            {zones.length === 0 && (
                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                    No hay zonas creadas. Haz clic en "Administrar Zonas" para agregar la primera.
                                </span>
                            )}
                        </div>

                        {/* Selected Zone Detail Panel */}
                        {selectedMapLocation && (() => {
                            const zoneIdx = zones.indexOf(selectedMapLocation);
                            const palette = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];
                            const zoneColor = zoneIdx !== -1 ? palette[zoneIdx % palette.length] : color;
                            const zoneActivities = agenda.filter(a => a.speaker === selectedMapLocation);

                            return (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: `1px solid ${zoneColor}30`,
                                    background: `linear-gradient(135deg, ${zoneColor}05, transparent)`,
                                    borderLeft: `4px solid ${zoneColor}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <div>
                                            <h5 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                                                Actividades en {selectedMapLocation}
                                            </h5>
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                {zoneActivities.length} actividad{zoneActivities.length !== 1 ? 'es' : ''} programada{zoneActivities.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            style={{ fontSize: '11px', padding: '6px 12px', background: zoneColor, borderColor: zoneColor }}
                                            onClick={() => {
                                                setEditingAgenda({
                                                    id: `ag-${Date.now()}`, 
                                                    date: event.date || '',
                                                    time: '18:00', 
                                                    title: '',
                                                    speaker: selectedMapLocation, 
                                                    description: ''
                                                });
                                            }}
                                        >
                                            <Plus size={11} /> Agregar aquí
                                        </button>
                                    </div>
                                    
                                    {zoneActivities.length === 0 ? (
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '6px 0' }}>
                                            No hay actividades en esta zona. Haz clic en "Agregar aquí" para programar una.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {zoneActivities.sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(item => {
                                                const statusColor = item.orgStatus === 'listo' ? '#22c55e' : item.orgStatus === 'en-progreso' ? '#3b82f6' : item.orgStatus === 'problema' ? '#ef4444' : '#f59e0b';
                                                return (
                                                    <div key={item.id} onClick={() => openActivityOrg(item)} style={{
                                                        display: 'flex', gap: '14px', padding: '10px 12px',
                                                        background: 'var(--bg-secondary)', borderRadius: '8px',
                                                        border: '1px solid var(--border-subtle)', alignItems: 'center',
                                                        cursor: 'pointer', transition: 'all 0.15s ease'
                                                    }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                                                        <div style={{
                                                            width: '45px', flexShrink: 0, fontWeight: 700,
                                                            fontSize: '13px', color: zoneColor
                                                        }}>
                                                            {item.time || '—'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>{item.title}</div>
                                                        </div>
                                                        <ChevronRight size={12} style={{ opacity: 0.4 }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

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
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
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
                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Fecha</label>
                                <input type="date" className="form-input" value={editingAgenda.date || ''} onChange={e => setEditingAgenda({ ...editingAgenda, date: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Hora</label>
                                <input type="time" className="form-input" value={editingAgenda.time || '20:00'} onChange={e => setEditingAgenda({ ...editingAgenda, time: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Temática / Título del Evento</label>
                                <input className="form-input" placeholder="Ej: Neon Party / Ladies Night" value={editingAgenda.title || ''} onChange={e => setEditingAgenda({ ...editingAgenda, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            {event.type === 'festival' ? (
                                <div className="form-group" style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Zona / Escenario</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select 
                                            className="form-select" 
                                            value={editingAgenda.speaker || ''} 
                                            onChange={e => setEditingAgenda({ ...editingAgenda, speaker: e.target.value })}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: '#fff' }}
                                        >
                                            <option value="">-- Seleccionar Zona --</option>
                                            {zones.map(z => (
                                                <option key={z} value={z}>{z}</option>
                                            ))}
                                        </select>
                                        <button 
                                            type="button"
                                            className="btn btn-ghost"
                                            style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', fontSize: '12px', background: 'rgba(255,255,255,0.02)' }}
                                            onClick={() => {
                                                const name = prompt("Nombre de la nueva zona:");
                                                if (name && name.trim()) {
                                                    addZone(name);
                                                    setEditingAgenda({ ...editingAgenda, speaker: name.trim() });
                                                }
                                            }}
                                        >
                                            + Nueva
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group" style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Artista / DJ / Host (Opcional)</label>
                                    <input className="form-input" placeholder="Ej: DJ Axwell / Banda Invitada" value={editingAgenda.speaker || ''} onChange={e => setEditingAgenda({ ...editingAgenda, speaker: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Detalles / Promoción (Opcional)</label>
                                <textarea className="form-textarea" rows={3} placeholder="Ej: Barra libre para chicas de 9 a 11 PM" value={editingAgenda.description || ''} onChange={e => setEditingAgenda({ ...editingAgenda, description: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-ghost" onClick={closeAgendaEdit}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveAgenda}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Administrar Zonas */}
            {isManagingZones && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3>Administrar Zonas y Escenarios</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setIsManagingZones(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Nombre de la nueva zona (ej: Domo VIP)" 
                                    value={newZoneName} 
                                    onChange={e => setNewZoneName(e.target.value)} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            addZone(newZoneName);
                                            setNewZoneName('');
                                        }
                                    }}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} 
                                />
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => {
                                        addZone(newZoneName);
                                        setNewZoneName('');
                                    }}
                                >
                                    Agregar
                                </button>
                            </div>

                            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {zones.map((zoneName) => (
                                    <div 
                                        key={zoneName} 
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '10px 14px', 
                                            borderRadius: '8px', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            border: '1px solid var(--border-subtle)' 
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{zoneName}</span>
                                        <button 
                                            className="btn-icon" 
                                            style={{ color: '#ef4444', padding: '4px' }}
                                            onClick={() => removeZone(zoneName)}
                                            title="Eliminar Zona (las actividades asociadas quedarán sin zona)"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {zones.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '13px' }}>
                                        Aún no hay zonas creadas. Usa el campo de arriba para crear una.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => setIsManagingZones(false)}>Listo</button>
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

            {/* Modal Agregar/Editar Promotor en Lista */}
            {editingListPromoter && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Promotor del Evento</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeListPromoterEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Seleccionar Promotor Global (Opcional)</label>
                                <select 
                                    className="form-select" 
                                    value={promoters.find(p => p.name === editingListPromoter.name)?.id || ''} 
                                    onChange={e => {
                                        const selected = promoters.find(p => p.id === e.target.value);
                                        if (selected) {
                                            setEditingListPromoter({
                                                ...editingListPromoter,
                                                name: selected.name,
                                                code: selected.name.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900)
                                            });
                                        }
                                    }}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
                                >
                                    <option value="">-- Seleccionar o escribir abajo --</option>
                                    {promoters.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre del Promotor</label>
                                <input className="form-input" value={editingListPromoter.name} onChange={e => setEditingListPromoter({ ...editingListPromoter, name: e.target.value })} placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Código Promotor</label>
                                    <input className="form-input" value={editingListPromoter.code} onChange={e => setEditingListPromoter({ ...editingListPromoter, code: e.target.value })} placeholder="Ej. JUA-123" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                                    <input className="form-input" value={editingListPromoter.phone} onChange={e => setEditingListPromoter({ ...editingListPromoter, phone: e.target.value })} placeholder="Ej. 6543-2109" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                            </div>
                            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Pax Objetivo (Meta)</label>
                                    <input type="number" className="form-input" value={editingListPromoter.targetGuests} onChange={e => setEditingListPromoter({ ...editingListPromoter, targetGuests: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Comisión por pax ($)</label>
                                    <input type="number" className="form-input" value={editingListPromoter.commission} onChange={e => setEditingListPromoter({ ...editingListPromoter, commission: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Estado</label>
                                <select className="form-select" value={editingListPromoter.status} onChange={e => setEditingListPromoter({ ...editingListPromoter, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                    <option value="Confirmado">Confirmado</option>
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <button className="btn btn-ghost" onClick={closeListPromoterEdit}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: color, borderColor: color }} onClick={saveListPromoter}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Agregar/Editar Chica de Imagen en Lista */}
            {editingListGirl && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Chica de Imagen</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeListGirlEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Seleccionar Chica Global (Opcional)</label>
                                <select 
                                    className="form-select" 
                                    value={imageGirls.find(g => g.name === editingListGirl.name)?.id || ''} 
                                    onChange={e => {
                                        const selected = imageGirls.find(g => g.id === e.target.value);
                                        if (selected) {
                                            setEditingListGirl({
                                                ...editingListGirl,
                                                name: selected.name,
                                                phone: selected.ig
                                            });
                                        }
                                    }}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
                                >
                                    <option value="">-- Seleccionar o escribir abajo --</option>
                                    {imageGirls.map(g => (
                                        <option key={g.id} value={g.id}>{g.name} ({g.ig})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre</label>
                                <input className="form-input" value={editingListGirl.name} onChange={e => setEditingListGirl({ ...editingListGirl, name: e.target.value })} placeholder="Ej. Sofía" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Rol asignado</label>
                                    <select className="form-select" value={editingListGirl.role} onChange={e => setEditingListGirl({ ...editingListGirl, role: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                        <option value="Mesa">Mesa</option>
                                        <option value="Contenido">Contenido</option>
                                        <option value="Shots">Shots / Animación</option>
                                        <option value="Hospedaje">Hospedaje</option>
                                        <option value="Protocolo">Protocolo</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Hora de Entrada</label>
                                    <input className="form-input" value={editingListGirl.entryTime} onChange={e => setEditingListGirl({ ...editingListGirl, entryTime: e.target.value })} placeholder="Ej. 22:00" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                            </div>
                            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Instagram / Teléfono</label>
                                    <input className="form-input" value={editingListGirl.phone} onChange={e => setEditingListGirl({ ...editingListGirl, phone: e.target.value })} placeholder="Ej. @sofia.pty" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tarifa / Pago ($)</label>
                                    <input type="number" className="form-input" value={editingListGirl.fee} onChange={e => setEditingListGirl({ ...editingListGirl, fee: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Estado de Confirmación</label>
                                <select className="form-select" value={editingListGirl.status} onChange={e => setEditingListGirl({ ...editingListGirl, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                    <option value="Confirmada">Confirmada</option>
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="No disponible">No disponible</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <button className="btn btn-ghost" onClick={closeListGirlEdit}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: '#ec4899', borderColor: '#ec4899' }} onClick={saveListGirl}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Agregar/Editar Invitado en Lista */}
            {editingListInvitation && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Invitado a la Lista</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeListInvitationEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nombre del Invitado</label>
                                <input className="form-input" value={editingListInvitation.name} onChange={e => setEditingListInvitation({ ...editingListInvitation, name: e.target.value })} placeholder="Ej. Carlos Torres" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Teléfono</label>
                                <input className="form-input" value={editingListInvitation.phone} onChange={e => setEditingListInvitation({ ...editingListInvitation, phone: e.target.value })} placeholder="Ej. 6111-2222" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                            </div>
                            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Invitado por</label>
                                    <select 
                                        className="form-select" 
                                        value={editingListInvitation.invitedBy} 
                                        onChange={e => setEditingListInvitation({ ...editingListInvitation, invitedBy: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
                                    >
                                        <option value="Organizador">Organizador</option>
                                        <option value="General">General / Web</option>
                                        {(event.promotersList || []).map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo de Acceso</label>
                                    <select className="form-select" value={editingListInvitation.accessType} onChange={e => setEditingListInvitation({ ...editingListInvitation, accessType: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                        <option value="General">General</option>
                                        <option value="VIP">VIP</option>
                                        <option value="Mesa">Mesa</option>
                                        <option value="Free-pass">Free-pass</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Acompañantes</label>
                                    <input type="number" className="form-input" value={editingListInvitation.companions} onChange={e => setEditingListInvitation({ ...editingListInvitation, companions: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Estado Asistencia</label>
                                    <select className="form-select" value={editingListInvitation.status} onChange={e => setEditingListInvitation({ ...editingListInvitation, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Confirmado">Confirmado</option>
                                        <option value="Llegó">Llegó</option>
                                        <option value="No Asistió">No Asistió</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <button className="btn btn-ghost" onClick={closeListInvitationEdit}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={saveListInvitation}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PRODUCCIÓN TAB (TV Show) ═══ */}
            {activeTab === 'produccion' && isTvShow && (() => {
                const segments = (event.segments || []).sort((a,b) => a.order - b.order);
                const episodes = event.episodes || [];
                const crew = event.crew || [];
                const assignedCrew = crew.filter(c => c.name);
                const segTypeColors = { Apertura:'#10b981', Entrevista:'#3b82f6', Performance:'#ec4899', Ranking:'#f59e0b', Documental:'#8b5cf6', Interactivo:'#06b6d4', Cierre:'#6b7280' };
                return (
                <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
                        {[
                            { label:'Segmentos', val:`${segments.length}`, sub:'definidos', icon:Layers, clr:color },
                            { label:'Episodios', val:`${episodes.length}`, sub:episodes.filter(e=>e.status==='Grabado').length+' grabados', icon:PlayCircle, clr:'#8b5cf6' },
                            { label:'Crew', val:`${assignedCrew.length}/${crew.length}`, sub:'asignados', icon:Users, clr:'#3b82f6' },
                        ].map((s,i)=>(
                            <div key={i} className="card" style={{ padding:'20px', display:'flex', alignItems:'center', gap:'16px', borderLeft:`4px solid ${s.clr}` }}>
                                <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:`${s.clr}15`, display:'flex', alignItems:'center', justifyContent:'center', color:s.clr }}><s.icon size={22}/></div>
                                <div><div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{s.label}</div><div style={{ fontSize:'20px', fontWeight:700, marginTop:'2px' }}>{s.val} <span style={{ fontSize:'13px', fontWeight:500, color:'var(--text-tertiary)' }}>{s.sub}</span></div></div>
                            </div>
                        ))}
                    </div>
                    {/* Sub-tabs */}
                    <div className="card" style={{ padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' }}>
                        <div style={{ display:'flex', gap:'8px' }}>
                            {[{id:'segments',label:'Segmentos',icon:Layers,clr:color},{id:'episodes',label:'Parrilla / Episodios',icon:PlayCircle,clr:'#8b5cf6'},{id:'crew',label:'Equipo de Producción',icon:Users,clr:'#3b82f6'}].map(t=>(
                                <button key={t.id} onClick={()=>setTvSubTab(t.id)} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', transition:'all 0.2s', background:tvSubTab===t.id?`${t.clr}15`:'transparent', color:tvSubTab===t.id?t.clr:'var(--text-secondary)', border:tvSubTab===t.id?`1px solid ${t.clr}35`:'1px solid transparent' }}><t.icon size={16}/> {t.label}</button>
                            ))}
                        </div>
                        {tvSubTab==='segments' && <button className="btn btn-primary" style={{ fontSize:'13px', padding:'8px 14px', background:color, borderColor:color }} onClick={()=>openSegmentEdit()}><Plus size={14}/> Agregar Segmento</button>}
                        {tvSubTab==='episodes' && <button className="btn btn-primary" style={{ fontSize:'13px', padding:'8px 14px', background:'#8b5cf6', borderColor:'#8b5cf6' }} onClick={()=>openEpisodeEdit()}><Plus size={14}/> Nuevo Episodio</button>}
                        {tvSubTab==='crew' && <button className="btn btn-primary" style={{ fontSize:'13px', padding:'8px 14px', background:'#3b82f6', borderColor:'#3b82f6' }} onClick={()=>openCrewEdit()}><Plus size={14}/> Agregar Miembro</button>}
                    </div>

                    {/* SEGMENTS */}
                    {tvSubTab==='segments' && (
                        <div className="card" style={{ padding:'24px' }}>
                            {segments.length===0 ? (
                                <div style={{ textAlign:'center', padding:'40px 20px', background:'var(--bg-secondary)', borderRadius:'12px' }}>
                                    <Layers size={32} style={{ color:'var(--text-tertiary)', marginBottom:'12px' }}/><h4 style={{ margin:'0 0 8px', fontSize:'15px' }}>Sin segmentos definidos</h4><p style={{ margin:0, fontSize:'13px', color:'var(--text-secondary)', marginBottom:'16px' }}>Define los segmentos que componen cada episodio del programa.</p>
                                    <button className="btn btn-primary" style={{ fontSize:'13px', background:color, borderColor:color }} onClick={()=>openSegmentEdit()}><Plus size={14}/> Agregar Segmento</button>
                                </div>
                            ) : (
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                    {segments.map((seg,idx)=>(
                                        <div key={seg.id} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 18px', borderRadius:'12px', background:'var(--bg-secondary)', border:'1px solid var(--border-subtle)' }}>
                                            <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${color}18`, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>{idx+1}</div>
                                            <div style={{ flex:1 }}>
                                                <div style={{ fontSize:'14px', fontWeight:600 }}>{seg.name}</div>
                                                <div style={{ fontSize:'12px', color:'var(--text-tertiary)', marginTop:'2px' }}>{seg.description}</div>
                                            </div>
                                            <span style={{ padding:'3px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:600, background:`${segTypeColors[seg.type]||'#6b7280'}15`, color:segTypeColors[seg.type]||'#6b7280' }}>{seg.type}</span>
                                            <span style={{ fontSize:'13px', fontWeight:600, color:'var(--text-secondary)', minWidth:'55px', textAlign:'right' }}>{seg.duration}</span>
                                            <div style={{ display:'flex', gap:'4px' }}>
                                                <button className="btn btn-ghost" style={{ padding:'4px' }} onClick={()=>openSegmentEdit(seg)}><Edit3 size={14}/></button>
                                                <button className="btn btn-ghost" style={{ padding:'4px', color:'#ef4444' }} onClick={()=>deleteSegment(seg.id)}><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* EPISODES */}
                    {tvSubTab==='episodes' && (
                        <div className="card" style={{ padding:'24px' }}>
                            {episodes.length===0 ? (
                                <div style={{ textAlign:'center', padding:'40px 20px', background:'var(--bg-secondary)', borderRadius:'12px' }}>
                                    <PlayCircle size={32} style={{ color:'var(--text-tertiary)', marginBottom:'12px' }}/><h4 style={{ margin:'0 0 8px', fontSize:'15px' }}>Sin episodios programados</h4>
                                    <button className="btn btn-primary" style={{ fontSize:'13px', background:'#8b5cf6', borderColor:'#8b5cf6' }} onClick={()=>openEpisodeEdit()}><Plus size={14}/> Nuevo Episodio</button>
                                </div>
                            ) : (
                                <div style={{ overflowX:'auto' }}>
                                    <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:'13px' }}>
                                        <thead><tr style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                                            {['#','Título','Fecha','Artista Invitado','Estado','Notas',''].map((h,i)=><th key={i} style={{ padding:'12px', color:'var(--text-secondary)', fontWeight:500, ...(i===6?{textAlign:'right'}:{}) }}>{h}</th>)}
                                        </tr></thead>
                                        <tbody>{episodes.map(ep=>(
                                            <tr key={ep.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                                                <td style={{ padding:'12px', fontWeight:700 }}>{ep.number}</td>
                                                <td style={{ padding:'12px', fontWeight:600 }}>{ep.title}</td>
                                                <td style={{ padding:'12px', color:'var(--text-secondary)' }}>{ep.date||'Sin fecha'}</td>
                                                <td style={{ padding:'12px' }}>{ep.guest||<span style={{ color:'var(--text-tertiary)' }}>Por confirmar</span>}</td>
                                                <td style={{ padding:'12px' }}>
                                                    <select value={ep.status} onChange={e=>{const updated=episodes.map(x=>x.id===ep.id?{...x,status:e.target.value}:x);updateEvent(event.id,{episodes:updated})}} style={{ padding:'4px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:600, border:'none', cursor:'pointer', background:ep.status==='Grabado'?'rgba(34,197,94,0.15)':ep.status==='Pre-producción'?'rgba(245,158,11,0.15)':ep.status==='Editando'?'rgba(59,130,246,0.15)':'rgba(107,114,128,0.15)', color:ep.status==='Grabado'?'#22c55e':ep.status==='Pre-producción'?'#f59e0b':ep.status==='Editando'?'#3b82f6':'var(--text-secondary)' }}>
                                                        {['Planeación','Pre-producción','Grabando','Editando','Grabado','Publicado'].map(s=><option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding:'12px', color:'var(--text-tertiary)', fontSize:'12px', maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.notes||'-'}</td>
                                                <td style={{ padding:'12px', textAlign:'right' }}>
                                                    <button className="btn btn-ghost" style={{ padding:'4px' }} onClick={()=>openEpisodeEdit(ep)}><Edit3 size={14}/></button>
                                                    <button className="btn btn-ghost" style={{ padding:'4px', color:'#ef4444' }} onClick={()=>deleteEpisode(ep.id)}><Trash2 size={14}/></button>
                                                </td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CREW */}
                    {tvSubTab==='crew' && (
                        <div className="card" style={{ padding:'24px' }}>
                            {crew.length===0 ? (
                                <div style={{ textAlign:'center', padding:'40px 20px', background:'var(--bg-secondary)', borderRadius:'12px' }}>
                                    <Users size={32} style={{ color:'var(--text-tertiary)', marginBottom:'12px' }}/><h4 style={{ margin:'0 0 8px', fontSize:'15px' }}>Sin equipo definido</h4>
                                    <button className="btn btn-primary" style={{ fontSize:'13px', background:'#3b82f6', borderColor:'#3b82f6' }} onClick={()=>openCrewEdit()}><Plus size={14}/> Agregar Miembro</button>
                                </div>
                            ) : (
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px' }}>
                                    {crew.map(m=>(
                                        <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 18px', borderRadius:'12px', background:'var(--bg-secondary)', border:'1px solid var(--border-subtle)' }}>
                                            <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:m.name?'#3b82f618':'var(--bg-surface)', display:'flex', alignItems:'center', justifyContent:'center', color:m.name?'#3b82f6':'var(--text-tertiary)', border:'1px solid var(--border-subtle)' }}><User size={18}/></div>
                                            <div style={{ flex:1 }}>
                                                <div style={{ fontSize:'13px', fontWeight:600 }}>{m.name||<span style={{ color:'var(--text-tertiary)', fontStyle:'italic' }}>Sin asignar</span>}</div>
                                                <div style={{ fontSize:'12px', color:'var(--text-tertiary)' }}>{m.role}</div>
                                            </div>
                                            <span style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'10px', fontWeight:600, background:m.department==='Talento'?'rgba(236,72,153,0.12)':m.department==='Cámaras'?'rgba(59,130,246,0.12)':m.department==='Audio'?'rgba(245,158,11,0.12)':'rgba(107,114,128,0.12)', color:m.department==='Talento'?'#ec4899':m.department==='Cámaras'?'#3b82f6':m.department==='Audio'?'#f59e0b':'var(--text-secondary)' }}>{m.department}</span>
                                            <div style={{ display:'flex', gap:'2px' }}>
                                                <button className="btn btn-ghost" style={{ padding:'4px' }} onClick={()=>openCrewEdit(m)}><Edit3 size={13}/></button>
                                                <button className="btn btn-ghost" style={{ padding:'4px', color:'#ef4444' }} onClick={()=>deleteCrew(m.id)}><Trash2 size={13}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>);
            })()}

            {/* Modal: Segment */}
            {editingSegment && (
                <div className="modal-overlay" style={{ zIndex:1000 }}><div className="modal" style={{ maxWidth:'450px' }}>
                    <div className="modal-header"><h3 style={{ margin:0, fontSize:'16px', fontWeight:600 }}>Segmento del Programa</h3><button className="btn btn-ghost" style={{ padding:'8px' }} onClick={()=>setEditingSegment(null)}><X size={18}/></button></div>
                    <div className="modal-body">
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Nombre del Segmento</label><input className="form-input" value={editingSegment.name} onChange={e=>setEditingSegment({...editingSegment,name:e.target.value})} placeholder="Ej. Entrevista Artista" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Tipo</label><select className="form-select" value={editingSegment.type} onChange={e=>setEditingSegment({...editingSegment,type:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}>{['Apertura','Entrevista','Performance','Ranking','Documental','Interactivo','Cierre','Comercial','Otro'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Duración</label><input className="form-input" value={editingSegment.duration} onChange={e=>setEditingSegment({...editingSegment,duration:e.target.value})} placeholder="Ej. 10 min" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        </div>
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Orden</label><input type="number" className="form-input" value={editingSegment.order} onChange={e=>setEditingSegment({...editingSegment,order:parseInt(e.target.value)||1})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Descripción</label><textarea className="form-input" value={editingSegment.description} onChange={e=>setEditingSegment({...editingSegment,description:e.target.value})} rows={3} placeholder="Descripción del segmento..." style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)', resize:'vertical' }}/></div>
                    </div>
                    <div className="modal-footer" style={{ display:'flex', justifyContent:'flex-end', gap:'12px', padding:'16px 20px', borderTop:'1px solid var(--border-subtle)' }}><button className="btn btn-ghost" onClick={()=>setEditingSegment(null)}>Cancelar</button><button className="btn btn-primary" style={{ background:color, borderColor:color }} onClick={saveSegment}>Guardar</button></div>
                </div></div>
            )}

            {/* Modal: Episode */}
            {editingEpisode && (
                <div className="modal-overlay" style={{ zIndex:1000 }}><div className="modal" style={{ maxWidth:'450px' }}>
                    <div className="modal-header"><h3 style={{ margin:0, fontSize:'16px', fontWeight:600 }}>Episodio</h3><button className="btn btn-ghost" style={{ padding:'8px' }} onClick={()=>setEditingEpisode(null)}><X size={18}/></button></div>
                    <div className="modal-body">
                        <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'12px', marginBottom:'16px' }}>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>#</label><input type="number" className="form-input" value={editingEpisode.number} onChange={e=>setEditingEpisode({...editingEpisode,number:parseInt(e.target.value)||1})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Título</label><input className="form-input" value={editingEpisode.title} onChange={e=>setEditingEpisode({...editingEpisode,title:e.target.value})} placeholder="Ej. Episodio Piloto" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Fecha de Grabación</label><input type="date" className="form-input" value={editingEpisode.date} onChange={e=>setEditingEpisode({...editingEpisode,date:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Artista Invitado</label><input className="form-input" value={editingEpisode.guest} onChange={e=>setEditingEpisode({...editingEpisode,guest:e.target.value})} placeholder="Nombre del artista" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        </div>
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Estado</label><select className="form-select" value={editingEpisode.status} onChange={e=>setEditingEpisode({...editingEpisode,status:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}>{['Planeación','Pre-producción','Grabando','Editando','Grabado','Publicado'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Notas</label><textarea className="form-input" value={editingEpisode.notes} onChange={e=>setEditingEpisode({...editingEpisode,notes:e.target.value})} rows={2} placeholder="Notas del episodio..." style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)', resize:'vertical' }}/></div>
                    </div>
                    <div className="modal-footer" style={{ display:'flex', justifyContent:'flex-end', gap:'12px', padding:'16px 20px', borderTop:'1px solid var(--border-subtle)' }}><button className="btn btn-ghost" onClick={()=>setEditingEpisode(null)}>Cancelar</button><button className="btn btn-primary" style={{ background:'#8b5cf6', borderColor:'#8b5cf6' }} onClick={saveEpisode}>Guardar</button></div>
                </div></div>
            )}

            {/* Modal: Crew */}
            {editingCrew && (
                <div className="modal-overlay" style={{ zIndex:1000 }}><div className="modal" style={{ maxWidth:'420px' }}>
                    <div className="modal-header"><h3 style={{ margin:0, fontSize:'16px', fontWeight:600 }}>Miembro del Equipo</h3><button className="btn btn-ghost" style={{ padding:'8px' }} onClick={()=>setEditingCrew(null)}><X size={18}/></button></div>
                    <div className="modal-body">
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Nombre</label><input className="form-input" value={editingCrew.name} onChange={e=>setEditingCrew({...editingCrew,name:e.target.value})} placeholder="Nombre de la persona" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        <div style={{ marginBottom:'16px' }}><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Rol / Posición</label><input className="form-input" value={editingCrew.role} onChange={e=>setEditingCrew({...editingCrew,role:e.target.value})} placeholder="Ej. Director, Camarógrafo" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}/></div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Departamento</label><select className="form-select" value={editingCrew.department} onChange={e=>setEditingCrew({...editingCrew,department:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}>{['Talento','Dirección','Producción','Cámaras','Audio','Post-producción','Redes Sociales','Arte','Técnico','Otro'].map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                            <div><label style={{ display:'block', fontSize:'13px', fontWeight:500, marginBottom:'6px' }}>Estado</label><select className="form-select" value={editingCrew.status} onChange={e=>setEditingCrew({...editingCrew,status:e.target.value})} style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'var(--bg-surface)' }}>{['Confirmado','Por asignar','En negociación','No disponible'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ display:'flex', justifyContent:'flex-end', gap:'12px', padding:'16px 20px', borderTop:'1px solid var(--border-subtle)' }}><button className="btn btn-ghost" onClick={()=>setEditingCrew(null)}>Cancelar</button><button className="btn btn-primary" style={{ background:'#3b82f6', borderColor:'#3b82f6' }} onClick={saveCrew}>Guardar</button></div>
                </div></div>
            )}

            {/* ═══ LISTAS ESPECIALES TAB ═══ */}
            {activeTab === 'listas' && !isSpecialProject && (() => {
                const promotersList = event.promotersList || [];
                const girlsList = event.girlsList || [];
                const invitationsList = event.invitationsList || [];

                // Simple calculated counts/metrics
                const confirmedPromoters = promotersList.filter(p => p.status === 'Confirmado').length;
                const activeGirls = girlsList.filter(g => g.status === 'Confirmada').length;
                const totalCompanions = invitationsList.reduce((acc, i) => acc + (parseInt(i.companions) || 0), 0);
                const totalGuests = invitationsList.length + totalCompanions;
                const arrivedGuests = invitationsList.filter(i => i.status === 'Llegó').length;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* 🌟 STATS OVERVIEW CARD */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '16px'
                        }}>
                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${color}` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                                    <Briefcase size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Promotores Activos</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        {confirmedPromoters} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}>/ {promotersList.length} total</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid #ec4899` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ec489915', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                                    <Star size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Chicas de Imagen</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        {activeGirls} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}>/ {girlsList.length} total</span>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid #3b82f6` }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#3b82f615', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                    <Users size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lista de Invitados</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                                        {arrivedGuests} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}>llegaron de {totalGuests}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🌟 TABS SELECTION HEADER */}
                        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setListSubTab('promoters')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: listSubTab === 'promoters' ? `${color}15` : 'transparent',
                                        color: listSubTab === 'promoters' ? color : 'var(--text-secondary)',
                                        border: listSubTab === 'promoters' ? `1px solid ${color}35` : '1px solid transparent'
                                    }}
                                >
                                    <Briefcase size={16} /> Lista de Promotores
                                </button>
                                <button
                                    onClick={() => setListSubTab('girls')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: listSubTab === 'girls' ? '#ec489915' : 'transparent',
                                        color: listSubTab === 'girls' ? '#ec4899' : 'var(--text-secondary)',
                                        border: listSubTab === 'girls' ? `1px solid #ec489935` : '1px solid transparent'
                                    }}
                                >
                                    <Star size={16} /> Chicas de Imagen
                                </button>
                                <button
                                    onClick={() => setListSubTab('invitations')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: listSubTab === 'invitations' ? '#3b82f615' : 'transparent',
                                        color: listSubTab === 'invitations' ? '#3b82f6' : 'var(--text-secondary)',
                                        border: listSubTab === 'invitations' ? `1px solid #3b82f635` : '1px solid transparent'
                                    }}
                                >
                                    <Users size={16} /> Lista de Invitación
                                </button>
                            </div>
                            
                            {/* ACTION BUTTON */}
                            {listSubTab === 'promoters' && (
                                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px', background: color, borderColor: color }} onClick={() => openListPromoterEdit()}>
                                    <Plus size={14} /> Agregar Promotor
                                </button>
                            )}
                            {listSubTab === 'girls' && (
                                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px', background: '#ec4899', borderColor: '#ec4899' }} onClick={() => openListGirlEdit()}>
                                    <Plus size={14} /> Agregar Chica de Imagen
                                </button>
                            )}
                            {listSubTab === 'invitations' && (
                                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px', background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => openListInvitationEdit()}>
                                    <Plus size={14} /> Agregar Invitado
                                </button>
                            )}
                        </div>

                        {/* 🌟 SUB-TAB CONTENTS */}
                        
                        {/* 1. LISTA DE PROMOTORES */}
                        {listSubTab === 'promoters' && (
                            <div className="card" style={{ padding: '24px' }}>
                                {promotersList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                        <Briefcase size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Sin promotores en este evento</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Agrega promotores para llevar el control de sus códigos e invitados.</p>
                                        <button className="btn btn-primary" style={{ fontSize: '13px', background: color, borderColor: color }} onClick={() => openListPromoterEdit()}>
                                            <Plus size={14} /> Agregar Promotor
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Nombre</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Código</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Teléfono</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Invitados Objetivo</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Comisión por pax</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado</th>
                                                    <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {promotersList.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                        <td style={{ padding: '12px', fontWeight: 600 }}>{item.name}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{ fontFamily: 'monospace', padding: '3px 6px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px' }}>
                                                                {item.code || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.phone || '-'}</td>
                                                        <td style={{ padding: '12px' }}>{item.targetGuests || 0} pax</td>
                                                        <td style={{ padding: '12px', fontWeight: 500 }}>${item.commission || 0}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{
                                                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                                background: item.status === 'Confirmado' ? 'rgba(34,197,94,0.15)' : item.status === 'Pendiente' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                                color: item.status === 'Confirmado' ? '#22c55e' : item.status === 'Pendiente' ? '#f59e0b' : '#ef4444'
                                                            }}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => openListPromoterEdit(item)}><Edit3 size={14} /></button>
                                                            <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => deleteListPromoter(item.id)}><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. LISTA DE CHICAS DE IMAGEN */}
                        {listSubTab === 'girls' && (
                            <div className="card" style={{ padding: '24px' }}>
                                {girlsList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                        <Star size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Sin chicas de imagen asignadas</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Registra modelos, roles y estado de confirmación para este evento.</p>
                                        <button className="btn btn-primary" style={{ fontSize: '13px', background: '#ec4899', borderColor: '#ec4899' }} onClick={() => openListGirlEdit()}>
                                            <Plus size={14} /> Agregar Chica de Imagen
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Nombre</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Rol asignado</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Hora de entrada</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Teléfono/Instagram</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tarifa / Pago</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado</th>
                                                    <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {girlsList.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                        <td style={{ padding: '12px', fontWeight: 600 }}>{item.name}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{ padding: '3px 8px', background: 'rgba(236,72,153,0.1)', color: '#ec4899', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                                                {item.role}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.entryTime || '22:00'}</td>
                                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.phone || '-'}</td>
                                                        <td style={{ padding: '12px', fontWeight: 500 }}>${item.fee || 0}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{
                                                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                                background: item.status === 'Confirmada' ? 'rgba(34,197,94,0.15)' : item.status === 'Pendiente' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                                color: item.status === 'Confirmada' ? '#22c55e' : item.status === 'Pendiente' ? '#f59e0b' : '#ef4444'
                                                            }}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => openListGirlEdit(item)}><Edit3 size={14} /></button>
                                                            <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => deleteListGirl(item.id)}><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. LISTA DE INVITACIONES */}
                        {listSubTab === 'invitations' && (
                            <div className="card" style={{ padding: '24px' }}>
                                {invitationsList.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                        <Users size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Sin invitados en la lista</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Agrega invitados, indica quién los invitó, su tipo de pase y controle su asistencia.</p>
                                        <button className="btn btn-primary" style={{ fontSize: '13px', background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => openListInvitationEdit()}>
                                            <Plus size={14} /> Agregar Invitado
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Invitado</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Teléfono</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Invitado por</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Acceso</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Acompañantes</th>
                                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado Asistencia</th>
                                                    <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invitationsList.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                        <td style={{ padding: '12px', fontWeight: 600 }}>{item.name}</td>
                                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.phone || '-'}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{ padding: '3px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '11px' }}>
                                                                {item.invitedBy}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            <span style={{
                                                                padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                                background: item.accessType === 'VIP' ? 'rgba(168,85,247,0.15)' : item.accessType === 'Mesa' ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.15)',
                                                                color: item.accessType === 'VIP' ? '#a855f7' : item.accessType === 'Mesa' ? '#3b82f6' : 'var(--text-secondary)'
                                                            }}>
                                                                {item.accessType}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 500 }}>+{item.companions || 0}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <select
                                                                value={item.status}
                                                                onChange={(e) => {
                                                                    const updated = invitationsList.map(inv => inv.id === item.id ? { ...inv, status: e.target.value } : inv);
                                                                    updateEvent(event.id, { invitationsList: updated });
                                                                }}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    background: item.status === 'Llegó' ? 'rgba(34,197,94,0.15)' : item.status === 'Confirmado' ? 'rgba(59,130,246,0.15)' : item.status === 'No Asistió' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                                    color: item.status === 'Llegó' ? '#22c55e' : item.status === 'Confirmado' ? '#3b82f6' : item.status === 'No Asistió' ? '#ef4444' : '#f59e0b'
                                                                }}
                                                            >
                                                                <option value="Pendiente">Pendiente</option>
                                                                <option value="Confirmado">Confirmado</option>
                                                                <option value="Llegó">Llegó</option>
                                                                <option value="No Asistió">No Asistió</option>
                                                            </select>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => openListInvitationEdit(item)}><Edit3 size={14} /></button>
                                                            <button className="btn btn-ghost" style={{ padding: '4px', color: '#ef4444' }} onClick={() => deleteListInvitation(item.id)}><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

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
