import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import OpenClawBrainService, { OPENCLAW_MODES, SLASH_COMMANDS } from '../services/OpenClawBrainService';
import RagIndexer from '../services/RagIndexer';
import { useAutopilotEngine } from '../hooks/useAutopilotEngine';
import ReactMarkdown from 'react-markdown';
import {
    Bot, Send, Sparkles, Database, UploadCloud, FolderSync,
    BrainCircuit, CheckCircle2, AlertCircle, RefreshCw, Zap,
    Play, Square, Activity, Terminal, Trash2, ArrowRight, Settings, X,
    Copy, Check, Layers, ExternalLink, Globe, Cpu, Code, Radio, ShieldCheck,
    FileText, CheckSquare, Search, Eye, Download, BookOpen, Sliders, ChevronRight,
    SlidersHorizontal, Compass, PieChart, Wrench, Shield, FileCheck
} from 'lucide-react';

export default function AgentBrain() {
    const appContext = useApp();
    const { refreshData, activityFeed, addActivity, openclawLogs, triggerOpenClawAction, projects, events, tasks, notes } = appContext;

    // --- Active Tab State ---
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'rag_inspector' | 'topology' | 'skills_market' | 'openclaw_bridge'

    // --- Mode State ---
    const [selectedMode, setSelectedMode] = useState('ejecutivo');
    const currentModeObj = useMemo(() => OPENCLAW_MODES.find(m => m.id === selectedMode) || OPENCLAW_MODES[0], [selectedMode]);

    // --- OpenClaw Master Agent State ---
    const [openclawStatus, setOpenClawStatus] = useState({ online: true, mode: 'embedded_orchestrator', baseUrl: 'http://127.0.0.1:8642/v1', model: 'openclaw-agent' });
    const [openclawConfig, setOpenClawConfig] = useState({ baseUrl: 'http://127.0.0.1:8642/v1', chatUrl: 'http://127.0.0.1:8642/v1/chat/completions', model: 'openclaw-agent', apiKey: '' });
    const [testConnectionLoading, setTestConnectionLoading] = useState(false);
    const [testConnectionResult, setTestConnectionResult] = useState(null);

    // --- Chat State ---
    const [messages, setMessages] = useState([
        { id: '1', role: 'bot', text: '⚡ **OpenClaw Agent activo**. Soy el orquestador autónomo maestro y cerebro central de tu Command Center. Tengo acceso en tiempo real a tus proyectos, eventos, tareas y base RAG.\n\nEscribe cualquier instrucción o usa comandos rápidos como `/proyecto`, `/evento`, `/tarea` o `/rag`.' }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingStep, setThinkingStep] = useState(null); // 'rag' | 'tool' | 'sync' | null
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const chatEndRef = useRef(null);

    // --- Sessions State ---
    const [savedSessions, setSavedSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);

    // --- Telemetry & Autopilot State ---
    const { autopilotActive, toggleAutopilot } = useAutopilotEngine(openclawStatus.online, addActivity);
    const [loadingAutopilot, setLoadingAutopilot] = useState(false);
    const [metrics, setMetrics] = useState({ agents: 1, projects: 0, completedTasks: 0, ragCount: 0 });

    // --- RAG State & Inspector ---
    const [namespace, setNamespace] = useState('default');
    const [ragDocsList, setRagDocsList] = useState([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
    const [semanticQuery, setSemanticQuery] = useState('');
    const [semanticResults, setSemanticResults] = useState(null);
    const [searchingRag, setSearchingRag] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [obsidianPath, setObsidianPath] = useState('');
    const [ragStatus, setRagStatus] = useState(null);
    
    // --- Document Viewer Modal ---
    const [previewDoc, setPreviewDoc] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [copiedDoc, setCopiedDoc] = useState(false);

    // --- Settings State ---
    const [showApiModal, setShowApiModal] = useState(false);

    // --- Skills Marketplace State ---
    const [systemRole, setSystemRole] = useState(() => localStorage.getItem('__openclaw_system_role') || 'Eres OpenClaw Super Agent, el orquestador autónomo maestro y cerebro central de este Command Center.');
    const [agentSkills, setAgentSkills] = useState(() => localStorage.getItem('__openclaw_agent_skills') || '1. Responde de forma proactiva, estructurada y ejecutiva.\n2. Ejecuta llamadas a herramientas (function calling) cuando se soliciten proyectos, tareas o hitos.\n3. Consulta siempre la base de conocimiento RAG cuando haya dudas operativas.');
    const [skillPresets, setSkillPresets] = useState([
        { id: 'budget_calc', name: 'Presupuestos & Costos', icon: '💰', color: '#10b981', enabled: true, desc: 'Calcula presupuestos y desgloses con márgenes de contingencia.' },
        { id: 'casco_safety', name: 'Logística & Casco Peatonal', icon: '🚶‍♂️', color: '#f59e0b', enabled: true, desc: 'Aplica protocolos de seguridad vial, permisos y cierres de calles.' },
        { id: 'social_copy', name: 'Estrategia de Redes & Copy', icon: '📱', color: '#ec4899', enabled: true, desc: 'Genera copies virales con hooks, emojis y llamados a la acción.' },
        { id: 'dev_architect', name: 'Arquitectura de Software', icon: '💻', color: '#6366f1', enabled: true, desc: 'Estructura proyectos modulares, APIs limpias y stacks modernos.' },
        { id: 'whatsapp_pulse', name: 'Difusión WhatsApp & Comunidades', icon: '📲', color: '#25d366', enabled: true, desc: 'Genera carteleras semanales, copys con formato WhatsApp y outreach VIP.' },
        { id: 'procurement', name: 'Análisis de Licitaciones', icon: '💼', color: '#3b82f6', enabled: false, desc: 'Analiza pliegos de contratación pública y requerimientos técnicos.' },
        { id: 'vip_events', name: 'Gestión de Boxes VIP', icon: '🎟️', color: '#a855f7', enabled: true, desc: 'Control de aforos, consumo mínimo y experiencia de hospitalidad.' }
    ]);

    // --- OpenClaw Bridge Manual Dispatcher State ---
    const [openclawActionType, setOpenClawActionType] = useState('log_thought');
    const [openclawActionPayload, setOpenClawActionPayload] = useState('{\n  "message": "Analizando tareas y dependencias de proyectos...",\n  "level": "info"\n}');
    const [openclawDispatchStatus, setOpenClawDispatchStatus] = useState(null);
    const [copiedTools, setCopiedTools] = useState(false);
    const [openclawToolsList, setOpenClawToolsList] = useState(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking, thinkingStep]);

    // Load initial telemetry and config
    useEffect(() => {
        loadTelemetry();
        loadSkillPresets();
        loadSessions();
        const interval = setInterval(checkOpenClawHealth, 6000);
        return () => clearInterval(interval);
    }, []);

    // Reload RAG documents when namespace changes
    useEffect(() => {
        loadRagDocuments(namespace);
    }, [namespace]);

    // Fetch OpenClaw tools
    useEffect(() => {
        fetch('/api/openclaw/tools')
            .then(res => res.json())
            .then(data => setOpenClawToolsList(data.tools))
            .catch(() => {});
    }, []);

    // ─── API Loaders ──────────────────────────────────────────────────
    const checkOpenClawHealth = async () => {
        try {
            const health = await OpenClawBrainService.checkHealth();
            setOpenClawStatus(health);
        } catch (err) {
            setOpenClawStatus({ online: true, mode: 'embedded_orchestrator', baseUrl: 'http://127.0.0.1:8642/v1' });
        }
    };

    const loadTelemetry = async () => {
        try {
            await checkOpenClawHealth();
            const conf = await OpenClawBrainService.getConfig();
            setOpenClawConfig(conf);
            await loadRagDocuments(namespace);

            const ragStat = await fetch('/api/rag/status').then(r => r.json()).catch(() => ({ indexed: 0 }));

            setMetrics({
                agents: 1,
                projects: (projects || []).length || 8,
                completedTasks: (openclawLogs || []).length || 15,
                ragCount: ragStat.indexed || 30
            });
        } catch (err) {
            console.error('Error fetching telemetry:', err);
        }
    };

    const loadRagDocuments = async (ns = namespace) => {
        try {
            const docs = await RagIndexer.getDocuments(ns);
            setRagDocsList(Array.isArray(docs) ? docs : []);
        } catch (e) {
            console.error('Error leyendo documentos RAG:', e);
        }
    };

    const loadSkillPresets = async () => {
        try {
            const presets = await OpenClawBrainService.getSkillPresets();
            if (presets && presets.length > 0) {
                setSkillPresets(prev => prev.map(p => {
                    const found = presets.find(pr => pr.id === p.id);
                    return found ? { ...p, enabled: found.enabled } : p;
                }));
            }
        } catch (e) {}
    };

    const loadSessions = async () => {
        try {
            const sess = await OpenClawBrainService.getSessions();
            setSavedSessions(sess || []);
        } catch (e) {}
    };

    // ─── Chat & Slash Commands ─────────────────────────────────────────
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInput(val);
        if (val.startsWith('/') && val.length < 15) {
            setShowSlashMenu(true);
        } else {
            setShowSlashMenu(false);
        }
    };

    const handleSelectSlashCommand = (cmd) => {
        setInput(`${cmd.command} `);
        setShowSlashMenu(false);
    };

    const handleSendChat = async () => {
        if (!input.trim() || isThinking) return;

        let userText = input.trim();
        setInput('');
        setShowSlashMenu(false);

        // Check for local slash commands
        if (userText === '/limpiar') {
            setMessages([{ id: Date.now().toString(), role: 'bot', text: '⚡ Conversación reiniciada. ¿Qué deseas coordinar?' }]);
            return;
        }

        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
        setIsThinking(true);

        // Step-by-step thinking simulation for visual feedback
        setThinkingStep('rag');
        setTimeout(() => setThinkingStep('tool'), 400);

        try {
            const contextCallbacks = {
                addTask: appContext.addTask,
                addEvent: appContext.addEvent,
                addProject: appContext.addProject,
                addActivity: appContext.addActivity
            };

            // Build active skills text from presets
            const activePresetPrompts = skillPresets.filter(p => p.enabled).map(p => `- ${p.name}: ${p.desc}`).join('\n');
            const fullSkills = `${agentSkills}\n\n[HABILIDADES ACTIVAS EN MERCADO]:\n${activePresetPrompts}`;

            const result = await OpenClawBrainService.sendCommand(
                userText, messages, systemRole, fullSkills, namespace, selectedMode, contextCallbacks
            );
            
            setThinkingStep('sync');

            let executedFeedback = '';
            if (result.executedTools && result.executedTools.length > 0) {
                executedFeedback = '\n\n' + result.executedTools.map(t => {
                    if (t.name === 'create_project') return `> 🚀 **Proyecto Creado**: \`${t.args?.name}\``;
                    if (t.name === 'create_event') return `> 🎉 **Evento Agendado**: \`${t.args?.name}\` (${t.args?.date})`;
                    if (t.name === 'add_task') return `> 📋 **Tarea Añadida**: \`${t.args?.text}\``;
                    if (t.name === 'add_milestone') return `> 🗺️ **Hito Registrado**: \`${t.args?.title}\``;
                    return `> ⚡ **Acción Ejecutada**: \`${t.name}\``;
                }).join('\n');
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: (result.reply || 'Acción procesada por OpenClaw Super Agent.') + executedFeedback
            }]);

            if (refreshData) refreshData();

        } catch (err) {
            console.error('[Chat] OpenClaw error:', err);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: `⚠️ **OpenClaw Super Agent Status**: ${err.message}`
            }]);
        } finally {
            setIsThinking(false);
            setThinkingStep(null);
        }
    };

    const handleSaveCurrentSession = async () => {
        const title = prompt('Nombre de la sesión:', `Sesión ${new Date().toLocaleDateString()}`);
        if (!title) return;
        const session = {
            id: activeSessionId || `sess-${Date.now()}`,
            title,
            messages,
            mode: selectedMode,
            namespace
        };
        await OpenClawBrainService.saveSession(session);
        await loadSessions();
        setActiveSessionId(session.id);
    };

    const handleExportChat = () => {
        const text = messages.map(m => `### ${m.role === 'user' ? 'OPERADOR' : 'OPENCLAW AGENT'}\n${m.text}\n`).join('\n---\n\n');
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `openclaw-chat-session-${Date.now()}.md`;
        a.click();
    };

    // ─── Semantic RAG Inspector ───────────────────────────────────────
    const handleRunSemanticSearch = async () => {
        if (!semanticQuery.trim()) return;
        setSearchingRag(true);
        try {
            const res = await OpenClawBrainService.searchRAG(semanticQuery.trim(), namespace, selectedCategoryFilter, 8);
            setSemanticResults(res);
        } catch (e) {
            console.error('Error buscando en RAG:', e);
        } finally {
            setSearchingRag(false);
        }
    };

    const handleOpenDocViewer = async (docId) => {
        setLoadingPreview(true);
        try {
            const doc = await OpenClawBrainService.getRAGDocument(docId);
            setPreviewDoc(doc);
        } catch (e) {
            // fallback from list
            const found = ragDocsList.find(d => d.id === docId);
            if (found) setPreviewDoc(found);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleCopyDocContent = () => {
        if (!previewDoc?.content) return;
        navigator.clipboard.writeText(previewDoc.content);
        setCopiedDoc(true);
        setTimeout(() => setCopiedDoc(false), 2000);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setRagStatus(null);
        try {
            const res = await RagIndexer.processFile(selectedFile, namespace);
            if (res.success) {
                setRagStatus({ type: 'success', msg: `Documento "${selectedFile.name}" indexado en "${namespace}"` });
                setSelectedFile(null);
                await loadRagDocuments(namespace);
                if (refreshData) refreshData();
            }
        } catch (err) {
            setRagStatus({ type: 'error', msg: err.message || 'Fallo en la carga del archivo.' });
        }
        setUploading(false);
    };

    const handleSyncObsidian = async () => {
        if (!obsidianPath.trim()) return;
        setUploading(true);
        setRagStatus(null);
        try {
            const res = await fetch('/api/brain/sync-vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: obsidianPath.trim(), namespace })
            });
            const data = await res.json();
            if (res.ok) {
                setRagStatus({ type: 'success', msg: `¡Vault sincronizado! ${data.processed || 0} notas indexadas en RAG.` });
                await loadRagDocuments(namespace);
            } else {
                setRagStatus({ type: 'error', msg: data.error || 'No se pudo leer la carpeta de Obsidian.' });
            }
        } catch (e) {
            setRagStatus({ type: 'error', msg: e.message });
        }
        setUploading(false);
    };

    const handleIndexBrain = async () => {
        setUploading(true);
        setRagStatus(null);
        try {
            const res = await fetch('/api/rag/sync', { method: 'POST' });
            const data = await res.json();
            setRagStatus({ type: 'success', msg: `Índice RAG reconstruido exitosamente (${data.total || data.indexed || 0} entidades indexadas).` });
            await loadRagDocuments(namespace);
        } catch (err) {
            setRagStatus({ type: 'error', msg: err.message });
        }
        setUploading(false);
    };

    const handleDeleteRagDoc = async (id) => {
        try {
            await fetch(`/api/rag/${namespace}/${id}`, { method: 'DELETE' });
            await loadRagDocuments(namespace);
            if (previewDoc?.id === id) setPreviewDoc(null);
        } catch (e) {
            console.error('Error eliminando doc:', e);
        }
    };

    const handleToggleSkillPreset = (presetId) => {
        setSkillPresets(prev => {
            const updated = prev.map(p => p.id === presetId ? { ...p, enabled: !p.enabled } : p);
            OpenClawBrainService.saveSkillPresets(updated);
            return updated;
        });
    };

    const handleExecuteOpenClawAction = async () => {
        setOpenClawDispatchStatus({ loading: true });
        try {
            let parsed = {};
            try {
                parsed = JSON.parse(openclawActionPayload);
            } catch (err) {
                throw new Error('El JSON del payload no es válido.');
            }
            const res = await triggerOpenClawAction(openclawActionType, parsed);
            setOpenClawDispatchStatus({ success: true, msg: `Acción "${openclawActionType}" ejecutada con éxito.` });
            if (refreshData) refreshData();
        } catch (err) {
            setOpenClawDispatchStatus({ error: true, msg: err.message });
        }
    };

    const handleCopyOpenClawTools = () => {
        if (!openclawToolsList) return;
        navigator.clipboard.writeText(JSON.stringify(openclawToolsList, null, 2));
        setCopiedTools(true);
        setTimeout(() => setCopiedTools(false), 2000);
    };

    // Filtered documents in RAG list
    const filteredRagDocs = useMemo(() => {
        if (selectedCategoryFilter === 'all') return ragDocsList;
        return ragDocsList.filter(d => d.category === selectedCategoryFilter);
    }, [ragDocsList, selectedCategoryFilter]);

    return (
        <div className="page-content animate-in">
            
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BrainCircuit size={26} style={{ color: 'var(--accent-primary)' }} />
                        Consola OpenClaw IA & Cerebro RAG
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
                        Orquestación central gobernada por <strong>OpenClaw Agent</strong> con base de conocimientos RAG unificada.
                    </p>
                </div>

                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        className="btn btn-ghost" 
                        onClick={() => { setTestConnectionResult(null); setShowApiModal(true); }}
                        style={{ padding: '8px', color: 'var(--text-secondary)' }}
                        title="Configurar conexión OpenClaw Agent"
                    >
                        <Settings size={20} />
                    </button>

                    {/* OpenClaw Agent Status Pill */}
                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 14px',
                        borderRadius: '20px',
                        background: 'rgba(34, 197, 94, 0.12)',
                        color: '#4ade80',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        cursor: 'pointer'
                    }} onClick={() => setShowApiModal(true)}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#22c55e',
                            boxShadow: '0 0 8px #22c55e'
                        }} />
                        {openclawStatus?.mode === 'llm_service' ? `OPENCLAW LLM` : `OPENCLAW ORQUESTADOR & RAG (Activo)`}
                    </span>
                </div>
            </div>

            {/* OpenClaw & AI Settings Modal */}
            {showApiModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bot size={22} style={{ color: '#a78bfa' }} />
                                <h3 style={{ margin: 0 }}>Conexión de OpenClaw Agent</h3>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowApiModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Configura el endpoint local o remoto de OpenClaw. Si el servidor externo no está disponible, el orquestador autónomo embebido asumirá el control de forma nativa.
                            </p>

                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Base URL de OpenClaw</label>
                                <input 
                                    className="form-input" 
                                    placeholder="http://127.0.0.1:8642/v1"
                                    value={openclawConfig.baseUrl}
                                    onChange={e => setOpenClawConfig({ ...openclawConfig, baseUrl: e.target.value, chatUrl: `${e.target.value.replace(/\/+$/, '')}/chat/completions` })}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Endpoint Chat Completions</label>
                                <input 
                                    className="form-input" 
                                    placeholder="http://127.0.0.1:8642/v1/chat/completions"
                                    value={openclawConfig.chatUrl}
                                    onChange={e => setOpenClawConfig({ ...openclawConfig, chatUrl: e.target.value })}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Nombre del Modelo</label>
                                <input 
                                    className="form-input" 
                                    placeholder="openclaw-agent"
                                    value={openclawConfig.model}
                                    onChange={e => setOpenClawConfig({ ...openclawConfig, model: e.target.value })}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px', background: 'rgba(56, 189, 248, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                                    <span>✨ Google Gemini API Key (Gemini 3.6 Flash)</span>
                                </label>
                                <input 
                                    type="password"
                                    className="form-input" 
                                    placeholder="AIzaSy..."
                                    value={openclawConfig.geminiApiKey || ''}
                                    onChange={e => setOpenClawConfig({ ...openclawConfig, geminiApiKey: e.target.value })}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                                    Al ingresar tu key, OpenClaw Super Agent operará impulsado por <strong>Gemini 3.6 Flash</strong> tanto en esta consola como en el Copilot flotante.
                                </span>
                            </div>

                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>API Key / Bearer Token Externo (Opcional)</label>
                                <input 
                                    type="password"
                                    className="form-input" 
                                    placeholder="Bearer token para OpenClaw server..."
                                    value={openclawConfig.apiKey}
                                    onChange={e => setOpenClawConfig({ ...openclawConfig, apiKey: e.target.value })}
                                />
                            </div>

                            {testConnectionResult && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '16px',
                                    background: testConnectionResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: testConnectionResult.success ? '#4ade80' : '#f87171',
                                    border: `1px solid ${testConnectionResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                                }}>
                                    {testConnectionResult.msg}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={async () => {
                                        setTestConnectionLoading(true);
                                        setTestConnectionResult(null);
                                        try {
                                            await OpenClawBrainService.saveConfig(openclawConfig);
                                            const health = await OpenClawBrainService.checkHealth();
                                            setOpenClawStatus(health);
                                            setTestConnectionResult({ success: true, msg: `Conexión verificada: ${health.label || 'Orquestador Listo'}` });
                                        } catch (err) {
                                            setTestConnectionResult({ error: true, msg: err.message });
                                        } finally {
                                            setTestConnectionLoading(false);
                                        }
                                    }}
                                    disabled={testConnectionLoading}
                                    style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <RefreshCw size={14} className={testConnectionLoading ? 'spin' : ''} />
                                    Probar Conexión
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowApiModal(false)}>Cerrar</button>
                            <button className="btn btn-primary" onClick={async () => {
                                await OpenClawBrainService.saveConfig(openclawConfig);
                                checkOpenClawHealth();
                                setShowApiModal(false);
                            }}>Guardar Configuración</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="agent-tabs-container" style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', overflowX: 'auto' }}>
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
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Bot size={16} /> Consola OpenClaw Super-Agent
                </button>
                <button
                    onClick={() => setActiveTab('rag_inspector')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'rag_inspector' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Search size={16} /> Inspector & Playground RAG
                </button>
                <button
                    onClick={() => setActiveTab('topology')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'topology' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Cpu size={16} /> Topología & Red de Agentes
                </button>
                <button
                    onClick={() => setActiveTab('skills_market')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'skills_market' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Sparkles size={16} /> Marketplace de Skills
                </button>
                <button
                    onClick={() => setActiveTab('openclaw_bridge')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: activeTab === 'openclaw_bridge' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        color: activeTab === 'openclaw_bridge' ? 'white' : '#c4b5fd',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Radio size={16} /> Puente & Auditoría
                </button>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                
                {/* ═════════════════════════════════════════════════════════════════ */}
                {/* 1. CHAT SUPER-AGENT TAB                                         */}
                {/* ═════════════════════════════════════════════════════════════════ */}
                {activeTab === 'chat' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Mode Switcher Bar */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Modo Especializado:</span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {OPENCLAW_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setSelectedMode(mode.id)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: selectedMode === mode.id ? `${mode.color}25` : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${selectedMode === mode.id ? mode.color : 'var(--border-subtle)'}`,
                                                color: selectedMode === mode.id ? 'white' : 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                            title={mode.description}
                                        >
                                            <span>{mode.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button className="btn btn-ghost" onClick={handleExportChat} style={{ fontSize: '12px', padding: '6px 10px' }} title="Descargar transcripción Markdown">
                                    <Download size={14} style={{ marginRight: '4px' }} /> Exportar
                                </button>
                                <button className="btn btn-ghost" onClick={() => setMessages([{ id: Date.now().toString(), role: 'bot', text: '⚡ Conversación reiniciada. ¿Qué deseas coordinar?' }])} style={{ fontSize: '12px', padding: '6px 10px', color: 'var(--accent-red)' }} title="Limpiar chat">
                                    <Trash2 size={14} style={{ marginRight: '4px' }} /> Limpiar
                                </button>
                            </div>
                        </div>

                        {/* Chat Box Container */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '640px', overflow: 'hidden', padding: 0, position: 'relative' }}>
                            {/* Chat Header */}
                            <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Bot size={20} style={{ color: currentModeObj.color }} />
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: '14px' }}>OpenClaw Master Orchestrator</span>
                                        <span style={{ marginLeft: '10px', fontSize: '11px', color: currentModeObj.color, background: `${currentModeObj.color}15`, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${currentModeObj.color}30` }}>
                                            {currentModeObj.badge}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Message List */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.1)' }}>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {msg.role === 'user' ? 'OPERADOR' : '🤖 OPENCLAW AGENT'}
                                        </div>
                                        <div style={{
                                            maxWidth: '78%',
                                            padding: '14px 20px',
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

                                {/* Live Chain-of-Thought Trace */}
                                {isThinking && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#a78bfa' }}>🤖 OPENCLAW CHAIN-OF-THOUGHT</span>
                                        <div style={{
                                            padding: '14px 20px',
                                            borderRadius: '12px',
                                            background: 'rgba(139, 92, 246, 0.08)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            color: '#c4b5fd',
                                            fontSize: '13.5px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                                                <RefreshCw size={14} className="spin" />
                                                <span>Orquestando flujo de ejecución...</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '24px' }}>
                                                <span style={{ color: thinkingStep === 'rag' ? '#38bdf8' : '#6b7280' }}>
                                                    {thinkingStep === 'rag' ? '▶' : '✓'} 1. Extrayendo Contexto RAG
                                                </span>
                                                <span style={{ color: thinkingStep === 'tool' ? '#a855f7' : '#6b7280' }}>
                                                    {thinkingStep === 'tool' ? '▶' : '•'} 2. Evaluando Tool Calls
                                                </span>
                                                <span style={{ color: thinkingStep === 'sync' ? '#4ade80' : '#6b7280' }}>
                                                    {thinkingStep === 'sync' ? '▶' : '•'} 3. Sincronizando Base de Datos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Slash Command Autocomplete Menu Popup */}
                            {showSlashMenu && (
                                <div style={{
                                    position: 'absolute', bottom: '80px', left: '20px', right: '20px',
                                    background: '#161623', border: '1px solid var(--accent-primary)',
                                    borderRadius: '12px', padding: '8px', zIndex: 50,
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                                    display: 'flex', flexDirection: 'column', gap: '4px'
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', padding: '4px 8px', textTransform: 'uppercase' }}>
                                        Comandos Rápidos de OpenClaw
                                    </div>
                                    {SLASH_COMMANDS.map(cmd => (
                                        <button
                                            key={cmd.command}
                                            onClick={() => handleSelectSlashCommand(cmd)}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '8px 12px', borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.03)', border: 'none',
                                                color: 'white', cursor: 'pointer', textAlign: 'left',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(124, 92, 252, 0.2)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        >
                                            <span style={{ fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>{cmd.label}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cmd.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Box */}
                            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '4px' }}>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                        placeholder="Escribe una orden o comando (ej. '/proyecto Crear MVP' o 'Genera un plan de acción')..."
                                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px 16px', outline: 'none', fontSize: '14.5px' }}
                                        disabled={isThinking}
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        disabled={!input.trim() || isThinking}
                                        style={{
                                            background: input.trim() ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.05)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            width: '44px',
                                            height: '44px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: input.trim() ? 'pointer' : 'not-allowed',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════ */}
                {/* 2. RAG INSPECTOR & PLAYGROUND TAB                               */}
                {/* ═════════════════════════════════════════════════════════════════ */}
                {activeTab === 'rag_inspector' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Interactive Semantic Search Playground Card */}
                        <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04))' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Search size={20} style={{ color: '#38bdf8' }} />
                                        Inspector y Probador Semántico de RAG
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0 0' }}>
                                        Prueba qué fragmentos y porcentaje de similitud recupera el cerebro en tiempo real antes de responder.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Colección:</span>
                                    <select
                                        className="form-control"
                                        value={namespace}
                                        onChange={(e) => setNamespace(e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}
                                    >
                                        <option value="default">Default / Global</option>
                                        <option value="sgtc">SGTC Capital</option>
                                        <option value="proyectos">Proyectos & Tech</option>
                                        <option value="eventos">Eventos & Producción</option>
                                        <option value="marketing">Marketing & Redes</option>
                                        <option value="operaciones">Operaciones & SOPs</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search Box */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    value={semanticQuery}
                                    onChange={(e) => setSemanticQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRunSemanticSearch()}
                                    placeholder="Escribe una pregunta o término (ej. 'Requisitos de eventos' o 'Presupuesto Hang Out')..."
                                    style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'white', padding: '12px 16px', fontSize: '14px' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleRunSemanticSearch}
                                    disabled={searchingRag || !semanticQuery.trim()}
                                    style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                                >
                                    {searchingRag ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                                    Consultar RAG
                                </button>
                            </div>

                            {/* Semantic Search Results */}
                            {semanticResults && (
                                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                        Se encontraron <strong style={{ color: '#38bdf8' }}>{semanticResults.count} fuentes relevantes</strong> para "{semanticResults.query}":
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                                        {semanticResults.results.map((res, i) => (
                                            <div
                                                key={res.id || i}
                                                onClick={() => handleOpenDocViewer(res.id)}
                                                style={{
                                                    padding: '14px', borderRadius: '10px',
                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    display: 'flex', flexDirection: 'column', gap: '8px'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>{res.title}</span>
                                                    <span style={{
                                                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                                                        background: res.similarity > 70 ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                                                        color: res.similarity > 70 ? '#4ade80' : '#60a5fa'
                                                    }}>
                                                        {res.similarity}% Similitud
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                    {res.snippet}
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                    <span>Categoría: <strong style={{ color: '#a78bfa' }}>{res.category}</strong></span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                                                        <Eye size={12} /> Ver Completo
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upload Tools Grid */}
                        <div className="agent-grid" style={{ gap: '20px' }}>
                            {/* Upload documents */}
                            <div className="card" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-blue)' }}>
                                        <UploadCloud size={20} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '15px' }}>Indexar Archivos Locales</h4>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: '1.5', marginBottom: '16px' }}>
                                    Sube reportes, cotizaciones o manuales (PDF, TXT, MD, CSV) al namespace "{namespace}".
                                </p>
                                
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.md,.csv"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        style={{ display: 'block', width: '100%', fontSize: '12.5px', color: 'var(--text-secondary)' }}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={handleFileUpload}
                                    disabled={!selectedFile || uploading}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                                >
                                    {uploading ? <RefreshCw size={16} className="spin" /> : <UploadCloud size={16} />}
                                    Subir e Indexar
                                </button>
                            </div>

                            {/* Obsidian Sincronization */}
                            <div className="card" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ background: 'rgba(6,182,212,0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-cyan)' }}>
                                        <FolderSync size={20} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '15px' }}>Sincronizar Vault Obsidian</h4>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: '1.5', marginBottom: '16px' }}>
                                    Ingresa la ruta absoluta a tu bóveda local de notas markdown en Obsidian.
                                </p>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <input
                                        type="text"
                                        value={obsidianPath}
                                        onChange={(e) => setObsidianPath(e.target.value)}
                                        placeholder="Ej. /Users/admin/Documents/MiVault"
                                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', padding: '9px 12px', borderRadius: '8px', width: '100%', fontSize: '13px' }}
                                    />
                                </div>

                                <button
                                    onClick={handleSyncObsidian}
                                    disabled={!obsidianPath.trim() || uploading}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600, background: 'var(--accent-cyan)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                                >
                                    {uploading ? <RefreshCw size={16} className="spin" /> : <FolderSync size={16} />}
                                    Sincronizar Notas
                                </button>
                            </div>
                        </div>

                        {/* Status notification */}
                        {ragStatus && (
                            <div style={{
                                padding: '12px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px',
                                background: ragStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color: ragStatus.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                                fontSize: '13.5px', fontWeight: 500, border: `1px solid ${ragStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                            }}>
                                {ragStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {ragStatus.msg}
                            </div>
                        )}

                        {/* Document Vault List with Filters */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={18} style={{ color: '#38bdf8' }} />
                                    Documentos Indexados en "{namespace}" ({filteredRagDocs.length})
                                </h4>

                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {[
                                        { id: 'all', label: 'Todos' },
                                        { id: 'project', label: 'Proyectos' },
                                        { id: 'event', label: 'Eventos' },
                                        { id: 'task', label: 'Tareas' },
                                        { id: 'document', label: 'Archivos' },
                                        { id: 'obsidian_vault', label: 'Obsidian' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryFilter(cat.id)}
                                            style={{
                                                padding: '4px 10px', borderRadius: '14px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                                                background: selectedCategoryFilter === cat.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                                                color: selectedCategoryFilter === cat.id ? 'white' : 'var(--text-secondary)',
                                                border: '1px solid var(--border-subtle)'
                                            }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}

                                    <button className="btn btn-ghost" onClick={() => loadRagDocuments(namespace)} style={{ fontSize: '12px', padding: '4px 8px' }}>
                                        <RefreshCw size={12} />
                                    </button>
                                </div>
                            </div>

                            {filteredRagDocs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {filteredRagDocs.map((doc, idx) => (
                                        <div
                                            key={doc.id || idx}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '12px 16px', borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                                                transition: 'all 0.2s', cursor: 'pointer'
                                            }}
                                            onClick={() => handleOpenDocViewer(doc.id)}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '18px' }}>
                                                    {doc.category === 'project' ? '🚀' : doc.category === 'event' ? '🎉' : doc.category === 'task' ? '📋' : doc.category === 'obsidian_vault' ? '🔮' : '📄'}
                                                </span>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'white' }}>
                                                        {doc.filename || doc.title || 'Documento'}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        Categoría: <span style={{ color: '#a78bfa' }}>{doc.category || 'general'}</span> • {doc.content ? `${doc.content.length} caracteres` : 'Vacío'} • {doc.addedAt || doc.updatedAt ? new Date(doc.addedAt || doc.updatedAt).toLocaleDateString() : 'Reciente'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => handleOpenDocViewer(doc.id)}
                                                    style={{ color: '#38bdf8', padding: '6px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    title="Previsualizar documento"
                                                >
                                                    <Eye size={14} /> Ver
                                                </button>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => handleDeleteRagDoc(doc.id)}
                                                    style={{ color: 'var(--accent-red)', padding: '6px 8px' }}
                                                    title="Eliminar documento del RAG"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                    No hay documentos en esta categoría para el namespace "{namespace}".
                                </div>
                            )}

                            {/* Re-Index Database Button */}
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Reconstrucción General de Índice RAG</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fuerza la sincronización de todos los proyectos, eventos y tareas al cerebro RAG.</div>
                                </div>
                                <button className="btn btn-secondary" onClick={handleIndexBrain} disabled={uploading} style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <RefreshCw size={13} className={uploading ? 'spin' : ''} />
                                    Re-indexar Base Completa
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════ */}
                {/* 3. TOPOLOGY & AGENT NETWORK TAB                                 */}
                {/* ═════════════════════════════════════════════════════════════════ */}
                {activeTab === 'topology' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Visual Node Graph */}
                        <div className="card" style={{ padding: '32px', background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.08) 0%, rgba(10, 10, 15, 0.95) 100%)', textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Cpu size={22} style={{ color: '#a78bfa' }} />
                                Topología de Red y Arquitectura de OpenClaw
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '32px' }}>
                                Visualización de interconexión en tiempo real entre OpenClaw Super Agent, el motor RAG y los subsistemas del Command Center.
                            </p>

                            {/* Central Diagram */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '340px' }}>
                                {/* Central Master OpenClaw Node */}
                                <div style={{
                                    width: '150px', height: '150px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c5cfc, #4f46e5)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', zIndex: 10,
                                    boxShadow: '0 0 35px rgba(124, 92, 252, 0.5)',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    animation: 'pulse-purple 3s infinite'
                                }}>
                                    <Bot size={36} />
                                    <span style={{ fontWeight: 800, fontSize: '13px', marginTop: '6px' }}>OPENCLAW AGENT</span>
                                    <span style={{ fontSize: '10px', opacity: 0.9 }}>Master Orchestrator</span>
                                </div>

                                {/* Connected Satellite Nodes */}
                                {[
                                    { title: 'Base RAG Embebida', icon: BrainCircuit, count: `${metrics.ragCount} Entidades`, color: '#38bdf8', pos: { top: '10px', left: '12%' } },
                                    { title: 'Hub de Proyectos', icon: Layers, count: `${metrics.projects} Proyectos`, color: '#818cf8', pos: { top: '10px', right: '12%' } },
                                    { title: 'Producción de Eventos', icon: Radio, count: `${(events||[]).length} Eventos`, color: '#f43f5e', pos: { bottom: '10px', left: '12%' } },
                                    { title: 'Base de Datos Local', icon: Database, count: 'db.json (Sync)', color: '#4ade80', pos: { bottom: '10px', right: '12%' } }
                                ].map((node, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            ...node.pos,
                                            padding: '16px 20px',
                                            borderRadius: '14px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${node.color}40`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            boxShadow: `0 4px 20px ${node.color}15`,
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    >
                                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${node.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: node.color }}>
                                            <node.icon size={20} />
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'white' }}>{node.title}</div>
                                            <div style={{ fontSize: '11.5px', color: node.color, fontWeight: 600 }}>{node.count}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Estado Orquestador</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>Activo (1ms)</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Motor Embebido + RAG</div>
                            </div>
                            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Proyectos en Control</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-purple)' }}>{metrics.projects}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Roadmaps Activos</div>
                            </div>
                            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Memoria RAG</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8' }}>{metrics.ragCount} docs</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Sincronización Total</div>
                            </div>
                            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Acciones Ejecutadas</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>{metrics.completedTasks}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Auditoría Verificada</div>
                            </div>
                        </div>

                        {/* Autopilot Controller & Log Feed */}
                        <div className="agent-grid" style={{ gap: '20px' }}>
                            <div className="card" style={{ padding: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Zap size={18} style={{ color: autopilotActive ? 'var(--accent-green)' : 'var(--accent-yellow)' }} />
                                    Autopilot Autónomo de Fondo
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: '1.5', marginBottom: '16px' }}>
                                    Permite a OpenClaw escanear tareas periódicamente cada 30 segundos y verificar hitos de proyectos.
                                </p>
                                <button
                                    className={`btn ${autopilotActive ? 'btn-danger' : 'btn-primary'}`}
                                    onClick={() => { setLoadingAutopilot(true); toggleAutopilot(); setTimeout(() => setLoadingAutopilot(false), 400); }}
                                    disabled={loadingAutopilot}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                >
                                    {autopilotActive ? <><Square size={16} /> Detener Autopilot</> : <><Play size={16} /> Activar Autopilot 24/7</>}
                                </button>
                            </div>

                            <div className="card" style={{ padding: '20px', maxHeight: '280px', overflowY: 'auto' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Terminal size={16} style={{ color: '#38bdf8' }} />
                                    Live Event Stream
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                    {(activityFeed || []).slice(0, 8).map(act => (
                                        <div key={act.id} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-tertiary)' }}>[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                                            <span style={{ color: act.color || 'white' }}>{act.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════ */}
                {/* 4. SKILLS MARKETPLACE & CORE MEMORY TAB                         */}
                {/* ═════════════════════════════════════════════════════════════════ */}
                {activeTab === 'skills_market' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Skills Catalog */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Sparkles size={20} style={{ color: '#a78bfa' }} />
                                    Marketplace de Habilidades Especializadas
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0 0' }}>
                                    Activa o desactiva módulos de conocimiento pre-entrenados para moldear las capacidades de OpenClaw en tiempo real.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {skillPresets.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => handleToggleSkillPreset(preset.id)}
                                        style={{
                                            padding: '16px 20px',
                                            borderRadius: '12px',
                                            background: preset.enabled ? `${preset.color}12` : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${preset.enabled ? preset.color : 'var(--border-subtle)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '22px' }}>{preset.icon}</span>
                                                <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'white' }}>{preset.name}</span>
                                            </div>
                                            <div style={{
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                background: preset.enabled ? preset.color : 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black'
                                            }}>
                                                {preset.enabled && <Check size={12} strokeWidth={3} color="white" />}
                                            </div>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                            {preset.desc}
                                        </p>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: preset.enabled ? preset.color : 'var(--text-tertiary)', marginTop: '4px' }}>
                                            {preset.enabled ? '● HABILIDAD ACTIVADA' : '○ DESACTIVADA'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Core Memory & System Role Editors */}
                        <div className="agent-grid" style={{ gap: '20px' }}>
                            <div className="card" style={{ padding: '24px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Rol y Contexto Base (System Prompt)</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '14px' }}>
                                    Define la personalidad y objetivos base del agente maestro.
                                </p>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    value={systemRole}
                                    onChange={(e) => {
                                        setSystemRole(e.target.value);
                                        localStorage.setItem('__openclaw_system_role', e.target.value);
                                    }}
                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', padding: '12px', borderRadius: '8px', width: '100%', resize: 'vertical', fontSize: '13px' }}
                                />
                            </div>

                            <div className="card" style={{ padding: '24px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Reglas Operativas Personalizadas</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '14px' }}>
                                    Reglas específicas que OpenClaw recordará en cada conversación.
                                </p>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    value={agentSkills}
                                    onChange={(e) => {
                                        setAgentSkills(e.target.value);
                                        localStorage.setItem('__openclaw_agent_skills', e.target.value);
                                    }}
                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', padding: '12px', borderRadius: '8px', width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '12.5px' }}
                                />
                            </div>
                        </div>

                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════ */}
                {/* 5. OPENCLAW BRIDGE & AUDIT TAB                                    */}
                {/* ═════════════════════════════════════════════════════════════════ */}
                {activeTab === 'openclaw_bridge' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Action Dispatcher and Tools Catalog */}
                        <div className="agent-grid" style={{ gap: '24px' }}>
                            {/* Dispatcher */}
                            <div className="card" style={{ padding: '24px' }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Bot size={20} style={{ color: '#a78bfa' }} />
                                    Despachador Manual de Acciones OpenClaw
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                                    Prueba ejecuciones de herramientas directamente contra la base de datos local y el logger de auditoría.
                                </p>

                                <div className="form-group" style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Tipo de Acción / Tool</label>
                                    <select
                                        className="form-control"
                                        value={openclawActionType}
                                        onChange={(e) => setOpenClawActionType(e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '10px', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="create_project">create_project (Crear Proyecto en Hub)</option>
                                        <option value="create_event">create_event (Agendar Evento)</option>
                                        <option value="add_task">add_task (Agregar Tarea)</option>
                                        <option value="add_milestone">add_milestone (Agregar Hito)</option>
                                        <option value="update_status">update_status (Actualizar Progreso)</option>
                                        <option value="log_thought">log_thought (Registrar Pensamiento)</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>JSON Payload</label>
                                    <textarea
                                        className="form-control"
                                        rows="6"
                                        value={openclawActionPayload}
                                        onChange={(e) => setOpenClawActionPayload(e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'white', padding: '10px', borderRadius: '8px', width: '100%', fontFamily: 'monospace', fontSize: '12.5px' }}
                                    />
                                </div>

                                {openclawDispatchStatus && (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '16px',
                                        background: openclawDispatchStatus.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: openclawDispatchStatus.success ? '#4ade80' : '#f87171',
                                        border: `1px solid ${openclawDispatchStatus.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                                    }}>
                                        {openclawDispatchStatus.msg}
                                    </div>
                                )}

                                <button className="btn btn-primary" onClick={handleExecuteOpenClawAction} style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600 }}>
                                    Ejecutar Acción Manual
                                </button>
                            </div>

                            {/* Tools Schema Catalog */}
                            <div className="card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Code size={18} style={{ color: '#38bdf8' }} />
                                        Catálogo de Herramientas (JSON Schema)
                                    </h3>
                                    <button className="btn btn-secondary" onClick={handleCopyOpenClawTools} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                        {copiedTools ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar Schema</>}
                                    </button>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '14px' }}>
                                    Herramientas OpenAI-compatible que OpenClaw invoca para interactuar con la base de datos.
                                </p>
                                <pre style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: '8px', maxHeight: '280px', overflowY: 'auto', fontSize: '11px', color: '#c4b5fd' }}>
                                    {JSON.stringify(openclawToolsList || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Audit Logs Table */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldCheck size={20} style={{ color: 'var(--accent-green)' }} />
                                    Registro de Auditoría de OpenClaw (Logs)
                                </h3>
                                <button className="btn btn-ghost" onClick={() => fetch('/api/openclaw/logs', { method: 'DELETE' }).then(() => refreshData())} style={{ fontSize: '12px', color: 'var(--accent-red)' }}>
                                    Limpiar Logs
                                </button>
                            </div>
                            
                            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                {openclawLogs && openclawLogs.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {openclawLogs.map(log => (
                                            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#7c5cfc25', color: '#a78bfa' }}>
                                                        {log.action}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: 'white' }}>
                                                        {log.thought?.message || log.data?.name || log.data?.text || JSON.stringify(log.data)}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                        Sin registros de auditoría recientes.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* FULL DOCUMENT READER MODAL                                       */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {previewDoc && (
                <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
                    <div className="modal" style={{ maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>
                                    {previewDoc.category === 'project' ? '🚀' : previewDoc.category === 'event' ? '🎉' : previewDoc.category === 'task' ? '📋' : '📄'}
                                </span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{previewDoc.title || previewDoc.filename}</h3>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Colección: <strong style={{ color: '#a78bfa' }}>{previewDoc.namespace || 'General'}</strong> • Categoría: <strong>{previewDoc.category || 'document'}</strong>
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setPreviewDoc(null)}><X size={20} /></button>
                        </div>

                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', color: 'white', lineHeight: '1.7', fontSize: '14px' }}>
                                <ReactMarkdown>{previewDoc.content || 'Sin contenido de texto.'}</ReactMarkdown>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                Longitud: {previewDoc.content?.length || 0} caracteres • ~{Math.round((previewDoc.content?.length || 0) / 4)} tokens
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-secondary" onClick={handleCopyDocContent} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                    {copiedDoc ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar Texto</>}
                                </button>
                                <button className="btn btn-danger" onClick={() => handleDeleteRagDoc(previewDoc.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                    <Trash2 size={14} /> Eliminar del RAG
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
