// Lógica de sincronización ChatGPT → Command Center, sin dependencias de Chrome (se prueba en Node).
// chatgpt.get(path) habla con la API web de chatgpt.com con la sesión del usuario;
// bridge.state/push/report hablan con el dashboard.
(function (root) {
    const PAGE = 100;
    const STOP_AFTER_UNCHANGED = 40; // ordenadas por última actualización: tras 40 sin cambios, lo demás tampoco cambió

    const toMs = t => (typeof t === 'number' ? t * 1000 : Date.parse(t));
    const sameTime = (a, b) => a && b && Math.abs(toMs(a) - toMs(b)) < 1500;

    async function listMain(chatgpt, known, { full, sleep }) {
        const changed = [];
        let scanned = 0, offset = 0, unchanged = 0;
        for (;;) {
            const page = await chatgpt.get(`/backend-api/conversations?offset=${offset}&limit=${PAGE}&order=updated`);
            const items = page.items || [];
            for (const it of items) {
                scanned++;
                const k = known[it.id];
                if (k === 'excluded') continue;
                if (sameTime(k, it.update_time)) unchanged++;
                else { changed.push(it); unchanged = 0; }
            }
            offset += items.length;
            if (!items.length || offset >= (page.total ?? Infinity)) break;
            if (!full && unchanged >= STOP_AFTER_UNCHANGED) break;
            await sleep(1500);
        }
        return { changed, scanned };
    }

    // Conversaciones dentro de Proyectos de ChatGPT (no siempre salen en la lista principal).
    async function listProjects(chatgpt, known, { sleep, log }) {
        const changed = [];
        let scanned = 0;
        let sidebar;
        try {
            sidebar = await chatgpt.get('/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=0');
        } catch (e) {
            log(`Proyectos de ChatGPT no disponibles: ${e.message}`);
            return { changed, scanned };
        }
        const gizmos = (sidebar.items || []).map(x => x.gizmo?.gizmo || x.gizmo || x).filter(g => g?.id?.startsWith('g-p-'));
        for (const g of gizmos) {
            let cursor = 0;
            for (let guard = 0; guard < 50 && cursor != null; guard++) {
                let page;
                try { page = await chatgpt.get(`/backend-api/gizmos/${g.id}/conversations?cursor=${cursor}`); } catch (e) { log(`Proyecto ${g.id}: ${e.message}`); break; }
                for (const it of page.items || []) {
                    scanned++;
                    if (known[it.id] === 'excluded' || sameTime(known[it.id], it.update_time)) continue;
                    changed.push(it);
                }
                cursor = page.cursor ?? null;
                await sleep(500);
            }
        }
        return { changed, scanned };
    }

    /**
     * @returns {Promise<{scanned:number, changed:number, sent:number, remaining:number, complete:boolean, error:string}>}
     */
    async function runChatGPTSync({ chatgpt, bridge, full = false, maxFetch = 80, batch = 5, sleep = ms => new Promise(r => setTimeout(r, ms)), log = () => {} }) {
        const report = { scanned: 0, changed: 0, sent: 0, remaining: 0, complete: false, error: '' };
        try {
            const { known = {} } = await bridge.state();
            const main = await listMain(chatgpt, known, { full, sleep });
            const proj = await listProjects(chatgpt, known, { sleep, log });
            const seen = new Set();
            const changed = [...main.changed, ...proj.changed].filter(it => !seen.has(it.id) && seen.add(it.id));
            report.scanned = main.scanned + proj.scanned;
            report.changed = changed.length;

            let pending = [];
            const flush = async () => {
                if (!pending.length) return;
                await bridge.push(pending);
                report.sent += pending.length;
                pending = [];
            };
            for (const it of changed.slice(0, maxFetch)) {
                const conv = await chatgpt.get(`/backend-api/conversation/${it.id}`);
                conv.id = conv.conversation_id || it.id;
                conv.conversation_id = conv.id;
                if (!conv.title) conv.title = it.title;
                if (!conv.update_time) conv.update_time = it.update_time;
                if (!conv.gizmo_id && it.gizmo_id) conv.gizmo_id = it.gizmo_id;
                pending.push(conv);
                if (pending.length >= batch) await flush();
                await sleep(3000); // ChatGPT corta con 429 si se le piden detalles muy seguido
            }
            await flush();
            report.remaining = Math.max(0, changed.length - maxFetch);
            report.complete = report.remaining === 0;
        } catch (err) {
            report.error = err.message || String(err);
        }
        try { await bridge.report(report); } catch { /* el reporte es informativo */ }
        return report;
    }

    root.runChatGPTSync = runChatGPTSync;
    if (typeof module !== 'undefined') module.exports = { runChatGPTSync };
})(typeof globalThis !== 'undefined' ? globalThis : this);
