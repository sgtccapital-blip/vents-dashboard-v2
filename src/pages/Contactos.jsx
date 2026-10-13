import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
    Search, Plus, Filter, User, Mail, Phone, Calendar, Instagram,
    MoreHorizontal, Edit2, Trash2, Crown, Sparkles, Star, Users,
    CheckCircle2, XCircle, ExternalLink, MessageCircle, Heart,
    Zap, Flame, Check, ShieldCheck, Share2
} from 'lucide-react';

export default function Contactos() {
    const {
        contacts = [],
        addContact,
        updateContact,
        deleteContact,
        imageGirls = [],
        addImageGirl,
        updateImageGirl,
        deleteImageGirl,
        promoters = [],
        addPromoter,
        updatePromoter,
        deletePromoter
    } = useApp();

    // Active View Mode: 'models', 'promoters', 'contacts'
    const [activeTab, setActiveTab] = useState('models');

    // Search and Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSpecialty, setFilterSpecialty] = useState('Todos');
    const [filterAvailability, setFilterAvailability] = useState('all'); // 'all', 'available', 'busy'
    const [filterRole, setFilterRole] = useState('Todos');

    // Modals
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', instagram: '', role: 'Invitado', dob: '', tags: '' });

    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [modelForm, setModelForm] = useState({ name: '', ig: '', phone: '', type: 'Cena VIP & Cócteles', rating: 5.0, available: true });

    const [isPromoterModalOpen, setIsPromoterModalOpen] = useState(false);
    const [editingPromoter, setEditingPromoter] = useState(null);
    const [promoterForm, setPromoterForm] = useState({ name: '', phone: '', contacts: 500, style: 'VIP / Mesas & Botellas', rating: 5.0 });

    // ─── Filtered Data ───────────────────────────────────────────
    const filteredModels = useMemo(() => {
        return (imageGirls || []).filter(m => {
            const matchesSearch =
                (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.ig || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.type || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesSpecialty = filterSpecialty === 'Todos' || m.type === filterSpecialty;
            const matchesAvail = filterAvailability === 'all' || 
                (filterAvailability === 'available' && m.available !== false) ||
                (filterAvailability === 'busy' && m.available === false);

            return matchesSearch && matchesSpecialty && matchesAvail;
        });
    }, [imageGirls, searchQuery, filterSpecialty, filterAvailability]);

    const filteredPromoters = useMemo(() => {
        return (promoters || []).filter(p => {
            const matchesSearch =
                (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.style || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [promoters, searchQuery]);

    const filteredContacts = useMemo(() => {
        return (contacts || []).filter(c => {
            const matchesSearch =
                (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.instagram || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = filterRole === 'Todos' || c.role === filterRole;
            return matchesSearch && matchesRole;
        });
    }, [contacts, searchQuery, filterRole]);

    // Unique model specialties for filter
    const modelSpecialties = ['Todos', ...new Set((imageGirls || []).map(m => m.type).filter(Boolean))];
    const contactRoles = ['Todos', ...new Set((contacts || []).map(c => c.role).filter(Boolean))];

    // Stats
    const availableModelsCount = (imageGirls || []).filter(m => m.available !== false).length;
    const totalPromoterReach = (promoters || []).reduce((acc, p) => acc + (parseInt(p.contacts) || 0), 0);

    // ─── Model Handlers ──────────────────────────────────────────
    const openModelModal = (model = null) => {
        if (model) {
            setEditingModel(model);
            setModelForm({ ...model });
        } else {
            setEditingModel(null);
            setModelForm({ name: '', ig: '', phone: '', type: 'Cena VIP & Cócteles', rating: 5.0, available: true });
        }
        setIsModelModalOpen(true);
    };

    const handleSaveModel = () => {
        if (!modelForm.name) return;
        const cleanIg = modelForm.ig ? (modelForm.ig.startsWith('@') ? modelForm.ig : `@${modelForm.ig}`) : '';
        const payload = { ...modelForm, ig: cleanIg };
        if (editingModel) {
            updateImageGirl(editingModel.id, payload);
        } else {
            addImageGirl(payload);
        }
        setIsModelModalOpen(false);
        setEditingModel(null);
    };

    const toggleModelAvailability = (model) => {
        updateImageGirl(model.id, { available: model.available === false ? true : false });
    };

    const handleQuickAddToDinner = (model, venue) => {
        try {
            const currentSaved = localStorage.getItem('os_live_dinner_guestlist');
            const list = currentSaved ? JSON.parse(currentSaved) : [];
            const exists = list.some(g => (g.name || '').toLowerCase() === (model.name || '').toLowerCase() && g.venue === venue);
            if (exists) {
                alert(`${model.name} ya está en la lista de ${venue}.`);
                return;
            }

            const newEntry = {
                id: `g-${Date.now()}`,
                name: model.name,
                ig: model.ig || '',
                phone: (model.phone || '').replace(/\D/g, ''),
                type: model.type || 'Cena VIP & Cócteles',
                venue: venue,
                day: venue.includes('Terraplén') ? 'Jueves 8:30 PM' : venue.includes('Furia') ? 'Viernes 9:00 PM' : 'Sábado 9:30 PM',
                status: 'pendiente',
                friends: []
            };

            const updated = [newEntry, ...list];
            localStorage.setItem('os_live_dinner_guestlist', JSON.stringify(updated));
            alert(`✓ ${model.name} ha sido agregada a la lista de ${venue}!`);
        } catch (e) {
            console.error(e);
        }
    };

    // ─── Promoter Handlers ───────────────────────────────────────
    const openPromoterModal = (promoter = null) => {
        if (promoter) {
            setEditingPromoter(promoter);
            setPromoterForm({ ...promoter });
        } else {
            setEditingPromoter(null);
            setPromoterForm({ name: '', phone: '', contacts: 500, style: 'VIP / Mesas & Botellas', rating: 5.0 });
        }
        setIsPromoterModalOpen(true);
    };

    const handleSavePromoter = () => {
        if (!promoterForm.name) return;
        if (editingPromoter) {
            updatePromoter(editingPromoter.id, promoterForm);
        } else {
            addPromoter(promoterForm);
        }
        setIsPromoterModalOpen(false);
        setEditingPromoter(null);
    };

    // ─── Contact Handlers ────────────────────────────────────────
    const openContactModal = (contact = null) => {
        if (contact) {
            setEditingContact(contact);
            setContactForm({
                ...contact,
                tags: contact.tags ? contact.tags.join(', ') : ''
            });
        } else {
            setEditingContact(null);
            setContactForm({ name: '', phone: '', email: '', instagram: '', role: 'Invitado', dob: '', tags: '' });
        }
        setIsContactModalOpen(true);
    };

    const handleSaveContact = () => {
        if (!contactForm.name) return;
        const payload = {
            ...contactForm,
            tags: contactForm.tags ? contactForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        };
        if (editingContact) {
            updateContact(editingContact.id, payload);
        } else {
            addContact(payload);
        }
        setIsContactModalOpen(false);
        setEditingContact(null);
    };

    const getRoleColor = (role) => {
        const colors = {
            'VIP': '#f59e0b',
            'Promotor': '#3b82f6',
            'Staff': '#10b981',
            'Proveedor': '#8b5cf6',
            'Invitado': '#6b7280'
        };
        return colors[role] || 'var(--text-secondary)';
    };

    return (
        <div className="page-content animate-in" style={{ paddingBottom: '60px' }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: '6px', background: 'rgba(217, 70, 239, 0.15)', color: '#d946ef', border: '1px solid rgba(217, 70, 239, 0.3)' }}>
                            ARRIVE Models & Talent OS
                        </span>
                    </div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '1.75rem', fontWeight: 800 }}>
                        <Crown size={28} color="#f43f5e" /> Roster de Modelos & Contactos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        Gestión integral de Image Girls para cenas VIP, convocatorias de venues, promotores de alto impacto y directorio general.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {activeTab === 'models' && (
                        <button className="btn btn-primary" onClick={() => openModelModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #d946ef, #f43f5e)', border: 'none' }}>
                            <Plus size={16} /> Añadir Modelo
                        </button>
                    )}
                    {activeTab === 'promoters' && (
                        <button className="btn btn-primary" onClick={() => openPromoterModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', border: 'none' }}>
                            <Plus size={16} /> Añadir Promotor
                        </button>
                    )}
                    {activeTab === 'contacts' && (
                        <button className="btn btn-primary" onClick={() => openContactModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} /> Añadir Contacto
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(217, 70, 239, 0.05)', border: '1px solid rgba(217, 70, 239, 0.2)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(217, 70, 239, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d946ef' }}>
                        <Crown size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>ARRIVE Models</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f0f0f5' }}>{(imageGirls || []).length} Chicas</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Disponibles Cenas VIP</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>{availableModelsCount} Activas</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Red de Promotores</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa' }}>{(promoters || []).length} Lideres</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                        <Flame size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Alcance de Audiencia</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>{totalPromoterReach.toLocaleString()} personas</div>
                    </div>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', paddingBottom: '10px' }}>
                <button
                    onClick={() => { setActiveTab('models'); setSearchQuery(''); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: activeTab === 'models' ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.2), rgba(244, 63, 94, 0.2))' : 'transparent',
                        color: activeTab === 'models' ? '#f43f5e' : 'var(--text-secondary)',
                        border: activeTab === 'models' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    <Crown size={16} /> ARRIVE Models & Image Girls ({(imageGirls || []).length})
                </button>

                <button
                    onClick={() => { setActiveTab('promoters'); setSearchQuery(''); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: activeTab === 'promoters' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: activeTab === 'promoters' ? '#38bdf8' : 'var(--text-secondary)',
                        border: activeTab === 'promoters' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={16} /> Promotores & Embajadores ({(promoters || []).length})
                </button>

                <button
                    onClick={() => { setActiveTab('contacts'); setSearchQuery(''); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: activeTab === 'contacts' ? 'rgba(124, 92, 252, 0.15)' : 'transparent',
                        color: activeTab === 'contacts' ? '#a78bfa' : 'var(--text-secondary)',
                        border: activeTab === 'contacts' ? '1px solid rgba(124, 92, 252, 0.4)' : '1px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    <User size={16} /> Directorio General ({(contacts || []).length})
                </button>
            </div>

            {/* TOOLBAR */}
            <div className="card" style={{ padding: '16px', display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input 
                        type="text" 
                        placeholder={
                            activeTab === 'models' ? "Buscar modelo por nombre, @Instagram, tipo..." :
                            activeTab === 'promoters' ? "Buscar promotor por nombre, estilo o teléfono..." :
                            "Buscar por nombre, teléfono, email, IG..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 16px 10px 42px', 
                            background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                            borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '13.5px'
                        }}
                    />
                </div>

                {/* Tab specific filter chips */}
                {activeTab === 'models' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                            value={filterAvailability}
                            onChange={(e) => setFilterAvailability(e.target.value)}
                            style={{
                                padding: '8px 12px', borderRadius: '10px', background: 'var(--bg-base)',
                                border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
                                fontSize: '13px', outline: 'none', cursor: 'pointer'
                            }}
                        >
                            <option value="all">Todas Disponibilidades</option>
                            <option value="available">🟢 Solo Disponibles</option>
                            <option value="busy">⚪ Reservadas / No disp.</option>
                        </select>

                        <select
                            value={filterSpecialty}
                            onChange={(e) => setFilterSpecialty(e.target.value)}
                            style={{
                                padding: '8px 12px', borderRadius: '10px', background: 'var(--bg-base)',
                                border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
                                fontSize: '13px', outline: 'none', cursor: 'pointer'
                            }}
                        >
                            {modelSpecialties.map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                            ))}
                        </select>
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        {contactRoles.map(role => (
                            <button 
                                key={role}
                                onClick={() => setFilterRole(role)}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    background: filterRole === role ? 'var(--accent-primary)' : 'var(--bg-base)',
                                    color: filterRole === role ? '#fff' : 'var(--text-secondary)',
                                    border: filterRole === role ? 'none' : '1px solid var(--border-subtle)',
                                    transition: 'all 0.2s', whiteSpace: 'nowrap'
                                }}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── 1. TAB: ARRIVE MODELS & IMAGE GIRLS ─── */}
            {activeTab === 'models' && (
                <div>
                    {filteredModels.length === 0 ? (
                        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <Crown size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>No se encontraron modelos con los filtros actuales.</p>
                            <button className="btn btn-primary" onClick={() => openModelModal()} style={{ marginTop: '16px' }}>
                                Añadir primera modelo
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {filteredModels.map((model) => (
                                <div
                                    key={model.id}
                                    className="card"
                                    style={{
                                        padding: '18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        position: 'relative',
                                        border: model.available !== false ? '1px solid rgba(217, 70, 239, 0.25)' : '1px solid var(--border-subtle)',
                                        background: model.available !== false ? 'rgba(25, 20, 35, 0.85)' : 'rgba(18, 18, 25, 0.7)',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                >
                                    {/* Top Profile Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{
                                                position: 'relative',
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #d946ef, #f43f5e)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: '18px',
                                                boxShadow: '0 4px 12px rgba(217, 70, 239, 0.3)'
                                            }}>
                                                {model.name.charAt(0)}
                                                <span style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0,
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: model.available !== false ? '#10b981' : '#64748b',
                                                    border: '2px solid #11111a'
                                                }} />
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#f0f0f5' }}>{model.name}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
                                                        <Star size={12} fill="#f59e0b" /> {model.rating || 5.0}
                                                    </span>
                                                </div>

                                                {model.ig && (
                                                    <a
                                                        href={`https://instagram.com/${model.ig.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ec4899', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', marginTop: '2px' }}
                                                    >
                                                        <Instagram size={13} /> {model.ig}
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn btn-ghost" onClick={() => openModelModal(model)} style={{ padding: '6px' }}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost" onClick={() => deleteImageGirl(model.id)} style={{ padding: '6px', color: '#ef4444' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Specialty Badge & Availability */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: 'rgba(217, 70, 239, 0.15)',
                                            color: '#e879f9',
                                            border: '1px solid rgba(217, 70, 239, 0.3)'
                                        }}>
                                            ✨ {model.type || 'Cena VIP & Cócteles'}
                                        </span>

                                        <button
                                            onClick={() => toggleModelAvailability(model)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: model.available !== false ? '#34d399' : '#94a3b8',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {model.available !== false ? '🟢 Disponible' : '⚪ Reservada'}
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        {model.phone && (
                                            <a
                                                href={`https://wa.me/${model.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${model.name}! Te escribo de ARRIVE Models para invitarte a la cena VIP de este fin de semana en Furia Panamá / Terraplén Rooftop. Confirmas tu asistencia?`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    background: '#25D366',
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    textDecoration: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px'
                                                }}
                                            >
                                                <MessageCircle size={14} /> Invitar a Cena VIP
                                            </a>
                                        )}

                                        {model.phone && (
                                            <a
                                                href={`tel:${model.phone.replace(/[^\d+]/g, '')}`}
                                                className="btn btn-secondary"
                                                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title={`Llamar a ${model.phone}`}
                                            >
                                                <Phone size={14} />
                                            </a>
                                        )}
                                    </div>

                                    {/* Direct Table Assign Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                            🍸 Asignar Mesa:
                                        </span>
                                        {[
                                            { venue: 'Terraplén Rooftop', label: 'Terraplén' },
                                            { venue: 'Furia', label: 'Furia' },
                                            { venue: 'Piano Bar', label: 'Piano Bar' }
                                        ].map(v => (
                                            <button
                                                key={v.venue}
                                                type="button"
                                                onClick={() => handleQuickAddToDinner(model, v.venue)}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '10.5px',
                                                    fontWeight: 600,
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                                title={`Añadir a lista de cena en ${v.venue}`}
                                            >
                                                + {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── 2. TAB: PROMOTORES & EMBAJADORES ─── */}
            {activeTab === 'promoters' && (
                <div>
                    {filteredPromoters.length === 0 ? (
                        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <Users size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>No se encontraron promotores registrados.</p>
                            <button className="btn btn-primary" onClick={() => openPromoterModal()} style={{ marginTop: '16px' }}>
                                Añadir primer promotor
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {filteredPromoters.map((promoter) => (
                                <div
                                    key={promoter.id}
                                    className="card"
                                    style={{
                                        padding: '18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        border: '1px solid rgba(59, 130, 246, 0.25)',
                                        background: 'rgba(18, 22, 35, 0.85)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '46px',
                                                height: '46px',
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: '18px'
                                            }}>
                                                {promoter.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '16px', color: '#f0f0f5' }}>{promoter.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                                                    <Star size={12} fill="#f59e0b" /> {promoter.rating || 5.0} Rating
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn btn-ghost" onClick={() => openPromoterModal(promoter)} style={{ padding: '6px' }}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost" onClick={() => deletePromoter(promoter.id)} style={{ padding: '6px', color: '#ef4444' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Promoted Style & Audience Reach */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Audiencia VIP</div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>{parseInt(promoter.contacts || 0).toLocaleString()} Contactos</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Especialidad</div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{promoter.style || 'Mesas & Botellas'}</div>
                                        </div>
                                    </div>

                                    {/* WhatsApp Direct Action */}
                                    {promoter.phone && (
                                        <a
                                            href={`https://wa.me/${promoter.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${promoter.name}! Te escribo de ARRIVE Agency para coordinar las listas y mesas para el fin de semana.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                background: '#25D366',
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '12px',
                                                textDecoration: 'none',
                                                borderRadius: '8px',
                                                padding: '8px 12px'
                                            }}
                                        >
                                            <MessageCircle size={14} /> Coordinar por WhatsApp ({promoter.phone})
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── 3. TAB: DIRECTORIO GENERAL & CLIENTES VIP ─── */}
            {activeTab === 'contacts' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="contacts-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Contacto</th>
                                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Categoría</th>
                                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Contacto Info</th>
                                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Instagram</th>
                                    <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Etiquetas</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContacts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            No se encontraron contactos.
                                        </td>
                                    </tr>
                                ) : filteredContacts.map(contact => (
                                    <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    width: '40px', height: '40px', borderRadius: '50%', 
                                                    background: `linear-gradient(135deg, ${getRoleColor(contact.role)}30, transparent)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: `1px solid ${getRoleColor(contact.role)}50`,
                                                    color: getRoleColor(contact.role), fontWeight: 700, fontSize: '16px'
                                                }}>
                                                    {contact.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{contact.name}</div>
                                                    {contact.dob && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                            <Calendar size={10} /> {contact.dob}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                background: `${getRoleColor(contact.role)}20`, color: getRoleColor(contact.role)
                                            }}>
                                                {contact.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {contact.phone && (
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Phone size={12} /> {contact.phone}
                                                        <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                                                            WA
                                                        </a>
                                                    </div>
                                                )}
                                                {contact.email && (
                                                    <a href={`mailto:${contact.email}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                                                        <Mail size={12} /> {contact.email}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            {contact.instagram ? (
                                                <a href={`https://instagram.com/${contact.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#E1306C', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 600 }}>
                                                    <Instagram size={14} /> {contact.instagram}
                                                </a>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {(contact.tags || []).slice(0, 3).map((tag, i) => (
                                                    <span key={i} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button className="btn btn-ghost" onClick={() => openContactModal(contact)} style={{ padding: '6px' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn btn-ghost" onClick={() => deleteContact(contact.id)} style={{ padding: '6px', color: '#ef4444' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── MODAL: MODEL / IMAGE GIRL ─── */}
            {isModelModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModelModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', padding: '28px', animation: 'scaleUp 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Crown size={22} color="#f43f5e" />
                            <h2 style={{ margin: 0, fontSize: '19px' }}>{editingModel ? 'Editar Modelo ARRIVE' : 'Añadir Modelo / Image Girl'}</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre Completo *</label>
                                <input type="text" className="input" value={modelForm.name} onChange={e => setModelForm({...modelForm, name: e.target.value})} placeholder="Ej. Valentina S." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Instagram @handle</label>
                                    <input type="text" className="input" value={modelForm.ig} onChange={e => setModelForm({...modelForm, ig: e.target.value})} placeholder="@usuario.pty" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Teléfono / WhatsApp</label>
                                    <input type="text" className="input" value={modelForm.phone} onChange={e => setModelForm({...modelForm, phone: e.target.value})} placeholder="+507 6000-0000" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tipo / Especialidad</label>
                                <select className="input" value={modelForm.type} onChange={e => setModelForm({...modelForm, type: e.target.value})}>
                                    <option value="Cena VIP & Cócteles">Cena VIP & Cócteles</option>
                                    <option value="Contenido / Stories">Contenido / Stories</option>
                                    <option value="Mesa Anfitriona">Mesa Anfitriona</option>
                                    <option value="Cena VIP & Mesa Furia">Cena VIP & Mesa Furia</option>
                                    <option value="Rooftop Sunset Hostess">Rooftop Sunset Hostess</option>
                                    <option value="Animación & Shots VIP">Animación & Shots VIP</option>
                                    <option value="Cena VIP & Networking">Cena VIP & Networking</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Calificación (Rating)</label>
                                    <input type="number" step="0.1" min="1" max="5" className="input" value={modelForm.rating} onChange={e => setModelForm({...modelForm, rating: parseFloat(e.target.value) || 5.0})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Disponibilidad</label>
                                    <select className="input" value={modelForm.available ? 'true' : 'false'} onChange={e => setModelForm({...modelForm, available: e.target.value === 'true'})}>
                                        <option value="true">🟢 Disponible</option>
                                        <option value="false">⚪ Reservada</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setIsModelModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveModel} disabled={!modelForm.name}>Guardar Modelo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: PROMOTER ─── */}
            {isPromoterModalOpen && (
                <div className="modal-overlay" onClick={() => setIsPromoterModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', padding: '28px', animation: 'scaleUp 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Users size={22} color="#3b82f6" />
                            <h2 style={{ margin: 0, fontSize: '19px' }}>{editingPromoter ? 'Editar Promotor' : 'Añadir Promotor / Embajador'}</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre *</label>
                                <input type="text" className="input" value={promoterForm.name} onChange={e => setPromoterForm({...promoterForm, name: e.target.value})} placeholder="Ej. Carlos Casco" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Teléfono / WA</label>
                                    <input type="text" className="input" value={promoterForm.phone} onChange={e => setPromoterForm({...promoterForm, phone: e.target.value})} placeholder="+507 6000-0000" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Alcance Contactos</label>
                                    <input type="number" className="input" value={promoterForm.contacts} onChange={e => setPromoterForm({...promoterForm, contacts: parseInt(e.target.value) || 0})} placeholder="800" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Estilo / Especialidad</label>
                                <input type="text" className="input" value={promoterForm.style} onChange={e => setPromoterForm({...promoterForm, style: e.target.value})} placeholder="VIP / Mesas & Botellas, Chicas a Cenar..." />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setIsPromoterModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSavePromoter} disabled={!promoterForm.name}>Guardar Promotor</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: GENERAL CONTACT ─── */}
            {isContactModalOpen && (
                <div className="modal-overlay" onClick={() => setIsContactModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', padding: '28px', animation: 'scaleUp 0.2s ease-out' }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '19px' }}>{editingContact ? 'Editar Contacto' : 'Añadir Contacto'}</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre Completo *</label>
                                <input type="text" className="input" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} placeholder="Ej. Juan Pérez" />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Categoría</label>
                                    <select className="input" value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})}>
                                        <option value="VIP">VIP</option>
                                        <option value="Promotor">Promotor</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Proveedor">Proveedor</option>
                                        <option value="Invitado">Invitado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Instagram</label>
                                    <input type="text" className="input" value={contactForm.instagram} onChange={e => setContactForm({...contactForm, instagram: e.target.value})} placeholder="@usuario" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Teléfono</label>
                                    <input type="text" className="input" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} placeholder="+507 6000-0000" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                                    <input type="email" className="input" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} placeholder="correo@ejemplo.com" />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setIsContactModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveContact} disabled={!contactForm.name}>Guardar Contacto</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
