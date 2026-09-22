import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
    Briefcase, Target, ListTodo, GitPullRequest, Radio, Sparkles,
    CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight, Plus,
    Search, Filter, Layers, Zap, ExternalLink, Calendar, User,
    FileText, Check, ShieldAlert, Cpu, Trash2, Edit3, X, ChevronRight,
    TrendingUp, MessageSquare, Send, BookOpen, AlertCircle
} from 'lucide-react';

const CORE_PROJECTS_META = [
    {
        id: 'portfolio-hangout',
        name: 'Hang Out App',
        tagline: 'Nightlife Tech, VIP Tables & Social Discovery (Panamá)',
        icon: '🍸',
        color: '#f43f5e',
        gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.03))',
        border: 'rgba(244, 63, 94, 0.3)',
        priority: 'critical',
        status: 'in_progress',
        statusLabel: 'MVP / Validación (Q4 2026)',
        objective: 'Plataforma móvil y web de acceso digital a clubs nocturnos, pre-order de botellas, confirmación de mesas VIP y dinámica social de eventos en Panamá.',
        nextAction: 'Validar prototipo de UI con promotores de Casco Antiguo y afinar onboarding de venues.',
        blockers: 'Definir arquitectura de comisiones e integración de pagos locales.',
        lead: 'OpenClaw & Product Squad',
        kpi: 'Prototipo Figma + 150 early-adopters en waitlist',
        progress: 45,
        defaultTasks: [
            { id: 't-ho-1', text: 'Diseñar arquitectura de datos para reserva de mesas y split de consumo', block: 'producto', priority: 'critical', owner: 'OpenClaw', done: true, due: '2026-10-15' },
            { id: 't-ho-2', text: 'Prototipar flujos de onboarding para promotores y venues', block: 'producto', priority: 'high', owner: 'Product Squad', done: false, due: '2026-10-25' },
            { id: 't-ho-3', text: 'Validar modelo de comisión sobre venta de entradas y consumos', block: 'comercial', priority: 'critical', owner: 'CloserOps', done: false, due: '2026-11-05' },
            { id: 't-ho-4', text: 'Lanzar landing page con captación de emails y lista de espera VIP', block: 'marketing', priority: 'high', owner: 'Nexus', done: false, due: '2026-11-15' }
        ]
    },
    {
        id: 'portfolio-licitia',
        name: 'LicitIA',
        tagline: 'GovTech AI SaaS para Licitaciones Públicas (PanamáCompra)',
        icon: '⚖️',
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.03))',
        border: 'rgba(59, 130, 246, 0.3)',
        priority: 'critical',
        status: 'active',
        statusLabel: 'Investigación & Algoritmo (Q1 2027)',
        objective: 'SaaS de inteligencia artificial que procesa pliegos de licitaciones públicas de PanamáCompra, extrae matrices de requisitos y califica la elegibilidad de constructoras y proveedores.',
        nextAction: 'Completar benchmark del extractor RAG con 50 pliegos oficiales > $100k.',
        blockers: 'Normalización de pliegos antiguos escaneados sin capa de texto OCR.',
        lead: 'OpenClaw Core & CloserOps',
        kpi: '95% precisión en extracción de requisitos de pliegos',
        progress: 35,
        defaultTasks: [
            { id: 't-lic-1', text: 'Construir pipeline OCR + chunking para pliegos de PanamáCompra', block: 'producto', priority: 'critical', owner: 'OpenClaw', done: true, due: '2026-10-10' },
            { id: 't-lic-2', text: 'Mapear 100 constructoras y proveedores con licitaciones activas', block: 'comercial', priority: 'high', owner: 'CloserOps', done: false, due: '2026-10-30' },
            { id: 't-lic-3', text: 'Diseñar interfaz para subir pliegos y recibir matriz de checklist legal', block: 'producto', priority: 'high', owner: 'OpenClaw', done: false, due: '2026-11-10' },
            { id: 't-lic-4', text: 'Simulación de propuesta técnica generada por IA con auditoría legal', block: 'estrategia', priority: 'critical', owner: 'OpenClaw', done: false, due: '2026-11-25' }
        ]
    },
    {
        id: 'portfolio-recordai',
        name: 'RecordAI',
        tagline: 'Audio Intelligence & Transcripción Ejecutiva Autónoma',
        icon: '🎙️',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.03))',
        border: 'rgba(139, 92, 246, 0.3)',
        priority: 'high',
        status: 'planning',
        statusLabel: 'Arquitectura & Prototipo (Q2 2027)',
        objective: 'Sistema autónomo de audio intelligence para reuniones y llamadas ejecutivas: graba, identifica interlocutores, extrae minutas estructuradas y genera tareas delegadas en el sistema en segundos.',
        nextAction: 'Construir prototipo con API de Whisper v3 y Gemini 2.5 Pro para extracción de compromisos y JSON estructurado.',
        blockers: 'Optimización de latencia en grabaciones de más de 45 minutos.',
        lead: 'Audio AI Lab & Bart (COO)',
        kpi: 'Minuta generada en menos de 10 segundos pos-reunión',
        progress: 20,
        defaultTasks: [
            { id: 't-rec-1', text: 'Definir arquitectura de microservicio de transcripción con diarización', block: 'producto', priority: 'critical', owner: 'Audio AI Lab', done: false, due: '2026-11-01' },
            { id: 't-rec-2', text: 'Crear prompt maestro de extracción de compromisos, riesgos y acuerdos', block: 'estrategia', priority: 'high', owner: 'Bart (COO)', done: false, due: '2026-11-12' },
            { id: 't-rec-3', text: 'Integración de webhooks para enviar tareas automáticas a Workspace', block: 'operacion', priority: 'high', owner: 'OpenClaw', done: false, due: '2026-11-20' },
            { id: 't-rec-4', text: 'Testear prototipo con 10 reuniones reales y medir precisión', block: 'producto', priority: 'medium', owner: 'Audio AI Lab', done: false, due: '2026-12-05' }
        ]
    },
    {
        id: 'portfolio-waller',
        name: 'Waller App',
        tagline: 'Fintech Smart QR Payments & Split Bills para Hospitality',
        icon: '💳',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.03))',
        border: 'rgba(16, 185, 129, 0.3)',
        priority: 'high',
        status: 'planning',
        statusLabel: 'Ideación & Compliance (Q3 2027)',
        objective: 'Billetera digital y pasarela de micro-pagos QR para hospitality: permite a grupos en mesas VIP y barras dividir cuentas en partes iguales o exactas instantáneamente desde el móvil.',
        nextAction: 'Análisis de viabilidad con adquirentes locales (procesadores bancarios y sandbox Yappy/Tarjetas).',
        blockers: 'Requisitos de licencia fintech y cumplimiento regulatorio bancario.',
        lead: 'Fintech Squad & OpenClaw',
        kpi: 'Sandbox de pago completado en menos de 3 segundos',
        progress: 15,
        defaultTasks: [
            { id: 't-wal-1', text: 'Investigación de marco regulatorio fintech y pasarelas en Panamá', block: 'estrategia', priority: 'critical', owner: 'Fintech Squad', done: false, due: '2026-11-15' },
            { id: 't-wal-2', text: 'Diseñar flujo UX para escaneo QR de cuenta y división grupal', block: 'producto', priority: 'high', owner: 'Product Squad', done: false, due: '2026-12-01' },
            { id: 't-wal-3', text: 'Simular integración con sistemas POS de restaurantes y rooftops', block: 'operacion', priority: 'medium', owner: 'OpenClaw', done: false, due: '2026-12-20' },
            { id: 't-wal-4', text: 'Definir modelo de negocio (fee por transacción o suscripción venue)', block: 'comercial', priority: 'high', owner: 'CloserOps', done: false, due: '2027-01-15' }
        ]
    }
];

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
        projects,
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

    // Task Plans Filters
    const [taskProjectFilter, setTaskProjectFilter] = useState('all');
    const [taskBlockFilter, setTaskBlockFilter] = useState('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskProject, setNewTaskProject] = useState('portfolio-hangout');
    const [newTaskBlock, setNewTaskBlock] = useState('estrategia');
    const [newTaskPriority, setNewTaskPriority] = useState('high');
    const [newTaskOwner, setNewTaskOwner] = useState('OpenClaw');

    // Decision Log Modal
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [newDecision, setNewDecision] = useState({
        project: 'Hang Out',
        projectId: 'portfolio-hangout',
        decision: '',
        motivo: '',
        impacto: 'Alto / Estratégico',
        decisor: 'GG & OpenClaw'
    });

    // Roadmap Modal
    const [showRoadmapModal, setShowRoadmapModal] = useState(false);
    const [newRoadmap, setNewRoadmap] = useState({
        title: '',
        project: 'Hang Out',
        projectId: 'portfolio-hangout',
        column: 'now',
        priority: 'high',
        block: 'producto',
        deadline: '',
        desc: ''
    });

    // Suggested Actions from OpenClaw Execution
    const [suggestedFeedback, setSuggestedFeedback] = useState(null);

    // Merge default core tasks with global tasks
    const allPortfolioTasks = useMemo(() => {
        // Collect default tasks from CORE_PROJECTS_META
        const defaults = CORE_PROJECTS_META.flatMap(p => p.defaultTasks.map(t => ({
            ...t,
            projectId: p.id,
            projectName: p.name,
            source: 'core'
        })));

        // Collect matching tasks from AppContext
        const live = (tasks || []).map(t => {
            const matchedProj = CORE_PROJECTS_META.find(p => p.id === t.projectId || p.name.toLowerCase() === (t.project || '').toLowerCase());
            return {
                id: t.id,
                text: t.text || t.name,
                block: t.block || 'operacion',
                priority: t.priority || 'medium',
                owner: t.assignedTo || t.owner || 'OpenClaw',
                done: !!t.done,
                due: t.due || '',
                projectId: matchedProj ? matchedProj.id : (t.projectId || 'portfolio-hangout'),
                projectName: matchedProj ? matchedProj.name : (t.project || 'General'),
                source: 'live'
            };
        });

        // Unique by id or text
        const seen = new Set();
        const combined = [];
        [...defaults, ...live].forEach(item => {
            if (!seen.has(item.id) && !seen.has(item.text)) {
                seen.add(item.id);
                seen.add(item.text);
                combined.push(item);
            }
        });
        return combined;
    }, [tasks]);

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        return allPortfolioTasks.filter(t => {
            if (taskProjectFilter !== 'all' && t.projectId !== taskProjectFilter) return false;
            if (taskBlockFilter !== 'all' && t.block !== taskBlockFilter) return false;
            if (taskSearch && !t.text.toLowerCase().includes(taskSearch.toLowerCase())) return false;
            return true;
        });
    }, [allPortfolioTasks, taskProjectFilter, taskBlockFilter, taskSearch]);

    // Handle Quick Task Add
    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        const matchedProj = CORE_PROJECTS_META.find(p => p.id === newTaskProject);
        const taskPayload = {
            id: `t-pf-${Date.now()}`,
            text: newTaskText.trim(),
            projectId: newTaskProject,
            project: matchedProj ? matchedProj.name : 'Hang Out',
            block: newTaskBlock,
            priority: newTaskPriority,
            assignedTo: newTaskOwner,
            done: false,
            createdAt: new Date().toISOString()
        };
        await addTask(taskPayload);
        setNewTaskText('');
    };

    // Handle Decision Submit
    const handleSaveDecision = async (e) => {
        e.preventDefault();
        if (!newDecision.decision.trim() || !newDecision.motivo.trim()) return;
        await addDecision(newDecision);
        setShowDecisionModal(false);
        setNewDecision({
            project: 'Hang Out',
            projectId: 'portfolio-hangout',
            decision: '',
            motivo: '',
            impacto: 'Alto / Estratégico',
            decisor: 'GG & OpenClaw'
        });
    };

    // Handle Roadmap Submit
    const handleSaveRoadmap = async (e) => {
        e.preventDefault();
        if (!newRoadmap.title.trim()) return;
        await addRoadmapItem(newRoadmap);
        setShowRoadmapModal(false);
        setNewRoadmap({
            title: '',
            project: 'Hang Out',
            projectId: 'portfolio-hangout',
            column: 'now',
            priority: 'high',
            block: 'producto',
            deadline: '',
            desc: ''
        });
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
            data: { text: 'Scrapear pliegos oficiales y extraer matrices de requisitos con RAG', projectId: 'portfolio-licitia', block: 'producto', priority: 'critical' }
        },
        {
            id: 'sug-3',
            title: 'Definir arquitectura de transcripción y extracción JSON para RecordAI',
            project: 'RecordAI',
            type: 'create_task',
            color: '#8b5cf6',
            impact: 'Arquitectura AI',
            data: { text: 'Evaluar Whisper Large v3 vs Gemini Flash para extracción de minutas ejecutivas', projectId: 'portfolio-recordai', block: 'producto', priority: 'high' }
        },
        {
            id: 'sug-4',
            title: 'Análisis de viabilidad regulatoria y pasarela QR para Waller App',
            project: 'Waller App',
            type: 'create_task',
            color: '#10b981',
            impact: 'Fintech Compliance',
            data: { text: 'Verificar esquema de adquirencia y pagos QR en barras de eventos', projectId: 'portfolio-waller', block: 'estrategia', priority: 'high' }
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

                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowDecisionModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                    >
                        <BookOpen size={16} /> Registrar Decisión
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowRoadmapModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                    >
                        <Plus size={16} /> Hito de Roadmap
                    </button>
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
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proyectos en Incubación</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '4px' }}>4 Futuros</div>
                    <div style={{ fontSize: '11.5px', color: '#4ade80', marginTop: '2px' }}>Hang Out · LicitIA · RecordAI · Waller</div>
                </div>
                <div className="card" style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Decisiones Estratégicas</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{decisionLog?.length || 4} Registradas</div>
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
                        {portfolioRoadmap.filter(r => r.column === 'now').length || 3} En Foco
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                    {CORE_PROJECTS_META.map(proj => {
                        const projTasks = allPortfolioTasks.filter(t => t.projectId === proj.id);
                        const completedCount = projTasks.filter(t => t.done).length;
                        const totalCount = projTasks.length || 1;
                        const pct = Math.round((completedCount / totalCount) * 100);

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

                                {/* Progress Bar & Footer */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        <span>Líder: <strong style={{ color: 'white' }}>{proj.lead}</strong></span>
                                        <span>Progreso: <strong style={{ color: proj.color }}>{pct}%</strong></span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: proj.color, transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                                    <option value="all">Todos los Proyectos Futuros (4)</option>
                                    <option value="portfolio-hangout">🍸 Hang Out App</option>
                                    <option value="portfolio-licitia">⚖️ LicitIA</option>
                                    <option value="portfolio-recordai">🎙️ RecordAI</option>
                                    <option value="portfolio-waller">💳 Waller App</option>
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
                            <option value="portfolio-hangout">🍸 Hang Out App</option>
                            <option value="portfolio-licitia">⚖️ LicitIA</option>
                            <option value="portfolio-recordai">🎙️ RecordAI</option>
                            <option value="portfolio-waller">💳 Waller App</option>
                        </select>
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
                        <button type="submit" className="btn btn-primary" style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            <Plus size={16} /> Añadir Tarea
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

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.05)', color: '#38bdf8'
                                            }}>
                                                {task.projectName}
                                            </span>

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
                        {(decisionLog || []).map(dec => (
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                                            {dec.project}
                                        </span>
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
                            const items = (portfolioRoadmap || []).filter(r => r.column === col.id);
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
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#7c5cfc20', color: '#a78bfa' }}>
                                                        {item.project}
                                                    </span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                        {item.deadline || 'Q3 2026'}
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
                                        value={newDecision.project}
                                        onChange={e => setNewDecision({ ...newDecision, project: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="Hang Out App">Hang Out App</option>
                                        <option value="LicitIA">LicitIA</option>
                                        <option value="RecordAI">RecordAI</option>
                                        <option value="Waller App">Waller App</option>
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
                                        value={newRoadmap.project}
                                        onChange={e => setNewRoadmap({ ...newRoadmap, project: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '8px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="Hang Out App">Hang Out App</option>
                                        <option value="LicitIA">LicitIA</option>
                                        <option value="RecordAI">RecordAI</option>
                                        <option value="Waller App">Waller App</option>
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

        </div>
    );
}
