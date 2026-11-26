import { useEffect, useState } from 'react';

// Línea gráfica + línea de contenido publicadas por `npm run brands` en /brands/<marca>/.
const cache = new Map();

function load(url, parse) {
    if (!cache.has(url)) {
        cache.set(url, fetch(url).then(r => (r.ok ? parse(r) : null)).catch(() => null));
    }
    return cache.get(url);
}

export const loadBrandIndex = () => load('/brands/index.json', r => r.json());

/** Devuelve { brand, avatarSvg } de la marca ligada a una cuenta, o nulls si no tiene. */
export function useBrandForAccount(accountId) {
    // Se guarda junto al id para no mostrar la marca de otra cuenta mientras carga la nueva.
    const [state, setState] = useState({ id: null, brand: null, avatarSvg: null });
    useEffect(() => {
        if (!accountId) return undefined;
        let alive = true;
        loadBrandIndex().then(index => {
            const entry = (index || []).find(b => b.accountId === accountId);
            if (!entry) return [null, null];
            return Promise.all([
                load(`/brands/${entry.slug}/brand.json`, r => r.json()),
                load(`/brands/${entry.slug}/logo/avatar.svg`, r => r.text()),
            ]);
        }).then(([brand, avatarSvg]) => {
            if (alive) setState({ id: accountId, brand, avatarSvg });
        });
        return () => { alive = false; };
    }, [accountId]);
    return state.id === accountId ? state : { brand: null, avatarSvg: null };
}
