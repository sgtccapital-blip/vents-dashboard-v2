import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { ReferenceAnalysisSchema, playbookMarkdown } from '../src/services/contentStudio/referenceEngine.js';

const hasFfmpeg = (() => { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('detectCuts encuentra los cortes de un video con 3 planos', { skip: !hasFfmpeg && 'ffmpeg no instalado' }, async () => {
    const { detectCuts } = await import('../studio/bin/analyze-reference.mjs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuts-'));
    const file = path.join(dir, 'v.mp4');
    // Tres planos de color sólido de 1 s: cortes en ~1 s y ~2 s
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=320x568:d=1:r=30', '-f', 'lavfi', '-i', 'color=c=blue:s=320x568:d=1:r=30', '-f', 'lavfi', '-i', 'color=c=white:s=320x568:d=1:r=30', '-filter_complex', '[0][1][2]concat=n=3:v=1', '-pix_fmt', 'yuv420p', file]);
    const cuts = await detectCuts(file);
    fs.rmSync(dir, { recursive: true, force: true });
    assert.equal(cuts.length, 2);
    assert.ok(Math.abs(cuts[0] - 1) < 0.1 && Math.abs(cuts[1] - 2) < 0.1, `cortes: ${cuts}`);
});

test('playbookMarkdown arma la receta completa', () => {
    const analysis = {
        title: 'Recap con texto grande', summary: 'Resumen.',
        hook: { seconds: 1.5, description: 'Texto gigante', whyItWorks: 'Contraste' },
        structure: [{ t: '0-1.5s', beat: 'Gancho', description: 'Texto | grande' }],
        editing: { pace: 'Rápido', transitions: ['corte'], effects: [], cameraMoves: ['estático'], textStyle: 'Serif', captions: 'sin subtítulos', color: 'Rojo', audio: 'Bajo' },
        retentionTactics: ['FOMO'], whyItWorks: 'Exclusividad',
        technique: { name: 'Texto cinético', category: 'texto', originalTool: 'desconocida', steps: ['Paso 1'], parameters: ['0.3 s'] },
        recreate: { difficulty: 'fácil', ourTools: [{ tool: 'Remotion', how: 'OverlayText' }], shotList: ['Barra'], assetsNeeded: ['Logo'], needsNewBuild: true, buildNotes: 'Componente de texto cinético' },
        adaptations: [{ accountHandler: '@theroom.social', idea: 'Recap', hook: 'Solo invitados', why: 'Encaja' }],
    };
    assert.ok(ReferenceAnalysisSchema.safeParse(analysis).success);
    const md = playbookMarkdown({ type: 'viral', url: 'https://x.com/v' }, analysis, { duration: 12, cuts: 5, avgShot: 2 });
    assert.match(md, /^# Recap con texto grande/);
    assert.match(md, /12\.0 s · 5 cortes \(2\.00 s por plano\)/);
    assert.match(md, /\| 0-1\.5s \| Gancho \| Texto \/ grande \|/);
    assert.match(md, /Plantilla por construir:\*\* Componente de texto cinético/);
    assert.match(md, /\*\*@theroom\.social:\*\* Recap/);
});
