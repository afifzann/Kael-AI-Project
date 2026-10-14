import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { packageBuyer } from '../scripts/package-buyer.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { authenticateTestServer } from './helpers/auth-client.mjs';

test('buyer package allowlist excludes owner data/history/secrets and strips owner Builder identity', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kael-package-')), output = path.join(root, 'releases', 'buyer');
  const files = ['package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'scripts/dev.mjs', 'scripts/owner-access.mjs', 'scripts/building.mjs', 'docs/BUYER-SETUP.md', 'src/domain.ts', 'server/index.mjs', 'server/__pycache__/cached.pyc', 'public/favicon.svg', 'app-data/state.json', '.env', '.codex/session.json', 'lembur-backup-lengkap/secret.txt'];
  for (const file of files) { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), file.startsWith('app-data') || file.startsWith('.env') ? 'OWNER-PRIVATE-FIXTURE' : 'fixture'); }
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '0.2.0', scripts: { test: 'private-tests', dev: 'node scripts/dev.mjs', 'package:buyer': 'internal-only' } }));
  await writeFile(path.join(root, 'src/builder-room.ts'), "// This is the owner's existing Codex chat, not a separate employee runtime.\nexport const builderSession = {\n title: 'Builder', threadId: 'OWNER-CHAT-FIXTURE', url: 'codex://threads/OWNER-CHAT-FIXTURE',\n};\nexport const builderAgent = {};\n");
  const result = await packageBuyer(root, output); assert.ok(result.files > 10);
  const manifest = JSON.parse(await readFile(path.join(output, 'buyer-manifest.json'), 'utf8'));
  for (const [file, hash] of Object.entries(manifest.files)) {
    assert.doesNotMatch(file, /^(app-data|\.env|\.codex|lembur-backup)/);
    assert.doesNotMatch(file, /__pycache__/);
    const bytes = await readFile(path.join(output, file)); assert.equal(createHash('sha256').update(bytes).digest('hex'), hash); assert.doesNotMatch(bytes.toString(), /OWNER-PRIVATE-FIXTURE|OWNER-CHAT-FIXTURE/);
  }
  assert.match(await readFile(path.join(output, 'src/builder-room.ts'), 'utf8'), /threadId: ''/);
  const config = JSON.parse(await readFile(path.join(output, 'package.json'), 'utf8')); assert.equal(config.scripts.test, undefined); assert.equal(config.scripts.dev, 'node scripts/dev.mjs');
  await assert.rejects(packageBuyer(root, output), /EEXIST/); assert.equal((await readdir(output)).includes('app-data'), false);
});

test('unexpected files in application directories fail before package creation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kael-package-deny-'));
  await mkdir(path.join(root, 'src')); await writeFile(path.join(root, 'src', 'credentials.json'), 'dummy fixture');
  await assert.rejects(packageBuyer(root, path.join(root, 'buyer')), /bukan sumber/);
  assert.deepEqual((await readdir(root)).sort(), ['src']);
});

test('actual application package starts as a fresh buyer and cannot inherit the owner Builder session', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-real-package-')), output = path.join(directory, 'buyer'), data = path.join(directory, 'data');
  const root = fileURLToPath(new URL('../', import.meta.url));
  await packageBuyer(root, output);
  // Reuse installed dependencies for this offline test; never include them in the buyer manifest.
  await symlink(path.join(root, 'node_modules'), path.join(output, 'node_modules'), 'junction');
  const fixture = path.join(directory, 'runtime.mjs');
  await writeFile(fixture, "globalThis[Symbol.for('kael.runtime.fixture')]={status:()=>({available:false,label:'Fixture',reason:'Belum login'}),turn:()=>{throw new Error('Never run AI in packaging tests')}};");
  const child = spawn(process.execPath, ['--import', pathToFileURL(fixture).href, path.join(output, 'server/index.mjs')], { cwd: output, windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: data, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = ''; child.stderr.on('data', b => diagnostic = (diagnostic + b.toString()).slice(-4000));
  let clearAuth;
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Buyer server startup timed out')); }, 15000);
      child.stdout.on('data', b => { const match = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
      child.on('error', reject); child.on('exit', code => { clearTimeout(timer); if (code) reject(new Error('Buyer server exited ' + code + ': ' + diagnostic)); });
    });
    clearAuth = await authenticateTestServer(url, data);
    const state = await (await fetch(url + '/api/state')).json();
    assert.equal(state.onboarding.step, 'profile'); assert.equal(state.business.name, 'Kantor saya');
    for (const list of ['divisions', 'agents', 'briefs', 'tasks', 'decisions', 'events']) assert.deepEqual(state[list], []);
    assert.equal(state.workflowBindings, undefined); assert.equal(state.builderChat.connection, 'disconnected'); assert.equal(state.builderChat.chatUrl, undefined);
    assert.equal((await readdir(output)).includes('app-data'), false);
  } finally { if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } clearAuth?.(); }
});
