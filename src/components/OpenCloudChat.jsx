import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, X, MoreHorizontal, Sparkles } from 'lucide-react';

const INITIAL_MESSAGES = [
    { id: 1, role: 'bot', text: 'Inteligencia OpenCloud en línea. ¿Cómo puedo asistir en tus operaciones hoy?' },
];

import { useApp } from '../context/AppContext';
import OpenCloudService from '../services/openCloudService';

export default function OpenCloudChat({ onClose }) {
    const { refreshData } = useApp();
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const [isThinking, setIsThinking] = useState(false);
    
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    // Audio recording timer simulation
    useEffect(() => {
        let timer = null;
        if (isRecording) {
            timer = setInterval(() => setRecordTime(t => t + 1), 1000);
        } else {
            setRecordTime(0);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `0${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSendText = () => {
        if (!input.trim() && !isRecording) return;
        
        const userInput = input.trim();
        const newMsg = {
            id: Date.now(),
            role: 'user',
            text: userInput
        };
        
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        simulateBotResponse(userInput);
    };

    const handleSendVoice = () => {
        if (recordTime > 0) {
            const newMsg = {
                id: Date.now(),
                role: 'user',
                audio: true,
                duration: formatTime(recordTime)
            };
            setMessages(prev => [...prev, newMsg]);
            setIsRecording(false);
            simulateBotResponse('voice_command'); // simulate voice parse
        } else {
            setIsRecording(false);
        }
    };

    const simulateBotResponse = async (userInput) => {
        setIsThinking(true);
        try {
            const response = await OpenCloudService.sendCommand(userInput, []);
            const botMsg = {
                id: Date.now(),
                role: 'bot',
                text: response
            };
            setMessages(prev => [...prev, botMsg]);
            if (refreshData) refreshData();
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text: `[ERROR DEL SISTEMA] ${error.message}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', position: 'relative' }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                            OpenCloud AI
                            <span style={{ display: 'block', width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-green)' }}></span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>Red Empresarial Global</div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-base)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }} className="custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                        {msg.role === 'bot' && (
                            <div style={{ width: '30px', height: '30px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0, marginTop: '2px' }}>
                                <Bot size={16} color="var(--accent-primary)" />
                            </div>
                        )}
                        <div style={{
                            maxWidth: '75%',
                            padding: '14px 18px',
                            borderRadius: '16px',
                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                            borderTopLeftRadius: msg.role === 'bot' ? '4px' : '16px',
                            background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                            color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                            border: msg.role === 'bot' ? '1px solid var(--border-subtle)' : 'none',
                            fontSize: '14.5px', 
                            lineHeight: 1.5,
                            letterSpacing: '0.01em',
                            boxShadow: msg.role === 'user' ? '0 4px 12px rgba(124, 92, 252, 0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                            {msg.audio ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '160px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '10px', height: '10px', background: '#fff', borderRadius: '2px' }} />
                                    </div>
                                    <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: '#fff', borderRadius: '2px' }} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{msg.duration}</span>
                                </div>
                            ) : (
                                msg.text
                            )}
                        </div>
                    </div>
                ))}
                
                {isThinking && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                        <div style={{ width: '30px', height: '30px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0, marginTop: '2px' }}>
                            <Bot size={16} color="var(--text-tertiary)" />
                        </div>
                        <div style={{ padding: '14px 18px', borderRadius: '16px', borderTopLeftRadius: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', height: '48px' }}>
                            <MoreHorizontal size={24} className="pulse" style={{ opacity: 0.5 }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '20px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    background: 'var(--bg-base)', 
                    borderRadius: '24px', 
                    padding: '8px', 
                    border: '1px solid var(--border-subtle)', 
                    position: 'relative', 
                    overflow: 'hidden'
                }}>
                    {/* Recording Overlay */}
                    {isRecording && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.1)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10, border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-red)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-red)' }} className="pulse"></div>
                                <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em' }}>Grabando... {formatTime(recordTime)}</span>
                            </div>
                            <button 
                                onClick={() => setIsRecording(false)} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={isRecording ? handleSendVoice : () => setIsRecording(true)}
                        style={{ 
                            background: isRecording ? 'var(--accent-red)' : 'var(--bg-surface)', 
                            color: isRecording ? '#fff' : 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '50%', 
                            width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            zIndex: 11
                        }}
                        onMouseOver={e => { if(!isRecording) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-base)'; } }}
                        onMouseOut={e => { if(!isRecording) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-surface)'; } }}
                    >
                        {isRecording ? <Send size={18} style={{ marginLeft: '2px' }} /> : <Mic size={20} />}
                    </button>

                    <input 
                        type="text"
                        placeholder="Escribe un mensaje a OpenCloud..." 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendText()}
                        disabled={isRecording}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '15px', padding: '0 8px' }}
                    />
                    
                    {!isRecording && (
                        <button 
                            style={{ 
                                width: '40px', height: '40px', 
                                borderRadius: '50%', 
                                background: input.trim() ? 'var(--accent-primary)' : 'var(--bg-surface)', 
                                border: '1px solid var(--border-subtle)',
                                color: input.trim() ? '#fff' : 'var(--text-tertiary)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                cursor: input.trim() ? 'pointer' : 'default', 
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: input.trim() ? 1 : 0.7
                            }}
                            onClick={handleSendText}
                        >
                            <Send size={18} style={{ marginLeft: '2px' }} />
                        </button>
                    )}
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '14px', fontWeight: 500 }}>
                    OpenCloud puede cometer errores. Considera verificar la información.
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border-subtle);
                    border-radius: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--text-tertiary);
                }
                .pulse {
                    animation: pulse-animation 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse-animation {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
        </div>
    );
}
