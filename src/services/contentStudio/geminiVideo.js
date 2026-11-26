// Gemini viendo un video completo (imagen + audio) y devolviendo JSON validado con zod.
// YouTube público se pasa directo por link; cualquier otro video se sube a la Files API y se borra al terminar.
// Rota modelos: cada uno tiene su cuota diaria propia en el plan gratis (3.8 Flash y 3 Flash: 20/día; Flash Lite: 500/día).
// 3.6 Flash queda fuera a propósito: lo usa Jarvis.
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const GEM = 'https://generativelanguage.googleapis.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const LONG_VIDEO_SEC = 15 * 60; // desde aquí se analiza en resolución baja (menos tokens)
export const MAX_UPLOAD_BYTES = 1.9 * 1024 ** 3;

export const videoModels = () => (process.env.REFERENCE_VIDEO_MODELS || 'gemini-3.8-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite')
    .split(',').map(x => x.trim()).filter(Boolean);

export const isYouTube = url => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url || '');

export async function uploadToGemini(filePath, apiKey) {
    const size = fs.statSync(filePath).size;
    if (size > MAX_UPLOAD_BYTES) throw new Error(`Video muy pesado para Gemini (${(size / 1024 ** 3).toFixed(1)} GB)`);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
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

export const deleteGeminiFile = (name, apiKey) => fetch(`${GEM}/v1beta/${name}`, { method: 'DELETE', headers: { 'x-goog-api-key': apiKey } }).catch(() => {});

async function askModel(model, { fileData, system, prompt, schema, apiKey, long }) {
    const res = await fetch(`${GEM}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ fileData }, { text: `${prompt}\n\nResponde solo con JSON que cumpla este esquema:\n${JSON.stringify(z.toJSONSchema(schema))}` }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3, ...(long ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}) },
        }),
        signal: AbortSignal.timeout(10 * 60000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
    if (!text) throw new Error(`Gemini no devolvió análisis (${json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason || 'vacío'})`);
    return schema.parse(JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')));
}

/**
 * Gemini ve el video y devuelve { data, model }. `url` (YouTube) o `file` (ruta local).
 * Prueba los modelos en orden; si uno no tiene cuota o está saturado, sigue con el próximo.
 */
export async function analyzeVideo({ url, file, duration = 0, system, prompt, schema, apiKey }) {
    if (!apiKey) throw new Error('Falta GEMINI_API_KEY para ver el video');
    let uploaded = null;
    const errors = [];
    try {
        let fileData;
        if (url && isYouTube(url)) fileData = { fileUri: url, mimeType: 'video/*' };
        else if (file) { uploaded = await uploadToGemini(file, apiKey); fileData = { fileUri: uploaded.uri, mimeType: uploaded.mimeType }; }
        else throw new Error('No hay video para que Gemini lo vea');
        for (const model of videoModels()) {
            try {
                return { data: await askModel(model, { fileData, system, prompt, schema, apiKey, long: duration > LONG_VIDEO_SEC }), model };
            } catch (e) {
                errors.push(`${model}: ${e.message.slice(0, 160)}`);
                if (!/\b(429|500|503|504|404)\b|quota|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand/i.test(e.message)) break;
            }
        }
        throw new Error(errors.join(' | '));
    } finally {
        if (uploaded) deleteGeminiFile(uploaded.name, apiKey);
    }
}
