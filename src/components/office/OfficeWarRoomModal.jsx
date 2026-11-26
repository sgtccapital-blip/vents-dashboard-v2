import React, { useState, useEffect, useRef } from 'react';
import {
    X, Radio, Sparkles, Play, Pause, RotateCcw, CheckCircle2,
    Send, Layers, Film, CheckSquare, MessageSquare, ArrowRight,
    Volume2, VolumeX, Shield, ExternalLink
} from 'lucide-react';
import { playOfficeClick, playOfficeSuccess } from '../../lib/officeAudio';
import './AiOffice.css';

export default function OfficeWarRoomModal({
    isOpen,
    onClose,
    defaultTopic = 'Estrategia de lanzamiento y activación comercial de HangOut Panamá',
    companyName = 'HangOut Panamá',
    onInjectDeliverable
}) {
    if (!isOpen) return null;

    const [topic, setTopic] = useState(defaultTopic);
    const [isRunning, setIsRunning] = useState(false);
    const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
    const [turns, setTurns] = useState([]);
    const [deliverables, setDeliverables] = useState([]);
    const [injectedMap, setInjectedMap] = useState({});
    const [speed, setSpeed] = useState(1); // 1 = normal (2.5s), 2 = fast (1.2s), 0 = instant
    const timerRef = useRef(null);

    // Fetch initial simulated debate from backend
    const startSimulation = async (topicToUse = topic) => {
        setIsRunning(true);
        setCurrentTurnIdx(0);
        setInjectedMap({});

        try {
            const res = await fetch('/api/office/war-room/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topicToUse,
                    companyName
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTurns(data.turns || []);
                setDeliverables(data.deliverables || []);
            }
        } catch (err) {
            console.error('[War Room Sim Error]:', err);
        }
    };

    // Auto-advance turns
    useEffect(() => {
        if (!isRunning || turns.length === 0) return;

        if (speed === 0) {
            // Instant
            setCurrentTurnIdx(turns.length);
            setIsRunning(false);
            playOfficeSuccess();
            return;
        }

        const intervalMs = speed === 2 ? 1200 : 2500;
        timerRef.current = setTimeout(() => {
            if (currentTurnIdx < turns.length - 1) {
                setCurrentTurnIdx(idx => idx + 1);
                playOfficeClick();
            } else {
                setIsRunning(false);
                playOfficeSuccess();
            }
        }, intervalMs);

        return () => clearTimeout(timerRef.current);
    }, [isRunning, currentTurnIdx, turns, speed]);

    // Initial run on mount
    useEffect(() => {
        startSimulation(defaultTopic);
    }, []);

    const handleInject = async (deliv) => {
        try {
            playOfficeClick();
            const res = await fetch('/api/office/deliverable/inject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: deliv.type,
                    title: deliv.title,
                    assignedAgent: deliv.assignedAgent
                })
            });

            if (res.ok) {
                const data = await res.json();
                setInjectedMap(prev => ({ ...prev, [deliv.id]: data.targetModule }));
                playOfficeSuccess();
                if (onInjectDeliverable) onInjectDeliverable(deliv);
            }
        } catch (err) {
            console.error('[Inject Error]:', err);
        }
    };

    const handleInjectAll = async () => {
        for (const deliv of deliverables) {
            if (!injectedMap[deliv.id]) {
                await handleInject(deliv);
            }
        }
    };

    return (
        <div className="office-modal-backdrop" onClick={onClose}>
            <div
                className="office-modal-frame"
                style={{ maxWidth: '920px', height: '88vh', maxHeight: '820px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="office-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#c084fc'
                        }}>
                            <Radio size={22} className={isRunning ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                                    WAR ROOM · SESIÓN MULTIAGENTE
                                </h2>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: isRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                    color: isRunning ? '#f87171' : '#34d399',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    {isRunning ? '🔴 EN VIVO' : '✅ CONCLUIDO'}
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                                Deliberación autónoma coordinada por <strong>BART (COO)</strong> con directores de departamento.
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* CONTROLS BAR */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 24px',
                    background: '#090d16',
                    borderBottom: '1px solid var(--office-border)',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#60a5fa' }}>Tema:</span>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startSimulation(topic)}
                            placeholder="Tema de la sesión..."
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--office-border)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                color: '#ffffff',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => startSimulation(topic)}
                            style={{
                                background: 'rgba(139, 92, 246, 0.2)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                color: '#c084fc',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '11.5px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <RotateCcw size={13} />
                            <span>Re-Simular</span>
                        </button>

                        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '2px', border: '1px solid var(--office-border)' }}>
                            <button
                                onClick={() => setSpeed(1)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: speed === 1 ? '#2563eb' : 'transparent',
                                    color: speed === 1 ? '#ffffff' : '#94a3b8'
                                }}
                            >
                                1x
                            </button>
                            <button
                                onClick={() => setSpeed(2)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: speed === 2 ? '#2563eb' : 'transparent',
                                    color: speed === 2 ? '#ffffff' : '#94a3b8'
                                }}
                            >
                                2x
                            </button>
                            <button
                                onClick={() => setSpeed(0)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: speed === 0 ? '#2563eb' : 'transparent',
                                    color: speed === 0 ? '#ffffff' : '#94a3b8'
                                }}
                            >
                                Rayo
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* 1. DIALOGUE TRANSCRIPT CHAT */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {turns.slice(0, currentTurnIdx + 1).map((turn, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${turn.color}35`,
                                    borderRadius: '16px',
                                    padding: '14px 18px',
                                    animation: 'fadeIn 0.2s ease-out'
                                }}
                            >
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: `${turn.color}20`,
                                    border: `1px solid ${turn.color}50`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    flexShrink: 0
                                }}>
                                    {turn.avatar}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: turn.color }}>
                                            {turn.name}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                                            {turn.time}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12.5px', color: '#e2e8f0', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                                        {turn.message}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isRunning && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', padding: '8px' }}>
                                <Sparkles size={14} className="animate-spin text-purple-400" />
                                <span>Los directores están deliberando en la mesa de juntas...</span>
                            </div>
                        )}
                    </div>

                    {/* 2. ACTIONABLE DELIVERABLES DECK */}
                    {deliverables.length > 0 && currentTurnIdx >= turns.length - 1 && (
                        <div style={{
                            padding: '18px 24px',
                            background: '#090d16',
                            borderTop: '1px solid var(--office-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#ffffff' }}>
                                        Entregables Generados por la Sesión ({deliverables.length})
                                    </span>
                                </div>

                                <button
                                    onClick={handleInjectAll}
                                    style={{
                                        background: 'linear-gradient(135deg, #059669, #0d9488)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '7px 14px',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>📥 Inyectar Todo en Dashboard</span>
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                                {deliverables.map(deliv => {
                                    const isInjected = !!injectedMap[deliv.id];
                                    return (
                                        <div
                                            key={deliv.id}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: isInjected ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid var(--office-border)',
                                                borderRadius: '12px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '10px'
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#60a5fa', fontWeight: '700', display: 'block' }}>
                                                    {deliv.assignedAgent} · {deliv.targetModule}
                                                </span>
                                                <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {deliv.title}
                                                </h4>
                                            </div>

                                            <button
                                                onClick={() => handleInject(deliv)}
                                                disabled={isInjected}
                                                style={{
                                                    background: isInjected ? 'rgba(52, 211, 153, 0.15)' : '#2563eb',
                                                    color: isInjected ? '#34d399' : '#ffffff',
                                                    border: isInjected ? '1px solid rgba(52, 211, 153, 0.3)' : 'none',
                                                    borderRadius: '8px',
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: isInjected ? 'default' : 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {isInjected ? '✓ Inyectado' : 'Inyectar'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
