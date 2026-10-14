import type { Command, State } from './domain';
import { characterLook } from './visuals';
import { builderChatLink } from './builder-room';
import { createBuilderDialogueUI } from './builder-dialogue';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const lookPreview = (division: string, name: string, role: string, manager: boolean, ordinal = 0) => {
  const look = characterLook(division, { name, role, manager }, ordinal);
  return `<small class="look-preview"><i style="background:${look.color}"></i>${esc(look.description)}</small>`;
};
const questions = [
  ['Apa nama tim yang ingin kamu bentuk?', 'Contoh: YouTube Kaelach', 'Nama divisi'],
  ['Siapa yang akan menjadi manager?', 'Contoh: Damar', 'Nama manager'],
  ['Siapa agent pelaksana dan apa tugasnya?', 'Raka | Riset topik dan sumber\nNara | Menulis naskah\nMika | Konsep thumbnail dan judul', 'Nama dan tanggung jawab agent'],
];
export function createBuilder(apply: (command: Command) => Promise<void>, notify: (message: string) => void, getState: () => State | null) {
  const dialogue = createBuilderDialogueUI(getState, notify);
  const key = `kael-builder-v1:${location.pathname}`;
  let answers = ['', '', ''], step = 0, warning = '', saving = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.answers) && saved.answers.length === 3 && saved.answers.every((a: unknown) => typeof a === 'string' && a.length <= 3000) && Number.isInteger(saved.step) && saved.step >= 0 && saved.step <= 3) {
      answers = saved.answers; step = saved.step;
    }
  } catch { warning = 'Draft browser tidak dapat dibaca. Kamu dapat mulai dari awal.'; }
  let manualOpen = answers.some(Boolean);
  const workers = () => answers[2].split('\n').filter(l => l.trim()).map(line => { const [name, ...role] = line.split('|'); return { name: name.trim(), role: role.join('|').trim() }; });
  function persist() {
    try { localStorage.setItem(key, JSON.stringify({ answers, step })); warning = ''; }
    catch { warning = 'Draft belum tersimpan di browser. Tetap di halaman ini agar isian tidak hilang.'; }
  }
  function render() {
    return `<section class="builder-handoff"><div><h2>Builder di aplikasi AI</h2><p>Buka folder kantor di Code pada aplikasi Claude, buat chat, lalu ketik jadi builder. Diskusikan tim dan SOP di sesi itu; usulannya dikirim ke preview web untuk kamu putuskan. Claude memakai hook proyek; Codex membaca instruksi peran proyek.</p></div><div class="builder-handoff-actions">${builderChatLink(getState()?.builderChat)}<button class="op-button" data-builder-room>Lihat ruangan</button><button class="op-button" data-builder-handoff>Salin instruksi</button></div></section>${dialogue.render()}<details class="builder-manual" ${manualOpen?'open':''}><summary>Konfigurasi tim secara manual <span>Nama, manager & agent</span></summary><div class="builder-layout"><section class="builder-conversation"><div class="builder-mode"><div><strong>Konfigurasi manual</strong><p>Isian kamu menentukan susunan tim. Preview ditinjau sebelum disimpan.</p></div></div><div class="builder-transcript">
      ${answers.slice(0, step).map((a, i) => `<div class="builder-answer"><small>${questions[i][2]}</small><p>${esc(a)}</p><button data-builder-edit="${i}" aria-label="Ubah ${questions[i][2]}">Ubah</button></div>`).join('')}
      ${step < 3 ? `<div class="builder-message"><div><p class="builder-step">Langkah ${step + 1} dari 3</p><h2>${questions[step][0]}</h2><p>${step === 1 ? 'Manager membagi pekerjaan, memeriksa hasil, dan melapor kepadamu.' : step === 2 ? 'Satu agent per baris. Pisahkan nama dan tugas dengan tanda |. Maksimal 12 agent.' : 'Mulai dengan satu tim yang punya tujuan jelas.'}</p></div></div>` : `<div class="builder-message"><div><h2>Susunan tim siap ditinjau.</h2><p>Periksa nama dan pembagian tugas di preview. Setelah diterapkan, kamu bisa mulai membuat briefing.</p></div></div>`}
      </div><p class="builder-warning" role="status">${esc(warning)}</p>
      ${step < 3 ? `<form id="builder-form" class="builder-composer"><label for="builder-answer">${questions[step][2]}</label><textarea id="builder-answer" name="answer" required maxlength="${step === 2 ? 3000 : 80}" rows="${step === 2 ? 4 : 2}" placeholder="${questions[step][1]}">${esc(answers[step])}</textarea><div><span>Draft disimpan di browser ini</span><button class="op-button primary" type="submit">${step === 2 ? 'Lihat preview' : 'Lanjut'} →</button></div></form>` : `<div class="builder-final"><span>Konfigurasi tim · pekerjaan belum dimulai</span><button class="op-button primary" data-builder-apply ${saving ? 'disabled' : ''}>${saving ? 'Menyimpan…' : 'Terapkan tim'}</button></div>`}
      </section><aside class="builder-preview"><div class="op-section-title"><h2>Preview tim</h2><span>DRAFT</span></div><div class="preview-team-title"><span class="division-icon">◈</span><h3>${esc(answers[0] || 'Divisi baru')}</h3></div><div class="preview-member"><span class="member-avatar">${esc((answers[1] || 'M')[0])}</span><div><strong>${esc(answers[1] || 'Manager')}</strong><small>Manager · koordinasi & pemeriksaan</small>${lookPreview(answers[0], answers[1], 'Manager', true)}</div></div>${workers().map((w, i) => `<div class="preview-member"><span class="member-avatar worker">${esc(w.name[0] || '?')}</span><div><strong>${esc(w.name)}</strong><small>${esc(w.role || 'Tanggung jawab belum diisi')}</small>${lookPreview(answers[0], w.name, w.role, false, i)}</div></div>`).join('')}
      <div class="preview-workflow"><strong>Alur tugas manual</strong><p>Brief → Rencana → Kerja agent → Review manager → Keputusan Founder</p><small>Konfigurasi ini belum membuat koneksi n8n atau runner produksi. Integrasi tersebut disiapkan bersama Builder di Codex.</small></div><div class="builder-footnote"><strong>Penempatan ruangan</strong><div class="layout-preview"><span>Founder</span>${(getState()?.divisions || []).map(d => `<span>${esc(d.name)}</span>`).join('')}<span class="layout-new">+ ${esc(answers[0] || 'Divisi baru')}</span></div><p>Ruangan dan meja mengikuti jumlah anggota, dengan sudut manager, area kerja, sofa dan penyimpanan. Tim yang sudah ada tetap pada posisinya.</p></div></aside></div></details>`;
  }
  function bind(host: HTMLElement, rerender: () => void) {
    dialogue.bind(host, rerender);
    host.querySelector<HTMLDetailsElement>('.builder-manual')?.addEventListener('toggle', event => { manualOpen = (event.target as HTMLDetailsElement).open; });
    host.querySelector('[data-builder-room]')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('kael:select-room', { detail: 'builder' })));
    host.querySelector<HTMLButtonElement>('[data-builder-handoff]')?.addEventListener('click', async () => {
      const prompt = 'jadi builder';
      try { await navigator.clipboard.writeText(prompt); notify('Instruksi disalin. Tempel di percakapan coding agent pada proyek Kael.'); }
      catch { notify('Clipboard tidak tersedia. Ketik jadi builder di sesi Code pada folder kantor.'); }
    });
    host.querySelector<HTMLTextAreaElement>('#builder-answer')?.addEventListener('input', event => { answers[step] = (event.target as HTMLTextAreaElement).value; persist(); const status = host.querySelector('.builder-warning'); if (status) status.textContent = warning; });
    host.querySelector('#builder-form')?.addEventListener('submit', event => {
      event.preventDefault(); answers[step] = answers[step].trim();
      if (!answers[step]) return;
      if (step === 2 && (workers().length > 12 || workers().some(w => !w.name || !w.role || w.name.length > 80 || w.role.length > 150))) { warning = 'Isi 1–12 baris: Nama | Tanggung jawab. Nama maksimal 80 dan tugas maksimal 150 karakter.'; rerender(); return; }
      step++; persist(); rerender(); host.querySelector<HTMLElement>('#builder-answer, [data-builder-apply]')?.focus();
    });
    host.querySelectorAll<HTMLButtonElement>('[data-builder-edit]').forEach(b => b.onclick = () => { step = Number(b.dataset.builderEdit); persist(); rerender(); host.querySelector<HTMLElement>('#builder-answer')?.focus(); });
    const applyButton = host.querySelector<HTMLButtonElement>('[data-builder-apply]');
    if (applyButton) applyButton.onclick = async () => {
      if (saving) return; saving = true; rerender();
      try { await apply({ type: 'division', name: answers[0], manager: answers[1], workers: workers() }); answers = ['', '', '']; step = 0; persist(); notify('Tim berhasil disimpan. Buka Tim & divisi untuk melihat anggota.'); }
      catch (e) { warning = e instanceof Error ? e.message : 'Tim belum tersimpan. Coba lagi.'; }
      finally { saving = false; rerender(); }
    };
  }
  return { render, bind };
}


