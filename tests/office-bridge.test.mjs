import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { initialState, applyCommand } from '../src/domain.ts';
import { officeRoleCommand } from '../src/office-role.ts';
import { agentActivity } from '../src/visuals.ts';
import { createOfficeBridge } from '../server/office-bridge.mjs';
import { createBuilderDialogue } from '../server/builder-dialogue.mjs';
import { claudeOfficeHook } from '../scripts/claude-office-hook.mjs';
import { office, officeRequest } from '../scripts/office.mjs';
import { authenticateTestServer, rawFetch } from './helpers/auth-client.mjs';

function teams() {
  let s = applyCommand(initialState(), { type: 'division', name: 'Support', manager: 'Maya', workers: [{ name: 'Nara', role: 'Jawaban' }, { name: 'Raka', role: 'Riset' }] });
  return applyCommand(s, { type: 'division', name: 'Operasional', manager: 'Dina', worker: 'Sari', role: 'Rekap' });
}
const plan = s => ({ type: 'manager-plan', divisionId: s.divisions[0].id, title: 'FAQ', goal: 'Jawaban sesuai katalog', criteria: 'Sumber disebut', tasks: s.agents.filter(a => !a.manager && a.divisionId === s.divisions[0].id).map(a => ({ agentId: a.id, title: 'Tugas ' + a.name })) });
const proposal = { name: 'Tim baru', manager: 'Ayu', workers: [{ id: '', name: 'Arga', role: 'Riset' }], steps: 'Brief → hasil → review → Founder', criteria: 'Sesuai sumber', limits: 'Tidak kirim atau menyetujui otomatis', provider: 'manual', model: '' };
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-office-role-')); let state = teams();
  const getState = () => state, mutate = async c => state = applyCommand(state, c);
  const dialogue = await createBuilderDialogue({ directory, getState, mutate, status: () => ({ available: false }), turn: async () => { throw Error('No AI in tests'); } });
  const runs = [], runtime = { start: async id => { runs.push(id); } };
  const bridge = await createOfficeBridge({ directory, getState, mutate, runtime, dialogue });
  return { directory, bridge, dialogue, getState, mutate, runs, runtime };
}
const open = (f, name, nativeId = name, client = 'Claude') => f.bridge.action({ action: 'open', role: name, nativeId, client });
const command = (f, sessionId, c) => f.bridge.action({ action: 'command', sessionId, revision: f.getState().revision, command: c });

test('manager plan assigns multiple workers atomically, waits for owner approval, and worker/result/manager review do not auto-approve', () => {
  const original = teams(), manager = original.agents[0];
  let s = applyCommand(original, { type: 'office-command', actorId: manager.id, baseRevision: original.revision, command: plan(original) });
  assert.equal(s.revision, original.revision + 1); assert.equal(s.briefs.length, 1); assert.equal(s.decisions.length, 1); assert.equal(s.briefs[0].status, 'approval');
  assert.deepEqual(s.tasks.map(t => t.agentId), plan(original).tasks.map(t => t.agentId));
  const task = s.tasks[0]; assert.throws(() => applyCommand(s, { type: 'office-command', actorId: task.agentId, baseRevision: s.revision, command: { type: 'start', id: task.id } }), /disetujui/);
  s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
  for (const c of [{ type: 'start', id: task.id }, { type: 'result', id: task.id, content: 'Hasil dengan sumber katalog' }]) s = applyCommand(s, { type: 'office-command', actorId: task.agentId, baseRevision: s.revision, command: c });
  assert.equal(s.tasks[0].status, 'review');
  s = applyCommand(s, { type: 'office-command', actorId: manager.id, baseRevision: s.revision, command: { type: 'review', id: task.id, version: 1, accept: true, note: 'Sumber cocok' } });
  assert.equal(s.tasks[0].status, 'approval'); assert.equal(s.decisions.find(d => d.type === 'result').status, 'pending'); assert.equal(s.tasks[0].results.length, 1);
  assert.throws(() => officeRoleCommand(s, manager.id, { type: 'decide', id: s.decisions.find(d => d.type === 'result').id, outcome: 'approved' }), /Founder/);
});

test('role commands reject other divisions, identity changes, unsupported mutations and stale state without changing data', () => {
  let s = teams(); s = applyCommand(s, { type: 'office-command', actorId: s.agents[0].id, baseRevision: s.revision, command: plan(s) }); const before = structuredClone(s);
  const task = s.tasks[0], other = s.agents.find(a => a.name === 'Sari'), worker = s.agents.find(a => a.name === 'Nara');
  for (const c of [{ type: 'result', id: task.id, content: 'wrong' }, { type: 'hold', id: task.id, status: 'paused', reason: 'wrong' }, { type: 'manager-plan', ...plan(s) }]) assert.throws(() => officeRoleCommand(s, other.id, c));
  assert.throws(() => officeRoleCommand(s, worker.id, { type: 'review', id: task.id, accept: true }), /manager/);
  for (const type of ['business', 'division', 'agent-settings', 'agent-archive', 'cancel-task', 'decide', 'office-command']) assert.throws(() => officeRoleCommand(s, s.agents[0].id, { type }), /Founder/);
  assert.throws(() => applyCommand(s, { type: 'office-command', actorId: worker.id, baseRevision: 0, command: { type: 'start', id: task.id } }), /Kantor berubah/);
  assert.deepEqual(s, before);
});

test('role binding and shared memory survive restart, stay per agent and reject concurrent memory overwrite across clients', async () => {
  const f = await fixture(); const maya = await open(f, 'Maya'), dina = await open(f, 'Dina');
  const saved = await f.bridge.action({ action: 'memory', sessionId: maya.sessionId, version: 0, text: 'Maya: katalog versi terbaru' }); assert.equal(saved.memory.version, 1);
  const second = await open(f, 'Maya', 'other-client', 'Codex'); assert.equal(second.memory.text, 'Maya: katalog versi terbaru');
  assert.equal((await f.bridge.action({ action: 'context', sessionId: dina.sessionId })).memory.text, '');
  await assert.rejects(f.bridge.action({ action: 'memory', sessionId: second.sessionId, version: 0, text: 'stale' }), /Memori peran berubah/);
  const restarted = await createOfficeBridge({ directory: f.directory, getState: f.getState, mutate: f.mutate, runtime: f.runtime, dialogue: f.dialogue });
  assert.equal((await restarted.action({ action: 'hook', nativeId: 'Maya', client: 'Claude', event: 'start' })).role.name, 'Maya');
  await restarted.action({ action: 'leave', sessionId: maya.sessionId }); assert.deepEqual(await restarted.action({ action: 'hook', nativeId: 'Maya', client: 'Claude', event: 'prompt' }), { bound: false });
  await f.mutate({ type: 'division', name: 'Teknis', manager: 'Tara', worker: 'Builder', role: 'Teknis' });
  assert.equal((await open(f, 'builder', 'reserved-builder')).role.id, 'builder');
  f.dialogue.close();
});

test('Builder native proposal reaches existing preview without modifying teams, then observes owner application', async () => {
  const f = await fixture(), builder = await open(f, 'Builder'); const revision = f.getState().revision;
  const input = { action: 'propose', sessionId: builder.sessionId, revision, targetId: '', proposal, requestId: 'same' };
  const response = await f.bridge.action(input); await f.bridge.action(input);
  assert.equal(f.getState().revision, revision); assert.equal(f.dialogue.list().length, 1); assert.equal(f.dialogue.list()[0].sourceDesktop, true);
  await f.bridge.action({ ...input, requestId: 'different', proposal: { ...proposal, name: 'Tim lainnya' } });
  assert.equal((await f.bridge.action(input)).proposalId, response.proposalId);
  const d = f.dialogue.list().find(d => d.id === response.proposalId); await f.dialogue.action({ action: 'apply', id: d.id, version: d.version });
  assert.equal((await f.bridge.action({ action: 'context', sessionId: builder.sessionId })).proposals.find(p => p.id === d.id).status, 'applied');
  assert.equal(f.getState().divisions.length, 3); assert.equal(f.getState().decisions.length, 0);
  const maya = await open(f, 'Maya'); await assert.rejects(f.bridge.action({ ...input, revision: f.getState().revision, sessionId: maya.sessionId }), /Hanya Builder/);
  assert.ok(response.proposalId); f.dialogue.close();
});

test('native Builder proposal limit preserves the restartable archive and duplicate retry at the limit', async () => {
  const f = await fixture(), builder = await open(f, 'builder');
  const input = { action: 'propose', sessionId: builder.sessionId, revision: f.getState().revision, targetId: '', proposal };
  for (let i = 0; i < 100; i++) await f.bridge.action({ ...input, requestId: 'draft-' + i });
  assert.equal(f.dialogue.list().length, 100);
  await f.bridge.action({ ...input, requestId: 'draft-99' });
  await assert.rejects(f.bridge.action({ ...input, requestId: 'overflow' }), /100 diskusi/);
  f.dialogue.close();
  const restored = await createBuilderDialogue({ directory: f.directory, getState: f.getState, mutate: f.mutate, status: () => ({ available: false }) });
  assert.equal(restored.list().length, 100); restored.close();
});

test('manager context reads its own work, notes, workflow errors and approval, excluding another division results', async () => {
  const f = await fixture(), s = f.getState(), maya = await open(f, 'Maya'), dina = await open(f, 'Dina');
  await command(f, maya.sessionId, plan(s));
  await command(f, maya.sessionId, { type: 'division-note', divisionId: s.divisions[0].id, text: 'Ringkasan diskusi dari Maya' });
  await f.mutate({ type: 'brief', divisionId: s.divisions[1].id, agentId: s.agents.find(a => a.name === 'Sari').id, title: 'PRIVATE-OTHER-DIVISION', goal: 'Tujuan privat', criteria: 'Kriteria', tasks: ['PRIVATE-OTHER-TASK'] });
  const a = await f.bridge.action({ action: 'context', sessionId: maya.sessionId }), b = await f.bridge.action({ action: 'context', sessionId: dina.sessionId });
  assert.doesNotMatch(JSON.stringify(a), /PRIVATE-OTHER/); assert.equal(a.decisions.length, 1); assert.equal(b.decisions.length, 0); assert.equal(b.notes.length, 0);
  assert.match(a.notes[0].text, /Maya · sesi kantor/); f.dialogue.close();
});

test('native hook binds the actual Claude session, restores context each prompt, releases role and never reads transcript', async () => {
  const f = await fixture(), cwd = fileURLToPath(new URL('../', import.meta.url)), nativeId = 'native-session-fixture';
  const request = value => f.bridge.action(value);
  const input = { cwd, session_id: nativeId, hook_event_name: 'UserPromptSubmit', prompt: 'jadi Maya', get transcript_path() { throw Error('Must not read transcript'); } };
  let response = await claudeOfficeHook(input, request); assert.match(response.hookSpecificOutput.additionalContext, /"name":"Maya"/);
  assert.equal(f.bridge.presence()[0].phase, 'working');
  response = await claudeOfficeHook({ cwd, session_id: nativeId, hook_event_name: 'UserPromptSubmit', prompt: 'laporan' }, request); assert.match(response.hookSpecificOutput.additionalContext, /"name":"Maya"/);
  await claudeOfficeHook({ cwd, session_id: nativeId, hook_event_name: 'Stop' }, request); assert.equal(f.bridge.presence()[0].phase, 'idle');
  await claudeOfficeHook({ cwd, session_id: nativeId, hook_event_name: 'UserPromptSubmit', prompt: 'udahan' }, request); assert.equal(f.bridge.presence().length, 0);
  assert.equal(await claudeOfficeHook({ cwd: path.parse(cwd).root, session_id: nativeId, hook_event_name: 'UserPromptSubmit', prompt: 'jadi Maya' }, request), null);
  const failed = await claudeOfficeHook({ cwd, session_id: nativeId, hook_event_name: 'UserPromptSubmit', prompt: 'jadi Maya' }, async () => { throw Error('private error'); });
  assert.equal(failed.decision, 'block'); assert.doesNotMatch(JSON.stringify(failed), /private error/); f.dialogue.close();
});

test('manager must read full matching result before review, and native context exposes only its workflow incident', async () => {
  const f = await fixture(), maya = await open(f, 'Maya'), nara = await open(f, 'Nara');
  await command(f, maya.sessionId, plan(f.getState()));
  await f.mutate({ type: 'decide', id: f.getState().decisions[0].id, outcome: 'approved' });
  const task = f.getState().tasks.find(t => t.agentId === nara.role.id);
  await command(f, nara.sessionId, { type: 'start', id: task.id });
  await command(f, nara.sessionId, { type: 'result', id: task.id, content: 'Konten penuh '.repeat(300) });
  const review = { type: 'review', id: task.id, version: 1, accept: true, note: 'Sudah diperiksa lengkap' };
  await assert.rejects(command(f, maya.sessionId, review), /hasil penuh/);
  const full = await f.bridge.action({ action: 'task', sessionId: maya.sessionId, taskId: task.id, version: 1 }); assert.ok(full.task.results[0].content.length > 2000);
  await command(f, maya.sessionId, review); assert.equal(f.getState().tasks.find(t => t.id === task.id).status, 'approval');
  const s = f.getState(), otherId = s.agents.find(a => a.name === 'Sari').id;
  s.workflowBindings = [{ agentId: nara.role.id, workflowId: 'own' }, { agentId: otherId, workflowId: 'other' }];
  s.n8n = [{ workflowId: 'own', connection: 'online', recent: [{ status: 'error', error: 'Node ekstraksi gagal' }] }, { workflowId: 'other', connection: 'online', error: 'PRIVATE-OTHER-WORKFLOW' }];
  s.incidents = [{ agentId: nara.role.id, resolvedAt: '', reason: 'Error ekstraksi' }, { agentId: otherId, resolvedAt: '', reason: 'PRIVATE-OTHER-INCIDENT' }];
  const context = await f.bridge.action({ action: 'context', sessionId: maya.sessionId }); assert.match(JSON.stringify(context), /Node ekstraksi gagal/); assert.doesNotMatch(JSON.stringify(context), /PRIVATE-OTHER/);
  f.dialogue.close();
});

test('native presence makes the right robot work only while fresh and medical incidents stay higher priority', () => {
  const s = teams(), agent = s.agents[0]; s.officeSessions = [{ sessionId: 's', agentId: agent.id, client: 'Claude', phase: 'working', model: '', updatedAt: new Date().toISOString() }];
  assert.equal(agentActivity(s, agent).typing, true); assert.match(agentActivity(s, agent).text, /Claude/); assert.equal(agentActivity(s, s.agents[1]).typing, false);
  s.officeSessions[0].updatedAt = new Date(Date.now() - 121000).toISOString(); assert.equal(agentActivity(s, agent).typing, false);
  s.officeSessions[0].updatedAt = new Date().toISOString(); s.incidents = [{ agentId: agent.id, resolvedAt: '' }]; assert.equal(agentActivity(s, agent).kind, 'error');
});

test('office HTTP and actual hook CLI protect owner approval, connect native role, persist plan and reject generic bypass', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-office-http-'));
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let clearAuth;
  try {
    const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(Error('Startup timeout')); }, 10000); child.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); child.on('error', reject); child.on('exit', () => { clearTimeout(timer); reject(Error('Server exited')); }); });
    const port = new URL(url).port, options = { directory, port };
    assert.equal((await rawFetch(url + '/api/office-bridge', { method: 'POST' })).status, 401);
    clearAuth = await authenticateTestServer(url, directory);
    const post = async (endpoint, value) => fetch(url + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    let state = await (await fetch(url + '/api/state')).json();
    state = await (await post('/api/command', { revision: state.revision, command: { type: 'division', name: 'Support', manager: 'Maya', worker: 'Nara', role: 'Support' } })).json();
    const opened = await office(['open', 'Maya', 'Claude', 'http-native'], options); assert.equal(opened.role.name, 'Maya');
    const hook = spawn(process.execPath, ['scripts/claude-office-hook.mjs'], { windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: port }, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; hook.stdout.on('data', b => output += b.toString()); hook.stdin.end(JSON.stringify({ cwd: process.cwd(), session_id: 'http-native', hook_event_name: 'UserPromptSubmit', prompt: 'laporan' }));
    assert.equal((await once(hook, 'exit'))[0], 0); assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /"name":"Maya"/);
    const planned = await officeRequest({ action: 'command', sessionId: opened.sessionId, revision: state.revision, command: plan(state) }, options); assert.equal(planned.decisions.length, 1);
    await assert.rejects(officeRequest({ action: 'command', sessionId: opened.sessionId, revision: planned.revision, command: { type: 'decide', id: planned.decisions[0].id, outcome: 'approved' } }, options), /Founder/);
    const bypass = await post('/api/command', { revision: planned.revision, command: { type: 'manager-plan', ...plan(state) } }); assert.equal(bypass.status, 400);
    const firstBuilder = await officeRequest({ action: 'open', role: 'builder', client: 'Claude', nativeId: 'idle-builder' }, options);
    await officeRequest({ action: 'hook', role: 'builder', client: 'Claude', nativeId: 'active-builder', event: 'prompt' }, options);
    let builderStatus = await (await fetch(url + '/api/state')).json(); assert.equal(builderStatus.builderChat.status, 'working'); assert.equal(builderStatus.builderChat.source, 'Claude');
    await officeRequest({ action: 'hook', client: 'Claude', nativeId: 'active-builder', event: 'stop' }, options);
    builderStatus = await (await fetch(url + '/api/state')).json(); assert.equal(builderStatus.builderChat.status, 'completed'); assert.equal(agentActivity(builderStatus, { id: 'office-builder' }).canWalk, true); assert.ok(firstBuilder.bound);
    const publicState = await (await fetch(url + '/api/state')).json(); assert.equal(publicState.officeSessions[0].agentId, opened.role.id); assert.equal(publicState.officeSessions[0].nativeId, undefined); assert.equal(publicState.briefs[0].status, 'approval');
  } finally { if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } clearAuth?.(); }
});
