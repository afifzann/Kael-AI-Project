# Tahap 2 — pekerjaan dan status umum

14 Oktober 2026. Scope: struktur baca dan UI pekerjaan untuk seluruh divisi, bukan runtime baru atau dashboard khusus n8n.

## Jalur dan kontrak

- `src/work.ts`: identitas/sumber/status asli; tugas lokal dan briefing; produksi; snapshot eksekusi eksternal. Tidak menulis state. Status hasil dan koneksi dipisahkan.
- `src/operations.ts`: workBoard/filter/pagination/workDetail, shared workSummary, riwayat manual dan tindakan asal. Bagian Pekerjaan divisi memakai daftar umum, sementara tool produksi/monitoring tetap dapat dibuka.
- `src/routes.ts`: allowlist sumber/status, query maksimal 160 karakter, page positif dan pembatasan filter pada surface kerja. Reload/Back mempertahankan pilihan.
- `src/dashboard.css`: baris daftar, status dan koneksi terpisah, filter responsif, detail metadata, langkah berikutnya dan riwayat.
- `server/production.mjs`, `server/index.mjs`: metadata ID task pendamping semua episode; tidak mengirim media arsip atau menyimpan metadata ke state. Mutasi manual terhadap task produksi arsip ditolak.
- `src/workspace.ts`: isolasi metadata dan data divisi. `domain.ts`: tipe metadata opsional; tidak mengubah command/transisi.

Tidak ada approval/eksekusi/publikasi otomatis dari membaca daftar. Start tugas lokal tetap manual. Detail produksi menuju watched/QC/version gate yang ada. Sumber eksternal tetap baca-saja. General runtime, pemilihan model per agent, SOP editor, Telegram dan Obsidian tidak ditambahkan.

## Verifikasi

- 102/102 tes lulus (`npm test` dengan server fixture loopback dan data temporer). Percobaan pertama menemukan metadata kosong yang mengubah bentuk API pada test persistence; API diperbaiki agar field opsional hanya dikirim jika ada task produksi, kemudian seluruh tes lulus.
- Tujuh tes pekerjaan: lifecycle manual dan approval versi, deduplikasi/arsip produksi, koneksi vs outcome eksternal, seluruh sumber pada divisi baru, isolasi/filter/paginasi, langkah pemulihan/fasilitas/occupancy, dan URL validation.
- Uji HTTP arsip: ID produksi tetap dikenali, perintah revise-task manual ditolak, hasil done tidak berubah. Metadata tidak dipersistenkan.
- TypeScript/Vite build lulus. Warning bundle >500 kB yang sudah ada tetap muncul.
- Server hanya dimuat ulang setelah API menunjukkan nol produksi aktif. Proses coordinator dan dua child Node diverifikasi; conhost Windows dikecualikan. Coordinator baru PID 21868 saat pemeriksaan.
- HTTP `/`, `/src/work.ts`, `/src/operations.ts`, `/api/state`: 200.
- Data nyata: revision 9, 2 divisi, 7 agent, 2 binding. Saat pemeriksaan hanya dua baris workflow; tugas lokal/produksi diuji memakai fixture, tidak menambahkan data contoh ke workspace pemilik.
- SHA256 state sebelum dan sesudah: `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`.

## Batas

Visual/layout aktual, keyboard/screen reader browser, sentuhan dan GPU belum diuji langsung. Pembatasan browser sebelumnya tidak dilewati. Tes unit/HTTP/build bukan bukti visual. Monitoring menampilkan snapshot yang tersedia, bukan seluruh arsip eksternal. Status revisi/gagal merupakan pemetaan tampilan yang dijelaskan di PRD; status sumber tetap tersedia dan tidak dimigrasikan.
