import { OpenClawAgent } from '../agent/OpenClawAgent.js';
export function startProactiveManager() {
    console.log("[ProactiveManager] Starting proactive background process...");
    const agent = new OpenClawAgent();
    // Run every 1 minute for testing purposes as discussed
    setInterval(async () => {
        try {
            console.log("[ProactiveManager] Awakening Agent for routine checks...");
            // Periodically sync db.json snapshot to Pinecone Memory
            const { memory } = await import('../memory/vectorStore.js');
            await memory.syncDashboardSnapshot();
            // Silent prompt forcing the agent to evaluate the database and use log tool if needed
            const silentPrompt = `[INTERNAL SYSTEM CRON] Haz un escaneo rápido del estado de los proyectos y las métricas. Si encuentras un retraso, prioridad crítica, o algo que valga la pena reportar inmediatamente al COO, usa la herramienta 'addActivityLog' para inyectar un mensaje de alerta en ese proyecto. Si todo está normal, no llames ninguna herramienta y responde 'Todo en orden'. Asegúrate de usar las herramientas de forma proactiva.`;
            await agent.processCommand(silentPrompt);
            console.log("[ProactiveManager] Routine check complete.");
        }
        catch (e) {
            console.error("[ProactiveManager] Error during routine check:", e);
        }
    }, 60 * 1000);
}
//# sourceMappingURL=proactiveManager.js.map