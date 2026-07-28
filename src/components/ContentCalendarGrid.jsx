import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
    X, Plus, Image as ImageIcon, Calendar, ChevronLeft, ChevronRight, Clock, Hash, AtSign, 
    Sparkles, FileText, Linkedin, MessageSquare, Layers, Target, Type, Trash2, ChevronDown, 
    ChevronUp, Upload, Film, CheckCircle2, Search, Filter, Eye, Heart, MessageCircle, Send, Bookmark, MoreHorizontal 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const CONTENT_TYPES = ['Story', 'Post'];
const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TYPE_COLORS = {
    'Story': '#E1306C',
    'Post': '#6366f1',
};

const STATUS_OPTIONS = [
    { value: 'idea', label: '💡 Idea', color: '#6b7280' },
    { value: 'draft', label: '✏️ Borrador', color: '#f59e0b' },
    { value: 'ready', label: '✅ Listo', color: '#3b82f6' },
    { value: 'published', label: '🚀 Publicado', color: '#22c55e' },
];

const FORMAT_OPTIONS = ['Texto', 'Imagen + Texto', 'Carrusel', 'Video', 'Story Slides', 'Blog Article', 'Thread'];

const PANAMERICAN_SEED = [
    {
        id: 'pan-w1-story-tue', accountId: 'social-panamericanbc', contentType: 'Story', dayIndex: 1, weekOffset: 0,
        topic: 'Anuncio Especial @212club.pa', format: 'Story Slides', status: 'ready',
        caption: '🔥 Este viernes la noche despega con los mejores DJs locales. ¡Reserva tu mesa en bio!',
        slides: 'Slide 1: "¿Listos para el fin de semana?"\nSlide 2: Lineup Revelado\nSlide 3: Link en bio para reservaciones',
        cta: 'DM o link en bio para reservaciones', hashtags: '#212club #panama #nightlife',
        notes: 'Diseñar slides con branding 212.', imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80', scheduledTime: '18:00', createdAt: new Date().toISOString(),
    },
    {
        id: 'pan-w1-post-thu', accountId: 'social-panamericanbc', contentType: 'Post', dayIndex: 3, weekOffset: 0,
        topic: 'Lineup Oficial Fin de Semana', format: 'Carrusel', status: 'draft',
        caption: 'Este fin de semana se vive la mejor experiencia sonora en Panamá 🎧✨\n\nDesliza para ver la cartelera completa.',
        slides: 'Slide 1: Main Lineup\nSlide 2: DJ Guest 1\nSlide 3: VIP Table Info',
        cta: '📩 Escríbenos al DM para lista VIP', hashtags: '#212club #panama #nightlife #electronicmusic',
        notes: 'Carrusel de lineup. Usar fotos con alto contraste.', imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80', scheduledTime: '20:00', createdAt: new Date().toISOString(),
    },
];

export default function ContentCalendarGrid({
    accounts,
    companies = [],
    initialAccounts = [],
    initialCompanies = [],
    onEntriesChange,
    initialEntries
}) {
    const activeAccounts = (accounts && accounts.length > 0) ? accounts : (initialAccounts && initialAccounts.length > 0 ? initialAccounts : []);
    const activeCompanies = (companies && companies.length > 0) ? companies : (initialCompanies && initialCompanies.length > 0 ? initialCompanies : []);
    const { addTask, tasks } = useApp ? useApp() : { addTask: () => {}, tasks: [] };

    const [entries, setEntries] = useState(() => {
        try {
            const saved = localStorage.getItem('os_contentCalendar');
            if (saved) {
                const parsed = JSON.parse(saved);
                const existingIds = new Set(parsed.map(e => e.id));
                const newSeeds = PANAMERICAN_SEED.filter(s => !existingIds.has(s.id));
                if (newSeeds.length > 0) {
                    const merged = [...parsed, ...newSeeds];
                    localStorage.setItem('os_contentCalendar', JSON.stringify(merged));
                    return merged;
                }
                return parsed;
            }
        } catch (e) { /* ignore */ }
        localStorage.setItem('os_contentCalendar', JSON.stringify(PANAMERICAN_SEED));
        return PANAMERICAN_SEED;
    });

    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailTab, setDetailTab] = useState('editor'); // 'editor' | 'preview'
    
    // Filters & Search
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fileInputRef = useRef(null);

    const getWeekStart = (offset) => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setDate(monday.getDate() + offset * 7);
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
    const weekDates = useMemo(() => DAY_LABELS.map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    }), [weekStart]);

    const saveEntries = (newEntries) => {
        setEntries(newEntries);
        try { 
            localStorage.setItem('os_contentCalendar', JSON.stringify(newEntries)); 
            window.dispatchEvent(new Event('contentCalendarUpdated'));
        } catch (e) { /* ignore */ }
    };

    const getEntry = (accountId, contentType, dayIndex) => {
        return entries.find(e =>
            e.accountId === accountId &&
            e.contentType === contentType &&
            e.dayIndex === dayIndex &&
            e.weekOffset === weekOffset
        );
    };

    const handleCellClick = (accountId, contentType, dayIndex) => {
        const existing = getEntry(accountId, contentType, dayIndex);
        if (existing) {
            setSelectedEntry(existing);
        } else {
            const newEntry = {
                id: `ce-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                accountId, contentType, dayIndex, weekOffset,
                topic: '', format: '', status: 'idea',
                caption: '', blogContent: '', linkedinText: '', slides: '',
                cta: '', hashtags: '', notes: '', imageUrl: '', scheduledTime: '',
                createdAt: new Date().toISOString(),
            };
            saveEntries([...entries, newEntry]);
            setSelectedEntry(newEntry);
        }
        setShowDetail(true);
        setDetailTab('editor');
    };

    const updateEntry = (id, field, value) => {
        const updated = entries.map(e => e.id === id ? { ...e, [field]: value } : e);
        saveEntries(updated);
        setSelectedEntry(prev => prev && prev.id === id ? { ...prev, [field]: value } : prev);
    };

    const deleteEntry = (id) => {
        saveEntries(entries.filter(e => e.id !== id));
        setSelectedEntry(null);
        setShowDetail(false);
    };

    const handleFileUpload = useCallback((files) => {
        if (!selectedEntry) return;
        const currentMedia = selectedEntry.mediaFiles || [];
        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const mediaItem = {
                    id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    name: file.name,
                    type: file.type,
                    data: e.target.result,
                };
                const updatedMedia = [...currentMedia, mediaItem];
                currentMedia.push(mediaItem);
                updateEntry(selectedEntry.id, 'mediaFiles', updatedMedia);
            };
            reader.readAsDataURL(file);
        });
    }, [selectedEntry]);

    const removeMediaFile = useCallback((entryId, mediaId) => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        const updatedMedia = (entry.mediaFiles || []).filter(m => m.id !== mediaId);
        updateEntry(entryId, 'mediaFiles', updatedMedia);
    }, [entries]);

    const ACCOUNT_COLORS = ['#E1306C', '#579bfc', '#a25ddc', '#fdab3d', '#e2445c', '#00d2d3'];

    const today = new Date();
    const todayDayIndex = (() => { const d = today.getDay(); return d === 0 ? 6 : d - 1; })();
    const isCurrentWeek = weekOffset === 0;

    const weekEntries = entries.filter(e => e.weekOffset === weekOffset);
    const filledCount = weekEntries.filter(e => e.caption || e.blogContent || e.slides).length;
    const readyCount = weekEntries.filter(e => e.status === 'ready' || e.status === 'published').length;
    const draftCount = weekEntries.filter(e => e.status === 'draft').length;
    const totalSlots = (activeAccounts.length || 1) * CONTENT_TYPES.length * 7;
    const progressPct = totalSlots > 0 ? Math.round((filledCount / totalSlots) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0', padding: '6px 0' }}>
            {/* Top Navigation & Stats Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <Calendar size={18} style={{ color: '#E1306C' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Parrilla de Contenidos</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                        {weekDates[0].toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('es-PA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: 'rgba(225,48,108,0.15)', color: '#E1306C' }}>
                        {filledCount} publicaciones
                    </span>
                    {readyCount > 0 && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✅ {readyCount} listos</span>}
                    {draftCount > 0 && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>✏️ {draftCount} borradores</span>}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="btn btn-ghost" style={{ padding: '5px 8px', borderRadius: '8px' }} onClick={() => setWeekOffset(prev => prev - 1)}><ChevronLeft size={16} /></button>
                    <button className="btn btn-primary" style={{ fontSize: '11px', padding: '5px 12px', background: '#E1306C', borderColor: '#E1306C', borderRadius: '8px' }} onClick={() => setWeekOffset(0)}>Hoy</button>
                    <button className="btn btn-ghost" style={{ padding: '5px 8px', borderRadius: '8px' }} onClick={() => setWeekOffset(prev => prev + 1)}><ChevronRight size={16} /></button>
                </div>
            </div>

            {/* Quick Filters Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', marginBottom: '12px', flexWrap: 'wrap'
            }}>
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-base)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '180px', maxWidth: '300px' }}>
                    <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar en la parrilla..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '11px', width: '100%' }}
                    />
                    {searchQuery && <X size={12} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }} onClick={() => setSearchQuery('')} />}
                </div>

                {/* Filter Status Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, marginRight: '4px' }}>Estado:</span>
                    <button 
                        onClick={() => setFilterStatus('all')}
                        style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            border: filterStatus === 'all' ? '1px solid #E1306C' : '1px solid transparent',
                            background: filterStatus === 'all' ? 'rgba(225,48,108,0.2)' : 'transparent',
                            color: filterStatus === 'all' ? '#E1306C' : 'var(--text-tertiary)'
                        }}
                    >Todos</button>
                    {STATUS_OPTIONS.map(s => (
                        <button 
                            key={s.value} 
                            onClick={() => setFilterStatus(s.value)}
                            style={{
                                padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                                border: filterStatus === s.value ? `1px solid ${s.color}` : '1px solid transparent',
                                background: filterStatus === s.value ? `${s.color}20` : 'transparent',
                                color: filterStatus === s.value ? s.color : 'var(--text-tertiary)'
                            }}
                        >{s.label}</button>
                    ))}
                </div>

                {/* Filter Type Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, marginRight: '4px' }}>Tipo:</span>
                    <button 
                        onClick={() => setFilterType('all')}
                        style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            border: filterType === 'all' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                            background: filterType === 'all' ? 'rgba(99,102,241,0.2)' : 'transparent',
                            color: filterType === 'all' ? 'var(--accent-primary)' : 'var(--text-tertiary)'
                        }}
                    >Todos</button>
                    {CONTENT_TYPES.map(t => (
                        <button 
                            key={t} 
                            onClick={() => setFilterType(t)}
                            style={{
                                padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                                border: filterType === t ? `1px solid ${TYPE_COLORS[t]}` : '1px solid transparent',
                                background: filterType === t ? `${TYPE_COLORS[t]}20` : 'transparent',
                                color: filterType === t ? TYPE_COLORS[t] : 'var(--text-tertiary)'
                            }}
                        >{t}</button>
                    ))}
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progreso Semanal de Contenido</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: progressPct >= 70 ? '#22c55e' : progressPct >= 30 ? '#f59e0b' : 'var(--text-tertiary)' }}>{progressPct}% finalizado</span>
                </div>
                <div style={{ width: '100%', height: '5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                        width: `${progressPct}%`, height: '100%', borderRadius: '4px',
                        background: progressPct >= 70 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : progressPct >= 30 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #E1306C, #f472b6)',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>

            {/* Main Grid */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)', borderRadius: showDetail ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '14%', background: 'var(--bg-surface)' }}>Cuenta</th>
                            <th style={{ ...thStyle, width: '9%', background: 'var(--bg-surface)' }}>Tipo</th>
                            {DAY_LABELS.map((day, i) => {
                                const isTodayCol = isCurrentWeek && i === todayDayIndex;
                                return (
                                    <th key={day} style={{
                                        ...thStyle,
                                        width: '11%',
                                        background: isTodayCol ? 'rgba(225,48,108,0.14)' : 'var(--bg-surface)',
                                        color: isTodayCol ? '#E1306C' : 'var(--text-tertiary)',
                                        fontWeight: isTodayCol ? 800 : 600,
                                        borderBottom: isTodayCol ? '3px solid #E1306C' : '2px solid rgba(255,255,255,0.12)',
                                        position: 'relative',
                                    }}>
                                        {isTodayCol && <div style={{ position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)', width: '6px', height: '6px', borderRadius: '50%', background: '#E1306C', boxShadow: '0 0 8px #E1306C' }} />}
                                        <div style={{ fontSize: isTodayCol ? '12px' : '11px', marginTop: isTodayCol ? '4px' : '0' }}>{day}</div>
                                        <div style={{ fontSize: isTodayCol ? '11px' : '10px', opacity: isTodayCol ? 1 : 0.7, marginTop: '2px', fontWeight: isTodayCol ? 700 : 400 }}>{weekDates[i].getDate()}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {activeAccounts.length === 0 ? (
                            <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>No hay cuentas vinculadas.</td></tr>
                        ) : (
                            activeAccounts.map((account, accIdx) => {
                                const accentColor = ACCOUNT_COLORS[accIdx % ACCOUNT_COLORS.length];
                                const cmp = (activeCompanies || []).find(c => c && c.id === account.companyId);
                                
                                return CONTENT_TYPES.map((type, typeIdx) => {
                                    if (filterType !== 'all' && filterType !== type) return null;

                                    return (
                                        <tr key={`${account.id}-${type}`}>
                                            {typeIdx === 0 && (
                                                <td rowSpan={CONTENT_TYPES.length} style={{
                                                    ...cellStyle, background: `${accentColor}20`, color: accentColor, fontWeight: 700, fontSize: '12px',
                                                    textAlign: 'center',
                                                    borderBottom: '3px solid var(--bg-canvas)', borderLeft: `4px solid ${accentColor}`,
                                                    padding: '12px 8px', verticalAlign: 'middle',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                }}>
                                                    <div style={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>{account.handler || account.platform}</div>
                                                    {cmp && <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>{cmp.name}</div>}
                                                </td>
                                            )}
                                            <td style={{
                                                ...cellStyle, background: `${accentColor}0a`, fontSize: '11.5px', fontWeight: 600,
                                                color: TYPE_COLORS[type] || 'var(--text-secondary)', padding: '12px 8px',
                                                borderBottom: typeIdx === CONTENT_TYPES.length - 1 ? '3px solid var(--bg-canvas)' : '1px solid rgba(255,255,255,0.08)',
                                            }}>{type}</td>
                                            {DAY_LABELS.map((_, dayIdx) => {
                                                const entry = getEntry(account.id, type, dayIdx);
                                                const isTodayCell = isCurrentWeek && dayIdx === todayDayIndex;
                                                const hasContent = entry && (entry.caption || entry.blogContent || entry.slides || entry.status !== 'idea' || entry.topic);
                                                const statusInfo = entry ? STATUS_OPTIONS.find(s => s.value === entry.status) : null;
                                                const isSelected = selectedEntry && entry && selectedEntry.id === entry.id;

                                                // Filter checks
                                                const matchesStatus = filterStatus === 'all' || (entry && entry.status === filterStatus);
                                                const matchesSearch = !searchQuery || (entry && (
                                                    (entry.topic && entry.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                    (entry.caption && entry.caption.toLowerCase().includes(searchQuery.toLowerCase()))
                                                ));

                                                const isDimmed = (filterStatus !== 'all' && !matchesStatus) || (searchQuery && !matchesSearch);

                                                const baseBg = isTodayCell ? 'rgba(225,48,108,0.08)' : `${accentColor}08`;
                                                const cellBg = isSelected ? 'rgba(225,48,108,0.22)' : baseBg;

                                                const thumbnailSrc = entry?.mediaFiles?.[0]?.data || entry?.imageUrl;

                                                return (
                                                    <td key={dayIdx}
                                                        onClick={() => handleCellClick(account.id, type, dayIdx)}
                                                        className="calendar-cell"
                                                        style={{
                                                            ...cellStyle,
                                                            background: cellBg,
                                                            opacity: isDimmed ? 0.35 : 1,
                                                            cursor: 'pointer', transition: 'all 0.2s ease',
                                                            borderBottom: typeIdx === CONTENT_TYPES.length - 1 ? '3px solid var(--bg-canvas)' : '1px solid rgba(255,255,255,0.06)',
                                                            borderRight: '1px solid rgba(255,255,255,0.05)',
                                                            borderLeft: isTodayCell ? '2px solid rgba(225,48,108,0.3)' : 'none',
                                                            padding: '8px', verticalAlign: 'top', minHeight: '90px', height: '90px',
                                                            outline: isSelected ? '2px solid #E1306C' : 'none',
                                                            outlineOffset: isSelected ? '-2px' : '0',
                                                            position: 'relative',
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (!isSelected) e.currentTarget.style.background = 'rgba(225,48,108,0.12)';
                                                            const plus = e.currentTarget.querySelector('.cell-plus');
                                                            if (plus) plus.style.opacity = '1';
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (!isSelected) e.currentTarget.style.background = cellBg;
                                                            const plus = e.currentTarget.querySelector('.cell-plus');
                                                            if (plus) plus.style.opacity = '0';
                                                        }}
                                                    >
                                                        {hasContent ? (
                                                            <div style={{
                                                                background: `linear-gradient(135deg, ${statusInfo?.color || '#6b7280'}22, rgba(20,20,30,0.85))`,
                                                                border: `1px solid ${statusInfo?.color || '#6b7280'}40`,
                                                                borderRadius: '8px', padding: '6px 8px', fontSize: '11px',
                                                                color: statusInfo?.color || 'var(--text-secondary)', fontWeight: 600,
                                                                display: 'flex', flexDirection: 'column', gap: '6px',
                                                                boxShadow: isSelected ? '0 0 12px rgba(225,48,108,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                                                                backdropFilter: 'blur(8px)',
                                                                height: '100%',
                                                            }}>
                                                                {/* Top Row: Thumbnail + Status pill */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                                    {thumbnailSrc ? (
                                                                        <img src={thumbnailSrc} alt="Preview" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                                                                    ) : (
                                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusInfo?.color || '#6b7280', flexShrink: 0 }} />
                                                                    )}
                                                                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: statusInfo?.color, textTransform: 'uppercase', letterSpacing: '0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {statusInfo?.label}
                                                                    </span>
                                                                </div>

                                                                {/* Title / Topic */}
                                                                <span style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                                                                    {entry.topic ? entry.topic : (entry.caption ? entry.caption.substring(0, 30) + '…' : 'Sin título')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="cell-plus" style={{
                                                                opacity: 0, transition: 'opacity 0.2s',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                width: '100%', height: '100%', minHeight: '36px',
                                                                color: 'rgba(225,48,108,0.5)', fontSize: '16px'
                                                            }}>
                                                                <Plus size={14} />
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ═══ DETAIL PANEL & MOCKUP PREVIEW — below grid ═══ */}
            {showDetail && selectedEntry && (
                <div style={{
                    flexShrink: 0, background: 'var(--bg-card)',
                    borderTop: '3px solid #E1306C', border: '1px solid var(--border-subtle)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    minHeight: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    marginTop: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    animation: 'slideInUp 0.2s ease',
                }}>
                    {/* Header with Mode Switcher */}
                    <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: `${TYPE_COLORS[selectedEntry.contentType] || '#6366f1'}25`, color: TYPE_COLORS[selectedEntry.contentType] || '#6366f1' }}>
                                    {selectedEntry.contentType}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {(() => { const acc = accounts.find(a => a.id === selectedEntry.accountId); return acc ? (acc.handler || acc.platform) : '@212club.pa'; })()}
                                </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {DAY_LABELS[selectedEntry.dayIndex]} {weekDates[selectedEntry.dayIndex]?.toLocaleDateString('es-PA', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>

                            {/* TAB SWITCHER: Editor vs Instagram Preview */}
                            <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                                <button 
                                    onClick={() => setDetailTab('editor')}
                                    style={{
                                        padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none',
                                        background: detailTab === 'editor' ? 'var(--accent-primary)' : 'transparent',
                                        color: detailTab === 'editor' ? '#fff' : 'var(--text-tertiary)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    ✏️ Editor
                                </button>
                                <button 
                                    onClick={() => setDetailTab('preview')}
                                    style={{
                                        padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none',
                                        background: detailTab === 'preview' ? '#E1306C' : 'transparent',
                                        color: detailTab === 'preview' ? '#fff' : 'var(--text-tertiary)',
                                        display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Eye size={12} /> Vista Previa Instagram
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                                const acc = accounts.find(a => a.id === selectedEntry.accountId);
                                const context = acc ? (acc.platform === 'Evento' ? `event_${acc.id}` : `company_${acc.companyId || acc.id}`) : '';
                                const isLinked = tasks.some(t => t.context === context && t.title.includes(selectedEntry.topic) && selectedEntry.topic !== '');
                                return (
                                    <button 
                                        className={`btn ${isLinked ? 'btn-ghost' : 'btn-primary'}`} 
                                        style={{ fontSize: '11px', padding: '5px 12px', background: isLinked ? 'var(--bg-canvas)' : 'var(--accent-primary)', color: isLinked ? 'var(--text-tertiary)' : '#fff', border: 'none' }}
                                        onClick={() => {
                                            if (isLinked || !selectedEntry.topic) return;
                                            addTask({
                                                title: `Contenido: ${selectedEntry.topic}`,
                                                description: `Formato: ${selectedEntry.format}\nStatus: ${selectedEntry.status}\n\n${selectedEntry.caption}`,
                                                context: context,
                                                priority: 'medium', group: 'execute', column: 'todo'
                                            });
                                        }}
                                    >
                                        {isLinked ? <><CheckCircle2 size={12} style={{ marginRight: '4px' }}/> En Kanban</> : <><Plus size={12} style={{ marginRight: '4px' }}/> Crear Tarea Kanban</>}
                                    </button>
                                );
                            })()}
                            <button className="btn btn-ghost" style={{ color: 'var(--accent-red)', fontSize: '11px', padding: '5px 8px' }} onClick={() => deleteEntry(selectedEntry.id)}>
                                <Trash2 size={12} style={{ marginRight: '3px' }}/> Eliminar
                            </button>
                            <button className="btn btn-primary" style={{ fontSize: '11px', padding: '5px 14px', background: '#E1306C', borderColor: '#E1306C' }} onClick={() => setShowDetail(false)}>Guardar / Cerrar</button>
                            <button className="btn-icon" onClick={() => setShowDetail(false)} style={{ color: 'var(--text-tertiary)' }}><X size={16} /></button>
                        </div>
                    </div>

                    {/* Content View: Editor or Instagram Preview */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'thin' }}>
                        {detailTab === 'editor' ? (
                            /* EDITOR MODE */
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                                {/* Left column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}><Target size={11} /> Tema / Objetivo del Post</label>
                                        <input type="text" value={selectedEntry.topic || ''} onChange={e => updateEntry(selectedEntry.id, 'topic', e.target.value)}
                                            placeholder="Título o temática del contenido..." style={inputStyle} />
                                    </div>

                                    <div>
                                        <label style={labelStyle}>Estado del Contenido</label>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {STATUS_OPTIONS.map(s => (
                                                <button key={s.value} onClick={() => updateEntry(selectedEntry.id, 'status', s.value)}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                                        border: selectedEntry.status === s.value ? `2px solid ${s.color}` : '1px solid var(--border-subtle)',
                                                        background: selectedEntry.status === s.value ? `${s.color}25` : 'transparent',
                                                        color: selectedEntry.status === s.value ? s.color : 'var(--text-tertiary)',
                                                    }}>{s.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={labelStyle}><Layers size={11} /> Formato</label>
                                        <select value={selectedEntry.format || ''} onChange={e => updateEntry(selectedEntry.id, 'format', e.target.value)}
                                            style={{ ...inputStyle, cursor: 'pointer' }}>
                                            <option value="">Seleccionar formato...</option>
                                            {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={labelStyle}><MessageSquare size={11} /> Call to Action (CTA)</label>
                                        <input type="text" value={selectedEntry.cta || ''} onChange={e => updateEntry(selectedEntry.id, 'cta', e.target.value)}
                                            placeholder="📩 Escríbenos al DM para reservar..." style={inputStyle} />
                                    </div>

                                    <div>
                                        <label style={labelStyle}><Hash size={11} /> Hashtags</label>
                                        <input type="text" value={selectedEntry.hashtags || ''} onChange={e => updateEntry(selectedEntry.id, 'hashtags', e.target.value)}
                                            placeholder="#212club #panama #nightlife" style={inputStyle} />
                                    </div>

                                    {/* Media Upload */}
                                    <div>
                                        <label style={labelStyle}><ImageIcon size={11} /> Archivo / Arte Gráfico</label>
                                        <input type="file" ref={fileInputRef} multiple accept="image/*,video/*"
                                            style={{ display: 'none' }}
                                            onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }} />
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                border: '1.5px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                                padding: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                                background: 'rgba(255,255,255,0.02)'
                                            }}
                                        >
                                            <Upload size={18} style={{ color: '#E1306C' }} />
                                            <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>Cargar Imagen o Video del Arte</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Formatos JPG, PNG, MP4 (máx 5MB)</span>
                                        </div>

                                        {(selectedEntry.mediaFiles || []).length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                                {(selectedEntry.mediaFiles || []).map(media => (
                                                    <div key={media.id} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                                        <img src={media.data} alt={media.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <button onClick={(e) => { e.stopPropagation(); removeMediaFile(selectedEntry.id, media.id); }}
                                                            style={{
                                                                position: 'absolute', top: '3px', right: '3px', width: '16px', height: '16px',
                                                                borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: 'none', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                                            }}>
                                                            <X size={10} style={{ color: '#fff' }} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <input type="text" value={selectedEntry.imageUrl || ''} onChange={e => updateEntry(selectedEntry.id, 'imageUrl', e.target.value)}
                                            placeholder="O ingresa la URL de la imagen del arte..." style={{ ...inputStyle, marginTop: '8px', fontSize: '11px' }} />
                                    </div>
                                </div>

                                {/* Right column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <label style={{ ...labelStyle, margin: 0 }}><Type size={11} /> Caption / Copy Principal (Instagram/TikTok)</label>
                                            <button 
                                                onClick={() => {
                                                    const topicText = selectedEntry.topic || 'Evento especial';
                                                    const generatedCopy = `🔥 ¡Este fin de semana en @212club.pa!\n\n${topicText} ✨ Viviremos una noche inolvidable llena de buena música, excelentes tragos y la mejor atmósfera de la ciudad.\n\n📍 Nos vemos en 212 Club Panama.\n🍾 Reservas de mesas VIP disponibles directas en el link de la bio.`;
                                                    updateEntry(selectedEntry.id, 'caption', generatedCopy);
                                                    if (!selectedEntry.cta) updateEntry(selectedEntry.id, 'cta', '📩 Reserva tu mesa VIP al DM o link en bio');
                                                    if (!selectedEntry.hashtags) updateEntry(selectedEntry.hashtags || selectedEntry.id, 'hashtags', '#212club #panamanightlife #panamacity #party');
                                                }}
                                                style={{
                                                    fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                                                    background: 'linear-gradient(90deg, #E1306C, #a25ddc)', color: '#fff',
                                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                    boxShadow: '0 2px 6px rgba(225,48,108,0.3)'
                                                }}
                                            >
                                                <Sparkles size={11} /> ✨ Generar Copy con IA
                                            </button>
                                        </div>
                                        <textarea value={selectedEntry.caption || ''} onChange={e => updateEntry(selectedEntry.id, 'caption', e.target.value)}
                                            placeholder="Escribe el texto principal de la publicación..."
                                            style={{ ...textareaStyle, minHeight: '110px' }} />
                                    </div>

                                    {/* Checklist de Publicación */}
                                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                        <label style={{ ...labelStyle, marginBottom: '8px', color: 'var(--text-primary)' }}><CheckCircle2 size={11} color="#22c55e" /> Checklist de Publicación</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: selectedEntry.caption ? '#4ade80' : 'var(--text-tertiary)' }}>
                                                {selectedEntry.caption ? '✅' : '⚪'} Copy redactado
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: selectedEntry.hashtags ? '#4ade80' : 'var(--text-tertiary)' }}>
                                                {selectedEntry.hashtags ? '✅' : '⚪'} Hashtags definidos
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (selectedEntry.imageUrl || (selectedEntry.mediaFiles && selectedEntry.mediaFiles.length > 0)) ? '#4ade80' : 'var(--text-tertiary)' }}>
                                                {(selectedEntry.imageUrl || (selectedEntry.mediaFiles && selectedEntry.mediaFiles.length > 0)) ? '✅' : '⚪'} Arte vinculado
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: selectedEntry.scheduledTime ? '#4ade80' : 'var(--text-tertiary)' }}>
                                                {selectedEntry.scheduledTime ? '✅' : '⚪'} Hora programada
                                            </div>
                                        </div>
                                    </div>

                                    {(selectedEntry.contentType === 'Story' || selectedEntry.format === 'Carrusel' || selectedEntry.format === 'Story Slides') && (
                                        <div>
                                            <label style={{ ...labelStyle, color: '#E1306C' }}><Layers size={11} /> Secuencia de Slides / Stories</label>
                                            <textarea value={selectedEntry.slides || ''} onChange={e => updateEntry(selectedEntry.id, 'slides', e.target.value)}
                                                placeholder="Slide 1: ...&#10;Slide 2: ...&#10;Slide 3: ..."
                                                style={{ ...textareaStyle, minHeight: '80px' }} />
                                        </div>
                                    )}

                                    <div>
                                        <label style={labelStyle}><Sparkles size={11} /> Notas Internas / Indicaciones</label>
                                        <textarea value={selectedEntry.notes || ''} onChange={e => updateEntry(selectedEntry.id, 'notes', e.target.value)}
                                            placeholder="Indicaciones para el diseñador o community manager..." style={{ ...textareaStyle, minHeight: '55px' }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* INSTAGRAM LIVE MOCKUP PREVIEW MODE */
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                                <div style={{
                                    width: '380px', background: '#000000', border: '1px solid #262626',
                                    borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                                    color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                                }}>
                                    {/* Instagram Post Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #1a1a1a' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '50%', padding: '2px',
                                                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'
                                            }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff' }}>
                                                    212
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {(() => { const acc = accounts.find(a => a.id === selectedEntry.accountId); return acc ? (acc.handler || acc.platform) : '212club.pa'; })()}
                                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3897f0', display: 'inline-block' }} />
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#a8a8a8' }}>Panama City, Panama</div>
                                            </div>
                                        </div>
                                        <MoreHorizontal size={18} color="#a8a8a8" style={{ cursor: 'pointer' }} />
                                    </div>

                                    {/* Main Media Box */}
                                    <div style={{ width: '100%', height: '340px', background: '#121212', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {selectedEntry.mediaFiles?.[0]?.data || selectedEntry.imageUrl ? (
                                            <img 
                                                src={selectedEntry.mediaFiles?.[0]?.data || selectedEntry.imageUrl} 
                                                alt="Arte Post" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                background: 'radial-gradient(circle at center, #2e1065 0%, #09090b 100%)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                padding: '24px', textAlign: 'center', gap: '12px'
                                            }}>
                                                <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(225,48,108,0.15)', color: '#E1306C' }}>
                                                    <ImageIcon size={32} />
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                                                    {selectedEntry.topic || 'Vista Previa del Contenido'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#a8a8a8', padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                                                    Formato: {selectedEntry.format || selectedEntry.contentType}
                                                </span>
                                            </div>
                                        )}
                                        <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600 }}>
                                            {selectedEntry.contentType}
                                        </span>
                                    </div>

                                    {/* Action Bar */}
                                    <div style={{ padding: '12px 14px 6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <Heart size={22} color="#fff" style={{ cursor: 'pointer' }} />
                                                <MessageCircle size={22} color="#fff" style={{ cursor: 'pointer' }} />
                                                <Send size={20} color="#fff" style={{ cursor: 'pointer' }} />
                                            </div>
                                            <Bookmark size={22} color="#fff" style={{ cursor: 'pointer' }} />
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                                            1,428 Me gusta
                                        </div>

                                        {/* Caption text */}
                                        <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#f5f5f5', whiteSpace: 'pre-line' }}>
                                            <span style={{ fontWeight: 700, marginRight: '6px', color: '#fff' }}>
                                                {(() => { const acc = accounts.find(a => a.id === selectedEntry.accountId); return acc ? (acc.handler || acc.platform) : '212club.pa'; })()}
                                            </span>
                                            {selectedEntry.caption || 'Agrega un caption en el editor para visualizarlo aquí...'}
                                        </div>

                                        {/* CTA Highlight */}
                                        {selectedEntry.cta && (
                                            <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(225,48,108,0.15)', borderLeft: '3px solid #E1306C', borderRadius: '4px', fontSize: '11px', color: '#E1306C', fontWeight: 600 }}>
                                                {selectedEntry.cta}
                                            </div>
                                        )}

                                        {/* Hashtags */}
                                        {selectedEntry.hashtags && (
                                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#3897f0' }}>
                                                {selectedEntry.hashtags}
                                            </div>
                                        )}

                                        <div style={{ fontSize: '10px', color: '#737373', marginTop: '8px', textTransform: 'uppercase' }}>
                                            Hace 2 horas
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Styles ─────────────────────────────────────────────────────────
const thStyle = {
    padding: '8px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-tertiary)', borderBottom: '2px solid rgba(255,255,255,0.12)',
    textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--bg-surface)', whiteSpace: 'nowrap',
};

const cellStyle = {
    padding: '4px 6px', borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', color: 'var(--text-primary)',
};

const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700,
    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px',
};

const inputStyle = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '8px 10px', fontSize: '13px', outline: 'none',
};

const textareaStyle = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '10px',
    fontSize: '13px', lineHeight: '1.6', outline: 'none', resize: 'vertical',
};
