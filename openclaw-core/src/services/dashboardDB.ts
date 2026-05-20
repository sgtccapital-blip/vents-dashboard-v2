import fs from 'fs';
import path from 'path';
import { exec } from 'node:child_process';

const DB_PATH = path.join(import.meta.dirname, '../../../db.json');

export function getDashboardData() {
    try {
        if (!fs.existsSync(DB_PATH)) return {};
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("DB Error:", e);
        return {};
    }
}

export function updateDashboardData(newData: any) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(newData, null, 2), 'utf8');
        
        // Asynchronous non-blocking spawn to auto-reflect changes into BrainVault markdown files
        exec('node generate_brain_vault.cjs', { cwd: path.join(import.meta.dirname, '../../../') }, (error) => {
            if (error) {
                console.error(`[BrainVault Sync] Error sincronizando markdown desde agente: ${error.message}`);
            } else {
                console.log(`[BrainVault Sync] Markdown sincronizado correctamente desde agente.`);
            }
        });
        
        return true;
    } catch (e) {
        console.error("DB Update Error", e);
        return false;
    }
}
