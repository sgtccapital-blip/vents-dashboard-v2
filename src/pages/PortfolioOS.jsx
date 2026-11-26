import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { isDone } from '../lib/status';
import {
    Briefcase, Target, ListTodo, GitPullRequest, Radio, Sparkles,
    CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight, Plus,
    Search, Filter, Layers, Zap, ExternalLink, Calendar, User,
    FileText, Check, ShieldAlert, Cpu, Trash2, Edit3, X, ChevronRight,
    TrendingUp, MessageSquare, Send, BookOpen, AlertCircle, Link2, CalendarDays,
    Rocket, CheckCircle
} from 'lucide-react';

// Cada tarjeta del Portafolio sale del proyecto guardado en la base (Proyectos).
// Los textos de la ficha (objetivo, siguiente acción, bloqueos…) se editan en el propio proyecto.
const kpiLabel = (p) => {
    const k = p.kpi && typeof p.kpi === 'object' && p.kpi.name
        ? `${p.kpi.name}: ${p.kpi.current ?? 0}/${p.kpi.target ?? '?'} ${p.kpi.unit || ''}`.trim()
        : (typeof p.kpi === 'string' ? p.kpi : '');
    return [k, p.kpiText].filter(Boolean).join(' · ');
};

const toPortfolioProject = (p, allEvents = []) => {
    const color = p.color || '#3b82f6';
    let rawEventIds = [];
    if (Array.isArray(p.eventIds)) {
        rawEventIds = p.eventIds;
    } else if (p.eventId) {
        rawEventIds = [p.eventId];
    } else {
        // Valores iniciales inteligentes para vincular proyectos clave con sus eventos de base
        if (p.id === 'proj-venues-panama') rawEventIds = ['ev-terraplen-rooftop', 'ev-furia-panama', 'ev-piano-bar'];
        else if (p.id === 'portfolio-hangout') rawEventIds = ['ev-terraplen-rooftop', 'ev-urban-nights'];
        else if (p.id === 'proj-arrive-agency') rawEventIds = ['ev-terraplen-rooftop', 'ev-furia-panama', 'ev-piano-bar', 'evt-1779135935446'];
        else if (p.id === 'proj-wedding-content') rawEventIds = ['ev-terraplen-rooftop', 'ev-casco-peatonal'];
        else if (p.id === 'proj-podcast-live') rawEventIds = ['ev-casco-peatonal', 'ev-grafiti-tour'];
    }
    const linkedEvents = (allEvents || []).filter(e => rawEventIds.includes(e.id));

    return {
        ...p,
        eventIds: rawEventIds,
        linkedEvents,
        tagline: p.tagline || p.category || '',
        icon: p.icon || '🚀',
        color,
        gradient: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent), color-mix(in srgb, ${color} 3%, transparent))`,
        border: `color-mix(in srgb, ${color} 30%, transparent)`,
        priority: p.priority || 'medium',
        statusLabel: p.statusLabel || p.status || 'Activo',
        objective: p.objective || p.currentObjective || p.description || 'Sin objetivo definido.',
        nextAction: p.nextAction || 'Sin siguiente acción definida.',
        blockers: p.blockers || 'Sin bloqueos registrados.',
        lead: p.lead || p.leadAgent || 'Sin líder',
        kpi: kpiLabel(p),
    };
};

const TASK_BLOCKS = [
    { id: 'all', label: 'Todos los Bloques', icon: Layers, color: '#a78bfa' },
    { id: 'estrategia', label: '🧠 Estrategia', icon: Target, color: '#8b5cf6' },
    { id: 'producto', label: '🚀 Producto', icon: Sparkles, color: '#3b82f6' },
    { id: 'marketing', label: '📱 Marketing', icon: TrendingUp, color: '#ec4899' },
    { id: 'operacion', label: '⚙️ Operación', icon: Cpu, color: '#10b981' },
    { id: 'comercial', label: '💼 Comercial', icon: Briefcase, color: '#f59e0b' },
    { id: 'documentacion', label: '📝 Documentación', icon: FileText, color: '#06b6d4' }
];

export default function PortfolioOS() {
    const {
        events,
        updateEvent,
        projects,
        addProject,
        updateProject,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        decisionLog,
        addDecision,
        deleteDecision,
        portfolioRoadmap,
        addRoadmapItem,
        updateRoadmapItem,
        deleteRoadmapItem,
        openclawLogs,
        activityFeed,
        triggerOpenClawAction,
        refreshData
    } = useApp();

    // Active sub-tab in Portfolio OS
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tasks' | 'decisions' | 'roadmap' | 'openclaw'

    // Filtro Global por Evento
    const [selectedEventFilter, setSelectedEventFilter] = useState('all');

    // Proyectos reales de la base; ARRIVE AGENCY siempre primero.
    const allAvailableProjects = useMemo(() => {
        const list = (projects || []).map(p => toPortfolioProject(p, events));
        const arrive = list.find(p => p.id === 'proj-arrive-agency');
        return arrive ? [arrive, ...list.filter(p => p !== arrive)] : list;
    }, [projects, events]);

    // Proyectos visibles según filtro de evento
    const visibleProjects = useMemo(() => {
        if (selectedEventFilter === 'all') return allAvailableProjects;
        return allAvailableProjects.filter(p => (p.eventIds || []).includes(selectedEventFilter));
    }, [allAvailableProjects, selectedEventFilter]);

    // Task Plans Filters
    const [taskProjectFilter, setTaskProjectFilter] = useState('all');
    const [taskEventFilter, setTaskEventFilter] = useState('all');
    const [taskBlockFilter, setTaskBlockFilter] = useState('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskProject, setNewTaskProject] = useState('proj-arrive-agency');
    const [newTaskEvent, setNewTaskEvent] = useState('');
    const [newTaskDue, setNewTaskDue] = useState('');
    const [newTaskBlock, setNewTaskBlock] = useState('estrategia');
    const [newTaskPriority, setNewTaskPriority] = useState('high');
    const [newTaskOwner, setNewTaskOwner] = useState('GG');

    // Modal Crear Nuevo Proyecto Venture
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [newProjectForm, setNewProjectForm] = useState({
        name: '',
        tagline: '',
        icon: '🚀',
        color: '#8b5cf6',
        priority: 'high',
        objective: '',
        nextAction: '',
        blockers: '',
        kpi: '',
        deadline: '',
        eventIds: []
    });

    // Modal Vincular Eventos a Proyecto Existente
    const [linkModalProject, setLinkModalProject] = useState(null);
    const [selectedEventIdsForLink, setSelectedEventIdsForLink] = useState([]);

    // Decision Log Modal
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [newDecision, setNewDecision] = useState({
        project: 'ARRIVE AGENCY',
        projectId: 'proj-arrive-agency',
        eventId: '',
        decision: '',
        motivo: '',
        impacto: 'Crítico / Estratégico',
        decisor: 'ARRIVE Director & OpenClaw'
    });

    // Roadmap Modal
    const [showRoadmapModal, setShowRoadmapModal] = useState(false);
    const [newRoadmap, setNewRoadmap] = useState({
        title: '',
        project: 'ARRIVE AGENCY',
        projectId: 'proj-arrive-agency',
        eventId: '',
        column: 'now',
        priority: 'high',
        block: 'marketing',
        deadline: '',
        desc: ''
    });

    // Suggested Actions from OpenClaw Execution
    const [suggestedFeedback, setSuggestedFeedback] = useState(null);

    // Tareas reales de cada proyecto y evento alineadas con Calendario y Eventos
    const allPortfolioTasks = useMemo(() => {
        const names = new Map(allAvailableProjects.map(p => [p.id, p.name]));
        const eventsMap = new Map((events || []).map(e => [e.id, e]));

        return (tasks || []).filter(t => names.has(t.projectId) || (t.eventId && eventsMap.has(t.eventId))).map(t => {
            const ev = t.eventId ? eventsMap.get(t.eventId) : null;
            return {
                id: t.id,
                text: t.text || t.title || '',
                block: t.block || (t.division === 'services' ? 'marketing' : 'operacion'),
                priority: t.priority || 'medium',
                owner: t.assignedTo || t.assignee || 'Sin asignar',
                done: isDone(t),
                due: t.due || t.dueDate || '',
                projectId: t.projectId || '',
                projectName: names.get(t.projectId) || (t.projectId === 'proj-arrive-agency' ? 'ARRIVE AGENCY' : 'Proyecto General'),
                eventId: t.eventId || '',
                eventName: ev?.name || t.eventName || '',
                eventIcon: ev?.icon || '🍸',
                eventColor: ev?.color || '#a78bfa'
            };
        });
    }, [tasks, allAvailableProjects, events]);

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        return allPortfolioTasks.filter(t => {
            if (taskProjectFilter !== 'all' && t.projectId !== taskProjectFilter) return false;
            if (taskEventFilter !== 'all' && t.eventId !== taskEventFilter) return false;
            if (selectedEventFilter !== 'all' && t.eventId !== selectedEventFilter) return false;
            if (taskBlockFilter !== 'all' && t.block !== taskBlockFilter) return false;
            if (taskSearch && !t.text.toLowerCase().includes(taskSearch.toLowerCase())) return false;
            return true;
        });
    }, [allPortfolioTasks, taskProjectFilter, taskEventFilter, selectedEventFilter, taskBlockFilter, taskSearch]);

    // Handle Quick Task Add (Conectada con Eventos y Calendario)
    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        const matchedProj = allAvailableProjects.find(p => p.id === newTaskProject);
        const projName = matchedProj ? matchedProj.name : 'ARRIVE AGENCY';

        // Evento: explícito del selector o el primer evento vinculado al proyecto
        let resolvedEventId = newTaskEvent;
        if (!resolvedEventId && matchedProj?.eventIds?.length) {
            resolvedEventId = matchedProj.eventIds[0];
        }
        const matchedEvent = (events || []).find(ev => ev.id === resolvedEventId);
        const eventName = matchedEvent ? matchedEvent.name : '';

        const taskPayload = {
            id: `t-pf-${Date.now()}`,
            text: newTaskText.trim(),
            projectId: newTaskProject,
            project: projName,
            projectName: projName,
            eventId: resolvedEventId || '',
            eventName: eventName,
            venue: eventName,
            block: newTaskBlock,
            priority: newTaskPriority,
            assignedTo: newTaskOwner,
            agency: newTaskProject === 'proj-arrive-agency' ? 'arrive' : undefined,
            due: newTaskDue || '',
            done: false,
            createdAt: new Date().toISOString()
        };
        await addTask(taskPayload);
        setNewTaskText('');
        setNewTaskDue('');
    };

    // Handle Decision Submit (Vinculada a Proyecto y Evento)
    const handleSaveDecision = async (e) => {
        e.preventDefault();
        if (!newDecision.decision.trim() || !newDecision.motivo.trim()) return;

        const matchedProj = allAvailableProjects.find(p => p.id === newDecision.projectId);
        let resolvedEventId = newDecision.eventId;
        if (!resolvedEventId && matchedProj?.eventIds?.length) {
            resolvedEventId = matchedProj.eventIds[0];
        }
        const matchedEvent = (events || []).find(ev => ev.id === resolvedEventId);

        await addDecision({
            ...newDecision,
            id: `dec-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            project: matchedProj ? matchedProj.name : newDecision.project,
            eventId: resolvedEventId || '',
            eventName: matchedEvent ? matchedEvent.name : ''
        });
        setShowDecisionModal(false);
        setNewDecision({
            project: 'ARRIVE AGENCY',
            projectId: 'proj-arrive-agency',
            eventId: '',
            decision: '',
            motivo: '',
            impacto: 'Crítico / Estratégico',
            decisor: 'ARRIVE Director & OpenClaw'
        });
    };

    // Handle Roadmap Submit (Sincronizado con Eventos y Calendario)
    const handleSaveRoadmap = async (e) => {
        e.preventDefault();
        if (!newRoadmap.title.trim()) return;

        const matchedProj = allAvailableProjects.find(p => p.id === newRoadmap.projectId);
        let resolvedEventId = newRoadmap.eventId;
        if (!resolvedEventId && matchedProj?.eventIds?.length) {
            resolvedEventId = matchedProj.eventIds[0];
        }
        const matchedEvent = (events || []).find(ev => ev.id === resolvedEventId);
        const eventName = matchedEvent ? matchedEvent.name : '';

        const roadmapItem = {
            ...newRoadmap,
            id: `rdm-${Date.now()}`,
            project: matchedProj ? matchedProj.name : newRoadmap.project,
            eventId: resolvedEventId || '',
            eventName: eventName,
            createdAt: new Date().toISOString()
        };

        await addRoadmapItem(roadmapItem);

        // Si tiene fecha y evento, sincronizarlo automáticamente como hito dentro del evento
        if (resolvedEventId && newRoadmap.deadline && matchedEvent) {
            const currentMilestones = Array.isArray(matchedEvent.milestones) ? matchedEvent.milestones : [];
            const milestonePayload = {
                id: `m-rdm-${Date.now()}`,
                title: `[Roadmap ${matchedProj?.name || ''}] ${newRoadmap.title}`,
                date: newRoadmap.deadline,
                done: false,
                sourceRoadmapId: roadmapItem.id
            };
            await updateEvent(resolvedEventId, {
                milestones: [...currentMilestones, milestonePayload]
            });
        }

        setShowRoadmapModal(false);
        setNewRoadmap({
            title: '',
            project: 'ARRIVE AGENCY',
            projectId: 'proj-arrive-agency',
            eventId: '',
            column: 'now',
            priority: 'high',
            block: 'marketing',
            deadline: '',
            desc: ''
        });
    };

    // Modal Vincular Eventos
    const openLinkEventsModal = (proj) => {
        setLinkModalProject(proj);
        setSelectedEventIdsForLink(proj.eventIds || []);
    };

    const handleSaveProjectEvents = async () => {
        if (!linkModalProject) return;
        await updateProject(linkModalProject.id, {
            eventIds: selectedEventIdsForLink
        });
        setLinkModalProject(null);
        if (refreshData) refreshData();
    };

    // Crear Nuevo Proyecto Venture
    const handleSaveNewProject = async (e) => {
        e.preventDefault();
        if (!newProjectForm.name.trim()) return;
        const pId = `proj-${Date.now()}`;
        const newP = {
            id: pId,
            name: newProjectForm.name.trim(),
            tagline: newProjectForm.tagline.trim(),
            description: newProjectForm.objective || newProjectForm.tagline,
            objective: newProjectForm.objective,
            nextAction: newProjectForm.nextAction,
            blockers: newProjectForm.blockers,
            icon: newProjectForm.icon || '🚀',
            color: newProjectForm.color || '#8b5cf6',
            priority: newProjectForm.priority || 'high',
            status: 'active',
            deadline: newProjectForm.deadline || '',
            kpiText: newProjectForm.kpi || '',
            eventIds: newProjectForm.eventIds,
            createdAt: new Date().toISOString()
        };

        await addProject(newP);

        // Si se especificó fecha límite y evento(s), crear una primera tarea o hito alineado en calendario
        if (newProjectForm.deadline && newProjectForm.eventIds?.length) {
            const primaryEvId = newProjectForm.eventIds[0];
            const primaryEvent = (events || []).find(e => e.id === primaryEvId);
            await addTask({
                id: `t-pf-init-${Date.now()}`,
                text: `Hito Inicial / Lanzamiento: ${newProjectForm.name}`,
                projectId: pId,
                project: newProjectForm.name,
                projectName: newProjectForm.name,
                eventId: primaryEvId,
                eventName: primaryEvent?.name || '',
                venue: primaryEvent?.name || '',
                block: 'estrategia',
                priority: newProjectForm.priority || 'high',
                due: newProjectForm.deadline,
                done: false,
                createdAt: new Date().toISOString()
            });
        }

        setShowProjectModal(false);
        setNewProjectForm({
            name: '',
            tagline: '',
            icon: '🚀',
            color: '#8b5cf6',
            priority: 'high',
            objective: '',
            nextAction: '',
            blockers: '',
            kpi: '',
            deadline: '',
            eventIds: []
        });
        if (refreshData) refreshData();
    };

    // Handle Quick Action Approval from OpenClaw
    const handleApproveOpenClawAction = async (actionItem) => {
        setSuggestedFeedback({ loading: true });
        try {
            if (actionItem.type === 'create_task') {
                await addTask({
                    text: actionItem.data.text,
                    projectId: actionItem.data.projectId || 'portfolio-hangout',
                    priority: actionItem.data.priority || 'critical',
                    block: actionItem.data.block || 'estrategia',
                    assignedTo: 'OpenClaw Super Agent'
                });
            } else if (actionItem.type === 'add_decision') {
                await addDecision(actionItem.data);
            } else if (actionItem.type === 'add_roadmap') {
                await addRoadmapItem(actionItem.data);
            }
            setSuggestedFeedback({ success: true, msg: `✅ ¡Acción ejecutada! ${actionItem.title} sincronizada.` });
            setTimeout(() => setSuggestedFeedback(null), 3000);
            if (refreshData) refreshData();
        } catch (e) {
            setSuggestedFeedback({ error: true, msg: e.message });
        }
    };

    // OpenClaw Suggested Actions list
    const openclawSuggestedActions = [
        {
            id: 'sug-1',
            title: 'Validar prototipo de UI y lista de espera para Hang Out App',
            project: 'Hang Out App',
            type: 'create_task',
            color: '#f43f5e',
            impact: 'Validación MVP',
            data: { text: 'Prototipo Figma de reservas VIP y validación con 15 promotores', projectId: 'portfolio-hangout', block: 'producto', priority: 'critical' }
        },
        {
            id: 'sug-2',
            title: 'Ejecutar scraper de pliegos >$100k de PanamáCompra en LicitIA',
            project: 'LicitIA',
            type: 'create_task',
            color: '#3b82f6',
            impact: 'Algoritmo Core',
            data: { text: 'Scrapear pliegos oficiales y extraer matrices de requisitos con RAG', projectId: 'proj-2', block: 'producto', priority: 'critical' }
        },
        {
            id: 'sug-3',
            title: 'Definir arquitectura de transcripción y extracción JSON para RecordAI',
            project: 'RecordAI',
            type: 'create_task',
            color: '#8b5cf6',
            impact: 'Arquitectura AI',
            data: { text: 'Evaluar Whisper Large v3 vs Gemini Flash para extracción de minutas ejecutivas', projectId: 'proj-4', block: 'producto', priority: 'high' }
        },
        {
            id: 'sug-4',
            title: 'Análisis de viabilidad regulatoria y pasarela QR para Waller App',
            project: 'Waller App',
            type: 'create_task',
            color: '#10b981',
            impact: 'Fintech Compliance',
            data: { text: 'Verificar esquema de adquirencia y pagos QR en barras de eventos', projectId: 'proj-6', block: 'estrategia', priority: 'high' }
        }
    ];

    return (
        <div className="page-content animate-in">
            
            {/* ═══ HEADER ═══ */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Briefcase size={26} style={{ color: 'var(--accent-primary)' }} />
                        Portfolio OS · Venture Studio & Proyectos Futuros
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
                        Incubadora, I+D y desarrollo de <strong>nuevos proyectos y empresas a futuro</strong> (Horizonte Q4 2026 / 2027). Diseñado para validar hipótesis, arquitectura y viabilidad comercial antes de programar.
                    </p>
                </div>

                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowProjectModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                        <Plus size={16} /> Nuevo Proyecto Venture
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowDecisionModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                    >
                        <BookOpen size={16} /> Registrar Decisión
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowRoadmapModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                    >
                        <Plus size={16} /> Hito de Roadmap
                    </button>
                </div>
            </div>

            {/* ═══ GLOBAL EVENT ALIGNMENT BAR ═══ */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 18px',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>Alineación con Evento:</span>
                    </div>
                    <select
                        value={selectedEventFilter}
                        onChange={e => setSelectedEventFilter(e.target.value)}
                        className="form-control"
                        style={{
                            background: selectedEventFilter !== 'all' ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
                            border: selectedEventFilter !== 'all' ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                            color: 'white',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all" style={{ background: '#12121a' }}>🌐 Todos los Eventos ({events?.length || 0})</option>
                        {(events || []).map(ev => (
                            <option key={`flt-ev-${ev.id}`} value={ev.id} style={{ background: '#12121a' }}>
                                {ev.icon || '🍸'} {ev.name}
                            </option>
                        ))}
                    </select>

                    {selectedEventFilter !== 'all' && (
                        <button
                            onClick={() => setSelectedEventFilter('all')}
                            style={{
                                background: 'transparent',
                                border: '1px dashed var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕ Ver todos
                        </button>
                    )}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span>Proyectos alineados: <strong style={{ color: 'white' }}>{visibleProjects.length}</strong></span>
                    <span>Tareas sincronizadas: <strong style={{ color: '#a78bfa' }}>{filteredTasks.length}</strong></span>
                    <span>Hitos en Calendario: <strong style={{ color: '#f59e0b' }}>{(portfolioRoadmap || []).filter(r => (selectedEventFilter === 'all' || r.eventId === selectedEventFilter) && r.deadline).length}</strong></span>
                </div>
            </div>

            {/* ═══ PORTFOLIO METRICS BAR ═══ */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div className="card" style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proyectos en Incubación & Agencia</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{allAvailableProjects.length} Proyectos</div>
                    <div style={{ fontSize: '11.5px', color: '#fbbf24', marginTop: '2px' }}>{allAvailableProjects.map(p => p.name).join(' · ')}</div>
                </div>
                <div className="card" style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Decisiones Estratégicas</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{decisionLog?.length || 0} Registradas</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Arquitectura & Tesis Oficiales</div>
                </div>
                <div className="card" style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tareas de I+D & MVP</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>{allPortfolioTasks.length} Tareas</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>{allPortfolioTasks.filter(t => t.done).length} completadas</div>
                </div>
                <div className="card" style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Roadmap Sprint (Now)</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        {portfolioRoadmap.filter(r => r.column === 'now').length} En Foco
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#f59e0b', marginTop: '2px' }}>Prioridad Inmediata Q4/Q1</div>
                </div>
            </div>

            {/* ═══ NAVIGATION TABS ═══ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', overflowX: 'auto' }}>
                {[
                    { id: 'overview', label: '1. Portfolio Overview', icon: Briefcase },
                    { id: 'tasks', label: '2. Task Plans & Bloques', icon: ListTodo },
                    { id: 'decisions', label: '3. Decision Log', icon: BookOpen },
                    { id: 'roadmap', label: '4. Strategic Roadmap', icon: GitPullRequest },
                    { id: 'openclaw', label: '5. OpenClaw Coordination & Logs', icon: Radio }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: activeTab === tab.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 1. PORTFOLIO OVERVIEW TAB                                        */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                visibleProjects.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                    {visibleProjects.map(proj => {
                        // Pendientes primero y por fecha: las 3 que se ven son las más urgentes.
                        const projTasks = allPortfolioTasks
                            .filter(t => t.projectId === proj.id)
                            .sort((x, y) => Number(x.done) - Number(y.done) || (x.due || '9999').localeCompare(y.due || '9999'));
                        const completedCount = projTasks.filter(t => t.done).length;
                        const totalCount = projTasks.length;
                        const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                            <div
                                key={proj.id}
                                className="card"
                                style={{
                                    padding: '24px',
                                    background: proj.gradient,
                                    border: `1px solid ${proj.border}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    position: 'relative'
                                }}
                            >
                                {/* Card Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '32px' }}>{proj.icon}</span>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'white' }}>{proj.name}</h3>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{proj.tagline}</span>
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '3px 9px',
                                        borderRadius: '12px',
                                        background: proj.priority === 'critical' ? 'rgba(244,63,94,0.2)' : 'rgba(59,130,246,0.2)',
                                        color: proj.priority === 'critical' ? '#f43f5e' : '#60a5fa',
                                        border: `1px solid ${proj.priority === 'critical' ? 'rgba(244,63,94,0.4)' : 'rgba(59,130,246,0.4)'}`,
                                        textTransform: 'uppercase'
                                    }}>
                                        {proj.priority}
                                    </span>
                                </div>

                                {/* Eventos Vinculados (Conexión 1 a Varios) */}
                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CalendarDays size={13} style={{ color: '#a78bfa' }} /> Eventos Vinculados ({proj.linkedEvents?.length || 0})
                                        </span>
                                        <button
                                            onClick={() => openLinkEventsModal(proj)}
                                            style={{
                                                background: 'rgba(139,92,246,0.15)',
                                                border: '1px solid rgba(139,92,246,0.35)',
                                                color: '#c4b5fd',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '10.5px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Conectar o desconectar eventos de este proyecto"
                                        >
                                            <Link2 size={11} /> {proj.linkedEvents?.length ? 'Editar Vínculos' : '+ Vincular Eventos'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {proj.linkedEvents && proj.linkedEvents.length > 0 ? (
                                            proj.linkedEvents.map(ev => (
                                                <span
                                                    key={ev.id}
                                                    onClick={() => setSelectedEventFilter(ev.id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: 'rgba(255,255,255,0.06)',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        color: '#e2e8f0',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Clic para filtrar Portfolio OS por este evento"
                                                >
                                                    <span>{ev.icon || '🍸'}</span>
                                                    <span>{ev.name}</span>
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                                Sin eventos vinculados. Clic en '+ Vincular Eventos'.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status & Objective */}
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: proj.color, textTransform: 'uppercase', marginBottom: '4px' }}>
                                        🎯 Objetivo Actual
                                    </div>
                                    <p style={{ margin: 0, fontSize: '13.5px', color: 'white', lineHeight: '1.5', fontWeight: 500 }}>
                                        {proj.objective}
                                    </p>
                                </div>

                                {/* Next Action */}
                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ArrowRight size={13} style={{ color: '#38bdf8' }} /> Siguiente Acción Inmediata
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '4px', lineHeight: '1.4' }}>
                                        {proj.nextAction}
                                    </div>
                                </div>

                                {/* Blockers / Risks */}
                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={13} /> Bloqueos / Riesgos
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: '#fca5a5', marginTop: '3px' }}>
                                        {proj.blockers}
                                    </div>
                                </div>

                                {/* Critical Tasks (Top 3) */}
                                <div>
                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        ⚡ Tareas Críticas ({completedCount}/{totalCount})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {projTasks.slice(0, 3).map(task => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 10px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.04)',
                                                    fontSize: '12.5px'
                                                }}
                                            >
                                                <button
                                                    onClick={() => updateTask(task.id, { done: !task.done })}
                                                    style={{ background: 'transparent', border: 'none', color: task.done ? '#4ade80' : 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                                >
                                                    {task.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                </button>
                                                <span style={{ flex: 1, textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--text-tertiary)' : 'white' }}>
                                                    {task.text}
                                                </span>
                                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                                                    {task.block}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {proj.kpi && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        📈 Meta: <strong style={{ color: 'white' }}>{proj.kpi}</strong>
                                    </div>
                                )}

                                {/* Progress Bar & Footer */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        <span>Líder: <strong style={{ color: 'white' }}>{proj.lead}</strong></span>
                                        <span>Progreso: <strong style={{ color: proj.color }}>{pct}%</strong>{totalCount ? '' : ' (sin tareas)'}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: proj.color, transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                ) : (
                    <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎪</div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'white' }}>No hay proyectos vinculados a este evento</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px 0' }}>
                            Puedes vincular proyectos existentes a este evento o crear uno nuevo con este evento asignado.
                        </p>
                        <button className="btn btn-secondary" onClick={() => setSelectedEventFilter('all')}>
                            Ver todos los proyectos
                        </button>
                    </div>
                )
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 2. TASK PLANS & BLOCKS TAB                                       */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Filter Toolbar */}
                    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Proyecto:</span>
                                <select
                                    className="form-control"
                                    value={taskProjectFilter}
                                    onChange={e => setTaskProjectFilter(e.target.value)}
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}
                                >
                                    <option value="all">Todos los Proyectos ({allAvailableProjects.length})</option>
                                    {allAvailableProjects.map(p => (
                                        <option key={`flt-p-${p.id}`} value={p.id}>
                                            {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `${p.icon || '🚀'} ${p.name}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Evento:</span>
                                <select
                                    className="form-control"
                                    value={taskEventFilter}
                                    onChange={e => setTaskEventFilter(e.target.value)}
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}
                                >
                                    <option value="all">Todos los Eventos ({events?.length || 0})</option>
                                    {(events || []).map(ev => (
                                        <option key={`flt-task-ev-${ev.id}`} value={ev.id}>
                                            {ev.icon || '🍸'} {ev.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ position: 'relative', width: '260px' }}>
                                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar tareas..."
                                    value={taskSearch}
                                    onChange={e => setTaskSearch(e.target.value)}
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '7px 12px 7px 34px', color: 'white', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        {/* Block Filters */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                            {TASK_BLOCKS.map(block => (
                                <button
                                    key={block.id}
                                    onClick={() => setTaskBlockFilter(block.id)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: taskBlockFilter === block.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                                        color: taskBlockFilter === block.id ? 'white' : 'var(--text-secondary)',
                                        border: `1px solid ${taskBlockFilter === block.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {block.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Add Task Form */}
                    <form onSubmit={handleCreateTask} className="card" style={{ padding: '16px 20px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Nueva tarea estratégica u operativa..."
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                            style={{ flex: 2, minWidth: '220px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '9px 14px', color: 'white', fontSize: '13px' }}
                        />
                        <select
                            value={newTaskProject}
                            onChange={e => setNewTaskProject(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                        >
                            {allAvailableProjects.map(p => (
                                <option key={`new-p-${p.id}`} value={p.id}>
                                    {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `${p.icon || '🚀'} ${p.name}`}
                                </option>
                            ))}
                        </select>
                        <select
                            value={newTaskEvent}
                            onChange={e => setNewTaskEvent(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: '#c4b5fd', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                            title="Evento vinculado para alinear con calendario y tareas del evento"
                        >
                            <option value="">🎪 Auto (Evento del proyecto)</option>
                            {(events || []).map(ev => (
                                <option key={`task-ev-opt-${ev.id}`} value={ev.id}>
                                    {ev.icon || '🍸'} {ev.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={newTaskDue}
                            onChange={e => setNewTaskDue(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: newTaskDue ? 'white' : 'var(--text-tertiary)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}
                            title="Fecha de entrega / Calendario"
                        />
                        <select
                            value={newTaskBlock}
                            onChange={e => setNewTaskBlock(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                        >
                            <option value="estrategia">🧠 Estrategia</option>
                            <option value="producto">🚀 Producto</option>
                            <option value="marketing">📱 Marketing</option>
                            <option value="operacion">⚙️ Operación</option>
                            <option value="comercial">💼 Comercial</option>
                            <option value="documentacion">📝 Documentación</option>
                        </select>
                        <select
                            value={newTaskPriority}
                            onChange={e => setNewTaskPriority(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                        >
                            <option value="critical">🚨 Crítica</option>
                            <option value="high">⚡ Alta</option>
                            <option value="medium">● Media</option>
                        </select>
                        <select
                            value={newTaskOwner}
                            onChange={e => setNewTaskOwner(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                        >
                            <option value="GG">👤 GG</option>
                            <option value="JOSHUA">👤 JOSHUA</option>
                            <option value="MARIO">👤 MARIO</option>
                            <option value="ANDREA">👤 ANDREA</option>
                            <option value="FANNY">👤 FANNY</option>
                            <option value="JEIKOB">👤 JEIKOB</option>
                            <option value="FIVVR">👤 FIVVR</option>
                            <option value="OpenClaw">🤖 OpenClaw</option>
                        </select>
                        <button type="submit" className="btn btn-primary" style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            <Plus size={16} /> Añadir Tarea Sincronizada
                        </button>
                    </form>

                    {/* Task List Table / Grid */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                                Tareas Filtradas ({filteredTasks.length})
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {filteredTasks.filter(t => t.done).length} completadas de {filteredTasks.length}
                            </span>
                        </div>

                        {filteredTasks.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredTasks.map(task => (
                                    <div
                                        key={task.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border-subtle)',
                                            transition: 'all 0.15s',
                                            gap: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                            <button
                                                onClick={() => updateTask(task.id, { done: !task.done })}
                                                style={{ background: 'transparent', border: 'none', color: task.done ? '#4ade80' : 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                            >
                                                {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                            </button>
                                            <span style={{
                                                fontSize: '13.5px',
                                                color: task.done ? 'var(--text-tertiary)' : 'white',
                                                textDecoration: task.done ? 'line-through' : 'none',
                                                fontWeight: 500,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {task.text}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.05)', color: '#38bdf8'
                                            }}>
                                                {task.projectName}
                                            </span>

                                            {task.eventName && (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                                                    background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px'
                                                }}>
                                                    {task.eventIcon || '🍸'} {task.eventName}
                                                </span>
                                            )}

                                            {task.due && (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                                                    background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80'
                                                }}>
                                                    📅 {task.due}
                                                </span>
                                            )}

                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                                                background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd'
                                            }}>
                                                {task.block}
                                            </span>

                                            <span style={{
                                                fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                                background: task.priority === 'critical' ? 'rgba(244,63,94,0.2)' : task.priority === 'high' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                                                color: task.priority === 'critical' ? '#f43f5e' : task.priority === 'high' ? '#f59e0b' : '#60a5fa'
                                            }}>
                                                {task.priority}
                                            </span>

                                            <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                                                👤 {task.owner}
                                            </span>

                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => deleteTask(task.id)}
                                                style={{ color: 'var(--accent-red)', padding: '4px 6px' }}
                                                title="Eliminar tarea"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                No se encontraron tareas para los filtros seleccionados.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 3. DECISION LOG TAB                                              */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'decisions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>Bitácora Oficial de Decisiones</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                Registro inmutable de giros estratégicos, motivos y acuerdos de arquitectura del portafolio.
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowDecisionModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> Nueva Decisión
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(decisionLog || []).filter(d => selectedEventFilter === 'all' || d.eventId === selectedEventFilter).map(dec => (
                            <div
                                key={dec.id}
                                className="card"
                                style={{
                                    padding: '20px 24px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                                            {dec.project}
                                        </span>
                                        {dec.eventName && (
                                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd' }}>
                                                🎪 {dec.eventName}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                            📅 {dec.date}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' }}>
                                            Impacto: {dec.impacto}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            👤 Decisor: <strong>{dec.decisor}</strong>
                                        </span>
                                        <button className="btn btn-ghost" onClick={() => deleteDecision(dec.id)} style={{ color: 'var(--accent-red)', padding: '2px 6px' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15.5px', color: 'white', fontWeight: 700 }}>
                                        "{dec.decision}"
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                        <strong>Motivo & Contexto:</strong> {dec.motivo}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 4. STRATEGIC ROADMAP TAB                                         */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'roadmap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>Secuencia de Foco Estratégico</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                Distribución de hitos y prioridades entre Now, Next, Later y Bloqueados.
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowRoadmapModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> Añadir al Roadmap
                        </button>
                    </div>

                    {/* Kanban Columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', minHeight: '500px' }}>
                        {[
                            { id: 'now', label: '🟢 Now (Foco Actual)', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.05)', border: 'rgba(34, 197, 94, 0.2)' },
                            { id: 'next', label: '🟡 Next (Próximo Sprint)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.2)' },
                            { id: 'later', label: '🔵 Later (Siguientes Fases)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.2)' },
                            { id: 'blocked', label: '🔴 Blocked (Bloqueados)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)' }
                        ].map(col => {
                            const items = (portfolioRoadmap || []).filter(r => r.column === col.id && (selectedEventFilter === 'all' || r.eventId === selectedEventFilter));
                            return (
                                <div
                                    key={col.id}
                                    style={{
                                        background: col.bg,
                                        border: `1px solid ${col.border}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${col.border}`, paddingBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: col.color }}>{col.label}</span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: 'white' }}>
                                            {items.length}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                        {items.map(item => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid var(--border-subtle)',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#7c5cfc20', color: '#a78bfa' }}>
                                                            {item.project}
                                                        </span>
                                                        {item.eventName && (
                                                            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd' }}>
                                                                🎪 {item.eventName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: item.deadline ? '#4ade80' : 'var(--text-tertiary)', fontWeight: item.deadline ? 600 : 400 }}>
                                                        📅 {item.deadline || 'Sin fecha'}
                                                    </span>
                                                </div>

                                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                                                    {item.title}
                                                </div>

                                                {item.desc && (
                                                    <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                                        {item.desc}
                                                    </p>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                                        {item.block || 'producto'}
                                                    </span>

                                                    {/* Move column quick buttons */}
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {col.id !== 'now' && (
                                                            <button
                                                                onClick={() => updateRoadmapItem(item.id, { column: 'now' })}
                                                                style={{ background: 'rgba(34,197,94,0.15)', border: 'none', color: '#4ade80', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                                                title="Mover a Now"
                                                            >
                                                                Now
                                                            </button>
                                                        )}
                                                        {col.id !== 'next' && (
                                                            <button
                                                                onClick={() => updateRoadmapItem(item.id, { column: 'next' })}
                                                                style={{ background: 'rgba(245,158,11,0.15)', border: 'none', color: '#fbbf24', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                                                title="Mover a Next"
                                                            >
                                                                Next
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteRoadmapItem(item.id)}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '2px' }}
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 5. OPENCLAW COORDINATION & LOGS TAB                              */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'openclaw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Suggested Actions by OpenClaw Banner */}
                    <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04))', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <Sparkles size={20} style={{ color: '#a78bfa' }} />
                            <h3 style={{ margin: 0, fontSize: '17px', color: 'white' }}>Acciones Sugeridas por OpenClaw Super Agent</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px 0' }}>
                            Propuestas autónomas derivadas del análisis del portafolio, estados de proyectos y cuellos de botella.
                        </p>

                        {suggestedFeedback && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '14px', background: suggestedFeedback.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: suggestedFeedback.success ? '#4ade80' : '#f87171' }}>
                                {suggestedFeedback.msg}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                            {openclawSuggestedActions.map(action => (
                                <div
                                    key={action.id}
                                    style={{
                                        padding: '14px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${action.color}30`,
                                        display: 'flex', flexDirection: 'column', gap: '8px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: action.color }}>{action.project}</span>
                                        <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
                                            {action.impact}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', lineHeight: '1.4' }}>
                                        {action.title}
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleApproveOpenClawAction(action)}
                                        style={{ marginTop: 'auto', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                                    >
                                        <Zap size={13} /> Aprobar & Ejecutar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Operational Memos & Real-time Logs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                        
                        {/* OpenClaw Activity Logs */}
                        <div className="card" style={{ padding: '20px', maxHeight: '450px', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Radio size={16} style={{ color: '#38bdf8' }} />
                                    Registro de Actividad de OpenClaw
                                </h4>
                                <span style={{ fontSize: '11px', color: '#4ade80' }}>● En Vivo</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                                {(openclawLogs || []).slice(0, 10).map(log => (
                                    <div key={log.id} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 700, color: '#a78bfa' }}>{log.action}</span>
                                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div style={{ color: 'white', lineHeight: '1.4' }}>
                                            {log.thought?.message || log.data?.name || log.data?.text || JSON.stringify(log.data)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Operational Memo Note */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} style={{ color: '#a78bfa' }} />
                                Nota Operativa: Cadencia de Cartera
                            </h4>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6' }}>
                                <p style={{ margin: '0 0 10px 0' }}>
                                    <strong>Reglas de Operación de OpenClaw:</strong>
                                </p>
                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    <li><strong>Hang Out</strong> es la prioridad #1 en velocidad de validación y tracción local.</li>
                                    <li><strong>LicitIA</strong> avanza en paralelo enfocado en prospección B2B a constructoras.</li>
                                    <li><strong>Trading Command Center</strong> es el único source of truth para auditorías y coordinación.</li>
                                    <li><strong>Marketing Agency</strong> captura cashflow y sinergias con los eventos producidos.</li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* DECISION MODAL                                                   */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {showDecisionModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Registrar Nueva Decisión</h3>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowDecisionModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveDecision}>
                            <div className="modal-body">
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Proyecto</label>
                                    <select
                                        className="form-control"
                                        value={newDecision.projectId || 'proj-arrive-agency'}
                                        onChange={e => {
                                            const found = allAvailableProjects.find(p => p.id === e.target.value);
                                            setNewDecision({
                                                ...newDecision,
                                                projectId: e.target.value,
                                                project: found ? found.name : e.target.value
                                            });
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        {allAvailableProjects.map(p => (
                                            <option key={`dec-p-${p.id}`} value={p.id}>
                                                {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `${p.icon || '🚀'} ${p.name}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Evento Vinculado (Opcional)</label>
                                    <select
                                        className="form-control"
                                        value={newDecision.eventId || ''}
                                        onChange={e => setNewDecision({ ...newDecision, eventId: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="">🎪 Sin evento específico / Decisión global</option>
                                        {(events || []).map(ev => (
                                            <option key={`dec-ev-${ev.id}`} value={ev.id}>
                                                {ev.icon || '🍸'} {ev.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Título de la Decisión</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ej. Hang Out será nightlife + eventos first..."
                                        value={newDecision.decision}
                                        onChange={e => setNewDecision({ ...newDecision, decision: e.target.value })}
                                        required
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Motivo ("por qué se tomó")</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Explica el contexto, hipótesis y rationale..."
                                        value={newDecision.motivo}
                                        onChange={e => setNewDecision({ ...newDecision, motivo: e.target.value })}
                                        required
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%', resize: 'vertical' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Nivel de Impacto</label>
                                    <select
                                        className="form-control"
                                        value={newDecision.impacto}
                                        onChange={e => setNewDecision({ ...newDecision, impacto: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="Crítico / Estratégico">Crítico / Estratégico</option>
                                        <option value="Crítico / Arquitectura">Crítico / Arquitectura</option>
                                        <option value="Alto / Comercial">Alto / Comercial</option>
                                        <option value="Alto / Producto">Alto / Producto</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowDecisionModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar Decisión</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* ROADMAP MODAL                                                    */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {showRoadmapModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Añadir Hito al Roadmap</h3>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowRoadmapModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveRoadmap}>
                            <div className="modal-body">
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Proyecto</label>
                                    <select
                                        className="form-control"
                                        value={newRoadmap.projectId || 'proj-arrive-agency'}
                                        onChange={e => {
                                            const found = allAvailableProjects.find(p => p.id === e.target.value);
                                            setNewRoadmap({
                                                ...newRoadmap,
                                                projectId: e.target.value,
                                                project: found ? found.name : e.target.value
                                            });
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        {allAvailableProjects.map(p => (
                                            <option key={`rdm-p-${p.id}`} value={p.id}>
                                                {p.id === 'proj-arrive-agency' ? '🌟 ARRIVE AGENCY' : `${p.icon || '🚀'} ${p.name}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Título del Hito / Entregable</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ej. MVP de Hang Out..."
                                        value={newRoadmap.title}
                                        onChange={e => setNewRoadmap({ ...newRoadmap, title: e.target.value })}
                                        required
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Columna de Foco</label>
                                    <select
                                        className="form-control"
                                        value={newRoadmap.column}
                                        onChange={e => setNewRoadmap({ ...newRoadmap, column: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="now">🟢 Now (Foco Inmediato)</option>
                                        <option value="next">🟡 Next (Próximo Sprint)</option>
                                        <option value="later">🔵 Later (Siguientes Fases)</option>
                                        <option value="blocked">🔴 Blocked (Bloqueado)</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>🎪 Evento Vinculado (Opcional - Sincroniza con Master Calendar & Eventos)</label>
                                    <select
                                        className="form-control"
                                        value={newRoadmap.eventId || ''}
                                        onChange={e => {
                                            const evId = e.target.value;
                                            const ev = (events || []).find(x => x.id === evId);
                                            setNewRoadmap({
                                                ...newRoadmap,
                                                eventId: evId,
                                                eventName: ev ? ev.name : ''
                                            });
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="">(Sin evento específico - Nivel Portfolio General)</option>
                                        {(events || []).map(ev => (
                                            <option key={`rdm-ev-${ev.id}`} value={ev.id}>
                                                {ev.icon || '🍸'} {ev.name} ({ev.date || 'Sin fecha'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Fecha Límite Estimada</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={newRoadmap.deadline}
                                        onChange={e => setNewRoadmap({ ...newRoadmap, deadline: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Descripción / Alcance</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        placeholder="Detalles clave o dependencias..."
                                        value={newRoadmap.desc}
                                        onChange={e => setNewRoadmap({ ...newRoadmap, desc: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%', resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowRoadmapModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Añadir Hito</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODAL NUEVO PROYECTO VENTURE                                     */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {showProjectModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Rocket size={18} color="#a855f7" /> Nuevo Proyecto Venture / Portfolio
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                    Crea una iniciativa estratégica conectada con uno o varios eventos y el calendario maestro.
                                </p>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowProjectModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveNewProject}>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Icono</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newProjectForm.icon}
                                            onChange={e => setNewProjectForm({ ...newProjectForm, icon: e.target.value })}
                                            style={{ textAlign: 'center', fontSize: '18px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Nombre del Proyecto *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Ej: Casco Nightlife Pass, Wedding Studio..."
                                            value={newProjectForm.name}
                                            onChange={e => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                                            required
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Tagline / Propuesta de Valor</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ej: Pasaporte digital para rooftops y barras exclusivas..."
                                        value={newProjectForm.tagline}
                                        onChange={e => setNewProjectForm({ ...newProjectForm, tagline: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Prioridad</label>
                                        <select
                                            className="form-control"
                                            value={newProjectForm.priority}
                                            onChange={e => setNewProjectForm({ ...newProjectForm, priority: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                        >
                                            <option value="high">🔴 Alta (Crítico)</option>
                                            <option value="medium">🟡 Media</option>
                                            <option value="low">🟢 Baja / Exploratorio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Fecha Meta / Deadline</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={newProjectForm.deadline}
                                            onChange={e => setNewProjectForm({ ...newProjectForm, deadline: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Objetivo Principal</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        placeholder="¿Qué valida o resuelve este proyecto?"
                                        value={newProjectForm.objective}
                                        onChange={e => setNewProjectForm({ ...newProjectForm, objective: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Siguiente Acción Clave</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Próximo paso ejecutable..."
                                            value={newProjectForm.nextAction}
                                            onChange={e => setNewProjectForm({ ...newProjectForm, nextAction: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>KPI Clave / Meta</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Ej: $15,000 GMV o 500 tickets..."
                                            value={newProjectForm.kpi}
                                            onChange={e => setNewProjectForm({ ...newProjectForm, kpi: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                        />
                                    </div>
                                </div>

                                {/* Checklist de Eventos Conectados */}
                                <div className="form-group" style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                            <Link2 size={14} /> Conectar con Eventos (Sincronización Total)
                                        </label>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            {newProjectForm.eventIds.length} seleccionado(s)
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 10px 0' }}>
                                        Selecciona los eventos que alimentan o componen este proyecto. Sus tareas, entregables y fechas quedarán sincronizados.
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {(events || []).map(ev => {
                                            const checked = newProjectForm.eventIds.includes(ev.id);
                                            return (
                                                <label
                                                    key={`new-p-ev-${ev.id}`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '6px 10px',
                                                        background: checked ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.2)',
                                                        border: `1px solid ${checked ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)'}`,
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...newProjectForm.eventIds, ev.id]
                                                                : newProjectForm.eventIds.filter(id => id !== ev.id);
                                                            setNewProjectForm({ ...newProjectForm, eventIds: newIds });
                                                        }}
                                                    />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {ev.icon || '🍸'} {ev.name}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowProjectModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Rocket size={15} /> Crear Proyecto y Conectar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODAL VINCULAR EVENTOS A PROYECTO EXISTENTE                      */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {linkModalProject && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Link2 size={18} color="#a855f7" /> Vincular Eventos
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Proyecto: <strong style={{ color: 'white' }}>{linkModalProject.name}</strong>
                                </p>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setLinkModalProject(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                    {selectedEventIdsForLink.length} evento(s) seleccionados
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: '11px', padding: '3px 8px' }}
                                        onClick={() => setSelectedEventIdsForLink((events || []).map(e => e.id))}
                                    >
                                        Marcar Todos
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: '11px', padding: '3px 8px' }}
                                        onClick={() => setSelectedEventIdsForLink([])}
                                    >
                                        Desmarcar Todos
                                    </button>
                                </div>
                            </div>

                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                                Al vincular eventos a este proyecto, todas las tareas, decisiones, calendario y hojas de ruta de Portfolio OS se filtran y sincronizan bidireccionalmente con esos eventos.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                                {(events || []).map(ev => {
                                    const isLinked = selectedEventIdsForLink.includes(ev.id);
                                    return (
                                        <div
                                            key={`link-ev-${ev.id}`}
                                            onClick={() => {
                                                if (isLinked) {
                                                    setSelectedEventIdsForLink(selectedEventIdsForLink.filter(id => id !== ev.id));
                                                } else {
                                                    setSelectedEventIdsForLink([...selectedEventIdsForLink, ev.id]);
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 14px',
                                                background: isLinked ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${isLinked ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isLinked}
                                                    onChange={() => {}}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
                                                        {ev.icon || '🍸'} {ev.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                        {ev.venue || 'Venue no especificado'} {ev.date ? `• ${ev.date}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            {isLinked && (
                                                <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600, background: 'rgba(168, 85, 247, 0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                                                    Vinculado
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setLinkModalProject(null)}>Cancelar</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveProjectEvents}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <CheckCircle size={15} /> Guardar Conexiones
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
