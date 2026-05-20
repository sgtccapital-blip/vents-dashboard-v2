import { Activity, Zap, ShieldAlert, BarChart3, Users } from 'lucide-react';

export default function EventAnalytics({ tasks }) {
    const totalTasks = tasks.length || 1;
    const completedTasks = tasks.filter(t => t.done).length;
    const progress = Math.round((completedTasks / totalTasks) * 100);

    const pendingTasks = tasks.filter(t => t.status === 'pending').length || 0;
    const blockedTasks = tasks.filter(t => t.status === 'blocked_auth').length || 0; 

    const statusDist = [
        { name: 'Done', tasks: completedTasks, color: 'var(--accent-green)' },
        { name: 'In Progress', tasks: tasks.filter(t => t.status === 'in-progress' || t.status === 'working').length, color: 'var(--accent-primary)' },
        { name: 'Pending', tasks: pendingTasks, color: 'var(--text-tertiary)' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'none' }}>
            
            {/* Top KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.9) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '16px', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-full)', color: 'var(--accent-primary)' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Velocity</div>
                        <div style={{ fontSize: '32px', fontWeight: 800 }}>{progress}%</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.9) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '16px', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-full)', color: 'var(--accent-green)' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Pending Tasks</div>
                        <div style={{ fontSize: '32px', fontWeight: 800 }}>{pendingTasks}</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', background: 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.9) 100%)', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-full)', color: 'var(--accent-red)' }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Bottlenecks</div>
                        <div style={{ fontSize: '32px', fontWeight: 800 }}>{blockedTasks}</div>
                    </div>
                </div>
            </div>

            {/* Main Dash Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                
                {/* Task Status Distribution */}
                <div className="card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={20} style={{ color: 'var(--text-tertiary)' }} />
                            Task Status Distribution
                        </h3>
                        <span className="tag">Live Data</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {statusDist.map(w => (
                            <div key={w.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                                    <span>{w.name}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>{w.tasks} tasks</span>
                                </div>
                                <div style={{ height: '12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(w.tasks / totalTasks) * 100}%`, background: w.color, borderRadius: 'var(--radius-full)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Health */}
                <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '32px', alignSelf: 'flex-start' }}>System Health</h3>
                    
                    {/* CSS Radial Ring */}
                    <div style={{ 
                        width: '180px', height: '180px', 
                        borderRadius: '50%', 
                        background: `conic-gradient(var(--accent-primary) ${progress}%, var(--bg-canvas) ${progress}%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                        boxShadow: '0 0 32px rgba(99,102,241,0.2)'
                    }}>
                        <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '36px', fontWeight: 800 }}>{progress}%</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Operational</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)' }}>99.9%</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Uptime</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>12ms</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Latency</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
