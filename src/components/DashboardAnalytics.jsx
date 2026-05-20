import { useApp } from '../context/AppContext';
import { Target, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function DashboardAnalytics() {
    const { events } = useApp();

    // Filter events that have KPIs defined
    const eventsWithKPI = (events || []).filter(p => p.kpi);

    // Simulated Financial Agregation
    // If Panamerican has 45% of 100%, we can visualize that cleanly.
    return (
        <div className="analytics-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px'
        }}>
            {eventsWithKPI.map((p, idx) => {
                const kpi = p.kpi;
                const percentage = kpi.target ? Math.round((kpi.current / kpi.target) * 100) : 0;
                
                // Color mapping for hedge fund feel
                const colors = [
                    { b: 'var(--accent-green)', bg: 'rgba(34, 197, 94, 0.15)' },
                    { b: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.15)' },
                    { b: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.15)' },
                    { b: 'var(--accent-yellow)', bg: 'rgba(234, 179, 8, 0.15)' }
                ];
                const theme = colors[idx % colors.length];

                return (
                    <div key={p.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Target size={20} style={{ color: theme.b }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{p.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{kpi.name}</div>
                                </div>
                            </div>
                            <span className="tag" style={{ background: theme.bg, color: theme.b, borderColor: theme.b }}>
                                {percentage}%
                            </span>
                        </div>

                        {/* Progress Bar Component */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                                    {kpi.current} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {kpi.target} {kpi.unit}</span>
                                </span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ 
                                    width: `${percentage}%`, 
                                    height: '100%', 
                                    background: theme.b, 
                                    borderRadius: '4px',
                                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                }} />
                            </div>
                        </div>

                        {/* Status Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                <Activity size={14} />
                                Lead: {p.leadAgent}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: percentage >= 100 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                                <TrendingUp size={14} />
                                {percentage >= 100 ? 'Target Reached' : 'On Track'}
                            </div>
                        </div>

                    </div>
                );
            })}
        </div>
    );
}
