import { callOpenClawEngine } from '../openclawBridge.js';

export interface IntentClassification {
    intent: "PROCUREMENT" | "ANALYSIS" | "DATA_EXTRACTION" | "GENERAL_CHAT" | "AUTOMATION";
    topic: string;
    urgency: "NORMAL" | "HIGH";
    requiresRAG: boolean;
}

export async function classifyIntent(userCommand: string): Promise<IntentClassification> {
    const prompt = `
Eres el Clasificador de Intenciones (Intent Classifier) del OpenClaw Core.
Analiza el comando del usuario y determina su intención principal.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
    "intent": "PROCUREMENT" | "ANALYSIS" | "DATA_EXTRACTION" | "GENERAL_CHAT" | "AUTOMATION",
    "topic": "breve resumen del tema (ej. lavadoras industriales geriátricas)",
    "urgency": "NORMAL" | "HIGH",
    "requiresRAG": true | false
}

- Usa "PROCUREMENT" para cotizaciones, búsqueda de proveedores o licitaciones.
- Usa "DATA_EXTRACTION" para leer manuales o PDFs.
- Usa "ANALYSIS" para evaluar costos, ROI o comparativas.
- Usa "AUTOMATION" para flujos de n8n o triggers externos.
- Asigna requiresRAG=true si es sobre un proyecto existente o requiere historial.
`;

    try {
        const res = await callOpenClawEngine(prompt, userCommand, 'claude');
        let content = res.choices?.[0]?.message?.content || "{}";
        
        // Limpiar cualquier formato de markdown
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(content) as IntentClassification;
    } catch (e) {
        console.error("[IntentClassifier] Error o JSON inválido, fallback a GENERAL_CHAT:", e);
        return { 
            intent: "GENERAL_CHAT", 
            topic: userCommand.slice(0, 50), 
            urgency: "NORMAL", 
            requiresRAG: true 
        };
    }
}
