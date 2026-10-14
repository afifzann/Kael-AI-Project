// Uji opt-in memakai provider sungguhan; data sintetis, tanpa tugas/data kantor pemilik.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { initialState, applyCommand } from '../src/domain.ts';
import { createRuntime } from '../server/runtime.mjs';

const provider = process.argv[2] || 'Codex';
assert.ok(['Codex', 'Claude'].includes(provider), 'Gunakan Codex atau Claude untuk uji opt-in.');

const base = path.resolve('evidence/agent-runtime-smoke'); await mkdir(base, { recursive: true });
const directory = await mkdtemp(path.join(base, 'run-'));
let state = applyCommand(initialState(), { type: 'division', name: 'Divisi Uji', manager: 'Manager Uji', worker: 'Agent Uji', role: 'Penulis checklist' });
const agent = state.agents.find(a => !a.manager);
state = applyCommand(state, { type: 'agent-settings', agentId: agent.id, provider, model: '' });
state = applyCommand(state, { type: 'sop-save', divisionId: agent.divisionId, baseVersion: 0, steps: 'Gunakan bahasa Indonesia. Jawab singkat dalam 3 butir.', criteria: 'Tepat 3 butir dan tidak mengarang tindakan eksternal.' });
state = applyCommand(state, { type: 'brief', divisionId: agent.divisionId, agentId: agent.id, title: 'Checklist rapat mingguan', goal: 'Buat checklist persiapan rapat mingguan tim, tepat 3 butir.', criteria: 'Bahasa Indonesia, 3 butir praktis, tanpa pencarian atau tool eksternal.', tasks: ['Tulis checklist rapat mingguan'] });
state = applyCommand(state, { type: 'submit-plan', id: state.briefs[0].id });
state = applyCommand(state, { type: 'decide', id: state.decisions[0].id, outcome: 'approved', note: 'Persetujuan fixture sintetis untuk uji; bukan keputusan pemilik.' });
const runtime = await createRuntime({ directory, getState: () => state, mutate: async c => { state = applyCommand(state, c); await writeFile(path.join(directory, 'state.json'), JSON.stringify(state, null, 2)); } });
const taskId = state.tasks[0].id, deadline = Date.now() + 180000;
try {
  assert.equal(runtime.status(provider).available, true, provider + ' CLI belum tersedia/login');
  await runtime.start(taskId);
  while (state.runs.some(r => ['queued', 'running'].includes(r.status))) {
    if (Date.now() > deadline) { await runtime.cancel(taskId); throw new Error('Batas uji 3 menit tercapai.'); }
    await new Promise(r => setTimeout(r, 1000));
  }
  const task = state.tasks[0], run = state.runs[0];
  assert.equal(run.status, 'done', run.error); assert.equal(task.status, 'review');
  assert.equal(task.results.length, 1); assert.ok(task.results[0].content.trim());
  assert.equal(state.decisions.filter(d => d.type === 'result').length, 0, 'Tidak boleh menyetujui hasil otomatis');
  await writeFile(path.join(directory, 'check.json'), JSON.stringify({ synthetic: true, provider: run.provider, status: run.status, taskStatus: task.status, resultVersion: run.resultVersion, content: task.results[0].content, founderApproval: false }, null, 2));
  console.log(JSON.stringify({ success: true, directory, taskStatus: task.status, resultVersion: 1, founderApproval: false }));
} finally { runtime.close(); }
