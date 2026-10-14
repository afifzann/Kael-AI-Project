export const workspaceViews = ['home', 'activity', 'tasks', 'decisions', 'team', 'business', 'builder', 'workflows', 'production', 'division', 'briefs', 'office'] as const;
export type WorkspaceView = typeof workspaceViews[number];
export const divisionSections = ['overview', 'work', 'members', 'chat', 'results', 'setup'] as const;
export type DivisionSection = typeof divisionSections[number];
export type WorkspaceRoute = { view: WorkspaceView; divisionId?: string; section?: DivisionSection; roomId?: string; episodeId?: string; tab?: string; version?: number; workflowId?: string; query?: string; source?: string; status?: string; page?: number };
const divisionViews: WorkspaceView[] = ['division', 'production', 'workflows', 'tasks', 'briefs', 'decisions', 'activity'];

export function readRoute(hash: string): WorkspaceRoute {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const view = params.get('view') as WorkspaceView;
  const id = (key: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(params.get(key) || '') ? params.get(key)! : '';
  const version = Number(params.get('version'));
  const section = params.get('section') as DivisionSection;
  const work = view === 'activity' || view === 'division' && section === 'work';
  const page = Number(params.get('page'));
  return { view: workspaceViews.includes(view) ? view : 'home', divisionId: divisionViews.includes(view) ? id('division') : '', section: view === 'division' && divisionSections.includes(section) ? section : 'overview', roomId: id('room'), episodeId: id('episode'),
    tab: ['preview', 'chat', 'files'].includes(params.get('tab') || '') ? params.get('tab')! : 'preview',
    version: Number.isSafeInteger(version) && version > 0 ? version : 0, workflowId: id('workflow'),
    query: work ? (params.get('query') || '').trim().slice(0, 160) : '',
    source: work && Object.hasOwn(workSources, params.get('source') || '') ? params.get('source')! : 'all',
    status: work && Object.hasOwn(workStatuses, params.get('status') || '') ? params.get('status')! : 'all',
    page: work && Number.isSafeInteger(page) && page > 0 ? page : 1 };
}

export function routeHash(route: WorkspaceRoute) {
  const params = new URLSearchParams({ view: route.view });
  if (route.view === 'office') { if (route.roomId) params.set('room', route.roomId); }
  else {
    if (route.divisionId && divisionViews.includes(route.view)) params.set('division', route.divisionId);
    if (route.view === 'division' && route.divisionId && route.section && route.section !== 'overview' && divisionSections.includes(route.section)) params.set('section', route.section);
    if (route.view === 'production') {
      if (route.episodeId) params.set('episode', route.episodeId);
      if (route.tab && route.tab !== 'preview') params.set('tab', route.tab);
      if (route.version) params.set('version', String(route.version));
    }
    if (route.view === 'workflows' && route.workflowId) params.set('workflow', route.workflowId);
    if (route.view === 'activity' || route.view === 'division' && route.divisionId && route.section === 'work') {
      if (route.query?.trim()) params.set('query', route.query.trim().slice(0, 160));
      if (route.source && Object.hasOwn(workSources, route.source)) params.set('source', route.source);
      if (route.status && Object.hasOwn(workStatuses, route.status)) params.set('status', route.status);
      if (Number.isSafeInteger(route.page) && route.page! > 1) params.set('page', String(route.page));
    }
  }
  return '#' + params.toString();
}
import { workSources, workStatuses } from './work.ts';

