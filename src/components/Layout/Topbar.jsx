import { Search, Menu, Database } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

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
    '/projects': 'Projects',
    '/ai-tools': 'AI Tools Matrix',
    '/infrastructure': 'Infrastructure',
    '/gemini': 'Gemini AI',
    '/notebook': 'NotebookLM',
    '/chat': 'Assistant Chat',
    '/ideas': 'Idea Vault',
    '/personal': 'Personal',
    '/social': 'Redes Sociales',
    '/workspace': '',
    '/calendar': 'Master Calendar',
};

export default function Topbar({ collapsed, searchQuery, onSearchChange, onMobileMenuToggle, onCloudSyncToggle }) {
    const location = useLocation();
    const { tasks, events, supabaseStatus } = useApp();

    const titleKey = Object.keys(pageTitles).find(key => {
        if (key === '/') return location.pathname === '/';
        return location.pathname.startsWith(key);
    });
    const title = titleKey !== undefined ? pageTitles[titleKey] : 'Command Center';

    const pendingTasks = (tasks || []).filter(t => t.status !== 'done' && t.status !== 'completed').length;
    const completedTasks = (tasks || []).filter(t => t.status === 'done' || t.status === 'completed').length;
    const totalTasks = pendingTasks + completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Quick Metrics
    const eventCount = (events || []).filter(p => p.status === 'active').length;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '🌤️ Buen día';
        if (hour < 18) return '☀️ Buena tarde';
        return '🌙 Buena noche';
    };

    // Supabase status UI config
    let statusColor = 'var(--text-tertiary)';
    let statusLabel = 'Local Offline';
    let dotColor = '#6b7280';
    let isLive = false;

    if (supabaseStatus?.status === 'connected') {
        statusColor = 'var(--accent-green)';
        statusLabel = 'Cloud Sync';
        dotColor = 'var(--accent-green)';
        isLive = true;
    } else if (supabaseStatus?.status === 'connected_missing_table') {
        statusColor = 'var(--accent-orange)';
        statusLabel = 'Table Missing';
        dotColor = 'var(--accent-orange)';
    } else if (supabaseStatus?.status === 'unauthorized' || supabaseStatus?.status === 'error') {
        statusColor = 'var(--accent-red)';
        statusLabel = 'Sync Error';
        dotColor = 'var(--accent-red)';
    }

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
                {/* Cloud Sync Status Badge */}
                <div 
                    className="cloud-sync-badge" 
                    onClick={onCloudSyncToggle}
                    style={{ 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '5px 12px', 
                        borderRadius: '20px', 
                        background: 'rgba(255, 255, 255, 0.04)', 
                        border: '1px solid var(--border-subtle)', 
                        transition: 'all 0.2s ease',
                        marginRight: '12px',
                        userSelect: 'none'
                    }}
                >
                    <Database size={13} style={{ color: statusColor }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500 }}>{statusLabel}</span>
                    <span className="status-dot" style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: dotColor, 
                        boxShadow: isLive ? '0 0 8px var(--accent-green)' : 'none',
                        animation: isLive ? 'pulse-green 2.5s infinite' : 'none'
                    }} />
                </div>

                <div className="search-bar desktop-only">
                    <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Search everything..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <span className="search-kbd">⌘K</span>
                </div>
            </div>
        </header>
    );
}
