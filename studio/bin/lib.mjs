// Utilidades compartidas de los comandos de la máquina de contenido.
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

export const STUDIO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = path.join(STUDIO, '..');
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

export const CONTENT_DNA = process.env.CONTENT_DNA_PATH || path.join(ROOT, 'content-dna');
export const PUBLIC = path.join(STUDIO, 'public');
export const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(STUDIO, 'models', 'ggml-small.bin');

const exec = promisify(execFile);
export const run = (cmd, args, opts = {}) => exec(cmd, args, { maxBuffer: 64 * 1024 * 1024, ...opts });

export const log = (...a) => console.log('›', ...a);

export function parseArgs(argv = process.argv.slice(2)) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) out[key] = true;
            else { out[key] = next; i++; }
        } else out._.push(a);
    }
    return out;
}

export function readDB() {
    const file = process.env.DB_PATH || path.join(ROOT, 'db.json');
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export async function brandsModule() {
    return import(path.join(ROOT, 'scripts', 'build-brands.mjs'));
}

export async function accountSlugOf(account) {
    const { accountSlug } = await import(path.join(ROOT, 'src', 'lib', 'accountDna.js'));
    return accountSlug(account);
}

/** Copia el brandbook publicado (logos, brand.json) al public del estudio para que Remotion lo lea. */
export function syncBrandsToStudio() {
    const src = path.join(ROOT, 'public', 'brands');
    if (!fs.existsSync(src)) throw new Error('No hay public/brands: corre "npm run brands" en la raíz del proyecto');
    fs.mkdirSync(PUBLIC, { recursive: true });
    fs.cpSync(src, path.join(PUBLIC, 'brands'), { recursive: true, dereference: true, filter: f => !f.endsWith('.zip') });
}

/** Ruta local de un asset raw: content-dna/<cuenta>/raw/<noche>/<archivo>. */
export function localRawPath(accountSlug, asset) {
    // Lo generado con IA ya vive en disco (ruta relativa a la carpeta que contiene content-dna/)
    if (asset.localPath) return path.join(CONTENT_DNA, '..', asset.localPath);
    const night = (asset.nightName || 'sin-noche').replace(/[/\\:]/g, '-');
    return path.join(CONTENT_DNA, accountSlug, 'raw', night, asset.name);
}

/** Actualiza una pieza: por la API del dashboard si está disponible, si no directo en el archivo de la base. */
export async function updateTask(taskId, changes) {
    const base = process.env.DASHBOARD_URL || `http://localhost:${process.env.PORT || 8090}`;
    const token = process.env.API_TOKEN;
    if (token) {
        try {
            const res = await fetch(`${base}/api/contentTasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(changes),
            });
            if (res.ok) return 'api';
        } catch { /* servidor apagado: se escribe en el archivo */ }
    }
    const file = process.env.DB_PATH || path.join(ROOT, 'db.json');
    const db = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const t = (db.contentTasks || []).find(x => x.id === taskId);
    if (!t) return 'not-found';
    Object.assign(t, changes);
    fs.writeFileSync(file, JSON.stringify(db, null, 2));
    return 'file';
}

export async function probe(file) {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
    const j = JSON.parse(stdout);
    const v = j.streams.find(s => s.codec_type === 'video');
    return {
        duration: Number(j.format.duration) || 0,
        width: v?.width, height: v?.height,
        hasAudio: j.streams.some(s => s.codec_type === 'audio'),
    };
}
