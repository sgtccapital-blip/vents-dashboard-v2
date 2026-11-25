// Helpers compartidos por las vistas de AI Office HQ.

export const TASK_STATUS = {
    waiting_approval: { label: 'Gobernanza', color: '#eab308' },
    queued: { label: 'En cola', color: '#94a3b8' },
    in_progress: { label: 'En curso', color: '#38bdf8' },
    review: { label: 'Por revisar', color: '#a855f7' },
    done: { label: 'Hecha', color: '#10b981' },
    failed: { label: 'Falló', color: '#ef4444' },
    cancelled: { label: 'Descartada', color: '#64748b' },
};

export const AGENT_STATUS = {
    executing: { label: 'Trabajando', color: '#38bdf8' },
    planning: { label: 'Planificando', color: '#38bdf8' },
    available: { label: 'Disponible', color: '#10b981' },
    active: { label: 'Disponible', color: '#10b981' },
    waiting_approval: { label: 'Esperando aprobación', color: '#eab308' },
    offline: { label: 'Desconectado', color: '#64748b' },
    error: { label: 'Error', color: '#ef4444' },
    blocked: { label: 'Bloqueado', color: '#f97316' },
};

export const PROVIDER_COLOR = { google: '#60a5fa', anthropic: '#f59e0b', openai: '#10b981', openrouter: '#c084fc', externo: '#94a3b8' };

export const statusMeta = (map, s) => map[s] || { label: s || '—', color: '#94a3b8' };

export function modelLabel(models, id) {
    if (!id) return '—';
    if (id === 'externo') return 'Externo';
    return models?.models?.find(m => m.id === id)?.label || String(id).replace(/^openrouter\//, '');
}

export function timeAgo(iso) {
    if (!iso) return 'nunca';
    const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return 'hace segundos';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return `hace ${Math.round(s / 86400)} d`;
}

export const fmtUSD = n => (n == null ? '—' : n === 0 ? '$0' : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
export const fmtTokens = n => (!n ? '0' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
export const fmtMs = ms => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${(ms / 60000).toFixed(1)} min`);

export async function postJson(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data;
}

/** Sube archivos con FormData (no JSON) a la tarea. */
export async function uploadTaskFiles(taskId, files) {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    const r = await fetch(`/api/office/task/${taskId}/files`, { method: 'POST', body: form });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data.files;
}
