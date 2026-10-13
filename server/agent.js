/**
 * OpenClaw Super Agent — núcleo compartido por el chat, la API de acciones y el RAG.
 *
 * Todo lo de aquí es puro sobre el objeto `db` (no lee ni escribe disco), para poder
 * probarlo con node:test. server.js se encarga de leer/escribir db.json.
 *
 *  - searchKnowledge(): búsqueda RAG (BM25 con chunks) sobre documentos subidos + datos vivos del dashboard
 *  - executeAgentAction(): única implementación de las acciones del agente (chat, /api/openclaw/action, Gemini)
 *  - runLocalAgent(): agente sin LLM (cuando no hay GEMINI_API_KEY o Gemini falla)
 *  - runGeminiAgent(): bucle de Gemini con function calling (ejecuta herramientas y devuelve la respuesta final)
 */

export const TEAM_MEMBERS = ['GG', 'JOSHUA', 'MARIO', 'ANDREA', 'FANNY', 'JEIKOB', 'FIVVR'];

// ─── Utilidades de texto y fechas ────────────────────────────

export const normalizeText = (s = '') => String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const STOPWORDS = new Set(`
a al algo algun alguna algunas alguno algunos ante antes aqui asi aun como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estan estas este esto estos fue fueron ha hay hace hacer han hasta la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o otra otras otro otros para pero poco por porque puede pueden que quien se sea segun ser si sin sobre son su sus tambien tan tanto te tengo tenemos tiene tienen todo todos tu tus un una unas uno unos y ya yo
dame dime muestra muestrame quiero necesito favor puedes podrias sabes the and for with from this that what which about
`.split(/\s+/).filter(Boolean));

/** Términos de búsqueda: sin acentos, sin stopwords, con plural simple recortado. */
export function tokenize(text) {
    return normalizeText(text)
        .split(/[^a-z0-9]+/)
        .filter(w => w.length >= 3 && !STOPWORDS.has(w))
        .map(w => (w.length > 5 && w.endsWith('es') ? w.slice(0, -2) : w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}

const pad = (n) => String(n).padStart(2, '0');
export const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseDay = (value) => {
    if (!value) return null;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (value, today) => {
    const d = parseDay(value);
    if (!d) return null;
    const a = new Date(today); a.setHours(0, 0, 0, 0);
    const b = new Date(d); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/** Extrae una fecha en español del texto: hoy, mañana, el viernes, 15 de octubre, 15/10, 2026-10-15. */
export function parseSpanishDate(text, today = new Date()) {
    const t = normalizeText(text);
    const base = new Date(today); base.setHours(0, 0, 0, 0);
    const plus = (n) => { const d = new Date(base); d.setDate(d.getDate() + n); return toDateKey(d); };

    const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    if (/\bpasado manana\b/.test(t)) return plus(2);
    if (/\bmanana\b/.test(t)) return plus(1);
    if (/\bhoy\b|\besta noche\b/.test(t)) return plus(0);

    const named = t.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?/);
    const numeric = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    const dm = named
        ? { day: +named[1], month: MONTHS.indexOf(named[2]), year: named[3] ? +named[3] : null }
        : numeric ? { day: +numeric[1], month: +numeric[2] - 1, year: numeric[3] ? +(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : null } : null;
    if (dm && dm.month >= 0 && dm.month < 12 && dm.day >= 1 && dm.day <= 31) {
        let d = new Date(dm.year ?? base.getFullYear(), dm.month, dm.day);
        if (dm.year == null && d < base) d = new Date(base.getFullYear() + 1, dm.month, dm.day);
        return toDateKey(d);
    }

    const wd = t.match(/\b(?:el\s+|este\s+|proximo\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/);
    if (wd) {
        const target = WEEKDAYS.indexOf(wd[1]);
        let diff = (target - base.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        return plus(diff);
    }
    return null;
}

const PRIORITY_ALIASES = {
    critical: 'critical', critica: 'critical', critico: 'critical', urgente: 'critical',
    high: 'high', alta: 'high', alto: 'high',
    medium: 'medium', media: 'medium', medio: 'medium', normal: 'medium',
    low: 'low', baja: 'low', bajo: 'low',
};
export const normalizePriority = (p, fallback = 'medium') => PRIORITY_ALIASES[normalizeText(p || '')] || fallback;

const normalizeMember = (name) => {
    if (!name) return null;
    const n = String(name).trim().toUpperCase();
    return TEAM_MEMBERS.find(m => m === n) || String(name).trim();
};

const isTaskDone = (t) => t.done === true || ['done', 'completed', 'completada', 'hecha'].includes(normalizeText(t.status || ''));

// ─── RAG: corpus, chunks y búsqueda BM25 ─────────────────────

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;

function chunkText(text) {
    const clean = String(text || '').replace(/\r/g, '').trim();
    if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];
    const chunks = [];
    let start = 0;
    while (start < clean.length) {
        let end = Math.min(clean.length, start + CHUNK_SIZE);
        if (end < clean.length) {
            // Cortar en el último salto de párrafo/frase dentro de la ventana
            const window = clean.slice(start, end);
            const cut = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('\n'), window.lastIndexOf('. '));
            if (cut > CHUNK_SIZE * 0.5) end = start + cut + 1;
        }
        chunks.push(clean.slice(start, end).trim());
        if (end >= clean.length) break;
        start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }
    return chunks.filter(Boolean);
}

const list = (v) => (Array.isArray(v) ? v : []);

/** Documentos "vivos" construidos desde el estado actual: nunca quedan desactualizados. */
function liveEntityDocs(db) {
    const docs = [];
    list(db.projects).forEach(p => docs.push({
        id: `live-project-${p.id}`, entityId: p.id, title: p.name || 'Proyecto', category: 'project', namespace: 'default',
        content: [
            `PROYECTO: ${p.name}`, p.description && `Descripción: ${p.description}`,
            `Estado: ${p.status || '-'} · Prioridad: ${p.priority || '-'}`, p.deadline && `Deadline: ${p.deadline}`,
            p.budget && `Presupuesto: ${p.budget}`, p.leadAgent && `Líder: ${p.leadAgent}`,
            list(p.tags).length && `Tags: ${p.tags.join(', ')}`,
            list(p.milestones).length && `Hitos: ${p.milestones.map(m => `${m.done ? '✔' : '○'} ${m.title || m}`).join(' | ')}`,
            p.industry && `Industria: ${p.industry}`, p.brand?.toneOfVoice && `Tono de marca: ${p.brand.toneOfVoice}`,
        ].filter(Boolean).join('\n'),
    }));
    list(db.events).forEach(e => docs.push({
        id: `live-event-${e.id}`, entityId: e.id, title: e.name || 'Evento', category: 'event', namespace: 'default',
        content: [
            `EVENTO: ${e.name}`, e.date && `Fecha: ${e.date}${e.time ? ` ${e.time}` : ''}`,
            e.location && `Lugar: ${e.location}`, e.status && `Estado: ${e.status}`, e.type && `Tipo: ${e.type}`,
            e.capacity && `Capacidad: ${e.capacity}`, e.budget && `Presupuesto: ${e.budget}`,
            e.organizer && `Organizador: ${e.organizer}`, e.phone && `Teléfono: ${e.phone}`,
            e.description && `Descripción: ${e.description}`, e.notes && `Notas: ${e.notes}`,
        ].filter(Boolean).join('\n'),
    }));
    list(db.tasks).forEach(t => docs.push({
        id: `live-task-${t.id}`, entityId: t.id, title: t.text || t.title || 'Tarea', category: 'task', namespace: 'default',
        content: `TAREA: ${t.text || t.title}\nEstado: ${isTaskDone(t) ? 'Completada' : 'Pendiente'} · Prioridad: ${t.priority || '-'}\nResponsable: ${t.assignee || t.assignedTo || '-'}${t.due || t.dueDate ? `\nVence: ${t.due || t.dueDate}` : ''}`,
    }));
    list(db.notes).forEach(n => docs.push({
        id: `live-note-${n.id}`, entityId: n.id, title: n.title || (n.text || '').slice(0, 60) || 'Nota', category: 'note', namespace: 'default',
        content: `NOTA${n.title ? `: ${n.title}` : ''}\n${n.text || n.content || ''}`,
    }));
    list(db.contacts).forEach(c => docs.push({
        id: `live-contact-${c.id}`, entityId: c.id, title: c.name || 'Contacto', category: 'contact', namespace: 'default',
        content: Object.entries(c).filter(([k, v]) => k !== 'id' && v && typeof v !== 'object').map(([k, v]) => `${k}: ${v}`).join('\n'),
    }));
    list(db.ideas).forEach(i => docs.push({
        id: `live-idea-${i.id}`, entityId: i.id, title: i.title || i.name || 'Idea', category: 'idea', namespace: 'default',
        content: `IDEA: ${i.title || i.name || ''}\n${i.description || i.text || ''}`,
    }));
    list(db.decisionLog).forEach(d => docs.push({
        id: `live-decision-${d.id}`, entityId: d.id, title: d.title || d.decision || 'Decisión', category: 'decision', namespace: 'default',
        content: Object.entries(d).filter(([k, v]) => k !== 'id' && v && typeof v !== 'object').map(([k, v]) => `${k}: ${v}`).join('\n'),
    }));
    return docs;
}

/** Documentos subidos (PDF, notas, vault, intel de clientes). Ignora los espejos viejos de entidades. */
function storedDocs(db) {
    return list(db.ragDocuments).concat(list(db.customDocuments))
        .filter(d => d && !String(d.id || '').startsWith('entity-'))
        .map(d => ({
            id: d.id, title: d.title || d.filename || 'Documento', category: d.category || 'document',
            namespace: d.namespace || 'default', content: d.content || d.text || '', addedAt: d.addedAt || d.updatedAt,
        }));
}

/** Documento completo (subido o vivo) por id, para el visor del RAG. */
export function getKnowledgeDoc(db, id) {
    return storedDocs(db).concat(liveEntityDocs(db)).find(d => d.id === id) || null;
}

/**
 * Búsqueda de conocimiento. Devuelve solo resultados que realmente coinciden (nunca relleno).
 * @returns {{ results: Array, context: string, terms: string[] }}
 */
export function searchKnowledge(db, query, { namespace = 'default', topK = 5, category = null, includeLive = true, maxContextChars = 6000 } = {}) {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0) return { results: [], context: '', terms };

    let docs = storedDocs(db);
    if (includeLive) docs = docs.concat(liveEntityDocs(db));
    if (namespace && namespace !== 'default') docs = docs.filter(d => d.namespace === namespace || d.namespace === 'default');
    if (category && category !== 'all') docs = docs.filter(d => d.category === category);

    const chunks = [];
    docs.forEach(doc => chunkText(doc.content).forEach((text, i) => {
        const norm = normalizeText(text);
        chunks.push({ doc, i, text, norm, titleNorm: normalizeText(doc.title), len: norm.length });
    }));
    if (chunks.length === 0) return { results: [], context: '', terms };

    const countOcc = (hay, needle) => {
        let n = 0; let idx = hay.indexOf(needle);
        while (idx !== -1) { n++; idx = hay.indexOf(needle, idx + needle.length); }
        return n;
    };

    const N = chunks.length;
    const avgLen = chunks.reduce((a, c) => a + c.len, 0) / N;
    const df = Object.fromEntries(terms.map(t => [t, chunks.filter(c => c.norm.includes(t) || c.titleNorm.includes(t)).length]));
    const k1 = 1.2; const b = 0.75;

    const scored = chunks.map(c => {
        let score = 0; let matched = 0;
        for (const t of terms) {
            const tf = countOcc(c.norm, t);
            const inTitle = c.titleNorm.includes(t);
            if (tf === 0 && !inTitle) continue;
            matched++;
            const idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
            score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * c.len / avgLen)));
            if (inTitle) score += idf * 1.5;
        }
        return { ...c, score, matched };
    }).filter(c => c.score > 0);

    // Un resultado por documento (su mejor chunk)
    const bestByDoc = new Map();
    scored.sort((a, b2) => b2.score - a.score).forEach(c => { if (!bestByDoc.has(c.doc.id)) bestByDoc.set(c.doc.id, c); });
    const top = [...bestByDoc.values()].slice(0, topK);
    const maxScore = top[0]?.score || 1;

    const results = top.map(c => {
        const firstHit = terms.map(t => c.norm.indexOf(t)).filter(i => i >= 0).sort((a, b2) => a - b2)[0] ?? 0;
        const start = Math.max(0, firstHit - 60);
        const end = Math.min(c.text.length, start + 260);
        return {
            id: c.doc.id,
            entityId: c.doc.entityId || null,
            title: c.doc.title,
            category: c.doc.category,
            namespace: c.doc.namespace,
            score: Number(c.score.toFixed(3)),
            similarity: Math.round(100 * (0.5 * (c.score / maxScore) + 0.5 * (c.matched / terms.length))),
            snippet: `${start > 0 ? '…' : ''}${c.text.slice(start, end).trim()}${end < c.text.length ? '…' : ''}`,
            chunk: c.text,
            addedAt: c.doc.addedAt || null,
        };
    });

    let context = '';
    for (const r of results) {
        const block = `[Fuente: ${r.title} (${r.category})]\n${r.chunk}\n\n`;
        if (context.length + block.length > maxContextChars) break;
        context += block;
    }
    return { results, context: context.trim(), terms };
}

// ─── Acciones del agente ─────────────────────────────────────

const activity = (db, text, color) => {
    db.activityFeed = list(db.activityFeed);
    db.activityFeed.unshift({ id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, color, timestamp: new Date().toISOString() });
    db.activityFeed = db.activityFeed.slice(0, 50);
};

/** Busca la tarea pendiente que mejor coincide con un texto (o por id). */
export function findTask(db, { id, text } = {}, { includeDone = false } = {}) {
    const tasks = list(db.tasks).filter(t => includeDone || !isTaskDone(t));
    if (id) {
        const byId = tasks.find(t => t.id === id);
        if (byId) return { task: byId, candidates: [] };
    }
    const qTerms = tokenize(text || '');
    if (qTerms.length === 0) return { task: null, candidates: [] };
    const ranked = tasks.map(t => {
        const tTerms = new Set(tokenize(`${t.text || ''} ${t.title || ''}`));
        const hits = qTerms.filter(q => [...tTerms].some(w => w.startsWith(q) || q.startsWith(w))).length;
        return { t, ratio: hits / qTerms.length };
    }).filter(r => r.ratio > 0).sort((a, b) => b.ratio - a.ratio);
    const best = ranked[0];
    // Exigir que la mayoría de las palabras coincidan y que no haya empate ambiguo
    if (best && best.ratio >= 0.6 && !(ranked[1] && ranked[1].ratio === best.ratio)) return { task: best.t, candidates: [] };
    return { task: null, candidates: ranked.slice(0, 3).map(r => r.t) };
}

const findByName = (items, name) => {
    const q = normalizeText(name || '').trim();
    if (!q) return null;
    return list(items).find(x => normalizeText(x.name || x.title || '') === q)
        || list(items).find(x => normalizeText(x.name || x.title || '').includes(q) || q.includes(normalizeText(x.name || x.title || '') || '\u0000'));
};

const PROJECT_STYLE = {
    software: { color: '#6366f1', icon: '💻' }, business: { color: '#10b981', icon: '💼' },
    ai_pipeline: { color: '#8b5cf6', icon: '🤖' }, marketing: { color: '#ec4899', icon: '📣' },
};

export const AGENT_ACTIONS = [
    'create_project', 'create_event', 'add_task', 'complete_task', 'toggle_task', 'add_milestone',
    'update_status', 'add_note', 'log_thought', 'log_activity', 'create_client_post', 'update_client_rag',
];

/**
 * Ejecuta una acción del agente mutando `db`. Devuelve { success, ... }.
 * Una acción desconocida o con datos insuficientes devuelve success:false (nunca un éxito falso).
 */
export function executeAgentAction(actionName, rawData, db, { source = 'OpenClaw Super Agent', today = new Date() } = {}) {
    const data = rawData && typeof rawData === 'object' ? rawData : {};
    ['projects', 'events', 'tasks', 'notes'].forEach(k => { db[k] = list(db[k]); });
    const todayKey = toDateKey(today);

    switch (actionName) {
        case 'create_project': {
            const name = String(data.name || '').trim();
            if (!name) return { success: false, error: 'Falta el nombre del proyecto' };
            const category = data.category || 'business';
            const style = PROJECT_STYLE[category] || { color: '#ec4899', icon: '🚀' };
            const milestones = Array.isArray(data.milestones) && data.milestones.length
                ? data.milestones.map((m, i) => ({ id: `m-${i + 1}`, title: m.title || m.name || String(m), deadline: m.deadline || '', done: !!m.done, deliverables: m.deliverables || [] }))
                : [
                    { id: 'm-1', title: 'Definir alcance, objetivos y responsables', done: false, deadline: '' },
                    { id: 'm-2', title: 'Ejecución del entregable principal', done: false, deadline: data.deadline || '' },
                    { id: 'm-3', title: 'Revisión, lanzamiento y métricas', done: false, deadline: '' },
                ];
            const project = {
                id: data.id || `proj-${Date.now()}`,
                name,
                description: data.description || '',
                category,
                type: data.type || category,
                templateKey: data.templateKey || `project_${category}`,
                status: data.status || 'active',
                priority: normalizePriority(data.priority, 'high'),
                deadline: data.deadline || '',
                budget: String(data.budget || '0'),
                techStack: Array.isArray(data.techStack) ? data.techStack : (typeof data.techStack === 'string' ? data.techStack.split(',').map(s => s.trim()).filter(Boolean) : []),
                githubRepo: data.githubRepo || '',
                leadAgent: data.leadAgent || source,
                milestones,
                tasks: Array.isArray(data.tasks) ? data.tasks : [],
                tags: Array.isArray(data.tags) ? data.tags : [],
                activityLog: [{ id: `log-${Date.now()}`, text: `🚀 Proyecto creado por ${source}`, time: new Date().toLocaleTimeString(), type: 'created' }],
                createdAt: new Date().toISOString(),
            };
            db.projects.unshift(project);
            // Espejo en eventos para el Hub unificado (deleteProject borra ambos)
            const mirror = {
                id: project.id, name: project.name, description: project.description, category: 'project',
                type: project.type, templateKey: project.templateKey, status: project.status, priority: project.priority,
                date: project.deadline || todayKey, budget: project.budget, estimatedBudget: project.budget,
                organizer: project.leadAgent, techStack: project.techStack, githubRepo: project.githubRepo,
                milestones: project.milestones, color: style.color, icon: style.icon,
                agenda: project.milestones.map((m, i) => ({ id: `ag-${i + 1}`, time: '09:00', title: m.title, speaker: project.leadAgent, description: 'Hito del proyecto' })),
                requirements: project.techStack.map((t, i) => ({ id: `req-${i + 1}`, name: `Configuración: ${t}`, done: false })),
            };
            const evIdx = db.events.findIndex(e => e.id === mirror.id);
            if (evIdx >= 0) db.events[evIdx] = mirror; else db.events.unshift(mirror);
            activity(db, `🤖 ${source} creó el proyecto "${project.name}"`, '#8b5cf6');
            return { success: true, project, mirrorEvent: mirror };
        }

        case 'create_event': {
            const name = String(data.name || '').trim();
            if (!name) return { success: false, error: 'Falta el nombre del evento' };
            const date = data.date ? (parseSpanishDate(String(data.date), today) || String(data.date)) : todayKey;
            const event = {
                id: data.id || `ev-${Date.now()}`,
                name, date,
                time: data.time || '20:00',
                location: data.location || '',
                type: data.type || 'eventos',
                templateKey: data.templateKey || data.type || 'eventos',
                category: 'event',
                status: data.status || 'planificacion',
                priority: normalizePriority(data.priority, 'medium'),
                description: data.description || '',
                budget: String(data.budget || '0'),
                estimatedBudget: String(data.budget || '0'),
                capacity: data.capacity || '',
                organizer: data.organizer || source,
                color: data.color || '#f43f5e',
                icon: data.icon || '🎉',
                agenda: Array.isArray(data.agenda) ? data.agenda : [{ id: 'ag-1', time: data.time || '20:00', title: 'Inicio del evento', speaker: 'Staff', description: 'Apertura' }],
                requirements: Array.isArray(data.requirements) ? data.requirements : [],
            };
            db.events.unshift(event);
            activity(db, `🎉 ${source} agendó el evento "${event.name}" (${event.date})`, '#f43f5e');
            return { success: true, event };
        }

        case 'add_task': {
            const text = String(data.text || data.title || '').trim();
            if (!text) return { success: false, error: 'Falta la descripción de la tarea' };
            const assignee = normalizeMember(data.assignee || data.assignedTo) || 'GG';
            const due = data.due || data.dueDate ? (parseSpanishDate(String(data.due || data.dueDate), today) || String(data.due || data.dueDate)) : null;
            let projectId = data.projectId || null;
            let eventId = data.eventId || null;
            if (!projectId && !eventId && data.category) {
                const ev = findByName(db.events, data.category);
                if (ev) eventId = ev.id;
            }
            const task = {
                id: data.id || `task-${Date.now()}`,
                text,
                priority: normalizePriority(data.priority),
                category: data.category || 'General',
                done: false,
                status: 'pending',
                projectId, eventId,
                assignee, assignedTo: assignee,
                due,
                createdAt: new Date().toISOString(),
                createdBy: source,
            };
            db.tasks.unshift(task);
            if (projectId) {
                const p = db.projects.find(x => x.id === projectId);
                if (p) { p.tasks = list(p.tasks); p.tasks.push({ id: task.id, text: task.text, done: false }); }
            }
            activity(db, `📋 ${source} añadió tarea: "${task.text}"${assignee ? ` → ${assignee}` : ''}`, '#06b6d4');
            return { success: true, task };
        }

        case 'complete_task':
        case 'toggle_task': {
            const { task, candidates } = findTask(db, { id: data.id || data.taskId, text: data.text || data.title });
            if (!task) {
                return {
                    success: false,
                    error: candidates.length ? 'Hay varias tareas posibles; sé más específico' : 'No encontré una tarea pendiente que coincida',
                    candidates: candidates.map(t => ({ id: t.id, text: t.text || t.title })),
                };
            }
            task.done = true;
            task.status = 'done';
            task.completedAt = new Date().toISOString();
            activity(db, `🎯 ${source} completó la tarea: "${task.text || task.title}"`, '#10b981');
            return { success: true, task, id: task.id };
        }

        case 'add_milestone': {
            const target = db.projects.find(p => p.id === data.projectId) || findByName(db.projects, data.projectName || data.project);
            if (!target) return { success: false, error: 'Proyecto no encontrado para el hito' };
            const milestone = { id: `m-${Date.now()}`, title: data.title || 'Nuevo hito', deadline: data.deadline || '', done: false, deliverables: data.deliverables || [] };
            target.milestones = list(target.milestones);
            target.milestones.push(milestone);
            const mirror = db.events.find(e => e.id === target.id);
            if (mirror) { mirror.milestones = list(mirror.milestones); mirror.milestones.push(milestone); }
            activity(db, `🗺️ ${source} añadió el hito "${milestone.title}" a ${target.name}`, '#10b981');
            return { success: true, milestone, projectId: target.id };
        }

        case 'update_status': {
            const { entityType, status, progress, kpiCurrent } = data;
            const entityId = data.entityId || data.id;
            const pool = entityType === 'event' ? db.events : entityType === 'project' ? db.projects : db.projects.concat(db.events);
            const target = pool.find(x => x.id === entityId) || findByName(pool, data.name);
            if (!target) return { success: false, error: 'Proyecto o evento no encontrado' };
            if (status) target.status = status;
            if (progress !== undefined) target.progress = progress;
            if (kpiCurrent !== undefined && target.kpi) target.kpi.current = kpiCurrent;
            if (data.notes) target.notes = `${target.notes ? `${target.notes}\n` : ''}[${source} ${todayKey}]: ${data.notes}`;
            activity(db, `🔄 ${source} actualizó "${target.name}"${status ? ` → ${status}` : ''}`, '#3b82f6');
            return { success: true, entity: target };
        }

        case 'add_note': {
            const text = String(data.text || data.content || '').trim();
            if (!text) return { success: false, error: 'La nota está vacía' };
            const note = {
                id: data.id || `note-${Date.now()}`,
                title: data.title || text.slice(0, 50),
                text,
                category: data.category || 'OpenClaw',
                projectId: data.projectId || null,
                date: todayKey,
            };
            db.notes.unshift(note);
            activity(db, `📝 ${source} guardó una nota: "${note.title}"`, '#eab308');
            return { success: true, note };
        }

        case 'log_thought':
        case 'log_activity': {
            const thought = {
                id: `thought-${Date.now()}`,
                message: data.message || data.text || 'Pensamiento registrado',
                level: data.level || 'info',
                details: data.details || '',
                projectId: data.projectId || null,
                timestamp: new Date().toISOString(),
            };
            const colors = { info: '#8b5cf6', success: '#10b981', warning: '#f59e0b', warn: '#f59e0b', action: '#ec4899', code: '#3b82f6' };
            activity(db, `🧠 ${thought.message}`, colors[thought.level] || '#8b5cf6');
            return { success: true, log: thought };
        }

        case 'create_client_post': {
            const clients = db.projects.filter(p => p.isClient || p.agency === 'arrive' || String(p.id || '').startsWith('client-'));
            const client = clients.find(c => c.id === data.clientId) || findByName(clients, data.clientName);
            if (!client) {
                return { success: false, error: `No encontré el cliente "${data.clientName || ''}"`, availableClients: clients.map(c => c.name) };
            }
            const post = {
                id: `post-ai-${Date.now()}`,
                format: data.format || 'Reel 9:16',
                title: data.title || 'Nueva publicación',
                hook: data.hook || '',
                caption: data.caption || '',
                date: data.date ? (parseSpanishDate(String(data.date), today) || String(data.date)) : todayKey,
                status: 'En Guión',
                createdBy: source,
            };
            client.posts = [post, ...list(client.posts)];
            activity(db, `🎬 ${source} propuso un post para ${client.name}: "${post.title}"`, '#fbbf24');
            return { success: true, post, clientId: client.id };
        }

        case 'update_client_rag': {
            const content = String(data.content || '').trim();
            if (!content) return { success: false, error: 'Falta el contenido a indexar' };
            const ns = data.clientId || data.namespace || 'default';
            db.ragDocuments = list(db.ragDocuments);
            const doc = {
                id: `rag-doc-${Date.now()}`,
                filename: data.title || `Intel de ${data.clientName || 'cliente'}`,
                title: data.title || `Intel de ${data.clientName || 'cliente'}`,
                content, category: 'client_intel', namespace: ns, addedAt: new Date().toISOString(),
            };
            db.ragDocuments.unshift(doc);
            activity(db, `🧠 Conocimiento RAG indexado para ${data.clientName || ns}: "${doc.title}"`, '#c084fc');
            return { success: true, document: doc };
        }

        default:
            return { success: false, error: `Acción desconocida: ${actionName}`, availableActions: AGENT_ACTIONS };
    }
}

// ─── Declaración de herramientas para Gemini ─────────────────

export const GEMINI_TOOLS = [{
    functionDeclarations: [
        {
            name: 'add_task',
            description: 'Crea una tarea en el dashboard. Úsala solo cuando el usuario pida crear/agregar/anotar una tarea.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    text: { type: 'STRING', description: 'Descripción clara y accionable de la tarea' },
                    priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
                    assignee: { type: 'STRING', enum: TEAM_MEMBERS, description: 'Responsable' },
                    due: { type: 'STRING', description: 'Fecha límite YYYY-MM-DD' },
                    category: { type: 'STRING', description: 'Evento o área relacionada (ej: Terraplén, Furia, General)' },
                    projectId: { type: 'STRING', description: 'ID del proyecto relacionado, si aplica' },
                    eventId: { type: 'STRING', description: 'ID del evento relacionado, si aplica' },
                },
                required: ['text'],
            },
        },
        {
            name: 'complete_task',
            description: 'Marca como completada una tarea pendiente existente (por id o por texto).',
            parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, text: { type: 'STRING', description: 'Palabras clave de la tarea' } } },
        },
        {
            name: 'create_event',
            description: 'Agenda un nuevo evento.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    name: { type: 'STRING' }, date: { type: 'STRING', description: 'YYYY-MM-DD' }, time: { type: 'STRING', description: 'HH:MM' },
                    location: { type: 'STRING' }, budget: { type: 'STRING' }, capacity: { type: 'STRING' }, description: { type: 'STRING' },
                },
                required: ['name', 'date'],
            },
        },
        {
            name: 'create_project',
            description: 'Crea un proyecto nuevo en el portafolio.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    name: { type: 'STRING' }, description: { type: 'STRING' },
                    category: { type: 'STRING', enum: ['software', 'business', 'marketing', 'ai_pipeline'] },
                    priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] }, deadline: { type: 'STRING', description: 'YYYY-MM-DD' },
                },
                required: ['name'],
            },
        },
        {
            name: 'add_milestone',
            description: 'Agrega un hito a un proyecto existente.',
            parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, projectName: { type: 'STRING' }, title: { type: 'STRING' }, deadline: { type: 'STRING' } }, required: ['title'] },
        },
        {
            name: 'update_status',
            description: 'Cambia el estado/progreso de un proyecto o evento existente.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    entityType: { type: 'STRING', enum: ['project', 'event'] }, entityId: { type: 'STRING' }, name: { type: 'STRING' },
                    status: { type: 'STRING' }, progress: { type: 'NUMBER' }, notes: { type: 'STRING' },
                },
            },
        },
        {
            name: 'add_note',
            description: 'Guarda una nota en el dashboard.',
            parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, text: { type: 'STRING' }, projectId: { type: 'STRING' } }, required: ['text'] },
        },
        {
            name: 'create_client_post',
            description: 'Propone un post/Reel/carrusel para una marca cliente de ARRIVE Agency (queda "En Guión" en su ficha).',
            parameters: {
                type: 'OBJECT',
                properties: {
                    clientName: { type: 'STRING' }, title: { type: 'STRING' },
                    format: { type: 'STRING', enum: ['Reel 9:16', 'Carrusel HD', 'Story Seq', 'TikTok / UGC'] },
                    hook: { type: 'STRING' }, caption: { type: 'STRING' }, date: { type: 'STRING', description: 'YYYY-MM-DD' },
                },
                required: ['clientName', 'title'],
            },
        },
        {
            name: 'search_knowledge',
            description: 'Busca en la base de conocimiento (documentos subidos, SOPs, vault, proyectos, eventos, tareas, contactos). Úsala cuando necesites datos que no estén en el contexto.',
            parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] },
        },
    ],
}];

// ─── Contexto del sistema ────────────────────────────────────

export function buildSystemPrompt(db, { ragContext = '', skills = '', systemRole = '', today = new Date() } = {}) {
    const todayKey = toDateKey(today);
    const events = list(db.events)
        .filter(e => e.category !== 'project')
        .map(e => ({ id: e.id, name: e.name, date: e.date, status: e.status, location: e.location }))
        .sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
    const upcoming = events.filter(e => !e.date || e.date >= todayKey).slice(0, 15);
    const projects = list(db.projects).map(p => ({
        id: p.id, name: p.name, status: p.status, priority: p.priority, deadline: p.deadline,
        progress: list(p.milestones).length ? `${list(p.milestones).filter(m => m.done).length}/${p.milestones.length} hitos` : undefined,
        client: p.isClient || p.agency === 'arrive' || String(p.id || '').startsWith('client-') ? true : undefined,
    }));
    const pending = list(db.tasks).filter(t => !isTaskDone(t)).slice(0, 30)
        .map(t => ({ id: t.id, text: t.text || t.title, priority: t.priority, assignee: t.assignee || t.assignedTo, due: t.due || t.dueDate }));
    const clients = list(db.projects).filter(p => p.isClient || p.agency === 'arrive' || String(p.id || '').startsWith('client-'))
        .map(c => ({ name: c.name, industry: c.industry, tone: c.brand?.toneOfVoice, dos: c.brand?.dos, donts: c.brand?.donts }));

    return `Eres OpenClaw, el agente operativo del Command Center de GG: agencia ARRIVE (clientes, contenido, talento), venues y eventos de nightlife en Panamá, y el portafolio de proyectos.
Hoy es ${todayKey} (zona America/Panama). Responde en español, directo y accionable, usando markdown breve (listas, negritas). No inventes datos: si algo no está en el contexto, dilo o usa search_knowledge.

Reglas de herramientas:
- Ejecuta acciones (crear tarea/evento/proyecto, completar tarea, notas, posts) SOLO cuando el usuario lo pida explícitamente. Para preguntas, responde sin crear nada.
- Tras ejecutar, confirma qué hiciste con los datos reales (nombre, fecha, responsable).
- Fechas siempre en YYYY-MM-DD. Equipo asignable: ${TEAM_MEMBERS.join(', ')}.
${skills ? `\n[DIRECTIVAS / SKILLS]\n${skills}\n` : ''}
[ESTADO EN VIVO]
- Próximos eventos (${upcoming.length}): ${JSON.stringify(upcoming)}
- Proyectos (${projects.length}): ${JSON.stringify(projects)}
- Tareas pendientes (${pending.length}): ${JSON.stringify(pending)}
${clients.length ? `- Clientes ARRIVE (respeta tono, do's y don'ts al crear contenido): ${JSON.stringify(clients)}\n` : ''}
[CONOCIMIENTO RELEVANTE (RAG)]
${ragContext || 'Sin documentos relevantes para esta consulta.'}
${systemRole ? `\n${systemRole}` : ''}`;
}

// ─── Agente local (sin LLM) ──────────────────────────────────

const fmtDate = (key) => {
    const d = parseDay(key);
    return d ? d.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' }) : key;
};

const PRIORITY_LABELS = { critical: 'crítica', high: 'alta', medium: 'media', low: 'baja' };

const dueText = (days) => (days == null ? '' : days < 0 ? ` · ⚠️ vencida hace ${-days}d` : days === 0 ? ' · vence hoy' : days === 1 ? ' · vence mañana' : ` · vence en ${days}d`);

function describeTasks(tasks, today) {
    return tasks.map(t => {
        const days = daysBetween(t.due || t.dueDate, today);
        const owner = t.assignee || t.assignedTo;
        return `- ${['critical', 'high'].includes(t.priority) ? '🔴 ' : ''}${t.text || t.title}${owner ? ` — **${owner}**` : ''}${dueText(days)}`;
    }).join('\n');
}

function upcomingEvents(db, today) {
    const key = toDateKey(today);
    return list(db.events)
        .filter(e => e.category !== 'project')
        .flatMap(e => (e.date ? [{ ...e, _date: e.date }] : list(e.instances).map(i => ({ ...e, _date: i.date }))))
        .filter(e => e._date && e._date >= key && !['cancelado', 'cancelled', 'completado', 'completed'].includes(normalizeText(e.status || '')))
        .sort((a, b) => a._date.localeCompare(b._date));
}

const CAPABILITIES = `Puedo ayudarte con:
- **Consultas**: "¿qué tareas tengo pendientes?", "tareas de ANDREA", "¿cuál es el próximo evento?", "resumen de operaciones", "¿cómo van los proyectos?"
- **Acciones**: "crea una tarea para MARIO: confirmar DJ de Furia para el viernes", "completa la tarea contrato DJ", "agenda evento Sunset Session el 24 de octubre en Terraplén", "crea proyecto App de reservas", "anota: llamar al proveedor de hielo"
- **Conocimiento**: pregúntame por cualquier cosa de tus documentos, SOPs, contactos o eventos y busco en el RAG.

💡 Con una GEMINI_API_KEY configurada respondo con IA completa; sin ella uso el motor local.`;

/** Separa "Para MARIO: texto" / "asignada a ANDREA" y devuelve { member, rest }. */
function extractMember(text) {
    for (const m of TEAM_MEMBERS) {
        const re = new RegExp(`\\b(?:para|a|asignad[ao]\\s+a|responsable:?)\\s+${m}\\b[:,]?`, 'i');
        if (re.test(text)) return { member: m, rest: text.replace(re, ' ').replace(/\s+/g, ' ').trim() };
    }
    const bare = TEAM_MEMBERS.find(m => new RegExp(`\\b${m}\\b`).test(text));
    return { member: bare || null, rest: text };
}

const stripDatePhrases = (text) => text
    .replace(/\b(para\s+)?(el\s+|este\s+|pr[oó]ximo\s+)?(hoy|ma[ñn]ana|pasado ma[ñn]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi, ' ')
    .replace(/\b(para\s+)?(el\s+)?\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(\s+(de\s+)?\d{4})?/gi, ' ')
    .replace(/\b(para\s+)?(el\s+)?\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b(con\s+)?(prioridad\s+)?(urgente|alta|baja|media|cr[ií]tica)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:,.-]+|[\s:,.-]+$/g, '')
    .trim();

/** Traduce los comandos rápidos de la UI (/tarea, /evento, /proyecto, /rag, /reporte) a lenguaje natural. */
export function expandSlashCommand(prompt) {
    const m = String(prompt || '').trim().match(/^\/(tarea|evento|proyecto|rag|reporte|nota)\b\s*(.*)$/is);
    if (!m) return { prompt: String(prompt || '').trim(), forceKnowledge: false };
    const [, cmd, rest] = m;
    const map = {
        tarea: `crea una tarea: ${rest}`,
        evento: `agenda evento ${rest}`,
        proyecto: `crea proyecto ${rest}`,
        nota: `anota: ${rest}`,
        reporte: 'resumen de operaciones',
        rag: rest,
    };
    return { prompt: map[cmd.toLowerCase()].trim(), forceKnowledge: cmd.toLowerCase() === 'rag' };
}

/**
 * Agente sin LLM: entiende consultas y órdenes frecuentes en español, ejecuta acciones
 * sobre `db` y responde con datos reales. Nunca crea nada a partir de una pregunta.
 */
export function runLocalAgent(prompt, db, { today = new Date(), namespace = 'default' } = {}) {
    const expanded = expandSlashCommand(prompt);
    const raw = expanded.prompt;
    if (expanded.forceKnowledge) {
        const { results } = searchKnowledge(db, raw, { namespace, topK: 5 });
        return {
            reply: results.length
                ? `🧠 Resultados para **"${raw}"**:\n\n${results.map(r => `**${r.title}** _(${r.category}, ${r.similarity}%)_\n> ${r.snippet.replace(/\n+/g, ' ')}`).join('\n\n')}`
                : `No encontré nada sobre "${raw}" en la base de conocimiento.`,
            executedTools: [],
            sources: results.map(({ id, title, category, similarity }) => ({ id, title, category, similarity })),
        };
    }
    const p = normalizeText(raw);
    const executedTools = [];
    const run = (name, args) => {
        const result = executeAgentAction(name, args, db, { today });
        executedTools.push({ name, args, result });
        return result;
    };

    const isQuestion = /[?¿]/.test(raw) || /^(que|cual|cuales|cuant[oa]s?|como|cuando|donde|quien|quienes|dime|muestra|muestrame|lista|listame|ver|dame|hay|tengo|tenemos|busca|buscar|info|informacion)\b/.test(p);
    const createVerb = /^(crea|crear|creame|agrega|agregar|anade|anadir|anota|anotar|registra|registrar|nueva|nuevo|pon|agenda|agendar|programa|programar|recuerdame)\b/.test(p);

    // Saludo / ayuda
    if (/^(hola|buenas|hey|ayuda|help)\b|que puedes hacer|como funcionas/.test(p) && raw.length < 60) {
        return { reply: `👋 Hola. ${CAPABILITIES}`, executedTools };
    }

    // ── Completar tarea ──
    const completeMatch = p.match(/^(?:completa|completar|marca(?:r)?|termine|cierra|cerrar|finaliza|finalizar|tache|tacha)\b(.*)$/);
    if (completeMatch && !isQuestion) {
        const target = completeMatch[1]
            .replace(/\b(la|el|tarea|como|hecha|completada|lista|terminada|de|que dice)\b/g, ' ')
            .replace(/\s+/g, ' ').trim();
        const res = run('complete_task', { text: target });
        if (res.success) return { reply: `🎯 Listo: **"${res.task.text || res.task.title}"** quedó completada.`, executedTools };
        const cands = res.candidates || [];
        return {
            reply: cands.length
                ? `🤔 No estoy seguro de cuál tarea es. ¿Alguna de estas?\n${cands.map(c => `- ${c.text}`).join('\n')}\n\nRepite con más palabras de la tarea.`
                : `⚠️ No encontré una tarea pendiente que coincida con "${target || raw}".`,
            executedTools,
        };
    }

    // ── Crear tarea ──
    if (createVerb && /\btarea|pendiente|to-?do|recuerdame\b/.test(p) || /^tarea\s*:/.test(p)) {
        let body = raw.replace(/^[^:]*?\b(tarea|pendiente|to-?do|recu[eé]rdame)\b\s*(?:de\s+|para\s+que\s+|:)?/i, '');
        const due = parseSpanishDate(body, today);
        const priority = /\b(urgente|cr[ií]tic[ao])\b/i.test(body) ? 'critical' : /\balta\b/i.test(body) ? 'high' : /\bbaja\b/i.test(body) ? 'low' : 'medium';
        const { member, rest } = extractMember(body);
        body = stripDatePhrases(rest);
        if (!body) return { reply: '✏️ ¿Cuál es la tarea? Ej: "crea una tarea para MARIO: confirmar DJ el viernes".', executedTools };
        const res = run('add_task', { text: body.charAt(0).toUpperCase() + body.slice(1), assignee: member || 'GG', due, priority });
        const t = res.task;
        return { reply: `📋 Tarea creada: **${t.text}**\n- Responsable: **${t.assignee}**\n- Prioridad: ${PRIORITY_LABELS[t.priority] || t.priority}${t.due ? `\n- Vence: ${fmtDate(t.due)}` : ''}`, executedTools };
    }

    // ── Crear evento ──
    if (createVerb && /\bevento|fiesta|party|session|cena\b/.test(p)) {
        const date = parseSpanishDate(raw, today);
        const locMatch = raw.match(/\ben\s+([A-ZÁÉÍÓÚÑ][^,.\n]+?)(?=\s+(?:el|para|a las|con|$)|[,.\n]|$)/);
        let name = raw.replace(/^.*?\b(evento|fiesta|party)\b\s*(llamado|llamada|de nombre|:)?\s*/i, '');
        if (locMatch) name = name.replace(locMatch[0], ' ');
        name = stripDatePhrases(name.replace(/\ba las\s+\d{1,2}(:\d{2})?\s*(am|pm)?/i, ' ')).replace(/^["']|["']$/g, '');
        if (!name) return { reply: '✏️ ¿Cómo se llama el evento? Ej: "agenda evento Sunset Session el 24 de octubre en Terraplén".', executedTools };
        const timeMatch = raw.match(/\ba las\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        let time;
        if (timeMatch) {
            let h = +timeMatch[1];
            if (timeMatch[3]?.toLowerCase() === 'pm' && h < 12) h += 12;
            time = `${pad(h)}:${timeMatch[2] || '00'}`;
        }
        const res = run('create_event', { name, date: date || toDateKey(today), location: locMatch ? locMatch[1].trim() : '', time });
        const e = res.event;
        return { reply: `🎉 Evento agendado: **${e.name}**\n- Fecha: ${fmtDate(e.date)}${e.time ? ` · ${e.time}` : ''}${e.location ? `\n- Lugar: ${e.location}` : ''}${date ? '' : '\n\n_No indicaste fecha: lo dejé para hoy, cámbiala en Eventos._'}`, executedTools };
    }

    // ── Crear proyecto ──
    if (createVerb && /\bproyecto|project\b/.test(p)) {
        const name = raw.replace(/^.*?\b(proyecto|project)\b\s*(llamado|llamada|de nombre|:)?\s*/i, '').replace(/^["']|["']$/g, '').trim();
        if (!name) return { reply: '✏️ ¿Cómo se llama el proyecto?', executedTools };
        const category = /\b(app|software|web|plataforma|sistema)\b/.test(p) ? 'software' : /\bmarketing|contenido|redes\b/.test(p) ? 'marketing' : 'business';
        const res = run('create_project', { name, category, description: `Creado desde el chat: "${raw}"` });
        return { reply: `🚀 Proyecto creado: **${res.project.name}** (${category}). Le puse 3 hitos iniciales; ajústalos en Portfolio OS.`, executedTools };
    }

    // ── Nota ──
    const noteMatch = raw.match(/^(?:anota|anotar|guarda|apunta|nota)\s*(?:una\s+nota)?\s*(?:que|:)?\s*(.+)$/i);
    if (noteMatch && !/\btarea\b/.test(p)) {
        const res = run('add_note', { text: noteMatch[1].trim() });
        if (res.success) return { reply: `📝 Nota guardada: "${res.note.text}"`, executedTools };
    }

    // ── Consultas sobre datos ──
    const member = TEAM_MEMBERS.find(m => new RegExp(`\\b${m}\\b`, 'i').test(raw));
    if (/\btareas?|pendientes?|to-?dos?|vencid/.test(p)) {
        let tasks = list(db.tasks).filter(t => !isTaskDone(t));
        let label = 'pendientes';
        if (member) { tasks = tasks.filter(t => (t.assignee || t.assignedTo) === member); label += ` de ${member}`; }
        if (/vencid|atrasad/.test(p)) { tasks = tasks.filter(t => (daysBetween(t.due || t.dueDate, today) ?? 1) < 0); label = `vencidas${member ? ` de ${member}` : ''}`; }
        else if (/\bhoy\b/.test(p)) { tasks = tasks.filter(t => (daysBetween(t.due || t.dueDate, today) ?? 1) <= 0); label += ' para hoy'; }
        tasks.sort((a, b) => (daysBetween(a.due || a.dueDate, today) ?? 9999) - (daysBetween(b.due || b.dueDate, today) ?? 9999));
        if (tasks.length === 0) return { reply: `✅ No hay tareas ${label}.`, executedTools };
        return { reply: `📋 **${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'} ${label.replace(/^pendientes/, tasks.length === 1 ? 'pendiente' : 'pendientes').replace(/^vencidas/, tasks.length === 1 ? 'vencida' : 'vencidas')}:**\n${describeTasks(tasks.slice(0, 15), today)}${tasks.length > 15 ? `\n…y ${tasks.length - 15} más en Workspace.` : ''}`, executedTools };
    }

    if (/\beventos?|agenda|proximo|calendario|esta semana|fin de semana\b/.test(p) && !/\bproyecto/.test(p)) {
        let evs = upcomingEvents(db, today);
        if (/esta semana|fin de semana/.test(p)) evs = evs.filter(e => daysBetween(e._date, today) <= 7);
        if (evs.length === 0) return { reply: '📅 No hay eventos próximos agendados.', executedTools };
        const next = evs[0];
        const days = daysBetween(next._date, today);
        return {
            reply: `📅 **Próximo evento:** ${next.icon || '🎉'} **${next.name}** — ${fmtDate(next._date)}${days === 0 ? ' (¡hoy!)' : ` (en ${days} día${days === 1 ? '' : 's'})`}${next.location ? ` · ${next.location}` : ''}\n\n**Agenda:**\n${evs.slice(0, 8).map(e => `- ${fmtDate(e._date)} — ${e.name}${e.location ? ` · ${e.location}` : ''}`).join('\n')}`,
            executedTools,
        };
    }

    if (/\bproyectos?|portafolio|portfolio\b/.test(p)) {
        const projects = list(db.projects).filter(pr => !['completed', 'completado', 'archived', 'cancelado', 'cancelled'].includes(normalizeText(pr.status || '')));
        if (projects.length === 0) return { reply: 'No hay proyectos activos.', executedTools };
        return {
            reply: `💼 **${projects.length} proyectos activos:**\n${projects.slice(0, 12).map(pr => {
                const ms = list(pr.milestones);
                const done = ms.filter(m => m.done).length;
                const next = ms.find(m => !m.done);
                const days = daysBetween(pr.deadline, today);
                return `- **${pr.name}** — ${ms.length ? `${Math.round(100 * done / ms.length)}% (${done}/${ms.length} hitos)` : 'sin hitos'}${next ? ` · siguiente: ${next.title}` : ''}${days != null && days < 0 ? ` · ⚠️ deadline vencido` : ''}`;
            }).join('\n')}`,
            executedTools,
        };
    }

    if (/\bresumen|estado|status|reporte|operaciones|como vamos|como va todo\b/.test(p)) {
        const pending = list(db.tasks).filter(t => !isTaskDone(t));
        const overdue = pending.filter(t => (daysBetween(t.due || t.dueDate, today) ?? 1) < 0);
        const evs = upcomingEvents(db, today);
        const projects = list(db.projects);
        return {
            reply: `📊 **Resumen del Command Center (${fmtDate(toDateKey(today))})**
- **Tareas pendientes:** ${pending.length}${overdue.length ? ` (⚠️ ${overdue.length} vencidas)` : ''}
- **Próximo evento:** ${evs[0] ? `${evs[0].name} — ${fmtDate(evs[0]._date)}` : 'ninguno agendado'}
- **Eventos próximos:** ${evs.length}
- **Proyectos:** ${projects.length}
- **Documentos en el RAG:** ${storedDocs(db).length}
${overdue.length ? `\n**Atender primero:**\n${describeTasks(overdue.slice(0, 5), today)}` : ''}`,
            executedTools,
        };
    }

    // ── Conocimiento (RAG) ──
    const { results } = searchKnowledge(db, raw, { namespace, topK: 4 });
    if (results.length > 0) {
        return {
            reply: `🧠 Esto es lo que encontré sobre **"${raw}"**:\n\n${results.map(r => `**${r.title}** _(${r.category})_\n> ${r.snippet.replace(/\n+/g, ' ')}`).join('\n\n')}`,
            executedTools,
            sources: results.map(({ id, title, category, similarity }) => ({ id, title, category, similarity })),
        };
    }

    return { reply: `No encontré nada sobre "${raw}" en tus datos ni documentos.\n\n${CAPABILITIES}`, executedTools };
}

// ─── Gemini con function calling ─────────────────────────────

const GEMINI_BASE = () => process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
let lastWorkingModel = null;

/** Modelos a probar, en orden: el último que funcionó, el configurado y alias estables. */
export function geminiModelCandidates(configured) {
    return [...new Set([lastWorkingModel, configured, process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest'].filter(Boolean))];
}

/** Modelo configurado (dashboard > entorno > por defecto). */
export const configuredGeminiModel = (configured) => configured || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** Último modelo que respondió bien (null si aún no hubo respuesta). */
export const activeGeminiModel = () => lastWorkingModel;

/** Olvida el modelo que funcionó (al cambiar clave o modelo en la configuración). */
export function resetGeminiModelCache() {
    lastWorkingModel = null;
}

async function callGemini(model, apiKey, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${GEMINI_BASE()}/models/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { /* respuesta no JSON */ }
        return { ok: res.ok, status: res.status, json, text };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Ejecuta el bucle de Gemini: el modelo puede pedir herramientas, se ejecutan sobre `db`
 * y se le devuelven los resultados hasta que responde con texto (máx. maxSteps rondas).
 * Devuelve null si ningún modelo respondió (el caller usa el agente local).
 */
export async function runGeminiAgent({ apiKey, model, systemPrompt, history = [], prompt, db, namespace = 'default', today = new Date(), maxSteps = 4, timeoutMs = 30000, onError = () => {} }) {
    const contents = [
        ...history.slice(-10)
            .filter(h => (h.content || h.text))
            .map(h => ({ role: ['assistant', 'model', 'bot', 'copilot'].includes(h.role) ? 'model' : 'user', parts: [{ text: String(h.content || h.text) }] })),
        { role: 'user', parts: [{ text: prompt }] },
    ];
    // Gemini exige que la conversación empiece por el usuario
    while (contents.length > 1 && contents[0].role !== 'user') contents.shift();

    const executedTools = [];
    const errors = [];

    for (const candidate of geminiModelCandidates(model)) {
        const convo = [...contents];
        let usage = null;
        let failed = false;
        for (let step = 0; step < maxSteps; step++) {
            let r;
            try {
                r = await callGemini(candidate, apiKey, {
                    contents: convo,
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    tools: GEMINI_TOOLS,
                    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
                }, timeoutMs);
            } catch (e) {
                errors.push(`${candidate}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
                failed = true;
                break;
            }
            if (!r.ok) {
                errors.push(`${candidate}: HTTP ${r.status} ${(r.json?.error?.message || r.text || '').slice(0, 160)}`);
                failed = true;
                // Clave inválida o sin permisos: no tiene sentido probar otros modelos
                if (r.status === 400 && /api key/i.test(r.text) || r.status === 401 || r.status === 403) {
                    onError(errors);
                    return { error: errors.join(' | '), authError: true };
                }
                break;
            }
            usage = r.json?.usageMetadata || usage;
            const content = r.json?.candidates?.[0]?.content;
            const parts = content?.parts || [];
            const calls = parts.filter(pt => pt.functionCall);
            const text = parts.filter(pt => pt.text && !pt.thought).map(pt => pt.text).join('\n').trim();

            if (calls.length === 0) {
                if (!text) {
                    const reason = r.json?.candidates?.[0]?.finishReason || r.json?.promptFeedback?.blockReason || 'respuesta vacía';
                    errors.push(`${candidate}: ${reason}`);
                    failed = true;
                    break;
                }
                lastWorkingModel = candidate;
                return { reply: text, executedTools, model: candidate, usage };
            }

            // Ejecutar herramientas y devolver resultados al modelo (se conserva `content` tal cual: incluye thought signatures)
            convo.push(content);
            const responses = calls.map(({ functionCall }) => {
                const args = functionCall.args || {};
                let result;
                if (functionCall.name === 'search_knowledge') {
                    const found = searchKnowledge(db, args.query || '', { namespace, topK: 5 });
                    result = { results: found.results.map(({ title, category, chunk }) => ({ title, category, text: chunk })) };
                } else {
                    result = executeAgentAction(functionCall.name, args, db, { today });
                    executedTools.push({ name: functionCall.name, args, result });
                }
                return { functionResponse: { name: functionCall.name, response: { result } } };
            });
            convo.push({ role: 'user', parts: responses });
        }
        if (!failed) {
            // Se agotaron las rondas: confirmar lo ejecutado
            lastWorkingModel = candidate;
            return { reply: summarizeTools(executedTools), executedTools, model: candidate, usage };
        }
        if (executedTools.length > 0) {
            // Ya se ejecutaron acciones: no reintentar con otro modelo para no duplicarlas
            return { reply: summarizeTools(executedTools), executedTools, model: candidate, usage };
        }
    }
    onError(errors);
    return { error: errors.join(' | ') };
}

export function summarizeTools(executedTools) {
    if (executedTools.length === 0) return 'Listo.';
    return executedTools.map(({ name, result }) => {
        if (!result?.success) return `⚠️ ${name}: ${result?.error || 'no se pudo ejecutar'}`;
        const item = result.task || result.event || result.project || result.note || result.post || result.milestone || result.entity || result.document;
        return `✅ ${name}: ${item?.text || item?.name || item?.title || 'hecho'}`;
    }).join('\n');
}
