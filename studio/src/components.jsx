// Piezas comunes de los renders: logo, grano, texto sobre video, subtítulos y cierre.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { createTikTokStyleCaptions } from '@remotion/captions';
import { typo } from './brand.js';

export const Logo = ({ svg, width, style }) => (
    <div style={{ width, ...style }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="100%" height="100%" ') }} />
);

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch' seed='SEED'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** Grano de película animado (cambia de semilla cada 2 frames). */
export const Grain = ({ opacity = 0.14 }) => {
    const frame = useCurrentFrame();
    return <AbsoluteFill style={{ backgroundImage: NOISE.replace('SEED', String(Math.floor(frame / 2) % 12)), opacity, mixBlendMode: 'overlay', pointerEvents: 'none' }} />;
};

/** Texto sobre video con el estilo de la cuenta (posición y tipografía según su layout). */
export const OverlayText = ({ b, text, kicker, sub, accentLast = false }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    if (!text) return null;
    const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 14 });
    const punch = b.layout === 'impact' || b.layout === 'urban';
    const y = interpolate(enter, [0, 1], [punch ? -40 : 30, 0]);
    const scale = punch ? interpolate(enter, [0, 1], [1.25, 1]) : 1;
    const words = String(text).split(' ');
    const last = words.pop();
    const pos = {
        centered: { top: '38%' }, institutional: { bottom: '30%', textAlign: 'left' }, news: { bottom: '26%' },
        social: { top: '9%' }, urban: { top: '12%' },
    }[b.layout] || { top: '15%' };
    const editorialText = b.editorial || b.layout === 'social';
    const size = { social: 62, editorial: 92, minimal: 84, centered: 104, urban: 150, impact: 120, news: 120, institutional: 104 }[b.layout] || 104;
    return (
        <AbsoluteFill style={{ padding: '0 72px', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: 72, right: 72, textAlign: 'center', ...pos, opacity: enter, transform: `translateY(${y}px) scale(${scale})`, textShadow: '0 4px 30px rgba(0,0,0,0.45)' }}>
                {kicker ? <div style={{ ...typo(b, 'secondary'), fontSize: 30, color: b.layout === 'news' ? '#fff' : b.fg, opacity: 0.9, marginBottom: 18 }}>{kicker}</div> : null}
                <div style={{
                    ...(editorialText ? typo(b, 'secondary', { textTransform: 'none', letterSpacing: 0 }) : typo(b, 'display')),
                    fontSize: size,
                    lineHeight: editorialText ? 1.12 : 0.95,
                    fontWeight: editorialText ? 400 : 800,
                    color: b.layout === 'urban' ? b.accent : '#fff',
                    WebkitTextStroke: b.layout === 'urban' ? '6px #000' : undefined,
                    paintOrder: 'stroke fill',
                }}>
                    {words.join(' ')} {accentLast ? <span style={{ color: b.accent }}>{last}</span> : last}
                </div>
                {sub ? <div style={{ ...typo(b, 'secondary'), fontSize: 28, color: '#fff', opacity: 0.85, marginTop: 20 }}>{sub}</div> : null}
            </div>
        </AbsoluteFill>
    );
};

/** Subtítulo de un plano (sin transcripción) con el estilo de la cuenta. */
export const SegmentSubtitle = ({ b, text }) => {
    const frame = useCurrentFrame();
    if (!text) return null;
    const heavy = b.layout === 'impact' || b.layout === 'urban';
    return (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 520, pointerEvents: 'none' }}>
            <div style={{
                maxWidth: 900, textAlign: 'center', opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' }),
                ...(heavy ? typo(b, 'display', { fontSize: 76, fontWeight: 900, color: '#fff', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', lineHeight: 1.05 })
                    : typo(b, 'body', { fontSize: 46, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.78)', padding: '10px 22px', borderRadius: 14, textTransform: 'none', letterSpacing: 0, lineHeight: 1.35 })),
            }}>{text}</div>
        </AbsoluteFill>
    );
};

/** Subtítulos palabra por palabra a partir de una transcripción de Whisper (formato Caption de Remotion). */
export const Captions = ({ b, captions }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    if (!captions?.length) return null;
    const ms = (frame / fps) * 1000;
    const { pages } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 900 });
    const page = pages.find(p => ms >= p.startMs && ms < p.startMs + p.durationMs);
    if (!page) return null;
    const heavy = b.layout === 'impact' || b.layout === 'urban';
    return (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 520, pointerEvents: 'none' }}>
            <div style={{ maxWidth: 940, textAlign: 'center', ...typo(b, heavy ? 'display' : 'body', { fontSize: heavy ? 82 : 58, fontWeight: 900, lineHeight: 1.1, textTransform: heavy ? 'uppercase' : 'none', letterSpacing: 0 }), WebkitTextStroke: '8px #000', paintOrder: 'stroke fill' }}>
                {page.tokens.map(tok => {
                    const active = ms >= tok.fromMs && ms < tok.toMs;
                    return <span key={tok.fromMs} style={{ color: active ? b.accent : '#fff' }}>{tok.text}</span>;
                })}
            </div>
        </AbsoluteFill>
    );
};

/** Cierre de marca: logo animado, CTA y handle. */
export const EndCard = ({ b, logoSvg, cta, handle, logoWidth }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
    return (
        <AbsoluteFill style={{ background: b.mood, alignItems: 'center', justifyContent: 'center', gap: 56 }}>
            <AbsoluteFill style={{ background: 'rgba(0,0,0,0.35)' }} />
            <Logo svg={logoSvg} width={logoWidth} style={{ position: 'relative', opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.92, 1])})`, filter: `blur(${interpolate(s, [0, 1], [10, 0])}px)` }} />
            {cta ? <div style={{ position: 'relative', ...typo(b, 'secondary', { fontSize: cta.length > 22 ? 28 : 34, fontWeight: 700, ...(cta.length > 22 ? { letterSpacing: '0.08em' } : {}) }), maxWidth: 860, textAlign: 'center', lineHeight: 1.3, background: b.accent, color: b.onAccent, padding: '20px 44px', borderRadius: 48, opacity: interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{cta}</div> : null}
            <div style={{ position: 'relative', fontFamily: b.fonts.body, fontSize: 32, color: '#fff', opacity: interpolate(frame, [16, 28], [0, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{handle}</div>
        </AbsoluteFill>
    );
};

/** Entrada de un plano según la transición pedida en el EDL. */
export const TransitionIn = ({ b, kind }) => {
    const frame = useCurrentFrame();
    const k = String(kind || '').toLowerCase();
    if (/flash/.test(k)) return <AbsoluteFill style={{ background: '#fff', opacity: interpolate(frame, [0, 4], [0.9, 0], { extrapolateRight: 'clamp' }) }} />;
    if (/fundido|fade|negro/.test(k)) return <AbsoluteFill style={{ background: '#000', opacity: interpolate(frame, [0, 8], [1, 0], { extrapolateRight: 'clamp' }) }} />;
    if (/barrido|luz|sweep/.test(k)) {
        const x = interpolate(frame, [0, 10], [-40, 140], { extrapolateRight: 'clamp' });
        return <AbsoluteFill style={{ background: `linear-gradient(100deg, transparent ${x - 30}%, ${b.accent}cc ${x}%, transparent ${x + 30}%)`, mixBlendMode: 'screen' }} />;
    }
    if (/glitch|zoom/.test(k)) return <AbsoluteFill style={{ background: b.accent, opacity: frame < 2 ? 0.5 : 0, mixBlendMode: 'screen' }} />;
    return null;
};
