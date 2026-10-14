import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyCommand } from '../src/domain.ts';
import { divisionState } from '../src/workspace.ts';
import { resultList, decisionContext, canReviseResult } from '../src/results.ts';

function twoDivisions() {
  let s = applyCommand(initialState(), { type: 'division', name: 'Riset Produk', manager: 'Rani', worker: 'Dimas', role: 'Riset material' });
  s = applyCommand(s, { type: 'division', name: 'Konten', manager: 'Sari', worker: 'Bayu', role: 'Penulis' });
  for (const [i, title] of [[0, 'Riset kursi'], [1, 'Artikel meja']]) {
    const division = s.divisions[i], worker = s.agents.find(a => a.divisionId === division.id && !a.manager);
    s = applyCommand(s, { type: 'brief', divisionId: division.id, agentId: worker.id, title, goal: 'Tujuan', criteria: 'Sumber jelas', tasks: [title] });
    const brief = s.briefs.find(b => b.title === title);
    s = applyCommand(s, { type: 'submit-plan', id: brief.id });
    s = applyCommand(s, { type: 'decide', id: s.decisions.find(d => d.targetId === brief.id).id, outcome: 'approved' });
  }
  return s;
}
const pendingFor = (s, id) => s.decisions.find(d => d.targetId === id && d.status === 'pending');
const produce = (s, id, content) => applyCommand(applyCommand(s, { type: 'start', id }), { type: 'result', id, content });

test('results are listed per division, searchable and only include work with saved versions', () => {
  let s = twoDivisions();
  assert.equal(resultList(s).available, 0);
  s = produce(s, s.tasks.find(t => t.title === 'Riset kursi').id, 'Perbandingan kayu');
  const first = divisionState(s, s.divisions[0].id), second = divisionState(s, s.divisions[1].id);
  assert.equal(resultList(first).total, 1); assert.equal(resultList(first).items[0].versions, 1);
  assert.equal(resultList(second).total, 0, 'another division must not see these results');
  assert.equal(resultList(first, 'dimas').total, 1); assert.equal(resultList(first, 'artikel').total, 0);
  assert.equal(resultList(first, '', 99).page, 1, 'out-of-range pages are clamped');
});

test('old versions stay reviewable while only the latest reviewed version can be decided', () => {
  let s = twoDivisions(); const task = () => s.tasks.find(t => t.title === 'Riset kursi'), id = task().id;
  s = produce(s, id, 'v1');
  s = applyCommand(s, { type: 'review', id, version: 1, accept: true, note: 'Sesuai' });
  const first = pendingFor(s, id);
  assert.equal(first.version, 1); assert.equal(decisionContext(s, first.id).canDecide, true);
  assert.equal(decisionContext(s, first.id).result.content, 'v1');
  s = applyCommand(s, { type: 'decide', id: first.id, outcome: 'revision', note: 'Tambah sumber' });
  assert.equal(canReviseResult(s, id), true);
  s = produce(s, id, 'v2');
  assert.deepEqual(task().results.map(r => r.content), ['v1', 'v2']);
  const old = decisionContext(s, first.id);
  assert.equal(old.canDecide, false); assert.match(old.readOnlyReason, /sudah dijawab/);
  assert.equal(resultList(divisionState(s, s.divisions[0].id)).items[0].versions, 2);
  s = applyCommand(s, { type: 'review', id, version: 2, accept: true, note: 'Lengkap' });
  const latest = pendingFor(s, id);
  assert.equal(latest.version, 2); assert.equal(decisionContext(s, latest.id).canDecide, true);
  assert.equal(task().status, 'approval', 'reviewing and listing results never approves on its own');
});

test('a pending decision stops being decidable once its version is no longer current', () => {
  let s = twoDivisions(); const task = () => s.tasks.find(t => t.title === 'Riset kursi'), id = task().id;
  s = produce(s, id, 'v1');
  s = applyCommand(s, { type: 'review', id, version: 1, accept: true, note: 'Sesuai' });
  const pending = pendingFor(s, id);
  task().results.push({ version: 2, content: 'v2', createdAt: new Date().toISOString() });
  const context = decisionContext(s, pending.id);
  assert.equal(context.canDecide, false); assert.match(context.readOnlyReason, /versi hasil sudah berubah/i);
  assert.throws(() => applyCommand(s, { type: 'decide', id: pending.id, outcome: 'approved' }), /Versi hasil/);
});
