// Tema de marca para los renders: resuelve tokens de brand.json, carga tipografías y define
// la corrección de color de cada cuenta (su "look" de video).
import { loadFont as anton } from '@remotion/google-fonts/Anton';
import { loadFont as archivo } from '@remotion/google-fonts/Archivo';
import { loadFont as archivoNarrow } from '@remotion/google-fonts/ArchivoNarrow';
import { loadFont as barlow } from '@remotion/google-fonts/Barlow';
import { loadFont as bigShoulders } from '@remotion/google-fonts/BigShoulders';
import { loadFont as bodoniModa } from '@remotion/google-fonts/BodoniModa';
import { loadFont as cormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as dmSans } from '@remotion/google-fonts/DMSans';
import { loadFont as dmSerif } from '@remotion/google-fonts/DMSerifDisplay';
import { loadFont as inter } from '@remotion/google-fonts/Inter';
import { loadFont as jetbrains } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as josefin } from '@remotion/google-fonts/JosefinSans';
import { loadFont as kronaOne } from '@remotion/google-fonts/KronaOne';
import { loadFont as montserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as playfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as poppins } from '@remotion/google-fonts/Poppins';
import { loadFont as robotoMono } from '@remotion/google-fonts/RobotoMono';
import { loadFont as rubik } from '@remotion/google-fonts/Rubik';
import { loadFont as russoOne } from '@remotion/google-fonts/RussoOne';
import { loadFont as sourceSans } from '@remotion/google-fonts/SourceSans3';
import { loadFont as spaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as unbounded } from '@remotion/google-fonts/Unbounded';

// Familia de brand.json → loader de Google Fonts (Big Shoulders Display vive en el módulo BigShoulders).
const LOADERS = {
    Anton: anton, Archivo: archivo, 'Archivo Narrow': archivoNarrow, Barlow: barlow, 'Big Shoulders Display': bigShoulders,
    'Bodoni Moda': bodoniModa, 'Cormorant Garamond': cormorant, 'DM Sans': dmSans, 'DM Serif Display': dmSerif, Inter: inter,
    'JetBrains Mono': jetbrains, 'Josefin Sans': josefin, 'Krona One': kronaOne, Montserrat: montserrat, 'Playfair Display': playfair,
    Poppins: poppins, 'Roboto Mono': robotoMono, Rubik: rubik, 'Russo One': russoOne, 'Source Sans 3': sourceSans,
    'Space Grotesk': spaceGrotesk, Unbounded: unbounded,
};

const loaded = new Map();
function familyFor(spec) {
    const loader = LOADERS[spec.family];
    if (!loader) return `'${spec.family}', sans-serif`;
    const key = `${spec.family}|${spec.italic ? 'i' : 'n'}`;
    if (!loaded.has(key)) {
        const { fontFamily } = loader(spec.italic ? 'italic' : 'normal', { weights: spec.weights.map(String), subsets: ['latin', 'latin-ext'] });
        loaded.set(key, fontFamily);
    }
    return loaded.get(key);
}

// Look de color por cuenta (equivalente a un LUT suave); se aplica a todo el material raw.
const GRADES = {
    'the-room': 'sepia(0.28) saturate(1.25) hue-rotate(-14deg) contrast(1.12) brightness(0.9)',
    elemento: 'saturate(0.8) hue-rotate(12deg) contrast(1.12) brightness(0.92)',
    ignite: 'contrast(1.22) saturate(1.35)',
    hangout: 'sepia(0.18) saturate(1.15) brightness(1.06) contrast(1.05)',
    'dinner-club': 'sepia(0.22) saturate(1.05) contrast(1.06)',
    'urban-nights': 'contrast(1.28) saturate(1.2) brightness(0.95)',
    udp: 'saturate(0.55) sepia(0.12) contrast(1.06)',
    '5amclub': 'contrast(1.15) saturate(1.1)',
    arrive: 'sepia(0.1) saturate(1.05) contrast(1.05)',
};

// Tinte de color encima del video (multiply/overlay) para reforzar la paleta.
const TINTS = {
    'the-room': ['rgba(122,14,14,0.28)', 'multiply'],
    elemento: ['rgba(47,107,255,0.18)', 'overlay'],
    ignite: ['rgba(227,38,43,0.12)', 'overlay'],
    'urban-nights': ['rgba(225,6,0,0.10)', 'overlay'],
    hangout: ['rgba(242,201,76,0.10)', 'overlay'],
};

const resolve = (brand, ref) => (ref?.startsWith('#') ? ref : brand.colors.find(c => c.token === ref)?.hex);

export function brandTheme(brand) {
    const t = Object.fromEntries(Object.entries(brand.theme).map(([k, v]) => [k, resolve(brand, v)]));
    const ty = brand.typography;
    const fonts = Object.fromEntries(Object.entries(ty).map(([role, spec]) => [role, familyFor(spec)]));
    const lum = hex => {
        const n = parseInt(hex.slice(1), 16);
        return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    };
    return {
        slug: brand.slug,
        layout: brand.layout,
        colors: Object.fromEntries(brand.colors.map(c => [c.token, c.hex])),
        bg: t.bg, fg: t.fg, accent: t.accent, surface: t.surface, muted: t.muted,
        onAccent: lum(t.accent) > 0.6 ? '#0A0A0A' : '#FFFFFF',
        fonts,
        stretch: ty.display.stretch ? `${ty.display.stretch}%` : 'normal',
        tracking: Object.fromEntries(Object.entries(ty).map(([role, spec]) => [role, spec.tracking])),
        uppercase: Object.fromEntries(Object.entries(ty).map(([role, spec]) => [role, spec.case === 'uppercase'])),
        italic: Object.fromEntries(Object.entries(ty).map(([role, spec]) => [role, Boolean(spec.italic)])),
        mood: brand.mood,
        grade: GRADES[brand.slug] || 'none',
        tint: TINTS[brand.slug] || null,
        editorial: ['editorial', 'minimal', 'social'].includes(brand.layout),
    };
}

/** Estilo tipográfico de un rol de la marca. */
export function typo(b, role, extra = {}) {
    const r = b.fonts[role] ? role : 'display';
    return {
        fontFamily: b.fonts[r],
        letterSpacing: b.tracking[r],
        textTransform: b.uppercase[r] ? 'uppercase' : 'none',
        fontStyle: b.italic[r] ? 'italic' : 'normal',
        fontStretch: r === 'display' ? b.stretch : 'normal',
        ...extra,
    };
}
