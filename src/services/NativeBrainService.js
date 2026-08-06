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
    static async sendCommand(prompt, historyContext = [], systemContext = '', namespace = 'default', contextCallbacks = null) {
        try {
            console.log(`[NativeBrain] Sending:`, prompt);
            const genAI = await this.getEngine();
            
            // Inyección RAG desde la nube
            const localDocs = await RagIndexer.getDocuments(namespace);
            let ragContext = '';
            if (localDocs.length > 0) {
                ragContext = "CONOCIMIENTO LOCAL DEL SISTEMA RAG:\n" + localDocs.map(d => `--- Archivo: ${d.filename} ---\n${d.content}`).join('\n\n');
            }

            // Herramientas (Function Calling)
            const tools = [
                {
                    functionDeclarations: [
                        {
                            name: "create_task",
                            description: "Crea una nueva tarea en el dashboard (To-Do List). Usa esta función si el operador te pide agregar, crear o agendar una tarea.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    text: { type: "STRING", description: "Descripción detallada de la tarea a realizar" },
                                    priority: { type: "STRING", description: "Prioridad de la tarea (alta, media, baja)" }
                                },
                                required: ["text", "priority"]
                            }
                        },
                        {
                            name: "create_event",
                            description: "Crea un nuevo evento en el calendario de eventos. Usa esta función si el operador te pide crear, agendar o añadir un evento.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING", description: "Nombre del evento" },
                                    date: { type: "STRING", description: "Fecha del evento en formato YYYY-MM-DD" },
                                    location: { type: "STRING", description: "Lugar del evento" }
                                },
                                required: ["name", "date"]
                            }
                        }
                    ]
                }
            ];

            // Usamos un modelo flash, ligero y rapido
            const model = genAI.getGenerativeModel({ 
                model: 'gemini-1.5-flash',
                systemInstruction: `Eres la Inteligencia OpenClaw del Dashboard Vents.\nTu rol es ayudar al operador a orquestar eventos, leads y redes sociales.\n\n${ragContext}\n\n${systemContext}`,
                tools: contextCallbacks ? tools : undefined
            });

            const chat = model.startChat({
                history: historyContext.map(msg => ({
                    role: msg.role === 'bot' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }))
            });

            const result = await chat.sendMessage(prompt);
            let response = await result.response;
            
            const functionCalls = response.functionCalls ? response.functionCalls() : [];
            
            if (functionCalls && functionCalls.length > 0 && contextCallbacks) {
                for (const call of functionCalls) {
                    let functionResult = {};
                    console.log("[NativeBrain] Ejecutando function call:", call.name, call.args);
                    try {
                        if (call.name === 'create_task' && contextCallbacks.addTask) {
                            const newTask = {
                                id: `task-${Date.now()}`,
                                text: call.args.text,
                                priority: call.args.priority || 'media',
                                done: false
                            };
                            await contextCallbacks.addTask(newTask);
                            functionResult = { success: true, message: `Tarea agregada exitosamente: ${newTask.text}` };
                            if (contextCallbacks.addActivity) contextCallbacks.addActivity(`✅ Tarea creada vía AI: ${newTask.text}`, '#10b981');
                        } else if (call.name === 'create_event' && contextCallbacks.addEvent) {
                            const newEvent = {
                                id: `ev-${Date.now()}`,
                                name: call.args.name,
                                date: call.args.date,
                                location: call.args.location || '',
                                status: 'planning',
                                kpi: '0/0'
                            };
                            await contextCallbacks.addEvent(newEvent);
                            functionResult = { success: true, message: `Evento agregado exitosamente: ${newEvent.name}` };
                            if (contextCallbacks.addActivity) contextCallbacks.addActivity(`✅ Evento creado vía AI: ${newEvent.name}`, '#10b981');
                        } else {
                            functionResult = { success: false, message: `Función ${call.name} no soportada localmente.` };
                        }
                    } catch (err) {
                        console.error("[NativeBrain] Error en function call:", err);
                        functionResult = { success: false, error: err.message };
                    }
                    
                    // Respondemos al modelo con el resultado de la función para que genere la respuesta en texto final
                    const result2 = await chat.sendMessage([{
                        functionResponse: {
                            name: call.name,
                            response: functionResult
                        }
                    }]);
                    response = await result2.response;
                }
            }

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
