import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createN8nClient } from '../server/n8n.mjs';
import { initialState, applyCommand, isWorkflowDivision } from '../src/domain.ts';
import { workflowActivity, workflowManagerActivity, newWorkflowFailure } from '../src/n8n.ts';
import { divisionLayouts } from '../src/layout.ts';
import { agentActivity, characterLook } from '../src/visuals.ts';

const command = { type: 'workflow-agent', name: 'Marketing Outdor', company: 'Laxholm Furniture', agent: 'Bu Yuli', role: 'Katalog produk & AI Search', workflowId: 'wf1', workflowName: 'LAXHOLM Product Database & AI Search' };
const run = (id, status, extra = {}) => ({ id, workflowId: 'wf1', status, startedAt: '2026-01-01T10:00:00Z', stoppedAt: '2026-01-01T10:00:03Z', ...extra });
const snapshot = extra => ({ workflowId: 'wf1', connection: 'online', checkedAt: new Date().toISOString(), error: '', running: [], waiting: [], recent: [], partial: false, active: true, ...extra });
const delegate = managerId => ({ type: 'workflow-delegate', managerId, workflowId: 'wf1', agent: 'Date', role: 'Katalog produk & AI Search', managerRole: 'Manager · Koordinasi, triase error dan laporan Founder' });
function supervised() {
  const s = applyCommand(initialState(), command);
  return applyCommand(s, { type: 'workflow-manager', agentId: s.agents[0].id, role: 'Manager' });
}

test('delegation preserves workflow/history and manager identity, moves execution incidents, separates workstations', () => {
  let before = supervised(); const manager = before.agents[0];
  before.workflowBindings[0].monitorFrom = '2026-01-01T00:00:00Z';
  before = applyCommand(before, { type: 'agent-error', agentId: manager.id, reason: 'Node gagal', executionId: 'old' });
  before = applyCommand(before, { type: 'agent-recover', id: before.incidents[0].id, resolution: 'Diperiksa' });
  before = applyCommand(before, { type: 'agent-error', agentId: manager.id, reason: 'Node berikut gagal', executionId: 'bad' });
  before.incidents.push({ id: 'manual', agentId: manager.id, reason: 'Catatan pribadi', reportedAt: '', resolvedAt: '2026-01-01', resolution: 'Selesai', bedIndex: 0 });
  const after = applyCommand(before, delegate(manager.id)), worker = after.agents[1];
  assert.equal(worker.name, 'Date'); assert.equal(worker.manager, false); assert.equal(worker.divisionId, manager.divisionId);
  assert.deepEqual(after.agents[0], { ...before.agents[0], role: delegate(manager.id).managerRole });
  assert.deepEqual(after.divisions, before.divisions);
  assert.deepEqual(after.workflowBindings, [{ ...before.workflowBindings[0], agentId: worker.id }]);
  assert.deepEqual(after.incidents, before.incidents.map(i => i.executionId ? { ...i, agentId: worker.id } : i));
  for (const key of ['tasks', 'briefs', 'decisions']) assert.deepEqual(after[key], before[key]);
  assert.deepEqual(after.events.slice(1), before.events);
  assert.equal(isWorkflowDivision(after, manager.divisionId), true);
  assert.equal(agentActivity(after, manager).kind, 'blocked'); assert.equal(agentActivity(after, worker).kind, 'error');
  const oldRoom = divisionLayouts(before)[0], room = divisionLayouts(after)[0];
  for (const key of ['x', 'z', 'width', 'depth', 'furniture']) assert.deepEqual(room[key], oldRoom[key]);
  assert.equal(room.members[0].x, oldRoom.members[0].x); assert.equal(room.members[0].z, oldRoom.members[0].z);
  assert.ok(Math.abs(room.members[0].z - room.members[1].z) > 3);
  after.incidents.find(i => i.executionId === 'bad').resolvedAt = new Date().toISOString();
  assert.equal(newWorkflowFailure(after, snapshot({ recent: [run('bad', 'error')] })), null);
  assert.throws(() => applyCommand(after, delegate(manager.id)), /masih terhubung/);
  assert.throws(() => applyCommand(after, { type: 'division-edit', id: manager.divisionId, name: 'Marketing', manager: 'M', workers: [] }), /Divisi workflow/);
  assert.throws(() => applyCommand(after, { type: 'brief', divisionId: manager.divisionId, agentId: manager.id }), /tidak menerima tugas manual/);
});

test('delegation rejects invalid identities, missing roles, duplicate names and capacity atomically', () => {
  const before = supervised(), manager = before.agents[0], original = structuredClone(before), c = delegate(manager.id);
  for (const change of [{ managerId: 'missing' }, { workflowId: 'other' }, { agent: 'bu yuli' }, { agent: '' }, { role: '' }, { managerRole: '' }]) assert.throws(() => applyCommand(before, { ...c, ...change }));
  const worker = applyCommand(initialState(), command); assert.throws(() => applyCommand(worker, delegate(worker.agents[0].id)), /manager divisi/);
  let other = applyCommand(before, { type: 'division', name: 'Other', manager: 'Other manager', worker: 'Other worker', role: 'Other' });
  assert.throws(() => applyCommand(other, delegate(other.divisions[1].managerId)), /masih terhubung/);
  before.agents.push(...Array.from({ length: 11 }, (_, i) => ({ id: 'extra'+i, name: 'Extra'+i, role: 'Monitor', divisionId: manager.divisionId, manager: false })));
  const full = structuredClone(before); assert.throws(() => applyCommand(before, c), /12 anggota/); assert.deepEqual(before, full);
  before.agents.splice(1); assert.deepEqual(before, original);
});

test('supervisor uses only own division, reports unavailable data and child errors without hospitalizing manager', () => {
  const base = supervised(), manager = base.agents[0];
  assert.equal(workflowManagerActivity(base, manager.id), null);
  let s = applyCommand(base, delegate(manager.id)); const worker = s.agents[1];
  assert.equal(workflowManagerActivity(s, worker.id), null);
  assert.equal(agentActivity(s, manager).kind, 'offline');
  for (const change of [{ checkedAt: '' }, { checkedAt: '2020-01-01' }, { connection: 'disconnected' }, { partial: true, running: [run('r', 'running')] }, { recent: [run('u', 'unknown')] }]) {
    s.n8n = [snapshot(change)]; assert.equal(agentActivity(s, manager).kind, 'offline'); assert.equal(agentActivity(s, manager).typing, false);
  }
  s.n8n = [snapshot({ checkedAt: 'invalid' })]; assert.equal(workflowActivity(s, worker.id).kind, 'offline');
  s.n8n = [snapshot({ running: [run('r', 'running'), run('r2', 'running')] })];
  assert.match(agentActivity(s, manager).text, /Memantau 2 proses/); assert.equal(agentActivity(s, manager).typing, false); assert.equal(agentActivity(s, worker).typing, true);
  s.n8n = [snapshot({ waiting: [run('w', 'waiting')] })]; assert.equal(agentActivity(s, manager).kind, 'waiting');
  s.n8n = [snapshot({ active: false })]; assert.equal(agentActivity(s, manager).kind, 'paused');
  s.n8n = [snapshot()]; assert.equal(agentActivity(s, manager).kind, 'idle'); assert.equal(agentActivity(s, manager).canWalk, true);
  s = applyCommand(s, { ...command, name: 'Other', agent: 'Other', workflowId: 'wf2' });
  s = applyCommand(s, { type: 'agent-error', agentId: s.agents[2].id, reason: 'Other error', executionId: 'other' });
  assert.equal(agentActivity(s, manager).kind, 'idle');
  s = applyCommand(s, { type: 'agent-error', agentId: worker.id, reason: 'Date error', executionId: 'bad' });
  assert.equal(agentActivity(s, manager).kind, 'blocked'); assert.equal(s.incidents.some(i => i.agentId === manager.id), false);
  s = applyCommand(s, { type: 'agent-error', agentId: manager.id, reason: 'Manager sendiri error' }); assert.equal(agentActivity(s, manager).kind, 'error');
});

test('one external workflow creates exactly one agent and preserves existing office identities', () => {
  const old = applyCommand(initialState(), { type: 'division', name: 'Kaelach', manager: 'M', worker: 'W', role: 'Naskah' });
  const s = applyCommand(old, command), binding = s.workflowBindings[0];
  assert.deepEqual(s.agents.slice(0, 2), old.agents); assert.deepEqual(s.divisions[0], old.divisions[0]);
  assert.equal(s.agents.length, old.agents.length + 1); assert.equal(s.agents[2].name, 'Bu Yuli'); assert.equal(s.agents[2].manager, false);
  assert.equal(binding.agentId, s.agents[2].id); assert.equal(s.divisions[1].managerId, '');
  assert.equal(divisionLayouts(s)[1].members.length, 1);
  assert.throws(() => applyCommand(s, command), /sudah memiliki satu agent/);
  assert.throws(() => applyCommand(s, { ...command, workflowId: 'wf2' }), /Nama anggota/);
  assert.throws(() => applyCommand(s, { ...command, workflowId: '../secret', agent: 'B' }), /ID workflow/);
  assert.throws(() => applyCommand(s, { ...command, workflowId: 'wf2', agent: 'B', company: 'Other' }), /perusahaan lain/);
  assert.throws(() => applyCommand(s, { type: 'brief', divisionId: s.divisions[1].id, agentId: binding.agentId, title: 'Manual', goal: 'Manual', criteria: 'Manual', tasks: ['Manual'] }), /tidak menerima tugas manual/);
  assert.throws(() => applyCommand(s, { type: 'facility-start', roomId: 'lounge', participantIds: [binding.agentId], purpose: 'break' }), /workflow eksternal/);
});

test('workflow representative becomes the division manager without replacing identity, history or binding', () => {
  let before = applyCommand(initialState(), { type: 'division', name: 'Kaelach', manager: 'M', worker: 'W', role: 'Naskah' });
  before = applyCommand(before, command);
  const original = before.agents[2], division = before.divisions[1];
  before = applyCommand(before, { type: 'agent-error', agentId: original.id, reason: 'Node gagal', executionId: 'bad' });
  const promote = { type: 'workflow-manager', agentId: original.id, role: 'Manager Marketing Outdor · Katalog produk & AI Search' };
  const after = applyCommand(before, promote), manager = after.agents[2];
  assert.deepEqual(manager, { ...original, role: promote.role, manager: true });
  assert.equal(after.divisions[1].managerId, original.id); assert.equal(after.agents.length, before.agents.length);
  for (const key of ['workflowBindings', 'incidents', 'tasks', 'briefs', 'decisions']) assert.deepEqual(after[key], before[key]);
  assert.deepEqual(after.agents.slice(0, 2), before.agents.slice(0, 2)); assert.deepEqual(after.divisions[0], before.divisions[0]);
  assert.deepEqual(after.events.slice(1), before.events);
  const oldRoom = divisionLayouts(before)[1], newRoom = divisionLayouts(after)[1];
  for (const key of ['x', 'z', 'width', 'depth', 'furniture']) assert.deepEqual(newRoom[key], oldRoom[key]);
  assert.equal(newRoom.members[0].manager, true); assert.equal(newRoom.members[0].x, oldRoom.members[0].x); assert.equal(newRoom.members[0].z, oldRoom.members[0].z);
  assert.match(characterLook(division.name, manager).description, /Manager insignia/);
  assert.equal(agentActivity(after, manager).kind, 'error');
  after.incidents = []; after.n8n = [snapshot({ running: [run('next', 'running')] })];
  assert.equal(agentActivity(after, manager).typing, true); assert.deepEqual(agentActivity(after, manager), workflowActivity(after, manager.id));
  const unchanged = structuredClone(after);
  assert.throws(() => applyCommand(after, promote), /sudah memiliki manager/);
  assert.throws(() => applyCommand(after, { ...promote, agentId: after.agents[1].id }), /terhubung ke n8n/);
  assert.throws(() => applyCommand(before, { ...promote, role: '' }), /Peran manager/);
  assert.throws(() => applyCommand(after, { type: 'division-edit', id: division.id, name: division.name, manager: 'Other', workers: [] }), /Divisi workflow/);
  assert.throws(() => applyCommand(after, { type: 'brief', divisionId: division.id, agentId: manager.id, title: 'T', goal: 'G', criteria: 'C', tasks: ['T'] }), /tidak menerima tugas manual/);
  assert.throws(() => applyCommand(after, { type: 'facility-start', roomId: 'lounge', participantIds: [manager.id], purpose: 'break' }), /workflow eksternal/);
  assert.deepEqual(after, unchanged);
});

test('live activity handles concurrent runs, waiting, inactive and disconnected without simulated typing', () => {
  const s = applyCommand(initialState(), command), agent = s.agents[0];
  assert.equal(workflowActivity(s, agent.id).typing, false);
  s.n8n = [snapshot({ running: [run('1', 'running'), run('2', 'running')] })];
  assert.match(workflowActivity(s, agent.id).text, /2 proses/); assert.equal(workflowActivity(s, agent.id).typing, true);
  s.n8n[0] = snapshot({ waiting: [run('3', 'waiting')] }); assert.equal(workflowActivity(s, agent.id).kind, 'waiting');
  assert.equal(workflowActivity(s, agent.id).typing, false); assert.equal(workflowActivity(s, agent.id).canWalk, true);
  s.n8n[0] = snapshot({ waiting: [run('3', 'waiting')], partial: true }); assert.equal(workflowActivity(s, agent.id).canWalk, false);
  s.n8n[0] = snapshot({ active: false }); assert.equal(workflowActivity(s, agent.id).kind, 'paused');
  s.n8n[0] = snapshot({ running: [run('1', 'running')], checkedAt: '2020-01-01' }); assert.equal(workflowActivity(s, agent.id).kind, 'offline');
  s.n8n[0] = snapshot({ connection: 'disconnected', running: [run('1', 'running')] }); assert.equal(workflowActivity(s, agent.id).typing, false);
  s.n8n[0] = snapshot({ partial: true }); assert.equal(workflowActivity(s, agent.id).canWalk, false);
});

test('latest failed outcome enters medical on first connection; recovery prevents historical replay', () => {
  let s = applyCommand(initialState(), command);
  const old = snapshot({ recent: [run('old', 'error')] }); assert.equal(newWorkflowFailure(s, old).execution.id, 'old');
  const healthy = snapshot({ recent: [run('old', 'error'), run('ok', 'success', { stoppedAt: '2026-01-02T10:00:00Z' })] });
  assert.equal(newWorkflowFailure(s, healthy), null, 'a later success keeps historical failures out of medical');
  assert.equal(newWorkflowFailure(s, snapshot({ recent: [run('invalid', 'error', { startedAt: '', stoppedAt: '' })] })), null, 'missing execution timestamps cannot establish a failure date');
  s.workflowBindings[0].monitorFrom = '2026-01-01T00:00:00Z';
  const failed = snapshot({ recent: [run('bad', 'error')], running: [run('next', 'running')] });
  assert.equal(newWorkflowFailure(s, failed).execution.id, 'bad');
  s = applyCommand(s, { type: 'agent-error', agentId: s.agents[0].id, executionId: 'bad', reason: 'Node gagal' });
  assert.equal(s.incidents[0].bedIndex, 0); assert.equal(newWorkflowFailure(s, failed), null);
  s = applyCommand(s, { type: 'agent-recover', id: s.incidents[0].id, resolution: 'Sudah ditinjau' });
  assert.equal(newWorkflowFailure(s, failed), null); assert.equal(s.tasks.length, 0);
  assert.equal(newWorkflowFailure(s, old), null, 'recovery does not admit an older unrecorded failure');
  const manualRecovery = structuredClone(s); delete manualRecovery.incidents[0].executionId;
  assert.equal(newWorkflowFailure(manualRecovery, old), null, 'explicit recovery of a manually reported workflow error also blocks historical replay');
  assert.equal(newWorkflowFailure(s, snapshot({ recent: [run('new', 'crashed', { stoppedAt: new Date(Date.now() + 1000).toISOString() })] })).execution.id, 'new');
  assert.equal(newWorkflowFailure(s, snapshot({ connection: 'disconnected', recent: [run('other', 'error')] })), null);
});

test('n8n transport only GETs, paginates active runs, redacts diagnostics and discards execution payloads', async () => {
  const calls = [], secret = 'test-private-key';
  const client = createN8nClient({ N8N_BASE_URL: 'https://n8n.example.test/api/v1', N8N_API_KEY: secret }, async (url, options) => {
    calls.push({ url, options }); const parsed = new URL(url); let body;
    if (parsed.pathname.endsWith('/workflows/wf1')) body = { id: 'wf1', name: 'LAXHOLM', active: true, credentials: { value: secret } };
    else if (parsed.pathname.endsWith('/executions/bad')) body = { id: 'bad', workflowId: 'wf1', data: { resultData: { lastNodeExecuted: 'Save Sheet', error: { message: `Failed ${secret} Bearer other-token token=hidden buyer@example.com https://private.test/?key=secret` }, runData: { products: 'PRIVATE-PRODUCT-DATA' } } } };
    else if (parsed.searchParams.get('status') === 'running') body = parsed.searchParams.has('cursor') ? { data: [run('2', 'running')] } : { data: [run('1', 'running')], nextCursor: 'next-page' };
    else if (parsed.searchParams.get('status') === 'waiting') body = { data: [] };
    else body = { data: [run('bad', 'error')], nextCursor: 'older-history' };
    return Response.json(body);
  });
  const result = await client.snapshot({ workflowId: 'wf1' });
  assert.equal(result.running.length, 2); assert.equal(result.partial, false); assert.equal(result.historyPartial, true);
  assert.equal(result.recent[0].node, 'Save Sheet'); assert.match(result.recent[0].error, /RAHASIA/);
  for (const value of [secret, 'PRIVATE-PRODUCT-DATA', 'other-token', 'token=hidden', 'buyer@example.com', 'private.test']) assert.ok(!JSON.stringify(result).includes(value));
  assert.ok(calls.every(c => c.options.method === 'GET' && c.options.redirect === 'error' && c.options.headers['X-N8N-API-KEY'] === secret));
  assert.ok(calls.some(c => c.url.includes('cursor=next-page')));
  const before = calls.filter(c => c.url.includes('/executions/bad')).length; await client.snapshot({ workflowId: 'wf1' });
  assert.equal(calls.filter(c => c.url.includes('/executions/bad')).length, before);
});

test('invalid config, API failures and malformed records fail closed without leaking vendor responses', async () => {
  let fetched = false;
  await assert.rejects(() => createN8nClient({ N8N_BASE_URL: 'http://unsafe.test', N8N_API_KEY: 'secret' }, async () => { fetched = true; }).snapshot({ workflowId: 'wf1' }), /HTTPS/); assert.equal(fetched, false);
  const env = { N8N_BASE_URL: 'https://n8n.example.test', N8N_API_KEY: 'secret' };
  await assert.rejects(() => createN8nClient(env, async () => new Response('secret response body', { status: 401 })).snapshot({ workflowId: 'wf1' }), /Akses n8n ditolak/);
  await assert.rejects(() => createN8nClient(env, async url => Response.json(url.includes('/workflows/') ? { id: 'wf1', name: 'N', active: true } : { data: [run('bad', 'running', { workflowId: 'other' })] })).snapshot({ workflowId: 'wf1' }), /Format eksekusi/);
  await assert.rejects(() => createN8nClient(env, async () => { throw Error('secret network detail'); }).snapshot({ workflowId: 'wf1' }), /Tidak dapat menjangkau/);
});
