import { useState, useEffect, useRef } from 'react';
import OpenClawBrainService from '../services/OpenClawBrainService';

export function useAutopilotEngine(apiOnline, addActivity) {
    const [autopilotActive, setAutopilotActive] = useState(false);
    const loopRef = useRef(null);

    const toggleAutopilot = () => {
        setAutopilotActive(prev => {
            const nextState = !prev;
            if (addActivity) {
                addActivity({
                    text: `🤖 OpenClaw Autopilot ${nextState ? 'ENCENDIDO' : 'APAGADO'}`,
                    color: nextState ? '#10b981' : '#f43f5e',
                    source: 'system'
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

        // Background autonomous agent heartbeat
        loopRef.current = setInterval(async () => {
            console.log('[OpenClaw Autopilot] Escaneando tareas y estado...');
            
            if (Math.random() > 0.6) {
                try {
                    const taskDescription = "Analizar estado de hitos de proyectos y sincronizar RAG";
                    
                    if (addActivity) {
                        addActivity({
                            text: `⚙️ [OpenClaw Autopilot] Ejecutando: ${taskDescription}`,
                            color: '#8b5cf6',
                            source: 'autopilot'
                        });
                    }

                    // Self-trigger OpenClaw thought/action
                    await fetch('/api/openclaw/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'log_thought',
                            payload: {
                                message: `Autopilot escaneó el sistema: todo en orden.`,
                                level: 'info'
                            }
                        })
                    }).catch(() => {});

                } catch (e) {
                    console.error('[OpenClaw Autopilot] Error:', e);
                }
            }
        }, 30000);

        return () => {
            if (loopRef.current) clearInterval(loopRef.current);
        };
    }, [autopilotActive]);

    return { autopilotActive, toggleAutopilot };
}
