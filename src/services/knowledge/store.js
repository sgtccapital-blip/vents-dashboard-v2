// Almacén de conocimiento con búsqueda híbrida (significado + palabras clave).
// Vive fuera de db.json: los textos y metadatos en store.json y los vectores en vectors.f32
// (Float32 contiguos, una fila por trozo), para aguantar decenas de miles de trozos sin inflar la base.
import fs from 'fs';
import path from 'path';
import { fold, terms as queryTerms, snippetFor } from './text.js';

const VERSION = 1;
// Los resúmenes curados (digest, memoria de proyecto, perfil) pesan un poco más que el texto crudo.
const KIND_BOOST = { digest: 1.25, project_memory: 1.35, profile: 1.2, memory: 1.2 };

function atomicWrite(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
}

export function normalize(vec) {
    const v = Float32Array.from(vec);
    let n = 0;
    for (let i = 0; i < v.length; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= n;
    return v;
}

function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

export class KnowledgeStore {
    constructor(dir, { dims = 768, model = '' } = {}) {
        this.dir = dir;
        this.file = path.join(dir, 'store.json');
        this.vecFile = path.join(dir, 'vectors.f32');
        this.dims = dims;
        this.model = model;
        this.docs = new Map();
        this.chunks = [];      // [{ id, docId, i, text, v }]
        this.vectors = [];     // Float32Array | null, alineado con chunks
        this.saveTimer = null;
        this.load();
    }

    load() {
        fs.mkdirSync(this.dir, { recursive: true });
        if (!fs.existsSync(this.file)) return;
        const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        // Si cambió el modelo de embeddings, los vectores viejos no sirven: se recalculan.
        const sameModel = data.model === this.model && data.dims === this.dims;
        this.docs = new Map((data.docs || []).map(d => [d.id, d]));
        this.chunks = data.chunks || [];
        const buf = sameModel && fs.existsSync(this.vecFile) ? fs.readFileSync(this.vecFile) : null;
        const all = buf ? new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)) : null;
        this.vectors = this.chunks.map((c, idx) => {
            if (!all || !c.v || (idx + 1) * this.dims > all.length) { c.v = false; return null; }
            return Float32Array.from(all.subarray(idx * this.dims, (idx + 1) * this.dims));
        });
    }

    save() {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
        fs.mkdirSync(this.dir, { recursive: true });
        const all = new Float32Array(this.chunks.length * this.dims);
        this.vectors.forEach((v, idx) => { if (v) all.set(v, idx * this.dims); });
        atomicWrite(this.vecFile, Buffer.from(all.buffer));
        atomicWrite(this.file, JSON.stringify({
            version: VERSION, model: this.model, dims: this.dims, savedAt: new Date().toISOString(),
            docs: [...this.docs.values()],
            chunks: this.chunks.map(({ folded, ...c }) => c), // eslint-disable-line no-unused-vars
        }));
    }

    scheduleSave(ms = 1500) {
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(() => { try { this.save(); } catch (e) { console.error('[Knowledge] No se pudo guardar:', e.message); } }, ms);
    }

    getDoc(id) { return this.docs.get(id) || null; }
    listDocs(pred = () => true) { return [...this.docs.values()].filter(pred); }
    chunksOf(docId) { return this.chunks.filter(c => c.docId === docId); }

    /**
     * Crea o reemplaza un documento con sus trozos de texto.
     * doc: { id, source, kind, title, hash?, meta? }   texts: string[]
     */
    upsertDoc(doc, texts) {
        this.removeDoc(doc.id, { save: false });
        const now = new Date().toISOString();
        this.docs.set(doc.id, { ...doc, chunkCount: texts.length, updatedAt: now });
        texts.forEach((text, i) => {
            this.chunks.push({ id: `${doc.id}#${i}`, docId: doc.id, i, text, v: false });
            this.vectors.push(null);
        });
        this.scheduleSave();
        return this.docs.get(doc.id);
    }

    /** Cambia los metadatos de un documento sin volver a trocearlo ni recalcular sus vectores. */
    updateDocMeta(id, meta) {
        const doc = this.docs.get(id);
        if (!doc) return null;
        doc.meta = { ...(doc.meta || {}), ...meta };
        this.scheduleSave();
        return doc;
    }

    removeDoc(id, { save = true } = {}) {
        if (!this.docs.has(id)) return false;
        this.docs.delete(id);
        const keep = this.chunks.map(c => c.docId !== id);
        this.chunks = this.chunks.filter((_, i) => keep[i]);
        this.vectors = this.vectors.filter((_, i) => keep[i]);
        if (save) this.scheduleSave();
        return true;
    }

    /**
     * Trozos que todavía no tienen vector, primero lo que más usan los agentes:
     * perfil, memorias de proyecto y de agentes, resúmenes, datos del dashboard y al final las transcripciones.
     */
    missingVectors(limit = Infinity) {
        const rank = kind => ({ profile: 0, project_memory: 0, memory: 1, digest: 2, transcript: 4 }[kind] ?? 3);
        const out = [];
        for (let i = 0; i < this.chunks.length; i++) if (!this.vectors[i]) out.push(this.chunks[i]);
        out.sort((a, b) => rank(this.docs.get(a.docId)?.kind) - rank(this.docs.get(b.docId)?.kind));
        return out.slice(0, limit);
    }

    setVector(chunkId, vec) {
        const idx = this.chunks.findIndex(c => c.id === chunkId);
        if (idx < 0) return;
        this.vectors[idx] = normalize(vec);
        this.chunks[idx].v = true;
        this.scheduleSave();
    }

    textForEmbedding(chunk) {
        const doc = this.docs.get(chunk.docId);
        return doc?.title ? `${doc.title}\n\n${chunk.text}` : chunk.text;
    }

    stats() {
        const bySource = {};
        for (const d of this.docs.values()) bySource[d.source] = (bySource[d.source] || 0) + 1;
        return {
            docs: this.docs.size,
            chunks: this.chunks.length,
            embedded: this.vectors.filter(Boolean).length,
            bySource,
            model: this.model,
            dims: this.dims,
        };
    }

    /**
     * Búsqueda híbrida: ranking por significado (coseno) y por palabras clave (BM25),
     * fusionados con Reciprocal Rank Fusion. Funciona solo con palabras si no hay vector de consulta.
     * filter: { source?, kind?, projectId?, docIds?, namespace? }
     */
    search({ query = '', queryVector = null, topK = 8, filter = {}, perDoc = 2 } = {}) {
        const qTerms = queryTerms(query);
        const qVec = queryVector ? normalize(queryVector) : null;
        const sources = filter.source ? [].concat(filter.source) : null;
        const kinds = filter.kind ? [].concat(filter.kind) : null;

        const candidates = [];
        for (let i = 0; i < this.chunks.length; i++) {
            const c = this.chunks[i];
            const doc = this.docs.get(c.docId);
            if (!doc) continue;
            if (sources && !sources.includes(doc.source)) continue;
            if (kinds && !kinds.includes(doc.kind)) continue;
            if (filter.projectId && doc.meta?.projectId !== filter.projectId && !doc.meta?.projectIds?.includes(filter.projectId)) continue;
            if (filter.namespace && filter.namespace !== 'default' && (doc.meta?.namespace || doc.source) !== filter.namespace) continue;
            candidates.push(i);
        }
        if (!candidates.length) return [];

        // BM25 sobre los candidatos
        const kw = new Map();
        // coverage: qué parte de la consulta (pesada por rareza de cada palabra) aparece en el trozo.
        // A diferencia de BM25 no crece con el largo de la consulta, así que sirve como umbral fijo.
        const coverage = new Map();
        if (qTerms.length) {
            const k1 = 1.2, b = 0.75;
            let totalLen = 0;
            const tf = candidates.map(i => {
                const c = this.chunks[i];
                c.folded ||= fold(`${this.docs.get(c.docId).title || ''}\n${c.text}`);
                totalLen += c.folded.length;
                return qTerms.map(t => {
                    let n = 0, p = c.folded.indexOf(t);
                    while (p >= 0 && n < 50) { n++; p = c.folded.indexOf(t, p + t.length); }
                    return n;
                });
            });
            const avg = totalLen / candidates.length || 1;
            const df = qTerms.map((_, j) => tf.filter(row => row[j] > 0).length);
            const idf = df.map(d => Math.log(1 + (candidates.length - d + 0.5) / (d + 0.5)));
            const idfTotal = idf.reduce((a, x) => a + x, 0) || 1;
            candidates.forEach((i, r) => {
                const len = this.chunks[i].folded.length;
                let s = 0, covered = 0;
                qTerms.forEach((_, j) => {
                    const f = tf[r][j];
                    if (!f) return;
                    covered += idf[j];
                    s += idf[j] * (f * (k1 + 1)) / (f + k1 * (1 - b + b * len / avg));
                });
                if (s > 0) { kw.set(i, s); coverage.set(i, covered / idfTotal); }
            });
        }

        const sim = new Map();
        if (qVec) for (const i of candidates) if (this.vectors[i]) sim.set(i, dot(qVec, this.vectors[i]));

        const rank = m => new Map([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 300).map(([i], r) => [i, r]));
        const kwRank = rank(kw);
        const simRank = rank(sim);
        const fused = new Map();
        // Un trozo que aún no tiene vector (recién llegado) no debe perder contra los que sí: su rango por
        // palabras cuenta doble mientras tanto.
        for (const [i, r] of kwRank) fused.set(i, (fused.get(i) || 0) + (qVec && !this.vectors[i] ? 2 : 1) / (60 + r));
        for (const [i, r] of simRank) fused.set(i, (fused.get(i) || 0) + 1 / (60 + r));
        if (!fused.size) return [];

        const scored = [...fused.entries()].map(([i, s]) => {
            const doc = this.docs.get(this.chunks[i].docId);
            return [i, s * (KIND_BOOST[doc.kind] || 1)];
        }).sort((a, b) => b[1] - a[1]);

        const perDocCount = new Map();
        const out = [];
        for (const [i, score] of scored) {
            const c = this.chunks[i];
            const n = perDocCount.get(c.docId) || 0;
            if (n >= perDoc) continue;
            perDocCount.set(c.docId, n + 1);
            out.push({
                chunkId: c.id,
                docId: c.docId,
                doc: this.docs.get(c.docId),
                text: c.text,
                snippet: snippetFor(c.text, qTerms),
                score,
                similarity: sim.has(i) ? Math.max(0, sim.get(i)) : null,
                keywordScore: kw.get(i) || 0,
                coverage: coverage.get(i) || 0,
            });
            if (out.length >= topK) break;
        }
        return out;
    }
}
