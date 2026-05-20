import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export function delegateToAntigravity(markdownPayload: string) {
    try {
        const inboxDir = config.AGENT_INBOX_PATH;
        if (!fs.existsSync(inboxDir)) {
            fs.mkdirSync(inboxDir, { recursive: true });
        }
        const taskId = `task_${Date.now()}.md`;
        const taskPath = path.join(inboxDir, taskId);
        
        fs.writeFileSync(taskPath, markdownPayload, 'utf8');
        return `Task successfully delegated to Antigravity inbox: ${taskId}`;
    } catch (e: any) {
        console.error("Delegator error:", e);
        return `Failed to delegate task: ${e.message}`;
    }
}
