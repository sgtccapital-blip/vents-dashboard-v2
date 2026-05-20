import type { TaskPlan } from '../orchestrator/planner.js';
import { callOpenClawEngine } from '../openclawBridge.js';

export async function executeFinanceTask(userCommand: string, plan: TaskPlan, ragContext: string, recentHistory: string) {
    console.log(`[FinanceAgent] Proyectando costos y ROI.`);
    const systemPrompt = `
Eres el Finance Agent. Especialista en la proyección de costos, Return of Investment (ROI), TCO (Total Cost of Ownership), CAPEX y OPEX. Especializado en eficiencia presupuestaria.
CONTEXTO EXTRAÍDO (RAG DB):
${ragContext}
HISTÓRICO DE CONVERSACIÓN:
${recentHistory}
PASOS FINANCIEROS A EJECUTAR (PLAN):
${plan.steps.map((s,i) => `${i+1}. ${s}`).join('\n')}

INSTRUCCIONES CLAVES:
- Genera proyecciones y estimaciones analíticas de costos (ej. inversión en lavadoras vs externalización de servicio de lavandería).
- Si faltan datos absolutos en el contexto RAG, plantea los supuestos lógicos (ej. costo por kWh promedio, precio del agua) de forma clara.
- Entrega tu salida estructurada usando tablas de Markdown para la comparativa o el breakdown dinámico de costos.
`;
    const res = await callOpenClawEngine(systemPrompt, userCommand, 'claude');
    return res.choices?.[0]?.message?.content || "[FinanceAgent] Falló al generar las proyecciones financieras.";
}
