/**
 * OpenJarvis Service
 * 
 * Este servicio establece la comunicación directa con el daemon local de OpenJarvis
 * corriendo en http://localhost:8000, compatible con la API de OpenAI.
 */

const JARVIS_API_URL = 'http://127.0.0.1:8000/v1';

class OpenJarvisService {
    /**
     * Verifica si el servidor local de OpenJarvis está activo.
     */
    static async checkHealth() {
        try {
            // El endpoint /v1/models de Jarvis siempre debe retornar la lista local
            const res = await fetch(`${JARVIS_API_URL}/models`);
            return res.ok;
        } catch {
            return false;
        }
    }

    /**
     * Obtiene el modelo activo en Jarvis
     */
    static async getModels() {
        try {
            const res = await fetch(`${JARVIS_API_URL}/models`);
            if (res.ok) {
                const data = await res.json();
                return data.data || [];
            }
            return [];
        } catch {
            return [];
        }
    }

    /**
     * Envía un mensaje a Jarvis. Soporta manejo de strings simple
     * y simulación de delay para mejorar la experiencia de UI.
     * @param {string} prompt - El input del usuario
     * @param {array} history - Historial de mensajes previos [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
     * @returns {Promise<string>}
     */
    static async chat(prompt, history = []) {
        try {
            // Append latest prompt
            const messages = [...history, { role: 'user', content: prompt }];
            
            const reqBody = {
                model: 'qwen3:8b', // Se ignora en Jarvis local si ya tiene su predeterminado, pero es seguro pasarlo
                messages: messages,
                temperature: 0.7
            };

            const response = await fetch(`${JARVIS_API_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reqBody)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Error de la API de Jarvis');
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('[OpenJarvis] Chat Error:', error);
            throw new Error('No se pudo conectar con el Cerebro Local de Jarvis. Asegúrate de iniciar el daemon usando: uv run jarvis start');
        }
    }
}

export default OpenJarvisService;
