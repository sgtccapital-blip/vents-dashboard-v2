#!/usr/bin/env node
// Ejecutor de trabajos del Command Center (proceso aparte del servidor MCP).
// Uso: node scripts/arrive-runner.mjs [--root <carpeta agents-hub>] [--max <concurrentes>]
// No carga .env: los trabajos corren sin las llaves del dashboard.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunner } from '../src/services/agentHub/runner.js';
import { deploymentHandlers } from '../src/services/agentHub/deployments.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const root = path.resolve(arg('root') || process.env.AGENT_HUB_DIR || path.join(process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(here, '..'), 'agents-hub'));
const maxConcurrent = Number(arg('max') || process.env.RUNNER_MAX_CONCURRENT || 2);

// El registro lo edita el gateway: se lee fresco en cada trabajo.
const getWorkspace = id => {
    const list = JSON.parse(fs.readFileSync(path.join(root, 'workspaces.json'), 'utf8'));
    const ws = list.find(w => w.id === id);
    if (!ws || !ws.enabled) throw new Error(`Workspace ${id} no disponible`);
    return ws;
};

const runner = createRunner({ root, maxConcurrent, handlers: deploymentHandlers({ root, getWorkspace }) });
if (!runner.start()) process.exit(0);
console.log(`[arrive-runner] ${runner.runnerId} activo sobre ${root} (máx. ${maxConcurrent} trabajos a la vez)`);

let stopping = false;
const shutdown = async sig => {
    if (stopping) return;
    stopping = true;
    console.log(`[arrive-runner] ${sig}: esperando a los trabajos en curso…`);
    await runner.stop({ kill: sig === 'SIGINT' });
    process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
