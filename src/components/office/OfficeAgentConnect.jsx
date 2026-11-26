import React, { useEffect, useState } from 'react';
import { X, Plug, Send, KeyRound } from 'lucide-react';
import { CopyBlock } from '../knowledge/AgentHubPanel';
import { setupSnippets } from '../knowledge/agentHubSnippets';
import { TASK_STATUS, AGENT_STATUS, statusMeta, timeAgo, fmtMs, postJson } from './officeUi';

// Lo que el agente externo necesita saber para trabajar la cola de la oficina.
export const WORKER_INSTRUCTIONS = `Trabajas para el CEO de ARRIVE a través de "ARRIVE Command Center" (MCP).
Cuando empieces una sesión o te pidan "revisa tus tareas":
1. Llama a get_my_office_tasks para ver lo que te asignaron en AI Office HQ.
2. Toma una con claim_office_task antes de trabajarla.
3. Usa get_context y search_knowledge para el contexto del proyecto.
4. Si tarda, cuenta el avance con report_office_progress.
5. Entrega el resultado completo en markdown con submit_office_result (indica el modelo que usaste).
   Si no puedes hacerla, entrégala con failed=true y explica por qué.
6. Si una tarea trae feedback del CEO, corrige tu entrega anterior según lo pedido.`;

function Modal({ title, icon, onClose, children, width = 680 }) {
    return (
        <div className="occ-drawer-backdrop" style={{ justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
            <div className="occ-drawer" style={{ width: `min(${width}px, 96vw)`, height: 'auto', maxHeight: '90vh', borderRadius: '18px', border: '1px solid var(--office-border)' }} onClick={e => e.stopPropagation()}>
                <div className="occ-drawer-head" style={{ alignItems: 'center' }}>
                    <h2 className="occ-section-title">{icon}{title}</h2>
                    <button className="occ-btn sm" onClick={onClose} aria-label="Cerrar"><X size={14} /></button>
                </div>
                <div className="occ-drawer-body">{children}</div>
            </div>
        </div>
    );
}

function useHubInfo() {
    const [info, setInfo] = useState(null);
    useEffect(() => { fetch('/api/agent-hub/info').then(r => r.json()).then(setInfo).catch(() => {}); }, []);
    return info;
}

export function ConnectAgentModal({ onClose, onCreated }) {
    const info = useHubInfo();
    const [name, setName] = useState('');
    const [scope, setScope] = useState('write');
    const [created, setCreated] = useState(null);
    const [error, setError] = useState('');

    const create = async () => {
        setError('');
        try {
            const r = await postJson('/api/agent-hub/tokens', { name, scope });
            setCreated(r);
            onCreated?.();
        } catch (e) { setError(e.message); }
    };
    const url = info?.publicUrl || info?.localUrl || '';

    return (
        <Modal title="Conectar un agente" icon={<Plug size={16} />} onClose={onClose}>
            {!created ? (
                <>
                    <p className="occ-muted" style={{ margin: 0 }}>
                        Cada agente recibe su propia llave: así ves en la oficina qué hace cada uno, le asignas tareas y puedes revocarlo cuando quieras.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input className="occ-input" style={{ flex: 1, minWidth: '220px' }} autoFocus placeholder="Nombre (ej. Claude Code Mac, ChatGPT, Hermes)" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && create()} />
                        <select className="occ-select" value={scope} onChange={e => setScope(e.target.value)}>
                            <option value="write">Puede leer y escribir</option>
                            <option value="read">Solo lectura</option>
                        </select>
                        <button className="occ-btn primary" disabled={!name.trim()} onClick={create}><KeyRound size={13} /> Crear llave</button>
                    </div>
                    {scope === 'read' && <div className="occ-notice">Con solo lectura el agente ve sus tareas pero no puede tomarlas ni entregarlas.</div>}
                    {error && <div className="occ-notice">{error}</div>}
                </>
            ) : (
                <>
                    <div className="occ-notice">Copia la llave ahora: no se vuelve a mostrar. Puedes revocarla en Agent &amp; RAG → Agentes conectados.</div>
                    {setupSnippets(url, created.token, info?.publicUrl).map(([label, text]) => <CopyBlock key={label} label={label} text={text} />)}
                    <CopyBlock label="Instrucciones para el agente (pégalas en su prompt o en sus instrucciones personalizadas)" text={WORKER_INSTRUCTIONS} />
                    <button className="occ-btn primary" style={{ alignSelf: 'flex-start' }} onClick={onClose}>Listo</button>
                </>
            )}
        </Modal>
    );
}

export function ExternalAgentModal({ agent, tasks = [], onClose, onOpenTask, onAssign }) {
    const [mission, setMission] = useState('');
    const [sending, setSending] = useState(false);
    const st = statusMeta(AGENT_STATUS, agent.status);
    const mine = tasks.filter(t => t.assignedAgentId === agent.id);

    const assign = async () => {
        setSending(true);
        await onAssign({ mission, targetAgent: agent.id, priority: 'high' });
        setMission('');
        setSending(false);
    };

    return (
        <Modal title={agent.name} icon={<span style={{ fontSize: '18px' }}>{agent.avatar}</span>} onClose={onClose} width={760}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="occ-chip" style={{ color: st.color }}>{st.label}</span>
                <span className="occ-chip">{agent.online ? 'En línea ahora' : `Última actividad ${timeAgo(agent.lastSeen)}`}</span>
                <span className="occ-chip">{agent.scope === 'write' ? 'Lee y escribe' : 'Solo lectura'}</span>
                <span className="occ-chip">{agent.hub?.calls ?? 0} llamadas en total</span>
            </div>

            <div>
                <div className="occ-label">Asignarle una tarea</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="occ-input" style={{ flex: 1 }} placeholder={`¿Qué debe hacer ${agent.name}?`} value={mission} onChange={e => setMission(e.target.value)} onKeyDown={e => e.key === 'Enter' && mission.trim() && assign()} />
                    <button className="occ-btn primary" disabled={!mission.trim() || sending || agent.scope !== 'write'} onClick={assign}><Send size={13} /> Asignar</button>
                </div>
                <div className="occ-muted" style={{ marginTop: '6px' }}>
                    {agent.scope !== 'write'
                        ? 'Esta llave es de solo lectura: el agente no podría entregar el resultado.'
                        : 'Queda en su cola. La toma cuando revise get_my_office_tasks (pídeselo en su chat o déjalo en sus instrucciones).'}
                </div>
            </div>

            <div>
                <div className="occ-label">Sus tareas ({mine.length})</div>
                {mine.length === 0 ? <div className="occ-muted">Sin tareas asignadas.</div> : (
                    <table className="occ-table">
                        <tbody>
                            {mine.map(t => {
                                const ts = statusMeta(TASK_STATUS, t.status);
                                return (
                                    <tr key={t.id} className="clickable" onClick={() => onOpenTask(t)}>
                                        <td>{t.task}</td>
                                        <td style={{ color: ts.color, whiteSpace: 'nowrap' }}>{ts.label}</td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{timeAgo(t.updatedAt || t.createdAt)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {agent.hub?.topTools?.length > 0 && (
                <div>
                    <div className="occ-label">Herramientas que más usa</div>
                    <div className="occ-chips">{agent.hub.topTools.map(t => <span key={t.tool} className="occ-chip">{t.tool} · {t.n}</span>)}</div>
                </div>
            )}

            <div>
                <div className="occ-label">Últimas llamadas</div>
                {(agent.hub?.recent || []).length === 0 ? <div className="occ-muted">Todavía no se ha conectado.</div> : (
                    <table className="occ-table">
                        <thead><tr><th>Cuándo</th><th>Herramienta</th><th>Detalle</th><th>Tiempo</th></tr></thead>
                        <tbody>
                            {agent.hub.recent.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(r.at)}</td>
                                    <td style={{ color: r.ok ? '#e2e8f0' : '#fca5a5', whiteSpace: 'nowrap' }}>{r.tool}</td>
                                    <td style={{ color: r.ok ? '#94a3b8' : '#fca5a5', wordBreak: 'break-word' }}>{r.ok ? r.args : r.error}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtMs(r.ms)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <CopyBlock label="Instrucciones para que trabaje la cola de la oficina" text={WORKER_INSTRUCTIONS} />
        </Modal>
    );
}
