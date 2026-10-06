// Descarga de Drive el material raw de una pieza a content-dna/<cuenta>/raw/<noche>/.
// Uso: npm run fetch-raw -- <taskId>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT, readDB, accountSlugOf, localRawPath, parseArgs, log } from './lib.mjs';

export async function fetchRawForTask(taskId, db = readDB()) {
    const task = (db.contentTasks || []).find(t => t.id === taskId);
    if (!task) throw new Error(`No existe la pieza ${taskId}`);
    const account = (db.socialMedia || []).find(a => a.id === task.accountId);
    const slug = await accountSlugOf(account);
    const ids = new Set([...(task.rawAssetIds || []), ...((task.development?.edl || []).map(s => s.assetId))]);
    const assets = (db.rawAssets || []).filter(a => ids.has(a.id));
    const missing = assets.filter(a => a.driveId && !fs.existsSync(localRawPath(slug, a)));
    if (!missing.length) return { slug, assets, downloaded: 0 };

    const { createDriveClient, driveCredentialsFromEnv } = await import(path.join(ROOT, 'src/services/contentStudio/drive.js'));
    const client = createDriveClient(driveCredentialsFromEnv());
    for (const a of missing) {
        log(`Descargando ${a.name} (${a.nightName})…`);
        await client.downloadFile(a.driveId, localRawPath(slug, a));
    }
    return { slug, assets, downloaded: missing.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const taskId = parseArgs()._[0];
    if (!taskId) {
        console.error('Uso: npm run fetch-raw -- <taskId>');
        process.exit(1);
    }
    const r = await fetchRawForTask(taskId);
    log(`${r.downloaded} archivos descargados · ${r.assets.length} en total en content-dna/${r.slug}/raw/`);
}
