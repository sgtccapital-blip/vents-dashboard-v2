// Biblioteca de referencias: links de YouTube, Instagram, TikTok u otras redes que se guardan
// para aprender (tutoriales) o copiar ideas (motion graphics, edición, formatos).
// Cada link se ve completo con Gemini (video + audio), se desglosa en pasos, técnicas y estilo
// y entra al mismo índice del RAG con source 'reference'.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { z } from 'zod';
import { chunkText } from './text.js';

const MAX_ATTEMPTS = 3;
const LONG_VIDEO_SEC = 15 * 60;   // desde aquí se analiza en resolución baja (menos tokens)
const HUGE_VIDEO_SEC = 3 * 3600;  // más largo que esto: solo metadatos y subtítulos

export const REFERENCE_TYPES = ['tutorial', 'motion_graphics', 'edicion', 'referencia_visual', 'formato_contenido', 'musica_audio', 'otro'];

const s = () => z.string().default('');
const list = () => z.array(z.string()).default([]);
export const ReferenceSchema = z.object({
    title: s().describe('Título claro de lo que enseña o muestra el video'),
    type: z.enum(REFERENCE_TYPES).default('otro'),
    summary: s().describe('Qué es y qué se aprende, en 3-5 frases'),
    whyUseful: s().describe('Para qué nos sirve en ARRIVE (eventos, reels, historias, flyers, motion)'),
    tools: list().describe('Programas, plugins, efectos, apps o equipos que se usan o se mencionan'),
    steps: z.array(z.object({ t: s().describe('mm:ss'), step: s() })).default([]).describe('Paso a paso reproducible (si es tutorial); vacío si no aplica'),
    techniques: z.array(z.object({ name: s(), how: s().describe('Cómo se logra, con parámetros concretos si se ven o se dicen') })).default([]),
    style: z.object({
        pacing: s(), cuts: s(), typography: s(), color: s(), transitions: s(), camera: s(), audio: s(),
    }).default({}),
    keyMoments: z.array(z.object({ t: s(), what: s() })).default([]),
    applyToArrive: list().describe('Ideas concretas para aplicarlo en nuestras cuentas o eventos'),
    recreateBrief: s().describe('Instrucciones para recrearlo con nuestra máquina de contenido (Remotion + ffmpeg) o en After Effects/CapCut'),
    transcript: s().describe('Lo que se dice, condensado y fiel (no inventes); vacío si no hay voz'),
    tags: list(),
});

const SYSTEM = `Eres el analista de referencias de ARRIVE Agency, una agencia de eventos y nightlife que produce reels, historias, flyers y motion graphics para sus marcas.
Te pasan un video (tutorial o referencia visual) y tienes que desglosarlo para que un editor o un agente de IA pueda aprender de él y reproducirlo sin volver a verlo.
Sé concreto y fiel a lo que se ve y se oye: nombres exactos de herramientas y efectos, parámetros, atajos, tiempos (mm:ss). No inventes lo que no aparece.
Escribe en español aunque el video esté en otro idioma (los nombres de herramientas y efectos van como en el programa).`;

const promptFor = (meta, note) => `Analiza este video${meta.title ? ` ("${meta.title}"` + (meta.author ? ` de ${meta.author}` : '') + ')' : ''}.
${meta.platform ? `Plataforma: ${meta.platform}.` : ''}${meta.duration ? ` Duración: ${Math.round(meta.duration)} s.` : ''}
${note ? `Para qué lo guardó el usuario: ${note}` : ''}
${meta.description ? `Descripción original:\n${meta.description.slice(0, 3000)}` : ''}
${meta.subtitles ? `Subtítulos/transcripción disponible:\n${meta.subtitles.slice(0, 20000)}` : ''}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function platformOf(url) {
    const h = (() => { try { return new URL(url).hostname.replace(/^www\.|^m\./, ''); } catch { return ''; } })();
    if (/youtube\.com|youtu\.be/.test(h)) return 'youtube';
    if (/instagram\.com/.test(h)) return 'instagram';
    if (/tiktok\.com/.test(h)) return 'tiktok';
    if (/vimeo\.com/.test(h)) return 'vimeo';
    if (/x\.com|twitter\.com/.test(h)) return 'x';
    if (/facebook\.com|fb\.watch/.test(h)) return 'facebook';
    if (/pinterest\./.test(h)) return 'pinterest';
    if (/behance\.net/.test(h)) return 'behance';
    return h || 'web';
}

/** Quita parámetros de rastreo para no guardar el mismo link dos veces. */
export function normalizeUrl(raw) {
    const u = new URL(String(raw).trim());
    if (!/^https?:$/.test(u.protocol)) throw new Error('El link debe empezar con http(s)://');
    u.hash = '';
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
    if (/youtube\.com$/.test(host)) {
        const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
        const v = shorts?.[1] || u.searchParams.get('v');
        if (v) return `https://www.youtube.com/watch?v=${v}`;
    }
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|igsh|igshid|si|fbclid|feature|is_from_webapp|sender_device|_r|_t)/i.test(k)) u.searchParams.delete(k);
    return u.toString().replace(/\/$/, '');
}

function findBin(name, envVar) {
    if (process.env[envVar]) return process.env[envVar];
    for (const dir of ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']) {
        const p = path.join(dir, name);
        if (fs.existsSync(p)) return p;
    }
    return name;
}

const run = (bin, args, { timeout = 120000 } = {}) => new Promise((resolve, reject) => {
    execFile(bin, args, { timeout, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).toString().trim().split('\n').slice(-3).join(' ').slice(0, 400)));
        resolve(stdout.toString());
    });
});

/** Convierte un .vtt en texto plano sin tiempos ni líneas repetidas (los autosubs de YouTube repiten mucho). */
function vttToText(vtt) {
    const out = [];
    for (const line of vtt.split('\n')) {
        const l = line.replace(/<[^>]+>/g, '').trim();
        if (!l || /^WEBVTT|^Kind:|^Language:|-->|^\d+$/.test(l)) continue;
        if (out[out.length - 1] !== l) out.push(l);
    }
    return out.join(' ');
}

export function referenceToText(item) {
    const a = item.analysis || {};
    const m = item.meta || {};
    const lines = [
        `Referencia (${a.type || 'otro'}) · ${a.title || m.title || item.url}`,
        `Link: ${item.url}${m.author ? ` · Autor: ${m.author}` : ''}${m.platform ? ` · ${m.platform}` : ''}`,
        item.note ? `Por qué se guardó: ${item.note}` : '',
        item.account ? `Cuenta/marca: ${item.account}` : '',
        a.summary ? `\nResumen: ${a.summary}` : '',
        a.whyUseful ? `Para qué nos sirve: ${a.whyUseful}` : '',
        a.tools?.length ? `Herramientas: ${a.tools.join(', ')}` : '',
    ];
    if (a.steps?.length) lines.push('\nPaso a paso:', ...a.steps.map((x, i) => `${i + 1}. ${x.t ? `[${x.t}] ` : ''}${x.step}`));
    if (a.techniques?.length) lines.push('\nTécnicas:', ...a.techniques.map(x => `- ${x.name}: ${x.how}`));
    const st = a.style || {};
    const styleLines = [['Ritmo', st.pacing], ['Cortes', st.cuts], ['Tipografía', st.typography], ['Color', st.color], ['Transiciones', st.transitions], ['Cámara', st.camera], ['Audio', st.audio]].filter(([, v]) => v);
    if (styleLines.length) lines.push('\nEstilo:', ...styleLines.map(([k, v]) => `- ${k}: ${v}`));
    if (a.keyMoments?.length) lines.push('\nMomentos clave:', ...a.keyMoments.map(x => `- ${x.t ? `${x.t} ` : ''}${x.what}`));
    if (a.applyToArrive?.length) lines.push('\nCómo aplicarlo en ARRIVE:', ...a.applyToArrive.map(x => `- ${x}`));
    if (a.recreateBrief) lines.push(`\nCómo recrearlo: ${a.recreateBrief}`);
    if (a.tags?.length || item.tags?.length) lines.push(`\nEtiquetas: ${[...new Set([...(item.tags || []), ...(a.tags || [])])].join(', ')}`);
    if (a.transcript) lines.push(`\nTranscripción (condensada):\n${a.transcript}`);
    else if (!item.analysis && m.description) lines.push(`\nDescripción:\n${m.description}`);
    return lines.filter(Boolean).join('\n');
}

export function createReferenceLibrary({ dataDir, store, embedMissing, getGeminiKey, generateStructured, log = console }) {
    const file = path.join(dataDir, 'references.json');
    const workDir = path.join(os.tmpdir(), 'arrive-references');
    const ytdlp = findBin('yt-dlp', 'YTDLP_PATH');
    // Modelos que ven video, en orden. Cada uno tiene su propia cuota diaria en el plan gratis
    // (3.8 Flash y 3 Flash: 20/día; Flash Lite: 500/día), así que al agotarse uno se pasa al siguiente.
    // 3.6 Flash queda fuera a propósito: lo usa Jarvis.
    const videoModels = () => (process.env.REFERENCE_VIDEO_MODELS || 'gemini-3.8-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite').split(',').map(x => x.trim()).filter(Boolean);
    const cookiesBrowser = () => process.env.REFERENCE_COOKIES_BROWSER || ''; // p. ej. "chrome" para posts de IG que piden sesión

    let state = { items: {} };
    if (fs.existsSync(file)) {
        try { state = { items: {}, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { log.error('[Referencias] references.json ilegible:', e.message); }
    }
    for (const it of Object.values(state.items)) if (it.status === 'processing') it.status = 'pending';
    const save = () => {
        const tmp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
        fs.renameSync(tmp, file);
    };

    const worker = { running: false, current: null, blockedReason: '' };

    // ─── yt-dlp: metadatos, subtítulos y descarga ───
    const cookieArgs = () => (cookiesBrowser() ? ['--cookies-from-browser', cookiesBrowser()] : []);

    async function fetchMeta(url) {
        const raw = await run(ytdlp, ['-J', '--no-playlist', '--no-warnings', ...cookieArgs(), url], { timeout: 90000 });
        const j = JSON.parse(raw);
        const entry = j._type === 'playlist' ? (j.entries || [])[0] || j : j;
        return {
            title: entry.title || j.title || '',
            author: entry.uploader || entry.channel || entry.creator || j.uploader || '',
            description: (entry.description || j.description || '').slice(0, 6000),
            duration: entry.duration || 0,
            thumbnail: entry.thumbnail || j.thumbnail || '',
            uploadDate: entry.upload_date ? `${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}` : '',
            chapters: (entry.chapters || []).map(c => ({ t: Math.round(c.start_time), title: c.title })),
            views: entry.view_count || null,
        };
    }

    async function fetchSubtitles(url, dir) {
        try {
            await run(ytdlp, ['--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'es.*,en.*', '--sub-format', 'vtt', '--no-playlist', '--no-warnings', ...cookieArgs(), '-o', path.join(dir, 'subs.%(ext)s'), url], { timeout: 90000 });
            const vtt = fs.readdirSync(dir).filter(f => f.endsWith('.vtt')).sort((a, b) => (a.includes('.es') ? -1 : 0) - (b.includes('.es') ? -1 : 0))[0];
            return vtt ? vttToText(fs.readFileSync(path.join(dir, vtt), 'utf8')) : '';
        } catch { return ''; }
    }

    async function download(url, dir, duration) {
        const height = duration > LONG_VIDEO_SEC ? 360 : 720;
        await run(ytdlp, [
            '-f', `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/b[height<=${height}][ext=mp4]/bv*[height<=${height}]+ba/b`,
            '--merge-output-format', 'mp4', '--max-filesize', '1800M', '--no-playlist', '--no-warnings',
            ...cookieArgs(), '-o', path.join(dir, 'video.%(ext)s'), url,
        ], { timeout: 20 * 60000 });
        const f = fs.readdirSync(dir).find(x => /^video\.(mp4|webm|mkv|mov)$/.test(x));
        if (!f) throw new Error('yt-dlp no dejó ningún video (¿es un post solo de fotos?)');
        return path.join(dir, f);
    }

    // ─── Gemini: subir el video y analizarlo ───
    const GEM = 'https://generativelanguage.googleapis.com';

    async function uploadToGemini(filePath, apiKey) {
        const size = fs.statSync(filePath).size;
        const mime = filePath.endsWith('.webm') ? 'video/webm' : filePath.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
        const start = await fetch(`${GEM}/upload/v1beta/files`, {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': String(size), 'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { display_name: path.basename(path.dirname(filePath)) } }),
        });
        const uploadUrl = start.headers.get('x-goog-upload-url');
        if (!start.ok || !uploadUrl) throw new Error(`Gemini Files ${start.status}: ${(await start.text()).slice(0, 200)}`);
        const up = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
            body: fs.readFileSync(filePath),
            signal: AbortSignal.timeout(15 * 60000),
        });
        if (!up.ok) throw new Error(`Gemini Files ${up.status}: ${(await up.text()).slice(0, 200)}`);
        let { file: f } = await up.json();
        for (let i = 0; f.state === 'PROCESSING' && i < 120; i++) {
            await sleep(5000);
            f = await (await fetch(`${GEM}/v1beta/${f.name}`, { headers: { 'x-goog-api-key': apiKey } })).json();
        }
        if (f.state !== 'ACTIVE') throw new Error(`Gemini no pudo procesar el video (${f.state})`);
        return { name: f.name, uri: f.uri, mimeType: f.mimeType || mime };
    }

    const deleteGeminiFile = (name, apiKey) => fetch(`${GEM}/v1beta/${name}`, { method: 'DELETE', headers: { 'x-goog-api-key': apiKey } }).catch(() => {});

    /** Prueba los modelos de video en orden; si uno no tiene cuota o está saturado, sigue con el próximo. */
    async function analyzeVideo(args) {
        const errors = [];
        for (const model of videoModels()) {
            try {
                return { analysis: await analyzeVideoWith(model, args), model };
            } catch (e) {
                errors.push(`${model}: ${e.message.slice(0, 160)}`);
                if (!/\b(429|500|503|504)\b|quota|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|\b404\b/i.test(e.message)) throw e;
            }
        }
        throw new Error(errors.join(' | '));
    }

    async function analyzeVideoWith(model, { fileData, meta, note, apiKey }) {
        const jsonSchema = z.toJSONSchema(ReferenceSchema);
        const long = (meta.duration || 0) > LONG_VIDEO_SEC;
        const res = await fetch(`${GEM}/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM }] },
                contents: [{ role: 'user', parts: [{ fileData }, { text: `${promptFor(meta, note)}\n\nResponde solo con JSON que cumpla este esquema:\n${JSON.stringify(jsonSchema)}` }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.3, ...(long ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}) },
            }),
            signal: AbortSignal.timeout(10 * 60000),
        });
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        if (!text) throw new Error(`Gemini no devolvió análisis (${json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason || 'vacío'})`);
        return ReferenceSchema.parse(JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')));
    }

    /** Sin video (post de fotos, privado, cuota de subida…): análisis solo con texto (descripción + subtítulos). */
    async function analyzeText({ meta, note }) {
        const { data, model } = await generateStructured({
            system: SYSTEM,
            prompt: `${promptFor(meta, note)}\n\nNo tienes el video, solo este texto: desglosa lo que se pueda y deja vacío lo que no se sepa.`,
            schema: ReferenceSchema,
            task: 'reference',
            geminiApiKey: getGeminiKey(),
        });
        return { analysis: data, model };
    }

    // ─── Proceso de un link ───
    async function processItem(item) {
        const dir = path.join(workDir, item.id);
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const apiKey = getGeminiKey();
        try {
            try { item.meta = { ...item.meta, ...(await fetchMeta(item.url)) }; } catch (e) { item.metaError = e.message; }
            const meta = { ...item.meta, platform: item.platform };
            meta.subtitles = await fetchSubtitles(item.url, dir);
            item.meta.hasSubtitles = !!meta.subtitles;

            let analysis = null;
            let usedModel = '';
            let mode = '';
            const errors = [];
            if (apiKey && !(meta.duration > HUGE_VIDEO_SEC)) {
                // YouTube público: Gemini lo ve directo desde el link, sin descargar.
                if (item.platform === 'youtube') {
                    try {
                        ({ analysis, model: usedModel } = await analyzeVideo({ fileData: { fileUri: item.url, mimeType: 'video/*' }, meta, note: item.note, apiKey }));
                        mode = 'video';
                    } catch (e) { errors.push(`YouTube directo: ${e.message}`); if (/\b429\b|RESOURCE_EXHAUSTED/.test(e.message)) throw e; }
                }
                if (!analysis) {
                    let uploaded = null;
                    try {
                        const video = await download(item.url, dir, meta.duration);
                        uploaded = await uploadToGemini(video, apiKey);
                        ({ analysis, model: usedModel } = await analyzeVideo({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType }, meta, note: item.note, apiKey }));
                        mode = 'video';
                    } catch (e) {
                        errors.push(`Video: ${e.message}`);
                        if (/\b429\b|RESOURCE_EXHAUSTED/.test(e.message)) throw e;
                    } finally {
                        if (uploaded) deleteGeminiFile(uploaded.name, apiKey);
                    }
                }
            }
            if (!analysis) {
                if (!meta.description && !meta.subtitles && !meta.title) throw new Error(errors.join(' | ') || item.metaError || 'No se pudo leer el link');
                ({ analysis, model: usedModel } = await analyzeText({ meta, note: item.note }));
                mode = 'texto';
            }
            item.analysis = analysis;
            item.mode = mode;
            item.warnings = errors;
            item.model = usedModel;
            item.status = 'done';
            item.error = '';
            indexItem(item);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    function indexItem(item) {
        const a = item.analysis || {};
        store.upsertDoc({
            id: `reference:${item.id}`,
            source: 'reference',
            kind: a.type || 'otro',
            title: `Referencia · ${a.title || item.meta?.title || item.url}`,
            meta: {
                namespace: 'reference', url: item.url, platform: item.platform, author: item.meta?.author || '',
                account: item.account || '', tags: [...new Set([...(item.tags || []), ...(a.tags || [])])],
                date: item.createdAt, mode: item.mode,
            },
        }, chunkText(referenceToText(item), 2400, 200));
    }

    async function runWorker() {
        if (worker.running) return;
        worker.running = true;
        worker.blockedReason = '';
        try {
            for (;;) {
                const next = Object.values(state.items)
                    .filter(it => it.status === 'pending')
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
                if (!next) break;
                next.status = 'processing';
                next.attempts = (next.attempts || 0) + 1;
                worker.current = next.id;
                save();
                try {
                    await processItem(next);
                    log.log(`[Referencias] Analizada: ${next.analysis?.title || next.url} (${next.mode})`);
                } catch (e) {
                    const quota = /\b429\b|quota|RESOURCE_EXHAUSTED/i.test(e.message);
                    next.error = e.message.slice(0, 500);
                    next.status = quota || next.attempts < MAX_ATTEMPTS ? 'pending' : 'error';
                    if (quota) { next.attempts -= 1; worker.blockedReason = 'Gemini sin cuota: se reintenta cada 10 minutos'; save(); break; }
                    if (next.status === 'pending') { save(); await sleep(5000); }
                }
                save();
                try { await embedMissing(); } catch (e) { log.warn('[Referencias] Embeddings pendientes:', e.message); }
            }
        } finally {
            worker.running = false;
            worker.current = null;
            save();
        }
    }

    function add({ urls, note = '', account = '', tags = [], agent = '' }) {
        const raw = (Array.isArray(urls) ? urls : String(urls || '').split(/[\s,]+/)).map(u => String(u).trim()).filter(Boolean);
        if (!raw.length) throw Object.assign(new Error('Pega al menos un link'), { status: 400 });
        const added = [];
        const duplicates = [];
        const invalid = [];
        for (const r of raw) {
            let url;
            try { url = normalizeUrl(r); } catch { invalid.push(r); continue; }
            const existing = Object.values(state.items).find(it => it.url === url);
            if (existing) { duplicates.push({ id: existing.id, url, title: existing.analysis?.title || existing.meta?.title || '' }); continue; }
            const id = `ref_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
            const item = {
                id, url, platform: platformOf(url), note: String(note).slice(0, 1000), account, tags: (tags || []).map(String).slice(0, 20),
                addedBy: agent || 'dashboard', status: 'pending', attempts: 0, createdAt: new Date().toISOString(), meta: {},
            };
            state.items[id] = item;
            added.push(view(item));
        }
        save();
        runWorker();
        return { added, duplicates, invalid };
    }

    const view = it => ({
        id: it.id, url: it.url, platform: it.platform, note: it.note, account: it.account, tags: it.tags, addedBy: it.addedBy,
        status: it.status, error: it.error || '', warnings: it.warnings || [], mode: it.mode || '', createdAt: it.createdAt,
        title: it.analysis?.title || it.meta?.title || '', type: it.analysis?.type || '', summary: it.analysis?.summary || '',
        author: it.meta?.author || '', thumbnail: it.meta?.thumbnail || '', duration: it.meta?.duration || 0,
    });

    return {
        add,
        list({ q = '', type, status } = {}) {
            const f = q.toLowerCase();
            return Object.values(state.items)
                .filter(it => (!type || it.analysis?.type === type) && (!status || it.status === status))
                .filter(it => !f || `${it.url} ${it.note} ${it.meta?.title} ${it.analysis?.title} ${it.analysis?.summary} ${(it.tags || []).join(' ')}`.toLowerCase().includes(f))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map(view);
        },
        get(id) {
            const it = state.items[id];
            return it ? { ...view(it), meta: it.meta, analysis: it.analysis || null, text: it.analysis ? referenceToText(it) : '' } : null;
        },
        update(id, { note, account, tags }) {
            const it = state.items[id];
            if (!it) return null;
            if (note !== undefined) it.note = String(note).slice(0, 1000);
            if (account !== undefined) it.account = account;
            if (Array.isArray(tags)) it.tags = tags.map(String).slice(0, 20);
            if (it.status === 'done') indexItem(it);
            save();
            embedMissing().catch(() => {});
            return view(it);
        },
        retry(id) {
            const it = state.items[id];
            if (!it) return null;
            Object.assign(it, { status: 'pending', attempts: 0, error: '' });
            save();
            runWorker();
            return view(it);
        },
        remove(id) {
            if (!state.items[id]) return false;
            delete state.items[id];
            store.removeDoc(`reference:${id}`);
            save();
            return true;
        },
        status() {
            const items = Object.values(state.items);
            const c = st => items.filter(it => it.status === st).length;
            return { total: items.length, done: c('done'), pending: c('pending') + c('processing'), errors: c('error'), worker: { ...worker }, ytdlp, model: videoModels().join(' → '), cookiesBrowser: cookiesBrowser() };
        },
        runWorker,
    };
}
