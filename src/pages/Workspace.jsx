import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Columns3, PenTool, LayoutTemplate, BookOpen, CheckCircle2,
    Clock, CalendarDays, BarChart3, Focus, Bot, Plus,
    Search, Zap, Play, Pause, RotateCcw, PanelRightClose,
    PanelRightOpen, StickyNote, Target, Check, AlertCircle,
    Sparkles, Command, ChevronDown, ChevronRight, ChevronsUp, ChevronsDown,
    ListChecks, Flame, ArrowRight, MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';

import EventKanbanBoard from '../components/EventKanbanBoard';
import EventCanvas from '../components/EventCanvas';
import EventTableView from '../components/EventTableView';
import EventNotepad from '../components/EventNotepad';
import EventTimeline from '../components/EventTimeline';
import EventAnalytics from '../components/EventAnalytics';
import EventFocusMode from '../components/EventFocusMode';
import EventCalendar from '../components/EventCalendar';
import OpenCloudChat from '../components/OpenCloudChat';
import EventDmSpam from '../components/EventDmSpam';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHrs > 0) return `${diffHrs}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return 'now';
}

// ─── Tab Definitions ──────────────────────────────────────────────────
const TABS = [
    { id: 'kanban', icon: Columns3, label: 'Kanban', group: 'plan', key: '1' },
    { id: 'table', icon: LayoutTemplate, label: 'Table', group: 'plan', key: '2' },
    { id: 'canvas', icon: PenTool, label: 'Canvas', group: 'plan', key: '3' },
    { id: 'notes', icon: BookOpen, label: 'Notes', group: 'plan', key: '4' },
    { id: 'focus', icon: Focus, label: 'Focus', group: 'plan', key: '5' },
    { id: 'timeline', icon: CalendarDays, label: 'Timeline', group: 'schedule', key: '6' },
    { id: 'calendar', icon: CalendarDays, label: 'Calendar', group: 'schedule', key: '7' },
    { id: 'analytics', icon: BarChart3, label: 'War Room', group: 'schedule', key: '8' },
    { id: 'dmspam', icon: MessageSquare, label: 'DM SPAM', group: 'execute', key: '9' },
];

const GROUP_COLORS = {
    plan: 'active',
    execute: 'active-green',
    intel: 'active-purple',
    schedule: 'active-orange',
};

// ─── Progress Ring Component ──────────────────────────────────────────
function ProgressRing({ percent, size = 52, stroke = 4, color = 'var(--accent-primary)' }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return (
        <div className="ws2-progress-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </svg>
            <span className="ws2-progress-ring-text" style={{ fontSize: size > 48 ? '13px' : '10px' }}>
                {Math.round(percent)}%
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── WORKSPACE 2.0 ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
export default function Workspace() {
    const { events, activityFeed, addActivity, tasks, toggleTask, addTask, notes, addNote } = useApp();

    // ─── State ─────────────────────────────────────────────
    const [boardView, setBoardView] = useState(() => {
        try { return localStorage.getItem('ws2_lastView') || 'kanban'; }
        catch { return 'kanban'; }
    });
    const [showChat, setShowChat] = useState(false);
    const [showSidebar, setShowSidebar] = useState(() => {
        try { return localStorage.getItem('ws2_sidebar') !== 'false'; }
        catch { return true; }
    });
    const [quickInput, setQuickInput] = useState('');
    const [quickStatus, setQuickStatus] = useState('pending');
    const [quickDate, setQuickDate] = useState('');

    const quickInputRef = useRef(null);

    // ─── Derived Data ──────────────────────────────────────
    const pendingTasks = tasks.filter(t => !t.done);
    const completedTasks = tasks.filter(t => t.done);
    const pendingCount = pendingTasks.length;
    const completedCount = completedTasks.length;
    const totalTasks = tasks.length;
    const completionPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high').slice(0, 5);
    const focusTasks = pendingTasks.slice(0, 5);
    const activeEvents = events?.filter(e => ['planeacion', 'planificacion', 'ejecucion', 'activo', 'upcoming', 'ongoing'].includes(e.status)) || [];

    // ─── Save last view ────────────────────────────────────
    useEffect(() => {
        try { localStorage.setItem('ws2_lastView', boardView); }
        catch {}
    }, [boardView]);

    // ─── Save sidebar state ────────────────────────────────
    useEffect(() => {
        try { localStorage.setItem('ws2_sidebar', showSidebar.toString()); }
        catch {}
    }, [showSidebar]);

    // ─── Keyboard shortcuts ────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                quickInputRef.current?.focus();
            }
            if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                const tab = TABS.find(t => t.key === e.key);
                if (tab && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
                    e.preventDefault();
                    setBoardView(tab.id);
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                setShowSidebar(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);



    // ─── Quick Add Handler ─────────────────────────────────
    const handleQuickAdd = () => {
        const val = quickInput.trim();
        if (!val) return;

        if (val.startsWith('n:') || val.startsWith('N:')) {
            const noteText = val.slice(2).trim();
            if (noteText) {
                addNote({ id: `qn-${Date.now()}`, text: noteText, date: new Date().toISOString().split('T')[0] });
                addActivity(`📝 Quick note: "${noteText.substring(0, 30)}..."`, 'var(--accent-yellow)', 'global');
            }
        } else {
            const text = val.startsWith('t:') || val.startsWith('T:') ? val.slice(2).trim() : val;
            if (text) {
                addTask({
                    id: `qt-${Date.now()}`, text, status: quickStatus, done: quickStatus === 'done',
                    eventId: events[0]?.id || '', priority: 'medium',
                    due: quickDate, createdAt: new Date().toISOString()
                });
                addActivity(`⚡ Quick task: "${text.substring(0, 30)}..."`, 'var(--accent-primary)', 'global');
            }
        }
        setQuickInput('');
        setQuickDate('');
        setQuickStatus('pending');
    };

    // ─── Tab counts ────────────────────────────────────────
    const getTabCount = (id) => {
        switch (id) {
            case 'kanban': return pendingCount;
            case 'table': return tasks.length;
            default: return null;
        }
    };

    // ─── Ambient color ─────────────────────────────────────
    const ambientColor = completionPercent >= 60
        ? 'rgba(16, 185, 129, 0.06)'
        : completionPercent >= 30
            ? 'rgba(124, 92, 252, 0.06)'
            : 'rgba(245, 158, 11, 0.06)';

    // ─── Render View ───────────────────────────────────────
    const renderView = () => {
        switch (boardView) {
            case 'kanban': return <EventKanbanBoard events={events} />;
            case 'table': return <EventTableView events={events} />;
            case 'timeline': return <EventTimeline />;
            case 'calendar': return <EventCalendar />;
            case 'analytics': return <EventAnalytics tasks={tasks} />;
            case 'canvas': return <EventCanvas />;
            case 'notes': return <EventNotepad />;
            case 'focus': return <EventFocusMode />;
            case 'dmspam': return <EventDmSpam />;
            default: return <EventKanbanBoard events={events} />;
        }
    };



    // ═══════════════════════════════════════════════════════
    // ─── RENDER ────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════
    return (
        <div className="page-content ws2-fullwidth animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

            {/* Ambient Background Glow */}
            <div className="ws2-ambient" style={{ background: ambientColor }} />

            {/* ═══ COMMAND BANNER ═══════════════════════════════ */}
            <div className="ws2-command-banner" style={{ position: 'relative', zIndex: 1 }}>
                <div className="ws2-greeting">
                    <div className="ws2-greeting-text">
                        <Sparkles size={18} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent-primary)', verticalAlign: 'text-bottom' }} />
                        Mission Control
                    </div>
                    <div className="ws2-greeting-sub">
                        {activeEvents.length} eventos activos · {pendingCount} tareas pendientes · {completedCount} completadas
                    </div>
                </div>
                <div className="ws2-banner-metrics">
                    <ProgressRing percent={completionPercent} size={38} stroke={3} color={completionPercent >= 60 ? 'var(--accent-green)' : 'var(--accent-primary)'} />
                    <div className="ws2-banner-metric">
                        <div className="ws2-banner-metric-value" style={{ color: pendingCount > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>{pendingCount}</div>
                        <div className="ws2-banner-metric-label">Pending</div>
                    </div>
                    <div className="ws2-banner-metric">
                        <div className="ws2-banner-metric-value" style={{ color: 'var(--accent-green)' }}>{completedCount}</div>
                        <div className="ws2-banner-metric-label">Done</div>
                    </div>
                    <div className="ws2-banner-metric">
                        <div className="ws2-banner-metric-value" style={{ color: 'var(--accent-primary)' }}>{activeEvents.length}</div>
                        <div className="ws2-banner-metric-label">Events</div>
                    </div>

                </div>
            </div>

            {/* ═══ QUICK ADD BAR ════════════════════════════════ */}
            <div className="ws2-quick-add" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Zap size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <input
                    ref={quickInputRef}
                    className="ws2-quick-add-input"
                    placeholder="Quick add... type to add task, or n: for note"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                    style={{ flex: 1 }}
                />
                
                {/* Status menu next to the Quick Add (nwxt week / new task) */}
                <select
                    className="form-select"
                    value={quickStatus}
                    onChange={e => setQuickStatus(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', background: 'var(--bg-base)', border: 'none', borderRadius: 'var(--radius-md)', outline: 'none' }}
                >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
                
                {/* Date assignment for the calendar */}
                <input
                    type="date"
                    className="form-input"
                    value={quickDate}
                    onChange={e => setQuickDate(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', background: 'var(--bg-base)', color: quickDate ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', outline: 'none' }}
                />

                <div className="ws2-quick-add-hints" style={{ marginLeft: '8px' }}>
                    <span className="ws2-hint-tag" onClick={() => setQuickInput('t: ')}>t: task</span>
                    <span className="ws2-hint-tag" onClick={() => setQuickInput('n: ')}>n: note</span>
                    <span className="ws2-kbd">⌘K</span>
                </div>
            </div>

            {/* ═══ TABS ════════════════════════════════════════ */}
            <div className="ws2-tabs-container" style={{ position: 'relative', zIndex: 1 }}>
                {['plan', 'schedule'].map((group, gi) => {
                    const groupTabs = TABS.filter(t => t.group === group);
                    const groupLabel = group.charAt(0).toUpperCase() + group.slice(1);
                    const groupColorMap = {
                        plan: 'var(--accent-primary)',
                        schedule: 'var(--accent-orange)'
                    };
                    const isGroupActive = groupTabs.some(t => t.id === boardView);
                    return (
                        <div key={group} className="ws2-tab-group-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {gi > 0 && <div className="ws2-tab-separator" />}
                            <span className="ws2-tab-label" style={{
                                color: isGroupActive ? groupColorMap[group] : undefined,
                                opacity: isGroupActive ? 1 : undefined,
                            }}>{groupLabel}</span>
                            {groupTabs.map(tab => {
                                const isActive = boardView === tab.id;
                                const count = getTabCount(tab.id);
                                return (
                                    <button
                                        key={tab.id}
                                        className={`ws2-tab ${isActive ? GROUP_COLORS[tab.group] : ''}`}
                                        onClick={() => setBoardView(tab.id)}
                                        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
                                        onMouseUp={e => { e.currentTarget.style.transform = ''; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                                    >
                                        <tab.icon size={14} style={{ transition: 'transform 0.2s', transform: isActive ? 'scale(1.1)' : 'scale(1)' }} />
                                        <span>{tab.label}</span>
                                        {count !== null && <span className="ws2-tab-count">{count}</span>}
                                        <span className="ws2-tab-shortcut">{tab.key}</span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* ═══ BODY (Main + Sidebar) ═══════════════════════ */}
            <div className="ws2-body" style={{ position: 'relative', zIndex: 1 }}>

                {/* Main View Area */}
                <div className="ws2-main">
                    {renderView()}
                </div>


            </div>

            {/* ═══ FAB — OpenCloud AI ══════════════════════════ */}
            <button
                onClick={() => setShowChat(true)}
                className="ws2-fab"
                title="OpenCloud AI Assistant"
            >
                <Bot size={26} />
            </button>

            {/* ═══ Side Drawer: Chat ══════════════════════════ */}
            <div style={{
                position: 'fixed',
                top: 0, right: 0, bottom: 0,
                width: '400px',
                background: 'var(--bg-canvas)',
                borderLeft: '1px solid var(--border-subtle)',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
                zIndex: 50,
                transform: showChat ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <OpenCloudChat onClose={() => setShowChat(false)} />
            </div>

            {showChat && (
                <div
                    onClick={() => setShowChat(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 45 }}
                />
            )}
        </div>
    );
}
