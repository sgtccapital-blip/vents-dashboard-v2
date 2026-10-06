// Cliente del estudio de contenido (/api/studio/*).
async function call(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api/studio${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) window.dispatchEvent(new Event('auth:required'));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
}

export const studioApi = {
    config: () => call('/config'),
    saveFolder: folderUrl => call('/config', { method: 'POST', body: { folderUrl } }),
    sync: () => call('/sync', { method: 'POST' }),
    library: accountId => call(`/library${accountId ? `?accountId=${encodeURIComponent(accountId)}` : ''}`),
    updateAssets: (ids, changes) => call('/assets', { method: 'PATCH', body: { ids, changes } }),
    ideas: payload => call('/ideas', { method: 'POST', body: payload }),
    develop: taskId => call(`/develop/${taskId}`, { method: 'POST', body: {} }),
    execute: taskId => call(`/execute/${taskId}`, { method: 'POST' }),
    render: (taskId, opts = {}) => call(`/render/${taskId}`, { method: 'POST', body: opts }),
    renderStatus: taskId => call(`/render/${taskId}`),
    generators: () => call('/generators'),
    estimate: payload => call('/generate/estimate', { method: 'POST', body: payload }),
    generate: payload => call('/generate', { method: 'POST', body: payload }),
    generation: id => call(`/generate/${id}`),
    promptPack: payload => call('/prompt-pack', { method: 'POST', body: payload }),
    references: () => call('/references'),
    addReference: async formData => {
        const res = await fetch('/api/studio/references', { method: 'POST', credentials: 'include', body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        return data;
    },
    reanalyze: id => call(`/references/${id}/analyze`, { method: 'POST' }),
    deleteReference: id => call(`/references/${id}`, { method: 'DELETE' }),
    recreate: (id, payload) => call(`/references/${id}/recreate`, { method: 'POST', body: payload }),
};

export const thumbUrl = (asset, size = 320) => {
    if (asset.thumbPath) return `/api/studio/media?path=${encodeURIComponent(asset.thumbPath)}`;
    return asset.thumbnailLink ? `/api/studio/thumb/${asset.driveId}?s=${size}` : null;
};

export const formatDuration = s => (s == null ? '' : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s)}s`);

export const mediaUrl = (relPath, { download = false, v } = {}) => `/api/studio/media?path=${encodeURIComponent(relPath)}${download ? '&download=1' : ''}${v ? `&v=${encodeURIComponent(v)}` : ''}`;
