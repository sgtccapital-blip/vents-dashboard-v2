// Endpoint MCP (/mcp) y administración de agentes conectados (/api/agent-hub/*).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import express from 'express';
import { createHubStore } from './hubStore.js';
import { buildMcpServer } from './mcpServer.js';
import { createCaptureService } from './captureService.js';
import { registerOAuth } from './oauthService.js';
import { createPolicyStore, effectivePolicy, FUNCTIONS, normalizePolicy } from './permissions.js';
import { createWorkspaceRegistry } from './workspaces.js';
import { createJobQueue } from './jobs.js';
import { createDeployments } from './deployments.js';
import { createRecordsService } from './records.js';
import { createDecisionService } from './decisions.js';
import { integrationRegistry, availability } from './integrations.js';
import { createTransfers } from './transfers.js';
import { childEnv } from './runner.js';
import { redactDeep, refreshSecretEnv } from './redact.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const MCP_SERVER_VERSION = '2.0.0';

export function registerAgentHub(app, {
    dataDir, readDB, knowledge, studio, library, createEntity, updateEntity, archiveEntity, restoreEntity, addActivityFeed, office, isAdminRequest,
    rootDir = process.cwd(), protectedPaths = [], version = '0.0.0', runnerScript = path.join(here, '../../../scripts/arrive-runner.mjs'),
}) {
    refreshSecretEnv();
    const hub = createHubStore(dataDir);
    const publicBase = () => process.env.PUBLIC_URL || process.env.DASHBOARD_URL || 'http://localhost:8090';
    const sharedCapture = createCaptureService({ dir: `${dataDir}/captures`, readDB, createEntity, updateEntity });
    const captureFor = agent => createCaptureService({ dir: `${dataDir}/captures`, readDB, createEntity, updateEntity, actor: agent || 'ChatGPT' });
    app.use('/mcp/oauth', express.urlencoded({ extended: false }));
    const oauth = registerOAuth(app, { dir: `${dataDir}/oauth`, publicUrl: process.env.PUBLIC_URL || 'http://localhost:8090' });
    const policies = createPolicyStore(dataDir);
    const workspaces = createWorkspaceRegistry({
        dir: dataDir, protectedPaths,
        seed: fs.existsSync(path.join(rootDir, 'package.json')) ? [{ id: 'dashboard', name: 'ARRIVE Command Center', path: rootDir, description: 'Este dashboard (servidor, interfaz y servicios).' }] : [],
    });
    const queue = createJobQueue({ root: dataDir, workspaces });
    const deployments = createDeployments({ root: dataDir, workspaces, queue });
    const records = archiveEntity && restoreEntity ? createRecordsService({ readDB, createEntity, updateEntity, archiveEntity, restoreEntity, dir: dataDir }) : null;
    const decisions = records ? createDecisionService({ readDB, records, knowledge }) : null;
    const transfers = createTransfers({ dir: dataDir, capture: sharedCapture, publicBase });
    const integrations = integrationRegistry({ rootDir, oauth, hub, jobPaths: queue.paths, workspaces });

    const status = () => {
        const executor = queue.executor();
        return { version: MCP_SERVER_VERSION, dashboardVersion: version, executor, availability: availability({ executorOnline: executor.online }) };
    };
    const deps = { readDB, knowledge, studio, library, createEntity, updateEntity, addActivityFeed, hub, office, capture: sharedCapture, policies, workspaces, queue, deployments, records, decisions, transfers, integrations, status, oauth };

    // Quién llama: token de agente (cabecera o en la URL, para clientes como ChatGPT que no permiten cabeceras),
    // un token OAuth, el API_TOKEN de administración o la sesión del dashboard.
    function resolveCaller(req) {
        const bearer = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
        const candidate = req.params.token || bearer;
        const rec = hub.verify(candidate);
        if (rec) return { agent: rec.agent, scope: rec.scope, tokenId: rec.id, principal: rec.id, kind: 'token' };
        const oauthCaller = oauth.verify(bearer);
        if (oauthCaller) return { ...oauthCaller, principal: oauthCaller.tokenId, kind: 'oauth' };
        if (!req.params.token && isAdminRequest(req)) return { agent: req.headers['x-agent-name'] ? String(req.headers['x-agent-name']).slice(0, 40) : 'admin', scope: 'write', tokenId: null, principal: 'admin', admin: true, kind: 'admin' };
        return null;
    }

    const handleMcp = async (req, res) => {
        const ctx = resolveCaller(req);
        if (!ctx) {
            res.set('WWW-Authenticate', oauth.challenge);
            return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Token de agente inválido o revocado' }, id: null });
        }
        if (req.method !== 'POST') {
            // Modo sin sesión: no hay stream de notificaciones del servidor.
            return res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Usa POST' }, id: null });
        }
        const policy = effectivePolicy(ctx, policies);
        const server = buildMcpServer({ ...ctx, policy }, { ...deps, capture: captureFor(ctx.agent) });
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on('close', () => { transport.close(); server.close(); });
        try {
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error('[MCP] Error:', err.message);
            if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Error interno' }, id: null });
        }
    };

    // ─── Transferencias (antes de /mcp/:token para que no las capture) ───
    app.put('/mcp/uploads/:id', (req, res) => transfers.handlePut(req, res));
    app.get('/mcp/files/:id', (req, res) => {
        const signed = req.query.sig && transfers.verifyDownload(req.params.id, req.query.exp, req.query.sig);
        if (!signed && !resolveCaller(req)) return res.status(401).json({ error: 'No autorizado' });
        const result = sharedCapture.readFile(req.params.id);
        if (!result) return res.status(404).json({ error: 'Archivo inexistente' });
        res.set('Content-Type', result.meta.mime);
        res.set('Content-Disposition', `attachment; filename="${result.meta.name}"`);
        res.set('X-Content-SHA256', result.meta.sha256);
        return res.send(result.bytes);
    });

    app.all('/mcp', handleMcp);
    app.all('/mcp/:token', handleMcp);

    // Editor autenticado del dashboard, con el mismo versionado que la herramienta MCP.
    app.post('/api/project-brief/:id', (req, res) => {
        if (!isAdminRequest(req)) return res.status(401).json({ error: 'No autorizado' });
        try { res.json(captureFor('dashboard').upsertBrief({ project_id: req.params.id, content: req.body?.content, status: req.body?.status || 'draft' })); }
        catch (err) { res.status(400).json({ error: err.message }); }
    });

    // ─── Ingesta de la extensión de Chrome (ChatGPT → RAG) ───
    // Fuera de /api para autenticar con la llave del agente; Funnel no publica esta ruta (solo /mcp).
    const ingestAuth = (req, res, next) => {
        const ctx = resolveCaller(req);
        if (!ctx) return res.status(401).json({ error: 'Llave inválida o revocada. Crea una en Agent & RAG → Agentes conectados.' });
        const policy = effectivePolicy(ctx, policies);
        if (!['write', 'approve'].includes(policy.memory)) return res.status(403).json({ error: 'La llave necesita permiso de escritura en memoria' });
        req.agentCtx = ctx;
        next();
    };

    // Identidad de la cuenta de ChatGPT que reporta la extensión: aísla conversaciones de cuentas distintas.
    const identityFrom = src => {
        const accountId = typeof src?.accountId === 'string' ? src.accountId.slice(0, 200) : '';
        const workspaceId = typeof src?.workspaceId === 'string' ? src.workspaceId.slice(0, 200) : '';
        return accountId ? { accountId, workspaceId: workspaceId || 'personal' } : null;
    };

    const requireSyncIdentity = (req, res, next) => {
        const version = req.get('x-extension-version') || '';
        const [major, minor, patch] = version.split('.').map(Number);
        if (!(major > 1 || (major === 1 && (minor > 1 || (minor === 1 && patch >= 3))))) return next();
        const raw = req.method === 'GET' ? req.query : req.body?.identity;
        if (typeof raw?.accountId !== 'string' || !raw.accountId || typeof raw?.workspaceId !== 'string' || !raw.workspaceId) return res.status(400).json({ error: 'La extensión actual debe identificar cuenta y workspace antes de sincronizar' });
        next();
    };

    app.get('/ingest/chatgpt/state', ingestAuth, requireSyncIdentity, (req, res) => res.json(knowledge.syncState(identityFrom(req.query))));

    app.post('/ingest/chatgpt/conversations', ingestAuth, requireSyncIdentity, (req, res) => {
        const convs = req.body?.conversations;
        if (!Array.isArray(convs) || !convs.length) return res.status(400).json({ error: 'Falta conversations[]' });
        try {
            const summary = knowledge.ingestFromExtension(convs, { client: req.agentCtx.agent, version: req.get('x-extension-version') || '', identity: identityFrom(req.body?.identity) });
            hub.logActivity({ agent: req.agentCtx.agent, tokenId: req.agentCtx.tokenId, principal: req.agentCtx.principal, tool: 'chatgpt_sync', args: `${convs.length} conversaciones: ${summary.added} nuevas, ${summary.updated} actualizadas`, ok: true, ms: 0, write: true });
            res.json(summary);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/ingest/chatgpt/report', ingestAuth, requireSyncIdentity, (req, res) => {
        const { scanned = 0, changed = 0, sent = 0, error = '' } = req.body || {};
        res.json(knowledge.reportExtensionRun({ scanned, changed, sent, remaining: req.body?.remaining || 0, error: String(error).slice(0, 300), version: req.get('x-extension-version') || '', identity: identityFrom(req.body?.identity) }));
    });

    // ─── Ejecutor en proceso aparte ───
    let lastSpawn = 0;
    function ensureRunner() {
        const hb = queue.executor();
        if (hb.online || Date.now() - lastSpawn < 20000) return { started: false, executor: hb };
        lastSpawn = Date.now();
        const logFile = path.join(queue.paths.runnerDir, 'runner.log');
        const fd = fs.openSync(logFile, 'a');
        // Entorno mínimo: el ejecutor y sus trabajos no reciben las llaves del dashboard.
        const child = spawn(process.execPath, [runnerScript, '--root', dataDir], { cwd: rootDir, env: childEnv({ AGENT_HUB_DIR: dataDir }), detached: true, stdio: ['ignore', fd, fd] });
        child.unref();
        fs.closeSync(fd);
        return { started: true, pid: child.pid };
    }
    const runnerWatch = setInterval(() => { if (process.env.RUNNER_AUTOSTART !== '0') ensureRunner(); }, 60000);
    runnerWatch.unref();

    // ─── Administración (detrás del login del dashboard) ───
    const admin = (handler) => async (req, res) => {
        if (!isAdminRequest(req)) return res.status(401).json({ error: 'No autorizado' });
        try { res.json(redactDeep(await handler(req, res))); }
        catch (err) { res.status(err.status || (err.code === 'NOT_FOUND' ? 404 : 400)).json({ error: err.message, code: err.code || null, details: err.details || null }); }
    };
    const adminMeta = req => ({ agent: 'dashboard', principal: 'admin', operationId: `admin-${Date.now().toString(36)}`, idempotencyKey: req.body?.idempotency_key });

    app.get('/api/agent-hub/info', (req, res) => {
        const tools = () => {
            const s = buildMcpServer({ agent: 'info', scope: 'write', tokenId: null, principal: 'admin', admin: true, policy: effectivePolicy({ admin: true }, policies) }, deps);
            return Object.entries(s._registeredTools).map(([name, t]) => ({ name, title: t.title, description: t.description, write: !t.annotations?.readOnlyHint, destructive: !!t.annotations?.destructiveHint, permission: t._meta?.['arrive/permission'] || null }));
        };
        res.json({
            mcpPath: '/mcp',
            version: MCP_SERVER_VERSION,
            // URL local que ven los agentes de esta Mac; la pública (para ChatGPT y agentes en la nube) va en PUBLIC_URL.
            localUrl: `${req.protocol}://${req.get('host')}/mcp`,
            publicUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL.replace(/\/$/, '')}/mcp` : '',
            tools: tools(),
        });
    });

    app.get('/api/agent-hub/tokens', (req, res) => res.json(hub.list()));

    app.get('/api/agent-hub/oauth-clients', (req, res) => {
        if (!isAdminRequest(req)) return res.status(401).json({ error: 'No autorizado' });
        res.json(oauth.list());
    });
    app.delete('/api/agent-hub/oauth-clients/:id', (req, res) => {
        if (!isAdminRequest(req)) return res.status(401).json({ error: 'No autorizado' });
        if (!oauth.revoke(req.params.id)) return res.status(404).json({ error: 'Cliente inexistente' });
        res.json({ ok: true });
    });

    app.post('/api/agent-hub/tokens', (req, res) => {
        try {
            const created = hub.createToken(req.body || {});
            // Permisos por función opcionales al crear la llave.
            if (req.body?.policy) created.policy = policies.set(created.record.id, normalizePolicy(req.body.policy), 'dashboard');
            res.status(201).json(created);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    app.delete('/api/agent-hub/tokens/:id', (req, res) => {
        if (!hub.revoke(req.params.id)) return res.status(404).json({ error: 'Token no encontrado' });
        policies.revoke(req.params.id, 'dashboard');
        res.json({ ok: true });
    });

    app.get('/api/agent-hub/activity', (req, res) => {
        res.json(hub.activity({ limit: Math.min(Number(req.query.limit) || 100, 500), agent: req.query.agent || undefined, failedOnly: req.query.failed === '1', principal: req.query.principal || undefined }));
    });

    // Agentes con sus permisos efectivos (llaves y clientes OAuth).
    const principals = () => {
        const rows = [
            ...hub.list().map(t => ({ principal: t.id, kind: 'token', name: t.name, agent: t.agent, scope: t.scope, revoked: t.revoked, lastUsedAt: t.lastUsedAt, calls: t.calls || 0, createdAt: t.createdAt })),
            ...oauth.list().map(c => ({ principal: `oauth:${c.id}`, kind: 'oauth', name: c.name, agent: 'ChatGPT', scope: 'write', revoked: c.revoked, createdAt: c.createdAt })),
        ];
        const withPolicy = rows.map(r => ({ ...r, policy: policies.get(r.principal), effective: effectivePolicy({ agent: r.agent, scope: r.scope, principal: r.principal, tokenId: r.principal }, policies) }));
        // Agentes internos de AI Office (cliente MCP en proceso).
        let officeAgents = [];
        try { officeAgents = (office?.allAgents?.(readDB()) || []).filter(a => a.kind === 'internal'); } catch { /* sin oficina */ }
        const officeRows = officeAgents.map(a => ({ principal: `office:${a.id}`, kind: 'office', name: a.name || a.id, agent: a.name || a.id, scope: 'office' }));
        for (const principal of Object.keys(policies.all?.() || {})) if (principal.startsWith('office:') && !officeRows.some(r => r.principal === principal)) officeRows.push({ principal, kind: 'office', name: principal.slice(7), agent: principal.slice(7), scope: 'office' });
        return [...withPolicy, ...officeRows.map(r => ({ ...r, revoked: !!policies.get(r.principal)?.revoked, policy: policies.get(r.principal), effective: internalPolicy(r.principal) }))];
    };

    app.get('/api/agent-hub/ops/overview', admin(() => {
        const db = readDB();
        let costs = null;
        try { const s = office?.computeStats?.(db, office.allAgents(db)); if (s) costs = { totals: s.totals, byModel: s.byModel, source: 'AI Office: costo informado por el proveedor cuando existe; si no, estimado por tokens' }; } catch { /* sin métricas */ }
        return {
            ...status(),
            functions: FUNCTIONS,
            principals: principals(),
            workspaces: workspaces.list(),
            jobs: queue.list({ limit: 40 }),
            patches: workspaces.listPatches({ limit: 30 }),
            deployments: deployments.list({ limit: 30 }),
            integrations: integrations.list(),
            errors: hub.activity({ limit: 40, failedOnly: true }),
            costs,
            decisionsPending: decisions ? decisions.list({ status: 'proposed' }).decisions : [],
        };
    }));

    app.put('/api/agent-hub/policies/:principal', admin(req => policies.set(req.params.principal, req.body || {}, 'dashboard')));
    app.post('/api/agent-hub/policies/:principal/revoke', admin(req => {
        const p = req.params.principal;
        if (p.startsWith('oauth:')) oauth.revoke(p.slice(6));
        else if (!p.startsWith('office:')) hub.revoke(p);
        return policies.revoke(p, 'dashboard');
    }));
    app.delete('/api/agent-hub/policies/:principal', admin(req => ({ ok: policies.reset(req.params.principal) })));

    app.get('/api/agent-hub/workspaces', admin(() => workspaces.list()));
    app.put('/api/agent-hub/workspaces/:id', admin(req => workspaces.upsert({ ...(req.body || {}), id: req.params.id })));
    app.delete('/api/agent-hub/workspaces/:id', admin(req => ({ ok: workspaces.remove(req.params.id) })));
    app.get('/api/agent-hub/workspaces/:id/status', admin(req => workspaces.gitStatus(req.params.id)));

    app.post('/api/agent-hub/jobs', admin(req => queue.start({ type: req.body?.type, workspace: req.body?.workspace, script: req.body?.script, args: req.body?.args || [] }, adminMeta(req))));
    app.get('/api/agent-hub/jobs/:id', admin(req => queue.get(req.params.id)));
    app.get('/api/agent-hub/jobs/:id/logs', admin(req => queue.logs(req.params.id, { tail: true, limit: 128 * 1024 })));
    app.post('/api/agent-hub/jobs/:id/cancel', admin(req => queue.cancel(req.params.id, 'dashboard')));
    app.post('/api/agent-hub/runner/start', admin(() => ensureRunner()));
    app.get('/api/agent-hub/patches/:id', admin(req => workspaces.getPatch(req.params.id)));
    app.get('/api/agent-hub/deployments/:id', admin(req => deployments.get(req.params.id)));

    if (decisions) {
        app.post('/api/agent-hub/decisions/:id/approve', admin(req => decisions.approve({ id: req.params.id, supersede: req.body?.supersede || [], note: req.body?.note || '' }, { agent: 'dashboard', principal: 'admin' })));
        app.post('/api/agent-hub/decisions/:id/reject', admin(req => decisions.reject({ id: req.params.id, reason: req.body?.reason || '' }, { agent: 'dashboard', principal: 'admin' })));
    }

    // ─── Agentes internos de AI Office: cliente MCP en proceso con los mismos permisos y auditoría ───
    // principal "office:<agentId>". Sin política guardada: data/documents/memory en lectura; code/exec/deploy cerrados.
    // Una política guardada en el panel (Permisos) puede ampliarlo; revocarla lo corta en la siguiente conexión.
    const OFFICE_PRINCIPAL = /^office:[a-z0-9][a-z0-9_.-]{0,79}$/i;
    function internalPolicy(principal) {
        const saved = policies.get(principal);
        const usable = saved && !(saved.expiresAt && Date.parse(saved.expiresAt) < Date.now());
        return effectivePolicy({ agent: principal, scope: usable ? 'write' : 'read', principal, tokenId: principal }, policies);
    }
    async function connectInternal({ agent, principal }) {
        if (!OFFICE_PRINCIPAL.test(String(principal || ''))) throw Object.assign(new Error('principal debe ser office:<agentId>'), { status: 400 });
        const name = String(agent || principal).slice(0, 60);
        const policy = internalPolicy(principal);
        const ctx = { agent: name, scope: policy.clientScope, tokenId: null, principal, kind: 'office', policy };
        const server = buildMcpServer(ctx, { ...deps, capture: captureFor(name) });
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        await server.connect(serverSide);
        const client = new Client({ name: `office-${name}`, version: MCP_SERVER_VERSION });
        await client.connect(clientSide);
        return { client, server, policy, close: async () => { await client.close().catch(() => {}); await server.close().catch(() => {}); } };
    }

    return Object.assign(hub, { ensureRunner, queue, workspaces, policies, deployments, records, decisions, status, connectInternal, internalPolicy });
}
