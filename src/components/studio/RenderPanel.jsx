import { useEffect, useState } from 'react';
import { Clapperboard, Download, RefreshCw, Subtitles } from 'lucide-react';
import { studioApi, mediaUrl } from '../../lib/studioApi';

/** Render de una pieza con la máquina de contenido (studio/) y vista del resultado. */
export default function RenderPanel({ task }) {
    const [job, setJob] = useState(null);
    const [captions, setCaptions] = useState(false);
    const [error, setError] = useState('');
    const active = job && ['queued', 'running'].includes(job.status);

    // Al abrir, recupera un render en curso; solo mientras corre, consulta el progreso cada 3 s.
    useEffect(() => {
        let alive = true;
        const tick = () => studioApi.renderStatus(task.id).then(j => { if (alive) setJob(j); }).catch(() => {});
        tick();
        const id = active ? setInterval(tick, 3000) : null;
        return () => { alive = false; if (id) clearInterval(id); };
    }, [task.id, active]);

    const start = async () => {
        setError('');
        try { setJob(await studioApi.render(task.id, { captions })); } catch (err) { setError(err.message); }
    };

    const version = task.renderedAt || '';
    return (
        <div className="render-panel">
            {task.renderPath && !active && (
                <div className="render-result">
                    <video src={mediaUrl(task.renderPath, { v: version })} poster={task.coverPath ? mediaUrl(task.coverPath, { v: version }) : undefined} controls playsInline preload="none" />
                    <div className="render-files">
                        <a className="social-btn-primary" href={mediaUrl(task.renderPath, { download: true, v: version })}><Download size={13} /> Video</a>
                        {task.coverPath && <a className="social-btn-secondary" href={mediaUrl(task.coverPath, { download: true, v: version })}><Download size={13} /> Portada</a>}
                        {(task.storyPaths || []).map((p, i) => (
                            <a key={p} className="render-story" href={mediaUrl(p, { download: true, v: version })} title={`Historia ${i + 1}`}>
                                <img src={mediaUrl(p, { v: version })} alt={`Historia ${i + 1}`} loading="lazy" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
            {active && (
                <div className="render-progress">
                    <div className="render-bar"><i style={{ width: `${job.status === 'queued' ? 2 : Math.max(5, job.progress || 0)}%` }} /></div>
                    <span>{job.status === 'queued' ? 'En cola…' : `Renderizando… ${job.progress || 0}%`}</span>
                    <pre>{(job.log || '').split('\n').filter(Boolean).slice(-2).join('\n')}</pre>
                </div>
            )}
            {job?.status === 'error' && <div className="studio-error">El render falló: {(job.log || '').split('\n').filter(l => l.includes('✗')).pop() || 'revisa el log'}</div>}
            {error && <div className="studio-error">{error}</div>}
            {!active && (
                <div className="render-actions">
                    <label title="Transcribe la voz con Whisper y pone subtítulos palabra por palabra"><input type="checkbox" checked={captions} onChange={e => setCaptions(e.target.checked)} /> <Subtitles size={13} /> Subtítulos</label>
                    <button className={task.renderPath ? 'social-btn-secondary' : 'social-btn-primary'} onClick={start}>
                        {task.renderPath ? <RefreshCw size={13} /> : <Clapperboard size={13} />} {task.renderPath ? 'Volver a renderizar' : 'Renderizar video'}
                    </button>
                </div>
            )}
        </div>
    );
}
