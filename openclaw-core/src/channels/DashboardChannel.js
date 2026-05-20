import { Router } from 'express';
import { OpenClawAgent } from '../agent/OpenClawAgent.js';
import { updateDashboardData } from '../services/dashboardDB.js';
import fs from 'fs';
import path from 'path';
import { memory } from '../memory/vectorStore.js';
const router = Router();
const agent = new OpenClawAgent();
// ─── AGENT COMMUNICATION ────────────────────────────────────────
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }
        const reply = await agent.processCommand(message);
        res.json({ reply });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/chat/stream', async (req, res) => {
    const message = req.query.message;
    if (!message)
        return res.status(400).end("No message provided");
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    const writeEvent = (type, data) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
        writeEvent('thought', { message: 'Iniciando SuperBrain Agent...' });
        writeEvent('thought', { message: 'Sincronizando contexto del Dashboard GG y Base de Datos Vectorial...' });
        const reply = await agent.processCommand(message);
        writeEvent('reply', { reply });
        writeEvent('done', { status: 'complete' });
        res.end();
    }
    catch (e) {
        writeEvent('error', { message: e.message });
        res.end();
    }
});
router.post('/execute', (req, res) => {
    try {
        res.json({ success: true, message: "Use Antigravity or standard API for direct CRUD." });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/status', (req, res) => {
    res.json({ status: 'online', engine: 'OpenClaw Core (Typescript)', memory: 'Pinecone Vector Store Active' });
});
// ─── AGENT CONFIGURATION ────────────────────────────────────────
const SOUL_PATH = path.join(import.meta.dirname, '../../workspace/SOUL.md');
router.get('/config/soul', (req, res) => {
    try {
        if (fs.existsSync(SOUL_PATH)) {
            const content = fs.readFileSync(SOUL_PATH, 'utf-8');
            res.json({ content });
        }
        else {
            res.status(404).json({ error: "SOUL.md not found" });
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/config/soul', (req, res) => {
    try {
        const { content } = req.body;
        if (!content)
            return res.status(400).json({ error: "No content provided" });
        fs.writeFileSync(SOUL_PATH, content, 'utf-8');
        res.json({ success: true, message: "SOUL.md updated successfully" });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─── KNOWLEDGE INJECTION & AUDIT (PINECONE) ─────────────────────
router.post('/memory/add', async (req, res) => {
    try {
        const { text, metadata } = req.body;
        if (!text)
            return res.status(400).json({ error: "No text provided to inject" });
        // Force store into Pinecone
        await memory.storeMemory(text, metadata || { source: 'manual_injection' });
        res.json({ success: true, message: "Knowledge injected to Vector Store" });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/memory/query', async (req, res) => {
    try {
        const { query, topK } = req.body;
        if (!query)
            return res.status(400).json({ error: "No query provided" });
        // Force retrieve from Pinecone to audit
        const context = await memory.retrieveContext(query, topK || 5);
        res.json({ results: context });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
export const dashboardChannel = router;
//# sourceMappingURL=DashboardChannel.js.map