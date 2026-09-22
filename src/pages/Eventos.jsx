import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Plus, X, Edit3, Trash2, CalendarDays, MapPin, User,
    FolderOpen, Users, DollarSign, GripVertical, Search,
    CalendarClock, Sparkles, Building2, Footprints, Code,
    Briefcase, Bot, Megaphone, CheckCircle2, ArrowRight,
    Copy, Check, Zap, Terminal, Layers, Globe, Star
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// --- DEFINICIÓN DE PLANTILLAS PARA PROYECTOS & EVENTOS ---
export const PROJECT_AND_EVENT_TEMPLATES = {
    // ─── PROYECTOS ───
    project_software: {
        id: 'project_software',
        name: '💻 Proyecto Software / Web / App',
        badgeLabel: '💻 SOFTWARE & APP',
        color: '#6366f1',
        icon: '💻',
        type: 'software',
        category: 'project',
        description: 'Desarrollo de aplicaciones web, móviles, microservicios, SaaS, APIs y herramientas digitales.',
        defaultTechStack: ['React', 'Node.js', 'Express', 'Gemini AI', 'Supabase'],
        defaultLeadAgent: 'OpenClaw Super Agent',
        defaultAgenda: [
            { id: 'ag-1', time: '09:00', title: 'Sprint Planning & Definición de Backlog', speaker: 'OpenClaw / Dev Lead', description: 'User stories, especificaciones y prioridades del sprint' },
            { id: 'ag-2', time: '14:00', title: 'Arquitectura, Esquemas DB y Endpoints', speaker: 'Lead Dev', description: 'Estructura de datos, backend APIs y modelos' },
            { id: 'ag-3', time: '18:00', title: 'Despliegue MVP & Continuous Integration', speaker: 'DevOps / QA', description: 'Testing automatizado y staging build' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Repositorio GitHub y ramas protegidas configuradas', done: true },
            { id: 'req-2', name: 'Arquitectura de base de datos y endpoints API definidos', done: false },
            { id: 'req-3', name: 'Integración de OpenClaw Super Agent para QA y tareas continuas', done: false }
        ],
        defaultMilestones: [
            { id: 'm-1', title: 'Especificación de Arquitectura & UI Wireframes', done: true, deadline: '' },
            { id: 'm-2', title: 'Desarrollo de Backend API & Core Frontend', done: false, deadline: '' },
            { id: 'm-3', title: 'Testing de Integración & Despliegue en Producción', done: false, deadline: '' }
        ]
    },
    project_business: {
        id: 'project_business',
        name: '💼 Proyecto de Negocio / Lanzamiento',
        badgeLabel: '💼 NEGOCIO / VENTURE',
        color: '#10b981',
        icon: '💼',
        type: 'business',
        category: 'project',
        description: 'Lanzamiento de nuevas líneas de negocio, alianzas comerciales, estructuración financiera y ventas.',
        defaultTechStack: ['CRM', 'Stripe', 'Google Workspace', 'Analytics'],
        defaultLeadAgent: 'Bart (COO)',
        defaultAgenda: [
            { id: 'ag-1', time: '10:00', title: 'Validación de Modelo de Monetización', speaker: 'COO / OpenClaw', description: 'Estructura de precios, CAC, LTV y unit economics' },
            { id: 'ag-2', time: '12:00', title: 'Negociación de Proveedores y Alianzas', speaker: 'Sourcing / Legal', description: 'Cierre de contratos y acuerdos clave' },
            { id: 'ag-3', time: '16:00', title: 'Lanzamiento GTM (Go-to-Market) & Ventas', speaker: 'Sales Lead', description: 'Apertura de canal comercial y prospección' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Plan financiero de costos y proyecciones de ROI', done: false },
            { id: 'req-2', name: 'Propuesta de valor y presentación comercial lista', done: false },
            { id: 'req-3', name: 'Canal de captación y cobro validado', done: false }
        ],
        defaultMilestones: [
            { id: 'm-1', title: 'Estudio de Mercado & Pricing Model', done: true, deadline: '' },
            { id: 'm-2', title: 'Setup Operativo & Cierre de Alianzas', done: false, deadline: '' },
            { id: 'm-3', title: 'Primera Cohorte de Clientes & Facturación', done: false, deadline: '' }
        ]
    },
    project_openclaw: {
        id: 'project_openclaw',
        name: '🤖 Pipeline Autónomo OpenClaw IA',
        badgeLabel: '🤖 OPENCLAW PIPELINE',
        color: '#8b5cf6',
        icon: '🤖',
        type: 'ai_pipeline',
        category: 'project',
        description: 'Automatizaciones autónomas, agentes de scraping, síntesis RAG, monitores de mercado y webhooks.',
        defaultTechStack: ['OpenClaw Super Agent', 'Python', 'Webhooks', 'RAG Store', 'OpenClaw'],
        defaultLeadAgent: 'OpenClaw Super Agent',
        defaultAgenda: [
            { id: 'ag-1', time: '08:00', title: 'Ingesta de Datos y Vectorización RAG', speaker: 'OpenClaw Super Agent', description: 'Indexación periódica de documentos y fuentes' },
            { id: 'ag-2', time: '12:00', title: 'Ejecución de Triggers y Acciones Autónomas', speaker: 'OpenClaw Super Agent', description: 'Procesamiento de eventos y tareas delegadas' },
            { id: 'ag-3', time: '19:00', title: 'Generación de Reporte y Resumen Diario', speaker: 'OpenClaw Super Agent', description: 'Registro de KPIs, hallazgos y alertas' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Webhook OpenClaw conectado a /api/openclaw/action', done: true },
            { id: 'req-2', name: 'Esquema de herramientas (JSON tools) activado', done: true },
            { id: 'req-3', name: 'RAG Knowledge Vault alimentado con datos clave', done: false }
        ],
        defaultMilestones: [
            { id: 'm-1', title: 'Conexión de Webhook & Autenticación', done: true, deadline: '' },
            { id: 'm-2', title: 'Pruebas de Tool Calling & Acciones Autónomas', done: true, deadline: '' },
            { id: 'm-3', title: 'Operación Continua & Auto-Monitoreo', done: false, deadline: '' }
        ]
    },
    project_marketing: {
        id: 'project_marketing',
        name: '📣 Campaña de Marketing & Media',
        badgeLabel: '📣 MARKETING & ADS',
        color: '#ec4899',
        icon: '📣',
        type: 'marketing',
        category: 'project',
        description: 'Campañas publicitarias, estrategia de redes sociales, lanzamientos virales y pauta digital.',
        defaultTechStack: ['Meta Ads', 'TikTok Ads', 'Instagram', 'Canva', 'Analytics'],
        defaultLeadAgent: 'Nexus (Marketing)',
        defaultAgenda: [
            { id: 'ag-1', time: '11:00', title: 'Diseño de Creativos y Copywriting', speaker: 'Echo / Nexus', description: 'Piezas gráficas, videos y copies persuasivos' },
            { id: 'ag-2', time: '15:00', title: 'Lanzamiento de Pauta & Segmentación', speaker: 'Nexus (Marketing)', description: 'Activación de campañas en Meta & TikTok' },
            { id: 'ag-3', time: '20:00', title: 'Medición de CVR, ROAS y Optimización', speaker: 'Sentinel', description: 'Ajuste de presupuesto y escalado' }
        ],
        defaultRequirements: [
            { id: 'req-1', name: 'Presupuesto de pauta asignado', done: false },
            { id: 'req-2', name: 'Creativos y video hooks aprobados', done: false },
            { id: 'req-3', name: 'Píxeles de conversión y tracking activos', done: false }
        ],
        defaultMilestones: [
            { id: 'm-1', title: 'Briefing Creativo & Producción de Contenido', done: true, deadline: '' },
            { id: 'm-2', title: 'Pauta Activa & Testeo de Audiencias', done: false, deadline: '' },
            { id: 'm-3', title: 'Escala de Campaña & Reporte de ROAS', done: false, deadline: '' }
        ]
    },

    // ─── EVENTOS & PRODUCCIÓN ───
    eventos: {
        id: 'eventos',
        name: '🎉 Evento Estándar',
        badgeLabel: '🎉 EVENTO',
        color: '#f43f5e',
        icon: '🎉',
        type: 'eventos',
        category: 'event',
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
        category: 'event',
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
        category: 'operations',
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

// Aliases para compatibilidad
export const EVENT_TEMPLATES = PROJECT_AND_EVENT_TEMPLATES;

export default function Eventos() {
    const {
        events, addEvent, updateEvent, deleteEvent, reorderEvents,
        projects, addProject, updateProject, deleteProject, reorderProjects,
        triggerOpenClawAction, openclawLogs
    } = useApp();
    const navigate = useNavigate();

    // ─── States ──────────────────────────────────────────────────────────
    const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'projects' | 'events' | 'operations' | 'openclaw'
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showOpenClawModal, setShowOpenClawModal] = useState(false);
    const [editingEntity, setEditingEntity] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [copiedSnippet, setCopiedSnippet] = useState('');
    const [openclawTestLoading, setOpenclawTestLoading] = useState(false);
    const [openclawTestFeedback, setOpenclawTestFeedback] = useState(null);

    const emptyForm = {
        name: '',
        category: 'project', // 'project' | 'event' | 'operations'
        templateKey: 'project_software',
        type: 'software',
        description: PROJECT_AND_EVENT_TEMPLATES.project_software.description,
        status: 'active',
        priority: 'high',
        date: '', time: '', location: '', capacity: '', estimatedBudget: '',
        organizer: 'OpenClaw Super Agent', contactPerson: '', phone: '', email: '',
        leadAgent: 'OpenClaw Super Agent',
        techStackText: 'React, Node.js, Express, Gemini AI',
        githubRepo: '',
        notes: '',
        color: PROJECT_AND_EVENT_TEMPLATES.project_software.color,
        icon: PROJECT_AND_EVENT_TEMPLATES.project_software.icon,
        driveFolderId: '',
        agenda: PROJECT_AND_EVENT_TEMPLATES.project_software.defaultAgenda,
        requirements: PROJECT_AND_EVENT_TEMPLATES.project_software.defaultRequirements,
        milestones: PROJECT_AND_EVENT_TEMPLATES.project_software.defaultMilestones
    };

    const [form, setForm] = useState(emptyForm);

    // ─── Data Unification ────────────────────────────────────────────────
    const combinedEntities = (() => {
        const map = new Map();
        
        // Add events
        (events || []).forEach(e => {
            if (e && e.id) map.set(e.id, { ...e, entityKind: e.category === 'project' ? 'project' : 'event' });
        });

        // Add projects
        (projects || []).forEach(p => {
            if (p && p.id) {
                const existing = map.get(p.id);
                map.set(p.id, {
                    ...existing,
                    ...p,
                    entityKind: 'project',
                    category: p.category || 'project',
                    templateKey: p.templateKey || (p.category === 'software' ? 'project_software' : p.category === 'business' ? 'project_business' : 'project_software')
                });
            }
        });

        return Array.from(map.values());
    })();

    // ─── Filter Logic ────────────────────────────────────────────────────
    const filteredEntities = combinedEntities.filter(item => {
        if (!item) return false;
        
        if (selectedCategory === 'projects') {
            const isProj = item.entityKind === 'project' || item.category === 'project' || ['software', 'business', 'marketing', 'ai_pipeline'].includes(item.type);
            if (!isProj) return false;
        } else if (selectedCategory === 'events') {
            const isEv = item.entityKind === 'event' && !['software', 'business', 'ai_pipeline', '212_admin'].includes(item.type);
            if (!isEv) return false;
        } else if (selectedCategory === 'operations') {
            const isOp = item.category === 'operations' || item.type === '212_admin';
            if (!isOp) return false;
        } else if (selectedCategory === 'openclaw') {
            const isOpenClaw = (item.leadAgent && item.leadAgent.toLowerCase().includes('openclaw')) ||
                             (item.type === 'ai_pipeline') ||
                             (item.templateKey === 'project_openclaw') ||
                             (item.tags && item.tags.some(t => t.toLowerCase().includes('openclaw')));
            if (!isOpenClaw) return false;
        }

        const q = (searchQuery || '').toLowerCase();
        const n = (item.name || '').toLowerCase();
        const t = (item.type || '').toLowerCase();
        const tmpl = (item.templateKey || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const stack = Array.isArray(item.techStack) ? item.techStack.join(' ').toLowerCase() : '';
        return n.includes(q) || t.includes(q) || tmpl.includes(q) || desc.includes(q) || stack.includes(q);
    });

    const totalProjectsCount = combinedEntities.filter(i => i.entityKind === 'project' || i.category === 'project' || ['software', 'business', 'marketing', 'ai_pipeline'].includes(i.type)).length;
    const totalEventsCount = combinedEntities.filter(i => i.entityKind === 'event' && !['software', 'business', 'ai_pipeline', '212_admin'].includes(i.type)).length;
    const openclawCount = combinedEntities.filter(i => (i.leadAgent && i.leadAgent.toLowerCase().includes('openclaw')) || i.type === 'ai_pipeline' || i.templateKey === 'project_openclaw').length;

    // ─── Helpers ─────────────────────────────────────────────────────────
    const formatEntityDate = (dateStr) => {
        if (!dateStr) return 'Sin fecha límite';
        try {
            const date = new Date(dateStr + 'T12:00');
            const formatted = date.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch (e) {
            return dateStr;
        }
    };

    const getTemplateBadge = (item) => {
        const key = item.templateKey || (
            item.type === 'software' ? 'project_software' :
            item.type === 'business' ? 'project_business' :
            item.type === 'ai_pipeline' ? 'project_openclaw' :
            item.type === 'marketing' ? 'project_marketing' :
            item.type === 'casco_peatonal' ? 'casco_peatonal' :
            item.type === '212_admin' ? '212_admin' : 'eventos'
        );
        return PROJECT_AND_EVENT_TEMPLATES[key] || PROJECT_AND_EVENT_TEMPLATES.eventos;
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'active':
            case 'activo':
            case 'in_progress':
            case 'ejecucion':
                return { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.25)', label: 'Activo / En Curso' };
            case 'planning':
            case 'upcoming':
            case 'planificacion':
                return { bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)', label: 'Planificación' };
            case 'completed':
            case 'finalizado':
                return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)', label: 'Completado' };
            case 'paused':
            case 'pausado':
                return { bg: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.25)', label: 'Pausado' };
            case 'critical':
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)', label: 'Prioridad Crítica' };
            default:
                return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)', label: status || 'Activo' };
        }
    };

    // ─── Drag & Drop Reorder ─────────────────────────────────────────────
    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const sourceIdx = result.source.index;
        const destIdx = result.destination.index;
        if (sourceIdx === destIdx) return;

        const currentList = [...filteredEntities];
        const [movedItem] = currentList.splice(sourceIdx, 1);
        currentList.splice(destIdx, 0, movedItem);

        if (reorderEvents) reorderEvents(currentList);
        if (reorderProjects) reorderProjects(currentList);
    };

    // ─── Modal Open / Save ───────────────────────────────────────────────
    const openModal = (item = null) => {
        if (item) {
            setEditingEntity(item);
            const tmplKey = item.templateKey || (
                item.type === 'software' ? 'project_software' :
                item.type === 'business' ? 'project_business' :
                item.type === 'ai_pipeline' ? 'project_openclaw' :
                item.type === 'casco_peatonal' ? 'casco_peatonal' :
                item.type === '212_admin' ? '212_admin' : 'eventos'
            );
            setForm({
                ...emptyForm,
                ...item,
                templateKey: tmplKey,
                category: item.category || (item.entityKind === 'project' ? 'project' : 'event'),
                techStackText: Array.isArray(item.techStack) ? item.techStack.join(', ') : (item.techStack || ''),
                agenda: item.agenda ? JSON.parse(JSON.stringify(item.agenda)) : [],
                requirements: item.requirements ? JSON.parse(JSON.stringify(item.requirements)) : [],
                milestones: item.milestones ? JSON.parse(JSON.stringify(item.milestones)) : []
            });
        } else {
            setEditingEntity(null);
            setForm({ ...emptyForm });
        }
        setShowModal(true);
    };

    const handleTemplateChange = (newKey) => {
        const tmpl = PROJECT_AND_EVENT_TEMPLATES[newKey] || PROJECT_AND_EVENT_TEMPLATES.project_software;
        setForm(prev => ({
            ...prev,
            templateKey: newKey,
            type: tmpl.type,
            category: tmpl.category,
            icon: tmpl.icon,
            color: tmpl.color,
            leadAgent: tmpl.defaultLeadAgent || prev.leadAgent,
            techStackText: tmpl.defaultTechStack ? tmpl.defaultTechStack.join(', ') : prev.techStackText,
            description: prev.description && prev.description !== emptyForm.description ? prev.description : tmpl.description,
            agenda: tmpl.defaultAgenda ? JSON.parse(JSON.stringify(tmpl.defaultAgenda)) : [],
            requirements: tmpl.defaultRequirements ? JSON.parse(JSON.stringify(tmpl.defaultRequirements)) : [],
            milestones: tmpl.defaultMilestones ? JSON.parse(JSON.stringify(tmpl.defaultMilestones)) : []
        }));
    };

    const saveEntity = () => {
        if (!form.name.trim()) return;

        const stackArray = form.techStackText ? form.techStackText.split(',').map(s => s.trim()).filter(Boolean) : [];

        const syncedEntity = {
            ...form,
            techStack: stackArray,
            budget: form.estimatedBudget || form.budget || '0',
            estimatedBudget: form.estimatedBudget || form.budget || '0',
            organizer: form.leadAgent || form.organizer || 'OpenClaw Super Agent'
        };

        if (editingEntity) {
            if (form.category === 'project' || syncedEntity.entityKind === 'project') {
                updateProject(editingEntity.id, syncedEntity);
            } else {
                updateEvent(editingEntity.id, syncedEntity);
            }
        } else {
            const newId = `${form.category === 'project' ? 'proj' : 'ev'}-${Date.now()}`;
            const newItem = { id: newId, ...syncedEntity };
            if (form.category === 'project') {
                addProject(newItem);
            } else {
                addEvent(newItem);
            }
        }
        setShowModal(false);
    };

    const handleDelete = (id) => {
        deleteEvent(id);
        deleteProject(id);
        setShowDeleteConfirm(null);
    };

    // ─── OpenClaw Simulator Test ───────────────────────────────────────────
    const handleTriggerOpenClawDemo = async () => {
        setOpenclawTestLoading(true);
        setOpenclawTestFeedback(null);
        try {
            const demoProject = {
                name: `Proyecto Autónomo OpenClaw ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                description: 'Pipeline de automatización e inteligencia creado directamente vía OpenClaw Webhook Action.',
                category: 'ai_pipeline',
                type: 'ai_pipeline',
                priority: 'critical',
                status: 'active',
                deadline: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                budget: '2500',
                techStack: ['OpenClaw Super Agent', 'Python', 'FastAPI', 'RAG Store', 'OpenClaw'],
                githubRepo: 'https://github.com/openclaw-agent/pipeline-core',
                leadAgent: 'OpenClaw Super Agent',
                milestones: [
                    { title: 'Conexión & Ingesta RAG', done: true },
                    { title: 'Ejecución de Scrapers & Síntesis', done: false },
                    { title: 'Reporte Automatizado a Dashboard', done: false }
                ]
            };

            await triggerOpenClawAction('create_project', demoProject);
            setOpenclawTestFeedback({
                type: 'success',
                message: `✅ ¡Acción ejecutada! OpenClaw creó el proyecto "${demoProject.name}". Se ha sincronizado en el Hub.`
            });
        } catch (e) {
            setOpenclawTestFeedback({ type: 'error', message: `Error: ${e.message}` });
        } finally {
            setOpenclawTestLoading(false);
        }
    };

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(key);
        setTimeout(() => setCopiedSnippet(''), 2000);
    };

    return (
        <div className="page-content animate-in">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🚀 Hub de Proyectos & Eventos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        Command Center unificado para Desarrollo de Software, Negocios, Campañas, Producción de Eventos y OpenClaw Super Agent.
                    </p>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowOpenClawModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.08))',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
                            color: '#a78bfa'
                        }}
                    >
                        <Bot size={16} /> Conectar OpenClaw Agent
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Nuevo Proyecto / Evento
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="empresas-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <MetricCard icon={<Code size={20} />} color="#6366f1" label="Proyectos Digitales" value={totalProjectsCount} />
                <MetricCard icon={<CalendarDays size={20} />} color="#f43f5e" label="Eventos & Producción" value={totalEventsCount} />
                <MetricCard icon={<Bot size={20} />} color="#8b5cf6" label="OpenClaw Agent Active" value={openclawCount} />
                <MetricCard icon={<Layers size={20} />} color="#10b981" label="Total Entidades" value={combinedEntities.length} />
            </div>

            {/* Category Filter Tabs & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { id: 'all', label: '🌐 Todos', count: combinedEntities.length },
                        { id: 'projects', label: '🚀 Proyectos & Software', count: totalProjectsCount },
                        { id: 'events', label: '🎉 Eventos', count: totalEventsCount },
                        { id: 'operations', label: '🏢 Operaciones & Club', count: combinedEntities.filter(i => i.category === 'operations' || i.type === '212_admin').length },
                        { id: 'openclaw', label: '🤖 OpenClaw Agent', count: openclawCount }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedCategory(tab.id)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                border: selectedCategory === tab.id ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                                background: selectedCategory === tab.id ? 'rgba(124, 92, 252, 0.18)' : 'rgba(255,255,255,0.03)',
                                color: selectedCategory === tab.id ? '#fff' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <span>{tab.label}</span>
                            <span style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                background: selectedCategory === tab.id ? 'rgba(124,92,252,0.4)' : 'rgba(255,255,255,0.08)',
                                color: '#fff'
                            }}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '380px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        className="form-input"
                        placeholder="Buscar proyectos, stack, eventos..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '38px', width: '100%' }}
                    />
                </div>
            </div>

            {/* Entity Cards Grid with Drag & Drop */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="unified-hub-grid" direction="horizontal">
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="grid-auto"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '22px' }}
                        >
                            {filteredEntities.map((item, index) => {
                                const tmpl = getTemplateBadge(item);
                                const color = item.color || tmpl.color;
                                const statusStyle = getStatusStyle(item.status);
                                const isProject = item.entityKind === 'project' || item.category === 'project' || ['software', 'business', 'marketing', 'ai_pipeline'].includes(item.type);
                                const completedMilestones = (item.milestones || []).filter(m => m.done).length;
                                const totalMilestones = (item.milestones || []).length;

                                return (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(draggableProvided, snapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                onClick={() => navigate(`/eventos/${item.id}`)}
                                                style={{
                                                    ...draggableProvided.draggableProps.style,
                                                    cursor: 'pointer',
                                                    transition: snapshot.isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                                    border: snapshot.isDragging ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.07)',
                                                    borderRadius: '22px',
                                                    background: 'linear-gradient(145deg, rgba(22, 22, 36, 0.75), rgba(15, 15, 24, 0.9))',
                                                    backdropFilter: 'blur(20px)',
                                                    padding: '22px',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    boxShadow: snapshot.isDragging ? `0 20px 50px ${color}40` : '0 10px 30px rgba(0, 0, 0, 0.25)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={e => {
                                                    if (!snapshot.isDragging) {
                                                        e.currentTarget.style.border = `1px solid ${color}60`;
                                                        e.currentTarget.style.boxShadow = `0 16px 36px ${color}20, 0 0 0 1px ${color}35 inset`;
                                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (!snapshot.isDragging) {
                                                        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.07)';
                                                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.25)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }
                                                }}
                                            >
                                                {/* Radial Glow */}
                                                <div style={{
                                                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                                                    width: '140%', height: '90px', background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                                                    opacity: 0.8, pointerEvents: 'none', filter: 'blur(25px)'
                                                }} />

                                                <div>
                                                    {/* Top Badges & Drag handle */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', position: 'relative', zIndex: 2 }}>
                                                        <div
                                                            {...draggableProvided.dragHandleProps}
                                                            onClick={e => e.stopPropagation()}
                                                            title="Arrastrar para reordenar prioridad"
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                                padding: '4px 8px', borderRadius: '8px',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'grab', fontSize: '11px', fontWeight: 600
                                                            }}
                                                        >
                                                            <GripVertical size={13} style={{ color: color }} />
                                                            <span>#{index + 1}</span>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            {item.leadAgent && item.leadAgent.toLowerCase().includes('openclaw') && (
                                                                <span style={{
                                                                    fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                                                                    borderRadius: '8px', background: 'rgba(139, 92, 246, 0.2)',
                                                                    color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.4)',
                                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}>
                                                                    <Bot size={11} /> OpenClaw
                                                                </span>
                                                            )}
                                                            <span style={{
                                                                fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                                                                borderRadius: '8px', background: `${color}18`,
                                                                color: color, border: `1px solid ${color}35`,
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                {tmpl.badgeLabel}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Title & Icon Header */}
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
                                                        <div style={{
                                                            width: '46px', height: '46px', borderRadius: '14px',
                                                            background: `linear-gradient(135deg, ${color}25, ${color}08)`,
                                                            border: `1px solid ${color}40`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                                                            flexShrink: 0
                                                        }}>{item.icon || tmpl.icon}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.3 }}>
                                                                {item.name}
                                                            </h3>
                                                            {item.leadAgent && (
                                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                                    Lead: <strong style={{ color: 'var(--text-secondary)' }}>{item.leadAgent}</strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                                            <button className="btn-icon" style={{ padding: '6px' }} onClick={() => openModal(item)} title="Editar"><Edit3 size={13} /></button>
                                                            <button className="btn-icon" style={{ padding: '6px' }} onClick={() => setShowDeleteConfirm(item.id)} title="Eliminar"><Trash2 size={13} /></button>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <p style={{
                                                        fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5',
                                                        marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical', overflow: 'hidden', position: 'relative', zIndex: 1
                                                    }}>
                                                        {item.description || tmpl.description}
                                                    </p>

                                                    {/* Tech Stack Pills (if project) */}
                                                    {isProject && item.techStack && item.techStack.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
                                                            {(Array.isArray(item.techStack) ? item.techStack : [item.techStack]).slice(0, 4).map((tech, i) => (
                                                                <span key={i} style={{
                                                                    fontSize: '10.5px', padding: '2px 8px', borderRadius: '6px',
                                                                    background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
                                                                    border: '1px solid rgba(255,255,255,0.08)'
                                                                }}>
                                                                    {tech}
                                                                </span>
                                                            ))}
                                                            {item.techStack.length > 4 && (
                                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', alignSelf: 'center' }}>+{item.techStack.length - 4}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Project Milestones Progress */}
                                                    {isProject && totalMilestones > 0 && (
                                                        <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Hitos / Roadmap:</span>
                                                                <span style={{ color: color, fontWeight: 700 }}>{completedMilestones}/{totalMilestones} completados</span>
                                                            </div>
                                                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    width: `${(completedMilestones / totalMilestones) * 100}%`,
                                                                    height: '100%', background: color, borderRadius: '2px',
                                                                    transition: 'width 0.4s ease'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Event Metadata (Date, Location, Capacity) */}
                                                    {!isProject && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            {(item.date || item.time) && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <CalendarDays size={12} /> {formatEntityDate(item.date)}{item.time ? ` · ${item.time}` : ''}
                                                                </div>
                                                            )}
                                                            {item.location && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <MapPin size={12} /> {item.location}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bottom Footer Row */}
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '6px'
                                                }}>
                                                    <span style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                                        borderRadius: '16px', fontSize: '11px', fontWeight: '600',
                                                        background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`
                                                    }}>
                                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                                                        {statusStyle.label}
                                                    </span>

                                                    {(item.budget || item.estimatedBudget) && parseFloat(item.budget || item.estimatedBudget) > 0 ? (
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                            ${parseFloat(item.budget || item.estimatedBudget).toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                            {item.date ? formatEntityDate(item.date) : 'Roadmap Activo'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Delete Confirmation Overlay */}
                                                {showDeleteConfirm === item.id && (
                                                    <div style={{
                                                        position: 'absolute', inset: 0, background: 'rgba(15, 15, 20, 0.96)', backdropFilter: 'blur(8px)',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                                                        borderRadius: '22px', padding: '20px', textAlign: 'center'
                                                    }} onClick={e => e.stopPropagation()}>
                                                        <Trash2 size={28} style={{ color: '#ef4444', marginBottom: '12px' }} />
                                                        <p style={{ fontSize: '15px', color: '#fff', fontWeight: '600', marginBottom: '4px' }}>¿Eliminar este registro?</p>
                                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '18px' }}>Esta acción quitará el proyecto/evento del dashboard.</p>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
                                                            <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 16px', fontSize: '12px', borderRadius: '10px' }} onClick={() => handleDelete(item.id)}>Sí, eliminar</button>
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

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* ─── MODAL: CONECTAR OPENCLAW AGENT ─────────────────────────────── */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {showOpenClawModal && (
                <div className="modal-overlay" onClick={() => setShowOpenClawModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Bot size={20} style={{ color: '#a78bfa' }} />
                                </div>
                                <div>
                                    <h2 className="modal-title" style={{ margin: 0 }}>OpenClaw Super Agent Connection Hub</h2>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Endpoints REST, Webhooks y Schemas de Tools para tu Agente OpenClaw</span>
                                </div>
                            </div>
                            <button className="btn-icon" onClick={() => setShowOpenClawModal(false)}><X size={18} /></button>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {/* Server Status Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>OpenClaw Bridge API Activo en Puerto 8090</span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>v2.0 REST / Tool Calling</span>
                            </div>

                            {/* Webhook Endpoints Box */}
                            <ModalSectionLabel>Endpoints de Integración Directa</ModalSectionLabel>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>POST Webhook & Actions (Crear Proyectos/Eventos/Tareas)</span>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                                            onClick={() => copyToClipboard('http://localhost:8090/api/openclaw/action', 'action_url')}
                                        >
                                            {copiedSnippet === 'action_url' ? <Check size={12} color="#22c55e" /> : <Copy size={12} />} Copiar
                                        </button>
                                    </div>
                                    <code style={{ fontSize: '12px', color: '#fff', wordBreak: 'break-all' }}>http://localhost:8090/api/openclaw/action</code>
                                </div>

                                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7' }}>GET State Snapshot (Consultar Proyectos, Tareas y RAG)</span>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                                            onClick={() => copyToClipboard('http://localhost:8090/api/openclaw/state', 'state_url')}
                                        >
                                            {copiedSnippet === 'state_url' ? <Check size={12} color="#22c55e" /> : <Copy size={12} />} Copiar
                                        </button>
                                    </div>
                                    <code style={{ fontSize: '12px', color: '#fff', wordBreak: 'break-all' }}>http://localhost:8090/api/openclaw/state</code>
                                </div>
                            </div>

                            <ModalDivider />

                            {/* Tools Schema for OpenClaw Config */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <ModalSectionLabel>Definición de Tools para OpenClaw (JSON)</ModalSectionLabel>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '4px 10px', fontSize: '11px' }}
                                    onClick={() => copyToClipboard(JSON.stringify({
                                        tools: [
                                            {
                                                type: 'function',
                                                function: {
                                                    name: 'create_project',
                                                    description: 'Crea un nuevo proyecto en el dashboard.',
                                                    parameters: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            description: { type: 'string' },
                                                            category: { type: 'string', enum: ['software', 'business', 'marketing', 'ai_pipeline'] },
                                                            techStack: { type: 'array', items: { type: 'string' } },
                                                            deadline: { type: 'string' }
                                                        },
                                                        required: ['name', 'description']
                                                    }
                                                }
                                            }
                                        ]
                                    }, null, 2), 'tools_json')}
                                >
                                    {copiedSnippet === 'tools_json' ? <Check size={12} color="#22c55e" /> : <Copy size={12} />} Copiar JSON Tools
                                </button>
                            </div>
                            <pre style={{
                                background: '#0d1117', padding: '14px', borderRadius: '12px',
                                fontSize: '11px', color: '#38bdf8', overflowX: 'auto', maxHeight: '140px',
                                border: '1px solid rgba(255,255,255,0.06)'
                            }}>
{`// Ejemplo de llamada desde OpenClaw Super Agent:
POST http://localhost:8090/api/openclaw/action
Content-Type: application/json

{
  "action": "create_project",
  "payload": {
    "name": "App Móvil de Entradas",
    "description": "Sistema de boletos QR y control de aforo",
    "category": "software",
    "techStack": ["React Native", "FastAPI", "Postgres"],
    "deadline": "2026-09-30"
  }
}`}
                            </pre>

                            <ModalDivider />

                            {/* Interactive Test Sandbox */}
                            <ModalSectionLabel>Probador Interactivo de OpenClaw Bridge</ModalSectionLabel>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Haz clic para simular que tu OpenClaw Super Agent envía una orden autónoma para crear un nuevo proyecto:
                            </p>

                            <button
                                className="btn btn-primary"
                                onClick={handleTriggerOpenClawDemo}
                                disabled={openclawTestLoading}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                }}
                            >
                                <Zap size={16} />
                                {openclawTestLoading ? 'Simulando ejecución de OpenClaw...' : 'Disparar Proyecto de Prueba con OpenClaw'}
                            </button>

                            {openclawTestFeedback && (
                                <div style={{
                                    marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                                    fontSize: '12px',
                                    background: openclawTestFeedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: openclawTestFeedback.type === 'success' ? '#4ade80' : '#f87171',
                                    border: `1px solid ${openclawTestFeedback.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                                }}>
                                    {openclawTestFeedback.message}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowOpenClawModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* ─── MODAL CREAR / EDITAR PROYECTO O EVENTO ───────────────────── */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingEntity ? 'Editar' : 'Nuevo'} {form.category === 'project' ? 'Proyecto' : 'Evento / Operación'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

                            {/* ── CATEGORY SELECTOR ── */}
                            <ModalSectionLabel>1. Tipo de Entidad Principal</ModalSectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                {[
                                    { id: 'project', label: '🚀 Proyecto', desc: 'Software / Negocio / IA' },
                                    { id: 'event', label: '🎉 Evento', desc: 'Fiesta / Concierto / Casco' },
                                    { id: 'operations', label: '🏢 Operación', desc: 'Club / Inventario / Local' }
                                ].map(cat => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => {
                                            const defaultKey = cat.id === 'project' ? 'project_software' : cat.id === 'event' ? 'eventos' : '212_admin';
                                            handleTemplateChange(defaultKey);
                                        }}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: form.category === cat.id ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                                            background: form.category === cat.id ? 'rgba(124, 92, 252, 0.15)' : 'rgba(255,255,255,0.02)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{cat.label}</div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{cat.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {/* ── TEMPLATE SELECTOR ── */}
                            <ModalSectionLabel>2. Plantilla Preconfigurada</ModalSectionLabel>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <select
                                    className="form-select"
                                    value={form.templateKey || 'project_software'}
                                    onChange={e => handleTemplateChange(e.target.value)}
                                    style={{
                                        background: 'rgba(124, 92, 252, 0.1)',
                                        borderColor: 'var(--accent-primary)',
                                        color: '#fff',
                                        fontWeight: '600'
                                    }}
                                >
                                    <optgroup label="🚀 Proyectos & Tecnología">
                                        <option value="project_software">💻 Proyecto Software / App / Web</option>
                                        <option value="project_business">💼 Proyecto de Negocio / Lanzamiento</option>
                                        <option value="project_openclaw">🤖 Pipeline Autónomo OpenClaw IA</option>
                                        <option value="project_marketing">📣 Campaña de Marketing & Media</option>
                                    </optgroup>
                                    <optgroup label="🎉 Eventos & Producción">
                                        <option value="eventos">🎉 Evento Estándar (Corporativo / Fiesta)</option>
                                        <option value="casco_peatonal">🚶‍♂️ Casco Peatonal (Logística de Vías)</option>
                                    </optgroup>
                                    <optgroup label="🏢 Operaciones">
                                        <option value="212_admin">🏢 212 Club Admin (Inventario & Caja)</option>
                                    </optgroup>
                                </select>
                            </div>

                            <ModalDivider />

                            {/* ── BASIC INFO ── */}
                            <ModalSectionLabel>3. Información General</ModalSectionLabel>
                            <div className="form-group">
                                <label className="form-label">Nombre del {form.category === 'project' ? 'Proyecto' : 'Evento'} *</label>
                                <input
                                    className="form-input"
                                    placeholder={form.category === 'project' ? 'Ej: Plataforma SaaS de Tickets' : 'Ej: Festival Sunset Casco'}
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Responsable / Lead Agent</label>
                                    <input className="form-input" placeholder="Ej: OpenClaw Super Agent, Bart (COO), etc." value={form.leadAgent} onChange={e => setForm({ ...form, leadAgent: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Estado</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="active">Activo / En Curso</option>
                                        <option value="planning">En Planificación</option>
                                        <option value="paused">Pausado</option>
                                        <option value="completed">Completado</option>
                                        <option value="critical">Prioridad Crítica</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descripción / Alcance</label>
                                <textarea className="form-textarea" rows={2} placeholder="Objetivo, entregables o detalles..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>

                            {/* Project Specific Fields */}
                            {form.category === 'project' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Tech Stack / Herramientas (separadas por coma)</label>
                                        <input className="form-input" placeholder="Ej: React, Python, Gemini AI, Docker" value={form.techStackText} onChange={e => setForm({ ...form, techStackText: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Repositorio GitHub / Enlace Código (Opcional)</label>
                                        <input className="form-input" placeholder="https://github.com/..." value={form.githubRepo || ''} onChange={e => setForm({ ...form, githubRepo: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Ícono</label>
                                    <input className="form-input" style={{ textAlign: 'center', fontSize: '20px' }} value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Color Distintivo</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                                        <input className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                </div>
                            </div>

                            <ModalDivider />

                            {/* ── DATES & BUDGET ── */}
                            <ModalSectionLabel>4. Fechas y Presupuesto</ModalSectionLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">{form.category === 'project' ? 'Fecha Límite / Deadline' : 'Fecha del Evento'}</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Presupuesto ($)</label>
                                    <input className="form-input" placeholder="5000" value={form.estimatedBudget} onChange={e => setForm({ ...form, estimatedBudget: e.target.value })} />
                                </div>
                            </div>

                            {form.category !== 'project' && (
                                <div className="form-group">
                                    <label className="form-label">Ubicación / Venue</label>
                                    <input className="form-input" placeholder="Ej: Casco Antiguo, Calle 3ra" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveEntity}>
                                {editingEntity ? 'Guardar Cambios' : 'Crear Registro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Metric Card Component ── */
function MetricCard({ icon, color, label, value }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '18px', padding: '20px',
            background: `linear-gradient(135deg, rgba(22, 22, 35, 0.8), rgba(20, 20, 30, 0.9))`,
            border: `1px solid ${color}30`,
            borderRadius: '18px',
            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`,
            backdropFilter: 'blur(12px)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
                background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, filter: 'blur(20px)', opacity: 0.6
            }} />
            <div style={{
                width: '50px', height: '50px', borderRadius: '14px',
                background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `inset 0 2px 10px ${color}20`
            }}>
                <span style={{ color, filter: `drop-shadow(0 0 8px ${color}80)` }}>{icon}</span>
            </div>
            <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
            </div>
        </div>
    );
}

function ModalSectionLabel({ children }) {
    return <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{children}</div>;
}

function ModalDivider() {
    return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '18px 0' }} />;
}
