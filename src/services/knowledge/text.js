// Utilidades de texto compartidas por el almacén y el importador.
import crypto from 'crypto';

export const hash = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

/** minúsculas y sin tildes, para comparar palabras ("decisión" = "decision") */
export const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const STOPWORDS = new Set(('que los las del con por para una uno unos unas como mas pero sus este esta esto ese esa eso hay fue ser son era muy sin sobre entre cuando donde quien cual todo todos toda todas tambien ya lo le les se su al el la de en y o a un es no si mi me te tu nos the and for with that this from are was you your have has not but what how').split(' '));

export function terms(query) {
    return [...new Set(fold(query).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !STOPWORDS.has(w)))];
}

/**
 * Parte un texto en trozos de ~maxChars respetando párrafos, con un poco de solape
 * para que una idea que cae en el borde no se pierda.
 */
export function chunkText(text, maxChars = 1600, overlap = 200) {
    const clean = String(text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!clean) return [];
    if (clean.length <= maxChars) return [clean];
    const paragraphs = clean.split(/\n\n+/);
    const chunks = [];
    let current = '';
    const push = () => { if (current.trim()) chunks.push(current.trim()); };
    for (let para of paragraphs) {
        while (para.length > maxChars) {
            // Párrafo gigante (código, tablas): se corta en seco por frases o caracteres.
            const cut = Math.max(para.lastIndexOf('. ', maxChars), para.lastIndexOf('\n', maxChars), maxChars * 0.6) + 1;
            if (current) { push(); current = ''; }
            chunks.push(para.slice(0, cut).trim());
            para = para.slice(Math.max(0, cut - overlap));
        }
        if ((current + '\n\n' + para).length > maxChars && current) {
            push();
            current = current.slice(-overlap) + '\n\n' + para;
        } else {
            current = current ? `${current}\n\n${para}` : para;
        }
    }
    push();
    return chunks;
}

export function snippetFor(text, queryTerms, len = 240) {
    const t = String(text || '');
    const f = fold(t);
    let idx = -1;
    for (const term of queryTerms) {
        idx = f.indexOf(term);
        if (idx >= 0) break;
    }
    if (idx < 0) return t.slice(0, len) + (t.length > len ? '…' : '');
    const start = Math.max(0, idx - 60);
    const end = Math.min(t.length, start + len);
    return (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
}
