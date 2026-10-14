import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { applyCommand } from '../src/domain.ts';

// A coding agent uses its own conversation/authentication; this bridge only writes to the local app.
export async function building(args, port = process.env.KAEL_PORT || '5174') {
  const [mode, file] = args;
  if (!['inspect', 'preview', 'apply'].includes(mode) || (mode !== 'inspect' && !file)) throw new Error('Gunakan: node scripts/building.mjs inspect | preview request.json | apply request.json');
  if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error('KAEL_PORT tidak valid.');
  const url = `http://127.0.0.1:${Number(port)}`;
  async function request(endpoint, options) {
    let response;
    try { response = await fetch(url + endpoint, { ...options, signal: AbortSignal.timeout(10000) }); }
    catch { throw new Error('Kantor lokal tidak tersedia. Jalankan npm run dev dahulu.'); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Server menolak permintaan (${response.status}).`);
    return data;
  }
  const state = await request('/api/state');
  const summary = s => ({ revision: s.revision, divisions: s.divisions, agents: s.agents, ...(s.workflowBindings?.length ? { workflowBindings: s.workflowBindings } : {}) });
  if (mode === 'inspect') return summary(state);
  const source = await readFile(file, 'utf8');
  if (source.length > 100000) throw new Error('Konfigurasi terlalu besar.');
  const input = JSON.parse(source.replace(/^\uFEFF/, ''));
  if (!input || !Number.isInteger(input.revision) || input.revision < 0 || !['division', 'division-edit', 'workflow-agent', 'workflow-manager', 'workflow-delegate'].includes(input.command?.type)) throw new Error('Isi revision dan command division/ division-edit/ workflow-agent/ workflow-manager/ workflow-delegate.');
  if (input.revision !== state.revision) throw new Error('Revisi berubah. Jalankan inspect dan tinjau perubahan sebelum mengajukan ulang.');
  const preview = applyCommand(state, input.command);
  if (mode === 'preview') return { mode: 'preview', saved: false, ...summary(preview) };
  const saved = await request('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  return { mode: 'apply', saved: true, ...summary(saved) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await building(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
