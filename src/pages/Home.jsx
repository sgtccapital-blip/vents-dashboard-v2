import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Sparkles, Briefcase, Users, Flame, Film,
    CheckSquare, GlassWater, ExternalLink, Calendar,
    Share2, Plus, Check, Clock, Phone, Send,
    Instagram, ArrowRight, Layers, ShieldCheck, MapPin,
    Building2, Award, Zap, Monitor, StickyNote,
    FolderKanban, Rocket, Timer, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ArriveTeamOffice from '../components/ArriveTeamOffice';
import ArriveClientManager from '../components/ArriveClientManager';
import ArriveTasksBox from '../components/ArriveTasksBox';
import '../components/ArriveAgency.css';

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Tab state: default to 'office' for immediate agency office management focus
    const currentTab = searchParams.get('tab') || 'office';

    const { 
        events, socialMedia, tasks, toggleTask, addTask, 
        notes, addNote: cxAddNote, activityFeed, addActivity, 
        imageGirls, subscriptions 
    } = useApp();

    const [newNote, setNewNote] = useState('');
    const [now, setNow] = useState(new Date());

    // Live clock for countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Helper to switch tab and update URL
    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

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

    // ─── Local State for Production Pipeline ───
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

    // Quick Note
    const handleAddNote = () => {
        if (!newNote.trim()) return;
        cxAddNote({ id: `note-${Date.now()}`, text: newNote, date: new Date().toISOString().split('T')[0] });
        addActivity(`Añadida nota de oficina: "${newNote.substring(0, 20)}${newNote.length > 20 ? '...' : ''}"`, 'var(--accent-yellow)');
        setNewNote('');
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

    // Calculated metrics
    const activeEvents = events?.filter(e => ['planeacion', 'planificacion', 'ejecucion', 'activo', 'upcoming', 'ongoing'].includes(e.status)) || [];
    const todaysTasks = (tasks || []).filter(t => !t.done);
    const completedTasks = (tasks || []).filter(t => t.done).slice(0, 5);
    const totalTalent = imageGirls?.length || 8;
    const contentTasksCount = posts.length || 5;

    // Countdown calculation
    const allDates = (events || []).flatMap(e => {
        if (e.date) return [{ name: e.name, date: e.date, icon: e.icon, color: e.color, location: e.location, id: e.id }];
        if (e.instances) return e.instances.map(inst => ({ name: e.name, date: inst.date, icon: e.icon, color: e.color, location: e.location || '', id: e.id }));
        return [];
    }).filter(e => new Date(e.date + 'T23:59') >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextEvent = allDates[0] || null;

    const getCountdown = (dateStr) => {
        const target = new Date(dateStr + 'T00:00');
        const diff = target - now;
        if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            mins: Math.floor((diff % 3600000) / 60000),
            secs: Math.floor((diff % 60000) / 1000)
        };
    };

    const countdown = nextEvent ? getCountdown(nextEvent.date) : null;

    // Tasks by event
    const tasksByEvent = activeEvents.map(ev => {
        const evTasks = (tasks || []).filter(t => t.eventId === ev.id);
        const pending = evTasks.filter(t => !t.done).length;
        const done = evTasks.filter(t => t.done).length;
        return { ...ev, pending, done, total: evTasks.length };
    }).filter(ev => ev.total > 0);

    return (
        <div className="page-content animate-in arrive-page-container">
            {/* ═══════════════════════════════════════════════════════════════════
               UNIFIED MASTER HERO HEADER: ARRIVE AGENCY HQ & OFFICE OS
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="arrive-hero-header">
                <div className="arrive-hero-topline">
                    <div className="arrive-hero-brand">
                        <div className="arrive-hero-logo">
                            <span>A</span>
                        </div>
                        <div className="arrive-hero-titles">
                            <h1>
                                ARRIVE AGENCY <span className="gold-highlight">OFFICE COMMAND OS</span>
                            </h1>
                            <div className="arrive-hero-sub">
                                Creative, Talent & Experiences — <span>We create. We connect. We grow. (HQ Panamá)</span>
                            </div>
                        </div>
                    </div>

                    <div className="arrive-hero-badges">
                        <span className="arrive-pill arrive-pill-gold">
                            <Sparkles size={11} /> AGENCIA OPERATIVA
                        </span>
                        <span className="arrive-pill arrive-pill-live">
                            <span className="dot-pulse"></span> OFICINA HQ ACTIVA
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
                        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '6px' }}>
                            {new Date().toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>

                {/* Integrated Agency Metrics Strip */}
                <div className="arrive-metrics-strip">
                    <div className="arrive-metric-item" onClick={() => handleTabChange('office')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <Monitor size={12} style={{ color: '#10b981' }} /> Estaciones de Oficina
                        </div>
                        <div className="arrive-metric-val">
                            5 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>activas · 100% ocupación</span>
                        </div>
                    </div>

                    <div className="arrive-metric-item" onClick={() => handleTabChange('clients')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <Building2 size={12} style={{ color: '#fbbf24' }} /> Clientes & Retainers
                        </div>
                        <div className="arrive-metric-val">
                            3 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>Terraplén · Furia · Piano</span>
                        </div>
                    </div>

                    <div className="arrive-metric-item" onClick={() => handleTabChange('dinners')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <GlassWater size={12} style={{ color: '#f472b6' }} /> Convocatorias Cenas
                        </div>
                        <div className="arrive-metric-val">
                            {totalTalent} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>invitadas VIP</span>
                        </div>
                    </div>

                    <div className="arrive-metric-item" onClick={() => handleTabChange('production')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <Film size={12} style={{ color: '#60a5fa' }} /> Posts & Producción
                        </div>
                        <div className="arrive-metric-val">
                            {contentTasksCount} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>en pipeline 4K</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               DIRECT AGENCY MANAGEMENT TABS
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="arrive-tab-nav">
                <button 
                    className={`arrive-tab-btn ${currentTab === 'office' ? 'active' : ''}`}
                    onClick={() => handleTabChange('office')}
                >
                    <Monitor size={14} /> 🏢 Oficina & Equipo (Workstations)
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'clients' ? 'active' : ''}`}
                    onClick={() => handleTabChange('clients')}
                >
                    <Building2 size={14} /> 👥 Clientes & Retainers 360°
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'standup' ? 'active' : ''}`}
                    onClick={() => handleTabChange('standup')}
                >
                    <Zap size={14} /> ⚡ Daily Standup & Operaciones
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'dinners' ? 'active' : ''}`}
                    onClick={() => handleTabChange('dinners')}
                >
                    <GlassWater size={14} /> 🍸 Cenas Chicas & Talento
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'production' ? 'active' : ''}`}
                    onClick={() => handleTabChange('production')}
                >
                    <Film size={14} /> 🎬 Producción & Content Pipeline
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'structure' ? 'active' : ''}`}
                    onClick={() => handleTabChange('structure')}
                >
                    <Layers size={14} /> 🏛️ Estructura & 3 Divisiones
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 1: OFICINA & EQUIPO (WORKSTATIONS & TEAM MANAGEMENT)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'office' && (
                <ArriveTeamOffice />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 2: CLIENTES & PROYECTOS 360° (RETAINERS, MARCAS & ASSETS)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'clients' && (
                <ArriveClientManager />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 3: DAILY STANDUP & OPERACIONES DE LA OFICINA
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'standup' && (
                <div className="standup-tab-container animate-in">
                    {/* Countdown hero if upcoming event */}
                    {nextEvent && countdown && (
                        <div onClick={() => navigate('/eventos')} className="cc-countdown-hero" style={{
                            background: `linear-gradient(135deg, ${nextEvent.color}18, ${nextEvent.color}08, transparent)`,
                            borderColor: `${nextEvent.color}30`,
                            marginBottom: '20px'
                        }}>
                            <div className="cc-countdown-bg" style={{
                                background: `radial-gradient(circle at 100% 50%, ${nextEvent.color}10, transparent 70%)`
                            }} />
                            <div className="cc-countdown-icon" style={{
                                background: `${nextEvent.color}25`, borderColor: `${nextEvent.color}40`
                            }}>{nextEvent.icon || '📅'}</div>
                            <div className="cc-countdown-info">
                                <div className="cc-countdown-label" style={{ color: nextEvent.color }}>
                                    <Timer size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Próximo Hito / Evento
                                </div>
                                <div className="cc-countdown-title">{nextEvent.name}</div>
                                <div className="cc-countdown-meta">
                                    <span className="cc-countdown-meta-item">
                                        <Calendar size={12} /> {new Date(nextEvent.date + 'T12:00').toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </span>
                                    {nextEvent.location && (
                                        <span className="cc-countdown-meta-item">
                                            <MapPin size={12} /> {nextEvent.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="cc-countdown-timer">
                                {[
                                    { val: countdown.days, label: 'Días' },
                                    { val: countdown.hours, label: 'Hrs' },
                                    { val: countdown.mins, label: 'Min' },
                                    { val: countdown.secs, label: 'Seg' }
                                ].map(({ val, label }) => (
                                    <div key={label} className="cc-countdown-time-box">
                                        <div className="cc-countdown-time-val" style={{ color: nextEvent.color }}>{String(val).padStart(2, '0')}</div>
                                        <div className="cc-countdown-time-lbl">{label}</div>
                                    </div>
                                ))}
                            </div>
                            <ChevronRight size={20} className="cc-countdown-chevron" />
                        </div>
                    )}

                    {/* Operational Tasks Box */}
                    <div style={{ marginBottom: '20px' }}>
                        <ArriveTasksBox />
                    </div>

                    {/* Quick Standup Grid: Events & Progress, Notes, Activity */}
                    <div className="dashboard-grid">
                        {/* Active Events & Venues */}
                        <div className="widget widget-md">
                            <div className="widget-header">
                                <div className="widget-title"><FolderKanban size={16} /> Venues & Proyectos Activos</div>
                                <span className="tag tag-purple">{activeEvents.length}</span>
                            </div>
                            <div className="widget-body">
                                {activeEvents.length === 0 && (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay eventos activos</div>
                                )}
                                {activeEvents.map(event => (
                                    <div key={event.id} className="quick-link" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => navigate('/eventos')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '18px' }}>{event.icon || '📅'}</span>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{event.name}</span>
                                                {event.date && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                        {new Date(event.date + 'T12:00').toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            {tasks.filter(t => !t.done && t.eventId === event.id).length} tareas
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Progress Breakdown */}
                        {tasksByEvent.length > 0 && (
                            <div className="widget widget-md">
                                <div className="widget-header">
                                    <div className="widget-title"><Rocket size={16} /> Entregas por Venue</div>
                                </div>
                                <div className="widget-body">
                                    {tasksByEvent.map(ev => {
                                        const pct = ev.total > 0 ? Math.round((ev.done / ev.total) * 100) : 0;
                                        return (
                                            <div key={ev.id} style={{ marginBottom: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '16px' }}>{ev.icon || '📅'}</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{ev.name}</span>
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ev.done}/{ev.total} ({pct}%)</span>
                                                </div>
                                                <div style={{ height: '6px', background: 'var(--bg-canvas)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${pct}%`, height: '100%', borderRadius: '3px',
                                                        background: pct >= 100 ? 'var(--accent-green)' : (ev.color || 'var(--accent-primary)'),
                                                        transition: 'width 0.8s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Notes for Standup */}
                        <div className="widget widget-sm">
                            <div className="widget-header">
                                <div className="widget-title"><StickyNote size={16} /> Notas de la Oficina</div>
                            </div>
                            <div className="widget-body">
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <input
                                        className="form-input" placeholder="Añadir nota rápida..."
                                        style={{ flex: 1 }} value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                    />
                                    <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={handleAddNote}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {notes.map(note => (
                                    <div key={note.id} className="note-item">
                                        <div className="note-text">{note.text}</div>
                                        <div className="note-date">{note.date}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="widget widget-sm">
                            <div className="widget-header">
                                <div className="widget-title"><Clock size={16} /> Actividad Reciente</div>
                            </div>
                            <div className="widget-body">
                                {activityFeed.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Sin actividad reciente</div>
                                ) : (
                                    activityFeed.slice(0, 6).map((activity) => {
                                        const date = new Date(activity.timestamp);
                                        const diffMs = now - date;
                                        const diffMins = Math.floor(diffMs / 60000);
                                        const diffHrs = Math.floor(diffMins / 60);
                                        const diffDays = Math.floor(diffHrs / 24);
                                        let timeStr = 'Ahora';
                                        if (diffDays > 0) timeStr = `hace ${diffDays}d`;
                                        else if (diffHrs > 0) timeStr = `hace ${diffHrs}h`;
                                        else if (diffMins > 0) timeStr = `hace ${diffMins}m`;
                                        return (
                                            <div key={activity.id} className="quick-link" style={{ gap: '12px', alignItems: 'flex-start' }}>
                                                <div style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    background: activity.color || 'var(--accent-primary)', flexShrink: 0, marginTop: '6px'
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', lineHeight: 1.4, wordBreak: 'break-word' }}>{activity.text}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{timeStr}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 4: CENAS CHICAS & CONVOCATORIAS (ARRIVE MODELS)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'dinners' && (
                <div className="arrive-dinners-section animate-in">
                    <div className="arrive-venue-selector-bar">
                        <div className="arrive-bar-title">
                            <GlassWater size={16} style={{ color: '#fbbf24' }} />
                            <span>Selecciona el Venue de la Convocatoria Semanal:</span>
                        </div>
                        <div className="arrive-venue-pills">
                            {['Terraplén Rooftop', 'Furia', 'Piano Bar'].map(venue => (
                                <button
                                    key={venue}
                                    className={`arrive-venue-pill ${selectedDinnerVenue === venue ? 'active' : ''}`}
                                    onClick={() => setSelectedDinnerVenue(venue)}
                                >
                                    {venue === 'Terraplén Rooftop' && '🍸 Jueves: Terraplén Rooftop'}
                                    {venue === 'Furia' && '🔥 Viernes: Furia Panamá'}
                                    {venue === 'Piano Bar' && '🎹 Sábado: Piano Bar'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="arrive-dinner-stats-row">
                        <div className="arrive-dstat-card">
                            <div className="dstat-num">{dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue).length}</div>
                            <div className="dstat-lbl">Invitadas Registradas</div>
                        </div>
                        <div className="arrive-dstat-card highlight">
                            <div className="dstat-num">{dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue && g.status === 'confirmada').length}</div>
                            <div className="dstat-lbl">Confirmadas en Mesa</div>
                        </div>
                        <div className="arrive-dstat-card">
                            <div className="dstat-num">{dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue && g.status === 'pendiente').length}</div>
                            <div className="dstat-lbl">Pendientes WhatsApp</div>
                        </div>
                    </div>

                    <div className="arrive-dinner-grid">
                        <div className="arrive-dinner-table-card">
                            <div className="arrive-card-header">
                                <div className="arrive-card-head-title">
                                    <Users size={16} /> Lista de Invitadas & Creadoras — {selectedDinnerVenue}
                                </div>
                            </div>
                            <div className="arrive-dinner-list">
                                {dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue).map(girl => (
                                    <div key={girl.id} className="arrive-guest-item">
                                        <div className="guest-info">
                                            <span className="guest-name">{girl.name}</span>
                                            <span className="guest-ig">{girl.ig}</span>
                                            <span className="guest-type">{girl.type}</span>
                                        </div>
                                        <div className="guest-actions">
                                            <button 
                                                className={`guest-status-btn status-${girl.status}`}
                                                onClick={() => handleToggleDinnerStatus(girl.id)}
                                            >
                                                {girl.status === 'confirmada' ? '✓ Confirmada' : girl.status === 'pendiente' ? '⏳ Pendiente' : '✕ Cancelada'}
                                            </button>
                                            {girl.phone && (
                                                <a 
                                                    href={`https://wa.me/${girl.phone}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="guest-whatsapp-btn"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <Send size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="arrive-dinner-form-card">
                            <h3 className="arrive-form-title">
                                <Plus size={16} /> Convocar Nueva Invitada
                            </h3>
                            <form onSubmit={handleAddGirlToDinner} className="arrive-quickadd-form">
                                <div className="arrive-field-group">
                                    <label>Nombre de la Chica / Modelo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Sofía Martínez"
                                        value={newGirlName}
                                        onChange={(e) => setNewGirlName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="arrive-field-group">
                                    <label>Instagram Handle</label>
                                    <input 
                                        type="text" 
                                        placeholder="@ejemplo.pty"
                                        value={newGirlIG}
                                        onChange={(e) => setNewGirlIG(e.target.value)}
                                    />
                                </div>
                                <div className="arrive-field-group">
                                    <label>Teléfono (WhatsApp)</label>
                                    <input 
                                        type="text" 
                                        placeholder="50762114455"
                                        value={newGirlPhone}
                                        onChange={(e) => setNewGirlPhone(e.target.value)}
                                    />
                                </div>
                                <div className="arrive-field-group">
                                    <label>Rol en la Cena</label>
                                    <select value={newGirlType} onChange={(e) => setNewGirlType(e.target.value)}>
                                        <option value="Cena VIP & Cócteles">Cena VIP & Cócteles</option>
                                        <option value="Contenido / Stories">Contenido / Stories & UGC</option>
                                        <option value="Mesa Anfitriona">Mesa Anfitriona / Hostess</option>
                                        <option value="Cena VIP & Maridaje">Cena VIP & Maridaje</option>
                                    </select>
                                </div>
                                <button type="submit" className="arrive-btn-primary full-width" style={{ marginTop: '10px' }}>
                                    <Plus size={14} /> Registrar en Lista de {selectedDinnerVenue}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 5: PRODUCCIÓN & CONTENT PIPELINE (ARRIVE STUDIO & REDES)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'production' && (
                <div className="arrive-posts-section animate-in">
                    <div className="arrive-posts-grid">
                        <div className="arrive-posts-list-card">
                            <div className="arrive-card-header">
                                <div className="arrive-card-head-title">
                                    <Film size={16} /> Pipeline de Contenidos & Reels — ARRIVE Studio
                                </div>
                            </div>
                            <div className="arrive-posts-list">
                                {posts.map(post => (
                                    <div key={post.id} className="arrive-post-row">
                                        <div className="arrive-post-main">
                                            <div className="arrive-post-top">
                                                <span className="arrive-post-project">{post.project}</span>
                                                <span className="arrive-post-format">{post.format}</span>
                                                <span className="arrive-post-status">{post.status}</span>
                                            </div>
                                            <h4 className="arrive-post-title">{post.title}</h4>
                                            <p className="arrive-post-hook">"{post.hook}"</p>
                                        </div>
                                        <div className="arrive-post-meta">
                                            <span className="arrive-post-channel">{post.channel}</span>
                                            <span className="arrive-post-date">{post.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="arrive-post-form-card">
                            <h3 className="arrive-form-title">
                                <Plus size={16} /> Programar Contenido 4K
                            </h3>
                            <form onSubmit={handleAddPost} className="arrive-quickadd-form">
                                <div className="arrive-field-group">
                                    <label>Proyecto / Cliente</label>
                                    <select value={newPostProject} onChange={(e) => setNewPostProject(e.target.value)}>
                                        <option value="ARRIVE Agency">ARRIVE Agency HQ</option>
                                        <option value="Terraplén Rooftop">Terraplén Rooftop</option>
                                        <option value="Furia Panamá">Furia Panamá</option>
                                        <option value="Piano Bar Casco">Piano Bar Casco</option>
                                        <option value="Arrive Models">ARRIVE Models</option>
                                    </select>
                                </div>
                                <div className="arrive-field-group">
                                    <label>Título / Concepto de Video</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Golden Sunset & High Mixology"
                                        value={newPostTitle}
                                        onChange={(e) => setNewPostTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="arrive-field-group">
                                    <label>Formato</label>
                                    <select value={newPostFormat} onChange={(e) => setNewPostFormat(e.target.value)}>
                                        <option value="Reel 9:16">Reel 9:16 (4K 60fps)</option>
                                        <option value="Carrusel HD">Carrusel HD (1080x1350)</option>
                                        <option value="TikTok / UGC">TikTok / UGC Creator</option>
                                        <option value="Story Seq">Secuencia de Stories</option>
                                    </select>
                                </div>
                                <div className="arrive-field-group">
                                    <label>Fecha de Publicación</label>
                                    <input 
                                        type="date" 
                                        value={newPostDate}
                                        onChange={(e) => setNewPostDate(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="arrive-btn-primary full-width" style={{ marginTop: '10px' }}>
                                    <Plus size={14} /> Añadir al Pipeline de Producción
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 6: ESTRUCTURA & 3 DIVISIONES OFICIALES
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'structure' && (
                <div className="arrive-structure-section animate-in">
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
                            onClick={() => handleTabChange('dinners')}
                        >
                            <div className="arrive-card-head">
                                <span className="arrive-card-num card-num-nightlife">03 / EXPERIENCES</span>
                                <div className="arrive-card-icon" style={{ color: '#c084fc' }}>
                                    <Flame size={16} />
                                </div>
                            </div>
                            <div>
                                <h3 className="arrive-card-title">ARRIVE NIGHTLIFE</h3>
                                <p className="arrive-card-sub">Eventos semanales, fiestas y experiencias en los mejores spots de la ciudad.</p>
                            </div>
                            <div className="arrive-card-tags">
                                <span className="arrive-card-tag">Terraplén Rooftop</span>
                                <span className="arrive-card-tag">Furia Panamá</span>
                                <span className="arrive-card-tag">Piano Bar</span>
                            </div>
                        </div>

                        {/* 04 ARRIVE STUDIO */}
                        <div 
                            className="arrive-division-card"
                            onClick={() => handleTabChange('production')}
                        >
                            <div className="arrive-card-head">
                                <span className="arrive-card-num" style={{ color: '#fbbf24' }}>04 / PRODUCTION</span>
                                <div className="arrive-card-icon" style={{ color: '#fbbf24' }}>
                                    <Film size={16} />
                                </div>
                            </div>
                            <div>
                                <h3 className="arrive-card-title">ARRIVE STUDIO</h3>
                                <p className="arrive-card-sub">Content Days mensuales, producción de video 4K y reels para clientes y marcas aliadas.</p>
                            </div>
                            <div className="arrive-card-tags">
                                <span className="arrive-card-tag">Content Days</span>
                                <span className="arrive-card-tag">Video 4K / Drones</span>
                                <span className="arrive-card-tag">Edición & Reels</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
