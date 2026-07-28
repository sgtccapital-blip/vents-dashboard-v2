import { GoogleGenerativeAI } from '@google/generative-ai';
import RagIndexer from './RagIndexer';

/**
 * NativeBrainService — Cliente IA In-Browser (100% Frontend)
 * Orquesta conversaciones y consultas RAG usando directamente la API de Google Gemini (o proxy).
 */
class NativeBrainService {
    static getApiKey() {
        return localStorage.getItem('__openclaw_native_api_key') || '';
    }

    static setApiKey(key) {
        localStorage.setItem('__openclaw_native_api_key', key);
    }

    static isConfigured() {
        return !!this.getApiKey();
    }

    static async getEngine() {
        const key = this.getApiKey();
        if (!key) throw new Error('API Key de IA no configurada.');
        return new GoogleGenerativeAI(key);
    }

    /**
     * Orquesta una acción o conversación directa con el LLM en el frontend.
     */
    static async sendCommand(prompt, historyContext = [], systemContext = '', namespace = 'default') {
        try {
            console.log(`[NativeBrain] Sending:`, prompt);
            const genAI = await this.getEngine();
            
            // Inyección RAG desde la nube
            const localDocs = await RagIndexer.getDocuments(namespace);
            let ragContext = '';
            if (localDocs.length > 0) {
                ragContext = "CONOCIMIENTO LOCAL DEL SISTEMA RAG:\n" + localDocs.map(d => `--- Archivo: ${d.filename} ---\n${d.content}`).join('\n\n');
            }

            // Usamos un modelo flash, ligero y rapido
            const model = genAI.getGenerativeModel({ 
                model: 'gemini-1.5-flash',
                systemInstruction: `Eres la Inteligencia OpenClaw del Dashboard Vents.\nTu rol es ayudar al operador a orquestar eventos, leads y redes sociales.\n\n${ragContext}\n\n${systemContext}`
            });

            const chat = model.startChat({
                history: historyContext.map(msg => ({
                    role: msg.role === 'bot' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }))
            });

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('[NativeBrain] Error:', error);
            throw new Error(error.message || 'Error comunicándose con el cerebro IA.');
        }
    }

    /**
     * Consulta el cerebro RAG (IndexedDB / LocalStorage)
     */
    static async queryBrain(question) {
        if (!this.isConfigured()) return { answer: 'Por favor configura tu API Key primero.', sources: [] };
        
        try {
            // Fase 2: Aquí inyectaremos los documentos extraídos de IndexedDB
            const contextText = "No hay documentos cargados localmente en este namespace aún.";
            
            const prompt = `Usa el siguiente contexto para responder a la pregunta. Si la respuesta no está en el contexto, dilo.\n\nCONTEXTO:\n${contextText}\n\nPREGUNTA:\n${question}`;
            
            const reply = await this.sendCommand(prompt, []);
            return { answer: reply, sources: [] };
        } catch (err) {
            console.error('[NativeBrain RAG Query] Error:', err);
            return { answer: 'Error consultando la base de datos de conocimiento.', sources: [] };
        }
    }
}

export default NativeBrainService;
