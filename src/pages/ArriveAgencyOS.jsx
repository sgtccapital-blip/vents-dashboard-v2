import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Sparkles, Briefcase, Users, Flame, Film,
    CheckSquare, GlassWater, ExternalLink, Calendar,
    Share2, Plus, Check, Clock, Phone, Send,
    Instagram, ArrowRight, Layers, ShieldCheck, MapPin,
    Building2, Award, Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ArriveTasksBox from '../components/ArriveTasksBox';
import ArriveClientManager from '../components/ArriveClientManager';
import '../components/ArriveAgency.css';

export default function ArriveAgencyOS() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const currentTab = searchParams.get('tab') || 'clients';

    const { events, imageGirls, socialMedia, tasks, addTask, addActivity } = useApp();

    // ─── Local State for Dinner Guestlists ───
    const [selectedDinnerVenue, setSelectedDinnerVenue] = useState('Terraplén Rooftop');
    const [dinnerGuestlist, setDinnerGuestlist] = useState([
        { id: 'g-1', name: 'Sofía M.', ig: '@sofia.pty', phone: '50762114455', type: 'Cena VIP & Cócteles', venue: 'Terraplén Rooftop', day: 'Jueves 8:30 PM', status: 'confirmada' },
        { id: 'g-2', name: 'Camila R.', ig: '@camila.oficial', phone: '50763901122', type: 'Contenido / Stories', venue: 'Terraplén Rooftop', day: 'Jueves 8:30 PM', status: 'confirmada' },
        { id: 'g-3', name: 'Valentina D.', ig: '@valen_vibes', phone: '50765558899', type: 'Mesa Anfitriona', venue: 'Terraplén Rooftop', day: 'Jueves 8:30 PM', status: 'confirmada' },
        { id: 'g-4', name: 'Isabella S.', ig: '@isa.solis', phone: '50767123344', type: 'Cena VIP & Maridaje', venue: 'Terraplén Rooftop', day: 'Jueves 8:30 PM', status: 'pendiente' },
        { id: 'g-5', name: 'Andrea B.', ig: '@andreab_pty', phone: '50764432211', type: 'Cena VIP & Mesa Furia', venue: 'Furia', day: 'Viernes 9:00 PM', status: 'confirmada' },
        { id: 'g-6', name: 'Nicole C.', ig: '@nicole.casco', phone: '50768997766', type: 'Rooftop Sunset Hostess', venue: 'Terraplén Rooftop', day: 'Jueves 8:30 PM', status: 'confirmada' },
        { id: 'g-7', name: 'Mariana T.', ig: '@mariana.t', phone: '50761223399', type: 'Cena VIP & Networking', venue: 'Piano Bar', day: 'Sábado 9:30 PM', status: 'confirmada' },
        { id: 'g-8', name: 'Daniela G.', ig: '@dani.gomez', phone: '50766338822', type: 'Animación & Shots VIP', venue: 'Furia', day: 'Viernes 9:00 PM', status: 'pendiente' }
    ]);

    const [newGirlName, setNewGirlName] = useState('');
    const [newGirlIG, setNewGirlIG] = useState('');
    const [newGirlPhone, setNewGirlPhone] = useState('');
    const [newGirlType, setNewGirlType] = useState('Cena VIP & Cócteles');

    // ─── Local State for Project Posts ───
    const [posts, setPosts] = useState([
        {
            id: 'post-1',
            project: 'ARRIVE Agency',
            format: 'Reel 9:16',
            title: 'Recap semanal: The Night Belongs to ARRIVE',
            hook: 'Así vivimos los 3 venues más exclusivos de Panamá este fin de semana',
            date: '2026-10-02',
            status: 'Listo para Publicar',
            channel: '@arriveagency'
        },
        {
            id: 'post-2',
            project: 'Terraplén Rooftop',
            format: 'Carrusel HD',
            title: 'Golden Sunset & Signature Cocktails',
            hook: 'Descubre las 5 razones por las que el atardecer se ve mejor en el Casco',
            date: '2026-10-03',
            status: 'En Edición',
            channel: '@terraplenrooftop'
        },
        {
            id: 'post-3',
            project: 'Furia Panamá',
            format: 'Reel Viral',
            title: 'Dinner Party Vibes & Bottle Show',
            hook: 'Cuando la cena se transforma en la mejor noche de Panamá',
            date: '2026-10-04',
            status: 'Grabación Lista',
            channel: '@furiapanama'
        },
        {
            id: 'post-4',
            project: 'Piano Bar Casco',
            format: 'Story Seq',
            title: 'Live Jazz & Speakeasy Atmosphere',
            hook: 'El secreto mejor guardado de la noche panameña',
            date: '2026-10-05',
            status: 'En Guión',
            channel: '@pianobarcasco'
        },
        {
            id: 'post-5',
            project: 'Arrive Models',
            format: 'TikTok / UGC',
            title: 'Behind The Scenes: Cena de Chicas Terraplén',
            hook: 'POV: Fuiste invitada a la cena VIP de ARRIVE Models',
            date: '2026-10-04',
            status: 'Listo para Publicar',
            channel: '@arrive.models'
        }
    ]);

    const [newPostProject, setNewPostProject] = useState('ARRIVE Agency');
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostFormat, setNewPostFormat] = useState('Reel 9:16');
    const [newPostDate, setNewPostDate] = useState('2026-10-05');

    // Switch Tab helper
    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    // Dinner status toggle
    const handleToggleDinnerStatus = (id) => {
        setDinnerGuestlist(prev => prev.map(item => {
            if (item.id === id) {
                const nextStatus = item.status === 'confirmada' ? 'pendiente' : item.status === 'pendiente' ? 'cancelada' : 'confirmada';
                return { ...item, status: nextStatus };
            }
            return item;
        }));
    };

    // Add girl to dinner
    const handleAddGirlToDinner = (e) => {
        e.preventDefault();
        if (!newGirlName.trim()) return;

        const newEntry = {
            id: `g-${Date.now()}`,
            name: newGirlName.trim(),
            ig: newGirlIG.startsWith('@') ? newGirlIG : `@${newGirlIG}`,
            phone: newGirlPhone.replace(/[^0-9]/g, ''),
            type: newGirlType,
            venue: selectedDinnerVenue,
            day: selectedDinnerVenue.includes('Terraplén') ? 'Jueves 8:30 PM' : selectedDinnerVenue.includes('Furia') ? 'Viernes 9:00 PM' : 'Sábado 9:30 PM',
            status: 'pendiente'
        };

        setDinnerGuestlist([newEntry, ...dinnerGuestlist]);
        if (addActivity) {
            addActivity(`Agregada invitada a cena (${selectedDinnerVenue}): ${newGirlName}`, '#fbbf24');
        }

        setNewGirlName('');
        setNewGirlIG('');
        setNewGirlPhone('');
    };

    // Add post to pipeline
    const handleAddPost = (e) => {
        e.preventDefault();
        if (!newPostTitle.trim()) return;

        const newPost = {
            id: `post-${Date.now()}`,
            project: newPostProject,
            format: newPostFormat,
            title: newPostTitle.trim(),
            hook: 'Contenido premium producido por ARRIVE Agency',
            date: newPostDate,
            status: 'En Guión',
            channel: newPostProject === 'ARRIVE Agency' ? '@arriveagency' : `@${newPostProject.toLowerCase().replace(/\s+/g, '')}`
        };

        setPosts([newPost, ...posts]);
        if (addActivity) {
            addActivity(`Programado nuevo post para ${newPostProject}: "${newPostTitle}"`, '#60a5fa');
        }

        setNewPostTitle('');
    };

    // Current dinner guests
    const currentGuests = dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue);
    const confirmedCount = currentGuests.filter(g => g.status === 'confirmada').length;

    // Metrics for the top header
    const totalTalent = imageGirls?.length || 8;
    const contentTasksCount = posts.length || 5;

    return (
        <div className="page-content animate-in arrive-page-container">
            {/* Unified Master Hero Header */}
            <div className="arrive-hero-header">
                <div className="arrive-hero-topline">
                    <div className="arrive-hero-brand">
                        <div className="arrive-hero-logo">
                            <span>A</span>
                        </div>
                        <div className="arrive-hero-titles">
                            <h1>
                                ARRIVE AGENCY <span className="gold-highlight">OPERATIONS OS</span>
                            </h1>
                            <div className="arrive-hero-sub">
                                Creative, Talent & Experiences — <span>We create. We connect. We grow.</span>
                            </div>
                        </div>
                    </div>

                    <div className="arrive-hero-badges">
                        <span className="arrive-pill arrive-pill-gold">
                            <Sparkles size={11} /> 3 DIVISIONES
                        </span>
                        <span className="arrive-pill arrive-pill-live">
                            <span className="dot-pulse"></span> PANAMÁ HQ
                        </span>
                        <a 
                            href="https://arriveservices.com" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="arrive-pill"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', textDecoration: 'none' }}
                        >
                            <ExternalLink size={11} /> arriveservices.com
                        </a>
                    </div>
                </div>

                {/* Integrated Metrics Strip */}
                <div className="arrive-metrics-strip">
                    <div className="arrive-metric-item">
                        <div className="arrive-metric-label">
                            <Building2 size={12} style={{ color: '#fbbf24' }} /> Clientes & Marcas
                        </div>
                        <div className="arrive-metric-val">
                            3 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>Retainers Activos</span>
                        </div>
                    </div>

                    <div className="arrive-metric-item">
                        <div className="arrive-metric-label">
                            <GlassWater size={12} style={{ color: '#f472b6' }} /> Cenas Chicas
                        </div>
                        <div className="arrive-metric-val">
                            {totalTalent} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>invitadas</span>
                        </div>
                    </div>

                    <div className="arrive-metric-item">
                        <div className="arrive-metric-label">
                            <Film size={12} style={{ color: '#60a5fa' }} /> Posts & Producción
                        </div>
                        <div className="arrive-metric-val">
                            {contentTasksCount} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>en pipeline</span>
                        </div>
                    </div>

                    <div className="arrive-metric-item">
                        <div className="arrive-metric-label">
                            <Flame size={12} style={{ color: '#c084fc' }} /> Venues Semanales
                        </div>
                        <div className="arrive-metric-val">
                            3 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>Terraplén · Furia · Piano</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Segmented Navigation Tab Bar */}
            <div className="arrive-tab-nav">
                <button 
                    className={`arrive-tab-btn ${currentTab === 'clients' ? 'active' : ''}`}
                    onClick={() => handleTabChange('clients')}
                >
                    <Building2 size={14} /> 👥 Clientes & Proyectos 360°
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'structure' ? 'active' : ''}`}
                    onClick={() => handleTabChange('structure')}
                >
                    <Layers size={14} /> Estructura & 3 Divisiones
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'dinners' ? 'active' : ''}`}
                    onClick={() => handleTabChange('dinners')}
                >
                    <GlassWater size={14} /> Cenas Chicas & Restaurantes
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'posts' ? 'active' : ''}`}
                    onClick={() => handleTabChange('posts')}
                >
                    <Film size={14} /> Posts de Proyectos & Redes
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'nightlife' ? 'active' : ''}`}
                    onClick={() => handleTabChange('nightlife')}
                >
                    <Flame size={14} /> Eventos Semanales
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => handleTabChange('tasks')}
                >
                    <CheckSquare size={14} /> Tareas de la Agencia
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               TAB CONTENT: CLIENTES & PROYECTOS 360° (MARCA, REDES, RAG, ETC.)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'clients' && (
                <ArriveClientManager />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB CONTENT: 1. STRUCTURE & 3 DIVISIONS
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'structure' && (
                <div>
                    {/* The 4 Major Division Cards */}
                    <div className="arrive-divisions-grid">
                        {/* 01 ARRIVE SERVICES */}
                        <div 
                            className="arrive-division-card"
                            onClick={() => handleTabChange('clients')}
                        >
                            <div className="arrive-card-head">
                                <span className="arrive-card-num card-num-services">01 / CREATIVE</span>
                                <div className="arrive-card-icon" style={{ color: '#60a5fa' }}>
                                    <Briefcase size={16} />
                                </div>
                            </div>
                            <div>
                                <h3 className="arrive-card-title">ARRIVE SERVICES</h3>
                                <p className="arrive-card-sub">Social media, branding, webs y campañas que escalan proyectos y marcas.</p>
                            </div>
                            <div className="arrive-card-tags">
                                <span className="arrive-card-tag">Social Media</span>
                                <span className="arrive-card-tag">Branding</span>
                                <span className="arrive-card-tag">Web & Apps</span>
                                <span className="arrive-card-tag">Growth</span>
                            </div>
                        </div>

                        {/* 02 ARRIVE MODELS */}
                        <div 
                            className="arrive-division-card"
                            onClick={() => handleTabChange('dinners')}
                        >
                            <div className="arrive-card-head">
                                <span className="arrive-card-num card-num-models">02 / TALENTO</span>
                                <div className="arrive-card-icon" style={{ color: '#f472b6' }}>
                                    <Users size={16} />
                                </div>
                            </div>
                            <div>
                                <h3 className="arrive-card-title">ARRIVE MODELS</h3>
                                <p className="arrive-card-sub">Modelos, hostesses, UGC creators y convocatorias semanales de cenas para chicas.</p>
                            </div>
                            <div className="arrive-card-tags">
                                <span className="arrive-card-tag" style={{ color: '#f472b6', background: 'rgba(236,72,153,0.1)' }}>🍸 Cenas Chicas</span>
                                <span className="arrive-card-tag">Hostesses</span>
                                <span className="arrive-card-tag">UGC Creators</span>
                            </div>
                        </div>

                        {/* 03 ARRIVE NIGHTLIFE */}
                        <div 
                            className="arrive-division-card"
                            onClick={() => handleTabChange('nightlife')}
                        >
                            <div className="arrive-card-head">
                                <span className="arrive-card-num card-num-nightlife">03 / NIGHTLIFE</span>
                                <div className="arrive-card-icon" style={{ color: '#c084fc' }}>
                                    <Flame size={16} />
                                </div>
                            </div>
                            <div>
                                <h3 className="arrive-card-title">ARRIVE NIGHTLIFE</h3>
                                <p className="arrive-card-sub">Eventos semanales, hospitalidad VIP y conexión de marcas con los mejores venues de Panamá.</p>
                            </div>
                            <div className="arrive-card-tags">
                                <span className="arrive-card-tag">Terraplén</span>
                                <span className="arrive-card-tag">Furia</span>
                                <span className="arrive-card-tag">Piano Bar</span>
                                <span className="arrive-card-tag">Mesas VIP</span>
                            </div>
                        </div>

                        {/* ARRIVE STUDIO */}
                        <div 
                            className="arrive-division-card"
                            onClick={() => handleTabChange('posts')}
                        >
                            <div className="arrive-card-head">
                                <span className="arrive-card-num card-num-studio">STUDIO</span>
                                <div className="arrive-card-icon" style={{ color: '#2dd4bf' }}>
                                    <Film size={16} />
                                </div>
                            </div>
                            <div>
                                <h3 className="arrive-card-title">ARRIVE STUDIO</h3>
                                <p className="arrive-card-sub">Content Day y producciones fotográficas y de video mensual para marcas y talento.</p>
                            </div>
                            <div className="arrive-card-tags">
                                <span className="arrive-card-tag">Content Day</span>
                                <span className="arrive-card-tag">Studio Sessions</span>
                                <span className="arrive-card-tag">Reels 4K</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed 6 Creative Areas Matrix */}
                    <div style={{ marginTop: '16px' }}>
                        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layers size={16} style={{ color: '#fbbf24' }} />
                            Las 6 Áreas Integrales de ARRIVE Services
                        </h3>

                        <div className="arrive-divisions-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                            <div className="arrive-division-card" style={{ minHeight: 'auto' }}>
                                <span className="arrive-card-num card-num-services">01 / SOCIAL MEDIA</span>
                                <h4 style={{ color: '#fff', fontSize: '14px', margin: '8px 0 4px 0' }}>Social Media & Content</h4>
                                <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                                    Gestión de redes sociales, dirección de arte, videos cortos verticales (Reels y TikTok) de alta retención.
                                </p>
                            </div>

                            <div className="arrive-division-card" style={{ minHeight: 'auto' }}>
                                <span className="arrive-card-num card-num-services">02 / BRANDING</span>
                                <h4 style={{ color: '#fff', fontSize: '14px', margin: '8px 0 4px 0' }}>Branding & Creative</h4>
                                <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                                    Identidad de marca, diseño visual, manuales de marca, naming y piezas gráficas de alto impacto visual.
                                </p>
                            </div>

                            <div className="arrive-division-card" style={{ minHeight: 'auto' }}>
                                <span className="arrive-card-num card-num-services">03 / WEB & DIGITAL</span>
                                <h4 style={{ color: '#fff', fontSize: '14px', margin: '8px 0 4px 0' }}>Web & Digital</h4>
                                <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                                    Desarrollo de sitios web interactivos, portales de experiencia de marca, landing pages y apps.
                                </p>
                            </div>

                            <div className="arrive-division-card" style={{ minHeight: 'auto' }}>
                                <span className="arrive-card-num card-num-services">04 / PERFORMANCE</span>
                                <h4 style={{ color: '#fff', fontSize: '14px', margin: '8px 0 4px 0' }}>Growth & Performance</h4>
                                <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                                    Pauta publicitaria digital (Meta & Google Ads), embudos de ventas y optimización del retorno de inversión.
                                </p>
                            </div>

                            <div className="arrive-division-card" style={{ minHeight: 'auto' }}>
                                <span className="arrive-card-num card-num-models">05 / TALENTO</span>
                                <h4 style={{ color: '#fff', fontSize: '14px', margin: '8px 0 4px 0' }}>Influence & Talent</h4>
                                <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                                    Scouting, conexión y coordinación de creadores de contenido UGC, influencers y embajadoras.
                                </p>
                            </div>

                            <div className="arrive-division-card" style={{ minHeight: 'auto' }}>
                                <span className="arrive-card-num card-num-nightlife">06 / EXPERIENCIAS</span>
                                <h4 style={{ color: '#fff', fontSize: '14px', margin: '8px 0 4px 0' }}>Experiences & Activations</h4>
                                <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                                    Conexión de marcas con la noche, restaurantes y venues de Panamá con hospitalidad de primer nivel.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB CONTENT: 2. CENAS & INVITACIONES DE CHICAS A RESTAURANTES
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'dinners' && (
                <div>
                    {/* Venue Switcher Cards */}
                    <div className="arrive-dinner-grid">
                        <div 
                            className={`arrive-dinner-card ${selectedDinnerVenue === 'Terraplén Rooftop' ? 'active-night' : ''}`}
                            onClick={() => setSelectedDinnerVenue('Terraplén Rooftop')}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="dinner-card-badge" style={{ background: 'rgba(212,175,55,0.15)', color: '#fbbf24', border: '1px solid rgba(212,175,55,0.3)' }}>
                                JUEVES 8:30 PM · ROOFTOP SUNSET
                            </span>
                            <h3 style={{ color: '#fff', fontSize: '17px', margin: '0 0 4px 0', fontFamily: 'Outfit, sans-serif' }}>Terraplén Rooftop</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px 0' }}>Casco Antiguo / Santa Ana — Cena degustación, cócteles de autor y DJ en vivo.</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#cbd5e1' }}>
                                <span>Cupos: <strong>10 Chicas</strong></span>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>
                                    {dinnerGuestlist.filter(g => g.venue === 'Terraplén Rooftop' && g.status === 'confirmada').length} confirmadas
                                </span>
                            </div>
                        </div>

                        <div 
                            className={`arrive-dinner-card ${selectedDinnerVenue === 'Furia' ? 'active-night' : ''}`}
                            onClick={() => setSelectedDinnerVenue('Furia')}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="dinner-card-badge" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)' }}>
                                VIERNES 9:00 PM · DINNER PARTY
                            </span>
                            <h3 style={{ color: '#fff', fontSize: '17px', margin: '0 0 4px 0', fontFamily: 'Outfit, sans-serif' }}>Furia Panamá</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px 0' }}>Calle 50 / Obarrio — Cena de alta energía, show de botellas y mesa principal reservada.</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#cbd5e1' }}>
                                <span>Cupos: <strong>8 Chicas</strong></span>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>
                                    {dinnerGuestlist.filter(g => g.venue === 'Furia' && g.status === 'confirmada').length} confirmadas
                                </span>
                            </div>
                        </div>

                        <div 
                            className={`arrive-dinner-card ${selectedDinnerVenue === 'Piano Bar' ? 'active-night' : ''}`}
                            onClick={() => setSelectedDinnerVenue('Piano Bar')}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="dinner-card-badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                                SÁBADO 9:30 PM · VIP SPEAKEASY
                            </span>
                            <h3 style={{ color: '#fff', fontSize: '17px', margin: '0 0 4px 0', fontFamily: 'Outfit, sans-serif' }}>Piano Bar Casco</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px 0' }}>Casco Antiguo — Mesa exclusiva, cócteles clásicos y sesión social de noche.</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#cbd5e1' }}>
                                <span>Cupos: <strong>6 Chicas</strong></span>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>
                                    {dinnerGuestlist.filter(g => g.venue === 'Piano Bar' && g.status === 'confirmada').length} confirmadas
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Table of Guests for Selected Venue */}
                    <div style={{ background: 'rgba(18, 18, 26, 0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px', marginBottom: '22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                            <div>
                                <h3 style={{ color: '#fff', fontSize: '16px', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                                    Invitadas para: <span style={{ color: '#fbbf24' }}>{selectedDinnerVenue}</span>
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: '11.5px', margin: '2px 0 0 0' }}>
                                    Gestión de invitaciones, confirmación por WhatsApp y perfiles de chicas convocadas
                                </p>
                            </div>

                            <span className="arrive-pill arrive-pill-gold">
                                {confirmedCount} Confirmadas
                            </span>
                        </div>

                        {/* Quick Add Girl Form */}
                        <form onSubmit={handleAddGirlToDinner} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '10px', marginBottom: '16px' }}>
                            <input 
                                type="text"
                                placeholder="Nombre de la chica..."
                                className="arrive-quickadd-input"
                                style={{ minWidth: '150px' }}
                                value={newGirlName}
                                onChange={(e) => setNewGirlName(e.target.value)}
                            />
                            <input 
                                type="text"
                                placeholder="Instagram (@usuario)"
                                className="arrive-quickadd-input"
                                style={{ minWidth: '130px' }}
                                value={newGirlIG}
                                onChange={(e) => setNewGirlIG(e.target.value)}
                            />
                            <input 
                                type="text"
                                placeholder="WhatsApp (ej. 50761234567)"
                                className="arrive-quickadd-input"
                                style={{ minWidth: '140px' }}
                                value={newGirlPhone}
                                onChange={(e) => setNewGirlPhone(e.target.value)}
                            />
                            <select 
                                className="arrive-quickadd-select"
                                value={newGirlType}
                                onChange={(e) => setNewGirlType(e.target.value)}
                            >
                                <option value="Cena VIP & Cócteles">Cena VIP & Cócteles</option>
                                <option value="Contenido / Stories">Contenido / Stories</option>
                                <option value="Mesa Anfitriona">Mesa Anfitriona</option>
                                <option value="Rooftop Sunset Hostess">Rooftop Sunset Hostess</option>
                            </select>
                            <button type="submit" className="arrive-quickadd-btn">
                                <Plus size={13} /> Invitar a Cena
                            </button>
                        </form>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="arrive-table-custom">
                                <thead>
                                    <tr>
                                        <th>Invitada / Talento</th>
                                        <th>Perfil & Rol</th>
                                        <th>Horario & Venue</th>
                                        <th>Estado</th>
                                        <th>Contacto WhatsApp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentGuests.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                No hay chicas registradas para este venue aún. ¡Usa el formulario arriba!
                                            </td>
                                        </tr>
                                    ) : (
                                        currentGuests.map((girl) => {
                                            const waMsg = encodeURIComponent(
                                                `¡Hola ${girl.name}! Te escribe el equipo de ARRIVE Agency ✨ Estás cordialmente invitada a la cena VIP exclusiva en ${girl.venue} este ${girl.day}. ¿Nos confirmas tu cupo para apartar tu lugar? 🍸`
                                            );
                                            return (
                                                <tr key={girl.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{girl.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Instagram size={11} style={{ color: '#ec4899' }} /> {girl.ig}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '4px', color: '#cbd5e1' }}>
                                                            {girl.type}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '12px' }}>{girl.venue}</div>
                                                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{girl.day}</div>
                                                    </td>
                                                    <td>
                                                        <button 
                                                            onClick={() => handleToggleDinnerStatus(girl.id)}
                                                            style={{
                                                                background: girl.status === 'confirmada' ? 'rgba(16,185,129,0.15)' : girl.status === 'pendiente' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                                color: girl.status === 'confirmada' ? '#34d399' : girl.status === 'pendiente' ? '#fbbf24' : '#f87171',
                                                                border: `1px solid ${girl.status === 'confirmada' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                                                borderRadius: '6px',
                                                                padding: '3px 8px',
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase'
                                                            }}
                                                        >
                                                            {girl.status}
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <a 
                                                            href={`https://wa.me/${girl.phone}?text=${waMsg}`}
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                background: '#25D366',
                                                                color: '#000000',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            <Send size={10} /> WhatsApp
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB CONTENT: 3. POSTS DE NUESTROS PROYECTOS & REDES
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'posts' && (
                <div>
                    {/* Add Post Form */}
                    <div style={{ background: 'rgba(18, 18, 26, 0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                        <h3 style={{ color: '#fff', fontSize: '15px', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>
                            Planificador de Posts & Contenido de Proyectos
                        </h3>
                        <form onSubmit={handleAddPost} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <select 
                                className="arrive-quickadd-select"
                                value={newPostProject}
                                onChange={(e) => setNewPostProject(e.target.value)}
                            >
                                <option value="ARRIVE Agency">ARRIVE Agency</option>
                                <option value="Terraplén Rooftop">Terraplén Rooftop</option>
                                <option value="Furia Panamá">Furia Panamá</option>
                                <option value="Piano Bar Casco">Piano Bar Casco</option>
                                <option value="Arrive Models">Arrive Models</option>
                                <option value="Cliente Gastronómico">Cliente Gastro</option>
                            </select>

                            <input 
                                type="text"
                                placeholder="Título / Concepto del Post o Reel..."
                                className="arrive-quickadd-input"
                                style={{ minWidth: '240px' }}
                                value={newPostTitle}
                                onChange={(e) => setNewPostTitle(e.target.value)}
                            />

                            <select 
                                className="arrive-quickadd-select"
                                value={newPostFormat}
                                onChange={(e) => setNewPostFormat(e.target.value)}
                            >
                                <option value="Reel 9:16">Reel 9:16</option>
                                <option value="Carrusel HD">Carrusel HD</option>
                                <option value="Story Seq">Secuencia Stories</option>
                                <option value="TikTok / UGC">TikTok UGC</option>
                            </select>

                            <input 
                                type="date"
                                className="arrive-quickadd-select"
                                value={newPostDate}
                                onChange={(e) => setNewPostDate(e.target.value)}
                            />

                            <button type="submit" className="arrive-quickadd-btn">
                                <Plus size={13} /> Programar Post
                            </button>
                        </form>
                    </div>

                    {/* Posts Grid */}
                    <div className="arrive-posts-grid">
                        {posts.map((post) => (
                            <div key={post.id} className="arrive-post-card">
                                <div className="arrive-post-header">
                                    <span className="arrive-post-project">{post.project}</span>
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
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB CONTENT: 4. EVENTOS SEMANALES
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'nightlife' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                        <div className="arrive-dinner-card" style={{ borderLeft: '3px solid #fbbf24' }}>
                            <span className="dinner-card-badge" style={{ background: 'rgba(212,175,55,0.15)', color: '#fbbf24' }}>
                                JUEVES · 6:00 PM HASTA CIERRE
                            </span>
                            <h3 style={{ color: '#fff', fontSize: '18px', margin: '4px 0', fontFamily: 'Outfit, sans-serif' }}>Terraplén Rooftop Sessions</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12.5px', lineHeight: 1.45 }}>
                                Sunset acústico, transición a afro-house / melódico, cena VIP para 10 chicas y mesas de networking.
                            </p>
                            <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="arrive-card-tag">DJ Invitado</span>
                                <span className="arrive-card-tag">Cobertura 4K Reel</span>
                                <span className="arrive-card-tag">Cena Chicas</span>
                            </div>
                        </div>

                        <div className="arrive-dinner-card" style={{ borderLeft: '3px solid #ec4899' }}>
                            <span className="dinner-card-badge" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6' }}>
                                VIERNES · 9:00 PM HASTA 3:00 AM
                            </span>
                            <h3 style={{ color: '#fff', fontSize: '18px', margin: '4px 0', fontFamily: 'Outfit, sans-serif' }}>Furia Friday Night Experience</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12.5px', lineHeight: 1.45 }}>
                                Cena con show interactivo, bottle service, música urbana internacional y ambientación premium.
                            </p>
                            <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="arrive-card-tag">Mesas VIP Llenas</span>
                                <span className="arrive-card-tag">Hostess Asignada</span>
                                <span className="arrive-card-tag">Stories en Vivo</span>
                            </div>
                        </div>

                        <div className="arrive-dinner-card" style={{ borderLeft: '3px solid #a855f7' }}>
                            <span className="dinner-card-badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                                SÁBADO · 8:00 PM HASTA 2:00 AM
                            </span>
                            <h3 style={{ color: '#fff', fontSize: '18px', margin: '4px 0', fontFamily: 'Outfit, sans-serif' }}>Piano Bar Casco Secreto</h3>
                            <p style={{ color: '#94a3b8', fontSize: '12.5px', lineHeight: 1.45 }}>
                                Música en directo, coctelería de autor galardonada, mesa reservada para modelos ARRIVE.
                            </p>
                            <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="arrive-card-tag">Speakeasy</span>
                                <span className="arrive-card-tag">Ambiente Exclusivo</span>
                                <span className="arrive-card-tag">Cena Cócteles</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB CONTENT: 5. TAREAS OPERATIVAS ARRIVE
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'tasks' && (
                <div>
                    <ArriveTasksBox />
                </div>
            )}
        </div>
    );
}
