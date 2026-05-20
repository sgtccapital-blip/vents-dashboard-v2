import { callOpenClawEngine } from '../openclawBridge.js';
import type { IntentClassification } from './intent_classifier.js';

export interface TaskPlan {
    steps: string[];
    requiredContext: string[]; // Ej: "capacidad lavadoras", "ROI esperado"
    targetWorker: "ops" | "finance" | "document" | "general";
}

export async function createPlan(userCommand: string, intent: IntentClassification): Promise<TaskPlan> {
    const prompt = `
Eres el Task Planner del motor OpenClaw. 
El usuario ha emitido un comando con la siguiente intención detectada:
INTENT: ${intent.intent}
TOPIC: ${intent.topic}
URGENCY: ${intent.urgency}

Tu trabajo es generar un plan de ejecución de 1 a 3 pasos atómicos y dictaminar qué agente especializado (worker) debe encargarse.
Workers disponibles:
- "ops": Operaciones en terreno, logística, hardware, equipamiento técnico (ej. lavadoras industriales, licitaciones operativas).
- "finance": Cálculos matemáticos, ROI, presupuestos, Opex/Capex, viabilidad financiera.
- "document": Extracción profunda de PDFs, validación de manuales técnicos, análisis de pliegos.
- "general": Búsquedas generales, saludos, o acciones delegadas al asistente base sin especialidad.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
    "steps": ["Paso 1...", "Paso 2..."],
    "requiredContext": ["contexto necesario 1", "contexto 2"],
    "targetWorker": "ops" | "finance" | "document" | "general"
}
`;

    try {
        const res = await callOpenClawEngine(prompt, userCommand, 'claude');
        let content = res.choices?.[0]?.message?.content || "{}";
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(content) as TaskPlan;
    } catch (e) {
        console.error("[Planner] Error o JSON inválido, fallback al general:", e);
        return { 
            steps: ["Procesar consulta base"], 
            requiredContext: [], 
            targetWorker: "general" 
        };
    }
}
