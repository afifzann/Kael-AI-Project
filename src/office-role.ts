import type { Command, State } from './domain';
export type OfficePresence = { sessionId: string; agentId: string; client: 'Claude' | 'Codex'; model: string; phase: 'working' | 'idle'; updatedAt: string };

export function officeRoleCommand(state: State, actorId: string, value: unknown): Command {
  const actor = state.agents.find(a => a.id === actorId);
  if (!actor || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Peran atau perintah kantor tidak valid.');
  const c = value as Command, division = state.divisions.find(d => d.id === actor.divisionId);
  if (!division) throw new Error('Divisi peran tidak ditemukan.');
  if (c.type === 'manager-plan') {
    if (!actor.manager || c.divisionId !== division.id) throw new Error('Hanya manager boleh mengajukan rencana divisinya sendiri.');
    return c;
  }
  if (c.type === 'division-note') {
    if (c.divisionId !== division.id || typeof c.text !== 'string') throw new Error('Catatan harus untuk divisi peran ini.');
    return { type: c.type, divisionId: division.id, text: `[${actor.name} · sesi kantor]\n${c.text}` };
  }
  if (!['start', 'result', 'review', 'hold'].includes(c.type)) throw new Error('Peran AI tidak boleh memberi keputusan Founder, menghapus data atau mengubah konfigurasi kantor melalui perintah ini.');
  const t = state.tasks.find(t => t.id === c.id), worker = state.agents.find(a => a.id === t?.agentId);
  if (!t || worker?.divisionId !== division.id || !actor.manager && t.agentId !== actor.id) throw new Error('Tugas berada di luar lingkup peran ini.');
  if (state.productionTaskIds?.includes(t.id) || state.productions?.some(p => p.taskId === t.id)) throw new Error('Produksi khusus tetap melalui alur produksinya.');
  if (c.type === 'review' && !actor.manager || c.type === 'result' && actor.manager) throw new Error('Pelaksana menyimpan hasilnya sendiri; manager melakukan review.');
  return c;
}
