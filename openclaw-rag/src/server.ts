import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RagEngine } from './engine/RagEngine';

dotenv.config();

const app = express();
const PORT = process.env.OPENCLAW_RAG_PORT || 18791;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/rag/upsert', async (req, res) => {
    try {
        const { entityType, entityData, namespace } = req.body;
        await RagEngine.upsertEntity(entityType, entityData, namespace);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/rag/entity/:id', async (req, res) => {
    try {
        await RagEngine.deleteEntity(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/query', async (req, res) => {
    try {
        const { question, topK, historyContext, namespace } = req.body;
        const result = await RagEngine.query(question, topK || 5, historyContext, namespace);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/document', async (req, res) => {
    try {
        const { docId, title, content, category, extraMetadata, namespace } = req.body;
        const result = await RagEngine.indexCustomDocument(docId, title, content, category, extraMetadata || {}, namespace);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/youtube', async (req, res) => {
    try {
        const { url, title, category, namespace } = req.body;
        const result = await RagEngine.indexYouTubeVideo(url, title, category, namespace);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/obsidian', async (req, res) => {
    try {
        const { vaultPath, namespace } = req.body;
        const result = await RagEngine.indexObsidianVault(vaultPath, namespace);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/sync', async (req, res) => {
    try {
        const result = await RagEngine.indexAllData();
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/podcast', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Falta content' });
        const result = await RagEngine.generateDeepDivePodcast(content);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rag/brief', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Falta content' });
        const result = await RagEngine.generateStudyGuide(content);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rag/status', (req, res) => {
    try {
        const status = RagEngine.getStatus();
        res.json(status);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`[OpenClaw RAG] Engine running on http://localhost:${PORT}`);
});
