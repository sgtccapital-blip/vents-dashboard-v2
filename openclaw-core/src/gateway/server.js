import express from 'express';
import cors from 'cors';
import { config } from '../config.js';
import { dashboardChannel } from '../channels/DashboardChannel.js';
export function startGateway() {
    const app = express();
    app.use(cors());
    app.use(express.json());
    // Health check
    app.get('/', (req, res) => {
        res.send("OpenClaw Core Engine is Running");
    });
    // Mount Channel APIs
    app.use('/api/openclaw', dashboardChannel);
    // Endpoint directo solicitado por la arquitectura OpenClaw
    app.post('/api/agent-chat', async (req, res) => {
        try {
            const { agent, message, chatId } = req.body;
            if (!message) {
                return res.status(400).json({ error: "Missing message payload" });
            }
            // Reenvía el mensaje internamente a la instancia central de OpenClawAgent
            // IMPORTANTE: AgentManager frontend puede ahora usar fetch a esta URL
            const { OpenClawAgent } = await import('../agent/OpenClawAgent.js');
            const openClawInst = new OpenClawAgent();
            const reply = await openClawInst.processCommand(message);
            res.json({ reply, agent, chatId });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
    const PORT = config.PORT;
    app.listen(PORT, () => {
        console.log(`\n===========================================`);
        console.log(`🚀 OpenClaw Engine running on port ${PORT}`);
        console.log(`🧠 Memory: Pinecone [${config.PINECONE_INDEX}] connected`);
        console.log(`===========================================\n`);
    });
}
//# sourceMappingURL=server.js.map