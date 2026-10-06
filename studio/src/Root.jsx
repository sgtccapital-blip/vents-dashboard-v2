import { Composition, Still } from 'remotion';
import { BriefReel, StoryGraphic, PostGraphic, LogoSting } from './compositions.jsx';
import { briefReelMetadata } from './timing.js';

// Props por defecto para previsualizar en `npm run studio`; los renders reales pasan sus props desde bin/.
const demoSegments = [
    { kind: 'graphic', inSec: 0, outSec: 2, overlay: 'MEMBERS OF THE NIGHT', kicker: 'VIERNES 04 SEP', transition: 'fundido' },
    { kind: 'graphic', inSec: 0, outSec: 2, overlay: 'TILL LATE', subtitle: 'esta noche, solo invitados', transition: 'barrido de luz' },
];

export const Root = () => (
    <>
        <Composition
            id="BriefReel"
            component={BriefReel}
            width={1080}
            height={1920}
            fps={30}
            durationInFrames={150}
            calculateMetadata={briefReelMetadata}
            defaultProps={{ brandSlug: 'the-room', handle: '@theroom.social', segments: demoSegments, captions: [], endcard: { cta: 'Request access', seconds: 2 }, music: null }}
        />
        <Still id="StoryGraphic" component={StoryGraphic} width={1080} height={1920} defaultProps={{ brandSlug: 'the-room', type: 'announce' }} />
        <Still id="PostGraphic" component={PostGraphic} width={1080} height={1350} defaultProps={{ brandSlug: 'the-room' }} />
        <Composition id="LogoSting" component={LogoSting} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ brandSlug: 'the-room' }} />
    </>
);
