const $ = id => document.getElementById(id);
const send = msg => new Promise(r => chrome.runtime.sendMessage(msg, r));
const fmt = d => (d ? new Date(d).toLocaleString('es') : 'nunca');

async function refresh() {
    const s = await send({ type: 'popup:status' });
    $('url').value = s.dashboardUrl;
    const run = s.lastRun;
    const lines = [
        s.dashboardOk === true ? '<span class="ok">● Conectado al dashboard</span>' : `<span class="err">● ${s.token ? s.dashboardOk : 'Falta la llave'}</span>`,
        `Llave: ${s.token || '—'}`,
        `Historial completo cargado: ${s.backfillComplete ? 'sí' : 'todavía no'}`,
        `Última sincronización: ${fmt(run?.at)}`,
    ];
    if (run && !run.error && run.scanned != null) lines.push(`Revisadas ${run.scanned}, cambiadas ${run.changed}, enviadas ${run.sent}${run.remaining ? `, faltan ${run.remaining} (sigue en el próximo ciclo)` : ''}`);
    if (run?.error) lines.push(`<span class="err">${run.error}</span>`);
    $('status').innerHTML = lines.join('\n');
}

$('save').onclick = async () => { await send({ type: 'popup:save', dashboardUrl: $('url').value || 'http://localhost:8090', token: $('token').value }); $('token').value = ''; refresh(); };
$('sync').onclick = async () => { $('status').textContent = 'Sincronizando… (puede tardar unos minutos la primera vez)'; await send({ type: 'popup:sync' }); refresh(); };
$('resync').onclick = async () => { $('status').textContent = 'Revisando todo el historial…'; await send({ type: 'popup:resync' }); refresh(); };
refresh();
