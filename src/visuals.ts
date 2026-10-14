import { workflowActivity, workflowManagerActivity } from './n8n.ts';
import type { State } from './domain';
import { builderAgent, builderActivity } from './builder-room.ts';

// Decorative hardware pulse, never a connection or execution indicator.
export function serverIndicatorIntensity(time: number, index: number, still = false) {
  return still ? .65 : .45 + .85 * (.5 + .5 * Math.sin(time * (2.1 + index % 5 * .13) + index * 2.4)) ** 8;
}

export function divisionTheme(name: string, role = ''): 'knowledge' | 'trading' | 'design' | 'content' | 'code' | 'research' | 'tasks' {
  const text = `${name} ${role}`.toLowerCase();
  if (/obsidian|knowledge|pengetahuan/.test(text)) return 'knowledge';
  if (/trad|crypto|forex|saham|invest|finance|keuangan/.test(text)) return 'trading';
  if (/thumbnail|design|desain|visual|brand/.test(text)) return 'design';
  if (/youtube|channel|chanel|konten|content|video|naskah/.test(text)) return 'content';
  if (/builder|develop|engineer|code|coding|program|software/.test(text)) return 'code';
  if (/riset|research|data|analis/.test(text)) return 'research';
  return 'tasks';
}
export function characterLook(division: string, agent: { name: string; role: string; manager: boolean }, ordinal = 0) {
  const seed = [...`${division}/${agent.name}/${agent.role}`].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
  const i = Math.max(0, ordinal), theme = divisionTheme(division, agent.role);
  const shells = ['#3a6263', '#f3efe0', '#5e646e', '#70665a'];
  const accents = ['#00c2ce', '#d4af37', '#c822bb'];
  const founder = division === 'Founder';
  const color = founder ? '#1c1c1e' : agent.manager ? '#2d3238' : shells[i % shells.length];
  const accent = founder || agent.manager ? '#d4af37' : accents[Math.floor(i / shells.length) % accents.length];
  const name = founder ? 'charcoal' : agent.manager ? 'graphite gold' : ['teal', 'porcelain', 'slate', 'taupe'][i % shells.length];
  return { seed, theme, model: 'robot' as const, manager: agent.manager, color, accent, description: `Robot ${name} · Ear pods · ${agent.manager ? 'Manager insignia' : 'LED visor'}` };
}

export function agentActivity(state: State, agent: State['agents'][number]) {
  if (agent.id === builderAgent.id) return builderActivity(state.builderChat);
  if (state.incidents?.some(i => i.agentId === agent.id && !i.resolvedAt)) return { kind: 'error', text: 'Error · Perlu pemulihan', typing: false, canWalk: false };
  const desktop = state.officeSessions?.find(s => s.agentId === agent.id && s.phase === 'working' && Date.now() - Date.parse(s.updatedAt) < 120000);
  if (desktop) return { kind: 'running', text: `Sesi ${desktop.client} · ${agent.manager ? 'Manager' : 'Bekerja'}`, typing: true, canWalk: false };
  const workflow = workflowActivity(state, agent.id); if (workflow) return workflow;
  if (agent.id === 'nate' && agent.divisionId === 'server') return { kind: 'offline', text: 'Menunggu Obsidian', typing: false, canWalk: true };
  const session = state.facilitySessions?.find(s => s.status === 'active' && s.participantIds.includes(agent.id));
  if (session) return { kind: 'facility', text: session.purpose === 'break' ? 'Istirahat' : session.purpose === 'review' ? 'Meeting review' : 'Briefing tim', typing: false, canWalk: false };
  const supervision = workflowManagerActivity(state, agent.id); if (supervision) return supervision;
  const production = state.productions?.find(p => p.activeAgentId === agent.id);
  if(production) return {kind:'running',text:production.stage+' · Codex',typing:true,canWalk:false};
  if(agent.manager && state.productions?.some(p=>p.divisionId===agent.divisionId&&p.status==='running'))return {kind:'running',text:'Koordinasi produksi',typing:false,canWalk:false};
  const delegated = new Set(state.productions?.filter(p=>p.status==='running').map(p=>p.taskId)||[]);
  const tasks = (agent.manager ? state.tasks.filter(t => state.agents.some(a => a.id === t.agentId && a.divisionId === agent.divisionId)) : state.tasks.filter(t => t.agentId === agent.id)).filter(t=>!delegated.has(t.id));
  if (agent.manager && tasks.some(t => t.status === 'review')) return { kind: 'review', text: 'Review hasil · Manual', typing: true, canWalk: false };
  const run = state.runs?.find(r => r.agentId === agent.id && r.status === 'running');
  if (run) return { kind: 'running', text: `Bekerja · ${run.provider}`, typing: true, canWalk: false };
  if (!tasks.some(t => t.status === 'running') && state.runs?.some(r => r.agentId === agent.id && r.status === 'queued')) return { kind: 'queued', text: 'Antrean AI', typing: false, canWalk: false };
  for (const [status, text] of [['running', agent.manager ? 'Koordinasi · Manual' : 'Bekerja · Manual'], ['blocked', 'Butuh informasi'], ['review', 'Menunggu review'], ['approval', 'Menunggu Founder'], ['paused', 'Dijeda'], ['queued', 'Dalam antrean']] as const) {
    if (tasks.some(t => t.status === status)) return { kind: status, text, typing: status === 'running' && !agent.manager, canWalk: false };
  }
  if (agent.manager && state.briefs.some(b => b.divisionId === agent.divisionId && b.status === 'approval')) return { kind: 'approval', text: 'Rencana → Founder', typing: false, canWalk: false };
  return { kind: 'idle', text: 'Santai · Simulasi', typing: false, canWalk: true };
}
