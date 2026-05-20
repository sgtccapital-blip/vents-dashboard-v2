import { useState, useMemo } from 'react';
import {
    ChevronDown, ChevronRight, CheckSquare, Square, Filter,
    Sparkles, Megaphone, Users, Wrench, DollarSign, Building2,
    Radio, ClipboardList, Search, RotateCcw, TrendingUp, Palette,
    Eye, EyeOff
} from 'lucide-react';

// ══════ MASTER CHECKLIST DATA ══════
const MASTER_CHECKLIST = [
    {
        id: 'concepto',
        title: 'Concepto & Dirección Creativa',
        icon: '🎨',
        color: '#a855f7',
        subsections: [
            { title: 'Branding del Evento', items: ['Nombre oficial', 'Logo', 'Identidad visual', 'Paleta de colores', 'Tipografías', 'Moodboard'] },
            { title: 'Concepto Creativo', items: ['Tema central', 'Storytelling', 'Experiencia emocional', 'Dresscode', 'Naming de áreas', 'Frases clave/slogans'] },
            { title: 'Experiencia Visual', items: ['Concepto stage', 'Concepto luces', 'Concepto LED visuals', 'Decoración', 'Props', 'Branding físico', 'Photospots'] },
            { title: 'Entretenimiento', items: ['DJs', 'Hosts', 'Shows', 'Performers', 'Activaciones', 'Experiencias sorpresa'] },
            { title: 'Público Objetivo', items: ['Tipo de audiencia', 'Ticket promedio', 'Perfil social', 'Segmentación VIP/general'] },
        ]
    },
    {
        id: 'marketing',
        title: 'Marketing & Contenido',
        icon: '📣',
        color: '#f43f5e',
        subsections: [
            { title: 'Diseño Gráfico', items: ['Flyer principal', 'Flyers secundarios', 'Stories', 'Wallpapers', 'Pantallas LED visuals', 'Assets sponsors'] },
            { title: 'Contenido Orgánico', items: ['Reels', 'TikToks', 'Behind the scenes', 'Cuenta regresiva', 'Teasers', 'Content roadmap'] },
            { title: 'Redes Sociales', items: ['Calendario de publicaciones', 'Captions', 'Hashtags', 'Engagement strategy', 'Community management', 'Respuestas DM'] },
            { title: 'Paid Media', items: ['Meta Ads', 'TikTok Ads', 'Segmentación', 'Públicos lookalike', 'Retargeting', 'Tracking conversion'] },
            { title: 'Influencers & PR', items: ['Influencers invitados', 'Media partners', 'Bloggers', 'Relaciones públicas', 'Cobertura medios'] },
            { title: 'Producción de Contenido', items: ['Fotógrafo', 'Videógrafo', 'Shotlist', 'Guion historias', 'Guion aftermovie', 'Branding shots', 'Captura crowd moments'] },
            { title: 'Ticketing Marketing', items: ['Early birds', 'Fases tickets', 'Urgency marketing', 'Drops limitados', 'Campañas VIP'] },
            { title: 'WhatsApp & Comunidad', items: ['Broadcasts', 'Grupos VIP', 'Promoción privada', 'Bases de datos', 'Seguimiento leads'] },
            { title: 'Post-Event Marketing', items: ['Aftermovie', 'Recap reels', 'Photo dump', 'Testimonios', 'Estadísticas', 'Hype próximo evento'] },
        ]
    },
    {
        id: 'promotores',
        title: 'Promotores & Ventas',
        icon: '💰',
        color: '#eab308',
        subsections: [
            { title: 'Estructura Promotores', items: ['Reclutamiento', 'Líderes de grupo', 'Metas individuales', 'Jerarquías', 'Capacitación'] },
            { title: 'Control Ventas', items: ['Tracking links', 'Código promotor', 'Lista invitados', 'Reservas', 'Mesas VIP', 'Revenue tracking'] },
            { title: 'Incentivos', items: ['Comisiones', 'Bonos', 'Competencias', 'Beneficios VIP', 'Acceso backstage'] },
            { title: 'Operación Promotores', items: ['Check-in promotores', 'Confirmaciones', 'Seguimiento diario', 'Scripts ventas', 'Status ventas', 'Grupos coordinación'] },
            { title: 'Relaciones Públicas', items: ['Clientes high-value', 'Modelos', 'Influencers', 'Networking', 'Atención especial'] },
            { title: 'CRM & Bases de Datos', items: ['Base clientes', 'Historial consumo', 'Clientes frecuentes', 'Segmentación VIP', 'Leads nuevos'] },
        ]
    },
    {
        id: 'produccion',
        title: 'Montaje & Producción',
        icon: '🔧',
        color: '#3b82f6',
        subsections: [
            { title: 'Producción Técnica', items: ['Audio', 'DJ booth', 'Pantallas LED', 'Luces', 'Láser', 'FX especiales', 'Truss', 'Electricidad', 'Plantas eléctricas', 'Cableado'] },
            { title: 'Escenario', items: ['Diseño stage', 'Tarimas', 'Backdrops', 'Branding escenario', 'Visuales sincronizados'] },
            { title: 'Layout Operacional', items: ['Entradas', 'Salidas', 'VIP', 'Barras', 'Backstage', 'Staff zone', 'Storage', 'Vendors', 'Baños'] },
            { title: 'Experiencia Asistentes', items: ['Señalización', 'Pulseras', 'Check-in QR', 'Fast lane', 'Puntos de agua', 'Sombra', 'Seating', 'Photospots'] },
            { title: 'Operación Logística', items: ['Carga y descarga', 'Rutas artistas', 'Rutas VIP', 'Acceso proveedores', 'Montaje/desmontaje', 'Inventario'] },
            { title: 'Seguridad', items: ['Seguridad privada', 'Paramédicos', 'Ambulancia', 'Control acceso', 'Radios comunicación', 'Plan evacuación'] },
            { title: 'Staff', items: ['Staff operativo', 'Team leaders', 'Runner logística', 'Limpieza', 'Staff meals', 'Briefing operativo'] },
            { title: 'Run of Show', items: ['Timeline general', 'Horario artistas', 'Timing shows', 'Cue visuals', 'Cue FX', 'Coordinación general'] },
        ]
    },
    {
        id: 'finanzas',
        title: 'Finanzas',
        icon: '💵',
        color: '#22c55e',
        subsections: [
            { title: 'Finanzas', items: ['Presupuesto', 'Cashflow', 'Sponsors', 'Pagos proveedores', 'ROI proyectado'] },
        ]
    },
    {
        id: 'venue',
        title: 'Venue & Permisos',
        icon: '🏛️',
        color: '#06b6d4',
        subsections: [
            { title: 'Venue & Permisos', items: ['Contrato venue', 'Permisos municipales', 'Capacidad máxima', 'Seguros', 'Inspección bomberos'] },
        ]
    },
    {
        id: 'operacion',
        title: 'Operación en Vivo',
        icon: '📡',
        color: '#f97316',
        subsections: [
            { title: 'Operación en Vivo', items: ['Supervisión general', 'Comunicación equipo', 'Resolución de problemas', 'Control de tiempos', 'Coordinación emergencias'] },
        ]
    },
    {
        id: 'postevento',
        title: 'Post-Evento',
        icon: '📊',
        color: '#8b5cf6',
        subsections: [
            { title: 'Post-Evento', items: ['Desmontaje', 'Reportes finales', 'Métricas de éxito', 'Feedback equipo', 'Evaluación proveedores', 'Lecciones aprendidas'] },
            { title: 'Urbanismo (masivos)', items: ['Notificación residentes', 'Control de tráfico', 'Protección patrimonio', 'Limpieza urbana', 'Señalización ciudad'] },
        ]
    },
];

// Generate unique key for each item
function getItemKey(sectionId, subIdx, itemIdx) {
    return `${sectionId}_${subIdx}_${itemIdx}`;
}

export default function MasterChecklist({ event, onUpdateChecklist }) {
    const [expandedSections, setExpandedSections] = useState(new Set(['concepto']));
    const [filter, setFilter] = useState('all'); // all, pending, done
    const [searchTerm, setSearchTerm] = useState('');

    // Load checklist state from event data
    const checkedItems = event.masterChecklist || {};

    const toggleItem = (key) => {
        const updated = { ...checkedItems, [key]: !checkedItems[key] };
        onUpdateChecklist(updated);
    };

    const toggleSection = (sectionId) => {
        const next = new Set(expandedSections);
        if (next.has(sectionId)) next.delete(sectionId);
        else next.add(sectionId);
        setExpandedSections(next);
    };

    const expandAll = () => setExpandedSections(new Set(MASTER_CHECKLIST.map(s => s.id)));
    const collapseAll = () => setExpandedSections(new Set());

    // ══════ STATS ══════
    const stats = useMemo(() => {
        let totalItems = 0;
        let totalDone = 0;
        const sectionStats = {};

        MASTER_CHECKLIST.forEach(section => {
            let sTotal = 0, sDone = 0;
            section.subsections.forEach((sub, si) => {
                sub.items.forEach((item, ii) => {
                    const key = getItemKey(section.id, si, ii);
                    sTotal++;
                    totalItems++;
                    if (checkedItems[key]) { sDone++; totalDone++; }
                });
            });
            sectionStats[section.id] = { total: sTotal, done: sDone, pct: sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0 };
        });

        return { totalItems, totalDone, pct: totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0, sectionStats };
    }, [checkedItems]);

    // ══════ FILTER ══════
    const matchesFilter = (key, itemText) => {
        const isDone = !!checkedItems[key];
        if (filter === 'pending' && isDone) return false;
        if (filter === 'done' && !isDone) return false;
        if (searchTerm && !itemText.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    };

    const resetChecklist = () => {
        if (confirm('¿Resetear todo el checklist? Se perderá todo el progreso.')) {
            onUpdateChecklist({});
        }
    };

    return (
        <div>
            {/* ══════ OVERALL PROGRESS ══════ */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                borderRadius: '16px', padding: '24px', marginBottom: '20px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Master Plan</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
                            {stats.totalDone} de {stats.totalItems} items completados
                        </p>
                    </div>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '50%', position: 'relative',
                        background: `conic-gradient(${stats.pct >= 100 ? '#22c55e' : stats.pct >= 50 ? '#eab308' : '#8b5cf6'} ${stats.pct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            width: '58px', height: '58px', borderRadius: '50%',
                            background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: 800,
                        }}>{stats.pct}%</div>
                    </div>
                </div>

                {/* Section progress bars */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {MASTER_CHECKLIST.map(section => {
                        const s = stats.sectionStats[section.id];
                        return (
                            <div key={section.id} style={{
                                padding: '10px 12px', borderRadius: '10px',
                                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }} onClick={() => {
                                if (!expandedSections.has(section.id)) toggleSection(section.id);
                                document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '14px' }}>{section.icon}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>{section.title}</span>
                                    <span style={{ fontSize: '11px', color: s.pct >= 100 ? '#22c55e' : 'var(--text-tertiary)', fontWeight: 600 }}>{s.pct}%</span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${s.pct}%`, height: '100%', borderRadius: '2px',
                                        background: s.pct >= 100 ? '#22c55e' : section.color,
                                        transition: 'width 0.6s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══════ TOOLBAR ══════ */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
            }}>
                <div style={{
                    flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: '10px', padding: '8px 12px',
                }}>
                    <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                        type="text" placeholder="Buscar item..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', outline: 'none',
                            color: 'var(--text-primary)', fontSize: '13px', width: '100%',
                        }}
                    />
                </div>
                {['all', 'pending', 'done'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: '12px', padding: '7px 14px' }}
                    >
                        {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Completados'}
                    </button>
                ))}
                <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '7px 10px' }} onClick={expandAll} title="Expandir todo">
                    <Eye size={14} />
                </button>
                <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '7px 10px' }} onClick={collapseAll} title="Colapsar todo">
                    <EyeOff size={14} />
                </button>
                <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '7px 10px', color: '#f43f5e' }} onClick={resetChecklist} title="Resetear">
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* ══════ SECTIONS ══════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {MASTER_CHECKLIST.map(section => {
                    const s = stats.sectionStats[section.id];
                    const isOpen = expandedSections.has(section.id);

                    // Check if any items in this section match the filter
                    let hasVisibleItems = false;
                    if (searchTerm || filter !== 'all') {
                        section.subsections.forEach((sub, si) => {
                            sub.items.forEach((item, ii) => {
                                if (matchesFilter(getItemKey(section.id, si, ii), item)) hasVisibleItems = true;
                            });
                        });
                        if (!hasVisibleItems) return null;
                    }

                    return (
                        <div key={section.id} id={`section-${section.id}`} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                            borderRadius: '14px', overflow: 'hidden',
                            borderLeft: `3px solid ${section.color}`,
                        }}>
                            {/* Section Header */}
                            <div onClick={() => toggleSection(section.id)} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '16px 20px', cursor: 'pointer',
                                background: isOpen ? `${section.color}08` : 'transparent',
                                transition: 'background 0.2s',
                            }}>
                                {isOpen ? <ChevronDown size={16} style={{ color: section.color }} /> : <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />}
                                <span style={{ fontSize: '18px' }}>{section.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{section.title}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '10px' }}>
                                        {s.done}/{s.total}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '80px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${s.pct}%`, height: '100%', background: s.pct >= 100 ? '#22c55e' : section.color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: s.pct >= 100 ? '#22c55e' : section.color, minWidth: '36px', textAlign: 'right' }}>{s.pct}%</span>
                                </div>
                            </div>

                            {/* Section Body */}
                            {isOpen && (
                                <div style={{ padding: '0 20px 16px' }}>
                                    {section.subsections.map((sub, si) => {
                                        const visibleItems = sub.items.filter((item, ii) => matchesFilter(getItemKey(section.id, si, ii), item));
                                        if (visibleItems.length === 0) return null;

                                        const subDone = sub.items.filter((_, ii) => checkedItems[getItemKey(section.id, si, ii)]).length;
                                        const subTotal = sub.items.length;

                                        return (
                                            <div key={si} style={{ marginBottom: si < section.subsections.length - 1 ? '16px' : 0 }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    marginBottom: '8px', paddingBottom: '6px',
                                                    borderBottom: '1px solid var(--border-subtle)',
                                                }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: section.color }}>{sub.title}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>({subDone}/{subTotal})</span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px' }}>
                                                    {sub.items.map((item, ii) => {
                                                        const key = getItemKey(section.id, si, ii);
                                                        if (!matchesFilter(key, item)) return null;
                                                        const isDone = !!checkedItems[key];
                                                        return (
                                                            <label key={ii} style={{
                                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                                padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
                                                                background: isDone ? `${section.color}08` : 'transparent',
                                                                transition: 'all 0.15s ease',
                                                                opacity: isDone ? 0.7 : 1,
                                                            }}
                                                            onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = 'var(--bg-surface)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = isDone ? `${section.color}08` : 'transparent'; }}
                                                            >
                                                                <input type="checkbox" checked={isDone} onChange={() => toggleItem(key)}
                                                                    style={{ display: 'none' }}
                                                                />
                                                                <div style={{
                                                                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                                                                    border: isDone ? 'none' : '2px solid var(--border-subtle)',
                                                                    background: isDone ? section.color : 'transparent',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    transition: 'all 0.15s ease',
                                                                }}>
                                                                    {isDone && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800 }}>✓</span>}
                                                                </div>
                                                                <span style={{
                                                                    fontSize: '13px',
                                                                    textDecoration: isDone ? 'line-through' : 'none',
                                                                    color: isDone ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                                }}>{item}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
