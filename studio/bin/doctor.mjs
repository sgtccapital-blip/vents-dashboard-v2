// Verifica que la máquina de contenido tenga todo instalado.  Uso: npm run doctor
import fs from 'fs';
import path from 'path';
import { run, WHISPER_MODEL, ROOT } from './lib.mjs';

const checks = [
    ['ffmpeg', () => run('ffmpeg', ['-version']).then(r => r.stdout.split('\n')[0])],
    ['ffprobe', () => run('ffprobe', ['-version']).then(r => r.stdout.split('\n')[0])],
    ['whisper-cli', () => run('whisper-cli', ['--help']).then(() => 'ok').catch(e => (e.stderr?.includes('usage') ? 'ok' : Promise.reject(e)))],
    ['Modelo Whisper', async () => { if (!fs.existsSync(WHISPER_MODEL)) throw new Error(`falta ${WHISPER_MODEL}`); return `${(fs.statSync(WHISPER_MODEL).size / 1e6).toFixed(0)} MB`; }],
    ['ImageMagick', () => run('magick', ['-version']).then(r => r.stdout.split('\n')[0])],
    ['rclone', () => run('rclone', ['version']).then(r => r.stdout.split('\n')[0])],
    ['exiftool', () => run('exiftool', ['-ver']).then(r => r.stdout.trim())],
    ['Remotion', async () => JSON.parse(fs.readFileSync(path.join(ROOT, 'studio/node_modules/remotion/package.json'), 'utf-8')).version],
    ['Navegador de render', async () => { const { ensureBrowser } = await import('@remotion/renderer'); await ensureBrowser(); return 'listo'; }],
    ['Marcas publicadas', async () => { const n = fs.readdirSync(path.join(ROOT, 'public/brands')).filter(d => fs.existsSync(path.join(ROOT, 'public/brands', d, 'brand.json'))).length; if (!n) throw new Error('corre npm run brands'); return `${n} marcas`; }],
    ['Google Drive', async () => (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'cuenta de servicio' : process.env.GOOGLE_API_KEY ? 'API key' : Promise.reject(new Error('sin credenciales (ver docs/ESTUDIO_CONTENIDO.md)')))],
    ['IA', async () => [process.env.ANTHROPIC_API_KEY && 'Claude', process.env.GEMINI_API_KEY && 'Gemini'].filter(Boolean).join(' + ') || Promise.reject(new Error('sin ANTHROPIC_API_KEY ni GEMINI_API_KEY'))],
];

let failed = 0;
for (const [name, fn] of checks) {
    try {
        console.log(`✓ ${name.padEnd(20)} ${await fn()}`);
    } catch (err) {
        failed++;
        console.log(`✗ ${name.padEnd(20)} ${(err.message || String(err)).split('\n')[0]}`);
    }
}
process.exit(failed ? 1 : 0);
