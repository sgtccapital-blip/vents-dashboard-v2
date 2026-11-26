// Carga la marca publicada (public/brands/<slug>/) dentro del render: brand.json + logos SVG.
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

export function useBrandData(slug) {
    const [data, setData] = useState(null);
    const [handle] = useState(() => delayRender(`Cargando marca ${slug}`));
    useEffect(() => {
        const base = `brands/${slug}`;
        const text = p => fetch(staticFile(`${base}/${p}`)).then(r => {
            if (!r.ok) throw new Error(`No existe ${base}/${p}: corre "npm run brands" en el proyecto`);
            return r.text();
        });
        Promise.all([text('brand.json'), text('logo/primary.svg'), text('logo/inverse.svg'), text('logo/symbol.svg'), text('logo/on-accent.svg')])
            .then(([brand, primary, inverse, symbol, onAccent]) => {
                setData({ brand: JSON.parse(brand), logos: { primary, inverse, symbol, onAccent } });
                continueRender(handle);
            })
            .catch(err => { console.error(err); continueRender(handle); });
    }, [slug, handle]);
    return data;
}

// Logo que va sobre fotos/moods oscuros (UDP usa la versión invertida).
export const moodLogo = (slug, logos) => (slug === 'udp' ? logos.inverse : logos.primary);

// Ancho del logo según sus proporciones (los apilados y circulares necesitan menos ancho).
export const logoWidth = (slug, base) => ({ 'dinner-club': 0.55, '5amclub': 0.5, 'urban-nights': 0.62, udp: 0.62, hangout: 0.95 }[slug] || 1) * base;
