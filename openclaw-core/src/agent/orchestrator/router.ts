import type { TaskPlan } from './planner.js';
import type { IntentClassification } from './intent_classifier.js';

export interface RouteResult {
    workerAssigned: string;
    specializedPrompt: string;
}

export function routeAndGetPrompt(
    userCommand: string, 
    intent: IntentClassification,
    plan: TaskPlan, 
    ragContext: string,
    miniDBText: string,
    recentHistory: string
): RouteResult {
    console.log(`[Router] Enrutando tarea a worker: ${plan.targetWorker} | Intent: ${intent.intent}`);
    
    let generatedPrompt = '';

    switch (plan.targetWorker) {
        case "ops":
            generatedPrompt = `Eres el Ops Agent (...). ESPECIALIDAD: Operaciones en terreno, logística, hardware, equipamiento técnico (ej. lavadoras industriales de barrera sanitaria), licitaciones.
CONTEXTO RAG DE PROYECTO:
${ragContext}
DB STATE:
${miniDBText}
TU OBJETIVO (PLAN):
${plan.steps.map((s,i) => `${i+1}. ${s}`).join('\n')}

INSTRUCCIONES: Responde con un análisis técnico y operativo. Usa tablas Markdown para requerimientos hídricos/eléctricos o infraestructura.`;
            break;
            
        case "finance":
            generatedPrompt = `Eres el Finance Agent. ESPECIALIDAD: Costos, ROI, Presupuestos, TCO, Capex/Opex de equipamiento (ej. inversión propia vs externalización de lavandería).
CONTEXTO RAG DE PROYECTO:
${ragContext}
TU OBJETIVO (PLAN FINANCIERO):
${plan.steps.map((s,i) => `${i+1}. ${s}`).join('\n')}

INSTRUCCIONES: Presenta comparativas numéricas, proyecta ahorros y presupuestos en tablas analíticas.`;
            break;

        case "document":
            generatedPrompt = `Eres el Document Agent. ESPECIALIDAD: Extracción profunda, estructuración de pliegos, cumplimiento normativo, grados y certificaciones sanitarias.
CONTEXTO RAG (DOCUMENTOS ENCONTRADOS):
${ragContext}
TU OBJETIVO (PLAN DOCUMENTAL):
${plan.steps.map((s,i) => `${i+1}. ${s}`).join('\n')}

INSTRUCCIONES: Extrae requisitos legales/técnicos, estructura checklists ("Auditoría de cumplimiento") y no dejes información al aire.`;
            break;

        case "general":
        default:
            generatedPrompt = `Eres OpenClaw, líder del Comando Central (Rol: General Worker). 
INTENT: ${intent.intent} (${intent.topic})

CONTEXTO RAG (MEMORIA):
${ragContext}

ESTADO DE BASE DE DATOS:
${miniDBText}

PLAN SUGERIDO:
${plan.steps.join('\n')}

INSTRUCCIONES DE EJECUCIÓN (MODO JARVIS):
Firma como OpenClaw. Da una respuesta ejecutiva y profunda. Usa herramientas (Tool Calling) activamente si necesitas buscar la web o información nativa.`;
            break;
    }

    // Agregar base SOUL o historia siempre
    generatedPrompt += `\n\nHISTORIAL RECIENTE:\n${recentHistory}`;

    return {
        workerAssigned: plan.targetWorker,
        specializedPrompt: generatedPrompt
    };
}
