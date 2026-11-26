// Service worker: programa los ciclos, guarda la configuración y habla con el dashboard local.
const DEFAULTS = { dashboardUrl: 'http://localhost:8090', token: '', backfillComplete: false, lastRun: null, lastAttemptAt: 0 };
const PERIOD_MIN = 20;
const MIN_GAP_MS = 5 * 60 * 1000;

const getCfg = () => chrome.storage.local.get(DEFAULTS);
const setCfg = patch => chrome.storage.local.set(patch);

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create('sync', { periodInMinutes: PERIOD_MIN, delayInMinutes: 1 }));
chrome.runtime.onStartup.addListener(() => chrome.alarms.create('sync', { periodInMinutes: PERIOD_MIN, delayInMinutes: 1 }));

async function dashboard(path, init = {}) {
    const { dashboardUrl, token } = await getCfg();
    if (!token) throw new Error('Falta la llave del dashboard (abre la extensión y pégala)');
    const r = await fetch(`${dashboardUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Extension-Version': chrome.runtime.getManifest().version, ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Dashboard ${r.status}`);
    return data;
}

async function chatgptTab({ open = false } = {}) {
    const tabs = await chrome.tabs.query({ url: 'https://chatgpt.com/*' });
    // Una pestaña existente puede conservar un content script de una versión anterior.
    // Cada ciclo usa una pestaña temporal con el código actual y la misma sesión web.
    if (!tabs.length && !open) return null;
    const tab = await chrome.tabs.create({ url: 'https://chatgpt.com/', active: false });
    // El evento onUpdated puede ocurrir antes de registrar un listener en una carga rápida.
    for (let i = 0; i < 60; i++) {
        if ((await chrome.tabs.get(tab.id)).status === 'complete') break;
        await new Promise(r => setTimeout(r, 500));
    }
    await new Promise(r => setTimeout(r, 2500)); // deja cargar el content script
    return tab;
}

// Las pestañas de ChatGPT abiertas antes de instalar o actualizar la extensión no tienen el
// content script: si no responde, se inyecta y se reintenta.
async function sendSync(tabId, full) {
    // Inyección explícita y mensaje versionado: un content script anterior puede seguir
    // vivo en una pestaña incluso después de recargar la extensión.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['sync-core.js', 'content.js'] });
    return chrome.tabs.sendMessage(tabId, { type: 'sync-v2', full });
}

async function startSync({ open = false, force = false } = {}) {
    const cfg = await getCfg();
    if (!cfg.token) return { error: 'Falta la llave del dashboard' };
    if (!force && Date.now() - cfg.lastAttemptAt < MIN_GAP_MS) return { skipped: true };
    const tab = await chatgptTab({ open });
    if (!tab) {
        await setCfg({ lastRun: { at: new Date().toISOString(), error: 'Abre chatgpt.com en Chrome para sincronizar' } });
        return { error: 'No hay ninguna pestaña de ChatGPT abierta' };
    }
    await setCfg({ lastAttemptAt: Date.now() });
    try {
        const report = await sendSync(tab.id, !cfg.backfillComplete);
        if (report && !report.error) await setCfg({ backfillComplete: report.complete });
        await setCfg({ lastRun: { at: new Date().toISOString(), ...report } });
        return report;
    } catch (e) {
        const err = { at: new Date().toISOString(), error: `No se pudo hablar con la pestaña de ChatGPT: ${e.message}` };
        await setCfg({ lastRun: err });
        return err;
    } finally {
        chrome.tabs.remove(tab.id).catch(() => {});
    }
}

chrome.alarms.onAlarm.addListener(a => { if (a.name === 'sync') startSync(); });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const reply = p => { p.then(sendResponse, e => sendResponse({ error: e.message })); return true; };
    switch (msg?.type) {
        case 'dashboard:state': return reply(dashboard(`/ingest/chatgpt/state?accountId=${encodeURIComponent(msg.identity?.accountId || '')}&workspaceId=${encodeURIComponent(msg.identity?.workspaceId || '')}`));
        case 'dashboard:push': return reply(dashboard('/ingest/chatgpt/conversations', { method: 'POST', body: JSON.stringify({ conversations: msg.conversations, identity: msg.identity }) }));
        case 'dashboard:report': return reply((async () => {
            // Se guarda aquí también: una sincronización larga puede sobrevivir al service worker que la lanzó.
            const r = msg.report || {};
            await setCfg({ lastRun: { at: new Date().toISOString(), ...r }, ...(r.error ? {} : { backfillComplete: !!r.complete }) });
            return dashboard('/ingest/chatgpt/report', { method: 'POST', body: JSON.stringify({ ...r, identity: msg.identity }) });
        })());
        case 'maybe-sync':
            // Se lanza después de responder: el content script no espera a que termine.
            sendResponse({ ok: true });
            setTimeout(() => startSync(), msg.reason === 'open' ? 8000 : 1000);
            return false;
        case 'popup:status': return reply((async () => {
            const cfg = await getCfg();
            let dashboardOk = null;
            try { await dashboard('/ingest/chatgpt/state'); dashboardOk = true; } catch (e) { dashboardOk = e.message; }
            return { ...cfg, token: cfg.token ? `${cfg.token.slice(0, 9)}…` : '', dashboardOk };
        })());
        case 'popup:save': return reply(setCfg({ dashboardUrl: msg.dashboardUrl, ...(msg.token ? { token: msg.token.trim() } : {}) }).then(() => ({ ok: true })));
        case 'popup:sync': return reply(startSync({ open: true, force: true }));
        case 'popup:resync': return reply(setCfg({ backfillComplete: false }).then(() => startSync({ open: true, force: true })));
        default: return false;
    }
});
