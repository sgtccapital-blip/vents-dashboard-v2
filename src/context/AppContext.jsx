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
    seedSubscriptions
} from '../lib/seedData';

const AppContext = createContext();

const API_BASE = '/api';
const POLL_INTERVAL = 3000; // ms — how often to check for external changes

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    // ─── Fallback: localStorage when API is unreachable ───────────
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
    const lastPollRef = useRef(0);

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

    const [socialMedia, setSocialMedia] = useState(() => {
        const local = initializeState('os_live_socialMedia', seedSocialMedia);
        const merged = [...local];
        seedSocialMedia.forEach(seed => {
            if (!merged.find(a => a.id === seed.id)) merged.push(seed);
        });
        return merged;
    });
    const [contentTasks, setContentTasks] = useState(() => initializeState('os_live_contentTasks', seedContentTasks));
    const [tasks, setTasks] = useState(() => initializeState('os_live_tasks', seedTasks));
    const [notes, setNotes] = useState(() => initializeState('os_live_notes', seedNotes));
    const [activityFeed, setActivityFeed] = useState(() => initializeState('os_live_activityFeed', []));
    const [subscriptions, setSubscriptions] = useState(() => initializeState('os_live_subscriptions', seedSubscriptions));

    const [events, setEvents] = useState(() => {
        const local = initializeState('os_live_events', seedEvents);
        let merged = [...local].filter(e => e.id !== 'ev-djs-sets-youtube'); // Cleanup old name
        seedEvents.forEach(seed => {
            if (!merged.find(e => e.id === seed.id)) {
                merged.push(seed);
            }
        });
        return merged;
    });
    const [promoters, setPromoters] = useState(() => {
        const local = initializeState('os_live_promoters', seedPromoters);
        const merged = [...local];
        seedPromoters.forEach(seed => {
            if (!merged.find(e => e.id === seed.id)) merged.push(seed);
        });
        return merged;
    });
    const [imageGirls, setImageGirls] = useState(() => {
        const local = initializeState('os_live_image_girls', seedImageGirls);
        const merged = [...local];
        seedImageGirls.forEach(seed => {
            if (!merged.find(e => e.id === seed.id)) merged.push(seed);
        });
        return merged;
    });
    const [orders, setOrders] = useState(() => initializeState('os_live_orders', []));
    const [sops, setSops] = useState(() => initializeState('os_live_sops', []));
    
    // Google Calendar integration states
    const [gcalToken, setGcalToken] = useState(() => localStorage.getItem('gcal_token') || '');
    const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);


    // ─── API Helper ───────────────────────────────────────────────

    const apiFetch = useCallback(async (endpoint, options = {}) => {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            if (!res.ok) throw new Error(`API ${res.status}`);
            setApiOnline(true);
            return await res.json();
        } catch (err) {
            console.warn(`API unreachable (${endpoint}):`, err.message);
            setApiOnline(false);
            return null;
        }
    }, []);

    // ─── Polling: Sync from API every N seconds ───────────────────

    const poll = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/health`);
            if (!res.ok) { setApiOnline(false); return; }
            setApiOnline(true);
        } catch {
            setApiOnline(false);
            return;
        }

        try {
            const [apiEvents, apiTasks, apiNotes, apiIdeas, apiSubs, apiActivity, apiOrders, apiSops, apiSocial] = await Promise.all([
                fetch(`${API_BASE}/events`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/tasks`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/notes`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/ideas`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/subscriptions`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/activity`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/orders`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/sops`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/socialMedia`).then(r => r.json()).catch(() => null),
            ]);

            checkSupabaseStatus().catch(() => null);

            if (apiEvents) setEvents(apiEvents);
            if (apiTasks) setTasks(apiTasks);
            if (apiNotes) setNotes(apiNotes);
            if (apiIdeas) setIdeas(apiIdeas);
            if (apiSubs) setSubscriptions(apiSubs);
            if (apiActivity) setActivityFeed(apiActivity);
            if (apiOrders) setOrders(apiOrders);
            if (apiSops) setSops(apiSops);
            if (apiSocial) setSocialMedia(apiSocial);
        } catch (err) {
            console.warn('Polling sync error:', err.message);
        }
    }, [checkSupabaseStatus]);

    useEffect(() => {
        const interval = setInterval(poll, POLL_INTERVAL);
        poll(); // initial sync
        return () => clearInterval(interval);
    }, [poll]);

    // ─── Save to localStorage (always, as backup) ─────────────────

    const safeSetLocal = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn(`LocalStorage quota exceeded or error saving ${key}:`, error);
        }
    };

    useEffect(() => { safeSetLocal('os_live_ideas', ideas); }, [ideas]);
    useEffect(() => { safeSetLocal('os_live_socialMedia', socialMedia); }, [socialMedia]);
    useEffect(() => { safeSetLocal('os_live_contentTasks', contentTasks); }, [contentTasks]);
    useEffect(() => { safeSetLocal('os_live_tasks', tasks); }, [tasks]);
    useEffect(() => { safeSetLocal('os_live_notes', notes); }, [notes]);
    useEffect(() => { safeSetLocal('os_live_activityFeed', activityFeed); }, [activityFeed]);
    useEffect(() => { safeSetLocal('os_live_subscriptions', subscriptions); }, [subscriptions]);
    useEffect(() => { safeSetLocal('os_live_events', events); }, [events]);
    useEffect(() => { safeSetLocal('os_live_orders', orders); }, [orders]);
    useEffect(() => { safeSetLocal('os_live_sops', sops); }, [sops]);

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
        let updatedTask = null;
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                updatedTask = { ...t, done: !t.done };
                return updatedTask;
            }
            return t;
        }));
        if (updatedTask) {
            await apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: { done: updatedTask.done } });
        }
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
    const addActivity = async (text, color, projectId = null) => {
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
        setEvents(prev => prev.filter(e => e.id !== eventId));
        await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
    };

    // Orders
    const updateOrder = async (orderId, updatedData) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedData } : o));
        await apiFetch(`/orders/${orderId}`, { method: 'PUT', body: updatedData });
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

        orders,
        updateOrder,

        sops,
        updateSOP,


        promoters,
        setPromoters,
        imageGirls,
        setImageGirls,
        
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
        
        refreshData: poll
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
