import fs from 'fs';
import path from 'path';
import RAGEngine from './src/services/ragEngine.js';

const dirs = [
    '/Users/gg/.openclaw/workspace/proyectos/saem',
    '/Users/gg/.openclaw/workspace/proyectos/konekta-labs',
    '/Users/gg/.openclaw/workspace/proyectos/recordai'
];

async function injectAll() {
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.sql'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            await RAGEngine.indexCustomDocument(
                `openclaw-intel-${file}`,
                `Reporte OpenClaw: ${file}`,
                content,
                'research'
            );
        }
    }
}
injectAll();
