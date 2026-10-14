import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyCommand } from '../src/domain.ts';
import { workItems, workList } from '../src/work.ts';
import { divisionState } from '../src/workspace.ts';
import { readRoute, routeHash } from '../src/routes.ts';

function setup() {
  let s = applyCommand(initialState(), { type: 'division', name: 'Riset Produk', manager: 'Rani', worker: 'Dimas', role: 'Riset material' });
  s = applyCommand(s, { type: 'brief', divisionId: s.divisions[0].id, agentId: s.agents[1].id, title: 'Riset kursi', goal: 'Bandingkan material', criteria: 'Sumber jelas', tasks: ['Bandingkan kayu'] });
  return s;
}
const current = s => workItems(s).find(w => w.source === 'manual');
function approvePlan(s) {
  s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id });
  return applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
}

test('general work reflects the full manual lifecycle without changing raw status or approval versions', () => {
  let s = setup(); const id = s.tasks[0].id;
  assert.equal(current(s).status, 'draft'); assert.equal(current(s).nativeStatus, 'queued');
  assert.match(current(s).nextStep, /ajukan rencana/);
  s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id });
  assert.equal(current(s).status, 'approval'); assert.equal(current(s).stage, 'Persetujuan rencana');
  assert.equal(current(s).decisionId, s.decisions[0].id);
  s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
  assert.equal(current(s).status, 'queued');
  s = applyCommand(s, { type: 'start', id });
  assert.equal(current(s).status, 'running'); assert.equal(current(s).connection.kind, 'local');
  s = applyCommand(s, { type: 'result', id, content: 'Hasil v1' });
  assert.equal(current(s).status, 'review'); assert.equal(current(s).versions, 1);
  s = applyCommand(s, { type: 'review', id, accept: true, note: 'Sesuai kriteria' });
  assert.equal(current(s).status, 'approval'); assert.equal(current(s).stage, 'Persetujuan hasil');
  const old = s.decisions.find(d => d.status === 'pending').id;
  s = applyCommand(s, { type: 'decide', id: old, outcome: 'revision', note: 'Tambahkan sumber' });
  assert.equal(current(s).status, 'revision'); assert.equal(current(s).nativeStatus, 'paused');
  s = applyCommand(s, { type: 'start', id });
  assert.equal(current(s).status, 'running');
  s = applyCommand(s, { type: 'result', id, content: 'Hasil v2' });
  s = applyCommand(s, { type: 'review', id, accept: true, note: 'Lengkap' });
  assert.throws(() => applyCommand(s, { type: 'decide', id: old, outcome: 'approved' }));
  s = applyCommand(s, { type: 'decide', id: s.decisions.find(d => d.status === 'pending').id, outcome: 'approved' });
  assert.equal(current(s).status, 'done'); assert.equal(current(s).versions, 2);
  const before = structuredClone(s); workList(s); assert.deepEqual(s, before);
});

test('one production stays one work item and archived task provenance prevents manual resurrection', () => {
  const s = setup(), task = s.tasks[0], divisionId = s.divisions[0].id;
  s.productions = [{ id: 'episode', taskId: task.id, divisionId, title: 'Produksi riset', status: 'review', activeAgentId: 'active-agent', versions: [{ version: 1 }], stage: 'QC selesai', error: '', notes: '', updatedAt: '2026-10-14T10:00:00Z' }];
  assert.equal(workItems(s).length, 1);
  const item = workItems(s)[0];
  assert.equal(item.source, 'production'); assert.equal(item.status, 'approval'); assert.equal(item.nativeStatus, 'review');
  assert.equal(item.agentId, 'active-agent'); assert.equal(item.managerId, s.divisions[0].managerId);
  assert.equal(item.connection.kind, 'runtime'); assert.match(item.nextStep, /preview/);
  s.productions[0].status = 'blocked'; s.productions[0].error = 'Bahan belum lengkap';
  assert.equal(workItems(s)[0].status, 'failed'); assert.equal(workItems(s)[0].reason, 'Bahan belum lengkap');
  s.productions = []; s.productionTaskIds = [task.id];
  assert.equal(workItems(s).length, 0, 'archived production is never relabeled as a manual task');
  s.productionTaskIds = []; assert.equal(workItems(s).length, 1, 'ordinary tasks remain available');
});

test('workflow connection and character incidents do not rewrite the last known execution outcome', () => {
  const s = setup(), now = Date.parse('2026-10-14T10:00:00Z'), agentId = s.agents[1].id;
  s.workflowBindings = [{ agentId, workflowId: 'external', workflowName: 'Ekspor data', monitorFrom: '' }];
  const item = () => workItems(s, now).find(w => w.source === 'workflow');
  assert.equal(item().status, 'unknown'); assert.equal(item().connection.kind, 'syncing');
  s.n8n = [{ workflowId: 'external', connection: 'online', checkedAt: new Date(now).toISOString(), active: true, running: [], waiting: [], recent: [{ id: 'ok', status: 'success', startedAt: '2026-10-14T09:00:00Z', stoppedAt: '2026-10-14T09:01:00Z' }], partial: false }];
  assert.equal(item().status, 'done'); assert.equal(item().connection.kind, 'online');
  s.n8n[0].connection = 'disconnected';
  assert.equal(item().status, 'done'); assert.equal(item().nativeStatus, 'success'); assert.equal(item().connection.kind, 'disconnected');
  s.n8n[0].connection = 'online'; s.n8n[0].checkedAt = 'invalid'; assert.equal(item().connection.kind, 'stale');
  s.n8n[0].checkedAt = new Date(now).toISOString(); s.n8n[0].partial = true;
  assert.equal(item().connection.kind, 'partial'); assert.equal(item().status, 'done');
  s.n8n[0].partial = false; s.n8n[0].recent.unshift({ id: 'bad', status: 'error', startedAt: '2026-10-14T09:30:00Z', stoppedAt: '', error: 'Node gagal' });
  assert.equal(item().status, 'failed'); assert.equal(item().executionId, 'bad');
  s.n8n[0].running = [{ id: 'new', status: 'running', startedAt: '2026-10-14T10:00:00Z', stoppedAt: '' }];
  s.incidents = [{ agentId, resolvedAt: '', reason: 'Insiden sebelumnya' }];
  assert.equal(item().status, 'running', 'medical does not stop or relabel an external run');
  s.n8n[0].running = []; s.n8n[0].recent = []; s.incidents = [];
  assert.equal(item().status, 'waiting'); s.n8n[0].active = false; assert.equal(item().status, 'paused');
  s.n8n[0].recent = [{ id: 'unknown', status: 'future-status', startedAt: '', stoppedAt: '' }];
  assert.equal(item().status, 'unknown'); assert.equal(item().nativeStatus, 'future-status');
});

test('new divisions share the same work list while every source retains its own owner and scope', () => {
  let s = setup();
  s = applyCommand(s, { type: 'division', name: 'Studio Eksperimen', manager: 'Lina', worker: 'Raka', role: 'Penyunting' });
  const second = s.divisions[1].id;
  s = applyCommand(s, { type: 'brief', divisionId: second, agentId: s.agents[3].id, title: 'Eksperimen', goal: 'Buat materi', criteria: 'Periksa hasil', tasks: ['Sunting materi'] });
  const linked = s.tasks.at(-1);
  s.productions = [{ id: 'new-production', taskId: linked.id, divisionId: second, title: 'Materi baru', status: 'running', stage: 'Editing', activeAgentId: linked.agentId, versions: [], error: '', updatedAt: '' }];
  s.workflowBindings = [{ agentId: s.agents[1].id, workflowId: 'external', workflowName: 'Sinkron data', monitorFrom: '' }];
  const before = structuredClone(s), all = workList(s);
  assert.deepEqual(new Set(all.items.map(w => w.source)), new Set(['manual', 'production', 'workflow']));
  assert.equal(all.total, 3);
  const scoped = workList(divisionState(s, second));
  assert.equal(scoped.total, 1); assert.equal(scoped.items[0].managerId, s.divisions[1].managerId);
  assert.equal(workList(s, { source: 'workflow' }).items[0].managerId, s.divisions[0].managerId);
  assert.deepEqual(s, before, 'reading work never starts jobs, changes actors or creates approval');
});

test('work filters combine company, manager, source and status with bounded pages and division isolation', () => {
  let s = setup(); const first = s.divisions[0].id, firstAgent = s.agents[1].id;
  s = applyCommand(s, { type: 'division', name: 'Pengembangan', manager: 'Tara', worker: 'Bimo', role: 'Developer' });
  const second = s.divisions[1].id; s.divisions[1].company = 'Studio Baru';
  for (let i = 0; i < 3; i++) s = applyCommand(s, { type: 'brief', divisionId: second, agentId: s.agents[3].id, title: `Modul ${i}`, goal: 'Pengembangan fitur', criteria: 'Dapat digunakan', tasks: Array.from({ length: 9 }, (_, n) => `Tugas ${i}-${n}`) });
  const before = structuredClone(s);
  assert.equal(workList(s).total, 28); assert.equal(workList(s).items.length, 20);
  assert.equal(workList(s, { page: 99 }).page, 2); assert.equal(workList(s, { page: 99 }).items.length, 8);
  assert.equal(workList(s, { page: NaN }).page, 1); assert.equal(workList(s, { page: -1 }).page, 1);
  assert.equal(workList(s, { query: 'STUDIO tara', source: 'manual', status: 'draft' }).total, 27);
  assert.equal(workList(s, { query: 'rani bimo' }).total, 0);
  assert.equal(workList(s, {}, first).total, 1); assert.equal(workList(s, {}, second).total, 27);
  s.productionTaskIds = [s.tasks[0].id];
  assert.deepEqual(divisionState(s, second).productionTaskIds, []);
  assert.deepEqual(divisionState(s, first).productionTaskIds, [s.tasks[0].id]);
  assert.equal(workList(s, { source: 'workflow' }).total, 0);
  delete s.productionTaskIds; assert.deepEqual(s, before);
  assert.equal(current(s).agentId, firstAgent);
});

test('next steps distinguish medical, facility occupancy, another task and a request for information', () => {
  let s = approvePlan(setup()), id = s.tasks[0].id, agentId = s.tasks[0].agentId;
  s.incidents = [{ agentId, resolvedAt: '', reason: 'Erreur' }]; assert.match(current(s).nextStep, /medis/);
  s.incidents = []; s.facilitySessions = [{ status: 'active', participantIds: [agentId] }]; assert.match(current(s).nextStep, /fasilitas/);
  s.facilitySessions = []; s.tasks.push({ ...s.tasks[0], id: 'other', status: 'running' }); assert.match(current(s).nextStep, /pekerjaan lain/);
  s.tasks.pop(); s = applyCommand(s, { type: 'hold', id, status: 'blocked', reason: 'Butuh ukuran' });
  assert.equal(current(s).status, 'blocked'); assert.equal(current(s).reason, 'Butuh ukuran'); assert.match(current(s).nextStep, /informasi/);
});

test('work filters survive reload and invalid route filters are discarded outside the work surface', () => {
  for (const route of [{ view: 'activity', divisionId: 'team', query: 'Riset kayu', source: 'manual', status: 'revision', page: 2 }, { view: 'division', divisionId: 'team', section: 'work', query: 'Kursi', source: 'production', status: 'approval', page: 3 }]) {
    const read = readRoute(routeHash(route)); for (const [key, value] of Object.entries(route)) assert.equal(read[key], value);
  }
  assert.equal(routeHash({ view: 'home', query: 'private', source: 'manual', status: 'done', page: 2 }), '#view=home');
  const invalid = readRoute('#view=activity&source=__proto__&status=madeup&page=Infinity');
  assert.equal(invalid.source, 'all'); assert.equal(invalid.status, 'all'); assert.equal(invalid.page, 1);
  assert.equal(readRoute('#view=activity&query=' + 'a'.repeat(200)).query.length, 160);
  assert.equal(readRoute('#view=division&section=members&query=hidden').query, '');
});
