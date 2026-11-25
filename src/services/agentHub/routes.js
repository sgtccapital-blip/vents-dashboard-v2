// Endpoint MCP (/mcp) y administración de agentes conectados (/api/agent-hub/*).
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createHubStore } from './hubStore.js';
import { buildMcpServer } from './mcpServer.js';

export function registerAgentHub(app, { dataDir, readDB, knowledge, studio, library, createEntity, updateEntity, addActivityFeed, office, isAdminRequest }) {
    const hub = createHubStore(dataDir);
    const deps = { readDB, knowledge, studio, library, createEntity, updateEntity, addActivityFeed, hub, office };

    // Quién llama: token de agente (cabecera o en la URL, para clientes como ChatGPT que no permiten cabeceras),
    // el API_TOKEN de administración o la sesión del dashboard.
    function resolveCaller(req) {
        const bearer = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
        const candidate = req.params.token || bearer;
        const rec = hub.verify(candidate);
        if (rec) return { agent: rec.agent, scope: rec.scope, tokenId: rec.id };
        if (!req.params.token && isAdminRequest(req)) return { agent: req.headers['x-agent-name'] ? String(req.headers['x-agent-name']).slice(0, 40) : 'admin', scope: 'write', tokenId: null };
        return null;
    }

    const handleMcp = async (req, res) => {
        const ctx = resolveCaller(req);
        if (!ctx) {
            res.set('WWW-Authenticate', 'Bearer realm="arrive-command-center"');
            return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Token de agente inválido o revocado' }, id: null });
        }
        if (req.method !== 'POST') {
            // Modo sin sesión: no hay stream de notificaciones del servidor.
            return res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Usa POST' }, id: null });
        }
        const server = buildMcpServer(ctx, deps);
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
    app.all('/mcp', handleMcp);
    app.all('/mcp/:token', handleMcp);

    // ─── Ingesta de la extensión de Chrome (ChatGPT → RAG) ───
    // Fuera de /api para autenticar con la llave del agente; Funnel no publica esta ruta (solo /mcp).
    const ingestAuth = (req, res, next) => {
        const ctx = resolveCaller(req);
        if (!ctx) return res.status(401).json({ error: 'Llave inválida o revocada. Crea una en Agent & RAG → Agentes conectados.' });
        if (ctx.scope !== 'write') return res.status(403).json({ error: 'La llave necesita permiso de escritura' });
        req.agentCtx = ctx;
        next();
    };

    app.get('/ingest/chatgpt/state', ingestAuth, (req, res) => res.json(knowledge.syncState()));

    app.post('/ingest/chatgpt/conversations', ingestAuth, (req, res) => {
        const convs = req.body?.conversations;
        if (!Array.isArray(convs) || !convs.length) return res.status(400).json({ error: 'Falta conversations[]' });
        try {
            const summary = knowledge.ingestFromExtension(convs, { client: req.agentCtx.agent, version: req.get('x-extension-version') || '' });
            hub.logActivity({ agent: req.agentCtx.agent, tokenId: req.agentCtx.tokenId, tool: 'chatgpt_sync', args: `${convs.length} conversaciones: ${summary.added} nuevas, ${summary.updated} actualizadas`, ok: true, ms: 0, write: true });
            res.json(summary);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/ingest/chatgpt/report', ingestAuth, (req, res) => {
        const { scanned = 0, changed = 0, sent = 0, error = '' } = req.body || {};
        res.json(knowledge.reportExtensionRun({ scanned, changed, sent, remaining: req.body?.remaining || 0, error: String(error).slice(0, 300), version: req.get('x-extension-version') || '' }));
    });

    // ─── Administración (detrás del login del dashboard) ───
    app.get('/api/agent-hub/info', (req, res) => {
        const tools = (scope) => {
            const s = buildMcpServer({ agent: 'info', scope, tokenId: null }, deps);
            return Object.entries(s._registeredTools).map(([name, t]) => ({ name, title: t.title, description: t.description, write: !t.annotations?.readOnlyHint }));
        };
        res.json({
            mcpPath: '/mcp',
            // URL local que ven los agentes de esta Mac; la pública (para ChatGPT y agentes en la nube) va en PUBLIC_URL.
            localUrl: `${req.protocol}://${req.get('host')}/mcp`,
            publicUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL.replace(/\/$/, '')}/mcp` : '',
            tools: tools('write'),
        });
    });

    app.get('/api/agent-hub/tokens', (req, res) => res.json(hub.list()));

    app.post('/api/agent-hub/tokens', (req, res) => {
        try {
            res.status(201).json(hub.createToken(req.body || {}));
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    app.delete('/api/agent-hub/tokens/:id', (req, res) => {
        if (!hub.revoke(req.params.id)) return res.status(404).json({ error: 'Token no encontrado' });
        res.json({ ok: true });
    });

    app.get('/api/agent-hub/activity', (req, res) => {
        res.json(hub.activity({ limit: Math.min(Number(req.query.limit) || 100, 500), agent: req.query.agent || undefined }));
    });

    return hub;
}
