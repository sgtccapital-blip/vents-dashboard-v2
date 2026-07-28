/**
 * OpenCloud Service — Native API Client
 * 
 * Replaces the old OpenClawService. Handles communication with the local Edge 
 * server (3001) where the OpenCloud Engine resides.
 */

const COMMAND_CENTER_API = '/api';

class OpenCloudService {
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

    /** Alias used by AgentsOffice */
    static async checkConnection() {
        return this.checkAPIHealth();
    }



    static async getActivityFeed() {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/activity`);
            if (!res.ok) return [];
            return await res.json();
        } catch {
            return [];
        }
    }



    /**
     * Orquesta una acción o conversacion directo con el OpenCloud Engine.
     */
    static async sendCommand(prompt, historyContext = []) {
        try {
            console.log(`[OpenCloud] Sending to Orchestrator:`, prompt);

            const apiOnline = await this.checkAPIHealth();
            if (!apiOnline) {
                return `[Offline] Servidor API no disponible. Conectar API (node server.js).`;
            }

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

            const res = await fetch(`${COMMAND_CENTER_API}/opencloud/orchestrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, historyContext })
            });

            if (!res.ok) {
                throw new Error(`Orchestrator returned ${res.status}`);
            }

            const data = await res.json();
            
            let finalMsg = data.message || '';
            if (data.type === 'ACTION_EXECUTED' && data.actionDetails && data.actionDetails.length > 0) {
                finalMsg += `\n\n*(Acciones Completadas en Background)*:\n${data.actionDetails.map(d => `- ${d}`).join('\n')}`;
            }

            return finalMsg;
        } catch (error) {
            console.error('Error enviando comando a OpenCloud:', error);
            throw new Error('No se pudo procesar el comando. Verifica que el API server esté corriendo.');
        }
    }

    /**
     * Execute structured DB mutation (Legacy backward compat).
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
            console.error('[OpenCloud Execute] Error:', err);
            throw err;
        }
    }

    static async getDashboardStatus() {
        try {
            const res = await fetch(`${COMMAND_CENTER_API}/openclaw/status`);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('[OpenCloud Status] Error:', err);
            return null;
        }
    }

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
            return { answer: 'El cerebro RAG no está disponible. Verifica que el server esté corriendo.', sources: [] };
        }
    }

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

export default OpenCloudService;
