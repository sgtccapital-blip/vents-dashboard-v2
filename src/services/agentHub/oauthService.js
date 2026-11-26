import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');
const rand = () => crypto.randomBytes(32).toString('base64url');
const safe = (a,b) => crypto.timingSafeEqual(Buffer.from(sha(a)), Buffer.from(sha(b)));
const now = () => Date.now();
const isChatgptRedirect = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'chatgpt.com' && (u.pathname.startsWith('/connector/oauth/') || u.pathname === '/connector_platform_oauth_redirect'); } catch { return false; }
};

export function registerOAuth(app, { dir, publicUrl }) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'oauth.json');
  const base = publicUrl.replace(/\/$/, '');
  const resource = `${base}/mcp`;
  const issuer = `${base}/mcp/oauth`;
  const metadata = `${base}/mcp/.well-known/oauth-protected-resource`;
  let state = { clients: [], codes: [], tokens: [] };
  if (fs.existsSync(file)) state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const save = () => { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(state)); fs.renameSync(tmp, file); };
  const clean = () => { state.codes = state.codes.filter(x => x.expires > now()); state.tokens = state.tokens.filter(x => !x.revoked && x.expires > now()); };
  const challenge = `Bearer resource_metadata="${metadata}", error="invalid_token", error_description="Authorization required"`;
  app.get('/mcp/.well-known/oauth-protected-resource', (_req,res) => res.json({ resource, authorization_servers: [issuer], scopes_supported: ['read','write'] }));
  app.get('/mcp/oauth/.well-known/oauth-authorization-server', (_req,res) => res.json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, registration_endpoint: `${issuer}/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code','refresh_token'], token_endpoint_auth_methods_supported: ['none'], code_challenge_methods_supported: ['S256'], scopes_supported: ['read','write'], authorization_response_iss_parameter_supported: true }));
  app.post('/mcp/oauth/register', (req,res) => {
    const redirects = req.body?.redirect_uris;
    if (!Array.isArray(redirects) || !redirects.length || !redirects.every(isChatgptRedirect)) return res.status(400).json({ error: 'invalid_redirect_uri' });
    const client = { client_id: rand(), redirect_uris: redirects, client_name: String(req.body.client_name || 'ChatGPT').slice(0,100), token_endpoint_auth_method: 'none', createdAt: now() };
    state.clients.push(client); save(); res.status(201).json(client);
  });
  const validateAuth = q => {
    const client = state.clients.find(c => c.client_id === q.client_id);
    if (!client || !client.redirect_uris.includes(q.redirect_uri)) throw new Error('Cliente o callback inválido');
    if (q.response_type !== 'code' || q.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(q.code_challenge || '')) throw new Error('PKCE S256 requerido');
    if (q.resource !== resource) throw new Error('Recurso OAuth inválido');
    const scope = String(q.scope || 'read write').split(/\s+/).filter(Boolean);
    if (!scope.length || scope.some(x => !['read','write'].includes(x))) throw new Error('Scope inválido');
    return { client, scope };
  };
  const form = q => `<!doctype html><html lang="es"><meta charset="utf-8"><title>Autorizar ARRIVE Dashboard</title><body style="font:16px system-ui;max-width:34rem;margin:4rem auto"><h1>Autorizar ARRIVE Dashboard</h1><p>ChatGPT solicita acceso de lectura y escritura al dashboard. Revisa el conector antes de continuar.</p><form method="post" action="/mcp/oauth/authorize"><input type="hidden" name="request" value="${Buffer.from(JSON.stringify(q)).toString('base64url')}"><label>Contraseña del dashboard <input type="password" name="password" required autocomplete="current-password"></label><button>Autorizar</button></form></body></html>`;
  app.get('/mcp/oauth/authorize', (req,res) => { try { validateAuth(req.query); res.type('html').send(form(req.query)); } catch(e) { res.status(400).send(e.message); } });
  const attempts = new Map();
  app.post('/mcp/oauth/authorize', (req,res) => {
    let q;
    try { q = JSON.parse(Buffer.from(req.body.request || '', 'base64url').toString('utf8')); validateAuth(q); } catch(e) { return res.status(400).send(e.message); }
    const key = req.ip || 'unknown', recent = (attempts.get(key) || []).filter(t => now()-t < 900000);
    if (recent.length >= 10) return res.status(429).send('Demasiados intentos');
    if (!process.env.DASHBOARD_PASSWORD || !safe(req.body.password || '', process.env.DASHBOARD_PASSWORD)) { recent.push(now()); attempts.set(key,recent); return res.status(401).type('html').send(form(q)); }
    attempts.delete(key);
    const code = rand();
    state.codes.push({ hash: sha(code), clientId: q.client_id, redirectUri: q.redirect_uri, challenge: q.code_challenge, resource, scope: String(q.scope || 'read write'), expires: now()+300000 });
    clean(); save();
    const redirect = new URL(q.redirect_uri); redirect.searchParams.set('code',code); if (q.state) redirect.searchParams.set('state',q.state); redirect.searchParams.set('iss',issuer);
    res.redirect(302,redirect.toString());
  });
  app.post('/mcp/oauth/token', (req,res) => {
    clean(); const body = req.body || {}, client = state.clients.find(c => c.client_id === body.client_id);
    if (!client) return res.status(400).json({error:'invalid_client'});
    if (body.grant_type === 'authorization_code') {
      const code = state.codes.find(x => x.hash === sha(body.code || ''));
      const challenge = crypto.createHash('sha256').update(String(body.code_verifier || '')).digest('base64url');
      if (!code || code.clientId !== client.client_id || code.redirectUri !== body.redirect_uri || code.challenge !== challenge || body.resource !== resource) return res.status(400).json({error:'invalid_grant'});
      state.codes = state.codes.filter(x => x !== code);
      return issue(res, client.client_id, code.scope);
    }
    if (body.grant_type === 'refresh_token') {
      const old = state.tokens.find(x => x.kind === 'refresh' && x.hash === sha(body.refresh_token || '') && x.clientId === client.client_id && x.resource === body.resource);
      if (!old) return res.status(400).json({error:'invalid_grant'});
      old.revoked = true;
      return issue(res, client.client_id, old.scope);
    }
    res.status(400).json({error:'unsupported_grant_type'});
  });
  function issue(res,clientId,scope) {
    const access = rand(), refresh = rand();
    state.tokens.push({ hash: sha(access), kind:'access', clientId, resource, scope, expires: now()+3600000 }, { hash: sha(refresh), kind:'refresh', clientId, resource, scope, expires: now()+90*86400000 });
    clean(); save();
    return res.json({ access_token: access, token_type:'Bearer', expires_in:3600, refresh_token:refresh, scope });
  }
  const verify = token => {
    if (!token) return null;
    const t = state.tokens.find(x => x.kind === 'access' && !x.revoked && x.expires > now() && x.resource === resource && x.hash === sha(token) && state.clients.some(c => c.client_id === x.clientId && !c.revoked));
    return t ? { agent:'ChatGPT', scope:t.scope.split(' ').includes('write') ? 'write':'read', tokenId: `oauth:${t.clientId}` } : null;
  };
  const list = () => state.clients.map(({ client_id, client_name, createdAt, revoked }) => ({ id: client_id, name: client_name, createdAt, revoked: !!revoked }));
  const revoke = clientId => { const client = state.clients.find(c => c.client_id === clientId); if (!client) return false; client.revoked = true; for (const t of state.tokens) if (t.clientId === clientId) t.revoked = true; save(); return true; };
  return { verify, challenge, list, revoke };
}
