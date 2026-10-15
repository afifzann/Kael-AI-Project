# Progres pengembangan Kael AI

Catatan bersama untuk semua coding agent. Perbarui setiap satu langkah selesai (lihat `AGENTS.md`).

Terakhir diperbarui: 15 Oktober 2026.

## Tujuan akhir

Kael menjadi produk self-hosted yang dijual dan dipasang di VPS pelanggan (lisensi dan pembaruan lewat layanan pusat minimal). Acuan: `analysis/lembur-audit-2026-10-14/`, roadmap P0–P7 di laporan 09. Tahap 1–6 membangun workspace/runtime (P1); tahap 7 bagian awal membangun akses pemilik (sebagian P2). Paket sumber buyer dan onboarding awal sekarang tersedia; belum installer. Yang belum: keputusan P0 (laporan 10), kelengkapan P2 izin/broker, P3 penyimpanan dan backup, P4 installer, P5 pembaruan dan lisensi.

## Selesai

### Batas password lebih singkat — 15 Oktober 2026

Atas permintaan pemilik, minimal password setup dan pemulihan diturunkan dari 15 menjadi 8 karakter (maksimal 128). Validasi server, formulir/konfirmasi dan panduan README/BUYER-SETUP/OWNER-ACCESS diselaraskan. Password lama tetap berlaku; tidak mengganti akun atau password pemilik. Hash, sesi, CSRF dan batas percobaan login tetap menggunakan mekanisme yang sama.

Verifikasi: 182/182 tes penuh dan npm run build lulus. Tes akun tiruan mencakup penolakan 7/129 karakter, penerimaan 8/128, konfirmasi, login dan pemulihan. Backend/frontend dimuat ulang setelah aktivitas diperiksa luang (PID dev 7308); frontend HTTP 200, formulir minimal 8 dan needsSetup false. Hash state pemilik tetap ff4149d5c6b5150c7e3833ba6917d470b6d6a3ef5fcfcdb726f35a868bf979f4. Warning bundle kantor sekitar 772 kB tetap ada. Belum mencoba login/reset akun pemilik atau klik GUI; paket rilis buyer lama tidak dibuat ulang. Langkah berikutnya: pemilik dapat memilih password baru lewat pemulihan lokal; roadmap produk tetap mengikuti catatan otomasi di bawah.

### Otomasi tugas lokal dan review manager — PRD v2.43

Otomasi opt-in per divisi melalui SOP & integrasi; hanya approval rencana berikutnya disnapshot untuk otomatisasi. Prasyarat SOP/provider manager dan semua pelaksana. Antrean runtime existing menserialkan worker/review (provider/model manager sendiri); task berikutnya menunggu hasil sebelumnya disetujui. Konteks menyertakan sampai tiga handoff hasil disetujui dari brief yang sama. Review valid menggunakan domain review existing dan tetap menunggu Founder; maksimal dua revisi manager lalu guidance. Revisi Founder pada task ID yang sama, hasil lama dipertahankan.

Budget default 8, rentang 2–100 run otomatis/divisi/hari WIB, reservasi atomik/persist termasuk worker/review; pengaturan tidak mereset usage. Jeda membatalkan run automatic aktif/queued. Running pada restart menjadi interrupted tanpa retry; queued resume sekali. Failed/blocked/malformed/usang tidak berulang. Mode workflow/produksi dan agent tidak tersedia dikecualikan. Owner-only config/review endpoint, command review-start internal, bridge tidak dapat mengubah budget atau memanggil manual run untuk melewati scheduler. Tidak menjanjikan batas uang/token atau membangunkan chat desktop.

File utama: src/domain.ts, server/runtime.mjs/index.mjs/office-bridge.mjs, operations/visuals/work/workspace, tests/automation.test.mjs, fixture runtime dan UI tests; panduan OFFICE-ROLES/BUYER-SETUP, README, PRD, implementasi dan DESIGN diperbarui. Tidak menambah dependensi. Field opsional pada schema 1 mempertahankan state lama dan tidak mengaktifkan task lama.

Verifikasi akhir: 181/181 tes penuh lulus; 13 tes otomasi terarah lulus termasuk endpoint review manual setelah jeda. Typecheck/build aplikasi dan paket buyer lulus; warning bundle kantor 772 kB tetap ada. Paket releases/kael-buyer-0.2.0-automation berisi 76 sumber/checksum valid dengan dependensi lokal (belum npm ci/VPS bersih). Server dev dimuat ulang tersembunyi setelah dipastikan tidak ada task/produksi/chat/sesi peran aktif (PID 6236). Frontend 200, review anonim 401, akun tetap needsSetup false. State pemilik tetap revision 9, automations 0, hash FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4.

Tes fixture mencakup approval, review, dua revisi, budget, restart worker/reviewer, queued sekali, pause/abort, provider scope, handoff/sekuensial, error manager late response, mode workflow, owner/bridge/auth/CSRF, notifikasi dan UI opt-in. Belum live-provider review manager, klik GUI/browser, VPS dan batas biaya provider. Tidak mengaktifkan otomasi atau mengubah state kantor pemilik.

## Selesai sebelumnya

### Tombol kembali dan perapian kontrol dashboard — PRD v2.42

Pemilik meminta tombol back tiap halaman dan menunjukkan filter Divisi Keputusan yang menempel/tanpa gaya. Audit source menemukan approval-scope belum memiliki layout/style kontrol umum; beberapa select hanya memiliki chevron/appearance tanpa base ukuran/padding yang sama. Dashboard/dialog sekarang memakai style select bersama, label Divisi terpisah dengan gap 8px, filter-label/Hasil konsisten, fokus/disabled/forced-colors dan target 44px. Tidak merombak warna/material/layout 3D.

Header memuat tombol Kembali yang sama pada semua halaman. History internal mencatat depth dan scroll; Back memakai popstate existing, link langsung memakai parent divisi/direktori/Ringkasan agar tidak keluar aplikasi. Root tanpa riwayat disabled; mobile ikon dengan aria-label. File utama: src/main.ts, src/operations.ts, src/routes.ts, src/dashboard.css, tests/ui.test.mjs; DESIGN/PRD/implementasi diperbarui.

Tes terarah UI (12) dan build lulus. Dua tes baru mencakup semua parent halaman, handler navigasi asli, filter/Back/reload, direct link dan busy guard. Verifikasi akhir: seluruh 167 tes lulus dan typecheck/build lulus; warning bundle kantor 767 kB tetap ada. Frontend 200 dan module main/dashboard.css terbaru memuat tombol/gaya filter. Vite memuat perubahan frontend tanpa restart backend. Hash state pemilik tetap FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4. Audit form lain mencakup Pekerjaan, Briefing/tugas, Hasil, workflow, produksi, Builder dan dialog; kontrol input/textarea sudah memiliki style komponennya dan select memakai base shared. Belum inspeksi visual/browser/sentuhan/screen-reader langsung. Tidak mengubah state/akun/keputusan pemilik.

## Selesai sebelumnya

### Alur kantor utuh dan kelanjutan keputusan — PRD v2.41

Permintaan berikutnya adalah menguji dari sesi Builder sampai keputusan/revisi dan memperbaiki sambungan yang putus. Uji HTTP baru semula gagal karena konteks hanya memuat keputusan pending. Bridge kini menambahkan recentDecisions (20 terbaru, scope peran) serta workStatus/stage/nextStep dari helper dashboard existing. Manager melanjutkan sesuai tahap, tanpa auto-approval atau membuat tugas pengganti untuk revisi. contextFor sebelumnya memakai slice(-3) pada keputusan newest-first; diperbaiki ke tiga terbaru dan memasukkan catatan persetujuan rencana.

File utama: server/office-bridge.mjs, src/domain.ts, tests/office-bridge.test.mjs, tests/runtime.test.mjs; panduan OFFICE-ROLES, PRD dan implementasi diperbarui. Pilot fixture HTTP: usulan native → preview/edit provider → penerapan owner → manager plan → approval → runtime → review hasil penuh → revisi owner → pindah Claude/Codex/restart → v2 → review → approval final. Cabang penolakan hasil/rencana, stale revision, larangan approve AI, versi lama dan persist metadata juga diperiksa. Snapshot n8n fixture dilengkapi field array sesuai kontraknya. Tidak menjalankan tugas atau membuat keputusan pada kantor pemilik.

Verifikasi akhir: 165/165 tes penuh lulus; 19 tes office/runtime terarah lulus setelah instruksi final; typecheck/build aplikasi dan paket buyer lulus. Paket releases/kael-buyer-0.2.0-lifecycle berisi 76 sumber dengan checksum valid, menggunakan dependensi lokal (belum npm ci/VPS bersih). Warning bundle kantor 766 kB tetap ada. Server lokal semula mati; dinyalakan tersembunyi dengan PID dev 3084 setelah kedua port dipastikan kosong. Frontend 200, office-bridge anonim 401 dan akun needsSetup false. State pemilik tetap revision 9/hash FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4; tidak membuka/mengubah sesi atau pekerjaan pemilik.

Belum: klik GUI/browser langsung, pekerjaan provider sungguhan lintas aplikasi pada lifecycle ini, scheduler manager atau installer VPS. Kelanjutan saat ini dipicu prompt lanjut; approval web tidak membangunkan chat desktop sendiri.

## Selesai sebelumnya

### Koreksi alur utama: sesi peran Claude/Codex — PRD v2.40

Pemilik menegaskan acuan Lembur adalah sesi Builder/manager pada aplikasi AI yang terhubung ke kantor, bukan memindahkan semua diskusi ke web. Audit 00/05 dan panduan peran publik diperiksa ulang. Implementasi v2.39 tetap dipertahankan sebagai preview/draft dan opsi chat web, tetapi jalur utama sekarang `jadi builder`/`jadi nama agent` pada folder kantor di aplikasi AI.

Hook Claude project-local mengikat ID sesi native, menyisipkan konteks peran setiap prompt/resume, memperbarui aktivitas dan menandai luang saat Stop/SessionEnd, tanpa membaca transcript. Bridge CLI menyediakan roles/open/context/send/leave untuk client lain dan fallback. Peran mengikuti agent/divisi dinamis, memori per ID agent memakai version guard antarclient. Context manager berisi tugas, keputusan, catatan dan workflow/insiden milik divisinya; Builder memperoleh konteks kantor dan usulan. Tidak membaca .env/OAuth/password provider.

Domain baru office-command memeriksa aktor/lingkup/revision; manager-plan membuat satu brief/keputusan dengan tugas per pelaksana secara atomik. Worker dapat start/result/hold tugas sendiri; manager menjalankan runner yang sudah tersedia dan mereview versi hasil setelah membaca hasil penuh. Approval Founder, penghapusan dan lintasdivisi ditolak. Proposal desktop masuk preview lama dan menunggu apply pemilik. Produksi/workflow khusus tetap terpisah. Metadata presence dikirim lewat state virtual; state pekerjaan tidak dipakai menyimpan status chat, identitas native atau memori privat.

File utama: `server/office-bridge.mjs`, `src/office-role.ts`, `scripts/office.mjs`, `scripts/claude-office-hook.mjs`, `.claude/settings.json`, CLAUDE/AGENTS, domain/server/auth, Builder UI dan visuals. Paket buyer memasukkan helper/hook/panduan generik, tanpa ikatan sesi/kunci/memori pemilik. Instruksi peran bisnis terpisah dari tugas coding source. Panduan: `docs/OFFICE-ROLES.md`.

Uji CLI Claude nyata berhasil dengan hook proyek pada kantor sintetis Maya QA: native session bound, 0 tugas/keputusan, revision fixture 1. Bukti `evidence/native-office-smoke/run-wLqj55/check.json`; tidak memuat atau mengubah kantor pemilik. Tes otomatis memakai fixture: peran/ID/konteks, persist/restart/memori, crossclient conflict, Builder multi-sesi/luang, batas arsip/restart, plan multiworker, approval gate, hasil penuh/review versi, XSS/preview desktop, hook cwd/lifecycle tanpa transcript, HTTP/auth dan karakter fresh/medical. Uji penuh awal menemukan assertion persistence belum mengecualikan metadata officeSessions virtual; sudah diperbaiki. Verifikasi akhir: 164/164 tes lulus, typecheck/build aplikasi dan paket buyer lulus. Bundle kantor 766 kB masih memberi peringatan ukuran. Paket sumber final releases/kael-buyer-0.2.0-native-roles-3 berisi 76 file dengan checksum valid, tanpa data/kunci/memori pemilik; dependensi lokal dipakai untuk build, belum npm ci pada VPS bersih.

Server terbaru dimuat ulang tersembunyi setelah dipastikan tidak ada task/produksi/Builder web atau sesi peran baru aktif (PID dev 1560). Frontend HTTP 200, office-bridge anonim 401/operator lokal 200, Claude available true, akun tetap needsSetup false. Data pemilik tetap revision 9 dengan hash FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4; tidak membuka sesi atau menerapkan usulan pada kantor pemilik.

Belum: klik/resume GUI Claude desktop, sesi Codex native nyata, SSH/VPS, penjadwal manager/cron, inbox antar-divisi, tindakan eksternal serta provisioning/penjualan. Sesi/pin pada sidebar masih dibuat pengguna melalui client. Bridge master key dipercaya sebagai operator lokal, bukan isolasi OS antara agent satu user. Tidak mengklaim seluruh fitur produk referensi sudah selesai.

## Selesai sebelumnya

### Builder percakapan, draft dan penerapan — PRD v2.39

Builder web memakai Claude/Codex lokal untuk diskusi adaptif dan menyusun manager, 1–12 pelaksana, SOP/serah terima, kriteria dan batas tindakan. Diskusi tersimpan per instalasi, dapat dilanjutkan setelah refresh/restart, preview editable dengan simpan/buang perubahan, stop/retry/cancel dan penerapan eksplisit. Divisi baru mendapat ruangan/karakter/furnitur preset. Edit divisi lokal mempertahankan ID manager/pekerja lama, pekerjaan/hasil/keputusan, SOP versi lama serta setelan provider anggota lama. Divisi workflow dan produksi khusus KaelaCH tetap melalui konfigurasi masing-masing. Tidak membuat tugas, approval atau integrasi otomatis.

File utama: `src/builder-model.ts`, `server/builder-dialogue.mjs`, `src/builder-dialogue.ts/css`, domain, server dan integrasi dashboard/studio/profil. API diskusi memakai owner/CSRF; bridge key tidak mendapat akses. Usulan divalidasi, perubahan tim/SOP atomik satu revision, provenance mencegah duplikasi setelah crash/response gagal. Konflik kantor/diskusi tidak diulang otomatis. Invalid output menjaga pesan/draft lama; giliran restart menunggu retry manusia. Offline UI tidak berulang otomatis. Percakapan web tidak membaca/menampilkan history desktop. Arsip lokal saat ini 100 diskusi, sekitar 30 giliran tiap diskusi; belum pengarsipan khusus.

Skill Building, ECC Agent Harness Construction dan UI Craft dipakai sesuai alur existing serta tema monokrom. Tes mencakup validasi/ID/SOP/settings/history, apply sekali, stale/race, stop/late output, restart, malformed/failed/offline/retry, auth/CSRF gate melalui handler bersama, prompt scoped, XSS escaping, dirty draft, konflik versi dan polling. Verifikasi akhir: 153/153 tes lulus, typecheck/build aplikasi dan paket buyer final lulus. Warning bundle kantor sekitar 766 kB tetap ada. Uji Claude sungguhan opt-in `scripts/check-builder-runtime.mjs Claude` berhasil: satu manager/pelaksana dan SOP, setelah langkah penerapan pengujian eksplisit, 0 task/keputusan. Bukti `evidence/builder-smoke/run-yktSFw/check.json`, seluruh bisnis/data sintetis terpisah; tidak memuat atau mengubah kantor pemilik.

Server final dimuat ulang tersembunyi setelah dipastikan tidak ada task/produksi/giliran Builder web aktif (PID dev 18420). Frontend HTTP 200, endpoint diskusi anonim 401 dan bridge key 403, Codex/Claude available true. State pemilik tetap revision 9 dengan hash `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`. Akun/password tidak dibaca dan tidak ada proposal diterapkan pada kantor pemilik. Paket terbaru `releases/kael-buyer-0.2.0-builder-2/`: 70 file sumber dengan checksum valid, typecheck/build lulus menggunakan dependensi lokal; belum npm ci/VPS bersih.

Panduan baru `docs/BUILDER-DIALOGUE.md`; PRD, implementasi, README, BUILDING, BUYER-SETUP, roadmap dan DESIGN diperbarui. Belum diverifikasi: QA browser/GPU/responsif langsung, Builder Codex sungguhan/semua model, VPS bersih dan sandbox OS penuh. Preview ruangan berupa kebutuhan preset, bukan render draft 3D. Langkah berikutnya: manager menyusun usulan rencana dan pembagian tugas yang ditinjau Founder; installer/TLS/lisensi/penjualan tetap tahap terpisah.

## Selesai sebelumnya

### Pemulihan password dashboard — PRD v2.38

Permintaan pemilik lupa password ditangani dengan kode pemulihan lokal, tanpa memilih password atau mengubah akun pemilik. Jalankan sendiri `node scripts/owner-access.mjs --reset`, lalu pilih Lupa kata sandi? di web dan isi kode/password baru. Kode hanya tampil di terminal pemilik, hash disimpan 15 menit dan terikat pada hash password sebelumnya; sekali pakai/rotasi, rate limit terpisah, validasi konfirmasi dan pencabutan semua sesi tersedia. Akun rusak tidak ditimpa. Data/tim/riwayat/hasil/keputusan dan kunci Builder tidak diubah oleh reset. Tidak ada layanan email atau dependensi baru.

File utama: `server/auth.mjs`, `scripts/owner-access.mjs`, `src/access.ts`, `src/access.css`. Panduan pemilik/buyer, README, PRD dan implementasi diperbarui. Script pemulihan memakai script akses lama yang sudah didistribusikan dalam paket buyer. Tes fixture: CLI aktual, kode kedaluwarsa/dirotasi/salah/rusak, rate limit, replay termasuk sisa berkas, reset bersamaan, kegagalan rename mempertahankan akun, sesi lama ditolak, login baru bertahan sesudah restart, state/kunci/identitas tetap, serta konfirmasi/error/sukses form. Tidak menjalankan reset atau membaca kredensial kantor pemilik.

Verifikasi: seluruh 141 tes dan build lulus; warning bundle kantor sekitar 752 kB tetap ada. QA browser langsung dan reset pada akun pemilik belum dijalankan; pemilik menentukan password sendiri. Backend/frontend telah dimuat ulang tersembunyi (PID dev 12120). Frontend HTTP 200, akun tetap needsSetup false, state anonim 401. Tidak ada run/produksi antre atau aktif sebelum restart. Hash state pemilik sebelum/sesudah tetap `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4` (revision 9 sebelum restart). Pemilik tetap perlu menjalankan perintah kode dan menentukan password baru sendiri.


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

Status tes terakhir v2.43: 181/181 tes lulus, typecheck/build aplikasi dan paket buyer lulus di Node.js 24.21.0. Hook Claude native juga diuji sungguhan pada kantor sintetis terpisah. Codex dan Claude masing-masing telah menyelesaikan satu tugas sintetis pada checkpoint runtime sebelumnya; belum pengujian semua model/provider. Bundle kantor 766 kB (peringatan >500 kB tetap ada) dan dimuat setelah login/setup; entry akses/onboarding sekitar 15 kB. QA visual/GUI desktop dan VPS bersih belum dilakukan.

## Langkah berikutnya (kandidat)

Tambahan pemilik **Alur Sistem Kantor AI — Kael Ai**, versi 2 (24 bagian, klaim kit 0.19.2/VPS), sudah dibaca seluruhnya. Pemetaan kemampuan Kael vs referensi dan usulan urutan lanjutan ada di `docs/BUYER-OPERATIONS-ROADMAP.md`. Ini analisis dokumen, bukan verifikasi ulang VPS/kit atau penerapan semua fiturnya. Gap utama: Builder adaptif/runtime Claude, koordinasi manager dan pemeriksa terpisah, kelanjutan keputusan, serah terima antar-divisi, jadwal/budget/notifikasi, kemudian installer/perawatan/penjualan. Tidak menjalankan perintah/cron atau mengubah kantor asal dari lampiran. Checkpoint implementasi onboarding/paket: `5175e88`.

Verifikasi setelah tambahan analisis: 131/131 tes lulus dan build lulus; peringatan bundle sekitar 752 kB tetap ada. Tambahan ini hanya mengubah dokumen roadmap/progres, tanpa kode runtime atau data kantor.

Tambahan pemilik tentang alur penjual kit sudah dipetakan pada bagian akhir `docs/BUYER-OPERATIONS-ROADMAP.md`: promosi/penawaran, pembayaran/email deterministik, aktivasi VPS, keaslian paket, installer, kelengkapan bisnis dan update/support. Status implementasi dipertahankan jujur; harga/slot/waktu pasang/penanda per pembeli pada referensi tidak dijadikan janji Kael. Model Kael tetap jual lepas, VPS/akun AI buyer sendiri; ketentuan update/support/slot belum ditetapkan. Tidak ada pembayaran, email, aktivasi atau perubahan VPS yang dijalankan dari tambahan ini.

1. Pemilik sudah membuat akun. Periksa UI login/tahap 3–7 dan onboarding pada instance buyer terpisah, lalu coba satu tugas serta tinjau/revisi hasil. Kelengkapan P2 (recovery email, izin tindakan/broker dan isolasi proses) belum selesai.
2. Peran native dan rencana/pembagian tugas manager tersedia. Pilot lifecycle dan otomasi manager/budget/checkpoint dengan runtime fixture sudah lulus. Berikutnya backup/restore dari UI serta pilot live-provider/GUI; inbox antar-divisi dan jadwal bebas belum tersedia. Hermes, kuota dan semua model belum diuji.
3. Telegram manager (Bu Yuli) untuk tanya status divisi, baca saja.
4. Backup/restore dari UI dan migrasi penyimpanan (lihat `analysis/lembur-audit-2026-10-14/09-IMPLEMENTATION-ROADMAP.md`).
