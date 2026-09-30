import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export function useAutopilotEngine(apiOnline, addActivityOverride) {
    const { events = [], tasks = [], projects = [], addActivity: contextAddActivity } = useApp();
    const addActivity = addActivityOverride || contextAddActivity;

    const [autopilotActive, setAutopilotActive] = useState(false);
    const [lastScanResult, setLastScanResult] = useState(null);
    const loopRef = useRef(null);

    const toggleAutopilot = () => {
        setAutopilotActive(prev => {
            const nextState = !prev;
            if (addActivity) {
                addActivity({
                    text: `🤖 OpenClaw Autopilot ${nextState ? 'ACTIVADO' : 'DESACTIVADO'}`,
                    color: nextState ? '#10b981' : '#f43f5e',
                    source: 'autopilot'
                });
            }
            return nextState;
        });
    };

    useEffect(() => {
        if (!autopilotActive) {
            if (loopRef.current) clearInterval(loopRef.current);
            return;
        }

        const runAuditCycle = async () => {
            console.log('[OpenClaw Autopilot] Iniciando auditoría operativa en tiempo real...');
            const now = new Date();
            const issues = [];

            // 1. Audit Overdue Tasks
            const overdue = (tasks || []).filter(t => {
                if (t.done || t.status === 'done') return false;
                if (!t.due) return false;
                const dueDate = new Date(t.due);
                return !isNaN(dueDate.getTime()) && dueDate < now;
            });

            if (overdue.length > 0) {
                const sample = overdue[0];
                const msg = `🚨 [Autopilot] ${overdue.length} tarea(s) vencida(s). Ej: "${sample.text || sample.title}" (${sample.assignee || 'Sin asignar'})`;
                issues.push(msg);
                if (addActivity) {
                    addActivity({
                        text: msg,
                        color: '#f43f5e',
                        source: 'autopilot'
                    });
                }
            }

            // 2. Audit Upcoming Events (<48h) without assigned tasks
            const next48h = new Date(now.getTime() + 48 * 3600 * 1000);
            const urgentEvents = (events || []).filter(e => {
                if (!e.date || e.status === 'cancelado') return false;
                const evDate = new Date(e.date + 'T23:59:59');
                return !isNaN(evDate.getTime()) && evDate >= now && evDate <= next48h;
            });

            urgentEvents.forEach(ev => {
                const evTasks = (tasks || []).filter(t => t.eventId === ev.id && !t.done);
                if (evTasks.length === 0) {
                    const msg = `⚠️ [Autopilot] El evento "${ev.name}" es en menos de 48h y no tiene tareas activas.`;
                    issues.push(msg);
                    if (addActivity) {
                        addActivity({
                            text: msg,
                            color: '#f59e0b',
                            source: 'autopilot'
                        });
                    }
                }
            });

            // 3. Audit Unassigned Critical/High Priority Tasks
            const unassignedUrgent = (tasks || []).filter(t => {
                if (t.done || t.status === 'done') return false;
                const hasAssignee = !!(t.assignedTo || t.assignee);
                const isUrgent = t.priority === 'critical' || t.priority === 'high';
                return isUrgent && !hasAssignee;
            });

            if (unassignedUrgent.length > 0) {
                const sample = unassignedUrgent[0];
                const msg = `⚡ [Autopilot] Tarea crítica sin responsable asignado: "${sample.text || sample.title}".`;
                issues.push(msg);
                if (addActivity) {
                    addActivity({
                        text: msg,
                        color: '#8b5cf6',
                        source: 'autopilot'
                    });
                }
            }

            // 4. Send telemetry thought to OpenClaw Super Agent backend
            const summaryText = issues.length > 0
                ? `Auditoría completó con ${issues.length} alertas detectadas: ${issues[0]}`
                : `Auditoría completada: ${(events || []).length} eventos y ${(tasks || []).length} tareas en orden.`;

            setLastScanResult({
                timestamp: now.toISOString(),
                issuesCount: issues.length,
                summary: summaryText
            });

            try {
                await fetch('/api/openclaw/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'log_thought',
                        payload: {
                            message: `[Autopilot Cycle] ${summaryText}`,
                            level: issues.length > 0 ? 'warn' : 'info'
                        }
                    })
                }).catch(() => {});
            } catch (err) {
                console.error('[OpenClaw Autopilot] Telemetría error:', err);
            }
        };

        // Run once immediately on enable, then every 35s
        runAuditCycle();
        loopRef.current = setInterval(runAuditCycle, 35000);

        return () => {
            if (loopRef.current) clearInterval(loopRef.current);
        };
    }, [autopilotActive, events, tasks, projects]);

    return { autopilotActive, toggleAutopilot, lastScanResult };
}
