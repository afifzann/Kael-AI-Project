import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, appendFile } from 'node:fs/promises';
import { builderSession } from '../src/builder-room.ts';
import { building } from '../scripts/building.mjs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

async function launch(directory, args = [], env = {}) {
  const processChild = spawn(process.execPath, [...args, 'server/index.mjs'], { env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0', ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { processChild.kill(); reject(new Error('Server startup timed out')); }, 10000); processChild.stdout.on('data', b => { const match = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } }); processChild.on('error', reject); processChild.on('exit', code => { clearTimeout(timer); if (code) reject(new Error(`Server exited ${code}`)); }); });
  return { url, async stop() { const ended = once(processChild, 'exit'); processChild.kill(); await ended; } };
}

test('Builder HTTP exposes only session status, rejects chat history and never persists activity as office work', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-builder-http-')), log = path.join(dir, 'codex-builder.jsonl');
  const record = (type, payload) => JSON.stringify({ type, timestamp: new Date().toISOString(), payload }) + '\n';
  await writeFile(log, record('session_meta', { id: builderSession.threadId, cwd: process.cwd() }) + record('event_msg', { type: 'task_started', turn_id: 'test-turn' }) + record('response_item', { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Test Builder' }] }));
  const server = await launch(dir);
  try {
    const presence = await (await fetch(server.url + '/api/builder-status')).json(); assert.equal(presence.connection, 'online'); assert.equal(presence.status, 'working'); assert.equal(presence.messages, undefined); assert.equal(JSON.stringify(presence).includes('Test Builder'), false);
    const state = await (await fetch(server.url + '/api/state')).json(); assert.equal(state.builderChat.status, 'working'); assert.equal(state.builderChat.messages, undefined);
    assert.equal((await fetch(server.url + '/api/builder-status', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await fetch(server.url + '/api/builder-status?file=other')).status, 404);
    assert.equal((await fetch(server.url + '/api/builder-chat')).status, 404);
    assert.equal((await fetch(server.url + '/api/builder-status', { method: 'POST', body: 'send prompt' })).status, 404);
    await appendFile(log, record('event_msg', { type: 'task_complete', turn_id: 'test-turn' }));
    assert.equal((await (await fetch(server.url + '/api/builder-status')).json()).status, 'completed');
    const disk = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')); assert.equal(disk.revision, 0); assert.equal(disk.builderChat, undefined); assert.deepEqual(disk.agents, []);
  } finally { await server.stop(); }
});

test('building delegates workflow atomically through HTTP, preserves on restart and rejects stale retry', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-workflow-delegate-')); let server = await launch(dir);
  const config = path.join(dir, 'delegate.json');
  try {
    let port = new URL(server.url).port;
    await writeFile(config, JSON.stringify({ revision: 0, command: { type: 'workflow-agent', name: 'Marketing Outdor', company: 'Laxholm Furniture', agent: 'Bu Yuli', role: 'Katalog', workflowId: 'wf1', workflowName: 'LAXHOLM' } }));
    const created = await building(['apply', config], port);
    await writeFile(config, JSON.stringify({ revision: created.revision, command: { type: 'workflow-manager', agentId: created.agents[0].id, role: 'Manager' } }));
    const before = await building(['apply', config], port);
    await writeFile(config, JSON.stringify({ revision: before.revision, command: { type: 'workflow-delegate', managerId: before.agents[0].id, workflowId: 'wf1', agent: 'Date', role: 'Katalog', managerRole: 'Manager · Monitoring agent dan laporan Founder' } }));
    const preview = await building(['preview', config], port); assert.equal(preview.saved, false); assert.equal(preview.agents.length, 2);
    assert.equal((await building(['inspect'], port)).revision, before.revision);
    const saved = await building(['apply', config], port);
    assert.equal(saved.agents[0].manager, true); assert.equal(saved.agents[1].name, 'Date');
    assert.deepEqual(saved.workflowBindings, [{ ...before.workflowBindings[0], agentId: saved.agents[1].id }]);
    await assert.rejects(() => building(['apply', config], port), /Revisi berubah/);
    await server.stop(); server = await launch(dir); port = new URL(server.url).port;
    const { mode, saved: persisted, ...summary } = saved; assert.deepEqual(await building(['inspect'], port), summary);
    const disk = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')); assert.equal(disk.agents.length, 2); assert.deepEqual(disk.workflowBindings, saved.workflowBindings);
  } finally { await server.stop(); }
});

test('a poll started before delegation records a new failure against Date rather than the previous manager', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-delegate-poll-'));
  const server = await launch(dir, ['--import', './tests/fixtures/n8n-transport.mjs'], { N8N_BASE_URL: 'https://n8n.fixture.invalid', N8N_API_KEY: 'fixture-secret', KAEL_N8N_RACE: '1' });
  const read = async () => (await fetch(server.url+'/api/state')).json();
  const post = async command => { const s = await read(); const r = await fetch(server.url+'/api/command', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({revision:s.revision,command}) }); assert.equal(r.status,200); return r.json(); };
  try {
    const created = await post({ type:'workflow-agent',name:'Marketing',company:'Laxholm',agent:'Bu Yuli',role:'Katalog',workflowId:'wf1',workflowName:'Katalog' });
    const managerId = created.agents[0].id;
    await post({ type:'workflow-manager',agentId:managerId,role:'Manager' });
    let started = false; const deadline = Date.now()+10000;
    while (Date.now()<deadline) { try { await readFile(path.join(dir,'poll-started')); started = true; break; } catch { await new Promise(r=>setTimeout(r,25)); } }
    assert.ok(started);
    const delegated = await post({ type:'workflow-delegate',managerId,workflowId:'wf1',agent:'Date',role:'Katalog',managerRole:'Supervisi' });
    await writeFile(path.join(dir,'poll-release'),'yes');
    let state; const finish=Date.now()+5000;
    do { await new Promise(r=>setTimeout(r,25)); state=await read(); } while (!state.incidents?.length&&Date.now()<finish);
    assert.equal(state.incidents.length,1); assert.equal(state.incidents[0].agentId,delegated.agents[1].id); assert.equal(state.incidents[0].executionId,'bad'); assert.equal(state.n8n[0].connection,'online');
  } finally { await server.stop(); }
});

test('production HTTP accepts multipart, links preview decisions, rejects manual bypass and persists archive',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'kael-production-http-')),args=['--import','./tests/fixtures/production-runtime.mjs'];let server=await launch(dir,args);
  const state=async()=>(await fetch(server.url+'/api/state')).json();
  const post=async command=>{const s=await state();return fetch(server.url+'/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:s.revision,command})});};
  try{
    const built=await post({type:'division',name:'Youtube KaelaCH',manager:'Kaela',workers:[{name:'Nara',role:'Naskah'},{name:'Echo',role:'Audio'},{name:'Zetsu',role:'Editor'}]});assert.equal(built.status,200);const s=await built.json();
    const form=new FormData();form.set('divisionId',s.divisions[0].id);form.set('title','Chapter HTTP');form.set('complete','yes');form.append('chapter',new File(['fixture'],'001.png',{type:'image/png'}));
    assert.equal((await fetch(server.url+'/api/production/upload',{method:'POST',headers:{Origin:'https://untrusted.example'},body:form})).status,403);
    const upload=await fetch(server.url+'/api/production/upload',{method:'POST',body:form});assert.equal(upload.status,200);
    let data;for(let n=0;n<100;n++){data=await(await fetch(server.url+'/api/production')).json();if(data.episodes[0]?.status==='review')break;await new Promise(r=>setTimeout(r,25));}
    const job=data.episodes[0];assert.equal(job.status,'review');assert.equal((await state()).productions[0].id,job.id);
    assert.equal((await fetch(server.url+`/api/production/${job.id}/v1/recap.mp4`)).status,200);
    const pending=(await state()).decisions.find(d=>d.targetId===job.taskId&&d.status==='pending');assert.ok(pending);
    assert.equal((await post({type:'decide',id:pending.id,outcome:'approved'})).status,400);
    const action=async(action,extra={})=>{const current=(await(await fetch(server.url+'/api/production')).json()).episodes[0];return fetch(server.url+`/api/production/${current.id}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:current.revision,version:current.version,action,...extra})});};
    assert.equal((await action('approve')).status,400);assert.equal((await action('approve',{watched:true})).status,200);assert.equal((await state()).tasks[0].status,'done');
    const stored=JSON.parse(await readFile(path.join(dir,'state.json')));assert.equal(stored.productions,undefined);assert.equal(stored.productionTaskIds,undefined);
    await server.stop();server=await launch(dir,args);assert.equal((await(await fetch(server.url+'/api/production')).json()).episodes[0].status,'approved');
    assert.equal((await action('delete')).status,200);assert.equal((await(await fetch(server.url+'/api/production')).json()).episodes.length,0);assert.equal((await state()).tasks[0].status,'done');
    assert.deepEqual((await state()).productionTaskIds,[job.taskId]);
    assert.equal((await post({type:'revise-task',id:job.taskId,reason:'Do not resurrect archived production as manual work'})).status,400);
    assert.equal((await state()).tasks[0].status,'done');
    const archived=JSON.parse(await readFile(path.join(dir,'productions/state.json')));assert.equal(archived.episodes[0].status,'deleted');assert.equal(archived.episodes[0].versions.length,1);
  }finally{await server.stop();}
});
test('HTTP persistence, concurrent conflict and origin protection', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-test-')); let server = await launch(dir);
  try {
    const initial = await (await fetch(`${server.url}/api/state`)).json(); assert.equal(initial.revision, 0);
    const payload = { revision: 0, command: { type: 'division', name: 'Test', manager: 'M', worker: 'A', role: 'Testing' } };
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    const responses = await Promise.all([fetch(`${server.url}/api/command`, options), fetch(`${server.url}/api/command`, options)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const denied = await fetch(`${server.url}/api/command`, { ...options, headers: { ...options.headers, Origin: 'https://untrusted.example' } }); assert.equal(denied.status, 403);
    const current = await (await fetch(`${server.url}/api/state`)).json();
    const port = new URL(server.url).port, config = path.join(dir, 'building.json');
    assert.equal((await building(['inspect'], port)).revision, current.revision);
    await writeFile(config, JSON.stringify({ revision: current.revision, command: { type: 'division', name: 'Building test', manager: 'Nate QA', workers: [{ name: 'Sora', role: 'Riset' }] } }));
    assert.equal((await building(['preview', config], port)).saved, false);
    assert.equal((await (await fetch(`${server.url}/api/state`)).json()).revision, current.revision);
    const built = await building(['apply', config], port); assert.equal(built.saved, true); assert.equal(built.divisions.length, 2);
    await assert.rejects(() => building(['apply', config], port), /Revisi berubah/);
    await writeFile(config, JSON.stringify({ revision: built.revision, command: { type: 'provider', provider: 'Codex' } }));
    await assert.rejects(() => building(['apply', config], port), /division/);
    const session = await fetch(`${server.url}/api/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: built.revision, command: { type: 'facility-start', roomId: 'meeting-main', purpose: 'briefing', title: 'Sesi HTTP', agenda: 'Tinjau progres', participantIds: current.agents.map(a => a.id) } }) });
    assert.equal(session.status, 200);
    const persisted = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')); assert.equal(persisted.divisions.length, 2);
    assert.equal(persisted.facilitySessions[0].status, 'active');
    await server.stop(); server = await launch(dir);
    const restored = await (await fetch(`${server.url}/api/state`)).json();
    const { builderChat, aiRuntime, ...restoredData } = restored; assert.deepEqual(restoredData, persisted); assert.equal(persisted.builderChat, undefined); assert.equal(persisted.aiRuntime, undefined);
    const ended = await fetch(`${server.url}/api/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: restored.revision, command: { type: 'facility-end', id: restored.facilitySessions[0].id, notes: 'Catatan bertahan setelah restart.' } }) });
    assert.equal(ended.status, 200); assert.equal((await ended.json()).facilitySessions[0].status, 'ended');
    const healthy = await (await fetch(`${server.url}/api/state`)).json();
    const failed = await fetch(`${server.url}/api/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: healthy.revision, command: { type: 'agent-error', agentId: healthy.agents[1].id, reason: 'Runtime HTTP terputus' } }) });
    assert.equal(failed.status, 200); const sick = await failed.json(); assert.equal(sick.incidents[0].bedIndex, 0);
    await server.stop(); server = await launch(dir);
    const reopened = await (await fetch(`${server.url}/api/state`)).json(); assert.deepEqual(reopened.incidents, sick.incidents);
    const recovered = await fetch(`${server.url}/api/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: reopened.revision, command: { type: 'agent-recover', id: reopened.incidents[0].id, resolution: 'Layanan diperiksa ulang' } }) });
    assert.equal(recovered.status, 200); assert.ok((await recovered.json()).incidents[0].resolvedAt);
  } finally { await server.stop(); }
});

test('building previews and persists an existing workflow manager with revision protection', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-workflow-manager-')), server = await launch(dir);
  const config = path.join(dir, 'manager.json'), port = new URL(server.url).port;
  try {
    await writeFile(config, JSON.stringify({ revision: 0, command: { type: 'workflow-agent', name: 'Marketing Outdor', company: 'Laxholm Furniture', agent: 'Bu Yuli', role: 'Katalog', workflowId: 'wf1', workflowName: 'LAXHOLM' } }));
    const before = await building(['apply', config], port);
    await writeFile(config, JSON.stringify({ revision: before.revision, command: { type: 'workflow-manager', agentId: before.agents[0].id, role: 'Manager Marketing Outdor · Katalog' } }));
    const preview = await building(['preview', config], port);
    assert.equal(preview.agents[0].manager, true); assert.equal(preview.saved, false);
    const { mode, saved: persisted, ...summary } = before;
    assert.deepEqual(await building(['inspect'], port), summary);
    const saved = await building(['apply', config], port);
    assert.equal(saved.agents[0].id, before.agents[0].id); assert.equal(saved.divisions[0].managerId, before.agents[0].id);
    assert.deepEqual(saved.workflowBindings, before.workflowBindings);
    await assert.rejects(() => building(['apply', config], port), /Revisi berubah/);
    const disk = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8'));
    assert.equal(disk.agents[0].manager, true); assert.equal(disk.agents.length, 1);
  } finally { await server.stop(); }
});

test('building previews and persists added specialists through HTTP without duplicating on stale retry', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-team-edit-')); let server = await launch(dir);
  const config = path.join(dir, 'team.json');
  try {
    await writeFile(config, JSON.stringify({ revision: 0, command: { type: 'division', name: 'KaelaCH', manager: 'Kaela', worker: 'Zetsu', role: 'Editor' } }));
    const built = await building(['apply', config], new URL(server.url).port);
    await writeFile(config, JSON.stringify({ revision: built.revision, command: { type: 'division-edit', id: built.divisions[0].id, name: 'KaelaCH', manager: 'Kaela', workers: [], addWorkers: [{ name: 'Nara', role: 'Naskah' }, { name: 'Echo', role: 'Audio' }] } }));
    const preview = await building(['preview', config], new URL(server.url).port);
    assert.equal(preview.saved, false); assert.equal(preview.agents.length, 4);
    assert.equal((await building(['inspect'], new URL(server.url).port)).agents.length, 2);
    const saved = await building(['apply', config], new URL(server.url).port);
    assert.equal(saved.saved, true); assert.equal(saved.agents.length, 4);
    assert.deepEqual(saved.agents.slice(0, 2), built.agents);
    await assert.rejects(() => building(['apply', config], new URL(server.url).port), /Revisi berubah/);
    await server.stop(); server = await launch(dir);
    const restored = await building(['inspect'], new URL(server.url).port);
    assert.deepEqual(restored, { revision: saved.revision, divisions: saved.divisions, agents: saved.agents });
  } finally { await server.stop(); }
});

test('external polling persists one medical incident, survives recovery/restart and keeps secrets off HTTP', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-n8n-'));
  const args = ['--import', './tests/fixtures/n8n-transport.mjs'], env = { N8N_BASE_URL: 'https://n8n.fixture.invalid', N8N_API_KEY: 'fixture-secret' };
  let server = await launch(dir, args, env);
  const read = async () => (await fetch(server.url + '/api/state')).json();
  const post = async command => { const s = await read(); const r = await fetch(server.url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: s.revision, command }) }); assert.equal(r.status, 200); return r.json(); };
  try {
    await post({ type: 'workflow-agent', company: 'Laxholm Furniture', name: 'Marketing Outdor', agent: 'Bu Yuli', role: 'Workflow monitor', workflowId: 'wf1', workflowName: 'Fixture workflow' });
    const deadline = Date.now() + 12000; let s;
    do { await new Promise(resolve => setTimeout(resolve, 100)); s = await read(); } while (!s.incidents?.length && Date.now() < deadline);
    assert.equal(s.incidents.length, 1); assert.equal(s.incidents[0].executionId, 'bad'); assert.equal(s.incidents[0].bedIndex, 0);
    assert.match(s.incidents[0].reason, /Assistant Agent/); assert.ok(!JSON.stringify(s).includes('fixture-secret')); assert.equal(s.n8n[0].connection, 'online');
    const saved = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')); assert.equal(saved.n8n, undefined); assert.equal(saved.incidents.length, 1);
    await post({ type: 'agent-recover', id: s.incidents[0].id, resolution: 'Fixture reviewed' });
    await server.stop(); server = await launch(dir, args, env);
    const waitUntil = Date.now() + 12000;
    do { await new Promise(resolve => setTimeout(resolve, 100)); s = await read(); } while (s.n8n[0].connection !== 'online' && Date.now() < waitUntil);
    assert.equal(s.n8n[0].connection, 'online'); assert.equal(s.incidents.length, 1); assert.ok(s.incidents[0].resolvedAt); assert.equal(s.tasks.length, 0);
  } finally { await server.stop(); }
});
