import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Image as ImageIcon, Calendar, ChevronLeft, ChevronRight, Clock, Hash, AtSign, Sparkles, FileText, Linkedin, MessageSquare, Layers, Target, Type, Trash2, ChevronDown, ChevronUp, Upload, Film, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CONTENT_TYPES = ['Story', 'Post'];

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TYPE_COLORS = {
    'Story': '#E1306C',
    'Post': '#6366f1',
};

const STATUS_OPTIONS = [
    { value: 'idea', label: '💡 Idea', color: '#6b7280' },
    { value: 'draft', label: '✏️ Draft', color: '#f59e0b' },
    { value: 'ready', label: '✅ Ready', color: '#3b82f6' },
    { value: 'published', label: '🚀 Published', color: '#22c55e' },
];

const FORMAT_OPTIONS = ['Texto', 'Imagen + Texto', 'Carrusel', 'Video', 'Story Slides', 'Blog Article', 'Thread'];

// ── Pre-seeded content for Panamerican BC Week 1 ───────────────────
const PANAMERICAN_SEED = [
    // MARTES — Blog
    {
        id: 'pan-w1-blog-tue', accountId: 'social-panamericanbc', contentType: 'Blog', dayIndex: 1, weekOffset: 0,
        topic: 'Cómo ejecutar un proyecto de construcción sin sobrecostos en Panamá',
        format: 'Blog Article',
        status: 'draft',
        caption: 'Cómo evitar sobrecostos en proyectos de construcción en Panamá',
        blogContent: `# Cómo evitar sobrecostos en proyectos de construcción en Panamá

## 1. Introducción
Los sobrecostos son uno de los mayores problemas en la construcción…

## 2. Principales causas
• Mala planificación
• Cambios durante ejecución
• Falta de supervisión
• Mala gestión de proveedores

## 3. Nuestra metodología
En Panamerican BC trabajamos con:
• Planificación detallada desde inicio
• Control financiero por proyecto
• Supervisión constante
• Coordinación técnica

## 4. Conclusión
Un proyecto bien ejecutado no depende de suerte, sino de estructura.`,
        cta: 'Si tienes un proyecto, contáctanos.',
        hashtags: '#construccion #panama #panamericanbc #obrasciviles #constructora',
        linkedinText: `El mayor problema en construcción no es el costo inicial…
son los sobrecostos.

En nuestra experiencia, esto ocurre por:
• Falta de planificación
• Cambios sin control
• Mala supervisión

La solución: estructura + control desde el día 1.

📩 Si estás evaluando un proyecto, hablemos.`,
        notes: 'Publicar blog en web → compartir en LinkedIn y X el mismo día. Coordinar con Story.',
        imageUrl: '', slides: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // MARTES — LinkedIn/X
    {
        id: 'pan-w1-li-tue', accountId: 'social-panamericanbc', contentType: 'LinkedIn/X', dayIndex: 1, weekOffset: 0,
        topic: 'Sobrecostos en construcción',
        format: 'Thread',
        status: 'draft',
        caption: `El mayor problema en construcción no es el costo inicial…
son los sobrecostos.

En nuestra experiencia, esto ocurre por:
• Falta de planificación
• Cambios sin control
• Mala supervisión

La solución: estructura + control desde el día 1.

📩 Si estás evaluando un proyecto, hablemos.`,
        cta: '📩 Si estás evaluando un proyecto, hablemos.',
        hashtags: '#construccion #panama #B2B #proyectos',
        linkedinText: '',
        blogContent: '',
        notes: 'Versión corta del blog del martes. Publicar en LinkedIn y X.',
        imageUrl: '', slides: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // MARTES — Story
    {
        id: 'pan-w1-story-tue', accountId: 'social-panamericanbc', contentType: 'Story', dayIndex: 1, weekOffset: 0,
        topic: '¿Por qué los proyectos se encarecen?',
        format: 'Story Slides',
        status: 'draft',
        caption: '',
        slides: `Slide 1: "¿Por qué los proyectos se encarecen?"
Slide 2: "Mala planificación = +$$$"
Slide 3: "Nosotros lo evitamos desde el inicio"`,
        cta: 'Swipe up / DM para más info',
        hashtags: '#construccion #panama',
        linkedinText: '', blogContent: '',
        notes: 'Acompaña el blog del martes. Diseñar slides con branding Panamerican.',
        imageUrl: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // JUEVES — Post IG #1
    {
        id: 'pan-w1-post-thu', accountId: 'social-panamericanbc', contentType: 'Post', dayIndex: 3, weekOffset: 0,
        topic: 'Autoridad + experiencia — +60 proyectos',
        format: 'Carrusel',
        status: 'draft',
        caption: `Más de una década ejecutando proyectos en Panamá.

Trabajamos con estándares altos, planificación rigurosa y enfoque en resultados.

📩 Abiertos a nuevos proyectos y alianzas.`,
        slides: `Slide 1: "+60 proyectos ejecutados en Panamá"
Slide 2: Obras civiles
Slide 3: Sistemas eléctricos
Slide 4: Infraestructura hidráulica
Slide 5: Proyectos mecánicos
Slide 6: "Experiencia real. Resultados reales."`,
        cta: '📩 Abiertos a nuevos proyectos y alianzas.',
        hashtags: '#panamericanbc #construccion #panama #obrasciviles #ingenieria #infraestructura',
        linkedinText: '', blogContent: '',
        notes: 'Carrusel de autoridad. Mostrar fotos reales de proyectos si hay. Fondo oscuro + tipografía bold.',
        imageUrl: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // VIERNES — Blog #2
    {
        id: 'pan-w1-blog-fri', accountId: 'social-panamericanbc', contentType: 'Blog', dayIndex: 4, weekOffset: 0,
        topic: 'Qué buscar al contratar una empresa constructora en Panamá',
        format: 'Blog Article',
        status: 'draft',
        caption: 'Cómo elegir correctamente una empresa constructora en Panamá',
        blogContent: `# Cómo elegir correctamente una empresa constructora en Panamá

## 1. Experiencia comprobada
No solo portafolio, sino ejecución real.

## 2. Capacidad técnica
Equipo, procesos y supervisión.

## 3. Control financiero
Clave para evitar desviaciones.

## 4. Cumplimiento
Tiempo + calidad.

---

**Cierre:** Elegir mal cuesta dinero. Elegir bien es una inversión.`,
        cta: 'Contáctanos para tu próximo proyecto.',
        hashtags: '#constructora #panama #construccion #ingenieria',
        linkedinText: `Elegir una constructora no es solo comparar precios.

Es evaluar:
• Experiencia real
• Capacidad técnica
• Control del proyecto
• Cumplimiento

Una mala decisión puede duplicar el costo final.`,
        notes: 'Blog #2 de la semana. Publicar en web y compartir en LinkedIn/X.',
        imageUrl: '', slides: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // VIERNES — LinkedIn/X #2
    {
        id: 'pan-w1-li-fri', accountId: 'social-panamericanbc', contentType: 'LinkedIn/X', dayIndex: 4, weekOffset: 0,
        topic: 'Cómo elegir constructora',
        format: 'Thread',
        status: 'draft',
        caption: `Elegir una constructora no es solo comparar precios.

Es evaluar:
• Experiencia real
• Capacidad técnica
• Control del proyecto
• Cumplimiento

Una mala decisión puede duplicar el costo final.`,
        cta: '', hashtags: '#constructora #panama #B2B',
        linkedinText: '', blogContent: '',
        notes: 'Versión corta del blog #2. Publicar en LinkedIn y X el viernes.',
        imageUrl: '', slides: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // DOMINGO — Post IG #2
    {
        id: 'pan-w1-post-sun', accountId: 'social-panamericanbc', contentType: 'Post', dayIndex: 6, weekOffset: 0,
        topic: 'Servicios + venta directa',
        format: 'Imagen + Texto',
        status: 'draft',
        caption: `En Panamerican BC desarrollamos proyectos completos, desde planificación hasta ejecución.

Servicios de construcción en Panamá:
• Obras civiles
• Sistemas eléctricos
• Infraestructura hidráulica
• Proyectos mecánicos

📩 Contáctanos para cotizar tu proyecto.`,
        cta: '📩 Contáctanos para cotizar tu proyecto.',
        hashtags: '#panamericanbc #construccion #panama #servicios #cotizacion',
        linkedinText: '', blogContent: '',
        notes: 'Post limpio tipo corporativo. Fondo blanco o azul sólido con servicios listados.',
        imageUrl: '', slides: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
    // DOMINGO — Story
    {
        id: 'pan-w1-story-sun', accountId: 'social-panamericanbc', contentType: 'Story', dayIndex: 6, weekOffset: 0,
        topic: '¿Tienes un proyecto?',
        format: 'Story Slides',
        status: 'draft',
        caption: '',
        slides: `Slide 1: "¿Tienes un proyecto?"
Slide 2: "Nos encargamos de todo"
Slide 3: "Escríbenos"`,
        cta: 'DM o link en bio',
        hashtags: '#construccion #panama',
        linkedinText: '', blogContent: '',
        notes: 'Story de cierre de semana. CTA directo. Usar branding Panamerican.',
        imageUrl: '', scheduledTime: '', createdAt: new Date().toISOString(),
    },
];

export default function ContentCalendarGrid({ accounts, companies }) {
    const { addTask, tasks } = useApp ? useApp() : { addTask: () => {}, tasks: [] };
    const [entries, setEntries] = useState(() => {
        try {
            const saved = localStorage.getItem('os_contentCalendar');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge seed data with saved data (don't duplicate)
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
    const [expandedSections, setExpandedSections] = useState({ caption: true, blog: true, linkedin: true, slides: true, meta: true });
    const fileInputRef = useRef(null);

    const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

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
            if (file.size > 5 * 1024 * 1024) return; // 5MB limit
            const reader = new FileReader();
            reader.onload = (e) => {
                const mediaItem = {
                    id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    name: file.name,
                    type: file.type,
                    data: e.target.result,
                };
                const updatedMedia = [...currentMedia, mediaItem];
                currentMedia.push(mediaItem); // mutate for sequential reads
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

    const ACCOUNT_COLORS = ['#00c875', '#579bfc', '#a25ddc', '#fdab3d', '#e2445c', '#00d2d3', '#ff642e'];

    const today = new Date();
    const todayDayIndex = (() => { const d = today.getDay(); return d === 0 ? 6 : d - 1; })();
    const isCurrentWeek = weekOffset === 0;

    // Count entries for stats
    const weekEntries = entries.filter(e => e.weekOffset === weekOffset);
    const filledCount = weekEntries.filter(e => e.caption || e.blogContent || e.slides).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
            {/* Week Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Content Calendar</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {weekDates[0].toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('es-PA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="tag" style={{ background: 'var(--accent-primary)15', color: 'var(--accent-primary)', fontSize: '11px' }}>
                        {filledCount} posts
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setWeekOffset(prev => prev - 1)}><ChevronLeft size={16} /></button>
                    <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={() => setWeekOffset(0)}>Esta Semana</button>
                    <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setWeekOffset(prev => prev + 1)}><ChevronRight size={16} /></button>
                </div>
            </div>

            {/* Main Grid */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', scrollbarWidth: 'thin', border: '1px solid var(--border-subtle)', borderRadius: showDetail ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '12px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '110px', position: 'sticky', left: 0, zIndex: 20, background: 'var(--bg-surface)' }}>Account</th>
                            <th style={{ ...thStyle, width: '75px', position: 'sticky', left: '110px', zIndex: 20, background: 'var(--bg-surface)' }}>Tipo</th>
                            {DAY_LABELS.map((day, i) => (
                                <th key={day} style={{
                                    ...thStyle,
                                    background: isCurrentWeek && i === todayDayIndex ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface)',
                                    color: isCurrentWeek && i === todayDayIndex ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                                    fontWeight: isCurrentWeek && i === todayDayIndex ? 700 : 600,
                                }}>
                                    <div>{day}</div>
                                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{weekDates[i].getDate()}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.length === 0 ? (
                            <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>No hay cuentas vinculadas.</td></tr>
                        ) : (
                            accounts.map((account, accIdx) => {
                                const accentColor = ACCOUNT_COLORS[accIdx % ACCOUNT_COLORS.length];
                                const cmp = companies.find(c => c.id === account.companyId);
                                return CONTENT_TYPES.map((type, typeIdx) => (
                                    <tr key={`${account.id}-${type}`}>
                                        {typeIdx === 0 && (
                                            <td rowSpan={CONTENT_TYPES.length} style={{
                                                ...cellStyle, background: `${accentColor}30`, color: accentColor, fontWeight: 700, fontSize: '12px',
                                                textAlign: 'center', position: 'sticky', left: 0, zIndex: 10,
                                                borderBottom: '3px solid var(--bg-canvas)', borderLeft: `3px solid ${accentColor}`,
                                                padding: '6px 4px', verticalAlign: 'middle',
                                                width: '110px', minWidth: '110px',
                                            }}>
                                                <div style={{ lineHeight: 1.2 }}>{account.handler || account.platform}</div>
                                                {cmp && <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>{cmp.name}</div>}
                                            </td>
                                        )}
                                        <td style={{
                                            ...cellStyle, background: `${accentColor}0a`, fontSize: '11px', fontWeight: 600,
                                            color: TYPE_COLORS[type] || 'var(--text-secondary)',
                                            position: 'sticky', left: '110px', zIndex: 10,
                                            borderBottom: typeIdx === CONTENT_TYPES.length - 1 ? '3px solid var(--bg-canvas)' : '1px solid rgba(255,255,255,0.08)',
                                            width: '75px', minWidth: '75px',
                                        }}>{type}</td>
                                        {DAY_LABELS.map((_, dayIdx) => {
                                            const entry = getEntry(account.id, type, dayIdx);
                                            const isToday = isCurrentWeek && dayIdx === todayDayIndex;
                                            const hasContent = entry && (entry.caption || entry.blogContent || entry.slides || entry.status !== 'idea');
                                            const statusInfo = entry ? STATUS_OPTIONS.find(s => s.value === entry.status) : null;
                                            const isSelected = selectedEntry && entry && selectedEntry.id === entry.id;

                                            const baseBg = `${accentColor}08`;
                                            const cellBg = isSelected ? 'rgba(99,102,241,0.12)' : isToday ? `${accentColor}10` : baseBg;

                                            return (
                                                <td key={dayIdx}
                                                    onClick={() => handleCellClick(account.id, type, dayIdx)}
                                                    style={{
                                                        ...cellStyle,
                                                        background: cellBg,
                                                        cursor: 'pointer', transition: 'background 0.15s',
                                                        borderBottom: typeIdx === CONTENT_TYPES.length - 1 ? '3px solid var(--bg-canvas)' : '1px solid rgba(255,255,255,0.08)',
                                                        borderRight: '1px solid rgba(255,255,255,0.06)',
                                                        padding: '3px', verticalAlign: 'top', minWidth: '95px', height: '30px',
                                                        outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
                                                    }}
                                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${accentColor}15`; }}
                                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = cellBg; }}
                                                >
                                                    {hasContent && (
                                                        <div style={{
                                                            background: `${statusInfo?.color || '#6b7280'}20`,
                                                            border: `1px solid ${statusInfo?.color || '#6b7280'}40`,
                                                            borderRadius: '4px', padding: '2px 5px', fontSize: '10px',
                                                            color: statusInfo?.color || 'var(--text-secondary)', fontWeight: 600,
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            display: 'flex', alignItems: 'center', gap: '3px',
                                                        }}>
                                                            {entry.blogContent && <FileText size={8} />}
                                                            {entry.slides && <Layers size={8} />}
                                                            {entry.imageUrl && <ImageIcon size={8} />}
                                                            {entry.topic ? entry.topic.substring(0, 18) + (entry.topic.length > 18 ? '…' : '') : (entry.caption ? entry.caption.substring(0, 18) + '…' : statusInfo?.label)}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ));
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ═══ DETAIL PANEL — below the grid ═══ */}
            {showDetail && selectedEntry && (
                <div style={{
                    flexShrink: 0, background: 'var(--bg-card)',
                    borderTop: '2px solid var(--accent-primary)', border: '1px solid var(--border-subtle)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    height: '550px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    animation: 'slideInUp 0.2s ease',
                }}>
                    {/* Header */}
                    <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: `${TYPE_COLORS[selectedEntry.contentType] || '#6366f1'}25`, color: TYPE_COLORS[selectedEntry.contentType] || '#6366f1' }}>
                                    {selectedEntry.contentType}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {(() => { const acc = accounts.find(a => a.id === selectedEntry.accountId); return acc ? (acc.handler || acc.platform) : ''; })()}
                                </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {DAY_LABELS[selectedEntry.dayIndex]} {weekDates[selectedEntry.dayIndex]?.toLocaleDateString('es-PA', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                                const acc = accounts.find(a => a.id === selectedEntry.accountId);
                                const context = acc ? (acc.platform === 'Evento' ? `event_${acc.id}` : `company_${acc.companyId || acc.id}`) : '';
                                const isLinked = tasks.some(t => t.context === context && t.title.includes(selectedEntry.topic) && selectedEntry.topic !== '');
                                return (
                                    <button 
                                        className={`btn ${isLinked ? 'btn-ghost' : 'btn-primary'}`} 
                                        style={{ fontSize: '11px', padding: '4px 10px', background: isLinked ? 'var(--bg-canvas)' : 'var(--accent-primary)', color: isLinked ? 'var(--text-tertiary)' : '#fff', border: 'none' }}
                                        onClick={() => {
                                            if (isLinked || !selectedEntry.topic) return;
                                            addTask({
                                                title: `Contenido: ${selectedEntry.topic}`,
                                                description: `Formato: ${selectedEntry.format}\nStatus: ${selectedEntry.status}\n\n${selectedEntry.caption}`,
                                                context: context,
                                                priority: 'medium',
                                                group: 'execute',
                                                column: 'todo'
                                            });
                                        }}
                                    >
                                        {isLinked ? <><CheckCircle2 size={12} style={{ marginRight: '4px' }}/> En Kanban</> : <><Plus size={12} style={{ marginRight: '4px' }}/> Crear Tarea</>}
                                    </button>
                                );
                            })()}
                            <button className="btn btn-ghost" style={{ color: 'var(--accent-red)', fontSize: '11px', padding: '4px 8px' }} onClick={() => deleteEntry(selectedEntry.id)}>
                                <Trash2 size={12} style={{ marginRight: '3px' }}/> Eliminar
                            </button>
                            <button className="btn btn-primary" style={{ fontSize: '11px', padding: '4px 12px' }} onClick={() => setShowDetail(false)}>Guardar / Cerrar</button>
                            <button className="btn-icon" onClick={() => setShowDetail(false)} style={{ color: 'var(--text-tertiary)' }}><X size={16} /></button>
                        </div>
                    </div>

                    {/* Body — scrollable, horizontal layout for compact view */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                            {/* Left column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Topic */}
                                <div>
                                    <label style={labelStyle}><Target size={11} /> Tema / Objetivo</label>
                                    <input type="text" value={selectedEntry.topic || ''} onChange={e => updateEntry(selectedEntry.id, 'topic', e.target.value)}
                                        placeholder="De qué trata esta pieza de contenido..." style={inputStyle} />
                                </div>

                                {/* Status */}
                                <div>
                                    <label style={labelStyle}>Status</label>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {STATUS_OPTIONS.map(s => (
                                            <button key={s.value} onClick={() => updateEntry(selectedEntry.id, 'status', s.value)}
                                                style={{
                                                    padding: '3px 8px', borderRadius: '16px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                                    border: selectedEntry.status === s.value ? `2px solid ${s.color}` : '1px solid var(--border-subtle)',
                                                    background: selectedEntry.status === s.value ? `${s.color}20` : 'transparent',
                                                    color: selectedEntry.status === s.value ? s.color : 'var(--text-tertiary)',
                                                }}>{s.label}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Format */}
                                <div>
                                    <label style={labelStyle}><Layers size={11} /> Formato</label>
                                    <select value={selectedEntry.format || ''} onChange={e => updateEntry(selectedEntry.id, 'format', e.target.value)}
                                        style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="">Seleccionar formato...</option>
                                        {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>

                                {/* CTA + Hashtags */}
                                <div>
                                    <label style={labelStyle}><MessageSquare size={11} /> Call to Action</label>
                                    <input type="text" value={selectedEntry.cta || ''} onChange={e => updateEntry(selectedEntry.id, 'cta', e.target.value)}
                                        placeholder="📩 Contáctanos para..." style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}><Hash size={11} /> Hashtags</label>
                                    <input type="text" value={selectedEntry.hashtags || ''} onChange={e => updateEntry(selectedEntry.id, 'hashtags', e.target.value)}
                                        placeholder="#marketing #growth" style={inputStyle} />
                                </div>

                                {/* Media Upload */}
                                <div>
                                    <label style={labelStyle}><ImageIcon size={11} /> Archivos / Media</label>
                                    <input type="file" ref={fileInputRef} multiple accept="image/*,video/*"
                                        style={{ display: 'none' }}
                                        onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }} />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                                        onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'transparent'; }}
                                        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'transparent'; handleFileUpload(e.dataTransfer.files); }}
                                        style={{
                                            border: '1.5px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                            padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                        }}
                                    >
                                        <Upload size={16} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Click o arrastra archivos aquí</span>
                                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', opacity: 0.6 }}>Imágenes y videos (máx 5MB)</span>
                                    </div>
                                    {/* Media previews */}
                                    {(selectedEntry.mediaFiles || []).length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                            {(selectedEntry.mediaFiles || []).map(media => (
                                                <div key={media.id} style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                                    {media.type?.startsWith('video/') ? (
                                                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Film size={18} style={{ color: 'var(--text-tertiary)' }} />
                                                        </div>
                                                    ) : (
                                                        <img src={media.data} alt={media.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); removeMediaFile(selectedEntry.id, media.id); }}
                                                        style={{
                                                            position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px',
                                                            borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                                        }}>
                                                        <X size={8} style={{ color: '#fff' }} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Fallback URL input */}
                                    <input type="text" value={selectedEntry.imageUrl || ''} onChange={e => updateEntry(selectedEntry.id, 'imageUrl', e.target.value)}
                                        placeholder="O pega una URL de imagen..." style={{ ...inputStyle, marginTop: '6px', fontSize: '11px' }} />
                                </div>

                                {/* Schedule + Notes */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}><Clock size={11} /> Hora programada</label>
                                        <input type="time" value={selectedEntry.scheduledTime || ''} onChange={e => updateEntry(selectedEntry.id, 'scheduledTime', e.target.value)} style={inputStyle} />
                                    </div>
                                </div>
                            </div>

                            {/* Right column — text content */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Caption */}
                                <div>
                                    <label style={labelStyle}><Type size={11} /> Caption / Texto Principal</label>
                                    <textarea value={selectedEntry.caption || ''} onChange={e => updateEntry(selectedEntry.id, 'caption', e.target.value)}
                                        placeholder="Caption para Instagram, texto del post..."
                                        style={{ ...textareaStyle, minHeight: '70px' }} />
                                </div>

                                {/* Blog Content */}
                                {(selectedEntry.contentType === 'Blog' || selectedEntry.blogContent) && (
                                    <div>
                                        <label style={{ ...labelStyle, color: '#22c55e' }}><FileText size={11} /> Blog / Artículo</label>
                                        <textarea value={selectedEntry.blogContent || ''} onChange={e => updateEntry(selectedEntry.id, 'blogContent', e.target.value)}
                                            placeholder="Contenido completo del blog..."
                                            style={{ ...textareaStyle, minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '11px' }} />
                                    </div>
                                )}

                                {/* LinkedIn */}
                                {(selectedEntry.contentType === 'LinkedIn/X' || selectedEntry.contentType === 'Blog' || selectedEntry.linkedinText) && (
                                    <div>
                                        <label style={{ ...labelStyle, color: '#0A66C2' }}><Linkedin size={11} /> LinkedIn / X</label>
                                        <textarea value={selectedEntry.linkedinText || ''} onChange={e => updateEntry(selectedEntry.id, 'linkedinText', e.target.value)}
                                            placeholder="Versión corta para LinkedIn y X..."
                                            style={{ ...textareaStyle, minHeight: '70px' }} />
                                    </div>
                                )}

                                {/* Slides */}
                                {(selectedEntry.contentType === 'Story' || selectedEntry.format === 'Carrusel' || selectedEntry.format === 'Story Slides' || selectedEntry.slides) && (
                                    <div>
                                        <label style={{ ...labelStyle, color: '#E1306C' }}><Layers size={11} /> Slides / Secuencia</label>
                                        <textarea value={selectedEntry.slides || ''} onChange={e => updateEntry(selectedEntry.id, 'slides', e.target.value)}
                                            placeholder="Slide 1: ...&#10;Slide 2: ...&#10;Slide 3: ..."
                                            style={{ ...textareaStyle, minHeight: '70px' }} />
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <label style={labelStyle}><Sparkles size={11} /> Notas internas</label>
                                    <textarea value={selectedEntry.notes || ''} onChange={e => updateEntry(selectedEntry.id, 'notes', e.target.value)}
                                        placeholder="Instrucciones, notas internas..." style={{ ...textareaStyle, minHeight: '50px' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Collapsible Section Component ─────────────────────────────────
function SectionToggle({ title, icon, isOpen, onToggle, accent, children }) {
    return (
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={onToggle} style={{
                width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isOpen ? (accent ? `${accent}08` : 'var(--bg-base)') : 'var(--bg-surface)',
                border: 'none', cursor: 'pointer', color: accent || 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{icon} {title}</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isOpen && <div style={{ padding: '10px 12px', background: 'var(--bg-base)' }}>{children}</div>}
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
