// Motor de voz de Jarvis: escucha con detección de fin de frase y habla con la voz neural de Gemini.
// La voz del navegador queda como respaldo cuando no hay internet o falla la API.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ─── Escuchar ──────────────────────────────────────────────────────────

function encodeWav(chunks, inputRate, targetRate = 16000) {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }

    const ratio = inputRate / targetRate;
    const outLength = Math.floor(merged.length / ratio);
    const buffer = new ArrayBuffer(44 + outLength * 2);
    const view = new DataView(buffer);
    const writeStr = (o, str) => { for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + outLength * 2, true); writeStr(8, 'WAVE');
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(36, 'data'); view.setUint32(40, outLength * 2, true);
    for (let i = 0; i < outLength; i++) {
        // Promedio simple de las muestras que caen en cada salida (downsampling)
        const start = Math.floor(i * ratio);
        const end = Math.min(Math.floor((i + 1) * ratio), merged.length);
        let sum = 0;
        for (let j = start; j < end; j++) sum += merged[j];
        const s = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

/**
 * Graba una frase y termina sola cuando el usuario deja de hablar.
 * Devuelve el WAV en base64, o null si no se detectó voz.
 */
export async function recordUtterance({ onLevel, onSpeechStart, abortSignal, silenceMs = 1300, maxMs = 30000, noSpeechMs = 9000 } = {}) {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(ctx.destination);

    const chunks = [];
    const startedAt = performance.now();
    let noiseFloor = 0.01;
    let speechStarted = false;
    let lastVoiceAt = 0;

    try {
        return await new Promise((resolve) => {
            const finish = (hasSpeech) => {
                processor.onaudioprocess = null;
                resolve(hasSpeech && chunks.length ? toBase64(encodeWav(chunks, ctx.sampleRate)) : null);
            };
            abortSignal?.addEventListener('abort', () => finish(speechStarted));

            processor.onaudioprocess = (e) => {
                const data = e.inputBuffer.getChannelData(0);
                chunks.push(new Float32Array(data));
                let sum = 0;
                for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
                const rms = Math.sqrt(sum / data.length);
                const now = performance.now();
                const elapsed = now - startedAt;

                // Los primeros 400 ms calibran el ruido ambiente
                if (elapsed < 400) noiseFloor = Math.max(noiseFloor * 0.9, rms);
                const threshold = Math.max(0.018, noiseFloor * 2.6);
                onLevel?.(Math.min(1, rms / (threshold * 3)));

                if (rms > threshold) {
                    if (!speechStarted) { speechStarted = true; onSpeechStart?.(); }
                    lastVoiceAt = now;
                }
                if (speechStarted && now - lastVoiceAt > silenceMs) return finish(true);
                if (!speechStarted && elapsed > noSpeechMs) return finish(false);
                if (elapsed > maxMs) return finish(speechStarted);
            };
        });
    } finally {
        stream.getTracks().forEach(t => t.stop());
        processor.disconnect();
        source.disconnect();
        ctx.close().catch(() => {});
        onLevel?.(0);
    }
}

export async function transcribe(wavBase64) {
    const res = await fetch(`${API_BASE}/jarvis/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: wavBase64, mimeType: 'audio/wav' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo transcribir');
    return data;
}

// ─── Hablar ────────────────────────────────────────────────────────────

/** Quita markdown, emojis y símbolos para que la voz suene natural. */
export function cleanForSpeech(text = '') {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\(🧠[^)]*\)\*/g, ' ')
        .replace(/[*_`#>|~]/g, ' ')
        .replace(/\p{Extended_Pictographic}/gu, ' ')
        .replace(/^\s*[-•]\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Trozos de 1-2 frases: el primero suena rápido mientras se generan los siguientes
function splitForSpeech(text, maxLen = 240) {
    const sentences = text.match(/[^.!?¡¿]+[.!?]+["')\]]*|[^.!?]+$/g) || [text];
    const parts = [];
    let current = '';
    for (const raw of sentences) {
        const s = raw.trim();
        if (!s) continue;
        const limit = parts.length === 0 ? 120 : maxLen;
        if (current && (current + ' ' + s).length > limit) { parts.push(current); current = s; }
        else current = current ? `${current} ${s}` : s;
    }
    if (current) parts.push(current);
    return parts;
}

const audioCache = new Map();
let playback = { id: 0, audio: null };

async function fetchTts(text, cfg) {
    const key = `${cfg.voiceName}|${text}`;
    if (audioCache.has(key)) return audioCache.get(key);
    const promise = fetch(`${API_BASE}/jarvis/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: cfg.voiceName })
    }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Voz no disponible');
        return URL.createObjectURL(await res.blob());
    });
    audioCache.set(key, promise);
    promise.catch(() => audioCache.delete(key));
    return promise;
}

function detectLang(text) {
    const es = (text.match(/\b(el|la|los|las|de|que|y|en|un|una|para|tienes|hay|está|señor|tareas|eventos)\b|[ñáéíóú¿¡]/gi) || []).length;
    const en = (text.match(/\b(the|and|you|is|are|have|of|to|for|with|your|sir|tasks|events)\b/gi) || []).length;
    return en > es ? 'en' : 'es';
}

// Mejor voz del sistema disponible para el idioma (las "Premium/Enhanced" de macOS suenan mucho mejor)
export function pickBrowserVoice(lang) {
    const voices = window.speechSynthesis?.getVoices() || [];
    const candidates = voices.filter(v => v.lang?.toLowerCase().startsWith(lang));
    const score = (v) => (/premium/i.test(v.name) ? 4 : 0) + (/enhanced|mejorad/i.test(v.name) ? 3 : 0)
        + (/siri/i.test(v.name) ? 2 : 0) + (/google/i.test(v.name) ? 1 : 0) + (v.localService ? 0.5 : 0);
    return candidates.sort((a, b) => score(b) - score(a))[0] || null;
}

function speakWithBrowser(text, id) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve();
        window.speechSynthesis.cancel();
        const parts = splitForSpeech(text, 200);
        let i = 0;
        const next = () => {
            if (playback.id !== id || i >= parts.length) return resolve();
            const u = new SpeechSynthesisUtterance(parts[i++]);
            const lang = detectLang(u.text);
            u.voice = pickBrowserVoice(lang);
            u.lang = u.voice?.lang || (lang === 'en' ? 'en-US' : 'es-ES');
            u.rate = 1.02;
            u.onend = next;
            u.onerror = next;
            window.speechSynthesis.speak(u);
        };
        next();
    });
}

export function stopSpeaking() {
    playback.id += 1;
    if (playback.audio) { playback.audio.pause(); playback.audio = null; }
    window.speechSynthesis?.cancel();
}

/**
 * Habla el texto con la voz configurada. Resuelve cuando termina (o al interrumpirse).
 * cfg: { voiceEngine, voiceName }
 */
export async function speak(text, cfg = {}, { onStart } = {}) {
    stopSpeaking();
    const id = playback.id;
    let clean = cleanForSpeech(text);
    if (!clean) return;
    // Respuestas largas (reportes, listas): se leen las primeras frases y el resto queda en pantalla
    if (clean.length > 450) {
        const cut = clean.slice(0, 380);
        const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
        clean = `${end > 120 ? cut.slice(0, end + 1) : cut}${detectLang(clean) === 'en' ? ' The full detail is on screen.' : ' Te dejo el detalle completo en pantalla.'}`;
    }

    if (cfg.voiceEngine === 'browser') {
        onStart?.();
        return speakWithBrowser(clean, id);
    }

    const parts = splitForSpeech(clean);
    const urls = parts.map(p => fetchTts(p, cfg)); // se piden todos a la vez y se reproducen en orden
    try {
        for (let i = 0; i < urls.length; i++) {
            const url = await urls[i];
            if (playback.id !== id) return;
            if (i === 0) onStart?.();
            await new Promise((resolve) => {
                const audio = new Audio(url);
                playback.audio = audio;
                audio.onended = resolve;
                audio.onerror = resolve;
                audio.onpause = resolve;
                audio.play().catch(resolve);
            });
        }
    } catch (err) {
        // Sin API o sin internet: la voz del sistema termina la frase
        console.warn('[JarvisVoice] Voz neural no disponible, usando la del sistema:', err.message);
        if (playback.id === id) return speakWithBrowser(clean, id);
    }
}
