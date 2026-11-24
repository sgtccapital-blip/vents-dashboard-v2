import React, { useState } from 'react';
import {
    X, Bot, Sparkles, Send, CheckSquare, BrainCircuit, Wrench,
    Activity, BarChart3, Sliders, CheckCircle2, AlertCircle, Clock,
    Layers, Building2, Play, Pause, RotateCcw, Shield, ExternalLink,
    Zap, Terminal, MessageSquare, Save, Users, FileText, ChevronRight
} from 'lucide-react';

export default function AgentDeskModal({
    agent,
    onClose,
    onUpdateStatus,
    tasks = [],
    activity = [],
    onExecuteTask,
    onSendMessage
}) {
    if (!agent) return null;

    const [activeTab, setActiveTab] = useState('overview');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        {
            role: 'agent',
            text: `Hola, soy ${agent.name}. Estoy a cargo de ${agent.role} en el departamento de ${agent.departmentId || 'Operaciones'}. ¿En qué te asisto hoy?`,
            time: 'Ahora'
        }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const [autonomyLevel, setAutonomyLevel] = useState(agent.autonomyLevel || 2);
    const [selectedModel, setSelectedModel] = useState(agent.model || 'gemini-2.5-flash');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Agent's tasks
    const agentTasks = tasks.filter(t =>
        t.assignedAgentId === agent.id ||
        (t.assignedAgent && t.assignedAgent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()))
    );

    // Agent's activity feed
    const agentActivity = activity.filter(a =>
        a.agent === agent.name ||
        (a.text && a.text.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()))
    );

    const handleSendChat = async (e) => {
        e?.preventDefault();
        if (!chatInput.trim() || isThinking) return;

        const userText = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userText, time: 'Ahora' }]);
        setIsThinking(true);

        try {
            if (onSendMessage) {
                const response = await onSendMessage(agent, userText);
                setChatMessages(prev => [...prev, {
                    role: 'agent',
                    text: response || 'Entendido. Estoy procesando la información con mi contexto de departamento.',
                    time: 'Ahora'
                }]);
            } else {
                // Fallback simulation/response
                setTimeout(() => {
                    setChatMessages(prev => [...prev, {
                        role: 'agent',
                        text: `He recibido tu indicación: "${userText}". Coordinaré con BART (COO) para alinear la ejecución.`,
                        time: 'Ahora'
                    }]);
                    setIsThinking(false);
                }, 800);
                return;
            }
        } catch (err) {
            setChatMessages(prev => [...prev, {
                role: 'agent',
                text: `Error al conectar con el modelo: ${err.message}`,
                time: 'Ahora'
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleSaveSettings = () => {
        if (onUpdateStatus) {
            onUpdateStatus(agent.id, {
                autonomyLevel,
                model: selectedModel
            });
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Sparkles },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'tasks', label: `Tareas (${agentTasks.length})`, icon: CheckSquare },
        { id: 'memory', label: 'Memoria & RAG', icon: BrainCircuit },
        { id: 'tools', label: 'Tools', icon: Wrench },
        { id: 'activity', label: 'Actividad', icon: Activity },
        { id: 'performance', label: 'Rendimiento', icon: BarChart3 },
        { id: 'settings', label: 'Configuración', icon: Sliders }
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0B0F17] border border-white/15 w-full max-w-4xl h-[85vh] max-h-[750px] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* MODAL HEADER */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-3xl shadow-inner">
                            {agent.avatar || '🤖'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-bold text-white tracking-wide">{agent.name}</h2>
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${
                                    agent.status === 'executing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    agent.status === 'waiting_approval' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                    agent.status === 'in_meeting' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}>
                                    {agent.status || 'available'}
                                </span>
                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                    Nivel {agent.autonomyLevel || 2}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{agent.role} · Estación: {agent.stationId || 'HQ Central'}</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex items-center gap-1 px-6 border-b border-white/10 bg-[#070A0F] overflow-x-auto scrollbar-none py-2">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                                    isActive
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* TAB CONTENT BODY */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Status Quick Switcher */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <label className="text-xs font-semibold text-gray-300 block mb-3 uppercase tracking-wider">
                                    Cambiar Estado Operativo:
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'available', label: 'Disponible', color: 'emerald' },
                                        { id: 'planning', label: 'Planificando', color: 'purple' },
                                        { id: 'executing', label: 'Ejecutando', color: 'blue' },
                                        { id: 'in_meeting', label: 'En War Room', color: 'violet' },
                                        { id: 'resting', label: 'En Reposo', color: 'indigo' },
                                        { id: 'offline', label: 'Desconectado', color: 'gray' }
                                    ].map(st => (
                                        <button
                                            key={st.id}
                                            onClick={() => onUpdateStatus && onUpdateStatus(agent.id, { status: st.id })}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                                                agent.status === st.id
                                                    ? 'bg-white/20 text-white border-white/40 shadow'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            {st.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active Mission Card */}
                            <div className="bg-gradient-to-br from-blue-950/30 to-purple-950/20 rounded-2xl p-5 border border-blue-500/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Misión o Foco Actual</span>
                                <h3 className="text-base font-semibold text-white mt-1">
                                    {agent.currentTaskName || 'Listo para recibir asignaciones de BART o del CEO'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Empresa activa: <strong className="text-gray-200">{agent.activeCompany || 'ARRIVE Agency'}</strong>
                                </p>
                            </div>

                            {/* Skills Grid */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">Skills Especializadas</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(agent.skills || ['orchestration', 'rag_synthesis', 'task_execution']).map((skill, i) => (
                                        <span key={i} className="text-xs bg-white/5 text-gray-300 border border-white/10 px-3 py-1 rounded-lg font-mono">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Key Stats Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase">Tareas Hechas</span>
                                    <p className="text-lg font-bold text-white mt-0.5">{agent.metrics?.tasksCompleted || 45}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase">Tasa de Éxito</span>
                                    <p className="text-lg font-bold text-emerald-400 mt-0.5">{agent.metrics?.successRate || 98}%</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase">Velocidad Promedio</span>
                                    <p className="text-lg font-bold text-blue-400 mt-0.5">{agent.metrics?.avgResponseTimeMs || 420} ms</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase">Tokens Usados</span>
                                    <p className="text-lg font-bold text-purple-400 mt-0.5">{((agent.metrics?.totalTokensConsumed || 50000) / 1000).toFixed(0)}k</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CHAT */}
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-[480px]">
                            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-3 max-w-[85%] ${
                                            msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                                            msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'
                                        }`}>
                                            {msg.role === 'user' ? '👑' : agent.avatar || '🤖'}
                                        </div>
                                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                                        }`}>
                                            {msg.text}
                                            <span className="block text-[9px] opacity-50 mt-1 text-right">{msg.time}</span>
                                        </div>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="flex gap-3 max-w-[85%]">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                                            {agent.avatar || '🤖'}
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-400 animate-pulse flex items-center gap-2">
                                            <Sparkles size={14} className="animate-spin" />
                                            <span>{agent.name} está razonando con RAG...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendChat} className="mt-4 pt-3 border-t border-white/10 flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`Escribe una instrucción directa para ${agent.name}...`}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim() || isThinking}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                                >
                                    <Send size={14} />
                                    <span>Enviar</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 3: TASKS */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-3">
                            {agentTasks.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <CheckSquare size={36} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">No hay tareas activas asignadas a este agente.</p>
                                </div>
                            ) : (
                                agentTasks.map(t => (
                                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-white">{t.task || t.title}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                                t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                            }`}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400">{t.description || t.currentStep}</p>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-white/5">
                                            <span>Score: {t.priorityScore || 5.0} · Nivel {t.autonomyLevel || 1}</span>
                                            <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Hoy'}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB 4: MEMORY */}
                    {activeTab === 'memory' && (
                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Memoria Contextual & Insights</h4>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Este agente consulta el namespace de RAG correspondiente a las operaciones de {agent.activeCompany || 'ARRIVE Agency'} y mantiene sincronización con <code>BrainVault/ARSENAL/</code>.
                                </p>
                            </div>
                            <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-2xl text-xs text-blue-300 flex items-start gap-2.5">
                                <BrainCircuit size={16} className="shrink-0 mt-0.5 text-blue-400" />
                                <div>
                                    <strong className="block font-semibold">Memoria de Trabajo Activa:</strong>
                                    <span>Conocimiento sobre venues (Terraplén Rooftop, Furia, Piano Bar), eventos y dinners VIP chicas.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: TOOLS */}
                    {activeTab === 'tools' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(agent.tools || ['rag_search', 'browser_exec', 'db_write']).map((tool, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Wrench size={16} className="text-blue-400" />
                                        <span className="text-xs font-mono text-gray-200">{tool}</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-400 font-bold">ACTIVO</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 6: ACTIVITY */}
                    {activeTab === 'activity' && (
                        <div className="space-y-2.5">
                            {agentActivity.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-8">Sin eventos registrados recientemente para este agente.</p>
                            ) : (
                                agentActivity.map((act, i) => (
                                    <div key={i} className="text-xs p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                                        <Activity size={14} className="text-blue-400 shrink-0" />
                                        <span className="text-gray-300 flex-1">{act.text}</span>
                                        <span className="text-[10px] text-gray-500 font-mono shrink-0">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB 7: PERFORMANCE */}
                    {activeTab === 'performance' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <span className="text-xs text-gray-400">Tasa de Conclusión Exitosa</span>
                                    <div className="text-2xl font-bold text-emerald-400 mt-1">98.5%</div>
                                    <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[98.5%]" />
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <span className="text-xs text-gray-400">Eficiencia de Tokens</span>
                                    <div className="text-2xl font-bold text-blue-400 mt-1">94.2%</div>
                                    <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-blue-500 h-full w-[94.2%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 8: SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-2">Modelo LLM Asignado:</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="gemini-2.5-flash" className="bg-[#0B0F17]">Gemini 2.5 Flash (Ultra Rápido & Razonamiento)</option>
                                    <option value="gemini-2.5-pro" className="bg-[#0B0F17]">Gemini 2.5 Pro (Máxima Complejidad & Profundidad)</option>
                                    <option value="gemini-3.5-flash-lite" className="bg-[#0B0F17]">Gemini 3.5 Flash Lite (Micro Tareas)</option>
                                    <option value="claude-3-7-sonnet" className="bg-[#0B0F17]">Claude 3.7 Sonnet (Orquestación & Código)</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-300">Nivel de Autonomía (1 a 4):</label>
                                    <span className="text-xs font-bold text-blue-400">Nivel {autonomyLevel}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    value={autonomyLevel}
                                    onChange={(e) => setAutonomyLevel(parseInt(e.target.value))}
                                    className="w-full accent-blue-500"
                                />
                                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                    <span>Nivel 1: Lectura/Drafts</span>
                                    <span>Nivel 2: Autónomo &lt; $500</span>
                                    <span>Nivel 3: Aprobación CEO</span>
                                    <span>Nivel 4: Crítico</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                            >
                                <Save size={14} />
                                <span>{saveSuccess ? '¡Guardado Correctamente!' : 'Guardar Configuración'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
