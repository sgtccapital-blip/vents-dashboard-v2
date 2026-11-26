// Selector de modelo para un agente: modelos directos (Gemini, Claude, OpenAI) y el catálogo
// completo de OpenRouter con buscador por nombre, filtros y precios.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, Eye, Gift, RefreshCw, ArrowDownWideNarrow } from 'lucide-react';
import { PROVIDER_COLOR } from './officeUi';

const SHOW_MAX = 80;

// La lista de OpenRouter se pide una vez por sesión del navegador.
let orRequest = null;
function loadOpenRouter(refresh = false) {
    if (!orRequest || refresh) {
        orRequest = fetch(`/api/office/models/openrouter${refresh ? '?refresh=1' : ''}`)
            .then(async r => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
                return data;
            })
            .catch(err => { orRequest = null; throw err; });
    }
    return orRequest;
}

const fmtPrice = n => (n === 0 ? '0' : n < 0.1 ? n.toFixed(3) : n < 10 ? n.toFixed(2) : n.toFixed(0));
function priceText(m) {
    if (m.free) return 'Gratis';
    if (!m.price) return m.provider === 'openrouter' ? 'Precio variable' : '';
    return `$${fmtPrice(m.price[0])} / $${fmtPrice(m.price[1])} por M`;
}
const ctxText = n => (!n ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M ctx` : `${Math.round(n / 1000)}k ctx`);

function matches(m, words) {
    if (!words.length) return true;
    const hay = `${m.label} ${m.slug || m.id} ${m.use || ''}`.toLowerCase();
    return words.every(w => hay.includes(w));
}

function ModelRow({ m, selected, active, disabled, onPick, onHover }) {
    const color = PROVIDER_COLOR[m.provider] || '#94a3b8';
    const price = priceText(m);
    return (
        <button
            type="button"
            className={`mp-row ${selected ? 'selected' : ''} ${active ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => onPick(m)}
            onMouseEnter={onHover}
            data-active={active || undefined}
        >
            <span className="mp-dot" style={{ background: color }} />
            <span className="mp-main">
                <span className="mp-label">{m.label}</span>
                <span className="mp-sub">{m.slug || m.use}</span>
            </span>
            <span className="mp-tags">
                {m.vision && <span className="mp-tag" title="Puede ver imágenes"><Eye size={10} /></span>}
                {m.context ? <span className="mp-tag">{ctxText(m.context)}</span> : null}
                {price && <span className={`mp-tag ${m.free ? 'free' : ''}`}>{price}</span>}
            </span>
            {selected && <Check size={13} className="mp-check" />}
        </button>
    );
}

/**
 * @param {{ models: object, value: string, onChange: (id: string) => void, currentId?: string }} props
 * currentId: el modelo guardado del agente (se puede volver a él aunque su proveedor no tenga llave).
 */
export default function ModelPicker({ models, value, onChange, currentId }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [onlyFree, setOnlyFree] = useState(false);
    const [onlyVision, setOnlyVision] = useState(false);
    const [cheapFirst, setCheapFirst] = useState(false);
    const [or, setOr] = useState({ status: 'idle', models: [], total: 0, error: '' });
    const [activeIdx, setActiveIdx] = useState(0);
    const rootRef = useRef(null);
    const searchRef = useRef(null);
    const listRef = useRef(null);

    const providers = useMemo(() => models?.providers || [], [models]);
    const enabledSet = useMemo(() => new Set(providers.filter(p => p.enabled).map(p => p.id)), [providers]);
    const enabledOf = id => enabledSet.has(id);
    const orProvider = providers.find(p => p.id === 'openrouter');

    const fetchOr = (refresh = false) => {
        setOr(s => ({ ...s, status: 'loading', error: '' }));
        loadOpenRouter(refresh)
            .then(d => setOr({ status: 'ready', models: d.models || [], total: d.total || 0, error: '' }))
            .catch(err => setOr({ status: 'error', models: [], total: 0, error: err.message }));
    };

    const toggle = () => {
        if (!open && or.status === 'idle') fetchOr();
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!open) return undefined;
        const t = setTimeout(() => searchRef.current?.focus(), 30);
        const onDoc = e => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); };
    }, [open]);

    const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);

    // Modelos directos (catálogo fijo, sin los de OpenRouter que ya vienen en la lista completa).
    const direct = useMemo(() => (models?.models || [])
        .filter(m => m.provider !== 'openrouter')
        .filter(m => !onlyFree || m.price?.[0] === 0)
        .filter(m => !onlyVision || ['google', 'anthropic', 'openai'].includes(m.provider))
        .filter(m => matches(m, words)), [models, words, onlyFree, onlyVision]);

    const orAll = useMemo(() => {
        const list = or.models.length ? or.models : (models?.models || []).filter(m => m.provider === 'openrouter');
        let found = list.filter(m => (!onlyFree || m.free) && (!onlyVision || m.vision) && matches(m, words));
        if (cheapFirst) found = [...found].sort((a, b) => (a.price ? a.price[0] + a.price[1] : 1e9) - (b.price ? b.price[0] + b.price[1] : 1e9));
        else if (words.length) found = [...found].sort((a, b) => Number(!a.label.toLowerCase().includes(words[0])) - Number(!b.label.toLowerCase().includes(words[0])));
        return found;
    }, [or.models, models, words, onlyFree, onlyVision, cheapFirst]);
    const orShown = useMemo(() => orAll.slice(0, SHOW_MAX), [orAll]);

    const flat = useMemo(() => [...direct, ...orShown].filter(m => enabledSet.has(m.provider) || m.id === currentId),
        [direct, orShown, enabledSet, currentId]);

    const selected = useMemo(() => {
        const all = [...(models?.models || []), ...or.models];
        return all.find(m => m.id === value) || (value ? { id: value, provider: value.startsWith('openrouter/') ? 'openrouter' : 'google', label: value.replace(/^openrouter\//, '') } : null);
    }, [models, or.models, value]);

    const pick = m => { onChange(m.id); setOpen(false); setQuery(''); };

    const scrollActive = () => requestAnimationFrame(() => listRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' }));
    const onKeyDown = e => {
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
        if (!flat.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); scrollActive(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); scrollActive(); }
        if (e.key === 'Enter') { e.preventDefault(); const m = flat[Math.min(activeIdx, flat.length - 1)]; if (m) pick(m); }
    };
    const activeId = flat[Math.min(activeIdx, flat.length - 1)]?.id;
    const rowProps = m => ({
        m,
        selected: m.id === value,
        active: m.id === activeId,
        disabled: !enabledOf(m.provider) && m.id !== currentId,
        onPick: pick,
        onHover: () => { const i = flat.findIndex(x => x.id === m.id); if (i >= 0) setActiveIdx(i); },
    });

    const selColor = PROVIDER_COLOR[selected?.provider] || '#94a3b8';
    const selProvider = providers.find(p => p.id === selected?.provider);

    return (
        <div className="mp" ref={rootRef}>
            <button type="button" className={`mp-trigger ${open ? 'open' : ''}`} onClick={toggle}>
                <span className="mp-dot" style={{ background: selColor }} />
                <span className="mp-main">
                    <span className="mp-label">{selected?.label || 'Elige un modelo'}</span>
                    <span className="mp-sub">{selProvider?.label || ''}{selected && priceText(selected) ? ` · ${priceText(selected)}` : ''}</span>
                </span>
                <ChevronDown size={15} className="mp-chev" />
            </button>

            {open && (
                <div className="mp-pop" onKeyDown={onKeyDown}>
                    <div className="mp-search">
                        <Search size={14} />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                            placeholder="Busca por nombre: claude, llama 70b, qwen coder…"
                        />
                        {query && <button type="button" className="mp-clear" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>Borrar</button>}
                    </div>
                    <div className="mp-filters">
                        <button type="button" className={onlyFree ? 'on' : ''} onClick={() => { setOnlyFree(v => !v); setActiveIdx(0); }}><Gift size={11} /> Gratis</button>
                        <button type="button" className={onlyVision ? 'on' : ''} onClick={() => { setOnlyVision(v => !v); setActiveIdx(0); }}><Eye size={11} /> Ven imágenes</button>
                        <button type="button" className={cheapFirst ? 'on' : ''} onClick={() => { setCheapFirst(v => !v); setActiveIdx(0); }}><ArrowDownWideNarrow size={11} /> Más baratos primero</button>
                    </div>

                    <div className="mp-list" ref={listRef}>
                        {providers.filter(p => p.id !== 'openrouter').map(p => {
                            const rows = direct.filter(m => m.provider === p.id);
                            if (!rows.length) return null;
                            return (
                                <div key={p.id} className="mp-group">
                                    <div className="mp-group-head">
                                        <span style={{ color: PROVIDER_COLOR[p.id] }}>{p.label}</span>
                                        {!p.enabled && <span className="mp-missing">falta {p.env} en .env</span>}
                                    </div>
                                    {rows.map(m => <ModelRow key={m.id} {...rowProps(m)} />)}
                                </div>
                            );
                        })}

                        <div className="mp-group">
                            <div className="mp-group-head">
                                <span style={{ color: PROVIDER_COLOR.openrouter }}>OpenRouter</span>
                                <span className="mp-count">
                                    {or.status === 'ready' && (words.length || onlyFree || onlyVision ? `${orAll.length} de ${or.total}` : `${or.total} modelos`)}
                                    {or.status === 'loading' && 'Cargando catálogo…'}
                                </span>
                                {orProvider && !orProvider.enabled && <span className="mp-missing">falta {orProvider.env} en .env</span>}
                                {or.status !== 'loading' && (
                                    <button type="button" className="mp-refresh" title="Actualizar lista de OpenRouter" onClick={() => fetchOr(true)}><RefreshCw size={11} /></button>
                                )}
                            </div>
                            {or.status === 'error' && <div className="mp-empty">{or.error}</div>}
                            {orShown.map(m => <ModelRow key={m.id} {...rowProps(m)} />)}
                            {or.status === 'ready' && orAll.length === 0 && <div className="mp-empty">Ningún modelo de OpenRouter coincide con “{query}”.</div>}
                            {orAll.length > SHOW_MAX && <div className="mp-more">y {orAll.length - SHOW_MAX} más: escribe para afinar la búsqueda</div>}
                        </div>
                    </div>
                    <div className="mp-foot">↑↓ para moverte · Enter para elegir · Esc para cerrar · precios en USD por millón de tokens (entrada / salida)</div>
                </div>
            )}
        </div>
    );
}
