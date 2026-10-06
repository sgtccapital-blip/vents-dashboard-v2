// Generadores de medios con IA para el estudio: Google (Nano Banana / Veo vía Gemini API) e Higgsfield (API).
// Todo lo generado se guarda en content-dna/<cuenta>/ai/ y entra a la biblioteca raw como un asset más,
// así puede usarse en ideas, guiones de edición y renders igual que el material grabado.
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// ─── Catálogo (precios por defecto del tier pagado de la Gemini API, oct-2026; se pueden ajustar) ───
export const CATALOG = {
    google: {
        label: 'Google (Gemini API)',
        image: [
            { id: 'gemini-3.1-flash-image', label: 'Nano Banana 2 · Flash', sizes: ['1K', '2K', '4K'], price: { '1K': 0.067, '2K': 0.101, '4K': 0.151 } },
            { id: 'gemini-3-pro-image', label: 'Nano Banana Pro', sizes: ['1K', '2K', '4K'], price: { '1K': 0.134, '2K': 0.134, '4K': 0.24 } },
            { id: 'gemini-3.1-flash-lite-image', label: 'Nano Banana Lite', sizes: ['1K'], price: { '1K': 0.0336 } },
        ],
        video: [
            { id: 'veo-3.1-generate-preview', label: 'Veo 3.1', resolutions: ['720p', '1080p', '4k'], perSecond: { '720p': 0.4, '1080p': 0.4, '4k': 0.6 } },
            { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', resolutions: ['720p', '1080p', '4k'], perSecond: { '720p': 0.1, '1080p': 0.12, '4k': 0.3 } },
            { id: 'veo-3.1-lite-generate-preview', label: 'Veo 3.1 Lite', resolutions: ['720p', '1080p'], perSecond: { '720p': 0.05, '1080p': 0.08 } },
        ],
    },
    higgsfield: {
        label: 'Higgsfield (API)',
        // Rutas de modelo de api.higgsfield.ai; el catálogo cambia seguido: se pueden agregar desde HIGGSFIELD_MODELS (JSON).
        image: [{ id: 'higgsfield-ai/soul/v2/standard', label: 'Soul V2' }],
        video: [],
    },
};

export function catalog() {
    const c = structuredClone(CATALOG);
    try {
        const extra = JSON.parse(process.env.HIGGSFIELD_MODELS || '{}');
        if (Array.isArray(extra.image)) c.higgsfield.image.push(...extra.image);
        if (Array.isArray(extra.video)) c.higgsfield.video.push(...extra.video);
    } catch { /* JSON inválido: se ignora */ }
    return c;
}

export function providerStatus(geminiApiKey) {
    return {
        google: Boolean(process.env.GEMINI_API_KEY || geminiApiKey),
        higgsfield: Boolean(process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET),
    };
}

export function estimateCost({ provider, kind, model, size = '1K', resolution = '1080p', durationSeconds = 8, count = 1 }) {
    if (provider !== 'google') return null;
    const list = CATALOG.google[kind] || [];
    const m = list.find(x => x.id === model);
    if (!m) return null;
    return kind === 'image' ? (m.price[size] ?? Object.values(m.price)[0]) * count : (m.perSecond[resolution] ?? 0.4) * Number(durationSeconds) * count;
}

// ─── Prompt con la línea de la marca ───
/**
 * Envuelve la idea del usuario con la dirección de arte de la cuenta. Pide imágenes sin texto ni logos:
 * esos se agregan después con Remotion para que la tipografía y el logo salgan exactos.
 */
export function brandPrompt(brand, userPrompt, kind) {
    if (!brand) return userPrompt;
    const c = brand.content?.video;
    const palette = brand.colors.slice(0, 5).map(x => `${x.name.toLowerCase()} ${x.hex}`).join(', ');
    const lines = [
        userPrompt.trim(),
        '',
        `Art direction for "${brand.name}" (${brand.descriptor}): ${brand.essence}`,
        `Look: ${brand.imagery.treatment} Subjects: ${brand.imagery.photography}`,
        `Color palette to echo in light and wardrobe/props: ${palette}.`,
        kind === 'video' && c ? `Camera: ${c.camera} Grade: ${c.grade} Pacing: ${c.transitions}` : '',
        `Avoid: ${brand.imagery.avoid}`,
        'Vertical 9:16 composition for Instagram Reels, keep the subject away from the top 14% and bottom 20%.',
        'No text, no captions, no logos, no watermarks in the image.',
    ];
    return lines.filter(Boolean).join('\n');
}

// ─── Google ───
let googleClient = null;
const google = geminiApiKey => (googleClient ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || geminiApiKey }));

async function googleImage({ model, prompt, aspectRatio, size, refs, geminiApiKey }) {
    const parts = [...refs.map(r => ({ inlineData: { mimeType: r.mimeType, data: r.data } })), { text: prompt }];
    const res = await google(geminiApiKey).models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio, ...(size ? { imageSize: size } : {}) } },
    });
    const out = (res.candidates?.[0]?.content?.parts || []).filter(p => p.inlineData?.data);
    if (!out.length) throw new Error(`El modelo no devolvió imagen (${res.candidates?.[0]?.finishReason || res.promptFeedback?.blockReason || 'sin detalle'})`);
    return out.map(p => ({ buffer: Buffer.from(p.inlineData.data, 'base64'), mimeType: p.inlineData.mimeType || 'image/png' }));
}

async function googleVideo({ model, prompt, aspectRatio, resolution, durationSeconds, firstFrame, refs, negativePrompt, dest, geminiApiKey, onProgress }) {
    const ai = google(geminiApiKey);
    let op = await ai.models.generateVideos({
        model,
        prompt,
        ...(firstFrame ? { image: { imageBytes: firstFrame.data, mimeType: firstFrame.mimeType } } : {}),
        config: {
            aspectRatio,
            resolution,
            durationSeconds: Number(durationSeconds),
            ...(negativePrompt ? { negativePrompt } : {}),
            ...(refs.length && !firstFrame ? { referenceImages: refs.slice(0, 3).map(r => ({ image: { imageBytes: r.data, mimeType: r.mimeType }, referenceType: 'ASSET' })) } : {}),
        },
    });
    const started = Date.now();
    while (!op.done) {
        if (Date.now() - started > 10 * 60 * 1000) throw new Error('Veo tardó más de 10 minutos');
        await new Promise(r => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
        onProgress?.(Math.min(95, Math.round(((Date.now() - started) / 120000) * 100)));
    }
    if (op.error) throw new Error(`Veo: ${op.error.message || JSON.stringify(op.error)}`);
    const video = op.response?.generatedVideos?.[0]?.video;
    if (!video) throw new Error(`Veo no devolvió video${op.response?.raiMediaFilteredReasons ? ` (filtrado: ${op.response.raiMediaFilteredReasons.join(', ')})` : ''}`);
    await ai.files.download({ file: video, downloadPath: dest });
    return dest;
}

// ─── Higgsfield (API asíncrona: enviar → consultar estado → descargar) ───
const HF = 'https://api.higgsfield.ai';
const hfHeaders = () => ({ Authorization: `Key ${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}`, 'Content-Type': 'application/json', Accept: 'application/json' });

function findMediaUrls(obj, out = []) {
    if (typeof obj === 'string' && /^https?:\/\/\S+\.(mp4|mov|webm|png|jpe?g|webp)(\?|$)/i.test(obj)) out.push(obj);
    else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => findMediaUrls(v, out));
    return out;
}

async function higgsfield({ model, body, onProgress }) {
    const submit = await fetch(`${HF}/${model.replace(/^\//, '')}`, { method: 'POST', headers: hfHeaders(), body: JSON.stringify(body) });
    if (!submit.ok) throw new Error(`Higgsfield ${submit.status}: ${(await submit.text()).slice(0, 300)}`);
    const job = await submit.json();
    const statusUrl = job.status_url || `${HF}/requests/${job.request_id}/status`;
    const started = Date.now();
    for (;;) {
        if (Date.now() - started > 15 * 60 * 1000) throw new Error('Higgsfield tardó más de 15 minutos');
        await new Promise(r => setTimeout(r, 6000));
        const res = await fetch(statusUrl, { headers: hfHeaders() });
        const st = await res.json();
        const status = String(st.status || '').toLowerCase();
        onProgress?.(Math.min(95, Math.round(((Date.now() - started) / 180000) * 100)));
        if (['completed', 'succeeded', 'success', 'done'].includes(status)) {
            const urls = findMediaUrls(st);
            if (!urls.length) throw new Error('Higgsfield terminó pero no se encontró el archivo en la respuesta');
            return urls;
        }
        if (['failed', 'error', 'canceled', 'cancelled', 'nsfw'].includes(status)) throw new Error(`Higgsfield: ${status} ${st.error || ''}`);
    }
}

async function download(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Descarga ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return dest;
}

const extFor = mime => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4' }[mime] || 'bin');

/**
 * Ejecuta una generación y devuelve los archivos creados.
 * @returns {Promise<{file: string, kind: 'image'|'video', mimeType: string}[]>}
 */
/** Traduce los errores de cuota/facturación de Google a algo accionable. */
export function friendlyError(err) {
    const msg = String(err?.message || err);
    if (/free_tier/i.test(msg) && /limit: 0/.test(msg)) {
        return 'Tu GEMINI_API_KEY está en un proyecto sin facturación: imagen y video no tienen uso gratis. Activa los créditos de Google AI Pro/Ultra (Google Developer Program) en el proyecto de Google Cloud de esa key, o crea la key en un proyecto con facturación (ver docs/ESTUDIO_CONTENIDO.md → Google).';
    }
    if (/RESOURCE_EXHAUSTED|429/.test(msg)) return 'Google alcanzó el límite de uso por ahora (429). Intenta en unos minutos o revisa la cuota en ai.dev/rate-limit.';
    if (/API key not valid|PERMISSION_DENIED/i.test(msg)) return 'La API key de Google no es válida o no tiene acceso a este modelo.';
    return msg.length > 400 ? `${msg.slice(0, 400)}…` : msg;
}

export async function runGeneration({ provider, kind, model, prompt, aspectRatio = '9:16', size, resolution = '1080p', durationSeconds = 8, count = 1, refs = [], firstFrame = null, negativePrompt, outDir, baseName, geminiApiKey, onProgress }) {
    fs.mkdirSync(outDir, { recursive: true });
    const files = [];
    if (provider === 'google' && kind === 'image') {
        for (let i = 0; i < count; i++) {
            const imgs = await googleImage({ model, prompt, aspectRatio, size, refs, geminiApiKey });
            for (const img of imgs) {
                const file = path.join(outDir, `${baseName}-${files.length + 1}.${extFor(img.mimeType)}`);
                fs.writeFileSync(file, img.buffer);
                files.push({ file, kind: 'image', mimeType: img.mimeType });
            }
            onProgress?.(Math.round(((i + 1) / count) * 100));
        }
        return files;
    }
    if (provider === 'google' && kind === 'video') {
        for (let i = 0; i < count; i++) {
            const file = path.join(outDir, `${baseName}-${i + 1}.mp4`);
            await googleVideo({ model, prompt, aspectRatio, resolution, durationSeconds, firstFrame, refs, negativePrompt, dest: file, geminiApiKey, onProgress });
            files.push({ file, kind: 'video', mimeType: 'video/mp4' });
        }
        return files;
    }
    if (provider === 'higgsfield') {
        const body = { prompt, aspect_ratio: aspectRatio, ...(kind === 'video' ? { duration: Number(durationSeconds) } : {}), ...(firstFrame?.url ? { image_url: firstFrame.url } : {}) };
        const urls = await higgsfield({ model, body, onProgress });
        for (const url of urls) {
            const ext = (url.match(/\.(mp4|mov|webm|png|jpe?g|webp)(\?|$)/i)?.[1] || 'bin').toLowerCase();
            const file = path.join(outDir, `${baseName}-${files.length + 1}.${ext}`);
            await download(url, file);
            files.push({ file, kind: /mp4|mov|webm/.test(ext) ? 'video' : 'image', mimeType: /mp4|mov|webm/.test(ext) ? 'video/mp4' : `image/${ext === 'jpg' ? 'jpeg' : ext}` });
        }
        return files;
    }
    throw new Error(`Proveedor no soportado: ${provider}`);
}
