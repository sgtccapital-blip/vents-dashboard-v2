// Corre dentro de chatgpt.com: usa la sesión del usuario para leer sus conversaciones
// y se las pasa al service worker, que las manda al dashboard.
(() => {
    let accessToken = null;
    let running = false;

    async function getToken(force = false) {
        if (accessToken && !force) return accessToken;
        const r = await fetch('/api/auth/session', { credentials: 'include' });
        if (!r.ok) throw new Error(`Sesión de ChatGPT no disponible (${r.status})`);
        const j = await r.json();
        if (!j.accessToken) throw new Error('No hay sesión iniciada en ChatGPT');
        accessToken = j.accessToken;
        return accessToken;
    }

    const chatgpt = {
        async get(path, retried = false) {
            // Mismas cabeceras que manda la web de ChatGPT (el id de dispositivo viene de su cookie).
            const deviceId = document.cookie.match(/(?:^|;\s*)oai-did=([^;]+)/)?.[1];
            const headers = { Authorization: `Bearer ${await getToken()}`, ...(deviceId ? { 'oai-device-id': decodeURIComponent(deviceId) } : {}) };
            const r = await fetch(path, { credentials: 'include', headers });
            if (r.status === 401 && !retried) { await getToken(true); return chatgpt.get(path, true); }
            if (r.status === 429) throw new Error('ChatGPT pidió esperar (429); se reintenta en el próximo ciclo');
            if (!r.ok) throw new Error(`ChatGPT ${r.status} en ${path.split('?')[0]}`);
            return r.json();
        },
    };

    const send = msg => new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(msg, res => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (res?.error) return reject(new Error(res.error));
            resolve(res);
        });
    });

    const bridge = {
        state: () => send({ type: 'dashboard:state' }),
        push: conversations => send({ type: 'dashboard:push', conversations }),
        report: report => send({ type: 'dashboard:report', report }),
    };

    async function run(full) {
        if (running) return { error: 'Ya hay una sincronización en curso' };
        running = true;
        try {
            return await globalThis.runChatGPTSync({ chatgpt, bridge, full, log: m => console.debug('[Command Center sync]', m) });
        } finally {
            running = false;
        }
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === 'sync') {
            run(!!msg.full).then(sendResponse);
            return true;
        }
        return false;
    });

    // Al abrir ChatGPT y al salir de la pestaña (acabas de conversar) se pide un ciclo si toca.
    const maybe = reason => send({ type: 'maybe-sync', reason }).catch(() => {});
    maybe('open');
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') maybe('hidden'); });
})();
