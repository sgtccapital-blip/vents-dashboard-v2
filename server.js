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
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

// pdf-parse v2: la API es una clase, ya no una función
async function extractPdfText(buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        return { text: result.text || '', pages: result.total || result.pages?.length || 0 };
    } finally {
        await parser.destroy().catch(() => {});
    }
}
import {
    executeAgentAction, runLocalAgent, TEAM_MEMBERS, runGeminiAgent, searchKnowledge, buildSystemPrompt, AGENT_ACTIONS, expandSlashCommand,
    configuredGeminiModel, activeGeminiModel, resetGeminiModelCache, transcribeAudio,
} from './server/agent.js';
import { registerWhatsAppRoutes } from './server/routes/whatsapp.js';
import { registerRagRoutes } from './server/routes/rag.js';
import { registerLegacyAgentRoutes } from './server/routes/legacyAgents.js';
import { ensureVapid, buildDailyBrief, buildEveningReminders, sendToUsers, todayIn } from './server/push.js';
import { normalizeTaskStatus, normalizeEventStatus, TASK_STATUSES, EVENT_STATUSES } from './src/lib/status.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8090;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');
const SEED_PATH = path.join(__dirname, 'db.seed.json');
// Zona horaria del negocio: los cron (lunes 9am, avisos) se programan en hora de Panamá, no en UTC del servidor
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Panama';
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

// Contraseñas individuales opcionales: TEAM_PASSWORDS="GG:clave1,MARIO:clave2".
// Quien no tenga una propia entra con DASHBOARD_PASSWORD.
const TEAM_PASSWORDS = Object.fromEntries((process.env.TEAM_PASSWORDS || '')
    .split(',').map(p => p.trim()).filter(Boolean)
    .map(p => { const i = p.indexOf(':'); return [p.slice(0, i).trim().toUpperCase(), p.slice(i + 1)]; })
    .filter(([u, pw]) => u && pw));

function passwordMatches(user, password) {
    if (TEAM_PASSWORDS[user]) return safeEqual(password, TEAM_PASSWORDS[user]);
    return !!DASHBOARD_PASSWORD && safeEqual(password, DASHBOARD_PASSWORD);
}

// Token de sesión: "<expira>.<usuario>.<firma>" (la firma cubre expiración y usuario)
function signSession(expiresAt, user) {
    const payload = `${expiresAt}.${user}`;
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    return `${payload}.${sig}`;
}

/** Usuario de una sesión válida, o null. */
function sessionUser(token) {
    if (!token || !DASHBOARD_PASSWORD) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null; // sesiones antiguas sin usuario: se pide entrar de nuevo
    const [expiresAt, user] = parts;
    if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now() || !TEAM_MEMBERS.includes(user)) return null;
    return safeEqual(token, signSession(expiresAt, user)) ? user : null;
}

function readCookie(req, name) {
    const header = req.headers.cookie || '';
    for (const part of header.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k === name) return decodeURIComponent(v.join('='));
    }
    return null;
}

/** Quién hace la petición: miembro del equipo (cookie), 'API' (token de agentes) o null. */
function requestUser(req) {
    const bearer = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer && API_TOKEN && safeEqual(bearer, API_TOKEN)) return 'API';
    return sessionUser(readCookie(req, SESSION_COOKIE));
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
    const user = String(req.body?.user || '').trim().toUpperCase();
    if (!TEAM_MEMBERS.includes(user)) return res.status(400).json({ error: 'Elige quién eres' });
    if (!passwordMatches(user, req.body?.password || '')) {
        loginAttempts.get(req.ip).push(Date.now());
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    loginAttempts.delete(req.ip);
    res.setHeader('Set-Cookie', sessionCookie(req, signSession(Date.now() + SESSION_TTL_MS, user), SESSION_TTL_MS));
    res.json({ authenticated: true, user });
});

app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    res.json({ authenticated: false });
});

app.get('/api/auth/session', (req, res) => {
    const user = requestUser(req);
    res.json({
        authenticated: !!user,
        user,
        configured: !!DASHBOARD_PASSWORD,
        team: TEAM_MEMBERS,
        personalPasswords: Object.keys(TEAM_PASSWORDS),
    });
});

// Restaurar desde Supabase ANTES de atender la API: si no, tras un reinicio en Render los primeros
// segundos se servían (y se podían editar) los datos de ejemplo del disco recién creado.
// (Perezoso: se inicia en app.listen o en la primera petición, cuando el módulo ya cargó entero.)
let supabaseReadyPromise = null;
const supabaseReady = () => (supabaseReadyPromise ||= initSupabaseSync().catch(err => console.error('Supabase init:', err.message)));
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    supabaseReady().then(() => next());
});

app.use('/api', (req, res, next) => {
    if (PUBLIC_API_PREFIXES.some(p => req.originalUrl.startsWith(p))) return next();
    req.user = requestUser(req);
    if (req.user) return next();
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
        const createdBy = req.body?.createdBy || (req.user && req.user !== 'API' ? req.user : undefined);
        const newItem = validateEntity(entityName, { ...req.body, id: req.body?.id || newId(entityName), ...(createdBy ? { createdBy } : {}), createdAt: req.body?.createdAt || new Date().toISOString() });
        if (list.some(i => i.id === newItem.id)) {
            return res.status(409).json({ error: `Ya existe un registro con id ${newItem.id}` });
        }
        list.push(newItem);
        writeDB(db);

        // Avisar a quien le asignan una tarea (si se la asigna otra persona)
        const assignee = entityName === 'tasks' && (newItem.assignee || newItem.assignedTo);
        if (assignee && assignee !== req.user && TEAM_MEMBERS.includes(assignee)) {
            pushToUsers([{ user: assignee, title: `${req.user && req.user !== 'API' ? req.user : 'OpenClaw'} te asignó una tarea`, body: `${newItem.text}${newItem.due ? ` · vence ${newItem.due}` : ''}`, url: '/workspace', tag: `task-${newItem.id}` }])
                .catch(err => console.warn('[Push] asignación:', err.message));
        }

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
        const wasDone = entityName === 'tasks' && normalizeTaskStatus(list[idx].status) === 'done';
        list[idx] = { ...list[idx], ...changes, id: list[idx].id };
        if (entityName === 'tasks') {
            // Registrar cuándo y quién la completó (alimenta "tareas completadas por semana")
            const nowDone = normalizeTaskStatus(list[idx].status) === 'done' || (list[idx].status === undefined && list[idx].done);
            if (nowDone && !wasDone) {
                list[idx].completedAt = list[idx].completedAt || new Date().toISOString();
                if (req.user && req.user !== 'API') list[idx].completedBy = req.user;
            } else if (!nowDone && wasDone) {
                delete list[idx].completedAt;
                delete list[idx].completedBy;
            }
        }
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
        const pdfData = await extractPdfText(pdfBuffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim().length < 10) {
            // Cleanup temp file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'No se pudo extraer texto del PDF. Puede estar escaneado o protegido.' });
        }

        console.log(`[Vault] Texto extraído: ${extractedText.length} caracteres, ${pdfData.pages} páginas`);

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
            pages: pdfData.pages,
            uploadedAt: new Date().toISOString()
        });
        writeDB(db);

        // 4. customDocuments ya forma parte del corpus del RAG (searchKnowledge)

        // 5. Log activity
        const dbAfter = readDB();
        if (!dbAfter.activityFeed) dbAfter.activityFeed = [];
        dbAfter.activityFeed.unshift({
            id: `act-${Date.now()}`,
            text: `📄 PDF "${title}" subido al Vault e indexado en el cerebro RAG (${pdfData.pages} páginas)`,
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
        ...req.body,
        user: req.user && req.user !== 'API' ? req.user : (req.body?.user || null),
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
    const { action, payload, tool, arguments: toolArgs } = req.body || {};
    const actionName = action || tool || req.body?.name;
    if (!actionName) return res.status(400).json({ status: 'error', error: 'Falta "action"', availableActions: AGENT_ACTIONS });
    const data = payload || toolArgs || req.body.data || req.body;

    const db = readDB();
    try {
        const result = executeOpenClawAction(actionName, data, db, { user: req.user !== 'API' ? req.user : null });
        // 422: la acción se entendió pero no se pudo ejecutar (datos faltantes, tarea no encontrada…)
        return res.status(result.success ? 200 : 422).json({ status: result.success ? 'ok' : 'error', agent: 'OpenClaw Super Agent', action: actionName, result, error: result.success ? undefined : result.error });
    } catch (err) {
        console.error('[OpenClaw Bridge] Error procesando acción:', err);
        return res.status(500).json({ status: 'error', error: err.message });
    }
});

// Ejecuta una acción del agente (implementación única en server/agent.js), la registra en el log y guarda.
function executeOpenClawAction(actionName, data, db, { persist = true, user = null } = {}) {
    const result = executeAgentAction(actionName, data, db, { user });
    db.openclawLogs = Array.isArray(db.openclawLogs) ? db.openclawLogs : [];
    db.openclawLogs.unshift({
        id: `olog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: actionName,
        timestamp: new Date().toISOString(),
        source: 'OpenClaw Super Agent',
        data: data || {},
        status: result.success ? 'success' : 'error',
        error: result.success ? undefined : result.error,
        thought: result.log,
    });
    db.openclawLogs = db.openclawLogs.slice(0, 50);
    db.hermesLogs = db.openclawLogs;
    if (persist) writeDB(db);
    return result;
}


// 5. OpenClaw & Gemini Config Endpoints
app.get('/api/openclaw/config', (req, res) => {
    const db = readDB();
    const config = db.openclawConfig || db.hermesConfig || {
        baseUrl: 'http://localhost:18789/v1',
        chatUrl: '/api/openclaw/chat',
        apiKey: ''
    };
    res.json({ ...publicConfig(config), model: geminiModelFor(db) });
});

// Nunca devolver claves guardadas al navegador; solo si existen.
function publicConfig(config = {}) {
    const { geminiApiKey, apiKey, ...rest } = config;
    return { ...rest, hasGeminiApiKey: !!geminiApiKey, hasApiKey: !!apiKey };
}

// Quita campos de solo lectura y no borra claves guardadas cuando llegan vacías (la UI nunca las recibe)
function sanitizeConfigUpdate(body = {}) {
    // eslint-disable-next-line no-unused-vars -- se descartan a propósito
    const { hasGeminiApiKey, hasApiKey, ...rest } = body;
    if (!rest.geminiApiKey) delete rest.geminiApiKey;
    if (!rest.apiKey) delete rest.apiKey;
    return rest;
}

app.post('/api/openclaw/config', (req, res) => {
    const db = readDB();
    db.openclawConfig = { ...(db.openclawConfig || {}), ...sanitizeConfigUpdate(req.body) };
    writeDB(db);
    resetGeminiModelCache();
    lastGeminiError = null;
    res.json({ success: true, config: publicConfig(db.openclawConfig) });
});

// Gemini Specific Config Endpoints
app.post('/api/openclaw/gemini/config', (req, res) => {
    const db = readDB();
    if (!db.openclawConfig) db.openclawConfig = {};
    if (req.body.geminiApiKey !== undefined) {
        db.openclawConfig.geminiApiKey = (req.body.geminiApiKey || '').trim();
    }
    if (req.body.model !== undefined) db.openclawConfig.model = String(req.body.model || '').trim();
    writeDB(db);
    const activeKey = geminiKeyFor(db);
    lastGeminiError = null;
    resetGeminiModelCache();
    res.json({
        success: true,
        geminiActive: !!activeKey,
        model: geminiModelFor(db)
    });
});

app.get('/api/openclaw/gemini/status', (req, res) => {
    const db = readDB();
    const activeKey = geminiKeyFor(db);
    res.json({
        configured: !!activeKey,
        active: !!activeKey && !lastGeminiError,
        model: geminiModelFor(db),
        configuredModel: configuredGeminiModel(db.openclawConfig?.model),
        provider: 'Google Gemini',
        source: process.env.GEMINI_API_KEY ? 'env' : activeKey ? 'dashboard' : null,
        lastError: lastGeminiError
    });
});

// Backward compatibility alias for Hermes config
app.get('/api/hermes/config', (req, res) => {
    const db = readDB();
    res.json(publicConfig(db.openclawConfig || db.hermesConfig || {}));
});
app.post('/api/hermes/config', (req, res) => {
    const db = readDB();
    db.openclawConfig = { ...(db.openclawConfig || {}), ...sanitizeConfigUpdate(req.body) };
    db.hermesConfig = db.openclawConfig;
    writeDB(db);
    res.json({ success: true, config: publicConfig(db.openclawConfig) });
});

// 6. OpenClaw Health Check Endpoint
app.get(['/api/openclaw/health', '/api/hermes/health'], async (req, res) => {
    const db = readDB();
    const geminiKey = geminiKeyFor(db);
    const model = geminiModelFor(db);
    return res.json({
        online: true,
        mode: geminiKey ? 'gemini' : 'local',
        model: geminiKey ? model : 'openclaw-local',
        status: lastGeminiError ? 'degraded' : 'ready',
        geminiActive: !!geminiKey,
        lastError: lastGeminiError,
        label: geminiKey ? `OpenClaw · Gemini (${model}) + RAG` : 'OpenClaw · motor local + RAG (sin GEMINI_API_KEY)'
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

// 7. OpenClaw Chat: Gemini con herramientas + RAG; si no hay clave o Gemini falla, agente local
const geminiKeyFor = (db) => process.env.GEMINI_API_KEY || db.openclawConfig?.geminiApiKey || '';
const geminiModelFor = (db) => activeGeminiModel() || configuredGeminiModel(db.openclawConfig?.model);
let lastGeminiError = null;

async function handleOpenClawChat(req, res) {
    const db = readDB();
    const { prompt, history = [], systemRole, skills, namespace = 'default' } = req.body || {};
    if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'Prompt es requerido' });
    const text = String(prompt).trim();
    // Gemini recibe el comando ya traducido (/tarea x → "crea una tarea: x"); el agente local lo traduce solo
    const geminiPrompt = expandSlashCommand(text).prompt || text;

    const rag = searchKnowledge(db, geminiPrompt, { namespace, topK: 5 });
    const sources = rag.results.map(({ id, title, category, similarity }) => ({ id, title, category, similarity }));
    const apiKey = geminiKeyFor(db);

    if (apiKey) {
        const user = req.user && req.user !== 'API' ? req.user : null;
        const systemPrompt = buildSystemPrompt(db, { ragContext: rag.context, skills, systemRole, user });
        const result = await runGeminiAgent({
            apiKey,
            model: db.openclawConfig?.model,
            systemPrompt,
            history: Array.isArray(history) ? history : [],
            prompt: geminiPrompt,
            db,
            namespace,
            user,
            onError: (errors) => console.warn('[OpenClaw] Gemini no respondió:', errors.join(' | ')),
        });
        if (result?.executedTools?.length) {
            result.executedTools.forEach(t => logAgentTool(db, t));
            writeDB(db);
            notifyAgentAssignments(result.executedTools, user);
        }
        if (result && !result.error) {
            lastGeminiError = null;
            return res.json({
                reply: result.reply,
                executedTools: result.executedTools,
                sources,
                model: result.model,
                provider: `Google Gemini (${result.model})`,
                usage: result.usage || null,
            });
        }
        lastGeminiError = { at: new Date().toISOString(), message: result?.error || 'sin respuesta' };
        if (result?.executedTools?.length) {
            // Ya se ejecutaron acciones: no repetirlas con el agente local
            return res.json({ reply: result.reply, executedTools: result.executedTools, sources, model: 'openclaw-local', provider: 'OpenClaw (Gemini incompleto)' });
        }
    }

    const local = runLocalAgent(text, db, { namespace, user: req.user && req.user !== 'API' ? req.user : null });
    if (local.executedTools.length) {
        local.executedTools.forEach(t => logAgentTool(db, t));
        writeDB(db);
        notifyAgentAssignments(local.executedTools, req.user !== 'API' ? req.user : null);
    }
    const warning = apiKey && lastGeminiError
        ? `\n\n_⚠️ Gemini no respondió (${lastGeminiError.message.slice(0, 140)}); respondí con el motor local._`
        : '';
    return res.json({
        reply: local.reply + warning,
        executedTools: local.executedTools,
        sources: local.sources || sources,
        model: 'openclaw-local',
        provider: apiKey ? 'OpenClaw local (Gemini no disponible)' : 'OpenClaw local (sin Gemini)',
        usage: null,
    });
}

// Si el agente creó tareas para otra persona, avisarle por push
function notifyAgentAssignments(executedTools = [], actor) {
    const messages = executedTools
        .filter(t => t.name === 'add_task' && t.result?.success && t.result.task?.assignee && t.result.task.assignee !== actor)
        .map(({ result: { task } }) => ({
            user: task.assignee,
            title: `${actor ? `${actor} (vía OpenClaw)` : 'OpenClaw'} te asignó una tarea`,
            body: `${task.text}${task.due ? ` · vence ${task.due}` : ''}`,
            url: '/workspace',
            tag: `task-${task.id}`,
        }));
    if (messages.length) pushToUsers(messages).catch(err => console.warn('[Push] agente:', err.message));
}

// Registra en el log del agente las herramientas que ya ejecutó executeAgentAction
function logAgentTool(db, { name, args, result }) {
    db.openclawLogs = Array.isArray(db.openclawLogs) ? db.openclawLogs : [];
    db.openclawLogs.unshift({
        id: `olog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: name, timestamp: new Date().toISOString(), source: 'OpenClaw Chat', data: args || {},
        status: result?.success ? 'success' : 'error', error: result?.success ? undefined : result?.error,
    });
    db.openclawLogs = db.openclawLogs.slice(0, 50);
    db.hermesLogs = db.openclawLogs;
}

// Nota de voz → texto (Gemini). El navegador luego envía el texto al chat como cualquier mensaje.
app.post('/api/openclaw/transcribe', async (req, res) => {
    const { audio, mimeType } = req.body || {};
    if (!audio || typeof audio !== 'string') return res.status(400).json({ error: 'Falta el audio' });
    if (audio.length > 9_000_000) return res.status(413).json({ error: 'La nota es muy larga (máx. ~5 minutos)' });
    const db = readDB();
    const apiKey = geminiKeyFor(db);
    if (!apiKey) return res.status(503).json({ error: 'Para entender notas de voz hace falta una clave de Gemini (configúrala con la 🔑 del agente). Mientras tanto usa el dictado 🎤.' });
    const result = await transcribeAudio({ apiKey, model: db.openclawConfig?.model, base64: audio, mimeType });
    if (result.error) return res.status(502).json({ error: result.error });
    res.json(result);
});

app.post('/api/openclaw/chat', handleOpenClawChat);
app.post('/api/hermes/chat', handleOpenClawChat);

// (módulo: server/routes/legacyAgents.js)
registerLegacyAgentRoutes(app, { readDB, writeDB, geminiKeyFor, AGENTS_WORKSPACE_PATH, VAULT_PATH });

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
// ─── Notificaciones push ──────────────────────────────────────
function vapidKeys() {
    const db = readDB();
    const keys = ensureVapid(db);
    if (keys.created) writeDB(db);
    return keys;
}

async function pushToUsers(messages) {
    if (!messages.length) return { sent: 0, removed: 0 };
    const keys = vapidKeys();
    const db = readDB();
    const result = await sendToUsers(db, messages, keys);
    if (result.removed) writeDB(db);
    return result;
}

app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: vapidKeys().publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh) return res.status(400).json({ error: 'Suscripción inválida' });
    if (!req.user || req.user === 'API') return res.status(403).json({ error: 'Inicia sesión como miembro del equipo' });
    const db = readDB();
    db.pushSubscriptions = (db.pushSubscriptions || []).filter(s => s.subscription.endpoint !== subscription.endpoint);
    db.pushSubscriptions.push({ user: req.user, subscription, userAgent: String(req.headers['user-agent'] || '').slice(0, 120), createdAt: new Date().toISOString() });
    writeDB(db);
    res.json({ success: true, user: req.user });
});

app.post('/api/push/unsubscribe', (req, res) => {
    const endpoint = req.body?.endpoint;
    const db = readDB();
    db.pushSubscriptions = (db.pushSubscriptions || []).filter(s => s.subscription.endpoint !== endpoint);
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/push/test', async (req, res) => {
    if (!req.user || req.user === 'API') return res.status(403).json({ error: 'Inicia sesión como miembro del equipo' });
    const result = await pushToUsers([{ user: req.user, title: '🔔 Notificaciones activas', body: `Listo, ${req.user}. Te avisaré de tus tareas y eventos.`, url: '/' }]);
    res.json(result);
});

// ─── Respaldo completo (descargar / restaurar) ────────────────
// Las claves (Gemini, push, etc.) nunca salen en el respaldo.
const SECRET_PATHS = [['openclawConfig', 'geminiApiKey'], ['openclawConfig', 'apiKey'], ['hermesConfig', 'geminiApiKey'], ['hermesConfig', 'apiKey'], ['pushConfig', 'privateKey']];

function stripSecrets(data) {
    const copy = JSON.parse(JSON.stringify(data));
    for (const [obj, key] of SECRET_PATHS) if (copy[obj]) delete copy[obj][key];
    delete copy._syncRev;
    return copy;
}

app.get('/api/backup', (req, res) => {
    const data = stripSecrets(readDB());
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="command-center-respaldo-${stamp}.json"`);
    res.json({ ...data, _backup: { createdAt: new Date().toISOString(), app: 'command-center', version: 1 } });
});

app.post('/api/backup/restore', (req, res) => {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming) || !hasContent(incoming)) {
        return res.status(400).json({ error: 'El archivo no parece un respaldo válido (no tiene eventos, tareas, contactos ni proyectos).' });
    }
    const current = readDB();
    lastBackupAt = 0;
    backupDBFile(); // copia de seguridad de lo actual antes de reemplazar
    const restored = { ...incoming };
    delete restored._backup; // metadatos del archivo, no se guardan
    delete restored._syncRev;
    // Conservar las claves actuales (el respaldo no las trae)
    for (const [obj, key] of SECRET_PATHS) {
        if (current[obj]?.[key]) restored[obj] = { ...(restored[obj] || {}), [key]: current[obj][key] };
    }
    writeDB(restored);
    res.json({ success: true, counts: ['events', 'tasks', 'projects', 'contacts', 'notes'].reduce((acc, k) => ({ ...acc, [k]: (restored[k] || []).length }), {}) });
});

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

// (módulo: server/routes/rag.js)
const { EmbeddedRAGEngine } = registerRagRoutes(app, { readDB, writeDB, upload, extractPdfText, rootDir: __dirname });

// (módulo: server/routes/whatsapp.js)
const { generateWeeklyCampaign } = registerWhatsAppRoutes(app, { readDB, writeDB, geminiKeyFor });

// Cron Task para preparación automática cada Lunes a las 09:00 AM
try {
    cron.schedule('0 9 * * 1', async () => {
        console.log('\n⏰ [Pulse WhatsApp Agent] Ejecutando compilación semanal programada (Lunes 09:00 AM)...');
        try {
            const { campaign, eventsCount, source } = await generateWeeklyCampaign({ weekOffset: 0 });
            const db = readDB();
            if (!db.whatsappLogs) db.whatsappLogs = [];
            db.whatsappLogs.unshift({
                id: `wlog-cron-${Date.now()}`,
                title: '⚡ Compilación Semanal Automática',
                target: 'Sistema / Borrador Semanal',
                channel: 'agent_cron',
                timestamp: new Date().toISOString(),
                status: 'ready',
                copyPreview: `Campaña "${campaign.name}" (${source === 'gemini' ? 'Gemini' : 'plantillas locales'}) para ${eventsCount} eventos.`
            });
            writeDB(db);
            console.log(`✅ [Pulse WhatsApp Agent] Campaña semanal compilada (${source}) para ${eventsCount} eventos.`);
        } catch (cronErr) {
            console.error('❌ [Pulse WhatsApp Agent] Error en cron semanal:', cronErr.message);
        }
    }, { timezone: APP_TIMEZONE });

    // Resumen de la mañana (8:00) y recordatorio de eventos de mañana (18:00), hora de Panamá
    cron.schedule('0 8 * * *', async () => {
        try {
            const r = await pushToUsers(buildDailyBrief(readDB(), todayIn(APP_TIMEZONE)));
            console.log(`🔔 [Push] Resumen diario enviado (${r.sent})`);
        } catch (err) { console.error('[Push] resumen diario:', err.message); }
    }, { timezone: APP_TIMEZONE });
    cron.schedule('0 18 * * *', async () => {
        try {
            const r = await pushToUsers(buildEveningReminders(readDB(), todayIn(APP_TIMEZONE)));
            if (r.sent) console.log(`🔔 [Push] Recordatorio de eventos enviado (${r.sent})`);
        } catch (err) { console.error('[Push] recordatorio:', err.message); }
    }, { timezone: APP_TIMEZONE });
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

// Mantener despierto el plan gratis de Render: se hace ping a la URL pública cada 10 min
// (solo si KEEP_ALIVE=true y Render da RENDER_EXTERNAL_URL). Con un plan pago no hace falta.
if (process.env.KEEP_ALIVE === 'true' && process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
        fetch(`${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/health`).catch(() => {});
    }, 10 * 60 * 1000).unref();
    console.log('   ⏰ Keep-alive activo: ping cada 10 min a', process.env.RENDER_EXTERNAL_URL);
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n⚡ Command Center API & Frontend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   OpenClaw Chat Proxy: POST http://localhost:${PORT}/api/openclaw/chat`);
    console.log(`   OpenClaw Health: GET http://localhost:${PORT}/api/openclaw/health`);
    
    // La restauración desde Supabase arrancó al cargar el módulo; las peticiones /api la esperan
    await supabaseReady();
    
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
