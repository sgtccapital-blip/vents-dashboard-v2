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
        model: '',
        apiKey: ''
    };

    /**
     * Guarda la API Key de Gemini en el servidor. Nunca se guarda en el navegador:
     * el servidor la usa para llamar a Gemini y solo devuelve si existe.
     */
    static async saveGeminiApiKey(key, model) {
        // Limpia claves que versiones anteriores dejaban en localStorage
        localStorage.removeItem('__gemini_api_key');
        const res = await fetch(`${API_BASE}/openclaw/gemini/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geminiApiKey: (key || '').trim(), ...(model !== undefined ? { model } : {}) })
        });
        if (!res.ok) throw new Error('No se pudo guardar la clave en el servidor');
        return res.json();
    }

    /** Estado de Gemini en el servidor: { configured, active, model, source, lastError } */
    static async getGeminiStatus() {
        try {
            const res = await fetch(`${API_BASE}/openclaw/gemini/status`);
            if (res.ok) return await res.json();
        } catch { /* sin conexión */ }
        return { configured: false, active: false, model: null };
    }

    /**
     * Obtiene la configuración activa de OpenClaw
     */
    static async getConfig() {
        try {
            const res = await fetch(`${API_BASE}/openclaw/config`);
            if (res.ok) {
                const data = await res.json();
                return { ...this.defaultConfig, ...data };
            }
        } catch (e) {
            console.warn('[OpenClawService] Backend config no disponible, usando local:', e);
        }
        
        const local = localStorage.getItem('__openclaw_config') || localStorage.getItem('__hermes_config');
        return local ? { ...this.defaultConfig, ...JSON.parse(local) } : { ...this.defaultConfig };
    }

    /**
     * Guarda la configuración de conexión de OpenClaw
     */
    static async saveConfig(newConfig) {
        // Las claves van solo al servidor, nunca a localStorage
        const { geminiApiKey, ...merged } = { ...this.defaultConfig, ...newConfig };
        localStorage.setItem('__openclaw_config', JSON.stringify({ ...merged, apiKey: '' }));

        if (geminiApiKey) {
            await this.saveGeminiApiKey(geminiApiKey).catch(e => console.warn('[OpenClawService] No se pudo guardar la clave de Gemini:', e));
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
        try {
            const res = await fetch(`${API_BASE}/openclaw/health`);
            if (res.ok) return await res.json();
        } catch {
            // servidor caído
        }
        return { online: false, mode: 'offline', model: null, status: 'offline', geminiActive: false, label: 'Servidor no disponible' };
    }

    /**
     * Envía un mensaje al OpenClaw Super Agent con contexto en vivo + RAG + Modo + Gemini
     */
    static async sendCommand(prompt, historyContext = [], systemRole = '', skills = '', namespace = 'default', modeId = 'ejecutivo') {
        const modeObj = OPENCLAW_MODES.find(m => m.id === modeId) || OPENCLAW_MODES[0];
        const payload = {
            prompt,
            history: historyContext
                .filter(msg => !msg.error && (msg.text || msg.content))
                .map(msg => ({
                    role: msg.role === 'bot' || msg.role === 'copilot' || msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.text || msg.content || ''
                })),
            systemRole: `${modeObj.systemPrompt}\n\n${systemRole || ''}`,
            skills,
            namespace
        };

        const res = await fetch(`${API_BASE}/openclaw/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if (res.status === 401) window.dispatchEvent(new Event('auth:required'));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `El servidor respondió ${res.status}`);

        // El servidor ya guardó lo que hizo el agente: solo avisamos al dashboard que recargue
        if (Array.isArray(data.executedTools) && data.executedTools.some(t => t.result?.success)) {
            window.dispatchEvent(new CustomEvent('openclaw:data-changed', { detail: data.executedTools }));
        }

        return {
            reply: data.reply || 'Sin respuesta.',
            executedTools: data.executedTools || [],
            sources: data.sources || [],
            model: data.model || 'openclaw-local',
            provider: data.provider || 'OpenClaw',
            usage: data.usage || null
        };
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
        } catch { /* ignore */ }
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
        } catch { /* ignore */ }
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
        } catch { /* ignore */ }
        return true;
    }

    /**
     * Presets de habilidades y directivas
     */
    static async getSkillPresets() {
        try {
            const res = await fetch(`${API_BASE}/openclaw/skills/presets`);
            if (res.ok) return await res.json();
        } catch { /* ignore */ }
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
        } catch { /* ignore */ }
        return presets;
    }
}

export default OpenClawBrainService;
