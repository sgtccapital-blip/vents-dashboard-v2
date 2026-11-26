// Línea de marca para los agentes: cuando una tarea trata de una cuenta (Ignite, The Room…),
// el agente recibe su ADN de contenido (content-dna/<cuenta>/DNA.md) y su línea gráfica
// y de contenido (brands/<marca>/BRAND.md), como pide el CLAUDE.md del proyecto.
import fs from 'node:fs';
import path from 'node:path';

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const handleSlug = h => String(h || '').replace(/^@/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Nombres que también son palabras comunes: solo cuentan escritos con mayúscula ("Elemento", "ARRIVE").
const AMBIGUOUS = new Set(['elemento', 'arrive', 'room']);

function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return null; }
}

export function createBrandContext({ brandsDir, contentDnaDir, ttlMs = 5 * 60 * 1000 }) {
    let cache = { at: 0, accounts: [] };

    function scan() {
        const accounts = [];
        const usedDna = new Set();
        const dirs = d => { try { return fs.readdirSync(d, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name); } catch { return []; } };
        for (const slug of dirs(brandsDir)) {
            const brand = readJson(path.join(brandsDir, slug, 'brand.json'));
            if (!brand) continue;
            const dnaSlug = handleSlug(brand.handler);
            const dnaPath = path.join(contentDnaDir, dnaSlug, 'DNA.md');
            const brandPath = path.join(brandsDir, slug, 'BRAND.md');
            if (fs.existsSync(dnaPath)) usedDna.add(dnaSlug);
            accounts.push({
                id: slug,
                name: brand.name || slug,
                handler: brand.handler || '',
                descriptor: brand.descriptor || '',
                aliases: [brand.name, slug.replace(/-/g, ' '), String(brand.handler || '').replace(/^@/, ''), dnaSlug.replace(/-/g, ' '), ...(brand.driveAliases || [])],
                files: [
                    fs.existsSync(dnaPath) ? { name: 'DNA.md', path: dnaPath, label: 'ADN de contenido' } : null,
                    fs.existsSync(brandPath) ? { name: 'BRAND.md', path: brandPath, label: 'Línea gráfica y de contenido' } : null,
                ].filter(Boolean),
            });
        }
        // Cuentas con ADN pero sin marca (Music PTY, Moojoo…).
        for (const dir of dirs(contentDnaDir)) {
            if (dir.startsWith('_') || usedDna.has(dir)) continue;
            const dnaPath = path.join(contentDnaDir, dir, 'DNA.md');
            if (!fs.existsSync(dnaPath)) continue;
            const head = fs.readFileSync(dnaPath, 'utf-8').split('\n').slice(0, 4).join('\n');
            const handler = head.match(/@[\w.]+/)?.[0] || `@${dir}`;
            const descriptor = head.match(/^>\s*(.+)$/m)?.[1] || '';
            accounts.push({
                id: dir,
                name: handler.replace(/^@/, ''),
                handler,
                descriptor,
                aliases: [handler.replace(/^@/, ''), dir.replace(/-/g, ' ')],
                files: [{ name: 'DNA.md', path: dnaPath, label: 'ADN de contenido' }],
            });
        }
        for (const a of accounts) {
            a.aliases = [...new Set(a.aliases.filter(Boolean).map(x => fold(x).replace(/[._-]+/g, ' ').trim()).filter(x => x.length >= 3))];
        }
        return accounts;
    }

    function list() {
        if (Date.now() - cache.at > ttlMs) cache = { at: Date.now(), accounts: scan() };
        return cache.accounts;
    }

    const byId = id => list().find(a => a.id === id) || null;

    /** La cuenta de la que trata un texto, o null. Si hay varias, la que aparece primero. */
    function detect(text) {
        const raw = String(text || '');
        const folded = fold(raw).replace(/[._-]+/g, ' ');
        let best = null;
        for (const a of list()) {
            for (const alias of a.aliases) {
                let idx = -1;
                if (AMBIGUOUS.has(alias)) {
                    const m = raw.match(new RegExp(`(^|[^\\p{L}])(${escapeRe(alias[0].toUpperCase() + alias.slice(1))}|${escapeRe(alias.toUpperCase())})(?![\\p{L}])`, 'u'));
                    idx = m ? m.index : -1;
                } else {
                    const m = folded.match(new RegExp(`(^|[^a-z0-9])${escapeRe(alias)}(?![a-z0-9])`));
                    idx = m ? m.index : -1;
                }
                if (idx >= 0 && (!best || idx < best.idx || (idx === best.idx && alias.length > best.len))) best = { account: a, idx, len: alias.length };
            }
        }
        return best?.account || null;
    }

    /** Texto de la línea de marca para el prompt + lo que se usó (para mostrarlo en la tarea). */
    function load(id, { maxCharsPerFile = 9000 } = {}) {
        const a = byId(id);
        if (!a) return null;
        const files = a.files.map(f => {
            try {
                const text = fs.readFileSync(f.path, 'utf-8');
                return { ...f, text: text.length > maxCharsPerFile ? `${text.slice(0, maxCharsPerFile)}\n…(recortado)` : text, chars: text.length };
            } catch { return null; }
        }).filter(Boolean);
        return { id: a.id, name: a.name, handler: a.handler, files };
    }

    return { list, byId, detect, load, summary: () => list().map(({ id, name, handler, descriptor }) => ({ id, name, handler, descriptor })) };
}
