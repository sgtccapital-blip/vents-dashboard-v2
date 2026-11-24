import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Instagram, Youtube, Twitter, Facebook, Plus, X, Edit3, Trash2,
    ExternalLink, Users, TrendingUp, CalendarDays, Hash, Share2,
    BarChart3, Eye, Heart, MessageCircle, ArrowRight, Sparkles,
    Globe, Music, Video, Camera, LinkIcon, ArrowLeft, Image,
    Film, CheckCircle2, Clock, Play, FileText, Check, ChevronRight,
    Search, Filter, Sliders, Copy, Send, FolderGit2, Dna, Palette, FolderOpen, LayoutDashboard, GraduationCap,
    Layers, Target, ChevronLeft, Library, Wand2, BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ContentCalendarGrid from '../components/ContentCalendarGrid';
import AccountDnaEditor from '../components/AccountDnaEditor';
import { dnaCompleteness, normalizeDna } from '../lib/accountDna';
import { loadBrandIndex, useBrandForAccount } from '../lib/useBrand';
import BrandLinePanel from '../components/BrandLinePanel';
import RawLibrary from '../components/studio/RawLibrary';
import ContentLibrary from '../components/studio/ContentLibrary';
import ProductionBoard from '../components/studio/ProductionBoard';
import GeneratePanel from '../components/studio/GeneratePanel';
import '../components/SocialEngine.css';
import '../components/SocialMinimal.css';

const PLATFORM_META = {
    Instagram: { icon: Instagram, color: 'var(--se-accent)', gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
    YouTube: { icon: Youtube, color: '#FF0000', gradient: 'linear-gradient(135deg, #FF0000, #CC0000)' },
    TikTok: { icon: Music, color: '#00f2ea', gradient: 'linear-gradient(135deg, #00f2ea, #ff0050)' },
    Twitter: { icon: Twitter, color: '#1DA1F2', gradient: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)' },
    Facebook: { icon: Facebook, color: '#1877F2', gradient: 'linear-gradient(135deg, #1877F2, #0c5dc7)' },
    LinkedIn: { icon: Globe, color: '#0A66C2', gradient: 'linear-gradient(135deg, #0A66C2, #004182)' },
    Website: { icon: Globe, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
};

// ─── Pipeline Column Configurations ───
const PIPELINE_COLUMNS = [
    { id: 'idea', label: 'Ideas', color: '#71717a' },
    { id: 'script', label: 'Guion', color: '#a1a1aa' },
    { id: 'shooting', label: 'Por grabar', color: 'var(--se-accent)' },
    { id: 'editing', label: 'En edición', color: '#60a5fa' },
    { id: 'ready', label: 'Listo', color: '#34d399' },
    { id: 'published', label: 'Publicado', color: '#10b981' }
];

// ─── Preset Images for Event Arts ───
const ART_PRESETS = [
    { label: '🍸 Sunset Rooftop', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&auto=format&fit=crop&q=80' },
    { label: '🔥 Club & Bengalas', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80' },
    { label: '🍾 Botellas & VIP', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&auto=format&fit=crop&q=80' },
    { label: '🍹 Coctelería de Autor', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80' },
    { label: '👑 ARRIVE Models', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&auto=format&fit=crop&q=80' },
    { label: '🍣 Cena & Gastronomía', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=900&auto=format&fit=crop&q=80' },
    { label: '🎹 Piano & Speakeasy', url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&auto=format&fit=crop&q=80' },
];

// ─── Default Curated Event Artes ───
const DEFAULT_EVENT_ARTES = {
    'ev-terraplen-rooftop': [
        {
            id: 'art-terra-1',
            title: 'Sunset Sessions & Girls Dinner',
            type: 'Post',
            format: '1080x1350',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&auto=format&fit=crop&q=80',
            description: 'Flyer oficial de Sunset Sessions para Jueves de Girls Dinner. Incluye maridaje de bienvenida y mesa imperial.',
            references: 'https://pinterest.com/pin/rooftop-sunset-vibes'
        },
        {
            id: 'art-terra-2',
            title: 'Lineup Melodic House & Sunset',
            type: 'Story',
            format: '1080x1920',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80',
            description: 'Story vertical 9:16 con horarios de DJs invitados, beat drop al atardecer y cócteles de autor 2x1.',
            references: ''
        },
        {
            id: 'art-terra-3',
            title: 'Cócteles de Autor & Mixología',
            type: 'Reel',
            format: '1080x1920',
            status: 'Revisión',
            imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&auto=format&fit=crop&q=80',
            description: 'Cover y pauta para Reel cinematográfico de barra mostrando preparación del Gin tonic ahumado con vista al skyline.',
            references: 'https://drive.google.com/drive/folders/terraplen-cocktails'
        },
        {
            id: 'art-terra-4',
            title: 'Mesa Imperial VIP Terraza',
            type: 'Post',
            format: '1080x1080',
            status: 'Pendiente',
            imageUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=900&auto=format&fit=crop&q=80',
            description: 'Post cuadrado para reservas anticipadas de mesa frontal hacia la bahía de Panamá.',
            references: ''
        }
    ],
    'ev-furia-panama': [
        {
            id: 'art-furia-1',
            title: 'Friday Night Fever & Bottle Show',
            type: 'Post',
            format: '1080x1350',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80',
            description: 'Flyer central de viernes con bengalas, shows de botellas y presentación especial de DJs residentes.',
            references: 'https://pinterest.com/pin/furia-nightclub-lighting'
        },
        {
            id: 'art-furia-2',
            title: 'Story Countdown Viernes Furia',
            type: 'Story',
            format: '1080x1920',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&auto=format&fit=crop&q=80',
            description: 'Plantilla de Stories con sticker de cuenta regresiva y swipe-up a WhatsApp para listas VIP.',
            references: ''
        },
        {
            id: 'art-furia-3',
            title: 'Pyro Show & Bottle Service Reel',
            type: 'Reel',
            format: '1080x1920',
            status: 'Revisión',
            imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&auto=format&fit=crop&q=80',
            description: 'Portada y referencia de Reel de alto impacto visual con botellas de Don Julio y chispas frías.',
            references: 'https://drive.google.com/drive/folders/furia-raw'
        }
    ],
    'ev-piano-bar': [
        {
            id: 'art-piano-1',
            title: 'Speakeasy Jazz & Classic Cocktails',
            type: 'Post',
            format: '1080x1350',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&auto=format&fit=crop&q=80',
            description: 'Flyer vintage moderno para noche íntima de Piano acústico, tapas y coctelería clásica en Casco.',
            references: ''
        },
        {
            id: 'art-piano-2',
            title: 'Noche Íntima Acústica Story',
            type: 'Story',
            format: '1080x1920',
            status: 'Revisión',
            imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&auto=format&fit=crop&q=80',
            description: 'Story de invitación privada para lista de espera y reservas de mesas altas.',
            references: ''
        }
    ],
    'ev-casco-peatonal': [
        {
            id: 'art-casco-1',
            title: 'Sunset Walk & Circuito de Cócteles',
            type: 'Post',
            format: '1080x1350',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&auto=format&fit=crop&q=80',
            description: 'Mapa ilustrado y circuito gastronómico peatonal por las mejores plazas del Casco Antiguo.',
            references: ''
        },
        {
            id: 'art-casco-2',
            title: 'Story Guía Rápida Casco',
            type: 'Story',
            format: '1080x1920',
            status: 'Pendiente',
            imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&auto=format&fit=crop&q=80',
            description: '3 paradas imperdibles para iniciar la noche antes del club.',
            references: ''
        }
    ],
    'ev-arrive-models': [
        {
            id: 'art-models-1',
            title: 'Convocatoria Exclusiva Creadoras UGC',
            type: 'Post',
            format: '1080x1350',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&auto=format&fit=crop&q=80',
            description: 'Flyer de casting para creadoras de contenido de lifestyle y moda en Panamá.',
            references: ''
        },
        {
            id: 'art-models-2',
            title: 'Mesa Imperial Recap Reel Cover',
            type: 'Reel',
            format: '1080x1920',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&auto=format&fit=crop&q=80',
            description: 'Reel de alta estética con las chicas de la agencia disfrutando la cena en Terraplén.',
            references: ''
        }
    ]
};

const getEventArtes = (event) => {
    if (!event) return [];
    if (event.artes && Array.isArray(event.artes) && event.artes.length > 0) {
        return event.artes;
    }
    if (DEFAULT_EVENT_ARTES[event.id]) {
        return DEFAULT_EVENT_ARTES[event.id];
    }
    return [
        {
            id: `art-${event.id}-1`,
            title: `Flyer Oficial ${event.name}`,
            format: '1080x1350',
            type: 'Post',
            status: 'Aprobado',
            imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80',
            description: `Flyer principal y material de difusión para ${event.name}.`,
            references: ''
        },
        {
            id: `art-${event.id}-2`,
            title: `Story & Horarios VIP`,
            format: '1080x1920',
            type: 'Story',
            status: 'Revisión',
            imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80',
            description: `Story vertical 9:16 para cuenta regresiva y reservas.`,
            references: ''
        }
    ];
};

// ─── Viral Hooks Vault Database (Fórmulas de Contenido DURO) ───
const DEFAULT_PILLARS = [
    'Branding & Lifestyle', 'Talento & Cenas', 'Nightlife & Energy',
    'Autoridad & Negocios', 'Behind the Scenes', 'Educativo / Valor'
];

export default function SocialMedia() {
    const { 
        socialMedia, addSocialMedia, updateSocialMedia, 
        contentTasks, addContentTask, updateContentTask, deleteContentTask,
        events, updateEvent,
        addActivity 
    } = useApp();
    const navigate = useNavigate();

    // ─── Active Tab & Account Filter ───
    const [currentTab, setCurrentTab] = useState('pipeline'); // 'pipeline' | 'eventos_artes' | 'calendar' | 'library' | 'raw' | 'accounts'
    const [selectedAccountFilter, setSelectedAccountFilter] = useState('all'); // 'all' | handler
    const [accountProfileTab, setAccountProfileTab] = useState('kanban'); // 'posts' | 'kanban' | 'calendar' | 'raw' | 'generate' | 'library' | 'dna'
    const [productionView, setProductionView] = useState('board'); // 'board' | 'studio'
    const [copiedColor, setCopiedColor] = useState(null);
    const [copiedCaptionId, setCopiedCaptionId] = useState(null);
    const [selectedEventFilter, setSelectedEventFilter] = useState('all'); // 'all' | event.id
    const [artFilter, setArtFilter] = useState('Todos'); // 'Todos' | 'Aprobado' | 'Revisión' | 'Pendiente'
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFormat, setFilterFormat] = useState('all');

    // ─── Modals State ───
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        accountId: '',
        accountHandler: '',
        eventId: '',
        artId: '',
        artUrl: '',
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

    // Modal de Subida / Edición de Artes
    const [showArtModal, setShowArtModal] = useState(false);
    const [editingArt, setEditingArt] = useState(null);
    const [artFormData, setArtFormData] = useState({
        id: '',
        eventId: '',
        title: '',
        format: '1080x1350',
        type: 'Post',
        status: 'Pendiente',
        imageUrl: '',
        description: '',
        references: ''
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

    const [dnaAccount, setDnaAccount] = useState(null);

    // Líneas gráficas generadas por `npm run brands` (public/brands/index.json), indexadas por cuenta
    const [brandByAccount, setBrandByAccount] = useState({});
    useEffect(() => {
        loadBrandIndex().then(list => setBrandByAccount(Object.fromEntries((list || []).map(b => [b.accountId, b]))));
    }, []);


    // ─── Accounts List ───
    const accounts = useMemo(() => socialMedia || [], [socialMedia]);
    const eventsList = useMemo(() => events || [], [events]);

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
            const matchEvent = selectedEventFilter === 'all' ||
                task.eventId === selectedEventFilter;
            const matchFormat = filterFormat === 'all' || task.format === filterFormat;
            const matchSearch = !searchQuery || 
                task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.hookVerbal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.accountHandler?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.scriptBody?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchAccount && matchEvent && matchFormat && matchSearch;
        });
    }, [contentTasks, selectedAccountFilter, selectedEventFilter, filterFormat, searchQuery]);

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

    // Global Stats for Artes and Event Boxes
    const allArtesStats = useMemo(() => {
        let total = 0;
        let aprobados = 0;
        let revision = 0;
        let pendientes = 0;

        eventsList.forEach(ev => {
            const artes = getEventArtes(ev);
            total += artes.length;
            artes.forEach(a => {
                if (a.status === 'Aprobado') aprobados++;
                else if (a.status === 'Revisión') revision++;
                else pendientes++;
            });
        });

        const totalTasks = (contentTasks || []).filter(t => t.eventId).length;
        const pctAprobado = total > 0 ? Math.round((aprobados / total) * 100) : 0;

        return { total, aprobados, revision, pendientes, totalTasks, pctAprobado };
    }, [eventsList, contentTasks]);

    // Filtered events for the event boxes view
    const filteredEventsForBoxes = useMemo(() => {
        return eventsList.filter(ev => {
            const matchFilter = selectedEventFilter === 'all' || ev.id === selectedEventFilter;
            if (!matchFilter) return false;

            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const artes = getEventArtes(ev);
            const matchName = ev.name?.toLowerCase().includes(q);
            const matchLocation = ev.location?.toLowerCase().includes(q);
            const matchArtes = artes.some(a => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
            const matchTasks = (contentTasks || []).filter(t => t.eventId === ev.id).some(t => t.title?.toLowerCase().includes(q) || t.hookVerbal?.toLowerCase().includes(q));
            return matchName || matchLocation || matchArtes || matchTasks;
        });
    }, [eventsList, selectedEventFilter, searchQuery, contentTasks]);

    // ─── Active Account (Single Account Profile View) ───
    const activeAccount = useMemo(() => {
        if (selectedAccountFilter === 'all') return null;
        return accounts.find(a => a.handler === selectedAccountFilter || a.id === selectedAccountFilter) || null;
    }, [accounts, selectedAccountFilter]);

    const { brand: activeBrand, avatarSvg: activeAvatarSvg } = useBrandForAccount(activeAccount?.id);

    const activeAccountTasks = useMemo(() => {
        if (!activeAccount) return [];
        return (contentTasks || []).filter(t => 
            t.accountHandler === activeAccount.handler || 
            t.accountId === activeAccount.id
        );
    }, [contentTasks, activeAccount]);

    const activeAccountTasksByCol = useMemo(() => {
        const grouped = {};
        PIPELINE_COLUMNS.forEach(col => grouped[col.id] = []);
        activeAccountTasks.forEach(task => {
            const colId = task.status || 'idea';
            if (grouped[colId]) grouped[colId].push(task);
            else grouped['idea'].push(task);
        });
        return grouped;
    }, [activeAccountTasks]);

    const handleCopyCaption = (task) => {
        const textToCopy = `${task.caption || ''}\n\n${task.hashtags || ''}`.trim();
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopiedCaptionId(task.id);
            setTimeout(() => setCopiedCaptionId(null), 2000);
        }
    };

    const handleCopyColor = (color) => {
        navigator.clipboard.writeText(color);
        setCopiedColor(color);
        setTimeout(() => setCopiedColor(null), 2000);
    };

    // ─── Handlers: Content Task Modal ───
    const handleOpenNewTask = (prefilledData = {}) => {
        const matchingAcc = (selectedAccountFilter !== 'all' && activeAccount) 
            ? activeAccount 
            : (accounts.find(a => a.handler === selectedAccountFilter) || accounts[0]);
        const dna = normalizeDna(matchingAcc?.dna);
        setEditingTask(null);
        setTaskFormData({
            title: '',
            accountId: matchingAcc?.id || '',
            accountHandler: matchingAcc?.handler || '',
            eventId: prefilledData.eventId || (selectedEventFilter !== 'all' ? selectedEventFilter : ''),
            artId: '',
            artUrl: '',
            format: 'Reel 9:16',
            pillar: dna.pillars[0] || DEFAULT_PILLARS[0],
            status: 'idea',
            hookVerbal: '',
            hookVisual: '',
            scriptBody: '',
            cta: dna.ctas[0] || 'Guarda este Reel y etiqueta a alguien especial.',
            assignee: 'Andrés V. (Lead Filmmaker)',
            shootingLocation: 'Casco Antiguo HQ',
            assetsDriveUrl: '',
            publishDate: new Date().toISOString().split('T')[0],
            publishTime: '19:30',
            caption: '',
            hashtags: dna.hashtags,
            ...prefilledData
        });
        setShowTaskModal(true);
    };

    const handleOpenEditTask = (task) => {
        setEditingTask(task);
        setTaskFormData({
            eventId: '',
            artId: '',
            artUrl: '',
            ...task
        });
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
            if (addActivity) addActivity(`Nueva pieza para ${finalTask.accountHandler}: "${finalTask.title}"`, '#fbbf24');
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

    // ─── Handlers: Event Artes Management ───
    const handleOpenNewArt = (prefilled = {}) => {
        const initialEventId = prefilled.eventId || (selectedEventFilter !== 'all' ? selectedEventFilter : (eventsList[0]?.id || ''));
        setEditingArt(null);
        setArtFormData({
            id: `art-${Date.now()}`,
            eventId: initialEventId,
            title: '',
            format: '1080x1350',
            type: 'Post',
            status: 'Pendiente',
            imageUrl: '',
            description: '',
            references: '',
            ...prefilled
        });
        setShowArtModal(true);
    };

    const handleOpenEditArt = (art, eventId) => {
        setEditingArt(art);
        setArtFormData({
            id: art.id,
            eventId: eventId || art.eventId || (eventsList[0]?.id || ''),
            title: art.title || '',
            format: art.format || '1080x1350',
            type: art.type || 'Post',
            status: art.status || 'Pendiente',
            imageUrl: art.imageUrl || '',
            description: art.description || '',
            references: art.references || ''
        });
        setShowArtModal(true);
    };

    const handleSaveArt = (e) => {
        e.preventDefault();
        if (!artFormData.title.trim() || !artFormData.eventId) return;

        const targetEvent = eventsList.find(ev => ev.id === artFormData.eventId);
        if (!targetEvent) return;

        const currentArtes = getEventArtes(targetEvent);
        let updatedArt = { ...artFormData };
        if (!updatedArt.imageUrl) {
            updatedArt.imageUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80';
        }

        const existingIndex = currentArtes.findIndex(a => a.id === updatedArt.id);
        let updatedList = [];
        if (existingIndex >= 0) {
            updatedList = currentArtes.map(a => a.id === updatedArt.id ? updatedArt : a);
        } else {
            updatedList = [updatedArt, ...currentArtes];
        }

        updateEvent(targetEvent.id, { artes: updatedList });
        if (addActivity) addActivity(`Arte guardado para ${targetEvent.name}: "${updatedArt.title}" (${updatedArt.status})`, '#ec4899');
        setShowArtModal(false);
    };

    const handleDeleteArt = (eventId, artId, title) => {
        if (window.confirm(`¿Eliminar el arte "${title}"?`)) {
            const targetEvent = eventsList.find(ev => ev.id === eventId);
            if (!targetEvent) return;
            const currentArtes = getEventArtes(targetEvent);
            const updated = currentArtes.filter(a => a.id !== artId);
            updateEvent(targetEvent.id, { artes: updated });
            if (addActivity) addActivity(`Eliminado arte: "${title}" de ${targetEvent.name}`, '#ef4444');
            if (showArtModal) setShowArtModal(false);
        }
    };

    const handleQuickArtStatus = (eventId, artId, newStatus) => {
        const targetEvent = eventsList.find(ev => ev.id === eventId);
        if (!targetEvent) return;
        const currentArtes = getEventArtes(targetEvent);
        const updated = currentArtes.map(a => a.id === artId ? { ...a, status: newStatus } : a);
        updateEvent(targetEvent.id, { artes: updated });
        if (addActivity) addActivity(`Estado de arte actualizado a ${newStatus} (${targetEvent.name})`, '#34d399');
    };

    const handleCreatePostFromArt = (event, art) => {
        const matchingAcc = accounts.find(a => (a.linkedEventIds || []).includes(event.id)) ||
            accounts.find(a => a.handler.toLowerCase().includes('arrive')) || accounts[0];
        const dna = normalizeDna(matchingAcc?.dna);
        
        const format = art.type === 'Story' ? 'Story Seq' : art.type === 'Reel' ? 'Reel 9:16' : 'Carrusel HD';
        const eventNameClean = event.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        handleOpenNewTask({
            title: `${art.title} — ${event.name}`,
            accountId: matchingAcc?.id || '',
            accountHandler: matchingAcc?.handler || '',
            eventId: event.id,
            artId: art.id,
            artUrl: art.imageUrl,
            format: format,
            pillar: dna.pillars[0] || 'Nightlife & Energy',
            status: 'script',
            hookVerbal: `Lo que pasa los fines de semana en ${event.name} se queda en Panamá...`,
            hookVisual: `Plano de apertura con el flyer oficial "${art.title}" y corte dinámico a tomas 4K del venue.`,
            scriptBody: `0-3s: Gancho visual con arte oficial (${art.title})\n3-10s: Tomas del ambiente en ${event.name} (${event.location})\n10-18s: Invitación a reservar mesas y listas VIP\n18-25s: Cierre con CTA y logo.`,
            cta: `Escribe "${event.name.split(' ')[0].toUpperCase()}" al DM para asegurar tu entrada o mesa VIP.`,
            assignee: 'Andrés V. (Lead Filmmaker)',
            shootingLocation: event.location || 'Casco Antiguo HQ',
            publishDate: new Date().toISOString().split('T')[0],
            publishTime: '19:30',
            caption: `Este fin de semana la experiencia se vive en ${event.name}. ✨🍸\n\n${art.description || 'Prepárate para una noche insuperable con la mejor música, coctelería y energía de la ciudad.'}\n\n📍 ${event.location || 'Casco Antiguo, Panamá'}\n📲 Reservas y listas VIP abiertas por DM.`,
            hashtags: `#${eventNameClean} #panama #cascoantiguo #nightlifepanama #arriveagency`
        });
    };

    const handleGenerateAiCopyForEvent = (event, art = null) => {
        const matchingAcc = accounts.find(a => (a.linkedEventIds || []).includes(event.id)) || accounts[0];
        const dna = normalizeDna(matchingAcc?.dna);
        const targetArt = art || (getEventArtes(event)[0]);
        const eventNameClean = event.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        let hookVerbal = `Existe una razón por la que todos quieren estar en ${event.name} este fin de semana...`;
        let hookVisual = `Corte cinemático a 60fps con la iluminación de ${event.name} y show de cócteles/botellas.`;
        let cta = `Comenta "${event.name.split(' ')[0].toUpperCase()}" para enviarte el enlace VIP de reserva.`;

        if (event.name.toLowerCase().includes('terraplen')) {
            hookVerbal = '5 razones por las que este atardecer arruinará todos los demás rooftops para ti.';
            hookVisual = 'Toma aérea al atardecer sobre el skyline del Casco Antiguo cayendo la noche con cócteles de autor.';
            cta = 'Comenta "ROOFTOP" y te enviamos el menú degustación y lista de Sunset Sessions.';
        } else if (event.name.toLowerCase().includes('furia')) {
            hookVerbal = 'Cuando la cena tranquila de un viernes termina convirtiéndose en esto...';
            hookVisual = 'Beat drop de 0 a 100 con bengalas iluminando la sala y botellas Don Julio 1942.';
            cta = 'Reserva tu mesa VIP por DM antes de que se agote la capacidad de este fin de semana.';
        } else if (event.name.toLowerCase().includes('piano')) {
            hookVerbal = 'Existe una puerta escondida en el Casco que el 99% de la gente ignora...';
            hookVisual = 'Cámara lenta deslizándose por la barra vintage de caoba con notas de piano en vivo.';
            cta = 'Escribe "SPEAKEASY" para recibir la clave de acceso de esta semana.';
        } else if (event.name.toLowerCase().includes('arrive')) {
            hookVerbal = 'POV: Fuiste invitada a la mesa imperial de ARRIVE Models en Casco...';
            hookVisual = 'Cena de 8 creadoras con copas brindando hacia cámara con outfits impecables.';
            cta = 'Comenta "VIP" para enviarte la convocatoria de casting de este mes.';
        }

        handleOpenNewTask({
            title: targetArt ? `[IA] ${targetArt.title} — ${event.name}` : `[IA] Experiencia ${event.name}`,
            accountId: matchingAcc?.id || '',
            accountHandler: matchingAcc?.handler || '',
            eventId: event.id,
            artId: targetArt?.id || '',
            artUrl: targetArt?.imageUrl || '',
            format: targetArt?.type === 'Story' ? 'Story Seq' : 'Reel 9:16',
            pillar: dna.pillars[0] || 'Nightlife & Energy',
            status: 'script',
            hookVerbal,
            hookVisual,
            scriptBody: `🎬 ESTRUCTURA DE GUION CON ALTA RETENCIÓN:\n• 0-3s [Hook]: ${hookVerbal}\n• 3-8s [Problema/Contraste]: La mayoría de los planes en Panamá terminan siendo monótonos o sin vibra real.\n• 8-16s [La Revelación en ${event.name}]: Mostrar la experiencia sensorial, mixología y energía exclusiva.\n• 16-22s [Llamado a la Acción]: ${cta}`,
            cta,
            assignee: 'Andrés V. (Lead Filmmaker)',
            shootingLocation: event.location || 'Casco Antiguo HQ',
            publishDate: new Date().toISOString().split('T')[0],
            publishTime: '19:30',
            caption: `La noche en Panamá se vive a otro nivel cuando estás en el lugar correcto. 🍸✨\n\nBienvenidos a ${event.name}.\n\n📍 ${event.location || 'Casco Antiguo'}\n${targetArt?.description ? `🎨 Arte: ${targetArt.title}\n` : ''}\n👉 ${cta}`,
            hashtags: `#${eventNameClean} #panama #nightlifepanama #cascoviejo #arriveagency #vipnightlife`
        });
    };

    // Use a Viral Hook
    const handleUseHook = (hook, account = null) => {
        handleOpenNewTask({
            ...(account ? { accountId: account.id, accountHandler: account.handler } : {}),
            title: hook.text,
            hookVerbal: hook.text,
            pillar: hook.pillar,
            status: 'script'
        });
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

    // ─── Estudio: idea aprobada desde material raw → pieza en el pipeline ───
    const handleApproveIdea = (account, idea) => {
        const dna = normalizeDna(account.dna);
        const newTask = {
            id: `ct-${Date.now()}`,
            createdAt: new Date().toISOString(),
            title: idea.title,
            accountId: account.id,
            accountHandler: account.handler,
            format: idea.format,
            pillar: idea.pillar,
            status: 'idea',
            hookVerbal: idea.hook,
            hookVisual: idea.overlayText ? `Texto en pantalla: ${idea.overlayText}` : '',
            scriptBody: idea.concept,
            overlayText: idea.overlayText,
            ideaWhy: idea.why,
            durationSec: idea.durationSec,
            cta: idea.cta,
            caption: idea.caption,
            hashtags: dna.hashtags,
            rawAssetIds: idea.assetIds,
            assignee: '',
            shootingLocation: '',
            assetsDriveUrl: '',
            publishDate: new Date().toISOString().split('T')[0],
            publishTime: '19:30',
            source: 'raw',
        };
        addContentTask(newTask);
        if (addActivity) addActivity(`Idea aprobada desde material raw para ${account.handler}: "${idea.title}"`, '#f472b6');
    };

    // ─── Handlers: ADN de cuenta ───
    const handleSaveDna = (dna) => {
        updateSocialMedia(dnaAccount.id, { dna });
        if (addActivity) addActivity(`ADN actualizado: ${dnaAccount.handler} (${dnaCompleteness(dna)}%)`, '#a78bfa');
        setDnaAccount(null);
    };

    // Pilares del ADN de la cuenta elegida en el formulario de contenido (o los genéricos si aún no tiene ADN)
    // Guía de video de la cuenta elegida en el formulario de nueva pieza
    const { brand: taskBrand } = useBrandForAccount(showTaskModal ? taskFormData.accountId : null);

    const taskAccountPillars = useMemo(() => {
        const acc = accounts.find(a => a.id === taskFormData.accountId || a.handler === taskFormData.accountHandler);
        const pillars = normalizeDna(acc?.dna).pillars;
        const base = pillars.length ? pillars : DEFAULT_PILLARS;
        return taskFormData.pillar && !base.includes(taskFormData.pillar) ? [taskFormData.pillar, ...base] : base;
    }, [accounts, taskFormData.accountId, taskFormData.accountHandler, taskFormData.pillar]);

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
                                Redes Sociales
                            </h1>
                            <p>
                                Producción de contenido y control de todas las cuentas.
                            </p>
                        </div>
                    </div>

                    <div className="social-hero-actions">
                        <button 
                            className="social-btn-secondary"
                            onClick={() => { setSelectedAccountFilter('all'); setCurrentTab('library'); }}
                        >
                            <Library size={14} /> Biblioteca
                        </button>
                        <button 
                            className="social-btn-primary"
                            onClick={() => handleOpenNewTask()}
                        >
                            <Plus size={15} /> Nueva pieza
                        </button>
                    </div>
                </div>

                {/* Aggregated Live Metrics Strip */}
                <div className="social-metrics-strip">
                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <Users size={12} /> Audiencia Total
                        </div>
                        <div className="social-metric-val">
                            {formatAudience(totalAudience)}
                            <span className="social-metric-sub">{accounts.length} cuentas</span>
                        </div>
                    </div>

                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <Film size={12} /> En Producción
                        </div>
                        <div className="social-metric-val">
                            {(contentTasks || []).filter(t => ['script', 'shooting', 'editing'].includes(t.status)).length}
                            <span className="social-metric-sub">piezas activas</span>
                        </div>
                    </div>

                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <CheckCircle2 size={12} /> Listos para Publicar
                        </div>
                        <div className="social-metric-val">
                            {(contentTasks || []).filter(t => t.status === 'ready').length}
                            <span className="social-metric-sub">Reels aprobados</span>
                        </div>
                    </div>

                    <div className="social-metric-card">
                        <div className="social-metric-lbl">
                            <TrendingUp size={12} /> Publicados Recientes
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
                    <div className="channel-avatar channel-avatar-all">
                        <LayoutDashboard size={12} />
                    </div>
                    <span>Todas</span>
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
                            onClick={() => {
                                setSelectedAccountFilter(acc.handler);
                                setAccountProfileTab('kanban');
                            }}
                        >
                            <div className="channel-avatar" style={{ background: meta.gradient }}>
                                <IconComp size={12} />
                            </div>
                            <span style={{ fontWeight: 700 }}>{acc.handler}</span>
                            <span style={{ fontSize: '11px', color: 'var(--se-muted)' }}>{acc.followers}</span>
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
               SECCIÓN 1: VISTA GENERAL (TODAS LAS CUENTAS)
               ═══════════════════════════════════════════════════════════════════ */}
            {selectedAccountFilter === 'all' ? (
                <>
                    <div className="social-tabs-nav" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                className={`social-tab-btn ${currentTab === 'pipeline' ? 'active' : ''}`}
                                onClick={() => setCurrentTab('pipeline')}
                            >
                                <Film size={15} /> Pipeline
                            </button>
                            <button 
                                className={`social-tab-btn ${currentTab === 'eventos_artes' ? 'active' : ''}`}
                                onClick={() => setCurrentTab('eventos_artes')}
                            >
                                <Palette size={15} /> Artes por evento
                            </button>
                            <button 
                                className={`social-tab-btn ${currentTab === 'calendar' ? 'active' : ''}`}
                                onClick={() => setCurrentTab('calendar')}
                            >
                                <CalendarDays size={15} /> Calendario
                            </button>
                            <button 
                                className={`social-tab-btn ${currentTab === 'library' ? 'active' : ''}`}
                                onClick={() => setCurrentTab('library')}
                            >
                                <Library size={15} /> Biblioteca
                            </button>
                            <button 
                                className={`social-tab-btn ${currentTab === 'raw' ? 'active' : ''}`}
                                onClick={() => setCurrentTab('raw')}
                            >
                                <FolderOpen size={15} /> Material raw
                            </button>
                            <button 
                                className={`social-tab-btn ${currentTab === 'accounts' ? 'active' : ''}`}
                                onClick={() => setCurrentTab('accounts')}
                            >
                                <Dna size={15} /> Cuentas
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                className="social-tab-btn"
                                style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'var(--border-accent)' }}
                                onClick={() => navigate('/content-hub')}
                            >
                                <Film size={14} /> Master Content Hub
                            </button>
                            <button 
                                className="social-tab-btn"
                                style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                                onClick={() => navigate('/creative-brief')}
                            >
                                <Sparkles size={14} /> Creative Brief
                            </button>
                            <button 
                                className="social-tab-btn"
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                onClick={() => navigate('/production-calendar')}
                            >
                                <CalendarDays size={14} /> Production Calendar
                            </button>
                        </div>
                    </div>

            {/* Toolbar: Search & Format Filter */}
            {(currentTab === 'pipeline' || currentTab === 'calendar') && (
                <div className="social-toolbar">
                    <div className="social-search-input">
                        <Search size={14} />
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
                            value={selectedEventFilter}
                            onChange={(e) => setSelectedEventFilter(e.target.value)}
                        >
                            <option value="all">Todos los Eventos</option>
                            {eventsList.map(ev => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.icon || '🍸'} {ev.name}
                                </option>
                            ))}
                        </select>

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
                                    <div className="kanban-col-title"><i className="kanban-dot" style={{ background: col.color }} />
                                        <span>{col.label}</span>
                                    </div>
                                    <span className="kanban-col-count">{colTasks.length}</span>
                                </div>

                                <div className="kanban-cards-list">
                                    {colTasks.length === 0 ? (
                                        <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--se-faint)', fontSize: '12px' }}>
                                            Sin piezas en {col.label.toLowerCase()}
                                        </div>
                                    ) : (
                                        colTasks.map(task => (
                                            <div 
                                                key={task.id} 
                                                className="social-content-card"
                                                onClick={() => handleOpenEditTask(task)}
                                            >
                                                {task.artUrl && (
                                                    <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
                                                        <img src={task.artUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        {task.eventId && (() => {
                                                            const ev = eventsList.find(e => e.id === task.eventId);
                                                            return ev ? (
                                                                <span style={{
                                                                    position: 'absolute', bottom: '6px', left: '6px',
                                                                    background: 'rgba(0,0,0,0.75)', color: 'var(--se-text)',
                                                                    fontSize: '9.5px', fontWeight: 700, padding: '2px 6px',
                                                                    borderRadius: '4px', backdropFilter: 'blur(4px)'
                                                                }}>
                                                                    {ev.icon || '🍸'} {ev.name}
                                                                </span>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}

                                                <div className="card-topline">
                                                    <span className="card-account-pill">
                                                        <Instagram size={11} /> {task.accountHandler}
                                                    </span>
                                                    <span className="card-format-pill">
                                                        {task.format}
                                                    </span>
                                                </div>

                                                {(!task.artUrl && task.eventId) && (() => {
                                                    const ev = eventsList.find(e => e.id === task.eventId);
                                                    return ev ? (
                                                        <div style={{ marginBottom: '6px' }}>
                                                            <span style={{
                                                                fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                                                                borderRadius: '4px', background: 'var(--se-surface-2)',
                                                                color: 'var(--se-text-2)', border: '1px solid var(--se-border)'
                                                            }}>
                                                                {ev.icon || '🍸'} {ev.name}
                                                            </span>
                                                        </div>
                                                    ) : null;
                                                })()}

                                                <h4 className="card-title">{task.title}</h4>

                                                {task.hookVerbal && (
                                                    <div className="card-hook-box">
                                                        <div className="card-hook-label">Gancho Verbal:</div>
                                                        <div className="card-hook-text">"{task.hookVerbal}"</div>
                                                    </div>
                                                )}

                                                <div className="card-meta-row">
                                                    <span className="card-assignee">
                                                        {task.assignee ? task.assignee.split(' ')[0] : 'Filmmaker'}
                                                    </span>
                                                    <span className="card-date">
                                                        {task.publishDate || 'S/F'}
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
                                                            <FolderGit2 size={14} />
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
                                            color: 'var(--se-muted)',
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
               TAB: ARTES & POSTS POR EVENTO (BOXES DE EVENTOS COMPLETOS)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'eventos_artes' && (
                <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* KPI METRICS ROW */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                        <div className="card" style={{ padding: '16px', background: 'var(--se-surface)', borderLeft: '1px solid var(--se-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eventos Activos</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{eventsList.length} Venues</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--se-accent)', marginTop: '4px', fontWeight: 600 }}>100% Cobertura visual</div>
                        </div>
                        <div className="card" style={{ padding: '16px', background: 'var(--se-surface)', borderLeft: '1px solid var(--se-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artes Aprobados</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>{allArtesStats.aprobados} de {allArtesStats.total} ({allArtesStats.pctAprobado}%)</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--se-muted)', marginTop: '4px' }}>Listos para parrilla y pauta</div>
                        </div>
                        <div className="card" style={{ padding: '16px', background: 'var(--se-surface)', borderLeft: '1px solid var(--se-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>En Revisión / Pendientes</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--se-accent)', marginTop: '4px' }}>{allArtesStats.revision + allArtesStats.pendientes} Materiales</div>
                            <div style={{ fontSize: '11.5px', color: '#f59e0b', marginTop: '4px', fontWeight: 600 }}>{allArtesStats.revision} en revisión · {allArtesStats.pendientes} pendientes</div>
                        </div>
                        <div className="card" style={{ padding: '16px', background: 'var(--se-surface)', borderLeft: '1px solid var(--se-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Posts en Pipeline</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>{allArtesStats.totalTasks} Piezas</div>
                            <div style={{ fontSize: '11.5px', color: '#a5b4fc', marginTop: '4px', fontWeight: 600 }}>Vinculadas a eventos</div>
                        </div>
                    </div>

                    {/* EVENT PILLS CHIPS CAROUSEL */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                        <button
                            className={`social-channel-chip ${selectedEventFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedEventFilter('all')}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            Todos los Eventos ({eventsList.length})
                        </button>
                        {eventsList.map(ev => {
                            const artes = getEventArtes(ev);
                            const posts = (contentTasks || []).filter(t => t.eventId === ev.id);
                            const isSelected = selectedEventFilter === ev.id;
                            return (
                                <button
                                    key={ev.id}
                                    className={`social-channel-chip ${isSelected ? 'active' : ''}`}
                                    onClick={() => setSelectedEventFilter(isSelected ? 'all' : ev.id)}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    <span>{ev.icon || '🍸'}</span>
                                    <span>{ev.name}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.75, background: 'rgba(255,255,255,0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                                        {artes.length} artes · {posts.length} posts
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* FILTER & SEARCH TOOLBAR */}
                    <div className="social-toolbar" style={{ margin: 0 }}>
                        <div className="social-search-input">
                            <Search size={14} />
                            <input 
                                type="text" 
                                placeholder="Buscar por evento, arte, descripción o post..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="social-filter-group">
                            {/* Art Status Filter Pills */}
                            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {['Todos', 'Aprobado', 'Revisión', 'Pendiente'].map(st => (
                                    <button 
                                        key={st}
                                        onClick={() => setArtFilter(st)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: artFilter === st ? 'rgba(225,48,108,0.25)' : 'transparent',
                                            color: artFilter === st ? '#E1306C' : '#94a3b8',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>

                            <button 
                                className="social-btn-secondary"
                                style={{ fontSize: '12px', padding: '7px 12px' }}
                                onClick={() => {
                                    const targetEv = eventsList.find(e => e.id === selectedEventFilter) || eventsList[0];
                                    if (targetEv) handleGenerateAiCopyForEvent(targetEv);
                                }}
                                title="Generar copy con gancho viral usando IA para el evento seleccionado"
                            >
                                <Sparkles size={13} /> Copy con IA
                            </button>

                            <button 
                                className="social-btn-primary"
                                style={{ fontSize: '12px', padding: '7px 14px' }}
                                onClick={() => handleOpenNewArt({ eventId: selectedEventFilter !== 'all' ? selectedEventFilter : (eventsList[0]?.id || '') })}
                            >
                                <Plus size={13} /> Subir Arte / Flyer
                            </button>
                        </div>
                    </div>

                    {/* LIST OF EVENT BOXES */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {filteredEventsForBoxes.map(event => {
                            const allEventArtes = getEventArtes(event);
                            const displayArtes = artFilter === 'Todos' 
                                ? allEventArtes 
                                : allEventArtes.filter(a => a.status === artFilter);
                            
                            const eventTasks = (contentTasks || []).filter(t => t.eventId === event.id);

                            return (
                                <div key={event.id} className="event-box-card">
                                    {/* HEADER */}
                                    <div className="event-box-header">
                                        <div className="event-box-identity">
                                            <div className="event-box-icon" style={{ borderColor: event.color ? `${event.color}66` : 'rgba(255,255,255,0.15)' }}>
                                                {event.icon || '🍸'}
                                            </div>
                                            <div>
                                                <h3 className="event-box-name">
                                                    {event.name}
                                                    <span className="event-badge-pill" style={{
                                                        background: event.status === 'activo' || event.status === 'Confirmado' ? 'rgba(34,197,94,0.18)' : 'rgba(245,158,11,0.18)',
                                                        color: event.status === 'activo' || event.status === 'Confirmado' ? '#4ade80' : '#fbbf24'
                                                    }}>
                                                        {event.status || 'Activo'}
                                                    </span>
                                                </h3>
                                                <div className="event-box-meta">
                                                    <span className="event-box-meta-item">
                                                        {event.location || 'Casco Antiguo, Panamá'}
                                                    </span>
                                                    {event.instances?.[0]?.date && (
                                                        <span className="event-box-meta-item">
                                                            {event.instances[0].date} ({event.instances[0].day || 'Semanal'})
                                                        </span>
                                                    )}
                                                    <span className="event-box-meta-item" style={{ color: 'var(--se-accent)', fontWeight: 600 }}>
                                                        {allEventArtes.length} Artes ({allEventArtes.filter(a => a.status === 'Aprobado').length} Aprobados)
                                                    </span>
                                                    <span className="event-box-meta-item" style={{ color: 'var(--se-accent)', fontWeight: 600 }}>
                                                        {eventTasks.length} Posts Planificados
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="event-box-actions">
                                            <button 
                                                className="social-btn-secondary" 
                                                style={{ fontSize: '11.5px', padding: '6px 12px' }}
                                                onClick={() => handleGenerateAiCopyForEvent(event)}
                                            >
                                                <Sparkles size={13} /> Copy con IA
                                            </button>
                                            <button 
                                                className="social-btn-secondary" 
                                                style={{ fontSize: '11.5px', padding: '6px 12px' }}
                                                onClick={() => handleOpenNewTask({ 
                                                    eventId: event.id,
                                                    title: `Post Promocional — ${event.name}`,
                                                    shootingLocation: event.location || 'Casco Antiguo HQ'
                                                })}
                                            >
                                                <Plus size={13} /> Crear Post
                                            </button>
                                            <button 
                                                className="social-btn-primary" 
                                                style={{ fontSize: '11.5px', padding: '6px 14px' }}
                                                onClick={() => handleOpenNewArt({ eventId: event.id })}
                                            >
                                                <Plus size={13} /> Subir Arte
                                            </button>
                                            <button 
                                                className="social-btn-secondary" 
                                                style={{ fontSize: '11.5px', padding: '6px 10px', color: 'var(--se-muted)' }}
                                                onClick={() => navigate(`/eventos/${event.id}`)}
                                                title="Abrir vista completa de este evento"
                                            >
                                                <ExternalLink size={13} /> Ver Evento
                                            </button>
                                        </div>
                                    </div>

                                    {/* SUB-SECTIONS */}
                                    <div className="event-subsections-grid">
                                        {/* SUB-BOX A: ARTES GRÁFICOS & FLYERS */}
                                        <div>
                                            <div className="event-section-title-row">
                                                <h4 className="event-section-title">
                                                    <Palette size={15} />
                                                    Artes Gráficos & Material Visual ({displayArtes.length})
                                                </h4>
                                                <span style={{ fontSize: '11px', color: 'var(--se-muted)' }}>
                                                    Flyers oficiales, formatos 4:5, Stories 9:16 y banners listos para publicar
                                                </span>
                                            </div>

                                            <div className="event-art-grid">
                                                {displayArtes.map(art => {
                                                    const isVertical = art.type === 'Story' || art.type === 'Reel' || art.format?.includes('1920');
                                                    const isPortrait = art.format === '1080x1350' || art.format === '4:5';
                                                    const ratioClass = isVertical ? 'ratio-vertical' : isPortrait ? 'ratio-portrait' : 'ratio-square';

                                                    return (
                                                        <div key={art.id} className="event-art-card">
                                                            <div 
                                                                className={`event-art-media ${ratioClass}`}
                                                                onClick={() => handleOpenEditArt(art, event.id)}
                                                            >
                                                                <img src={art.imageUrl} alt={art.title} loading="lazy" />

                                                                {/* Quick status pill with dropdown toggle */}
                                                                <span 
                                                                    className="event-art-status-badge"
                                                                    style={{
                                                                        background: art.status === 'Aprobado' ? 'rgba(34,197,94,0.9)' :
                                                                                    art.status === 'Revisión' ? 'rgba(245,158,11,0.9)' :
                                                                                    'rgba(15,23,42,0.85)',
                                                                        color: 'var(--se-text)'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const nextStatus = art.status === 'Aprobado' ? 'Pendiente' :
                                                                                           art.status === 'Pendiente' ? 'Revisión' : 'Aprobado';
                                                                        handleQuickArtStatus(event.id, art.id, nextStatus);
                                                                    }}
                                                                    title="Clic para cambiar estado rápido"
                                                                >
                                                                    {art.status}
                                                                </span>

                                                                <span className="event-art-format-tag">
                                                                    {art.format || art.type}
                                                                </span>
                                                            </div>

                                                            <div className="event-art-content">
                                                                <div>
                                                                    <h5 className="event-art-title" title={art.title}>{art.title}</h5>
                                                                    {art.description && (
                                                                        <p className="event-art-desc" title={art.description}>{art.description}</p>
                                                                    )}
                                                                </div>

                                                                {art.references && (
                                                                    <a 
                                                                        href={art.references} 
                                                                        target="_blank" 
                                                                        rel="noreferrer"
                                                                        style={{ fontSize: '10.5px', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                                                    >
                                                                        <LinkIcon size={11} /> Ver Referencias / Drive
                                                                    </a>
                                                                )}

                                                                <div className="event-art-actions-row">
                                                                    <button 
                                                                        className="event-art-btn-create-post"
                                                                        onClick={() => handleCreatePostFromArt(event, art)}
                                                                        title="Crear pieza de contenido en el pipeline usando este arte como portada"
                                                                    >
                                                                        <Sparkles size={11} /> Crear Post
                                                                    </button>

                                                                    <button 
                                                                        className="event-art-icon-btn"
                                                                        onClick={() => handleOpenEditArt(art, event.id)}
                                                                        title="Editar detalles del arte"
                                                                    >
                                                                        <Edit3 size={12} />
                                                                    </button>

                                                                    <button 
                                                                        className="event-art-icon-btn danger"
                                                                        onClick={() => handleDeleteArt(event.id, art.id, art.title)}
                                                                        title="Eliminar este arte"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Upload new art dashed card */}
                                                <div 
                                                    className="event-art-upload-card"
                                                    onClick={() => handleOpenNewArt({ eventId: event.id })}
                                                >
                                                    <Plus size={28} style={{ marginBottom: '8px' }} />
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--se-text)' }}>Subir Nuevo Arte</div>
                                                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>Flyer, Lineup o Story para {event.name}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SUB-BOX B: POSTS & CONTENIDOS PLANIFICADOS */}
                                        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div className="event-section-title-row">
                                                <h4 className="event-section-title">
                                                    <Film size={15} />
                                                    Parrilla de Posts, Reels & Stories de este Evento ({eventTasks.length})
                                                </h4>
                                                <button 
                                                    className="social-btn-secondary"
                                                    style={{ fontSize: '11px', padding: '4px 10px' }}
                                                    onClick={() => handleOpenNewTask({ 
                                                        eventId: event.id,
                                                        title: `Contenido — ${event.name}`,
                                                        shootingLocation: event.location || 'Casco Antiguo HQ'
                                                    })}
                                                >
                                                    <Plus size={12} /> Añadir Post al Evento
                                                </button>
                                            </div>

                                            {eventTasks.length === 0 ? (
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1px dashed rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '24px',
                                                    textAlign: 'center',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                }}>
                                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--se-muted)' }}>
                                                        No hay piezas de contenido planificadas específicamente para este evento.
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                        <button 
                                                            className="social-btn-secondary" 
                                                            style={{ fontSize: '11.5px', padding: '6px 14px' }}
                                                            onClick={() => handleGenerateAiCopyForEvent(event)}
                                                        >
                                                            <Sparkles size={13} /> Generar Ideas con IA
                                                        </button>
                                                        <button 
                                                            className="social-btn-primary" 
                                                            style={{ fontSize: '11.5px', padding: '6px 14px' }}
                                                            onClick={() => handleOpenNewTask({ 
                                                                eventId: event.id,
                                                                title: `Post — ${event.name}`
                                                            })}
                                                        >
                                                            <Plus size={13} /> Planificar Primer Post
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="event-posts-grid">
                                                    {eventTasks.map(task => {
                                                        const col = PIPELINE_COLUMNS.find(c => c.id === (task.status || 'idea')) || PIPELINE_COLUMNS[0];
                                                        const currentIndex = PIPELINE_COLUMNS.findIndex(c => c.id === (task.status || 'idea'));
                                                        const nextCol = PIPELINE_COLUMNS[currentIndex + 1];

                                                        return (
                                                            <div 
                                                                key={task.id} 
                                                                className="event-post-box-item"
                                                                onClick={() => handleOpenEditTask(task)}
                                                            >
                                                                <div className="event-post-topline">
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        fontWeight: 800,
                                                                        padding: '2px 7px',
                                                                        borderRadius: '5px',
                                                                        background: `${col.color}22`,
                                                                        color: col.color,
                                                                        border: `1px solid ${col.color}44`
                                                                    }}>
                                                                        {col.label}
                                                                    </span>
                                                                    <span style={{ fontSize: '10px', color: 'var(--se-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                        {task.format}
                                                                    </span>
                                                                </div>

                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                                    {task.artUrl && (
                                                                        <img 
                                                                            src={task.artUrl} 
                                                                            alt="" 
                                                                            style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} 
                                                                        />
                                                                    )}
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--se-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {task.title}
                                                                        </div>
                                                                        <div style={{ fontSize: '10.5px', color: 'var(--se-muted)', marginTop: '2px' }}>
                                                                            {task.accountHandler}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {task.hookVerbal && (
                                                                    <div className="event-post-hook-preview">
                                                                        "{task.hookVerbal}"
                                                                    </div>
                                                                )}

                                                                <div className="event-post-footer-row">
                                                                    <span>{task.publishDate || 'Sin fecha'} {task.publishTime || ''}</span>

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
                                                                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '10.5px' }}>✓ Listo</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* SUB-BOX C: BRIEFING & REFERENCIAS VISUALES */}
                                        {(event.notes || event.description) && (
                                            <div style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '10px',
                                                padding: '12px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '10px',
                                                fontSize: '11.5px',
                                                color: 'var(--se-muted)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={14} />
                                                    <span><strong>Briefing de Marca:</strong> {event.notes || event.description}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        className="social-btn-secondary" 
                                                        style={{ fontSize: '10.5px', padding: '4px 8px' }}
                                                        onClick={() => navigate(`/eventos/${event.id}`)}
                                                    >
                                                        Ver Detalles & Mapa →
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 2: MULTI-ACCOUNT CALENDAR GRID
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'calendar' && (
                <div className="animate-in card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: '16px 20px',
                        background: 'var(--se-surface)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--se-text)' }}>
                                Calendario de Planificación Semanal
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--se-muted)' }}>
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
            {/* ═══════════════════════════════════════════════════════════════════
               TAB 4: ACCOUNTS & METRICS PROFILES
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'raw' && (
                <div className="animate-in">
                    <RawLibrary accounts={accounts} />
                </div>
            )}

            {currentTab === 'library' && (
                <div className="animate-in">
                    <ContentLibrary accounts={accounts} onAddTask={addContentTask} onUseHook={handleUseHook} />
                </div>
            )}

            {currentTab === 'accounts' && (
                <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                    {accounts.map(acc => {
                        const meta = PLATFORM_META[acc.platform] || PLATFORM_META.Instagram;
                        const IconComp = meta.icon;
                        const tasksForThis = (contentTasks || []).filter(t => t.accountHandler === acc.handler || t.accountId === acc.id);
                        const dnaPct = dnaCompleteness(acc.dna);

                        return (
                            <div key={acc.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '42px', height: '42px', borderRadius: '12px',
                                            background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--se-text)', boxShadow: `0 4px 14px ${meta.color}40`
                                        }}>
                                            <IconComp size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--se-text)' }}>{acc.handler}</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--se-muted)' }}>{acc.type}</p>
                                        </div>
                                    </div>

                                    {acc.url && (
                                        <a href={acc.url} target="_blank" rel="noreferrer" className="social-btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }}>
                                            <ExternalLink size={12} /> Abrir
                                        </a>
                                    )}
                                </div>

                                <p style={{ fontSize: '12px', color: 'var(--se-text-2)', margin: 0, lineHeight: 1.4 }}>
                                    {acc.description || 'Cuenta oficial gestionada por ARRIVE Agency'}
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--se-faint)' }}>SEGUIDORES</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--se-text)' }}>{acc.followers}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--se-faint)' }}>PIPELINE</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--se-accent)' }}>{tasksForThis.length} posts</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--se-faint)' }}>ENGAGEMENT</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399' }}>{acc.metrics?.engagement || '6.5%'}</div>
                                    </div>
                                </div>

                                <div className="dna-card-bar">
                                    <Dna size={12} /> ADN
                                    <div className="dna-progress-track">
                                        <div className="dna-progress-fill" style={{ width: `${dnaPct}%` }} />
                                    </div>
                                    <span style={{ color: dnaPct === 100 ? '#34d399' : '#a78bfa' }}>{dnaPct}%</span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                    <button 
                                        className="social-btn-primary" 
                                        style={{ flex: 1, padding: '7px', fontSize: '12px', justifyContent: 'center' }}
                                        onClick={() => {
                                            setSelectedAccountFilter(acc.handler);
                                            setAccountProfileTab('kanban');
                                        }}
                                    >
                                        <Users size={13} /> Ver Perfil de Cuenta
                                    </button>
                                    <button 
                                        className="social-btn-secondary" 
                                        style={{ padding: '7px 12px', fontSize: '12px' }}
                                        title="Material raw e ideas"
                                        onClick={() => {
                                            setSelectedAccountFilter(acc.handler);
                                            setAccountProfileTab('raw');
                                        }}
                                    >
                                        <FolderOpen size={13} />
                                    </button>
                                    <button 
                                        className="social-btn-secondary" 
                                        style={{ padding: '7px 12px', fontSize: '12px' }}
                                        title={dnaPct ? 'Editar ADN' : 'Definir ADN'}
                                        onClick={() => setDnaAccount(acc)}
                                    >
                                        <Dna size={13} />
                                    </button>
                                    <button 
                                        className="social-btn-secondary" 
                                        style={{ padding: '7px 12px', fontSize: '12px' }}
                                        title="Ver pipeline de esta cuenta"
                                        onClick={() => {
                                            setSelectedAccountFilter(acc.handler);
                                            setAccountProfileTab('kanban');
                                        }}
                                    >
                                        <Film size={13} />
                                    </button>
                                    {brandByAccount[acc.id] && (
                                        <a
                                            className="social-btn-secondary"
                                            style={{ padding: '7px 12px', fontSize: '12px' }}
                                            href={`/brands/${brandByAccount[acc.id].slug}/`}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Ver línea gráfica"
                                        >
                                            <Palette size={13} />
                                        </a>
                                    )}
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
            </>
            ) : activeAccount ? (
                /* ═══════════════════════════════════════════════════════════════════
                   SECCIÓN 2: PERFIL DE CUENTA INDIVIDUAL (ORGANIZADO POR CUENTA)
                   ═══════════════════════════════════════════════════════════════════ */
                <div className="account-profile-view animate-in">
                    {/* BREADCRUMB BAR */}
                    <div className="account-breadcrumb-bar">
                        <button 
                            className="account-back-btn"
                            onClick={() => setSelectedAccountFilter('all')}
                        >
                            <ArrowLeft size={14} /> Volver a Todas
                        </button>

                        <div className="account-breadcrumb-trail">
                            <span>Redes Sociales</span>
                            <ChevronRight size={12} />
                            <span>Cuenta</span>
                            <ChevronRight size={12} />
                            <span className="current">{activeAccount.handler}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--se-muted)' }}>Cambiar cuenta:</span>
                            <select 
                                className="social-filter-select"
                                style={{ padding: '5px 10px', fontSize: '11.5px' }}
                                value={activeAccount.handler}
                                onChange={(e) => {
                                    if (e.target.value === 'all') setSelectedAccountFilter('all');
                                    else {
                                        setSelectedAccountFilter(e.target.value);
                                        setAccountProfileTab('kanban');
                                    }
                                }}
                            >
                                <option value="all">Vista General (Todas las cuentas)</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.handler}>{a.handler} ({a.followers})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* HERO PROFILE HEADER */}
                    <div className="account-profile-hero">
                        <div className="account-hero-top">
                            <div className="account-hero-id">
                                <div 
                                    className="account-hero-avatar" 
                                    style={{ background: 'var(--se-surface-2)' }}
                                >
                                    {activeAvatarSvg ? (
                                        <div className="account-hero-avatar-svg" dangerouslySetInnerHTML={{ __html: activeAvatarSvg }} />
                                    ) : (() => {
                                        const meta = PLATFORM_META[activeAccount.platform] || PLATFORM_META.Instagram;
                                        const IconComp = meta.icon;
                                        return <IconComp size={32} />;
                                    })()}
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0 }}>
                                            {activeAccount.handler}
                                        </h2>
                                        <span className="account-verified-badge" title="Cuenta verificada en el ecosistema">✓</span>
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.08)',
                                            color: 'var(--se-text)',
                                            border: '1px solid rgba(255,255,255,0.12)'
                                        }}>
                                            {activeAccount.platform || 'Instagram'}
                                        </span>
                                    </div>

                                    <div className="account-hero-type">
                                        {activeBrand ? `${activeBrand.name} · ${activeBrand.tagline}` : activeAccount.type}
                                    </div>

                                    <p className="account-hero-bio">
                                        {activeAccount.description || 'Cuenta oficial administrada por ARRIVE Media & Content Engine.'}
                                    </p>

                                    {/* Linked Events Tags */}
                                    {(() => {
                                        const linkedEvents = eventsList.filter(ev => 
                                            (activeAccount.linkedEventIds || []).includes(ev.id) ||
                                            (ev.name.toLowerCase().includes(activeAccount.handler.replace('@', '').toLowerCase().split('.')[0]))
                                        );
                                        if (linkedEvents.length === 0) return null;
                                        return (
                                            <div className="account-hero-events-row">
                                                <span style={{ fontSize: '10px', color: 'var(--se-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Venues & Eventos:</span>
                                                {linkedEvents.map(ev => (
                                                    <span key={ev.id} className="account-hero-event-chip">
                                                        {ev.icon || '🍸'} {ev.name}
                                                    </span>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Hero Action Buttons */}
                            <div className="account-hero-actions">
                                <button 
                                    className="social-btn-primary"
                                    onClick={() => handleOpenNewTask({ accountId: activeAccount.id, accountHandler: activeAccount.handler })}
                                >
                                    <Plus size={14} /> Nueva pieza
                                </button>

                                <button 
                                    className="social-btn-secondary"
                                    onClick={() => setDnaAccount(activeAccount)}
                                >
                                    <Dna size={14} /> Editar ADN
                                </button>

                                <button 
                                    className="social-btn-secondary"
                                    onClick={() => {
                                        setEditingAccount(activeAccount);
                                        setAccountFormData({ ...activeAccount });
                                        setShowAccountModal(true);
                                    }}
                                >
                                    <Edit3 size={14} /> Editar Cuenta
                                </button>

                                {activeAccount.url && (
                                    <a 
                                        href={activeAccount.url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="social-btn-secondary"
                                        title="Abrir en plataforma"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Account Live Stats Row */}
                        <div className="account-hero-stats">
                            <div className="account-stat-box">
                                <div className="account-stat-lbl">
                                    <Users size={11} /> Seguidores
                                </div>
                                <div className="account-stat-val">
                                    {activeAccount.followers || '0'}
                                </div>
                                <span className="account-stat-sub" style={{ color: '#34d399' }}>
                                    {activeAccount.metrics?.growth || '+120'} este mes
                                </span>
                            </div>

                            <div className="account-stat-box">
                                <div className="account-stat-lbl">
                                    <TrendingUp size={11} /> Engagement
                                </div>
                                <div className="account-stat-val">
                                    {activeAccount.metrics?.engagement || '5.8%'}
                                </div>
                                <span className="account-stat-sub" style={{ color: 'var(--se-muted)' }}>
                                    Tasa media
                                </span>
                            </div>

                            <div className="account-stat-box">
                                <div className="account-stat-lbl">
                                    <Eye size={11} /> Vistas Estimadas
                                </div>
                                <div className="account-stat-val">
                                    {activeAccount.metrics?.views || '18K'}
                                </div>
                                <span className="account-stat-sub" style={{ color: 'var(--se-muted)' }}>
                                    Alcance global
                                </span>
                            </div>

                            <div className="account-stat-box">
                                <div className="account-stat-lbl">
                                    <Film size={11} /> Piezas en Pipeline
                                </div>
                                <div className="account-stat-val">
                                    {activeAccountTasks.length}
                                </div>
                                <span className="account-stat-sub" style={{ color: 'var(--se-accent)' }}>
                                    {activeAccountTasks.filter(t => t.status === 'ready' || t.status === 'published').length} listas / publicadas
                                </span>
                            </div>

                            <div className="account-stat-box">
                                <div className="account-stat-lbl">
                                    <Dna size={11} /> ADN de Marca
                                </div>
                                <div className="account-stat-val">
                                    {dnaCompleteness(activeAccount.dna)}%
                                </div>
                                <span className="account-stat-sub" style={{ color: dnaCompleteness(activeAccount.dna) === 100 ? '#34d399' : '#f472b6' }}>
                                    {dnaCompleteness(activeAccount.dna) === 100 ? 'ADN Completo' : 'En desarrollo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SUBTABS NAVIGATION — todo lo de la cuenta en un solo lugar */}
                    <div className="account-profile-subtabs">
                        {[
                            { id: 'posts', icon: Image, label: 'Feed', badge: activeAccountTasks.length },
                            { id: 'kanban', icon: Film, label: 'Producción', badge: activeAccountTasks.filter(t => t.status !== 'published').length },
                            { id: 'calendar', icon: CalendarDays, label: 'Calendario' },
                            { id: 'raw', icon: FolderOpen, label: 'Raw → Ideas' },
                            { id: 'generate', icon: Sparkles, label: 'Generar con IA' },
                            { id: 'library', icon: Library, label: 'Biblioteca' },
                            { id: 'dna', icon: Dna, label: 'Marca & ADN' },
                        ].map(t => {
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.id}
                                    className={`account-subtab-btn ${accountProfileTab === t.id ? 'active' : ''}`}
                                    onClick={() => setAccountProfileTab(t.id)}
                                >
                                    <Icon size={14} style={t.color ? { color: t.color } : undefined} /> {t.label}
                                    {t.badge ? <span className="account-subtab-badge">{t.badge}</span> : null}
                                </button>
                            );
                        })}
                    </div>

                    {/* SUBTAB: PRODUCCIÓN (tablero + desarrollo con IA, brief y render) */}
                    {accountProfileTab === 'kanban' && (
                        <div className="account-prod-switch">
                            <div className="raw-filters">
                                <button className={`raw-chip ${productionView === 'board' ? 'on' : ''}`} onClick={() => setProductionView('board')}><Film size={12} /> Tablero</button>
                                <button className={`raw-chip ${productionView === 'studio' ? 'on' : ''}`} onClick={() => setProductionView('studio')}><Wand2 size={12} /> Desarrollo IA → Brief → Render</button>
                            </div>
                        </div>
                    )}
                    {accountProfileTab === 'kanban' && productionView === 'studio' && (
                        <div className="animate-in">
                            <ProductionBoard
                                account={activeAccount}
                                tasks={activeAccountTasks}
                                onTaskChange={task => updateContentTask(task.id, task)}
                                onOpenTask={handleOpenEditTask}
                            />
                        </div>
                    )}

                    {/* SUBTAB 1: KANBAN BOARD */}
                    {accountProfileTab === 'kanban' && productionView === 'board' && (
                        <div className="social-kanban-board animate-in">
                            {PIPELINE_COLUMNS.map((col, colIdx) => {
                                const colTasks = activeAccountTasksByCol[col.id] || [];
                                const nextCol = PIPELINE_COLUMNS[colIdx + 1];

                                return (
                                    <div key={col.id} className="social-kanban-col">
                                        <div className="kanban-col-head">
                                            <div className="kanban-col-title"><i className="kanban-dot" style={{ background: col.color }} />
                                                <span>{col.label}</span>
                                            </div>
                                            <span className="kanban-col-count">{colTasks.length}</span>
                                        </div>

                                        <div className="kanban-cards-list">
                                            {colTasks.length === 0 ? (
                                                <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--se-faint)', fontSize: '12px' }}>
                                                    Sin piezas en {col.label.toLowerCase()}
                                                </div>
                                            ) : (
                                                colTasks.map(task => (
                                                    <div 
                                                        key={task.id} 
                                                        className="social-content-card"
                                                        onClick={() => handleOpenEditTask(task)}
                                                    >
                                                        {task.artUrl && (
                                                            <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', position: 'relative' }}>
                                                                <img src={task.artUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                {task.eventId && (() => {
                                                                    const ev = eventsList.find(e => e.id === task.eventId);
                                                                    return ev ? (
                                                                        <span style={{
                                                                            position: 'absolute', bottom: '6px', left: '6px',
                                                                            background: 'rgba(0,0,0,0.75)', color: 'var(--se-text)',
                                                                            fontSize: '9.5px', fontWeight: 700, padding: '2px 6px',
                                                                            borderRadius: '4px', backdropFilter: 'blur(4px)'
                                                                        }}>
                                                                            {ev.icon || '🍸'} {ev.name}
                                                                        </span>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        )}

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
                                                                <div className="card-hook-label">Gancho Verbal:</div>
                                                                <div className="card-hook-text">"{task.hookVerbal}"</div>
                                                            </div>
                                                        )}

                                                        <div className="card-meta-row">
                                                            <span className="card-assignee">
                                                                {task.assignee ? task.assignee.split(' ')[0] : 'Filmmaker'}
                                                            </span>
                                                            <span className="card-date">
                                                                {task.publishDate || 'S/F'}
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
                                                                    <FolderGit2 size={14} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}

                                            <button 
                                                onClick={() => handleOpenNewTask({ 
                                                    accountId: activeAccount.id, 
                                                    accountHandler: activeAccount.handler, 
                                                    status: col.id 
                                                })}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: '1px dashed rgba(255,255,255,0.1)',
                                                    background: 'transparent',
                                                    color: 'var(--se-muted)',
                                                    fontSize: '11.5px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Plus size={13} /> Añadir a {col.label.toLowerCase()}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* SUBTAB 2: CALENDARIO DE PUBLICACIONES */}
                    {accountProfileTab === 'calendar' && (
                        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{
                                    padding: '16px 20px',
                                    background: 'var(--se-surface)',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--se-text)' }}>
                                            Calendario Semanal de {activeAccount.handler}
                                        </h3>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--se-muted)' }}>
                                            Programa las publicaciones semanales y Stories clave para esta cuenta.
                                        </p>
                                    </div>
                                    <button 
                                        className="social-btn-primary"
                                        style={{ fontSize: '12px', padding: '6px 14px' }}
                                        onClick={() => handleOpenNewTask({ accountId: activeAccount.id, accountHandler: activeAccount.handler })}
                                    >
                                        <Plus size={14} /> Agendar Publicación
                                    </button>
                                </div>
                                <ContentCalendarGrid 
                                    accounts={[activeAccount]} 
                                    companies={[]}
                                />
                            </div>

                            {/* Upcoming Scheduled Posts List */}
                            <div className="card" style={{ padding: '20px' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: 'var(--se-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} /> Publicaciones Agendadas en Pipeline ({activeAccountTasks.length})
                                </h4>

                                {activeAccountTasks.length === 0 ? (
                                    <p style={{ color: 'var(--se-muted)', fontSize: '13px', margin: 0 }}>
                                        No hay publicaciones agendadas para esta cuenta. Haz clic en "Agendar Publicación" para añadir la primera.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {activeAccountTasks.map(t => {
                                            const col = PIPELINE_COLUMNS.find(c => c.id === (t.status || 'idea')) || PIPELINE_COLUMNS[0];
                                            return (
                                                <div 
                                                    key={t.id}
                                                    onClick={() => handleOpenEditTask(t)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '14px',
                                                        padding: '12px 16px',
                                                        background: 'rgba(255,255,255,0.02)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {t.artUrl && (
                                                            <img src={t.artUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                                                        )}
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--se-text)' }}>{t.title}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--se-muted)', marginTop: '2px' }}>
                                                                {t.publishDate || 'Sin fecha'} {t.publishTime || ''} · {t.format} · {t.pillar}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{
                                                            fontSize: '10.5px',
                                                            fontWeight: 800,
                                                            padding: '3px 9px',
                                                            borderRadius: '5px',
                                                            background: `${col.color}22`,
                                                            color: col.color,
                                                            border: `1px solid ${col.color}44`
                                                        }}>
                                                            {col.label}
                                                        </span>
                                                        <button 
                                                            className="social-btn-secondary" 
                                                            style={{ padding: '5px 10px', fontSize: '11px' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditTask(t);
                                                            }}
                                                        >
                                                            <Edit3 size={12} /> Editar
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUBTAB 3: PARRILLA DE POSTS & FEED */}
                    {accountProfileTab === 'posts' && (
                        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--se-text)' }}>
                                        Parrilla de Posts & Feed ({activeAccountTasks.length} piezas)
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--se-muted)' }}>
                                        Visualización completa de todas las piezas producidas, con ganchos virales, copies listos y estados.
                                    </p>
                                </div>
                                <button 
                                    className="social-btn-primary"
                                    onClick={() => handleOpenNewTask({ accountId: activeAccount.id, accountHandler: activeAccount.handler })}
                                >
                                    <Plus size={14} /> + Planificar Nuevo Post
                                </button>
                            </div>

                            {activeAccountTasks.length === 0 ? (
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px dashed rgba(255,255,255,0.1)',
                                    borderRadius: '14px',
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--se-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--se-muted)' }}>
                                        <Film size={24} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--se-text)', fontWeight: 800 }}>
                                        Aún no hay posts planificados para {activeAccount.handler}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--se-muted)', maxWidth: '480px', lineHeight: 1.5 }}>
                                        Comienza creando el primer Reel, Carrusel o Story con los pilares y ganchos visuales definidos en su ADN.
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                        <button 
                                            className="social-btn-primary"
                                            onClick={() => handleOpenNewTask({ accountId: activeAccount.id, accountHandler: activeAccount.handler })}
                                        >
                                            <Plus size={14} /> + Crear Primer Post
                                        </button>
                                        <button 
                                            className="social-btn-secondary"
                                            onClick={() => setAccountProfileTab('raw')}
                                        >
                                            <Sparkles size={14} /> Generar Ideas con IA
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="account-posts-grid">
                                    {activeAccountTasks.map(task => {
                                        const col = PIPELINE_COLUMNS.find(c => c.id === (task.status || 'idea')) || PIPELINE_COLUMNS[0];
                                        const currentIndex = PIPELINE_COLUMNS.findIndex(c => c.id === (task.status || 'idea'));
                                        const nextCol = PIPELINE_COLUMNS[currentIndex + 1];

                                        const mediaCover = task.artUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=80';

                                        return (
                                            <div 
                                                key={task.id} 
                                                className="account-post-card"
                                                onClick={() => handleOpenEditTask(task)}
                                            >
                                                <div className="account-post-media">
                                                    <img src={mediaCover} alt={task.title} />
                                                    <div className="account-post-badges">
                                                        <span 
                                                            className="account-post-badge-status" 
                                                            style={{ background: `${col.color}cc`, color: 'var(--se-text)' }}
                                                        >
                                                            {col.label}
                                                        </span>
                                                        <span className="account-post-badge-fmt">
                                                            {task.format}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="account-post-body">
                                                    <div className="account-post-pillar">
                                                        {task.pillar || 'General'}
                                                    </div>

                                                    <h4 className="account-post-title">
                                                        {task.title}
                                                    </h4>

                                                    {task.hookVerbal && (
                                                        <div className="account-post-hook-box">
                                                            "{task.hookVerbal}"
                                                        </div>
                                                    )}

                                                    {task.caption && (
                                                        <div className="account-post-caption-box">
                                                            {task.caption}
                                                        </div>
                                                    )}

                                                    <div className="account-post-meta-row">
                                                        <span>{task.assignee ? task.assignee.split(' ')[0] : 'Filmmaker'}</span>
                                                        <span>{task.publishDate || 'Sin fecha'}</span>
                                                    </div>
                                                </div>

                                                <div className="account-post-footer-actions">
                                                    <button 
                                                        className="social-btn-secondary" 
                                                        style={{ fontSize: '11px', padding: '5px 10px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyCaption(task);
                                                        }}
                                                        title="Copiar texto del post y hashtags"
                                                    >
                                                        {copiedCaptionId === task.id ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                                                        {copiedCaptionId === task.id ? '¡Copiado!' : 'Copiar Copy'}
                                                    </button>

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
                                                        <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 800 }}>
                                                            ✓ Publicado
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUBTAB 4: ADN & PILARES DE MARCA */}
                    {accountProfileTab === 'dna' && (() => {
                        const dna = normalizeDna(activeAccount.dna);
                        const palette = dna.palette && dna.palette.length > 0 ? dna.palette : ['#833ab4', '#e1306c', '#fd1d1d', '#fcb045'];
                        const pillars = dna.pillars && dna.pillars.length > 0 ? dna.pillars : DEFAULT_PILLARS;
                        const ctas = dna.ctas && dna.ctas.length > 0 ? dna.ctas : ['Guarda este Reel y etiqueta a alguien especial.', 'Comenta VIP para acceso a listas.'];

                        return (
                            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--se-text)' }}>
                                            ADN de Marca & Pilares Estratégicos
                                        </h3>
                                        <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--se-muted)' }}>
                                            Identidad visual, voz de la marca, paleta de colores y fórmulas de contenido de {activeAccount.handler}.
                                        </p>
                                    </div>
                                    <button 
                                        className="social-btn-primary"
                                        onClick={() => setDnaAccount(activeAccount)}
                                    >
                                        <Dna size={14} /> Editar ADN Completo
                                    </button>
                                </div>

                                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--se-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <BookOpen size={16} /> Línea gráfica y de contenido
                                        </h4>
                                        {activeBrand && (
                                            <a className="social-btn-secondary" href={`/brands/${activeBrand.slug}/`} target="_blank" rel="noreferrer">
                                                <ExternalLink size={13} /> Abrir brandbook
                                            </a>
                                        )}
                                    </div>
                                    {activeBrand
                                        ? <BrandLinePanel brand={activeBrand} avatarSvg={activeAvatarSvg} />
                                        : <div className="raw-empty">Esta cuenta todavía no tiene línea gráfica en <code>brands/</code>.</div>}
                                    {activeBrand && (
                                        <details>
                                            <summary style={{ cursor: 'pointer', fontSize: '12.5px', color: 'var(--se-muted)' }}>Ver brandbook completo aquí</summary>
                                            <iframe className="brandbook-inline" src={`/brands/${activeBrand.slug}/`} title={`Brandbook ${activeBrand.name}`} loading="lazy" />
                                        </details>
                                    )}
                                </div>

                                <div className="account-dna-showcase">
                                    {/* Propuesta de Valor & Tono */}
                                    <div className="account-dna-card">
                                        <div className="account-dna-card-head">
                                            <h4 className="account-dna-card-title">
                                                <Sparkles size={16} /> Propuesta de Valor & Tono
                                            </h4>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--se-text-2)', margin: 0, lineHeight: 1.5 }}>
                                            {dna.voice || activeAccount.description || 'Voz elegante, aspiracional y con alta retención para audiencias exclusivas.'}
                                        </p>
                                        <div style={{ fontSize: '11px', color: 'var(--se-muted)' }}>
                                            <strong>Categoría:</strong> {activeAccount.type}
                                        </div>
                                    </div>

                                    {/* Pilares de Contenido */}
                                    <div className="account-dna-card">
                                        <div className="account-dna-card-head">
                                            <h4 className="account-dna-card-title">
                                                <Layers size={16} /> Pilares de Contenido ({pillars.length})
                                            </h4>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {pillars.map((pil, idx) => (
                                                <span 
                                                    key={idx}
                                                    style={{
                                                        padding: '5px 12px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(96,165,250,0.12)',
                                                        border: '1px solid rgba(96,165,250,0.25)',
                                                        color: '#93c5fd',
                                                        fontSize: '11.5px',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {pil}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Paleta Oficial de Colores */}
                                    <div className="account-dna-card">
                                        <div className="account-dna-card-head">
                                            <h4 className="account-dna-card-title">
                                                <Palette size={16} /> Paleta Oficial (Clic para copiar HEX)
                                            </h4>
                                        </div>
                                        <div className="account-palette-swatches">
                                            {palette.map((col, idx) => (
                                                <button 
                                                    key={idx}
                                                    className="account-palette-swatch"
                                                    onClick={() => handleCopyColor(col)}
                                                    title="Copiar código HEX"
                                                >
                                                    <span className="account-palette-circle" style={{ background: col }} />
                                                    <span>{col}</span>
                                                    {copiedColor === col ? <Check size={11} color="#22c55e" /> : null}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTAs de Alta Conversión */}
                                    <div className="account-dna-card">
                                        <div className="account-dna-card-head">
                                            <h4 className="account-dna-card-title">
                                                <Target size={16} /> Llamados a la Acción (CTAs)
                                            </h4>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {ctas.map((cta, idx) => (
                                                <div 
                                                    key={idx}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        color: 'var(--se-text-2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}
                                                >
                                                    <span>"{cta}"</span>
                                                    <button 
                                                        className="social-btn-secondary" 
                                                        style={{ padding: '3px 7px', fontSize: '10.5px' }}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(cta);
                                                            handleCopyColor(cta);
                                                        }}
                                                    >
                                                        <Copy size={11} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hashtags Oficiales */}
                                    <div className="account-dna-card" style={{ gridColumn: '1 / -1' }}>
                                        <div className="account-dna-card-head">
                                            <h4 className="account-dna-card-title">
                                                <Hash size={16} /> Hashtags Oficiales de la Marca
                                            </h4>
                                            <button 
                                                className="social-btn-secondary"
                                                style={{ fontSize: '11px', padding: '4px 10px' }}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(dna.hashtags || '#arriveagency #panama');
                                                    handleCopyColor('hashtags');
                                                }}
                                            >
                                                <Copy size={12} /> Copiar Hashtags
                                            </button>
                                        </div>
                                        <div style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            fontSize: '12.5px',
                                            color: 'var(--se-accent)',
                                            fontFamily: 'monospace'
                                        }}>
                                            {dna.hashtags || '#arriveagency #panama #cascoantiguo #nightlifepanama'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* SUBTAB: MATERIAL RAW → IDEAS */}
                    {accountProfileTab === 'raw' && (
                        <div className="card animate-in" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: 'var(--se-text)' }}>
                                Material raw de {activeAccount.handler}
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--se-muted)' }}>
                                Clips de Drive clasificados para esta cuenta. La IA propone ideas usando su ADN y sus líneas asignadas; al aprobarlas pasan a Producción.
                            </p>
                            <RawLibrary
                                account={activeAccount}
                                accounts={accounts}
                                onApproveIdea={idea => handleApproveIdea(activeAccount, idea)}
                            />
                        </div>
                    )}

                    {/* SUBTAB: GENERAR CON IA */}
                    {accountProfileTab === 'generate' && (
                        <div className="card animate-in" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: 'var(--se-text)' }}>
                                Generación con IA
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--se-muted)' }}>
                                Imágenes, videos y packs de prompts afinados a la línea de {activeAccount.handler}.
                            </p>
                            <GeneratePanel account={activeAccount} />
                        </div>
                    )}

                    {/* SUBTAB: BIBLIOTECA ASIGNADA */}
                    {accountProfileTab === 'library' && (
                        <div className="animate-in">
                            <ContentLibrary
                                key={activeAccount.id}
                                accounts={accounts}
                                account={activeAccount}
                                onAddTask={addContentTask}
                                onUseHook={handleUseHook}
                            />
                        </div>
                    )}
                </div>
            ) : null}

            {/* ═══════════════════════════════════════════════════════════════════
               MODAL: CONTENT CREATOR & SCRIPT PRO
               ═══════════════════════════════════════════════════════════════════ */}
            {showTaskModal && (
                <div className="social-modal-overlay animate-in" onClick={() => setShowTaskModal(false)}>
                    <div className="social-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="social-modal-header">
                            <div>
                                <h3 className="social-modal-title">
                                    <Film size={20} />
                                    {editingTask ? 'Editar pieza' : 'Nueva pieza'}
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

                                <div className="social-form-row">
                                    <div className="social-field full">
                                        <label>Evento Vinculado</label>
                                        <select 
                                            value={taskFormData.eventId || ''}
                                            onChange={(e) => {
                                                const evId = e.target.value;
                                                const targetEv = eventsList.find(ev => ev.id === evId);
                                                setTaskFormData({
                                                    ...taskFormData,
                                                    eventId: evId,
                                                    shootingLocation: targetEv?.location || taskFormData.shootingLocation
                                                });
                                            }}
                                        >
                                            <option value="">Sin evento específico (General)</option>
                                            {eventsList.map(ev => (
                                                <option key={ev.id} value={ev.id}>
                                                    {ev.icon || '🍸'} {ev.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {taskFormData.eventId && (() => {
                                    const ev = eventsList.find(e => e.id === taskFormData.eventId);
                                    if (!ev) return null;
                                    const artes = getEventArtes(ev);
                                    return (
                                        <div style={{ background: 'var(--se-surface-2)', border: '1px solid var(--se-border)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--se-accent)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Palette size={13} /> ARTES DISPONIBLES DE {ev.name.toUpperCase()} (Clic para vincular portada)
                                                </span>
                                                <button
                                                    type="button"
                                                    className="social-btn-secondary"
                                                    style={{ fontSize: '10.5px', padding: '3px 8px' }}
                                                    onClick={() => handleGenerateAiCopyForEvent(ev)}
                                                >
                                                    <Sparkles size={11} /> Autocompletar con IA
                                                </button>
                                            </div>

                                            <div className="modal-art-picker">
                                                {artes.map(art => {
                                                    const isSelected = taskFormData.artId === art.id || taskFormData.artUrl === art.imageUrl;
                                                    return (
                                                        <div 
                                                            key={art.id} 
                                                            className={`modal-art-thumb-option ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                setTaskFormData({
                                                                    ...taskFormData,
                                                                    artId: art.id,
                                                                    artUrl: art.imageUrl,
                                                                    title: taskFormData.title || `${art.title} — ${ev.name}`
                                                                });
                                                            }}
                                                            title={`Seleccionar "${art.title}"`}
                                                        >
                                                            <img src={art.imageUrl} alt={art.title} />
                                                            <div className="modal-art-thumb-title">{art.title}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {taskFormData.artUrl && (
                                                <div style={{ fontSize: '10.5px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <CheckCircle2 size={12} /> Arte vinculado como portada
                                                    <button
                                                        type="button"
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                                                        onClick={() => setTaskFormData({ ...taskFormData, artId: '', artUrl: '' })}
                                                    >
                                                        (Desvincular)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <BrandLinePanel brand={taskBrand} compact />

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
                                            {taskAccountPillars.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
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
                                <div style={{ background: 'var(--se-surface-2)', border: '1px solid var(--se-border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--se-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={14} /> FÓRMULA DE RETENCIÓN DE 0 A 3 SEGUNDOS
                                    </div>

                                    <div className="social-field full">
                                        <label>Gancho Verbal (Lo que se dice o escucha en los primeros 3 segundos)</label>
                                        <input 
                                            type="text" 
                                            placeholder='Ej: "El peor error que cometen al salir de noche en Panamá..."'
                                            value={taskFormData.hookVerbal}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, hookVerbal: e.target.value })}
                                        />
                                    </div>

                                    <div className="social-field full">
                                        <label>Gancho Visual (Texto en pantalla gigante o toma de acción de apertura)</label>
                                        <input 
                                            type="text" 
                                            placeholder='Ej: Corte ultra rápido a 60fps con audio drop sincronizado de botellas y luces...'
                                            value={taskFormData.hookVisual}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, hookVisual: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>Estructura del Guión & Desglose de Tomas (B-Roll / Argumento)</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Escena 1 (0-3s): Hook visual brindando con copa...&#10;Escena 2 (3-8s): Terraplén al atardecer y cena de chicas...&#10;Escena 3 (8-14s): Furia con bengalas..."
                                        value={taskFormData.scriptBody}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, scriptBody: e.target.value })}
                                    />
                                </div>

                                <div className="social-field full">
                                    <label>Llamado a la Acción (CTA)</label>
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
                                    <label>Link a Google Drive / Dropbox (Archivos 4K & Brutos)</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={taskFormData.assetsDriveUrl}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, assetsDriveUrl: e.target.value })}
                                    />
                                </div>

                                <div className="social-field full">
                                    <label>Copy / Caption Final + Hashtags</label>
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
                                            placeholder="@cuenta"
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
                                        placeholder="https://instagram.com/cuenta"
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

            {/* ═══════════════════════════════════════════════════════════════════
               MODAL: SUBIR / EDITAR ARTE DE EVENTO
               ═══════════════════════════════════════════════════════════════════ */}
            {showArtModal && (
                <div className="social-modal-overlay animate-in" onClick={() => setShowArtModal(false)}>
                    <div className="social-modal-box" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="social-modal-header">
                            <div>
                                <h3 className="social-modal-title">
                                    <Palette size={20} />
                                    {editingArt ? 'Editar Arte / Flyer de Evento' : 'Subir Nuevo Arte / Flyer'}
                                </h3>
                                <p className="social-modal-sub">
                                    Material gráfico oficial vinculado a los eventos y venues de la ciudad.
                                </p>
                            </div>
                            <button className="social-modal-close" onClick={() => setShowArtModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSaveArt}>
                            <div className="social-modal-body">
                                <div className="social-form-row">
                                    <div className="social-field">
                                        <label>Evento Destino</label>
                                        <select 
                                            value={artFormData.eventId}
                                            onChange={(e) => setArtFormData({ ...artFormData, eventId: e.target.value })}
                                            required
                                        >
                                            {eventsList.map(ev => (
                                                <option key={ev.id} value={ev.id}>
                                                    {ev.icon || '🍸'} {ev.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="social-field">
                                        <label>Tipo de Formato</label>
                                        <select 
                                            value={artFormData.type}
                                            onChange={(e) => {
                                                const nextType = e.target.value;
                                                const nextFormat = (nextType === 'Story' || nextType === 'Reel') ? '1080x1920' : '1080x1350';
                                                setArtFormData({ ...artFormData, type: nextType, format: nextFormat });
                                            }}
                                        >
                                            <option value="Post">Post (4:5 / 1:1)</option>
                                            <option value="Story">Story (9:16)</option>
                                            <option value="Reel">Reel Cover (9:16)</option>
                                            <option value="Banner VIP">Banner VIP / Web</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>Título del Arte</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ej: Flyer Oficial Sunset Sessions, Lineup DJs, Promo Botellas..."
                                        value={artFormData.title}
                                        onChange={(e) => setArtFormData({ ...artFormData, title: e.target.value })}
                                    />
                                </div>

                                <div className="social-form-row">
                                    <div className="social-field">
                                        <label>Resolución / Aspect Ratio</label>
                                        <select 
                                            value={artFormData.format}
                                            onChange={(e) => setArtFormData({ ...artFormData, format: e.target.value })}
                                        >
                                            <option value="1080x1350">1080x1350 (Post Retrato 4:5)</option>
                                            <option value="1080x1920">1080x1920 (Story / Reel 9:16)</option>
                                            <option value="1080x1080">1080x1080 (Post Cuadrado 1:1)</option>
                                            <option value="1920x1080">1920x1080 (Banner Panorámico 16:9)</option>
                                        </select>
                                    </div>

                                    <div className="social-field">
                                        <label>Estado de Aprobación</label>
                                        <select 
                                            value={artFormData.status}
                                            onChange={(e) => setArtFormData({ ...artFormData, status: e.target.value })}
                                        >
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Revisión">En Revisión</option>
                                            <option value="Aprobado">Aprobado</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="social-field full">
                                    <label>URL de la Imagen / Flyer</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://images.unsplash.com/... o URL directa de la imagen"
                                        value={artFormData.imageUrl}
                                        onChange={(e) => setArtFormData({ ...artFormData, imageUrl: e.target.value })}
                                    />
                                    {/* Presets rápidos */}
                                    <div className="art-preset-chips">
                                        <span style={{ fontSize: '10.5px', color: 'var(--se-muted)', alignSelf: 'center', fontWeight: 600 }}>Presets HD:</span>
                                        {ART_PRESETS.map((preset, idx) => (
                                            <button 
                                                key={idx}
                                                type="button"
                                                className="art-preset-chip"
                                                onClick={() => setArtFormData({ ...artFormData, imageUrl: preset.url })}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {artFormData.imageUrl && (
                                    <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000' }}>
                                        <img src={artFormData.imageUrl} alt="Vista previa del arte" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}

                                <div className="social-field full">
                                    <label>Descripción / Indicaciones para el Copy</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="Indicaciones para el diseñador gráfico o texto sugerido para la publicación..."
                                        value={artFormData.description}
                                        onChange={(e) => setArtFormData({ ...artFormData, description: e.target.value })}
                                    />
                                </div>

                                <div className="social-field full">
                                    <label>Referencias Visuales (Drive / Pinterest / Figma)</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://drive.google.com/drive/... o https://pinterest.com/..."
                                        value={artFormData.references}
                                        onChange={(e) => setArtFormData({ ...artFormData, references: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="social-modal-footer">
                                {editingArt ? (
                                    <button 
                                        type="button" 
                                        className="social-btn-secondary" 
                                        style={{ color: '#ef4444' }}
                                        onClick={() => handleDeleteArt(artFormData.eventId, editingArt.id, editingArt.title)}
                                    >
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                ) : <div />}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        type="button" 
                                        className="social-btn-secondary" 
                                        onClick={() => setShowArtModal(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="social-btn-primary"
                                    >
                                        {editingArt ? 'Guardar Cambios' : 'Subir Arte'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {dnaAccount && (
                <AccountDnaEditor
                    account={dnaAccount}
                    onSave={handleSaveDna}
                    onClose={() => setDnaAccount(null)}
                />
            )}
        </div>
    );
}
