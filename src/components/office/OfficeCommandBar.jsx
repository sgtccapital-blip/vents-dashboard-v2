import React, { useRef, useState } from 'react';
import {
    Sparkles, Send, Users, ShieldAlert, RotateCcw,
    Layers, Building2, BarChart2, Radio, StopCircle, Flame, Inbox, LayoutDashboard, Paperclip, CalendarClock
} from 'lucide-react';
import { playOfficeClick, playOfficeWarMode } from '../../lib/officeAudio';
import './AiOffice.css';

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
    isDispatching = false,
    isWarMode = false,
    onToggleWarMode,
    agents = []
}) {
    const [missionInput, setMissionInput] = useState('');
    const [priority, setPriority] = useState('high');
    const [targetAgent, setTargetAgent] = useState('');
    const [files, setFiles] = useState([]);
    const fileRef = useRef(null);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!missionInput.trim() || isDispatching) return;
        playOfficeClick();
        onDispatchMission({
            mission: missionInput.trim(),
            priority,
            targetAgent: targetAgent || undefined,
            files,
        });
        setMissionInput('');
        setFiles([]);
    };

    const handleWarModeToggle = () => {
        const next = !isWarMode;
        playOfficeWarMode(next);
        if (onToggleWarMode) onToggleWarMode(next);
    };

    const modes = [
        { id: 'control', label: 'Centro de Control', icon: LayoutDashboard },
        { id: 'office', label: 'Oficina en vivo', icon: Building2 },
        { id: 'inbox', label: 'Canal de Filtro (Inbox)', icon: Inbox },
        { id: 'strategic', label: 'Strategic Map', icon: Layers },
        { id: 'orgchart', label: 'Org Chart', icon: Users },
        { id: 'metrics', label: 'Métricas & Costos', icon: BarChart2 },
        { id: 'auto', label: 'Automatización', icon: CalendarClock },
        {
            id: 'approvals',
            label: `Gobernanza ${pendingApprovalsCount > 0 ? `(${pendingApprovalsCount})` : ''}`,
            icon: ShieldAlert
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
        { id: 'dept-tech', label: 'Tech Lab (Antigravity)' }
    ];

    return (
        <div className="office-command-wrapper">
            {/* ROW 1: VIEW MODES & QUICK ACTION BUTTONS */}
            <div className="office-modes-row">
                {/* View Modes */}
                <div className="office-modes-group">
                    {modes.map(m => {
                        const Icon = m.icon;
                        const isActive = activeMode === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => { playOfficeClick(); onModeChange(m.id); }}
                                className={`office-mode-btn ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={14} />
                                <span>{m.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Quick CEO Action Buttons */}
                <div className="office-actions-group">
                    {/* War Mode Toggle Button */}
                    <button
                        onClick={handleWarModeToggle}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isWarMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                            border: isWarMode ? '1px solid #ef4444' : '1px solid var(--office-border)',
                            color: isWarMode ? '#fca5a5' : '#94a3b8'
                        }}
                        title={isWarMode ? 'Desactivar Modo Táctico' : 'Activar War Mode (Modo Táctico de Lanzamiento)'}
                    >
                        <Flame size={14} className={isWarMode ? 'animate-bounce text-red-400' : ''} />
                        <span>{isWarMode ? 'WAR MODE ACTIVO' : 'War Mode'}</span>
                    </button>

                    <button
                        onClick={() => { playOfficeClick(); onCallWarRoom(); }}
                        className="office-btn-warroom"
                        title="Convocar a los leads a la Sala de Juntas"
                    >
                        <Radio size={14} />
                        <span>War Room</span>
                    </button>

                    <button
                        onClick={() => { playOfficeClick(); onKillSwitch(); }}
                        className="office-btn-killswitch"
                        title="Detener todas las ejecuciones activas"
                    >
                        <StopCircle size={14} />
                        <span>Kill Switch</span>
                    </button>

                    <button
                        onClick={() => { playOfficeClick(); onRefresh(); }}
                        className="office-btn-refresh"
                        title="Actualizar estado en vivo"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* ROW 2: CEO MISSION DISPATCH BAR */}
            <form onSubmit={handleSubmit} className="office-dispatch-bar">
                <div className="office-dispatch-label">
                    <Sparkles size={16} />
                    <span>Comando CEO:</span>
                </div>

                <input
                    type="text"
                    value={missionInput}
                    onChange={(e) => setMissionInput(e.target.value)}
                    placeholder={targetAgent ? `¿Qué debe hacer ${agents.find(a => a.id === targetAgent)?.name || 'el agente'}?` : "Instruye a BART (COO): 'Prepara la campaña de lanzamiento de HangOut Panamá'..."}
                    className="office-dispatch-input"
                />

                <select
                    value={targetAgent}
                    onChange={(e) => setTargetAgent(e.target.value)}
                    className="office-dispatch-select"
                    title="A quién va la misión"
                >
                    <option value="" style={{ background: '#0d121d' }}>Auto (BART decide)</option>
                    {agents.some(a => a.kind === 'external') && (
                        <optgroup label="Conectados por MCP" style={{ background: '#0d121d' }}>
                            {agents.filter(a => a.kind === 'external').map(a => (
                                <option key={a.id} value={a.id} style={{ background: '#0d121d' }}>{a.avatar} {a.name}{a.online ? '' : ' (desconectado)'}</option>
                            ))}
                        </optgroup>
                    )}
                    <optgroup label="Internos" style={{ background: '#0d121d' }}>
                        {agents.filter(a => a.kind !== 'external').map(a => (
                            <option key={a.id} value={a.id} style={{ background: '#0d121d' }}>{a.avatar} {a.name}</option>
                        ))}
                    </optgroup>
                </select>

                <button
                    type="button"
                    className={`office-dispatch-attach ${files.length ? 'has-files' : ''}`}
                    onClick={() => fileRef.current?.click()}
                    title={files.length ? files.map(f => f.name).join(', ') : 'Adjuntar briefs, fotos o documentos para el agente'}
                >
                    <Paperclip size={13} /> {files.length || ''}
                </button>
                <input ref={fileRef} type="file" multiple hidden onChange={e => { setFiles([...e.target.files]); e.target.value = ''; }} />

                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="office-dispatch-select"
                >
                    <option value="normal" style={{ background: '#0d121d' }}>Prioridad Normal</option>
                    <option value="high" style={{ background: '#0d121d' }}>Prioridad Alta</option>
                    <option value="critical" style={{ background: '#0d121d' }}>🔥 Crítica</option>
                </select>

                <button
                    type="submit"
                    disabled={!missionInput.trim() || isDispatching}
                    className="office-dispatch-submit"
                >
                    <Send size={14} />
                    <span>{isDispatching ? 'Despachando...' : targetAgent ? 'Asignar' : 'Despachar a BART'}</span>
                </button>
            </form>

            {/* ROW 3: DEPARTMENT FILTER PILLS (Only for Live Office) */}
            {activeMode === 'office' && (
                <div className="office-filter-strip">
                    <span className="office-filter-label">Filtrar:</span>
                    {departments.map(d => (
                        <button
                            key={d.id}
                            onClick={() => { playOfficeClick(); onSelectDept(d.id); }}
                            className={`office-filter-chip ${selectedDept === d.id ? 'active' : ''}`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
