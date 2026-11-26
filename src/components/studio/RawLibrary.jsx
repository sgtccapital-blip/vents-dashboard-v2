import { useEffect, useMemo, useState } from 'react';
import { FolderSync, RefreshCw, Sparkles, Film, Image as ImageIcon, Check, X, ExternalLink, Link2, CloudOff, Wand2 } from 'lucide-react';
import { studioApi, thumbUrl, formatDuration } from '../../lib/studioApi';
import './Studio.css';

const STATUS_LABEL = { new: 'Sin usar', used: 'Usado', discarded: 'Descartado', missing: 'Ya no está en Drive' };

function StudioSetup({ config, onSaved }) {
    const [url, setUrl] = useState(config?.folderUrl || '');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const save = async () => {
        setBusy(true); setMsg('');
        try {
            await studioApi.saveFolder(url);
            const r = await studioApi.sync();
            setMsg(`Sincronizado: ${r.total} archivos (${r.added} nuevos).`);
        } catch (err) {
            setMsg(err.message);
        }
        setBusy(false);
        onSaved();
    };

    return (
        <div className="studio-setup">
            <div className="studio-setup-row">
                <Link2 size={14} />
                <input placeholder="Pega el link de la carpeta de Google Drive con el material de cada noche" value={url} onChange={e => setUrl(e.target.value)} />
                <button className="social-btn-primary" disabled={busy || !url} onClick={save}>{busy ? 'Conectando…' : 'Conectar y sincronizar'}</button>
            </div>
            <div className="studio-status">
                <span className={config?.drive?.configured ? 'ok' : 'warn'}>
                    {config?.drive?.configured ? `Drive: ${config.drive.mode === 'service-account' ? `cuenta de servicio (${config.drive.serviceAccountEmail})` : 'API key (carpeta pública con link)'}` : 'Drive sin credenciales'}
                </span>
                <span className={config?.llm?.length ? 'ok' : 'warn'}>IA: {config?.llm?.length ? config.llm.join(' + ') : 'sin configurar'}</span>
                {config?.lastSyncAt && <span>Último sync: {new Date(config.lastSyncAt).toLocaleString()} · {config.lastSync?.total} archivos</span>}
            </div>
            {!config?.drive?.configured && (
                <p className="studio-hint">
                    Falta conectar Google Drive en el servidor. Recomendado: crea una cuenta de servicio en Google Cloud (Drive API activada), guarda su JSON y pon su ruta en <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> del <code>.env</code>; luego comparte la carpeta con el email de la cuenta de servicio. Alternativa rápida: <code>GOOGLE_API_KEY</code> con la carpeta compartida como “cualquiera con el enlace”.
                </p>
            )}
            {msg && <p className="studio-msg">{msg}</p>}
        </div>
    );
}

function IdeaCard({ idea, assetsById, onApprove, onDiscard }) {
    return (
        <div className="idea-card">
            <div className="idea-head">
                <span className="idea-format">{idea.format}</span>
                <span className="idea-pillar">{idea.pillar}</span>
                <span className="idea-dur">{idea.durationSec}s</span>
            </div>
            <h4>{idea.title}</h4>
            <p className="idea-concept">{idea.concept}</p>
            <dl>
                <dt>Gancho</dt><dd>{idea.hook}</dd>
                <dt>Texto en pantalla</dt><dd>{idea.overlayText}</dd>
                <dt>Caption</dt><dd>{idea.caption} <em>{idea.cta}</em></dd>
            </dl>
            <div className="idea-assets">
                {idea.assetIds.map(id => {
                    const a = assetsById.get(id);
                    if (!a) return null;
                    const src = thumbUrl(a, 160);
                    return <span key={id} title={a.name}>{src ? <img src={src} alt="" loading="lazy" /> : <Film size={12} />}</span>;
                })}
            </div>
            <p className="idea-why">{idea.why}</p>
            <div className="idea-actions">
                <button className="social-btn-secondary" onClick={onDiscard}><X size={13} /> Descartar</button>
                <button className="social-btn-primary" onClick={onApprove}><Check size={13} /> Aprobar idea</button>
            </div>
        </div>
    );
}

/**
 * Biblioteca de material raw. Con `account` muestra solo su material y permite generar ideas;
 * sin cuenta, es la vista global para conectar Drive y asignar material a cuentas.
 */
export default function RawLibrary({ account = null, accounts = [], onApproveIdea }) {
    const [config, setConfig] = useState(null);
    const [lib, setLib] = useState({ nights: [], assets: [] });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(() => new Set());
    const [statusFilter, setStatusFilter] = useState('new');
    const [nightFilter, setNightFilter] = useState('all');
    const [direction, setDirection] = useState('');
    const [count, setCount] = useState(5);
    const [ideas, setIdeas] = useState([]);
    const [ideaMeta, setIdeaMeta] = useState(null);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    // `reloadKey` fuerza una recarga tras sync o cambios; el estado solo se actualiza al llegar los datos.
    const [reloadKey, setReloadKey] = useState(0);
    const accountId = account?.id;
    useEffect(() => {
        let alive = true;
        Promise.all([studioApi.config(), studioApi.library(accountId)])
            .then(([cfg, data]) => { if (alive) { setConfig(cfg); setLib(data); setError(''); } })
            .catch(err => { if (alive) setError(err.message); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [accountId, reloadKey]);
    const load = () => { setLoading(true); setReloadKey(k => k + 1); };

    const assetsById = useMemo(() => new Map(lib.assets.map(a => [a.id, a])), [lib.assets]);
    const visible = useMemo(() => lib.assets.filter(a =>
        (statusFilter === 'all' || a.status === statusFilter) && (nightFilter === 'all' || a.nightId === nightFilter)
    ), [lib.assets, statusFilter, nightFilter]);
    const nightsVisible = useMemo(() => {
        const ids = new Set(visible.map(a => a.nightId));
        return lib.nights.filter(n => ids.has(n.id));
    }, [lib.nights, visible]);

    const toggle = id => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const selectNight = night => setSelected(prev => {
        const ids = visible.filter(a => a.nightId === night.id).map(a => a.id);
        const allIn = ids.every(id => prev.has(id));
        const next = new Set(prev);
        ids.forEach(id => (allIn ? next.delete(id) : next.add(id)));
        return next;
    });

    const runSync = async () => {
        setBusy('sync'); setError('');
        try { await studioApi.sync(); load(); } catch (err) { setError(err.message); }
        setBusy('');
    };

    const patch = async changes => {
        const ids = [...selected];
        if (!ids.length) return;
        setBusy('patch');
        try { await studioApi.updateAssets(ids, changes); setSelected(new Set()); load(); } catch (err) { setError(err.message); }
        setBusy('');
    };

    const generate = async () => {
        setBusy('ideas'); setError(''); setIdeas([]);
        try {
            const r = await studioApi.ideas({ accountId: account.id, assetIds: [...selected], count, direction });
            setIdeas(r.ideas);
            setIdeaMeta({ provider: r.provider, model: r.model, usedImages: r.usedImages });
        } catch (err) {
            setError(err.message);
        }
        setBusy('');
    };

    const approve = idea => {
        onApproveIdea?.(idea);
        setIdeas(prev => prev.filter(i => i !== idea));
    };

    const accountName = id => accounts.find(a => a.id === id)?.handler || id;

    return (
        <div className="raw-lib">
            {(!account || !config?.folderId) && <StudioSetup config={config} onSaved={load} />}

            <div className="raw-toolbar">
                <div className="raw-filters">
                    {['new', 'used', 'discarded', 'all'].map(s => (
                        <button key={s} className={`raw-chip ${statusFilter === s ? 'on' : ''}`} onClick={() => setStatusFilter(s)}>
                            {s === 'all' ? 'Todo' : STATUS_LABEL[s]}
                        </button>
                    ))}
                    <select value={nightFilter} onChange={e => setNightFilter(e.target.value)}>
                        <option value="all">Todas las noches</option>
                        {lib.nights.map(n => <option key={n.id} value={n.id}>{n.date || ''} {n.name}</option>)}
                    </select>
                </div>
                <div className="raw-actions">
                    <span className="raw-count">{selected.size} seleccionados</span>
                    {!account && accounts.length > 0 && (
                        <select disabled={!selected.size} value="" onChange={e => e.target.value && patch({ accountIds: e.target.value === '__none' ? [] : [e.target.value] })}>
                            <option value="">Asignar a cuenta…</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.handler}</option>)}
                            <option value="__none">Sin cuenta</option>
                        </select>
                    )}
                    <button className="social-btn-secondary" disabled={!selected.size} onClick={() => patch({ status: 'discarded' })}><X size={13} /> Descartar</button>
                    <button className="social-btn-secondary" disabled={!selected.size} onClick={() => patch({ status: 'new' })}>Restaurar</button>
                    <button className="social-btn-secondary" disabled={busy === 'sync' || !config?.folderId} onClick={runSync}>
                        <RefreshCw size={13} className={busy === 'sync' ? 'spin' : ''} /> Sincronizar Drive
                    </button>
                </div>
            </div>

            {error && <div className="studio-error">{error}</div>}

            {account && (
                <div className="idea-gen">
                    <div className="idea-gen-head"><Wand2 size={15} /> De material raw a ideas · {account.handler}</div>
                    <textarea rows={2} placeholder="Dirección opcional: ej. 'recap de la edición 7 para publicar el lunes', 'algo divertido para TikTok', 'anunciar la próxima fecha'…" value={direction} onChange={e => setDirection(e.target.value)} />
                    <div className="idea-gen-row">
                        <span>{selected.size ? `Usará ${selected.size} archivos seleccionados` : 'Sin selección: usará el material sin usar más reciente de la cuenta'}</span>
                        <select value={count} onChange={e => setCount(Number(e.target.value))}>
                            {[3, 5, 8].map(n => <option key={n} value={n}>{n} ideas</option>)}
                        </select>
                        <button className="social-btn-primary" disabled={busy === 'ideas' || !lib.assets.length} onClick={generate}>
                            <Sparkles size={14} /> {busy === 'ideas' ? 'Pensando ideas…' : 'Generar ideas'}
                        </button>
                    </div>
                    {ideaMeta && <div className="idea-meta">Generado con {ideaMeta.provider} ({ideaMeta.model}){ideaMeta.usedImages ? ` · vio ${ideaMeta.usedImages} miniaturas` : ''}</div>}
                    {ideas.length > 0 && (
                        <div className="idea-grid">
                            {ideas.map((idea, i) => (
                                <IdeaCard key={i} idea={idea} assetsById={assetsById} onApprove={() => approve(idea)} onDiscard={() => setIdeas(prev => prev.filter(x => x !== idea))} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="raw-empty"><FolderSync size={22} /> Cargando material…</div>
            ) : !lib.assets.length ? (
                <div className="raw-empty">
                    <CloudOff size={22} />
                    {account ? `Todavía no hay material asignado a ${account.handler}. Conecta la carpeta de Drive o asigna material desde la pestaña Material raw.` : 'Conecta la carpeta de Drive para ver el material de cada noche.'}
                </div>
            ) : (
                nightsVisible.map(night => {
                    const items = visible.filter(a => a.nightId === night.id);
                    return (
                        <section key={night.id} className="raw-night">
                            <header>
                                <button className="raw-night-select" onClick={() => selectNight(night)} title="Seleccionar la noche completa"><Check size={13} /></button>
                                <b>{night.name}</b>
                                <span>{night.date || ''} · {night.counts.video} videos · {night.counts.image} fotos · {night.unused} sin usar</span>
                                {!account && <span className="raw-night-accts">{night.accountIds.length ? night.accountIds.map(accountName).join(' · ') : 'Sin cuenta detectada'}</span>}
                            </header>
                            <div className="raw-grid">
                                {items.map(a => {
                                    const src = thumbUrl(a);
                                    return (
                                        <div key={a.id} className={`raw-item ${selected.has(a.id) ? 'sel' : ''} st-${a.status}`} onClick={() => toggle(a.id)}>
                                            <div className="raw-thumb">
                                                {src ? <img src={src} alt={a.name} loading="lazy" /> : (a.kind === 'video' ? <Film size={20} /> : <ImageIcon size={20} />)}
                                                {a.kind === 'video' && <span className="raw-dur">{formatDuration(a.durationSec)}</span>}
                                                {a.orientation && <span className="raw-ori">{a.orientation === 'vertical' ? '9:16' : '16:9'}</span>}
                                                {selected.has(a.id) && <span className="raw-check"><Check size={14} /></span>}
                                            </div>
                                            <div className="raw-meta">
                                                <span title={a.name}>{a.name}</span>
                                                <a href={a.webViewLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Abrir en Drive"><ExternalLink size={11} /></a>
                                            </div>
                                            {a.status !== 'new' && <div className="raw-status">{STATUS_LABEL[a.status]}</div>}
                                            {!account && <div className="raw-accts">{(a.accountIds || []).map(accountName).join(', ') || '—'}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })
            )}
        </div>
    );
}
