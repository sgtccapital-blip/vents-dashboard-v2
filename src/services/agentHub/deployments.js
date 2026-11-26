// Despliegues en etapas separadas: preparar (build en el commit exacto) → validar (pruebas + hash del
// artefacto) → desplegar → consultar estado → revertir a una versión conocida.
// Cada despliegue queda atado a un commit y a un artefacto con manifiesto SHA-256.
// El gateway solo crea registros y encola trabajos; el ejecutor hace el trabajo y escribe los resultados
// en archivos por etapa (prepare.json, validate.json, release.json), así nunca escriben los dos el mismo archivo.
//
// Proveedor implementado: "static-release" — copia el artefacto a <targetDir>/releases/<id> y cambia
// el enlace <targetDir>/current de forma atómica. Otros proveedores (Render…) figuran como pendientes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ToolError } from './toolkit.js';
import { writeJsonAtomic } from './jobs.js';
import { manifestOf, childEnv } from './runner.js';

export const PROVIDERS = {
    'static-release': { label: 'Carpeta con releases y enlace "current"', implemented: true },
    render: { label: 'Render (deploy hook)', implemented: false, note: 'Pendiente: no hay forma verificada de fijar el commit exacto ni de revertir desde aquí.' },
};
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const git = (cwd, args) => new Promise((resolve, reject) => {
    const c = spawn('git', args, { cwd, env: childEnv({ GIT_TERMINAL_PROMPT: '0' }) });
    let out = '', err = '';
    c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { err += d; });
    c.on('close', code => (code === 0 ? resolve(out.trim()) : reject(new Error(`git ${args[0]}: ${err.trim().slice(0, 300)}`))));
    c.on('error', reject);
});
const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true, dereference: false, errorOnExist: false });

export function deploymentStore(root) {
    const dir = path.join(root, 'deployments');
    const artifacts = path.join(root, 'artifacts');
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(artifacts, { recursive: true });
    const depDir = id => path.join(dir, id);
    return {
        dir, artifacts, depDir,
        artifactDir: id => path.join(artifacts, id),
        read(id) {
            if (!/^dep-[a-z0-9-]+$/.test(String(id))) throw new ToolError('INVALID_INPUT', 'deployment_id inválido');
            const base = readJson(path.join(depDir(id), 'deployment.json'));
            if (!base) throw new ToolError('NOT_FOUND', `No existe el despliegue ${id}.`, { hint: 'Usa list_deployments.' });
            const stage = name => readJson(path.join(depDir(id), `${name}.json`));
            return { ...base, prepare: stage('prepare'), validate: stage('validate'), release: stage('release') };
        },
        ids: () => fs.readdirSync(dir).filter(d => d.startsWith('dep-')),
        writeBase: (id, value) => { fs.mkdirSync(depDir(id), { recursive: true }); writeJsonAtomic(path.join(depDir(id), 'deployment.json'), value); },
        writeStage: (id, name, value) => writeJsonAtomic(path.join(depDir(id), `${name}.json`), value),
    };
}

export function currentRelease(targetDir) {
    if (!targetDir) return null;
    const marker = readJson(path.join(targetDir, 'current', '.arrive-release.json'));
    let link = null;
    try { link = fs.readlinkSync(path.join(targetDir, 'current')); } catch { /* sin release */ }
    return marker ? { ...marker, link } : (link ? { link } : null);
}

function statusOf(d) {
    if (d.kind === 'rollback') return d.release?.ok ? 'rolled_back' : d.release?.ok === false ? 'rollback_failed' : 'rollback_queued';
    if (d.release) return d.release.ok ? 'released' : 'release_failed';
    if (d.jobs?.release) return 'releasing';
    if (d.validate) return d.validate.ok ? 'validated' : 'validation_failed';
    if (d.jobs?.validate) return 'validating';
    if (d.prepare) return d.prepare.ok ? 'prepared' : 'prepare_failed';
    return 'preparing';
}

/** Lado gateway: crea registros y encola trabajos. */
export function createDeployments({ root, workspaces, queue }) {
    const store = deploymentStore(root);

    function view(id) {
        const d = store.read(id);
        const ws = workspaces.get(d.workspace);
        const jobs = Object.fromEntries(Object.entries(d.jobs || {}).map(([k, jid]) => { try { const j = queue.raw(jid); return [k, { id: jid, status: j.status, exitCode: j.exitCode, finishedAt: j.finishedAt }]; } catch { return [k, { id: jid, status: 'missing' }]; } }));
        return {
            deploymentId: d.id, kind: d.kind, workspace: d.workspace, provider: d.provider, commit: d.commit, ref: d.ref, createdBy: d.createdBy, createdAt: d.createdAt,
            status: statusOf(d), artifact: d.prepare?.artifact || d.artifact || null, rollbackOf: d.rollbackTo || null,
            prepare: d.prepare, validate: d.validate, release: d.release, jobs,
            currentRelease: currentRelease(ws?.deploy?.targetDir),
        };
    }

    function wsWithDeploy(id) {
        const ws = workspaces.require(id);
        if (!ws.deploy?.provider) throw new ToolError('REQUIRES_CONFIGURATION', `El workspace ${id} no tiene destino de despliegue configurado.`, { hint: 'Configura deploy.provider y deploy.targetDir en el panel de workspaces.' });
        const p = PROVIDERS[ws.deploy.provider];
        if (!p) throw new ToolError('INVALID_CONFIGURATION', `Proveedor desconocido: ${ws.deploy.provider}`);
        if (!p.implemented) throw new ToolError('NOT_IMPLEMENTED', `El proveedor ${ws.deploy.provider} todavía no está implementado.`, { hint: p.note });
        if (ws.kind !== 'git') throw new ToolError('NOT_A_REPO', 'Los despliegues necesitan un repositorio Git para fijar el commit exacto.');
        if (!ws.jobs?.build) throw new ToolError('REQUIRES_CONFIGURATION', `El workspace ${id} no tiene trabajo build.`);
        return ws;
    }

    // Con idempotency_key el id del despliegue es determinista: reintentar devuelve el mismo registro.
    const newId = meta => (meta.idempotencyKey ? `dep-k${crypto.createHash('sha256').update(`${meta.principal}\n${meta.idempotencyKey}`).digest('hex').slice(0, 16)}` : `dep-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`);
    const exists = id => fs.existsSync(path.join(store.depDir(id), 'deployment.json'));

    async function prepare({ workspace, ref = 'HEAD' }, meta) {
        const ws = wsWithDeploy(workspace);
        if (!/^[\w./~^@{}-]{1,100}$/.test(ref)) throw new ToolError('INVALID_INPUT', 'ref inválida');
        const commit = await git(ws.path, ['rev-parse', '--verify', `${ref}^{commit}`]).catch(() => { throw new ToolError('NOT_FOUND', `No existe la referencia ${ref}.`); });
        const id = newId(meta);
        if (exists(id)) {
            const prev = store.read(id);
            if (prev.commit !== commit || prev.workspace !== ws.id) throw new ToolError('CONFLICT', 'Esa idempotency_key ya se usó para otro commit o workspace.');
            return { ...view(id), deduplicated: true };
        }
        const base = { id, kind: 'deploy', workspace: ws.id, provider: ws.deploy.provider, ref, commit, createdBy: meta.agent, principal: meta.principal, createdAt: new Date().toISOString(), jobs: {} };
        store.writeBase(id, base);
        const job = queue.start({ type: 'deploy_prepare', workspace: ws.id, deploymentId: id, payload: { commit } }, { ...meta, idempotencyKey: meta.idempotencyKey ? `deploy-prepare:${meta.idempotencyKey}` : undefined });
        store.writeBase(id, { ...base, jobs: { prepare: job.id } });
        return view(id);
    }

    function attachJob(id, stage, type, meta, payload = {}) {
        const d = store.read(id);
        if (d.jobs?.[stage]) {
            const j = queue.raw(d.jobs[stage]);
            if (!['failed', 'cancelled', 'timed_out', 'interrupted'].includes(j.status)) return view(id);
        }
        const job = queue.start({ type, workspace: d.workspace, deploymentId: id, payload }, { ...meta, idempotencyKey: undefined });
        const { prepare: _p, validate: _v, release: _r, ...base } = d;  
        store.writeBase(id, { ...base, jobs: { ...(d.jobs || {}), [stage]: job.id } });
        return view(id);
    }

    function validate({ deploymentId }, meta) {
        const d = store.read(deploymentId);
        if (!d.prepare?.ok) throw new ToolError('INVALID_STATE', 'Primero debe terminar bien la preparación.', { details: { status: statusOf(d) } });
        return attachJob(deploymentId, 'validate', 'deploy_validate', meta);
    }

    function release({ deploymentId, expectedCurrent }, meta) {
        const d = store.read(deploymentId);
        if (d.kind !== 'deploy') throw new ToolError('INVALID_STATE', 'Solo se despliegan registros de tipo deploy.');
        if (!d.validate?.ok) throw new ToolError('INVALID_STATE', 'El despliegue no está validado.', { hint: 'Ejecuta validate_deployment y espera a que termine bien.', details: { status: statusOf(d) } });
        const ws = wsWithDeploy(d.workspace);
        const current = currentRelease(ws.deploy.targetDir);
        if (expectedCurrent !== undefined && (current?.deploymentId || null) !== (expectedCurrent || null)) {
            throw new ToolError('VERSION_CONFLICT', 'El release activo cambió desde que lo consultaste.', { details: { expected: expectedCurrent, current: current?.deploymentId || null } });
        }
        return attachJob(deploymentId, 'release', 'deploy_release', meta, { expectedCurrent: current?.deploymentId || null });
    }

    function rollback({ workspace, toDeploymentId }, meta) {
        const ws = wsWithDeploy(workspace);
        const target = store.read(toDeploymentId);
        if (target.workspace !== ws.id) throw new ToolError('INVALID_INPUT', 'Ese despliegue es de otro workspace.');
        if (!(target.kind === 'deploy' && target.release?.ok)) throw new ToolError('INVALID_STATE', 'Solo se puede volver a una versión que ya estuvo desplegada.');
        if (!fs.existsSync(store.artifactDir(target.id))) throw new ToolError('ARTIFACT_MISSING', 'El artefacto de esa versión ya no existe.');
        const id = newId(meta);
        if (exists(id)) {
            const prev = store.read(id);
            if (prev.rollbackTo !== target.id) throw new ToolError('CONFLICT', 'Esa idempotency_key ya se usó para otra reversión.');
            return { ...view(id), deduplicated: true };
        }
        const current = currentRelease(ws.deploy.targetDir);
        const base = { id, kind: 'rollback', workspace: ws.id, provider: ws.deploy.provider, commit: target.commit, rollbackTo: target.id, from: current?.deploymentId || null, artifact: target.prepare?.artifact, createdBy: meta.agent, principal: meta.principal, createdAt: new Date().toISOString(), jobs: {} };
        store.writeBase(id, base);
        const job = queue.start({ type: 'deploy_rollback', workspace: ws.id, deploymentId: id, payload: { to: target.id } }, { ...meta, idempotencyKey: meta.idempotencyKey ? `deploy-rollback:${meta.idempotencyKey}` : undefined });
        store.writeBase(id, { ...base, jobs: { release: job.id } });
        return view(id);
    }

    function list({ workspace, limit = 30 } = {}) {
        return store.ids().map(id => { try { return view(id); } catch { return null; } })
            .filter(d => d && (!workspace || d.workspace === workspace))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
            .map(({ prepare, validate, release, ...d }) => ({ ...d, artifactSha256: d.artifact?.sha256 || null, releasedAt: release?.at || null, error: prepare?.error || validate?.error || release?.error || null }));  
    }

    return { prepare, validate, release, rollback, get: view, list, store };
}

/** Lado ejecutor: los manejadores de cada etapa (corren dentro de runner.js). */
export function deploymentHandlers({ root, getWorkspace }) {
    const store = deploymentStore(root);

    async function withWorktree(ws, commit, io, fn) {
        const tmp = path.join(root, 'worktrees', '_deploy', `${commit.slice(0, 12)}-${crypto.randomBytes(3).toString('hex')}`);
        fs.mkdirSync(path.dirname(tmp), { recursive: true });
        await git(ws.path, ['worktree', 'add', '--detach', tmp, commit]);
        io.log(`[deploy] Worktree limpio en ${commit}`);
        const nm = path.join(ws.path, 'node_modules');
        if (fs.existsSync(nm)) fs.symlinkSync(nm, path.join(tmp, 'node_modules'), 'dir');
        try { return await fn(tmp); }
        finally { await git(ws.path, ['worktree', 'remove', '--force', tmp]).catch(() => fs.rmSync(tmp, { recursive: true, force: true })); }
    }

    // Espera a que el gateway termine de escribir el registro (se crea justo después de encolar).
    async function waitBase(id) {
        for (let i = 0; i < 50; i++) { try { return store.read(id); } catch { await new Promise(r => setTimeout(r, 100)); } }
        return store.read(id);
    }

    const handlers = {
        async deploy_prepare(job, io) {
            const ws = getWorkspace(job.workspace);
            const id = job.deploymentId;
            await waitBase(id);
            const commit = job.payload.commit;
            io.progress({ stage: 'build en worktree limpio', percent: 10 });
            try {
                return await withWorktree(ws, commit, io, async tmp => {
                    const def = ws.jobs.build;
                    const { code, signal } = await io.exec([def.command, ...(def.args || [])], { cwd: tmp });
                    if (code !== 0) { store.writeStage(id, 'prepare', { ok: false, at: new Date().toISOString(), jobId: job.id, error: `build terminó con código ${code ?? signal}` }); return { code, signal, error: 'build falló' }; }
                    const rel = ws.deploy.artifactDir || def.artifacts?.[0] || 'dist';
                    const src = path.join(tmp, rel);
                    if (!fs.existsSync(src)) { store.writeStage(id, 'prepare', { ok: false, at: new Date().toISOString(), jobId: job.id, error: `No se generó ${rel}` }); return { code: 1, error: `No se generó ${rel}` }; }
                    io.progress({ stage: 'guardando artefacto', percent: 80 });
                    const dest = store.artifactDir(id);
                    fs.rmSync(dest, { recursive: true, force: true });
                    copyDir(src, dest);
                    const m = manifestOf(dest);
                    writeJsonAtomic(path.join(store.depDir(id), 'manifest.json'), m);
                    const artifact = { path: dest, sourceDir: rel, files: m.files, bytes: m.bytes, sha256: m.sha256, commit };
                    store.writeStage(id, 'prepare', { ok: true, at: new Date().toISOString(), jobId: job.id, artifact });
                    return { code: 0, summary: { artifactSha256: m.sha256, files: m.files }, result: { deploymentId: id, artifact } };
                });
            } catch (err) {
                store.writeStage(id, 'prepare', { ok: false, at: new Date().toISOString(), jobId: job.id, error: err.message });
                throw err;
            }
        },

        async deploy_validate(job, io) {
            const ws = getWorkspace(job.workspace);
            const id = job.deploymentId;
            const d = store.read(id);
            const checks = [];
            const m = manifestOf(store.artifactDir(id));
            const manifestOk = m.sha256 === d.prepare.artifact.sha256;
            checks.push({ name: 'artefacto íntegro', ok: manifestOk, expected: d.prepare.artifact.sha256, actual: m.sha256 });
            let testsOk = true;
            if (manifestOk && ws.jobs?.test) {
                io.progress({ stage: 'pruebas en el commit exacto', percent: 30 });
                const r = await withWorktree(ws, d.commit, io, tmp => io.exec([ws.jobs.test.command, ...(ws.jobs.test.args || [])], { cwd: tmp }));
                testsOk = r.code === 0;
                checks.push({ name: 'pruebas', ok: testsOk, exitCode: r.code });
            } else if (!ws.jobs?.test) checks.push({ name: 'pruebas', ok: true, skipped: 'el workspace no define pruebas' });
            const ok = manifestOk && testsOk;
            store.writeStage(id, 'validate', { ok, at: new Date().toISOString(), jobId: job.id, checks, error: ok ? null : 'La validación falló' });
            return { code: ok ? 0 : 1, summary: { checks: checks.map(c => `${c.name}:${c.ok ? 'ok' : 'fallo'}`).join(', ') } };
        },

        async deploy_release(job, io) { return release(job, io, job.deploymentId, job.deploymentId); },
        async deploy_rollback(job, io) { return release(job, io, job.deploymentId, job.payload.to); },
    };

    /** Copia el artefacto a releases/<artefacto> y cambia current de forma atómica. */
    async function release(job, io, recordId, artifactOf) {
        const ws = getWorkspace(job.workspace);
        const target = ws.deploy.targetDir;
        const src = store.read(artifactOf);
        const at = new Date().toISOString();
        try {
            const m = manifestOf(store.artifactDir(artifactOf));
            if (m.sha256 !== src.prepare.artifact.sha256) throw new Error('El artefacto guardado no coincide con su hash: no se despliega.');
            const previous = currentRelease(target);
            if (job.type === 'deploy_release' && job.payload && 'expectedCurrent' in job.payload && (previous?.deploymentId || null) !== job.payload.expectedCurrent) throw new Error('El release activo cambió mientras se esperaba en cola.');
            fs.mkdirSync(path.join(target, 'releases'), { recursive: true });
            const dest = path.join(target, 'releases', artifactOf);
            if (!fs.existsSync(dest)) {
                const tmp = `${dest}.tmp-${process.pid}`;
                fs.rmSync(tmp, { recursive: true, force: true });
                copyDir(store.artifactDir(artifactOf), tmp);
                fs.writeFileSync(path.join(tmp, '.arrive-release.json'), JSON.stringify({ deploymentId: artifactOf, commit: src.commit, artifactSha256: m.sha256, releasedAt: at }, null, 2));
                fs.renameSync(tmp, dest);
            }
            const link = path.join(target, `current.tmp-${process.pid}`);
            fs.rmSync(link, { force: true });
            fs.symlinkSync(path.join('releases', artifactOf), link);
            fs.renameSync(link, path.join(target, 'current'));
            io.log(`[deploy] current → releases/${artifactOf} (${src.commit})`);
            store.writeStage(recordId, 'release', { ok: true, at, jobId: job.id, provider: ws.deploy.provider, target, releasePath: dest, deploymentId: artifactOf, commit: src.commit, artifactSha256: m.sha256, previous: previous?.deploymentId || null });
            return { code: 0, summary: { current: artifactOf, commit: src.commit, previous: previous?.deploymentId || null } };
        } catch (err) {
            store.writeStage(recordId, 'release', { ok: false, at, jobId: job.id, error: err.message });
            return { code: 1, error: err.message };
        }
    }

    return handlers;
}
