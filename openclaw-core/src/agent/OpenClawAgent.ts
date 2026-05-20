import { callOpenClawEngine, callOpenClawSynthesizer } from './openclawBridge.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { getDashboardData } from '../services/dashboardDB.js';
import { delegateToAntigravity } from '../tools/antigravityDelegator.js';
import { agentTools, executeTool } from '../tools/nativeTools.js';
import { memory } from '../memory/vectorStore.js';
import { classifyIntent } from './orchestrator/intent_classifier.js';
import { createPlan } from './orchestrator/planner.js';
import { routeAndGetPrompt } from './orchestrator/router.js';

// Load SOUL (System Prompt)
const soulPath = path.join(import.meta.dirname, '../../workspace/SOUL.md');
const SOUL_PROMPT = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf8') : "You are a helpful AI";

export class OpenClawAgent {
    constructor() {}

    async processCommand(userCommand: string): Promise<string> {
        try {
            console.log(`[OpenClaw] Processing command: ${userCommand}`);

            // Context Gathering
            const dashboardData = getDashboardData();
            
            // Vector Store Memory Context (RAG)
            const memoryContext = await memory.retrieveContext(userCommand);

            // Let's store this interaction async
            memory.storeMemory(`User: ${userCommand}`, { type: 'chat_history' });

            // Provide concise db context 
            const miniDBText = JSON.stringify({
                projects: dashboardData.projects?.map((p:any) => ({id: p.id, name: p.name, status: p.status, priority: p.priority})) || [],
                tasks: dashboardData.tasks?.length || 0,
                activeUsers: dashboardData.users?.map((u: any)=>u.name) || []
            });

            // Dynamically scan for installed skills
            const skillsDir = path.join(import.meta.dirname, '../../workspace/skills');
            let availableSkillsStr = "";
            if (fs.existsSync(skillsDir)) {
                try {
                    const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
                                        .filter(dirent => dirent.isDirectory())
                                        .map(dirent => dirent.name);
                    availableSkillsStr = skillDirs.map(s => `- ${s}`).join('\\n');
                } catch(e) {
                    availableSkillsStr = "Could not load skills.";
                }
            }


            // Get recent History multi-turn
            let recentHistory = "";
            try {
                const vaultPath = path.join(import.meta.dirname, '../../../BrainVault/ARSENAL/BartConversations.md');
                if (fs.existsSync(vaultPath)) {
                    const content = fs.readFileSync(vaultPath, 'utf8');
                    const blocks = content.split('\\n## [');
                    // Get the last 5 blocks
                    const lastBlocks = blocks.slice(-6);
                    recentHistory = lastBlocks.join('\\n## [').slice(0, 4000); // limit to 4000 chars to save context window
                }
            } catch(e) {
                console.error('[OpenClawAgent] Could not load history', e);
            }

            // --- ORQUESTADOR: INTENT -> PLANNER -> ROUTER ---
            const intent = await classifyIntent(userCommand);
            console.log(`[OpenClaw] Intención: ${intent.intent} (${intent.topic})`);
            
            const plan = await createPlan(userCommand, intent);
            console.log(`[OpenClaw] Plan de ${plan.steps.length} pasos | Delegado a: ${plan.targetWorker}`);
            
            const { workerAssigned, specializedPrompt } = routeAndGetPrompt(
                userCommand,
                intent,
                plan,
                memoryContext,
                miniDBText,
                recentHistory
            );

            // Re-ensamblar el prompt para la llamada base (Manteniendo SOUL y Skills info)
            const prompt = `
${SOUL_PROMPT}

========================
PIPELINE DE ORQUESTACIÓN ACTIVO: Eres el Motor Principal (Worker asignado: ${workerAssigned}).
Sigue firmemente el Prompt Especializado que recibiste del Router:

${specializedPrompt}
========================

SKILLS INSTALADOS (MÓDULOS DE EXPANSIÓN) EN \`${skillsDir}\`:
${availableSkillsStr}
(Usa \`readFile\` en \`${skillsDir}/<skill_name>/SKILL.md\` para ver instrucciones).

REGLAS DE ORO JARVIS:
- [NOTA/DOCUMENTO NUEVO]: Usa \`saveToBrainVault\` (en /INCUBATOR).
- [EJECUCIÓN NATIVA]: Haz las cosas directamente (\`browseAndScrapeWeb\`, \`runTerminalCommand\`, etc). No lo delegues a menos que te pidan explícitamente "delega a Nexus".
- Usa MUST usar Tool Calling real en tu JSON (no texto plano).
- Responde con Markdown Premium (tablas, negritas, viñetas asertivas). Ve al grano y con la data pesada.

USER COMMAND: ${userCommand}
`;

            let data = await callOpenClawEngine(prompt, userCommand, 'claude');
            const messageObj = data.choices?.[0]?.message;
            let reply = messageObj?.content || "No response generated";

            // Handle Function Calling
            if (messageObj?.tool_calls && messageObj.tool_calls.length > 0) {
                const call = messageObj.tool_calls[0].function;
                if (call && call.name && call.arguments) {
                    console.log(`[OpenClaw] LLM requested tool call: ${call.name}`);
                    let args;
                    try {
                        args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
                    } catch (e) {
                         args = {};
                    }
                    const toolExecutionResult = await executeTool(call.name, args);
                    
                    const innerPrompt = `
EJECUCIÓN DE HERRAMIENTA AUTOMÁTICA COMPLETADA:
Llamaste exitosamente a la herramienta: ${call.name}
El resultado crudo de la herramienta es: 
\`\`\`
${toolExecutionResult}
\`\`\`

INSTRUCCIÓN CRÍTICA:
Toma ese resultado de la herramienta y transfórmalo en una respuesta profunda, altamente estructurada y profesional para el usuario.
- Si hay listas de entidades, resultados de búsqueda, empresas o métricas, PRESÉNTALAS COMO TABLAS DE MARKDOWN o listas ricamente formateadas.
- No omitas información útil. Demuestra tu poder analítico estructurando los datos de forma "Premium". Tu objetivo es deslumbrar al usuario con la calidad del análisis.
`;
                    reply = await callOpenClawSynthesizer(prompt + "\\n\\n" + innerPrompt, "Muestra el resultado final al usuario.", 'claude');
                    
                    // Fallback just in case
                    if (!reply || reply.trim() === '') reply = `✅ Acción **${call.name}** ejecutada. Resultado: ${toolExecutionResult}`;
                    memory.storeMemory(`OpenClaw (Tool Execution final): ${reply}`, { type: 'tool_execution' });
                }
            } else {
                // Save normal text reply to memory 
                memory.storeMemory(`OpenClaw: ${reply}`, { type: 'chat_history' });
            }

            // Post-Processing: check if it delegates to Antigravity
            if (reply.includes('# TAREA DELEGADA')) {
                 const inboxStatus = delegateToAntigravity(reply);
                 // We can append the status 
                 reply = reply + "\\n\\n" + inboxStatus;
            }

            // CONECTAR Y ALMACENAR EN LA BOVEDA DE CEREBRO: BrainVault/ARSENAL/BartConversations.md
            try {
                const vaultPath = path.join(import.meta.dirname, '../../../BrainVault/ARSENAL/BartConversations.md');
                const timestamp = new Date().toLocaleString();
                const logEntry = `\n## [${timestamp}]\n**USER:** ${userCommand}\n\n**BART:** ${reply}\n`;
                if (fs.existsSync(vaultPath)) {
                    fs.appendFileSync(vaultPath, logEntry, 'utf-8');
                    // Index this single file directly in the RAG so the context updates IMMEDATELY
                    fetch('http://localhost:18791/api/rag/obsidian', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ vaultPath: path.dirname(vaultPath) })
                    }).catch(err => console.error('[Bart Memory] Error enviando al RAG:', err.message));
                }
            } catch (e) {
                console.error('[OpenClawAgent] Failed to write Bart memory to vault:', e);
            }

            return reply;

        } catch (error: any) {
            console.error("[OpenClawAgent] Error:", error);
            return `Internal AGENT error: ${error.message}`;
        }
    }
}
