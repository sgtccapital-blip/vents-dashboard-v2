import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import OpenClawBrainService, { OPENCLAW_MODES, SLASH_COMMANDS } from '../services/OpenClawBrainService';
import {
    Bot, Send, Mic, MicOff, X, Sparkles, CheckCircle2, ChevronDown,
    Calendar, CheckSquare, Briefcase, Zap, Volume2, VolumeX, ArrowRight,
    Play, Pause, RotateCcw, AlertCircle, Database, Search, MessageSquare, ExternalLink,
    Sliders, Settings, Key, Cpu, ShieldCheck
} from 'lucide-react';

export default function DashboardCopilot() {
    const navigate = useNavigate();
    const {
        events = [],
        projects = [],
        tasks = [],
        addTask,
        updateTask,
        toggleTask,
        addActivity,
        imageGirls = [],
        promoters = [],
        openclawMessages = [],
        setOpenclawMessages,
        clearOpenclawChat
    } = useApp();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // OpenClaw Super Agent Modes
    const [selectedMode, setSelectedMode] = useState('ejecutivo');
    const currentModeObj = useMemo(() => OPENCLAW_MODES.find(m => m.id === selectedMode) || OPENCLAW_MODES[0], [selectedMode]);

    // Gemini API State & Modal
    const [geminiApiKey, setGeminiApiKey] = useState(() => OpenClawBrainService.getGeminiApiKey());
    const [showGeminiModal, setShowGeminiModal] = useState(false);
    const [geminiKeyInput, setGeminiKeyInput] = useState(geminiApiKey);
    const [geminiStatus, setGeminiStatus] = useState({ configured: !!geminiApiKey, active: !!geminiApiKey });

    // Live Voice Dictation State (Speech-to-Text)
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    // Audio Voice Note Recording State (MediaRecorder)
    const [isRecordingNote, setIsRecordingNote] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordTimerRef = useRef(null);
    const currentNoteTranscriptRef = useRef('');

    // Slash Commands Menu
    const [showSlashMenu, setShowSlashMenu] = useState(false);

    // Shared Messages State (Synced with Workspace OpenClaw drawer & AppContext)
    const messages = openclawMessages;
    const setMessages = setOpenclawMessages;

    const chatEndRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (isOpen && !isMinimized) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isThinking, isOpen, isMinimized]);

    // Check Gemini status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/openclaw/gemini/status');
                if (res.ok) {
                    const data = await res.json();
                    setGeminiStatus({
                        configured: data.configured || !!geminiApiKey,
                        active: data.active || !!geminiApiKey
                    });
                }
            } catch (e) {}
        };
        checkStatus();
    }, [geminiApiKey]);

    // Handle Save Gemini API Key
    const handleSaveGeminiKey = async (e) => {
        e?.preventDefault();
        const saved = await OpenClawBrainService.saveGeminiApiKey(geminiKeyInput);
        setGeminiApiKey(saved);
        setGeminiStatus({ configured: !!saved, active: !!saved });
        setShowGeminiModal(false);

        const notice = saved 
            ? '✨ **API Key de Gemini configurada con éxito**. OpenClaw Super Agent ahora responderá impulsado por **Gemini 3.6 Flash**.'
            : 'ℹ️ Se ha removido la API Key de Gemini. OpenClaw operará en modo orquestador local.';

        setMessages(prev => [...prev, {
            id: `sys-${Date.now()}`,
            role: 'copilot',
            text: notice,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    // Initialize Web Speech Recognition (Free Browser API)
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-PA';

            recognition.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPart = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentTranscript += transcriptPart + ' ';
                    } else {
                        currentTranscript += transcriptPart;
                    }
                }

                if (isRecordingNote) {
                    currentNoteTranscriptRef.current = (currentNoteTranscriptRef.current + ' ' + currentTranscript).trim();
                } else {
                    setInput(prev => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed} ${currentTranscript.trim()}` : currentTranscript.trim();
                    });
                }
            };

            recognition.onerror = (err) => {
                if (err.error !== 'no-speech') {
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, [isRecordingNote]);

    // Handle Live Voice Dictation Toggle
    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('El reconocimiento de voz no está disponible en este navegador. Te sugerimos usar Chrome, Edge o Safari.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.lang = 'es-PA';
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.warn('Speech recognition start error:', err);
                setIsListening(false);
            }
        }
    };

    // Free Voice Note Recording via MediaRecorder
    const startVoiceNoteRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            currentNoteTranscriptRef.current = '';

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
                handleSendVoiceNote(audioUrl, currentNoteTranscriptRef.current);
            };

            mediaRecorder.start();
            setIsRecordingNote(true);
            setRecordDuration(0);

            recordTimerRef.current = setInterval(() => {
                setRecordDuration(d => d + 1);
            }, 1000);

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.lang = 'es-PA';
                    recognitionRef.current.start();
                } catch (e) {}
            }
        } catch (err) {
            console.error('[Copilot Audio] Mic access denied:', err);
            alert('No se pudo acceder al micrófono para grabar la nota de voz. Concede permisos de audio.');
        }
    };

    const stopVoiceNoteRecording = () => {
        if (recordTimerRef.current) {
            clearInterval(recordTimerRef.current);
            recordTimerRef.current = null;
        }
        if (mediaRecorderRef.current && isRecordingNote) {
            mediaRecorderRef.current.stop();
            setIsRecordingNote(false);
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
        }
    };

    const cancelVoiceNoteRecording = () => {
        if (recordTimerRef.current) {
            clearInterval(recordTimerRef.current);
            recordTimerRef.current = null;
        }
        if (mediaRecorderRef.current && isRecordingNote) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecordingNote(false);
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
        }
        audioChunksRef.current = [];
        currentNoteTranscriptRef.current = '';
    };

    // Free Text-to-Speech (TTS)
    const speakText = (text) => {
        if (!ttsEnabled || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*_#`~[\]]/g, '').slice(0, 220);
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'es-ES';
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('TTS error:', e);
        }
    };

    // Process Voice Note message
    const handleSendVoiceNote = (audioUrl, transcript) => {
        const cleanTranscript = (transcript || '').trim();
        const durationFormatted = `${Math.floor(recordDuration / 60)}:${(recordDuration % 60).toString().padStart(2, '0')}`;

        const userMsg = {
            id: `vn-${Date.now()}`,
            role: 'user',
            type: 'voice_note',
            audioUrl,
            duration: durationFormatted,
            text: cleanTranscript || '(Nota de voz enviada)',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);

        if (cleanTranscript) {
            executeSuperAgentPipeline(cleanTranscript);
        } else {
            setTimeout(() => {
                const replyText = `🎙️ He recibido tu nota de voz (${durationFormatted}). Puedes dictarme una instrucción con el micrófono o escribirla.`;
                setMessages(prev => [...prev, {
                    id: `bot-${Date.now()}`,
                    role: 'copilot',
                    text: replyText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                speakText(replyText);
            }, 600);
        }
    };

    // Process User Text Command
    const handleSendText = () => {
        if (!input.trim() || isThinking) return;
        const text = input.trim();
        setInput('');
        setShowSlashMenu(false);

        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        // Quick check for /limpiar
        if (text === '/limpiar') {
            clearOpenclawChat();
            return;
        }

        const userMsg = {
            id: `msg-${Date.now()}`,
            role: 'user',
            type: 'text',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        executeSuperAgentPipeline(text);
    };

    // Unified OpenClaw Super Agent Execution Pipeline (Same as Console + Gemini 3.6 Flash)
    const executeSuperAgentPipeline = async (rawQuery) => {
        setIsThinking(true);
        const q = rawQuery.toLowerCase().trim();

        // ─── Direct Local Navigation Interceptor ───
        const navMap = [
            { pattern: /eventos|proyectos y eventos/, path: '/eventos', name: 'Proyectos & Eventos' },
            { pattern: /workspace|timeline|kanban/, path: '/workspace', name: 'Workspace 2.0' },
            { pattern: /calendario|calendar/, path: '/calendar', name: 'Master Calendar' },
            { pattern: /portfolio|portafolio/, path: '/portfolio', name: 'Portfolio OS' },
            { pattern: /contactos|promotores|modelos|chicas/, path: '/contactos', name: 'Contactos & Promotores' },
            { pattern: /social|redes|instagram/, path: '/social', name: 'Redes Sociales' },
            { pattern: /whatsapp|difusi[oó]n/, path: '/whatsapp-agent', name: 'Agente WhatsApp' },
            { pattern: /cerebro|brain|consola|openclaw/, path: '/agent-brain', name: 'Consola OpenClaw' },
            { pattern: /home|inicio|dashboard|command center/, path: '/', name: 'Command Center' }
        ];

        const navMatch = navMap.find(item => item.pattern.test(q) && (q.includes('ir') || q.includes('lleva') || q.includes('abre') || q.includes('ver')));
        if (navMatch) {
            navigate(navMatch.path);
            const reply = `🚀 **Navegando a:** [${navMatch.name}](${navMatch.path})\n\nSección cargada en pantalla. ¿Qué acción deseas realizar aquí?`;
            setMessages(prev => [...prev, {
                id: `bot-${Date.now()}`,
                role: 'copilot',
                text: reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            speakText(`Abriendo ${navMatch.name}`);
            setIsThinking(false);
            return;
        }

        try {
            // Call the unified OpenClaw Super Agent service (hits /api/openclaw/chat with Gemini 3.6 Flash)
            const result = await OpenClawBrainService.sendCommand(
                rawQuery,
                messages,
                `Modo actual del agente: ${currentModeObj.name}.`,
                'Actúa como OpenClaw Super Agent, orquestador autónomo maestro del Command Center.',
                'default',
                selectedMode,
                { addTask, toggleTask }
            );

            const replyText = result.reply || 'Acción procesada por OpenClaw Super Agent.';
            const modelTag = result.provider ? `\n\n*(🧠 ${result.provider})*` : '';

            setMessages(prev => [...prev, {
                id: `bot-${Date.now()}`,
                role: 'copilot',
                text: replyText + modelTag,
                executedTools: result.executedTools,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            speakText(replyText);

        } catch (err) {
            console.error('[DashboardCopilot] Error execution:', err);
            setMessages(prev => [...prev, {
                id: `bot-${Date.now()}`,
                role: 'copilot',
                text: `⚠️ Error procesando comando con OpenClaw: ${err.message}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleQuickAction = (text) => {
        setInput(text);
        executeSuperAgentPipeline(text);
    };

    return (
        <div className="dashboard-copilot-container" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
            {/* FLOATING TRIGGER BUTTON */}
            {!isOpen && (
                <button
                    onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                    className="copilot-fab-button"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 18px',
                        borderRadius: 30,
                        background: 'linear-gradient(135deg, #7c5cfc 0%, #3b82f6 50%, #06b6d4 100%)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 8px 32px rgba(124, 92, 252, 0.45), 0 0 15px rgba(6, 182, 212, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={22} />
                        <span style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: geminiStatus.active ? '#38bdf8' : '#10b981',
                            boxShadow: geminiStatus.active ? '0 0 8px #38bdf8' : '0 0 8px #10b981'
                        }} />
                    </div>
                    <span>OpenClaw Agent</span>
                    <span style={{
                        fontSize: '0.65rem',
                        background: 'rgba(0, 0, 0, 0.35)',
                        padding: '2px 7px',
                        borderRadius: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {geminiStatus.active ? 'Gemini 3.6' : 'RAG'}
                    </span>
                </button>
            )}

            {/* EXPANDED COPILOT PANEL */}
            {isOpen && (
                <div
                    className="copilot-window"
                    style={{
                        width: 'min(430px, calc(100vw - 32px))',
                        height: isMinimized ? '60px' : 'min(640px, calc(100vh - 100px))',
                        background: 'rgba(17, 17, 26, 0.95)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: 18,
                        border: '1px solid rgba(124, 92, 252, 0.3)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 30px rgba(124, 92, 252, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* TOP HEADER */}
                    <div
                        style={{
                            padding: '10px 14px',
                            background: 'rgba(26, 26, 46, 0.9)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #7c5cfc, #06b6d4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                boxShadow: '0 0 12px rgba(124, 92, 252, 0.4)'
                            }}>
                                <Bot size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f0f0f5', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    OpenClaw Super Agent
                                    <span style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: geminiStatus.active ? '#38bdf8' : '#10b981',
                                        boxShadow: geminiStatus.active ? '0 0 6px #38bdf8' : '0 0 6px #10b981'
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#8888a0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{currentModeObj.name}</span>
                                    <span>•</span>
                                    <span style={{ color: geminiStatus.active ? '#38bdf8' : '#a78bfa' }}>
                                        {geminiStatus.active ? '✨ Gemini 3.6 Flash' : 'Modo Local RAG'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {/* Gemini Config Icon Button */}
                            <button
                                onClick={() => setShowGeminiModal(true)}
                                title="Configurar API Key de Gemini"
                                style={{
                                    background: geminiStatus.active ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                    border: 'none',
                                    color: geminiStatus.active ? '#38bdf8' : '#8888a0',
                                    padding: 6,
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                }}
                            >
                                <Key size={16} />
                            </button>

                            {/* TTS Voice Toggle */}
                            <button
                                onClick={() => setTtsEnabled(!ttsEnabled)}
                                title={ttsEnabled ? 'Voz activada' : 'Voz desactivada'}
                                style={{
                                    background: ttsEnabled ? 'rgba(124, 92, 252, 0.25)' : 'transparent',
                                    border: 'none',
                                    color: ttsEnabled ? '#a78bfa' : '#8888a0',
                                    padding: 6,
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                }}
                            >
                                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>

                            {/* Minimize */}
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#8888a0',
                                    padding: 6,
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                }}
                            >
                                <ChevronDown size={17} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>

                            {/* Close */}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#8888a0',
                                    padding: 6,
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={17} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* MODES & GEMINI BAR */}
                            <div style={{
                                padding: '6px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(10, 10, 15, 0.65)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                fontSize: '0.74rem'
                            }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {OPENCLAW_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setSelectedMode(mode.id)}
                                            style={{
                                                background: selectedMode === mode.id ? `${mode.color}33` : 'transparent',
                                                border: selectedMode === mode.id ? `1px solid ${mode.color}66` : '1px solid transparent',
                                                color: selectedMode === mode.id ? '#fff' : '#8888a0',
                                                borderRadius: 6,
                                                padding: '2px 7px',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            {mode.name.split(' ')[0]} {mode.name.split(' ')[1]}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowGeminiModal(true)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: geminiStatus.active ? '#38bdf8' : '#8888a0',
                                        cursor: 'pointer',
                                        fontSize: '0.68rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                >
                                    <Sparkles size={12} />
                                    {geminiStatus.active ? 'Gemini Activo' : '+ Conectar Gemini'}
                                </button>
                            </div>

                            {/* CHAT MESSAGES BODY */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            maxWidth: '100%'
                                        }}
                                    >
                                        {/* Message Bubble */}
                                        <div
                                            style={{
                                                maxWidth: '88%',
                                                padding: '10px 14px',
                                                borderRadius: 14,
                                                fontSize: '0.86rem',
                                                lineHeight: '1.45',
                                                background: msg.role === 'user'
                                                    ? 'linear-gradient(135deg, #7c5cfc, #5b3ce6)'
                                                    : 'rgba(26, 26, 42, 0.85)',
                                                color: '#f0f0f5',
                                                border: msg.role === 'user'
                                                    ? '1px solid rgba(255, 255, 255, 0.15)'
                                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                                boxShadow: msg.role === 'user'
                                                    ? '0 4px 14px rgba(124, 92, 252, 0.25)'
                                                    : '0 4px 12px rgba(0, 0, 0, 0.3)'
                                            }}
                                        >
                                            {/* Audio Note Player */}
                                            {msg.type === 'voice_note' && (
                                                <div style={{ marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.75rem', color: '#e0e0ff' }}>
                                                        <Sparkles size={13} />
                                                        <span>Nota de voz ({msg.duration})</span>
                                                    </div>
                                                    <audio
                                                        controls
                                                        src={msg.audioUrl}
                                                        style={{ width: '100%', height: 32, outline: 'none' }}
                                                    />
                                                </div>
                                            )}

                                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                                {msg.text}
                                            </div>

                                            {/* Executed Tools Badge */}
                                            {msg.executedTools && msg.executedTools.length > 0 && (
                                                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {msg.executedTools.map((t, i) => (
                                                        <span
                                                            key={i}
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                padding: '2px 6px',
                                                                borderRadius: 6,
                                                                background: 'rgba(16, 185, 129, 0.2)',
                                                                color: '#34d399',
                                                                border: '1px solid rgba(16, 185, 129, 0.4)'
                                                            }}
                                                        >
                                                            ✓ {t.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <span style={{ fontSize: '0.68rem', color: '#666680', marginTop: 3, padding: '0 4px' }}>
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                ))}

                                {isThinking && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8888a0', fontSize: '0.8rem', padding: '6px 12px' }}>
                                        <div style={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: '50%',
                                            border: '2px solid #7c5cfc',
                                            borderTopColor: 'transparent',
                                            animation: 'spin 0.8s linear infinite'
                                        }} />
                                        <span>OpenClaw Super Agent procesando...</span>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>

                            {/* RECORDING LIVE OVERLAY */}
                            {isRecordingNote && (
                                <div style={{
                                    padding: '10px 14px',
                                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.25), rgba(124, 92, 252, 0.25))',
                                    borderTop: '1px solid rgba(239, 68, 68, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            background: '#ef4444',
                                            boxShadow: '0 0 10px #ef4444',
                                            animation: 'pulse 1s infinite'
                                        }} />
                                        <span style={{ fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>
                                            Grabando nota ({Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={cancelVoiceNoteRecording}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: 8,
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: 'none',
                                                color: '#e5e7eb',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={stopVoiceNoteRecording}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: 8,
                                                background: '#10b981',
                                                border: 'none',
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
                                            }}
                                        >
                                            Enviar y Procesar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SLASH COMMANDS AUTOCOMPLETE POPUP */}
                            {showSlashMenu && (
                                <div style={{
                                    padding: '6px',
                                    background: 'rgba(20, 20, 32, 0.98)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4
                                }}>
                                    {SLASH_COMMANDS.map((cmd) => (
                                        <button
                                            key={cmd.command}
                                            onClick={() => {
                                                setInput(cmd.command + ' ');
                                                setShowSlashMenu(false);
                                            }}
                                            style={{
                                                textAlign: 'left',
                                                padding: '5px 8px',
                                                borderRadius: 6,
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#e0e0ff',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 92, 252, 0.2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span style={{ fontWeight: 600, color: '#a78bfa' }}>{cmd.label}</span>
                                            <span style={{ color: '#8888a0', fontSize: '0.7rem' }}>{cmd.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* INPUT & CONTROLS FOOTER */}
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(20, 20, 32, 0.9)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 14,
                                    padding: '4px 8px',
                                    border: isListening ? '1px solid #7c5cfc' : '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    {/* Mic Dictation Button (Free Speech-to-Text) */}
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        title={isListening ? 'Detener dictado' : 'Dictar por voz gratis'}
                                        style={{
                                            background: isListening ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                                            border: 'none',
                                            color: isListening ? '#f87171' : '#a0a0b8',
                                            padding: 6,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                    </button>

                                    {/* Record Voice Note Button */}
                                    <button
                                        type="button"
                                        onClick={startVoiceNoteRecording}
                                        disabled={isRecordingNote}
                                        title="Grabar y mandar Nota de Voz gratis"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#a0a0b8',
                                            padding: 6,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#a0a0b8'}
                                    >
                                        <Sparkles size={17} />
                                    </button>

                                    {/* Text Input */}
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setInput(val);
                                            setShowSlashMenu(val === '/');
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSendText();
                                            }
                                        }}
                                        placeholder={isListening ? 'Escuchando tu voz...' : 'Escribe o dicta (/ para comandos)...'}
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#f0f0f5',
                                            fontSize: '0.86rem',
                                            outline: 'none',
                                            padding: '6px 4px'
                                        }}
                                    />

                                    {/* Send Button */}
                                    <button
                                        type="button"
                                        onClick={handleSendText}
                                        disabled={!input.trim()}
                                        style={{
                                            background: input.trim() ? '#7c5cfc' : 'rgba(255, 255, 255, 0.08)',
                                            border: 'none',
                                            color: input.trim() ? '#fff' : '#666',
                                            padding: 6,
                                            borderRadius: 8,
                                            cursor: input.trim() ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 6,
                                    padding: '0 4px',
                                    fontSize: '0.67rem',
                                    color: '#666680'
                                }}>
                                    <span>🎤 Voz & Notas Gratis</span>
                                    <span>{geminiStatus.active ? '✨ Gemini 3.6 Flash' : 'OpenClaw RAG Engine'}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* GEMINI CONFIG MODAL */}
                    {showGeminiModal && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(10, 10, 15, 0.96)',
                            backdropFilter: 'blur(10px)',
                            padding: '18px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Key size={20} style={{ color: '#38bdf8' }} />
                                    <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>Configurar Gemini 3.6 Flash</h4>
                                </div>
                                <button
                                    onClick={() => setShowGeminiModal(false)}
                                    style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p style={{ fontSize: '0.78rem', color: '#a0a0b8', marginBottom: 12, lineHeight: 1.4 }}>
                                Ingresa tu API Key de Google Gemini para activar el razonamiento de última generación (**Gemini 3.6 Flash**). El agente orquestará tus eventos, tareas y RAG con la máxima velocidad e inteligencia.
                            </p>

                            <form onSubmit={handleSaveGeminiKey}>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#8888a0', marginBottom: 6 }}>
                                        GEMINI API KEY
                                    </label>
                                    <input
                                        type="password"
                                        value={geminiKeyInput}
                                        onChange={e => setGeminiKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            color: '#fff',
                                            fontSize: '0.85rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowGeminiModal(false)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            background: 'transparent',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            color: '#ccc',
                                            fontSize: '0.78rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            background: '#38bdf8',
                                            border: 'none',
                                            color: '#0a0a0f',
                                            fontWeight: 700,
                                            fontSize: '0.78rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Guardar & Activar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
