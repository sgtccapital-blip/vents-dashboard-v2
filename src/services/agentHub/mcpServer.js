// Servidor MCP del Command Center: la puerta única por la que cualquier agente
// (Claude, ChatGPT, OpenClaw, Hermes…) lee el contexto del usuario, opera el dashboard y desarrolla sus proyectos.
// Cada herramienta declara su permiso por función (datos, documentos, memoria, código, ejecución, despliegue);
// el servidor lo aplica en cada llamada (ver toolkit.js y permissions.js).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fold } from '../knowledge/text.js';
import { createToolkit, ToolError } from './toolkit.js';
import { effectivePolicy, FUNCTIONS, requirePermission, workspaceAllowed, allows } from './permissions.js';
import { panamaDate, panamaNow, TIMEZONE } from './time.js';
import { normalizePriority, normalizeOwner, PRIORITIES } from './records.js';

export const SERVER_INSTRUCTIONS = `Este es el Command Center de ARRIVE Agency: el centro donde vive todo lo que hace el usuario (proyectos, eventos, tareas, su historial con ChatGPT, lo que otros agentes guardaron y el código de sus proyectos).
Cómo trabajar:
1. Al empezar llama a get_context (breve; pide detail="full" o sections si necesitas más). Si no sabes qué puedes hacer, get_capabilities y get_permissions.
2. Antes de proponer o decidir algo de un proyecto usa get_project, list_decisions y search_knowledge: probablemente ya se habló antes.
3. Respeta las decisiones vigentes. Una decisión nueva se registra con record_decision como propuesta; no la des por aprobada.
4. Para cambiar datos usa query_records/get_record y luego update_record con expected_etag; si responde VERSION_CONFLICT vuelve a leer. Usa idempotency_key al crear para que un reintento no duplique.
5. Código: list_workspaces → read_file (devuelve sha256) → prepare_patch con expected_sha256 → apply_patch. Pruebas y build con start_job y consulta get_job / get_job_logs (el trabajo sigue aunque se corte la conexión).
6. Si te conectaron para trabajar tareas, revisa get_my_office_tasks (AI Office HQ) y entrega con submit_office_result.
7. Al terminar, deja registro: create_task / update_task, save_memory para datos importantes, log_activity para contar qué hiciste.
Fechas operativas en America/Panama. Responde en el idioma del usuario (normalmente español).`;

const today = () => panamaDate();
const clip = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : s);
const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const rankOf = p => PRIORITY_RANK[normalizePriority(p)] ?? 2;

function taskView(t) {
    const owner = normalizeOwner(t.assignedTo || t.assignee);
    return {
        id: t.id, text: t.text || t.title, status: t.status, priority: normalizePriority(t.priority) || t.priority || null,
        due: t.due || t.dueDate || null, assignedTo: t.assignedTo || t.assignee || null, owner: owner?.name || null,
        projectId: t.projectId || null, eventId: t.eventId || null, dependencies: t.dependencies || [],
    };
}

/** Fechas concretas de un evento: su fecha propia más las de sus instancias (eventos recurrentes). */
export function eventOccurrences(db, { from = today(), to = null, limit = 40 } = {}) {
    const out = [];
    for (const e of db.events || []) {
        const base = { eventId: e.id, event: e.name, location: e.location || null, status: e.status };
        if (e.date) out.push({ ...base, date: e.date, time: e.time || null, name: e.name });
        for (const i of e.instances || []) {
            if (i.date) out.push({ ...base, date: i.date, time: i.time || null, name: i.name || e.name, instanceId: i.id, instanceStatus: i.status || null });
        }
    }
    return out
        .filter(o => o.date >= from && (!to || o.date <= to))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, limit);
}

function findProject(db, ref) {
    const projects = db.projects || [];
    const exact = projects.find(p => p.id === ref);
    if (exact) return exact;
    const f = fold(ref);
    return projects.find(p => fold(p.name) === f) || projects.find(p => fold(p.name).includes(f) || f.includes(fold(p.name)));
}

// ─── Esquemas de salida reutilizables ───
const loose = shape => z.object(shape).passthrough();
const receipt = { operationId: z.string().optional(), action: z.string(), deduplicated: z.boolean().optional() };
const jobOut = { id: z.string(), type: z.string(), workspace: z.string(), status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out', 'interrupted']), progress: loose({}).nullable(), createdAt: z.string(), startedAt: z.string().nullable(), finishedAt: z.string().nullable(), exitCode: z.number().nullable(), commit: z.string().nullable(), artifacts: z.array(loose({ path: z.string(), sha256: z.string() })), executor: loose({ online: z.boolean() }), deduplicated: z.boolean().optional(), operationId: z.string().optional() };
const deploymentOut = { deploymentId: z.string(), kind: z.string(), workspace: z.string(), commit: z.string().nullable(), status: z.string(), artifact: loose({ sha256: z.string() }).nullable(), jobs: z.record(z.string(), loose({ id: z.string(), status: z.string() })), currentRelease: loose({}).nullable(), operationId: z.string().optional(), deduplicated: z.boolean().optional() };
const recordReceipt = { ...receipt, collection: z.string(), id: z.string(), version: z.number().optional(), etag: z.string().optional(), fields: z.array(z.string()).optional() };
const collectionEnum = z.string().describe('Módulo: projects, tasks, events, notes, ideas, contacts, companies, contentTasks, portfolioRoadmap, socialMedia, subscriptions, promoters, dinnerGuestlist, whatsappGroups, whatsappCampaigns, decisionLog, agents, references, orders');
const filterValue = z.union([z.string(), z.number(), z.boolean(), z.null(), loose({ in: z.array(z.union([z.string(), z.number()])).optional(), contains: z.string().optional(), gte: z.string().optional(), lte: z.string().optional(), exists: z.boolean().optional() })]);

/**
 * @param ctx  { agent, scope, tokenId, principal, admin?, policy? }
 * @param deps servicios del hub (ver routes.js)
 */
export function buildMcpServer(ctx, deps) {
    const { readDB, knowledge, createEntity, updateEntity, addActivityFeed, hub, studio, library, office, capture, policies, workspaces, queue, deployments, records, decisions, transfers, integrations, status } = deps;
    const policy = ctx.policy || effectivePolicy(ctx, policies);
    const server = new McpServer({ name: 'arrive-command-center', version: '2.0.0' }, { instructions: SERVER_INSTRUCTIONS });
    const kit = createToolkit({ server, ctx, policy, hub });
    const tool = kit.tool;
    const meta = extra => ({ agent: ctx.agent, principal: ctx.principal || ctx.tokenId || 'admin', operationId: extra.operationId });
    const needWs = (fn, level, ws) => requirePermission(policy, fn, level, { workspace: ws });

    // ─── Descubrimiento ───
    tool('get_capabilities', {
        title: 'Capacidades del servidor',
        description: 'Qué módulos y acciones hay, cuáles puedes usar tú, workspaces autorizados, integraciones conectadas, estado del ejecutor y limitaciones reales. Úsalo para saber qué puedes hacer antes de intentarlo.',
        output: { server: loose({ name: z.string(), version: z.string() }), modules: z.array(loose({ id: z.string(), available: z.boolean(), actions: z.array(z.string()) })), workspaces: z.array(loose({ id: z.string() })), integrations: z.array(loose({ id: z.string(), status: z.string() })), executor: loose({ online: z.boolean() }), limitations: z.array(z.string()) },
    }, async () => {
        const can = (fn, level) => allows(policy, fn, level);
        const acts = (pairs) => pairs.filter(([, fn, level]) => can(fn, level)).map(([a]) => a);
        const st = status?.() || {};
        const dataModules = records ? records.modules().map(m => ({ id: `data:${m.id}`, label: m.label, available: true, count: m.count, archived: m.archived, actions: acts([['query', 'data', 'read'], ['get', 'data', 'read'], ['versions', 'data', 'read'], ...(m.writable ? [['create', 'data', 'write'], ['update', 'data', 'write'], ['archive', 'data', 'write'], ['restore', 'data', 'write'], ['restore_version', 'data', 'write'], ['batch', 'data', 'write']] : [])]), note: m.via ? `Se edita con ${m.via}` : undefined })) : [];
        const modules = [
            ...dataModules,
            { id: 'knowledge', label: 'Conocimiento (ChatGPT, memorias, RAG)', available: !!knowledge, actions: acts([['search', 'memory', 'read'], ['save_memory', 'memory', 'write']]) },
            { id: 'decisions', label: 'Decisiones con procedencia', available: !!decisions, actions: acts([['list', 'memory', 'read'], ['propose', 'memory', 'write'], ['approve', 'memory', 'approve'], ['reject', 'memory', 'approve']]) },
            { id: 'documents', label: 'Briefs y documentos versionados', available: !!capture, actions: acts([['read', 'documents', 'read'], ['versions', 'documents', 'read'], ['attach', 'documents', 'write'], ['restore_version', 'documents', 'write'], ['large_upload', 'documents', 'write']]) },
            { id: 'capture', label: 'Captura de conversaciones', available: !!capture, actions: acts([['preview', 'data', 'read'], ['apply', 'data', 'write']]) },
            { id: 'office', label: 'AI Office HQ', available: !!office, actions: acts([['my_tasks', 'data', 'read'], ['work_tasks', 'data', 'write']]) },
            { id: 'library', label: 'Biblioteca de repos y skills', available: !!library, actions: acts([['search', 'memory', 'read'], ['add', 'memory', 'write']]) },
            { id: 'references', label: 'Referencias de video', available: !!studio, actions: acts([['get', 'memory', 'read'], ['add', 'memory', 'write']]) },
            { id: 'code', label: 'Código y Git', available: !!workspaces, actions: acts([['list/read/search/status/diff', 'code', 'read'], ['prepare/apply patch', 'code', 'write'], ['branch/commit', 'code', 'commit']]) },
            { id: 'jobs', label: 'Ejecución duradera', available: !!queue, actions: acts([['start/cancel', 'exec', 'run']]).concat(can('code', 'read') || can('exec', 'run') ? ['get/logs/list'] : []) },
            { id: 'deploy', label: 'Despliegues', available: !!deployments, actions: acts([['status/list', 'deploy', 'prepare'], ['prepare/validate', 'deploy', 'prepare'], ['deploy/rollback', 'deploy', 'release']]) },
        ];
        return {
            server: { name: 'arrive-command-center', version: st.version || '2.0.0', dashboardVersion: st.dashboardVersion || null, timezone: TIMEZONE, now: panamaNow() },
            modules,
            workspaces: (workspaces?.list() || []).filter(w => w.enabled && workspaceAllowed(policy, w.id) && (can('code', 'read') || can('exec', 'run') || can('deploy', 'prepare'))).map(w => ({ id: w.id, name: w.name, kind: w.kind, jobs: Object.keys(w.jobs || {}).filter(k => k !== 'scripts'), scripts: w.allowedScripts || [], deploy: w.deploy?.provider || null })),
            integrations: (integrations?.list() || []).map(i => ({ id: i.id, label: i.label, status: i.status, note: i.note })),
            executor: { online: !!st.executor?.online, lastHeartbeat: st.executor?.lastHeartbeat || null },
            limitations: [
                'Solo se accede a lo que el cliente MCP envía en la conversación activa: no se leen otros chats ni cuentas no conectadas.',
                'Push a GitHub, PR y despliegues en Render no están disponibles por MCP.',
                'No hay herramientas para enviar mensajes (WhatsApp, correo) en nombre del usuario.',
                st.executor?.online ? 'El ejecutor está activo: los trabajos corren en la Mac.' : 'El ejecutor no está activo: los trabajos quedan en cola hasta que vuelva.',
                'El gateway, los datos y el ejecutor viven en la Mac: si está apagada, el conector no responde.',
                'Archivos por MCP en base64 hasta 7 MB; más grandes con create_upload (hasta 25 MB).',
            ],
        };
    });

    tool('get_connection_status', {
        title: 'Estado de la conexión',
        description: 'Quién eres para el servidor, versión, hora de Panamá, estado del ejecutor local, qué funciones están disponibles ahora y cuáles esperan al ejecutor, e integraciones conectadas.',
        output: { caller: loose({ agent: z.string(), kind: z.string() }), gateway: loose({ online: z.boolean(), version: z.string() }), executor: loose({ online: z.boolean() }), availability: loose({}), integrations: z.array(loose({ id: z.string(), status: z.string() })) },
    }, async () => {
        const st = status?.() || {};
        return {
            caller: { agent: ctx.agent, kind: ctx.kind || (ctx.admin ? 'admin' : ctx.tokenId?.startsWith('oauth:') ? 'oauth' : 'token'), principal: ctx.principal || ctx.tokenId || 'admin', clientScope: ctx.scope },
            gateway: { online: true, version: st.version || '2.0.0', dashboardVersion: st.dashboardVersion || null, now: panamaNow(), publicUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL.replace(/\/$/, '')}/mcp` : null },
            executor: st.executor || { online: false },
            availability: st.availability || {},
            integrations: (integrations?.list() || []).map(({ id, label, status: s, note, lastHeartbeat }) => ({ id, label, status: s, note, lastHeartbeat })),
        };
    });

    tool('get_permissions', {
        title: 'Mis permisos',
        description: 'Tus permisos efectivos por función (datos, documentos, memoria, código, ejecución, despliegue), los workspaces autorizados, de dónde salen y qué herramientas tienes o te faltan. Los cambia el administrador desde el panel; quedan guardados hasta que se revoquen.',
        output: { principal: z.string(), source: z.string(), clientScope: z.string(), functions: z.record(z.string(), loose({ level: z.string(), levels: z.array(z.string()) })), workspaces: z.union([z.literal('*'), z.array(z.string())]), tools: loose({ allowed: z.array(z.string()), denied: z.array(loose({ name: z.string(), needs: z.string() })) }) },
    }, async () => ({
        principal: ctx.principal || ctx.tokenId || 'admin', agent: ctx.agent, source: policy.source, clientScope: policy.clientScope, policyVersion: policy.policyVersion || 0,
        functions: Object.fromEntries(Object.entries(FUNCTIONS).map(([fn, f]) => [fn, { level: policy[fn], levels: f.levels, label: f.label, help: f.help }])),
        workspaces: policy.workspaces,
        tools: { allowed: kit.registered.map(t => t.name), denied: [...kit.denied].map(([name, p]) => ({ name, needs: `${p[0]}:${p[1]}` })) },
        howToChange: 'El administrador los ajusta en Agent & RAG → Agentes conectados → Permisos. Un cliente autorizado solo con lectura no puede escribir aunque su política lo permita.',
    }));

    // ─── Contexto ───
    tool('get_context', {
        title: 'Contexto del usuario',
        perm: ['data', 'read'],
        description: 'Llámalo primero. Por defecto es breve: perfil resumido, proyectos activos principales, próximos eventos, pendientes vencidos y prioritarios, y qué pedir para ampliar. detail="full" devuelve todo; sections limita a partes concretas; project_id enfoca un proyecto.',
        input: {
            detail: z.enum(['brief', 'full']).optional().describe('brief (por defecto) o full'),
            sections: z.array(z.enum(['profile', 'projects', 'events', 'tasks', 'activity', 'decisions', 'knowledge'])).optional(),
            project_id: z.string().optional().describe('Enfocar en un proyecto'),
        },
        output: { today: z.string(), timezone: z.string(), detail: z.string() },
    }, async ({ detail = 'brief', sections, project_id }) => {
        const db = readDB();
        const full = detail === 'full';
        const want = s => !sections?.length || sections.includes(s);
        const d = today();
        const focus = project_id ? findProject(db, project_id) : null;
        if (project_id && !focus) throw new ToolError('NOT_FOUND', `No encontré el proyecto ${project_id}.`, { hint: 'Usa list_projects.' });
        const memories = new Map(knowledge.projects().map(m => [m.projectId, m]));
        let pending = (db.tasks || []).filter(t => !t.done);
        if (focus) pending = pending.filter(t => t.projectId === focus.id);
        const overdue = pending.filter(t => (t.due || t.dueDate) && (t.due || t.dueDate) < d);
        const sorted = [...pending].sort((a, b) => rankOf(a.priority) - rankOf(b.priority) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
        const out = { today: d, timezone: TIMEZONE, detail: full ? 'full' : 'brief' };
        if (want('profile')) { const p = knowledge.profile()?.text; out.userProfile = p ? (full ? p : clip(p, 700)) : 'Todavía no hay perfil: se genera al importar las conversaciones de ChatGPT.'; }
        if (focus) {
            const m = memories.get(focus.id);
            out.focusProject = { id: focus.id, name: focus.name, status: focus.status, priority: normalizePriority(focus.priority) || focus.priority || null, objective: clip(focus.currentObjective || focus.objective, full ? 2000 : 400), nextAction: clip(focus.nextAction, 300), blockers: clip(focus.blockers, 300), memory: m ? clip(m.synthesis?.overview, full ? 3000 : 600) : null, briefVersion: focus.briefVersions?.length || 0 };
        }
        if (want('projects') && !focus) {
            const rows = (db.projects || []).map(p => ({ id: p.id, name: p.name, status: p.status, priority: normalizePriority(p.priority) || p.priority || null, objective: clip(p.currentObjective || p.objective, full ? 240 : 120), nextAction: clip(p.nextAction, full ? 200 : 100), pendingTasks: pending.filter(t => t.projectId === p.id).length, hasMemory: memories.has(p.id) }));
            const active = rows.filter(p => !['needs-review', 'discovery', 'archived', 'paused'].includes(p.status)).sort((a, b) => rankOf(a.priority) - rankOf(b.priority));
            out.projects = full ? rows : active.slice(0, 6);
            if (!full) out.projectsSummary = { total: rows.length, active: active.length, needsReview: rows.filter(p => p.status === 'needs-review').length };
        }
        if (want('events')) out.upcomingEvents = eventOccurrences(db, { from: d, limit: full ? 15 : 5 }).filter(e => !focus || db.events.find(x => x.id === e.eventId)?.projectId === focus.id || !focus);
        if (want('tasks')) out.tasks = { pending: pending.length, overdueCount: overdue.length, overdue: overdue.map(taskView).slice(0, full ? 15 : 5), top: sorted.slice(0, full ? 15 : 5).map(taskView) };
        if (want('decisions') && decisions) { const list = decisions.list({ projectId: focus?.id }); out.decisions = { current: list.decisions.filter(x => x.status === 'approved').slice(0, full ? 20 : 5).map(x => ({ id: x.id, decision: clip(x.decision, 200), date: x.date, project: x.project })), proposedPending: list.decisions.filter(x => x.status === 'proposed').length }; }
        if (want('activity') && (full || sections?.includes('activity'))) out.recentActivity = (db.activityFeed || []).slice(0, 8).map(a => ({ at: a.timestamp, text: a.text }));
        if (want('knowledge')) { const s = knowledge.status(); out.knowledge = { chatgptConversations: s.chatgpt.total, projectMemories: s.projects, documents: s.store.docs }; }
        if (want('knowledge') && knowledge.listRecentConversationUpdates) out.recentConversationUpdates = knowledge.listRecentConversationUpdates({ from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), limit: full ? 15 : 5 }).map(c => ({ id: c.id, title: c.title, date: c.date, status: c.status, summary: clip(c.summary, full ? 400 : 160) }));
        if (!full) out.more = ['get_context detail="full" — todo el contexto', 'get_project — ficha, memoria, briefs y documentos de un proyecto', 'query_records — cualquier módulo con filtros', 'list_decisions — decisiones vigentes y propuestas', 'search_knowledge — memoria y conversaciones', 'list_recent_conversation_updates — conversaciones recientes'];
        return out;
    });

    tool('search_knowledge', {
        title: 'Buscar en la memoria',
        perm: ['memory', 'read'],
        description: 'Búsqueda por significado en todo lo que sabe el dashboard: conversaciones con ChatGPT (resúmenes y texto), memoria por proyecto, perfil del usuario, proyectos, eventos, tareas, notas, documentos, memorias de otros agentes y referencias de video. Úsalo antes de decidir algo para no contradecir lo ya hablado, y con source "reference" antes de editar, animar o diseñar.',
        input: {
            query: z.string().describe('Pregunta o tema en lenguaje natural'),
            top_k: z.number().int().min(1).max(20).optional().describe('Cuántos resultados (por defecto 8)'),
            source: z.enum(['chatgpt', 'dashboard', 'memory', 'reference', 'library']).optional().describe('Limitar a una fuente'),
            project_id: z.string().optional().describe('Limitar a un proyecto del dashboard'),
        },
    }, async ({ query, top_k = 8, source, project_id }) => {
        const { mode, results } = await knowledge.search({ query, topK: top_k, source, projectId: project_id });
        return {
            mode,
            results: results.map(r => ({
                title: r.doc.title, source: r.doc.source, kind: r.doc.kind, docId: r.docId,
                project: r.doc.meta?.project || null, projectId: r.doc.meta?.projectId || null,
                date: r.doc.meta?.date ? String(r.doc.meta.date).slice(0, 10) : null,
                relevance: r.doc.meta?.relevance || null, provenance: { origin: r.doc.meta?.origin || r.doc.source, agent: r.doc.meta?.agent || null }, text: r.text,
            })),
        };
    });

    // ─── Biblioteca de repos y skills ───
    if (library) {
        tool('search_library', {
            title: 'Buscar en la biblioteca de repos y skills', perm: ['memory', 'read'],
            description: 'Busca por significado en los repos de GitHub que el usuario guardó (README, notas, etiquetas) y en sus skills (SKILL.md) y agentes. Úsalo antes de construir algo desde cero.',
            input: {
                query: z.string().describe('Qué necesitas (p. ej. "generar PDFs", "scraping de Instagram")'),
                kind: z.enum(['repo', 'skill', 'agent']).optional().describe('Limitar a repos, skills o agentes'),
                top_k: z.number().int().min(1).max(20).optional(),
            },
        }, async ({ query, kind, top_k = 8 }) => {
            const { mode, results } = await knowledge.search({ query, topK: top_k, source: 'library', kind });
            const seen = new Set();
            return {
                mode,
                results: results.filter(r => !seen.has(r.docId) && seen.add(r.docId)).map(r => ({ title: r.doc.title, kind: r.doc.kind, repo: r.doc.meta?.repo, path: r.doc.meta?.itemPath || null, url: r.doc.meta?.url, tags: r.doc.meta?.tags, text: r.text })),
                hint: 'Para leer una skill completa usa get_library_item con repo y path.',
            };
        });

        tool('list_library', {
            title: 'Listar la biblioteca', perm: ['memory', 'read'],
            description: 'Todos los repos guardados con su descripción, etiquetas, notas, estado y las skills/agentes que contienen.',
        }, async () => ({
            stats: library.stats(),
            repos: library.list().map(r => ({
                id: r.id, url: r.url, description: clip(r.description, 200), tags: r.tags, interest: r.interest, notes: clip(r.notes, 300), stars: r.stars, language: r.language, status: r.status, localPath: r.localPath,
                skills: r.skills.map(s => ({ name: s.name, path: s.path, description: clip(s.description, 160) })),
                agents: r.agents.map(s => ({ name: s.name, path: s.path, description: clip(s.description, 160) })),
            })),
        }));

        tool('get_library_item', {
            title: 'Leer una skill o un repo', perm: ['memory', 'read'],
            description: 'Devuelve el SKILL.md completo (o el agente) con la lista de archivos y la ruta local donde está clonado. Sin path devuelve el README del repo.',
            input: {
                repo: z.string().describe('dueño/repo'),
                path: z.string().optional().describe('Ruta del SKILL.md o del agente dentro del repo'),
            },
        }, async ({ repo, path: itemPath }) => {
            if (itemPath) return library.getItem(repo, itemPath);
            const r = library.get(repo);
            if (!r) throw new Error('Repo no encontrado en la biblioteca');
            return { id: r.id, url: r.url, description: r.description, localPath: library.repoDir(r.id), notes: r.notes, tags: r.tags, readme: clip(library.getReadme(r.id), 20000) };
        });

        tool('add_to_library', {
            title: 'Guardar un repo en la biblioteca', perm: ['memory', 'write'], hints: { idempotent: true, openWorld: true },
            description: 'Guarda un repo de GitHub que valga la pena en la biblioteca del usuario: se clona, se detectan sus skills y queda en la búsqueda de todos los agentes. Explica en notes para qué sirve.',
            input: {
                url: z.string().describe('https://github.com/dueño/repo'),
                notes: z.string().optional().describe('Para qué sirve y por qué se guarda'),
                tags: z.array(z.string()).optional(),
            },
        }, async ({ url, notes = '', tags = [] }) => {
            const r = library.addRepo({ url, notes, tags, addedBy: ctx.agent });
            addActivityFeed?.(`📚 ${ctx.agent} guardó ${r.id} en la biblioteca`, '#a78bfa');
            return { action: 'queued', id: r.id, status: r.status, message: 'Clonando; sus skills aparecerán en search_library en unos segundos.' };
        });
    }

    tool('list_projects', {
        title: 'Listar proyectos', perm: ['data', 'read'],
        description: 'Proyectos del dashboard con estado, prioridad normalizada, objetivo y si tienen memoria consolidada de ChatGPT. También lista proyectos detectados en ChatGPT que no existen en el dashboard.',
    }, async () => {
        const db = readDB();
        const memories = knowledge.projects();
        return {
            projects: (db.projects || []).map(p => {
                const m = memories.find(x => x.projectId === p.id);
                return { id: p.id, name: p.name, status: p.status, priority: normalizePriority(p.priority) || p.priority || null, category: p.category, objective: clip(p.currentObjective || p.objective, 200), memory: m ? clip(m.synthesis.overview, 300) : null };
            }),
            detectedInChatGPT: memories.filter(m => !m.projectId).map(m => ({ key: m.key, name: m.name, conversations: m.conversationCount, overview: clip(m.synthesis.overview, 300) })),
        };
    });

    tool('get_project', {
        title: 'Detalle de un proyecto', perm: ['data', 'read'],
        description: 'Todo sobre un proyecto: ficha, memoria consolidada, decisiones con estado, tareas, briefs y documentos (con versión, procedencia y si están vigentes) y conversaciones de ChatGPT relacionadas.',
        input: { project: z.string().describe('id o nombre del proyecto (acepta nombre aproximado)') },
    }, async ({ project }) => {
        const db = readDB();
        const p = findProject(db, project);
        const memories = knowledge.projects();
        const memory = p ? memories.find(m => m.projectId === p.id) : memories.find(m => fold(m.name).includes(fold(project)));
        if (!p && !memory) throw new ToolError('NOT_FOUND', `No encontré el proyecto "${project}".`, { hint: 'Usa list_projects para ver los nombres.' });
        const { activityLog, ...record } = p || {};
        const convs = memory ? knowledge.listConversations({ projectKey: memory.key, limit: 20 }).items : [];
        const briefs = p?.briefVersions || [];
        return {
            project: p ? { ...record, briefVersions: undefined, brief: undefined, recentLog: (activityLog || []).slice(-10), etag: records?.etagOf(p) } : null,
            memory: memory ? { ...memory.synthesis, updatedAt: memory.updatedAt, conversations: memory.conversationCount, provenance: 'memoria consolidada de conversaciones de ChatGPT' } : null,
            decisions: p && decisions ? decisions.list({ projectId: p.id, includeSuperseded: true }).decisions.map(d => ({ id: d.id, decision: d.decision, status: d.status, date: d.date, provenance: d.provenance?.source })) : [],
            tasks: p ? (db.tasks || []).filter(t => t.projectId === p.id).map(taskView) : [],
            briefs: briefs.map(v => ({ id: v.id, version: v.version, sha256: v.sha256, status: v.version === briefs.length ? 'current' : 'superseded', draftStatus: v.status, source: v.source, createdBy: v.createdBy, createdAt: v.createdAt })),
            documents: p?.documents?.map(v => ({ id: v.id, name: v.name, mime: v.mime, size: v.size, sha256: v.sha256, version: v.version || 1, status: v.status || 'current', createdBy: v.createdBy || null, projectId: v.projectId, taskId: v.taskId, createdAt: v.createdAt })) || [],
            chatgptConversations: convs.map(c => ({ id: c.id, title: c.title, date: String(c.updateTime).slice(0, 10), summary: c.summary })),
        };
    });

    tool('list_tasks', {
        title: 'Listar tareas', perm: ['data', 'read'],
        description: 'Tareas del dashboard filtradas por estado, proyecto, responsable o prioridad (normalizada). Por defecto solo las no terminadas. Para filtros más ricos usa query_records.',
        input: {
            status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
            project_id: z.string().optional(),
            assigned_to: z.string().optional(),
            priority: z.enum(PRIORITIES).optional(),
            include_done: z.boolean().optional(),
            limit: z.number().int().min(1).max(200).optional(),
            cursor: z.number().int().min(0).optional(),
        },
    }, async ({ status: st, project_id, assigned_to, priority, include_done = false, limit = 50, cursor = 0 }) => {
        let rows = readDB().tasks || [];
        if (st) rows = rows.filter(t => t.status === st);
        else if (!include_done) rows = rows.filter(t => !t.done);
        if (project_id) rows = rows.filter(t => t.projectId === project_id);
        if (assigned_to) rows = rows.filter(t => fold(t.assignedTo || t.assignee).includes(fold(assigned_to)));
        if (priority) rows = rows.filter(t => normalizePriority(t.priority) === priority);
        return { total: rows.length, tasks: rows.slice(cursor, cursor + limit).map(taskView), nextCursor: cursor + limit < rows.length ? cursor + limit : null };
    });

    tool('list_events', {
        title: 'Agenda de eventos', perm: ['data', 'read'],
        description: 'Fechas de eventos (incluye cada fecha de los eventos recurrentes) entre dos días. Por defecto desde hoy en Panamá.',
        input: {
            from: z.string().optional().describe('AAAA-MM-DD, por defecto hoy'),
            to: z.string().optional().describe('AAAA-MM-DD'),
            limit: z.number().int().min(1).max(200).optional(),
        },
    }, async ({ from, to, limit = 40 }) => ({ timezone: TIMEZONE, events: eventOccurrences(readDB(), { from: from || today(), to, limit }) }));

    tool('get_chatgpt_conversation', {
        title: 'Leer conversación de ChatGPT', perm: ['memory', 'read'],
        description: 'Resumen y mensajes de una conversación importada de ChatGPT (el id sale de search_knowledge o get_project).',
        input: { id: z.string().describe('id de la conversación (sin el prefijo "chatgpt:")') },
    }, async ({ id }) => {
        const conv = knowledge.getConversation(id.replace(/^chatgpt:/, '').replace(/:digest$/, ''));
        if (!conv || conv.status === 'excluded') throw new ToolError('NOT_FOUND', 'Conversación no encontrada');
        return {
            id: conv.id, title: conv.title, created: conv.createTime, updated: conv.updateTime, digest: conv.digest || null,
            messages: conv.messages.map(m => ({ role: m.role === 'user' ? 'usuario' : 'chatgpt', text: clip(m.text, 4000) })),
        };
    });

    // ─── Sincronización de conversaciones (extensión de ChatGPT, exportaciones y capturas MCP) ───
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    tool('get_sync_status', {
        title: 'Estado de la sincronización de conversaciones', perm: ['memory', 'read'],
        description: 'Cuántas conversaciones están capturadas, resumidas, indexadas, fallidas o pendientes, por fuente; última señal de la extensión de Chrome, retraso y estado del procesamiento. Es una fotografía: no garantiza que la extensión esté activa ahora.',
    }, async () => {
        const st = knowledge.status();
        return { ...st.chatgpt, worker: st.worker, ai: st.ai, projects: st.projects, profileUpdatedAt: st.profileUpdatedAt };
    });

    tool('list_recent_conversation_updates', {
        title: 'Conversaciones recientes', perm: ['memory', 'read'],
        description: 'Conversaciones nuevas o actualizadas en un rango de fechas (por defecto los últimos 7 días), con resumen, cuenta, workspace, origen y revisión.',
        input: { from: z.string().optional().describe('AAAA-MM-DD; por defecto hace 7 días'), to: z.string().optional().describe('AAAA-MM-DD'), limit: z.number().int().min(1).max(200).optional() },
    }, async ({ from, to, limit = 40 }) => ({ from: from || daysAgo(7), to: to || null, updates: knowledge.listRecentConversationUpdates({ from: from || daysAgo(7), to, limit }) }));

    tool('get_conversation_summary', {
        title: 'Resumen de una conversación', perm: ['memory', 'read'],
        description: 'Resumen estructurado de una conversación (temas, hechos, ideas, decisiones, correcciones, preguntas y pendientes con referencias a mensajes), con su procedencia. Las propuestas del asistente no son decisiones del usuario.',
        input: { id: z.string().describe('id de la conversación') },
    }, async ({ id }) => {
        const conv = knowledge.getConversation(id.replace(/^chatgpt:/, '').replace(/:digest$/, ''));
        if (!conv || conv.status === 'excluded') throw new ToolError('NOT_FOUND', 'Conversación no encontrada', { hint: 'Búscala con list_recent_conversation_updates o search_knowledge.' });
        return { id: conv.id, originalId: conv.originalId || conv.id, title: conv.title, date: conv.updateTime, createdAt: conv.createTime, origin: conv.origin || 'legacy', accountId: conv.accountId || null, workspaceId: conv.workspaceId || null, revision: conv.revision || null, status: conv.status, messageCount: conv.messageCount ?? conv.messages?.length ?? 0, digest: conv.digest || null, digestError: conv.digestError || null };
    });

    tool('reprocess_conversation', {
        title: 'Reprocesar conversación', perm: ['memory', 'write'], hints: { idempotent: true },
        description: 'Vuelve a generar el resumen de una conversación ya capturada (p. ej. tras un fallo). No crea tareas ni cambia datos del dashboard.',
        input: { id: z.string() },
    }, async ({ id }) => {
        if (!knowledge.reprocessConversation(id)) throw new ToolError('NOT_FOUND', 'Conversación no encontrada, excluida o sin original guardado.');
        return { action: 'queued', id, status: 'pending' };
    });

    tool('capture_conversation_knowledge', {
        title: 'Capturar conversación al conocimiento', perm: ['memory', 'write'], hints: { idempotent: true },
        description: 'Guarda en el conocimiento el contenido de la conversación que TÚ envías (no lee otros chats). Exige cuenta, workspace e id de conversación: la misma identidad y contenido no se duplican; un contenido editado crea una revisión. Solo escribe conocimiento: los pendientes que mencione no se convierten en tareas.',
        input: {
            account_id: z.string().min(1).max(200), workspace_id: z.string().min(1).max(200), conversation_id: z.string().min(1).max(200),
            title: z.string().max(300).optional(), updated_at: z.string().optional().describe('ISO 8601'),
            messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1), id: z.string().max(120).optional(), created_at: z.string().optional() })).min(1).max(2000),
        },
    }, async ({ account_id, workspace_id, conversation_id, title, updated_at, messages }) => {
        const ts = v => (v && !Number.isNaN(Date.parse(v)) ? Date.parse(v) / 1000 : null);
        const updated = ts(updated_at) || Date.now() / 1000;
        const mapping = Object.fromEntries(messages.map((m, i) => [`n${i}`, {
            id: `n${i}`, parent: i ? `n${i - 1}` : null, children: i + 1 < messages.length ? [`n${i + 1}`] : [],
            message: { id: m.id || `m${i}`, create_time: ts(m.created_at) || updated, author: { role: m.role }, content: { content_type: 'text', parts: [m.text] } },
        }]));
        const raw = { id: conversation_id, title: title || 'Conversación capturada por MCP', create_time: ts(messages[0].created_at) || updated, update_time: updated, current_node: `n${messages.length - 1}`, mapping };
        const summary = knowledge.importConversations([raw], { origin: 'mcp', fileName: ctx.agent, identity: { accountId: account_id, workspaceId: workspace_id } });
        return { action: summary.added ? 'created' : summary.updated ? 'updated' : 'existing', ...summary };
    });

    // ─── Compatibilidad con conectores de ChatGPT (deep research / conocimiento de empresa) ───
    const docUrl = id => `${(process.env.PUBLIC_URL || 'http://localhost:8090').replace(/\/$/, '')}/agent-brain#${encodeURIComponent(id)}`;
    tool('search', {
        title: 'Buscar documentos', perm: ['memory', 'read'],
        description: 'Busca en la memoria del Command Center (ChatGPT, proyectos, eventos, tareas, notas, memorias de agentes). Devuelve ids para usar con fetch.',
        input: { query: z.string().describe('Qué buscar, en lenguaje natural') },
    }, async ({ query }) => {
        const { results } = await knowledge.search({ query, topK: 10 });
        return { results: results.map(r => ({ id: r.docId, title: r.doc.title, url: docUrl(r.docId) })) };
    });

    tool('fetch', {
        title: 'Leer documento', perm: ['memory', 'read'],
        description: 'Texto completo de un documento devuelto por search.',
        input: { id: z.string().describe('id devuelto por search') },
    }, async ({ id }) => {
        const doc = knowledge.store.getDoc(id);
        if (!doc) throw new ToolError('NOT_FOUND', `No existe el documento ${id}`);
        let text = knowledge.store.chunksOf(id).map(c => c.text).join('\n\n');
        const digest = id.startsWith('chatgpt:') && !id.endsWith(':digest') ? knowledge.store.getDoc(`${id}:digest`) : null;
        if (digest) text = `${knowledge.store.chunksOf(digest.id).map(c => c.text).join('\n')}\n\n--- Conversación ---\n\n${text}`;
        return { id, title: doc.title, text: clip(text, 60000), url: docUrl(id), metadata: { source: doc.source, kind: doc.kind, ...(doc.meta || {}) } };
    });

    // ─── Escritura heredada (se conservan nombres y entradas) ───
    tool('create_task', {
        title: 'Crear tarea', perm: ['data', 'write'], hints: { idempotent: true },
        description: 'Crea una tarea en el dashboard. Con idempotency_key un reintento devuelve la misma tarea en vez de duplicarla.',
        input: {
            text: z.string().min(3).describe('Qué hay que hacer, en una frase accionable'),
            project_id: z.string().optional(),
            due: z.string().optional().describe('AAAA-MM-DD (America/Panama)'),
            priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
            assigned_to: z.string().optional(),
            notes: z.string().optional(),
            idempotency_key: z.string().max(180).optional(),
        },
    }, async ({ text, project_id, due, priority = 'medium', assigned_to, notes, idempotency_key }, extra) => {
        if (project_id && !(readDB().projects || []).some(p => p.id === project_id)) throw new ToolError('NOT_FOUND', `No existe el proyecto ${project_id}`);
        if (records) {
            const r = records.create('tasks', { data: { text, projectId: project_id || null, due: due || '', priority, assignedTo: assigned_to || '', notes: notes || '' }, idempotencyKey: idempotency_key }, meta(extra));
            if (r.action === 'created') addActivityFeed(`🤖 ${ctx.agent} creó la tarea: ${clip(text, 90)}`);
            return { ...taskView(records.find('tasks', r.id) || { id: r.id, text }), action: r.action, version: r.version, etag: r.etag, deduplicated: r.deduplicated };
        }
        const task = createEntity('tasks', { text, projectId: project_id || null, due: due || '', priority, assignedTo: assigned_to || '', notes: notes || '', createdBy: ctx.agent, createdAt: new Date().toISOString() });
        addActivityFeed(`🤖 ${ctx.agent} creó la tarea: ${clip(text, 90)}`);
        return { ...taskView(task), action: 'created' };
    });

    tool('update_task', {
        title: 'Actualizar tarea', perm: ['data', 'write'], hints: { idempotent: true },
        description: 'Cambia estado, texto, fecha, prioridad o responsable de una tarea existente. Envía expected_etag (de get_record o list) para no pisar cambios de otro.',
        input: {
            id: z.string(),
            status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
            text: z.string().optional(),
            due: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
            assigned_to: z.string().optional(),
            note: z.string().optional().describe('Comentario sobre el cambio (se añade a las notas)'),
            expected_etag: z.string().optional(),
        },
    }, async ({ id, status: st, text, due, priority, assigned_to, note, expected_etag }, extra) => {
        const current = (readDB().tasks || []).find(t => t.id === id);
        if (!current) throw new ToolError('NOT_FOUND', `No existe la tarea ${id}`, { hint: 'Búscala con list_tasks.' });
        const changes = {};
        if (st) changes.status = st;
        if (text) changes.text = text;
        if (due !== undefined) changes.due = due;
        if (priority) changes.priority = priority;
        if (assigned_to !== undefined) changes.assignedTo = assigned_to;
        if (note) changes.notes = [current.notes, `[${today()} ${ctx.agent}] ${note}`].filter(Boolean).join('\n');
        let task;
        let r = null;
        if (records) { r = records.update('tasks', id, { data: changes, expected: expected_etag }, meta(extra)); task = records.find('tasks', id); }
        else task = updateEntity('tasks', id, { ...changes, updatedBy: ctx.agent, updatedAt: new Date().toISOString() });
        if (st === 'done' && r?.action !== 'unchanged') addActivityFeed(`✅ ${ctx.agent} completó: ${clip(task.text, 90)}`);
        return { ...taskView(task), action: r?.action || 'updated', version: r?.version, etag: r?.etag };
    });

    tool('save_memory', {
        title: 'Guardar en la memoria', perm: ['memory', 'write'], hints: { idempotent: true },
        description: 'Guarda un dato, aprendizaje o resultado importante para que lo vean todos los agentes y aparezca en search_knowledge. Las decisiones van con record_decision. Repetir el mismo contenido no crea otra memoria.',
        input: {
            title: z.string().describe('Título corto'),
            content: z.string().min(10).describe('El contenido completo, autoexplicativo'),
            project_id: z.string().optional(),
            tags: z.array(z.string()).optional(),
            source_url: z.string().optional().describe('De dónde sale (procedencia)'),
        },
    }, async ({ title, content, project_id, tags = [], source_url }) => {
        const doc = await knowledge.saveMemory({ title, content, source: 'agent', agent: ctx.agent, projectId: project_id || '', tags, extraMeta: { sourceUrl: source_url || null, savedOn: today() } });
        return { action: doc.deduplicated ? 'existing' : 'created', saved: true, id: doc.id, title: doc.title };
    });

    tool('add_reference', {
        title: 'Guardar referencia de video', perm: ['memory', 'write'], hints: { idempotent: true, openWorld: true },
        description: 'Agrega uno o varios links (YouTube, Instagram, TikTok, Vimeo, X…) a la biblioteca de referencias. Gemini analiza el video y arma un playbook que entra al RAG en unos minutos.',
        input: {
            urls: z.array(z.string().url()).min(1).max(20),
            type: z.enum(['viral', 'tutorial']).optional().describe('tutorial: enseña una técnica; viral: referencia de formato/estilo (por defecto)'),
            notes: z.string().optional().describe('Para qué se guarda'),
            account_ids: z.array(z.string()).optional().describe('ids de cuentas de redes a las que aplica'),
        },
    }, async ({ urls, type = 'viral', notes = '', account_ids = [] }) => {
        if (!studio?.addReferences) throw new ToolError('UNAVAILABLE', 'La biblioteca de referencias no está activa');
        const r = studio.addReferences({ urls, type, notes, accountIds: account_ids, addedBy: ctx.agent });
        if (r.added.length) addActivityFeed(`🎬 ${ctx.agent} agregó ${r.added.length} referencia${r.added.length > 1 ? 's' : ''} para analizar`);
        return { action: r.added.length ? 'created' : 'existing', ...r };
    });

    tool('get_reference', {
        title: 'Ver referencia de video', perm: ['memory', 'read'],
        description: 'Playbook completo de una referencia guardada. El id sale de search_knowledge (docId "reference:<id>") o de add_reference.',
        input: { id: z.string() },
    }, async ({ id }) => {
        const r = studio?.getReference(id.replace(/^reference:/, ''));
        if (!r) throw new ToolError('NOT_FOUND', 'Referencia no encontrada');
        return r;
    });

    tool('log_activity', {
        title: 'Registrar actividad', perm: ['data', 'write'],
        description: 'Cuenta en una frase lo que hiciste (aparece en el feed de actividad del dashboard). Úsalo al terminar un trabajo.',
        input: { message: z.string().min(3).max(280) },
    }, async ({ message }) => {
        addActivityFeed(`🤖 ${ctx.agent}: ${message}`);
        return { action: 'logged', logged: true };
    });

    // ─── Captura de conversaciones (se conserva tal cual) ───
    if (capture) {
        tool('preview_conversation_capture', { title: 'Previsualizar captura', perm: ['data', 'read'], description: 'Compara el lote enviado por este chat con los registros actuales sin modificarlos.', input: { batch: z.record(z.string(), z.any()) } }, async ({ batch }) => capture.preview(batch));
        tool('apply_conversation_capture', { title: 'Guardar captura en lote', perm: ['data', 'write'], hints: { idempotent: true }, description: 'Guarda proyectos, briefs, tareas, eventos y documentos accesibles enviados por este chat. Requiere una clave de idempotencia estable y devuelve comprobante por operación; reintentar con la misma clave no duplica. No lee otros chats automáticamente.', input: { batch: z.record(z.string(), z.any()) } }, async ({ batch }) => ({ action: 'applied', ...capture.apply(batch) }));
        tool('get_capture_receipt', { title: 'Consultar comprobante', perm: ['data', 'read'], description: 'Devuelve IDs, enlaces y errores de una captura previa.', input: { capture_id: z.string() } }, async ({ capture_id }) => capture.getReceipt(capture_id) || (() => { throw new ToolError('NOT_FOUND', 'Captura inexistente'); })());
        tool('upsert_project', { title: 'Crear o actualizar proyecto', perm: ['data', 'write'], hints: { idempotent: true }, description: 'Resuelve por ID, external_id o nombre exacto. update_existing=true permite cambiar campos de uno existente.', input: { name: z.string().optional(), id: z.string().optional(), external_id: z.string().optional(), objective: z.string().optional(), description: z.string().optional(), status: z.string().optional(), priority: z.string().optional(), update_existing: z.boolean().optional() } }, async args => capture.upsertProject(args));
        tool('upsert_project_brief', { title: 'Guardar versión de brief', perm: ['documents', 'write'], hints: { idempotent: true }, description: 'Guarda un brief editable y versionado en el proyecto; contenido idéntico no genera otra versión.', input: { project_id: z.string(), content: z.string().min(1), status: z.string().optional() } }, async args => capture.upsertBrief(args));
        tool('upsert_dashboard_task', { title: 'Crear o actualizar tarea', perm: ['data', 'write'], hints: { idempotent: true }, description: 'Resuelve duplicados por ID, external_id o texto exacto en el proyecto. Fecha, responsable y dependencias son opcionales.', input: { id: z.string().optional(), external_id: z.string().optional(), project_id: z.string().optional(), text: z.string(), due: z.string().nullable().optional(), assigned_to: z.string().nullable().optional(), status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(), priority: z.string().nullable().optional(), notes: z.string().optional(), dependencies: z.array(z.string()).optional(), update_existing: z.boolean().optional() } }, async args => capture.upsertTask(args));
        tool('upsert_calendar_event', { title: 'Crear o actualizar evento de calendario', perm: ['data', 'write'], hints: { idempotent: true }, description: 'Registra evento en America/Panama; exige fecha explícita y hora o all_day=true. Para modificar uno existente indica update_existing=true.', input: { id: z.string().optional(), name: z.string(), date: z.string(), time: z.string().optional(), all_day: z.boolean().optional(), project_id: z.string().optional(), external_id: z.string().optional(), location: z.string().optional(), description: z.string().optional(), timezone: z.literal('America/Panama').optional(), update_existing: z.boolean().optional() } }, async args => capture.upsertEvent(args));
        tool('attach_project_document', { title: 'Adjuntar documento real', perm: ['documents', 'write'], hints: { idempotent: true }, description: 'Transfiere hasta 7 MB de un archivo accesible en el chat y lo asocia a proyecto o tarea. Usa content para texto o content_base64 para binario; devuelve SHA-256 y versión. Un archivo con el mismo nombre y otro contenido crea una versión nueva. Para archivos grandes usa create_upload.', input: { project_id: z.string().optional(), task_id: z.string().optional(), name: z.string(), content: z.string().optional(), content_base64: z.string().optional(), sha256: z.string().optional(), description: z.string().optional(), expected_current_id: z.string().optional().describe('Versión vigente que viste (evita pisar una versión nueva de otro)') } }, async args => capture.attach(args));
        tool('read_project_document', {
            title: 'Leer documento adjunto', perm: ['documents', 'read'],
            description: 'Lee un documento de proyecto o tarea por su ID. Texto en UTF-8; binarios en base64 hasta 2 MB (más grandes: create_download_link).',
            input: { file_id: z.string() },
        }, async ({ file_id }) => {
            const item = capture.readFile(file_id);
            if (!item) throw new ToolError('NOT_FOUND', 'Documento inexistente');
            const isText = /^text\//.test(item.meta.mime) || item.meta.mime === 'application/json';
            if (!isText && item.bytes.length > 2 * 1024 * 1024) throw new ToolError('TOO_LARGE', 'El archivo es grande para enviarlo en base64.', { hint: 'Usa create_download_link y descárgalo por HTTP.' });
            return { id: item.meta.id, name: item.meta.name, mime: item.meta.mime, sha256: item.meta.sha256, version: item.meta.version || 1, status: item.meta.status || 'current', encoding: isText ? 'utf8' : 'base64', content: item.bytes.toString(isText ? 'utf8' : 'base64') };
        });
        tool('list_document_versions', {
            title: 'Versiones de un documento', perm: ['documents', 'read'],
            description: 'Todas las versiones de un documento (por cualquiera de sus ids): versión, estado vigente/sustituido, hash, autor y fecha.',
            input: { file_id: z.string() },
            output: { name: z.string(), current: z.string().nullable(), versions: z.array(loose({ id: z.string(), version: z.number(), status: z.string(), sha256: z.string() })) },
        }, async ({ file_id }) => capture.documentVersions(file_id) || (() => { throw new ToolError('NOT_FOUND', 'Documento inexistente'); })());
        tool('restore_document_version', {
            title: 'Recuperar versión de documento', perm: ['documents', 'write'], hints: { idempotent: true },
            description: 'Recupera una versión anterior como versión NUEVA (no borra las posteriores). Exige expected_current_id: si alguien subió otra versión desde que miraste, falla con conflicto.',
            input: { file_id: z.string().describe('Versión a recuperar'), expected_current_id: z.string().describe('Versión vigente que viste') },
            output: { ...receipt, id: z.string(), version: z.number(), sha256: z.string() },
        }, async args => { try { return capture.restoreDocument(args, ctx.agent); } catch (e) { if (/Conflicto/.test(e.message)) throw new ToolError('VERSION_CONFLICT', e.message, { hint: 'Consulta list_document_versions y repite con la vigente.' }); throw e; } });
        tool('restore_brief_version', {
            title: 'Recuperar versión de brief', perm: ['documents', 'write'], hints: { idempotent: true },
            description: 'Vuelve a poner como vigente el contenido de una versión anterior del brief creando una versión nueva. Exige expected_current_version (número de la última versión que viste).',
            input: { project_id: z.string(), version: z.number().int().min(1), expected_current_version: z.number().int().min(1) },
            output: { ...receipt, id: z.string(), version: z.number(), restoredFrom: z.number() },
        }, async args => { try { return capture.restoreBrief(args); } catch (e) { if (/Conflicto/.test(e.message)) throw new ToolError('VERSION_CONFLICT', e.message, { hint: 'Consulta get_project (briefs) y repite con la versión actual.' }); throw e; } });
    }

    // ─── Transferencias grandes ───
    if (transfers) {
        tool('create_upload', {
            title: 'Preparar subida de archivo grande', perm: ['documents', 'write'],
            description: 'Para archivos de más de 7 MB (hasta 25 MB) o binarios que no conviene mandar en base64: devuelve una URL de un solo uso (15 min) para hacer PUT de los bytes. Exige tamaño exacto y SHA-256; el archivo queda adjunto con versión.',
            input: { name: z.string(), size: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/), project_id: z.string().optional(), task_id: z.string().optional(), description: z.string().optional() },
            output: { uploadId: z.string(), method: z.literal('PUT'), url: z.string(), expiresAt: z.string(), maxBytes: z.number(), operationId: z.string().optional() },
        }, async ({ name, size, sha256, project_id, task_id, description }, extra) => transfers.createUpload({ name, size, sha256, projectId: project_id, taskId: task_id, description }, meta(extra)));
        tool('get_upload', {
            title: 'Estado de una subida', perm: ['documents', 'read'],
            description: 'Estado de una subida creada con create_upload: pending, completed (con id del documento), rejected o expired.',
            input: { upload_id: z.string() },
            output: { id: z.string(), status: z.enum(['pending', 'completed', 'rejected', 'expired']) },
        }, async ({ upload_id }) => transfers.getUpload(upload_id, ctx.admin ? 'admin' : (ctx.principal || ctx.tokenId)));
        tool('create_download_link', {
            title: 'Enlace de descarga', perm: ['documents', 'read'],
            description: 'URL firmada y temporal para descargar un documento grande por HTTP, con su SHA-256 para verificarlo.',
            input: { file_id: z.string(), ttl_seconds: z.number().int().min(30).max(3600).optional() },
            output: { fileId: z.string(), url: z.string(), sha256: z.string(), expiresAt: z.string() },
        }, async ({ file_id, ttl_seconds }) => transfers.createDownloadLink(file_id, { ttlSec: ttl_seconds }));
    }

    // ─── Registros de cualquier módulo ───
    if (records) {
        tool('query_records', {
            title: 'Consultar registros', perm: ['data', 'read'],
            description: 'Lista registros de cualquier módulo del dashboard con filtros (igualdad, in, contains, gte/lte, exists), texto, orden, campos y paginación. Cada registro trae _etag para editar sin pisar cambios. Prioridades y estados salen normalizados.',
            input: {
                collection: collectionEnum,
                filters: z.record(z.string(), filterValue).optional().describe('Ej. {"status":"pending","projectId":"proj-2","due":{"lte":"2026-12-01"}}'),
                text: z.string().optional(),
                include_archived: z.boolean().optional(),
                sort: z.string().optional(), order: z.enum(['asc', 'desc']).optional(),
                fields: z.array(z.string()).optional().describe('Solo estos campos (respuestas más breves)'),
                cursor: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(200).optional(),
            },
            output: { collection: z.string(), total: z.number(), nextCursor: z.number().nullable(), items: z.array(loose({ id: z.string(), _etag: z.string() })) },
        }, async a => records.query(a.collection, { filters: a.filters, text: a.text, includeArchived: a.include_archived, sort: a.sort, order: a.order, fields: a.fields, cursor: a.cursor, limit: a.limit }));

        tool('get_record', {
            title: 'Leer registro', perm: ['data', 'read'],
            description: 'Un registro con su versión (_version), _etag y opcionalmente su historial de cambios (quién, cuándo, qué campos).',
            input: { collection: collectionEnum, id: z.string(), include_history: z.boolean().optional() },
            output: { id: z.string(), _etag: z.string(), _version: z.number().nullable() },
        }, async ({ collection, id, include_history }) => records.get(collection, id, { includeHistory: include_history }));

        tool('create_record', {
            title: 'Crear registro', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Crea un registro en un módulo con las validaciones del dashboard. Usa idempotency_key (o external_id) para que un reintento no duplique. Fechas AAAA-MM-DD en America/Panama.',
            input: { collection: collectionEnum, data: z.record(z.string(), z.any()), external_id: z.string().optional(), idempotency_key: z.string().max(180).optional() },
            output: recordReceipt,
        }, async ({ collection, data, external_id, idempotency_key }, extra) => records.create(collection, { data, externalId: external_id, idempotencyKey: idempotency_key }, meta(extra)));

        tool('update_record', {
            title: 'Editar registro', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Cambia campos de un registro. Envía expected_etag (o expected_version) de la lectura: si otro lo cambió después, responde VERSION_CONFLICT con los campos afectados.',
            input: { collection: collectionEnum, id: z.string(), data: z.record(z.string(), z.any()), expected_etag: z.string().optional(), expected_version: z.number().int().optional(), idempotency_key: z.string().max(180).optional() },
            output: recordReceipt,
        }, async ({ collection, id, data, expected_etag, expected_version, idempotency_key }, extra) => records.update(collection, id, { data, expected: expected_version ?? expected_etag, idempotencyKey: idempotency_key }, meta(extra)));

        tool('archive_record', {
            title: 'Archivar registro', perm: ['data', 'write'], hints: { destructive: true, idempotent: true },
            description: 'Saca un registro de las vistas del dashboard sin borrarlo (se puede restaurar con restore_record). Envía expected_etag.',
            input: { collection: collectionEnum, id: z.string(), expected_etag: z.string().optional(), reason: z.string().max(300).optional() },
            output: { ...receipt, collection: z.string(), id: z.string() },
        }, async ({ collection, id, expected_etag, reason }, extra) => records.archive(collection, id, { expected: expected_etag, reason }, meta(extra)));

        tool('restore_record', {
            title: 'Restaurar registro archivado', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Devuelve un registro archivado a su módulo tal como estaba. No sobrescribe si ya existe uno con ese id.',
            input: { collection: collectionEnum, id: z.string() },
            output: { ...receipt, collection: z.string(), id: z.string() },
        }, async ({ collection, id }, extra) => records.restore(collection, id, meta(extra)));

        tool('batch_records', {
            title: 'Operaciones en lote', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Hasta 100 operaciones create/update/archive/restore con comprobante por operación. Con idempotency_key, reintentar el lote no repite las que ya se hicieron.',
            input: {
                operations: z.array(z.object({ op: z.enum(['create', 'update', 'archive', 'restore']), collection: z.string(), id: z.string().optional(), data: z.record(z.string(), z.any()).optional(), external_id: z.string().optional(), expected_etag: z.string().optional(), expected_version: z.number().int().optional(), reason: z.string().optional() })).min(1).max(100),
                idempotency_key: z.string().max(160).optional(),
                stop_on_error: z.boolean().optional(),
            },
            output: { total: z.number(), ok: z.number(), failed: z.number(), results: z.array(loose({ index: z.number(), ok: z.boolean() })), operationId: z.string().optional() },
        }, async ({ operations, idempotency_key, stop_on_error }, extra) => records.batch({ operations, idempotencyKey: idempotency_key, stopOnError: stop_on_error }, meta(extra)));

        tool('list_record_versions', {
            title: 'Historial de un registro', perm: ['data', 'read'],
            description: 'Versiones de un registro: número, etag, autor, fecha, acción y campos cambiados (incluye cambios hechos desde la interfaz).',
            input: { collection: collectionEnum, id: z.string() },
            output: { collection: z.string(), id: z.string(), current: z.number().nullable(), versions: z.array(loose({ version: z.number(), etag: z.string(), at: z.string(), actor: z.string() })) },
        }, async ({ collection, id }) => records.versions(collection, id));

        tool('get_record_version', {
            title: 'Ver una versión anterior', perm: ['data', 'read'],
            description: 'Contenido completo de un registro en una versión concreta.',
            input: { collection: collectionEnum, id: z.string(), version: z.number().int().min(1) },
            output: { collection: z.string(), id: z.string(), version: z.number(), snapshot: loose({}) },
        }, async ({ collection, id, version }) => records.getVersion(collection, id, version));

        tool('restore_record_version', {
            title: 'Recuperar versión de un registro', perm: ['data', 'write'], hints: { destructive: true, idempotent: true },
            description: 'Recupera campos de una versión anterior como versión nueva. Exige expected_version (la actual que viste). Si otros cambiaron esos campos después, se niega (RESTORE_WOULD_OVERWRITE) salvo que indiques fields concretos u overwrite_later_changes=true.',
            input: { collection: collectionEnum, id: z.string(), version: z.number().int().min(1), expected_version: z.number().int().min(1), fields: z.array(z.string()).optional(), overwrite_later_changes: z.boolean().optional() },
            output: { ...recordReceipt, fromVersion: z.number().optional(), keptLaterChanges: z.array(z.string()).optional() },
        }, async ({ collection, id, version, expected_version, fields, overwrite_later_changes }, extra) => records.restoreVersion(collection, id, { version, expected: expected_version, fields, overwriteLater: overwrite_later_changes }, meta(extra)));

        tool('normalize_records', {
            title: 'Normalizar prioridades y estados', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Muestra (apply=false, por defecto) o aplica (apply=true) la normalización de prioridades (alta→high, crítica→critical…) y estados guardados en un módulo. Cada cambio queda en el historial.',
            input: { collection: z.enum(['tasks', 'projects', 'events']), apply: z.boolean().optional() },
            output: { collection: z.string(), applied: z.boolean(), count: z.number(), changes: z.array(loose({ id: z.string() })) },
        }, async ({ collection, apply = false }, extra) => records.normalizeStored(collection, { apply }, meta(extra)));
    }

    // ─── Decisiones ───
    if (decisions) {
        tool('list_decisions', {
            title: 'Decisiones', perm: ['memory', 'read'],
            description: 'Decisiones con estado (approved = vigente, proposed, superseded, rejected), fecha en Panamá, versión y procedencia. Por defecto oculta las sustituidas y rechazadas.',
            input: { project_id: z.string().optional(), status: z.enum(['proposed', 'approved', 'superseded', 'rejected']).optional(), include_superseded: z.boolean().optional(), text: z.string().optional(), limit: z.number().int().min(1).max(200).optional() },
            output: { total: z.number(), decisions: z.array(loose({ id: z.string(), decision: z.string(), status: z.string(), current: z.boolean() })) },
        }, async a => decisions.list({ projectId: a.project_id, status: a.status, includeSuperseded: a.include_superseded, text: a.text, limit: a.limit }));

        tool('record_decision', {
            title: 'Registrar decisión (propuesta)', perm: ['memory', 'write'], hints: { idempotent: true },
            description: 'Registra una decisión como PROPUESTA con su procedencia (de qué conversación o documento sale). Detecta posibles contradicciones con decisiones vigentes y con la memoria, pero no aprueba nada: lo hace una persona o un agente con permiso memory:approve.',
            input: {
                decision: z.string().min(8), topic: z.string().optional().describe('Tema corto para agrupar (p. ej. "precio de mesas VIP")'), project_id: z.string().optional(),
                rationale: z.string().optional(), impact: z.string().optional(), date: z.string().optional().describe('AAAA-MM-DD en Panamá; por defecto hoy'),
                provenance: z.object({ source: z.string().optional(), conversation_id: z.string().optional(), url: z.string().optional(), quote: z.string().optional() }).optional(),
                supersedes: z.array(z.string()).optional().describe('Decisiones que esta reemplazaría si se aprueba'),
                idempotency_key: z.string().max(180).optional(),
            },
            output: { ...recordReceipt, status: z.literal('proposed'), possibleContradictions: z.array(loose({ reason: z.string() })) },
        }, async (a, extra) => decisions.propose({ decision: a.decision, topic: a.topic, projectId: a.project_id, rationale: a.rationale, impact: a.impact, date: a.date, provenance: a.provenance, supersedes: a.supersedes, idempotencyKey: a.idempotency_key }, meta(extra)));

        tool('approve_decision', {
            title: 'Aprobar decisión', perm: ['memory', 'approve'], hints: { idempotent: true },
            description: 'Convierte una propuesta en decisión vigente y marca como sustituidas las que reemplaza. Solo para quien tenga permiso de aprobación.',
            input: { id: z.string(), expected_etag: z.string().optional(), supersede: z.array(z.string()).optional(), note: z.string().optional() },
            output: { ...receipt, id: z.string(), superseded: z.array(z.string()).optional() },
        }, async ({ id, expected_etag, supersede, note }, extra) => decisions.approve({ id, expected: expected_etag, supersede, note }, meta(extra)));

        tool('reject_decision', {
            title: 'Rechazar propuesta', perm: ['memory', 'approve'], hints: { idempotent: true },
            description: 'Marca una propuesta como rechazada, con el motivo.',
            input: { id: z.string(), reason: z.string().optional(), expected_etag: z.string().optional() },
            output: { ...receipt, id: z.string() },
        }, async ({ id, reason, expected_etag }, extra) => decisions.reject({ id, reason, expected: expected_etag }, meta(extra)));
    }

    // ─── Código ───
    if (workspaces) {
        tool('list_workspaces', {
            title: 'Workspaces de código', perm: ['code', 'read'],
            description: 'Repositorios y carpetas autorizados para ti, con rama, trabajos disponibles (test, lint, build, scripts) y destino de despliegue.',
            output: { workspaces: z.array(loose({ id: z.string(), name: z.string(), kind: z.string() })) },
        }, async () => {
            const rows = [];
            for (const w of workspaces.list().filter(x => x.enabled && workspaceAllowed(policy, x.id))) {
                let git = null;
                if (w.kind === 'git') { try { const s = await workspaces.gitStatus(w.id); git = { branch: s.branch, head: s.head, changedFiles: s.files.length, ahead: s.ahead, behind: s.behind }; } catch { git = null; } }
                rows.push({ id: w.id, name: w.name, kind: w.kind, description: w.description, parent: w.parent, branch: w.branch, git, jobs: Object.keys(w.jobs || {}).filter(k => k !== 'scripts'), scripts: w.allowedScripts || [], protectedBranches: w.protectedBranches, deploy: w.deploy?.provider || null });
            }
            return { workspaces: rows };
        });

        const wsInput = { workspace: z.string().describe('id de list_workspaces') };
        tool('list_files', {
            title: 'Listar archivos', perm: ['code', 'read'],
            description: 'Archivos del workspace (respeta .gitignore; oculta credenciales y datos internos), con filtro glob y paginación.',
            input: { ...wsInput, glob: z.string().optional().describe('Ej. "src/**/*.jsx"'), cursor: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(1000).optional() },
            output: { workspace: z.string(), total: z.number(), files: z.array(z.string()), nextCursor: z.number().nullable() },
        }, async ({ workspace, glob, cursor, limit }) => { needWs('code', 'read', workspace); return workspaces.listFiles(workspace, { glob, cursor, limit }); });

        tool('search_files', {
            title: 'Buscar en el código', perm: ['code', 'read'],
            description: 'Busca texto (o regex con regex=true) en los archivos del workspace. Devuelve archivo, línea y texto.',
            input: { ...wsInput, query: z.string().min(1), regex: z.boolean().optional(), case_sensitive: z.boolean().optional(), glob: z.string().optional(), limit: z.number().int().min(1).max(500).optional() },
            output: { workspace: z.string(), count: z.number(), truncated: z.boolean(), matches: z.array(loose({ path: z.string(), line: z.number(), text: z.string() })) },
        }, async ({ workspace, query, regex, case_sensitive, glob, limit }) => { needWs('code', 'read', workspace); return workspaces.searchFiles(workspace, { query, regex, caseSensitive: case_sensitive, glob, limit }); });

        tool('read_file', {
            title: 'Leer archivo', perm: ['code', 'read'],
            description: 'Lee un archivo por rango de líneas (máx. 2000 líneas / 256 KB por llamada). Devuelve sha256 del archivo completo: envíalo como expected_sha256 al parchear.',
            input: { ...wsInput, path: z.string(), start_line: z.number().int().min(1).optional(), end_line: z.number().int().min(1).optional() },
            output: { workspace: z.string(), path: z.string(), sha256: z.string(), size: z.number(), totalLines: z.number(), startLine: z.number(), endLine: z.number(), truncated: z.boolean(), redacted: z.boolean(), binary: z.boolean(), content: z.string() },
        }, async ({ workspace, path: p, start_line, end_line }) => { needWs('code', 'read', workspace); return workspaces.readFile(workspace, p, { startLine: start_line, endLine: end_line }); });

        tool('git_status', {
            title: 'Estado Git', perm: ['code', 'read'],
            description: 'Rama, commit actual, adelantos/atrasos y archivos modificados del workspace.',
            input: wsInput,
            output: { workspace: z.string(), branch: z.string().nullable(), head: z.string().nullable(), clean: z.boolean(), files: z.array(loose({ path: z.string() })) },
        }, async ({ workspace }) => { needWs('code', 'read', workspace); return workspaces.gitStatus(workspace); });

        tool('git_diff', {
            title: 'Diferencias Git', perm: ['code', 'read'],
            description: 'Diff de los cambios sin confirmar (o staged, o contra una base) con estadística por archivo.',
            input: { ...wsInput, paths: z.array(z.string()).optional(), staged: z.boolean().optional(), base: z.string().optional().describe('commit/rama base, ej. "main" o "HEAD~3"') },
            output: { workspace: z.string(), files: z.array(loose({ path: z.string(), added: z.number(), deleted: z.number() })), diff: z.string(), truncated: z.boolean() },
        }, async ({ workspace, paths, staged, base }) => { needWs('code', 'read', workspace); return workspaces.gitDiff(workspace, { paths, staged, base }); });

        const editSchema = z.object({
            path: z.string(),
            action: z.enum(['create', 'update', 'delete']).optional(),
            expected_sha256: z.string().optional().describe('sha256 que devolvió read_file (obligatorio para update/delete)'),
            content: z.string().optional().describe('Contenido completo nuevo'),
            replacements: z.array(z.object({ old_text: z.string(), new_text: z.string(), replace_all: z.boolean().optional() })).optional(),
        });
        tool('prepare_patch', {
            title: 'Preparar parche', perm: ['code', 'write'], hints: { readOnly: true },
            description: 'Valida cambios sin tocar archivos: edits (contenido o reemplazos exactos, con expected_sha256) o un diff unificado. Devuelve patch_id y la vista previa del diff. Detecta conflictos de versión y credenciales.',
            input: { ...wsInput, edits: z.array(editSchema).optional(), diff: z.string().optional(), description: z.string().max(500).optional() },
            output: { patchId: z.string(), workspace: z.string(), status: z.string(), files: z.array(loose({ path: z.string(), action: z.string(), baseSha256: z.string().nullable() })), diff: z.string() },
        }, async ({ workspace, edits, diff, description }) => { needWs('code', 'write', workspace); return workspaces.preparePatch(workspace, { edits, diff, description }, ctx.agent); });

        tool('apply_patch', {
            title: 'Aplicar parche', perm: ['code', 'write'], hints: { destructive: true, idempotent: true },
            description: 'Aplica un parche preparado (patch_id) o edits directos. Antes comprueba que ningún archivo cambió desde que se leyó; si cambió responde VERSION_CONFLICT y no toca nada. Repetirlo no vuelve a aplicarlo.',
            input: { patch_id: z.string().optional(), workspace: z.string().optional(), edits: z.array(editSchema).optional() },
            output: { patchId: z.string(), workspace: z.string(), status: z.string(), files: z.array(loose({ path: z.string(), resultSha256: z.string().nullable() })), alreadyApplied: z.boolean().optional(), operationId: z.string().optional() },
        }, async ({ patch_id, workspace, edits }) => {
            let pid = patch_id;
            if (!pid) {
                if (!workspace || !edits?.length) throw new ToolError('INVALID_INPUT', 'Envía patch_id, o workspace y edits.');
                needWs('code', 'write', workspace);
                pid = (await workspaces.preparePatch(workspace, { edits }, ctx.agent)).patchId;
            }
            const p = workspaces.getPatch(pid);
            needWs('code', 'write', p.workspace);
            const r = await workspaces.applyPatch(pid, ctx.agent);
            return { ...r, action: r.alreadyApplied ? 'already_applied' : 'applied' };
        });

        tool('get_patch', {
            title: 'Ver parche', perm: ['code', 'read'],
            description: 'Estado (prepared, applied, conflict), archivos con hashes antes/después y diff de un parche.',
            input: { patch_id: z.string() },
            output: { patchId: z.string(), workspace: z.string(), status: z.string(), files: z.array(loose({ path: z.string() })) },
        }, async ({ patch_id }) => { const p = workspaces.getPatch(patch_id); needWs('code', 'read', p.workspace); return p; });

        tool('create_branch', {
            title: 'Crear rama', perm: ['code', 'commit'], hints: { idempotent: true },
            description: 'Crea una rama. Por defecto en un worktree aparte (nuevo workspace "<id>:<rama>") para no tocar la copia en la que trabaja el usuario.',
            input: { ...wsInput, name: z.string().min(1).max(100), from: z.string().optional().describe('Base (por defecto HEAD)'), worktree: z.boolean().optional() },
            output: { workspace: z.string(), branch: z.string(), head: z.string(), action: z.string(), operationId: z.string().optional() },
        }, async ({ workspace, name, from, worktree = true }) => { needWs('code', 'commit', workspace); return workspaces.createBranch(workspace, { name, from, worktree }, ctx.agent); });

        tool('commit_changes', {
            title: 'Confirmar cambios (commit)', perm: ['code', 'commit'],
            description: 'Hace commit solo de los archivos indicados en la rama actual del workspace (nunca "todo"). Rechaza ramas protegidas (main…) y cambios con credenciales. expected_head evita confirmar sobre una rama que avanzó.',
            input: { ...wsInput, message: z.string().min(3).max(2000), paths: z.array(z.string()).min(1).max(200), expected_head: z.string().optional() },
            output: { workspace: z.string(), branch: z.string(), commit: z.string(), files: z.array(z.string()), operationId: z.string().optional() },
        }, async ({ workspace, message, paths, expected_head }, extra) => { needWs('code', 'commit', workspace); const r = await workspaces.commit(workspace, { message, paths, expectedHead: expected_head }, ctx.agent, extra.operationId); return { ...r, action: 'committed' }; });
    }

    // ─── Trabajos duraderos ───
    if (queue) {
        const canSeeJobs = () => allows(policy, 'exec', 'run') || allows(policy, 'code', 'read') || allows(policy, 'deploy', 'prepare');
        tool('start_job', {
            title: 'Lanzar trabajo', perm: ['exec', 'run'], hints: { openWorld: true },
            description: 'Encola pruebas (test), lint, build o un script autorizado en un workspace. Devuelve un id persistente: consulta con get_job y get_job_logs aunque se corte la conexión o desde otro chat. Usa idempotency_key para que reintentar no lo lance dos veces.',
            input: { ...{ workspace: z.string() }, type: z.enum(['test', 'lint', 'build', 'script']), script: z.string().optional().describe('Nombre del script (type=script)'), args: z.array(z.string()).max(20).optional().describe('Argumentos extra validados (p. ej. un archivo de pruebas)'), timeout_seconds: z.number().int().min(10).max(3600).optional(), idempotency_key: z.string().max(180).optional() },
            output: jobOut,
        }, async ({ workspace, type, script, args, timeout_seconds, idempotency_key }, extra) => {
            needWs('exec', 'run', workspace);
            const job = queue.start({ type, workspace, script, args, timeoutSec: timeout_seconds }, { ...meta(extra), idempotencyKey: idempotency_key });
            return { ...job, action: job.deduplicated ? 'existing' : 'queued' };
        });

        const readJob = id => {
            if (!canSeeJobs()) throw new ToolError('PERMISSION_DENIED', 'Necesitas exec:run, code:read o deploy:prepare para ver trabajos.');
            const j = queue.get(id);
            if (!workspaceAllowed(policy, j.workspace)) throw new ToolError('PERMISSION_DENIED', `El workspace "${j.workspace}" no está autorizado para este agente.`, { hint: 'Pide que lo autoricen en el panel de permisos.' });
            return j;
        };
        if (canSeeJobs()) {
        tool('get_job', {
            title: 'Estado de un trabajo', perm: null,
            description: 'Estado, progreso, marcas de tiempo, código de salida, resumen de pruebas, commit y artefactos (con SHA-256) de un trabajo. Indica si el ejecutor está activo y si el trabajo quedó interrumpido por un reinicio.',
            input: { job_id: z.string() },
            output: jobOut,
        }, async ({ job_id }) => readJob(job_id));

        tool('get_job_logs', {
            title: 'Logs de un trabajo', perm: null,
            description: 'Salida del trabajo (redactada) por trozos: usa offset/next_offset para seguirla o tail=true para lo último.',
            input: { job_id: z.string(), offset: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(262144).optional(), tail: z.boolean().optional() },
            output: { jobId: z.string(), status: z.string(), offset: z.number(), nextOffset: z.number(), size: z.number(), complete: z.boolean(), text: z.string() },
        }, async ({ job_id, offset, limit, tail }) => { readJob(job_id); return queue.logs(job_id, { offset, limit, tail }); });

        tool('cancel_job', {
            title: 'Cancelar trabajo', perm: ['exec', 'run'], hints: { destructive: true, idempotent: true },
            description: 'Cancela un trabajo en cola o detiene uno en curso (el ejecutor termina el proceso).',
            input: { job_id: z.string() },
            output: jobOut,
        }, async ({ job_id }) => { const j = readJob(job_id); needWs('exec', 'run', j.workspace); const r = queue.cancel(job_id, ctx.agent); return { ...r, action: r.alreadyFinished ? 'already_finished' : 'cancel_requested' }; });

        tool('list_jobs', {
            title: 'Trabajos', perm: null,
            description: 'Trabajos recientes (activos e historial) con filtros por workspace y estado.',
            input: { workspace: z.string().optional(), status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out', 'interrupted']).optional(), mine: z.boolean().optional(), cursor: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(100).optional() },
            output: { total: z.number(), jobs: z.array(loose({ id: z.string(), status: z.string() })), nextCursor: z.number().nullable(), executor: loose({ online: z.boolean() }) },
        }, async ({ workspace, status: st, mine, cursor, limit }) => {
            if (!canSeeJobs()) throw new ToolError('PERMISSION_DENIED', 'Necesitas exec:run, code:read o deploy:prepare para ver trabajos.');
            const r = queue.list({ workspace, status: st, principal: mine ? (ctx.principal || ctx.tokenId) : undefined, cursor, limit });
            return { ...r, jobs: r.jobs.filter(j => workspaceAllowed(policy, j.workspace)), executor: queue.executor() };
        });
        }
    }

    // ─── Despliegues ───
    if (deployments) {
        tool('prepare_deployment', {
            title: 'Preparar despliegue', perm: ['deploy', 'prepare'], hints: { readOnly: false, idempotent: true },
            description: 'Fija el commit exacto (ref, por defecto HEAD), lo construye en un worktree limpio y guarda el artefacto con manifiesto SHA-256. No toca lo que está desplegado. Usa idempotency_key.',
            input: { workspace: z.string(), ref: z.string().optional(), idempotency_key: z.string().max(180).optional() },
            output: deploymentOut,
        }, async ({ workspace, ref, idempotency_key }, extra) => { needWs('deploy', 'prepare', workspace); return { ...(await deployments.prepare({ workspace, ref }, { ...meta(extra), idempotencyKey: idempotency_key })), action: 'prepare_queued' }; });

        tool('validate_deployment', {
            title: 'Validar despliegue', perm: ['deploy', 'prepare'], hints: { readOnly: false, idempotent: true },
            description: 'Verifica el hash del artefacto y corre las pruebas en el commit exacto. Hace falta antes de deploy.',
            input: { deployment_id: z.string() },
            output: deploymentOut,
        }, async ({ deployment_id }, extra) => { const d = deployments.get(deployment_id); needWs('deploy', 'prepare', d.workspace); return { ...deployments.validate({ deploymentId: deployment_id }, meta(extra)), action: 'validate_queued' }; });

        tool('deploy', {
            title: 'Desplegar', perm: ['deploy', 'release'], hints: { destructive: true, idempotent: true },
            description: 'Publica un despliegue validado (cambia la versión activa). expected_current_release evita pisar otro despliegue simultáneo. Se puede revertir con rollback_deployment.',
            input: { deployment_id: z.string(), expected_current_release: z.string().nullable().optional().describe('deploymentId activo que viste (null si no había)') },
            output: deploymentOut,
        }, async ({ deployment_id, expected_current_release }, extra) => { const d = deployments.get(deployment_id); needWs('deploy', 'release', d.workspace); return { ...deployments.release({ deploymentId: deployment_id, expectedCurrent: expected_current_release }, meta(extra)), action: 'release_queued' }; });

        tool('get_deployment_status', {
            title: 'Estado de un despliegue', perm: ['deploy', 'prepare'], hints: { readOnly: true },
            description: 'Etapa (preparing, prepared, validated, released, rolled_back, *_failed), commit, artefacto con SHA-256, trabajos de cada etapa y versión activa del destino.',
            input: { deployment_id: z.string() },
            output: deploymentOut,
        }, async ({ deployment_id }) => { const d = deployments.get(deployment_id); needWs('deploy', 'prepare', d.workspace); return d; });

        tool('list_deployments', {
            title: 'Despliegues', perm: ['deploy', 'prepare'], hints: { readOnly: true },
            description: 'Historial de despliegues y reversiones con commit, artefacto y estado.',
            input: { workspace: z.string().optional(), limit: z.number().int().min(1).max(100).optional() },
            output: { deployments: z.array(loose({ deploymentId: z.string(), status: z.string() })) },
        }, async ({ workspace, limit }) => ({ deployments: deployments.list({ workspace, limit }).filter(d => workspaceAllowed(policy, d.workspace)) }));

        tool('rollback_deployment', {
            title: 'Revertir despliegue', perm: ['deploy', 'release'], hints: { destructive: true, idempotent: true },
            description: 'Vuelve a activar una versión que ya estuvo desplegada (to_deployment_id), verificando su artefacto. Queda registrado como reversión.',
            input: { workspace: z.string(), to_deployment_id: z.string(), idempotency_key: z.string().max(180).optional() },
            output: deploymentOut,
        }, async ({ workspace, to_deployment_id, idempotency_key }, extra) => { needWs('deploy', 'release', workspace); return { ...deployments.rollback({ workspace, toDeploymentId: to_deployment_id }, { ...meta(extra), idempotencyKey: idempotency_key }), action: 'rollback_queued' }; });
    }

    // ─── AI Office HQ: cola de trabajo asignada por el CEO ───
    if (office) {
        tool('get_my_office_tasks', {
            title: 'Mis tareas de AI Office HQ', perm: ['data', 'read'],
            description: 'Tareas que el CEO te asignó en AI Office HQ (y las abiertas que cualquiera puede tomar), con instrucciones, correcciones pedidas y archivos. Flujo: claim_office_task → read_office_file → report_office_progress → attach_office_file → submit_office_result → handoff_office_task.',
            input: { include_open: z.boolean().optional().describe('Incluir tareas sin asignar (por defecto sí)') },
        }, async ({ include_open = true }) => ({ tasks: office.tasksForAgent(ctx, { includeOpen: include_open }) }));

        tool('claim_office_task', {
            title: 'Tomar tarea de la oficina', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Marca una tarea de AI Office HQ como tuya y en curso.',
            input: { task_id: z.string() },
        }, async ({ task_id }) => office.claim(ctx, task_id));

        tool('report_office_progress', {
            title: 'Reportar avance', perm: ['data', 'write'], hints: { idempotent: true },
            description: 'Cuenta en qué paso vas y el porcentaje aproximado de una tarea de AI Office HQ que ya tomaste.',
            input: {
                task_id: z.string(),
                progress: z.number().min(0).max(100).optional(),
                step: z.string().max(200).optional().describe('Qué estás haciendo ahora, en una frase'),
            },
        }, async ({ task_id, progress, step }) => office.reportProgress(ctx, task_id, { progress, step }));

        tool('submit_office_result', {
            title: 'Entregar resultado', perm: ['data', 'write'],
            description: 'Entrega el resultado final de una tarea de AI Office HQ (markdown). Los documentos/imágenes súbelos antes con attach_office_file. Si no pudiste hacerla, usa failed=true y explica por qué en error.',
            input: {
                task_id: z.string(),
                result: z.string().optional().describe('El entregable completo en markdown'),
                failed: z.boolean().optional(),
                error: z.string().max(500).optional(),
                model: z.string().max(60).optional().describe('Modelo que usaste'),
            },
        }, async ({ task_id, result, failed = false, error = '', model = '' }) => office.submitResult(ctx, task_id, { result, failed, error, model }));

        tool('get_office_task', {
            title: 'Ver tarea de la oficina', perm: ['data', 'read'],
            description: 'Detalle de una tarea de AI Office HQ: instrucciones, resultado entregado, historial y archivos.',
            input: { task_id: z.string() },
        }, async ({ task_id }) => office.taskForAgent(ctx, task_id));

        tool('read_office_file', {
            title: 'Leer archivo de una tarea', perm: ['documents', 'read'],
            description: 'Abre un archivo de una tarea de AI Office HQ. Texto como texto; imágenes como imagen; otros formatos en base64 si pides as_base64.',
            input: {
                task_id: z.string(),
                file_id: z.string().describe('id o nombre del archivo'),
                as_base64: z.boolean().optional(),
            },
        }, async ({ task_id, file_id, as_base64 = false }) => {
            const { meta: m, buffer } = office.readFileAsAgent(ctx, task_id, file_id);
            const head = { type: 'text', text: JSON.stringify(m) };
            if (m.mime.startsWith('image/') && m.mime !== 'image/svg+xml' && !as_base64) return { mcpContent: [head, { type: 'image', data: buffer.toString('base64'), mimeType: m.mime }] };
            if (!as_base64 && (m.mime.startsWith('text/') || /json|xml|svg/.test(m.mime))) return { mcpContent: [head, { type: 'text', text: buffer.toString('utf-8') }] };
            if (buffer.length > 10 * 1024 * 1024) throw new ToolError('TOO_LARGE', 'Archivo demasiado grande para enviarlo por MCP (máx. 10 MB)');
            return { mcpContent: [head, { type: 'text', text: buffer.toString('base64') }] };
        });

        tool('attach_office_file', {
            title: 'Adjuntar archivo a la tarea', perm: ['documents', 'write'],
            description: 'Deja en una tarea que tomaste un archivo que produjiste (documento, tabla, imagen, PDF…). Texto en content; binarios en content_base64.',
            input: {
                task_id: z.string(),
                name: z.string().max(120).describe('Nombre con extensión'),
                content: z.string().optional(),
                content_base64: z.string().optional(),
                mime_type: z.string().max(100).optional(),
                description: z.string().max(500).optional(),
            },
        }, async ({ task_id, name, content, content_base64, mime_type, description = '' }) => {
            if (!content && !content_base64) throw new ToolError('INVALID_INPUT', 'Falta content o content_base64');
            const bytes = content_base64 ? Buffer.from(content_base64, 'base64') : Buffer.from(content, 'utf-8');
            return { action: 'created', file: office.attachAsAgent(ctx, task_id, { name, content: bytes, mime: mime_type, description }) };
        });

        tool('handoff_office_task', {
            title: 'Pasar a otro agente', perm: ['data', 'write'],
            description: 'Crea una tarea de seguimiento a partir de una tuya y le pasa sus archivos, para que otro agente continúe.',
            input: {
                task_id: z.string().describe('Tu tarea de origen'),
                task: z.string().max(300).describe('Qué tiene que hacer el siguiente agente'),
                description: z.string().max(4000).optional(),
                to: z.string().max(80).optional().describe('Nombre o id del agente'),
                file_ids: z.array(z.string()).optional(),
            },
        }, async ({ task_id, task, description = '', to, file_ids }) => ({ action: 'created', task: office.handoffAsAgent(ctx, task_id, { to, task, description, fileIds: file_ids }) }));
    }

    kit.finalize();
    return server;
}
