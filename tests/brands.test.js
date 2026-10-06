import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBrands } from '../scripts/build-brands.mjs';
import { seedSocialMedia } from '../src/lib/seedData.js';

test('cada marca es válida y apunta a una cuenta existente', () => {
    const brands = loadBrands();
    assert.ok(brands.length > 0);
    const accountIds = new Set(seedSocialMedia.map(a => a.id));
    for (const b of brands) {
        assert.ok(accountIds.has(b.accountId), `${b.slug}: cuenta ${b.accountId} no existe`);
    }
    assert.equal(new Set(brands.map(b => b.accountId)).size, brands.length, 'dos marcas apuntan a la misma cuenta');
});
