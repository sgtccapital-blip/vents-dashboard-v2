import React, { useState, useMemo, useRef } from 'react';
import {
    ZoomIn, ZoomOut, RotateCcw, Volume2, VolumeX,
    Radio, Sparkles, Shield, Activity, Users, Laptop,
    Compass, Eye, CheckCircle2, AlertCircle
} from 'lucide-react';
import { isOfficeAudioMuted, setOfficeAudioMuted, playOfficeClick } from '../../lib/officeAudio';
import './AiOffice.css';

// 3x3 Corporate Campus Layout with central War Room
export const OFFICE_CAMPUS_ROOMS = [
    {
        id: 'room-ceo',
        name: 'Despacho CEO',
        code: 'CEO-01',
        icon: '👑',
        gx: 1,
        gy: 1,
        w: 5.5,
        d: 5.5,
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.6)',
        desc: 'Gabriel (CEO) · Command Center & Decisiones',
        desks: [
            { id: 'desk-ceo', x: 3.75, y: 3.75, label: 'Gabriel (CEO)', avatar: '👑', isUser: true, toolIcon: '👑' }
        ]
    },
    {
        id: 'room-executive',
        name: 'Executive Suite',
        code: 'COO-01',
        icon: '👔',
        gx: 8,
        gy: 1,
        w: 5.5,
        d: 5.5,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.6)',
        desc: 'BART (COO) · Orquestación & Triaje de Misiones',
        desks: [
            { id: 'desk-bart', x: 10.75, y: 3.75, agentId: 'agent-bart', toolIcon: '👔' }
        ]
    },
    {
        id: 'room-creative',
        name: 'Creative Studio',
        code: 'CRT-01',
        icon: '🎬',
        gx: 15,
        gy: 1,
        w: 5.5,
        d: 5.5,
        color: '#ec4899',
        bgColor: 'rgba(236, 72, 153, 0.15)',
        borderColor: 'rgba(236, 72, 153, 0.6)',
        desc: 'Echo & Mario · Guiones, Video & Contenido',
        desks: [
            { id: 'desk-echo', x: 16.5, y: 3.5, agentId: 'agent-echo', toolIcon: '🎬' },
            { id: 'desk-mario', x: 18.5, y: 4.5, label: 'Mario (Creative)', avatar: '🎨', toolIcon: '🎨' }
        ]
    },
    {
        id: 'room-marketing',
        name: 'Marketing Hub',
        code: 'MKT-01',
        icon: '🚀',
        gx: 1,
        gy: 8,
        w: 5.5,
        d: 5.5,
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.15)',
        borderColor: 'rgba(249, 115, 22, 0.6)',
        desc: 'Nexus · Performance Ads, Embudos & Lanzamiento',
        desks: [
            { id: 'desk-nexus', x: 3.75, y: 10.75, agentId: 'agent-nexus', toolIcon: '🚀' }
        ]
    },
    {
        id: 'room-meeting',
        name: 'War Room (Juntas)',
        code: 'WAR-01',
        icon: '🤝',
        gx: 7.5,
        gy: 7.5,
        w: 6.5,
        d: 6.5,
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.18)',
        borderColor: 'rgba(139, 92, 246, 0.75)',
        desc: 'Sala de Juntas · Deliberación Estratégica Multiagente',
        desks: [
            { id: 'desk-conf-table', x: 10.75, y: 10.75, label: 'Mesa de Juntas', isTable: true }
        ]
    },
    {
        id: 'room-tech',
        name: 'Tech & Dev Lab',
        code: 'DEV-01',
        icon: '💻',
        gx: 15,
        gy: 8,
        w: 5.5,
        d: 5.5,
        color: '#06b6d4',
        bgColor: 'rgba(6, 182, 212, 0.15)',
        borderColor: 'rgba(6, 182, 212, 0.6)',
        desc: 'Antigravity · Arquitectura Frontend, React & MCP',
        desks: [
            { id: 'desk-antigravity', x: 17.75, y: 10.75, agentId: 'agent-antigravity', toolIcon: '💻' }
        ]
    },
    {
        id: 'room-operations',
        name: 'Operations & Venues',
        code: 'OPS-01',
        icon: '📦',
        gx: 1,
        gy: 15,
        w: 5.5,
        d: 5.5,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.6)',
        desc: 'Atlas · Terraplén, Furia, Piano Bar, HangOut',
        desks: [
            { id: 'desk-atlas', x: 3.75, y: 17.75, agentId: 'agent-atlas', toolIcon: '📦' }
        ]
    },
    {
        id: 'room-sales',
        name: 'VIP Sales Lounge',
        code: 'SLS-01',
        icon: '💎',
        gx: 8,
        gy: 15,
        w: 5.5,
        d: 5.5,
        color: '#a855f7',
        bgColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: 'rgba(168, 85, 247, 0.6)',
        desc: 'CloserOps · Mesas VIP, Patrocinios & CRM',
        desks: [
            { id: 'desk-closerops', x: 10.75, y: 17.75, agentId: 'agent-closerops', toolIcon: '💎' }
        ]
    },
    {
        id: 'room-community',
        name: 'Centro de Difusión',
        code: 'DIF-01',
        icon: '⚡',
        gx: 15,
        gy: 15,
        w: 5.5,
        d: 5.5,
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgba(34, 197, 94, 0.6)',
        desc: 'Pulse · WhatsApp, IG Broadcast, TikTok & DMs',
        desks: [
            { id: 'desk-pulse', x: 17.75, y: 17.75, agentId: 'agent-pulse', toolIcon: '📱' }
        ]
    }
];

export default function OfficeIsometricCanvas({
    agents = [],
    activeTasks = [],
    onSelectAgent,
    onSelectRoom,
    filterDepartment = 'all',
    isWarMode = false
}) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredRoom, setHoveredRoom] = useState(null);
    const [hoveredAgent, setHoveredAgent] = useState(null);
    const [isMuted, setIsMuted] = useState(isOfficeAudioMuted());
    const touchStartDist = useRef(null);

    // Coordinate Math: Isometric projection centered at (800, 150)
    const X0 = 800;
    const Y0 = 150;
    const STEP_X = 36;
    const STEP_Y = 18;

    const toIso = (gx, gy, gz = 0) => {
        const x = X0 + (gx - gy) * STEP_X;
        const y = Y0 + (gx + gy) * STEP_Y - gz;
        return { x, y };
    };

    // Agent map for quick lookup
    const agentMap = useMemo(() => {
        const m = {};
        agents.forEach(a => {
            m[a.id] = a;
            const firstName = a.name.split(' ')[0].toLowerCase();
            m[firstName] = a;
        });
        return m;
    }, [agents]);

    // Mouse Pan handlers
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
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
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom(prev => Math.min(Math.max(0.5, prev + delta), 1.8));
    };

    // Touch handlers for Mobile / Tablet (Drag + Pinch-to-zoom)
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
        } else if (e.touches.length === 2) {
            setIsDragging(false);
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            touchStartDist.current = dist;
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 1 && isDragging) {
            setPan({
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            });
        } else if (e.touches.length === 2 && touchStartDist.current) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = currentDist / touchStartDist.current;
            setZoom(prev => Math.min(Math.max(0.5, prev * factor), 1.8));
            touchStartDist.current = currentDist;
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        touchStartDist.current = null;
    };

    // Camera Presets
    const focusOn = (gx, gy, targetZoom = 1.3) => {
        playOfficeClick();
        const targetIso = toIso(gx, gy);
        const offsetX = (800 - targetIso.x) * targetZoom;
        const offsetY = (550 - targetIso.y) * targetZoom;
        setZoom(targetZoom);
        setPan({ x: offsetX, y: offsetY });
    };

    const resetView = () => {
        playOfficeClick();
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const toggleAudio = () => {
        const next = !isMuted;
        setIsMuted(next);
        setOfficeAudioMuted(next);
        if (!next) playOfficeClick();
    };

    // Status styling helper
    const getStatusInfo = (status) => {
        switch (status) {
            case 'executing':
                return { color: '#3b82f6', label: 'Ejecutando', glow: 'rgba(59, 130, 246, 0.8)' };
            case 'planning':
                return { color: '#8b5cf6', label: 'Planificando', glow: 'rgba(139, 92, 246, 0.8)' };
            case 'waiting_approval':
                return { color: '#f59e0b', label: 'Requiere Aprobación', glow: 'rgba(245, 158, 11, 0.9)' };
            case 'in_meeting':
                return { color: '#c084fc', label: 'En War Room', glow: 'rgba(192, 132, 252, 0.8)' };
            case 'blocked':
                return { color: '#ef4444', label: 'Bloqueado', glow: 'rgba(239, 68, 68, 0.9)' };
            case 'resting':
                return { color: '#6366f1', label: 'En Reposo', glow: 'rgba(99, 102, 241, 0.4)' };
            case 'offline':
                return { color: '#64748b', label: 'Desconectado', glow: 'transparent' };
            case 'available':
            default:
                return { color: '#10b981', label: 'Disponible', glow: 'rgba(16, 185, 129, 0.6)' };
        }
    };

    return (
        <div
            className={`office-viewport-card ${isWarMode ? 'war-mode-active' : ''}`}
            style={{
                boxShadow: isWarMode ? '0 16px 40px rgba(239, 68, 68, 0.25), inset 0 0 20px rgba(239, 68, 68, 0.15)' : undefined,
                borderColor: isWarMode ? 'rgba(239, 68, 68, 0.4)' : undefined
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* AMBIENT BACKGROUND GRID */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: isWarMode
                        ? 'radial-gradient(rgba(239, 68, 68, 0.15) 1px, transparent 1px)'
                        : 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    opacity: 0.4,
                    pointerEvents: 'none'
                }}
            />

            {/* TRANSFORMED SVG CANVAS */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '50% 50%',
                    transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                <svg
                    viewBox="0 0 1600 1100"
                    className="office-canvas-svg"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                >
                    <defs>
                        {/* Floor tile pattern */}
                        <pattern id="officeFloorGrid" width="18" height="18" patternUnits="userSpaceOnUse">
                            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.8" />
                        </pattern>

                        {/* Radial room ambient glow */}
                        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={isWarMode ? '#ef4444' : '#8b5cf6'} stopOpacity={isWarMode ? 0.35 : 0.25} />
                            <stop offset="100%" stopColor={isWarMode ? '#ef4444' : '#8b5cf6'} stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* Central Atmosphere Glow behind War Room */}
                    <circle cx="800" cy="560" r="320" fill="url(#centerGlow)" />

                    {/* 1. RENDER ROOM FLOORS & GLASS PARTITION WALLS */}
                    {OFFICE_CAMPUS_ROOMS.map(room => {
                        const isFiltered = filterDepartment !== 'all' && !room.id.includes(filterDepartment.replace('dept-', ''));
                        const isHovered = hoveredRoom?.id === room.id;

                        const pTop = toIso(room.gx, room.gy);
                        const pRight = toIso(room.gx + room.w, room.gy);
                        const pBottom = toIso(room.gx + room.w, room.gy + room.d);
                        const pLeft = toIso(room.gx, room.gy + room.d);
                        const pointsStr = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

                        // Wall height
                        const wallH = 34;
                        const wTop = toIso(room.gx, room.gy, wallH);
                        const wRight = toIso(room.gx + room.w, room.gy, wallH);
                        const wLeft = toIso(room.gx, room.gy + room.d, wallH);

                        const centerIso = toIso(room.gx + room.w / 2, room.gy + room.d / 2);

                        return (
                            <g
                                key={room.id}
                                style={{
                                    opacity: isFiltered ? 0.2 : 1,
                                    transition: 'all 0.25s ease',
                                    cursor: 'pointer'
                                }}
                                onClick={() => onSelectRoom && onSelectRoom(room)}
                                onMouseEnter={() => setHoveredRoom(room)}
                                onMouseLeave={() => setHoveredRoom(null)}
                            >
                                {/* Base Room Floor */}
                                <polygon
                                    points={pointsStr}
                                    fill={isWarMode && room.id === 'room-meeting' ? 'rgba(239, 68, 68, 0.25)' : room.bgColor}
                                    stroke={isHovered ? '#ffffff' : (isWarMode && room.id === 'room-meeting' ? '#ef4444' : room.borderColor)}
                                    strokeWidth={isHovered ? 2.5 : 1.5}
                                />

                                {/* Floor Grid Overlay */}
                                <polygon
                                    points={pointsStr}
                                    fill="url(#officeFloorGrid)"
                                    opacity={0.6}
                                />

                                {/* Back Left Translucent Glass Wall */}
                                <polygon
                                    points={`${pTop.x},${pTop.y} ${wTop.x},${wTop.y} ${wLeft.x},${wLeft.y} ${pLeft.x},${pLeft.y}`}
                                    fill={room.color}
                                    fillOpacity={isHovered ? 0.25 : 0.12}
                                    stroke={room.color}
                                    strokeWidth={1}
                                    strokeOpacity={0.4}
                                />

                                {/* Back Right Translucent Glass Wall */}
                                <polygon
                                    points={`${pTop.x},${pTop.y} ${wTop.x},${wTop.y} ${wRight.x},${wRight.y} ${pRight.x},${pRight.y}`}
                                    fill={room.color}
                                    fillOpacity={isHovered ? 0.25 : 0.12}
                                    stroke={room.color}
                                    strokeWidth={1}
                                    strokeOpacity={0.4}
                                />

                                {/* Room Header Label in Isometric space */}
                                <g transform={`translate(${centerIso.x}, ${centerIso.y - 48})`}>
                                    <rect
                                        x="-65"
                                        y="-12"
                                        width="130"
                                        height="24"
                                        rx="12"
                                        fill="#0a0e17"
                                        stroke={isWarMode && room.id === 'room-meeting' ? '#ef4444' : room.color}
                                        strokeWidth="1.2"
                                        opacity={0.95}
                                    />
                                    <text
                                        x="0"
                                        y="4"
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        fontSize="10.5"
                                        fontWeight="700"
                                        letterSpacing="0.04em"
                                    >
                                        {room.icon} {room.name.toUpperCase()}
                                    </text>
                                </g>
                            </g>
                        );
                    })}

                    {/* 2. RENDER WORKSTATIONS, DESKS, FURNITURE & AGENT AVATARS */}
                    {OFFICE_CAMPUS_ROOMS.flatMap(room => room.desks || []).map(desk => {
                        const iso = toIso(desk.x, desk.y);
                        const agent = desk.agentId ? agentMap[desk.agentId] : null;
                        const isHovered = hoveredAgent?.id === (agent?.id || desk.id);
                        const statusInfo = agent ? getStatusInfo(agent.status) : null;
                        const activeTask = activeTasks.find(t =>
                            t.assignedAgentId === agent?.id ||
                            (agent?.name && t.assignedAgent?.toLowerCase().includes(agent.name.split(' ')[0].toLowerCase()))
                        );

                        return (
                            <g
                                key={desk.id}
                                transform={`translate(${iso.x}, ${iso.y})`}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (agent) onSelectAgent(agent);
                                }}
                                onMouseEnter={() => setHoveredAgent(agent || desk)}
                                onMouseLeave={() => setHoveredAgent(null)}
                            >
                                {/* A. DESK STRUCTURE */}
                                {desk.isTable ? (
                                    /* Conference War Room Glass Table */
                                    <g transform="translate(0, 0)">
                                        <ellipse cx="0" cy="8" rx="60" ry="30" fill="rgba(0, 0, 0, 0.4)" />
                                        <polygon
                                            points="-50,0 0,-25 50,0 0,25"
                                            fill={isWarMode ? '#450a0a' : '#1e1b4b'}
                                            stroke={isWarMode ? '#ef4444' : '#8b5cf6'}
                                            strokeWidth="2"
                                        />
                                        <ellipse cx="0" cy="0" rx="35" ry="17" fill={isWarMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.25)'} />
                                        <text y="4" textAnchor="middle" fill={isWarMode ? '#fca5a5' : '#c084fc'} fontSize="10" fontWeight="bold">WAR ROOM</text>
                                    </g>
                                ) : (
                                    /* Standard Office Workstation */
                                    <g transform="translate(0, 10)">
                                        {/* Drop shadow */}
                                        <ellipse cx="0" cy="6" rx="32" ry="16" fill="rgba(0, 0, 0, 0.45)" />

                                        {/* Table Top Surface */}
                                        <polygon
                                            points="-28,0 0,-14 28,0 0,14"
                                            fill="#1e293b"
                                            stroke="#334155"
                                            strokeWidth="1.5"
                                        />
                                        {/* Desk Leg / Side Facets */}
                                        <polygon points="-28,0 0,14 0,22 -28,8" fill="#0f172a" />
                                        <polygon points="0,14 28,0 28,8 0,22" fill="#1e293b" />

                                        {/* Glowing Monitor Surface */}
                                        <polygon
                                            points="-12,-4 0,-10 12,-4 0,2"
                                            fill={agent?.status === 'executing' ? '#38bdf8' : statusInfo?.color || '#64748b'}
                                            fillOpacity={0.85}
                                        />
                                    </g>
                                )}

                                {/* B. CHARACTER / AGENT AVATAR */}
                                {agent ? (
                                    <g transform="translate(0, -22)">
                                        {/* Glowing Status Ring */}
                                        <circle
                                            cx="0"
                                            cy="0"
                                            r="24"
                                            fill="rgba(15, 23, 42, 0.9)"
                                            stroke={statusInfo?.color || '#3b82f6'}
                                            strokeWidth={isHovered ? 3.5 : 2.5}
                                            style={{
                                                filter: `drop-shadow(0 0 8px ${statusInfo?.glow || '#3b82f6'})`
                                            }}
                                        />

                                        {/* Emoji Avatar */}
                                        <text
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fontSize="20"
                                            style={{ userSelect: 'none' }}
                                        >
                                            {agent.avatar || '🤖'}
                                        </text>

                                        {/* Floating Comic Speech Bubble if Executing or Planning */}
                                        {(agent.status === 'executing' || agent.status === 'planning') && (
                                            <g className="office-speech-bubble" transform="translate(20, -26)">
                                                <rect x="-14" y="-12" width="28" height="22" rx="6" fill="#0d121d" stroke="#38bdf8" strokeWidth="1.2" />
                                                <polygon points="-4,10 0,14 4,10" fill="#0d121d" />
                                                <text x="0" y="3" textAnchor="middle" fontSize="11">
                                                    {desk.toolIcon || (agent.status === 'executing' ? '⚡' : '🧠')}
                                                </text>
                                            </g>
                                        )}

                                        {/* Name Tag Pill */}
                                        <g transform="translate(0, -32)">
                                            <rect
                                                x="-44"
                                                y="-10"
                                                width="88"
                                                height="20"
                                                rx="10"
                                                fill="#070a12"
                                                stroke={statusInfo?.color || '#3b82f6'}
                                                strokeWidth="1.2"
                                            />
                                            {/* Status Dot */}
                                            <circle cx="-34" cy="0" r="3.5" fill={statusInfo?.color || '#10b981'} />
                                            <text
                                                x="-26"
                                                y="4"
                                                fill="#f8fafc"
                                                fontSize="9.5"
                                                fontWeight="700"
                                                letterSpacing="0.02em"
                                            >
                                                {agent.name.split(' ')[0]}
                                            </text>
                                        </g>

                                        {/* Live Progress Bar if Executing */}
                                        {agent.status === 'executing' && (
                                            <g transform="translate(-30, 32)">
                                                <rect x="0" y="0" width="60" height="5" rx="2.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
                                                <rect
                                                    x="0"
                                                    y="0"
                                                    width={activeTask ? `${Math.max(15, activeTask.progress || 45) * 0.6}` : '36'}
                                                    height="5"
                                                    rx="2.5"
                                                    fill="#38bdf8"
                                                />
                                            </g>
                                        )}
                                    </g>
                                ) : desk.isUser ? (
                                    /* User / CEO Station */
                                    <g transform="translate(0, -22)">
                                        <circle
                                            cx="0"
                                            cy="0"
                                            r="24"
                                            fill="#1e1b4b"
                                            stroke="#f59e0b"
                                            strokeWidth="3"
                                            style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))' }}
                                        />
                                        <text textAnchor="middle" dominantBaseline="central" fontSize="22">👑</text>
                                        <g transform="translate(0, -32)">
                                            <rect x="-42" y="-10" width="84" height="20" rx="10" fill="#070a12" stroke="#f59e0b" strokeWidth="1.2" />
                                            <text x="0" y="4" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontWeight="800">
                                                CEO (GG)
                                            </text>
                                        </g>
                                    </g>
                                ) : !desk.isTable ? (
                                    /* Secondary Workstation */
                                    <g transform="translate(0, -14)">
                                        <circle cx="0" cy="0" r="15" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                                        <text textAnchor="middle" dominantBaseline="central" fontSize="14">{desk.avatar || '🖥️'}</text>
                                        <text y="-20" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">{desk.label}</text>
                                    </g>
                                ) : null}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* TOP LEFT HUD: STATUS CHIP & CAMERA PRESETS */}
            <div className="office-hud-top-left" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="office-pulse-dot" style={{ backgroundColor: isWarMode ? '#ef4444' : '#10b981', boxShadow: isWarMode ? '0 0 10px #ef4444' : undefined }} />
                    <span className="office-hud-title">AI OFFICE HQ</span>
                </div>

                {isWarMode && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#fca5a5',
                        letterSpacing: '0.04em'
                    }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                        WAR MODE
                    </div>
                )}

                {/* Quick Camera Presets Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '8px' }}>
                    <button
                        onClick={() => focusOn(3.75, 3.75, 1.4)}
                        title="Enfocar Despacho CEO"
                        className="office-preset-btn"
                    >
                        👑 CEO
                    </button>
                    <button
                        onClick={() => focusOn(10.75, 3.75, 1.4)}
                        title="Enfocar Executive BART"
                        className="office-preset-btn"
                    >
                        👔 BART
                    </button>
                    <button
                        onClick={() => focusOn(10.75, 10.75, 1.3)}
                        title="Enfocar War Room"
                        className="office-preset-btn"
                    >
                        🤝 War Room
                    </button>
                    <button
                        onClick={() => focusOn(17.5, 3.75, 1.4)}
                        title="Enfocar Creative Studio"
                        className="office-preset-btn"
                    >
                        🎬 Creative
                    </button>
                    <button
                        onClick={() => focusOn(3.75, 17.75, 1.4)}
                        title="Enfocar Operations & Venues"
                        className="office-preset-btn"
                    >
                        📦 Venues
                    </button>
                    <button
                        onClick={() => focusOn(17.75, 17.75, 1.4)}
                        title="Enfocar Centro de Difusión"
                        className="office-preset-btn"
                    >
                        ⚡ Difusión
                    </button>
                    <button
                        onClick={resetView}
                        title="Ver Todo el Campus"
                        className="office-preset-btn"
                        style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', fontWeight: 'bold' }}
                    >
                        🗺️ Ver Todo
                    </button>
                </div>
            </div>

            {/* TOP RIGHT HUD: AUDIO TOGGLE, ZOOM & CONTROLS */}
            <div className="office-hud-top-right">
                <button
                    onClick={toggleAudio}
                    title={isMuted ? 'Activar Sonido' : 'Silenciar'}
                    className="office-hud-btn"
                    style={{ color: isMuted ? '#64748b' : '#38bdf8' }}
                >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                    onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
                    title="Acercar (Zoom In)"
                    className="office-hud-btn"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
                    title="Alejar (Zoom Out)"
                    className="office-hud-btn"
                >
                    <ZoomOut size={16} />
                </button>
                <button
                    onClick={resetView}
                    title="Restablecer Vista"
                    className="office-hud-btn"
                >
                    <RotateCcw size={16} />
                </button>
                <span className="office-hud-zoom-label">
                    {Math.round(zoom * 100)}%
                </span>
            </div>

            {/* BOTTOM LEFT: HOVER AGENT INSPECTOR */}
            {hoveredAgent && (
                <div className="office-agent-popup">
                    <div className="office-agent-popup-head">
                        <div className="office-agent-avatar-sq">
                            {hoveredAgent.avatar || '🤖'}
                        </div>
                        <div className="office-agent-popup-info">
                            <h4 className="office-agent-popup-name">
                                {hoveredAgent.name || hoveredAgent.label}
                            </h4>
                            <p className="office-agent-popup-role">
                                {hoveredAgent.role || 'Estación de Dirección & Estrategia'}
                            </p>
                        </div>
                    </div>

                    {hoveredAgent.currentTaskName && (
                        <div className="office-agent-popup-task">
                            <span className="task-lbl">Tarea en Curso:</span>
                            <p className="task-txt">{hoveredAgent.currentTaskName}</p>
                        </div>
                    )}

                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                        <span>Click para abrir despacho ➔</span>
                        <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
                            {hoveredAgent.model || 'gemini-2.5-flash'}
                        </span>
                    </div>
                </div>
            )}

            {/* BOTTOM RIGHT: LIVE MINIMAP */}
            <div className="office-minimap-box">
                <div className="office-minimap-header">
                    <span>MINIMAP</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{agents.length} AGENTES</span>
                </div>
                <div className="office-minimap-grid">
                    <div className="office-minimap-camera" />
                </div>
            </div>
        </div>
    );
}
