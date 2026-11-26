import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, X } from 'lucide-react';
import './AiOffice.css';

export default function OfficeApprovalsModal({
    approvals = [],
    onClose,
    onDecision
}) {
    const [notes, setNotes] = useState({});

    const handleDecision = (id, decision) => {
        if (onDecision) {
            onDecision(id, decision, notes[id] || '');
        }
    };

    const pendingList = approvals.filter(a => a.status === 'pending');

    return (
        <div className="office-modal-backdrop" onClick={onClose}>
            <div className="office-modal-frame" style={{ maxWidth: '640px', height: 'auto', maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
                {/* HEADER */}
                <div className="office-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fbbf24'
                        }}>
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                                Bandeja de Gobernanza & Aprobaciones
                            </h2>
                            <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                                Acciones críticas que requieren tu autorización directa como CEO.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* BODY */}
                <div className="office-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {pendingList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                            <CheckCircle2 size={40} style={{ color: '#34d399', margin: '0 auto 10px auto', opacity: 0.7 }} />
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: 0 }}>No hay aprobaciones pendientes</h3>
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Todas las operaciones de los agentes están al día y autorizadas.</p>
                        </div>
                    ) : (
                        pendingList.map(appr => (
                            <div key={appr.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                                                NIVEL {appr.autonomyRequired || 3}
                                            </span>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>{appr.agentName || 'Agente'}</span>
                                        </div>
                                        <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#ffffff', margin: '6px 0 0 0' }}>{appr.actionRequested}</h4>
                                    </div>

                                    {appr.impactEstimate > 0 && (
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8' }}>Impacto</span>
                                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>${appr.impactEstimate} USD</div>
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    placeholder="Notas de aprobación o condiciones..."
                                    value={notes[appr.id] || ''}
                                    onChange={(e) => setNotes({ ...notes, [appr.id]: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '10px',
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        color: '#ffffff',
                                        outline: 'none'
                                    }}
                                />

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <button
                                        onClick={() => handleDecision(appr.id, 'rejected')}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#f87171',
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <XCircle size={14} />
                                        <span>Rechazar</span>
                                    </button>
                                    <button
                                        onClick={() => handleDecision(appr.id, 'approved')}
                                        style={{
                                            background: '#059669',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '6px 16px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Aprobar y Ejecutar</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
