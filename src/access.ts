import './access.css';

type Access = { needsSetup: boolean; signedIn: boolean; owner?: { name: string }; csrf?: string };

export async function requireOwner() {
  const root = document.querySelector<HTMLDivElement>('#app')!;
  let status: Access;
  try { const response = await fetch('/api/auth/status'); if (!response.ok) throw new Error(); status = await response.json(); }
  catch {
    root.innerHTML = '<main class="access-shell"><section class="access-card"><span class="access-brand">kael AI</span><h1>Server belum terhubung</h1><p>Jalankan server Kael, lalu coba hubungkan kembali. Data kantor tetap tersimpan.</p><button type="button" class="access-submit">Coba lagi</button></section></main>';
    root.querySelector('button')!.onclick = () => location.reload(); return null;
  }
  if (status.signedIn && status.csrf) return status;
  const setup = status.needsSetup, recovery = !setup && new URL(location.href).searchParams.has('reset-password');
  const newPassword = setup || recovery;
  const title = setup ? 'Siapkan akses pemilik' : recovery ? 'Buat kata sandi baru' : 'Masuk ke kantor';
  const description = setup ? 'Buat akun untuk kantor di instalasi ini. Kode penyiapan berbeda dari kode pembelian produk.' : recovery ? 'Gunakan kode dari terminal server. Akun dan seluruh data kantor tetap dipertahankan.' : 'Gunakan akun pemilik kantor untuk membuka pekerjaan dan keputusan tim.';
  root.innerHTML = `<main class="access-shell"><section class="access-card" aria-labelledby="access-title">
    <span class="access-brand">kael<span> AI</span></span><span class="access-eyebrow">${setup ? 'PENYIAPAN KANTOR' : recovery ? 'PEMULIHAN AKSES' : 'WORKSPACE PRIBADI'}</span>
    <h1 id="access-title">${title}</h1><p>${description}</p><form>
    ${setup ? '<label>Nama pemilik<input name="name" autocomplete="name" maxlength="80" required></label><label>Kode penyiapan<input name="setupKey" autocomplete="off" spellcheck="false" minlength="64" maxlength="64" required aria-describedby="setup-help"></label><p id="setup-help" class="access-help">Di terminal server, dari folder Kael, jalankan <code>node scripts/owner-access.mjs</code>. Masukkan kode yang ditampilkan. Kode hanya berlaku untuk penyiapan pertama.</p>' : ''}
    ${recovery ? '<label>Kode pemulihan<input name="recoveryCode" autocomplete="off" spellcheck="false" minlength="64" maxlength="64" required aria-describedby="recovery-help"></label><p id="recovery-help" class="access-help">Di terminal server, dari folder Kael, jalankan <code>node scripts/owner-access.mjs --reset</code>. Kode berlaku sekali selama 15 menit. Jangan kirim ke chat. Setelah berhasil, semua sesi lama keluar.</p>' : '<label>Email<input type="email" name="email" autocomplete="username" maxlength="254" required></label>'}
    <label>${recovery ? 'Kata sandi baru' : 'Kata sandi'}<input type="password" name="password" autocomplete="${newPassword ? 'new-password' : 'current-password'}" ${newPassword ? 'minlength="15" aria-describedby="password-help"' : ''} maxlength="128" required></label>
    ${newPassword ? '<p id="password-help" class="access-help">Gunakan frasa sandi minimal 15 karakter.</p><label>Ulangi kata sandi<input type="password" name="confirm" autocomplete="new-password" minlength="15" maxlength="128" required></label>' : ''}
    <p class="access-error" role="alert"></p><button class="access-submit" type="submit">${setup ? 'Buat akun & buka kantor' : recovery ? 'Simpan & buka kantor' : 'Masuk'}</button></form>
    ${!setup ? `<a class="access-recovery" href="${recovery ? '/' : '?reset-password=1'}">${recovery ? 'Kembali ke halaman masuk' : 'Lupa kata sandi?'}</a>` : ''}
    <p class="access-footnote">Akun ini untuk dashboard kantor. Login provider AI diatur terpisah.</p></section></main>`;
  const form = root.querySelector<HTMLFormElement>('form')!, button = form.querySelector<HTMLButtonElement>('button')!, error = form.querySelector<HTMLElement>('.access-error')!;
  const password = form.querySelector<HTMLInputElement>('[name="password"]')!, confirm = form.querySelector<HTMLInputElement>('[name="confirm"]');
  const validate = () => confirm?.setCustomValidity(confirm.value === password.value ? '' : 'Konfirmasi kata sandi belum sama.');
  confirm?.addEventListener('input', validate); password.addEventListener('input', validate);
  form.querySelector<HTMLInputElement>('input')?.focus();
  return new Promise<Access>(resolve => {
    form.onsubmit = async event => {
      event.preventDefault(); validate(); if (button.disabled || !form.reportValidity()) return;
      button.disabled = true; error.textContent = ''; form.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(`/api/auth/${setup ? 'setup' : recovery ? 'reset-password' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Akses belum berhasil. Coba lagi.');
        form.reset(); resolve(data);
      } catch (e) { error.textContent = e instanceof Error ? e.message : 'Server belum terhubung. Coba lagi.'; }
      finally { button.disabled = false; form.removeAttribute('aria-busy'); }
    };
  });
}

export function protectRequests(access: Access) {
  const original = window.fetch.bind(window); let expired = false;
  window.fetch = async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    const method = (options?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(input, options);
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    if (!['GET', 'HEAD'].includes(method) && access.csrf) headers.set('X-Kael-CSRF', access.csrf);
    const response = await original(input, { ...options, headers, credentials: 'same-origin' });
    if (response.status === 401 && !expired) { expired = true; location.reload(); }
    return response;
  };
}

export function showOwnerMenu(access: Access) {
  const host = document.querySelector('.header-right'); if (!host) return;
  const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'owner-logout'; logout.textContent = 'Keluar'; logout.title = `Keluar dari akun ${access.owner?.name || 'pemilik'}`;
  logout.onclick = async () => {
    logout.disabled = true;
    try { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (!response.ok) throw new Error(); location.reload(); }
    catch { logout.disabled = false; logout.textContent = 'Coba keluar lagi'; }
  };
  host.append(logout);
}
