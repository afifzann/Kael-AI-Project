import type { State } from './domain';
import { runnableProviders } from './runtime-status.ts';

export type ManagerRequest = {
  id: string; divisionId: string; title: string;
  status: 'queued' | 'running' | 'blocked' | 'failed' | 'interrupted' | 'planned' | 'cancelled';
  messages: { author: 'founder' | 'manager'; text: string; at: string }[];
  createdAt: string; updatedAt: string; attempts: number; runId: string; basis: string;
  briefId: string; reason: string;
};

export function managerBasis(s: State, divisionId: string) {
  const division = s.divisions.find(d => d.id === divisionId);
  return JSON.stringify({ business: s.business, division, members: s.agents.filter(a => a.divisionId === divisionId),
    settings: s.agentSettings?.find(a => a.agentId === division?.managerId),
    sop: s.sops?.filter(v => v.divisionId === divisionId).at(-1) });
}

export function managerReadiness(s: State, divisionId: string, at = Date.now()) {
  const division = s.divisions.find(d => d.id === divisionId), members = s.agents.filter(a => a.divisionId === divisionId);
  if (!division || /kaelach/i.test(division.name) || s.productions?.some(p => p.divisionId === divisionId) || s.workflowBindings?.some(b => members.some(a => a.id === b.agentId))) return 'Gunakan alur workflow atau produksi khusus divisi ini.';
  if (!s.business.name.trim() || !s.business.audience.trim() || !s.business.facts.trim()) return 'Lengkapi nama, pelanggan sasaran, serta fakta dan aturan bisnis di Pengaturan.';
  if (!s.sops?.some(v => v.divisionId === divisionId)) return 'Simpan SOP divisi di SOP & integrasi dahulu.';
  if (!members.some(a => a.id === division.managerId && a.manager) || !members.some(a => !a.manager)) return 'Siapkan manager dan minimal satu pelaksana melalui Builder.';
  const settings = s.agentSettings?.find(a => a.agentId === division.managerId);
  if (!settings || !runnableProviders.includes(settings.provider)) return 'Pilih provider Codex atau Claude untuk manager di Anggota.';
  if (s.aiRuntime?.providers?.[settings.provider]?.available === false) return 'Provider manager belum terhubung. Login di server lalu periksa koneksi.';
  if (s.incidents?.some(i => i.agentId === division.managerId && !i.resolvedAt)) return 'Manager sedang error. Catat pemulihan dahulu.';
  if (s.facilitySessions?.some(v => v.status === 'active' && v.participantIds.includes(division.managerId))) return 'Manager masih berada dalam sesi fasilitas. Akhiri sesi dahulu.';
  if (s.runs?.some(v => v.agentId === division.managerId && ['queued', 'running'].includes(v.status)) || s.tasks.some(t => t.agentId === division.managerId && t.status === 'running')) return 'Manager sedang menyelesaikan pekerjaan lain.';
  const config = s.automations?.find(v => v.divisionId === divisionId);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  if (config?.usageDay === day && config.usedCalls >= config.maxCalls) return 'Batas run AI harian tercapai. Tunggu hari berikutnya atau atur batas di SOP & integrasi.';
  return '';
}

export function managerRequestStatus(s: State, request: ManagerRequest) {
  if (request.status === 'queued') return managerReadiness(s, request.divisionId) || 'Mengantre untuk manager. Satu pekerjaan AI berjalan pada satu waktu.';
  if (request.status === 'planned') {
    const brief = s.briefs.find(b => b.id === request.briefId);
    return brief?.status === 'approved' ? 'Rencana disetujui. Lihat pelaksanaan dan hasil di Pekerjaan.' : brief?.status === 'rejected' ? 'Rencana ditolak oleh pemilik. Riwayat keputusan tetap tersimpan.' : 'Rencana tersimpan. Tinjau keputusan Founder sebelum pelaksanaan.';
  }
  return request.reason || ({ running: 'Manager sedang menyusun rencana.', blocked: 'Manager membutuhkan informasi.', failed: 'Percobaan gagal; tinjau sebelum melanjutkan.', interrupted: 'Proses terputus; lanjutkan hanya setelah ditinjau.', planned: 'Rencana tersimpan. Tinjau keputusan Founder sebelum pelaksanaan.', cancelled: 'Permintaan dibatalkan.' }[request.status]);
}
