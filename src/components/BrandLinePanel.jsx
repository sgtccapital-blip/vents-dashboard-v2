import { Palette, Download, Film, Clapperboard, Type, Subtitles, ExternalLink } from 'lucide-react';

// Resumen de la línea gráfica y de contenido de una marca (brands/<marca>/brand.json + content.json).
// `compact` = guía rápida para el formulario de nueva pieza.
export default function BrandLinePanel({ brand, avatarSvg, compact = false }) {
    if (!brand) return null;
    const v = brand.content?.video;
    const base = `/brands/${brand.slug}/`;
    const fonts = [...new Set(Object.values(brand.typography).map(f => f.family))];

    if (compact) {
        return (
            <div className="brand-guide">
                <div className="brand-guide-head">
                    <Clapperboard size={14} /> GUÍA DE VIDEO · {brand.name}
                    <a href={`${base}#contenido`} target="_blank" rel="noreferrer">Ver línea completa <ExternalLink size={11} /></a>
                </div>
                {v && (
                    <dl>
                        <dt>Gancho</dt><dd>{v.hook}</dd>
                        <dt>Duración</dt><dd>{v.lengths}</dd>
                        <dt>Texto en pantalla</dt><dd>{v.overlay.style}</dd>
                        <dt>Subtítulos</dt><dd>{v.subtitles.style}</dd>
                        <dt>Cierre</dt><dd>{v.endcard.style}</dd>
                    </dl>
                )}
                <div className="brand-guide-swatches">
                    {brand.colors.map(c => <span key={c.token} style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />)}
                    <em>{fonts.join(' · ')}</em>
                </div>
            </div>
        );
    }

    return (
        <div className="brand-line">
            <div className="brand-line-top">
                {avatarSvg && <div className="brand-line-avatar" dangerouslySetInnerHTML={{ __html: avatarSvg }} />}
                <div className="brand-line-id">
                    <div className="brand-line-label"><Palette size={12} /> LÍNEA GRÁFICA</div>
                    <b>{brand.name}</b>
                    <span>{brand.tagline}</span>
                </div>
                <div className="brand-line-actions">
                    <a className="social-btn-secondary" href={base} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Brandbook</a>
                    <a className="social-btn-secondary" href={`${base}${brand.slug}-kit.zip`} download><Download size={13} /> Kit</a>
                </div>
            </div>
            <div className="brand-line-swatches">
                {brand.colors.map(c => (
                    <div key={c.token} title={c.usage}>
                        <span style={{ background: c.hex }} />
                        <small>{c.name}<br />{c.hex}</small>
                    </div>
                ))}
            </div>
            <div className="brand-line-fonts"><Type size={12} /> {Object.entries(brand.typography).map(([role, f]) => `${role}: ${f.family}`).join(' · ')}</div>
            {v && (
                <div className="brand-line-video">
                    <div className="brand-line-label"><Film size={12} /> ESTILO DE VIDEO</div>
                    <div className="brand-line-mix">
                        {brand.content.mix.map(m => (
                            <span key={m.type} className={`mix-${m.kind}`} style={{ flex: m.pct }} title={`${m.type} ${m.pct}%`}>{m.pct}%</span>
                        ))}
                    </div>
                    <dl>
                        <dt>Gancho</dt><dd>{v.hook}</dd>
                        <dt>Duración</dt><dd>{v.lengths}</dd>
                        <dt>Color</dt><dd>{v.grade}</dd>
                        <dt><Subtitles size={11} /> Texto y subtítulos</dt><dd>{v.overlay.style} {v.subtitles.style}</dd>
                    </dl>
                    <a className="brand-line-more" href={`${base}#contenido`} target="_blank" rel="noreferrer">Ver frames de video, historias y semana tipo →</a>
                </div>
            )}
        </div>
    );
}
