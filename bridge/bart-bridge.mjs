#!/usr/bin/env node
/**
 * bart-bridge — conecta el Command Center (en la nube) con Bart en tu OpenClaw local.
 *
 * Se conecta HACIA el dashboard (nunca abre puertos en tu Mac):
 *   dashboard  ──(long-poll /api/bridge/next)──▶  este puente  ──▶  OpenClaw 127.0.0.1:18789
 *   dashboard  ◀──(POST /api/bridge/reply)─────  este puente  ◀──  respuesta de Bart
 *
 * Configuración: ~/.bart-bridge/config.json (la crea setup-mac.sh) o variables de entorno:
 *   DASHBOARD_URL, API_TOKEN, OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN, OPENCLAW_AGENT_ID, OPENCLAW_AGENT_NAME
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const VERSION = '1.0.0';
const CONFIG_PATH = process.env.BART_BRIDGE_CONFIG || path.join(os.homedir(), '.bart-bridge', 'config.json');

function loadConfig() {
    let file = {};
    try { file = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { /* sin archivo: solo env */ }
    const cfg = {
        dashboardUrl: (process.env.DASHBOARD_URL || file.dashboardUrl || '').replace(/\/$/, ''),
        apiToken: process.env.API_TOKEN || file.apiToken || '',
        gatewayUrl: (process.env.OPENCLAW_GATEWAY_URL || file.gatewayUrl || 'http://127.0.0.1:18789').replace(/\/$/, ''),
        gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || file.gatewayToken || '',
        agentId: process.env.OPENCLAW_AGENT_ID || file.agentId || 'main',
        agentName: process.env.OPENCLAW_AGENT_NAME || file.agentName || 'Bart',
        answerTimeoutMs: Number(file.answerTimeoutMs || 160_000),
    };
    const missing = ['dashboardUrl', 'apiToken'].filter(k => !cfg[k]);
    if (missing.length) {
        console.error(`❌ Falta configuración: ${missing.join(', ')}. Corre setup-mac.sh o define DASHBOARD_URL y API_TOKEN.`);
        process.exit(1);
    }
    return cfg;
}

const cfg = loadConfig();
const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithTimeout(url, opts = {}, ms = 30_000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

const gatewayHeaders = () => ({
    'Content-Type': 'application/json',
    ...(cfg.gatewayToken ? { Authorization: `Bearer ${cfg.gatewayToken}` } : {}),
});

// ¿Responde el gateway y existe el agente? (GET /v1/models lista openclaw/<agentId>)
let gatewayState = 'unknown';
async function checkGateway() {
    try {
        const r = await fetchWithTimeout(`${cfg.gatewayUrl}/v1/models`, { headers: gatewayHeaders() }, 5000);
        if (r.status === 401 || r.status === 403) return (gatewayState = 'auth_error');
        if (r.status === 404) return (gatewayState = 'endpoint_disabled');
        if (!r.ok) return (gatewayState = `http_${r.status}`);
        const data = await r.json().catch(() => ({}));
        const ids = (data.data || []).map(m => m.id);
        const wanted = [`openclaw/${cfg.agentId}`, `openclaw:${cfg.agentId}`];
        gatewayState = ids.length === 0 || ids.some(id => wanted.includes(id)) || cfg.agentId === 'main' ? 'ok' : 'agent_missing';
    } catch {
        gatewayState = 'down';
    }
    return gatewayState;
}

async function askBart(job) {
    const r = await fetchWithTimeout(`${cfg.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { ...gatewayHeaders(), 'x-openclaw-message-channel': 'command-center' },
        body: JSON.stringify({
            model: `openclaw/${cfg.agentId}`,
            // Sesión estable por persona del equipo: Bart recuerda la conversación de cada uno
            user: `command-center:${job.user || 'team'}`,
            messages: [{ role: 'user', content: `[Command Center · ${job.user || 'equipo'}] ${job.prompt}` }],
            stream: false,
        }),
    }, cfg.answerTimeoutMs);
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* no JSON */ }
    if (!r.ok) throw new Error(`OpenClaw respondió ${r.status}: ${(data?.error?.message || text).slice(0, 200)}`);
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error('OpenClaw no devolvió texto');
    return { reply: Array.isArray(reply) ? reply.map(p => p.text || '').join('') : String(reply), model: data.model || `openclaw/${cfg.agentId}` };
}

async function sendReply(body) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const r = await fetchWithTimeout(`${cfg.dashboardUrl}/api/bridge/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiToken}` },
                body: JSON.stringify(body),
            }, 15_000);
            if (r.ok || r.status === 404) return;
        } catch { /* reintentar */ }
        await sleep(1000 * (attempt + 1));
    }
}

async function handle(job) {
    log(`💬 ${job.user}: ${job.prompt.slice(0, 80)}`);
    try {
        const { reply, model } = await askBart(job);
        await sendReply({ id: job.id, reply, model });
        log(`✅ respondido (${reply.length} caracteres)`);
    } catch (err) {
        log(`⚠️ ${err.message}`);
        await sendReply({ id: job.id, error: err.name === 'AbortError' ? 'Bart tardó demasiado en responder' : err.message });
    }
}

async function main() {
    log(`🤖 bart-bridge ${VERSION} → ${cfg.dashboardUrl} | OpenClaw ${cfg.gatewayUrl} | agente ${cfg.agentName} (openclaw/${cfg.agentId})`);
    let backoff = 1000;
    let lastCheck = 0;
    for (;;) {
        if (Date.now() - lastCheck > 30_000) {
            const before = gatewayState;
            await checkGateway();
            if (gatewayState !== before) log(`🔌 gateway: ${gatewayState}`);
            lastCheck = Date.now();
        }
        const qs = new URLSearchParams({ agentId: cfg.agentId, agentName: cfg.agentName, gateway: gatewayState, version: VERSION, host: os.hostname() });
        try {
            const r = await fetchWithTimeout(`${cfg.dashboardUrl}/api/bridge/next?${qs}`, { headers: { Authorization: `Bearer ${cfg.apiToken}` } }, 40_000);
            if (r.status === 401 || r.status === 403) {
                log('❌ El dashboard rechazó el API_TOKEN. Revisa que sea el mismo de Render (API_TOKEN).');
                await sleep(60_000);
                continue;
            }
            backoff = 1000;
            if (r.status === 204) continue;
            if (!r.ok) { await sleep(3000); continue; }
            const { job } = await r.json();
            if (job) handle(job); // en paralelo: seguimos escuchando mientras Bart piensa
        } catch (err) {
            if (err.name !== 'AbortError') log(`🌐 sin conexión con el dashboard (${err.message}); reintento en ${backoff / 1000}s`);
            await sleep(backoff);
            backoff = Math.min(backoff * 2, 60_000);
        }
    }
}

if (process.argv.includes('--check')) {
    // Diagnóstico rápido: gateway + dashboard
    const g = await checkGateway();
    let d = 'down';
    try {
        const r = await fetchWithTimeout(`${cfg.dashboardUrl}/api/bridge/status`, { headers: { Authorization: `Bearer ${cfg.apiToken}` } }, 10_000);
        d = r.ok ? 'ok' : r.status === 401 ? 'token_rechazado' : `http_${r.status}`;
    } catch { /* down */ }
    console.log(JSON.stringify({ gateway: g, dashboard: d, agent: `openclaw/${cfg.agentId}` }));
    process.exit(g === 'ok' && d === 'ok' ? 0 : 1);
} else {
    main();
}
