// Genera, a partir de brands/<marca>/brand.json (fuente de verdad de cada línea gráfica):
//   brands/<marca>/tokens.css     → variables CSS para webs y piezas HTML
//   brands/<marca>/BRAND.md       → guía completa para Claude Code y otros LLMs
//   brands/<marca>/logo/*.svg     → logos vectoriales (principal, invertido, sobre acento, símbolo, avatar)
//   public/brands/<marca>/        → brandbook visual (index.html + tokens.css + brand.json + logo/)
//   public/brands/index.html|json → índice de marcas (el dashboard enlaza desde aquí)
// Uso: npm run brands
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logoSet } from './brand-logos.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'brands');
const OUT = path.join(ROOT, 'public', 'brands');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── Color ───
function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
}
// Prefiere texto blanco si pasa AA; si no, el que más contraste dé.
const readableOn = (hex, dark = '#0A0A0A', light = '#FFFFFF') =>
    contrast(hex, light) >= 4.5 || contrast(hex, light) >= contrast(hex, dark) ? light : dark;

function resolveColor(brand, ref) {
    if (!ref) return null;
    if (ref.startsWith('#')) return ref;
    const c = brand.colors.find(x => x.token === ref);
    if (!c) throw new Error(`[${brand.slug}] color "${ref}" no existe en colors`);
    return c.hex;
}

function themeOf(brand) {
    const t = Object.fromEntries(Object.entries(brand.theme).map(([k, v]) => [k, resolveColor(brand, v)]));
    t.onAccent = readableOn(t.accent);
    t.isDark = luminance(t.bg) < 0.2;
    return t;
}

// ─── Tipografía ───
const FALLBACK = { display: 'sans-serif', logo: 'sans-serif', secondary: 'sans-serif', body: 'sans-serif', mono: 'monospace' };
const SERIF_FAMILIES = ['Cormorant Garamond', 'Bodoni Moda', 'Playfair Display', 'DM Serif Display'];
const stack = (role, f) => `'${f.family}', ${SERIF_FAMILIES.includes(f.family) ? 'serif' : FALLBACK[role] || 'sans-serif'}`;
const fontStyle = (role, f) => `font-family:${stack(role, f)};${f.italic ? 'font-style:italic;' : ''}${f.stretch ? `font-stretch:${f.stretch}%;` : ''}`;

function googleFontsUrl(brand) {
    const byFamily = new Map();
    for (const f of Object.values(brand.typography)) {
        const cur = byFamily.get(f.family) || { combos: new Set(), italic: false, stretch: false };
        for (const w of f.weights) cur.combos.add(`${f.stretch || 100},${w}`);
        cur.italic ||= Boolean(f.italic);
        cur.stretch ||= Boolean(f.stretch);
        byFamily.set(f.family, cur);
    }
    const families = [...byFamily].map(([family, { combos, italic, stretch }]) => {
        const name = family.replace(/ /g, '+');
        const list = [...combos].map(c => c.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        if (stretch) return `family=${name}:wdth,wght@${list.map(([s, w]) => `${s},${w}`).join(';')}`;
        const ws = [...new Set(list.map(([, w]) => w))];
        if (italic) return `family=${name}:ital,wght@${[...ws.map(w => `0,${w}`), ...ws.map(w => `1,${w}`)].join(';')}`;
        return `family=${name}:wght@${ws.join(';')}`;
    });
    return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

const TYPE_SCALE = [
    { name: 'Display XL', token: 'display-xl', role: 'display', size: 96, line: 0.95 },
    { name: 'Display L', token: 'display-l', role: 'display', size: 64, line: 1 },
    { name: 'H1', token: 'h1', role: 'display', size: 48, line: 1.05 },
    { name: 'H2', token: 'h2', role: 'display', size: 32, line: 1.1 },
    { name: 'H3 / editorial', token: 'h3', role: 'secondary', size: 24, line: 1.25 },
    { name: 'Body L', token: 'body-l', role: 'body', size: 18, line: 1.6 },
    { name: 'Body', token: 'body', role: 'body', size: 16, line: 1.6 },
    { name: 'Label', token: 'label', role: 'secondary', size: 12, line: 1.4 },
];

// ─── tokens.css ───
function tokensCss(brand) {
    const t = themeOf(brand);
    const ty = brand.typography;
    return [
        `/* ${brand.name} — tokens de marca. Generado por scripts/build-brands.mjs desde brands/${brand.slug}/brand.json. No editar a mano. */`,
        `@import url('${googleFontsUrl(brand)}');`,
        '',
        ':root {',
        '  /* Paleta */',
        ...brand.colors.map(c => `  --brand-${c.token}: ${c.hex}; /* ${c.name} · ${c.role} */`),
        '',
        '  /* Roles */',
        `  --brand-bg: ${t.bg};`,
        `  --brand-surface: ${t.surface};`,
        `  --brand-fg: ${t.fg};`,
        `  --brand-muted: ${t.muted};`,
        `  --brand-accent: ${t.accent};`,
        `  --brand-on-accent: ${t.onAccent};`,
        `  --brand-line: ${t.line};`,
        '',
        '  /* Tipografía */',
        ...Object.entries(ty).map(([role, f]) => `  --font-${role}: ${stack(role, f)};`),
        ...Object.entries(ty).map(([role, f]) => `  --tracking-${role}: ${f.tracking};`),
        `  --stretch-display: ${ty.display.stretch ? `${ty.display.stretch}%` : '100%'};`,
        ...TYPE_SCALE.map(s => `  --text-${s.token}: ${s.size / 16}rem;`),
        '',
        '  /* Forma y movimiento */',
        `  --radius: ${brand.ui.radius};`,
        ...[1, 2, 3, 4, 6, 8, 12, 16].map(n => `  --space-${n}: ${(brand.ui.spacingBase * n) / 16}rem;`),
        `  --ease: ${brand.motion.easing};`,
        ...(brand.gradients || []).map(g => `  --gradient-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}: ${g.css};`),
        `  --mood: ${brand.mood};`,
        '}',
        '',
    ].join('\n');
}

// ─── BRAND.md ───
const list = arr => (arr || []).map(x => `- ${x}`).join('\n');
const LOGO_FILES = ['primary', 'inverse', 'on-accent', 'symbol', 'avatar'];
function brandMd(brand) {
    const t = themeOf(brand);
    const typeRows = Object.entries(brand.typography).map(([role, f]) =>
        `| ${role} | ${f.family}${f.italic ? ' (itálica)' : ''}${f.stretch ? ` (ancho ${f.stretch}%)` : ''} | ${f.weights.join(', ')} | ${f.case === 'uppercase' ? 'MAYÚSCULAS' : 'normal'} · tracking ${f.tracking} | ${f.usage} |`);
    return `# ${brand.name} — Línea gráfica

> ${brand.descriptor} · ${brand.handler} · ${brand.ig?.followers || ''} seguidores
> **${brand.tagline}**

Fuente de verdad: \`brands/${brand.slug}/brand.json\`. Tokens para web: \`brands/${brand.slug}/tokens.css\`.
Brandbook visual: \`/brands/${brand.slug}/\` en el dashboard. Este archivo se genera con \`npm run brands\`; no lo edites a mano.

## Esencia

**${brand.essence}**

${brand.positioning}

**Personalidad:** ${brand.personality.join(' · ')}

**Valores:**
${list(brand.values)}

## Logo

Archivos vectoriales (redibujados del avatar de Instagram): ${LOGO_FILES.map(f => `\`brands/${brand.slug}/logo/${f}.svg\``).join(', ')}.
Los SVG usan las fuentes de la marca vía Google Fonts; para impresión, convertir textos a contornos.

- **Símbolo:** ${brand.logo.symbol}
- **Construcción:** ${brand.logo.construction}
- **Área de respeto:** ${brand.logo.clearspace}
- **Tamaño mínimo:** ${brand.logo.minSize}

**Versiones:**
${list(brand.logo.versions)}

**Usos incorrectos:**
${list(brand.logo.misuse)}

## Instagram

- **Bio:** ${(brand.ig?.bio || []).join(' / ')}
- **Highlights:** ${(brand.ig?.highlights || []).join(', ')}
- **Grilla:** ${brand.social.grid}

## Color

| Token | Nombre | Hex | Rol | Uso |
|---|---|---|---|---|
${brand.colors.map(c => `| \`--brand-${c.token}\` | ${c.name} | \`${c.hex}\` | ${c.role} | ${c.usage} |`).join('\n')}

**Roles de interfaz:** fondo \`${t.bg}\` · superficie \`${t.surface}\` · texto \`${t.fg}\` · secundario \`${t.muted}\` · acento \`${t.accent}\` (texto sobre acento \`${t.onAccent}\`).
${(brand.gradients || []).length ? `\n**Degradados:**\n${brand.gradients.map(g => `- ${g.name}: \`${g.css}\``).join('\n')}\n` : ''}
## Tipografía (Google Fonts)

| Rol | Familia | Pesos | Estilo | Uso |
|---|---|---|---|---|
${typeRows.join('\n')}

Cargar: \`${googleFontsUrl(brand)}\`

**Escala web (px):** ${TYPE_SCALE.map(s => `${s.name} ${s.size}`).join(' · ')}

## Interfaz y web

- **Radio:** ${brand.ui.radius}
- **Botones:** ${brand.ui.buttonStyle}
- **Grid:** ${brand.ui.grid}
- **Espaciado base:** ${brand.ui.spacingBase} px
- **Profundidad:** ${brand.ui.shadow}
- **Iconografía:** ${brand.iconography}

### Estructura de la web

${brand.web.concept}

**Mapa del sitio:** ${brand.web.sitemap.join(' → ')}

**Hero:** ${brand.web.hero}

**Secciones clave:**
${list(brand.web.sections)}

**Funcionalidades:**
${list(brand.web.features)}

## Fotografía e imagen

- **Qué fotografiar:** ${brand.imagery.photography}
- **Tratamiento:** ${brand.imagery.treatment}
- **Evitar:** ${brand.imagery.avoid}

**Elementos gráficos:**
${list(brand.graphicElements)}

## Motion

- **Principios:** ${brand.motion.principles.join(' · ')}
- **Easing:** \`${brand.motion.easing}\`
- **Duraciones:** ${brand.motion.durations}
- **Animación firma:** ${brand.motion.signature}

## Redes sociales

| Plantilla | Formato | Especificación |
|---|---|---|
${brand.social.templates.map(x => `| ${x.name} | ${x.format} | ${x.spec} |`).join('\n')}

## Voz

${brand.voice.tone}

**Titulares de referencia:**
${list(brand.voice.headlines.map(h => `"${h}"`))}

**Palabras que sí:** ${brand.voice.use.join(', ')}
**Palabras que no:** ${brand.voice.avoid.join(', ')}

## Reglas

**Siempre:**
${list(brand.dos)}

**Nunca:**
${list(brand.donts)}
`;
}

// ─── Piezas del brandbook ───
// Logo que va sobre las fotos/moods de las plantillas: claro sobre moods oscuros.
const MOOD_LOGO = { udp: 'inverse', 'dinner-club': 'primary', arrive: 'primary' };
const moodLogo = (brand, L) => (MOOD_LOGO[brand.slug] === 'inverse' ? L.inverse : L.primary);
const moodSymbol = (brand, L) => (MOOD_LOGO[brand.slug] === 'inverse' ? L.symbolInverse : L.symbol);

function headline(text, accentLast) {
    if (!accentLast) return esc(text);
    const words = text.split(' ');
    const last = words.pop();
    return `${esc(words.join(' '))} <span class="hl">${esc(last)}</span>`;
}

function postTemplate(brand, L, s = brand.sample) {
    const k = esc(s.kicker), sub = esc(s.sub), meta = esc(s.meta), cta = esc(s.cta);
    const h = headline(s.headline, ['news', 'institutional'].includes(brand.layout));
    switch (brand.layout) {
        case 'editorial': return `<div class="tpl post l-editorial"><div class="ph"></div><div class="corner-logo">${L.primary}</div><div class="band"><div class="k">${k}</div><div class="h sec">${h}</div><div class="sub">${sub}</div><div class="meta">${meta}</div></div></div>`;
        case 'news': return `<div class="tpl post l-news"><div class="ph"></div><div class="seal">${L.symbol}</div><div class="box"><span class="pill">${k}</span><div class="h">${h}</div><div class="sub mono">${sub}</div><div class="meta mono">${meta}</div></div><div class="ticker mono">S&amp;P 500 <b class="dn">−2.75%</b> · NASDAQ <b class="dn">−3.10%</b> · GOLD <b class="up">+5.02%</b> · BTC <b class="up">+1.40%</b> · OIL <b class="dn">−0.80%</b></div></div>`;
        case 'centered': return `<div class="tpl post l-centered"><div class="ph"></div><div class="frame"></div><div class="stack"><div class="k">${k}</div><div class="center-logo">${L.primary}</div><div class="flare"></div><div class="sub">${sub}</div><div class="lineup">${esc(brand.sample.lineup || 'JOSHUA POLO · DJ IRVING · DJ JOHN')}</div></div><div class="meta">${meta}</div></div>`;
        case 'impact': return `<div class="tpl post l-impact"><div class="ph"></div><div class="k">${k}</div><div class="giant">${h}</div><div class="sub">${sub}</div><span class="btn-pill">${cta}</span><div class="corner-logo">${L.primary}</div></div>`;
        case 'social': return `<div class="tpl post l-social"><div class="ph"></div><div class="flash"></div><div class="phrase">Ese momento donde entiendes por qué nadie quería perderse esta noche</div><div class="sticker">${L.symbol}</div><div class="foot"><div class="h">${h}</div><div class="sub">${sub}</div></div></div>`;
        case 'minimal': return `<div class="tpl post l-minimal"><div class="k">${k}</div><div class="circle">${L.primary}</div><div class="sub sec">${sub}</div><div class="rule"></div><div class="meta">${meta}</div></div>`;
        case 'urban': return `<div class="tpl post l-urban"><div class="ph"></div><div class="skyline"></div><div class="k">${k}</div><div class="h chrome">${h}</div><div class="boxwm">${L.primary}</div><div class="sub">${sub}</div><div class="bar">${meta}</div></div>`;
        case 'institutional': return `<div class="tpl post l-institutional"><div class="ph"></div><div class="corner-logo">${L.inverse}</div><div class="h">${h}</div><div class="rule"></div><div class="sub">${sub}</div><div class="cats">${k}</div></div>`;
        case 'cinematic':
        default: return `<div class="tpl post l-cinematic"><div class="ph"></div><div class="horizon"></div><div class="corner-logo">${L.symbol}</div><div class="over"><div class="k">${k}</div><div class="h">${h}</div><div class="sub">${sub}</div><div class="meta mono">${meta}</div></div></div>`;
    }
}

function storyTemplate(brand, L) {
    const s = brand.sample;
    return `<div class="tpl story l-${brand.layout}"><div class="ph"></div><div class="story-in"><div class="story-logo">${moodLogo(brand, L)}</div><div class="story-mid"><div class="k">${esc(s.kicker)}</div><div class="h">${esc(s.headline)}</div><div class="sub">${esc(s.sub)}</div></div><span class="btn">${esc(s.cta)}</span><div class="meta">${esc(s.meta)}</div></div></div>`;
}

function carouselTemplate(brand, L) {
    const s = brand.sample;
    return `<div class="carousel">
      <div class="tpl slide slide-cover"><div class="ph"></div><div class="slide-in"><div class="slide-logo">${moodSymbol(brand, L)}</div><div class="k">${esc(s.kicker)}</div><div class="h">${esc(brand.voice.headlines[0])}</div><div class="swipe">Desliza →</div></div></div>
      <div class="tpl slide inner"><div class="slide-in"><div class="num">01</div><div class="h sm">${esc(brand.web.sections[0])}</div><p>${esc(brand.essence)}</p></div></div>
      <div class="tpl slide inner alt"><div class="slide-in"><div class="num">02</div><div class="h sm">${esc(brand.voice.headlines[1] || brand.tagline)}</div><span class="btn">${esc(s.cta)}</span></div></div>
    </div>`;
}

// Grilla de 9 posts para la maqueta del perfil: mezcla de plantillas, fotos, frases y logo.
function gridTiles(brand, L) {
    const v = brand.voice.headlines;
    const photo = (n, extra = '') => `<div class="tile tile-photo v${n}"><div class="ph"></div>${extra}</div>`;
    const quote = (txt, accent) => `<div class="tile tile-quote${accent ? ' accent' : ''}"><span>${esc(txt)}</span></div>`;
    const alt = { ...brand.sample, headline: brand.sample.altHeadline || v[1] || brand.sample.headline };
    return [
        `<div class="tile tile-tpl">${postTemplate(brand, L)}</div>`,
        photo(1, '<i class="reel"></i>'),
        quote(v[0], false),
        photo(2),
        `<div class="tile tile-logo">${moodLogo(brand, L)}</div>`,
        photo(3, '<i class="reel"></i>'),
        quote(v[2] || brand.tagline, true),
        `<div class="tile tile-tpl">${postTemplate(brand, L, alt)}</div>`,
        photo(4, '<i class="multi"></i>'),
    ].join('');
}

function instagramMockup(brand, L) {
    const ig = brand.ig || { bio: [], highlights: [], followers: '' };
    const handle = brand.handler.replace(/^@/, '').toLowerCase();
    const hl = ig.highlights.map(h => `<div class="hl-item"><div class="hl-ring"><div class="hl-cover">${moodSymbol(brand, L)}</div></div><span>${esc(h)}</span></div>`).join('');
    return `<div class="phone">
      <div class="phone-notch"></div>
      <div class="ig">
        <div class="ig-top"><b>${esc(handle)}</b><span>☰</span></div>
        <div class="ig-head">
          <div class="ig-avatar">${L.avatar}</div>
          <div class="ig-stats"><div><b>${brand.ig?.posts || 48}</b><span>posts</span></div><div><b>${esc(ig.followers)}</b><span>seguidores</span></div><div><b>${brand.ig?.following || 312}</b><span>seguidos</span></div></div>
        </div>
        <div class="ig-bio">${ig.bio.map((l, i) => (i === 0 ? `<b>${esc(l)}</b>` : `<span>${esc(l)}</span>`)).join('')}</div>
        <div class="ig-btns"><span class="primary">Seguir</span><span>Mensaje</span></div>
        <div class="ig-hl">${hl}</div>
        <div class="ig-tabs"><i class="on"></i><i></i><i></i></div>
        <div class="ig-grid">${gridTiles(brand, L)}</div>
      </div>
    </div>`;
}

function applications(brand, L, t) {
    const s = brand.sample;
    const nightlife = ['centered', 'impact', 'social', 'urban', 'minimal', 'cinematic'].includes(brand.layout);
    const passLabel = nightlife ? 'ADMIT ONE' : brand.layout === 'news' ? 'MEMBER' : brand.layout === 'institutional' ? 'STAFF' : 'TALENT PASS';
    const qr = Array.from({ length: 49 }, (_, i) => `<i${(i * 7 + (i % 5) * 3) % 3 === 0 || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].includes(i) ? ' class="on"' : ''}></i>`).join('');
    return `<div class="apps">
      <figure class="app-ticket"><div class="ticket"><div class="ticket-main"><div class="ph"></div><div class="ticket-logo">${moodLogo(brand, L)}</div><div class="ticket-info"><div class="k">${esc(s.kicker)}</div><b>${esc(s.headline)}</b><span>${esc(s.meta)}</span></div></div><div class="ticket-stub"><span class="vert">${passLabel}</span><div class="qr">${qr}</div><small>Nº 000248</small></div></div><figcaption>${nightlife ? 'Ticket / entrada' : 'Credencial'}</figcaption></figure>
      <figure class="app-cards"><div class="bcard front">${L.inverse}</div><div class="bcard back"><div class="bc-sym">${L.symbol}</div><div class="bc-info"><b>Nombre Apellido</b><span>Dirección · ${esc(brand.name)}</span><span class="m">${esc(brand.handler)}</span><span class="m">hola@${esc(brand.slug.replace(/-/g, ''))}.com</span></div></div><figcaption>Tarjeta de presentación</figcaption></figure>
      <figure class="app-band"><div class="band-strip">${Array.from({ length: 6 }, () => `<span class="band-logo">${moodSymbol(brand, L)}</span><span class="band-txt">${esc(brand.name)} · ${esc(s.meta.split('·')[0].trim())}</span>`).join('')}</div><figcaption>${nightlife ? 'Pulsera de acceso' : 'Lanyard'}</figcaption></figure>
      <figure class="app-hl"><div class="hl-row">${(brand.ig?.highlights || []).map(h => `<div class="hl-big"><div class="hl-cover">${moodSymbol(brand, L)}</div><span>${esc(h)}</span></div>`).join('')}</div><figcaption>Portadas de highlights</figcaption></figure>
    </div>`;
}

function webHero(brand, L) {
    const nav = brand.web.sitemap.slice(1, 5).map(x => `<span>${esc(x.split(' (')[0])}</span>`).join('');
    return `<div class="web">
      <div class="web-bar"><i></i><i></i><i></i><span>${esc(brand.slug)}.com</span></div>
      <div class="web-nav"><div class="web-logo">${L.primary}</div><nav>${nav}</nav><span class="btn">${esc(brand.sample.cta)}</span></div>
      <div class="web-hero"><div class="web-copy"><div class="k">${esc(brand.descriptor)}</div><h3>${esc(brand.tagline)}</h3><p>${esc(brand.positioning)}</p><div class="web-ctas"><span class="btn">${esc(brand.sample.cta)}</span><span class="btn ghost">Conocer más</span></div></div><div class="web-media ph"><div class="web-media-logo">${moodSymbol(brand, L)}</div></div></div>
    </div>`;
}

const NAV = [['instagram', 'Instagram'], ['esencia', 'Esencia'], ['logo', 'Logo'], ['color', 'Color'], ['tipografia', 'Tipografía'], ['interfaz', 'Interfaz'], ['redes', 'Plantillas'], ['aplicaciones', 'Aplicaciones'], ['web', 'Web'], ['imagen', 'Imagen'], ['motion', 'Motion'], ['voz', 'Voz'], ['reglas', 'Reglas']];

function brandbookHtml(brand, allBrands) {
    const t = themeOf(brand);
    const L = logoSet(brand.slug, t);
    const ty = brand.typography;
    const num = id => String(NAV.findIndex(([k]) => k === id) + 1).padStart(2, '0');
    const label = (id, txt) => `<div class="label"><span>${num(id)}</span>${txt}</div>`;

    const swatches = brand.colors.map(c => {
        const on = readableOn(c.hex);
        const ratio = contrast(c.hex, on);
        const [r, g, b] = hexToRgb(c.hex);
        return `<div class="sw"><div class="sw-chip" style="background:${c.hex};color:${on}"><span class="sw-role">${esc(c.role)}</span><b>${esc(c.name)}</b></div><div class="sw-meta"><div class="sw-codes"><span>${c.hex}</span><span>RGB ${r} ${g} ${b}</span><span>${ratio.toFixed(1)}:1 ${ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA grande' : ''}</span></div><code>--brand-${esc(c.token)}</code><p>${esc(c.usage)}</p></div></div>`;
    }).join('');
    const weights = { 'Primario': 5, 'Secundario': 2.5, 'Acento': 1, 'Acento de marca': 1.2, 'Neutro': 1.2, 'Señal': 0.6 };
    const ratioBar = brand.colors.map(c => `<i style="background:${c.hex};flex:${weights[c.role] || 1}" title="${esc(c.name)}"></i>`).join('');

    const specimens = Object.entries(ty).map(([role, f]) => `
      <div class="spec">
        <div class="spec-aa" style="${fontStyle(role, f)}">Aa</div>
        <div class="spec-info"><div class="spec-role">${esc(role)}</div><h4>${esc(f.family)}${f.italic ? ' Italic' : ''}${f.stretch ? ` · ${f.stretch}%` : ''}</h4><p>${esc(f.usage)}</p>
          <div class="weights">${f.weights.map(w => `<span style="${fontStyle(role, f)}font-weight:${w}">${w}</span>`).join('')}</div>
          <div class="spec-sample" style="${fontStyle(role, f)}${f.case === 'uppercase' ? 'text-transform:uppercase;' : ''}letter-spacing:${f.tracking}">${esc(brand.voice.headlines[0])}</div>
          <div class="spec-glyphs" style="${fontStyle(role, f)}">ABCDEFGHIJKLMNÑOPQRSTUVWXYZ<br>abcdefghijklmnñopqrstuvwxyz 0123456789 &amp;@#%</div>
        </div>
      </div>`).join('');
    const scale = TYPE_SCALE.map(s => {
        const f = ty[s.role] || ty.body;
        return `<div class="scale-row"><div class="scale-meta"><b>${s.name}</b><span>${s.size}px / ${s.line}</span><code>--text-${s.token}</code></div><div class="scale-sample" style="${fontStyle(s.role, f)}font-size:${s.size}px;line-height:${s.line};${f.case === 'uppercase' ? 'text-transform:uppercase;' : ''}letter-spacing:${f.tracking}">${esc(s.role === 'body' ? brand.positioning : brand.tagline)}</div></div>`;
    }).join('');
    const others = allBrands.filter(b => b.slug !== brand.slug).map(b => `<a href="../${b.slug}/">${esc(b.name)}</a>`).join('');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.name)} — Línea gráfica</title>
<meta name="description" content="${esc(brand.essence)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="./tokens.css">
<link rel="stylesheet" href="../brandbook.css">
</head>
<body class="${t.isDark ? 'is-dark' : 'is-light'} layout-${brand.layout} brand-${brand.slug}">
<header class="top">
  <a class="back" href="../">← Marcas</a>
  <div class="top-logo">${L.primary}</div>
  <nav>${NAV.map(([id, txt]) => `<a href="#${id}">${txt}</a>`).join('')}</nav>
</header>

<section class="cover">
  <div class="ph"></div><div class="grain"></div>
  <div class="cover-in">
    <div class="cover-logo">${moodLogo(brand, L)}</div>
    <p class="tagline">${esc(brand.tagline)}</p>
  </div>
  <div class="cover-meta"><span>${esc(brand.handler)}</span><span>${esc(brand.ig?.followers || '')} seguidores</span><span>${esc(brand.descriptor)}</span><span>Brand guidelines · v1</span></div>
</section>

<main>
<section id="instagram" class="sec-ig">
  ${label('instagram', 'Instagram')}
  <div class="ig-layout">
    ${instagramMockup(brand, L)}
    <div class="ig-notes">
      <h2>Así se ve la cuenta</h2>
      <p class="lead">${esc(brand.social.grid)}</p>
      <div class="ig-avatar-big">${L.avatar}<div><h4>Avatar</h4><p>Logo oficial recortado en círculo. Siempre centrado, con margen de respeto y sobre su color de fondo de marca.</p></div></div>
      <h4>Highlights</h4>
      <div class="hl-row small">${(brand.ig?.highlights || []).map(h => `<div class="hl-big"><div class="hl-cover">${moodSymbol(brand, L)}</div><span>${esc(h)}</span></div>`).join('')}</div>
      <h4>Bio</h4>
      <div class="bio-card">${(brand.ig?.bio || []).map(l => `<div>${esc(l)}</div>`).join('')}</div>
    </div>
  </div>
</section>

<section id="esencia">
  ${label('esencia', 'Esencia')}
  <h2 class="xl">${esc(brand.essence)}</h2>
  <div class="ess-grid">
    <p class="lead">${esc(brand.positioning)}</p>
    <div><h4>Personalidad</h4><div class="chips">${brand.personality.map(p => `<span>${esc(p)}</span>`).join('')}</div>
    <h4>Valores</h4><ol class="values">${brand.values.map(v => `<li>${esc(v)}</li>`).join('')}</ol></div>
  </div>
</section>

<section id="logo">
  ${label('logo', 'Logo')}
  <h2>El logo</h2>
  <p class="lead">${esc(brand.logo.construction)}</p>
  <div class="logo-hero on-bg">${L.primary}</div>
  <div class="logo-grid">
    <div class="logo-tile on-inverse"><div class="lt-in">${L.inverse}</div><span>Invertido</span></div>
    <div class="logo-tile on-accent"><div class="lt-in">${L.onAccent}</div><span>Sobre acento</span></div>
    <div class="logo-tile on-surface"><div class="lt-in sym">${L.symbol}</div><span>Símbolo</span></div>
    <div class="logo-tile on-neutral"><div class="lt-in av">${L.avatar}</div><span>Avatar</span></div>
    ${L.agency ? `<div class="logo-tile on-bg wide"><div class="lt-in">${L.agency}</div><span>Evolución propuesta · agencia completa</span></div>` : ''}
  </div>
  <div class="two">
    <div><h4>Área de respeto</h4><div class="clearspace on-bg"><div class="cs-box">${L.primary}<i class="x tl">x</i><i class="x tr">x</i><i class="x bl">x</i><i class="x br">x</i></div></div><p class="small">${esc(brand.logo.clearspace)}</p></div>
    <div><h4>Tamaño mínimo</h4><div class="minsize on-bg"><div style="width:220px">${L.primary}</div><div style="width:130px">${L.primary}</div><div style="width:80px">${L.primary}</div></div><p class="small">${esc(brand.logo.minSize)}</p></div>
  </div>
  <h4>Usos incorrectos</h4>
  <div class="misuse">
    <div class="mu on-bg"><div class="mu-in" style="transform:scaleX(1.45)">${L.primary}</div><span>No deformar</span></div>
    <div class="mu on-bg"><div class="mu-in" style="filter:sepia(1) saturate(9) hue-rotate(150deg)">${L.primary}</div><span>No cambiar colores</span></div>
    <div class="mu on-bg"><div class="mu-in" style="transform:rotate(-14deg)">${L.primary}</div><span>No rotar</span></div>
    <div class="mu busy"><div class="mu-in" style="filter:drop-shadow(4px 4px 0 #f0f)">${L.primary}</div><span>No sombras ni fondos ruidosos</span></div>
  </div>
  <ul class="x cols">${brand.logo.misuse.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
  <div class="downloads"><h4>Descargar</h4>${LOGO_FILES.map(f => `<a href="./logo/${f}.svg" download>${f}.svg</a>`).join('')}</div>
</section>

<section id="color">
  ${label('color', 'Color')}
  <h2>Paleta</h2>
  <div class="ratio-bar">${ratioBar}</div>
  <p class="small">Proporción de uso aproximada en una pieza típica.</p>
  <div class="swatches">${swatches}</div>
  ${(brand.gradients || []).length ? `<h4>Degradados</h4><div class="grads">${brand.gradients.map(g => `<div class="grad" style="background:${g.css}"><span>${esc(g.name)}</span></div>`).join('')}</div>` : ''}
</section>

<section id="tipografia">
  ${label('tipografia', 'Tipografía')}
  <h2>Familias</h2>
  ${specimens}
  <h4 class="sub-h">Escala web</h4>
  <div class="scale">${scale}</div>
</section>

<section id="interfaz">
  ${label('interfaz', 'Interfaz')}
  <h2>Componentes</h2>
  <div class="ui-row"><span class="btn">${esc(brand.sample.cta)}</span><span class="btn ghost">Secundario</span><span class="tag">${esc(brand.sample.kicker)}</span></div>
  <div class="ui-cards">
    <div class="card"><div class="card-media ph"><div class="card-logo">${moodSymbol(brand, L)}</div></div><div class="card-body"><div class="k">${esc(brand.sample.kicker)}</div><h4>${esc(brand.sample.headline)}</h4><p>${esc(brand.sample.meta)}</p></div></div>
    <div class="card"><div class="card-body"><div class="form-logo">${L.primary}</div><label>Nombre</label><div class="input">Tu nombre</div><label>Email</label><div class="input muted">tu@email.com</div><span class="btn block">${esc(brand.sample.cta)}</span></div></div>
  </div>
  <dl class="specs">
    <dt>Botones</dt><dd>${esc(brand.ui.buttonStyle)}</dd>
    <dt>Grid</dt><dd>${esc(brand.ui.grid)}</dd>
    <dt>Radio</dt><dd>${esc(brand.ui.radius)}</dd>
    <dt>Profundidad</dt><dd>${esc(brand.ui.shadow)}</dd>
    <dt>Iconos</dt><dd>${esc(brand.iconography)}</dd>
  </dl>
</section>

<section id="redes">
  ${label('redes', 'Plantillas')}
  <h2>Plantillas de Instagram</h2>
  <div class="tpl-row">
    <figure>${postTemplate(brand, L)}<figcaption>Post 4:5 · 1080×1350</figcaption></figure>
    <figure>${storyTemplate(brand, L)}<figcaption>Story / Reel 9:16 · 1080×1920</figcaption></figure>
  </div>
  <figure class="wide">${carouselTemplate(brand, L)}<figcaption>Carrusel</figcaption></figure>
  <table class="tbl"><thead><tr><th>Plantilla</th><th>Formato</th><th>Especificación</th></tr></thead><tbody>
  ${brand.social.templates.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.format)}</td><td>${esc(x.spec)}</td></tr>`).join('')}
  </tbody></table>
</section>

<section id="aplicaciones">
  ${label('aplicaciones', 'Aplicaciones')}
  <h2>La marca fuera de la pantalla</h2>
  ${applications(brand, L, t)}
</section>

<section id="web">
  ${label('web', 'Web')}
  <h2>Estructura del sitio</h2>
  <p class="lead">${esc(brand.web.concept)}</p>
  ${webHero(brand, L)}
  <div class="sitemap">${brand.web.sitemap.map((x, i) => `<span><em>${String(i + 1).padStart(2, '0')}</em>${esc(x)}</span>`).join('')}</div>
  <div class="two">
    <div><h4>Secciones clave</h4><ul>${brand.web.sections.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
    <div><h4>Funcionalidades</h4><ul>${brand.web.features.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
  </div>
</section>

<section id="imagen">
  ${label('imagen', 'Imagen')}
  <h2>Fotografía y elementos gráficos</h2>
  <div class="mood-strip"><div class="ph"></div><div class="ph alt"></div><div class="ph alt2"></div></div>
  <dl class="specs">
    <dt>Qué fotografiar</dt><dd>${esc(brand.imagery.photography)}</dd>
    <dt>Tratamiento</dt><dd>${esc(brand.imagery.treatment)}</dd>
    <dt>Evitar</dt><dd>${esc(brand.imagery.avoid)}</dd>
  </dl>
  <h4>Elementos gráficos</h4>
  <ul class="cols">${brand.graphicElements.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
</section>

<section id="motion">
  ${label('motion', 'Motion')}
  <h2>Movimiento</h2>
  <div class="motion-demo"><div class="ph"></div><div class="anim-logo">${moodLogo(brand, L)}</div></div>
  <dl class="specs">
    <dt>Animación firma</dt><dd>${esc(brand.motion.signature)}</dd>
    <dt>Principios</dt><dd>${brand.motion.principles.map(esc).join(' · ')}</dd>
    <dt>Easing</dt><dd><code>${esc(brand.motion.easing)}</code></dd>
    <dt>Duraciones</dt><dd>${esc(brand.motion.durations)}</dd>
  </dl>
</section>

<section id="voz">
  ${label('voz', 'Voz')}
  <h2>Cómo habla ${esc(brand.name)}</h2>
  <p class="lead">${esc(brand.voice.tone)}</p>
  <div class="quotes">${brand.voice.headlines.map(h => `<blockquote>${esc(h)}</blockquote>`).join('')}</div>
  <div class="two">
    <div><h4>Sí decimos</h4><div class="chips">${brand.voice.use.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>
    <div><h4>No decimos</h4><div class="chips x">${brand.voice.avoid.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>
  </div>
</section>

<section id="reglas">
  ${label('reglas', 'Reglas')}
  <div class="two rules">
    <div class="rule-card ok"><h3>Siempre</h3><ul>${brand.dos.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
    <div class="rule-card no"><h3>Nunca</h3><ul>${brand.donts.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
  </div>
  <h4 class="sub-h">Para desarrolladores</h4>
  <p>Importa <a href="./tokens.css"><code>tokens.css</code></a> en la web de la marca y usa las variables (<code>var(--brand-accent)</code>, <code>var(--font-display)</code>…). Datos completos en <a href="./brand.json"><code>brand.json</code></a>.</p>
</section>
</main>

<footer class="foot">
  <div class="foot-logo">${L.primary}</div>
  <nav>${others}</nav>
</footer>
</body>
</html>
`;
}

// ─── CSS compartido del brandbook (usa solo variables de tokens.css) ───
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
const BRANDBOOK_CSS = `/* Generado por scripts/build-brands.mjs */
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:70px}
body{background:var(--brand-bg);color:var(--brand-fg);font-family:var(--font-body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82em;background:color-mix(in srgb,var(--brand-fg) 8%,transparent);padding:.15em .45em;border-radius:3px}
.logo-svg{display:block;width:100%;height:auto;overflow:visible}
.ph{background:var(--mood)}
.ph.alt{filter:hue-rotate(-14deg) saturate(.8) brightness(.8)}
.ph.alt2{filter:saturate(1.2) brightness(1.1) contrast(1.1);transform:scaleX(-1)}

/* Barra superior */
.top{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:auto auto 1fr;gap:28px;align-items:center;padding:12px 32px;background:color-mix(in srgb,var(--brand-bg) 86%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--brand-line)}
.top-logo{width:96px}.top-logo .logo-svg{max-height:34px;width:auto;max-width:100%}
.top nav{display:flex;gap:18px;justify-content:flex-end;overflow-x:auto;scrollbar-width:none}
.top a{text-decoration:none;font-family:var(--font-secondary);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand-muted);white-space:nowrap;transition:color .2s}
.top a:hover{color:var(--brand-accent)}
.back{color:var(--brand-fg)!important}

/* Portada */
.cover{position:relative;min-height:92vh;display:grid;place-items:center;overflow:hidden;text-align:center;isolation:isolate}
.cover>.ph{position:absolute;inset:0;z-index:-2}
.grain{position:absolute;inset:0;z-index:-1;background-image:${GRAIN};opacity:.16;mix-blend-mode:overlay;pointer-events:none}
.cover::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 55%,var(--brand-bg) 100%)}
.cover-in{padding:64px 24px;width:min(760px,88vw);animation:rise 1.2s var(--ease) both}
.cover-logo{width:100%;margin:0 auto}
.brand-dinner-club .cover-logo,.brand-5amclub .cover-logo{width:min(380px,70vw)}
.brand-urban-nights .cover-logo,.brand-udp .cover-logo{width:min(460px,76vw)}
.brand-hangout .cover-logo{width:min(640px,86vw)}
.tagline{font-family:var(--font-secondary);font-size:clamp(17px,2.2vw,24px);margin-top:36px;letter-spacing:var(--tracking-secondary);color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.4)}
.is-light .tagline{color:var(--brand-fg);text-shadow:none}
.brand-udp .tagline{color:#fff}
.layout-editorial .tagline,.layout-minimal .tagline{font-style:italic;letter-spacing:0;font-size:clamp(22px,2.8vw,32px)}
.cover-meta{position:absolute;left:0;right:0;bottom:28px;display:flex;justify-content:center;flex-wrap:wrap;gap:8px 28px;font-family:var(--font-secondary);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--brand-muted)}
@keyframes rise{from{opacity:0;transform:translateY(24px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}

main{max-width:1200px;margin:0 auto;padding:0 32px}
main>section{padding:120px 0;border-bottom:1px solid var(--brand-line)}
.label{display:flex;align-items:center;gap:14px;font-family:var(--font-secondary);font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--brand-muted);margin-bottom:28px}
.label span{color:var(--brand-accent);font-weight:700}
.label::after{content:"";flex:1;height:1px;background:var(--brand-line)}
h2{font-family:var(--font-display);font-stretch:var(--stretch-display);font-size:clamp(32px,4.4vw,60px);line-height:1;letter-spacing:var(--tracking-display);text-transform:uppercase;margin-bottom:28px;font-weight:700;max-width:20ch}
h2.xl{font-size:clamp(36px,5.6vw,80px);max-width:18ch}
.layout-editorial h2,.layout-minimal h2{text-transform:none;font-family:var(--font-secondary);font-style:italic;font-weight:500;letter-spacing:-.01em;font-stretch:normal}
.brand-dinner-club h2{font-family:'Playfair Display',serif}
h3{font-family:var(--font-display);font-stretch:var(--stretch-display);text-transform:uppercase;letter-spacing:var(--tracking-display);font-size:28px;margin-bottom:16px}
h4{font-family:var(--font-secondary);font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:36px 0 14px;color:var(--brand-muted);font-weight:600}
.sub-h{margin-top:72px}
.lead{font-size:19px;line-height:1.55;max-width:60ch;color:color-mix(in srgb,var(--brand-fg) 86%,transparent);margin-bottom:28px}
.small{font-size:13px;color:var(--brand-muted);margin-top:10px}
ul{padding-left:20px}li{margin:7px 0}
ul.cols{columns:2;column-gap:48px}
ul.x li::marker,.rule-card.no li::marker{content:"✕  ";color:#E5484D}.rule-card.ok li::marker{content:"✓  ";color:#30A46C}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips span{border:1px solid var(--brand-line);background:var(--brand-surface);padding:7px 16px;border-radius:999px;font-size:14px}
.chips.x span{text-decoration:line-through;opacity:.65}
.two{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.specs{display:grid;grid-template-columns:180px 1fr;gap:14px 28px;margin:40px 0 0;padding-top:28px;border-top:1px solid var(--brand-line)}
.specs dt{font-family:var(--font-secondary);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand-muted);padding-top:4px}
.k{font-family:var(--font-secondary);font-size:12px;letter-spacing:var(--tracking-secondary);text-transform:uppercase;color:var(--brand-accent)}

/* Esencia */
.ess-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:56px;margin-top:40px}
.values{padding-left:0;list-style:none;counter-reset:v}
.values li{counter-increment:v;padding:12px 0;border-top:1px solid var(--brand-line);display:flex;gap:16px}
.values li::before{content:counter(v,decimal-leading-zero);color:var(--brand-accent);font-family:var(--font-secondary);font-size:12px;padding-top:3px}

/* ─── Instagram ─── */
.ig-layout{display:grid;grid-template-columns:400px 1fr;gap:72px;align-items:start}
.phone{position:relative;width:100%;max-width:390px;border-radius:52px;background:#0B0B0C;padding:14px;box-shadow:0 0 0 2px #2A2A2E,0 40px 80px rgba(0,0,0,.45)}
.phone-notch{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:110px;height:30px;border-radius:20px;background:#000;z-index:2}
.ig{background:#000;color:#F5F5F5;border-radius:40px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;font-size:13px;line-height:1.35;padding-top:52px}
.ig-top{display:flex;justify-content:space-between;padding:0 16px 10px;font-size:17px}
.ig-head{display:flex;align-items:center;gap:22px;padding:6px 16px}
.ig-avatar{width:86px;height:86px;flex:none;border-radius:50%;padding:3px;background:conic-gradient(from 200deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5,#FEDA75)}
.ig-avatar .logo-svg{border-radius:50%;border:3px solid #000;width:100%;height:100%}
.ig-stats{display:flex;flex:1;justify-content:space-around;text-align:center}
.ig-stats b{display:block;font-size:16px}.ig-stats span{font-size:12px;color:#BDBDBD}
.ig-bio{display:flex;flex-direction:column;padding:10px 16px;font-size:13px}
.ig-btns{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px 16px 12px}
.ig-btns span{background:#262626;text-align:center;padding:7px;border-radius:8px;font-weight:600}
.ig-btns .primary{background:#0095F6}
.ig-hl{display:flex;gap:14px;padding:4px 16px 14px;overflow:hidden}
.hl-item{display:flex;flex-direction:column;align-items:center;gap:5px;width:62px;font-size:11px;text-align:center}
.hl-ring{width:62px;height:62px;border-radius:50%;border:1.5px solid #3A3A3A;padding:3px}
.hl-cover{width:100%;height:100%;border-radius:50%;background:var(--brand-bg);display:grid;place-items:center;overflow:hidden;padding:18%}
.hl-cover .logo-svg{max-height:100%;width:auto;max-width:100%}
.ig-tabs{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #262626}
.ig-tabs i{height:38px;position:relative}.ig-tabs i.on{border-bottom:1.5px solid #fff}
.ig-tabs i::after{content:"";position:absolute;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);border:1.5px solid #8E8E8E;border-radius:3px}
.ig-tabs i.on::after{border-color:#fff}
.ig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.tile{position:relative;aspect-ratio:3/4;overflow:hidden;container-type:inline-size;background:var(--brand-bg)}
.tile>.ph{position:absolute;inset:0}
.tile-photo.v2 .ph{filter:hue-rotate(-14deg) brightness(.75)}.tile-photo.v3 .ph{transform:scaleX(-1) scale(1.3);filter:saturate(1.3)}.tile-photo.v4 .ph{transform:scale(1.8) translate(10%,8%);filter:brightness(.9) contrast(1.2)}
.tile-photo::after{content:"";position:absolute;inset:0;background-image:${GRAIN};opacity:.2;mix-blend-mode:overlay}
.tile i.reel,.tile i.multi{position:absolute;top:6%;right:7%;width:12%;aspect-ratio:1;border:2px solid #fff;border-radius:3px;z-index:2}
.tile i.reel::after{content:"";position:absolute;left:38%;top:28%;border-left:6px solid #fff;border-top:4px solid transparent;border-bottom:4px solid transparent}
.tile i.multi{box-shadow:3px -3px 0 -1px #000,3px -3px 0 1px #fff}
.tile-quote{display:grid;place-items:center;padding:12%;background:var(--brand-surface);color:var(--brand-fg);text-align:center}
.tile-quote span{font-family:var(--font-display);font-stretch:var(--stretch-display);text-transform:uppercase;letter-spacing:var(--tracking-display);font-size:11cqw;line-height:1}
.layout-editorial .tile-quote span,.layout-minimal .tile-quote span,.layout-social .tile-quote span{font-family:var(--font-secondary);text-transform:none;font-style:italic;letter-spacing:0;font-size:12cqw}
.tile-quote.accent{background:var(--brand-accent);color:var(--brand-on-accent)}
.tile-logo{display:grid;place-items:center;padding:18%;background:var(--brand-bg)}
.brand-udp .tile-logo,.brand-udp .hl-cover{background:var(--brand-fg)}
.tile-tpl .tpl{position:absolute;inset:0;aspect-ratio:auto;border:0}
.ig-notes h2{margin-bottom:16px}
.ig-avatar-big{display:flex;gap:24px;align-items:center;margin:32px 0 8px;padding:24px;background:var(--brand-surface);border:1px solid var(--brand-line);border-radius:14px}
.ig-avatar-big>.logo-svg{width:120px;height:120px;flex:none;border-radius:50%}
.ig-avatar-big h4{margin:0 0 6px}.ig-avatar-big p{font-size:14px;color:var(--brand-muted)}
.hl-row{display:flex;flex-wrap:wrap;gap:20px}
.hl-big{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;color:var(--brand-muted)}
.hl-big .hl-cover{width:84px;height:84px;border:1px solid var(--brand-line)}
.hl-row.small .hl-cover{width:70px;height:70px}
.bio-card{padding:18px 20px;border-radius:12px;background:#000;color:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;font-size:14px;line-height:1.5;max-width:420px}
.bio-card div:first-child{font-weight:700}

/* ─── Logo ─── */
.on-bg{background:var(--brand-bg);color:var(--brand-fg)}
.on-inverse{background:var(--brand-fg)}
.on-accent{background:var(--brand-accent)}
.on-surface{background:var(--brand-surface)}
.on-neutral{background:color-mix(in srgb,var(--brand-fg) 12%,var(--brand-bg))}
.brand-urban-nights .on-accent .logo-svg rect[fill="#000000"]{fill:var(--brand-accent)}
.logo-hero{display:grid;place-items:center;padding:clamp(48px,9vw,120px);border:1px solid var(--brand-line);border-radius:16px;margin:40px 0 16px}
.logo-hero .logo-svg{width:min(640px,100%)}
.brand-dinner-club .logo-hero .logo-svg,.brand-5amclub .logo-hero .logo-svg{width:min(340px,80%)}
.brand-urban-nights .logo-hero .logo-svg,.brand-udp .logo-hero .logo-svg{width:min(420px,86%)}
.logo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.logo-tile{position:relative;aspect-ratio:1;display:grid;place-items:center;border:1px solid var(--brand-line);border-radius:14px;overflow:hidden;padding:14%}
.logo-tile.wide{grid-column:span 4;aspect-ratio:auto;padding:56px 20%}
.logo-tile span{position:absolute;left:14px;bottom:10px;font-family:var(--font-secondary);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand-muted);mix-blend-mode:difference;filter:invert(1) grayscale(1) contrast(9)}
.lt-in{width:100%}.lt-in.sym{width:70%}.lt-in.av{width:78%}
.lt-in .logo-svg{max-height:200px}
.clearspace,.minsize{border:1px solid var(--brand-line);border-radius:14px;padding:40px;display:grid;place-items:center}
.cs-box{position:relative;width:min(320px,80%);outline:1.5px dashed var(--brand-accent);outline-offset:28px;margin:28px}
.cs-box .x{position:absolute;font-style:normal;font-family:var(--font-secondary);font-size:12px;color:var(--brand-accent)}
.cs-box .tl{left:-24px;top:-26px}.cs-box .tr{right:-24px;top:-26px}.cs-box .bl{left:-24px;bottom:-26px}.cs-box .br{right:-24px;bottom:-26px}
.minsize{display:flex;align-items:flex-end;justify-content:center;gap:40px;min-height:220px}
.misuse{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.mu{position:relative;aspect-ratio:4/3;display:grid;place-items:center;border:1px solid var(--brand-line);border-radius:14px;overflow:hidden;padding:14%}
.mu::before,.mu::after{content:"";position:absolute;left:50%;top:50%;width:140%;height:2px;background:#E5484D;transform:translate(-50%,-50%) rotate(34deg);z-index:2;opacity:.85}
.mu::after{transform:translate(-50%,-50%) rotate(-34deg)}
.mu-in{width:100%;opacity:.9}.mu-in .logo-svg{max-height:120px}
.mu span{position:absolute;left:12px;bottom:10px;font-size:11px;color:#E5484D;font-weight:600;background:color-mix(in srgb,var(--brand-bg) 85%,transparent);padding:2px 8px;border-radius:999px;z-index:3}
.mu.busy{background:repeating-linear-gradient(45deg,#ff4fa3 0 14px,#38e0ff 14px 28px,#fff36b 28px 42px)}
.downloads{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:36px}
.downloads h4{margin:0 12px 0 0}
.downloads a{font-family:var(--font-secondary);font-size:12px;letter-spacing:.06em;text-decoration:none;border:1px solid var(--brand-line);padding:8px 14px;border-radius:999px;background:var(--brand-surface)}
.downloads a:hover{border-color:var(--brand-accent);color:var(--brand-accent)}

/* ─── Color ─── */
.ratio-bar{display:flex;height:72px;border-radius:14px;overflow:hidden;border:1px solid var(--brand-line);margin-top:24px}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px;margin-top:40px}
.sw{border:1px solid var(--brand-line);border-radius:14px;overflow:hidden;background:var(--brand-surface)}
.sw-chip{height:170px;padding:18px;display:flex;flex-direction:column;justify-content:space-between}
.sw-chip b{font-family:var(--font-display);font-stretch:var(--stretch-display);font-size:22px;letter-spacing:var(--tracking-display);text-transform:uppercase;line-height:1}
.sw-role{font-family:var(--font-secondary);font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
.sw-meta{padding:16px 18px;font-size:13px}
.sw-codes{display:flex;flex-wrap:wrap;gap:6px 14px;font-family:ui-monospace,monospace;font-size:12px;margin-bottom:10px}
.sw-meta code{font-size:11px}.sw-meta p{color:var(--brand-muted);margin-top:8px}
.grads{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.grad{height:140px;display:flex;align-items:flex-end;padding:14px;color:#fff;font-size:12px;letter-spacing:.1em;text-transform:uppercase;border-radius:14px}

/* ─── Tipografía ─── */
.spec{display:grid;grid-template-columns:240px 1fr;gap:40px;padding:44px 0;border-top:1px solid var(--brand-line)}
.spec-aa{font-size:170px;line-height:.85;color:var(--brand-accent)}
.spec-role{font-family:var(--font-secondary);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--brand-accent)}
.spec-info h4{font-size:24px;letter-spacing:0;text-transform:none;color:var(--brand-fg);margin:6px 0 6px;font-family:var(--font-body);font-weight:600}
.spec-info p{color:var(--brand-muted);font-size:14px}
.weights{display:flex;gap:20px;margin:16px 0;font-size:24px}
.spec-sample{font-size:clamp(26px,3.6vw,46px);line-height:1.08;margin:8px 0 18px}
.spec-glyphs{font-size:18px;line-height:1.5;color:var(--brand-muted);word-break:break-all}
.scale-row{display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:baseline;padding:18px 0;border-top:1px solid var(--brand-line);overflow:hidden}
.scale-meta{display:flex;flex-direction:column;font-size:12px;color:var(--brand-muted)}.scale-meta b{color:var(--brand-fg);font-size:13px}
.scale-sample{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ─── UI ─── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:.95em 1.7em;background:var(--brand-accent);color:var(--brand-on-accent);border-radius:var(--radius);font-family:var(--font-secondary);font-weight:700;font-size:12px;letter-spacing:.16em;text-transform:uppercase;border:1.5px solid var(--brand-accent);transition:transform .3s var(--ease),filter .3s var(--ease);white-space:nowrap}
.btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
.btn.ghost{background:transparent;color:var(--brand-fg);border-color:currentColor}
.btn.block{display:flex;width:100%;margin-top:18px}
.tag{font-family:var(--font-secondary);font-size:11px;letter-spacing:.2em;text-transform:uppercase;border:1px solid var(--brand-accent);color:var(--brand-accent);padding:7px 13px;border-radius:var(--radius)}
.ui-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:8px 0 36px}
.ui-cards{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.card{background:var(--brand-surface);border:1px solid var(--brand-line);border-radius:var(--radius);overflow:hidden}
.card-media{position:relative;aspect-ratio:16/9;display:grid;place-items:center}
.card-logo{width:22%}
.card-body{padding:28px}
.card h4{font-family:var(--font-display);font-stretch:var(--stretch-display);font-size:28px;letter-spacing:var(--tracking-display);text-transform:uppercase;color:var(--brand-fg);margin:6px 0}
.card p{color:var(--brand-muted);font-size:13px}
.form-logo{width:140px;margin-bottom:18px}
.card label{display:block;font-size:12px;color:var(--brand-muted);margin:12px 0 6px}
.input{border:1px solid var(--brand-line);background:var(--brand-bg);padding:13px 15px;border-radius:var(--radius);font-size:14px}.input.muted{color:var(--brand-muted)}

.tbl{width:100%;border-collapse:collapse;margin-top:40px;font-size:14px}
.tbl th,.tbl td{text-align:left;padding:14px 12px;border-top:1px solid var(--brand-line);vertical-align:top}
.tbl th{font-family:var(--font-secondary);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand-muted)}

/* ─── Plantillas (escalan con container queries) ─── */
.tpl-row{display:grid;grid-template-columns:1.3fr .7fr;gap:24px;align-items:start;margin-top:16px}
figure{margin:0}figcaption{font-size:11px;color:var(--brand-muted);margin-top:10px;letter-spacing:.14em;text-transform:uppercase;font-family:var(--font-secondary)}
figure.wide{margin-top:28px}
.tpl{position:relative;overflow:hidden;container-type:inline-size;color:#fff;background:var(--brand-bg);border:1px solid var(--brand-line);border-radius:6px}
.tpl>.ph{position:absolute;inset:0}
.tpl>.ph::after{content:"";position:absolute;inset:0;background-image:${GRAIN};opacity:.18;mix-blend-mode:overlay}
.post{aspect-ratio:4/5}.story{aspect-ratio:9/16}
.tpl .k{font-size:3.2cqw}
.tpl .h{font-family:var(--font-display);font-stretch:var(--stretch-display);text-transform:uppercase;letter-spacing:var(--tracking-display);line-height:.92;font-size:11cqw;font-weight:800}
.tpl .sub{font-family:var(--font-secondary);text-transform:uppercase;letter-spacing:var(--tracking-secondary);font-size:3cqw;margin-top:2cqw}
.tpl .meta{font-family:var(--font-secondary);letter-spacing:.14em;text-transform:uppercase;font-size:2.4cqw;opacity:.85;margin-top:2cqw}
.tpl .mono{font-family:var(--font-mono,var(--font-secondary))}
.tpl .hl{color:var(--brand-accent)}
.corner-logo{position:absolute;top:5cqw;left:5cqw;width:24cqw;z-index:2}
.seal{position:absolute;top:4cqw;right:4cqw;width:15cqw;z-index:2}

/* editorial (ARRIVE) */
.l-editorial>.ph{bottom:30%}
.l-editorial .corner-logo{width:22cqw}
.l-editorial .band{position:absolute;left:0;right:0;bottom:0;height:30%;background:var(--brand-ivory,var(--brand-surface));color:var(--brand-fg);padding:5cqw 6cqw;display:flex;flex-direction:column;justify-content:center}
.l-editorial .h.sec{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0;font-weight:500;font-size:10cqw}
.l-editorial .meta{color:var(--brand-muted)}

/* news (5AM) */
.l-news>.ph{bottom:45%}
.l-news .box{position:absolute;left:0;right:0;bottom:7%;top:52%;background:var(--brand-bg);padding:4cqw 5cqw;border-top:1.2cqw solid var(--brand-accent)}
.l-news .pill{display:inline-block;background:var(--brand-bear,#E53935);color:#fff;font-family:var(--font-secondary);font-weight:800;font-size:2.6cqw;letter-spacing:.14em;padding:.6cqw 2cqw}
.l-news .h{font-size:12.5cqw;margin-top:2cqw;font-weight:400}
.l-news .sub{text-transform:none;letter-spacing:0;font-size:3.4cqw}
.l-news .ticker{position:absolute;left:0;right:0;bottom:0;height:7%;display:flex;align-items:center;gap:2cqw;padding:0 3cqw;background:var(--brand-navy,#0B3D91);font-size:2.4cqw;white-space:nowrap;overflow:hidden}
.ticker .up{color:var(--brand-bull,#00C853)}.ticker .dn{color:var(--brand-bear,#E53935)}

/* centered (The Room) */
.l-centered .frame{position:absolute;inset:3.5cqw;border:.25cqw solid color-mix(in srgb,var(--brand-cream,#fff) 45%,transparent)}
.l-centered .stack{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--brand-fg);padding:8cqw}
.l-centered .k{color:var(--brand-fg);letter-spacing:.34em;margin-bottom:5cqw;font-size:3.4cqw}
.center-logo{width:70cqw}
.l-centered .flare{width:66%;height:.45cqw;margin:5cqw 0 3cqw;background:var(--gradient-ember-flare,var(--brand-accent));box-shadow:0 0 4cqw var(--brand-accent)}
.l-centered .sub{font-size:2.6cqw}
.lineup{font-family:var(--font-secondary);font-size:2.4cqw;letter-spacing:.24em;margin-top:5cqw;opacity:.85}
.l-centered>.meta{position:absolute;left:0;right:0;bottom:7cqw;text-align:center;color:var(--brand-fg)}

/* impact (Ignite) */
.l-impact{padding:6cqw}
.l-impact .k{position:relative;font-size:4cqw;color:#fff;letter-spacing:.2em}
.l-impact .giant{position:relative;font-family:var(--font-display);font-stretch:var(--stretch-display);font-weight:900;text-transform:uppercase;font-size:27cqw;line-height:.82;color:var(--brand-accent);margin:5cqw 0 0 -3cqw;letter-spacing:-.02em;text-shadow:0 0 6cqw color-mix(in srgb,var(--brand-accent) 60%,transparent);transform:rotate(-5deg);white-space:nowrap}
.l-impact .sub{position:relative;font-size:3.6cqw;margin-top:10cqw}
.btn-pill{position:absolute;left:6cqw;bottom:6cqw;background:var(--brand-accent);color:#fff;font-family:var(--font-display);font-stretch:var(--stretch-display);font-weight:900;text-transform:uppercase;font-size:3.4cqw;padding:2.4cqw 5cqw;border-radius:999px;box-shadow:0 0 5cqw color-mix(in srgb,var(--brand-accent) 70%,transparent)}
.l-impact .corner-logo{top:auto;left:auto;right:6cqw;bottom:6cqw;width:26cqw}

/* social (Hang Out) */
.l-social .flash{position:absolute;left:20%;top:12%;width:60%;height:40%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 70%);mix-blend-mode:screen}
.l-social .phrase{position:absolute;top:7cqw;left:8cqw;right:8cqw;text-align:center;font-family:var(--font-secondary);font-size:5cqw;line-height:1.15;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.l-social .sticker{position:absolute;right:6cqw;bottom:24cqw;width:24cqw;height:24cqw;border-radius:50%;background:#000;display:grid;place-items:center;padding:4cqw;transform:rotate(12deg);border:.6cqw solid var(--brand-accent);box-shadow:0 0 6cqw color-mix(in srgb,var(--brand-accent) 50%,transparent)}
.l-social .foot{position:absolute;left:6cqw;bottom:6cqw}
.l-social .h{color:var(--brand-accent);font-size:13cqw}

/* minimal (Dinner Club) */
.l-minimal{background:var(--brand-bg);color:var(--brand-fg);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8cqw}
.l-minimal .k{font-family:var(--font-display);font-size:6cqw;color:var(--brand-fg);letter-spacing:.24em;font-weight:700}
.l-minimal .circle{width:54cqw;margin:6cqw 0;filter:drop-shadow(0 2cqw 5cqw rgba(0,0,0,.1))}
.l-minimal .sub.sec{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0;font-size:4.6cqw}
.l-minimal .rule{width:14cqw;height:.4cqw;background:var(--brand-accent);margin:4cqw 0 2cqw}
.l-minimal .meta{color:var(--brand-muted)}

/* urban (Urban Nights) */
.l-urban{padding:6cqw;text-align:center}
.l-urban>*:not(.ph){position:relative}
.l-urban .skyline{position:absolute!important;left:0;right:0;bottom:12%;height:30%;background:linear-gradient(transparent,#000 85%),repeating-linear-gradient(90deg,#111 0 6%,#1c1c1c 6% 9%,#0d0d0d 9% 15%,#191919 15% 17%);clip-path:polygon(0 60%,5% 60%,5% 30%,9% 30%,9% 50%,14% 50%,14% 10%,18% 10%,18% 45%,24% 45%,24% 25%,29% 25%,29% 55%,35% 55%,35% 0,38% 0,38% 40%,45% 40%,45% 20%,50% 20%,50% 50%,57% 50%,57% 15%,61% 15%,61% 45%,68% 45%,68% 30%,73% 30%,73% 55%,80% 55%,80% 5%,84% 5%,84% 40%,90% 40%,90% 25%,95% 25%,95% 60%,100% 60%,100% 100%,0 100%)}
.l-urban .k{color:#fff;letter-spacing:.24em;margin-top:26cqw}
.l-urban .h.chrome{font-size:19cqw;background:var(--gradient-chrome-red,var(--brand-accent));-webkit-background-clip:text;background-clip:text;color:transparent;margin-top:2cqw;font-weight:900;filter:drop-shadow(0 .6cqw 0 #000)}
.l-urban .boxwm{width:30cqw;margin:4cqw auto 0}
.l-urban .bar{position:absolute!important;left:0;right:0;bottom:0;padding:3cqw;background:#000;border-top:.4cqw solid var(--brand-accent);font-family:var(--font-secondary);font-size:2.6cqw;letter-spacing:.16em;text-transform:uppercase}

/* institutional (UDP) */
.l-institutional{padding:7cqw;display:flex;flex-direction:column;justify-content:flex-end}
.l-institutional>*:not(.ph){position:relative}
.l-institutional .corner-logo{position:absolute!important;top:6cqw;left:7cqw;width:26cqw}
.l-institutional .h{font-size:13cqw;font-weight:900;max-width:90%}
.l-institutional .rule{width:12cqw;height:.8cqw;background:var(--brand-accent);margin:4cqw 0 2cqw}
.l-institutional .sub{text-transform:none;letter-spacing:0;font-family:var(--font-body);font-size:3.6cqw}
.l-institutional .cats{margin-top:8cqw;font-family:var(--font-secondary);letter-spacing:.3em;font-size:2.6cqw;opacity:.8}

/* cinematic (Elemento) */
.l-cinematic .horizon{position:absolute;left:0;right:0;top:58%;height:.4cqw;background:var(--brand-accent);box-shadow:0 0 6cqw 1cqw var(--brand-accent)}
.l-cinematic .corner-logo{width:22cqw}
.l-cinematic .over{position:absolute;left:6cqw;right:6cqw;bottom:6cqw}
.l-cinematic .k{color:var(--brand-chrome,#ccc)}
.l-cinematic .h{font-size:10cqw}
.l-cinematic .meta{color:var(--brand-accent)}

/* Story */
.story .story-in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:12cqw 8cqw;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.45));text-shadow:0 2px 12px rgba(0,0,0,.35)}
.story-logo{width:52cqw}
.brand-dinner-club .story-logo,.brand-5amclub .story-logo{width:34cqw}
.story .h{font-size:16cqw}
.story .k{font-size:4.4cqw;color:#fff;opacity:.85}
.story.l-editorial .h,.story.l-minimal .h{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0;font-weight:500}
.story .sub{font-size:4cqw}.story .meta{font-size:3.4cqw}.story .btn{font-size:4cqw}

/* Carrusel */
.carousel{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.slide{aspect-ratio:4/5}
.slide .slide-in{position:absolute;inset:0;padding:8cqw;display:flex;flex-direction:column;justify-content:flex-end;gap:3cqw}
.slide-logo{position:absolute;top:8cqw;left:8cqw;width:16cqw}
.slide.slide-cover .h{font-size:11cqw}
.slide .swipe{font-size:3.4cqw;opacity:.8}
.slide.inner{background:var(--brand-surface);color:var(--brand-fg)}
.slide.inner.alt{background:var(--brand-accent);color:var(--brand-on-accent)}
.slide.inner.alt .btn{background:var(--brand-on-accent);color:var(--brand-accent);border-color:var(--brand-on-accent);font-size:3.6cqw;align-self:flex-start}
.slide .num{font-family:var(--font-display);font-stretch:var(--stretch-display);font-size:16cqw;color:var(--brand-accent);line-height:1}
.slide.alt .num{color:inherit;opacity:.5}
.slide .h.sm{font-size:7cqw;line-height:1}
.slide p{font-size:3.8cqw;opacity:.8}

/* ─── Aplicaciones ─── */
.apps{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:28px;margin-top:16px}
.apps>*{min-width:0}
.app-band,.app-hl{grid-column:span 2}
.ticket{display:grid;grid-template-columns:1fr 150px;border-radius:14px;overflow:hidden;box-shadow:0 24px 50px rgba(0,0,0,.3);transform:rotate(-1.5deg);aspect-ratio:2.4/1}
.ticket-main{position:relative;padding:26px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;overflow:hidden}
.ticket-main>.ph{position:absolute;inset:0;z-index:-1}
.ticket-main{isolation:isolate}
.ticket-logo{width:min(200px,60%)}
.brand-dinner-club .ticket-logo,.brand-5amclub .ticket-logo{width:90px}
.ticket-info b{display:block;font-family:var(--font-display);font-stretch:var(--stretch-display);text-transform:uppercase;letter-spacing:var(--tracking-display);font-size:26px;line-height:1;margin:4px 0}
.ticket-info span{font-family:var(--font-secondary);font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.ticket-info .k{color:#fff;opacity:.8;font-size:10px}
.ticket-stub{position:relative;background:var(--brand-surface);color:var(--brand-fg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border-left:2px dashed var(--brand-line);padding:14px}
.ticket-stub .vert{font-family:var(--font-secondary);font-size:10px;letter-spacing:.3em;color:var(--brand-accent)}
.qr{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;width:76px}
.qr i{aspect-ratio:1;background:transparent}.qr i.on{background:var(--brand-fg)}
.ticket-stub small{font-family:ui-monospace,monospace;font-size:10px;color:var(--brand-muted)}
.app-cards{position:relative;min-height:340px}
.bcard{position:absolute;width:64%;aspect-ratio:85/55;border-radius:10px;box-shadow:0 20px 40px rgba(0,0,0,.28);padding:8%;display:grid;place-items:center}
.bcard.front{top:0;left:0;background:var(--brand-fg);transform:rotate(-4deg)}
.bcard.front .logo-svg{max-height:70%;width:auto;max-width:80%}
.bcard.back{right:0;bottom:0;background:var(--brand-bg);color:var(--brand-fg);transform:rotate(3deg);grid-template-columns:auto 1fr;gap:20px;place-items:center start;border:1px solid var(--brand-line)}
.bc-sym{width:60px}
.bc-info{display:flex;flex-direction:column;gap:2px;font-size:12px}
.bc-info b{font-family:var(--font-display);font-stretch:var(--stretch-display);text-transform:uppercase;letter-spacing:var(--tracking-display);font-size:16px}
.bc-info .m{color:var(--brand-muted);font-size:11px}
.band-strip{display:flex;align-items:center;gap:22px;height:64px;padding:0 24px;background:var(--brand-accent);color:var(--brand-on-accent);border-radius:8px;overflow:hidden;white-space:nowrap;box-shadow:inset 0 -6px 0 rgba(0,0,0,.15)}
.band-logo{width:34px;flex:none;filter:brightness(0) invert(var(--band-invert,1))}
.is-light .band-logo,.brand-hangout .band-logo,.brand-5amclub .band-logo{--band-invert:0}
.band-txt{font-family:var(--font-secondary);font-size:13px;letter-spacing:.2em;text-transform:uppercase;font-weight:700}

/* ─── Web ─── */
.web{border:1px solid var(--brand-line);border-radius:14px;overflow:hidden;background:var(--brand-bg);margin:28px 0;container-type:inline-size;box-shadow:0 30px 60px rgba(0,0,0,.25)}
.web-bar{display:flex;gap:6px;align-items:center;padding:11px 14px;background:var(--brand-surface);font-size:12px;color:var(--brand-muted)}
.web-bar i{width:10px;height:10px;border-radius:50%;background:var(--brand-line)}.web-bar span{margin-left:12px}
.web-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 28px;border-bottom:1px solid var(--brand-line)}
.web-logo{width:120px}.web-logo .logo-svg{max-height:44px;width:auto;max-width:100%}
.web-nav nav{display:flex;gap:22px;font-size:13px;color:var(--brand-muted)}
.web-nav .btn{padding:.6em 1.1em;font-size:11px}
.web-hero{display:grid;grid-template-columns:1.1fr .9fr;min-height:400px}
.web-copy{padding:56px 32px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.web-copy h3{font-family:var(--font-display);font-stretch:var(--stretch-display);font-size:clamp(30px,5.4cqw,64px);line-height:.98;text-transform:uppercase;letter-spacing:var(--tracking-display);margin:0}
.layout-editorial .web-copy h3,.layout-minimal .web-copy h3{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0}
.web-copy p{color:var(--brand-muted);font-size:14px;max-width:46ch}
.web-ctas{display:flex;gap:12px;flex-wrap:wrap}
.web-media{position:relative;min-height:300px;display:grid;place-items:center}
.web-media-logo{width:28%;opacity:.9}
.sitemap{display:flex;flex-wrap:wrap;gap:8px}
.sitemap span{background:var(--brand-surface);border:1px solid var(--brand-line);padding:9px 15px;border-radius:999px;font-size:13px}
.sitemap em{font-style:normal;color:var(--brand-accent);margin-right:8px;font-family:var(--font-secondary);font-size:11px}

/* ─── Imagen, motion, voz, reglas ─── */
.mood-strip{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;height:280px;margin:16px 0 8px}
.mood-strip .ph{border-radius:14px;position:relative;overflow:hidden}
.mood-strip .ph::after{content:"";position:absolute;inset:0;background-image:${GRAIN};opacity:.2;mix-blend-mode:overlay}
.motion-demo{position:relative;display:grid;place-items:center;height:360px;border-radius:16px;overflow:hidden;border:1px solid var(--brand-line)}
.motion-demo>.ph{position:absolute;inset:0}
.anim-logo{position:relative;width:min(520px,70%);animation:logo-in 4s var(--ease) infinite}
.brand-dinner-club .anim-logo,.brand-5amclub .anim-logo{width:min(240px,50%)}
.brand-urban-nights .anim-logo,.brand-udp .anim-logo{width:min(320px,60%)}
@keyframes logo-in{0%{opacity:0;transform:scale(.92);filter:blur(10px) brightness(2)}30%,82%{opacity:1;transform:none;filter:none}100%{opacity:0;transform:scale(1.03)}}
@media (prefers-reduced-motion:reduce){.anim-logo,.cover-in{animation:none}}
.quotes{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin:28px 0}
blockquote{font-family:var(--font-display);font-stretch:var(--stretch-display);text-transform:uppercase;letter-spacing:var(--tracking-display);font-size:26px;line-height:1.05;padding:28px;background:var(--brand-surface);border-radius:14px;border-left:4px solid var(--brand-accent)}
.layout-editorial blockquote,.layout-minimal blockquote,.layout-social blockquote{font-family:var(--font-secondary);text-transform:none;letter-spacing:0;font-style:italic;font-stretch:normal}
.rule-card{padding:36px;border-radius:16px;background:var(--brand-surface);border:1px solid var(--brand-line)}
.rule-card.ok{border-top:4px solid #30A46C}.rule-card.no{border-top:4px solid #E5484D}

.foot{display:flex;flex-direction:column;align-items:center;gap:28px;padding:72px 24px 56px;color:var(--brand-muted)}
.foot-logo{width:180px}.foot-logo .logo-svg{max-height:90px;width:auto;margin:0 auto;max-width:100%}
.foot nav{display:flex;flex-wrap:wrap;gap:12px 22px;justify-content:center}
.foot a{text-decoration:none;font-family:var(--font-secondary);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.foot a:hover{color:var(--brand-accent)}

@media (max-width:980px){
  .ig-layout{grid-template-columns:1fr;justify-items:center}.ig-notes{width:100%}
  .logo-grid,.misuse{grid-template-columns:repeat(2,1fr)}.logo-tile.wide{grid-column:span 2}
  .apps{grid-template-columns:minmax(0,1fr)}.app-band,.app-hl{grid-column:auto}
}
@media (max-width:800px){
  .top{grid-template-columns:auto 1fr;padding:10px 16px}.top nav{display:none}.top-logo{justify-self:end}
  main{padding:0 16px}main>section{padding:80px 0}
  .two,.ui-cards,.tpl-row,.web-hero,.ess-grid{grid-template-columns:1fr}
  .specs,.spec,.scale-row{grid-template-columns:1fr;gap:8px}
  .spec-aa{font-size:110px}
  ul.cols{columns:1}
  .carousel{grid-template-columns:1fr 1fr}.carousel .slide:last-child{display:none}
  .web-nav nav{display:none}
  .minsize{gap:20px}.minsize>div:first-child{width:160px!important}
  .ticket{grid-template-columns:1fr 110px}
  .app-cards{min-height:260px}
}
`;

// ─── Índice de marcas ───
function hubHtml(brands) {
    const fonts = brands.map(b => `<link rel="stylesheet" href="${googleFontsUrl(b)}">`).join('\n');
    const cards = brands.map(b => {
        const t = themeOf(b);
        const L = logoSet(b.slug, t);
        return `<a class="card" href="./${b.slug}/" style="--bg:${t.bg};--fg:${t.fg};--ac:${t.accent};--mood:${b.mood}">
  <div class="mood"></div><div class="grain"></div>
  <div class="avatar">${L.avatar}</div>
  <div class="logo">${t.isDark ? moodLogo(b, L) : L.primary}</div>
  <div class="in"><div class="desc">${esc(b.descriptor)}</div><div class="tag">${esc(b.tagline)}</div>
  <div class="row"><div class="dots">${b.colors.slice(0, 6).map(c => `<i style="background:${c.hex}"></i>`).join('')}</div><span class="handle">${esc(b.handler)} · ${esc(b.ig?.followers || '')}</span></div></div></a>`;
    }).join('\n');
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marcas — Líneas gráficas</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#09090B;color:#F2F2F2;font-family:Inter,system-ui,sans-serif;padding:56px 32px 80px}
header{max-width:1280px;margin:0 auto 40px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap}
h1{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#8A8A93;font-weight:600}
h2{font-size:clamp(34px,5vw,60px);margin-top:10px;font-weight:800;letter-spacing:-.02em;line-height:1}
p.lead{color:#8A8A93;max-width:52ch;font-size:15px}
.grid{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px}
.card{position:relative;display:flex;flex-direction:column;min-height:400px;overflow:hidden;border-radius:18px;background:var(--bg);color:var(--fg);text-decoration:none;border:1px solid rgba(255,255,255,.08);transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .45s;isolation:isolate}
.card:hover{transform:translateY(-6px);box-shadow:0 30px 60px rgba(0,0,0,.5)}
.mood{position:absolute;inset:0 0 38% 0;background:var(--mood);z-index:-2;transition:transform .8s cubic-bezier(.22,1,.36,1)}
.card:hover .mood{transform:scale(1.06)}
.mood::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,var(--bg))}
.grain{position:absolute;inset:0;z-index:-1;background-image:${GRAIN};opacity:.14;mix-blend-mode:overlay}
.avatar{position:absolute;top:18px;right:18px;width:52px;height:52px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.avatar svg{width:100%;height:100%}
.logo{flex:1;display:grid;place-items:center;padding:56px 18% 8px}
.logo svg{width:100%;max-height:150px;overflow:visible}
.in{padding:0 24px 22px}
.desc{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ac);font-weight:600}
.tag{font-size:15px;opacity:.85;margin-top:6px}
.row{display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:12px}
.dots{display:flex;gap:6px}.dots i{width:16px;height:16px;border-radius:50%;border:1px solid rgba(127,127,127,.4)}
.handle{font-size:12px;opacity:.7}
@media (max-width:600px){body{padding:36px 16px}.grid{grid-template-columns:1fr}}
</style></head>
<body>
<header><div><h1>Command Center · Marcas</h1><h2>Líneas gráficas</h2></div><p class="lead">Logos vectoriales redibujados de cada Instagram, paleta, tipografía, interfaz, plantillas, aplicaciones, estructura web, motion y voz de cada cuenta.</p></header>
<div class="grid">${cards}</div>
</body></html>
`;
}

// ─── Validación mínima ───
const REQUIRED = ['slug', 'accountId', 'handler', 'name', 'descriptor', 'tagline', 'essence', 'positioning', 'personality', 'values', 'layout', 'logo', 'colors', 'theme', 'typography', 'ui', 'imagery', 'graphicElements', 'iconography', 'motion', 'social', 'web', 'voice', 'dos', 'donts', 'sample', 'mood'];
function validate(brand, file) {
    const missing = REQUIRED.filter(k => brand[k] == null);
    if (missing.length) throw new Error(`${file}: faltan campos ${missing.join(', ')}`);
    for (const c of brand.colors) if (!/^#[0-9A-Fa-f]{6}$/.test(c.hex)) throw new Error(`${file}: color inválido ${c.hex}`);
    if (!brand.typography.display) throw new Error(`${file}: falta typography.display`);
    themeOf(brand);
}

export function loadBrands() {
    return fs.readdirSync(SRC, { withFileTypes: true })
        .filter(d => d.isDirectory() && fs.existsSync(path.join(SRC, d.name, 'brand.json')))
        .map(d => {
            const file = path.join(SRC, d.name, 'brand.json');
            const brand = JSON.parse(fs.readFileSync(file, 'utf-8'));
            validate(brand, file);
            if (brand.slug !== d.name) throw new Error(`${file}: slug "${brand.slug}" no coincide con la carpeta`);
            return brand;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

// SVG autónomo: incrusta la carga de fuentes para que se vea bien al abrirlo directamente.
const standaloneSvg = (markup, brand) =>
    markup.replace('class="logo-svg">', `class="logo-svg"><style>@import url('${googleFontsUrl(brand)}');</style>`);

function build() {
    const brands = loadBrands();
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'brandbook.css'), BRANDBOOK_CSS);
    for (const brand of brands) {
        const css = tokensCss(brand);
        const L = logoSet(brand.slug, themeOf(brand));
        const files = { primary: L.primary, inverse: L.inverse, 'on-accent': L.onAccent, symbol: L.symbol, avatar: L.avatar };
        const dir = path.join(OUT, brand.slug);
        for (const base of [path.join(SRC, brand.slug, 'logo'), path.join(dir, 'logo')]) {
            fs.mkdirSync(base, { recursive: true });
            for (const [name, markup] of Object.entries(files)) fs.writeFileSync(path.join(base, `${name}.svg`), standaloneSvg(markup, brand));
        }
        fs.writeFileSync(path.join(SRC, brand.slug, 'tokens.css'), css);
        fs.writeFileSync(path.join(SRC, brand.slug, 'BRAND.md'), brandMd(brand));
        fs.writeFileSync(path.join(dir, 'tokens.css'), css);
        fs.writeFileSync(path.join(dir, 'brand.json'), JSON.stringify(brand, null, 2));
        fs.writeFileSync(path.join(dir, 'index.html'), brandbookHtml(brand, brands));
    }
    fs.writeFileSync(path.join(OUT, 'index.html'), hubHtml(brands));
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(brands.map(b => ({ slug: b.slug, name: b.name, accountId: b.accountId, handler: b.handler })), null, 2));
    console.log(`✓ ${brands.length} marcas: ${brands.map(b => b.slug).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
