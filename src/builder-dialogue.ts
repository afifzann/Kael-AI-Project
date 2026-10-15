import type { State } from './domain';
import { runtimeFor } from './runtime-status';
import type { BuilderDiscussion, BuilderProposal } from './builder-model';
import { builderCanEdit } from './builder-model';
import './builder-dialogue.css';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function createBuilderDialogueUI(getState: () => State | null, notify: (message: string) => void) {
  let discussions: BuilderDiscussion[] = [], selected = '', loaded = false, loading = false, error = '', message = '', starting = false;
  let draft: BuilderProposal | null = null, draftId = '', draftVersion = 0, dirty = false, startOpen = false;
  let targetId = '', provider = '', model = '', host: HTMLElement | null = null, repaint = () => {};
  let messageScroll = 0, nearEnd = true, webMode = false, hideConfirm = false, manualOpen = false;
  const current = () => discussions.find(d => d.id === selected);
  const refreshView = () => { if (host?.querySelector('#builder-chat')) repaint(); };
  function select(id: string) { hideConfirm = false; selected = id; draft = null; draftId = ''; dirty = false; message = ''; error = ''; messageScroll = 0; nearEnd = true; }
  async function refresh() {
    if (loading) return; loading = true;
    try {
      const response = await fetch('/api/builder-discussions', { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Draft Builder belum dapat dimuat. Coba hubungkan kembali.');
      const data = await response.json(); const changed = JSON.stringify(discussions) !== JSON.stringify(data.discussions);
      discussions = data.discussions; loaded = true; error = '';
      if (!current()) select(discussions[0]?.id || '');
      if (changed && !dirty && !host?.querySelector('#builder-chat')?.contains(document.activeElement)) refreshView();
    } catch (e) { error = e instanceof Error ? e.message : 'Server belum terhubung.'; }
    finally { loading = false; }
  }
  async function request(action: string, extra: Record<string, unknown> = {}, version = current()?.version) {
    if (starting) return; starting = true; error = ''; refreshView();
    try {
      const response = await fetch('/api/builder-discussions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: selected, version, ...extra }), signal: AbortSignal.timeout(15000) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Perubahan belum tersimpan. Muat ulang sebelum mencoba lagi.');
      discussions = data.discussions; loaded = true;
      if (action === 'start') { select(discussions[0].id); startOpen = false; }
      if (action === 'hide') { select(discussions[0]?.id || ''); startOpen = false; notify('Usulan dihapus dari daftar riwayat.'); }
      if (action === 'message') message = '';
      if (action === 'save') { dirty = false; draft = null; notify('Perubahan usulan tersimpan. Belum diterapkan.'); }
      if (action === 'apply') { notify('Tim dan SOP diterapkan. Pekerjaan belum dimulai.'); window.dispatchEvent(new CustomEvent('kael:builder-applied')); }
    } catch (e) { error = e instanceof Error ? e.message : 'Server belum terhubung. Muat ulang sebelum mencoba lagi.'; }
    finally { starting = false; refreshView(); host?.querySelector<HTMLElement>(error ? '.builder-chat-error' : '#builder-chat-message')?.focus(); }
  }
  function field(name: string, label: string, value: string, max: number, rows = 0) {
    return `<label for="builder-draft-${name}">${label}${rows ? `<textarea id="builder-draft-${name}" name="${name}" rows="${rows}" maxlength="${max}" required>${esc(value)}</textarea>` : `<input id="builder-draft-${name}" name="${name}" value="${esc(value)}" maxlength="${max}" required>`}</label>`;
  }
  function preview(d: BuilderDiscussion) {
    if (!d.proposal) return '<aside class="builder-chat-preview"><h3>Preview usulan</h3><p>Nama, pembagian tugas, SOP dan kebutuhan ruangan akan muncul setelah tujuanmu cukup jelas.</p></aside>';
    if (!draft || draftId !== d.id || !dirty && draftVersion !== d.version) { draft = structuredClone(d.proposal); draftId = d.id; draftVersion = d.version; }
    const p = draft, locked = ['working', 'applied', 'cancelled'].includes(d.status) || starting;
    const stale = d.baseRevision !== getState()?.revision;
    return `<aside class="builder-chat-preview"><div class="op-section-title"><h3>Preview usulan</h3><span>${d.status === 'applied' ? 'Diterapkan' : d.status === 'cancelled' ? 'Dibatalkan' : 'Draft'}</span></div>
      <p>Periksa nama, tugas dan SOP. Provider berikut hanya disetel untuk anggota baru; setelan anggota lama dipertahankan.</p>
      <form id="builder-draft-form"><fieldset ${locked ? 'disabled' : ''}>
      ${field('name', 'Nama divisi', p.name, 80)}${field('manager', 'Nama manager', p.manager, 80)}
      <p class="builder-manager-note">Manager mengoordinasikan, memeriksa hasil, dan melapor kepadamu.</p>
      <div class="builder-draft-members">${p.workers.map((w, i) => `<section><div class="builder-worker-heading"><strong>Pelaksana ${i + 1}${w.id ? ' · anggota lama' : ' · baru'}</strong>${!w.id && !locked && p.workers.length > 1 ? `<button type="button" data-chat-remove="${i}" aria-label="Hapus pelaksana baru ${i + 1}">Hapus</button>` : ''}</div>${field(`worker-${i}-name`, 'Nama', w.name, 80)}${field(`worker-${i}-role`, 'Tanggung jawab', w.role, 150, 2)}</section>`).join('')}</div>
      ${p.workers.length < 12 ? '<button class="op-button" type="button" data-chat-add>Tambah pelaksana</button>' : ''}
      <label for="builder-draft-provider">Pelaksanaan anggota baru<select id="builder-draft-provider" name="provider">${['manual', 'Claude', 'Codex'].map(v => `<option ${p.provider === v ? 'selected' : ''} value="${v}">${v === 'manual' ? 'Manual' : v}</option>`).join('')}</select></label>
      <label for="builder-draft-model">Model anggota baru <span>(opsional)</span><input id="builder-draft-model" name="model" value="${esc(p.model)}" maxlength="120" placeholder="Kosongkan untuk default provider"></label>
      <details class="builder-sop-fields"><summary>SOP, kriteria & batas tindakan</summary>${field('steps', 'Alur kerja & serah terima', p.steps, 10000, 6)}${field('criteria', 'Kriteria selesai', p.criteria, 5000, 3)}${field('limits', 'Batas tindakan & persetujuan', p.limits, 5000, 3)}</details>
      <div class="builder-room-note"><strong>Ruangan otomatis</strong><p>1 area manager · ${p.workers.length} meja pelaksana · sofa, penyimpanan dan jalur sirkulasi. Ukuran mengikuti jumlah anggota; furnitur dan karakter memakai preset kantor.</p></div>
      <p class="builder-draft-state" role="status">${dirty ? 'Ada perubahan yang belum disimpan.' : 'Draft tersimpan. Belum memulai pekerjaan.'}</p>
      <button type="submit" class="op-button" ${!dirty ? 'disabled' : ''}>Simpan perubahan</button>${dirty ? '<button type="button" class="op-button" data-chat-discard>Buang perubahan yang belum disimpan</button>' : ''}
      </fieldset></form>
      ${!['applied', 'cancelled'].includes(d.status) ? `<div class="builder-apply-area">${stale ? '<p>Kantor berubah setelah usulan ini dibuat. Lanjutkan diskusi untuk meninjau data terbaru sebelum menerapkan.</p>' : ''}<button class="op-button primary" data-chat-apply ${dirty || locked || stale || d.status !== 'ready' ? 'disabled' : ''}>${d.targetId ? 'Terapkan perubahan tim & SOP' : 'Buat divisi & SOP'}</button><small>Klik tombol ini menyetujui konfigurasi saja. Rencana dan hasil pekerjaan tetap membutuhkan keputusanmu.</small></div>` : `<p class="builder-finished">${d.status === 'applied' ? 'Konfigurasi sudah diterapkan. Buka Divisi untuk memeriksa tim dan membuat briefing.' : 'Usulan dibatalkan. Riwayat diskusinya tetap tersimpan.'}</p>`}</aside>`;
  }
  function render(manualContent = '') {
    const s = getState(), d = current();
    if (!provider) provider = s && runtimeFor(s, 'Claude')?.available ? 'Claude' : 'Codex';
    const start = !d || startOpen;
    const toolbar = `<div class="builder-chat-toolbar"><div><h2>Usulan Builder</h2><p>Tinjau usulan AI atau susun tim sendiri, lalu terapkan setelah siap.</p></div><div class="builder-chat-toolbar-actions">${manualContent ? `<button class="op-button ${manualOpen ? 'primary' : ''}" data-chat-manual aria-pressed="${manualOpen}" ${starting || d?.status === 'working' || dirty ? 'disabled' : ''}>${manualOpen ? 'Kembali ke usulan' : 'Susun manual'}</button>` : ''}<button class="op-button" data-chat-new ${starting || d?.status === 'working' || dirty ? 'disabled' : ''}>${!manualOpen && startOpen && d ? 'Kembali ke usulan' : 'Chat web (opsional)'}</button></div></div>`;
    if (manualOpen) return `<section id="builder-chat" class="builder-chat">${toolbar}${manualContent}</section>`;
    return `<section id="builder-chat" class="builder-chat">${toolbar}
      ${discussions.length ? `<label class="builder-discussion-picker" for="builder-discussion">Diskusi tersimpan<select id="builder-discussion" ${starting || dirty ? 'disabled' : ''}>${discussions.map(v => `<option value="${v.id}" ${selected === v.id ? 'selected' : ''}>${esc(v.proposal?.name || v.messages.find(m => m.role === 'user')?.text.slice(0, 50) || 'Diskusi baru')} · ${v.status === 'applied' ? 'Diterapkan' : v.status === 'cancelled' ? 'Dibatalkan' : v.status === 'working' ? 'AI bekerja' : 'Draft'}</option>`).join('')}</select></label>` : ''}
      ${d?.status === 'cancelled' ? `<div class="builder-history-actions">${hideConfirm ? '<p>Hapus usulan ini dari daftar riwayat? Catatan internal tetap disimpan; tim dan pekerjaan tidak berubah.</p><div class="builder-chat-actions"><button class="op-button" data-chat-hide-confirm>Ya, hapus dari riwayat</button><button class="op-button" data-chat-hide-cancel>Batal</button></div>' : '<button class="op-button" data-chat-hide>Hapus dari riwayat</button>'}</div>` : ''}
      <p class="builder-chat-error" role="alert" tabindex="-1">${esc(error || (!start && d?.error) || '')}</p>
      ${!loaded ? `<p role="status">${error ? 'Draft belum dapat dimuat.' : 'Memuat draft Builder…'}</p><button class="op-button" data-chat-reload>Muat ulang</button>` : start && !webMode ? '<p class="op-muted">Buka sesi Code pada folder kantor, ketik <strong>jadi builder</strong>, lalu diskusikan kebutuhanmu. Usulan yang dikirim sesi itu akan muncul di sini untuk ditinjau. Riwayat percakapan aslinya tetap di aplikasi AI.</p>' : start ? `<form id="builder-chat-start" class="builder-chat-start"><h3>Mulai dari kebutuhanmu</h3><label for="builder-chat-target">Bagian yang ingin dibangun<select id="builder-chat-target"><option value="">Divisi baru</option>${(s?.divisions || []).map(v => { const editable = s && builderCanEdit(s, v.id); return `<option value="${v.id}" ${targetId === v.id ? 'selected' : ''} ${!editable ? 'disabled' : ''}>Edit ${esc(v.name)}${!editable ? ' · konfigurasi khusus' : ''}</option>`; }).join('')}</select></label><label for="builder-chat-provider">AI untuk diskusi<select id="builder-chat-provider">${['Claude', 'Codex'].map(v => `<option ${provider === v ? 'selected' : ''} value="${v}">${v}${runtimeFor(s || {}, v)?.available ? ' · terhubung' : ' · belum terhubung'}</option>`).join('')}</select></label><label for="builder-chat-model">Model diskusi <span>(opsional)</span><input id="builder-chat-model" value="${esc(model)}" maxlength="120" placeholder="Default CLI, atau model yang tersedia di akunmu"></label><p>Diskusi memakai akun AI pada server. Setelan ini berlaku untuk Builder; provider tiap agent diatur melalui preview atau Anggota.</p><button class="op-button primary" type="submit" ${starting ? 'disabled' : ''}>Mulai diskusi</button></form>` : d ? `<div class="builder-chat-grid"><section class="builder-chat-conversation"><div class="builder-chat-meta"><strong>Builder · ${esc(d.provider)}${d.model ? ' · ' + esc(d.model) : ''}</strong><span>Diskusi tersimpan di kantor ini</span></div><div class="builder-chat-messages">${d.messages.map(m => `<article class="builder-chat-message ${m.role}"><strong>${m.role === 'user' ? 'Kamu' : 'Builder'}</strong><p>${esc(m.text)}</p></article>`).join('')}</div>
      ${d.status === 'working' ? '<div class="builder-chat-working" role="status">Builder sedang menyusun jawaban…<button class="op-button" data-chat-stop>Hentikan giliran</button></div>' : ''}
      ${!['applied', 'cancelled'].includes(d.status) && !d.sourceDesktop ? `<form id="builder-chat-form" class="builder-chat-composer"><label for="builder-chat-message">${d.proposal ? 'Koreksi atau lanjutkan diskusi' : 'Ceritakan kebutuhanmu'}</label><textarea id="builder-chat-message" maxlength="4000" rows="3" required ${starting || d.status === 'working' ? 'disabled' : ''} placeholder="Contoh: tim customer service untuk menjawab pertanyaan produk dan merangkum komplain.">${esc(message)}</textarea><div><small>AI membuat usulan; penerapan tetap keputusanmu.</small><button type="submit" class="op-button primary" ${starting || dirty || d.status === 'working' ? 'disabled' : ''}>Kirim</button></div></form><div class="builder-chat-actions">${d.error && d.messages.at(-1)?.role === 'user' ? '<button class="op-button" data-chat-retry>Coba lagi</button>' : ''}<button class="op-button" data-chat-reload ${dirty ? 'disabled' : ''}>Muat ulang diskusi</button><button class="op-button" data-chat-cancel ${starting || dirty || d.status === 'working' ? 'disabled' : ''}>Batalkan usulan</button></div>` : `<p class="op-muted">${d.sourceDesktop ? 'Lanjutkan diskusi di sesi Builder pada aplikasi AI. Di sini kamu meninjau atau menerapkan usulan.' : 'Diskusi ditutup. Mulai diskusi baru untuk kebutuhan berikutnya.'}</p>`}</section>${preview(d)}</div>` : ''}</section>`;
  }
  function bind(element: HTMLElement, rerender: () => void) {
    host = element; repaint = rerender;
    const messages = host.querySelector<HTMLElement>('.builder-chat-messages');
    if (messages) { messages.scrollTop = nearEnd ? messages.scrollHeight : messageScroll; messages.onscroll = () => { messageScroll = messages.scrollTop; nearEnd = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80; }; }
    const on = (selector: string, fn: () => void) => host?.querySelector(selector)?.addEventListener('click', fn);
    on('[data-chat-hide]', () => { hideConfirm = true; refreshView(); host?.querySelector<HTMLElement>('[data-chat-hide-confirm]')?.focus(); });
    on('[data-chat-hide-cancel]', () => { hideConfirm = false; refreshView(); host?.querySelector<HTMLElement>('[data-chat-hide]')?.focus(); });
    on('[data-chat-hide-confirm]', () => { if (current()?.status === 'cancelled') void request('hide'); });
    host.querySelectorAll<HTMLButtonElement>('.builder-history-actions button').forEach(b => b.disabled = starting);
    on('[data-chat-manual]', () => { if (starting || dirty || current()?.status === 'working') return; manualOpen = !manualOpen; error = ''; refreshView(); host?.querySelector<HTMLElement>(manualOpen ? '#builder-answer, [data-builder-apply]' : '[data-chat-manual]')?.focus(); });
    on('[data-chat-new]', () => { startOpen = manualOpen || !startOpen; manualOpen = false; webMode = true; error = ''; refreshView(); });
    on('[data-chat-reload]', () => { if (dirty) return; loaded = false; error = ''; draft = null; void refresh().then(refreshView); refreshView(); });
    const picker = host.querySelector<HTMLSelectElement>('#builder-discussion'); if (picker) picker.onchange = () => { select(picker.value); startOpen = false; refreshView(); };
    const startForm = host.querySelector<HTMLFormElement>('#builder-chat-start');
    if (startForm) {
      startForm.oninput = () => { targetId = startForm.querySelector<HTMLSelectElement>('#builder-chat-target')!.value; provider = startForm.querySelector<HTMLSelectElement>('#builder-chat-provider')!.value; model = startForm.querySelector<HTMLInputElement>('#builder-chat-model')!.value; };
      startForm.onsubmit = event => { event.preventDefault(); if (startForm.reportValidity()) void request('start', { targetId, provider, model }); };
    }
    const composer = host.querySelector<HTMLFormElement>('#builder-chat-form');
    if (composer) { composer.oninput = () => message = composer.querySelector<HTMLTextAreaElement>('textarea')!.value; composer.onsubmit = event => { event.preventDefault(); if (!dirty && composer.reportValidity()) void request('message', { text: message }); }; }
    on('[data-chat-stop]', () => { void request('stop'); }); on('[data-chat-retry]', () => { void request('retry'); }); on('[data-chat-cancel]', () => { void request('cancel'); }); on('[data-chat-apply]', () => { if (!dirty) void request('apply'); });
    const form = host.querySelector<HTMLFormElement>('#builder-draft-form');
    if (form) {
      form.oninput = () => {
        if (!draft) return;
        const data = new FormData(form);
        for (const name of ['name', 'manager', 'steps', 'criteria', 'limits', 'model'] as const) draft[name] = String(data.get(name) ?? '');
        draft.provider = String(data.get('provider')) as BuilderProposal['provider'];
        draft.workers.forEach((w, i) => { w.name = String(data.get(`worker-${i}-name`)); w.role = String(data.get(`worker-${i}-role`)); });
        dirty = true; const status = form.querySelector('.builder-draft-state'); if (status) status.textContent = 'Ada perubahan yang belum disimpan.';
        form.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled = false;
        host?.querySelectorAll<HTMLButtonElement>('[data-chat-apply], [data-chat-new], [data-chat-cancel], [data-chat-reload], #builder-chat-form button').forEach(b => b.disabled = true);
        if (picker) picker.disabled = true;
      };
      form.onsubmit = event => { event.preventDefault(); if (form.reportValidity()) void request('save', { proposal: draft }, draftVersion); };
      on('[data-chat-discard]', () => { draft = null; dirty = false; refreshView(); });
      on('[data-chat-add]', () => { if (draft && draft.workers.length < 12) { draft.workers.push({ id: '', name: '', role: '' }); dirty = true; refreshView(); } });
      host.querySelectorAll<HTMLButtonElement>('[data-chat-remove]').forEach(b => b.onclick = () => { if (draft && !draft.workers[Number(b.dataset.chatRemove)]?.id && draft.workers.length > 1) { draft.workers.splice(Number(b.dataset.chatRemove), 1); dirty = true; refreshView(); } });
    }
    if (!loaded && !loading && !error) void refresh().then(refreshView);
  }
  setInterval(() => { if (host?.querySelector('#builder-chat') && !document.hidden && !starting && loaded) void refresh(); }, 2000);
  return { render, bind };
}
