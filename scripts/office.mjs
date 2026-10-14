import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function officeRequest(input, { directory = process.env.KAEL_DATA_DIR || path.join(root, 'app-data'), port = process.env.KAEL_PORT || '5174' } = {}) {
  if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error('Port kantor tidak valid.');
  let key; try { key = (await readFile(path.join(directory, 'builder-access.key'), 'utf8')).trim(); } catch { throw new Error('Siapkan akun pemilik kantor dahulu. Kunci akses tidak tersedia.'); }
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Kunci akses kantor tidak valid.');
  let response; try { response = await fetch(`http://127.0.0.1:${Number(port)}/api/office-bridge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error('Kantor belum terhubung. Jalankan server dan baca ulang konteks sebelum mengubah data.'); }
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Kantor menolak permintaan.'); return value;
}
export async function office(args, options) {
  const [mode, sessionId, file] = args;
  if (mode === 'roles') return officeRequest({ action: 'roles' }, options);
  if (mode === 'open') return officeRequest({ action: 'open', role: sessionId, client: args[2] || 'Claude', nativeId: args[3] || randomUUID() }, options);
  if (mode === 'context' || mode === 'leave') return officeRequest({ action: mode, sessionId }, options);
  if (mode === 'send' && sessionId && file) {
    const source = await readFile(file, 'utf8'); if (source.length > 150000) throw new Error('Permintaan terlalu besar.');
    const input = JSON.parse(source.replace(/^\uFEFF/, '')); if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('Permintaan tidak valid.');
    return officeRequest({ ...input, sessionId, requestId: createHash('sha256').update(sessionId + source).digest('hex') }, options);
  }
  throw new Error('Gunakan: office.mjs roles | open "Nama" [Claude|Codex] [nativeId] | context sessionId | send sessionId request.json | leave sessionId');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await office(process.argv.slice(2)), null, 2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
