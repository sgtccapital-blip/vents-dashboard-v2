// Duraciones del reel: compartidas entre la composición y su calculateMetadata.
export const FPS = 30;

export const segFrames = s => Math.max(1, Math.round(((s.outSec ?? 0) - (s.inSec ?? 0) || s.durationSec || 2) * FPS));

/** Frame de inicio de cada plano. */
export const segStarts = segments => segments.reduce((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + segFrames(segments[i - 1])], []);

export const briefReelMetadata = ({ props }) => {
    const body = (props.segments || []).reduce((n, s) => n + segFrames(s), 0);
    const end = props.endcard ? Math.round((props.endcard.seconds ?? 2) * FPS) : 0;
    return { durationInFrames: Math.max(FPS, body + end), fps: FPS, width: 1080, height: 1920 };
};
