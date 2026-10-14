import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Flame, Link2, Upload, RefreshCw, Trash2, Sparkles, Copy, Check, Loader2, Scissors, Clock, Wrench } from 'lucide-react';
import { studioApi, mediaUrl } from '../../lib/studioApi';
import AccountChips from './AccountChips';
import './Studio.css';

const TYPE = { viral: { label: 'Viral', icon: Flame }, tutorial: { label: 'Tutorial', icon: GraduationCap } };

function AddReference({ accounts, account, onAdded }) {
    const [type, setType] = useState('viral');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [accountIds, setAccountIds] = useState(account ? [account.id] : []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setBusy(true); setError('');
        const fd = new FormData();
        fd.append('type', type);
        if (url) fd.append('url', url.trim());
        if (notes) fd.append('notes', notes);
        if (accountIds.length) fd.append('accountIds', accountIds.join(','));
        if (file) fd.append('file', file);
        try {
            await studioApi.addReference(fd);
            setUrl(''); setFile(null); setNotes(''); setAccountIds(account ? [account.id] : []);
            onAdded();
        } catch (err) { setError(err.message); }
        setBusy(false);
    };

    return (
        <div className="ref-add">
            <div className="gen-modes">
                {Object.entries(TYPE).map(([id, t]) => {
                    const Icon = t.icon;
                    return <button key={id} className={type === id ? 'on' : ''} onClick={() => setType(id)}><Icon size={14} /> {id === 'viral' ? 'Video viral / referencia' : 'Tutorial (cómo hacer algo)'}</button>;
                })}
            </div>
            <div className="ref-add-row">
                <Link2 size={14} />
                <input placeholder="Link de Instagram, TikTok, YouTube, X…" value={url} onChange={e => setUrl(e.target.value)} />
                <label className="ref-file">
                    <Upload size={13} /> {file ? file.name : 'o subir video'}
                    <input type="file" accept="video/*" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
            </div>
            <textarea rows={2} placeholder={type === 'tutorial' ? 'Qué técnica enseña o qué quieres aprender de este tutorial (opcional)' : 'Qué te gusta de este video, para qué cuenta lo ves… (opcional)'} value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="ref-add-foot">
                <div className="ref-accts">
                    <AccountChips accounts={accounts} value={accountIds} onChange={setAccountIds} />
                </div>
                <button className="social-btn-primary" disabled={busy || (!url && !file)} onClick={submit}>{busy ? 'Subiendo…' : 'Agregar y analizar'}</button>
            </div>
            {error && <div className="studio-error">{error}</div>}
        </div>
    );
}

function ReferenceDetail({ refItem: r, accounts, account, onClose, onChanged }) {
    const a = r.analysis;
    const [accountId, setAccountId] = useState(account?.id || r.accountIds?.[0] || '');
    const [accountIds, setAccountIds] = useState(r.accountIds || []);
    const assign = async ids => {
        setAccountIds(ids);
        try { await studioApi.updateReference(r.id, { accountIds: ids }); onChanged(); } catch (err) { setMsg(err.message); }
    };
    const [direction, setDirection] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [copied, setCopied] = useState(false);

    const recreate = async () => {
        setBusy(true); setMsg('');
        try {
            const task = await studioApi.recreate(r.id, { accountId, direction });
            setMsg(`Idea creada para ${task.accountHandler}: "${task.title}". Está en la cuenta → Producción, lista para desarrollar.`);
            onChanged();
        } catch (err) { setMsg(err.message); }
        setBusy(false);
    };

    const instruction = a?.recreate?.needsNewBuild
        ? `Lee ${r.playbookPath} y construye en studio/ una plantilla reutilizable para la técnica "${a.technique.name}" (${a.recreate.buildNotes}). Regístrala en Root.jsx, pruébala con una marca y agrégala al skill content-machine.`
        : `Lee ${r.playbookPath} y recrea esta pieza para ${accounts.find(x => x.id === accountId)?.handler || 'la cuenta'} con su línea (BRAND.md y DNA.md) usando la máquina de contenido.`;
    const copy = async () => { try { await navigator.clipboard.writeText(instruction); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sin portapapeles */ } };

    return (
        <div className="social-modal-overlay animate-in" onClick={onClose}>
            <div className="social-modal-box ref-modal" onClick={e => e.stopPropagation()}>
                <div className="social-modal-header">
                    <div>
                        <h3 className="social-modal-title">{TYPE[r.type]?.label} · {r.title || a?.title}</h3>
                        <p className="social-modal-sub">{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a> : 'Archivo subido'}{r.analyzedBy ? ` · analizado con ${r.analyzedBy}` : ''}</p>
                        <div className="ref-assign"><span>Asignada a</span><AccountChips accounts={accounts} value={accountIds} onChange={assign} /></div>
                    </div>
                    <button className="social-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="social-modal-body ref-body">
                    <div className="ref-media">
                        {r.sourcePath && <video src={mediaUrl(r.sourcePath)} poster={r.thumbPath ? mediaUrl(r.thumbPath) : undefined} controls playsInline />}
                        {r.stats && (
                            <div className="ref-stats">
                                <span><Clock size={12} /> {r.stats.duration.toFixed(1)} s</span>
                                <span><Scissors size={12} /> {r.stats.cuts} cortes</span>
                                <span>{r.stats.avgShot.toFixed(2)} s por plano</span>
                            </div>
                        )}
                        {r.sheetPath && <img className="ref-sheet" src={mediaUrl(r.sheetPath)} alt="Un frame por plano" />}
                    </div>
                    {a && (
                        <div className="ref-analysis">
                            <p className="ref-summary">{a.summary}</p>
                            <h4>Gancho · 0–{a.hook.seconds}s</h4>
                            <p>{a.hook.description} <em>{a.hook.whyItWorks}</em></p>
                            <h4>Estructura</h4>
                            <div className="ref-structure">{a.structure.map((s, i) => <div key={i}><b>{s.t}</b><span>{s.beat}</span><p>{s.description}</p></div>)}</div>
                            <h4>Edición</h4>
                            <dl>
                                <dt>Ritmo</dt><dd>{a.editing.pace}</dd>
                                <dt>Transiciones</dt><dd>{a.editing.transitions.join(' · ') || '—'}</dd>
                                <dt>Efectos</dt><dd>{a.editing.effects.join(' · ') || '—'}</dd>
                                <dt>Cámara</dt><dd>{a.editing.cameraMoves.join(' · ') || '—'}</dd>
                                <dt>Texto</dt><dd>{a.editing.textStyle}</dd>
                                <dt>Subtítulos</dt><dd>{a.editing.captions}</dd>
                                <dt>Color</dt><dd>{a.editing.color}</dd>
                                <dt>Audio</dt><dd>{a.editing.audio}</dd>
                            </dl>
                            <h4>Técnica · {a.technique.name} <span className="idea-pillar">{a.technique.category}</span></h4>
                            <ol>{a.technique.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                            {a.technique.parameters.length > 0 && <p className="ref-params">{a.technique.parameters.join(' · ')}</p>}
                            <h4>Cómo la hace la máquina · {a.recreate.difficulty}</h4>
                            <ul>{a.recreate.ourTools.map((t, i) => <li key={i}><b>{t.tool}:</b> {t.how}</li>)}</ul>
                            {a.recreate.needsNewBuild && <div className="ref-build"><Wrench size={13} /> Plantilla por construir: {a.recreate.buildNotes}</div>}
                            {a.adaptations.length > 0 && (<><h4>Adaptaciones</h4><ul>{a.adaptations.map((x, i) => <li key={i}><b>{x.accountHandler}:</b> {x.idea} <em>“{x.hook}”</em></li>)}</ul></>)}
                            {r.transcript && <details><summary>Transcripción</summary><pre>{r.transcript}</pre></details>}
                        </div>
                    )}
                </div>
                {a && (
                    <div className="social-modal-footer ref-foot">
                        <div className="ref-recreate">
                            <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                                <option value="">Recrear para…</option>
                                {accounts.map(x => <option key={x.id} value={x.id}>{x.handler}</option>)}
                            </select>
                            <input placeholder="Dirección opcional" value={direction} onChange={e => setDirection(e.target.value)} />
                            <button className="social-btn-primary" disabled={!accountId || busy} onClick={recreate}><Sparkles size={13} /> {busy ? 'Creando…' : 'Crear idea'}</button>
                        </div>
                        <button className="social-btn-secondary" onClick={copy} title={instruction}>{copied ? <Check size={13} /> : <Copy size={13} />} Instrucción para Claude Code</button>
                        {msg && <p className="ref-msg">{msg}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Biblioteca de referencias virales y tutoriales que la máquina aprende a recrear. */
export default function ReferencesPanel({ accounts, account = null, onChanged }) {
    const [refs, setRefs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [openId, setOpenId] = useState(null);
    const [reload, setReload] = useState(0);
    const [error, setError] = useState('');
    const busy = refs.some(r => ['queued', 'analyzing'].includes(r.status));

    useEffect(() => {
        let alive = true;
        const load = () => studioApi.references().then(list => { if (alive) setRefs(list); }).catch(err => { if (alive) setError(err.message); });
        load();
        const id = busy ? setInterval(load, 4000) : null;
        return () => { alive = false; if (id) clearInterval(id); };
    }, [reload, busy]);

    const visible = useMemo(() => refs
        .filter(r => !account || (r.accountIds || []).includes(account.id))
        .filter(r => filter === 'all' || r.type === filter || (filter === 'build' && r.analysis?.recreate?.needsNewBuild)), [refs, filter, account]);
    const open = refs.find(r => r.id === openId);
    const refresh = () => { setReload(k => k + 1); onChanged?.(); };

    return (
        <div className="refs">
            <AddReference key={account?.id || 'all'} accounts={accounts} account={account} onAdded={refresh} />
            {error && <div className="studio-error">{error}</div>}
            <div className="raw-filters">
                {[['all', 'Todo'], ['viral', 'Virales'], ['tutorial', 'Tutoriales'], ['build', 'Técnicas por construir']].map(([id, label]) => (
                    <button key={id} className={`raw-chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{label}</button>
                ))}
            </div>
            {!visible.length ? (
                <div className="raw-empty"><GraduationCap size={22} /> Agrega videos virales o tutoriales: la máquina los desarma (gancho, estructura, cortes, texto, audio, técnica) y los convierte en recetas para recrear con cada cuenta.</div>
            ) : (
                <div className="ref-grid">
                    {visible.map(r => {
                        const Icon = TYPE[r.type]?.icon || Flame;
                        const working = ['queued', 'analyzing'].includes(r.status);
                        return (
                            <div key={r.id} className={`ref-card st-${r.status}`} onClick={() => r.analysis && setOpenId(r.id)}>
                                <div className="ref-thumb">
                                    {r.thumbPath ? <img src={mediaUrl(r.thumbPath)} alt="" loading="lazy" /> : <Icon size={22} />}
                                    <span className="ref-type"><Icon size={11} /> {TYPE[r.type]?.label}</span>
                                    {r.stats && <span className="raw-dur">{r.stats.duration.toFixed(0)}s · {r.stats.cuts} cortes</span>}
                                </div>
                                <div className="ref-info">
                                    <b>{r.title || r.analysis?.title || r.url || 'Referencia'}</b>
                                    {working && <span className="ref-status"><Loader2 size={12} className="spin" /> {r.step || 'En cola…'}</span>}
                                    {r.status === 'error' && <span className="ref-status err">{r.error}</span>}
                                    {!account && (r.accountIds || []).length > 0 && <span className="ref-tech">{r.accountIds.map(id => accounts.find(x => x.id === id)?.handler).filter(Boolean).join(' · ')}</span>}
                                    {r.analysis && <span className="ref-tech">{r.analysis.technique.name} · {r.analysis.recreate.difficulty}{r.analysis.recreate.needsNewBuild ? ' · por construir' : ''}</span>}
                                </div>
                                <div className="ref-actions" onClick={e => e.stopPropagation()}>
                                    {(r.status === 'error' || r.status === 'ready') && <button title="Volver a analizar" onClick={() => studioApi.reanalyze(r.id).then(refresh)}><RefreshCw size={12} /></button>}
                                    <button title="Eliminar" onClick={() => window.confirm('¿Eliminar esta referencia y sus archivos?') && studioApi.deleteReference(r.id).then(refresh)}><Trash2 size={12} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {open && <ReferenceDetail refItem={open} accounts={accounts} account={account} onClose={() => setOpenId(null)} onChanged={refresh} />}
        </div>
    );
}
