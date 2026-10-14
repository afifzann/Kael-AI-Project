import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { contextFor, activeRun } from '../src/domain.ts';
import { codexStage, codexStatus } from './codex-stage.mjs';
import { claudeStage, claudeStatus } from './claude-stage.mjs';
import { runnableProviders } from '../src/domain.ts';

const instructions = `Kerjakan tugas di atas sebagai pelaksana yang disebut, sesuai brief dan SOP divisi.
Jangan menghubungi pihak luar, memublikasikan, mengirim pesan, membayar, atau mengubah sistem apa pun. Folder kerja kosong dan hanya-baca.
Kembalikan JSON sesuai skema:
- summary: ringkasan satu-dua kalimat tentang apa yang kamu hasilkan.
- blocked: true hanya jika informasi penting tidak tersedia sehingga hasil yang layak tidak bisa dibuat.
- reason: informasi yang dibutuhkan bila blocked, selain itu string kosong.
- payload: string JSON {"content":"hasil kerja lengkap dalam teks"}. Tandai asumsi dengan jelas. Jangan mengaku sudah melakukan tindakan di luar teks ini.`;

// Runs manual tasks through the agent's configured runtime. One run at a time; results always wait for review.
export async function createRuntime({ directory, getState, mutate, turn = input => input.provider === 'Claude' ? claudeStage(input) : codexStage(input), status = provider => provider === 'Claude' ? claudeStatus() : codexStatus() }) {
  const base = path.join(directory, 'runs'); await mkdir(base, { recursive: true });
  const schema = path.join(base, 'response-schema.json');
  await writeFile(schema, JSON.stringify({ type: 'object', properties: { summary: { type: 'string' }, blocked: { type: 'boolean' }, reason: { type: 'string' }, payload: { type: 'string' } }, required: ['summary', 'blocked', 'reason', 'payload'], additionalProperties: false }));
  for (const run of getState().runs?.filter(r => r.status === 'running') || []) await mutate({ type: 'run-end', id: run.id, outcome: 'interrupted' });
  const checks = new Map();
  const runtimeStatus = provider => {
    if (!runnableProviders.includes(provider)) return { available: false, label: String(provider || 'AI'), reason: 'Pilih Codex atau Claude di setelan agent untuk menjalankan tugas dengan AI.' };
    let current = checks.get(provider);
    if (!current || Date.now() - current.checked > 60000) {
      let value; try { value = status(provider); } catch { value = { available: false, label: provider, reason: 'Runtime tidak dapat diperiksa.' }; }
      current = { checked: Date.now(), value }; checks.set(provider, current);
    }
    return current.value;
  };
  const controllers = new Map(), executing = new Set(); let draining = false, closed = false;

  async function execute(runId, taskId) {
    const controller = controllers.get(runId), folder = path.join(base, runId);
    const end = command => mutate({ type: 'run-end', id: runId, ...command });
    if (getState().runs?.find(r => r.id === runId)?.status !== 'queued') { controllers.delete(runId); return; }
    try {
      if (controller.signal.aborted) throw new Error('aborted');
      await mutate({ type: 'run-begin', id: runId }); executing.add(runId);
      const state = getState(), run = state.runs.find(r => r.id === runId);
      await mkdir(folder, { recursive: true });
      const prompt = `${run.context || contextFor(state, taskId)}\n\n${instructions}`;
      const output = await turn({ folder, prompt, schema, signal: controller.signal, model: run.model, provider: run.provider });
      controller.signal.throwIfAborted();
      if (output.blocked) return await end({ outcome: 'blocked', reason: String(output.reason || output.summary || 'AI membutuhkan informasi tambahan.').slice(0, 2000), summary: String(output.summary || '').slice(0, 2000) });
      const content = typeof output.data?.content === 'string' ? output.data.content.trim() : '';
      if (!content) throw new Error('Respons AI tidak berisi hasil kerja. Tidak ada hasil palsu disimpan.');
      await end({ outcome: 'done', content: content.slice(0, 50000), summary: String(output.summary || '').slice(0, 2000) });
    } catch (error) {
      if (controller.signal.aborted) await end({ outcome: 'cancelled' });
      else await end({ outcome: 'failed', reason: String(error instanceof Error ? error.message : 'Run gagal.').slice(0, 2000) });
    } finally { executing.delete(runId); controllers.delete(runId); await rm(folder, { recursive: true, force: true }).catch(() => {}); }
  }

  async function drain() {
    if (closed || draining || getState().runs?.some(r => r.status === 'running')) return;
    draining = true;
    try {
      while (!closed) {
        const state = getState(), run = state.runs?.find(r => r.status === 'queued' && runtimeStatus(r.provider).available && !state.tasks.some(t => t.agentId === r.agentId && t.id !== r.taskId && t.status === 'running'));
        if (!run) break;
        controllers.set(run.id, new AbortController()); await execute(run.id, run.taskId);
      }
    } catch { /* A persistence failure must stop the queue, never repeat AI work. */ }
    finally { draining = false; }
  }
  const timer = setInterval(() => void drain(), 2000); timer.unref();
  void drain();

  async function start(taskId) {
    const state = getState(), task = state.tasks.find(t => t.id === taskId);
    const provider = state.agentSettings?.find(v => v.agentId === task?.agentId)?.provider;
    const current = runtimeStatus(provider); if (!current.available) throw new Error(current.reason || 'Runtime AI belum tersedia.');
    const runId = randomUUID(); await mutate({ type: 'run-start', taskId, runId });
    void drain(); return runId;
  }
  async function cancel(taskId) {
    const run = activeRun(getState(), taskId); if (!run) throw new Error('Tidak ada run AI yang berjalan untuk tugas ini.');
    controllers.get(run.id)?.abort();
    if (!executing.has(run.id)) await mutate({ type: 'run-end', id: run.id, outcome: 'cancelled' });
  }
  return { start, cancel, status: provider => {
    if (provider) return { ...runtimeStatus(provider), executing: [...executing] };
    const providers = Object.fromEntries(runnableProviders.map(p => [p, runtimeStatus(p)]));
    return { available: Object.values(providers).some(p => p.available), label: 'Runtime AI lokal', reason: Object.values(providers).some(p => p.available) ? '' : 'Hubungkan Codex atau Claude Code pada server ini.', providers, executing: [...executing] };
  }, close() { closed = true; clearInterval(timer); for (const c of controllers.values()) c.abort(); } };
}
