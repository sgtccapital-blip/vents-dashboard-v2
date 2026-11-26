import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'zlib';
import { zipFiles } from '../scripts/zip.mjs';

test('zipFiles produce un zip legible', () => {
    const zip = zipFiles([{ name: 'kit/LEEME.txt', data: 'hola ñandú' }, { name: 'kit/logo/a.svg', data: '<svg/>' }]);
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    const end = zip.length - 22;
    assert.equal(zip.readUInt32LE(end), 0x06054b50);
    assert.equal(zip.readUInt16LE(end + 10), 2);
    const nameLen = zip.readUInt16LE(26);
    assert.equal(zip.subarray(30, 30 + nameLen).toString(), 'kit/LEEME.txt');
    const size = zip.readUInt32LE(18);
    const data = zlib.inflateRawSync(zip.subarray(30 + nameLen, 30 + nameLen + size)).toString();
    assert.equal(data, 'hola ñandú');
});
