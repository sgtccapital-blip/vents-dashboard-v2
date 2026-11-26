// Cola de trabajos duradera compartida entre el gateway MCP (crea, consulta, cancela) y el
// ejecutor (proceso aparte, ver runner.js). Todo vive en disco: un trabajo sobrevive a reinicios
// de cualquiera de los dos y se consulta desde otra conexión o chat sin mantener abierta la petición.
//
// Propiedad de los archivos (para no pisarse sin bloqueos):
//   jobs/<id>/job.json    lo crea el gateway; desde que el ejecutor lo reclama, solo lo escribe el ejecutor
//   jobs/<id>/queued      marca de "en cola"; quien la renombra primero (ejecutor → claimed, gateway → cancelled) gana
//   jobs/<id>/cancel      petición de cancelación del gateway a un trabajo en curso
//   jobs/<id>/log.txt     salida redactada (la escribe el ejecutor)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ToolError } from './toolkit.js';

export const JOB_TYPES = ['test', 'lint', 'build', 'script', 'deploy_prepare', 'deploy_validate', 'deploy_release', 'deploy_rollback'];
export const FINAL = ['succeeded', 'failed', 'cancelled', 'timed_out', 'interrupted'];
export const HEARTBEAT_STALE_MS = 15000;
const MAX_QUEUED_PER_PRINCIPAL = 10;
const SAFE_ARG = /^[A-Za-z0-9_./:=@,+%-]{1,200}$/;

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
export const writeJsonAtomic = (file, value) => { const tmp = `${file}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2)); fs.renameSync(tmp, file); };
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const stable = v => JSON.stringify(v, Object.keys(v || {}).sort());

export function jobPaths(root) {
    const jobsDir = path.join(root, 'jobs');
    const runnerDir = path.join(root, 'runner');
    const idemDir = path.join(jobsDir, '_idempotency');
    for (const d of [jobsDir, runnerDir, idemDir]) fs.mkdirSync(d, { recursive: true });
    return {
        root, jobsDir, runnerDir, idemDir,
        jobDir: id => path.join(jobsDir, id),
        jobFile: id => path.join(jobsDir, id, 'job.json'),
        logFile: id => path.join(jobsDir, id, 'log.txt'),
        heartbeat: path.join(runnerDir, 'heartbeat.json'),
        lock: path.join(runnerDir, 'lock'),
        artifactsDir: path.join(root, 'artifacts'),
    };
}

export function readHeartbeat(paths) {
    const hb = readJson(paths.heartbeat);
    if (!hb) return { online: false, lastHeartbeat: null, reason: 'El ejecutor nunca ha arrancado en esta máquina.' };
    const age = Date.now() - Date.parse(hb.at);
    let alive = age < HEARTBEAT_STALE_MS;
    if (alive && hb.host === undefined) alive = true;
    return { online: alive, lastHeartbeat: hb.at, ageMs: age, runnerId: hb.runnerId, pid: hb.pid, host: hb.host, startedAt: hb.startedAt, version: hb.version, active: hb.active || [], maxConcurrent: hb.maxConcurrent, reason: alive ? null : 'Sin latido reciente: el ejecutor está detenido o la Mac está dormida.' };
}

/** Valida los argumentos extra que un agente pide para un trabajo. Nunca hay shell de por medio. */
export function validateArgs(def, args = [], resolveInWorkspace) {
    if (!args.length) return [];
    if (!def.allowArgs) throw new ToolError('INVALID_INPUT', 'Este trabajo no acepta argumentos extra.');
    if (args.length > 20) throw new ToolError('INVALID_INPUT', 'Máximo 20 argumentos.');
    return args.map(a => {
        if (typeof a !== 'string' || !SAFE_ARG.test(a)) throw new ToolError('INVALID_INPUT', `Argumento no permitido: ${String(a).slice(0, 60)}`, { hint: 'Solo letras, números y ._/:=@,+%- sin espacios.' });
        if (a.startsWith('-')) {
            if (!(def.allowedFlags || []).some(f => (f.endsWith('=') ? a.startsWith(f) : a === f))) throw new ToolError('INVALID_INPUT', `Opción no permitida: ${a}`, { hint: `Permitidas: ${(def.allowedFlags || []).join(', ') || 'ninguna'}` });
            return a;
        }
        if (a.includes('/') || /\.[a-z]{1,5}$/i.test(a)) resolveInWorkspace(a);
        return a;
    });
}

export function createJobQueue({ root, workspaces }) {
    const paths = jobPaths(root);

    const read = id => {
        if (!/^job-[a-z0-9-]+$/.test(String(id))) throw new ToolError('INVALID_INPUT', 'job_id inválido');
        const job = readJson(paths.jobFile(id));
        if (!job) throw new ToolError('NOT_FOUND', `No existe el trabajo ${id}.`, { hint: 'Usa list_jobs para ver los trabajos recientes.' });
        return job;
    };

    function view(job) {
        const hb = readHeartbeat(paths);
        const out = { ...job, executor: { online: hb.online, lastHeartbeat: hb.lastHeartbeat } };
        delete out.env;
        if (job.status === 'queued' && !hb.online) out.note = 'En cola: el ejecutor no está activo; arrancará cuando vuelva.';
        if (job.status === 'running' && !hb.online) { out.stale = true; out.note = 'El ejecutor no responde. Si se reinició, el trabajo se marcará como interrumpido al volver.'; }
        return out;
    }

    /**
     * spec: { type, workspace, script?, args?, timeoutSec?, deploymentId?, payload? }
     * Con idempotencyKey: la misma clave y los mismos parámetros devuelven el trabajo existente (no se reejecuta).
     */
    function start(spec, { principal = 'admin', agent = 'admin', idempotencyKey, operationId } = {}) {
        if (!JOB_TYPES.includes(spec.type)) throw new ToolError('INVALID_INPUT', `Tipo de trabajo no válido: ${spec.type}`);
        const ws = workspaces.require(spec.workspace);
        let def = null;
        let argv = null;
        if (!spec.type.startsWith('deploy_')) {
            if (spec.type === 'script') {
                if (!spec.script || !(ws.allowedScripts || []).includes(spec.script)) throw new ToolError('NOT_ALLOWED', `El script "${spec.script}" no está autorizado en ${ws.id}.`, { hint: `Autorizados: ${(ws.allowedScripts || []).join(', ') || 'ninguno'}. Se configuran en el panel de workspaces.` });
                def = ws.jobs?.scripts?.[spec.script] || { command: 'npm', args: ['run', spec.script, '--'], timeoutSec: 900, allowArgs: true, allowedFlags: [] };
            } else {
                def = ws.jobs?.[spec.type];
                if (!def) throw new ToolError('NOT_ALLOWED', `El workspace ${ws.id} no tiene definido el trabajo "${spec.type}".`, { hint: 'Defínelo en el panel de workspaces.' });
            }
            const extra = validateArgs(def, spec.args || [], a => workspaces.resolvePath(ws, a));
            argv = [def.command, ...(def.args || []), ...extra];
        }
        const timeoutSec = Math.min(Math.max(Number(spec.timeoutSec || def?.timeoutSec || 900), 10), 3600);
        const params = { type: spec.type, workspace: ws.id, script: spec.script || null, args: spec.args || [], deploymentId: spec.deploymentId || null, payload: spec.payload || null };
        const paramsHash = sha(stable(params) + JSON.stringify(params.args) + stable(params.payload || {}));

        let idemFile = null;
        if (idempotencyKey) {
            if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 180) throw new ToolError('INVALID_INPUT', 'idempotency_key inválida');
            idemFile = path.join(paths.idemDir, sha(`${principal}\n${idempotencyKey}`));
            const prev = readJson(idemFile);
            if (prev) {
                if (prev.paramsHash !== paramsHash) throw new ToolError('CONFLICT', 'Esa idempotency_key ya se usó con otros parámetros.', { hint: 'Usa una clave nueva para un trabajo distinto.' });
                return { ...view(read(prev.jobId)), deduplicated: true };
            }
        }
        const mine = listRaw().filter(j => j.principal === principal && ['queued', 'running'].includes(j.status));
        if (mine.length >= MAX_QUEUED_PER_PRINCIPAL) throw new ToolError('RATE_LIMITED', `Tienes ${mine.length} trabajos activos; espera a que terminen.`, { retryable: true });

        const id = `job-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
        const job = {
            id, ...params, command: argv, cwd: ws.path, status: 'queued', progress: { percent: 0, stage: 'en cola' },
            createdAt: new Date().toISOString(), startedAt: null, finishedAt: null, exitCode: null, signal: null,
            requestedBy: agent, principal, operationId: operationId || null, idempotencyKey: idempotencyKey || null, paramsHash,
            timeoutSec, maxLogBytes: 2 * 1024 * 1024, artifactDirs: def?.artifacts || [], artifacts: [], commit: null, dirty: null, summary: null, error: null,
        };
        if (idemFile) {
            try { fs.writeFileSync(idemFile, JSON.stringify({ jobId: id, paramsHash, at: job.createdAt }), { flag: 'wx' }); }
            catch { const prev = readJson(idemFile); return { ...view(read(prev.jobId)), deduplicated: true }; }
        }
        fs.mkdirSync(paths.jobDir(id), { recursive: true });
        writeJsonAtomic(paths.jobFile(id), job);
        fs.writeFileSync(path.join(paths.jobDir(id), 'queued'), job.createdAt);
        return view(job);
    }

    function listRaw() {
        return fs.readdirSync(paths.jobsDir).filter(d => d.startsWith('job-')).map(d => readJson(paths.jobFile(d))).filter(Boolean);
    }

    function list({ workspace, status, principal, limit = 50, cursor = 0 } = {}) {
        const rows = listRaw().filter(j => (!workspace || j.workspace === workspace) && (!status || j.status === status) && (!principal || j.principal === principal))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { total: rows.length, jobs: rows.slice(cursor, cursor + limit).map(j => ({ id: j.id, type: j.type, workspace: j.workspace, script: j.script, status: j.status, progress: j.progress, createdAt: j.createdAt, startedAt: j.startedAt, finishedAt: j.finishedAt, exitCode: j.exitCode, requestedBy: j.requestedBy, summary: j.summary, deploymentId: j.deploymentId })), nextCursor: cursor + limit < rows.length ? cursor + limit : null };
    }

    function logs(id, { offset = 0, limit = 64 * 1024, tail } = {}) {
        const job = read(id);
        const file = paths.logFile(id);
        const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
        const max = Math.min(Math.max(limit, 1), 256 * 1024);
        const start = tail ? Math.max(0, size - max) : Math.min(Math.max(offset, 0), size);
        const len = Math.min(max, size - start);
        let text = '';
        if (len > 0) { const fd = fs.openSync(file, 'r'); const buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, start); fs.closeSync(fd); text = buf.toString('utf8'); }
        return { jobId: id, status: job.status, offset: start, nextOffset: start + len, size, complete: FINAL.includes(job.status) && start + len >= size, text };
    }

    function cancel(id, actor = 'admin') {
        const job = read(id);
        if (FINAL.includes(job.status)) return { ...view(job), alreadyFinished: true };
        const dir = paths.jobDir(id);
        try {
            fs.renameSync(path.join(dir, 'queued'), path.join(dir, 'cancelled'));
            const done = { ...job, status: 'cancelled', finishedAt: new Date().toISOString(), progress: { ...job.progress, stage: 'cancelado antes de empezar' }, cancelledBy: actor };
            writeJsonAtomic(paths.jobFile(id), done);
            return view(done);
        } catch {
            fs.writeFileSync(path.join(dir, 'cancel'), JSON.stringify({ by: actor, at: new Date().toISOString() }));
            return { ...view(read(id)), cancelRequested: true, note: 'Cancelación pedida; el ejecutor detendrá el proceso en unos segundos.' };
        }
    }

    return { paths, start, get: id => view(read(id)), list, logs, cancel, executor: () => readHeartbeat(paths), raw: read };
}
