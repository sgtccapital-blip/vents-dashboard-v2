// Plano de la oficina en vivo: salas, muebles, puestos y dónde está cada agente.
// Coordenadas en baldosas (gx, gy); la pantalla se calcula con proyección isométrica 2:1.

// Estados visibles de cada robot.
export const MOOD = {
    work: { color: '#38bdf8', label: 'Trabajando' },
    idle: { color: '#2ee59d', label: 'Disponible' },
    deliver: { color: '#b07cff', label: 'Te trajo una entrega' },
    ask: { color: '#f5b638', label: 'Espera tu aprobación' },
    error: { color: '#ff5d6c', label: 'Falló su última tarea' },
    sleep: { color: '#64748b', label: 'Desconectado' },
    coffee: { color: '#d4a373', label: 'En pausa de café' },
    meeting: { color: '#9b6bff', label: 'En el War Room' },
};

export const SX = 32;
export const SY = 16;
export const WALL_OUT = 72; // pared exterior
export const WALL_IN = 40; // tabique de vidrio entre salas

export const iso = (gx, gy, gz = 0) => [(gx - gy) * SX, (gx + gy) * SY - gz];
export const pts = list => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

const SLOTS_6 = [[1.7, 2.3], [4.3, 2.3], [1.7, 4.6], [4.3, 4.6]];

// match: ids o palabras (id, nombre o rol) que llevan a un agente interno a esa sala.
export const ROOMS = [
    {
        id: 'room-ceo', name: 'Despacho CEO', short: 'CEO', icon: '👑', dept: 'executive', color: '#f5b638',
        gx: 0, gy: 0, w: 6, d: 6, floor: 'wood', slots: [],
        props: [
            { t: 'rug', x: 1.2, y: 1.2, w: 3.6, d: 3.4 }, { t: 'plant', x: 0.6, y: 0.6 }, { t: 'plant', x: 5.4, y: 0.6 },
            { t: 'shelf', x: 0.15, y: 3.2, side: 'left' }, { t: 'sofa', x: 4.6, y: 4.4, rot: 'left' },
        ],
    },
    {
        id: 'room-executive', name: 'Executive Suite', short: 'BART', icon: '👔', dept: 'executive', color: '#4f8bff',
        gx: 7, gy: 0, w: 6, d: 6, floor: 'carpet', slots: SLOTS_6,
        match: ['agent-bart', 'agent-openclaw', 'openclaw', 'coo', 'orchestr'],
        props: [{ t: 'whiteboard', x: 1.5, y: 0.1 }, { t: 'plant', x: 5.4, y: 0.6 }, { t: 'plant', x: 0.6, y: 5.4 }],
    },
    {
        id: 'room-creative', name: 'Creative Studio', short: 'Creative', icon: '🎬', dept: 'creative', color: '#ff4fa3',
        gx: 14, gy: 0, w: 6, d: 6, floor: 'concrete', slots: SLOTS_6,
        match: ['agent-echo', 'echo', 'social', 'creative', 'content', 'video'],
        props: [{ t: 'tripod', x: 5.0, y: 1.0 }, { t: 'ringlight', x: 0.9, y: 0.9 }, { t: 'plant', x: 5.4, y: 5.4 }],
    },
    {
        id: 'room-marketing', name: 'Marketing Hub', short: 'Marketing', icon: '🚀', dept: 'marketing', color: '#ff8a3d',
        gx: 0, gy: 7, w: 6, d: 6, floor: 'carpet', slots: SLOTS_6,
        match: ['agent-nexus', 'nexus', 'marketing', 'growth', 'ads'],
        props: [{ t: 'screenwall', x: 0.1, y: 1.4, side: 'left' }, { t: 'plant', x: 5.4, y: 0.6 }],
    },
    {
        id: 'room-meeting', name: 'War Room', short: 'War Room', icon: '🤝', dept: 'meeting', color: '#9b6bff',
        gx: 7, gy: 7, w: 6, d: 6, floor: 'carpet', slots: [],
        props: [{ t: 'conftable', x: 3, y: 3 }, { t: 'plant', x: 0.6, y: 0.6 }, { t: 'plant', x: 5.4, y: 0.6 }],
    },
    {
        id: 'room-tech', name: 'Tech Lab', short: 'Tech', icon: '💻', dept: 'tech', color: '#22d3ee',
        gx: 14, gy: 7, w: 6, d: 6, floor: 'concrete', slots: SLOTS_6,
        match: ['agent-antigravity', 'antigravity', 'engineer', 'dev', 'code'],
        props: [{ t: 'server', x: 0.4, y: 0.4 }, { t: 'server', x: 1.3, y: 0.4 }, { t: 'server', x: 2.2, y: 0.4 }, { t: 'plant', x: 5.4, y: 5.4 }],
    },
    {
        id: 'room-operations', name: 'Operaciones & Venues', short: 'Venues', icon: '📦', dept: 'operations', color: '#2ee59d',
        gx: 0, gy: 14, w: 6, d: 6, floor: 'wood', slots: SLOTS_6,
        match: ['agent-atlas', 'atlas', 'logistic', 'operation', 'venue'],
        props: [{ t: 'boxes', x: 0.6, y: 5.1 }, { t: 'maptable', x: 4.5, y: 0.9 }, { t: 'plant', x: 0.6, y: 0.6 }],
    },
    {
        id: 'room-sales', name: 'VIP Sales Lounge', short: 'Ventas', icon: '💎', dept: 'sales', color: '#c25bff',
        gx: 7, gy: 14, w: 6, d: 6, floor: 'wood', slots: SLOTS_6,
        match: ['agent-closerops', 'closer', 'sales', 'venta', 'vip'],
        props: [{ t: 'bar', x: 0.3, y: 0.3 }, { t: 'sofa', x: 4.6, y: 0.5 }, { t: 'plant', x: 5.4, y: 5.4 }],
    },
    {
        id: 'room-community', name: 'Centro de Difusión', short: 'Difusión', icon: '📡', dept: 'community', color: '#a3e635',
        gx: 14, gy: 14, w: 6, d: 6, floor: 'concrete', slots: SLOTS_6,
        match: ['agent-pulse', 'pulse', 'whatsapp', 'community', 'difusi'],
        props: [{ t: 'antenna', x: 5.0, y: 1.0 }, { t: 'plant', x: 0.6, y: 0.6 }, { t: 'plant', x: 0.6, y: 5.4 }],
    },
    {
        id: 'room-intel', name: 'Inteligencia & Licitaciones', short: 'Intel', icon: '🛡️', dept: 'intel', color: '#ff5d6c',
        gx: 0, gy: 21, w: 6, d: 6, floor: 'carpet', slots: SLOTS_6,
        match: ['agent-sentinel', 'agent-licitia', 'agent-scout', 'sentinel', 'licit', 'scout', 'analyst', 'tender', 'sourcing'],
        props: [{ t: 'radar', x: 4.8, y: 1.0 }, { t: 'shelf', x: 0.15, y: 3.0, side: 'left' }],
    },
    {
        id: 'room-mcp', name: 'Hub MCP · Agentes conectados', short: 'Hub MCP', icon: '🔌', dept: 'mcp', color: '#38bdf8',
        gx: 7, gy: 21, w: 13, d: 6, floor: 'tech', slots: [],
        props: [
            { t: 'portal', x: 2.2, y: 2.4 }, { t: 'coffee', x: 11.6, y: 0.4 }, { t: 'sofa', x: 10.2, y: 4.6, rot: 'left' },
            { t: 'plant', x: 12.4, y: 5.4 }, { t: 'plant', x: 0.6, y: 5.4 },
        ],
    },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map(r => [r.id, r]));

// Puestos del Hub MCP (consolas para agentes externos) y de reunión.
const MCP_PODS = [[5.2, 1.8], [7.2, 1.8], [9.2, 1.8], [5.2, 4.2], [7.2, 4.2], [9.2, 4.2], [11.2, 3.0], [3.6, 4.6]];
const CEO_DESK = [3, 2.4];
const CEO_QUEUE = [[2.0, 4.0], [2.9, 4.15], [3.8, 4.1], [1.6, 5.0], [2.5, 5.15], [3.4, 5.2], [4.2, 5.1], [1.2, 4.1]];
const COFFEE_SPOTS = [[11.0, 1.6], [12.2, 1.7], [11.6, 2.5], [10.6, 2.4]];
const MEETING_SEATS = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return [3 + Math.cos(a) * 2.05, 3 + Math.sin(a) * 1.55];
});

const abs = (room, [x, y]) => [room.gx + x, room.gy + y];
export const CEO_SEAT = abs(ROOM_BY_ID['room-ceo'], [CEO_DESK[0], CEO_DESK[1] - 0.75]);
export const CEO_DESK_POS = abs(ROOM_BY_ID['room-ceo'], CEO_DESK);

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// Primero el id exacto del agente; luego palabras del id y nombre; por último el rol.
function roomFor(agent) {
    const byId = ROOMS.find(r => r.match?.includes(agent.id));
    if (byId) return byId;
    const words = hay => ROOMS.find(r => r.match?.some(m => !m.startsWith('agent-') && hay.includes(m)));
    return words(`${agent.id} ${agent.name}`.toLowerCase()) || words(String(agent.role || '').toLowerCase()) || ROOM_BY_ID['room-executive'];
}

/**
 * Asigna a cada agente su escritorio (o consola MCP) y calcula dónde debe estar ahora
 * según lo que está haciendo de verdad. Devuelve también los escritorios a dibujar.
 */
export function planOffice({ agents, activeTasks = [], completedTasks = [], isWarMode = false, now = Date.now() }) {
    const desks = [];
    const homes = {};
    const used = {};
    const internal = agents.filter(a => a.kind !== 'external');
    const external = agents.filter(a => a.kind === 'external');

    for (const a of internal) {
        let room = roomFor(a);
        let i = used[room.id] || 0;
        if (i >= room.slots.length) { room = ROOM_BY_ID['room-executive']; i = used[room.id] || 0; }
        const slot = room.slots[i] || [1 + (i % 4) * 1.3, 1.2 + Math.floor(i / 4) * 1.4];
        used[room.id] = i + 1;
        const [dx, dy] = abs(room, slot);
        desks.push({ id: `desk-${a.id}`, x: dx, y: dy, room: room.id, agentId: a.id, color: room.color });
        homes[a.id] = { room: room.id, seat: [dx, dy - 0.72], desk: [dx, dy] };
    }
    const mcp = ROOM_BY_ID['room-mcp'];
    external.forEach((a, i) => {
        const p = abs(mcp, MCP_PODS[i % MCP_PODS.length]);
        desks.push({ id: `pod-${a.id}`, x: p[0], y: p[1], room: mcp.id, agentId: a.id, pod: true, color: mcp.color });
        homes[a.id] = { room: mcp.id, seat: [p[0], p[1] - 0.62], desk: p };
    });

    const reviewBy = {};
    for (const t of activeTasks) if (t.status === 'review') (reviewBy[t.assignedAgentId] ||= []).push(t);
    const failedRecently = new Set(completedTasks
        .filter(t => t.status === 'failed' && now - Date.parse(t.updatedAt || t.createdAt || 0) < 15 * 60 * 1000)
        .map(t => t.assignedAgentId));

    const meeting = ROOM_BY_ID['room-meeting'];
    let queueIdx = 0, coffeeIdx = 0, seatIdx = 0;
    const bucket = Math.floor(now / (5 * 60 * 1000));

    const placed = agents.map(a => {
        const home = homes[a.id];
        const working = a.status === 'executing' || a.status === 'planning';
        const reviews = reviewBy[a.id] || [];
        let pos = home.seat, pose = 'sit', mood = 'idle', at = 'desk';
        if (a.kind === 'external') {
            mood = working ? 'work' : a.online ? 'idle' : 'sleep';
            if (!working && reviews.length && queueIdx < CEO_QUEUE.length) { pos = abs(ROOM_BY_ID['room-ceo'], CEO_QUEUE[queueIdx++]); pose = 'stand'; mood = 'deliver'; at = 'ceo'; }
        } else if (isWarMode && seatIdx < MEETING_SEATS.length) {
            pos = abs(meeting, MEETING_SEATS[seatIdx++]); pose = 'stand'; mood = working ? 'work' : 'meeting'; at = 'war';
        } else if (working) {
            mood = 'work';
        } else if ((reviews.length || a.status === 'waiting_approval') && queueIdx < CEO_QUEUE.length) {
            pos = abs(ROOM_BY_ID['room-ceo'], CEO_QUEUE[queueIdx++]); pose = 'stand'; at = 'ceo';
            mood = reviews.length ? 'deliver' : 'ask';
        } else if (failedRecently.has(a.id)) {
            mood = 'error';
        } else if (hash(`${a.id}:${bucket}`) % 5 === 0 && coffeeIdx < COFFEE_SPOTS.length) {
            pos = abs(mcp, COFFEE_SPOTS[coffeeIdx++]); pose = 'stand'; mood = 'coffee'; at = 'coffee';
        }
        return { agent: a, home, pos, pose, mood, at, reviews, tint: hash(a.id) };
    });

    return { desks, placed, homes };
}

// Hora de Panamá (UTC-5, sin horario de verano) → ambiente del día.
export function panamaClock(now = Date.now()) {
    const d = new Date(now - 5 * 3600 * 1000);
    const h = d.getUTCHours() + d.getUTCMinutes() / 60;
    const phase = h >= 6.5 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : h >= 5.5 && h < 6.5 ? 'dawn' : 'night';
    const label = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return { phase, label };
}

export const SCENE_BOUNDS = (() => {
    const xs = [], ys = [];
    for (const r of ROOMS) for (const [x, y] of [[r.gx, r.gy], [r.gx + r.w, r.gy], [r.gx, r.gy + r.d], [r.gx + r.w, r.gy + r.d]]) {
        const [sx, sy] = iso(x, y);
        xs.push(sx); ys.push(sy);
    }
    const pad = 70;
    return { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - WALL_OUT - pad, maxY: Math.max(...ys) + pad + 20 };
})();
