import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Send, Brain, User, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BartChatModal() {
    const { setBartChatOpen } = useApp();
    const [messages, setMessages] = useState([
        { id: '1', role: 'ai', text: 'Soy Bart. ¿En qué te ayudo?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:3001/api/orch/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, context: { source: 'global-modal' } })
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();

            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'ai', 
                text: data.reply || data.response || data.message || 'Sin respuesta.' 
            }]);
        } catch (e) {
            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'ai', 
                text: '⚠️ Error de conexión con el agente.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                width: '90vw', maxWidth: '600px', height: '80vh', background: '#0f172a', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.5)' }} />
                        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '15px' }}>Bart - Interfaz Directa</span>
                    </div>
                    <button 
                        onClick={() => setBartChatOpen(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#0b1120' }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
                                {msg.role === 'user' ? <User size={14} /> : <Brain size={14} color="#7c5cfc" />}
                                <span style={{ fontWeight: 600 }}>{msg.role === 'user' ? 'Tú' : 'Bart'}</span>
                            </div>
                            <div style={{
                                maxWidth: '85%', padding: '12px 18px', borderRadius: '16px',
                                background: msg.role === 'user' ? 'linear-gradient(135deg, #7c5cfc, #3b82f6)' : '#1e293b',
                                color: msg.role === 'user' ? '#fff' : '#f8fafc',
                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
                                fontSize: '14.5px', lineHeight: '1.6'
                            }}>
                                {msg.role === 'ai' ? <div className="markdown-body" style={{background: 'transparent', color: 'inherit'}}><ReactMarkdown>{msg.text}</ReactMarkdown></div> : msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
                                <Brain size={14} color="#7c5cfc" className="pulse-icon" /> <span style={{ fontWeight: 600 }}>Bart</span>
                            </div>
                            <div style={{
                                padding: '12px 18px', borderRadius: '16px', borderBottomLeftRadius: '4px',
                                background: '#1e293b', color: '#cbd5e1', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px'
                            }}>
                                <RefreshCw size={14} className="spin" /> Pensando...
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '20px', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '4px',
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Dile algo a Bart..."
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', padding: '12px 16px', outline: 'none', fontSize: '15px' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                background: input.trim() ? 'linear-gradient(135deg, #7c5cfc, #3b82f6)' : '#334155',
                                color: '#fff', border: 'none', borderRadius: '10px',
                                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: input.trim() ? 'pointer' : 'not-allowed', margin: '4px'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
