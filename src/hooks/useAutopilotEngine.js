import { useState, useEffect, useRef } from 'react';
import NativeBrainService from '../services/NativeBrainService';

export function useAutopilotEngine(apiOnline, addActivity) {
    const [autopilotActive, setAutopilotActive] = useState(false);
    const loopRef = useRef(null);

    const toggleAutopilot = () => {
        setAutopilotActive(prev => {
            const nextState = !prev;
            if (addActivity) {
                addActivity({
                    text: `🤖 Autopilot (Nativo) ${nextState ? 'ENCENDIDO' : 'APAGADO'}`,
                    color: nextState ? '#10b981' : '#f43f5e',
                    source: 'system'
                });
            }
            return nextState;
        });
    };

    useEffect(() => {
        if (!autopilotActive || !apiOnline) {
            if (loopRef.current) clearInterval(loopRef.current);
            return;
        }

        // Simula la busqueda y ejecucion de tareas en background cada 30 segundos
        loopRef.current = setInterval(async () => {
            console.log('[Autopilot] Scanning for tasks...');
            
            // Aqui normalmente leeríamos de Firebase/Firestore tareas donde status == 'pending_ai'
            // Simulamos una tarea encontrada aleatoria 1 de cada 3 veces
            if (Math.random() > 0.6) {
                try {
                    const taskDescription = "Revisar leads nuevos de las ultimas 2 horas y categorizarlos.";
                    
                    if (addActivity) {
                        addActivity({
                            text: `⚙️ [Autopilot] Ejecutando: ${taskDescription}`,
                            color: '#3b82f6',
                            source: 'autopilot'
                        });
                    }

                    const result = await NativeBrainService.sendCommand(
                        `Ejecuta esta tarea de forma concisa: ${taskDescription}`,
                        [],
                        "Eres un agente en background. No saludes, solo da el resultado."
                    );

                    if (addActivity) {
                        addActivity({
                            text: `✅ [Autopilot] Tarea completada.`,
                            color: '#10b981',
                            source: 'autopilot'
                        });
                    }
                } catch (e) {
                    console.error('[Autopilot Engine] Error executing task:', e);
                }
            }

        }, 30000); // Cada 30 segundos

        return () => {
            if (loopRef.current) clearInterval(loopRef.current);
        };
    }, [autopilotActive, apiOnline, addActivity]);

    return {
        autopilotActive,
        toggleAutopilot
    };
}
