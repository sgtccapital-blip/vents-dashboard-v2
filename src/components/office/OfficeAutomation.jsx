// Automatización de AI Office: tareas recurrentes (cada día, semana o mes, hora de Panamá)
// y avisos al teléfono con ntfy (entregas, preguntas, fallos, presupuesto, misiones).
import React, { useCallback, useEffect, useState } from 'react';
import { Repeat, Bell, Play, Trash2, Plus, Send, Pause } from 'lucide-react';
import { timeAgo, TASK_STATUS, statusMeta } from './officeUi';

const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const EMPTY = { agentId: '', task: '', description: '', every: 'weekdays', time: '09:00', days: [1], monthDay: 1, autoRun: true };

const api = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
    return d;
};

const fmtWhen = iso => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es', { timeZone: 'America/Panama', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function ScheduleForm({ agents, every, initial, onSave, onCancel }) {
    const [f, setF] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const toggleDay = d => set('days', f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort());
    const submit = async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await onSave({
                agentId: f.agentId, task: f.task, description: f.description, autoRun: f.autoRun,
                cadence: { every: f.every, time: f.time, days: f.days, monthDay: Number(f.monthDay) },
            });
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };
    return (
        <form className="au-form" onSubmit={submit}>
            <div className="au-grid">
                <label>
                    <span className="occ-label">Agente</span>
                    <select className="occ-input" value={f.agentId} onChange={e => set('agentId', e.target.value)} required>
                        <option value="">Elige un agente…</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.avatar || '🤖'} {a.name}{a.kind === 'external' ? ' (MCP)' : ''}</option>)}
                    </select>
                </label>
                <label>
                    <span className="occ-label">Frecuencia</span>
                    <select className="occ-input" value={f.every} onChange={e => set('every', e.target.value)}>
                        {Object.entries(every).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </label>
                <label>
                    <span className="occ-label">Hora (Panamá)</span>
                    <input className="occ-input" type="time" value={f.time} onChange={e => set('time', e.target.value)} required />
                </label>
            </div>
            {f.every === 'weekly' && (
                <div className="au-days">
                    {DAYS.map((d, i) => (
                        <button key={i} type="button" className={`au-day ${f.days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{d}</button>
                    ))}
                </div>
            )}
            {f.every === 'monthly' && (
                <label className="au-inline">
                    <span className="occ-label">Día del mes</span>
                    <input className="occ-input" type="number" min="1" max="31" value={f.monthDay} onChange={e => set('monthDay', e.target.value)} />
                    <small className="occ-muted">Si el mes es más corto, corre el último día.</small>
                </label>
            )}
            <label>
                <span className="occ-label">Qué tiene que hacer</span>
                <input className="occ-input" value={f.task} onChange={e => set('task', e.target.value)} placeholder="Ej.: Resumen de ventas de mesas VIP de la semana" required />
            </label>
            <label>
                <span className="occ-label">Instrucciones (opcional)</span>
                <textarea className="occ-input" rows={3} value={f.description} onChange={e => set('description', e.target.value)} placeholder="Qué revisar, en qué formato entregarlo, a quién va dirigido…" />
            </label>
            <label className="tl-row">
                <input type="checkbox" checked={f.autoRun} onChange={e => set('autoRun', e.target.checked)} />
                <span>
                    <b>Que arranque sola</b>
                    <small>Los agentes internos empiezan apenas se crea la tarea. Si la de la vez anterior sigue abierta, esta vuelta se salta para no apilar copias.</small>
                </span>
            </label>
            {error && <div className="occ-notice">{error}</div>}
            <div className="au-actions">
                <button type="button" className="occ-btn sm" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="occ-btn sm primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
            </div>
        </form>
    );
}

function Schedules({ agents, onOpenTask }) {
    const [data, setData] = useState(null);
    const [editing, setEditing] = useState(null); // null | 'new' | schedule
    const [error, setError] = useState('');
    const load = useCallback(() => api('/api/office/schedules').then(setData).catch(e => setError(e.message)), []);
    useEffect(() => { load(); }, [load]);

    const act = async fn => {
        setError('');
        try { await fn(); } catch (e) { setError(e.message); }
        load();
    };
    const save = async body => {
        if (editing === 'new') await api('/api/office/schedules', { method: 'POST', body: JSON.stringify(body) });
        else await api(`/api/office/schedules/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setEditing(null);
        load();
    };
    const formFor = sc => (sc === 'new' ? EMPTY : {
        agentId: sc.agentId, task: sc.task, description: sc.description || '', autoRun: sc.autoRun !== false,
        every: sc.cadence.every, time: sc.cadence.time, days: sc.cadence.days || [1], monthDay: sc.cadence.monthDay || 1,
    });

    return (
        <section className="occ-section">
            <div className="occ-section-head">
                <h2 className="occ-section-title"><Repeat size={16} /> Tareas recurrentes</h2>
                {!editing && <button className="occ-btn sm primary" onClick={() => setEditing('new')}><Plus size={12} /> Nueva</button>}
            </div>
            <p className="occ-muted au-help">Trabajo que se repite: el resumen del lunes, el reporte de mesas VIP del viernes, el cierre de mes. A la hora indicada se crea la tarea para el agente y pasa por tu revisión como cualquier otra.</p>
            {error && <div className="occ-notice">{error}</div>}
            {editing && <ScheduleForm key={editing === 'new' ? 'new' : editing.id} agents={agents} every={data?.every || {}} initial={formFor(editing)} onSave={save} onCancel={() => setEditing(null)} />}
            {data?.schedules?.length === 0 && !editing && <p className="au-empty">Todavía no hay tareas recurrentes.</p>}
            <div className="au-list">
                {(data?.schedules || []).map(sc => {
                    const last = sc.lastTaskStatus ? statusMeta(TASK_STATUS, sc.lastTaskStatus) : null;
                    return (
                        <div key={sc.id} className={`au-row ${sc.enabled ? '' : 'off'}`}>
                            <div className="au-main">
                                <b>{sc.task}</b>
                                <span className="occ-muted">{sc.agentName} · {sc.cadenceText}{sc.autoRun === false ? ' · sin arranque automático' : ''}</span>
                                <span className="au-meta">
                                    {sc.enabled ? <>Próxima: <b>{fmtWhen(sc.nextRunAt)}</b></> : <b>En pausa</b>}
                                    {sc.lastRunAt && <> · Última: {timeAgo(sc.lastRunAt)}{last && <button type="button" className="occ-link" style={{ color: last.color }} onClick={() => onOpenTask?.({ id: sc.lastTaskId })}>{last.label}</button>}</>}
                                    {sc.skipped > 0 && <> · {sc.skipped} vuelta(s) saltada(s)</>}
                                    {sc.lastError && <span style={{ color: '#fca5a5' }}> · {sc.lastError}</span>}
                                </span>
                            </div>
                            <div className="au-btns">
                                <button className="occ-btn sm" title="Crear la tarea ahora" onClick={() => act(() => api(`/api/office/schedules/${sc.id}/run`, { method: 'POST' }))}><Play size={12} /> Correr ahora</button>
                                <button className="occ-btn sm" title={sc.enabled ? 'Pausar' : 'Reanudar'} onClick={() => act(() => api(`/api/office/schedules/${sc.id}`, { method: 'PUT', body: JSON.stringify({ enabled: !sc.enabled }) }))}>
                                    {sc.enabled ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <button className="occ-btn sm" onClick={() => setEditing(sc)}>Editar</button>
                                <button className="occ-btn sm danger" title="Borrar" onClick={() => window.confirm(`¿Borrar «${sc.task}»? Las tareas que ya creó se quedan.`) && act(() => api(`/api/office/schedules/${sc.id}`, { method: 'DELETE' }))}><Trash2 size={12} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function Notifications() {
    const [data, setData] = useState(null);
    const [topic, setTopic] = useState('');
    const [server, setServer] = useState('');
    const [msg, setMsg] = useState(null);
    const load = useCallback(() => api('/api/office/notify').then(d => {
        setData(d);
        setTopic(d.settings.topic || '');
        setServer(d.settings.server === 'https://ntfy.sh' ? '' : d.settings.server);
    }).catch(e => setMsg({ error: e.message })), []);
    useEffect(() => { load(); }, [load]);
    if (!data) return null;
    const s = data.settings;

    const save = async patch => {
        setMsg(null);
        try {
            const d = await api('/api/office/notify', { method: 'PUT', body: JSON.stringify(patch) });
            setData(p => ({ ...p, settings: d.settings }));
            return true;
        } catch (e) { setMsg({ error: e.message }); return false; }
    };
    const test = async () => {
        setMsg(null);
        if (topic !== s.topic && !(await save({ topic, server, enabled: true }))) return;
        try {
            await api('/api/office/notify/test', { method: 'POST' });
            setMsg({ ok: 'Prueba enviada: debería llegarte en unos segundos.' });
        } catch (e) { setMsg({ error: e.message }); }
    };

    return (
        <section className="occ-section">
            <div className="occ-section-head">
                <h2 className="occ-section-title"><Bell size={16} /> Avisos al teléfono</h2>
                <label className="au-switch">
                    <input type="checkbox" checked={s.enabled} disabled={!s.topic} onChange={e => save({ enabled: e.target.checked })} />
                    <span>{s.enabled ? 'Activados' : 'Apagados'}</span>
                </label>
            </div>
            <ol className="au-steps">
                <li>Instala <b>ntfy</b> en tu teléfono (App Store o Google Play; es gratis y no pide cuenta).</li>
                <li>Guarda un canal aquí. El nombre es la clave: cualquiera que lo sepa puede leer los avisos, así que usa uno difícil de adivinar.</li>
                <li>En la app toca <b>+</b>, escribe el mismo canal{server ? ` y el servidor ${server}` : ''}, y pulsa <b>Enviar prueba</b>.</li>
            </ol>
            <div className="au-grid">
                <label>
                    <span className="occ-label">Canal</span>
                    <div className="au-topic">
                        <input className="occ-input" value={topic} onChange={e => setTopic(e.target.value.trim())} placeholder={data.suggestedTopic} />
                        {!topic && <button type="button" className="occ-btn sm" onClick={() => setTopic(data.suggestedTopic)}>Usar sugerido</button>}
                    </div>
                </label>
                <label>
                    <span className="occ-label">Servidor (opcional)</span>
                    <input className="occ-input" value={server} onChange={e => setServer(e.target.value.trim())} placeholder="https://ntfy.sh" />
                </label>
            </div>
            <p className="occ-muted au-help">
                Con ntfy.sh, el texto del aviso (nombre del agente y título de la tarea) pasa por su servidor. Las entregas completas nunca salen del dashboard: el aviso solo trae un enlace{s.hasToken ? '. Se usa el token NTFY_TOKEN de .env' : ''}.
            </p>
            <div className="au-actions" style={{ justifyContent: 'flex-start' }}>
                <button className="occ-btn sm" disabled={topic === s.topic && (server || 'https://ntfy.sh') === s.server} onClick={async () => { if (await save({ topic, server, ...(topic && !s.topic ? { enabled: true } : {}) })) setMsg({ ok: 'Guardado' }); }}>Guardar canal</button>
                <button className="occ-btn sm primary" disabled={!topic} onClick={test}><Send size={12} /> Enviar prueba</button>
            </div>
            {msg?.ok && <div className="au-ok">{msg.ok}</div>}
            {msg?.error && <div className="occ-notice">{msg.error}</div>}

            <div className="occ-label" style={{ marginTop: 14 }}>Qué te avisa</div>
            <div className="au-events">
                {Object.entries(data.events).map(([k, ev]) => (
                    <label key={k} className="au-ev">
                        <input type="checkbox" checked={Boolean(s.events[k])} onChange={e => save({ events: { [k]: e.target.checked } })} />
                        <span>{ev.label}</span>
                    </label>
                ))}
            </div>
        </section>
    );
}

export default function OfficeAutomation({ agents, onOpenTask }) {
    const usable = (agents || []).filter(a => a.kind === 'internal' || a.kind === 'external');
    return (
        <div className="occ au">
            <Schedules agents={usable} onOpenTask={onOpenTask} />
            <Notifications />
        </div>
    );
}
