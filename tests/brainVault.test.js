import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectVaultFiles, parseFrontmatter, toRagDocument } from '../server/brainVault.js';

const FICHA = `---
titulo: "Venue: Furia"
tipo: venue
archivo: OPERATIONS/venue-furia.md
actualizado: 2026-10-14
etiquetas: [venue, nightlife, casco]
---

# Venue: Furia

## Datos clave
- Furia abre miércoles a sábado.
`;

test('parseFrontmatter lee claves y listas', () => {
    const { data, body } = parseFrontmatter(FICHA);
    assert.equal(data.titulo, 'Venue: Furia');
    assert.equal(data.tipo, 'venue');
    assert.deepEqual(data.etiquetas, ['venue', 'nightlife', 'casco']);
    assert.match(body, /^\s*# Venue: Furia/);
    assert.equal(parseFrontmatter('# Sin encabezado').body, '# Sin encabezado');
});

test('toRagDocument usa título y tipo del encabezado, y agrega etiquetas al texto', () => {
    const doc = toRagDocument(FICHA, 'OPERATIONS/venue-furia.md');
    assert.equal(doc.title, 'Venue: Furia');
    assert.equal(doc.category, 'venue');
    assert.doesNotMatch(doc.content, /^---/, 'el encabezado YAML no entra al texto');
    assert.match(doc.content, /Etiquetas: venue, nightlife, casco/);
    const plain = toRagDocument('# Nota suelta\ntexto', 'PERSONAL/nota.md');
    assert.equal(plain.title, 'Nota suelta');
    assert.equal(plain.category, 'personal');
});

test('collectVaultFiles omite plantillas, archivo y ocultos', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));
    const put = (p) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), '# x'); };
    ['OPERATIONS/venue-furia.md', 'CLIENTES/cliente-a.md', '_plantillas/venue.md', '_archivo/viejo.md', '_LEEME.md', '.obsidian/x.md', 'NEGOCIO/foto.png'].forEach(put);
    const rel = collectVaultFiles(root).map(f => path.relative(root, f)).sort();
    assert.deepEqual(rel, ['CLIENTES/cliente-a.md', 'OPERATIONS/venue-furia.md']);
    fs.rmSync(root, { recursive: true, force: true });
});
