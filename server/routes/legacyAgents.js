/**
 * Endpoints para agentes externos (con API_TOKEN): orquestador, memoria compartida,
 * ejecución de agentes nativos, skills y OpenCloud. El dashboard no los usa directamente.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import openCloudEngine from '../openCloudEngine.js';

// Este módulo es ESM: `require` no existe por defecto (lo usan las skills locales legacy)
const require = createRequire(import.meta.url);

export function registerLegacyAgentRoutes(app, ctx) {
    const { readDB, writeDB, geminiKeyFor, AGENTS_WORKSPACE_PATH, VAULT_PATH } = ctx;

    // ─── Orchestrator Engine (Auto-Delegation & Cron) ────────────────
    app.post('/api/orchestrator/delegate', (req, res) => {
        const { task } = req.body;
        let { description } = req.body;
        if (!task) return res.status(400).json({ error: 'Falta tarea' });

        // Triage Logic (Decision Tree)
        let assignedAgent = 'Bart (COO)';
        let actionType = 'openclaw';
        const tLower = (task + " " + (description||'')).toLowerCase();

        if (tLower.includes('licitaci') || tLower.includes('pliego') || tLower.includes('panamacompra')) {
            assignedAgent = 'Sentinel (Analyst)';
        } else if (tLower.includes('redes') || tLower.includes('social') || tLower.includes('post') || tLower.includes('copy')) {
            assignedAgent = 'Echo (Social)';
        } else if (tLower.includes('campaña') || tLower.includes('ads') || tLower.includes('growth')) {
            assignedAgent = 'Nexus (Marketing)';
        } else if (tLower.includes('costo') || tLower.includes('proveedor') || tLower.includes('cotizar')) {
            assignedAgent = 'Scout (Sourcing)';
        } else if (tLower.includes('inventario') || tLower.includes('stock') || tLower.includes('entrega') || tLower.includes('logistica')) {
            assignedAgent = 'Atlas (Logistics)';
        } else if (tLower.includes('lead') || tLower.includes('crm') || tLower.includes('vender') || tLower.includes('prospecto')) {
            assignedAgent = 'CloserOps (Sales)';
        } else if (tLower.includes('whatsapp') || tLower.includes('comunidad') || tLower.includes('broadcast') || tLower.includes('difusion') || tLower.includes('cartelera')) {
            assignedAgent = 'Pulse (WhatsApp & Community)';
        } else if (tLower.includes('codigo') || tLower.includes('ui ') || tLower.includes('frontend') || tLower.includes('react')) {
            assignedAgent = 'Antigravity (Engineer)';
            actionType = 'antigravity_inbox';
        }

        const db = readDB();
        if (!db.agentTasks) db.agentTasks = [];
        if (!db.circuitBreakers) db.circuitBreakers = [];

        // 1. Priority Scoring Engine
        const roi = parseFloat(req.body.roi) || 5;
        const urge = parseFloat(req.body.urgency) || 5;
        const strat = parseFloat(req.body.strategic) || 5;
        const risk = parseFloat(req.body.risk) || 5;
        const priorityScore = parseFloat(((roi * 0.4) + (urge * 0.3) + (strat * 0.2) + (risk * -0.1)).toFixed(1));

        // 2. Autonomy Levels
        const impactEstimate = parseFloat(req.body.impactEstimate) || 0;
        let autonomyLevel = 1;
        let status = priorityScore > 7 ? 'in_progress' : 'pending';

        if (impactEstimate > 25000) { autonomyLevel = 4; status = 'blocked_auth'; }
        else if (impactEstimate > 5000) { autonomyLevel = 3; status = 'blocked_auth'; }
        else if (impactEstimate > 500) { autonomyLevel = 2; }

        // 3. Fallback Chain / Circuit Breaker Check
        const breaker = db.circuitBreakers.find(cb => cb.agent === assignedAgent);
        if (breaker && breaker.status === 'frozen') {
            const hoursFrozen = (Date.now() - new Date(breaker.timestamp).getTime()) / 3600000;
            if (hoursFrozen < 24) {
                assignedAgent = 'Bart (COO)'; // Escalation fallback
                description = `[FALLBACK RE-ROUTE] Agent Frozen: ${description}`;
            } else {
                breaker.status = 'active'; // Recover after 24h
            }
        }

        const newTask = {
            id: `atask-${Date.now()}`,
            task,
            description: description || '',
            priorityScore,
            autonomyLevel,
            impactEstimate,
            status, // pending, in_progress, blocked_auth
            assignedAgent,
            actionType,
            createdAt: new Date().toISOString()
        };

        db.agentTasks.push(newTask);

        // Si es para Antigravity, generar el archivo en _agent_inbox/
        if (actionType === 'antigravity_inbox') {
            const safeName = task.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const fileName = `TASK_${new Date().toISOString().split('T')[0].replace(/-/g,'')}_${safeName}.md`;
            const inboxPath = path.join(VAULT_PATH, fileName);
            const content = `---
    FROM: Orchestrator
    TO: Antigravity
    PRIORITY_SCORE: ${priorityScore}
    AUTONOMY_LEVEL: ${autonomyLevel}
    STATUS: ${status}
    ---

    # TAREA AUTOMÁTICA DE ORCHESTRATOR
    ${task}

    # CONTEXTO Y DESCRIPCIÓN
    ${description || 'Implementar lo solicitado basándote en el diseño visual del Dashboard (dark mode, Tailwind, lucide-react).'}
    `;
            fs.writeFileSync(inboxPath, content);

            if (!db.activityFeed) db.activityFeed = [];
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `⚡ Orquestador delegó tarea UI a Antigravity: "${task}"`,
                color: '#8b5cf6',
                timestamp: new Date().toISOString()
            });
        } else {
            // Enviar silenciosamente al activity feed 
            if (!db.activityFeed) db.activityFeed = [];
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🎯 Orquestador encoló a ${assignedAgent} [Score: ${priorityScore} | Lvl: ${autonomyLevel}]: "${task}"`,
                color: priorityScore > 7 ? '#ef4444' : '#10b981',
                timestamp: new Date().toISOString()
            });
        }

        db.activityFeed = db.activityFeed.slice(0, 50);
        writeDB(db);

        res.status(201).json({ success: true, delegatedTo: assignedAgent, priorityScore, autonomyLevel, status, actionType, task: newTask });
    });

    // ─── Shared Hybrid Memory Layer ────────────────────────────────
    app.post('/api/orch/memory', async (req, res) => {
        const { type, agent, context, insight, action, result } = req.body;
        if (!agent || !insight) return res.status(400).json({ error: 'Falta agente o insight' });

        const db = readDB();
        if (!db.agentMemory) db.agentMemory = [];

        const memEntry = {
            id: `mem-${Date.now()}`, type: type || 'learning', agent, context, insight, action, result, timestamp: new Date().toISOString()
        };
        db.agentMemory.push(memEntry);
        writeDB(db);

        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) {
            try {
                await RAGEngine.upsertEntity('agentMemory', memEntry);
                return res.status(201).json({ success: true, memory: memEntry, sync: 'hybrid' });
            } catch (e) {
                console.error('[Memory] RAG Upsert failed:', e.message);
            }
        }

        res.status(201).json({ success: true, memory: memEntry, sync: 'local_only' });
    });

    // ─── Native Agent Execution Engine (The "OpenClaw" Replacer) ───
    app.post('/api/orch/execute-task', async (req, res) => {
        let { taskId, agentName, task, description, companyId, companyName } = req.body;

        // Auto-filler si solo llega el taskId desde la UI o el auto-pilot loop
        if (taskId && (!agentName || !task)) {
            const db = readDB();
            const queuedTask = (db.agentTasks || []).find(t => t.id === taskId);
            if (queuedTask) {
                agentName = queuedTask.assignedTo || queuedTask.assignedAgent || 'Auto-Agent';
                task = queuedTask.task;
                description = queuedTask.description;
                companyId = companyId || queuedTask.companyId || '';
                companyName = companyName || queuedTask.companyName || '';
            }
        }

        if (!agentName || !task) return res.status(400).json({ error: 'Missing agentName or task' });

        // ── Company → Namespace Mapping ──
        const namespaceMap = {
            'panamerican-bc': 'panamerican',
            'inversiones-lbl': 'lbl',
            'sabores-panama': 'lbl',
            'gabmar-investments': 'gabmar',
            'novatech-solutions': 'novatech',
            'metro-supply': 'metro',
        };
        const namespace = namespaceMap[companyId] || 'default';

        console.log(`\n[Execute] ═══════════════════════════════════════════`);
        console.log(`[Execute] Task: ${task}`);
        console.log(`[Execute] Agent: ${agentName}`);
        console.log(`[Execute] Company: ${companyName || 'N/A'} → Namespace: ${namespace}`);
        console.log(`[Execute] ═══════════════════════════════════════════`);

        try {
            const RAGEngine = app.get('ragEngine');
            if (!RAGEngine) throw new Error('RAG Engine not loaded');

            // 1. Load Agent SOP
            let sopContent = "Eres un asistente AI operativo del Command Center OS.";
            const safeAgentName = agentName.split(' ')[0]; // E.g., "Bart (COO)" -> "Bart"
            try {
                const files = fs.readdirSync(AGENTS_WORKSPACE_PATH);
                const sopFile = files.find(f => f.toLowerCase().includes(safeAgentName.toLowerCase()));
                if (sopFile) {
                    sopContent = fs.readFileSync(path.join(AGENTS_WORKSPACE_PATH, sopFile), 'utf-8');
                    console.log(`[Execute] ✅ SOP loaded: ${sopFile}`);
                } else {
                    console.log(`[Execute] ⚠️ No SOP found for ${safeAgentName}, using default`);
                }
            } catch { console.warn(`[Execute] Could not load SOP for ${safeAgentName}`); }

            // 2. Fetch RAG Context from the correct namespace
            console.log(`[Execute] Querying RAG namespace "${namespace}"...`);
            const ragQuery = `Contexto necesario para la empresa ${companyName || 'del ecosistema'} para realizar la tarea: ${task}. ${description || ''}`;
            const ragResult = await RAGEngine.query(ragQuery, 5, namespace);
            const memoryContext = ragResult.context || 'Sin contexto RAG disponible para esta empresa.';
            const ragSources = (ragResult.sources || []).map(s => `${s.category}: ${s.title}`).join(', ');
            console.log(`[Execute] ✅ RAG returned context (sources: ${ragSources || 'none'})`);

            // 3. Also query root namespace for cross-company ecosystem context
            let ecosystemContext = '';
            try {
                const ecoResult = await RAGEngine.query(`Información general del ecosistema relevante para: ${task}`, 2);
                ecosystemContext = ecoResult.context || '';
            } catch { /* silent */ }

            // 4. Build the full execution prompt
            const fullPrompt = `INSTRUCCIONES DEL SISTEMA (SOP DEL AGENTE):
    ${sopContent}

    EMPRESA/CLIENTE:
    ${companyName || 'Ecosistema General'}

    CONTEXTO DE LA EMPRESA (RAG - Namespace: ${namespace}):
    ${memoryContext}

    CONTEXTO GENERAL DEL ECOSISTEMA:
    ${ecosystemContext || 'N/A'}

    TAREA A EJECUTAR:
    ${task}

    DETALLES ADICIONALES:
    ${description || 'Ninguno'}

    INSTRUCCIÓN CRÍTICA:
    Eres ${agentName}. Ejecuta la tarea con precisión, usando todo el contexto disponible de la empresa. 
    Tu respuesta debe ser el RESULTADO FINAL de la tarea — no digas que "la harás", HAZLA.
    Si es un manual, escríbelo. Si es un análisis, analiza. Si es una estrategia, desarróllala.
    Sé claro, completo y usa markdown para formatear.`;

            // 5. Call Gemini for real execution
            const activeDb = readDB();
            const agentConfig = (activeDb.agents || []).find(a => a.name === agentName);
            const modelId = agentConfig?.model || 'gemini-2.5-flash';

            console.log(`[Execute] Calling Gemini (${modelId}) for ${agentName}...`);

            let finalResult;
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const genai = new GoogleGenAI({ apiKey: geminiKeyFor(readDB()) });
                const response = await genai.models.generateContent({
                    model: modelId,
                    contents: fullPrompt,
                    config: { maxOutputTokens: 4096 }
                });
                finalResult = response.text || 'Gemini no devolvió contenido.';
                console.log(`[Execute] ✅ Gemini execution complete (${finalResult.length} chars)`);
            } catch (geminiErr) {
                console.error(`[Execute] ⚠️ Gemini call failed: ${geminiErr.message}`);
                finalResult = `⚠️ Gemini no disponible. Contexto RAG recuperado:\n\n${memoryContext}`;
            }

            // 6. Save Result and Update DB
            const db = readDB();

            if (taskId) {
                const taskIdx = (db.agentTasks || []).findIndex(t => t.id === taskId);
                if (taskIdx !== -1) {
                    db.agentTasks[taskIdx].status = 'completed';
                    db.agentTasks[taskIdx].completedAt = new Date().toISOString();
                    db.agentTasks[taskIdx].result = finalResult;
                    db.agentTasks[taskIdx].namespace = namespace;
                    db.agentTasks[taskIdx].ragSources = ragSources;
                }
            }

            // Log Activity
            if (!db.activityFeed) db.activityFeed = [];
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `✅ ${agentName} completó la tarea: "${task.substring(0, 50)}" [${companyName || 'General'}]`,
                color: '#10b981',
                timestamp: new Date().toISOString()
            });
            db.activityFeed = db.activityFeed.slice(0, 50);
            writeDB(db);

            console.log(`[Execute] ═══ DONE ═══\n`);

            res.json({ success: true, result: finalResult, namespace, ragSources });

        } catch (err) {
            console.error('[Execute] Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Native Agent Skills & Chat ──────────────────────────────────
    const SKILLS_WORKSPACE_PATH = path.join(process.env.HOME || '/Users/gg', '.openclaw/workspace/skills');

    // Ensure Skills directory exists
    if (!fs.existsSync(SKILLS_WORKSPACE_PATH)) {
        fs.mkdirSync(SKILLS_WORKSPACE_PATH, { recursive: true });
    }

    app.get('/api/skills', (req, res) => {
        try {
            const files = fs.readdirSync(SKILLS_WORKSPACE_PATH).filter(f => f.endsWith('.js'));
            const skills = files.map(f => {
                try {
                    // Dynamically require the metadata of the `.js` file
                    const skillModule = require(path.join(SKILLS_WORKSPACE_PATH, f));
                    return {
                        name: skillModule.name,
                        description: skillModule.description,
                        parameters: skillModule.parameters || {},
                        filename: f
                    };
                } catch { return null; }
            }).filter(Boolean);
            res.json(skills);
        } catch (e) {
            console.error("Error reading skills:", e);
            res.status(500).json({ error: e.message });
        }
    });

    // Deshabilitado: escribía un .js con contenido arbitrario en el servidor y lo ejecutaba (require),
    // es decir, ejecución remota de código para cualquiera con sesión. Nada del dashboard lo usa;
    // las habilidades de Bart viven en tu OpenClaw (~/.openclaw/skills).
    app.post('/api/skills', (req, res) => {
        res.status(410).json({ error: 'Deshabilitado por seguridad: las habilidades se instalan en OpenClaw (~/.openclaw/skills), no en el servidor.' });
    });

    app.post('/api/orch/chat', async (req, res) => {
        const { message, context } = req.body; // Removed agentName constraint, assuming we talk to Central Orchestrator
        if (!message) return res.status(400).json({ error: 'Missing message' });

        console.log(`\n[Orchestrator Chat] Received: "${message}"`);

        try {
            const RAGEngine = app.get('ragEngine');

            // Load Skills Metadata for Prompt
            let skillsForPrompt = [];
            let loadedSkills = {};
            try {
                const files = fs.readdirSync(SKILLS_WORKSPACE_PATH).filter(f => f.endsWith('.js'));
                for(const f of files) {
                    try {
                        const skillPath = path.join(SKILLS_WORKSPACE_PATH, f);
                        delete require.cache[require.resolve(skillPath)];
                        const skillModule = require(skillPath);
                        if(skillModule.name) {
                            loadedSkills[skillModule.name] = skillModule;
                            skillsForPrompt.push(`- ${skillModule.name}: ${skillModule.description}. Payload Params: ${JSON.stringify(skillModule.parameters)}`);
                        }
                    } catch { console.warn("Failed loading skill", f); }
                }
            } catch { /* sin skills locales */ }

            const db = readDB();
            let ragContext = '';
            try {
                if (RAGEngine && message) {
                    const ragResult = await RAGEngine.query(String(message), 5);
                    ragContext = ragResult?.context || '';
                }
            } catch (e) {
                console.warn('[Orchestrator Chat] RAG query failed:', e.message);
            }
            if (!ragContext) {
                try {
                    const q = String(message || '').trim().toLowerCase();
                    const sources = [
                        ...(db.brainVault || []),
                        ...(db.agentMemory || []),
                        ...(db.activityFeed || []),
                        ...(db.agentIntelVault || []),
                        ...(db.projects || []),
                        ...(db.tasks || []),
                        ...(db.companies || [])
                    ];
                    const hits = sources
                        .filter(Boolean)
                        .filter(item => JSON.stringify(item).toLowerCase().includes(q.slice(0, 12)) || q.length < 4)
                        .slice(0, 5);
                    ragContext = hits.map((h, i) => `[#${i+1}] ${JSON.stringify(h).slice(0, 900)}`).join('\n');
                } catch {
                    ragContext = '';
                }
            }

            console.log(`[Orchestrator Chat] Processing via Gemini for Bart...`);
            let aiText = '';

            try {
                const genAI = new GoogleGenerativeAI(geminiKeyFor(readDB()));
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const db = readDB(); // Refresh DB context if needed

                const availableAgentsContext = (db.agents || []).map(a => `- ${a.name} (Rol: ${a.role || 'NA'}, Status: ${a.status || 'standby'}, Tarea actual: ${a.description || 'ninguna'})`).join('\n');
                const pendingAgentTasks = (db.agentTasks || []).filter(t => t.status !== 'completed').map(t => `- Tarea: ${t.task} (Asignada a: ${t.assignedTo}, Status: ${t.status}, Prioridad: ${t.priorityScore})`).join('\n');

                const systemPrompt = `You are Bart, the COO and Lead Agent Orchestrator of the Command Center dashboard.
    You are professional, concise, and incredibly capable. Provide short, punchy responses.

    Your live dashboard ecosystem context:
    Agents Available:
    ${availableAgentsContext || 'No hay agentes registrados.'}

    Pending Agent Tasks:
    ${pendingAgentTasks || 'No hay tareas de agentes pendientes.'}

    Contexto extra/memoria (si la hay):
    ${ragContext ? ragContext : "No relevant memory context found."}

    Available Skills:
    ${skillsForPrompt.join('\n')}

    Important rule: If the user asks you to perform an action that matches one of the skills, you MUST append a JSON payload at the very END of your response to trigger the skill. Use EXACTLY this format and nothing else:
    [ACTION: {"skill": "skill_name", "data": {"param": "value"}}]

    You may speak to the user normally to reply, then append the [ACTION] block if you need to take action. Do not wrap the [ACTION] in Markdown blocks. Just plain text.`;

                const chat = model.startChat({
                    history: [
                        { role: 'user', parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}` }] },
                        { role: 'model', parts: [{ text: 'Entendido. Estoy listo.' }] },
                        ...(context || []).map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: String(msg.content || '') }]
                        }))
                    ]
                });

                const result = await chat.sendMessage(String(message));
                aiText = result.response.text();

            } catch (llmErr) {
                console.error('[Orchestrator Chat] Gemini error:', llmErr.message);
                aiText = `Error al procesar tu solicitud con el LLM: ${llmErr.message}`;
            }
            let executedSkillResponse = null;
            let skillTriggered = null;

            // Skill Execution Interceptor
            const actionMatch = aiText.match(/\\[ACTION:\\s*({.*?})\\]/is);
            if (actionMatch) {
                try {
                    const actionJson = JSON.parse(actionMatch[1]);
                    console.log("[Orchestrator Chat] AI triggered skill:", actionJson);
                    skillTriggered = actionJson;

                    // Strip the [ACTION] tag from user-facing text
                    aiText = aiText.replace(actionMatch[0], '').trim();

                    const targetSkill = loadedSkills[actionJson.skill];
                    if (targetSkill && typeof targetSkill.execute === 'function') {
                        console.log(`[Skill Exec] Running ${targetSkill.name}...`);

                        // Pass dependencies: db read/write if the script needs local storage access
                        const utils = {
                            readDB, writeDB, 
                            app, // For advanced routing access
                        };

                        executedSkillResponse = await targetSkill.execute(actionJson.data, utils);
                        console.log(`[Skill Exec] Result:`, executedSkillResponse);

                        // Log to feed
                        if (!db.activityFeed) db.activityFeed = [];
                        db.activityFeed.unshift({
                            id: `act-${Date.now()}`,
                            text: `⚡ Orquestador ejecutó: ${actionJson.skill}`,
                            color: '#8b5cf6',
                            timestamp: new Date().toISOString()
                        });
                        writeDB(db);

                        aiText += `\n\n_(✅ Acción automática en background: ${actionJson.skill} completada)_`;
                    } else {
                        console.warn(`[Skill Exec] Skill ${actionJson.skill} not found or not executable.`);
                        aiText += `\n\n_(⚠️ Error: Skill '${actionJson.skill}' no disponible en el sistema)_`;
                    }
                } catch (err) {
                    console.error("[Orchestrator] Failed to execute AI Skill:", err);
                }
            }

            try {
                const memoryEntry = {
                    id: `bart-chat-${Date.now()}`,
                    message,
                    response: aiText,
                    context: ragContext || null,
                    createdAt: new Date().toISOString(),
                    source: 'bart-chat'
                };
                if (!db.agentMemory) db.agentMemory = [];
                db.agentMemory.unshift(memoryEntry);
                db.agentMemory = db.agentMemory.slice(0, 500);
                writeDB(db);
                if (RAGEngine) await RAGEngine.upsertEntity('agentMemory', memoryEntry);
            } catch (memErr) {
                console.warn('[Orchestrator Chat] Memory write failed:', memErr.message);
            }

            res.json({ success: true, response: aiText, executedSkill: skillTriggered, skillResult: executedSkillResponse, ragContextUsed: Boolean(ragContext) });
        } catch (e) {
            console.error("Chat Error:", e);
            res.status(500).json({ error: e.message });
        }
    });

    // ─── OpenCloud AI Native Orchestrator ─────────────────────────
    app.post('/api/opencloud/orchestrate', async (req, res) => {
        const { prompt, historyContext } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

        try {
            // Skip RAG for orchestration — it causes timeouts with Pinecone
            const result = await openCloudEngine.executeOrchestration(prompt, null, historyContext);
            res.json(result);
        } catch (err) {
            console.error('[OpenCloud API] Orchestrate Error:', err);
            res.status(500).json({ error: err.message });
        }
    });
}
