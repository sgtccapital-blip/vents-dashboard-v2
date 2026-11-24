import React, { useState } from 'react';
import {
    Sparkles, Send, Users, ShieldAlert, RotateCcw, AlertTriangle,
    Layers, Building2, BarChart2, CheckSquare, Search, Filter,
    StopCircle, Radio, Play
} from 'lucide-react';

export default function OfficeCommandBar({
    onDispatchMission,
    onKillSwitch,
    onCallWarRoom,
    onRefresh,
    activeMode = 'office',
    onModeChange,
    selectedDept = 'all',
    onSelectDept,
    pendingApprovalsCount = 0,
    isDispatching = false
}) {
    const [missionInput, setMissionInput] = useState('');
    const [priority, setPriority] = useState('high');
    const [targetDept, setTargetDept] = useState('auto');

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!missionInput.trim() || isDispatching) return;
        onDispatchMission({
            mission: missionInput.trim(),
            priority,
            targetDepartment: targetDept === 'auto' ? null : targetDept
        });
        setMissionInput('');
    };

    const modes = [
        { id: 'office', label: 'Live Office (2.5D)', icon: Building2 },
        { id: 'strategic', label: 'Strategic Map', icon: Layers },
        { id: 'orgchart', label: 'Org Chart', icon: Users },
        { id: 'metrics', label: 'Métricas & Costos', icon: BarChart2 },
        {
            id: 'approvals',
            label: `Gobernanza ${pendingApprovalsCount > 0 ? `(${pendingApprovalsCount})` : ''}`,
            icon: ShieldAlert,
            badge: pendingApprovalsCount
        }
    ];

    const departments = [
        { id: 'all', label: 'Todos' },
        { id: 'dept-executive', label: 'Executive (BART)' },
        { id: 'dept-creative', label: 'Creative (Echo)' },
        { id: 'dept-marketing', label: 'Marketing (Nexus)' },
        { id: 'dept-operations', label: 'Operaciones (Atlas)' },
        { id: 'dept-sales', label: 'Ventas VIP (Closer)' },
        { id: 'dept-community', label: 'Difusión (Pulse)' },
        { id: 'dept-tech', label: 'Tech Lab (Antigravity)' },
        { id: 'dept-intel', label: 'Inteligencia' }
    ];

    return (
        <div className="space-y-3">
            {/* TOP BAR: MODES & ACTION BUTTONS */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* View Modes */}
                <div className="flex items-center gap-1 bg-[#0B0F17] p-1.5 rounded-2xl border border-white/10 overflow-x-auto scrollbar-none">
                    {modes.map(m => {
                        const Icon = m.icon;
                        const isActive = activeMode === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => onModeChange(m.id)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition relative ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon size={14} />
                                <span>{m.label}</span>
                                {m.badge > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-1.5" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Quick CEO Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCallWarRoom}
                        className="px-3.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Convocar a los leads a la Sala de Juntas"
                    >
                        <Radio size={14} className="text-purple-400" />
                        <span>War Room</span>
                    </button>

                    <button
                        onClick={onKillSwitch}
                        className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Detener todas las ejecuciones activas"
                    >
                        <StopCircle size={14} className="text-red-400" />
                        <span>Kill Switch</span>
                    </button>

                    <button
                        onClick={onRefresh}
                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-xl transition"
                        title="Actualizar estado"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* CEO MISSION COMMAND BAR */}
            <form onSubmit={handleSubmit} className="bg-[#0B0F17] p-2.5 rounded-2xl border border-white/15 shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-2">
                <div className="flex items-center gap-2 pl-2 text-blue-400 shrink-0">
                    <Sparkles size={18} className="animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Comando CEO:</span>
                </div>

                <input
                    type="text"
                    value={missionInput}
                    onChange={(e) => setMissionInput(e.target.value)}
                    placeholder="Instruye a BART (COO): 'Prepara la campaña de lanzamiento de HangOut Panamá' o asigna una misión..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />

                <div className="flex items-center gap-2 shrink-0">
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
                    >
                        <option value="normal" className="bg-[#0B0F17]">Prioridad Normal</option>
                        <option value="high" className="bg-[#0B0F17]">Prioridad Alta</option>
                        <option value="critical" className="bg-[#0B0F17]">🔥 Crítica</option>
                    </select>

                    <button
                        type="submit"
                        disabled={!missionInput.trim() || isDispatching}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition"
                    >
                        <Send size={14} />
                        <span>{isDispatching ? 'Despachando...' : 'Despachar a BART'}</span>
                    </button>
                </div>
            </form>

            {/* DEPARTMENT FILTER PILLS */}
            {activeMode === 'office' && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Filtrar:</span>
                    {departments.map(d => (
                        <button
                            key={d.id}
                            onClick={() => onSelectDept(d.id)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition border ${
                                selectedDept === d.id
                                    ? 'bg-white/20 text-white border-white/40 shadow-sm'
                                    : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
