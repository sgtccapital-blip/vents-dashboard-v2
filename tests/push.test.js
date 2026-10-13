import { test } from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDailyBrief, buildEveningReminders, ensureVapid, sendToUsers, todayIn } from '../server/push.js';

const TODAY = new Date(2026, 9, 13); // martes 13 oct 2026

const db = () => ({
    tasks: [
        { id: 't1', text: 'Contrato DJ', assignee: 'MARIO', due: '2026-10-10', status: 'pending' },
        { id: 't2', text: 'Pedir hielo', assignee: 'MARIO', due: '2026-10-13', status: 'pending' },
        { id: 't3', text: 'Hecha', assignee: 'MARIO', due: '2026-10-01', status: 'done' },
        { id: 't4', text: 'Flyer', assignee: 'ANDREA', status: 'pending' },
    ],
    events: [
        { id: 'e1', name: 'Sunset Session', date: '2026-10-14', time: '18:00', location: 'Terraplén' },
        { id: 'p1', name: 'Proyecto espejo', date: '2026-10-14', category: 'project' },
    ],
});

test('todayIn usa la zona horaria del negocio', () => {
    // 2026-10-14 03:00 UTC = 13 oct 22:00 en Panamá
    const d = todayIn('America/Panama', new Date(Date.UTC(2026, 9, 14, 3, 0)));
    assert.equal(d.getDate(), 13);
});

test('resumen de la mañana: vencidas y de hoy por persona, sin tareas hechas', () => {
    const brief = buildDailyBrief(db(), TODAY);
    const mario = brief.find(m => m.user === 'MARIO');
    assert.match(mario.body, /1 vencida: Contrato DJ/);
    assert.match(mario.body, /Para hoy: Pedir hielo/);
    assert.doesNotMatch(mario.body, /Hecha/);
    assert.match(mario.body, /Mañana: Sunset Session/);
    assert.equal(mario.url, '/workspace');
    const andrea = brief.find(m => m.user === 'ANDREA');
    assert.match(andrea.body, /1 pendiente/);
});

test('recordatorio de la tarde: eventos de mañana, ignora espejos de proyectos', () => {
    const msgs = buildEveningReminders(db(), TODAY);
    assert.ok(msgs.length > 0);
    assert.equal(msgs[0].title, 'Mañana: Sunset Session');
    assert.match(msgs[0].body, /18:00 · Terraplén/);
    assert.equal(msgs[0].url, '/eventos/e1');
    assert.equal(buildEveningReminders({ events: [] }, TODAY).length, 0);
});

test('ensureVapid genera claves una sola vez y las guarda', () => {
    const d = {};
    const a = ensureVapid(d);
    assert.equal(a.created, true);
    const b = ensureVapid(d);
    assert.equal(b.created, false);
    assert.equal(b.publicKey, a.publicKey);
});

test('sendToUsers envía cifrado solo a la persona indicada y borra suscripciones caducadas', async () => {
    // web-push siempre usa HTTPS: servidor local con certificado temporal
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-test-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1',
        '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
    const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const received = [];
    const server = https.createServer({ key: fs.readFileSync(path.join(dir, 'k.pem')), cert: fs.readFileSync(path.join(dir, 'c.pem')) }, (req, res) => {
        let n = 0;
        req.on('data', c => { n += c.length; });
        req.on('end', () => {
            received.push({ url: req.url, encoding: req.headers['content-encoding'], bytes: n });
            res.writeHead(req.url === '/gone' ? 410 : 201);
            res.end();
        });
    });
    await new Promise(r => server.listen(0, r));
    const base = `https://127.0.0.1:${server.address().port}`;
    const keysFor = () => {
        const ecdh = crypto.createECDH('prime256v1');
        ecdh.generateKeys();
        return { p256dh: ecdh.getPublicKey('base64url'), auth: crypto.randomBytes(16).toString('base64url') };
    };
    try {
        const d = {
            pushSubscriptions: [
                { user: 'MARIO', subscription: { endpoint: `${base}/mario`, keys: keysFor() } },
                { user: 'ANDREA', subscription: { endpoint: `${base}/andrea`, keys: keysFor() } },
                { user: 'MARIO', subscription: { endpoint: `${base}/gone`, keys: keysFor() } },
            ],
        };
        const vapid = ensureVapid(d);
        const r = await sendToUsers(d, [{ user: 'MARIO', title: 'Hola', body: 'x' }], vapid);
        assert.equal(r.sent, 1);
        assert.equal(r.removed, 1);
        assert.deepEqual(received.map(x => x.url).sort(), ['/gone', '/mario']);
        assert.equal(received.find(x => x.url === '/mario').encoding, 'aes128gcm');
        assert.deepEqual(d.pushSubscriptions.map(s => s.subscription.endpoint), [`${base}/mario`, `${base}/andrea`]);
    } finally {
        server.close();
        if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
