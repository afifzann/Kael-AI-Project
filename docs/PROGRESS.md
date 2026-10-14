# Progres pengembangan Kael AI

Catatan bersama untuk semua coding agent. Perbarui setiap satu langkah selesai (lihat `AGENTS.md`).

Terakhir diperbarui: 14 Oktober 2026.

## Tujuan akhir

Kael menjadi produk self-hosted yang dijual dan dipasang di VPS pelanggan (lisensi dan pembaruan lewat layanan pusat minimal). Acuan: `analysis/lembur-audit-2026-10-14/`, roadmap P0–P7 di laporan 09. Tahap 1–6 membangun workspace/runtime (P1); tahap 7 bagian awal membangun akses pemilik (sebagian P2). Paket sumber buyer dan onboarding awal sekarang tersedia; belum installer. Yang belum: keputusan P0 (laporan 10), kelengkapan P2 izin/broker, P3 penyimpanan dan backup, P4 installer, P5 pembaruan dan lisensi.

## Selesai

### Runtime Claude Code per agent — PRD v2.37

Pemilik menyelesaikan login CLI sendiri. Status terverifikasi: Claude Code 2.1.291, login claude.ai dengan paket Pro; identitas/token/password tidak dicetak/disimpan oleh adapter. Skill ECC Agent Harness Construction dipakai untuk keluaran terstruktur, batas tindakan, penghentian dan error yang dapat ditindaklanjuti.

Adapter baru `server/claude-stage.mjs` menjalankan CLI resmi tanpa shell, dengan safe/restricted/no-tools/no-MCP/no-browser/no-session-persistence, schema JSON, maksimal 4 giliran/10 menit/4 MB output. Tidak memakai bare mode karena tidak memuat login subscription. Variabel rahasia layanan tidak diwariskan; raw stderr/metadata provider tidak menjadi hasil. Binary/login provider tidak dimodifikasi. Ini tugas teks dari konteks, bukan broker alat eksternal atau bukti sandbox OS penuh; policy admin tetap berlaku.

`server/runtime.mjs` memilih adapter dari provider snapshot, mengecek koneksi/cache per provider, dan melewati run antre provider offline agar provider lain tetap dapat bekerja. Tidak mengganti provider otomatis dan gagal tidak diulang sendiri. Domain/server mengizinkan onboarding Claude hanya jika koneksinya tersedia. `src/runtime-status.ts` menjaga helper/tipenya ringan untuk entry login. Detail pekerjaan, onboarding, modal setelan dan Pengaturan → AI pada server menampilkan status per provider; polling merespons perubahan koneksi tanpa perubahan revision. Nama/model/peran agent lama tidak diubah. Produksi video tetap Codex. Panduan: `docs/CLAUDE-RUNTIME.md`, README dan BUYER-SETUP diperbarui.

Uji sungguhan opt-in `node scripts/check-agent-runtime.mjs Claude` berhasil pada data sintetis terpisah: checklist Indonesia 3 butir, hasil v1 berstatus review, founderApproval false. Bukti: `evidence/agent-runtime-smoke/run-NvR1zi/check.json`. Tidak ada tugas/data pribadi dipakai untuk prompt; hasil pemilik tidak disentuh. Uji otomatis memakai fixture: auth/status tidak membocorkan identitas, argv/env, parse gagal, overflow, cancel/late result, timeout, provider scoped, antrean campuran dan onboarding. **138/138 tes lulus**, build aplikasi/paket lulus; bundle sekitar 752 kB tetap memberi peringatan ukuran.

Server lokal sebelumnya berhenti, lalu dinyalakan tersembunyi (PID dev 19936). Frontend 5173 HTTP 200, state anonim 401, status API Codex dan Claude available true, 0 run antre/aktif. State pemilik revision 9, hash tetap `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`. Akun pemilik tetap sama; restart dapat meminta login dashboard ulang.

Paket sumber terbaru terpisah: `releases/kael-buyer-0.2.0-claude/` (66 file sumber + manifest, diabaikan Git), typecheck/build berhasil. Paket sebelumnya dipertahankan sebagai checkpoint. Belum diuji: semua model/kuota, QA browser langsung, Ubuntu/VPS baru, installer/TLS/domain/checkout/email/backup penuh. Builder adaptif, manager otonom, pemeriksa AI terpisah dan Hermes masih belum tersedia. Langkah berikutnya: Builder percakapan dengan usulan/preview yang diterapkan melalui bridge terkontrol.

### Paket sumber buyer dan penyiapan awal — PRD v2.36

User menyetujui paket buyer bersih dan setup awal sebelum divisi bisnis internal. Instalasi baru setelah login mengikuti profil/konteks bisnis → tinjau template Tim konten/Tim operasional atau mulai kosong → pelaksanaan manual/Codex terdeteksi. Nama divisi, manager, pelaksana/peran editable sebelum penerapan; SOP dan batas tindakan ditampilkan. Langkah disimpan atomik satu revision; reload/restart melanjutkan, stale retry/duplikasi ditolak. Tidak membuat tugas, menjalankan AI atau memberi approval. Kantor lama tanpa metadata onboarding tidak direset/dipaksa setup ulang. Sidebar mengikuti nama bisnis. Ringkasan buyer memberi panduan tugas pertama berdasarkan status briefing/hasil/keputusan yang sebenarnya, dengan tombol ke tahap yang tepat.

File utama: `src/onboarding.ts`, `src/onboarding-model.ts`, `src/onboarding.css`, `src/domain.ts`, `src/entry.ts`, `src/main.ts`, `src/operations.ts`, `server/index.mjs`. UI Craft mengikuti kontrak monokrom/aksen kecil, form native satu kolom, fokus keyboard, pesan error, retry dan ukuran mobile. Diskusi Builder AI adaptif, koordinasi manager otomatis, white-label lengkap, domain dan runtime Claude/Hermes tetap belum tersedia; tahap ini tidak menyatakan AI terhubung hanya karena login dashboard atau memilih model.

`scripts/package-buyer.mjs`/`npm run package:buyer` membuat 64 file sumber melalui allowlist + manifest SHA256. Tidak membaca/menyalin .env, app-data, akun/kunci, backup, catatan proyek privat, history chat atau node_modules. Sesi Builder pengembang dikosongkan pada salinan paket; folder yang sudah ada ditolak. Cache Python dikecualikan khusus; symlink/non-sumber lain ditolak. Startup paket terpisah menemukan ketergantungan pada catatan `docs/KAELACH-RECAP.md`; SOP runtime kini berada di `server/recap/sop.md`, mempertahankan sumber/cerita, audio, enam lapisan editing, QC dan persetujuan. Catatan pemilik tidak ikut paket.

Paket uji aktual: `releases/kael-buyer-0.2.0/` (diabaikan Git), panduan `docs/BUYER-SETUP.md`. Paket aktual typecheck/build berhasil; manifest 64 checksum valid. Tes startup paket menggunakan folder/data/akun sementara dan dependensi lokal lewat junction, bukan npm ci pada VPS bersih. Tidak ada AI sungguhan dipanggil atau hasil pemilik diubah. Tes domain/handler UI/HTTP/auth mencakup validasi, gagal simpan, resume/restart, runtime tak tersedia, konflik, scope Builder, keadaan kosong, checksum dan pemisahan data. Verifikasi akhir: **131/131 tes lulus**, build lulus. Peringatan bundle sekitar 752 kB tetap ada.

Server lokal dimuat ulang setelah scope baca Builder memastikan 0 run antre/aktif dan 0 produksi aktif; PID dev baru 22236. Frontend 5173 HTTP 200 memuat entry, auth menunjukkan akun pemilik sudah ada, API state anonim 401. Password/kode setup pemilik tidak dibaca/dicetak. Hash state tetap `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`, revision 9. Sesi browser lama perlu login ulang setelah restart.

Belum diverifikasi: QA visual/responsif/browser langsung, npm ci/pemasangan pada Ubuntu/VPS bersih, TLS/domain publik, installer, lisensi/checkout/email, backup penuh, runtime Claude/Hermes dan Builder adaptif. Paket ini fondasi uji, belum siap dijual. Berikutnya: menuntaskan koneksi AI buyer dan pendampingan tugas pertama, lalu installer VPS dengan uji instalasi bersih; jangan membuka dev server ke internet.

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

### Tahap 7 bagian awal — akses pemilik dan pemisahan instalasi

Setup akun pertama memakai kode privat sekali pakai dari terminal, login/logout, hash scrypt, sesi cookie HttpOnly/SameSite, CSRF, expiry dan pembatasan percobaan. Auth melindungi seluruh API termasuk produksi/media; bridge pengaturan tim tetap tersedia dengan kunci lokal terbatas, tanpa izin run atau keputusan Founder. Frontend menunggu login sebelum memuat kantor. Instalasi baru memakai state/akun/kunci terpisah; tautan chat Builder internal hanya ditampilkan dari sesi terverifikasi.

File utama: `server/auth.mjs`, `server/index.mjs`, `src/access.ts`, `src/access.css`, `src/entry.ts`, `scripts/owner-access.mjs`, `scripts/building.mjs`, serta handler tautan Builder. Panduan: `docs/OWNER-ACCESS.md`. Tes memakai akun fixture sungguhan pada server terpisah, tanpa bypass auth; mencakup akses anonim/CSRF, scope Builder, dua instalasi buyer, restart/logout, rate limit/expiry, corrupt record dan handler UI. Browser/visual serta instalasi VPS publik belum diverifikasi. Akun pemilik sebenarnya perlu dibuat sendiri melalui UI; tidak ada password yang dipilih oleh coding agent.

Verifikasi akhir: 124/124 tes lulus, typecheck/build lulus. Server dimuat ulang setelah dipastikan tidak ada run/produksi aktif. Frontend HTTP 200 memuat entry login dan header anti-frame; status auth menunjukkan perlu setup, sedangkan state/produksi/Builder anonim HTTP 401. Hash data pemilik tetap `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`. Kode setup dan password pemilik tidak dibaca/dicetak oleh agent; proses server membuat kode untuk diambil sendiri oleh pemilik.

### Audit Lembur dirapikan (dokumen saja)
Laporan di `analysis/lembur-audit-2026-10-14/` diberi label kepastian (01, 07–09), kolom padanan Kael di tabel instalasi 03, 11 aspek perbandingan di 07, dan path backup baru. Lembar 8 keputusan owner dengan rekomendasi: `analysis/lembur-audit-2026-10-14/KEPUTUSAN-OWNER.md`. Tidak ada perubahan kode.

### Perapian tampilan (UI/UX)
Tanpa perubahan perilaku atau data. Tombol utama di judul bagian (Buat SOP, Tambah catatan) kini terbaca; sebelumnya teksnya gelap di atas tombol gelap. Judul atas mengikuti tab divisi yang dibuka, bukan selalu "Ruang kerja". Keadaan kosong memakai kartu bergaris putus-putus yang seragam. Peringatan status eksternal tampil sebagai blok kuning lembut. Ringkasan divisi memakai chip. Garis antar anggota dirapikan, penanda pintasan Builder "/" terlihat, dan ada cincin fokus keyboard. Label "Status asli" diganti "Status di sumber". File: `src/dashboard.css` (blok "UI polish" di akhir), `src/operations.ts` (2 baris). Cadangan file lama: `backup-ui-2026-10-14/`.

## Lanjutan sesi terhenti — 14 Oktober 2026

Pemeriksaan ulang menemukan filter divisi halaman Keputusan belum ditangani oleh listener, dan catatan keputusan belum mengikuti perubahan pilihan revisi/penolakan. Keduanya diperbaiki di `src/operations.ts`; label `pending` menjadi "Menunggu keputusan". Dua tes handler UI di `tests/ui.test.mjs` mencakup filter valid/tidak valid, pilihan versi, catatan wajib, dan pengaman saat penyimpanan.

Verifikasi: 115/115 tes lulus di Node.js 24.21.0; typecheck dan build lulus. Tes awal dalam sandbox gagal pada rename file sementara/menjalankan server; pengulangan dengan izin terminal berhasil. Frontend 5173 dan backend 5174 merespons HTTP 200. Hash data pemilik sebelum/sesudah tetap sama; tidak ada task AI, keputusan, atau pemulihan error pemilik yang dijalankan untuk pengujian.

Repo Git lokal diinisialisasi dan checkpoint dibuat sesuai `AGENTS.md`, tanpa push/remote. `.gitignore` mengecualikan data, kredensial, backup, hasil render/screenshot, dan proposal lokal. Acuan `@RTK.md` tidak ditemukan di workspace atau lokasi induk yang diperiksa; instruksinya belum dapat diterapkan.

Build masih memberi peringatan bundle JavaScript sekitar 749 kB; pemisahan bundle belum dikerjakan pada langkah ini. Tes listener UI tidak menggantikan pemeriksaan tampilan di browser.

## Revisi master prompt riset — 14 Oktober 2026

Versi lanjutan disimpan di `docs/prompts/LEMBUR-RESEARCH-MASTER.md`. Prompt membaca audit terdahulu dan progres/source Kael terlebih dahulu, membuat matriks kekurangan, mempertahankan cakupan 27 topik, serta memisahkan temuan Lembur, rekomendasi, implementasi Kael dan tingkat pengujian. Kriteria selesai mengukur cakupan/bukti, bukan jumlah laporan. Lampiran asli dan source backup tidak diubah. Ini revisi dokumen instruksi; audit tambahan, folder 27 laporan dan tahap 7 belum dijalankan oleh pekerjaan ini.

Verifikasi revisi dokumen: 27 topik unik berurutan dan acuan/status utama diperiksa dengan assert; 118 tes proyek serta build lulus. Peringatan ukuran bundle sekitar 751 kB tetap ada. Prompt belum dijalankan sebagai audit lanjutan, sehingga belum ada klaim bahwa seluruh kekurangan riset telah ditutup.

## Belum diverifikasi

- Semua model/provider dan pekerjaan nyata pemilik; baru tugas sintetis terpisah yang diuji sungguhan pada Codex dan Claude, masing-masing menghasilkan v1 review tanpa approval otomatis.
- Tampilan langsung di komputer pemilik untuk tahap 3–5.

- Keputusan owner nomor 1–3 di `KEPUTUSAN-OWNER.md` (menentukan langkah koding berikutnya).

Status tes terakhir: 138 tes lulus, typecheck/build aplikasi dan paket buyer lulus di Node.js 24.21.0. Codex dan Claude masing-masing telah menyelesaikan satu tugas sintetis; belum pengujian semua model/provider. Bundle kantor sekitar 752 kB (peringatan >500 kB tetap ada) dan dimuat setelah login/setup; entry akses/onboarding sekitar 15 kB. QA visual langsung belum dilakukan.

## Langkah berikutnya (kandidat)

Tambahan pemilik **Alur Sistem Kantor AI — Kael Ai**, versi 2 (24 bagian, klaim kit 0.19.2/VPS), sudah dibaca seluruhnya. Pemetaan kemampuan Kael vs referensi dan usulan urutan lanjutan ada di `docs/BUYER-OPERATIONS-ROADMAP.md`. Ini analisis dokumen, bukan verifikasi ulang VPS/kit atau penerapan semua fiturnya. Gap utama: Builder adaptif/runtime Claude, koordinasi manager dan pemeriksa terpisah, kelanjutan keputusan, serah terima antar-divisi, jadwal/budget/notifikasi, kemudian installer/perawatan/penjualan. Tidak menjalankan perintah/cron atau mengubah kantor asal dari lampiran. Checkpoint implementasi onboarding/paket: `5175e88`.

Verifikasi setelah tambahan analisis: 131/131 tes lulus dan build lulus; peringatan bundle sekitar 752 kB tetap ada. Tambahan ini hanya mengubah dokumen roadmap/progres, tanpa kode runtime atau data kantor.

Tambahan pemilik tentang alur penjual kit sudah dipetakan pada bagian akhir `docs/BUYER-OPERATIONS-ROADMAP.md`: promosi/penawaran, pembayaran/email deterministik, aktivasi VPS, keaslian paket, installer, kelengkapan bisnis dan update/support. Status implementasi dipertahankan jujur; harga/slot/waktu pasang/penanda per pembeli pada referensi tidak dijadikan janji Kael. Model Kael tetap jual lepas, VPS/akun AI buyer sendiri; ketentuan update/support/slot belum ditetapkan. Tidak ada pembayaran, email, aktivasi atau perubahan VPS yang dijalankan dari tambahan ini.

1. Pemilik sudah membuat akun. Periksa UI login/tahap 3–7 dan onboarding pada instance buyer terpisah, lalu coba satu tugas serta tinjau/revisi hasil. Kelengkapan P2 (recovery, izin tindakan/broker dan isolasi proses) belum selesai.
2. Runtime Claude tugas teks sudah tersedia. Berikutnya Builder adaptif; Hermes tetap belum tersedia. Kuota dan semua model provider belum diuji.
3. Telegram manager (Bu Yuli) untuk tanya status divisi, baca saja.
4. Backup/restore dari UI dan migrasi penyimpanan (lihat `analysis/lembur-audit-2026-10-14/09-IMPLEMENTATION-ROADMAP.md`).
