// Panel lateral de la oficina en vivo: agente, sala o la bandeja del CEO.
import React, { useState } from 'react';
import { X, Send, FileText, Eye, Crosshair, ExternalLink, Inbox, ShieldAlert, Paperclip } from 'lucide-react';
import { MOOD } from './layout';
import { modelLabel, timeAgo, TASK_STATUS, statusMeta } from '../officeUi';

function QuickAssign({ agent, onDispatch }) {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState('');
    const send = async e => {
        e.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true); setDone('');
        try { await onDispatch({ mission: text.trim(), targetAgent: agent?.id }); setText(''); setDone('Asignada ✓'); } catch (err) { setDone(err.message || 'No se pudo asignar'); }
        setBusy(false);
    };
    return (
        <form className="lo-assign" onSubmit={send}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder={agent ? `¿Qué debe hacer ${agent.name.split(' (')[0]}?` : 'Misión para BART…'} />
            <button type="submit" disabled={!text.trim() || busy} title="Asignar"><Send size={13} /></button>
            {done && <span className="lo-assign-msg">{done}</span>}
        </form>
    );
}

function TaskRow({ task, onOpen }) {
    const st = statusMeta(TASK_STATUS, task.status);
    const files = (task.artifacts || []).length;
    return (
        <button className="lo-task" onClick={() => onOpen(task.id)}>
            <span className="lo-task-dot" style={{ background: st.color }} />
            <span className="lo-task-title">{task.task || task.title}</span>
            {files > 0 && <span className="lo-task-files"><Paperclip size={10} />{files}</span>}
            <span className="lo-task-meta" style={{ color: st.color }}>{st.label}</span>
        </button>
    );
}

export default function LiveInspector({ selection, plan, rooms, activeTasks, completedTasks, approvals, models, onClose, onOpenTask, onOpenAgentDesk, onDispatch, onOpenApprovals, onFocus, onSelect }) {
    if (!selection) return null;

    if (selection.type === 'ceo') {
        const reviews = activeTasks.filter(t => t.status === 'review');
        const pending = (approvals || []).filter(a => a.status === 'pending');
        return (
            <aside className="lo-inspector">
                <header>
                    <div className="lo-insp-avatar" style={{ borderColor: '#f5b638' }}>👑</div>
                    <div><h3>Tu bandeja</h3><p>Entregas por revisar y decisiones pendientes</p></div>
                    <button className="lo-x" onClick={onClose}><X size={14} /></button>
                </header>
                <section>
                    <h4><Inbox size={12} /> Por revisar ({reviews.length})</h4>
                    {reviews.length === 0 && <p className="lo-empty">Nada pendiente. Cuando un agente entregue, aparece aquí y en tu escritorio.</p>}
                    {reviews.map(t => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
                </section>
                <section>
                    <h4><ShieldAlert size={12} /> Gobernanza ({pending.length})</h4>
                    {pending.length === 0 ? <p className="lo-empty">Sin aprobaciones pendientes.</p> : (
                        <>
                            {pending.slice(0, 4).map(a => <div key={a.id} className="lo-approval"><b>{a.agentName}</b> · {a.actionRequested}</div>)}
                            <button className="lo-btn amber" onClick={onOpenApprovals}>Abrir gobernanza</button>
                        </>
                    )}
                </section>
                <section>
                    <h4><Send size={12} /> Nueva misión para BART</h4>
                    <QuickAssign onDispatch={onDispatch} />
                </section>
            </aside>
        );
    }

    if (selection.type === 'room') {
        const room = rooms.find(r => r.id === selection.id);
        if (!room) return null;
        const inRoom = plan.placed.filter(p => p.home.room === room.id);
        const ids = new Set(inRoom.map(p => p.agent.id));
        const tasks = activeTasks.filter(t => ids.has(t.assignedAgentId));
        return (
            <aside className="lo-inspector">
                <header>
                    <div className="lo-insp-avatar" style={{ borderColor: room.color }}>{room.icon}</div>
                    <div><h3>{room.name}</h3><p>{inRoom.length ? `${inRoom.length} agente(s)` : 'Sin agentes asignados'}</p></div>
                    <button className="lo-x" onClick={onClose}><X size={14} /></button>
                </header>
                {inRoom.length > 0 && (
                    <section>
                        <h4>Equipo</h4>
                        {inRoom.map(p => (
                            <button key={p.agent.id} className="lo-member" onClick={() => onSelect({ type: 'agent', id: p.agent.id })}>
                                <span className="lo-member-av">{p.agent.avatar || '🤖'}</span>
                                <span className="lo-member-name">{p.agent.name}</span>
                                <span className="lo-member-mood" style={{ color: MOOD[p.mood].color }}>{MOOD[p.mood].label}</span>
                            </button>
                        ))}
                    </section>
                )}
                <section>
                    <h4>Trabajo abierto ({tasks.length})</h4>
                    {tasks.length === 0 ? <p className="lo-empty">Nada en curso en esta sala.</p> : tasks.map(t => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
                </section>
            </aside>
        );
    }

    const p = plan.placed.find(x => x.agent.id === selection.id);
    if (!p) return null;
    const { agent, mood } = p;
    const m = MOOD[mood];
    const ext = agent.kind === 'external';
    const current = activeTasks.find(t => t.assignedAgentId === agent.id && t.status === 'in_progress');
    const open = activeTasks.filter(t => t.assignedAgentId === agent.id && t.id !== current?.id);
    const recent = completedTasks.filter(t => t.assignedAgentId === agent.id).slice(0, 4);
    const room = rooms.find(r => r.id === p.home.room);

    return (
        <aside className="lo-inspector">
            <header>
                <div className="lo-insp-avatar" style={{ borderColor: m.color }}>{agent.avatar || '🤖'}</div>
                <div style={{ minWidth: 0 }}>
                    <h3>{agent.name}</h3>
                    <p>{agent.role}</p>
                </div>
                <button className="lo-x" onClick={onClose}><X size={14} /></button>
            </header>
            <div className="lo-chips">
                <span className="lo-chip" style={{ color: m.color, borderColor: `${m.color}66` }}>● {m.label}</span>
                {ext
                    ? <span className="lo-chip">{agent.online ? 'En línea por MCP' : `Visto ${timeAgo(agent.lastSeen)}`} · {agent.hub?.calls24h ?? 0} llamadas 24h</span>
                    : <span className="lo-chip">{modelLabel(models, agent.model)}</span>}
                {room && <span className="lo-chip" style={{ color: room.color }}>{room.icon} {room.short}</span>}
            </div>

            {current && (
                <section className="lo-current">
                    <h4>Trabajando en</h4>
                    <button className="lo-current-title" onClick={() => onOpenTask(current.id)}>{current.task}</button>
                    <div className={`lo-progress ${current.running ? 'run' : ''}`}><div style={{ width: `${current.progress || 12}%` }} /></div>
                    {current.currentStep && <p className="lo-step">{current.currentStep}</p>}
                </section>
            )}

            <section>
                <h4><Send size={12} /> Asignar tarea</h4>
                <QuickAssign agent={agent} onDispatch={onDispatch} />
                {ext && !agent.online && <p className="lo-empty">Está desconectado: la tomará cuando vuelva a conectarse por MCP.</p>}
            </section>

            {open.length > 0 && (
                <section>
                    <h4><FileText size={12} /> Abiertas ({open.length})</h4>
                    {open.map(t => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
                </section>
            )}
            {recent.length > 0 && (
                <section>
                    <h4><Eye size={12} /> Últimas cerradas</h4>
                    {recent.map(t => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
                </section>
            )}

            <footer>
                <button className="lo-btn" onClick={() => onFocus(p.pos)}><Crosshair size={12} /> Ir a su puesto</button>
                <button className="lo-btn primary" onClick={() => onOpenAgentDesk(agent)}><ExternalLink size={12} /> Despacho completo</button>
            </footer>
        </aside>
    );
}
