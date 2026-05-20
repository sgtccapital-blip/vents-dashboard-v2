/**
 * Pinecone Enterprise RAG Engine (OpenClaw RAG Microservice)
 * 
 * Features:
 * - Pinecone Serverless vectorial storage
 * - E-commerce Orders indexing  
 * - Custom Document / PDF indexing
 * - Hybrid filters (metadata exact match + semantic)
 * - Re-Ranking via Gemini
 * - Conversational memory
 */

import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';

// Path to the main dashboard database
const DB_PATH = path.join(__dirname, '..', '..', '..', 'db.json');

// ── Rate Limiter ──────────────────────────────────────────────
const RATE_LIMITS = { MAX_DAILY_REQUESTS: 1500, MAX_PER_MINUTE: 30 };
const rateLimitState = { dailyCount: 0, minuteCount: 0, lastDayReset: new Date().toDateString(), lastMinuteReset: Date.now() };

function checkRateLimit() {
    const now = new Date();
    if (now.toDateString() !== rateLimitState.lastDayReset) {
        rateLimitState.dailyCount = 0;
        rateLimitState.lastDayReset = now.toDateString();
    }
    if (Date.now() - rateLimitState.lastMinuteReset > 60000) {
        rateLimitState.minuteCount = 0;
        rateLimitState.lastMinuteReset = Date.now();
    }
    if (rateLimitState.dailyCount >= RATE_LIMITS.MAX_DAILY_REQUESTS) throw new Error('⚠️ Límite diario de Gemini alcanzado.');
    if (rateLimitState.minuteCount >= RATE_LIMITS.MAX_PER_MINUTE) throw new Error('⚠️ Límite por minuto alcanzado.');
    rateLimitState.dailyCount++;
    rateLimitState.minuteCount++;
}

// ── Clients ───────────────────────────────────────────────────
let ai: GoogleGenAI | null = null;
function getAI() {
    if (!ai) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY no configurado en .env');
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

let pcIndex: any = null;
function getPinecone() {
    if (!pcIndex) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) throw new Error('PINECONE_API_KEY no configurado en .env');
        const pc = new Pinecone({ apiKey });
        const indexName = process.env.PINECONE_INDEX || 'openclaw';
        console.log("USING PINECONE INDEX:", indexName);
        pcIndex = pc.index(indexName);
    }
    return pcIndex;
}

// ── Hybrid Filter Detection ──────────────────────────────────
function detectExactFilters(question: string) {
    const filters: any = {};

    const idMatch = question.match(/\b(ord|task|proj|comp|idea|note|agen|prod|soci|cont)-\d+\b/i);
    if (idMatch) {
        filters.entityId = idMatch[0];
    }

    const typeKeywords: Record<string, string> = {
        'orden': 'order', 'ordenes': 'order', 'pedido': 'order', 'venta': 'order',
        'tarea': 'task', 'tareas': 'task',
        'proyecto': 'project', 'proyectos': 'project',
        'empresa': 'company', 'empresas': 'company',
        'agente': 'agent', 'agentes': 'agent',
        'idea': 'idea', 'ideas': 'idea',
        'nota': 'note', 'notas': 'note',
        'documento': 'document', 'pdf': 'document', 'pliego': 'document'
    };

    const lowerQ = question.toLowerCase();
    for (const [keyword, type] of Object.entries(typeKeywords)) {
        if (lowerQ.includes(keyword)) {
            filters.type = type;
            break;
        }
    }

    return Object.keys(filters).length > 0 ? filters : null;
}

// ── Data Chunking ─────────────────────────────────────────────
function chunkDatabaseToDocuments(db: any) {
    const documents: any[] = [];

    (db.companies || []).forEach((c: any) => {
        const services = (c.services || []).map((s: any) => `${s.name} ($${s.price})`).join(', ');
        documents.push({
            id: `company-${c.id}`,
            text: `Empresa: ${c.name}. ${c.description || ''}. Sector: ${c.sector||''}. Ubicación: ${c.location||''}. Servicios/Productos: ${services || 'N/A'}`,
            metadata: { type: 'company', entityId: c.id, name: c.name }
        });
        (c.products || []).forEach((p: any, idx: number) => {
            documents.push({
                id: `product-${c.id}-${idx}`,
                text: `Producto de ${c.name}: ${p.name}. ${p.description || ''}. Categoria: ${p.category || ''}`,
                metadata: { type: 'product', entityId: c.id, name: p.name }
            });
        });
    });

    (db.projects || []).forEach((p: any) => {
        documents.push({
            id: `project-${p.id}`,
            text: `Proyecto: ${p.name}. ${p.description}. Estado: ${p.status}. Prioridad: ${p.priority}. Agente líder: ${p.leadAgent||''}`,
            metadata: { type: 'project', entityId: p.id, name: p.name }
        });
        (p.tasks || []).forEach((t: any) => {
            documents.push({
                id: `ptask-${p.id}-${t.id}`,
                text: `Tarea del proyecto "${p.name}": ${t.text}. Estado: ${t.done ? 'completada' : 'pendiente'}`,
                metadata: { type: 'task', entityId: t.id }
            });
        });
    });

    (db.tasks || []).forEach((t: any) => {
        documents.push({
            id: `task-${t.id}`,
            text: `Tarea Global: ${t.text}. Estado: ${t.done ? 'completada' : 'pendiente'}. Categoría: ${t.category || 'general'}`,
            metadata: { type: 'task', entityId: t.id }
        });
    });

    (db.notes || []).forEach((n: any) => {
        documents.push({
            id: `note-${n.id}`,
            text: `Nota: ${n.text}`,
            metadata: { type: 'note', entityId: n.id }
        });
    });

    (db.ideas || []).forEach((i: any) => {
        documents.push({
            id: `idea-${i.id}`,
            text: `Idea: ${i.title}. ${i.description || ''}. Estado: ${i.status || 'nueva'}`,
            metadata: { type: 'idea', entityId: i.id, title: i.title }
        });
    });

    (db.agents || []).forEach((a: any) => {
        documents.push({
            id: `agent-${a.id}`,
            text: `Agente IA: ${a.name}. Rol: ${a.role}. ${a.description}. Modelo: ${a.model}.`,
            metadata: { type: 'agent', entityId: a.id, name: a.name }
        });
    });

    (db.orders || []).forEach((o: any) => {
        const itemNames = (o.items || []).map((i: any) => `${i.name || i.productId} x${i.quantity}`).join(', ');
        documents.push({
            id: `order-${o.id}`,
            text: `Orden/Venta: ${o.id}. Empresa: ${o.companyName || o.companyId}. Cliente: ${JSON.stringify(o.customer)}. Items: ${itemNames}. Total: $${o.totalAmount}. Ganancia Neta: $${o.netProfit || 0}. Estado Pago: ${o.paymentStatus}. Logística: ${o.logisticsStatus}. Fecha: ${o.createdAt}`,
            metadata: { type: 'order', entityId: o.id, name: o.companyName || 'Venta' }
        });
    });

    (db.customDocuments || []).forEach((d: any) => {
        documents.push({
            id: `doc-${d.id}`,
            text: `Documento: ${d.title}. Categoría: ${d.category || 'general'}. Contenido: ${d.content}`,
            metadata: { type: 'document', entityId: d.id, name: d.title }
        });
    });

    return documents;
}

function chunkSemantic(str: string, maxLength = 800) {
    if (!str) return [];
    // Split by double line breaks (paragraphs) or markdown headings
    const paragraphs = str.split(/\n\s*\n|(?=\n#{1,4}\s)/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const p of paragraphs) {
        const cleanP = p.trim();
        if (!cleanP) continue;
        if ((currentChunk + "\n\n" + cleanP).length <= maxLength) {
            currentChunk += (currentChunk ? "\n\n" : "") + cleanP;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            // If a single paragraph is still too long, fallback to word split
            if (cleanP.length > maxLength) {
                const words = cleanP.split(' ');
                let tempChunk = "";
                for(const w of words) {
                    if((tempChunk + " " + w).length <= maxLength) {
                        tempChunk += (tempChunk ? " " : "") + w;
                    } else {
                        if(tempChunk) chunks.push(tempChunk.trim());
                        tempChunk = w;
                    }
                }
                currentChunk = tempChunk;
            } else {
                currentChunk = cleanP;
            }
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

async function embed(texts: string[]) {
    const aiClient = getAI();
    let embeddings: any[] = [];
    for (let i = 0; i < texts.length; i += 20) {
        checkRateLimit();
        const batch = texts.slice(i, i + 20);
        try {
            const response = await aiClient.models.embedContent({
                model: 'gemini-embedding-001',
                contents: batch,
            });
            response.embeddings?.forEach((e: any) => embeddings.push(e.values));
        } catch (err: any) {
            console.error('[RAG] Batch embedding error', err.message);
            batch.forEach(() => embeddings.push(null));
        }
        if (i + 20 < texts.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }
    return embeddings;
}

// ── Pipeline RAG ──────────────────────────────────────────────

export const RagEngine = {

    async indexAllData() {
        console.log('[RAG] Iniciando Pinecone Full Sync...');
        const index = getPinecone();
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        const docs = chunkDatabaseToDocuments(db);

        let expandedDocs: any[] = [];
        docs.forEach(doc => {
            const strChunks = chunkSemantic(doc.text, 800);
            strChunks.forEach((str, i) => {
                expandedDocs.push({
                    id: `${doc.id}-chunk-${i}`,
                    text: str,
                    metadata: { type: doc.metadata.type, entityId: doc.metadata.entityId, name: doc.metadata.name || 'N/A' }
                });
            });
        });

        console.log(`[RAG] Generando vectores para ${expandedDocs.length} fragmentos...`);
        const vectors = await embed(expandedDocs.map(d => d.text));

        const records = expandedDocs.map((doc, i) => {
            if (!vectors[i]) return null;
            return {
                id: String(doc.id),
                values: vectors[i],
                metadata: { ...doc.metadata, text: doc.text }
            };
        }).filter(Boolean);

        try {
            await index.deleteAll();
            console.log('[RAG] Index anterior purgado.');
        } catch (e: any) { console.log('[RAG] Skipping purge:', e.message); }

        for (let i = 0; i < records.length; i += 100) {
            const batch = records.slice(i, i + 100);
            await index.upsert(batch);
            console.log(`[RAG] Upsert batch ${i + 1} to ${i + batch.length}`);
        }

        console.log(`[RAG] ✅ Pinecone Full Sync. ${records.length} vectores guardados.`);
        return { indexed: records.length, timestamp: new Date().toISOString() };
    },

    async upsertEntity(entityType: string, entityData: any, namespace = 'default') {
        if (!entityData || !entityData.id) return;
        const typeMap: Record<string, string> = {
            'tasks': 'task', 'projects': 'project', 'companies': 'company',
            'notes': 'note', 'ideas': 'idea', 'agents': 'agent',
            'orders': 'order', 'customDocuments': 'document'
        };
        const singleType = typeMap[entityType] || 'document';
        const textToEmbed = `Entidad: ${singleType}. Objeto: ${JSON.stringify(entityData, null, 1)}`;

        const index = getPinecone().namespace(namespace);
        const chunks = chunkSemantic(textToEmbed, 800);
        const embeddings = await embed(chunks);

        const records = chunks.map((c, i) => {
            if (!embeddings[i]) return null;
            return {
                id: `${singleType}-${entityData.id}-chunk-${i}`,
                values: embeddings[i],
                metadata: { type: singleType, entityId: entityData.id, text: c }
            };
        }).filter(Boolean);

        if (records.length > 0) {
            try {
                await index.upsert(records);
                console.log(`[RAG] Auto-Upsert completado → ${singleType}/${entityData.id}`);
            } catch (err: any) {
                console.error(`[RAG] Error Auto-Upsert ${entityData.id}:`, err.message);
            }
        }
    },

    async indexCustomDocument(docId: string, title: string, content: string, category: string, extraMetadata: any = {}, namespace = 'default') {
        const index = getPinecone().namespace(namespace);
        const fullText = `Documento: ${title}. Categoría: ${category}. Contenido: ${content}`;
        const chunks = chunkSemantic(fullText, 800);
        const embeddings = await embed(chunks);

        const records = chunks.map((c, i) => {
            if (!embeddings[i]) return null;
            return {
                id: `doc-${docId}-chunk-${i}`,
                values: embeddings[i],
                metadata: { type: 'document', entityId: docId, name: title, category, ...extraMetadata, text: c }
            };
        }).filter(Boolean);

        if (records.length > 0) {
            await index.upsert(records);
            console.log(`[RAG] Documento "${title}" indexado → ${records.length} chunks`);
        }
        return { chunks: records.length };
    },

    async deleteEntity(entityId: string, namespace = 'default') {
        if (!entityId) return;
        try {
            const idx = getPinecone().namespace(namespace);
            // Pinecone supports prefix-based deletion
            // Our IDs follow the pattern: {type}-{entityId}-chunk-{i}
            // We'll delete by listing and filtering
            const prefixes = [
                `company-${entityId}`, `project-${entityId}`, `task-${entityId}`,
                `note-${entityId}`, `idea-${entityId}`, `agent-${entityId}`,
                `order-${entityId}`, `doc-${entityId}`, `document-${entityId}`,
                `custom-${entityId}`, `vault-${entityId}`, `obsidian-${entityId}`
            ];
            for (const prefix of prefixes) {
                try {
                    await idx.deleteMany({ ids: [`${prefix}-chunk-0`, `${prefix}-chunk-1`, `${prefix}-chunk-2`, `${prefix}-chunk-3`, `${prefix}-chunk-4`] });
                } catch (e: any) { /* ignore if IDs don't exist */ }
            }
            console.log(`[RAG] Deleted vectors for entity ${entityId} in namespace ${namespace}`);
        } catch (err: any) {
            console.error(`[RAG] Delete error for ${entityId}:`, err.message);
        }
    },

    async query(question: string, topK = 5, historyContext: string | null = null, namespace = 'default') {
        const idx = getPinecone().namespace(namespace);

        let queryEmbedding;
        try {
            checkRateLimit();
            const aiClient = getAI();
            const resp = await aiClient.models.embedContent({
                model: 'gemini-embedding-001',
                contents: question,
            });
            queryEmbedding = resp.embeddings![0].values;
        } catch (err: any) {
            return { answer: 'Error al generar embedding de la pregunta: ' + err.message, sources: [] };
        }

        const filters = detectExactFilters(question);
        const queryParams: any = {
            vector: queryEmbedding,
            topK: 12,
            includeMetadata: true
        };
        if (filters) {
            queryParams.filter = filters;
            console.log(`[RAG] Hybrid filter applied:`, filters);
        }

        let queryResponse;
        try {
            queryResponse = await idx.query(queryParams);
        } catch (err: any) {
            return { answer: 'Error consultando Pinecone: Verifique que su Index existe. ' + err.message, sources: [] };
        }

        if (!queryResponse.matches || queryResponse.matches.length === 0) {
            return { answer: 'No encontré datos asociados a esa consulta en el cerebro.', sources: [] };
        }

        const allCandidates = queryResponse.matches.map((m: any, i: number) =>
            `[Fuente ${i + 1} | Tipo: ${m.metadata.type} | Score: ${(m.score * 100).toFixed(1)}%] ${m.metadata.text}`
        ).join('\n\n');

        const prompt = `Actúa como un analista experto que responde usando exclusivamente la información recuperada de documentos (RAG). Tu trabajo no es inventar ni asumir: es interpretar, estructurar y convertir información en claridad accionable.

FUENTE DE VERDAD:
- Usa SOLO la información proporcionada en el contexto/documentos.
- No inventes datos.
- Si algo no está en los documentos, dilo explícitamente.

OBJETIVO:
Transformar información dispersa en:
- claridad
- decisiones
- acción

ESTILO:
- Directo
- Claro
- Sin relleno
- Profesional pero con mentalidad de operador

---

ESTRUCTURA DE RESPUESTA:

1. 🧠 RESPUESTA DIRECTA  
Responde la pregunta en 2–4 líneas claras, sin rodeos.

2. 📚 SOPORTE (DEL DOCUMENTO)  
- Lista los puntos clave extraídos del documento
- Usa bullets
- Si aplica, menciona secciones, datos o referencias

3. 🔍 INTERPRETACIÓN  
Explica qué significa realmente esa información (no repetir, interpretar).

4. 🛠️ ACCIÓN / APLICACIÓN  
Cómo usar esta información en la práctica (decisiones, pasos, implicaciones).

5. ⚠️ LIMITACIONES  
- Qué NO está claro en los documentos  
- Qué información falta  
- Qué no se puede concluir con certeza

---

REGLAS:

- NO inventar
- NO asumir
- NO rellenar con conocimiento externo (a menos que se indique)
- Si hay conflicto entre fuentes, señalarlo
- Priorizar precisión sobre creatividad

---

FORMATO:

- Usa bullets y estructura clara
- Frases cortas
- Evita párrafos largos
- Responde como si fuera un "notebook inteligente"

---

COMPORTAMIENTO AVANZADO:

Si hay múltiples documentos:
- Agrupa por temas
- Detecta patrones o contradicciones
- Resume sin perder precisión

Si la pregunta es ambigua:
- Responde lo que se puede
- Explica qué falta para mejorar la respuesta

---

FRASES CLAVE:
- "Según los documentos..."
- "El documento indica que..."
- "No hay evidencia suficiente para concluir que..."
- "Esto sugiere que..."
- "La implicación práctica es..."

---

OBJETIVO FINAL:
No solo responder.  
Convertir información en decisiones claras.

${historyContext ? 'Historial de Conversación Previa:\\n' + historyContext + '\\n\\n' : ''}

FUENTES DE MEMORIA DISPONIBLES:
${allCandidates}

Consulta del usuario: ${question}`;


        try {
            const aiClient = getAI();
            checkRateLimit();
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const topSources = queryResponse.matches.slice(0, topK).map((m: any) => ({
                name: m.metadata.name || m.metadata.entityId || m.id,
                type: m.metadata.type,
                score: (m.score * 100).toFixed(1) + '%'
            }));

            return {
                answer: response.text || '',
                sources: topSources
            };
        } catch (err: any) {
            return { answer: 'Gemini no pudo responder: ' + err.message, sources: [] };
        }
    },

    async indexYouTubeVideo(url: string, title: string, category = 'video', namespace = 'default') {
        const { YoutubeTranscript } = await import('youtube-transcript');
        let transcriptData;
        try {
            transcriptData = await YoutubeTranscript.fetchTranscript(url);
        } catch (err: any) {
            throw new Error('No se pudo extraer el transcrito: ' + err.message);
        }
        
        const fullText = transcriptData.map((t: any) => t.text).join(' ');
        const docId = 'yt-' + Date.now();
        const res = await this.indexCustomDocument(docId, `[YouTube] ${title}`, fullText, category, {}, namespace);
        
        return {
            id: docId,
            title: `[YouTube] ${title}`,
            category,
            content: fullText,
            uploadedAt: new Date().toISOString(),
            chunks: res.chunks
        };
    },

    async generateStudyGuide(content: string) {
        checkRateLimit();
        const aiClient = getAI();
        const prompt = `Actúas como un Analista de Investigación Senior.
Tu objetivo es analizar profundamente el siguiente material y crear una "Guía de Estudio" (Deep Briefing).
La guía debe extraer los conceptos fundamentales, identificar patrones clave y estructurar la información para máxima retención.

Devuelve estrictamente un objeto JSON puro (sin \`\`\`json ni texto extra):
{
  "summary": "Resumen ejecutivo detallado",
  "keyConcepts": [
    { "term": "Concepto 1", "definition": "Definición profunda y por qué es importante" }
  ],
  "timelineOrSteps": ["Paso 1...", "Paso 2..."],
  "faq": [
    {"q": "Pregunta de razonamiento 1", "a": "Respuesta fundamentada en el texto"}
  ]
}

DOCUMENTO DE REFERENCIA:
${content}`;

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        const rawText = response.text!.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(rawText);
    },

    async generateDeepDivePodcast(content: string) {
        checkRateLimit();
        const aiClient = getAI();
        
        // 1. Director Stage: Create Outline
        const outlinePrompt = `Actúa como el Director de un Podcast premium de tecnología y negocios tipo "Deep Dive".
Debes crear el esqueleto/escaleta (outline) de un episodio de 15 minutos basado en el documento proporcionado.
Habrá 2 presentadores: 'Ana' (Analista experta y seria) y 'Carlos' (Entrevistador curioso que hace buenas preguntas).

Documento:
${content}

Crea 4 segmentos lógicos (Intro, Desarrollo, Análisis Crítico, Conclusión).
Devuelve estrictamente JSON puro:
{
  "segments": [
    { "name": "Nombre Segmento", "description": "Qué se discutirá específicamente aquí basado en el texto" }
  ]
}`;

        const outlineResponse = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: outlinePrompt
        });
        const outlineText = outlineResponse.text!.replace(/```json/gi, '').replace(/```/g, '').trim();
        let segments;
        try {
             segments = JSON.parse(outlineText).segments;
        } catch(e) {
             segments = [{name: "General", description: "Discusión general del tema."}];
        }

        // 2. Scripting Stage: Generate Dialogue
        checkRateLimit();
        const transcriptPrompt = `Actúa como guionista experto de Podcasts. Tienes un Outline proporcionado por el Director.
Debes escribir el diálogo realista, fluido, interrumpiéndose naturalmente y muy engaging entre 'Ana' (Experta) y 'Carlos' (Curioso).
No suenes robótico. Usa muletillas naturales ("exacto", "ajá", "wow"). Deben discutir los detalles del documento proporcionado.

Outline del Director:
${JSON.stringify(segments, null, 2)}

Documento Original para extraer los datos reales:
${content}

Devuelve el guion final estrictamente como JSON puro:
{
  "title": "Un título pegadizo para el episodio",
  "dialogue": [
    {"speaker": "Carlos", "text": "¡Bienvenidos a Deep Dive! Hoy tenemos un tema que me rompió la cabeza... Ana, ¿qué estamos viendo hoy?"},
    {"speaker": "Ana", "text": "¡Hola Carlos! Pues sí, hoy desmenuzaremos un documento impresionante acerca de..."}
  ]
}
Tu respuesta JSON debe contener TODOS los segmentos del outline en una sola conversación de unos 15 a 20 turnos en total.`;

        const transcriptResponse = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: transcriptPrompt
        });
        
        const rawTranscriptText = transcriptResponse.text!.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(rawTranscriptText);
    },

    async indexObsidianVault(vaultPath: string, namespace = 'default') {
        let indexedCount = 0;
        const vaultName = path.basename(vaultPath);

        const getAllMdFiles = (dir: string, fileList: string[] = []) => {
            if (!fs.existsSync(dir)) return fileList;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (file.startsWith('.')) continue;

                if (fs.statSync(fullPath).isDirectory()) {
                    getAllMdFiles(fullPath, fileList);
                } else if (file.endsWith('.md')) {
                    fileList.push(fullPath);
                }
            }
            return fileList;
        };

        const mdFiles = getAllMdFiles(vaultPath);

        const results = [];
        for (const filePath of mdFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relPath = path.relative(vaultPath, filePath);
                const docId = `obsidian-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const title = `[Obsidian] ${relPath}`;
                
                const extraMetadata = { vault: vaultName, filePath: relPath };
                const res = await this.indexCustomDocument(docId, title, content, 'obsidian', extraMetadata, namespace);
                indexedCount++;
                results.push({
                    id: docId,
                    title: title,
                    category: 'obsidian',
                    content: content,
                    uploadedAt: new Date().toISOString(),
                    chunks: res.chunks
                });
            } catch (err: any) {
                console.error(`[RAG] Error indexing Obsidian file ${filePath}:`, err.message);
            }
        }
        
        return {
            success: true,
            message: `Indexadas ${indexedCount} notas de Obsidian.`,
            documents: results
        };
    },

    async getStatus() {
        try {
            const index = getPinecone();
            const stats = await index.describeIndexStats();
            const namespaces = stats.namespaces || {};
            const totalVectors = stats.totalRecordCount || 0;
            const namespaceBreakdown: Record<string, number> = {};
            for (const [ns, data] of Object.entries(namespaces)) {
                namespaceBreakdown[ns || 'default'] = (data as any).recordCount || 0;
            }
            return {
                ready: true,
                indexed: totalVectors,
                provider: 'Pinecone Serverless + Gemini (Hybrid + Re-Ranking)',
                namespaces: namespaceBreakdown,
                lastChecked: new Date().toISOString()
            };
        } catch (err: any) {
            return {
                ready: false,
                indexed: 0,
                provider: 'Pinecone + Gemini (Error)',
                error: err.message
            };
        }
    }
};
