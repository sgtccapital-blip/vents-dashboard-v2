// Paquete de producción: brief en Markdown que lee el editor humano y Claude Code para ejecutar la pieza.

const STORY_LABEL = { announce: 'Anuncio', countdown: 'Cuenta regresiva', poll: 'Encuesta', repost: 'Repost', link: 'Link / CTA' };

export function slugify(text) {
    return String(text || 'pieza').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'pieza';
}

const cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');

export function renderBrief({ task, account, brand, assets, accountSlug }) {
    const d = task.development || {};
    const byId = new Map(assets.map(a => [a.id, a]));
    const assetRef = id => {
        const a = byId.get(id);
        return a ? `[${a.name}](${a.webViewLink})` : (id === 'grafico' ? 'Gráfico de marca' : id);
    };
    const edl = (d.edl || []).slice().sort((x, y) => x.order - y.order);
    const v = brand?.content?.video;

    return `# ${task.title}

> ${account.handler} · ${task.format} · ${task.pillar || ''} · ${d.durationSec ? `${d.durationSec} s` : ''}
> Estado: ${task.status} · Publicación: ${task.publishDate || 'sin fecha'} ${task.publishTime || ''}

Antes de editar, lee la línea de la cuenta: \`brands/${brand?.slug || '?'}/BRAND.md\` (sección Línea de contenido) y \`content-dna/${accountSlug}/DNA.md\`.
Brandbook: /brands/${brand?.slug || ''}/#contenido · Kit: /brands/${brand?.slug || ''}/${brand?.slug || ''}-kit.zip

## Gancho
- **Visual:** ${d.hookVisual || task.hookVisual || ''}
- **Texto / voz:** ${d.hookVerbal || task.hookVerbal || ''}

## Guion de edición (EDL)

| # | Toma | In → Out | Para qué | Texto en pantalla | Subtítulo / voz | Transición |
|---|---|---|---|---|---|---|
${edl.map(s => `| ${s.order} | ${cell(assetRef(s.assetId))} | ${s.inSec}s → ${s.outSec}s | ${cell(s.purpose)} | ${cell(s.overlay)} | ${cell(s.subtitle)} | ${cell(s.transition)} |`).join('\n')}

## Estilo (de la línea de la cuenta)
${v ? `- **Texto sobre video:** ${v.overlay.style}
- **Subtítulos:** ${v.subtitles.style}
- **Color:** ${v.grade}
- **Transiciones:** ${v.transitions}
- **Cierre:** ${v.endcard.style}` : '- (La cuenta aún no tiene línea de contenido)'}

## Música
${d.music || ''}

## Portada
- **Título:** ${d.cover?.title || ''}
- **Frame:** ${d.cover ? assetRef(d.cover.assetId) : ''}

## Cierre
${d.endcard || ''}

## Historias de apoyo
${(d.stories || []).map(s => `- **${STORY_LABEL[s.type] || s.type}** (${s.when}): ${s.text}`).join('\n') || '- Ninguna'}

## Caption
${d.caption || task.caption || ''}

${d.cta || task.cta || ''}

${d.hashtags || task.hashtags || ''}

## Material raw
${(task.rawAssetIds || []).map(id => {
        const a = byId.get(id);
        return a ? `- ${a.name} · ${a.kind}${a.durationSec ? ` · ${a.durationSec}s` : ''} · ${a.nightName} · ${a.webViewLink}` : `- ${id} (no encontrado)`;
    }).join('\n')}

## Checklist
${(d.checklist || []).map(x => `- [ ] ${x}`).join('\n')}
- [ ] Exportar 1080×1920, 30 fps, H.264
- [ ] Revisar zonas seguras de Instagram (textos fuera del 14% superior y 20% inferior)
- [ ] Subir el render final a la carpeta de la noche en Drive y marcar la pieza como "Listo" en el dashboard

## Para Claude Code
Para ejecutar este brief: descarga los archivos de "Material raw" a \`content-dna/${accountSlug}/raw/\`, monta la edición siguiendo el EDL y el estilo de la cuenta (Remotion o ffmpeg) y deja el render en \`content-dna/${accountSlug}/renders/${slugify(task.title)}.mp4\`.
`;
}
