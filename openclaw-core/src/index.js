import { startGateway } from './gateway/server.js';
import { startProactiveManager } from './cron/proactiveManager.js';
console.log("Initializing OpenClaw Core Engine...");
startGateway();
startProactiveManager();
//# sourceMappingURL=index.js.map