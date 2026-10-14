import './style.css';
import { createOffice } from './office';
import { mountOperations } from './operations';
import './redesign.css';
import './dashboard.css';
import type { State } from './domain';
import { facilityLayouts } from './layout';
import { workflowCard } from './workflows';
import { serverAgent, medicalPatients } from './facilities';
import { characterLook, agentActivity } from './visuals';
import { workflowManagerActivity } from './n8n';
import { builderAgent, builderChatLink } from './builder-room';
import { icon } from './ui-icons';
const rooms = [{ id: 'founder', name: 'Founder / Kael', floor: 'Lantai 01', people: 1 }];
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <button class="skip-link" id="skip-content">Lewati navigasi</button>
  <header class="header">
    <a class="brand" href="/" aria-label="Kael AI beranda"><span class="brand-mark">k<span>·</span></span><span>kael<span class="brand-ai">AI</span><small>VIRTUAL OFFICE</small></span></a>
    <div class="breadcrumb">Workspace ${icon('arrow')} <strong id="page-crumb">Meja Founder</strong></div>
    <div class="header-right"><span class="prototype"><i></i> Mode simulasi</span><time id="local-time"></time><span class="avatar-small">K</span></div>
  </header>
  <div class="workspace">
    <aside class="sidebar" aria-label="Navigasi utama">
      <div class="workspace-switch"><span class="mini-logo" id="workspace-initial">K</span><span><span id="workspace-name">Kantor</span><small>Workspace pribadi</small></span></div>
      <div class="sidebar-heading"><span>Workspace</span></div>
      <button class="overview" id="overview">${icon('layers')}<span>Kantor virtual</span></button>
      <details class="office-navigation" name="office-navigation"><summary>Ruangan kantor <span>⌄</span></summary><div class="office-navigation-content">
      ${rooms.map(room => `<button class="room-nav selected" aria-current="true" data-room="${room.id}"><span class="room-icon">${icon('office')}</span><span>${room.name}<small>Founder office</small></span><i class="status-dot"></i></button>`).join('')}
      <div id="division-rooms"></div></div></details>
      <details class="office-navigation" name="office-navigation"><summary>Fasilitas & server <span>⌄</span></summary><div class="office-navigation-content" id="facility-rooms">${facilityLayouts.map(r => `<button class="room-nav facility-nav" data-room="${r.id}"><span class="room-icon">${icon(r.kind)}</span><span>${r.name}<small>${r.kind === 'builder' ? '1 Builder · AI studio' : r.kind === 'server' ? 'Obsidian belum terhubung' : `${r.capacity} tempat`}</small></span></button>`).join('')}</div></details>
    </aside>
    <main class="main">
      <div class="room-heading"><div><div class="eyebrow">WORKSPACE / 01</div><h1>Founder office<span>.</span></h1><p>Tempat visi dimulai.</p></div><div class="office-room-controls"><label for="room-select">Ruangan</label><select id="room-select"><option value="founder">Founder office</option><option value="all">Semua ruangan</option></select><div class="room-meta">1 karakter</div></div></div>
      <div class="agent-navigation" role="group" aria-label="Navigasi agent"><button id="agent-previous" aria-label="Agent sebelumnya" title="Agent sebelumnya">${icon('previous')}</button><label for="agent-select">Agent<select id="agent-select"><option value="founder">Kael · Founder</option></select></label><button id="agent-next" aria-label="Agent berikutnya" title="Agent berikutnya">${icon('arrow')}</button><button id="agent-profile" aria-label="Buka profil agent">${icon('person')}<span>Profil</span></button></div>
      <div id="facility-session-strip" class="facility-session-strip" hidden></div>
      <section class="scene-shell" aria-label="Kantor Founder 3D">
        <div id="scene" tabindex="0" role="region" aria-label="Tampilan 3D. Seret untuk geser, klik kanan untuk putar, scroll untuk zoom. Gunakan tombol kamera untuk alternatif keyboard."></div>
        <div class="scene-top"><span class="scene-tag"><i></i> FOUNDER / KAEL</span><div class="scene-actions"><button class="day-button" id="motion-toggle" aria-pressed="false">Jeda gerak</button><button class="day-button" id="day-toggle" aria-label="Aktifkan suasana malam" aria-pressed="false">${icon('sun')}<span>Siang</span></button></div></div>
        <div id="scene-state" class="scene-state" role="status"><span class="loader"></span>Menyiapkan ruangan Kael…</div>
        <button id="kael-label" class="agent-label agent-bubble" aria-label="Lihat detail Kael"><strong>Kael</strong><em>FOUNDER</em><span class="bubble-activity" id="founder-label-activity">Fokus · Simulasi</span></button>
        <span class="scene-legend">Sesi lokal · AI belum terhubung</span>
        <div class="scene-caption"><span class="caption-line"></span><span>THE FOUNDER'S ROOM<small>Bangun. Pimpin. Berkembang.</small></span></div>
        <div class="camera-tools" aria-label="Kontrol kamera"><button id="zoom-in" aria-label="Perbesar" title="Perbesar">${icon('plus')}</button><button id="zoom-out" aria-label="Perkecil" title="Perkecil">${icon('minus')}</button><span></span><button id="rotate" aria-label="Putar kamera" title="Putar kamera">${icon('rotate')}</button><button id="reset" aria-label="Reset kamera" title="Reset kamera">${icon('focus')}</button></div>
        <div class="scene-help">Seret untuk geser <b>·</b> Klik kanan untuk putar <b>·</b> Scroll untuk zoom</div>
        <button class="detail-open" id="detail-open">${icon('person')} Detail Kael ${icon('arrow')}</button>
      </section>
      <footer class="workspace-footer"><span><i></i> Kael Office <span class="footer-divider">/</span> Visualisasi lokal</span><span>Dirancang untuk bertumbuh <span class="tiny-spark">✳</span></span></footer>
    </main>
    <aside class="details" id="details" aria-label="Detail Founder" tabindex="-1">
      <div class="detail-heading"><span>PENGHUNI RUANGAN</span><button id="close-details" aria-label="Tutup detail">${icon('close')}</button></div>
      <div class="profile-art"><img id="profile-portrait" alt="Karakter Kael di kantor"/><span class="founder-badge" id="profile-badge">FOUNDER</span></div>
      <div class="profile-title"><h2 id="profile-name">Kael</h2><span class="status-pill" id="status-pill"><i></i> Fokus</span></div>
      <p class="profile-role" id="profile-role">Founder & Visionary</p><p class="profile-desc" id="profile-desc">Menentukan arah, merangkai ide, dan membangun masa depan Kael AI.</p>
      <div class="detail-separator"></div><dl class="profile-facts"><div><dt>Divisi</dt><dd id="profile-division">Founder</dd></div><div><dt>Ruangan</dt><dd id="profile-room">Founder office</dd></div><div><dt>Koneksi agen</dt><dd class="muted" id="profile-connection">Belum terhubung</dd></div></dl>
      <section id="profile-n8n" hidden></section><p id="profile-outfit" class="profile-outfit"></p><section id="profile-tasks" class="profile-tasks" hidden><h3>Pekerjaan anggota</h3><div id="profile-task-list"></div></section><button id="profile-work" class="profile-link" hidden>Buka pekerjaan →</button>
      <button id="profile-health" class="profile-link" hidden>Catat error</button>
      <div id="profile-builder-chat" class="profile-builder-chat" hidden><button class="op-button primary" data-open-builder>Diskusi & usulan</button>${builderChatLink()}<small>Karakter mengikuti giliran Builder yang aktif.</small></div>
      <div class="status-editor"><label>Status karakter <span>SIMULASI</span></label><div class="segmented" role="group" aria-label="Status simulasi Kael"><button data-status="focus" aria-pressed="true">Fokus</button><button data-status="idle" aria-pressed="false">Santai</button><button data-status="offline" aria-pressed="false">Offline</button></div><p id="status-description" role="status">Kael sedang menyusun ide di meja kerja.</p></div>
      <button id="focus-kael" class="focus-button">${icon('focus')} <span id="profile-focus-text">Fokus ke Kael</span></button>
      <div class="integration-note"><span>○</span><p>Profil karakter kantor.<small>Status kerja berasal dari pencatatan lokal. Gerak karakter merupakan simulasi.</small></p></div>
    </aside>
  </div>`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const details = $('#details');
const profileBackdrop = document.createElement('button'); profileBackdrop.className = 'profile-backdrop'; profileBackdrop.hidden = true; profileBackdrop.tabIndex = -1; profileBackdrop.setAttribute('aria-label', 'Tutup profil'); document.body.append(profileBackdrop);
let previousFocus: HTMLElement | null = null;
let restoreFounderProfile = () => {};
function updateProfileModal() {
  const modal = details.classList.contains('open') && window.innerWidth < 1251;
  profileBackdrop.hidden = !modal; document.body.classList.toggle('profile-modal', modal);
  details.setAttribute('role', modal ? 'dialog' : 'complementary'); details.toggleAttribute('aria-modal', modal);
  if (modal) details.setAttribute('aria-modal', 'true');
  document.querySelectorAll<HTMLElement>('.header,.sidebar,.main,#operations').forEach(el => { el.inert = modal; });
}
function openProfilePanel() { previousFocus = document.activeElement as HTMLElement; details.classList.add('open'); $('.workspace').classList.add('profile-open'); updateProfileModal(); $('#close-details').focus(); }
function openDetails() { if ($('.workspace').classList.contains('division-view')) window.dispatchEvent(new CustomEvent('kael:select-room', { detail: 'founder' })); restoreFounderProfile(); openProfilePanel(); }
function closeDetails() { details.classList.remove('open'); $('.workspace').classList.remove('profile-open'); updateProfileModal(); if (previousFocus?.isConnected && previousFocus.tabIndex >= 0 && previousFocus.getClientRects().length) previousFocus.focus(); else $('#room-select').focus(); }
profileBackdrop.onclick = closeDetails; window.addEventListener('resize', updateProfileModal);
window.addEventListener('kael:close-profile', () => { if (details.classList.contains('open')) closeDetails(); });
$('#kael-label').onclick = openDetails;
$('#detail-open').onclick = openDetails;
$('#close-details').onclick = closeDetails;
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && details.classList.contains('open')) closeDetails();
  if (event.key !== 'Tab' || details.getAttribute('aria-modal') !== 'true') return;
  const buttons = [...details.querySelectorAll<HTMLElement>('button:not([hidden]),a[href],select,[tabindex="0"]')].filter(el => el.getClientRects().length);
  const first = buttons[0], last = buttons.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
const updateClock = () => { $('#local-time').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace('.', ':') + ' WIB'; };
updateClock(); setInterval(updateClock, 60_000);

try {
  const office = createOffice($('#scene'), $('#kael-label'), openDetails);
  let founderPreview = '', founderPreviewAt = 0, founderPreviewTime = '', founderPreviewSize = '';
  let previewResizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(previewResizeTimer);
    previewResizeTimer = setTimeout(() => window.dispatchEvent(new Event('kael:preview-request', { cancelable: true })), 150);
  });
  window.addEventListener('kael:preview-request', event => {
    const image = document.querySelector<HTMLImageElement>('#founder-office-preview');
    if (!image) return;
    const frame = image.parentElement!;
    if (!frame.clientWidth || !frame.clientHeight) return;
    const scale = Math.min(1.5, 1600 / frame.clientWidth);
    const width = Math.max(1, Math.round(frame.clientWidth * scale)), height = Math.max(1, Math.round(frame.clientHeight * scale));
    const dimensions = `${width}x${height}`;
    event.preventDefault();
    try {
      if (!founderPreview || founderPreviewSize !== dimensions || performance.now() - founderPreviewAt > 15000) {
        founderPreview = office.preview(width, height); founderPreviewAt = performance.now(); founderPreviewSize = dimensions;
        founderPreviewTime = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
      }
      image.src = founderPreview; image.hidden = false;
      document.querySelector<HTMLElement>('#founder-preview-loading')!.hidden = true;
      document.querySelector<HTMLElement>('#founder-preview-time')!.textContent = `Cuplikan ${founderPreviewTime} WIB`;
    } catch { document.querySelector<HTMLElement>('#founder-preview-loading')!.textContent = 'Cuplikan belum tersedia. Buka ruang Kael untuk melihat kantor.'; }
  });
  let latestState: State | null = null, selectedProfile = 'founder', founderStatus: 'focus' | 'idle' | 'offline' = 'focus';
  let selectedAgent = 'founder';
  document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('.agent-navigation button,.agent-navigation select').forEach(control => control.disabled = true);
  const roster = () => [{ id: 'founder', name: 'Kael', role: 'Founder' }, ...(latestState?.agents || []), serverAgent, builderAgent];
  function jumpToAgent(id: string) {
    const agent = roster().find(a => a.id === id); if (!agent) return;
    selectedAgent = id;
    const patient = latestState && medicalPatients(latestState).find(p => p.agent.id === id);
    const session = latestState?.facilitySessions?.find(s => s.status === 'active' && s.participantIds.includes(id));
    window.dispatchEvent(new CustomEvent('kael:select-room', { detail: patient && patient.bedIndex >= 0 ? 'meeting-alt' : session?.roomId || ('divisionId' in agent ? agent.divisionId : 'founder') }));
    if (id === 'founder') office.focus(); else office.focusAgent(id);
    $<HTMLSelectElement>('#agent-select').value = id;
    $('#agent-profile').setAttribute('aria-label', `Buka profil ${agent.name}`);
  }
  function cycleAgent(direction: number) {
    const members = roster(), index = Math.max(0, members.findIndex(a => a.id === selectedAgent));
    jumpToAgent(members[(index + direction + members.length) % members.length].id);
  }
  $('#agent-previous').onclick = () => cycleAgent(-1);
  $('#agent-next').onclick = () => cycleAgent(1);
  $('#agent-select').onchange = event => jumpToAgent((event.target as HTMLSelectElement).value);
  $('#agent-profile').onclick = () => selectedAgent === 'founder' ? openDetails() : window.dispatchEvent(new CustomEvent('kael:profile', { detail: selectedAgent }));
  function showProfile(id = 'founder') {
    const isBuilder = id === builderAgent.id;
    const agent = isBuilder ? builderAgent : id === serverAgent.id ? serverAgent : latestState?.agents.find(a => a.id === id), division = isBuilder ? { id: 'builder', name: 'Builder studio' } : id === serverAgent.id ? { id: 'server', name: 'Server & Obsidian' } : latestState?.divisions.find(d => d.id === agent?.divisionId);
    if (id !== 'founder' && (!agent || !division)) return;
    selectedProfile = id;
    selectedAgent = id; $<HTMLSelectElement>('#agent-select').value = id;
    $('#agent-profile').setAttribute('aria-label', `Buka profil ${agent?.name || 'Kael'}`);
    const binding = latestState?.workflowBindings?.find(b => b.agentId === id), snapshot = latestState?.n8n?.find(w => w.workflowId === binding?.workflowId);
    const supervision = latestState && workflowManagerActivity(latestState, id);
    const monitored = binding ? [binding] : supervision ? latestState!.workflowBindings!.filter(b => latestState!.agents.some(a => a.id === b.agentId && a.divisionId === agent!.divisionId)) : [];
    const openedRuns = new Set([...$('#profile-n8n').querySelectorAll<HTMLDetailsElement>('.workflow-run[open]')].map(e => e.dataset.execution));
    const focusedRun = document.activeElement?.closest<HTMLElement>('[data-execution]')?.dataset.execution;
    const focusedLink = document.activeElement?.tagName === 'A';
    $('#profile-n8n').hidden = !monitored.length; $('#profile-n8n').innerHTML = monitored.map(b => workflowCard(latestState!, b, true)).join('');
    $('#profile-n8n').querySelectorAll<HTMLDetailsElement>('.workflow-run').forEach(e => { if (openedRuns.has(e.dataset.execution)) e.open = true; if (focusedRun === e.dataset.execution) e.querySelector<HTMLElement>(focusedLink ? 'a' : 'summary')?.focus({ preventScroll: true }); });
    const kaelach = /kaelach/i.test(division?.name || '');
    const production = latestState?.productions?.find(p=>p.divisionId===division?.id);
    $('#profile-connection').textContent = supervision ? 'n8n · ' + supervision.text : binding ? snapshot?.connection === 'online' && Date.now() - Date.parse(snapshot.checkedAt) <= 20000 ? 'n8n · Terpantau' : 'n8n · Belum tersinkron' : id === serverAgent.id ? 'Obsidian · Belum terhubung' : production ? 'Codex · Produksi' : kaelach ? 'Codex · lihat Produksi' : 'AI belum terhubung';
    $('#profile-work').hidden = !agent || id === serverAgent.id;
    $('#profile-work').textContent = 'Buka ruang kerja divisi →';
    const name = agent?.name || 'Kael';
    $('#profile-name').textContent = name; $('#profile-role').textContent = agent ? agent.role : 'Founder & Visionary';
    $('#profile-badge').textContent = id === serverAgent.id ? 'KNOWLEDGE' : agent ? agent.manager ? 'MANAGER' : 'AGENT' : 'FOUNDER';
    $('#profile-desc').textContent = supervision ? 'Mengawasi agent dan workflow divisi, memantau progres serta error, dan menjadi perantara laporan kepada Founder.' : binding ? 'Mewakili ' + binding.workflowName + '. Status dan riwayat dibaca dari n8n; pekerjaan serta aturan akses tetap dikelola workflow.' : id === serverAgent.id ? 'Penjaga pengetahuan kantor. Disiapkan untuk mengelola catatan dan hubungan antar-catatan saat Obsidian terhubung. Saat ini belum menjalankan sinkronisasi atau AI.' : agent ? agent.manager ? 'Membagi pekerjaan, memeriksa hasil, dan melapor kepada Founder.' : 'Mengerjakan tugas yang ditugaskan dan menyerahkan hasil untuk diperiksa manager.' : 'Menentukan arah, merangkai ide, dan membangun masa depan Kael AI.';
    $('.integration-note small').textContent = supervision ? 'Pantauan memakai data n8n divisi ini. Chat manager Telegram dan perbaikan otomatis belum terhubung.' : binding ? 'Status kerja dibaca dari n8n. Gerak santai hanya visual dan tidak mengubah workflow.' : id === serverAgent.id ? 'Obsidian belum terhubung. Nate boleh bersantai secara visual tanpa menyinkronkan vault.' : kaelach ? 'Tahap produksi dan percakapan berasal dari runner Codex. Buka Produksi untuk koneksi, preview dan keputusan.' : 'Status kerja berasal dari pencatatan lokal. Gerak karakter merupakan visualisasi.';
    const session = latestState?.facilitySessions?.find(s => s.status === 'active' && s.participantIds.includes(id));
    const patient = latestState && medicalPatients(latestState).find(p => p.agent.id === id);
    $('#profile-division').textContent = division?.name || 'Founder'; $('#profile-room').textContent = patient ? patient.bedIndex >= 0 ? 'Menuju / di ruang medis' : 'Antrean ruang medis' : id === serverAgent.id ? 'Ruang server' : facilityLayouts.find(r => r.id === session?.roomId)?.name || division?.name || 'Founder office';
    $('#profile-health').hidden = !agent || isBuilder; $('#profile-health').textContent = patient ? '⚠ Tinjau error & pemulihan' : 'Catat error';
    const look = agent ? characterLook(division!.name, agent, id === serverAgent.id || isBuilder ? 3 : latestState!.agents.filter(a => a.divisionId === division!.id && !a.manager).findIndex(a => a.id === id)) : null;
    $('#profile-outfit').textContent = look?.description ?? 'Robot charcoal · Ear pods · LED visor';
    const image = $<HTMLImageElement>('#profile-portrait'); image.src = office.portrait(id); image.alt = `Karakter ${name}, tampilan yang dipakai di kantor`;
    $('.status-editor').hidden = !!agent; $('#profile-tasks').hidden = !agent || !!monitored.length;
    const statusText = agent ? agentActivity(latestState!, agent).text : { focus: 'Fokus · Simulasi', idle: 'Santai · Simulasi', offline: 'Offline · Simulasi' }[founderStatus];
    $('#status-pill').replaceChildren(document.createElement('i'), document.createTextNode(statusText));
    $('#status-pill').dataset.status = agent ? agentActivity(latestState!, agent).kind : founderStatus;
    $('#profile-task-list').replaceChildren();
    if (agent) {
      const tasks = (latestState?.tasks || []).filter(t => t.agentId === agent.id);
      for (const task of tasks) { const row = document.createElement('p'); row.textContent = task.title; const small = document.createElement('small'); small.textContent = { queued: 'Antrean', running: 'Dikerjakan manual', review: 'Review', approval: 'Menunggu Founder', done: 'Selesai', cancelled: 'Dibatalkan', blocked: 'Butuh informasi', paused: 'Dijeda' }[task.status] || task.status; row.append(small); $('#profile-task-list').append(row); }
      if(production){const row=document.createElement('p');row.textContent=production.title;const small=document.createElement('small');small.textContent=production.activeAgentId===id ? production.stage+' · Codex' : production.stage;row.append(small);$('#profile-task-list').prepend(row);}
      if (!tasks.length&&!production) $('#profile-task-list').textContent = id === serverAgent.id ? 'Menunggu Obsidian. Graph di monitor masih contoh visual, bukan isi vault kamu.' : 'Belum ada tugas untuk anggota ini.';
    }
    $('#profile-focus-text').textContent = `Fokus ke ${name}`;
    $('#profile-builder-chat').hidden = !isBuilder;
    if (isBuilder) {
      $('#profile-connection').textContent = 'Builder · Diskusi web / coding agent';
      $('#profile-badge').textContent = 'BUILDER';
      $('#profile-desc').textContent = 'Menyusun usulan tim dan SOP bersama Founder melalui diskusi web atau sesi coding agent. Ruangan mengikuti preset kantor. Kembali bekerja saat giliran aktif dan bersantai setelah selesai.';
      $('.integration-note small').textContent = 'Aktivitas mengikuti giliran Builder yang aktif. Tinjau usulan di halaman Builder sebelum menerapkan.';
      $('#profile-work').hidden = true; $('#profile-tasks').hidden = true;
    }
    details.setAttribute('aria-label', `Profil ${name}`);
  }
  restoreFounderProfile = () => showProfile(); showProfile();
  window.addEventListener('kael:profile', event => {
    const id = (event as CustomEvent<string>).detail, agent = id === builderAgent.id ? builderAgent : id === serverAgent.id ? serverAgent : latestState?.agents.find(a => a.id === id); if (!agent || !latestState) return;
    const patient = latestState && medicalPatients(latestState).find(p => p.agent.id === id);
    const session = latestState?.facilitySessions?.find(s => s.status === 'active' && s.participantIds.includes(id));
    window.dispatchEvent(new CustomEvent('kael:select-room', { detail: patient && patient.bedIndex >= 0 ? 'meeting-alt' : session?.roomId || agent.divisionId }));
    showProfile(id); openProfilePanel();
  });
  $('#profile-work').onclick = () => { closeDetails(); const agent = latestState?.agents.find(a => a.id === selectedProfile); window.dispatchEvent(new CustomEvent(agent ? 'kael:division-workspace' : 'kael:view', { detail: agent ? agent.divisionId : 'tasks' })); };
  $('#profile-health').onclick = () => { closeDetails(); window.dispatchEvent(new CustomEvent('kael:health', { detail: selectedProfile })); };
  $('#scene-state').hidden = true;
  $('#zoom-in').onclick = () => office.zoom(1.2);
  $('#zoom-out').onclick = () => office.zoom(1 / 1.2);
  $('#rotate').onclick = office.rotate;
  let motionPaused = false;
  $('#motion-toggle').onclick = () => { motionPaused = !motionPaused; office.pauseMotion(motionPaused); $('#motion-toggle').setAttribute('aria-pressed', String(motionPaused)); $('#motion-toggle').textContent = motionPaused ? 'Lanjut gerak' : 'Jeda gerak'; };
  $('#reset').onclick = () => $('#room-select').dispatchEvent(new Event('change'));
  $('#overview').onclick = office.overview;
  $('[data-room="founder"]').onclick = office.reset;
  window.addEventListener('kael:state', event => {
    const state = (event as CustomEvent<State>).detail; latestState = state; office.syncTeams(state);
    $('#workspace-name').textContent = state.business.name;
    $('#workspace-initial').textContent = state.business.name.slice(0, 1).toUpperCase();
    $('#profile-builder-chat').innerHTML = '<button class="op-button primary" data-open-builder>Diskusi & usulan</button>' + builderChatLink(state.builderChat) + '<small>Karakter mengikuti sesi Builder yang dihubungkan.</small>';
    document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('.agent-navigation button,.agent-navigation select').forEach(control => control.disabled = false);
    const agentSelect = $<HTMLSelectElement>('#agent-select');
    const members = roster(), signature = members.map(a => `${a.id}/${a.name}/${a.role}`).join('|');
    if (agentSelect.dataset.roster !== signature) {
      agentSelect.replaceChildren(...members.map(a => new Option(`${a.name} · ${a.role}`, a.id)));
      agentSelect.dataset.roster = signature; agentSelect.value = selectedAgent;
    }
    $('.scene-legend').textContent = state.productions?.length ? 'Codex · Produksi'+(state.workflowBindings?.length?' · n8n':'')+' · Gerak visual' : state.workflowBindings?.length ? 'n8n · Polling ±5 dtk · Gerak visual' : 'Sesi lokal · AI belum terhubung';
    const select = $<HTMLSelectElement>('#room-select'), current = select.value;
    select.replaceChildren(new Option('Semua ruangan', 'all'), new Option('Founder office', 'founder'), ...state.divisions.map(d => new Option(d.name, d.id)), ...facilityLayouts.map(d => new Option(d.name, d.id)));
    select.value = current || 'founder';
    if (details.classList.contains('open')) showProfile(selectedProfile);
  });
  $('#room-select').onchange = event => window.dispatchEvent(new CustomEvent('kael:select-room', { detail: (event.target as HTMLSelectElement).value }));
  window.addEventListener('kael:room', event => {
    const { id, name, count } = (event as CustomEvent<{ id: string; name: string; count: number }>).detail;
    if (id === 'all') office.overview(); else if (id === 'founder') office.reset(); else office.frameRoom(id);
    $('.room-heading h1').textContent = name;
    const facility = facilityLayouts.find(r => r.id === id);
    $('.room-heading p').textContent = facility ? facility.description : latestState?.divisions.find(d => d.id === id)?.company ? latestState.divisions.find(d => d.id === id)!.company! + ' · Satu agent per workflow n8n' : id === 'founder' ? 'Tempat visi dimulai.' : 'Ruang kerja tim, tersusun bersama kantor.';
    $('.room-meta').textContent = facility ? facility.kind === 'builder' ? '1 Builder · AI studio' : facility.kind === 'server' ? 'Infrastruktur · Lokal' : facility.kind === 'medical' ? '4 kasur · Pemulihan agent' : `${facility.capacity} tempat · Fasilitas bersama` : `${count} karakter · Kantor lokal`;
    $('.scene-tag').textContent = name.toUpperCase();
    $('.scene-shell').setAttribute('aria-label', `Kantor 3D: ${name}`);
    $('.scene-caption').hidden = id !== 'founder';
    $('.workspace').classList.toggle('division-view', id !== 'founder');
    $('#details').classList.remove('open');
    $('.workspace').classList.remove('profile-open');
    updateProfileModal();
    if (id === 'founder') restoreFounderProfile();
    $<HTMLSelectElement>('#room-select').value = id;
  });
  $('#focus-kael').onclick = () => { if (selectedProfile === 'founder') office.focus(); else office.focusAgent(selectedProfile); if (window.innerWidth < 1251) closeDetails(); };
  let night = false;
  $('#day-toggle').onclick = () => { night = !night; office.setNight(night); $('#day-toggle').innerHTML = icon(night ? 'moon' : 'sun') + `<span>${night ? 'Malam' : 'Siang'}</span>`; $('#day-toggle').setAttribute('aria-pressed', String(night)); $('#day-toggle').setAttribute('aria-label', `Aktifkan suasana ${night ? 'siang' : 'malam'}`); $('.scene-shell').classList.toggle('night', night); };
  const states = { focus: ['Fokus', 'Kael sedang menyusun ide di meja kerja.'], idle: ['Santai', 'Kael beristirahat sejenak di area sofa.'], offline: ['Offline', 'Kael sedang tidak berada di ruangan.'] };
  document.querySelectorAll<HTMLButtonElement>('.segmented [data-status]').forEach(button => button.onclick = () => {
    const status = button.dataset.status as keyof typeof states;
    founderStatus = status;
    office.setStatus(status);
    document.querySelectorAll('.segmented [data-status]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#status-pill').innerHTML = `<i></i> ${states[status][0]}`;
    $('#status-pill').dataset.status = status;
    $('#status-description').textContent = states[status][1];
    $('#kael-label').dataset.status = status;
    $('#founder-label-activity').textContent = `${states[status][0]} · Simulasi`;
    $('.room-nav').dataset.status = status;
  });
} catch (error) {
  console.error(error);
  $('#scene-state').innerHTML = `<strong>Tampilan 3D belum bisa dibuka.</strong><span>Aktifkan akselerasi grafis browser, lalu coba lagi.</span><button id="retry">Coba lagi</button>`;
  $('#retry').onclick = () => location.reload();
  $('#kael-label').hidden = true;
  $('.agent-navigation').hidden = true;
}
mountOperations();

