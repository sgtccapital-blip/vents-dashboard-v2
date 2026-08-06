import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import NativeBrainService from '../services/NativeBrainService';
import RagIndexer from '../services/RagIndexer';
import { useAutopilotEngine } from '../hooks/useAutopilotEngine';
import ReactMarkdown from 'react-markdown';
import {
    Bot, Send, Sparkles, Database, UploadCloud, FolderSync,
    BrainCircuit, CheckCircle2, AlertCircle, RefreshCw, Zap,
    Play, Square, Activity, Terminal, Trash2, ArrowRight, Settings, X
} from 'lucide-react';

export default function AgentBrain() {
    const appContext = useApp();
    const { refreshData, activityFeed, addActivity } = appContext;

    // --- Tab State ---
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'telemetry' | 'rag' | 'skills'

    // --- Chat State ---
    const [messages, setMessages] = useState([
        { id: '1', role: 'bot', text: 'Hola. Soy la Inteligencia OpenClaw del Dashboard. ¿Qué deseas orquestar hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef(null);

    // --- Telemetry & Autopilot State ---
    const [apiOnline, setApiOnline] = useState(false);
    const { autopilotActive, toggleAutopilot } = useAutopilotEngine(apiOnline, addActivity);
    const [loadingAutopilot, setLoadingAutopilot] = useState(false);
    const [metrics, setMetrics] = useState({ agents: 0, projects: 0, completedTasks: 0 });

    // --- RAG State ---
    const [namespace, setNamespace] = useState('default');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [obsidianPath, setObsidianPath] = useState('');
    const [ragStatus, setRagStatus] = useState(null);

    // --- Settings State ---
    const [showApiModal, setShowApiModal] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');

    // --- Skills / Core Memory State ---
    const [systemRole, setSystemRole] = useState(() => localStorage.getItem('__openclaw_system_role') || 'Eres la Inteligencia OpenClaw del Dashboard Vents. Tu rol es ayudar al operador a orquestar eventos, leads y redes sociales.');
    const [agentSkills, setAgentSkills] = useState(() => localStorage.getItem('__openclaw_agent_skills') || '');

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    // Load Telemetry & Status
    const loadTelemetry = async () => {
        try {
            // Check health natively
            const isConfigured = NativeBrainService.isConfigured();
            setApiOnline(isConfigured);

            if (isConfigured) {
                // Fetch Metrics & Counts (Mocked for Native)
                setMetrics({
                    agents: 1,
                    projects: 4,
                    completedTasks: 12
                });
            }
        } catch (err) {
            console.error('Error fetching telemetry:', err);
        }
    };

    useEffect(() => {
        loadTelemetry();
        const interval = setInterval(loadTelemetry, 10000);
        return () => clearInterval(interval);
    }, []);

    // --- Handlers ---
    const buildLiveIntel = () => {
        const intel = {
            events: appContext.events?.map(e => ({ name: e.name, date: e.date, status: e.status, priority: e.priority, kpi: e.kpi })),
            tasks: appContext.tasks?.filter(t => !t.done).map(t => ({ task: t.text, priority: t.priority })),
            orders: appContext.orders?.map(o => ({ id: o.id, amount: o.amount, status: o.status })),
            socialMedia: appContext.socialMedia?.map(s => ({ platform: s.platform, handle: s.handle, followers: s.followers }))
        };
        return `[DASHBOARD EN VIVO]:\n${JSON.stringify(intel, null, 2)}`;
    };

    const handleSendChat = async () => {
        if (!input.trim() || isThinking) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
        setIsThinking(true);

        try {
            const dynamicContext = `${systemRole}\n\n[SKILLS/REGLAS ASIGNADAS]:\n${agentSkills}\n\n${buildLiveIntel()}`;
            const contextCallbacks = {
                addTask: appContext.addTask,
                addEvent: appContext.addEvent,
                addActivity: appContext.addActivity
            };
            const reply = await NativeBrainService.sendCommand(userText, messages, dynamicContext, namespace, contextCallbacks);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: reply
            }]);
            if (refreshData) refreshData();
        } catch (err) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: `⚠️ Error de LLM Nativo: ${err.message}`
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleToggleAutopilot = () => {
        setLoadingAutopilot(true);
        toggleAutopilot();
        setTimeout(() => setLoadingAutopilot(false), 500);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setRagStatus(null);

        try {
            const res = await RagIndexer.processFile(selectedFile, namespace);
            if (res.success) {
                setRagStatus({ type: 'success', msg: `Documento "${selectedFile.name}" indexado localmente en "${namespace}"` });
                setSelectedFile(null);
                if (refreshData) refreshData();
            }
        } catch (err) {
            setRagStatus({ type: 'error', msg: err.message || 'Fallo en la carga del archivo.' });
        }
        setUploading(false);
    };

    const handleSyncObsidian = async () => {
        setUploading(true);
        setRagStatus(null);
        setTimeout(() => {
            setRagStatus({ type: 'error', msg: 'Sincronización de carpetas no disponible en modo nativo de navegador sin File System Access API avanzado.' });
            setUploading(false);
        }, 1000);
    };

    const handleIndexBrain = async () => {
        setUploading(true);
        setRagStatus(null);
        try {
            await RagIndexer.clearNamespace(namespace);
            setRagStatus({ type: 'success', msg: `Índice borrado para el namespace "${namespace}". Sube archivos de nuevo.` });
        } catch (err) {
            setRagStatus({ type: 'error', msg: err.message });
        }
        setUploading(false);
    };

    return (
        <div style={{ padding: '30px', color: 'var(--text-primary)', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-canvas)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BrainCircuit size={28} style={{ color: 'var(--accent-primary)' }} />
                        Consola IA & Cerebro RAG
                    </h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14.5px' }}>
                        Orquestación central y gestión de la base de conocimientos unificada de OpenClaw.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        className="btn btn-ghost" 
                        onClick={() => { setTempApiKey(NativeBrainService.getApiKey()); setShowApiModal(true); }}
                        style={{ padding: '8px', color: 'var(--text-secondary)' }}
                    >
                        <Settings size={20} />
                    </button>
                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: apiOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: apiOnline ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: `1px solid ${apiOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: apiOnline ? 'var(--accent-green)' : 'var(--accent-red)',
                            boxShadow: apiOnline ? '0 0 8px var(--accent-green)' : 'none'
                        }} />
                        {apiOnline ? 'LLM CONECTADO' : 'LLM DESCONECTADO'}
                    </span>
                </div>
            </div>

            {/* API Settings Modal */}
            {showApiModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Configuración de IA (Nativo)</h3>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowApiModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Ingresa tu <strong>Google Gemini API Key</strong> para activar el agente nativo. Se guardará de forma segura en el almacenamiento local de tu navegador.
                            </p>
                            <div className="form-group">
                                <label>Gemini API Key</label>
                                <input 
                                    type="password" 
                                    className="form-input" 
                                    placeholder="AIzaSy..."
                                    value={tempApiKey}
                                    onChange={e => setTempApiKey(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowApiModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={() => {
                                NativeBrainService.setApiKey(tempApiKey);
                                loadTelemetry();
                                setShowApiModal(false);
                            }}>Guardar Llave</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="agent-tabs-container" style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <button
                    className={`btn ${activeTab === 'chat' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('chat')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'chat' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Terminal size={16} /> Chat del Agente
                </button>
                <button
                    onClick={() => setActiveTab('telemetry')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'telemetry' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Activity size={16} /> Telemetría & Autopilot
                </button>
                <button
                    onClick={() => setActiveTab('rag')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'rag' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Database size={16} /> Base de Conocimiento RAG
                </button>
                <button
                    onClick={() => setActiveTab('skills')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'skills' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Sparkles size={16} /> Core Memory & Skills
                </button>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                
                {/* 1. CHAT TAB */}
                {activeTab === 'chat' && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px', overflow: 'hidden', padding: 0 }}>
                        {/* Chat Header */}
                        <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bot size={20} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ fontWeight: 600, fontSize: '15px' }}>Terminal de Orquestación OpenClaw</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>localhost:18789</span>
                        </div>

                        {/* Message Box */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.1)' }}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {msg.role === 'user' ? 'OPERADOR' : 'OPENCLAW AGENT'}
                                    </div>
                                    <div style={{
                                        maxWidth: '75%',
                                        padding: '12px 18px',
                                        borderRadius: '12px',
                                        background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))' : 'rgba(255,255,255,0.04)',
                                        color: 'white',
                                        border: msg.role === 'bot' ? '1px solid var(--border-subtle)' : 'none',
                                        fontSize: '14.5px',
                                        lineHeight: '1.6'
                                    }}>
                                        {msg.role === 'bot' ? (
                                            <div style={{ background: 'transparent' }}>
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        ) : msg.text}
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>OPENCLAW AGENT</span>
                                    <div style={{
                                        padding: '12px 18px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <RefreshCw size={14} className="spin" /> Pensando y orquestando acciones...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Box */}
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                            {/* Prompt Chips */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                {[
                                    '⚡ Resumen de operaciones',
                                    '📊 Estado de eventos activos',
                                    '🔍 Consultar datos de RAG',
                                    '🤖 Tareas en Autopilot'
                                ].map((chip, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setInput(chip)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '20px',
                                            padding: '4px 12px',
                                            color: 'var(--text-secondary)',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontFamily: 'var(--font-mono)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '4px' }}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Escribe un comando para orquestar (ej. 'Crea una tarea para revisar leads')"
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px 16px', outline: 'none', fontSize: '15px' }}
                                    disabled={!apiOnline}
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={!input.trim() || isThinking || !apiOnline}
                                    style={{
                                        background: input.trim() && apiOnline ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        width: '44px',
                                        height: '44px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: input.trim() && apiOnline ? 'pointer' : 'not-allowed',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. TELEMETRY TAB */}
                {activeTab === 'telemetry' && (
                    <div className="agent-grid" style={{ gap: '24px' }}>
                        
                        {/* Auto-Pilot Controller */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Zap size={18} style={{ color: autopilotActive ? 'var(--accent-green)' : 'var(--text-secondary)' }} />
                                Backend Auto-Pilot Loop
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                                El motor de ejecución autónoma 24/7 de OpenClaw escanea y procesa tareas en segundo plano en la base de datos sin necesidad de intervención manual.
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <button
                                    className={`btn ${autopilotActive ? 'btn-danger' : 'btn-primary'}`}
                                    onClick={handleToggleAutopilot}
                                    disabled={loadingAutopilot || !apiOnline}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        background: autopilotActive ? 'var(--accent-red)' : 'var(--accent-green)',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {autopilotActive ? (
                                        <>
                                            <Square size={16} /> Apagar Autopilot
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} /> Encender Autopilot
                                        </>
                                    )}
                                </button>

                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: autopilotActive ? 'var(--accent-green)' : 'var(--accent-red)'
                                }}>
                                    ESTADO: {autopilotActive ? 'EJECUTÁNDOSE' : 'DETENIDO'}
                                </span>
                            </div>
                        </div>

                        {/* Metrics Widget */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
                                Métricas de Ejecución
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Agentes Activos</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)' }}>{metrics.agents}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Proyectos</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-purple)' }}>{metrics.projects}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Tareas Completadas</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-green)' }}>{metrics.completedTasks}</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Log */}
                        <div className="card" style={{ gridColumn: 'span 2', padding: '24px', maxHeight: '350px', overflowY: 'auto' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Terminal size={18} style={{ color: 'var(--accent-cyan)' }} />
                                Consola de Actividad del Agente
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'monospace', fontSize: '13px' }}>
                                {activityFeed && activityFeed.length > 0 ? (
                                    activityFeed.map((act) => (
                                        <div key={act.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                                            <span style={{ color: act.color || 'white' }}>{act.text}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                                        Sin registros de actividad recientes.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. RAG TAB */}
                {activeTab === 'rag' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Namespace settings */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BrainCircuit size={20} style={{ color: 'var(--accent-purple)' }} />
                                Aislamiento por Namespace (Base de Conocimiento)
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                                Selecciona el espacio lógico de aislamiento para tus documentos. Esto permite segmentar información confidencial de distintas marcas o empresas.
                            </p>
                            
                            <div className="form-group" style={{ maxWidth: '320px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>Namespace Activo</label>
                                <select
                                    className="form-control"
                                    value={namespace}
                                    onChange={(e) => setNamespace(e.target.value)}
                                    style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'white',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        width: '100%',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="default">Default / Global</option>
                                    <option value="sgtc">SGTC Capital</option>
                                    <option value="mupa">MUPA</option>
                                    <option value="novatech">NovaTech Solutions</option>
                                    <option value="goldenstar">Golden Star</option>
                                    <option value="metro">Metro Supply</option>
                                </select>
                            </div>
                        </div>

                        {/* Status notification */}
                        {ragStatus && (
                            <div style={{
                                padding: '14px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: ragStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color: ragStatus.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                                fontSize: '14.5px',
                                fontWeight: 500,
                                border: `1px solid ${ragStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                            }}>
                                {ragStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                {ragStatus.msg}
                            </div>
                        )}

                        {/* Processing Tools split */}
                        <div className="agent-grid" style={{ gap: '24px' }}>
                            
                            {/* Upload documents */}
                            <div className="card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-blue)' }}>
                                        <UploadCloud size={20} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '16px' }}>Indexar Archivos Locales</h4>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                                    Sube reportes, cotizaciones o manuales (PDF, TXT, MD, CSV) al namespace activo para alimentar el cerebro de IA de OpenClaw.
                                </p>
                                
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.md,.csv"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        style={{ display: 'block', width: '100%', fontSize: '13px', color: 'var(--text-secondary)' }}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={handleFileUpload}
                                    disabled={!selectedFile || uploading || !apiOnline}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                >
                                    {uploading ? <RefreshCw size={16} className="spin" /> : <UploadCloud size={16} />}
                                    Subir e Indexar
                                </button>
                            </div>

                            {/* Obsidian Sincronization */}
                            <div className="card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ background: 'rgba(6,182,212,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-cyan)' }}>
                                        <FolderSync size={20} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '16px' }}>Sincronizar Vault de Obsidian</h4>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                                    Ingresa la ruta absoluta a tu bóveda local de notas markdown en Obsidian para indexar todas tus notas de manera estructurada en Pinecone.
                                </p>

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <input
                                        type="text"
                                        value={obsidianPath}
                                        onChange={(e) => setObsidianPath(e.target.value)}
                                        placeholder="Ej. /Users/gg/Documents/MiObsidianVault"
                                        style={{
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'white',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            width: '100%',
                                            outline: 'none',
                                            fontSize: '13.5px'
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleSyncObsidian}
                                    disabled={!obsidianPath.trim() || uploading || !apiOnline}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        background: 'var(--accent-cyan)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {uploading ? <RefreshCw size={16} className="spin" /> : <FolderSync size={16} />}
                                    Sincronizar Notas
                                </button>
                            </div>

                        </div>

                        {/* Re-Index full database */}
                        <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Reconstruir Índice General</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    Fuerza la regeneración del índice Pinecone / base de conocimientos global del cerebro.
                                </p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={handleIndexBrain}
                                disabled={uploading || !apiOnline}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <RefreshCw size={14} className={uploading ? 'spin' : ''} />
                                Re-indexar
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. SKILLS & CORE MEMORY TAB */}
                {activeTab === 'skills' && (
                    <div className="agent-grid" style={{ gap: '24px' }}>
                        <div className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                                Core Memory & System Instructions
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                                Define la personalidad, el rol y las habilidades (skills) que quieres que el agente recuerde permanentemente. 
                                Esta información se guarda en tu navegador y se envía en cada mensaje para moldear el comportamiento del LLM.
                            </p>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Rol y Contexto Base (System Prompt)</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={systemRole}
                                    onChange={(e) => {
                                        setSystemRole(e.target.value);
                                        localStorage.setItem('__openclaw_system_role', e.target.value);
                                    }}
                                    placeholder="Ej. Eres el experto en finanzas de Vents. Habla en tono formal y directo."
                                    style={{
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)',
                                        color: 'white', padding: '12px', borderRadius: '8px', width: '100%', resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Habilidades Específicas (Skills / Rules)</label>
                                <textarea
                                    className="form-control"
                                    rows="6"
                                    value={agentSkills}
                                    onChange={(e) => {
                                        setAgentSkills(e.target.value);
                                        localStorage.setItem('__openclaw_agent_skills', e.target.value);
                                    }}
                                    placeholder="Ej.
1. Cuando te pidan un reporte, muéstralo siempre en una tabla.
2. Sabes que el evento 212 usa 3 promotoras siempre.
3. Analiza los costos en USD."
                                    style={{
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)',
                                        color: 'white', padding: '12px', borderRadius: '8px', width: '100%', resize: 'vertical',
                                        fontFamily: 'monospace', fontSize: '13px'
                                    }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--accent-blue)' }}>Inyección de Inteligencia en Vivo Activada</h4>
                                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                    El agente está leyendo secretamente los eventos, órdenes y tareas actuales del dashboard en tiempo real. 
                                    Pruébalo preguntándole <em>"¿qué tareas pendientes tengo?"</em> o <em>"Resume los eventos activos"</em>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
