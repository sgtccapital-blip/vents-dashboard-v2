import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Check, PencilLine, Trash2, Play, RotateCcw, ArrowRightLeft, Copy } from 'lucide-react';
import { TASK_STATUS, statusMeta, modelLabel, fmtUSD, fmtTokens, fmtMs, postJson } from './officeUi';

const fmtTime = iso => (iso ? new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function OfficeTaskDrawer({ taskId, agents = [], models, onClose, onChanged }) {
    const [task, setTask] = useState(null);
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
    }, [taskId]);

    if (!task) return null;
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
            onChanged?.();
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
                        </div>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{task.task}</h2>
                        {task.currentStep && <div className="occ-muted" style={{ marginTop: '4px' }}>{task.currentStep}</div>}
                    </div>
                    <button className="occ-btn sm" onClick={onClose} aria-label="Cerrar"><X size={14} /></button>
                </div>

                <div className="occ-drawer-body">
                    {task.status === 'in_progress' && (
                        <div className={`occ-progress ${task.running ? 'indeterminate' : ''}`} style={{ height: '6px' }}>
                            <div style={{ width: `${task.progress || 10}%`, background: st.color }} />
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

                    {runs.length > 0 && (
                        <div>
                            <div className="occ-label">Corridas ({runs.length}) · {fmtUSD(totalCost)}</div>
                            <table className="occ-table">
                                <thead><tr><th>Cuándo</th><th>Modelo</th><th>Tokens</th><th>Costo</th><th>Duración</th><th>Estado</th></tr></thead>
                                <tbody>
                                    {runs.slice().reverse().map((r, i) => (
                                        <tr key={i}>
                                            <td>{fmtTime(r.at)}</td>
                                            <td>{modelLabel(models, r.model)}</td>
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
                            <textarea className="occ-textarea" placeholder="Si algo no está bien, escribe qué cambiar y el agente lo rehace…" value={notes} onChange={e => setNotes(e.target.value)} />
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button className="occ-btn success" disabled={!!busy} onClick={() => act('approve', `/api/office/task/${task.id}/review`, { decision: 'approve', notes })}>
                                    <Check size={13} /> Aprobar y cerrar
                                </button>
                                <button className="occ-btn warn" disabled={!!busy || !notes.trim()} onClick={() => act('changes', `/api/office/task/${task.id}/review`, { decision: 'changes', notes })}>
                                    <PencilLine size={13} /> Pedir cambios
                                </button>
                                <button className="occ-btn danger" disabled={!!busy} onClick={() => act('reject', `/api/office/task/${task.id}/review`, { decision: 'reject', notes })}>
                                    <Trash2 size={13} /> Descartar
                                </button>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                    </div>
                </div>
            </aside>
        </div>
    );
}
