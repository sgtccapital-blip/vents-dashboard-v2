/**
 * Seed Script — Genera db.json y db.seed.json a partir de seedData.js
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
    seedSocialMedia,
    seedContentTasks,
    seedTasks,
    seedNotes,
    seedSubscriptions,
    seedCompanies,
    seedEvents,
    seedContacts,
    seedDecisionLog,
    seedPortfolioRoadmap,
    seedWhatsAppGroups,
    seedPromoters,
    seedImageGirls
} from './src/lib/seedData.js';

const defaultAgents = [
    {
        id: "agent-openclaw-super",
        name: "OpenClaw Super Agent",
        role: "Chief Automation & Executive Copilot",
        status: "active",
        skills: ["gemini-3.5-flash-lite", "tool_calling", "rag_search", "database_sync", "project_manager", "task_orchestrator"]
    },
    {
        id: "agent-pulse",
        name: "Pulse (WhatsApp & Community)",
        role: "Community Lead & VIP Relations",
        status: "active",
        skills: ["whatsapp_broadcast", "vip_dinner_invites", "promoter_tracking"]
    },
    {
        id: "agent-licitia",
        name: "LicitIA Scout",
        role: "Procurement & Bidding Intelligence",
        status: "active",
        skills: ["panamacompra_scraping", "tender_evaluation", "proposal_drafting"]
    }
];

export function getInitialDBState() {
    return {
        agents: defaultAgents,
        projects: seedProjects || [],
        companies: seedCompanies || [],
        events: seedEvents || [],
        tasks: seedTasks || [],
        notes: seedNotes || [],
        ideas: seedIdeas || [],
        subscriptions: seedSubscriptions || [],
        socialMedia: seedSocialMedia || [],
        contentTasks: seedContentTasks || {},
        contacts: seedContacts || [],
        decisionLog: seedDecisionLog || [],
        roadmap: seedPortfolioRoadmap || [],
        whatsappGroups: seedWhatsAppGroups || [],
        promoters: seedPromoters || [],
        imageGirls: seedImageGirls || [],
        agentTasks: [],
        agentMemory: [],
        agentKPIs: [],
        circuitBreakers: [],
        activityFeed: [],
        orders: [],
        ragStore: []
    };
}

const db = getInitialDBState();

const output = path.join(__dirname, 'db.json');
const seedOutput = path.join(__dirname, 'db.seed.json');

fs.writeFileSync(output, JSON.stringify(db, null, 2), 'utf-8');
fs.writeFileSync(seedOutput, JSON.stringify(db, null, 2), 'utf-8');

console.log(`✅ Base de datos inicial generada en ${output} y ${seedOutput}`);
Object.entries(db).forEach(([key, val]) => {
    console.log(`   ${key}: ${Array.isArray(val) ? val.length + ' items' : typeof val}`);
});
