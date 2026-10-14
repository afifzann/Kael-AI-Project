import { readFile, writeFile, link, rm, rename } from 'node:fs/promises';
import { randomBytes, createHash, timingSafeEqual, scrypt as derive } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';

const scrypt = promisify(derive), parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const digest = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
const token = () => randomBytes(32).toString('hex');
export const builderCommands = ['division', 'division-edit', 'workflow-agent', 'workflow-manager', 'workflow-delegate'];

async function readOwner(file) {
  const owner = JSON.parse(await readFile(file, 'utf8'));
  if (owner.schema !== 1 || typeof owner.name !== 'string' || typeof owner.email !== 'string' || !/^[a-f0-9]{32}$/.test(owner.salt) || !/^[a-f0-9]{128}$/.test(owner.hash)) throw new Error('Data akun tidak valid.');
  return owner;
}
function validatePassword(data) {
  if (typeof data.password !== 'string' || data.password.length < 15 || data.password.length > 128 || data.password !== data.confirm) throw new Error('Gunakan kata sandi 15–128 karakter dan konfirmasi yang sama.');
}
export async function createRecoveryCode(directory, now = Date.now) {
  const owner = await readOwner(path.join(directory, 'owner-auth.json'));
  const code = token(), temporary = path.join(directory, `.recovery-${token()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify({ hash: digest(code), ownerHash: owner.hash, expires: now() + 15 * 60 * 1000 }), { flag: 'wx', mode: 0o600, flush: true });
    await rename(temporary, path.join(directory, 'owner-recovery.json'));
  } finally { await rm(temporary, { force: true }).catch(() => {}); }
  return code;
}

export async function createAuth({ directory, secure = false, now = Date.now }) {
  const ownerFile = path.join(directory, 'owner-auth.json'), bootstrapFile = path.join(directory, 'owner-setup.key'), builderFile = path.join(directory, 'builder-access.key');
  let owner = null, setupKey = '', builderKey = '', settingUp = false, resetting = false;
  const sessions = new Map(), attempts = new Map();
  async function readKey(file) {
    try { const key = (await readFile(file, 'utf8')).trim(); if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Format kunci akses tidak valid.'); return key; }
    catch (e) { if (e.code !== 'ENOENT') throw e; const key = token(); try { await writeFile(file, key, { flag: 'wx', mode: 0o600, flush: true }); return key; } catch (e) { if (e.code !== 'EEXIST') throw e; return readKey(file); } }
  }
  try {
    owner = await readOwner(ownerFile);
  } catch (e) { if (e.code !== 'ENOENT') throw new Error('Data akun pemilik tidak dapat dibuka; berkas dipertahankan.'); }
  if (owner) builderKey = await readKey(builderFile); else setupKey = await readKey(bootstrapFile);

  function session(req) {
    const key = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('kael_session='))?.slice(13);
    if (!key || !/^[a-f0-9]{64}$/.test(key)) return null;
    const id = digest(key), value = sessions.get(id);
    if (!value) return null;
    if (now() >= value.expires || now() - value.seen >= 30 * 60 * 1000) { sessions.delete(id); return null; }
    value.seen = now(); return { ...value, id };
  }
  function cookie(value, age) { return `kael_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`; }
  function signIn(req, res) {
    const previous = session(req); if (previous) sessions.delete(previous.id);
    for (const [id, s] of sessions) if (now() >= s.expires || now() - s.seen >= 30 * 60 * 1000) sessions.delete(id);
    if (sessions.size >= 10) sessions.delete(sessions.keys().next().value);
    const key = token(), csrf = token(); sessions.set(digest(key), { csrf, expires: now() + 12 * 60 * 60 * 1000, seen: now() });
    res.setHeader('Set-Cookie', cookie(key, 12 * 60 * 60));
    return { needsSetup: false, signedIn: true, owner: { name: owner.name }, csrf };
  }
  async function input(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('Gunakan JSON.');
    const chunks = []; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > 16000) throw new Error('Permintaan terlalu besar.'); chunks.push(chunk); }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Formulir tidak valid.'); return value;
  }
  function limited(req, res, send) {
    const id = (req.socket.remoteAddress || 'local') + (req.url === '/api/auth/reset-password' ? ':reset' : '');
    for (const [key, value] of attempts) if (now() >= value.until) attempts.delete(key);
    const entry = attempts.get(id) || { count: 0, until: now() + 15 * 60 * 1000 };
    if (entry.count >= 5) { res.setHeader('Retry-After', String(Math.ceil((entry.until - now()) / 1000))); send(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.' }); return true; }
    entry.count++; attempts.set(id, entry); return false;
  }
  async function handle(req, res, send) {
    if (!req.url.startsWith('/api/auth/')) return false;
    const current = session(req);
    if (req.method === 'GET' && req.url === '/api/auth/status') { send(res, 200, { needsSetup: !owner, signedIn: !!current, ...(current ? { owner: { name: owner.name }, csrf: current.csrf } : {}) }); return true; }
    if (req.method !== 'POST' || !['/api/auth/setup', '/api/auth/login', '/api/auth/logout', '/api/auth/reset-password'].includes(req.url)) { send(res, 404, { error: 'Endpoint tidak ditemukan.' }); return true; }
    if (req.url === '/api/auth/logout') {
      if (!current) { send(res, 401, { error: 'Sesi berakhir. Masuk kembali.' }); return true; }
      if (!same(req.headers['x-kael-csrf'], current.csrf)) { send(res, 403, { error: 'Token keamanan tidak valid.' }); return true; }
      sessions.delete(current.id); res.setHeader('Set-Cookie', cookie('', 0)); send(res, 200, { signedIn: false }); return true;
    }
    if (limited(req, res, send)) return true;
    try {
      const data = await input(req);
      if (req.url === '/api/auth/setup') {
        if (owner || settingUp) { send(res, 409, { error: 'Akun pemilik sudah disiapkan atau sedang diproses. Gunakan halaman masuk.' }); return true; }
        if (!same(data.setupKey, setupKey)) { send(res, 403, { error: 'Kode penyiapan tidak valid. Ambil kode dari terminal server.' }); return true; }
        if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80 || typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Isi nama dan email yang valid.');
        validatePassword(data);
        settingUp = true;
        const temporary = path.join(directory, `.owner-${token()}.tmp`);
        try {
          const salt = randomBytes(16).toString('hex'), hash = (await scrypt(data.password, salt, 64, parameters)).toString('hex');
          const next = { schema: 1, name: data.name.trim(), email: data.email.trim().toLowerCase(), salt, hash };
          await writeFile(temporary, JSON.stringify(next), { mode: 0o600, flag: 'wx', flush: true });
          await link(temporary, ownerFile); owner = next;
          builderKey = await readKey(builderFile); setupKey = ''; await rm(bootstrapFile, { force: true });
        } finally { settingUp = false; await rm(temporary, { force: true }).catch(() => {}); }
      } else if (req.url === '/api/auth/reset-password') {
        if (!owner || resetting) { send(res, 409, { error: 'Pemulihan belum tersedia atau sedang diproses.' }); return true; }
        resetting = true;
        const temporary = path.join(directory, `.owner-${token()}.tmp`);
        try {
          let recovery;
          try { recovery = JSON.parse(await readFile(path.join(directory, 'owner-recovery.json'), 'utf8')); } catch {}
          if (typeof data.recoveryCode !== 'string' || !/^[a-f0-9]{64}$/.test(data.recoveryCode) || !recovery || !Number.isSafeInteger(recovery.expires) || now() >= recovery.expires || !same(recovery.ownerHash, owner.hash) || !same(recovery.hash, digest(data.recoveryCode))) {
            send(res, 403, { error: 'Kode pemulihan tidak valid atau kedaluwarsa. Buat kode baru di terminal server.' }); return true;
          }
          validatePassword(data);
          const salt = randomBytes(16).toString('hex'), hash = (await scrypt(data.password, salt, 64, parameters)).toString('hex');
          const next = { ...owner, salt, hash };
          await writeFile(temporary, JSON.stringify(next), { flag: 'wx', mode: 0o600, flush: true });
          await rename(temporary, ownerFile); owner = next; sessions.clear();
          // Binding to the previous password hash prevents reuse even if cleanup fails.
          await rm(path.join(directory, 'owner-recovery.json'), { force: true }).catch(() => {});
        } finally { resetting = false; await rm(temporary, { force: true }).catch(() => {}); }
      } else {
        if (!owner || typeof data.email !== 'string' || typeof data.password !== 'string' || data.password.length > 128) { send(res, 401, { error: 'Email atau kata sandi tidak cocok.' }); return true; }
        const account = owner, hash = (await scrypt(data.password, account.salt, 64, parameters)).toString('hex');
        if (resetting || owner !== account || !same(hash, account.hash) || data.email.trim().toLowerCase() !== account.email) { send(res, 401, { error: 'Email atau kata sandi tidak cocok.' }); return true; }
      }
      attempts.delete((req.socket.remoteAddress || 'local') + (req.url === '/api/auth/reset-password' ? ':reset' : '')); send(res, 200, signIn(req, res));
    } catch (e) { send(res, 400, { error: ['Gunakan JSON.', 'Permintaan terlalu besar.', 'Formulir tidak valid.', 'Isi nama dan email yang valid.', 'Gunakan kata sandi 15–128 karakter dan konfirmasi yang sama.'].includes(e.message) ? e.message : 'Akun tidak dapat diproses. Data tersimpan dipertahankan; periksa konfigurasi server.' }); }
    return true;
  }
  function authorize(req, res, send) {
    if (owner && builderKey && req.headers.authorization?.startsWith('Bearer ') && same(req.headers.authorization.slice(7), builderKey)) {
      if (req.method === 'GET' && req.url === '/api/state' || req.method === 'POST' && ['/api/command', '/api/office-bridge'].includes(req.url)) return 'builder';
      send(res, 403, { error: 'Akses Builder hanya untuk membaca kantor dan mengatur tim.' }); return null;
    }
    const current = session(req);
    if (!current) { send(res, 401, { error: owner ? 'Sesi berakhir. Masuk kembali.' : 'Siapkan akun pemilik dahulu.' }); return null; }
    if (!['GET', 'HEAD'].includes(req.method) && !same(req.headers['x-kael-csrf'], current.csrf)) { send(res, 403, { error: 'Token keamanan tidak valid. Muat ulang halaman.' }); return null; }
    return 'owner';
  }
  return { handle, authorize };
}
