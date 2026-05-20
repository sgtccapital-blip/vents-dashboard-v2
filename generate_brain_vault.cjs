const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const VAULT_DIR = path.join(__dirname, 'BrainVault');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

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
Modo de Guerra: Activo focalizado en Cashflow.
`);

writeFile('OPERATIONS', 'Workspace', 
`# Workspace
Espacio de trabajo general y notas.
${(db.notes || []).map(n => `\n## ${n.title}\n${n.content}\nTags: ${n.tags?.join(', ')}\n`).join('')}
`);

writeFile('OPERATIONS', 'Empresas', 
`# Empresas y Clientes
Lista completa de empresas en la red.
${(db.companies || []).map(c => `\n## ${c.name}\nEstado: ${c.status || 'Activa'}\nDescripción: Información pendiente.\n`).join('')}
`);

writeFile('OPERATIONS', 'Projects', 
`# Proyectos y Tareas
Lista de proyectos activos y sus tareas.
${(db.projects || []).map(p => {
    const pTasks = (db.tasks || []).filter(t => t.projectId === p.id);
    return `\n## Proyecto: ${p.name}\nPrioridad: ${p.priority} | Estado: ${p.status}\nTareas:\n${pTasks.map(t => `- [${t.status === 'done' ? 'x' : ' '}] ${t.title} (${t.assigneeId})`).join('\n')}\n`;
}).join('')}
`);

// 2. ARSENAL
writeFile('ARSENAL', 'AgentManager', 
`# Agent Manager
Aquí se definen las capacidades de cada agente de IA.
${(db.agents || []).map(a => `\n## Agente: ${a.name} (${a.role})\nModelo: ${a.model} | Estado: ${a.status}\nFoco: ${a.focus}\nDescripción: ${a.description}\n`).join('')}
`);

writeFile('ARSENAL', 'AgentsOffice', `# Agents Office\nEspacio colaborativo de los agentes. Log de ejecución pendiente de poblar desde el sistema.`);
writeFile('ARSENAL', 'AgentConfig', `# Agent Config\nConfiguraciones de entorno, prompts maestros y modelos de las IAs.`);
writeFile('ARSENAL', 'RAGBrain', `# RAG Brain\nArchivo central "SuperBrain". La base de conocimiento de la IA, embeddings y configuraciones de Pinecone.`);
writeFile('ARSENAL', 'ToolsAndInfrastructure', `# Tools & Infrastructure\nEndpoints, APIs (Google Workspace, Make, etc.) y CLI de automatizaciones.`);

// 3. INCUBATOR
writeFile('INCUBATOR', 'IdeaVault', 
`# Idea Vault
Bóveda de ideas, incubación y prospectos.
${(db.ideas || []).map(i => `\n## Idea: ${i.title}\nPrioridad: ${i.priority} | Viabilidad: ${i.viability}\nDescripción: ${i.description}\n`).join('')}
`);

// 4. PERSONAL
writeFile('PERSONAL', 'RedesSociales', `# Redes Sociales\nPlanificación, distribución de contenido e identidades.\nInfo pendiente a ser rellenada por el ecosistema.`);
writeFile('PERSONAL', 'Personal', `# Ámbito Personal\nMetas, rutinas, finanzas personales y salud.\nInfo pendiente a ser rellenada por el ecosistema.`);

console.log('✅ BrainVault generado exitosamente con toda la info del db.json y la estructura de secciones.');
