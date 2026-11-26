// Panel de una tarea: por qué BART eligió a ese agente y qué contexto recibió el agente
// (memoria RAG, línea de marca, lecciones, SOP, archivos). Sirve para entender un buen o mal resultado.
import React, { useState } from 'react';
import { Compass, Brain, Palette, GraduationCap, FileText, Paperclip, ChevronDown } from 'lucide-react';
import { modelLabel } from './officeUi';

const BY = {
    ai: { label: 'BART con IA', color: '#c084fc' },
    keywords: { label: 'Palabras clave', color: '#94a3b8' },
    ceo: { label: 'Tú', color: '#f5b638' },
};
const KIND = { changes: 'Corrección', reject: 'Descartado', approve: 'Bien hecho' };
const SOURCE = { chatgpt: 'ChatGPT', agent: 'Agente', ceo: 'CEO', reference: 'Referencia', dashboard: 'Dashboard', library: 'Biblioteca' };

function Bar({ value, color }) {
    return <span className="tc-bar"><span style={{ width: `${Math.max(4, Math.min(100, value))}%`, background: color }} /></span>;
}

function Routing({ routing, models }) {
    const by = BY[routing.by] || BY.keywords;
    const conf = Math.round((routing.confidence ?? 0) * 100);
    return (
        <div className="tc-card">
            <div className="tc-head">
                <Compass size={13} />
                <span>Por qué este agente</span>
                <span className="tc-pill" style={{ color: by.color, borderColor: `${by.color}55` }}>{by.label}</span>
                {routing.by === 'ai' && routing.model && <span className="tc-dim">{modelLabel(models, routing.model)}{routing.ms ? ` · ${(routing.ms / 1000).toFixed(1)} s` : ''}</span>}
            </div>
            <p className="tc-reason">{routing.reason}</p>
            {routing.by !== 'ceo' && (
                <div className="tc-conf">
                    <span>Seguridad</span>
                    <Bar value={conf} color={conf >= 70 ? '#10b981' : conf >= 45 ? '#f5b638' : '#ef4444'} />
                    <b>{conf}%</b>
                    {conf < 45 && <span className="tc-warn">BART no estaba seguro: revisa si es el agente correcto</span>}
                </div>
            )}
            {routing.fallbackReason && <p className="tc-dim">La IA no pudo decidir ({routing.fallbackReason}); se usaron palabras clave.</p>}
            {(routing.alternatives || []).length > 0 && (
                <div className="tc-alts">
                    <span className="tc-dim">También podía ser:</span>
                    {routing.alternatives.map(a => <span key={a.agentId} className="tc-alt" title={a.reason}>{a.agentName || a.agentId}</span>)}
                </div>
            )}
        </div>
    );
}

export default function OfficeTaskContext({ task, models }) {
    const withContext = (task.runs || []).map((r, i) => ({ ...r, i })).filter(r => r.context);
    const [pick, setPick] = useState(null);
    const [open, setOpen] = useState(null);
    const run = withContext.find(r => r.i === pick) || withContext[withContext.length - 1];
    const ctx = run?.context;
    if (!task.routing && !ctx && !task.account) return null;

    return (
        <div className="tc">
            {task.routing && <Routing routing={task.routing} models={models} />}

            {ctx && (
                <div className="tc-card">
                    <div className="tc-head">
                        <Brain size={13} />
                        <span>Contexto que usó</span>
                        {withContext.length > 1 && (
                            <select className="tc-select" value={run.i} onChange={e => setPick(Number(e.target.value))}>
                                {withContext.map((r, n) => <option key={r.i} value={r.i}>Corrida {n + 1} · {modelLabel(models, r.model)}</option>)}
                            </select>
                        )}
                        <span className="tc-dim" style={{ marginLeft: 'auto' }}>~{Math.round((ctx.promptChars || 0) / 4).toLocaleString('es')} tokens de instrucciones</span>
                    </div>

                    <div className="tc-chips">
                        <span className="tc-chip" title="Procedimiento del agente"><FileText size={11} /> {ctx.sop ? `SOP: ${ctx.sop}` : 'Sin SOP propio'}</span>
                        {ctx.account
                            ? <span className="tc-chip brand" title={ctx.account.files.map(f => `${f.name} (${f.label})`).join(' · ')}><Palette size={11} /> {ctx.account.name}: {ctx.account.files.map(f => f.name).join(' + ')}</span>
                            : <span className="tc-chip"><Palette size={11} /> Sin cuenta de marca</span>}
                        <span className="tc-chip"><GraduationCap size={11} /> {ctx.lessons?.length || 0} lecciones</span>
                        {(ctx.files || []).length > 0 && <span className="tc-chip" title={ctx.files.join(', ')}><Paperclip size={11} /> {ctx.files.length} archivo(s)</span>}
                        {ctx.searchMode && <span className="tc-chip" title="hybrid = significado + palabras; keyword = solo palabras">Búsqueda: {ctx.searchMode === 'hybrid' ? 'por significado' : 'por palabras'}</span>}
                    </div>

                    <div className="tc-sub">Memoria (RAG) · {(ctx.knowledge || []).length} documento(s)</div>
                    {(ctx.knowledge || []).length === 0 && <p className="tc-dim">No encontró nada relacionado en la memoria.</p>}
                    {(ctx.knowledge || []).map((k, i) => (
                        <button key={`${k.docId}-${i}`} type="button" className={`tc-doc ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
                            <span className="tc-doc-row">
                                <span className="tc-doc-title">{k.title}</span>
                                {k.source && <span className="tc-dim">{SOURCE[k.source] || k.source}</span>}
                                <Bar value={k.relevance} color="#60a5fa" />
                                <span className="tc-num">{k.relevance}%</span>
                                <ChevronDown size={12} className="tc-chev" />
                            </span>
                            {open === i && <span className="tc-snippet">{k.snippet}</span>}
                        </button>
                    ))}

                    {(ctx.lessons || []).length > 0 && (
                        <>
                            <div className="tc-sub">Lecciones que aplicó</div>
                            {ctx.lessons.map(l => (
                                <div key={l.id} className="tc-lesson"><b>{KIND[l.kind] || 'Nota'}</b> en «{l.task}»: {l.notes}</div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
