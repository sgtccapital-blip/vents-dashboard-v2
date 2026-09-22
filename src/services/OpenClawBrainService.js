/**
 * OpenClawBrainService — Conector Principal para OpenClaw Super Agent & Cerebro RAG
 * Conecta el Dashboard, Copilot y la Consola con el motor OpenClaw y Gemini API
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const OPENCLAW_MODES = [
    {
        id: 'ejecutivo',
        name: '⚡ Ejecutivo',
        badge: 'Modo Rápido & Acciones',
        color: '#8b5cf6',
        description: 'Respuestas concisas, ejecutivas y orientadas al flujo de trabajo directo.',
        systemPrompt: 'MODO ACTIVO: EJECUTIVO. Responde de forma concisa, directa y estructurada. Prioriza acciones, viñetas claras y próximos pasos sin rodeos.'
    },
    {
        id: 'estratega',
        name: '🗺️ Estratega',
        badge: 'Roadmaps & WBS',
        color: '#3b82f6',
        description: 'Desglose detallado de objetivos, dependencias críticas, hitos y planificación de proyectos.',
        systemPrompt: 'MODO ACTIVO: ESTRATEGA. Analiza el panorama completo, desglose de entregables (WBS), dependencias entre tareas, hitos cronológicos y mitigación de riesgos.'
    },
    {
        id: 'finanzas',
        name: '📊 Finanzas & Logística',
        badge: 'Presupuestos & ROI',
        color: '#10b981',
        description: 'Optimización de costos, cotizaciones de eventos, cálculos de ROI y logística de suministros.',
        systemPrompt: 'MODO ACTIVO: FINANZAS & LOGÍSTICA. Evalúa presupuestos, costos unitarios, margen de ganancia, aforos, cálculo de puntos de equilibrio y logística operativa.'
    },
    {
        id: 'tech',
        name: '🛠️ Tech Lead',
        badge: 'Código & Arquitectura',
        color: '#06b6d4',
        description: 'Arquitectura de software, APIs, scripts de automatización y pipelines de IA.',
        systemPrompt: 'MODO ACTIVO: TECH LEAD. Estructura soluciones técnicas modulares, especificaciones de API, scripts de automatización y buenas prácticas de ingeniería de software.'
    }
];

// Alias para compatibilidad
export const HERMES_MODES = OPENCLAW_MODES;

export const SLASH_COMMANDS = [
    { command: '/proyecto', label: '/proyecto [nombre]', desc: 'Crea un nuevo proyecto en el Hub con roadmap' },
    { command: '/evento', label: '/evento [nombre] [fecha]', desc: 'Agenda un evento con agenda y requerimientos' },
    { command: '/tarea', label: '/tarea [descripción]', desc: 'Añade una tarea priorizada a la lista' },
    { command: '/rag', label: '/rag [término o pregunta]', desc: 'Consulta directa a la base de conocimiento RAG de OpenClaw' },
    { command: '/reporte', label: '/reporte', desc: 'Genera un reporte ejecutivo del estado del Dashboard' },
    { command: '/limpiar', label: '/limpiar', desc: 'Reinicia el historial de mensajes de la conversación' }
];

class OpenClawBrainService {
    static defaultConfig = {
        baseUrl: 'http://localhost:18789/v1',
        chatUrl: '/api/openclaw/chat',
        model: 'gemini-3.6-flash',
        apiKey: '',
        geminiApiKey: ''
    };

    /**
     * Obtiene la API Key de Gemini desde almacenamiento local o entorno
     */
    static getGeminiApiKey() {
        return localStorage.getItem('__gemini_api_key') || 
               import.meta.env.VITE_GEMINI_API_KEY || 
               '';
    }

    /**
     * Guarda la API Key de Gemini en localStorage y notifica al backend
     */
    static async saveGeminiApiKey(key) {
        const cleanKey = (key || '').trim();
        if (cleanKey) {
            localStorage.setItem('__gemini_api_key', cleanKey);
        } else {
            localStorage.removeItem('__gemini_api_key');
        }

        try {
            await fetch(`${API_BASE}/openclaw/gemini/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiApiKey: cleanKey })
            });
        } catch (e) {
            console.warn('[OpenClawService] Fallback guardado local de Gemini:', e);
        }
        return cleanKey;
    }

    /**
     * Obtiene la configuración activa de OpenClaw
     */
    static async getConfig() {
        try {
            const res = await fetch(`${API_BASE}/openclaw/config`);
            if (res.ok) {
                const data = await res.json();
                return { ...this.defaultConfig, ...data, geminiApiKey: this.getGeminiApiKey() };
            }
        } catch (e) {
            console.warn('[OpenClawService] Backend config no disponible, usando local:', e);
        }
        
        const local = localStorage.getItem('__openclaw_config') || localStorage.getItem('__hermes_config');
        return local ? { ...this.defaultConfig, ...JSON.parse(local), geminiApiKey: this.getGeminiApiKey() } : { ...this.defaultConfig, geminiApiKey: this.getGeminiApiKey() };
    }

    /**
     * Guarda la configuración de conexión de OpenClaw
     */
    static async saveConfig(newConfig) {
        const merged = { ...this.defaultConfig, ...newConfig };
        localStorage.setItem('__openclaw_config', JSON.stringify(merged));
        
        if (newConfig.geminiApiKey !== undefined) {
            this.saveGeminiApiKey(newConfig.geminiApiKey);
        }

        try {
            await fetch(`${API_BASE}/openclaw/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged)
            });
        } catch (e) {
            console.warn('[OpenClawService] No se pudo guardar config en backend:', e);
        }
        return merged;
    }

    /**
     * Verifica la salud de la conexión con el servidor OpenClaw / Gemini
     */
    static async checkHealth() {
        const geminiKey = this.getGeminiApiKey();
        try {
            const res = await fetch(`${API_BASE}/openclaw/health`);
            if (res.ok) {
                const data = await res.json();
                return { ...data, geminiActive: !!geminiKey };
            }
        } catch (e) {
            // fallback
        }

        return {
            online: true,
            mode: geminiKey ? 'gemini_3.6_flash' : 'embedded_orchestrator',
            model: geminiKey ? 'gemini-3.6-flash' : 'openclaw-agent',
            status: 'ready',
            geminiActive: !!geminiKey
        };
    }

    /**
     * Envía un mensaje al OpenClaw Super Agent con contexto en vivo + RAG + Modo + Gemini
     */
    static async sendCommand(prompt, historyContext = [], systemRole = '', skills = '', namespace = 'default', modeId = 'ejecutivo', contextCallbacks = null) {
        try {
            const modeObj = OPENCLAW_MODES.find(m => m.id === modeId) || OPENCLAW_MODES[0];
            const combinedSystemRole = `${modeObj.systemPrompt}\n\n${systemRole || ''}`;
            const geminiApiKey = this.getGeminiApiKey();

            // Llamar a /api/openclaw/chat (o /api/hermes/chat como fallback)
            const endpoint = `${API_BASE}/openclaw/chat`;
            const payload = {
                prompt,
                history: historyContext.map(msg => ({
                    role: msg.role === 'bot' || msg.role === 'copilot' || msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.text || msg.content || ''
                })),
                systemRole: combinedSystemRole,
                skills,
                namespace,
                geminiApiKey: geminiApiKey || undefined
            };

            let res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Si 404 intentar /api/hermes/chat
            if (res.status === 404) {
                res = await fetch(`${API_BASE}/hermes/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error procesando solicitud con OpenClaw Super Agent.');
            }

            // Ejecución de callbacks locales en frontend si hubo tools ejecutadas
            if (data.executedTools && data.executedTools.length > 0 && contextCallbacks) {
                for (const tool of data.executedTools) {
                    if (tool.name === 'create_project' && contextCallbacks.addProject) {
                        contextCallbacks.addProject(tool.result?.project || tool.args);
                    } else if (tool.name === 'create_event' && contextCallbacks.addEvent) {
                        contextCallbacks.addEvent(tool.result?.event || tool.args);
                    } else if (tool.name === 'add_task' && contextCallbacks.addTask) {
                        contextCallbacks.addTask(tool.result?.task || tool.args);
                    } else if ((tool.name === 'complete_task' || tool.name === 'toggle_task') && contextCallbacks.toggleTask) {
                        contextCallbacks.toggleTask(tool.result?.id || tool.args?.taskId);
                    }
                }
            }

            return {
                reply: data.reply || data.content || 'Acción procesada por OpenClaw Super Agent.',
                executedTools: data.executedTools || [],
                model: data.model || (geminiApiKey ? 'gemini-3.6-flash' : 'openclaw-agent'),
                provider: data.provider || (geminiApiKey ? 'Google Gemini 3.6 Flash' : 'OpenClaw Embedded'),
                usage: data.usage || null
            };

        } catch (error) {
            console.error('[OpenClawService] Error en sendCommand:', error);
            throw error;
        }
    }

    /**
     * Búsqueda Semántica RAG con OpenClaw Engine
     */
    static async searchRAG(query, namespace = 'default', category = 'all', topK = 6) {
        try {
            const res = await fetch(`${API_BASE}/rag/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, namespace, category, topK })
            });
            if (res.ok) return await res.json();
            throw new Error('Error en búsqueda RAG');
        } catch (e) {
            console.error('[OpenClawService] Error searchRAG:', e);
            return { query, count: 0, results: [] };
        }
    }

    /**
     * Obtiene detalle de un documento RAG por ID
     */
    static async getRAGDocument(id) {
        try {
            const res = await fetch(`${API_BASE}/rag/documents/${id}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error('[OpenClawService] Error getRAGDocument:', e);
        }
        return null;
    }

    /**
     * Obtiene sesiones guardadas de chat
     */
    static async getSessions() {
        try {
            const res = await fetch(`${API_BASE}/openclaw/sessions`);
            if (res.ok) return await res.json();
        } catch (e) {}
        const local = localStorage.getItem('__openclaw_sessions');
        return local ? JSON.parse(local) : [];
    }

    /**
     * Guarda una sesión de chat
     */
    static async saveSession(session) {
        const local = await this.getSessions();
        const updated = [session, ...local.filter(s => s.id !== session.id)].slice(0, 20);
        localStorage.setItem('__openclaw_sessions', JSON.stringify(updated));
        try {
            await fetch(`${API_BASE}/openclaw/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });
        } catch (e) {}
        return session;
    }

    /**
     * Elimina una sesión de chat
     */
    static async deleteSession(id) {
        const local = await this.getSessions();
        const updated = local.filter(s => s.id !== id);
        localStorage.setItem('__openclaw_sessions', JSON.stringify(updated));
        try {
            await fetch(`${API_BASE}/openclaw/sessions/${id}`, { method: 'DELETE' });
        } catch (e) {}
        return true;
    }

    /**
     * Presets de habilidades y directivas
     */
    static async getSkillPresets() {
        try {
            const res = await fetch(`${API_BASE}/openclaw/skills/presets`);
            if (res.ok) return await res.json();
        } catch (e) {}
        return [
            { id: '1', name: 'Gestión de Eventos', description: 'Coordinación completa de Terraplén Rooftop, Furia y Piano Bar' },
            { id: '2', name: 'Planificación WBS', description: 'Desglose estructurado de tareas, fechas y responsables' },
            { id: '3', name: 'Finanzas & ROI', description: 'Control de presupuestos, ventas de boletos y márgenes' },
            { id: '4', name: 'Operación Autopilot', description: 'Monitoreo proactivo de tareas pendientes y alertas' }
        ];
    }

    static async saveSkillPresets(presets) {
        try {
            await fetch(`${API_BASE}/openclaw/skills/presets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presets })
            });
        } catch (e) {}
        return presets;
    }
}

export default OpenClawBrainService;
