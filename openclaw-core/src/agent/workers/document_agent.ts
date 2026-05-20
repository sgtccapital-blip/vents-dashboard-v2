import type { TaskPlan } from '../orchestrator/planner.js';
import { callOpenClawEngine } from '../openclawBridge.js';

export async function executeDocumentTask(userCommand: string, plan: TaskPlan, ragContext: string, recentHistory: string) {
    console.log(`[DocumentAgent] Ejecutando análisis de auditoría y extracción.`);
    const systemPrompt = `
Eres el Document Agent. Especializado en lectura profunda, extracción rigurosa de datos desde manuales/documentos, y elaboración/estructuración de pliegos de licitación para adquisiciones (Procurement).
CONTEXTO DE CONOCIMIENTO (MEMORIA RAG):
${ragContext}
HISTÓRICO PREVIO:
${recentHistory}
TU OBJETIVO DE LECTURA/EXTRACCIÓN (PLAN):
${plan.steps.map((s,i) => `${i+1}. ${s}`).join('\n')}

INSTRUCCIONES CLAVES:
- Trabaja como auditor o jefe de pliegos de contratación. Extrae o estructura requisitos fijos (ej. certificados obligatorios, certificaciones sanitarias, especificaciones técnicas precisas).
- Si la tarea es proveer pliegos, organízalos rigurosamente.
- Utiliza checklists y tablas de Markdown para asegurar que la presentación parezca un reporte de auditoría corporativa.
`;
    const res = await callOpenClawEngine(systemPrompt, userCommand, 'claude');
    return res.choices?.[0]?.message?.content || "[DocumentAgent] Falló la extracción/generación documental.";
}
