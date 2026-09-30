import { useState, useMemo } from 'react';
import { X, Copy, Check, Share2, Sparkles, MessageCircle, Calendar, MapPin, Users, Send } from 'lucide-react';

export default function WhatsAppExportModal({ events = [], tasks = [], isOpen, onClose }) {
    const [includeVenues, setIncludeVenues] = useState(true);
    const [includeDates, setIncludeDates] = useState(true);
    const [includeStaff, setIncludeStaff] = useState(true);
    const [customHeader, setCustomHeader] = useState('🔥 CARTELERA EXCLUSIVA CASCO & NIGHTLIFE 🔥');
    const [customFooter, setCustomFooter] = useState('📲 Listas VIP & Reservas de Mesas: Directo por WhatsApp');
    const [copied, setCopied] = useState(false);

    // Extract upcoming events
    const upcomingEvents = useMemo(() => {
        return (events || [])
            .filter(e => e.status !== 'cancelado' && e.status !== 'cancelled')
            .slice(0, 10);
    }, [events]);

    // Build the formatted message
    const generatedText = useMemo(() => {
        let text = `${customHeader}\n\n`;
        text += `✨ *AGENDA DE EVENTOS & EXPERIENCIAS*\n`;
        text += `───────────────────────\n\n`;

        if (upcomingEvents.length === 0) {
            text += `📅 Próximamente nuevos eventos anunciados.\n\n`;
        } else {
            upcomingEvents.forEach(ev => {
                const dateStr = ev.date ? `📅 ${ev.date}` : '';
                const locationStr = ev.location ? `📍 ${ev.location}` : '';
                const icon = ev.icon || '🍸';

                text += `${icon} *${ev.name.toUpperCase()}*\n`;
                if (includeDates && dateStr) text += `   ${dateStr}\n`;
                if (includeVenues && locationStr) text += `   ${locationStr}\n`;
                if (ev.description) text += `   ℹ️ ${ev.description.slice(0, 90)}\n`;

                // Add associated key tasks or instances if any
                const evTasks = (tasks || []).filter(t => t.eventId === ev.id && !t.done).slice(0, 2);
                if (includeStaff && evTasks.length > 0) {
                    text += `   👥 Coordinadores: ${evTasks.map(t => t.assignedTo || t.assignee || 'Equipo').join(', ')}\n`;
                }

                text += `\n`;
            });
        }

        text += `───────────────────────\n`;
        text += `${customFooter}\n`;
        text += `⚡ *Command Center OS*`;

        return text;
    }, [upcomingEvents, tasks, customHeader, customFooter, includeVenues, includeDates, includeStaff]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const handleOpenWhatsApp = () => {
        const encoded = encodeURIComponent(generatedText);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                background: '#141724',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '18px',
                width: '100%',
                maxWidth: '680px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(124, 92, 252, 0.08))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '38px', height: '38px',
                            borderRadius: '10px',
                            background: '#22c55e',
                            color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
                        }}>
                            <MessageCircle size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                                Exportador de Cartelera para WhatsApp
                            </h3>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Formatea la cartelera de eventos para envío a grupos y clientes VIP
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Controls & Options */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={includeVenues}
                                onChange={e => setIncludeVenues(e.target.checked)}
                                style={{ accentColor: '#22c55e' }}
                            />
                            Incluir Venues
                        </label>

                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={includeDates}
                                onChange={e => setIncludeDates(e.target.checked)}
                                style={{ accentColor: '#22c55e' }}
                            />
                            Incluir Fechas
                        </label>

                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={includeStaff}
                                onChange={e => setIncludeStaff(e.target.checked)}
                                style={{ accentColor: '#22c55e' }}
                            />
                            Incluir Responsables
                        </label>
                    </div>

                    {/* Custom Header Input */}
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                            Título o Encabezado
                        </label>
                        <input
                            type="text"
                            value={customHeader}
                            onChange={e => setCustomHeader(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: '13px'
                            }}
                        />
                    </div>

                    {/* Preview Area */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                                Vista Previa del Mensaje
                            </label>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {upcomingEvents.length} eventos incluidos
                            </span>
                        </div>
                        <div style={{
                            background: '#0b141a',
                            border: '1px solid #1f2c34',
                            borderRadius: '12px',
                            padding: '16px',
                            color: '#e9edef',
                            fontFamily: 'monospace, system-ui',
                            fontSize: '12.5px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '260px',
                            overflowY: 'auto'
                        }}>
                            {generatedText}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '9px 16px',
                            color: '#94a3b8',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Cerrar
                    </button>

                    <button
                        onClick={handleCopy}
                        style={{
                            background: copied ? '#059669' : 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '9px 18px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? '¡Copiado!' : 'Copiar Texto'}
                    </button>

                    <button
                        onClick={handleOpenWhatsApp}
                        style={{
                            background: '#22c55e',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '9px 20px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
                        }}
                    >
                        <Send size={16} />
                        Enviar por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}
