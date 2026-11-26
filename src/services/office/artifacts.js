// Archivos de cada tarea de AI Office (entregables, documentos, imágenes, adjuntos del CEO).
// Los bytes van a <dir>/<taskId>/<fileId>-<nombre>; la ficha de cada archivo vive en task.artifacts.
// Una tarea de seguimiento hereda los archivos por referencia (storedIn = tarea de origen), sin copiarlos.
import fs from 'node:fs';
import path from 'node:path';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_INLINE_TEXT = 60_000;

const MIME_BY_EXT = {
    md: 'text/markdown', markdown: 'text/markdown', txt: 'text/plain', csv: 'text/csv', tsv: 'text/tab-separated-values',
    json: 'application/json', html: 'text/html', htm: 'text/html', xml: 'application/xml', yaml: 'text/yaml', yml: 'text/yaml',
    js: 'text/javascript', ts: 'text/plain', css: 'text/css', py: 'text/x-python', sql: 'text/plain',
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
};

export function mimeFor(name = '', fallback = 'application/octet-stream') {
    const ext = String(name).split('.').pop().toLowerCase();
    return MIME_BY_EXT[ext] || fallback;
}

export function kindOf(mime = '') {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf') return 'pdf';
    if (isTextMime(mime)) return 'text';
    return 'file';
}

export function isTextMime(mime = '') {
    return mime.startsWith('text/') || ['application/json', 'application/xml', 'image/svg+xml'].includes(mime);
}

/** Nombre de archivo seguro (sin rutas ni caracteres raros), conservando la extensión. */
export function safeName(name = 'archivo') {
    const base = path.basename(String(name)).normalize('NFKD').replace(/[̀-ͯ]/g, '');
    const clean = base.replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').replace(/^\.+/, '').slice(0, 120);
    return clean || 'archivo';
}

export function createArtifactStore({ dir }) {
    const taskDir = taskId => path.join(dir, safeName(taskId));
    const fileOf = meta => path.join(taskDir(meta.storedIn), meta.file);

    /** Guarda los bytes y devuelve la ficha para task.artifacts. */
    function write(taskId, { name, content, mime, description = '', createdBy = 'CEO', createdByKind = 'ceo' }) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content ?? ''), 'utf-8');
        if (!buffer.length) throw Object.assign(new Error('El archivo está vacío'), { status: 400 });
        if (buffer.length > MAX_FILE_BYTES) throw Object.assign(new Error(`El archivo pasa de ${MAX_FILE_BYTES / 1024 / 1024} MB`), { status: 413 });
        const clean = safeName(name);
        const type = mime && mime !== 'application/octet-stream' ? mime : mimeFor(clean);
        const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const file = `${id}-${clean}`;
        fs.mkdirSync(taskDir(taskId), { recursive: true });
        fs.writeFileSync(path.join(taskDir(taskId), file), buffer);
        return {
            id, name: clean, mime: type, kind: kindOf(type), size: buffer.length,
            description: String(description || '').slice(0, 500), createdBy, createdByKind,
            createdAt: new Date().toISOString(), storedIn: taskId, file,
        };
    }

    function read(meta) {
        const p = fileOf(meta);
        if (!fs.existsSync(p)) throw Object.assign(new Error('El archivo ya no está en disco'), { status: 404 });
        return fs.readFileSync(p);
    }

    /** Texto del archivo (si es de texto), recortado para meterlo en un prompt. */
    function readText(meta, limit = MAX_INLINE_TEXT) {
        if (!isTextMime(meta.mime)) return null;
        const text = read(meta).toString('utf-8');
        return text.length > limit ? `${text.slice(0, limit)}\n…[recortado: ${text.length - limit} caracteres más]` : text;
    }

    function remove(meta) {
        try { fs.unlinkSync(fileOf(meta)); } catch { /* ya no estaba */ }
    }

    return { dir, write, read, readText, remove, pathOf: fileOf };
}

// ─── Archivos escritos por un agente interno dentro de su respuesta ───
// Formato que se le pide al modelo:
//   <<<ARCHIVO: propuesta-cliente.md>>>
//   ...contenido...
//   <<<FIN ARCHIVO>>>
const FILE_BLOCK = /<<<ARCHIVO:\s*([^>\n]+?)\s*>>>\r?\n([\s\S]*?)\r?\n?<<<FIN ARCHIVO>>>/g;

export function extractFileBlocks(text = '') {
    const files = [];
    const rest = String(text).replace(FILE_BLOCK, (_, name, body) => {
        files.push({ name: name.trim(), content: body.replace(/^```[\w-]*\r?\n([\s\S]*?)\r?\n```\s*$/, '$1') });
        return `📎 *Archivo creado: ${safeName(name.trim())}*`;
    });
    return { text: rest.trim(), files };
}

export const FILE_BLOCK_INSTRUCTIONS = `ARCHIVOS ENTREGABLES:
Si la tarea pide un documento, propuesta, guion, tabla, correo, contrato, CSV, HTML u otro archivo, créalo con este formato exacto (uno por archivo, con extensión):
<<<ARCHIVO: nombre-descriptivo.md>>>
(contenido completo del archivo)
<<<FIN ARCHIVO>>>
Fuera de los archivos escribe un resumen corto de lo que hiciste, las decisiones que tomaste y qué falta o qué debería hacer el siguiente agente.`;
