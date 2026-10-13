/**
 * Baja al final del contenedor con scroll más cercano al elemento.
 * A diferencia de scrollIntoView, nunca mueve la página entera (en móvil eso
 * dejaba el encabezado fuera de pantalla al abrir el chat).
 */
export function scrollToBottom(endEl, behavior = 'smooth') {
    for (let el = endEl?.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if (/(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight) {
            el.scrollTo({ top: el.scrollHeight, behavior });
            return;
        }
    }
}
