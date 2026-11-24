import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    ZoomIn, ZoomOut, Maximize2, RotateCcw, Sparkles, Building2,
    Eye, Shield, Activity, Users, Layers, AlertCircle, CheckCircle2,
    Clock, Terminal, Laptop, HelpCircle
} from 'lucide-react';

// Room layout configurations on the isometric grid
export const OFFICE_ROOMS_LAYOUT = [
    {
        id: 'room-ceo',
        name: 'Despacho CEO',
        code: 'CEO-01',
        icon: '👑',
        gridX: 2,
        gridY: 2,
        width: 7,
        depth: 7,
        color: '#eab308',
        desc: 'Command Center corporativo & Kill Switch',
        desks: [
            { id: 'desk-ceo', x: 5, y: 5, label: 'Gabriel (CEO)', isUser: true }
        ]
    },
    {
        id: 'room-executive',
        name: 'Executive Suite',
        code: 'COO-01',
        icon: '👔',
        gridX: 10,
        gridY: 2,
        width: 7,
        depth: 7,
        color: '#3b82f6',
        desc: 'BART (COO) — Orquestación & Triaje',
        desks: [
            { id: 'desk-bart', x: 13, y: 5, agentId: 'agent-bart' }
        ]
    },
    {
        id: 'room-creative',
        name: 'Creative Studio',
        code: 'CRT-01',
        icon: '🎬',
        gridX: 18,
        gridY: 2,
        width: 8,
        depth: 6,
        color: '#ec4899',
        desc: 'Guiones de video, storytelling & artes',
        desks: [
            { id: 'desk-echo', x: 21, y: 4, agentId: 'agent-echo' },
            { id: 'desk-mario', x: 24, y: 4, label: 'Mario (Lead Creativo)', avatar: '🎨' }
        ]
    },
    {
        id: 'room-meeting',
        name: 'War Room / Juntas',
        code: 'CONF-01',
        icon: '🤝',
        gridX: 9,
        gridY: 10,
        width: 9,
        depth: 7,
        color: '#8b5cf6',
        desc: 'Deliberación multiagente & estrategia',
        desks: [
            { id: 'desk-conf-1', x: 13, y: 13, label: 'Mesa de Juntas', isTable: true }
        ]
    },
    {
        id: 'room-tech',
        name: 'Tech & Dev Lab',
        code: 'DEV-01',
        icon: '💻',
        gridX: 19,
        gridY: 9,
        width: 8,
        depth: 7,
        color: '#06b6d4',
        desc: 'Ingeniería, React frontend & MCP tools',
        desks: [
            { id: 'desk-antigravity', x: 22, y: 12, agentId: 'agent-antigravity' }
        ]
    },
    {
        id: 'room-marketing',
        name: 'Marketing Hub',
        code: 'MKT-01',
        icon: '🚀',
        gridX: 1,
        gridY: 10,
        width: 7,
        depth: 7,
        color: '#f59e0b',
        desc: 'Performance ads, embudos & lanzamientos',
        desks: [
            { id: 'desk-nexus', x: 4, y: 13, agentId: 'agent-nexus' }
        ]
    },
    {
        id: 'room-operations',
        name: 'Operations & Venues',
        code: 'OPS-01',
        icon: '📦',
        gridX: 1,
        gridY: 18,
        width: 8,
        depth: 7,
        color: '#10b981',
        desc: 'Logística de venues (Terraplén, Furia, Piano Bar, HangOut)',
        desks: [
            { id: 'desk-atlas', x: 4, y: 21, agentId: 'agent-atlas' }
        ]
    },
    {
        id: 'room-sales',
        name: 'VIP Sales Lounge',
        code: 'SLS-01',
        icon: '💎',
        gridX: 10,
        gridY: 18,
        width: 8,
        depth: 7,
        color: '#a855f7',
        desc: 'Mesas VIP, reservas de cenas & CRM',
        desks: [
            { id: 'desk-closerops', x: 13, y: 21, agentId: 'agent-closerops' }
        ]
    },
    {
        id: 'room-community',
        name: 'Centro de Difusión',
        code: 'DIF-01',
        icon: '⚡',
        gridX: 19,
        gridY: 17,
        width: 8,
        depth: 7,
        color: '#22c55e',
        desc: 'WhatsApp, IG Broadcast, DMs & TikTok',
        desks: [
            { id: 'desk-pulse', x: 22, y: 20, agentId: 'agent-pulse' }
        ]
    },
    {
        id: 'room-server',
        name: 'Server Room',
        code: 'SRV-01',
        icon: '🖥️',
        gridX: 1,
        gridY: 26,
        width: 8,
        depth: 6,
        color: '#ef4444',
        desc: 'OpenClaw workers & MCP Server gateway',
        desks: [
            { id: 'desk-server', x: 4, y: 28, label: 'Racks & Gateways', isServer: true }
        ]
    },
    {
        id: 'room-library',
        name: 'Knowledge Library',
        code: 'LIB-01',
        icon: '📚',
        gridX: 10,
        gridY: 26,
        width: 8,
        depth: 6,
        color: '#38bdf8',
        desc: 'BrainVault Markdown & RAG Engine',
        desks: [
            { id: 'desk-scout', x: 12, y: 28, agentId: 'agent-scout' },
            { id: 'desk-sentinel', x: 15, y: 28, agentId: 'agent-sentinel' }
        ]
    },
    {
        id: 'room-reception',
        name: 'Recepción & Intake',
        code: 'REC-01',
        icon: '🛎️',
        gridX: 19,
        gridY: 25,
        width: 8,
        depth: 7,
        color: '#64748b',
        desc: 'Recepción de misiones del CEO & briefs',
        desks: [
            { id: 'desk-reception', x: 22, y: 28, label: 'Intake Desk', isKiosk: true }
        ]
    }
];

export default function OfficeIsometricCanvas({
    agents = [],
    activeTasks = [],
    onSelectAgent,
    onSelectRoom,
    filterDepartment = 'all'
}) {
    const containerRef = useRef(null);
    const [zoom, setZoom] = useState(0.85);
    const [pan, setPan] = useState({ x: 380, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredRoom, setHoveredRoom] = useState(null);
    const [hoveredAgent, setHoveredAgent] = useState(null);

    // Isometric projection mathematics (2:1 dimetric projection)
    const TILE_W = 60;
    const TILE_H = 30;

    const toIso = (gx, gy, gz = 0) => {
        const isoX = (gx - gy) * (TILE_W / 2);
        const isoY = (gx + gy) * (TILE_H / 2) - gz;
        return { x: isoX, y: isoY };
    };

    // Agent map for quick lookup
    const agentMap = useMemo(() => {
        const m = {};
        agents.forEach(a => {
            m[a.id] = a;
            // Also map by name prefix for safety
            const firstName = a.name.split(' ')[0].toLowerCase();
            m[firstName] = a;
        });
        return m;
    }, [agents]);

    // Handle Pan dragging
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        setZoom(prev => Math.min(Math.max(0.4, prev + delta), 1.6));
    };

    // Status color mapping
    const getStatusStyle = (status) => {
        switch (status) {
            case 'executing':
                return { ring: 'ring-blue-500', glow: 'rgba(59, 130, 246, 0.6)', text: 'En Ejecución', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
            case 'planning':
                return { ring: 'ring-purple-500', glow: 'rgba(168, 85, 247, 0.6)', text: 'Planificando', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
            case 'waiting_approval':
                return { ring: 'ring-amber-500 animate-pulse', glow: 'rgba(245, 158, 11, 0.8)', text: 'Esperando Aprobación', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
            case 'in_meeting':
                return { ring: 'ring-violet-400', glow: 'rgba(139, 92, 246, 0.6)', text: 'En War Room', badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
            case 'blocked':
                return { ring: 'ring-red-500 animate-bounce', glow: 'rgba(239, 68, 68, 0.8)', text: 'Bloqueado', badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40' };
            case 'resting':
                return { ring: 'ring-indigo-400/40', glow: 'rgba(99, 102, 241, 0.2)', text: 'En Reposo', badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
            case 'offline':
                return { ring: 'ring-gray-600', glow: 'none', text: 'Desconectado', badgeBg: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
            case 'available':
            default:
                return { ring: 'ring-emerald-500', glow: 'rgba(16, 185, 129, 0.5)', text: 'Disponible', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[640px] lg:h-[720px] bg-[#070A0F] overflow-hidden rounded-2xl border border-white/10 select-none shadow-2xl cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Ambient Background Grid Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

            {/* Transform Canvas Layer */}
            <div
                className="absolute inset-0 origin-center transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
                }}
            >
                <svg className="w-[2000px] h-[2000px] -translate-x-[400px] -translate-y-[200px] overflow-visible">
                    <defs>
                        <radialGradient id="roomGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* 1. ROOM FLOORS & GLASS WALLS */}
                    {OFFICE_ROOMS_LAYOUT.map(room => {
                        const isFiltered = filterDepartment !== 'all' && !room.id.includes(filterDepartment.replace('dept-', ''));
                        const isHovered = hoveredRoom?.id === room.id;

                        // Calculate the 4 vertices of the room's isometric rectangle floor
                        const pTop = toIso(room.gridX, room.gridY);
                        const pRight = toIso(room.gridX + room.width, room.gridY);
                        const pBottom = toIso(room.gridX + room.width, room.gridY + room.depth);
                        const pLeft = toIso(room.gridX, room.gridY + room.depth);

                        const pointsStr = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

                        // Wall height in isometric
                        const wallH = 45;
                        const wTop = toIso(room.gridX, room.gridY, wallH);
                        const wRight = toIso(room.gridX + room.width, room.gridY, wallH);
                        const wLeft = toIso(room.gridX, room.gridY + room.depth, wallH);

                        return (
                            <g
                                key={room.id}
                                className={`transition-all duration-300 ${isFiltered ? 'opacity-25' : 'opacity-100'}`}
                                onClick={() => onSelectRoom && onSelectRoom(room)}
                                onMouseEnter={() => setHoveredRoom(room)}
                                onMouseLeave={() => setHoveredRoom(null)}
                            >
                                {/* Floor polygon */}
                                <polygon
                                    points={pointsStr}
                                    fill={room.color}
                                    fillOpacity={isHovered ? 0.22 : 0.08}
                                    stroke={room.color}
                                    strokeWidth={isHovered ? 2 : 1}
                                    strokeOpacity={isHovered ? 0.9 : 0.35}
                                    className="cursor-pointer"
                                />

                                {/* Back Left Wall */}
                                <polygon
                                    points={`${pTop.x},${pTop.y} ${wTop.x},${wTop.y} ${wLeft.x},${wLeft.y} ${pLeft.x},${pLeft.y}`}
                                    fill="url(#roomGlow)"
                                    fillOpacity={0.06}
                                    stroke={room.color}
                                    strokeWidth={0.75}
                                    strokeOpacity={0.25}
                                />

                                {/* Back Right Wall */}
                                <polygon
                                    points={`${pTop.x},${pTop.y} ${wTop.x},${wTop.y} ${wRight.x},${wRight.y} ${pRight.x},${pRight.y}`}
                                    fill="url(#roomGlow)"
                                    fillOpacity={0.06}
                                    stroke={room.color}
                                    strokeWidth={0.75}
                                    strokeOpacity={0.25}
                                />

                                {/* Center Room Label & Icon */}
                                {(() => {
                                    const centerIso = toIso(room.gridX + room.width / 2, room.gridY + room.depth / 2);
                                    return (
                                        <g transform={`translate(${centerIso.x}, ${centerIso.y - 10})`} className="pointer-events-none">
                                            <text
                                                textAnchor="middle"
                                                fill={room.color}
                                                fontSize="11"
                                                fontWeight="600"
                                                letterSpacing="0.05em"
                                                opacity={isHovered ? 1 : 0.8}
                                            >
                                                {room.icon} {room.name.toUpperCase()}
                                            </text>
                                            <text
                                                y="14"
                                                textAnchor="middle"
                                                fill="#94a3b8"
                                                fontSize="8.5"
                                                opacity={0.6}
                                            >
                                                {room.code}
                                            </text>
                                        </g>
                                    );
                                })()}
                            </g>
                        );
                    })}

                    {/* 2. FURNITURE, DESKS & AGENT CHARACTERS */}
                    {OFFICE_ROOMS_LAYOUT.flatMap(room => room.desks || []).map(desk => {
                        const iso = toIso(desk.x, desk.y);
                        const agent = desk.agentId ? agentMap[desk.agentId] : null;
                        const isHovered = hoveredAgent?.id === (agent?.id || desk.id);
                        const statusStyle = agent ? getStatusStyle(agent.status) : null;
                        const activeTask = activeTasks.find(t => t.assignedAgentId === agent?.id || (agent?.name && t.assignedAgent?.includes(agent.name.split(' ')[0])));

                        return (
                            <g
                                key={desk.id}
                                transform={`translate(${iso.x}, ${iso.y})`}
                                className="cursor-pointer group"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (agent) onSelectAgent(agent);
                                }}
                                onMouseEnter={() => setHoveredAgent(agent || desk)}
                                onMouseLeave={() => setHoveredAgent(null)}
                            >
                                {/* Desk Isometric Base / Surface */}
                                <g transform="translate(0, 10)">
                                    {/* Desk Shadow */}
                                    <ellipse cx="0" cy="8" rx="28" ry="14" fill="#000000" fillOpacity="0.5" />

                                    {/* Workstation Tabletop */}
                                    <polygon
                                        points="-24,0 0,-12 24,0 0,12"
                                        fill="#1e293b"
                                        stroke="#475569"
                                        strokeWidth="1.2"
                                    />
                                    {/* Table Depth / Legs */}
                                    <polygon points="-24,0 0,12 0,18 -24,6" fill="#0f172a" />
                                    <polygon points="0,12 24,0 24,6 0,18" fill="#1e293b" />

                                    {/* Laptop / Monitor Glow */}
                                    <polygon
                                        points="-8,-3 0,-7 8,-3 0,1"
                                        fill={agent?.status === 'executing' ? '#38bdf8' : '#64748b'}
                                        fillOpacity={agent?.status === 'executing' ? 0.9 : 0.5}
                                        className={agent?.status === 'executing' ? 'animate-pulse' : ''}
                                    />
                                </g>

                                {/* Character / Agent Representation */}
                                {agent ? (
                                    <g transform="translate(0, -18)">
                                        {/* Status Glow Ring */}
                                        <circle
                                            cx="0"
                                            cy="0"
                                            r="20"
                                            fill="transparent"
                                            stroke={statusStyle?.glow || '#3b82f6'}
                                            strokeWidth="2.5"
                                            strokeDasharray={agent.status === 'executing' ? '4 2' : 'none'}
                                            className={agent.status === 'executing' ? 'animate-spin' : ''}
                                            style={{ animationDuration: '6s' }}
                                        />

                                        {/* Character Avatar Circle */}
                                        <circle
                                            cx="0"
                                            cy="0"
                                            r="17"
                                            fill="#0f172a"
                                            stroke="#334155"
                                            strokeWidth="1.5"
                                        />

                                        {/* Avatar Emoji */}
                                        <text
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fontSize="17"
                                            className="select-none"
                                        >
                                            {agent.avatar || '🤖'}
                                        </text>

                                        {/* Operational State Indicator Pill */}
                                        <g transform="translate(0, -28)">
                                            <rect
                                                x="-38"
                                                y="-10"
                                                width="76"
                                                height="18"
                                                rx="9"
                                                fill="#0b0f17"
                                                stroke={agent.status === 'waiting_approval' ? '#eab308' : agent.status === 'executing' ? '#3b82f6' : '#1e293b'}
                                                strokeWidth="1.2"
                                            />
                                            <circle
                                                cx="-28"
                                                cy="-1"
                                                r="3.5"
                                                fill={agent.status === 'executing' ? '#3b82f6' : agent.status === 'waiting_approval' ? '#eab308' : agent.status === 'in_meeting' ? '#a855f7' : '#10b981'}
                                                className={agent.status === 'executing' ? 'animate-pulse' : ''}
                                            />
                                            <text
                                                x="-20"
                                                y="3"
                                                fill="#e2e8f0"
                                                fontSize="8.5"
                                                fontWeight="600"
                                            >
                                                {agent.name.split(' ')[0]}
                                            </text>
                                        </g>

                                        {/* Live Progress Bar if Executing */}
                                        {agent.status === 'executing' && (
                                            <g transform="translate(-25, 26)">
                                                <rect x="0" y="0" width="50" height="4" rx="2" fill="#1e293b" />
                                                <rect
                                                    x="0"
                                                    y="0"
                                                    width={activeTask ? `${activeTask.progress || 50}%` : '35'}
                                                    height="4"
                                                    rx="2"
                                                    fill="#38bdf8"
                                                    className="animate-pulse"
                                                />
                                            </g>
                                        )}
                                    </g>
                                ) : desk.isUser ? (
                                    <g transform="translate(0, -16)">
                                        <circle cx="0" cy="0" r="18" fill="#1e1b4b" stroke="#eab308" strokeWidth="2" />
                                        <text textAnchor="middle" dominantBaseline="central" fontSize="17">👑</text>
                                        <text y="-26" textAnchor="middle" fill="#facc15" fontSize="9" fontWeight="bold">CEO (GG)</text>
                                    </g>
                                ) : (
                                    <g transform="translate(0, -10)">
                                        <circle cx="0" cy="0" r="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                                        <text textAnchor="middle" dominantBaseline="central" fontSize="12">{desk.avatar || '🖥️'}</text>
                                        <text y="-18" textAnchor="middle" fill="#94a3b8" fontSize="8">{desk.label || 'Workstation'}</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* TOP OVERLAY HUD: CONTROLS & STATS */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 bg-[#0B0F17]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 pointer-events-auto shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-white tracking-wide">AI OFFICE HQ</span>
                    <span className="text-[11px] text-gray-400 border-l border-white/10 pl-2">2.5D Isometric Engine</span>
                </div>

                {/* Zoom & Pan Controls */}
                <div className="flex items-center gap-1.5 bg-[#0B0F17]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 pointer-events-auto shadow-lg">
                    <button
                        onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}
                        title="Acercar (Zoom In)"
                        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}
                        title="Alejar (Zoom Out)"
                        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <button
                        onClick={() => { setZoom(0.85); setPan({ x: 380, y: 120 }); }}
                        title="Restablecer Vista"
                        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <span className="text-[11px] font-mono text-gray-400 px-2">
                        {Math.round(zoom * 100)}%
                    </span>
                </div>
            </div>

            {/* BOTTOM OVERLAY HUD: HOVER INSPECTOR CARD */}
            {hoveredAgent && (
                <div className="absolute bottom-4 left-4 max-w-sm bg-[#0B0F17]/95 backdrop-blur-xl p-3.5 rounded-2xl border border-white/15 shadow-2xl pointer-events-auto animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                            {hoveredAgent.avatar || '🤖'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white truncate">{hoveredAgent.name || hoveredAgent.label}</h4>
                                {hoveredAgent.status && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getStatusStyle(hoveredAgent.status).badgeBg}`}>
                                        {getStatusStyle(hoveredAgent.status).text}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{hoveredAgent.role || 'Estación de trabajo'}</p>
                        </div>
                    </div>

                    {hoveredAgent.currentTaskName && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Tarea en Curso:</span>
                            <p className="text-gray-300 mt-0.5 line-clamp-2">{hoveredAgent.currentTaskName}</p>
                        </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>Click para abrir despacho ➔</span>
                        <span className="font-mono text-blue-400">{hoveredAgent.model || 'gemini-2.5-flash'}</span>
                    </div>
                </div>
            )}

            {/* MINIMAP VIEWPORT INDICATOR (BOTTOM RIGHT) */}
            <div className="absolute bottom-4 right-4 w-36 h-28 bg-[#0B0F17]/90 backdrop-blur-md rounded-xl border border-white/10 p-2 hidden sm:flex flex-col justify-between pointer-events-none shadow-xl">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                    <span>MINIMAP</span>
                    <span className="text-emerald-400 font-bold">{agents.length} AGENTS</span>
                </div>
                <div className="w-full h-16 bg-white/5 rounded relative overflow-hidden flex items-center justify-center">
                    <div className="w-20 h-10 border border-blue-400/50 bg-blue-500/10 rounded" />
                </div>
                <span className="text-[8px] text-gray-500 text-center">Arrastra para explorar</span>
            </div>
        </div>
    );
}
