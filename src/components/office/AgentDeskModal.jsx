import React, { useState } from 'react';
import {
    X, Sparkles, Send, CheckSquare, BrainCircuit, Wrench,
    Activity, BarChart3, Sliders, Save, MessageSquare,
    ExternalLink, FileText, Play, Copy, Check
} from 'lucide-react';
import { playOfficeClick, playOfficeTyping, playOfficeSuccess } from '../../lib/officeAudio';
import './AiOffice.css';

export default function AgentDeskModal({
    agent,
    onClose,
    onUpdateStatus,
    tasks = [],
    activity = [],
    documents = [],
    onSendMessage,
    onCreateDocument,
    models,
    stats,
    onSaveConfig,
    onOpenTask
}) {
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
    const [selectedModel, setSelectedModel] = useState(agent?.model || models?.defaultModel || '');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Documents State
    const [isCreatingDoc, setIsCreatingDoc] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [docType, setDocType] = useState('script');
    const [docContent, setDocContent] = useState('');
    const [isSavingDoc, setIsSavingDoc] = useState(false);
    const [selectedDocPreview, setSelectedDocPreview] = useState(null);
    const [copiedDoc, setCopiedDoc] = useState(false);

    if (!agent) return null;

    const agentTasks = tasks.filter(t =>
        t.assignedAgentId === agent.id ||
        (t.assignedAgent && t.assignedAgent.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()))
    );

    const agentActivity = activity.filter(a =>
        a.agent === agent.name ||
        (a.text && a.text.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()))
    );

    const agentDocs = (documents || []).filter(d =>
        d.agentId === agent.id ||
        d.authorId === agent.id ||
        (d.agentName && d.agentName.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()))
    );

    const handleSendChat = async (e) => {
        e?.preventDefault();
        if (!chatInput.trim() || isThinking) return;

        const userText = chatInput.trim();
        playOfficeClick();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userText, time: 'Ahora' }]);
        setIsThinking(true);

        try {
            playOfficeTyping();
            if (onSendMessage) {
                const response = await onSendMessage(agent, userText);
                playOfficeTyping();
                setChatMessages(prev => [...prev, {
                    role: 'agent',
                    text: response || 'Entendido. Estoy coordinando con BART (COO) para procesar tu solicitud.',
                    time: 'Ahora'
                }]);
            }
        } catch (err) {
            setChatMessages(prev => [...prev, {
                role: 'agent',
                text: `Error al procesar: ${err.message}`,
                time: 'Ahora'
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleSaveDoc = async () => {
        if (!docTitle.trim() || !docContent.trim() || isSavingDoc) return;
        setIsSavingDoc(true);
        playOfficeClick();
        try {
            if (onCreateDocument) {
                await onCreateDocument(agent.id, {
                    title: docTitle.trim(),
                    type: docType,
                    content: docContent.trim(),
                    company: agent.activeCompany || 'ARRIVE Agency'
                });
            }
            playOfficeSuccess();
            setDocTitle('');
            setDocContent('');
            setIsCreatingDoc(false);
        } catch (err) {
            console.error('Error saving document:', err);
        } finally {
            setIsSavingDoc(false);
        }
    };

    const handleCopyDoc = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedDoc(true);
        setTimeout(() => setCopiedDoc(false), 2000);
    };

    const handleSaveSettings = async () => {
        setSaveError('');
        try {
            if (onSaveConfig && selectedModel !== agent.model) await onSaveConfig(agent.id, { model: selectedModel });
            if (onUpdateStatus) onUpdateStatus(agent.id, { autonomyLevel });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
            setSaveError(err.message);
        }
    };
    const chosenModel = models?.models?.find(m => m.id === selectedModel);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Sparkles },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'tasks', label: `Tareas (${agentTasks.length})`, icon: CheckSquare },
        { id: 'documents', label: `Documentos (${agentDocs.length})`, icon: FileText },
        { id: 'memory', label: 'Memoria & RAG', icon: BrainCircuit },
        { id: 'tools', label: 'Tools', icon: Wrench },
        { id: 'activity', label: 'Actividad', icon: Activity },
        { id: 'performance', label: 'Rendimiento', icon: BarChart3 },
        { id: 'settings', label: 'Configuración', icon: Sliders }
    ];

    return (
        <div className="office-modal-backdrop" onClick={onClose}>
            <div className="office-modal-frame" onClick={(e) => e.stopPropagation()}>
                {/* MODAL HEADER */}
                <div className="office-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px'
                        }}>
                            {agent.avatar || '🤖'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                                    {agent.name}
                                </h2>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    padding: '3px 9px',
                                    borderRadius: '20px',
                                    background: agent.status === 'executing' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                    color: agent.status === 'executing' ? '#60a5fa' : '#34d399',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    {agent.status || 'available'}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    color: '#94a3b8',
                                    fontFamily: 'monospace',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                }}>
                                    Nivel {agent.autonomyLevel || 2}
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                {agent.role} · Estación: {agent.stationId || 'HQ Central'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '10px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* MODAL TABS */}
                <div className="office-modal-tabs">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`office-tab-btn ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* MODAL CONTENT */}
                <div className="office-modal-content">
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Status Switcher */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>
                                    Cambiar Estado Operativo:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {[
                                        { id: 'available', label: 'Disponible' },
                                        { id: 'planning', label: 'Planificando' },
                                        { id: 'executing', label: 'Ejecutando' },
                                        { id: 'in_meeting', label: 'En War Room' },
                                        { id: 'resting', label: 'En Reposo' },
                                        { id: 'offline', label: 'Desconectado' }
                                    ].map(st => (
                                        <button
                                            key={st.id}
                                            onClick={() => onUpdateStatus && onUpdateStatus(agent.id, { status: st.id })}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: agent.status === st.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                                border: agent.status === st.id ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                color: '#ffffff',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {st.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active Mission */}
                            <div style={{ background: 'radial-gradient(circle at 10% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 80%), rgba(255, 255, 255, 0.02)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '16px', padding: '18px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#60a5fa' }}>Foco o Misión Actual</span>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: '6px 0 4px 0' }}>
                                    {agent.currentTaskName || 'Disponible para recibir instrucciones del CEO o de BART (COO)'}
                                </h3>
                                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                                    Empresa activa: <strong style={{ color: '#ffffff' }}>{agent.activeCompany || 'ARRIVE Agency'}</strong>
                                </p>
                            </div>

                            {/* Skills List */}
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Skills Asignadas</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {(agent.skills || ['orchestration', 'rag_synthesis', 'task_execution']).map((skill, i) => (
                                        <span key={i} style={{ fontSize: '11.5px', background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '4px 10px', borderRadius: '8px', fontFamily: 'monospace' }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Key Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Tareas Hechas</span>
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>{stats?.done ?? 0}</div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Tasa de Éxito</span>
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>{stats?.successRate == null ? '—' : `${stats.successRate}%`}</div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Tiempo medio</span>
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>{stats?.avgMs == null ? '—' : `${(stats.avgMs / 1000).toFixed(1)} s`}</div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Tokens</span>
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>{(((stats?.tokensIn || 0) + (stats?.tokensOut || 0)) / 1000).toFixed(1)}k</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CHAT */}
                    {activeTab === 'chat' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '460px' }}>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            maxWidth: '85%',
                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: msg.role === 'user' ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            flexShrink: 0
                                        }}>
                                            {msg.role === 'user' ? '👑' : agent.avatar || '🤖'}
                                        </div>
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '16px',
                                            fontSize: '12.5px',
                                            lineHeight: 1.5,
                                            background: msg.role === 'user' ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
                                            border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff'
                                        }}>
                                            {msg.text}
                                            <span style={{ display: 'block', fontSize: '9px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                                                {msg.time}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div style={{ display: 'flex', gap: '10px', maxWidth: '85%' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {agent.avatar || '🤖'}
                                        </div>
                                        <div style={{ padding: '12px 16px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sparkles size={14} />
                                            <span>{agent.name} está pensando con RAG...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`Escribe una instrucción directa para ${agent.name}...`}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        fontSize: '12.5px',
                                        color: '#ffffff',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim() || isThinking}
                                    style={{
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '10px 18px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Send size={14} />
                                    <span>Enviar</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 3: TASKS */}
                    {activeTab === 'tasks' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {agentTasks.length === 0 ? (
                                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '30px' }}>
                                    No hay tareas registradas para este agente.
                                </p>
                            ) : (
                                agentTasks.map(t => {
                                    let moduleLink = '/workspace';
                                    let moduleName = 'Workspace';
                                    const taskText = (t.task || t.title || '').toLowerCase();
                                    if (agent.departmentId === 'dept-creative' || taskText.includes('guion') || taskText.includes('video') || taskText.includes('contenido')) {
                                        moduleLink = '/content-hub';
                                        moduleName = 'Content Hub';
                                    } else if (agent.departmentId === 'dept-community' || taskText.includes('difusión') || taskText.includes('whatsapp') || taskText.includes('mensaje')) {
                                        moduleLink = '/difusion';
                                        moduleName = 'Centro de Difusión';
                                    }

                                    const taskProgress = t.progress !== undefined ? t.progress : (t.status === 'done' ? 100 : 35);

                                    return (
                                        <div key={t.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>{t.task || t.title}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        background: t.status === 'done' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                        color: t.status === 'done' ? '#34d399' : '#60a5fa',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {t.status}
                                                    </span>
                                                    <a
                                                        href={moduleLink}
                                                        onClick={() => { playOfficeClick(); onClose(); }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11px',
                                                            color: '#38bdf8',
                                                            textDecoration: 'none',
                                                            background: 'rgba(56, 189, 248, 0.1)',
                                                            padding: '4px 9px',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        <span>Ver en {moduleName}</span>
                                                        <ExternalLink size={11} />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Progress Bar & Current Step */}
                                            <div style={{ marginTop: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                                    <span><strong>Paso actual:</strong> {t.currentStep || 'En proceso de ejecución...'}</span>
                                                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{taskProgress}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${taskProgress}%`, height: '100%', background: t.status === 'done' ? '#10b981' : '#38bdf8', transition: 'width 0.3s' }} />
                                                </div>
                                            </div>

                                            {/* Action Buttons for Advancing & Approving */}
                                            {t.status !== 'done' && (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                    <button className="occ-btn sm primary" onClick={() => onOpenTask && onOpenTask(t)}>
                                                        <Play size={12} />
                                                        <span>{t.status === 'review' ? 'Revisar entrega' : 'Abrir tarea'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDocTitle(`Entregable: ${t.task || t.title}`);
                                                            setActiveTab('documents');
                                                            setIsCreatingDoc(true);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                                            color: '#cbd5e1',
                                                            padding: '5px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '11.5px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <FileText size={12} />
                                                        <span>Crear Documento</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB 4: DOCUMENTS */}
                    {activeTab === 'documents' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                                        Documentos & Entregables de {agent.name.split(' ')[0]}
                                    </h4>
                                    <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                                        Archivos generados en BrainVault y conectados a la base de conocimiento RAG.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreatingDoc(!isCreatingDoc)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '8px 14px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FileText size={14} />
                                    <span>{isCreatingDoc ? 'Cerrar Editor' : '+ Crear Documento'}</span>
                                </button>
                            </div>

                            {/* Inline Document Composer */}
                            {isCreatingDoc && (
                                <div style={{ background: '#0a0d14', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            placeholder="Título del documento (ej: Guion TikTok #1, Checklist Apertura...)"
                                            value={docTitle}
                                            onChange={(e) => setDocTitle(e.target.value)}
                                            style={{
                                                flex: 1,
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '10px',
                                                padding: '10px 14px',
                                                color: '#ffffff',
                                                fontSize: '13px'
                                            }}
                                        />
                                        <select
                                            value={docType}
                                            onChange={(e) => setDocType(e.target.value)}
                                            style={{
                                                background: '#0e131f',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                color: '#ffffff',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <option value="script">🎬 Guion de Video (Script)</option>
                                            <option value="brief">✨ Estrategia / Brief</option>
                                            <option value="sop">📦 Checklist / SOP</option>
                                            <option value="copy">📱 Copy de Difusión</option>
                                            <option value="report">📊 Reporte de Inteligencia</option>
                                        </select>
                                    </div>

                                    <textarea
                                        rows={7}
                                        placeholder="Escribe o pega el contenido en formato Markdown..."
                                        value={docContent}
                                        onChange={(e) => setDocContent(e.target.value)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '10px',
                                            padding: '12px',
                                            color: '#f8fafc',
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                            lineHeight: 1.5,
                                            resize: 'vertical'
                                        }}
                                    />

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button
                                            onClick={() => setIsCreatingDoc(false)}
                                            style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveDoc}
                                            disabled={!docTitle.trim() || !docContent.trim() || isSavingDoc}
                                            style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Save size={14} />
                                            <span>{isSavingDoc ? 'Guardando...' : 'Publicar Documento'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Documents List */}
                            {agentDocs.length === 0 ? (
                                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
                                    <FileText size={32} style={{ color: '#64748b', margin: '0 auto 8px auto', display: 'block' }} />
                                    <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, fontWeight: '600' }}>
                                        Este agente aún no ha publicado documentos.
                                    </p>
                                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                                        Usa el botón "+ Crear Documento" para registrar guiones, minutas o SOPs.
                                    </p>
                                </div>
                            ) : (
                                agentDocs.map(doc => (
                                    <div key={doc.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{doc.title}</span>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', fontWeight: '700' }}>
                                                    {doc.type || 'DOC'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '6px 0 0 0', maxHeight: '42px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {doc.content.substring(0, 140)}...
                                            </p>
                                            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '8px' }}>
                                                Creado el {new Date(doc.createdAt).toLocaleDateString()} a las {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedDocPreview(doc)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                color: '#ffffff',
                                                borderRadius: '8px',
                                                padding: '6px 12px',
                                                fontSize: '11.5px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Ver Documento
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB 5: MEMORY */}
                    {activeTab === 'memory' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px 0' }}>Memoria Semántica & Contexto</h4>
                                <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                                    Este agente consulta el RAG embebido y los documentos de <code>BrainVault/OPERATIONS/</code> y <code>BrainVault/ARSENAL/</code>.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: TOOLS */}
                    {activeTab === 'tools' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                            {(agent.tools || ['rag_search', 'browser_exec', 'db_write']).map((tool, i) => (
                                <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace' }}>{tool}</span>
                                    <span style={{ fontSize: '10px', color: '#34d399', fontWeight: '700' }}>ACTIVO</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 6: ACTIVITY */}
                    {activeTab === 'activity' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {agentActivity.length === 0 ? (
                                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '30px' }}>
                                    Sin eventos recientes registrados.
                                </p>
                            ) : (
                                agentActivity.map((act, i) => (
                                    <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#cbd5e1' }}>{act.text}</span>
                                        <span style={{ color: '#64748b', fontSize: '10.5px' }}>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB 7: PERFORMANCE */}
                    {activeTab === 'performance' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '18px', borderRadius: '14px' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Hechas / Fallidas</span>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>{stats?.done ?? 0} / {stats?.failed ?? 0}</div>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '18px', borderRadius: '14px' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Gasto estimado</span>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa', marginTop: '6px' }}>${(stats?.costUSD ?? 0).toFixed(4)}</div>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{stats?.runs ?? 0} corridas · {stats?.review ?? 0} por revisar</span>
                            </div>
                        </div>
                    )}

                    {/* TAB 8: SETTINGS */}
                    {activeTab === 'settings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                                    Modelo LLM Asignado:
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: '#0a0e17',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        fontSize: '12.5px',
                                        color: '#ffffff'
                                    }}
                                >
                                    {(models?.providers || []).map(p => (
                                        <optgroup key={p.id} label={`${p.label}${p.enabled ? '' : ` — falta ${p.env}`}`}>
                                            {(models?.models || []).filter(m => m.provider === p.id).map(m => (
                                                <option key={m.id} value={m.id} disabled={!m.enabled && m.id !== agent.model}>{m.label} · {m.use}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                {chosenModel && !chosenModel.enabled && (
                                    <div className="occ-notice" style={{ marginTop: '8px' }}>Este modelo no tiene llave en .env: las tareas de {agent.name} quedarán en cola hasta que la agregues.</div>
                                )}
                                <p style={{ fontSize: '11.5px', color: '#64748b', margin: '8px 0 0' }}>
                                    Las tareas que le asignes y el chat de su cabina corren con este modelo.
                                </p>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>Nivel de Autonomía:</label>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa' }}>Nivel {autonomyLevel}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    value={autonomyLevel}
                                    onChange={(e) => setAutonomyLevel(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: '#2563eb' }}
                                />
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                style={{
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Save size={15} />
                                <span>{saveSuccess ? '¡Guardado Correctamente!' : 'Guardar Configuración'}</span>
                            </button>
                            {saveError && <div className="occ-notice">{saveError}</div>}
                        </div>
                    )}
                </div>
            </div>

            {/* FULL DOCUMENT PREVIEW MODAL */}
            {selectedDocPreview && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10001,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                    onClick={() => setSelectedDocPreview(null)}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '720px',
                            maxHeight: '80vh',
                            background: '#0a0d15',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: '#0e1320' }}>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0 }}>{selectedDocPreview.title}</h3>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Autor: {selectedDocPreview.agentName || agent.name} · {selectedDocPreview.type?.toUpperCase()}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => handleCopyDoc(selectedDocPreview.content)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#ffffff',
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {copiedDoc ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                                    <span>{copiedDoc ? 'Copiado' : 'Copiar'}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedDocPreview(null)}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontSize: '13px', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {selectedDocPreview.content}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
