import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fold } from '../knowledge/text.js';
import { createArtifactStore, mimeFor, safeName, MAX_FILE_BYTES } from '../office/artifacts.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const id = prefix => `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
const same = (a, b) => fold(String(a || '')) === fold(String(b || ''));
const nonempty = value => value !== undefined && value !== null && value !== '';
const date = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
const MAX_MCP_FILE_BYTES = Math.min(MAX_FILE_BYTES, 7 * 1024 * 1024); // express.json limita el cuerpo MCP a 10 MB.
const DASHBOARD_BASE = () => (process.env.DASHBOARD_URL || 'http://localhost:8090').replace(/\/$/, '');
const link = (kind, key) => kind === 'event' ? `${DASHBOARD_BASE()}/eventos/${encodeURIComponent(key)}` : `${DASHBOARD_BASE()}/portfolio?id=${encodeURIComponent(key)}`;
const fileLink = key => `${DASHBOARD_BASE()}/mcp/files/${encodeURIComponent(key)}`;
const writeJson = (file, value) => { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2)); fs.renameSync(tmp, file); };

export function createCaptureService({ dir, readDB, createEntity, updateEntity, actor = 'ChatGPT' }) {
  fs.mkdirSync(dir, { recursive: true });
  const receiptsDir = path.join(dir, 'receipts');
  fs.mkdirSync(receiptsDir, { recursive: true });
  const artifacts = createArtifactStore({ dir: path.join(dir, 'files') });
  const receiptPath = key => path.join(receiptsDir, `${hash(key)}.json`);
  const project = ref => (readDB().projects || []).find(p => p.id === ref || p.externalId === ref || p.sourceIds?.includes(ref)) || null;
  const task = ref => (readDB().tasks || []).find(t => t.id === ref || t.externalId === ref || t.sourceIds?.includes(ref)) || null;
  const resolveProject = (item, { preview = false } = {}) => {
    const rows = readDB().projects || [];
    const ext = item.external_id || item.externalId;
    if (item.id) { const p = rows.find(x => x.id === item.id); if (!p) throw new Error(`Proyecto ${item.id} inexistente`); return p; }
    if (ext) { const p = rows.find(x => x.externalId === ext || x.sourceIds?.includes(ext)); if (p) return p; }
    const exact = rows.filter(x => same(x.name, item.name));
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) throw new Error(`Nombre ambiguo: ${item.name}`);
    if (!preview && ext && !item.name) throw new Error('Falta nombre del proyecto');
    return null;
  };
  const similarProjects = name => (readDB().projects || []).filter(p => {
    const a = fold(p.name), b = fold(name || '');
    return b.length > 4 && (a.includes(b) || b.includes(a));
  }).map(p => ({ id: p.id, name: p.name }));
  const upsertProject = item => {
    if (!item?.name && !item?.id) throw new Error('Falta name o id');
    const found = resolveProject(item);
    if (!found) {
      const candidates = similarProjects(item.name);
      if (candidates.length) throw new Error(`Posible duplicado; resuelve con id: ${JSON.stringify(candidates)}`);
      const p = createEntity('projects', { name: item.name, externalId: item.external_id || null, objective: item.objective || '', description: item.description || '', status: item.status === 'needs-review' ? 'needs-review' : (item.status || 'needs-review'), source: item.source || null, createdBy: actor });
      return { action: 'created', id: p.id, url: link('project', p.id) };
    }
    const changes = {};
    const ext = item.external_id || item.externalId;
    if (ext && !found.externalId && !found.sourceIds?.includes(ext)) changes.sourceIds = [...(found.sourceIds || []), ext];
    // A source draft cannot silently replace a live project record.
    if (item.update_existing === true) {
      for (const key of ['name', 'objective', 'description', 'status', 'priority', 'nextAction']) {
        if (nonempty(item[key])) changes[key] = item[key];
      }
    }
    const p = Object.keys(changes).length ? updateEntity('projects', found.id, changes) : found;
    return { action: Object.keys(changes).length ? 'updated' : 'existing', id: p.id, url: link('project', p.id) };
  };
  const upsertBrief = item => {
    const p = project(item.project_id || item.project_ref || item.project_external_id);
    if (!p) throw new Error('Proyecto del brief inexistente');
    const content = item.content || item.brief_markdown;
    if (!content?.trim()) throw new Error('Brief vacío');
    const digest = hash(content);
    const versions = p.briefVersions || [];
    const previous = versions.at(-1);
    if (previous?.sha256 === digest) return { action: 'existing', id: previous.id, projectId: p.id, version: previous.version, url: link('project', p.id) };
    const version = versions.length + 1;
    const record = { id: id('brief'), version, markdown: content, sha256: digest, status: item.status || 'draft', source: item.source || null, createdBy: actor, createdAt: new Date().toISOString() };
    updateEntity('projects', p.id, { briefVersions: [...versions, record], brief: content });
    return { action: 'created', id: record.id, projectId: p.id, version, url: link('project', p.id) };
  };
  const upsertTask = item => {
    if (!item?.text?.trim()) throw new Error('Falta text');
    if (!date(item.due)) throw new Error('Fecha de tarea inválida');
    const projectId = item.project_id || item.project_ref || item.project_external_id;
    const p = project(projectId);
    if (projectId && !p) throw new Error(`Proyecto ${projectId} inexistente`);
    const externalId = item.external_id || item.externalId;
    const rows = readDB().tasks || [];
    let found = item.id ? task(item.id) : null;
    if (item.id && !found) throw new Error(`Tarea ${item.id} inexistente`);
    if (!found && externalId) found = task(externalId);
    if (!found) {
      const exact = rows.filter(t => t.projectId === (p?.id || null) && same(t.text || t.title, item.text));
      if (exact.length > 1) throw new Error(`Varias tareas coinciden: ${item.text}`);
      found = exact[0];
    }
    const dependencies = item.dependencies || [];
    for (const ref of dependencies) if (!task(ref)) throw new Error(`Dependencia ${ref} inexistente`);
    if (found) {
      const changes = {};
      if (externalId && !found.externalId && !found.sourceIds?.includes(externalId)) changes.sourceIds = [...(found.sourceIds || []), externalId];
      if (item.update_existing === true) {
        for (const [from, to] of [['text','text'],['due','due'],['assigned_to','assignedTo'],['status','status'],['priority','priority'],['notes','notes']]) if (item[from] !== undefined) changes[to] = item[from];
        if (item.dependencies !== undefined) changes.dependencies = dependencies.map(ref => task(ref).id);
      }
      const t = Object.keys(changes).length ? updateEntity('tasks', found.id, changes) : found;
      return { action: Object.keys(changes).length ? 'updated' : 'existing', id: t.id, projectId: t.projectId, url: link('task', t.id) };
    }
    const t = createEntity('tasks', { text: item.text, projectId: p?.id || null, externalId: externalId || null, status: item.status || 'pending', due: item.due || '', assignedTo: item.assigned_to || '', priority: item.priority || 'medium', notes: item.notes || '', dependencies: dependencies.map(ref => task(ref).id), source: item.source || null, needsVerification: !!item.needs_verification, acceptanceCriteria: item.acceptance_criteria || '', createdBy: actor, createdAt: new Date().toISOString() });
    return { action: 'created', id: t.id, projectId: t.projectId, url: link('task', t.id) };
  };
  const upsertEvent = item => {
    if (!item?.name?.trim() || !item.date) throw new Error('Evento requiere nombre y fecha explícitos');
    if (!date(item.date) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) throw new Error('Fecha de evento inválida');
    if (item.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) throw new Error('Hora inválida');
    if (!item.time && item.all_day !== true) throw new Error('Indica hora o all_day=true');
    if (item.timezone && item.timezone !== 'America/Panama') throw new Error('Solo se admite America/Panama');
    const p = item.project_id && project(item.project_id);
    if (item.project_id && !p) throw new Error('Proyecto del evento inexistente');
    const rows = readDB().events || [];
    const found = rows.find(e => e.id === item.id || (item.external_id && e.externalId === item.external_id)) || rows.find(e => e.date === item.date && e.time === (item.time || '') && same(e.name, item.name));
    if (found) {
      if (item.update_existing === true) {
        const changes = { name: item.name, date: item.date, time: item.time || '', allDay: !!item.all_day, timezone: 'America/Panama' };
        for (const key of ['location', 'description']) if (item[key] !== undefined) changes[key] = item[key];
        updateEntity('events', found.id, changes);
        return { action: 'updated', id: found.id, url: link('event', found.id) };
      }
      return { action: 'existing', id: found.id, url: link('event', found.id) };
    }
    const e = createEntity('events', { name: item.name, date: item.date, time: item.time || '', allDay: !!item.all_day, timezone: 'America/Panama', projectId: p?.id || null, externalId: item.external_id || null, location: item.location || '', description: item.description || '', status: 'planificacion', createdBy: actor });
    return { action: 'created', id: e.id, url: link('event', e.id) };
  };
  // Documentos versionados por nombre dentro de su proyecto/tarea: el nuevo contenido crea la versión N+1
  // y deja la anterior como "superseded"; nunca se borran bytes.
  const latestByName = (files, name) => files.filter(f => f.name === name && f.status !== 'superseded').sort((a, b) => (b.version || 1) - (a.version || 1))[0] || null;
  const attachBytes = (item, bytes, { actor: who = actor } = {}) => {
    const p = item.project_id && project(item.project_id);
    const t = item.task_id && task(item.task_id);
    if (!p && !t) throw new Error('Documento requiere project_id o task_id');
    if (item.project_id && !p) throw new Error('Proyecto inexistente');
    if (item.task_id && !t) throw new Error('Tarea inexistente');
    if (p && t && t.projectId !== p.id) throw new Error('Tarea no pertenece al proyecto');
    if (!item.name || safeName(item.name) !== item.name) throw new Error('Nombre de archivo inválido');
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error(`Archivo vacío o mayor de ${MAX_FILE_BYTES / 1048576} MB`);
    const ext = path.extname(item.name).toLowerCase();
    if (ext === '.pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('El contenido no es PDF');
    if (ext === '.png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('El contenido no es PNG');
    if (['.zip','.docx','.xlsx','.pptx'].includes(ext) && bytes.subarray(0, 2).toString() !== 'PK') throw new Error('El contenido no es un archivo ZIP válido');
    const digest = hash(bytes);
    if (item.sha256 && item.sha256 !== digest) throw new Error('SHA-256 no coincide');
    const owner = t || p;
    const files = owner.documents || [];
    const current = latestByName(files, item.name);
    if (current && current.sha256 === digest) return { action: 'existing', id: current.id, sha256: digest, version: current.version || 1, projectId: p?.id || t.projectId, taskId: t?.id || null, url: fileLink(current.id) };
    if (item.expected_current_id !== undefined && (current?.id || null) !== (item.expected_current_id || null)) throw new Error(`Conflicto de versión: la versión vigente de ${item.name} es ${current?.id || 'ninguna'}`);
    const stored = artifacts.write(owner.id, { name: item.name, content: bytes, mime: mimeFor(item.name), description: item.description || '', createdBy: who, createdByKind: 'agent' });
    const version = current ? (current.version || 1) + 1 : 1;
    const meta = { ...stored, sha256: digest, projectId: p?.id || t.projectId, taskId: t?.id || null, source: item.source || null, version, status: 'current', previousVersionId: current?.id || null, restoredFrom: item.restored_from || null, createdBy: who };
    const updated = files.map(f => (current && f.id === current.id ? { ...f, version: f.version || 1, status: 'superseded', supersededBy: meta.id, supersededAt: new Date().toISOString() } : f));
    updateEntity(t ? 'tasks' : 'projects', owner.id, { documents: [...updated, meta] });
    return { action: current ? 'new_version' : 'created', id: meta.id, sha256: digest, size: bytes.length, version, previousVersionId: meta.previousVersionId, projectId: meta.projectId, taskId: meta.taskId, url: fileLink(meta.id) };
  };
  const attach = item => {
    if ((item.content_base64 === undefined) === (item.content === undefined)) throw new Error('Envía content o content_base64');
    if (item.content_base64 !== undefined && (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.content_base64) || item.content_base64.length > Math.ceil(MAX_MCP_FILE_BYTES * 4 / 3) + 4)) throw new Error('Base64 inválido o demasiado grande (para archivos grandes usa create_upload)');
    const bytes = item.content_base64 !== undefined ? Buffer.from(item.content_base64, 'base64') : Buffer.from(item.content, 'utf8');
    if (bytes.length > MAX_MCP_FILE_BYTES) throw new Error('Archivo mayor de 7 MB por MCP; usa create_upload');
    return attachBytes(item, bytes);
  };
  const documentVersions = fileId => {
    for (const owner of [...(readDB().projects || []), ...(readDB().tasks || [])]) {
      const meta = (owner.documents || []).find(f => f.id === fileId);
      if (!meta) continue;
      const versions = (owner.documents || []).filter(f => f.name === meta.name).sort((a, b) => (a.version || 1) - (b.version || 1))
        .map(f => ({ id: f.id, name: f.name, version: f.version || 1, status: f.status || 'current', sha256: f.sha256, size: f.size, createdAt: f.createdAt, createdBy: f.createdBy || null, source: f.source || null, previousVersionId: f.previousVersionId || null, restoredFrom: f.restoredFrom || null, url: fileLink(f.id) }));
      return { name: meta.name, projectId: meta.projectId, taskId: meta.taskId, current: versions.find(v => v.status !== 'superseded')?.id || null, versions };
    }
    return null;
  };
  /** Recupera una versión anterior como versión NUEVA; exige la vigente que viste para no pisar cambios. */
  const restoreDocument = ({ file_id, expected_current_id }, who = actor) => {
    const info = documentVersions(file_id);
    if (!info) throw new Error('Documento inexistente');
    if (!expected_current_id) throw new Error('Falta expected_current_id (versión vigente que viste)');
    if (info.current !== expected_current_id) throw new Error(`Conflicto de versión: la vigente es ${info.current}`);
    const old = readFile(file_id);
    return attachBytes({ project_id: info.taskId ? undefined : info.projectId, task_id: info.taskId || undefined, name: info.name, restored_from: file_id, expected_current_id }, old.bytes, { actor: who });
  };
  const restoreBrief = ({ project_id, version, expected_current_version }) => {
    const p = project(project_id);
    if (!p) throw new Error('Proyecto inexistente');
    const versions = p.briefVersions || [];
    if (!expected_current_version) throw new Error('Falta expected_current_version');
    if (versions.length !== expected_current_version) throw new Error(`Conflicto de versión: el brief va por la versión ${versions.length}`);
    const target = versions.find(v => v.version === version);
    if (!target) throw new Error(`No existe la versión ${version} del brief`);
    return { ...upsertBrief({ project_id: p.id, content: target.markdown, status: target.status, source: { restoredFrom: version } }), restoredFrom: version };
  };
  const readFile = fileId => {
    for (const owner of [...(readDB().projects || []), ...(readDB().tasks || [])]) {
      const meta = (owner.documents || []).find(f => f.id === fileId);
      if (meta) return { meta, bytes: artifacts.read(meta) };
    }
    return null;
  };
  const preview = batch => {
    const rows = [];
    for (const item of batch.projects || []) {
      try { const p = resolveProject(item, { preview: true }); rows.push({ kind: 'project', externalId: item.external_id, name: item.name, action: p ? 'match' : 'create', matchedId: p?.id || null, candidates: p ? [] : similarProjects(item.name) }); }
      catch (e) { rows.push({ kind: 'project', name: item.name, action: 'conflict', error: e.message }); }
    }
    return { captureId: batch.capture_id || batch.batch_id || null, projects: rows, counts: { projects: (batch.projects || []).length, briefs: (batch.briefs || []).length, tasks: (batch.tasks || []).length, events: (batch.events || batch.calendar_events || []).length, documents: (batch.documents || batch.attachments || []).length } };
  };
  const apply = batch => {
    const key = batch.idempotency_key || batch.capture_id || batch.batch_id;
    if (!key || typeof key !== 'string' || key.length > 180) throw new Error('Se requiere idempotency_key o capture_id estable');
    const file = receiptPath(key);
    const payloadHash = hash(JSON.stringify(batch));
    let receipt = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { captureId: key, payloadHash, startedAt: new Date().toISOString(), operations: [] };
    if (receipt.payloadHash !== payloadHash) throw new Error('La clave de captura ya se usó con contenido distinto');
    const groups = [['project', batch.projects || [], upsertProject], ['brief', batch.briefs || [], upsertBrief], ['task', batch.tasks || [], upsertTask], ['event', batch.events || batch.calendar_events || [], upsertEvent], ['document', batch.documents || batch.attachments || [], attach]];
    for (const [kind, items, action] of groups) for (let index = 0; index < items.length; index++) {
      const opKey = `${kind}:${index}`;
      if (receipt.operations.some(x => x.key === opKey && x.status === 'ok')) continue;
      try { const result = action(items[index]); receipt.operations = receipt.operations.filter(x => x.key !== opKey); receipt.operations.push({ key: opKey, kind, status: 'ok', ...result }); }
      catch (e) { receipt.operations = receipt.operations.filter(x => x.key !== opKey); receipt.operations.push({ key: opKey, kind, status: 'error', error: e.message }); }
      writeJson(file, receipt);
    }
    receipt.completedAt = new Date().toISOString();
    receipt.errors = receipt.operations.filter(x => x.status === 'error').length;
    writeJson(file, receipt);
    return normalizeReceipt(receipt);
  };
  const normalizeReceipt = receipt => {
    for (const op of receipt.operations || []) {
      if (!op.id || op.status !== 'ok') continue;
      op.url = op.kind === 'document' ? fileLink(op.id) : link(op.kind === 'brief' ? 'project' : op.kind, op.kind === 'brief' ? op.projectId : op.id);
    }
    return receipt;
  };
  const getReceipt = key => { const file = receiptPath(key); if (!fs.existsSync(file)) return null; const receipt = normalizeReceipt(JSON.parse(fs.readFileSync(file, 'utf8'))); writeJson(file, receipt); return receipt; };
  return { project, task, upsertProject, upsertBrief, upsertTask, upsertEvent, attach, attachBytes, documentVersions, restoreDocument, restoreBrief, readFile, preview, apply, getReceipt };
}
