import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, XCircle, X, DollarSign, Clock } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0B0F17] border border-white/15 w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* HEADER */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Bandeja de Gobernanza & Aprobaciones</h2>
                            <p className="text-xs text-gray-400">Acciones críticas o con impacto económico que requieren tu autorización directa.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl transition">
                        <X size={18} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {pendingList.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <CheckCircle2 size={44} className="mx-auto mb-3 text-emerald-400 opacity-60" />
                            <h3 className="text-sm font-semibold text-white">No hay aprobaciones pendientes</h3>
                            <p className="text-xs text-gray-500 mt-1">Todas las operaciones de los agentes están al día y autorizadas.</p>
                        </div>
                    ) : (
                        pendingList.map(appr => (
                            <div key={appr.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                NIVEL {appr.autonomyRequired || 3}
                                            </span>
                                            <span className="text-xs text-gray-300 font-semibold">{appr.agentName || 'Agente'}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-white mt-1.5">{appr.actionRequested}</h4>
                                    </div>

                                    {appr.impactEstimate > 0 && (
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] text-gray-400 block uppercase">Impacto Est.</span>
                                            <span className="text-sm font-bold text-emerald-400">${appr.impactEstimate} USD</span>
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    placeholder="Notas de aprobación o condiciones..."
                                    value={notes[appr.id] || ''}
                                    onChange={(e) => setNotes({ ...notes, [appr.id]: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => handleDecision(appr.id, 'rejected')}
                                        className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                                    >
                                        <XCircle size={14} />
                                        <span>Rechazar</span>
                                    </button>
                                    <button
                                        onClick={() => handleDecision(appr.id, 'approved')}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
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
