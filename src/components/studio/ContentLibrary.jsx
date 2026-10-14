import { useEffect, useMemo, useState } from 'react';
import { Layers, Zap, GraduationCap, Plus, Pencil, Trash2, Sparkles, Copy, Check, Link2, X, CalendarClock } from 'lucide-react';
import { studioApi } from '../../lib/studioApi';
import ReferencesPanel from './ReferencesPanel';
import AccountChips from './AccountChips';
import './Studio.css';

const SECTIONS = [
    { id: 'linea', label: 'Líneas de contenido', icon: Layers },
    { id: 'refs', label: 'Referencias & Tutoriales', icon: GraduationCap },
    { id: 'hook', label: 'Hooks', icon: Zap },
];

const EMPTY = {
    linea: { name: '', goal: '', format: 'Reel 9:16', pillar: '', durationSec: '', perWeek: '', beats: '', textStyle: '', notes: '', referenceIds: [], accountIds: [] },
    hook: { text: '', category: '', why: '', pillar: '', accountIds: [] },
};

const assigned = (item, accountId) => (item.accountIds || []).includes(accountId);
const toggle = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

function ItemForm({ type, item, accounts, references, onClose, onSaved }) {
    const [form, setForm] = useState(() => ({ ...EMPTY[type], ...item, beats: (item?.beats || []).join('\n') }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const field = (k, label, props = {}) => (
        <label className="lib-field">
            <span>{label}</span>
            {props.rows ? <textarea value={form[k] ?? ''} onChange={e => set(k, e.target.value)} {...props} /> : <input value={form[k] ?? ''} onChange={e => set(k, e.target.value)} {...props} />}
        </label>
    );

    const save = async () => {
        setBusy(true); setError('');
        try {
            const payload = { ...form, type };
            const saved = item?.id ? await studioApi.updateLibraryItem(item.id, payload) : await studioApi.createLibraryItem(payload);
            onSaved(saved);
        } catch (err) { setError(err.message); setBusy(false); }
    };

    return (
        <div className="social-modal-overlay animate-in" onClick={onClose}>
            <div className="social-modal-box lib-modal" onClick={e => e.stopPropagation()}>
                <div className="social-modal-header">
                    <div>
                        <h3 className="social-modal-title">{item?.id ? 'Editar' : 'Nueva'} {type === 'linea' ? 'línea de contenido' : 'hook'}</h3>
                        <p className="social-modal-sub">{type === 'linea' ? 'Un formato o serie que la cuenta repite: la IA lo usa al proponer y desarrollar ideas.' : 'Gancho de los primeros 3 segundos.'}</p>
                    </div>
                    <button className="social-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="social-modal-body lib-form">
                    {type === 'linea' ? (
                        <>
                            {field('name', 'Nombre', { placeholder: 'Ej. Recap de la noche en 15s', autoFocus: true })}
                            {field('goal', 'Objetivo', { placeholder: 'Qué busca: alcance, guardados, reservas por DM…' })}
                            <div className="lib-row">
                                {field('format', 'Formato', { placeholder: 'Reel 9:16, Carrusel, Story Seq…' })}
                                {field('pillar', 'Pilar')}
                                {field('durationSec', 'Duración (s)', { type: 'number', min: 0 })}
                                {field('perWeek', 'Por semana', { type: 'number', min: 0, step: 0.5 })}
                            </div>
                            {field('beats', 'Estructura (un beat por línea)', { rows: 5, placeholder: '0-2s Gancho: plano más fuerte de la noche + texto\n2-10s Montaje al beat\n10-15s Cierre con logo y CTA' })}
                            {field('textStyle', 'Texto en pantalla y subtítulos', { placeholder: 'Ej. Texto grande arriba, subtítulos palabra a palabra' })}
                            {field('notes', 'Notas', { rows: 2 })}
                            {references.length > 0 && (
                                <label className="lib-field">
                                    <span>Referencias y tutoriales de esta línea</span>
                                    <div className="lib-chips">
                                        {references.map(r => (
                                            <button key={r.id} type="button" className={`raw-chip ${form.referenceIds.includes(r.id) ? 'on' : ''}`} onClick={() => set('referenceIds', toggle(form.referenceIds, r.id))}>
                                                {r.type === 'tutorial' ? '🎓' : '🔥'} {r.title || r.analysis?.title || 'Referencia'}
                                            </button>
                                        ))}
                                    </div>
                                </label>
                            )}
                        </>
                    ) : (
                        <>
                            {field('text', 'Hook', { rows: 2, autoFocus: true })}
                            <div className="lib-row">
                                {field('category', 'Categoría', { placeholder: 'POV, Curiosidad, Shock…' })}
                                {field('pillar', 'Pilar')}
                            </div>
                            {field('why', 'Por qué funciona', { rows: 2 })}
                        </>
                    )}
                    <label className="lib-field">
                        <span>Asignada a</span>
                        <AccountChips accounts={accounts} value={form.accountIds} onChange={v => set('accountIds', v)} />
                    </label>
                    {error && <div className="studio-error">{error}</div>}
                </div>
                <div className="social-modal-footer">
                    <button className="social-btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="social-btn-primary" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    );
}

function LineCard({ line, accounts, account, references, onEdit, onDelete, onAssign, onAddTask }) {
    const [accountId, setAccountId] = useState(account?.id || line.accountIds?.[0] || '');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const refs = references.filter(r => (line.referenceIds || []).includes(r.id));

    const createIdea = async () => {
        setBusy(true); setMsg('');
        try {
            const task = await studioApi.ideaFromLine(line.id, { accountId });
            await onAddTask(task);
            setMsg(`Idea creada: "${task.title}" — está en Producción.`);
        } catch (err) { setMsg(err.message); }
        setBusy(false);
    };

    return (
        <div className="lib-card">
            <div className="lib-card-head">
                <b>{line.name}</b>
                <div className="lib-card-tools">
                    <button title="Editar" onClick={onEdit}><Pencil size={12} /></button>
                    <button title="Eliminar" onClick={onDelete}><Trash2 size={12} /></button>
                </div>
            </div>
            <div className="lib-meta">
                {line.format && <span className="idea-format">{line.format}</span>}
                {line.durationSec ? <span>{line.durationSec}s</span> : null}
                {line.perWeek ? <span><CalendarClock size={11} /> {line.perWeek}/semana</span> : null}
                {line.pillar && <span className="idea-pillar">{line.pillar}</span>}
            </div>
            {line.goal && <p className="lib-goal">{line.goal}</p>}
            {line.beats?.length > 0 && <ol className="lib-beats">{line.beats.map((b, i) => <li key={i}>{b}</li>)}</ol>}
            {line.textStyle && <p className="lib-note"><b>Texto:</b> {line.textStyle}</p>}
            {refs.length > 0 && <p className="lib-note"><Link2 size={11} /> {refs.map(r => r.title || r.analysis?.title || 'Referencia').join(' · ')}</p>}
            {!account && <AccountChips accounts={accounts} value={line.accountIds || []} onChange={onAssign} />}
            <div className="lib-actions">
                {!account && (
                    <select value={accountId} onChange={e => setAccountId(e.target.value)}>
                        <option value="">Crear idea para…</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.handler}</option>)}
                    </select>
                )}
                <button className="social-btn-primary" disabled={!accountId || busy} onClick={createIdea}><Sparkles size={13} /> {busy ? 'Creando…' : 'Crear idea con esta línea'}</button>
            </div>
            {msg && <p className="ref-msg">{msg}</p>}
        </div>
    );
}

function HookCard({ hook, accounts, account, onEdit, onDelete, onAssign, onUse }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => { try { await navigator.clipboard.writeText(hook.text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sin portapapeles */ } };
    return (
        <div className="lib-card">
            <div className="lib-card-head">
                <span className="hook-cat-badge">{hook.category || 'Hook'}</span>
                <div className="lib-card-tools">
                    <button title="Editar" onClick={onEdit}><Pencil size={12} /></button>
                    <button title="Eliminar" onClick={onDelete}><Trash2 size={12} /></button>
                </div>
            </div>
            <p className="hook-text">“{hook.text}”</p>
            {hook.why && <p className="lib-note">💡 {hook.why}</p>}
            {!account && <AccountChips accounts={accounts} value={hook.accountIds || []} onChange={onAssign} />}
            <div className="lib-actions">
                <button className="social-btn-secondary" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}</button>
                <button className="social-btn-primary" onClick={() => onUse(hook)}><Plus size={13} /> Usar en guión</button>
            </div>
        </div>
    );
}

/**
 * Biblioteca de contenido. Sin `account`: biblioteca general, se crea todo y se asigna a cuentas.
 * Con `account`: lo asignado a esa cuenta, y un modo para sumar elementos de la biblioteca general.
 */
export default function ContentLibrary({ accounts, account = null, onAddTask, onUseHook }) {
    const [section, setSection] = useState('linea');
    const [items, setItems] = useState([]);
    const [references, setReferences] = useState([]);
    const [editing, setEditing] = useState(null); // { type, item }
    const [browse, setBrowse] = useState(false);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const refresh = () => setReload(k => k + 1);

    useEffect(() => {
        let alive = true;
        Promise.all([studioApi.libraryItems(), studioApi.references()])
            .then(([its, refs]) => { if (alive) { setItems(its); setReferences(refs); setError(''); } })
            .catch(err => { if (alive) setError(err.message); });
        return () => { alive = false; };
    }, [reload]);

    const patch = async (item, changes) => {
        setItems(list => list.map(i => (i.id === item.id ? { ...i, ...changes } : i)));
        try { await studioApi.updateLibraryItem(item.id, changes); } catch (err) { setError(err.message); refresh(); }
    };
    const remove = async item => {
        if (!window.confirm(`¿Eliminar "${item.name || item.text}" de la biblioteca? Se quita de todas las cuentas.`)) return;
        try { await studioApi.deleteLibraryItem(item.id); refresh(); } catch (err) { setError(err.message); }
    };

    const visible = useMemo(() => {
        const ofType = items.filter(i => i.type === section);
        if (!account || browse) return ofType;
        return ofType.filter(i => assigned(i, account.id));
    }, [items, section, account, browse]);

    const count = type => (type === 'refs'
        ? references.filter(r => !account || (r.accountIds || []).includes(account.id)).length
        : items.filter(i => i.type === type && (!account || assigned(i, account.id))).length);

    const weeklyPlan = account ? items.filter(i => i.type === 'linea' && assigned(i, account.id)).reduce((s, l) => s + (l.perWeek || 0), 0) : 0;

    const renderItem = item => {
        if (account && browse) {
            const on = assigned(item, account.id);
            return (
                <div key={item.id} className={`lib-card lib-pick ${on ? 'on' : ''}`}>
                    <b>{item.name || `“${item.text}”`}</b>
                    {item.goal && <p className="lib-goal">{item.goal}</p>}
                    <button className={on ? 'social-btn-secondary' : 'social-btn-primary'} onClick={() => patch(item, { accountIds: toggle(item.accountIds || [], account.id) })}>
                        {on ? <><X size={13} /> Quitar de {account.handler}</> : <><Plus size={13} /> Asignar a {account.handler}</>}
                    </button>
                </div>
            );
        }
        const common = {
            accounts, account,
            onEdit: () => setEditing({ type: item.type, item }),
            onDelete: () => remove(item),
            onAssign: accountIds => patch(item, { accountIds }),
        };
        return item.type === 'linea'
            ? <LineCard key={item.id} line={item} references={references} onAddTask={onAddTask} {...common} />
            : <HookCard key={item.id} hook={item} onUse={h => onUseHook(h, account)} {...common} />;
    };

    return (
        <div className="lib">
            <div className="lib-head">
                <div className="raw-filters">
                    {SECTIONS.map(s => {
                        const Icon = s.icon;
                        return <button key={s.id} className={`raw-chip ${section === s.id ? 'on' : ''}`} onClick={() => setSection(s.id)}><Icon size={12} /> {s.label} <span className="lib-count">{count(s.id)}</span></button>;
                    })}
                </div>
                {section !== 'refs' && (
                    <div className="raw-actions">
                        {account && (
                            <button className={`raw-chip ${browse ? 'on' : ''}`} onClick={() => setBrowse(b => !b)}>{browse ? 'Ver solo lo asignado' : 'Asignar desde la biblioteca general'}</button>
                        )}
                        <button className="social-btn-primary" onClick={() => setEditing({ type: section, item: account ? { accountIds: [account.id] } : null })}>
                            <Plus size={13} /> {section === 'linea' ? 'Nueva línea' : 'Nuevo hook'}
                        </button>
                    </div>
                )}
            </div>
            {account && section === 'linea' && !browse && weeklyPlan > 0 && (
                <div className="lib-plan"><CalendarClock size={14} /> Según sus líneas, {account.handler} publica <b>{weeklyPlan}</b> piezas por semana.</div>
            )}
            {error && <div className="studio-error">{error} <button onClick={() => setError('')}><X size={12} /></button></div>}

            {section === 'refs' ? (
                <ReferencesPanel accounts={accounts} account={account} onChanged={refresh} />
            ) : !visible.length ? (
                <div className="raw-empty">
                    {section === 'linea' ? <Layers size={22} /> : <Zap size={22} />}
                    {account && !browse
                        ? `${account.handler} todavía no tiene ${section === 'linea' ? 'líneas' : 'hooks'} asignados. Crea una o asígnala desde la biblioteca general.`
                        : section === 'linea'
                            ? 'Crea líneas: formatos que se repiten (recap de la noche, POV de llegada, top 3…). Asígnalas a cada cuenta y la IA las usa al proponer ideas.'
                            : 'Todavía no hay hooks.'}
                </div>
            ) : (
                <div className="lib-grid">{visible.map(renderItem)}</div>
            )}

            {editing && (
                <ItemForm
                    type={editing.type}
                    item={editing.item}
                    accounts={accounts}
                    references={references.filter(r => r.status === 'ready' || r.analysis)}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); refresh(); }}
                />
            )}
        </div>
    );
}
