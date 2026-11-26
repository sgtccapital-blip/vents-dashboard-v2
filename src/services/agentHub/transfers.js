// Transferencias de archivos grandes fuera del contexto del modelo.
// Subida: create_upload → PUT de los bytes a una URL de un solo uso (límite de tamaño, SHA-256 obligatorio,
// caduca en 15 min) → el archivo queda adjunto al proyecto/tarea con versión.
// Descarga: create_download_link → URL firmada (HMAC) de corta duración para clientes que no pueden enviar cabeceras.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ToolError } from './toolkit.js';

export const MAX_UPLOAD_BYTES = Number(process.env.MCP_MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
const TICKET_TTL_MS = 15 * 60 * 1000;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const writeJson = (file, value) => { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2)); fs.renameSync(tmp, file); };

export function createTransfers({ dir, capture, publicBase }) {
    const ticketsDir = path.join(dir, 'uploads');
    fs.mkdirSync(ticketsDir, { recursive: true });
    const secretFile = path.join(dir, 'transfer.secret');
    if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
    const secret = fs.readFileSync(secretFile, 'utf8').trim();
    const base = () => (publicBase() || 'http://localhost:8090').replace(/\/$/, '');
    const ticketFile = id => path.join(ticketsDir, `${id}.json`);
    const load = id => { if (!/^up-[a-z0-9]+$/.test(id)) return null; try { return JSON.parse(fs.readFileSync(ticketFile(id), 'utf8')); } catch { return null; } };

    function createUpload({ name, size, sha256, projectId, taskId, description = '' }, meta) {
        if (!Number.isInteger(size) || size <= 0) throw new ToolError('INVALID_INPUT', 'size debe ser el tamaño exacto en bytes.');
        if (size > MAX_UPLOAD_BYTES) throw new ToolError('TOO_LARGE', `Máximo ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB por archivo.`);
        if (!/^[a-f0-9]{64}$/.test(sha256 || '')) throw new ToolError('INVALID_INPUT', 'sha256 (hex de 64) es obligatorio.');
        if (!projectId && !taskId) throw new ToolError('INVALID_INPUT', 'Indica project_id o task_id.');
        const id = `up-${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`;
        const token = crypto.randomBytes(24).toString('base64url');
        const ticket = { id, name, size, sha256, projectId: projectId || null, taskId: taskId || null, description, tokenHash: sha(token), createdBy: meta.agent, principal: meta.principal, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TICKET_TTL_MS).toISOString(), status: 'pending' };
        writeJson(ticketFile(id), ticket);
        return { uploadId: id, method: 'PUT', url: `${base()}/mcp/uploads/${id}?t=${token}`, headers: { 'Content-Type': 'application/octet-stream' }, maxBytes: size, expiresAt: ticket.expiresAt, then: 'Consulta get_upload con uploadId para obtener el id del documento.' };
    }

    /** Recibe el cuerpo en streaming, verificando tamaño y hash; nada pasa por base64. */
    function handlePut(req, res) {
        const t = load(req.params.id);
        const token = String(req.query.t || '');
        if (!t || !token || !crypto.timingSafeEqual(Buffer.from(sha(token)), Buffer.from(t.tokenHash))) return res.status(401).json({ error: 'Ticket inválido' });
        if (t.status !== 'pending') return res.status(409).json({ error: `Ticket ${t.status}`, result: t.result || null });
        if (Date.parse(t.expiresAt) < Date.now()) { t.status = 'expired'; writeJson(ticketFile(t.id), t); return res.status(410).json({ error: 'Ticket caducado' }); }
        const declared = Number(req.headers['content-length'] || 0);
        if (declared && declared !== t.size) return res.status(400).json({ error: 'Content-Length no coincide con size' });
        const hash = crypto.createHash('sha256');
        const chunks = [];
        let received = 0, aborted = false;
        req.on('data', chunk => {
            if (aborted) return;
            received += chunk.length;
            if (received > t.size) { aborted = true; res.status(413).json({ error: 'Más bytes de los declarados' }); req.destroy(); return; }
            hash.update(chunk); chunks.push(chunk);
        });
        req.on('end', () => {
            if (aborted) return;
            const digest = hash.digest('hex');
            if (received !== t.size || digest !== t.sha256) { t.status = 'rejected'; t.error = received !== t.size ? 'Tamaño distinto' : 'SHA-256 no coincide'; writeJson(ticketFile(t.id), t); return res.status(422).json({ error: t.error }); }
            try {
                const result = capture.attachBytes({ project_id: t.projectId || undefined, task_id: t.taskId || undefined, name: t.name, description: t.description, sha256: digest }, Buffer.concat(chunks), { actor: t.createdBy });
                Object.assign(t, { status: 'completed', completedAt: new Date().toISOString(), result });
                writeJson(ticketFile(t.id), t);
                res.status(201).json(result);
            } catch (err) {
                Object.assign(t, { status: 'rejected', error: err.message });
                writeJson(ticketFile(t.id), t);
                res.status(400).json({ error: err.message });
            }
        });
    }

    function getUpload(id, principal) {
        const t = load(id);
        if (!t || (principal && t.principal && t.principal !== principal && principal !== 'admin')) throw new ToolError('NOT_FOUND', `No existe la subida ${id}.`);
        if (t.status === 'pending' && Date.parse(t.expiresAt) < Date.now()) t.status = 'expired';
        const { tokenHash, ...view } = t; // eslint-disable-line no-unused-vars
        return view;
    }

    const sign = (fileId, exp) => crypto.createHmac('sha256', secret).update(`${fileId}.${exp}`).digest('base64url');
    function createDownloadLink(fileId, { ttlSec = 600 } = {}) {
        const item = capture.readFile(fileId);
        if (!item) throw new ToolError('NOT_FOUND', `No existe el documento ${fileId}.`);
        const exp = Date.now() + Math.min(Math.max(ttlSec, 30), 3600) * 1000;
        return { fileId, name: item.meta.name, size: item.meta.size, sha256: item.meta.sha256, mime: item.meta.mime, url: `${base()}/mcp/files/${encodeURIComponent(fileId)}?exp=${exp}&sig=${sign(fileId, exp)}`, expiresAt: new Date(exp).toISOString() };
    }
    function verifyDownload(fileId, exp, sig) {
        if (!exp || !sig || Number(exp) < Date.now()) return false;
        const good = sign(fileId, Number(exp));
        return good.length === String(sig).length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(String(sig)));
    }

    return { createUpload, handlePut, getUpload, createDownloadLink, verifyDownload };
}
