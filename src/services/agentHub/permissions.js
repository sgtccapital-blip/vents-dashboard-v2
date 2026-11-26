// Permisos por función para cada agente conectado (llave cc_ o cliente OAuth).
// El permiso efectivo = política guardada (o la derivada del scope antiguo read/write)
// recortada por lo que el cliente MCP recibió en su token (un token OAuth "read" nunca escribe).
// Las anotaciones MCP (readOnlyHint…) son solo pistas para el cliente: la autorización se aplica aquí.
import fs from 'node:fs';
import path from 'node:path';

/** Niveles ordenados de menor a mayor. `effect` dice si el nivel modifica algo. */
export const FUNCTIONS = {
    data: { label: 'Datos del dashboard', levels: ['none', 'read', 'write'], help: 'Proyectos, tareas, eventos, notas, contactos y demás registros.' },
    documents: { label: 'Documentos y archivos', levels: ['none', 'read', 'write'], help: 'Briefs, documentos adjuntos y archivos de AI Office.' },
    memory: { label: 'Memoria y conocimiento', levels: ['none', 'read', 'write', 'approve'], help: 'Búsqueda, memorias, decisiones. approve permite aprobar decisiones propuestas.' },
    code: { label: 'Código', levels: ['none', 'read', 'write', 'commit'], help: 'Leer, parchear y confirmar (commit/rama) en workspaces autorizados.' },
    exec: { label: 'Ejecución', levels: ['none', 'run'], help: 'Lanzar pruebas, lint, build y scripts autorizados en el ejecutor.' },
    deploy: { label: 'Implantación', levels: ['none', 'prepare', 'release'], help: 'prepare: construir y validar. release: desplegar y revertir.' },
};
const READ_EFFECT = { none: true, read: true, prepare: false, run: false, write: false, approve: false, commit: false, release: false };

export const LEGACY_POLICIES = {
    read: { data: 'read', documents: 'read', memory: 'read', code: 'none', exec: 'none', deploy: 'none' },
    write: { data: 'write', documents: 'write', memory: 'write', code: 'none', exec: 'none', deploy: 'none' },
};
export const ADMIN_POLICY = { data: 'write', documents: 'write', memory: 'approve', code: 'commit', exec: 'run', deploy: 'release', workspaces: '*' };

const rank = (fn, level) => FUNCTIONS[fn].levels.indexOf(level);

export class PermissionError extends Error {
    constructor(message, details = {}) { super(message); this.code = 'PERMISSION_DENIED'; this.details = details; }
}

/** Valida y normaliza una política enviada por el panel. */
export function normalizePolicy(input = {}, base = LEGACY_POLICIES.read) {
    const out = {};
    for (const fn of Object.keys(FUNCTIONS)) {
        const v = input[fn] ?? base[fn] ?? 'none';
        if (!FUNCTIONS[fn].levels.includes(v)) throw Object.assign(new Error(`Nivel no válido para ${fn}: ${v}. Usa ${FUNCTIONS[fn].levels.join(', ')}`), { status: 400 });
        out[fn] = v;
    }
    const ws = input.workspaces ?? base.workspaces ?? [];
    if (ws !== '*' && (!Array.isArray(ws) || ws.some(w => typeof w !== 'string' || !/^[a-z0-9][a-z0-9_.:-]{0,79}$/i.test(w)))) {
        throw Object.assign(new Error('workspaces debe ser "*" o una lista de ids'), { status: 400 });
    }
    out.workspaces = ws === '*' ? '*' : [...new Set(ws)];
    if (input.expiresAt !== undefined && input.expiresAt !== null && Number.isNaN(Date.parse(input.expiresAt))) throw Object.assign(new Error('expiresAt inválido'), { status: 400 });
    if (input.expiresAt) out.expiresAt = new Date(input.expiresAt).toISOString();
    return out;
}

/** Recorta una política al máximo que permite el scope del cliente ('read' → solo niveles sin efectos). */
export function capPolicy(policy, clientScope) {
    if (clientScope === 'write' || clientScope === 'admin') return policy;
    const out = { ...policy };
    for (const fn of Object.keys(FUNCTIONS)) {
        const levels = FUNCTIONS[fn].levels;
        let i = rank(fn, policy[fn]);
        while (i > 0 && !READ_EFFECT[levels[i]]) i--;
        out[fn] = levels[Math.max(0, i)];
    }
    return out;
}

export function createPolicyStore(dir) {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'policies.json');
    let state = {};
    try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* sin políticas todavía */ }
    const save = () => { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(state, null, 2)); fs.renameSync(tmp, file); };

    return {
        get: principal => state[principal] || null,
        all: () => ({ ...state }),
        /** Guarda la política de un agente. Persiste hasta que se cambie o revoque. */
        set(principal, input, actor = 'admin') {
            if (!principal || principal === 'admin') throw Object.assign(new Error('Principal no válido'), { status: 400 });
            const current = state[principal];
            const policy = normalizePolicy(input, current || LEGACY_POLICIES.read);
            state[principal] = { ...policy, revoked: false, updatedAt: new Date().toISOString(), updatedBy: actor, version: (current?.version || 0) + 1 };
            save();
            return state[principal];
        },
        /** Revoca todo para ese agente (las llamadas siguientes reciben PERMISSION_DENIED). */
        revoke(principal, actor = 'admin') {
            const none = Object.fromEntries(Object.keys(FUNCTIONS).map(fn => [fn, 'none']));
            state[principal] = { ...none, workspaces: [], revoked: true, revokedAt: new Date().toISOString(), updatedBy: actor, version: (state[principal]?.version || 0) + 1 };
            save();
            return state[principal];
        },
        /** Vuelve a la política derivada del scope antiguo. */
        reset(principal) { delete state[principal]; save(); return true; },
    };
}

/**
 * Permisos efectivos de quien llama.
 * ctx: { agent, scope, tokenId, principal?, admin? }
 */
export function effectivePolicy(ctx, store) {
    if (ctx.admin) return { ...ADMIN_POLICY, source: 'admin', clientScope: 'admin' };
    const principal = ctx.principal || ctx.tokenId;
    const saved = principal ? store?.get(principal) : null;
    const expired = saved?.expiresAt && Date.parse(saved.expiresAt) < Date.now();
    const base = saved && !expired ? saved : { ...(LEGACY_POLICIES[ctx.scope] || LEGACY_POLICIES.read), workspaces: [] };
    const capped = capPolicy(base, ctx.scope);
    return {
        ...Object.fromEntries(Object.keys(FUNCTIONS).map(fn => [fn, capped[fn]])),
        workspaces: base.workspaces ?? [],
        source: saved && !expired ? (saved.revoked ? 'revoked' : 'policy') : (expired ? 'expired-policy' : `legacy-${ctx.scope}`),
        clientScope: ctx.scope,
        policyVersion: saved?.version || 0,
    };
}

export function allows(policy, fn, level) {
    if (!FUNCTIONS[fn]) throw new Error(`Función de permiso desconocida: ${fn}`);
    return rank(fn, policy[fn] || 'none') >= rank(fn, level);
}

export function workspaceAllowed(policy, workspaceId) {
    if (policy.workspaces === '*') return true;
    const ws = policy.workspaces || [];
    // Un worktree "dashboard:rama" hereda el permiso del workspace base.
    return ws.includes(workspaceId) || ws.includes(String(workspaceId).split(':')[0]);
}

export function requirePermission(policy, fn, level, { workspace } = {}) {
    if (!allows(policy, fn, level)) {
        throw new PermissionError(`Permiso insuficiente: esta operación necesita ${fn}:${level} y tu acceso es ${fn}:${policy[fn] || 'none'}.`, {
            required: `${fn}:${level}`, granted: `${fn}:${policy[fn] || 'none'}`,
            hint: policy.clientScope === 'read' && !READ_EFFECT[level] ? 'El cliente MCP se autorizó solo con lectura; vuelve a conectarlo con permiso de escritura.' : 'Pide al administrador que amplíe el permiso en Agent & RAG → Agentes conectados → Permisos.',
        });
    }
    if (workspace && !workspaceAllowed(policy, workspace)) {
        throw new PermissionError(`El workspace "${workspace}" no está autorizado para este agente.`, { required: `workspace:${workspace}`, granted: policy.workspaces, hint: 'Autorízalo en el panel de permisos.' });
    }
}
