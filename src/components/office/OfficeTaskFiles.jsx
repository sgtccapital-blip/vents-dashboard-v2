import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Image as ImageIcon, File, FileVideo, Download, Eye, EyeOff, Trash2, Upload, Paperclip, ArrowRight, Send } from 'lucide-react';
import { modelLabel, timeAgo, postJson, uploadTaskFiles } from './officeUi';

const ICON = { text: FileText, image: ImageIcon, pdf: FileText, video: FileVideo };
const fmtSize = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function roleChip(f) {
    if (f.inheritedFrom) return { label: 'Heredado', color: '#38bdf8' };
    if (f.role === 'report') return { label: 'Informe', color: '#a855f7' };
    if (f.role === 'deliverable') return { label: 'Entregable', color: '#10b981' };
    if (f.createdByKind === 'ceo') return { label: 'Insumo', color: '#eab308' };
    return { label: 'Archivo', color: '#94a3b8' };
}

function FilePreview({ taskId, file }) {
    const [text, setText] = useState(null);
    const url = `/api/office/task/${taskId}/files/${file.id}`;
    React.useEffect(() => {
        if (file.kind !== 'text') return;
        let alive = true;
        fetch(url).then(r => r.text()).then(t => alive && setText(t)).catch(() => alive && setText('No se pudo abrir el archivo.'));
        return () => { alive = false; };
    }, [url, file.kind]);
    if (file.kind === 'image' && file.mime !== 'image/svg+xml') return <img src={url} alt={file.name} className="occ-file-img" />;
    if (file.kind === 'pdf') return <iframe src={url} title={file.name} className="occ-file-pdf" />;
    if (file.kind === 'video') return <video src={url} controls className="occ-file-img" />;
    if (file.kind !== 'text') return <div className="occ-muted">Este formato no tiene vista previa: descárgalo.</div>;
    if (text == null) return <div className="occ-muted">Abriendo…</div>;
    return file.mime === 'text/markdown'
        ? <div className="occ-result"><ReactMarkdown>{text}</ReactMarkdown></div>
        : <pre className="occ-result occ-file-pre">{text}</pre>;
}

export default function OfficeTaskFiles({ task, agents = [], models, onChanged, onOpenTask }) {
    const files = task.artifacts || [];
    const inputRef = useRef(null);
    const [open, setOpen] = useState(() => files.find(f => f.role === 'deliverable')?.id || null);
    const [drag, setDrag] = useState(false);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [handoff, setHandoff] = useState(null); // { agentId, task, fileIds:Set }

    const upload = async list => {
        if (!list?.length) return;
        setBusy('upload'); setError('');
        try { await uploadTaskFiles(task.id, [...list]); onChanged?.(); } catch (e) { setError(e.message); }
        setBusy('');
    };

    const remove = async f => {
        if (!window.confirm(`¿Quitar ${f.name} de esta tarea?`)) return;
        setBusy(f.id); setError('');
        try {
            const r = await fetch(`/api/office/task/${task.id}/files/${f.id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
            onChanged?.();
        } catch (e) { setError(e.message); }
        setBusy('');
    };

    const sendHandoff = async () => {
        setBusy('handoff'); setError('');
        try {
            const d = await postJson(`/api/office/task/${task.id}/handoff`, {
                agentId: handoff.agentId || undefined,
                task: handoff.task,
                fileIds: [...handoff.fileIds],
            });
            setHandoff(null);
            onChanged?.();
            onOpenTask?.(d.task.id);
        } catch (e) { setError(e.message); }
        setBusy('');
    };

    const startHandoff = () => setHandoff({ agentId: '', task: '', fileIds: new Set(files.filter(f => f.role !== 'report' || files.length === 1).map(f => f.id)) });

    return (
        <div className="occ-files">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="occ-label" style={{ margin: 0 }}><Paperclip size={11} /> Archivos ({files.length})</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="occ-btn sm" disabled={!!busy} onClick={() => inputRef.current?.click()}><Upload size={11} /> Subir</button>
                    {!handoff && <button className="occ-btn sm primary" onClick={startHandoff}><ArrowRight size={11} /> Pasar a otro agente</button>}
                </div>
                <input ref={inputRef} type="file" multiple hidden onChange={e => { upload(e.target.files); e.target.value = ''; }} />
            </div>

            <div
                className={`occ-file-list ${drag ? 'drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
            >
                {files.length === 0 && (
                    <div className="occ-muted" style={{ padding: '10px', textAlign: 'center' }}>
                        Arrastra aquí briefs, fotos o documentos para el agente. Lo que él produzca (propuestas, informes, imágenes) aparece aquí.
                    </div>
                )}
                {files.map(f => {
                    const Icon = ICON[f.kind] || File;
                    const chip = roleChip(f);
                    const url = `/api/office/task/${task.id}/files/${f.id}`;
                    return (
                        <div key={f.id} className="occ-file">
                            <div className="occ-file-row">
                                <Icon size={15} style={{ color: chip.color, flexShrink: 0 }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="occ-file-name" title={f.description || f.name}>{f.name}</div>
                                    <div className="occ-file-meta">
                                        <span style={{ color: chip.color }}>{chip.label}{f.version > 1 ? ` v${f.version}` : ''}</span>
                                        · {f.createdBy} · {fmtSize(f.size)} · {timeAgo(f.createdAt)}
                                        {f.inheritedFrom && <> · <button className="occ-link" onClick={() => onOpenTask?.(f.inheritedFrom)}>de otra tarea</button></>}
                                    </div>
                                </div>
                                <button className="occ-btn sm" title={open === f.id ? 'Ocultar' : 'Ver'} onClick={() => setOpen(open === f.id ? null : f.id)}>
                                    {open === f.id ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                                <a className="occ-btn sm" href={`${url}?download=1`} title="Descargar"><Download size={11} /></a>
                                {!f.inheritedFrom && (
                                    <button className="occ-btn sm danger" title="Quitar" disabled={busy === f.id} onClick={() => remove(f)}><Trash2 size={11} /></button>
                                )}
                            </div>
                            {open === f.id && <div style={{ marginTop: '8px' }}><FilePreview taskId={task.id} file={f} /></div>}
                        </div>
                    );
                })}
                {busy === 'upload' && <div className="occ-muted">Subiendo…</div>}
            </div>

            {handoff && (
                <div className="occ-handoff">
                    <div className="occ-label" style={{ margin: 0 }}>Tarea de seguimiento</div>
                    <input
                        className="occ-input"
                        placeholder="¿Qué debe hacer el siguiente? Ej: Enviar la propuesta al cliente por WhatsApp"
                        value={handoff.task}
                        onChange={e => setHandoff(h => ({ ...h, task: e.target.value }))}
                        autoFocus
                    />
                    <select className="occ-select" value={handoff.agentId} onChange={e => setHandoff(h => ({ ...h, agentId: e.target.value }))}>
                        <option value="">Cualquier agente conectado (tarea abierta)</option>
                        <optgroup label="Conectados por MCP">
                            {agents.filter(a => a.kind === 'external').map(a => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}
                        </optgroup>
                        <optgroup label="Internos (arrancan solos)">
                            {agents.filter(a => a.kind !== 'external').map(a => <option key={a.id} value={a.id}>{a.avatar} {a.name} · {modelLabel(models, a.model)}</option>)}
                        </optgroup>
                    </select>
                    {files.length > 0 && (
                        <div className="occ-handoff-files">
                            <span className="occ-muted">Archivos que se le pasan:</span>
                            {files.map(f => (
                                <label key={f.id}>
                                    <input
                                        type="checkbox"
                                        checked={handoff.fileIds.has(f.id)}
                                        onChange={e => setHandoff(h => {
                                            const ids = new Set(h.fileIds);
                                            if (e.target.checked) ids.add(f.id); else ids.delete(f.id);
                                            return { ...h, fileIds: ids };
                                        })}
                                    /> {f.name}
                                </label>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="occ-btn primary" disabled={!handoff.task.trim() || busy === 'handoff'} onClick={sendHandoff}>
                            <Send size={12} /> {busy === 'handoff' ? 'Creando…' : 'Crear y asignar'}
                        </button>
                        <button className="occ-btn" onClick={() => setHandoff(null)}>Cancelar</button>
                    </div>
                </div>
            )}

            {error && <div className="occ-notice" style={{ color: '#fca5a5' }}>{error}</div>}
        </div>
    );
}
