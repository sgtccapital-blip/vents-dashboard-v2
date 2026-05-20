import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
const pc = new Pinecone({
    apiKey: config.PINECONE_API_KEY
});
// Since @google/genai requires initializing the client
const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
const indexName = config.PINECONE_INDEX;
export class VectorStore {
    index;
    constructor() {
        this.index = pc.Index(indexName);
    }
    /**
     * Retrieves context from Pinecone based on the query.
     */
    async retrieveContext(query, topK = 3) {
        try {
            if (!config.PINECONE_API_KEY) {
                return "Pinecone API Key not configured. Using local memory only.";
            }
            // Get embeddings for the query
            const embedResponse = await ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: query
            });
            const embedding = embedResponse.embeddings?.[0]?.values;
            if (!embedding)
                return "";
            const queryResult = await this.index.query({
                vector: embedding,
                topK,
                includeMetadata: true
            });
            return queryResult.matches
                ?.map((m) => m.metadata?.text || m.metadata?.content || '')
                .join('\n\n') || '';
        }
        catch (error) {
            console.error("VectorStore Error:", error);
            return "Memory retrieval failed.";
        }
    }
    /**
     * Stores a conversation or information in Pinecone for long term memory.
     */
    async storeMemory(text, metadata = {}) {
        try {
            if (!config.PINECONE_API_KEY)
                return;
            const embedResponse = await ai.models.embedContent({
                model: 'gemini-embedding-001', // Using a correct embedding model
                contents: text
            });
            const embedding = embedResponse.embeddings?.[0]?.values;
            if (!embedding)
                return;
            const { v4: uuidv4 } = await import('uuid');
            await this.index.upsert([{
                    id: uuidv4(),
                    values: embedding,
                    metadata: {
                        text,
                        ...metadata,
                        timestamp: new Date().toISOString()
                    }
                }]);
        }
        catch (error) {
            console.error("VectorStore Memory Storage Error:", error);
        }
    }
    /**
     * Captures a snapshot of the Dashboard DB and forces it into long-term Episodic Memory.
     */
    async syncDashboardSnapshot() {
        try {
            const { getDashboardData } = await import('../services/dashboardDB.js');
            const db = getDashboardData();
            let snapshotText = "DASHBOARD SNAPSHOT:\n";
            snapshotText += `Total Projects: ${db.projects?.length || 0}\n`;
            db.projects?.forEach((p) => {
                snapshotText += `Project '${p.name}' (ID: ${p.id}) is ${p.status} with ${p.priority} priority. Tasks length: ${p.tasks?.length || 0}.\n`;
            });
            console.log("[VectorStore] Syncing dashboard snapshot to Episodic Memory...");
            await this.storeMemory(snapshotText, { type: 'episodic_snapshot', source: 'system_cron' });
        }
        catch (e) {
            console.error("Failed to sync snapshot to DB:", e);
        }
    }
}
export const memory = new VectorStore();
//# sourceMappingURL=vectorStore.js.map