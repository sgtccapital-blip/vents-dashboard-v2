// Decisiones con procedencia, fecha (America/Panama), versión y estado vigente/sustituido.
// Un agente solo registra propuestas; aprobar exige el permiso memory:approve (o el dashboard).
// Al registrar se buscan contradicciones con decisiones vigentes del mismo proyecto y con la memoria
// consolidada de ChatGPT, y se informan sin cambiar ningún estado.
import { fold } from '../knowledge/text.js';
import { panamaDate, isIsoDate } from './time.js';
import { ToolError } from './toolkit.js';

export const DECISION_STATUSES = ['proposed', 'approved', 'superseded', 'rejected'];
const STOP = new Set('el la los las de del y o a en para por con que se un una es al lo su sus no si mas más como sobre the of and to in for'.split(' '));
const tokens = s => new Set(fold(String(s || '')).replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const NEGATION = /\b(no|nunca|ya no|sin|deja de|cancel|descart|elimina|en vez de|en lugar de|reemplaz)/i;

/** Estado efectivo: las decisiones antiguas sin estado se consideran aprobadas (las anotó el equipo). */
export function decisionView(d) {
    const status = DECISION_STATUSES.includes(d.status) ? d.status : 'approved';
    return {
        id: d.id, decision: d.decision, topic: d.topic || null, project: d.project || null, projectId: d.projectId || null,
        status, current: status === 'approved', date: d.date || null, version: d.version || 1,
        rationale: d.motivo || d.rationale || null, impact: d.impacto || d.impact || null, decidedBy: d.decisor || d.approvedBy || null,
        provenance: d.provenance || { source: 'legacy', note: 'Registrada antes del control de procedencia' },
        supersedes: d.supersedes || [], supersededBy: d.supersededBy || null,
        approvedBy: d.approvedBy || null, approvedAt: d.approvedAt || null, createdAt: d.createdAt || null,
    };
}

export function createDecisionService({ readDB, records, knowledge }) {
    const all = () => (readDB().decisionLog || []).map(decisionView);

    function contradictions({ decision, topic, projectId, excludeId }) {
        const out = [];
        for (const d of all()) {
            if (d.id === excludeId || d.status !== 'approved') continue;
            if (projectId && d.projectId && d.projectId !== projectId) continue;
            const sameTopic = topic && d.topic && fold(topic) === fold(d.topic);
            const sim = jaccard(decision, d.decision);
            if (fold(d.decision) === fold(decision)) continue;
            if (sameTopic || sim >= 0.3 || (sim >= 0.15 && NEGATION.test(decision) !== NEGATION.test(d.decision))) {
                out.push({ kind: 'decision', id: d.id, decision: d.decision, date: d.date, similarity: Number(sim.toFixed(2)), reason: sameTopic ? 'mismo tema con distinto contenido' : 'contenido parecido pero distinto' });
            }
        }
        // Memoria consolidada de ChatGPT (decisiones vigentes por proyecto).
        try {
            for (const m of knowledge?.projects?.() || []) {
                if (projectId && m.projectId !== projectId) continue;
                for (const text of m.synthesis?.decisions || []) {
                    const sim = jaccard(decision, text);
                    if (sim >= 0.3 && fold(text) !== fold(decision)) out.push({ kind: 'memory', project: m.name, decision: text, similarity: Number(sim.toFixed(2)), reason: 'decisión vigente en la memoria de ChatGPT' });
                }
            }
        } catch { /* memoria no disponible */ }
        return out.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
    }

    /** Registra una PROPUESTA. Nunca la aprueba sola, aunque no haya contradicciones. */
    function propose({ decision, topic, projectId, rationale, impact, date, provenance = {}, supersedes = [], idempotencyKey }, meta) {
        if (!decision?.trim() || decision.length < 8) throw new ToolError('INVALID_INPUT', 'Describe la decisión en una frase completa.');
        if (date && !isIsoDate(date)) throw new ToolError('INVALID_INPUT', 'date debe ser AAAA-MM-DD (America/Panama).');
        const db = readDB();
        const project = projectId ? (db.projects || []).find(p => p.id === projectId) : null;
        if (projectId && !project) throw new ToolError('NOT_FOUND', `No existe el proyecto ${projectId}.`);
        for (const id of supersedes) if (!(db.decisionLog || []).some(d => d.id === id)) throw new ToolError('NOT_FOUND', `No existe la decisión ${id}.`);
        const found = contradictions({ decision, topic, projectId });
        const data = {
            decision: decision.trim(), topic: topic || null, projectId: projectId || null, project: project?.name || null,
            motivo: rationale || '', impacto: impact || '', status: 'proposed', version: 1, date: date || panamaDate(),
            provenance: { source: provenance.source || 'mcp', agent: meta.agent, conversationId: provenance.conversation_id || null, url: provenance.url || null, quote: provenance.quote ? String(provenance.quote).slice(0, 500) : null, capturedAt: new Date().toISOString() },
            supersedes, possibleContradictions: found.map(c => c.id || c.decision).slice(0, 10),
        };
        const res = records.create('decisionLog', { data, idempotencyKey }, { ...meta, allowReadonly: true });
        return { ...res, status: 'proposed', possibleContradictions: found, note: found.length ? 'Hay posibles contradicciones: se registró como propuesta y requiere revisión humana.' : 'Registrada como propuesta; un responsable debe aprobarla.' };
    }

    function approve({ id, expected, supersede = [], note = '' }, meta) {
        const d = (readDB().decisionLog || []).find(x => x.id === id);
        if (!d) throw new ToolError('NOT_FOUND', `No existe la decisión ${id}.`);
        const v = decisionView(d);
        if (v.status === 'approved') return { action: 'already_approved', id };
        if (v.status !== 'proposed') throw new ToolError('INVALID_STATE', `La decisión está ${v.status}; solo se aprueban propuestas.`);
        const toSupersede = [...new Set([...(d.supersedes || []), ...supersede])];
        const res = records.update('decisionLog', id, { data: { status: 'approved', approvedBy: meta.agent, approvedAt: new Date().toISOString(), approvalNote: note, version: (d.version || 1) + 1, supersedes: toSupersede }, expected }, { ...meta, allowReadonly: true });
        const superseded = [];
        for (const sid of toSupersede) {
            const s = (readDB().decisionLog || []).find(x => x.id === sid);
            if (!s || decisionView(s).status === 'superseded') continue;
            records.update('decisionLog', sid, { data: { status: 'superseded', supersededBy: id, supersededAt: new Date().toISOString(), version: (s.version || 1) + 1 } }, { ...meta, allowReadonly: true });
            superseded.push(sid);
        }
        return { ...res, action: 'approved', superseded };
    }

    function reject({ id, expected, reason = '' }, meta) {
        const d = (readDB().decisionLog || []).find(x => x.id === id);
        if (!d) throw new ToolError('NOT_FOUND', `No existe la decisión ${id}.`);
        if (decisionView(d).status !== 'proposed') throw new ToolError('INVALID_STATE', 'Solo se rechazan propuestas.');
        return records.update('decisionLog', id, { data: { status: 'rejected', rejectedBy: meta.agent, rejectedAt: new Date().toISOString(), rejectionReason: reason, version: (d.version || 1) + 1 }, expected }, { ...meta, allowReadonly: true });
    }

    function list({ projectId, status, includeSuperseded = false, text, limit = 50 } = {}) {
        let rows = all();
        if (projectId) rows = rows.filter(d => d.projectId === projectId);
        if (status) rows = rows.filter(d => d.status === status);
        else if (!includeSuperseded) rows = rows.filter(d => !['superseded', 'rejected'].includes(d.status));
        if (text) { const q = fold(text); rows = rows.filter(d => fold(`${d.decision} ${d.topic || ''} ${d.rationale || ''}`).includes(q)); }
        rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        return { total: rows.length, decisions: rows.slice(0, limit) };
    }

    return { list, propose, approve, reject, contradictions, get: id => { const d = (readDB().decisionLog || []).find(x => x.id === id); if (!d) throw new ToolError('NOT_FOUND', `No existe la decisión ${id}.`); return decisionView(d); } };
}
