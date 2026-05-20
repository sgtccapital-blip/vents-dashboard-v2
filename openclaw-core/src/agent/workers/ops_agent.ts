import type { TaskPlan } from '../orchestrator/planner.js';
import { callOpenClawEngine } from '../openclawBridge.js';

export async function executeOpsTask(userCommand: string, plan: TaskPlan, ragContext: string, recentHistory: string) {
    console.log(`[OpsAgent] Ejecutando plan con ${plan.steps.length} pasos.`);
    const systemPrompt = `
Eres el Ops Agent especializado en logística, infraestructura, sourcing y licitaciones (equipamiento industrial como lavadoras, operaciones de campo, dimensionamiento de instalaciones).
CONTEXTO RAG DE PROYECTO:
${ragContext}
HISTÓRICO RECIENTE:
${recentHistory}
TU OBJETIVO (PLAN A EJECUTAR):
${plan.steps.map((s,i) => `${i+1}. ${s}`).join('\n')}

INSTRUCCIONES:
- Responde con un análisis operativo y logístico altamente estructurado.
- Si el contexto habla de geriátricos o lavadoras, analiza los requerimientos técnicos implicados (lavadoras de barrera sanitaria, volumen de ropa paciente/día, hídricos/eléctricos).
- Organiza tu reporte final en secciones claras con viñetas o tablas Markdown.
`;
    // We execute the specialized prompt
    const res = await callOpenClawEngine(systemPrompt, userCommand, 'claude');
    return res.choices?.[0]?.message?.content || "[OpsAgent] Falló al generar la respuesta operativa.";
}
