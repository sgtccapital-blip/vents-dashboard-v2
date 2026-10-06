// Cliente mínimo de Google Drive (REST v3) para leer la carpeta de material raw.
// Dos formas de acceso:
//   - GOOGLE_API_KEY: la carpeta debe estar compartida como "cualquiera con el enlace".
//   - GOOGLE_SERVICE_ACCOUNT_JSON (ruta al .json o el JSON en línea): carpeta privada compartida
//     con el email de la cuenta de servicio. Recomendado.
import fs from 'fs';
import crypto from 'crypto';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const FILE_FIELDS = 'id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents,videoMediaMetadata,imageMediaMetadata';
export const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Acepta un link de Drive (folders/<id>, ?id=<id>) o el id directo. */
export function parseFolderId(input) {
    const s = String(input || '').trim();
    const m = s.match(/folders\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{10,}$/.test(s) ? s : null;
}

export function loadServiceAccount(raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    if (!raw) return null;
    const text = raw.trim().startsWith('{') ? raw : fs.readFileSync(raw, 'utf-8');
    const sa = JSON.parse(text);
    if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no tiene client_email/private_key');
    return sa;
}

const b64url = buf => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function serviceAccountToken(sa, fetchImpl) {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }));
    const signature = b64url(crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key));
    const res = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
    });
    if (!res.ok) throw new Error(`Google OAuth ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
}

export function driveCredentialsFromEnv() {
    return { apiKey: process.env.GOOGLE_API_KEY || '', serviceAccount: loadServiceAccount() };
}

export function createDriveClient({ apiKey, serviceAccount, fetchImpl = fetch } = {}) {
    if (!apiKey && !serviceAccount) throw new Error('Drive no configurado: define GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_API_KEY en .env');
    let cached = null;

    async function authed(url, init = {}) {
        const u = new URL(url);
        const headers = { ...(init.headers || {}) };
        if (serviceAccount) {
            if (!cached || cached.expiresAt < Date.now()) cached = await serviceAccountToken(serviceAccount, fetchImpl);
            headers.Authorization = `Bearer ${cached.token}`;
        } else if (u.hostname === 'www.googleapis.com') {
            u.searchParams.set('key', apiKey);
        }
        return fetchImpl(u.toString(), { ...init, headers });
    }

    async function json(url) {
        const res = await authed(url);
        if (!res.ok) throw new Error(`Drive ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return res.json();
    }

    return {
        mode: serviceAccount ? 'service-account' : 'api-key',
        serviceAccountEmail: serviceAccount?.client_email || null,

        async getFile(id) {
            return json(`${DRIVE}/files/${id}?fields=${FILE_FIELDS}&supportsAllDrives=true`);
        },

        async listChildren(folderId) {
            const files = [];
            let pageToken = '';
            do {
                const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
                const page = await json(`${DRIVE}/files?q=${q}&fields=nextPageToken,files(${FILE_FIELDS})&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ''}`);
                files.push(...(page.files || []));
                pageToken = page.nextPageToken || '';
            } while (pageToken);
            return files;
        },

        /** Miniatura (los thumbnailLink de Drive exigen credenciales para archivos privados). */
        async fetchThumbnail(thumbnailLink, size = 480) {
            const url = thumbnailLink.replace(/=s\d+$/, `=s${size}`);
            return authed(url);
        },
    };
}

/**
 * Recorre la carpeta raíz y devuelve cada archivo con la cadena de carpetas que lo contiene.
 * Estructura esperada: raíz / [mes /] noche o evento / archivos (las subcarpetas de cámara también valen).
 */
export async function crawlFolder(client, rootId, { maxDepth = 4 } = {}) {
    const root = await client.getFile(rootId);
    const out = [];
    async function walk(folder, trail, depth) {
        const children = await client.listChildren(folder.id);
        for (const child of children) {
            if (child.mimeType === FOLDER_MIME) {
                if (depth < maxDepth) await walk(child, [...trail, { id: child.id, name: child.name }], depth + 1);
            } else {
                out.push({ file: child, trail });
            }
        }
    }
    await walk(root, [], 0);
    return { root: { id: root.id, name: root.name }, entries: out };
}
