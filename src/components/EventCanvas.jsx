import { useState, useRef, useCallback, useEffect } from 'react';
import {
    Plus, Trash2, Type, StickyNote, Circle, Square,
    ZoomIn, ZoomOut, Maximize2, MousePointer, Hand,
    Palette, Link2, Undo2
} from 'lucide-react';

const STICKY_COLORS = [
    { name: 'Yellow', bg: 'linear-gradient(135deg, #fef08a, #fde047)', text: '#713f12', border: '#eab308' },
    { name: 'Pink', bg: 'linear-gradient(135deg, #fda4af, #f43f5e)', text: '#881337', border: '#e11d48' },
    { name: 'Green', bg: 'linear-gradient(135deg, #86efac, #22c55e)', text: '#14532d', border: '#16a34a' },
    { name: 'Blue', bg: 'linear-gradient(135deg, #93c5fd, #3b82f6)', text: '#1e3a5f', border: '#2563eb' },
    { name: 'Purple', bg: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', text: '#3b0764', border: '#7c3aed' },
    { name: 'Orange', bg: 'linear-gradient(135deg, #fed7aa, #f97316)', text: '#7c2d12', border: '#ea580c' },
];

const INITIAL_NODES = [
    { id: 'n1', type: 'sticky', x: 80, y: 80, w: 200, h: 160, text: '🎯 Q1 Goals\n\n• Close 2 SaaS demos\n• Launch Konekta\n• Ship RecordAI MVP', colorIdx: 0 },
    { id: 'n2', type: 'sticky', x: 340, y: 80, w: 200, h: 160, text: '🔥 War Mode\n\nFocus only on cashflow-generating tasks. No distractions.', colorIdx: 1 },
    { id: 'n3', type: 'sticky', x: 600, y: 80, w: 200, h: 160, text: '💰 Revenue Targets\n\n• SaaS: $5k MRR\n• Konekta: $3k retainers', colorIdx: 2 },
    { id: 'n4', type: 'sticky', x: 80, y: 300, w: 200, h: 140, text: '🤖 Agent Strategy\n\nBart → Strategy\nAntigravity → UI\nDataMiner → Scraping', colorIdx: 3 },
    { id: 'n6', type: 'sticky', x: 600, y: 300, w: 200, h: 140, text: '🚀 Next Actions\n\n1. 50 cold emails\n2. Demo SaaS product', colorIdx: 5 },
    { id: 'n7', type: 'text', x: 80, y: 30, w: 720, h: 40, text: 'COMMAND CENTER — STRATEGIC BOARD', colorIdx: 0 },
];

const INITIAL_CONNECTIONS = [
    { id: 'c1', from: 'n1', to: 'n2' },
    { id: 'c2', from: 'n2', to: 'n3' },
    { id: 'c3', from: 'n4', to: 'n6' },
];

export default function EventCanvas({
    initialNodes = INITIAL_NODES,
    initialConnections = INITIAL_CONNECTIONS,
    onSave = null,
    onCancel = null
}) {
    const canvasRef = useRef(null);

    // Load from localStorage, falling back to initial data
    const [nodes, setNodes] = useState(() => {
        try {
            const saved = localStorage.getItem('ws_canvas_nodes');
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return initialNodes;
    });
    const [connections, setConnections] = useState(() => {
        try {
            const saved = localStorage.getItem('ws_canvas_connections');
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return initialConnections;
    });

    const [tool, setTool] = useState('select'); // select | pan | sticky | text
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(null);
    const [panning, setPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [editing, setEditing] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [connecting, setConnecting] = useState(null);
    const [colorPicker, setColorPicker] = useState(null);
    const [resizing, setResizing] = useState(null);

    // Touch support state
    const [pinchStartDist, setPinchStartDist] = useState(null);
    const [pinchStartZoom, setPinchStartZoom] = useState(1);

    // Auto-save to localStorage (debounced)
    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem('ws_canvas_nodes', JSON.stringify(nodes));
                localStorage.setItem('ws_canvas_connections', JSON.stringify(connections));
            } catch (e) {
                console.warn('Canvas save failed:', e);
            }
        }, 500);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [nodes, connections]);

    // Undo history — stores up to 3 snapshots
    const historyRef = useRef([]);
    const [undoCount, setUndoCount] = useState(0);

    const saveSnapshot = () => {
        historyRef.current = [
            { nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) },
            ...historyRef.current
        ].slice(0, 3);
        setUndoCount(historyRef.current.length);
    };

    const undo = () => {
        if (historyRef.current.length === 0) return;
        const snapshot = historyRef.current.shift();
        setNodes(snapshot.nodes);
        setConnections(snapshot.connections);
        setUndoCount(historyRef.current.length);
        setSelectedNode(null);
        setEditing(null);
        setColorPicker(null);
    };

    // Pan with middle mouse or when pan tool is active
    const handleCanvasMouseDown = (e) => {
        if (e.target !== canvasRef.current && e.target.closest('.canvas-node')) return;

        setSelectedNode(null);
        setEditing(null);
        setColorPicker(null);

        if (tool === 'pan' || e.button === 1) {
            setPanning(true);
            setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            e.preventDefault();
            return;
        }

        // Create new sticky/text on canvas click
        if (tool === 'sticky' || tool === 'text') {
            saveSnapshot();
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - offset.x) / zoom;
            const y = (e.clientY - rect.top - offset.y) / zoom;
            const newNode = {
                id: `n-${Date.now()}`,
                type: tool,
                x, y,
                w: tool === 'sticky' ? 200 : 300,
                h: tool === 'sticky' ? 160 : 40,
                text: tool === 'sticky' ? 'New note...' : 'Title text',
                colorIdx: tool === 'sticky' ? Math.floor(Math.random() * STICKY_COLORS.length) : 0,
            };
            setNodes(prev => [...prev, newNode]);
            setEditing(newNode.id);
            setTool('select');
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (panning) {
            setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
            return;
        }
        if (dragging) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - offset.x) / zoom - dragging.dx;
            const y = (e.clientY - rect.top - offset.y) / zoom - dragging.dy;
            setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x, y } : n));
        }
        if (resizing) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - offset.x) / zoom;
            const y = (e.clientY - rect.top - offset.y) / zoom;
            setNodes(prev => prev.map(n => {
                if (n.id !== resizing.id) return n;
                return {
                    ...n,
                    w: Math.max(120, x - n.x),
                    h: Math.max(60, y - n.y),
                };
            }));
        }
    };

    const handleCanvasMouseUp = () => {
        setPanning(false);
        setDragging(null);
        setResizing(null);
    };

    // Touch Events
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            setPinchStartDist(dist);
            setPinchStartZoom(zoom);
        } else if (e.touches.length === 1) {
            if (e.target !== canvasRef.current && e.target.closest('.canvas-node')) return;
            
            setSelectedNode(null);
            setEditing(null);
            setColorPicker(null);

            // On mobile, always default to pan if not dragging a node
            setPanning(true);
            setPanStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && pinchStartDist) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const scale = dist / pinchStartDist;
            setZoom(Math.min(3, Math.max(0.2, pinchStartZoom * scale)));
        } else if (e.touches.length === 1) {
            if (dragging) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = (e.touches[0].clientX - rect.left - offset.x) / zoom - dragging.dx;
                const y = (e.touches[0].clientY - rect.top - offset.y) / zoom - dragging.dy;
                setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x, y } : n));
            } else if (panning) {
                setOffset({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
            }
        }
    };

    const handleTouchEnd = (e) => {
        if (e.touches.length < 2) {
            setPinchStartDist(null);
        }
        if (e.touches.length === 0) {
            setPanning(false);
            setDragging(null);
            setResizing(null);
        }
    };

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(prev => Math.min(3, Math.max(0.2, prev + delta)));
    }, []);

    useEffect(() => {
        const el = canvasRef.current;
        if (el) el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el?.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const deleteNode = (id) => {
        saveSnapshot();
        setNodes(prev => prev.filter(n => n.id !== id));
        setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
        setSelectedNode(null);
    };

    const startNodeDrag = (e, node) => {
        if (editing === node.id) return;

        if (connecting) {
            if (connecting !== node.id) {
                saveSnapshot();
                setConnections(prev => [...prev, { id: `c-${Date.now()}`, from: connecting, to: node.id }]);
            }
            setConnecting(null);
            return;
        }

        e.stopPropagation();
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offset.x) / zoom;
        const mouseY = (e.clientY - rect.top - offset.y) / zoom;
        setDragging({ id: node.id, dx: mouseX - node.x, dy: mouseY - node.y });
        setSelectedNode(node.id);
    };

    const startNodeTouch = (e, node) => {
        if (e.touches.length !== 1) return;
        if (editing === node.id) return;

        if (connecting) {
            if (connecting !== node.id) {
                saveSnapshot();
                setConnections(prev => [...prev, { id: `c-${Date.now()}`, from: connecting, to: node.id }]);
            }
            setConnecting(null);
            return;
        }

        e.stopPropagation();
        const rect = canvasRef.current.getBoundingClientRect();
        const touchX = (e.touches[0].clientX - rect.left - offset.x) / zoom;
        const touchY = (e.touches[0].clientY - rect.top - offset.y) / zoom;
        setDragging({ id: node.id, dx: touchX - node.x, dy: touchY - node.y });
        setSelectedNode(node.id);
    };

    const getNodeCenter = (node) => ({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
    });

    const resetView = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    const toolbarBtnStyle = (active) => ({
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
        background: active ? 'var(--accent-primary)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-secondary)',
        transition: 'all 0.15s ease',
    });

    // Touch handlers for CSS classes
    useEffect(() => {
        // Prevent default scrolling only when interacting with the canvas
        const preventScroll = (e) => {
            if (e.target.closest('.project-canvas-container')) {
                // Allows pinch-zoom to not trigger browser zoom or swipe refresh
                if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                }
            }
        };
        document.addEventListener('touchmove', preventScroll, { passive: false });
        return () => document.removeEventListener('touchmove', preventScroll);
    }, []);

    return (
        <div className="card animate-in project-canvas-container" style={{ marginTop: '24px', marginBottom: '24px', padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)', gap: '8px', flexWrap: 'wrap',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginRight: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                        ✨ Strategic Canvas
                    </div>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 8px' }} />

                    <button style={toolbarBtnStyle(tool === 'select')} onClick={() => setTool('select')} title="Select">
                        <MousePointer size={16} />
                    </button>
                    <button style={toolbarBtnStyle(tool === 'pan')} onClick={() => setTool('pan')} title="Pan">
                        <Hand size={16} />
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                    <button style={toolbarBtnStyle(tool === 'sticky')} onClick={() => setTool('sticky')} title="Add Sticky Note">
                        <StickyNote size={16} />
                    </button>
                    <button style={toolbarBtnStyle(tool === 'text')} onClick={() => setTool('text')} title="Add Text">
                        <Type size={16} />
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                    <button
                        style={toolbarBtnStyle(connecting !== null)}
                        onClick={() => {
                            if (connecting) { setConnecting(null); }
                            else if (selectedNode) { setConnecting(selectedNode); }
                        }}
                        title="Connect nodes (select a node first)"
                    >
                        <Link2 size={16} />
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                    <button
                        style={{ ...toolbarBtnStyle(false), opacity: undoCount === 0 ? 0.35 : 1, position: 'relative' }}
                        onClick={undo}
                        disabled={undoCount === 0}
                        title={`Undo (${undoCount}/3 remaining)`}
                    >
                        <Undo2 size={16} />
                        {undoCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: 'var(--accent-primary)', color: '#fff',
                                fontSize: '10px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {undoCount}
                            </span>
                        )}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button style={toolbarBtnStyle(false)} onClick={() => setZoom(prev => Math.min(3, prev + 0.15))} title="Zoom In">
                        <ZoomIn size={16} />
                    </button>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', minWidth: '40px', textAlign: 'center', fontWeight: 600 }}>
                        {Math.round(zoom * 100)}%
                    </span>
                    <button style={toolbarBtnStyle(false)} onClick={() => setZoom(prev => Math.max(0.2, prev - 0.15))} title="Zoom Out">
                        <ZoomOut size={16} />
                    </button>
                    <button style={toolbarBtnStyle(false)} onClick={resetView} title="Reset View">
                        <Maximize2 size={16} />
                    </button>
                    {onSave && (
                        <>
                            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 8px' }} />
                            <button
                                className="btn btn-ghost"
                                onClick={() => onCancel && onCancel()}
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => onSave(nodes, connections)}
                                style={{ padding: '6px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                Save Canvas
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{
                    width: '100%',
                    height: '550px',
                    position: 'relative',
                    overflow: 'hidden',
                    touchAction: 'none', // Prevents default pull-to-refresh and pan, relying on our events safely
                    cursor: tool === 'pan' ? 'grab' : tool === 'sticky' || tool === 'text' ? 'crosshair' : connecting ? 'cell' : 'default',
                    background: `
                        radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)
                    `,
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                }}
            >
                {/* SVG layer for connections */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    {connections.map(conn => {
                        const fromNode = nodes.find(n => n.id === conn.from);
                        const toNode = nodes.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;
                        const from = getNodeCenter(fromNode);
                        const to = getNodeCenter(toNode);
                        const fx = from.x * zoom + offset.x;
                        const fy = from.y * zoom + offset.y;
                        const tx = to.x * zoom + offset.x;
                        const ty = to.y * zoom + offset.y;
                        const mx = (fx + tx) / 2;

                        return (
                            <g key={conn.id}>
                                <path
                                    d={`M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`}
                                    fill="none"
                                    stroke="var(--accent-primary)"
                                    strokeWidth="2"
                                    strokeDasharray="6 4"
                                    opacity="0.6"
                                />
                                <circle cx={tx} cy={ty} r="4" fill="var(--accent-primary)" opacity="0.8" />
                            </g>
                        );
                    })}
                </svg>

                {/* Nodes */}
                {nodes.map(node => {
                    const stickyColor = STICKY_COLORS[node.colorIdx] || STICKY_COLORS[0];
                    const isSelected = selectedNode === node.id;
                    const isEditing = editing === node.id;

                    return (
                        <div
                            key={node.id}
                            className="canvas-node"
                            onMouseDown={(e) => startNodeDrag(e, node)}
                            onTouchStart={(e) => startNodeTouch(e, node)}

                            onDoubleClick={(e) => { e.stopPropagation(); setEditing(node.id); setSelectedNode(node.id); }}
                            style={{
                                position: 'absolute',
                                left: `${node.x * zoom + offset.x}px`,
                                top: `${node.y * zoom + offset.y}px`,
                                width: `${node.w * zoom}px`,
                                minHeight: node.type === 'text' ? 'auto' : `${node.h * zoom}px`,
                                zIndex: isSelected ? 100 : 10,
                                transform: `scale(1)`,
                                transition: dragging?.id === node.id ? 'none' : 'box-shadow 0.15s ease',
                                cursor: dragging?.id === node.id ? 'grabbing' : 'grab',
                                userSelect: isEditing ? 'text' : 'none',

                                ...(node.type === 'sticky' ? {
                                    background: stickyColor.bg,
                                    borderRadius: `${8 * zoom}px`,
                                    padding: `${16 * zoom}px`,
                                    boxShadow: isSelected
                                        ? `0 0 0 3px var(--accent-primary), 0 12px 32px rgba(0,0,0,0.4)`
                                        : `0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)`,
                                    border: `1px solid ${stickyColor.border}`,
                                } : {
                                    background: 'transparent',
                                    padding: `${4 * zoom}px`,
                                    border: isSelected ? '1px dashed var(--accent-primary)' : '1px dashed transparent',
                                }),
                            }}
                        >
                            {/* Node content */}
                            {isEditing ? (
                                <textarea
                                    autoFocus
                                    value={node.text}
                                    onChange={(e) => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, text: e.target.value } : n))}
                                    onBlur={() => setEditing(null)}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: node.type === 'sticky' ? `${(node.h - 24) * zoom}px` : 'auto',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        resize: 'none',
                                        fontFamily: node.type === 'text' ? "'Inter', sans-serif" : "'Inter', sans-serif",
                                        fontSize: node.type === 'text' ? `${18 * zoom}px` : `${13 * zoom}px`,
                                        fontWeight: node.type === 'text' ? '700' : '500',
                                        color: node.type === 'sticky' ? stickyColor.text : 'var(--text-primary)',
                                        lineHeight: '1.5',
                                        letterSpacing: node.type === 'text' ? '1px' : '0',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: node.type === 'text' ? `${18 * zoom}px` : `${13 * zoom}px`,
                                    fontWeight: node.type === 'text' ? '700' : '500',
                                    color: node.type === 'sticky' ? stickyColor.text : 'var(--text-primary)',
                                    lineHeight: '1.6',
                                    letterSpacing: node.type === 'text' ? '1px' : '0',
                                    textTransform: node.type === 'text' ? 'uppercase' : 'none',
                                    textShadow: node.type === 'sticky' ? '0 1px 0 rgba(255,255,255,0.3)' : 'none'
                                }}>
                                    {node.text}
                                </div>
                            )}

                            {/* Node actions (visible on selection) */}
                            {isSelected && !isEditing && (
                                <div style={{
                                    position: 'absolute', top: `${-36 * zoom}px`, left: '50%', transform: 'translateX(-50%)',
                                    display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 200,
                                }}>
                                    <button
                                        style={{ ...toolbarBtnStyle(false), width: '28px', height: '28px' }}
                                        onClick={(e) => { e.stopPropagation(); setColorPicker(colorPicker === node.id ? null : node.id); }}
                                        title="Change Color"
                                    >
                                        <Palette size={14} />
                                    </button>
                                    <button
                                        style={{ ...toolbarBtnStyle(connecting === node.id), width: '28px', height: '28px' }}
                                        onClick={(e) => { e.stopPropagation(); setConnecting(connecting === node.id ? null : node.id); }}
                                        title="Connect to another node"
                                    >
                                        <Link2 size={14} />
                                    </button>
                                    <button
                                        style={{ ...toolbarBtnStyle(false), width: '28px', height: '28px', color: 'var(--accent-red)' }}
                                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Color picker popup */}
                            {colorPicker === node.id && (
                                <div style={{
                                    position: 'absolute', top: `${-70 * zoom}px`, left: '50%', transform: 'translateX(-50%)',
                                    display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 300,
                                }}>
                                    {STICKY_COLORS.map((c, i) => (
                                        <div
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNodes(prev => prev.map(n => n.id === node.id ? { ...n, colorIdx: i } : n));
                                                setColorPicker(null);
                                            }}
                                            style={{
                                                width: '20px', height: '20px', borderRadius: '50%', background: c.bg,
                                                border: node.colorIdx === i ? '2px solid var(--text-primary)' : `2px solid ${c.border}`,
                                                cursor: 'pointer',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Resize handle */}
                            {isSelected && node.type === 'sticky' && (
                                <div
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizing({ id: node.id });
                                    }}
                                    style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: `${12 * zoom}px`, height: `${12 * zoom}px`,
                                        cursor: 'nwse-resize',
                                        background: stickyColor.border,
                                        borderRadius: `0 0 ${4 * zoom}px 0`,
                                        opacity: 0.6,
                                    }}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Connecting indicator */}
                {connecting && (
                    <div style={{
                        position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                        padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff',
                        borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)', zIndex: 500,
                    }}>
                        🔗 Click another node to connect — or click canvas to cancel
                    </div>
                )}
            </div>
        </div>
    );
}
