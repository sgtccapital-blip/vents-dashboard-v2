// Operaciones genéricas sobre los módulos del dashboard para agentes MCP.
// Nunca escribe db.json directamente: usa createEntity/updateEntity/archiveEntity/restoreEntity del
// servidor (las mismas validaciones y normalización que la interfaz).
// Añade: etag por registro (control de concurrencia), historial de versiones con restauración que no
// pisa trabajo posterior, archivado reversible, filtros/paginación y lotes idempotentes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fold } from '../knowledge/text.js';
import { normalizeTaskStatus, normalizeEventStatus } from '../../lib/status.js';
import { ToolError } from './toolkit.js';

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const canonical = v => JSON.stringify(v, (k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.keys(val).sort().map(x => [x, val[x]])) : val));
export const etagOf = record => sha(canonical(record)).slice(0, 16);
const writeJson = (file, value) => { const tmp = `${file}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2)); fs.renameSync(tmp, file); };

/** Módulos expuestos. write=false: solo lectura por esta vía (tienen su propio flujo). */
export const COLLECTIONS = {
    projects: { label: 'Proyectos', title: 'name', search: ['name', 'description', 'objective', 'currentObjective', 'nextAction', 'category', 'tagline'], write: true, required: ['name'] },
    tasks: { label: 'Tareas', title: 'text', search: ['text', 'notes', 'assignedTo', 'category'], write: true, required: ['text'] },
    events: { label: 'Eventos', title: 'name', search: ['name', 'location', 'description', 'notes', 'type'], write: true, required: ['name'] },
    notes: { label: 'Notas', title: 'title', search: ['title', 'text', 'category'], write: true, required: ['title'] },
    ideas: { label: 'Ideas', title: 'title', search: ['title', 'text', 'description'], write: true, required: [] },
    contacts: { label: 'Contactos', title: 'name', search: ['name', 'company', 'role', 'email', 'notes'], write: true, required: ['name'] },
    companies: { label: 'Empresas', title: 'name', search: ['name', 'description'], write: true, required: ['name'] },
    contentTasks: { label: 'Piezas de contenido', title: 'title', search: ['title', 'storyline', 'pillar', 'format', 'assignee'], write: true, required: ['title'] },
    portfolioRoadmap: { label: 'Roadmap del portafolio', title: 'title', search: ['title', 'project', 'desc', 'column'], write: true, required: ['title'] },
    socialMedia: { label: 'Cuentas de redes', title: 'handler', search: ['handler', 'platform', 'description'], write: true, required: ['handler'] },
    subscriptions: { label: 'Suscripciones', title: 'name', search: ['name', 'provider', 'type'], write: true, required: ['name'] },
    promoters: { label: 'Promotores', title: 'name', search: ['name', 'notes'], write: true, required: ['name'] },
    dinnerGuestlist: { label: 'Lista Dinner Club', title: 'name', search: ['name', 'notes'], write: true, required: ['name'] },
    whatsappGroups: { label: 'Grupos de WhatsApp', title: 'name', search: ['name', 'category', 'notes'], write: true, required: ['name'] },
    whatsappCampaigns: { label: 'Campañas de WhatsApp', title: 'name', search: ['name', 'summary', 'tone'], write: true, required: ['name'] },
    decisionLog: { label: 'Decisiones', title: 'decision', search: ['decision', 'motivo', 'project', 'topic'], write: false, via: 'record_decision / approve_decision' },
    agents: { label: 'Agentes internos', title: 'name', search: ['name', 'role'], write: false },
    references: { label: 'Referencias de video', title: 'title', search: ['title', 'url', 'notes'], write: false, via: 'add_reference' },
    orders: { label: 'Pedidos', title: 'id', search: ['status'], write: false },
};
const READONLY_FIELDS = new Set(['id', 'archived', 'archivedAt', 'archivedBy', 'briefVersions', 'documents', 'activityLog']);

// ─── Normalización de valores existentes ───
const PRIORITY = { urgent: 'critical', urgente: 'critical', critical: 'critical', critica: 'critical', 'crítica': 'critical', high: 'high', alta: 'high', medium: 'medium', media: 'medium', normal: 'medium', low: 'low', baja: 'low' };
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const normalizePriority = p => (p === undefined || p === null || p === '' ? null : PRIORITY[fold(String(p)).trim()] || PRIORITY[String(p).trim().toLowerCase()] || null);
/** "Gabriel (Director Creativo)" → { name: 'Gabriel', role: 'Director Creativo' } */
export function normalizeOwner(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const m = s.match(/^(.+?)\s*\((.+)\)\s*$/);
    return m ? { name: m[1].trim(), role: m[2].trim(), raw: s } : { name: s, role: null, raw: s };
}

export function normalizedView(collection, r) {
    const out = { ...r };
    if (collection === 'tasks') {
        out.status = normalizeTaskStatus(r.status) || (r.done ? 'done' : 'pending');
        if (r.priority !== undefined) { out.priority = normalizePriority(r.priority) || r.priority; if (out.priority !== r.priority) out.priorityRaw = r.priority; }
        const owner = normalizeOwner(r.assignedTo || r.assignee);
        if (owner) out.owner = owner;
        delete out.title; delete out.dueDate; delete out.assignee; // alias en espejo
    }
    if (collection === 'projects' && r.priority !== undefined && r.priority !== null) { out.priority = normalizePriority(r.priority) || r.priority; }
    if (collection === 'events' && r.status) out.status = normalizeEventStatus(r.status) || r.status;
    return out;
}

function matches(value, cond) {
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
        if ('in' in cond) return cond.in.map(String).includes(String(value));
        if ('contains' in cond) return fold(String(value ?? '')).includes(fold(String(cond.contains)));
        if ('exists' in cond) return cond.exists ? value !== undefined && value !== null && value !== '' : !value;
        if ('gte' in cond || 'lte' in cond) { const v = String(value ?? ''); return v !== '' && (!('gte' in cond) || v >= String(cond.gte)) && (!('lte' in cond) || v <= String(cond.lte)); }
        return false;
    }
    if (cond === null) return value === null || value === undefined || value === '';
    return String(value ?? '') === String(cond) || fold(String(value ?? '')) === fold(String(cond));
}

/**
 * deps: { readDB, createEntity, updateEntity, archiveEntity, restoreEntity, dir }
 */
export function createRecordsService({ readDB, createEntity, updateEntity, archiveEntity, restoreEntity, dir }) {
    const histDir = path.join(dir, 'history');
    const idemDir = path.join(dir, 'idempotency');
    fs.mkdirSync(histDir, { recursive: true });
    fs.mkdirSync(idemDir, { recursive: true });

    const conf = collection => {
        const c = COLLECTIONS[collection];
        if (!c) throw new ToolError('INVALID_INPUT', `Módulo desconocido: ${collection}`, { hint: `Disponibles: ${Object.keys(COLLECTIONS).join(', ')}` });
        return c;
    };
    const writable = (collection, meta) => {
        const c = conf(collection);
        if (!c.write && !meta?.allowReadonly) throw new ToolError('NOT_ALLOWED', `${c.label} no se edita con esta herramienta.`, { hint: c.via ? `Usa ${c.via}.` : 'Solo lectura.' });
        return c;
    };

    // ─── Historial ───
    const histFile = (collection, id) => { const d = path.join(histDir, collection); fs.mkdirSync(d, { recursive: true }); return path.join(d, `${sha(id).slice(0, 24)}.jsonl`); };
    const history = (collection, id) => { const f = histFile(collection, id); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; };
    const appendHistory = (collection, id, entry) => fs.appendFileSync(histFile(collection, id), `${JSON.stringify(entry)}\n`);

    /** Garantiza que la última versión del historial coincide con lo guardado (los cambios hechos desde la interfaz entran como "external_change"). */
    function sync(collection, record) {
        const h = history(collection, record.id);
        const etag = etagOf(record);
        const last = h.at(-1);
        if (last?.etag === etag && last.action !== 'archived') return { version: last.version, etag, history: h };
        const entry = { version: (last?.version || 0) + 1, etag, at: new Date().toISOString(), actor: last ? 'dashboard' : 'baseline', action: last ? 'external_change' : 'baseline', snapshot: record };
        appendHistory(collection, record.id, entry);
        return { version: entry.version, etag, history: [...h, entry] };
    }
    function record(collection, entry) {
        const h = history(collection, entry.snapshot?.id || entry.id);
        const v = { version: (h.at(-1)?.version || 0) + 1, at: new Date().toISOString(), ...entry };
        appendHistory(collection, entry.snapshot?.id || entry.id, v);
        return v;
    }

    const find = (collection, id) => (readDB()[collection] || []).find(r => r.id === id) || null;
    const findArchived = (collection, id) => (readDB().archivedRecords || []).find(a => a.collection === collection && a.record?.id === id) || null;

    function view(collection, r, { fields, normalize = true } = {}) {
        const c = conf(collection);
        let out = normalize ? normalizedView(collection, r) : { ...r };
        if (collection === 'projects') { delete out.activityLog; if (out.briefVersions) out.briefVersions = out.briefVersions.map(({ markdown, ...v }) => v); } // eslint-disable-line no-unused-vars
        if (fields?.length) out = Object.fromEntries(['id', ...fields].filter(f => f in out).map(f => [f, out[f]]));
        return { ...out, _title: r[c.title] ?? r.title ?? r.name ?? r.id, _etag: etagOf(r) };
    }

    function query(collection, { filters = {}, text, includeArchived = false, sort, order = 'asc', fields, cursor = 0, limit = 50 } = {}) {
        const c = conf(collection);
        const db = readDB();
        let rows = (db[collection] || []).map(r => ({ r, archived: false }));
        if (includeArchived) rows = rows.concat((db.archivedRecords || []).filter(a => a.collection === collection).map(a => ({ r: a.record, archived: true, meta: a })));
        for (const [field, cond] of Object.entries(filters || {})) {
            rows = rows.filter(({ r }) => {
                const nv = normalizedView(collection, r);
                return matches(field in nv ? nv[field] : r[field], field === 'priority' && typeof cond === 'string' ? normalizePriority(cond) || cond : cond);
            });
        }
        if (text) {
            const q = fold(text);
            rows = rows.filter(({ r }) => c.search.some(f => fold(String(r[f] ?? '')).includes(q)));
        }
        if (sort) rows.sort((a, b) => String(a.r[sort] ?? '').localeCompare(String(b.r[sort] ?? ''), 'es', { numeric: true }) * (order === 'desc' ? -1 : 1));
        const lim = Math.min(Math.max(limit, 1), 200);
        const page = rows.slice(cursor, cursor + lim);
        return {
            collection, total: rows.length, nextCursor: cursor + lim < rows.length ? cursor + lim : null,
            items: page.map(({ r, archived, meta }) => ({ ...view(collection, r, { fields }), ...(archived ? { _archived: true, _archivedAt: meta.archivedAt } : {}) })),
        };
    }

    function get(collection, id, { includeHistory = false } = {}) {
        const r = find(collection, id);
        if (!r) {
            const a = findArchived(collection, id);
            if (a) return { ...view(collection, a.record), _archived: true, _archivedAt: a.archivedAt, _archivedBy: a.archivedBy, _version: history(collection, id).at(-1)?.version || null };
            throw new ToolError('NOT_FOUND', `No existe ${collection}/${id}.`, { hint: `Búscalo con query_records en ${collection}.` });
        }
        const s = sync(collection, r);
        return { ...view(collection, r), _version: s.version, ...(includeHistory ? { _history: s.history.map(({ snapshot, ...h }) => h) } : {}) }; // eslint-disable-line no-unused-vars
    }

    function checkExpected(collection, r, expected) {
        if (!expected) return sync(collection, r);
        const s = sync(collection, r);
        const ok = typeof expected === 'number' ? expected === s.version : expected === s.etag;
        if (!ok) {
            const seen = typeof expected === 'number' ? s.history.find(h => h.version === expected) : s.history.find(h => h.etag === expected);
            const changed = seen ? Object.keys({ ...seen.snapshot, ...r }).filter(k => canonical(seen.snapshot?.[k]) !== canonical(r[k])) : null;
            throw new ToolError('VERSION_CONFLICT', `${collection}/${r.id} cambió desde que lo leíste.`, { details: { expected, currentVersion: s.version, currentEtag: s.etag, changedFields: changed }, hint: 'Vuelve a leerlo con get_record y aplica tu cambio sobre la versión actual.' });
        }
        return s;
    }

    function cleanData(collection, data, { create }) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ToolError('INVALID_INPUT', 'data debe ser un objeto.');
        const out = {};
        for (const [k, v] of Object.entries(data)) {
            if (k.startsWith('_') || READONLY_FIELDS.has(k)) continue;
            out[k] = v;
        }
        if (out.priority !== undefined && out.priority !== null && ['tasks', 'projects'].includes(collection)) {
            const p = normalizePriority(out.priority);
            if (!p) throw new ToolError('INVALID_INPUT', `Prioridad no válida: ${out.priority}. Usa ${PRIORITIES.join(', ')}.`);
            out.priority = p;
        }
        for (const f of ['due', 'date', 'deadline']) if (out[f] && typeof out[f] === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(out[f])) throw new ToolError('INVALID_INPUT', `${f} debe ir como AAAA-MM-DD (America/Panama).`);
        if (create) for (const f of conf(collection).required) if (!out[f] || !String(out[f]).trim()) throw new ToolError('INVALID_INPUT', `Falta ${f}.`);
        return out;
    }

    // ─── Idempotencia ───
    const idemPath = (principal, key) => path.join(idemDir, `${sha(`${principal}\n${key}`)}.json`);
    function idempotent(principal, key, params, fn) {
        if (!key) return fn();
        if (typeof key !== 'string' || key.length > 180) throw new ToolError('INVALID_INPUT', 'idempotency_key inválida');
        const file = idemPath(principal, key);
        const hash = sha(canonical(params));
        if (fs.existsSync(file)) {
            const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (prev.paramsHash !== hash) throw new ToolError('CONFLICT', 'Esa idempotency_key ya se usó con otros datos.', { hint: 'Usa otra clave para una operación distinta.' });
            return { ...prev.result, deduplicated: true };
        }
        const result = fn();
        writeJson(file, { paramsHash: hash, at: new Date().toISOString(), result });
        return result;
    }

    function create(collection, { data, externalId, idempotencyKey }, meta) {
        writable(collection, meta);
        return idempotent(meta.principal, idempotencyKey, { op: 'create', collection, data, externalId }, () => {
            const clean = meta.allowReadonly ? { ...data } : cleanData(collection, data, { create: true });
            if (clean.projectId && !find('projects', clean.projectId)) throw new ToolError('NOT_FOUND', `No existe el proyecto ${clean.projectId}.`);
            if (externalId) {
                const existing = (readDB()[collection] || []).find(r => r.externalId === externalId || r.sourceIds?.includes(externalId));
                if (existing) return { action: 'existing', collection, id: existing.id, version: sync(collection, existing).version, etag: etagOf(existing) };
            }
            const row = createEntity(collection, { ...clean, ...(externalId ? { externalId } : {}), createdBy: meta.agent, createdAt: new Date().toISOString() });
            const v = record(collection, { etag: etagOf(row), actor: meta.agent, operationId: meta.operationId, action: 'created', snapshot: row });
            return { action: 'created', collection, id: row.id, version: v.version, etag: v.etag };
        });
    }

    function update(collection, id, { data, expected, idempotencyKey }, meta) {
        writable(collection, meta);
        return idempotent(meta.principal, idempotencyKey, { op: 'update', collection, id, data, expected }, () => {
            const r = find(collection, id);
            if (!r) throw new ToolError('NOT_FOUND', `No existe ${collection}/${id}.`, { hint: findArchived(collection, id) ? 'Está archivado: usa restore_record.' : 'Búscalo con query_records.' });
            checkExpected(collection, r, expected);
            const clean = meta.allowReadonly ? { ...data } : cleanData(collection, data, { create: false });
            const changed = Object.keys(clean).filter(k => canonical(clean[k]) !== canonical(r[k]));
            if (!changed.length) return { action: 'unchanged', collection, id, version: sync(collection, r).version, etag: etagOf(r) };
            const row = updateEntity(collection, id, { ...clean, updatedBy: meta.agent, updatedAt: new Date().toISOString() });
            const v = record(collection, { etag: etagOf(row), actor: meta.agent, operationId: meta.operationId, action: 'updated', fields: changed, snapshot: row });
            return { action: 'updated', collection, id, version: v.version, etag: v.etag, fields: changed };
        });
    }

    function archive(collection, id, { expected, reason = '' }, meta) {
        writable(collection, meta);
        const r = find(collection, id);
        if (!r) {
            if (findArchived(collection, id)) return { action: 'already_archived', collection, id };
            throw new ToolError('NOT_FOUND', `No existe ${collection}/${id}.`);
        }
        checkExpected(collection, r, expected);
        archiveEntity(collection, id, { archivedBy: meta.agent, reason: String(reason).slice(0, 300), operationId: meta.operationId });
        const v = record(collection, { etag: etagOf(r), actor: meta.agent, operationId: meta.operationId, action: 'archived', snapshot: r });
        return { action: 'archived', collection, id, version: v.version, restoreWith: `restore_record ${collection} ${id}` };
    }

    function restore(collection, id, meta) {
        writable(collection, meta);
        if (find(collection, id)) return { action: 'already_active', collection, id };
        if (!findArchived(collection, id)) throw new ToolError('NOT_FOUND', `${collection}/${id} no está archivado.`);
        const row = restoreEntity(collection, id);
        const v = record(collection, { etag: etagOf(row), actor: meta.agent, operationId: meta.operationId, action: 'restored', snapshot: row });
        return { action: 'restored', collection, id, version: v.version, etag: v.etag };
    }

    function versions(collection, id) {
        const r = find(collection, id);
        if (r) sync(collection, r);
        const h = history(collection, id);
        if (!h.length) throw new ToolError('NOT_FOUND', `No hay historial de ${collection}/${id}.`);
        return { collection, id, current: r ? h.at(-1).version : null, archived: !r, versions: h.map(({ snapshot, ...x }) => ({ ...x, title: snapshot?.[conf(collection).title] ?? null })) };  
    }

    function getVersion(collection, id, version) {
        const e = history(collection, id).find(h => h.version === version);
        if (!e) throw new ToolError('NOT_FOUND', `No existe la versión ${version} de ${collection}/${id}.`);
        return { collection, id, version: e.version, at: e.at, actor: e.actor, action: e.action, snapshot: view(collection, e.snapshot, { normalize: false }) };
    }

    /**
     * Restaura campos de una versión anterior como una versión NUEVA (el historial no se reescribe).
     * Exige expected (versión actual que el agente vio). Si otros cambiaron esos campos después de la
     * versión elegida, se niega salvo que se pidan campos concretos o overwriteLater=true.
     */
    function restoreVersion(collection, id, { version, expected, fields, overwriteLater = false }, meta) {
        writable(collection, meta);
        if (expected === undefined || expected === null) throw new ToolError('INVALID_INPUT', 'Falta expected_version: la versión actual que viste.', { hint: 'Consulta list_record_versions.' });
        const r = find(collection, id);
        if (!r) throw new ToolError('NOT_FOUND', `${collection}/${id} no está activo.`, { hint: 'Si está archivado, primero restore_record.' });
        const s = checkExpected(collection, r, expected);
        const target = s.history.find(h => h.version === version);
        if (!target) throw new ToolError('NOT_FOUND', `No existe la versión ${version}.`);
        const keys = [...new Set([...Object.keys(target.snapshot), ...Object.keys(r)])].filter(k => !READONLY_FIELDS.has(k) && !['updatedAt', 'updatedBy', 'createdAt', 'createdBy'].includes(k));
        const differing = keys.filter(k => canonical(target.snapshot[k]) !== canonical(r[k]));
        const chosen = fields?.length ? differing.filter(k => fields.includes(k)) : differing;
        if (!chosen.length) return { action: 'unchanged', collection, id, version: s.version, etag: s.etag };
        const later = s.history.filter(h => h.version > version && h.actor !== meta.agent);
        const laterFields = new Set(later.flatMap(h => h.fields || Object.keys(h.snapshot || {}).filter(k => canonical(h.snapshot[k]) !== canonical(s.history.find(x => x.version === h.version - 1)?.snapshot?.[k]))));
        const wouldOverwrite = chosen.filter(k => laterFields.has(k));
        if (wouldOverwrite.length && !overwriteLater && !fields?.length) {
            throw new ToolError('RESTORE_WOULD_OVERWRITE', `Restaurar la versión ${version} desharía cambios posteriores de otros en: ${wouldOverwrite.join(', ')}.`, { details: { wouldOverwrite, laterVersions: later.map(h => ({ version: h.version, actor: h.actor, at: h.at })) }, hint: 'Indica fields con solo lo que quieres recuperar, o overwrite_later_changes=true si de verdad quieres deshacerlos.' });
        }
        const changes = Object.fromEntries(chosen.map(k => [k, target.snapshot[k] === undefined ? null : target.snapshot[k]]));
        const row = updateEntity(collection, id, { ...changes, updatedBy: meta.agent, updatedAt: new Date().toISOString() });
        const v = record(collection, { etag: etagOf(row), actor: meta.agent, operationId: meta.operationId, action: 'restored_version', fromVersion: version, fields: chosen, snapshot: row });
        return { action: 'restored_version', collection, id, fromVersion: version, version: v.version, etag: v.etag, fields: chosen, keptLaterChanges: [...laterFields].filter(k => !chosen.includes(k)) };
    }

    /** Lote con recibo: cada operación se resuelve por separado; reintentar con la misma clave no repite lo ya hecho. */
    function batch({ operations = [], idempotencyKey, stopOnError = false }, meta) {
        if (!operations.length || operations.length > 100) throw new ToolError('INVALID_INPUT', 'Envía entre 1 y 100 operaciones.');
        const results = [];
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const key = idempotencyKey ? `${idempotencyKey}#${i}` : op.idempotency_key;
            try {
                let r;
                if (op.op === 'create') r = create(op.collection, { data: op.data, externalId: op.external_id, idempotencyKey: key }, meta);
                else if (op.op === 'update') r = update(op.collection, op.id, { data: op.data, expected: op.expected_version ?? op.expected_etag, idempotencyKey: key }, meta);
                else if (op.op === 'archive') r = archive(op.collection, op.id, { expected: op.expected_version ?? op.expected_etag, reason: op.reason }, meta);
                else if (op.op === 'restore') r = restore(op.collection, op.id, meta);
                else throw new ToolError('INVALID_INPUT', `op desconocida: ${op.op}`);
                results.push({ index: i, ok: true, ...r });
            } catch (err) {
                results.push({ index: i, ok: false, code: err.code || 'ERROR', error: err.message, details: err.details || null });
                if (stopOnError) break;
            }
        }
        return { total: operations.length, ok: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
    }

    /** Propone (y con apply=true aplica) la normalización de prioridades y estados guardados. */
    function normalizeStored(collection, { apply = false, limit = 500 }, meta) {
        writable(collection, meta);
        const changes = [];
        for (const r of (readDB()[collection] || []).slice(0, limit)) {
            const patch = {};
            if (['tasks', 'projects'].includes(collection) && r.priority && normalizePriority(r.priority) && normalizePriority(r.priority) !== r.priority) patch.priority = normalizePriority(r.priority);
            if (collection === 'tasks' && r.status && normalizeTaskStatus(r.status) && normalizeTaskStatus(r.status) !== r.status) patch.status = normalizeTaskStatus(r.status);
            if (collection === 'events' && r.status && normalizeEventStatus(r.status) && normalizeEventStatus(r.status) !== r.status) patch.status = normalizeEventStatus(r.status);
            if (Object.keys(patch).length) changes.push({ id: r.id, from: Object.fromEntries(Object.keys(patch).map(k => [k, r[k]])), to: patch });
        }
        if (apply) for (const c of changes) update(collection, c.id, { data: c.to }, meta);
        return { collection, applied: apply, count: changes.length, changes: changes.slice(0, 200) };
    }

    const modules = () => {
        const db = readDB();
        return Object.entries(COLLECTIONS).map(([id, c]) => ({ id, label: c.label, count: (db[id] || []).length, archived: (db.archivedRecords || []).filter(a => a.collection === id).length, writable: c.write, via: c.via || null }));
    };

    return { query, get, create, update, archive, restore, versions, getVersion, restoreVersion, batch, normalizeStored, modules, sync, history, etagOf, find };
}
