// Web Audio API Native Synthesizer for AI Office HQ
// Pure client-side synthesis: zero external mp3 files, zero latency, ultra-lightweight.

let audioCtx = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export const isOfficeAudioMuted = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('office_audio_muted') === 'true';
};

export const setOfficeAudioMuted = (muted) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('office_audio_muted', muted ? 'true' : 'false');
    }
};

// 1. Subtle UI Click
export function playOfficeClick() {
    if (isOfficeAudioMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.04);
    } catch { /* silent */ }
}

// 2. Mission Success Chime (C-E-G Chord)
export function playOfficeSuccess() {
    if (isOfficeAudioMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.35);
        });
    } catch { /* silent */ }
}

// 3. CEO Approval Alert (Attention Chime)
export function playOfficeAlert() {
    if (isOfficeAudioMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const freqs = [440, 554.37]; // A4, C#5
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

            gain.gain.setValueAtTime(0.09, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
    } catch { /* silent */ }
}

// 4. War Mode Tactical Pulse
export function playOfficeWarMode(active = true) {
    if (isOfficeAudioMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        if (active) {
            osc.frequency.setValueAtTime(140, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.25);
        } else {
            osc.frequency.setValueAtTime(280, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);
        }

        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch { /* silent */ }
}

// 5. Subtle Keystroke Typing Sound
export function playOfficeTyping() {
    if (isOfficeAudioMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // High frequency micro-click resembling soft mechanical keycap
        const pitch = 1200 + Math.random() * 800;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);

        gain.gain.setValueAtTime(0.012, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.025);
    } catch { /* silent */ }
}

