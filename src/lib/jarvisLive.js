// Jarvis en tiempo real con Gemini Live: el micrófono se transmite en streaming y la voz de Jarvis
// llega en streaming (~1-2 s), con interrupciones, subtítulos y ejecución de herramientas del dashboard.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;

function floatToPcm16Base64(float32, inputRate) {
    // Reduce a 16 kHz si el navegador no aceptó esa frecuencia
    const ratio = inputRate / INPUT_RATE;
    const length = Math.floor(float32.length / ratio);
    const pcm = new Int16Array(length);
    for (let i = 0; i < length; i++) {
        const s = Math.max(-1, Math.min(1, float32[Math.floor(i * ratio)]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

function base64ToFloat32(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    const out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
    return out;
}

/**
 * Abre una conversación por voz en tiempo real.
 * callbacks: onState('connecting'|'listening'|'speaking'|'closed'), onLevel(0..1),
 *   onUserText(textoParcial), onJarvisText(textoParcial), onTurn({ user, jarvis, tools }),
 *   onToolResult(tool), onError(err)
 * Devuelve { stop(), sendText(texto) }.
 */
export async function startLiveSession({ history = [], callbacks = {} }) {
    const cb = { onState() {}, onLevel() {}, onUserText() {}, onJarvisText() {}, onTurn() {}, onToolResult() {}, onError() {}, ...callbacks };
    cb.onState('connecting');

    // Primero el micrófono: si se deniega no se gasta un token de sesión
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    });
    let setup;
    try {
        const sessionRes = await fetch(`${API_BASE}/jarvis/live/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history })
        });
        setup = await sessionRes.json().catch(() => ({}));
        if (!sessionRes.ok) throw new Error(setup.error || 'No se pudo abrir el modo en tiempo real');
    } catch (err) {
        stream.getTracks().forEach(t => t.stop());
        throw err;
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: setup.token, httpOptions: { apiVersion: 'v1alpha' } });

    // ─── Reproducción sin cortes de los trozos de audio que llegan ───
    const outCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: OUTPUT_RATE });
    const outAnalyser = outCtx.createAnalyser();
    outAnalyser.fftSize = 256;
    outAnalyser.connect(outCtx.destination);
    let playhead = 0;
    const playing = new Set();

    const stopPlayback = () => {
        for (const src of playing) { try { src.stop(); } catch { /* ya terminó */ } }
        playing.clear();
        playhead = 0;
    };

    const playChunk = (b64) => {
        const samples = base64ToFloat32(b64);
        if (!samples.length) return;
        const buffer = outCtx.createBuffer(1, samples.length, OUTPUT_RATE);
        buffer.copyToChannel(samples, 0);
        const src = outCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(outAnalyser);
        playhead = Math.max(playhead, outCtx.currentTime + 0.03);
        src.start(playhead);
        playhead += buffer.duration;
        playing.add(src);
        cb.onState('speaking');
        src.onended = () => {
            playing.delete(src);
            if (!playing.size) cb.onState('listening');
        };
    };

    // ─── Turno actual (subtítulos y herramientas) ───
    let userText = '';
    let jarvisText = '';
    let turnTools = [];
    const flushTurn = () => {
        if (userText.trim() || jarvisText.trim() || turnTools.length) {
            cb.onTurn({ user: userText.trim(), jarvis: jarvisText.trim(), tools: turnTools });
        }
        userText = ''; jarvisText = ''; turnTools = [];
        cb.onUserText(''); cb.onJarvisText('');
    };

    let closed = false;
    let session;

    const runTools = async (functionCalls) => {
        const functionResponses = [];
        for (const call of functionCalls) {
            try {
                const r = await fetch(`${API_BASE}/jarvis/live/tool`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: call.name, args: call.args || {} })
                });
                const data = await r.json();
                const tool = { name: call.name, args: call.args || {}, result: data.result };
                turnTools.push(tool);
                cb.onToolResult(tool);
                functionResponses.push({ id: call.id, name: call.name, response: { result: data.result ?? data.error } });
            } catch (err) {
                functionResponses.push({ id: call.id, name: call.name, response: { error: err.message } });
            }
        }
        if (!closed) session.sendToolResponse({ functionResponses });
    };

    try {
        session = await ai.live.connect({
            model: setup.model,
            config: setup.config,
            callbacks: {
                onmessage: (msg) => {
                    const content = msg.serverContent;
                    if (msg.toolCall?.functionCalls?.length) runTools(msg.toolCall.functionCalls);
                    if (content?.interrupted) { stopPlayback(); cb.onState('listening'); }
                    for (const part of content?.modelTurn?.parts || []) {
                        if (part.inlineData?.data) playChunk(part.inlineData.data);
                    }
                    if (content?.inputTranscription?.text) { userText += content.inputTranscription.text; cb.onUserText(userText); }
                    if (content?.outputTranscription?.text) { jarvisText += content.outputTranscription.text; cb.onJarvisText(jarvisText); }
                    if (content?.turnComplete) flushTurn();
                    if (msg.goAway) cb.onError(new Error('La sesión en tiempo real está por cerrarse; vuelve a tocar el orbe para seguir.'));
                },
                onerror: (e) => cb.onError(new Error(e?.message || 'Error en la conexión en tiempo real')),
                onclose: (e) => {
                    if (!closed && e?.reason) cb.onError(new Error(e.reason));
                    cleanup();
                }
            }
        });
    } catch (err) {
        stream.getTracks().forEach(t => t.stop());
        outCtx.close().catch(() => {});
        throw err;
    }

    // ─── Micrófono → Gemini en trozos de ~128 ms ───
    let inCtx;
    try { inCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: INPUT_RATE }); }
    catch { inCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    const source = inCtx.createMediaStreamSource(stream);
    const processor = inCtx.createScriptProcessor(2048, 1, 1);
    source.connect(processor);
    processor.connect(inCtx.destination);
    processor.onaudioprocess = (e) => {
        if (closed) return;
        const data = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) sum += data[i] * data[i];
        cb.onLevel(Math.min(1, Math.sqrt(sum / (data.length / 4)) * 8));
        session.sendRealtimeInput({ audio: { data: floatToPcm16Base64(data, inCtx.sampleRate), mimeType: `audio/pcm;rate=${INPUT_RATE}` } });
    };

    function cleanup() {
        if (closed) return;
        closed = true;
        flushTurn();
        processor.onaudioprocess = null;
        try { processor.disconnect(); source.disconnect(); } catch { /* ya desconectado */ }
        stream.getTracks().forEach(t => t.stop());
        stopPlayback();
        inCtx.close().catch(() => {});
        outCtx.close().catch(() => {});
        cb.onLevel(0);
        cb.onState('closed');
    }

    cb.onState('listening');

    return {
        stop() {
            if (closed) return;
            try { session.close(); } catch { /* ya cerrada */ }
            cleanup();
        },
        sendText(text) {
            if (closed || !text) return;
            stopPlayback();
            userText = text;
            session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
        }
    };
}
