import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialState, applyCommand } from '../src/domain.ts';
import { newWorkflowFailure } from '../src/n8n.ts';
import { createN8nClient } from './n8n.mjs';
import { createProduction } from './production.mjs';
import { createBuilderSession } from './builder-session.mjs';
import { createRuntime } from './runtime.mjs';
import { createAuth, builderCommands } from './auth.mjs';
import { createBuilderDialogue } from './builder-dialogue.mjs';
import { createOfficeBridge } from './office-bridge.mjs';
import { workFiles } from './work-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = process.env.KAEL_DATA_DIR || path.join(root, 'app-data');
await mkdir(directory, { recursive: true });
const auth = await createAuth({ directory, secure: process.env.KAEL_HTTPS === '1' });
const file = path.join(directory, 'state.json');
let state;
try { state = JSON.parse(await readFile(file, 'utf8')); if (state.schema !== 1 || !Array.isArray(state.tasks) || !Array.isArray(state.events)) throw new Error('Format data tidak didukung.'); }
catch (error) { if (error.code !== 'ENOENT') throw new Error(`Data tersimpan tidak bisa dibuka. File dipertahankan: ${error.message}`); state = initialState(); await writeFile(file, JSON.stringify(state, null, 2)); }
let queue = Promise.resolve();
const client = createN8nClient(), snapshots = new Map();
let production, runtime, builderDialogue, officeBridge;
const builder = createBuilderSession();
const builderPresence = () => { const natives = officeBridge?.presence().filter(s => s.agentId === 'builder') || [], native = natives.find(s => s.phase === 'working' && Date.now() - Date.parse(s.updatedAt) < 120000) || natives.at(-1); if (native) return { connection: 'online', status: native.phase === 'working' && Date.now() - Date.parse(native.updatedAt) < 120000 ? 'working' : 'completed', source: native.client, checkedAt: new Date().toISOString(), lastEventAt: native.updatedAt, turnId: native.sessionId, partial: false, error: '' }; const web = builderDialogue?.presence(), desktop = builder.presence(); return web?.status === 'working' || desktop.connection !== 'online' ? web || desktop : desktop; };
async function monitorBuilder() { await builder.read(); setTimeout(monitorBuilder, 2000).unref(); }
void monitorBuilder();
const publicState = () => ({ ...state, builderChat: builderPresence(), officeSessions: officeBridge?.presence() || [], ...(runtime ? { aiRuntime: runtime.status() } : {}), ...(production?.taskIds().length ? { productionTaskIds: production.taskIds() } : {}), ...(production?.summary().length ? { productions: production.summary() } : {}), ...(state.workflowBindings?.length ? { n8n: state.workflowBindings.map(b => snapshots.get(b.workflowId) || { workflowId: b.workflowId, connection: 'syncing', checkedAt: '', error: '', running: [], waiting: [], recent: [], partial: false }) } : {}) });
async function persist(next) { delete next.n8n; delete next.productions; delete next.builderChat; delete next.aiRuntime; delete next.officeSessions; await writeFile(file + '.tmp', JSON.stringify(next, null, 2)); await rename(file + '.tmp', file); state = next; }
async function mutate(command) {
  const operation=queue.then(async()=>{await persist(applyCommand(state,command));return state;});queue=operation.catch(()=>{});return operation;
}
production = await createProduction({ directory, getState:()=>state, mutate, ...globalThis[Symbol.for('kael.production.fixture')] });
runtime = await createRuntime({ directory, getState:()=>state, mutate, ...globalThis[Symbol.for('kael.runtime.fixture')] });
builderDialogue = await createBuilderDialogue({ directory, getState: () => state, mutate, status: provider => runtime.status(provider), ...globalThis[Symbol.for('kael.builder.fixture')] });
officeBridge = await createOfficeBridge({ directory, getState: publicState, mutate, runtime, dialogue: builderDialogue });
async function monitor() {
  let failed = false;
  for (const binding of state.workflowBindings || []) {
    let snapshot;
    try { snapshot = await client.snapshot(binding); }
    catch (error) { failed = true; snapshot = { ...(snapshots.get(binding.workflowId) || { workflowId: binding.workflowId, checkedAt: '', recent: [], running: [], waiting: [], partial: false }), connection: 'disconnected', error: error.message }; }
    snapshots.set(binding.workflowId, snapshot);
    const operation = queue.then(async () => {
      const failure = newWorkflowFailure(state, snapshot); if (!failure) return;
      const { execution, binding: current } = failure;
      const reason = current.workflowName + ' / Eksekusi #' + execution.id + (execution.node ? ' / ' + execution.node : '') + ': ' + (execution.error || 'Workflow gagal. Buka detail n8n.');
      await persist(applyCommand(state, { type: 'agent-error', agentId: current.agentId, reason: reason.slice(0, 2000), executionId: execution.id }));
    });
    queue = operation.catch(() => {});
    try { await operation; } catch { failed = true; snapshot.connection = 'disconnected'; snapshot.error = 'Gagal menyimpan insiden lokal; pemantauan akan mencoba kembali.'; }
  }
  setTimeout(monitor, failed ? 15000 : 5000).unref();
}
const send = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
const server = http.createServer(async (req, res) => {
  const port = server.address()?.port;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return send(res, 403, { error: 'Host tidak diizinkan.' });
  const origin = req.headers.origin;
  if (origin && !['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'].includes(origin)) return send(res, 403, { error: 'Origin tidak diizinkan.' });
  if (await auth.handle(req, res, send)) return;
  const role = auth.authorize(req, res, send); if (!role) return;
  if (workFiles(req, res, { ...state, productionTaskIds: production.taskIds() }, send)) return;
  if (req.method === 'POST' && req.url === '/api/office-bridge') {
    if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Gunakan JSON.' });
    try {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 200000) return send(res, 413, { error: 'Permintaan terlalu besar.' }); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('Permintaan tidak valid.');
      return send(res, 200, await officeBridge.action(input));
    } catch (e) { return send(res, 400, { error: e instanceof Error ? e.message : 'Sesi kantor belum dapat diproses.' }); }
  }
  if (req.url === '/api/builder-discussions') {
    if (req.method === 'GET') return send(res, 200, { discussions: builderDialogue.list() });
    if (req.method !== 'POST') return send(res, 405, { error: 'Gunakan GET atau POST.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Gunakan JSON.' });
    try {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 100000) return send(res, 413, { error: 'Permintaan terlalu besar.' }); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('Formulir tidak valid.');
      return send(res, 200, { discussions: await builderDialogue.action(input) });
    } catch (e) { return send(res, 400, { error: e instanceof Error ? e.message : 'Builder belum dapat diproses.' }); }
  }
  if(await production.handle(req,res,new URL(req.url,`http://127.0.0.1:${port}`),send))return;
  if (req.method === 'GET' && req.url === '/api/state') return send(res, 200, publicState());
  if (req.method === 'GET' && req.url === '/api/builder-status') { await builder.read(); return send(res, 200, builderPresence()); }
  if (req.method === 'POST' && ['/api/runtime/start', '/api/runtime/review', '/api/runtime/cancel'].includes(req.url)) {
    if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Gunakan JSON.' });
    try {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 10000) return send(res, 413, { error: 'Permintaan terlalu besar.' }); }
      const input = JSON.parse(body);
      if (typeof input.taskId !== 'string') throw new Error('Tugas tidak valid.');
      if (production.taskIds().includes(input.taskId)) throw new Error('Gunakan halaman Produksi untuk episode ini.');
      if (req.url === '/api/runtime/start' || req.url === '/api/runtime/review') { if (input.revision !== state.revision) return send(res, 409, { error: 'Data telah diperbarui di halaman lain. Data terbaru dimuat; tinjau sebelum mencoba kembali.' }); if (req.url === '/api/runtime/review') await runtime.review(input.taskId); else await runtime.start(input.taskId); }
      else await runtime.cancel(input.taskId);
      return send(res, 200, publicState());
    } catch (error) { return send(res, 400, { error: error instanceof Error ? error.message : 'Run gagal.' }); }
  }
  if (req.method !== 'POST' || req.url !== '/api/command') return send(res, 404, { error: 'Endpoint tidak ditemukan.' });
  if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Gunakan JSON.' });
  let body = ''; let size = 0;
  try {
    for await (const chunk of req) { size += chunk.length; if (size > 1000000) { send(res, 413, { error: 'Permintaan terlalu besar.' }); return; } body += chunk; }
    const input = JSON.parse(body);
    const operation = queue.then(async () => {
      if (input.revision !== state.revision) return send(res, 409, { error: 'Data telah diperbarui di halaman lain. Data terbaru dimuat; tinjau sebelum mencoba kembali.' });
      const command=input.command;
      if(role==='builder' && !builderCommands.includes(command?.type)) return send(res,403,{error:'Builder tidak berwenang menjalankan tugas, memulihkan error atau memberi keputusan Founder.'});
      if (command?.type === 'onboarding' && command.step === 'connection' && command.provider !== 'manual' && !runtime.status(command.provider).available) throw new Error('Provider yang dipilih belum tersedia/login di server ini. Hubungkan dahulu atau pilih lanjut manual.');
      if(['run-start','run-begin','run-end','review-start','builder-apply','office-command','manager-plan','manager-request-begin','manager-request-end'].includes(command?.type))throw new Error('Run AI hanya dapat dimulai melalui runtime.');
      if(command?.type==='division-automation'){
        if(production.summary().some(p=>p.divisionId===command.divisionId))throw new Error('Gunakan alur Produksi untuk divisi ini.');
        if(command.enabled===true)for(const a of state.agents.filter(a=>a.divisionId===command.divisionId)){const provider=state.agentSettings?.find(v=>v.agentId===a.id)?.provider;if(!runtime.status(provider).available)throw new Error(`Runtime ${a.name} belum tersedia/login. Atur provider dahulu.`);}
      }
      const target=command?.type==='decide'?state.decisions.find(d=>d.id===command.id)?.targetId:command?.id;
      if(['start','hold','result','review','revise-task','cancel-task','decide'].includes(command?.type)&&production.taskIds().includes(target))throw new Error('Gunakan halaman Produksi untuk hasil, revisi dan keputusan episode ini.');
      if(command?.type==='agent-archive'){const division=state.divisions.find(d=>d.id===state.agents.find(a=>a.id===command.id)?.divisionId);if(division&&(/kaelach/i.test(division.name)||production.summary().some(p=>p.divisionId===division.id)))throw new Error('Anggota divisi produksi mengikuti alur produksi yang ada dan belum dapat diarsipkan.');}
      const next = applyCommand(state, input.command);
      await persist(next); send(res, 200, publicState()); void runtime.wake();
    });
    queue = operation.catch(() => {}); await operation;
  } catch (error) { send(res, 400, { error: error instanceof Error ? error.message : 'Perintah gagal.' }); }
});
server.listen(Number(process.env.KAEL_PORT || 5174), '127.0.0.1', () => console.log(`Kael local data service: http://127.0.0.1:${server.address().port}`));

void monitor();
process.on('SIGTERM',()=>{production.close();runtime.close();builderDialogue.close();server.close();process.exit(0);});
