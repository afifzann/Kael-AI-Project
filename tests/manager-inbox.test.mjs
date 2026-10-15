import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initialState, applyCommand, automationDay } from '../src/domain.ts';
import { managerReadiness } from '../src/manager-inbox.ts';
import { createRuntime } from '../server/runtime.mjs';
import { divisionState } from '../src/workspace.ts';
import { workspaceNotifications } from '../src/notifications.ts';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { authenticateTestServer, rawFetch } from './helpers/auth-client.mjs';
import { officeRequest } from '../scripts/office.mjs';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function office(ready = true) {
  let s = applyCommand(initialState(), { type: 'division', name: 'Support', manager: 'Maya', workers: [{ name: 'Nara', role: 'Menyusun jawaban' }] });
  if (ready) s = applyCommand(s, { type: 'business', name: 'Kantor fixture', audience: 'Pelanggan fixture', facts: 'Produk sintetis. Jangan kirim balasan.' });
  s = applyCommand(s, { type: 'sop-save', divisionId: s.divisions[0].id, baseVersion: 0, steps: 'Baca fakta → buat draft → review', criteria: 'Sesuai sumber', limits: 'Jangan kirim atau publish' });
  for (const agent of s.agents) s = applyCommand(s, { type: 'agent-settings', agentId: agent.id, provider: agent.manager ? 'Claude' : 'Codex', model: '', notes: '' });
  return applyCommand(s, { type: 'manager-request', divisionId: s.divisions[0].id, title: 'Draft balasan', text: 'Siapkan balasan dari fakta bisnis.' });
}
async function fixture(t, state = office(), turn) {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-manager-inbox-')), calls = [];
  const getState = () => state, mutate = async command => state = applyCommand(state, command);
  const options = { directory, getState, mutate, status: () => ({ available: true, label: 'Fixture' }), turn: async input => {
    calls.push(input);
    if (turn) return turn(input, calls.length);
    return input.prompt.includes('KAEL_MANAGER_PLAN') ? { blocked: false, data: { title: 'Balasan fixture', goal: 'Siapkan draft', criteria: 'Sesuai fakta', tasks: [{ agentId: state.agents.find(a => !a.manager).id, title: 'Susun draft' }] } } : input.prompt.includes('KAEL_MANAGER_REVIEW') ? { blocked: false, data: { accept: true, note: 'Sesuai fakta fixture.' } } : { blocked: false, data: { content: 'Hasil fixture.' } };
  } };
  let runtime = await createRuntime(options); t.after(() => runtime.close());
  return { getState, mutate, calls, get runtime() { return runtime; }, restart: async () => { runtime.close(); runtime = await createRuntime(options); } };
}
async function settle(f) {
  for (let i = 0; i < 200; i++) { await f.runtime.wake(); if (!f.getState().managerRequests?.some(r => r.status === 'running') && !f.getState().runs?.some(r => ['queued', 'running'].includes(r.status))) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.fail('Antrean fixture tidak selesai.');
}

test('inbox creates an actual manager plan once and waits for owner before worker and review', async t => {
  let s = office(); s = applyCommand(s, { type: 'division-automation', divisionId: s.divisions[0].id, enabled: true, maxCalls: 8 });
  const f = await fixture(t, s); await settle(f); s = f.getState();
  assert.equal(s.managerRequests[0].status, 'planned'); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].provider, 'Claude');
  assert.equal(s.briefs[0].status, 'approval'); assert.equal(s.tasks[0].status, 'queued'); assert.equal(s.decisions[0].status, 'pending'); assert.equal(s.automations[0].usedCalls, 1);
  assert.match(f.calls[0].prompt, /Produk sintetis/); assert.match(f.calls[0].prompt, /Jangan kirim atau publish/);
  await settle(f); assert.equal(f.calls.length, 1);
  await f.mutate({ type: 'decide', id: s.decisions[0].id, outcome: 'approved' }); await settle(f); s = f.getState();
  assert.equal(s.tasks[0].status, 'approval'); assert.equal(f.calls.length, 3); assert.equal(s.automations[0].usedCalls, 3);
  assert.match(f.calls[1].prompt, /Siapkan balasan dari fakta bisnis/);
  assert.equal(s.managerRequests[0].briefId, s.briefs[0].id); assert.equal(s.decisions[0].status, 'pending');
});

test('empty inbox and incomplete business make no AI calls; readiness resumes without polling AI', async t => {
  const s = office(false), f = await fixture(t, s); await settle(f); assert.equal(f.calls.length, 0); assert.match(managerReadiness(s, s.divisions[0].id), /Lengkapi/);
  await f.mutate({ type: 'business', name: 'Kantor fixture', audience: 'Pelanggan', facts: 'Fakta lengkap' }); await settle(f); assert.equal(f.calls.length, 1);
  await f.restart(); await settle(f); assert.equal(f.calls.length, 1, 'restart cannot duplicate a plan');
});

test('blocked manager needs explicit owner answer and preserves request identity and messages', async t => {
  const f = await fixture(t, office(), async (input, count) => count === 1 ? { blocked: true, reason: 'Apa bahan produk?', data: {} } : { blocked: false, data: { title: 'Balasan', goal: 'Buat draft', criteria: 'Sesuai bahan', tasks: [{ agentId: f.getState().agents.find(a => !a.manager).id, title: 'Susun draft' }] } });
  await settle(f); const request = f.getState().managerRequests[0]; assert.equal(request.status, 'blocked'); await settle(f); assert.equal(f.calls.length, 1);
  await f.mutate({ type: 'manager-request-reply', id: request.id, text: 'Bahannya kayu.' }); await settle(f);
  assert.equal(f.getState().managerRequests[0].id, request.id); assert.equal(f.getState().managerRequests[0].status, 'planned'); assert.match(f.calls[1].prompt, /Bahannya kayu/);
  assert.equal(f.getState().managerRequests[0].messages.length, 3);
});

test('invalid foreign-worker plan fails atomically, never retries or creates partial tasks', async t => {
  const f = await fixture(t, office(), async () => ({ blocked: false, data: { title: 'Invalid', goal: 'Invalid', criteria: 'Invalid', tasks: [{ agentId: 'foreign-worker', title: 'Invalid' }] } }));
  await settle(f); assert.equal(f.getState().managerRequests[0].status, 'failed'); assert.equal(f.getState().tasks.length, 0); assert.equal(f.getState().briefs.length, 0);
  await f.restart(); await settle(f); assert.equal(f.calls.length, 1); assert.equal(f.getState().automations[0].usedCalls, 1);
});

test('shared daily budget stops manager planning and advances on the next WIB day', async t => {
  let s = office(); s.automations = [{ divisionId: s.divisions[0].id, enabled: false, maxCalls: 2, usedCalls: 2, usageDay: automationDay() }];
  const f = await fixture(t, s); await settle(f); assert.equal(f.calls.length, 0); assert.match(managerReadiness(s, s.divisions[0].id), /Batas/);
  s = structuredClone(f.getState()); s.automations[0].usageDay = '2000-01-01';
  const next = await fixture(t, s); await settle(next); assert.equal(next.calls.length, 1); assert.equal(next.getState().automations[0].usedCalls, 1);
});

test('inbox read models isolate divisions and notify only unresolved issues', () => {
  let s = office(); const first = s.divisions[0].id;
  s = applyCommand(s, { type: 'division', name: 'Other', manager: 'Other Manager', worker: 'Other Worker', role: 'Other role' });
  const request = s.managerRequests[0]; request.status = 'blocked'; request.reason = 'Bahan belum ada';
  assert.equal(divisionState(s, s.divisions[1].id).managerRequests.length, 0);
  const notice = workspaceNotifications(s).find(n => n.id === 'manager-' + request.id); assert.equal(notice.divisionId, first); assert.equal(notice.action, 'manager-request');
  request.status = 'cancelled'; assert.equal(workspaceNotifications(s).some(n => n.id === 'manager-' + request.id), false);
});

test('cancellation rejects a late successful plan without refund or retries', async t => {
  let finish;
  const f = await fixture(t, office(), async () => new Promise(resolve => { finish = resolve; }));
  for (let i = 0; i < 50 && !finish; i++) await new Promise(resolve => setTimeout(resolve, 5));
  const request = f.getState().managerRequests[0]; assert.equal(request.status, 'running');
  await f.mutate({ type: 'manager-request-cancel', id: request.id }); await f.runtime.wake();
  finish({ blocked: false, data: { title: 'Late', goal: 'Late', criteria: 'Late', tasks: [{ agentId: f.getState().agents.find(a => !a.manager).id, title: 'Late' }] } });
  await settle(f); assert.equal(f.getState().managerRequests[0].status, 'cancelled'); assert.equal(f.getState().briefs.length, 0); assert.equal(f.calls.length, 1); assert.equal(f.getState().automations[0].usedCalls, 1);
});

test('changed business, team or SOP invalidates a running plan and preserves owner data', async t => {
  let finish;
  const f = await fixture(t, office(), async () => new Promise(resolve => { finish = resolve; }));
  for (let i = 0; i < 50 && !finish; i++) await new Promise(resolve => setTimeout(resolve, 5));
  await f.mutate({ type: 'business', name: 'Updated fixture', audience: 'Pelanggan baru', facts: 'Fakta baru' });
  finish({ blocked: false, data: { title: 'Old basis', goal: 'Old', criteria: 'Old', tasks: [{ agentId: f.getState().agents.find(a => !a.manager).id, title: 'Old' }] } });
  await settle(f); assert.equal(f.getState().managerRequests[0].status, 'failed'); assert.equal(f.getState().briefs.length, 0); assert.equal(f.getState().business.facts, 'Fakta baru');
});

test('restart marks started planning interrupted without spending a second call', async t => {
  let s = office(); s = applyCommand(s, { type: 'manager-request-begin', id: s.managerRequests[0].id, runId: randomUUID() });
  const f = await fixture(t, s); await settle(f); assert.equal(f.getState().managerRequests[0].status, 'interrupted'); assert.equal(f.calls.length, 0); assert.equal(f.getState().automations[0].usedCalls, 1);
  await f.mutate({ type: 'manager-request-reply', id: s.managerRequests[0].id, text: 'Tinjau ulang dan lanjutkan.' }); await settle(f);
  assert.equal(f.getState().managerRequests[0].status, 'planned'); assert.equal(f.calls.length, 1); assert.equal(f.getState().automations[0].usedCalls, 2);
});

test('readiness checks local prerequisites and refuses special divisions without altering existing tasks', () => {
  const s = office(), divisionId = s.divisions[0].id;
  assert.equal(managerReadiness(s, divisionId), '');
  const offline = structuredClone(s); offline.aiRuntime = { providers: { Claude: { available: false } } }; assert.match(managerReadiness(offline, divisionId), /belum terhubung/);
  const noSop = structuredClone(s); noSop.sops = []; assert.match(managerReadiness(noSop, divisionId), /SOP/);
  const manual = structuredClone(s); manual.agentSettings[0].provider = 'manual'; assert.match(managerReadiness(manual, divisionId), /provider/);
  const incident = structuredClone(s); incident.incidents = [{ agentId: s.divisions[0].managerId, resolvedAt: '' }]; assert.match(managerReadiness(incident, divisionId), /error/);
  const workflow = structuredClone(s); workflow.workflowBindings = [{ agentId: s.agents[1].id, workflowId: 'fixture' }];
  assert.throws(() => applyCommand(workflow, { type: 'manager-request', divisionId, title: 'Forbidden', text: 'Forbidden' }), /khusus/);
  const production = structuredClone(s); production.divisions[0].name = 'Youtube KaelaCH'; assert.match(managerReadiness(production, divisionId), /khusus/);
});

test('HTTP inbox is owner-only, rejects forged internal outcomes and persists a scoped pending plan', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-manager-http-'));
  const seed = office(false); seed.managerRequests = [];
  await writeFile(path.join(directory, 'state.json'), JSON.stringify(seed));
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let clearAuth;
  try {
    const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(Error('Startup timeout')); }, 10000); child.stdout.on('data', b => { const match = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } }); child.on('error', reject); });
    const get = async () => (await fetch(url + '/api/state')).json();
    const post = body => fetch(url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await rawFetch(url + '/api/command', { method: 'POST' })).status, 401);
    clearAuth = await authenticateTestServer(url, directory);
    const key = (await readFile(path.join(directory, 'builder-access.key'), 'utf8')).trim();
    const command = { type: 'manager-request', divisionId: seed.divisions[0].id, title: 'Request fixture', text: 'Draft fixture' };
    let s = await get();
    assert.equal((await rawFetch(url + '/api/command', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: s.revision, command }) })).status, 403);
    for (const type of ['manager-request-begin', 'manager-request-end']) assert.equal((await post({ revision: s.revision, command: { type } })).status, 400);
    const options = { directory, port: new URL(url).port };
    const manager = await officeRequest({ action: 'open', role: 'Maya', client: 'Claude', nativeId: 'manager-http' }, options);
    await assert.rejects(officeRequest({ action: 'command', sessionId: manager.sessionId, revision: s.revision, command }, options), /Founder/);
    const replies = await Promise.all([post({ revision: s.revision, command }), post({ revision: s.revision, command })]);
    assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]);
    s = await get(); assert.equal(s.managerRequests.length, 1); assert.equal(s.managerRequests[0].status, 'queued');
    assert.equal((await post({ revision: s.revision, command: { type: 'business', name: 'Fixture', audience: 'Pelanggan', facts: 'Fakta fixture' } })).status, 200);
    for (let i = 0; i < 150; i++) { s = await get(); if (s.managerRequests[0].status === 'planned') break; await new Promise(resolve => setTimeout(resolve, 20)); }
    assert.equal(s.managerRequests[0].status, 'planned'); assert.equal(s.decisions[0].status, 'pending'); assert.equal(s.tasks[0].status, 'queued');
    const context = await officeRequest({ action: 'context', sessionId: manager.sessionId }, options); assert.equal(context.managerRequests[0].id, s.managerRequests[0].id); assert.equal(context.managerRequests[0].basis, undefined);
    const stored = JSON.parse(await readFile(path.join(directory, 'state.json'), 'utf8')); assert.equal(stored.managerRequests[0].briefId, stored.briefs[0].id); assert.equal(stored.automations[0].enabled, false);
  } finally { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } clearAuth?.(); }
});

function uiFunction(name, scope) {
  const source = ts.createSourceFile('operations.ts', readFileSync(new URL('../src/operations.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let fn;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) fn = node.getText(source); ts.forEachChild(node, visit); }
  visit(source); assert.ok(fn);
  return runInNewContext(ts.transpileModule(fn + '\n' + name, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}

test('inbox UI sends one scoped request only on submit and keeps the form on API failure', async () => {
  let form, closed = 0, fail = true; const commands = [];
  const open = uiFunction('newManagerRequest', { materialInput: '', readWorkFiles: async () => [], modal: (title, html, submit) => form = { title, html, submit }, field: () => '', save: () => '', command: async c => { if (fail) throw Error('Conflict'); commands.push(c); }, dialog: { close: () => closed++ }, notify() {} });
  open('division-fixture'); assert.equal(commands.length, 0); assert.match(form.html, /belum dijalankan/);
  const data = new FormData(); data.set('title', 'Kebutuhan fixture'); data.set('text', 'Bahan fixture');
  await assert.rejects(form.submit(data), /Conflict/); assert.equal(closed, 0);
  fail = false; await form.submit(data); assert.equal(closed, 1); assert.equal(commands[0].divisionId, 'division-fixture'); assert.equal(commands[0].text, 'Bahan fixture'); assert.equal(commands[0].type, 'manager-request');
});

test('inbox detail escapes messages, resumes explicitly and links a plan without approving it', async () => {
  const s = office(), request = s.managerRequests[0]; request.status = 'blocked'; request.reason = 'Apa bahannya?'; request.messages[0].text = '<script>untrusted()</script>';
  let form, closed = 0; const commands = [], opened = [];
  const scope = { state: s, materialInput: '', workMaterialPanel: () => '', readWorkFiles: async () => [], watchedRequest: '', modal: (title, html, submit, action) => form = { html, submit, action }, field: () => '', save: () => '', esc: x => String(x).replaceAll('<', '&lt;').replaceAll('>', '&gt;'), stamp: () => '', managerRequestStatus: (_s, r) => r.reason, command: async c => commands.push(c), dialog: { close: () => closed++ }, notify() {}, decisionDetail: id => opened.push(id), briefDetail() {} };
  const open = uiFunction('managerRequestDetail', scope); open(request.id);
  assert.doesNotMatch(form.html, /<script>/); assert.match(form.html, /&lt;script&gt;/); assert.equal(commands.length, 0);
  const data = new FormData(); data.set('text', 'Bahan kayu'); await form.submit(data); assert.equal(commands[0].type, 'manager-request-reply'); assert.equal(commands[0].id, request.id); assert.equal(closed, 1);
  request.status = 'planned'; request.briefId = 'brief-fixture'; s.decisions.push({ id: 'decision-fixture', type: 'plan', targetId: request.briefId, status: 'pending' }); open(request.id);
  assert.equal(form.submit, undefined); form.action('plan'); assert.deepEqual(opened, ['decision-fixture']); assert.equal(commands.length, 1, 'opening a plan must not decide it');
});
