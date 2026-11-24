import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Sparkles, Briefcase, Users, Flame, Film,
    CheckSquare, GlassWater, ExternalLink, Calendar,
    Share2, Plus, Check, Clock, Phone, Send,
    Instagram, ArrowRight, Layers, ShieldCheck, MapPin,
    Building2, Award, Zap, Monitor, StickyNote,
    FolderKanban, Rocket, Timer, ChevronRight,
    ChevronDown, ChevronUp, Trash2, LayoutDashboard,
    MessageSquare, CheckCircle2, UserPlus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ArriveTeamOffice, { DEFAULT_OFFICE_TEAM } from '../components/ArriveTeamOffice';
import ArriveClientManager from '../components/ArriveClientManager';
import ArriveTasksBox from '../components/ArriveTasksBox';
import { isDone } from '../lib/status';
import '../components/ArriveAgency.css';

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Tab state: default to 'overview' for immediate executive command center focus
    const currentTab = searchParams.get('tab') || 'overview';

    const { 
        events, socialMedia, tasks, toggleTask, addTask, 
        notes, addNote: cxAddNote, activityFeed, addActivity, 
        imageGirls, subscriptions 
    } = useApp();

    const [newNote, setNewNote] = useState('');
    const [now, setNow] = useState(new Date());

    // ─── Executive Overview State ───
    const [taskFilter, setTaskFilter] = useState('pending'); // 'pending' | 'all' | 'done'
    const [quickTaskText, setQuickTaskText] = useState('');
    const [quickTaskPriority, setQuickTaskPriority] = useState('high');
    const [copiedVenue, setCopiedVenue] = useState(null);

    // Quick Dinner Modal State
    const [showQuickDinnerModal, setShowQuickDinnerModal] = useState(false);
    const [quickDinnerVenue, setQuickDinnerVenue] = useState('Terraplén Rooftop');
    const [quickDinnerName, setQuickDinnerName] = useState('');
    const [quickDinnerIG, setQuickDinnerIG] = useState('');
    const [quickDinnerPhone, setQuickDinnerPhone] = useState('');
    const [quickDinnerType, setQuickDinnerType] = useState('Cena VIP & Cócteles');
    const [quickDinnerFriendsText, setQuickDinnerFriendsText] = useState('');

    // Office Team Presence State (sync with localStorage)
    const [officeTeam, setOfficeTeam] = useState(() => {
        try {
            const saved = localStorage.getItem('arrive_agency_office_team');
            if (saved) {
                const parsed = JSON.parse(saved);
                const hasOldRoles = Array.isArray(parsed) && parsed.some(m =>
                    (m.personName === 'Joshua' && m.role?.includes('Filmmaker')) ||
                    (m.personName === 'Suira' && m.role?.includes('Operations')) ||
                    (m.personName === 'Mario' && m.role?.includes('Community')) ||
                    (m.personName === 'Dalia' && m.role?.includes('Talent')) ||
                    ['Mateo L.', 'Camila S.', 'Valeria R.', 'Andrés V.'].includes(m.personName)
                );
                if (!hasOldRoles && Array.isArray(parsed) && parsed.length === 5) return parsed;
            }
        } catch (e) {}
        return DEFAULT_OFFICE_TEAM;
    });

    useEffect(() => {
        try {
            const saved = localStorage.getItem('arrive_agency_office_team');
            if (saved) {
                const parsed = JSON.parse(saved);
                const hasOldRoles = Array.isArray(parsed) && parsed.some(m =>
                    (m.personName === 'Joshua' && m.role?.includes('Filmmaker')) ||
                    (m.personName === 'Suira' && m.role?.includes('Operations')) ||
                    (m.personName === 'Mario' && m.role?.includes('Community')) ||
                    (m.personName === 'Dalia' && m.role?.includes('Talent')) ||
                    ['Mateo L.', 'Camila S.', 'Valeria R.', 'Andrés V.'].includes(m.personName)
                );
                if (!hasOldRoles && Array.isArray(parsed) && parsed.length === 5) {
                    setOfficeTeam(parsed);
                } else {
                    setOfficeTeam(DEFAULT_OFFICE_TEAM);
                }
            }
        } catch (e) {}
    }, [currentTab]);

    // Live clock for countdown
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Helper to switch tab and update URL
    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    // Helper to parse friends list text (supports "1. Name @ig", "• Name (@ig)", comma separated, etc.)
    const parseFriendsText = (text) => {
        if (!text || !text.trim()) return [];
        const lines = text
            .split(/[\n,]+/)
            .map(l => l.trim())
            .filter(Boolean);

        return lines.map((line, idx) => {
            let clean = line.replace(/^[\d\.\)\-\*•\s]+/, '').trim();
            let ig = '';
            const igMatch = clean.match(/@([\w\.\_]+)/);
            if (igMatch) {
                ig = `@${igMatch[1]}`;
                clean = clean.replace(/\(?@[\w\.\_]+\)?/, '').trim();
            }
            return {
                id: `f-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                name: clean || `Acompañante ${idx + 1}`,
                ig: ig
            };
        });
    };

    // ─── Local State for Dinner Guestlists ───
    const [selectedDinnerVenue, setSelectedDinnerVenue] = useState('Terraplén Rooftop');
    // Antes arrancaba con 8 invitadas de ejemplo; ahora solo lo que se haya cargado de verdad.
    const DEMO_GUEST_IDS = new Set(['g-1', 'g-2', 'g-3', 'g-4', 'g-5', 'g-6', 'g-7', 'g-8']);
    const [dinnerGuestlist, setDinnerGuestlist] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('os_live_dinner_guestlist') || '[]');
            return Array.isArray(parsed) ? parsed.filter(g => !DEMO_GUEST_IDS.has(g.id)) : [];
        } catch {
            return [];
        }
    });

    // Auto-save dinnerGuestlist in localStorage
    useEffect(() => {
        try {
            localStorage.setItem('os_live_dinner_guestlist', JSON.stringify(dinnerGuestlist));
        } catch (e) {}
    }, [dinnerGuestlist]);

    // Friends management state
    const [expandedFriendsGirlId, setExpandedFriendsGirlId] = useState(null);
    const [showPasteWA, setShowPasteWA] = useState(null);
    const [waText, setWaText] = useState('');
    const [newFriendName, setNewFriendName] = useState('');
    const [newFriendIG, setNewFriendIG] = useState('');
    const [copiedDoorList, setCopiedDoorList] = useState(false);

    // Form inputs for new host
    const [newGirlName, setNewGirlName] = useState('');
    const [newGirlIG, setNewGirlIG] = useState('');
    const [newGirlPhone, setNewGirlPhone] = useState('');
    const [newGirlType, setNewGirlType] = useState('Cena VIP & Cócteles');
    const [newGirlFriendsText, setNewGirlFriendsText] = useState('');

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

    // Add single friend to a girl
    const handleAddSingleFriend = (e, girlId) => {
        e.preventDefault();
        if (!newFriendName.trim()) return;

        const friend = {
            id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: newFriendName.trim(),
            ig: newFriendIG.trim() ? (newFriendIG.startsWith('@') ? newFriendIG.trim() : `@${newFriendIG.trim()}`) : ''
        };

        setDinnerGuestlist(prev => prev.map(girl => {
            if (girl.id === girlId) {
                return { ...girl, friends: [...(girl.friends || []), friend] };
            }
            return girl;
        }));

        if (addActivity) {
            const host = dinnerGuestlist.find(g => g.id === girlId);
            addActivity(`Añadida amiga (${friend.name}) al grupo de ${host?.name || 'la mesa'}`, '#a855f7');
        }

        setNewFriendName('');
        setNewFriendIG('');
    };

    // Remove single friend from a girl
    const handleRemoveFriend = (girlId, friendId) => {
        setDinnerGuestlist(prev => prev.map(girl => {
            if (girl.id === girlId) {
                return {
                    ...girl,
                    friends: (girl.friends || []).filter(f => f.id !== friendId)
                };
            }
            return girl;
        }));
    };

    // Process pasted WhatsApp text
    const handleProcessWaText = (girlId) => {
        if (!waText.trim()) return;
        const parsed = parseFriendsText(waText);
        if (parsed.length === 0) return;

        setDinnerGuestlist(prev => prev.map(girl => {
            if (girl.id === girlId) {
                return {
                    ...girl,
                    friends: [...(girl.friends || []), ...parsed]
                };
            }
            return girl;
        }));

        if (addActivity) {
            const host = dinnerGuestlist.find(g => g.id === girlId);
            addActivity(`Procesadas ${parsed.length} amigas de WhatsApp para ${host?.name || 'la mesa'}`, '#10b981');
        }

        setWaText('');
        setShowPasteWA(null);
    };

    // Delete a host girl
    const handleDeleteGirl = (girlId) => {
        const host = dinnerGuestlist.find(g => g.id === girlId);
        if (window.confirm(`¿Seguro que deseas eliminar a ${host?.name || 'esta invitada'} y sus acompañantes de la lista?`)) {
            setDinnerGuestlist(prev => prev.filter(g => g.id !== girlId));
            if (addActivity) {
                addActivity(`Eliminada invitada de cena: ${host?.name || girlId}`, '#ef4444');
            }
        }
    };

    // Copy Door Guestlist for WhatsApp / Concierge
    const handleCopyDoorList = () => {
        const venueGuests = dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue);
        const totalHosts = venueGuests.length;
        const totalFriends = venueGuests.reduce((acc, g) => acc + (g.friends?.length || 0), 0);
        const totalPax = totalHosts + totalFriends;
        const dayLabel = selectedDinnerVenue.includes('Terraplén') ? 'Jueves 8:30 PM' : selectedDinnerVenue.includes('Furia') ? 'Viernes 9:00 PM' : 'Sábado 9:30 PM';

        let text = `🍸 *LISTA OFICIAL DE CENA — ${selectedDinnerVenue.toUpperCase()}*\n`;
        text += `📅 *Fecha/Hora:* ${dayLabel}\n`;
        text += `👥 *Total en Mesa:* ${totalPax} Chicas (${totalHosts} Hosts + ${totalFriends} Amigas)\n`;
        text += `────────────────────────────\n`;

        venueGuests.forEach((girl, i) => {
            const statusIcon = girl.status === 'confirmada' ? '✅' : girl.status === 'pendiente' ? '⏳' : '❌';
            text += `${i + 1}. *${girl.name}* (${girl.ig || 'Sin IG'}) [${girl.status.toUpperCase()}] ${statusIcon}\n`;
            if (girl.friends && girl.friends.length > 0) {
                girl.friends.forEach(f => {
                    text += `   ↳ ${f.name}${f.ig ? ` (${f.ig})` : ''}\n`;
                });
            }
        });

        text += `────────────────────────────\n`;
        text += `✨ *ARRIVE Nightlife & Talent Operations*`;

        navigator.clipboard.writeText(text);
        setCopiedDoorList(true);
        if (addActivity) {
            addActivity(`Copiada lista de puerta para ${selectedDinnerVenue} (${totalPax} pax)`, '#10b981');
        }
        setTimeout(() => setCopiedDoorList(false), 3000);
    };

    // Add girl to dinner
    const handleAddGirlToDinner = (e) => {
        e.preventDefault();
        if (!newGirlName.trim()) return;

        const initialFriends = parseFriendsText(newGirlFriendsText);

        const newEntry = {
            id: `g-${Date.now()}`,
            name: newGirlName.trim(),
            ig: newGirlIG ? (newGirlIG.startsWith('@') ? newGirlIG : `@${newGirlIG}`) : '',
            phone: newGirlPhone.replace(/[^0-9]/g, ''),
            type: newGirlType,
            venue: selectedDinnerVenue,
            day: selectedDinnerVenue.includes('Terraplén') ? 'Jueves 8:30 PM' : selectedDinnerVenue.includes('Furia') ? 'Viernes 9:00 PM' : 'Sábado 9:30 PM',
            status: 'pendiente',
            friends: initialFriends
        };

        setDinnerGuestlist([newEntry, ...dinnerGuestlist]);
        if (addActivity) {
            addActivity(`Agregada invitada a cena (${selectedDinnerVenue}): ${newGirlName}${initialFriends.length > 0 ? ` (+${initialFriends.length} amigas)` : ''}`, '#fbbf24');
        }

        setNewGirlName('');
        setNewGirlIG('');
        setNewGirlPhone('');
        setNewGirlFriendsText('');
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
    const allAppTasks = tasks || [];
    const pendingTasksList = allAppTasks.filter(t => !isDone(t) && !t.done);
    const completedTasksList = allAppTasks.filter(t => isDone(t) || t.done);
    const filteredTaskList = taskFilter === 'pending' 
        ? pendingTasksList 
        : taskFilter === 'done' 
            ? completedTasksList 
            : allAppTasks;
    const totalTalent = imageGirls?.length || 8;
    const contentTasksCount = posts.length || 5;

    // Helper to calculate pax & confirmations for a dinner venue
    const getVenuePax = (venueName) => {
        const guests = dinnerGuestlist.filter(g => g.venue === venueName);
        const hosts = guests.length;
        const friends = guests.reduce((acc, g) => acc + (g.friends?.length || 0), 0);
        const confirmed = guests.filter(g => g.status === 'confirmada').length;
        return { guests, hosts, friends, total: hosts + friends, confirmed };
    };

    // Quick copy door list with feedback
    const handleQuickCopyDoorList = (venueName) => {
        const venueGuests = dinnerGuestlist.filter(g => g.venue === venueName);
        const totalHosts = venueGuests.length;
        const totalFriends = venueGuests.reduce((acc, g) => acc + (g.friends?.length || 0), 0);
        const totalPax = totalHosts + totalFriends;
        const dayLabel = venueName.includes('Terraplén') ? 'Jueves 8:30 PM' : venueName.includes('Furia') ? 'Viernes 9:00 PM' : 'Sábado 9:30 PM';

        let text = `🍸 *LISTA OFICIAL DE CENA — ${venueName.toUpperCase()}*\n`;
        text += `📅 *Fecha/Hora:* ${dayLabel}\n`;
        text += `👥 *Total en Mesa:* ${totalPax} Chicas (${totalHosts} Hosts + ${totalFriends} Amigas)\n`;
        text += `────────────────────────────\n`;

        venueGuests.forEach((girl, i) => {
            const statusIcon = girl.status === 'confirmada' ? '✅' : girl.status === 'pendiente' ? '⏳' : '❌';
            text += `${i + 1}. *${girl.name}* (${girl.ig || 'Sin IG'}) [${girl.status.toUpperCase()}] ${statusIcon}\n`;
            if (girl.friends && girl.friends.length > 0) {
                girl.friends.forEach(f => {
                    text += `   ↳ ${f.name}${f.ig ? ` (${f.ig})` : ''}\n`;
                });
            }
        });

        text += `────────────────────────────\n`;
        text += `✨ *ARRIVE Nightlife & Talent Operations*`;

        navigator.clipboard.writeText(text);
        setCopiedVenue(venueName);
        if (addActivity) {
            addActivity(`Copiada lista de puerta para ${venueName} (${totalPax} pax)`, '#10b981');
        }
        setTimeout(() => setCopiedVenue(null), 3000);
    };

    // Quick add task directly from Overview
    const handleAddQuickTask = async (e) => {
        if (e) e.preventDefault();
        if (!quickTaskText.trim()) return;

        const newTask = {
            id: `task-${Date.now()}`,
            text: quickTaskText.trim(),
            done: false,
            priority: quickTaskPriority,
            category: 'Urgente',
            createdAt: new Date().toISOString()
        };

        await addTask(newTask);
        if (addActivity) {
            addActivity(`Nueva tarea rápida añadida: "${newTask.text}"`, '#fbbf24');
        }
        setQuickTaskText('');
    };

    // Quick add dinner host from modal
    const handleQuickAddDinnerHost = (e) => {
        e.preventDefault();
        if (!quickDinnerName.trim()) return;

        const initialFriends = parseFriendsText(quickDinnerFriendsText);

        const newEntry = {
            id: `g-${Date.now()}`,
            name: quickDinnerName.trim(),
            ig: quickDinnerIG ? (quickDinnerIG.startsWith('@') ? quickDinnerIG : `@${quickDinnerIG}`) : '',
            phone: quickDinnerPhone.replace(/[^0-9]/g, ''),
            type: quickDinnerType,
            venue: quickDinnerVenue,
            day: quickDinnerVenue.includes('Terraplén') ? 'Jueves 8:30 PM' : quickDinnerVenue.includes('Furia') ? 'Viernes 9:00 PM' : 'Sábado 9:30 PM',
            status: 'pendiente',
            friends: initialFriends
        };

        setDinnerGuestlist([newEntry, ...dinnerGuestlist]);
        if (addActivity) {
            addActivity(`Convocada invitada VIP (${quickDinnerVenue}): ${quickDinnerName}${initialFriends.length > 0 ? ` (+${initialFriends.length} amigas)` : ''}`, '#fbbf24');
        }

        setQuickDinnerName('');
        setQuickDinnerIG('');
        setQuickDinnerPhone('');
        setQuickDinnerFriendsText('');
        setShowQuickDinnerModal(false);
    };

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
               UNIFIED MASTER HERO HEADER: ARRIVE AGENCY COMMAND CENTER HQ
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="arrive-hero-header">
                <div className="arrive-hero-topline">
                    <div className="arrive-hero-brand">
                        <div className="arrive-hero-logo">
                            <span>A</span>
                        </div>
                        <div className="arrive-hero-titles">
                            <h1>
                                ARRIVE AGENCY <span className="gold-highlight">COMMAND CENTER HQ</span>
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
                    <div className={`arrive-metric-item ${currentTab === 'overview' ? 'active-metric' : ''}`} onClick={() => handleTabChange('overview')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <LayoutDashboard size={12} style={{ color: '#fbbf24' }} /> Panel Ejecutivo
                        </div>
                        <div className="arrive-metric-val">
                            Resumen HQ <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>visión 360°</span>
                        </div>
                    </div>

                    <div className={`arrive-metric-item ${currentTab === 'dinners' ? 'active-metric' : ''}`} onClick={() => handleTabChange('dinners')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <GlassWater size={12} style={{ color: '#f472b6' }} /> Convocatorias Cenas
                        </div>
                        <div className="arrive-metric-val">
                            {totalTalent} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>invitadas VIP</span>
                        </div>
                    </div>

                    <div className={`arrive-metric-item ${currentTab === 'clients' ? 'active-metric' : ''}`} onClick={() => handleTabChange('clients')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <Building2 size={12} style={{ color: '#60a5fa' }} /> Clientes & Retainers
                        </div>
                        <div className="arrive-metric-val">
                            3 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>Terraplén · Furia · Piano</span>
                        </div>
                    </div>

                    <div className={`arrive-metric-item ${currentTab === 'standup' ? 'active-metric' : ''}`} onClick={() => handleTabChange('standup')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <CheckSquare size={12} style={{ color: '#34d399' }} /> Tareas Pendientes
                        </div>
                        <div className="arrive-metric-val">
                            {pendingTasksList.length} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>por completar hoy</span>
                        </div>
                    </div>

                    <div className={`arrive-metric-item ${currentTab === 'office' ? 'active-metric' : ''}`} onClick={() => handleTabChange('office')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <Monitor size={12} style={{ color: '#10b981' }} /> Equipo en Oficina
                        </div>
                        <div className="arrive-metric-val">
                            5 <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>estaciones activas</span>
                        </div>
                    </div>

                    <div className={`arrive-metric-item ${currentTab === 'production' ? 'active-metric' : ''}`} onClick={() => handleTabChange('production')} style={{ cursor: 'pointer' }}>
                        <div className="arrive-metric-label">
                            <Film size={12} style={{ color: '#c084fc' }} /> Posts & Pipeline 4K
                        </div>
                        <div className="arrive-metric-val">
                            {contentTasksCount} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>en producción</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               DIRECT AGENCY MANAGEMENT TABS
               ═══════════════════════════════════════════════════════════════════ */}
            <div className="arrive-tab-nav">
                <button 
                    className={`arrive-tab-btn ${currentTab === 'overview' ? 'active' : ''}`}
                    onClick={() => handleTabChange('overview')}
                >
                    <LayoutDashboard size={14} /> 🌟 Resumen Ejecutivo
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'dinners' ? 'active' : ''}`}
                    onClick={() => handleTabChange('dinners')}
                >
                    <GlassWater size={14} /> 🍸 Cenas & Convocatorias
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
                    <Zap size={14} /> ⚡ Daily Standup & Tareas
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'office' ? 'active' : ''}`}
                    onClick={() => handleTabChange('office')}
                >
                    <Monitor size={14} /> 🏢 Oficina & Equipo HQ
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'production' ? 'active' : ''}`}
                    onClick={() => handleTabChange('production')}
                >
                    <Film size={14} /> 🎬 Producción & Pipeline 4K
                </button>
                <button 
                    className={`arrive-tab-btn ${currentTab === 'structure' ? 'active' : ''}`}
                    onClick={() => handleTabChange('structure')}
                >
                    <Layers size={14} /> 🏛️ Estructura & 3 Divisiones
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
               TAB 0: RESUMEN EJECUTIVO (COMMAND CENTER HQ OVERVIEW)
               ═══════════════════════════════════════════════════════════════════ */}
            {currentTab === 'overview' && (
                <div className="arrive-exec-dashboard animate-in">
                    {/* 1-Click Quick Actions Bar */}
                    <div className="arrive-quick-actions-bar">
                        <div className="arrive-quick-action-label">
                            <Zap size={13} /> Acciones Rápidas:
                        </div>
                        <button 
                            type="button" 
                            className="arrive-action-btn gold"
                            onClick={() => setShowQuickDinnerModal(true)}
                        >
                            <GlassWater size={13} /> + Convocar Cena VIP
                        </button>
                        <button 
                            type="button" 
                            className="arrive-action-btn emerald"
                            onClick={() => {
                                const el = document.getElementById('exec-quick-task-input');
                                if (el) {
                                    el.focus();
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        >
                            <Plus size={13} /> + Tarea Rápida
                        </button>
                        <button 
                            type="button" 
                            className="arrive-action-btn purple"
                            onClick={() => handleQuickCopyDoorList('Terraplén Rooftop')}
                            title="Copiar lista oficial de puerta para Terraplén Rooftop"
                        >
                            {copiedVenue === 'Terraplén Rooftop' ? <Check size={13} style={{ color: '#34d399' }} /> : <Share2 size={13} />}
                            <span>{copiedVenue === 'Terraplén Rooftop' ? '✓ Terraplén Copiada' : '📋 Copiar Terraplén (Jueves)'}</span>
                        </button>
                        <button 
                            type="button" 
                            className="arrive-action-btn"
                            onClick={() => handleQuickCopyDoorList('Furia')}
                            title="Copiar lista oficial de puerta para Furia"
                        >
                            {copiedVenue === 'Furia' ? <Check size={13} style={{ color: '#34d399' }} /> : <Share2 size={13} />}
                            <span>{copiedVenue === 'Furia' ? '✓ Furia Copiada' : '📋 Copiar Furia (Viernes)'}</span>
                        </button>
                        <button 
                            type="button" 
                            className="arrive-action-btn"
                            onClick={() => navigate('/whatsapp-agent')}
                        >
                            <Send size={13} style={{ color: '#a855f7' }} /> Agente de Difusión
                        </button>
                        <button 
                            type="button" 
                            className="arrive-action-btn"
                            onClick={() => handleTabChange('clients')}
                        >
                            <Building2 size={13} style={{ color: '#60a5fa' }} /> Ver Clientes 360°
                        </button>
                    </div>

                    {/* Responsive 2-Column Grid */}
                    <div className="arrive-exec-grid">
                        {/* Left / Primary Column */}
                        <div className="arrive-exec-col">
                            {/* 1. Radar Semanal: 3 Cenas VIP & Convocatorias */}
                            <div className="arrive-exec-card gold-border">
                                <div className="arrive-exec-card-header">
                                    <div className="arrive-exec-card-title">
                                        <GlassWater size={17} style={{ color: '#fbbf24' }} />
                                        <span>Radar Semanal: 3 Cenas VIP & Convocatorias</span>
                                        <span className="arrive-pill arrive-pill-gold" style={{ fontSize: '10px' }}>Esta Semana</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="arrive-exec-link-btn"
                                        onClick={() => handleTabChange('dinners')}
                                    >
                                        Gestionar Todas las Cenas <ArrowRight size={12} />
                                    </button>
                                </div>

                                <div className="arrive-dinner-radar-grid">
                                    {[
                                        { venue: 'Terraplén Rooftop', day: 'Jueves 8:30 PM', dayClass: 'terraplen', icon: '🍸' },
                                        { venue: 'Furia', day: 'Viernes 9:00 PM', dayClass: 'furia', icon: '🔥' },
                                        { venue: 'Piano Bar', day: 'Sábado 9:30 PM', dayClass: 'piano', icon: '🎹' }
                                    ].map(item => {
                                        const stats = getVenuePax(item.venue);
                                        const isCopied = copiedVenue === item.venue;
                                        return (
                                            <div key={item.venue} className="arrive-radar-venue-box">
                                                <div>
                                                    <div className="radar-venue-top">
                                                        <div className="radar-venue-name">
                                                            <span>{item.icon}</span> {item.venue}
                                                        </div>
                                                        <span className={`radar-venue-day ${item.dayClass}`}>
                                                            {item.day.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                        {item.day}
                                                    </div>
                                                </div>

                                                <div className="radar-venue-stats">
                                                    <div className="radar-pax-num">
                                                        {stats.total} <span>pax ({stats.hosts}h + {stats.friends}a)</span>
                                                    </div>
                                                    <span className="radar-status-badge">
                                                        {stats.confirmed}/{stats.hosts} Conf.
                                                    </span>
                                                </div>

                                                <div className="radar-actions-row">
                                                    <button
                                                        type="button"
                                                        className={`radar-copy-btn ${isCopied ? 'copied' : ''}`}
                                                        onClick={() => handleQuickCopyDoorList(item.venue)}
                                                        title="Copiar lista formateada para WhatsApp"
                                                    >
                                                        {isCopied ? <Check size={11} /> : <Share2 size={11} />}
                                                        <span>{isCopied ? '¡Copiada!' : 'Copiar Lista'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="radar-view-btn"
                                                        onClick={() => {
                                                            setSelectedDinnerVenue(item.venue);
                                                            handleTabChange('dinners');
                                                        }}
                                                        title="Gestionar mesa y acompañantes"
                                                    >
                                                        <ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Widget Interactivo: Mis Tareas de Hoy */}
                            <div className="arrive-exec-card">
                                <div className="arrive-exec-card-header">
                                    <div className="arrive-exec-card-title">
                                        <CheckSquare size={17} style={{ color: '#34d399' }} />
                                        <span>Tareas Prioritarias de Hoy</span>
                                        <span className="arrive-pill arrive-pill-live" style={{ fontSize: '10px' }}>
                                            {pendingTasksList.length} pendientes
                                        </span>
                                    </div>
                                    <div className="arrive-task-filters">
                                        <button 
                                            type="button" 
                                            className={`arrive-filter-chip ${taskFilter === 'pending' ? 'active' : ''}`}
                                            onClick={() => setTaskFilter('pending')}
                                        >
                                            Pendientes ({pendingTasksList.length})
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`arrive-filter-chip ${taskFilter === 'all' ? 'active' : ''}`}
                                            onClick={() => setTaskFilter('all')}
                                        >
                                            Todas ({allAppTasks.length})
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`arrive-filter-chip ${taskFilter === 'done' ? 'active' : ''}`}
                                            onClick={() => setTaskFilter('done')}
                                        >
                                            Hechas ({completedTasksList.length})
                                        </button>
                                        <button
                                            type="button"
                                            className="arrive-exec-link-btn"
                                            style={{ marginLeft: '4px' }}
                                            onClick={() => handleTabChange('standup')}
                                        >
                                            Standup 360° <ArrowRight size={11} />
                                        </button>
                                    </div>
                                </div>

                                <div className="arrive-tasks-interactive-list">
                                    {filteredTaskList.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                            {taskFilter === 'pending' ? '🎉 ¡Todas las tareas pendientes están al día!' : 'No hay tareas en esta vista.'}
                                        </div>
                                    ) : (
                                        filteredTaskList.slice(0, 8).map(task => {
                                            const done = isDone(task) || task.done;
                                            const priority = (task.priority || 'medium').toLowerCase();
                                            return (
                                                <div key={task.id} className={`arrive-task-row ${done ? 'done' : ''}`}>
                                                    <div className="arrive-task-main">
                                                        <div 
                                                            className={`arrive-task-checkbox ${done ? 'checked' : ''}`}
                                                            onClick={() => toggleTask(task.id)}
                                                            title={done ? 'Marcar como pendiente' : 'Marcar como completada'}
                                                        >
                                                            {done && <Check size={12} strokeWidth={3} />}
                                                        </div>
                                                        <span 
                                                            className="arrive-task-text"
                                                            onClick={() => toggleTask(task.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {task.text || task.title}
                                                        </span>
                                                    </div>
                                                    <div className="arrive-task-meta">
                                                        {task.category && (
                                                            <span style={{ fontSize: '10.5px', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                {task.category}
                                                            </span>
                                                        )}
                                                        <span className={`arrive-priority-tag ${priority}`}>
                                                            {priority === 'critical' ? 'Crítica' : priority === 'high' ? 'Alta' : 'Normal'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Quick Add Inline Form */}
                                <form onSubmit={handleAddQuickTask} className="arrive-quick-task-input-bar">
                                    <input
                                        id="exec-quick-task-input"
                                        type="text"
                                        placeholder="+ Agregar tarea urgente para hoy y presiona Enter..."
                                        value={quickTaskText}
                                        onChange={(e) => setQuickTaskText(e.target.value)}
                                    />
                                    <select 
                                        value={quickTaskPriority} 
                                        onChange={(e) => setQuickTaskPriority(e.target.value)}
                                    >
                                        <option value="high">Prioridad Alta</option>
                                        <option value="critical">Crítica 🚨</option>
                                        <option value="medium">Normal</option>
                                    </select>
                                    <button type="submit" className="arrive-quick-task-btn">
                                        <Plus size={13} /> Añadir
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right / Secondary Column */}
                        <div className="arrive-exec-col">
                            {/* 1. Presencia del Equipo Activo (Compact & Clean) */}
                            <div className="arrive-exec-card">
                                <div className="arrive-exec-card-header">
                                    <div className="arrive-exec-card-title">
                                        <Users size={17} style={{ color: '#60a5fa' }} />
                                        <span>Equipo Activo HQ</span>
                                        <span className="arrive-pill arrive-pill-live" style={{ fontSize: '10px' }}>
                                            5 Estaciones
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="arrive-exec-link-btn"
                                        onClick={() => handleTabChange('office')}
                                    >
                                        Estaciones & Specs <ArrowRight size={12} />
                                    </button>
                                </div>

                                <div className="arrive-compact-team-list">
                                    {officeTeam.slice(0, 5).map(member => (
                                        <div key={member.id} className="arrive-compact-member-row">
                                            <div className="arrive-member-main">
                                                <div className="arrive-member-avatar">{member.avatar || '👤'}</div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="arrive-member-name">{member.personName}</div>
                                                    <div className="arrive-member-role" title={member.currentFocus || member.role}>
                                                        {member.currentFocus ? `🎯 ${member.currentFocus}` : member.role}
                                                    </div>
                                                </div>
                                            </div>
                                            <span 
                                                className="arrive-presence-pill" 
                                                style={{ color: member.statusColor || '#10b981', borderColor: `${member.statusColor || '#10b981'}40` }}
                                            >
                                                <span className="arrive-presence-dot" style={{ background: member.statusColor || '#10b981' }}></span>
                                                {member.status || 'En Oficina'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Resumen Clientes & Retainers Activos */}
                            <div className="arrive-exec-card">
                                <div className="arrive-exec-card-header">
                                    <div className="arrive-exec-card-title">
                                        <Building2 size={17} style={{ color: '#fbbf24' }} />
                                        <span>Clientes & Retainers 360°</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="arrive-exec-link-btn"
                                        onClick={() => handleTabChange('clients')}
                                    >
                                        Administrar 360° <ArrowRight size={12} />
                                    </button>
                                </div>

                                <div className="arrive-compact-retainers-list">
                                    {[
                                        { name: 'Terraplén Rooftop', service: 'Social Media, Cenas VIP & Atardeceres', fee: 'Retainer Activo', icon: '🍸' },
                                        { name: 'Furia Panamá', service: 'Nightlife, Creadores & Dinner Party', fee: 'Retainer Activo', icon: '🔥' },
                                        { name: 'Piano Bar Casco', service: 'Live Jazz, Speakeasy & Contenido', fee: 'Retainer Activo', icon: '🎹' }
                                    ].map(c => (
                                        <div 
                                            key={c.name} 
                                            className="arrive-retainer-item" 
                                            onClick={() => handleTabChange('clients')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div>
                                                <div className="retainer-venue-title">
                                                    {c.icon} {c.name}
                                                </div>
                                                <div className="retainer-service-sub">
                                                    {c.service}
                                                </div>
                                            </div>
                                            <span className="retainer-active-tag">
                                                {c.fee}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Próximo Hito / Evento Countdown Mini */}
                            {nextEvent && countdown && (
                                <div 
                                    onClick={() => navigate('/eventos')} 
                                    className="arrive-exec-card" 
                                    style={{ 
                                        cursor: 'pointer',
                                        borderColor: `${nextEvent.color}40`,
                                        background: `linear-gradient(135deg, ${nextEvent.color}15 0%, #0d0d14 100%)`
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: nextEvent.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Timer size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Próximo Evento / Hito
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            {nextEvent.date}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>{nextEvent.icon || '📅'}</span> {nextEvent.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[
                                            { val: countdown.days, label: 'D' },
                                            { val: countdown.hours, label: 'H' },
                                            { val: countdown.mins, label: 'M' },
                                            { val: countdown.secs, label: 'S' }
                                        ].map(({ val, label }) => (
                                            <div key={label} style={{ flex: 1, textAlign: 'center', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ fontSize: '16px', fontWeight: 800, color: nextEvent.color }}>{String(val).padStart(2, '0')}</div>
                                                <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Dinner Host Modal */}
                    {showQuickDinnerModal && (
                        <div className="arrive-modal-backdrop" onClick={() => setShowQuickDinnerModal(false)}>
                            <div className="arrive-quick-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="arrive-card-header" style={{ marginBottom: '14px' }}>
                                    <div className="arrive-card-head-title" style={{ color: '#fbbf24', fontSize: '16px' }}>
                                        <GlassWater size={18} /> Convocar Chica / Mesa VIP
                                    </div>
                                    <button 
                                        type="button" 
                                        className="arrive-btn-text" 
                                        onClick={() => setShowQuickDinnerModal(false)}
                                        style={{ fontSize: '16px', padding: '2px 8px' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleQuickAddDinnerHost} className="arrive-quickadd-form">
                                    <div className="arrive-field-group">
                                        <label>Venue de la Convocatoria</label>
                                        <select 
                                            value={quickDinnerVenue} 
                                            onChange={(e) => setQuickDinnerVenue(e.target.value)}
                                        >
                                            <option value="Terraplén Rooftop">🍸 Terraplén Rooftop (Jueves 8:30 PM)</option>
                                            <option value="Furia">🔥 Furia Panamá (Viernes 9:00 PM)</option>
                                            <option value="Piano Bar">🎹 Piano Bar Casco (Sábado 9:30 PM)</option>
                                        </select>
                                    </div>

                                    {Array.isArray(imageGirls) && imageGirls.length > 0 && (
                                        <div className="arrive-field-group">
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>⚡ Autocompletar desde ARRIVE Models</span>
                                                <span style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: 600 }}>{imageGirls.length} disponibles</span>
                                            </label>
                                            <select 
                                                defaultValue=""
                                                onChange={(e) => {
                                                    const selected = imageGirls.find(g => g.id === e.target.value);
                                                    if (selected) {
                                                        setQuickDinnerName(selected.name || '');
                                                        setQuickDinnerIG(selected.ig || '');
                                                        setQuickDinnerPhone(selected.phone || '');
                                                        if (selected.type) setQuickDinnerType(selected.type);
                                                    }
                                                    e.target.value = '';
                                                }}
                                            >
                                                <option value="">-- Seleccionar de Directorio --</option>
                                                {imageGirls.map(g => (
                                                    <option key={g.id} value={g.id}>
                                                        👑 {g.name} {g.ig ? `(${g.ig})` : ''} — {g.type || 'Modelo'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="arrive-field-group">
                                        <label>Nombre de la Chica / Host</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Sofía Martínez"
                                            value={quickDinnerName}
                                            onChange={(e) => setQuickDinnerName(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="arrive-field-group">
                                            <label>Instagram</label>
                                            <input 
                                                type="text" 
                                                placeholder="@ejemplo.pty"
                                                value={quickDinnerIG}
                                                onChange={(e) => setQuickDinnerIG(e.target.value)}
                                            />
                                        </div>
                                        <div className="arrive-field-group">
                                            <label>WhatsApp (Teléfono)</label>
                                            <input 
                                                type="text" 
                                                placeholder="50762114455"
                                                value={quickDinnerPhone}
                                                onChange={(e) => setQuickDinnerPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="arrive-field-group">
                                        <label>Rol en la Mesa</label>
                                        <select 
                                            value={quickDinnerType} 
                                            onChange={(e) => setQuickDinnerType(e.target.value)}
                                        >
                                            <option value="Cena VIP & Cócteles">Cena VIP & Cócteles</option>
                                            <option value="Contenido / Stories">Contenido / Stories & UGC</option>
                                            <option value="Mesa Anfitriona">Mesa Anfitriona / Hostess</option>
                                            <option value="Cena VIP & Maridaje">Cena VIP & Maridaje</option>
                                        </select>
                                    </div>

                                    <div className="arrive-field-group">
                                        <label>Acompañantes / Amigas (Opcional)</label>
                                        <textarea 
                                            placeholder="Pega la lista de WhatsApp o escribe: Andrea @andrea, Sofia @sofi"
                                            value={quickDinnerFriendsText}
                                            onChange={(e) => setQuickDinnerFriendsText(e.target.value)}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="arrive-modal-footer" style={{ marginTop: '14px' }}>
                                        <button 
                                            type="button" 
                                            className="arrive-btn-cancel"
                                            onClick={() => setShowQuickDinnerModal(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="arrive-btn-primary"
                                        >
                                            <Plus size={13} /> Confirmar Convocatoria
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

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

                    {/* Venue Stats Row with Total Pax Breakdown */}
                    {(() => {
                        const venueGuests = dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue);
                        const totalHosts = venueGuests.length;
                        const totalFriends = venueGuests.reduce((acc, g) => acc + (g.friends?.length || 0), 0);
                        const totalPax = totalHosts + totalFriends;
                        const confirmedHosts = venueGuests.filter(g => g.status === 'confirmada').length;

                        return (
                            <div className="arrive-dinner-stats-row">
                                <div className="arrive-dstat-card highlight">
                                    <div className="dstat-num" style={{ color: '#fbbf24' }}>{totalPax}</div>
                                    <div className="dstat-lbl">Total en Mesa (Pax)</div>
                                </div>
                                <div className="arrive-dstat-card">
                                    <div className="dstat-num">{totalHosts}</div>
                                    <div className="dstat-lbl">Hosts Registradas</div>
                                </div>
                                <div className="arrive-dstat-card">
                                    <div className="dstat-num" style={{ color: '#c084fc' }}>+{totalFriends}</div>
                                    <div className="dstat-lbl">Amigas / +1s</div>
                                </div>
                                <div className="arrive-dstat-card">
                                    <div className="dstat-num" style={{ color: '#34d399' }}>{confirmedHosts}</div>
                                    <div className="dstat-lbl">Confirmadas</div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="arrive-dinners-split-layout">
                        <div className="arrive-dinner-table-card">
                            {(() => {
                                const venueGuests = dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue);
                                const totalHosts = venueGuests.length;
                                const totalFriends = venueGuests.reduce((acc, g) => acc + (g.friends?.length || 0), 0);
                                const totalPax = totalHosts + totalFriends;

                                return (
                                    <div className="arrive-card-header">
                                        <div className="arrive-card-head-title">
                                            <Users size={16} /> Lista de Invitadas & Creadoras — {selectedDinnerVenue}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="arrive-copy-door-btn"
                                                onClick={handleCopyDoorList}
                                                title="Copiar lista oficial para enviar por WhatsApp al venue / cadenero"
                                            >
                                                {copiedDoorList ? <Check size={12} style={{ color: '#34d399' }} /> : <Share2 size={12} />}
                                                <span>{copiedDoorList ? '✓ Lista Copiada' : '📋 Copiar Lista de Puerta'}</span>
                                            </button>
                                            <span className="arrive-pill arrive-pill-gold">
                                                {totalPax} Pax ({totalHosts} Hosts + {totalFriends} Amigas)
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="arrive-dinner-list">
                                {dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue).length === 0 ? (
                                    <div className="arrive-empty-placeholder">
                                        No hay invitadas registradas para {selectedDinnerVenue} aún. ¡Usa el formulario a la derecha!
                                    </div>
                                ) : (
                                    dinnerGuestlist.filter(g => g.venue === selectedDinnerVenue).map(girl => {
                                        const friendsCount = girl.friends?.length || 0;
                                        const isExpanded = expandedFriendsGirlId === girl.id;

                                        return (
                                            <div key={girl.id} className="arrive-guest-card">
                                                <div className="arrive-guest-item">
                                                    <div className="guest-info">
                                                        <span className="guest-name">{girl.name}</span>
                                                        {girl.ig && <span className="guest-ig">{girl.ig}</span>}
                                                        <span className="guest-type">{girl.type}</span>

                                                        {/* Botón para expandir y gestionar amigas */}
                                                        <button 
                                                            type="button"
                                                            className={`arrive-friends-toggle-btn ${isExpanded ? 'active' : ''} ${friendsCount > 0 ? 'has-friends' : ''}`}
                                                            onClick={() => setExpandedFriendsGirlId(isExpanded ? null : girl.id)}
                                                            title="Ver y gestionar lista de amigas acompañantes"
                                                        >
                                                            <Users size={12} />
                                                            <span>{friendsCount > 0 ? `👯‍♀️ ${friendsCount} Amiga${friendsCount > 1 ? 's' : ''}` : '+ Lista de Amigas'}</span>
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                    </div>

                                                    <div className="guest-actions">
                                                        <button 
                                                            className={`guest-status-btn status-${girl.status}`}
                                                            onClick={() => handleToggleDinnerStatus(girl.id)}
                                                            title="Cambiar estado de confirmación"
                                                        >
                                                            {girl.status === 'confirmada' ? '✓ Confirmada' : girl.status === 'pendiente' ? '⏳ Pendiente' : '✕ Cancelada'}
                                                        </button>
                                                        {girl.phone && (
                                                            <a 
                                                                href={`https://wa.me/${girl.phone}`} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="guest-whatsapp-btn"
                                                                title="Enviar WhatsApp directo"
                                                            >
                                                                <Send size={12} /> WhatsApp
                                                            </a>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="guest-delete-btn"
                                                            onClick={() => handleDeleteGirl(girl.id)}
                                                            title="Eliminar de la lista"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Previsualización rápida de amigas si está cerrado */}
                                                {!isExpanded && friendsCount > 0 && (
                                                    <div className="arrive-friends-inline-preview" onClick={() => setExpandedFriendsGirlId(girl.id)}>
                                                        <span className="preview-label">Acompañantes:</span>
                                                        {girl.friends.map((f, i) => (
                                                            <span key={f.id || i} className="preview-chip">
                                                                {f.name} {f.ig ? `(${f.ig})` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Panel Expandible de Lista de Amigas */}
                                                {isExpanded && (
                                                    <div className="arrive-friends-drawer animate-in">
                                                        <div className="arrive-friends-drawer-header">
                                                            <div className="friends-title">
                                                                <Sparkles size={13} style={{ color: '#fbbf24' }} />
                                                                <span>Lista de Amigas de <strong>{girl.name}</strong></span>
                                                                <span className="friends-count-pill">{friendsCount} Acompañantes</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="arrive-btn-text"
                                                                onClick={() => setShowPasteWA(showPasteWA === girl.id ? null : girl.id)}
                                                            >
                                                                <Share2 size={12} /> {showPasteWA === girl.id ? 'Cerrar Pegado' : '⚡ Pegar de WhatsApp'}
                                                            </button>
                                                        </div>

                                                        {/* Caja para pegar texto de WhatsApp */}
                                                        {showPasteWA === girl.id && (
                                                            <div className="arrive-paste-wa-box">
                                                                <label>Pega aquí la lista de amigas tal cual te la envió por WhatsApp:</label>
                                                                <textarea
                                                                    rows={3}
                                                                    placeholder={`Ejemplo:\n1. Andrea Castillo @andreac\n2. Sofia Morales @sofi_m\n3. Valentina Diaz`}
                                                                    value={waText}
                                                                    onChange={(e) => setWaText(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <div className="paste-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="arrive-btn-primary small"
                                                                        onClick={() => handleProcessWaText(girl.id)}
                                                                    >
                                                                        ✓ Procesar y Agregar
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="arrive-btn-secondary small"
                                                                        onClick={() => { setShowPasteWA(null); setWaText(''); }}
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Chips de amigas agregadas */}
                                                        <div className="arrive-friends-chips">
                                                            {friendsCount > 0 ? (
                                                                girl.friends.map((friend, fIdx) => (
                                                                    <div key={friend.id || fIdx} className="arrive-friend-chip">
                                                                        <span className="friend-chip-name">{friend.name}</span>
                                                                        {friend.ig && <span className="friend-chip-ig">{friend.ig}</span>}
                                                                        <button
                                                                            type="button"
                                                                            className="friend-chip-remove"
                                                                            onClick={() => handleRemoveFriend(girl.id, friend.id)}
                                                                            title="Eliminar amiga"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="arrive-no-friends-hint">
                                                                    {girl.name} aún no tiene amigas agregadas en esta lista. Escribe sus nombres abajo o pega el texto de WhatsApp.
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Formulario rápido para añadir una amiga */}
                                                        <form onSubmit={(e) => handleAddSingleFriend(e, girl.id)} className="arrive-quickadd-friend-row">
                                                            <input
                                                                type="text"
                                                                placeholder="Nombre de la amiga (ej: Mariana Ruiz)"
                                                                value={newFriendName}
                                                                onChange={(e) => setNewFriendName(e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="@Instagram (opcional)"
                                                                value={newFriendIG}
                                                                onChange={(e) => setNewFriendIG(e.target.value)}
                                                            />
                                                            <button type="submit" className="arrive-btn-gold-small">
                                                                <Plus size={12} /> Agregar Amiga
                                                            </button>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="arrive-dinner-form-card">
                            <h3 className="arrive-form-title">
                                <Plus size={16} /> Convocar Nueva Invitada
                            </h3>
                            <form onSubmit={handleAddGirlToDinner} className="arrive-quickadd-form">
                                {Array.isArray(imageGirls) && imageGirls.length > 0 && (
                                    <div className="arrive-field-group">
                                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>⚡ Autocompletar desde Directorio Models</span>
                                            <span style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: 600 }}>{imageGirls.length} registradas</span>
                                        </label>
                                        <select 
                                            defaultValue=""
                                            onChange={(e) => {
                                                const selected = imageGirls.find(g => g.id === e.target.value);
                                                if (selected) {
                                                    setNewGirlName(selected.name || '');
                                                    setNewGirlIG(selected.ig || '');
                                                    setNewGirlPhone(selected.phone || '');
                                                    if (selected.type) setNewGirlType(selected.type);
                                                }
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">-- Seleccionar de ARRIVE Models --</option>
                                            {imageGirls.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    👑 {g.name} {g.ig ? `(${g.ig})` : ''} — {g.type || 'Modelo'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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
                                <div className="arrive-field-group">
                                    <label>Lista de Amigas / Acompañantes (Opcional)</label>
                                    <textarea 
                                        placeholder="Ej: Andrea (@andrea), Sofia Gomez (@sofi) o pega la lista de WhatsApp"
                                        value={newGirlFriendsText}
                                        onChange={(e) => setNewGirlFriendsText(e.target.value)}
                                        rows={2}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                        Separa por comas o saltos de línea. Se agregarán automáticamente a su mesa.
                                    </span>
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
                    <div className="arrive-posts-split-layout">
                        <div className="arrive-posts-list-card">
                            <div className="arrive-card-header">
                                <div className="arrive-card-head-title">
                                    <Film size={16} /> Pipeline de Contenidos & Reels — ARRIVE Studio
                                </div>
                                <span className="arrive-pill arrive-pill-gold">
                                    {posts.length} Contenidos
                                </span>
                            </div>
                            <div className="arrive-posts-list">
                                {posts.length === 0 ? (
                                    <div className="arrive-empty-placeholder">
                                        No hay contenidos programados en el pipeline aún. ¡Usa el formulario a la derecha!
                                    </div>
                                ) : (
                                    posts.map(post => (
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
                                                <span className="arrive-post-date">📅 {post.date}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
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
