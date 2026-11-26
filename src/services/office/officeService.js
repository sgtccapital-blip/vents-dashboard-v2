// Cola de trabajo de AI Office HQ: tareas para agentes internos (corren con el modelo
// que tengan configurado) y para agentes externos conectados por MCP (las toman, reportan
// avance y entregan resultado). Todo resultado pasa por revisión del CEO antes de cerrarse.
import { runModel as defaultRunModel, providerEnabled, providerOf, PROVIDERS, resolveModel, defaultFallbacks } from './modelRunner.js';
import { parseToolCalls, stripToolCalls, toolInstructions, toolSpec, MAX_TOOL_STEPS, MAX_CALLS_PER_STEP } from './agentTools.js';
import { extractFileBlocks, FILE_BLOCK_INSTRUCTIONS, isTextMime } from './artifacts.js';

export const ONLINE_MS = 10 * 60 * 1000;
export const OPEN_STATUSES = ['queued', 'in_progress', 'waiting_approval', 'review', 'blocked'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Unifica estados antiguos (pending, completed) con los del tablero. */
export function normalizeStatus(s) {
    if (s === 'pending') return 'queued';
    if (s === 'completed') return 'done';
    return s || 'queued';
}

const nowIso = () => new Date().toISOString();
const clip = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : s || '');
const slug = (s = '') => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/^-+|-+$/g, '') || 'tarea';
const PROMPT_FILES_CHARS = 80_000;
const MAX_MEDIA_INPUTS = 4;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

/** Ficha pública de un archivo (sin la ruta interna en disco). */
// eslint-disable-next-line no-unused-vars
export const fileView = ({ file, ...meta }) => meta;

function guessAvatar(name = '') {
    const n = name.toLowerCase();
    if (n.includes('chatgpt') || n.includes('openai') || n.includes('gpt')) return '🟢';
    if (n.includes('claude')) return '🟠';
    if (n.includes('openclaw')) return '🦞';
    if (n.includes('hermes')) return '⚕️';
    if (n.includes('gemini')) return '🔷';
    return '🔌';
}

/**
 * @param artifacts  almacén de archivos (createArtifactStore); sin él las tareas no guardan archivos.
 * @param onApproved (task, files) => Promise<string[]> — indexa el entregable aprobado en el RAG y devuelve los ids.
 */
export function createOfficeService({ readDB, writeDB, broadcast = () => {}, getHub = () => null, getAgents, buildPrompt, runModel = defaultRunModel, artifacts = null, onApproved = null, tools = null }) {
    // Tareas internas corriendo ahora: taskId → token de la corrida (el kill switch lo invalida).
    const running = new Map();

    function feed(db, text, color = '#3b82f6', agent = 'AI Office') {
        if (!db.activityFeed) db.activityFeed = [];
        db.activityFeed.unshift({ id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, agent, text, color, timestamp: nowIso() });
        db.activityFeed = db.activityFeed.slice(0, 50);
    }

    function history(task, text) {
        task.history = [...(task.history || []), { at: nowIso(), text }].slice(-40);
        task.updatedAt = nowIso();
    }

    function findTask(db, id) {
        const task = (db.agentTasks || []).find(t => t.id === id);
        if (!task) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });
        return task;
    }

    // ─── Archivos de la tarea ───
    function addFile(task, input, { by, byKind }) {
        if (!artifacts) throw Object.assign(new Error('Este servidor no tiene almacenamiento de archivos'), { status: 501 });
        const meta = artifacts.write(task.id, { ...input, createdBy: by, createdByKind: byKind });
        task.artifacts = [...(task.artifacts || []), meta];
        history(task, `📎 ${by} adjuntó ${meta.name}`);
        return meta;
    }

    function findFile(task, fileId) {
        const meta = (task.artifacts || []).find(f => f.id === fileId || f.name === fileId);
        if (!meta) throw Object.assign(new Error('Archivo no encontrado en esta tarea'), { status: 404 });
        return meta;
    }

    /** Guarda el informe de lo que hizo el agente (y los archivos que escribió) como archivos de la tarea. */
    function saveDeliverable(task, { text, by, byKind, model, files = [] }) {
        if (!artifacts) return [];
        const version = (task.artifacts || []).filter(f => f.role === 'report').length + 1;
        const saved = files.map(f => ({ ...addFile(task, { name: f.name, content: f.content, mime: f.mime, description: f.description || `Creado por ${by}` }, { by, byKind }), role: 'deliverable', version }));
        const header = [`# ${task.task}`, '', `- Agente: ${by}${model ? ` (${model})` : ''}`, `- Fecha: ${new Date().toLocaleString('es')}`, `- Tarea: ${task.id}`,
            ...(saved.length ? [`- Archivos: ${saved.map(f => f.name).join(', ')}`] : []), '', '---', ''].join('\n');
        const report = { ...addFile(task, { name: `informe-${slug(task.task)}${version > 1 ? `-v${version}` : ''}.md`, content: header + text, mime: 'text/markdown', description: 'Informe de lo que hizo el agente en esta tarea' }, { by, byKind }), role: 'report', version };
        // addFile ya agregó las fichas; se reemplazan por las que llevan role/version.
        const ids = new Set([...saved, report].map(f => f.id));
        task.artifacts = [...task.artifacts.filter(f => !ids.has(f.id)), ...saved, report];
        return [...saved, report];
    }

    /** Texto (y medios) de los archivos de la tarea para el prompt del agente interno. */
    function filesForPrompt(task, provider) {
        const list = task.artifacts || [];
        if (!list.length || !artifacts) return { text: '', media: [] };
        let budget = PROMPT_FILES_CHARS;
        const parts = [];
        const media = [];
        for (const f of list) {
            const label = `### ${f.name} (${f.role === 'report' ? 'informe' : f.createdByKind === 'ceo' ? 'adjunto del CEO' : `de ${f.createdBy}`}${f.inheritedFrom ? `, viene de la tarea ${f.inheritedFrom}` : ''})`;
            if (isTextMime(f.mime) && budget > 500) {
                try {
                    const body = artifacts.readText(f, budget);
                    budget -= body.length;
                    parts.push(`${label}\n${f.description ? `${f.description}\n` : ''}${body}`);
                    continue;
                } catch { /* archivo perdido: se lista abajo */ }
            }
            const canSee = (f.kind === 'image' || (f.kind === 'pdf' && provider !== 'openai' && provider !== 'openrouter')) && f.size <= MAX_MEDIA_BYTES && media.length < MAX_MEDIA_INPUTS;
            if (canSee) {
                try { media.push({ mime: f.mime, data: artifacts.read(f).toString('base64'), name: f.name }); parts.push(`${label}\n(adjunto a este mensaje: puedes verlo)`); continue; } catch { /* sigue */ }
            }
            parts.push(`${label}\n(${f.mime}, ${Math.round(f.size / 1024)} KB — no se puede leer como texto)`);
        }
        return { text: `ARCHIVOS DE LA TAREA (úsalos como insumo):\n\n${parts.join('\n\n')}`, media, names: list.map(f => f.name) };
    }

    function releaseAgent(db, agentId, taskId) {
        const agent = (db.agents || []).find(a => a.id === agentId);
        if (agent && (!taskId || agent.activeTaskId === taskId || agent.activeTaskId == null)) {
            agent.status = 'available';
            agent.activeTaskId = null;
            agent.currentTaskName = null;
        }
    }

    // ─── Agentes externos (tokens del Agent Hub) ───
    function externalAgents(db = readDB()) {
        const hub = getHub();
        if (!hub) return [];
        const now = Date.now();
        const activity = hub.activity({ limit: 1000 });
        const tasks = db.agentTasks || [];
        return hub.list().filter(t => !t.revoked).map(t => {
            const id = `ext-${t.id}`;
            const rows = activity.filter(a => a.tokenId === t.id);
            const recent24 = rows.filter(a => now - Date.parse(a.at) < DAY_MS);
            const toolCounts = {};
            for (const r of rows) toolCounts[r.tool] = (toolCounts[r.tool] || 0) + 1;
            const lastSeen = rows[0]?.at || t.lastUsedAt || null;
            const online = lastSeen && now - Date.parse(lastSeen) < ONLINE_MS;
            const mine = tasks.filter(x => x.assignedAgentId === id);
            const working = mine.find(x => normalizeStatus(x.status) === 'in_progress');
            return {
                id,
                kind: 'external',
                tokenId: t.id,
                name: t.name,
                agentName: t.agent,
                role: t.scope === 'write' ? 'Agente conectado por MCP (lee y escribe)' : 'Agente conectado por MCP (solo lectura)',
                avatar: guessAvatar(`${t.name} ${t.agent}`),
                model: 'externo',
                scope: t.scope,
                status: working ? 'executing' : online ? 'available' : 'offline',
                online: Boolean(online),
                lastSeen,
                activeTaskId: working?.id || null,
                currentTaskName: working?.task || null,
                currentStep: working?.currentStep || null,
                queued: mine.filter(x => normalizeStatus(x.status) === 'queued').length,
                hub: {
                    calls: t.calls || rows.length,
                    calls24h: recent24.length,
                    errors24h: recent24.filter(a => !a.ok).length,
                    lastTool: rows[0]?.tool || null,
                    topTools: Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tool, n]) => ({ tool, n })),
                    recent: rows.slice(0, 12).map(r => ({ at: r.at, tool: r.tool, ok: r.ok, ms: r.ms, error: r.error || null, args: clip(r.args, 160) })),
                },
            };
        });
    }

    function allAgents(db = readDB()) {
        const internal = getAgents(db).map(a => ({ ...a, kind: 'internal', model: resolveModel(a.model), provider: providerOf(resolveModel(a.model)) }));
        return [...internal, ...externalAgents(db)];
    }

    // ─── Métricas reales calculadas desde las corridas de cada tarea ───
    function computeStats(db, agents) {
        const per = {};
        const blank = () => ({ done: 0, failed: 0, review: 0, inProgress: 0, queued: 0, runs: 0, okRuns: 0, tokensIn: 0, tokensOut: 0, costUSD: 0, pricedRuns: 0, totalMs: 0 });
        const byModel = {};
        for (const t of db.agentTasks || []) {
            const s = per[t.assignedAgentId] ||= blank();
            const st = normalizeStatus(t.status);
            if (st === 'done') s.done++;
            else if (st === 'failed') s.failed++;
            else if (st === 'review') s.review++;
            else if (st === 'in_progress') s.inProgress++;
            else if (st === 'queued') s.queued++;
            for (const r of t.runs || []) {
                s.runs++;
                if (r.ok) s.okRuns++;
                s.tokensIn += r.tokensIn || 0;
                s.tokensOut += r.tokensOut || 0;
                if (typeof r.costUSD === 'number') { s.costUSD += r.costUSD; s.pricedRuns++; }
                s.totalMs += r.ms || 0;
                const m = byModel[r.model || 'externo'] ||= { model: r.model || 'externo', provider: r.provider || 'externo', runs: 0, tokensIn: 0, tokensOut: 0, costUSD: 0, okRuns: 0, failedRuns: 0, okMs: 0, toolRuns: 0, delivered: 0, approved: 0, firstTry: 0, changes: 0, rejected: 0 };
                m.runs++; m.tokensIn += r.tokensIn || 0; m.tokensOut += r.tokensOut || 0;
                if (typeof r.costUSD === 'number') { m.costUSD += r.costUSD; m.priced = true; }
                if (r.ok) { m.okRuns++; m.okMs += r.ms || 0; } else m.failedRuns++;
                if (r.steps?.length) m.toolRuns++;
            }
            // Calidad: la tarea cuenta para el modelo que hizo su última entrega.
            const lastOk = [...(t.runs || [])].reverse().find(r => r.ok);
            if (lastOk && t.kind !== 'mission') {
                const m = byModel[lastOk.model || 'externo'];
                const corrections = (t.feedback || []).filter(f => !f.answer).length;
                m.delivered++;
                m.changes += corrections;
                if (st === 'done') { m.approved++; if (!corrections) m.firstTry++; }
                if (st === 'cancelled') m.rejected++;
            }
        }
        const agentStats = {};
        for (const a of agents) {
            const s = per[a.id] || blank();
            const budget = a.kind === 'external' ? null : budgetStatus(db, a);
            agentStats[a.id] = {
                ...s,
                ...(budget ? { monthCostUSD: budget.spent, budgetUSD: budget.limit, budgetPct: budget.pct } : {}),
                costUSD: s.pricedRuns ? Number(s.costUSD.toFixed(4)) : (s.runs ? null : 0),
                avgMs: s.runs ? Math.round(s.totalMs / s.runs) : null,
                successRate: s.done + s.failed ? Math.round((s.done / (s.done + s.failed)) * 100) : null,
            };
        }
        const sum = k => Object.values(agentStats).reduce((acc, s) => acc + (s[k] || 0), 0);
        const done = sum('done'), failed = sum('failed');
        return {
            agentStats,
            byModel: Object.values(byModel).map(({ priced, okMs, ...m }) => {
                const decided = m.approved + m.rejected;
                return {
                    ...m,
                    costUSD: priced ? Number(m.costUSD.toFixed(4)) : null,
                    avgMs: m.okRuns ? Math.round(okMs / m.okRuns) : null,
                    approvalRate: decided ? Math.round((m.approved / decided) * 100) : null,
                    firstTryRate: m.approved ? Math.round((m.firstTry / m.approved) * 100) : null,
                    failRate: m.runs ? Math.round((m.failedRuns / m.runs) * 100) : null,
                    costPerApproved: priced && m.approved ? Number((m.costUSD / m.approved).toFixed(4)) : null,
                };
            }).sort((a, b) => b.runs - a.runs),
            totals: {
                done, failed,
                review: sum('review'), inProgress: sum('inProgress'), queued: sum('queued'),
                runs: sum('runs'),
                tokens: sum('tokensIn') + sum('tokensOut'),
                costUSD: Number(sum('costUSD').toFixed(4)),
                unpricedRuns: sum('runs') - sum('pricedRuns'),
                successRate: done + failed ? Math.round((done / (done + failed)) * 100) : null,
            },
        };
    }

    // ─── Lecciones: lo que el CEO pide al revisar, para que el agente no repita el error ───
    const MAX_LESSONS_PER_AGENT = 40;
    const PROMPT_LESSONS = 8;

    function addLesson(db, { agentId, kind, notes, task }) {
        if (!agentId || !String(notes || '').trim()) return null;
        db.agentLessons = db.agentLessons || [];
        const lesson = { id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, agentId, kind, notes: clip(notes, 600), taskId: task.id, task: clip(task.task, 140), at: nowIso() };
        db.agentLessons.unshift(lesson);
        const mine = db.agentLessons.filter(l => l.agentId === agentId);
        if (mine.length > MAX_LESSONS_PER_AGENT) {
            const drop = new Set(mine.slice(MAX_LESSONS_PER_AGENT).map(l => l.id));
            db.agentLessons = db.agentLessons.filter(l => !drop.has(l.id));
        }
        return lesson;
    }

    const lessonsFor = (db, agentId, n = PROMPT_LESSONS) => (db.agentLessons || []).filter(l => l.agentId === agentId).slice(0, n);

    function listLessons(agentId) {
        return lessonsFor(readDB(), agentId, MAX_LESSONS_PER_AGENT);
    }

    function removeLesson(lessonId) {
        const db = readDB();
        const before = (db.agentLessons || []).length;
        db.agentLessons = (db.agentLessons || []).filter(l => l.id !== lessonId);
        if (db.agentLessons.length === before) throw Object.assign(new Error('Lección no encontrada'), { status: 404 });
        writeDB(db);
        return { removed: lessonId };
    }

    // Modelos de respaldo del agente (otros proveedores). Si nunca se configuró, la cadena por defecto.
    const fallbacksFor = agent => (Array.isArray(agent?.fallbackModels) ? agent.fallbackModels : defaultFallbacks()).map(resolveModel);

    // ─── Progreso en vivo (lo que el agente está haciendo ahora) ───
    function progress(taskId, text, pct) {
        const db = readDB();
        const t = (db.agentTasks || []).find(x => x.id === taskId);
        if (!t || normalizeStatus(t.status) !== 'in_progress') return;
        t.currentStep = text;
        t.progress = Math.max(t.progress || 0, pct);
        writeDB(db);
        broadcast('task_progressed', { taskId, step: text });
    }

    // ─── Presupuesto mensual por agente (USD, con lo que reportan los proveedores) ───
    const monthKey = () => nowIso().slice(0, 7);
    function budgetStatus(db, agent) {
        const month = monthKey();
        let spent = 0;
        for (const t of db.agentTasks || []) {
            for (const r of t.runs || []) {
                if (r.agentId === agent.id && typeof r.costUSD === 'number' && String(r.at || '').startsWith(month)) spent += r.costUSD;
            }
        }
        const limit = Number(agent.monthlyBudgetUSD) > 0 ? Number(agent.monthlyBudgetUSD) : null;
        return { month, spent: Number(spent.toFixed(4)), limit, pct: limit ? Math.round((spent / limit) * 100) : null };
    }

    /** Aviso único al 80% y al 100% del presupuesto del mes. */
    function warnBudget(db, agentId) {
        const agent = (db.agents || []).find(a => a.id === agentId);
        if (!agent) return;
        const b = budgetStatus(db, agent);
        if (b.limit == null || b.pct < 80) return;
        const level = b.pct >= 100 ? 100 : 80;
        const key = `${b.month}:${level}`;
        if (agent.budgetWarned === key || agent.budgetWarned === `${b.month}:100`) return;
        agent.budgetWarned = key;
        feed(db, level === 100
            ? `💸 ${agent.name} llegó a su presupuesto del mes ($${b.spent.toFixed(2)} de $${b.limit.toFixed(2)}): sus próximas tareas pedirán tu aprobación`
            : `⚠️ ${agent.name} va en ${b.pct}% de su presupuesto del mes ($${b.spent.toFixed(2)} de $${b.limit.toFixed(2)})`, '#f59e0b', agent.name);
        broadcast('budget_warning', { agentId, ...b });
    }

    // ─── Misiones en pasos: BART divide la misión y cada paso recibe lo del anterior ───
    const STEP_LABEL = { review: 'entregó, por revisar', failed: 'falló', in_progress: 'trabajando', queued: 'en cola', done: 'aprobado', cancelled: 'descartado', waiting_approval: 'espera aprobación' };

    function noteMissionStep(db, step) {
        const parent = (db.agentTasks || []).find(x => x.id === step.missionId);
        if (!parent || ['done', 'failed', 'cancelled'].includes(normalizeStatus(parent.status))) return;
        parent.currentStep = `Paso ${step.missionStep} de ${step.missionTotal}: ${step.assignedAgent} — ${STEP_LABEL[normalizeStatus(step.status)] || step.status}`;
    }

    function createMission({ mission, description = '', steps, routing = null, account = null, companyId = '', companyName = '', priorityScore = null, autoAdvance = false, autoRun = true, by = 'CEO' }) {
        if (!String(mission || '').trim()) throw Object.assign(new Error('La misión no puede estar vacía'), { status: 400 });
        if (!Array.isArray(steps) || steps.length < 2) throw Object.assign(new Error('Una misión en pasos necesita al menos 2 pasos'), { status: 400 });
        const db = readDB();
        const everyone = allAgents(db);
        const plan = steps.slice(0, 6).map((st, i) => {
            const agent = everyone.find(a => a.id === st.agentId);
            if (!agent) throw Object.assign(new Error(`Paso ${i + 1}: no existe el agente ${st.agentId}`), { status: 400 });
            if (!String(st.task || '').trim()) throw Object.assign(new Error(`Paso ${i + 1}: falta qué hacer`), { status: 400 });
            return { ...st, task: st.task.trim(), agent };
        });
        const now = nowIso();
        const base = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        const parentId = `atask-${base}-m`;
        const ids = plan.map((_, i) => `atask-${base}-s${i + 1}`);
        const n = plan.length;
        const bart = everyone.find(a => a.id === 'agent-bart');
        const chain = plan.map(st => st.agent.name.split(' (')[0]).join(' → ');
        const parent = {
            id: parentId, kind: 'mission', task: mission.trim(), title: clip(mission.trim(), 50), description,
            status: 'in_progress', assignedAgent: bart?.name || 'BART (COO)', assignedAgentId: 'agent-bart', assignedKind: 'internal',
            delegatedBy: by, routing, ...(account ? { account } : {}), companyId, companyName, priorityScore, autoAdvance: Boolean(autoAdvance),
            childTaskIds: ids,
            missionSteps: plan.map((st, i) => ({ taskId: ids[i], agentId: st.agent.id, agentName: st.agent.name, task: clip(st.task, 200), why: clip(st.why || '', 200) })),
            runs: [], artifacts: [], progress: 5, createdAt: now,
            currentStep: `Paso 1 de ${n}: ${plan[0].agent.name}`,
            history: [
                { at: now, text: `Creada por ${by}` },
                { at: now, text: `🧭 BART la dividió en ${n} pasos: ${chain}${autoAdvance ? ' (avanza sola al entregar cada paso)' : ' (cada paso arranca cuando apruebas el anterior)'}` },
            ],
        };
        const stepTasks = plan.map((st, i) => {
            const ext = st.agent.kind === 'external';
            return {
                id: ids[i], task: st.task, title: clip(st.task, 50),
                description: [`Paso ${i + 1} de ${n} de la misión «${clip(mission.trim(), 200)}».`, i > 0 ? `Recibes la entrega del paso ${i} (${plan[i - 1].agent.name}).` : '', i < n - 1 ? `Después sigue ${plan[i + 1].agent.name}: ${clip(plan[i + 1].task, 160)}.` : 'Eres el último paso: tu entrega cierra la misión.', description].filter(Boolean).join('\n'),
                status: i === 0 ? 'queued' : 'blocked',
                assignedAgent: st.agent.name, assignedAgentId: st.agent.id, assignedKind: ext ? 'external' : 'internal',
                model: ext ? null : st.agent.model, delegatedBy: 'BART (COO)',
                parentTaskId: parentId, missionId: parentId, missionStep: i + 1, missionTotal: n,
                ...(account ? { account } : {}), companyId, companyName, priorityScore,
                routing: { by: 'ai', agentId: st.agent.id, reason: st.why || `Paso ${i + 1} de la misión`, confidence: routing?.confidence ?? null, model: routing?.model },
                runs: [], artifacts: [], progress: 0, createdAt: now,
                currentStep: i === 0 ? (ext ? `Esperando que ${st.agent.name} la tome por MCP` : `En cola para ${st.agent.name}`) : `Espera el paso ${i} (${plan[i - 1].agent.name})`,
                history: [{ at: now, text: `Paso ${i + 1} de ${n} de la misión «${clip(mission, 60)}»` }],
            };
        });
        db.agentTasks = [parent, ...stepTasks, ...(db.agentTasks || [])];
        feed(db, `🧭 BART dividió "${clip(mission, 50)}" en ${n} pasos: ${chain}`, '#c084fc', 'BART (COO)');
        writeDB(db);
        broadcast('task_dispatched', { task: parent, assignedAgent: parent.assignedAgent });
        if (autoRun !== false && stepTasks[0].assignedKind === 'internal') startInternalRun(ids[0]);
        return { mission: parent, steps: stepTasks };
    }

    function completeMissionIfDone(db, parent) {
        const steps = (db.agentTasks || []).filter(x => x.missionId === parent.id).sort((a, b) => a.missionStep - b.missionStep);
        if (!steps.length || !steps.every(x => normalizeStatus(x.status) === 'done')) return false;
        parent.status = 'done';
        parent.progress = 100;
        parent.completedAt = nowIso();
        parent.currentStep = `Misión completa: ${steps.length} pasos aprobados`;
        parent.result = steps.map(x => `## Paso ${x.missionStep}: ${x.task}\n_${x.assignedAgent}_\n\n${x.result || '(sin texto)'}`).join('\n\n---\n\n');
        history(parent, parent.currentStep);
        feed(db, `🏁 Misión completa: "${clip(parent.task, 60)}"`, '#10b981', 'BART (COO)');
        return true;
    }

    /** Arranca el paso siguiente cuando el actual se aprueba (o entrega, si la misión avanza sola). */
    function advanceMission(stepId, trigger) {
        const db = readDB();
        const step = (db.agentTasks || []).find(x => x.id === stepId);
        const parent = step && (db.agentTasks || []).find(x => x.id === step.missionId);
        if (!parent) return null;
        if (trigger === 'delivered' && !parent.autoAdvance) return null;
        const next = db.agentTasks.find(x => x.missionId === parent.id && x.missionStep === step.missionStep + 1);
        if (!next || normalizeStatus(next.status) !== 'blocked') {
            if (trigger === 'approved' && completeMissionIfDone(db, parent)) {
                writeDB(db);
                broadcast('task_reviewed', { taskId: parent.id, decision: 'approve' });
            }
            return null;
        }
        const have = new Set((next.artifacts || []).map(f => f.id));
        const files = (step.artifacts || []).filter(f => ['deliverable', 'report'].includes(f.role) && !have.has(f.id)).map(f => ({ ...f, inheritedFrom: f.inheritedFrom || step.id }));
        next.artifacts = [...(next.artifacts || []), ...files];
        if (step.result) next.description = `${next.description}\n\nENTREGA DEL PASO ${step.missionStep} (${step.assignedAgent}):\n${clip(step.result, 4000)}`;
        next.status = 'queued';
        next.currentStep = next.assignedKind === 'external' ? `Esperando que ${next.assignedAgent} la tome por MCP` : `En cola para ${next.assignedAgent}`;
        history(next, `▶️ Arranca: el paso ${step.missionStep} (${step.assignedAgent}) ${trigger === 'approved' ? 'fue aprobado' : 'entregó'}${files.length ? ` y le pasó ${files.length} archivo(s)` : ''}`);
        parent.progress = Math.max(parent.progress || 0, Math.round((step.missionStep / step.missionTotal) * 90));
        noteMissionStep(db, next);
        history(parent, `▶️ Paso ${next.missionStep}: ${next.assignedAgent} — ${clip(next.task, 60)}`);
        feed(db, `▶️ Misión "${clip(parent.task, 40)}": sigue ${next.assignedAgent} (paso ${next.missionStep} de ${next.missionTotal})`, '#c084fc', 'BART (COO)');
        writeDB(db);
        broadcast('task_dispatched', { task: next, assignedAgent: next.assignedAgent });
        if (next.assignedKind !== 'external') startInternalRun(next.id);
        return next;
    }

    /** Un paso descartado detiene la misión: los pasos que esperaban se descartan. */
    function stopMission(db, step, reason) {
        const parent = (db.agentTasks || []).find(x => x.id === step.missionId);
        if (!parent) return;
        parent.status = 'failed';
        parent.currentStep = `Misión detenida: ${reason}`;
        history(parent, parent.currentStep);
        for (const x of db.agentTasks) {
            if (x.missionId === parent.id && normalizeStatus(x.status) === 'blocked') {
                x.status = 'cancelled';
                x.currentStep = 'Descartado: la misión se detuvo';
                history(x, x.currentStep);
            }
        }
    }

    // ─── Ejecución de agentes internos ───
    /** Arranca la tarea con el modelo del agente. Devuelve enseguida; el resultado llega por SSE. */
    function startInternalRun(taskId) {
        const db = readDB();
        const task = findTask(db, taskId);
        if (task.kind === 'mission') throw Object.assign(new Error('Una misión avanza sola paso a paso: abre el paso que quieres correr'), { status: 400 });
        if (normalizeStatus(task.status) === 'blocked') throw Object.assign(new Error('Este paso espera que termine el anterior'), { status: 409 });
        const agent = (db.agents || []).find(a => a.id === task.assignedAgentId);
        if (!agent) throw Object.assign(new Error('La tarea no está asignada a un agente interno'), { status: 400 });
        if (running.has(taskId)) return { started: false, reason: 'Ya se está ejecutando' };

        const model = resolveModel(task.model || agent.model);
        const provider = providerOf(model);
        const fallbacks = fallbacksFor(agent).filter(m => m !== model);
        const usableFallback = fallbacks.find(m => providerEnabled(providerOf(m)));
        if (!providerEnabled(provider) && !usableFallback) {
            task.status = 'queued';
            task.model = model;
            task.currentStep = `En cola: ${PROVIDERS[provider]?.label || provider} no está configurado (falta ${PROVIDERS[provider]?.env} en .env). Cambia el modelo del agente o agrega la llave.`;
            history(task, task.currentStep);
            writeDB(db);
            broadcast('task_progressed', { task });
            return { started: false, reason: task.currentStep };
        }

        // Presupuesto mensual del agente: al llegar al tope, la tarea pide aprobación en Gobernanza.
        const budget = budgetStatus(db, agent);
        if (budget.limit != null && budget.spent >= budget.limit && !task.budgetOverride) {
            task.status = 'waiting_approval';
            task.model = model;
            task.currentStep = `Presupuesto de ${agent.name} agotado este mes ($${budget.spent.toFixed(2)} de $${budget.limit.toFixed(2)}). Apruébala en Gobernanza para seguir.`;
            history(task, task.currentStep);
            db.approvalRequests = db.approvalRequests || [];
            if (!db.approvalRequests.some(a => a.taskId === taskId && a.kind === 'budget' && a.status === 'pending')) {
                db.approvalRequests.unshift({
                    id: `appr-${Date.now()}`, kind: 'budget', taskId, agentId: agent.id, agentName: agent.name,
                    actionRequested: `Pasar el presupuesto mensual de $${budget.limit.toFixed(2)} para: ${clip(task.task, 120)}`,
                    impactEstimate: 0, autonomyRequired: 3, status: 'pending', createdAt: nowIso(),
                });
            }
            feed(db, `💸 ${agent.name} llegó a su presupuesto del mes: "${clip(task.task, 50)}" espera tu aprobación`, '#f59e0b', agent.name);
            writeDB(db);
            broadcast('task_progressed', { task });
            return { started: false, reason: task.currentStep };
        }

        const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        running.set(taskId, token);
        task.status = 'in_progress';
        task.model = model;
        task.progress = 15;
        task.startedAt = nowIso();
        task.error = null;
        task.currentStep = providerEnabled(provider)
            ? `${agent.name} trabajando con ${model}`
            : `${agent.name} trabajando con ${usableFallback} (respaldo: ${PROVIDERS[provider]?.label || provider} no tiene llave)`;
        history(task, task.currentStep);
        agent.status = 'executing';
        agent.activeTaskId = taskId;
        agent.currentTaskName = task.task;
        agent.lastSeen = nowIso();
        if (task.missionId) noteMissionStep(db, task);
        writeDB(db);
        broadcast('task_started', { taskId, agentId: agent.id, model });

        (async () => {
            let outcome;
            let context = null;
            const runStarted = Date.now();
            const steps = [];
            const handoffs = [];
            let question = null;
            const usage = { tokensIn: 0, tokensOut: 0, cost: 0, priced: false, attempts: 0 };
            let fallbackFrom = null;
            let failures = [];
            const cancelled = () => running.get(taskId) !== token;
            try {
                const built = await buildPrompt({
                    agentId: agent.id,
                    agentName: agent.name,
                    accountId: task.account?.id || null,
                    lessons: lessonsFor(readDB(), agent.id),
                    task: task.task,
                    description: [task.description, ...(task.feedback || []).map(f => (f.answer
                        ? `Respuesta del CEO a tu pregunta «${f.question}»: ${f.notes}`
                        : `Corrección pedida por el CEO: ${f.notes}`))].filter(Boolean).join('\n\n'),
                    companyId: task.companyId,
                    companyName: task.companyName,
                    previousResult: (task.feedback || []).length ? task.result : null,
                });
                const base = typeof built === 'string' ? built : built.prompt;
                context = typeof built === 'string' ? null : built.context || null;
                const inputs = filesForPrompt(task, provider);
                if (context && inputs.names?.length) context.files = inputs.names;
                const toolsOn = Boolean(tools) && agent.toolsEnabled !== false;
                const later = laterMissionSteps(readDB(), task);
                const peers = toolsOn ? allAgents(readDB()).filter(a => a.id !== agent.id && a.kind === 'internal' && !later.some(st => st.agentId === a.id)).map(a => ({ id: a.id, name: a.name, role: a.role })) : [];
                const missionNote = later.length
                    ? `MISIÓN EN PASOS: eres el paso ${task.missionStep} de ${task.missionTotal}. Lo que sigue ya está asignado y recibirá tu entrega: ${later.map(st => `${st.agentName} (${st.task})`).join(' → ')}. Entrega solo tu parte y no le pases trabajo a esos agentes.`
                    : '';
                let transcript = [base, inputs.text, FILE_BLOCK_INSTRUCTIONS, missionNote, toolsOn ? toolInstructions({ agents: peers }) : ''].filter(Boolean).join('\n\n');
                let currentModel = model;
                let final = '';
                for (let turn = 0; ; turn++) {
                    const lastTurn = !toolsOn || turn >= MAX_TOOL_STEPS - 1;
                    const prompt = toolsOn && lastTurn && turn > 0 ? `${transcript}\n\nYA NO PUEDES USAR HERRAMIENTAS: entrega ahora tu resultado final.` : transcript;
                    const out = await runModel({ model: currentModel, prompt, attachments: inputs.media, fallbacks: fallbacks.filter(m => m !== currentModel) });
                    if (cancelled()) return;
                    usage.tokensIn += out.tokensIn || 0;
                    usage.tokensOut += out.tokensOut || 0;
                    usage.attempts += out.attempts || 1;
                    if (typeof out.costUSD === 'number') { usage.cost += out.costUSD; usage.priced = true; }
                    if (out.fallbackFrom && !fallbackFrom) { fallbackFrom = out.fallbackFrom; failures = out.failures || []; }
                    currentModel = out.model || currentModel;
                    const calls = toolsOn && !lastTurn ? parseToolCalls(out.text) : [];
                    if (!calls.length) { final = stripToolCalls(out.text); break; }

                    const results = [];
                    for (const call of calls.slice(0, MAX_CALLS_PER_STEP)) {
                        const spec = toolSpec(call.name);
                        const brief = clip(spec?.brief?.(call.input || {}) || '', 70);
                        progress(taskId, `🔧 ${spec?.label || call.name}${brief ? `: ${brief}` : ''}`, Math.min(20 + turn * 12, 80));
                        const t0 = Date.now();
                        let res;
                        try {
                            res = await tools.run(call.name, call.input || {}, { task: findTask(readDB(), taskId), agent });
                        } catch (e) {
                            res = { output: `Error: ${e.message}` };
                        }
                        steps.push({ turn: turn + 1, tool: call.name, input: clip(JSON.stringify(call.input || {}), 300), output: clip(res.output, 700), ms: Date.now() - t0 });
                        if (res.control?.handoff) handoffs.push(res.control.handoff);
                        if (res.control?.question) question = res.control.question;
                        results.push(`### Resultado de ${call.name} ${JSON.stringify(call.input || {})}\n${clip(res.output, 5000)}`);
                    }
                    if (cancelled()) return;
                    if (question) { final = stripToolCalls(out.text); break; }
                    transcript += `\n\n--- TURNO ${turn + 1} ---\nPEDISTE:\n${out.text.trim()}\n\nRESULTADOS:\n${results.join('\n\n')}\n\nSigue: usa otra herramienta o entrega tu resultado final.`;
                }
                if (!final && !question) throw new Error('El agente no entregó contenido');
                outcome = { ok: true, text: final, model: currentModel, provider: providerOf(currentModel) };
            } catch (err) {
                outcome = { ok: false, error: err.message, model, provider, failures: err.failures };
            }

            if (cancelled()) return; // cancelada por kill switch o reasignación
            running.delete(taskId);
            const db2 = readDB();
            const t = (db2.agentTasks || []).find(x => x.id === taskId);
            if (!t || normalizeStatus(t.status) !== 'in_progress') return;
            const allFailures = [...failures, ...(outcome.failures || [])];
            t.runs = [...(t.runs || []), {
                at: nowIso(), agentId: agent.id, model: outcome.model, provider: outcome.provider, ok: outcome.ok,
                tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, costUSD: usage.priced ? Number(usage.cost.toFixed(6)) : null, ms: Date.now() - runStarted,
                ...(outcome.ok ? {} : { error: clip(outcome.error, 400) }),
                ...(fallbackFrom ? { fallbackFrom } : {}),
                ...(context ? { context } : {}),
                ...(steps.length ? { steps, turns: Math.max(...steps.map(x => x.turn)) + (question ? 0 : 1) } : {}),
                ...(allFailures.length ? { failures: allFailures.map(f => ({ model: f.model, error: clip(f.error, 200) })) } : {}),
            }];
            if (outcome.ok && fallbackFrom) {
                history(t, `↪️ ${fallbackFrom} no respondió (${clip(failures[0]?.error, 90)}); siguió con el respaldo ${outcome.model}`);
            }
            if (steps.length) history(t, `🔧 ${agent.name} usó ${steps.length} herramienta(s): ${[...new Set(steps.map(x => x.tool))].join(', ')}`);
            if (outcome.ok) {
                const { text, files } = extractFileBlocks(outcome.text);
                t.status = 'review';
                if (text || files.length) {
                    t.result = text || outcome.text;
                    try {
                        const saved = saveDeliverable(t, { text: t.result, by: agent.name, byKind: 'internal', model: outcome.model, files });
                        if (saved.length) history(t, `${agent.name} dejó ${saved.length} archivo(s): ${saved.map(f => f.name).join(', ')}`);
                    } catch (e) { history(t, `No se pudieron guardar los archivos: ${e.message}`); }
                }
                t.proposedHandoffs = handoffs;
                if (handoffs.length) history(t, `➡️ Propone pasar el trabajo a ${handoffs.map(h => h.agentName).join(', ')} cuando apruebes`);
                if (question) {
                    t.question = { text: question, at: nowIso() };
                    t.progress = 50;
                    t.currentStep = `❓ ${agent.name} pregunta: ${clip(question, 140)}`;
                    history(t, t.currentStep);
                    feed(db2, `❓ ${agent.name} te pregunta en "${clip(t.task, 40)}": ${clip(question, 80)}`, '#f5b638', agent.name);
                } else {
                    t.question = null;
                    t.progress = 90;
                    t.currentStep = 'Entregado: esperando tu revisión';
                    history(t, `${agent.name} entregó (${outcome.model}, ${Math.round((Date.now() - runStarted) / 100) / 10}s)`);
                    feed(db2, `📬 ${agent.name} entregó "${clip(t.task, 60)}" para revisión`, '#a855f7', agent.name);
                }
            } else {
                t.status = 'failed';
                t.error = outcome.error;
                t.currentStep = `Falló: ${clip(outcome.error, 140)}`;
                history(t, t.currentStep);
                feed(db2, `⚠️ ${agent.name} falló en "${clip(t.task, 50)}": ${clip(outcome.error, 80)}`, '#ef4444', agent.name);
            }
            releaseAgent(db2, agent.id, taskId);
            warnBudget(db2, agent.id);
            if (t.missionId) noteMissionStep(db2, t);
            writeDB(db2);
            broadcast(outcome.ok ? 'task_delivered' : 'task_failed', { taskId, agentId: agent.id });
            if (outcome.ok && !question && t.missionId) advanceMission(taskId, 'delivered');
        })();

        return { started: true, model };
    }

    // ─── Ciclo de vida desde el dashboard ───
    function review(taskId, { decision, notes = '' }) {
        const db = readDB();
        const task = findTask(db, taskId);
        if (!['approve', 'changes', 'reject'].includes(decision)) throw Object.assign(new Error("decision debe ser 'approve', 'changes' o 'reject'"), { status: 400 });
        if (task.kind === 'mission') throw Object.assign(new Error('Revisa cada paso de la misión; la misión se cierra sola cuando apruebas el último'), { status: 400 });
        const who = task.assignedAgent || 'Agente';
        // Si el agente preguntó algo, "pedir cambios" es tu respuesta: no es una lección.
        const answering = decision === 'changes' && Boolean(task.question);
        if (notes.trim() && !answering) {
            const lesson = addLesson(db, { agentId: task.assignedAgentId, kind: decision, notes, task });
            if (lesson) history(task, `📝 Lección guardada para ${who}: «${clip(notes, 80)}»`);
        }
        if (decision === 'approve') {
            task.status = 'done';
            task.progress = 100;
            task.completedAt = nowIso();
            task.approvedBy = 'CEO';
            task.approvalNotes = notes;
            task.currentStep = 'Aprobado por el CEO';
            feed(db, `✅ Aprobaste el entregable de ${who}: "${clip(task.task, 60)}"`, '#10b981', 'CEO');
            if (onApproved) indexApproved(taskId);
        } else if (decision === 'reject') {
            task.status = 'cancelled';
            task.currentStep = notes ? `Descartado: ${clip(notes, 120)}` : 'Descartado por el CEO';
            feed(db, `🗑️ Descartaste la tarea de ${who}: "${clip(task.task, 60)}"`, '#64748b', 'CEO');
            if (task.missionId) stopMission(db, task, `descartaste el paso ${task.missionStep} (${who})`);
        } else {
            if (!notes.trim()) throw Object.assign(new Error(answering ? 'Escribe tu respuesta' : 'Escribe qué hay que cambiar'), { status: 400 });
            task.feedback = [...(task.feedback || []), answering ? { at: nowIso(), notes, answer: true, question: task.question.text } : { at: nowIso(), notes }];
            if (answering) history(task, `💬 Respondiste: «${clip(notes, 100)}»`);
            task.question = null;
            task.status = 'queued';
            task.progress = 0;
            task.currentStep = answering ? `Respondiste: ${clip(notes, 120)}` : `Cambios pedidos: ${clip(notes, 120)}`;
            feed(db, answering ? `💬 Le respondiste a ${who}: "${clip(notes, 60)}"` : `✏️ Pediste cambios a ${who}: "${clip(notes, 60)}"`, '#f59e0b', 'CEO');
        }
        history(task, task.currentStep);
        if (decision !== 'changes') releaseAgent(db, task.assignedAgentId, taskId);
        writeDB(db);
        broadcast('task_reviewed', { taskId, decision });
        if (decision === 'changes' && task.assignedKind !== 'external') startInternalRun(taskId);
        if (decision === 'approve') {
            createProposedHandoffs(taskId);
            if (task.missionId) advanceMission(taskId, 'approved');
        }
        return readDB().agentTasks.find(t => t.id === taskId);
    }

    /** Pasos de la misión que vienen después de esta tarea (para no duplicarlos con traspasos). */
    function laterMissionSteps(db, task) {
        if (!task.missionId) return [];
        const parent = (db.agentTasks || []).find(t => t.id === task.missionId);
        return (parent?.missionSteps || []).map((st, i) => ({ ...st, step: i + 1 })).filter(st => st.step > (task.missionStep || 0));
    }

    /** Traspasos que el agente propuso con pasar_tarea: se crean al aprobar, con sus archivos entregados. */
    function createProposedHandoffs(taskId) {
        const task = findTask(readDB(), taskId);
        const later = laterMissionSteps(readDB(), task);
        const pending = (task.proposedHandoffs || []).filter(h => !h.createdTaskId && !h.skipped);
        if (!pending.length) return [];
        const fileIds = (task.artifacts || []).filter(f => f.role === 'deliverable' || f.role === 'report').map(f => f.id);
        const created = [];
        for (const h of pending) {
            const dup = later.find(st => st.agentId === h.agentId);
            if (dup) {
                h.skipped = `Ya es el paso ${dup.step} de la misión`;
                continue;
            }
            try {
                const child = createFollowUp(taskId, { agentId: h.agentId, task: h.task, description: h.description, fileIds, by: task.assignedAgent || 'Agente', byAgentId: task.assignedAgentId, autoRun: true });
                h.createdTaskId = child.id;
                created.push(child);
            } catch (e) {
                h.error = e.message;
            }
        }
        const db = readDB();
        const t = findTask(db, taskId);
        t.proposedHandoffs = task.proposedHandoffs;
        writeDB(db);
        return created;
    }

    /** Al aprobar, el entregable y sus archivos de texto pasan al RAG para que otros agentes lo encuentren. */
    function indexApproved(taskId) {
        setTimeout(async () => {
            try {
                const db = readDB();
                const task = findTask(db, taskId);
                const files = (task.artifacts || []).filter(f => f.role === 'deliverable' && isTextMime(f.mime))
                    .map(f => { try { return { name: f.name, text: artifacts.readText(f) }; } catch { return null; } }).filter(Boolean);
                const ids = await onApproved(task, files);
                const db2 = readDB();
                const t = findTask(db2, taskId);
                t.knowledgeDocIds = ids || [];
                history(t, `🧠 Guardado en la memoria (RAG) para que otros agentes lo usen`);
                writeDB(db2);
                broadcast('task_progressed', { taskId });
            } catch (e) { console.warn('[Office] No se pudo indexar el entregable:', e.message); }
        }, 0);
    }

    function reassign(taskId, agentId) {
        const db = readDB();
        const task = findTask(db, taskId);
        const target = allAgents(db).find(a => a.id === agentId);
        if (!target) throw Object.assign(new Error('Agente no encontrado'), { status: 404 });
        running.delete(taskId);
        releaseAgent(db, task.assignedAgentId, taskId);
        task.assignedAgentId = target.id;
        task.assignedAgent = target.name;
        task.assignedKind = target.kind;
        task.model = target.kind === 'internal' ? target.model : null;
        task.status = 'queued';
        task.progress = 0;
        task.currentStep = target.kind === 'external' ? `Esperando que ${target.name} la tome por MCP` : `Asignada a ${target.name}`;
        history(task, `Reasignada a ${target.name}`);
        feed(db, `🔀 "${clip(task.task, 50)}" reasignada a ${target.name}`, '#38bdf8', 'CEO');
        writeDB(db);
        broadcast('task_reassigned', { taskId, agentId });
        return task;
    }

    // ─── Archivos y tareas de seguimiento desde el dashboard ───
    function attachFiles(taskId, files, { by = 'CEO', byKind = 'ceo' } = {}) {
        const db = readDB();
        const task = findTask(db, taskId);
        const saved = files.map(f => addFile(task, f, { by, byKind }));
        writeDB(db);
        broadcast('task_files', { taskId });
        return saved.map(fileView);
    }

    function getFile(taskId, fileId) {
        const task = findTask(readDB(), taskId);
        const meta = findFile(task, fileId);
        return { meta, path: artifacts.pathOf(meta) };
    }

    function removeFile(taskId, fileId) {
        const db = readDB();
        const task = findTask(db, taskId);
        const meta = findFile(task, fileId);
        task.artifacts = task.artifacts.filter(f => f.id !== meta.id);
        const usedElsewhere = (db.agentTasks || []).some(t => t.id !== taskId && (t.artifacts || []).some(f => f.id === meta.id));
        if (!usedElsewhere) artifacts?.remove(meta);
        history(task, `Se quitó el archivo ${meta.name}`);
        writeDB(db);
        broadcast('task_files', { taskId });
        return { removed: meta.id };
    }

    function resolveTarget(db, ref) {
        if (!ref) return null;
        const everyone = allAgents(db);
        const r = String(ref).toLowerCase();
        return everyone.find(a => a.id === ref) || everyone.find(a => a.name.toLowerCase() === r) || everyone.find(a => a.name.toLowerCase().includes(r))
            || null;
    }

    /**
     * Crea una tarea que continúa a otra (enviar la propuesta, diseñarla, revisarla…) y le pasa sus archivos.
     * Sin agente destino queda abierta para que la tome cualquier agente conectado.
     */
    function createFollowUp(fromTaskId, { agentId, task: title, description = '', fileIds = null, by = 'CEO', byAgentId = null, autoRun = true }) {
        if (!title?.trim()) throw Object.assign(new Error('Describe qué hay que hacer en la tarea de seguimiento'), { status: 400 });
        const db = readDB();
        const parent = findTask(db, fromTaskId);
        const target = resolveTarget(db, agentId);
        if (agentId && !target) throw Object.assign(new Error(`No encontré al agente "${agentId}"`), { status: 404 });
        const files = (parent.artifacts || []).filter(f => !fileIds || fileIds.includes(f.id) || fileIds.includes(f.name));
        const now = nowIso();
        const id = `atask-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        const child = {
            id,
            task: title.trim(),
            title: clip(title.trim(), 50),
            description: [description, `Continúa la tarea "${parent.task}" (${parent.id}), hecha por ${parent.assignedAgent || 'otro agente'}.${files.length ? ' Sus archivos vienen adjuntos.' : ''}`].filter(Boolean).join('\n\n'),
            priorityScore: parent.priorityScore,
            status: 'queued',
            assignedAgent: target?.name || null,
            assignedAgentId: target?.id || 'open',
            assignedKind: target?.kind || 'external',
            model: target?.kind === 'internal' ? target.model : null,
            delegatedBy: by,
            createdByAgentId: byAgentId,
            parentTaskId: parent.id,
            companyId: parent.companyId || '',
            companyName: parent.companyName || '',
            ...(parent.account ? { account: parent.account } : {}),
            artifacts: files.map(f => ({ ...f, inheritedFrom: f.inheritedFrom || parent.id })),
            runs: [],
            history: [{ at: now, text: `Creada por ${by} como seguimiento de "${clip(parent.task, 60)}"${files.length ? ` con ${files.length} archivo(s)` : ''}` }],
            progress: 0,
            currentStep: !target ? 'Abierta: cualquier agente conectado puede tomarla' : target.kind === 'external' ? `Esperando que ${target.name} la tome por MCP` : `En cola para ${target.name}`,
            createdAt: now,
        };
        db.agentTasks = [child, ...(db.agentTasks || [])];
        parent.childTaskIds = [...(parent.childTaskIds || []), id];
        history(parent, `➡️ ${by} creó la tarea de seguimiento "${clip(child.task, 60)}" para ${target?.name || 'cualquier agente'}`);
        feed(db, `➡️ ${by} pasó "${clip(parent.task, 40)}" → ${target?.name || 'tarea abierta'}: "${clip(child.task, 50)}"`, '#38bdf8', by);
        writeDB(db);
        broadcast('task_dispatched', { task: child, assignedAgent: child.assignedAgent });
        if (target?.kind === 'internal' && autoRun !== false) startInternalRun(id);
        return readDB().agentTasks.find(t => t.id === id);
    }

    /** Detiene todo: tareas en curso vuelven a la cola y se descartan resultados en vuelo. */
    function haltAll() {
        running.clear();
    }

    // ─── Lado del agente externo (MCP) ───
    const isMine = (task, ctx) => task.assignedAgentId === `ext-${ctx.tokenId}` || (task.assignedKind === 'external' && task.assignedAgent === ctx.agent);
    const isOpen = task => !task.assignedAgentId || task.assignedAgentId === 'open';

    function viewForAgent(t) {
        return {
            id: t.id, task: t.task, description: t.description, status: normalizeStatus(t.status), priorityScore: t.priorityScore,
            company: t.companyName, progress: t.progress || 0, currentStep: t.currentStep,
            feedback: t.feedback || [], previousResult: (t.feedback || []).length ? clip(t.result, 6000) : undefined,
            assignedTo: t.assignedAgent || null, createdAt: t.createdAt, parentTaskId: t.parentTaskId || undefined,
            files: (t.artifacts || []).map(f => ({ id: f.id, name: f.name, mime: f.mime, kind: f.kind, size: f.size, description: f.description, createdBy: f.createdBy, role: f.role, inheritedFrom: f.inheritedFrom })),
        };
    }

    const canSee = (task, ctx) => isMine(task, ctx) || isOpen(task) || (ctx.tokenId && task.createdByAgentId === `ext-${ctx.tokenId}`);

    function taskForAgent(ctx, taskId) {
        const task = findTask(readDB(), taskId);
        if (!canSee(task, ctx)) throw Object.assign(new Error(`Esta tarea está asignada a ${task.assignedAgent}, no a ti`), { status: 403 });
        const db = readDB();
        return {
            ...viewForAgent(task), result: task.result || undefined, history: (task.history || []).slice(-10),
            ...(task.account ? { account: task.account } : {}),
            lessons: lessonsFor(db, task.assignedAgentId).map(l => ({ kind: l.kind, notes: l.notes, task: l.task })),
        };
    }

    function readFileAsAgent(ctx, taskId, fileId) {
        const task = findTask(readDB(), taskId);
        if (!canSee(task, ctx)) throw Object.assign(new Error(`Esta tarea está asignada a ${task.assignedAgent}, no a ti`), { status: 403 });
        const meta = findFile(task, fileId);
        return { meta: fileView(meta), buffer: artifacts.read(meta) };
    }

    function agentName(ctx) {
        return ctx.tokenId ? (getHub()?.list().find(t => t.id === ctx.tokenId)?.name || ctx.agent) : ctx.agent;
    }

    function attachAsAgent(ctx, taskId, file) {
        let saved;
        mutateAsAgent(ctx, taskId, (task, db, name) => {
            if (!isMine(task, ctx)) throw Object.assign(new Error('Primero toma la tarea con claim_office_task'), { status: 409 });
            if (!['in_progress', 'review'].includes(normalizeStatus(task.status))) throw Object.assign(new Error(`Primero toma la tarea con claim_office_task (está en estado ${normalizeStatus(task.status)})`), { status: 409 });
            saved = { ...addFile(task, file, { by: name, byKind: 'external' }), role: 'deliverable' };
            task.artifacts = [...task.artifacts.slice(0, -1), saved];
            broadcast('task_files', { taskId });
        });
        return fileView(saved);
    }

    function handoffAsAgent(ctx, taskId, { to, task, description, fileIds }) {
        const current = findTask(readDB(), taskId);
        if (!isMine(current, ctx)) throw Object.assign(new Error('Solo puedes pasar a otro agente una tarea tuya'), { status: 403 });
        const child = createFollowUp(taskId, { agentId: to, task, description, fileIds, by: agentName(ctx), byAgentId: ctx.tokenId ? `ext-${ctx.tokenId}` : null });
        return viewForAgent(child);
    }

    function tasksForAgent(ctx, { includeOpen = true } = {}) {
        const db = readDB();
        return (db.agentTasks || [])
            .filter(t => ['queued', 'in_progress'].includes(normalizeStatus(t.status)))
            .filter(t => isMine(t, ctx) || (includeOpen && isOpen(t)))
            .map(viewForAgent);
    }

    function mutateAsAgent(ctx, taskId, fn) {
        const db = readDB();
        const task = findTask(db, taskId);
        if (!isMine(task, ctx) && !isOpen(task)) throw Object.assign(new Error(`Esta tarea está asignada a ${task.assignedAgent}, no a ti`), { status: 403 });
        fn(task, db, agentName(ctx));
        writeDB(db);
        return viewForAgent(task);
    }

    function claim(ctx, taskId) {
        return mutateAsAgent(ctx, taskId, (task, db, name) => {
            const st = normalizeStatus(task.status);
            if (!['queued', 'in_progress'].includes(st)) throw Object.assign(new Error(`La tarea está en estado ${st}; no se puede tomar`), { status: 409 });
            if (ctx.tokenId) task.assignedAgentId = `ext-${ctx.tokenId}`;
            task.assignedAgent = name;
            task.assignedKind = 'external';
            task.status = 'in_progress';
            task.startedAt = task.startedAt || nowIso();
            task.progress = Math.max(task.progress || 0, 10);
            task.currentStep = `${name} tomó la tarea`;
            history(task, task.currentStep);
            feed(db, `🔌 ${name} tomó "${clip(task.task, 60)}"`, '#38bdf8', name);
            broadcast('task_started', { taskId, agentId: task.assignedAgentId });
        });
    }

    function reportProgress(ctx, taskId, { progress, step }) {
        return mutateAsAgent(ctx, taskId, (task, db, name) => {
            if (normalizeStatus(task.status) !== 'in_progress') throw Object.assign(new Error('Primero toma la tarea con claim_office_task'), { status: 409 });
            if (progress != null) task.progress = Math.min(95, Math.max(0, Math.round(progress)));
            if (step) task.currentStep = clip(step, 200);
            history(task, `${name}: ${task.currentStep} (${task.progress}%)`);
            broadcast('task_progressed', { taskId });
        });
    }

    function submitResult(ctx, taskId, { result, failed = false, error = '', model = '', tokensIn = 0, tokensOut = 0 }) {
        const out = mutateAsAgent(ctx, taskId, (task, db, name) => {
            if (normalizeStatus(task.status) !== 'in_progress') throw Object.assign(new Error('Primero toma la tarea con claim_office_task'), { status: 409 });
            const ms = task.startedAt ? Date.now() - Date.parse(task.startedAt) : 0;
            task.runs = [...(task.runs || []), { at: nowIso(), agentId: task.assignedAgentId, model: model || 'externo', provider: 'externo', ok: !failed, tokensIn, tokensOut, costUSD: 0, ms, ...(failed ? { error: clip(error, 400) } : {}) }];
            if (failed) {
                task.status = 'failed';
                task.error = error || 'El agente reportó que no pudo completarla';
                task.currentStep = `Falló: ${clip(task.error, 140)}`;
                feed(db, `⚠️ ${name} no pudo completar "${clip(task.task, 50)}"`, '#ef4444', name);
            } else {
                if (!result?.trim()) throw Object.assign(new Error('Falta el resultado'), { status: 400 });
                const { text, files } = extractFileBlocks(result);
                task.status = 'review';
                task.result = text || result;
                if (artifacts) saveDeliverable(task, { text: task.result, by: name, byKind: 'external', model, files });
                task.progress = 90;
                task.currentStep = 'Entregado: esperando revisión del CEO';
                feed(db, `📬 ${name} entregó "${clip(task.task, 60)}" para revisión`, '#a855f7', name);
            }
            history(task, `${name}: ${task.currentStep}`);
            if (task.missionId) noteMissionStep(db, task);
            broadcast(failed ? 'task_failed' : 'task_delivered', { taskId });
        });
        if (!failed) {
            const t = findTask(readDB(), taskId);
            if (t.missionId) advanceMission(taskId, 'delivered');
        }
        return out;
    }

    return {
        externalAgents, allAgents, computeStats, startInternalRun, review, reassign, haltAll,
        tasksForAgent, claim, reportProgress, submitResult, isRunning: id => running.has(id),
        attachFiles, getFile, removeFile, createFollowUp,
        taskForAgent, readFileAsAgent, attachAsAgent, handoffAsAgent,
        listLessons, removeLesson,
        createMission, advanceMission, budgetStatus: agentId => { const db = readDB(); const a = (db.agents || []).find(x => x.id === agentId); return a ? budgetStatus(db, a) : null; },
    };
}
