import { useCallback, useEffect, useRef, useState } from 'react';
import {
    UploadCloud, RefreshCw, Pause, Play, Search, X, Trash2, FolderSearch, AlertCircle,
    CheckCircle2, MessageSquare, Layers, UserCircle2, ChevronDown, ChevronRight,
} from 'lucide-react';

const API = '/api/knowledge';
const getJson = async (url, opts) => {
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data;
};
const postJson = (url, body) => getJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

const REL_COLOR = { alta: '#10b981', media: '#f59e0b', baja: '#64748b' };
const STATUS_LABEL = { done: 'Resumida', pending: 'En cola', processing: 'Procesando', indexed_raw: 'Sin resumen', error: 'Error' };
// Los errores de la IA llegan crudos (JSON de Gemini); se traducen a algo legible.
const friendlyError = msg => {
    if (!msg) return '';
    if (/\b429\b|quota|RESOURCE_EXHAUSTED/i.test(msg)) return 'Gemini llegó a su límite de uso. No se pierde nada: se reintenta solo cada 10 minutos.';
    if (/\b503\b|high demand|UNAVAILABLE/i.test(msg)) return 'Gemini está saturado en este momento; se reintenta solo cada 10 minutos.';
    return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
};
const fmtDate = d => (d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const card = { padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px' };
const input = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '14px' };
const chip = color => ({ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${color}22`, color, whiteSpace: 'nowrap' });

function Stat({ label, value, color = 'white' }) {
    return (
        <div style={{ ...card, padding: '14px 16px', minWidth: '120px', flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
        </div>
    );
}

function List({ title, items }) {
    if (!items?.length) return null;
    return (
        <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{title}</div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.55 }}>
                {items.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
        </div>
    );
}

function ConversationDetail({ id, onClose, onRemoved }) {
    const [conv, setConv] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { getJson(`${API}/chatgpt/conversations/${encodeURIComponent(id)}`).then(setConv).catch(e => setError(e.message)); }, [id]);

    const remove = async () => {
        if (!window.confirm('¿Quitar esta conversación del RAG? No se volverá a importar aunque subas otra exportación.')) return;
        await fetch(`${API}/chatgpt/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
        onRemoved();
    };
    const d = conv?.digest;
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 100%)', height: '100%', overflowY: 'auto', background: 'var(--bg-secondary, #12121c)', borderLeft: '1px solid var(--border-default)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{conv?.title || 'Cargando…'}</h3>
                        {conv && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>{fmtDate(conv.createTime)} → {fmtDate(conv.updateTime)} · {conv.messageCount} mensajes</div>}
                    </div>
                    <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
                </div>
                {error && <p style={{ color: '#f87171' }}>{error}</p>}
                {conv && (
                    <>
                        {d ? (
                            <div style={{ ...card, marginTop: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    {d.project && <span style={chip('#a78bfa')}>{d.project}</span>}
                                    <span style={chip(REL_COLOR[d.relevance])}>Relevancia {d.relevance}</span>
                                    <span style={chip('#38bdf8')}>{d.type}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{d.summary}</p>
                                <List title="Decisiones" items={d.decisions} />
                                <List title="Ideas abiertas" items={d.ideas} />
                                <List title="Pendientes" items={d.pending} />
                                <List title="Cómo pensaste" items={d.reasoning} />
                                <List title="Datos" items={d.facts} />
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                Todavía sin resumen de IA{conv.digestError ? ` (${friendlyError(conv.digestError)})` : ''}. El texto completo ya se puede buscar.
                            </p>
                        )}
                        <button className="btn btn-ghost" onClick={() => setShowTranscript(s => !s)} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {showTranscript ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Conversación completa
                        </button>
                        {showTranscript && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                {conv.messages.map((m, i) => (
                                    <div key={i} style={{ ...card, padding: '12px 14px', background: m.role === 'user' ? 'rgba(124,92,252,0.10)' : 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>{m.role === 'user' ? 'Tú' : 'ChatGPT'}</div>
                                        <div style={{ fontSize: '13.5px', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{m.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="btn btn-ghost" onClick={remove} style={{ marginTop: '24px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={15} /> Quitar del RAG
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function ExtensionCard({ status, onChange }) {
    const [key, setKey] = useState(null);
    const [copied, setCopied] = useState('');
    const ext = status?.chatgpt?.extension;
    const run = ext?.run;
    const copy = (text, what) => { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500); };
    const createKey = async () => {
        const r = await postJson('/api/agent-hub/tokens', { name: 'ChatGPT Sync (Chrome)', scope: 'write' });
        setKey(r.token);
        onChange();
    };
    const stale = !!ext?.stale;
    return (
        <div className="card" style={{ ...card, background: 'linear-gradient(135deg, rgba(124,92,252,0.08), rgba(16,185,129,0.04))' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px' }}>Sincronización automática con la extensión de Chrome</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                Cada 20 minutos (y al salir de la pestaña de ChatGPT) trae las conversaciones nuevas o modificadas de tu cuenta, también las que tengas desde el celular o en Proyectos de ChatGPT.
                Necesita Chrome abierto con una pestaña de chatgpt.com (o la abre ella en segundo plano cuando sincronizas a mano).
            </p>
            {ext ? (
                <div style={{ fontSize: '13px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    {run?.error || stale ? <AlertCircle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} /> : <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />}
                    <div>
                        Última sincronización: <b>{new Date(ext.at).toLocaleString('es')}</b>
                        {run && !run.error && <> · revisadas {run.scanned}, cambiadas {run.changed}, enviadas {run.sent}{run.remaining ? `, faltan ${run.remaining} (siguen en el próximo ciclo)` : ''}</>}
                        {' '}· en total {ext.totals.added} nuevas y {ext.totals.updated} actualizadas
                        {run?.error && <div style={{ color: '#f59e0b' }}>{run.error}</div>}
                        {stale && !run?.error && <div style={{ color: '#f59e0b' }}>Hace más de 2 días que no sincroniza: abre Chrome con chatgpt.com.</div>}
                    </div>
                </div>
            ) : (
                <div style={{ fontSize: '13px', marginBottom: '12px', color: '#f59e0b' }}>La extensión todavía no se ha conectado.</div>
            )}
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                <li>En Chrome abre <b>chrome://extensions</b> y activa <b>Modo de desarrollador</b> (arriba a la derecha).</li>
                <li>
                    <b>Cargar descomprimida</b> → elige esta carpeta:{' '}
                    <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '5px' }}>{status?.extensionDir || 'extensions/chatgpt-sync'}</code>{' '}
                    {status?.extensionDir && <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => copy(status.extensionDir, 'dir')}>{copied === 'dir' ? 'Copiada' : 'Copiar ruta'}</button>}
                </li>
                <li>
                    Crea la llave de la extensión:{' '}
                    {!key ? (
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={createKey}>Crear llave</button>
                    ) : (
                        <span>
                            <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '5px', wordBreak: 'break-all' }}>{key}</code>{' '}
                            <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => copy(key, 'key')}>{copied === 'key' ? 'Copiada' : 'Copiar'}</button>
                            <span style={{ color: '#f59e0b' }}> (no se vuelve a mostrar)</span>
                        </span>
                    )}
                </li>
                <li>Haz clic en el ícono de la extensión, pega la llave, <b>Guardar</b> y luego <b>Sincronizar ahora</b>. La primera vez trae tu historial por tandas de 150 conversaciones.</li>
            </ol>
        </div>
    );
}

export default function ChatGptKnowledge() {
    const [status, setStatus] = useState(null);
    const [view, setView] = useState('conversations');
    const [convs, setConvs] = useState({ total: 0, items: [] });
    const [q, setQ] = useState('');
    const [relevance, setRelevance] = useState('');
    const [projects, setProjects] = useState([]);
    const [profile, setProfile] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [upload, setUpload] = useState(null); // { progress, message, error }
    const [watchDir, setWatchDir] = useState('');
    const [busy, setBusy] = useState('');
    const fileRef = useRef(null);

    const loadStatus = useCallback(async () => {
        try {
            const s = await getJson(`${API}/status`);
            setStatus(s);
            setWatchDir(prev => prev || s.config.watchDir || '');
        } catch { /* el servidor puede estar reiniciando */ }
    }, []);
    const loadConvs = useCallback(async () => {
        const params = new URLSearchParams({ limit: '100' });
        if (q) params.set('q', q);
        if (relevance) params.set('relevance', relevance);
        setConvs(await getJson(`${API}/chatgpt/conversations?${params}`).catch(() => ({ total: 0, items: [] })));
    }, [q, relevance]);
    const loadProjects = useCallback(async () => setProjects(await getJson(`${API}/projects`).catch(() => [])), []);
    const loadProfile = useCallback(async () => setProfile(await getJson(`${API}/profile`).catch(() => null)), []);

    useEffect(() => {
        const t = setTimeout(() => { loadStatus(); loadProjects(); loadProfile(); }, 0);
        return () => clearTimeout(t);
    }, [loadStatus, loadProjects, loadProfile]);
    useEffect(() => { const t = setTimeout(loadConvs, 250); return () => clearTimeout(t); }, [loadConvs]);

    // Mientras la cola trabaja, refresca cada pocos segundos.
    const running = status?.worker?.running;
    useEffect(() => {
        if (!running) return;
        const t = setInterval(() => { loadStatus(); loadConvs(); }, 4000);
        return () => { clearInterval(t); loadProjects(); loadProfile(); loadConvs(); };
    }, [running, loadStatus, loadConvs, loadProjects, loadProfile]);

    const doUpload = file => {
        if (!file) return;
        setUpload({ progress: 0, message: `Subiendo ${file.name}…` });
        const form = new FormData();
        form.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API}/chatgpt/import`);
        xhr.upload.onprogress = e => e.lengthComputable && setUpload(u => ({ ...u, progress: Math.round((e.loaded / e.total) * 100) }));
        xhr.upload.onload = () => setUpload(u => ({ ...u, progress: 100, message: 'Leyendo conversaciones…' }));
        xhr.onload = () => {
            let data = {};
            try { data = JSON.parse(xhr.responseText); } catch { /* respuesta vacía */ }
            if (xhr.status >= 300) setUpload({ error: data.error || `Error ${xhr.status}` });
            else setUpload({ message: `Listo: ${data.added} nuevas, ${data.updated} actualizadas, ${data.unchanged} sin cambios. Procesando en segundo plano.` });
            loadStatus(); loadConvs();
        };
        xhr.onerror = () => setUpload({ error: 'No se pudo subir el archivo' });
        xhr.send(form);
        if (fileRef.current) fileRef.current.value = '';
    };

    const action = async (name, fn) => {
        setBusy(name);
        try { await fn(); } catch (e) { window.alert(e.message); } finally { setBusy(''); loadStatus(); }
    };

    const c = status?.chatgpt;
    const w = status?.worker;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(124,92,252,0.05))' }}>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageSquare size={20} style={{ color: '#10b981' }} /> Memoria de ChatGPT
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 16px' }}>
                    Tus conversaciones con ChatGPT, resumidas por IA (decisiones, pendientes, cómo piensas) y unidas a tus proyectos.
                    Todos los agentes que consultan el RAG las ven.
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Stat label="Conversaciones" value={c?.total ?? '—'} />
                    <Stat label="Resumidas" value={c?.done ?? '—'} color="#10b981" />
                    <Stat label="En cola" value={c?.pending ?? '—'} color="#f59e0b" />
                    <Stat label="Relevancia alta" value={c?.byRelevance?.alta ?? '—'} color="#a78bfa" />
                    <Stat label="Proyectos con memoria" value={status?.projects ?? '—'} color="#38bdf8" />
                    <Stat label="Trozos con embedding" value={status ? `${status.store.embedded}/${status.store.chunks}` : '—'} />
                </div>

                {w && (
                    <div style={{ marginTop: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {w.running ? (
                            <><RefreshCw size={14} className="spin" style={{ color: '#10b981' }} /> Procesando{w.current.length ? `: ${w.current.slice(0, 2).join(' · ')}` : '…'}</>
                        ) : w.paused ? (
                            <><Pause size={14} style={{ color: '#f59e0b' }} /> En pausa</>
                        ) : (
                            <><CheckCircle2 size={14} style={{ color: '#10b981' }} /> Al día</>
                        )}
                        {w.paused
                            ? <button className="btn btn-ghost" onClick={() => action('resume', () => postJson(`${API}/chatgpt/resume`))}><Play size={14} /> Reanudar</button>
                            : (c?.pending > 0 && <button className="btn btn-ghost" onClick={() => action('pause', () => postJson(`${API}/chatgpt/pause`))}><Pause size={14} /> Pausar</button>)}
                        {c?.errors > 0 && <button className="btn btn-ghost" onClick={() => action('retry', () => postJson(`${API}/chatgpt/retry-errors`))}>Reintentar {c.errors} con error</button>}
                    </div>
                )}
                {w?.blockedReason && <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#f59e0b', display: 'flex', gap: '6px' }} title={w.blockedReason}><AlertCircle size={14} /> {friendlyError(w.blockedReason)}</div>}
                {status && !status.ai.llm && <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#f59e0b', display: 'flex', gap: '6px' }}><AlertCircle size={14} /> Sin IA configurada (GEMINI_API_KEY): las conversaciones se pueden buscar, pero no se resumen.</div>}
                {w?.lastError && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }} title={w.lastError}>Último aviso: {friendlyError(w.lastError)}</div>}
            </div>

            <ExtensionCard status={status} onChange={loadStatus} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div style={card}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '15px' }}>Respaldo: exportación completa de ChatGPT</h4>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                        <li>ChatGPT → Configuración → Controles de datos → <b>Exportar datos</b>.</li>
                        <li>Te llega un correo con el enlace (vence en 24 h).</li>
                        <li>Descarga el .zip: si cae en la carpeta vigilada se importa solo; si no, súbelo aquí.</li>
                    </ol>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
                        Solo se procesan las conversaciones nuevas o que cambiaron desde la última exportación.
                    </p>
                </div>

                <div style={card}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '15px' }}>Súbela o deja que se detecte sola</h4>
                    <input ref={fileRef} type="file" accept=".zip,.json" style={{ display: 'none' }} onChange={e => doUpload(e.target.files?.[0])} />
                    <button className="btn btn-primary" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UploadCloud size={16} /> Subir exportación (.zip)
                    </button>
                    {upload && (
                        <div style={{ marginTop: '10px', fontSize: '13px', color: upload.error ? '#f87171' : 'var(--text-primary)' }}>
                            {upload.error || upload.message}
                            {upload.progress != null && upload.progress < 100 && (
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginTop: '6px' }}>
                                    <div style={{ width: `${upload.progress}%`, height: '100%', background: '#10b981', borderRadius: '4px' }} />
                                </div>
                            )}
                        </div>
                    )}
                    {status && (
                        <div style={{ marginTop: '16px', fontSize: '13px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={status.config.watchEnabled} onChange={e => action('cfg', () => postJson(`${API}/config`, { watchEnabled: e.target.checked }))} />
                                Vigilar esta carpeta cada 10 minutos
                            </label>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <input value={watchDir} onChange={e => setWatchDir(e.target.value)} placeholder="~/Downloads" style={{ ...input, flex: 1, padding: '8px 12px', fontSize: '13px' }} />
                                <button className="btn btn-ghost" disabled={busy === 'scan'} onClick={() => action('scan', async () => {
                                    await postJson(`${API}/config`, { watchDir });
                                    const r = await postJson(`${API}/chatgpt/scan`);
                                    setUpload({ message: r.imported.length ? `Importadas ${r.imported.length} exportaciones desde la carpeta.` : 'No hay exportaciones nuevas en la carpeta.' });
                                })}>
                                    <FolderSearch size={15} /> Revisar ahora
                                </button>
                            </div>
                        </div>
                    )}
                    {c?.lastImport && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>Última importación: {fmtDate(c.lastImport.at)} · {c.lastImport.file} · {c.lastImport.added} nuevas, {c.lastImport.updated} actualizadas</p>}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[['conversations', 'Conversaciones', <MessageSquare size={15} />], ['projects', 'Memoria por proyecto', <Layers size={15} />], ['profile', 'Tu perfil de trabajo', <UserCircle2 size={15} />]].map(([key, label, icon]) => (
                    <button key={key} onClick={() => setView(key)} className="btn" style={{ background: view === key ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {icon} {label}
                    </button>
                ))}
            </div>

            {view === 'conversations' && (
                <div style={card}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                            <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por título, proyecto o etiqueta…" style={{ ...input, width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }} />
                        </div>
                        <select value={relevance} onChange={e => setRelevance(e.target.value)} style={input}>
                            <option value="">Toda relevancia</option>
                            <option value="alta">Alta</option>
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                        </select>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{convs.total} conversaciones</div>
                    {!convs.items.length && <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>Aún no hay conversaciones. Sube tu exportación de ChatGPT para empezar.</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {convs.items.map(it => (
                            <button key={it.id} onClick={() => setOpenId(it.id)} style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px', color: 'inherit', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                        {it.project && <span style={chip('#a78bfa')}>{it.project}</span>}
                                        {it.relevance && <span style={chip(REL_COLOR[it.relevance])}>{it.relevance}</span>}
                                        {it.status !== 'done' && <span style={chip(it.status === 'error' ? '#f87171' : '#94a3b8')}>{STATUS_LABEL[it.status] || it.status}</span>}
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(it.updateTime)}</span>
                                    </div>
                                </div>
                                {it.summary && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>{it.summary}</div>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {view === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {!projects.length && <div style={card}><p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13.5px' }}>Las memorias por proyecto aparecen cuando la IA termina de resumir conversaciones de un mismo proyecto.</p></div>}
                    {projects.map(p => (
                        <div key={p.key} style={card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px' }}>{p.name} {p.projectId && <span style={chip('#10b981')}>en el dashboard</span>}</h4>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{p.conversationCount} conversaciones · {fmtDate(p.firstDate)} → {fmtDate(p.lastDate)}</div>
                                </div>
                                <button className="btn btn-ghost" disabled={busy === p.key} onClick={() => action(p.key, async () => { await postJson(`${API}/projects/${encodeURIComponent(p.key)}/refresh`); await loadProjects(); })}>
                                    <RefreshCw size={14} className={busy === p.key ? 'spin' : ''} /> Actualizar
                                </button>
                            </div>
                            <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '10px 0 0' }}>{p.synthesis.overview}</p>
                            <List title="Decisiones vigentes" items={p.synthesis.decisions} />
                            <List title="Abierto / próximos pasos" items={p.synthesis.openQuestions} />
                            <List title="Cómo piensas este proyecto" items={p.synthesis.howUserThinks} />
                            <List title="Línea de tiempo" items={p.synthesis.timeline} />
                            <List title="Datos clave" items={p.synthesis.keyFacts} />
                        </div>
                    ))}
                </div>
            )}

            {view === 'profile' && (
                <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px' }}>Cómo trabajas (lo que ven tus agentes)</h4>
                        <button className="btn btn-ghost" disabled={busy === 'profile' || !c?.done} onClick={() => action('profile', async () => { await postJson(`${API}/profile/refresh`); await loadProfile(); })}>
                            <RefreshCw size={14} className={busy === 'profile' ? 'spin' : ''} /> Rehacer
                        </button>
                    </div>
                    {!profile ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>Se genera solo cuando haya conversaciones resumidas.</p>
                    ) : (
                        <>
                            <p style={{ fontSize: '14px', lineHeight: 1.6 }}>{profile.data.whoIs}</p>
                            <List title="Cómo trabajas" items={profile.data.workStyle} />
                            <List title="Criterios de decisión" items={profile.data.decisionCriteria} />
                            <List title="Preferencias" items={profile.data.preferences} />
                            <List title="Frentes activos" items={profile.data.activeFronts} />
                            <List title="Reglas para agentes" items={profile.data.instructionsForAgents} />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>Actualizado {fmtDate(profile.updatedAt)} · basado en {profile.basedOn} conversaciones</p>
                        </>
                    )}
                </div>
            )}

            {openId && <ConversationDetail id={openId} onClose={() => setOpenId(null)} onRemoved={() => { setOpenId(null); loadConvs(); loadStatus(); }} />}
        </div>
    );
}
