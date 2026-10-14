import type { State, Command } from './domain';
import { teamTemplates, templateLimits } from './onboarding-model';
import './onboarding.css';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const input = (label: string, name: string, value: string, max: number) => `<label>${label}<input name="${name}" value="${esc(value)}" maxlength="${max}" required></label>`;
async function readState(): Promise<State> {
  const response = await fetch('/api/state'); if (!response.ok) throw new Error('Kantor belum bisa dibuka. Periksa koneksi server lalu coba lagi.');
  return response.json();
}

export async function setupWorkspace(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>('#app')!;
  root.innerHTML = '<main class="access-shell"><section class="access-card"><h1>Membuka kantor…</h1><p role="status">Memeriksa penyiapan dan koneksi pada server ini.</p></section></main>';
  let state: State;
  for (;;) {
    try { state = await readState(); break; }
    catch {
      root.innerHTML = '<main class="access-shell"><section class="access-card"><h1>Kantor belum terhubung</h1><p>Penyiapan yang sudah disimpan tetap aman. Hubungkan kembali untuk melanjutkan.</p><button class="access-submit">Coba lagi</button></section></main>';
      await new Promise<void>(resolve => { root.querySelector<HTMLButtonElement>('button')!.onclick = () => resolve(); });
    }
  }
  if (!state.onboarding || state.onboarding.completedAt) return;
  let page = state.onboarding.step, selected = teamTemplates[0].id as string;
  let draft = { name: teamTemplates[0].division as string, manager: teamTemplates[0].manager as string, workers: teamTemplates[0].workers.map(w => ({ ...w } as { name: string; role: string })) };
  return new Promise<void>(resolve => {
    const errorText = (message: string) => { const error = root.querySelector<HTMLElement>('[role="alert"]')!; error.textContent = message; error.focus(); };
    function render() {
      const step = page === 'profile' ? 1 : page === 'team' ? 2 : 3;
      const titles = ['Kenalkan kantormu', 'Mulai dengan tim yang pas', 'Pilih cara menjalankan tugas'];
      const descriptions = ['Konteks ini membantu tim memahami bisnismu. Kamu bisa mengubahnya nanti di Pengaturan.', 'Template adalah titik awal. Periksa nama dan peran sebelum diterapkan; semuanya bisa diubah melalui Builder.', 'Akun AI milikmu dihubungkan pada server ini. Jangan masukkan password atau token provider ke formulir Kael.'];
      const template = teamTemplates.find(t => t.id === selected), runtime = state.aiRuntime;
      const fields = page === 'profile' ? `${input('Nama kantor / bisnis', 'name', state.business.name === 'Kantor saya' ? '' : state.business.name, 120)}<label>Siapa pelanggan atau pengguna bisnismu?<textarea name="audience" maxlength="2000" rows="2" required>${esc(state.business.audience)}</textarea></label><label>Produk, tujuan, fakta penting, dan aturan kerja<textarea name="facts" maxlength="20000" rows="5" required aria-describedby="business-help">${esc(state.business.facts)}</textarea></label><p id="business-help" class="setup-hint">Contoh: menjual furnitur outdoor untuk hotel; gunakan bahasa profesional; semua harga harus berasal dari katalog. Jangan isi kata sandi atau API key.</p>`
        : page === 'team' ? `<fieldset class="setup-options"><legend>Pilih titik awal</legend>${[...teamTemplates, { id: 'empty', name: 'Mulai kosong', description: 'Bentuk divisi sendiri melalui Builder setelah masuk kantor.' }].map(t => `<label><input type="radio" name="template" value="${t.id}" ${selected === t.id ? 'checked' : ''}><span><strong>${t.name}</strong><small>${t.description}</small></span></label>`).join('')}</fieldset>${template ? `<section class="setup-team" aria-label="Tinjau tim sebelum diterapkan">${input('Nama divisi', 'name', draft.name, 80)}${input('Nama manager', 'manager', draft.manager, 80)}<p class="setup-hint">Manager mengoordinasikan divisi. Koordinasi AI otomatis belum tersedia; briefing dan pemeriksaan tetap kamu kendalikan.</p>${draft.workers.map((w, i) => `<fieldset><legend>Pelaksana ${i + 1}</legend>${input('Nama agent', `worker-${i}`, w.name, 80)}${input('Tugas utama', `role-${i}`, w.role, 150)}</fieldset>`).join('')}<details><summary>Lihat SOP dan batas tindakan yang akan disimpan</summary><p class="setup-preserve">${esc(template.steps)}</p><p>${esc(template.criteria)}</p><p>${esc(templateLimits)}</p></details></section>` : '<p class="setup-hint">Kantor dibuat tanpa divisi dan tanpa tugas contoh. Builder tetap dapat dibuka untuk membuat tim manual.</p>'}`
        : `<section class="setup-connection"><h2>Codex pada server ini</h2><p role="status">${runtime?.available ? 'Login Codex terdeteksi. Tugas dapat dijalankan setelah rencana kamu setujui.' : esc(runtime?.reason || 'Codex belum terhubung pada server ini.')}</p>${!runtime?.available ? '<p>Jika Codex CLI sudah terpasang, jalankan <code>codex login</code> di terminal server sebagai user yang menjalankan Kael. Selesaikan login langsung melalui provider.</p>' : ''}<button type="button" class="setup-secondary" data-refresh>Periksa koneksi lagi</button><small>Pemeriksaan server diperbarui maksimal setiap 60 detik. Ini pemeriksaan login, bukan uji tugas AI.</small></section><label>Cara menjalankan tugas<select name="provider"><option value="manual">Manual dahulu — hubungkan AI nanti</option>${runtime?.available ? '<option value="Codex">Gunakan Codex yang terhubung</option>' : ''}</select></label><p class="setup-hint">Claude dan Hermes belum memiliki runtime tugas di versi ini. Login akun dashboard tidak otomatis menghubungkan provider AI.</p><section class="setup-summary"><h2>Yang akan kamu buka</h2><p><strong>${esc(state.business.name)}</strong> · ${state.divisions.length} divisi · ${state.agents.length} anggota</p><p>Di Ringkasan, ikuti panduan briefing → persetujuan rencana → pelaksanaan → preview → keputusan hasil. Tidak ada tugas yang dijalankan saat penyiapan.</p></section>`;
      root.innerHTML = `<main class="access-shell"><section class="access-card setup-card" aria-labelledby="setup-title"><span class="access-brand">kael<span> AI</span></span><nav aria-label="Langkah penyiapan"><ol class="setup-steps">${['Bisnis', 'Tim', 'Pelaksanaan'].map((name, i) => `<li ${step === i + 1 ? 'aria-current="step"' : ''}><span>${i + 1}</span>${name}</li>`).join('')}</ol></nav><h1 id="setup-title" tabindex="-1">${titles[step - 1]}</h1><p>${descriptions[step - 1]}</p><form>${fields}<p class="access-error" role="alert" tabindex="-1"></p><div class="setup-actions">${page === 'team' ? '<button type="button" class="setup-secondary" data-back>Kembali</button>' : ''}<button type="submit" class="access-submit">${page === 'connection' ? 'Simpan & buka kantor' : page === 'team' ? selected === 'empty' ? 'Lanjut tanpa tim' : 'Terapkan tim & lanjut' : 'Simpan & lanjut'}</button></div></form><p class="access-footnote">Langkah tersimpan setelah kamu menekan Simpan atau Terapkan. Jika terputus, masuk kembali untuk melanjutkan.</p></section></main>`;
      root.querySelector<HTMLElement>('#setup-title')!.focus();
      const form = root.querySelector<HTMLFormElement>('form')!;
      const captureTeam = () => {
        if (page !== 'team' || selected === 'empty') return;
        const data = new FormData(form);
        draft = { name: String(data.get('name')), manager: String(data.get('manager')), workers: draft.workers.map((_, i) => ({ name: String(data.get(`worker-${i}`)), role: String(data.get(`role-${i}`)) })) };
      };
      form.querySelectorAll<HTMLInputElement>('[name="template"]').forEach(radio => radio.onchange = () => {
        captureTeam(); selected = radio.value;
        const next = teamTemplates.find(t => t.id === selected);
        if (next) draft = { name: next.division, manager: next.manager, workers: next.workers.map(w => ({ ...w })) };
        render(); root.querySelector<HTMLInputElement>(`[value="${selected}"]`)?.focus();
      });
      form.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => { captureTeam(); page = 'profile'; render(); });
      form.querySelector<HTMLButtonElement>('[data-refresh]')?.addEventListener('click', async event => {
        const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
        const provider = (form.elements.namedItem('provider') as HTMLSelectElement).value;
        try { state = await readState(); if (state.onboarding?.completedAt) { resolve(); return; } render(); const select = root.querySelector<HTMLSelectElement>('[name="provider"]')!; if (provider !== 'Codex' || state.aiRuntime?.available) select.value = provider; }
        catch (e) { errorText(e instanceof Error ? e.message : 'Koneksi belum tersedia. Coba lagi.'); button.disabled = false; }
      });
      form.onsubmit = async event => {
        event.preventDefault(); if (form.getAttribute('aria-busy') === 'true' || !form.reportValidity()) return;
        captureTeam(); const data = new FormData(form);
        const command: Command = page === 'profile' ? { type: 'onboarding', step: page, ...Object.fromEntries(data) }
          : page === 'team' ? { type: 'onboarding', step: page, template: selected, ...draft }
          : { type: 'onboarding', step: 'connection', provider: data.get('provider') };
        form.setAttribute('aria-busy', 'true'); form.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = true);
        try {
          const response = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, command }) });
          const result = await response.json();
          if (!response.ok) {
            if (response.status === 409) { state = await readState(); if (state.onboarding?.completedAt) { resolve(); return; } page = state.onboarding!.step; render(); }
            throw new Error(result.error || 'Penyiapan belum tersimpan. Coba lagi.');
          }
          state = result;
          if (state.onboarding?.completedAt) { resolve(); return; }
          page = state.onboarding!.step; render();
        } catch (e) { errorText(e instanceof Error ? e.message : 'Penyiapan belum tersimpan. Coba lagi.'); }
        finally { form.removeAttribute('aria-busy'); form.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = false); }
      };
    }
    render();
  });
}
