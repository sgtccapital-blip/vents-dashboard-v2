import { useCallback, useEffect, useState } from 'react';
import { Link2, Plus, RefreshCw, Search, Trash2, X, ExternalLink, Youtube, Instagram, Film, AlertCircle, Loader2 } from 'lucide-react';

const API = '/api/knowledge/references';
const getJson = async (url, opts) => {
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data;
};
const sendJson = (url, method, body) => getJson(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

const TYPE_LABEL = {
    tutorial: 'Tutorial', motion_graphics: 'Motion graphics', edicion: 'Edición', referencia_visual: 'Referencia visual',
    formato_contenido: 'Formato de contenido', musica_audio: 'Música / audio', otro: 'Otro',
};
const TYPE_COLOR = { tutorial: '#10b981', motion_graphics: '#a78bfa', edicion: '#38bdf8', referencia_visual: '#f472b6', formato_contenido: '#f59e0b', musica_audio: '#fb923c', otro: '#64748b' };
const STATUS = { pending: ['En cola', '#f59e0b'], processing: ['Analizando…', '#38bdf8'], done: ['En el RAG', '#10b981'], error: ['Error', '#f87171'] };
const ACCOUNTS = ['arrive', 'the-room', 'ignite', 'hangout', 'dinner-club', 'urban-nights', 'udp', 'elemento', '5amclub'];

const card = { padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px' };
const input = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'white', padding: '10px 14px', fontSize: '14px' };
const chip = color => ({ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${color}22`, color, whiteSpace: 'nowrap' });
const fmtDur = s => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');

function PlatformIcon({ platform, size = 16 }) {
    if (platform === 'youtube') return <Youtube size={size} color="#ef4444" />;
    if (platform === 'instagram') return <Instagram size={size} color="#e879f9" />;
    return <Film size={size} color="#94a3b8" />;
}

function Section({ title, children }) {
    if (!children || (Array.isArray(children) && !children.length)) return null;
    return (
        <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{title}</div>
            <div style={{ fontSize: '13.5px', lineHeight: 1.6 }}>{children}</div>
        </div>
    );
}

function ReferenceDetail({ id, onClose, onChanged }) {
    const [ref, setRef] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { getJson(`${API}/${id}`).then(setRef).catch(e => setError(e.message)); }, [id]);
    const a = ref?.analysis;
    const st = a?.style || {};
    const styleRows = [['Ritmo', st.pacing], ['Cortes', st.cuts], ['Tipografía', st.typography], ['Color', st.color], ['Transiciones', st.transitions], ['Cámara', st.camera], ['Audio', st.audio]].filter(([, v]) => v);

    const remove = async () => {
        if (!window.confirm('¿Quitar esta referencia del RAG?')) return;
        await fetch(`${API}/${id}`, { method: 'DELETE' });
        onChanged(); onClose();
    };
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', height: '100%', overflowY: 'auto', background: 'var(--bg-secondary, #12121c)', borderLeft: '1px solid var(--border-default)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{ref?.title || 'Cargando…'}</h3>
                        {ref && (
                            <a href={ref.url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'inline-flex', gap: '6px', alignItems: 'center', marginTop: '4px', wordBreak: 'break-all' }}>
                                <PlatformIcon platform={ref.platform} size={13} /> {ref.author ? `${ref.author} · ` : ''}{ref.url} <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                    <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
                </div>
                {error && <p style={{ color: '#f87171' }}>{error}</p>}
                {ref && !a && <p style={{ color: 'var(--text-secondary)' }}>{ref.status === 'error' ? ref.error : 'Todavía se está analizando.'}</p>}
                {a && (
                    <div style={{ ...card, marginTop: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <span style={chip(TYPE_COLOR[a.type] || '#64748b')}>{TYPE_LABEL[a.type] || a.type}</span>
                            {ref.account && <span style={chip('#a78bfa')}>{ref.account}</span>}
                            {ref.mode === 'texto' && <span style={chip('#f59e0b')} title={ref.warnings?.join(' | ')}>Analizado sin ver el video</span>}
                            {(a.tags || []).slice(0, 8).map(t => <span key={t} style={chip('#64748b')}>{t}</span>)}
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{a.summary}</p>
                        {ref.note && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>Tu nota: {ref.note}</p>}
                        <Section title="Para qué nos sirve">{a.whyUseful}</Section>
                        <Section title="Herramientas">{a.tools?.length ? a.tools.join(' · ') : null}</Section>
                        <Section title="Paso a paso">{a.steps?.length ? <ol style={{ margin: 0, paddingLeft: '20px' }}>{a.steps.map((s, i) => <li key={i}>{s.t && <code style={{ color: '#38bdf8' }}>{s.t}</code>} {s.step}</li>)}</ol> : null}</Section>
                        <Section title="Técnicas">{a.techniques?.length ? <ul style={{ margin: 0, paddingLeft: '18px' }}>{a.techniques.map((t, i) => <li key={i}><b>{t.name}:</b> {t.how}</li>)}</ul> : null}</Section>
                        <Section title="Estilo">{styleRows.length ? <ul style={{ margin: 0, paddingLeft: '18px' }}>{styleRows.map(([k, v]) => <li key={k}><b>{k}:</b> {v}</li>)}</ul> : null}</Section>
                        <Section title="Momentos clave">{a.keyMoments?.length ? <ul style={{ margin: 0, paddingLeft: '18px' }}>{a.keyMoments.map((m, i) => <li key={i}>{m.t && <code style={{ color: '#38bdf8' }}>{m.t}</code>} {m.what}</li>)}</ul> : null}</Section>
                        <Section title="Cómo aplicarlo en ARRIVE">{a.applyToArrive?.length ? <ul style={{ margin: 0, paddingLeft: '18px' }}>{a.applyToArrive.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}</Section>
                        <Section title="Cómo recrearlo">{a.recreateBrief}</Section>
                        <Section title="Transcripción">{a.transcript ? <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{a.transcript}</div> : null}</Section>
                    </div>
                )}
                {ref && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button className="btn" onClick={async () => { await sendJson(`${API}/${id}/retry`, 'POST'); onChanged(); onClose(); }}><RefreshCw size={14} /> Volver a analizar</button>
                        <button className="btn" style={{ color: '#f87171' }} onClick={remove}><Trash2 size={14} /> Quitar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ReferencesPanel() {
    const [data, setData] = useState({ items: [], status: null });
    const [urls, setUrls] = useState('');
    const [note, setNote] = useState('');
    const [account, setAccount] = useState('');
    const [tags, setTags] = useState('');
    const [q, setQ] = useState('');
    const [type, setType] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    const load = useCallback(() => {
        const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(type ? { type } : {}) });
        return getJson(`${API}?${qs}`).then(setData).catch(e => setError(e.message));
    }, [q, type]);
    useEffect(() => { load(); }, [load]);
    // Mientras haya algo en cola se refresca solo.
    const working = data.items.some(it => it.status === 'pending' || it.status === 'processing');
    useEffect(() => {
        if (!working) return undefined;
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
    }, [working, load]);

    const add = async e => {
        e.preventDefault();
        setBusy(true); setError(''); setMsg('');
        try {
            const r = await sendJson(API, 'POST', { urls, note, account, tags });
            const parts = [];
            if (r.added.length) parts.push(`${r.added.length} en cola para analizar`);
            if (r.duplicates.length) parts.push(`${r.duplicates.length} ya estaba${r.duplicates.length > 1 ? 'n' : ''} guardado${r.duplicates.length > 1 ? 's' : ''}`);
            if (r.invalid.length) parts.push(`${r.invalid.length} link${r.invalid.length > 1 ? 's' : ''} no válido${r.invalid.length > 1 ? 's' : ''}`);
            setMsg(parts.join(' · '));
            if (r.added.length) { setUrls(''); setNote(''); setTags(''); }
            load();
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    };

    const s = data.status;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={add} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link2 size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Agregar referencias al cerebro</h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Pega uno o varios links (YouTube, Instagram, TikTok, Vimeo, X…). La IA ve el video completo, saca el paso a paso, herramientas, técnicas y estilo, y lo deja buscable para todos los agentes.
                </p>
                <textarea value={urls} onChange={e => setUrls(e.target.value)} rows={3} placeholder={'https://www.youtube.com/watch?v=…\nhttps://www.instagram.com/reel/…'} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} />
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="¿Para qué lo guardas? (ej. transición de texto para flyers de Ignite)" style={input} />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select value={account} onChange={e => setAccount(e.target.value)} style={{ ...input, flex: '1 1 160px' }}>
                        <option value="">Todas las cuentas</option>
                        {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Etiquetas separadas por coma" style={{ ...input, flex: '2 1 220px' }} />
                    <button className="btn btn-primary" disabled={busy || !urls.trim()} type="submit" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Agregar
                    </button>
                </div>
                {msg && <div style={{ fontSize: '13px', color: '#10b981' }}>{msg}</div>}
                {error && <div style={{ fontSize: '13px', color: '#f87171', display: 'flex', gap: '6px', alignItems: 'center' }}><AlertCircle size={14} /> {error}</div>}
            </form>

            {s && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span><b style={{ color: 'white' }}>{s.done}</b> en el RAG</span>
                    {s.pending > 0 && <span><b style={{ color: '#f59e0b' }}>{s.pending}</b> en cola</span>}
                    {s.errors > 0 && <span><b style={{ color: '#f87171' }}>{s.errors}</b> con error</span>}
                    <span>Modelo de video: {s.model}</span>
                    {s.worker?.blockedReason && <span style={{ color: '#f59e0b' }}>{s.worker.blockedReason}</span>}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-secondary)' }} />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en referencias" style={{ ...input, width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }} />
                </div>
                <select value={type} onChange={e => setType(e.target.value)} style={input}>
                    <option value="">Todos los tipos</option>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {data.items.map(it => {
                    const [label, color] = STATUS[it.status] || [it.status, '#64748b'];
                    return (
                        <button key={it.id} onClick={() => setOpenId(it.id)} style={{ ...card, padding: 0, overflow: 'hidden', textAlign: 'left', color: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ aspectRatio: '16 / 9', background: it.thumbnail ? `center / cover no-repeat url("${it.thumbnail}")` : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px' }}>
                                <span style={{ background: 'rgba(0,0,0,0.65)', borderRadius: '6px', padding: '3px 6px', display: 'flex' }}><PlatformIcon platform={it.platform} size={14} /></span>
                                {it.duration > 0 && <span style={{ background: 'rgba(0,0,0,0.65)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px' }}>{fmtDur(it.duration)}</span>}
                            </div>
                            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={chip(color)}>{label}</span>
                                    {it.type && <span style={chip(TYPE_COLOR[it.type] || '#64748b')}>{TYPE_LABEL[it.type] || it.type}</span>}
                                    {it.account && <span style={chip('#a78bfa')}>{it.account}</span>}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.35 }}>{it.title || it.url}</div>
                                {it.summary && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.summary}</div>}
                                {it.status === 'error' && <div style={{ fontSize: '12px', color: '#f87171' }}>{it.error.slice(0, 160)}</div>}
                            </div>
                        </button>
                    );
                })}
            </div>
            {!data.items.length && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Todavía no hay referencias. Pega el primer link arriba.</p>}
            {openId && <ReferenceDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
        </div>
    );
}
