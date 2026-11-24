// Tokens por agente y registro de lo que hace cada uno.
// El token solo se muestra al crearlo; se guarda su hash. Todo vive en <dir>/ (fuera de git).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const MAX_ACTIVITY = 1000;

export const SCOPES = ['read', 'write'];

export function createHubStore(dir) {
    fs.mkdirSync(dir, { recursive: true });
    const tokensFile = path.join(dir, 'tokens.json');
    const activityFile = path.join(dir, 'activity.jsonl');

    let tokens = [];
    try { tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8')); } catch { /* primera vez */ }
    let activity = [];
    try {
        activity = fs.readFileSync(activityFile, 'utf8').trim().split('\n').filter(Boolean).slice(-MAX_ACTIVITY).map(l => JSON.parse(l));
        // Recorta el archivo para que no crezca sin límite.
        fs.writeFileSync(activityFile, activity.map(a => JSON.stringify(a)).join('\n') + (activity.length ? '\n' : ''));
    } catch { /* sin actividad todavía */ }

    const saveTokens = () => {
        const tmp = `${tokensFile}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2));
        fs.renameSync(tmp, tokensFile);
    };
    let usedTimer = null;
    const touch = () => { clearTimeout(usedTimer); usedTimer = setTimeout(saveTokens, 5000); };

    const publicRecord = ({ hash, ...rest }) => rest; // eslint-disable-line no-unused-vars

    return {
        createToken({ name, scope = 'write', agent = '' }) {
            if (!name?.trim()) throw Object.assign(new Error('Ponle un nombre al agente'), { status: 400 });
            if (!SCOPES.includes(scope)) throw Object.assign(new Error(`Permiso no válido: usa ${SCOPES.join(' o ')}`), { status: 400 });
            const token = `cc_${crypto.randomBytes(24).toString('base64url')}`;
            const record = {
                id: `tok-${crypto.randomBytes(4).toString('hex')}`,
                name: name.trim().slice(0, 60),
                agent: (agent || name).trim().slice(0, 40),
                scope,
                prefix: token.slice(0, 9),
                hash: sha(token),
                createdAt: new Date().toISOString(),
                lastUsedAt: null,
                calls: 0,
                revoked: false,
            };
            tokens.push(record);
            saveTokens();
            return { token, record: publicRecord(record) };
        },

        list: () => tokens.map(publicRecord),

        revoke(id) {
            const t = tokens.find(x => x.id === id);
            if (!t) return false;
            t.revoked = true;
            t.revokedAt = new Date().toISOString();
            saveTokens();
            return true;
        },

        /** Devuelve el registro del token si es válido y no está revocado. */
        verify(token) {
            if (!token || !token.startsWith('cc_')) return null;
            const h = sha(token);
            const t = tokens.find(x => !x.revoked && crypto.timingSafeEqual(Buffer.from(x.hash), Buffer.from(h)));
            if (!t) return null;
            t.lastUsedAt = new Date().toISOString();
            touch();
            return publicRecord(t);
        },

        logActivity(entry) {
            const row = { at: new Date().toISOString(), ...entry };
            activity.push(row);
            if (activity.length > MAX_ACTIVITY) activity = activity.slice(-MAX_ACTIVITY);
            const t = entry.tokenId && tokens.find(x => x.id === entry.tokenId);
            if (t) { t.calls = (t.calls || 0) + 1; touch(); }
            fs.appendFile(activityFile, JSON.stringify(row) + '\n', () => {});
            return row;
        },

        activity({ limit = 100, agent } = {}) {
            const rows = agent ? activity.filter(a => a.agent === agent) : activity;
            return rows.slice(-limit).reverse();
        },

        flush() { clearTimeout(usedTimer); saveTokens(); },
    };
}
