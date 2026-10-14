import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { initialState, applyCommand, contextFor, activeRun } from '../src/domain.ts';
import { createRuntime } from '../server/runtime.mjs';
import { divisionState } from '../src/workspace.ts';
import { workItems } from '../src/work.ts';
import { agentActivity } from '../src/visuals.ts';
import { workspaceNotifications } from '../src/notifications.ts';

function approvedTask(title = 'Riset kursi', provider = 'Codex') {
  let s = applyCommand(initialState(), { type: 'division', name: 'Riset Produk', manager: 'Rani', worker: 'Dimas', role: 'Riset material' });
  const dimas = s.agents.find(a => a.name === 'Dimas');
  s = applyCommand(s, { type: 'agent-settings', agentId: dimas.id, provider, model: 'model-uji' });
  s = applyCommand(s, { type: 'brief', divisionId: s.divisions[0].id, agentId: dimas.id, title, goal: 'Tujuan', criteria: 'Kriteria', tasks: [title] });
  s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id });
  return applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' });
}

test('queued runs capture revision context, reserve the task and expose consistent scoped status', () => {
  let s = approvedTask(); const id = s.tasks[0].id, agent = s.agents.find(a => !a.manager);
  s = applyCommand(s, { type: 'start', id }); s = applyCommand(s, { type: 'result', id, content: 'Draft pertama' });
  s = applyCommand(s, { type: 'revise-task', id, version: 1, reason: 'Tambahkan tabel ukuran' });
  s = applyCommand(s, { type: 'run-start', taskId: id });
  const saved = s.runs[0].context;
  assert.match(saved, /Tambahkan tabel ukuran/); assert.match(saved, /Draft pertama/);
  assert.equal(s.tasks[0].status, 'queued'); assert.equal(activeRun(s, id).status, 'queued');
  assert.equal(workItems(s)[0].status, 'queued'); assert.match(workItems(s)[0].nextStep, /Menunggu giliran AI/);
  assert.equal(agentActivity(s, agent).typing, false); assert.equal(agentActivity(s, agent).kind, 'queued');
  assert.equal(divisionState(s, 'other-division').runs.length, 0);
  assert.throws(() => applyCommand(s, { type: 'run-start', taskId: id }), /antrean/);
  assert.throws(() => applyCommand(s, { type: 'start', id }), /antre/);
  assert.throws(() => applyCommand(s, { type: 'run-end', id: s.runs[0].id, outcome: 'done', content: 'palsu' }), /Antrean/);
  s = applyCommand(s, { type: 'agent-settings', agentId: agent.id, provider: 'Codex', model: 'model-baru', notes: 'Catatan baru' });
  s = applyCommand(s, { type: 'run-begin', id: s.runs[0].id });
  assert.equal(s.runs[0].model, 'model-uji'); assert.equal(s.runs[0].context, saved);
  assert.equal(agentActivity(s, agent).typing, true); assert.match(agentActivity(s, agent).text, /Codex/);
  s = applyCommand(s, { type: 'run-end', id: s.runs[0].id, outcome: 'failed', reason: 'Kuota habis' });
  assert.equal(workspaceNotifications(s).find(n => n.targetId === id).title, 'Run AI gagal');
  s = applyCommand(s, { type: 'run-start', taskId: id });
  assert.match(s.runs[1].context, /Tambahkan tabel ukuran/); assert.equal(s.runs[1].taskNotes, 'Tambahkan tabel ukuran');
  s = applyCommand(s, { type: 'run-begin', id: s.runs[1].id });
  s = applyCommand(s, { type: 'run-end', id: s.runs[1].id, outcome: 'done', content: 'Draft kedua' });
  assert.equal(workspaceNotifications(s).find(n => n.targetId === id).title, 'Hasil siap diperiksa');
  assert.equal(s.tasks[0].status, 'review'); assert.equal(s.tasks[0].results.length, 2);
});

test('agent memory includes only its own division work and preserves Founder directions', () => {
  let s = approvedTask(); const task = s.tasks[0], agent = s.agents.find(a => !a.manager);
  s.tasks.push({ ...structuredClone(task), id: 'own', title: 'Tugas terdahulu', status: 'done', results: [{ version: 1, content: 'MEMORI-SENDIRI', createdAt: new Date().toISOString() }] });
  s.tasks.push({ ...structuredClone(task), id: 'foreign-agent', agentId: s.agents[0].id, results: [{ version: 1, content: 'RAHASIA-AGENT-LAIN', createdAt: new Date().toISOString() }] });
  s.briefs.push({ ...s.briefs[0], id: 'foreign-brief', divisionId: 'another' });
  s.tasks.push({ ...structuredClone(task), id: 'foreign-division', briefId: 'foreign-brief', results: [{ version: 1, content: 'RAHASIA-DIVISI-LAIN', createdAt: new Date().toISOString() }] });
  const context = contextFor(s, task.id);
  assert.match(context, /MEMORI-SENDIRI/); assert.doesNotMatch(context, /RAHASIA-/);
  assert.equal(agent.id, task.agentId);
  for (let i = 0; i < 4; i++) s.tasks.push({ ...structuredClone(task), id: `memory-${i}`, title: `Memori ${i}`, results: [{ version: 1, content: 'x'.repeat(5000), createdAt: `2099-01-01T00:00:0${i}Z` }] });
  const bounded = contextFor(s, task.id);
  assert.equal((bounded.match(/Tugas: Memori/g) || []).length, 3);
  assert.doesNotMatch(bounded, /Memori 0/); assert.doesNotMatch(bounded, /x{3001}/);
});

test('restart pauses interrupted execution, resumes queued work once, and queued cancellation never calls AI', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-queue-'));
  let s = approvedTask(), calls = [];
  const first = s.tasks[0].id;
  s.tasks.push({ ...structuredClone(s.tasks[0]), id: 'next', title: 'Tugas berikutnya' }, { ...structuredClone(s.tasks[0]), id: 'cancel', title: 'Batal' });
  s = applyCommand(s, { type: 'run-start', taskId: first });
  s = applyCommand(s, { type: 'run-begin', id: s.runs[0].id });
  s = applyCommand(s, { type: 'run-start', taskId: 'next' });
  s = applyCommand(s, { type: 'run-start', taskId: 'cancel' });
  const mutate = async command => { s = applyCommand(s, command); };
  const runtime = await createRuntime({ directory, getState: () => s, mutate, status: () => ({ available: true }), turn: async ({ prompt }) => { calls.push(prompt); return { blocked: false, summary: 'Selesai', data: { content: 'Hasil antrean' } }; } });
  try {
    await runtime.cancel('cancel');
    for (let i = 0; i < 100 && s.tasks.find(t => t.id === 'next').status !== 'review'; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(s.runs[0].status, 'interrupted'); assert.equal(s.tasks[0].status, 'paused');
    assert.equal(s.tasks.find(t => t.id === 'next').status, 'review');
    assert.equal(s.runs.find(r => r.taskId === 'cancel').status, 'cancelled');
    assert.equal(calls.length, 1); assert.match(calls[0], /Tugas berikutnya/);
    assert.equal(workspaceNotifications(s).find(n => n.targetId === first).title, 'Run AI terputus');
    assert.equal(s.decisions.filter(d => d.type === 'result').length, 0);
  } finally { runtime.close(); }
});

test('runs need a runnable provider and an approved, startable task', () => {
  const claude = approvedTask('x', 'Claude'); assert.throws(() => applyCommand(claude, { type: 'run-start', taskId: claude.tasks[0].id }), /Atur provider Codex/);
  let s = approvedTask(); const id = s.tasks[0].id;
  s = applyCommand(s, { type: 'run-start', taskId: id });
  assert.equal(s.runs.at(-1).status, 'queued');
  s = applyCommand(s, { type: 'run-begin', id: s.runs.at(-1).id });
  assert.equal(s.tasks[0].status, 'running'); assert.equal(s.runs[0].status, 'running'); assert.equal(s.runs[0].model, 'model-uji');
  assert.throws(() => applyCommand(s, { type: 'run-start', taskId: id }), /tidak siap/);
  assert.throws(() => applyCommand(s, { type: 'result', id, content: 'manual' }), /AI sedang mengerjakan/);
  assert.throws(() => applyCommand(s, { type: 'hold', id, status: 'paused', reason: 'x' }), /AI sedang mengerjakan/);
  assert.throws(() => applyCommand(s, { type: 'cancel-task', id, reason: 'x' }), /AI sedang mengerjakan/);
});

test('a finished run stores a new version for review and never approves it', () => {
  let s = approvedTask(); const id = s.tasks[0].id;
  s = applyCommand(s, { type: 'run-start', taskId: id });
  assert.equal(s.runs.at(-1).status, 'queued');
  s = applyCommand(s, { type: 'run-begin', id: s.runs.at(-1).id });
  s = applyCommand(s, { type: 'run-end', id: s.runs[0].id, outcome: 'done', content: 'Hasil AI', summary: 'Selesai' });
  assert.equal(s.tasks[0].status, 'review'); assert.equal(s.tasks[0].results[0].content, 'Hasil AI'); assert.equal(s.runs[0].resultVersion, 1);
  assert.equal(s.decisions.filter(d => d.targetId === id).length, 0, 'no decision is created until a person reviews');
  assert.throws(() => applyCommand(s, { type: 'run-end', id: s.runs[0].id, outcome: 'done', content: 'lagi' }), /sudah selesai/);
});

test('blocked, failed and stopped runs keep old results and leave the task resumable', () => {
  let s = approvedTask(); const id = s.tasks[0].id;
  s = applyCommand(s, { type: 'run-start', taskId: id });
  assert.equal(s.runs.at(-1).status, 'queued');
  s = applyCommand(s, { type: 'run-begin', id: s.runs.at(-1).id });
  s = applyCommand(s, { type: 'run-end', id: s.runs[0].id, outcome: 'blocked', reason: 'Harga belum ada' });
  assert.equal(s.tasks[0].status, 'blocked'); assert.match(s.tasks[0].reason, /Harga belum ada/);
  s = applyCommand(s, { type: 'run-start', taskId: id });
  assert.equal(s.runs.at(-1).status, 'queued');
  s = applyCommand(s, { type: 'run-begin', id: s.runs.at(-1).id });
  s = applyCommand(s, { type: 'run-end', id: s.runs[1].id, outcome: 'failed', reason: 'Kuota habis' });
  assert.equal(s.tasks[0].status, 'paused'); assert.equal(s.tasks[0].results.length, 0);
  s = applyCommand(s, { type: 'run-start', taskId: id });
  assert.equal(s.runs.at(-1).status, 'queued');
  s = applyCommand(s, { type: 'run-begin', id: s.runs.at(-1).id });
  s = applyCommand(s, { type: 'agent-error', agentId: s.tasks[0].agentId, reason: 'Error manual' });
  s = applyCommand(s, { type: 'run-end', id: s.runs[2].id, outcome: 'done', content: 'Terlambat' });
  assert.equal(s.runs[2].status, 'failed'); assert.equal(s.tasks[0].results.length, 0, 'a result after the task stopped is discarded');
});

async function launch(directory) {
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(new Error('Server startup timed out')); }, 10000); child.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); child.on('exit', () => reject(new Error('Server exited'))); });
  return { url, async stop() { const ended = once(child, 'exit'); child.kill(); await ended; } };
}

test('HTTP runtime runs a task with the fixture, can be stopped, rejects forged run commands and marks interrupted runs on restart', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-runtime-')); let server = await launch(dir);
  const read = async () => (await fetch(server.url + '/api/state')).json();
  const post = async (url, body) => fetch(server.url + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const command = async c => { const r = await post('/api/command', { revision: (await read()).revision, command: c }); assert.equal(r.status, 200, await r.clone().text()); return r.json(); };
  const until = async check => { for (let i = 0; i < 100; i++) { const s = await read(); if (check(s)) return s; await new Promise(r => setTimeout(r, 50)); } throw new Error('timeout'); };
  try {
    let s = await command({ type: 'division', name: 'Riset Produk', manager: 'Rani', worker: 'Dimas', role: 'Riset' });
    const divisionId = s.divisions[0].id, dimas = s.agents.find(a => a.name === 'Dimas').id;
    await command({ type: 'sop-save', divisionId, baseVersion: 0, steps: 'Langkah', criteria: 'Kriteria' });
    await command({ type: 'agent-settings', agentId: dimas, provider: 'Codex', model: 'model-uji' });
    for (const title of ['Riset kursi', 'Riset LAMBAT', 'Riset ANTREAN']) {
      s = await command({ type: 'brief', divisionId, agentId: dimas, title, goal: 'Tujuan', criteria: 'Kriteria', tasks: [title] });
      const brief = s.briefs.find(b => b.title === title); s = await command({ type: 'submit-plan', id: brief.id });
      await command({ type: 'decide', id: s.decisions.find(d => d.targetId === brief.id).id, outcome: 'approved' });
    }
    s = await read(); const fast = s.tasks.find(t => t.title === 'Riset kursi').id, slow = s.tasks.find(t => t.title === 'Riset LAMBAT').id;
    assert.equal(s.aiRuntime.available, true);
    assert.equal((await post('/api/command', { revision: s.revision, command: { type: 'run-end', id: 'x', outcome: 'done', content: 'palsu' } })).status, 400);
    assert.equal((await post('/api/command', { revision: s.revision, command: { type: 'run-begin', id: 'x' } })).status, 400);
    assert.equal((await post('/api/runtime/start', { revision: s.revision - 1, taskId: fast })).status, 409);
    assert.equal((await post('/api/runtime/start', { revision: s.revision, taskId: fast })).status, 200);
    s = await until(x => x.tasks.find(t => t.id === fast).status === 'review');
    const task = s.tasks.find(t => t.id === fast);
    assert.match(task.results[0].content, /Hasil fixture \(model-uji\)\nSOP divisi v1/);
    assert.equal(s.decisions.filter(d => d.targetId === fast).length, 0);
    assert.equal((await post('/api/runtime/start', { revision: s.revision, taskId: slow })).status, 200);
    s = await until(x => x.aiRuntime.executing.length === 1);
    assert.equal((await post('/api/runtime/cancel', { taskId: slow })).status, 200);
    s = await until(x => x.runs.find(r => r.taskId === slow)?.status === 'cancelled');
    assert.equal(s.tasks.find(t => t.id === slow).status, 'paused');
    assert.equal((await post('/api/runtime/start', { revision: s.revision, taskId: slow })).status, 200);
    s = await until(x => x.aiRuntime.executing.length === 1);
    const queuedId = s.tasks.find(t => t.title === 'Riset ANTREAN').id;
    assert.equal((await post('/api/runtime/start', { revision: s.revision, taskId: queuedId })).status, 200);
    s = await read(); assert.equal(activeRun(s, queuedId).status, 'queued');
    await server.stop(); server = await launch(dir);
    s = await until(x => x.tasks.find(t => t.id === queuedId).status === 'review'); const last = s.runs.filter(r => r.taskId === slow).at(-1);
    assert.equal(last.status, 'interrupted'); assert.equal(s.tasks.find(t => t.id === slow).status, 'paused');
    assert.equal(s.runs.filter(r => r.taskId === queuedId).length, 1, 'restart resumes the same queue record');
    assert.equal(s.tasks.find(t => t.id === queuedId).results.length, 1);
    const disk = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')); assert.equal(disk.aiRuntime, undefined);
  } finally { await server.stop(); }
});
