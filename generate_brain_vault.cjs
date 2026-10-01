const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');
const VAULT_DIR = process.env.BRAIN_VAULT_DIR || path.join(__dirname, 'BrainVault');

let db = {};
try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
} catch (e) {
    console.warn('[BrainVault Generator] Warning leyendo db.json:', e.message);
}

const sections = [
    { name: 'OPERATIONS' },
    { name: 'ARSENAL' },
    { name: 'INCUBATOR' },
    { name: 'PERSONAL' }
];

// Ensure directories exist
if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR);
sections.forEach(sec => {
    const dirPath = path.join(VAULT_DIR, sec.name);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
});

function writeFile(folder, filename, content) {
    fs.writeFileSync(path.join(VAULT_DIR, folder, `${filename}.md`), content);
}

// 1. OPERATIONS
writeFile('OPERATIONS', 'CommandCenter', 
`# Command Center
Aquí reside la visión global de la orquestación del sistema.
Modo de Guerra: Activo focalizado en Cashflow y Operaciones.
`);

writeFile('OPERATIONS', 'Workspace', 
`# Workspace
Espacio de trabajo general y notas.
${(db.notes && db.notes.length > 0) 
    ? db.notes.map(n => `\n## ${n.title || 'Nota'}\n${n.content || n.text || ''}\nTags: ${(n.tags || []).join(', ')}\n`).join('')
    : '\n*No hay notas adicionales registradas en el workspace.*\n'}
`);

writeFile('OPERATIONS', 'Empresas', 
`# Empresas y Clientes
Lista completa de empresas en la red.
${(db.companies && db.companies.length > 0)
    ? db.companies.map(c => `\n## ${c.name || 'Empresa'}\nEstado: ${c.status || 'Activa'}\nDescripción: ${c.description || 'Información operativa en curso.'}\n`).join('')
    : '\n*No hay empresas registradas en la base local.*\n'}
`);

writeFile('OPERATIONS', 'Projects', 
`# Proyectos y Tareas
Lista de proyectos activos y sus tareas.
${(db.projects && db.projects.length > 0)
    ? db.projects.map(p => {
        const pTasks = (db.tasks || []).filter(t => t.projectId === p.id);
        return `\n## Proyecto: ${p.name || p.title || 'Proyecto'}\nPrioridad: ${p.priority || 'media'} | Estado: ${p.status || 'activo'}\nDescripción: ${p.description || 'Sin descripción'}\nTareas:\n${pTasks.length > 0 ? pTasks.map(t => `- [${t.done || t.status === 'done' ? 'x' : ' '}] ${t.text || t.title || 'Tarea'} (${t.assignedTo || t.assignee || 'Sin asignar'})`).join('\n') : '- Sin tareas pendientes'}\n`;
    }).join('')
    : '\n*No hay proyectos registrados.*\n'}
`);

writeFile('OPERATIONS', 'VenuesAndEvents', 
`# Venues & Cartelera de Eventos
Control de locales nocturnos (Terraplén, Furia, Piano Bar) y activaciones.
${(db.events && db.events.length > 0)
    ? db.events.map(e => `\n## ${e.name || 'Evento'}\nFecha: ${e.date || 'Por definir'} | Estado: ${e.status || 'planning'}\nUbicación/Venue: ${e.location || 'Casco Antiguo'}\nPresupuesto: $${e.budget || e.estimatedBudget || '0'}\nDescripción: ${e.description || 'Detalles del evento'}\n`).join('')
    : '\n*No hay eventos agendados.*\n'}
`);

// 2. ARSENAL
writeFile('ARSENAL', 'AgentManager', 
`# Agent Manager
Aquí se definen las capacidades de cada agente de IA.
${(db.agents && db.agents.length > 0)
    ? db.agents.map(a => `\n## Agente: ${a.name || 'Agente'} (${a.role || 'Operador'})\nSkills / Modelo: ${Array.isArray(a.skills) ? a.skills.join(', ') : (a.model || 'Gemini Flash')} | Estado: ${a.status || 'active'}\nFoco: ${a.role || a.focus || 'Operaciones'}\nDescripción: ${a.description || 'Agente inteligente del Command Center'}\n`).join('')
    : '\n*No hay agentes registrados.*\n'}
`);

writeFile('ARSENAL', 'AgentsOffice', `# Agents Office\nEspacio colaborativo de los agentes. Log de ejecución coordinado por OpenClaw Super Agent.`);
writeFile('ARSENAL', 'AgentConfig', `# Agent Config\nConfiguraciones de entorno, prompts maestros y modelos de las IAs (Gemini 2.5/Flash, tool calling).`);
writeFile('ARSENAL', 'RAGBrain', `# RAG Brain\nArchivo central "SuperBrain". La base de conocimiento de la IA, embeddings vectoriales y búsqueda semántica.`);
writeFile('ARSENAL', 'ToolsAndInfrastructure', `# Tools & Infrastructure\nEndpoints: /api/openclaw/action, /api/openclaw/chat, /api/brain/query y sincronización local/cloud.`);

// 3. INCUBATOR
writeFile('INCUBATOR', 'IdeaVault', 
`# Idea Vault
Bóveda de ideas, incubación y prospectos.
${(db.ideas && db.ideas.length > 0)
    ? db.ideas.map(i => `\n## Idea: ${i.title || i.name || 'Idea'}\nPrioridad: ${i.priority || 'media'} | Viabilidad: ${i.viability || 'alta'}\nDescripción: ${i.description || 'Detalles'}\n`).join('')
    : '\n*No hay ideas pendientes de validación en la incubadora.*\n'}
`);

// 4. PERSONAL
writeFile('PERSONAL', 'RedesSociales', `# Redes Sociales\nPlanificación, distribución de contenido e identidades multi-canal.`);
writeFile('PERSONAL', 'Personal', `# Ámbito Personal\nMetas, rutinas, finanzas personales y salud.`);

console.log('✅ BrainVault generado exitosamente con esquemas blindados.');
