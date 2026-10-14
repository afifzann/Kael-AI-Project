# Status implementasi lokal — 14 Oktober 2026

Status terbaru: **PRD v2.36 — Paket sumber buyer dan penyiapan awal**. Arah visual terbaru tercatat di DESIGN.md. Bagian versi sebelumnya di bawah adalah riwayat implementasi.

## PRD v2.36 — penyiapan buyer

`src/onboarding.ts` berjalan setelah autentikasi/CSRF dan sebelum aplikasi 3D. Form tiga langkah menyimpan profil bisnis, pilihan template dengan identitas/peran yang dapat diedit atau mulai kosong, serta provider manual/Codex. Error penyimpanan tetap terlihat; conflict memuat tahap terbaru tanpa replay. `src/onboarding-model.ts` berisi katalog dua template, batas tindakan dan progres tugas pertama. `src/domain.ts` memakai kembali validasi perintah bisnis/divisi/SOP/setelan secara atomik satu revision. `server/index.mjs` menolak pilihan Codex yang runtime-nya tidak tersedia. State kantor lama tanpa onboarding tidak dimigrasikan/reset.

Ringkasan mengikuti data pekerjaan/keputusan sebenarnya dan sidebar mengikuti nama bisnis. AI tidak dipanggil saat setup, pemeriksaan manager tidak diklaim otomatis, persetujuan pemilik tetap lewat gate lama. `scripts/package-buyer.mjs` membatasi sumber paket, menolak symlink/file non-sumber, melewati cache Python, mengosongkan identitas Builder pengembang dan membuat manifest SHA256. `server/recap/sop.md` menjadi SOP aplikasi agar startup tidak bergantung pada dokumen riwayat kantor pemilik. Output release diabaikan Git; sources/script/panduan ditrack.

Uji mencakup handler form, langkah/revision/validasi domain, restart HTTP/auth/runtime, paket fixture kotor, checksum dan startup paket aplikasi sungguhan dengan akun/data sementara. Dependensi uji berasal dari pemasangan lokal yang sudah ada; belum membuktikan npm ci pada VPS bersih. Panduan: [BUYER-SETUP.md](BUYER-SETUP.md). Installer/TLS/domain/lisensi/email/Claude, Builder AI adaptif dan QA visual belum selesai.

## PRD v2.35 — akses pemilik

`server/auth.mjs` menangani setup/login/logout/status, password scrypt, sesi in-memory yang disimpan sebagai hash token, idle/absolute expiry, rate limit, CSRF dan scope Builder. Bootstrap tersedia sebagai file privat pada server dan dikonsumsi setelah setup. Pembuatan akun memakai file sementara dan hard link eksklusif sehingga record yang sudah ada tidak tertimpa. Autentikasi berjalan sebelum handler produksi/media maupun seluruh API pekerjaan. Tidak ada mode bypass autentikasi untuk tes.

`src/entry.ts` menunggu akses pemilik melalui `src/access.ts` sebelum mengimpor aplikasi/3D, memasang CSRF hanya untuk API origin sendiri, menangani sesi berakhir, serta menyediakan logout. UI mengikuti tema netral, label/form validasi, error dan fokus keyboard. Vite/preview menolak framing dan memasang header dasar; CSP tersebut bukan audit CSP lengkap. `scripts/owner-access.mjs` hanya untuk pemilik mengambil kode sendiri di terminal; coding agent tidak memilih password pemilik.

`scripts/building.mjs` memakai kunci lokal dengan allowlist pengaturan tim. Tests server/runtime memakai akun dan cookie fixture melalui `tests/helpers/auth-client.mjs`; tes auth terpisah memakai request anonim untuk membuktikan penolakan. Dua instalasi sementara membuktikan state kosong, cookie/kunci berbeda, persistensi akun dan penolakan akses silang. `tests/access.test.mjs` menguji handler frontend, bukan browser sungguhan. Tautan Builder dipasok hanya dari sesi terverifikasi dan tidak diwariskan ke instance buyer terpisah.

Panduan setup dan batasnya: [Akses pemilik](OWNER-ACCESS.md). Data pemilik tidak dimigrasikan/reset. Deployment VPS publik, recovery, RBAC banyak pengguna, hardening sandbox AI dan broker tindakan eksternal tetap pekerjaan berikutnya.

## PRD v2.34 — konteks agent dan antrean

`domain.ts` menyimpan salinan konteks, catatan awal, waktu antre dan status queued/running pada run. `run-start` menjadwalkan, `run-begin` menandai eksekusi setelah validasi, dan `run-end` menyimpan hasil/penyebab berhenti. Perintah internal tidak diterima dari API command umum. Data lama tetap valid tanpa reset ID/skema; run lama berstatus running tetap dijeda saat startup.

`runtime.mjs` mengambil antrean tersimpan satu per satu; setelah restart hanya queued yang dilanjutkan, bukan pekerjaan yang terputus. Runtime tidak tersedia membiarkan antrean tersimpan. Tugas lain yang sedang berjalan pada pelaksana sama ditunggu. Catatan revisi diambil sebelum status berubah dan salinan konteks tidak berubah ketika setelan agent diedit. Hasil pembatalan yang terlambat dibuang; kegagalan menyimpan status menghentikan antrean bila masih ada run running, sehingga AI tidak dipanggil ulang untuk run tersebut.

`work.ts`, `workspace.ts`, `visuals.ts`, `notifications.ts` dan panel runtime mengikuti status tersebut. Konteks sebelumnya dibatasi tiga hasil lokal pelaksana dari divisi sama; tidak mengambil chat pribadi, workflow payload atau konteks agent lain. Catatan bukan memori percakapan penuh dan belum memakai retrieval semantik.

Tes mencakup konteks revisi/retry, isolasi divisi/agent, status karakter/notifikasi, antrean dan batal tanpa panggilan AI, serta restart server HTTP yang menjeda run aktif dan meneruskan record antrean yang sama tepat sekali. `scripts/check-agent-runtime.mjs` adalah uji opt-in terpisah memakai login Codex sungguhan dan fixture sintetis; tidak masuk npm test dan tidak mengubah state kantor pemilik. Uji nyata berhasil: hasil Indonesia tiga butir, v1, status review, tanpa approval.

## PRD v2.30 — tahap 2

work.ts membaca tugas/briefing/keputusan, produksi dan snapshot workflow menjadi daftar kerja umum. Menjaga status asli, identitas, pemisahan koneksi, dan deduplikasi task produksi. workList menyediakan pencarian perusahaan/manager/agent/kendala, filter dan paginasi. routes.ts memvalidasi query/source/status/page hanya pada surface kerja. operations.ts memakai daftar ini di Pekerjaan global, Pekerjaan divisi dan cuplikan Ringkasan; workSummary dipakai oleh detail seluruh sumber. Detail manual mempertahankan start/result/hold/review/decision yang ada, menambah tautan briefing, arahan berikutnya, pemeriksaan ketersediaan sebelum start dan riwayat event. Detail sumber lain menuju antarmuka asal yang sudah ada.

server/production.mjs menyediakan taskIds untuk produksi aktif maupun arsip. server/index.mjs mengirim metadata productionTaskIds jika ada dan menolak mutasi manual untuk task produksi arsip juga. domain.ts hanya menambah tipe opsional metadata; tidak mengubah command/transisi atau schema tersimpan. divisionState membatasi metadata ke task divisi. Tidak mengubah provider, SOP, roster, bindings, atau kantor 3D.

102/102 tes lulus, termasuk lifecycle manual dengan versi approval, isolasi lintas sumber, koneksi terputus tanpa status gagal palsu, provenance arsip, HTTP rejection, filter URL dan paginasi. Build lulus dengan warning ukuran bundle yang sudah ada. HTTP sumber/halaman/API 200 setelah backend dimuat ulang dengan produksi aktif nol. State revision 9 dan checksum identik dengan awal tahap. QA browser/visual belum dilakukan. Bukti: evidence/stage-2-work-audit.md.

## PRD v2.29 — tahap 1

operations.ts menyusun sidebar, enam bagian pusat divisi, direktori dengan manager/perusahaan, cuplikan pekerjaan dan tindakan Ringkasan, filter divisi pada Pekerjaan, serta Pengaturan. Ringkasan dan lonceng menggunakan workspaceNotifications/activateNotification yang sama. Produksi dan monitoring memakai handler yang sudah ada; tab chat/files tetap menunjuk episode dan versi yang sama tanpa melonggarkan approval. main.ts menghapus markup profil workspace yang digantikan Pengaturan. ui-icons.ts menambah ikon pengaturan dari set SVG yang sama.

workspace.ts menambahkan pencarian lintas perusahaan/anggota/peran dan pembacaan kemampuan divisi. routes.ts menyimpan bagian divisi di URL dengan validasi allowlist. dashboard.css mengatur direktori, tab responsif, daftar anggota, pengaturan dan status memakai tema dashboard yang ada. Tidak menambah dependency atau mengubah backend/state schema.

95/95 tes lulus setelah server fixture dan file temporer dijalankan di luar pembatasan sandbox; build lulus. HTTP halaman/aset/API 200 setelah server dev dinyalakan. State tetap revision 9, 2 divisi, 7 agent, 2 binding dan checksum identik. QA visual/browser, keyboard browser dan perangkat nyata belum dilakukan; tidak mengklaim tes unit sebagai bukti kualitas gambar. Bukti: evidence/stage-1-workspace-audit.md.

## PRD v2.28 — Notifikasi header

notifications.ts menghasilkan daftar tindakan dari insiden, produksi, keputusan, tugas dan koneksi n8n; episode tidak digandakan dengan keputusan result miliknya. operations.ts memasang panel lonceng pada seluruh halaman, menjaga fokus ketika daftar diperbarui dan mengarahkan item ke medis/preview/keputusan/workflow/tugas terkait. Tidak ada perintah approval/recovery otomatis, penyimpanan notifikasi atau pengiriman eksternal. dashboard.css membatasi preview Founder, menyelaraskan chevron dropdown dan menyediakan panel responsif. 93/93 tes dan build lulus; API nyata mengonfirmasi satu pemberitahuan Mails, revision tetap 9 dan HTTP 200. Tampilan serta interaksi browser belum ditinjau langsung. Detail: evidence/header-notifications-audit.md.

## PRD v2.27 — Alur dashboard

routes.ts memvalidasi/menulis URL hash untuk halaman, konteks divisi dan pemilihan produksi/workflow. operations.ts menerapkan history/Back/restore, tab divisi, daftar pekerjaan lintas sumber, shortcut error/preview dan menu mobile. main.ts menangani penutupan profil agar overlay/inert tidak tertinggal setelah Back ke dashboard. Backend/SOP tidak berubah.

workspace.ts menyediakan divisionOverview untuk kondisi dan hitungan tanpa duplikasi task produksi. n8n.ts menyediakan workflowHistory: deduplikasi, status/query, tanggal WIB, urutan terbaru, paginasi dan batas halaman. workflows.ts menghubungkan kontrol filter dengan snapshot readonly; state filter bertahan saat polling. production.ts mengingat episode/tab/versi, memakai form penolakan inline, serta konfirmasi arsip sebelum memanggil action delete yang telah ada. Gate watched/QC/version/revision tetap berlaku. Builder menjelaskan konfigurasi manual dan tautan Codex secara terpisah.

office-preview.ts membingkai Founder dengan kamera clone/terpisah dan memakai renderer yang sama; ukuran/pixel ratio dikembalikan pada finally. office.preview kini tidak mengubah kamera viewport. main.ts menyimpan cache cuplikan 15 detik dan menampilkan timestamp; fallback jika context hilang. operations.ts meminta cuplikan hanya saat Ringkasan tampil. Layout/material/rig/navigasi kantor tidak berubah. dashboard.css menerapkan neutral monochrome dengan warna status; tidak menambah library atau proses backend.

Skill UI/UX Pro Max dan ECC click-path-audit digunakan; hasil penelusuran handler/state ada di evidence/dashboard-flow-audit.md. 90 tes lulus, termasuk routes/history/overview/preview restoration. Build lulus dengan warning ukuran bundle yang sudah ada. Frontend/source/API HTTP 200, state revision 7, 2 divisi/6 anggota, SHA256 tetap `045738D99BC34799CE73F3B5612E08BE17AC5F26EB143837AB086BB67B046DF4`. QA visual/browser, camera/GPU hasil aktual, sentuhan dan keyboard browser belum dilakukan karena akses alat diblokir. Tes matematika dan mock renderer tidak membuktikan kualitas gambar.

## PRD v2.26 — Dashboard

operations.ts mengubah Ringkasan menjadi hitungan inline, direktori divisi dengan manager/aktivitas dan rail keputusan/kendala/aktivitas. Logika freshness workflow dan isolasi divisi dipertahankan. Halaman Divisi menggunakan daftar, pencarian dan disclosure anggota; Builder keluar dari disclosure alat ke navigasi utama. Heading berulang dan kartu utilitas redundan dihapus; dialog memakai ikon tutup SVG bersama.

dashboard.css, diimpor terakhir oleh main.ts, menjadi kontrak UI dashboard yang terpisah dari material/geometri kantor. Mencakup chrome sticky, desktop/tablet/mobile, fokus/hover/reduced motion, daftar, form, dialog, Builder dan produksi. Grid profil desktop tetap hanya aktif di atas 1250px. Tidak menambah dependency aplikasi atau mengubah state/backend.

Skill `design-taste-frontend` dipasang global melalui installer resmi Codex dengan sumber `Leonxlnx/taste-skill/skills/taste-skill`; tiga varian sebelumnya tetap terpasang. Skill utama bukan untuk app/dashboard, sehingga panduan redesign-existing-projects dipakai pada UI ini. Build dan 86 tes lulus; HTTP web/CSS/API 200, SHA256 state tetap `045738D99BC34799CE73F3B5612E08BE17AC5F26EB143837AB086BB67B046DF4`. Belum ada QA visual/browser atau pengukuran performa render karena browser alat menolak URL lokal; tidak menggunakan jalur browser alternatif.

## PRD v2.25 — Bidang putih foyer pada screenshot

officeSite mengembalikan publicTiles dari union floor dengan interior ruang/Founder dikecualikan. buildWalkways memakai publicTiles untuk semua area publik dan hanya mengambil tile luar di depan/belakang untuk paving exterior. Pitch nominal walkwayTiles menjadi 1,2; warna tile lebih seragam. Paving diturunkan ke y=.23 (top=.265), sama dengan room finish, sehingga rug top=.285 tidak coplanar. Union slab tetap di bawahnya, aperture dan navigasi tidak berubah.

Kelompok lobby diperbarui menjadi sofa+armchair+meja pada rug 5,6×3,5, tanpa masuk jalur depan. Tanaman didekatkan dan meja disesuaikan pusat kelompok. 86 tes dan build lulus, termasuk konservasi luas floor/rooms/public tiles serta cakupan foyer. Referensi screenshot lokal `codex-clipboard-d78e16b8-abdb-4ff4-8b77-7a0f2d5061ff.png` memperlihatkan kondisi sebelumnya; browser/GPU hasil terbaru masih belum diperiksa.

## PRD v2.24 — Kontur dan penataan interior

officeSite memakai siteDimensions terpisah untuk menghindari recursion dengan officeWalkways. Area lantai mencakup ruang indoor, koridor yang di-clip ke batas depan/belakang, dan sirkulasi tengah. walkwayTiles menghasilkan union tanpa lapisan ganda; edge luar digabung menjadi segmen, lalu dipotong untuk dua pintu. Aperture menggunakan toleransi floating-point. office.ts membangun dua InstancedMesh untuk alas/finish dan facade dari edge tersebut; bagian yang berbagi batas dengan ruang tidak digambar ulang. Navigation memakai site.floors, bukan rectangular camera bounds.

divisionLayouts menyediakan dua rug footprints yang diuji untuk 1–12 pelaksana. Renderer rug tunggal bertekstur linen menggantikan area kerja/strip besar dan karpet bertumpuk. Karpet lobby berhenti sebelum paving pintu/koridor. Medis memakai lantai tanpa karpet. Counter reception berongga di sisi staf, dengan kursi, backdrop, terminal dan aksesori; kelompok sofa/meja/sideboard melengkapi lobby.

Resepsionis Nia dibuat melalui rig robot yang sama tetapi tidak masuk actors, agentModels atau data bisnis. Idle tanpa typing; timer sapaan performance.now terpisah dari waktu animasi, klik karakter/label memperpanjang sapaan. Overview menampilkan sapaan singkat; label di luar viewport/behind camera disembunyikan. Cleanup melepas rig sebelum disposal geometri bersama. Metadata jumlah karakter overview memasukkan Nia.

85 tes dan build lulus. Source baru tersaji melalui HTTP, revision 7/hash data tetap. Browser Use menolak inspeksi localhost karena kebijakan URL; tidak memakai browser/CDP alternatif. Visual GPU, sapaan dan kontak furnitur tetap belum diuji langsung. Tidak mengubah backend atau menjalankan pekerjaan baru.

## PRD v2.23 — Kantor menyatu, akses luar dan dashboard

layout.ts menghitung officeSite dengan floor, lobby, pintu utama/pintu belakang, segmen dinding dan parkiran. Divisi berurutan pada sayap kanan; penambahan menjaga ruang sebelumnya dan memperpanjang envelope/lobby bila perlu. facilityLayouts mempertahankan ID serta kapasitas, memindahkan taman/lapangan ke luar dan mengecilkan studio Builder menjadi 5,8×5,6. Route contoh luar dan navigasi runtime menggunakan akses belakang. Semua 83 tes lulus, termasuk cakupan floor/room, isolasi lobby, dua pintu, connected walkways, kerja dan produksi.

office.ts menambahkan slab kontinu, facade kaca grid hitam, partisi ruang dengan aperture tengah, lobby resepsionis/ruang tunggu, kanopi, jalur depan, marka parkir dan empat mobil prosedural. Studio satu orang disesuaikan tanpa kabinet tambahan yang keluar footprint. Geometri alas/floor overlap secara vertikal untuk menutup celah; finish ruang dipisah dari bidang slab untuk menghindari z-fighting. Overview dan cakupan shadow memasukkan area luar/parkiran. Pintu terlihat terbuka; kendaraan/resepsionis dekoratif. Semua aksi fasilitas yang telah ada tetap tersedia.

ui-icons.ts memusatkan ikon garis yang sebelumnya di main.ts dan mengganti glyph font sidebar. redesign.css menyamakan tombol dashboard/viewport, tabs, ukuran ikon, pilihan agent, fokus dan aturan mobile. Tidak ada library baru. Build lulus dengan peringatan bundle >500kB yang sudah ada. Belum memverifikasi tampilan GPU atau browser secara langsung; tes kode tidak membuktikan kualitas hasil render.

## PRD v2.22 — Koreksi scope Builder

Chat Codex pemilik diganti namanya dari Kael AI menjadi Builder melalui tool aplikasi; ID tetap sama. Sesuai koreksi Founder, panel/komponen/endpoint riwayat chat, cache pesan dan sanitizer transcript dihapus. Catatan asli Codex dipertahankan. GET /api/builder-status hanya mengirim presence, dengan polling frontend 2 detik yang tidak menunggu dialog/formulir ditutup.

builderActivity memberi canWalk untuk completed/interrupted yang tersinkron; working tetap tidak bisa bersantai. socialVisit memasukkan Builder ke roster luang. Mesin perjalanan kantor yang sudah ada mengakhiri trip ketika canWalk berubah false, mengembalikan karakter lewat route dan menyelesaikan pose duduk sebelum typing. Activity Builder juga dievaluasi di loop kantor agar status stale berhenti dipakai. Ketinggian duduk Builder memakai anchor workstation sistem yang sama dengan Nate.

82 tes dan build lulus. Pengujian meliputi status aktif/selesai/dihentikan/stale, partisipasi sosial sesuai sesi, event status incremental/bounded, penolakan history HTTP, tidak ada transcript di respons/persistensi, serta regresi kantor. Bagian v2.21 di bawah adalah riwayat pendekatan yang sudah dibatalkan; fitur mirror percakapan tidak lagi aktif. Visual gerak/GPU belum diuji langsung.

## PRD v2.21 — Bridge chat Codex nyata

server/builder-session.mjs membuka catatan rollout chat pemilik yang dipilih, memeriksa session_meta.id dan cwd, membaca tail maksimal 8MiB lalu penambahan byte secara bertahap. StringDecoder menangani UTF8 terpotong; JSON/line belum selesai ditahan, line terlalu besar dilewati, identitas berbeda/file hilang memutus koneksi tanpa transcript cache. Hanya response_item.message pengguna/commentary/final yang dikirim, maksimal 60 pesan dan 12k karakter; kredensial umum disamarkan. Event task_started/task_complete/turn_aborted mengatur status, completion turn lain tidak mengakhiri giliran aktif.

GET /api/builder-chat dan presence sementara /api/state menggunakan guard host/origin yang sudah ada. Tidak ada path/thread dari input browser, endpoint kirim prompt, atau penyimpanan transcript ke data kantor. UI panel terbaru bisa dibuka dari studio, profil dan menu Builder; polling 2 detik, scroll pembaca dipertahankan, interval/HTTP dibatalkan saat dialog ditutup. Presence panel juga menyegarkan kantor. Bubble/monitor mengikuti status yang masih segar; data kedaluwarsa tidak terus menggerakkan typing.

Backend direstart setelah proses diverifikasi dan produksi kosong. HTTP web/API nyata online/working, 29 pesan terbaru terbaca, revision tetap 7/hash tetap 045738D99BC34799CE73F3B5612E08BE17AC5F26EB143837AB086BB67B046DF4. Seluruh 83 tes dan build lulus. Tes mencakup stream, UTF8/partial JSON, batas history, isolasi ID/cwd, redaksi, read-only HTTP/origin, status tidak stale, serta runtime state tidak dipersistenkan. Bukti di evidence/builder-chat-check.json.

Bridge saat ini bergantung format/lokasi rollout lokal. Pengiriman pesan tetap di Codex; visual browser/GPU dan handler deep link belum diuji. Bagian di bawah adalah riwayat implementasi sebelum bridge aktif.

## Builder studio — satu penghuni dan sesi Codex pemilik

facilityLayouts menambahkan plot Builder pada kolom server di samping courtyard. Workstation dipakai bersama renderer penghuni sistem server/Builder; papan rencana, rak dan kabinet khusus studio menjaga pintu tengah terbuka. Agent `office-builder` muncul pada roster, scene picking, bubble dan profil. Tidak dimasukkan ke state divisi/agent bisnis; domain menolak facility-start untuk studio.

builder-room.ts menyimpan identitas penghuni dan tautan sesi pemilik yang dikonfirmasi melalui CODEX_THREAD_ID/list_threads. Strip ruangan, profil dan menu Builder mengarah ke sesi yang sama; ada Bantuan untuk pembukaan manual. Monitor tidak membuat transcript/cursor kerja, dan status tidak menyatakan runner tersambung. Browser → desktop handler belum diuji. Perubahan source domain memerlukan backend restart sebelum aturan studio aktif pada API; tes HTTP memakai proses baru. Seluruh sesi studio juga tertolak pada backend lama karena capacity=0 atau ruangan belum dikenal.

75 tes dan build lulus; cakupan termasuk non-overlap/koneksi jalan, identitas/session Builder, tidak ada gerak/typing palsu, larangan sesi dan state tetap. Visual 3D serta pembukaan deep link belum diuji.

## Soft colour studio — penyempurnaan UI dan material

Palet CSS sebelumnya yang duplikat di style.css dan redesign.css dikonsolidasikan. Navigasi mobile dikembalikan ke permukaan putih agar teks tetap jelas; desktop charcoal, state aktif ivory/gold, action utama teal. Card/border/shadow lebih lembut, label utama diperbesar, tombol 40–44px, fokus keyboard kontras dan disabled jelas. Production, Builder, profil, workflow dan kontrol kantor mendapat aturan yang sama.

createOfficeMaterials mempertahankan finishing dan cache per sumber setelah recolour. Ini memperbaiki dinding yang berubah menjadi stone dan mencegah recolour malam memengaruhi kursi/dinding/lantai ivory. Robot memakai finishing shell tanpa tekstur kain. Tekstur 256px, detail kayu/kain/batu/metal/plaster dengan clamp luminance; robot membulat dan punya panel servis kecil, furniture lebih berwarna melalui kain/aksesori serta detail kabel workstation. Tidak ada perubahan state/API/approval/konektor.

74 tes lulus dan build berhasil, termasuk uji cache/material malam dan batas robot/anchor duduk. Browser/GPU/performa visual belum terverifikasi. Warning bundle di atas 500kB masih ada.

## PRD v2.20 — Lighting, PBR materials dan hardware glow

createSurfaceMaterials memindahkan cache bahan yang sudah ada ke materials.ts, dengan lima tekstur lokal, diffuse sRGB dan relief NoColorSpace terpisah untuk bump/roughness. Cache mempertimbangkan finishing agar metal putih berbeda dari kain dengan warna sama. Noise grayscale dinormalisasi agar tidak wrap/terlalu gelap. Tidak ada texture download, dependency atau perubahan data runtime.

Office memakai RoomEnvironment/PMREM bawaan Three128px sekali per renderer, intensitas lingkungan/fill lebih rendah, shadow frustum yang diproyeksikan ke kamera lampu dan wash/decal contact shadow yang shared. Profil memakai pantulan lingkungan sama. Server mendapat panel graphite, chassis/modules metal, screws, cooling grilles/fan rings,21LED modul dan strip/LED power bersama, serta satu point light tanpa shadow baru. Bahan LED milik fasilitas dibuang saat rebuild; shared texture/material decal tidak ikut dibuang. Wash/contact decals dikecualikan dari navigation obstacles; letak workstation, rack dan ruangan tetap.

serverIndicatorIntensity membuat pulse kecil dengan fase berbeda, bounded .45–1.3 dan stabil .65 pada reduced motion. Waktu mengikuti elapsed kantor; tombol jeda tidak mengubah intensitas yang dibekukan. Pulse tidak membaca/menulis state maupun mengubah status Obsidian. Signage server menyebut koneksi belum terhubung dan lampu dekoratif.

73/73 tes dan build TypeScript/Vite lulus. Bahan diuji deterministik/opaque/berbeda, cache/finishing, warna dan relief map, roughness/metalness; LED diuji range, fase, kontinuitas dan reduced motion. Browser/render frame, tombol siang/malam/jeda, frustum/shader hasil GPU dan performa perangkat belum diperiksa karena batas browser; tes ini bukan bukti visual. Warning bundle >500kB tetap ada. Hasil HTTP dan hash state dicatat di evidence/lighting-materials-check.json.

## PRD v2.19 — Bu Yuli supervisor, Date agent workflow

Domain/bridge menerima workflow-delegate secara atomik dengan validasi manager, kepemilikan binding, peran, nama dan kapasitas. Date mendapatkan binding lama, termasuk monitorFrom; Bu Yuli mempertahankan ID/managerId/meja. Insiden executionId aktif maupun pulih mengikuti Date agar kegagalan lama tidak didaftarkan ulang. Catatan pribadi manager dan pekerjaan lama tetap utuh. isWorkflowDivision dipakai domain dan formulir manual agar divisi n8n tetap tidak menerima brief manual setelah manager melepas binding.

Pemeriksaan n8n memakai binding terkini di antrean tulis agar polling yang dimulai sebelum delegasi tetap mencatat error ke Date. Status manager mengagregasi hanya workflow divisinya. Error agent memberi blocked pada manager; hanya insiden sendiri memberi error/medis. Profil menampilkan kartu workflow tim yang sama, monitor meja menampilkan ringkasan agent dan waktu pemeriksaan terlama; manager tidak mengetik palsu saat mengawasi. Data timestamp invalid/putus/kedaluwarsa/sebagian ditandai belum lengkap. PRD/N8N mencatat desain alias manager dan chat Telegram sebagai target berikutnya; tidak ada bot, pesan terkirim, token baru, runner chat atau perbaikan workflow otomatis.

71/71 tes dan TypeScript/Vite build lulus, termasuk command atomik, insiden/replay, pemisahan meja, scope supervisor, unavailable data, polling bersamaan dengan delegasi dan HTTP/restart/persistensi. Visual browser belum diperiksa; warning bundle >500kB tetap ada.

Proposal yuli-date-delegation dipreview dan diterapkan melalui bridge: revision6 → 7. Inspect/API/disk mengonfirmasi Bu Yuli tetap manager dengan ID lama, Date menjadi satu-satunya pemilik binding LAXHOLM Product Database & AI Search; monitorFrom tetap. Data bisnis, divisi lain, tugas/brief/keputusan, sesi dan event lama dipertahankan. Backup: app-data/backups/before-yuli-date-20261013.json. Web/API kembali200 setelah proses dev diverifikasi dan dimuat ulang. Bukti: evidence/yuli-date-check.json. Tidak menjalankan workflow VPS atau mengirim pesan Telegram.

## PRD v2.18 — Dashboard bersama, workspace per divisi

Dashboard tidak lagi memprioritaskan Produksi KaelaCH. Navigasi utama berjumlah tetap; produksi/percakapan dibuka melalui Divisi → ruang kerja KaelaCH. Divisi workflow membuka monitoring n8n; tim lain membuka tugas/briefing manual. Room/facility navigation dan alat tambahan memakai accordion; anggota kartu divisi juga dapat dibuka saat diperlukan. Ringkasan dibatasi enam baris divisi dan empat keputusan, dengan tautan ke daftar lengkap. Preview kantor besar dan panel integrasi khusus Bu Yuli/Nate diganti pintu masuk divisi serta perhatian Founder yang berlaku untuk semua tim.

`src/workspace.ts` memfilter anggota, brief, tugas, keputusan plan/result/guidance, episode, insiden, binding dan snapshot sesuai divisi. Produksi memfilter daftar episode/form berdasarkan divisi yang aktif. Keputusan dan tugas produksi global menetapkan konteks divisi sebelum membuka episode; approval tetap memakai endpoint produksi dan gate versi/preview yang sama. Tidak mengubah state pemilik atau koneksi workflow dan tidak menjalankan episode.

66/66 tes dan TypeScript/Vite build lulus. Tes baru memeriksa dua divisi dengan sumber berbeda, keputusan plan/result, episode/insiden/n8n, divisi hilang, data opsional dan 20 divisi manual. Pemeriksaan visual dan klik desktop/ponsel belum dilakukan melalui browser; warning bundle >500kB tetap ada. Workspace baru belum otomatis mendapatkan runtime khusus selain kemampuan yang sudah tersedia.

## PRD v2.17 — Produksi, percakapan dan keputusan web

Menu utama **Produksi & chat** menerima chapter ZIP/PDF/gambar dan VO opsional. Server menormalisasi panel lewat Python/Pillow/pypdfium2, mempertahankan urutan nama alami, memotong gambar panjang beririsan120px dan membatasi ukuran/panel/ZIP. Sumber asli tetap utuh. Setelah pemilik memilih Upload & jalankan SOP, brief standar disetujui sebagai rencana; satu tugas induk mengikat episode dengan domain result/review/decision yang sudah ada.

Runner memanggil Codex CLI lokal yang sudah login dalam sandbox read-only, tanpa shell interpolation dan tanpa env key/token/n8n. Nara membaca sumber dan menghasilkan naskah/scene, Kaela review, Echo catatan audio, Zetsu penempatan fokus/caption, Remotion render, lalu Kaela QC sumber/cover/metadata. Empat peran memakai sesi/model CLI yang sama secara berurutan. Ringkasan respons nyata dan aktivitas sistem disimpan dalam percakapan episode, bukan dialog simulasi atau chain-of-thought. Pesan Founder dijawab Kaela lewat antrean yang sama. Status kantor mengikuti peran aktif; profil KaelaCH membuka Produksi.

Remotion4.0.535 menghasilkan H.2641080×1920/30fps, subtitle putih/outline hitam/kuning dengan maksimal dua baris, fokus/zoom frame-based dan cover. Posisi vertikal caption dapat disesuaikan Zetsu untuk menghindari teks sumber. VO unggahan dinormalisasi WAV dan dipasang sebagai AAC, tetapi scene/caption memakai estimasi proporsional, belum forced alignment. Tidak ada TTS atau musik/SFX eksternal. Tanpa VO hasil jelas bertanda preview tanpa suara. QC AI hanya sampel cover dan sumber/metadata, belum menonton/mendengar seluruh MP4.

Preview dan berkas per versi tersedia di web. Approve versi terbaru memerlukan konfirmasi menonton dan hasil lulus review; penolakan perlu alasan. Edit/revisi menjalankan versi baru dengan catatan QC lama, tidak menimpa versi/persetujuan lama. QC gagal boleh maksimal dua revisi otomatis, kemudian menunggu arahan Founder. Input stale ditolak. Tindakan manual terhadap tugas/decision episode diarahkan ke endpoint Produksi agar gate preview tidak dilewati. Hapus adalah arsip: abort proses, keluarkan antrean dan batalkan pekerjaan belum selesai; berkas/riwayat dipertahankan. Startup menandai proses terputus tanpa mengulang biaya AI otomatis. Penulisan JSON atomik, aksi episode diserialkan, media allowlist/path/range divalidasi.

**Verifikasi:**62/62 tes aplikasi dan build TypeScript/Vite lulus. Tes baru meliputi domain revisi/batal atomik, input/urutan scene, caption, handoff, approval, versi, stale replay, penolakan, batas revisi otomatis, abort saat hapus, kegagalan provider, HTTP multipart/Origin/manual bypass, byte-range preview dan persistensi/restart/arsip. Assert Python untuk gambar/ZIP/PDF, urutan alami, overlap dan ZIP traversal lulus.

Pengujian Codex asli memakai dua panel sintetis yang terisolasi di evidence, bukan chapter pemilik. Putaran awal QC benar-benar menolak subtitle bertumpuk; setelah posisi caption diperbaiki, putaran baru menghasilkan preview8detik yang lulus QC sampel dan task berstatus approval. Lima respons nyata Nara/Kaela/Echo/Zetsu/Kaela tercatat. MP41080×1920 berhasil didecode seluruh frame; cover dan sampel adegan kedua ditinjau lokal. Fixture lain dengan tone audio berhasil dirender dan didecode; ini bukan pengujian VO natural atau sinkronisasi ucapan. Bukti: `evidence/production-runtime-smoke/check.json`, `render-check.json`, dan `evidence/production-web-check.json`.

Server dev dimuat ulang setelah prosesnya diverifikasi, web/API kembali200, login Codex tersedia. State pemilik tetap revision5 dan hash sama dengan `app-data/backups/before-production-web.json`; tidak ada episode fixture pada workspace pemilik. Data bisnis, tim dan n8n dipertahankan. Browser QA dashboard/ponsel belum dilakukan karena batas browser sesi sebelumnya; tes HTTP/build bukan bukti interaksi visual. Warning bundle >500kB masih ada. Belum ada chapter/VO produksi pemilik, auto-upload YouTube, integrasi Claude/Hermes web, alignment kata, full-media QC AI, pemulihan arsip lewat UI atau deployment VPS.

## PRD v2.16 — spesialis KaelaCH dan edit tim atomik

`division-edit` dalam domain menerima `addWorkers` opsional: validasi array/data/nama/peran, total maksimal12 pelaksana, nama unik termasuk anggota lama dan manager, tanpa mengubah ID/penugasan/hasil lama. Divisi workflow tetap ditolak. Bridge yang sudah ada meneruskan command melalui preview/apply tervalidasi, tanpa endpoint baru atau perubahan schema. Dokumentasi BUILDING dan skill proyek diselaraskan. Tidak menambah formulir UI, penghapusan anggota atau mesin dependensi tugas.

`proposals/kaelach-specialists.json` dipreview lalu diterapkan ke divisi Youtube KaelaCH: Kaela tetap manager, Zetsu menjadi editor/render, Nara menangani cerita/naskah/metadata dan Echo narasi/audio. Backend dev yang telah diverifikasi dimuat ulang sebelum apply agar kode terbaru benar-benar digunakan; web/API kembali hidup. API menyatakan savedtrue revision5 dan inspect mengonfirmasi seluruh anggota. Backup sebelum perubahan: `app-data/backups/before-kaelach-specialists.json`. Proposal historis tidak boleh diulang tanpa inspect/review revision terkini.

**52/52 tes lulus**, TypeScript/Vite build lulus (warning bundle >500kB tetap ada). Tes baru memeriksa penambahan atomik, input malformed/duplikat/kapasitas, pemeliharaan hasil lama, preview tanpa simpan, HTTP/persistensi/restart serta replay stale yang ditolak. Assert pascapenerapan dan catatan kesehatan/layout ada di `evidence/kaelach-specialists-check.json`.

SOP dan template produksi memakai serah terima empat peran, gate naskah sebelum audio/final timing, revisi menurut penanggung jawab, cover/metadata dan inventaris kebutuhan. Tidak membuat episode kosong, mengubah tugas lama atau menyatakan agent runtime aktif. Chapter/VO/renderer masih dibutuhkan. Browser/profil/geometri ruang terbaru belum ditinjau; tes layout bukan bukti visual. Pemakaian API dilakukan tanpa browser atau workaround terhadap pembatasan browser sebelumnya.

## PRD v2.15 — materi editing tambahan KaelaCH

Materi `download.mp4` dan gambar before/after diperiksa sebagai referensi proses. Decoder `imageio-ffmpeg` 0.6.0 dipasang dalam `app-data/tools/media`; metadata menunjukkan sekitar82,62 detik, H.264576×1024/30fps dan AAC stereo44.100Hz. Full decode lulus, 42 frame diambil pada detik0–82 setiap2detik dan contact sheet ditinjau. Audio belum didengarkan/ditranskrip dan detail di antara sampel belum ditinjau. Tidak membuka browser, mengunggah lampiran atau mengeksekusi instruksi pada layar tutorial.

SOP mendapat struktur folder episode dan enam lapisan editing dengan gate cerita, keterbacaan, koreksi warna dan audio. `docs/KAELACH-PRODUCTION-PROMPT.md` menjadi instruksi yang dapat digunakan ulang; tautan di BUILDING dan PRD diperbarui. Materi talking-head diadaptasi untuk panel manga, bukan disalin sebagai cerita, kewajiban langganan, dekorasi atau pengaturan izin baru. Peran Kaela/Zetsu yang sudah tersimpan mencakup alur ini; tidak perlu perubahan revision atau divisi tambahan.

Pemeriksaan dokumen/tautan, jumlah sampel dan hash state dicatat di `evidence/kaelach-editing-material/check.json`. Tidak mengubah kode aplikasi atau dependency npm, sehingga build/tes aplikasi tidak diulang. Chapter mentah masih belum tersedia; tidak membuat proyek episode, VO, MP4 baru atau klaim produksi otomatis.

## PRD v2.14 — playbook recap KaelaCH

`docs/KAELACH-RECAP.md` menetapkan alur produksi, handoff Kaela/Zetsu, spesifikasi editing, sumber panel, lisensi audio, output dan gate QC sesuai arahan pemilik. Referensi `C:/Users/afifz/Downloads/videoplayback.mp4` dibaca metadata container-nya (133,291 detik; video360×640;9.966.144 byte). Contact sheet lokal `video-reference.jpg` yang dihasilkan script dengan path sumber sama ditinjau sebagai sampel visual; tidak mengklaim membaca chapter lengkap, menonton seluruh MP4 atau menganalisis audionya.

Bridge `inspect → preview → apply → inspect` mengubah hanya peran Zetsu pada divisi Youtube KaelaCH, revision3→4. Konfigurasi historis penerapan: `proposals/kaelach-recap-team.json`; jangan apply ulang tanpa inspect/revisi terkini. Backup: `app-data/backups/before-kaelach-recap.json`. Assert membandingkan ID anggota, seluruh divisi, pekerjaan, hasil, keputusan, sesi, insiden, bisnis/provider dan binding n8n: tetap utuh. Satu event edit dan revision baru merupakan perubahan yang diharapkan. Tidak memulai pekerjaan, menyetujui hasil atau memublikasikan konten.

Chapter mentah/VO/aset audio berizin produksi belum tersedia. Tidak membuat episode contoh, naskah cerita tebakan, dependency Remotion baru atau MP4 yang diklaim siap tayang. Render baru dan pemeriksaan visual/audio final belum dilakukan; SOP/peran bukan integrasi runtime. Validasi yang relevan adalah preview domain, konfirmasi API tersimpan dan assert pelestarian data; tidak menjalankan ulang build/tes aplikasi untuk perubahan dokumen/peran ini.

## PRD v2.13 — server latar, gerak mandiri dan basket

Server 5173/5174 awalnya tidak mempunyai listener. Dinyalakan melalui Node `scripts/dev.mjs` sebagai proses latar tersembunyi, dengan stdout/stderr di `app-data/dev-output.log` / `app-data/dev-error.log`. Tidak membuat scheduled task, membuka akses jaringan atau menghentikan proses lain. Ini server development lokal; tidak otomatis hidup sesudah komputer/restart proses.

Snapshot Bu Yuli teramati online/aktif, partial false, 0 running dan 50 waiting. Penyebab antrean gerak: scheduler global menunggu seluruh trip ambient selesai dan memilih peserta tanpa mengecualikan agent yang sedang bepergian, sehingga peserta yang luang bisa tertahan. Sekarang scheduler mengecualikan peserta/ruang yang sedang dikunjungi, boleh solo dan memeriksa setiap 12 detik setelah giliran pertama. Status n8n tidak diubah; running/error/stale tetap menghalangi kunjungan baru.

Active studio memakai bola dengan seam, lintasan dribble → gather → ring → kembali bergiliran, pose dribble/tembakan serta label aktivitas sesuai aksi. Tombol Main basket · visual mengajak maksimal dua agent luang; menolak lapangan terpakai/gerak dijeda/reduced motion, lalu fail-closed jika tidak ada jalur. Manual break session yang sudah ada memakai animasi sama. Ambient basket berlangsung 36 detik sesudah masing-masing kedatangan, lalu pulang. Tidak ada skor palsu, perubahan n8n, sesi/riwayat ambient tersimpan atau physics engine baru. Bola dinamis dikecualikan dari obstacle statis; posisi/routing agent tetap memakai anchor lama.

**50/50 tes lulus**, termasuk solo saat agent lain bepergian, okupansi ruang, workflow waiting/running/error, kontinuitas lintasan bola, pergantian pemain dan reset pose. Build TypeScript/Vite lulus; bundle >500 kB tetap menjadi warning. Fixture `evidence/workflow-qa.html?mode=workflow-idle` menyiapkan Bu Yuli/Nate tanpa koneksi eksternal dan menyediakan audit jalur; belum dieksekusi browser.

Browser QA tidak dapat dilanjutkan: binding ke tab yang bertajuk This site can't be reached ditolak browser URL policy karena protokol halaman error tidak diizinkan. Tidak mencoba browser/surface/perintah alternatif. Render basket, jalur scene terbaru, tombol dan responsif terbaru **belum diverifikasi browser**; tes matematika bukan bukti visual. Hasil kesehatan HTTP/port, hash state dan status uji dicatat di `evidence/idle-court-check.json`. Data pemilik dipertahankan.

## PRD v2.12 — tema atelier dan navigasi agent

Tema bersama memakai header/card putih, sidebar/tombol charcoal, dasar krem, walnut serta brass. Batu, kayu dan linen memakai DataTexture deterministik tanpa aset/dependensi baru. Lantai, sofa, kursi, partisi, monitor, portrait dan fixture cahaya hangat disesuaikan tanpa mengubah footprint/anchor. Cahaya tambahan memakai emissive/glow, bukan banyak shadow light.

Menu utama diringkas; Pekerjaan/Briefing/Keputusan tetap dalam disclosure Operasi manual. Profil workspace menjelaskan konteks bisnis lokal. Ringkasan menunjukkan divisi, workflow terikat, proses berjalan dari snapshot segar/lengkap dan perhatian terhadap insiden/koneksi/keputusan; angka tidak lengkap ditampilkan sebagai tanda pisah. Menghapus kontrol demo yang memaksa aktivitas bekerja. Semua fungsi manual tetap mempertahankan validasi, error simpan dan approval lokal.

Toolbar kantor memiliki sebelumnya/berikutnya (berputar), pilihan agent dan buka profil, termasuk Bu Yuli/Nate/Founder. Kamera fokus pada posisi karakter saat dipilih; tidak mengikuti gerakan secara terus-menerus. Kontrol menunggu state, dan disembunyikan bila WebGL gagal. Menu terpilih memakai aria-current; perpindahan tidak menyimpan state.

Bu Yuli dalam waiting pada workflow aktif/snapshot lengkap boleh mengikuti ambient, tanpa mengetik atau mengendalikan n8n. Nate masuk pool ambient dengan status tetap menunggu Obsidian. Running, insiden, stale/putus/partial/nonaktif menghalangi kunjungan workflow; error Nate juga memblokir kunjungan. Animasi menggunakan routing, kepulangan dan pengaturan reduced motion/jeda yang sudah ada.

Validasi otomatis: **48/48 tes** lulus, termasuk material deterministik/opaque, kontras token teks/kontrol, pasangan Bu Yuli waiting dengan Nate, prioritas running/error, serta regresi domain/HTTP/n8n. TypeScript/Vite build lulus: JS637,87kB gzip174,33kB; CSS78,59kB gzip14,95kB. Peringatan bundle >500 kB masih ada. SHA256 `app-data/state.json` tetap `B6F24AA0AB5F416427F2BD3B0186E39E0D18C26A1A62D1C5153396B2A1DC23C2`; tidak ada migrasi atau perubahan data pemilik, kredensial atau workflow produksi.

Bukti visual **sebagian**: browser sempat memperlihatkan tema desktop 1440×900 pada ringkasan, overview, Founder dan profil sebelum perubahan navigasi terakhir; satu artifact tersimpan: `evidence/atelier/desktop-profile.jpg`. Pada tahap QA akhir, binding kembali ke tab localhost ditolak karena automatic approval review gagal dengan `429 Too Many Requests` (bukan penolakan manual atau penentuan bahwa aksi tidak aman). Tidak mencoba browser alternatif/workaround. UI final, tombol agent, keyboard/fokus final, tablet/ponsel, content states dan audit jalur scene terbaru **belum terverifikasi**. `evidence/atelier/report.json` mencatat gate belum lengkap; checker tidak lulus. Kontras token otomatis bukan audit aksesibilitas penuh.

Batas: Obsidian belum terhubung, aktivitas sosial visual tanpa percakapan AI nyata, monitoring n8n polling GET-only. Riwayat/filter/archive baru belum dibuat. Penghindaran antaragent dan performa perangkat nyata belum diuji. Struktur scene/routing dipertahankan, tetapi hasil tes routing lama bukan bukti audit render terbaru.

## PRD v2.11 — Bu Yuli dan monitoring n8n

Divisi Marketing Outdor milik Laxholm Furniture tersimpan melalui bridge/API dengan satu agent Bu Yuli (revision 3), tanpa agent pendamping. Binding menunjuk workflow LAXHOLM Product Database & AI Search. Backup sebelum penerapan: app-data/backups/before-laxholm-marketing-outdor.json. Tim Youtube KaelaCH, ID anggota, bisnis, brief, tugas dan keputusan dibandingkan dengan backup dan tetap utuh.

Konektor GET-only memakai konfigurasi backend .env, timeout 10 detik, respons maksimal 2 MB, pagination proses aktif, redaksi diagnostik, cache detail error dan snapshots di memori. HTTP state menyertakan snapshot tanpa menulisnya ke state.json. Incident baru memakai penulisan atomik/revision queue yang sama dengan perintah manual; dedup executionId serta batas waktu pemasangan/pemulihan mencegah error historis masuk medis lagi.

Menu Workflow n8n, profil anggota, status kepala dan monitor terhubung ke snapshot. Status bekerja hanya dari running; waiting/nonaktif/putus dibedakan. Tim workflow tidak memakai manager tambahan atau tugas/facility session manual. Existing manual team rules dipertahankan. Detail yang dibuka dan fokus summary/link dipertahankan saat pembaruan; perilaku DOM ini belum diperiksa browser.

Validasi: **45/45 tes** lulus termasuk transport palsu di child process → polling → medis → pemulihan → restart, proteksi output/key, pagination, fail-closed, metadata dan identitas lama. Build TypeScript/Vite lulus; JS633,31kB gzip172,81kB, warning >500kB tetap ada. API VPS nyata dan HTTP lokal menunjukkan online/aktif, 0 berjalan, 50 menunggu saat observasi. Error historis#2397 pada Assistant Agent: Authorization failed - please check your credentials. Tidak menjalankan atau mengubah workflow produksi.

Bukti: evidence/n8n-integration.json. **Browser belum diverifikasi:** auto-review saat membuka localhost gagal karena429 Too Many Requests; bukan penolakan manual pengguna atau temuan bahwa aksi tidak aman. Tidak ada screenshot baru, audit responsif/a11y atau audit navigasi scene untuk divisi baru. Tes routing versi lama tetap historis. Manual check baru diperlukan ketika browser tersedia. Batas produksi dan sumber kebutuhan di [N8N](N8N.md).

## PRD v2.10 — navy studio, robot dan header sticky

Header memakai sticky top0 dan lapisan di bawah dialog; posisi top tetap0 sesudah scroll desktop488,5px, tablet883px dan mobile1356px. Dashboard, formulir, Builder, profil, scene, monitor dan mode malam memakai navy/charcoal/neutral sejuk, dengan ivory/oak pada interior. Preview kantor tidak lagi bertumpuk dengan caption.

Rig bersama mengganti manusia menjadi robot helmet/visor/LED/ear pods, termasuk Founder dan Nate. Manager navy berinsignia, Founder charcoal; anggota memakai variasi shell/aksen deterministik. Model yang sama dipakai profil dan kantor. Kontak seat tetap0,64 lokal, lebar ear pods dirapatkan agar robot skala0,8 sesuai clearance0,4. Mata membedakan santai/mengetik; rig mempertahankan typing, walking, lounge, medis dan kopi.

Sofa navy memakai back/arm/cushion membulat; meja kopi putih dengan pedestal, kursi ergonomis membulat, worktop oak/ivory, kaki graphite, kabinet tenang dan panel battens oak. Footprint/anchor fasilitas, schema, riwayat dan tugas tidak berubah. Mode malam hanya mengganti material tanah tersendiri, sehingga dinding terang tidak ikut berubah menjadi background navy.

Validasi: **39/39 tes** domain/HTTP/rig lulus; build TypeScript/Vite lulus, JS625,43kB (gzip170,15kB), warning >500kB. Browser memeriksa1440×900,768×1024,390×844, tanpa overflow horizontal; document width1425/753/375. Profil mobile Shift+Tab membungkus ke action terakhir; Escape mengembalikan fokus ke pemicu. Console error0 pada tab yang diperiksa. Audit seluruh anchor dari empat actor **100/100 aman** terhadap scene baru. Fixture Sora terlihat rebahan dengan warning; Nara mencapai Minum kopi dan pose ditahan melalui Jeda. Preview Builder menyebut robot, tanpa salinan pakaian manusia.

Bukti terbaru: `evidence/redesign/navy-dashboard.jpg`, `navy-robot-profile.jpg`, `navy-mobile.jpg`, `navy-tablet.jpg`, `navy-mobile-profile.jpg`, `navy-medical.jpg`, `navy-coffee.jpg`, `navy-night.jpg`, `navy-header-scroll.jpg`, `navy-navigation-audit.json`, serta `report.json`. File gambar adalah JPEG asli dari browser. Screenshot setelah resize yang belum stabil diganti. Beberapa capture fasilitas mendahului koreksi warna signage/art terakhir; geometri/pose tidak berubah sesudahnya.

SHA256 data pemilik tetap `0A1E900F2EB774BE4198921C9703AC937C8E83D449EB9DBE36552A516C56FA80`. Semua mutasi pemeriksaan memakai fixture terisolasi. Tidak ada dependency/provider/koneksi eksternal baru. Browser fixture ditutup, tampilan pemilik tetap terbuka.

Gate desain **belum lengkap**: audit aksesibilitas penuh, reduced-motion/performa perangkat nyata, serta pengulangan loading/offline/write-error untuk warna terbaru belum dilakukan. Bukti lifecycle sebelumnya tetap historis, bukan pass baru. Robot dan material prosedural belum identik dengan referensi; collision antaragent tetap belum tersedia. Perubahan ini tidak mengaktifkan model AI/Obsidian.

Dokumen ini mencatat hasil PRD v2.8. Kantor memakai layout open space kompak dengan Founder, divisi, lima fasilitas bersama serta ruang server/Nate. Eksekusi AI melalui provider belum terhubung; alur tugas serta sesi fasilitas benar-benar disimpan oleh server lokal. Bagian per versi menyimpan hasil pemeriksaan historis.

## Tampilan dan penataan

- Footprint fasilitas disesuaikan kapasitas. Meeting utama 8 kursi; meeting kecil, lounge, courtyard dan active studio masing-masing 4 tempat. Half court menggantikan lapangan penuh yang terlalu dominan.
- Koridor pendek menyambungkan pintu tanpa lahan kosong per slot. Paving, lampu, partisi kaca rendah dan planter membentuk batas area bersama. Kamera overview mengikuti batas kantor.
- Divisi tumbuh sesuai anggota, dengan manager berpartisi terpisah, workstation, sudut diskusi, penyimpanan, sofa dan tanaman. Penambahan divisi mempertahankan slot divisi yang sudah ada. Redesign mengubah posisi render lama, bukan identitas/data divisi.
- Display dinding dibuat rata dan dipisahkan dari jendela/rak. Meja konferensi memakai kursi berlapis, notebook/cangkir, port dan lampu gantung. Lounge memiliki sofa berhadapan, coffee bar, rak dan area baca. Courtyard memiliki pergola, bench, planter dan kolam; studio memiliki hoop, bench dan mat peregangan.
- Label nama desktop sekitar 28px, tanpa kartu status/peran besar. Detail muncul pada hover/fokus dan profil; overview mengutamakan Founder/manager. Ponsel memakai target sentuh lebih tinggi. Profil tetap memakai rig/preset karakter kantor, tanpa gambar referensi.

## Sesi fasilitas lokal

1. Pilih fasilitas dan buat sesi dengan agenda serta peserta. Kapasitas, peserta duplikat dan kehadiran di sesi lain divalidasi oleh domain/server.
2. Briefing/review memerlukan manager. Jika terkait brief, manager divisi terkait harus hadir. Pekerjaan berjalan milik peserta memerlukan checkpoint, kemudian dijeda secara atomik.
3. Istirahat menolak pelaksana yang sedang bekerja dan manager dengan pekerjaan divisi berjalan/perlu review.
4. Karakter meninggalkan workstation dan menuju posisi peserta melalui koridor, perjalanan bersamaan dengan jeda keberangkatan. Kursi dan arah duduk mengikuti fasilitas. Status perjalanan, kehadiran dan kepulangan mengikuti sesi tersimpan. Rute tetap, bukan navigasi dinamis untuk furnitur buatan pengguna.
5. Display meeting menampilkan judul sesi serta jumlah peserta. Pengguna memasukkan catatan hasil lalu mengakhiri sesi; karakter kembali dan catatan dapat dibuka dari Riwayat. Tugas tetap dijeda sampai dilanjutkan dari Pekerjaan. Sesi tidak menyetujui hasil tugas secara otomatis.

Sesi memakai field opsional `facilitySessions` dalam schema 1, sehingga file lama dapat dibaca tanpa migrasi yang menimpa data. Persistensi/revisi/backup menggunakan server yang sudah ada. Percakapan AI, keputusan model dan jadwal otomatis belum tersedia. Animasi olahraga tidak melakukan simulasi pertandingan; kehadiran di studio merupakan sesi istirahat lokal.

## Alur yang tetap tersedia

Builder panduan lokal, draft browser, preset karakter deterministik, brief → persetujuan rencana → pekerjaan manual → hasil berversi → pemeriksaan → keputusan Founder. Monitor memakai tema divisi dan judul tugas; grafik berlabel demo visual, bukan data live/hasil AI. Demo dan gerak idle tidak membuat progres pekerjaan. Tidak ada paket baru.

## Pemeriksaan

- `npm test`: 28/28 lulus, termasuk validasi/transisi, slot stabil, jarak manager, penataan furnitur/aksesori, konektivitas koridor, variasi karakter, rute menuju kursi fasilitas dan pencegahan lintasan melewati meja, kapasitas/konflik sesi, checkpoint atomik, larangan memulai tugas saat masih dalam sesi, serta tidak melanjutkan/menyetujui tugas otomatis. Koreksi sambungan menambah pemeriksaan paving sepanjang frontage/sisi divisi dan luas gabungan ubin yang tepat tanpa celah, tumpukan atau overhang pada batas non-grid.
- HTTP asli diuji pada direktori sementara: sesi aktif tersimpan, bertahan setelah server restart dan dapat diakhiri. Pemeriksaan revisi usang serta Origin tetap lulus.
- `npm run build`: TypeScript/Vite lulus. Bundle Three.js sekitar 636 kB (gzip 174 kB), masih memberi peringatan >500 kB.
- Browser memakai fixture `evidence/workflow-qa.html?mode=facilities` dengan sessionStorage terpisah. Meeting menolak checkpoint kosong tanpa menghilangkan form; sesudah checkpoint valid tugas dijeda, agenda/peserta disimpan, karakter menuju fasilitas. Akhir sesi menyimpan catatan dan riwayat, tugas tetap Dijeda. Lounge menerima Nara, menampilkan Istirahat setelah tiba, kemudian mengembalikannya setelah sesi selesai.
- Desktop 1440×900, ponsel 390×844, tablet 768×1024 ditinjau. Dialog sesi ponsel dapat ditutup dengan Escape dan fokus kembali ke Buka sesi. Lebar dokumen tidak melebihi viewport. Canvas desktop dengan strip sesi dibatasi agar kontrol kamera terlihat. Tidak ada error console teramati pada fixture.
- Data kantor pemilik tidak dipakai untuk mutasi uji. Hash `app-data/state.json` sebelum/sesudah cocok. Bukti terbaru dan batas gate desain tercatat dalam `evidence/redesign/report.json`; gambar versi sebelumnya tidak dipakai sebagai bukti layout baru.

## Koreksi sambungan ruang dan jalan

Koreksi sambungan visual: koridor menempel sepanjang sisi depan ruangan, tim kecil merapat ke koridor samping dan tiga fasilitas bawah memakai garis lantai yang sama. Celah antara kolom fasilitas menjadi aisle. Ubin sekarang dipotong pada batas aktual jalur; curb tidak muncul di pertemuan lantai. Cap tembok divisi dan partisi kaca samping mencapai ujung lantai. Posisi render disesuaikan tanpa menulis data kantor pemilik.

Bukti terbaru: `joined-campus.png`, `joined-team.png`, `joined-mobile.png` dan `joined-tablet.png`. Navigasi kantor pemilik diuji tanpa mutasi, termasuk pemilihan fasilitas pada ponsel. Tidak ada overflow horizontal atau error console teramati. Pengujian sesi sebelumnya tetap dicatat di atas; alur sesi tidak diubah pada koreksi geometri ini.

## Penambahan ruang server — PRD v2.7

Ruang server ditambahkan di samping meeting kecil dengan frontage langsung ke koridor. Isi: tiga rack berlabel compute/storage/network, pintu kaca dan handle, tray kabel, grille ventilasi lantai modular, pendingin, meja kontrol/kursi, kabinet dan UPS. Kamera ruang server diperbesar agar detail terbaca. Navigasi tersedia melalui sidebar, selector serta label 3D. Tidak ada perubahan schema, dependency baru atau mutasi data pemilik.

Strip ruang dan dialog **Detail ruang** menyatakan **Obsidian belum terhubung**. Integrasi vault, monitoring hardware dan akses pengetahuan oleh AI belum dibuat. Server room tidak menerima sesi meeting/istirahat; domain menolak permintaan tersebut secara atomik.

Verifikasi: 29/29 tes lulus, termasuk layout/koneksi jalan tanpa overlap dengan room baru dan penolakan sesi infrastruktur tanpa perubahan state. TypeScript/Vite build lulus, dengan peringatan bundle 641 kB (>500 kB). Preview lokal dimulai ulang untuk memakai definisi fasilitas terbaru. Browser diperiksa pada 1440×900, 390×844 dan 768×1024: sidebar/selector/label membuka ruang, dialog tampil dan Escape mengembalikan fokus ke Detail ruang, tidak ada overflow horizontal atau error console teramati. Bukti: `server-room.png`, `server-campus.png`, `server-mobile.png`, `server-tablet.png`, `server-info-mobile.png` di `evidence/redesign/`.

Hash SHA256 data pemilik sebelum/sesudah tetap `0A1E900F2EB774BE4198921C9703AC937C8E83D449EB9DBE36552A516C56FA80`. Integrasi Obsidian dan audit aksesibilitas/performa perangkat fisik belum diuji; gate desain tetap incomplete.

## Nate, sosial visual dan building — PRD v2.8

Nate kini resident server dengan profil, pakaian/headphone/kacamata dan monitor contoh graph. Duduk menghadap monitor; demo mengetik diberi label, status normal menunggu Obsidian. Belum ada pembacaan vault, sinkronisasi, sinyal pekerjaan Obsidian atau runtime Nate.

Pasangan idle bergiliran ke lounge, courtyard dan studio yang bebas sesi. Perjalanan serentak memakai jeda keberangkatan, percepatan, pengereman dan rotasi bertahap; pemisahan ringan di koridor bukan penghindaran tabrakan dinamis. Gestur ngobrol/main tetap visual. Tugas baru atau reservasi fasilitas memulai kepulangan sebelum pose mengetik di meja. Kunjungan tidak menulis sesi, riwayat atau progres palsu. Reduced motion menonaktifkan kunjungan ambient. Perubahan struktur tim masih membangun ulang scene dan dapat mereset gerak.

Skill building disimpan di `.agents/skills/building`, entrypoint Claude di `.claude/skills/building`, personal Codex di `C:/Users/afifz/.codex/skills/building` dan personal Hermes di `C:/Users/afifz/.hermes/skills/building`. Diskusi menggunakan sesi coding agent; bridge lokal mendukung inspect, preview tanpa simpan, apply dengan revision, dan edit nama/peran yang mempertahankan ID/tugas. Tidak menjalankan provider atau menghubungkan vault. CLI/login Claude/Codex/Hermes belum diuji. Validator skill bawaan dicoba tetapi belum berjalan karena Python bundle tidak memiliki PyYAML; isi/frontmatter ditinjau langsung.

Verifikasi terbaru: 33/33 tes domain dan HTTP lulus, termasuk Nate tidak mengaku bekerja tanpa koneksi, pasangan idle tidak mengubah state atau memakai ruang reservasi, percepatan/pengereman/kepulangan, edit atomik yang mempertahankan pekerjaan, preview/apply HTTP dan konflik revision. TypeScript/Vite build lulus; bundle sekitar 646 kB (gzip 177 kB), peringatan >500 kB masih ada.

Browser: server Vite/API pulih dan halaman pemilik terbuka. Nate/profile/graph ditinjau desktop 1440×900, profil mobile 390×844 tanpa overflow; Escape menutup dan fokus kembali ke pemilih ruangan. Alias `/building` membuka panduan; Salin instruksi memberi konfirmasi. Fixture sosial terisolasi memperlihatkan pasangan menuju lounge, Sora berstatus Ngobrol · Visual, kemudian kembali terlihat di workstation dengan status Bekerja · Manual sesudah tombol tugas QA. Frame interupsi/kepulangan pertengahan tidak tertangkap, dan keseluruhan siklus tiap fasilitas belum ditinjau browser. Tidak ada error console teramati. Bukti: `nate-server.png`, `nate-profile.png`, `nate-profile-mobile.png`, `building-handoff.png`, `social-lounge.png`, `social-working.png`.

Nate dan petunjuk building juga ditinjau pada tablet 768×1024: lebar dokumen 753px, tanpa overflow horizontal. Bukti tambahan: `nate-tablet.png` dan `building-tablet.png`.

Data pemilik tetap memiliki hash SHA256 `0A1E900F2EB774BE4198921C9703AC937C8E83D449EB9DBE36552A516C56FA80`. Gate desain tetap incomplete; belum ada audit aksesibilitas penuh atau pengukuran perangkat fisik.

## Batas yang masih ada

Provider/runtime AI belum terhubung. Sesi mengelola penggunaan fasilitas secara nyata dalam state lokal, tetapi belum menjalankan diskusi atau tugas AI mandiri. Builder web belum diskusi adaptif; edit nama/peran tersedia lewat building, tetapi belum ada tambah/hapus anggota lama atau arsip tim, editor furnitur/karakter, penjadwalan otomatis, navigasi arbitrer atau tindakan eksternal. Model karakter masih prosedural, belum setara aset referensi asli.

Belum ada audit axe/screen reader penuh, uji reduced-motion melalui pengaturan perangkat, pengukuran FPS/Core Web Vitals pada perangkat fisik atau skala kantor besar. Gate bukti desain tetap incomplete karena aksesibilitas dicatat partial. Aplikasi tetap loopback lokal tanpa autentikasi produksi.

## Ruang medis, pose dan mesin kopi — PRD v2.9

Meeting kecil menjadi ruang medis empat kasur, mempertahankan ID meeting-alt agar riwayat lama tidak dibuang. Meeting utama menjadi satu-satunya ruang meeting baru. Sesi lama di ID medis bisa ditutup dengan catatan. Error/pemulihan disimpan dalam field incidents opsional schema 1; state lama tetap valid. Alasan dan catatan pemulihan wajib. Error menjeda tugas berjalan milik agent dan mengakhiri sesi yang diikutinya tanpa kehilangan agenda/catatan. Recovery tidak melanjutkan tugas atau menyetujui hasil. BedIndex stabil 0–3; antrean -1 mendapat kasur yang dilepas. Nate didukung tanpa dimasukkan sebagai anggota divisi palsu.

Pasien berjalan ke anchor kasur dan berbaring; ikon ⚠ kecil mengikuti kepala. Pose duduk santai memakai tangan di pangkuan, tidak mengetik. Tinggi root menyesuaikan bantalan, transisi naik/turun terangkat melewati sisi furniture. Kopi melalui tombol lounge atau kunjungan idle: mendekati mesin, gestur menyiapkan, uap, cangkir saat minum, lalu pulang. Kopi dan sosial tidak membuat catatan pekerjaan palsu.

Rute lama yang tetap tidak lagi menggerakkan perjalanan live. Navigasi mengekstrak batas geometri scene (furnitur/tembok), mengecualikan aktor serta lantai/detail overhead, dan menghitung A* grid 0,3 dengan clearance tubuh 0,4. Segmen hasil divalidasi sebelum dipakai. Tidak ada rute aman berarti diam, bukan teleport/fallback melewati obstacle. Perubahan struktur scene membangun ulang navigasi. Belum ada collision antaragent atau editor furniture arbitrer.

Pemeriksaan kode: 38/38 tes domain dan HTTP lulus, termasuk antrean kasur/stabilitas, validasi atomik, pemulihan tanpa auto-resume, Nate, penutupan sesi saat error, pathfinding/tembok/pintu/tujuan terhalang, serta perbedaan rig santai/kerja/rebahan. HTTP memakai direktori sementara: incident bertahan setelah restart dan pulih melalui API. TypeScript/Vite build lulus; bundle sekitar 656 kB (gzip 181 kB), peringatan >500 kB tetap ada.

Bukti browser v2.9 memakai fixture medical/facilities dan sessionStorage terpisah. Empty state medis tidak berisi pasien contoh. Error Sora/Nate serta pemulihan Sora diuji lewat form, termasuk penolakan alasan/catatan kosong. Keduanya tiba dan berbaring dengan ikon ⚠ mengikuti kepala; riwayat memuat alasan serta resolusi dan Pekerjaan Sora tetap Dijeda. Sora kemudian memakai sesi sofa dan terlihat duduk di bantalan dengan pose santai. Nara mencapai mesin kopi dengan status Minum kopi · Visual; fixture menahan pose melalui tombol Jeda gerak sesudah status tercapai, tanpa mempercepat/teleport karakter.

Audit scene terbaru: 100/100 rute dari empat actor Studio QA/Nate ke seluruh anchor fasilitas dan coffee spot lolos pemeriksaan seluruh segmen terhadap bounds obstacle aktual (navigation-audit.json). Ini membuktikan rute fixture saat ini, bukan collision antaragent atau seluruh kemungkinan layout. Pada 390×844 dan 768×1024, panel/dialog medis ditinjau tanpa overflow horizontal; Escape dialog pemulihan mobile mengembalikan fokus ke Catat pemulihan. Bukti: medical-patients.png, medical-history.png, medical-mobile.png, medical-recovery-mobile.png, medical-tablet.png, lounge-seated.png, coffee-action.png. Tidak ada error console teramati.

Hash data pemilik tetap 0A1E900F2EB774BE4198921C9703AC937C8E83D449EB9DBE36552A516C56FA80. Pendeteksian runtime/perbaikan otomatis, Obsidian, audit aksesibilitas penuh dan performa perangkat fisik belum diuji/terhubung; gate desain tetap incomplete.

Profil pasien kini membuka ruang medis (atau ruang sesi aktif), bukan melompat ke workstation asal. Tombol Tinjau error & pemulihan dari profil Nate membuka form yang benar; diperiksa di browser. Data pemilik dibuka pada kondisi medis kosong dan tetap tidak dimutasi (medical-owner-empty.png). Build terakhir 656,18 kB / gzip 181,04 kB lulus; dev server tetap berjalan.
