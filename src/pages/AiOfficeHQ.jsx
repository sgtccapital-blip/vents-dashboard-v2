import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import OfficeIsometricCanvas from '../components/office/OfficeIsometricCanvas';
import OfficeCommandBar from '../components/office/OfficeCommandBar';
import AgentDeskModal from '../components/office/AgentDeskModal';
import OfficeApprovalsModal from '../components/office/OfficeApprovalsModal';
import OfficeWarRoomModal from '../components/office/OfficeWarRoomModal';
import OfficeControlCenter from '../components/office/OfficeControlCenter';
import OfficeTaskDrawer from '../components/office/OfficeTaskDrawer';
import { uploadTaskFiles } from '../components/office/officeUi';
import OfficeMetricsView from '../components/office/OfficeMetricsView';
import { ConnectAgentModal, ExternalAgentModal } from '../components/office/OfficeAgentConnect';
import {
    Building2, Users, Layers, BarChart2, ShieldAlert, Sparkles,
    CheckCircle2, AlertCircle, Clock, Send, Play, Pause, ChevronRight,
    Briefcase, Activity, Terminal, ArrowRight, DollarSign, Radio, Flame,
    Inbox, FileText, Check, Copy, ExternalLink
} from 'lucide-react';
import { playOfficeClick, playOfficeSuccess, playOfficeAlert } from '../lib/officeAudio';
import '../components/office/AiOffice.css';

export default function AiOfficeHQ() {
    const appContext = useApp();
    const { addActivity } = appContext;

    // View mode: 'control' | 'office' | 'inbox' | 'strategic' | 'orgchart' | 'metrics' | 'approvals'
    const [viewMode, setViewMode] = useState('control');
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [selectedExternal, setSelectedExternal] = useState(null);
    const [isConnectOpen, setIsConnectOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [selectedDept, setSelectedDept] = useState('all');
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);
    const [isWarRoomOpen, setIsWarRoomOpen] = useState(false);
    const [isWarMode, setIsWarMode] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);

    // Live state from backend
    const [officeState, setOfficeState] = useState({
        agents: [],
        departments: [],
        rooms: [],
        activeTasks: [],
        completedTasks: [],
        approvals: [],
        activityFeed: [],
        documents: [],
        stats: {
            totalAgents: 0,
            activeExecuting: 0,
            availableCount: 0,
            waitingApprovalCount: 0,
            totalTokensConsumed: 0,
            estimatedSpendUSD: 0
        }
    });

    // Inbox state for filter channel
    const [inboxData, setInboxData] = useState({
        diskTickets: [],
        activeTasks: [],
        totalInboxCount: 0
    });
    const [selectedTicket, setSelectedTicket] = useState(null);

    const fetchInbox = useCallback(async () => {
        try {
            const res = await fetch('/api/office/inbox');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setInboxData(data);
                }
            }
        } catch (err) {
            console.warn('[Inbox fetch error]:', err.message);
        }
    }, []);

    const fetchOfficeState = useCallback(async () => {
        try {
            const res = await fetch('/api/office/state');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setOfficeState(data);
                }
            }
        } catch (err) {
            console.warn('[AI Office HQ] State fetch error:', err.message);
        }
        fetchInbox();
    }, [fetchInbox]);

    // 1. Initial load & Periodic Poll Fallback
    useEffect(() => {
        const first = setTimeout(fetchOfficeState, 0);
        const interval = setInterval(fetchOfficeState, 10000);
        return () => { clearTimeout(first); clearInterval(interval); };
    }, [fetchOfficeState]);

    // 2. Server-Sent Events (SSE) Real-Time Connection
    useEffect(() => {
        let es = null;
        try {
            es = new EventSource('/api/office/events');
            es.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type && parsed.type !== 'connected') {
                        fetchOfficeState();
                        if (parsed.type === 'task_dispatched') playOfficeClick();
                        if (parsed.type === 'task_delivered') playOfficeSuccess();
                        if (parsed.type === 'task_failed') playOfficeAlert();
                        if (parsed.type === 'approval_decided') playOfficeSuccess();
                        if (parsed.type === 'kill_switch_triggered') playOfficeAlert();
                    }
                } catch { /* silent */ }
            };
            es.onerror = () => {
                // EventSource auto-retries, fallback interval handles data
            };
        } catch { /* silent */ }

        return () => {
            if (es) es.close();
        };
    }, [fetchOfficeState]);

    // Dispatch mission handler
    const handleDispatchMission = async ({ mission, priority, targetDepartment, targetAgent, files = [] }) => {
        setIsDispatching(true);
        setNotice('');
        try {
            const res = await fetch('/api/office/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mission,
                    priority,
                    targetDepartment,
                    targetAgent,
                    // Con archivos, primero se suben y luego arranca el agente (así los lee).
                    autoRun: files.length ? false : undefined,
                    companyName: 'HangOut Panamá / ARRIVE Agency'
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && files.length) {
                    try {
                        await uploadTaskFiles(data.task.id, files);
                    } catch (e) {
                        setNotice(`La tarea se creó pero no se pudieron subir los archivos: ${e.message}`);
                    }
                    if (data.task.assignedKind === 'internal' && data.task.status === 'queued') {
                        const run = await fetch(`/api/office/task/${data.task.id}/run`, { method: 'POST' }).then(r => r.json()).catch(() => ({}));
                        data.status = run.started ? 'in_progress' : 'queued';
                    }
                }
                if (data.success) {
                    playOfficeSuccess();
                    addActivity && addActivity(`🎯 Misión despachada a ${data.assignedAgent}: "${mission.substring(0, 45)}"`);
                    if (data.status === 'queued' && data.task?.assignedKind === 'internal') {
                        setNotice(`${data.assignedAgent} no pudo arrancar: revisa su modelo (la tarea quedó en cola).`);
                    }
                    fetchOfficeState();
                }
            } else {
                const err = await res.json().catch(() => ({}));
                setNotice(err.error || 'No se pudo despachar la misión');
            }
        } catch (err) {
            console.error('[AI Office HQ] Dispatch error:', err);
        } finally {
            setIsDispatching(false);
        }
    };

    // Kill switch handler
    const handleKillSwitch = async () => {
        playOfficeAlert();
        if (!window.confirm('¿Confirmas activar el KILL SWITCH? Se detendrán todas las ejecuciones de los agentes.')) return;
        try {
            const res = await fetch('/api/office/kill-switch', { method: 'POST' });
            if (res.ok) {
                playOfficeAlert();
                fetchOfficeState();
            }
        } catch (err) {
            console.error('[Kill Switch] Error:', err);
        }
    };

    // Call War Room
    const handleCallWarRoom = () => {
        playOfficeClick();
        setIsWarRoomOpen(true);
    };

    // Update agent status
    const handleUpdateStatus = async (agentId, updates) => {
        try {
            const res = await fetch(`/api/office/agent/${agentId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                fetchOfficeState();
                if (selectedAgent && selectedAgent.id === agentId) {
                    setSelectedAgent(prev => ({ ...prev, ...updates }));
                }
            }
        } catch (err) {
            console.error('[Update Status] Error:', err);
        }
    };

    // Create document
    const handleCreateDocument = async (agentId, docData) => {
        try {
            const res = await fetch(`/api/office/agent/${agentId}/document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(docData)
            });
            if (res.ok) {
                playOfficeSuccess();
                fetchOfficeState();
                return await res.json();
            }
        } catch (err) {
            console.error('[Create Document Error]:', err);
        }
    };

    // Approval decision
    const handleApprovalDecision = async (approvalId, decision, notes) => {
        try {
            const res = await fetch(`/api/office/approval/${approvalId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, notes })
            });
            if (res.ok) {
                playOfficeSuccess();
                fetchOfficeState();
            }
        } catch (err) {
            console.error('[Approval Decision] Error:', err);
        }
    };

    // Direct chat
    const handleSendMessage = async (agent, message) => {
        try {
            const res = await fetch('/api/orch/execute-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentName: agent.name,
                    task: message,
                    description: `Interacción directa en cabina de ${agent.name}`,
                    companyName: agent.activeCompany || 'ARRIVE Ecosystem'
                })
            });

            if (res.ok) {
                const data = await res.json();
                return data.result || 'Completado con éxito.';
            } else {
                throw new Error('No se pudo procesar la respuesta');
            }
        } catch (err) {
            return `Nota de ${agent.name}: He tomado nota de tu instrucción. Error al ejecutar modelo directo: ${err.message}`;
        }
    };

    const handleRunTask = async (task) => {
        setNotice('');
        try {
            const res = await fetch(`/api/office/task/${task.id}/run`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) setNotice(data.error || 'No se pudo ejecutar');
            else if (data.started === false) setNotice(data.reason);
            else playOfficeClick();
        } catch (err) {
            setNotice(err.message);
        }
        fetchOfficeState();
    };

    const handleSaveAgentConfig = async (agentId, config) => {
        const res = await fetch(`/api/office/agent/${agentId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
        fetchOfficeState();
        setSelectedAgent(prev => (prev && prev.id === agentId ? { ...prev, ...data.agent } : prev));
        return data.agent;
    };

    const openAgent = (ag) => {
        playOfficeClick();
        if (ag.kind === 'external') setSelectedExternal(ag);
        else setSelectedAgent(ag);
    };

    // Mantiene el modal del agente externo con datos frescos del estado en vivo.
    const liveExternal = selectedExternal && (officeState.agents.find(a => a.id === selectedExternal.id) || selectedExternal);
    const allTasks = [...(officeState.activeTasks || []), ...(officeState.completedTasks || [])];

    const pendingApprovalsCount = (officeState.approvals || []).filter(a => a.status === 'pending').length;

    return (
        <div className={`ai-office-container ${isWarMode ? 'war-mode-active' : ''}`}>
            {/* HERO HEADER */}
            <div className="ai-office-header">
                <div className="ai-office-branding">
                    <div className="ai-office-logo-badge" style={{
                        background: isWarMode ? 'linear-gradient(135deg, #dc2626, #991b1b)' : undefined
                    }}>
                        {isWarMode ? '🔥' : '🏢'}
                    </div>
                    <div>
                        <div className="ai-office-title-row">
                            <h1 className="ai-office-title">AI OFFICE HQ</h1>
                            <span className="ai-office-pill-tag" style={{
                                background: isWarMode ? 'rgba(239, 68, 68, 0.2)' : undefined,
                                color: isWarMode ? '#fca5a5' : undefined,
                                borderColor: isWarMode ? 'rgba(239, 68, 68, 0.4)' : undefined
                            }}>
                                {isWarMode ? 'WAR MODE ACTIVO' : 'Command Center'}
                            </span>
                        </div>
                        <p className="ai-office-subtitle">
                            Agentes de distintos modelos y conectados por MCP trabajando para ti · CEO: <strong>Gabriel (GG)</strong> · COO: <strong>BART</strong>
                        </p>
                    </div>
                </div>

                {/* Global Metrics Strip */}
                <div className="ai-office-metrics-strip">
                    <div className="ai-office-stat-card" title="Agentes internos con modelo propio">
                        <span className="label">Internos</span>
                        <span className="val">{officeState.stats?.internalAgents ?? 0}</span>
                    </div>
                    <div className="ai-office-stat-card" title="Agentes externos conectados por MCP (en línea / total)">
                        <span className="label" style={{ color: '#38bdf8' }}>Conectados</span>
                        <span className="val" style={{ color: '#38bdf8' }}>{officeState.stats?.onlineConnected ?? 0}/{officeState.stats?.connectedAgents ?? 0}</span>
                    </div>
                    <div className="ai-office-stat-card">
                        <span className="label" style={{ color: '#60a5fa' }}>Trabajando</span>
                        <span className="val" style={{ color: '#60a5fa' }}>{officeState.stats?.activeExecuting || 0}</span>
                    </div>
                    {(officeState.stats?.reviewCount || 0) > 0 && (
                        <div className="ai-office-stat-card" onClick={() => { playOfficeClick(); setViewMode('control'); }} title="Entregas esperando tu revisión" style={{ cursor: 'pointer' }}>
                            <span className="label" style={{ color: '#c084fc' }}>Por revisar</span>
                            <span className="val" style={{ color: '#c084fc' }}>{officeState.stats.reviewCount}</span>
                        </div>
                    )}
                    {pendingApprovalsCount > 0 && (
                        <div
                            className="ai-office-stat-card alert"
                            onClick={() => { playOfficeClick(); setViewMode('approvals'); }}
                            title="Ver solicitudes de aprobación"
                        >
                            <span className="label">Por Aprobar</span>
                            <span className="val">{pendingApprovalsCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* COMMAND BAR & CONTROLS */}
            <OfficeCommandBar
                onDispatchMission={handleDispatchMission}
                onKillSwitch={handleKillSwitch}
                onCallWarRoom={handleCallWarRoom}
                onRefresh={fetchOfficeState}
                activeMode={viewMode}
                onModeChange={setViewMode}
                selectedDept={selectedDept}
                onSelectDept={setSelectedDept}
                pendingApprovalsCount={pendingApprovalsCount}
                isDispatching={isDispatching}
                isWarMode={isWarMode}
                onToggleWarMode={setIsWarMode}
                agents={officeState.agents}
            />

            {notice && (
                <div className="occ-notice" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>{notice}</span>
                    <button className="occ-btn sm" onClick={() => setNotice('')}>Cerrar</button>
                </div>
            )}

            {/* VIEW MODE 0: CENTRO DE CONTROL (agentes reales + cola de trabajo) */}
            {viewMode === 'control' && (
                <OfficeControlCenter
                    agents={officeState.agents}
                    activeTasks={officeState.activeTasks}
                    completedTasks={officeState.completedTasks}
                    metrics={officeState.metrics}
                    models={officeState.models}
                    onOpenAgent={openAgent}
                    onOpenTask={(t) => setSelectedTaskId(t.id)}
                    onRunTask={handleRunTask}
                    onConnectAgent={() => setIsConnectOpen(true)}
                />
            )}

            {/* VIEW MODE 1: LIVE ISOMETRIC OFFICE */}
            {viewMode === 'office' && (
                <OfficeIsometricCanvas
                    agents={officeState.agents}
                    activeTasks={officeState.activeTasks}
                    onSelectAgent={openAgent}
                    filterDepartment={selectedDept}
                    isWarMode={isWarMode}
                />
            )}

            {/* VIEW MODE: INBOX CANAL DE FILTRO */}
            {viewMode === 'inbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header Strip */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(139, 92, 246, 0.08))',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '16px',
                        padding: '18px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Inbox size={20} style={{ color: '#60a5fa' }} />
                                <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                                    CANAL DE FILTRO & BANDEJA DE AGENTES
                                </h2>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    color: '#60a5fa',
                                    padding: '2px 8px',
                                    borderRadius: '10px'
                                }}>
                                    _agent_inbox/ Activo
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                Los agentes operan como filtros autónomos: leen tickets de entrada, ejecutan acciones, redactan documentos y avanzan estados.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '6px 14px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Tickets Físicos</span>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>{inboxData.diskTickets?.length || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '6px 14px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Tareas Activas</span>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8' }}>{inboxData.activeTasks?.length || 0}</div>
                            </div>
                        </div>
                    </div>

                    {/* Split Grid: Tickets en Disco vs Tareas en Progreso */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                        {/* Column 1: Tickets Físicos en _agent_inbox/ */}
                        <div style={{ background: '#0d121d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                                    📁 Tickets en _agent_inbox/*.md
                                </h3>
                                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                    Handoff Files
                                </span>
                            </div>

                            {(!inboxData.diskTickets || inboxData.diskTickets.length === 0) ? (
                                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                                    No hay tickets pendientes en <code>_agent_inbox/</code>. Usa la barra del CEO para despachar una misión.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {inboxData.diskTickets.map((t, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedTicket(selectedTicket?.fileName === t.fileName ? null : t)}
                                            style={{
                                                background: selectedTicket?.fileName === t.fileName ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                border: selectedTicket?.fileName === t.fileName ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#ffffff', fontFamily: 'monospace' }}>
                                                    {t.fileName}
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <span style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: '700' }}>
                                                        {t.to}
                                                    </span>
                                                    <span style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                                                        Lvl {t.autonomyLevel}
                                                    </span>
                                                </div>
                                            </div>

                                            {selectedTicket?.fileName === t.fileName && (
                                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                    <pre style={{ fontSize: '11px', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', maxHeight: '180px', overflowY: 'auto' }}>
                                                        {t.content}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Column 2: Tareas en Progreso & Avance */}
                        <div style={{ background: '#0d121d', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                                    ⚡ Cola Activa de Tareas & Entregables
                                </h3>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    Avance autónomo
                                </span>
                            </div>

                            {(!inboxData.activeTasks || inboxData.activeTasks.length === 0) ? (
                                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                                    Sin tareas activas en cola actualmente.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {inboxData.activeTasks.map(task => {
                                        const p = task.progress || 0;
                                        return (
                                            <div key={task.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{task.task || task.title}</span>
                                                    <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700' }}>{p}%</span>
                                                </div>
                                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 8px 0' }}>
                                                    {task.currentStep || 'En proceso'} · Asignado a <strong>{task.assignedAgent}</strong>
                                                </p>
                                                <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2.5px', overflow: 'hidden', marginBottom: '10px' }}>
                                                    <div style={{ width: `${p}%`, height: '100%', background: '#38bdf8' }} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="occ-btn sm" onClick={() => setSelectedTaskId(task.id)}>
                                                        Abrir tarea
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: STRATEGIC MAP */}
            {viewMode === 'strategic' && (
                <div className="office-strategic-grid">
                    {(officeState.departments || []).map(dept => {
                        const deptAgents = officeState.agents.filter(a => a.departmentId === dept.id);
                        return (
                            <div key={dept.id} className="office-dept-card">
                                <div className="office-dept-header">
                                    <div className="office-dept-title-group">
                                        <div className="office-dept-dot" style={{ backgroundColor: dept.color }} />
                                        <h3 className="office-dept-title">{dept.name}</h3>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                        {deptAgents.length} agentes
                                    </span>
                                </div>
                                <p className="office-dept-desc">{dept.description}</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px' }}>
                                    {deptAgents.map(a => (
                                        <div
                                            key={a.id}
                                            onClick={() => { playOfficeClick(); setSelectedAgent(a); }}
                                            className="office-dept-agent-row"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '18px' }}>{a.avatar}</span>
                                                <div>
                                                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                                                        {a.name}
                                                    </span>
                                                    <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block' }}>
                                                        {a.role}
                                                    </span>
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '10.5px',
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                fontWeight: '600',
                                                background: a.status === 'executing' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: a.status === 'executing' ? '#60a5fa' : '#34d399'
                                            }}>
                                                {a.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW MODE 3: ORG CHART */}
            {viewMode === 'orgchart' && (
                <div className="office-orgchart-box">
                    <div>
                        <div className="office-org-node-ceo">
                            <span>👑</span>
                            <span>Gabriel (CEO & Fundador)</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                            Dirección General, Estrategia & Decisiones Finales
                        </p>
                    </div>

                    <div className="office-org-connector" />

                    <div>
                        <div className="office-org-node-coo">
                            <span>👔</span>
                            <span>BART (COO & Lead Orchestrator)</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                            Orquestación Operativa, Triaje & Control de Calidad
                        </p>
                    </div>

                    <div className="office-org-connector" />

                    <div className="office-org-grid-leads">
                        {officeState.agents.filter(a => a.id !== 'agent-bart').map(ag => (
                            <div
                                key={ag.id}
                                onClick={() => { playOfficeClick(); setSelectedAgent(ag); }}
                                className="office-org-lead-card"
                            >
                                <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>{ag.avatar}</span>
                                <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{ag.name}</h4>
                                <p style={{ fontSize: '10.5px', color: '#94a3b8', margin: '3px 0 6px 0' }}>{ag.role}</p>
                                <span style={{
                                    fontSize: '9.5px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    color: '#cbd5e1',
                                    fontFamily: 'monospace'
                                }}>
                                    Nivel {ag.autonomyLevel || 2}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW MODE 4: MÉTRICAS REALES */}
            {viewMode === 'metrics' && (
                <OfficeMetricsView
                    agents={officeState.agents}
                    metrics={officeState.metrics}
                    models={officeState.models}
                    onOpenAgent={openAgent}
                />
            )}

            {/* VIEW MODE 5: APPROVALS GOBERNANZA */}
            {viewMode === 'approvals' && (
                <OfficeApprovalsModal
                    approvals={officeState.approvals}
                    onClose={() => setViewMode('office')}
                    onDecision={handleApprovalDecision}
                />
            )}

            {/* ACTIVITY TICKER FOOTER */}
            <div className="office-activity-ticker">
                <div className="office-ticker-head">
                    <Activity size={15} />
                    <span>Actividad en Vivo:</span>
                </div>
                <div className="office-ticker-list">
                    {(officeState.activityFeed || []).slice(0, 6).map((act, i) => (
                        <div key={i} className="office-ticker-item">
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: act.color || '#3b82f6' }} />
                            <span>{act.text}</span>
                            <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {selectedAgent && (
                <AgentDeskModal
                    agent={selectedAgent}
                    onClose={() => setSelectedAgent(null)}
                    onUpdateStatus={handleUpdateStatus}
                    tasks={officeState.activeTasks}
                    activity={officeState.activityFeed}
                    documents={officeState.documents || []}
                    onSendMessage={handleSendMessage}
                    onCreateDocument={handleCreateDocument}
                    models={officeState.models}
                    stats={officeState.metrics?.agentStats?.[selectedAgent.id]}
                    onSaveConfig={handleSaveAgentConfig}
                    onOpenTask={(t) => setSelectedTaskId(t.id)}
                />
            )}

            {liveExternal && (
                <ExternalAgentModal
                    agent={liveExternal}
                    tasks={allTasks}
                    onClose={() => setSelectedExternal(null)}
                    onOpenTask={(t) => setSelectedTaskId(t.id)}
                    onAssign={handleDispatchMission}
                />
            )}

            {isConnectOpen && (
                <ConnectAgentModal onClose={() => setIsConnectOpen(false)} onCreated={fetchOfficeState} />
            )}

            {selectedTaskId && (
                <OfficeTaskDrawer
                    taskId={selectedTaskId}
                    agents={officeState.agents}
                    models={officeState.models}
                    onClose={() => setSelectedTaskId(null)}
                    onChanged={fetchOfficeState}
                    onOpenTask={setSelectedTaskId}
                />
            )}

            {isApprovalsOpen && (
                <OfficeApprovalsModal
                    approvals={officeState.approvals}
                    onClose={() => setIsApprovalsOpen(false)}
                    onDecision={handleApprovalDecision}
                />
            )}

            {isWarRoomOpen && (
                <OfficeWarRoomModal
                    isOpen={isWarRoomOpen}
                    onClose={() => setIsWarRoomOpen(false)}
                    companyName="HangOut Panamá"
                    onInjectDeliverable={() => fetchOfficeState()}
                />
            )}
        </div>
    );
}
