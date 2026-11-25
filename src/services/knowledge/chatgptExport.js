// Lectura de la exportación oficial de ChatGPT (Configuración → Controles de datos → Exportar datos).
// El ZIP trae conversations.json (o conversations-000.json, -001…): cada conversación es un árbol de
// mensajes (`mapping`) porque al editar o regenerar se crean ramas; nos quedamos con la rama visible.
import fs from 'fs';
import { listZip, readZipEntry } from './zip.js';

const CONVERSATION_FILE = /(^|\/)conversations(-\d+)?\.json$/i;
const SKIP_CONTENT = new Set(['user_editable_context', 'model_editable_context', 'thoughts', 'reasoning_recap', 'tether_browsing_display', 'tether_quote', 'execution_output', 'system_error', 'sonic_webpage', 'computer_output']);

export function isChatGptExportZip(filePath) {
    try {
        return listZip(filePath).some(e => CONVERSATION_FILE.test(e.name));
    } catch {
        return false;
    }
}

/** Lee el ZIP o el .json suelto y devuelve el array crudo de conversaciones. */
export function readExportFile(filePath) {
    if (/\.json$/i.test(filePath)) return [].concat(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    const entries = listZip(filePath).filter(e => CONVERSATION_FILE.test(e.name)).sort((a, b) => a.name.localeCompare(b.name));
    if (!entries.length) throw new Error('El ZIP no contiene conversations.json: ¿es la exportación de ChatGPT?');
    return entries.flatMap(e => [].concat(JSON.parse(readZipEntry(filePath, e).toString('utf8'))));
}

function partToText(part) {
    if (typeof part === 'string') return part;
    if (!part || typeof part !== 'object') return '';
    if (part.content_type === 'audio_transcription') return part.text || '';
    if (part.content_type === 'image_asset_pointer') return '[imagen]';
    if (typeof part.text === 'string') return part.text;
    return '';
}

function messageText(message) {
    const c = message?.content;
    if (!c || SKIP_CONTENT.has(c.content_type)) return '';
    if (Array.isArray(c.parts)) return c.parts.map(partToText).filter(Boolean).join('\n').trim();
    if (c.content_type === 'code' && c.text) return '```\n' + c.text + '\n```';
    if (typeof c.text === 'string') return c.text.trim();
    return '';
}

/** Recorre el árbol desde el nodo visible hasta la raíz y devuelve los mensajes en orden. */
export function linearize(conv) {
    const mapping = conv.mapping || {};
    let nodeId = conv.current_node;
    if (!nodeId || !mapping[nodeId]) {
        // Sin current_node: la hoja más reciente.
        const leaves = Object.values(mapping).filter(n => !n.children?.length);
        leaves.sort((a, b) => (b.message?.create_time || 0) - (a.message?.create_time || 0));
        nodeId = leaves[0]?.id;
    }
    const chain = [];
    const seen = new Set();
    while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
        seen.add(nodeId);
        chain.push(mapping[nodeId]);
        nodeId = mapping[nodeId].parent;
    }
    chain.reverse();

    const messages = [];
    for (const node of chain) {
        const m = node.message;
        if (!m) continue;
        const role = m.author?.role;
        if (role !== 'user' && role !== 'assistant') continue;
        if (m.metadata?.is_visually_hidden_from_conversation) continue;
        if (m.recipient && m.recipient !== 'all') continue; // llamadas internas a herramientas
        const text = messageText(m);
        if (!text) continue;
        const last = messages[messages.length - 1];
        // ChatGPT a veces parte una respuesta en varios mensajes seguidos del mismo rol.
        if (last && last.role === role) last.text += `\n\n${text}`;
        else messages.push({ role, text, time: m.create_time ? new Date(m.create_time * 1000).toISOString() : null });
    }
    return messages;
}

// La exportación trae segundos Unix; la API web de ChatGPT a veces trae fechas ISO.
const iso = t => {
    if (!t) return null;
    const d = typeof t === 'number' ? new Date(t * 1000) : new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Conversación normalizada: { id, title, createTime, updateTime, gizmoId, chatgptProjectId, messages } */
export function normalizeConversation(conv) {
    const id = conv.conversation_id || conv.id;
    if (!id) return null;
    const gizmoId = conv.gizmo_id || null;
    return {
        id,
        title: (conv.title || 'Sin título').trim(),
        createTime: iso(conv.create_time),
        updateTime: iso(conv.update_time || conv.create_time),
        gizmoId,
        // Las conversaciones dentro de un Proyecto de ChatGPT llevan un gizmo_id "g-p-…"
        chatgptProjectId: gizmoId && gizmoId.startsWith('g-p-') ? gizmoId : null,
        listUpdateTime: iso(conv.list_update_time) || null,
        archived: !!conv.is_archived,
        messages: linearize(conv),
    };
}

const LABEL = { user: 'Yo', assistant: 'ChatGPT' };

/** Transcripción completa para indexar (recorta respuestas larguísimas de código o tablas). */
export function transcriptText(messages, { userMax = 6000, assistantMax = 3000 } = {}) {
    return messages.map(m => {
        const max = m.role === 'user' ? userMax : assistantMax;
        const t = m.text.length > max ? `${m.text.slice(0, max)} […]` : m.text;
        return `${LABEL[m.role]}: ${t}`;
    }).join('\n\n');
}

/**
 * Texto que lee la IA para resumir: prioriza lo que escribió el usuario (ahí está su lógica)
 * y recorta las respuestas de ChatGPT. Si no cabe, guarda el inicio y el final de la conversación.
 */
export function digestInput(messages, budget = 45000) {
    const full = transcriptText(messages, { userMax: 3000, assistantMax: 700 });
    if (full.length <= budget) return full;
    const head = full.slice(0, Math.floor(budget * 0.6));
    const tail = full.slice(-Math.floor(budget * 0.4));
    return `${head}\n\n[… parte central omitida …]\n\n${tail}`;
}
