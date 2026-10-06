import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Wand2, PackageCheck, FileText, Film, Copy, Check, X, Clapperboard } from 'lucide-react';
import { studioApi } from '../../lib/studioApi';
import RenderPanel from './RenderPanel';

const STAGES = [
    { id: 'idea', label: 'Idea', next: 'Desarrollar con IA' },
    { id: 'script', label: 'Desarrollada', next: 'Generar paquete de producción' },
    { id: 'shooting', label: 'Por grabar' },
    { id: 'editing', label: 'En edición' },
    { id: 'ready', label: 'Lista' },
    { id: 'published', label: 'Publicada' },
];

function BriefModal({ task, markdown, onClose }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sin portapapeles */ }
    };
    return (
        <div className="social-modal-overlay animate-in" onClick={onClose}>
            <div className="social-modal-box brief-modal" onClick={e => e.stopPropagation()}>
                <div className="social-modal-header">
                    <div>
                        <h3 className="social-modal-title"><FileText size={18} /> Paquete de producción</h3>
                        <p className="social-modal-sub">{task.briefPath ? `Guardado en ${task.briefPath}` : task.title}</p>
                    </div>
                    <button className="social-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="social-modal-body brief-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></div>
                <div className="social-modal-footer">
                    <span className="brief-hint">Pásalo al editor o pídele a Claude Code: “ejecuta el brief {task.briefPath}”.</span>
                    <button className="social-btn-primary" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar brief'}</button>
                </div>
            </div>
        </div>
    );
}

export default function ProductionBoard({ account, tasks, onTaskChange, onOpenTask }) {
    const [busy, setBusy] = useState({});
    const [error, setError] = useState('');
    const [brief, setBrief] = useState(null);

    const run = async (task, action) => {
        setBusy(b => ({ ...b, [task.id]: action })); setError('');
        try {
            if (action === 'develop') {
                const updated = await studioApi.develop(task.id);
                onTaskChange(updated);
            } else {
                const { task: updated, markdown } = await studioApi.execute(task.id);
                onTaskChange(updated);
                setBrief({ task: updated, markdown });
            }
        } catch (err) {
            setError(`${task.title}: ${err.message}`);
        }
        setBusy(b => ({ ...b, [task.id]: null }));
    };

    const showBrief = async task => {
        try {
            const { task: updated, markdown } = await studioApi.execute(task.id);
            onTaskChange(updated);
            setBrief({ task: updated, markdown });
        } catch (err) {
            setError(err.message);
        }
    };

    if (!tasks.length) {
        return <div className="raw-empty"><Clapperboard size={22} /> {account.handler} todavía no tiene piezas. Genera ideas desde el material raw y apruébalas.</div>;
    }

    return (
        <div className="prod-board">
            {error && <div className="studio-error">{error} <button onClick={() => setError('')}><X size={12} /></button></div>}
            {STAGES.map(stage => {
                const items = tasks.filter(t => (t.status || 'idea') === stage.id);
                if (!items.length) return null;
                return (
                    <section key={stage.id} className="prod-stage">
                        <h4>{stage.label} <span>{items.length}</span></h4>
                        <div className="prod-cards">
                            {items.map(t => (
                                <div key={t.id} className="prod-card">
                                    <div className="prod-card-top">
                                        <span className="idea-format">{t.format}</span>
                                        {t.rawAssetIds?.length > 0 && <span className="prod-raw"><Film size={11} /> {t.rawAssetIds.length} raw</span>}
                                        {t.development?.generatedBy && <span className="prod-ai">IA · {t.development.generatedBy.split(':')[0]}</span>}
                                    </div>
                                    <b onClick={() => onOpenTask(t)}>{t.title}</b>
                                    {t.hookVerbal && <p>{t.hookVerbal}</p>}
                                    {t.development && ['editing', 'ready', 'published'].includes(stage.id) && <RenderPanel task={t} />}
                                    <div className="prod-card-actions">
                                        {stage.id === 'idea' && (
                                            <button className="social-btn-primary" disabled={!!busy[t.id]} onClick={() => run(t, 'develop')}>
                                                <Wand2 size={13} /> {busy[t.id] === 'develop' ? 'Desarrollando…' : stage.next}
                                            </button>
                                        )}
                                        {stage.id === 'script' && (
                                            <button className="social-btn-primary" disabled={!!busy[t.id]} onClick={() => run(t, 'execute')}>
                                                <PackageCheck size={13} /> {busy[t.id] === 'execute' ? 'Generando…' : stage.next}
                                            </button>
                                        )}
                                        {t.development && stage.id !== 'idea' && stage.id !== 'script' && (
                                            <button className="social-btn-secondary" onClick={() => showBrief(t)}><FileText size={13} /> Ver brief</button>
                                        )}
                                        {stage.id === 'script' && (
                                            <button className="social-btn-secondary" disabled={!!busy[t.id]} onClick={() => run(t, 'develop')} title="Volver a desarrollar"><Wand2 size={13} /></button>
                                        )}
                                        <button className="social-btn-secondary" onClick={() => onOpenTask(t)}>Editar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
            {brief && <BriefModal task={brief.task} markdown={brief.markdown} onClose={() => setBrief(null)} />}
        </div>
    );
}
