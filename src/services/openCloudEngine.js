import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'db.json');

function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) return {};
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (e) {
        console.error('[OpenCloudEngine] Error reading DB:', e.message);
        return {};
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('[OpenCloudEngine] Error writing DB:', e.message);
    }
}


// ─── Intent Detection (deterministic, no LLM needed) ───────────
const TASK_PATTERNS = [
    /(?:agregar|crear|añadir|nueva?|montar|hacer|armar|programar)\s+(?:una?\s+)?(?:tarea|task)/i,
    /(?:tarea|task)\s*(?:para|de|:)\s*/i,
    /(?:agregar|crear|añadir|montar|hacer|armar)\s+(?:para|de|:)?\s*(?:.*)/i,
    /vamos\s+a\s+(?:agregar|crear|montar|hacer)/i,
    /(?:hay que|necesito|quiero)\s+(?:crear|montar|hacer|agregar)/i,
];

const DELETE_PATTERNS = [
    /(?:eliminar|borrar|quitar|remover)\s+(?:la?\s+)?tarea/i,
    /(?:delete|remove)\s+task/i,
];

const STATUS_PATTERNS = [
    /(?:estado|status|cómo va|como va|qué hay|que hay|resumen)/i,
    /(?:tareas pendientes|pending tasks)/i,
];

const GREETING_PATTERNS = [
    /^(?:hola|hey|buenas|qué tal|que tal|saludos|hello|hi|sup)\s*[!?.]*$/i,
];

function detectIntent(prompt) {
    const trimmed = prompt.trim();
    
    if (GREETING_PATTERNS.some(p => p.test(trimmed))) return 'GREETING';
    if (DELETE_PATTERNS.some(p => p.test(trimmed))) return 'DELETE_TASK';
    if (TASK_PATTERNS.some(p => p.test(trimmed))) return 'CREATE_TASK';
    if (STATUS_PATTERNS.some(p => p.test(trimmed))) return 'STATUS';
    
    // If it contains action verbs + noun, treat as task creation
    if (/(?:montar|crear|hacer|armar|diseñar|desarrollar|configurar|instalar|lanzar|preparar)\s+.{5,}/i.test(trimmed)) {
        return 'CREATE_TASK';
    }
    
    return 'CHAT';
}

function extractTaskText(prompt) {
    // Remove command prefixes
    let text = prompt
        .replace(/^(?:vamos\s+a\s+)?(?:agregar|crear|añadir|nueva?)\s+(?:una?\s+)?(?:tarea|task)\s*(?:para|de|:)?\s*/i, '')
        .replace(/^(?:hay que|necesito|quiero)\s+/i, '')
        .trim();
    
    // If the cleaned text is too short, use the original prompt
    if (text.length < 5) text = prompt.trim();
    
    // Capitalize first letter
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── Main Engine ────────────────────────────────────────────────
class OpenCloudEngine {
    async executeOrchestration(prompt, ragEngine, historyContext = []) {
        console.log(`[OpenCloudEngine] Processing: "${prompt}"`);
        
        const intent = detectIntent(prompt);
        console.log(`[OpenCloudEngine] Intent: ${intent}`);
        
        const db = readDB();
        const today = new Date().toISOString().split('T')[0];
        
        switch (intent) {
            case 'CREATE_TASK': {
                const taskText = extractTaskText(prompt);
                const taskId = `task-${Date.now()}`;
                
                const newTask = {
                    id: taskId,
                    text: taskText,
                    done: false,
                    status: 'active',
                    priority: 'high',
                    project: 'General',
                    due: today,
                    createdAt: new Date().toISOString(),
                };
                
                if (!db.tasks) db.tasks = [];
                db.tasks.push(newTask);
                
                // Activity feed
                if (!db.activityFeed) db.activityFeed = [];
                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    text: `🤖 [OpenCloud AI] Tarea creada: "${taskText}"`,
                    color: '#10b981',
                    source: 'opencloud-ai'
                });
                db.activityFeed = db.activityFeed.slice(0, 50);
                
                writeDB(db);
                console.log(`[OpenCloudEngine] ✅ Task created: ${taskId}`);
                
                return {
                    type: 'ACTION_EXECUTED',
                    message: `✅ Tarea creada exitosamente.\n\n📋 **"${taskText}"**\n⚡ Prioridad: Alta\n📅 Fecha: ${today}`,
                    actionDetails: [`✅ Tarea creada: "${taskText}"`],
                };
            }
            
            case 'DELETE_TASK': {
                return {
                    type: 'REPLY',
                    message: '🗑️ Para eliminar una tarea, dime el nombre o ID de la tarea que quieres eliminar.',
                    actionDetails: [],
                };
            }
            
            case 'STATUS': {
                const pendingTasks = (db.tasks || []).filter(t => !t.done);
                const completedTasks = (db.tasks || []).filter(t => t.done);
                
                let statusMsg = `📊 **Estado del Dashboard**\n\n`;
                statusMsg += `📋 Tareas pendientes: ${pendingTasks.length}\n`;
                statusMsg += `✅ Tareas completadas: ${completedTasks.length}\n`;
                
                if (pendingTasks.length > 0) {
                    statusMsg += `\n📌 **Tareas activas:**\n`;
                    pendingTasks.slice(0, 5).forEach(t => {
                        statusMsg += `  • "${t.text}"\n`;
                    });
                    if (pendingTasks.length > 5) statusMsg += `  ... y ${pendingTasks.length - 5} más.\n`;
                }
                
                return {
                    type: 'REPLY',
                    message: statusMsg,
                    actionDetails: [],
                };
            }
            
            case 'GREETING': {
                const pendingCount = (db.tasks || []).filter(t => !t.done).length;
                return {
                    type: 'REPLY',
                    message: `¡Hola! 👋 Soy OpenCloud AI, tu orquestador empresarial.\n\nTienes ${pendingCount} tareas pendientes. ¿Qué necesitas?\n\nPuedo:\n• Crear tareas\n• Mostrarte el estado del dashboard\n• Gestionar proyectos y empresas`,
                    actionDetails: [],
                };
            }
            
            default: {
                return {
                    type: 'REPLY',
                    message: `Entendido. Si necesitas que ejecute algo, puedo:\n• **Crear tareas**: "agregar tarea para montar web de Sabores Panama"\n• **Ver estado**: "estado" o "tareas pendientes"`,
                    actionDetails: [],
                };
            }
        }
    }
}

export default new OpenCloudEngine();
