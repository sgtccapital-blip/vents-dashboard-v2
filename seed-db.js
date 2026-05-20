/**
 * Seed Script — Genera db.json a partir de seedData.js
 * Uso: node seed-db.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar seedData directamente
import {
    seedProjects,
    seedIdeas,
    seedAgents,
    seedSocialMedia,
    seedContentTasks,
    seedTasks,
    seedNotes,
    seedSubscriptions,
    seedCompanies
} from './src/lib/seedData.js';

const db = {
    agents: seedAgents,
    projects: seedProjects,
    companies: seedCompanies,
    tasks: seedTasks,
    notes: seedNotes,
    ideas: seedIdeas,
    subscriptions: seedSubscriptions,
    socialMedia: seedSocialMedia,
    contentTasks: seedContentTasks,
    activityFeed: []
};

const output = path.join(__dirname, 'db.json');
fs.writeFileSync(output, JSON.stringify(db, null, 2), 'utf-8');
console.log(`✅ db.json created with ${Object.keys(db).length} collections at ${output}`);
Object.entries(db).forEach(([key, val]) => {
    console.log(`   ${key}: ${Array.isArray(val) ? val.length + ' items' : typeof val}`);
});
