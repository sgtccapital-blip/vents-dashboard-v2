// Genera, a partir de brands/<marca>/brand.json (fuente de verdad de cada línea gráfica):
//   brands/<marca>/tokens.css     → variables CSS para webs y piezas HTML
//   brands/<marca>/BRAND.md       → guía completa para Claude Code y otros LLMs
//   public/brands/<marca>/        → brandbook visual (index.html + tokens.css + brand.json)
//   public/brands/index.html|json → índice de marcas (el dashboard enlaza desde aquí)
// Uso: npm run brands
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const FALLBACK = { display: 'sans-serif', secondary: 'sans-serif', body: 'sans-serif', mono: 'monospace' };
const SERIF_FAMILIES = ['Cormorant Garamond', 'Bodoni Moda', 'Playfair Display', 'DM Serif Display'];
const stack = (role, f) => `'${f.family}', ${SERIF_FAMILIES.includes(f.family) ? 'serif' : FALLBACK[role]}`;

function googleFontsUrl(brand) {
    const byFamily = new Map();
    for (const f of Object.values(brand.typography)) {
        const cur = byFamily.get(f.family) || { weights: new Set(), italic: false };
        f.weights.forEach(w => cur.weights.add(w));
        cur.italic ||= Boolean(f.italic);
        byFamily.set(f.family, cur);
    }
    const families = [...byFamily].map(([family, { weights, italic }]) => {
        const ws = [...weights].sort((a, b) => a - b);
        const name = family.replace(/ /g, '+');
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
    const lines = [
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
    ];
    return lines.join('\n');
}

// ─── BRAND.md ───
const list = arr => (arr || []).map(x => `- ${x}`).join('\n');
function brandMd(brand) {
    const t = themeOf(brand);
    const typeRows = Object.entries(brand.typography).map(([role, f]) =>
        `| ${role} | ${f.family}${f.italic ? ' (itálica)' : ''} | ${f.weights.join(', ')} | ${f.case === 'uppercase' ? 'MAYÚSCULAS' : 'normal'} · tracking ${f.tracking} | ${f.usage} |`);
    return `# ${brand.name} — Línea gráfica

> ${brand.descriptor} · ${brand.handler}
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

- **Wordmark:** ${brand.logo.wordmark.join(' / ')}${brand.logo.descriptorLine ? ` — descriptor "${brand.logo.descriptorLine}"` : ''}
- **Símbolo:** ${brand.logo.symbol}
- **Construcción:** ${brand.logo.construction}
- **Área de respeto:** ${brand.logo.clearspace}
- **Tamaño mínimo:** ${brand.logo.minSize}

**Versiones:**
${list(brand.logo.versions)}

**Usos incorrectos:**
${list(brand.logo.misuse)}

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

**Grilla:** ${brand.social.grid}

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

// ─── Brandbook HTML ───
function headline(brand, text, accentLast) {
    if (!accentLast) return esc(text);
    const words = text.split(' ');
    const last = words.pop();
    return `${esc(words.join(' '))} <span class="hl">${esc(last)}</span>`;
}

function wordmark(brand, cls = '') {
    const w = brand.logo.wordmark.map(l => `<span>${esc(l)}</span>`).join('');
    const d = brand.logo.descriptorLine ? `<small>${esc(brand.logo.descriptorLine)}</small>` : '';
    return `<div class="wm ${cls}"><div class="wm-word">${w}</div>${d}</div>`;
}

// Plantillas de redes: misma información, composición distinta según el layout de cada marca.
function postTemplate(brand) {
    const s = brand.sample;
    const L = brand.layout;
    const accentLast = ['news', 'institutional'].includes(L);
    const common = { k: esc(s.kicker), h: headline(brand, s.headline, accentLast), sub: esc(s.sub), meta: esc(s.meta), cta: esc(s.cta) };
    switch (L) {
        case 'editorial': return `<div class="tpl post l-editorial"><div class="ph"></div><div class="band"><div class="k">${common.k}</div><div class="h sec">${common.h}</div><div class="sub">${common.sub}</div><div class="meta">${common.meta}</div></div></div>`;
        case 'news': return `<div class="tpl post l-news"><div class="ph"></div><div class="box"><span class="pill">${common.k}</span><div class="h">${common.h}</div><div class="sub mono">${common.sub}</div><div class="meta mono">${common.meta}</div></div><div class="ticker mono">S&amp;P 500 <b class="dn">−2.75%</b> · NASDAQ <b class="dn">−3.10%</b> · GOLD <b class="up">+5.02%</b> · BTC <b class="up">+1.40%</b> · OIL <b class="dn">−0.80%</b></div></div>`;
        case 'centered': return `<div class="tpl post l-centered"><div class="ph"></div><div class="stack"><div class="k">${common.k}</div>${wordmark(brand, 'wm-tpl')}<div class="flare"></div><div class="sub">${common.sub}</div><div class="meta">${common.meta}</div></div></div>`;
        case 'impact': return `<div class="tpl post l-impact"><div class="ph"></div><div class="k">${common.k}</div><div class="giant">${common.h}</div><div class="sub">${common.sub}</div><span class="btn-pill">${common.cta}</span></div>`;
        case 'social': return `<div class="tpl post l-social"><div class="ph"></div><div class="phrase">Ese momento donde entiendes por qué nadie quería perderse esta noche</div><div class="sticker">🍌</div><div class="foot"><div class="h">${common.h}</div><div class="sub">${common.sub}</div></div></div>`;
        case 'minimal': return `<div class="tpl post l-minimal"><div class="k">${common.k}</div><div class="circle">${wordmark(brand, 'wm-tpl')}</div><div class="sub sec">${common.sub}</div><div class="rule"></div><div class="meta">${common.meta}</div></div>`;
        case 'urban': return `<div class="tpl post l-urban"><div class="ph"></div><div class="k">${common.k}</div><div class="h chrome">${common.h}</div><div class="boxwm">${wordmark(brand, 'wm-tpl')}</div><div class="sub">${common.sub}</div><div class="bar">${common.meta}</div></div>`;
        case 'institutional': return `<div class="tpl post l-institutional"><div class="ph"></div><div class="h">${common.h}</div><div class="rule"></div><div class="sub">${common.sub}</div><div class="cats">${common.k}</div></div>`;
        case 'cinematic':
        default: return `<div class="tpl post l-cinematic"><div class="ph"></div><div class="horizon"></div><div class="over"><div class="k">${common.k}</div><div class="h">${common.h}</div><div class="sub">${common.sub}</div><div class="meta mono">${common.meta}</div></div></div>`;
    }
}

function storyTemplate(brand) {
    const s = brand.sample;
    return `<div class="tpl story l-${brand.layout}"><div class="ph"></div><div class="story-in">${wordmark(brand, 'wm-tpl wm-sm')}<div class="story-mid"><div class="k">${esc(s.kicker)}</div><div class="h">${esc(s.headline)}</div><div class="sub">${esc(s.sub)}</div></div><span class="btn">${esc(s.cta)}</span><div class="meta">${esc(s.meta)}</div></div></div>`;
}

function carouselTemplate(brand) {
    const s = brand.sample;
    return `<div class="carousel">
      <div class="tpl slide slide-cover"><div class="ph"></div><div class="slide-in"><div class="k">${esc(s.kicker)}</div><div class="h">${esc(brand.voice.headlines[0])}</div><div class="swipe">Desliza →</div></div></div>
      <div class="tpl slide inner"><div class="slide-in"><div class="num">01</div><div class="h sm">${esc(brand.web.sections[0])}</div><p>${esc(brand.essence)}</p></div></div>
      <div class="tpl slide inner alt"><div class="slide-in"><div class="num">02</div><div class="h sm">${esc(brand.voice.headlines[1] || brand.tagline)}</div><span class="btn">${esc(s.cta)}</span></div></div>
    </div>`;
}

function webHero(brand) {
    const nav = brand.web.sitemap.slice(1, 5).map(x => `<span>${esc(x.split(' (')[0])}</span>`).join('');
    return `<div class="web">
      <div class="web-bar"><i></i><i></i><i></i><span>${esc(brand.slug)}.com</span></div>
      <div class="web-nav">${wordmark(brand, 'wm-nav')}<nav>${nav}</nav><span class="btn">${esc(brand.sample.cta)}</span></div>
      <div class="web-hero"><div class="web-copy"><div class="k">${esc(brand.descriptor)}</div><h3>${esc(brand.tagline)}</h3><p>${esc(brand.positioning)}</p><div class="web-ctas"><span class="btn">${esc(brand.sample.cta)}</span><span class="btn ghost">Conocer más</span></div></div><div class="web-media ph"></div></div>
    </div>`;
}

function brandbookHtml(brand, allBrands) {
    const t = themeOf(brand);
    const ty = brand.typography;
    const swatches = brand.colors.map(c => {
        const on = readableOn(c.hex);
        const ratio = contrast(c.hex, on).toFixed(1);
        return `<div class="sw"><div class="sw-chip" style="background:${c.hex};color:${on}"><b>${esc(c.name)}</b><span>${c.hex}</span><em>${ratio}:1 ${ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA grande' : ''}</em></div><div class="sw-meta"><code>--brand-${esc(c.token)}</code><span class="role">${esc(c.role)}</span><p>${esc(c.usage)}</p></div></div>`;
    }).join('');
    const typeSpecimens = Object.entries(ty).map(([role, f]) => `
      <div class="spec">
        <div class="spec-aa" style="font-family:${stack(role, f)};${f.italic ? 'font-style:italic;' : ''}">Aa</div>
        <div class="spec-info"><div class="label">${esc(role)}</div><h4>${esc(f.family)}${f.italic ? ' Italic' : ''}</h4><p>${esc(f.usage)}</p><div class="weights">${f.weights.map(w => `<span style="font-family:${stack(role, f)};font-weight:${w};${f.italic ? 'font-style:italic;' : ''}">${w}</span>`).join('')}</div>
        <div class="spec-sample" style="font-family:${stack(role, f)};${f.case === 'uppercase' ? 'text-transform:uppercase;' : ''}letter-spacing:${f.tracking};${f.italic ? 'font-style:italic;' : ''}">${esc(brand.voice.headlines[0])}</div></div>
      </div>`).join('');
    const scale = TYPE_SCALE.map(s => {
        const f = ty[s.role] || ty.body;
        return `<div class="scale-row"><div class="scale-meta"><b>${s.name}</b><span>${s.size}px / ${s.line}</span><code>--text-${s.token}</code></div><div class="scale-sample" style="font-family:${stack(s.role, f)};font-size:${s.size}px;line-height:${s.line};${f.case === 'uppercase' ? 'text-transform:uppercase;' : ''}letter-spacing:${f.tracking};${f.italic ? 'font-style:italic;' : ''}">${esc(s.role === 'body' ? brand.positioning : brand.tagline)}</div></div>`;
    }).join('');
    const others = allBrands.filter(b => b.slug !== brand.slug).map(b => `<a href="../${b.slug}/">${esc(b.name)}</a>`).join('');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.name)} — Línea gráfica</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="./tokens.css">
<link rel="stylesheet" href="../brandbook.css">
</head>
<body class="${t.isDark ? 'is-dark' : 'is-light'} layout-${brand.layout}">
<header class="top">
  <a class="back" href="../">← Todas las marcas</a>
  <nav>${['Esencia', 'Logo', 'Color', 'Tipografía', 'Interfaz', 'Redes', 'Web', 'Imagen', 'Motion', 'Voz', 'Reglas'].map(x => `<a href="#${x.toLowerCase()}">${x}</a>`).join('')}</nav>
</header>

<section class="cover">
  <div class="ph"></div>
  <div class="cover-in">
    ${wordmark(brand, 'wm-cover')}
    <p class="tagline">${esc(brand.tagline)}</p>
    <p class="handle">${esc(brand.handler)} · ${esc(brand.descriptor)}</p>
  </div>
</section>

<main>
<section id="esencia">
  <div class="label">01 · Esencia</div>
  <h2>${esc(brand.essence)}</h2>
  <p class="lead">${esc(brand.positioning)}</p>
  <div class="chips">${brand.personality.map(p => `<span>${esc(p)}</span>`).join('')}</div>
  <ul class="values">${brand.values.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
</section>

<section id="logo">
  <div class="label">02 · Logo</div>
  <h2>Wordmark y versiones</h2>
  <div class="logo-grid">
    <div class="logo-tile on-bg">${wordmark(brand)}</div>
    <div class="logo-tile on-accent">${wordmark(brand)}</div>
    <div class="logo-tile on-inverse">${wordmark(brand)}</div>
  </div>
  <p class="note">Recreación tipográfica provisional del logo. Reemplazar por los archivos originales (SVG) en <code>brands/${esc(brand.slug)}/logo/</code>.</p>
  <dl class="specs">
    <dt>Símbolo</dt><dd>${esc(brand.logo.symbol)}</dd>
    <dt>Construcción</dt><dd>${esc(brand.logo.construction)}</dd>
    <dt>Área de respeto</dt><dd>${esc(brand.logo.clearspace)}</dd>
    <dt>Tamaño mínimo</dt><dd>${esc(brand.logo.minSize)}</dd>
  </dl>
  <div class="two">
    <div><h4>Versiones</h4><ul>${brand.logo.versions.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
    <div><h4>No hacer</h4><ul class="x">${brand.logo.misuse.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
  </div>
</section>

<section id="color">
  <div class="label">03 · Color</div>
  <h2>Paleta</h2>
  <div class="swatches">${swatches}</div>
  ${(brand.gradients || []).length ? `<div class="grads">${brand.gradients.map(g => `<div class="grad" style="background:${g.css}"><span>${esc(g.name)}</span></div>`).join('')}</div>` : ''}
</section>

<section id="tipografía">
  <div class="label">04 · Tipografía</div>
  <h2>Familias</h2>
  ${typeSpecimens}
  <h3 class="sub-h">Escala web</h3>
  <div class="scale">${scale}</div>
</section>

<section id="interfaz">
  <div class="label">05 · Interfaz</div>
  <h2>Componentes base</h2>
  <div class="ui-row">
    <span class="btn">${esc(brand.sample.cta)}</span>
    <span class="btn ghost">Secundario</span>
    <span class="tag">${esc(brand.sample.kicker)}</span>
  </div>
  <div class="ui-cards">
    <div class="card"><div class="card-media ph"></div><div class="card-body"><div class="k">${esc(brand.sample.kicker)}</div><h4>${esc(brand.sample.headline)}</h4><p>${esc(brand.sample.meta)}</p></div></div>
    <div class="card"><div class="card-body"><label>Nombre</label><div class="input">${esc(brand.name)}</div><label>Email</label><div class="input muted">tu@email.com</div><span class="btn block">${esc(brand.sample.cta)}</span></div></div>
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
  <div class="label">06 · Redes</div>
  <h2>Plantillas de Instagram</h2>
  <p class="lead">${esc(brand.social.grid)}</p>
  <div class="tpl-row">
    <figure>${postTemplate(brand)}<figcaption>Post 4:5</figcaption></figure>
    <figure>${storyTemplate(brand)}<figcaption>Story / Reel 9:16</figcaption></figure>
  </div>
  <figure class="wide">${carouselTemplate(brand)}<figcaption>Carrusel</figcaption></figure>
  <table class="tbl"><thead><tr><th>Plantilla</th><th>Formato</th><th>Especificación</th></tr></thead><tbody>
  ${brand.social.templates.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.format)}</td><td>${esc(x.spec)}</td></tr>`).join('')}
  </tbody></table>
</section>

<section id="web">
  <div class="label">07 · Web</div>
  <h2>Estructura del sitio</h2>
  <p class="lead">${esc(brand.web.concept)}</p>
  ${webHero(brand)}
  <div class="sitemap">${brand.web.sitemap.map((x, i) => `<span><em>${String(i + 1).padStart(2, '0')}</em>${esc(x)}</span>`).join('')}</div>
  <div class="two">
    <div><h4>Secciones clave</h4><ul>${brand.web.sections.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
    <div><h4>Funcionalidades</h4><ul>${brand.web.features.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
  </div>
</section>

<section id="imagen">
  <div class="label">08 · Imagen</div>
  <h2>Fotografía y elementos gráficos</h2>
  <div class="mood-strip"><div class="ph"></div><div class="ph alt"></div><div class="ph"></div></div>
  <dl class="specs">
    <dt>Qué fotografiar</dt><dd>${esc(brand.imagery.photography)}</dd>
    <dt>Tratamiento</dt><dd>${esc(brand.imagery.treatment)}</dd>
    <dt>Evitar</dt><dd>${esc(brand.imagery.avoid)}</dd>
  </dl>
  <h4>Elementos gráficos</h4>
  <ul>${brand.graphicElements.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
</section>

<section id="motion">
  <div class="label">09 · Motion</div>
  <h2>Movimiento</h2>
  <div class="motion-demo">${wordmark(brand, 'wm-anim')}</div>
  <dl class="specs">
    <dt>Principios</dt><dd>${brand.motion.principles.map(esc).join(' · ')}</dd>
    <dt>Easing</dt><dd><code>${esc(brand.motion.easing)}</code></dd>
    <dt>Duraciones</dt><dd>${esc(brand.motion.durations)}</dd>
    <dt>Animación firma</dt><dd>${esc(brand.motion.signature)}</dd>
  </dl>
</section>

<section id="voz">
  <div class="label">10 · Voz</div>
  <h2>Cómo habla ${esc(brand.name)}</h2>
  <p class="lead">${esc(brand.voice.tone)}</p>
  <div class="quotes">${brand.voice.headlines.map(h => `<blockquote>${esc(h)}</blockquote>`).join('')}</div>
  <div class="two">
    <div><h4>Sí decimos</h4><div class="chips">${brand.voice.use.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>
    <div><h4>No decimos</h4><div class="chips x">${brand.voice.avoid.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>
  </div>
</section>

<section id="reglas">
  <div class="label">11 · Reglas</div>
  <div class="two">
    <div><h2>Siempre</h2><ul class="ok">${brand.dos.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
    <div><h2>Nunca</h2><ul class="x">${brand.donts.map(v => `<li>${esc(v)}</li>`).join('')}</ul></div>
  </div>
  <h3 class="sub-h">Para desarrolladores</h3>
  <p>Importa <a href="./tokens.css"><code>tokens.css</code></a> en la web de la marca y usa las variables (<code>var(--brand-accent)</code>, <code>var(--font-display)</code>…). Datos completos en <a href="./brand.json"><code>brand.json</code></a>.</p>
</section>
</main>

<footer class="foot-nav"><span>Otras marcas</span>${others}</footer>
</body>
</html>
`;
}

// ─── CSS compartido del brandbook (usa solo variables de tokens.css) ───
const BRANDBOOK_CSS = `/* Generado por scripts/build-brands.mjs */
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--brand-bg);color:var(--brand-fg);font-family:var(--font-body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;background:color-mix(in srgb,var(--brand-fg) 8%,transparent);padding:.1em .4em;border-radius:3px}
.top{position:sticky;top:0;z-index:20;display:flex;gap:24px;align-items:center;justify-content:space-between;padding:12px 32px;background:color-mix(in srgb,var(--brand-bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--brand-line)}
.top nav{display:flex;gap:16px;overflow-x:auto;scrollbar-width:none}
.top a{text-decoration:none;font-family:var(--font-secondary);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-muted);white-space:nowrap}
.top a:hover{color:var(--brand-accent)}
.back{color:var(--brand-fg)!important}
.ph{background:var(--mood)}
.ph.alt{filter:hue-rotate(-12deg) saturate(.8) brightness(.85)}

/* Wordmark recreado */
.wm{display:inline-flex;flex-direction:column;align-items:center;gap:.35em;font-family:var(--font-display);letter-spacing:var(--tracking-display);text-transform:uppercase;line-height:.88}
.wm-word{display:flex;flex-direction:column;align-items:center}
.layout-centered .wm-word,.layout-editorial .wm-word,.layout-cinematic .wm-word,.layout-news .wm-word,.layout-social .wm-word{flex-direction:row;gap:.28em}
.wm small{font-family:var(--font-secondary);font-size:.22em;letter-spacing:var(--tracking-secondary);font-weight:500;line-height:1}
.layout-centered .wm-word span:first-child::after{content:"◆";font-size:.38em;vertical-align:middle;margin-left:.35em;color:var(--brand-accent)}
.layout-urban .wm-word{border:.08em solid currentColor;padding:.12em .18em}

/* Portada */
.cover{position:relative;min-height:78vh;display:grid;place-items:center;overflow:hidden;text-align:center}
.cover>.ph{position:absolute;inset:0}
.cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,var(--brand-bg) 100%)}
.cover-in{position:relative;z-index:1;padding:48px 24px;color:#fff;text-shadow:0 2px 30px rgba(0,0,0,.35)}
.is-light .cover-in{color:var(--brand-fg);text-shadow:none}
.wm-cover{font-size:clamp(56px,11vw,150px);font-weight:800}
.tagline{font-family:var(--font-secondary);font-size:clamp(18px,2.4vw,28px);margin-top:28px;letter-spacing:var(--tracking-secondary)}
.layout-editorial .tagline,.layout-minimal .tagline{font-style:italic;letter-spacing:0}
.handle{margin-top:10px;font-size:13px;opacity:.75;letter-spacing:.06em}

main{max-width:1180px;margin:0 auto;padding:0 32px}
main>section{padding:96px 0;border-bottom:1px solid var(--brand-line)}
.label{font-family:var(--font-secondary);font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--brand-accent);margin-bottom:16px}
h2{font-family:var(--font-display);font-size:clamp(30px,4vw,52px);line-height:1.05;letter-spacing:var(--tracking-display);text-transform:uppercase;margin-bottom:24px;font-weight:700;max-width:22ch}
.layout-editorial h2,.layout-minimal h2{text-transform:none;font-family:var(--font-secondary);font-style:italic;font-weight:500;letter-spacing:0}
h4{font-family:var(--font-secondary);font-size:13px;letter-spacing:.14em;text-transform:uppercase;margin:24px 0 10px;color:var(--brand-muted)}
.sub-h{font-family:var(--font-secondary);text-transform:uppercase;letter-spacing:.14em;font-size:14px;margin:56px 0 16px;color:var(--brand-muted)}
.lead{font-size:19px;max-width:62ch;color:color-mix(in srgb,var(--brand-fg) 85%,transparent);margin-bottom:24px}
ul{padding-left:20px}li{margin:6px 0}
ul.x li::marker{content:"✕  ";color:#E53935}ul.ok li::marker{content:"✓  ";color:#22A559}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chips span{border:1px solid var(--brand-line);background:var(--brand-surface);padding:6px 14px;border-radius:999px;font-size:13px}
.chips.x span{text-decoration:line-through;opacity:.7}
.values{margin-top:16px;columns:2;column-gap:40px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.note{font-size:13px;color:var(--brand-muted);margin:12px 0 24px}
.specs{display:grid;grid-template-columns:180px 1fr;gap:12px 24px;margin:24px 0}
.specs dt{font-family:var(--font-secondary);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand-muted);padding-top:3px}

/* Logo */
.logo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.logo-tile{aspect-ratio:4/3;display:grid;place-items:center;font-size:clamp(28px,4vw,48px);font-weight:800;border:1px solid var(--brand-line);overflow:hidden;padding:12px}
.on-bg{background:var(--brand-bg);color:var(--brand-fg)}
.on-accent{background:var(--brand-accent);color:var(--brand-on-accent)}
.on-inverse{background:var(--brand-fg);color:var(--brand-bg)}

/* Color */
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.sw-chip{aspect-ratio:1.2;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;border:1px solid var(--brand-line)}
.sw-chip b{font-size:16px}.sw-chip span{font-family:ui-monospace,monospace;font-size:13px}.sw-chip em{font-size:11px;font-style:normal;opacity:.75}
.sw-meta{padding:10px 2px;font-size:13px}.sw-meta .role{display:block;color:var(--brand-accent);font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:6px 0 2px}.sw-meta p{color:var(--brand-muted)}
.grads{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:24px}
.grad{height:120px;display:flex;align-items:flex-end;padding:12px;color:#fff;font-size:13px;border:1px solid var(--brand-line)}

/* Tipografía */
.spec{display:grid;grid-template-columns:200px 1fr;gap:32px;padding:32px 0;border-top:1px solid var(--brand-line)}
.spec-aa{font-size:140px;line-height:.9;color:var(--brand-accent)}
.spec-info h4{font-size:22px;letter-spacing:0;text-transform:none;color:var(--brand-fg);margin:4px 0 8px;font-family:var(--font-body)}
.spec-info p{color:var(--brand-muted);font-size:14px}
.weights{display:flex;gap:16px;margin:12px 0;font-size:22px}
.spec-sample{font-size:clamp(24px,3.4vw,40px);line-height:1.15;margin-top:8px}
.scale-row{display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:baseline;padding:16px 0;border-top:1px solid var(--brand-line);overflow:hidden}
.scale-meta{display:flex;flex-direction:column;font-size:12px;color:var(--brand-muted)}.scale-meta b{color:var(--brand-fg);font-size:13px}
.scale-sample{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* UI */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:.9em 1.6em;background:var(--brand-accent);color:var(--brand-on-accent);border-radius:var(--radius);font-family:var(--font-secondary);font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;border:1.5px solid var(--brand-accent);transition:transform .25s var(--ease),filter .25s var(--ease);cursor:default}
.btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
.btn.ghost{background:transparent;color:var(--brand-fg);border-color:currentColor}
.btn.block{display:flex;width:100%;margin-top:16px}
.tag{font-family:var(--font-secondary);font-size:11px;letter-spacing:.2em;text-transform:uppercase;border:1px solid var(--brand-accent);color:var(--brand-accent);padding:6px 12px;border-radius:var(--radius)}
.ui-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:32px}
.ui-cards{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.card{background:var(--brand-surface);border:1px solid var(--brand-line);border-radius:var(--radius);overflow:hidden}
.card-media{aspect-ratio:16/9}.card-body{padding:24px}
.card h4{font-family:var(--font-display);font-size:26px;letter-spacing:var(--tracking-display);text-transform:uppercase;color:var(--brand-fg);margin:6px 0}
.card p{color:var(--brand-muted);font-size:13px}
.card label{display:block;font-size:12px;color:var(--brand-muted);margin:10px 0 6px}
.input{border:1px solid var(--brand-line);background:var(--brand-bg);padding:12px 14px;border-radius:var(--radius);font-size:14px}.input.muted{color:var(--brand-muted)}
.k{font-family:var(--font-secondary);font-size:12px;letter-spacing:var(--tracking-secondary);text-transform:uppercase;color:var(--brand-accent)}

/* Tablas */
.tbl{width:100%;border-collapse:collapse;margin-top:32px;font-size:14px}
.tbl th,.tbl td{text-align:left;padding:12px;border-top:1px solid var(--brand-line);vertical-align:top}
.tbl th{font-family:var(--font-secondary);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-muted)}

/* ─── Plantillas (escalan con container queries) ─── */
.tpl-row{display:grid;grid-template-columns:1.25fr .75fr;gap:24px;align-items:start;margin-top:24px}
figure{margin:0}figcaption{font-size:12px;color:var(--brand-muted);margin-top:8px;letter-spacing:.08em;text-transform:uppercase}
figure.wide{margin-top:24px}
.tpl{position:relative;overflow:hidden;container-type:inline-size;color:#fff;background:var(--brand-bg);border:1px solid var(--brand-line)}
.tpl>.ph{position:absolute;inset:0}
.post{aspect-ratio:4/5}.story{aspect-ratio:9/16}
.tpl .k{font-size:3.2cqw}
.tpl .h{font-family:var(--font-display);text-transform:uppercase;letter-spacing:var(--tracking-display);line-height:.92;font-size:11cqw;font-weight:800}
.tpl .sub{font-family:var(--font-secondary);text-transform:uppercase;letter-spacing:var(--tracking-secondary);font-size:3cqw;margin-top:2cqw}
.tpl .meta{font-family:var(--font-secondary);letter-spacing:.12em;text-transform:uppercase;font-size:2.4cqw;opacity:.85;margin-top:2cqw}
.tpl .mono{font-family:var(--font-mono,var(--font-secondary))}
.tpl .hl{color:var(--brand-accent)}
.wm-tpl{font-size:14cqw;font-weight:800}

/* editorial (ARRIVE) */
.l-editorial>.ph{bottom:30%}
.l-editorial .band{position:absolute;left:0;right:0;bottom:0;height:30%;background:var(--brand-ivory,var(--brand-surface));color:var(--brand-fg);padding:5cqw 6cqw;display:flex;flex-direction:column;justify-content:center}
.l-editorial .h.sec{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0;font-weight:500;font-size:10cqw}
.l-editorial .k{color:var(--brand-accent)}.l-editorial .meta{color:var(--brand-muted)}

/* news (5AM) */
.l-news>.ph{bottom:45%}
.l-news .box{position:absolute;left:0;right:0;bottom:7%;top:52%;background:var(--brand-bg);padding:4cqw 5cqw;border-top:1.2cqw solid var(--brand-accent)}
.l-news .pill{display:inline-block;background:var(--brand-bear,#E53935);color:#fff;font-family:var(--font-secondary);font-weight:800;font-size:2.6cqw;letter-spacing:.14em;padding:.6cqw 2cqw}
.l-news .h{font-size:12.5cqw;margin-top:2cqw;font-weight:400}
.l-news .sub{text-transform:none;letter-spacing:0;font-size:3.4cqw}
.l-news .ticker{position:absolute;left:0;right:0;bottom:0;height:7%;display:flex;align-items:center;gap:2cqw;padding:0 3cqw;background:var(--brand-navy,#0B3D91);font-size:2.4cqw;white-space:nowrap;overflow:hidden}
.ticker .up{color:var(--brand-bull,#00C853)}.ticker .dn{color:var(--brand-bear,#E53935)}

/* centered (The Room) */
.l-centered .stack{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--brand-fg);padding:6cqw}
.l-centered .k{color:var(--brand-fg);letter-spacing:.3em;margin-bottom:6cqw}
.l-centered .flare{width:70%;height:.5cqw;margin:5cqw 0 3cqw;background:var(--gradient-ember-flare,var(--brand-accent));box-shadow:0 0 4cqw var(--brand-accent)}
.l-centered .wm-tpl{font-size:15cqw;font-weight:400}
.l-centered .meta{position:absolute;bottom:6cqw}

/* impact (Ignite) */
.l-impact{padding:6cqw}
.l-impact .k{position:relative;font-size:4cqw;color:#fff;letter-spacing:.2em}
.l-impact .giant{position:relative;font-family:var(--font-display);text-transform:uppercase;font-size:34cqw;line-height:.82;color:var(--brand-accent);margin:4cqw 0 0 -2cqw;letter-spacing:-.02em;text-shadow:0 0 6cqw color-mix(in srgb,var(--brand-accent) 60%,transparent);transform:rotate(-4deg);white-space:nowrap}
.l-impact .sub{position:relative;font-size:3.6cqw;margin-top:8cqw}
.btn-pill{position:absolute;left:6cqw;bottom:6cqw;background:var(--brand-accent);color:#fff;font-family:var(--font-display);text-transform:uppercase;font-size:3.6cqw;padding:2.4cqw 5cqw;border-radius:999px;box-shadow:0 0 5cqw color-mix(in srgb,var(--brand-accent) 70%,transparent)}

/* social (Hang Out) */
.l-social .phrase{position:absolute;top:7cqw;left:8cqw;right:8cqw;text-align:center;font-family:var(--font-secondary);font-size:5cqw;line-height:1.15;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.l-social .sticker{position:absolute;right:6cqw;bottom:26cqw;width:20cqw;height:20cqw;border-radius:50%;background:var(--brand-accent);display:grid;place-items:center;font-size:10cqw;transform:rotate(12deg);box-shadow:0 0 6cqw color-mix(in srgb,var(--brand-accent) 50%,transparent)}
.l-social .foot{position:absolute;left:6cqw;bottom:6cqw}
.l-social .h{color:var(--brand-accent);font-size:13cqw}

/* minimal (Dinner Club) */
.l-minimal{background:var(--brand-bg);color:var(--brand-fg);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8cqw}
.l-minimal .k{font-family:var(--font-display);font-size:6cqw;color:var(--brand-fg);letter-spacing:.2em}
.l-minimal .circle{width:52cqw;height:52cqw;border-radius:50%;background:var(--brand-white,#fff);color:var(--brand-ink,#0B0B0B);display:grid;place-items:center;margin:6cqw 0;box-shadow:0 2cqw 6cqw rgba(0,0,0,.08)}
.l-minimal .wm-tpl{font-size:9cqw}
.l-minimal .sub.sec{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0;font-size:4.6cqw}
.l-minimal .rule{width:14cqw;height:.4cqw;background:var(--brand-accent);margin:4cqw 0 2cqw}
.l-minimal .meta{color:var(--brand-muted)}

/* urban (Urban Nights) */
.l-urban{padding:6cqw;text-align:center}
.l-urban>*:not(.ph){position:relative}
.l-urban .k{color:#fff;letter-spacing:.24em;margin-top:30cqw}
.l-urban .h.chrome{font-size:19cqw;background:var(--gradient-chrome-red,var(--brand-accent));-webkit-background-clip:text;background-clip:text;color:transparent;margin-top:2cqw;font-weight:900}
.l-urban .boxwm{margin-top:3cqw}.l-urban .wm-tpl{font-size:7cqw;color:#fff}
.l-urban .bar{position:absolute;left:0;right:0;bottom:0;padding:3cqw;background:#000;border-top:.4cqw solid var(--brand-accent);font-family:var(--font-secondary);font-size:2.6cqw;letter-spacing:.16em;text-transform:uppercase}

/* institutional (UDP) */
.l-institutional{padding:7cqw;display:flex;flex-direction:column;justify-content:flex-end}
.l-institutional>*:not(.ph){position:relative}
.l-institutional .h{font-size:13cqw;font-weight:900;max-width:90%}
.l-institutional .rule{width:12cqw;height:.8cqw;background:var(--brand-accent);margin:4cqw 0 2cqw}
.l-institutional .sub{text-transform:none;letter-spacing:0;font-family:var(--font-body);font-size:3.6cqw}
.l-institutional .cats{margin-top:8cqw;font-family:var(--font-secondary);letter-spacing:.3em;font-size:2.6cqw;opacity:.8}

/* cinematic (Elemento) */
.l-cinematic .horizon{position:absolute;left:0;right:0;top:58%;height:.4cqw;background:var(--brand-accent);box-shadow:0 0 6cqw 1cqw var(--brand-accent)}
.l-cinematic .over{position:absolute;left:6cqw;right:6cqw;bottom:6cqw}
.l-cinematic .k{color:var(--brand-chrome,#ccc)}
.l-cinematic .h{font-size:10cqw}
.l-cinematic .meta{color:var(--brand-accent)}

/* Story genérico */
.story .story-in{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.45));text-shadow:0 2px 12px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:12cqw 8cqw}
.story .wm-sm{font-size:9cqw;font-weight:800}
.story .h{font-size:16cqw}
.story .k{font-size:4.4cqw;color:#fff;opacity:.85}
.story.l-editorial .h,.story.l-minimal .h{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0;font-weight:500}.story .sub{font-size:4cqw}.story .meta{font-size:3.4cqw}
.story .btn{font-size:4cqw}

/* Carrusel */
.carousel{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.slide{aspect-ratio:4/5}
.slide .slide-in{position:absolute;inset:0;padding:8cqw;display:flex;flex-direction:column;justify-content:flex-end;gap:3cqw}
.slide.slide-cover .h{font-size:11cqw}
.slide .swipe{font-size:3.4cqw;opacity:.8}
.slide.inner{background:var(--brand-surface);color:var(--brand-fg)}
.slide.inner.alt{background:var(--brand-accent);color:var(--brand-on-accent)}
.slide.inner.alt .btn{background:var(--brand-on-accent);color:var(--brand-accent);border-color:var(--brand-on-accent);font-size:3.6cqw;align-self:flex-start}
.slide .num{font-family:var(--font-display);font-size:16cqw;color:var(--brand-accent);line-height:1}
.slide.alt .num{color:inherit;opacity:.5}
.slide .h.sm{font-size:7cqw;line-height:1}
.slide p{font-size:3.8cqw;opacity:.8}

/* Web mock */
.web{border:1px solid var(--brand-line);border-radius:10px;overflow:hidden;background:var(--brand-bg);margin:24px 0;container-type:inline-size}
.web-bar{display:flex;gap:6px;align-items:center;padding:10px 14px;background:var(--brand-surface);font-size:12px;color:var(--brand-muted)}
.web-bar i{width:10px;height:10px;border-radius:50%;background:var(--brand-line)}.web-bar span{margin-left:12px}
.web-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 28px;border-bottom:1px solid var(--brand-line)}
.wm-nav{font-size:20px;font-weight:800;flex-direction:row}.wm-nav small{display:none}
.web-nav nav{display:flex;gap:20px;font-size:13px;color:var(--brand-muted)}
.web-nav .btn{padding:.6em 1.1em;font-size:11px}
.web-hero{display:grid;grid-template-columns:1.1fr .9fr;min-height:360px}
.web-copy{padding:48px 28px;display:flex;flex-direction:column;justify-content:center;gap:16px}
.web-copy h3{font-family:var(--font-display);font-size:clamp(28px,5cqw,56px);line-height:1;text-transform:uppercase;letter-spacing:var(--tracking-display)}
.layout-editorial .web-copy h3,.layout-minimal .web-copy h3{font-family:var(--font-secondary);font-style:italic;text-transform:none;letter-spacing:0}
.web-copy p{color:var(--brand-muted);font-size:14px;max-width:46ch}
.web-ctas{display:flex;gap:12px;flex-wrap:wrap}
.web-media{min-height:280px}
.sitemap{display:flex;flex-wrap:wrap;gap:8px}
.sitemap span{background:var(--brand-surface);border:1px solid var(--brand-line);padding:8px 14px;border-radius:var(--radius);font-size:13px}
.sitemap em{font-style:normal;color:var(--brand-accent);margin-right:8px;font-family:var(--font-secondary)}

/* Imagen y motion */
.mood-strip{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;height:240px;margin-bottom:24px}
.motion-demo{display:grid;place-items:center;height:260px;background:var(--brand-surface);border:1px solid var(--brand-line);overflow:hidden}
.wm-anim{font-size:clamp(40px,7vw,84px);font-weight:800;animation:wm-in 3.2s var(--ease) infinite}
@keyframes wm-in{0%{opacity:0;letter-spacing:.5em;filter:blur(8px)}35%,80%{opacity:1;letter-spacing:var(--tracking-display);filter:blur(0)}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.wm-anim{animation:none}}

.quotes{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin:24px 0}
blockquote{font-family:var(--font-display);text-transform:uppercase;letter-spacing:var(--tracking-display);font-size:24px;line-height:1.1;padding:24px;background:var(--brand-surface);border-left:4px solid var(--brand-accent)}
.layout-editorial blockquote,.layout-minimal blockquote,.layout-social blockquote{font-family:var(--font-secondary);text-transform:none;letter-spacing:0;font-style:italic}

.foot-nav{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center;padding:40px 24px;font-size:13px;color:var(--brand-muted)}
.foot-nav a{text-decoration:none;font-family:var(--font-secondary);letter-spacing:.1em;text-transform:uppercase;color:var(--brand-fg)}
.foot-nav a:hover{color:var(--brand-accent)}

@media (max-width:800px){
  .top{padding:10px 16px}.top nav{display:none}
  main{padding:0 16px}main>section{padding:64px 0}
  .two,.ui-cards,.tpl-row,.web-hero{grid-template-columns:1fr}
  .logo-grid{grid-template-columns:1fr}
  .specs,.spec,.scale-row{grid-template-columns:1fr;gap:8px}
  .spec-aa{font-size:96px}
  .values{columns:1}
  .carousel{grid-template-columns:1fr 1fr}.carousel .slide:last-child{display:none}
  .web-nav nav{display:none}
}
`;

// ─── Índice de marcas ───
function hubHtml(brands) {
    const fonts = brands.map(b => googleFontsUrl(b)).map(u => `<link rel="stylesheet" href="${u}">`).join('\n');
    const cards = brands.map(b => {
        const t = themeOf(b);
        const d = b.typography.display;
        return `<a class="card" href="./${b.slug}/" style="--bg:${t.bg};--fg:${t.fg};--ac:${t.accent};--mood:${b.mood}">
  <div class="mood"></div>
  <div class="in"><div class="name" style="font-family:${stack('display', d)};letter-spacing:${d.tracking}">${esc(b.name)}</div>
  <div class="desc">${esc(b.descriptor)}</div><div class="tag">${esc(b.tagline)}</div>
  <div class="dots">${b.colors.slice(0, 6).map(c => `<i style="background:${c.hex}"></i>`).join('')}</div>
  <div class="handle">${esc(b.handler)}</div></div></a>`;
    }).join('\n');
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marcas — Líneas gráficas</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0B0B0D;color:#F2F2F2;font-family:Inter,system-ui,sans-serif;padding:48px 32px}
header{max-width:1240px;margin:0 auto 32px}
h1{font-size:14px;letter-spacing:.24em;text-transform:uppercase;color:#9A9AA3;font-weight:600}
h2{font-size:clamp(28px,4vw,44px);margin-top:8px;font-weight:700}
p.lead{color:#9A9AA3;margin-top:8px;max-width:60ch}
.grid{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.card{position:relative;display:block;min-height:300px;overflow:hidden;border-radius:12px;background:var(--bg);color:var(--fg);text-decoration:none;border:1px solid rgba(255,255,255,.08);transition:transform .3s cubic-bezier(.22,1,.36,1)}
.card:hover{transform:translateY(-4px)}
.mood{position:absolute;inset:0 0 45% 0;background:var(--mood);opacity:.9}
.mood::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,var(--bg))}
.in{position:relative;padding:24px;display:flex;flex-direction:column;min-height:300px;justify-content:flex-end}
.name{font-size:38px;font-weight:800;text-transform:uppercase;line-height:.95}
.desc{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ac);margin-top:10px}
.tag{font-size:14px;opacity:.85;margin-top:6px}
.dots{display:flex;gap:6px;margin-top:16px}.dots i{width:18px;height:18px;border-radius:50%;border:1px solid rgba(127,127,127,.4)}
.handle{position:absolute;top:16px;right:18px;font-size:12px;opacity:.8}
@media (max-width:600px){body{padding:32px 16px}.grid{grid-template-columns:1fr}}
</style></head>
<body>
<header><h1>Command Center · Marcas</h1><h2>Líneas gráficas</h2><p class="lead">Sistema de marca de cada cuenta: logo, color, tipografía, interfaz, plantillas de redes, estructura web, imagen, motion y voz.</p></header>
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

function build() {
    const brands = loadBrands();
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'brandbook.css'), BRANDBOOK_CSS);
    for (const brand of brands) {
        const css = tokensCss(brand);
        fs.writeFileSync(path.join(SRC, brand.slug, 'tokens.css'), css);
        fs.writeFileSync(path.join(SRC, brand.slug, 'BRAND.md'), brandMd(brand));
        const dir = path.join(OUT, brand.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'tokens.css'), css);
        fs.writeFileSync(path.join(dir, 'brand.json'), JSON.stringify(brand, null, 2));
        fs.writeFileSync(path.join(dir, 'index.html'), brandbookHtml(brand, brands));
    }
    fs.writeFileSync(path.join(OUT, 'index.html'), hubHtml(brands));
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(brands.map(b => ({ slug: b.slug, name: b.name, accountId: b.accountId, handler: b.handler })), null, 2));
    console.log(`✓ ${brands.length} marcas: ${brands.map(b => b.slug).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
