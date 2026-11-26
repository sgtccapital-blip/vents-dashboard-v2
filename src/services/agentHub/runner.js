// Ejecutor de trabajos: un proceso aparte del servidor MCP (scripts/arrive-runner.mjs).
// Reclama trabajos de la cola en disco, los ejecuta sin shell con entorno mínimo, límites de tiempo
// y de log, atiende cancelaciones, registra artefactos con hash y deja un latido para que el gateway
// sepa si está vivo. Al arrancar marca como "interrumpidos" los trabajos que quedaron a medias.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { jobPaths, readHeartbeat, writeJsonAtomic, FINAL, HEARTBEAT_STALE_MS } from './jobs.js';
import { redactText } from './redact.js';

export const RUNNER_VERSION = '1.0.0';
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const killGroup = (pid, sig) => { try { process.kill(-pid, sig); } catch { try { process.kill(pid, sig); } catch { /* ya terminó */ } } };

/** Entorno mínimo para los procesos: sin las llaves del dashboard. */
export function childEnv(extra = {}) {
    const keep = ['HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TMPDIR'];
    const env = Object.fromEntries(keep.filter(k => process.env[k]).map(k => [k, process.env[k]]));
    const pathParts = [path.dirname(process.execPath), ...(process.env.PATH || '/usr/local/bin:/usr/bin:/bin').split(':'), '/opt/homebrew/bin', '/usr/local/bin'];
    env.PATH = [...new Set(pathParts)].join(':');
    return { ...env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb', npm_config_update_notifier: 'false', npm_config_fund: 'false', ...extra };
}

/** Manifiesto de una carpeta de artefactos: archivos, tamaños y hashes, más un hash global. */
export function manifestOf(dir, { maxFiles = 20000 } = {}) {
    const files = [];
    const walk = (d, prefix) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            if (files.length >= maxFiles) return;
            const abs = path.join(d, e.name);
            if (e.isDirectory()) walk(abs, `${prefix}${e.name}/`);
            else if (e.isFile()) { const buf = fs.readFileSync(abs); files.push({ path: `${prefix}${e.name}`, size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') }); }
        }
    };
    walk(dir, '');
    const sha256 = crypto.createHash('sha256').update(files.map(f => `${f.path}\0${f.sha256}`).join('\n')).digest('hex');
    return { files: files.length, bytes: files.reduce((a, f) => a + f.size, 0), sha256, entries: files };
}

const TEST_STAT = /^(?:#|ℹ)\s+(tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s+([\d.]+)/;

export function createRunner({ root, handlers = {}, maxConcurrent = 2, pollMs = 400, log = console }) {
    const paths = jobPaths(root);
    const runnerId = `runner-${os.hostname().split('.')[0]}-${process.pid}-${crypto.randomBytes(2).toString('hex')}`;
    const startedAt = new Date().toISOString();
    const active = new Map(); // jobId → { child, job, cancelled, timedOut }
    let timer = null, hbTimer = null, stopping = false;

    const save = job => writeJsonAtomic(paths.jobFile(job.id), job);

    function heartbeat() {
        writeJsonAtomic(paths.heartbeat, { runnerId, pid: process.pid, host: os.hostname(), startedAt, at: new Date().toISOString(), version: RUNNER_VERSION, active: [...active.keys()], maxConcurrent });
    }

    /** Un único ejecutor por carpeta de datos. */
    function acquireLock() {
        const hb = readHeartbeat(paths);
        const lock = readJson(paths.lock);
        if (lock && lock.pid !== process.pid && alive(lock.pid) && hb.online && hb.pid === lock.pid) return false;
        writeJsonAtomic(paths.lock, { pid: process.pid, runnerId, at: startedAt });
        return true;
    }

    /** Lo que quedó corriendo o reclamado de un ejecutor anterior. */
    function recover() {
        const found = [];
        for (const d of fs.readdirSync(paths.jobsDir).filter(x => x.startsWith('job-'))) {
            const job = readJson(paths.jobFile(d));
            if (!job) continue;
            const dir = paths.jobDir(d);
            if (job.status === 'running' && job.runnerId !== runnerId) {
                if (job.pid && alive(job.pid)) killGroup(job.pid, 'SIGKILL');
                Object.assign(job, { status: 'interrupted', finishedAt: new Date().toISOString(), error: `El ejecutor ${job.runnerId || ''} se detuvo mientras corría (reinicio o apagado). No se reintenta solo para no repetir efectos.`, progress: { ...job.progress, stage: 'interrumpido' } });
                save(job);
                fs.appendFileSync(paths.logFile(d), `\n[arrive-runner] Trabajo interrumpido: el ejecutor anterior se detuvo. Detectado por ${runnerId}.\n`);
                found.push(job.id);
            } else if (job.status === 'queued' && fs.existsSync(path.join(dir, 'claimed'))) {
                // Reclamado pero nunca empezó: es seguro devolverlo a la cola.
                fs.renameSync(path.join(dir, 'claimed'), path.join(dir, 'queued'));
            }
        }
        if (found.length) log.warn?.(`[runner] ${found.length} trabajo(s) marcados como interrumpidos: ${found.join(', ')}`);
        return found;
    }

    function claimNext() {
        const queued = fs.readdirSync(paths.jobsDir).filter(d => d.startsWith('job-') && fs.existsSync(path.join(paths.jobDir(d), 'queued'))).sort();
        for (const id of queued) {
            const dir = paths.jobDir(id);
            try { fs.renameSync(path.join(dir, 'queued'), path.join(dir, 'claimed')); } catch { continue; }
            const job = readJson(paths.jobFile(id));
            if (!job || job.status !== 'queued') continue;
            return job;
        }
        return null;
    }

    /** Ejecuta un comando como parte de un trabajo; resuelve con { code, signal }. */
    function exec(job, state, argv, { cwd, timeoutMs, onLine } = {}) {
        return new Promise(resolve => {
            const logFile = paths.logFile(job.id);
            fs.appendFileSync(logFile, `$ ${argv.join(' ')}\n`);
            const child = spawn(argv[0], argv.slice(1), { cwd: cwd || job.cwd, env: childEnv(job.env || {}), detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
            state.child = child;
            job.pid = child.pid;
            save(job);
            let written = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
            let truncatedNoted = false;
            const buffers = { out: '', err: '' };
            const emit = line => {
                onLine?.(line);
                const safe = `${redactText(line)}\n`;
                if (written + safe.length > job.maxLogBytes) {
                    if (!truncatedNoted) { fs.appendFileSync(logFile, '[arrive-runner] Log truncado: se alcanzó el límite.\n'); truncatedNoted = true; job.logTruncated = true; }
                    return;
                }
                fs.appendFileSync(logFile, safe);
                written += safe.length;
            };
            const feed = key => chunk => {
                buffers[key] += chunk.toString('utf8');
                const lines = buffers[key].split('\n');
                buffers[key] = lines.pop();
                lines.forEach(emit);
            };
            child.stdout.on('data', feed('out'));
            child.stderr.on('data', feed('err'));
            const killer = setTimeout(() => {
                state.timedOut = true;
                killGroup(child.pid, 'SIGTERM');
                setTimeout(() => killGroup(child.pid, 'SIGKILL'), 5000).unref();
            }, timeoutMs);
            child.on('error', err => { emit(`[arrive-runner] No se pudo ejecutar ${argv[0]}: ${err.message}`); });
            child.on('close', (code, signal) => {
                clearTimeout(killer);
                for (const k of ['out', 'err']) if (buffers[k]) emit(buffers[k]);
                state.child = null;
                resolve({ code, signal });
            });
        });
    }

    async function gitInfo(cwd) {
        const run = args => new Promise(res => { const c = spawn('git', args, { cwd, env: childEnv() }); let o = ''; c.stdout.on('data', d => { o += d; }); c.on('close', code => res(code === 0 ? o.trim() : null)); c.on('error', () => res(null)); });
        const commit = await run(['rev-parse', 'HEAD']);
        const status = await run(['status', '--porcelain']);
        return { commit, dirty: status === null ? null : status.length > 0 };
    }

    async function runJob(job) {
        const state = { child: null, cancelled: false, timedOut: false };
        active.set(job.id, state);
        Object.assign(job, { status: 'running', startedAt: new Date().toISOString(), runnerId, progress: { percent: null, stage: 'ejecutando', stats: {} } });
        save(job);
        heartbeat();
        const timeoutMs = job.timeoutSec * 1000;
        const cancelWatch = setInterval(() => {
            if (!state.cancelled && fs.existsSync(path.join(paths.jobDir(job.id), 'cancel'))) {
                state.cancelled = true;
                if (state.child) { killGroup(state.child.pid, 'SIGTERM'); setTimeout(() => state.child && killGroup(state.child.pid, 'SIGKILL'), 3000).unref(); }
            }
        }, 300);
        let lastSave = 0;
        const progress = patch => { job.progress = { ...job.progress, ...patch }; if (Date.now() - lastSave > 800) { lastSave = Date.now(); save(job); } };
        const io = {
            exec: (argv, opts = {}) => exec(job, state, argv, { timeoutMs, ...opts }),
            log: line => fs.appendFileSync(paths.logFile(job.id), `${redactText(line)}\n`),
            progress, state, root, paths,
        };
        try {
            Object.assign(job, await gitInfo(job.cwd));
            save(job);
            let outcome;
            if (handlers[job.type]) {
                outcome = await handlers[job.type](job, io);
            } else {
                const stats = {};
                let okCount = 0, failCount = 0;
                const { code, signal } = await io.exec(job.command, {
                    onLine: line => {
                        const m = line.trim().match(TEST_STAT);
                        if (m) stats[m[1]] = Number(m[2]);
                        if (/^ok \d+|^\s*✔/.test(line)) okCount++;
                        if (/^not ok \d+|^\s*✖/.test(line)) failCount++;
                        if (okCount + failCount) progress({ stats: { ...stats, passedSoFar: okCount, failedSoFar: failCount } });
                    },
                });
                outcome = { code, signal, summary: Object.keys(stats).length ? stats : (okCount + failCount ? { pass: okCount, fail: failCount } : null) };
            }
            job.exitCode = outcome.code ?? null;
            job.signal = outcome.signal ?? null;
            job.summary = outcome.summary ?? job.summary;
            if (outcome.result) job.result = outcome.result;
            if (state.cancelled) job.status = 'cancelled';
            else if (state.timedOut) { job.status = 'timed_out'; job.error = `Superó el límite de ${job.timeoutSec}s`; }
            else job.status = outcome.code === 0 ? 'succeeded' : 'failed';
            if (outcome.error && job.status === 'failed') job.error = redactText(outcome.error);
            if (job.status === 'succeeded' && job.artifactDirs?.length) {
                job.artifacts = [];
                for (const rel of job.artifactDirs) {
                    const abs = path.resolve(job.cwd, rel);
                    if (!abs.startsWith(path.resolve(job.cwd) + path.sep) || !fs.existsSync(abs)) continue;
                    const m = manifestOf(abs);
                    writeJsonAtomic(path.join(paths.jobDir(job.id), `artifact-${rel.replace(/[^\w.-]+/g, '_')}.json`), m);
                    job.artifacts.push({ path: rel, files: m.files, bytes: m.bytes, sha256: m.sha256 });
                }
            }
        } catch (err) {
            job.status = state.cancelled ? 'cancelled' : 'failed';
            job.error = redactText(err.message);
            io.log(`[arrive-runner] Error: ${err.message}`);
        } finally {
            clearInterval(cancelWatch);
            job.finishedAt = new Date().toISOString();
            job.progress = { ...job.progress, percent: 100, stage: job.status };
            job.pid = null;
            save(job);
            active.delete(job.id);
            heartbeat();
        }
        return job;
    }

    function tick() {
        if (stopping) return;
        while (active.size < maxConcurrent) {
            const job = claimNext();
            if (!job) break;
            runJob(job).catch(err => log.error?.('[runner]', err));
        }
    }

    function start() {
        if (!acquireLock()) { log.warn?.('[runner] Ya hay otro ejecutor activo para esta carpeta; salgo.'); return false; }
        heartbeat();
        recover();
        hbTimer = setInterval(heartbeat, Math.min(3000, HEARTBEAT_STALE_MS / 3));
        timer = setInterval(tick, pollMs);
        tick();
        return true;
    }

    /** Parada ordenada: deja de reclamar y espera a lo que está corriendo (o lo corta). */
    async function stop({ kill = false } = {}) {
        stopping = true;
        clearInterval(timer); clearInterval(hbTimer);
        if (kill) for (const s of active.values()) if (s.child) killGroup(s.child.pid, 'SIGTERM');
        while (active.size) await new Promise(r => setTimeout(r, 100));
        try { if (readJson(paths.lock)?.pid === process.pid) fs.unlinkSync(paths.lock); } catch { /* nada */ }
        try { fs.unlinkSync(paths.heartbeat); } catch { /* nada */ }
    }

    return { start, stop, recover, tick, runnerId, active, isFinal: s => FINAL.includes(s) };
}
