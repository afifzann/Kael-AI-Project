import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initialState, applyCommand, automationDay } from '../src/domain.ts';
import { createRuntime } from '../server/runtime.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { authenticateTestServer, rawFetch } from './helpers/auth-client.mjs';
import { officeRequest } from '../scripts/office.mjs';
import { workItems } from '../src/work.ts';
import { agentActivity } from '../src/visuals.ts';
import { workspaceNotifications } from '../src/notifications.ts';

function office(enabled = true, maxCalls = 8, two = false) {
  let s = applyCommand(initialState(), { type: 'division', name: 'Support', manager: 'Maya', workers: [{ name: 'Nara', role: 'Riset' }, ...(two ? [{ name: 'Raka', role: 'Naskah' }] : [])] });
  const divisionId = s.divisions[0].id;
  s = applyCommand(s, { type: 'sop-save', divisionId, baseVersion: 0, steps: 'Riset → draft → review → Founder', criteria: 'Fakta sintetis', limits: 'Tidak mengirim/publish' });
  for (const a of s.agents) s = applyCommand(s, { type: 'agent-settings', agentId: a.id, provider: a.manager ? 'Claude' : 'Codex', model: '', notes: '' });
  s = applyCommand(s, { type: 'division-automation', divisionId, enabled, maxCalls });
  return applyCommand(s, { type: 'manager-plan', divisionId, title: 'Jawaban sintetis', goal: 'Buat jawaban dari fakta', criteria: 'Ada sumber', tasks: s.agents.filter(a => !a.manager).map(a => ({ agentId: a.id, title: a.role })) });
}
async function fixture(t, initial = office(), turn) {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-auto-')); let state = initial;
  const calls = [], getState = () => state, mutate = async c => state = applyCommand(state, c);
  const options = { directory, getState, mutate, status: () => ({ available: true, label: 'Fixture', reason: '' }), turn: async input => {
    calls.push({ ...input, kind: input.prompt.includes('KAEL_MANAGER_REVIEW') ? 'review' : 'work', state: structuredClone(state) });
    return turn ? turn(input, calls) : input.prompt.includes('KAEL_MANAGER_REVIEW') ? { blocked: false, summary: 'Review sintetis', data: { accept: true, note: 'Sesuai fakta dan SOP sintetis.' } } : { blocked: false, summary: 'Hasil sintetis', data: { content: 'FAKTA-SERAH-TERIMA' } };
  } };
  let runtime = await createRuntime(options); t.after(() => runtime.close());
  return { getState, mutate, calls, get runtime() { return runtime; }, restart: async () => { runtime.close(); runtime = await createRuntime(options); }, approve: async () => mutate({ type: 'decide', id: state.decisions.find(d => d.status === 'pending').id, outcome: 'approved' }), config: async (enabled, maxCalls = 8) => mutate({ type: 'division-automation', divisionId: state.divisions[0].id, enabled, maxCalls }) };
}
async function settle(f) {
  for (let i = 0; i < 150; i++) { await f.runtime.wake(); if (!f.getState().runs?.some(r => ['queued', 'running'].includes(r.status))) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.fail('Fixture runtime tidak selesai.');
}

test('automation starts only after owner plan approval, reviews once, revises same task and waits for final owner approval', async t => {
  const f = await fixture(t); await settle(f); assert.equal(f.calls.length, 0);
  await f.approve(); await settle(f);
  let s = f.getState(), task = s.tasks[0]; assert.equal(task.status, 'approval'); assert.deepEqual(f.calls.map(c => c.kind), ['work', 'review']);
  assert.deepEqual(f.calls.map(c => c.provider), ['Codex', 'Claude']); assert.equal(s.decisions[0].status, 'pending');
  const first = structuredClone(task.results[0]);
  await f.mutate({ type: 'decide', id: s.decisions[0].id, outcome: 'revision', note: 'Tambahkan sumber kedua.' }); await settle(f);
  s = f.getState(); assert.equal(s.tasks[0].id, task.id); assert.equal(s.tasks[0].results.length, 2); assert.deepEqual(s.tasks[0].results[0], first);
  assert.match(f.calls[2].prompt, /Tambahkan sumber kedua/); assert.equal(s.decisions[0].version, 2); assert.equal(s.decisions[0].status, 'pending');
  await f.approve(); await settle(f); assert.equal(f.getState().tasks[0].status, 'done'); assert.equal(f.calls.length, 4);
});

test('enabling automation does not execute already approved work or rewrite its identities/results', async t => {
  const f = await fixture(t, office(false)); await f.approve(); const before = structuredClone(f.getState().tasks);
  await f.config(true); await settle(f); assert.equal(f.calls.length, 0); assert.deepEqual(f.getState().tasks, before);
});

test('manager rejection gets at most two automatic revisions then asks Founder for guidance', async t => {
  const f = await fixture(t, office(), async input => input.prompt.includes('KAEL_MANAGER_REVIEW') ? { blocked: false, data: { accept: false, note: 'Sumber belum memadai.' } } : { blocked: false, data: { content: 'Draft sintetis' } });
  await f.approve(); await settle(f); const s = f.getState();
  assert.equal(f.calls.length, 6); assert.equal(s.tasks[0].results.length, 3); assert.equal(s.tasks[0].revisions, 2); assert.equal(s.decisions[0].type, 'guidance'); assert.equal(s.decisions[0].status, 'pending');
  await settle(f); assert.equal(f.calls.length, 6);
});

test('daily budget reserves work and review atomically and editing the limit cannot reset usage', async t => {
  const f = await fixture(t, office(true, 2)); await f.approve(); await settle(f);
  await f.mutate({ type: 'decide', id: f.getState().decisions[0].id, outcome: 'revision', note: 'Perbaiki sumber.' }); await settle(f);
  assert.equal(f.calls.length, 2); assert.equal(f.getState().automations[0].usedCalls, 2); assert.equal(f.getState().tasks[0].automationReady, true);
  await f.config(true, 4); assert.equal(f.getState().automations[0].usedCalls, 2); await settle(f); assert.equal(f.calls.length, 4);
  assert.equal(automationDay(Date.UTC(2026, 9, 14, 18)), '2026-10-15');
});

test('failed work does not retry automatically even after restart', async t => {
  const f = await fixture(t, office(), async () => { throw Error('Fixture unavailable'); }); await f.approve(); await settle(f);
  assert.equal(f.calls.length, 1); assert.equal(f.getState().tasks[0].results.length, 0); assert.equal(f.getState().tasks[0].status, 'paused');
  await f.restart(); await settle(f); assert.equal(f.calls.length, 1);
});

test('malformed review never approves, remains resumable by explicit owner retry and preserves the result', async t => {
  let reviews = 0;
  const f = await fixture(t, office(), async input => input.prompt.includes('KAEL_MANAGER_REVIEW') ? ++reviews === 1 ? { blocked: false, data: { accept: 'yes', note: 'Invalid' } } : { blocked: false, data: { accept: true, note: 'Pemeriksaan ulang valid.' } } : { blocked: false, data: { content: 'Hasil tetap tersimpan.' } });
  await f.approve(); await settle(f); assert.equal(f.getState().tasks[0].status, 'review'); assert.equal(f.getState().runs.at(-1).status, 'failed');
  await f.restart(); await settle(f); assert.equal(f.calls.length, 2);
  await f.runtime.review(f.getState().tasks[0].id); await settle(f); assert.equal(f.getState().tasks[0].status, 'approval'); assert.equal(f.getState().tasks[0].results.length, 1);
});

test('started calls become interrupted checkpoints on restart, while a reserved queued call runs once', async t => {
  let s = office(); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
  s = applyCommand(s, { type: 'run-start', taskId: s.tasks[0].id, automatic: true }); s = applyCommand(s, { type: 'run-begin', id: s.runs[0].id });
  const f = await fixture(t, s); await settle(f); assert.equal(f.calls.length, 0); assert.equal(f.getState().runs[0].status, 'interrupted');
  s = office(); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' }); s = applyCommand(s, { type: 'run-start', taskId: s.tasks[0].id, automatic: true });
  const queued = await fixture(t, s); await settle(queued); assert.equal(queued.calls.filter(c => c.kind === 'work').length, 1); assert.equal(queued.getState().automations[0].usedCalls, 2);
});

test('interrupted manager review is not repeated and a reserved queued review resumes once without approving', async t => {
  let s = office(); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
  s = applyCommand(s, { type: 'start', id: s.tasks[0].id }); s = applyCommand(s, { type: 'result', id: s.tasks[0].id, content: 'Hasil awal' });
  s = applyCommand(s, { type: 'review-start', taskId: s.tasks[0].id, automatic: true });
  const queued = await fixture(t, s); await settle(queued); assert.equal(queued.calls.length, 1); assert.equal(queued.calls[0].kind, 'review'); assert.equal(queued.getState().tasks[0].status, 'approval'); assert.equal(queued.getState().decisions[0].status, 'pending');
  s = applyCommand(s, { type: 'run-begin', id: s.runs[0].id });
  assert.match(agentActivity(s, s.agents[0]).text, /Memeriksa hasil/); assert.equal(workItems(s)[0].stage, 'Review manager');
  const interrupted = await fixture(t, s); await settle(interrupted); assert.equal(interrupted.calls.length, 0); assert.equal(interrupted.getState().tasks[0].status, 'review'); assert.equal(interrupted.getState().runs[0].status, 'interrupted');
});

test('pausing automation aborts its running call and does not spend more quota after re-enabling', async t => {
  const f = await fixture(t, office(), input => new Promise((resolve, reject) => input.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })));
  await f.approve(); const pending = f.runtime.wake();
  for (let i = 0; i < 100 && !f.calls.length; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(f.calls.length, 1); await f.config(false); await f.runtime.wake(); await pending;
  assert.equal(f.getState().runs[0].status, 'cancelled'); await f.config(true); await settle(f); assert.equal(f.calls.length, 1);
});

test('tasks run in brief order and pass approved prior output to the next worker', async t => {
  const f = await fixture(t, office(true, 8, true)); await f.approve(); await settle(f);
  assert.equal(f.calls.length, 2); assert.equal(f.getState().tasks[1].results.length, 0);
  await f.approve(); await settle(f); assert.equal(f.calls.length, 4);
  assert.match(f.calls[2].prompt, /Serah terima[\s\S]*FAKTA-SERAH-TERIMA/); assert.equal(f.calls[2].state.tasks[0].status, 'done');
});

test('automation requires SOP/providers and stops if a division changes to workflow monitoring', async t => {
  let s = applyCommand(initialState(), { type: 'division', name: 'Test', manager: 'Maya', worker: 'Nara', role: 'Riset' }); const id = s.divisions[0].id;
  const command = { type: 'division-automation', divisionId: id, enabled: true, maxCalls: 8 }, before = structuredClone(s);
  assert.throws(() => applyCommand(s, command), /SOP/); assert.deepEqual(s, before);
  s = applyCommand(s, { type: 'sop-save', divisionId: id, baseVersion: 0, steps: 'Riset', criteria: 'Fakta' }); assert.throws(() => applyCommand(s, command), /provider/);
  s = applyCommand(s, { type: 'workflow-agent', name: 'Marketing', company: 'Test', agent: 'Mails', role: 'Monitor', workflowId: 'mail', workflowName: 'Mail' });
  assert.throws(() => applyCommand(s, { ...command, divisionId: s.divisions.at(-1).id }), /tugas lokal/);
  s = office(); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
  s.workflowBindings = [{ agentId: s.agents[0].id, workflowId: 'monitor', workflowName: 'Monitor' }];
  const f = await fixture(t, s); await settle(f); assert.equal(f.calls.length, 0); await f.config(false); assert.equal(f.getState().automations[0].enabled, false);
});

test('a manager error during review preserves the result and refuses a late accepted response', async t => {
  let f;
  f = await fixture(t, office(), async input => {
    if (!input.prompt.includes('KAEL_MANAGER_REVIEW')) return { blocked: false, data: { content: 'Hasil tersimpan' } };
    await f.mutate({ type: 'agent-error', agentId: f.getState().agents[0].id, reason: 'Fixture manager error' });
    return { blocked: false, data: { accept: true, note: 'Respons sudah usang.' } };
  });
  await f.approve(); await settle(f); const s = f.getState();
  assert.equal(s.tasks[0].results[0].content, 'Hasil tersimpan'); assert.equal(s.tasks[0].status, 'review'); assert.equal(s.runs.at(-1).status, 'failed');
  assert.equal(s.decisions.filter(d => d.status === 'pending').length, 0); await settle(f); assert.equal(f.calls.length, 2);
});

test('HTTP automation is owner-only, spends persisted limits, reviews results and exposes approval notifications', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-auto-http-'));
  await writeFile(path.join(directory, 'state.json'), JSON.stringify(office()));
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let clearAuth;
  try {
    const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(Error('Startup timeout')); }, 10000); child.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); child.on('error', reject); child.on('exit', () => { clearTimeout(timer); reject(Error('Server exited')); }); });
    const get = async () => (await fetch(url + '/api/state')).json();
    const post = async (endpoint, input) => fetch(url + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const command = async value => { const response = await post('/api/command', { revision: (await get()).revision, command: value }); assert.equal(response.status, 200, JSON.stringify(await response.json())); };
    const wait = async predicate => { for (let i = 0; i < 200; i++) { const s = await get(); if (predicate(s)) return s; await new Promise(resolve => setTimeout(resolve, 20)); } assert.fail('Automation HTTP timeout'); };
    assert.equal((await rawFetch(url + '/api/runtime/review', { method: 'POST' })).status, 401);
    clearAuth = await authenticateTestServer(url, directory); const options = { directory, port: new URL(url).port };
    const manager = await officeRequest({ action: 'open', role: 'Maya', client: 'Claude', nativeId: 'automation-manager' }, options);
    let s = await get(), taskId = s.tasks[0].id, divisionId = s.divisions[0].id;
    await assert.rejects(officeRequest({ action: 'command', sessionId: manager.sessionId, revision: s.revision, command: { type: 'division-automation', divisionId, enabled: true, maxCalls: 100 } }, options), /Founder/);
    const key = (await readFile(path.join(directory, 'builder-access.key'), 'utf8')).trim();
    assert.equal((await rawFetch(url + '/api/runtime/review', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, revision: s.revision }) })).status, 403);
    assert.equal((await post('/api/command', { revision: s.revision, command: { type: 'review-start', taskId } })).status, 400);
    await command({ type: 'division-automation', divisionId, enabled: true, maxCalls: 2 });
    await command({ type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
    s = await wait(s => s.tasks[0].status === 'approval'); assert.equal(s.runs.length, 2); assert.equal(s.automations[0].usedCalls, 2);
    assert.ok(workspaceNotifications(s).some(n => n.action === 'decision' && n.targetId === s.decisions[0].id));
    await command({ type: 'decide', id: s.decisions[0].id, outcome: 'revision', note: 'Tambahkan sumber.' });
    s = await get(); assert.equal(s.tasks[0].status, 'paused'); assert.equal(s.runs.length, 2);
    await assert.rejects(officeRequest({ action: 'run', sessionId: manager.sessionId, revision: s.revision, taskId }, options), /dikelola otomasi/);
    await command({ type: 'division-automation', divisionId, enabled: true, maxCalls: 4 });
    s = await wait(s => s.tasks[0].status === 'approval' && s.tasks[0].results.length === 2);
    assert.equal(s.automations[0].usedCalls, 4); assert.equal(s.decisions[0].status, 'pending');
    const context = await officeRequest({ action: 'context', sessionId: manager.sessionId }, options); assert.equal(context.automation.usedCalls, 4); assert.ok(context.runs.some(r => r.kind === 'review'));
    await command({ type: 'division-automation', divisionId, enabled: false, maxCalls: 4 });
    const persisted = JSON.parse(await readFile(path.join(directory, 'state.json'), 'utf8')); assert.equal(persisted.automations[0].enabled, false); assert.equal(persisted.runs.length, 4); assert.equal(persisted.tasks[0].id, taskId);
    await command({ type: 'decide', id: s.decisions[0].id, outcome: 'revision', note: 'Lanjutkan secara manual.' });
    s = await get(); assert.equal((await post('/api/runtime/start', { taskId, revision: s.revision })).status, 200);
    s = await wait(s => s.tasks[0].status === 'review' && s.tasks[0].results.length === 3);
    assert.equal((await post('/api/runtime/review', { taskId, revision: s.revision })).status, 200);
    s = await wait(s => s.tasks[0].status === 'approval'); assert.equal(s.runs.length, 6); assert.equal(s.automations[0].usedCalls, 4); assert.equal(s.decisions[0].status, 'pending');
  } finally { if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } clearAuth?.(); }
});
