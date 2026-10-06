// Biblioteca de material raw: convierte archivos de Drive en assets, detecta la noche/evento
// y la cuenta a la que pertenecen, y combina cada sync con lo ya clasificado a mano.

const MONTHS = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

export function normalize(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function kindOf(mimeType = '') {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'other';
}

const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null);
const fullYear = y => (y < 100 ? 2000 + y : y);

/** Fecha de la noche a partir del nombre de carpeta: 2026-10-04, 04-10-2026, 04.10.26, "4 oct 2026", "04 OCT". */
export function parseNightDate(name, fallbackYear = new Date().getFullYear()) {
    const s = String(name || '').toLowerCase();
    let m = s.match(/(20\d{2})[-_. /](\d{1,2})[-_. /](\d{1,2})/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = s.match(/(\d{1,2})[-_. /](\d{1,2})[-_. /](\d{2,4})/);
    if (m) return iso(fullYear(+m[3]), +m[2], +m[1]);
    m = s.match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z]*\.?\s*(?:de\s+)?(20\d{2})?/);
    if (m && MONTHS[m[2]]) return iso(m[3] ? +m[3] : fallbackYear, MONTHS[m[2]], +m[1]);
    return null;
}

/** Alias de búsqueda por cuenta a partir de las marcas (nombre, slug, handle y brand.driveAliases). */
export function buildAliases(brands) {
    return brands.map(b => {
        const handle = (b.handler || '').replace(/^@/, '');
        const raw = [b.name, b.slug, handle, handle.replace(/[._]/g, ' '), ...(b.driveAliases || [])];
        const aliases = [...new Set(raw.map(normalize).filter(a => a.length >= 3))];
        return { accountId: b.accountId, aliases };
    });
}

/** Cuentas cuyo alias aparece en el texto (palabra completa o pegado, ej. "theroom"). */
export function matchAccounts(text, aliasTable) {
    const n = ` ${normalize(text)} `;
    const compact = n.replace(/ /g, '');
    return aliasTable
        .filter(({ aliases }) => aliases.some(a => n.includes(` ${a} `) || (a.length >= 5 && compact.includes(a.replace(/ /g, '')))))
        .map(({ accountId }) => accountId);
}

export function toAsset({ file, trail }, aliasTable) {
    const night = trail[0] || null;
    const folderPath = trail.map(t => t.name).join(' / ');
    const v = file.videoMediaMetadata || {};
    const img = file.imageMediaMetadata || {};
    const nightDate = trail.map(t => parseNightDate(t.name)).find(Boolean) || (file.createdTime ? file.createdTime.slice(0, 10) : null);
    return {
        id: `raw-${file.id}`,
        driveId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        kind: kindOf(file.mimeType),
        sizeBytes: file.size ? Number(file.size) : null,
        durationSec: v.durationMillis ? Math.round(Number(v.durationMillis) / 100) / 10 : null,
        width: v.width || img.width || null,
        height: v.height || img.height || null,
        orientation: (v.width || img.width) && (v.height || img.height) ? ((v.height || img.height) >= (v.width || img.width) ? 'vertical' : 'horizontal') : null,
        createdTime: file.createdTime || null,
        thumbnailLink: file.thumbnailLink || null,
        webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        nightId: night ? night.id : 'root',
        nightName: night ? night.name : 'Sin carpeta',
        nightDate,
        folderPath,
        detectedAccountIds: matchAccounts(`${folderPath} ${file.name}`, aliasTable),
    };
}

/**
 * Une el resultado del sync con lo guardado: conserva clasificación manual, estado, notas y usos.
 * Los archivos que ya no están en Drive se marcan `missing` en vez de borrarse (pueden estar en un brief).
 */
export function mergeAssets(existing = [], incoming = [], now = new Date().toISOString()) {
    const prev = new Map(existing.map(a => [a.id, a]));
    const seen = new Set();
    let added = 0;
    const merged = incoming.map(a => {
        seen.add(a.id);
        const old = prev.get(a.id);
        if (!old) added++;
        return {
            ...a,
            accountIds: old?.accountIdsManual ? old.accountIds : a.detectedAccountIds,
            accountIdsManual: Boolean(old?.accountIdsManual),
            status: old?.status && old.status !== 'missing' ? old.status : 'new',
            notes: old?.notes || '',
            tags: old?.tags || [],
            usedIn: old?.usedIn || [],
            firstSeenAt: old?.firstSeenAt || now,
            lastSeenAt: now,
        };
    });
    const missing = existing.filter(a => !seen.has(a.id)).map(a => ({ ...a, status: 'missing' }));
    return { assets: [...merged, ...missing], added, missing: missing.length };
}

/** Agrupa assets por noche/evento para la vista de biblioteca. */
export function groupNights(assets) {
    const nights = new Map();
    for (const a of assets) {
        if (!nights.has(a.nightId)) nights.set(a.nightId, { id: a.nightId, name: a.nightName, date: a.nightDate, accountIds: new Set(), counts: { video: 0, image: 0, audio: 0, other: 0 }, total: 0, unused: 0 });
        const n = nights.get(a.nightId);
        n.total++;
        n.counts[a.kind]++;
        if (a.status === 'new') n.unused++;
        (a.accountIds || []).forEach(id => n.accountIds.add(id));
        if (a.nightDate && (!n.date || a.nightDate > n.date)) n.date = a.nightDate;
    }
    return [...nights.values()]
        .map(n => ({ ...n, accountIds: [...n.accountIds] }))
        .sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
}
