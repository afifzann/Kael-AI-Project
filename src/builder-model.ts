import type { AgentProvider, State } from './domain';

export type BuilderProposal = { name: string; manager: string; workers: { id: string; name: string; role: string }[]; steps: string; criteria: string; limits: string; provider: AgentProvider; model: string };
export type BuilderDiscussion = { id: string; version: number; targetId: string; provider: 'Claude' | 'Codex'; model: string; status: 'discussing' | 'working' | 'ready' | 'applied' | 'cancelled'; messages: { role: 'user' | 'assistant'; text: string }[]; proposal: BuilderProposal | null; baseRevision: number; error: string; appliedDivisionId: string; updatedAt: string };
export function builderCanEdit(state: State, targetId: string) {
  const d = state.divisions.find(v => v.id === targetId);
  return !!d?.managerId && !/kaelach/i.test(d.name) && !state.productions?.some(p => p.divisionId === targetId)
    && !state.workflowBindings?.some(b => state.agents.some(a => a.id === b.agentId && a.divisionId === targetId));
}
export function validateBuilderProposal(state: State, targetId: string, value: unknown): BuilderProposal {
  const fail = (message: string): never => { throw new Error(message); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Usulan Builder tidak valid.');
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some(k => !['name', 'manager', 'workers', 'steps', 'criteria', 'limits', 'provider', 'model'].includes(k))) fail('Usulan memuat pengaturan yang tidak didukung.');
  const text = (v: unknown, label: string, max: number, required = true) => {
    if (typeof v !== 'string' || v.length > max || required && !v.trim()) fail(`${label} wajib berupa teks${required ? ' yang terisi' : ''}, maksimal ${max} karakter.`);
    return (v as string).trim();
  };
  if (targetId && !builderCanEdit(state, targetId)) fail('Edit ini hanya untuk divisi tugas lokal dengan manager. Workflow dan produksi khusus tetap dikelola melalui konfigurasi masing-masing.');
  if (!Array.isArray(p.workers) || p.workers.length < 1 || p.workers.length > 12) fail('Isi 1–12 pelaksana.');
  const workers = (p.workers as Record<string, unknown>[]).map(w => {
    if (!w || typeof w !== 'object' || Array.isArray(w) || Object.keys(w).some(k => !['id', 'name', 'role'].includes(k))) fail('Data pelaksana tidak valid.');
    const id = text(w.id, 'ID pelaksana', 80, false);
    if (id && (!targetId || !state.agents.some(a => a.id === id && a.divisionId === targetId && !a.manager))) fail('Identitas pelaksana tidak cocok dengan divisi.');
    return { id, name: text(w.name, 'Nama pelaksana', 80), role: text(w.role, 'Peran pelaksana', 150) };
  });
  const existing = workers.filter(w => w.id).map(w => w.id);
  if (new Set(existing).size !== existing.length || state.agents.some(a => a.divisionId === targetId && !a.manager && !existing.includes(a.id))) fail('Semua pelaksana lama harus dipertahankan, tanpa ID berulang.');
  const name = text(p.name, 'Nama divisi', 80), manager = text(p.manager, 'Nama manager', 80);
  if (state.divisions.some(d => d.id !== targetId && d.name.toLowerCase() === name.toLowerCase())) fail('Nama divisi sudah digunakan.');
  const names = [manager, ...workers.map(w => w.name)].map(n => n.toLowerCase());
  if (new Set(names).size !== names.length) fail('Nama anggota dalam satu divisi harus berbeda.');
  if (!['manual', 'Claude', 'Codex'].includes(String(p.provider))) fail('Provider pelaksana tidak didukung.');
  const model = text(p.model, 'Model pelaksana', 120, false);
  if (model && !/^[\w.:-]{1,120}$/.test(model)) fail('Nama model tidak valid.');
  return { name, manager, workers, steps: text(p.steps, 'SOP', 10000), criteria: text(p.criteria, 'Kriteria selesai', 5000), limits: text(p.limits, 'Batas tindakan', 5000), provider: p.provider as AgentProvider, model };
}
