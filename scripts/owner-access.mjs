// Jalankan sendiri di terminal server; jangan bagikan output kode penyiapan/pemulihan.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRecoveryCode } from '../server/auth.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = process.env.KAEL_DATA_DIR || path.join(root, 'app-data');
try {
  if (process.argv.includes('--reset')) {
    const code = await createRecoveryCode(directory);
    console.log('Di halaman masuk, pilih Lupa kata sandi? lalu masukkan kode pemulihan ini (sekali pakai, berlaku 15 menit):\n' + code + '\nTentukan sendiri kata sandi baru di web. Jangan bagikan kode ini.');
  } else {
    const key = (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim();
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error();
    console.log('Buka dashboard Kael, lalu masukkan kode penyiapan sekali pakai ini:\n' + key);
  }
} catch { console.error(process.argv.includes('--reset') ? 'Kode pemulihan tidak dapat dibuat. Pastikan akun sudah ada dan direktori data dapat diakses. Data akun tidak dihapus.' : 'Kode penyiapan tidak tersedia. Jalankan server dahulu; jika akun sudah dibuat, gunakan halaman masuk.'); process.exitCode = 1; }
