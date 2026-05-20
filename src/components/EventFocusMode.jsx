import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Target, Focus, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function EventFocusMode() {
    const { tasks, updateTask, addActivity } = useApp();
    const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes
    const [isActive, setIsActive] = useState(false);
    const pendingTasks = tasks.filter(t => !t.done);
    const [selectedTask, setSelectedTask] = useState(pendingTasks[0] || tasks[0]);

    // Ensure selected task exists
    useEffect(() => {
        if (!tasks.find(t => t.id === selectedTask?.id)) {
            setSelectedTask(pendingTasks[0] || tasks[0]);
        }
    }, [tasks]);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(45 * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ height: '100%', background: 'linear-gradient(to bottom, #000, var(--bg-canvas))', borderRadius: 'var(--radius-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            
            {/* Ambient Background Glow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', background: isActive ? 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', transition: 'background 2s ease' }} />

            {/* Top Selector indicating Deep Work state */}
            <div style={{ position: 'absolute', top: '40px', display: 'flex', alignItems: 'center', gap: '8px', color: isActive ? 'var(--accent-red)' : 'var(--text-tertiary)', transition: 'color 1s ease' }}>
                <Focus size={24} className={isActive ? 'pulse' : ''} />
                <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
                    {isActive ? 'Do Not Disturb' : 'Focus Mode'}
                </span>
            </div>

            {/* Task Selector */}
            <div style={{ zIndex: 10, textAlign: 'center', marginBottom: '64px', maxWidth: '600px', width: '100%' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '16px' }}>Current Target</span>
                {isActive ? (
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                        {selectedTask.text}
                    </div>
                ) : (
                    <select 
                        value={selectedTask?.id || ''}
                        onChange={(e) => setSelectedTask(tasks.find(t => t.id === e.target.value))}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '20px', padding: '12px 24px', borderRadius: 'var(--radius-lg)', width: '100%', outline: 'none', textAlign: 'center', appearance: 'none', cursor: 'pointer' }}
                    >
                        {pendingTasks.length > 0 ? (
                            pendingTasks.map(t => (
                                <option key={t.id} value={t.id} style={{ background: '#111' }}>{t.text}</option>
                            ))
                        ) : (
                            <option value="">No pending tasks!</option>
                        )}
                    </select>
                )}
            </div>

            {/* Giant Timer */}
            <div style={{ zIndex: 10, fontSize: '14vw', fontWeight: 900, lineHeight: 1, textShadow: '0 8px 32px rgba(0,0,0,0.5)', tabularNums: 'true', letterSpacing: '-4px', color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', transition: 'color 1s ease' }}>
                {formatTime(timeLeft)}
            </div>

            {/* Controls */}
            <div style={{ zIndex: 10, display: 'flex', gap: '24px', marginTop: '64px' }}>
                <button 
                    onClick={() => {
                        if (selectedTask) {
                            updateTask(selectedTask.id, { status: 'done', done: true });
                            addActivity(`Finished focus session for task "${selectedTask.text}"!`, 'var(--accent-green)', selectedTask.projectId || 'global');
                            setIsActive(false);
                            setTimeLeft(45 * 60);
                        }
                    }}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)' }}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: 'rgba(34, 197, 94, 0.2)' })}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: 'rgba(34, 197, 94, 0.1)' })}
                    title="Mark Done"
                >
                    <CheckCircle2 size={32} />
                </button>
                <button  
                    onClick={toggleTimer}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', background: isActive ? 'rgba(239,68,68,0.1)' : 'var(--accent-primary)', color: isActive ? 'var(--accent-red)' : '#fff', border: isActive ? '2px solid var(--accent-red)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? '0 0 24px rgba(239,68,68,0.4)' : '0 12px 32px rgba(99,102,241,0.4)' }}
                >
                    {isActive ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                    onClick={resetTimer}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.1)' })}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.05)' })}
                >
                    <RotateCcw size={28} />
                </button>
            </div>
            
            {/* CSS pulse animation is globally defined or we can inline a keyframe hack but usually the generic transition works well enough */}
        </div>
    );
}
