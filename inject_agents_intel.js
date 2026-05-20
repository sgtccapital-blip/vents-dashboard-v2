import fs from 'fs';
import path from 'path';
import RAGEngine from './src/services/ragEngine.js';

const intelDir = '/Users/gg/.openclaw/workspace/proyectos/novatech';

async function injectIntel() {
    console.log("Inyectando data de OpenClaw al RAG Brain...");

    const files = fs.readdirSync(intelDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
        const filePath = path.join(intelDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const docId = `openclaw-intel-${file}`;
        
        console.log(`Indexando ${file}...`);
        
        try {
            await RAGEngine.indexCustomDocument(
                docId, 
                `Reporte OpenClaw: ${file}`, 
                content, 
                'research'
            );
            console.log(`✅ ${file} indexado correctamente en el cerebro.`);
        } catch (error) {
            console.error(`❌ Error indexando ${file}:`, error.message);
        }
    }
    
    console.log("¡Inyección completa! El RAG Brain ahora tiene todo el contexto de NovaTech generado por los agentes.");
}

injectIntel();