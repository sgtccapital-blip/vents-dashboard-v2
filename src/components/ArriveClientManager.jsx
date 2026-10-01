import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Building2, Plus, Sparkles, Instagram, Globe, ExternalLink,
    Check, Trash2, Edit3, Share2, FolderGit2, Lightbulb,
    FileText, CheckSquare, Palette, Brain, Layers, Clock,
    DollarSign, ArrowUpRight, Copy, Users, ChevronRight,
    Send, AlertCircle, Bookmark, Zap, Filter, Search, Award,
    UploadCloud, FileUp, RefreshCw, MessageSquare, CheckCircle2,
    Sliders, Download, BookOpen, MessageCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import OpenClawBrainService, { OPENCLAW_MODES } from '../services/OpenClawBrainService';

// ─── Initial Comprehensive Seed Clients ───
const DEFAULT_CLIENTS_DATA = [
    {
        id: 'client-terraplen',
        name: 'Terraplén Rooftop',
        industry: 'Gastronomía & Rooftop',
        status: 'Retainer Activo',
        fee: '$3,200/mes',
        lead: 'GG',
        color: '#fbbf24',
        contactName: 'Carlos Mendonça (Gerente)',
        contactPhone: '50762110022',
        website: 'https://terraplenpanama.com',
        instagram: '@terraplenrooftop',
        slogan: 'El atardecer se ve y se vive mejor en el Casco',
        description: 'Rooftop bar & restaurante de alta coctelería con vista 360° al Casco Antiguo y el océano. Sede semanal de cenas de chicas ARRIVE los jueves.',
        brand: {
            primaryColor: '#fbbf24',
            secondaryColor: '#1e1b12',
            accentColor: '#f59e0b',
            headingFont: 'Outfit, sans-serif',
            bodyFont: 'Inter, sans-serif',
            toneOfVoice: 'Seductor, sofisticado, cálido, enfocado en atardeceres y alta coctelería de autor.',
            brandGuidelinesUrl: 'https://drive.google.com/drive/folders/terraplen-brand',
            figmaUrl: 'https://figma.com/@arrive/terraplen',
            assetsDriveUrl: 'https://drive.google.com/drive/folders/terraplen-raw-assets',
            dos: 'Usar tomas de golden hour, música afro-house suave, mostrar cócteles artesanales y grupos de amigas disfrutando.',
            donts: 'No usar música urbana pesada en piezas de atardecer, evitar luces planas o videos con audio distorsionado.'
        },
        social: {
            instagram: '@terraplenrooftop',
            tiktok: '@terraplen.casco',
            frequency: '4 Reels 4K + 2 Carruseles semanales + Stories diarias',
            feedStyle: 'Golden Hour Luxury, cocteles en primer plano, ambiente cosmopolita'
        },
        posts: [
            {
                id: 'p-ter-1',
                format: 'Reel 9:16',
                title: 'Golden Sunset & Signature Mixology',
                hook: 'El mejor spot de Panamá para ver cómo el cielo se tiñe de dorado 🍸',
                caption: 'Jueves de acústico y cócteles de autor. Reserva tu mesa en terraza.',
                date: '2026-10-02',
                status: 'Listo para Publicar'
            },
            {
                id: 'p-ter-2',
                format: 'Carrusel HD',
                title: 'Menú Degustación de Tapas de Mar',
                hook: '3 platos que tienes que probar sí o sí en tu próxima visita',
                caption: 'Desde nuestro ceviche de corvina al maracuyá hasta las croquetas de pulpo.',
                date: '2026-10-04',
                status: 'En Edición'
            },
            {
                id: 'p-ter-3',
                format: 'TikTok / UGC',
                title: 'POV: Cena de chicas de los jueves en Terraplén',
                hook: 'Cuando dices que solo vas por una copa y terminas viviendo la mejor noche',
                caption: 'Cenas de anfitrionas con ARRIVE Models cada jueves desde las 8:30 PM.',
                date: '2026-10-05',
                status: 'En Guión'
            }
        ],
        links: [
            { id: 'l1', title: 'Carpeta Google Drive (Fotos 4K)', url: 'https://drive.google.com', category: 'Drive / Assets' },
            { id: 'l2', title: 'Tablero Figma (Piezas Redes)', url: 'https://figma.com', category: 'Figma / Diseño' },
            { id: 'l3', title: 'Web Oficial & Reservas', url: 'https://terraplenpanama.com', category: 'Web Oficial' },
            { id: 'l4', title: 'Dashboard Meta Ads & Métricas', url: 'https://business.facebook.com', category: 'Métricas / Ads' }
        ],
        portfolio: [
            {
                id: 'port-1',
                title: 'Campaña Sunset Sessions Verano',
                category: 'Campaña Viral & Content Day',
                description: 'Producción de 8 Reels cinemáticos con modelos ARRIVE y cobertura del sunset en Casco Antiguo.',
                metrics: '+280,000 Views orgánicas · 3,400 Compartidos · Reservas al 100% los jueves'
            },
            {
                id: 'port-2',
                title: 'Rediseño Carta de Cócteles Digital',
                category: 'Branding & Menú Interactivo',
                description: 'Diseño visual y códigos QR interactivos con fotos y descripción sensorial de cada cóctel de autor.',
                metrics: '+45% aumento en venta de cócteles insignia'
            }
        ],
        ideas: [
            {
                id: 'id-1',
                title: 'Trend de TikTok "El secreto de Casco Antiguo"',
                type: 'Trend / Audio Viral',
                hook: 'El lugar que los locales no quieren que los turistas descubran',
                status: 'Aprobada para Producción'
            },
            {
                id: 'id-2',
                title: 'Content Day exclusivo con 10 Embajadoras ARRIVE',
                type: 'Activación con Modelos ARRIVE',
                hook: 'Noche de maridaje de autor y fotos profesionales para el feed de las chicas',
                status: 'En Evaluación'
            }
        ],
        subProjects: [
            {
                id: 'sub-1',
                title: 'Lanzamiento Terraza Sunset Q4 2026',
                status: 'En Marcha',
                progress: 75,
                budget: '$4,000',
                deadline: '2026-10-20',
                description: 'Renovación de cabina DJ, nueva iluminación dorada y menú degustación para la temporada alta.'
            },
            {
                id: 'sub-2',
                title: 'Campaña de Halloween & Día de Muertos Casco',
                status: 'Planificación',
                progress: 30,
                budget: '$2,500',
                deadline: '2026-10-31',
                description: 'Ambientación nocturna misteriosa, coctel edición especial humo negro y DJs internacionales.'
            }
        ],
        proposals: [
            {
                id: 'prop-1',
                title: 'Renovación Retainer Anual 2027 (Creative + Nightlife)',
                feeMonthly: '$3,500/mes',
                scope: 'Manejo integral de Instagram & TikTok + 4 Reels/semana + 4 Cenas de Chicas mensuales + Pauta Meta Ads',
                status: 'Enviada al Cliente',
                sentDate: '2026-09-25'
            }
        ],
        rag: {
            overview: 'Terraplén Rooftop es un rooftop de lujo en Casco Antiguo / Santa Ana, Panamá. Combina gastronomía marina fusión, coctelería premiada y música electrónica y afro-house de atardecer. Clientes de nivel adquisitivo medio-alto y extranjeros.',
            targetAudience: 'Mujeres y hombres de 24 a 42 años, profesionales, amantes de la buena mesa, cócteles de autor, eventos estéticos y fotografías para redes.',
            coreValues: 'Exclusividad accesible, calidez latina, atardeceres mágicos, hospitalidad boutique y experiencias memorables.',
            competitors: 'Selina Rooftop, Tantalo, CasaCasco, Salvaje Casco.',
            faqPrompt: 'Reservas: a través de WhatsApp o link en bio de OpenTable. Horario: Jueves a Domingo desde las 5:00 PM. Dress code: Smart Casual cosmopolita (no camisetas sin mangas ni chancletas).',
            knowledgeNotes: 'Las cenas de chicas ARRIVE se celebran los jueves a las 8:30 PM. Menú degustación cortesía a cambio de menciones y contenido en stories de Instagram.',
            aiRulePrompt: 'Siempre mantén un tono elegante y sofisticado. Jamás utilices slang callejero ni expresiones baratas. Destaca las vistas del Casco y el atardecer dorado de Panamá.'
        }
    },
    {
        id: 'client-furia',
        name: 'Furia Panamá',
        industry: 'Dinner Party & Nightlife',
        status: 'Retainer Activo',
        fee: '$4,500/mes',
        lead: 'JOSHUA',
        color: '#ec4899',
        contactName: 'Ricardo V. (Socio Operativo)',
        contactPhone: '50763991144',
        website: 'https://furiapanama.com',
        instagram: '@furiapanama',
        slogan: 'Donde la alta cocina desata la noche más intensa',
        description: 'Dinner show & club de alta energía en Calle 50 / Obarrio. Mezcla cena con shows de bengalas, espectáculos en vivo y fiesta VIP hasta altas horas.',
        brand: {
            primaryColor: '#ec4899',
            secondaryColor: '#120d18',
            accentColor: '#a855f7',
            headingFont: 'Outfit, sans-serif',
            bodyFont: 'Inter, sans-serif',
            toneOfVoice: 'Enérgico, atrevido, vibrante, festivo, sexy y de alta gama.',
            brandGuidelinesUrl: 'https://drive.google.com/drive/folders/furia-brand',
            figmaUrl: 'https://figma.com/@arrive/furia',
            assetsDriveUrl: 'https://drive.google.com/drive/folders/furia-videos',
            dos: 'Tomas rápidas, show de botellas con bengalas, chicas guapas bailando, DJs tocando hits y mesas VIP llenas.',
            donts: 'No publicar tomas oscuras o vacías, no usar música aburrida ni tipografías corporativas serias.'
        },
        social: {
            instagram: '@furiapanama',
            tiktok: '@furiaclub',
            frequency: '5 Reels de alta energía + Stories cada noche de apertura',
            feedStyle: 'Dark Neon Glam, bottle show, alta energía nocturna'
        },
        posts: [
            {
                id: 'p-fur-1',
                format: 'Reel Viral',
                title: 'Viernes de Furia: Bottle Parade & Dinner Show',
                hook: 'La única cena de Panamá donde nadie se queda sentado 🔥',
                caption: 'Calle 50 se enciende este viernes. Reserva tu mesa VIP antes de que hagamos Sold Out.',
                date: '2026-10-03',
                status: 'Listo para Publicar'
            },
            {
                id: 'p-fur-2',
                format: 'Story Seq',
                title: 'Behind the Scenes: Preparativos del Show de Medianoche',
                hook: 'Lo que pasa tras bambalinas antes de que explote la noche',
                caption: 'Bailarines, botellas Dom Pérignon y los mejores DJs de la ciudad.',
                date: '2026-10-04',
                status: 'En Guión'
            }
        ],
        links: [
            { id: 'l5', title: 'Google Drive Producción Reels 4K', url: 'https://drive.google.com', category: 'Drive / Assets' },
            { id: 'l6', title: 'Portal de Reservas VIP & Botellas', url: 'https://furiapanama.com/vip', category: 'Web Oficial' }
        ],
        portfolio: [
            {
                id: 'port-3',
                title: 'Lanzamiento Temporada Viernes Dinner Show',
                category: 'Campaña Viral',
                description: 'Estrategia de Reels de alto impacto con modelos ARRIVE en la mesa central y cobertura del bottle show.',
                metrics: '+390,000 Views acumuladas · 100% de ocupación en mesas VIP de viernes a sábado'
            }
        ],
        ideas: [
            {
                id: 'id-3',
                title: 'Furia Midnight Confession Booth',
                type: 'Activación VIP',
                hook: 'Cabina de video corta donde las chicas confiesan su pecado de la noche',
                status: 'Aprobada para Producción'
            }
        ],
        subProjects: [
            {
                id: 'sub-3',
                title: 'Halloween Furia Horror Carnival 2026',
                status: 'En Marcha',
                progress: 60,
                budget: '$6,000',
                deadline: '2026-10-31',
                description: 'El evento temático más grande de Calle 50 con $3,000 en premios a los mejores disfraces y DJs invitados.'
            }
        ],
        proposals: [
            {
                id: 'prop-2',
                title: 'Paquete Expansión Redes + Hostesses Exclusivas ARRIVE',
                feeMonthly: '$5,200/mes',
                scope: '6 Reels/semana + Cobertura en vivo de 2 noches semanales + Roster fijo de 8 modelos ARRIVE por noche',
                status: 'Aprobada / Firmada',
                sentDate: '2026-09-15'
            }
        ],
        rag: {
            overview: 'Furia es el principal Dinner Show & Nightclub de Panamá en Calle 50. Ofrece cortes de carne premium, sushi fusión y a partir de las 11:00 PM se convierte en una fiesta total con botella y DJs.',
            targetAudience: 'Hombres y mujeres de 22 a 45 años con alto poder adquisitivo, amantes de la vida nocturna, botellas VIP y celebraciones de cumpleaños de alto perfil.',
            coreValues: 'Adrenalina, fiesta premium, celebración sin límites, hospitalidad de élite.',
            competitors: 'Marquee, La Buat, Chill Out, Banger.',
            faqPrompt: 'Dress code: Muy estricto (High Glamour, camisas, tacones o calzado elegante). Reservas de mesa requieren consumo mínimo en botellas los fines de semana.',
            knowledgeNotes: 'Cena de chicas ARRIVE los viernes a las 9:00 PM en mesa VIP principal con botella de champaña de cortesía.',
            aiRulePrompt: 'El tono debe ser eléctrico, sensual, fiestero y descaradamente lujoso. Utiliza palabras de acción como "estalla", "furia", "desata", "exclusivo" y "sold out".'
        }
    },
    {
        id: 'client-pianobar',
        name: 'Piano Bar Casco',
        industry: 'Speakeasy & Coctelería',
        status: 'Retainer Activo',
        fee: '$2,800/mes',
        lead: 'MARIO',
        color: '#c084fc',
        contactName: 'Guillermo F. (Propietario)',
        contactPhone: '50767882233',
        website: 'https://pianobarcasco.com',
        instagram: '@pianobarcasco',
        slogan: 'Donde la noche susurra historias de piano y jazz',
        description: 'Bar íntimo y speakeasy en el corazón del Casco Antiguo. Piano de cola en directo, ambiente oscuro y seductor, cócteles clásicos y clientela selecta.',
        brand: {
            primaryColor: '#c084fc',
            secondaryColor: '#100b18',
            accentColor: '#fbbf24',
            headingFont: 'Outfit, sans-serif',
            bodyFont: 'Inter, sans-serif',
            toneOfVoice: 'Misterioso, elegante, bohemio chic, intelectual y seductor.',
            brandGuidelinesUrl: 'https://drive.google.com/drive/folders/pianobar-brand',
            figmaUrl: 'https://figma.com/@arrive/pianobar',
            assetsDriveUrl: 'https://drive.google.com/drive/folders/pianobar-audio',
            dos: 'Iluminación tenue con velas, primeros planos del pianista, copas talladas con hielo cristalino y susurros.',
            donts: 'No usar luces estridentes, música electrónica rápida ni tipografías modernas demasiado chillonas.'
        },
        social: {
            instagram: '@pianobarcasco',
            tiktok: '@pianobar.speakeasy',
            frequency: '3 Reels de atmósfera cinematográfica + Stories semanales',
            feedStyle: 'Film Noir, luces cálidas de vela, primeros planos sensoriales'
        },
        posts: [
            {
                id: 'p-pia-1',
                format: 'Reel 9:16',
                title: 'Midnight Jazz & Old Fashioned',
                hook: 'El bar secreto que parece salido de Nueva York en los años 40 🎹',
                caption: 'Música en vivo cada sábado desde las 9:30 PM. Pide tu cóctel en la barra.',
                date: '2026-10-04',
                status: 'Listo para Publicar'
            }
        ],
        links: [
            { id: 'l7', title: 'Drive Fotos y Videos Cinematográficos', url: 'https://drive.google.com', category: 'Drive / Assets' },
            { id: 'l8', title: 'Menú Digital de Coctelería de Autor', url: 'https://pianobarcasco.com/menu', category: 'Web Oficial' }
        ],
        portfolio: [
            {
                id: 'port-4',
                title: 'Relanzamiento Speakeasy "Secret Keys"',
                category: 'Branding & Video Reel',
                description: 'Pieza cinematográfica grabada en lente anamórfica con modelo ARRIVE descubriendo la puerta secreta tras la biblioteca.',
                metrics: '+195,000 Views orgánicas · Aumento de 60% en reservas de parejas los sábados'
            }
        ],
        ideas: [
            {
                id: 'id-4',
                title: 'Noches de Boleros & Gin Tonic Premium',
                type: 'Campaña Estacional',
                hook: 'Reviviendo los clásicos de la música latina con un giro moderno',
                status: 'En Evaluación'
            }
        ],
        subProjects: [
            {
                id: 'sub-4',
                title: 'Grabación de Sesiones Acústicas en Vivo',
                status: 'En Marcha',
                progress: 40,
                budget: '$1,800',
                deadline: '2026-10-25',
                description: 'Grabación de 4 canciones en video multicámara para YouTube y Reels con cantantes invitados.'
            }
        ],
        proposals: [
            {
                id: 'prop-3',
                title: 'Contrato Retainer 2026-2027',
                feeMonthly: '$2,800/mes',
                scope: 'Dirección de arte, 3 videos cinematográficos por semana, relaciones públicas con influencers culturales.',
                status: 'Aprobada / Firmada',
                sentDate: '2026-08-30'
            }
        ],
        rag: {
            overview: 'Piano Bar Casco es un speakeasy subterráneo de música en vivo y coctelería clásica en Casco Antiguo, Panamá. Ambiente discreto, elegante e íntimo.',
            targetAudience: 'Parejas, amantes del jazz, turistas culturales, extranjeros y amantes de cócteles clásicos de 28 a 55 años.',
            coreValues: 'Nostalgia refinada, música acústica sin artificios, calidez y discreción absoluta.',
            competitors: 'La Cava, Pedro Mandinga, Strangers Club.',
            faqPrompt: 'Entrada por reservación previa. Horario: Miércoles a Sábado de 7:00 PM a 2:00 AM.',
            knowledgeNotes: 'Cenas de chicas ARRIVE los sábados a las 9:30 PM en el salón terciopelo.',
            aiRulePrompt: 'El estilo debe ser literario, poético y sugerente. Habla de acordes, sombras, madera noble y copas de cristal cortado.'
        }
    }
];

export default function ArriveClientManager() {
    const { projects, addProject, updateProject, deleteProject, tasks, addTask, toggleTask, addActivity } = useApp();

    // ─── Local Clients State synced with Projects ───
    const [clientsList, setClientsList] = useState(() => {
        try {
            const saved = localStorage.getItem('arrive_agency_clients_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error loading stored clients', e);
        }
        return DEFAULT_CLIENTS_DATA;
    });

    // Currently Selected Client ID
    const [selectedClientId, setSelectedClientId] = useState(() => {
        return clientsList[0]?.id || 'client-terraplen';
    });

    // Active sub-tab inside client view
    const [clientSubTab, setClientSubTab] = useState('brand');

    // Search and filter
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustryFilter, setSelectedIndustryFilter] = useState('all');

    // Modal state for "+ Nuevo Cliente"
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientIndustry, setNewClientIndustry] = useState('Gastronomía & Restaurante');
    const [newClientStatus, setNewClientStatus] = useState('Retainer Activo');
    const [newClientFee, setNewClientFee] = useState('$3,000/mes');
    const [newClientLead, setNewClientLead] = useState('GG');
    const [newClientColor, setNewClientColor] = useState('#fbbf24');
    const [newClientInstagram, setNewClientInstagram] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientSlogan, setNewClientSlogan] = useState('');
    const [newClientDesc, setNewClientDesc] = useState('');

    // Quick Add Forms local states
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostFormat, setNewPostFormat] = useState('Reel 9:16');
    const [newPostHook, setNewPostHook] = useState('');
    const [newPostDate, setNewPostDate] = useState('2026-10-06');

    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState('GG');
    const [newTaskPriority, setNewTaskPriority] = useState('high');
    const [newTaskDue, setNewTaskDue] = useState('2026-10-06');

    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkCat, setNewLinkCat] = useState('Drive / Assets');

    const [newPortTitle, setNewPortTitle] = useState('');
    const [newPortCat, setNewPortCat] = useState('Campaña Viral');
    const [newPortDesc, setNewPortDesc] = useState('');
    const [newPortMetrics, setNewPortMetrics] = useState('');

    const [newIdeaTitle, setNewIdeaTitle] = useState('');
    const [newIdeaType, setNewIdeaType] = useState('Trend / Audio');
    const [newIdeaHook, setNewIdeaHook] = useState('');

    const [newSubTitle, setNewSubTitle] = useState('');
    const [newSubBudget, setNewSubBudget] = useState('$2,000');
    const [newSubDeadline, setNewSubDeadline] = useState('2026-10-31');
    const [newSubDesc, setNewSubDesc] = useState('');

    const [newPropTitle, setNewPropTitle] = useState('');
    const [newPropFee, setNewPropFee] = useState('$3,500/mes');
    const [newPropScope, setNewPropScope] = useState('Social Media + 3 Reels/semana + Cenas Chicas');

    // ─── RAG & AI Agent Studio States ───
    const [ragSubMode, setRagSubMode] = useState('upload_files'); // 'upload_files' | 'edit_pillars' | 'quick_notes' | 'ai_studio'
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [ragDocsList, setRagDocsList] = useState([]);
    const [loadingRagDocs, setLoadingRagDocs] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [fileUploadStatus, setFileUploadStatus] = useState(null);
    const fileInputRef = useRef(null);

    // Quick Note RAG State
    const [quickNoteTitle, setQuickNoteTitle] = useState('');
    const [quickNoteContent, setQuickNoteContent] = useState('');
    const [indexingNote, setIndexingNote] = useState(false);
    const [ragSyncSuccess, setRagSyncSuccess] = useState(false);

    // Editable RAG Pillars Local State
    const [editOverview, setEditOverview] = useState('');
    const [editAudience, setEditAudience] = useState('');
    const [editPillars, setEditPillars] = useState('');
    const [editNoGos, setEditNoGos] = useState('');
    const [editCompetitors, setEditCompetitors] = useState('');
    const [editFaqs, setEditFaqs] = useState('');

    // RAG AI Agent Generator State
    const [ragPromptResult, setRagPromptResult] = useState('');
    const [isGeneratingRag, setIsGeneratingRag] = useState(false);
    const [copiedRag, setCopiedRag] = useState(false);
    const [customAiPrompt, setCustomAiPrompt] = useState('');
    const [agentMode, setAgentMode] = useState('ejecutivo');

    // Save helper to persist clients
    const persistClients = (updatedList) => {
        setClientsList(updatedList);
        try {
            localStorage.setItem('arrive_agency_clients_v2', JSON.stringify(updatedList));
        } catch (e) {
            console.error('Error saving clients', e);
        }
    };

    // Selected client object
    const activeClient = useMemo(() => {
        return clientsList.find(c => c.id === selectedClientId) || clientsList[0] || null;
    }, [clientsList, selectedClientId]);

    // Synchronize RAG inputs when active client changes
    useEffect(() => {
        if (activeClient) {
            setEditOverview(activeClient.rag?.overview || '');
            setEditAudience(activeClient.rag?.targetAudience || '');
            setEditPillars(activeClient.rag?.knowledgeNotes || '');
            setEditNoGos(activeClient.rag?.aiRulePrompt || '');
            setEditCompetitors(activeClient.rag?.competitors || '');
            setEditFaqs(activeClient.rag?.faqPrompt || '');
            setRagPromptResult('');
            setFileUploadStatus(null);
            fetchRagDocs(activeClient.id);
        }
    }, [selectedClientId]);

    // Fetch RAG documents for this client namespace
    const fetchRagDocs = async (clientId) => {
        const targetId = clientId || activeClient?.id;
        if (!targetId) return;
        setLoadingRagDocs(true);
        try {
            const res = await fetch(`/api/rag/${targetId}`, { credentials: 'include' });
            if (res.ok) {
                const docs = await res.json();
                setRagDocsList(Array.isArray(docs) ? docs : []);
            }
        } catch (e) {
            console.warn('[ArriveClientManager] No se pudo cargar lista RAG:', e);
        } finally {
            setLoadingRagDocs(false);
        }
    };

    // Filtered clients list
    const filteredClients = useMemo(() => {
        return clientsList.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (c.instagram && c.instagram.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesIndustry = selectedIndustryFilter === 'all' || c.industry === selectedIndustryFilter;
            return matchesSearch && matchesIndustry;
        });
    }, [clientsList, searchQuery, selectedIndustryFilter]);

    // Tasks for active client
    const clientTasks = useMemo(() => {
        if (!activeClient) return [];
        return (tasks || []).filter(t => t.projectId === activeClient.id || t.projectName === activeClient.name);
    }, [tasks, activeClient]);

    // Handle Create Client
    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        const newId = `client-${Date.now()}`;
        const newClientObj = {
            id: newId,
            name: newClientName.trim(),
            industry: newClientIndustry,
            status: newClientStatus,
            fee: newClientFee,
            lead: newClientLead,
            color: newClientColor,
            contactName: '',
            contactPhone: newClientPhone.replace(/[^0-9]/g, ''),
            website: '',
            instagram: newClientInstagram.startsWith('@') ? newClientInstagram : `@${newClientInstagram}`,
            slogan: newClientSlogan.trim() || 'Marca gestionada por ARRIVE Agency',
            description: newClientDesc.trim() || `Proyecto integral de ${newClientIndustry} en Panamá.`,
            brand: {
                primaryColor: newClientColor,
                secondaryColor: '#12121c',
                accentColor: '#fbbf24',
                headingFont: 'Outfit, sans-serif',
                bodyFont: 'Inter, sans-serif',
                toneOfVoice: 'Profesional, estético, cautivador y de alto valor percibido.',
                brandGuidelinesUrl: '',
                figmaUrl: '',
                assetsDriveUrl: '',
                dos: 'Cuidar la estética visual, fotos de alta resolución, mantener el tono de marca.',
                donts: 'No publicar artes pixelados ni copies con faltas gramaticales.'
            },
            social: {
                instagram: newClientInstagram.startsWith('@') ? newClientInstagram : `@${newClientInstagram}`,
                tiktok: '',
                frequency: '3 Reels + 2 Carruseles semanales',
                feedStyle: 'Lujo contemporáneo, paleta armonizada'
            },
            posts: [],
            links: [],
            portfolio: [],
            ideas: [],
            subProjects: [],
            proposals: [],
            rag: {
                overview: `${newClientName} es un cliente del sector ${newClientIndustry} gestionado por ARRIVE Agency en Panamá.`,
                targetAudience: 'Público selecto, jóvenes profesionales y clientes de nivel medio-alto.',
                coreValues: 'Calidad, innovación, estética visual y excelencia en el servicio.',
                competitors: 'Marcas líderes del sector.',
                faqPrompt: 'Atención personalizada vía WhatsApp o reserva directa.',
                knowledgeNotes: 'Cliente de ARRIVE Agency con contrato de retainer.',
                aiRulePrompt: `Genera textos persuasivos con tono acorde a ${newClientIndustry}. Resalta exclusividad y sofisticación.`
            }
        };

        const updated = [newClientObj, ...clientsList];
        persistClients(updated);

        // Also add to global projects
        if (addProject) {
            await addProject({
                id: newId,
                name: newClientName.trim(),
                agency: 'arrive',
                isClient: true,
                category: 'client',
                status: 'active',
                leadAgent: newClientLead,
                budget: newClientFee,
                tags: ['ARRIVE Client', newClientIndustry, 'Retainer']
            });
        }

        if (addActivity) {
            addActivity(`🌟 Nuevo Cliente dado de alta en ARRIVE Agency: "${newClientName}" (${newClientFee})`, newClientColor);
        }

        setSelectedClientId(newId);
        setIsAddClientModalOpen(false);
        setNewClientName('');
        setNewClientSlogan('');
        setNewClientDesc('');
        setNewClientInstagram('');
        setNewClientPhone('');
    };

    // Delete Client
    const handleDeleteClient = (clientId) => {
        if (!window.confirm('¿Seguro que deseas eliminar este cliente de ARRIVE Agency?')) return;
        const updated = clientsList.filter(c => c.id !== clientId);
        persistClients(updated);
        if (deleteProject) {
            deleteProject(clientId);
        }
        if (updated.length > 0) {
            setSelectedClientId(updated[0].id);
        }
    };

    // Update Client Fields Helper
    const updateActiveClientData = (updater) => {
        if (!activeClient) return;
        const updatedClients = clientsList.map(c => {
            if (c.id === activeClient.id) {
                return updater(c);
            }
            return c;
        });
        persistClients(updatedClients);
        if (updateProject) {
            updateProject(activeClient.id, { ...activeClient, ...updater(activeClient) });
        }
    };

    // Save RAG Pillars to client and synchronize with backend RAG
    const handleSaveRagPillars = async (e) => {
        if (e) e.preventDefault();
        if (!activeClient) return;

        const updatedRag = {
            overview: editOverview,
            targetAudience: editAudience,
            knowledgeNotes: editPillars,
            aiRulePrompt: editNoGos,
            competitors: editCompetitors,
            faqPrompt: editFaqs
        };

        updateActiveClientData(c => ({
            ...c,
            rag: updatedRag
        }));

        // Send consolidated RAG doc to backend namespace
        try {
            const fullDocText = `[MANUAL DE MARCA Y REGLAS RAG - ${activeClient.name.toUpperCase()}]:
- Resumen y Propuesta: ${editOverview}
- Público Objetivo: ${editAudience}
- Pilares de Contenido: ${editPillars}
- Reglas Estrictas / Prohibiciones (No-Go's): ${editNoGos}
- Competidores & Mercado: ${editCompetitors}
- FAQs y Atención Oficial: ${editFaqs}`;

            await fetch(`/api/rag/${activeClient.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: `rag-pillars-${activeClient.id}`,
                    title: `Pilares Oficiales y Reglas de Marca — ${activeClient.name}`,
                    content: fullDocText,
                    category: 'brand_rules'
                })
            });

            setRagSyncSuccess(true);
            setTimeout(() => setRagSyncSuccess(false), 3000);
            fetchRagDocs(activeClient.id);

            if (addActivity) {
                addActivity(`🧠 Memoria RAG sincronizada con OpenClaw para "${activeClient.name}"`, '#c084fc');
            }
        } catch (err) {
            console.error('Error sincronizando RAG con backend:', err);
        }
    };

    // Upload Document (PDF, TXT, MD, CSV, JSON) to Client RAG
    const processUploadedFile = async (file) => {
        if (!file || !activeClient) return;

        setIsUploadingFile(true);
        setFileUploadStatus(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('namespace', activeClient.id);
        formData.append('category', 'client_document');
        formData.append('title', file.name);

        try {
            const res = await fetch('/api/brain/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                setFileUploadStatus({ success: true, message: `✅ Archivo "${file.name}" indexado exitosamente en el RAG de ${activeClient.name}!` });
                fetchRagDocs(activeClient.id);
                if (addActivity) {
                    addActivity(`📄 Archivo "${file.name}" subido e indexado en RAG para ${activeClient.name}`, '#10b981');
                }
            } else {
                const err = await res.json().catch(() => ({}));
                setFileUploadStatus({ success: false, message: `⚠️ Error al indexar archivo: ${err.error || res.statusText}` });
            }
        } catch (err) {
            setFileUploadStatus({ success: false, message: `⚠️ Error de conexión: ${err.message}` });
        } finally {
            setIsUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) processUploadedFile(file);
    };

    const handleDropFile = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) processUploadedFile(file);
    };

    // Index Quick Note to RAG
    const handleIndexQuickNote = async (e) => {
        e.preventDefault();
        if (!quickNoteContent.trim() || !activeClient) return;

        setIndexingNote(true);
        try {
            const title = quickNoteTitle.trim() || `Nota de Inteligencia (${new Date().toLocaleDateString()})`;
            const res = await fetch(`/api/rag/${activeClient.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content: quickNoteContent.trim(),
                    category: 'meeting_notes'
                })
            });

            if (res.ok) {
                setQuickNoteTitle('');
                setQuickNoteContent('');
                fetchRagDocs(activeClient.id);
                setFileUploadStatus({ success: true, message: `✅ Nota "${title}" añadida a la memoria RAG de ${activeClient.name}!` });
                if (addActivity) {
                    addActivity(`💡 Fragmento RAG indexado para ${activeClient.name}: "${title}"`, '#c084fc');
                }
            }
        } catch (e) {
            console.error('Error indexando nota rápida:', e);
        } finally {
            setIndexingNote(false);
        }
    };

    // Delete a RAG Document
    const handleDeleteRagDoc = async (docId) => {
        if (!activeClient) return;
        if (!window.confirm('¿Seguro que deseas eliminar este documento del RAG?')) return;
        try {
            await fetch(`/api/rag/${activeClient.id}/${docId}`, { method: 'DELETE', credentials: 'include' });
            fetchRagDocs(activeClient.id);
            setFileUploadStatus({ success: true, message: '🗑️ Documento eliminado del RAG.' });
        } catch (e) {
            console.error('Error eliminando doc RAG:', e);
        }
    };

    // Trigger OpenClaw Copilot focused on this brand
    const handleOpenCopilotForBrand = () => {
        if (!activeClient) return;
        window.dispatchEvent(new CustomEvent('openclaw:focus-brand', { detail: { brandId: activeClient.id } }));
    };

    // Real AI Agent Generation using OpenClawBrainService
    const handleTriggerRealAiAgent = async (promptType, customText = '') => {
        if (!activeClient) return;
        setIsGeneratingRag(true);
        setRagPromptResult('');
        setCopiedRag(false);

        let query = '';
        if (customText) {
            query = customText;
        } else if (promptType === 'hooks') {
            query = `Genera 3 ganchos virales de alta retención para Reels de ${activeClient.name}. Considera su industria (${activeClient.industry}), su tono de voz (${activeClient.brand?.toneOfVoice}) y sus directrices Do's & Don'ts.`;
        } else if (promptType === 'weekend') {
            query = `Propón un plan de contenido y activación de fin de semana (Viernes a Domingo) para ${activeClient.name}. Incluye formatos específicos (Reel 4K, Stories, Cenas Chicas o TikTok), horarios sugeridos y llamadas a la acción (CTA) de reserva.`;
        } else if (promptType === 'pitch') {
            query = `Redacta una propuesta de valor comercial y diferenciación de ${activeClient.name} frente a sus competidores (${activeClient.rag?.competitors || 'mercado local'}).`;
        } else if (promptType === 'script') {
            query = `Escribe un guión completo de Reel 9:16 de 25 segundos para ${activeClient.name}. Incluye: 0-3s Hook visual y texto en pantalla, 3-18s Cuerpo y tomas sugeridas, 18-25s Cierre y CTA persuasivo. Tono: ${activeClient.brand?.toneOfVoice}.`;
        }

        try {
            const systemRole = `Eres el Agente Estratega de ARRIVE Agency asignado a ${activeClient.name}.
Conoce a la perfección las directrices del cliente:
- Tono: ${activeClient.brand?.toneOfVoice || 'Elegante y cautivador'}
- Do's: ${activeClient.brand?.dos || 'Imágenes premium y estilo refinado'}
- Don'ts: ${activeClient.brand?.donts || 'No usar slang barato ni fotos pixeladas'}`;

            const res = await OpenClawBrainService.sendCommand(
                query,
                [],
                systemRole,
                'Especialista en Marketing de Hospitalidad, Nightlife, Redes Sociales y Conversión',
                activeClient.id,
                agentMode
            );

            setRagPromptResult(res.reply || 'No se obtuvo respuesta del agente.');
        } catch (err) {
            setRagPromptResult(`⚠️ Error conectando con el agente: ${err.message}. Verifica que el backend esté en ejecución.`);
        } finally {
            setIsGeneratingRag(false);
        }
    };

    // Convert AI Output to Scheduled Post
    const handleConvertAiToPost = () => {
        if (!ragPromptResult || !activeClient) return;

        const firstLine = ragPromptResult.split('\n')[0].replace(/[*#]/g, '').trim();
        const newPost = {
            id: `post-ai-${Date.now()}`,
            format: 'Reel 9:16',
            title: firstLine.substring(0, 45) || `Reel IA para ${activeClient.name}`,
            hook: ragPromptResult.substring(0, 90) + '...',
            caption: ragPromptResult,
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            status: 'En Guión'
        };

        updateActiveClientData(c => ({
            ...c,
            posts: [newPost, ...(c.posts || [])]
        }));

        alert(`✅ ¡Contenido convertido en Post Programado para ${activeClient.name}! Puedes verlo en la pestaña "📱 Posts & Redes".`);
        if (addActivity) {
            addActivity(`🎬 Post programado desde Agente RAG para ${activeClient.name}: "${newPost.title}"`, activeClient.color);
        }
    };

    // Convert AI Output to Operational Task
    const handleConvertAiToTask = async () => {
        if (!ragPromptResult || !activeClient) return;

        const firstLine = ragPromptResult.split('\n')[0].replace(/[*#]/g, '').trim();
        const taskObj = {
            id: `task-ai-${Date.now()}`,
            text: `[${activeClient.name}] ${firstLine.substring(0, 60)}`,
            status: 'pending',
            done: false,
            assignee: activeClient.lead || 'GG',
            priority: 'high',
            due: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            projectId: activeClient.id,
            projectName: activeClient.name,
            project: activeClient.id,
            agency: 'arrive',
            createdAt: new Date().toISOString()
        };

        if (addTask) {
            await addTask(taskObj);
            alert(`✅ ¡Tarea operativa creada para ${activeClient.lead || 'GG'} en ${activeClient.name}!`);
        }
    };

    // Add Post to Active Client
    const handleAddClientPost = (e) => {
        e.preventDefault();
        if (!newPostTitle.trim() || !activeClient) return;

        const newPost = {
            id: `cp-${Date.now()}`,
            format: newPostFormat,
            title: newPostTitle.trim(),
            hook: newPostHook.trim() || 'Contenido producido por ARRIVE Agency',
            date: newPostDate,
            status: 'En Guión'
        };

        updateActiveClientData(c => ({
            ...c,
            posts: [newPost, ...(c.posts || [])]
        }));

        if (addActivity) {
            addActivity(`Programado nuevo post para ${activeClient.name}: "${newPostTitle}"`, activeClient.color);
        }

        setNewPostTitle('');
        setNewPostHook('');
    };

    // Delete Post
    const handleDeletePost = (postId) => {
        updateActiveClientData(c => ({
            ...c,
            posts: (c.posts || []).filter(p => p.id !== postId)
        }));
    };

    // Add Global Task for this Client
    const handleAddClientTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim() || !activeClient) return;

        const taskObj = {
            id: `task-cli-${Date.now()}`,
            text: newTaskText.trim(),
            status: 'pending',
            done: false,
            assignee: newTaskAssignee,
            priority: newTaskPriority,
            due: newTaskDue,
            projectId: activeClient.id,
            projectName: activeClient.name,
            project: activeClient.id,
            agency: 'arrive',
            createdAt: new Date().toISOString()
        };

        if (addTask) {
            await addTask(taskObj);
        }
        if (addActivity) {
            addActivity(`Tarea asignada a ${newTaskAssignee} para ${activeClient.name}: "${newTaskText}"`, '#fbbf24');
        }

        setNewTaskText('');
    };

    // Add Link to Client
    const handleAddLink = (e) => {
        e.preventDefault();
        if (!newLinkTitle.trim() || !newLinkUrl.trim() || !activeClient) return;

        const linkObj = {
            id: `l-${Date.now()}`,
            title: newLinkTitle.trim(),
            url: newLinkUrl.trim(),
            category: newLinkCat
        };

        updateActiveClientData(c => ({
            ...c,
            links: [...(c.links || []), linkObj]
        }));

        setNewLinkTitle('');
        setNewLinkUrl('');
    };

    // Delete Link
    const handleDeleteLink = (linkId) => {
        updateActiveClientData(c => ({
            ...c,
            links: (c.links || []).filter(l => l.id !== linkId)
        }));
    };

    // Add Portfolio Deliverable
    const handleAddPortfolio = (e) => {
        e.preventDefault();
        if (!newPortTitle.trim() || !activeClient) return;

        const item = {
            id: `port-${Date.now()}`,
            title: newPortTitle.trim(),
            category: newPortCat,
            description: newPortDesc.trim(),
            metrics: newPortMetrics.trim() || 'Entregable completado por ARRIVE Agency'
        };

        updateActiveClientData(c => ({
            ...c,
            portfolio: [item, ...(c.portfolio || [])]
        }));

        setNewPortTitle('');
        setNewPortDesc('');
        setNewPortMetrics('');
    };

    // Add Creative Idea
    const handleAddIdea = (e) => {
        e.preventDefault();
        if (!newIdeaTitle.trim() || !activeClient) return;

        const idea = {
            id: `id-${Date.now()}`,
            title: newIdeaTitle.trim(),
            type: newIdeaType,
            hook: newIdeaHook.trim() || 'Gancho viral conceptualizado por el equipo creativo',
            status: 'En Evaluación'
        };

        updateActiveClientData(c => ({
            ...c,
            ideas: [idea, ...(c.ideas || [])]
        }));

        setNewIdeaTitle('');
        setNewIdeaHook('');
    };

    // Add Sub-Project / Internal Campaign
    const handleAddSubProject = (e) => {
        e.preventDefault();
        if (!newSubTitle.trim() || !activeClient) return;

        const sub = {
            id: `sub-${Date.now()}`,
            title: newSubTitle.trim(),
            status: 'Planificación',
            progress: 15,
            budget: newSubBudget.trim(),
            deadline: newSubDeadline,
            description: newSubDesc.trim() || 'Iniciativa estratégica para el cliente.'
        };

        updateActiveClientData(c => ({
            ...c,
            subProjects: [sub, ...(c.subProjects || [])]
        }));

        setNewSubTitle('');
        setNewSubDesc('');
    };

    // Add Proposal
    const handleAddProposal = (e) => {
        e.preventDefault();
        if (!newPropTitle.trim() || !activeClient) return;

        const prop = {
            id: `prop-${Date.now()}`,
            title: newPropTitle.trim(),
            feeMonthly: newPropFee.trim(),
            scope: newPropScope.trim(),
            status: 'Enviada al Cliente',
            sentDate: new Date().toISOString().split('T')[0]
        };

        updateActiveClientData(c => ({
            ...c,
            proposals: [prop, ...(c.proposals || [])]
        }));

        setNewPropTitle('');
        setNewPropFee('');
        setNewPropScope('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Hidden File Input for RAG uploads */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.txt,.md,.csv,.json,.doc,.docx"
                onChange={handleFileUpload}
            />

            {/* Top Toolbar: Clients Navigation & Action */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(12, 12, 18, 0.95) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                borderRadius: '16px',
                padding: '20px 24px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                background: 'rgba(251, 191, 36, 0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                🌟 ARRIVE CLIENTS & ACCOUNTS HUB
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {clientsList.length} Clientes Activos
                            </span>
                        </div>
                        <h2 style={{
                            margin: '4px 0 0 0',
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '22px',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '0.02em'
                        }}>
                            Gestión Integral de Marcas y Clientes de la Agencia
                        </h2>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                            Maneja branding, posts programados, tareas operativas, enlaces, portafolios, ideas, sub-proyectos, propuestas y RAG inteligente por cliente.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddClientModalOpen(true)}
                        style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 18px rgba(251, 191, 36, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Plus size={16} /> + Nuevo Cliente / Proyecto
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Buscar cliente, industria o @instagram..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px 8px 34px',
                                color: '#fff',
                                fontSize: '12.5px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                        {['all', 'Gastronomía & Restaurante', 'Dinner Party & Nightlife', 'Speakeasy & Coctelería', 'Hospitalidad / Hotel', 'Moda & Retail'].map(ind => (
                            <button
                                key={ind}
                                onClick={() => setSelectedIndustryFilter(ind)}
                                style={{
                                    background: selectedIndustryFilter === ind ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.04)',
                                    color: selectedIndustryFilter === ind ? '#fbbf24' : '#94a3b8',
                                    border: `1px solid ${selectedIndustryFilter === ind ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {ind === 'all' ? 'Todas las Industrias' : ind}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Horizontal Client Cards Selector Strip */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px',
                    marginTop: '4px'
                }}>
                    {filteredClients.map(client => {
                        const isSelected = client.id === selectedClientId;
                        return (
                            <div
                                key={client.id}
                                onClick={() => setSelectedClientId(client.id)}
                                style={{
                                    background: isSelected ? 'linear-gradient(135deg, rgba(30, 27, 20, 0.9) 0%, rgba(20, 20, 28, 0.9) 100%)' : 'rgba(15, 15, 22, 0.7)',
                                    border: `1.5px solid ${isSelected ? (client.color || '#fbbf24') : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    boxShadow: isSelected ? `0 6px 20px rgba(0,0,0,0.4), inset 0 0 15px ${client.color}15` : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            background: `linear-gradient(135deg, ${client.color || '#fbbf24'}33, #09090b)`,
                                            border: `1px solid ${client.color || '#fbbf24'}66`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontFamily: 'Outfit, sans-serif',
                                            fontWeight: 800,
                                            fontSize: '15px',
                                            color: client.color || '#fbbf24',
                                            boxShadow: `0 2px 10px ${client.color}22`
                                        }}>
                                            {client.name.substring(0, 1)}
                                        </div>
                                        <div>
                                            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', fontFamily: 'Outfit, sans-serif' }}>
                                                {client.name}
                                            </div>
                                            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                                                {client.industry}
                                            </div>
                                        </div>
                                    </div>

                                    <span style={{
                                        background: client.status === 'Retainer Activo' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
                                        color: client.status === 'Retainer Activo' ? '#34d399' : '#fbbf24',
                                        fontSize: '9.5px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {client.status}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '6px' }}>
                                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                                        {client.fee || '$3,000/mes'}
                                    </span>
                                    <span style={{ color: '#94a3b8' }}>
                                        Lead: <strong style={{ color: '#fff' }}>{client.lead || 'GG'}</strong>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Active Client 360° Management Hub */}
            {activeClient && (
                <div style={{
                    background: 'rgba(15, 15, 23, 0.95)',
                    border: `1px solid ${activeClient.color || '#fbbf24'}44`,
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                    overflow: 'hidden'
                }}>
                    {/* Active Client Banner Header */}
                    <div style={{
                        padding: '20px 26px',
                        background: `radial-gradient(circle at 10% 0%, ${activeClient.color || '#fbbf24'}22 0%, transparent 60%), linear-gradient(145deg, #161622 0%, #0d0d14 100%)`,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '14px',
                                background: `linear-gradient(135deg, ${activeClient.color || '#fbbf24'}44 0%, #09090b 100%)`,
                                border: `2px solid ${activeClient.color || '#fbbf24'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'Outfit, sans-serif',
                                fontWeight: 900,
                                fontSize: '24px',
                                color: activeClient.color || '#fbbf24',
                                boxShadow: `0 4px 20px ${activeClient.color}33`
                            }}>
                                {activeClient.name.substring(0, 1)}
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <h2 style={{
                                        margin: 0,
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '22px',
                                        fontWeight: 800,
                                        color: '#ffffff'
                                    }}>
                                        {activeClient.name}
                                    </h2>
                                    <span style={{
                                        background: `${activeClient.color}22`,
                                        color: activeClient.color,
                                        border: `1px solid ${activeClient.color}44`,
                                        padding: '2px 8px',
                                        borderRadius: '5px',
                                        fontSize: '11px',
                                        fontWeight: 700
                                    }}>
                                        {activeClient.industry}
                                    </span>
                                    <span style={{
                                        background: 'rgba(16,185,129,0.15)',
                                        color: '#34d399',
                                        padding: '2px 8px',
                                        borderRadius: '5px',
                                        fontSize: '11px',
                                        fontWeight: 700
                                    }}>
                                        {activeClient.status}
                                    </span>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '3px', fontStyle: 'italic' }}>
                                    "{activeClient.slogan || 'Marca aliada de ARRIVE Agency'}"
                                </div>
                            </div>
                        </div>

                        {/* Top quick actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => {
                                    setClientSubTab('rag');
                                    setRagSubMode('upload_files');
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(236, 72, 153, 0.3) 100%)',
                                    color: '#f3e8ff',
                                    border: '1px solid rgba(168, 85, 247, 0.55)',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 3px 12px rgba(168, 85, 247, 0.3)'
                                }}
                            >
                                <UploadCloud size={13} /> Subir Archivos al RAG
                            </button>

                            <button
                                onClick={handleOpenCopilotForBrand}
                                style={{
                                    background: 'linear-gradient(135deg, #7c5cfc 0%, #3b82f6 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 3px 12px rgba(124, 92, 252, 0.4)'
                                }}
                            >
                                <MessageSquare size={13} /> Hablar con OpenClaw sobre esta Marca
                            </button>

                            {activeClient.contactPhone && (
                                <a
                                    href={`https://wa.me/${activeClient.contactPhone}?text=Hola! Te contactamos desde ARRIVE Agency.`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        background: '#25D366',
                                        color: '#000000',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <Send size={11} /> WhatsApp
                                </a>
                            )}

                            {activeClient.instagram && (
                                <a
                                    href={`https://instagram.com/${activeClient.instagram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        background: 'rgba(236,72,153,0.15)',
                                        color: '#f472b6',
                                        border: '1px solid rgba(236,72,153,0.3)',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <Instagram size={11} /> {activeClient.instagram}
                                </a>
                            )}

                            <button
                                onClick={() => handleDeleteClient(activeClient.id)}
                                style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                                title="Eliminar Cliente"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Sub-Navigation Ribbon (9 Dimensions) */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(10, 10, 16, 0.95)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        overflowX: 'auto',
                        padding: '4px 14px',
                        gap: '4px'
                    }}>
                        {[
                            { id: 'brand', label: '🏷️ Marca & Branding', count: null },
                            { id: 'posts', label: '📱 Posts & Redes', count: activeClient.posts?.length || 0 },
                            { id: 'tasks', label: '✅ Tareas del Cliente', count: clientTasks.length },
                            { id: 'links', label: '🔗 Links & Recursos', count: activeClient.links?.length || 0 },
                            { id: 'portfolio', label: '🎨 Portafolio & Entregables', count: activeClient.portfolio?.length || 0 },
                            { id: 'ideas', label: '💡 Ideas & Brainstorming', count: activeClient.ideas?.length || 0 },
                            { id: 'subProjects', label: '🚀 Proyectos Internos', count: activeClient.subProjects?.length || 0 },
                            { id: 'proposals', label: '💼 Propuestas', count: activeClient.proposals?.length || 0 },
                            { id: 'rag', label: '🧠 RAG & Subir Archivos IA', count: ragDocsList.length > 0 ? `${ragDocsList.length} docs` : 'Subir Archivos' }
                        ].map(tab => {
                            const isActive = clientSubTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setClientSubTab(tab.id)}
                                    style={{
                                        background: isActive ? `${activeClient.color || '#fbbf24'}22` : 'transparent',
                                        color: isActive ? '#ffffff' : '#94a3b8',
                                        border: 'none',
                                        borderBottom: isActive ? `2px solid ${activeClient.color || '#fbbf24'}` : '2px solid transparent',
                                        padding: '10px 14px',
                                        fontSize: '12px',
                                        fontWeight: isActive ? 700 : 500,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span style={{
                                            background: isActive ? (activeClient.color || '#fbbf24') : 'rgba(255,255,255,0.08)',
                                            color: isActive ? '#000000' : '#94a3b8',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            padding: '1px 6px',
                                            borderRadius: '10px'
                                        }}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sub-Tab Body */}
                    <div style={{ padding: '24px' }}>
                        {/* ──────────────────────────────────────────────────────────
                            1. BRANDING & MARCA
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'brand' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                                {/* Color Palette Card */}
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '15px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Palette size={16} style={{ color: activeClient.color || '#fbbf24' }} />
                                        Paleta Cromática de la Marca
                                    </h4>
                                    <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: activeClient.brand?.primaryColor || activeClient.color, border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', margin: '0 auto 6px auto' }}></div>
                                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Primario</div>
                                            <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{activeClient.brand?.primaryColor || activeClient.color}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: activeClient.brand?.secondaryColor || '#12121c', border: '2px solid rgba(255,255,255,0.2)', margin: '0 auto 6px auto' }}></div>
                                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Secundario</div>
                                            <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{activeClient.brand?.secondaryColor || '#12121c'}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: activeClient.brand?.accentColor || '#fbbf24', border: '2px solid rgba(255,255,255,0.2)', margin: '0 auto 6px auto' }}></div>
                                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Acento</div>
                                            <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{activeClient.brand?.accentColor || '#fbbf24'}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                        Tipografías Oficiales: <strong style={{ color: '#fff' }}>{activeClient.brand?.headingFont || 'Outfit'}</strong> (Títulos) / <strong style={{ color: '#fff' }}>{activeClient.brand?.bodyFont || 'Inter'}</strong> (Cuerpo).
                                    </div>
                                </div>

                                {/* Tone of Voice & Personality */}
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '15px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={16} style={{ color: '#f472b6' }} />
                                        Tono de Voz & Comunicación
                                    </h4>
                                    <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', margin: '0 0 14px 0' }}>
                                        "{activeClient.brand?.toneOfVoice || 'Tono premium, seductor y cercano, enfocado en hospitalidad de excelencia.'}"
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px' }}>
                                            <div style={{ color: '#34d399', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>✓ LO QUE SÍ HACER (DO'S)</div>
                                            <div style={{ color: '#cbd5e1', fontSize: '11.5px', lineHeight: 1.4 }}>{activeClient.brand?.dos || 'Cuidar la estética y fotos HD.'}</div>
                                        </div>
                                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px' }}>
                                            <div style={{ color: '#f87171', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>✕ LO QUE NO HACER (DON'TS)</div>
                                            <div style={{ color: '#cbd5e1', fontSize: '11.5px', lineHeight: 1.4 }}>{activeClient.brand?.donts || 'Evitar tipografías ilegibles o audio distorsionado.'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Brand Assets Shortcuts */}
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px', gridColumn: '1 / -1' }}>
                                    <h4 style={{ color: '#fff', fontSize: '15px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Layers size={16} style={{ color: '#60a5fa' }} />
                                        Repositorio de Activos de Marca (Brand Assets)
                                    </h4>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <a
                                            href={activeClient.brand?.brandGuidelinesUrl || 'https://drive.google.com'}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                color: '#e2e8f0',
                                                textDecoration: 'none',
                                                fontSize: '12.5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <FileText size={15} style={{ color: '#fbbf24' }} /> Manual de Marca (Guidelines) <ArrowUpRight size={12} />
                                        </a>

                                        <a
                                            href={activeClient.brand?.figmaUrl || 'https://figma.com'}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                color: '#e2e8f0',
                                                textDecoration: 'none',
                                                fontSize: '12.5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Palette size={15} style={{ color: '#ec4899' }} /> Tablero Figma / Diseños <ArrowUpRight size={12} />
                                        </a>

                                        <a
                                            href={activeClient.brand?.assetsDriveUrl || 'https://drive.google.com'}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                color: '#e2e8f0',
                                                textDecoration: 'none',
                                                fontSize: '12.5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <FolderGit2 size={15} style={{ color: '#34d399' }} /> Roster de Logos & Videos en Raw (Drive) <ArrowUpRight size={12} />
                                        </a>
                                    </div>
                                </div>

                                {/* RAG Knowledge Quick Card */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(124,92,252,0.08) 100%)',
                                    border: '1px solid rgba(168,85,247,0.35)',
                                    borderRadius: '12px',
                                    padding: '18px 22px',
                                    gridColumn: '1 / -1',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '14px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                                            <Brain size={18} /> Memoria RAG & Documentos de {activeClient.name}
                                            <span style={{ background: 'rgba(168,85,247,0.25)', color: '#e9d5ff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                                                {ragDocsList.length} documento{ragDocsList.length === 1 ? '' : 's'} indexado{ragDocsList.length === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <p style={{ color: '#cbd5e1', fontSize: '12.5px', margin: 0 }}>
                                            Sube menús en PDF, listas de precios y manuales para que OpenClaw y Gemini conozcan a fondo el negocio.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setClientSubTab('rag');
                                            setRagSubMode('upload_files');
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #7c5cfc 0%, #a855f7 100%)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px 18px',
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 14px rgba(168,85,247,0.35)'
                                        }}
                                    >
                                        <UploadCloud size={15} /> Subir Menús / Archivos al RAG
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            2. POSTS & REDES SOCIALES
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'posts' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Programar Nuevo Post / Reel para {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddClientPost} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <select
                                            className="arrive-quickadd-select"
                                            value={newPostFormat}
                                            onChange={(e) => setNewPostFormat(e.target.value)}
                                        >
                                            <option value="Reel 9:16">Reel 9:16 (Cine)</option>
                                            <option value="Carrusel HD">Carrusel HD</option>
                                            <option value="Story Seq">Secuencia Stories</option>
                                            <option value="TikTok / UGC">TikTok UGC</option>
                                        </select>

                                        <input
                                            type="text"
                                            placeholder="Título / Concepto del Post..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '220px', flex: 1 }}
                                            value={newPostTitle}
                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                        />

                                        <input
                                            type="text"
                                            placeholder="Hook o Gancho de los primeros 3 segundos..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '240px', flex: 1 }}
                                            value={newPostHook}
                                            onChange={(e) => setNewPostHook(e.target.value)}
                                        />

                                        <input
                                            type="date"
                                            className="arrive-quickadd-select"
                                            value={newPostDate}
                                            onChange={(e) => setNewPostDate(e.target.value)}
                                        />

                                        <button type="submit" className="arrive-quickadd-btn">
                                            <Plus size={13} /> Programar
                                        </button>
                                    </form>
                                </div>

                                <div className="arrive-posts-grid">
                                    {(activeClient.posts || []).length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', gridColumn: '1 / -1' }}>
                                            No hay posts programados para este cliente aún. ¡Programa el primero con el formulario arriba!
                                        </div>
                                    ) : (
                                        (activeClient.posts || []).map(post => (
                                            <div key={post.id} className="arrive-post-card" style={{ borderLeft: `3px solid ${activeClient.color || '#fbbf24'}` }}>
                                                <div className="arrive-post-header">
                                                    <span className="arrive-post-project">{activeClient.name}</span>
                                                    <span className="arrive-post-format">{post.format}</span>
                                                </div>
                                                <h4 style={{ color: '#fff', fontSize: '14px', margin: 0, fontWeight: 700 }}>
                                                    {post.title}
                                                </h4>
                                                <p className="arrive-post-copy">
                                                    "{post.hook}"
                                                </p>
                                                <div className="arrive-post-footer">
                                                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                                        📅 {post.date}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            background: post.status === 'Listo para Publicar' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                                            color: post.status === 'Listo para Publicar' ? '#34d399' : '#60a5fa',
                                                            padding: '2px 7px',
                                                            borderRadius: '4px',
                                                            fontSize: '9.5px',
                                                            fontWeight: 700
                                                        }}>
                                                            {post.status}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDeletePost(post.id)}
                                                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                                                            title="Eliminar post"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            3. TAREAS DEL CLIENTE (TASKS)
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'tasks' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Asignar Tarea Operativa para {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddClientTask} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            placeholder="Descripción de la tarea para el cliente..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '260px', flex: 1 }}
                                            value={newTaskText}
                                            onChange={(e) => setNewTaskText(e.target.value)}
                                        />

                                        <select
                                            className="arrive-quickadd-select"
                                            value={newTaskAssignee}
                                            onChange={(e) => setNewTaskAssignee(e.target.value)}
                                        >
                                            {['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>

                                        <select
                                            className="arrive-quickadd-select"
                                            value={newTaskPriority}
                                            onChange={(e) => setNewTaskPriority(e.target.value)}
                                        >
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                            <option value="critical">Crítica</option>
                                        </select>

                                        <input
                                            type="date"
                                            className="arrive-quickadd-select"
                                            value={newTaskDue}
                                            onChange={(e) => setNewTaskDue(e.target.value)}
                                        />

                                        <button type="submit" className="arrive-quickadd-btn">
                                            <Plus size={13} /> Asignar Tarea
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {clientTasks.length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                                            No hay tareas pendientes asignadas a este cliente. ¡Añade una arriba!
                                        </div>
                                    ) : (
                                        clientTasks.map(t => (
                                            <div
                                                key={t.id}
                                                style={{
                                                    background: 'rgba(20, 20, 30, 0.6)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '8px',
                                                    padding: '10px 14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!t.done}
                                                        onChange={() => toggleTask && toggleTask(t.id)}
                                                        style={{ cursor: 'pointer', accentColor: '#fbbf24', width: '16px', height: '16px' }}
                                                    />
                                                    <span style={{
                                                        color: t.done ? '#64748b' : '#ffffff',
                                                        textDecoration: t.done ? 'line-through' : 'none',
                                                        fontSize: '13px'
                                                    }}>
                                                        {t.text}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        background: 'rgba(255,255,255,0.06)',
                                                        color: '#cbd5e1',
                                                        fontSize: '10.5px',
                                                        padding: '2px 7px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600
                                                    }}>
                                                        {t.assignee || 'GG'}
                                                    </span>
                                                    {t.due && (
                                                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                                            {t.due}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            4. LINKS & RECURSOS
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'links' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Agregar Link / Recurso Clave para {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddLink} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            placeholder="Título del enlace (ej: Drive Videos 4K)..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '200px', flex: 1 }}
                                            value={newLinkTitle}
                                            onChange={(e) => setNewLinkTitle(e.target.value)}
                                        />

                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '220px', flex: 1 }}
                                            value={newLinkUrl}
                                            onChange={(e) => setNewLinkUrl(e.target.value)}
                                        />

                                        <select
                                            className="arrive-quickadd-select"
                                            value={newLinkCat}
                                            onChange={(e) => setNewLinkCat(e.target.value)}
                                        >
                                            <option value="Drive / Assets">Drive / Assets</option>
                                            <option value="Figma / Diseño">Figma / Diseño</option>
                                            <option value="Web Oficial">Web Oficial</option>
                                            <option value="Métricas / Ads">Métricas / Ads</option>
                                            <option value="Contratos / Facturas">Contratos / Facturas</option>
                                            <option value="Otro">Otro Recurso</option>
                                        </select>

                                        <button type="submit" className="arrive-quickadd-btn">
                                            <Plus size={13} /> Agregar Link
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                    {(activeClient.links || []).length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', gridColumn: '1 / -1' }}>
                                            No hay enlaces agregados aún. ¡Agrega el Drive o Figma del cliente arriba!
                                        </div>
                                    ) : (
                                        (activeClient.links || []).map(link => (
                                            <div
                                                key={link.id}
                                                style={{
                                                    background: 'rgba(20, 20, 30, 0.6)',
                                                    border: '1px solid rgba(255,255,255,0.07)',
                                                    borderRadius: '10px',
                                                    padding: '14px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    gap: '10px'
                                                }}
                                            >
                                                <div>
                                                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {link.category}
                                                    </span>
                                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
                                                        {link.title}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <a
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            color: activeClient.color || '#fbbf24',
                                                            textDecoration: 'none',
                                                            fontSize: '11.5px',
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        Abrir Enlace <ArrowUpRight size={12} />
                                                    </a>

                                                    <button
                                                        onClick={() => handleDeleteLink(link.id)}
                                                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            5. PORTAFOLIO & ENTREGABLES (SHOWCASE)
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'portfolio' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Añadir Caso de Éxito / Entregable al Portafolio de {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddPortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                placeholder="Título del entregable (ej: Video Reel 4K Lanzamiento)..."
                                                className="arrive-quickadd-input"
                                                style={{ flex: 2, minWidth: '220px' }}
                                                value={newPortTitle}
                                                onChange={(e) => setNewPortTitle(e.target.value)}
                                            />
                                            <select
                                                className="arrive-quickadd-select"
                                                value={newPortCat}
                                                onChange={(e) => setNewPortCat(e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="Campaña Viral">Campaña Viral</option>
                                                <option value="Video Reel 4K">Video Reel 4K</option>
                                                <option value="Branding & Identidad">Branding & Identidad</option>
                                                <option value="Fotografía Content Day">Fotografía Content Day</option>
                                                <option value="Web Experience">Web Experience</option>
                                            </select>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Métricas alcanzadas (ej: +250k Views, +40% Reservas)..."
                                            className="arrive-quickadd-input"
                                            value={newPortMetrics}
                                            onChange={(e) => setNewPortMetrics(e.target.value)}
                                        />

                                        <textarea
                                            placeholder="Breve descripción del trabajo realizado..."
                                            className="arrive-quickadd-input"
                                            rows={2}
                                            style={{ resize: 'vertical' }}
                                            value={newPortDesc}
                                            onChange={(e) => setNewPortDesc(e.target.value)}
                                        />

                                        <button type="submit" className="arrive-quickadd-btn" style={{ alignSelf: 'flex-start' }}>
                                            <Plus size={13} /> Guardar Entregable
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                    {(activeClient.portfolio || []).length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', gridColumn: '1 / -1' }}>
                                            No hay entregables destacados registrados en el portafolio de este cliente aún.
                                        </div>
                                    ) : (
                                        (activeClient.portfolio || []).map(item => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    background: 'rgba(20, 20, 30, 0.7)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '18px',
                                                    position: 'relative'
                                                }}
                                            >
                                                <span style={{ fontSize: '10px', background: `${activeClient.color}22`, color: activeClient.color, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                                    {item.category}
                                                </span>
                                                <h4 style={{ color: '#fff', fontSize: '16px', margin: '8px 0 4px 0', fontFamily: 'Outfit, sans-serif' }}>
                                                    {item.title}
                                                </h4>
                                                <p style={{ color: '#cbd5e1', fontSize: '12.5px', lineHeight: 1.45, margin: '0 0 12px 0' }}>
                                                    {item.description}
                                                </p>
                                                {item.metrics && (
                                                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', color: '#34d399', fontWeight: 600 }}>
                                                        📈 {item.metrics}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            6. IDEAS & BRAINSTORMING
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'ideas' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Banco Creativo: Proponer Nueva Idea para {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddIdea} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            placeholder="Título de la idea creativa..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '220px', flex: 1 }}
                                            value={newIdeaTitle}
                                            onChange={(e) => setNewIdeaTitle(e.target.value)}
                                        />

                                        <select
                                            className="arrive-quickadd-select"
                                            value={newIdeaType}
                                            onChange={(e) => setNewIdeaType(e.target.value)}
                                        >
                                            <option value="Trend / Audio">Trend / Audio Viral</option>
                                            <option value="Activación con Modelos ARRIVE">Activación con Modelos ARRIVE</option>
                                            <option value="Campaña Estacional">Campaña Estacional</option>
                                            <option value="Colaboración UGC">Colaboración UGC</option>
                                        </select>

                                        <input
                                            type="text"
                                            placeholder="Gancho (Hook) o mecánica de la idea..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '240px', flex: 1 }}
                                            value={newIdeaHook}
                                            onChange={(e) => setNewIdeaHook(e.target.value)}
                                        />

                                        <button type="submit" className="arrive-quickadd-btn">
                                            <Plus size={13} /> Guardar Idea
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                    {(activeClient.ideas || []).length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', gridColumn: '1 / -1' }}>
                                            No hay ideas registradas para este cliente todavía. ¡Desata tu creatividad arriba!
                                        </div>
                                    ) : (
                                        (activeClient.ideas || []).map(idea => (
                                            <div
                                                key={idea.id}
                                                style={{
                                                    background: 'rgba(20, 20, 30, 0.7)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '16px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '10px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                                        {idea.type}
                                                    </span>
                                                    <span style={{
                                                        background: idea.status === 'Aprobada para Producción' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
                                                        color: idea.status === 'Aprobada para Producción' ? '#34d399' : '#fbbf24',
                                                        fontSize: '9.5px',
                                                        fontWeight: 700,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {idea.status}
                                                    </span>
                                                </div>

                                                <h4 style={{ color: '#fff', fontSize: '15px', margin: '4px 0 6px 0', fontWeight: 700 }}>
                                                    {idea.title}
                                                </h4>
                                                <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>
                                                    "{idea.hook}"
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            7. PROYECTOS INTERNOS (SUB-PROJECTS)
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'subProjects' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Nueva Campaña / Sub-Proyecto Interno para {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddSubProject} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                placeholder="Nombre de la iniciativa (ej: Lanzamiento Verano 2026)..."
                                                className="arrive-quickadd-input"
                                                style={{ flex: 2, minWidth: '220px' }}
                                                value={newSubTitle}
                                                onChange={(e) => setNewSubTitle(e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Presupuesto (ej: $3,500)..."
                                                className="arrive-quickadd-input"
                                                style={{ flex: 1, minWidth: '130px' }}
                                                value={newSubBudget}
                                                onChange={(e) => setNewSubBudget(e.target.value)}
                                            />
                                            <input
                                                type="date"
                                                className="arrive-quickadd-select"
                                                value={newSubDeadline}
                                                onChange={(e) => setNewSubDeadline(e.target.value)}
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Alcance o descripción de la iniciativa..."
                                            className="arrive-quickadd-input"
                                            value={newSubDesc}
                                            onChange={(e) => setNewSubDesc(e.target.value)}
                                        />

                                        <button type="submit" className="arrive-quickadd-btn" style={{ alignSelf: 'flex-start' }}>
                                            <Plus size={13} /> Crear Sub-Proyecto
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                                    {(activeClient.subProjects || []).length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', gridColumn: '1 / -1' }}>
                                            No hay proyectos internos registrados para este cliente.
                                        </div>
                                    ) : (
                                        (activeClient.subProjects || []).map(sub => (
                                            <div
                                                key={sub.id}
                                                style={{
                                                    background: 'rgba(20, 20, 30, 0.7)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    padding: '18px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <h4 style={{ color: '#fff', fontSize: '15px', margin: 0, fontWeight: 700 }}>
                                                        {sub.title}
                                                    </h4>
                                                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#34d399', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                                        {sub.status}
                                                    </span>
                                                </div>

                                                <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                                                    {sub.description}
                                                </p>

                                                <div style={{ marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                                        <span>Progreso</span>
                                                        <span style={{ color: '#fff', fontWeight: 700 }}>{sub.progress || 50}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${sub.progress || 50}%`, height: '100%', background: activeClient.color || '#fbbf24', borderRadius: '3px' }}></div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                                                    <span>Presupuesto: <strong style={{ color: '#fbbf24' }}>{sub.budget}</strong></span>
                                                    <span>Límite: <strong style={{ color: '#fff' }}>{sub.deadline}</strong></span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            8. PROPUESTAS COMERCIALES (PROPOSALS)
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'proposals' && (
                            <div>
                                <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                                        + Registrar Nueva Propuesta Comercial / Pitch para {activeClient.name}
                                    </h4>
                                    <form onSubmit={handleAddProposal} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            placeholder="Título de la propuesta..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '220px', flex: 1 }}
                                            value={newPropTitle}
                                            onChange={(e) => setNewPropTitle(e.target.value)}
                                        />

                                        <input
                                            type="text"
                                            placeholder="Fee o Inversión (ej: $3,500/mes)..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '150px' }}
                                            value={newPropFee}
                                            onChange={(e) => setNewPropFee(e.target.value)}
                                        />

                                        <input
                                            type="text"
                                            placeholder="Alcance (ej: Social Media + 4 Reels/sem)..."
                                            className="arrive-quickadd-input"
                                            style={{ minWidth: '240px', flex: 2 }}
                                            value={newPropScope}
                                            onChange={(e) => setNewPropScope(e.target.value)}
                                        />

                                        <button type="submit" className="arrive-quickadd-btn">
                                            <Plus size={13} /> Guardar Propuesta
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(activeClient.proposals || []).length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                                            No hay propuestas registradas para este cliente aún.
                                        </div>
                                    ) : (
                                        (activeClient.proposals || []).map(p => (
                                            <div
                                                key={p.id}
                                                style={{
                                                    background: 'rgba(20, 20, 30, 0.7)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '10px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: '12px'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <h4 style={{ color: '#fff', fontSize: '15px', margin: 0, fontWeight: 700 }}>
                                                            {p.title}
                                                        </h4>
                                                        <span style={{
                                                            background: p.status === 'Aprobada / Firmada' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                                            color: p.status === 'Aprobada / Firmada' ? '#34d399' : '#60a5fa',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            padding: '2px 7px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                    <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '4px 0 0 0' }}>
                                                        Alcance: {p.scope}
                                                    </p>
                                                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                                        Enviada el: {p.sentDate}
                                                    </span>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#fbbf24', fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                                                        {p.feeMonthly}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────────────
                            9. RAG DEL CLIENTE & CONEXIÓN CON AGENTES (KNOWLEDGE HUB)
                            ────────────────────────────────────────────────────────── */}
                        {clientSubTab === 'rag' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Top Banner: Active Namespace & Status */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(28, 20, 48, 0.9) 0%, rgba(15, 12, 28, 0.9) 100%)',
                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                    borderRadius: '14px',
                                    padding: '18px 22px',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '14px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <Brain size={18} style={{ color: '#c084fc' }} />
                                            <h4 style={{ color: '#fff', fontSize: '17px', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                                                Centro de Inteligencia RAG: <span style={{ color: activeClient.color || '#fbbf24' }}>{activeClient.name}</span>
                                            </h4>
                                            <span style={{
                                                background: 'rgba(16,185,129,0.15)',
                                                color: '#34d399',
                                                border: '1px solid rgba(16,185,129,0.3)',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '10.5px',
                                                fontWeight: 700
                                            }}>
                                                🟢 Namespace: {activeClient.id}
                                            </span>
                                        </div>
                                        <p style={{ color: '#cbd5e1', fontSize: '12.5px', margin: 0 }}>
                                            Alimenta la memoria de OpenClaw Super Agent y Gemini con la identidad, documentos PDF, menús y reglas exclusivas de esta marca.
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            onClick={handleOpenCopilotForBrand}
                                            style={{
                                                background: 'linear-gradient(135deg, #7c5cfc 0%, #3b82f6 100%)',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '8px 14px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 4px 14px rgba(124, 92, 252, 0.35)'
                                            }}
                                        >
                                            <MessageCircle size={14} /> Abrir Copilot con esta Marca
                                        </button>

                                        <button
                                            onClick={() => fetchRagDocs(activeClient.id)}
                                            style={{
                                                background: 'rgba(255,255,255,0.06)',
                                                color: '#cbd5e1',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                padding: '8px 10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '11px'
                                            }}
                                            title="Refrescar documentos RAG"
                                        >
                                            <RefreshCw size={13} className={loadingRagDocs ? 'spin-icon' : ''} />
                                        </button>
                                    </div>
                                </div>

                                {/* Status Feedback Alert */}
                                {fileUploadStatus && (
                                    <div style={{
                                        background: fileUploadStatus.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        border: `1px solid ${fileUploadStatus.success ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                        color: fileUploadStatus.success ? '#34d399' : '#f87171',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontSize: '12.5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>{fileUploadStatus.message}</span>
                                        <button onClick={() => setFileUploadStatus(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                                    </div>
                                )}

                                {ragSyncSuccess && (
                                    <div style={{
                                        background: 'rgba(168, 85, 247, 0.15)',
                                        border: '1px solid rgba(168, 85, 247, 0.4)',
                                        color: '#c084fc',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        fontSize: '12.5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <CheckCircle2 size={16} /> ¡Memoria RAG sincronizada exitosamente con el Servidor y lista para OpenClaw & Gemini!
                                    </div>
                                )}

                                {/* RAG Sub-Modes Switcher */}
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    paddingBottom: '10px',
                                    overflowX: 'auto'
                                }}>
                                    {[
                                        { id: 'upload_files', label: `📄 1. Subir Archivos & Menús (${ragDocsList.length} docs)`, icon: FileUp },
                                        { id: 'edit_pillars', label: '📝 2. Editar 6 Pilares & Reglas de la Marca', icon: BookOpen },
                                        { id: 'quick_notes', label: '⚡ 3. Bloc de Inteligencia & Minutas', icon: Lightbulb },
                                        { id: 'ai_studio', label: '🤖 4. Generador con Agente IA en Vivo', icon: Sparkles }
                                    ].map(mode => {
                                        const isActive = ragSubMode === mode.id;
                                        return (
                                            <button
                                                key={mode.id}
                                                onClick={() => setRagSubMode(mode.id)}
                                                style={{
                                                    background: isActive ? 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(124,92,252,0.15) 100%)' : 'rgba(255,255,255,0.03)',
                                                    color: isActive ? '#ffffff' : '#94a3b8',
                                                    border: `1px solid ${isActive ? '#c084fc' : 'rgba(255,255,255,0.07)'}`,
                                                    borderRadius: '8px',
                                                    padding: '8px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: isActive ? 700 : 500,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <mode.icon size={13} style={{ color: isActive ? '#c084fc' : '#94a3b8' }} />
                                                {mode.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* ────────── 1. UPLOAD FILES DROPZONE ────────── */}
                                {ragSubMode === 'upload_files' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Dropzone Card */}
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                            onDragLeave={() => setIsDraggingOver(false)}
                                            onDrop={handleDropFile}
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                background: isDraggingOver 
                                                    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.2) 100%)'
                                                    : 'linear-gradient(135deg, rgba(20, 20, 35, 0.8) 0%, rgba(15, 15, 25, 0.8) 100%)',
                                                border: `2px dashed ${isDraggingOver ? '#c084fc' : 'rgba(168, 85, 247, 0.45)'}`,
                                                borderRadius: '16px',
                                                padding: '40px 24px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.25s ease',
                                                boxShadow: isDraggingOver ? '0 0 25px rgba(168, 85, 247, 0.35)' : 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '50%',
                                                background: 'rgba(168, 85, 247, 0.15)',
                                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 14px auto'
                                            }}>
                                                <UploadCloud size={32} style={{ color: '#c084fc' }} className={isUploadingFile ? 'spin-icon' : ''} />
                                            </div>
                                            <h4 style={{ color: '#ffffff', fontSize: '18px', margin: '0 0 6px 0', fontFamily: 'Outfit, sans-serif' }}>
                                                {isUploadingFile ? '⏳ Indexando documento en la Memoria RAG...' : 'Arrastra o Haz Clic para Subir Archivos al RAG'}
                                            </h4>
                                            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '580px', marginInline: 'auto', lineHeight: 1.5 }}>
                                                Sube Menús en PDF, Manuales de Marca, Listas de Precios de Mesas VIP, Decks o Briefs de <strong style={{ color: activeClient.color || '#fbbf24' }}>{activeClient.name}</strong>.
                                            </p>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #7c5cfc 0%, #a855f7 100%)',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        padding: '10px 20px',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 15px rgba(124, 92, 252, 0.35)'
                                                    }}
                                                >
                                                    <FileUp size={15} /> Seleccionar Archivo desde tu Equipo
                                                </button>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    Formatos soportados: PDF, TXT, MD, DOCX, CSV, JSON
                                                </span>
                                            </div>
                                        </div>

                                        {/* Indexed Documents Table */}
                                        <div style={{ background: 'rgba(18, 18, 26, 0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                <div>
                                                    <h4 style={{ color: '#fff', fontSize: '15px', margin: '0 0 2px 0', fontFamily: 'Outfit, sans-serif' }}>
                                                        Archivos Indexados para {activeClient.name} ({ragDocsList.length})
                                                    </h4>
                                                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                                        Memoria RAG activa en namespace: <code style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{activeClient.id}</code>
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => fetchRagDocs(activeClient.id)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: '#cbd5e1',
                                                        borderRadius: '8px',
                                                        padding: '6px 12px',
                                                        fontSize: '11.5px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <RefreshCw size={12} className={loadingRagDocs ? 'spin-icon' : ''} /> Actualizar lista
                                                </button>
                                            </div>

                                            {ragDocsList.length === 0 ? (
                                                <div style={{ color: '#64748b', textAlign: 'center', padding: '30px 20px', fontSize: '13px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                                                    <FileText size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                                    <div>No hay documentos subidos todavía para esta marca.</div>
                                                    <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                                                        ¡Arrastra tu primer PDF o menú en la caja de arriba para que los agentes lo aprendan!
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {ragDocsList.map(doc => (
                                                        <div
                                                            key={doc.id}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                borderRadius: '10px',
                                                                padding: '12px 16px',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: '12px'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                                <div style={{
                                                                    width: '36px', height: '36px', borderRadius: '8px',
                                                                    background: 'rgba(251,191,36,0.15)',
                                                                    border: '1px solid rgba(251,191,36,0.3)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: '#fbbf24', flexShrink: 0
                                                                }}>
                                                                    <FileText size={18} />
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {doc.title || doc.filename}
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                                        <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 Vectorizado en RAG</span>
                                                                        <span>•</span>
                                                                        <span>{doc.addedAt ? new Date(doc.addedAt).toLocaleDateString() : 'Activo'}</span>
                                                                        <span>•</span>
                                                                        <span style={{ textTransform: 'uppercase', fontSize: '10px' }}>{doc.category || 'documento'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                                <button
                                                                    onClick={() => handleDeleteRagDoc(doc.id)}
                                                                    style={{
                                                                        background: 'rgba(239,68,68,0.1)',
                                                                        border: '1px solid rgba(239,68,68,0.2)',
                                                                        color: '#f87171',
                                                                        cursor: 'pointer',
                                                                        padding: '6px 10px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '11.5px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                    title="Eliminar este archivo del RAG"
                                                                >
                                                                    <Trash2 size={13} /> Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ────────── 2. EDIT PILLARS FORM ────────── */}
                                {ragSubMode === 'edit_pillars' && (
                                    <form onSubmit={handleSaveRagPillars} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                            {/* Overview */}
                                            <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                                                <label style={{ display: 'block', color: '#fbbf24', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    1. Historia & Propuesta de Valor Única
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    className="arrive-quickadd-input"
                                                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                                    placeholder="Describe qué es la marca, qué vende, historia y qué la hace diferente..."
                                                    value={editOverview}
                                                    onChange={(e) => setEditOverview(e.target.value)}
                                                />
                                            </div>

                                            {/* Target Audience */}
                                            <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                                                <label style={{ display: 'block', color: '#60a5fa', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    2. Público Objetivo (Buyer Persona)
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    className="arrive-quickadd-input"
                                                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                                    placeholder="Edad, nivel socioeconómico, gustos, qué buscan al visitarnos..."
                                                    value={editAudience}
                                                    onChange={(e) => setEditAudience(e.target.value)}
                                                />
                                            </div>

                                            {/* Content Pillars */}
                                            <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                                                <label style={{ display: 'block', color: '#f472b6', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    3. Pilares de Contenido & Ganchos
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    className="arrive-quickadd-input"
                                                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                                    placeholder="Ejes temáticos clave (ej: Coctelería de autor, Atardeceres, Cenas de Chicas, Mesas VIP)..."
                                                    value={editPillars}
                                                    onChange={(e) => setEditPillars(e.target.value)}
                                                />
                                            </div>

                                            {/* AI Strict Rules / No-Gos */}
                                            <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                                                <label style={{ display: 'block', color: '#f87171', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    4. Palabras Vetadas & Lo que NUNCA debe decir la IA (No-Go's)
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    className="arrive-quickadd-input"
                                                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                                    placeholder="Términos prohibidos, estilos que evitar, errores comunes que la IA debe prevenir..."
                                                    value={editNoGos}
                                                    onChange={(e) => setEditNoGos(e.target.value)}
                                                />
                                            </div>

                                            {/* Competitors */}
                                            <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                                                <label style={{ display: 'block', color: '#c084fc', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    5. Competidores Directos & Benchmark
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    className="arrive-quickadd-input"
                                                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                                    placeholder="Rivales comerciales en Panamá y ventajas competitivas..."
                                                    value={editCompetitors}
                                                    onChange={(e) => setEditCompetitors(e.target.value)}
                                                />
                                            </div>

                                            {/* FAQs */}
                                            <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px' }}>
                                                <label style={{ display: 'block', color: '#34d399', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    6. FAQs Oficiales & Respuestas Frecuentes
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    className="arrive-quickadd-input"
                                                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                                    placeholder="Horarios, código de vestimenta (dress code), consumo mínimo en mesas, reservas..."
                                                    value={editFaqs}
                                                    onChange={(e) => setEditFaqs(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                            <button
                                                type="submit"
                                                className="arrive-quickadd-btn"
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    padding: '10px 22px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <CheckCircle2 size={15} /> Guardar y Sincronizar Memoria RAG
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* ────────── 3. QUICK INTEL NOTES ────────── */}
                                {ragSubMode === 'quick_notes' && (
                                    <div style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px' }}>
                                        <h4 style={{ color: '#fff', fontSize: '15px', margin: '0 0 8px 0', fontFamily: 'Outfit, sans-serif' }}>
                                            ⚡ Bloc de Inteligencia Rápida: Transcripciones & Acuerdos
                                        </h4>
                                        <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 14px 0' }}>
                                            Pega notas de reuniones con el cliente, mensajes de WhatsApp con directrices nuevas o transcripciones de llamadas para que los agentes las memoricen inmediatamente.
                                        </p>

                                        <form onSubmit={handleIndexQuickNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <input
                                                type="text"
                                                placeholder="Título del fragmento (ej: Reunión con Gerente 01-Oct - Nuevas Reglas de Coctelería)..."
                                                className="arrive-quickadd-input"
                                                value={quickNoteTitle}
                                                onChange={(e) => setQuickNoteTitle(e.target.value)}
                                            />

                                            <textarea
                                                rows={5}
                                                required
                                                placeholder="Pega aquí el texto, notas o acuerdos en bruto..."
                                                className="arrive-quickadd-input"
                                                style={{ resize: 'vertical' }}
                                                value={quickNoteContent}
                                                onChange={(e) => setQuickNoteContent(e.target.value)}
                                            />

                                            <button
                                                type="submit"
                                                disabled={indexingNote}
                                                className="arrive-quickadd-btn"
                                                style={{ alignSelf: 'flex-start' }}
                                            >
                                                <Zap size={13} /> {indexingNote ? 'Indexando en RAG...' : 'Indexar Fragmento en Memoria RAG'}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* ────────── 4. AI AGENT STUDIO (LIVE MODEL TESTING) ────────── */}
                                {ragSubMode === 'ai_studio' && (
                                    <div style={{
                                        background: 'rgba(15, 15, 25, 0.85)',
                                        border: '1px solid rgba(251, 191, 36, 0.25)',
                                        borderRadius: '14px',
                                        padding: '20px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                                            <div>
                                                <h4 style={{ color: '#fff', fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Sparkles size={16} style={{ color: '#fbbf24' }} />
                                                    Estudio Generativo OpenClaw & Gemini con RAG
                                                </h4>
                                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0 0' }}>
                                                    Genera contenido estratégico en tiempo real conectado directamente con los documentos de {activeClient.name}.
                                                </p>
                                            </div>

                                            {/* Mode Selector */}
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {OPENCLAW_MODES.map(m => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => setAgentMode(m.id)}
                                                        style={{
                                                            background: agentMode === m.id ? `${m.color}33` : 'rgba(255,255,255,0.04)',
                                                            color: agentMode === m.id ? '#fff' : '#94a3b8',
                                                            border: `1px solid ${agentMode === m.id ? m.color : 'transparent'}`,
                                                            borderRadius: '6px',
                                                            padding: '4px 8px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            fontWeight: agentMode === m.id ? 700 : 500
                                                        }}
                                                    >
                                                        {m.name.split(' ')[0]} {m.name.split(' ')[1]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 1-Click Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                            <button
                                                onClick={() => handleTriggerRealAiAgent('hooks')}
                                                disabled={isGeneratingRag}
                                                style={{
                                                    background: 'rgba(251, 191, 36, 0.15)',
                                                    color: '#fbbf24',
                                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '8px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🚀 3 Ganchos Virales
                                            </button>

                                            <button
                                                onClick={() => handleTriggerRealAiAgent('weekend')}
                                                disabled={isGeneratingRag}
                                                style={{
                                                    background: 'rgba(236, 72, 153, 0.15)',
                                                    color: '#f472b6',
                                                    border: '1px solid rgba(236, 72, 153, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '8px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🍸 Estrategia Fin de Semana
                                            </button>

                                            <button
                                                onClick={() => handleTriggerRealAiAgent('script')}
                                                disabled={isGeneratingRag}
                                                style={{
                                                    background: 'rgba(45, 212, 191, 0.15)',
                                                    color: '#2dd4bf',
                                                    border: '1px solid rgba(45, 212, 191, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '8px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🎬 Guión Reel 9:16 (25 seg)
                                            </button>

                                            <button
                                                onClick={() => handleTriggerRealAiAgent('pitch')}
                                                disabled={isGeneratingRag}
                                                style={{
                                                    background: 'rgba(168, 85, 247, 0.15)',
                                                    color: '#c084fc',
                                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '8px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                💼 Propuesta de Valor Comercial
                                            </button>
                                        </div>

                                        {/* Custom Prompt Bar */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                            <input
                                                type="text"
                                                placeholder={`Escribe una instrucción libre para ${activeClient.name} (ej: Redacta 3 copys de Instagram para el jueves)...`}
                                                className="arrive-quickadd-input"
                                                style={{ flex: 1 }}
                                                value={customAiPrompt}
                                                onChange={(e) => setCustomAiPrompt(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && customAiPrompt.trim()) {
                                                        handleTriggerRealAiAgent('custom', customAiPrompt.trim());
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => customAiPrompt.trim() && handleTriggerRealAiAgent('custom', customAiPrompt.trim())}
                                                disabled={isGeneratingRag || !customAiPrompt.trim()}
                                                className="arrive-quickadd-btn"
                                            >
                                                <Send size={13} /> Enviar al Agente
                                            </button>
                                        </div>

                                        {/* Loading Indicator */}
                                        {isGeneratingRag && (
                                            <div style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                color: '#fbbf24',
                                                fontSize: '13px',
                                                fontStyle: 'italic',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}>
                                                <Sparkles size={16} className="spin-icon" />
                                                Consultando RAG del namespace ({activeClient.id}) y generando con Gemini AI...
                                            </div>
                                        )}

                                        {/* AI Output Box */}
                                        {ragPromptResult && (
                                            <div style={{
                                                background: '#09090e',
                                                border: '1px solid rgba(251, 191, 36, 0.35)',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                position: 'relative'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle2 size={13} /> RESPUESTA DE OPENCLAW SUPER AGENT (RAG {activeClient.name})
                                                    </span>

                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={handleConvertAiToPost}
                                                            style={{
                                                                background: 'rgba(59,130,246,0.15)',
                                                                color: '#60a5fa',
                                                                border: '1px solid rgba(59,130,246,0.3)',
                                                                borderRadius: '4px',
                                                                padding: '4px 10px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            ➕ Convertir en Post Programado
                                                        </button>

                                                        <button
                                                            onClick={handleConvertAiToTask}
                                                            style={{
                                                                background: 'rgba(16,185,129,0.15)',
                                                                color: '#34d399',
                                                                border: '1px solid rgba(16,185,129,0.3)',
                                                                borderRadius: '4px',
                                                                padding: '4px 10px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            ➕ Convertir en Tarea
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(ragPromptResult);
                                                                setCopiedRag(true);
                                                                setTimeout(() => setCopiedRag(false), 2000);
                                                            }}
                                                            style={{
                                                                background: copiedRag ? '#10b981' : 'rgba(255,255,255,0.08)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                padding: '4px 10px',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            {copiedRag ? <Check size={11} /> : <Copy size={11} />}
                                                            {copiedRag ? '¡Copiado!' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <pre style={{
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'Inter, sans-serif',
                                                    fontSize: '13px',
                                                    color: '#f1f5f9',
                                                    margin: 0,
                                                    lineHeight: 1.6
                                                }}>
                                                    {ragPromptResult}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               MODAL: + NUEVO CLIENTE / PROYECTO DE LA AGENCIA
               ═══════════════════════════════════════════════════════════════════ */}
            {isAddClientModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#12121a',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '560px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '26px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                        color: '#fff'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>
                                    + Dar de Alta Nuevo Cliente / Proyecto
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                    Crea el espacio 360° para gestionar marca, redes, tareas y RAG.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddClientModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                    Nombre del Cliente / Marca *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Sauvage Rooftop, Casco Rum Bar..."
                                    className="arrive-quickadd-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                        Industria / Categoría
                                    </label>
                                    <select
                                        className="arrive-quickadd-select"
                                        style={{ width: '100%' }}
                                        value={newClientIndustry}
                                        onChange={(e) => setNewClientIndustry(e.target.value)}
                                    >
                                        <option value="Gastronomía & Restaurante">Gastronomía & Restaurante</option>
                                        <option value="Dinner Party & Nightlife">Dinner Party & Nightlife</option>
                                        <option value="Speakeasy & Coctelería">Speakeasy & Coctelería</option>
                                        <option value="Hospitalidad / Hotel">Hospitalidad / Hotel</option>
                                        <option value="Moda & Retail">Moda & Retail</option>
                                        <option value="Eventos & Festivales">Eventos & Festivales</option>
                                        <option value="Corporativo / Tech">Corporativo / Tech</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                        Estado del Cliente
                                    </label>
                                    <select
                                        className="arrive-quickadd-select"
                                        style={{ width: '100%' }}
                                        value={newClientStatus}
                                        onChange={(e) => setNewClientStatus(e.target.value)}
                                    >
                                        <option value="Retainer Activo">Retainer Activo</option>
                                        <option value="En Onboarding">En Onboarding</option>
                                        <option value="Propuesta / Pitch">Propuesta / Pitch</option>
                                        <option value="Pausado">Pausado</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                        Fee Mensual / Inversión
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: $3,500/mes"
                                        className="arrive-quickadd-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        value={newClientFee}
                                        onChange={(e) => setNewClientFee(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                        Lead de Cuenta en la Agencia
                                    </label>
                                    <select
                                        className="arrive-quickadd-select"
                                        style={{ width: '100%' }}
                                        value={newClientLead}
                                        onChange={(e) => setNewClientLead(e.target.value)}
                                    >
                                        {['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Color Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                                    Color Distintivo de Marca
                                </label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {['#fbbf24', '#ec4899', '#c084fc', '#60a5fa', '#34d399', '#f87171'].map(hex => (
                                        <div
                                            key={hex}
                                            onClick={() => setNewClientColor(hex)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: hex,
                                                cursor: 'pointer',
                                                border: newClientColor === hex ? '3px solid #ffffff' : '2px solid transparent',
                                                boxShadow: newClientColor === hex ? '0 0 10px rgba(255,255,255,0.6)' : 'none',
                                                transition: 'all 0.15s ease'
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={newClientColor}
                                        onChange={(e) => setNewClientColor(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', width: '32px', height: '32px', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                        Instagram (@usuario)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="@cliente"
                                        className="arrive-quickadd-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        value={newClientInstagram}
                                        onChange={(e) => setNewClientInstagram(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                        WhatsApp de Contacto
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="50761234567"
                                        className="arrive-quickadd-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        value={newClientPhone}
                                        onChange={(e) => setNewClientPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                                    Slogan o Propuesta de Valor
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Experiencia gastronómica de altura..."
                                    className="arrive-quickadd-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={newClientSlogan}
                                    onChange={(e) => setNewClientSlogan(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddClientModalOpen(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        color: '#cbd5e1',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '9px 16px',
                                        cursor: 'pointer',
                                        fontSize: '12.5px'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="arrive-quickadd-btn"
                                    style={{ padding: '9px 20px', fontSize: '13px' }}
                                >
                                    <Plus size={14} /> Registrar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
