/**
 * Puente con OpenClaw en el Mac (agente Bart).
 *
 * El gateway de OpenClaw NO se expone a internet (su API HTTP equivale a acceso de operador).
 * En su lugar, el Mac corre `bart-bridge`, que se conecta HACIA el dashboard:
 *   1. GET  /api/bridge/next   (long-poll, con API_TOKEN) → recibe un mensaje pendiente
 *   2. lo envía a su gateway local (127.0.0.1:18789/v1/chat/completions, model openclaw/<bart>)
 *   3. POST /api/bridge/reply  → devuelve la respuesta de Bart
 * La sección "OpenClaw Master Orchestrator" del dashboard usa askBridge() para hablar con él.
 */
import crypto from 'crypto';

const ONLINE_WINDOW_MS = 45_000;   // sin noticias del Mac en 45 s = desconectado
const POLL_HOLD_MS = 25_000;       // cuánto espera cada long-poll antes de responder 204
const ANSWER_TIMEOUT_MS = 170_000; // máximo para que Bart responda

export function registerBridgeRoutes(app, { apiTokenConfigured, publicDir }) {
    const queue = [];              // trabajos esperando a que el Mac los recoja
    const waiters = new Set();     // long-polls abiertos del Mac
    const pending = new Map();     // id → { resolve, reject, timer }
    const bridge = { lastSeen: 0, agentId: null, agentName: null, gateway: null, version: null, host: null };

    const isBridge = (req) => req.user === 'API';
    const online = () => Date.now() - bridge.lastSeen < ONLINE_WINDOW_MS;

    const deliver = () => {
        while (queue.length && waiters.size) {
            const res = waiters.values().next().value;
            waiters.delete(res);
            const job = queue.shift();
            res.json({ job });
        }
    };

    /** Envía un mensaje a Bart en el Mac y espera su respuesta. Lanza si el Mac no está conectado. */
    function askBridge({ prompt, user }) {
        if (!online()) return Promise.reject(Object.assign(new Error('Tu Mac no está conectado'), { offline: true }));
        const job = { id: crypto.randomUUID(), prompt, user: user || 'team', createdAt: new Date().toISOString() };
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pending.delete(job.id);
                const i = queue.indexOf(job);
                if (i >= 0) queue.splice(i, 1);
                reject(new Error('Bart no respondió a tiempo desde el Mac'));
            }, ANSWER_TIMEOUT_MS);
            pending.set(job.id, { resolve, reject, timer });
            queue.push(job);
            deliver();
        });
    }

    const status = () => ({
        online: online(),
        lastSeen: bridge.lastSeen ? new Date(bridge.lastSeen).toISOString() : null,
        agentId: bridge.agentId,
        agentName: bridge.agentName,
        gateway: bridge.gateway,
        version: bridge.version,
        host: bridge.host,
        apiTokenConfigured,
        queued: queue.length,
    });

    // ── Lado del Mac (requiere API_TOKEN) ──
    app.get('/api/bridge/next', (req, res) => {
        if (!isBridge(req)) return res.status(403).json({ error: 'El puente usa el API_TOKEN del servidor' });
        bridge.lastSeen = Date.now();
        bridge.agentId = String(req.query.agentId || bridge.agentId || '') || null;
        bridge.agentName = String(req.query.agentName || bridge.agentName || '') || null;
        bridge.gateway = String(req.query.gateway || 'unknown');
        bridge.version = String(req.query.version || '') || null;
        bridge.host = String(req.query.host || '') || null;

        if (queue.length) return res.json({ job: queue.shift() });
        waiters.add(res);
        const timer = setTimeout(() => {
            if (waiters.delete(res)) res.status(204).end();
        }, POLL_HOLD_MS);
        req.on('close', () => { clearTimeout(timer); waiters.delete(res); });
    });

    app.post('/api/bridge/reply', (req, res) => {
        if (!isBridge(req)) return res.status(403).json({ error: 'El puente usa el API_TOKEN del servidor' });
        bridge.lastSeen = Date.now();
        const { id, reply, error, model } = req.body || {};
        const entry = pending.get(id);
        if (!entry) return res.status(404).json({ error: 'Trabajo desconocido o vencido' });
        pending.delete(id);
        clearTimeout(entry.timer);
        if (error) entry.reject(new Error(String(error)));
        else entry.resolve({ reply: String(reply || ''), model: model || null });
        res.json({ success: true });
    });

    // ── Lado del dashboard ──
    app.get('/api/bridge/status', (req, res) => res.json(status()));

    app.post('/api/bart/orchestrator', async (req, res) => {
        const prompt = String(req.body?.prompt || '').trim();
        if (!prompt) return res.status(400).json({ error: 'Mensaje vacío' });
        try {
            const user = req.user && req.user !== 'API' ? req.user : 'team';
            const { reply, model } = await askBridge({ prompt, user });
            res.json({ reply, via: 'openclaw', model, agent: bridge.agentName || bridge.agentId, provider: `${bridge.agentName || 'Bart'} · desde tu Mac` });
        } catch (err) {
            res.status(err.offline ? 409 : 504).json({ error: err.message, offline: !!err.offline, status: status() });
        }
    });

    // Instalador para el Mac: los archivos no llevan secretos (el token lo pega el usuario)
    app.get('/bridge/:file', (req, res) => {
        const allowed = { 'setup-mac.sh': 'text/x-shellscript', 'bart-bridge.mjs': 'text/javascript', 'SKILL.md': 'text/markdown' };
        const type = allowed[req.params.file];
        if (!type) return res.status(404).end();
        res.type(type).sendFile(req.params.file, { root: publicDir });
    });

    return { askBridge, bridgeStatus: status };
}
