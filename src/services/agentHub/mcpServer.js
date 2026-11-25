// Servidor MCP del Command Center: la puerta única por la que cualquier agente
// (Claude, ChatGPT, OpenClaw, Hermes…) lee el contexto del usuario y deja su trabajo en el dashboard.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fold } from '../knowledge/text.js';

export const SERVER_INSTRUCTIONS = `Este es el Command Center de ARRIVE Agency: el centro donde vive todo lo que hace el usuario (proyectos, eventos, tareas, su historial con ChatGPT y lo que otros agentes guardaron).
Cómo trabajar:
1. Al empezar una tarea llama a get_context: trae el perfil de trabajo del usuario, proyectos activos, próximos eventos y pendientes.
2. Antes de proponer o decidir algo de un proyecto usa get_project y search_knowledge: probablemente ya se habló antes (decisiones, precios, criterios).
3. Respeta las decisiones vigentes y la forma de pensar del usuario que aparecen en la memoria.
4. Si te conectaron para trabajar tareas, revisa get_my_office_tasks: el CEO te asigna trabajo desde AI Office HQ. Lee sus archivos con read_office_file, deja cada documento/imagen que produzcas con attach_office_file, entrega con submit_office_result y, si otro agente debe seguir (enviar, diseñar, revisar), usa handoff_office_task.
5. Cuando termines algo o se decida algo, déjalo registrado: create_task / update_task para pendientes, save_memory para decisiones o datos importantes, log_activity para contar qué hiciste.
Responde en el idioma del usuario (normalmente español).`;

const today = () => new Date().toISOString().slice(0, 10);
const json = data => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const clip = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : s);
const PRIORITY_RANK = { urgent: 0, critical: 0, high: 1, alta: 1, medium: 2, media: 2, normal: 2, low: 3, baja: 3 };

function taskView(t) {
    return {
        id: t.id, text: t.text || t.title, status: t.status, priority: t.priority || null,
        due: t.due || t.dueDate || null, assignedTo: t.assignedTo || t.assignee || null,
        projectId: t.projectId || null, eventId: t.eventId || null,
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

/**
 * @param ctx  { agent, scope: 'read'|'write', tokenId }
 * @param deps { readDB, knowledge, createEntity, updateEntity, addActivityFeed, hub, studio }
 */
export function buildMcpServer(ctx, deps) {
    const { readDB, knowledge, createEntity, updateEntity, addActivityFeed, hub, studio, library, office } = deps;
    const server = new McpServer({ name: 'arrive-command-center', version: '1.0.0' }, { instructions: SERVER_INSTRUCTIONS });
    const canWrite = ctx.scope === 'write';

    const tool = (name, { write = false, title, description, input = {} }, handler) => {
        if (write && !canWrite) return;
        server.registerTool(name, {
            title,
            description,
            inputSchema: input,
            annotations: { readOnlyHint: !write, destructiveHint: false, openWorldHint: false },
        }, async (args) => {
            const started = Date.now();
            try {
                const result = await handler(args || {});
                hub.logActivity({ agent: ctx.agent, tokenId: ctx.tokenId, tool: name, args: clip(JSON.stringify(args || {}), 400), ok: true, ms: Date.now() - started, write });
                return result?.mcpContent ? { content: result.mcpContent } : json(result);
            } catch (err) {
                hub.logActivity({ agent: ctx.agent, tokenId: ctx.tokenId, tool: name, args: clip(JSON.stringify(args || {}), 400), ok: false, error: clip(err.message, 300), ms: Date.now() - started, write });
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        });
    };

    // ─── Lectura ───
    tool('get_context', {
        title: 'Contexto del usuario',
        description: 'Llámalo primero. Perfil de trabajo del usuario (cómo piensa y decide), proyectos activos, próximos eventos, tareas pendientes y vencidas, y actividad reciente del dashboard.',
    }, async () => {
        const db = readDB();
        const memories = new Map(knowledge.projects().map(m => [m.projectId, m]));
        const pending = (db.tasks || []).filter(t => !t.done);
        const overdue = pending.filter(t => (t.due || t.dueDate) && (t.due || t.dueDate) < today());
        const sorted = [...pending].sort((a, b) =>
            (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
        return {
            today: today(),
            userProfile: knowledge.profile()?.text || 'Todavía no hay perfil: se genera al importar las conversaciones de ChatGPT.',
            projects: (db.projects || []).map(p => ({
                id: p.id, name: p.name, status: p.status, priority: p.priority,
                objective: clip(p.currentObjective || p.objective, 240), nextAction: clip(p.nextAction, 200),
                pendingTasks: pending.filter(t => t.projectId === p.id).length,
                hasMemory: memories.has(p.id),
            })),
            upcomingEvents: eventOccurrences(db, { limit: 15 }),
            tasks: { pending: pending.length, overdue: overdue.map(taskView).slice(0, 15), top: sorted.slice(0, 15).map(taskView) },
            recentActivity: (db.activityFeed || []).slice(0, 8).map(a => ({ at: a.timestamp, text: a.text })),
            knowledge: (() => { const s = knowledge.status(); return { chatgptConversations: s.chatgpt.total, projectMemories: s.projects, documents: s.store.docs }; })(),
        };
    });

    tool('search_knowledge', {
        title: 'Buscar en la memoria',
        description: 'Búsqueda por significado en todo lo que sabe el dashboard: conversaciones con ChatGPT (resúmenes y texto), memoria por proyecto, perfil del usuario, proyectos, eventos, tareas, notas, documentos, memorias de otros agentes y referencias de video (tutoriales y referencias de motion/edición de YouTube, Instagram, TikTok…). Úsalo antes de decidir algo para no contradecir lo ya hablado, y con source "reference" antes de editar, animar o diseñar para ver cómo se hace.',
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
                relevance: r.doc.meta?.relevance || null, text: r.text,
            })),
        };
    });

    // ─── Biblioteca de repos y skills ───
    if (library) {
        tool('search_library', {
            title: 'Buscar en la biblioteca de repos y skills',
            description: 'Busca por significado en los repos de GitHub que el usuario guardó (README, notas, etiquetas) y en sus skills (SKILL.md) y agentes. Úsalo antes de construir algo desde cero: puede que ya haya una skill, librería o ejemplo guardado para eso.',
            input: {
                query: z.string().describe('Qué necesitas (p. ej. "generar PDFs", "scraping de Instagram", "componentes React de dashboard")'),
                kind: z.enum(['repo', 'skill', 'agent']).optional().describe('Limitar a repos, skills o agentes'),
                top_k: z.number().int().min(1).max(20).optional(),
            },
        }, async ({ query, kind, top_k = 8 }) => {
            const { mode, results } = await knowledge.search({ query, topK: top_k, source: 'library', kind });
            const seen = new Set();
            return {
                mode,
                // Un resultado por skill/repo: el mejor trozo de cada uno.
                results: results.filter(r => !seen.has(r.docId) && seen.add(r.docId)).map(r => ({ title: r.doc.title, kind: r.doc.kind, repo: r.doc.meta?.repo, path: r.doc.meta?.itemPath || null, url: r.doc.meta?.url, tags: r.doc.meta?.tags, text: r.text })),
                hint: 'Para leer una skill completa usa get_library_item con repo y path.',
            };
        });

        tool('list_library', {
            title: 'Listar la biblioteca',
            description: 'Todos los repos guardados con su descripción, etiquetas, notas, estado (por probar, usando, favorito) y las skills/agentes que contienen.',
        }, async () => ({
            stats: library.stats(),
            repos: library.list().map(r => ({
                id: r.id, url: r.url, description: clip(r.description, 200), tags: r.tags, interest: r.interest, notes: clip(r.notes, 300), stars: r.stars, language: r.language, status: r.status, localPath: r.localPath,
                skills: r.skills.map(s => ({ name: s.name, path: s.path, description: clip(s.description, 160) })),
                agents: r.agents.map(s => ({ name: s.name, path: s.path, description: clip(s.description, 160) })),
            })),
        }));

        tool('get_library_item', {
            title: 'Leer una skill o un repo',
            description: 'Devuelve el SKILL.md completo (o el agente) con la lista de archivos y la ruta local donde está clonado, para leerlo o copiarlo a un proyecto. Sin path devuelve el README del repo.',
            input: {
                repo: z.string().describe('dueño/repo'),
                path: z.string().optional().describe('Ruta del SKILL.md o del agente dentro del repo (de search_library o list_library)'),
            },
        }, async ({ repo, path: itemPath }) => {
            if (itemPath) return library.getItem(repo, itemPath);
            const r = library.get(repo);
            if (!r) throw new Error('Repo no encontrado en la biblioteca');
            return { id: r.id, url: r.url, description: r.description, localPath: library.repoDir(r.id), notes: r.notes, tags: r.tags, readme: clip(library.getReadme(r.id), 20000) };
        });

        tool('add_to_library', {
            write: true,
            title: 'Guardar un repo en la biblioteca',
            description: 'Guarda un repo de GitHub que valga la pena (librería, skill, ejemplo, herramienta) en la biblioteca del usuario: se clona, se detectan sus skills y queda en la búsqueda de todos los agentes. Explica en notes para qué sirve y para qué proyecto.',
            input: {
                url: z.string().describe('https://github.com/dueño/repo'),
                notes: z.string().optional().describe('Para qué sirve y por qué se guarda'),
                tags: z.array(z.string()).optional(),
            },
        }, async ({ url, notes = '', tags = [] }) => {
            const r = library.addRepo({ url, notes, tags, addedBy: ctx.agent });
            addActivityFeed?.(`📚 ${ctx.agent} guardó ${r.id} en la biblioteca`, '#a78bfa');
            return { id: r.id, status: r.status, message: 'Clonando; sus skills aparecerán en search_library en unos segundos.' };
        });
    }

    tool('list_projects', {
        title: 'Listar proyectos',
        description: 'Proyectos del dashboard con estado, prioridad, objetivo y si tienen memoria consolidada de ChatGPT. También lista proyectos detectados en ChatGPT que no existen en el dashboard.',
    }, async () => {
        const db = readDB();
        const memories = knowledge.projects();
        return {
            projects: (db.projects || []).map(p => {
                const m = memories.find(x => x.projectId === p.id);
                return { id: p.id, name: p.name, status: p.status, priority: p.priority, category: p.category, objective: clip(p.currentObjective || p.objective, 200), memory: m ? clip(m.synthesis.overview, 300) : null };
            }),
            detectedInChatGPT: memories.filter(m => !m.projectId).map(m => ({ key: m.key, name: m.name, conversations: m.conversationCount, overview: clip(m.synthesis.overview, 300) })),
        };
    });

    tool('get_project', {
        title: 'Detalle de un proyecto',
        description: 'Todo sobre un proyecto: ficha del dashboard, memoria consolidada (decisiones vigentes, pendientes, cómo piensa el usuario, línea de tiempo), tareas y conversaciones de ChatGPT relacionadas.',
        input: { project: z.string().describe('id o nombre del proyecto (acepta nombre aproximado)') },
    }, async ({ project }) => {
        const db = readDB();
        const p = findProject(db, project);
        const memories = knowledge.projects();
        const memory = p ? memories.find(m => m.projectId === p.id) : memories.find(m => fold(m.name).includes(fold(project)));
        if (!p && !memory) throw new Error(`No encontré el proyecto "${project}". Usa list_projects para ver los nombres.`);
        const { activityLog, ...record } = p || {};
        const convs = memory ? knowledge.listConversations({ projectKey: memory.key, limit: 20 }).items : [];
        return {
            project: p ? { ...record, recentLog: (activityLog || []).slice(-10) } : null,
            memory: memory ? { ...memory.synthesis, updatedAt: memory.updatedAt, conversations: memory.conversationCount } : null,
            tasks: p ? (db.tasks || []).filter(t => t.projectId === p.id).map(taskView) : [],
            chatgptConversations: convs.map(c => ({ id: c.id, title: c.title, date: String(c.updateTime).slice(0, 10), summary: c.summary })),
        };
    });

    tool('list_tasks', {
        title: 'Listar tareas',
        description: 'Tareas del dashboard filtradas por estado, proyecto o responsable. Por defecto solo las no terminadas.',
        input: {
            status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
            project_id: z.string().optional(),
            assigned_to: z.string().optional(),
            include_done: z.boolean().optional(),
            limit: z.number().int().min(1).max(200).optional(),
        },
    }, async ({ status, project_id, assigned_to, include_done = false, limit = 50 }) => {
        let rows = readDB().tasks || [];
        if (status) rows = rows.filter(t => t.status === status);
        else if (!include_done) rows = rows.filter(t => !t.done);
        if (project_id) rows = rows.filter(t => t.projectId === project_id);
        if (assigned_to) rows = rows.filter(t => fold(t.assignedTo || t.assignee).includes(fold(assigned_to)));
        return { total: rows.length, tasks: rows.slice(0, limit).map(taskView) };
    });

    tool('list_events', {
        title: 'Agenda de eventos',
        description: 'Fechas de eventos (incluye cada fecha de los eventos recurrentes) entre dos días. Por defecto desde hoy.',
        input: {
            from: z.string().optional().describe('AAAA-MM-DD, por defecto hoy'),
            to: z.string().optional().describe('AAAA-MM-DD'),
            limit: z.number().int().min(1).max(200).optional(),
        },
    }, async ({ from, to, limit = 40 }) => ({ events: eventOccurrences(readDB(), { from: from || today(), to, limit }) }));

    tool('get_chatgpt_conversation', {
        title: 'Leer conversación de ChatGPT',
        description: 'Resumen y mensajes de una conversación importada de ChatGPT (el id sale de search_knowledge o get_project).',
        input: { id: z.string().describe('id de la conversación (sin el prefijo "chatgpt:")') },
    }, async ({ id }) => {
        const conv = knowledge.getConversation(id.replace(/^chatgpt:/, '').replace(/:digest$/, ''));
        if (!conv || conv.status === 'excluded') throw new Error('Conversación no encontrada');
        return {
            id: conv.id, title: conv.title, created: conv.createTime, updated: conv.updateTime, digest: conv.digest || null,
            messages: conv.messages.map(m => ({ role: m.role === 'user' ? 'usuario' : 'chatgpt', text: clip(m.text, 4000) })),
        };
    });

    // ─── Compatibilidad con conectores de ChatGPT (deep research / conocimiento de empresa) ───
    // ChatGPT espera exactamente estas dos herramientas: search → ids, fetch → documento completo.
    const docUrl = id => `${(process.env.PUBLIC_URL || 'http://localhost:8090').replace(/\/$/, '')}/agent-brain#${encodeURIComponent(id)}`;
    tool('search', {
        title: 'Buscar documentos',
        description: 'Busca en la memoria del Command Center (ChatGPT, proyectos, eventos, tareas, notas, memorias de agentes). Devuelve ids para usar con fetch.',
        input: { query: z.string().describe('Qué buscar, en lenguaje natural') },
    }, async ({ query }) => {
        const { results } = await knowledge.search({ query, topK: 10 });
        return { results: results.map(r => ({ id: r.docId, title: r.doc.title, url: docUrl(r.docId) })) };
    });

    tool('fetch', {
        title: 'Leer documento',
        description: 'Texto completo de un documento devuelto por search.',
        input: { id: z.string().describe('id devuelto por search') },
    }, async ({ id }) => {
        const doc = knowledge.store.getDoc(id);
        if (!doc) throw new Error(`No existe el documento ${id}`);
        let text = knowledge.store.chunksOf(id).map(c => c.text).join('\n\n');
        // Para una conversación de ChatGPT se antepone su resumen.
        const digest = id.startsWith('chatgpt:') && !id.endsWith(':digest') ? knowledge.store.getDoc(`${id}:digest`) : null;
        if (digest) text = `${knowledge.store.chunksOf(digest.id).map(c => c.text).join('\n')}\n\n--- Conversación ---\n\n${text}`;
        return { id, title: doc.title, text: clip(text, 60000), url: docUrl(id), metadata: { source: doc.source, kind: doc.kind, ...(doc.meta || {}) } };
    });

    // ─── Escritura ───
    tool('create_task', {
        write: true,
        title: 'Crear tarea',
        description: 'Crea una tarea en el dashboard. Úsalo para pendientes concretos que salgan de tu trabajo.',
        input: {
            text: z.string().min(3).describe('Qué hay que hacer, en una frase accionable'),
            project_id: z.string().optional(),
            due: z.string().optional().describe('AAAA-MM-DD'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            assigned_to: z.string().optional(),
            notes: z.string().optional(),
        },
    }, async ({ text, project_id, due, priority = 'medium', assigned_to, notes }) => {
        if (project_id && !(readDB().projects || []).some(p => p.id === project_id)) throw new Error(`No existe el proyecto ${project_id}`);
        const task = createEntity('tasks', {
            text, projectId: project_id || null, due: due || '', priority, assignedTo: assigned_to || '', notes: notes || '',
            createdBy: ctx.agent, createdAt: new Date().toISOString(),
        });
        addActivityFeed(`🤖 ${ctx.agent} creó la tarea: ${clip(text, 90)}`);
        return taskView(task);
    });

    tool('update_task', {
        write: true,
        title: 'Actualizar tarea',
        description: 'Cambia estado, texto, fecha, prioridad o responsable de una tarea existente.',
        input: {
            id: z.string(),
            status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
            text: z.string().optional(),
            due: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            assigned_to: z.string().optional(),
            note: z.string().optional().describe('Comentario sobre el cambio (se añade a las notas)'),
        },
    }, async ({ id, status, text, due, priority, assigned_to, note }) => {
        const current = (readDB().tasks || []).find(t => t.id === id);
        if (!current) throw new Error(`No existe la tarea ${id}`);
        const changes = { updatedBy: ctx.agent, updatedAt: new Date().toISOString() };
        if (status) changes.status = status;
        if (text) changes.text = text;
        if (due !== undefined) changes.due = due;
        if (priority) changes.priority = priority;
        if (assigned_to !== undefined) changes.assignedTo = assigned_to;
        if (note) changes.notes = [current.notes, `[${today()} ${ctx.agent}] ${note}`].filter(Boolean).join('\n');
        const task = updateEntity('tasks', id, changes);
        if (status === 'done') addActivityFeed(`✅ ${ctx.agent} completó: ${clip(task.text, 90)}`);
        return taskView(task);
    });

    tool('save_memory', {
        write: true,
        title: 'Guardar en la memoria',
        description: 'Guarda una decisión, dato, aprendizaje o resultado importante para que lo vean todos los agentes y aparezca en search_knowledge. No lo uses para charla o pasos intermedios.',
        input: {
            title: z.string().describe('Título corto'),
            content: z.string().min(10).describe('El contenido completo, autoexplicativo (quien lo lea no verá esta conversación)'),
            project_id: z.string().optional(),
            tags: z.array(z.string()).optional(),
        },
    }, async ({ title, content, project_id, tags = [] }) => {
        const doc = await knowledge.saveMemory({ title, content, source: 'agent', agent: ctx.agent, projectId: project_id || '', tags });
        return { saved: true, id: doc.id, title: doc.title };
    });

    tool('add_reference', {
        write: true,
        title: 'Guardar referencia de video',
        description: 'Agrega uno o varios links (YouTube, Instagram, TikTok, Vimeo, X…) a la biblioteca de referencias (Redes Sociales → Referencias). Gemini ve el video completo, mide cortes y ritmo, y arma un playbook (gancho, estructura, edición, técnica con parámetros, herramientas, paso a paso con minutos, cómo recrearlo con la máquina y adaptaciones por cuenta) que entra al RAG en unos minutos. Úsalo cuando el usuario comparta un tutorial o una referencia visual.',
        input: {
            urls: z.array(z.string().url()).min(1).max(20),
            type: z.enum(['viral', 'tutorial']).optional().describe('tutorial: enseña una técnica; viral: referencia de formato/estilo (por defecto)'),
            notes: z.string().optional().describe('Para qué se guarda (qué queremos aprender o copiar)'),
            account_ids: z.array(z.string()).optional().describe('ids de cuentas de redes a las que aplica'),
        },
    }, async ({ urls, type = 'viral', notes = '', account_ids = [] }) => {
        if (!studio?.addReferences) throw new Error('La biblioteca de referencias no está activa');
        const r = studio.addReferences({ urls, type, notes, accountIds: account_ids, addedBy: ctx.agent });
        if (r.added.length) addActivityFeed(`🎬 ${ctx.agent} agregó ${r.added.length} referencia${r.added.length > 1 ? 's' : ''} para analizar`);
        return r;
    });

    tool('get_reference', {
        title: 'Ver referencia de video',
        description: 'Playbook completo de una referencia guardada: gancho, estructura con tiempos, edición, técnica con parámetros, herramientas, paso a paso, cómo recrearla y adaptaciones. El id sale de search_knowledge (docId "reference:<id>") o de add_reference.',
        input: { id: z.string() },
    }, async ({ id }) => {
        const r = studio?.getReference(id.replace(/^reference:/, ''));
        if (!r) throw new Error('Referencia no encontrada');
        return r;
    });

    tool('log_activity', {
        write: true,
        title: 'Registrar actividad',
        description: 'Cuenta en una frase lo que hiciste (aparece en el feed de actividad del dashboard). Úsalo al terminar un trabajo.',
        input: { message: z.string().min(3).max(280) },
    }, async ({ message }) => {
        addActivityFeed(`🤖 ${ctx.agent}: ${message}`);
        return { logged: true };
    });

    // ─── AI Office HQ: cola de trabajo asignada por el CEO ───
    if (office) {
        tool('get_my_office_tasks', {
            title: 'Mis tareas de AI Office HQ',
            description: 'Tareas que el CEO te asignó en AI Office HQ (y las abiertas que cualquiera puede tomar), con instrucciones, correcciones pedidas y la lista de archivos de cada una (insumos del CEO o entregables de otro agente). Revísalo al empezar a trabajar. Flujo: claim_office_task → read_office_file (insumos) → report_office_progress (opcional) → attach_office_file (cada documento/imagen que produzcas) → submit_office_result → handoff_office_task si otro agente debe continuar.',
            input: { include_open: z.boolean().optional().describe('Incluir tareas sin asignar (por defecto sí)') },
        }, async ({ include_open = true }) => ({ tasks: office.tasksForAgent(ctx, { includeOpen: include_open }) }));

        tool('claim_office_task', {
            write: true,
            title: 'Tomar tarea de la oficina',
            description: 'Marca una tarea de AI Office HQ como tuya y en curso. Hazlo antes de trabajarla para que el CEO vea que la tienes.',
            input: { task_id: z.string() },
        }, async ({ task_id }) => office.claim(ctx, task_id));

        tool('report_office_progress', {
            write: true,
            title: 'Reportar avance',
            description: 'Cuenta en qué paso vas y el porcentaje aproximado de una tarea de AI Office HQ que ya tomaste.',
            input: {
                task_id: z.string(),
                progress: z.number().min(0).max(100).optional(),
                step: z.string().max(200).optional().describe('Qué estás haciendo ahora, en una frase'),
            },
        }, async ({ task_id, progress, step }) => office.reportProgress(ctx, task_id, { progress, step }));

        tool('submit_office_result', {
            write: true,
            title: 'Entregar resultado',
            description: 'Entrega el resultado final de una tarea de AI Office HQ: qué hiciste, decisiones y qué falta (markdown). Se guarda también como informe .md en la tarea. Los documentos/imágenes súbelos antes con attach_office_file. Queda en revisión del CEO, que puede aprobarla o pedirte cambios (aparecerán en get_my_office_tasks). Si no pudiste hacerla, usa failed=true y explica por qué en error.',
            input: {
                task_id: z.string(),
                result: z.string().optional().describe('El entregable completo en markdown'),
                failed: z.boolean().optional(),
                error: z.string().max(500).optional(),
                model: z.string().max(60).optional().describe('Modelo que usaste (ej. gpt-5, claude-opus-5-5)'),
            },
        }, async ({ task_id, result, failed = false, error = '', model = '' }) => office.submitResult(ctx, task_id, { result, failed, error, model }));

        tool('get_office_task', {
            title: 'Ver tarea de la oficina',
            description: 'Detalle de una tarea de AI Office HQ: instrucciones, resultado entregado, historial y archivos (con su id para read_office_file).',
            input: { task_id: z.string() },
        }, async ({ task_id }) => office.taskForAgent(ctx, task_id));

        tool('read_office_file', {
            title: 'Leer archivo de una tarea',
            description: 'Abre un archivo de una tarea de AI Office HQ (propuesta, brief, CSV, imagen, PDF…). Texto se devuelve como texto; imágenes como imagen; otros formatos en base64 si pides as_base64.',
            input: {
                task_id: z.string(),
                file_id: z.string().describe('id o nombre del archivo (ver files en get_my_office_tasks)'),
                as_base64: z.boolean().optional().describe('Devolver los bytes en base64 (para PDF, docx, etc.)'),
            },
        }, async ({ task_id, file_id, as_base64 = false }) => {
            const { meta, buffer } = office.readFileAsAgent(ctx, task_id, file_id);
            const head = { type: 'text', text: JSON.stringify(meta) };
            if (meta.mime.startsWith('image/') && meta.mime !== 'image/svg+xml' && !as_base64) {
                return { mcpContent: [head, { type: 'image', data: buffer.toString('base64'), mimeType: meta.mime }] };
            }
            if (!as_base64 && (meta.mime.startsWith('text/') || /json|xml|svg/.test(meta.mime))) {
                return { mcpContent: [head, { type: 'text', text: buffer.toString('utf-8') }] };
            }
            if (buffer.length > 10 * 1024 * 1024) throw new Error('Archivo demasiado grande para enviarlo por MCP (máx. 10 MB)');
            return { mcpContent: [head, { type: 'text', text: buffer.toString('base64') }] };
        });

        tool('attach_office_file', {
            write: true,
            title: 'Adjuntar archivo a la tarea',
            description: 'Deja en una tarea que tomaste un archivo que produjiste: documento/propuesta (.md, .html, .txt), tabla (.csv), imagen (.png/.jpg), PDF, etc. Es lo que el CEO y el siguiente agente van a usar, así que sube el archivo completo y final. Texto en content; binarios en content_base64.',
            input: {
                task_id: z.string(),
                name: z.string().max(120).describe('Nombre con extensión, ej. propuesta-cliente.md'),
                content: z.string().optional().describe('Contenido de texto del archivo'),
                content_base64: z.string().optional().describe('Bytes del archivo en base64 (imágenes, PDF, docx…)'),
                mime_type: z.string().max(100).optional(),
                description: z.string().max(500).optional().describe('Qué es y para qué sirve'),
            },
        }, async ({ task_id, name, content, content_base64, mime_type, description = '' }) => {
            if (!content && !content_base64) throw new Error('Falta content o content_base64');
            const bytes = content_base64 ? Buffer.from(content_base64, 'base64') : Buffer.from(content, 'utf-8');
            return { file: office.attachAsAgent(ctx, task_id, { name, content: bytes, mime: mime_type, description }) };
        });

        tool('handoff_office_task', {
            write: true,
            title: 'Pasar a otro agente',
            description: 'Crea una tarea de seguimiento a partir de una tuya y le pasa sus archivos, para que otro agente continúe (ej. "Enviar la propuesta al cliente", "Diseñar la presentación"). Sin "to" queda abierta para cualquier agente. El CEO la ve en el tablero.',
            input: {
                task_id: z.string().describe('Tu tarea de origen'),
                task: z.string().max(300).describe('Qué tiene que hacer el siguiente agente'),
                description: z.string().max(4000).optional(),
                to: z.string().max(80).optional().describe('Nombre o id del agente (ej. "Pulse", "CloserOps")'),
                file_ids: z.array(z.string()).optional().describe('Archivos a pasar (por defecto todos)'),
            },
        }, async ({ task_id, task, description = '', to, file_ids }) => ({ task: office.handoffAsAgent(ctx, task_id, { to, task, description, fileIds: file_ids }) }));
    }

    return server;
}
