import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Instagram, Youtube, Twitter, Facebook, Plus, X, Edit3, Trash2,
    ExternalLink, Users, TrendingUp, CalendarDays, Hash, Share2,
    BarChart3, Eye, Heart, MessageCircle, ArrowRight, Sparkles,
    Globe, Music, Video, Camera, LinkIcon, ArrowLeft, Image
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ContentCalendarGrid from '../components/ContentCalendarGrid';

const PLATFORM_META = {
    Instagram: { icon: Instagram, color: '#E1306C', gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
    YouTube: { icon: Youtube, color: '#FF0000', gradient: 'linear-gradient(135deg, #FF0000, #CC0000)' },
    TikTok: { icon: Music, color: '#00f2ea', gradient: 'linear-gradient(135deg, #00f2ea, #ff0050)' },
    Twitter: { icon: Twitter, color: '#1DA1F2', gradient: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)' },
    Facebook: { icon: Facebook, color: '#1877F2', gradient: 'linear-gradient(135deg, #1877F2, #0c5dc7)' },
    LinkedIn: { icon: Globe, color: '#0A66C2', gradient: 'linear-gradient(135deg, #0A66C2, #004182)' },
    Website: { icon: Globe, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
};

const emptyAccount = {
    platform: 'Instagram', handler: '', type: 'Company Page', url: '',
    followers: '', description: '', companyId: '', linkedEventIds: [],
};

export default function SocialMedia() {
    const navigate = useNavigate();
    const { socialMedia, addSocialMedia, updateSocialMedia, deleteSocialMedia, events } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterEvent, setFilterEvent] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [editingArt, setEditingArt] = useState(null);

    console.log("SocialMedia rendering. selectedAccount:", selectedAccount, "editingArt:", editingArt);

    const openNew = () => { setEditingAccount({ ...emptyAccount, id: `social-${Date.now()}` }); setShowModal(true); };
    const openEdit = (acc) => { setEditingAccount({ ...acc, linkedEventIds: acc.linkedEventIds || [] }); setShowModal(true); };
    const saveAccount = () => {
        if (!editingAccount.handler.trim()) return;
        const existing = socialMedia.find(a => a.id === editingAccount.id);
        if (existing) updateSocialMedia(editingAccount.id, editingAccount);
        else addSocialMedia(editingAccount);
        setShowModal(false);
        setEditingAccount(null);
    };
    const removeAccount = (id) => {
        if (confirm('¿Eliminar esta cuenta?')) deleteSocialMedia(id);
        setShowModal(false);
    };

    const closeArtEdit = () => setEditingArt(null);
    const saveArt = () => {
        if (!editingArt.title.trim()) return;
        const currentArtes = (socialMedia.find(a => a.id === selectedAccount) || {}).artes || [];
        
        let updatedArt = { ...editingArt };
        if (updatedArt.type === 'Story' || updatedArt.type === 'Reel') {
            updatedArt.format = '1080x1920';
        } else {
            updatedArt.format = '1080x1080';
        }

        const updated = currentArtes.find(a => a.id === editingArt.id)
            ? currentArtes.map(a => a.id === editingArt.id ? updatedArt : a)
            : [...currentArtes, updatedArt];
        updateSocialMedia(selectedAccount, { artes: updated });
        closeArtEdit();
    };
    const deleteArt = (id) => {
        const currentArtes = (socialMedia.find(a => a.id === selectedAccount) || {}).artes || [];
        updateSocialMedia(selectedAccount, { artes: currentArtes.filter(a => a.id !== id) });
        closeArtEdit();
    };

    const addArtForAccount = (accountId) => {
        console.log("addArtForAccount clicked for account:", accountId);
        setEditingArt({ id: `art-${Date.now()}`, accountId, title: '', description: '', references: '', type: 'Post', format: '1080x1080', status: 'Pendiente' });
    };

    const toggleEventLink = (eventId) => {
        setEditingAccount(prev => {
            const linked = prev.linkedEventIds || [];
            return {
                ...prev,
                linkedEventIds: linked.includes(eventId)
                    ? linked.filter(id => id !== eventId)
                    : [...linked, eventId]
            };
        });
    };

    const filtered = socialMedia.filter(a => {
        if (filterPlatform !== 'all' && a.platform !== filterPlatform) return false;
        if (filterEvent !== 'all' && !(a.linkedEventIds || []).includes(filterEvent)) return false;
        return true;
    });

    const platforms = [...new Set(socialMedia.map(a => a.platform))];
    const totalFollowers = socialMedia.reduce((s, a) => {
        const n = parseFloat((a.followers || '0').replace(/[^0-9.]/g, ''));
        const mult = (a.followers || '').toLowerCase().includes('k') ? 1000 : 1;
        return s + (n * mult);
    }, 0);

    const getEventName = (id) => events.find(e => e.id === id)?.name || id;

    // ── DETAIL VIEW FOR SELECTED ACCOUNT ──
    let pageContent = null;
    if (selectedAccount) {
        const acc = socialMedia.find(a => a.id === selectedAccount);
        if (!acc) { setSelectedAccount(null); return null; }
        const meta = PLATFORM_META[acc.platform] || PLATFORM_META.Website;
        const PlatIcon = meta.icon;
        const calAccounts = [{ id: acc.id, handler: acc.handler, platform: acc.platform, companyId: acc.companyId }];
        const linkedEvts = (acc.linkedEventIds || []).map(id => events.find(e => e.id === id)).filter(Boolean);
        const acctArtes = acc.artes || [];
        pageContent = (
            <div className="page-content animate-in">
                {/* Back + Header */}
                <button className="btn btn-ghost" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setSelectedAccount(null)}>
                    <ArrowLeft size={16} /> Volver a Redes
                </button>
                <div style={{
                    padding: '28px', borderRadius: '20px', marginBottom: '24px',
                    background: `linear-gradient(135deg, ${meta.color}12, ${meta.color}04)`,
                    border: `1px solid ${meta.color}20`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px',
                            background: meta.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 20px ${meta.color}30`,
                        }}>
                            <PlatIcon size={26} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{acc.handler}</h1>
                            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                                {acc.platform} · {acc.type} {acc.followers ? `· ${acc.followers} seguidores` : ''}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {acc.url && (
                                <a href={acc.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                                    <ExternalLink size={14} /> Abrir
                                </a>
                            )}
                            <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}
                                onClick={() => openEdit(acc)}>
                                <Edit3 size={14} /> Editar
                            </button>
                        </div>
                    </div>
                    {linkedEvts.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
                            {linkedEvts.map(ev => (
                                <span key={ev.id} style={{
                                    fontSize: '11px', padding: '4px 10px', borderRadius: '8px',
                                    background: `${ev.color || '#8b5cf6'}15`, color: ev.color || '#8b5cf6',
                                    fontWeight: 600, border: `1px solid ${ev.color || '#8b5cf6'}25`, cursor: 'pointer',
                                }} onClick={() => navigate(`/eventos/${ev.id}`)}>
                                    {ev.icon} {ev.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Calendar */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
                        background: `${meta.color}06`,
                    }}>
                        <div style={{ padding: '7px', borderRadius: '9px', background: `${meta.color}15`, color: meta.color }}>
                            <CalendarDays size={16} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Calendario de Contenido</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>Planificación semanal para {acc.handler}</p>
                        </div>
                    </div>
                    <ContentCalendarGrid accounts={calAccounts} companies={[]} />
                </div>

                {/* Artes */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Image size={18} color={meta.color} /> Artes y Material Visual
                        </h3>
                        <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={() => addArtForAccount(acc.id)}>
                            <Plus size={14} /> Subir Arte
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
                        {acctArtes.map(art => {
                            const isV = art.type === 'Story' || art.type === 'Reel';
                            return (
                                <div key={art.id} style={{
                                    background: 'var(--bg-secondary)', borderRadius: '12px',
                                    border: '1px solid var(--border-subtle)', overflow: 'hidden',
                                    transition: 'all 0.2s', cursor: 'pointer',
                                }}
                                    onClick={() => setEditingArt({ ...art })}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${meta.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <div style={{
                                        aspectRatio: isV ? '9/16' : '1/1',
                                        background: `linear-gradient(45deg, ${meta.color}15, transparent)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderBottom: '1px solid var(--border-subtle)', position: 'relative',
                                    }}>
                                        <PlatIcon size={isV ? 36 : 28} style={{ opacity: 0.15, color: meta.color }} />
                                        <span style={{
                                            position: 'absolute', top: '6px', right: '6px',
                                            fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px',
                                            background: art.status === 'Aprobado' ? 'rgba(34,197,94,0.15)' : art.status === 'Revisión' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
                                            color: art.status === 'Aprobado' ? '#4ade80' : art.status === 'Revisión' ? '#fbbf24' : 'var(--text-tertiary)',
                                        }}>{art.status}</span>
                                    </div>
                                    <div style={{ padding: '14px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{art.title}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{art.format}</span>
                                            <span style={{ fontSize: '10px', padding: '2px 7px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: 'var(--text-secondary)' }}>{art.type}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div style={{
                            border: '2px dashed var(--border-subtle)', borderRadius: '12px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            aspectRatio: '1/1', cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'all 0.2s',
                        }}
                            onClick={() => addArtForAccount(acc.id)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                        >
                            <Plus size={24} style={{ marginBottom: '6px' }} />
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>Añadir Arte</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {

    pageContent = (
        <div className="page-content animate-in">
            {/* HERO HEADER */}
            <div style={{
                padding: '32px', borderRadius: '20px', marginBottom: '28px',
                background: 'linear-gradient(135deg, rgba(225,48,108,0.12), rgba(131,58,180,0.08), rgba(247,119,55,0.06))',
                border: '1px solid rgba(225,48,108,0.15)', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px',
                    background: 'radial-gradient(circle, rgba(225,48,108,0.08) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Share2 size={22} color="#fff" />
                            </div>
                            Redes Sociales
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, maxWidth: '500px' }}>
                            Gestiona todas tus cuentas de redes sociales y vincula contenido a tus eventos.
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Nueva Cuenta
                    </button>
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
                    {[
                        { label: 'Cuentas', value: socialMedia.length, color: '#E1306C', icon: Hash },
                        { label: 'Plataformas', value: platforms.length, color: '#833AB4', icon: Globe },
                        { label: 'Seguidores Totales', value: totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : totalFollowers, color: '#F77737', icon: Users },
                        { label: 'Eventos Vinculados', value: new Set(socialMedia.flatMap(a => a.linkedEventIds || [])).size, color: '#10b981', icon: CalendarDays },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 18px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: `${stat.color}18`, color: stat.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <stat.icon size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FILTERS */}
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap',
            }}>
                <select className="form-select" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                    style={{ width: '180px', fontSize: '13px' }}>
                    <option value="all">Todas las Plataformas</option>
                    {Object.keys(PLATFORM_META).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="form-select" value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                    style={{ width: '220px', fontSize: '13px' }}>
                    <option value="all">Todos los Eventos</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.icon} {ev.name}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                    {['grid', 'list'].map(mode => (
                        <button key={mode} className={`btn ${viewMode === mode ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => setViewMode(mode)}>
                            {mode === 'grid' ? 'Grid' : 'Lista'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ACCOUNTS GRID / LIST */}
            {filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)',
                }}>
                    <Share2 size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Sin cuentas registradas</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginBottom: '20px' }}>
                        Agrega tus cuentas de redes sociales para empezar a gestionar contenido.
                    </p>
                    <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Agregar Cuenta</button>
                </div>
            ) : (
                <div style={{
                    display: viewMode === 'grid' ? 'grid' : 'flex',
                    gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : undefined,
                    flexDirection: viewMode === 'list' ? 'column' : undefined,
                    gap: '16px',
                }}>
                    {filtered.map(account => {
                        const meta = PLATFORM_META[account.platform] || PLATFORM_META.Website;
                        const PlatIcon = meta.icon;
                        const linkedEvents = (account.linkedEventIds || []).map(id => events.find(e => e.id === id)).filter(Boolean);

                        return (
                            <div key={account.id} className="card" style={{
                                padding: 0, overflow: 'hidden', cursor: 'pointer',
                                transition: 'all 0.25s', position: 'relative',
                            }}
                                onClick={() => setSelectedAccount(account.id)}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + '40'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {/* Platform Banner */}
                                <div style={{
                                    height: '6px', background: meta.gradient,
                                }} />
                                <div style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '14px',
                                            background: meta.gradient,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: `0 4px 15px ${meta.color}30`,
                                        }}>
                                            <PlatIcon size={22} color="#fff" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700 }}>{account.handler}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                {account.platform} · {account.type}
                                            </div>
                                        </div>
                                        {account.followers && (
                                            <div style={{
                                                textAlign: 'right', padding: '6px 12px', borderRadius: '10px',
                                                background: `${meta.color}12`,
                                            }}>
                                                <div style={{ fontSize: '16px', fontWeight: 800, color: meta.color }}>{account.followers}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>seguidores</div>
                                            </div>
                                        )}
                                    </div>
                                    {account.description && (
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
                                            {account.description}
                                        </p>
                                    )}

                                    {/* Linked Events */}
                                    {linkedEvents.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {linkedEvents.map(ev => (
                                                <span key={ev.id} style={{
                                                    fontSize: '11px', padding: '3px 10px', borderRadius: '8px',
                                                    background: `${ev.color || '#8b5cf6'}15`,
                                                    color: ev.color || '#8b5cf6',
                                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                                                    border: `1px solid ${ev.color || '#8b5cf6'}25`,
                                                }}
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/eventos/${ev.id}`); }}
                                                >
                                                    {ev.icon} {ev.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action row */}
                                    <div style={{
                                        display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px',
                                        borderTop: '1px solid var(--border-subtle)',
                                    }}>
                                        {account.url && (
                                            <a href={account.url} target="_blank" rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>
                                                <ExternalLink size={12} /> Abrir
                                            </a>
                                        )}
                                        <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px', marginLeft: 'auto' }}
                                            onClick={e => { e.stopPropagation(); openEdit(account); }}>
                                            <Edit3 size={12} /> Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Card */}
                    <div style={{
                        border: '2px dashed var(--border-subtle)', borderRadius: '14px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        minHeight: '200px', cursor: 'pointer', color: 'var(--text-tertiary)',
                        transition: 'all 0.2s',
                    }}
                        onClick={openNew}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#E1306C'; e.currentTarget.style.color = '#E1306C'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    >
                        <Plus size={28} style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Agregar Cuenta</span>
                    </div>
                </div>
            )}

            {/* Events Quick Access */}
            {events.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={18} color="var(--accent-primary)" /> Redes por Evento
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {events.map(ev => {
                            const eventAccounts = socialMedia.filter(a => (a.linkedEventIds || []).includes(ev.id));
                            return (
                                <div key={ev.id} style={{
                                    padding: '16px 20px', borderRadius: '14px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                    onClick={() => navigate(`/eventos/${ev.id}`)}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = (ev.color || '#8b5cf6') + '50'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <div style={{
                                        width: '42px', height: '42px', borderRadius: '12px',
                                        background: `${ev.color || '#8b5cf6'}20`, color: ev.color || '#8b5cf6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '20px', flexShrink: 0,
                                    }}>{ev.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{ev.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                            {eventAccounts.length} {eventAccounts.length === 1 ? 'cuenta vinculada' : 'cuentas vinculadas'}
                                        </div>
                                    </div>
                                    <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
    }

    return (
        <>
            {pageContent}

            {/* MODAL - Add/Edit Account */}
            {showModal && editingAccount && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{
                            borderBottom: `3px solid ${(PLATFORM_META[editingAccount.platform] || PLATFORM_META.Website).color}`,
                        }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Share2 size={18} />
                                {socialMedia.find(a => a.id === editingAccount.id) ? 'Editar Cuenta' : 'Nueva Cuenta de Red Social'}
                            </h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Plataforma</label>
                                    <select className="form-select" value={editingAccount.platform}
                                        onChange={e => setEditingAccount({ ...editingAccount, platform: e.target.value })}>
                                        {Object.keys(PLATFORM_META).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipo</label>
                                    <select className="form-select" value={editingAccount.type}
                                        onChange={e => setEditingAccount({ ...editingAccount, type: e.target.value })}>
                                        <option value="Company Page">Página de Empresa</option>
                                        <option value="Personal Profile">Perfil Personal</option>
                                        <option value="Event Page">Página de Evento</option>
                                        <option value="Brand">Marca</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Handle / Nombre</label>
                                <input className="form-input" placeholder="@handle o nombre" value={editingAccount.handler}
                                    onChange={e => setEditingAccount({ ...editingAccount, handler: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">URL</label>
                                    <input className="form-input" placeholder="https://..." value={editingAccount.url}
                                        onChange={e => setEditingAccount({ ...editingAccount, url: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Seguidores</label>
                                    <input className="form-input" placeholder="Ej: 2.1K" value={editingAccount.followers}
                                        onChange={e => setEditingAccount({ ...editingAccount, followers: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descripción</label>
                                <textarea className="form-textarea" rows={2} placeholder="Descripción de la cuenta..."
                                    value={editingAccount.description}
                                    onChange={e => setEditingAccount({ ...editingAccount, description: e.target.value })} />
                            </div>

                            {/* Link to Events */}
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '8px' }}>Vincular a Eventos</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '4px' }}>
                                    {events.map(ev => {
                                        const isLinked = (editingAccount.linkedEventIds || []).includes(ev.id);
                                        return (
                                            <button key={ev.id} type="button"
                                                className={`btn ${isLinked ? 'btn-primary' : 'btn-secondary'}`}
                                                style={{
                                                    fontSize: '12px', padding: '6px 12px',
                                                    background: isLinked ? (ev.color || '#8b5cf6') : undefined,
                                                    borderColor: isLinked ? (ev.color || '#8b5cf6') : undefined,
                                                }}
                                                onClick={() => toggleEventLink(ev.id)}>
                                                {ev.icon} {ev.name}
                                            </button>
                                        );
                                    })}
                                    {events.length === 0 && (
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No hay eventos creados aún.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {socialMedia.find(a => a.id === editingAccount.id) ? (
                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => removeAccount(editingAccount.id)}>
                                    <Trash2 size={14} /> Eliminar
                                </button>
                            ) : <div />}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={saveAccount}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Arte */}
            {editingArt && (
                <div className="modal-overlay" onClick={closeArtEdit} style={{ zIndex: 9999 }}>
                    <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingArt.id.toString().startsWith('art-') ? 'Añadir Nuevo Arte' : 'Editar Arte'}</h3>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={closeArtEdit}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Título de la imagen</label>
                                <input className="form-input" placeholder="Ej: Flyer Oficial, Lineup, etc." value={editingArt.title} onChange={e => setEditingArt({ ...editingArt, title: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Tipo de formato</label>
                                    <select className="form-select" value={editingArt.type} onChange={e => setEditingArt({ ...editingArt, type: e.target.value })}>
                                        <option value="Post">Post (1:1 / 4:5)</option>
                                        <option value="Story">Story (9:16)</option>
                                        <option value="Reel">Reel (9:16)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Estado de Diseño</label>
                                    <select className="form-select" value={editingArt.status} onChange={e => setEditingArt({ ...editingArt, status: e.target.value })}>
                                        <option value="Pendiente">Pendiente (Idea)</option>
                                        <option value="Revisión">En Revisión</option>
                                        <option value="Aprobado">Aprobado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descripción para el copy / Indicaciones</label>
                                <textarea className="form-textarea" rows={3} placeholder="Texto de la publicación o indicaciones para el diseñador..." value={editingArt.description || ''} onChange={e => setEditingArt({ ...editingArt, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Referencias Visuales (Links)</label>
                                <input className="form-input" placeholder="Enlace a Drive, Pinterest, etc." value={editingArt.references || ''} onChange={e => setEditingArt({ ...editingArt, references: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {!editingArt.id.toString().startsWith('art-') ? (
                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => deleteArt(editingArt.id)}>Eliminar</button>
                            ) : <div></div>}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn btn-ghost" onClick={closeArtEdit}>Cancelar</button>
                                <button className="btn btn-primary" onClick={saveArt}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
