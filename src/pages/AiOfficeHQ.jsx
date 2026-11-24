import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import OfficeIsometricCanvas from '../components/office/OfficeIsometricCanvas';
import OfficeCommandBar from '../components/office/OfficeCommandBar';
import AgentDeskModal from '../components/office/AgentDeskModal';
import OfficeApprovalsModal from '../components/office/OfficeApprovalsModal';
import {
    Building2, Users, Layers, BarChart2, ShieldAlert, Sparkles,
    CheckCircle2, AlertCircle, Clock, Send, Play, Pause, ChevronRight,
    Briefcase, Activity, Terminal, ArrowRight, DollarSign
} from 'lucide-react';

export default function AiOfficeHQ() {
    const appContext = useApp();
    const { activityFeed = [], addActivity, projects = [], events = [] } = appContext;

    // View state
    const [viewMode, setViewMode] = useState('office'); // 'office' | 'strategic' | 'orgchart' | 'metrics' | 'approvals'
    const [selectedDept, setSelectedDept] = useState('all');
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);

    // Live office state from backend
    const [officeState, setOfficeState] = useState({
        agents: [],
        departments: [],
        rooms: [],
        activeTasks: [],
        completedTasks: [],
        approvals: [],
        activityFeed: [],
        stats: {
            totalAgents: 0,
            activeExecuting: 0,
            availableCount: 0,
            waitingApprovalCount: 0,
            totalTokensConsumed: 0,
            estimatedSpendUSD: 0
        }
    });

    const [isLoading, setIsLoading] = useState(true);

    // Fetch state from /api/office/state
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
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load + poll every 10s
    useEffect(() => {
        fetchOfficeState();
        const interval = setInterval(fetchOfficeState, 10000);
        return () => clearInterval(interval);
    }, [fetchOfficeState]);

    // Dispatch mission handler
    const handleDispatchMission = async ({ mission, priority, targetDepartment }) => {
        setIsDispatching(true);
        try {
            const res = await fetch('/api/office/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mission,
                    priority,
                    targetDepartment,
                    companyName: 'HangOut Panamá / ARRIVE Agency'
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    addActivity && addActivity(`🎯 Misión despachada a ${data.assignedAgent}: "${mission.substring(0, 45)}"`);
                    fetchOfficeState();
                }
            }
        } catch (err) {
            console.error('[AI Office HQ] Dispatch error:', err);
        } finally {
            setIsDispatching(false);
        }
    };

    // Kill Switch handler
    const handleKillSwitch = async () => {
        if (!window.confirm('¿Confirmas activar el KILL SWITCH? Se detendrán todas las ejecuciones activas de los agentes.')) return;
        try {
            const res = await fetch('/api/office/kill-switch', { method: 'POST' });
            if (res.ok) {
                fetchOfficeState();
            }
        } catch (err) {
            console.error('[Kill Switch] Error:', err);
        }
    };

    // Call War Room handler
    const handleCallWarRoom = async () => {
        const topic = window.prompt('Tema de la sesión de War Room:', 'Estrategia y plan de acción de la semana');
        if (!topic) return;
        try {
            const res = await fetch('/api/office/war-room/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });
            if (res.ok) {
                fetchOfficeState();
            }
        } catch (err) {
            console.error('[War Room] Error:', err);
        }
    };

    // Update agent status handler
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

    // Handle Approval Decision
    const handleApprovalDecision = async (approvalId, decision, notes) => {
        try {
            const res = await fetch(`/api/office/approval/${approvalId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, notes })
            });
            if (res.ok) {
                fetchOfficeState();
            }
        } catch (err) {
            console.error('[Approval Decision] Error:', err);
        }
    };

    // Direct chat with agent handler
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

    // Filtered agents
    const filteredAgents = useMemo(() => {
        if (selectedDept === 'all') return officeState.agents;
        return officeState.agents.filter(a => a.departmentId === selectedDept);
    }, [officeState.agents, selectedDept]);

    const pendingApprovalsCount = (officeState.approvals || []).filter(a => a.status === 'pending').length;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
            {/* HERO HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
                            🏢
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tight">AI OFFICE HQ</h1>
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    Command Center
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Empresa virtual autónoma de agentes de IA · CEO: <strong>Gabriel (GG)</strong> · COO: <strong>BART</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Global Metrics Bar */}
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
                    <div className="bg-[#0B0F17] border border-white/10 px-3.5 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Agentes</span>
                        <span className="text-sm font-bold text-white">{officeState.agents.length || 9}</span>
                    </div>
                    <div className="bg-[#0B0F17] border border-white/10 px-3.5 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-blue-400 uppercase tracking-wider block">En Ejecución</span>
                        <span className="text-sm font-bold text-blue-400">{officeState.stats?.activeExecuting || 0}</span>
                    </div>
                    <div className="bg-[#0B0F17] border border-white/10 px-3.5 py-2 rounded-xl text-center">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Disponibles</span>
                        <span className="text-sm font-bold text-emerald-400">{officeState.stats?.availableCount || 0}</span>
                    </div>
                    {pendingApprovalsCount > 0 && (
                        <button
                            onClick={() => setIsApprovalsOpen(true)}
                            className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl text-center animate-pulse"
                        >
                            <span className="text-[10px] text-amber-400 uppercase tracking-wider block">Por Aprobar</span>
                            <span className="text-sm font-bold text-amber-400">{pendingApprovalsCount}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* COMMAND BAR */}
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
            />

            {/* VIEW MODE 1: LIVE ISOMETRIC OFFICE */}
            {viewMode === 'office' && (
                <div className="space-y-4">
                    <OfficeIsometricCanvas
                        agents={officeState.agents}
                        activeTasks={officeState.activeTasks}
                        onSelectAgent={setSelectedAgent}
                        filterDepartment={selectedDept}
                    />
                </div>
            )}

            {/* VIEW MODE 2: STRATEGIC MAP */}
            {viewMode === 'strategic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(officeState.departments || []).map(dept => {
                        const deptAgents = officeState.agents.filter(a => a.departmentId === dept.id);
                        return (
                            <div key={dept.id} className="bg-[#0B0F17] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: dept.color }} />
                                        <h3 className="text-sm font-bold text-white">{dept.name}</h3>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-mono">{deptAgents.length} agentes</span>
                                </div>
                                <p className="text-xs text-gray-400">{dept.description}</p>

                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    {deptAgents.map(a => (
                                        <div
                                            key={a.id}
                                            onClick={() => setSelectedAgent(a)}
                                            className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl cursor-pointer transition"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-base">{a.avatar}</span>
                                                <div>
                                                    <span className="text-xs font-semibold text-white block">{a.name}</span>
                                                    <span className="text-[10px] text-gray-400 block">{a.role}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                a.status === 'executing' ? 'bg-blue-500/20 text-blue-400' :
                                                a.status === 'in_meeting' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
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
                <div className="bg-[#0B0F17] border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl">
                    <div className="text-center max-w-sm mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm">
                            <span>👑</span>
                            <span>Gabriel (CEO & Fundador)</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">Dirección Estratégica & Autorizaciones Finales</p>
                    </div>

                    <div className="w-0.5 h-6 bg-white/20 mx-auto" />

                    <div className="text-center max-w-sm mx-auto">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-sm shadow-lg shadow-blue-500/10">
                            <span>👔</span>
                            <span>BART (COO & Lead Orchestrator)</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">Orquestación de Misiones, Triaje & Control de Calidad</p>
                    </div>

                    <div className="w-0.5 h-6 bg-white/20 mx-auto" />

                    {/* Department Heads Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        {officeState.agents.filter(a => a.id !== 'agent-bart').map(ag => (
                            <div
                                key={ag.id}
                                onClick={() => setSelectedAgent(ag)}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl text-center cursor-pointer transition"
                            >
                                <span className="text-2xl block mb-1">{ag.avatar}</span>
                                <h4 className="text-xs font-bold text-white truncate">{ag.name}</h4>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{ag.role}</p>
                                <span className="inline-block mt-2 text-[9px] bg-white/10 px-2 py-0.5 rounded text-gray-300 font-mono">
                                    Nivel {ag.autonomyLevel || 2}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW MODE 4: METRICS & COSTS */}
            {viewMode === 'metrics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#0B0F17] border border-white/10 p-5 rounded-2xl">
                            <span className="text-xs text-gray-400 uppercase tracking-wider block">Gasto Estimado Total</span>
                            <div className="text-3xl font-black text-emerald-400 mt-2">${officeState.stats?.estimatedSpendUSD || 0} USD</div>
                            <span className="text-[11px] text-gray-500 mt-1 block">Facturación de Tokens Gemini</span>
                        </div>
                        <div className="bg-[#0B0F17] border border-white/10 p-5 rounded-2xl">
                            <span className="text-xs text-gray-400 uppercase tracking-wider block">Tokens Consumidos</span>
                            <div className="text-3xl font-black text-purple-400 mt-2">
                                {((officeState.stats?.totalTokensConsumed || 0) / 1000).toFixed(1)}k
                            </div>
                            <span className="text-[11px] text-gray-500 mt-1 block">Últimos 30 días de operación</span>
                        </div>
                        <div className="bg-[#0B0F17] border border-white/10 p-5 rounded-2xl">
                            <span className="text-xs text-gray-400 uppercase tracking-wider block">Tasa Global de Éxito</span>
                            <div className="text-3xl font-black text-blue-400 mt-2">97.8%</div>
                            <span className="text-[11px] text-gray-500 mt-1 block">Sin intervenciones de fallo crítico</span>
                        </div>
                    </div>

                    <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white mb-4">Consumo por Agente</h3>
                        <div className="space-y-3">
                            {officeState.agents.map(a => {
                                const tokens = a.metrics?.totalTokensConsumed || 45000;
                                const pct = Math.min(100, Math.round((tokens / 200000) * 100));
                                return (
                                    <div key={a.id} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-gray-200">{a.name}</span>
                                            <span className="font-mono text-gray-400">{(tokens / 1000).toFixed(0)}k tokens</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODE 5: APPROVALS */}
            {viewMode === 'approvals' && (
                <div className="bg-[#0B0F17] border border-white/10 rounded-3xl p-6 shadow-xl">
                    <OfficeApprovalsModal
                        approvals={officeState.approvals}
                        onClose={() => setViewMode('office')}
                        onDecision={handleApprovalDecision}
                    />
                </div>
            )}

            {/* RECENT ACTIVITY TICKER BAR */}
            <div className="bg-[#0B0F17] border border-white/10 rounded-2xl p-4 flex items-center gap-3 overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 shrink-0 text-blue-400">
                    <Activity size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Actividad en Vivo:</span>
                </div>
                <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-4 text-xs text-gray-300">
                    {(officeState.activityFeed || []).slice(0, 5).map((act, i) => (
                        <div key={i} className="flex items-center gap-2 shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span>{act.text}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
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
                    onSendMessage={handleSendMessage}
                />
            )}

            {isApprovalsOpen && (
                <OfficeApprovalsModal
                    approvals={officeState.approvals}
                    onClose={() => setIsApprovalsOpen(false)}
                    onDecision={handleApprovalDecision}
                />
            )}
        </div>
    );
}
