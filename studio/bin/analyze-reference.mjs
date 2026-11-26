// Analiza una referencia (video viral o tutorial) y escribe su receta/playbook.
// Uso: npm run analyze-reference -- <referenceId>
//
// Pasos: descarga con yt-dlp (o usa el archivo subido) → métricas y cortes de escena con ffmpeg →
// un frame por plano + hoja de contacto → transcripción con Whisper → análisis con IA (ve los frames) →
// PLAYBOOK.md + análisis en la referencia → índice de técnicas en content-dna/_library/TECNICAS.md
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT, CONTENT_DNA, readDB, run, probe, parseArgs, log } from './lib.mjs';
import { transcribe } from './transcribe.mjs';

export const LIBRARY = path.join(CONTENT_DNA, '_library');
const rel = p => path.relative(path.join(CONTENT_DNA, '..'), p);

/** Actualiza la referencia por la API del dashboard o directo en la base. */
export async function updateReference(id, changes) {
    const base = process.env.DASHBOARD_URL || `http://localhost:${process.env.PORT || 8090}`;
    if (process.env.API_TOKEN) {
        try {
            const res = await fetch(`${base}/api/studio/references/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.API_TOKEN}` },
                body: JSON.stringify(changes),
            });
            if (res.ok) return;
        } catch { /* servidor apagado */ }
    }
    const file = process.env.DB_PATH || path.join(ROOT, 'db.json');
    const db = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const r = (db.references || []).find(x => x.id === id);
    if (r) Object.assign(r, changes);
    fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

async function download(url, dir) {
    const args = ['-f', 'bv*[height<=1920]+ba/b', '--merge-output-format', 'mp4', '--no-playlist', '--write-info-json', '-o', path.join(dir, 'source.%(ext)s'), url];
    if (process.env.YTDLP_COOKIES_BROWSER) args.unshift('--cookies-from-browser', process.env.YTDLP_COOKIES_BROWSER);
    await run('yt-dlp', args, { timeout: 10 * 60 * 1000 });
    const video = fs.readdirSync(dir).find(f => /^source\.(mp4|mov|webm|mkv)$/.test(f));
    if (!video) throw new Error('yt-dlp no dejó un video. Si es Instagram/TikTok privado, sube el archivo a mano.');
    const infoFile = fs.readdirSync(dir).find(f => f.endsWith('.info.json'));
    const info = infoFile ? JSON.parse(fs.readFileSync(path.join(dir, infoFile), 'utf-8')) : {};
    return { file: path.join(dir, video), info: { title: info.title, uploader: info.uploader || info.channel, description: info.description, platform: info.extractor_key, views: info.view_count, likes: info.like_count } };
}

/** Tiempos de corte de escena (s). */
export async function detectCuts(file, threshold = 0.32) {
    const r = await run('ffmpeg', ['-hide_banner', '-i', file, '-vf', `select='gt(scene,${threshold})',showinfo`, '-an', '-f', 'null', '-']).catch(e => e);
    const times = [...String(r.stderr || '').matchAll(/pts_time:([\d.]+)/g)].map(m => Number(m[1]));
    // Descarta cortes pegados (< 0.2 s) que suelen ser flashes
    return times.filter((t, i) => i === 0 || t - times[i - 1] > 0.2);
}

async function keyframes(file, cuts, duration, dir, max = 14) {
    const bounds = [0, ...cuts, duration];
    let shots = bounds.slice(0, -1).map((start, i) => (start + bounds[i + 1]) / 2);
    if (shots.length > max) shots = Array.from({ length: max }, (_, i) => shots[Math.floor((i * shots.length) / max)]);
    const framesDir = path.join(dir, 'frames');
    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });
    const frames = [];
    for (const [i, t] of shots.entries()) {
        const out = path.join(framesDir, `${String(i + 1).padStart(2, '0')}.jpg`);
        await run('ffmpeg', ['-y', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', out]);
        if (fs.existsSync(out)) frames.push({ file: out, t });
    }
    const sheet = path.join(dir, 'sheet.jpg');
    if (frames.length) {
        const cols = Math.min(5, frames.length);
        const rows = Math.ceil(frames.length / cols);
        await run('ffmpeg', ['-y', '-framerate', '1', '-i', path.join(framesDir, '%02d.jpg'), '-vf', `scale=216:-2,tile=${cols}x${rows}:padding=4:margin=4:color=0x0b0b0b`, '-frames:v', '1', '-q:v', '3', sheet]);
    }
    return { frames, sheet: fs.existsSync(sheet) ? sheet : null };
}

function transcriptText(words) {
    const lines = [];
    let cur = null;
    for (const w of words) {
        if (!cur || w.startMs - cur.end > 700 || cur.text.length > 70) {
            if (cur) lines.push(cur);
            cur = { start: w.startMs, end: w.endMs, text: w.text.trim() };
        } else {
            cur.text += w.text;
            cur.end = w.endMs;
        }
    }
    if (cur) lines.push(cur);
    return lines.map(l => `[${(l.start / 1000).toFixed(1)}s] ${l.text.trim()}`).join('\n');
}

export async function analyzeReference(id) {
    const db = readDB();
    const ref = (db.references || []).find(r => r.id === id);
    if (!ref) throw new Error(`No existe la referencia ${id}`);
    const dir = path.join(LIBRARY, 'references', id);
    fs.mkdirSync(dir, { recursive: true });
    const step = async (label, progress) => { log(label); await updateReference(id, { status: 'analyzing', step: label, progress }); };

    // 1. Video
    let file = ref.sourcePath ? path.join(CONTENT_DNA, '..', ref.sourcePath) : null;
    let info = ref.info || {};
    if (!file || !fs.existsSync(file)) {
        if (!ref.url) throw new Error('La referencia no tiene link ni archivo');
        await step('Descargando video…', 5);
        const d = await download(ref.url, dir);
        file = d.file;
        info = d.info;
    }
    // 2. Métricas y cortes
    await step('Midiendo ritmo y cortes…', 25);
    const p = await probe(file);
    const cuts = await detectCuts(file);
    const stats = { duration: p.duration, width: p.width, height: p.height, hasAudio: p.hasAudio, cuts: cuts.length, avgShot: p.duration / (cuts.length + 1), cutsPerSecond: cuts.length / Math.max(1, p.duration) };
    // 3. Frames
    await step('Extrayendo un frame por plano…', 40);
    const { frames, sheet } = await keyframes(file, cuts, p.duration, dir);
    // 4. Transcripción
    let transcript = '';
    // Tutoriales largos: Whisper local tardaría mucho y Gemini ya oye el audio al ver el video.
    if (p.hasAudio && p.duration <= 20 * 60) {
        await step('Transcribiendo la voz con Whisper…', 55);
        try { transcript = transcriptText(await transcribe(file, { lang: ref.lang || 'auto' })); } catch (err) { log(`Sin transcripción: ${err.message}`); }
    }
    // 5. Análisis con IA
    await step('Analizando con IA (estructura, técnica, adaptaciones)…', 70);
    const { generateStructured } = await import(path.join(ROOT, 'src/services/contentStudio/llm.js'));
    const engine = await import(path.join(ROOT, 'src/services/contentStudio/referenceEngine.js'));
    const accounts = (db.socialMedia || []).map(a => ({ handler: a.handler, concept: a.dna?.concept, description: a.description, type: a.type }));
    const images = frames.slice(0, 12).map(f => ({ mediaType: 'image/jpeg', data: fs.readFileSync(f.file).toString('base64') }));
    const ask = imgs => generateStructured({
        system: engine.REFERENCE_SYSTEM,
        prompt: engine.referencePrompt({ ref, stats, cuts, transcript, info, accounts, hasImages: imgs.length > 0 }),
        schema: engine.ReferenceAnalysisSchema,
        images: imgs,
        task: 'reference',
        geminiApiKey: db.openclawConfig?.geminiApiKey,
    });
    let out;
    let usedFrames = images.length > 0;
    let usedVideo = false;
    // Primero Gemini ve el video completo (imagen + audio); si no hay cuota, se analiza con los frames.
    const apiKey = process.env.GEMINI_API_KEY || db.openclawConfig?.geminiApiKey;
    if (apiKey && process.env.REFERENCE_VIDEO !== 'off') {
        try {
            await step('Gemini está viendo el video completo…', 70);
            const { analyzeVideo } = await import(path.join(ROOT, 'src/services/contentStudio/geminiVideo.js'));
            const v = await analyzeVideo({
                url: ref.url, file, duration: p.duration, apiKey,
                system: engine.REFERENCE_SYSTEM,
                prompt: engine.referencePrompt({ ref, stats, cuts, transcript, info, accounts, hasImages: false, hasVideo: true }),
                schema: engine.ReferenceAnalysisSchema,
            });
            out = { data: v.data, provider: 'gemini-video', model: v.model };
            usedVideo = true;
        } catch (err) {
            log(`Gemini no pudo ver el video (${err.message.slice(0, 160)}…); sigo con los frames`);
            await step('Analizando con frames (Gemini sin cuota para video)…', 75);
        }
    }
    if (!out) try {
        out = await ask(images);
    } catch (err) {
        if (!images.length) throw err;
        // Si ningún modelo acepta imágenes ahora (saturación), se analiza con métricas, cortes y transcripción.
        log(`Sin visión (${err.message.slice(0, 120)}…); reintentando solo con texto`);
        await step('Analizando sin frames (la IA de visión está saturada)…', 80);
        out = await ask([]);
        usedFrames = false;
    }
    // 6. Playbook
    const md = engine.playbookMarkdown(ref, out.data, stats);
    fs.writeFileSync(path.join(dir, 'PLAYBOOK.md'), md);
    fs.writeFileSync(path.join(dir, 'analysis.json'), JSON.stringify({ stats, cuts, transcript, info, analysis: out.data, model: `${out.provider}:${out.model}` }, null, 2));
    await updateReference(id, {
        status: 'ready', step: null, progress: 100,
        title: ref.title || out.data.title,
        info,
        sourcePath: rel(file),
        sheetPath: sheet ? rel(sheet) : null,
        thumbPath: frames[0] ? rel(frames[0].file) : null,
        framePaths: frames.map(f => rel(f.file)),
        playbookPath: rel(path.join(dir, 'PLAYBOOK.md')),
        stats, cuts, transcript,
        analysis: out.data,
        analyzedBy: `${out.provider}:${out.model}${usedVideo ? ' (video completo)' : usedFrames ? ' (frames)' : ' (sin frames)'}`,
        analyzedAt: new Date().toISOString(),
    });
    writeTechniqueIndex();
    log(`Listo: ${rel(path.join(dir, 'PLAYBOOK.md'))}`);
}

/** Índice de técnicas aprendidas (lo lee Claude Code para saber qué sabe hacer y qué falta construir). */
export function writeTechniqueIndex() {
    const refs = (readDB().references || []).filter(r => r.analysis);
    const rows = refs.map(r => `| ${r.analysis.technique.name} | ${r.analysis.technique.category} | ${r.type} | ${r.analysis.recreate.difficulty} | ${r.analysis.recreate.needsNewBuild ? 'Por construir' : 'Disponible'} | [${r.title || r.analysis.title}](references/${r.id}/PLAYBOOK.md) |`);
    fs.mkdirSync(LIBRARY, { recursive: true });
    fs.writeFileSync(path.join(LIBRARY, 'TECNICAS.md'), `# Técnicas y formatos aprendidos

Generado desde Redes Sociales → Referencias. Cada fila enlaza su playbook (gancho, estructura, edición, técnica y cómo recrearla).

| Técnica | Categoría | Origen | Dificultad | En la máquina | Playbook |
|---|---|---|---|---|---|
${rows.join('\n')}
`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const id = parseArgs()._[0];
    if (!id) {
        console.error('Uso: npm run analyze-reference -- <referenceId>');
        process.exit(1);
    }
    try {
        await analyzeReference(id);
    } catch (err) {
        console.error(`✗ ${err.message}`);
        await updateReference(id, { status: 'error', step: null, error: err.message }).catch(() => {});
        process.exit(1);
    }
}
