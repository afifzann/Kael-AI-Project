import { contextFor, isWorkflowDivision, latestSop, memberName, agentProviders, activeRun, runnableProviders } from './domain';
import type { State, Task, Command, Decision } from './domain';
import './operations.css';
import { workflowDashboard } from './workflows';
import { agentActivity } from './visuals';
import { createBuilder } from './builder';
import { createProductionUI } from './production';
import { facilityLayouts } from './layout';
import { serverAgent, medicalPatients } from './facilities';
import { divisionState, divisionOverview, findDivisions, divisionTools } from './workspace';
import { workflowActivity, type WorkflowHistoryFilter } from './n8n';
import { readRoute, routeHash, divisionSections, type DivisionSection, type WorkspaceRoute } from './routes';
import { builderAgent, builderChatLink, builderSession, builderActivity, type BuilderPresence } from './builder-room';
import { icon } from './ui-icons';
import { workspaceNotifications, type WorkspaceNotification } from './notifications';
import { workItems, workList, workSources, workStatuses, type WorkItem, type WorkFilter } from './work';
import { resultList, decisionContext, canReviseResult } from './results';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const stamp = (value: string) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : 'Tanggal belum tersedia';
const statuses: Record<string, string> = { queued: 'Antrean', running: 'Dikerjakan', blocked: 'Butuh informasi', paused: 'Dijeda', review: 'Perlu pemeriksaan', approval: 'Menunggu keputusan', pending: 'Menunggu keputusan', done: 'Selesai', cancelled: 'Dibatalkan', draft: 'Draft', approved: 'Disetujui', rejected: 'Ditolak', revision: 'Minta revisi' };
const badge = (status: string) => `<span class="op-badge badge-${status}">${esc(statuses[status] || status)}</span>`;
const button = (text: string, action: string, id = '', primary = false) => `<button class="op-button${primary ? ' primary' : ''}" data-action="${action}" data-id="${esc(id)}">${text}</button>`;
const empty = (title: string, copy: string, action = '') => `<div class="op-empty"><span class="empty-symbol">◇</span><h3>${title}</h3><p>${copy}</p>${action}</div>`;
type View = Exclude<WorkspaceRoute['view'], 'office'>;
const views: [View, string, string][] = [['home', 'Ringkasan', 'summary'], ['activity', 'Pekerjaan', 'tasks'], ['production', 'Produksi', 'layers'], ['tasks', 'Tugas manual', 'tasks'], ['workflows', 'Workflow n8n', 'workflow'], ['briefs', 'Briefing', 'brief'], ['decisions', 'Keputusan', 'decisions'], ['team', 'Divisi', 'team'], ['business', 'Pengaturan', 'settings'], ['builder', 'Builder', 'builder'], ['division', 'Ruang kerja divisi', 'office']];
const sectionLabels: Record<DivisionSection, string> = { overview: 'Ringkasan', work: 'Pekerjaan', members: 'Anggota', chat: 'Percakapan', results: 'Hasil', setup: 'SOP & integrasi' };

export function mountOperations() {
  const officeMain = document.querySelector<HTMLElement>('.main')!;
  const workspace = document.querySelector<HTMLElement>('.workspace')!;
  const sidebar = document.querySelector<HTMLElement>('.sidebar')!;
  const nav = document.createElement('button'); nav.className = 'control-nav'; nav.innerHTML = icon('summary') + '<span class="nav-label">Ringkasan</span><b id="decision-count" hidden>0</b>'; nav.setAttribute('aria-label', 'Buka ringkasan');
  sidebar.insertBefore(nav, sidebar.querySelector('#overview'));
  const sectionNav = document.createElement('nav'); sectionNav.className = 'section-nav'; sectionNav.setAttribute('aria-label', 'Navigasi workspace');
  const navItem = ([key, title, mark]: [View, string, string]) => `<button data-go="${key}">${icon(mark)}<span class="nav-label">${key === 'activity' ? 'Pekerjaan' : title}</span>${key === 'builder' ? '<kbd>/</kbd>' : ''}${key === 'decisions' ? '<b id="decision-menu-count" hidden>0</b>' : ''}</button>`;
  sectionNav.innerHTML = views.filter(([key]) => ['team', 'activity'].includes(key)).map(navItem).join('') + `<details class="mobile-more"><summary>${icon('layers')}<span>Lainnya</span></summary><div class="mobile-menu">${views.filter(([key]) => ['decisions'].includes(key)).map(navItem).join('')}<div class="nav-tools">${views.filter(([key]) => key === 'builder').map(navItem).join('')}<details class="manual-navigation"><summary>Alat kerja <span>⌄</span></summary><div>${views.filter(([key]) => ['workflows', 'briefs', 'tasks'].includes(key)).map(navItem).join('')}</div></details></div>${views.filter(([key]) => key === 'business').map(navItem).join('')}</div></details>`;
  sidebar.querySelector('#overview')!.after(sectionNav);
  const more = sectionNav.querySelector<HTMLDetailsElement>('.mobile-more')!;
  const moreMenu = more.querySelector('.mobile-menu')!;
  sidebar.querySelectorAll('.office-navigation').forEach(e => moreMenu.append(e));
  moreMenu.append(sectionNav.querySelector('[data-go="business"]')!);
  const desktop = matchMedia('(min-width:701px)');
  more.open = desktop.matches; desktop.addEventListener('change', () => more.open = desktop.matches);
  document.addEventListener('pointerdown', event => { if (!desktop.matches && more.open && !more.contains(event.target as Node)) more.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !desktop.matches && more.open) { more.open = false; more.querySelector<HTMLElement>('summary')?.focus(); } });
  const host = document.createElement('main'); host.className = 'operations'; host.id = 'operations'; officeMain.after(host);
  host.tabIndex = -1; officeMain.tabIndex = -1;
  document.querySelector<HTMLButtonElement>('#skip-content')!.onclick = () => { const content = host.hidden ? officeMain : host; content.focus({ preventScroll: true }); content.scrollIntoView({ block: 'start' }); };
  const dialog = document.createElement('dialog'); dialog.className = 'op-dialog'; document.body.append(dialog);
  const toast = document.createElement('div'); toast.className = 'op-toast'; toast.setAttribute('role', 'status'); document.body.append(toast);
  const initialRoute = readRoute(location.hash);
  let workFilter: WorkFilter = { query: initialRoute.query, source: initialRoute.source, status: initialRoute.status, page: initialRoute.page };
  let resultQuery = '', resultPage = 1;
  let restoringRoute = true;
  let state: State | null = null, view: View = initialRoute.view === 'office' ? 'home' : initialRoute.view, filter = 'all', busy = false, error = '', toastTimer: ReturnType<typeof setTimeout>;
  const notifications = document.createElement('details'); notifications.className = 'header-notifications';
  notifications.innerHTML = `<summary aria-label="Notifikasi" title="Notifikasi">${icon('bell')}<span class="notification-count" hidden></span></summary><section class="notification-panel" aria-label="Pemberitahuan workspace"><div class="notification-heading"><div><strong>Notifikasi</strong><span>Hal yang perlu kamu tindak lanjuti</span></div><button type="button" class="notification-close" aria-label="Tutup notifikasi">${icon('close')}</button></div><div class="notification-list"></div><p class="notification-footer">Otomatis diperbarui · Hilang setelah ditindaklanjuti</p></section>`;
  document.querySelector('.header-right')!.prepend(notifications);
  const notificationSummary = notifications.querySelector<HTMLElement>('summary')!;
  const notificationList = notifications.querySelector<HTMLElement>('.notification-list')!;
  const notificationAnnouncement = document.createElement('span'); notificationAnnouncement.className = 'notification-announcement'; notificationAnnouncement.setAttribute('role', 'status'); notificationAnnouncement.setAttribute('aria-atomic', 'true'); notifications.after(notificationAnnouncement);
  let notificationItems: WorkspaceNotification[] = [], notificationSignature = '';
  const closeNotifications = (focus = false) => { notifications.open = false; if (focus) notificationSummary.focus(); };
  notifications.querySelector('button')!.addEventListener('click', () => closeNotifications(true));
  document.addEventListener('pointerdown', event => { if (notifications.open && !notifications.contains(event.target as Node)) closeNotifications(); });
  notifications.addEventListener('focusout', event => { if (event.relatedTarget && !notifications.contains(event.relatedTarget as Node)) closeNotifications(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && notifications.open) { event.preventDefault(); closeNotifications(true); } });
  function renderNotifications() {
    notificationItems = workspaceNotifications(state, error);
    const signature = JSON.stringify({ connected: !!state, items: notificationItems }); if (signature === notificationSignature) return;
    notificationSignature = signature;
    const focusedId = notificationList.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.notification : '';
    const count = notifications.querySelector<HTMLElement>('.notification-count')!;
    count.hidden = !notificationItems.length; count.textContent = notificationItems.length > 99 ? '99+' : String(notificationItems.length);
    count.setAttribute('aria-hidden', 'true');
    notificationSummary.setAttribute('aria-label', `Notifikasi, ${notificationItems.length} perlu ditindaklanjuti`);
    notificationAnnouncement.textContent = state || error ? `${notificationItems.length} pemberitahuan perlu ditindaklanjuti` : '';
    notificationList.innerHTML = notificationItems.length ? notificationItems.map(n => `<button type="button" class="notification-row" data-kind="${n.kind}" data-notification="${esc(n.id)}"><span class="notification-symbol">${icon(n.kind === 'error' ? 'alert' : n.kind === 'approval' ? 'decisions' : 'workflow')}</span><span><strong>${esc(n.title)}</strong><small>${esc(n.detail)}</small></span>${icon('arrow')}</button>`).join('') : `<div class="notification-empty">${icon('decisions')}<strong>${state ? 'Semua sudah ditinjau' : 'Menghubungkan workspace…'}</strong><p>Error dan permintaan approval akan muncul di sini.</p></div>`;
    if (focusedId) (notificationList.querySelector<HTMLElement>(`[data-notification="${CSS.escape(focusedId)}"]`) || notificationSummary).focus({ preventScroll: true });
  }
  function activateNotification(item: WorkspaceNotification) {
    if (busy) return;
    closeNotifications();
    if (item.action === 'retry') { void load(); return; }
    if (!state) return;
    if (item.action === 'incident') { enterRoom('meeting-alt'); healthModal(item.targetId); return; }
    if (item.action === 'production') { openProduction(item.targetId); return; }
    selectedDivisionId = item.divisionId;
    if (item.action === 'workflow') { selectedWorkflowId = item.targetId; view = 'workflows'; showOperations(); }
    else if (item.action === 'decision') { view = 'decisions'; showOperations(); decisionDetail(item.targetId); }
    else { view = 'tasks'; showOperations(); taskDetail(item.targetId); }
    window.scrollTo(0, 0);
  }
  notificationList.addEventListener('click', event => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-notification]')?.dataset.notification;
    const item = notificationItems.find(n => n.id === id); if (item) activateNotification(item);
  });
  const workflowFilters: Record<string, WorkflowHistoryFilter> = {};
  let selectedWorkflowId = initialRoute.workflowId || '';
  let modalSubmit: ((data: FormData) => Promise<void>) | null = null;
  let modalAction: ((action: string) => void) | null = null;
  function syncBuilder(presence: BuilderPresence) {
    if (!state) return;
    state = { ...state, builderChat: presence };
    window.dispatchEvent(new CustomEvent('kael:state', { detail: state }));
    if (activeRoomId === 'builder') renderFacility();
  }
  let teamQuery = '', divisionSection: DivisionSection = initialRoute.section || 'overview', activeRoomId = initialRoute.roomId || 'all', selectedDivisionId = initialRoute.divisionId || '';
  const builder = createBuilder(command, notify, () => state);
  const productionUI = createProductionUI(() => state && selectedDivisionId ? divisionState(state, selectedDivisionId) : state, notify, replace => {
    writeRoute(replace);
    if (view === 'production') {
      const tab = productionUI.selection().tab, section = tab === 'chat' ? 'chat' : tab === 'files' ? 'results' : 'work';
      host.querySelectorAll<HTMLElement>('[data-section]').forEach(b => { if (b.closest('.division-tabs')) { if (b.dataset.section === section) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } });
    }
  });
  productionUI.select(initialRoute.episodeId || '', initialRoute.tab, initialRoute.version);
  function writeRoute(replace = false) {
    if (restoringRoute) return;
    const route: WorkspaceRoute = host.hidden ? { view: 'office', roomId: activeRoomId } : { view, divisionId: selectedDivisionId,
      ...(view === 'division' ? { section: divisionSection } : {}), ...(view === 'activity' || view === 'division' && divisionSection === 'work' ? workFilter : {}), ...(view === 'production' ? productionUI.selection() : {}), ...(view === 'workflows' ? { workflowId: selectedWorkflowId } : {}) };
    const hash = routeHash(route);
    if (location.hash === hash) return;
    if (replace) history.replaceState(history.state, '', hash);
    else { history.replaceState({ ...history.state, scrollY: window.scrollY }, ''); history.pushState({ scrollY: 0 }, '', hash); }
  }
  function restoreRoute() {
    if (!state) return;
    const route = readRoute(location.hash);
    restoringRoute = true;
    selectedDivisionId = state.divisions.some(d => d.id === route.divisionId) ? route.divisionId! : '';
    divisionSection = route.section || 'overview';
    workFilter = { query: route.query, source: route.source, status: route.status, page: route.page };
    selectedWorkflowId = (state.workflowBindings || []).some(b => b.workflowId === route.workflowId && (!selectedDivisionId || state!.agents.some(a => a.id === b.agentId && a.divisionId === selectedDivisionId))) ? route.workflowId! : '';
    productionUI.select(route.episodeId || '', route.tab, route.version);
    view = route.view === 'office' || route.view === 'division' && !selectedDivisionId ? 'home' : route.view;
    if (route.view === 'office') { window.dispatchEvent(new CustomEvent('kael:state', { detail: state })); enterRoom(['all', 'founder', ...facilityLayouts.map(r => r.id), ...state.divisions.map(d => d.id)].includes(route.roomId || '') ? route.roomId! : 'all'); }
    else showOperations();
    restoringRoute = false; writeRoute(true);
  }
  window.addEventListener('popstate', () => { if (!busy && dialog.open) dialog.close(); restoreRoute(); window.scrollTo(0, history.state?.scrollY || 0); });
  window.addEventListener('hashchange', () => { if (location.hash !== routeHash(host.hidden ? { view: 'office', roomId: activeRoomId } : { view, divisionId: selectedDivisionId, ...(view === 'division' ? { section: divisionSection } : {}), ...(view === 'activity' || view === 'division' && divisionSection === 'work' ? workFilter : {}), ...(view === 'production' ? productionUI.selection() : {}), ...(view === 'workflows' ? { workflowId: selectedWorkflowId } : {}) })) restoreRoute(); });
  function notify(message: string) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 5500); }
  window.addEventListener('kael:notice', event => notify((event as CustomEvent<string>).detail));
  window.addEventListener('kael:health', event => healthModal((event as CustomEvent<string>).detail));
  function showOffice() {
    closeNotifications();
    host.hidden = true; officeMain.hidden = false; workspace.classList.remove('operations-active'); nav.removeAttribute('aria-current');
    sectionNav.querySelectorAll('button').forEach(b => b.removeAttribute('aria-current'));
    sidebar.querySelectorAll<HTMLElement>('[data-room],#overview').forEach(b => { if ((b.dataset.room || 'all') === activeRoomId) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.querySelector('.prototype')!.innerHTML = '<i></i> Simulasi 3D'; document.querySelector('#page-crumb')!.textContent = 'Kantor virtual';
    if (!desktop.matches) more.open = false;
    writeRoute();
  }
  function showOperations() {
    closeNotifications();
    window.dispatchEvent(new Event('kael:close-profile'));
    officeMain.hidden = true; host.hidden = false; workspace.classList.add('operations-active');
    sidebar.querySelectorAll<HTMLDetailsElement>('.office-navigation').forEach(group => group.open = false);
    sidebar.querySelectorAll('[data-room],#overview').forEach(b => b.removeAttribute('aria-current'));
    document.querySelector('.prototype')!.innerHTML = '<i></i> Workspace lokal'; render();
    if (!desktop.matches) more.open = false;
  }
  nav.onclick = () => { selectedDivisionId = ''; view = 'home'; showOperations(); window.scrollTo(0, 0); };
  window.addEventListener('kael:view', event => { const next = (event as CustomEvent<View>).detail; if (!views.some(([id]) => id === next)) return; selectedDivisionId = ''; view = next; showOperations(); window.scrollTo(0, 0); });
  window.addEventListener('kael:division-workspace', event => openDivision((event as CustomEvent<string>).detail));
  sidebar.addEventListener('click', event => { const target = (event.target as HTMLElement).closest<HTMLElement>('[data-go]'); if (target) { selectedDivisionId = ''; selectedWorkflowId = ''; view = target.dataset.go as View; showOperations(); window.scrollTo(0, 0); } });
  function openDivision(id: string) { if (!state?.divisions.some(d => d.id === id)) return; selectedDivisionId = id; selectedWorkflowId = ''; divisionSection = 'overview'; workFilter = {}; resultQuery = ''; resultPage = 1; view = 'division'; showOperations(); window.scrollTo(0, 0); }
  function openDivisionSection(section: DivisionSection) {
    if (!state || !selectedDivisionId || !divisionSections.includes(section)) return;
    const scoped = divisionState(state, selectedDivisionId), tools = divisionTools(scoped);
    divisionSection = section; selectedWorkflowId = ''; view = 'division';
    if (section === 'work') workFilter.page = 1;
    else if (section === 'results') resultPage = 1;
    else if (tools.production && section === 'chat') {
      view = 'production';
      const current = productionUI.selection(), episode = scoped.productions?.find(p => p.id === current.episodeId);
      productionUI.select(episode?.id || scoped.productions?.[0]?.id || '', 'chat', episode ? current.version : 0);
    }
    render(); window.scrollTo(0, 0);
  }
  function openProduction(id: string, version = 0) {
    const episode = state?.productions?.find(p => p.id === id); if (!episode) return;
    selectedDivisionId = episode.divisionId; productionUI.select(id, 'preview', version); view = 'production'; showOperations(); window.scrollTo(0, 0);
  }
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || dialog.open || (event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
    event.preventDefault(); selectedDivisionId = ''; view = 'builder'; showOperations(); window.scrollTo(0, 0);
  });
  function enterRoom(id: string) {
    activeRoomId = id;
    showOffice();
    const roomButton = [...sidebar.querySelectorAll<HTMLElement>('[data-room]')].find(b => b.dataset.room === id);
    const roomGroup = roomButton?.closest<HTMLDetailsElement>('.office-navigation'); if (roomGroup) roomGroup.open = window.innerWidth > 700;
    const division = state?.divisions.find(d => d.id === id);
    const facility = facilityLayouts.find(r => r.id === id);
    const name = id === 'all' ? 'Kantor kita' : division?.name || facility?.name || 'Founder office';
    const count = id === 'all' ? (state?.agents.length || 0) + 4 : division ? state!.agents.filter(a => a.divisionId === id).length : id === 'server' || id === 'builder' ? 1 : facility ? 0 : 1;
    window.dispatchEvent(new CustomEvent('kael:room', { detail: { id, name, count } }));
    renderFacility();
    sidebar.querySelectorAll('[data-room]').forEach(b => { if ((b as HTMLElement).dataset.room === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  document.querySelector('.room-nav')!.addEventListener('click', () => enterRoom('founder'));
  document.querySelector('#overview')!.addEventListener('click', () => enterRoom('all'));
  document.querySelector('#division-rooms')!.addEventListener('click', event => { const b = (event.target as HTMLElement).closest<HTMLElement>('[data-room]'); if (b) enterRoom(b.dataset.room!); });
  document.querySelector('#facility-rooms')!.addEventListener('click', event => { const b = (event.target as HTMLElement).closest<HTMLElement>('[data-room]'); if (b) enterRoom(b.dataset.room!); });
  window.addEventListener('kael:select-room', event => enterRoom((event as CustomEvent<string>).detail));
  window.addEventListener('kael:agent', event => openAgent((event as CustomEvent<string>).detail));
  document.addEventListener('click', event => { const target = (event.target as HTMLElement).closest<HTMLElement>('[data-workflow-profile],[data-workflow-health]'); if (target?.dataset.workflowProfile) openAgent(target.dataset.workflowProfile); if (target?.dataset.workflowHealth) window.dispatchEvent(new CustomEvent('kael:health', { detail: target.dataset.workflowHealth })); });
  function openAgent(id: string) {
    if (id !== serverAgent.id && id !== builderAgent.id && !state?.agents.some(a => a.id === id)) return;
    window.dispatchEvent(new CustomEvent('kael:profile', { detail: id }));
  }
  function modal(title: string, content: string, submit?: (data: FormData) => Promise<void>, action?: (action: string) => void) {
    modalSubmit = submit || null; modalAction = action || null; watchedTask = '';
    dialog.innerHTML = `<form><div class="modal-heading"><div><h2 id="modal-title">${esc(title)}</h2></div><button type="button" class="modal-close" data-close aria-label="Tutup panel">${icon('close')}</button></div>${content}<p class="form-error" role="alert"></p></form>`;
    dialog.querySelector('[data-close]')!.setAttribute('aria-label', 'Tutup panel');
    dialog.setAttribute('aria-labelledby', 'modal-title');
    if (!dialog.open) dialog.showModal();
    const focusTarget = dialog.querySelector<HTMLElement>('input, textarea, select, [data-close]');
    queueMicrotask(() => focusTarget?.focus());
  }
  dialog.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button'); if (!target) return;
    if (target.hasAttribute('data-close') && !busy) dialog.close();
    if (target.dataset.modalAction && !busy) modalAction?.(target.dataset.modalAction);
  });
  dialog.addEventListener('change', event => {
    const select = event.target as HTMLSelectElement;
    if (select.dataset.resultTask && !busy) manualResult(select.dataset.resultTask, Number(select.value));
    if (select.name === 'outcome') {
      const note = dialog.querySelector<HTMLTextAreaElement>('textarea[name="note"]');
      if (note) note.required = select.value !== 'approved';
    }
  });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !modalSubmit) return;
    const form = event.target as HTMLFormElement; if (!form.reportValidity()) return;
    const data = new FormData(form); busy = true;
    form.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = true);
    try { await modalSubmit(data); } catch (e) { const target = dialog.querySelector('.form-error'); if (target) target.textContent = e instanceof Error ? e.message : 'Gagal menyimpan.'; }
    finally { busy = false; dialog.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = false); }
  });
  async function fetchState() { const response = await fetch('/api/state'); if (!response.ok) throw new Error('Server penyimpanan belum tersedia. Jalankan npm run dev, lalu coba lagi.'); const data = await response.json(); if (data.schema !== 1) throw new Error('Format data server tidak didukung.'); return data as State; }
  async function load() { try { state = await fetchState(); error = ''; if (restoringRoute) { restoreRoute(); return; } } catch { error = 'Server penyimpanan belum tersedia. Jalankan npm run dev, lalu coba lagi. Data lama tidak dihapus.'; } render(); }
  async function command(c: Command) {
    if (!state) throw new Error('Hubungkan server lokal dahulu.');
    const response = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, command: c }) });
    const data = await response.json();
    if (!response.ok) { if (response.status === 409) { state = await fetchState(); render(); } throw new Error(data.error || 'Gagal menyimpan.'); }
    state = data; error = ''; render();
  }
  async function runtimeRequest(path: string, taskId: string) {
    if (!state) throw new Error('Hubungkan server lokal dahulu.');
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, taskId }) });
    const data = await response.json();
    if (!response.ok) { if (response.status === 409) { state = await fetchState(); render(); } throw new Error(data.error || 'Gagal menghubungi runtime.'); }
    state = data; error = ''; render();
  }
  const runLabels: Record<string, string> = { queued: 'Antrean', running: 'Berjalan', done: 'Hasil disimpan', blocked: 'Butuh informasi', failed: 'Gagal', cancelled: 'Dihentikan', interrupted: 'Terputus' };
  function aiPanel(s: State, t: Task, approved: boolean) {
    const run = activeRun(s, t.id), settings = s.agentSettings?.find(v => v.agentId === t.agentId), runtime = s.aiRuntime, agent = s.agents.find(a => a.id === t.agentId);
    const history = (s.runs || []).filter(r => r.taskId === t.id && !['queued', 'running'].includes(r.status)).slice(-5).reverse();
    let body = '';
    if (run) body = `<p><strong>${esc(memberName(s, run.agentId))} ${run.status === 'queued' ? 'mengantre' : 'sedang mengerjakan'} dengan ${esc(run.provider)}${run.model ? ' · ' + esc(run.model) : ''}</strong>${run.status === 'running' ? `Dimulai ${stamp(run.startedAt)}.` : 'Menunggu giliran runtime.'} Hasil akan menunggu pemeriksaan; tidak ada persetujuan otomatis.</p><button type="button" class="op-button" data-modal-action="ai-cancel">Hentikan run</button>`;
    else if (approved && agent && ['queued', 'paused', 'blocked'].includes(t.status)) {
      if (settings && runnableProviders.includes(settings.provider)) body = `<p><strong>Jalankan dengan ${esc(settings.provider)}${settings.model ? ' · ' + esc(settings.model) : ''}</strong>${runtime?.available ? 'AI mengerjakan tugas dari konteks dan SOP, lalu menyimpan hasil sebagai versi baru untuk diperiksa.' : esc(runtime?.reason || 'Runtime belum tersedia.')}</p><button type="button" class="op-button primary" data-modal-action="ai-run" ${runtime?.available && !s.incidents?.some(i => i.agentId === t.agentId && !i.resolvedAt) && !s.facilitySessions?.some(v => v.status === 'active' && v.participantIds.includes(t.agentId)) ? '' : 'disabled'}>Jalankan dengan AI</button>`;
      else body = `<p><strong>Belum bisa dijalankan dengan AI</strong>Pilih provider ${runnableProviders.join('/')} di Setelan ${esc(agent.name)}. ${settings && settings.provider !== 'manual' ? esc(settings.provider) + ' belum punya runtime di Kael.' : 'Saat ini agent memakai mode manual.'}</p><button type="button" class="op-button" data-modal-action="agent-setup">Buka setelan agent</button>`;
    }
    const list = history.length ? `<details class="work-history"><summary>Riwayat run AI (${history.length})</summary>${history.map(r => `<div class="ai-run-row"><span><strong>${runLabels[r.status]} · ${esc(r.provider)}${r.model ? ' · ' + esc(r.model) : ''}</strong><small>${stamp(r.startedAt || r.queuedAt || '')}${r.resultVersion ? ' · hasil v' + r.resultVersion : ''}</small>${r.summary || r.error ? `<small class="preserve">${esc(r.error || r.summary)}</small>` : ''}</span></div>`).join('')}</details>` : '';
    return body || list ? `<section class="ai-panel ${run ? 'ai-running' : ''}">${body ? `<div class="ai-panel-body">${body}</div>` : ''}${list}</section>` : '';
  }
  const field = (label: string, name: string, placeholder = '', value = '', multiline = false, max = 10000) => `<label class="op-field">${label}${multiline ? `<textarea name="${name}" required maxlength="${max}" rows="4" placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input name="${name}" required maxlength="${max}" placeholder="${esc(placeholder)}" value="${esc(value)}">`}</label>`;
  const save = (text = 'Simpan') => `<div class="modal-footer"><span>Tersimpan di server lokal kamu.</span><button class="op-button primary" type="submit">${text}</button></div>`;
  const agentName = (t: Task) => (state && memberName(state, t.agentId)) || '—';
  const facilityStrip = document.querySelector<HTMLElement>('#facility-session-strip')!;
  function renderFacility() {
    for (const r of facilityLayouts) {
      const active = state?.facilitySessions?.find(s => s.roomId === r.id && s.status === 'active');
      const caption = document.querySelector(`[data-room="${r.id}"] small`);
      if (caption) caption.textContent = r.kind === 'builder' ? '1 Builder · Chat Codex' : r.kind === 'medical' ? `${state ? medicalPatients(state).length : 0} error · 4 kasur` : r.kind === 'server' ? 'Obsidian belum terhubung' : active ? `${active.participantIds.length}/${r.capacity} peserta · Digunakan` : `${r.capacity} tempat · Tersedia`;
    }
    const room = facilityLayouts.find(r => r.id === activeRoomId);
    facilityStrip.hidden = !room;
    if (!room) return;
    facilityStrip.classList.toggle('medical-strip', room.kind === 'medical');
    if (room.kind === 'builder') {
      facilityStrip.innerHTML = `<div><strong>Builder · ${esc(builderActivity(state?.builderChat).text)}</strong><small>Sesi ${builderSession.title} di Codex · Santai saat luang, bekerja saat sesi aktif</small></div><div><button class="op-button" data-facility-action="builder-profile">Profil Builder</button>${builderChatLink}</div>`;
      return;
    }
    if (room.kind === 'medical') {
      const patients = state ? medicalPatients(state) : [], legacy = state?.facilitySessions?.some(s => s.status === 'active' && s.roomId === room.id);
      facilityStrip.innerHTML = `<div class="medical-heading"><div><strong>${patients.length ? `⚠ ${patients.length} agent perlu pemulihan` : 'Semua agent sehat'}</strong><small>4 kasur · Error tercatat lokal</small></div><div><button class="op-button" data-facility-action="health-history">Riwayat pemulihan</button><button class="op-button primary" data-facility-action="health">Catat error</button>${legacy ? '<button class="op-button" data-facility-action="session">Tutup sesi meeting lama</button>' : ''}</div></div>${patients.length ? `<div class="medical-patients">${patients.map(p => `<article><div><button class="profile-link" data-health-profile="${esc(p.agent.id)}">⚠ ${esc(p.agent.name)}</button><small>${p.bedIndex >= 0 ? `Kasur 0${p.bedIndex + 1} · menuju / pemulihan` : 'Menunggu kasur · di workstation'}</small><p>${esc(p.incident.reason)}</p></div><button class="op-button" data-health-recover="${esc(p.agent.id)}">Catat pemulihan</button></article>`).join('')}</div>` : '<p class="op-muted">Belum ada error aktif. Kasur terisi setelah error dicatat; tidak ada pasien contoh. Error workflow n8n baru masuk otomatis; agent lain dicatat manual.</p>'}`;
      return;
    }
    if (room.kind === 'server') {
      facilityStrip.innerHTML = '<div><strong>Obsidian · Belum terhubung</strong><small>Nate · Knowledge & Obsidian</small></div><div><button class="op-button" data-facility-action="nate">Profil Nate</button><button class="op-button" data-facility-action="server">Detail ruang →</button></div>';
      return;
    }
    const session = state?.facilitySessions?.find(s => s.roomId === room.id && s.status === 'active');
    facilityStrip.innerHTML = `<div><span class="facility-indicator ${session ? 'occupied' : ''}"></span><strong>${session ? esc(session.title) : 'Tersedia'}</strong><small>${session ? `${session.participantIds.length} / ${room.capacity} peserta · Sesi aktif` : `${room.capacity} tempat · ${room.kind === 'meeting' ? 'Briefing & review' : 'Istirahat tim'}`}</small></div><div>${room.kind === 'lounge' ? '<button class="op-button" data-facility-action="coffee">Mesin kopi</button>' : room.kind === 'sport' ? '<button class="op-button" data-facility-action="sport">Main basket · visual</button>' : ''}<button class="op-button" data-facility-action="history">Riwayat</button><button class="op-button primary" data-facility-action="session" ${!state ? 'disabled' : ''}>${session ? 'Buka sesi →' : room.kind === 'meeting' ? 'Mulai meeting' : 'Gunakan fasilitas'}</button></div>`;
  }
  function healthModal(agentId = '') {
    if (!state) return;
    const incident = state.incidents?.find(i => !i.resolvedAt && i.agentId === agentId);
    const agents = [...state.agents, serverAgent];
    if (incident) {
      const agent = agents.find(a => a.id === agentId)!;
      modal(`Pemulihan ${agent.name}`, `<p class="modal-intro preserve">${esc(incident.reason)}</p><small>${stamp(incident.reportedAt)}</small>${field('Catatan pemulihan', 'resolution', 'Apa yang sudah diperbaiki atau diverifikasi?', '', true, 2000)}<p class="op-muted">Menandai pulih mengakhiri error tercatat. Tugas tetap dijeda dan tidak dijalankan otomatis.</p>${save('Tandai pulih')}`, async data => { await command({ type: 'agent-recover', id: incident.id, resolution: data.get('resolution') }); dialog.close(); notify('Pemulihan tersimpan. Agent kembali ke workstation; tugas tetap dijeda.'); });
    } else modal('Catat error agent', `<p class="modal-intro">Catat error yang benar-benar terjadi. Deteksi otomatis dari runtime belum terhubung. Pekerjaan berjalan agent akan dijeda; sesi yang diikutinya ditutup dengan alasan.</p><label class="op-field">Agent<select name="agentId" required>${agents.map(a => `<option value="${esc(a.id)}" ${a.id === agentId ? 'selected' : ''} ${state!.incidents?.some(i => !i.resolvedAt && i.agentId === a.id) ? 'disabled' : ''}>${esc(a.name)} · ${esc(a.role)}</option>`).join('')}</select></label>${field('Alasan error', 'reason', 'Contoh: koneksi runtime terputus saat menjalankan tugas', '', true, 2000)}${save('Catat error & kirim ke medis')}`, async data => { await command({ type: 'agent-error', agentId: data.get('agentId'), reason: data.get('reason') }); dialog.close(); notify('Error tersimpan. Agent menuju kasur yang tersedia; sisanya masuk antrean.'); });
  }
  function facilityHistory() {
    const sessions = state?.facilitySessions?.filter(s => s.roomId === activeRoomId && s.status === 'ended') || [];
    modal('Riwayat fasilitas', sessions.length ? sessions.map(s => `<details class="session-history"><summary>${esc(s.title)}<small>${stamp(s.endedAt)}</small></summary><p class="preserve">${esc(s.agenda)}</p><h3>Catatan hasil</h3><p class="preserve">${esc(s.notes)}</p><small>${esc(s.participantIds.map(id => state!.agents.find(a => a.id === id)?.name).join(', '))}</small></details>`).join('') : '<p class="modal-intro">Belum ada sesi yang diakhiri di fasilitas ini.</p>');
  }
  function facilitySession() {
    if (!state) return;
    const s = state, room = facilityLayouts.find(r => r.id === activeRoomId)!;
    const session = s.facilitySessions?.find(session => session.roomId === room.id && session.status === 'active');
    if (session) {
      modal(session.title, `<div class="session-context"><span class="op-badge">Sesi aktif</span><span>${esc(room.name)} · ${session.participantIds.length}/${room.capacity} peserta</span></div><h3>Agenda</h3><p class="preserve">${esc(session.agenda)}</p><h3>Peserta</h3><p>${esc(session.participantIds.map(id => s.agents.find(a => a.id === id)?.name).join(', '))}</p>${session.briefId ? `<h3>Brief terkait</h3><p>${esc(s.briefs.find(b => b.id === session.briefId)?.title)}</p>` : ''}${field('Catatan hasil sesi', 'notes', 'Tulis pembahasan, keputusan atau tindak lanjut yang benar-benar terjadi.', '', true)}<p class="op-muted">Catatan tidak menyetujui hasil tugas. Tugas yang dijeda tetap menunggu dilanjutkan di Pekerjaan.</p>${save('Simpan catatan & akhiri sesi')}`, async data => { await command({ type: 'facility-end', id: session.id, notes: data.get('notes') }); dialog.close(); notify('Catatan tersimpan. Anggota kembali ke ruang kerja.'); });
      return;
    }
    if (!s.agents.length) { modal('Belum ada anggota', '<p class="modal-intro">Bentuk tim melalui Builder dahulu, lalu pilih peserta untuk memakai fasilitas.</p>'); return; }
    const occupied = s.facilitySessions?.filter(session => session.status === 'active').flatMap(session => session.participantIds) || [];
    const alternatives = facilityLayouts.filter(r => r.kind === room.kind && r.id !== room.id && !s.facilitySessions?.some(session => session.roomId === r.id && session.status === 'active'));
    modal(`Gunakan ${room.name}`, `<p class="modal-intro">${room.capacity} tempat. ${room.kind === 'meeting' ? 'Sertakan manager; pekerjaan peserta yang sedang berjalan memerlukan checkpoint sebelum dijeda.' : 'Hanya anggota yang tidak sedang bekerja atau memeriksa hasil dapat istirahat.'}</p>${field('Judul sesi', 'title', room.kind === 'meeting' ? 'Contoh: Review naskah episode pertama' : 'Contoh: Istirahat tim Kaelach', '', false, 160)}<label class="op-field">Jenis sesi<select name="purpose">${room.kind === 'meeting' ? '<option value="briefing">Briefing tim</option><option value="review">Review hasil</option>' : '<option value="break">Istirahat</option>'}</select></label>${field('Agenda atau tujuan', 'agenda', 'Apa yang ingin dibahas atau dilakukan?', '', true, 5000)}${room.kind === 'meeting' ? `<label class="op-field">Brief terkait (opsional)<select name="briefId"><option value="">Tanpa brief terkait</option>${s.briefs.map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select></label>` : ''}<fieldset class="session-participants"><legend>Peserta · maksimal ${room.capacity}</legend>${s.agents.filter(a => !s.workflowBindings?.some(b => b.agentId === a.id)).map(a => `<label><input type="checkbox" name="participantIds" value="${a.id}" ${occupied.includes(a.id) ? 'disabled' : ''}><span><strong>${esc(a.name)}</strong><small>${esc(s.divisions.find(d => d.id === a.divisionId)?.name)} · ${a.manager ? 'Manager' : esc(a.role)}${occupied.includes(a.id) ? ' · Dalam sesi lain' : ''}</small></span></label>`).join('')}</fieldset>${room.kind === 'meeting' ? s.tasks.filter(t => t.status === 'running').map(t => `<label class="op-field">Checkpoint ${esc(agentName(t))} — ${esc(t.title)}<textarea name="checkpoint-${t.id}" maxlength="5000" rows="2" placeholder="Wajib jika pelaksana ini menjadi peserta; simpan progres terakhir sebelum jeda."></textarea></label>`).join('') : ''}${alternatives.length ? `<p class="op-muted">Alternatif tersedia: ${alternatives.map(r => `${esc(r.name)} (${r.capacity} tempat)`).join(', ')}.</p>` : ''}<p class="op-muted">Kehadiran, checkpoint dan catatan disimpan lokal. Percakapan/eksekusi AI melalui provider belum terhubung.</p>${save('Mulai sesi')}`, async data => {
      const checkpoints = Object.fromEntries([...data.entries()].filter(([key]) => key.startsWith('checkpoint-')).map(([key, value]) => [key.slice(11), value]));
      await command({ type: 'facility-start', roomId: room.id, title: data.get('title'), agenda: data.get('agenda'), purpose: data.get('purpose'), briefId: data.get('briefId'), participantIds: data.getAll('participantIds'), checkpoints });
      dialog.close(); notify('Sesi tersimpan. Peserta menuju fasilitas melalui koridor.');
    });
  }
  facilityStrip.addEventListener('click', event => {
    if (busy) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('button');
    if (target?.dataset.healthProfile) { openAgent(target.dataset.healthProfile); return; }
    if (target?.dataset.healthRecover) { healthModal(target.dataset.healthRecover); return; }
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-facility-action]')?.dataset.facilityAction;
    if (busy) return;
    if (action === 'health') { healthModal(); return; }
    if (action === 'coffee') { window.dispatchEvent(new CustomEvent('kael:coffee')); return; }
    if (action === 'sport') { window.dispatchEvent(new CustomEvent('kael:sport')); return; }
    if (action === 'health-history') { modal('Riwayat pemulihan', state?.incidents?.some(i => i.resolvedAt) ? state.incidents.filter(i => i.resolvedAt).map(i => `<details class="session-history"><summary>${esc([...state!.agents, serverAgent].find(a => a.id === i.agentId)?.name)}<small>${stamp(i.resolvedAt)}</small></summary><p class="preserve">${esc(i.reason)}</p><h3>Pemulihan</h3><p class="preserve">${esc(i.resolution)}</p></details>`).join('') : '<p class="modal-intro">Belum ada pemulihan tercatat.</p>'); return; }
    if (action === 'nate') { openAgent(serverAgent.id); return; }
    if (action === 'builder-profile') { openAgent(builderAgent.id); return; }
    if (action === 'server') { modal('Ruang server & Obsidian', '<p class="modal-intro">Pusat infrastruktur kantor, dengan rak server, panel jaringan, pendingin, UPS, penyimpanan dan meja kontrol.</p><div class="op-notice"><p><strong>Obsidian belum terhubung</strong><br>Rencananya ruang ini menjadi akses ke catatan dan pengetahuan dari vault Obsidian milikmu. Lokasi vault, akses baca/tulis dan cara sinkronisasi belum dikonfigurasi.</p></div><p class="op-muted">Perangkat 3D adalah visual ruangan. Belum ada pembacaan file vault, sinkronisasi, monitoring server atau akses agent ke Obsidian.</p>'); return; }
    if (!state) return;
    if (action === 'session') facilitySession();
    if (action === 'history') facilityHistory();
  });
  function render(replaceRoute = false) {
    renderNotifications();
    const focused = host.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const focusSelector = focused?.matches('button,input,select,textarea') ? ['id', 'data-action', 'data-id', 'data-view', 'data-division-view', 'data-section', 'data-work-filter', 'data-work-page', 'data-result-page', 'data-home-notification', 'data-workflow-key', 'data-workflow-filter', 'data-workflow-page', 'data-workflow-picker', 'data-workflow-reset'].filter(a => focused.hasAttribute(a)).map(a => `[${a}="${CSS.escape(focused.getAttribute(a)!)}"]`).join('') : '';
    const selection = focused instanceof HTMLInputElement && focused.type === 'search' ? focused.selectionStart : null;
    const openedRuns = new Set([...host.querySelectorAll<HTMLDetailsElement>('.workflow-run[open]')].map(e => e.dataset.execution));
    const openedTeams = new Set([...host.querySelectorAll<HTMLDetailsElement>('.team-members[open]')].map(e => e.dataset.division));
    const eventsOpen = host.querySelector<HTMLDetailsElement>('.workspace-events')?.open ?? true;
    const focusedRun = document.activeElement?.closest<HTMLElement>('[data-execution]')?.dataset.execution;
    const focusedLink = document.activeElement?.tagName === 'A';
    if (!state) { host.innerHTML = `<div class="op-heading"><h1>Ringkasan</h1></div>${error ? `<div class="op-alert" role="alert">${esc(error)}</div>${button('Coba lagi', 'retry')}` : '<div class="op-empty" role="status">Membuka ruang kerja…</div>'}`; return; }
    host.dataset.view = view;
    const s = state, pending = s.decisions.filter(d => d.status === 'pending');
    window.dispatchEvent(new CustomEvent('kael:state', { detail: s }));
    renderFacility();
    document.querySelector('#division-rooms')!.innerHTML = s.divisions.map(d => `<button class="room-nav" data-room="${d.id}"><span class="room-icon">${icon('team')}</span><span>${esc(d.name)}<small>${s.agents.filter(a => a.divisionId === d.id).length} anggota</small></span></button>`).join('');
    const selectedDivision = s.divisions.find(d => d.id === selectedDivisionId);
    const scoped = selectedDivision ? divisionState(s, selectedDivision.id) : s;
    const title = view === 'division' && selectedDivision ? selectedDivision.name : views.find(([key]) => key === view)![1];
    document.querySelector('#page-crumb')!.textContent = selectedDivision ? `${selectedDivision.name} / ${view === 'division' ? sectionLabels[divisionSection] : title}` : title;
    if (view === 'home') nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
    sectionNav.querySelectorAll<HTMLButtonElement>('button').forEach(b => { if (b.dataset.go === (selectedDivision || view === 'production' ? 'team' : view === 'tasks' || view === 'briefs' || view === 'workflows' ? 'activity' : view)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const count = document.querySelector<HTMLElement>('#decision-count')!; count.textContent = String(pending.length); count.hidden = !pending.length;
    const menuCount = document.querySelector<HTMLElement>('#decision-menu-count')!; menuCount.textContent = String(pending.length); menuCount.hidden = !pending.length;
    more.classList.toggle('has-attention', !!pending.length || !!s.incidents?.some(i => !i.resolvedAt) || !!s.productions?.some(p => p.status === 'blocked'));
    more.classList.toggle('has-current', !selectedDivision && !['home', 'team', 'activity'].includes(view));
    if (!selectedDivision && ['workflows', 'briefs', 'tasks'].includes(view)) sectionNav.querySelector<HTMLDetailsElement>('.manual-navigation')!.open = true;
    const intro: Record<View, string> = { division: 'Tim, pekerjaan dan alat divisi dalam satu tempat.', activity: 'Temukan pekerjaan, lihat progres, dan ketahui langkah berikutnya.', production: 'Upload chapter, pantau kerja tim, lalu tinjau dan putuskan hasilnya.', home: 'Pantau pekerjaan tim dan hal yang perlu kamu tindak lanjuti.', workflows: 'Status, riwayat eksekusi dan error workflow dari n8n.', team: 'Temukan tim, lihat kondisinya, lalu buka ruang kerjanya.', builder: 'Diskusi di Codex atau susun konfigurasi tim secara manual.', tasks: 'Tugas lokal yang dikerjakan dan diperbarui secara manual.', briefs: 'Tujuan dan rencana kerja untuk tim manual.', decisions: 'Tinjau rencana atau hasil sebelum disetujui.', business: 'Profil bisnis, koneksi yang tersedia, dan data workspace.' };
    const manual = scoped.divisions.some(d => d.managerId && !isWorkflowDivision(s, d.id));
    const activeSection = view === 'division' ? divisionSection : view === 'production' ? productionUI.selection().tab === 'chat' ? 'chat' : productionUI.selection().tab === 'files' ? 'results' : 'work' : view === 'decisions' ? 'results' : 'work';
    productionUI.capture();
    host.innerHTML = `${selectedDivision ? `<div class="division-breadcrumb"><button data-view="team">Divisi</button><span>/</span><span>${esc(sectionLabels[activeSection])}</span></div>` : ''}<div class="op-heading"><div><h1>${esc(selectedDivision?.name || title)}</h1><p>${selectedDivision ? `${esc(selectedDivision.company || s.business.name)} · ${scoped.agents.length} anggota` : intro[view]}</p></div><div class="op-head-actions">${selectedDivision ? button(`${icon('office')} Lihat ruangan`, 'division-room', selectedDivision.id) : ''}${view === 'team' ? `<button class="op-button primary" data-view="builder">${icon('plus')} Bentuk divisi</button>` : ''}${view === 'home' || view === 'workflows' && !selectedDivision ? button(`${icon('office')} Buka kantor`, 'office') : manual && ['briefs', 'tasks', 'decisions'].includes(view) ? button(`${icon('plus')} Briefing baru`, 'new-brief', '', true) : ''}</div></div>
      ${error ? `<div class="op-alert" role="alert">${esc(error)} ${button('Coba lagi', 'retry')}</div>` : ''}
      ${selectedDivision ? `<nav class="division-tabs" aria-label="Bagian divisi">${divisionSections.map(key => `<button data-section="${key}" ${activeSection === key ? 'aria-current="page"' : ''}>${sectionLabels[key]}</button>`).join('')}</nav>` : ''}
      ${view === 'workflows' ? `<div class="connection-strip"><span><i></i> ${scoped.workflowBindings?.length || 0} workflow n8n <b>·</b> Polling ±5 dtk</span></div>` : ''}
      <div class="op-content">${view === 'division' ? divisionWorkspace(scoped) : view === 'production' ? '<div id="production-root"></div>' : view === 'home' ? home(s, pending.length) : view === 'activity' ? workBoard(scoped) : view === 'briefs' ? briefs(scoped) : view === 'tasks' ? tasks(scoped) : view === 'decisions' ? decisions(scoped) : view === 'team' ? team(s) : view === 'builder' ? builder.render() : view === 'workflows' ? workflowDashboard(scoped, workflowFilters, selectedWorkflowId) : business(s)}</div>
      <footer class="op-footer"><span>Data workspace lokal</span>${view !== 'business' ? '<button class="op-button" data-view="business">Pengaturan & backup</button>' : ''}</footer>`;
    host.querySelectorAll<HTMLDetailsElement>('.workflow-run').forEach(e => { if (openedRuns.has(e.dataset.execution)) e.open = true; if (focusedRun === e.dataset.execution) e.querySelector<HTMLElement>(focusedLink ? 'a' : 'summary')?.focus({ preventScroll: true }); });
    host.querySelectorAll<HTMLDetailsElement>('.team-members').forEach(e => e.open = openedTeams.has(e.dataset.division));
    const events = host.querySelector<HTMLDetailsElement>('.workspace-events'); if (events) events.open = eventsOpen;
    if (view === 'production') productionUI.mount(host.querySelector<HTMLElement>('#production-root')!);
    if (view === 'builder') builder.bind(host, render);
    if (view === 'home' && !host.hidden && window.dispatchEvent(new Event('kael:preview-request', { cancelable: true }))) host.querySelector<HTMLElement>('#founder-preview-loading')!.textContent = 'Cuplikan 3D belum tersedia. Buka ruang Kael untuk memeriksa tampilan kantor.';
    if (focusSelector) { const control = host.querySelector<HTMLElement>(focusSelector); control?.focus({ preventScroll: true }); if (control instanceof HTMLInputElement && selection !== null) control.setSelectionRange(selection, selection); }
    host.querySelector<HTMLInputElement>('#team-search')?.addEventListener('input', event => { teamQuery = (event.target as HTMLInputElement).value; const position = (event.target as HTMLInputElement).selectionStart; render(); const search = host.querySelector<HTMLInputElement>('#team-search'); search?.focus(); search?.setSelectionRange(position, position); });
    if (host.hidden) showOffice();
    else writeRoute(replaceRoute);
  }
  function home(s: State, pending: number) {
    const overview = divisionOverview(s), notices = workspaceNotifications(s), processes = overview.complete ? overview.activeCount : '—';
    return `<nav class="overview-counts" aria-label="Jumlah dalam workspace">${[['Divisi', s.divisions.length, 'team'], ['Agent', s.agents.length, 'team'], ['Pekerjaan aktif', processes, 'activity'], ['Keputusan menunggu', pending, 'decisions']].map(([label, value, tab]) => `<button data-view="${tab}"><strong>${value}</strong><span>${label}</span></button>`).join('')}</nav>
    <div class="overview-layout"><section class="overview-divisions"><section class="founder-preview"><div class="op-section-title"><h2>Ruang kerja Kael</h2><time id="founder-preview-time"></time></div><button class="founder-preview-image" data-action="founder" aria-label="Buka ruang kerja Kael di kantor virtual"><img id="founder-office-preview" width="900" height="500" alt="Cuplikan ruang kerja Kael di kantor virtual" hidden><span id="founder-preview-loading" role="status">Menyiapkan cuplikan ruang kerja…</span></button><div class="founder-preview-caption"><div><strong>Kael</strong><span>Founder · ruang kerja pribadi</span></div><button class="op-button" data-action="founder">Buka ruang Kael ${icon('arrow')}</button></div></section>
    <section class="overview-work">${activeWork(s, true)}</section>
    <div class="op-section-title"><h2>Divisi</h2><button data-view="team">Lihat semua ${icon('arrow')}</button></div>${s.divisions.length ? `<div class="overview-columns" aria-hidden="true"><span>Tim & perusahaan</span><span>Manager</span><span>Kondisi saat ini</span><span></span></div><div class="overview-division-list">${s.divisions.slice(0, 6).map(d => { const ds = divisionState(s, d.id), manager = ds.agents.find(a => a.id === d.managerId), activity = divisionOverview(ds); return `<button class="overview-division" data-action="division-workspace" data-id="${d.id}"><span class="overview-team"><strong>${esc(d.name)}</strong><small>${esc(d.company || s.business.name)} · ${ds.agents.length} anggota</small></span><span class="overview-manager">${manager ? `<span class="member-avatar manager" aria-hidden="true">${esc(manager.name.slice(0, 1))}</span>${esc(manager.name)}` : 'Belum ditentukan'}</span><span class="overview-activity activity-${activity.kind}">${esc(activity.text)}</span>${icon('arrow')}</button>`; }).join('')}</div>${s.divisions.length > 6 ? `<button class="op-button workspace-more" data-view="team">Lihat ${s.divisions.length - 6} divisi lainnya</button>` : ''}` : empty('Belum ada divisi.', 'Bentuk tim dan tentukan alur kerjanya melalui Builder.', '<button class="op-button primary" data-view="builder">Bentuk divisi</button>')}</section>
    <aside class="overview-rail"><section class="overview-attention"><div class="op-section-title"><h2>Perlu ditindaklanjuti</h2><span class="attention-total">${notices.length}</span></div>${notices.slice(0, 5).map(n => `<button class="attention-row" data-home-notification="${esc(n.id)}"><span class="attention-type type-${n.kind}">${icon(n.kind === 'error' ? 'alert' : n.kind === 'approval' ? 'decisions' : 'workflow')}${n.kind === 'error' ? 'Kendala' : n.kind === 'approval' ? 'Menunggu keputusan' : 'Periksa koneksi'}</span><strong>${esc(n.title)}</strong><small>${esc(n.detail)}</small></button>`).join('') || '<p class="overview-quiet">Tidak ada keputusan atau kendala yang tercatat saat ini.</p>'}${notices.length > 5 ? button('Lihat semua pemberitahuan', 'notifications') : ''}</section>
    <details class="workspace-events overview-events"><summary>Aktivitas terbaru ${icon('arrow')}</summary>${s.events.length ? `<ol class="event-list">${s.events.slice(0, 4).map(e => `<li><i></i><div><p>${esc(e.message)}</p><time>${stamp(e.at)}</time></div></li>`).join('')}</ol>` : '<p class="overview-quiet">Belum ada aktivitas tercatat.</p>'}</details></aside></div>`;
  }
  function workRow(s: State, item: WorkItem, compact = false, action = 'work-detail') {
    const division = s.divisions.find(d => d.id === item.divisionId), agent = s.agents.find(a => a.id === item.agentId), manager = s.agents.find(a => a.id === item.managerId);
    return `<button class="work-row ${compact ? 'work-row-compact' : ''}" data-action="${action}" data-id="${esc(item.key)}"><span class="work-row-icon">${icon(item.source === 'production' ? 'layers' : item.source === 'workflow' ? 'workflow' : 'tasks')}</span><span class="work-row-main"><strong>${esc(item.title)}</strong><small>${esc(division?.name || 'Divisi belum tersedia')} · ${esc(agent?.name || 'Pelaksana belum ditentukan')}${!compact && manager ? ' · Manager ' + esc(manager.name) : ''}</small><span class="work-source">${workSources[item.source]}${action === 'result-open' ? ' · ' + item.versions + ' versi tersimpan' : !compact ? ' · ' + esc(item.stage) : ''}</span></span><span class="work-row-state"><span class="work-state work-state-${item.status}">${esc(workStatuses[item.status])}</span><small class="work-connection connection-${item.connection.kind}">${esc(item.connection.label)}</small></span>${icon('arrow')}</button>`;
  }
  function activeWork(s: State, compact = false) {
    if (!compact) return workBoard(s);
    const items = workItems(s).filter(w => w.status === 'running' || w.source === 'production' && w.status === 'queued');
    return `<div class="op-section-title"><h2>Sedang berjalan</h2><button ${selectedDivisionId ? 'data-section="work"' : 'data-view="activity"'}>Lihat pekerjaan ${icon('arrow')}</button></div>${!divisionOverview(s).complete ? '<p class="work-freshness">Sebagian status eksternal belum terkonfirmasi ulang.</p>' : ''}<div class="work-list work-list-compact">${items.slice(0, 3).map(w => workRow(s, w, true)).join('')}</div>${!items.length ? '<p class="overview-quiet">Belum ada pekerjaan berjalan yang tercatat.</p>' : ''}`;
  }
  function workBoard(s: State) {
    const list = workList(s, workFilter);
    workFilter.page = list.page;
    const manual = s.divisions.some(d => d.managerId && !isWorkflowDivision(s, d.id));
    const production = s.divisions.some(d => divisionTools(divisionState(s, d.id)).production);
    const filtered = !!workFilter.query?.trim() || workFilter.source && workFilter.source !== 'all' || workFilter.status && workFilter.status !== 'all' || view === 'activity' && !!selectedDivisionId;
    return `<nav class="work-tools" aria-label="Buat dan kelola pekerjaan">${manual ? button(icon('plus') + ' Buat briefing', 'new-brief', '', true) : ''}${production ? `<button class="op-button" ${selectedDivisionId ? 'data-division-view' : 'data-view'}="production">Buka produksi</button>` : ''}<button class="op-button" ${selectedDivisionId ? 'data-division-view' : 'data-view'}="briefs">Briefing & rencana</button>${s.workflowBindings?.length ? `<button class="op-button" ${selectedDivisionId ? 'data-division-view' : 'data-view'}="workflows">Monitoring eksternal</button>` : ''}</nav>
    <div class="work-filters"><label class="search-field">${icon('search')}<input id="work-search" type="search" maxlength="160" data-work-filter="query" placeholder="Cari pekerjaan, agent, atau kendala…" aria-label="Cari pekerjaan, agent, atau kendala" value="${esc(workFilter.query || '')}"></label>${view === 'activity' ? `<label>Divisi<select id="work-division"><option value="">Semua divisi</option>${state!.divisions.map(d => `<option value="${d.id}" ${selectedDivisionId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : ''}<label>Status pekerjaan<select data-work-filter="status"><option value="all">Semua status</option>${Object.entries(workStatuses).map(([key, label]) => `<option value="${key}" ${workFilter.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Sumber<select data-work-filter="source"><option value="all">Semua sumber</option>${Object.entries(workSources).map(([key, label]) => `<option value="${key}" ${workFilter.source === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>${filtered ? button('Hapus filter', 'work-reset') : ''}</div>
    <div class="work-results-heading"><h2>Daftar pekerjaan</h2><span id="work-results-count" tabindex="-1" role="status">${list.total} dari ${list.available} pekerjaan</span></div>
    ${!divisionOverview(s).complete ? '<p class="work-freshness" role="status">Sebagian koneksi eksternal belum lengkap. Status pekerjaan yang terakhir diketahui tetap ditampilkan.</p>' : ''}
    ${list.items.length ? `<div class="work-columns" aria-hidden="true"><span>Pekerjaan · penanggung jawab</span><span>Status · pelaksanaan</span></div><div class="work-list">${list.items.map(w => workRow(s, w)).join('')}</div><nav class="work-pagination" aria-label="Halaman pekerjaan"><span>${(list.page - 1) * 20 + 1}–${Math.min(list.page * 20, list.total)} dari ${list.total}</span><div><button id="work-previous" class="op-button" data-work-page="${list.page - 1}" ${list.page === 1 ? 'disabled' : ''}>Sebelumnya</button><span>Halaman ${list.page} / ${list.pages}</span><button id="work-next" class="op-button" data-work-page="${list.page + 1}" ${list.page === list.pages ? 'disabled' : ''}>Berikutnya</button></div></nav>` : empty(list.available ? 'Tidak ada pekerjaan yang cocok.' : 'Belum ada pekerjaan.', list.available ? 'Ubah pencarian, sumber, atau status untuk melihat pekerjaan lain.' : 'Mulai dari tujuan yang jelas melalui briefing atau alur produksi divisi.', list.available ? button('Hapus filter', 'work-reset') : '')}
    ${s.workflowBindings?.length ? '<p class="work-list-note">Workflow eksternal ditampilkan satu baris per workflow. Riwayat setiap eksekusi tersedia di monitoring; data ini tidak menjalankan workflow.</p>' : ''}`;
  }
  function workSummary(item: WorkItem) {
    const s = state!, division = s.divisions.find(d => d.id === item.divisionId), agent = s.agents.find(a => a.id === item.agentId), manager = s.agents.find(a => a.id === item.managerId);
    const character = agent ? agentActivity(s, agent).text : 'Belum ada pelaksana aktif';
    return `<div class="work-detail-state"><span class="work-state work-state-${item.status}">${esc(workStatuses[item.status])}</span><span>${workSources[item.source]}</span></div><dl class="work-detail-facts"><div><dt>Divisi</dt><dd>${esc(division?.name || 'Belum tersedia')}</dd></div><div><dt>Manager</dt><dd>${esc(manager?.name || 'Belum ditentukan')}</dd></div><div><dt>Pelaksana</dt><dd>${esc(agent?.name || 'Belum ditentukan')}</dd></div><div><dt>Tahap sekarang</dt><dd>${esc(item.stage)}</dd></div><div><dt>Versi hasil</dt><dd>${item.source === 'workflow' ? 'Mengikuti sistem sumber' : item.versions ? item.versions + ' versi tersimpan' : 'Belum ada hasil'}</dd></div><div><dt>Status di sumber</dt><dd>${esc(item.nativeStatus)}</dd></div></dl><section class="work-next-step"><h3>Langkah berikutnya</h3><p>${esc(item.nextStep)}</p></section><h3>Tujuan</h3><p class="preserve">${esc(item.goal)}</p><h3>Kriteria selesai</h3><p class="preserve">${esc(item.criteria)}</p>${item.reason ? `<section class="work-issue"><h3>Catatan / kendala</h3><p class="preserve">${esc(item.reason)}</p></section>` : ''}<details class="work-execution-details"><summary>Pelaksanaan, koneksi & karakter</summary><dl class="work-detail-facts"><div><dt>Pelaksanaan / koneksi</dt><dd><strong>${esc(item.connection.label)}</strong><small>${esc(item.connection.detail)}</small></dd></div><div><dt>Karakter kantor</dt><dd>${esc(character)}<small>Aktivitas visual karakter tidak membuktikan progres atau koneksi AI.</small></dd></div>${item.updatedAt ? `<div><dt>Aktivitas kerja terakhir</dt><dd>${stamp(item.updatedAt)}</dd></div>` : ''}</dl></details>`;
  }
  function workDetail(key: string) {
    const item = workItems(state!).find(w => w.key === key);
    if (!item) { notify('Pekerjaan tidak lagi tersedia. Daftar diperbarui.'); render(); return; }
    if (item.source === 'manual') { taskDetail(item.targetId); return; }
    const incident = state!.incidents?.find(i => i.agentId === item.agentId && !i.resolvedAt);
    modal(item.title, `${workSummary(item)}<div class="task-actions"><button type="button" class="op-button primary" data-modal-action="source">${item.source === 'production' ? 'Buka produksi & preview' : 'Buka monitoring & riwayat'}</button>${incident ? '<button type="button" class="op-button" data-modal-action="health">Lihat insiden agent</button>' : ''}</div><p class="op-muted">Membuka detail tidak menjalankan, menyetujui, atau mengirim pekerjaan.</p>`, undefined, action => {
      if (action === 'health') { dialog.close(); enterRoom('meeting-alt'); healthModal(item.agentId); return; }
      if (action !== 'source') return;
      dialog.close();
      if (item.source === 'production') openProduction(item.targetId);
      else { selectedDivisionId = item.divisionId; selectedWorkflowId = item.targetId; view = 'workflows'; showOperations(); }
    });
  }
  function resultsBoard(s: State, pendingCount = 0) {
    const list = resultList(s, resultQuery, resultPage); resultPage = list.page;
    return `<div class="op-section-title"><h2>Hasil & versi</h2><button class="op-button" data-division-view="decisions">Keputusan divisi (${pendingCount})</button></div><div class="team-toolbar"><label class="search-field">${icon('search')}<input id="results-search" type="search" maxlength="160" aria-label="Cari hasil pekerjaan" placeholder="Cari hasil, pekerjaan, atau agent…" value="${esc(resultQuery)}"></label><span id="result-count" tabindex="-1" role="status">${list.total} dari ${list.available} hasil pekerjaan</span>${resultQuery ? button('Hapus pencarian', 'results-reset') : ''}</div>${list.items.length ? `<div class="work-list">${list.items.map(w => workRow(s, w, false, 'result-open')).join('')}</div><nav class="work-pagination" aria-label="Halaman hasil"><span>Halaman ${list.page} / ${list.pages}</span><div><button id="result-previous" class="op-button" data-result-page="${list.page - 1}" ${list.page === 1 ? 'disabled' : ''}>Sebelumnya</button><button id="result-next" class="op-button" data-result-page="${list.page + 1}" ${list.page === list.pages ? 'disabled' : ''}>Berikutnya</button></div></nav>` : empty(resultQuery ? 'Tidak ada hasil yang cocok.' : 'Belum ada hasil tersimpan.', resultQuery ? 'Coba judul pekerjaan atau nama agent lain.' : 'Hasil muncul setelah pekerjaan menghasilkan output. Versi lama tetap disimpan saat revisi.', resultQuery ? button('Hapus pencarian', 'results-reset') : '<button class="op-button" data-section="work">Buka pekerjaan</button>')}${s.workflowBindings?.length ? '<p class="work-list-note">Output eksternal belum disalin ke workspace. Buka monitoring untuk menelusuri hasil eksekusi.</p><button class="op-button" data-division-view="workflows">Buka monitoring eksternal</button>' : ''}`;
  }
  function openResult(key: string) {
    const item = workItems(state!).find(w => w.key === key);
    if (!item || !item.versions) { notify('Hasil belum tersedia atau sudah diarsipkan.'); return; }
    if (item.source === 'production') { openProduction(item.targetId); return; }
    if (item.source === 'manual') manualResult(item.targetId);
  }
  function manualResult(id: string, version = 0) {
    const s = state!, task = s.tasks.find(t => t.id === id), item = workItems(s).find(w => w.key === `manual:${id}`);
    if (!task?.results.length || !item) { notify('Hasil tugas tidak tersedia.'); return; }
    const latest = task.results.at(-1)!, result = version ? task.results.find(r => r.version === version) : latest;
    if (!result) { notify('Versi ini tidak tersedia. Buka versi terbaru.'); return; }
    const current = result.version === latest.version;
    const history = s.decisions.filter(d => d.targetId === id && d.type !== 'plan' && d.version === result.version);
    const pending = history.find(d => d.status === 'pending' && decisionContext(s, d.id)?.canDecide);
    modal(`${task.title} · v${result.version}`, `<div class="result-toolbar"><label>Versi hasil<select data-result-task="${id}">${task.results.slice().reverse().map(r => `<option value="${r.version}" ${r.version === result.version ? 'selected' : ''}>v${r.version}${r.version === latest.version ? ' · terbaru' : ' · versi lama'}</option>`).join('')}</select></label><span>${stamp(result.createdAt)}</span><button type="button" class="op-button" data-modal-action="download">Unduh .txt</button></div><p class="result-version-note">${current ? 'Preview teks hasil tersimpan. Persetujuan tidak mengirim atau memublikasikan hasil.' : 'Versi lama hanya untuk ditinjau. Keputusan baru memakai versi terbaru.'}</p><pre class="result-text-preview">${esc(result.content)}</pre><details class="work-execution-details"><summary>Kriteria selesai</summary><p class="preserve">${esc(item.criteria)}</p></details><div class="task-actions">${!current ? '<button type="button" class="op-button primary" data-modal-action="latest">Buka versi terbaru</button>' : `${task.status === 'review' ? '<button type="button" class="op-button primary" data-modal-action="review">Periksa hasil</button>' : ''}${pending ? `<button type="button" class="op-button primary" data-modal-action="decision">${pending.type === 'guidance' ? 'Beri arahan' : 'Tinjau keputusan'} v${result.version}</button>` : ''}${canReviseResult(s, id) ? '<button type="button" class="op-button" data-modal-action="revise">Minta versi baru</button>' : ''}`}<button type="button" class="op-button" data-modal-action="task">Buka pekerjaan</button></div><h3>Keputusan untuk v${result.version}</h3>${history.length ? history.map(d => `<button type="button" class="result-decision-link" data-modal-action="history-${d.id}"><span><strong>${esc(d.title)}</strong><small>Diajukan ${stamp(d.createdAt)}${d.note ? ' · ' + esc(d.note) : ''}</small></span>${badge(d.status)}${icon('arrow')}</button>`).join('') : '<p class="op-muted">Versi ini belum memiliki keputusan Founder.</p>'}`, undefined, action => {
      if (action === 'download') download(result.content, `kael-hasil-${id}-v${result.version}.txt`, 'text/plain');
      if (action === 'latest') manualResult(id);
      if (action === 'task') taskDetail(id);
      if (action === 'review') reviewTask(id);
      if (action === 'decision' && pending) decisionDetail(pending.id);
      if (action === 'revise') requestRevision(id);
      if (action.startsWith('history-')) decisionDetail(action.slice(8));
    });
  }
  function reviewTask(id: string) {
    const s = state!, task = s.tasks.find(t => t.id === id), brief = s.briefs.find(b => b.id === task?.briefId);
    if (!task || task.status !== 'review' || !task.results.length || !brief || !workItems(s).some(w => w.key === `manual:${id}`)) { notify('Hasil terbaru tidak sedang menunggu pemeriksaan manual.'); return; }
    const version = task.results.length;
    modal(`Periksa hasil v${version}`, `<p class="modal-intro">Pemeriksaan ini kamu lakukan secara manual terhadap versi yang ditampilkan.</p><h3>Kriteria selesai</h3><p class="preserve">${esc(brief.criteria)}</p><pre class="result-text-preview">${esc(task.results.at(-1)!.content)}</pre><label class="op-field">Hasil pemeriksaan<select name="accept"><option value="yes">Sesuai brief — ajukan ke Founder</option><option value="no">Perlu perbaikan</option></select></label>${field('Catatan pemeriksaan', 'note', 'Jelaskan kecocokan atau perbaikan yang dibutuhkan.', '', true, 5000)}${save(`Simpan pemeriksaan v${version}`)}`, async data => { await command({ type: 'review', id, version, accept: data.get('accept') === 'yes', note: data.get('note') }); manualResult(id); notify('Pemeriksaan tersimpan. Keputusan Founder tetap terpisah.'); });
  }
  function requestRevision(id: string) {
    const s = state!, task = s.tasks.find(t => t.id === id);
    if (!task || !canReviseResult(s, id)) { notify('Tugas belum siap untuk permintaan versi baru.'); return; }
    const pending = s.decisions.find(d => d.targetId === id && d.type !== 'plan' && d.status === 'pending');
    if (pending) { decisionDetail(pending.id, 'revision'); return; }
    const version = task.results.length;
    modal('Minta versi baru', `<p class="modal-intro">Hasil sampai v${version} tetap tersimpan. Arahan ini menyiapkan revisi; tugas lokal tidak otomatis memanggil AI.</p>${field('Arahan revisi', 'reason', 'Jelaskan bagian yang perlu diubah dan hasil yang diharapkan.', '', true, 5000)}${save('Simpan arahan revisi')}`, async data => { await command({ type: 'revise-task', id, version, reason: data.get('reason') }); taskDetail(id); notify('Arahan tersimpan. Lanjutkan pekerjaan untuk membuat versi baru.'); });
  }
  function cancelTask(id: string) {
    const task = state!.tasks.find(t => t.id === id);
    if (!task || ['done', 'cancelled'].includes(task.status) || !workItems(state!).some(w => w.key === `manual:${id}`)) { notify('Pekerjaan ini tidak dapat dibatalkan melalui tugas manual.'); return; }
    modal('Batalkan pekerjaan', `<p class="modal-intro">Batalkan “${esc(task.title)}”? Tugas dihentikan dan approval yang menunggu ditutup. Hasil serta riwayat tetap tersimpan.</p>${field('Alasan pembatalan', 'reason', 'Jelaskan mengapa pekerjaan dibatalkan.', '', true, 2000)}${save('Batalkan pekerjaan')}`, async data => { await command({ type: 'cancel-task', id, reason: data.get('reason') }); taskDetail(id); notify('Pekerjaan dibatalkan; hasil dan riwayat tetap tersimpan.'); });
  }
  function divisionMembers(s: State) {
    const production = divisionTools(s).production, archived = s.archivedAgents || [];
    const canArchive = (a: State['agents'][number]) => !a.manager && !production && !s.workflowBindings?.some(b => b.agentId === a.id);
    const setupLabel = (id: string) => { const v = s.agentSettings?.find(x => x.agentId === id); return !v || v.provider === 'manual' ? 'Manual' : `${v.provider}${v.model ? ' · ' + v.model : ''}`; };
    return `<div class="op-section-title"><h2>Anggota divisi</h2><span>${s.agents.length} anggota</span></div><div class="division-members-list">${s.agents.map(a => `<div class="division-member-row"><button class="member division-member" data-action="agent-detail" data-id="${a.id}"><span class="member-avatar ${a.manager ? 'manager' : ''}">${esc(a.name.slice(0, 1))}</span><span><strong>${esc(a.name)}${a.manager ? ' · Manager' : ''}</strong><small>${esc(a.role)} · ${esc(setupLabel(a.id))}</small></span><span class="member-state">${esc(agentActivity(s, a).text)}</span>${icon('arrow')}</button><div class="member-actions">${button('Setelan', 'agent-settings', a.id)}${canArchive(a) ? button('Arsipkan', 'agent-archive', a.id) : ''}</div></div>`).join('') || '<p class="op-muted">Belum ada anggota. Atur tim melalui Builder.</p>'}</div><p class="op-muted setup-note">Ubah nama/peran atau tambah pelaksana melalui Builder. Provider Codex dapat menjalankan tugas dari detail pekerjaan; provider lain baru tersimpan sebagai rencana.${production ? ' Anggota divisi produksi belum dapat diarsipkan karena alur produksi memakai susunan tim yang ada.' : ''}</p>${archived.length ? `<details class="work-history"><summary>Anggota diarsipkan (${archived.length})</summary>${archived.map(a => `<div class="archived-member"><span><strong>${esc(a.name)}</strong><small>${esc(a.role)} · diarsipkan ${stamp(a.archivedAt)}${a.handoverTo ? ' · pekerjaan diserahkan ke ' + esc(memberName(s, a.handoverTo)) : ''}</small><small class="preserve">${esc(a.reason)}</small></span>${button('Pulihkan', 'agent-restore', a.id)}</div>`).join('')}</details>` : ''}`;
  }
  function sopPanel(s: State, divisionId: string) {
    const latest = latestSop(s, divisionId), older = (s.sops || []).filter(v => v.divisionId === divisionId && v.version !== latest?.version).sort((a, b) => b.version - a.version);
    const body = (v: NonNullable<typeof latest>) => `<h3>Langkah kerja</h3><p class="preserve">${esc(v.steps)}</p><h3>Kriteria selesai default</h3><p class="preserve">${esc(v.criteria)}</p>${v.limits ? `<h3>Batas tindakan</h3><p class="preserve">${esc(v.limits)}</p>` : ''}`;
    return `<section class="sop-panel"><div class="op-section-title"><h2>SOP divisi</h2>${button(latest ? 'Edit SOP' : 'Buat SOP', 'sop-edit', divisionId, !latest)}</div>${latest ? `<p class="sop-version">Versi ${latest.version} · ${stamp(latest.createdAt)}</p>${body(latest)}${older.length ? `<details class="work-history"><summary>Versi sebelumnya (${older.length})</summary>${older.map(v => `<details class="session-history"><summary>Versi ${v.version}<small>${stamp(v.createdAt)}</small></summary>${body(v)}</details>`).join('')}</details>` : ''}` : '<p class="op-muted">Belum ada SOP. Tulis langkah kerja, kriteria selesai default, dan batas tindakan agar briefing divisi ini konsisten.</p>'}<p class="op-muted setup-note">Briefing baru memakai SOP terbaru dan konteks AI ikut menyertakannya. Briefing lama tetap memakai versi saat dibuat.</p></section>`;
  }
  function sopEditor(divisionId: string) {
    const s = state!, division = s.divisions.find(d => d.id === divisionId); if (!division) return;
    const latest = latestSop(s, divisionId), base = latest?.version || 0;
    modal(`${latest ? 'Edit' : 'Buat'} SOP · ${division.name}`, `<p class="modal-intro">${latest ? `Menyimpan akan membuat versi ${base + 1}. Versi ${base} tetap tersimpan.` : 'SOP pertama untuk divisi ini.'}</p>${field('Langkah kerja', 'steps', 'Contoh:\n1. Manager membaca brief\n2. Pelaksana menyusun draft\n3. Manager memeriksa sebelum diajukan', latest?.steps || '', true, 10000)}${field('Kriteria selesai default', 'criteria', 'Dipakai sebagai isian awal kriteria saat membuat briefing.', latest?.criteria || '', true, 5000)}<label class="op-field">Batas tindakan (opsional)<textarea name="limits" maxlength="5000" rows="3" placeholder="Contoh: Tidak memublikasikan, mengirim pesan, atau membayar tanpa persetujuan Founder.">${esc(latest?.limits || '')}</textarea></label>${save(`Simpan SOP v${base + 1}`)}`, async data => {
      await command({ type: 'sop-save', divisionId, baseVersion: base, steps: data.get('steps'), criteria: data.get('criteria'), limits: data.get('limits') }); dialog.close(); notify(`SOP v${base + 1} disimpan.`);
    });
  }
  function agentSettings(id: string) {
    const s = state!, agent = s.agents.find(a => a.id === id); if (!agent) return;
    const current = s.agentSettings?.find(v => v.agentId === id);
    modal(`Setelan ${agent.name}`, `<p class="modal-intro">Tentukan provider dan model untuk agent ini. Codex dapat menjalankan tugas dari detail pekerjaan memakai login Codex di komputer ini; Claude dan Hermes baru tersimpan sebagai rencana.</p><label class="op-field">Provider<select name="provider">${agentProviders.map(p => `<option value="${p}" ${(current?.provider || 'manual') === p ? 'selected' : ''}>${p === 'manual' ? 'Manual (ikuti tujuan salin konteks)' : p}</option>`).join('')}</select></label><label class="op-field">Model (opsional)<input name="model" maxlength="120" placeholder="Contoh: nama model dari provider" value="${esc(current?.model || '')}"></label><label class="op-field">Catatan profil (opsional)<textarea name="notes" maxlength="2000" rows="3" placeholder="Gaya kerja, keahlian, atau hal yang perlu diingat agent ini.">${esc(current?.notes || '')}</textarea></label>${save('Simpan setelan')}`, async data => {
      await command({ type: 'agent-settings', agentId: id, provider: data.get('provider'), model: data.get('model'), notes: data.get('notes') }); dialog.close(); notify('Setelan agent disimpan.');
    });
  }
  function archiveAgent(id: string) {
    const s = state!, agent = s.agents.find(a => a.id === id); if (!agent) return;
    const open = s.tasks.filter(t => t.agentId === id && !['done', 'cancelled'].includes(t.status));
    const targets = s.agents.filter(a => a.divisionId === agent.divisionId && !a.manager && a.id !== id && !s.workflowBindings?.some(b => b.agentId === a.id));
    if (!targets.length) { notify('Tambahkan pelaksana lain melalui Builder sebelum mengarsipkan anggota ini.'); return; }
    modal(`Arsipkan ${agent.name}`, `<p class="modal-intro">${agent.name} dikeluarkan dari tim aktif dan kantor. Identitas, riwayat, hasil, dan keputusan lama tetap tersimpan dan dapat dipulihkan.</p>${open.length ? `<h3>Serah terima ${open.length} pekerjaan</h3><ul class="plan-list">${open.map(t => `<li>${esc(t.title)}<small>${statuses[t.status]}</small></li>`).join('')}</ul>` : '<p class="op-muted">Tidak ada pekerjaan terbuka yang perlu diserahkan.</p>'}<label class="op-field">${open.length ? 'Serahkan pekerjaan ke' : 'Pengganti (opsional)'}<select name="handoverTo" ${open.length ? 'required' : ''}>${open.length ? '' : '<option value="">Tanpa pengganti</option>'}${targets.map(a => `<option value="${a.id}">${esc(a.name)} — ${esc(a.role)}</option>`).join('')}</select></label>${field('Alasan arsip', 'reason', 'Contoh: Peran digabung ke pelaksana lain.', '', true, 2000)}${save('Arsipkan anggota')}`, async data => {
      await command({ type: 'agent-archive', id, reason: data.get('reason'), ...(data.get('handoverTo') ? { handoverTo: data.get('handoverTo') } : {}) }); dialog.close(); notify(`${agent.name} diarsipkan.`);
    });
  }
  function restoreAgent(id: string) {
    const archived = state!.archivedAgents?.find(a => a.id === id); if (!archived) return;
    modal(`Pulihkan ${archived.name}`, `<p class="modal-intro">${esc(archived.name)} kembali menjadi pelaksana aktif. Pekerjaan yang sudah diserahkan tetap pada penerimanya.</p>${save('Pulihkan anggota')}`, async () => { await command({ type: 'agent-restore', id }); dialog.close(); notify(`${archived.name} dipulihkan.`); });
  }
  function divisionNotes(s: State, divisionId: string) {
    const notes = (s.divisionNotes || []).filter(n => n.divisionId === divisionId).slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return `<div class="op-section-title"><h2>Catatan diskusi</h2>${button(icon('plus') + ' Tambah catatan', 'note-add', divisionId, true)}</div><div class="op-notice"><p><strong>Belum terhubung ke AI</strong>Catatan ditulis Founder dan disimpan lokal. Agent belum membaca atau membalas catatan ini.</p></div>${notes.length ? `<ol class="event-list division-notes">${notes.map(n => `<li><i></i><div><p class="preserve">${esc(n.text)}</p><time>${stamp(n.createdAt)}</time></div></li>`).join('')}</ol>` : empty('Belum ada catatan diskusi.', 'Simpan arahan, keputusan rapat, atau ide untuk tim ini agar mudah ditemukan lagi.')}`;
  }
  function addNote(divisionId: string) {
    modal('Tambah catatan diskusi', `${field('Catatan', 'text', 'Tulis arahan, hasil diskusi, atau ide untuk divisi ini.', '', true, 5000)}${save('Simpan catatan')}`, async data => { await command({ type: 'division-note', divisionId, text: data.get('text') }); dialog.close(); notify('Catatan disimpan.'); });
  }
  function divisionWorkspace(s: State) {
    const division = s.divisions[0];
    if (!division) return empty('Divisi tidak ditemukan.', 'Kembali ke daftar divisi.', '<button class="op-button" data-view="team">Buka divisi</button>');
    const tools = divisionTools(s), pending = s.decisions.filter(d => d.status === 'pending'), activity = divisionOverview(s);
    const open = s.tasks.filter(t => !['done', 'cancelled'].includes(t.status)), manager = s.agents.find(a => a.id === division.managerId);
    if (divisionSection === 'members') return divisionMembers(s);
    if (divisionSection === 'work') return workBoard(s);
    if (divisionSection === 'chat') return divisionNotes(s, division.id);
    if (divisionSection === 'results') return resultsBoard(s, pending.length);
    if (divisionSection === 'setup') return `<div class="division-setup">${sopPanel(s, division.id)}<section><div class="op-section-title"><h2>Alur kerja</h2></div><dl class="division-facts"><div><dt>Perusahaan</dt><dd>${esc(division.company || state!.business.name)}</dd></div><div><dt>Manager</dt><dd>${esc(manager?.name || 'Belum ditentukan')}</dd></div><div><dt>Pelaksanaan</dt><dd>${tools.workflows ? 'Monitoring n8n; tidak menjalankan ulang atau mengubah workflow.' : tools.production ? 'Produksi recap melalui Codex dan Remotion.' : 'Tugas lokal; pelaksanaan dicatat manual.'}</dd></div></dl><h3>Alur bawaan</h3><p class="op-muted">${tools.production ? 'Chapter → naskah → review manager → audio → editing → QC → keputusan Founder. Tanpa VO unggahan, hasil masih berupa preview tanpa suara.' : tools.workflows ? 'SOP eksekusi berada di n8n. Kael membaca status, riwayat, dan error; insiden agent ditangani melalui ruang medis.' : 'Tujuan, pembagian tugas, dan kriteria selesai disimpan pada setiap briefing dan mengikuti SOP divisi di atas.'}</p><nav class="work-tools">${!tools.workflows && !tools.production ? '<button class="op-button" data-division-view="briefs">Lihat briefing</button>' : ''}<button class="op-button" data-view="builder">Atur tim melalui Builder</button></nav></section><section><div class="op-section-title"><h2>Integrasi divisi</h2></div>${s.workflowBindings?.length ? s.workflowBindings.map(b => `<button class="integration-row" data-action="workflow-open" data-id="${b.workflowId}">${icon('workflow')}<span><strong>${esc(b.workflowName)}</strong><small>${esc(s.agents.find(a => a.id === b.agentId)?.name)} · ${esc(workflowActivity(s, b.agentId)?.text || 'Status belum tersedia')}</small></span>${icon('arrow')}</button>`).join('') : '<p class="op-muted">Belum ada workflow n8n terhubung ke divisi ini.</p>'}<p class="op-muted setup-note">Provider/model per agent diatur di bagian Anggota. Telegram manager belum tersedia.</p></section></div>`;
    return `<div class="division-summary-strip"><span class="division-status activity-${activity.kind}">${esc(activity.text)}</span><span>${s.agents.length} anggota</span><span>${tools.workflows ? s.workflowBindings!.length + ' workflow' : open.length + ' tugas terbuka'}</span><button data-division-view="decisions">${pending.length} keputusan menunggu ${icon('arrow')}</button></div><div class="division-work-layout"><section><div class="op-section-title"><h2>${tools.workflows ? 'Monitoring workflow' : tools.production ? 'Produksi chapter' : 'Pekerjaan tim'}</h2></div><p class="division-summary-copy">${tools.workflows ? 'Periksa eksekusi dan error workflow yang menjadi tanggung jawab tim ini.' : tools.production ? 'Upload bahan, ikuti pekerjaan tim, lalu tinjau preview sebelum memberi keputusan.' : 'Mulai dari briefing dengan tujuan dan kriteria selesai yang jelas.'}</p><nav class="work-tools"><button class="op-button primary" data-section="work">${tools.workflows ? 'Buka workflow' : tools.production ? 'Buka produksi' : 'Buka pekerjaan'} ${icon('arrow')}</button>${!tools.workflows && !tools.production ? button('Buat briefing', 'new-brief') : ''}</nav>${activeWork(s, true)}${pending.length ? `<div class="op-section-title"><h2>Menunggu keputusan</h2></div>${pending.slice(0, 3).map(d => `<button class="attention-row" data-action="decision-detail" data-id="${d.id}"><strong>${esc(d.title)}</strong><small>Tinjau rencana atau hasil ${icon('arrow')}</small></button>`).join('')}` : ''}</section><aside class="division-manager"><div class="op-section-title"><h2>Manager</h2></div>${manager ? `<button class="member division-member" data-action="agent-detail" data-id="${manager.id}"><span class="member-avatar manager">${esc(manager.name.slice(0, 1))}</span><span><strong>${esc(manager.name)}</strong><small>${esc(manager.role)}</small></span>${icon('arrow')}</button>` : '<p class="op-muted">Manager belum ditentukan.</p>'}<button class="op-button" data-section="members">Lihat ${s.agents.length} anggota ${icon('arrow')}</button></aside></div>`;
  }
  function briefCard(s: State, id: string) { const b = s.briefs.find(b => b.id === id)!; const ts = s.tasks.filter(t => t.briefId === b.id); return `<article class="brief-card"><div class="card-top"><span>${esc(s.divisions.find(d => d.id === b.divisionId)?.name)}</span>${badge(b.status)}</div><h3>${esc(b.title)}</h3><p>${esc(b.goal)}</p><div class="brief-progress"><span>${ts.filter(t => t.status === 'done').length} / ${ts.length} hasil diterima</span><time>${stamp(b.createdAt)}</time></div>${button('Buka briefing →', 'brief-detail', b.id)}</article>`; }
  function briefs(s: State) { return `<div class="op-section-title"><h2>Briefing & tujuan</h2><span>${s.briefs.length} briefing</span></div>${s.briefs.length ? `<div class="brief-grid">${s.briefs.map(b => briefCard(s, b.id)).join('')}</div>` : empty('Apa yang ingin tim kerjakan?', 'Mulai dengan satu tujuan yang jelas. Tugas tidak dapat dimulai sebelum rencananya kamu setujui.', button('Buat briefing', 'new-brief', '', true))}`; }
  function tasks(s: State) {
    const manual = s.tasks.filter(t => !s.productionTaskIds?.includes(t.id) && !s.productions?.some(p => p.taskId === t.id));
    const selected = manual.filter(t => filter === 'all' || t.status === filter);
    return `<div class="op-section-title"><h2>Antrean pekerjaan</h2><label class="filter-label">Status <select id="task-filter"><option value="all">Semua status</option>${Object.entries(statuses).filter(([key]) => ['queued', 'running', 'blocked', 'paused', 'review', 'approval', 'done', 'cancelled'].includes(key)).map(([key, value]) => `<option value="${key}" ${filter === key ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div>${selected.length ? `<div class="task-list">${selected.map(t => `<button class="task-row" data-action="task-detail" data-id="${t.id}"><span class="task-check">${t.status === 'done' ? '✓' : '○'}</span><span class="task-info"><strong>${esc(t.title)}</strong><small>${esc(s.briefs.find(b => b.id === t.briefId)?.title)} · ${esc(agentName(t))}${t.reason ? ` · ${esc(t.reason)}` : ''}</small></span>${badge(t.status)}<span>↗</span></button>`).join('')}</div>` : empty('Belum ada tugas di antrean ini.', s.tasks.length ? 'Pilih status lain untuk melihat pekerjaan.' : 'Daftar pekerjaan akan muncul setelah kamu membuat briefing.')}`;
  }
  function decisions(s: State) {
    const pending = s.decisions.filter(d => d.status === 'pending'), history = s.decisions.filter(d => d.status !== 'pending');
    const row = (d: Decision) => {
      const context = decisionContext(s, d.id), division = s.divisions.find(v => v.id === context?.brief?.divisionId), manager = s.agents.find(a => a.id === division?.managerId);
      return `<button class="approval-row" data-action="decision-detail" data-id="${d.id}"><span><small>${d.type === 'plan' ? 'Rencana kerja' : d.type === 'guidance' ? 'Butuh arahan' : 'Hasil v' + d.version} · ${esc(division?.name || 'Divisi belum tersedia')}${manager ? ' · ' + esc(manager.name) : ''}</small><strong>${esc(d.title)}</strong><span>${esc(d.note || (d.type === 'plan' ? 'Tinjau tujuan dan pembagian pekerjaan.' : 'Tinjau versi hasil sebelum mengambil keputusan.'))}</span></span>${badge(d.status)}${icon('arrow')}</button>`;
    };
    return `<div class="op-section-title"><h2>Menunggu keputusan</h2><span>${pending.length} menunggu</span></div><label class="approval-scope">Divisi<select id="decision-division"><option value="">Semua divisi</option>${state!.divisions.map(d => `<option value="${d.id}" ${selectedDivisionId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>${pending.length ? `<div class="approval-list">${pending.map(row).join('')}</div>` : empty('Tidak ada keputusan menunggu.', 'Permintaan persetujuan rencana dan hasil akan muncul di sini.')}<details class="approval-history"><summary>Riwayat keputusan <span>${history.length}</span></summary>${history.length ? `<div class="approval-list">${history.map(row).join('')}</div>` : '<p class="op-muted">Belum ada keputusan yang dijawab.</p>'}</details>`;
  }
  function team(s: State) {
    const divisions = findDivisions(s, teamQuery), q = teamQuery.trim();
    return `<div class="team-toolbar"><label class="search-field">${icon('search')}<input id="team-search" type="search" placeholder="Cari divisi, perusahaan, atau anggota…" aria-label="Cari divisi, perusahaan, atau anggota" value="${esc(teamQuery)}"/></label><span role="status">${divisions.length} dari ${s.divisions.length} divisi</span>${q ? '<button class="op-button" data-action="clear-team-search">Hapus pencarian</button>' : ''}</div>${divisions.length ? `<div class="team-grid">${divisions.map(d => {
      const ds = divisionState(s, d.id), manager = ds.agents.find(a => a.id === d.managerId), activity = divisionOverview(ds);
      return `<article class="team-card"><div class="team-card-heading"><div><h3>${esc(d.name)}</h3><p>${esc(d.company || s.business.name)}</p></div><button class="op-button" data-action="division-workspace" data-id="${d.id}" aria-label="Buka divisi ${esc(d.name)}">Buka divisi ${icon('arrow')}</button></div><div class="team-card-meta"><span>Manager <strong>${esc(manager?.name || 'Belum ditentukan')}</strong></span><span>${ds.agents.length} anggota</span><span class="division-status activity-${activity.kind}">${esc(activity.text)}</span></div><details class="team-members" data-division="${d.id}"><summary>Lihat anggota ${icon('arrow')}</summary>${ds.agents.map(a => `<button class="member" data-action="agent-detail" data-id="${a.id}"><span class="member-avatar ${a.manager ? 'manager' : ''}">${esc(a.name.slice(0, 1).toUpperCase())}</span><span><strong>${esc(a.name)}${a.manager ? ' · Manager' : ''}</strong><small>${esc(a.role)}</small></span><span class="member-state">${esc(agentActivity(ds, a).text)}</span></button>`).join('')}</details></article>`;
    }).join('')}</div>` : empty(q ? 'Tidak ada divisi yang cocok.' : 'Belum ada divisi.', q ? 'Coba nama perusahaan, divisi, anggota, atau peran lain.' : 'Mulai dari satu divisi. Tim lainnya bisa ditambahkan kapan saja melalui Builder.', q ? '<button class="op-button" data-action="clear-team-search">Hapus pencarian</button>' : '<button class="op-button primary" data-view="builder">Bentuk divisi</button>')}`;
  }
  function business(s: State) {
    return `<div class="settings-layout"><section class="settings-section"><div class="op-section-title"><h2>Profil workspace</h2>${button('Edit profil', 'edit-business')}</div><h3>${esc(s.business.name)}</h3><dl class="division-facts"><div><dt>Pelanggan sasaran</dt><dd class="preserve">${esc(s.business.audience || 'Belum ditentukan.')}</dd></div><div><dt>Fakta & aturan</dt><dd class="preserve">${esc(s.business.facts || 'Belum diisi. Tambahkan fakta produk, gaya bahasa, dan batas pekerjaan tim.')}</dd></div></dl><p class="op-muted">Jangan menyimpan API key atau kata sandi dalam profil bisnis.</p></section>
    <section class="settings-section"><div class="op-section-title"><h2>Koneksi & alat</h2></div><button class="integration-row" data-view="workflows">${icon('workflow')}<span><strong>Monitoring n8n</strong><small>${s.workflowBindings?.length || 0} workflow terdaftar · buka untuk memeriksa status koneksi</small></span>${icon('arrow')}</button><button class="integration-row" data-action="division-room" data-id="server">${icon('server')}<span><strong>Obsidian</strong><small>Belum terhubung · lihat ruang server</small></span>${icon('arrow')}</button><button class="integration-row" data-view="builder">${icon('builder')}<span><strong>Builder</strong><small>Konfigurasi tim dan akses sesi Codex</small></span>${icon('arrow')}</button></section>
    <section class="settings-section"><div class="op-section-title"><h2>Tujuan salin konteks</h2>${button('Ubah tujuan', 'provider')}</div><p><strong>${s.provider === 'manual' ? 'Belum dipilih' : esc(s.provider)}</strong></p><p class="op-muted">Pilihan ini hanya menentukan tujuan konteks tugas manual. Tidak melakukan login atau memilih model agent. Runtime produksi memiliki koneksi terpisah.</p></section>
    <section class="settings-section"><div class="op-section-title"><h2>Data workspace</h2>${button('Unduh JSON', 'backup')}</div><p class="op-muted">Ekspor struktur tim, tugas, dan keputusan lokal. File media produksi, kredensial, dan pemulihan otomatis tidak termasuk.</p></section></div>`;
  }
  function newDivision() { modal('Bentuk divisi', `<p class="modal-intro">Mulai dengan satu manager khusus dan satu pelaksana. Nama dan peran ini menjadi konteks kerja; koneksi AI belum aktif.</p>${field('Nama divisi', 'name', 'Contoh: Produk & Pengembangan', '', false, 80)}<div class="form-columns">${field('Nama manager', 'manager', 'Contoh: Arka', '', false, 80)}${field('Nama pelaksana', 'worker', 'Contoh: Bayu', '', false, 80)}</div>${field('Tanggung jawab pelaksana', 'role', 'Contoh: Pengembangan web dan aplikasi', '', false, 150)}${save('Bentuk divisi')}`, async data => { await command({ type: 'division', ...Object.fromEntries(data) }); dialog.close(); view = 'team'; render(); notify('Divisi dan dua peran berhasil disimpan.'); }); }
  function newBrief() {
    if (!state!.divisions.some(d => d.managerId && !isWorkflowDivision(state!, d.id))) { newDivision(); notify('Bentuk divisi dengan manager dahulu untuk briefing manual.'); return; }
    const draft: Record<string, string> = { divisionId: selectedDivisionId }; let step = 1;
    function show() {
      const s = state!;
      if (step === 2 && !draft.criteria) { const divisionId = draft.divisionId || s.divisions.find(d => d.managerId && !isWorkflowDivision(s, d.id))?.id || '', sop = latestSop(s, divisionId); if (sop) { draft.criteria = sop.criteria; draft.sopNote = `Diisi dari SOP v${sop.version}; ubah bila perlu.`; } }
      const content = step === 1 ? `${field('Apa judul pekerjaan ini?', 'title', 'Contoh: Paket konten pengenalan Kael AI', draft.title, false, 160)}${field('Tujuan yang ingin dicapai', 'goal', 'Jelaskan kebutuhan, sasaran, dan batas pekerjaan.', draft.goal, true)}` : step === 2 ? `${field('Seperti apa hasil yang dianggap selesai?', 'criteria', 'Contoh: 5 draft caption; hanya memakai fakta produk yang tersedia; belum dipublikasikan.', draft.criteria, true)}${draft.sopNote ? `<p class="op-muted">${esc(draft.sopNote)}</p>` : ''}<label class="op-field">Divisi penanggung jawab<select name="divisionId" required>${s.divisions.filter(d => d.managerId && !isWorkflowDivision(s, d.id)).map(d => `<option value="${d.id}" ${draft.divisionId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : `<p class="modal-intro">Satu tugas per baris. Daftar ini kamu susun sendiri, belum merupakan rekomendasi AI.</p>${field('Daftar tugas', 'tasks', 'Rangkum fakta produk\nTulis draft materi\nSiapkan paket hasil', draft.tasks, true, 2800)}<label class="op-field">Pelaksana<select name="agentId">${s.agents.filter(a => !a.manager && a.divisionId === draft.divisionId && !s.workflowBindings?.some(b => b.agentId === a.id)).map(a => `<option value="${a.id}">${esc(a.name)} — ${esc(a.role)}</option>`).join('')}</select></label><div class="op-notice"><p>Draft disimpan dahulu. Setelah ditinjau, ajukan rencana ke daftar keputusan.</p></div>`;
      modal(`Briefing baru · ${step} / 3`, `<div class="wizard-steps"><i class="active"></i><i class="${step >= 2 ? 'active' : ''}"></i><i class="${step >= 3 ? 'active' : ''}"></i></div>${content}<div class="modal-footer">${step > 1 ? '<button class="op-button" type="button" data-modal-action="back">Kembali</button>' : '<span>Mulai dari tujuan.</span>'}<button class="op-button primary" type="submit">${step === 3 ? 'Simpan draft briefing' : 'Lanjut →'}</button></div>`, async data => {
        Object.assign(draft, Object.fromEntries(data));
        if (step < 3) { step++; show(); return; }
        const { sopNote: _note, ...input } = draft; await command({ ...input, type: 'brief', tasks: draft.tasks.split('\n').map(x => x.trim()).filter(Boolean) }); dialog.close(); selectedDivisionId = draft.divisionId; view = 'briefs'; render(); notify('Draft briefing disimpan. Tinjau dan ajukan rencananya.');
      }, () => { const form = dialog.querySelector('form')!; Object.assign(draft, Object.fromEntries(new FormData(form))); step--; show(); });
    } show();
  }
  function briefDetail(id: string) { const s = state!, b = s.briefs.find(b => b.id === id)!; modal(b.title, `<div class="modal-badges">${badge(b.status)}</div><h3>Tujuan</h3><p class="preserve">${esc(b.goal)}</p><h3>Kriteria selesai</h3><p class="preserve">${esc(b.criteria)}</p><h3>Pembagian pekerjaan</h3><ol class="plan-list">${s.tasks.filter(t => t.briefId === id).map(t => `<li><strong>${esc(t.title)}</strong><small>${esc(agentName(t))} · ${statuses[t.status]}</small></li>`).join('')}</ol>${b.status === 'draft' ? save('Ajukan rencana') : '<p class="op-muted">Tinjau persetujuan di bagian Keputusan dan pelaksanaan di bagian Pekerjaan.</p>'}`, b.status === 'draft' ? async () => { await command({ type: 'submit-plan', id }); dialog.close(); view = 'decisions'; render(); notify('Rencana menunggu persetujuan Founder.'); } : undefined); }
  let watchedTask = '';
  dialog.addEventListener('close', () => { watchedTask = ''; });
  function taskDetail(id: string) {
    const s = state!, t = s.tasks.find(t => t.id === id);
    if (!t) { notify('Tugas tidak lagi tersedia. Muat ulang daftar pekerjaan.'); return; }
    const b = s.briefs.find(b => b.id === t.briefId);
    if (!b) { notify('Briefing tugas belum tersedia. Periksa data workspace.'); return; }
    const episode = s.productions?.find(p=>p.taskId===id);
    if(episode){selectedDivisionId=episode.divisionId;productionUI.select(episode.id);view='production';showOperations();return;}
    const item = workItems(s).find(w => w.key === `manual:${id}`);
    if (!item) { notify('Tugas ini berasal dari produksi yang diarsipkan. Buka daftar pekerjaan terbaru.'); return; }
    const startAllowed = !s.incidents?.some(i => i.agentId === t.agentId && !i.resolvedAt) && !s.facilitySessions?.some(v => v.status === 'active' && v.participantIds.includes(t.agentId)) && !s.tasks.some(other => other.agentId === t.agentId && other.id !== id && other.status === 'running');
    const history = s.events.filter(e => e.targetId === id || e.targetId === b.id).slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const actions = b.status !== 'approved' ? '<p class="op-muted">Pekerjaan hanya dapat dimulai setelah rencana disetujui.</p>' : `<div class="task-actions">${['queued', 'paused', 'blocked'].includes(t.status) && !activeRun(s, id) ? `<button type="button" class="op-button primary" data-modal-action="start" ${startAllowed ? '' : 'disabled'}>Mulai / lanjutkan manual</button>` : ''}${t.status === 'running' && !activeRun(s, id) ? '<button type="button" class="op-button primary" data-modal-action="result">Masukkan hasil</button><button type="button" class="op-button" data-modal-action="hold">Jeda / butuh informasi</button>' : ''}${t.status === 'review' ? '<button type="button" class="op-button primary" data-modal-action="review">Periksa hasil secara manual</button>' : ''}</div>`;
    modal(t.title, `${workSummary(item)}${aiPanel(s, t, b.status === 'approved')}${actions}<div class="task-actions">${item.decisionId ? '<button type="button" class="op-button primary" data-modal-action="decision">Tinjau keputusan</button>' : ''}<button class="op-button" type="button" data-modal-action="brief">Buka briefing</button><button class="op-button" type="button" data-modal-action="context">Konteks untuk AI</button>${s.incidents?.some(i => i.agentId === t.agentId && !i.resolvedAt) ? '<button class="op-button" type="button" data-modal-action="health">Lihat insiden agent</button>' : ''}</div><h3>Hasil kerja & versi</h3>${t.results.length ? `<div class="result-version-links">${t.results.slice().reverse().map(r => `<button class="op-button" type="button" data-modal-action="preview-${r.version}">Preview v${r.version}${r.version === t.results.length ? ' · terbaru' : ''}</button>`).join('')}</div>` : '<p class="op-muted">Belum ada hasil tersimpan.</p>'}<div class="task-actions">${canReviseResult(s, id) ? '<button class="op-button" type="button" data-modal-action="revise">Minta versi baru</button>' : ''}${!['done', 'cancelled'].includes(t.status) && !activeRun(s, id) ? '<button class="op-button danger" type="button" data-modal-action="cancel">Batalkan pekerjaan</button>' : ''}</div><details class="work-history"><summary>Riwayat pekerjaan (${history.length})</summary>${history.length ? `<ol class="event-list">${history.map(e => `<li><div><p>${esc(e.message)}</p><time>${stamp(e.at)}</time></div></li>`).join('')}</ol>` : '<p class="op-muted">Belum ada aktivitas tersimpan untuk pekerjaan ini.</p>'}</details>`, undefined, async action => {
      try {
        if (/^preview-\d+$/.test(action)) { manualResult(id, Number(action.slice(8))); return; }
        if (action === 'revise') { requestRevision(id); return; }
        if (action === 'cancel') { cancelTask(id); return; }
        if (action === 'decision' && item.decisionId) { decisionDetail(item.decisionId); return; }
        if (action === 'brief') { briefDetail(b.id); return; }
        if (action === 'health') { dialog.close(); enterRoom('meeting-alt'); healthModal(t.agentId); return; }
        if (action === 'start') { busy = true; await command({ type: 'start', id }); taskDetail(id); notify('Tugas dimulai secara manual; tidak ada panggilan AI otomatis.'); }
        if (action === 'context') contextModal(id);
        if (action === 'ai-run') { busy = true; await runtimeRequest('/api/runtime/start', id); taskDetail(id); notify('Tugas masuk antrean AI. Hasil akan menunggu pemeriksaan.'); }
        if (action === 'ai-cancel') { busy = true; await runtimeRequest('/api/runtime/cancel', id); taskDetail(id); notify('Run AI dihentikan. Hasil lama tetap tersimpan.'); }
        if (action === 'agent-setup') { agentSettings(t.agentId); return; }
        if (action === 'result') modal('Masukkan hasil kerja', `<p class="modal-intro">Simpan teks hasil yang benar-benar sudah dibuat. Hasil akan menunggu pemeriksaan sebelum diteruskan ke Founder.</p>${field('Isi hasil', 'content', 'Tempel draft, laporan, atau hasil kerja di sini.', '', true, 50000)}${save('Simpan hasil untuk diperiksa')}`, async data => { await command({ type: 'result', id, content: data.get('content') }); taskDetail(id); notify('Versi hasil disimpan.'); });
        if (action === 'hold') modal('Jeda pekerjaan', `<label class="op-field">Keadaan<select name="status"><option value="paused">Dijeda</option><option value="blocked">Butuh informasi</option></select></label>${field('Alasan dan informasi yang diperlukan', 'reason', 'Jelaskan agar pekerjaan bisa dilanjutkan nanti.', '', true, 2000)}${save('Simpan keadaan')}`, async data => { await command({ type: 'hold', id, ...Object.fromEntries(data) }); taskDetail(id); });
        if (action === 'review') reviewTask(id);
      } catch (e) { dialog.querySelector('.form-error')!.textContent = e instanceof Error ? e.message : 'Gagal.'; } finally { busy = false; }
    });
    watchedTask = activeRun(s, id) ? id : '';
  }
  function contextModal(id: string) { const context = contextFor(state!, id); modal('Konteks siap dibawa', `<p class="modal-intro">Salin ke ${state!.provider === 'manual' ? 'layanan AI pilihanmu' : esc(state!.provider)}. Tidak ada pesan yang dikirim otomatis.</p><label class="op-field">Konteks tugas<textarea readonly rows="14" id="context-text">${esc(context)}</textarea></label><div class="task-actions"><button type="button" class="op-button primary" data-modal-action="copy">Salin konteks</button><button type="button" class="op-button" data-modal-action="download">Unduh .txt</button></div>`, undefined, async action => { if (action === 'download') download(context, 'kael-konteks.txt', 'text/plain'); else { try { await navigator.clipboard.writeText(context); notify('Konteks disalin. Belum dikirim ke layanan AI.'); } catch { (dialog.querySelector('#context-text') as HTMLTextAreaElement).select(); notify('Teks dipilih. Tekan Ctrl+C untuk menyalin.'); } } }); }
  function decisionDetail(id: string, initialOutcome = 'approved') {
    const s = state!, context = decisionContext(s, id);
    if (!context) { notify('Keputusan tidak tersedia.'); return; }
    const { decision: d, task: t, brief: b, result, production, canDecide, readOnlyReason } = context;
    if (production) {
      const version = production.versions.find(v => v.resultVersion === d.version);
      if (version) { dialog.close(); openProduction(production.id, version.version); notify('Keputusan produksi diberikan melalui preview dan QC versi terkait.'); return; }
    }
    const division = s.divisions.find(v => v.id === b?.divisionId);
    const outcome = d.type === 'guidance' || initialOutcome === 'revision' ? 'revision' : 'approved';
    modal(d.title, `<div class="modal-badges">${badge(d.status)}<span>${esc(division?.name || 'Divisi belum tersedia')}${d.type !== 'plan' ? ' · v' + d.version : ' · Rencana kerja'}</span></div><p class="modal-intro">Persetujuan ini menerima rencana atau versi hasil yang ditampilkan. Tidak mengirim, membayar, atau memublikasikan apa pun.</p><h3>Tujuan & kriteria selesai</h3><p class="preserve">${esc(b?.goal || 'Briefing belum tersedia.')}\n\n${esc(b?.criteria || '')}</p>${d.type !== 'plan' ? `<h3>Hasil v${d.version}</h3>${result ? `<pre class="result-text-preview">${esc(result.content)}</pre>` : '<p class="op-muted">Versi hasil tidak tersedia.</p>'}` : `<ol class="plan-list">${s.tasks.filter(t => t.briefId === b?.id).map(t => `<li>${esc(t.title)}<small>${esc(agentName(t))}</small></li>`).join('')}</ol>`}${d.note ? `<h3>Catatan keputusan</h3><p class="preserve">${esc(d.note)}</p>` : ''}<p class="op-muted">Permintaan dibuat ${stamp(d.createdAt)}.</p>${canDecide ? `${d.type === 'result' ? `<label class="result-reviewed"><input name="reviewed" type="checkbox" required value="${d.version}"><span>Saya sudah meninjau hasil v${d.version} dan kriteria selesai.</span></label>` : ''}<label class="op-field">Keputusan<select name="outcome">${d.type !== 'guidance' ? '<option value="approved">Setujui</option>' : ''}${d.type !== 'plan' ? `<option value="revision" ${outcome === 'revision' ? 'selected' : ''}>Minta revisi dengan arahan</option>` : ''}<option value="rejected">Tolak</option></select></label><label class="op-field">Catatan (wajib untuk penolakan atau revisi)<textarea name="note" maxlength="5000" rows="3" ${outcome !== 'approved' ? 'required' : ''}></textarea></label>${save('Simpan keputusan Founder')}` : `<div class="op-notice"><p>${esc(readOnlyReason)}</p></div>`}`, canDecide ? async data => {
      const fresh = decisionContext(state!, id);
      if (!fresh?.canDecide || fresh.decision.version !== d.version) throw new Error('Keputusan atau versi hasil telah berubah. Buka kembali detail terbaru.');
      await command({ type: 'decide', id, outcome: data.get('outcome'), note: data.get('note') }); dialog.close(); render(); notify('Keputusan Founder tersimpan untuk versi yang ditinjau.');
    } : undefined);
  }
  function download(content: string, name: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function changeWorkflowFilter(input: HTMLInputElement | HTMLSelectElement) {
    const key = input.dataset.workflowKey!, field = input.dataset.workflowFilter!;
    if (!state?.workflowBindings?.some(b => b.workflowId === key) || !['query', 'status', 'from', 'to'].includes(field)) return;
    workflowFilters[key] = { ...workflowFilters[key], [field]: input.value, page: 1 }; render();
  }
  host.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.workFilter === 'query') { workFilter.query = input.value.slice(0, 160); workFilter.page = 1; render(true); return; }
    if (input.id === 'results-search') { resultQuery = input.value.slice(0, 160); resultPage = 1; render(true); return; }
    if (input.dataset.workflowFilter === 'query') changeWorkflowFilter(input);
  });
  host.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    if (input.id === 'work-division' || input.id === 'decision-division') { selectedDivisionId = state?.divisions.some(d => d.id === input.value) ? input.value : ''; workFilter.page = 1; render(); return; }
    if (input.dataset.workFilter === 'source' || input.dataset.workFilter === 'status') {
      const key = input.dataset.workFilter, values = key === 'source' ? workSources : workStatuses;
      workFilter[key] = input.value === 'all' || Object.hasOwn(values, input.value) ? input.value : 'all'; workFilter.page = 1; render(); return;
    }
    if (input.id === 'task-filter') { filter = input.value; render(); }
    if (input.hasAttribute('data-workflow-picker')) { selectedWorkflowId = input.value; render(); }
    if (input.dataset.workflowFilter && input.dataset.workflowFilter !== 'query') changeWorkflowFilter(input);
  });
  host.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button'); if (!target || busy) return;
    if (target.dataset.workPage) {
      const id = target.id; workFilter.page = Number(target.dataset.workPage); render();
      const control = host.querySelector<HTMLButtonElement>(`#${id}`);
      (control && !control.disabled ? control : host.querySelector<HTMLElement>('#work-results-count'))?.focus({ preventScroll: true }); return;
    }
    if (target.dataset.resultPage) {
      const id = target.id; resultPage = Number(target.dataset.resultPage); render();
      const control = host.querySelector<HTMLButtonElement>(`#${id}`);
      (control && !control.disabled ? control : host.querySelector<HTMLElement>('#result-count'))?.focus({ preventScroll: true }); return;
    }
    if (target.dataset.section) { openDivisionSection(target.dataset.section as DivisionSection); return; }
    if (target.dataset.homeNotification) { const item = workspaceNotifications(state).find(n => n.id === target.dataset.homeNotification); if (item) activateNotification(item); return; }
    if (target.dataset.workflowReset) { delete workflowFilters[target.dataset.workflowReset]; render(); return; }
    if (target.dataset.workflowPage) {
      const key = target.dataset.workflowKey!, direction = target.dataset.workflowDirection;
      workflowFilters[key] = { ...workflowFilters[key], page: Number(target.dataset.workflowPage) }; render();
      const controls = [...host.querySelectorAll<HTMLButtonElement>(`button[data-workflow-key="${CSS.escape(key)}"][data-workflow-direction]`)];
      (controls.find(b => b.dataset.workflowDirection === direction && !b.disabled) || controls.find(b => !b.disabled))?.focus({ preventScroll: true }); return;
    }
    if (target.dataset.view) { selectedDivisionId = ''; selectedWorkflowId = ''; view = target.dataset.view as View; render(); window.scrollTo(0, 0); return; }
    if (target.dataset.divisionView && selectedDivisionId) { view = target.dataset.divisionView as View; selectedWorkflowId = ''; if (view === 'production' && !state?.productions?.some(p => p.id === productionUI.selection().episodeId && p.divisionId === selectedDivisionId)) productionUI.select(''); render(); window.scrollTo(0, 0); return; }
    const { action, id = '' } = target.dataset;
    if (action === 'work-reset') { workFilter = {}; if (view === 'activity') selectedDivisionId = ''; render(); host.querySelector<HTMLElement>('#work-search')?.focus(); return; }
    if (action === 'work-detail' && state) { workDetail(id); return; }
    if (action === 'results-reset') { resultQuery = ''; resultPage = 1; render(); host.querySelector<HTMLElement>('#results-search')?.focus(); return; }
    if (action === 'result-open' && state) { openResult(id); return; }
    if (action === 'notifications') { notifications.open = true; notificationList.querySelector<HTMLElement>('button')?.focus(); return; }
    if (action === 'clear-team-search') { teamQuery = ''; render(); host.querySelector<HTMLElement>('#team-search')?.focus(); return; }
    if (action === 'retry') void load();
    if (action === 'office') { enterRoom('all'); return; }
    if (action === 'founder') { enterRoom('founder'); return; }
    if (action === 'medical') { enterRoom('meeting-alt'); return; }
    if (!state) return;
    if (action === 'production-open') { openProduction(id); return; }
    if (action === 'workflow-open') { const binding = state.workflowBindings?.find(b => b.workflowId === id), agent = state.agents.find(a => a.id === binding?.agentId); if (binding && agent) { selectedDivisionId = agent.divisionId; selectedWorkflowId = id; view = 'workflows'; showOperations(); window.scrollTo(0, 0); } return; }
    if (action === 'division-workspace') { openDivision(id); return; }
    if (action === 'division-room') { enterRoom(id); return; }
    if (action === 'agent-detail') openAgent(id);
    if (action === 'sop-edit') { sopEditor(id); return; }
    if (action === 'agent-settings') { agentSettings(id); return; }
    if (action === 'agent-archive') { archiveAgent(id); return; }
    if (action === 'agent-restore') { restoreAgent(id); return; }
    if (action === 'note-add') { addNote(id); return; }
    if (action === 'new-division') newDivision();
    if (action === 'new-brief') newBrief();
    if (action === 'brief-detail') briefDetail(id);
    if (action === 'task-detail') taskDetail(id);
    if (action === 'decision-detail') decisionDetail(id);
    if (action === 'backup') { download(JSON.stringify(state, null, 2), `kael-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); notify('Backup JSON siap di folder unduhan.'); }
    if (action === 'edit-business') modal('Pengetahuan bisnis', `${field('Nama bisnis', 'name', '', state.business.name, false, 120)}${field('Pelanggan sasaran', 'audience', '', state.business.audience, true, 2000)}${field('Fakta bisnis, sumber & aturan kerja', 'facts', 'Jangan masukkan kata sandi atau API key.', state.business.facts, true, 20000)}${save()}`, async data => { await command({ type: 'business', ...Object.fromEntries(data) }); dialog.close(); notify('Profil bisnis disimpan.'); });
    if (action === 'provider') modal('Pilih tujuan konteks', `<p class="modal-intro">Pilihan ini hanya menyiapkan konteks untuk disalin. Tidak ada koneksi, login, atau biaya AI dari aplikasi.</p><label class="op-field">Layanan<select name="provider">${['manual', 'Claude', 'Codex', 'Hermes'].map(p => `<option ${state!.provider === p ? 'selected' : ''} value="${p}">${p === 'manual' ? 'Belum dipilih' : p}</option>`).join('')}</select></label>${save()}`, async data => { await command({ type: 'provider', provider: data.get('provider') }); dialog.close(); });
  });
  showOperations(); void load();
  let pollingBuilder = false;
  setInterval(async () => {
    if (pollingBuilder || document.hidden || !state) return;
    pollingBuilder = true;
    try {
      const response = await fetch('/api/builder-status', { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Status sesi tidak tersedia.');
      syncBuilder(await response.json() as BuilderPresence);
    } catch { if (state?.builderChat?.connection === 'online') syncBuilder({ ...state.builderChat, connection: 'disconnected' }); }
    finally { pollingBuilder = false; }
  }, 2000);
  // Refresh an open task while its AI run is active, so the result appears without reopening.
  setInterval(async () => {
    if (!watchedTask || !dialog.open || busy || document.hidden) return;
    try { const latest = await fetchState(); if (latest.revision !== state?.revision) { const id = watchedTask; state = latest; render(); if (dialog.open && watchedTask === id) taskDetail(id); } } catch { /* the main poller reports connection errors */ }
  }, 3000);
  setInterval(async () => { if (dialog.open || busy || document.hidden || document.activeElement?.matches('input,textarea,select,[contenteditable]')) return; try { const latest = await fetchState(); if (latest.revision !== state?.revision || JSON.stringify(latest.n8n) !== JSON.stringify(state?.n8n) || JSON.stringify(latest.productions) !== JSON.stringify(state?.productions) || JSON.stringify(latest.builderChat) !== JSON.stringify(state?.builderChat) || error) { state = latest; error = ''; render(); } } catch { if (!error) { if (state?.builderChat) state.builderChat = { ...state.builderChat, connection: 'disconnected' }; error = 'Koneksi server lokal terputus. Data terakhir tetap ditampilkan; tindakan belum disimpan sampai server kembali tersedia.'; render(); } } }, 5000);
}




