// Opt-in only: uses the owner's provider quota with synthetic business data, never their office state.
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initialState, applyCommand } from '../src/domain.ts';
import { createBuilderDialogue } from '../server/builder-dialogue.mjs';
import { claudeStatus } from '../server/claude-stage.mjs';
import { codexStatus } from '../server/codex-stage.mjs';

const provider = process.argv[2] || 'Claude';
if (!['Claude', 'Codex'].includes(provider)) throw new Error('Pilih Claude atau Codex.');
const status = () => provider === 'Claude' ? claudeStatus() : codexStatus();
if (!status().available) throw new Error('Provider belum tersedia/login.');
const base = fileURLToPath(new URL('../evidence/builder-smoke/', import.meta.url)); await mkdir(base, { recursive: true });
const directory = await mkdtemp(path.join(base, 'run-'));
let state = initialState(); state.business = { ...state.business, name: 'Kantor QA sintetis', audience: 'Pelanggan toko furnitur sintetis', facts: 'Hanya menyusun draft jawaban FAQ berdasarkan katalog yang disediakan. Tidak menghubungi pelanggan.' };
const service = await createBuilderDialogue({ directory, getState: () => state, mutate: async c => state = applyCommand(state, c), status });
try {
  await service.action({ action: 'start', provider, model: '', targetId: '' });
  for (const text of ['Buatkan usulan divisi layanan pelanggan kecil: satu manager dan satu pelaksana untuk menyusun draft jawaban FAQ katalog furnitur. Pilih nama sendiri, SOP brief → draft → review manager → keputusan Founder, kriteria akurat sesuai katalog, tanpa kirim pesan atau publikasi. Tujuan dan batas sudah jelas, langsung buat proposal untuk saya tinjau.', 'Tujuan dan output sudah cukup. Gunakan asumsi yang ditandai dan buat proposal sesuai format sekarang, tidak perlu pertanyaan tambahan.']) {
    const d = service.list()[0]; if (d.proposal) break;
    await service.action({ action: 'message', id: d.id, version: d.version, text });
    const deadline = Date.now() + 11 * 60 * 1000;
    while (service.list()[0].status === 'working' && Date.now() < deadline) await new Promise(r => setTimeout(r, 1000));
    if (service.list()[0].error) throw new Error(service.list()[0].error);
  }
  const draft = service.list()[0];
  if (!draft.proposal || state.divisions.length) throw new Error('Preview belum tersedia atau terjadi penerapan sebelum keputusan.');
  await service.action({ action: 'apply', id: draft.id, version: draft.version });
  const check = { provider, status: service.list()[0].status, messages: draft.messages.length, name: state.divisions[0].name, workers: state.agents.filter(a => !a.manager).length, sopVersions: state.sops.length, tasks: state.tasks.length, decisions: state.decisions.length, stateRevision: state.revision, syntheticOnly: true };
  await writeFile(path.join(directory, 'check.json'), JSON.stringify(check, null, 2)); console.log(JSON.stringify({ ...check, evidence: path.join(directory, 'check.json') }));
} finally { service.close(); }
