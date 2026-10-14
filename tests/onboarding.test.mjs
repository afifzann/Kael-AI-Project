import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyCommand } from '../src/domain.ts';
import { runnableProviders, runtimeFor } from '../src/runtime-status.ts';
import { firstWorkSteps, teamTemplates, templateLimits } from '../src/onboarding-model.ts';
import { authenticateTestServer, rawFetch } from './helpers/auth-client.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const profile = { type: 'onboarding', step: 'profile', name: 'Aurora Studio', audience: 'Pemilik usaha lokal', facts: 'Menyiapkan konten dan dokumen. Jangan mengarang harga.' };
const team = { type: 'onboarding', step: 'team', template: 'content', name: 'Kreatif', manager: 'Ayu', workers: [{ name: 'Bima', role: 'Riset' }, { name: 'Citra', role: 'Naskah' }] };

test('buyer setup saves editable team/SOP once, creates no tasks/approvals, preserves immutable input', () => {
  const empty = initialState(), before = structuredClone(empty);
  assert.throws(() => applyCommand(empty, team), /profil/);
  const profileState = applyCommand(empty, profile); assert.deepEqual(empty, before); assert.equal(profileState.revision, 1);
  const state = applyCommand(profileState, team);
  assert.equal(state.revision, 2); assert.equal(state.business.name, 'Aurora Studio'); assert.equal(state.divisions[0].name, 'Kreatif');
  assert.deepEqual(state.agents.map(a => a.name), ['Ayu', 'Bima', 'Citra']); assert.equal(state.sops[0].limits, templateLimits);
  assert.equal(state.onboarding.step, 'connection'); assert.deepEqual([state.tasks, state.briefs, state.decisions], [[], [], []]);
  assert.throws(() => applyCommand(state, team), /sudah diterapkan/);
  assert.throws(() => applyCommand(profileState, { ...team, workers: [{ name: 'Ayu', role: 'Riset' }] }), /berbeda/);
  assert.throws(() => applyCommand(profileState, { ...team, template: 'unknown' }), /Template/);
  assert.deepEqual(profileState.divisions, [], 'failed setup must not leave partial team');
  const ready = applyCommand(state, { type: 'onboarding', step: 'connection', provider: 'Codex' });
  assert.equal(ready.revision, 3); assert.equal(ready.agentSettings.length, 3); assert.ok(ready.agentSettings.every(a => a.provider === 'Codex'));
  assert.ok(ready.onboarding.completedAt); assert.throws(() => applyCommand(ready, profile), /sudah selesai/);
  assert.equal(firstWorkSteps(ready).filter(v => v.done).length, 1);
  assert.equal(firstWorkSteps(ready)[2].view, 'briefs');
  assert.equal(firstWorkSteps(ready)[4].view, 'activity');
  const awaiting = { ...ready, decisions: [{ type: 'plan', status: 'pending' }, { type: 'result', status: 'pending' }] };
  assert.equal(firstWorkSteps(awaiting)[2].view, 'decisions'); assert.equal(firstWorkSteps(awaiting)[4].view, 'decisions');
});

test('empty/manual setup stays empty, legacy offices cannot be reset and onboarding needs no fixed roster', () => {
  let s = applyCommand(initialState(), profile);
  s = applyCommand(s, { type: 'onboarding', step: 'team', template: 'empty' });
  assert.throws(() => applyCommand(s, { type: 'onboarding', step: 'connection', provider: 'Hermes' }), /belum tersedia/);
  s = applyCommand(s, { type: 'onboarding', step: 'connection', provider: 'manual' });
  assert.deepEqual([s.divisions, s.agents, s.tasks, s.decisions], [[], [], [], []]);
  assert.equal(firstWorkSteps(s)[0].done, false);
  const legacy = applyCommand(initialState(), { type: 'division', name: 'Bisnis lama', manager: 'Pemilik', worker: 'Staf', role: 'Dokumen' });
  delete legacy.onboarding; const before = structuredClone(legacy);
  assert.throws(() => applyCommand(legacy, profile), /tidak tersedia/); assert.deepEqual(legacy, before); assert.deepEqual(firstWorkSteps(legacy), []);
  const added = applyCommand(s, { type: 'division', name: 'Layanan', manager: 'Dewi', worker: 'Anton', role: 'Jawaban pelanggan' });
  assert.equal(firstWorkSteps(added)[0].done, true);
  const done = { ...added, briefs: [{ status: 'approved' }], tasks: [{ results: [{ version: 1 }], status: 'done' }] };
  assert.ok(firstWorkSteps(done).every(v => v.done));
});

test('provider status stays scoped; Codex availability cannot enable a Claude task', () => {
  const legacy = { aiRuntime: { available: true, label: 'Codex', reason: '', executing: [] } };
  assert.equal(runtimeFor(legacy, 'Codex').available, true); assert.equal(runtimeFor(legacy, 'Claude'), undefined);
  const current = { aiRuntime: { ...legacy.aiRuntime, providers: { Codex: { available: false, reason: 'Codex offline' }, Claude: { available: true, reason: '' } } } };
  assert.equal(runtimeFor(current, 'Codex').available, false); assert.equal(runtimeFor(current, 'Claude').available, true);
  let state = applyCommand(initialState(), profile);
  state = applyCommand(state, { type: 'onboarding', step: 'team', template: 'empty' });
  state = applyCommand(state, { type: 'onboarding', step: 'connection', provider: 'Claude' });
  assert.equal(state.provider, 'Claude'); assert.ok(state.onboarding.completedAt); assert.deepEqual(state.decisions, []);
});

test('setup UI resumes saved steps, reports failed save, and opens office only after final API success', async () => {
  const source = readFileSync(new URL('../src/onboarding.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let state = initialState(), reject = true, attributes = new Map(), fields = new Map(Object.entries(profile).filter(([k]) => !['type', 'step'].includes(k)));
  const button = { disabled: false }, error = { textContent: '', focus() {} }, heading = { focus() {} };
  const form = { querySelector: () => null, querySelectorAll: selector => selector === 'button' ? [button] : [], reportValidity: () => true, getAttribute: k => attributes.get(k), setAttribute: (k, v) => attributes.set(k, v), removeAttribute: k => attributes.delete(k) };
  const root = { innerHTML: '', querySelector: selector => selector === 'form' ? form : selector === '[role="alert"]' ? error : heading };
  class FixtureFormData extends Map { constructor() { super(fields); } }
  const exports = {};
  runInNewContext(code, { exports, require: name => name.includes('onboarding-model') ? { teamTemplates, templateLimits } : name.includes('runtime-status') ? { runnableProviders, runtimeFor } : {}, document: { querySelector: () => root }, FormData: FixtureFormData, fetch: async (url, options) => {
    if (!options) return { ok: true, json: async () => structuredClone(state) };
    if (reject) return { ok: false, status: 400, json: async () => ({ error: 'Fixture: tidak tersimpan' }) };
    const input = JSON.parse(options.body); assert.equal(input.revision, state.revision); state = applyCommand(state, input.command);
    return { ok: true, json: async () => structuredClone(state) };
  } });
  let opened = false; const pending = exports.setupWorkspace().then(() => opened = true); await new Promise(setImmediate);
  assert.match(root.innerHTML, /Kenalkan kantormu/);
  await form.onsubmit({ preventDefault() {} }); assert.equal(opened, false); assert.match(error.textContent, /tidak tersimpan/); assert.equal(state.revision, 0);
  reject = false; await form.onsubmit({ preventDefault() {} }); assert.match(root.innerHTML, /Mulai dengan tim yang pas/); assert.match(root.innerHTML, /Terapkan tim/);
  const resumed = exports.setupWorkspace(); await new Promise(setImmediate); assert.match(root.innerHTML, /Mulai dengan tim yang pas/); void resumed;
  fields = new Map([['name', team.name], ['manager', team.manager], ['worker-0', 'Bima'], ['role-0', 'Riset'], ['worker-1', 'Citra'], ['role-1', 'Naskah']]);
  await form.onsubmit({ preventDefault() {} }); assert.match(root.innerHTML, /Pilih cara menjalankan tugas/); assert.equal(opened, false);
  fields = new Map([['provider', 'manual']]); await form.onsubmit({ preventDefault() {} });
  // A reloaded UI resolves its own setup promise; the original page would be gone.
  assert.ok(state.onboarding.completedAt); await resumed;
  await exports.setupWorkspace(); assert.deepEqual(state.decisions, []); void pending;
});

test('authenticated HTTP setup survives restart, checks runtime, rejects stale/Builder mutations and keeps installs independent', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-onboarding-'));
  const fixture = path.join(directory, 'runtime.mjs');
  await writeFile(fixture, "globalThis[Symbol.for('kael.runtime.fixture')]={status:()=>({available:false,label:'Codex fixture',reason:'Belum login'}),turn:()=>{throw new Error('Onboarding must not run AI')}};");
  async function launch() {
    const child = spawn(process.execPath, ['--import', pathToFileURL(fixture).href, 'server/index.mjs'], { windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Startup timed out')); }, 15000);
      child.stdout.on('data', b => { const match = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
      child.on('error', reject); child.on('exit', code => { clearTimeout(timer); if (code) reject(new Error('Server exited ' + code)); });
    });
    const clearAuth = await authenticateTestServer(url, directory);
    return { url, stop: async () => { const ended = once(child, 'exit'); child.kill(); await ended; clearAuth(); } };
  }
  let server = await launch();
  const send = async (command, revision) => fetch(server.url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, command }) });
  try {
    assert.equal((await rawFetch(server.url + '/api/state')).status, 401);
    const key = (await readFile(path.join(directory, 'builder-access.key'), 'utf8')).trim();
    assert.equal((await rawFetch(server.url + '/api/command', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, command: profile }) })).status, 403);
    assert.equal((await send(profile, 0)).status, 200); await server.stop(); server = await launch();
    let state = await (await fetch(server.url + '/api/state')).json(); assert.equal(state.onboarding.step, 'team'); assert.equal(state.business.name, profile.name);
    assert.equal((await send(team, 0)).status, 409); assert.equal((await send(team, state.revision)).status, 200);
    state = await (await fetch(server.url + '/api/state')).json();
    assert.equal((await send({ type: 'onboarding', step: 'connection', provider: 'Codex' }, state.revision)).status, 400);
    assert.equal((await send({ type: 'onboarding', step: 'connection', provider: 'manual' }, state.revision)).status, 200);
    state = await (await fetch(server.url + '/api/state')).json(); assert.equal(state.revision, 3); assert.ok(state.onboarding.completedAt); assert.deepEqual(state.decisions, []); assert.deepEqual(state.tasks, []);
    assert.deepEqual(initialState().divisions, []); assert.notEqual(state.agents[0].id, initialState().agents[0]?.id);
  } finally { await server.stop(); }
});
