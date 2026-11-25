// Biblioteca de repos de GitHub y sus skills: agregar, organizar, leer e instalar en proyectos.
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Library, Plus, RefreshCw, Trash2, ExternalLink, Star, Search, X, Download, FileText,
    AlertCircle, CheckCircle2, Loader2, Bot, Sparkles, FolderGit2, BookOpen, Tag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const getJson = async (url, opts) => {
    const r = await fetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || `Error ${r.status}`); e.status = r.status; e.data = data; throw e; }
    return data;
};
const send = (url, method, body) => getJson(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
const q = id => `id=${encodeURIComponent(id)}`;

const INTEREST = {
    por_probar: { label: 'Por probar', color: '#f59e0b' },
    usando: { label: 'Usando', color: '#10b981' },
    favorito: { label: 'Favorito', color: '#ec4899' },
    archivado: { label: 'Archivado', color: '#64748b' },
};

const card = { padding: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '14px' };
const input = { background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'white', padding: '9px 12px', fontSize: '13.5px' };
const chip = (color, active = true) => ({ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', background: active ? `${color}22` : 'rgba(255,255,255,0.04)', color: active ? color : 'var(--text-tertiary)', border: `1px solid ${active ? `${color}55` : 'var(--border-subtle)'}`, cursor: 'pointer', whiteSpace: 'nowrap' });
const fmtStars = n => (n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function StatusBadge({ repo }) {
    if (repo.status === 'cloning' || repo.status === 'updating') {
        return <span style={{ ...chip('#38bdf8'), cursor: 'default', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Loader2 size={11} className="spin" /> {repo.status === 'cloning' ? 'Clonando…' : 'Actualizando…'}</span>;
    }
    if (repo.status === 'error') return <span title={repo.error} style={{ ...chip('#ef4444'), cursor: 'help', display: 'inline-flex', gap: 5, alignItems: 'center' }}><AlertCircle size={11} /> Error</span>;
    return null;
}

function InstalledBadges({ installed = [] }) {
    if (!installed.length) return null;
    const label = p => (p === 'global' ? 'global' : p === 'project' ? 'este proyecto' : p.split('/').pop());
    return (
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {installed.map(p => <span key={p} title={p} style={{ ...chip('#10b981'), cursor: 'default', fontSize: '10px', padding: '1px 7px' }}>✓ {label(p)}</span>)}
        </span>
    );
}

// ─── Detalle de una skill / agente con instalación ───
function ItemModal({ repoId, itemPath, stats, onClose, onInstalled }) {
    const [item, setItem] = useState(null);
    const [error, setError] = useState('');
    const [target, setTarget] = useState('project');
    const [customPath, setCustomPath] = useState(stats.installTargets?.[0] || '');
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => getJson(`/api/library/item?${q(repoId)}&path=${encodeURIComponent(itemPath)}`).then(setItem).catch(e => setError(e.message)), [repoId, itemPath]);
    useEffect(() => { load(); }, [load]);

    const install = async (overwrite = false) => {
        setBusy(true); setMsg(null);
        try {
            const r = await send('/api/library/install', 'POST', { id: repoId, path: itemPath, target, targetPath: customPath, overwrite });
            setMsg({ ok: true, text: `Instalada en ${r.dest}` });
            load(); onInstalled?.();
        } catch (e) {
            if (e.status === 409 && window.confirm(`${e.message}.\n¿Reemplazarla con la versión de la biblioteca?`)) { setBusy(false); return install(true); }
            setMsg({ ok: false, text: e.message });
        } finally { setBusy(false); }
    };

    const body = item?.content?.replace(/^\uFEFF?---[\s\S]*?\n---\r?\n?/, '') || '';
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div onClick={e => e.stopPropagation()} style={{ ...card, background: 'var(--bg-secondary, #11131a)', width: 'min(960px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{repoId} · {itemPath}</div>
                        <h3 style={{ margin: '4px 0 0', fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
                            {item?.kind === 'agent' ? <Bot size={18} color="#38bdf8" /> : <Sparkles size={18} color="#a78bfa" />} {item?.name || '…'}
                        </h3>
                        {item?.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.description}</p>}
                    </div>
                    <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
                </div>

                {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}

                {item && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 16, minHeight: 0, flex: 1 }}>
                        <div className="markdown-body" style={{ overflow: 'auto', fontSize: 13, lineHeight: 1.6, padding: '4px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 10, maxHeight: '62vh' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', maxHeight: '62vh' }}>
                            <div style={{ ...card, padding: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Instalar</div>
                                {[['project', 'Este proyecto (Dashboard)'], ['global', 'Global (~/.claude, todos los proyectos)'], ['path', 'Otro proyecto…']].map(([k, label]) => (
                                    <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, padding: '4px 0', cursor: 'pointer' }}>
                                        <input type="radio" checked={target === k} onChange={() => setTarget(k)} /> {label}
                                    </label>
                                ))}
                                {target === 'path' && (
                                    <>
                                        <input style={{ ...input, width: '100%', marginTop: 6, fontSize: 12 }} placeholder="/Users/…/MiProyecto" value={customPath} onChange={e => setCustomPath(e.target.value)} list="lib-targets" />
                                        <datalist id="lib-targets">{(stats.installTargets || []).map(p => <option key={p} value={p} />)}</datalist>
                                    </>
                                )}
                                <button className="btn btn-primary" disabled={busy || (target === 'path' && !customPath)} onClick={() => install()} style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>
                                    {busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />} Instalar {item.kind === 'agent' ? 'agente' : 'skill'}
                                </button>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.4 }}>
                                    Se copia a <code>.claude/{item.kind === 'agent' ? 'agents' : 'skills'}/</code> del destino. Claude Code la carga en la próxima sesión.
                                </div>
                                {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.ok ? '#34d399' : '#f87171', wordBreak: 'break-all' }}>{msg.text}</div>}
                                {item.installed?.length > 0 && <div style={{ marginTop: 10 }}><InstalledBadges installed={item.installed} /></div>}
                            </div>
                            <div style={{ ...card, padding: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Archivos ({item.files?.length || 1})</div>
                                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {(item.files?.length ? item.files : [itemPath.split('/').pop()]).map(f => <div key={f}>{f}</div>)}
                                </div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 8, wordBreak: 'break-all' }}>{item.localPath}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ReadmeModal({ repo, onClose }) {
    const [readme, setReadme] = useState(null);
    useEffect(() => { getJson(`/api/library/repo/readme?${q(repo.id)}`).then(d => setReadme(d.readme || '_Este repo no tiene README._')).catch(e => setReadme(`Error: ${e.message}`)); }, [repo.id]);
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ ...card, background: 'var(--bg-secondary, #11131a)', width: 'min(860px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 17 }}>{repo.id} · README</h3>
                    <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
                </div>
                <div className="markdown-body" style={{ overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
                    {readme === null ? <Loader2 size={16} className="spin" /> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>}
                </div>
            </div>
        </div>
    );
}

function RepoCard({ repo, projects, onChange, onOpenItem, onReadme }) {
    const [notes, setNotes] = useState(repo.notes || '');
    const [tagDraft, setTagDraft] = useState('');
    const [expanded, setExpanded] = useState(false);

    const patch = body => send(`/api/library/repo?${q(repo.id)}`, 'PATCH', body).then(onChange).catch(e => alert(e.message));
    const items = [...(repo.skills || []), ...(repo.agents || [])];
    const shown = expanded ? items : items.slice(0, 6);
    const interest = INTEREST[repo.interest] || INTEREST.por_probar;

    return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, borderColor: `${interest.color}44` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                    <a href={repo.url} target="_blank" rel="noreferrer" style={{ color: 'white', fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center', wordBreak: 'break-all' }}>
                        <FolderGit2 size={15} color="#a78bfa" /> {repo.id} <ExternalLink size={12} style={{ opacity: 0.5 }} />
                    </a>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {repo.stars != null && <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}><Star size={11} /> {fmtStars(repo.stars)}</span>}
                        {repo.language && <span>{repo.language}</span>}
                        {repo.license && <span>{repo.license}</span>}
                        {repo.private && <span style={{ color: '#f59e0b' }}>privado</span>}
                        {repo.addedBy && repo.addedBy !== 'usuario' && <span>guardado por {repo.addedBy}</span>}
                        <StatusBadge repo={repo} />
                    </div>
                </div>
                <select value={repo.interest} onChange={e => patch({ interest: e.target.value })} style={{ ...input, padding: '4px 8px', fontSize: 12, color: interest.color }}>
                    {Object.entries(INTEREST).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {repo.description && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{repo.description}</p>}
            {repo.status === 'error' && <div style={{ fontSize: 12, color: '#f87171' }}>{repo.error}</div>}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {(repo.tags || []).map(t => (
                    <span key={t} style={chip('#a78bfa')} title="Quitar" onClick={() => patch({ tags: repo.tags.filter(x => x !== t) })}>#{t} ×</span>
                ))}
                {(repo.topics || []).slice(0, 5).map(t => <span key={`t-${t}`} style={{ ...chip('#64748b'), cursor: 'default' }}>{t}</span>)}
                <input
                    value={tagDraft} onChange={e => setTagDraft(e.target.value)} placeholder="+ etiqueta"
                    onKeyDown={e => { if (e.key === 'Enter' && tagDraft.trim()) { patch({ tags: [...(repo.tags || []), tagDraft] }); setTagDraft(''); } }}
                    style={{ ...input, padding: '3px 8px', fontSize: 11.5, width: 100 }}
                />
            </div>

            <textarea
                value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (repo.notes || '') && patch({ notes })}
                placeholder="Para qué sirve, qué te gustó, dónde lo usarías…" rows={2}
                style={{ ...input, width: '100%', resize: 'vertical', fontSize: 12.5 }}
            />

            {projects.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Proyectos:</span>
                    {(repo.projectIds || []).map(pid => {
                        const p = projects.find(x => x.id === pid);
                        return <span key={pid} style={chip('#38bdf8')} title="Quitar" onClick={() => patch({ projectIds: repo.projectIds.filter(x => x !== pid) })}>{p?.name || pid} ×</span>;
                    })}
                    <select value="" onChange={e => e.target.value && patch({ projectIds: [...(repo.projectIds || []), e.target.value] })} style={{ ...input, padding: '3px 6px', fontSize: 11.5 }}>
                        <option value="">+ vincular</option>
                        {projects.filter(p => !(repo.projectIds || []).includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}

            {items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {repo.skills?.length ? `${repo.skills.length} skill${repo.skills.length > 1 ? 's' : ''}` : ''}
                        {repo.skills?.length && repo.agents?.length ? ' · ' : ''}
                        {repo.agents?.length ? `${repo.agents.length} agente${repo.agents.length > 1 ? 's' : ''}` : ''}
                    </div>
                    {shown.map(s => (
                        <button key={s.path} onClick={() => onOpenItem(repo.id, s.path)} style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 9, padding: '8px 10px', cursor: 'pointer', color: 'white', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, fontWeight: 600, flexWrap: 'wrap' }}>
                                {s.kind === 'agent' ? <Bot size={13} color="#38bdf8" /> : <Sparkles size={13} color="#a78bfa" />} {s.name}
                                <InstalledBadges installed={s.installed} />
                            </span>
                            {s.description && <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</span>}
                        </button>
                    ))}
                    {items.length > 6 && <button className="btn btn-ghost" onClick={() => setExpanded(!expanded)} style={{ fontSize: 12 }}>{expanded ? 'Ver menos' : `Ver las ${items.length}`}</button>}
                </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 4, alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={() => onReadme(repo)} disabled={repo.status !== 'ready'} style={{ fontSize: 12 }}><BookOpen size={13} /> README</button>
                <button className="btn btn-ghost" onClick={() => send(`/api/library/repo/sync?${q(repo.id)}`, 'POST').then(onChange)} disabled={repo.status === 'cloning' || repo.status === 'updating'} style={{ fontSize: 12 }}><RefreshCw size={13} /> Actualizar</button>
                <span style={{ flex: 1 }} />
                {repo.syncedAt && <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{repo.commit} · {new Date(repo.syncedAt).toLocaleDateString('es')}</span>}
                <button className="btn btn-ghost" aria-label="Quitar de la biblioteca" onClick={() => window.confirm(`¿Quitar ${repo.id} de la biblioteca? Se borra la copia local.`) && send(`/api/library/repo?${q(repo.id)}`, 'DELETE').then(onChange)} style={{ color: 'var(--accent-red)' }}><Trash2 size={14} /></button>
            </div>
        </div>
    );
}

export default function LibraryPanel() {
    const { projects = [] } = useApp();
    const [data, setData] = useState({ repos: [], stats: {} });
    const [error, setError] = useState('');
    const [url, setUrl] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [newTags, setNewTags] = useState('');
    const [adding, setAdding] = useState(false);
    const [view, setView] = useState('repos'); // repos | skills
    const [filter, setFilter] = useState('');
    const [interestFilter, setInterestFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [openItem, setOpenItem] = useState(null);
    const [readmeRepo, setReadmeRepo] = useState(null);

    const load = useCallback(() => getJson('/api/library').then(d => { setData(d); setError(''); }).catch(e => setError(e.message)), []);
    useEffect(() => { load(); }, [load]);
    // Mientras haya algo clonando, refresca.
    const busy = data.repos.some(r => r.status === 'cloning' || r.status === 'updating');
    useEffect(() => {
        if (!busy) return undefined;
        const t = setInterval(load, 2500);
        return () => clearInterval(t);
    }, [busy, load]);

    const add = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;
        setAdding(true); setError('');
        try {
            await send('/api/library/repos', 'POST', { url, notes: newNotes, tags: newTags });
            setUrl(''); setNewNotes(''); setNewTags('');
            load();
        } catch (err) { setError(err.message); } finally { setAdding(false); }
    };

    const allTags = useMemo(() => [...new Set(data.repos.flatMap(r => r.tags || []))].sort(), [data.repos]);
    const match = (text) => !filter || String(text).toLowerCase().includes(filter.toLowerCase());
    const repos = data.repos.filter(r =>
        (!interestFilter ? r.interest !== 'archivado' : r.interest === interestFilter)
        && (!tagFilter || (r.tags || []).includes(tagFilter))
        && (match(`${r.id} ${r.description} ${r.notes} ${(r.tags || []).join(' ')} ${(r.topics || []).join(' ')}`) || [...r.skills, ...r.agents].some(s => match(`${s.name} ${s.description}`))));
    const skills = repos.flatMap(r => [...r.skills, ...r.agents].map(s => ({ ...s, repo: r.id }))).filter(s => match(`${s.name} ${s.description} ${s.repo}`) || match(s.repo));

    const st = data.stats || {};
    return (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Library size={20} style={{ color: '#a78bfa' }} /> Biblioteca de repos y skills
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '6px 0 0', maxWidth: 680, lineHeight: 1.5 }}>
                        Guarda repos de GitHub que te interesen. Se clonan en tu Mac, se detectan sus skills (<code>SKILL.md</code>) y agentes, entran al RAG y los ven Claude, ChatGPT y OpenClaw por MCP (<code>search_library</code>). Instala cualquier skill en este proyecto, en otro o global.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div><div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>{st.repos ?? 0}</div>repos</div>
                    <div><div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>{st.skills ?? 0}</div>skills</div>
                    <div><div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8' }}>{st.agents ?? 0}</div>agentes</div>
                </div>
            </div>

            <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) minmax(180px, 2fr) minmax(120px, 1fr) auto', gap: 8 }}>
                <input style={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/dueño/repo" aria-label="Enlace del repo de GitHub" />
                <input style={input} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Para qué te sirve (opcional)" />
                <input style={input} value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="etiquetas, separadas" />
                <button className="btn btn-primary" type="submit" disabled={adding || !url.trim()}>{adding ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Agregar</button>
            </form>
            {error && <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#f87171', fontSize: 13 }}><AlertCircle size={14} /> {error}</div>}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 3, border: '1px solid var(--border-subtle)' }}>
                    {[['repos', `Repos (${repos.length})`, <FolderGit2 key="i" size={13} />], ['skills', `Skills y agentes (${skills.length})`, <Sparkles key="i" size={13} />]].map(([k, label, icon]) => (
                        <button key={k} onClick={() => setView(k)} style={{ background: view === k ? 'var(--accent-primary)' : 'transparent', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>{icon} {label}</button>
                    ))}
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }} />
                    <input style={{ ...input, paddingLeft: 30, width: 220 }} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar…" />
                </div>
                <span style={chip('#94a3b8', !interestFilter)} onClick={() => setInterestFilter('')}>Activos</span>
                {Object.entries(INTEREST).map(([k, v]) => <span key={k} style={chip(v.color, interestFilter === k)} onClick={() => setInterestFilter(interestFilter === k ? '' : k)}>{v.label}</span>)}
                {allTags.length > 0 && <Tag size={13} style={{ color: 'var(--text-tertiary)', marginLeft: 6 }} />}
                {allTags.map(t => <span key={t} style={chip('#a78bfa', tagFilter === t)} onClick={() => setTagFilter(tagFilter === t ? '' : t)}>#{t}</span>)}
            </div>

            {data.repos.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                    <FileText size={26} style={{ opacity: 0.5 }} /><br />
                    Todavía no hay repos. Pega un enlace de GitHub arriba: una colección de skills (p. ej. <code>anthropics/skills</code>), una librería que quieras usar o un proyecto de referencia.
                </div>
            ) : view === 'repos' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                    {repos.map(r => <RepoCard key={r.id} repo={r} projects={projects} onChange={load} onOpenItem={(id, p) => setOpenItem({ id, path: p })} onReadme={setReadmeRepo} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {skills.map(s => (
                        <button key={`${s.repo}:${s.path}`} onClick={() => setOpenItem({ id: s.repo, path: s.path })} style={{ ...card, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'white', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 700, fontSize: 13.5 }}>
                                {s.kind === 'agent' ? <Bot size={14} color="#38bdf8" /> : <Sparkles size={14} color="#a78bfa" />} {s.name}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.repo}{s.files > 1 ? ` · ${s.files} archivos` : ''}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</span>
                            <InstalledBadges installed={s.installed} />
                        </button>
                    ))}
                    {!skills.length && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Ningún repo filtrado tiene skills o agentes.</div>}
                </div>
            )}

            {busy && <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#38bdf8' }}><Loader2 size={13} className="spin" /> Clonando y analizando repos…</div>}
            {!busy && data.repos.length > 0 && <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, color: 'var(--text-tertiary)' }}><CheckCircle2 size={12} /> Todo indexado en el RAG · se actualizan solos cada noche</div>}

            {openItem && <ItemModal repoId={openItem.id} itemPath={openItem.path} stats={st} onClose={() => setOpenItem(null)} onInstalled={load} />}
            {readmeRepo && <ReadmeModal repo={readmeRepo} onClose={() => setReadmeRepo(null)} />}
        </div>
    );
}
