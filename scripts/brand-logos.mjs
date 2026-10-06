// Logos vectoriales de cada marca, redibujados a partir de los avatares de Instagram.
// Cada marca expone: primary(c) lockup principal · symbol(c) símbolo solo · avatar(c) avatar circular de IG.
// `c` = { fg, bg, accent } para poder pintar la versión principal, invertida o monocroma.
// Los textos usan las fuentes de la marca (cargadas por tokens.css) con textLength para que la
// proporción del lockup no cambie aunque la fuente tarde en cargar.

let uidCounter = 0;
const uid = p => `${p}${++uidCounter}`;

const svg = (vb, body, label) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${label}" class="logo-svg">${body}</svg>`;

const text = (x, y, str, { size, family, weight = 400, fill, anchor = 'middle', len, adjust = 'spacingAndGlyphs', spacing, style = '' }) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${fill}"${len ? ` textLength="${len}" lengthAdjust="${adjust}"` : ''}${spacing ? ` letter-spacing="${spacing}"` : ''}${style ? ` style="${style}"` : ''}>${str}</text>`;

const circleAvatar = (bg, inner, vb = '0 0 320 320') => {
    const id = uid('clip');
    return svg(vb, `<defs><clipPath id="${id}"><circle cx="160" cy="160" r="160"/></clipPath></defs><g clip-path="url(#${id})"><rect width="320" height="320" fill="${bg}"/>${inner}</g>`, 'avatar');
};

// ─── ELEMENTO ───────────────────────────────────────────────
function elementoE(c, { chrome = true } = {}) {
    const g = uid('chrome'), f = uid('flare'), glow = uid('glow');
    const fill = chrome ? `url(#${g})` : c.fg;
    return `<defs>
      <linearGradient id="${g}" x1="0" y1="20" x2="0" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#FFFFFF"/><stop offset=".42" stop-color="#D7E0EC"/><stop offset=".5" stop-color="#6A7990"/>
        <stop offset=".6" stop-color="#B4C0D1"/><stop offset="1" stop-color="#F2F6FB"/></linearGradient>
      <radialGradient id="${f}"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".25" stop-color="#8FB3FF"/><stop offset="1" stop-color="#2F6BFF" stop-opacity="0"/></radialGradient>
      <filter id="${glow}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
    </defs>
    <g transform="translate(46 20) skewX(-24)">
      <path fill="${fill}" d="M24 0H168L150 24H26V40H120L106 60H26V76H140L122 100H0V24C0 10.7 10.7 0 24 0Z"/>
      ${chrome ? '<path fill="#FFFFFF" opacity=".55" d="M24 2H165L163 5H24C12 5 4 12 3 22H2C2 10 11 2 24 2Z"/>' : ''}
    </g>
    ${chrome ? `<ellipse cx="214" cy="21" rx="26" ry="16" fill="url(#${f})" opacity=".9"/><rect x="170" y="20" width="96" height="1.6" fill="#CFE0FF" filter="url(#${glow})"/><rect x="186" y="20.3" width="60" height="1" fill="#FFFFFF"/>` : ''}`;
}
const elemento = {
    symbol: c => svg('0 0 270 140', elementoE(c), 'Elemento'),
    primary: c => svg('0 0 820 150', `<g transform="translate(0 4) scale(1)">${elementoE(c)}</g>${text(300, 92, 'ELEMENTO', { size: 70, family: "'Unbounded', sans-serif", weight: 600, fill: c.fg, anchor: 'start', len: 500 })}${text(302, 128, 'D.A.N.C.E. — WHERE MOVEMENT BECOMES SOUND', { size: 15, family: "'Space Grotesk', sans-serif", weight: 500, fill: c.accent, anchor: 'start', len: 496, adjust: 'spacing' })}`, 'Elemento'),
    avatar: () => {
        const r = uid('deep');
        return circleAvatar('#05070F', `<defs><radialGradient id="${r}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#14306B"/><stop offset="1" stop-color="#05070F"/></radialGradient></defs><rect width="320" height="320" fill="url(#${r})"/><g transform="translate(39 83) scale(1.1)">${elementoE({ fg: '#fff' })}</g>`);
    },
};

// ─── 5AM CLUB ───────────────────────────────────────────────
function fiveAmSymbol(c, cx = 110, cy = 110) {
    const R = 60;
    const meridians = [0.78, 0.5, 0.2].map(k => `<ellipse cx="${cx}" cy="${cy}" rx="${(R * k).toFixed(1)}" ry="${R}"/>`).join('') + `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}"/>`;
    const parallels = [-46, -31, -15.5, 0, 15.5, 31, 46].map(dy => {
        const half = Math.sqrt(R * R - dy * dy);
        return `<line x1="${(cx - half).toFixed(1)}" y1="${cy + dy}" x2="${(cx + half).toFixed(1)}" y2="${cy + dy}"/>`;
    }).join('');
    const crosses = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * 90, y = cy + Math.sin(a) * 90;
        return `<path d="M${(x - 6).toFixed(1)} ${(y - 6).toFixed(1)}L${(x + 6).toFixed(1)} ${(y + 6).toFixed(1)}M${(x + 6).toFixed(1)} ${(y - 6).toFixed(1)}L${(x - 6).toFixed(1)} ${(y + 6).toFixed(1)}"/>`;
    }).join('');
    return `<g fill="none" stroke="${c.accent}" stroke-width="2.6"><circle cx="${cx}" cy="${cy}" r="${R}" stroke-width="3.4"/>${meridians}${parallels}</g><g stroke="${c.fg}" stroke-width="4.6" stroke-linecap="round">${crosses}</g>`;
}
const fiveam = {
    symbol: c => svg('0 0 220 220', fiveAmSymbol(c), '5AM Club'),
    primary: c => svg('0 0 300 290', `<g transform="translate(40 0)">${fiveAmSymbol(c)}</g>${text(150, 270, '5AM CLUB ©', { size: 30, family: "'Krona One', sans-serif", fill: c.fg, len: 236 })}`, '5AM Club'),
    avatar: () => circleAvatar('#000000', `<g transform="translate(40 18) scale(.8)"><g transform="translate(40 0)">${fiveAmSymbol({ fg: '#FFFFFF', accent: '#6F52FF' })}</g>${text(150, 270, '5AM CLUB ©', { size: 30, family: "'Krona One', sans-serif", fill: '#FFFFFF', len: 236 })}</g>`),
};

// ─── THE ROOM ───────────────────────────────────────────────
function owl(c, sw = 2.4) {
    return `<g fill="none" stroke="${c.fg}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <rect x="31" y="1" width="26" height="25" rx="2"/><path d="M31 20H57"/><path d="M18 29C30 24 58 24 70 29"/>
      <path d="M24 35C30 29 40 31 44 37C48 31 58 29 64 35C66 49 56 62 44 66C32 62 22 49 24 35Z"/>
      <path d="M31 45Q35.5 40.5 40 45Q35.5 48 31 45Z"/><path d="M48 45Q52.5 40.5 57 45Q52.5 48 48 45Z"/>
      <circle cx="52.5" cy="44.5" r="7.5"/><path d="M44 49L42 55L44 57L46 55Z"/>
      <path d="M60 47C66 60 63 80 67 97" stroke-dasharray="2 3"/>
      <path d="M27 59C13 77 14 111 30 133H58C71 113 70 81 60 60"/>
      <path d="M31 73C17 87 7 105 3 123L19 119L15 129L33 121C41 111 43 93 39 77"/>
      <path d="M23 99L35 95M19 109L33 105M15 119L29 113"/>
      <path d="M46 88q3 3 6 0M42 102q3 3 6 0M50 114q3 3 6 0"/>
      <path d="M38 133V148M33 150H43M50 133V148M45 150H55"/>
    </g>`;
}
const theRoom = {
    symbol: c => svg('-4 -4 96 160', owl(c, 2.6), 'The Room'),
    primary: c => svg('0 0 540 230', `${text(120, 166, 'THE', { size: 112, family: "'Bodoni Moda', serif", fill: c.fg, len: 168 })}<g transform="translate(205 -1) scale(1.12)">${owl(c, 2.2)}</g>${text(410, 166, 'ROOM', { size: 112, family: "'Bodoni Moda', serif", fill: c.fg, len: 236 })}${text(270, 212, 'Social Club', { size: 24, family: "'Josefin Sans', sans-serif", weight: 400, fill: c.fg, len: 128, adjust: 'spacing' })}`, 'The Room Social Club'),
    avatar: () => circleAvatar('#1A1414', `<g transform="translate(26 92) scale(.5)">${theRoom.primaryBody({ fg: '#F2EDE6' })}</g>`),
    primaryBody: c => `${text(120, 166, 'THE', { size: 112, family: "'Bodoni Moda', serif", fill: c.fg, len: 168 })}<g transform="translate(205 -1) scale(1.12)">${owl(c, 2.2)}</g>${text(410, 166, 'ROOM', { size: 112, family: "'Bodoni Moda', serif", fill: c.fg, len: 236 })}${text(270, 212, 'Social Club', { size: 24, family: "'Josefin Sans', sans-serif", fill: c.fg, len: 128, adjust: 'spacing' })}`,
};

// ─── HANG OUT ───────────────────────────────────────────────
function banana(c, { neon = true, sw = 4 } = {}) {
    const f = uid('neon');
    const d = 'M63 13C64.5 9.5 70.5 9.5 71.5 13.5L72.5 24C83 37 85 58 71 72C58.5 84.5 37 88.5 22 86.5C14 85.5 13.5 77.5 20 75.5C36 71 52 62 60 47.5C66 36 66.5 30 64 24Z';
    const inner = 'M66.5 28C71 47 61 66 33 80';
    return `${neon ? `<defs><filter id="${f}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : ''}
    <g fill="none" stroke="${c.accent}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${neon ? ` filter="url(#${f})"` : ''}><path d="${d}"/><path d="${inner}"/></g>`;
}
const hangout = {
    symbol: c => svg('0 0 100 100', banana(c), 'Hang Out'),
    primary: c => svg('0 0 500 120', `<g transform="translate(0 6) scale(1.1)">${banana(c)}</g>${text(126, 76, 'HANG OUT', { size: 64, family: "'Rubik', sans-serif", weight: 800, fill: c.fg, anchor: 'start', len: 330 })}${text(128, 104, 'PANAMÁ ®', { size: 15, family: "'DM Sans', sans-serif", weight: 700, fill: c.accent, anchor: 'start', spacing: 5 })}`, 'Hang Out Panamá'),
    avatar: () => circleAvatar('#000000', `<g transform="translate(72 72) scale(1.8)">${banana({ accent: '#F2C94C', sw: 3.4 })}</g>`),
};

// ─── IGNITE ─────────────────────────────────────────────────
const igniteWord = c => `${text(18, 96, 'IGNITE', { size: 104, family: "'Archivo', sans-serif", weight: 900, fill: c.accent, anchor: 'start', len: 364, style: 'font-stretch:125%' })}${text(382, 186, 'CLUB', { size: 104, family: "'Archivo', sans-serif", weight: 900, fill: c.accent, anchor: 'end', len: 232, style: 'font-stretch:125%' })}`;
const spark = c => `<path fill="${c.accent}" d="M50 0C54 34 66 46 100 50C66 54 54 66 50 100C46 66 34 54 0 50C34 46 46 34 50 0Z"/><path fill="${c.accent}" opacity=".55" transform="translate(70 4) scale(.26)" d="M50 0C54 34 66 46 100 50C66 54 54 66 50 100C46 66 34 54 0 50C34 46 46 34 50 0Z"/>`;
const ignite = {
    symbol: c => svg('0 0 100 100', spark(c), 'Ignite'),
    primary: c => svg('0 0 400 200', igniteWord(c), 'Ignite Club'),
    avatar: () => circleAvatar('#1A1A1A', `<g transform="translate(60 110) scale(.5)">${igniteWord({ accent: '#E3262B' })}</g>`),
};

// ─── DINNER CLUB ────────────────────────────────────────────
const dinnerInner = c => `${text(150, 160, 'DINNER', { size: 66, family: "'Source Sans 3', sans-serif", weight: 700, fill: c.fg, len: 206 })}${text(150, 202, 'CLUB', { size: 22, family: "'Source Sans 3', sans-serif", weight: 400, fill: c.fg, len: 84, adjust: 'spacing' })}`;
const dinner = {
    symbol: c => svg('0 0 300 300', `<circle cx="150" cy="150" r="146" fill="none" stroke="${c.fg}" stroke-width="3"/>${text(150, 178, 'DC', { size: 96, family: "'Source Sans 3', sans-serif", weight: 700, fill: c.fg, len: 120 })}`, 'Dinner Club'),
    primary: c => svg('0 0 300 300', `<circle cx="150" cy="150" r="150" fill="${c.bg}"/>${dinnerInner(c)}`, 'Dinner Club'),
    avatar: () => circleAvatar('#000000', `<circle cx="160" cy="160" r="160" fill="#FFFFFF"/><g transform="translate(10 10)">${dinnerInner({ fg: '#0B0B0B' })}</g>`),
};

// ─── URBAN NIGHTS ───────────────────────────────────────────
const urbanWord = c => `
    <rect x="12" y="12" width="296" height="88" fill="none" stroke="${c.fg}" stroke-width="5"/>
    ${text(160, 86, 'URBAN', { size: 78, family: "'Russo One', sans-serif", fill: c.fg, len: 268 })}
    <rect x="22" y="53" width="276" height="6" fill="${c.bg}"/>
    ${text(160, 186, 'NIGHTS', { size: 78, family: "'Russo One', sans-serif", fill: c.fg, len: 284 })}
    <rect x="14" y="153" width="292" height="6" fill="${c.bg}"/>`;
const urban = {
    symbol: c => svg('0 0 320 200', urbanWord(c), 'Urban Nights'),
    primary: c => svg('0 0 320 200', urbanWord(c), 'Urban Nights'),
    avatar: () => circleAvatar('#FFFFFF', `<g transform="translate(64 100) scale(.6)">${urbanWord({ fg: '#000000', bg: '#FFFFFF' })}</g>`),
};

// ─── UDP ────────────────────────────────────────────────────
const panamaFlag = (x, y, w = 40) => {
    const h = w * 0.62, star = s => `<path transform="translate(${s[0]} ${s[1]}) scale(${w / 120})" fill="${s[2]}" d="M0-10L2.9-3.1L10-3.1L4.3 1.2L6.5 8.1L0 4L-6.5 8.1L-4.3 1.2L-10-3.1L-2.9-3.1Z"/>`;
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF"/><rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h / 2}" fill="#D21034"/><rect x="${x}" y="${y + h / 2}" width="${w / 2}" height="${h / 2}" fill="#005293"/>${star([x + w / 4, y + h / 4, '#005293'])}${star([x + (3 * w) / 4, y + (3 * h) / 4, '#D21034'])}</g>`;
};
const udpLockup = c => `
    ${text(180, 140, 'UDP', { size: 158, family: "'Poppins', sans-serif", weight: 900, fill: c.fg, len: 300 })}
    <rect x="30" y="160" width="300" height="38" rx="3" fill="${c.fg}"/>
    <text x="44" y="186" font-family="'Poppins', sans-serif" font-size="20" fill="${c.bg}" letter-spacing="5"><tspan font-weight="700">URBAN</tspan><tspan font-weight="300" dx="8">DEVELOPMENT</tspan></text>
    <rect x="30" y="204" width="300" height="38" rx="3" fill="${c.fg}"/>
    <text x="44" y="231" font-family="'Poppins', sans-serif" font-size="22" fill="${c.bg}" letter-spacing="6"><tspan font-weight="700">PROJECT</tspan><tspan font-weight="300" dx="10" font-size="16">| PTY</tspan></text>
    ${panamaFlag(276, 211, 40)}`;
const udp = {
    symbol: c => svg('0 0 360 160', text(180, 140, 'UDP', { size: 158, family: "'Poppins', sans-serif", weight: 900, fill: c.fg, len: 300 }), 'UDP'),
    primary: c => svg('0 0 360 260', udpLockup(c), 'UDP Urban Development Project'),
    avatar: () => circleAvatar('#FFFFFF', `<circle cx="160" cy="160" r="150" fill="none" stroke="#E6E6E6" stroke-width="2"/><g transform="translate(52 46) scale(.6)">${udpLockup({ fg: '#0A0A0A', bg: '#FFFFFF' })}</g>${text(160, 236, 'ORGANIZAMOS HOY,', { size: 9, family: "'Poppins', sans-serif", weight: 500, fill: '#4A4A4A', spacing: 3 })}<text x="160" y="250" text-anchor="middle" font-family="'Poppins', sans-serif" font-size="9" font-weight="500" fill="#4A4A4A" letter-spacing="3">TRANSFORMAMOS <tspan fill="#C89B3C" font-weight="700">CIUDAD.</tspan></text>`),
};

// ─── ARRIVE ─────────────────────────────────────────────────
const arriveWord = (c, desc = 'MODEL MANAGEMENT') => `${text(210, 96, 'ARRIVE', { size: 100, family: "'Montserrat', sans-serif", weight: 600, fill: c.fg, len: 356 })}${text(210, 134, desc, { size: 18, family: "'Montserrat', sans-serif", weight: 400, fill: c.fg, len: 356, adjust: 'spacing' })}`;
const arrive = {
    symbol: c => svg('0 0 200 200', `<circle cx="100" cy="100" r="96" fill="none" stroke="${c.fg}" stroke-width="2"/>${text(100, 132, 'A', { size: 100, family: "'Montserrat', sans-serif", weight: 600, fill: c.fg })}`, 'ARRIVE'),
    primary: c => svg('0 0 420 150', arriveWord(c), 'ARRIVE Model Management'),
    agency: c => svg('0 0 420 150', arriveWord(c, 'TALENT &amp; EXPERIENCES'), 'ARRIVE Talent & Experiences'),
    avatar: () => circleAvatar('#FFFFFF', `<g transform="translate(34 110) scale(.6)">${arriveWord({ fg: '#0A0A0A' })}</g>`),
};

export const LOGOS = {
    elemento, '5amclub': fiveam, 'the-room': theRoom, hangout, ignite, 'dinner-club': dinner, 'urban-nights': urban, udp, arrive,
};

// Colores por defecto de cada versión a partir del tema de la marca
export function logoSet(slug, t) {
    const L = LOGOS[slug];
    if (!L) throw new Error(`Sin logo para ${slug}`);
    const base = { fg: t.fg, bg: t.bg, accent: t.accent };
    const inverse = { fg: t.bg, bg: t.fg, accent: t.accent };
    const onAccent = { fg: t.onAccent, bg: t.accent, accent: t.onAccent };
    // Ajustes por marca para que cada versión respete su logo real
    const fix = {
        hangout: { base: { ...base, accent: t.accent }, inverse: { fg: '#000', bg: t.accent, accent: '#000' } },
        ignite: { base: { ...base, accent: t.accent }, inverse: { bg: '#FFFFFF', accent: t.accent }, onAccent: { accent: '#FFFFFF' } },
        'dinner-club': { base: { fg: '#0B0B0B', bg: '#FFFFFF' }, inverse: { fg: '#FFFFFF', bg: '#0B0B0B' }, onAccent: { fg: '#0B0B0B', bg: '#FFFFFF' } },
        'urban-nights': { base: { fg: '#FFFFFF', bg: t.bg }, inverse: { fg: '#000000', bg: '#FFFFFF' }, onAccent: { fg: '#FFFFFF', bg: t.accent } },
        '5amclub': { inverse: { fg: '#0A0A0A', bg: '#FFFFFF', accent: t.accent }, onAccent: { fg: '#FFFFFF', bg: t.accent, accent: '#FFFFFF' } },
    }[slug] || {};
    const v = {
        base: { ...base, ...(fix.base || {}) },
        inverse: { ...inverse, ...(fix.inverse || {}) },
        onAccent: { ...onAccent, ...(fix.onAccent || {}) },
    };
    return {
        primary: L.primary(v.base),
        inverse: L.primary(v.inverse),
        onAccent: L.primary(v.onAccent),
        symbol: L.symbol(v.base),
        symbolInverse: L.symbol(v.inverse),
        avatar: L.avatar(),
        agency: L.agency ? L.agency(v.base) : null,
        colors: v,
    };
}
