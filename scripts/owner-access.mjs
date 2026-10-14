// Jalankan sendiri di terminal server; jangan bagikan output kode penyiapan.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = process.env.KAEL_DATA_DIR || path.join(root, 'app-data');
try {
  const key = (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim();
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error();
  console.log('Buka dashboard Kael, lalu masukkan kode penyiapan sekali pakai ini:\n' + key);
} catch { console.error('Kode penyiapan tidak tersedia. Jalankan server dahulu; jika akun sudah dibuat, gunakan halaman masuk.'); process.exitCode = 1; }
