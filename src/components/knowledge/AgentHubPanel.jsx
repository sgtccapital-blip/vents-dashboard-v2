import { useCallback, useEffect, useState } from 'react';
import { Plug, KeyRound, Copy, Check, Trash2, Activity, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const API = '/api/agent-hub';
const getJson = async (url, opts) => {
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data;
};

const card = { padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px' };
const input = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'white', padding: '9px 12px', fontSize: '13.5px' };
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };
const fmt = d => (d ? new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function CopyBlock({ label, text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <div style={{ marginTop: '10px' }}>
            {label && <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <pre style={{ ...mono, flex: 1, margin: 0, padding: '10px 12px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)', borderRadius: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{text}</pre>
                <button className="btn btn-ghost" onClick={copy} aria-label="Copiar">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
            </div>
        </div>
    );
}

export const CHATGPT_INSTRUCTIONS = `Tengo conectado "ARRIVE Command Center" (MCP), el centro de todos mis proyectos.
- Cuando hablemos de un proyecto, evento o negocio mío, usa primero get_context y search_knowledge para revisar lo que ya decidimos antes de proponer algo.
- Cuando cerremos una decisión, definamos un dato clave (precio, fecha, proveedor, stack) o aprendamos algo importante, guárdalo con save_memory, autoexplicativo y con su proyecto.
- Cuando salga un pendiente concreto, créalo con create_task.
- Al terminar un trabajo largo, resúmelo en una frase con log_activity.`;

function setupSnippets(url, token, publicUrl) {
    return [
        ...(publicUrl ? [['ChatGPT: URL del conector (autenticación: ninguna, la llave va en la URL)', `${publicUrl}/${token}`]] : []),
        ['Claude Code (terminal)', `claude mcp add --transport http arrive-command-center ${url} --header "Authorization: Bearer ${token}"`],
        ['OpenClaw, Hermes o cualquier cliente MCP por HTTP (token en la URL)', `${url}/${token}`],
        ['Claude Desktop, Cursor y clientes que solo usan stdio (JSON de configuración)', JSON.stringify({
            mcpServers: { 'arrive-command-center': { command: 'npx', args: ['-y', 'mcp-remote', url, '--header', `Authorization: Bearer ${token}`] } },
        }, null, 2)],
    ];
}

export default function AgentHubPanel() {
    const [info, setInfo] = useState(null);
    const [tokens, setTokens] = useState([]);
    const [activity, setActivity] = useState([]);
    const [agentFilter, setAgentFilter] = useState('');
    const [name, setName] = useState('');
    const [scope, setScope] = useState('write');
    const [created, setCreated] = useState(null);
    const [error, setError] = useState('');
    const [showTools, setShowTools] = useState(false);

    const loadTokens = useCallback(async () => setTokens(await getJson(`${API}/tokens`).catch(() => [])), []);
    const loadActivity = useCallback(async () => {
        const q = new URLSearchParams({ limit: '80' });
        if (agentFilter) q.set('agent', agentFilter);
        setActivity(await getJson(`${API}/activity?${q}`).catch(() => []));
    }, [agentFilter]);

    useEffect(() => {
        const t = setTimeout(() => { getJson(`${API}/info`).then(setInfo).catch(e => setError(e.message)); loadTokens(); }, 0);
        return () => clearTimeout(t);
    }, [loadTokens]);
    useEffect(() => {
        const first = setTimeout(loadActivity, 0);
        const t = setInterval(loadActivity, 10000);
        return () => { clearTimeout(first); clearInterval(t); };
    }, [loadActivity]);

    const create = async () => {
        setError('');
        try {
            const r = await getJson(`${API}/tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scope }) });
            setCreated(r);
            setName('');
            loadTokens();
        } catch (e) { setError(e.message); }
    };
    const revoke = async t => {
        if (!window.confirm(`¿Revocar el acceso de "${t.name}"? Dejará de poder conectarse de inmediato.`)) return;
        await fetch(`${API}/tokens/${t.id}`, { method: 'DELETE' });
        loadTokens();
    };

    const url = info?.publicUrl || info?.localUrl || '';
    const active = tokens.filter(t => !t.revoked);
    const agents = [...new Set(tokens.map(t => t.agent))];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(124,92,252,0.05))' }}>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Plug size={20} style={{ color: '#38bdf8' }} /> Agentes conectados (MCP)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0' }}>
                    Una sola puerta para Claude, ChatGPT, OpenClaw, Hermes y cualquier agente compatible con MCP: leen tu contexto, tus proyectos y tu memoria, y dejan sus tareas y avances aquí.
                    Cada agente tiene su propia llave y todo lo que hace queda registrado.
                </p>
                {info && (
                    <>
                        <CopyBlock label="Dirección del servidor MCP" text={url} />
                        {!info.publicUrl && (
                            <p style={{ fontSize: '12px', color: '#f59e0b', margin: '8px 0 0', display: 'flex', gap: '6px' }}>
                                <AlertCircle size={14} style={{ flexShrink: 0 }} /> Es una dirección local: sirve para agentes que corren en esta Mac. Para ChatGPT y agentes en la nube falta publicarla con Tailscale Funnel y poner PUBLIC_URL en .env (ver docs/CONOCIMIENTO.md).
                            </p>
                        )}
                        <button className="btn btn-ghost" onClick={() => setShowTools(s => !s)} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            {showTools ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {info.tools.length} herramientas disponibles
                        </button>
                        {showTools && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', marginTop: '8px' }}>
                                {info.tools.map(t => (
                                    <div key={t.name} style={{ ...card, padding: '10px 12px' }}>
                                        <div style={{ ...mono, fontWeight: 700 }}>{t.name} <span style={{ fontSize: '11px', color: t.write ? '#f59e0b' : '#10b981' }}>{t.write ? 'escritura' : 'lectura'}</span></div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>{t.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
                {error && <p style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}
            </div>

            {info?.publicUrl && (
                <div style={{ ...card, background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(255,255,255,0.02))' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '15px' }}>Conectar ChatGPT</h4>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.75, color: 'var(--text-secondary)' }}>
                        <li>Abajo, crea una llave llamada <b>ChatGPT</b> y copia su <b>URL del conector</b>.</li>
                        <li>En ChatGPT: Configuración → Aplicaciones y conectores → Configuración avanzada → activa el <b>Modo desarrollador</b>.</li>
                        <li>Crea un conector: nombre <b>ARRIVE Command Center</b>, pega la URL y elige autenticación <b>Ninguna</b> (la llave ya va en la URL).</li>
                        <li>En cualquier chat: botón <b>+</b> → Modo desarrollador → activa ARRIVE Command Center.</li>
                        <li>Pega estas instrucciones en Configuración → Personalización → Instrucciones personalizadas, para que ChatGPT guarde solo lo importante:</li>
                    </ol>
                    <CopyBlock text={CHATGPT_INSTRUCTIONS} />
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
                        Los nombres de los menús de ChatGPT pueden cambiar un poco. Antes de escribir algo, ChatGPT te pide confirmación.
                    </p>
                </div>
            )}

            <div style={card}>
                <h4 style={{ margin: '0 0 10px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><KeyRound size={16} /> Conectar un agente</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && create()} placeholder="Nombre del agente (ej. Claude Code, OpenClaw, Hermes)" style={{ ...input, flex: 1, minWidth: '240px' }} />
                    <select value={scope} onChange={e => setScope(e.target.value)} style={input}>
                        <option value="write">Lee y escribe (tareas, memoria, actividad)</option>
                        <option value="read">Solo lectura</option>
                    </select>
                    <button className="btn btn-primary" onClick={create} disabled={!name.trim()}>Crear llave</button>
                </div>

                {created && (
                    <div style={{ ...card, marginTop: '14px', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.06)' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <CheckCircle2 size={16} style={{ color: '#10b981' }} /> Llave de {created.record.name}: cópiala ahora, no se vuelve a mostrar
                        </div>
                        <CopyBlock text={created.token} />
                        {setupSnippets(info?.localUrl || url, created.token, info?.publicUrl).map(([label, text]) => <CopyBlock key={label} label={label} text={text} />)}
                        <button className="btn btn-ghost" onClick={() => setCreated(null)} style={{ marginTop: '10px' }}>Listo, ya la copié</button>
                    </div>
                )}

                <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                                <th style={{ padding: '6px 8px' }}>Agente</th><th>Permiso</th><th>Llave</th><th>Creada</th><th>Último uso</th><th style={{ textAlign: 'right' }}>Llamadas</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {!active.length && <tr><td colSpan={7} style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Ningún agente conectado todavía.</td></tr>}
                            {active.map(t => (
                                <tr key={t.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <td style={{ padding: '8px', fontWeight: 600 }}>{t.name}</td>
                                    <td>{t.scope === 'write' ? 'Lee y escribe' : 'Solo lectura'}</td>
                                    <td style={mono}>{t.prefix}…</td>
                                    <td>{fmt(t.createdAt)}</td>
                                    <td>{fmt(t.lastUsedAt)}</td>
                                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.calls || 0}</td>
                                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" onClick={() => revoke(t)} style={{ color: '#f87171' }} aria-label={`Revocar ${t.name}`}><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} /> Qué están haciendo los agentes</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={input}>
                            <option value="">Todos los agentes</option>
                            {agents.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <button className="btn btn-ghost" onClick={loadActivity} aria-label="Actualizar"><RefreshCw size={15} /></button>
                    </div>
                </div>
                {!activity.length && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Sin actividad todavía. Aparece aquí cada vez que un agente consulta o escribe algo.</p>}
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activity.map((a, i) => (
                        <div key={`${a.at}-${i}`} style={{ display: 'grid', gridTemplateColumns: '110px 130px 170px 1fr', gap: '10px', fontSize: '12.5px', padding: '6px 8px', borderRadius: '8px', background: a.ok ? 'transparent' : 'rgba(248,113,113,0.08)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{fmt(a.at)}</span>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agent}</span>
                            <span style={{ ...mono, color: a.write ? '#f59e0b' : '#38bdf8' }}>{a.tool}{a.ok ? '' : ' ✕'}</span>
                            <span style={{ ...mono, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.error || a.args}>{a.error || a.args}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
