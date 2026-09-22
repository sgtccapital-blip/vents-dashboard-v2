import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import WhatsAppAgentService, { CAMPAIGN_TONES, AUDIENCE_TAGS } from '../services/WhatsAppAgentService';
import {
    MessageSquare, Send, Sparkles, Calendar, Users, Share2, Copy, Check,
    Bot, CheckCircle2, Clock, Play, RefreshCw, Plus, Edit3, Trash2,
    ExternalLink, ChevronLeft, ChevronRight, Filter, Search, Zap,
    Smartphone, Bell, Flame, ShieldAlert, Award, ArrowUpRight, Info,
    Eye, Sliders, CheckSquare, MessageCircle, AlertCircle
} from 'lucide-react';

export default function WhatsAppAgent() {
    const { events, contacts, addActivity } = useApp();

    // ─── Week & Navigation State ────────────────────────────────
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [customRange, setCustomRange] = useState(false);
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');

    // ─── Generator State ────────────────────────────────────────
    const [selectedTone, setSelectedTone] = useState('nightlife_vip');
    const [customInstructions, setCustomInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [campaign, setCampaign] = useState(null);
    const [campaignSource, setCampaignSource] = useState(null);

    // ─── Active Tab State ───────────────────────────────────────
    const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'vip_outreach' | 'groups' | 'simulator' | 'logs'

    // ─── Groups & Outreach State ────────────────────────────────
    const [groups, setGroups] = useState([]);
    const [logs, setLogs] = useState([]);
    const [selectedAudienceFilter, setSelectedAudienceFilter] = useState('all');
    const [contactSearch, setContactSearch] = useState('');
    const [sentContactIds, setSentContactIds] = useState(() => {
        try {
            const saved = localStorage.getItem('__whatsapp_sent_contacts');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // ─── Modals & Editing State ─────────────────────────────────
    const [editingScheduleItem, setEditingScheduleItem] = useState(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupForm, setGroupForm] = useState({ name: '', category: 'VIP & Clientes Frecuentes', memberCount: '', inviteLink: '', postDays: ['Lunes', 'Viernes'], notes: '' });

    // ─── Simulator & Interactive State ──────────────────────────
    const [simulatedDayId, setSimulatedDayId] = useState(null);
    const [simulatedCustomText, setSimulatedCustomText] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [selectedVipTemplateId, setSelectedVipTemplateId] = useState('vip-msg-1');

    // ─── Autopilot & Settings State ─────────────────────────────
    const [autonomyMode, setAutonomyMode] = useState('assisted'); // 'manual' | 'assisted' | 'autopilot'

    // ─── Calculate Current Week Range ───────────────────────────
    const weekRange = useMemo(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now);
        start.setDate(diff + (weekOffset * 7));
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const options = { day: 'numeric', month: 'short' };
        const label = `${start.toLocaleDateString('es-PA', options)} - ${end.toLocaleDateString('es-PA', { ...options, year: 'numeric' })}`;

        return { start, end, label, startIso: start.toISOString().split('T')[0], endIso: end.toISOString().split('T')[0] };
    }, [weekOffset]);

    // ─── Filter Events for Current Week ─────────────────────────
    const weekEvents = useMemo(() => {
        const all = events || [];
        const start = weekRange.start;
        const end = weekRange.end;

        const filtered = all.filter(ev => {
            if (ev.date) {
                const d = new Date(ev.date + 'T12:00:00');
                if (d >= start && d <= end) return true;
            }
            if (Array.isArray(ev.instances)) {
                return ev.instances.some(inst => {
                    if (inst.date) {
                        const idate = new Date(inst.date + 'T12:00:00');
                        return idate >= start && idate <= end;
                    }
                    return false;
                });
            }
            return false;
        });

        if (filtered.length > 0) return filtered;
        // If no events match exact date, return upcoming active events as context
        return all.filter(e => e.status === 'activo' || e.status === 'planificacion' || e.status === 'upcoming').slice(0, 5);
    }, [events, weekRange]);

    // ─── Load Initial Data ──────────────────────────────────────
    useEffect(() => {
        loadCampaign();
        loadGroups();
        loadLogs();
    }, [weekOffset]);

    const loadCampaign = async () => {
        try {
            const camp = await WhatsAppAgentService.getCurrentCampaign();
            if (camp) {
                setCampaign(camp);
                if (camp.weeklySchedule && camp.weeklySchedule.length > 0) {
                    setSimulatedDayId(camp.weeklySchedule[0].id);
                }
            }
        } catch (e) {
            console.error('Error loading campaign:', e);
        }
    };

    const loadGroups = async () => {
        try {
            const data = await WhatsAppAgentService.getGroups();
            setGroups(data);
        } catch (e) {
            console.error('Error loading groups:', e);
        }
    };

    const loadLogs = async () => {
        try {
            const data = await WhatsAppAgentService.getLogs();
            setLogs(data);
        } catch (e) {
            console.error('Error loading logs:', e);
        }
    };

    // ─── Handle Generate Campaign ───────────────────────────────
    const handleGenerateCampaign = async () => {
        setIsGenerating(true);
        try {
            const result = await WhatsAppAgentService.generateCampaign({
                weekOffset,
                startDate: customRange ? startDateInput : weekRange.startIso,
                endDate: customRange ? endDateInput : weekRange.endIso,
                tone: selectedTone,
                customInstructions
            });

            if (result.success && result.campaign) {
                setCampaign(result.campaign);
                setCampaignSource(result.source || 'ai');
                if (result.campaign.weeklySchedule?.length > 0) {
                    setSimulatedDayId(result.campaign.weeklySchedule[0].id);
                }
                if (addActivity) {
                    addActivity(`✨ Pulse Agent generó nueva campaña semanal de WhatsApp (${weekRange.label})`);
                }
            }
        } catch (err) {
            console.error('Error generating campaign:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── Action Handlers ────────────────────────────────────────
    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleSendDirectWhatsApp = (contact, textTemplate) => {
        const text = WhatsAppAgentService.personalizeMessage(textTemplate, contact);
        const url = WhatsAppAgentService.buildWhatsAppLink(contact.phone, text);
        
        // Log dispatch
        WhatsAppAgentService.logDispatch({
            title: `Outreach VIP 1 a 1 a ${contact.name}`,
            target: contact.name,
            channel: 'whatsapp_direct',
            recipientName: contact.name,
            recipientPhone: contact.phone,
            copyPreview: text
        });

        // Mark as sent in state & localStorage
        const updated = [...new Set([...sentContactIds, contact.id])];
        setSentContactIds(updated);
        localStorage.setItem('__whatsapp_sent_contacts', JSON.stringify(updated));

        // Refresh logs
        loadLogs();

        // Open WhatsApp
        window.open(url, '_blank');
    };

    const handleSendGroupWhatsApp = (group, text) => {
        const url = WhatsAppAgentService.buildWhatsAppLink('', text);
        
        WhatsAppAgentService.logDispatch({
            title: `Broadcast a Grupo: ${group.name}`,
            target: group.name,
            channel: 'whatsapp_group',
            copyPreview: text
        });

        loadLogs();
        window.open(url, '_blank');
    };

    const handleOpenScheduleWhatsApp = (item) => {
        const url = WhatsAppAgentService.buildWhatsAppLink('', item.whatsappCopy);
        
        WhatsAppAgentService.logDispatch({
            title: `Publicación ${item.day}: ${item.title}`,
            target: item.targetAudience || 'Comunidades WhatsApp',
            channel: 'whatsapp_broadcast',
            copyPreview: item.whatsappCopy
        });

        // Mark status as sent in local campaign
        if (campaign) {
            const updatedSchedule = campaign.weeklySchedule.map(s => s.id === item.id ? { ...s, status: 'sent', sentAt: new Date().toISOString() } : s);
            const updatedCamp = { ...campaign, weeklySchedule: updatedSchedule };
            setCampaign(updatedCamp);
            WhatsAppAgentService.saveCampaign(updatedCamp);
        }

        loadLogs();
        window.open(url, '_blank');
    };

    const handleSaveScheduleEdit = () => {
        if (!editingScheduleItem || !campaign) return;
        const updated = campaign.weeklySchedule.map(s => s.id === editingScheduleItem.id ? editingScheduleItem : s);
        const updatedCamp = { ...campaign, weeklySchedule: updated };
        setCampaign(updatedCamp);
        WhatsAppAgentService.saveCampaign(updatedCamp);
        setEditingScheduleItem(null);
    };

    // ─── Group Modal Handlers ───────────────────────────────────
    const openGroupModal = (grp = null) => {
        if (grp) {
            setEditingGroup(grp);
            setGroupForm({ ...grp, postDays: grp.postDays || ['Lunes', 'Viernes'] });
        } else {
            setEditingGroup(null);
            setGroupForm({ name: '', category: 'VIP & Clientes Frecuentes', memberCount: '', inviteLink: '', postDays: ['Lunes', 'Viernes'], notes: '' });
        }
        setShowGroupModal(true);
    };

    const handleSaveGroup = async () => {
        if (!groupForm.name.trim()) return;
        await WhatsAppAgentService.saveGroup({ ...groupForm, id: editingGroup?.id });
        await loadGroups();
        setShowGroupModal(false);
    };

    const handleDeleteGroup = async (id) => {
        if (confirm('¿Eliminar este grupo de WhatsApp?')) {
            await WhatsAppAgentService.deleteGroup(id);
            await loadGroups();
        }
    };

    // ─── Filtered Contacts for Outreach ─────────────────────────
    const filteredContacts = useMemo(() => {
        return (contacts || []).filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  (c.phone || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  (c.instagram || '').toLowerCase().includes(contactSearch.toLowerCase());
            const matchesRole = selectedAudienceFilter === 'all' || c.role === selectedAudienceFilter;
            return matchesSearch && matchesRole;
        });
    }, [contacts, contactSearch, selectedAudienceFilter]);

    // Active Simulated Text for Phone Preview
    const currentSimulatedText = useMemo(() => {
        if (simulatedCustomText) return simulatedCustomText;
        if (!campaign) return '⚡ Selecciona o genera una campaña semanal para ver la vista previa en WhatsApp.';
        
        const scheduleItem = campaign.weeklySchedule?.find(s => s.id === simulatedDayId);
        if (scheduleItem) return scheduleItem.whatsappCopy;

        if (campaign.weeklySchedule && campaign.weeklySchedule.length > 0) {
            return campaign.weeklySchedule[0].whatsappCopy;
        }

        return 'Campaña cargada. Elige un día para previsualizar.';
    }, [simulatedCustomText, simulatedDayId, campaign]);

    // Selected VIP Template
    const activeVipTemplate = useMemo(() => {
        if (!campaign?.vipDirectMessages) return null;
        return campaign.vipDirectMessages.find(t => t.id === selectedVipTemplateId) || campaign.vipDirectMessages[0];
    }, [campaign, selectedVipTemplateId]);

    return (
        <div className="page-content animate-in" style={{ paddingBottom: '60px' }}>
            
            {/* ═══ HEADER PRINCIPAL ═══ */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, rgba(124, 92, 252, 0.08) 50%, rgba(17, 17, 26, 0.95) 100%)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                borderRadius: '20px',
                padding: '28px 32px',
                marginBottom: '28px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #25D366, #128C7E)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)'
                        }}>
                            <MessageSquare size={32} color="#fff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#fff' }}>
                                    Pulse — Agente de Difusión Semanal & WhatsApp
                                </h1>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    background: 'rgba(37, 211, 102, 0.15)',
                                    color: '#25D366',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(37, 211, 102, 0.3)'
                                }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366', boxShadow: '0 0 8px #25D366' }}></span>
                                    ONLINE • Gemini 2.5 + Embedded Engine
                                </span>
                            </div>
                            <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '780px' }}>
                                Orquestador autónomo para la cartelera semanal de eventos. Redacta y despacha mensajes segmentados para clientes VIP, listas de invitados y grupos comunitarios de WhatsApp en 1-click.
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center', minWidth: '100px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#25D366' }}>{weekEvents.length}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eventos Semana</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center', minWidth: '100px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#8b5cf6' }}>{groups.length}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comunidades</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center', minWidth: '100px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{contacts?.length || 0}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contactos VIP</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center', minWidth: '100px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>{logs.length}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Despachos Realizados</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ WEEK SCANNER & AI GENERATOR BAR ═══ */}
            <div className="card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                    
                    {/* Week Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setWeekOffset(prev => prev - 1)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                        >
                            <ChevronLeft size={16} /> Semana Anterior
                        </button>

                        <div style={{
                            padding: '8px 18px',
                            background: 'rgba(124, 92, 252, 0.12)',
                            borderRadius: '10px',
                            border: '1px solid rgba(124, 92, 252, 0.3)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Calendar size={16} color="var(--accent-primary)" />
                            <span>Semana: {weekRange.label}</span>
                            {weekOffset === 0 && <span className="tag tag-active" style={{ fontSize: '10px', padding: '2px 6px' }}>Actual</span>}
                        </div>

                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                        >
                            Semana Siguiente <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Tone Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tono del Agente:</span>
                        <select 
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value)}
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-default)',
                                color: '#fff',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        >
                            {CAMPAIGN_TONES.map(t => (
                                <option key={t.id} value={t.id} style={{ background: '#11111a', color: '#fff' }}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Event Summary Pills */}
                <div style={{
                    padding: '14px 18px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '12px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="#f59e0b" /> Eventos en Cartelera ({weekEvents.length}):
                    </span>
                    {weekEvents.map(e => (
                        <div key={e.id} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: `${e.color || '#3b82f6'}20`,
                            border: `1px solid ${e.color || '#3b82f6'}40`,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#fff'
                        }}>
                            <span>{e.icon || '🎪'}</span>
                            <span>{e.name}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 400 }}>({e.activeDate || e.date})</span>
                        </div>
                    ))}
                </div>

                {/* Custom Instructions & Big Generate Button */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <input 
                            type="text"
                            placeholder="Instrucciones adicionales para el agente (ej: Destacar open bar para chicas antes de 11pm o show de salsa...)"
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '13.5px',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button 
                        className="btn btn-primary"
                        onClick={handleGenerateCampaign}
                        disabled={isGenerating}
                        style={{
                            background: 'linear-gradient(135deg, #25D366, #128C7E)',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
                            cursor: isGenerating ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw size={18} className="spin" />
                                <span>Analizando Cartelera & Redactando...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                <span>Generar Campaña Semanal con IA (1-Click)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ═══ TABS NAVIGATION ═══ */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '24px',
                overflowX: 'auto',
                paddingBottom: '2px'
            }}>
                <button
                    onClick={() => setActiveTab('schedule')}
                    style={{
                        padding: '12px 20px',
                        background: activeTab === 'schedule' ? 'rgba(37, 211, 102, 0.15)' : 'transparent',
                        color: activeTab === 'schedule' ? '#25D366' : 'var(--text-secondary)',
                        border: 'none',
                        borderBottom: activeTab === 'schedule' ? '2px solid #25D366' : '2px solid transparent',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Calendar size={17} /> Parrilla Semanal (Lunes a Domingo)
                </button>

                <button
                    onClick={() => setActiveTab('vip_outreach')}
                    style={{
                        padding: '12px 20px',
                        background: activeTab === 'vip_outreach' ? 'rgba(124, 92, 252, 0.15)' : 'transparent',
                        color: activeTab === 'vip_outreach' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: 'none',
                        borderBottom: activeTab === 'vip_outreach' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Users size={17} /> Outreach Directo a Clientes VIP (1 a 1)
                </button>

                <button
                    onClick={() => setActiveTab('groups')}
                    style={{
                        padding: '12px 20px',
                        background: activeTab === 'groups' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: activeTab === 'groups' ? '#3b82f6' : 'var(--text-secondary)',
                        border: 'none',
                        borderBottom: activeTab === 'groups' ? '2px solid #3b82f6' : '2px solid transparent',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Share2 size={17} /> Comunidades & Grupos de WhatsApp ({groups.length})
                </button>

                <button
                    onClick={() => setActiveTab('simulator')}
                    style={{
                        padding: '12px 20px',
                        background: activeTab === 'simulator' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                        color: activeTab === 'simulator' ? '#f59e0b' : 'var(--text-secondary)',
                        border: 'none',
                        borderBottom: activeTab === 'simulator' ? '2px solid #f59e0b' : '2px solid transparent',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Smartphone size={17} /> Simulador WhatsApp en Vivo
                </button>

                <button
                    onClick={() => setActiveTab('logs')}
                    style={{
                        padding: '12px 20px',
                        background: activeTab === 'logs' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                        color: activeTab === 'logs' ? '#ec4899' : 'var(--text-secondary)',
                        border: 'none',
                        borderBottom: activeTab === 'logs' ? '2px solid #ec4899' : '2px solid transparent',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Clock size={17} /> Logs de Despacho & Scheduler
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 1: PARRILLA SEMANAL (LUNES A DOMINGO)                   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'schedule' && (
                <div>
                    {campaign?.summary && (
                        <div style={{
                            padding: '16px 20px',
                            background: 'rgba(37, 211, 102, 0.08)',
                            border: '1px solid rgba(37, 211, 102, 0.2)',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bot size={20} color="#25D366" />
                                <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.9)' }}>
                                    <strong>Estrategia de la Semana:</strong> {campaign.summary}
                                </span>
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                                Generado: {new Date(campaign.createdAt).toLocaleTimeString('es-PA')}
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                        {campaign?.weeklySchedule?.map((item) => {
                            const isSent = item.status === 'sent';
                            return (
                                <div 
                                    key={item.id}
                                    className="card" 
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        background: 'var(--bg-card)',
                                        border: isSent ? '1px solid rgba(37, 211, 102, 0.4)' : '1px solid var(--border-subtle)',
                                        borderRadius: '16px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Header de la tarjeta */}
                                    <div style={{
                                        padding: '16px 20px',
                                        background: 'rgba(0,0,0,0.25)',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                background: 'rgba(124, 92, 252, 0.2)',
                                                color: 'var(--accent-primary)',
                                                fontWeight: 800,
                                                fontSize: '12px'
                                            }}>
                                                {item.day.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
                                                {item.date}
                                            </span>
                                        </div>

                                        <span style={{
                                            fontSize: '11px',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            background: isSent ? 'rgba(37, 211, 102, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: isSent ? '#25D366' : '#f59e0b',
                                            fontWeight: 600
                                        }}>
                                            {isSent ? '✓ Enviado' : 'Listo para Enviar'}
                                        </span>
                                    </div>

                                    {/* Contenido */}
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                                            {item.title}
                                        </h3>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                            🎯 Destino: <strong>{item.targetAudience}</strong> • Tipo: <strong>{item.type}</strong>
                                        </div>

                                        {/* WhatsApp Preview Bubble */}
                                        <div style={{
                                            background: 'rgba(18, 140, 126, 0.12)',
                                            border: '1px solid rgba(37, 211, 102, 0.2)',
                                            borderRadius: '10px',
                                            padding: '14px',
                                            fontSize: '13px',
                                            lineHeight: '1.55',
                                            color: 'rgba(255,255,255,0.92)',
                                            whiteSpace: 'pre-wrap',
                                            flex: 1,
                                            marginBottom: '16px',
                                            maxHeight: '220px',
                                            overflowY: 'auto'
                                        }}>
                                            {item.whatsappCopy}
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleOpenScheduleWhatsApp(item)}
                                                style={{
                                                    flex: 1,
                                                    background: '#25D366',
                                                    color: '#000',
                                                    fontWeight: 700,
                                                    padding: '9px 14px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '13px',
                                                    border: 'none'
                                                }}
                                            >
                                                <Send size={15} /> Despachar (wa.me)
                                            </button>

                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleCopy(item.id, item.whatsappCopy)}
                                                style={{
                                                    padding: '9px 12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '13px',
                                                    color: copiedId === item.id ? '#25D366' : 'var(--text-primary)'
                                                }}
                                                title="Copiar texto formateado"
                                            >
                                                {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
                                                {copiedId === item.id ? '¡Copiado!' : 'Copiar'}
                                            </button>

                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setEditingScheduleItem(item)}
                                                style={{ padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                                                title="Editar copy"
                                            >
                                                <Edit3 size={15} />
                                            </button>

                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setSimulatedDayId(item.id);
                                                    setActiveTab('simulator');
                                                }}
                                                style={{ padding: '9px 12px', borderRadius: '8px', fontSize: '13px' }}
                                                title="Ver en simulador de teléfono"
                                            >
                                                <Smartphone size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 2: OUTREACH DIRECTO A CLIENTES VIP (1 A 1)             */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'vip_outreach' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
                    
                    {/* Left: Contacts List */}
                    <div className="card" style={{ padding: '20px', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={20} color="var(--accent-primary)" /> Directorio de Clientes & Contactos
                                </h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    Dispara mensajes personalizados 1 a 1 a WhatsApp con el nombre del cliente pre-cargado.
                                </p>
                            </div>

                            {/* Search */}
                            <div style={{ position: 'relative', width: '220px' }}>
                                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input 
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px 8px 34px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Audience Filter Pills */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                            {AUDIENCE_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => setSelectedAudienceFilter(tag.id)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: selectedAudienceFilter === tag.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                        background: selectedAudienceFilter === tag.id ? 'rgba(124, 92, 252, 0.2)' : 'rgba(0,0,0,0.2)',
                                        color: selectedAudienceFilter === tag.id ? '#fff' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>

                        {/* Contacts Table / List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {filteredContacts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No se encontraron contactos para este filtro.
                                </div>
                            ) : (
                                filteredContacts.map(contact => {
                                    const isSent = sentContactIds.includes(contact.id);
                                    return (
                                        <div 
                                            key={contact.id}
                                            style={{
                                                padding: '14px 18px',
                                                background: 'rgba(0,0,0,0.25)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '14px',
                                                flexWrap: 'wrap'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    background: contact.role === 'VIP' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '15px',
                                                    color: contact.role === 'VIP' ? '#f59e0b' : '#3b82f6'
                                                }}>
                                                    {contact.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{contact.name}</span>
                                                        <span className={`tag tag-${contact.role === 'VIP' ? 'active' : 'pending'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                                            {contact.role}
                                                        </span>
                                                        {isSent && (
                                                            <span style={{ fontSize: '11px', color: '#25D366', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <CheckCircle2 size={13} /> Enviado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                        📞 {contact.phone || 'Sin teléfono'} • {contact.instagram || 'Sin IG'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleSendDirectWhatsApp(contact, activeVipTemplate?.whatsappCopy || '')}
                                                    style={{
                                                        background: '#25D366',
                                                        color: '#000',
                                                        fontWeight: 700,
                                                        padding: '8px 14px',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '12.5px',
                                                        border: 'none'
                                                    }}
                                                >
                                                    <Send size={14} /> Enviar WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Selected Template Preview */}
                    <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', position: 'sticky', top: '80px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sliders size={16} color="var(--accent-primary)" /> Plantilla de Mensaje Activa
                        </h4>

                        {/* Template selector pills */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {campaign?.vipDirectMessages?.map(tmpl => (
                                <div 
                                    key={tmpl.id}
                                    onClick={() => setSelectedVipTemplateId(tmpl.id)}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: selectedVipTemplateId === tmpl.id ? 'rgba(124, 92, 252, 0.2)' : 'rgba(0,0,0,0.2)',
                                        border: selectedVipTemplateId === tmpl.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: selectedVipTemplateId === tmpl.id ? '#fff' : 'var(--text-secondary)' }}>
                                        {tmpl.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                        Audiencia: {tmpl.audience}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Template Preview */}
                        {activeVipTemplate && (
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                                    Vista previa del texto:
                                </div>
                                <div style={{
                                    background: 'rgba(18, 140, 126, 0.12)',
                                    border: '1px solid rgba(37, 211, 102, 0.25)',
                                    borderRadius: '10px',
                                    padding: '14px',
                                    fontSize: '13px',
                                    lineHeight: '1.5',
                                    color: 'rgba(255,255,255,0.92)',
                                    whiteSpace: 'pre-wrap',
                                    marginBottom: '14px'
                                }}>
                                    {activeVipTemplate.whatsappCopy}
                                </div>

                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleCopy(activeVipTemplate.id, activeVipTemplate.whatsappCopy)}
                                    style={{ width: '100%', padding: '9px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    {copiedId === activeVipTemplate.id ? <Check size={15} /> : <Copy size={15} />}
                                    {copiedId === activeVipTemplate.id ? '¡Plantilla Copiada!' : 'Copiar Plantilla'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 3: COMUNIDADES & GRUPOS DE WHATSAPP                     */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'groups' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Share2 size={20} color="#3b82f6" /> Directorio de Grupos & Comunidades de WhatsApp
                            </h3>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                Administra tus canales masivos, comunidades de clientes VIP y grupos de promotores.
                            </p>
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={() => openGroupModal()}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px' }}
                        >
                            <Plus size={16} /> Añadir Grupo / Comunidad
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                        {groups.map(group => (
                            <div 
                                key={group.id}
                                className="card"
                                style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                                            {group.name}
                                        </h4>
                                        <span className="tag tag-active" style={{ fontSize: '11px' }}>
                                            {group.category}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            onClick={() => openGroupModal(group)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                            title="Editar grupo"
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteGroup(group.id)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}
                                            title="Eliminar grupo"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0', flex: 1 }}>
                                    {group.notes || 'Comunidad oficial para difusiones semanales.'}
                                </p>

                                <div style={{
                                    padding: '10px 14px',
                                    background: 'rgba(0,0,0,0.25)',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <div>👥 Miembros estimados: <strong style={{ color: '#fff' }}>{group.memberCount || 0}</strong></div>
                                    <div>📅 Días de posteo: <strong style={{ color: '#25D366' }}>{(group.postDays || []).join(', ')}</strong></div>
                                    {group.inviteLink && (
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            🔗 <a href={group.inviteLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>{group.inviteLink}</a>
                                        </div>
                                    )}
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const mondayCopy = campaign?.weeklySchedule?.[0]?.whatsappCopy || 'Cartelera semanal disponible.';
                                        handleSendGroupWhatsApp(group, mondayCopy);
                                    }}
                                    style={{
                                        background: '#25D366',
                                        color: '#000',
                                        fontWeight: 700,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        fontSize: '13px',
                                        border: 'none',
                                        width: '100%'
                                    }}
                                >
                                    <Send size={15} /> Publicar Cartelera en Grupo
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 4: SIMULADOR WHATSAPP EN VIVO                           */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'simulator' && (
                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '32px', alignItems: 'start' }}>
                    
                    {/* Controls Left */}
                    <div className="card" style={{ padding: '20px', background: 'var(--bg-card)' }}>
                        <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Smartphone size={18} color="#25D366" /> Selector de Mensaje a Simular
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {campaign?.weeklySchedule?.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setSimulatedDayId(s.id);
                                        setSimulatedCustomText('');
                                    }}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        background: simulatedDayId === s.id && !simulatedCustomText ? 'rgba(37, 211, 102, 0.15)' : 'rgba(0,0,0,0.2)',
                                        border: simulatedDayId === s.id && !simulatedCustomText ? '1px solid #25D366' : '1px solid var(--border-subtle)',
                                        color: '#fff',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span>{s.day}: {s.title}</span>
                                    <ChevronRight size={14} color="var(--text-tertiary)" />
                                </button>
                            ))}
                        </div>

                        <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            O prueba redactando un texto libre:
                        </h5>
                        <textarea 
                            rows={4}
                            placeholder="Escribe aquí con formato WhatsApp (*negrita*, _cursiva_, emojis)..."
                            value={simulatedCustomText}
                            onChange={(e) => setSimulatedCustomText(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '13px',
                                resize: 'vertical',
                                marginBottom: '14px'
                            }}
                        />

                        <button
                            className="btn btn-primary"
                            onClick={() => handleCopy('sim-text', currentSimulatedText)}
                            style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            {copiedId === 'sim-text' ? <Check size={16} /> : <Copy size={16} />}
                            {copiedId === 'sim-text' ? '¡Texto Copiado!' : 'Copiar Texto del Simulador'}
                        </button>
                    </div>

                    {/* Phone Screen Mockup */}
                    <div style={{
                        maxWidth: '420px',
                        margin: '0 auto',
                        background: '#0c1317',
                        borderRadius: '36px',
                        padding: '14px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 10px #1f2937',
                        border: '2px solid rgba(255,255,255,0.1)'
                    }}>
                        {/* Phone Header / WhatsApp Topbar */}
                        <div style={{
                            background: '#1f2c34',
                            borderRadius: '24px 24px 0 0',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', fontSize: '15px' }}>
                                P
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: '#e9edef' }}>VIP Nightlife & Events PTY</div>
                                <div style={{ fontSize: '11px', color: '#8696a0' }}>en línea • Comunidad oficial</div>
                            </div>
                        </div>

                        {/* WhatsApp Chat Body */}
                        <div style={{
                            minHeight: '440px',
                            maxHeight: '520px',
                            overflowY: 'auto',
                            padding: '18px 12px',
                            background: '#0b141a',
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)',
                            backgroundSize: '16px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end'
                        }}>
                            {/* Message Bubble */}
                            <div style={{
                                alignSelf: 'flex-end',
                                background: '#005c4b',
                                color: '#e9edef',
                                padding: '12px 14px',
                                borderRadius: '10px 10px 2px 10px',
                                maxWidth: '92%',
                                fontSize: '13.5px',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                position: 'relative'
                            }}>
                                {currentSimulatedText}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '4px',
                                    fontSize: '10px',
                                    color: '#8696a0',
                                    marginTop: '6px'
                                }}>
                                    <span>{new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span style={{ color: '#53bdeb' }}>✓✓</span>
                                </div>
                            </div>
                        </div>

                        {/* Phone Footer Mockup */}
                        <div style={{
                            background: '#1f2c34',
                            borderRadius: '0 0 24px 24px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <div style={{
                                flex: 1,
                                background: '#2a3942',
                                borderRadius: '20px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: '#8696a0'
                            }}>
                                Mensaje...
                            </div>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={15} color="#fff" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 5: LOGS DE DESPACHO & SCHEDULER                         */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'logs' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                    
                    {/* Left: Dispatch Activity Feed */}
                    <div className="card" style={{ padding: '20px', background: 'var(--bg-card)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={20} color="#ec4899" /> Registro de Despachos & Historial
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {logs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    Aún no hay despachos registrados. Cuando envíes mensajes aparecerán aquí.
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div 
                                        key={log.id}
                                        style={{
                                            padding: '14px 16px',
                                            background: 'rgba(0,0,0,0.25)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: '12px'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#25D366' }}>●</span> {log.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                                Destino: <strong>{log.target}</strong> {log.recipientPhone ? `(${log.recipientPhone})` : ''}
                                            </div>
                                            {log.copyPreview && (
                                                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                                                    "{log.copyPreview}"
                                                </div>
                                            )}
                                        </div>

                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                            {new Date(log.timestamp).toLocaleTimeString('es-PA')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Scheduler Status */}
                    <div className="card" style={{ padding: '20px', background: 'var(--bg-card)' }}>
                        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={16} color="#f59e0b" /> Automatización Semanal
                        </h4>

                        <div style={{
                            padding: '14px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '10px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>
                                ⏰ Cron Scheduler Activo
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4' }}>
                                Cada <strong>Lunes a las 09:00 AM</strong>, Pulse analiza todos los eventos de la semana entrante y genera automáticamente la parrilla y los copys de WhatsApp.
                            </p>
                        </div>

                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                            <div>• Frecuencia: <strong>Semanal (Lunes 09:00 AM)</strong></div>
                            <div>• Estado: <strong style={{ color: '#25D366' }}>Ejecutando en background</strong></div>
                            <div>• Modelo: <strong>Gemini 2.5 Flash</strong></div>
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={handleGenerateCampaign}
                            style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <Play size={14} /> Disparar Compilación Manual Ahora
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ MODAL EDIT SCHEDULE ITEM ═══ */}
            {editingScheduleItem && (
                <div className="modal-overlay" onClick={() => setEditingScheduleItem(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                Editar Publicación de {editingScheduleItem.day}
                            </h3>
                            <button className="btn-icon" onClick={() => setEditingScheduleItem(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <label className="form-label">Título</label>
                            <input 
                                type="text"
                                className="form-input"
                                value={editingScheduleItem.title}
                                onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, title: e.target.value })}
                                style={{ marginBottom: '14px' }}
                            />

                            <label className="form-label">Audiencia Destino</label>
                            <input 
                                type="text"
                                className="form-input"
                                value={editingScheduleItem.targetAudience}
                                onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, targetAudience: e.target.value })}
                                style={{ marginBottom: '14px' }}
                            />

                            <label className="form-label">Texto Formateado de WhatsApp</label>
                            <textarea 
                                className="form-input"
                                rows={8}
                                value={editingScheduleItem.whatsappCopy}
                                onChange={(e) => setEditingScheduleItem({ ...editingScheduleItem, whatsappCopy: e.target.value })}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingScheduleItem(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveScheduleEdit}>Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL ADD / EDIT GROUP ═══ */}
            {showGroupModal && (
                <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                {editingGroup ? 'Editar Grupo de WhatsApp' : 'Añadir Nuevo Grupo / Comunidad'}
                            </h3>
                            <button className="btn-icon" onClick={() => setShowGroupModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <label className="form-label">Nombre del Grupo / Comunidad *</label>
                            <input 
                                type="text"
                                className="form-input"
                                placeholder="ej: 🔥 VIP Casco & Nightlife"
                                value={groupForm.name}
                                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                style={{ marginBottom: '14px' }}
                            />

                            <label className="form-label">Categoría</label>
                            <select
                                className="form-input"
                                value={groupForm.category}
                                onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                                style={{ marginBottom: '14px' }}
                            >
                                <option value="VIP & Clientes Frecuentes">VIP & Clientes Frecuentes</option>
                                <option value="Comunidad Masiva / Cultural">Comunidad Masiva / Cultural</option>
                                <option value="Staff & Fuerza de Venta">Staff & Fuerza de Venta</option>
                                <option value="Música & Fanbase">Música & Fanbase</option>
                                <option value="General">General</option>
                            </select>

                            <label className="form-label">Miembros Estimados</label>
                            <input 
                                type="number"
                                className="form-input"
                                placeholder="ej: 450"
                                value={groupForm.memberCount}
                                onChange={(e) => setGroupForm({ ...groupForm, memberCount: e.target.value })}
                                style={{ marginBottom: '14px' }}
                            />

                            <label className="form-label">Enlace de Invitación (Opcional)</label>
                            <input 
                                type="text"
                                className="form-input"
                                placeholder="https://chat.whatsapp.com/..."
                                value={groupForm.inviteLink}
                                onChange={(e) => setGroupForm({ ...groupForm, inviteLink: e.target.value })}
                                style={{ marginBottom: '14px' }}
                            />

                            <label className="form-label">Notas / Objetivos</label>
                            <textarea 
                                className="form-input"
                                rows={3}
                                placeholder="Notas sobre el público o directivas de posteo..."
                                value={groupForm.notes}
                                onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveGroup}>Guardar Grupo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
