import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { contextFor, activeRun } from '../src/domain.ts';
import { codexStage, codexStatus } from './codex-stage.mjs';

const instructions = `Kerjakan tugas di atas sebagai pelaksana yang disebut, sesuai brief dan SOP divisi.
Jangan menghubungi pihak luar, memublikasikan, mengirim pesan, membayar, atau mengubah sistem apa pun. Folder kerja kosong dan hanya-baca.
Kembalikan JSON sesuai skema:
- summary: ringkasan satu-dua kalimat tentang apa yang kamu hasilkan.
- blocked: true hanya jika informasi penting tidak tersedia sehingga hasil yang layak tidak bisa dibuat.
- reason: informasi yang dibutuhkan bila blocked, selain itu string kosong.
- payload: string JSON {"content":"hasil kerja lengkap dalam teks"}. Tandai asumsi dengan jelas. Jangan mengaku sudah melakukan tindakan di luar teks ini.`;

// Runs manual tasks through the agent's configured runtime. One run at a time; results always wait for review.
export async function createRuntime({ directory, getState, mutate, turn = codexStage, status = codexStatus }) {
  const base = path.join(directory, 'runs'); await mkdir(base, { recursive: true });
  const schema = path.join(base, 'response-schema.json');
  await writeFile(schema, JSON.stringify({ type: 'object', properties: { summary: { type: 'string' }, blocked: { type: 'boolean' }, reason: { type: 'string' }, payload: { type: 'string' } }, required: ['summary', 'blocked', 'reason', 'payload'], additionalProperties: false }));
  for (const run of getState().runs?.filter(r => r.status === 'running') || []) await mutate({ type: 'run-end', id: run.id, outcome: 'interrupted' });
  let checked = 0, runtime = { available: false, label: 'Codex lokal', reason: 'Memeriksa runtime…' };
  const runtimeStatus = () => { if (Date.now() - checked > 60000) { checked = Date.now(); try { runtime = status(); } catch { runtime = { available: false, label: 'Codex lokal', reason: 'Runtime tidak dapat diperiksa.' }; } } return runtime; };
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
      const output = await turn({ folder, prompt, schema, signal: controller.signal, model: run.model });
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
        const state = getState(), run = state.runs?.find(r => r.status === 'queued' && !state.tasks.some(t => t.agentId === r.agentId && t.id !== r.taskId && t.status === 'running'));
        if (!run || !runtimeStatus().available) break;
        controllers.set(run.id, new AbortController()); await execute(run.id, run.taskId);
      }
    } catch { /* A persistence failure must stop the queue, never repeat AI work. */ }
    finally { draining = false; }
  }
  const timer = setInterval(() => void drain(), 2000); timer.unref();
  void drain();

  async function start(taskId) {
    const current = runtimeStatus(); if (!current.available) throw new Error(current.reason || 'Runtime AI belum tersedia.');
    const runId = randomUUID(); await mutate({ type: 'run-start', taskId, runId });
    void drain(); return runId;
  }
  async function cancel(taskId) {
    const run = activeRun(getState(), taskId); if (!run) throw new Error('Tidak ada run AI yang berjalan untuk tugas ini.');
    controllers.get(run.id)?.abort();
    if (!executing.has(run.id)) await mutate({ type: 'run-end', id: run.id, outcome: 'cancelled' });
  }
  return { start, cancel, status: () => ({ ...runtimeStatus(), executing: [...executing] }), close() { closed = true; clearInterval(timer); for (const c of controllers.values()) c.abort(); } };
}
