// Transcribe un video/audio con Whisper (local, Metal) y devuelve subtítulos palabra por palabra
// en el formato Caption de Remotion.  Uso: npm run transcribe -- <archivo> [--lang es] [--out captions.json]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { run, parseArgs, WHISPER_MODEL, log } from './lib.mjs';

/** Convierte el JSON completo de whisper-cli (-ojf) en Captions: une tokens en palabras. */
export function whisperToCaptions(json) {
    const captions = [];
    for (const seg of json.transcription || []) {
        for (const tok of seg.tokens || []) {
            const text = tok.text || '';
            if (!text.trim() || /^\[.*\]$/.test(text.trim()) || text.startsWith('[_')) continue;
            const from = tok.offsets?.from ?? 0;
            const to = tok.offsets?.to ?? from;
            const last = captions[captions.length - 1];
            if (last && !text.startsWith(' ')) {
                last.text += text;
                last.endMs = to;
            } else {
                captions.push({ text: text.startsWith(' ') ? text : ` ${text}`, startMs: from, endMs: to, timestampMs: Math.round((from + to) / 2), confidence: tok.p ?? null });
            }
        }
    }
    return captions;
}

export async function transcribe(file, { lang = 'es' } = {}) {
    if (!fs.existsSync(WHISPER_MODEL)) throw new Error(`Falta el modelo de Whisper en ${WHISPER_MODEL}`);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));
    const wav = path.join(tmp, 'audio.wav');
    await run('ffmpeg', ['-y', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
    const outBase = path.join(tmp, 'out');
    await run('whisper-cli', ['-m', WHISPER_MODEL, '-f', wav, '-l', lang, '-ojf', '-of', outBase, '-np', '--max-len', '1', '--split-on-word']);
    const json = JSON.parse(fs.readFileSync(`${outBase}.json`, 'utf-8'));
    fs.rmSync(tmp, { recursive: true, force: true });
    return whisperToCaptions(json);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = parseArgs();
    const file = args._[0];
    if (!file) {
        console.error('Uso: npm run transcribe -- <archivo> [--lang es] [--out captions.json]');
        process.exit(1);
    }
    const captions = await transcribe(path.resolve(file), { lang: args.lang || 'es' });
    const out = args.out || `${file.replace(/\.[^.]+$/, '')}.captions.json`;
    fs.writeFileSync(out, JSON.stringify(captions, null, 2));
    log(`${captions.length} palabras → ${out}`);
}
