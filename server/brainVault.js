/**
 * Cerebro de Bart (BrainVault): lectura de los documentos curados para el RAG.
 *
 * - Recorre la carpeta y omite todo lo que empieza con "_" o "." (plantillas, archivo, ocultos).
 * - Lee el encabezado YAML (titulo, tipo, etiquetas…) para darle al RAG un título y categoría reales.
 * - Funciones puras: se prueban sin servidor.
 */
import fs from 'fs';
import path from 'path';

/** Archivos .md/.txt indexables bajo `root`, en orden estable. */
export function collectVaultFiles(root) {
    const out = [];
    const walk = (dir) => {
        for (const name of fs.readdirSync(dir).sort()) {
            if (name.startsWith('_') || name.startsWith('.')) continue;
            const full = path.join(dir, name);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) walk(full);
            else if (/\.(md|txt)$/i.test(name)) out.push(full);
        }
    };
    if (fs.existsSync(root)) walk(root);
    return out;
}

const unquote = (v) => v.replace(/^["']|["']$/g, '').trim();

/** Encabezado YAML simple (clave: valor, listas [a, b]). Suficiente para el formato de las plantillas. */
export function parseFrontmatter(text) {
    const m = String(text).match(/^\uFEFF?---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    if (!m) return { data: {}, body: String(text) };
    const data = {};
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ_-]+)\s*:\s*(.*)$/);
        if (!kv) continue;
        const [, key, raw] = kv;
        const val = raw.trim();
        data[key] = /^\[.*\]$/.test(val)
            ? val.slice(1, -1).split(',').map(x => unquote(x)).filter(Boolean)
            : unquote(val);
    }
    return { data, body: String(text).slice(m[0].length) };
}

/**
 * Convierte un archivo del cerebro en documento del RAG.
 * El título sale de `titulo` (o del primer "# ", o del nombre del archivo) y la categoría de `tipo`
 * (o de la carpeta). Las etiquetas se agregan al texto para que también se encuentren al buscar.
 */
export function toRagDocument(text, relPath) {
    const { data, body } = parseFrontmatter(text);
    const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const folder = relPath.split(/[\\/]/)[0];
    const title = data.titulo || heading || path.basename(relPath).replace(/\.(md|txt)$/i, '');
    const tags = Array.isArray(data.etiquetas) ? data.etiquetas : [];
    const meta = [
        tags.length ? `Etiquetas: ${tags.join(', ')}` : '',
        data.actualizado ? `Actualizado: ${data.actualizado}` : '',
    ].filter(Boolean).join(' · ');
    return {
        title,
        category: data.tipo || (folder !== relPath ? folder.toLowerCase() : 'cerebro'),
        tags,
        updated: data.actualizado || null,
        content: `${body.trim()}${meta ? `\n\n${meta}` : ''}`,
    };
}
