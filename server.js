/**
 * Command Center API Server
 * Puerto: 3001
 * 
 * Este servidor actúa como el "cerebro compartido" entre:
 * - El frontend React (localhost:5173)
 * - OpenClaw Agent (localhost:18789)
 * 
 * Ambos sistemas leen y escriben datos a través de esta API.
 * Los datos se persisten en db.json.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { createRequire } from 'module';
import { exec } from 'child_process';
import cron from 'node-cron';
import { GoogleGenerativeAI } from '@google/generative-ai';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import openCloudEngine from './src/services/openCloudEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');
const VAULT_PATH = process.env.VAULT_PATH || path.join(__dirname, '_agent_inbox');

// Ensure vault directory exists
if (!fs.existsSync(VAULT_PATH)) fs.mkdirSync(VAULT_PATH, { recursive: true });

// Multer config for RAG document uploads
const upload = multer({
    dest: path.join(__dirname, '_uploads_tmp'),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
        const allowedExts = ['.pdf', '.txt', '.md', '.csv'];
        const isAllowedExt = allowedExts.some(ext => file.originalname.toLowerCase().endsWith(ext));
        if (allowed.includes(file.mimetype) || isAllowedExt) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF, TXT, MD y CSV'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Data Layer ───────────────────────────────────────────────

// ─── Data Layer ───────────────────────────────────────────────

let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_KEY;

// Sincronización inicial de Supabase al arrancar
async function initSupabaseSync() {
    if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('tu-proyecto') || SUPABASE_KEY.includes('tu-anon')) {
        console.log('   ℹ️  Supabase no configurado o variables con placeholders. Operando en modo local (db.json).');
        return;
    }

    console.log('   🔗 Conectando a Supabase para sincronizar base de datos...');
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (res.ok) {
            const rows = await res.json();
            if (rows && rows.length > 0 && rows[0].data) {
                console.log('   ✅ Estado recuperado desde Supabase. Sincronizando db.json local...');
                fs.writeFileSync(DB_PATH, JSON.stringify(rows[0].data, null, 2), 'utf-8');
            } else {
                console.log('   ℹ️  Supabase inicializado pero sin datos en la tabla command_center_state. Subiendo base de datos local...');
                const localData = readDB();
                await syncToSupabase(localData);
            }
        } else {
            console.warn(`   ⚠️  Error de conexión con Supabase (Status ${res.status}). Usando base de datos local.`);
        }
    } catch (err) {
        console.error('   ❌ Error al sincronizar con Supabase en el inicio:', err.message);
    }
}

// Sincronización asíncrona hacia Supabase (Upsert sin bloquear las peticiones del frontend)
async function syncToSupabase(data) {
    if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('tu-proyecto') || SUPABASE_KEY.includes('tu-anon')) return;
    
    try {
        // Verificar si existe la fila con id=1
        const check = await fetch(`${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        let method = 'PATCH';
        let body = JSON.stringify({ data: data });
        let urlTarget = `${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`;

        if (check.ok) {
            const rows = await check.json();
            if (!rows || rows.length === 0) {
                method = 'POST';
                body = JSON.stringify({ id: 1, data: data });
                urlTarget = `${SUPABASE_URL}/rest/v1/command_center_state`;
            }
        } else {
            // Si falla la fila pero la tabla existe (o para forzar creación)
            method = 'POST';
            body = JSON.stringify({ id: 1, data: data });
            urlTarget = `${SUPABASE_URL}/rest/v1/command_center_state`;
        }
        
        const res = await fetch(urlTarget, {
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: body
        });
        
        if (!res.ok) {
            console.error(`   [Supabase Sync] Error al guardar datos (${method}): ${res.status} ${res.statusText}`);
        } else {
            console.log(`   [Supabase Sync] Sincronizado exitosamente con la nube (${method}).`);
        }
    } catch (err) {
        console.error('   [Supabase Sync] Error de red durante la sincronización:', err.message);
    }
}

function readDB() {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading db.json:', err.message);
        return { agents: [], projects: [], companies: [], tasks: [], agentTasks: [], agentMemory: [], agentKPIs: [], circuitBreakers: [], notes: [], ideas: [], subscriptions: [], socialMedia: [], contentTasks: [], activityFeed: [], orders: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    // Sincronizar con Supabase en background de forma asíncrona
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('tu-proyecto') && !SUPABASE_KEY.includes('tu-anon')) {
        syncToSupabase(data).catch(err => console.error('[Supabase Sync Catch] Error:', err.message));
    }
    
    // Asynchronous non-blocking spawn to auto-reflect changes into BrainVault markdown files
    exec('node generate_brain_vault.cjs', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[BrainVault Sync] Error sincronizando markdown: ${error.message}`);
        } else {
            console.log(`[BrainVault Sync] Markdown sincronizado correctamente.`);
        }
    });
}

// ─── Generic CRUD Factory ─────────────────────────────────────

function createCRUDRoutes(entityName) {
    const router = express.Router();

    // GET all
    router.get('/', (req, res) => {
        const db = readDB();
        res.json(db[entityName] || []);
    });

    // PUT bulk reorder / update all
    router.put('/', (req, res) => {
        const db = readDB();
        if (Array.isArray(req.body)) {
            db[entityName] = req.body;
            writeDB(db);
            return res.json(db[entityName]);
        }
        res.status(400).json({ error: 'Body must be an array' });
    });

    // GET by ID
    router.get('/:id', (req, res) => {
        const db = readDB();
        const item = (db[entityName] || []).find(i => i.id === req.params.id);
        if (!item) return res.status(404).json({ error: `${entityName} not found` });
        res.json(item);
    });

    // POST (create)
    router.post('/', (req, res) => {
        const db = readDB();
        const newItem = { id: `${entityName.slice(0, 4)}-${Date.now()}`, ...req.body };
        if (!db[entityName]) db[entityName] = [];
        db[entityName].push(newItem);
        writeDB(db);

        // Auto-Upsert
        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) RAGEngine.upsertEntity(entityName, newItem).catch(e => console.error('[RAG] Upsert API error', e.message));

        res.status(201).json(newItem);
    });

    // PUT (update by ID)
    router.put('/:id', (req, res) => {
        const db = readDB();
        const idx = (db[entityName] || []).findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: `${entityName} not found` });
        db[entityName][idx] = { ...db[entityName][idx], ...req.body };
        writeDB(db);

        // Auto-Upsert
        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) RAGEngine.upsertEntity(entityName, db[entityName][idx]).catch(e => console.error('[RAG] Upsert API error', e.message));

        res.json(db[entityName][idx]);
    });

    // DELETE by ID
    router.delete('/:id', (req, res) => {
        const db = readDB();
        const before = (db[entityName] || []).length;
        db[entityName] = (db[entityName] || []).filter(i => i.id !== req.params.id);
        if (db[entityName].length === before) return res.status(404).json({ error: `${entityName} not found` });
        writeDB(db);

        // Auto-Delete
        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) RAGEngine.deleteEntity(req.params.id).catch(e => console.error('[RAG] Delete API error', e.message));

        res.json({ success: true });
    });

    return router;
}

// ─── Specific routes BEFORE generic CRUD ──────────────────────

// OpenClaw Core is now running on a separate Typescript engine (port 18789)
// The frontend directly hits localhost:18789/api/openclaw/...


// (Jarvis proxy bridge and auto-delegation routes removed)

// Agent metrics summary (must be before CRUD to avoid :id catch)
app.get('/api/agents/metrics', (req, res) => {
    const db = readDB();
    const agents = db.agents || [];
    const metrics = {
        total: agents.length,
        online: agents.filter(a => a.status === 'online').length,
        standby: agents.filter(a => a.status === 'standby' || a.status === 'offline').length,
        totalTasksCompleted: agents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0),
        byProvider: {},
        byModel: {},
    };
    agents.forEach(a => {
        metrics.byProvider[a.provider || 'unknown'] = (metrics.byProvider[a.provider || 'unknown'] || 0) + 1;
        metrics.byModel[a.model || 'unknown'] = (metrics.byModel[a.model || 'unknown'] || 0) + 1;
    });
    res.json(metrics);
});

// ─── E-commerce / Dropshipping Checkout Endpoint ─────────────────

app.post('/api/public/checkout', (req, res) => {
    const { companyId, customer, items, totalAmount } = req.body;
    
    if (!companyId || !customer || !items || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos obligatorios para el checkout.' });
    }

    const db = readDB();
    const company = (db.companies || []).find(c => c.id === companyId);
    
    if (!company) {
        return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    // 1. Reducir el inventario de los productos comprados
    let profitTotal = 0;
    
    items.forEach(cartItem => {
        // Products live inside company.services[n].items (categories → items)
        let product = null;
        for (const category of (company.services || [])) {
            product = (category.items || []).find(p => p.id === cartItem.productId);
            if (product) break;
        }
        if (product) {
            // Restar stock
            const currentStock = parseInt(product.inventory) || 0;
            product.inventory = Math.max(0, currentStock - (parseInt(cartItem.quantity) || 1));
            
            // Estimar margen de ganancia de esta venta
            const unitCost = parseFloat(product.purchasePrice) || 0;
            const unitSale = parseFloat(cartItem.price) || 0;
            profitTotal += ((unitSale - unitCost) * (parseInt(cartItem.quantity) || 1));
        }
    });

    // 2. Registrar el nuevo Pedido
    const newOrder = {
        id: `ord-${Date.now()}`,
        companyId,
        companyName: company.name,
        customer,
        items,
        totalAmount: parseFloat(totalAmount) || 0,
        netProfit: profitTotal,
        paymentStatus: 'Pagado',
        logisticsStatus: 'Pendiente', // Pendiente, Procesando, Enviado, Completado
        createdAt: new Date().toISOString()
    };

    if (!db.orders) db.orders = [];
    db.orders.unshift(newOrder); // Poner los más recientes primero

    // 3. Registrar actividad
    if (!db.activityFeed) db.activityFeed = [];
    db.activityFeed.unshift({
        id: `act-${Date.now()}`,
        text: `🛒 Nueva Venta Web en ${company.name} por $${totalAmount}`,
        color: '#22c55e',
        timestamp: new Date().toISOString()
    });
    db.activityFeed = db.activityFeed.slice(0, 50);

    writeDB(db);

    // ★ RAG Auto-Upsert for orders
    const RAGEngine = req.app.get('ragEngine');
    if (RAGEngine) RAGEngine.upsertEntity('orders', newOrder).catch(e => console.error('[RAG] Checkout upsert error', e.message));

    res.status(201).json({ success: true, orderId: newOrder.id, message: 'Pedido procesado exitosamente.' });
});

// ─── Public Catalog Endpoint (for external websites) ─────────

app.get('/api/public/catalog/:companyId', (req, res) => {
    const db = readDB();
    const company = (db.companies || []).find(c => c.id === req.params.companyId);
    
    if (!company) {
        return res.status(404).json({ error: 'Empresa no encontrada.' });
    }

    // Build organized catalog response
    const categories = (company.services || []).map(cat => ({
        title: cat.title,
        products: (cat.items || []).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            salePrice: parseFloat(item.salePrice) || 0,
            purchasePrice: parseFloat(item.purchasePrice) || 0,
            inventory: parseInt(item.inventory) || 0,
            image: item.image || '',
            isBestSeller: !!item.isBestSeller,
            isNew: !!item.isNew,
            isDropshipping: !!item.isDropshipping,
            category: cat.title
        }))
    }));

    const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0);

    res.json({
        company: {
            id: company.id,
            name: company.name,
            industry: company.industry,
            color: company.color || '#6366f1',
            icon: company.icon,
            phone: company.phone,
            email: company.email,
            website: company.website,
            description: company.description
        },
        categories,
        totalProducts,
        lastUpdated: new Date().toISOString()
    });
});

// ─── Public Lead / Quote Request Endpoint ─────────────────────

app.post('/api/public/lead', (req, res) => {
    const { companyId, name, email, phone, message, product, source } = req.body;

    if (!companyId || !name) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (companyId, name).' });
    }

    const db = readDB();
    const company = (db.companies || []).find(c => c.id === companyId);
    const companyName = company ? company.name : 'Empresa desconocida';

    // 1. Log as activity
    if (!db.activityFeed) db.activityFeed = [];
    db.activityFeed.unshift({
        id: `act-${Date.now()}`,
        text: `📩 Nueva cotización de ${name} para ${companyName}${product ? ` — "${product}"` : ''}`,
        color: '#6366f1',
        timestamp: new Date().toISOString()
    });
    db.activityFeed = db.activityFeed.slice(0, 50);

    // 2. Create a task for follow-up
    if (!db.tasks) db.tasks = [];
    db.tasks.push({
        id: `task-${Date.now()}`,
        title: `Cotización: ${product || 'General'} — ${name}`,
        description: `Lead desde web ${source || 'externa'}.\n\nContacto:\n- Nombre: ${name}\n- Email: ${email || 'N/A'}\n- Teléfono: ${phone || 'N/A'}\n- Mensaje: ${message || 'Sin mensaje'}\n\nProducto: ${product || 'Consulta general'}`,
        status: 'pending',
        priority: 'high',
        project: companyName,
        companyId,
        createdAt: new Date().toISOString()
    });

    writeDB(db);

    res.status(201).json({ success: true, message: 'Cotización recibida exitosamente. Nos pondremos en contacto pronto.' });
});


// (LicitIA integration endpoints removed)

// ─── Vault PDF Upload Endpoint ────────────────────────────────

app.post('/api/vault/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });

        console.log(`[Vault] Procesando PDF: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)`);

        // 1. Read the PDF binary
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdf(pdfBuffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length < 10) {
            // Cleanup temp file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'No se pudo extraer texto del PDF. Puede estar escaneado o protegido.' });
        }

        console.log(`[Vault] Texto extraído: ${extractedText.length} caracteres, ${pdfData.numpages} páginas`);

        // 2. Save the PDF permanently inside the vault
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const permanentPath = path.join(VAULT_PATH, safeName);
        fs.copyFileSync(req.file.path, permanentPath);
        fs.unlinkSync(req.file.path); // cleanup tmp

        // 3. Save to db.json as a customDocument
        const db = readDB();
        const docId = `pdf-${Date.now()}`;
        const title = req.body.title || req.file.originalname.replace('.pdf', '');
        const category = req.body.category || 'documento';

        if (!db.customDocuments) db.customDocuments = [];
        db.customDocuments.push({
            id: docId,
            title,
            content: extractedText.substring(0, 50000), // cap at 50k chars
            category,
            filename: safeName,
            pages: pdfData.numpages,
            uploadedAt: new Date().toISOString()
        });
        writeDB(db);

        // 4. Index into Pinecone via RAG Engine
        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) {
            await RAGEngine.indexCustomDocument(docId, title, extractedText.substring(0, 50000), category);
        }

        // 5. Log activity
        const dbAfter = readDB();
        if (!dbAfter.activityFeed) dbAfter.activityFeed = [];
        dbAfter.activityFeed.unshift({
            id: `act-${Date.now()}`,
            text: `📄 PDF "${title}" subido al Vault e indexado en el cerebro RAG (${pdfData.numpages} páginas)`,
            color: '#3b82f6',
            timestamp: new Date().toISOString()
        });
        dbAfter.activityFeed = dbAfter.activityFeed.slice(0, 50);
        writeDB(dbAfter);

        res.status(201).json({
            success: true,
            documentId: docId,
            title,
            pages: pdfData.numpages,
            textLength: extractedText.length,
            message: `PDF "${title}" procesado e indexado exitosamente.`
        });

    } catch (err) {
        // Cleanup temp file on error
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('[Vault] Upload error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Register CRUD Routes ─────────────────────────────────────

const entities = ['agents', 'projects', 'companies', 'events', 'tasks', 'agentTasks', 'agentMemory', 'agentKPIs', 'circuitBreakers', 'notes', 'ideas', 'subscriptions', 'socialMedia', 'contentTasks', 'orders'];

entities.forEach(entity => {
    app.use(`/api/${entity}`, createCRUDRoutes(entity));
});

// ─── Activity Feed (append-only) ──────────────────────────────

app.get('/api/activity', (req, res) => {
    const db = readDB();
    res.json(db.activityFeed || []);
});

app.post('/api/activity', (req, res) => {
    const db = readDB();
    const newActivity = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...req.body
    };
    if (!db.activityFeed) db.activityFeed = [];
    db.activityFeed.unshift(newActivity);
    db.activityFeed = db.activityFeed.slice(0, 50); // max 50
    writeDB(db);
    res.status(201).json(newActivity);
});

// ─── Agent Intel Vault ──────────────────────────────────────────

app.get('/api/agent-intel', (req, res) => {
    const inboxPath = path.join(__dirname, '_agent_inbox');
    try {
        if (!fs.existsSync(inboxPath)) {
            return res.json([]);
        }
        const files = fs.readdirSync(inboxPath).filter(f => f.endsWith('.md'));
        const docs = files.map(filename => {
            const content = fs.readFileSync(path.join(inboxPath, filename), 'utf-8');
            const stats = fs.statSync(path.join(inboxPath, filename));
            
            // Extract a title/summary
            const lines = content.split('\n');
            const titleLine = lines.find(l => l.startsWith('# ')) || `# ${filename.replace('.md', '')}`;
            
            // Attempt to infer agent from filename (e.g. scout_something.md)
            let agentName = 'OpenClaw Agent';
            if (filename.toLowerCase().startsWith('scout')) agentName = 'Scout';
            if (filename.toLowerCase().startsWith('sentinel')) agentName = 'Sentinel';
            if (filename.toLowerCase().startsWith('atlas')) agentName = 'Atlas';
            if (filename.toLowerCase().startsWith('nexus')) agentName = 'Nexus';

            return {
                id: filename,
                filename,
                date: stats.mtime.toISOString(),
                agent: agentName,
                role: 'Intelligence',
                project: 'Dashboard',
                summary: titleLine.replace('# ', '').trim(),
                content
            };
        });
        
        // Sort newest first
        docs.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(docs);
    } catch (err) {
        console.error('Error reading agent intel:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Agent SOP Management ────────────────────────────────────────

const AGENTS_WORKSPACE_PATH = path.join(process.env.HOME || '/Users/gg', '.openclaw/workspace/agents');

app.get('/api/sops', (req, res) => {
    try {
        if (!fs.existsSync(AGENTS_WORKSPACE_PATH)) {
            return res.json([]);
        }
        const files = fs.readdirSync(AGENTS_WORKSPACE_PATH).filter(f => f.endsWith('.md'));
        const sops = files.map(filename => {
            const content = fs.readFileSync(path.join(AGENTS_WORKSPACE_PATH, filename), 'utf-8');
            const stats = fs.statSync(path.join(AGENTS_WORKSPACE_PATH, filename));
            
            return {
                id: filename,
                filename,
                date: stats.mtime.toISOString(),
                content
            };
        });
        
        // Sort alphabetically by filename
        sops.sort((a, b) => a.filename.localeCompare(b.filename));
        res.json(sops);
    } catch (err) {
        console.error('Error reading SOPs:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sops/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const { content } = req.body;
        
        if (!filename || !filename.endsWith('.md')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Content must be a string' });
        }

        const filePath = path.join(AGENTS_WORKSPACE_PATH, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `SOP ${filename} not found` });
        }

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[SOPs] Actualizada instrucción para agente: ${filename}`);

        // Log this action
        const db = readDB();
        if (!db.activityFeed) db.activityFeed = [];
        db.activityFeed.unshift({
            id: `act-${Date.now()}`,
            text: `🧠 Instrucciones del agente actualizadas globalmente (${filename})`,
            color: '#8b5cf6',
            timestamp: new Date().toISOString()
        });
        db.activityFeed = db.activityFeed.slice(0, 50);
        writeDB(db);

        const stats = fs.statSync(filePath);
        return res.json({
            id: filename,
            filename,
            date: stats.mtime.toISOString(),
            content,
            success: true
        });

    } catch (err) {
        console.error('Error writing SOP:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Orchestrator Engine (Auto-Delegation & Cron) ────────────────
app.post('/api/orchestrator/delegate', (req, res) => {
    const { task, description, priority } = req.body;
    if (!task) return res.status(400).json({ error: 'Falta tarea' });
    
    // Triage Logic (Decision Tree)
    let assignedAgent = 'Bart (COO)';
    let actionType = 'openclaw';
    const tLower = (task + " " + (description||'')).toLowerCase();
    
    if (tLower.includes('licitaci') || tLower.includes('pliego') || tLower.includes('panamacompra')) {
        assignedAgent = 'Sentinel (Analyst)';
    } else if (tLower.includes('redes') || tLower.includes('social') || tLower.includes('post') || tLower.includes('copy')) {
        assignedAgent = 'Echo (Social)';
    } else if (tLower.includes('campaña') || tLower.includes('ads') || tLower.includes('growth')) {
        assignedAgent = 'Nexus (Marketing)';
    } else if (tLower.includes('costo') || tLower.includes('proveedor') || tLower.includes('cotizar')) {
        assignedAgent = 'Scout (Sourcing)';
    } else if (tLower.includes('inventario') || tLower.includes('stock') || tLower.includes('entrega') || tLower.includes('logistica')) {
        assignedAgent = 'Atlas (Logistics)';
    } else if (tLower.includes('lead') || tLower.includes('crm') || tLower.includes('vender') || tLower.includes('prospecto')) {
        assignedAgent = 'CloserOps (Sales)';
    } else if (tLower.includes('codigo') || tLower.includes('ui ') || tLower.includes('frontend') || tLower.includes('react')) {
        assignedAgent = 'Antigravity (Engineer)';
        actionType = 'antigravity_inbox';
    }

    const db = readDB();
    if (!db.agentTasks) db.agentTasks = [];
    if (!db.circuitBreakers) db.circuitBreakers = [];
    
    // 1. Priority Scoring Engine
    const roi = parseFloat(req.body.roi) || 5;
    const urge = parseFloat(req.body.urgency) || 5;
    const strat = parseFloat(req.body.strategic) || 5;
    const risk = parseFloat(req.body.risk) || 5;
    const priorityScore = parseFloat(((roi * 0.4) + (urge * 0.3) + (strat * 0.2) + (risk * -0.1)).toFixed(1));
    
    // 2. Autonomy Levels
    const impactEstimate = parseFloat(req.body.impactEstimate) || 0;
    let autonomyLevel = 1;
    let status = priorityScore > 7 ? 'in_progress' : 'pending';
    
    if (impactEstimate > 25000) { autonomyLevel = 4; status = 'blocked_auth'; }
    else if (impactEstimate > 5000) { autonomyLevel = 3; status = 'blocked_auth'; }
    else if (impactEstimate > 500) { autonomyLevel = 2; }
    
    // 3. Fallback Chain / Circuit Breaker Check
    const breaker = db.circuitBreakers.find(cb => cb.agent === assignedAgent);
    if (breaker && breaker.status === 'frozen') {
        const hoursFrozen = (Date.now() - new Date(breaker.timestamp).getTime()) / 3600000;
        if (hoursFrozen < 24) {
            assignedAgent = 'Bart (COO)'; // Escalation fallback
            description = `[FALLBACK RE-ROUTE] Agent Frozen: ${description}`;
        } else {
            breaker.status = 'active'; // Recover after 24h
        }
    }

    const newTask = {
        id: `atask-${Date.now()}`,
        task,
        description: description || '',
        priorityScore,
        autonomyLevel,
        impactEstimate,
        status, // pending, in_progress, blocked_auth
        assignedAgent,
        actionType,
        createdAt: new Date().toISOString()
    };

    db.agentTasks.push(newTask);
    
    // Si es para Antigravity, generar el archivo en _agent_inbox/
    if (actionType === 'antigravity_inbox') {
        const safeName = task.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const fileName = `TASK_${new Date().toISOString().split('T')[0].replace(/-/g,'')}_${safeName}.md`;
        const inboxPath = path.join(VAULT_PATH, fileName);
        const content = `---
FROM: Orchestrator
TO: Antigravity
PRIORITY_SCORE: ${priorityScore}
AUTONOMY_LEVEL: ${autonomyLevel}
STATUS: ${status}
---

# TAREA AUTOMÁTICA DE ORCHESTRATOR
${task}

# CONTEXTO Y DESCRIPCIÓN
${description || 'Implementar lo solicitado basándote en el diseño visual del Dashboard (dark mode, Tailwind, lucide-react).'}
`;
        fs.writeFileSync(inboxPath, content);
        
        if (!db.activityFeed) db.activityFeed = [];
        db.activityFeed.unshift({
            id: `act-${Date.now()}`,
            text: `⚡ Orquestador delegó tarea UI a Antigravity: "${task}"`,
            color: '#8b5cf6',
            timestamp: new Date().toISOString()
        });
    } else {
        // Enviar silenciosamente al activity feed 
        if (!db.activityFeed) db.activityFeed = [];
        db.activityFeed.unshift({
            id: `act-${Date.now()}`,
            text: `🎯 Orquestador encoló a ${assignedAgent} [Score: ${priorityScore} | Lvl: ${autonomyLevel}]: "${task}"`,
            color: priorityScore > 7 ? '#ef4444' : '#10b981',
            timestamp: new Date().toISOString()
        });
    }

    db.activityFeed = db.activityFeed.slice(0, 50);
    writeDB(db);

    res.status(201).json({ success: true, delegatedTo: assignedAgent, priorityScore, autonomyLevel, status, actionType, task: newTask });
});

// ─── Shared Hybrid Memory Layer ────────────────────────────────
app.post('/api/orch/memory', async (req, res) => {
    const { type, agent, context, insight, action, result } = req.body;
    if (!agent || !insight) return res.status(400).json({ error: 'Falta agente o insight' });
    
    const db = readDB();
    if (!db.agentMemory) db.agentMemory = [];
    
    const memEntry = {
        id: `mem-${Date.now()}`, type: type || 'learning', agent, context, insight, action, result, timestamp: new Date().toISOString()
    };
    db.agentMemory.push(memEntry);
    writeDB(db);
    
    const RAGEngine = req.app.get('ragEngine');
    if (RAGEngine) {
        try {
            await RAGEngine.upsertEntity('agentMemory', memEntry);
            return res.status(201).json({ success: true, memory: memEntry, sync: 'hybrid' });
        } catch (e) {
            console.error('[Memory] RAG Upsert failed:', e.message);
        }
    }
    
    res.status(201).json({ success: true, memory: memEntry, sync: 'local_only' });
});

// ─── Native Agent Execution Engine (The "OpenClaw" Replacer) ───
app.post('/api/orch/execute-task', async (req, res) => {
    let { taskId, agentName, task, description, companyId, companyName } = req.body;
    
    // Auto-filler si solo llega el taskId desde la UI o el auto-pilot loop
    if (taskId && (!agentName || !task)) {
        const db = readDB();
        const queuedTask = (db.agentTasks || []).find(t => t.id === taskId);
        if (queuedTask) {
            agentName = queuedTask.assignedTo || queuedTask.assignedAgent || 'Auto-Agent';
            task = queuedTask.task;
            description = queuedTask.description;
            companyId = companyId || queuedTask.companyId || '';
            companyName = companyName || queuedTask.companyName || '';
        }
    }

    if (!agentName || !task) return res.status(400).json({ error: 'Missing agentName or task' });

    // ── Company → Namespace Mapping ──
    const namespaceMap = {
        'panamerican-bc': 'panamerican',
        'inversiones-lbl': 'lbl',
        'sabores-panama': 'lbl',
        'gabmar-investments': 'gabmar',
        'novatech-solutions': 'novatech',
        'metro-supply': 'metro',
    };
    const namespace = namespaceMap[companyId] || 'default';

    console.log(`\n[Execute] ═══════════════════════════════════════════`);
    console.log(`[Execute] Task: ${task}`);
    console.log(`[Execute] Agent: ${agentName}`);
    console.log(`[Execute] Company: ${companyName || 'N/A'} → Namespace: ${namespace}`);
    console.log(`[Execute] ═══════════════════════════════════════════`);

    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) throw new Error('RAG Engine not loaded');

        // 1. Load Agent SOP
        let sopContent = "Eres un asistente AI operativo del Command Center OS.";
        const safeAgentName = agentName.split(' ')[0]; // E.g., "Bart (COO)" -> "Bart"
        try {
            const files = fs.readdirSync(AGENTS_WORKSPACE_PATH);
            const sopFile = files.find(f => f.toLowerCase().includes(safeAgentName.toLowerCase()));
            if (sopFile) {
                sopContent = fs.readFileSync(path.join(AGENTS_WORKSPACE_PATH, sopFile), 'utf-8');
                console.log(`[Execute] ✅ SOP loaded: ${sopFile}`);
            } else {
                console.log(`[Execute] ⚠️ No SOP found for ${safeAgentName}, using default`);
            }
        } catch (e) { console.warn(`[Execute] Could not load SOP for ${safeAgentName}`); }

        // 2. Fetch RAG Context from the correct namespace
        console.log(`[Execute] Querying RAG namespace "${namespace}"...`);
        const ragQuery = `Contexto necesario para la empresa ${companyName || 'del ecosistema'} para realizar la tarea: ${task}. ${description || ''}`;
        const ragResult = await RAGEngine.query(ragQuery, 5, null, namespace);
        const memoryContext = ragResult.answer || 'Sin contexto RAG disponible para esta empresa.';
        const ragSources = (ragResult.sources || []).map(s => `${s.type}: ${s.name}`).join(', ');
        console.log(`[Execute] ✅ RAG returned context (sources: ${ragSources || 'none'})`);

        // 3. Also query root namespace for cross-company ecosystem context
        let ecosystemContext = '';
        try {
            const ecoResult = await RAGEngine.query(`Información general del ecosistema relevante para: ${task}`, 2);
            ecosystemContext = ecoResult.answer || '';
        } catch (e) { /* silent */ }

        // 4. Build the full execution prompt
        const fullPrompt = `INSTRUCCIONES DEL SISTEMA (SOP DEL AGENTE):
${sopContent}

EMPRESA/CLIENTE:
${companyName || 'Ecosistema General'}

CONTEXTO DE LA EMPRESA (RAG - Namespace: ${namespace}):
${memoryContext}

CONTEXTO GENERAL DEL ECOSISTEMA:
${ecosystemContext || 'N/A'}

TAREA A EJECUTAR:
${task}

DETALLES ADICIONALES:
${description || 'Ninguno'}

INSTRUCCIÓN CRÍTICA:
Eres ${agentName}. Ejecuta la tarea con precisión, usando todo el contexto disponible de la empresa. 
Tu respuesta debe ser el RESULTADO FINAL de la tarea — no digas que "la harás", HAZLA.
Si es un manual, escríbelo. Si es un análisis, analiza. Si es una estrategia, desarróllala.
Sé claro, completo y usa markdown para formatear.`;

        // 5. Call Gemini for real execution
        const activeDb = readDB();
        const agentConfig = (activeDb.agents || []).find(a => a.name === agentName);
        const modelId = agentConfig?.model || 'gemini-2.5-flash';

        console.log(`[Execute] Calling Gemini (${modelId}) for ${agentName}...`);
        
        let finalResult;
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await genai.models.generateContent({
                model: modelId,
                contents: fullPrompt,
                config: { maxOutputTokens: 4096 }
            });
            finalResult = response.text || 'Gemini no devolvió contenido.';
            console.log(`[Execute] ✅ Gemini execution complete (${finalResult.length} chars)`);
        } catch (geminiErr) {
            console.error(`[Execute] ⚠️ Gemini call failed: ${geminiErr.message}`);
            finalResult = `⚠️ Gemini no disponible. Contexto RAG recuperado:\n\n${memoryContext}`;
        }

        // 6. Save Result and Update DB
        const db = readDB();
        
        if (taskId) {
            const taskIdx = (db.agentTasks || []).findIndex(t => t.id === taskId);
            if (taskIdx !== -1) {
                db.agentTasks[taskIdx].status = 'completed';
                db.agentTasks[taskIdx].completedAt = new Date().toISOString();
                db.agentTasks[taskIdx].result = finalResult;
                db.agentTasks[taskIdx].namespace = namespace;
                db.agentTasks[taskIdx].ragSources = ragSources;
            }
        }

        // Log Activity
        if (!db.activityFeed) db.activityFeed = [];
        db.activityFeed.unshift({
            id: `act-${Date.now()}`,
            text: `✅ ${agentName} completó la tarea: "${task.substring(0, 50)}" [${companyName || 'General'}]`,
            color: '#10b981',
            timestamp: new Date().toISOString()
        });
        db.activityFeed = db.activityFeed.slice(0, 50);
        writeDB(db);

        console.log(`[Execute] ═══ DONE ═══\n`);
        
        res.json({ success: true, result: finalResult, namespace, ragSources });

    } catch (err) {
        console.error('[Execute] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Native Agent Skills & Chat ──────────────────────────────────
const SKILLS_WORKSPACE_PATH = path.join(process.env.HOME || '/Users/gg', '.openclaw/workspace/skills');

// Ensure Skills directory exists
if (!fs.existsSync(SKILLS_WORKSPACE_PATH)) {
    fs.mkdirSync(SKILLS_WORKSPACE_PATH, { recursive: true });
}

app.get('/api/skills', (req, res) => {
    try {
        const files = fs.readdirSync(SKILLS_WORKSPACE_PATH).filter(f => f.endsWith('.js'));
        const skills = files.map(f => {
            try {
                // Dynamically require the metadata of the `.js` file
                const skillModule = require(path.join(SKILLS_WORKSPACE_PATH, f));
                return {
                    name: skillModule.name,
                    description: skillModule.description,
                    parameters: skillModule.parameters || {},
                    filename: f
                };
            } catch(e) { return null; }
        }).filter(Boolean);
        res.json(skills);
    } catch (e) {
        console.error("Error reading skills:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/skills', (req, res) => {
    // Allows updating/writing a new `.js` skill
    try {
        const { filename, content } = req.body;
        if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });
        
        fs.writeFileSync(path.join(SKILLS_WORKSPACE_PATH, filename), content);
        // Clear require cache so new skill is loaded next time
        delete require.cache[require.resolve(path.join(SKILLS_WORKSPACE_PATH, filename))];
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/orch/chat', async (req, res) => {
    const { message, context } = req.body; // Removed agentName constraint, assuming we talk to Central Orchestrator
    if (!message) return res.status(400).json({ error: 'Missing message' });

    console.log(`\n[Orchestrator Chat] Received: "${message}"`);

    try {
        const RAGEngine = app.get('ragEngine');

        // Load Skills Metadata for Prompt
        let skillsForPrompt = [];
        let loadedSkills = {};
        try {
            const files = fs.readdirSync(SKILLS_WORKSPACE_PATH).filter(f => f.endsWith('.js'));
            for(const f of files) {
                try {
                    const skillPath = path.join(SKILLS_WORKSPACE_PATH, f);
                    delete require.cache[require.resolve(skillPath)];
                    const skillModule = require(skillPath);
                    if(skillModule.name) {
                        loadedSkills[skillModule.name] = skillModule;
                        skillsForPrompt.push(`- ${skillModule.name}: ${skillModule.description}. Payload Params: ${JSON.stringify(skillModule.parameters)}`);
                    }
                } catch(e) { console.warn("Failed loading skill", f); }
            }
        } catch (e) {}

        const db = readDB();
        let ragContext = '';
        try {
            if (RAGEngine && message) {
                const ragResult = await RAGEngine.query(String(message), 5, context || []);
                ragContext = ragResult?.answer || ragResult?.context || '';
            }
        } catch (e) {
            console.warn('[Orchestrator Chat] RAG query failed:', e.message);
        }
        if (!ragContext) {
            try {
                const q = String(message || '').trim().toLowerCase();
                const sources = [
                    ...(db.brainVault || []),
                    ...(db.agentMemory || []),
                    ...(db.activityFeed || []),
                    ...(db.agentIntelVault || []),
                    ...(db.projects || []),
                    ...(db.tasks || []),
                    ...(db.companies || [])
                ];
                const hits = sources
                    .filter(Boolean)
                    .filter(item => JSON.stringify(item).toLowerCase().includes(q.slice(0, 12)) || q.length < 4)
                    .slice(0, 5);
                ragContext = hits.map((h, i) => `[#${i+1}] ${JSON.stringify(h).slice(0, 900)}`).join('\n');
            } catch {
                ragContext = '';
            }
        }

        console.log(`[Orchestrator Chat] Processing via Gemini for Bart...`);
        let aiText = '';

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const db = readDB(); // Refresh DB context if needed
            
            const availableAgentsContext = (db.agents || []).map(a => `- ${a.name} (Rol: ${a.role || 'NA'}, Status: ${a.status || 'standby'}, Tarea actual: ${a.description || 'ninguna'})`).join('\n');
            const pendingAgentTasks = (db.agentTasks || []).filter(t => t.status !== 'completed').map(t => `- Tarea: ${t.task} (Asignada a: ${t.assignedTo}, Status: ${t.status}, Prioridad: ${t.priorityScore})`).join('\n');

            const systemPrompt = `You are Bart, the COO and Lead Agent Orchestrator of the Command Center dashboard.
You are professional, concise, and incredibly capable. Provide short, punchy responses.

Your live dashboard ecosystem context:
Agents Available:
${availableAgentsContext || 'No hay agentes registrados.'}

Pending Agent Tasks:
${pendingAgentTasks || 'No hay tareas de agentes pendientes.'}

Contexto extra/memoria (si la hay):
${ragContext ? ragContext : "No relevant memory context found."}

Available Skills:
${skillsForPrompt.join('\n')}

Important rule: If the user asks you to perform an action that matches one of the skills, you MUST append a JSON payload at the very END of your response to trigger the skill. Use EXACTLY this format and nothing else:
[ACTION: {"skill": "skill_name", "data": {"param": "value"}}]

You may speak to the user normally to reply, then append the [ACTION] block if you need to take action. Do not wrap the [ACTION] in Markdown blocks. Just plain text.`;

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}` }] },
                    { role: 'model', parts: [{ text: 'Entendido. Estoy listo.' }] },
                    ...(context || []).map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: String(msg.content || '') }]
                    }))
                ]
            });
            
            const result = await chat.sendMessage(String(message));
            aiText = result.response.text();
            
        } catch (llmErr) {
            console.error('[Orchestrator Chat] Gemini error:', llmErr.message);
            aiText = `Error al procesar tu solicitud con el LLM: ${llmErr.message}`;
        }
        let executedSkillResponse = null;
        let skillTriggered = null;

        // Skill Execution Interceptor
        const actionMatch = aiText.match(/\\[ACTION:\\s*({.*?})\\]/is);
        if (actionMatch) {
            try {
                const actionJson = JSON.parse(actionMatch[1]);
                console.log("[Orchestrator Chat] AI triggered skill:", actionJson);
                skillTriggered = actionJson;

                // Strip the [ACTION] tag from user-facing text
                aiText = aiText.replace(actionMatch[0], '').trim();

                const targetSkill = loadedSkills[actionJson.skill];
                if (targetSkill && typeof targetSkill.execute === 'function') {
                    console.log(`[Skill Exec] Running ${targetSkill.name}...`);
                    
                    // Pass dependencies: db read/write if the script needs local storage access
                    const utils = {
                        readDB, writeDB, 
                        app, // For advanced routing access
                    };

                    executedSkillResponse = await targetSkill.execute(actionJson.data, utils);
                    console.log(`[Skill Exec] Result:`, executedSkillResponse);
                    
                    // Log to feed
                    if (!db.activityFeed) db.activityFeed = [];
                    db.activityFeed.unshift({
                        id: `act-${Date.now()}`,
                        text: `⚡ Orquestador ejecutó: ${actionJson.skill}`,
                        color: '#8b5cf6',
                        timestamp: new Date().toISOString()
                    });
                    writeDB(db);

                    aiText += `\n\n_(✅ Acción automática en background: ${actionJson.skill} completada)_`;
                } else {
                    console.warn(`[Skill Exec] Skill ${actionJson.skill} not found or not executable.`);
                    aiText += `\n\n_(⚠️ Error: Skill '${actionJson.skill}' no disponible en el sistema)_`;
                }
            } catch (err) {
                console.error("[Orchestrator] Failed to execute AI Skill:", err);
            }
        }

        try {
            const memoryEntry = {
                id: `bart-chat-${Date.now()}`,
                message,
                response: aiText,
                context: ragContext || null,
                createdAt: new Date().toISOString(),
                source: 'bart-chat'
            };
            if (!db.agentMemory) db.agentMemory = [];
            db.agentMemory.unshift(memoryEntry);
            db.agentMemory = db.agentMemory.slice(0, 500);
            writeDB(db);
            if (RAGEngine) await RAGEngine.upsertEntity('agentMemory', memoryEntry);
        } catch (memErr) {
            console.warn('[Orchestrator Chat] Memory write failed:', memErr.message);
        }

        res.json({ success: true, response: aiText, executedSkill: skillTriggered, skillResult: executedSkillResponse, ragContextUsed: Boolean(ragContext) });
    } catch (e) {
        console.error("Chat Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ─── OpenCloud AI Native Orchestrator ─────────────────────────
app.post('/api/opencloud/orchestrate', async (req, res) => {
    const { prompt, historyContext } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    try {
        // Skip RAG for orchestration — it causes timeouts with Pinecone
        const result = await openCloudEngine.executeOrchestration(prompt, null, historyContext);
        res.json(result);
    } catch (err) {
        console.error('[OpenCloud API] Orchestrate Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── OpenClaw Execute Endpoint ────────────────────────────────
app.post('/api/openclaw/execute', (req, res) => {
    const { action, entity, id, data } = req.body;

    if (!action) return res.status(400).json({ error: 'Missing "action" field' });

    const db = readDB();
    let result = null;

    try {
        switch (action) {
            // ─── CREATE ───
            case 'add':
            case 'create': {
                if (!entity) return res.status(400).json({ error: 'Missing "entity" field' });
                const newItem = { id: id || `${entity.slice(0, 4)}-${Date.now()}`, ...data };
                if (!db[entity]) db[entity] = [];
                db[entity].push(newItem);
                result = newItem;
                break;
            }
            // ─── UPDATE ───
            case 'update': {
                if (!entity || !id) return res.status(400).json({ error: 'Missing "entity" or "id"' });
                const idx = (db[entity] || []).findIndex(i => i.id === id);
                if (idx === -1) return res.status(404).json({ error: `${entity}/${id} not found` });
                db[entity][idx] = { ...db[entity][idx], ...data };
                result = db[entity][idx];
                break;
            }
            // ─── DELETE ───
            case 'delete':
            case 'remove': {
                if (!entity || !id) return res.status(400).json({ error: 'Missing "entity" or "id"' });
                db[entity] = (db[entity] || []).filter(i => i.id !== id);
                result = { deleted: id };
                break;
            }
            // ─── ACTIVITY ───
            case 'addActivity':
            case 'log': {
                const activity = {
                    id: `act-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    ...data
                };
                if (!db.activityFeed) db.activityFeed = [];
                db.activityFeed.unshift(activity);
                db.activityFeed = db.activityFeed.slice(0, 50);
                result = activity;
                break;
            }
            // ─── BULK READ ───
            case 'getAll':
            case 'list': {
                if (!entity) return res.status(400).json({ error: 'Missing "entity" field' });
                return res.json(db[entity] || []);
            }
            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }

        writeDB(db);

        // --- RAG Auto-Sync Hooks ---
        const RAGEngine = req.app.get('ragEngine');
        const reqNamespace = req.body.namespace || 'default';
        if (RAGEngine && (action === 'add' || action === 'create' || action === 'update') && result) {
            RAGEngine.upsertEntity(entity, result, reqNamespace).catch(e => console.error('RAG Hook error', e.message));
        } else if (RAGEngine && (action === 'delete' || action === 'remove') && id) {
            RAGEngine.deleteEntity(id).catch(e => console.error('RAG Hook error', e.message));
        }

        // Also log the action as an activity
        if (action !== 'addActivity' && action !== 'log' && action !== 'getAll' && action !== 'list') {
            if (!db.activityFeed) db.activityFeed = [];
            db.activityFeed.unshift({
                id: `act-${Date.now() + 1}`,
                text: `[OpenClaw] ${action} → ${entity || ''}${id ? '/' + id : ''}`,
                color: '#8b5cf6',
                timestamp: new Date().toISOString()
            });
            db.activityFeed = db.activityFeed.slice(0, 50);
            writeDB(db);
        }

        res.json({ success: true, action, result });

    } catch (err) {
        console.error('Execute error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Full Dashboard Status (readonly snapshot) ────────────────

app.get('/api/openclaw/status', (req, res) => {
    const db = readDB();
    res.json({
        timestamp: new Date().toISOString(),
        counts: {
            agents: (db.agents || []).length,
            projects: (db.projects || []).length,
            companies: (db.companies || []).length,
            tasks: (db.tasks || []).length,
            ideas: (db.ideas || []).length,
            notes: (db.notes || []).length,
            subscriptions: (db.subscriptions || []).length,
        },
        agents: db.agents || [],
        recentActivity: (db.activityFeed || []).slice(0, 10)
    });
});

// ─── Health Check ─────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
    const RAGEngine = app.get('ragEngine');
    const brainStatus = RAGEngine ? await RAGEngine.getStatus() : { ready: false, reason: 'RAG not loaded' };
    res.json({ 
        status: 'ok', 
        server: 'Command Center API', 
        port: PORT, 
        time: new Date().toISOString(),
        brain: brainStatus
    });
});

// Helper to write database credentials to .env file
function updateEnvFile(url, key) {
    try {
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }
        
        // Replace or add SUPABASE_URL
        if (envContent.match(/^SUPABASE_URL=/m)) {
            envContent = envContent.replace(/^SUPABASE_URL=.*$/m, `SUPABASE_URL=${url}`);
        } else {
            envContent += `\nSUPABASE_URL=${url}`;
        }
        
        // Replace or add SUPABASE_KEY
        if (envContent.match(/^SUPABASE_KEY=/m)) {
            envContent = envContent.replace(/^SUPABASE_KEY=.*$/m, `SUPABASE_KEY=${key}`);
        } else {
            envContent += `\nSUPABASE_KEY=${key}`;
        }
        
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
        console.log('✅ Archivo .env actualizado exitosamente con las nuevas credenciales de Supabase.');
        return true;
    } catch (err) {
        console.error('❌ Error al actualizar el archivo .env:', err.message);
        return false;
    }
}

// ─── Supabase Sync & Config Endpoints ─────────────────────────

// Get connection status and configuration
app.get('/api/supabase/status', async (req, res) => {
    const isConfigured = SUPABASE_URL && SUPABASE_KEY && 
                        !SUPABASE_URL.includes('tu-proyecto') && 
                        !SUPABASE_KEY.includes('tu-anon') &&
                        SUPABASE_URL.trim() !== '' &&
                        SUPABASE_KEY.trim() !== '';
                        
    if (!isConfigured) {
        return res.json({
            configured: false,
            url: SUPABASE_URL || '',
            keyMasked: '',
            status: 'unconfigured',
            tableExists: false
        });
    }

    try {
        const testRes = await fetch(`${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        const keyMasked = SUPABASE_KEY.length > 16 
            ? `${SUPABASE_KEY.substring(0, 8)}...${SUPABASE_KEY.substring(SUPABASE_KEY.length - 8)}`
            : 'Configurado';

        if (testRes.ok) {
            return res.json({
                configured: true,
                url: SUPABASE_URL,
                keyMasked,
                status: 'connected',
                tableExists: true
            });
        } else if (testRes.status === 404) {
            return res.json({
                configured: true,
                url: SUPABASE_URL,
                keyMasked,
                status: 'connected_missing_table',
                tableExists: false,
                error: 'La tabla "command_center_state" no existe en tu base de datos Supabase.'
            });
        } else if (testRes.status === 401 || testRes.status === 403) {
            return res.json({
                configured: true,
                url: SUPABASE_URL,
                keyMasked,
                status: 'unauthorized',
                tableExists: false,
                error: 'Credenciales inválidas (401/403 Unauthorized). Revisa tu Supabase Key.'
            });
        } else {
            return res.json({
                configured: true,
                url: SUPABASE_URL,
                keyMasked,
                status: 'error',
                tableExists: false,
                error: `Error de respuesta: ${testRes.status} ${testRes.statusText}`
            });
        }
    } catch (err) {
        return res.json({
            configured: true,
            url: SUPABASE_URL,
            keyMasked: 'Configurado',
            status: 'error',
            tableExists: false,
            error: `Error de red: No se pudo conectar a Supabase. (${err.message})`
        });
    }
});

// Test and save credentials
app.post('/api/supabase/config', async (req, res) => {
    const { url, key } = req.body;
    
    if (!url || !key || url.trim() === '' || key.trim() === '') {
        // Reset connection to local mode
        SUPABASE_URL = '';
        SUPABASE_KEY = '';
        updateEnvFile('', '');
        return res.json({ success: true, status: 'unconfigured', configured: false });
    }

    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();

    try {
        console.log(`[Supabase Config] Probando conexión a: ${trimmedUrl}...`);
        const testRes = await fetch(`${trimmedUrl}/rest/v1/command_center_state?id=eq.1`, {
            headers: {
                'apikey': trimmedKey,
                'Authorization': `Bearer ${trimmedKey}`
            }
        });

        if (testRes.ok || testRes.status === 404) {
            // Credentials are valid, save them
            SUPABASE_URL = trimmedUrl;
            SUPABASE_KEY = trimmedKey;
            
            updateEnvFile(trimmedUrl, trimmedKey);
            
            // Re-run init sync if the table exists
            let synced = false;
            if (testRes.ok) {
                await initSupabaseSync();
                synced = true;
            }

            return res.json({
                success: true,
                status: testRes.ok ? 'connected' : 'connected_missing_table',
                configured: true,
                tableExists: testRes.ok,
                synced,
                url: SUPABASE_URL
            });
        } else if (testRes.status === 401 || testRes.status === 403) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: La API Key o la URL de Supabase es incorrecta.'
            });
        } else {
            return res.status(testRes.status).json({
                success: false,
                error: `Error al conectar (${testRes.status}): ${testRes.statusText}`
            });
        }
    } catch (err) {
        console.error('[Supabase Config] Error de conexión:', err.message);
        return res.status(500).json({
            success: false,
            error: `Error de red: No se pudo establecer conexión con ${trimmedUrl}. (${err.message})`
        });
    }
});

// Manual Push/Pull data sync
app.post('/api/supabase/sync', async (req, res) => {
    const { action } = req.body;
    
    if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('tu-proyecto')) {
        return res.status(400).json({ error: 'Supabase no está configurado.' });
    }

    try {
        if (action === 'push') {
            console.log('[Supabase Sync Manual] Iniciando PUSH manual...');
            const data = readDB();
            
            // Check if row exists to use POST vs PATCH
            const testRes = await fetch(`${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            let method = 'PATCH';
            let body = JSON.stringify({ data: data });
            let urlTarget = `${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`;

            if (testRes.ok) {
                const rows = await testRes.json();
                if (!rows || rows.length === 0) {
                    method = 'POST';
                    body = JSON.stringify({ id: 1, data: data });
                    urlTarget = `${SUPABASE_URL}/rest/v1/command_center_state`;
                }
            } else {
                method = 'POST';
                body = JSON.stringify({ id: 1, data: data });
                urlTarget = `${SUPABASE_URL}/rest/v1/command_center_state`;
            }

            const resSync = await fetch(urlTarget, {
                method: method,
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: body
            });

            if (resSync.ok) {
                return res.json({ success: true, message: 'Base de datos local guardada exitosamente en Supabase (Push).' });
            } else {
                return res.status(resSync.status).json({ error: `Error al subir a Supabase: ${resSync.statusText}` });
            }
        } else if (action === 'pull') {
            console.log('[Supabase Sync Manual] Iniciando PULL manual...');
            const resSync = await fetch(`${SUPABASE_URL}/rest/v1/command_center_state?id=eq.1`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (resSync.ok) {
                const rows = await resSync.json();
                if (rows && rows.length > 0 && rows[0].data) {
                    fs.writeFileSync(DB_PATH, JSON.stringify(rows[0].data, null, 2), 'utf-8');
                    return res.json({ success: true, message: 'Base de datos sincronizada con éxito desde la nube (Pull).' });
                } else {
                    return res.status(404).json({ error: 'No se encontraron datos guardados en Supabase.' });
                }
            } else {
                return res.status(resSync.status).json({ error: `Error al descargar de Supabase: ${resSync.statusText}` });
            }
        } else {
            return res.status(400).json({ error: 'Acción no válida. Debe ser "push" o "pull".' });
        }
    } catch (err) {
        console.error('[Supabase Sync Manual] Error:', err.message);
        return res.status(500).json({ error: `Error del servidor: ${err.message}` });
    }
});

// ─── RAG Brain Endpoints ──────────────────────────────────────

// Query the brain
app.post('/api/brain/query', async (req, res) => {
    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) return res.status(503).json({ error: 'RAG engine not available. Check GEMINI_API_KEY in .env' });
        
        const { question, topK, historyContext, namespace } = req.body;
        if (!question) return res.status(400).json({ error: 'Missing "question" field' });
        
        console.log(`[RAG] Query: "${question}" (namespace: ${namespace || 'default'})`);
        const result = await RAGEngine.query(question, topK || 5, historyContext, namespace);
        res.json(result);
    } catch (err) {
        console.error('[RAG] Query error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Index all data
app.post('/api/brain/index', async (req, res) => {
    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) return res.status(503).json({ error: 'RAG engine not available. Check GEMINI_API_KEY in .env' });
        
        console.log('[RAG] Manual re-index triggered...');
        const result = await RAGEngine.indexAllData();
        res.json(result);
    } catch (err) {
        console.error('[RAG] Index error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Status of RAG index
app.get('/api/brain/status', async (req, res) => {
    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) return res.json({ ready: false, reason: 'RAG engine not loaded' });
        res.json(await RAGEngine.getStatus());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload a custom document to the brain
app.post('/api/brain/upload', upload.single('file'), async (req, res) => {
    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) return res.status(503).json({ error: 'RAG engine not available' });

        const file = req.file;
        const namespace = req.body.namespace || 'default';
        let content = req.body.content || '';
        let title = req.body.title || 'Sin título';
        const category = req.body.category || 'document';

        if (file) {
            title = file.originalname;
            if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(file.path);
                const pdfData = await pdf(dataBuffer);
                content = pdfData.text;
            } else {
                content = fs.readFileSync(file.path, 'utf-8');
            }
            // Cleanup tmp file
            fs.unlinkSync(file.path);
        }

        if (!content) return res.status(400).json({ error: 'Missing "content" field or file' });

        const docId = `custom-${Date.now()}`;
        const result = await RAGEngine.indexCustomDocument(docId, title, content, category, {}, namespace);
        
        // Also save to db.json for persistence
        const db = readDB();
        if (!db.customDocuments) db.customDocuments = [];
        db.customDocuments.push({ id: docId, title: title, content, category: category, uploadedAt: new Date().toISOString() });
        writeDB(db);

        res.status(201).json({ success: true, documentId: docId, ...result });
    } catch (err) {
        console.error('[RAG] Upload error:', err.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message });
    }
});

// List uploaded custom documents
app.post('/api/brain/sync-vault', async (req, res) => {
    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) return res.status(503).json({ error: 'RAG engine not available' });

        const vaultPath = req.body.path;
        const namespace = req.body.namespace || 'default';

        if (!vaultPath || !fs.existsSync(vaultPath)) {
            return res.status(400).json({ error: 'Invalid or missing vault path' });
        }

        function getAllFiles(dirPath, arrayOfFiles) {
            const files = fs.readdirSync(dirPath);
            arrayOfFiles = arrayOfFiles || [];
            files.forEach(function(file) {
                const fullPath = path.join(dirPath, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    if (!file.startsWith('.')) {
                        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
                    }
                } else {
                    if (file.endsWith('.md') || file.endsWith('.txt')) {
                        arrayOfFiles.push(fullPath);
                    }
                }
            });
            return arrayOfFiles;
        }

        const files = getAllFiles(vaultPath);
        let processed = 0;

        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const title = path.basename(file);
                const docId = `vault-${Date.now()}-${Math.floor(Math.random()*10000)}`;
                await RAGEngine.indexCustomDocument(docId, title, content, 'obsidian_vault', {}, namespace);
                processed++;
            } catch (e) {
                console.error(`[RAG] Error processing file ${file}:`, e.message);
            }
        }

        res.json({ success: true, processed });
    } catch (err) {
        console.error('[RAG] Vault Sync error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/brain/documents', (req, res) => {
    const db = readDB();
    res.json(db.customDocuments || []);
});

// Delete a custom document
app.delete('/api/brain/documents/:id', (req, res) => {
    const db = readDB();
    db.customDocuments = (db.customDocuments || []).filter(d => d.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
});

// ─── Agent Analysis Channel (RAG + Live Data) ────────────────

app.post('/api/brain/agent-analysis', async (req, res) => {
    try {
        const RAGEngine = app.get('ragEngine');
        if (!RAGEngine) return res.status(503).json({ error: 'RAG engine not available' });

        const { question, historyContext } = req.body;
        if (!question) return res.status(400).json({ error: 'Missing "question" field' });

        // Enrich with live agent data
        const db = readDB();
        const agents = db.agents || [];
        const projects = db.projects || [];
        const companies = db.companies || [];

        const liveContext = {
            agentCount: agents.length,
            onlineAgents: agents.filter(a => a.status === 'online').length,
            totalTasksCompleted: agents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0),
            projectCount: projects.length,
            companyCount: companies.length,
            agents: agents.map(a => ({
                name: a.name, role: a.role, status: a.status,
                model: a.model, focus: a.focus, provider: a.provider,
                tasksCompleted: a.tasksCompleted
            })),
        };

        console.log(`[RAG:Agent-Analysis] Query: "${question}"`);

        // Query RAG with enriched context
        const ragResult = await RAGEngine.query(question, 8, historyContext);

        // Build augmented answer with live stats
        const enrichedAnswer = {
            answer: ragResult.answer,
            sources: ragResult.sources,
            liveData: liveContext,
            channel: 'agent-analysis',
            timestamp: new Date().toISOString()
        };

        res.json(enrichedAnswer);
    } catch (err) {
        console.error('[RAG:Agent-Analysis] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// (SuperBrain/Obsidian/YouTube/Podcast features removed)

// ─── 24/7 Backend Autonomous Workflow Engine ────────────────────
let backendAutoPilotActive = true; 

app.post('/api/orch/toggle-autopilot', (req, res) => {
    backendAutoPilotActive = req.body.active;
    console.log(`[Native Orchestrator] Backend Auto-Pilot is now ${backendAutoPilotActive ? '🟢 ON' : '🔴 OFF'}`);
    res.json({ success: true, active: backendAutoPilotActive });
});

app.get('/api/orch/autopilot-status', (req, res) => {
    res.json({ active: backendAutoPilotActive });
});

// The infinite background loop that completely replaces the need for the frontend UI tab to be open
setInterval(async () => {
    if (!backendAutoPilotActive) return;
    
    try {
        const db = readDB();
        const pendingTasks = (db.agentTasks || []).filter(t => t.status === 'pending');
        if (pendingTasks.length === 0) return;

        // Take highest priority task
        pendingTasks.sort((a,b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        const taskToRun = pendingTasks[0];
        
        // Optimistic lock
        const idx = db.agentTasks.findIndex(t => t.id === taskToRun.id);
        if (idx !== -1) {
            db.agentTasks[idx].status = 'in-progress';
            writeDB(db);
        }

        console.log(`[24/7 Auto-Pilot] Waking up to process task: ${taskToRun.task}`);

        const payload = {
            taskId: taskToRun.id,
            agentName: taskToRun.assignedTo || taskToRun.assignedAgent,
            task: taskToRun.task,
            description: taskToRun.description || ''
        };

        // Self-call orchestrator execute endpoint
        await fetch(`http://localhost:${PORT}/api/orch/execute-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
    } catch (e) {
        console.error('[24/7 Auto-Pilot] Loop Error:', e.message);
    }
}, 12000); // Check the queue every 12 seconds autonomously

// ─── Static Frontend Serving ──────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n⚡ Command Center API & Frontend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   OpenClaw Execute: POST http://localhost:${PORT}/api/openclaw/execute`);
    console.log(`   Dashboard Status: GET http://localhost:${PORT}/api/openclaw/status`);
    
    // Sincronizar datos con Supabase antes de cualquier consulta RAG o peticiones de clientes
    await initSupabaseSync();
    
    // Initialize db.json if it doesn't exist
    if (!fs.existsSync(DB_PATH)) {
        console.log('📦 db.json not found. Run: node seed-db.js to initialize.\n');
    }

    // Load RAG engine
    try {
        const RAGEngineProxy = {
            async upsertEntity(entityType, entityData, namespace) {
                return fetch('http://localhost:18791/api/rag/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ entityType, entityData, namespace }) });
            },
            async deleteEntity(entityId) {
                return fetch(`http://localhost:18791/api/rag/entity/${entityId}`, { method: 'DELETE' });
            },
            async query(question, topK, historyContext, namespace) {
                const res = await fetch('http://localhost:18791/api/rag/query', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ question, topK, historyContext, namespace }) });
                return res.json();
            },
            async indexCustomDocument(docId, title, content, category, extraMetadata, namespace) {
                const res = await fetch('http://localhost:18791/api/rag/document', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ docId, title, content, category, extraMetadata: extraMetadata || {}, namespace }) });
                return res.json();
            },
            async indexYouTubeVideo(url, title, category, namespace) {
                const res = await fetch('http://localhost:18791/api/rag/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url, title, category, namespace }) });
                return res.json();
            },
            async indexObsidianVault(vaultPath, namespace) {
                const res = await fetch('http://localhost:18791/api/rag/obsidian', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ vaultPath, namespace }) });
                return res.json();
            },
            async indexAllData() {
                const res = await fetch('http://localhost:18791/api/rag/sync', { method: 'POST' });
                return res.json();
            },
            async getStatus() {
                try {
                    const res = await fetch('http://localhost:18791/api/rag/status');
                    if (!res.ok) throw new Error(`RAG status error: ${res.status}`);
                    return await res.json();
                } catch(e) {
                    return { ready: false, provider: 'Microservice (Disconnected)' };
                }
            }
        };
        app.set('ragEngine', RAGEngineProxy);
        // BrainVault auto-indexing has been migrated to the native Frontend Agent.
        const status = await RAGEngineProxy.getStatus();
        console.log(`   🧠 RAG Brain: ${status.ready ? `ONLINE (${status.indexed} docs indexed)` : 'No index — POST /api/brain/index to build'}`);
        console.log(`   Brain Query: POST http://localhost:${PORT}/api/brain/query`);
        console.log(`   Brain Index: POST http://localhost:${PORT}/api/brain/index\n`);
    } catch (err) {
        console.warn(`   ⚠️  RAG Brain: Not available — ${err.message}`);
        console.log('   Ensure the openclaw-rag microservice is running on port 18791.\n');
    }
});
