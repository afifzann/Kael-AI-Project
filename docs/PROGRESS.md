# Progres pengembangan Kael AI

Catatan bersama untuk semua coding agent. Perbarui setiap satu langkah selesai (lihat `AGENTS.md`).

Terakhir diperbarui: 14 Oktober 2026.

## Tujuan akhir

Kael menjadi produk self-hosted yang dijual dan dipasang di VPS pelanggan (lisensi dan pembaruan lewat layanan pusat minimal). Acuan: `analysis/lembur-audit-2026-10-14/`, roadmap P0–P7 di laporan 09. Tahap 1–5 di bawah adalah bagian dari P1 (workspace dan runtime agent). Yang belum: keputusan P0 (laporan 10), P2 login/approval broker, P3 penyimpanan dan backup, P4 installer, P5 pembaruan dan lisensi.

## Selesai

### Tahap 1 — navigasi dan pusat divisi
Sidebar dan Pengaturan dirapikan. Ringkasan menampilkan preview Kael, pekerjaan berjalan, dan tindakan penting. Setiap divisi punya enam bagian yang konsisten: Ringkasan, Pekerjaan, Anggota, Percakapan, Hasil, SOP & integrasi. Pencarian mencakup perusahaan, divisi, agent, dan peran.

### Tahap 2 — pekerjaan umum dan status
Daftar pekerjaan gabungan untuk tugas lokal, produksi, dan workflow eksternal, dengan filter divisi/status/sumber dan pencarian. Detail pekerjaan memuat penanggung jawab, tahap, kendala, hasil, dan langkah berikutnya. Status pekerjaan dipisahkan dari koneksi dan aktivitas karakter (`src/work.ts`).

### Tahap 3 — hasil, preview, revisi, approval
Tab Hasil per divisi dengan pencarian dan halaman (`src/results.ts`). Tugas lokal membuka preview teks dengan pilihan versi, produksi membuka preview video/QC. Versi lama hanya ditinjau, keputusan terikat versi terbaru yang diperiksa, membuka preview tidak menyetujui apa pun. Bug tombol "Preview v1, v2" diperbaiki.

### Tahap 4 — SOP, anggota, setelan agent
SOP per divisi berversi; briefing mencatat versi SOP dan konteks AI menyertakannya. Anggota bisa diarsipkan dengan serah terima pekerjaan terbuka dan dipulihkan; pengaman untuk manager, agent n8n, agent yang bekerja/error, dan divisi produksi KaelaCH. Setelan provider/model/catatan per agent. Tab Percakapan menyimpan catatan diskusi Founder (belum terhubung AI).

### Tahap 5 — runtime AI per agent
Tombol "Jalankan dengan AI" di detail tugas lokal untuk agent dengan provider Codex (`server/runtime.mjs`, `server/codex-stage.mjs`). Memakai login Codex CLI di komputer ini, folder kosong baca-saja, model dari setelan agent. Hasil masuk sebagai versi baru menunggu pemeriksaan. Run bisa dihentikan; butuh info/gagal/restart menjeda tugas tanpa ulang otomatis. Claude/Hermes belum punya runtime.

### Tahap 6 — konteks dan antrean persisten

Run membedakan antrean dan eksekusi. Salinan konteks/provider/model, catatan revisi dan waktu antre disimpan sebelum mulai; retry tetap membawa arahan sebelum gagal. Konteks menyertakan sampai tiga hasil sebelumnya milik agent dalam divisi yang sama. Setelah restart, antrean dilanjutkan tetapi run aktif dijeda sebagai terputus tanpa pengulangan otomatis. Antrean bisa dibatalkan tanpa memanggil AI. Status karakter, pekerjaan dan notifikasi mengikuti run; hasil tetap menunggu pemeriksaan/approval. File utama: `server/runtime.mjs`, `src/domain.ts`, `src/work.ts`, `src/workspace.ts`, `src/notifications.ts`, `src/visuals.ts`, `src/operations.ts`.

Uji Codex sungguhan berhasil melalui `scripts/check-agent-runtime.mjs` dengan fixture terpisah: checklist Indonesia tiga butir, hasil v1 berstatus review dan tanpa approval. Bukti lokal: `evidence/agent-runtime-smoke/run-jBTsp8/check.json`. Data kantor pemilik tidak dipakai untuk prompt uji. Sesi tetap baru per run; memori berupa catatan/hasil terbatas, bukan riwayat chat penuh atau sinkronisasi antarprovider.

Backend terbaru sudah dimuat ulang setelah dipastikan tidak ada pekerjaan aktif. Frontend 5173/backend 5174 HTTP 200; runtime Codex tersedia. Revision pemilik tetap 9 (2 divisi, 7 agent), hash SHA256 tetap `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`. Tidak ada hasil/keputusan pemilik yang dibuat atau diubah oleh pengujian.

### Audit Lembur dirapikan (dokumen saja)
Laporan di `analysis/lembur-audit-2026-10-14/` diberi label kepastian (01, 07–09), kolom padanan Kael di tabel instalasi 03, 11 aspek perbandingan di 07, dan path backup baru. Lembar 8 keputusan owner dengan rekomendasi: `analysis/lembur-audit-2026-10-14/KEPUTUSAN-OWNER.md`. Tidak ada perubahan kode.

### Perapian tampilan (UI/UX)
Tanpa perubahan perilaku atau data. Tombol utama di judul bagian (Buat SOP, Tambah catatan) kini terbaca; sebelumnya teksnya gelap di atas tombol gelap. Judul atas mengikuti tab divisi yang dibuka, bukan selalu "Ruang kerja". Keadaan kosong memakai kartu bergaris putus-putus yang seragam. Peringatan status eksternal tampil sebagai blok kuning lembut. Ringkasan divisi memakai chip. Garis antar anggota dirapikan, penanda pintasan Builder "/" terlihat, dan ada cincin fokus keyboard. Label "Status asli" diganti "Status di sumber". File: `src/dashboard.css` (blok "UI polish" di akhir), `src/operations.ts` (2 baris). Cadangan file lama: `backup-ui-2026-10-14/`.

## Lanjutan sesi terhenti — 14 Oktober 2026

Pemeriksaan ulang menemukan filter divisi halaman Keputusan belum ditangani oleh listener, dan catatan keputusan belum mengikuti perubahan pilihan revisi/penolakan. Keduanya diperbaiki di `src/operations.ts`; label `pending` menjadi "Menunggu keputusan". Dua tes handler UI di `tests/ui.test.mjs` mencakup filter valid/tidak valid, pilihan versi, catatan wajib, dan pengaman saat penyimpanan.

Verifikasi: 115/115 tes lulus di Node.js 24.21.0; typecheck dan build lulus. Tes awal dalam sandbox gagal pada rename file sementara/menjalankan server; pengulangan dengan izin terminal berhasil. Frontend 5173 dan backend 5174 merespons HTTP 200. Hash data pemilik sebelum/sesudah tetap sama; tidak ada task AI, keputusan, atau pemulihan error pemilik yang dijalankan untuk pengujian.

Repo Git lokal diinisialisasi dan checkpoint dibuat sesuai `AGENTS.md`, tanpa push/remote. `.gitignore` mengecualikan data, kredensial, backup, hasil render/screenshot, dan proposal lokal. Acuan `@RTK.md` tidak ditemukan di workspace atau lokasi induk yang diperiksa; instruksinya belum dapat diterapkan.

Build masih memberi peringatan bundle JavaScript sekitar 749 kB; pemisahan bundle belum dikerjakan pada langkah ini. Tes listener UI tidak menggantikan pemeriksaan tampilan di browser.

## Belum diverifikasi

- Semua model/provider dan pekerjaan nyata pemilik; baru satu tugas sintetis diuji dengan Codex sungguhan.
- Tampilan langsung di komputer pemilik untuk tahap 3–5.

- Keputusan owner nomor 1–3 di `KEPUTUSAN-OWNER.md` (menentukan langkah koding berikutnya).

Status tes terakhir: 118 tes lulus di Node.js 24.21.0, typecheck dan build lulus (bundle sekitar 751 kB). Uji HTTP meliputi antrean yang bertahan setelah restart. QA visual langsung belum dilakukan.

## Langkah berikutnya (kandidat)

1. Pemilik memeriksa tampilan tahap 3–6 dan mencoba satu tugas miliknya, lalu meninjau/revisi hasil.
2. Runtime untuk Claude (atau Hermes) setelah cara login/kuotanya dipastikan.
3. Telegram manager (Bu Yuli) untuk tanya status divisi, baca saja.
4. Backup/restore dari UI dan migrasi penyimpanan (lihat `analysis/lembur-audit-2026-10-14/09-IMPLEMENTATION-ROADMAP.md`).
