// Lector mínimo de ZIP (incluye ZIP64) para sacar archivos concretos de la exportación de ChatGPT
// sin descomprimir todo: la exportación trae también imágenes y audios que pueden pesar gigas.
import fs from 'fs';
import zlib from 'zlib';

const EOCD_SIG = 0x06054b50;
const ZIP64_LOCATOR_SIG = 0x07064b50;
const ZIP64_EOCD_SIG = 0x06064b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

function readAt(fd, position, length) {
    const buf = Buffer.alloc(length);
    let read = 0;
    while (read < length) {
        const n = fs.readSync(fd, buf, read, length - read, position + read);
        if (n === 0) break;
        read += n;
    }
    return buf.subarray(0, read);
}

function findCentralDirectory(fd, size) {
    const tailLen = Math.min(size, 22 + 65535 + 20);
    const tail = readAt(fd, size - tailLen, tailLen);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
        if (tail.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('No es un archivo ZIP válido');
    let entries = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOffset = tail.readUInt32LE(eocd + 16);

    const locPos = eocd - 20;
    if (locPos >= 0 && tail.readUInt32LE(locPos) === ZIP64_LOCATOR_SIG) {
        const z64Offset = Number(tail.readBigUInt64LE(locPos + 8));
        const z64 = readAt(fd, z64Offset, 56);
        if (z64.readUInt32LE(0) === ZIP64_EOCD_SIG) {
            entries = Number(z64.readBigUInt64LE(32));
            cdSize = Number(z64.readBigUInt64LE(40));
            cdOffset = Number(z64.readBigUInt64LE(48));
        }
    }
    return { entries, cdSize, cdOffset };
}

/** Lista las entradas del ZIP: [{ name, method, compressedSize, size, localOffset }] */
export function listZip(filePath) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const { size } = fs.fstatSync(fd);
        const { cdSize, cdOffset } = findCentralDirectory(fd, size);
        const cd = readAt(fd, cdOffset, cdSize);
        const out = [];
        let p = 0;
        while (p + 46 <= cd.length && cd.readUInt32LE(p) === CEN_SIG) {
            const method = cd.readUInt16LE(p + 10);
            let compressedSize = cd.readUInt32LE(p + 20);
            let uncompressed = cd.readUInt32LE(p + 24);
            const nameLen = cd.readUInt16LE(p + 28);
            const extraLen = cd.readUInt16LE(p + 30);
            const commentLen = cd.readUInt16LE(p + 32);
            let localOffset = cd.readUInt32LE(p + 42);
            const name = cd.subarray(p + 46, p + 46 + nameLen).toString('utf8');
            // Campo extra ZIP64: solo trae los valores que en la cabecera valen 0xFFFFFFFF, en este orden.
            let e = p + 46 + nameLen;
            const extraEnd = e + extraLen;
            while (e + 4 <= extraEnd) {
                const id = cd.readUInt16LE(e);
                const len = cd.readUInt16LE(e + 2);
                if (id === 0x0001) {
                    let q = e + 4;
                    if (uncompressed === 0xffffffff) { uncompressed = Number(cd.readBigUInt64LE(q)); q += 8; }
                    if (compressedSize === 0xffffffff) { compressedSize = Number(cd.readBigUInt64LE(q)); q += 8; }
                    if (localOffset === 0xffffffff) { localOffset = Number(cd.readBigUInt64LE(q)); }
                }
                e += 4 + len;
            }
            out.push({ name, method, compressedSize, size: uncompressed, localOffset });
            p = extraEnd + commentLen;
        }
        return out;
    } finally {
        fs.closeSync(fd);
    }
}

/** Devuelve el contenido descomprimido de una entrada. */
export function readZipEntry(filePath, entry) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const loc = readAt(fd, entry.localOffset, 30);
        if (loc.readUInt32LE(0) !== LOC_SIG) throw new Error(`Cabecera local inválida en ${entry.name}`);
        const dataStart = entry.localOffset + 30 + loc.readUInt16LE(26) + loc.readUInt16LE(28);
        const raw = readAt(fd, dataStart, entry.compressedSize);
        if (entry.method === 0) return raw;
        if (entry.method === 8) return zlib.inflateRawSync(raw);
        throw new Error(`Compresión ZIP no soportada (${entry.method}) en ${entry.name}`);
    } finally {
        fs.closeSync(fd);
    }
}
