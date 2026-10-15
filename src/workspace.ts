import type { State } from './domain';
import { workflowActivity } from './n8n.ts';

export function findDivisions(state: State, query: string) {
  const terms = query.trim().toLocaleLowerCase('id').split(/\s+/).filter(Boolean);
  return state.divisions.filter(d => {
    const text = `${d.name} ${d.company || state.business.name} ${state.agents.filter(a => a.divisionId === d.id).map(a => `${a.name} ${a.role}`).join(' ')}`.toLocaleLowerCase('id');
    return terms.every(term => text.includes(term));
  });
}

export function divisionTools(state: State) {
  const division = state.divisions[0];
  return { workflows: !!state.workflowBindings?.length,
    // shortcut: recap onboarding still follows the existing KaelaCH contract until SOP capabilities are configurable.
    production: !!division?.managerId && (/kaelach/i.test(division.name) || !!state.productions?.length) };
}

export function divisionOverview(state: State) {
  const productions = state.productions || [];
  const activeProductions = productions.filter(p => ['queued', 'running'].includes(p.status));
  const manualTasks = state.tasks.filter(t => t.status === 'running' && !productions.some(p => p.taskId === t.id));
  const bindings = state.workflowBindings || [];
  const snapshots = bindings.map(b => state.n8n?.find(w => w.workflowId === b.workflowId));
  const complete = snapshots.every(w => w?.connection === 'online' && Date.now() - Date.parse(w.checkedAt) <= 20000 && !w.partial);
  const workflowRunning = snapshots.reduce((sum, w) => sum + (w?.running.length || 0), 0);
  const activeCount = activeProductions.length + manualTasks.length + workflowRunning;
  const incidents = state.incidents?.filter(i => !i.resolvedAt).length || 0;
  const decisions = state.decisions.filter(d => d.status === 'pending').length;
  const blocked = productions.some(p => p.status === 'blocked') || state.tasks.some(t => t.status === 'blocked');
  if (incidents || blocked) return { kind: 'error', text: incidents ? `${incidents} agent perlu bantuan` : 'Pekerjaan terkendala', activeCount, complete };
  if (decisions || productions.some(p => p.status === 'review')) return { kind: 'review', text: 'Menunggu keputusan', activeCount, complete };
  if (!complete) return { kind: 'unknown', text: 'Status workflow belum lengkap', activeCount, complete };
  if (activeProductions.length) return { kind: 'running', text: activeProductions[0].stage || 'Produksi berjalan', activeCount, complete };
  if (workflowRunning) return { kind: 'running', text: `${workflowRunning} proses workflow berjalan`, activeCount, complete };
  if (manualTasks.length) return { kind: 'running', text: `${manualTasks.length} tugas sedang dikerjakan`, activeCount, complete };
  const queued = state.runs?.filter(r => r.status === 'queued').length || 0;
  if (queued) return { kind: 'queued', text: `${queued} tugas mengantre untuk AI`, activeCount, complete };
  if (bindings.length) return { kind: 'idle', text: workflowActivity(state, bindings[0].agentId)!.text, activeCount, complete };
  return { kind: 'idle', text: 'Belum ada pekerjaan berjalan', activeCount, complete };
}

// Keep every division workspace scoped, including decisions and external monitoring.
export function divisionState(state: State, divisionId: string): State {
  const agents = state.agents.filter(a => a.divisionId === divisionId), agentIds = new Set(agents.map(a => a.id));
  const briefs = state.briefs.filter(b => b.divisionId === divisionId), briefIds = new Set(briefs.map(b => b.id));
  const tasks = state.tasks.filter(t => briefIds.has(t.briefId)), taskIds = new Set(tasks.map(t => t.id));
  const automations = state.automations?.filter(v => v.divisionId === divisionId);
  const workflowBindings = state.workflowBindings?.filter(b => agentIds.has(b.agentId));
  return { ...state, automations, divisions: state.divisions.filter(d => d.id === divisionId), agents, briefs, tasks,
    decisions: state.decisions.filter(d => d.type === 'plan' ? briefIds.has(d.targetId) : taskIds.has(d.targetId)),
    workflowBindings, n8n: state.n8n?.filter(w => workflowBindings?.some(b => b.workflowId === w.workflowId)),
    productions: state.productions?.filter(p => p.divisionId === divisionId), productionTaskIds: state.productionTaskIds?.filter(id => taskIds.has(id)), incidents: state.incidents?.filter(i => agentIds.has(i.agentId)),
    sops: state.sops?.filter(v => v.divisionId === divisionId), agentSettings: state.agentSettings?.filter(v => agentIds.has(v.agentId)), runs: state.runs?.filter(v => taskIds.has(v.taskId)),
    archivedAgents: state.archivedAgents?.filter(a => a.divisionId === divisionId), divisionNotes: state.divisionNotes?.filter(n => n.divisionId === divisionId) };
}
