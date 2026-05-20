import { getDashboardData, updateDashboardData } from '../services/dashboardDB.js';
import { Type } from '@google/genai';
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import puppeteer from 'puppeteer';

// The tools array conforming to FunctionDeclarations in Gemini SDK
export const agentTools = [
  {
    functionDeclarations: [
      {
        name: 'updateProjectStatus',
        description: 'Updates the status or priority of a specific project.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectId: { type: Type.STRING, description: 'The ID of the project to update (e.g. proj-2)' },
            status: { type: Type.STRING, description: 'New status (active, paused, completed)' },
            priority: { type: Type.STRING, description: 'New priority (low, medium, high, critical)' }
          },
          required: ['projectId']
        }
      },
      {
        name: 'addActivityLog',
        description: 'Adds a log entry or message to a projects activityLog. Use this to report proactive updates or record actions.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectId: { type: Type.STRING, description: 'The ID of the project.' },
            text: { type: Type.STRING, description: 'The message or update text.' },
            type: { type: Type.STRING, description: 'Type of log: update, completed, delegation, status.' }
          },
          required: ['projectId', 'text']
        }
      },
      {
        name: 'runTerminalCommand',
        description: 'GOD MODE: Executa un comando de la Terminal en el OS nativo. Use esto para correr scripts, instalar dependencias, git, comandos de sistema, interactuar con APIs externas mediante curl, consultar status, etc.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: 'The command to execute (e.g., "npm install", "git status", "mkdir test", "ls -l").' }
          },
          required: ['command']
        }
      },
      {
        name: 'readFile',
        description: 'Lee el contenido de un archivo del disco local usando una ruta absoluta o relativa.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: 'Path to the file to be read.' }
          },
          required: ['filePath']
        }
      },
      {
        name: 'writeToFile',
        description: 'Escribe contenido en un archivo local. Si no existe, lo crea. Si existe, lo sobrescribe. Ideal para crear scripts y agentes pequeños.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: 'Path where the file should be written.' },
            content: { type: Type.STRING, description: 'The string content to write.' }
          },
          required: ['filePath', 'content']
        }
      },
      {
        name: 'readURLContent',
        description: 'Realiza un GET HTTP a una URL y trae el contenido crudo (útil para scrapear JSONs, leer código web de github, investigar a la competencia).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: 'The URL to fetch.' }
          },
          required: ['url']
        }
      },
      {
        name: 'searchWeb',
        description: 'Realiza una búsqueda rápida en la web (similar a Google) y obtiene un resumen de los resultados cuando necesitas averiguar información como "mejores empresas", "noticias", etc. ¡Usa esto en lugar de delegar! ¡Usa esto si te piden buscar o investigar!',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'La consulta de búsqueda, ej. "mejores empresas tecnologia panama"' }
          },
          required: ['query']
        }
      },
      {
        name: 'delegateTaskToAgent',
        description: '[USO RESTRINGIDO] Delega una tarea a otro sub-agente. PELIGRO: ÚSAR SOLO SI el usuario explícitamente lo pide (ej. "delega a nexus"). NUNCA uses esto para investigar por tu cuenta; si el usuario te pide investigar, usa searchWeb tú mismo.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            agentId: { type: Type.STRING, description: 'ID of the target agent (nexus, atlas, echo, closer_ops).' },
            taskDescription: { type: Type.STRING, description: 'Instrucciones precisas para la tarea delegada.' },
            priorityScore: { type: Type.NUMBER, description: 'Nivel de prioridad de 1 a 100.'}
          },
          required: ['agentId', 'taskDescription']
        }
      },
      {
        name: 'browseAndScrapeWeb',
        description: 'Navega a un sitio web de forma real (con Puppeteer) esperando que cargue el JavaScript para scrapear su contenido de texto visible. Usa esto si readURLContent falla o el sitio requiere renderizado (React/Vue/JS).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: 'The URL to browse and scrape.' },
            waitForSelector: { type: Type.STRING, description: 'Optional CSS selector to wait for before scraping (e.g. main).' }
          },
          required: ['url']
        }
      },
      {
        name: 'exploreGoogleWorkspace',
        description: 'Explora y lee los archivos montados localmente en el disco de Google Drive (Google Workspace). Puede listar carpetas o leer archivos de texto plano.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: 'list (para ver el contenido de una carpeta) o read (para leer el texto de un archivo)' },
            targetPath: { type: Type.STRING, description: 'Ruta relativa empezando desde la raiz de My Drive, por ejemplo: "", "Documentos", o "Documentos/notas.txt"' }
          },
          required: ['action', 'targetPath']
        }
      },
      {
        name: 'automateLocalChrome',
        description: 'Abre visiblemente la app nativa de Google Chrome en la Mac para interactuar físicamente (clicks, formularios, logins) inyectando código de Puppeteer. El browser arranca en headless: false.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING, description: 'Código Javascript asíncrono para Puppeteer. Tienes acceso a variables `browser` y `page`. Inicia directo: await page.goto(...)' }
          },
          required: ['script']
        }
      },
      {
        name: 'saveToBrainVault',
        description: 'NOTEBOOK LM: Crea o actualiza un documento en el Obsidian BrainVault para guardar conocimiento nuevo, resúmenes, reportes de investigación o esquemas de presentación. Genera el documento y avisa al sistema RAG para indexarlo en tiempo real.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Título del documento o nota (sin la extensión .md). Ejemplo: "Resumen_Proyecto_Alpha"' },
            content: { type: Type.STRING, description: 'Contenido completo en formato Markdown del documento.' },
            folder: { type: Type.STRING, description: 'Subcarpeta destino en el Vault (ej. INCUBATOR, ARSENAL, OPERATIONS). Default: INCUBATOR' }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'compileStudyGuide',
        description: 'NOTEBOOK LM: Lee un contenido masivo o documento y extrae un Briefing/Study Guide ultra estructurdo (Resumen, Conceptos Clave, Timeline y FAQ). El resultado es devuelto como JSON crudo para que lo formatees en texto y lo guardes.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: 'El contenido RAW o gran cantidad de texto de donde se debe generar la guia profunda.' }
          },
          required: ['content']
        }
      },
      {
        name: 'compilePodcastScript',
        description: 'NOTEBOOK LM: Lee un contenido masivo o nota y genera un Script estilo "Deep Dive" de podcast de 2 presentadores (Ana y Carlos). Utiliza multi-prompting en el RAG para construir episodios de podcast muy entretenidos e inmersivos.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: 'El texto de origen o notas a partir del cual crear el guion.' }
          },
          required: ['content']
        }

      },
      {
        name: 'listDir',
        description: 'Enumera todos los archivos y subdirectorios de una ruta específica.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            directoryPath: { type: Type.STRING, description: 'Ruta absoluta o relativa del directorio.' }
          },
          required: ['directoryPath']
        }
      },
      {
        name: 'replaceInFile',
        description: 'Edita un archivo existente reemplazando un bloque de texto exacto. Usa esto para editar código de forma precisa. Asegúrate de incluir espacios e interlineados exactos en targetContent.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: 'The target file to modify.' },
            targetContent: { type: Type.STRING, description: 'The exact string to be replaced.' },
            replacementContent: { type: Type.STRING, description: 'The content to replace the target content with.' }
          },
          required: ['filePath', 'targetContent', 'replacementContent']
        }
      },
      {
        name: 'grepSearch',
        description: 'Busca una cadena de texto en un archivo o directorio usando comandos del sistema base.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            searchPath: { type: Type.STRING, description: 'The directory or file path to search in.' },
            query: { type: Type.STRING, description: 'The search term to look for.' },
            includes: { type: Type.STRING, description: 'Optional. Glob filter for file types, e.g., "*.ts" or "*.js". Leave empty to search all files.' }
          },
          required: ['searchPath', 'query']
        }
      }
    ]
  }
];

export async function executeTool(callName: string, args: any): Promise<string> {
    console.log(`[Tool Executor] Running ${callName} with args:`, args);
    try {
        const db = getDashboardData();
        
        if (callName === 'updateProjectStatus') {
            const project = db.projects?.find((p: any) => p.id === args.projectId);
            if (!project) return `Project ${args.projectId} not found.`;
            if (args.status) project.status = args.status;
            if (args.priority) project.priority = args.priority;
            updateDashboardData(db);
            return `Project ${args.projectId} successfully updated.`;
        }
        
        if (callName === 'addActivityLog') {
            const project = db.projects?.find((p: any) => p.id === args.projectId);
            if (!project) return `Project ${args.projectId} not found.`;
            if (!project.activityLog) project.activityLog = [];
            project.activityLog.push({
                id: `log-${Date.now()}`,
                text: args.text,
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                type: args.type || 'update'
            });
            updateDashboardData(db);
            return `Activity log added to project ${args.projectId}.`;
        }

        if (callName === 'delegateTaskToAgent') {
            if (!db.agentTasks) db.agentTasks = [];
            const taskId = `task-${Date.now()}`;
            db.agentTasks.push({
                id: taskId,
                task: args.taskDescription,
                assignedTo: args.agentId,
                priorityScore: args.priorityScore || 50,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            
            if (!db.activityFeed) db.activityFeed = [];
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🤝 Bart delegó a ${args.agentId}: "${args.taskDescription}"`,
                color: '#f59e0b',
                timestamp: new Date().toISOString()
            });
            db.activityFeed = db.activityFeed.slice(0, 50);
            
            updateDashboardData(db);
            return `Task ${taskId} delegated successfully to ${args.agentId}. They will see it in their queue.`;
        }

        // Omni-Suite Handlers
        if (callName === 'runTerminalCommand') {
            console.log(`[Omni] Executing command: ${args.command}`);
            try {
                const out = child_process.execSync(args.command, { encoding: 'utf-8', timeout: 30000 });
                return out.slice(0, 10000); 
            } catch(e: any) {
                return `Error executing command: ${e.message}\nSTDOUT: ${e.stdout}\nSTDERR: ${e.stderr}`;
            }
        }

        if (callName === 'readFile') {
            try {
                const out = fs.readFileSync(path.resolve(args.filePath), 'utf-8');
                return out.slice(0, 15000); 
            } catch(e: any) {
                return `Error reading file: ${e.message}`;
            }
        }

        if (callName === 'writeToFile') {
            try {
                const dir = path.dirname(path.resolve(args.filePath));
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                
                fs.writeFileSync(path.resolve(args.filePath), args.content, 'utf-8');
                return `Successfully wrote absolute file at ${path.resolve(args.filePath)}`;
            } catch(e: any) {
                return `Error writing file: ${e.message}`;
            }
        }

        if (callName === 'listDir') {
            try {
                const target = path.resolve(args.directoryPath);
                if (!fs.existsSync(target)) return `Directory not found: ${target}`;
                const items = fs.readdirSync(target, { withFileTypes: true });
                const list = items.map(i => `${i.isDirectory() ? '[DIR]' : '[FILE]'} ${i.name}`).join('\n');
                return `Directory contents of ${target}:\n${list}`;
            } catch(e: any) {
                return `Error listing directory: ${e.message}`;
            }
        }

        if (callName === 'replaceInFile') {
            try {
                const target = path.resolve(args.filePath);
                if (!fs.existsSync(target)) return `File not found: ${target}`;
                const originalContent = fs.readFileSync(target, 'utf-8');
                if (!originalContent.includes(args.targetContent)) {
                    return `Error: targetContent no se encontró exactamente como fue provisto en el archivo. Verifica los espacios y saltos de línea.`;
                }
                const newContent = originalContent.replace(args.targetContent, args.replacementContent);
                fs.writeFileSync(target, newContent, 'utf-8');
                return `Successfully replaced content in ${target}`;
            } catch(e: any) {
                return `Error replacing file content: ${e.message}`;
            }
        }

        if (callName === 'grepSearch') {
            try {
                const target = path.resolve(args.searchPath);
                const includeFlag = args.includes ? `--include="${args.includes}"` : '';
                const cmd = `grep -rn ${includeFlag} "${args.query.replace(/"/g, '\\"')}" "${target}"`;
                const out = child_process.execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
                return out.slice(0, 15000) || 'No matches found.';
            } catch(e: any) {
                if (e.status === 1) return 'No matches found.';
                return `Error executing grep: ${e.message}`;
            }
        }

        if (callName === 'readURLContent') {
            try {
                const res = await fetch(args.url);
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                const text = await res.text();
                return text.slice(0, 15000); 
            } catch(e: any) {
                return `Error fetching URL: ${e.message}`;
            }
        }

        if (callName === 'searchWeb') {
            try {
                const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
                const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
                const text = await res.text();
                // Extremely basic extraction of results to save tokens
                const matches = text.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi) || [];
                const stripped = matches.map(m => m.replace(/<[^>]*>?/gm, '')).slice(0, 5).join('\n---\n');
                return stripped ? `Resultados de búsqueda:\n${stripped}` : 'No se encontraron resultados fáciles. Intenta otra query o usa automateLocalChrome.';
            } catch(e: any) {
                return `Error searching the web: ${e.message}`;
            }
        }

        if (callName === 'browseAndScrapeWeb') {
            console.log(`[Omni] Browsing URL via Puppeteer: ${args.url}`);
            try {
                const browser = await puppeteer.launch({ headless: true });
                const page = await browser.newPage();
                await page.goto(args.url, { waitUntil: 'networkidle2', timeout: 60000 });
                if (args.waitForSelector) {
                    await page.waitForSelector(args.waitForSelector, { timeout: 10000 }).catch(() => {});
                }
                const content = await page.evaluate(() => document.body.innerText || document.documentElement.innerText);
                await browser.close();
                return content.slice(0, 20000); 
            } catch(e: any) {
                return `Error browsing with Puppeteer: ${e.message}`;
            }
        }

        if (callName === 'exploreGoogleWorkspace') {
            const rootDrivePath = '/Users/gg/Google Drive/My Drive';
            const fullPath = path.join(rootDrivePath, args.targetPath);
            try {
                if (!fs.existsSync(fullPath)) {
                     return `Ruta no encontrada en Drive: ${fullPath}`;
                }
                if (args.action === 'list') {
                    const items = fs.readdirSync(fullPath, { withFileTypes: true });
                    const listStr = items.map(i => `${i.isDirectory() ? '[DIR]' : '[FILE]'} ${i.name}`).join('\\n');
                    return `Contenido de Google Drive -> My Drive/${args.targetPath}:\\n${listStr || 'Carpeta vacía'}`;
                } else if (args.action === 'read') {
                    const out = fs.readFileSync(fullPath, 'utf-8');
                    return out.slice(0, 15000); 
                } else {
                    return `Unknown action: ${args.action}`;
                }
            } catch(e: any) {
                return `Error accessing Google Workspace: ${e.message}`;
            }
        }

        if (callName === 'automateLocalChrome') {
            console.log(`[Omni] Launching visible local Chrome...`);
            const scriptPath = path.join(import.meta.dirname, 'temp_chrome_script.js');
            const scriptContent = `
import puppeteer from 'puppeteer';
(async () => {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        });
        const page = await browser.newPage();
        
        // --- SCRIPT EMPIEZA ---
        ${args.script}
        // --- SCRIPT TERMINA ---
        
        await browser.close();
        process.exit(0);
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
})();
`;
            fs.writeFileSync(scriptPath, scriptContent);
            try {
                // tsx runs esm imports easily
                const out = child_process.execSync(`npx tsx "${scriptPath}"`, { encoding: 'utf-8', timeout: 120000 });
                return `Éxito al automatizar Chrome.\\nOutput:\\n${out}`;
            } catch(e: any) {
                return `Error en control de Chrome: ${e.message}\\nSTDOUT: ${e.stdout}\\nSTDERR: ${e.stderr}`;
            }
        }

        if (callName === 'saveToBrainVault') {
            try {
                const folder = args.folder || 'INCUBATOR';
                const vaultRoot = path.resolve(import.meta.dirname, '../../../BrainVault');
                const targetFolder = path.join(vaultRoot, folder);
                
                if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
                
                const filePath = path.join(targetFolder, `${args.title}.md`);
                fs.writeFileSync(filePath, args.content, 'utf-8');
                
                // Ping RAG service to re-index immediately
                fetch('http://localhost:18791/api/rag/obsidian', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vaultPath: targetFolder })
                }).catch(err => console.error('[saveToBrainVault] Error notifying RAG:', err.message));

                return `NOTA GUARDADA EXITOSAMENTE EN ${folder}/${args.title}.md y enviada a indexar en el cerebro RAG (Pinecone).`;
            } catch(e: any) {
                return `Error saving to BrainVault: ${e.message}`;
            }
        }

        if (callName === 'compileStudyGuide') {
            try {
                const res = await fetch('http://localhost:18791/api/rag/brief', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: args.content })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                const data = await res.json();
                return JSON.stringify(data, null, 2);
            } catch(e: any) {
                return `Error delegando la tarea al RAG (Brief): ${e.message}`;
            }
        }

        if (callName === 'compilePodcastScript') {
            try {
                const res = await fetch('http://localhost:18791/api/rag/podcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: args.content })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                const data = await res.json();
                return JSON.stringify(data, null, 2);
            } catch(e: any) {
                return `Error delegando la tarea al RAG (Podcast): ${e.message}`;
            }
        }

        return `Unknown tool: ${callName}`;
    } catch (e: any) {
        return `Tool Execution Error: ${e.message}`;
    }
}
