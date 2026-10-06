import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Instagram, Youtube, Twitter, Facebook, Plus, X, Edit3, Trash2,
    ExternalLink, Users, TrendingUp, CalendarDays, Hash, Share2,
    BarChart3, Eye, Heart, MessageCircle, ArrowRight, Sparkles,
    Globe, Music, Video, Camera, LinkIcon, ArrowLeft, Image,
    Film, CheckCircle2, Clock, Play, FileText, Check, ChevronRight,
    Search, Filter, Sliders, Copy, Send, FolderGit2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ContentCalendarGrid from '../components/ContentCalendarGrid';
import '../components/SocialEngine.css';

const PLATFORM_META = {
    Instagram: { icon: Instagram, color: '#E1306C', gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
    YouTube: { icon: Youtube, color: '#FF0000', gradient: 'linear-gradient(135deg, #FF0000, #CC0000)' },
    TikTok: { icon: Music, color: '#00f2ea', gradient: 'linear-gradient(135deg, #00f2ea, #ff0050)' },
    Twitter: { icon: Twitter, color: '#1DA1F2', gradient: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)' },
    Facebook: { icon: Facebook, color: '#1877F2', gradient: 'linear-gradient(135deg, #1877F2, #0c5dc7)' },
    LinkedIn: { icon: Globe, color: '#0A66C2', gradient: 'linear-gradient(135deg, #0A66C2, #004182)' },
    Website: { icon: Globe, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
};

// ─── Pipeline Column Configurations ───
const PIPELINE_COLUMNS = [
    { id: 'idea', label: '💡 Ideas & Ángulos', color: '#94a3b8' },
    { id: 'script', label: '✍️ Guión & Hooks', color: '#fbbf24' },
    { id: 'shooting', label: '🎬 Por Grabar / Rodaje', color: '#c084fc' },
    { id: 'editing', label: '✂️ En Edición 4K', color: '#60a5fa' },
    { id: 'ready', label: '✅ Listo / Aprobado', color: '#34d399' },
    { id: 'published', label: '🚀 Publicado', color: '#22c55e' }
];

// ─── Viral Hooks Vault Database (Fórmulas de Contenido DURO) ───
const VIRAL_HOOKS_VAULT = [
    {
        id: 'hook-1',
        category: 'Negativo / Shock',
        text: 'El peor error que cometen al salir de noche en Panamá...',
        why: 'Genera miedo a perderse algo (FOMO) o a tomar una mala decisión. Retención promedio +65% en los primeros 3s.',
        pillar: 'Nightlife & Venues'
    },
    {
        id: 'hook-2',
        category: 'POV & Experiencia',
        text: 'POV: Fuiste invitada a la mesa imperial de ARRIVE Models en Casco...',
        why: 'Inmersión instantánea. Ideal para creadoras de contenido y chicas que quieren pertenecer al grupo VIP.',
        pillar: 'ARRIVE Models & Talento'
    },
    {
        id: 'hook-3',
        category: 'Curiosidad / Secretos',
        text: 'Existe una puerta escondida en el Casco que el 99% de la gente ignora...',
        why: 'Despierta el instinto de exploración y exclusividad. Fomenta guardados masivos en Instagram.',
        pillar: 'Speakeasy & Coctelería'
    },
    {
        id: 'hook-4',
        category: 'Gastronomía & Rooftops',
        text: '5 razones por las que este atardecer arruinará todos los demás rooftops para ti.',
        why: 'Usa una polarización sutil que obliga al usuario a ver las 5 razones para corroborar si es verdad.',
        pillar: 'Terraplén Rooftop'
    },
    {
        id: 'hook-5',
        category: 'Shock & Beat Drop',
        text: 'Cuando la cena tranquila de un viernes termina convirtiéndose en esto...',
        why: 'Perfecto para Reels con beat drop (de comer sushi a show de botellas con bengalas en FURIA).',
        pillar: 'Furia Club Panamá'
    },
    {
        id: 'hook-6',
        category: 'Negocios & Crecimiento',
        text: 'Deja de quemar plata en anuncios de Instagram si tu local sigue vacío los jueves.',
        why: 'Ataca un dolor directo de los dueños de negocios y posiciona a ARRIVE Agency como autoridad operativa.',
        pillar: 'ARRIVE Agency Growth'
    },
    {
        id: 'hook-7',
        category: 'Cenas de Chicas & Lifestyle',
        text: 'Lo que nadie te cuenta de cómo se eligen las invitadas a las cenas VIP de Panamá.',
        why: 'Detrás de escena aspiracional que genera cientos de comentarios y solicitudes por DM.',
        pillar: 'ARRIVE Models'
    },
    {
        id: 'hook-8',
        category: 'Alta Coctelería',
        text: 'Pedí el cóctel más caro de la carta y esto fue lo que me trajeron.',
        why: 'Curiosidad por lujo y experiencia estética. Excelente para destacar mixología de autor.',
        pillar: 'Gastronomía'
    },
    {
        id: 'hook-9',
        category: 'Behind The Scenes',
        text: 'Así grabamos 12 Reels 4K en una sola tarde con el equipo de ARRIVE Studio.',
        why: 'Muestra rigor técnico, cámaras Sony FX3, iluminación pro y velocidad de entrega para clientes.',
        pillar: 'ARRIVE Studio'
    },
    {
        id: 'hook-10',
        category: 'Listas & Ranking',
        text: 'Los únicos 3 spots en Casco Antiguo donde la música realmente vale la pena.',
        why: 'Genera debate en comentarios y alto número de shares por WhatsApp.',
        pillar: 'Nightlife'
    }
];

export default function SocialMedia() {
    const navigate = useNavigate();
    const { 
        socialMedia, addSocialMedia, updateSocialMedia, deleteSocialMedia, 
        contentTasks, addContentTask, updateContentTask, deleteContentTask,
        events, addActivity 
    } = useApp();

    // ─── Active Tab & Account Filter ───
    const [currentTab, setCurrentTab] = useState('pipeline'); // 'pipeline' | 'calendar' | 'hooks' | 'artes' | 'accounts'
    const [selectedAccountFilter, setSelectedAccountFilter] = useState('all'); // 'all' | handler
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFormat, setFilterFormat] = useState('all');

    // ─── Modals State ───
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        accountId: '',
        accountHandler: '@arriveagency',
        format: 'Reel 9:16',
        pillar: 'Branding & Lifestyle',
        status: 'idea',
        hookVerbal: '',
        hookVisual: '',
        scriptBody: '',
        cta: '',
        assignee: 'Andrés V. (Lead Filmmaker)',
        shootingLocation: 'Casco Antiguo HQ',
        assetsDriveUrl: '',
        publishDate: new Date().toISOString().split('T')[0],
        publishTime: '19:30',
        caption: '',
        hashtags: '#arriveagency #panama #nightlife #cascoantiguo'
    });

    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountFormData, setAccountFormData] = useState({
        platform: 'Instagram',
        handler: '',
        type: 'Empresa / Venue',
        url: '',
        followers: '',
        description: '',
        linkedEventIds: []
    });

    const [selectedHookCategory, setSelectedHookCategory] = useState('all');
    const [copiedHookId, setCopiedHookId] = useState(null);

    // ─── Accounts List ───
    const accounts = socialMedia || [];

    // Calculate aggregated metrics
    const totalAudience = useMemo(() => {
        return accounts.reduce((sum, acc) => {
            const num = parseFloat((acc.followers || '0').replace(/[^0-9.]/g, ''));
            const mult = (acc.followers || '').toLowerCase().includes('k') ? 1000 : 
                         (acc.followers || '').toLowerCase().includes('m') ? 1000000 : 1;
            return sum + (isNaN(num) ? 0 : num * mult);
        }, 0);
    }, [accounts]);

    const formatAudience = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    // Filtered Content Tasks
    const filteredTasks = useMemo(() => {
        return (contentTasks || []).filter(task => {
            const matchAccount = selectedAccountFilter === 'all' || 
                task.accountHandler === selectedAccountFilter ||
                task.accountId === selectedAccountFilter;
            const matchFormat = filterFormat === 'all' || task.format === filterFormat;
            const matchSearch = !searchQuery || 
                task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.hookVerbal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.accountHandler?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.scriptBody?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchAccount && matchFormat && matchSearch;
        });
    }, [contentTasks, selectedAccountFilter, filterFormat, searchQuery]);

    // Tasks grouped by status
    const tasksByColumn = useMemo(() => {
        const grouped = {};
        PIPELINE_COLUMNS.forEach(col => grouped[col.id] = []);
        filteredTasks.forEach(task => {
            const colId = task.status || 'idea';
            if (grouped[colId]) grouped[colId].push(task);
            else grouped['idea'].push(task);
        });
        return grouped;
    }, [filteredTasks]);

    // Count tasks per account
    const taskCountByAccount = useMemo(() => {
        const counts = {};
        (contentTasks || []).forEach(t => {
            const h = t.accountHandler || t.accountId;
            counts[h] = (counts[h] || 0) + 1;
        });
        return counts;
    }, [contentTasks]);

    // ─── Handlers: Content Task Modal ───
    const handleOpenNewTask = (prefilledData = {}) => {
        const defaultHandler = selectedAccountFilter !== 'all' ? selectedAccountFilter : '@arriveagency';
        const matchingAcc = accounts.find(a => a.handler === defaultHandler) || accounts[0];
        setEditingTask(null);
        setTaskFormData({
            title: '',
            accountId: matchingAcc?.id || 'social-arrive-agency',
            accountHandler: matchingAcc?.handler || '@arriveagency',
            format: 'Reel 9:16',
            pillar: 'Branding & Lifestyle',
            status: 'idea',
            hookVerbal: '',
            hookVisual: '',
            scriptBody: '',
            cta: 'Guarda este Reel y etiqueta a alguien especial.',
            assignee: 'Andrés V. (Lead Filmmaker)',
            shootingLocation: 'Casco Antiguo HQ',
            assetsDriveUrl: '',
            publishDate: new Date().toISOString().split('T')[0],
            publishTime: '19:30',
            caption: '',
            hashtags: '#arriveagency #panama #nightlife #cascoantiguo',
            ...prefilledData
        });
        setShowTaskModal(true);
    };

    const handleOpenEditTask = (task) => {
        setEditingTask(task);
        setTaskFormData({ ...task });
        setShowTaskModal(true);
    };

    const handleSaveTask = (e) => {
        e.preventDefault();
        if (!taskFormData.title.trim()) return;

        const matchingAcc = accounts.find(a => a.handler === taskFormData.accountHandler || a.id === taskFormData.accountId);
        const finalTask = {
            ...taskFormData,
            accountId: matchingAcc?.id || taskFormData.accountId,
            accountHandler: matchingAcc?.handler || taskFormData.accountHandler,
        };

        if (editingTask) {
            updateContentTask(editingTask.id, finalTask);
            if (addActivity) addActivity(`Actualizado contenido: "${finalTask.title}" (${finalTask.accountHandler})`, '#60a5fa');
        } else {
            const newTask = {
                ...finalTask,
                id: `ct-${Date.now()}`,
                createdAt: new Date().toISOString()
            };
            addContentTask(newTask);
            if (addActivity) addActivity(`Creado nuevo contenido DURO para ${finalTask.accountHandler}: "${finalTask.title}"`, '#fbbf24');
        }
        setShowTaskModal(false);
    };

    const handleDeleteTask = (id, title) => {
        if (window.confirm(`¿Eliminar la pieza "${title}"?`)) {
            deleteContentTask(id);
            if (addActivity) addActivity(`Eliminado contenido: "${title}"`, '#ef4444');
            setShowTaskModal(false);
        }
    };

    // Fast advance pipeline status
    const handleAdvanceStatus = (task, e) => {
        e.stopPropagation();
        const currentIndex = PIPELINE_COLUMNS.findIndex(c => c.id === (task.status || 'idea'));
        const nextCol = PIPELINE_COLUMNS[currentIndex + 1];
        if (nextCol) {
            updateContentTask(task.id, { status: nextCol.id });
            if (addActivity) addActivity(`Avanzó "${task.title}" a: ${nextCol.label}`, nextCol.color);
        }
    };

    // Use a Viral Hook
    const handleUseHook = (hook) => {
        handleOpenNewTask({
            title: hook.text,
            hookVerbal: hook.text,
            pillar: hook.pillar,
            status: 'script'
        });
    };

    const handleCopyHook = (hook) => {
        navigator.clipboard.writeText(hook.text);
        setCopiedHookId(hook.id);
        setTimeout(() => setCopiedHookId(null), 2000);
    };

    // ─── Handlers: Account Modal ───
    const handleOpenNewAccount = () => {
        setEditingAccount(null);
        setAccountFormData({
            platform: 'Instagram',
            handler: '@',
            type: 'Empresa / Venue',
            url: '',
            followers: '1K',
            description: '',
            linkedEventIds: []
        });
        setShowAccountModal(true);
    };

    const handleSaveAccount = (e) => {
        e.preventDefault();
        if (!accountFormData.handler.trim()) return;

        if (editingAccount) {
            updateSocialMedia(editingAccount.id, accountFormData);
        } else {
            const newAcc = {
                ...accountFormData,
                id: `social-${Date.now()}`,
                metrics: { growth: '+100', engagement: '5.5%', clicks: '200', views: '5K' }
            };
            addSocialMedia(newAcc);
        }
        setShowAccountModal(false);
    };

    // Filtered Hooks
    const filteredHooks = useMemo(() => {
        if (selectedHookCategory === 'all') return VIRAL_HOOKS_VAULT;
        return VIRAL_HOOKS_VAULT.filter(h => h.category.toLowerCase().includes(selectedHookCategory.toLowerCase()));
    }, [selectedHookCategory]);

    return (
        <div className="page-content animate-in social-engine-container">
            {/* ═══════════════════════════════════════════════════════════════════
               HERO HEADER: SOCIAL MEDIA & CONTENT ENGINE PRO
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="social-hero-header">
                <div className="social-hero-top">
                    <div className="social-hero-brand">
                        <div className="social-hero-icon">
                            <Sparkles size={22} />
                        </div>
                        <div className="social-hero-titles">
                            <h1>
                                SOCIAL MEDIA & CONTENT ENGINE <span style={{ color: '#fbbf24' }}>PRO</span>
                            </h1>
                            <p>
                                Creación de contenido DURO, producción 4K y control multi-cuenta centralizado.
                            </p>
                        </div>
                    </div>

                    <div className="social-hero-actions">
                        <button 
                            className="social-btn-secondary"
                            onClick={() => setCurrentTab('hooks')}
                        >
                            <Sparkles size={14} style={{ color: '#fbbf24' }} /> Banco de Hooks Virales
                        </button>
                        <button 
                            className="social-btn-primary"
                            onClick={() => handleOpenNewTask()}
                        >
                            <Plus size={16} /> + Nuevo Contenido DURO
                        </button>
                    </div>
                </div>

                {/* Aggregated Live Metrics Strip */}
                <div className="social-metrics-strip">
                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <Users size={12} style={{ color: '#e1306c' }} /> Audiencia Total
                        </div>
                        <div className="social-metric-val">
                            {formatAudience(totalAudience)}
                            <span className="social-metric-sub">{accounts.length} cuentas</span>
                        </div>
                    </div>

                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <Film size={12} style={{ color: '#60a5fa' }} /> En Producción
                        </div>
                        <div className="social-metric-val">
                            {(contentTasks || []).filter(t => ['script', 'shooting', 'editing'].includes(t.status)).length}
                            <span className="social-metric-sub">piezas activas</span>
                        </div>
                    </div>

                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <CheckCircle2 size={12} style={{ color: '#34d399' }} /> Listos para Publicar
                        </div>
                        <div className="social-metric-val">
                            {(contentTasks || []).filter(t => t.status === 'ready').length}
                            <span className="social-metric-sub">Reels aprobados</span>
                        </div>
                    </div>

                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <TrendingUp size={12} style={{ color: '#fbbf24' }} /> Publicados Recientes
                        </div>
                        <div className="social-metric-val">
                            {(contentTasks || []).filter(t => t.status === 'published').length}
                            <span className="social-metric-sub">en feed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               MULTI-ACCOUNT CHANNEL BAR (FAST SWITCHER)
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="social-channels-bar">
                <button
                    className={`social-channel-chip ${selectedAccountFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedAccountFilter('all')}
                >
                    <div className="channel-avatar" style={{ background: 'linear-gradient(135deg, #d4af37, #b8860b)' }}>
                        ⚡
                    </div>
                    <span>Todas las Cuentas (Pipeline Global)</span>
                    <span className="channel-count-badge">{(contentTasks || []).length}</span>
                </button>

                {accounts.map(acc => {
                    const count = taskCountByAccount[acc.handler] || taskCountByAccount[acc.id] || 0;
                    const meta = PLATFORM_META[acc.platform] || PLATFORM_META.Instagram;
                    const IconComp = meta.icon;

                    return (
                        <button
                            key={acc.id}
                            className={`social-channel-chip ${selectedAccountFilter === acc.handler ? 'active' : ''}`}
                            onClick={() => setSelectedAccountFilter(acc.handler)}
                        >
                            <div className="channel-avatar" style={{ background: meta.gradient }}>
                                <IconComp size={12} />
                            </div>
                            <span style={{ fontWeight: 700 }}>{acc.handler}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{acc.followers}</span>
                            {count > 0 && (
                                <span className="channel-count-badge">{count}</span>
                            )}
                        </button>
                    );
                })}

                <button 
                    className="social-channel-chip"
                    style={{ borderStyle: 'dashed', background: 'transparent' }}
                    onClick={handleOpenNewAccount}
                    title="Añadir nueva cuenta"
                >
                    <Plus size={13} /> Añadir Cuenta
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               MAIN NAVIGATION TABS & TOOLBAR
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="social-tabs-nav">
                <button 
                    className={`social-tab-btn ${currentTab === 'pipeline' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('pipeline')}
                >
                    <Film size={15} /> 📋 Pipeline de Producción DURO
                </button>
                <button 
                    className={`social-tab-btn ${currentTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('calendar')}
                >
                    <CalendarDays size={15} /> 📅 Calendario Multi-Cuenta
                </button>
                <button 
                    className={`social-tab-btn ${currentTab === 'hooks' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('hooks')}
                >
                    <Sparkles size={15} style={{ color: '#fbbf24' }} /> 🎯 Banco de Hooks Virales
                </button>
                <button 
                    className={`social-tab-btn ${currentTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('accounts')}
                >
                    <Users size={15} /> 👥 Cuentas & Métricas ({accounts.length})
                </button>
            </div>

            {/* Toolbar: Search & Format Filter */}
            {(currentTab === 'pipeline' || currentTab === 'calendar') && (
                <div className="social-toolbar">
                    <div className="social-search-input">
                        <Search size={14} style={{ color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar por título, gancho verbal, guión o cuenta..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="social-filter-group">
                        <select 
                            className="social-filter-select"
                            value={filterFormat}
                            onChange={(e) => setFilterFormat(e.target.value)}
                        >
                            <option value="all">Todos los formatos</option>
                            <option value="Reel 9:16">Reel 9:16 (4K 60fps)</option>
                            <option value="Carrusel HD">Carrusel HD</option>
                            <option value="TikTok / UGC">TikTok / UGC Creator</option>
                            <option value="Story Seq">Secuencia de Stories</option>
                        </select>

                        <button 
                            className="social-btn-primary" 
                            style={{ padding: '7px 14px', fontSize: '12px' }}
                            onClick={() => handleOpenNewTask()}
                        >
                            <Plus size={14} /> Nueva Pieza
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 1: KANBAN PRODUCTION PIPELINE (HARD-HITTING CONTENT)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'pipeline' && (
                <div className="social-kanban-board animate-in">
                    {PIPELINE_COLUMNS.map((col, colIdx) => {
                        const colTasks = tasksByColumn[col.id] || [];
                        const nextCol = PIPELINE_COLUMNS[colIdx + 1];

                        return (
                            <div key={col.id} className="social-kanban-col">
                                <div className="kanban-col-head">
                                    <div className="kanban-col-title" style={{ color: col.color }}>
                                        <span>{col.label}</span>
                                    </div>
                                    <span className="kanban-col-count">{colTasks.length}</span>
                                </div>

                                <div className="kanban-cards-list">
                                    {colTasks.length === 0 ? (
                                        <div style={{ padding: '24px 10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                            Sin piezas en {col.label.split(' ')[1] || 'esta fase'}
                                        </div>
                                    ) : (
                                        colTasks.map(task => (
                                            <div 
                                                key={task.id} 
                                                className="social-content-card"
                                                onClick={() => handleOpenEditTask(task)}
                                            >
                                                <div className="card-topline">
                                                    <span className="card-account-pill">
                                                        <Instagram size={11} /> {task.accountHandler}
                                                    </span>
                                                    <span className="card-format-pill">
                                                        {task.format}
                                                    </span>
                                                </div>

                                                <h4 className="card-title">{task.title}</h4>

                                                {task.hookVerbal && (
                                                    <div className="card-hook-box">
                                                        <div className="card-hook-label">🎣 Gancho Verbal:</div>
                                                        <div className="card-hook-text">"{task.hookVerbal}"</div>
                                                    </div>
                                                )}

                                                <div className="card-meta-row">
                                                    <span className="card-assignee">
                                                        👤 {task.assignee ? task.assignee.split(' ')[0] : 'Filmmaker'}
                                                    </span>
                                                    <span className="card-date">
                                                        📅 {task.publishDate || 'S/F'}
                                                    </span>
                                                </div>

                                                <div className="card-actions-strip">
                                                    {nextCol ? (
                                                        <button 
                                                            className="card-advance-btn"
                                                            onClick={(e) => handleAdvanceStatus(task, e)}
                                                            title={`Mover a ${nextCol.label}`}
                                                        >
                                                            <span>Avanzar</span>
                                                            <ArrowRight size={11} />
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '10.5px', color: '#22c55e', fontWeight: 700 }}>
                                                            ✓ Publicado
                                                        </span>
                                                    )}

                                                    {task.assetsDriveUrl && (
                                                        <a 
                                                            href={task.assetsDriveUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="card-icon-btn"
                                                            title="Abrir carpeta en Google Drive"
                                                        >
                                                            <FolderGit2 size={14} style={{ color: '#fbbf24' }} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    <button 
                                        onClick={() => handleOpenNewTask({ status: col.id })}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px dashed rgba(255,255,255,0.1)',
                                            background: 'transparent',
                                            color: '#94a3b8',
                                            fontSize: '11.5px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Plus size={13} /> Añadir aquí
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 2: MULTI-ACCOUNT CALENDAR GRID
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'calendar' && (
                <div className="animate-in card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(145deg, rgba(225,48,108,0.1), rgba(131,58,180,0.05))',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                                Calendario de Planificación Semanal
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                Visualiza y programa qué cuenta publica cada día de la semana.
                            </p>
                        </div>
                    </div>
                    <ContentCalendarGrid 
                        accounts={selectedAccountFilter === 'all' ? accounts : accounts.filter(a => a.handler === selectedAccountFilter)} 
                        companies={[]}
                    />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 3: VIRAL HOOKS VAULT (BANCO DE GANCHOS DUROS)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'hooks' && (
                <div className="hooks-vault-container animate-in">
                    <div className="hooks-vault-banner">
                        <div>
                            <h3 className="hooks-vault-title">🎯 Banco de Hooks Virales & Fórmulas de Retención</h3>
                            <p className="hooks-vault-sub">
                                Ganchos probados para los primeros 3 segundos de tus Reels y TikToks. Detén el scroll al instante.
                            </p>
                        </div>
                        <button 
                            className="social-btn-primary"
                            onClick={() => handleOpenNewTask()}
                        >
                            <Plus size={15} /> Crear con Hook Personalizado
                        </button>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="hooks-category-chips">
                        {[
                            { id: 'all', label: 'Todos los Hooks' },
                            { id: 'negativo', label: '⚠️ Negativo & Shock' },
                            { id: 'pov', label: '👑 POV & Experiencias VIP' },
                            { id: 'curiosidad', label: '🔍 Curiosidad & Secretos' },
                            { id: 'gastronomía', label: '🍸 Rooftops & Coctelería' },
                            { id: 'negocios', label: '📈 Negocios & Autoridad' }
                        ].map(cat => (
                            <button
                                key={cat.id}
                                className={`hook-category-chip ${selectedHookCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedHookCategory(cat.id)}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Hooks Grid */}
                    <div className="hooks-grid">
                        {filteredHooks.map(hook => (
                            <div key={hook.id} className="hook-card">
                                <div className="hook-card-head">
                                    <span className="hook-cat-badge">{hook.category}</span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{hook.pillar}</span>
                                </div>

                                <p className="hook-text">"{hook.text}"</p>

                                <div className="hook-why">
                                    💡 <strong>Por qué funciona:</strong> {hook.why}
                                </div>

                                <div className="hook-card-footer">
                                    <button 
                                        className="hook-copy-btn"
                                        onClick={() => handleCopyHook(hook)}
                                    >
                                        {copiedHookId === hook.id ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                                        {copiedHookId === hook.id ? 'Copiado' : 'Copiar'}
                                    </button>

                                    <button 
                                        className="hook-use-btn"
                                        onClick={() => handleUseHook(hook)}
                                    >
                                        <Plus size={13} /> Usar en Guión
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 4: ACCOUNTS & METRICS PROFILES
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'accounts' && (
                <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                    {accounts.map(acc => {
                        const meta = PLATFORM_META[acc.platform] || PLATFORM_META.Instagram;
                        const IconComp = meta.icon;
                        const tasksForThis = (contentTasks || []).filter(t => t.accountHandler === acc.handler || t.accountId === acc.id);

                        return (
                            <div key={acc.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '42px', height: '42px', borderRadius: '12px',
                                            background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', boxShadow: `0 4px 14px ${meta.color}40`
                                        }}>
                                            <IconComp size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>{acc.handler}</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{acc.type}</p>
                                        </div>
                                    </div>

                                    {acc.url && (
                                        <a href={acc.url} target="_blank" rel="noreferrer" className="social-btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }}>
                                            <ExternalLink size={12} /> Abrir
                                        </a>
                                    )}
                                </div>

                                <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                                    {acc.description || 'Cuenta oficial gestionada por ARRIVE Agency'}
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>SEGUIDORES</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{acc.followers}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>PIPELINE</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>{tasksForThis.length} posts</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>ENGAGEMENT</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399' }}>{acc.metrics?.engagement || '6.5%'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                    <button 
                                        className="social-btn-primary" 
                                        style={{ flex: 1, padding: '7px', fontSize: '12px', justifyContent: 'center' }}
                                        onClick={() => {
                                            setSelectedAccountFilter(acc.handler);
                                            setCurrentTab('pipeline');
                                        }}
                                    >
                                        <Film size={13} /> Ver Pipeline
                                    </button>
                                    <button 
                                        className="social-btn-secondary" 
                                        style={{ padding: '7px 12px', fontSize: '12px' }}
                                        onClick={() => {
                                            setEditingAccount(acc);
                                            setAccountFormData({ ...acc });
                                            setShowAccountModal(true);
                                        }}
                                    >
                                        <Edit3 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               MODAL: CONTENT CREATOR & SCRIPT PRO
               ═══════════════════════════════════════════════════════════════════ */}
            {showTaskModal && (
                <div className="social-modal-overlay animate-in" onClick={() => setShowTaskModal(false)}>
                    <div className="social-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="social-modal-header">
                            <div>
                                <h3 className="social-modal-title">
                                    <Film size={20} style={{ color: '#e1306c' }} />
                                    {editingTask ? 'Editar Pieza de Contenido DURO' : 'Nueva Pieza de Contenido DURO'}
                                </h3>
                                <p className="social-modal-sub">
                                    Estructura completa de video: Gancho de 3s, retención, B-roll, llamado a la acción y Drive.
                                </p>
                            </div>
                            <button className="social-modal-close" onClick={() => setShowTaskModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSaveTask}>
                            <div className="social-modal-body">
                                <div className="social-form-row">
                                    <div className="social-field">
                                        <label>Cuenta de Destino</label>
                                        <select 
                                            value={taskFormData.accountHandler}
                                            onChange={(e) => {
                                                const selected = accounts.find(a => a.handler === e.target.value);
                                                setTaskFormData({
                                                    ...taskFormData,
                                                    accountHandler: e.target.value,
                                                    accountId: selected?.id || taskFormData.accountId
                                                });
                                            }}
                                        >
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.handler}>
                                                    {acc.handler} ({acc.type})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="social-field">
                                        <label>Formato de Publicación</label>
                                        <select 
                                            value={taskFormData.format}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, format: e.target.value })}
                                        >
                                            <option value="Reel 9:16">Reel 9:16 (4K 60fps)</option>
                                            <option value="Carrusel HD">Carrusel HD (1080x1350)</option>
                                            <option value="TikTok / UGC">TikTok / UGC Creator</option>
                                            <option value="Story Seq">Secuencia de Stories</option>
                                            <option value="Post 1:1">Post Feed 1:1</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>Título / Concepto Central</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ej: Dinner Party & Bottle Show Extravaganza"
                                        value={taskFormData.title}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                    />
                                </div>

                                <div className="social-form-row">
                                    <div className="social-field">
                                        <label>Pilar de Contenido</label>
                                        <select 
                                            value={taskFormData.pillar}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, pillar: e.target.value })}
                                        >
                                            <option value="Branding & Lifestyle">Branding & Lifestyle</option>
                                            <option value="Talento & Cenas">Talento & Cenas de Chicas</option>
                                            <option value="Nightlife & Energy">Nightlife & Energy</option>
                                            <option value="Gastronomía & Rooftop">Gastronomía & Rooftop</option>
                                            <option value="Speakeasy & Exclusividad">Speakeasy & Exclusividad</option>
                                            <option value="Autoridad & Negocios">Autoridad & Negocios</option>
                                        </select>
                                    </div>

                                    <div className="social-field">
                                        <label>Fase en el Pipeline</label>
                                        <select 
                                            value={taskFormData.status}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                                        >
                                            {PIPELINE_COLUMNS.map(col => (
                                                <option key={col.id} value={col.id}>{col.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* SECTION: HOOKS DUROS */}
                                <div style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={14} /> FÓRMULA DE RETENCIÓN DE 0 A 3 SEGUNDOS
                                    </div>

                                    <div className="social-field full">
                                        <label>🎣 Gancho Verbal (Lo que se dice o escucha en los primeros 3 segundos)</label>
                                        <input 
                                            type="text" 
                                            placeholder='Ej: "El peor error que cometen al salir de noche en Panamá..."'
                                            value={taskFormData.hookVerbal}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, hookVerbal: e.target.value })}
                                        />
                                    </div>

                                    <div className="social-field full">
                                        <label>👁️ Gancho Visual (Texto en pantalla gigante o toma de acción de apertura)</label>
                                        <input 
                                            type="text" 
                                            placeholder='Ej: Corte ultra rápido a 60fps con audio drop sincronizado de botellas y luces...'
                                            value={taskFormData.hookVisual}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, hookVisual: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>📝 Estructura del Guión & Desglose de Tomas (B-Roll / Argumento)</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Escena 1 (0-3s): Hook visual brindando con copa...&#10;Escena 2 (3-8s): Terraplén al atardecer y cena de chicas...&#10;Escena 3 (8-14s): Furia con bengalas..."
                                        value={taskFormData.scriptBody}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, scriptBody: e.target.value })}
                                    />
                                </div>

                                <div className="social-field full">
                                    <label>🎯 Llamado a la Acción (CTA)</label>
                                    <input 
                                        type="text" 
                                        placeholder='Ej: Comenta "VIP" para enviarte la lista de la cena del jueves.'
                                        value={taskFormData.cta}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, cta: e.target.value })}
                                    />
                                </div>

                                <div className="social-form-row three-col">
                                    <div className="social-field">
                                        <label>Responsable</label>
                                        <input 
                                            type="text" 
                                            value={taskFormData.assignee}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, assignee: e.target.value })}
                                        />
                                    </div>

                                    <div className="social-field">
                                        <label>Fecha de Publicación</label>
                                        <input 
                                            type="date" 
                                            value={taskFormData.publishDate}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, publishDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="social-field">
                                        <label>Hora Pico</label>
                                        <input 
                                            type="time" 
                                            value={taskFormData.publishTime}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, publishTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>📁 Link a Google Drive / Dropbox (Archivos 4K & Brutos)</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={taskFormData.assetsDriveUrl}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, assetsDriveUrl: e.target.value })}
                                    />
                                </div>

                                <div className="social-field full">
                                    <label>💬 Copy / Caption Final + Hashtags</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="Escribe el copy final listo para copiar y pegar en Meta Business Suite..."
                                        value={taskFormData.caption}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, caption: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="social-modal-footer">
                                {editingTask ? (
                                    <button 
                                        type="button" 
                                        className="social-btn-secondary" 
                                        style={{ color: '#ef4444' }}
                                        onClick={() => handleDeleteTask(editingTask.id, editingTask.title)}
                                    >
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                ) : <div />}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        type="button" 
                                        className="social-btn-secondary" 
                                        onClick={() => setShowTaskModal(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="social-btn-primary"
                                    >
                                        {editingTask ? 'Guardar Cambios' : 'Añadir al Pipeline'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               MODAL: ACCOUNT MANAGEMENT
               ═══════════════════════════════════════════════════════════════════ */}
            {showAccountModal && (
                <div className="social-modal-overlay animate-in" onClick={() => setShowAccountModal(false)}>
                    <div className="social-modal-box" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="social-modal-header">
                            <div>
                                <h3 className="social-modal-title">
                                    {editingAccount ? 'Editar Cuenta' : 'Vincular Nueva Cuenta'}
                                </h3>
                                <p className="social-modal-sub">
                                    Configura los perfiles de redes sociales que gestiona ARRIVE Agency.
                                </p>
                            </div>
                            <button className="social-modal-close" onClick={() => setShowAccountModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSaveAccount}>
                            <div className="social-modal-body">
                                <div className="social-form-row">
                                    <div className="social-field">
                                        <label>Plataforma</label>
                                        <select 
                                            value={accountFormData.platform}
                                            onChange={(e) => setAccountFormData({ ...accountFormData, platform: e.target.value })}
                                        >
                                            <option value="Instagram">Instagram</option>
                                            <option value="TikTok">TikTok</option>
                                            <option value="YouTube">YouTube</option>
                                            <option value="Facebook">Facebook</option>
                                            <option value="Twitter">Twitter / X</option>
                                            <option value="LinkedIn">LinkedIn</option>
                                        </select>
                                    </div>

                                    <div className="social-field">
                                        <label>Handler / Usuario</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="@arriveagency"
                                            value={accountFormData.handler}
                                            onChange={(e) => setAccountFormData({ ...accountFormData, handler: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="social-form-row">
                                    <div className="social-field">
                                        <label>Tipo de Cuenta</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Agencia, Venue, Talento, Música"
                                            value={accountFormData.type}
                                            onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })}
                                        />
                                    </div>

                                    <div className="social-field">
                                        <label>Seguidores Actuales</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: 14.2K"
                                            value={accountFormData.followers}
                                            onChange={(e) => setAccountFormData({ ...accountFormData, followers: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>Enlace Directo al Perfil</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://instagram.com/arriveagency"
                                        value={accountFormData.url}
                                        onChange={(e) => setAccountFormData({ ...accountFormData, url: e.target.value })}
                                    />
                                </div>

                                <div className="social-field full">
                                    <label>Descripción / Enfoque</label>
                                    <textarea 
                                        rows={2}
                                        placeholder="Enfoque de contenido para esta cuenta..."
                                        value={accountFormData.description}
                                        onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="social-modal-footer">
                                <button type="button" className="social-btn-secondary" onClick={() => setShowAccountModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="social-btn-primary">
                                    {editingAccount ? 'Guardar Cambios' : 'Vincular Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
