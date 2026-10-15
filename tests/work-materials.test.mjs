import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { initialState, applyCommand, contextFor } from '../src/domain.ts';
import { validateMaterials, summarizeCsv, materialTools, readWorkFiles } from '../src/work-materials.ts';
import { createRuntime } from '../server/runtime.mjs';
import { authenticateTestServer, rawFetch } from './helpers/auth-client.mjs';
import { officeRequest } from '../scripts/office.mjs';
import { createHash } from 'node:crypto';
import { officeRoleCommand } from '../src/office-role.ts';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const materials = [{ name: 'orders.csv', content: 'product,quantity,amount\n"Chair, oak",2,0.1\nTable,3,0.2\n' }, { name: 'brief.md', content: 'BAHAN-OWNER: Ringkas data, jangan kirim ke pembeli.' }];
function office() {
  let s = applyCommand(initialState(), { type: 'business', name: 'Fixture', audience: 'Pelanggan', facts: 'Fakta sintetis.' });
  s = applyCommand(s, { type: 'division', name: 'Operasional', manager: 'Maya', worker: 'Nara', role: 'Rekap data' });
  const divisionId = s.divisions[0].id;
  s = applyCommand(s, { type: 'sop-save', divisionId, baseVersion: 0, steps: 'Baca bahan → cek angka → laporan', criteria: 'Sesuai sumber', limits: 'Tidak mengirim' });
  for (const agent of s.agents) s = applyCommand(s, { type: 'agent-settings', agentId: agent.id, provider: 'Codex', model: '', notes: '' });
  return s;
}

test('CSV tool preserves quoted cells/newlines, detects separator and computes exact decimal totals', () => {
  const report = summarizeCsv(materials[0].content);
  assert.equal(report.rowCount, 2); assert.equal(report.columns[0].numeric, false); assert.equal(report.columns[1].sum, '5'); assert.equal(report.columns[2].sum, '0.3');
  const other = summarizeCsv('nama;nilai;kode\r\n"a\n""b""";-0.25;001\r\nc;0.1;002\r\n');
  assert.equal(other.separator, ';'); assert.equal(other.rowCount, 2); assert.equal(other.columns[1].sum, '-0.15'); assert.equal(other.columns[2].numeric, false);
  assert.equal(summarizeCsv('price\n999999999999999999.123456\n0.000001').columns[0].sum, '999999999999999999.123457');
  assert.equal(summarizeCsv('price\n"1,25"\n"2,50"').columns[0].numeric, false, 'locale values must not be guessed');
});

test('material validation rejects paths, binary, invalid/oversized CSV and strips untrusted metadata', () => {
  for (const name of ['../secret.txt', 'C:\\secret.txt', '.env.txt', 'payload.html', 'bad\r\n.txt']) assert.throws(() => validateMaterials([{ name, content: 'x' }]));
  for (const content of ['\x00binary', '', '\ud800', 'x'.repeat(32769)]) assert.throws(() => validateMaterials([{ name: 'file.txt', content }]));
  for (const content of ['a,a\n1,2', 'a,b\n1', 'a,b\n"unclosed,2', 'a,b\n"x"invalid,2', Array.from({ length: 33 }, (_, n) => 'h' + n).join(',')]) assert.throws(() => validateMaterials([{ name: 'file.csv', content }]));
  assert.throws(() => validateMaterials([{ name: 'same.txt', content: 'a' }, { name: 'SAME.txt', content: 'b' }]));
  assert.throws(() => validateMaterials(Array.from({ length: 6 }, (_, n) => ({ name: n + '.txt', content: 'x' }))));
  assert.throws(() => validateMaterials([{ name: '1.txt', content: 'x'.repeat(30000) }, { name: '2.txt', content: 'x'.repeat(30000) }, { name: '3.txt', content: 'x'.repeat(10000) }]));
  assert.throws(() => summarizeCsv('a\n' + '1\n'.repeat(1001)));
  assert.deepEqual(validateMaterials([{ name: 'note.txt', content: 'ok', path: '/etc/passwd', approved: true }]), [{ name: 'note.txt', content: 'ok' }]);
  assert.equal(materialTools(materials)[0].tool, 'csv-summary'); assert.equal(materialTools(materials)[0].status, 'success');
});

test('selected browser files are size-checked before reading and decoded as UTF-8 only', async () => {
  let reads = 0;
  const tooLarge = { name: 'large.txt', size: 32769, arrayBuffer() { reads++; } };
  await assert.rejects(readWorkFiles({ getAll: () => [tooLarge] })); assert.equal(reads, 0);
  const data = new FormData(); data.append('materials', new File([materials[0].content], 'orders.csv')); assert.deepEqual(await readWorkFiles(data), [materials[0]]);
  const invalid = new FormData(); invalid.append('materials', new File([new Uint8Array([0xff])], 'invalid.txt')); await assert.rejects(readWorkFiles(invalid), /UTF-8/);
});

test('owner materials survive manager planning, worker/review context and versioned results without AI substituting sources', async t => {
  let state = office(); state = applyCommand(state, { type: 'manager-request', divisionId: state.divisions[0].id, title: 'Rekap CSV', text: 'Buat laporan dari bahan.', materials });
  assert.deepEqual(state.managerRequests[0].materials, materials);
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-material-runtime-')), calls = [];
  const runtime = await createRuntime({ directory, getState: () => state, mutate: async c => state = applyCommand(state, c), status: () => ({ available: true }), turn: async input => {
    calls.push(input);
    if (input.prompt.includes('KAEL_MANAGER_PLAN')) return { blocked: false, data: { title: 'Rekap', goal: 'Rekap bahan', criteria: 'Cocok dengan sumber', tasks: [{ agentId: state.agents.find(a => !a.manager).id, title: 'Susun laporan' }], materials: [{ name: 'fake.txt', content: 'AI must not replace owner sources' }] } };
    if (input.prompt.includes('KAEL_MANAGER_REVIEW')) return { blocked: false, data: { accept: true, note: 'Angka cocok dengan alat lokal.' } };
    return { blocked: false, data: { content: 'Laporan fixture: 2 baris, quantity 5, amount 0.3.' } };
  } }); t.after(() => runtime.close());
  const settle = async () => { for (let i = 0; i < 100; i++) { await runtime.wake(); if (!state.managerRequests.some(r => r.status === 'running') && !state.runs?.some(r => ['queued', 'running'].includes(r.status))) return; await new Promise(resolve => setTimeout(resolve, 10)); } assert.fail('Runtime fixture timeout'); };
  await settle(); assert.equal(state.managerRequests[0].status, 'planned'); assert.deepEqual(state.briefs[0].materials, materials); assert.match(calls[0].prompt, /BAHAN-OWNER/); assert.match(calls[0].prompt, /"sum":"0.3"/);
  state = applyCommand(state, { type: 'decide', id: state.decisions[0].id, outcome: 'approved' });
  const taskId = state.tasks[0].id; await runtime.start(taskId); await settle(); assert.equal(state.tasks[0].status, 'review'); assert.match(calls[1].prompt, /orders.csv/); assert.match(calls[1].prompt, /csv-summary/);
  await runtime.review(taskId); await settle(); assert.match(calls[2].prompt, /"sum":"0.3"/); assert.equal(state.decisions[0].status, 'pending');
  const first = structuredClone(state.tasks[0].results[0]); state = applyCommand(state, { type: 'decide', id: state.decisions[0].id, outcome: 'revision', note: 'Jelaskan arti kolom.' });
  await runtime.start(taskId); await settle(); assert.equal(state.tasks[0].results.length, 2); assert.deepEqual(state.tasks[0].results[0], first); assert.deepEqual(state.briefs[0].materials, materials);
  const foreign = structuredClone(state); foreign.briefs.push({ ...foreign.briefs[0], id: 'foreign', materials: [{ name: 'secret.txt', content: 'FOREIGN-SECRET' }] }); assert.doesNotMatch(contextFor(foreign, taskId), /FOREIGN-SECRET/);
});

test('invalid material payloads leave requests and briefs unchanged; replies append owner materials only before planning', () => {
  const before = office(), divisionId = before.divisions[0].id;
  assert.throws(() => applyCommand(before, { type: 'manager-request', divisionId, title: 'Invalid', text: 'Invalid', materials: [{ name: '../file.txt', content: 'x' }] })); assert.equal(before.managerRequests, undefined);
  let state = applyCommand(before, { type: 'manager-request', divisionId, title: 'Valid', text: 'Valid', materials: materials.slice(0, 1) });
  const request = state.managerRequests[0]; request.status = 'blocked';
  state = applyCommand(state, { type: 'manager-request-reply', id: request.id, text: 'Bahan tambahan.', materials: materials.slice(1) }); assert.deepEqual(state.managerRequests[0].materials, materials);
  assert.throws(() => applyCommand(state, { type: 'manager-request-reply', id: request.id, text: 'Cannot replace while queued', materials }));
  assert.throws(() => officeRoleCommand(state, state.divisions[0].managerId, { type: 'manager-plan', divisionId, materials }), /pemilik/);
});

test('authenticated downloads preserve source/version hashes, reject traversal and never approve results', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-material-http-'));
  let seed = office(); seed = applyCommand(seed, { type: 'brief', divisionId: seed.divisions[0].id, agentId: seed.agents.find(a => !a.manager).id, title: 'Rekap fixture', goal: 'Rekap bahan', criteria: 'Sesuai sumber', tasks: ['Rekap'], materials });
  seed = applyCommand(seed, { type: 'submit-plan', id: seed.briefs[0].id }); seed = applyCommand(seed, { type: 'decide', id: seed.decisions[0].id, outcome: 'approved' });
  const taskId = seed.tasks[0].id, briefId = seed.briefs[0].id;
  seed = applyCommand(seed, { type: 'start', id: taskId }); seed = applyCommand(seed, { type: 'result', id: taskId, content: 'HASIL-V1: 2 baris; quantity 5; amount 0.3.' });
  await writeFile(path.join(directory, 'state.json'), JSON.stringify(seed));
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let clearAuth;
  try {
    const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(Error('Startup timeout')); }, 10000); child.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); child.on('error', reject); });
    const sourceUrl = url + `/api/work-files/source/brief/${briefId}/0`, resultUrl = url + `/api/work-files/result/${taskId}/v1.md`;
    assert.equal((await rawFetch(sourceUrl)).status, 401); assert.equal((await rawFetch(resultUrl)).status, 401);
    clearAuth = await authenticateTestServer(url, directory);
    const get = async () => (await fetch(url + '/api/state')).json();
    const command = async value => { const response = await fetch(url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: (await get()).revision, command: value }) }); assert.equal(response.status, 200); return response.json(); };
    const stateBefore = JSON.stringify(await get());
    const source = await fetch(sourceUrl); assert.equal(source.status, 200); assert.match(source.headers.get('content-disposition'), /attachment/); assert.equal(source.headers.get('x-content-type-options'), 'nosniff'); assert.equal(await source.text(), materials[0].content);
    const result = await fetch(resultUrl), v1 = await result.text(); assert.equal(result.status, 200); assert.match(v1, /HASIL-V1/); assert.match(v1, /"sum": "0.3"/); assert.match(v1, new RegExp(createHash('sha256').update(materials[0].content).digest('hex'))); assert.equal(result.headers.get('x-kael-content-sha256'), createHash('sha256').update(v1).digest('hex'));
    assert.equal(JSON.stringify(await get()), stateBefore, 'download must not change revision or decisions');
    assert.equal((await fetch(url + `/api/work-files/result/${taskId}/v999.md`)).status, 404);
    for (const suffix of [`source/brief/${briefId}/5`, 'source/brief/..%2F..%2F.env/0', 'result/..%2Fsecret/v1.txt']) assert.equal((await fetch(url + '/api/work-files/' + suffix)).status, 404);
    assert.equal((await fetch(resultUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 405);
    const key = (await readFile(path.join(directory, 'builder-access.key'), 'utf8')).trim(); assert.equal((await rawFetch(sourceUrl, { headers: { Authorization: 'Bearer ' + key } })).status, 403);
    const actor = await officeRequest({ action: 'open', role: 'Nara', client: 'Codex', nativeId: 'material-worker' }, { directory, port: new URL(url).port });
    assert.equal(actor.briefs[0].materials[0].content, undefined, 'context uses source metadata only');
    const full = await officeRequest({ action: 'task', sessionId: actor.sessionId, taskId }, { directory, port: new URL(url).port }); assert.deepEqual(full.brief.materials, materials); assert.equal(full.tools[0].data.columns[2].sum, '0.3');
    await command({ type: 'review', id: taskId, version: 1, accept: true, note: 'Angka terverifikasi.' }); const pending = (await get()).decisions.find(d => d.status === 'pending');
    await command({ type: 'decide', id: pending.id, outcome: 'revision', note: 'Tambahkan penjelasan.' }); await command({ type: 'start', id: taskId }); await command({ type: 'result', id: taskId, content: 'HASIL-V2: penjelasan diperbaiki.' });
    assert.equal(await (await fetch(resultUrl)).text(), v1); assert.match(await (await fetch(url + `/api/work-files/result/${taskId}/v2.txt`)).text(), /HASIL-V2/);
    const proof = await (await fetch(url + `/api/work-files/tools/${briefId}.json`)).json(); assert.equal(proof.sources.length, 2); assert.equal(proof.observations[0].data.rowCount, 2);
    assert.equal((await get()).tasks[0].status, 'review');
    const beforeUpload = await get();
    const invalidUpload = await fetch(url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kael-CSRF': 'forged' }, body: JSON.stringify({ revision: beforeUpload.revision, command: { type: 'manager-request', divisionId: seed.divisions[0].id, title: 'Forbidden', text: 'Forbidden', materials } }) }); assert.equal(invalidUpload.status, 403);
    await command({ type: 'manager-request', divisionId: seed.divisions[0].id, title: 'Permintaan dengan bahan', text: 'Buat laporan dari bahan ini.', materials });
    let uploaded;
    for (let i = 0; i < 150; i++) { uploaded = await get(); if (uploaded.managerRequests?.[0].status === 'planned') break; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.deepEqual(uploaded.managerRequests[0].materials, materials); assert.deepEqual(uploaded.briefs[0].materials, materials); assert.equal(uploaded.decisions[0].status, 'pending');
    assert.equal(await (await fetch(url + `/api/work-files/source/request/${uploaded.managerRequests[0].id}/1`)).text(), materials[1].content);
  } finally { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } clearAuth?.(); }
});

function uiFunction(name, scope) {
  const source = ts.createSourceFile('operations.ts', readFileSync(new URL('../src/operations.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let fn; function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) fn = node.getText(source); ts.forEachChild(node, visit); } visit(source); assert.ok(fn);
  return runInNewContext(ts.transpileModule(fn + '\n' + name, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}

test('material UI escapes raw content, shows readable CSV totals and links exact scoped sources', () => {
  const esc = value => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const panel = uiFunction('workMaterialPanel', { materialTools, esc, encodeURIComponent });
  const html = panel([...materials, { name: 'unsafe.md', content: '<script>alert(1)</script>' }], 'brief', 'brief-fixture');
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/); assert.match(html, /Jumlah angka: 0.3/); assert.match(html, /2 baris data/); assert.match(html, /source\/brief\/brief-fixture\/2/); assert.match(html, /tools\/brief-fixture.json/);
  assert.equal(panel(undefined, 'brief', 'empty'), '');
});

test('inbox upload submits validated file contents and retains selection on decoding failure', async () => {
  let form, closed = 0; const commands = [];
  const open = uiFunction('newManagerRequest', { materialInput: 'UPLOAD-PICKER', readWorkFiles, modal: (_title, html, submit) => form = { html, submit }, field: () => '', save: () => '', command: async value => commands.push(value), dialog: { close: () => closed++ }, notify() {} });
  open('division-fixture'); assert.match(form.html, /UPLOAD-PICKER/);
  const data = new FormData(); data.set('title', 'Rekap'); data.set('text', 'Baca CSV'); data.append('materials', new File([new Uint8Array([0xff])], 'bad.txt'));
  await assert.rejects(form.submit(data), /UTF-8/); assert.equal(commands.length, 0); assert.equal(closed, 0);
  data.delete('materials'); data.append('materials', new File([materials[0].content], materials[0].name)); await form.submit(data);
  assert.equal(commands[0].divisionId, 'division-fixture'); assert.deepEqual(commands[0].materials, [materials[0]]); assert.equal(closed, 1);
});
