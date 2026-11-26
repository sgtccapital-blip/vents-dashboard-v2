// Redacción de secretos antes de responder a un agente o escribir un log.
// Cubre llaves conocidas por formato, cabeceras Bearer, URLs con credenciales y los valores
// reales de las variables de entorno que parecen secretos (para no filtrarlos aunque no tengan un formato reconocible).

const PATTERNS = [
    /\bcc_[A-Za-z0-9_-]{16,}/g,                                   // llaves de agente del hub
    /\bsk-(?:ant-|proj-|or-v1-)?[A-Za-z0-9_-]{16,}/g,             // OpenAI / Anthropic / OpenRouter
    /\bgh[pousr]_[A-Za-z0-9]{20,}/g,                              // GitHub
    /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    /\bAIza[0-9A-Za-z_-]{30,}/g,                                  // Google API key
    /\bya29\.[0-9A-Za-z_-]{20,}/g,                                // Google OAuth access token
    /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,                             // AWS access key id
    /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,                           // Slack
    /\brnd_[A-Za-z0-9]{20,}/g,                                    // Render
    /\bpcsk_[A-Za-z0-9_]{20,}/g,                                  // Pinecone
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];
const CONTEXTUAL = [
    [/(\bBearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[REDACTED]'],
    [/(\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)[^\s@/]+@/gi, '$1[REDACTED]@'],
    [/((?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|authorization)["']?\s*[:=]\s*["']?)[^\s"',;}{]{6,}/gi, '$1[REDACTED]'],
];

const SECRET_ENV = /(KEY|TOKEN|SECRET|PASSWORD|PASS|PRIVATE|CREDENTIAL|SERVICE_ACCOUNT|AUTH|COOKIE|DSN)/i;
let envValues = null;
function secretEnvValues() {
    if (envValues) return envValues;
    envValues = Object.entries(process.env)
        .filter(([k, v]) => SECRET_ENV.test(k) && typeof v === 'string' && v.length >= 8 && !/^(true|false|\d+)$/i.test(v))
        .map(([, v]) => v)
        .sort((a, b) => b.length - a.length);
    return envValues;
}
/** Vuelve a leer process.env (tras cargar .env o en pruebas). */
export function refreshSecretEnv() { envValues = null; }

/**
 * contextual=false deja intactas asignaciones como `password = process.env.X` (lectura de código:
 * el agente necesita el texto exacto para parchear); solo quita valores con formato de llave y los del entorno.
 */
export function redactText(input, { contextual = true } = {}) {
    if (input === null || input === undefined) return input;
    let s = String(input);
    for (const v of secretEnvValues()) if (s.includes(v)) s = s.split(v).join('[REDACTED]');
    for (const re of PATTERNS) s = s.replace(re, '[REDACTED]');
    if (contextual) for (const [re, rep] of CONTEXTUAL) s = s.replace(re, rep);
    return s;
}

export const containsSecret = (input, opts) => redactText(input, opts) !== String(input ?? '');

const SECRET_FIELD = /^(password|passwd|secret|token|apiKey|api_key|accessToken|refreshToken|clientSecret|privateKey|hash|authorization|cookie)$/i;

/** Copia profunda redactada (campos sensibles por nombre y valores de texto por patrón). */
export function redactDeep(value, depth = 0) {
    if (depth > 12) return '[…]';
    if (typeof value === 'string') return redactText(value);
    if (Array.isArray(value)) return value.map(v => redactDeep(v, depth + 1));
    if (value && typeof value === 'object') {
        if (Buffer.isBuffer(value)) return value;
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = SECRET_FIELD.test(k) && v ? '[REDACTED]' : redactDeep(v, depth + 1);
        return out;
    }
    return value;
}
