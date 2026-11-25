// Biblioteca de repos: lectura de enlaces, detección de skills/agentes, clonado, índice e instalación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseGithubUrl, parseFrontmatter, scanRepo, createLibrary } from '../src/services/library/library.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cc-library-'));
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };

test('parseGithubUrl entiende los formatos habituales', () => {
    assert.equal(parseGithubUrl('https://github.com/anthropics/skills').id, 'anthropics/skills');
    assert.equal(parseGithubUrl('github.com/anthropics/skills.git').id, 'anthropics/skills');
    assert.deepEqual(parseGithubUrl('https://github.com/anthropics/skills/tree/main/skills/pdf'), { owner: 'anthropics', name: 'skills', id: 'anthropics/skills', subpath: 'skills/pdf' });
    assert.equal(parseGithubUrl('git@github.com:foo/bar.git').id, 'foo/bar');
    assert.equal(parseGithubUrl('foo/bar').id, 'foo/bar');
    assert.equal(parseGithubUrl('https://gitlab.com/foo/bar'), null);
    assert.equal(parseGithubUrl('../etc'), null);
});

test('parseFrontmatter lee valores simples, entre comillas y en bloque', () => {
    const { data, body } = parseFrontmatter('---\nname: pdf\ndescription: >\n  Lee y crea\n  PDFs\nlicense: "MIT"\n---\n# Cuerpo');
    assert.equal(data.name, 'pdf');
    assert.equal(data.description, 'Lee y crea PDFs');
    assert.equal(data.license, 'MIT');
    assert.equal(body.trim(), '# Cuerpo');
});

function fixtureRepo() {
    const dir = tmp();
    write(dir, 'README.md', '# Colección\nSkills para documentos.');
    write(dir, 'skills/pdf/SKILL.md', '---\nname: pdf\ndescription: Crea y edita PDFs\n---\n# PDF\nUsa pypdf.');
    write(dir, 'skills/pdf/scripts/fill.py', 'print(1)');
    write(dir, 'agents/reviewer.md', '---\nname: reviewer\ndescription: Revisa código\n---\nSé estricto.');
    write(dir, 'docs/notes.md', 'sin frontmatter');
    write(dir, 'node_modules/x/SKILL.md', '---\nname: ignorada\n---');
    execFileSync('git', ['init', '-q', dir]);
    execFileSync('git', ['-C', dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '.']);
    execFileSync('git', ['-C', dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init']);
    return dir;
}

test('scanRepo encuentra skills y agentes e ignora node_modules', () => {
    const { skills, agents } = scanRepo(fixtureRepo());
    assert.deepEqual(skills.map(s => [s.name, s.path, s.files]), [['pdf', path.join('skills', 'pdf', 'SKILL.md'), 2]]);
    assert.deepEqual(agents.map(a => a.name), ['reviewer']);
});

test('createLibrary clona, indexa en el RAG e instala skills', async () => {
    const origin = fixtureRepo();
    const dataDir = tmp();
    const projectDir = tmp();
    const otherProject = tmp();
    const indexed = [];
    // git real, pero la URL de GitHub se redirige al repo local de prueba.
    const git = (args) => new Promise((resolve, reject) => {
        const real = args.map(a => (a.startsWith('https://github.com/') ? origin : a));
        try { resolve({ stdout: execFileSync('git', real, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }); } catch (e) { reject(e); }
    });
    const lib = createLibrary({
        dataDir, projectDir, git, log: { warn() {}, error() {} },
        fetchMeta: async () => ({ description: 'Skills de prueba', stars: 42, topics: ['skills'] }),
        knowledge: { indexSource: (source, docs) => { indexed.push({ source, docs }); return { changed: docs.length, removed: 0 }; } },
    });

    const added = lib.addRepo({ url: 'https://github.com/acme/skills', tags: 'Docs, pdf ', notes: 'para facturas' });
    assert.equal(added.status, 'cloning');
    assert.deepEqual(added.tags, ['docs', 'pdf']);
    assert.throws(() => lib.addRepo({ url: 'acme/skills' }), /ya está/);
    assert.throws(() => lib.addRepo({ url: 'no es un enlace' }), /No reconozco/);

    await lib.sync('acme/skills'); // espera al clonado en curso (no-op) …
    for (let i = 0; i < 50 && lib.get('acme/skills').status !== 'ready'; i++) await new Promise(r => setTimeout(r, 20));
    const repo = lib.get('acme/skills');
    assert.equal(repo.status, 'ready', repo.error);
    assert.equal(repo.stars, 42);
    assert.equal(repo.skills.length, 1);

    const last = indexed.at(-1);
    assert.equal(last.source, 'library');
    assert.deepEqual(last.docs.map(d => d.kind).sort(), ['agent', 'repo', 'skill']);
    assert.match(last.docs.find(d => d.kind === 'repo').text, /para facturas/);

    const skillPath = repo.skills[0].path;
    const r1 = lib.install({ repoId: 'acme/skills', itemPath: skillPath, target: 'project' });
    assert.equal(r1.dest, path.join(projectDir, '.claude', 'skills', 'pdf'));
    assert.ok(fs.existsSync(path.join(r1.dest, 'scripts', 'fill.py')));
    assert.throws(() => lib.install({ repoId: 'acme/skills', itemPath: skillPath, target: 'project' }), /Ya existe/);
    lib.install({ repoId: 'acme/skills', itemPath: skillPath, target: 'project', overwrite: true });

    const r2 = lib.install({ repoId: 'acme/skills', itemPath: repo.agents[0].path, target: 'path', path: otherProject });
    assert.equal(r2.dest, path.join(otherProject, '.claude', 'agents', 'reviewer.md'));
    assert.throws(() => lib.install({ repoId: 'acme/skills', itemPath: skillPath, target: 'path', path: 'relativa' }), /absoluta/);

    const listed = lib.list()[0];
    assert.deepEqual(listed.skills[0].installed, ['project']);
    assert.deepEqual(listed.agents[0].installed, [otherProject]);
    assert.match(lib.getItem('acme/skills', skillPath).content, /Usa pypdf/);

    // Persistencia: una instancia nueva lee lo guardado.
    const again = createLibrary({ dataDir, projectDir, git, fetchMeta: async () => null, log: { warn() {}, error() {} } });
    assert.equal(again.get('acme/skills').skills.length, 1);

    assert.ok(lib.removeRepo('acme/skills'));
    assert.ok(!fs.existsSync(lib.repoDir('acme/skills')));
    assert.equal(indexed.at(-1).docs.length, 0);
});
