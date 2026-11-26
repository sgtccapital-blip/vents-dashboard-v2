// Registro de herramientas MCP con contrato completo: esquemas de entrada/salida, anotaciones reales,
// autorización por función en el servidor, ID de operación, auditoría redactada y errores accionables.
import crypto from 'node:crypto';
import { z } from 'zod';
import { allows, requirePermission, PermissionError } from './permissions.js';
import { redactDeep, redactText } from './redact.js';

export const newOperationId = () => `op-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
const clip = (s, n) => (s && String(s).length > n ? `${String(s).slice(0, n)}…` : s);

/** Error con código estable y sugerencia de qué hacer. */
export class ToolError extends Error {
    constructor(code, message, { hint, details, retryable = false } = {}) {
        super(message);
        this.code = code;
        this.hint = hint;
        this.details = details;
        this.retryable = retryable;
    }
}

function classify(err) {
    if (err instanceof ToolError) return err;
    if (err instanceof PermissionError) return new ToolError('PERMISSION_DENIED', err.message, { hint: err.details?.hint, details: err.details });
    const msg = err?.message || String(err);
    if (/no existe|inexistente|not found|no encontr/i.test(msg)) return new ToolError('NOT_FOUND', msg, { hint: 'Comprueba el id con la herramienta de listado correspondiente.' });
    if (/duplicad|ambiguo|ya existe|ya se usó/i.test(msg)) return new ToolError('CONFLICT', msg, { hint: 'Resuelve por id o usa una clave de idempotencia distinta.' });
    if (err?.status === 400 || /inválid|falta|requiere|debe/i.test(msg)) return new ToolError('INVALID_INPUT', msg);
    return new ToolError('INTERNAL', msg, { retryable: true, hint: 'Reintenta; si persiste revisa get_connection_status.' });
}

/**
 * @param server  McpServer
 * @param ctx     { agent, scope, tokenId, principal }
 * @param policy  permisos efectivos (effectivePolicy)
 * @param hub     hubStore (auditoría)
 */
export function createToolkit({ server, ctx, policy, hub }) {
    const denied = new Map();
    const registered = [];

    /**
     * def: { title, description, input, output, perm: [fn, level], hints: { readOnly, destructive, idempotent, openWorld }, legacy }
     * legacy=true: herramienta anterior; el texto sigue siendo el JSON de siempre.
     */
    function tool(name, def, handler) {
        const { title, description, input = {}, output, perm = null, hints = {} } = def;
        const readOnly = hints.readOnly ?? (perm ? ['read', 'none'].includes(perm[1]) : true);
        const annotations = {
            title,
            readOnlyHint: readOnly,
            destructiveHint: readOnly ? false : !!hints.destructive,
            idempotentHint: readOnly ? true : !!hints.idempotent,
            openWorldHint: !!hints.openWorld,
        };
        if (perm && !allows(policy, perm[0], perm[1])) {
            denied.set(name, perm);
            return;
        }
        registered.push({ name, perm, annotations });
        server.registerTool(name, {
            title,
            description,
            inputSchema: input,
            // Esquema abierto: declara los campos garantizados sin rechazar campos adicionales (compatibilidad hacia delante).
            ...(output ? { outputSchema: z.object(output).passthrough() } : {}),
            annotations,
            _meta: { securitySchemes: [{ type: 'oauth2', scopes: readOnly ? ['read'] : ['read', 'write'] }], 'arrive/permission': perm ? `${perm[0]}:${perm[1]}` : null },
        }, async (args = {}) => {
            const operationId = newOperationId();
            const started = Date.now();
            const write = !readOnly;
            const base = { opId: operationId, agent: ctx.agent, principal: ctx.principal || ctx.tokenId || null, tokenId: ctx.tokenId, tool: name, write };
            const project = args.project_id || args.project || args.projectId || null;
            try {
                if (perm) requirePermission(policy, perm[0], perm[1]);
                const result = await handler(args, { operationId, ctx, policy });
                const ms = Date.now() - started;
                const resultProject = project || result?.projectId || null;
                hub.logActivity({ ...base, project: resultProject, args: clip(redactText(JSON.stringify(args)), 400), ok: true, ms, result: summarize(result) });
                if (result?.mcpContent) return { content: result.mcpContent, _meta: { operationId } };
                const payload = redactDeep(write && result && typeof result === 'object' && !Array.isArray(result) ? { ...result, operationId: result.operationId || operationId } : result);
                const out = { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], _meta: { operationId } };
                if (payload && typeof payload === 'object' && !Array.isArray(payload)) out.structuredContent = payload;
                return out;
            } catch (raw) {
                const err = classify(raw);
                hub.logActivity({ ...base, project, args: clip(redactText(JSON.stringify(args)), 400), ok: false, code: err.code, error: clip(redactText(err.message), 300), ms: Date.now() - started });
                const error = redactDeep({ code: err.code, message: err.message, hint: err.hint || null, retryable: err.retryable, details: err.details || null, operationId });
                const text = `Error [${err.code}]: ${error.message}${error.hint ? `\nQué hacer: ${error.hint}` : ''}\nOperación: ${operationId}`;
                return { content: [{ type: 'text', text }], structuredContent: { error }, isError: true, _meta: { operationId } };
            }
        });
    }

    /**
     * Las herramientas sin permiso no se listan. Si un cliente las llama igual (lista vieja en caché),
     * responde PERMISSION_DENIED con la acción a seguir en vez del genérico "Tool not found".
     */
    function finalize() {
        const handlers = server.server?._requestHandlers;
        const original = handlers?.get?.('tools/call');
        if (!original) return;
        handlers.set('tools/call', async (request, extra) => {
            const perm = denied.get(request?.params?.name);
            if (!perm) return original(request, extra);
            const operationId = newOperationId();
            const message = `Permiso insuficiente: ${request.params.name} necesita ${perm[0]}:${perm[1]} y tu acceso es ${perm[0]}:${policy[perm[0]] || 'none'}.`;
            hub.logActivity({ opId: operationId, agent: ctx.agent, principal: ctx.principal || ctx.tokenId || null, tokenId: ctx.tokenId, tool: request.params.name, write: true, ok: false, code: 'PERMISSION_DENIED', error: message, ms: 0 });
            const hint = policy.clientScope === 'read' ? 'El cliente se autorizó solo con lectura; reconéctalo con escritura.' : 'Pide al administrador que amplíe el permiso en el panel de Agentes conectados.';
            return { content: [{ type: 'text', text: `Error [PERMISSION_DENIED]: ${message}\nQué hacer: ${hint}` }], structuredContent: { error: { code: 'PERMISSION_DENIED', message, hint, retryable: false, operationId } }, isError: true };
        });
    }

    return { tool, finalize, registered, denied };
}

function summarize(result) {
    if (!result || typeof result !== 'object') return undefined;
    const keys = ['action', 'id', 'status', 'version', 'jobId', 'patchId', 'deploymentId', 'commit'];
    const out = {};
    for (const k of keys) if (result[k] !== undefined && typeof result[k] !== 'object') out[k] = result[k];
    return Object.keys(out).length ? out : undefined;
}
