import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Check, PencilLine, Trash2, Play, RotateCcw, ArrowRightLeft, Copy, Brain, CornerDownRight } from 'lucide-react';
import { TASK_STATUS, statusMeta, modelLabel, fmtUSD, fmtTokens, fmtMs, postJson } from './officeUi';
import OfficeTaskFiles from './OfficeTaskFiles';
import OfficeTaskContext from './OfficeTaskContext';
import OfficeMission from './OfficeMission';

const fmtTime = iso => (iso ? new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function OfficeTaskDrawer({ taskId, agents = [], models, onClose, onChanged, onOpenTask }) {
    const [task, setTask] = useState(null);
    const [tick, setTick] = useState(0);
    const [notes, setNotes] = useState('');
    const [target, setTarget] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    // Se recarga cuando cambia la tarea o llega un evento (onChanged → el padre sube `version`).
    useEffect(() => {
        let alive = true;
        const load = () => fetch(`/api/office/task/${taskId}`).then(r => r.json()).then(d => { if (alive && d.task) setTask(d.task); }).catch(() => {});
        load();
        const t = setInterval(load, 4000);
        return () => { alive = false; clearInterval(t); };
    }, [taskId, tick]);

    if (!task || task.id !== taskId) return null;
    const refresh = () => { setTick(n => n + 1); onChanged?.(); };
    const st = statusMeta(TASK_STATUS, task.status);
    const internal = task.assignedKind !== 'external';
    const runs = task.runs || [];
    const priced = runs.filter(r => typeof r.costUSD === 'number');
    const totalCost = priced.length ? priced.reduce((a, r) => a + r.costUSD, 0) : null;

    const act = async (key, url, body) => {
        setBusy(key); setError('');
        try {
            const d = await postJson(url, body);
            if (d.task) setTask(t => ({ ...t, ...d.task }));
            if (d.reason && d.started === false) setError(d.reason);
            setNotes('');
            refresh();
        } catch (e) { setError(e.message); }
        setBusy('');
    };

    return (
        <div className="occ-drawer-backdrop" onClick={onClose}>
            <aside className="occ-drawer" onClick={e => e.stopPropagation()}>
                <div className="occ-drawer-head">
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span className="occ-chip" style={{ color: st.color }}>{st.label}</span>
                            <span className="occ-chip">{task.assignedAgent || 'Sin asignar'}</span>
                            {task.model && <span className="occ-chip">{modelLabel(models, task.model)}</span>}
                            {task.companyName && <span className="occ-chip">{task.companyName}</span>}
                            {task.missionStep && <span className="occ-chip" style={{ color: '#a5b4fc' }}>Paso {task.missionStep} de {task.missionTotal}</span>}
                            {task.kind === 'mission' && <span className="occ-chip" style={{ color: '#a5b4fc' }}>Misión en pasos</span>}
                            {task.account && <span className="occ-chip" style={{ color: '#f0abfc' }} title="El agente recibe el ADN y la línea de marca de esta cuenta">🎨 {task.account.name}</span>}
                            {(task.knowledgeDocIds || []).length > 0 && (
                                <span className="occ-chip" style={{ color: '#6ee7b7' }} title="El entregable aprobado quedó en la memoria: otros agentes lo encuentran al buscar">
                                    <Brain size={10} /> En la memoria
                                </span>
                            )}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{task.task}</h2>
                        {task.currentStep && <div className="occ-muted" style={{ marginTop: '4px' }}>{task.currentStep}</div>}
                        {task.parent && (
                            <button className="occ-link" style={{ marginTop: '6px' }} onClick={() => onOpenTask?.(task.parent.id)}>
                                ↖ Sigue de: {task.parent.task} ({task.parent.assignedAgent})
                            </button>
                        )}
                    </div>
                    <button className="occ-btn sm" onClick={onClose} aria-label="Cerrar"><X size={14} /></button>
                </div>

                <div className="occ-drawer-body">
                    {task.status === 'in_progress' && (
                        <div className={`occ-progress ${task.running ? 'indeterminate' : ''}`} style={{ height: '6px' }}>
                            <div style={{ width: `${task.progress || 10}%`, background: st.color }} />
                        </div>
                    )}

                    {task.kind === 'mission' && <OfficeMission task={task} onOpenTask={onOpenTask} />}

                    {task.question && task.status === 'review' && (
                        <div className="tq">
                            <div className="tq-head">❓ {task.assignedAgent} te pregunta</div>
                            <p>{task.question.text}</p>
                            <span>Responde abajo con «Responder»: el agente sigue con tu respuesta.</span>
                        </div>
                    )}

                    {task.result ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="occ-label">Entregable</div>
                                <button className="occ-btn sm" onClick={() => { navigator.clipboard.writeText(task.result); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                                    <Copy size={11} /> {copied ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                            <div className="occ-result"><ReactMarkdown>{task.result}</ReactMarkdown></div>
                        </div>
                    ) : task.error ? (
                        <div className="occ-notice" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>{task.error}</div>
                    ) : null}

                    {task.kind !== 'mission' && <OfficeTaskFiles key={task.id} task={task} agents={agents} models={models} onChanged={refresh} onOpenTask={onOpenTask} />}

                    {(task.proposedHandoffs || []).length > 0 && (
                        <div>
                            <div className="occ-label">{task.status === 'done' ? 'Pasó el trabajo a' : 'Al aprobar, pasa el trabajo a'}</div>
                            {task.proposedHandoffs.map((h, i) => (
                                <div key={i} className="th">
                                    <b>{h.agentName}</b>: {h.task}
                                    {h.createdTaskId && <button className="occ-link" onClick={() => onOpenTask?.(h.createdTaskId)}>abrir tarea</button>}
                                    {h.error && <span style={{ color: '#fca5a5' }}> · {h.error}</span>}
                                    {h.skipped && <span className="occ-muted"> · no se creó: {h.skipped.toLowerCase()}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {task.kind !== 'mission' && (task.children || []).length > 0 && (
                        <div>
                            <div className="occ-label">Tareas de seguimiento</div>
                            {task.children.map(c => (
                                <button key={c.id} className="occ-link" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }} onClick={() => onOpenTask?.(c.id)}>
                                    <CornerDownRight size={12} /> {c.task} · {c.assignedAgent || 'abierta'} · <span style={{ color: statusMeta(TASK_STATUS, c.status).color }}>{statusMeta(TASK_STATUS, c.status).label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {task.description && (
                        <div>
                            <div className="occ-label">Instrucciones</div>
                            <div className="occ-muted" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</div>
                        </div>
                    )}

                    {(task.feedback || []).length > 0 && (
                        <div>
                            <div className="occ-label">Cambios que pediste</div>
                            <div className="occ-timeline">
                                {task.feedback.map((f, i) => <div key={i}><time>{fmtTime(f.at)}</time><span>{f.notes}</span></div>)}
                            </div>
                        </div>
                    )}

                    <OfficeTaskContext task={task} models={models} />

                    {runs.length > 0 && (
                        <div>
                            <div className="occ-label">Corridas ({runs.length}) · {fmtUSD(totalCost)}</div>
                            <table className="occ-table">
                                <thead><tr><th>Cuándo</th><th>Modelo</th><th>Tokens</th><th>Costo</th><th>Duración</th><th>Estado</th></tr></thead>
                                <tbody>
                                    {runs.slice().reverse().map((r, i) => (
                                        <tr key={i}>
                                            <td>{fmtTime(r.at)}</td>
                                            <td title={(r.failures || []).map(f => `${f.model}: ${f.error}`).join('\n') || undefined}>
                                                {modelLabel(models, r.model)}
                                                {r.fallbackFrom && <div style={{ fontSize: '10.5px', color: '#f5b638' }}>↪ respaldo de {modelLabel(models, r.fallbackFrom)}</div>}
                                            </td>
                                            <td>{fmtTokens((r.tokensIn || 0) + (r.tokensOut || 0))}</td>
                                            <td>{r.provider === 'externo' ? '—' : fmtUSD(r.costUSD)}</td>
                                            <td>{fmtMs(r.ms)}</td>
                                            <td style={{ color: r.ok ? '#6ee7b7' : '#fca5a5' }} title={r.error}>{r.ok ? 'OK' : 'Falló'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(task.history || []).length > 0 && (
                        <div>
                            <div className="occ-label">Historial</div>
                            <div className="occ-timeline">
                                {task.history.slice().reverse().map((h, i) => <div key={i}><time>{fmtTime(h.at)}</time><span>{h.text}</span></div>)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="occ-drawer-foot">
                    {error && <div className="occ-notice">{error}</div>}

                    {task.status === 'review' && (
                        <>
                            <textarea className="occ-textarea" placeholder={task.question ? 'Tu respuesta a la pregunta del agente…' : 'Si algo no está bien, escribe qué cambiar y el agente lo rehace…'} value={notes} onChange={e => setNotes(e.target.value)} />
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button className="occ-btn success" disabled={!!busy} onClick={() => act('approve', `/api/office/task/${task.id}/review`, { decision: 'approve', notes })}>
                                    <Check size={13} /> Aprobar y cerrar
                                </button>
                                <button className="occ-btn warn" disabled={!!busy || !notes.trim()} onClick={() => act('changes', `/api/office/task/${task.id}/review`, { decision: 'changes', notes })}>
                                    <PencilLine size={13} /> {task.question ? 'Responder' : 'Pedir cambios'}
                                </button>
                                <button className="occ-btn danger" disabled={!!busy} onClick={() => act('reject', `/api/office/task/${task.id}/review`, { decision: 'reject', notes })}>
                                    <Trash2 size={13} /> Descartar
                                </button>
                            </div>
                        </>
                    )}

                    {task.kind !== 'mission' && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {internal && ['queued', 'failed'].includes(task.status) && !task.running && (
                            <button className="occ-btn primary" disabled={!!busy} onClick={() => act('run', `/api/office/task/${task.id}/run`)}>
                                {task.status === 'failed' ? <RotateCcw size={13} /> : <Play size={13} />} {task.status === 'failed' ? 'Reintentar' : 'Ejecutar ahora'}
                            </button>
                        )}
                        {!['done', 'cancelled'].includes(task.status) && (
                            <>
                                <select className="occ-select" value={target} onChange={e => setTarget(e.target.value)} style={{ marginLeft: 'auto' }}>
                                    <option value="">Reasignar a…</option>
                                    <optgroup label="Conectados por MCP">
                                        {agents.filter(a => a.kind === 'external' && a.id !== task.assignedAgentId).map(a => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Internos">
                                        {agents.filter(a => a.kind !== 'external' && a.id !== task.assignedAgentId).map(a => <option key={a.id} value={a.id}>{a.avatar} {a.name} · {modelLabel(models, a.model)}</option>)}
                                    </optgroup>
                                </select>
                                <button className="occ-btn" disabled={!target || !!busy} onClick={() => act('reassign', `/api/office/task/${task.id}/reassign`, { agentId: target })}>
                                    <ArrowRightLeft size={13} /> Reasignar
                                </button>
                            </>
                        )}
                        {!['done', 'cancelled', 'review'].includes(task.status) && (
                            <button className="occ-btn danger" disabled={!!busy} onClick={() => window.confirm('¿Descartar esta tarea?') && act('reject', `/api/office/task/${task.id}/review`, { decision: 'reject' })}>
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>}
                </div>
            </aside>
        </div>
    );
}
