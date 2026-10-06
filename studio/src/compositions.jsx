// Composiciones de la máquina de contenido.
//  - BriefReel: monta un reel desde el EDL de un brief (material raw + textos + subtítulos + cierre).
//  - StoryGraphic: gráficos de historias (anuncio, countdown, encuesta, repost, link).
//  - PostGraphic: post 4:5 / flyer.
//  - LogoSting: animación de logo de 3 s para intros y cierres.
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { brandTheme, typo } from './brand.js';
import { useBrandData, moodLogo, logoWidth } from './data.js';
import { Captions, EndCard, Grain, Logo, OverlayText, SegmentSubtitle, TransitionIn } from './components.jsx';

import { FPS, segFrames, segStarts } from './timing.js';

const Shot = ({ seg, b }) => {
    const frame = useCurrentFrame();
    const style = { width: '100%', height: '100%', objectFit: 'cover', filter: b.grade };
    if (seg.kind === 'image') {
        // Fotos: Ken Burns suave
        return <AbsoluteFill style={{ transform: `scale(${interpolate(frame, [0, segFrames(seg)], [1.04, 1.12])})` }}><Img src={staticFile(seg.src)} style={style} /></AbsoluteFill>;
    }
    if (seg.kind === 'video') {
        return <OffthreadVideo src={staticFile(seg.src)} trimBefore={Math.round((seg.inSec || 0) * FPS)} volume={seg.volume ?? 1} style={style} />;
    }
    // Plano gráfico (tarjeta de marca) cuando el EDL pide "grafico"
    return <AbsoluteFill style={{ background: b.mood }} />;
};

export const BriefReel = ({ brandSlug, handle, segments = [], captions = [], endcard, music }) => {
    const data = useBrandData(brandSlug);
    if (!data) return null;
    const b = brandTheme(data.brand);
    const starts = segStarts(segments);
    const from = segments.length ? starts.at(-1) + segFrames(segments.at(-1)) : 0;
    const accentLast = ['institutional', 'impact', 'news'].includes(b.layout);
    return (
        <AbsoluteFill style={{ background: '#000' }}>
            {segments.map((seg, i) => {
                const dur = segFrames(seg);
                const start = starts[i];
                return (
                    <Sequence key={i} from={start} durationInFrames={dur} name={`${i + 1}. ${seg.purpose || seg.src || 'plano'}`}>
                        <Shot seg={seg} b={b} />
                        {b.tint && <AbsoluteFill style={{ background: b.tint[0], mixBlendMode: b.tint[1] }} />}
                        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.5) 100%)' }} />
                        <OverlayText b={b} text={seg.overlay} kicker={i === 0 ? seg.kicker : undefined} accentLast={accentLast} />
                        {!captions.length && <SegmentSubtitle b={b} text={seg.subtitle} />}
                        {i > 0 && <TransitionIn b={b} kind={segments[i - 1].transition} />}
                    </Sequence>
                );
            })}
            {captions.length > 0 && <Sequence from={0} durationInFrames={from}><Captions b={b} captions={captions} /></Sequence>}
            {endcard && (
                <Sequence from={from} name="Cierre">
                    <EndCard b={b} logoSvg={moodLogo(brandSlug, data.logos)} cta={endcard.cta} handle={handle} logoWidth={logoWidth(brandSlug, 720)} />
                </Sequence>
            )}
            {music?.src && <Audio src={staticFile(music.src)} volume={music.volume ?? 0.6} />}
            <Grain />
        </AbsoluteFill>
    );
};

// ─── Gráficos de historias ───
const Sticker = ({ children, style }) => (
    <div style={{ background: '#fff', color: '#111', borderRadius: 34, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', fontFamily: 'Inter, sans-serif', ...style }}>{children}</div>
);

export const StoryGraphic = ({ brandSlug, type = 'announce', text, sub, link, poll, countdown, handle }) => {
    const data = useBrandData(brandSlug);
    if (!data) return null;
    const b = brandTheme(data.brand);
    const st = data.brand.content?.stories || {};
    const big = (txt, size = 120) => (
        <div style={{ ...(b.editorial ? typo(b, 'secondary', { textTransform: 'none', letterSpacing: 0 }) : typo(b, 'display')), fontSize: size, lineHeight: 0.98, fontWeight: b.editorial ? 500 : 800, textAlign: 'center', textShadow: '0 6px 30px rgba(0,0,0,0.35)' }}>{txt}</div>
    );
    const subline = txt => txt ? <div style={{ ...typo(b, 'secondary'), fontSize: 32, opacity: 0.9, textAlign: 'center' }}>{txt}</div> : null;
    const linkSticker = txt => <Sticker style={{ padding: '26px 52px', fontSize: 40, fontWeight: 800, color: '#3797F0', textTransform: 'uppercase' }}>🔗 {txt}</Sticker>;
    const wrap = { padding: '200px 90px', alignItems: 'center', justifyContent: 'center', gap: 60, color: '#fff' };

    if (type === 'countdown') {
        return (
            <AbsoluteFill style={{ ...wrap, background: b.surface, color: b.fg }}>
                <Logo svg={data.logos.symbol} width={logoWidth(brandSlug, 220)} />
                {big(text || st.countdown || 'FALTAN', 90)}
                <Sticker style={{ width: 820, padding: 48, display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
                    <b style={{ fontSize: 44, textTransform: 'uppercase' }}>{countdown?.title || sub || data.brand.sample.headline}</b>
                    <div style={{ display: 'flex', gap: 22 }}>
                        {(countdown?.digits || ['03', '14', '22']).map((d, i) => <span key={i} style={{ background: `linear-gradient(180deg, #8A3FFC, #D62976)`, color: '#fff', fontSize: 96, fontWeight: 800, padding: '14px 28px', borderRadius: 18 }}>{d}</span>)}
                    </div>
                    <small style={{ fontSize: 28, color: '#777' }}>días · horas · min</small>
                </Sticker>
                {subline(data.brand.sample.meta)}
            </AbsoluteFill>
        );
    }
    if (type === 'poll') {
        const p = poll || st.poll || { q: '¿?', a: ['Sí', 'No'] };
        return (
            <AbsoluteFill style={{ ...wrap, background: b.mood }}>
                <Grain />
                {big(p.q, 104)}
                <Sticker style={{ width: 860, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
                    {p.a.map((opt, i) => <span key={i} style={{ padding: '46px 20px', fontSize: 42, fontWeight: 800, textAlign: 'center', borderLeft: i ? '2px solid #e5e5e5' : 'none' }}>{opt}</span>)}
                </Sticker>
                <Logo svg={moodLogo(brandSlug, data.logos)} width={logoWidth(brandSlug, 380)} style={{ marginTop: 'auto' }} />
            </AbsoluteFill>
        );
    }
    if (type === 'repost') {
        return (
            <AbsoluteFill style={{ ...wrap, background: b.bg, color: b.fg, boxShadow: `inset 0 0 0 40px ${b.accent}` }}>
                <div style={{ ...typo(b, 'secondary'), fontSize: 34, color: b.accent, letterSpacing: '0.3em' }}>REPOST</div>
                <div style={{ width: 760, height: 950, borderRadius: 40, overflow: 'hidden', border: '18px solid #fff', transform: 'rotate(-4deg)', background: b.mood, boxShadow: '0 40px 80px rgba(0,0,0,0.45)' }} />
                <Logo svg={moodLogo(brandSlug, data.logos)} width={logoWidth(brandSlug, 360)} />
                {subline(`Etiqueta a ${handle || data.brand.handler}`)}
            </AbsoluteFill>
        );
    }
    if (type === 'link') {
        return (
            <AbsoluteFill style={{ ...wrap, background: b.accent, color: b.onAccent }}>
                {big(text || data.brand.voice.headlines[0], 120)}
                {linkSticker(link || st.link || 'LINK')}
                <Logo svg={data.logos.onAccent} width={logoWidth(brandSlug, 380)} style={{ marginTop: 'auto' }} />
            </AbsoluteFill>
        );
    }
    // announce
    return (
        <AbsoluteFill style={{ ...wrap, background: b.mood }}>
            <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45))' }} />
            <Grain />
            <Logo svg={moodLogo(brandSlug, data.logos)} width={logoWidth(brandSlug, 760)} style={{ position: 'relative' }} />
            <div style={{ position: 'relative' }}>{big(text || st.announce || data.brand.sample.headline, 118)}</div>
            <div style={{ position: 'relative' }}>{subline(sub || data.brand.sample.sub)}</div>
            <div style={{ position: 'relative' }}>{linkSticker(link || st.link || data.brand.sample.cta)}</div>
        </AbsoluteFill>
    );
};

// ─── Post 4:5 / flyer ───
export const PostGraphic = ({ brandSlug, kicker, headline, sub, meta }) => {
    const data = useBrandData(brandSlug);
    if (!data) return null;
    const b = brandTheme(data.brand);
    const s = data.brand.sample;
    return (
        <AbsoluteFill style={{ background: b.mood, alignItems: 'center', justifyContent: 'center', gap: 44, padding: 90, color: '#fff', textAlign: 'center' }}>
            <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.5))' }} />
            <Grain />
            <div style={{ position: 'relative', ...typo(b, 'secondary'), fontSize: 34 }}>{kicker || s.kicker}</div>
            <Logo svg={moodLogo(brandSlug, data.logos)} width={logoWidth(brandSlug, 780)} style={{ position: 'relative' }} />
            {headline && <div style={{ position: 'relative', ...(b.editorial ? typo(b, 'secondary', { textTransform: 'none' }) : typo(b, 'display')), fontSize: 96, fontWeight: 800, lineHeight: 0.95 }}>{headline}</div>}
            <div style={{ position: 'relative', height: 4, width: 420, background: b.accent, boxShadow: `0 0 30px ${b.accent}` }} />
            <div style={{ position: 'relative', ...typo(b, 'secondary'), fontSize: 30 }}>{sub || s.sub}</div>
            <div style={{ position: 'absolute', bottom: 70, ...typo(b, 'secondary'), fontSize: 24, opacity: 0.85 }}>{meta || s.meta}</div>
        </AbsoluteFill>
    );
};

// ─── Animación de logo ───
export const LogoSting = ({ brandSlug }) => {
    const data = useBrandData(brandSlug);
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    if (!data) return null;
    const b = brandTheme(data.brand);
    const s = spring({ frame, fps, config: { damping: 18, mass: 0.8 }, durationInFrames: 30 });
    const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: 'clamp' });
    const sweep = interpolate(frame, [10, 40], [-30, 130], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
        <AbsoluteFill style={{ background: b.mood, alignItems: 'center', justifyContent: 'center' }}>
            <AbsoluteFill style={{ background: 'rgba(0,0,0,0.3)' }} />
            <Logo svg={moodLogo(brandSlug, data.logos)} width={logoWidth(brandSlug, 820)} style={{ position: 'relative', opacity: s * out, transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`, filter: `blur(${interpolate(s, [0, 1], [16, 0])}px)` }} />
            <AbsoluteFill style={{ background: `linear-gradient(100deg, transparent ${sweep - 20}%, ${b.accent}88 ${sweep}%, transparent ${sweep + 20}%)`, mixBlendMode: 'screen' }} />
            <Grain />
        </AbsoluteFill>
    );
};
