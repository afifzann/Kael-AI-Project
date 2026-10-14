import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyCommand, contextFor, latestSop, memberName } from '../src/domain.ts';
import { divisionState } from '../src/workspace.ts';
import { workItems } from '../src/work.ts';

function setup() {
  let s = applyCommand(initialState(), { type: 'division', name: 'Riset Produk', manager: 'Rani', workers: [{ name: 'Dimas', role: 'Riset material' }, { name: 'Sinta', role: 'Analis harga' }] });
  s = applyCommand(s, { type: 'division', name: 'Konten', manager: 'Sari', worker: 'Bayu', role: 'Penulis' });
  return s;
}
const division = (s, name) => s.divisions.find(d => d.name === name);
const agent = (s, name) => s.agents.find(a => a.name === name);
function brief(s, title, worker = 'Dimas') {
  s = applyCommand(s, { type: 'brief', divisionId: division(s, 'Riset Produk').id, agentId: agent(s, worker).id, title, goal: 'Tujuan', criteria: 'Kriteria', tasks: [title] });
  const b = s.briefs.find(x => x.title === title);
  s = applyCommand(s, { type: 'submit-plan', id: b.id });
  return applyCommand(s, { type: 'decide', id: s.decisions.find(d => d.targetId === b.id).id, outcome: 'approved' });
}

test('SOP versions are kept, stale saves are rejected and briefs remember the version they used', () => {
  let s = setup(); const riset = division(s, 'Riset Produk').id;
  assert.equal(latestSop(s, riset), undefined);
  s = applyCommand(s, { type: 'sop-save', divisionId: riset, baseVersion: 0, steps: 'Baca brief\nKumpulkan sumber', criteria: 'Sumber jelas', limits: 'Tanpa publikasi' });
  s = brief(s, 'Riset kursi');
  assert.equal(s.briefs.find(b => b.title === 'Riset kursi').sopVersion, 1);
  assert.throws(() => applyCommand(s, { type: 'sop-save', divisionId: riset, baseVersion: 0, steps: 'x', criteria: 'y' }), /SOP sudah diperbarui/);
  s = applyCommand(s, { type: 'sop-save', divisionId: riset, baseVersion: 1, steps: 'Langkah baru', criteria: 'Kriteria baru' });
  assert.equal(latestSop(s, riset).version, 2); assert.equal(s.sops.length, 2);
  const task = s.tasks.find(t => t.title === 'Riset kursi');
  assert.match(contextFor(s, task.id), /SOP divisi v1:[\s\S]*Kumpulkan sumber[\s\S]*Tanpa publikasi/);
  assert.equal(divisionState(s, division(s, 'Konten').id).sops.length, 0, 'SOP stays inside its division');
});

test('agent settings are validated, scoped and used in the copied context without running AI', () => {
  let s = brief(setup(), 'Riset meja'); const dimas = agent(s, 'Dimas');
  assert.throws(() => applyCommand(s, { type: 'agent-settings', agentId: dimas.id, provider: 'Lain' }), /provider tidak valid/);
  s = applyCommand(s, { type: 'agent-settings', agentId: dimas.id, provider: 'Claude', model: 'model-uji', notes: 'Teliti sumber' });
  s = applyCommand(s, { type: 'agent-settings', agentId: dimas.id, provider: 'Codex', model: '', notes: '' });
  assert.equal(s.agentSettings.length, 1); assert.equal(s.agentSettings[0].provider, 'Codex');
  const task = s.tasks.find(t => t.title === 'Riset meja');
  assert.match(contextFor(s, task.id), /Tujuan provider: Codex\./); assert.equal(task.status, 'queued');
  assert.equal(divisionState(s, division(s, 'Konten').id).agentSettings.length, 0);
});

test('archiving hands open work over, keeps finished history and can be restored', () => {
  let s = brief(brief(setup(), 'Riset lampu'), 'Riset rak'); const dimas = agent(s, 'Dimas'), sinta = agent(s, 'Sinta');
  const done = s.tasks.find(t => t.title === 'Riset lampu'), open = s.tasks.find(t => t.title === 'Riset rak');
  s = applyCommand(s, { type: 'start', id: done.id }); s = applyCommand(s, { type: 'result', id: done.id, content: 'v1' });
  s = applyCommand(s, { type: 'review', id: done.id, version: 1, accept: true, note: 'Ok' });
  s = applyCommand(s, { type: 'decide', id: s.decisions.find(d => d.targetId === done.id && d.status === 'pending').id, outcome: 'approved' });
  s = applyCommand(s, { type: 'start', id: open.id });
  assert.throws(() => applyCommand(s, { type: 'agent-archive', id: dimas.id, reason: 'Gabung', handoverTo: sinta.id }), /sedang berjalan/);
  s = applyCommand(s, { type: 'hold', id: open.id, status: 'paused', reason: 'Checkpoint' });
  assert.throws(() => applyCommand(s, { type: 'agent-archive', id: dimas.id, reason: 'Gabung' }), /tidak ditemukan/, 'open work requires a handover target');
  assert.throws(() => applyCommand(s, { type: 'agent-archive', id: agent(s, 'Rani').id, reason: 'x' }), /Manager/);
  assert.throws(() => applyCommand(s, { type: 'agent-archive', id: dimas.id, reason: 'Gabung', handoverTo: agent(s, 'Bayu').id }), /divisi yang sama/);
  s = applyCommand(s, { type: 'agent-archive', id: dimas.id, reason: 'Peran digabung', handoverTo: sinta.id });
  assert.equal(s.tasks.find(t => t.id === open.id).agentId, sinta.id);
  assert.equal(s.tasks.find(t => t.id === done.id).agentId, dimas.id, 'finished work keeps its original owner');
  assert.deepEqual(s.tasks.find(t => t.id === done.id).results.map(r => r.content), ['v1']);
  assert.ok(!s.agents.some(a => a.id === dimas.id)); assert.equal(s.archivedAgents[0].handoverTo, sinta.id);
  assert.equal(memberName(s, dimas.id), 'Dimas (diarsipkan)');
  assert.equal(workItems(s).find(w => w.targetId === done.id).agentId, dimas.id);
  assert.match(contextFor(s, done.id), /Pelaksana: Dimas/);
  assert.throws(() => applyCommand(s, { type: 'revise-task', id: done.id, reason: 'Ulangi' }), /diarsipkan/);
  assert.throws(() => applyCommand(s, { type: 'agent-archive', id: sinta.id, reason: 'x', handoverTo: sinta.id }), /minimal satu pelaksana/);
  s = applyCommand(s, { type: 'agent-restore', id: dimas.id });
  assert.ok(s.agents.some(a => a.id === dimas.id)); assert.equal(s.archivedAgents.length, 0);
  assert.equal(s.tasks.find(t => t.id === open.id).agentId, sinta.id, 'restoring does not pull handed-over work back');
});

test('division notes are stored per division and never touch tasks or decisions', () => {
  let s = setup(); const before = structuredClone({ tasks: s.tasks, decisions: s.decisions });
  assert.throws(() => applyCommand(s, { type: 'division-note', divisionId: division(s, 'Konten').id, text: ' ' }), /wajib/);
  s = applyCommand(s, { type: 'division-note', divisionId: division(s, 'Konten').id, text: 'Fokus artikel minggu ini' });
  assert.equal(divisionState(s, division(s, 'Konten').id).divisionNotes.length, 1);
  assert.equal(divisionState(s, division(s, 'Riset Produk').id).divisionNotes.length, 0);
  assert.deepEqual({ tasks: s.tasks, decisions: s.decisions }, before);
});
