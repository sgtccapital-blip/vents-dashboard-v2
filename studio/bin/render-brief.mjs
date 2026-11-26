// Renderiza una pieza desarrollada: material raw + EDL + línea de la cuenta → MP4 1080×1920 listo para subir.
// Uso: npm run render-brief -- <taskId> [--captions] [--music ruta.mp3] [--no-master]
//
// Pasos: descarga el raw si falta → normaliza cada plano con ffmpeg (9:16, 30 fps, recortado) →
// opcional: subtítulos palabra por palabra con Whisper → Remotion (textos, transiciones, color, cierre de marca) →
// masterización de audio a -14 LUFS → portada + hoja de contacto → actualiza la pieza en el dashboard.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { STUDIO, PUBLIC, CONTENT_DNA, readDB, brandsModule, accountSlugOf, localRawPath, syncBrandsToStudio, updateTask, run, probe, parseArgs, log } from './lib.mjs';
import { fetchRawForTask } from './fetch-raw.mjs';
import { transcribe } from './transcribe.mjs';

const slugify = s => String(s || 'pieza').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

let bundled = null;
export async function getBundle() {
    if (!bundled) {
        log('Empaquetando composiciones de Remotion…');
        bundled = await bundle({ entryPoint: path.join(STUDIO, 'src/index.js'), publicDir: PUBLIC });
    }
    return bundled;
}

/** Normaliza un plano: recorta in→out, encuadra a 1080×1920 (cover), 30 fps, H.264 por hardware. */
async function prepareClip(src, dest, { inSec = 0, outSec, kind }) {
    if (kind === 'image') {
        await run('magick', [src, '-auto-orient', '-resize', '1080x1920^', '-gravity', 'center', '-extent', '1080x1920', '-quality', '92', dest]);
        return;
    }
    const info = await probe(src);
    const start = Math.max(0, Math.min(inSec, Math.max(0, info.duration - 0.5)));
    const dur = Math.max(0.5, Math.min((outSec ?? info.duration) - start, info.duration - start));
    await run('ffmpeg', ['-y', '-ss', String(start), '-i', src, '-t', String(dur),
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1',
        '-c:v', 'h264_videotoolbox', '-b:v', '14M', '-pix_fmt', 'yuv420p',
        ...(info.hasAudio ? ['-c:a', 'aac', '-ar', '48000', '-ac', '2'] : ['-an']),
        dest]);
    return { duration: dur, hasAudio: info.hasAudio };
}

/** Loudnorm en dos pasadas (medir y aplicar lineal) para llegar a -14 LUFS / -1.5 dBTP también en clips cortos. */
export async function masterAudio(input, output, { target = -14 } = {}) {
    const measure = await run('ffmpeg', ['-hide_banner', '-i', input, '-af', `loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']).catch(e => e);
    const block = String(measure.stderr).match(/\{[^{}]*"target_offset"[^{}]*\}/);
    if (!block) throw new Error('No se pudo medir el volumen del audio');
    const m = JSON.parse(block[0]);
    const filter = `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    await run('ffmpeg', ['-y', '-i', input, '-c:v', 'copy', '-af', filter, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', output]);
}

export async function renderBrief(taskId, { captions = false, music = null, master = true } = {}) {
    const db = readDB();
    const task = (db.contentTasks || []).find(t => t.id === taskId);
    if (!task) throw new Error(`No existe la pieza ${taskId}`);
    if (!task.development?.edl?.length) throw new Error('La pieza no tiene guion de edición: desarróllala primero en el dashboard');
    const account = (db.socialMedia || []).find(a => a.id === task.accountId);
    const { loadBrands } = await brandsModule();
    const brand = loadBrands().find(b => b.accountId === task.accountId);
    if (!brand) throw new Error(`${account.handler} no tiene línea gráfica en brands/`);
    const acct = await accountSlugOf(account);

    // 1. Material raw local
    await fetchRawForTask(taskId, db);
    const assets = new Map((db.rawAssets || []).map(a => [a.id, a]));

    // 2. Planos normalizados
    const job = path.join(PUBLIC, 'jobs', taskId);
    fs.rmSync(job, { recursive: true, force: true });
    fs.mkdirSync(job, { recursive: true });
    const edl = task.development.edl.slice().sort((a, b) => a.order - b.order);
    const segments = [];
    let cursorMs = 0;
    const allCaptions = [];
    for (const [i, s] of edl.entries()) {
        const asset = assets.get(s.assetId);
        const base = { overlay: s.overlay, subtitle: s.subtitle, transition: s.transition, purpose: s.purpose, kicker: i === 0 ? task.development.cover?.title : undefined };
        if (!asset) {
            segments.push({ ...base, kind: 'graphic', inSec: 0, outSec: Math.max(1, (s.outSec || 2) - (s.inSec || 0)) });
            cursorMs += segments.at(-1).outSec * 1000;
            continue;
        }
        const ext = asset.kind === 'image' ? 'jpg' : 'mp4';
        const name = `${String(i + 1).padStart(2, '0')}.${ext}`;
        log(`Plano ${i + 1}/${edl.length}: ${asset.name} [${s.inSec}s → ${s.outSec}s]`);
        const prep = await prepareClip(localRawPath(acct, asset), path.join(job, name), { inSec: s.inSec, outSec: s.outSec, kind: asset.kind });
        const dur = asset.kind === 'image' ? Math.max(1, (s.outSec || 2) - (s.inSec || 0)) : prep.duration;
        segments.push({ ...base, kind: asset.kind, src: `jobs/${taskId}/${name}`, inSec: 0, outSec: dur });
        if (captions && asset.kind === 'video' && prep.hasAudio) {
            const words = await transcribe(path.join(job, name));
            allCaptions.push(...words.map(w => ({ ...w, startMs: w.startMs + cursorMs, endMs: w.endMs + cursorMs, timestampMs: (w.timestampMs ?? w.startMs) + cursorMs })));
        }
        cursorMs += dur * 1000;
    }

    let musicProp = null;
    if (music) {
        fs.copyFileSync(music, path.join(job, `music${path.extname(music)}`));
        musicProp = { src: `jobs/${taskId}/music${path.extname(music)}`, volume: 0.55 };
    }

    // 3. Render con Remotion
    syncBrandsToStudio();
    const inputProps = {
        brandSlug: brand.slug,
        handle: account.handler,
        segments,
        captions: allCaptions,
        endcard: { cta: task.development.cta || brand.content?.video?.endcard?.cta || brand.sample.cta, seconds: 2 },
        music: musicProp,
    };
    const serveUrl = await getBundle();
    const composition = await selectComposition({ serveUrl, id: 'BriefReel', inputProps });
    const outDir = path.join(CONTENT_DNA, acct, 'renders');
    fs.mkdirSync(outDir, { recursive: true });
    const file = `${task.publishDate || new Date().toISOString().slice(0, 10)}-${slugify(task.title)}`;
    const raw = path.join(outDir, `${file}.raw.mp4`);
    const out = path.join(outDir, `${file}.mp4`);
    log(`Renderizando ${composition.durationInFrames} frames (${(composition.durationInFrames / 30).toFixed(1)} s)…`);
    let lastPct = -10;
    await renderMedia({
        composition, serveUrl, codec: 'h264', outputLocation: raw, inputProps, crf: 18, pixelFormat: 'yuv420p', audioBitrate: '320k',
        onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p >= lastPct + 10) { lastPct = p; log(`  ${p}%`); } },
    });

    // 4. Masterización de audio para Instagram (-14 LUFS)
    if (master && (await probe(raw)).hasAudio) {
        await masterAudio(raw, out);
        fs.rmSync(raw);
    } else {
        fs.renameSync(raw, out);
    }

    // 5. Portada y hoja de contacto
    const coverIdx = Math.max(0, edl.findIndex(s => s.assetId === task.development.cover?.assetId));
    const coverFrame = Math.round((segments.slice(0, coverIdx).reduce((n, s) => n + s.outSec, 0) + Math.min(0.8, segments[coverIdx].outSec / 2)) * 30);
    const cover = path.join(outDir, `${file}.cover.jpg`);
    await renderStill({ composition, serveUrl, output: cover, inputProps, frame: Math.min(coverFrame, composition.durationInFrames - 1), imageFormat: 'jpeg', jpegQuality: 92 });
    const sheet = path.join(outDir, `${file}.sheet.jpg`);
    const total = composition.durationInFrames / 30;
    await run('ffmpeg', ['-y', '-i', out, '-vf', `fps=${(9 / total).toFixed(4)},scale=360:-1,tile=3x3:padding=6:color=black`, '-frames:v', '1', sheet]);

    // 6. Historias de apoyo del brief (gráficos 9:16 con la línea de la cuenta)
    const storyPaths = [];
    for (const [i, story] of (task.development.stories || []).entries()) {
        const props = { brandSlug: brand.slug, type: story.type, text: story.text, handle: account.handler };
        if (story.type === 'poll') {
            const [q, opts] = story.text.split('?');
            const options = (opts || '').split(/\/|\||,| o /).map(x => x.trim()).filter(Boolean);
            props.poll = { q: `${q}?`, a: options.length >= 2 ? options.slice(0, 2) : (brand.content?.stories?.poll?.a || ['Sí', 'No']) };
        }
        const comp = await selectComposition({ serveUrl, id: 'StoryGraphic', inputProps: props });
        const storyFile = path.join(outDir, `${file}.story-${i + 1}-${story.type}.png`);
        await renderStill({ composition: comp, serveUrl, output: storyFile, inputProps: props, imageFormat: 'png' });
        storyPaths.push(storyFile);
    }

    fs.rmSync(job, { recursive: true, force: true });
    const rel = p => path.relative(path.join(CONTENT_DNA, '..'), p);
    const where = await updateTask(taskId, { renderPath: rel(out), coverPath: rel(cover), sheetPath: rel(sheet), storyPaths: storyPaths.map(rel), renderedAt: new Date().toISOString() });
    log(`Listo: ${rel(out)} (pieza actualizada vía ${where})`);
    return { out, cover, sheet };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = parseArgs();
    const taskId = args._[0];
    if (!taskId) {
        console.error('Uso: npm run render-brief -- <taskId> [--captions] [--music ruta.mp3] [--no-master]');
        process.exit(1);
    }
    try {
        await renderBrief(taskId, { captions: Boolean(args.captions), music: args.music || null, master: !args['no-master'] });
    } catch (err) {
        console.error(`✗ ${err.message}`);
        process.exit(1);
    }
}
