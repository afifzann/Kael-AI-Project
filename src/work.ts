import type { State } from './domain';
import type { WorkflowExecution } from './n8n';

export const workSources = { manual: 'Tugas lokal', production: 'Produksi', workflow: 'Workflow eksternal' } as const;
export const workStatuses = { draft: 'Rencana belum diajukan', queued: 'Antrean', running: 'Dikerjakan', waiting: 'Menunggu', review: 'Perlu pemeriksaan', approval: 'Menunggu approval', revision: 'Perlu revisi', blocked: 'Butuh informasi', failed: 'Gagal', paused: 'Dijeda', done: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan', unknown: 'Belum diketahui' } as const;
export type WorkSource = keyof typeof workSources;
export type WorkStatus = keyof typeof workStatuses;
export type WorkFilter = { query?: string; source?: string; status?: string; page?: number };
export type WorkItem = {
  key: string; source: WorkSource; targetId: string; title: string; divisionId: string; agentId: string; managerId: string;
  status: WorkStatus; nativeStatus: string; goal: string; criteria: string; stage: string; reason: string; nextStep: string;
  updatedAt: string; versions: number; briefId?: string; decisionId?: string; executionId?: string;
  connection: { kind: 'local' | 'runtime' | 'online' | 'syncing' | 'disconnected' | 'stale' | 'partial'; label: string; detail: string };
};
const time = (date: string) => Date.parse(date) || 0;
const finished: WorkStatus[] = ['done', 'cancelled', 'rejected'];

// Read models only: source statuses, approvals and IDs are never rewritten to fit the list.
export function workItems(state: State, now = Date.now()): WorkItem[] {
  const items: WorkItem[] = [], productions = state.productions || [];
  for (const task of state.tasks) {
    if (state.productionTaskIds?.includes(task.id) || productions.some(p => p.taskId === task.id)) continue;
    const brief = state.briefs.find(b => b.id === task.briefId), division = state.divisions.find(d => d.id === brief?.divisionId);
    const decision = state.decisions.find(d => d.status === 'pending' && (d.type === 'plan' ? d.targetId === brief?.id : d.targetId === task.id));
    const revision = state.decisions.some(d => d.targetId === task.id && d.status === 'revision' && d.version === task.results.length && d.note === task.reason);
    let status: WorkStatus = task.status;
    if (task.status === 'queued' && brief?.status === 'draft') status = 'draft';
    else if (task.status === 'queued' && brief?.status === 'approval') status = 'approval';
    else if (task.status === 'paused' && revision) status = 'revision';
    const incident = state.incidents?.find(i => i.agentId === task.agentId && !i.resolvedAt);
    const session = state.facilitySessions?.find(s => s.status === 'active' && s.participantIds.includes(task.agentId));
    const other = state.tasks.find(t => t.agentId === task.agentId && t.id !== task.id && t.status === 'running');
    const nextStep = finished.includes(status) ? 'Hasil dan riwayat tetap dapat ditinjau.'
      : incident ? 'Catat pemulihan agent di ruang medis sebelum melanjutkan.'
      : decision ? decision.type === 'guidance' ? 'Founder perlu memberi arahan revisi atau menolak pekerjaan.' : decision.type === 'plan' ? 'Founder perlu meninjau rencana briefing.' : 'Founder perlu meninjau versi hasil yang diajukan.'
      : brief?.status === 'draft' ? 'Lengkapi briefing lalu ajukan rencana untuk disetujui.'
      : brief?.status !== 'approved' ? 'Periksa briefing; rencana belum disetujui.'
      : status === 'running' && state.runs?.some(r => r.taskId === task.id && r.status === 'running') ? 'AI sedang mengerjakan. Hasil akan menunggu pemeriksaan.'
      : status === 'running' ? 'Simpan hasil yang sudah dibuat untuk pemeriksaan.'
      : status === 'review' ? 'Periksa hasil terhadap kriteria briefing sebelum diajukan ke Founder.'
      : session ? 'Akhiri sesi fasilitas sebelum memulai pekerjaan.'
      : other ? 'Selesaikan atau jeda pekerjaan lain milik pelaksana ini.'
      : status === 'blocked' ? 'Lengkapi informasi yang diminta, lalu lanjutkan pekerjaan.'
      : status === 'revision' ? 'Ikuti arahan revisi, lalu mulai pekerjaan untuk versi baru.'
      : 'Mulai atau lanjutkan pekerjaan secara manual.';
    const run = state.runs?.find(r => r.taskId === task.id && r.status === 'running');
    const latest = state.events.filter(e => e.targetId === task.id || e.targetId === brief?.id).sort((a, b) => time(b.at) - time(a.at))[0];
    items.push({ key: `manual:${task.id}`, source: 'manual', targetId: task.id, title: task.title, divisionId: division?.id || brief?.divisionId || '', agentId: task.agentId, managerId: division?.managerId || '',
      status, nativeStatus: task.status, goal: brief?.goal || 'Briefing belum tersedia.', criteria: brief?.criteria || 'Kriteria belum tersedia.',
      stage: status === 'approval' ? decision?.type === 'plan' ? 'Persetujuan rencana' : decision?.type === 'guidance' ? 'Arahan Founder' : 'Persetujuan hasil' : workStatuses[status],
      reason: task.reason || '', nextStep, updatedAt: latest?.at || task.results.at(-1)?.createdAt || brief?.createdAt || '', versions: task.results.length, briefId: brief?.id, decisionId: decision?.id,
      connection: run ? { kind: 'runtime', label: `${run.provider} sedang bekerja`, detail: 'Run AI lokal. Hasil tetap menunggu pemeriksaan dan keputusan Founder.' }
        : { kind: 'local', label: 'Pencatatan lokal', detail: 'Status diperbarui manual atau melalui run AI yang dimulai Founder.' } });
  }
  for (const production of productions) {
    if (production.status === 'deleted') continue;
    const task = state.tasks.find(t => t.id === production.taskId), brief = state.briefs.find(b => b.id === task?.briefId), division = state.divisions.find(d => d.id === production.divisionId);
    const status: WorkStatus = production.status === 'review' ? 'approval' : production.status === 'approved' ? 'done' : production.status === 'blocked' ? 'failed' : production.status;
    items.push({ key: `production:${production.id}`, source: 'production', targetId: production.id, title: production.title, divisionId: production.divisionId,
      agentId: production.activeAgentId || task?.agentId || '', managerId: division?.managerId || '', status, nativeStatus: production.status,
      goal: brief?.goal || production.notes || 'Mengerjakan bahan unggahan sesuai SOP produksi.', criteria: brief?.criteria || 'Periksa preview, QC, dan versi terbaru sebelum menyetujui hasil.',
      stage: production.stage || workStatuses[status], reason: production.error || '', updatedAt: production.updatedAt || production.createdAt, versions: production.versions?.length || 0,
      nextStep: status === 'approval' ? 'Tonton preview versi terbaru dan periksa QC sebelum memberi keputusan.' : status === 'failed' ? 'Periksa alasan kendala dan bahan; coba ulang melalui halaman produksi.' : status === 'queued' ? 'Menunggu giliran runtime produksi.' : status === 'running' ? 'Pantau hasil tahap dan serah terima di percakapan produksi.' : 'Tinjau hasil, versi dan keputusan pada halaman produksi.',
      connection: { kind: 'runtime', label: 'Runtime produksi', detail: 'Codex / Remotion. Ketersediaan runtime diperiksa di halaman produksi; bukan disimpulkan dari gerak karakter.' } });
  }
  for (const binding of state.workflowBindings || []) {
    const agent = state.agents.find(a => a.id === binding.agentId), division = state.divisions.find(d => d.id === agent?.divisionId);
    const snapshot = state.n8n?.find(w => w.workflowId === binding.workflowId);
    const connection: WorkItem['connection'] = !snapshot || snapshot.connection === 'syncing' ? { kind: 'syncing', label: 'Menghubungkan', detail: 'Belum ada snapshot eksekusi.' }
      : snapshot.connection !== 'online' ? { kind: 'disconnected', label: 'Koneksi terputus', detail: 'Status pekerjaan berasal dari data terakhir; bukan bukti eksekusi gagal.' }
      : !Number.isFinite(Date.parse(snapshot.checkedAt)) || now - Date.parse(snapshot.checkedAt) > 20000 ? { kind: 'stale', label: 'Data kedaluwarsa', detail: 'Status eksekusi belum terkonfirmasi ulang.' }
      : snapshot.partial ? { kind: 'partial', label: 'Data sebagian', detail: 'Sebagian eksekusi belum dapat dipastikan.' }
      : { kind: 'online', label: 'Terhubung', detail: 'Monitoring n8n baca-saja; tidak menjalankan atau memperbaiki workflow.' };
    const recent = [...(snapshot?.recent || [])].sort((a, b) => time(b.stoppedAt || b.startedAt) - time(a.stoppedAt || a.startedAt));
    const execution: WorkflowExecution | undefined = snapshot?.running[0] || snapshot?.waiting[0] || recent[0];
    const nativeStatus = snapshot?.running.length ? 'running' : snapshot?.waiting.length ? 'waiting' : execution?.status || (connection.kind === 'online' ? snapshot?.active === false ? 'inactive' : 'idle' : 'unknown');
    const external: Record<string, WorkStatus> = { running: 'running', new: 'queued', waiting: 'waiting', success: 'done', error: 'failed', crashed: 'failed', canceled: 'cancelled', cancelled: 'cancelled', inactive: 'paused', idle: 'waiting' };
    const status = external[nativeStatus] || 'unknown';
    const incident = state.incidents?.find(i => i.agentId === binding.agentId && !i.resolvedAt);
    items.push({ key: `workflow:${binding.workflowId}`, source: 'workflow', targetId: binding.workflowId, title: binding.workflowName, divisionId: division?.id || '', agentId: binding.agentId, managerId: division?.managerId || '',
      status, nativeStatus, goal: 'Memantau eksekusi dan kendala workflow eksternal.', criteria: 'Hasil eksekusi mengikuti workflow sumber. Kael tidak memberi approval atas hasil n8n.',
      stage: snapshot?.running.length ? `${snapshot.running.length} eksekusi berjalan` : snapshot?.waiting.length ? `${snapshot.waiting.length} eksekusi menunggu` : execution ? `Eksekusi terakhir #${execution.id} · ${nativeStatus}` : nativeStatus === 'idle' ? 'Menunggu trigger' : nativeStatus === 'inactive' ? 'Workflow nonaktif' : 'Belum ada status terkonfirmasi',
      reason: execution?.error || (incident ? 'Insiden agent: ' + incident.reason : ''), updatedAt: execution?.stoppedAt || execution?.startedAt || '', versions: 0, executionId: execution?.id,
      nextStep: connection.kind !== 'online' ? 'Periksa koneksi dan kelengkapan snapshot; status eksekusi terakhir tetap dipertahankan.' : incident ? 'Tinjau insiden agent dan alasan error di ruang medis.' : status === 'failed' ? 'Periksa node dan pesan error pada riwayat workflow; perbaikan dilakukan di sistem sumber.' : 'Buka monitoring untuk melihat status asli dan riwayat eksekusi.', connection });
  }
  return items;
}

export function workList(state: State, filter: WorkFilter = {}, divisionId = '', now = Date.now()) {
  const all = workItems(state, now).filter(w => !divisionId || w.divisionId === divisionId);
  const terms = (filter.query || '').trim().toLocaleLowerCase('id').split(/\s+/).filter(Boolean);
  const order = ['failed', 'blocked', 'approval', 'review', 'revision', 'running', 'paused', 'queued', 'draft', 'waiting', 'unknown', 'done', 'rejected', 'cancelled'];
  const matches = all.filter(w => {
    const division = state.divisions.find(d => d.id === w.divisionId), agent = state.agents.find(a => a.id === w.agentId) || state.archivedAgents?.find(a => a.id === w.agentId), manager = state.agents.find(a => a.id === w.managerId);
    const text = `${w.title} ${division?.name || ''} ${division?.company || state.business.name} ${agent?.name || ''} ${agent?.role || ''} ${manager?.name || ''} ${w.stage} ${w.reason} ${w.nativeStatus} ${w.executionId || ''} ${workStatuses[w.status]}`.toLocaleLowerCase('id');
    return (!filter.source || filter.source === 'all' || filter.source === w.source) && (!filter.status || filter.status === 'all' || filter.status === w.status) && terms.every(t => text.includes(t));
  }).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || time(b.updatedAt) - time(a.updatedAt) || a.key.localeCompare(b.key));
  const pages = Math.max(1, Math.ceil(matches.length / 20));
  const page = Math.min(pages, Math.max(1, Number.isFinite(filter.page) ? Math.floor(filter.page!) : 1));
  return { items: matches.slice((page - 1) * 20, page * 20), total: matches.length, available: all.length, page, pages };
}
