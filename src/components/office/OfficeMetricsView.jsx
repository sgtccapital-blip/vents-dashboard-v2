import React from 'react';
import { BarChart2, Cpu } from 'lucide-react';
import { PROVIDER_COLOR, AGENT_STATUS, statusMeta, modelLabel, fmtUSD, fmtTokens, fmtMs } from './officeUi';

// Métricas calculadas desde las corridas reales de cada tarea (nada inventado).
export default function OfficeMetricsView({ agents = [], metrics, models, onOpenAgent }) {
    const totals = metrics?.totals || {};
    const stats = metrics?.agentStats || {};
    const rows = agents
        .map(a => ({ agent: a, s: stats[a.id] || {} }))
        .sort((x, y) => (y.s.runs || 0) - (x.s.runs || 0) || (y.agent.hub?.calls24h || 0) - (x.agent.hub?.calls24h || 0));
    const disabled = (models?.providers || []).filter(p => !p.enabled);

    const kpis = [
        ['Tareas hechas', totals.done ?? 0, `${totals.failed ?? 0} fallidas`],
        ['Tasa de éxito', totals.successRate == null ? '—' : `${totals.successRate}%`, 'Hechas sobre hechas + fallidas'],
        ['Por revisar', totals.review ?? 0, `${totals.inProgress ?? 0} en curso · ${totals.queued ?? 0} en cola`],
        ['Tokens', fmtTokens(totals.tokens), `${totals.runs ?? 0} corridas`],
        ['Gasto estimado', fmtUSD(totals.costUSD ?? 0), totals.unpricedRuns ? `${totals.unpricedRuns} corridas sin precio conocido` : 'Según el precio de cada modelo'],
    ];

    return (
        <div className="occ">
            <div className="occ-kpis">
                {kpis.map(([label, val, sub]) => (
                    <div key={label} className="occ-kpi">
                        <div className="occ-kpi-label">{label}</div>
                        <div className="occ-kpi-val">{val}</div>
                        <div className="occ-kpi-sub">{sub}</div>
                    </div>
                ))}
            </div>

            <section className="occ-section">
                <div className="occ-section-head">
                    <h2 className="occ-section-title"><BarChart2 size={16} /> Por agente</h2>
                </div>
                <table className="occ-table">
                    <thead>
                        <tr><th>Agente</th><th>Modelo</th><th>Estado</th><th>Hechas</th><th>Fallidas</th><th>Por revisar</th><th>Éxito</th><th>Tiempo medio</th><th>Tokens</th><th>Costo</th></tr>
                    </thead>
                    <tbody>
                        {rows.map(({ agent: a, s }) => {
                            const st = statusMeta(AGENT_STATUS, a.status);
                            return (
                                <tr key={a.id} className="clickable" onClick={() => onOpenAgent(a)}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{a.avatar} {a.name}</td>
                                    <td style={{ color: PROVIDER_COLOR[a.kind === 'external' ? 'externo' : a.provider] }}>
                                        {a.kind === 'external' ? `MCP · ${a.hub?.calls24h ?? 0} llamadas 24h` : modelLabel(models, a.model)}
                                    </td>
                                    <td style={{ color: st.color }}>{st.label}</td>
                                    <td>{s.done || 0}</td>
                                    <td style={{ color: s.failed ? '#fca5a5' : undefined }}>{s.failed || 0}</td>
                                    <td>{s.review || 0}</td>
                                    <td>{s.successRate == null ? '—' : `${s.successRate}%`}</td>
                                    <td>{fmtMs(s.avgMs)}</td>
                                    <td>{fmtTokens((s.tokensIn || 0) + (s.tokensOut || 0))}</td>
                                    <td>{a.kind === 'external' ? '—' : fmtUSD(s.costUSD ?? 0)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <section className="occ-section">
                <div className="occ-section-head">
                    <h2 className="occ-section-title"><Cpu size={16} /> Por modelo</h2>
                    {disabled.length > 0 && (
                        <span className="occ-muted">Sin llave: {disabled.map(p => `${p.label} (${p.env})`).join(', ')}</span>
                    )}
                </div>
                {(metrics?.byModel || []).length === 0 ? (
                    <div className="occ-muted">Todavía no hay corridas. Asigna una tarea a un agente para empezar a medir.</div>
                ) : (
                    <table className="occ-table">
                        <thead><tr><th>Modelo</th><th>Proveedor</th><th>Corridas</th><th>Tokens entrada</th><th>Tokens salida</th><th>Costo</th></tr></thead>
                        <tbody>
                            {metrics.byModel.map(m => (
                                <tr key={m.model}>
                                    <td>{modelLabel(models, m.model)}</td>
                                    <td style={{ color: PROVIDER_COLOR[m.provider] }}>{m.provider}</td>
                                    <td>{m.runs}</td>
                                    <td>{fmtTokens(m.tokensIn)}</td>
                                    <td>{fmtTokens(m.tokensOut)}</td>
                                    <td>{m.provider === 'externo' ? '—' : fmtUSD(m.costUSD)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
