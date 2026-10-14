import type { State } from './domain';
import { workItems } from './work.ts';

export function resultList(state: State, query = '', requestedPage = 1) {
  const terms = query.trim().toLocaleLowerCase('id').split(/\s+/).filter(Boolean);
  const all = workItems(state).filter(w => w.source !== 'workflow' && w.versions > 0);
  const matches = all.filter(w => {
    const division = state.divisions.find(d => d.id === w.divisionId), agent = state.agents.find(a => a.id === w.agentId) || state.archivedAgents?.find(a => a.id === w.agentId);
    const text = `${w.title} ${division?.name || ''} ${division?.company || state.business.name} ${agent?.name || ''}`.toLocaleLowerCase('id');
    return terms.every(term => text.includes(term));
  }).sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) || a.key.localeCompare(b.key));
  const pages = Math.max(1, Math.ceil(matches.length / 20));
  const page = Math.min(pages, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  return { items: matches.slice((page - 1) * 20, page * 20), total: matches.length, available: all.length, page, pages };
}

export function decisionContext(state: State, id: string) {
  const decision = state.decisions.find(d => d.id === id);
  if (!decision) return null;
  const task = decision.type === 'plan' ? undefined : state.tasks.find(t => t.id === decision.targetId);
  const brief = state.briefs.find(b => b.id === (decision.type === 'plan' ? decision.targetId : task?.briefId));
  const result = task?.results.find(r => r.version === decision.version);
  const production = state.productions?.find(p => p.taskId === task?.id && p.status !== 'deleted');
  const archived = !!task && !production && !!state.productionTaskIds?.includes(task.id);
  const current = !!brief && (decision.type === 'plan' ? brief.status === 'approval' : !!task && !!result && task.status === 'approval' && task.results.length === decision.version);
  const canDecide = decision.status === 'pending' && current && !production && !archived;
  const readOnlyReason = decision.status !== 'pending' ? 'Keputusan ini sudah dijawab. Catatan dan versi aslinya tetap tersimpan.'
    : archived ? 'Produksi telah diarsipkan; keputusan tidak dapat diberikan lewat tugas manual.'
    : production ? 'Tinjau preview dan QC pada halaman produksi untuk memberi keputusan.'
    : !current ? 'Rencana atau versi hasil sudah berubah / tidak tersedia. Buka pekerjaan terbaru sebelum mengambil keputusan.' : '';
  return { decision, task, brief, result, production, canDecide, readOnlyReason };
}

export function canReviseResult(state: State, taskId: string) {
  const task = state.tasks.find(t => t.id === taskId);
  return !!task && task.results.length > 0 && state.agents.some(a => a.id === task.agentId) && state.briefs.some(b => b.id === task.briefId && b.status === 'approved')
    && !state.productionTaskIds?.includes(taskId) && !state.productions?.some(p => p.taskId === taskId)
    && ['review', 'approval', 'done', 'paused', 'blocked', 'cancelled'].includes(task.status);
}
