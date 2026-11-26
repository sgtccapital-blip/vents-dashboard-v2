// Registro de integraciones: qué está conectado de verdad, cómo se verificó y qué permiso
// hace falta para usarlo por MCP. Solo comprueba presencia/forma de credenciales y estado local
// (sin llamadas de red), así que nunca promete acceso que no esté configurado. Nunca devuelve valores.
import fs from 'node:fs';
import path from 'node:path';
import { providerEnabled } from '../office/modelRunner.js';
import { readHeartbeat } from './jobs.js';

const has = (...names) => names.some(n => Boolean(process.env[n] && !/tu-proyecto|tu-anon|changeme|xxx/i.test(process.env[n])));

export function integrationRegistry({ rootDir, oauth, hub, jobPaths, workspaces }) {
    const list = () => {
        const out = [];
        const add = (id, label, category, status, extra = {}) => out.push({ id, label, category, status, ...extra });
        const model = (id, label, provider) => add(id, label, 'modelos', providerEnabled(provider) ? 'connected' : 'requires_configuration', { verifiedBy: 'credencial presente en el entorno del servidor', usedBy: 'AI Office (agentes internos)', mcpPermission: null });
        model('anthropic', 'Anthropic (Claude)', 'anthropic');
        model('openai', 'OpenAI', 'openai');
        model('google-ai', 'Google Gemini', 'google');
        model('openrouter', 'OpenRouter', 'openrouter');
        add('google-drive', 'Google Drive (material raw)', 'archivos', has('GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_API_KEY') ? 'connected' : 'requires_configuration', { verifiedBy: 'cuenta de servicio o API key presente', usedBy: 'Estudio de contenido', mcpPermission: 'documents:read' });
        add('supabase', 'Supabase (copia en la nube de db.json)', 'datos', has('SUPABASE_URL', 'VITE_SUPABASE_URL') && has('SUPABASE_KEY', 'VITE_SUPABASE_KEY') ? 'connected' : 'requires_configuration', { verifiedBy: 'URL y llave presentes', usedBy: 'Sincronización de datos', mcpPermission: null });
        add('pinecone', 'Pinecone', 'conocimiento', has('PINECONE_API_KEY') ? 'connected' : 'requires_configuration', { usedBy: 'RAG legado', mcpPermission: 'memory:read' });
        add('whatsapp', 'WhatsApp', 'mensajería', has('WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'WA_TOKEN') ? 'connected' : 'requires_configuration', { usedBy: 'Agente de WhatsApp', mcpPermission: null, note: 'No hay herramienta MCP para enviar mensajes: no se exponen envíos a terceros.' });
        add('public-mcp', 'Acceso público al MCP (Tailscale Funnel)', 'conectividad', process.env.PUBLIC_URL ? 'configured' : 'requires_configuration', { verifiedBy: 'PUBLIC_URL definida (el túnel se comprueba con scripts/tailscale.sh)', publicUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL.replace(/\/$/, '')}/mcp` : null });
        const clients = oauth?.list?.() || [];
        add('chatgpt-connector', 'Conector de ChatGPT (OAuth)', 'agentes', clients.some(c => !c.revoked) ? 'connected' : 'requires_configuration', { clients: clients.filter(c => !c.revoked).length, verifiedBy: 'cliente OAuth registrado y no revocado' });
        const tokens = hub?.list?.() || [];
        add('agent-keys', 'Llaves de agente (cc_)', 'agentes', tokens.some(t => !t.revoked) ? 'connected' : 'requires_configuration', { active: tokens.filter(t => !t.revoked).length });
        const hb = jobPaths ? readHeartbeat(jobPaths) : { online: false };
        add('executor', 'Ejecutor local de trabajos', 'ejecución', hb.online ? 'connected' : 'offline', { lastHeartbeat: hb.lastHeartbeat || null, host: hb.host || null, mcpPermission: 'exec:run' });
        const git = (workspaces?.list?.() || []).filter(w => w.kind === 'git');
        add('git', 'Repositorios Git locales', 'código', git.length ? 'connected' : 'requires_configuration', { repositories: git.map(w => w.id), mcpPermission: 'code:read', note: 'Push a remotos no está expuesto: las ramas y commits quedan locales.' });
        const deployTargets = (workspaces?.list?.() || []).filter(w => w.deploy?.provider);
        add('deploy-static', 'Despliegue static-release', 'despliegue', deployTargets.some(w => w.deploy.provider === 'static-release') ? 'configured' : 'requires_configuration', { workspaces: deployTargets.map(w => w.id), mcpPermission: 'deploy:prepare / deploy:release' });
        add('render', 'Render', 'despliegue', fs.existsSync(path.join(rootDir, 'render.yaml')) ? 'pending' : 'not_configured', { note: 'Existe render.yaml, pero el despliegue/reversión por MCP no está implementado (sin verificación de commit exacto).', mcpPermission: null });
        add('github', 'GitHub (remoto)', 'código', 'pending', { note: 'No hay credenciales de GitHub en el servidor; push y PR no están disponibles por MCP.' });
        return out;
    };
    return { list };
}

/** Qué sigue funcionando según dónde corre cada pieza y si el ejecutor está vivo. */
export function availability({ executorOnline }) {
    const gateway = ['consultar y editar datos del dashboard', 'conocimiento y memoria', 'documentos y briefs', 'leer código y Git', 'preparar y aplicar parches', 'crear y consultar trabajos (quedan en cola)', 'consultar despliegues'];
    const needsExecutor = ['ejecutar pruebas, lint, build y scripts', 'preparar, validar, desplegar y revertir'];
    return {
        mode: 'mac-local',
        gateway: { location: 'esta Mac (com.arrive.command-center)', available: gateway },
        executor: { location: 'esta Mac (scripts/arrive-runner.mjs)', online: executorOnline, available: executorOnline ? needsExecutor : [], waiting: executorOnline ? [] : needsExecutor },
        ifMacOff: 'Hoy el gateway, los datos y el ejecutor viven en la Mac: si está apagada o dormida, el conector no responde. El diseño de gateway siempre disponible está en docs/MCP_OPERACION.md (pendiente de implantar).',
    };
}
