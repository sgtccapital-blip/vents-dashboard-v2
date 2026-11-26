import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Film, Wand2, Copy, Check, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { studioApi, thumbUrl, mediaUrl } from '../../lib/studioApi';

const MODES = [
    { id: 'image', label: 'Imagen', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Film },
    { id: 'prompts', label: 'Prompts para Flow / Higgsfield', icon: Wand2 },
];
const ASPECTS = { image: ['9:16', '4:5', '1:1', '16:9'], video: ['9:16', '16:9'] };

function PromptPack({ account }) {
    const [goal, setGoal] = useState('');
    const [pack, setPack] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(-1);

    const run = async () => {
        setBusy(true); setError('');
        try { setPack(await studioApi.promptPack({ accountId: account.id, goal, count: 6 })); } catch (err) { setError(err.message); }
        setBusy(false);
    };
    const copy = async (text, i) => {
        try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch { /* sin portapapeles */ }
    };

    return (
        <div className="gen-body">
            <p className="gen-hint">Google Flow no tiene API: con tu plan Pro/Ultra se usa en el navegador. Aquí salen prompts con la línea de {account.handler} para pegar en Flow o Higgsfield; exporta los resultados a la carpeta de Drive (subcarpeta con “Flow” o “IA” en el nombre) y entran solos a la biblioteca como material IA.</p>
            <div className="gen-links">
                <a className="social-btn-secondary" href="https://labs.google/fx/tools/flow" target="_blank" rel="noreferrer"><ExternalLink size={13} /> Abrir Google Flow</a>
                <a className="social-btn-secondary" href="https://higgsfield.ai" target="_blank" rel="noreferrer"><ExternalLink size={13} /> Abrir Higgsfield</a>
            </div>
            <textarea rows={2} placeholder="Objetivo: ej. 'b-roll de la terraza al atardecer para el recap', 'transiciones de luz roja', 'fondos para historias de la próxima edición'…" value={goal} onChange={e => setGoal(e.target.value)} />
            <button className="social-btn-primary" disabled={busy} onClick={run}><Sparkles size={14} /> {busy ? 'Escribiendo prompts…' : 'Crear paquete de prompts'}</button>
            {error && <div className="studio-error">{error}</div>}
            {pack && (
                <div className="pack-grid">
                    {pack.prompts.map((p, i) => (
                        <div key={i} className="pack-card">
                            <div className="idea-head"><span className="idea-format">{p.tool}</span><span className="idea-pillar">{p.type}</span></div>
                            <h4>{p.title}</h4>
                            <pre>{p.prompt}</pre>
                            {p.negativePrompt && <p className="pack-neg"><b>Evitar:</b> {p.negativePrompt}</p>}
                            <p className="pack-meta">{p.settings} · {p.usage}</p>
                            <button className="social-btn-secondary" onClick={() => copy(p.prompt, i)}>{copied === i ? <Check size={13} /> : <Copy size={13} />} {copied === i ? 'Copiado' : 'Copiar prompt'}</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Generación de imagen y video con IA para una cuenta; lo generado entra a su biblioteca raw. */
export default function GeneratePanel({ account }) {
    const [mode, setMode] = useState('image');
    const [gens, setGens] = useState(null);
    const [library, setLibrary] = useState([]);
    const [form, setForm] = useState({ provider: 'google', model: '', prompt: '', aspectRatio: '9:16', size: '2K', resolution: '1080p', durationSeconds: 8, count: 1, useBrandStyle: true, negativePrompt: '' });
    const [refIds, setRefIds] = useState([]);
    const [firstFrameId, setFirstFrameId] = useState(null);
    const [estimate, setEstimate] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [error, setError] = useState('');
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        let alive = true;
        Promise.all([studioApi.generators(), studioApi.library(account.id)])
            .then(([g, lib]) => { if (alive) { setGens(g); setLibrary(lib.assets.filter(a => thumbUrl(a))); } })
            .catch(err => { if (alive) setError(err.message); });
        return () => { alive = false; };
    }, [account.id, jobs.length]);

    const kind = mode === 'video' ? 'video' : 'image';
    const models = useMemo(() => gens?.catalog?.[form.provider]?.[kind] || [], [gens, form.provider, kind]);
    const model = models.find(m => m.id === form.model) || models[0];
    const payload = { ...form, kind, model: model?.id, accountId: account.id, refAssetIds: refIds, firstFrameAssetId: kind === 'video' ? firstFrameId : null };

    useEffect(() => {
        if (!model) return undefined;
        let alive = true;
        studioApi.estimate({ provider: form.provider, kind, model: model.id, size: form.size, resolution: form.resolution, durationSeconds: form.durationSeconds, count: form.count })
            .then(r => { if (alive) setEstimate(r.usd); }).catch(() => {});
        return () => { alive = false; };
    }, [form.provider, kind, model, form.size, form.resolution, form.durationSeconds, form.count]);

    // Seguimiento de trabajos en curso
    const running = jobs.some(j => j.status === 'running');
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => {
            Promise.all(jobs.map(j => (j.status === 'running' ? studioApi.generation(j.id).catch(() => j) : j))).then(setJobs);
        }, 4000);
        return () => clearInterval(id);
    }, [running, jobs]);

    const go = async () => {
        setError('');
        if (estimate && estimate >= 1 && !window.confirm(`Esta generación cuesta aprox. US$ ${estimate.toFixed(2)} en tu cuenta de ${gens.catalog[form.provider].label}. ¿Continuar?`)) return;
        try {
            const job = await studioApi.generate(payload);
            setJobs(prev => [job, ...prev]);
        } catch (err) { setError(err.message); }
    };

    const toggleRef = id => setRefIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-3)));
    const provOk = gens?.providers?.[form.provider];

    return (
        <div className="gen">
            <div className="gen-modes">
                {MODES.map(m => {
                    const Icon = m.icon;
                    return <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)}><Icon size={14} /> {m.label}</button>;
                })}
            </div>

            {mode === 'prompts' ? <PromptPack account={account} /> : (
                <div className="gen-body">
                    <div className="gen-row">
                        <label>Proveedor
                            <select value={form.provider} onChange={e => { set('provider', e.target.value); set('model', ''); }}>
                                {Object.entries(gens?.catalog || {}).map(([id, p]) => <option key={id} value={id}>{p.label}{gens.providers[id] ? '' : ' (sin conectar)'}</option>)}
                            </select>
                        </label>
                        <label>Modelo
                            <select value={model?.id || ''} onChange={e => set('model', e.target.value)}>
                                {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </label>
                        <label>Formato
                            <select value={form.aspectRatio} onChange={e => set('aspectRatio', e.target.value)}>
                                {ASPECTS[kind].map(a => <option key={a}>{a}</option>)}
                            </select>
                        </label>
                        {kind === 'image' && model?.sizes && (
                            <label>Tamaño
                                <select value={form.size} onChange={e => set('size', e.target.value)}>{model.sizes.map(s => <option key={s}>{s}</option>)}</select>
                            </label>
                        )}
                        {kind === 'video' && (
                            <>
                                <label>Duración
                                    <select value={form.durationSeconds} onChange={e => set('durationSeconds', Number(e.target.value))}>{[4, 6, 8].map(d => <option key={d} value={d}>{d} s</option>)}</select>
                                </label>
                                {model?.resolutions && (
                                    <label>Resolución
                                        <select value={form.resolution} onChange={e => set('resolution', e.target.value)}>{model.resolutions.map(r => <option key={r}>{r}</option>)}</select>
                                    </label>
                                )}
                            </>
                        )}
                        <label>Cantidad
                            <select value={form.count} onChange={e => set('count', Number(e.target.value))}>{(kind === 'video' ? [1, 2] : [1, 2, 3, 4]).map(n => <option key={n}>{n}</option>)}</select>
                        </label>
                    </div>

                    <textarea rows={3} placeholder={kind === 'video' ? 'Ej: plano lento de una copa de cóctel con luz roja en una barra oscura, humo suave, la cámara se acerca' : 'Ej: mesa VIP con botellas y bengalas en penumbra roja, vista desde arriba'} value={form.prompt} onChange={e => set('prompt', e.target.value)} />
                    <div className="gen-opts">
                        <label><input type="checkbox" checked={form.useBrandStyle} onChange={e => set('useBrandStyle', e.target.checked)} /> Aplicar la línea de la marca (look, paleta, cámara; sin texto ni logos)</label>
                        {kind === 'video' && <input className="gen-neg" placeholder="Evitar (opcional): texto, logos, caras deformes…" value={form.negativePrompt} onChange={e => set('negativePrompt', e.target.value)} />}
                    </div>

                    {library.length > 0 && (
                        <div className="gen-refs">
                            <span>{kind === 'video' ? 'Primer frame (opcional) · o hasta 3 referencias:' : 'Referencias (opcional, hasta 3):'}</span>
                            <div className="gen-ref-grid">
                                {library.slice(0, 24).map(a => {
                                    const isFirst = firstFrameId === a.id;
                                    const isRef = refIds.includes(a.id);
                                    return (
                                        <button key={a.id} className={`gen-ref ${isRef ? 'ref' : ''} ${isFirst ? 'first' : ''}`} title={a.name}
                                            onClick={() => (kind === 'video' && !refIds.length ? setFirstFrameId(isFirst ? null : a.id) : toggleRef(a.id))}
                                            onContextMenu={e => { e.preventDefault(); toggleRef(a.id); }}>
                                            <img src={thumbUrl(a, 200)} alt="" loading="lazy" />
                                            {isFirst && <em>1er frame</em>}{isRef && <em>ref</em>}
                                        </button>
                                    );
                                })}
                            </div>
                            {kind === 'video' && <small>Clic: primer frame · clic derecho: referencia de estilo/objeto</small>}
                        </div>
                    )}

                    <div className="gen-go">
                        <span>{estimate != null ? `Costo estimado: US$ ${estimate.toFixed(2)}` : form.provider === 'higgsfield' ? 'Se descuenta de tus créditos de Higgsfield' : ''}</span>
                        <button className="social-btn-primary" disabled={!provOk || !form.prompt.trim() || !model} onClick={go}>
                            <Sparkles size={14} /> Generar {kind === 'video' ? 'video' : 'imagen'}
                        </button>
                    </div>
                    {!provOk && gens && <div className="studio-error">{form.provider === 'higgsfield' ? 'Conecta la API de Higgsfield: HF_API_KEY_ID y HF_API_KEY_SECRET en .env (console.higgsfield.ai).' : 'Falta GEMINI_API_KEY en .env.'}</div>}
                    {error && <div className="studio-error">{error}</div>}

                    {jobs.length > 0 && (
                        <div className="gen-jobs">
                            {jobs.map(j => (
                                <div key={j.id} className={`gen-job st-${j.status}`}>
                                    <div className="gen-job-head">
                                        {j.status === 'running' && <Loader2 size={13} className="spin" />}
                                        <b>{j.kind === 'video' ? 'Video' : 'Imagen'} · {j.model}</b>
                                        <span>{j.status === 'running' ? `${j.progress || 0}%` : j.status === 'done' ? `Listo · ${j.assets.length} archivo(s) en la biblioteca` : `Error: ${j.error}`}</span>
                                    </div>
                                    {j.assets?.length > 0 && (
                                        <div className="gen-results">
                                            {j.assets.map(a => (a.kind === 'video'
                                                ? <video key={a.id} src={mediaUrl(a.localPath)} poster={a.thumbPath ? mediaUrl(a.thumbPath) : undefined} controls playsInline />
                                                : <a key={a.id} href={mediaUrl(a.localPath, { download: true })}><img src={mediaUrl(a.localPath)} alt={a.name} /></a>))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
