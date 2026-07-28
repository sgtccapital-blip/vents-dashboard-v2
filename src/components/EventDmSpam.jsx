import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, CheckCircle2, MessageSquare } from 'lucide-react';

export default function EventDmSpam() {
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('__vents_dm_spam');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [newTitle, setNewTitle] = useState('');
    const [newBody, setNewBody] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        localStorage.setItem('__vents_dm_spam', JSON.stringify(messages));
    }, [messages]);

    const handleAdd = () => {
        if (!newTitle.trim() || !newBody.trim()) return;
        const newMsg = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            body: newBody.trim(),
            createdAt: new Date().toISOString()
        };
        setMessages([newMsg, ...messages]);
        setNewTitle('');
        setNewBody('');
    };

    const handleDelete = (id) => {
        if(window.confirm('¿Eliminar este mensaje de difusión?')) {
            setMessages(messages.filter(m => m.id !== id));
        }
    };

    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                    <MessageSquare size={24} style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>DM SPAM & Difusión</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Plantillas de mensajes para promos, invitaciones y comunicados masivos.
                    </p>
                </div>
            </div>

            {/* Create New Message */}
            <div className="card" style={{ padding: '20px', marginBottom: '32px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Nuevo Mensaje de Difusión
                </h3>
                <input
                    type="text"
                    placeholder="Título del mensaje (ej: Promo Jueves VIP)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: '14px'
                    }}
                />
                <textarea
                    placeholder="Cuerpo del mensaje. Escribe aquí el texto que vas a copiar y pegar..."
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    rows={4}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: '14px', resize: 'vertical'
                    }}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newTitle.trim() || !newBody.trim()}
                    style={{
                        background: 'var(--accent-orange)', color: 'white', border: 'none', padding: '10px 20px',
                        borderRadius: '8px', fontWeight: 600, cursor: (!newTitle.trim() || !newBody.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (!newTitle.trim() || !newBody.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Plus size={16} /> Guardar Plantilla
                </button>
            </div>

            {/* Message List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        No tienes mensajes guardados. Crea uno arriba para empezar.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--accent-orange)' }}>{msg.title}</h4>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        onClick={() => handleCopy(msg.id, msg.body)}
                                        style={{ background: 'transparent', border: 'none', color: copiedId === msg.id ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                                    >
                                        {copiedId === msg.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                        {copiedId === msg.id ? '¡Copiado!' : 'Copiar'}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(msg.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', opacity: 0.7 }}
                                        title="Eliminar mensaje"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: '20px', whiteSpace: 'pre-wrap', fontSize: '14.5px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
                                {msg.body}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
