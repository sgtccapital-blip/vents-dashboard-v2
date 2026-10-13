import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
    seedProjects,
    seedEvents,
    seedPromoters,
    seedImageGirls,
    seedIdeas,
    seedSocialMedia,
    seedContentTasks,
    seedTasks,
    seedNotes,
    seedSubscriptions,
    seedContacts,
    seedDecisionLog,
    seedPortfolioRoadmap
} from '../lib/seedData';
import OpenClawBrainService from '../services/OpenClawBrainService';
import { isDone } from '../lib/status';

const AppContext = createContext();

const API_BASE = '/api';
const POLL_INTERVAL = 3000; // ms — how often to check for external changes

// Guarda en localStorage sin romper si se llena la cuota
const safeSetLocal = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn(`LocalStorage quota exceeded or error saving ${key}:`, error);
    }
};

// IDs basados en tiempo, fuera del componente para que React Compiler no los marque como impuros
const timeId = (prefix) => `${prefix}-${Date.now()}`;

// eslint-disable-next-line react-refresh/only-export-components -- el hook vive junto a su provider
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    // ─── Fallback: localStorage when API is unreachable ───────────
    // Lo guardado en este navegador manda; el seed solo se usa la primera vez.
    // (Antes se volvían a mezclar los registros del seed y los borrados reaparecían.)
    const initializeState = (key, defaultData) => {
        try {
            const savedItem = localStorage.getItem(key);
            if (savedItem) return JSON.parse(savedItem);
            return defaultData;
        } catch (error) {
            console.error(`Error parsing ${key} from localStorage`, error);
            return defaultData;
        }
    };

    // Track if API is available
    const [apiOnline, setApiOnline] = useState(false);

    const [supabaseStatus, setSupabaseStatus] = useState({
        configured: false,
        url: '',
        keyMasked: '',
        status: 'unconfigured',
        tableExists: false,
        error: null
    });

    const checkSupabaseStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/supabase/status`);
            if (res.ok) {
                const data = await res.json();
                setSupabaseStatus(data);
                return data;
            }
        } catch (err) {
            console.error('Error fetching Supabase status:', err);
        }
        return null;
    }, []);

    const manualSync = useCallback(async (action) => {
        try {
            const res = await fetch(`${API_BASE}/supabase/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            await checkSupabaseStatus();
            return data;
        } catch (err) {
            console.error('Error manual syncing Supabase:', err);
            return { success: false, error: err.message };
        }
    }, [checkSupabaseStatus]);

    const saveSupabaseConfig = useCallback(async (url, key) => {
        try {
            const res = await fetch(`${API_BASE}/supabase/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, key })
            });
            const data = await res.json();
            await checkSupabaseStatus();
            return data;
        } catch (err) {
            console.error('Error saving Supabase config:', err);
            return { success: false, error: err.message };
        }
    }, [checkSupabaseStatus]);

    // State

    const [ideas, setIdeas] = useState(() => initializeState('os_live_ideas', seedIdeas));

    const [socialMedia, setSocialMedia] = useState(() => initializeState('os_live_socialMedia', seedSocialMedia));
    const [contentTasks, setContentTasks] = useState(() => {
        const saved = initializeState('os_live_contentTasks', seedContentTasks);
        return Array.isArray(saved) ? saved : [];
    });
    const [tasks, setTasks] = useState(() => initializeState('os_live_tasks', seedTasks));
    const [notes, setNotes] = useState(() => initializeState('os_live_notes', seedNotes));
    const [activityFeed, setActivityFeed] = useState(() => initializeState('os_live_activityFeed', []));
    const [subscriptions, setSubscriptions] = useState(() => initializeState('os_live_subscriptions', seedSubscriptions));
    const [contacts, setContacts] = useState(() => initializeState('os_live_contacts', seedContacts));
    const [agents, setAgents] = useState(() => initializeState('os_live_agents', []));

    const [projects, setProjects] = useState(() => initializeState('os_live_projects', seedProjects));
    const [openclawLogs, setOpenclawLogs] = useState(() => initializeState('os_live_openclaw_logs', initializeState('os_live_hermes_logs', [])));
    const hermesLogs = openclawLogs;

    // ─── Shared OpenClaw Chat State (Persisted across Copilot, Workspace and AgentBrain) ───
    const [openclawMessages, setOpenclawMessages] = useState(() => {
        const saved = initializeState('__openclaw_shared_chat_history', null);
        if (saved && Array.isArray(saved) && saved.length > 0) return saved;
        return [
            {
                id: 'welcome',
                role: 'copilot',
                text: '⚡ **OpenClaw Super Agent activo**.\n\nTengo en vivo tus eventos, proyectos, tareas y documentos del RAG. Puedo responder preguntas y crear tareas, eventos, proyectos y notas.\n\nEscribe **ayuda** para ver lo que puedo hacer.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ];
    });
    const [isOpenclawThinking, setIsOpenclawThinking] = useState(false);
    const [openclawMode, setOpenclawMode] = useState('ejecutivo');

    const [events, setEvents] = useState(() => initializeState('os_live_events', seedEvents));
    const [promoters, setPromoters] = useState(() => initializeState('os_live_promoters', seedPromoters));
    const [imageGirls, setImageGirls] = useState(() => initializeState('os_live_image_girls', seedImageGirls));
    const [orders, setOrders] = useState(() => initializeState('os_live_orders', []));
    const [sops, setSops] = useState(() => initializeState('os_live_sops', []));
    
    // Portfolio OS states
    const [decisionLog, setDecisionLog] = useState(() => initializeState('os_live_decision_log', seedDecisionLog));

    const [portfolioRoadmap, setPortfolioRoadmap] = useState(() => initializeState('os_live_portfolio_roadmap', seedPortfolioRoadmap));

    // Google Calendar integration states
    const [gcalToken, setGcalToken] = useState(() => localStorage.getItem('gcal_token') || '');
    const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);


    // ─── API Helper ───────────────────────────────────────────────

    // Escrituras en curso: mientras haya alguna (o justo después), el polling no pisa la pantalla.
    const pendingWritesRef = useRef(0);
    const lastWriteAtRef = useRef(0);
    const stateVersionRef = useRef(null);

    const apiFetch = useCallback(async (endpoint, options = {}) => {
        const isWrite = options.method && options.method !== 'GET';
        if (isWrite) pendingWritesRef.current++;
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            if (res.status === 401) window.dispatchEvent(new Event('auth:required'));
            if (!res.ok) {
                const detail = await res.json().catch(() => ({}));
                throw new Error(detail.error || `API ${res.status}`);
            }
            setApiOnline(true);
            return await res.json();
        } catch (err) {
            console.warn(`API error (${endpoint}):`, err.message);
            if (isWrite) {
                // La pantalla ya mostraba el cambio; forzamos recarga desde el servidor para no quedar desincronizados.
                stateVersionRef.current = null;
            } else {
                setApiOnline(false);
            }
            return null;
        } finally {
            if (isWrite) {
                pendingWritesRef.current--;
                lastWriteAtRef.current = Date.now();
            }
        }
    }, []);

    // ─── Polling: una sola petición con versión; solo descarga si algo cambió ───

    const poll = useCallback(async () => {
        if (pendingWritesRef.current > 0 || Date.now() - lastWriteAtRef.current < 1500) return;

        let payload;
        try {
            const since = stateVersionRef.current ? `?since=${encodeURIComponent(stateVersionRef.current)}` : '';
            const res = await fetch(`${API_BASE}/state${since}`, { credentials: 'include' });
            if (res.status === 401) { window.dispatchEvent(new Event('auth:required')); return; }
            if (!res.ok) { setApiOnline(false); return; }
            setApiOnline(true);
            payload = await res.json();
        } catch {
            setApiOnline(false);
            return;
        }

        // Si el usuario empezó a editar mientras llegaba la respuesta, descartamos este ciclo.
        if (pendingWritesRef.current > 0 || Date.now() - lastWriteAtRef.current < 1500) return;
        if (!payload?.changed) return;
        stateVersionRef.current = payload.version;

        const d = payload.data || {};
        if (Array.isArray(d.events)) {
            setEvents(d.events);
            safeSetLocal('os_live_events', d.events);
        }
        if (Array.isArray(d.projects)) {
            setProjects(d.projects);
            safeSetLocal('os_live_projects', d.projects);
        }
        if (Array.isArray(d.tasks)) {
            setTasks(d.tasks);
            safeSetLocal('os_live_tasks', d.tasks);
        }
        if (Array.isArray(d.notes)) {
            setNotes(d.notes);
            safeSetLocal('os_live_notes', d.notes);
        }
        if (Array.isArray(d.ideas)) {
            setIdeas(d.ideas);
            safeSetLocal('os_live_ideas', d.ideas);
        }
        if (Array.isArray(d.subscriptions)) {
            setSubscriptions(d.subscriptions);
            safeSetLocal('os_live_subscriptions', d.subscriptions);
        }
        if (Array.isArray(d.activity)) {
            setActivityFeed(d.activity);
            safeSetLocal('os_live_activityFeed', d.activity);
        }
        if (Array.isArray(d.orders)) {
            setOrders(d.orders);
            safeSetLocal('os_live_orders', d.orders);
        }
        if (Array.isArray(d.sops)) {
            setSops(d.sops);
            safeSetLocal('os_live_sops', d.sops);
        }
        if (Array.isArray(d.socialMedia)) {
            setSocialMedia(d.socialMedia);
            safeSetLocal('os_live_socialMedia', d.socialMedia);
        }
        if (Array.isArray(d.contentTasks)) {
            setContentTasks(d.contentTasks);
            safeSetLocal('os_live_contentTasks', d.contentTasks);
        }
        if (Array.isArray(d.contacts)) {
            setContacts(d.contacts);
            safeSetLocal('os_live_contacts', d.contacts);
        }
        if (Array.isArray(d.openclawLogs)) {
            setOpenclawLogs(d.openclawLogs);
            safeSetLocal('os_live_openclaw_logs', d.openclawLogs);
        }
        if (Array.isArray(d.decisionLog) && d.decisionLog.length > 0) {
            setDecisionLog(d.decisionLog);
            safeSetLocal('os_live_decision_log', d.decisionLog);
        }
        if (Array.isArray(d.portfolioRoadmap) && d.portfolioRoadmap.length > 0) {
            setPortfolioRoadmap(d.portfolioRoadmap);
            safeSetLocal('os_live_portfolio_roadmap', d.portfolioRoadmap);
        }
        if (Array.isArray(d.promoters)) {
            setPromoters(d.promoters);
            safeSetLocal('os_live_promoters', d.promoters);
        }
        if (Array.isArray(d.imageGirls)) {
            setImageGirls(d.imageGirls);
            safeSetLocal('os_live_image_girls', d.imageGirls);
        }
        if (Array.isArray(d.agents)) {
            setAgents(d.agents);
            safeSetLocal('os_live_agents', d.agents);
        }

        checkSupabaseStatus().catch(() => null);
    }, [checkSupabaseStatus]);

    useEffect(() => {
        const interval = setInterval(poll, POLL_INTERVAL);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización inicial con el servidor (red), no estado derivado
        poll(); // initial sync
        checkSupabaseStatus().catch(() => null);
        return () => clearInterval(interval);
    }, [poll, checkSupabaseStatus]);

    // El agente guarda sus cambios en el servidor: recargar en cuanto termina una acción
    useEffect(() => {
        const onAgentChange = () => { poll(); };
        window.addEventListener('openclaw:data-changed', onAgentChange);
        return () => window.removeEventListener('openclaw:data-changed', onAgentChange);
    }, [poll]);

    // ─── Save to localStorage (always, as backup) ─────────────────

    useEffect(() => { safeSetLocal('os_live_ideas', ideas); }, [ideas]);
    useEffect(() => { safeSetLocal('os_live_socialMedia', socialMedia); }, [socialMedia]);
    useEffect(() => { safeSetLocal('os_live_contentTasks', contentTasks); }, [contentTasks]);
    useEffect(() => { safeSetLocal('os_live_tasks', tasks); }, [tasks]);
    useEffect(() => { safeSetLocal('os_live_notes', notes); }, [notes]);
    useEffect(() => { safeSetLocal('os_live_activityFeed', activityFeed); }, [activityFeed]);
    useEffect(() => { safeSetLocal('os_live_subscriptions', subscriptions); }, [subscriptions]);
    useEffect(() => { safeSetLocal('os_live_events', events); }, [events]);
    useEffect(() => { safeSetLocal('os_live_projects', projects); }, [projects]);
    useEffect(() => { safeSetLocal('os_live_openclaw_logs', openclawLogs); safeSetLocal('os_live_hermes_logs', openclawLogs); }, [openclawLogs]);
    useEffect(() => { safeSetLocal('__openclaw_shared_chat_history', openclawMessages); }, [openclawMessages]);
    useEffect(() => { safeSetLocal('os_live_orders', orders); }, [orders]);
    useEffect(() => { safeSetLocal('os_live_sops', sops); }, [sops]);
    useEffect(() => { safeSetLocal('os_live_contacts', contacts); }, [contacts]);
    useEffect(() => { safeSetLocal('os_live_decision_log', decisionLog); }, [decisionLog]);
    useEffect(() => { safeSetLocal('os_live_portfolio_roadmap', portfolioRoadmap); }, [portfolioRoadmap]);

    useEffect(() => { safeSetLocal('os_live_promoters', promoters); }, [promoters]);
    useEffect(() => { safeSetLocal('os_live_image_girls', imageGirls); }, [imageGirls]);



    // ─── MUTATION FUNCTIONS (write to API + update local state) ────

    // Ideas
    const addIdea = async (idea) => {
        setIdeas(prev => [...prev, idea]);
        await apiFetch('/ideas', { method: 'POST', body: idea });
    };

    const updateIdea = async (ideaId, updatedData) => {
        setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, ...updatedData } : i));
        await apiFetch(`/ideas/${ideaId}`, { method: 'PUT', body: updatedData });
    };

    const deleteIdea = async (ideaId) => {
        setIdeas(prev => prev.filter(i => i.id !== ideaId));
        await apiFetch(`/ideas/${ideaId}`, { method: 'DELETE' });
    };

    // Social Media Accounts
    const addSocialMedia = async (account) => {
        setSocialMedia(prev => [...prev, account]);
        await apiFetch('/socialMedia', { method: 'POST', body: account });
    };

    const updateSocialMedia = async (accountId, updatedData) => {
        setSocialMedia(prev => prev.map(a => a.id === accountId ? { ...a, ...updatedData } : a));
        await apiFetch(`/socialMedia/${accountId}`, { method: 'PUT', body: updatedData });
    };

    const deleteSocialMedia = async (accountId) => {
        setSocialMedia(prev => prev.filter(a => a.id !== accountId));
        await apiFetch(`/socialMedia/${accountId}`, { method: 'DELETE' });
    };

    // Content Planner
    const addContentTask = async (task) => {
        setContentTasks(prev => [...prev, task]);
        await apiFetch('/contentTasks', { method: 'POST', body: task });
    };

    const updateContentTask = async (taskId, updatedData) => {
        setContentTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedData } : t));
        await apiFetch(`/contentTasks/${taskId}`, { method: 'PUT', body: updatedData });
    };

    const deleteContentTask = async (taskId) => {
        setContentTasks(prev => prev.filter(t => t.id !== taskId));
        await apiFetch(`/contentTasks/${taskId}`, { method: 'DELETE' });
    };

    const updateContentTasksAll = (newTasks) => {
        setContentTasks(newTasks);
        // Bulk update not supported via REST — individual updates are used
    };


    // Home (Tasks & Notes)
    const toggleTask = async (taskId) => {
        // El estado nuevo se calcula fuera del updater: React puede ejecutar el updater
        // después, y entonces el PUT nunca se enviaba.
        const current = tasks.find(t => t.id === taskId);
        if (!current) return;
        const status = isDone(current) ? 'pending' : 'done';
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, done: status === 'done' } : t));
        await apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: { status } });
    };

    const addTask = async (task) => {
        setTasks(prev => [task, ...prev]);
        await apiFetch('/tasks', { method: 'POST', body: task });
    };

    const updateTask = async (taskId, updatedData) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedData } : t));
        await apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: updatedData });
    };

    const deleteTask = async (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
    };

    // SOPs (Agents Workspace)
    const updateSOP = async (filename, content) => {
        setSops(prev => prev.map(s => s.filename === filename ? { ...s, content } : s));
        await apiFetch(`/sops/${filename}`, { method: 'PUT', body: { content } });
    };

    const addNote = async (note) => {
        setNotes(prev => [note, ...prev]);
        await apiFetch('/notes', { method: 'POST', body: note });
    };

    const updateNote = async (noteId, updatedData) => {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updatedData } : n));
        await apiFetch(`/notes/${noteId}`, { method: 'PUT', body: updatedData });
    };

    const deleteNote = async (noteId) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        await apiFetch(`/notes/${noteId}`, { method: 'DELETE' });
    };


    // Activity Feed
    const addActivity = async (text, color) => {
        const newActivity = {
            id: `act-${Date.now()}`,
            text,
            color,
            timestamp: new Date().toISOString()
        };
        setActivityFeed(prev => [newActivity, ...prev].slice(0, 50));
        await apiFetch('/activity', { method: 'POST', body: newActivity });
    };

    // Subscriptions
    const addSubscription = async (subscription) => {
        setSubscriptions(prev => [subscription, ...prev]);
        await apiFetch('/subscriptions', { method: 'POST', body: subscription });
    };

    const updateSubscription = async (subscriptionId, updatedData) => {
        setSubscriptions(prev => prev.map(s => s.id === subscriptionId ? { ...s, ...updatedData } : s));
        await apiFetch(`/subscriptions/${subscriptionId}`, { method: 'PUT', body: updatedData });
    };

    const deleteSubscription = async (subscriptionId) => {
        setSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));
        await apiFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
    };

    // Projects CRUD
    const addProject = async (projectData) => {
        const pWithId = { id: projectData.id || `proj-${Date.now()}`, ...projectData };
        setProjects(prev => [pWithId, ...prev]);
        setEvents(prev => {
            if (prev.find(e => e.id === pWithId.id)) return prev;
            return [pWithId, ...prev];
        });
        await apiFetch('/projects', { method: 'POST', body: pWithId });
        await apiFetch('/events', { method: 'POST', body: pWithId }).catch(() => null);
    };

    const updateProject = async (projectId, updatedData) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updatedData } : p));
        setEvents(prev => prev.map(e => e.id === projectId ? { ...e, ...updatedData } : e));
        await apiFetch(`/projects/${projectId}`, { method: 'PUT', body: updatedData });
        await apiFetch(`/events/${projectId}`, { method: 'PUT', body: updatedData }).catch(() => null);
    };

    const deleteProject = async (projectId) => {
        setProjects(prev => {
            const next = prev.filter(p => p.id !== projectId);
            safeSetLocal('os_live_projects', next);
            return next;
        });
        setEvents(prev => {
            const next = prev.filter(e => e.id !== projectId);
            safeSetLocal('os_live_events', next);
            return next;
        });
        await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
        await apiFetch(`/events/${projectId}`, { method: 'DELETE' }).catch(() => null);
    };

    const reorderProjects = async (newProjectsList) => {
        setProjects(newProjectsList);
        try {
            localStorage.setItem('os_live_projects', JSON.stringify(newProjectsList));
            await apiFetch('/projects', { method: 'PUT', body: newProjectsList });
        } catch (e) {
            console.error('Error reordering projects:', e);
        }
    };

    // ─── OpenClaw Super Agent Dispatcher ───
    const triggerOpenClawAction = async (actionName, payload = {}) => {
        // apiFetch devuelve null si el servidor rechaza la acción: lo convertimos en error
        // para que las pantallas no muestren "éxito" cuando no se ejecutó nada.
        const res = await apiFetch('/openclaw/action', {
            method: 'POST',
            body: { action: actionName, payload }
        });
        if (!res) throw new Error(`OpenClaw no pudo ejecutar "${actionName}". Revisa la conexión con el servidor.`);
        await poll();
        return res;
    };
    const triggerHermesAction = triggerOpenClawAction;

    // ─── Shared OpenClaw Chat Dispatcher (Shared by Copilot, Workspace, AgentBrain) ───
    const sendOpenclawMessage = async (userText, audioData = null) => {
        if (!userText && !audioData) return null;
        
        const userMsg = {
            id: timeId('usr'),
            role: 'user',
            text: userText || (audioData ? '🎙️ [Nota de voz grabada]' : ''),
            audio: audioData ? audioData.url : undefined,
            duration: audioData ? audioData.duration : undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedHistory = [...openclawMessages, userMsg];
        setOpenclawMessages(updatedHistory);
        setIsOpenclawThinking(true);

        try {
            if (!userText) {
                // Las notas de voz se guardan en el chat, pero el agente solo procesa texto (usa el dictado 🎤)
                throw new Error('El agente todavía no transcribe notas de voz. Usa el dictado por voz o escribe el mensaje.');
            }
            // El servidor arma el contexto en vivo y ejecuta las herramientas; aquí solo recargamos
            const res = await OpenClawBrainService.sendCommand(userText, openclawMessages, '', '', 'default', openclawMode);

            const botMsg = {
                id: timeId('bot'),
                role: 'copilot',
                text: res.reply,
                model: res.model,
                provider: res.provider,
                sources: res.sources,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                executedTools: res.executedTools || []
            };

            setOpenclawMessages(prev => {
                const nextList = [...prev, botMsg];
                safeSetLocal('__openclaw_shared_chat_history', nextList);
                return nextList;
            });

            return botMsg;
        } catch (err) {
            console.error('[OpenClaw Chat Error]:', err);
            const errMsg = {
                id: timeId('bot-err'),
                role: 'copilot',
                text: `⚠️ No pude procesar tu solicitud: ${err.message}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                error: true
            };
            setOpenclawMessages(prev => {
                const nextList = [...prev, errMsg];
                safeSetLocal('__openclaw_shared_chat_history', nextList);
                return nextList;
            });
            return errMsg;
        } finally {
            setIsOpenclawThinking(false);
        }
    };

    const clearOpenclawChat = () => {
        const resetMsg = [
            {
                id: 'welcome',
                role: 'copilot',
                text: '⚡ **OpenClaw Super Agent activo** (Conversación reiniciada).\n\n¿En qué puedo asistirte con el Command Center hoy?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ];
        setOpenclawMessages(resetMsg);
        safeSetLocal('__openclaw_shared_chat_history', resetMsg);
        fetch(`${API_BASE}/openclaw/chat/history`, { method: 'DELETE' }).catch(() => {});
    };

    // Events
    const addEvent = async (eventData) => {
        setEvents(prev => [eventData, ...prev]);
        await apiFetch('/events', { method: 'POST', body: eventData });
    };

    const updateEvent = async (eventId, updatedData) => {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updatedData } : e));
        await apiFetch(`/events/${eventId}`, { method: 'PUT', body: updatedData });
    };

    const deleteEvent = async (eventId) => {
        setEvents(prev => {
            const next = prev.filter(e => e.id !== eventId);
            safeSetLocal('os_live_events', next);
            return next;
        });
        await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
    };

    const reorderEvents = async (newEventsList) => {
        setEvents(newEventsList);
        try {
            localStorage.setItem('events', JSON.stringify(newEventsList));
            await apiFetch('/events', { method: 'PUT', body: newEventsList });
        } catch (e) {
            console.error('Error reordering events:', e);
        }
    };

    // Orders
    const updateOrder = async (orderId, updatedData) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedData } : o));
        await apiFetch(`/orders/${orderId}`, { method: 'PUT', body: updatedData });
    };

    // Promoters CRUD
    const addPromoter = async (pData) => {
        const newP = { id: `prom-${Date.now()}`, contacts: 0, rating: 5.0, ...pData };
        setPromoters(prev => [...prev, newP]);
        try {
            await apiFetch('/promoters', { method: 'POST', body: newP });
        } catch { /* apiFetch ya registra el error */ }
    };

    const updatePromoter = async (pId, updatedData) => {
        setPromoters(prev => prev.map(p => p.id === pId ? { ...p, ...updatedData } : p));
        try {
            await apiFetch(`/promoters/${pId}`, { method: 'PUT', body: updatedData });
        } catch { /* apiFetch ya registra el error */ }
    };

    const deletePromoter = async (pId) => {
        setPromoters(prev => prev.filter(p => p.id !== pId));
        try {
            await apiFetch(`/promoters/${pId}`, { method: 'DELETE' });
        } catch { /* apiFetch ya registra el error */ }
    };

    // Contacts
    const addContact = async (cData) => {
        const newC = { id: `cnt-${Date.now()}`, ...cData };
        setContacts(prev => [...prev, newC]);
        await apiFetch('/contacts', { method: 'POST', body: newC });
    };

    const updateContact = async (cId, updatedData) => {
        setContacts(prev => prev.map(c => c.id === cId ? { ...c, ...updatedData } : c));
        await apiFetch(`/contacts/${cId}`, { method: 'PUT', body: updatedData });
    };

    const deleteContact = async (cId) => {
        setContacts(prev => prev.filter(c => c.id !== cId));
        await apiFetch(`/contacts/${cId}`, { method: 'DELETE' });
    };

    // ─── Portfolio OS (Decisions & Roadmap) ───────────────────────
    const addDecision = async (decData) => {
        const newD = { id: `dec-${Date.now()}`, date: new Date().toISOString().split('T')[0], ...decData };
        setDecisionLog(prev => [newD, ...prev]);
        await apiFetch('/decisionLog', { method: 'POST', body: newD });
    };

    const updateDecision = async (dId, updatedData) => {
        setDecisionLog(prev => prev.map(d => d.id === dId ? { ...d, ...updatedData } : d));
        await apiFetch(`/decisionLog/${dId}`, { method: 'PUT', body: updatedData });
    };

    const deleteDecision = async (dId) => {
        setDecisionLog(prev => prev.filter(d => d.id !== dId));
        await apiFetch(`/decisionLog/${dId}`, { method: 'DELETE' });
    };

    const addRoadmapItem = async (rData) => {
        const newR = { id: `rd-${Date.now()}`, column: 'now', priority: 'medium', ...rData };
        setPortfolioRoadmap(prev => [...prev, newR]);
        await apiFetch('/portfolioRoadmap', { method: 'POST', body: newR });
    };

    const updateRoadmapItem = async (rId, updatedData) => {
        setPortfolioRoadmap(prev => prev.map(r => r.id === rId ? { ...r, ...updatedData } : r));
        await apiFetch(`/portfolioRoadmap/${rId}`, { method: 'PUT', body: updatedData });
    };

    const deleteRoadmapItem = async (rId) => {
        setPortfolioRoadmap(prev => prev.filter(r => r.id !== rId));
        await apiFetch(`/portfolioRoadmap/${rId}`, { method: 'DELETE' });
    };

    // Google Calendar integration callbacks
    const connectGoogleCalendar = useCallback(() => {
        if (!window.google) {
            alert("El SDK de Google está cargando, por favor reintenta en un momento.");
            return;
        }
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: '603885111491-oslj1ohd5g2hpg94mlcu9ipstlab75rg.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: (response) => {
                if (response.access_token) {
                    setGcalToken(response.access_token);
                    localStorage.setItem('gcal_token', response.access_token);
                }
            },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }, []);

    const disconnectGoogleCalendar = useCallback(() => {
        setGcalToken('');
        localStorage.removeItem('gcal_token');
        setGoogleCalendarEvents([]);
    }, []);

    const fetchGoogleCalendarEvents = useCallback(async (timeMin, timeMax) => {
        if (!gcalToken) return [];
        try {
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`, {
                headers: { 'Authorization': `Bearer ${gcalToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                const items = (data.items || []).map(item => ({
                    id: `gcal-${item.id}`,
                    date: item.start?.dateTime?.split('T')[0] || item.start?.date,
                    time: item.start?.dateTime ? item.start.dateTime.split('T')[1].substring(0, 5) : '00:00',
                    title: item.summary || 'Sin Título (Google)',
                    speaker: item.location || 'Google Calendar',
                    description: item.description || '',
                    isGoogleEvent: true
                }));
                setGoogleCalendarEvents(items);
                return items;
            } else if (res.status === 401) {
                // Token expired
                disconnectGoogleCalendar();
            }
        } catch (err) {
            console.error('Error fetching Google Calendar events:', err);
        }
        return [];
    }, [gcalToken, disconnectGoogleCalendar]);

    const syncEventToGoogleCalendar = useCallback(async (ev) => {
        if (!gcalToken) return { success: false, error: 'No conectado a Google Calendar' };
        try {
            const eventDate = ev.date || new Date().toISOString().split('T')[0];
            const eventTime = ev.time || '20:00';
            const startDateTime = `${eventDate}T${eventTime}:00`;
            
            // Assume 2 hour duration
            const [hourStr, minStr] = eventTime.split(':');
            const endHour = parseInt(hourStr) + 2;
            const endDateTime = `${eventDate}T${String(endHour).padStart(2, '0')}:${minStr || '00'}:00`;

            const gcalEvent = {
                summary: ev.title || ev.name,
                description: ev.description || '',
                location: ev.speaker || ev.location || '',
                start: {
                    dateTime: startDateTime,
                    timeZone: 'America/Panama'
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: 'America/Panama'
                }
            };

            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gcalToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gcalEvent)
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, googleEventId: data.id };
            } else {
                if (response.status === 401) {
                    disconnectGoogleCalendar();
                    return { success: false, error: 'La sesión de Google ha expirado. Por favor, vuelve a conectar.' };
                }
                const errData = await response.json();
                return { success: false, error: errData.error?.message || 'Error en la petición a Google' };
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [gcalToken, disconnectGoogleCalendar]);

    const value = {
        apiOnline,

        ideas,
        addIdea,
        updateIdea,
        deleteIdea,


        socialMedia,
        addSocialMedia,
        updateSocialMedia,
        deleteSocialMedia,
        contentTasks,
        addContentTask,
        updateContentTask,
        deleteContentTask,
        updateContentTasksAll,

        tasks,
        toggleTask,
        addTask,
        updateTask,
        deleteTask,

        notes,
        addNote,
        updateNote,
        deleteNote,


        activityFeed,
        addActivity,

        subscriptions,
        addSubscription,
        updateSubscription,
        deleteSubscription,

        events,
        addEvent,
        updateEvent,
        deleteEvent,
        reorderEvents,

        projects,
        setProjects,
        addProject,
        updateProject,
        deleteProject,
        reorderProjects,

        openclawLogs,
        setOpenclawLogs,
        hermesLogs,
        triggerOpenClawAction,
        triggerHermesAction,

        // Shared Chat State & Methods
        openclawMessages,
        setOpenclawMessages,
        sendOpenclawMessage,
        clearOpenclawChat,
        isOpenclawThinking,
        openclawMode,
        setOpenclawMode,

        orders,
        updateOrder,

        sops,
        updateSOP,


        promoters,
        setPromoters,
        addPromoter,
        updatePromoter,
        deletePromoter,
        imageGirls,
        setImageGirls,

        contacts,
        setContacts,
        addContact,
        updateContact,
        deleteContact,
        
        // Portfolio OS Exports
        decisionLog,
        setDecisionLog,
        addDecision,
        updateDecision,
        deleteDecision,
        portfolioRoadmap,
        setPortfolioRoadmap,
        addRoadmapItem,
        updateRoadmapItem,
        deleteRoadmapItem,

        supabaseStatus,
        checkSupabaseStatus,
        manualSync,
        saveSupabaseConfig,
        
        // Google Calendar Exports
        gcalToken,
        googleCalendarEvents,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        fetchGoogleCalendarEvents,
        syncEventToGoogleCalendar,
        
        // Agents Exports
        agents,
        setAgents,

        refreshData: poll
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
