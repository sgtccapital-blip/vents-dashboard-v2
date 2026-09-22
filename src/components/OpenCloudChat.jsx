import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, MicOff, X, Sparkles, Trash2, Cpu, CheckCircle2, Volume2, Play, Pause } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function OpenCloudChat({ onClose }) {
    const {
        openclawMessages = [],
        sendOpenclawMessage,
        isOpenclawThinking,
        clearOpenclawChat,
        openclawMode,
        setOpenclawMode,
        events = [],
        projects = []
    } = useApp();

    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [openclawMessages, isOpenclawThinking]);

    // Live Voice Dictation (Speech-to-Text) using Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-ES';

            recognition.onresult = (event) => {
                let current = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    current += event.results[i][0].transcript;
                }
                setInput(prev => {
                    const base = prev.endsWith(' ') || prev.length === 0 ? prev : prev + ' ';
                    return base + current;
                });
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleVoiceDictation = () => {
        if (!recognitionRef.current) {
            alert('Dictado por voz no soportado en este navegador. Usa Chrome o Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.warn('Recognition start error:', e);
            }
        }
    };

    const handleSendText = async () => {
        if (!input.trim() || isOpenclawThinking) return;
        const text = input.trim();
        setInput('');
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        if (text === '/limpiar') {
            clearOpenclawChat();
            return;
        }

        await sendOpenclawMessage(text);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
            
            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '38px', height: '38px', 
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))', 
                        border: '1px solid rgba(139,92,246,0.4)', 
                        borderRadius: '10px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: 'var(--accent-primary)',
                        position: 'relative' 
                    }}>
                        <Sparkles size={18} />
                        <span style={{ 
                            position: 'absolute', bottom: -2, right: -2, 
                            width: '8px', height: '8px', 
                            background: '#22c55e', borderRadius: '50%', 
                            boxShadow: '0 0 6px #22c55e' 
                        }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            OpenClaw Super Agent
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: '6px', fontWeight: 600 }}>
                                Sincronizado
                            </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Cpu size={11} color="#06b6d4" />
                            <span>Gemini 3.6 Flash & RAG Hub • {events.length} Eventos</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={clearOpenclawChat}
                        title="Reiniciar chat"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        <Trash2 size={14} />
                    </button>
                    <button 
                        onClick={onClose}
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }} className="custom-scrollbar">
                {openclawMessages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                            {!isUser && (
                                <div style={{ width: '28px', height: '28px', background: 'var(--bg-surface)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', flexShrink: 0, marginTop: '2px' }}>
                                    <Bot size={15} color="var(--accent-primary)" />
                                </div>
                            )}
                            <div style={{
                                maxWidth: '82%',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                borderBottomRightRadius: isUser ? '4px' : '14px',
                                borderTopLeftRadius: !isUser ? '4px' : '14px',
                                background: isUser ? 'var(--accent-primary)' : 'var(--bg-surface)',
                                color: isUser ? '#ffffff' : 'var(--text-primary)',
                                border: !isUser ? '1px solid var(--border-subtle)' : 'none',
                                fontSize: '13.5px', 
                                lineHeight: 1.55,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                boxShadow: isUser ? '0 4px 12px rgba(124, 92, 252, 0.25)' : '0 2px 8px rgba(0,0,0,0.05)'
                            }}>
                                {msg.audio && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <audio controls src={msg.audio} style={{ height: '32px', width: '220px', outline: 'none' }} />
                                    </div>
                                )}
                                <div>{msg.text}</div>
                                {msg.timestamp && (
                                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: isUser ? 'right' : 'left' }}>
                                        {msg.timestamp}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {isOpenclawThinking && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                        <div style={{ width: '28px', height: '28px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', flexShrink: 0, marginTop: '2px' }}>
                            <Bot size={15} color="var(--accent-primary)" />
                        </div>
                        <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                            <span className="copilot-thinking-dots" style={{ display: 'flex', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'bounce 1s infinite 0.1s' }} />
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'bounce 1s infinite 0.2s' }} />
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'bounce 1s infinite 0.3s' }} />
                            </span>
                            <span>OpenClaw & Gemini pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '16px 20px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    background: 'var(--bg-base)', 
                    borderRadius: '16px', 
                    padding: '6px 10px', 
                    border: '1px solid var(--border-subtle)', 
                    position: 'relative'
                }}>
                    <button 
                        onClick={toggleVoiceDictation}
                        title={isListening ? "Detener dictado por voz" : "Dictar por voz (Gratis)"}
                        style={{ 
                            background: isListening ? '#ef4444' : 'var(--bg-surface)', 
                            color: isListening ? '#fff' : 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '50%', 
                            width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.2s'
                        }}
                    >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    <input 
                        type="text"
                        placeholder="Escribe a OpenClaw o di 'crear tarea...'" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendText()}
                        disabled={isOpenclawThinking}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13.5px', padding: '0 4px' }}
                    />
                    
                    <button 
                        style={{ 
                            width: '36px', height: '36px', 
                            borderRadius: '50%', 
                            background: input.trim() ? 'var(--accent-primary)' : 'var(--bg-surface)', 
                            border: '1px solid var(--border-subtle)',
                            color: input.trim() ? '#fff' : 'var(--text-tertiary)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: input.trim() ? 'pointer' : 'default', 
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                        onClick={handleSendText}
                        disabled={!input.trim() || isOpenclawThinking}
                    >
                        <Send size={15} style={{ marginLeft: '2px' }} />
                    </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', fontWeight: 500 }}>
                    Misma memoria que Dashboard Copilot flotante • Gemini 3.6 Flash activo
                </div>
            </div>
        </div>
    );
}
