/**
 * Command Center API Server
 * Puerto: 8090
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
import { execFile } from 'child_process';
import crypto from 'crypto';
import cron from 'node-cron';
import { GoogleGenerativeAI } from '@google/generative-ai';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import openCloudEngine from './src/services/openCloudEngine.js';
import { normalizeTaskStatus, normalizeEventStatus, TASK_STATUSES, EVENT_STATUSES } from './src/lib/status.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8090;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');
const SEED_PATH = path.join(__dirname, 'db.seed.json');
const VAULT_PATH = process.env.VAULT_PATH || path.join(__dirname, '_agent_inbox');

// Ensure db.json exists immediately on startup
function ensureDBFile() {
    if (!fs.existsSync(DB_PATH)) {
        if (fs.existsSync(SEED_PATH)) {
            try {
                fs.copyFileSync(SEED_PATH, DB_PATH);
                console.log('📦 Auto-inicializado db.json desde db.seed.json');
            } catch (e) {
                console.warn('No se pudo copiar db.seed.json:', e.message);
            }
        } else {
            const initial = { agents: [], projects: [], companies: [], events: [], tasks: [], agentTasks: [], agentMemory: [], agentKPIs: [], circuitBreakers: [], notes: [], ideas: [], subscriptions: [], socialMedia: [], contentTasks: [], activityFeed: [], orders: [], ragStore: [], contacts: [] };
            fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
            console.log('📦 Auto-creado db.json inicial por defecto');
        }
    }
}
ensureDBFile();

// En Render (plan free) el disco se borra en cada deploy/reinicio. Sin Supabase ni disco persistente
// (DB_PATH apuntando a un disco montado), todo lo que se guarde se pierde.
const EPHEMERAL_STORAGE = !!process.env.RENDER && !process.env.DB_PATH &&
    !((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY));
if (EPHEMERAL_STORAGE) {
    console.warn('🚨 ATENCIÓN: corriendo en Render sin Supabase ni disco persistente. db.json se borrará en el próximo deploy o reinicio.');
}

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
app.set('trust proxy', 1);

// CORS: solo los orígenes listados en ALLOWED_ORIGINS (separados por coma).
// El frontend se sirve desde el mismo origen, así que por defecto no se permite ninguno externo.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Auth ─────────────────────────────────────────────────────
// El navegador inicia sesión con DASHBOARD_PASSWORD y recibe una cookie HttpOnly firmada.
// Agentes y scripts externos usan la cabecera `Authorization: Bearer <API_TOKEN>`.

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const API_TOKEN = process.env.API_TOKEN || '';
// Derivado de la contraseña: cambiarla invalida todas las sesiones abiertas.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`cc-session:${DASHBOARD_PASSWORD}`).digest('hex');
const SESSION_COOKIE = 'cc_session';
const SESSION_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years - persistent forever
const PUBLIC_API_PREFIXES = ['/api/public/', '/api/auth/'];

function safeEqual(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

function signSession(expiresAt) {
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(String(expiresAt)).digest('hex');
    return `${expiresAt}.${sig}`;
}

function isValidSession(token) {
    if (!token || !DASHBOARD_PASSWORD) return false;
    const [expiresAt] = token.split('.');
    if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false;
    return safeEqual(token, signSession(expiresAt));
}

function readCookie(req, name) {
    const header = req.headers.cookie || '';
    for (const part of header.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k === name) return decodeURIComponent(v.join('='));
    }
    return null;
}

function isAuthenticated(req) {
    const bearer = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer && API_TOKEN && safeEqual(bearer, API_TOKEN)) return true;
    return isValidSession(readCookie(req, SESSION_COOKIE));
}

function sessionCookie(req, value, maxAgeMs) {
    const secure = req.secure ? '; Secure' : '';
    return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure}`;
}

if (!DASHBOARD_PASSWORD) {
    console.warn('⚠️  DASHBOARD_PASSWORD no está definido: la API rechazará todas las peticiones privadas hasta que lo configures en .env');
}

// Límite simple de intentos de login por IP (10 cada 15 minutos)
const loginAttempts = new Map();
function tooManyAttempts(ip) {
    const now = Date.now();
    const recent = (loginAttempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
    loginAttempts.set(ip, recent);
    return recent.length >= 10;
}

app.post('/api/auth/login', (req, res) => {
    if (!DASHBOARD_PASSWORD) return res.status(503).json({ error: 'El servidor no tiene DASHBOARD_PASSWORD configurado.' });
    if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    if (!safeEqual(req.body?.password || '', DASHBOARD_PASSWORD)) {
        loginAttempts.get(req.ip).push(Date.now());
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    loginAttempts.delete(req.ip);
    res.setHeader('Set-Cookie', sessionCookie(req, signSession(Date.now() + SESSION_TTL_MS), SESSION_TTL_MS));
    res.json({ authenticated: true });
});

app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    res.json({ authenticated: false });
});

app.get('/api/auth/session', (req, res) => {
    res.json({ authenticated: isAuthenticated(req), configured: !!DASHBOARD_PASSWORD });
});

app.use('/api', (req, res, next) => {
    if (PUBLIC_API_PREFIXES.some(p => req.originalUrl.startsWith(p))) return next();
    if (isAuthenticated(req)) return next();
    res.status(401).json({ error: 'No autenticado' });
});

// ─── Data Layer ───────────────────────────────────────────────

let SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
let SUPABASE_KEY = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();

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
                const remote = rows[0].data;
                let local = null;
                try { local = readDB(); } catch { /* db local ilegible: la nube manda */ }
                if (!hasContent(remote) && hasContent(local)) {
                    console.warn('   ⚠️  La copia en Supabase está vacía y la local tiene datos: se conserva la local y se sube.');
                    lastSyncedRev = remote._syncRev || null;
                    await syncToSupabase(local);
                } else {
                    console.log('   ✅ Estado recuperado desde Supabase. Sincronizando db.json local...');
                    writeDBFile(remote);
                    lastSyncedRev = remote._syncRev || null;
                }
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

// Revisión (_syncRev) de la copia en la nube que este servidor leyó o escribió por última vez.
// Si otra instancia (p. ej. tu Mac y Render apuntando al mismo Supabase) escribió después,
// la revisión ya no coincide y NO se sobrescribe: se marca conflicto en vez de perder sus cambios.
let lastSyncedRev = null;
let supabaseConflict = null;

function supabaseHeaders(extra = {}) {
    return { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, ...extra };
}

// Sincronización hacia Supabase (escritura condicional por revisión)
async function syncToSupabase(data, { force = false } = {}) {
    if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('tu-proyecto') || SUPABASE_KEY.includes('tu-anon')) return { ok: false, reason: 'unconfigured' };

    const newRev = crypto.randomUUID();
    const payload = { ...data, _syncRev: newRev };
    const table = `${SUPABASE_URL}/rest/v1/command_center_state`;

    try {
        // PATCH solo si la nube sigue en la revisión que conocemos (comprobación atómica en PostgREST)
        const revFilter = force ? '' : (lastSyncedRev ? `&data->>_syncRev=eq.${lastSyncedRev}` : '&data->>_syncRev=is.null');
        const patch = await fetch(`${table}?id=eq.1${revFilter}`, {
            method: 'PATCH',
            headers: supabaseHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
            body: JSON.stringify({ data: payload })
        });
        if (!patch.ok) {
            console.error(`   [Supabase Sync] Error al guardar (PATCH): ${patch.status} ${patch.statusText}`);
            return { ok: false, reason: `http_${patch.status}` };
        }
        const updated = await patch.json();
        if (updated.length > 0) {
            lastSyncedRev = newRev;
            supabaseConflict = null;
            console.log('   [Supabase Sync] Sincronizado con la nube.');
            return { ok: true };
        }

        // 0 filas actualizadas: o la fila no existe todavía, o alguien más escribió antes
        const check = await fetch(`${table}?id=eq.1&select=id`, { headers: supabaseHeaders() });
        const rows = check.ok ? await check.json() : [];
        if (rows.length === 0) {
            const post = await fetch(table, {
                method: 'POST',
                headers: supabaseHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
                body: JSON.stringify({ id: 1, data: payload })
            });
            if (!post.ok) return { ok: false, reason: `http_${post.status}` };
            lastSyncedRev = newRev;
            supabaseConflict = null;
            console.log('   [Supabase Sync] Fila inicial creada en la nube.');
            return { ok: true };
        }

        supabaseConflict = {
            at: new Date().toISOString(),
            message: 'La copia en la nube cambió desde otra instancia. No se sobrescribió. Usa "Pull" para traer la versión de la nube o "Push" para imponer la local.'
        };
        console.warn('   ⚠️  [Supabase Sync] Conflicto: otra instancia escribió en la nube. No se sobrescribe.');
        return { ok: false, reason: 'conflict' };
    } catch (err) {
        console.error('   [Supabase Sync] Error de red durante la sincronización:', err.message);
        return { ok: false, reason: 'network' };
    }
}

// ¿Tiene datos reales? Evita reemplazar una base llena por una copia vacía.
function hasContent(data) {
    return ['events', 'tasks', 'contacts', 'projects'].some(k => Array.isArray(data?.[k]) && data[k].length > 0);
}

function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        ensureDBFile();
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        // Nunca devolver una base vacía: la siguiente escritura la guardaría encima de los datos reales.
        console.error(`❌ db.json no se puede leer (${err.message}). Se bloquean las escrituras hasta repararlo; hay copias en /backups.`);
        throw new Error('La base de datos no se puede leer. Revisa db.json o restaura una copia de /backups.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('db.json no contiene un objeto válido.');
    }
    return data;
}

const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');
const BACKUP_INTERVAL_MS = 10 * 60 * 1000;
const BACKUPS_TO_KEEP = 50;
let lastBackupAt = 0;

function backupDBFile() {
    if (Date.now() - lastBackupAt < BACKUP_INTERVAL_MS || !fs.existsSync(DB_PATH)) return;
    try {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, `db.${stamp}.json`));
        lastBackupAt = Date.now();
        const old = fs.readdirSync(BACKUP_DIR).filter(f => /^db\..+\.json$/.test(f)).sort().slice(0, -BACKUPS_TO_KEEP);
        old.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
    } catch (err) {
        console.error('[Backup] No se pudo copiar db.json:', err.message);
    }
}

// Escritura atómica: se escribe en un archivo temporal y luego se reemplaza el original,
// así un corte a mitad de escritura nunca deja db.json a medias.
function writeDBFile(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('writeDB: se intentó guardar algo que no es un objeto de base de datos.');
    }
    backupDBFile();
    const tmpPath = `${DB_PATH}.${process.pid}.tmp`;
    const fd = fs.openSync(tmpPath, 'w');
    try {
        fs.writeSync(fd, JSON.stringify(data, null, 2));
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, DB_PATH);
}

// Tareas en segundo plano agrupadas: muchas escrituras seguidas producen una sola ejecución.
function debounce(fn, ms) {
    let timer = null;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}

const scheduleSupabaseSync = debounce(() => {
    let data;
    try { data = readDB(); } catch { return; }
    syncToSupabase(data).catch(err => console.error('[Supabase Sync Catch] Error:', err.message));
}, 2000);

let vaultRunning = false;
let vaultPending = false;
function runBrainVault() {
    if (vaultRunning) { vaultPending = true; return; }
    vaultRunning = true;
    execFile(process.execPath, ['generate_brain_vault.cjs'], { cwd: __dirname }, (error) => {
        if (error) console.error(`[BrainVault Sync] Error sincronizando markdown: ${error.message}`);
        vaultRunning = false;
        if (vaultPending) { vaultPending = false; runBrainVault(); }
    });
}
const scheduleBrainVault = debounce(runBrainVault, 5000);

function writeDB(data) {
    writeDBFile(data);

    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('tu-proyecto') && !SUPABASE_KEY.includes('tu-anon')) {
        scheduleSupabaseSync();
    }
    scheduleBrainVault();
}

// ─── Generic CRUD Factory ─────────────────────────────────────

class ValidationError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function newId(entityName) {
    return `${entityName.slice(0, 4)}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

// Normaliza y valida un registro antes de guardarlo. `prev` es la versión guardada (en updates).
function validateEntity(entityName, item, prev = null) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new ValidationError('El cuerpo debe ser un objeto JSON.');
    }

    if (entityName === 'tasks') {
        if ('done' in item && typeof item.done !== 'boolean') {
            throw new ValidationError('`done` debe ser true o false.');
        }
        if ('status' in item) {
            const status = normalizeTaskStatus(item.status);
            if (!status) throw new ValidationError(`Estado de tarea no válido: "${item.status}". Usa: ${TASK_STATUSES.join(', ')}.`);
            // `status` manda; `done` se deriva para que nunca se contradigan.
            item.status = status;
            item.done = status === 'done';
        } else if ('done' in item) {
            const prevStatus = normalizeTaskStatus(prev?.status);
            item.status = item.done ? 'done' : (prevStatus && prevStatus !== 'done' ? prevStatus : 'pending');
        } else if (!prev) {
            item.status = 'pending';
            item.done = false;
        }
    }

    if (entityName === 'events' || entityName === 'projects') {
        if ('status' in item && item.status !== '' && item.status != null) {
            const status = normalizeEventStatus(item.status);
            if (!status && entityName === 'events') {
                throw new ValidationError(`Estado de evento no válido: "${item.status}". Usa: ${EVENT_STATUSES.join(', ')}.`);
            }
            if (status && entityName === 'events') item.status = status;
        }
    }

    return item;
}

function getCollection(db, entityName) {
    if (db[entityName] === undefined) db[entityName] = [];
    if (!Array.isArray(db[entityName])) {
        throw new ValidationError(`La colección ${entityName} no es una lista en db.json.`, 500);
    }
    return db[entityName];
}

function createCRUDRoutes(entityName) {
    const router = express.Router();

    // GET all
    router.get('/', (req, res) => {
        const db = readDB();
        res.json(db[entityName] || []);
    });

    // PUT bulk reorder / update all
    router.put('/', (req, res) => {
        if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Body must be an array' });
        const db = readDB();
        const current = getCollection(db, entityName);
        // Vaciar una colección con datos exige confirmación explícita para evitar borrados accidentales.
        if (req.body.length === 0 && current.length > 0 && req.get('X-Confirm-Clear') !== 'true') {
            return res.status(409).json({ error: `Esto borraría los ${current.length} registros de ${entityName}. Repite con la cabecera X-Confirm-Clear: true si es intencional.` });
        }
        const ids = new Set();
        for (const item of req.body) {
            if (!item || typeof item !== 'object' || !item.id) return res.status(400).json({ error: 'Cada elemento debe ser un objeto con id.' });
            if (ids.has(item.id)) return res.status(400).json({ error: `id duplicado: ${item.id}` });
            ids.add(item.id);
            validateEntity(entityName, item, current.find(c => c.id === item.id));
        }
        db[entityName] = req.body;
        writeDB(db);
        res.json(db[entityName]);
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
        const list = getCollection(db, entityName);
        const newItem = validateEntity(entityName, { ...req.body, id: req.body?.id || newId(entityName) });
        if (list.some(i => i.id === newItem.id)) {
            return res.status(409).json({ error: `Ya existe un registro con id ${newItem.id}` });
        }
        list.push(newItem);
        writeDB(db);

        // Auto-Upsert
        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) RAGEngine.upsertEntity(entityName, newItem).catch(e => console.error('[RAG] Upsert API error', e.message));

        res.status(201).json(newItem);
    });

    // PUT (update by ID)
    router.put('/:id', (req, res) => {
        const db = readDB();
        const list = getCollection(db, entityName);
        const idx = list.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: `${entityName} not found` });
        const changes = validateEntity(entityName, { ...req.body }, list[idx]);
        list[idx] = { ...list[idx], ...changes, id: list[idx].id };
        writeDB(db);

        // Auto-Upsert
        const RAGEngine = req.app.get('ragEngine');
        if (RAGEngine) RAGEngine.upsertEntity(entityName, list[idx]).catch(e => console.error('[RAG] Upsert API error', e.message));

        res.json(list[idx]);
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

const entities = ['agents', 'projects', 'companies', 'events', 'tasks', 'agentTasks', 'agentMemory', 'agentKPIs', 'circuitBreakers', 'notes', 'ideas', 'subscriptions', 'socialMedia', 'contentTasks', 'orders', 'contacts', 'decisionLog', 'portfolioRoadmap', 'promoters', 'imageGirls'];

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

function readSops() {
    if (!fs.existsSync(AGENTS_WORKSPACE_PATH)) return [];
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
    return sops;
}

app.get('/api/sops', (req, res) => {
    try {
        res.json(readSops());
    } catch (err) {
        console.error('Error reading SOPs:', err);
        res.status(500).json({ error: err.message });
    }
});

// Versión del estado: cambia cuando cambia db.json o algún SOP. Barato de calcular (solo stat).
function currentStateVersion() {
    let sig = String(fs.statSync(DB_PATH).mtimeMs);
    if (fs.existsSync(AGENTS_WORKSPACE_PATH)) {
        for (const f of fs.readdirSync(AGENTS_WORKSPACE_PATH).filter(f => f.endsWith('.md'))) {
            sig += `|${f}:${fs.statSync(path.join(AGENTS_WORKSPACE_PATH, f)).mtimeMs}`;
        }
    }
    return crypto.createHash('sha1').update(sig).digest('hex').slice(0, 16);
}

// Estado completo en una sola petición. Con ?since=<version> solo descarga si algo cambió.
app.get('/api/state', (req, res) => {
    const version = currentStateVersion();
    if (req.query.since && req.query.since === version) {
        return res.json({ version, changed: false });
    }
    const db = readDB();
    res.json({
        version,
        changed: true,
        data: {
            events: db.events || [],
            projects: db.projects || [],
            tasks: db.tasks || [],
            notes: db.notes || [],
            ideas: db.ideas || [],
            subscriptions: db.subscriptions || [],
            activity: db.activityFeed || [],
            orders: db.orders || [],
            sops: readSops(),
            socialMedia: db.socialMedia || [],
            contentTasks: Array.isArray(db.contentTasks) ? db.contentTasks : [],
            contacts: db.contacts || [],
            openclawLogs: db.openclawLogs || db.hermesLogs || [],
            decisionLog: db.decisionLog || [],
            portfolioRoadmap: db.portfolioRoadmap || [],
            promoters: db.promoters || [],
            imageGirls: db.imageGirls || [],
            agents: db.agents || [],
        }
    });
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
        res.json({
            success: true,
            message: `SOP ${filename} updated successfully`,
            sop: {
                name: filename,
                filename,
                size: stats.size,
                lastModified: stats.mtime
            }
        });
    } catch (err) {
        console.error(`[SOPs] Error updating ${req.params.filename}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── OpenClaw Super Agent Integration Bridge ────────────────────────────

// 1. Get OpenClaw tools schema (OpenAI / JSON formatted tools for OpenClaw)
app.get(['/api/openclaw/tools', '/api/hermes/tools'], (req, res) => {
    res.json({
        agent: 'OpenClaw Super Agent',
        version: '2.0',
        endpoint: '/api/openclaw/action',
        stateEndpoint: '/api/openclaw/state',
        tools: [
            {
                type: 'function',
                function: {
                    name: 'create_project',
                    description: 'Crea un nuevo proyecto en el Command Center Hub. Úsalo para proyectos de software, desarrollo, lanzamientos de negocio, campañas o pipelines.',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Nombre del proyecto' },
                            description: { type: 'string', description: 'Descripción o alcance del proyecto' },
                            category: { type: 'string', enum: ['software', 'business', 'marketing', 'operations', 'ai_pipeline', 'custom'], description: 'Categoría del proyecto' },
                            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Prioridad del proyecto' },
                            status: { type: 'string', enum: ['planning', 'active', 'in_progress', 'paused', 'completed'], description: 'Estado inicial' },
                            deadline: { type: 'string', description: 'Fecha límite (YYYY-MM-DD)' },
                            budget: { type: 'string', description: 'Presupuesto estimado o costo' },
                            techStack: { type: 'array', items: { type: 'string' }, description: 'Stack tecnológico o herramientas clave' },
                            githubRepo: { type: 'string', description: 'URL o nombre del repositorio' },
                            leadAgent: { type: 'string', description: 'Agente o responsable líder (default: OpenClaw Agent)' },
                            milestones: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string' },
                                        deadline: { type: 'string' },
                                        status: { type: 'string' }
                                    }
                                },
                                description: 'Hitos o entregables principales'
                            },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas clave' }
                        },
                        required: ['name', 'description']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'create_event',
                    description: 'Crea un nuevo evento en el calendario de eventos (conciertos, fiestas, producciones, casco peatonal, etc.).',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Nombre del evento' },
                            date: { type: 'string', description: 'Fecha del evento (YYYY-MM-DD)' },
                            time: { type: 'string', description: 'Hora (HH:MM)' },
                            location: { type: 'string', description: 'Ubicación o venue' },
                            type: { type: 'string', enum: ['eventos', 'casco_peatonal', 'nightclub', 'local', 'social', 'tv_show', 'custom'], description: 'Tipo de evento' },
                            description: { type: 'string', description: 'Descripción o detalles' },
                            budget: { type: 'string', description: 'Presupuesto' },
                            capacity: { type: 'string', description: 'Aforo estimado' },
                            organizer: { type: 'string', description: 'Organizador o contacto' }
                        },
                        required: ['name', 'date']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'add_task',
                    description: 'Agrega una tarea o to-do a un proyecto específico o a la lista global.',
                    parameters: {
                        type: 'object',
                        properties: {
                            text: { type: 'string', description: 'Descripción de la tarea a realizar' },
                            priority: { type: 'string', enum: ['alta', 'media', 'baja', 'critica'], description: 'Prioridad' },
                            projectId: { type: 'string', description: 'ID del proyecto al que pertenece la tarea (opcional)' },
                            eventId: { type: 'string', description: 'ID del evento al que pertenece la tarea (opcional)' },
                            assignedTo: { type: 'string', description: 'Responsable o agente asignado' },
                            dueDate: { type: 'string', description: 'Fecha límite (YYYY-MM-DD)' }
                        },
                        required: ['text']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_status',
                    description: 'Actualiza el estado, progreso o métrica de un proyecto o evento.',
                    parameters: {
                        type: 'object',
                        properties: {
                            entityType: { type: 'string', enum: ['project', 'event'], description: 'Tipo de entidad' },
                            entityId: { type: 'string', description: 'ID del proyecto o evento' },
                            status: { type: 'string', description: 'Nuevo estado' },
                            progress: { type: 'number', description: 'Porcentaje de avance (0 a 100)' },
                            kpiCurrent: { type: 'number', description: 'Valor actual del KPI' },
                            notes: { type: 'string', description: 'Nota sobre el avance' }
                        },
                        required: ['entityType', 'entityId', 'status']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'add_milestone',
                    description: 'Agrega un hito / milestone a un proyecto existente.',
                    parameters: {
                        type: 'object',
                        properties: {
                            projectId: { type: 'string', description: 'ID del proyecto' },
                            title: { type: 'string', description: 'Título del hito' },
                            deadline: { type: 'string', description: 'Fecha límite (YYYY-MM-DD)' },
                            deliverables: { type: 'array', items: { type: 'string' }, description: 'Lista de entregables' }
                        },
                        required: ['projectId', 'title']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'log_thought',
                    description: 'Registra un pensamiento, reporte de investigación, ejecución de código o actualización de Hermes Agent.',
                    parameters: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', description: 'Mensaje o resumen del log' },
                            level: { type: 'string', enum: ['info', 'success', 'warning', 'action', 'code'], description: 'Nivel o tipo de registro' },
                            projectId: { type: 'string', description: 'ID del proyecto relacionado (opcional)' },
                            details: { type: 'string', description: 'Detalle extendido, salida de comando o código generado' }
                        },
                        required: ['message']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'add_note',
                    description: 'Crea una nota o documento rápido en el sistema.',
                    parameters: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', description: 'Título de la nota' },
                            text: { type: 'string', description: 'Contenido markdown de la nota' },
                            category: { type: 'string', description: 'Categoría' },
                            projectId: { type: 'string', description: 'ID del proyecto relacionado (opcional)' }
                        },
                        required: ['title', 'text']
                    }
                }
            }
        ]
    });
});

// 2. Get full state snapshot for OpenClaw Super Agent
app.get(['/api/openclaw/state', '/api/hermes/state'], (req, res) => {
    const db = readDB();
    const logs = db.openclawLogs || db.hermesLogs || [];
    res.json({
        timestamp: new Date().toISOString(),
        agent: 'OpenClaw Super Agent',
        counts: {
            projects: (db.projects || []).length,
            events: (db.events || []).length,
            tasks: (db.tasks || []).length,
            notes: (db.notes || []).length,
            contacts: (db.contacts || []).length
        },
        projects: db.projects || [],
        events: db.events || [],
        tasks: (db.tasks || []).filter(t => !t.done),
        recentCompletedTasks: (db.tasks || []).filter(t => t.done).slice(0, 10),
        notes: (db.notes || []).slice(0, 20),
        ideas: db.ideas || [],
        socialMedia: db.socialMedia || [],
        contacts: (db.contacts || []).slice(0, 30),
        recentActivity: (db.activityFeed || []).slice(0, 25),
        openclawLogs: logs.slice(0, 30),
        hermesLogs: logs.slice(0, 30)
    });
});

// 3. OpenClaw Logs endpoint
app.get(['/api/openclaw/logs', '/api/hermes/logs'], (req, res) => {
    const db = readDB();
    res.json(db.openclawLogs || db.hermesLogs || []);
});

app.delete(['/api/openclaw/logs', '/api/hermes/logs'], (req, res) => {
    const db = readDB();
    db.openclawLogs = [];
    db.hermesLogs = [];
    writeDB(db);
    res.json({ success: true, message: 'OpenClaw logs cleared' });
});

// 4. OpenClaw Action / Webhook handler
app.post(['/api/openclaw/action', '/api/openclaw/webhook', '/api/hermes/action', '/api/hermes/webhook'], (req, res) => {
    const db = readDB();
    if (!db.openclawLogs) db.openclawLogs = [];
    if (!db.hermesLogs) db.hermesLogs = db.openclawLogs;
    if (!db.activityFeed) db.activityFeed = [];
    if (!db.projects) db.projects = [];
    if (!db.events) db.events = [];
    if (!db.tasks) db.tasks = [];
    if (!db.notes) db.notes = [];

    const { action, payload, tool, arguments: toolArgs } = req.body;
    const actionName = action || tool || req.body.name;
    const data = payload || toolArgs || req.body.data || req.body;

    const logEntry = {
        id: `olog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: actionName || 'general_interaction',
        timestamp: new Date().toISOString(),
        source: 'OpenClaw Super Agent',
        data: data,
        status: 'success'
    };

    try {
        let result = {};

        switch (actionName) {
            case 'create_project': {
                const category = data.category || 'software';
                const newProject = {
                    id: data.id || `proj-${Date.now()}`,
                    name: data.name || 'Nuevo Proyecto Hermes',
                    description: data.description || '',
                    category: category,
                    type: data.type || (category === 'software' ? 'software' : category === 'business' ? 'business' : category === 'ai_pipeline' ? 'ai_pipeline' : 'project'),
                    templateKey: data.templateKey || (category === 'software' ? 'project_software' : category === 'business' ? 'project_business' : category === 'ai_pipeline' ? 'project_hermes' : 'project_custom'),
                    status: data.status || 'active',
                    priority: data.priority || 'high',
                    deadline: data.deadline || '',
                    budget: data.budget || '0',
                    techStack: Array.isArray(data.techStack) ? data.techStack : (typeof data.techStack === 'string' ? data.techStack.split(',').map(s => s.trim()) : ['Hermes Agent', 'React', 'Node.js']),
                    githubRepo: data.githubRepo || '',
                    leadAgent: data.leadAgent || 'Hermes Agent',
                    milestones: Array.isArray(data.milestones) ? data.milestones.map((m, i) => ({ id: `m-${i+1}`, title: m.title || m.name || m, deadline: m.deadline || '', done: !!m.done, deliverables: m.deliverables || [] })) : [
                        { id: 'm-1', title: 'Definición de arquitectura y roadmap', done: true, deadline: '' },
                        { id: 'm-2', title: 'Desarrollo del Core MVP', done: false, deadline: data.deadline || '' },
                        { id: 'm-3', title: 'Pruebas y despliegue inicial', done: false, deadline: '' }
                    ],
                    tasks: Array.isArray(data.tasks) ? data.tasks : [],
                    tags: Array.isArray(data.tags) ? data.tags : ['Hermes', 'Proyecto'],
                    activityLog: [
                        { id: `log-${Date.now()}`, text: `🚀 Proyecto creado e inicializado por Hermes Agent`, time: new Date().toLocaleTimeString(), type: 'created' }
                    ],
                    createdAt: new Date().toISOString()
                };

                db.projects.unshift(newProject);
                
                // Also duplicate to db.events for unified Hub rendering if needed
                const mirrorEvent = {
                    id: newProject.id,
                    name: newProject.name,
                    description: newProject.description,
                    category: 'project',
                    type: newProject.type,
                    templateKey: newProject.templateKey,
                    status: newProject.status,
                    priority: newProject.priority,
                    date: newProject.deadline || new Date().toISOString().split('T')[0],
                    budget: newProject.budget,
                    estimatedBudget: newProject.budget,
                    organizer: newProject.leadAgent,
                    techStack: newProject.techStack,
                    githubRepo: newProject.githubRepo,
                    milestones: newProject.milestones,
                    color: category === 'software' ? '#6366f1' : category === 'business' ? '#10b981' : category === 'ai_pipeline' ? '#8b5cf6' : '#ec4899',
                    icon: category === 'software' ? '💻' : category === 'business' ? '💼' : category === 'ai_pipeline' ? '🤖' : '🚀',
                    agenda: newProject.milestones.map((m, i) => ({ id: `ag-${i+1}`, time: '09:00', title: m.title, speaker: newProject.leadAgent, description: 'Hito del proyecto' })),
                    requirements: (newProject.techStack || []).map((t, i) => ({ id: `req-${i+1}`, name: `Configuración: ${t}`, done: false }))
                };
                
                const existingEvIdx = db.events.findIndex(e => e.id === mirrorEvent.id);
                if (existingEvIdx >= 0) db.events[existingEvIdx] = mirrorEvent;
                else db.events.unshift(mirrorEvent);

                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    text: `🤖 Hermes Agent creó el proyecto "${newProject.name}"`,
                    color: '#8b5cf6',
                    timestamp: new Date().toISOString()
                });

                result = { success: true, project: newProject, mirrorEvent };
                break;
            }

            case 'create_event': {
                const newEvent = {
                    id: data.id || `ev-${Date.now()}`,
                    name: data.name || 'Nuevo Evento Hermes',
                    date: data.date || new Date().toISOString().split('T')[0],
                    time: data.time || '20:00',
                    location: data.location || '',
                    type: data.type || 'eventos',
                    templateKey: data.templateKey || data.type || 'eventos',
                    category: 'event',
                    status: data.status || 'planning',
                    description: data.description || '',
                    budget: data.budget || '0',
                    estimatedBudget: data.budget || '0',
                    capacity: data.capacity || '',
                    organizer: data.organizer || 'Hermes Agent',
                    color: data.color || '#f43f5e',
                    icon: data.icon || '🎉',
                    agenda: Array.isArray(data.agenda) ? data.agenda : [
                        { id: 'ag-1', time: '20:00', title: 'Inicio del evento', speaker: 'Hermes / Staff', description: 'Apertura' }
                    ],
                    requirements: Array.isArray(data.requirements) ? data.requirements : []
                };

                db.events.unshift(newEvent);

                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    text: `🎉 Hermes Agent agendó el evento "${newEvent.name}" (${newEvent.date})`,
                    color: '#f43f5e',
                    timestamp: new Date().toISOString()
                });

                result = { success: true, event: newEvent };
                break;
            }

            case 'add_task': {
                const newTask = {
                    id: data.id || `task-${Date.now()}`,
                    text: data.text || 'Nueva tarea creada por Hermes',
                    priority: data.priority || 'media',
                    done: false,
                    projectId: data.projectId || null,
                    eventId: data.eventId || null,
                    assignedTo: data.assignee || data.assignedTo || 'GG',
                    assignee: data.assignee || data.assignedTo || 'GG',
                    dueDate: data.dueDate || null,
                    createdAt: new Date().toISOString()
                };

                db.tasks.unshift(newTask);

                if (data.projectId) {
                    const pIdx = db.projects.findIndex(p => p.id === data.projectId);
                    if (pIdx >= 0) {
                        if (!db.projects[pIdx].tasks) db.projects[pIdx].tasks = [];
                        db.projects[pIdx].tasks.push({ id: newTask.id, text: newTask.text, done: false });
                    }
                }

                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    text: `📋 Hermes Agent añadió tarea: "${newTask.text}"`,
                    color: '#06b6d4',
                    timestamp: new Date().toISOString()
                });

                result = { success: true, task: newTask };
                break;
            }

            case 'add_milestone': {
                const { projectId, title, deadline, deliverables } = data;
                const p = db.projects.find(pr => pr.id === projectId);
                const ev = db.events.find(e => e.id === projectId);

                const newMilestone = {
                    id: `m-${Date.now()}`,
                    title: title || 'Nuevo Hito',
                    deadline: deadline || '',
                    done: false,
                    deliverables: deliverables || []
                };

                if (p) {
                    if (!p.milestones) p.milestones = [];
                    p.milestones.push(newMilestone);
                }
                if (ev) {
                    if (!ev.milestones) ev.milestones = [];
                    ev.milestones.push(newMilestone);
                }

                result = { success: true, milestone: newMilestone };
                break;
            }

            case 'update_status': {
                const { entityType, entityId, status, progress, kpiCurrent, notes: updateNotes } = data;
                let target = null;
                if (entityType === 'project' || !entityType) {
                    target = db.projects.find(p => p.id === entityId);
                }
                if (!target && (entityType === 'event' || !entityType)) {
                    target = db.events.find(e => e.id === entityId);
                }

                if (target) {
                    if (status) target.status = status;
                    if (progress !== undefined) target.progress = progress;
                    if (kpiCurrent !== undefined && target.kpi) target.kpi.current = kpiCurrent;
                    if (updateNotes) target.notes = (target.notes ? target.notes + '\n' : '') + `\n[Hermes ${new Date().toLocaleTimeString()}]: ${updateNotes}`;
                    
                    db.activityFeed.unshift({
                        id: `act-${Date.now()}`,
                        text: `🔄 Hermes actualizó estado de "${target.name}" a [${status || 'progreso'}]`,
                        color: '#3b82f6',
                        timestamp: new Date().toISOString()
                    });
                    result = { success: true, entity: target };
                } else {
                    result = { success: false, error: `Entidad ${entityId} no encontrada` };
                }
                break;
            }

            case 'log_thought':
            case 'log_activity': {
                const thought = {
                    id: `th-${Date.now()}`,
                    message: data.message || data.text || 'Ejecución Hermes',
                    level: data.level || 'info',
                    details: data.details || '',
                    projectId: data.projectId || null,
                    timestamp: new Date().toISOString()
                };

                logEntry.thought = thought;

                const colorMap = {
                    info: '#8b5cf6',
                    success: '#10b981',
                    warning: '#f59e0b',
                    action: '#ec4899',
                    code: '#3b82f6'
                };

                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    text: `🧠 [Hermes]: ${thought.message}`,
                    color: colorMap[thought.level] || '#8b5cf6',
                    timestamp: new Date().toISOString()
                });

                result = { success: true, log: thought };
                break;
            }

            case 'add_note': {
                const newNote = {
                    id: data.id || `note-${Date.now()}`,
                    title: data.title || 'Nota de Hermes',
                    text: data.text || data.content || '',
                    category: data.category || 'Hermes AI',
                    projectId: data.projectId || null,
                    date: new Date().toISOString().split('T')[0]
                };

                db.notes.unshift(newNote);
                result = { success: true, note: newNote };
                break;
            }

            default: {
                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    text: `🤖 Hermes Agent ejecutó acción: ${actionName}`,
                    color: '#8b5cf6',
                    timestamp: new Date().toISOString()
                });
                result = { success: true, message: `Action ${actionName} received and logged`, payload: data };
                break;
            }
        }

        db.activityFeed = db.activityFeed.slice(0, 50);
        db.hermesLogs.unshift(logEntry);
        db.hermesLogs = db.hermesLogs.slice(0, 50);

        writeDB(db);

        return res.status(200).json({
            status: 'ok',
            agent: 'Hermes Agent',
            action: actionName,
            result
        });

    } catch (err) {
        console.error('[Hermes Bridge] Error processing action:', err);
        logEntry.status = 'error';
        logEntry.error = err.message;
        db.hermesLogs.unshift(logEntry);
        writeDB(db);
        return res.status(500).json({ error: err.message, status: 'error' });
    }
});

// Helper para ejecutar acciones de OpenClaw Super Agent reutilizable en API y Chat
function executeOpenClawAction(actionName, data, db) {
    if (!db.openclawLogs) db.openclawLogs = [];
    if (!db.hermesLogs) db.hermesLogs = db.openclawLogs;
    if (!db.activityFeed) db.activityFeed = [];
    if (!db.projects) db.projects = [];
    if (!db.events) db.events = [];
    if (!db.tasks) db.tasks = [];
    if (!db.notes) db.notes = [];

    const logEntry = {
        id: `olog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: actionName,
        timestamp: new Date().toISOString(),
        source: 'OpenClaw Super Agent',
        data: data || {},
        status: 'success'
    };

    let result = null;

    switch (actionName) {
        case 'create_project': {
            const category = data.category || 'software';
            const newProject = {
                id: data.id || `proj-${Date.now()}`,
                name: data.name || 'Nuevo Proyecto OpenClaw',
                description: data.description || '',
                category: category,
                type: data.type || category,
                templateKey: `project_${category}`,
                status: data.status || 'active',
                priority: data.priority || 'high',
                deadline: data.deadline || '',
                budget: data.budget || '0',
                techStack: Array.isArray(data.techStack) ? data.techStack : (typeof data.techStack === 'string' ? data.techStack.split(',').map(s => s.trim()) : ['OpenClaw Agent', 'React', 'Node.js']),
                githubRepo: data.githubRepo || '',
                leadAgent: data.leadAgent || 'OpenClaw Super Agent',
                milestones: Array.isArray(data.milestones) ? data.milestones.map((m, i) => ({ id: `m-${i+1}`, title: m.title || m.name || m, deadline: m.deadline || '', done: !!m.done, deliverables: m.deliverables || [] })) : [
                    { id: 'm-1', title: 'Definición de arquitectura y roadmap', done: true, deadline: '' },
                    { id: 'm-2', title: 'Desarrollo del Core MVP', done: false, deadline: data.deadline || '' },
                    { id: 'm-3', title: 'Pruebas y despliegue inicial', done: false, deadline: '' }
                ],
                tasks: Array.isArray(data.tasks) ? data.tasks : [],
                tags: Array.isArray(data.tags) ? data.tags : ['OpenClaw', 'Proyecto'],
                activityLog: [
                    { id: `log-${Date.now()}`, text: `🚀 Proyecto creado e inicializado por OpenClaw Super Agent`, time: new Date().toLocaleTimeString(), type: 'created' }
                ],
                createdAt: new Date().toISOString()
            };

            db.projects.unshift(newProject);
            
            const mirrorEvent = {
                id: newProject.id,
                name: newProject.name,
                description: newProject.description,
                category: 'project',
                type: newProject.type,
                templateKey: newProject.templateKey,
                status: newProject.status,
                priority: newProject.priority,
                date: newProject.deadline || new Date().toISOString().split('T')[0],
                budget: newProject.budget,
                estimatedBudget: newProject.budget,
                organizer: newProject.leadAgent,
                techStack: newProject.techStack,
                githubRepo: newProject.githubRepo,
                milestones: newProject.milestones,
                color: category === 'software' ? '#6366f1' : category === 'business' ? '#10b981' : category === 'ai_pipeline' ? '#8b5cf6' : '#ec4899',
                icon: category === 'software' ? '💻' : category === 'business' ? '💼' : category === 'ai_pipeline' ? '🤖' : '🚀',
                agenda: newProject.milestones.map((m, i) => ({ id: `ag-${i+1}`, time: '09:00', title: m.title, speaker: newProject.leadAgent, description: 'Hito del proyecto' })),
                requirements: (newProject.techStack || []).map((t, i) => ({ id: `req-${i+1}`, name: `Configuración: ${t}`, done: false }))
            };
            
            const existingEvIdx = db.events.findIndex(e => e.id === mirrorEvent.id);
            if (existingEvIdx >= 0) db.events[existingEvIdx] = mirrorEvent;
            else db.events.unshift(mirrorEvent);

            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🤖 OpenClaw Super Agent creó el proyecto "${newProject.name}"`,
                color: '#8b5cf6',
                timestamp: new Date().toISOString()
            });

            result = { success: true, project: newProject, mirrorEvent };
            break;
        }

        case 'create_event': {
            const newEvent = {
                id: data.id || `ev-${Date.now()}`,
                name: data.name || 'Nuevo Evento OpenClaw',
                date: data.date || new Date().toISOString().split('T')[0],
                time: data.time || '20:00',
                location: data.location || '',
                type: data.type || 'eventos',
                templateKey: data.templateKey || data.type || 'eventos',
                category: 'event',
                status: data.status || 'planning',
                description: data.description || '',
                budget: data.budget || '0',
                estimatedBudget: data.budget || '0',
                capacity: data.capacity || '',
                organizer: data.organizer || 'OpenClaw Super Agent',
                color: data.color || '#f43f5e',
                icon: data.icon || '🎉',
                agenda: Array.isArray(data.agenda) ? data.agenda : [
                    { id: 'ag-1', time: '20:00', title: 'Inicio del evento', speaker: 'OpenClaw / Staff', description: 'Apertura' }
                ],
                requirements: Array.isArray(data.requirements) ? data.requirements : []
            };

            db.events.unshift(newEvent);

            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🎉 OpenClaw Super Agent agendó el evento "${newEvent.name}" (${newEvent.date})`,
                color: '#f43f5e',
                timestamp: new Date().toISOString()
            });

            result = { success: true, event: newEvent };
            break;
        }

        case 'add_task': {
            const newTask = {
                id: data.id || `task-${Date.now()}`,
                text: data.text || data.title || 'Nueva tarea creada por OpenClaw',
                title: data.text || data.title || 'Nueva tarea creada por OpenClaw',
                priority: data.priority || 'media',
                category: data.category || 'General',
                done: false,
                status: 'todo',
                projectId: data.projectId || null,
                eventId: data.eventId || null,
                assignedTo: data.assignee || data.assignedTo || 'GG',
                assignee: data.assignee || data.assignedTo || 'GG',
                dueDate: data.dueDate || null,
                createdAt: new Date().toISOString()
            };

            db.tasks.unshift(newTask);

            if (data.projectId) {
                const pIdx = db.projects.findIndex(p => p.id === data.projectId);
                if (pIdx >= 0) {
                    if (!db.projects[pIdx].tasks) db.projects[pIdx].tasks = [];
                    db.projects[pIdx].tasks.push({ id: newTask.id, text: newTask.text, done: false });
                }
            }

            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `📋 OpenClaw Super Agent añadió tarea: "${newTask.text}"`,
                color: '#06b6d4',
                timestamp: new Date().toISOString()
            });

            result = { success: true, task: newTask };
            break;
        }

        case 'create_client_post': {
            const newPost = {
                id: `post-${Date.now()}`,
                project: data.clientName || 'ARRIVE Client',
                format: data.format || 'Reel 9:16',
                title: data.title || 'Nueva Publicación',
                hook: data.hook || 'Producido por ARRIVE Agency',
                caption: data.caption || '',
                date: data.date || new Date().toISOString().split('T')[0],
                status: 'Listo para Publicar'
            };
            if (!db.socialMedia) db.socialMedia = [];
            db.socialMedia.unshift(newPost);
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🎬 Post/Reel programado por Agente para ${newPost.project}: "${newPost.title}"`,
                color: '#fbbf24',
                timestamp: new Date().toISOString()
            });
            result = { success: true, post: newPost };
            break;
        }

        case 'update_client_rag': {
            const ns = data.clientId || data.namespace || 'default';
            if (!db.ragDocuments) db.ragDocuments = [];
            const doc = {
                id: `rag-doc-${Date.now()}`,
                filename: data.title || `Intel de ${data.clientName || 'Cliente'}`,
                title: data.title || `Intel de ${data.clientName || 'Cliente'}`,
                content: data.content || '',
                category: 'client_intel',
                namespace: ns,
                addedAt: new Date().toISOString()
            };
            db.ragDocuments.unshift(doc);
            const RAGEngine = app.get('ragEngine') || EmbeddedRAGEngine;
            if (RAGEngine) {
                RAGEngine.indexCustomDocument(doc.id, doc.title, doc.content, 'client_intel', {}, ns).catch(() => null);
            }
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🧠 Conocimiento RAG indexado para ${data.clientName || ns}: "${doc.title}"`,
                color: '#c084fc',
                timestamp: new Date().toISOString()
            });
            result = { success: true, document: doc };
            break;
        }

        case 'complete_task':
        case 'toggle_task': {
            const taskId = data.id || data.taskId;
            let found = null;
            if (taskId) {
                found = db.tasks.find(t => t.id === taskId);
            }
            if (!found && (data.text || data.title)) {
                const q = (data.text || data.title).toLowerCase();
                found = db.tasks.find(t => (t.text && t.text.toLowerCase().includes(q)) || (t.title && t.title.toLowerCase().includes(q)));
            }

            if (found) {
                found.done = true;
                found.status = 'done';
                db.activityFeed.unshift({
                    id: `act-${Date.now()}`,
                    text: `🎯 OpenClaw Super Agent completó la tarea: "${found.text || found.title}"`,
                    color: '#10b981',
                    timestamp: new Date().toISOString()
                });
                result = { success: true, task: found, id: found.id };
            } else {
                result = { success: false, error: 'Tarea no encontrada' };
            }
            break;
        }

        case 'add_milestone': {
            const { projectId, title, deadline, deliverables } = data;
            const newMilestone = {
                id: `m-${Date.now()}`,
                title: title || 'Nuevo Hito',
                deadline: deadline || '',
                done: false,
                deliverables: deliverables || []
            };

            if (projectId) {
                const pIdx = db.projects.findIndex(p => p.id === projectId);
                if (pIdx >= 0) {
                    if (!db.projects[pIdx].milestones) db.projects[pIdx].milestones = [];
                    db.projects[pIdx].milestones.push(newMilestone);
                }
                const eIdx = db.events.findIndex(e => e.id === projectId);
                if (eIdx >= 0) {
                    if (!db.events[eIdx].milestones) db.events[eIdx].milestones = [];
                    db.events[eIdx].milestones.push(newMilestone);
                }
            }

            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🗺️ Hermes Agent añadió hito: "${newMilestone.title}"`,
                color: '#10b981',
                timestamp: new Date().toISOString()
            });

            result = { success: true, milestone: newMilestone };
            break;
        }

        case 'log_thought': {
            const thought = {
                id: `thought-${Date.now()}`,
                message: data.message || data.text || 'Pensamiento registrado',
                level: data.level || 'info',
                details: data.details || '',
                projectId: data.projectId || null,
                timestamp: new Date().toISOString()
            };

            logEntry.thought = thought;
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🧠 Hermes: ${thought.message}`,
                color: '#8b5cf6',
                timestamp: new Date().toISOString()
            });

            result = { success: true, log: thought };
            break;
        }

        case 'add_note': {
            const newNote = {
                id: data.id || `note-${Date.now()}`,
                title: data.title || 'Nota de Hermes',
                text: data.text || data.content || '',
                category: data.category || 'Hermes AI',
                projectId: data.projectId || null,
                date: new Date().toISOString().split('T')[0]
            };

            db.notes.unshift(newNote);
            result = { success: true, note: newNote };
            break;
        }

        default: {
            db.activityFeed.unshift({
                id: `act-${Date.now()}`,
                text: `🤖 OpenClaw Agent ejecutó acción: ${actionName}`,
                color: '#8b5cf6',
                timestamp: new Date().toISOString()
            });
            result = { success: true, message: `Action ${actionName} received and logged`, payload: data };
            break;
        }
    }

    db.activityFeed = db.activityFeed.slice(0, 50);
    db.openclawLogs.unshift(logEntry);
    db.openclawLogs = db.openclawLogs.slice(0, 50);
    db.hermesLogs = db.openclawLogs;
    writeDB(db);

    return result;
}

const executeHermesAction = executeOpenClawAction;

// 5. OpenClaw & Gemini Config Endpoints
app.get('/api/openclaw/config', (req, res) => {
    const db = readDB();
    const config = db.openclawConfig || db.hermesConfig || {
        baseUrl: 'http://localhost:18789/v1',
        chatUrl: '/api/openclaw/chat',
        model: 'gemini-3.6-flash',
        apiKey: ''
    };
    res.json(publicConfig(config));
});

// Nunca devolver claves guardadas al navegador; solo si existen.
function publicConfig(config = {}) {
    const { geminiApiKey, apiKey, ...rest } = config;
    return { ...rest, hasGeminiApiKey: !!geminiApiKey, hasApiKey: !!apiKey };
}

app.post('/api/openclaw/config', (req, res) => {
    const db = readDB();
    db.openclawConfig = { ...(db.openclawConfig || {}), ...req.body };
    writeDB(db);
    res.json({ success: true, config: publicConfig(db.openclawConfig) });
});

// Gemini Specific Config Endpoints
app.post('/api/openclaw/gemini/config', (req, res) => {
    const db = readDB();
    if (!db.openclawConfig) db.openclawConfig = {};
    if (req.body.geminiApiKey !== undefined) {
        db.openclawConfig.geminiApiKey = (req.body.geminiApiKey || '').trim();
    }
    writeDB(db);
    const activeKey = process.env.GEMINI_API_KEY || db.openclawConfig.geminiApiKey;
    res.json({
        success: true,
        geminiActive: !!activeKey,
        model: 'gemini-3.6-flash'
    });
});

app.get('/api/openclaw/gemini/status', (req, res) => {
    const db = readDB();
    const activeKey = process.env.GEMINI_API_KEY || db.openclawConfig?.geminiApiKey;
    res.json({
        configured: !!activeKey,
        active: !!activeKey,
        model: 'gemini-3.6-flash',
        provider: 'Google Gemini'
    });
});

// Backward compatibility alias for Hermes config
app.get('/api/hermes/config', (req, res) => {
    const db = readDB();
    res.json(publicConfig(db.openclawConfig || db.hermesConfig || {}));
});
app.post('/api/hermes/config', (req, res) => {
    const db = readDB();
    db.openclawConfig = { ...(db.openclawConfig || {}), ...req.body };
    db.hermesConfig = db.openclawConfig;
    writeDB(db);
    res.json({ success: true, config: publicConfig(db.openclawConfig) });
});

// 6. OpenClaw Health Check Endpoint
app.get(['/api/openclaw/health', '/api/hermes/health'], async (req, res) => {
    const db = readDB();
    const geminiKey = process.env.GEMINI_API_KEY || db.openclawConfig?.geminiApiKey;
    
    return res.json({
        online: true,
        mode: geminiKey ? 'gemini_3.6_flash' : 'embedded_orchestrator',
        latencyMs: 1,
        model: geminiKey ? 'gemini-3.6-flash' : 'openclaw-agent',
        status: 'ready',
        geminiActive: !!geminiKey,
        label: geminiKey ? 'OpenClaw Super Agent (Gemini 3.6 Flash)' : 'OpenClaw Super Agent (Orquestador Embebido + RAG)'
    });
});

// 6.5 Shared Chat History Endpoints (Synchronizes Copilot, Workspace and AgentBrain)
app.get('/api/openclaw/chat/history', (req, res) => {
    const db = readDB();
    res.json(db.openclawChatHistory || []);
});

app.post('/api/openclaw/chat/history', (req, res) => {
    const db = readDB();
    const { messages } = req.body;
    if (Array.isArray(messages)) {
        db.openclawChatHistory = messages.slice(-100);
        writeDB(db);
    }
    res.json({ success: true, count: (db.openclawChatHistory || []).length });
});

app.delete('/api/openclaw/chat/history', (req, res) => {
    const db = readDB();
    db.openclawChatHistory = [];
    writeDB(db);
    res.json({ success: true, message: 'OpenClaw chat history cleared' });
});

// 7. OpenClaw Live Chat with Gemini 3.6 Flash, Tool Calling & RAG Knowledge Injection
async function handleOpenClawChat(req, res) {
    const db = readDB();
    const { prompt, history = [], systemRole, skills, namespace = 'default' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt es requerido' });

    // Determine Gemini API Key
    const geminiApiKey = req.body.geminiApiKey || process.env.GEMINI_API_KEY || db.openclawConfig?.geminiApiKey || '';

    // Inyectar RAG Knowledge
    let ragContext = '';
    const ragEngine = req.app.get('ragEngine') || EmbeddedRAGEngine;
    const ragSearchResult = ragEngine.query(prompt, namespace, 4);
    if (ragSearchResult && ragSearchResult.sources && ragSearchResult.sources.length > 0) {
        ragContext = ragSearchResult.context;
    }

    // Inyectar Contexto Operativo en Tiempo Real
    const liveProjects = (db.projects || []).map(p => ({ id: p.id, name: p.name, status: p.status, priority: p.priority }));
    const liveEvents = (db.events || []).map(e => ({ id: e.id, name: e.name, date: e.date, status: e.status, location: e.location, budget: e.budget }));
    const pendingTasks = (db.tasks || []).filter(t => !t.done).slice(0, 20).map(t => ({ id: t.id, text: t.text || t.title, priority: t.priority }));

    // Inyectar Clientes y Marcas de ARRIVE Agency
    const arriveClients = (db.projects || []).filter(p => p.agency === 'arrive' || p.isClient || p.id?.startsWith('client-')).map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry || 'Marca',
        slogan: c.slogan || '',
        lead: c.lead || 'GG',
        tone: c.brand?.toneOfVoice || '',
        dos: c.brand?.dos || '',
        donts: c.brand?.donts || ''
    }));

    const systemMessageContent = `Eres OpenClaw Super Agent, el orquestador autónomo maestro y cerebro central del Command Center & Dashboard de Eventos y ARRIVE Agency.
Tienes acceso total para gestionar eventos (Terraplén Rooftop, Furia, Piano Bar, etc.), marcas clientes, proyectos, finanzas, tareas, redes sociales, promotores y modelos Image Girls.

[SKILLS Y DIRECTIVAS]:
${skills || 'Actúa con precisión, proactividad y liderazgo. Responde en español estructurado y ejecuta acciones en el sistema siempre que el usuario lo solicite.'}

[BASE DE CONOCIMIENTOS RAG DE OPENCLAW]:
${ragContext || 'No se requirieron documentos adicionales para esta consulta.'}

[MARCAS Y CLIENTES ACTIVOS DE ARRIVE AGENCY]:
${arriveClients.length > 0 ? JSON.stringify(arriveClients) : 'Terraplén Rooftop, Furia Panamá, Piano Bar Casco'}
Tienes conocimiento de cada marca de ARRIVE Agency. Si el usuario te pide crear un post, Reel, o estrategia para una de estas marcas, adopta fielmente su tono de voz y sus reglas de comunicación (Do's y Don'ts).

[ESTADO EN VIVO DEL DASHBOARD]:
- Eventos Activos (${liveEvents.length}): ${JSON.stringify(liveEvents.slice(0, 10))}
- Proyectos (${liveProjects.length}): ${JSON.stringify(liveProjects)}
- Tareas Pendientes (${pendingTasks.length}): ${JSON.stringify(pendingTasks)}
- Miembros del Equipo Asignables: GG, JOSHUA, MARIO, ANDREA, FANNY, JEIKOB, FIVVR.

${systemRole || ''}`;

    // ─── 1. INTEGRACIÓN CON GOOGLE GEMINI (Multi-Model Resiliente con Fast Fallback) ───
    if (geminiApiKey) {
        const candidateModels = [
            'gemini-3.5-flash-lite',
            'gemini-3.6-flash',
            'gemini-3.1-flash-lite'
        ];

        const geminiContents = [
            ...history.slice(-8).map(h => ({
                role: h.role === 'assistant' || h.role === 'model' || h.role === 'bot' || h.role === 'copilot' ? 'model' : 'user',
                parts: [{ text: h.content || h.text || '' }]
            })),
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ];

        const toolsDeclaration = [
            {
                functionDeclarations: [
                    {
                        name: "create_client_post",
                        description: "Programa o propone una publicación, Reel o carrusel para una marca o cliente de ARRIVE Agency",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                clientName: { type: "STRING", description: "Nombre de la marca o cliente (ej: Terraplén Rooftop, Furia Panamá, Piano Bar)" },
                                title: { type: "STRING", description: "Título o concepto del post o reel" },
                                format: { type: "STRING", enum: ["Reel 9:16", "Carrusel HD", "Story Seq", "TikTok / UGC"], description: "Formato de contenido" },
                                hook: { type: "STRING", description: "Gancho viral de los primeros 3 segundos" },
                                caption: { type: "STRING", description: "Texto o copy sugerido" },
                                date: { type: "STRING", description: "Fecha de publicación (YYYY-MM-DD)" }
                            },
                            required: ["clientName", "title"]
                        }
                    },
                    {
                        name: "add_task",
                        description: "Crea una nueva tarea en el Dashboard de eventos y operaciones",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                text: { type: "STRING", description: "Descripción clara de la tarea" },
                                priority: { type: "STRING", enum: ["high", "medium", "low"], description: "Nivel de prioridad" },
                                category: { type: "STRING", description: "Categoría o evento (ej: Terraplén, Furia, Piano Bar, General)" },
                                assignee: { type: "STRING", enum: ["GG", "JOSHUA", "MARIO", "ANDREA", "FANNY", "JEIKOB", "FIVVR"], description: "Usuario responsable de la tarea: GG, JOSHUA, MARIO, ANDREA, FANNY, JEIKOB, o FIVVR" }
                            },
                            required: ["text"]
                        }
                    },
                    {
                        name: "complete_task",
                        description: "Marca una tarea existente como completada",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                text: { type: "STRING", description: "Nombre o palabra clave de la tarea a marcar como completada" }
                            },
                            required: ["text"]
                        }
                    },
                    {
                        name: "create_event",
                        description: "Agenda un nuevo evento en el calendario y base de eventos",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING", description: "Nombre del evento" },
                                date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
                                location: { type: "STRING", description: "Ubicación del evento" },
                                budget: { type: "STRING", description: "Presupuesto estimado en USD" },
                                description: { type: "STRING", description: "Detalles del evento" }
                            },
                            required: ["name"]
                        }
                    },
                    {
                        name: "create_project",
                        description: "Crea un nuevo proyecto en el Command Center",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING", description: "Nombre del proyecto" },
                                description: { type: "STRING", description: "Objetivo y descripción del proyecto" },
                                category: { type: "STRING", description: "software, business, marketing o eventos" }
                            },
                            required: ["name"]
                        }
                    }
                ]
            }
        ];

        for (const modelName of candidateModels) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const geminiRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: geminiContents,
                        systemInstruction: {
                            parts: [{ text: systemMessageContent }]
                        },
                        tools: toolsDeclaration,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1200
                        }
                    })
                });
                clearTimeout(timeoutId);

                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    const candidate = geminiData.candidates && geminiData.candidates[0];
                    if (candidate && candidate.content && candidate.content.parts) {
                        const executedTools = [];
                        let replyText = '';

                        for (const part of candidate.content.parts) {
                            if (part.text) {
                                replyText += (replyText ? '\n\n' : '') + part.text;
                            }
                            if (part.functionCall) {
                                const call = part.functionCall;
                                const toolResult = executeOpenClawAction(call.name, call.args || {}, db);
                                executedTools.push({ name: call.name, args: call.args || {}, result: toolResult });
                            }
                        }

                        if (!replyText && executedTools.length > 0) {
                            replyText = `✅ **OpenClaw Super Agent (${modelName})** ejecutó ${executedTools.length} acción(es) solicitada(s) correctamente.`;
                        }

                        // Sincronizar en historial compartido
                        if (!db.openclawChatHistory) db.openclawChatHistory = [];
                        db.openclawChatHistory.push({
                            id: `usr-${Date.now()}`,
                            role: 'user',
                            text: prompt,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                        db.openclawChatHistory.push({
                            id: `bot-${Date.now()}`,
                            role: 'copilot',
                            text: replyText,
                            model: modelName,
                            provider: `Google ${modelName}`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            executedTools
                        });
                        writeDB(db);

                        return res.json({
                            reply: replyText,
                            executedTools,
                            model: modelName,
                            provider: `Google Gemini (${modelName})`,
                            usage: geminiData.usageMetadata || null
                        });
                    }
                } else {
                    const errStatus = geminiRes.status;
                    const errText = await geminiRes.text();
                    console.warn(`[Gemini API] Modelo ${modelName} devolvió ${errStatus}, intentando siguiente fallback...`, errText.slice(0, 150));
                }
            } catch (modelErr) {
                console.warn(`[Gemini API] Excepción en ${modelName}, intentando siguiente fallback...`, modelErr.message);
            }
        }
    }

    // ─── 2. MODO AUTÓNOMO EMBEBIDO OPENCLAW (Fallback 100% Funcional) ───
    const executedTools = [];
    const pLower = prompt.toLowerCase();
    let replyText = '';

    if (pLower.includes('crea') && (pLower.includes('proyecto') || pLower.includes('project'))) {
        const projNameMatch = prompt.match(/(?:proyecto|project)\s+(?:llamado\s+|de\s+|para\s+|titulado\s+)?["']?([^"',.\n]+)["']?/i);
        const name = projNameMatch ? projNameMatch[1].trim() : 'Nuevo Proyecto OpenClaw';
        const newProj = executeHermesAction('create_project', {
            name,
            description: `Proyecto planificado por OpenClaw Super Agent en base a la instrucción: "${prompt}"`,
            category: pLower.includes('software') || pLower.includes('app') ? 'software' : pLower.includes('marketing') ? 'marketing' : 'business',
            priority: pLower.includes('urgente') || pLower.includes('critico') ? 'critical' : 'high',
            techStack: ['React', 'Node.js', 'OpenClaw RAG']
        }, db);
        executedTools.push({ name: 'create_project', args: { name }, result: newProj });
        replyText = `🚀 **Proyecto "${name}" creado exitosamente** en el Command Center. He configurado la estructura inicial, hitos de desarrollo y registrado la actividad en el sistema.`;

    } else if (pLower.includes('crea') && (pLower.includes('evento') || pLower.includes('event'))) {
        const evMatch = prompt.match(/(?:evento|event)\s+(?:llamado\s+|de\s+|para\s+|titulado\s+)?["']?([^"',.\n]+)["']?/i);
        const name = evMatch ? evMatch[1].trim() : 'Nuevo Evento OpenClaw';
        const newEv = executeHermesAction('create_event', {
            name,
            description: `Evento agendado por OpenClaw Super Agent: "${prompt}"`,
            date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
            category: 'event'
        }, db);
        executedTools.push({ name: 'create_event', args: { name }, result: newEv });
        replyText = `🎉 **Evento "${name}" agendado con éxito**. Puedes ver los detalles, fecha y asignación en la pestaña de Eventos y en el Calendario.`;

    } else if (pLower.includes('completa') || pLower.includes('completar') || pLower.includes('terminé') || pLower.includes('marcar como hecha')) {
        const matchText = prompt.replace(/(?:completa|completar|terminé|marcar como hecha)\s+(?:la\s+)?(?:tarea\s+)?(?:de\s+|para\s+)?/i, '').trim();
        const resTask = executeHermesAction('complete_task', { text: matchText }, db);
        if (resTask.success) {
            executedTools.push({ name: 'complete_task', args: { text: matchText }, result: resTask });
            replyText = `🎯 **Tarea completada exitosamente:** "${resTask.task.text || resTask.task.title}". El progreso en el Dashboard ha sido actualizado.`;
        } else {
            replyText = `⚠️ No encontré una tarea pendiente que coincida con "${matchText}".`;
        }

    } else if (pLower.includes('resumen') || pLower.includes('estado') || pLower.includes('status') || pLower.includes('reporte') || pLower.includes('operaciones')) {
        replyText = `📊 **Reporte Ejecutivo de OpenClaw Super Agent**:
- **Eventos Activos**: ${(db.events || []).length} eventos agendados (incluyendo Terraplén Rooftop, Furia y Piano Bar).
- **Proyectos Activos**: ${(db.projects || []).length} proyectos registrados en el portfolio.
- **Tareas Pendientes**: ${(db.tasks || []).filter(t => !t.done).length} tareas en cola de ejecución.
- **Base de Conocimiento RAG**: ${(db.ragDocuments || []).length} documentos y entidades indexadas en namespace "${namespace}".

*El sistema está 100% operativo y sincronizado localmente.*`;

    } else if (pLower.includes('tarea') || pLower.includes('task') || pLower.includes('todo') || pLower.includes('to-do')) {
        const taskTextMatch = prompt.match(/(?:tarea|task|agregar\s+tarea)\s+(?:de\s+|para\s+)?["']?([^"',.\n]+)["']?/i);
        const text = taskTextMatch ? taskTextMatch[1].trim() : prompt;
        const newTask = executeHermesAction('add_task', {
            text,
            priority: pLower.includes('alta') || pLower.includes('urgente') ? 'alta' : 'media',
            assignedTo: 'OpenClaw Super Agent'
        }, db);
        executedTools.push({ name: 'add_task', args: { text }, result: newTask });
        replyText = `📋 **Tarea registrada**: "${text}". Ha sido agregada a la lista de pendientes y asignada a OpenClaw.`;

    } else {
        if (ragSearchResult && ragSearchResult.sources && ragSearchResult.sources.length > 0) {
            replyText = `🧠 **Consulta RAG en Namespace "${namespace}"**:
Encontré **${ragSearchResult.count} referencias** en tu base de conocimientos:

${ragSearchResult.sources.map(s => `- **${s.title}** (${s.category})`).join('\n')}

**Contexto Extraído**:
> ${ragSearchResult.context.slice(0, 320)}...`;
        } else {
            replyText = `⚡ **OpenClaw Super Agent**: He procesado tu solicitud: *"${prompt}"*. 
Todos los subsistemas del Command Center, base de datos local y motor RAG están activos y listos para ejecutar cualquier comando o plan de acción.`;
        }
    }

    return res.json({
        reply: replyText,
        executedTools,
        model: 'openclaw-super-agent-autonomous',
        provider: 'OpenClaw Autonomous Engine',
        usage: { prompt_tokens: prompt.length, completion_tokens: replyText.length, total_tokens: prompt.length + replyText.length }
    });
}

app.post('/api/openclaw/chat', handleOpenClawChat);
app.post('/api/hermes/chat', handleOpenClawChat);

// ─── Orchestrator Engine (Auto-Delegation & Cron) ────────────────
app.post('/api/orchestrator/delegate', (req, res) => {
    const { task, priority } = req.body;
    let { description } = req.body;
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
    } else if (tLower.includes('whatsapp') || tLower.includes('comunidad') || tLower.includes('broadcast') || tLower.includes('difusion') || tLower.includes('cartelera')) {
        assignedAgent = 'Pulse (WhatsApp & Community)';
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
    // Un salto de línea en el valor permitiría inyectar otras variables en .env
    url = String(url || '').replace(/[\r\n]/g, '');
    key = String(key || '').replace(/[\r\n]/g, '');
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
            tableExists: false,
            ephemeralStorage: EPHEMERAL_STORAGE
        });
    }
    if (supabaseConflict) {
        return res.json({
            configured: true,
            url: SUPABASE_URL,
            keyMasked: 'Configurado',
            status: 'conflict',
            tableExists: true,
            error: supabaseConflict.message
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
            console.log('[Supabase Sync Manual] Iniciando PUSH manual (impone la copia local)...');
            const result = await syncToSupabase(readDB(), { force: true });
            if (result.ok) {
                return res.json({ success: true, message: 'Base de datos local guardada exitosamente en Supabase (Push).' });
            }
            return res.status(502).json({ error: `Error al subir a Supabase (${result.reason}).` });
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
                    writeDBFile(rows[0].data);
                    lastSyncedRev = rows[0].data._syncRev || null;
                    supabaseConflict = null;
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

// ─── Native Embedded OpenClaw RAG Engine ────────────────────────
const EmbeddedRAGEngine = {
    async upsertEntity(entityType, entityData, namespace = 'default') {
        try {
            const db = readDB();
            if (!db.ragDocuments) db.ragDocuments = [];
            const docId = `entity-${entityType}-${entityData.id || Date.now()}`;
            
            let title = entityData.name || entityData.title || entityData.text || `${entityType} #${entityData.id}`;
            let content = '';
            if (entityType === 'project' || entityType === 'projects') {
                content = `PROYECTO: ${entityData.name}\nDescripción: ${entityData.description || ''}\nCategoría: ${entityData.category || ''}\nEstado: ${entityData.status || ''}\nPrioridad: ${entityData.priority || ''}\nStack: ${Array.isArray(entityData.techStack) ? entityData.techStack.join(', ') : entityData.techStack || ''}\nLíder: ${entityData.leadAgent || 'Hermes'}\nHitos: ${(entityData.milestones || []).map(m => m.title || m).join(' | ')}`;
            } else if (entityType === 'event' || entityType === 'events') {
                content = `EVENTO: ${entityData.name}\nFecha: ${entityData.date}\nHora: ${entityData.time || ''}\nUbicación: ${entityData.location || ''}\nTipo: ${entityData.type || ''}\nDescripción: ${entityData.description || ''}`;
            } else if (entityType === 'task' || entityType === 'tasks') {
                content = `TAREA: ${entityData.text}\nPrioridad: ${entityData.priority || ''}\nAsignado: ${entityData.assignedTo || ''}\nEstado: ${entityData.done ? 'Completada' : 'Pendiente'}`;
            } else if (entityType === 'note' || entityType === 'notes') {
                content = `NOTA: ${entityData.title || ''}\nContenido: ${entityData.text || entityData.content || ''}\nCategoría: ${entityData.category || ''}`;
            } else {
                content = typeof entityData === 'string' ? entityData : JSON.stringify(entityData);
            }

            const existingIdx = db.ragDocuments.findIndex(d => d.id === docId);
            const docObj = {
                id: docId,
                filename: title,
                title,
                content,
                category: entityType,
                namespace: namespace || 'default',
                updatedAt: new Date().toISOString()
            };

            if (existingIdx >= 0) {
                db.ragDocuments[existingIdx] = docObj;
            } else {
                db.ragDocuments.unshift(docObj);
            }
            writeDB(db);
            return { success: true, documentId: docId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async deleteEntity(entityId) {
        try {
            const db = readDB();
            if (db.ragDocuments) {
                db.ragDocuments = db.ragDocuments.filter(d => !d.id.includes(entityId));
                writeDB(db);
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async indexCustomDocument(docId, title, content, category, extraMetadata, namespace = 'default') {
        const db = readDB();
        if (!db.ragDocuments) db.ragDocuments = [];
        const docObj = {
            id: docId || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            filename: title,
            title: title || 'Sin título',
            content: content || '',
            category: category || 'custom_document',
            namespace: namespace || 'default',
            addedAt: new Date().toISOString()
        };
        db.ragDocuments.unshift(docObj);
        writeDB(db);
        return { success: true, documentId: docObj.id, indexed: true };
    },

    async indexObsidianVault(vaultPath, namespace = 'default') {
        if (!vaultPath || !fs.existsSync(vaultPath)) return { success: false, error: 'Ruta de vault inválida o inexistente' };
        
        function getAllFiles(dirPath, arrayOfFiles = []) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const fullPath = path.join(dirPath, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    if (!file.startsWith('.')) getAllFiles(fullPath, arrayOfFiles);
                } else if (file.endsWith('.md') || file.endsWith('.txt')) {
                    arrayOfFiles.push(fullPath);
                }
            });
            return arrayOfFiles;
        }

        const files = getAllFiles(vaultPath);
        const db = readDB();
        if (!db.ragDocuments) db.ragDocuments = [];
        let count = 0;

        for (const f of files) {
            const content = fs.readFileSync(f, 'utf-8');
            const fname = path.basename(f);
            const docId = `obsidian-${fname.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            
            const existing = db.ragDocuments.findIndex(d => d.id === docId);
            const docObj = {
                id: docId,
                filename: fname,
                title: fname,
                content,
                category: 'obsidian_vault',
                namespace: namespace || 'default',
                path: f,
                updatedAt: new Date().toISOString()
            };
            if (existing >= 0) db.ragDocuments[existing] = docObj;
            else db.ragDocuments.push(docObj);
            count++;
        }
        writeDB(db);
        return { success: true, count };
    },

    async indexAllData() {
        const db = readDB();
        if (!db.ragDocuments) db.ragDocuments = [];
        
        let count = 0;
        (db.projects || []).forEach(p => { this.upsertEntity('project', p, 'default'); count++; });
        (db.events || []).forEach(e => { this.upsertEntity('event', e, 'default'); count++; });
        (db.tasks || []).forEach(t => { this.upsertEntity('task', t, 'default'); count++; });
        (db.notes || []).forEach(n => { this.upsertEntity('note', n, 'default'); count++; });

        return { success: true, indexed: count, total: db.ragDocuments.length };
    },

    async query(question, topK = 5, historyContext = [], namespace = 'default') {
        const db = readDB();
        const allDocs = (db.ragDocuments || []).concat(db.customDocuments || []);
        const filteredDocs = allDocs.filter(d => !namespace || namespace === 'default' || d.namespace === namespace || !d.namespace);

        if (!question || filteredDocs.length === 0) {
            return {
                answer: 'No hay documentos en la base de conocimientos RAG de OpenClaw para este namespace.',
                sources: [],
                count: 0
            };
        }

        const terms = question.toLowerCase().split(/\W+/).filter(w => w.length > 2);
        
        const scored = filteredDocs.map(doc => {
            const fullText = `${doc.title || doc.filename || ''} ${doc.content || ''}`.toLowerCase();
            let score = 0;
            for (const t of terms) {
                const matches = (fullText.match(new RegExp(t, 'g')) || []).length;
                score += matches;
                if ((doc.title || doc.filename || '').toLowerCase().includes(t)) {
                    score += 4;
                }
            }
            return { doc, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const topMatches = scored.filter(s => s.score > 0).slice(0, topK);
        const selected = topMatches.length > 0 ? topMatches.map(m => m.doc) : filteredDocs.slice(0, topK);

        const context = selected.map(d => `[Documento: ${d.title || d.filename} (${d.category || 'general'})]:\n${d.content}`).join('\n\n');

        return {
            answer: `Se encontraron ${selected.length} fuentes relevantes en el índice RAG de OpenClaw.`,
            context,
            sources: selected.map(d => ({
                id: d.id,
                title: d.title || d.filename,
                category: d.category || 'document',
                namespace: d.namespace || 'default'
            })),
            count: selected.length
        };
    },

    async getStatus() {
        const db = readDB();
        const docs = (db.ragDocuments || []).concat(db.customDocuments || []);
        const namespaces = [...new Set(docs.map(d => d.namespace || 'default'))];
        return {
            ready: true,
            provider: 'OpenClaw RAG Engine (Embedded & Vector)',
            indexed: docs.length,
            namespaces,
            lastSync: new Date().toISOString()
        };
    }
};

app.set('ragEngine', EmbeddedRAGEngine);

// ─── Direct RAG REST Endpoints ───────────────────────────────

app.get('/api/rag/status', async (req, res) => {
    res.json(await EmbeddedRAGEngine.getStatus());
});

app.post('/api/rag/sync', async (req, res) => {
    const result = await EmbeddedRAGEngine.indexAllData();
    res.json(result);
});

// Detalle completo de un documento específico
app.get('/api/rag-doc/:id', (req, res) => {
    const db = readDB();
    const allDocs = (db.ragDocuments || []).concat(db.customDocuments || []);
    const doc = allDocs.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(doc);
});

// Búsqueda semántica con scoring porcentual y snippets
app.post('/api/rag/search', async (req, res) => {
    const { query, namespace = 'default', category, topK = 6 } = req.body;
    if (!query) return res.status(400).json({ error: 'Falta término de búsqueda' });

    const db = readDB();
    const allDocs = (db.ragDocuments || []).concat(db.customDocuments || []);
    let filtered = allDocs.filter(d => !namespace || namespace === 'default' || d.namespace === namespace || !d.namespace);
    
    if (category && category !== 'all') {
        filtered = filtered.filter(d => d.category === category);
    }

    const terms = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const results = filtered.map(doc => {
        const fullText = `${doc.title || doc.filename || ''} ${doc.content || ''}`.toLowerCase();
        let matchScore = 0;
        let matchedTerms = 0;

        for (const t of terms) {
            const occurrences = (fullText.match(new RegExp(t, 'g')) || []).length;
            if (occurrences > 0) matchedTerms++;
            matchScore += Math.min(occurrences, 10);
            if ((doc.title || doc.filename || '').toLowerCase().includes(t)) {
                matchScore += 8;
            }
        }

        const coverage = terms.length > 0 ? (matchedTerms / terms.length) : 0;
        const rawSim = Math.min(100, Math.round((coverage * 60) + (Math.min(matchScore, 20) * 2)));
        const similarity = terms.length === 0 ? 50 : Math.max(15, rawSim);

        // Extraer snippet representativo
        let snippet = (doc.content || '').substring(0, 220);
        if (terms.length > 0 && doc.content) {
            const firstIdx = doc.content.toLowerCase().indexOf(terms[0]);
            if (firstIdx >= 0) {
                const start = Math.max(0, firstIdx - 40);
                const end = Math.min(doc.content.length, firstIdx + 180);
                snippet = (start > 0 ? '...' : '') + doc.content.substring(start, end) + (end < doc.content.length ? '...' : '');
            }
        }

        return {
            id: doc.id,
            title: doc.title || doc.filename,
            filename: doc.filename,
            category: doc.category || 'document',
            namespace: doc.namespace || 'default',
            similarity,
            score: matchScore,
            snippet,
            textLength: (doc.content || '').length,
            addedAt: doc.addedAt || doc.updatedAt
        };
    });

    results.sort((a, b) => b.similarity - a.similarity || b.score - a.score);
    const topResults = results.slice(0, topK);

    res.json({
        query,
        count: topResults.length,
        totalInNamespace: filtered.length,
        results: topResults
    });
});

app.get('/api/rag/:namespace', (req, res) => {
    const db = readDB();
    const ns = req.params.namespace || 'default';
    const docs = (db.ragDocuments || []).filter(d => !ns || ns === 'default' ? true : d.namespace === ns);
    res.json(docs);
});

app.post('/api/rag/:namespace', (req, res) => {
    const db = readDB();
    if (!db.ragDocuments) db.ragDocuments = [];
    const ns = req.params.namespace || 'default';
    const doc = {
        id: req.body.id || `rag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        filename: req.body.filename || req.body.title || 'Documento sin título',
        title: req.body.title || req.body.filename || 'Documento',
        content: req.body.content || '',
        category: req.body.category || 'document',
        namespace: ns,
        addedAt: req.body.addedAt || new Date().toISOString()
    };
    db.ragDocuments.unshift(doc);
    writeDB(db);
    res.status(201).json({ success: true, doc });
});

app.delete('/api/rag/:namespace', (req, res) => {
    const db = readDB();
    const ns = req.params.namespace;
    if (db.ragDocuments) {
        db.ragDocuments = db.ragDocuments.filter(d => d.namespace !== ns);
        writeDB(db);
    }
    res.json({ success: true, message: `Namespace ${ns} limpiado` });
});

app.delete('/api/rag/:namespace/:id', (req, res) => {
    const db = readDB();
    if (db.ragDocuments) {
        db.ragDocuments = db.ragDocuments.filter(d => d.id !== req.params.id);
        writeDB(db);
    }
    res.json({ success: true });
});

// ─── Hermes Chat Sessions Persistence ─────────────────────────
app.get('/api/hermes/sessions', (req, res) => {
    const db = readDB();
    res.json(db.hermesSessions || []);
});

app.post('/api/hermes/sessions', (req, res) => {
    const db = readDB();
    if (!db.hermesSessions) db.hermesSessions = [];
    
    const session = {
        id: req.body.id || `sess-${Date.now()}`,
        title: req.body.title || `Sesión ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        messages: req.body.messages || [],
        mode: req.body.mode || 'ejecutivo',
        namespace: req.body.namespace || 'default',
        updatedAt: new Date().toISOString()
    };

    const existingIdx = db.hermesSessions.findIndex(s => s.id === session.id);
    if (existingIdx >= 0) {
        db.hermesSessions[existingIdx] = session;
    } else {
        db.hermesSessions.unshift(session);
    }
    db.hermesSessions = db.hermesSessions.slice(0, 20); // max 20 sessions
    writeDB(db);
    res.json({ success: true, session });
});

app.delete('/api/hermes/sessions/:id', (req, res) => {
    const db = readDB();
    if (db.hermesSessions) {
        db.hermesSessions = db.hermesSessions.filter(s => s.id !== req.params.id);
        writeDB(db);
    }
    res.json({ success: true });
});

// ─── Hermes Skill Presets ─────────────────────────────────────
app.get('/api/hermes/skills/presets', (req, res) => {
    const db = readDB();
    res.json(db.hermesSkillPresets || [
        { id: 'budget_calc', name: 'Presupuestos & Costos', icon: '💰', enabled: true, prompt: 'Calcula siempre presupuestos detallados con contingencia del 10%.' },
        { id: 'casco_safety', name: 'Logística & Casco Peatonal', icon: '🚶‍♂️', enabled: true, prompt: 'Aplica normativas de seguridad vial, inspectores y cierres de calles de Casco Antiguo.' },
        { id: 'social_copy', name: 'Estrategia de Redes & Copy', icon: '📱', enabled: true, prompt: 'Genera copies virales con hooks, emojis y llamadas a la acción claras.' },
        { id: 'dev_architect', name: 'Arquitectura de Software', icon: '💻', enabled: true, prompt: 'Estructura proyectos modulares, APIs limpias y stacks modernos.' }
    ]);
});

app.post('/api/hermes/skills/presets', (req, res) => {
    const db = readDB();
    db.hermesSkillPresets = req.body.presets || [];
    writeDB(db);
    res.json({ success: true, presets: db.hermesSkillPresets });
});

// ─── RAG Brain Endpoints ──────────────────────────────────────

app.post('/api/brain/query', async (req, res) => {
    try {
        const { question, topK, historyContext, namespace } = req.body;
        if (!question) return res.status(400).json({ error: 'Missing "question" field' });
        const result = await EmbeddedRAGEngine.query(question, topK || 5, historyContext, namespace);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/brain/index', async (req, res) => {
    try {
        const result = await EmbeddedRAGEngine.indexAllData();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/brain/status', async (req, res) => {
    try {
        res.json(await EmbeddedRAGEngine.getStatus());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/brain/upload', upload.single('file'), async (req, res) => {
    try {
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
            fs.unlinkSync(file.path);
        }

        if (!content) return res.status(400).json({ error: 'Missing "content" field or file' });

        const docId = `custom-${Date.now()}`;
        const result = await EmbeddedRAGEngine.indexCustomDocument(docId, title, content, category, {}, namespace);
        res.status(201).json({ success: true, documentId: docId, ...result });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/brain/sync-vault', async (req, res) => {
    try {
        const vaultPath = req.body.path;
        const namespace = req.body.namespace || 'default';
        const result = await EmbeddedRAGEngine.indexObsidianVault(vaultPath, namespace);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/brain/documents', (req, res) => {
    const db = readDB();
    res.json(db.ragDocuments || []);
});

app.delete('/api/brain/documents/:id', (req, res) => {
    const db = readDB();
    if (db.ragDocuments) {
        db.ragDocuments = db.ragDocuments.filter(d => d.id !== req.params.id);
        writeDB(db);
    }
    res.json({ success: true });
});

// ─── WhatsApp & Community Outreach Agent Endpoints ───────────

function getWeekEventsForBroadcast(db, weekOffset = 0, startDateStr = null, endDateStr = null) {
    let start, end;
    if (startDateStr && endDateStr) {
        start = new Date(startDateStr + 'T00:00:00');
        end = new Date(endDateStr + 'T23:59:59');
    } else {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
        start = new Date(now);
        start.setDate(diff + (weekOffset * 7));
        start.setHours(0, 0, 0, 0);

        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    }

    const allEvents = db.events || [];
    const matched = [];

    for (const ev of allEvents) {
        let isMatch = false;
        let eventDate = ev.date;

        if (ev.date) {
            const d = new Date(ev.date + 'T12:00:00');
            if (d >= start && d <= end) {
                isMatch = true;
                eventDate = ev.date;
            }
        }
        
        if (Array.isArray(ev.instances)) {
            for (const inst of ev.instances) {
                if (inst.date) {
                    const idate = new Date(inst.date + 'T12:00:00');
                    if (idate >= start && idate <= end) {
                        isMatch = true;
                        eventDate = inst.date;
                        break;
                    }
                }
            }
        }

        if (isMatch) {
            matched.push({ ...ev, activeDate: eventDate });
        }
    }

    if (matched.length === 0) {
        // Fallback to active/upcoming events to ensure rich content
        return {
            events: allEvents.filter(e => e.status === 'activo' || e.status === 'planificacion' || e.status === 'upcoming' || e.status === 'ejecucion').slice(0, 6),
            start,
            end,
            isGeneralLineup: true
        };
    }

    return { events: matched, start, end, isGeneralLineup: false };
}

function generateLocalWhatsAppCampaign(events, start, end, tone = 'nightlife_vip', customInstructions = '', contacts = [], groups = []) {
    const startStr = start.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' });
    
    const eventBulletPoints = events.map(e => {
        const dateStr = e.activeDate || e.date || 'Esta semana';
        const loc = e.location || 'Casco Antiguo';
        const artists = (e.instances && e.instances[0]?.artists?.map(a => a.name).join(', ')) || '';
        return `• *${e.name}* (${dateStr}) @ ${loc}${artists ? ` | Lineup: ${artists}` : ''}${e.description ? `\n  _${e.description.substring(0, 90)}..._` : ''}`;
    }).join('\n\n');

    const weeklySchedule = [
        {
            id: `sch-1-${Date.now()}`,
            day: 'Lunes',
            date: start.toISOString().split('T')[0],
            title: '📢 Lanzamiento de Cartelera Semanal',
            type: 'Cartelera General',
            targetAudience: 'Todos los Grupos & Comunidades',
            status: 'ready',
            whatsappCopy: `🔥 *CARTELERA SEMANAL VIP | SEMANA ${startStr.toUpperCase()} - ${endStr.toUpperCase()}* 🔥\n\n¡Arrancamos la semana con toda la energía! Aquí tienes la programación oficial de eventos y experiencias para esta semana:\n\n${eventBulletPoints}\n\n📲 *RESERVAS & MESAS VIP:*\nEscríbenos directamente para asegurar tu espacio antes del Sold Out.\n\n📍 _¡Comparte este mensaje con tu grupo de fiesta!_ 🥂`
        },
        {
            id: `sch-2-${Date.now()}`,
            day: 'Martes',
            date: new Date(start.getTime() + 86400000).toISOString().split('T')[0],
            title: '🍾 Preventa de Boxes & Mesas VIP',
            type: 'Ventas VIP / Botellas',
            targetAudience: 'Comunidad VIP & Clientes Frecuentes',
            status: 'ready',
            whatsappCopy: `🍾 *ATENCIÓN CLIENTES VIP | RESERVAS DE MESAS*\n\nSi vas a salir este fin de semana, no esperes a última hora. Los mejores spots y boxes se llenan rápido:\n\n✅ *Boxes VIP 212 Club / Candela Trump*\n✅ *Atención personalizada & bottle service*\n✅ *Acceso preferencial sin filas*\n\nResponde a este mensaje con la palabra *MESA* para pasarte el menú y ubicación disponible. 🥂⚡`
        },
        {
            id: `sch-3-${Date.now()}`,
            day: 'Miércoles',
            date: new Date(start.getTime() + 86400000 * 2).toISOString().split('T')[0],
            title: '🎟️ Listas de Invitados & Acceso Especial',
            type: 'Listas Free / Chicas',
            targetAudience: 'Grupos Masivos & Redes',
            status: 'ready',
            whatsappCopy: `✨ *LISTAS ABIERTAS PARA EL FIN DE SEMANA* ✨\n\n¿Ya estás en lista? Tenemos acceso free y beneficios exclusivos para los primeros en confirmar:\n\n🍸 *Chicas Free Pass* hasta las 11:30 PM\n🍹 *Welcome Shots* para grupos de 5+\n\nEnvía tus nombres completos (Nombre + Apellido) por interno para agregarte a la lista oficial de puerta. 💃🕺`
        },
        {
            id: `sch-4-${Date.now()}`,
            day: 'Jueves',
            date: new Date(start.getTime() + 86400000 * 3).toISOString().split('T')[0],
            title: '🎧 Lineup de DJs & Artistas Invitados',
            type: 'Música & Experiencia',
            targetAudience: 'Comunidad Electrónica & Música',
            status: 'ready',
            whatsappCopy: `🎧 *LINEUP & DJS DE LA SEMANA* 🎶\n\nEste fin de semana el sonido estará a otro nivel con nuestros DJs residentes e invitados especiales.\n\n🔊 *Música curada: Deep, Tech House & Crossover*\n⏰ *Puertas abiertas desde las 9:00 PM*\n\n¡No te quedes por fuera del mejor ambiente de la ciudad! 🚀`
        },
        {
            id: `sch-5-${Date.now()}`,
            day: 'Viernes',
            date: new Date(start.getTime() + 86400000 * 4).toISOString().split('T')[0],
            title: '🔥 HOY ES VIERNES: Kickoff de Fin de Semana',
            type: 'Apertura de Fin de Semana',
            targetAudience: 'Todos los Canales',
            status: 'ready',
            whatsappCopy: `🚨 *¡HOY SE PRENDE EL FIN DE SEMANA!* 🚨\n\nTodo listo para la noche de hoy. Si buscas el mejor spot con buen ambiente, coctelería y música en vivo:\n\n📍 *Ubicación:* Casco Antiguo / 212 Club / Candela\n⏰ *Apertura:* 09:00 PM\n🍾 *Promoción:* 2x1 en cócteles seleccionados hasta las 11:00 PM\n\n¡Llega temprano para evitar fila en puerta! 💥`
        },
        {
            id: `sch-6-${Date.now()}`,
            day: 'Sábado',
            date: new Date(start.getTime() + 86400000 * 5).toISOString().split('T')[0],
            title: '⚡ SÁBADO GIGANTE | Last Call de Mesas',
            type: 'Sold Out Warning',
            targetAudience: 'Todos los Grupos & Directos',
            status: 'ready',
            whatsappCopy: `🔥 *SÁBADO DE CASA LLENA | ÚLTIMAS ENTRADAS Y MESAS* 🔥\n\nQuedan muy pocas mesas disponibles para esta noche. El dress code es elegante/casual y la vibra estará insuperable.\n\n⚠️ *Aforo controlado en puerta*\n🍾 *Últimos 2 Boxes VIP disponibles*\n\nEscríbenos YA si vienes en grupo grande para apartar tu mesa. ¡Nos vemos en la pista! 🥂✨`
        },
        {
            id: `sch-7-${Date.now()}`,
            day: 'Domingo',
            date: end.toISOString().split('T')[0],
            title: '🚶‍♂️ Domingo de Casco & After Recap',
            type: 'Cultural & Cierre',
            targetAudience: 'Comunidad Casco & General',
            status: 'ready',
            whatsappCopy: `☀️ *DOMINGO DE CASCO PEATONAL & TARDEO* 🚶‍♂️✨\n\nCerramos la semana con el mejor plan de tarde: caminata por las plazas, música en vivo, arte urbano y gastronomía.\n\n📍 *Punto de encuentro:* Plaza Catedral, Casco Antiguo\n🎷 *Shows en vivo & acústicos*\n\n¡Gracias a todos los que bailaron con nosotros este fin de semana! Nos vemos el próximo Lunes con nueva cartelera. 🙌💛`
        }
    ];

    const vipDirectMessages = [
        {
            id: 'vip-msg-1',
            audience: 'VIP High Spenders (Mesas & Boxes)',
            title: 'Invitación Privada a Mesa VIP',
            whatsappCopy: `Hola {{nombre}}, ¿cómo estás? Te escribo para comentarte que esta semana tenemos eventos exclusivos en Casco. Tenemos disponible el Box VIP principal con botella de cortesía si confirmas tu mesa antes del jueves. ¿Te reservo tu espacio habitual? 🍾🥂`
        },
        {
            id: 'vip-msg-2',
            audience: 'Invitados VIP / Listas Free',
            title: 'Pase Free & Acceso Directo',
            whatsappCopy: `¡Hola {{nombre}}! 🌟 Te agregué a la lista VIP de esta semana para nuestros eventos en Casco. Tienes entrada Free Pass + 1 acompañante hasta las 11:30 PM. Solo avísame con quién vas para dejar los nombres en puerta. 🙌`
        },
        {
            id: 'vip-msg-3',
            audience: 'Promotores & RRPP',
            title: 'Directiva Semanal & Metas de Venta',
            whatsappCopy: `Equipo, activa la promoción de esta semana. Tenemos meta de 15 mesas y 80 personas en lista para el fin de semana. El link de reservas ya está abierto y las comisiones aplican desde la primera reserva. ¡Vamos con todo! ⚡`
        },
        {
            id: 'vip-msg-4',
            audience: 'Cumpleañeros del Mes / Semana',
            title: 'Paquete de Cumpleaños & Bottle Free',
            whatsappCopy: `🎉 ¡Feliz cumpleaños {{nombre}}! Queremos celebrarte en grande: te regalamos 1 botella de espumante + mesa reservada + entradas free para tus invitados este fin de semana. Responde aquí para activar tu paquete de cumple. 🎂🍾`
        }
    ];

    const communityBroadcasts = [
        {
            id: 'cb-1',
            groupCategory: 'VIP & Clientes Frecuentes',
            title: 'Comunicado Exclusivo para Comunidad VIP',
            whatsappCopy: `👑 *COMUNIDAD VIP | ACCESO ANTICIPADO*\n\nMiembros de la comunidad, aquí tienen en primicia los eventos de la semana (${startStr} - ${endStr}):\n\n${eventBulletPoints}\n\nLos miembros de este grupo tienen 15% de descuento en botellas seleccionadas antes de las 11:00 PM. 🥂`
        },
        {
            id: 'cb-2',
            groupCategory: 'Comunidad Masiva & Seguidores',
            title: 'Broadcast General para Canales de WhatsApp',
            whatsappCopy: `🚀 *WEEKLY LINEUP & PLANES DE LA SEMANA*\n\n¡Se viene una semana cargada de buena música, eventos al aire libre y fiesta!\n\n${eventBulletPoints}\n\n¡Guarda la fecha y comparte este mensaje con tu grupo! Nos vemos en el Casco. 💃🕺`
        }
    ];

    return {
        id: `camp-${Date.now()}`,
        name: `Campaña Semanal (${startStr} - ${endStr})`,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        tone,
        customInstructions,
        summary: `Estrategia de difusión multi-canal que cubre ${events.length} eventos activos para la semana del ${startStr} al ${endStr}. Incluye 7 copys de publicación diaria, 4 plantillas personalizadas para clientes 1 a 1 y 2 comunicados para grupos de WhatsApp.`,
        weeklySchedule,
        vipDirectMessages,
        communityBroadcasts,
        createdAt: new Date().toISOString()
    };
}

// Generate campaign endpoint
app.post('/api/agent/whatsapp-campaign/generate', async (req, res) => {
    try {
        const { weekOffset = 0, startDate, endDate, tone = 'nightlife_vip', customInstructions = '' } = req.body;
        const db = readDB();
        const { events, start, end, isGeneralLineup } = getWeekEventsForBroadcast(db, parseInt(weekOffset) || 0, startDate, endDate);
        const contacts = db.contacts || [];
        const groups = db.whatsappGroups || [];

        // Try AI generation with Gemini if configured
        if (process.env.GEMINI_API_KEY) {
            try {
                console.log(`[WhatsAppAgent] Generando campaña con Gemini para ${events.length} eventos (Semana ${start.toISOString().split('T')[0]})...`);
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const eventsContext = events.map(e => ({
                    nombre: e.name,
                    fecha: e.activeDate || e.date,
                    lugar: e.location,
                    tipo: e.type,
                    descripcion: e.description,
                    artistas: e.instances?.[0]?.artists?.map(a => a.name) || [],
                    mesas: e.tables?.length || 0,
                    promos: e.instances?.[0]?.checklist?.promo || []
                }));

                const prompt = `Eres "Pulse", el agente de inteligencia artificial especializado en comunicación, difusión de eventos y Community Management de WhatsApp para centros nocturnos, eventos masivos (Casco Peatonal) y hospitalidad VIP en Panamá.

Tus tareas son:
1. Analizar los siguientes eventos programados para la semana del ${start.toISOString().split('T')[0]} al ${end.toISOString().split('T')[0]}:
${JSON.stringify(eventsContext, null, 2)}

2. Redactar una campaña de WhatsApp completa estructurada en JSON estrictamente válido.
Reglas de formato de WhatsApp:
- Usa negritas (*texto*), cursivas (_texto_), viñetas (• o ✅), emojis atractivos y llamados a la acción claros.
- Tono solicitado: "${tone}" (ej: fiesta nocturna, VIP sofisticado, cercano, enérgico).
- Instrucciones especiales del usuario: "${customInstructions || 'Ninguna'}".

Devuelve ÚNICAMENTE un objeto JSON con este formato exacto:
{
  "summary": "Resumen ejecutivo de la estrategia de la semana",
  "weeklySchedule": [
    {
      "id": "sch-1",
      "day": "Lunes",
      "date": "${start.toISOString().split('T')[0]}",
      "title": "Título de la publicación del día",
      "type": "Cartelera Semanal",
      "targetAudience": "Grupos de WhatsApp & Comunidades",
      "status": "ready",
      "whatsappCopy": "Texto formateado para WhatsApp con emojis y *negrita* listo para enviar..."
    }
    // ... genera exactamente los 7 días de Lunes a Domingo
  ],
  "vipDirectMessages": [
    {
      "id": "vip-1",
      "audience": "Clientes VIP Mesas",
      "title": "Invitación Personalizada de Mesa",
      "whatsappCopy": "Mensaje 1 a 1 usando {{nombre}} para personalizar..."
    },
    {
      "id": "vip-2",
      "audience": "Invitados Listas Free / Chicas",
      "title": "Acceso Free Pass",
      "whatsappCopy": "Mensaje para invitar a listas..."
    },
    {
      "id": "vip-3",
      "audience": "Promotores & RRPP",
      "title": "Directiva de Ventas",
      "whatsappCopy": "Mensaje con metas para promotores..."
    }
  ],
  "communityBroadcasts": [
    {
      "id": "cb-1",
      "groupCategory": "VIP & Clientes Frecuentes",
      "title": "Anuncio Exclusivo para Comunidad VIP",
      "whatsappCopy": "Texto de broadcast para comunidad VIP..."
    },
    {
      "id": "cb-2",
      "groupCategory": "Comunidad General",
      "title": "Cartelera General para Canales de WhatsApp",
      "whatsappCopy": "Texto de broadcast para todos los grupos..."
    }
  ]
}`;

                const result = await model.generateContent(prompt);
                const text = result.response.text();
                
                // Parse JSON
                let parsed = null;
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1]);
                } else {
                    parsed = JSON.parse(text);
                }

                if (parsed && parsed.weeklySchedule) {
                    const campaign = {
                        id: `camp-${Date.now()}`,
                        name: `Campaña IA Semanal (${start.toISOString().split('T')[0]} al ${end.toISOString().split('T')[0]})`,
                        startDate: start.toISOString().split('T')[0],
                        endDate: end.toISOString().split('T')[0],
                        tone,
                        customInstructions,
                        summary: parsed.summary || 'Campaña generada con Gemini 2.5',
                        weeklySchedule: parsed.weeklySchedule,
                        vipDirectMessages: parsed.vipDirectMessages || [],
                        communityBroadcasts: parsed.communityBroadcasts || [],
                        createdAt: new Date().toISOString(),
                        model: 'gemini-2.5-flash'
                    };

                    // Guardar automáticamente en db
                    if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
                    db.whatsappCampaigns.unshift(campaign);
                    db.whatsappCampaigns = db.whatsappCampaigns.slice(0, 10);
                    writeDB(db);

                    return res.json({ success: true, campaign, eventsCount: events.length, source: 'gemini' });
                }
            } catch (aiErr) {
                console.warn('[WhatsAppAgent] Error con Gemini, recurriendo a generador determinístico:', aiErr.message);
            }
        }

        // Local deterministic fallback
        const localCampaign = generateLocalWhatsAppCampaign(events, start, end, tone, customInstructions, contacts, groups);
        if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
        db.whatsappCampaigns.unshift(localCampaign);
        db.whatsappCampaigns = db.whatsappCampaigns.slice(0, 10);
        writeDB(db);

        res.json({ success: true, campaign: localCampaign, eventsCount: events.length, source: 'local_engine' });
    } catch (err) {
        console.error('[WhatsAppAgent] Error en generate:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get current or latest campaign
app.get('/api/agent/whatsapp-campaign/current', (req, res) => {
    const db = readDB();
    const campaigns = db.whatsappCampaigns || [];
    if (campaigns.length > 0) {
        return res.json({ success: true, campaign: campaigns[0], total: campaigns.length });
    }
    // Generate one immediately if none exist
    const { events, start, end } = getWeekEventsForBroadcast(db, 0);
    const campaign = generateLocalWhatsAppCampaign(events, start, end);
    if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
    db.whatsappCampaigns.push(campaign);
    writeDB(db);
    res.json({ success: true, campaign, total: 1 });
});

// Save modified campaign
app.post('/api/agent/whatsapp-campaign/save', (req, res) => {
    const { campaign } = req.body;
    if (!campaign || !campaign.id) return res.status(400).json({ error: 'Falta objeto campaign' });
    
    const db = readDB();
    if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
    const idx = db.whatsappCampaigns.findIndex(c => c.id === campaign.id);
    if (idx >= 0) {
        db.whatsappCampaigns[idx] = campaign;
    } else {
        db.whatsappCampaigns.unshift(campaign);
    }
    writeDB(db);
    res.json({ success: true, campaign });
});

// WhatsApp Groups CRUD
app.get('/api/agent/whatsapp-groups', (req, res) => {
    const db = readDB();
    res.json(db.whatsappGroups || []);
});

app.post('/api/agent/whatsapp-groups', (req, res) => {
    const group = req.body;
    if (!group.name) return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
    
    const db = readDB();
    if (!db.whatsappGroups) db.whatsappGroups = [];
    
    if (group.id) {
        const idx = db.whatsappGroups.findIndex(g => g.id === group.id);
        if (idx >= 0) {
            db.whatsappGroups[idx] = { ...db.whatsappGroups[idx], ...group, updatedAt: new Date().toISOString() };
        } else {
            db.whatsappGroups.push({ ...group, createdAt: new Date().toISOString() });
        }
    } else {
        const newGroup = {
            id: `wag-${Date.now()}`,
            name: group.name,
            category: group.category || 'Comunidad General',
            memberCount: parseInt(group.memberCount) || 0,
            inviteLink: group.inviteLink || '',
            postDays: group.postDays || ['Lunes', 'Viernes'],
            notes: group.notes || '',
            createdAt: new Date().toISOString()
        };
        db.whatsappGroups.push(newGroup);
    }
    writeDB(db);
    res.json({ success: true, groups: db.whatsappGroups });
});

app.delete('/api/agent/whatsapp-groups/:id', (req, res) => {
    const db = readDB();
    if (db.whatsappGroups) {
        db.whatsappGroups = db.whatsappGroups.filter(g => g.id !== req.params.id);
        writeDB(db);
    }
    res.json({ success: true });
});

// Log dispatches
app.post('/api/agent/whatsapp-campaign/log-dispatch', (req, res) => {
    const { title, target, channel, recipientName, recipientPhone, copyPreview } = req.body;
    const db = readDB();
    if (!db.whatsappLogs) db.whatsappLogs = [];
    
    const newLog = {
        id: `wlog-${Date.now()}`,
        title: title || 'Despacho de WhatsApp',
        target: target || 'Grupo de WhatsApp',
        channel: channel || 'whatsapp_web',
        recipientName: recipientName || '',
        recipientPhone: recipientPhone || '',
        copyPreview: copyPreview ? copyPreview.substring(0, 120) + '...' : '',
        timestamp: new Date().toISOString(),
        status: 'sent'
    };

    db.whatsappLogs.unshift(newLog);
    db.whatsappLogs = db.whatsappLogs.slice(0, 100); // max 100 logs
    
    // Also record activity in general activity log
    if (!db.activityLog) db.activityLog = [];
    db.activityLog.unshift({
        id: `act-${Date.now()}`,
        text: `📲 WhatsApp Agent despachó mensaje: "${newLog.title}" para ${newLog.target || newLog.recipientName}`,
        time: new Date().toLocaleTimeString('es-PA'),
        type: 'whatsapp_dispatch'
    });

    writeDB(db);
    res.json({ success: true, log: newLog });
});

app.get('/api/agent/whatsapp-campaign/logs', (req, res) => {
    const db = readDB();
    res.json(db.whatsappLogs || []);
});

// ─── WhatsApp Reference Library & Generator ─────────────────────

const DEFAULT_WHATSAPP_REFERENCES = [
    {
        id: 'ref-mie-furia-sushi-chicas',
        title: 'Miércoles Furia — 🍣 Cena Sushi & Drinks de Chicas',
        venue: 'Furia',
        day: 'Miércoles',
        objective: 'chicas_sushi_drinks',
        objectiveLabel: '🍣 Chicas Cena Sushi & Drinks',
        copy: `🍣 *EXCLUSIVO CHICAS | SUSHI DINNER & DRINKS @ FURIA* 🥂✨\n\n¡Chicas! Este *miércoles* abrimos mesa especial de cena para ustedes en *Furia Panamá*.\n\n✨ *La experiencia incluye:*\n• Degustación de sushi rolls premium & bocados de autor\n• Welcome drinks & cócteles de cortesía durante la cena\n• Acceso VIP directo a la fiesta post-cena sin fila ni cover\n\n⏰ *Hora de cena:* 08:30 PM (Mesas limitadas por reserva)\n📍 *Ubicación:* Furia, Calle Uruguay / Obarrio\n\n¿Cuántas chicas van en tu grupo para confirmar su mesa? Responde *SUSHI CHICAS* 📲`
    },
    {
        id: 'ref-jue-terraplen-drinks-chicas',
        title: 'Jueves Terraplén — 🍸 Drinks Chicas (Llenar la Fiesta)',
        venue: 'Terraplen',
        day: 'Jueves',
        objective: 'chicas_party_drinks',
        objectiveLabel: '🍸 Drinks de Chicas (Fiesta de Mujeres)',
        copy: `🍸 *THURSDAY ROOFTOP | DRINKS FOR THE GIRLS @ TERRAPLÉN* 🌇🔥\n\n¡Este *jueves* el mejor rooftop de Casco Antiguo se enciende para ustedes!\n\n🌸 *BENEFICIO EXCLUSIVO PARA CHICAS:*\n✅ *Open Bar de cócteles seleccionados* de 09:00 PM a 11:30 PM\n✅ *Entrada Free Pass* en lista VIP de chicas\n✅ La mejor vista panorámica, atardecer y DJs en vivo\n\n📍 *Terraplén Rooftop* (Casco Antiguo)\n\nResponde con tu nombre y apellido + número de amigas para anotarlas en la lista VIP 💃✨`
    },
    {
        id: 'ref-vie-furia-hombres-mesas',
        title: 'Viernes Furia — 🍾 Venta Sushi Party & Mesas VIP Hombres',
        venue: 'Furia',
        day: 'Viernes',
        objective: 'hombres_sushi_party',
        objectiveLabel: '🍾 Venta Sushi Party & Mesas Hombres',
        copy: `🍾 *SUSHI PARTY & MESAS VIP | VIERNES EN FURIA* 🔥⚡\n\nBro, este *viernes* la fiesta principal se vive en *Furia*. Si vienes con tu corillo, no te quedes por fuera:\n\n💥 *PACK SUSHI PARTY VIP:*\n• Mesa VIP reservada en zona principal\n• Combo de Sushi rolls gigantes para el grupo\n• Bottle service & mixers ilimitados\n• Acceso preferencial para ti y tus invitados sin fila\n\nLas mesas de viernes se van rápido. Responde *MESA FURIA* para enviarte el plano y consumo mínimo. 🥂🚀`
    },
    {
        id: 'ref-sab-varios-spam-tickets',
        title: 'Sábado General — 🎟️ Spam Tickets & Accesos Semanales',
        venue: 'Furia / Terraplén / Piano Bar',
        day: 'Sábado',
        objective: 'spam_tickets',
        objectiveLabel: '🎟️ Spam Tickets & Entradas',
        copy: `🚨 *SÁBADO DE FIESTA | TICKETS & ACCESOS DISPONIBLES* 💥\n\n¡La noche más caliente de la semana ya tiene cartelera lista!\n\n🔥 *¿A dónde vas este sábado?*\n1️⃣ *FURIA:* Noche de clubbing, techno & open format (Mesas & Tickets)\n2️⃣ *TERRAPLÉN ROOFTOP:* Sunset to late night en Casco Antiguo\n3️⃣ *PIANO BAR:* Música en vivo, cócteles clásicos y ambiente íntimo VIP\n\n🎟️ *Consigue tus tickets y preventas aquí:*\n👉 https://arriveservices.com/tickets\n\n¡Evita filas y asegura tu entrada antes de sold out! 🍾⚡`
    },
    {
        id: 'ref-dom-terraplen-chicas-sunset',
        title: 'Domingo Terraplén — 🌅 Sunset Chicas & Drinks',
        venue: 'Terraplen',
        day: 'Domingo',
        objective: 'chicas_party_drinks',
        objectiveLabel: '🍸 Drinks de Chicas (Fiesta de Mujeres)',
        copy: `🌅 *SUNDAY SUNSET SESSION @ TERRAPLÉN ROOFTOP* 🍹✨\n\nDespide la semana en el rooftop más top de la ciudad.\n\n✨ *Plan de domingo para chicas:*\n• 2x1 en Sangrías & Gin Tonics hasta las 08:00 PM\n• Rolls de sushi y bocados frescos para compartir\n• Sunset beats con los mejores DJs locales\n\n📍 *Terraplén Rooftop* — Abrimos desde las 05:00 PM.\n¿Te anoto en lista con tus amigas? Escribe *DOMINGO* 🥂`
    },
    {
        id: 'ref-sab-pianobar-mesas',
        title: 'Sábado Piano Bar — 🎹 Noche Exclusiva & Live Sessions',
        venue: 'Piano Bar',
        day: 'Sábado',
        objective: 'hombres_sushi_party',
        objectiveLabel: '🍾 Venta Sushi Party & Mesas Hombres',
        copy: `🎹 *SATURDAY LIVE SESSIONS @ PIANO BAR CASCO* 🍸✨\n\nUna noche diferente, exclusiva y con la mejor atmósfera musical de la ciudad.\n\n🥂 *PARA RESERVAS DE GRUPO & MESAS:*\n• Coctelería de autor premium\n• Pianistas y cantantes en vivo con los mejores clásicos\n• Espacios VIP íntimos para compartir con amigos o pareja\n\n📍 *Piano Bar* (Casco Antiguo)\nResponde *PIANO* para separar tu mesa con anticipación. Cupos estrictamente limitados. 🎶✨`
    }
];

// GET reference messages
app.get('/api/agent/whatsapp-references', (req, res) => {
    const db = readDB();
    if (!db.whatsappReferences || db.whatsappReferences.length === 0) {
        db.whatsappReferences = DEFAULT_WHATSAPP_REFERENCES;
        writeDB(db);
    }
    res.json(db.whatsappReferences);
});

// POST / PUT reference message
app.post('/api/agent/whatsapp-references', (req, res) => {
    const db = readDB();
    if (!db.whatsappReferences) db.whatsappReferences = [...DEFAULT_WHATSAPP_REFERENCES];
    
    const { id, title, venue, day, objective, objectiveLabel, copy } = req.body;
    if (!copy || !title) return res.status(400).json({ error: 'Título y texto del mensaje son obligatorios.' });

    const existingIdx = db.whatsappReferences.findIndex(r => r.id === id);
    if (existingIdx !== -1) {
        db.whatsappReferences[existingIdx] = {
            ...db.whatsappReferences[existingIdx],
            title, venue, day, objective, objectiveLabel, copy,
            updatedAt: new Date().toISOString()
        };
        writeDB(db);
        return res.json({ success: true, reference: db.whatsappReferences[existingIdx] });
    }

    const newRef = {
        id: id || `ref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        venue: venue || 'Furia',
        day: day || 'Miércoles',
        objective: objective || 'chicas_sushi_drinks',
        objectiveLabel: objectiveLabel || 'Mensaje de Difusión',
        copy,
        createdAt: new Date().toISOString()
    };

    db.whatsappReferences.unshift(newRef);
    writeDB(db);
    res.status(201).json({ success: true, reference: newRef });
});

// DELETE reference message
app.delete('/api/agent/whatsapp-references/:id', (req, res) => {
    const db = readDB();
    if (db.whatsappReferences) {
        db.whatsappReferences = db.whatsappReferences.filter(r => r.id !== req.params.id);
        writeDB(db);
    }
    res.json({ success: true });
});

// GENERATE 3 VARIATIONS FROM REFERENCE WITH AI
app.post('/api/agent/whatsapp-references/generate', async (req, res) => {
    try {
        const { venue = 'Furia', day = 'Miércoles', objective = 'chicas_sushi_drinks', referenceMessage = '', customNotes = '', eventName = '' } = req.body;
        
        let objectiveDesc = '';
        if (objective === 'chicas_sushi_drinks') objectiveDesc = 'Invitar exclusivamente a grupos de chicas a cena de sushi + drinks de bienvenida de cortesía.';
        else if (objective === 'chicas_party_drinks') objectiveDesc = 'Open bar / drinks gratis para chicas para que la fiesta se llene de mujeres desde temprano.';
        else if (objective === 'hombres_sushi_party') objectiveDesc = 'Vender paquetes de Sushi Party, reservas de mesas VIP, botellas y consumo para hombres/grupos.';
        else if (objective === 'spam_tickets') objectiveDesc = 'Difusión masiva directa para venta de tickets, preventas, enlaces de compra y accesos al evento.';

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                
                const prompt = `Eres el redactor maestro de WhatsApp y Community Manager de ARRIVE Agency para centros nocturnos y rooftops en Panamá (Furia, Terraplén Rooftop, Piano Bar).
                
OBJETIVO:
Generar 3 variaciones de mensajes de WhatsApp de alta conversión adaptados al venue, día de la semana y objetivo estratégico, tomando como inspiración y estilo el mensaje de referencia proporcionado.

PARÁMETROS:
- Venue: ${venue}
- Día de la semana: ${day}
- Objetivo de campaña: ${objective} (${objectiveDesc})
- Nombre del Evento o Fiesta: ${eventName || venue}
- Notas adicionales / Promos de esta semana: ${customNotes || 'Ninguna'}

MENSAJE DE REFERENCIA / EJEMPLO PROPORCIONADO:
"""
${referenceMessage || 'Usa el formato seductor, nocturno y VIP de ARRIVE Agency Panamá'}
"""

REGLAS DE FORMATO WHATSAPP:
- Usa negritas (*texto*), cursivas (_texto_), listas con viñetas (• o ✅), emojis llamativos y un Call to Action final muy claro (ej: Responde *PALABRA* para confirmar).
- Conserva el tono y estructura del mensaje de referencia, pero redacta 3 versiones con ángulos distintos:
  * Variación 1: Enérgica & Directa
  * Variación 2: Seductora & VIP Exclusiva
  * Variación 3: Urgencia & FOMO (Últimos cupos / listas cerrando)

Devuelve ÚNICAMENTE un objeto JSON estrictamente válido en este formato exacto:
{
  "variations": [
    {
      "id": "var-1",
      "style": "🔥 Enérgica & Directa",
      "copy": "Texto del mensaje 1..."
    },
    {
      "id": "var-2",
      "style": "🥂 Seductora & VIP Exclusiva",
      "copy": "Texto del mensaje 2..."
    },
    {
      "id": "var-3",
      "style": "🚨 Urgencia & FOMO (Sold Out)",
      "copy": "Texto del mensaje 3..."
    }
  ]
}`;
                
                const aiRes = await model.generateContent(prompt);
                const text = aiRes.response.text();
                const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                const parsed = JSON.parse(match ? match[1] : text);
                if (parsed.variations && parsed.variations.length > 0) {
                    return res.json({ success: true, variations: parsed.variations, source: 'gemini' });
                }
            } catch (err) {
                console.warn('[WhatsAppReferences] Error en IA Gemini, usando fallback determinístico:', err.message);
            }
        }
        
        // High quality deterministic fallback variations
        const cleanRef = referenceMessage.trim() || '';
        const variations = [
            {
                id: 'var-1',
                style: '🔥 Enérgica & Directa',
                copy: cleanRef ? `${cleanRef}\n\n⚡ *DETALLES SEMANA ACTUAL:*\n${customNotes || 'Asegura tu grupo con tiempo respondiendo a este chat.'}` : `🔥 *${day.toUpperCase()} EN ${venue.toUpperCase()} | PLAN ACTIVADO* ⚡\n\n${objectiveDesc}\n\n${customNotes ? `📌 *Nota:* ${customNotes}\n\n` : ''}📍 *Spot:* ${venue}\n📲 *Responde con tu nombre para confirmar asistencia.*`
            },
            {
                id: 'var-2',
                style: '🥂 Seductora & VIP Exclusiva',
                copy: `✨ *UNA EXPERIENCIA ÚNICA ESTE ${day.toUpperCase()} @ ${venue.toUpperCase()}* 🍾🍸\n\n${objectiveDesc}\n\nAtmósfera exclusiva, música en vivo, atención personalizada y la mejor gente de la ciudad.\n\n${customNotes ? `💎 *Beneficio especial:* ${customNotes}\n\n` : ''}Reservas estrictamente por lista. Escribe *CONFIRMAR* para anotarte. 🥂`
            },
            {
                id: 'var-3',
                style: '🚨 Urgencia & FOMO (Últimos Cupos)',
                copy: `🚨 *ÚLTIMOS CUPOS DISPONIBLES | ${day.toUpperCase()} @ ${venue.toUpperCase()}* ⏳💥\n\nLas listas y mesas para este ${day.toLowerCase()} se están cerrando más rápido de lo esperado.\n\n${objectiveDesc}\n\n${customNotes ? `⚠️ *Importante:* ${customNotes}\n\n` : ''}¡No te quedes por fuera! Responde *YA* para asegurar tu espacio antes del sold out total. 📲`
            }
        ];
        
        res.json({ success: true, variations, source: 'deterministic' });
    } catch (err) {
        console.error('[WhatsAppReferences] Error general en generación:', err);
        res.status(500).json({ error: err.message });
    }
});

// Cron Task para preparación automática cada Lunes a las 09:00 AM
try {
    cron.schedule('0 9 * * 1', async () => {
        console.log('\n⏰ [Pulse WhatsApp Agent] Ejecutando compilación semanal programada (Lunes 09:00 AM)...');
        try {
            const db = readDB();
            const { events, start, end } = getWeekEventsForBroadcast(db, 0);
            const campaign = generateLocalWhatsAppCampaign(events, start, end);
            
            if (!db.whatsappCampaigns) db.whatsappCampaigns = [];
            db.whatsappCampaigns.unshift(campaign);
            
            if (!db.whatsappLogs) db.whatsappLogs = [];
            db.whatsappLogs.unshift({
                id: `wlog-cron-${Date.now()}`,
                title: '⚡ Compilación Semanal Automática',
                target: 'Sistema / Borrador Semanal',
                channel: 'agent_cron',
                timestamp: new Date().toISOString(),
                status: 'ready',
                copyPreview: `Campaña semanal compilada automáticamente para ${events.length} eventos.`
            });

            writeDB(db);
            console.log(`✅ [Pulse WhatsApp Agent] Campaña semanal compilada para ${events.length} eventos.`);
        } catch (cronErr) {
            console.error('❌ [Pulse WhatsApp Agent] Error en cron semanal:', cronErr.message);
        }
    });
} catch (e) {
    console.warn('[Cron] No se pudo inicializar cron job:', e.message);
}

// ─── Static Frontend Serving ──────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.use('/api', (req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(`[API] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(status).json({ error: err.message || 'Error interno' });
});

// Migraciones de forma de datos al arrancar
(function migrateDB() {
    try {
        const db = readDB();
        if (db.contentTasks !== undefined && !Array.isArray(db.contentTasks)) {
            // Antes se guardaba como { ideas: [], production: [], ... }; el frontend lo usa como lista.
            db.contentTasks = Object.values(db.contentTasks).filter(Array.isArray).flat();
            writeDBFile(db);
            console.log('🔧 contentTasks convertido a lista.');
        }
    } catch (err) {
        console.error('❌ No se pudo revisar db.json al arrancar:', err.message);
    }
})();

// ─── Start ────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n⚡ Command Center API & Frontend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   OpenClaw Chat Proxy: POST http://localhost:${PORT}/api/openclaw/chat`);
    console.log(`   OpenClaw Health: GET http://localhost:${PORT}/api/openclaw/health`);
    
    // Sincronizar datos con Supabase antes de cualquier consulta RAG o peticiones de clientes
    await initSupabaseSync();
    
    // Initialize db.json if it doesn't exist
    if (!fs.existsSync(DB_PATH)) {
        try {
            console.log('📦 db.json no encontrado. Auto-inicializando base de datos inicial...');
            const seedScript = path.join(__dirname, 'seed-db.js');
            if (fs.existsSync(seedScript)) {
                await import('./seed-db.js');
            }
        } catch (e) {
            console.warn('No se pudo auto-inicializar seed:', e.message);
        }
    }

    // Auto-index entities into embedded RAG
    await EmbeddedRAGEngine.indexAllData();
    const status = await EmbeddedRAGEngine.getStatus();
    console.log(`   🧠 OpenClaw RAG Brain: ONLINE (${status.indexed} docs indexed)`);
    console.log(`   Brain Query: POST http://localhost:${PORT}/api/brain/query\n`);
});
