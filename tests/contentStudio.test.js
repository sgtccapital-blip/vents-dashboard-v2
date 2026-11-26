import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFolderId, createDriveClient, crawlFolder, FOLDER_MIME } from '../src/services/contentStudio/drive.js';
import { parseNightDate, buildAliases, matchAccounts, toAsset, mergeAssets, groupNights, kindOf } from '../src/services/contentStudio/rawLibrary.js';
import { renderBrief, slugify } from '../src/services/contentStudio/brief.js';
import { IdeaSchema, DevelopmentSchema } from '../src/services/contentStudio/ideaEngine.js';

const BRANDS = [
    { accountId: 'social-theroom-social', name: 'THE ROOM', slug: 'the-room', handler: '@theroom.social', driveAliases: ['the room', 'theroom'] },
    { accountId: 'social-udp-pa', name: 'UDP', slug: 'udp', handler: '@UDP.PA', driveAliases: ['casco peatonal'] },
    { accountId: 'social-igniteclub', name: 'IGNITE CLUB', slug: 'ignite', handler: '@theigniteclubb', driveAliases: ['ignite'] },
];

test('parseFolderId acepta links y ids', () => {
    assert.equal(parseFolderId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp?usp=sharing'), '1AbCdEfGhIjKlMnOp');
    assert.equal(parseFolderId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp'), '1AbCdEfGhIjKlMnOp');
    assert.equal(parseFolderId('1AbCdEfGhIjKlMnOp'), '1AbCdEfGhIjKlMnOp');
    assert.equal(parseFolderId('hola'), null);
});

test('parseNightDate entiende varios formatos', () => {
    assert.equal(parseNightDate('2026-10-04 The Room Terraplén'), '2026-10-04');
    assert.equal(parseNightDate('04-10-2026 Ignite'), '2026-10-04');
    assert.equal(parseNightDate('04.10.26 ignite'), '2026-10-04');
    assert.equal(parseNightDate('Sábado 4 de octubre 2026'), '2026-10-04');
    assert.equal(parseNightDate('4 sep', 2026), '2026-09-04');
    assert.equal(parseNightDate('Material sin fecha'), null);
});

test('matchAccounts detecta la cuenta por nombre de carpeta', () => {
    const aliases = buildAliases(BRANDS);
    assert.deepEqual(matchAccounts('2026-10-04 THE ROOM @ Terraplén', aliases), ['social-theroom-social']);
    assert.deepEqual(matchAccounts('TheRoom_cam2', aliases), ['social-theroom-social']);
    assert.deepEqual(matchAccounts('Domingo Casco Peatonal', aliases), ['social-udp-pa']);
    assert.deepEqual(matchAccounts('Ignite + The Room b2b', aliases).sort(), ['social-igniteclub', 'social-theroom-social']);
    assert.deepEqual(matchAccounts('roomba cleaning', aliases), []);
});

test('toAsset y mergeAssets conservan lo clasificado a mano', () => {
    const aliases = buildAliases(BRANDS);
    const entry = (id, name, folder) => ({
        file: { id, name, mimeType: 'video/mp4', createdTime: '2026-10-05T03:00:00Z', videoMediaMetadata: { durationMillis: '12400', width: 1080, height: 1920 } },
        trail: [{ id: 'f1', name: folder }],
    });
    const a = toAsset(entry('d1', 'IMG_0001.MOV', '2026-10-04 The Room'), aliases);
    assert.equal(a.kind, 'video');
    assert.equal(a.durationSec, 12.4);
    assert.equal(a.orientation, 'vertical');
    assert.equal(a.nightDate, '2026-10-04');
    assert.deepEqual(a.detectedAccountIds, ['social-theroom-social']);

    const first = mergeAssets([], [a]);
    assert.equal(first.added, 1);
    const manual = first.assets.map(x => ({ ...x, accountIds: ['social-igniteclub'], accountIdsManual: true, status: 'used', usedIn: ['ct-1'] }));
    const second = mergeAssets(manual, [a]);
    assert.equal(second.added, 0);
    assert.deepEqual(second.assets[0].accountIds, ['social-igniteclub']);
    assert.equal(second.assets[0].status, 'used');
    const third = mergeAssets(second.assets, []);
    assert.equal(third.missing, 1);
    assert.equal(third.assets[0].status, 'missing');
    assert.equal(groupNights(first.assets)[0].total, 1);
    assert.equal(kindOf('image/heic'), 'image');
});

test('crawlFolder recorre noches y subcarpetas con la API de Drive', async () => {
    const tree = {
        root: { id: 'root', name: 'Raw nights' },
        children: {
            root: [{ id: 'n1', name: '2026-10-04 The Room', mimeType: FOLDER_MIME }, { id: 'x', name: 'suelto.jpg', mimeType: 'image/jpeg' }],
            n1: [{ id: 'cam', name: 'Cam A', mimeType: FOLDER_MIME }, { id: 'v1', name: 'drop.mov', mimeType: 'video/quicktime' }],
            cam: [{ id: 'v2', name: 'crowd.mov', mimeType: 'video/quicktime' }],
        },
    };
    const calls = [];
    const fetchImpl = async url => {
        calls.push(url);
        const u = new URL(url);
        assert.equal(u.searchParams.get('key'), 'test-key');
        if (u.pathname.endsWith('/files')) {
            const parent = u.searchParams.get('q').match(/'([^']+)' in parents/)[1];
            return { ok: true, json: async () => ({ files: tree.children[parent] || [] }) };
        }
        return { ok: true, json: async () => tree.root };
    };
    const client = createDriveClient({ apiKey: 'test-key', fetchImpl });
    const { root, entries } = await crawlFolder(client, 'root');
    assert.equal(root.name, 'Raw nights');
    assert.deepEqual(entries.map(e => e.file.id).sort(), ['v1', 'v2', 'x']);
    assert.deepEqual(entries.find(e => e.file.id === 'v2').trail.map(t => t.name), ['2026-10-04 The Room', 'Cam A']);
    assert.ok(calls.length >= 4);
});

test('renderBrief arma el paquete de producción con links al raw', () => {
    const md = renderBrief({
        task: { title: 'Recap Edición 7', format: 'Reel 9:16', pillar: 'Recap', status: 'script', rawAssetIds: ['raw-d1'], development: {
            hookVerbal: 'Esta noche, solo invitados', hookVisual: 'Tacón en luz roja', durationSec: 12,
            edl: [{ order: 1, assetId: 'raw-d1', inSec: 0, outSec: 2, purpose: 'Gancho', overlay: 'MEMBERS', subtitle: '', transition: 'corte' }],
            music: 'Reggaetón', cover: { title: 'EDICIÓN 07', assetId: 'raw-d1' }, endcard: 'Búho', stories: [{ type: 'poll', text: '¿Mesa o pista?', when: 'día siguiente' }],
            caption: 'Gracias por venir', hashtags: '#theroom', cta: 'Tickets en bio', checklist: ['Color rojo vino'],
        } },
        account: { handler: '@theroom.social' },
        brand: null,
        assets: [{ id: 'raw-d1', name: 'drop.mov', kind: 'video', durationSec: 12, nightName: '2026-10-04 The Room', webViewLink: 'https://drive.google.com/file/d/d1/view' }],
        accountSlug: 'theroom-social',
    });
    assert.match(md, /# Recap Edición 7/);
    assert.match(md, /\| 1 \| \[drop\.mov\]\(https:\/\/drive\.google\.com\/file\/d\/d1\/view\) \| 0s → 2s \| Gancho \| MEMBERS/);
    assert.match(md, /\*\*Encuesta\*\* \(día siguiente\): ¿Mesa o pista\?/);
    assert.match(md, /- \[ \] Color rojo vino/);
    assert.equal(slugify('Recap Edición Nº 7!'), 'recap-edicion-n-7');
});

test('los esquemas de IA validan la forma esperada', () => {
    assert.ok(IdeaSchema.safeParse({ ideas: [] }).success);
    assert.ok(!DevelopmentSchema.safeParse({ hookVerbal: 'x' }).success);
});

test('generadores: prompt de marca y costo estimado', async () => {
    const { brandPrompt, estimateCost } = await import('../src/services/contentStudio/generators.js');
    const brand = {
        name: 'THE ROOM', descriptor: 'Social Club', essence: 'Club privado',
        imagery: { treatment: 'Viraje rojo vino.', photography: 'Detalles de lujo.', avoid: 'Flash directo.' },
        colors: [{ name: 'Noir', hex: '#0B0505' }, { name: 'Bordeaux', hex: '#7A0E0E' }],
        content: { video: { camera: 'Gimbal lento.', grade: 'Rojo.', transitions: 'Fundidos.' } },
    };
    const p = brandPrompt(brand, 'copa con luz roja', 'video');
    assert.match(p, /^copa con luz roja/);
    assert.match(p, /bordeaux #7A0E0E/);
    assert.match(p, /Camera: Gimbal lento/);
    assert.match(p, /No text, no captions, no logos/);
    assert.equal(brandPrompt(null, 'x', 'image'), 'x');
    assert.equal(estimateCost({ provider: 'google', kind: 'video', model: 'veo-3.1-fast-generate-preview', resolution: '1080p', durationSeconds: 8 }), 0.96);
    assert.equal(estimateCost({ provider: 'google', kind: 'image', model: 'gemini-3.1-flash-image', size: '2K', count: 2 }), 0.202);
    assert.equal(estimateCost({ provider: 'higgsfield', kind: 'video', model: 'x' }), null);
});

test('el material IA local sobrevive al sync de Drive y lo de Flow en Drive se marca como IA', () => {
    const aliases = buildAliases(BRANDS);
    const ai = { id: 'ai-1', driveId: null, localPath: 'content-dna/x/ai/a.png', kind: 'image', status: 'new', accountIds: ['social-igniteclub'] };
    const { assets } = mergeAssets([ai], []);
    assert.deepEqual(assets.map(a => [a.id, a.status]), [['ai-1', 'new']]);
    const flow = toAsset({ file: { id: 'f9', name: 'shot1.mp4', mimeType: 'video/mp4' }, trail: [{ id: 'n', name: '2026-10-04 Ignite' }, { id: 'f', name: 'Flow' }] }, aliases);
    assert.equal(flow.source, 'ai');
    assert.deepEqual(flow.detectedAccountIds, ['social-igniteclub']);
});
