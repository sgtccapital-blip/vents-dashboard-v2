// Cola de trabajo de AI Office HQ: tareas para agentes internos (corren con el modelo
// que tengan configurado) y para agentes externos conectados por MCP (las toman, reportan
// avance y entregan resultado). Todo resultado pasa por revisión del CEO antes de cerrarse.
import { runModel as defaultRunModel, providerEnabled, providerOf, PROVIDERS, resolveModel } from './modelRunner.js';

export const ONLINE_MS = 10 * 60 * 1000;
export const OPEN_STATUSES = ['queued', 'in_progress', 'waiting_approval', 'review'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Unifica estados antiguos (pending, completed) con los del tablero. */
export function normalizeStatus(s) {
    if (s === 'pending') return 'queued';
    if (s === 'completed') return 'done';
    return s || 'queued';
}

const nowIso = () => new Date().toISOString();
const clip = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : s || '');

function guessAvatar(name = '') {
    const n = name.toLowerCase();
    if (n.includes('chatgpt') || n.includes('openai') || n.includes('gpt')) return '🟢';
    if (n.includes('claude')) return '🟠';
    if (n.includes('openclaw')) return '🦞';
    if (n.includes('hermes')) return '⚕️';
    if (n.includes('gemini')) return '🔷';
    return '🔌';
}

export function createOfficeService({ readDB, writeDB, broadcast = () => {}, getHub = () => null, getAgents, buildPrompt, runModel = defaultRunModel }) {
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
                const m = byModel[r.model || 'externo'] ||= { model: r.model || 'externo', provider: r.provider || 'externo', runs: 0, tokensIn: 0, tokensOut: 0, costUSD: 0 };
                m.runs++; m.tokensIn += r.tokensIn || 0; m.tokensOut += r.tokensOut || 0;
                if (typeof r.costUSD === 'number') { m.costUSD += r.costUSD; m.priced = true; }
            }
        }
        const agentStats = {};
        for (const a of agents) {
            const s = per[a.id] || blank();
            agentStats[a.id] = {
                ...s,
                costUSD: s.pricedRuns ? Number(s.costUSD.toFixed(4)) : (s.runs ? null : 0),
                avgMs: s.runs ? Math.round(s.totalMs / s.runs) : null,
                successRate: s.done + s.failed ? Math.round((s.done / (s.done + s.failed)) * 100) : null,
            };
        }
        const sum = k => Object.values(agentStats).reduce((acc, s) => acc + (s[k] || 0), 0);
        const done = sum('done'), failed = sum('failed');
        return {
            agentStats,
            byModel: Object.values(byModel).map(({ priced, ...m }) => ({ ...m, costUSD: priced ? Number(m.costUSD.toFixed(4)) : null })).sort((a, b) => b.runs - a.runs),
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

    // ─── Ejecución de agentes internos ───
    /** Arranca la tarea con el modelo del agente. Devuelve enseguida; el resultado llega por SSE. */
    function startInternalRun(taskId) {
        const db = readDB();
        const task = findTask(db, taskId);
        const agent = (db.agents || []).find(a => a.id === task.assignedAgentId);
        if (!agent) throw Object.assign(new Error('La tarea no está asignada a un agente interno'), { status: 400 });
        if (running.has(taskId)) return { started: false, reason: 'Ya se está ejecutando' };

        const model = resolveModel(task.model || agent.model);
        const provider = providerOf(model);
        if (!providerEnabled(provider)) {
            task.status = 'queued';
            task.model = model;
            task.currentStep = `En cola: ${PROVIDERS[provider]?.label || provider} no está configurado (falta ${PROVIDERS[provider]?.env} en .env). Cambia el modelo del agente o agrega la llave.`;
            history(task, task.currentStep);
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
        task.currentStep = `${agent.name} trabajando con ${model}`;
        history(task, task.currentStep);
        agent.status = 'executing';
        agent.activeTaskId = taskId;
        agent.currentTaskName = task.task;
        agent.lastSeen = nowIso();
        writeDB(db);
        broadcast('task_started', { taskId, agentId: agent.id, model });

        (async () => {
            let outcome;
            const runStarted = Date.now();
            try {
                const prompt = await buildPrompt({
                    agentName: agent.name,
                    task: task.task,
                    description: [task.description, ...(task.feedback || []).map(f => `Corrección pedida por el CEO: ${f.notes}`)].filter(Boolean).join('\n\n'),
                    companyId: task.companyId,
                    companyName: task.companyName,
                    previousResult: (task.feedback || []).length ? task.result : null,
                });
                outcome = { ok: true, ...(await runModel({ model, prompt })) };
            } catch (err) {
                outcome = { ok: false, error: err.message, model, provider, ms: Date.now() - runStarted };
            }

            if (running.get(taskId) !== token) return; // cancelada por kill switch o reasignación
            running.delete(taskId);
            const db2 = readDB();
            const t = (db2.agentTasks || []).find(x => x.id === taskId);
            if (!t || normalizeStatus(t.status) !== 'in_progress') return;
            t.runs = [...(t.runs || []), {
                at: nowIso(), agentId: agent.id, model: outcome.model, provider: outcome.provider, ok: outcome.ok,
                tokensIn: outcome.tokensIn || 0, tokensOut: outcome.tokensOut || 0, costUSD: outcome.costUSD ?? null, ms: outcome.ms || 0,
                ...(outcome.ok ? {} : { error: clip(outcome.error, 400) }),
            }];
            if (outcome.ok) {
                t.status = 'review';
                t.result = outcome.text;
                t.progress = 90;
                t.currentStep = 'Entregado: esperando tu revisión';
                history(t, `${agent.name} entregó (${outcome.model}, ${Math.round(outcome.ms / 100) / 10}s)`);
                feed(db2, `📬 ${agent.name} entregó "${clip(t.task, 60)}" para revisión`, '#a855f7', agent.name);
            } else {
                t.status = 'failed';
                t.error = outcome.error;
                t.currentStep = `Falló: ${clip(outcome.error, 140)}`;
                history(t, t.currentStep);
                feed(db2, `⚠️ ${agent.name} falló en "${clip(t.task, 50)}": ${clip(outcome.error, 80)}`, '#ef4444', agent.name);
            }
            releaseAgent(db2, agent.id, taskId);
            writeDB(db2);
            broadcast(outcome.ok ? 'task_delivered' : 'task_failed', { taskId, agentId: agent.id });
        })();

        return { started: true, model };
    }

    // ─── Ciclo de vida desde el dashboard ───
    function review(taskId, { decision, notes = '' }) {
        const db = readDB();
        const task = findTask(db, taskId);
        if (!['approve', 'changes', 'reject'].includes(decision)) throw Object.assign(new Error("decision debe ser 'approve', 'changes' o 'reject'"), { status: 400 });
        const who = task.assignedAgent || 'Agente';
        if (decision === 'approve') {
            task.status = 'done';
            task.progress = 100;
            task.completedAt = nowIso();
            task.approvedBy = 'CEO';
            task.approvalNotes = notes;
            task.currentStep = 'Aprobado por el CEO';
            feed(db, `✅ Aprobaste el entregable de ${who}: "${clip(task.task, 60)}"`, '#10b981', 'CEO');
        } else if (decision === 'reject') {
            task.status = 'cancelled';
            task.currentStep = notes ? `Descartado: ${clip(notes, 120)}` : 'Descartado por el CEO';
            feed(db, `🗑️ Descartaste la tarea de ${who}: "${clip(task.task, 60)}"`, '#64748b', 'CEO');
        } else {
            if (!notes.trim()) throw Object.assign(new Error('Escribe qué hay que cambiar'), { status: 400 });
            task.feedback = [...(task.feedback || []), { at: nowIso(), notes }];
            task.status = 'queued';
            task.progress = 0;
            task.currentStep = `Cambios pedidos: ${clip(notes, 120)}`;
            feed(db, `✏️ Pediste cambios a ${who}: "${clip(notes, 60)}"`, '#f59e0b', 'CEO');
        }
        history(task, task.currentStep);
        if (decision !== 'changes') releaseAgent(db, task.assignedAgentId, taskId);
        writeDB(db);
        broadcast('task_reviewed', { taskId, decision });
        if (decision === 'changes' && task.assignedKind !== 'external') startInternalRun(taskId);
        return readDB().agentTasks.find(t => t.id === taskId);
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
            assignedTo: t.assignedAgent || null, createdAt: t.createdAt,
        };
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
        const name = ctx.tokenId ? (getHub()?.list().find(t => t.id === ctx.tokenId)?.name || ctx.agent) : ctx.agent;
        fn(task, db, name);
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
        return mutateAsAgent(ctx, taskId, (task, db, name) => {
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
                task.status = 'review';
                task.result = result;
                task.progress = 90;
                task.currentStep = 'Entregado: esperando revisión del CEO';
                feed(db, `📬 ${name} entregó "${clip(task.task, 60)}" para revisión`, '#a855f7', name);
            }
            history(task, `${name}: ${task.currentStep}`);
            broadcast(failed ? 'task_failed' : 'task_delivered', { taskId });
        });
    }

    return {
        externalAgents, allAgents, computeStats, startInternalRun, review, reassign, haltAll,
        tasksForAgent, claim, reportProgress, submitResult, isRunning: id => running.has(id),
    };
}
