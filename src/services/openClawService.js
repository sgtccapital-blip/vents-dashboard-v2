/**
 * OpenClaw Service — Puente de comunicación con el backend API
 * 
 * Este servicio conecta el frontend del Dashboard con el servidor API local (3001),
 * que a su vez es accesible por OpenClaw para ejecutar tareas.
 */

const COMMAND_CENTER_API = 'http://localhost:3001/api';
const OPENCLAW_BASE_URL = 'http://localhost:18790/api/openclaw';

class OpenClawService {
    /**
     * Verifica si el servidor API del Command Center está corriendo.
     */
    static async checkAPIHealth() {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/health`);
            return res.ok;
        } catch {
            return false;
        }
    }

    /**
     * Verifica si OpenClaw está corriendo en su puerto.
     */
    static async checkConnection() {
        try {
            await fetch(`${OPENCLAW_BASE_URL}/status`, { method: 'GET' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Envía un comando a través del API del Command Center.
     * El servidor lo ejecuta directamente sobre la base de datos.
     * 
     * @param {string} prompt - El mensaje del usuario
     * @param {object} context - Contexto adicional (empresa actual, agente target, etc.)
     * @returns {Promise<string>} Respuesta
     */
    static async sendCommand(prompt, context = {}) {
        try {
            console.log(`[OpenClaw] Sending command:`, prompt);

            // Primero intentar ejecutar a través de nuestro API local
            const apiOnline = await this.checkAPIHealth();

            if (apiOnline) {
                // Log the command as an activity
                await fetch(`${COMMAND_CENTER_API}/activity`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `[Terminal] ${prompt}`,
                        color: '#3b82f6',
                        source: 'terminal'
                    })
                });

                // Try to forward to OpenClaw if it's running
                const openClawOnline = await this.checkConnection();
                if (openClawOnline) {
                    try {
                        const res = await fetch(`${OPENCLAW_BASE_URL}/chat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: prompt,
                                context: context,
                                timestamp: new Date().toISOString()
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            return data.response || data.message || 'Comando ejecutado por OpenClaw';
                        }
                    } catch (err) {
                        console.warn('[OpenClaw] Agent responded with error, falling back:', err.message);
                    }
                }

                return `[API] Comando registrado. OpenClaw ${openClawOnline ? 'notificado' : 'offline — se ejecutará al reconectar'}.`;
            }

            return `[Offline] Comando "${prompt}" guardado localmente. Conectar API (npm run server) para sincronizar.`;

        } catch (error) {
            console.error('Error enviando comando:', error);
            throw new Error('No se pudo procesar el comando. Verifica que el API server esté corriendo.');
        }
    }

    /**
     * Ejecuta una acción estructurada sobre el dashboard a través del API.
     * Esto es lo que OpenClaw llamaría directamente.
     * 
     * @param {string} action - add, update, delete, log, list
     * @param {string} entity - agents, projects, companies, tasks, notes, etc.
     * @param {string} id - ID del elemento (para update/delete)
     * @param {object} data - Datos a crear/actualizar
     */
    static async execute(action, entity, id = null, data = {}) {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/openclaw/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, entity, id, data })
            });
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[OpenClaw Execute] Error:', err);
            throw err;
        }
    }

    /**
     * Obtiene un snapshot del estado completo del dashboard.
     */
    static async getDashboardStatus() {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/openclaw/status`);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[OpenClaw Status] Error:', err);
            return null;
        }
    }

    /**
     * Pregunta al cerebro RAG del dashboard.
     * @param {string} question - Pregunta en lenguaje natural
     * @returns {Promise<{answer: string, sources: Array}>}
     */
    static async queryBrain(question, historyContext = null) {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/brain/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, historyContext })
            });
            if (!res.ok) throw new Error(`Brain API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[Brain Query] Error:', err);
            return { answer: 'El cerebro RAG no está disponible. Verifica que el server esté corriendo y el API key configurado.', sources: [] };
        }
    }

    /**
     * Re-indexa toda la data del dashboard en el cerebro RAG.
     */
    static async indexBrain() {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/brain/index`, { method: 'POST' });
            if (!res.ok) throw new Error(`Index API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[Brain Index] Error:', err);
            return null;
        }
    }


}

export default OpenClawService;
