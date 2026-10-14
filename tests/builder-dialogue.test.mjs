import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { initialState, applyCommand } from '../src/domain.ts';
import { validateBuilderProposal } from '../src/builder-model.ts';
import { createBuilderDialogue, builderPrompt } from '../server/builder-dialogue.mjs';
import { rawFetch, authenticateTestServer } from './helpers/auth-client.mjs';

const proposal = () => ({ name: 'Layanan pelanggan', manager: 'Dina', workers: [{ id: '', name: 'Arga', role: 'Menjawab pertanyaan dan merangkum komplain' }], steps: 'Terima brief → Arga menyusun jawaban → Dina memeriksa → Founder memberi keputusan.', criteria: 'Jawaban sesuai data produk, sumber dan komplain teridentifikasi.', limits: 'Tidak mengirim pesan, menjanjikan harga atau memberi persetujuan otomatis.', provider: 'manual', model: '' });
const result = p => ({ summary: 'Usulan siap', blocked: false, data: { reply: 'Ini usulan tim kecil untuk ditinjau. Nama dan tugas masih bisa kamu ubah.', proposal: p } });
async function harness(options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-builder-'));
  let state = options.state || initialState();
  const service = await createBuilderDialogue({ directory, getState: () => state, mutate: async c => state = applyCommand(state, c), status: () => ({ available: true }), turn: async () => result(proposal()), ...options });
  return { directory, service, get state() { return state; }, set state(next) { state = next; } };
}
const first = service => service.list()[0];
const action = (service, type, rest = {}) => service.action({ action: type, id: first(service)?.id, version: first(service)?.version, ...rest });
async function settled(service) { for (let i = 0; i < 200 && first(service)?.status === 'working'; i++) await new Promise(r => setTimeout(r, 5)); assert.notEqual(first(service)?.status, 'working'); return first(service); }

test('Builder applies team/SOP atomically once, leaves work/approvals untouched and preserves old identities/settings/history on edit', () => {
  const original = initialState(), p = proposal();
  const created = applyCommand(original, { type: 'builder-apply', discussionId: 'new', baseRevision: 0, targetId: '', proposal: p });
  assert.equal(created.revision, 1); assert.equal(original.divisions.length, 0); assert.equal(created.sops[0].version, 1); assert.equal(created.agentSettings.length, 2);
  for (const key of ['tasks', 'briefs', 'decisions', 'runs']) assert.deepEqual(created[key], original[key]);
  assert.throws(() => applyCommand(created, { type: 'builder-apply', discussionId: 'new', baseRevision: 1, targetId: '', proposal: p }), /sudah diterapkan/);
  const divisionId = created.divisions[0].id, worker = created.agents.find(a => !a.manager);
  const fixture = structuredClone(created); fixture.tasks.push({ id: 'old-task', results: [{ version: 1, content: 'Hasil lama' }] });
  const edit = { ...p, name: 'Dukungan pelanggan', manager: 'Dina Support', workers: [{ id: worker.id, name: 'Arga Support', role: 'Riset jawaban' }, { id: '', name: 'Sari', role: 'Pemeriksaan sumber' }], provider: 'Claude', model: 'sonnet' };
  const updated = applyCommand(fixture, { type: 'builder-apply', discussionId: 'edit', targetId: divisionId, baseRevision: fixture.revision, proposal: edit });
  assert.equal(updated.divisions[0].id, divisionId); assert.equal(updated.divisions[0].managerId, created.divisions[0].managerId); assert.equal(updated.agents.find(a => a.id === worker.id).name, 'Arga Support');
  assert.deepEqual(updated.tasks, fixture.tasks); assert.deepEqual(updated.agentSettings.filter(v => created.agentSettings.some(old => old.agentId === v.agentId)), created.agentSettings);
  assert.equal(updated.sops.length, 2); assert.equal(updated.sops[0].steps, created.sops[0].steps); assert.equal(updated.agentSettings.at(-1).provider, 'Claude');
});

test('Builder rejects stale state, unsupported commands, removed/cross-division IDs, duplicates and invalid SOP without mutation', () => {
  const s = applyCommand(initialState(), { type: 'division', name: 'Tim awal', manager: 'Rani', worker: 'Raka', role: 'Riset' }), before = structuredClone(s);
  const p = proposal();
  assert.throws(() => applyCommand(s, { type: 'builder-apply', discussionId: 'x', targetId: '', baseRevision: 0, proposal: p }), /Kantor berubah/);
  for (const invalid of [{ ...p, command: { type: 'decide' } }, { ...p, workers: [] }, { ...p, steps: '' }, { ...p, provider: 'Hermes' }, { ...p, model: '$(unsafe)' }, { ...p, manager: p.workers[0].name }, { ...p, workers: [{ ...p.workers[0], id: s.agents[1].id }] }]) assert.throws(() => validateBuilderProposal(s, '', invalid));
  assert.throws(() => validateBuilderProposal(s, s.divisions[0].id, p), /dipertahankan/);
  const workflow = { ...s, workflowBindings: [{ agentId: s.agents[1].id }] };
  assert.throws(() => validateBuilderProposal(workflow, s.divisions[0].id, p), /workflow/i);
  const production = { ...s, divisions: [{ ...s.divisions[0], name: 'Youtube KaelaCH' }] };
  assert.throws(() => validateBuilderProposal(production, s.divisions[0].id, p), /produksi/);
  assert.deepEqual(s, before);
});

test('Builder asks a question, resumes persisted discussion, edits proposal, waits for explicit apply and refuses duplicate apply', async () => {
  let turns = 0, prompt = '';
  const h = await harness({ turn: async input => { prompt = input.prompt; turns++; return turns === 1 ? result(null) : result(proposal()); } });
  try {
    await action(h.service, 'start', { provider: 'Claude', model: 'model-test', targetId: '' });
    const id = first(h.service).id;
    await action(h.service, 'message', { text: 'Saya ingin tim customer service.' }); await settled(h.service);
    assert.equal(first(h.service).status, 'discussing'); assert.equal(h.state.revision, 0);
    await action(h.service, 'message', { text: 'Buatkan usulan kecil, hanya menyiapkan draft jawaban.' }); await settled(h.service);
    assert.match(prompt, /SATU pertanyaan/); assert.match(prompt, /customer service/); assert.equal(first(h.service).status, 'ready');
    assert.equal(h.state.divisions.length, 0); assert.equal(h.service.presence().status, 'completed');
    const resumed = await createBuilderDialogue({ directory: h.directory, getState: () => h.state, mutate: async c => h.state = applyCommand(h.state, c), status: () => ({ available: true }), turn: async () => { throw Error('Must not rerun'); } });
    assert.equal(first(resumed).id, id); assert.equal(first(resumed).messages.length, 5);
    await action(resumed, 'save', { proposal: { ...first(resumed).proposal, manager: 'Maya', provider: 'Codex' } });
    await action(resumed, 'apply'); assert.equal(first(resumed).status, 'applied'); assert.equal(h.state.agents[0].name, 'Maya'); assert.equal(h.state.revision, 1);
    await assert.rejects(action(resumed, 'apply'), /ditutup/); assert.equal(h.state.divisions.length, 1);
    resumed.close();
  } finally { h.service.close(); }
});

test('Builder rejects stale discussion/state and offline provider; failed/malformed turns keep drafts and safe retry never approves', async () => {
  let bad = false;
  const h = await harness({ turn: async () => bad ? result({ ...proposal(), command: 'delete' }) : result(proposal()) });
  try {
    await action(h.service, 'start', { provider: 'Codex', model: '', targetId: '' });
    await assert.rejects(h.service.action({ action: 'message', id: first(h.service).id, version: 0, text: 'hi' }), /berubah/);
    await action(h.service, 'message', { text: 'Buat tim support.' }); await settled(h.service);
    const old = structuredClone(first(h.service).proposal); bad = true;
    await action(h.service, 'message', { text: 'Ubah tugasnya.' }); await settled(h.service);
    assert.ok(first(h.service).error); assert.deepEqual(first(h.service).proposal, old); assert.equal(first(h.service).messages.at(-1).role, 'user');
    bad = false; await action(h.service, 'retry'); await settled(h.service); assert.equal(first(h.service).messages.filter(m => m.text === 'Ubah tugasnya.').length, 1);
    h.state = applyCommand(h.state, { type: 'business', name: 'Kantor berubah', audience: 'Pelanggan furnitur', facts: 'Data produk dari pemilik' });
    await assert.rejects(action(h.service, 'apply'), /Kantor berubah/); assert.equal(h.state.divisions.length, 0);
    await action(h.service, 'message', { text: 'Tinjau lagi dengan data kantor terbaru.' }); await settled(h.service); await action(h.service, 'apply'); assert.equal(h.state.divisions.length, 1);
  } finally { h.service.close(); }
  const offline = await harness({ status: () => ({ available: false, reason: 'Belum login fixture' }) });
  await action(offline.service, 'start', { provider: 'Claude', model: '', targetId: '' });
  await assert.rejects(action(offline.service, 'message', { text: 'Kebutuhan' }), /Belum login/); assert.equal(first(offline.service).messages.length, 1); offline.service.close();
});

test('Builder stop rejects late output; interrupted restart does not silently call AI or lose the user message', async () => {
  let finish;
  const h = await harness({ turn: () => new Promise(resolve => finish = resolve) });
  await action(h.service, 'start', { provider: 'Claude', model: '', targetId: '' }); await action(h.service, 'message', { text: 'Pesan tersimpan' });
  while (!finish) await new Promise(r => setTimeout(r, 5));
  assert.equal(h.service.presence().status, 'working');
  await action(h.service, 'stop'); finish(result(proposal())); await new Promise(r => setTimeout(r, 20));
  assert.equal(first(h.service).proposal, null); assert.equal(first(h.service).messages.at(-1).text, 'Pesan tersimpan'); h.service.close();
  const file = path.join(h.directory, 'builder-discussions.json'), records = JSON.parse(await readFile(file, 'utf8')); records[0].status = 'working'; await writeFile(file, JSON.stringify(records));
  const restarted = await createBuilderDialogue({ directory: h.directory, getState: () => h.state, mutate: async () => {}, status: () => ({ available: true }), turn: async () => { throw Error('Must not resume'); } });
  assert.match(first(restarted).error, /Server terhenti/); assert.equal(first(restarted).status, 'discussing'); assert.equal(first(restarted).messages.at(-1).role, 'user'); restarted.close();
});

test('Builder startup and GET reconcile an applied draft using atomic workspace provenance; corrupt archive is preserved', async () => {
  const h = await harness(); await action(h.service, 'start', { provider: 'Codex', model: '', targetId: '' }); await action(h.service, 'message', { text: 'Usulan' }); await settled(h.service);
  const d = first(h.service);
  h.state = applyCommand(h.state, { type: 'builder-apply', discussionId: d.id, targetId: '', baseRevision: 0, proposal: d.proposal });
  assert.equal(first(h.service).status, 'applied');
  const restarted = await createBuilderDialogue({ directory: h.directory, getState: () => h.state, mutate: async () => { throw Error('Must not duplicate'); }, status: () => ({ available: true }) });
  assert.equal(first(restarted).status, 'applied'); await assert.rejects(action(restarted, 'apply'), /ditutup/); restarted.close(); h.service.close();
  const file = path.join(h.directory, 'builder-discussions.json'); await writeFile(file, '{broken');
  await assert.rejects(createBuilderDialogue({ directory: h.directory, getState: () => h.state, mutate: async () => {}, status: () => ({ available: true }) }), /dipertahankan/);
  assert.equal(await readFile(file, 'utf8'), '{broken');
});

test('Builder context contains only business, team target, latest SOP and bounded discussion, without other work/results', () => {
  const s = applyCommand(initialState(), { type: 'division', name: 'Support', manager: 'Maya', worker: 'Nara', role: 'Support' });
  s.tasks.push({ content: 'PRIVATE-OTHER-TASK-FIXTURE' });
  const prompt = builderPrompt(s, { targetId: s.divisions[0].id, proposal: null, messages: [{ role: 'user', text: 'Ubah SOP' }] });
  assert.match(prompt, /Nara/); assert.match(prompt, /Ubah SOP/); assert.doesNotMatch(prompt, /PRIVATE-OTHER-TASK-FIXTURE/);
});

test('authenticated Builder HTTP protects chat/apply, rejects command bypass and starts only fixture AI', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-builder-http-'));
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let clearAuth;
  try {
    const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(Error('Startup timeout')); }, 10000); child.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); child.on('error', reject); child.on('exit', () => { clearTimeout(timer); reject(Error('Server exited')); }); });
    assert.equal((await rawFetch(url + '/api/builder-discussions')).status, 401);
    clearAuth = await authenticateTestServer(url, directory);
    const token = (await readFile(path.join(directory, 'builder-access.key'), 'utf8')).trim();
    assert.equal((await rawFetch(url + '/api/builder-discussions', { headers: { Authorization: 'Bearer ' + token } })).status, 403);
    const post = async body => { const r = await fetch(url + '/api/builder-discussions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, ...await r.json() }; };
    let response = await post({ action: 'start', provider: 'Claude', model: '', targetId: '' }); assert.equal(response.status, 200);
    let d = response.discussions[0]; response = await post({ action: 'message', id: d.id, version: d.version, text: 'Buat tim support sesuai fixture.' }); assert.equal(response.status, 200);
    for (let i = 0; i < 100; i++) { d = (await (await fetch(url + '/api/builder-discussions')).json()).discussions[0]; if (d.status !== 'working') break; await new Promise(r => setTimeout(r, 10)); }
    assert.equal(d.status, 'ready'); assert.equal((await (await fetch(url + '/api/state')).json()).divisions.length, 0);
    const bypass = await fetch(url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, command: { type: 'builder-apply', discussionId: 'bypass', baseRevision: 0, targetId: '', proposal: proposal() } }) }); assert.equal(bypass.status, 400);
    response = await post({ action: 'apply', id: d.id, version: d.version }); assert.equal(response.status, 200);
    const state = await (await fetch(url + '/api/state')).json(); assert.equal(state.divisions.length, 1); assert.equal(state.sops.length, 1); assert.equal(state.decisions.length, 0);
  } finally { if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } clearAuth?.(); }
});
