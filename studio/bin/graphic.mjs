// Genera gráficos de marca: historias, posts y animación de logo.
// Uso:
//   npm run graphic -- --brand the-room --type story-announce [--text "VIERNES 04 · SEP"] [--sub "..."] [--link "TICKETS"]
//   npm run graphic -- --brand ignite --type story-poll --q "¿Qué no puede faltar?" --a "Reggaetón|Electrónica"
//   npm run graphic -- --brand udp --type post --headline "LA CIUDAD ESTÁ CAMBIANDO."
//   npm run graphic -- --brand elemento --type sting            (MP4 de 3 s)
// Tipos: story-announce, story-countdown, story-poll, story-repost, story-link, post, sting
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { CONTENT_DNA, readDB, brandsModule, accountSlugOf, syncBrandsToStudio, parseArgs, log } from './lib.mjs';
import { getBundle } from './render-brief.mjs';

export async function renderGraphic(opts) {
    const { loadBrands } = await brandsModule();
    const brand = loadBrands().find(b => b.slug === opts.brand);
    if (!brand) throw new Error(`Marca desconocida "${opts.brand}". Opciones: ${loadBrands().map(b => b.slug).join(', ')}`);
    const account = (readDB().socialMedia || []).find(a => a.id === brand.accountId) || { handler: brand.handler };
    const acct = await accountSlugOf(account);
    syncBrandsToStudio();
    const serveUrl = await getBundle();
    const type = opts.type || 'story-announce';
    const outDir = path.join(CONTENT_DNA, acct, 'graphics');
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

    if (type === 'sting') {
        const inputProps = { brandSlug: brand.slug };
        const composition = await selectComposition({ serveUrl, id: 'LogoSting', inputProps });
        const out = opts.out || path.join(outDir, `${stamp}-logo-sting.mp4`);
        await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: out, inputProps, crf: 16 });
        return out;
    }
    const isStory = type.startsWith('story-');
    const inputProps = isStory
        ? { brandSlug: brand.slug, type: type.slice(6), text: opts.text, sub: opts.sub, link: opts.link, handle: account.handler, poll: opts.q ? { q: opts.q, a: String(opts.a || 'Sí|No').split('|') } : undefined }
        : { brandSlug: brand.slug, kicker: opts.kicker, headline: opts.headline, sub: opts.sub, meta: opts.meta };
    const id = isStory ? 'StoryGraphic' : 'PostGraphic';
    const composition = await selectComposition({ serveUrl, id, inputProps });
    const out = opts.out || path.join(outDir, `${stamp}-${type}.png`);
    await renderStill({ composition, serveUrl, output: out, inputProps, imageFormat: 'png' });
    return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = parseArgs();
    if (!args.brand) {
        console.error('Uso: npm run graphic -- --brand <marca> --type <story-announce|story-countdown|story-poll|story-repost|story-link|post|sting> [--text] [--sub] [--link] [--headline] [--q --a "A|B"] [--out]');
        process.exit(1);
    }
    try {
        log(`Listo: ${await renderGraphic(args)}`);
    } catch (err) {
        console.error(`✗ ${err.message}`);
        process.exit(1);
    }
}
