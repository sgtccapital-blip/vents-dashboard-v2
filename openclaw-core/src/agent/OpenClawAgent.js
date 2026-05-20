import { callOpenClawEngine, callOpenClawSynthesizer } from './openclawBridge.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { getDashboardData } from '../services/dashboardDB.js';
import { delegateToAntigravity } from '../tools/antigravityDelegator.js';
import { agentTools, executeTool } from '../tools/nativeTools.js';
import { memory } from '../memory/vectorStore.js';
// Load SOUL (System Prompt)
const soulPath = path.join(import.meta.dirname, '../../workspace/SOUL.md');
const SOUL_PROMPT = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf8') : "You are a helpful AI";
export class OpenClawAgent {
    constructor() { }
    async processCommand(userCommand) {
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
                projects: dashboardData.projects?.map((p) => ({ id: p.id, name: p.name, status: p.status, priority: p.priority })) || [],
                tasks: dashboardData.tasks?.length || 0,
                activeUsers: dashboardData.users?.map((u) => u.name) || []
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
                }
                catch (e) {
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
            }
            catch (e) {
                console.error('[OpenClawAgent] Could not load history', e);
            }
            const prompt = `
${SOUL_PROMPT}

========================
DASHBOARD DB STATE (Mini):
${miniDBText}

VIRTUAL MEMORY CONTEXT:
${memoryContext}

SKILLS INSTALADOS (MÓDULOS DE EXPANSIÓN):
Tienes acceso a los siguientes OpenClaw Skills instalados en \`${skillsDir}\`:
${availableSkillsStr}

Si necesitas usar una skill y no sabes cómo, usa \`readFile\` en \`${skillsDir}/<skill_name>/SKILL.md\` para leer sus instrucciones o dependencias.
========================

NOTEBOOK LM & ORCHESTRATION INSTRUCTIONS:
Eres OpenClaw, una entidad proactiva y ejecutora. Utiliza el "VIRTUAL MEMORY CONTEXT" provisto por el RAG para tu conocimiento. 
- [NOTA/DOCUMENTO NUEVO]: Si te piden investigar o guardar info, usa OBLIGATORIAMENTE \`saveToBrainVault\` (en /INCUBATOR).
- [EJECUCIÓN INMEDIATA (DEFAULT)]: Si el usuario te pide investigar (ej. buscar empresas), codificar, modificar archivos, buscar información o scrapearla: ¡HAZLO TÚ MISMO INMEDIATAMENTE! Usa \`browseAndScrapeWeb\`, \`readURLContent\`, \`runTerminalCommand\`, \`grepSearch\` u otras herramientas nativas para procesarlo directamente. NO LO DELEGUES. Tu prioridad es hacerlo tú y dar resultados directos, a menos que se te pida explícitamente delegar.
- [PAPERCLIP DELEGATION / AGENTS OFFICE]: *SOLO* si el usuario incluye la palabra explícita "delega", "asigna a Nexus/Atlas", o "usa paperclip", entonces SÓLO en ese caso usarás \`orchestrateWithPaperclip\` o \`delegateTaskToAgent\`. De lo contrario, asume que el usuario quiere que tú hagas el trabajo ahora mismo en vivo.

HISTORIAL RECIENTE DE LA CONVERSACIÓN:
${recentHistory}

USER COMMAND: ${userCommand}

REGLA DE ORO PARA TUS RESPUESTAS:
A partir de ahora, tienes PERMISO TOTAL para entregar respuestas detalladas, profundas y estructuradas. Eres Bart, un súper agente PRO de alto nivel empresarial.
- Usa tablas de Markdown, viñetas, negritas y estructura para que la información se vea increíblemente profesional y fácil de leer y escanear.
- NO ESTÁS LIMITADO a respuestas cortas. Si el usuario pide un ranking, listado o análisis, entrégale todo el contenido detalladamente y bien formateado.
- MANTÉN tu personalidad asertiva y ejecutora (como JARVIS): ve directo al grano, sin rodeos de cortesía excesivos, pero entregando la data completa.
- [CRÍTICO] NUNCA escribas llamadas a herramientas como 'searchWeb(...)' en texto plano; usa el Tool Calling internamente.
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
                    }
                    catch (e) {
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
                    if (!reply || reply.trim() === '')
                        reply = `✅ Acción **${call.name}** ejecutada. Resultado: ${toolExecutionResult}`;
                    memory.storeMemory(`OpenClaw (Tool Execution final): ${reply}`, { type: 'tool_execution' });
                }
            }
            else {
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
            }
            catch (e) {
                console.error('[OpenClawAgent] Failed to write Bart memory to vault:', e);
            }
            return reply;
        }
        catch (error) {
            console.error("[OpenClawAgent] Error:", error);
            return `Internal AGENT error: ${error.message}`;
        }
    }
}
//# sourceMappingURL=OpenClawAgent.js.map