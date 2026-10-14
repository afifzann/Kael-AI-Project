import type { State } from './domain';

export type WorkflowBinding = { agentId: string; workflowId: string; workflowName: string; monitorFrom: string };
export type WorkflowExecution = { id: string; status: string; startedAt: string; stoppedAt: string; url: string; node?: string; error?: string; detailUnavailable?: boolean };
export type WorkflowSnapshot = { workflowId: string; workflowName?: string; active?: boolean; connection: 'online' | 'disconnected' | 'syncing'; checkedAt: string; error: string; running: WorkflowExecution[]; waiting: WorkflowExecution[]; recent: WorkflowExecution[]; partial: boolean; historyPartial?: boolean };

export type WorkflowHistoryFilter = { query?: string; status?: string; from?: string; to?: string; page?: number };
export function workflowHistory(snapshot: WorkflowSnapshot | undefined, filter: WorkflowHistoryFilter = {}) {
  const query = (filter.query || '').trim().toLocaleLowerCase('id');
  const all = [...(snapshot?.running || []), ...(snapshot?.waiting || []), ...(snapshot?.recent || [])]
    .filter((e, i, entries) => entries.findIndex(x => x.id === e.id) === i)
    .sort((a, b) => (Date.parse(b.startedAt) || 0) - (Date.parse(a.startedAt) || 0));
  const matches = all.filter(e => {
    const date = Number.isFinite(Date.parse(e.startedAt)) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(e.startedAt)) : '';
    return (!filter.status || filter.status === 'all' || (filter.status === 'failed' ? ['error', 'crashed'].includes(e.status) : e.status === filter.status))
      && (!query || `${e.id} ${e.node || ''} ${e.error || ''}`.toLocaleLowerCase('id').includes(query))
      && (!filter.from || !!date && date >= filter.from) && (!filter.to || !!date && date <= filter.to);
  });
  const pages = Math.max(1, Math.ceil(matches.length / 10));
  const page = Math.min(pages, Math.max(1, Math.floor(filter.page || 1)));
  return { executions: matches.slice((page - 1) * 10, page * 10), total: matches.length, available: all.length, page, pages };
}

export function workflowActivity(state: State, agentId: string) {
  const binding = state.workflowBindings?.find(b => b.agentId === agentId);
  if (!binding) return null;
  const snapshot = state.n8n?.find(w => w.workflowId === binding.workflowId);
  if (!snapshot || snapshot.connection === 'syncing') return { kind: 'offline', text: 'Menghubungkan n8n', typing: false, canWalk: false };
  if (snapshot.connection !== 'online' || !Number.isFinite(Date.parse(snapshot.checkedAt)) || Date.now() - Date.parse(snapshot.checkedAt) > 20000) return { kind: 'offline', text: 'Koneksi n8n terputus', typing: false, canWalk: false };
  if (snapshot.running.length) return { kind: 'running', text: `${snapshot.running.length} proses · n8n`, typing: true, canWalk: false };
  if (snapshot.partial) return { kind: 'offline', text: 'Data n8n belum lengkap', typing: false, canWalk: false };
  if (snapshot.waiting.length) return { kind: 'waiting', text: `${snapshot.waiting.length} proses menunggu · n8n`, typing: false, canWalk: snapshot.active !== false };
  if (snapshot.active === false) return { kind: 'paused', text: 'Workflow nonaktif · n8n', typing: false, canWalk: false };
  if (snapshot.recent[0]?.status === 'unknown') return { kind: 'offline', text: 'Status n8n belum dikenali', typing: false, canWalk: false };
  return { kind: 'idle', text: 'Menunggu trigger · n8n', typing: false, canWalk: true };
}

export function workflowManagerActivity(state: State, managerId: string) {
  const manager = state.agents.find(a => a.id === managerId);
  if (!manager?.manager || state.workflowBindings?.some(b => b.agentId === managerId)) return null;
  const bindings = (state.workflowBindings || []).filter(b => state.agents.some(a => a.id === b.agentId && a.divisionId === manager.divisionId));
  if (!bindings.length) return null;
  const failures = state.incidents?.filter(i => !i.resolvedAt && bindings.some(b => b.agentId === i.agentId)).length || 0;
  if (failures) return { kind: 'blocked', text: `${failures} agent perlu bantuan · n8n`, typing: false, canWalk: false };
  const snapshots = bindings.map(b => state.n8n?.find(w => w.workflowId === b.workflowId));
  if (snapshots.some(s => !s || s.connection !== 'online' || !Number.isFinite(Date.parse(s.checkedAt)) || Date.now() - Date.parse(s.checkedAt) > 20000 || s.partial || s.recent[0]?.status === 'unknown')) return { kind: 'offline', text: 'Pantauan n8n belum lengkap', typing: false, canWalk: false };
  const running = snapshots.reduce((n, s) => n + s!.running.length, 0), waiting = snapshots.reduce((n, s) => n + s!.waiting.length, 0);
  if (running) return { kind: 'running', text: `Memantau ${running} proses · n8n`, typing: false, canWalk: false };
  if (waiting) return { kind: 'waiting', text: `Memantau ${waiting} proses menunggu · n8n`, typing: false, canWalk: false };
  const inactive = snapshots.filter(s => s!.active === false).length;
  if (inactive) return { kind: 'paused', text: `${inactive} workflow nonaktif · n8n`, typing: false, canWalk: true };
  return { kind: 'idle', text: 'Tim terpantau · n8n', typing: false, canWalk: true };
}

// External runs remain in n8n; medical records only mark local attention, never stop/retry a run.
export function newWorkflowFailure(state: State, snapshot: WorkflowSnapshot) {
  const binding = state.workflowBindings?.find(b => b.workflowId === snapshot.workflowId);
  if (!binding || snapshot.connection !== 'online' || state.incidents?.some(i => i.agentId === binding.agentId && !i.resolvedAt)) return null;
  const recorded = (state.incidents || []).filter(i => i.agentId === binding.agentId && i.executionId);
  const firstConnection = !state.incidents?.some(i => i.agentId === binding.agentId);
  const completed = snapshot.recent.filter(e => !['new', 'running', 'waiting'].includes(e.status))
    .sort((a, b) => Date.parse(b.stoppedAt || b.startedAt) - Date.parse(a.stoppedAt || a.startedAt));
  // First connection also surfaces the latest failed outcome; explicit recovery prevents historical replay.
  const failed = completed.find(e => ['error', 'crashed'].includes(e.status)
    && Number.isFinite(Date.parse(e.stoppedAt || e.startedAt))
    && (Date.parse(e.stoppedAt || e.startedAt) >= Date.parse(binding.monitorFrom) || firstConnection && e.id === completed[0]?.id)
    && !recorded.some(i => i.executionId === e.id));
  return failed ? { binding, execution: failed } : null;
}
