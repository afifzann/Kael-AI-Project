# Kael AI — aturan kerja coding agent

Berlaku untuk semua coding agent (Codex, Claude Code, dan lainnya) yang bekerja di folder ini. Pemilik bisa pindah alat kapan saja hanya dengan berkata "lanjut"; aturan di bawah memastikan pekerjaan bisa diteruskan tanpa penjelasan ulang.

## Proyek

Kael AI adalah kantor virtual 3D dan workspace tim AI lokal: Founder membentuk divisi, membuat briefing, menyetujui rencana, menjalankan tugas (manual atau lewat runtime AI), memeriksa hasil berversi, dan memberi keputusan. Ringkasan lengkap: `README.md`, kebutuhan dan riwayat versi: `docs/PRD.md`, kontrak desain: `DESIGN.md`.

- Frontend: Vite + TypeScript + Three.js (`src/`). Server data lokal: Node (`server/index.mjs`), data di `app-data/state.json`.
- Logika data dan validasi perintah: `src/domain.ts`. Dashboard: `src/operations.ts`. Runtime AI tugas lokal: `server/runtime.mjs` (Codex CLI). Produksi KaelaCH: `server/production.mjs`.

## Tujuan akhir

Kael dibangun menjadi produk self-hosted yang bisa dijual: dipasang di VPS milik pelanggan, data dan agent berjalan di sana, sedangkan layanan pusat hanya untuk lisensi dan pembaruan (pendekatan B di audit). Setiap fitur sebaiknya tetap masuk akal untuk instalasi pelanggan, bukan hanya komputer pemilik.

Acuan arah: `analysis/lembur-audit-2026-10-14/` (audit statis Lembur). Mulai dari `00-EXECUTIVE-SUMMARY.md`, roadmap di `09-IMPLEMENTATION-ROADMAP.md`, keputusan yang masih terbuka di `10-QUESTIONS-AND-UNKNOWNS.md`.

## Menjalankan

- `npm install`, lalu `npm run dev` → http://localhost:5173 (server data port 5174). Node.js 24+.
- `npm test` untuk seluruh tes, `npm run build` untuk typecheck + build.
- Tes memakai runtime tiruan; jangan memanggil AI sungguhan di tes.

## Saat mulai bekerja

1. Baca `docs/PROGRESS.md` untuk tahu tahap yang selesai, yang sedang berjalan, dan langkah berikutnya.
2. Jalankan `git status` dan `git diff`. Perubahan yang belum di-commit kemungkinan pekerjaan alat sebelumnya yang terhenti; periksa dan teruskan, jangan buang.
3. Jika folder belum menjadi repo git: jalankan `git init`, pastikan `.gitignore` sudah memuat `.env`, `lembur-backup-lengkap/`, `node_modules/`, `dist/`, `app-data/`, lalu `git add -A` dan periksa `git status` bahwa tidak ada file `.env`, isi `lembur-backup-lengkap/`, kredensial, atau `app-data/` yang ikut. Baru commit pertama.

## Setiap satu langkah selesai

1. Jalankan `npm test` dan `npm run build`. Catat jujur bila ada yang gagal atau belum diuji.
2. Perbarui `docs/PROGRESS.md`: apa yang selesai, file utama yang berubah, apa yang belum diverifikasi, dan langkah berikutnya.
3. Commit git lokal dengan pesan singkat yang menjelaskan langkahnya. Jangan push dan jangan menambah remote kecuali pemilik meminta.

Jika batas pemakaian hampir habis, commit progres yang ada dan tulis di `docs/PROGRESS.md` apa yang belum selesai.

## Batas yang tidak boleh dilanggar

- Jangan membuka, membaca, menyalin, atau mengubah `.env`.
- `lembur-backup-lengkap/` boleh dibaca sebagai referensi saja, tidak diubah dan tidak ada script di dalamnya yang dijalankan. Jangan membuka atau mengutip rahasia di dalamnya: `.ssh`, `.rahasia`, `.claude.json`, `.claude/.credentials.json`, `.kantor-kode`, `.env`, token, cookie, kunci, file auth, dan data pelanggan.
- Kembangkan Kael sendiri. Lembur hanya referensi pola kerja; jangan menyalin kode, aset, merek, endpoint, atau identitas Lembur.
- Jangan mengubah atau menghapus data pemilik di `app-data/` secara langsung; ubah data hanya lewat aplikasi atau perintah server.
- Pertahankan ID, riwayat, hasil berversi, dan keputusan yang sudah tersimpan saat mengubah struktur data.
- Tanya pemilik dulu sebelum melakukan apa pun di luar folder ini, memanggil layanan eksternal, menginstal tool global, atau tindakan yang tidak bisa dibatalkan.
- Pertahankan line ending setiap file (beberapa file memakai CRLF).
- Persetujuan Founder tidak boleh terjadi otomatis; hasil AI selalu menunggu pemeriksaan.

## Bahasa

Pemilik berbahasa Indonesia. Jawab dan tulis dokumentasi dalam bahasa Indonesia yang singkat dan jelas.
