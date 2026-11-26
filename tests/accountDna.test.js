import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    emptyDna, normalizeDna, dnaCompleteness, accountSlug, dnaToMarkdown,
    linesToList, linesToReferences, referencesToLines, parsePalette,
} from '../src/lib/accountDna.js';

test('normalizeDna rellena la estructura sin perder lo guardado', () => {
    assert.deepEqual(normalizeDna(undefined), emptyDna());
    const d = normalizeDna({ concept: 'Techno', visual: { typography: 'Inter' }, pillars: 'no-lista' });
    assert.equal(d.concept, 'Techno');
    assert.equal(d.visual.typography, 'Inter');
    assert.deepEqual(d.visual.palette, []);
    assert.deepEqual(d.pillars, []);
});

test('dnaCompleteness va de 0 a 100', () => {
    assert.equal(dnaCompleteness(undefined), 0);
    assert.equal(dnaCompleteness({ concept: '   ' }), 0);
    const full = {
        concept: 'a', mission: 'b', audience: 'c', voice: 'd',
        pillars: ['p'], formats: ['f'], hooks: ['h'],
        visual: { palette: ['#000000'], typography: 't', style: 's' },
        references: [{ url: 'https://x.com' }], dos: ['x'],
    };
    assert.equal(dnaCompleteness(full), 100);
    assert.equal(dnaCompleteness({ concept: 'a', mission: 'b', audience: 'c' }), 25);
});

test('accountSlug produce nombres de carpeta seguros', () => {
    assert.equal(accountSlug({ handler: '@Elemento.techno' }), 'elemento-techno');
    assert.equal(accountSlug({ handler: '@_5amclub' }), '5amclub');
    assert.equal(accountSlug({ handler: '@../../etc' }), 'etc');
    assert.equal(accountSlug({}), 'cuenta');
});

test('conversión de texto a listas y referencias', () => {
    assert.deepEqual(linesToList(' a \n\n b\n'), ['a', 'b']);
    const refs = linesToReferences('https://a.com — ritmo\nhttps://b.com\nhttps://c.com estilo subtítulos');
    assert.deepEqual(refs, [
        { url: 'https://a.com', note: 'ritmo' },
        { url: 'https://b.com', note: '' },
        { url: 'https://c.com', note: 'estilo subtítulos' },
    ]);
    assert.equal(referencesToLines(refs.slice(0, 2)), 'https://a.com — ritmo\nhttps://b.com');
});

test('parsePalette solo acepta hex válidos', () => {
    assert.deepEqual(parsePalette('#000, #d4af37 rojo #12 #ffffff'), ['#000', '#D4AF37', '#FFFFFF']);
});

test('dnaToMarkdown incluye solo las secciones definidas', () => {
    const md = dnaToMarkdown({
        handler: '@Music.pty', platform: 'Instagram', type: 'Music',
        dna: { concept: 'Música viral', pillars: ['Lanzamientos'], visual: { palette: ['#FF0000'] } },
    });
    assert.match(md, /^# ADN de contenido — @Music\.pty/);
    assert.match(md, /\*\*Concepto:\*\* Música viral/);
    assert.match(md, /## Pilares de contenido\n\n- Lanzamientos/);
    assert.match(md, /`#FF0000`/);
    assert.doesNotMatch(md, /## Nunca/);
});
