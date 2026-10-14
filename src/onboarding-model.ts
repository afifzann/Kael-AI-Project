import type { State } from './domain';

export type Onboarding = { step: 'profile' | 'team' | 'connection' | 'ready'; template: string; completedAt: string };
export const teamTemplates = [
  { id: 'content', name: 'Tim konten', description: 'Riset, naskah, dan pemeriksaan konten sebelum kamu terbitkan.', division: 'Konten', manager: 'Maya', workers: [{ name: 'Raka', role: 'Riset bahan dan sumber' }, { name: 'Nara', role: 'Menyusun naskah berdasarkan bahan terverifikasi' }], steps: '1. Pemilik menentukan tujuan dan bahan.\n2. Riset memeriksa sumber dan menandai informasi yang belum pasti.\n3. Penulis menyusun draft.\n4. Hasil ditinjau dan diajukan kepada pemilik.', criteria: 'Draft sesuai brief, sumber dapat diperiksa, dan asumsi ditandai.' },
  { id: 'operations', name: 'Tim operasional', description: 'Merangkum informasi, menyiapkan dokumen, dan memeriksa pekerjaan rutin.', division: 'Operasional', manager: 'Dina', workers: [{ name: 'Arga', role: 'Merangkum informasi dan menyiapkan dokumen' }, { name: 'Sari', role: 'Memeriksa kelengkapan terhadap brief dan SOP' }], steps: '1. Pemilik memberi tujuan, bahan, dan kriteria selesai.\n2. Pelaksana memeriksa kelengkapan; kekurangan ditanyakan.\n3. Pelaksana menyusun hasil.\n4. Pemeriksaan dicatat sebelum meminta keputusan pemilik.', criteria: 'Dokumen lengkap, sesuai fakta bisnis, dan kendala dijelaskan.' },
] as const;
export const templateLimits = 'Publikasi, pengiriman pesan, pembayaran, penghapusan data, dan perubahan sistem memerlukan persetujuan pemilik. Jangan menyimpan kata sandi atau API key dalam konteks bisnis.';

export function firstWorkSteps(s: State) {
  if (!s.onboarding?.completedAt) return [];
  const hasTeam = s.divisions.some(d => d.managerId && !s.workflowBindings?.some(b => s.agents.some(a => a.id === b.agentId && a.divisionId === d.id)));
  return [
    { title: 'Bentuk tim', done: hasTeam, detail: 'Gunakan Builder untuk membuat atau menyesuaikan divisi dan nama agent.', view: 'builder' },
    { title: 'Buat briefing pertama', done: s.briefs.length > 0, detail: 'Isi tujuan, bahan, pelaksana, dan kriteria selesai.', view: 'briefs' },
    { title: 'Tinjau rencana', done: s.briefs.some(b => b.status === 'approved'), detail: 'Buka briefing dan ajukan rencana, lalu beri keputusan sebelum tugas dijalankan.', view: s.decisions.some(d => d.type === 'plan' && d.status === 'pending') ? 'decisions' : 'briefs' },
    { title: 'Simpan hasil pekerjaan', done: s.tasks.some(t => t.results.length > 0), detail: 'Jalankan tugas dengan AI yang terhubung, atau catat hasil manual sebagai versi baru.', view: 'activity' },
    { title: 'Periksa dan beri keputusan hasil', done: s.tasks.some(t => t.status === 'done'), detail: 'Buka pekerjaan dan preview, catat pemeriksaan, lalu beri keputusan atau minta revisi dengan arahan.', view: s.decisions.some(d => d.type === 'result' && d.status === 'pending') ? 'decisions' : 'activity' },
  ];
}
