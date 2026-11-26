import React, { useMemo, useState } from 'react';
import { Users, Plug, Plus, Play, RotateCcw, Eye, KanbanSquare, Cpu } from 'lucide-react';
import { TASK_STATUS, AGENT_STATUS, PROVIDER_COLOR, statusMeta, modelLabel, timeAgo, fmtUSD } from './officeUi';

const COLUMNS = [
    { id: 'waiting_approval', hint: 'Necesitan tu OK antes de arrancar' },
    { id: 'queued', hint: 'Esperando a que un agente las tome (o a que termine el paso anterior de su misión)' },
    { id: 'in_progress', hint: 'Un agente está trabajando' },
    { id: 'review', hint: 'Entregadas: apruébalas o pide cambios' },
    { id: 'closed', label: 'Cerradas', color: '#10b981', hint: 'Hechas, fallidas o descartadas' },
];

function AgentCard({ agent, stats, models, onOpen }) {
    const st = statusMeta(AGENT_STATUS, agent.status);
    const ext = agent.kind === 'external';
    const model = models?.models?.find(m => m.id === agent.model);
    return (
        <button type="button" className="occ-agent" onClick={() => onOpen(agent)}>
            <div className="occ-agent-top">
                <div className="occ-agent-avatar">{agent.avatar || '🤖'}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="occ-agent-name">{agent.name}</div>
                    <div className="occ-agent-role">{agent.role}</div>
                </div>
                <span className={`occ-dot ${agent.status === 'executing' ? 'pulse' : ''}`} style={{ background: st.color }} title={st.label} />
            </div>
            <div className="occ-chips">
                {ext ? (
                    <>
                        <span className="occ-chip" style={{ color: agent.online ? '#6ee7b7' : '#94a3b8' }}>
                            <Plug size={10} /> {agent.online ? 'En línea' : `Visto ${timeAgo(agent.lastSeen)}`}
                        </span>
                        <span className="occ-chip">{agent.scope === 'write' ? 'Lee y escribe' : 'Solo lectura'}</span>
                    </>
                ) : (
                    <span className="occ-chip" style={{ color: PROVIDER_COLOR[agent.provider] }} title={model?.use}>
                        <Cpu size={10} /> {modelLabel(models, agent.model)}
                        {model && !model.enabled && <span style={{ color: '#fca5a5' }}> · sin llave</span>}
                    </span>
                )}
                <span className="occ-chip" style={{ color: st.color }}>{st.label}</span>
            </div>
            {agent.currentTaskName && agent.status === 'executing' && (
                <div className="occ-agent-task" title={agent.currentTaskName}>▶ {agent.currentTaskName}</div>
            )}
            <div className="occ-agent-stats">
                {ext ? (
                    <>
                        <span><b>{agent.hub?.calls24h ?? 0}</b> llamadas 24h</span>
                        {agent.hub?.errors24h > 0 && <span style={{ color: '#fca5a5' }}><b>{agent.hub.errors24h}</b> errores</span>}
                        {agent.queued > 0 && <span><b>{agent.queued}</b> en cola</span>}
                    </>
                ) : (
                    <>
                        <span><b>{stats?.done ?? 0}</b> hechas</span>
                        {stats?.failed > 0 && <span style={{ color: '#fca5a5' }}><b>{stats.failed}</b> fallidas</span>}
                        <span title="Gasto estimado"><b>{fmtUSD(stats?.costUSD ?? 0)}</b></span>
                    </>
                )}
            </div>
        </button>
    );
}

function TaskCard({ task, agent, models, onOpen, onRun }) {
    const st = statusMeta(TASK_STATUS, task.status);
    const internal = task.assignedKind !== 'external';
    const canRun = internal && task.kind !== 'mission' && (task.status === 'queued' || task.status === 'failed') && !task.running;
    return (
        <div role="button" tabIndex={0} className="occ-task" onClick={() => onOpen(task)} onKeyDown={e => e.key === 'Enter' && onOpen(task)}>
            <div className="occ-task-title">{task.task || task.title}</div>
            <div className="occ-task-meta">
                <span style={{ fontSize: '13px' }}>{agent?.avatar || '🤖'}</span>
                <span>{task.assignedAgent || 'Sin asignar'}</span>
                {task.model && <span style={{ color: '#64748b' }}>· {modelLabel(models, task.model)}</span>}
            </div>
            {task.status === 'in_progress' && (
                <div className={`occ-progress ${task.running ? 'indeterminate' : ''}`}>
                    <div style={{ width: `${task.progress || 10}%`, background: st.color }} />
                </div>
            )}
            {task.currentStep && <div className="occ-task-step">{task.currentStep}</div>}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {['done', 'failed', 'cancelled'].includes(task.status) && (
                    <span className="occ-chip" style={{ color: st.color }}>{st.label}</span>
                )}
                {canRun && (
                    <button className="occ-btn sm primary" onClick={e => { e.stopPropagation(); onRun(task); }}>
                        {task.status === 'failed' ? <RotateCcw size={11} /> : <Play size={11} />}
                        {task.status === 'failed' ? 'Reintentar' : 'Ejecutar'}
                    </button>
                )}
                {task.status === 'review' && (
                    <button className="occ-btn sm success" onClick={e => { e.stopPropagation(); onOpen(task); }}>
                        <Eye size={11} /> Revisar
                    </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: '#475569' }}>{timeAgo(task.updatedAt || task.createdAt)}</span>
            </div>
        </div>
    );
}

export default function OfficeControlCenter({ agents = [], activeTasks = [], completedTasks = [], metrics, models, onOpenAgent, onOpenTask, onRunTask, onConnectAgent }) {
    const [filter, setFilter] = useState('all');
    const byId = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a])), [agents]);
    const internal = agents.filter(a => a.kind !== 'external');
    const external = agents.filter(a => a.kind === 'external');
    const shown = filter === 'internal' ? internal : filter === 'external' ? external : [...external, ...internal];

    const columns = COLUMNS.map(c => ({
        ...c,
        ...(c.id === 'closed' ? {} : statusMeta(TASK_STATUS, c.id)),
        tasks: c.id === 'closed' ? completedTasks.slice(0, 15) : activeTasks.filter(t => t.status === c.id || (c.id === 'queued' && t.status === 'blocked')),
    }));

    return (
        <div className="occ">
            <section className="occ-section">
                <div className="occ-section-head">
                    <h2 className="occ-section-title"><Users size={16} /> Agentes</h2>
                    <div className="occ-tabs">
                        {[['all', `Todos (${agents.length})`], ['external', `Conectados por MCP (${external.length})`], ['internal', `Internos (${internal.length})`]].map(([id, label]) => (
                            <button key={id} className={`occ-tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}</button>
                        ))}
                    </div>
                </div>
                <div className="occ-agent-grid">
                    {shown.map(a => <AgentCard key={a.id} agent={a} stats={metrics?.agentStats?.[a.id]} models={models} onOpen={onOpenAgent} />)}
                    {filter !== 'internal' && (
                        <button type="button" className="occ-agent occ-agent-add" onClick={onConnectAgent}>
                            <Plus size={20} />
                            <span style={{ fontSize: '12.5px', fontWeight: 700 }}>Conectar un agente</span>
                            <span style={{ fontSize: '11px', textAlign: 'center' }}>Claude Code, ChatGPT, OpenClaw, Hermes o cualquier cliente MCP</span>
                        </button>
                    )}
                </div>
            </section>

            <section className="occ-section">
                <div className="occ-section-head">
                    <h2 className="occ-section-title"><KanbanSquare size={16} /> Cola de trabajo</h2>
                    <span className="occ-muted">Los internos corren solos al asignarles una tarea; los conectados la toman por MCP. Todo pasa por tu revisión.</span>
                </div>
                <div className="occ-board">
                    {columns.map(col => (
                        <div key={col.id} className="occ-col">
                            <div className="occ-col-head" style={{ color: col.color }} title={col.hint}>
                                <span>{col.label}</span>
                                <span className="occ-chip">{col.tasks.length}</span>
                            </div>
                            {col.tasks.length === 0 && <div className="occ-col-empty">{col.hint}</div>}
                            {col.tasks.map(t => (
                                <TaskCard key={t.id} task={t} agent={byId[t.assignedAgentId]} models={models} onOpen={onOpenTask} onRun={onRunTask} />
                            ))}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
