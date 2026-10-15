import type { State } from './domain';

export type WorkspaceNotification = { id: string; kind: 'error' | 'approval' | 'connection'; title: string; detail: string; action: 'incident' | 'decision' | 'production' | 'workflow' | 'task' | 'retry' | 'manager-request'; targetId: string; divisionId: string };

export function workspaceNotifications(state: State | null, connectionError = '', now = Date.now()): WorkspaceNotification[] {
  const notices: WorkspaceNotification[] = [];
  if (connectionError) notices.push({ id: 'local-connection', kind: 'connection', title: 'Workspace belum terhubung', detail: 'Coba hubungkan ulang. Data terakhir tetap ditampilkan.', action: 'retry', targetId: '', divisionId: '' });
  if (!state) return notices;
  const divisionName = (id: string) => state.divisions.find(d => d.id === id)?.name || 'Kantor';
  for (const request of state.managerRequests || []) if (['blocked', 'failed', 'interrupted'].includes(request.status)) notices.push({ id: 'manager-' + request.id, kind: 'error', title: request.status === 'blocked' ? 'Manager membutuhkan informasi' : 'Rencana manager perlu ditinjau', detail: `${divisionName(request.divisionId)} · ${request.title} · ${request.reason}`, action: 'manager-request', targetId: request.id, divisionId: request.divisionId });
  for (const incident of state.incidents || []) {
    if (incident.resolvedAt) continue;
    const agent = state.agents.find(a => a.id === incident.agentId), binding = state.workflowBindings?.find(b => b.agentId === incident.agentId);
    notices.push({ id: 'incident-' + incident.id, kind: 'error', title: `${agent?.name || (incident.agentId === 'nate' ? 'Nate' : 'Agent')} perlu pemulihan`, detail: `${divisionName(agent?.divisionId || '')} · ${binding?.workflowName || incident.reason}`, action: 'incident', targetId: incident.agentId, divisionId: agent?.divisionId || '' });
  }
  const productions = state.productions || [];
  for (const episode of productions) {
    if (!['review', 'blocked'].includes(episode.status)) continue;
    notices.push({ id: 'production-' + episode.id, kind: episode.status === 'review' ? 'approval' : 'error', title: episode.status === 'review' ? 'Preview menunggu approval' : 'Produksi perlu bantuan', detail: `${divisionName(episode.divisionId)} · ${episode.title}`, action: 'production', targetId: episode.id, divisionId: episode.divisionId });
  }
  for (const decision of state.decisions) {
    if (decision.status !== 'pending' || productions.some(p => p.taskId === decision.targetId)) continue;
    const brief = state.briefs.find(b => b.id === (decision.type === 'plan' ? decision.targetId : state.tasks.find(t => t.id === decision.targetId)?.briefId));
    notices.push({ id: 'decision-' + decision.id, kind: 'approval', title: decision.type === 'guidance' ? 'Tim membutuhkan arahan' : 'Menunggu approval kamu', detail: `${divisionName(brief?.divisionId || '')} · ${decision.title}`, action: 'decision', targetId: decision.id, divisionId: brief?.divisionId || '' });
  }
  for (const task of state.tasks) {
    if (productions.some(p => p.taskId === task.id) || state.productionTaskIds?.includes(task.id)) continue;
    const divisionId = state.briefs.find(b => b.id === task.briefId)?.divisionId || '';
    const lastRun = state.runs?.filter(r => r.taskId === task.id).at(-1);
    if (task.status === 'review' && task.results?.length) notices.push({ id: 'review-' + task.id, kind: 'approval', title: 'Hasil siap diperiksa', detail: `${divisionName(divisionId)} · ${task.title} · v${task.results.length}`, action: 'task', targetId: task.id, divisionId });
    else if (task.status === 'blocked') notices.push({ id: 'task-' + task.id, kind: 'error', title: 'Pekerjaan membutuhkan informasi', detail: `${divisionName(divisionId)} · ${task.title}`, action: 'task', targetId: task.id, divisionId });
    else if (task.status === 'paused' && lastRun && ['failed', 'interrupted'].includes(lastRun.status) && !state.incidents?.some(i => i.agentId === task.agentId && !i.resolvedAt)) notices.push({ id: 'run-' + lastRun.id, kind: 'error', title: lastRun.status === 'interrupted' ? 'Run AI terputus' : 'Run AI gagal', detail: `${divisionName(divisionId)} · ${task.title} · ${lastRun.error}`, action: 'task', targetId: task.id, divisionId });
  }
  for (const binding of state.workflowBindings || []) {
    const snapshot = state.n8n?.find(w => w.workflowId === binding.workflowId);
    const checked = Date.parse(snapshot?.checkedAt || '');
    if (snapshot?.connection === 'online' && Number.isFinite(checked) && now - checked <= 20000 && !snapshot.partial) continue;
    const divisionId = state.agents.find(a => a.id === binding.agentId)?.divisionId || '';
    notices.push({ id: 'connection-' + binding.workflowId, kind: 'connection', title: snapshot?.connection === 'disconnected' ? 'Koneksi n8n terputus' : 'Pantauan workflow belum lengkap', detail: `${divisionName(divisionId)} · ${binding.workflowName}`, action: 'workflow', targetId: binding.workflowId, divisionId });
  }
  const priority = { error: 0, approval: 1, connection: 2 };
  return notices.sort((a, b) => priority[a.kind] - priority[b.kind]);
}
