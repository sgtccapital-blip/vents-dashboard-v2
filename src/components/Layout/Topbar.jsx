import { Search, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { taskStats, eventStats, isDone } from '../../lib/status';

const ProgressRing = ({ percent, size = 36, stroke = 3 }) => {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    const center = size / 2;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: 'block' }}>
            <circle
                cx={center} cy={center} r={radius}
                stroke="rgba(255, 255, 255, 0.1)" strokeWidth={stroke} fill="none"
            />
            <circle
                cx={center} cy={center} r={radius}
                stroke="var(--accent-primary)" strokeWidth={stroke} fill="none"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
            <text
                x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
                fill="var(--text-primary)" fontSize="10" fontWeight="bold"
            >
                {Math.round(percent)}%
            </text>
        </svg>
    );
};

const pageTitles = {
    '/': 'Command Center',
    '/arrive': 'ARRIVE Agency OS — Creative, Talent & Experiences',
    '/portfolio': 'Portfolio OS',
    '/semana': 'Mi semana',
    '/finanzas': 'Finanzas',
    '/workspace': 'Workspace 2.0',
    '/content-hub': 'Master Content Hub',
    '/creative-brief': 'Creative Brief',
    '/production-calendar': 'Production Calendar',
    '/calendar': 'Master Calendar',
    '/eventos': 'Proyectos & Eventos',
    '/social': 'Redes Sociales',
    '/whatsapp-agent': 'Agente de Difusión',
    '/difusion': 'Agente de Difusión',
    '/agent-brain': 'Agent & RAG',
    '/jarvis': 'Jarvis AI',
};

export default function Topbar({ collapsed, searchQuery, onSearchChange, onMobileMenuToggle, onCloudSyncToggle }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { tasks, events, projects, contacts, supabaseStatus } = useApp();

    // Resultados del buscador: eventos, tareas y contactos que contienen el texto
    const searchResults = (() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (q.length < 2) return [];
        const has = (...fields) => fields.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
        return [
            ...(projects || []).filter(p => has(p.name, p.description, p.tagline)).map(p => ({ key: `p-${p.id}`, kind: 'Proyecto', label: p.name, to: `/eventos/${p.id}` })),
            ...(events || []).filter(e => has(e.name, e.venue, e.location)).map(e => ({ key: `e-${e.id}`, kind: 'Evento', label: e.name, to: `/eventos/${e.id}` })),
            // Busca también por responsable: "dalia" lista sus tareas.
            ...(tasks || []).filter(t => !isDone(t) && has(t.text, t.title, t.assignedTo, t.assignee)).map(t => ({ key: `t-${t.id}`, kind: 'Tarea', label: t.text || t.title, to: '/semana' })),
            ...(contacts || []).filter(c => has(c.name, c.company, c.role, c.phone, c.email)).map(c => ({ key: `c-${c.id}`, kind: 'Contacto', label: c.name, to: '/contactos' })),
        ].slice(0, 8);
    })();

    const openResult = (result) => {
        onSearchChange('');
        navigate(result.to);
    };

    const titleKey = Object.keys(pageTitles).find(key => {
        if (key === '/') return location.pathname === '/';
        return location.pathname.startsWith(key);
    });
    const title = titleKey !== undefined ? pageTitles[titleKey] : 'Command Center';

    const { pending: pendingTasks, done: completedTasks, completionRate } = taskStats(tasks);

    // Quick Metrics
    const eventCount = eventStats(events).active;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '🌤️ Buen día';
        if (hour < 18) return '☀️ Buena tarde';
        return '🌙 Buena noche';
    };

    return (
        <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>
            <div className="topbar-left">
                <button className="mobile-menu-btn" onClick={onMobileMenuToggle}>
                    <Menu size={24} />
                </button>
                <h1 className="page-title">{title}</h1>
            </div>

            <div className="topbar-center hud-banner">
                <span className="hud-greeting" title="Buenas noches">{getGreeting()}</span>
                <div className="hud-metric"><span className="hud-val" style={{color: 'var(--accent-orange)'}}>{pendingTasks}</span> <span className="hud-lbl">Pendientes</span></div>
                <div className="hud-sep"></div>
                <div className="hud-metric"><span className="hud-val" style={{color: 'var(--accent-green)'}}>{completedTasks}</span> <span className="hud-lbl">Hechas</span></div>
                <div className="hud-sep"></div>
                <div className="hud-metric"><span className="hud-val">{eventCount}</span> <span className="hud-lbl">Eventos</span></div>
                <div className="hud-divider"></div>
                <ProgressRing percent={completionRate} size={36} stroke={3} />
            </div>

            <div className="topbar-right">
                <div className="search-bar desktop-only" style={{ position: 'relative' }}>
                    <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Buscar eventos, tareas, contactos..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchResults[0]) openResult(searchResults[0]);
                            if (e.key === 'Escape') onSearchChange('');
                        }}
                    />
                    {searchQuery.trim().length >= 2 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                            {searchResults.length === 0 ? (
                                <div style={{ padding: '10px 12px', fontSize: '12.5px', color: 'var(--text-tertiary)' }}>Sin resultados</div>
                            ) : searchResults.map(r => (
                                <button key={r.key} onMouseDown={(e) => { e.preventDefault(); openResult(r); }}
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '12.5px' }}>
                                    <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', minWidth: '58px' }}>{r.kind}</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
