// Operación del conector MCP: salud del gateway y del ejecutor, permisos por agente, workspaces,
// trabajos, cambios (parches), despliegues, decisiones propuestas, errores y costos.
// Todo sale de /api/agent-hub/ops/overview; las acciones usan los endpoints de administración.
import { createElement, useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Server, FolderGit2, PlayCircle, GitBranch, Rocket, Scale, AlertTriangle, RefreshCw, XCircle, Ban, RotateCcw, Save, FileText } from 'lucide-react';

const API = '/api/agent-hub';
const send = async (url, method = 'GET', body) => {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || data.message || `Error ${r.status}`);
    return data;
};
const card = { padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px' };
const input = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'white', padding: '7px 10px', fontSize: '13px' };
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };
const muted = { color: 'var(--text-secondary)', fontSize: '12.5px' };
const th = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' };
const td = { padding: '7px 8px', borderTop: '1px solid var(--border-subtle)', verticalAlign: 'top' };
const fmt = d => (d ? new Date(d).toLocaleString('es', { timeZone: 'America/Panama', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const STATUS = {
    connected: ['Conectado', '#10b981'], configured: ['Configurado', '#10b981'], requires_configuration: ['Requiere configuración', '#f59e0b'],
    pending: ['Pendiente', '#94a3b8'], not_configured: ['No configurado', '#94a3b8'], offline: ['Apagado', '#f87171'],
    queued: ['En cola', '#38bdf8'], running: ['Ejecutando', '#38bdf8'], succeeded: ['Correcto', '#10b981'], failed: ['Falló', '#f87171'],
    cancelled: ['Cancelado', '#94a3b8'], timed_out: ['Tiempo agotado', '#f87171'], interrupted: ['Interrumpido', '#f59e0b'],
    prepared: ['Preparado', '#38bdf8'], validated: ['Validado', '#38bdf8'], released: ['Desplegado', '#10b981'], rolled_back: ['Revertido', '#f59e0b'],
    preparing: ['Preparando', '#38bdf8'], validating: ['Validando', '#38bdf8'], releasing: ['Desplegando', '#38bdf8'],
    applied: ['Aplicado', '#10b981'], conflict: ['Conflicto', '#f87171'], proposed: ['Propuesta', '#f59e0b'],
};
function Chip({ status }) {
    const [label, color] = STATUS[status] || [status || '—', '#94a3b8'];
    return <span style={{ fontSize: '11.5px', fontWeight: 600, color, border: `1px solid ${color}55`, background: `${color}14`, borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{label}</span>;
}
const Section = ({ icon, title, right, children }) => (
    <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>{createElement(icon, { size: 16 })} {title}</h4>
            {right}
        </div>
        {children}
    </div>
);
const Table = ({ head, children }) => (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr>{head.map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{children}</tbody>
        </table>
    </div>
);

const TABS = [['health', 'Salud', Server], ['access', 'Permisos', ShieldCheck], ['workspaces', 'Workspaces', FolderGit2], ['jobs', 'Trabajos', PlayCircle], ['changes', 'Cambios y despliegues', GitBranch], ['decisions', 'Decisiones', Scale], ['errors', 'Errores y costos', AlertTriangle]];

export default function AgentOpsPanel() {
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('health');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const load = useCallback(async () => {
        try { setData(await send(`${API}/ops/overview`)); setError(''); } catch (e) { setError(e.message); }
    }, []);
    useEffect(() => {
        const first = setTimeout(load, 0);
        const t = setInterval(load, 8000);
        return () => { clearTimeout(first); clearInterval(t); };
    }, [load]);
    const act = async (fn, ok) => {
        setError(''); setNotice('');
        try { const r = await fn(); if (ok) setNotice(typeof ok === 'function' ? ok(r) : ok); await load(); return r; } catch (e) { setError(e.message); return null; }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {TABS.map(([id, label, icon]) => (
                    <button key={id} className={`btn ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTab(id); setNotice(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        {createElement(icon, { size: 14 })} {label}
                        {id === 'decisions' && data?.decisionsPending?.length ? <span style={{ fontSize: '11px', background: '#f59e0b', color: '#111', borderRadius: '999px', padding: '0 6px' }}>{data.decisionsPending.length}</span> : null}
                    </button>
                ))}
                <button className="btn btn-ghost" onClick={load} aria-label="Actualizar" style={{ marginLeft: 'auto' }}><RefreshCw size={15} /></button>
            </div>
            {error && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>}
            {notice && <p style={{ color: '#10b981', fontSize: '13px', margin: 0 }}>{notice}</p>}
            {!data && !error && <p style={muted}>Cargando…</p>}
            {data && tab === 'health' && <Health data={data} act={act} />}
            {data && tab === 'access' && <Access data={data} act={act} />}
            {data && tab === 'workspaces' && <Workspaces data={data} act={act} />}
            {data && tab === 'jobs' && <Jobs data={data} act={act} />}
            {data && tab === 'changes' && <Changes data={data} />}
            {data && tab === 'decisions' && <Decisions data={data} act={act} />}
            {data && tab === 'errors' && <Errors data={data} />}
        </div>
    );
}

function Health({ data, act }) {
    const ex = data.executor || {};
    const av = data.availability || {};
    return (
        <>
            <Section icon={Server} title="Servicios">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                    <div style={{ ...card, padding: '14px' }}>
                        <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>Gateway MCP <Chip status="connected" /></div>
                        <div style={muted}>Versión {data.version} · dashboard {data.dashboardVersion}</div>
                        <div style={muted}>{av.gateway?.location}</div>
                    </div>
                    <div style={{ ...card, padding: '14px' }}>
                        <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>Ejecutor de trabajos <Chip status={ex.online ? 'connected' : 'offline'} /></div>
                        <div style={muted}>Último latido: {fmt(ex.lastHeartbeat)}{ex.host ? ` · ${ex.host}` : ''}</div>
                        {!ex.online && <button className="btn btn-ghost" style={{ marginTop: '8px', fontSize: '13px' }} onClick={() => act(() => send(`${API}/runner/start`, 'POST'), 'Ejecutor arrancado; aparecerá en línea en unos segundos.')}><PlayCircle size={14} /> Arrancar ejecutor</button>}
                    </div>
                </div>
                {av.executor?.waiting?.length > 0 && <p style={{ ...muted, color: '#f59e0b', marginTop: '10px' }}>Esperan al ejecutor: {av.executor.waiting.join(', ')}. Los trabajos quedan en cola y arrancan al volver.</p>}
                {av.ifMacOff && <p style={{ ...muted, marginTop: '8px' }}>{av.ifMacOff}</p>}
            </Section>
            <Section icon={ShieldCheck} title="Integraciones">
                <Table head={['Integración', 'Estado', 'Detalle']}>
                    {(data.integrations || []).map(i => (
                        <tr key={i.id}>
                            <td style={td}><b>{i.label}</b><div style={muted}>{i.category}</div></td>
                            <td style={td}><Chip status={i.status} /></td>
                            <td style={{ ...td, ...muted }}>{[i.note, i.verifiedBy && `Comprobado por: ${i.verifiedBy}`, i.mcpPermission && `Permiso MCP: ${i.mcpPermission}`].filter(Boolean).join(' · ') || '—'}</td>
                        </tr>
                    ))}
                </Table>
            </Section>
        </>
    );
}

function PolicyRow({ p, functions, workspaces, act }) {
    const base = p.policy && !p.policy.revoked ? p.policy : p.effective;
    const [draft, setDraft] = useState(() => ({ ...Object.fromEntries(Object.keys(functions).map(fn => [fn, base[fn] || 'none'])), workspaces: base.workspaces === '*' ? '*' : (base.workspaces || []).join(', ') }));
    const save = () => act(() => send(`${API}/policies/${encodeURIComponent(p.principal)}`, 'PUT', { ...draft, workspaces: draft.workspaces.trim() === '*' ? '*' : draft.workspaces.split(',').map(s => s.trim()).filter(Boolean) }), `Permisos de ${p.name} guardados. Se aplican en su próxima llamada.`);
    const revoke = () => window.confirm(`¿Revocar todo el acceso de "${p.name}"? Su llave o cliente OAuth dejará de funcionar de inmediato.`) && act(() => send(`${API}/policies/${encodeURIComponent(p.principal)}/revoke`, 'POST'), `${p.name} revocado.`);
    const reset = () => act(() => send(`${API}/policies/${encodeURIComponent(p.principal)}`, 'DELETE'), `${p.name} vuelve al permiso básico de su llave.`);
    const revoked = p.revoked || p.policy?.revoked;
    return (
        <tr style={{ opacity: revoked ? 0.55 : 1 }}>
            <td style={td}><b>{p.name}</b><div style={muted}>{p.kind === 'oauth' ? 'ChatGPT (OAuth)' : p.kind === 'office' ? 'Agente interno de AI Office' : 'Llave cc_'} · {p.calls ?? '—'} llamadas</div><div style={{ ...mono, ...muted }}>{p.principal}</div></td>
            {Object.entries(functions).map(([fn, def]) => (
                <td key={fn} style={td}>
                    <select disabled={revoked} value={draft[fn]} onChange={e => setDraft(d => ({ ...d, [fn]: e.target.value }))} style={input} aria-label={`${def.label} de ${p.name}`}>
                        {def.levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    {p.effective?.[fn] !== draft[fn] && !revoked && <div style={{ fontSize: '11px', color: '#94a3b8' }}>efectivo: {p.effective?.[fn]}</div>}
                </td>
            ))}
            <td style={td}>
                <input disabled={revoked} value={draft.workspaces} onChange={e => setDraft(d => ({ ...d, workspaces: e.target.value }))} placeholder="ninguno" list="ops-ws" style={{ ...input, width: '140px' }} aria-label={`Workspaces de ${p.name}`} />
                <datalist id="ops-ws">{workspaces.map(w => <option key={w.id} value={w.id} />)}</datalist>
            </td>
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                {revoked ? <Chip status="cancelled" /> : <>
                    <button className="btn btn-ghost" onClick={save} title="Guardar permisos" aria-label={`Guardar permisos de ${p.name}`}><Save size={14} /></button>
                    <button className="btn btn-ghost" onClick={reset} title="Volver al permiso de la llave" aria-label={`Restablecer ${p.name}`}><RotateCcw size={14} /></button>
                    <button className="btn btn-ghost" onClick={revoke} title="Revocar" style={{ color: '#f87171' }} aria-label={`Revocar ${p.name}`}><Ban size={14} /></button>
                </>}
            </td>
        </tr>
    );
}

function Access({ data, act }) {
    const fns = data.functions || {};
    return (
        <Section icon={ShieldCheck} title="Permisos por agente">
            <p style={{ ...muted, marginTop: 0 }}>Los permisos se comprueban en el servidor en cada operación y duran hasta que los cambies o revoques: el agente no tiene que pedir confirmación en cada acción rutinaria. Un cliente autorizado solo con lectura nunca escribe, aunque aquí tenga más. Workspaces: ids separados por comas, o * para todos.</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {Object.entries(fns).map(([fn, def]) => <span key={fn} style={muted} title={def.help}><b style={{ color: 'white' }}>{def.label}</b>: {def.levels.join(' → ')}</span>)}
            </div>
            <Table head={['Agente', ...Object.values(fns).map(f => f.label), 'Workspaces', '']}>
                {!data.principals?.length && <tr><td colSpan={9} style={{ ...td, ...muted }}>Ningún agente conectado. Crea una llave arriba o conecta ChatGPT por OAuth.</td></tr>}
                {(data.principals || []).map(p => <PolicyRow key={`${p.principal}-${p.policy?.version || 0}`} p={p} functions={fns} workspaces={data.workspaces || []} act={act} />)}
            </Table>
        </Section>
    );
}

function Workspaces({ data, act }) {
    const [form, setForm] = useState({ id: '', path: '', description: '' });
    const [gitInfo, setGitInfo] = useState(null);
    const add = async () => { if (await act(() => send(`${API}/workspaces/${encodeURIComponent(form.id)}`, 'PUT', { path: form.path, description: form.description }), `Workspace ${form.id} registrado.`)) setForm({ id: '', path: '', description: '' }); };
    const toggle = w => act(() => send(`${API}/workspaces/${encodeURIComponent(w.id)}`, 'PUT', { ...w, enabled: !w.enabled }), `${w.id} ${w.enabled ? 'desactivado' : 'activado'}.`);
    const remove = w => window.confirm(`¿Quitar el workspace "${w.id}" del registro? No borra archivos.`) && act(() => send(`${API}/workspaces/${encodeURIComponent(w.id)}`, 'DELETE'), `${w.id} quitado del registro.`);
    const status = async w => { const r = await act(() => send(`${API}/workspaces/${encodeURIComponent(w.id)}/status`)); if (r) setGitInfo({ id: w.id, ...r }); };
    return (
        <Section icon={FolderGit2} title="Workspaces y repositorios autorizados">
            <p style={{ ...muted, marginTop: 0 }}>Los agentes solo leen, parchean o ejecutan dentro de estas carpetas (rutas y enlaces simbólicos resueltos). .git, .env, llaves y los datos internos del dashboard nunca se exponen.</p>
            <Table head={['Workspace', 'Ruta', 'Tipo', 'Trabajos', 'Ramas protegidas', 'Estado', '']}>
                {(data.workspaces || []).map(w => (
                    <tr key={w.id}>
                        <td style={td}><b style={mono}>{w.id}</b><div style={muted}>{w.description || w.name}</div></td>
                        <td style={{ ...td, ...mono, ...muted, maxWidth: '260px', overflowWrap: 'anywhere' }}>{w.path}</td>
                        <td style={td}>{w.kind}{w.branch ? ` · ${w.branch}` : ''}</td>
                        <td style={{ ...td, ...muted }}>{Object.keys(w.jobs || {}).join(', ') || '—'}{w.allowedScripts?.length ? ` · scripts: ${w.allowedScripts.join(', ')}` : ''}</td>
                        <td style={{ ...td, ...muted }}>{(w.protectedBranches || []).join(', ')}</td>
                        <td style={td}><Chip status={w.enabled === false ? 'cancelled' : 'connected'} /></td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                            {w.kind === 'git' && <button className="btn btn-ghost" onClick={() => status(w)} title="Estado de Git" aria-label={`Estado de Git de ${w.id}`}><GitBranch size={14} /></button>}
                            <button className="btn btn-ghost" onClick={() => toggle(w)} style={{ fontSize: '12px' }}>{w.enabled === false ? 'Activar' : 'Desactivar'}</button>
                            <button className="btn btn-ghost" onClick={() => remove(w)} style={{ color: '#f87171' }} aria-label={`Quitar ${w.id}`}><XCircle size={14} /></button>
                        </td>
                    </tr>
                ))}
            </Table>
            {gitInfo && (
                <div style={{ ...card, padding: '12px', marginTop: '10px' }}>
                    <div style={{ fontWeight: 700 }}>{gitInfo.id} · rama {gitInfo.branch || '—'} · {gitInfo.head?.slice?.(0, 10) || ''}</div>
                    <div style={muted}>{gitInfo.clean ? 'Sin cambios' : `${(gitInfo.files || []).length} archivos con cambios`}{gitInfo.ahead || gitInfo.behind ? ` · +${gitInfo.ahead || 0}/−${gitInfo.behind || 0}` : ''}</div>
                    <div style={{ ...mono, ...muted, maxHeight: '160px', overflow: 'auto', marginTop: '6px' }}>{(gitInfo.files || []).slice(0, 60).map(f => <div key={f.path}>{f.index}{f.worktree} {f.path}{f.hidden ? ' (oculto a agentes)' : ''}</div>)}</div>
                </div>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="id (ej. web-the-room)" style={{ ...input, width: '170px' }} />
                <input value={form.path} onChange={e => setForm(f => ({ ...f, path: e.target.value }))} placeholder="Ruta absoluta en esta Mac" style={{ ...input, flex: 1, minWidth: '220px' }} />
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción" style={{ ...input, width: '200px' }} />
                <button className="btn btn-primary" disabled={!form.id.trim() || !form.path.trim()} onClick={add}>Registrar</button>
            </div>
        </Section>
    );
}

function Jobs({ data, act }) {
    const enabled = (data.workspaces || []).filter(w => w.enabled !== false);
    const [ws, setWs] = useState(enabled[0]?.id || '');
    const [type, setType] = useState('test');
    const [logs, setLogs] = useState(null);
    const jobs = data.jobs?.jobs || [];
    const active = jobs.filter(j => ['queued', 'running'].includes(j.status));
    const types = Object.keys(enabled.find(w => w.id === ws)?.jobs || {});
    const start = () => act(() => send(`${API}/jobs`, 'POST', { type, workspace: ws }), r => `Trabajo ${r.id} en cola.`);
    const showLogs = async j => { try { setLogs({ id: j.id, ...(await send(`${API}/jobs/${j.id}/logs`)) }); } catch (e) { setLogs({ id: j.id, text: e.message }); } };
    return (
        <Section icon={PlayCircle} title={`Trabajos${active.length ? ` · ${active.length} activos` : ''}`} right={
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <select value={ws} onChange={e => setWs(e.target.value)} style={input} aria-label="Workspace">{enabled.map(w => <option key={w.id} value={w.id}>{w.id}</option>)}</select>
                <select value={type} onChange={e => setType(e.target.value)} style={input} aria-label="Tipo de trabajo">{(types.length ? types : ['test']).map(t => <option key={t} value={t}>{t}</option>)}</select>
                <button className="btn btn-primary" disabled={!ws} onClick={start}>Lanzar</button>
            </div>
        }>
            {!data.executor?.online && <p style={{ ...muted, color: '#f59e0b', marginTop: 0 }}>El ejecutor está apagado: lo que lances queda en cola hasta que arranque (pestaña Salud).</p>}
            <Table head={['Trabajo', 'Workspace', 'Estado', 'Solicitado por', 'Creado', 'Terminó', 'Salida', '']}>
                {!jobs.length && <tr><td colSpan={8} style={{ ...td, ...muted }}>Sin trabajos todavía.</td></tr>}
                {jobs.map(j => (
                    <tr key={j.id}>
                        <td style={td}><b>{j.type}{j.script ? `:${j.script}` : ''}</b><div style={{ ...mono, ...muted }}>{j.id}</div>{j.summary && j.type === 'test' && <div style={muted}>{typeof j.summary === 'string' ? j.summary : [j.summary.tests != null && `${j.summary.pass ?? 0}/${j.summary.tests} pruebas`, j.summary.fail ? `${j.summary.fail} fallos` : null].filter(Boolean).join(' · ')}</div>}</td>
                        <td style={{ ...td, ...mono }}>{j.workspace}</td>
                        <td style={td}><Chip status={j.status} /></td>
                        <td style={{ ...td, ...muted }}>{j.requestedBy || '—'}</td>
                        <td style={{ ...td, ...muted }}>{fmt(j.createdAt)}</td>
                        <td style={{ ...td, ...muted }}>{fmt(j.finishedAt)}</td>
                        <td style={{ ...td, ...mono }}>{j.exitCode ?? '—'}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                            <button className="btn btn-ghost" onClick={() => showLogs(j)} title="Ver registro" aria-label={`Registro de ${j.id}`}><FileText size={14} /></button>
                            {['queued', 'running'].includes(j.status) && <button className="btn btn-ghost" style={{ color: '#f87171' }} onClick={() => act(() => send(`${API}/jobs/${j.id}/cancel`, 'POST'), `Cancelación de ${j.id} solicitada.`)} aria-label={`Cancelar ${j.id}`}><XCircle size={14} /></button>}
                        </td>
                    </tr>
                ))}
            </Table>
            {logs && (
                <div style={{ ...card, padding: '12px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={mono}>{logs.id}</b><button className="btn btn-ghost" onClick={() => setLogs(null)}>Cerrar</button></div>
                    <pre style={{ ...mono, whiteSpace: 'pre-wrap', maxHeight: '320px', overflow: 'auto', margin: '6px 0 0', color: 'var(--text-secondary)' }}>{logs.text || logs.content || '(sin salida)'}</pre>
                </div>
            )}
        </Section>
    );
}

function Changes({ data }) {
    return (
        <>
            <Section icon={GitBranch} title="Cambios preparados por agentes">
                <Table head={['Parche', 'Workspace', 'Estado', 'Archivos', 'Autor', 'Creado', 'Aplicado']}>
                    {!data.patches?.length && <tr><td colSpan={7} style={{ ...td, ...muted }}>Ningún parche todavía.</td></tr>}
                    {(data.patches || []).map(p => (
                        <tr key={p.patchId}>
                            <td style={td}><div style={mono}>{p.patchId}</div><div style={muted}>{p.description}</div></td>
                            <td style={{ ...td, ...mono }}>{p.workspace}</td>
                            <td style={td}><Chip status={p.status} /></td>
                            <td style={{ ...td, ...mono, ...muted }}>{p.files.slice(0, 4).join(', ')}{p.files.length > 4 ? ` +${p.files.length - 4}` : ''}</td>
                            <td style={{ ...td, ...muted }}>{p.createdBy}</td>
                            <td style={{ ...td, ...muted }}>{fmt(p.createdAt)}</td>
                            <td style={{ ...td, ...muted }}>{fmt(p.appliedAt)}</td>
                        </tr>
                    ))}
                </Table>
            </Section>
            <Section icon={Rocket} title="Despliegues">
                <Table head={['Despliegue', 'Workspace', 'Commit', 'Artefacto', 'Estado', 'Creado', 'Publicado']}>
                    {!data.deployments?.length && <tr><td colSpan={7} style={{ ...td, ...muted }}>Ningún despliegue todavía. Requieren un workspace con deploy configurado y permiso deploy.</td></tr>}
                    {(data.deployments || []).map(d => (
                        <tr key={d.deploymentId}>
                            <td style={td}><div style={mono}>{d.deploymentId}</div><div style={muted}>{d.kind}{d.error ? ` · ${d.error}` : ''}</div></td>
                            <td style={{ ...td, ...mono }}>{d.workspace}</td>
                            <td style={{ ...td, ...mono }}>{d.commit?.slice(0, 10) || '—'}</td>
                            <td style={{ ...td, ...mono, ...muted }}>{d.artifactSha256 ? `${d.artifactSha256.slice(0, 12)}…` : '—'}</td>
                            <td style={td}><Chip status={d.status} /></td>
                            <td style={{ ...td, ...muted }}>{fmt(d.createdAt)}</td>
                            <td style={{ ...td, ...muted }}>{fmt(d.releasedAt)}</td>
                        </tr>
                    ))}
                </Table>
            </Section>
        </>
    );
}

function Decisions({ data, act }) {
    const list = data.decisionsPending || [];
    return (
        <Section icon={Scale} title="Decisiones propuestas por agentes">
            <p style={{ ...muted, marginTop: 0 }}>Una propuesta nunca se convierte sola en decisión aprobada. Revisa la procedencia y los posibles conflictos antes de aprobar.</p>
            {!list.length && <p style={muted}>No hay propuestas pendientes.</p>}
            {list.map(d => (
                <div key={d.id} style={{ ...card, padding: '14px', marginTop: '8px' }}>
                    <div style={{ fontWeight: 700 }}>{d.decision}</div>
                    <div style={muted}>{[d.project, d.topic, d.date, d.provenance?.agent && `propuesta por ${d.provenance.agent}`, d.provenance?.source].filter(Boolean).join(' · ')}</div>
                    {d.rationale && <div style={{ ...muted, marginTop: '4px' }}>Motivo: {d.rationale}</div>}
                    {d.provenance?.quote && <div style={{ ...muted, fontStyle: 'italic', marginTop: '4px' }}>«{d.provenance.quote}»</div>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button className="btn btn-primary" onClick={() => act(() => send(`${API}/decisions/${d.id}/approve`, 'POST', {}), 'Decisión aprobada.')}>Aprobar</button>
                        <button className="btn btn-ghost" onClick={() => { const reason = window.prompt('Motivo del rechazo (opcional)') ?? null; if (reason !== null) act(() => send(`${API}/decisions/${d.id}/reject`, 'POST', { reason }), 'Propuesta rechazada.'); }}>Rechazar</button>
                    </div>
                </div>
            ))}
        </Section>
    );
}

function Errors({ data }) {
    const t = data.costs?.totals;
    return (
        <>
            {t && (
                <Section icon={AlertTriangle} title="Costos de agentes (AI Office)">
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        {[['Ejecuciones', t.runs], ['Tokens', t.tokens?.toLocaleString('es')], ['Costo (USD)', `$${t.costUSD}`], ['Sin precio', t.unpricedRuns], ['Éxito', t.successRate != null ? `${t.successRate}%` : '—']].map(([k, v]) => (
                            <div key={k}><div style={muted}>{k}</div><div style={{ fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v ?? '—'}</div></div>
                        ))}
                    </div>
                    <p style={{ ...muted, marginBottom: 0 }}>{data.costs.source}. Las llamadas MCP en sí no tienen costo de modelo en el servidor.</p>
                </Section>
            )}
            <Section icon={AlertTriangle} title="Errores recientes de agentes">
                {!data.errors?.length && <p style={muted}>Sin errores recientes.</p>}
                {(data.errors || []).map((a, i) => (
                    <div key={`${a.at}-${i}`} style={{ display: 'grid', gridTemplateColumns: '110px 130px 170px 1fr', gap: '10px', fontSize: '12.5px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{fmt(a.at)}</span>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agent}</span>
                        <span style={{ ...mono, color: '#f87171' }}>{a.tool}{a.code ? ` · ${a.code}` : ''}</span>
                        <span style={{ ...mono, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.error}>{a.error}{a.opId ? ` (${a.opId})` : ''}</span>
                    </div>
                ))}
            </Section>
        </>
    );
}
