// Oficina en vivo: edificio isométrico donde los agentes (internos y conectados por MCP)
// trabajan, entregan al CEO, se reúnen y toman café según lo que pasa de verdad en la cola.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Video, VideoOff, Volume2, VolumeX, Home, Info } from 'lucide-react';
import { ROOMS, iso, pts, planOffice, panamaClock, SCENE_BOUNDS, CEO_SEAT, CEO_DESK_POS, MOOD } from './layout';
import { Room, Prop, Desk, CeoDesk, CeoBot, Bot, BotOverlay, SceneDefs } from './scene';
import LiveInspector from './LiveInspector';
import { isOfficeAudioMuted, setOfficeAudioMuted, playOfficeClick } from '../../../lib/officeAudio';
import './liveOffice.css';

const DEPT_OF_FILTER = f => (f && f !== 'all' ? f.replace('dept-', '') : null);
const FLIGHT_MS = 1500;
const lerp = (a, b, k) => a + (b - a) * k;

/** Robot que camina solo (requestAnimationFrame) cuando cambia su destino. */
function AgentSprite({ item, color, selected, dimmed, showName, onSelect, onHover }) {
    const ref = useRef(null);
    const posRef = useRef(null);
    const [tx, ty] = iso(...item.pos);
    useLayoutEffect(() => {
        const g = ref.current;
        if (!g) return undefined;
        const from = posRef.current || [tx, ty];
        const dist = Math.hypot(tx - from[0], ty - from[1]);
        if (dist < 1) {
            posRef.current = [tx, ty];
            g.setAttribute('transform', `translate(${tx},${ty})`);
            return undefined;
        }
        const dur = Math.min(4200, Math.max(800, dist * 7.5));
        const start = performance.now();
        let raf;
        g.classList.add('lo-walking');
        const step = t => {
            const k = Math.min(1, (t - start) / dur);
            const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
            const x = lerp(from[0], tx, e), y = lerp(from[1], ty, e);
            posRef.current = [x, y];
            g.setAttribute('transform', `translate(${x},${y})`);
            if (k < 1) raf = requestAnimationFrame(step);
            else g.classList.remove('lo-walking');
        };
        raf = requestAnimationFrame(step);
        return () => { cancelAnimationFrame(raf); g.classList.remove('lo-walking'); };
    }, [tx, ty]);

    return (
        <g ref={ref} className={`lo-agent ${dimmed ? 'dim' : ''}`} style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); onSelect(); }}
            onPointerEnter={() => onHover(item.agent.id)} onPointerLeave={() => onHover(null)}>
            <Bot agent={item.agent} mood={item.mood} pose={item.pose} color={color} tint={item.tint} selected={selected} />
            <BotOverlay agent={item.agent} mood={item.mood} pose={item.pose} reviews={item.reviews} showName={showName || selected} showStep />
        </g>
    );
}

/** Sobre o documento que vuela entre dos puntos (asignación, entrega, traspaso). */
function Flight({ from, to, kind, color }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const g = ref.current;
        if (!g) return undefined;
        const start = performance.now();
        let raf;
        const step = t => {
            const k = Math.min(1, (t - start) / FLIGHT_MS);
            const e = 1 - (1 - k) ** 3;
            const x = lerp(from[0], to[0], e);
            const y = lerp(from[1], to[1], e) - Math.sin(Math.PI * e) * 90;
            g.setAttribute('transform', `translate(${x},${y}) scale(${1 + Math.sin(Math.PI * k) * 0.5})`);
            g.setAttribute('opacity', k > 0.92 ? String((1 - k) / 0.08) : '1');
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [from, to]);
    return (
        <g ref={ref} opacity="0" pointerEvents="none">
            <circle r="13" fill={color} opacity="0.25" filter="url(#lo-glow)" />
            {kind === 'mail' ? (
                <g><rect x="-8" y="-5.5" width="16" height="11" rx="1.5" fill="#f8fafc" stroke={color} strokeWidth="1.3" /><path d="M -8 -5 L 0 1 L 8 -5" fill="none" stroke={color} strokeWidth="1.3" /></g>
            ) : (
                <g><path d="M -6 -8 h 8 l 4 4 v 12 h -12 z" fill="#f8fafc" stroke={color} strokeWidth="1.3" /><line x1="-3" y1="-1" x2="3" y2="-1" stroke="#94a3b8" /><line x1="-3" y1="2" x2="3" y2="2" stroke="#94a3b8" /></g>
            )}
        </g>
    );
}

function describe(ev, agentsById, tasksById) {
    const d = ev.data || {};
    const task = d.task || tasksById[d.taskId];
    const who = agentsById[d.agentId || task?.assignedAgentId]?.name?.split(' (')[0] || task?.assignedAgent?.split(' (')[0] || 'Un agente';
    const title = task?.task ? `“${task.task.slice(0, 48)}${task.task.length > 48 ? '…' : ''}”` : '';
    switch (ev.type) {
        case 'task_dispatched': return { icon: '🎯', text: `Nueva tarea para ${d.assignedAgent || who} ${title}`, color: '#38bdf8' };
        case 'task_started': return { icon: '⚡', text: `${who} empezó a trabajar ${title}`, color: '#38bdf8' };
        case 'task_delivered': return { icon: '📬', text: `${who} te entregó ${title}`, color: '#b07cff' };
        case 'task_failed': return { icon: '⚠️', text: `${who} no pudo completar ${title}`, color: '#ff5d6c' };
        case 'task_reviewed': return { icon: d.decision === 'approve' ? '✅' : d.decision === 'changes' ? '✏️' : '🗑️', text: d.decision === 'approve' ? `Aprobaste ${title}` : d.decision === 'changes' ? `Pediste cambios ${title}` : `Descartaste ${title}`, color: '#2ee59d' };
        case 'task_files': return { icon: '📎', text: `Nuevos archivos en ${title || 'una tarea'}`, color: '#7dd3fc' };
        case 'kill_switch_triggered': return { icon: '🛑', text: 'Kill switch: todo detenido', color: '#ff5d6c' };
        default: return null;
    }
}

export default function LiveOffice({
    agents = [], activeTasks = [], completedTasks = [], approvals = [], models, liveEvents = [],
    filterDepartment = 'all', isWarMode = false,
    onOpenAgentDesk, onOpenTask, onDispatch, onOpenApprovals,
}) {
    const wrapRef = useRef(null);
    const svgRef = useRef(null);
    const miniRectRef = useRef(null);
    const zoomLabelRef = useRef(null);
    const sizeRef = useRef({ w: 1000, h: 640 });
    const camRef = useRef(null);
    const targetRef = useRef(null);
    const dragRef = useRef(null);
    const movedRef = useRef(false);
    const detailRef = useRef(false);

    const [now, setNow] = useState(() => Date.now());
    const [selection, setSelection] = useState(null);
    const [hoverAgent, setHoverAgent] = useState(null);
    const [hoverRoom, setHoverRoom] = useState(null);
    const [detail, setDetail] = useState(false);
    const [follow, setFollow] = useState(true);
    const [legend, setLegend] = useState(false);
    const [muted, setMuted] = useState(isOfficeAudioMuted());
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(t);
    }, []);

    const plan = useMemo(() => planOffice({ agents, activeTasks, completedTasks, isWarMode, now }), [agents, activeTasks, completedTasks, isWarMode, now]);
    const clock = panamaClock(now);
    const dept = DEPT_OF_FILTER(filterDepartment);
    const roomDim = r => Boolean(dept && r.dept !== dept && !(dept === 'executive' && r.id === 'room-ceo'));
    const roomById = useMemo(() => Object.fromEntries(ROOMS.map(r => [r.id, r])), []);
    const agentsById = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a])), [agents]);
    const tasksById = useMemo(() => Object.fromEntries([...activeTasks, ...completedTasks].map(t => [t.id, t])), [activeTasks, completedTasks]);
    const reviewCount = activeTasks.filter(t => t.status === 'review').length;
    const approvalCount = approvals.filter(a => a.status === 'pending').length;

    // ─── Cámara (sin re-render de React: escribe el viewBox directo) ───
    const fitZoom = () => {
        const { w, h } = sizeRef.current;
        return Math.min(w / (SCENE_BOUNDS.maxX - SCENE_BOUNDS.minX), h / (SCENE_BOUNDS.maxY - SCENE_BOUNDS.minY));
    };
    // Vista general: deja aire arriba para la barra de estado.
    const home = () => { const z = fitZoom() * 0.94; return { x: (SCENE_BOUNDS.minX + SCENE_BOUNDS.maxX) / 2, y: (SCENE_BOUNDS.minY + SCENE_BOUNDS.maxY) / 2 - 50 / z, z }; };
    const clampZ = z => Math.min(3.2, Math.max(fitZoom() * 0.7, z));

    useEffect(() => {
        const el = wrapRef.current;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            const first = !camRef.current;
            sizeRef.current = { w: Math.max(200, width), h: Math.max(200, height) };
            if (first) { camRef.current = home(); targetRef.current = home(); }
        });
        ro.observe(el);
        let raf;
        const loop = () => {
            const c = camRef.current, t = targetRef.current;
            if (c && t && svgRef.current) {
                const k = 0.14;
                c.x = lerp(c.x, t.x, k); c.y = lerp(c.y, t.y, k); c.z = lerp(c.z, t.z, k);
                const { w, h } = sizeRef.current;
                const vw = w / c.z, vh = h / c.z;
                svgRef.current.setAttribute('viewBox', `${c.x - vw / 2} ${c.y - vh / 2} ${vw} ${vh}`);
                if (miniRectRef.current) {
                    miniRectRef.current.setAttribute('x', c.x - vw / 2); miniRectRef.current.setAttribute('y', c.y - vh / 2);
                    miniRectRef.current.setAttribute('width', vw); miniRectRef.current.setAttribute('height', vh);
                }
                if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${Math.round((c.z / fitZoom()) * 100)}%`;
                const wantDetail = c.z / fitZoom() > 1.35;
                if (wantDetail !== detailRef.current) { detailRef.current = wantDetail; setDetail(wantDetail); }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const onWheel = e => {
            if (e.target.closest?.('.lo-inspector, .lo-legend')) return;
            e.preventDefault();
            const c = camRef.current, t = targetRef.current;
            if (!c) return;
            const rect = el.getBoundingClientRect();
            const { w, h } = sizeRef.current;
            const px = (e.clientX - rect.left) / w - 0.5, py = (e.clientY - rect.top) / h - 0.5;
            const sx = t.x + (px * w) / t.z, sy = t.y + (py * h) / t.z;
            const z = clampZ(t.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
            targetRef.current = { x: sx - (px * w) / z, y: sy - (py * h) / z, z };
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        const onFs = () => setFullscreen(document.fullscreenElement === el);
        document.addEventListener('fullscreenchange', onFs);
        return () => { ro.disconnect(); cancelAnimationFrame(raf); el.removeEventListener('wheel', onWheel); document.removeEventListener('fullscreenchange', onFs); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Con el panel lateral abierto, el punto enfocado queda centrado en el espacio libre de la izquierda.
    const focus = ([gx, gy], zMul = 2.2, panel = true) => {
        const [x, y] = iso(gx, gy);
        const z = clampZ(fitZoom() * zMul);
        const shift = panel && sizeRef.current.w > 900 ? 160 / z : 0;
        targetRef.current = { x: x + shift, y: y - 30, z };
    };
    const zoomBy = f => { const t = targetRef.current; if (t) targetRef.current = { ...t, z: clampZ(t.z * f) }; };
    const resetCam = () => { targetRef.current = home(); };

    // Arrastrar para mover la cámara (y distinguir arrastre de clic).
    const onPointerDown = e => {
        if (e.button !== 0 || e.target.closest?.('.lo-inspector')) return;
        dragRef.current = { x: e.clientX, y: e.clientY, cam: { ...targetRef.current } };
        movedRef.current = false;
    };
    const onPointerMove = e => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!movedRef.current && Math.hypot(dx, dy) < 4) return;
        movedRef.current = true;
        wrapRef.current?.classList.add('dragging');
        const t = { x: d.cam.x - dx / d.cam.z, y: d.cam.y - dy / d.cam.z, z: d.cam.z };
        targetRef.current = t;
        camRef.current = { ...t };
    };
    const onPointerUp = () => { dragRef.current = null; wrapRef.current?.classList.remove('dragging'); };
    // Un clic que fue en realidad un arrastre no selecciona nada.
    const onClickIfStill = (e, fn) => { if (movedRef.current) { e.stopPropagation(); return; } fn(e); };

    const onKeyDown = e => {
        const t = targetRef.current;
        if (!t || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        const step = 60 / t.z;
        const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (map[e.key]) { e.preventDefault(); targetRef.current = { ...t, x: t.x + map[e.key][0], y: t.y + map[e.key][1] }; }
        else if (e.key === '+' || e.key === '=') zoomBy(1.2);
        else if (e.key === '-') zoomBy(1 / 1.2);
        else if (e.key === '0') resetCam();
        else if (e.key === 'Escape') setSelection(null);
    };

    const toggleFs = () => {
        const el = wrapRef.current;
        if (document.fullscreenElement) document.exitFullscreen?.();
        else el?.requestFullscreen?.();
    };

    // ─── Eventos en vivo: vuelos de sobres/documentos y cámara que sigue la acción ───
    const posOf = id => plan.placed.find(p => p.agent.id === id);
    const recentEvents = liveEvents.filter(ev => now - ev.at < 20000 || ev === liveEvents[liveEvents.length - 1]);
    const flights = recentEvents.map(ev => {
        const d = ev.data || {};
        const ceo = iso(CEO_DESK_POS[0] + 0.9, CEO_DESK_POS[1], 20);
        if (ev.type === 'task_dispatched' && d.task) {
            const to = posOf(d.task.assignedAgentId);
            const parent = d.task.parentTaskId ? posOf(tasksById[d.task.parentTaskId]?.assignedAgentId) : null;
            if (!to && d.task.assignedAgentId !== 'open') return null;
            const target = to ? iso(...to.home.seat, 40) : iso(14.5, 23.5, 30);
            return { id: ev.id, from: parent ? iso(...parent.pos, 40) : ceo, to: target, kind: 'mail', color: '#38bdf8' };
        }
        if (ev.type === 'task_delivered') {
            const p = posOf(d.agentId || tasksById[d.taskId]?.assignedAgentId);
            return p ? { id: ev.id, from: iso(...p.home.seat, 40), to: ceo, kind: 'doc', color: '#b07cff' } : null;
        }
        return null;
    }).filter(Boolean);
    const lastEvent = liveEvents[liveEvents.length - 1];
    const toast = lastEvent && now - lastEvent.at < 7000 ? describe(lastEvent, agentsById, tasksById) : null;

    const lastIdRef = useRef(null);
    useEffect(() => {
        if (!lastEvent || lastEvent.id === lastIdRef.current) return;
        lastIdRef.current = lastEvent.id;
        if (!follow) return;
        const d = lastEvent.data || {};
        const id = d.agentId || d.task?.assignedAgentId || tasksById[d.taskId]?.assignedAgentId;
        const p = plan.placed.find(x => x.agent.id === id);
        if (lastEvent.type === 'task_delivered' || lastEvent.type === 'task_reviewed') focus(CEO_DESK_POS, 1.9);
        else if (p) focus(p.home.seat, 2.1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastEvent?.id]);

    // ─── Capa de personajes y escritorios ordenados por profundidad ───
    const items = [
        ...plan.desks.map(dk => {
            const p = plan.placed.find(x => x.agent.id === dk.agentId);
            const working = p?.mood === 'work';
            return { key: dk.id, depth: dk.x + dk.y, dim: roomDim(roomById[dk.room]), node: <Desk desk={dk} working={working && p?.at === 'desk'} statusColor={MOOD[p?.mood || 'idle'].color} /> };
        }),
        { key: 'ceo-bot', depth: CEO_SEAT[0] + CEO_SEAT[1], node: <g transform={`translate(${iso(...CEO_SEAT)[0]},${iso(...CEO_SEAT)[1]})`} style={{ cursor: 'pointer' }} onClick={e => onClickIfStill(e, () => { e.stopPropagation(); setSelection({ type: 'ceo' }); })}><CeoBot /></g> },
        { key: 'ceo-desk', depth: CEO_DESK_POS[0] + CEO_DESK_POS[1], node: <g style={{ cursor: 'pointer' }} onClick={e => onClickIfStill(e, () => { e.stopPropagation(); setSelection({ type: 'ceo' }); })}><CeoDesk x={CEO_DESK_POS[0]} y={CEO_DESK_POS[1]} reviewCount={reviewCount} approvalCount={approvalCount} /></g> },
        ...plan.placed.map(p => ({
            key: `agent-${p.agent.id}`,
            depth: p.pos[0] + p.pos[1] - 0.01,
            node: (
                <AgentSprite item={p} color={roomById[p.home.room]?.color || '#94a3b8'}
                    selected={selection?.type === 'agent' && selection.id === p.agent.id}
                    dimmed={roomDim(roomById[p.home.room])}
                    showName={detail || hoverAgent === p.agent.id || p.mood === 'work' || p.mood === 'deliver'}
                    onSelect={() => { if (!movedRef.current) { playOfficeClick(); setSelection({ type: 'agent', id: p.agent.id }); } }}
                    onHover={setHoverAgent} />
            ),
        })),
    ].sort((a, b) => a.depth - b.depth);

    const counts = {
        working: plan.placed.filter(p => p.mood === 'work').length,
        review: reviewCount,
        queued: activeTasks.filter(t => t.status === 'queued').length,
        online: agents.filter(a => a.kind === 'external' && a.online).length,
        external: agents.filter(a => a.kind === 'external').length,
    };
    const phaseIcon = { day: '☀️', dusk: '🌇', dawn: '🌅', night: '🌙' }[clock.phase];
    const B = SCENE_BOUNDS;
    const slab = [iso(0, 0), iso(20, 0), iso(20, 27), iso(0, 27)];
    const slabSide = h => [iso(0, 27), iso(20, 27), iso(20, 0), [iso(20, 0)[0], iso(20, 0)[1] + h], [iso(20, 27)[0], iso(20, 27)[1] + h], [iso(0, 27)[0], iso(0, 27)[1] + h]];

    return (
        <div ref={wrapRef} className={`lo-root phase-${clock.phase} ${isWarMode ? 'war' : ''} ${fullscreen ? 'fs' : ''}`} tabIndex={0}
            onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
            <svg ref={svgRef} className="lo-svg" viewBox={`${B.minX} ${B.minY} ${B.maxX - B.minX} ${B.maxY - B.minY}`} preserveAspectRatio="xMidYMid meet"
                onClick={e => onClickIfStill(e, () => setSelection(null))}>
                <SceneDefs rooms={ROOMS} warMode={isWarMode} />
                <ellipse cx={(B.minX + B.maxX) / 2} cy={(B.minY + B.maxY) / 2} rx={(B.maxX - B.minX) * 0.7} ry={(B.maxY - B.minY) * 0.7} fill="url(#lo-ground)" />
                {/* Losa del edificio */}
                <polygon points={pts(slabSide(16))} fill="#0a0f1b" stroke="#1d2840" />
                <polygon points={pts(slab)} fill="#0e1424" stroke="#26324d" strokeWidth="1.2" />
                {ROOMS.slice().sort((a, b) => a.gx + a.gy - (b.gx + b.gy)).map(room => (
                    <g key={room.id}>
                        <Room room={room} phase={clock.phase} dimmed={roomDim(room)}
                            hovered={hoverRoom === room.id} selected={selection?.type === 'room' && selection.id === room.id}
                            onEnter={() => setHoverRoom(room.id)} onLeave={() => setHoverRoom(null)}
                            onClick={e => onClickIfStill(e, () => { e.stopPropagation(); playOfficeClick(); setSelection(room.id === 'room-ceo' ? { type: 'ceo' } : { type: 'room', id: room.id }); focus([room.gx + room.w / 2, room.gy + room.d / 2], room.w > 8 ? 1.5 : 2); })} />
                        <g className={roomDim(room) ? 'lo-dim' : ''} pointerEvents="none">
                            {room.props.map((p, i) => <Prop key={i} p={p} room={room} warMode={isWarMode} />)}
                        </g>
                    </g>
                ))}
                {items.map(it => <g key={it.key} className={it.dim ? 'lo-dim' : ''}>{it.node}</g>)}
                {flights.map(f => <Flight key={f.id} {...f} />)}
                {isWarMode && <rect className="lo-war-flash" x={B.minX} y={B.minY} width={B.maxX - B.minX} height={B.maxY - B.minY} pointerEvents="none" />}
            </svg>

            {/* HUD superior */}
            <div className="lo-hud-top" onPointerDown={e => e.stopPropagation()}>
                <div className="lo-title">
                    <span className={`lo-live ${isWarMode ? 'war' : ''}`} />
                    <b>AI OFFICE</b><span>EN VIVO</span>
                    <span className="lo-clock">{phaseIcon} {clock.label} Panamá</span>
                </div>
                <div className="lo-counters">
                    <span title="Agentes trabajando ahora" style={{ color: '#38bdf8' }}>⚡ {counts.working} trabajando</span>
                    <button title="Abrir tu bandeja" style={{ color: '#b07cff' }} onClick={() => { setSelection({ type: 'ceo' }); focus(CEO_DESK_POS, 1.9); }}>📥 {counts.review} por revisar</button>
                    <span title="Tareas en cola" style={{ color: '#94a3b8' }}>⏳ {counts.queued} en cola</span>
                    <span title="Agentes conectados por MCP en línea" style={{ color: '#7dd3fc' }}>🔌 {counts.online}/{counts.external} en línea</span>
                </div>
                <div className="lo-rooms">
                    {ROOMS.map(r => (
                        <button key={r.id} style={{ '--c': r.color }} className={selection?.type === 'room' && selection.id === r.id ? 'on' : ''}
                            onClick={() => { playOfficeClick(); setSelection(r.id === 'room-ceo' ? { type: 'ceo' } : { type: 'room', id: r.id }); focus([r.gx + r.w / 2, r.gy + r.d / 2], r.w > 8 ? 1.5 : 2); }}>
                            {r.icon} {r.short}
                        </button>
                    ))}
                </div>
            </div>

            <div className="lo-tools" onPointerDown={e => e.stopPropagation()}>
                <button title={follow ? 'La cámara sigue cada evento (clic para fijarla)' : 'Seguir la acción con la cámara'} className={follow ? 'on' : ''} onClick={() => setFollow(f => !f)}>{follow ? <Video size={15} /> : <VideoOff size={15} />}</button>
                <button title="Acercar (+)" onClick={() => zoomBy(1.25)}><ZoomIn size={15} /></button>
                <button title="Alejar (−)" onClick={() => zoomBy(1 / 1.25)}><ZoomOut size={15} /></button>
                <button title="Ver todo (0)" onClick={resetCam}><Home size={15} /></button>
                <span ref={zoomLabelRef} className="lo-zoom">100%</span>
                <button title="Qué significa cada cosa" className={legend ? 'on' : ''} onClick={() => setLegend(l => !l)}><Info size={15} /></button>
                <button title={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => { const n = !muted; setMuted(n); setOfficeAudioMuted(n); }}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
                <button title="Pantalla completa" onClick={toggleFs}>{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
            </div>

            {toast && (
                <div key={lastEvent.id} className="lo-toast" style={{ '--c': toast.color }}>
                    <span>{toast.icon}</span> {toast.text}
                </div>
            )}

            {legend && (
                <div className="lo-legend" onPointerDown={e => e.stopPropagation()}>
                    {Object.entries(MOOD).map(([k, m]) => <div key={k}><i style={{ background: m.color }} />{m.label}</div>)}
                    <p>Arrastra para moverte · rueda o +/− para zoom · 0 vuelve a ver todo · clic en un robot, sala o en tu escritorio.</p>
                </div>
            )}

            {/* Minimapa */}
            <div className="lo-minimap" onPointerDown={e => e.stopPropagation()}>
                <svg viewBox={`${B.minX} ${B.minY} ${B.maxX - B.minX} ${B.maxY - B.minY}`}
                    onClick={e => {
                        const r = e.currentTarget.getBoundingClientRect();
                        const sx = B.minX + ((e.clientX - r.left) / r.width) * (B.maxX - B.minX);
                        const sy = B.minY + ((e.clientY - r.top) / r.height) * (B.maxY - B.minY);
                        targetRef.current = { ...targetRef.current, x: sx, y: sy };
                    }}>
                    <polygon points={pts(slab)} fill="#0e1424" />
                    {ROOMS.map(r => <polygon key={r.id} points={pts([iso(r.gx, r.gy), iso(r.gx + r.w, r.gy), iso(r.gx + r.w, r.gy + r.d), iso(r.gx, r.gy + r.d)])} fill={r.color} fillOpacity={roomDim(r) ? 0.08 : 0.28} stroke={r.color} strokeOpacity="0.6" strokeWidth="4" />)}
                    {plan.placed.map(p => { const [x, y] = iso(...p.pos); return <circle key={p.agent.id} cx={x} cy={y} r="16" fill={MOOD[p.mood].color} />; })}
                    <rect ref={miniRectRef} fill="rgba(255,255,255,0.06)" stroke="#fff" strokeWidth="8" rx="12" />
                </svg>
            </div>

            <LiveInspector
                selection={selection} plan={plan} rooms={ROOMS}
                activeTasks={activeTasks} completedTasks={completedTasks} approvals={approvals} models={models}
                onClose={() => setSelection(null)} onSelect={setSelection}
                onOpenTask={onOpenTask} onOpenAgentDesk={onOpenAgentDesk} onDispatch={onDispatch} onOpenApprovals={onOpenApprovals}
                onFocus={pos => focus(pos, 2.4)}
            />
        </div>
    );
}
