# Kael AI Office — kontrak desain

## Navigasi kembali dan kontrol dashboard — v2.42 (15 Oktober 2026)

Header memiliki satu tombol Kembali untuk seluruh halaman dashboard/kantor. Riwayat hash internal mempertahankan filter dan scroll; halaman yang dibuka langsung memakai parent divisi/direktori/Ringkasan tanpa keluar ke situs sebelumnya. Pada Ringkasan tanpa riwayat tombol tetap terlihat dalam keadaan disabled. Desktop memakai ikon dan label; mobile ikon 44px dengan nama aksesibel. Indikator workspace tekstual disembunyikan pada layar ≤480px untuk memberi tempat, notifikasi tetap tersedia.

Select dashboard/dialog kini berbagi border netral, padding, radius 8px, ukuran minimal 44px, chevron inset, hover/focus/disabled. Label Divisi pada Keputusan diletakkan di atas kontrol dengan gap 8px, lebar maksimal 320px dan penuh pada mobile. Audit source mencakup Pekerjaan, Briefing/tugas, Hasil, workflow, produksi dan Builder. Kontrol tetap native/keyboard, forced colors memakai panah sistem, mobile font 16px. Tema monokrom dan kantor 3D dipertahankan. Tes handler/read model bukan pemeriksaan visual browser langsung.

## Sesi aplikasi AI — v2.40 (14 Oktober 2026)

Builder mengutamakan instruksi masuk peran pada client serta preview usulan. Chat web menjadi opsi eksplisit, tanpa menghapus draft lama. Proposal desktop tidak menampilkan composer web seolah-olah itu sesi native; koreksi percakapan tetap melalui client, perubahan preview tetap dapat disimpan/dibuang. Catatan divisi menjelaskan perbedaan ringkasan kerja dengan riwayat privat client. Presence native fresh memperbarui robot; medis tetap prioritas. Tidak mengubah geometri/material kantor atau mengklaim chat/sidebar otomatis dibuat.

## Builder percakapan — v2.39 (14 Oktober 2026)

UI Craft mengikuti token dashboard monokrom dengan aksen teal kecil. Percakapan dan preview berada dalam dua kolom desktop, menumpuk pada tablet/mobile. Nama/tugas memakai label native; SOP/kriteria/batas dalam disclosure. Teks AI dirender sebagai teks aman, tanpa Markdown/HTML aktif. Status draft/working/error/applied eksplisit, tidak memakai persentase palsu atau animasi mengetik simulasi. Giliran provider dapat dihentikan; scroll tetap pada bacaan lama atau mengikuti pesan terbaru bila dekat bagian bawah. Perubahan lokal harus disimpan/dibuang sebelum apply atau berpindah diskusi. Fokus keyboard, error role alert dan input mobile 16px tersedia. Handoff sesi desktop serta konfigurasi manual menjadi pilihan sekunder. Geometri/material kantor tidak dirombak; status Builder mengikuti aktivitas web yang sebenarnya. QA handler bukan validasi browser/GPU langsung.

## Status runtime — v2.37 (14 Oktober 2026)

Status Codex/Claude dipisahkan pada Pengaturan, onboarding dan detail tugas. Login salah satu provider tidak mengaktifkan tombol provider lain. Form memilih model per agent dan menjelaskan batas teks/alat; tidak memakai klaim semua model atau kuota tersedia. Tampilan mengikuti form, daftar fakta dan token dashboard yang ada; tidak mengubah geometri kantor atau menambah menu global per provider. Polling memperbarui koneksi tanpa menunggu perubahan data bisnis. QA browser langsung belum dilakukan.

## Penyiapan buyer — v2.36 (14 Oktober 2026)

UI Craft mengikuti kontrak monokrom + aksen teal kecil yang sudah ditentukan pemilik, memakai TypeScript dan CSS biasa. Setelah login, penyiapan baru tiga langkah: konteks bisnis, tinjauan tim, pelaksanaan. Form satu kolom, radio template berlabel, preview nama/peran editable dan SOP disclosure. Status koneksi menggunakan teks dengan batas kemampuan yang jelas, bukan klaim AI aktif. Tidak ada ornamen/hero atau metrik baru. Error submit fokus ke pesan; heading fokus setelah perpindahan; kontrol native dan target 44px, input mobile 16px. Progres disimpan per submit, bukan autosave setiap ketikan. Panduan tugas pertama hanya muncul pada instalasi yang menyelesaikan onboarding, mengikuti data sebenarnya dan terlipat setelah selesai. Kantor 3D tidak dirombak; identitas lengkap karakter/logo/domain belum menjadi bagian tahap ini. QA browser/responsif langsung belum diverifikasi.

## Dashboard aktif — v2.30, tahap 2 (14 Oktober 2026)

Pekerjaan adalah surface lintas divisi dan sumber, bukan dashboard n8n. Work queue menggunakan daftar baris yang memisahkan judul/penanggung jawab, status kerja, sumber serta pelaksanaan/koneksi. Filter pencarian/divisi/status/sumber ditempatkan bersama; halaman maksimal 20 baris. Warna tetap monokrom + status semantik, ikon SVG proyek, tanpa kartu metrik tambahan atau persentase progres yang tidak memiliki bukti.

Detail memiliki identitas tim, tahap, langkah berikutnya, tujuan, kriteria, kendala dan hasil/versi. Pelaksanaan/koneksi dan aktivitas visual berada pada bagian tersendiri agar karakter berjalan atau koneksi offline tidak dianggap sebagai status hasil kerja. Native details/button/select dan fokus input/paginasi dipertahankan. Mobile menumpuk status di bawah judul dan membungkus metadata. UI Craft dan token yang sama dengan tahap 1 dipakai; kantor 3D tidak diubah. Pemeriksaan visual aktual belum dilakukan.

## Dashboard aktif — v2.29, tahap 1 (14 Oktober 2026)

Pertahankan tema monokrom dan font proyek; aksen teal kecil, merah/amber/hijau untuk status tertulis. UI Craft dipakai untuk hierarki operasional, direktori yang padat, fokus dan keadaan kosong. Skill Taste versi terpasang khusus halaman publik sehingga tidak digunakan untuk dashboard ini. Pengguna telah menentukan gaya dan scope; tidak perlu discovery/approval berulang.

Ringkasan: hitungan inline, preview Founder dengan aspect aktual, tiga pekerjaan berjalan, direktori enam divisi dan rail lima tindakan. Halaman Divisi memakai pencarian perusahaan/nama/anggota/peran; manager dan jumlah anggota terlihat. Enam bagian yang konsisten mengikuti data divisi, tanpa menu global per divisi. Pengaturan mengumpulkan profil, koneksi, tujuan salin konteks dan ekspor JSON. Kantor 3D tidak dirombak pada tahap ini. Tombol, garis, radius dan tipografi mengikuti dashboard.css; action yang belum memiliki backend dijelaskan sebagai belum tersedia.

Target tetap desktop 1440×900, tablet 768×1024, mobile 390×844. Tab divisi dapat digulir horizontal; data panjang membungkus. Native button/details/select, focus-visible dan reduced motion dipertahankan. QA visual aktual masih belum dilakukan; lihat evidence/stage-1-workspace-audit.md.

## Dashboard aktif — v2.27 (14 Oktober 2026)

Arahan terbaru: dashboard monochrome dengan aksen warna kecil; kantor virtual tetap memakai layout/material yang ada. Surface putih dan abu #f7f8fa, teks/primary/sidebar charcoal #202124, garis #e1e4e8. Warna hijau/amber/merah hanya memperkuat status tertulis; teal untuk aksen kecil. Font Manrope/DM Sans dipertahankan. UI/UX Pro Max dipakai untuk skala padat, hierarki, kontras dan navigasi; rekomendasi website hero/CTA diabaikan karena tidak cocok dengan aplikasi operasional. Rujukan product yang cocok: Status Page / Incident Management, Real-Time Monitoring + Timeline.

Ringkasan menampilkan cuplikan ruang kerja Kael dari scene proyek, bukan ilustrasi pengganti. Satu renderer yang sama membuat WebP 900×500 melalui kamera Founder terpisah, dengan cache 15 detik dan waktu cuplikan terlihat. Kamera/ukuran renderer dikembalikan setelah capture, termasuk saat gagal. Cuplikan statis dan tombol membuka Founder; tidak menyatakan pekerjaan AI sedang berjalan. Fallback teks tersedia ketika grafis tidak tersedia. Tidak mengubah geometri, furnitur, karakter, material atau perilaku kantor.

Hitungan pekerjaan mencakup produksi, tugas manual dan proses n8n tanpa menghitung task produksi dua kali. Status tidak lengkap/kedaluwarsa memakai angka tidak diketahui. Kondisi per divisi berasal dari pekerjaan/keputusan/insiden/koneksi sebenarnya. Klik pekerjaan aktif membuka daftar lintas sumber; error membuka workflow/agent terkait. Preview video dan keputusan versi terkait dapat dibuka langsung dari Ringkasan. Tab dalam divisi memberi akses ruang kerja, alat divisi dan keputusan.

URL hash mengingat halaman/divisi/episode/tab/versi/workflow dan mendukung Back/refresh. Keluar dari profil menutup overlay/inert sebelum dashboard tampil. Mobile memiliki lima tujuan tetap: Ringkasan, Kantor, Divisi, Pekerjaan, Lainnya. Alat/ruangan/profile ada di menu Lainnya yang bisa ditutup melalui Escape atau klik di luar. Builder membedakan diskusi Codex dan konfigurasi manual. Riwayat workflow memiliki pencarian ID/node/error, status, tanggal WIB dan halaman berisi 10 eksekusi; berlaku pada snapshot tersedia, bukan arsip n8n tak terbatas.

Arsip produksi memakai konfirmasi yang menjelaskan penghentian proses aktif; penolakan memakai form inline dengan alasan. Preview, versi, QC dan keputusan diletakkan berdekatan pada desktop. Tidak menambah auto-approval, publikasi, model, konektor, atau riwayat chat Codex di web. 90 tes lulus dan build berhasil. Audit alur kode tercatat di evidence/dashboard-flow-audit.md; pemeriksaan visual/browser, sentuhan dan screen reader tetap belum terverifikasi karena pembatasan alat.

## Dashboard aktif — v2.26 (14 Oktober 2026)

Surface operasional, bukan landing page. Ringkasan memprioritaskan direktori divisi dengan perusahaan, manager dan aktivitas nyata. Hitungan divisi/agent/pekerjaan/keputusan berada dalam satu baris ringkas, tanpa angka berawalan nol, kartu metrik besar atau garis aksen warna. Keputusan dan kendala berada di rail bersama aktivitas terbaru; kondisi kosong berupa kalimat singkat, bukan klaim semua pekerjaan sudah ditinjau. Snapshot workflow tidak lengkap/kedaluwarsa tetap menghasilkan angka tidak diketahui dan peringatan koneksi.

Header sticky 64px, sidebar charcoal 216px dengan selected sage lembut, navigasi ringkas dan Builder langsung tersedia. Dashboard mempertahankan wordmark, font Manrope/DM Sans serta keluarga charcoal/putih/ivory/teal. Primary charcoal, warna status tetap semantik; jangan menjadikan setiap panel sebuah aksen. Tabel/direktori, pemisah tipis dan permukaan putih menggantikan nested cards. Halaman divisi tetap menjadi akses ke produksi/monitoring sehingga penambahan divisi tidak menambah menu global.

Halaman Divisi berupa daftar dengan pencarian dan anggota yang dapat dibuka. Tombol, form, dialog, pekerjaan, briefing, keputusan, produksi dan Builder berbagi skala teks serta kontrol yang sama; elemen dekoratif/eyebrow berulang dikurangi. Desktop memakai direktori dan rail; tablet rail berpindah ke bawah; mobile memakai bar navigasi horizontal sticky dan daftar satu kolom, kontrol utama 44px. Material/layout kantor 3D tidak diubah oleh revisi dashboard ini.

Skill utama `design-taste-frontend` dari Leonxlnx/taste-skill terpasang global. Skill tersebut menyatakan bukan untuk dashboard; panduan `redesign-existing-projects` dari repo yang sama dipakai untuk aplikasi ini. Build dan 86 tes lulus; HTTP frontend/CSS/API 200 dan hash state pemilik tidak berubah. Browser/GPU serta interaksi tiga ukuran belum diperiksa langsung karena akses browser diblokir kebijakan alat sesi.

## Koreksi screenshot — v2.25 (14 Oktober 2026)

Lantai publik harus menyatu, termasuk foyer; jangan menyisakan bidang polos besar di tengah paving yang terbaca sebagai platform atau karpet tambahan. Ubin ivory nominal 1,2 unit, variasi warna kecil, ketinggian sama dengan finish ruang. Paving tidak menimpa ruang atau karpet. Susun tempat tunggu sebagai satu kelompok sofa/armchair/meja/tanaman dengan karpet yang mengikat kelompok, jauh dari ambang pintu dan jalur depan. Screenshot pemilik menjadi bukti masalah sebelumnya; render terbaru belum diverifikasi browser.

## Koreksi penataan aktif — v2.24 (14 Oktober 2026)

Kontur kantor mengikuti union ruang dan sirkulasi, bukan kotak besar yang menyisakan sudut kosong. Paving menyentuh partisi; kaca luar tidak menggandakan dinding ruang. Alas/finish berasal dari union yang sama dan navigasi tidak menganggap bounding box sebagai lantai. Ukuran kamera tetap memakai bounding box untuk mencakup parkiran/taman.

Satu karpet per kelompok furnitur, dengan margin ke dinding dan pintu. Hilangkan rug area kerja penuh, nested rugs dan strip Founder. Tekstur linen halus, warna taupe tenang; medis tanpa karpet. Lobby mendapat counter berongga, backdrop logo, komputer, kursi, aksesori kecil, sideboard dan satu kelompok sofa/meja berkarpet. Nia resepsionis dekoratif menyapa singkat, lalu kembali ke label ringkas. Tidak mengklaim percakapan/model AI. Inspeksi GPU/browser masih diblokir kebijakan URL alat.

## Arah aktif — satu kantor modern (14 Oktober 2026)

Layout adalah desain Kael sendiri; video hanya referensi fitur UI. Satukan ruang dalam satu bangunan dengan alas kontinu, grid kaca berframe charcoal, dinding cutaway untuk kamera dan aksen walnut/ivory/teal/brass yang lembut. Sayap fasilitas dan sayap divisi terhubung dua koridor. Builder satu meja dalam studio kompak, manager tetap memiliki nook terpisah. Hindari celah vertikal antarlantai dan bidang lantai coplanar yang bisa berkedip.

Lobby, resepsionis, kanopi dan parkiran berada di depan. Taman dan lapangan berada di luar, dicapai melalui pintu belakang. Mobil memberi konteks parkiran, belum interaktif. Pintu ditampilkan terbuka dan bukaan harus bebas collider; jangan memberi ilusi akses lewat kaca padat. Ruang lama diposisikan ulang untuk perombakan ini; penambahan berikutnya memperpanjang sayap tanpa menggeser divisi sebelumnya.

Kontrol memakai ikon garis 17–19px, tombol 42px/44px mobile, radius 10px, permukaan putih, primary teal dan selected lembut. Status/hover/fokus konsisten. Aksi tetap mengikuti kemampuan aplikasi; UI baru dari video belum diterapkan. Validasi struktural dan build tersedia, visual GPU/browser belum diperiksa.

## Arah terbaru — soft colour studio (13 Oktober 2026)

Palet pengguna menjadi referensi: ivory #F3EFE0, graphite #2D3238, charcoal #1C1C1E, teal #3A6263, walnut #866043/#7D4723 dan brass #D4AF37. Bidang luas netral; warna cerah cyan, magenta, biru dan amber untuk detail kecil dan status. Dashboard memakai card putih, batas lembut, tombol utama teal, fokus keyboard kontras, target tombol 40–44px, angka tabular serta navigasi charcoal desktop/putih mobile. Palet dashboard dikonsolidasikan di bagian akhir redesign.css.

Material kantor mempertahankan finishing asal setelah recolour: dinding plaster matte, lantai stone, sofa/kursi/selimut linen, kayu berurat, metal dengan roughness berbeda. Cache berdasarkan sumber dan finishing mencegah mode malam mewarnai ulang seluruh permukaan ivory. Tekstur lokal 256px memakai nilai warna terjepit 0–255; shell robot halus tidak memakai bump furniture. Robot lebih membulat, manager graphite/gold, pekerja teal/ivory/slate/taupe dengan aksen ear pod. Anchor duduk, gerak dan batas jalur tetap sama. Detail furniture berupa bantal teal/ochre, selimut, kursi meeting teal, selimut medis, cable tray/grommet di meja serta buku warna tenang. Bollard koridor tetap dihapus.

Validasi kode: 74 tes dan build. Tampilan browser, shader/GPU, respons visual tiga viewport dan performa perangkat belum diuji; jangan menyatakan lolos visual berdasarkan tes kode.

## Perbaikan aktif v2.20 — lighting dan material server

Pertahankan arah atelier charcoal/putih/limestone/walnut pengguna. Pencahayaan siang lebih directional dengan pantulan interior lembut; malam mempertahankan warm wash dan hardware cool fill lokal. Tekstur warna disertai bump/roughness untuk batu, kayu, linen, plaster dan brushed metal. Profil karakter mengikuti keluarga lighting yang sama.

Server tetap kompak di lokasi yang sama, dengan modul metal, kaca, screw/rel, pendingin dan LED kecil berfase berbeda. Tidak memakai flashing layar, neon besar, bloom fullscreen atau light/shadow perLED; satu point light tanpa shadow cukup untuk warna ruangan. Reduced motion memberi LED statis, jeda membekukan denyut. Hardware glow dekoratif dan harus dibedakan dari status koneksi Nate/Obsidian yang belum tersedia. Contact shadow statis/wall wash tidak memblokir navigation.

Lingkup: materials → office/portrait → visuals LED → tes → PRD/evidence. Tidak mengubah workflow n8n, agent, furnitur footprint, data kerja atau persetujuan. Pemeriksaan gambar/browser dan GPU masih belum dilakukan; jangan menyatakan pass visual hanya berdasarkan build/tes.


## Perbaikan aktif v2.13 — gerak mandiri dan basket

Tetap memakai tema/viewport v2.12. Lingkup: penjadwal socialVisit → runtime office → pose character → strip fasilitas operations → tes domain dan fixture workflow-idle. Tidak mengubah schema, kredensial, workflow, pathfinding atau footprint furnitur. Agent luang yang tersisa boleh bepergian sendiri, dengan room/agent yang sedang dituju dikecualikan. Hindari satu perjalanan kopi memblokir seluruh kantor.

Active studio menyediakan tombol Main basket · visual. Pilih maksimal dua agent luang, tolak jika lapangan terpakai, jalur tidak tersedia, gerak dijeda atau reduced motion aktif. Animasi bola memperlihatkan dribble, tembakan melewati ring dan pergantian pemain; rig mengangkat tangan untuk menembak. Agent tetap pada anchor lapangan, bukan berjalan menembus perabot. Bola adalah objek interaksi visual dinamis, dikecualikan dari obstacle statis. Gerak mengikuti waktu simulasi yang sama agar tombol jeda benar-benar membekukan permainan. Ambient latihan 36 detik lalu pulang; running/error tetap prioritas. Sesi manual memakai permainan yang sama sambil tetap menunggu penutupan eksplisit.

Pemeriksaan: unit solo/available-room/occupied-agent, prioritas workflow dan kontinuitas trajectory/pose; HTTP lokal dan listener untuk server; fixture `workflow-idle` untuk Bu Yuli/Nate dan audit jalur tanpa mutasi pemilik. Browser yang menolak akses tidak boleh diganti dengan workaround; catat render terbaru belum teruji.

## Arah aktif v2.12 — warm architectural atelier

Referensi terbaru pengguna: `.codex-remote-attachments/01a1299a-b553-7902-921f-fa99bc978f1e/a48f7d71-be39-4d79-851b-09a701cd1030/1-95597.jpg`. Menggantikan palet navy pada catatan historis berikut. Dashboard, kantor, monitoring n8n, Builder, dialog dan profil memakai satu keluarga material: limestone krem, linen ivory, walnut, espresso/charcoal dan aksen brass. Hijau tanaman serta warna status tetap semantik. Teks utama espresso gelap; teks sekunder harus terbaca pada surface krem, tombol utama espresso dengan teks ivory, fokus brass gelap.

Job tetap memantau tim dan workflow, bukan menampilkan moodboard. Header sticky → konteks → metrik/status/riwayat; kantor → karakter → profil. Target 1440×900, 768×1024, 390×844. Arahan tambahan: sidebar dan tombol charcoal hampir hitam, card/header putih, dasar limestone krem, walnut dan brass sebagai aksen. Referensi menunjukkan lantai batu berurat lembut, meja walnut, sofa linen berbingkai kayu, partisi kaca berangka gelap dan rak berlampu hangat; terjemahkan ke material prosedural dan detail pada footprint yang sama. Pencahayaan ceruk/rak menggunakan emissive dan panel glow tanpa puluhan lampu berbayang. Model robot tetap, shell champagne/stone/walnut dan aksen brass yang tenang; identitas/peran deterministik tetap.

Navigasi utama: Ringkasan, Kantor virtual, Workflow n8n, Tim & divisi, Builder. Pekerjaan/Briefing/Keputusan tetap berfungsi dalam disclosure native Operasi manual. Profil workspace menggantikan nama Pengetahuan agar tidak mengesankan koneksi vault. Ringkasan memprioritaskan jumlah divisi, binding workflow, proses berjalan dari snapshot lengkap dan perhatian terhadap insiden/koneksi/keputusan. Data kedaluwarsa atau sebagian tidak boleh menjadi angka nol yang menyesatkan. Kantor menyediakan tombol agent sebelumnya/berikutnya yang berputar, pilihan nama, dan buka profil; kontrol nonaktif sebelum state tersedia, tersembunyi jika WebGL gagal. Pilihan profil dan kamera tidak menulis state.

Bu Yuli dengan workflow aktif yang sedang waiting boleh mengikuti kunjungan santai visual; running, error, koneksi putus, data sebagian atau workflow nonaktif menghalangi kunjungan baru. Nate boleh bersantai sambil tetap berstatus Obsidian belum terhubung; tidak mengetik atau menyinkronkan vault. Aktivitas kerja/error mengakhiri kunjungan dan memulai kepulangan melalui routing yang sudah ada. Jeda gerak dan reduced motion tetap berlaku. Tombol demo aktivitas dihapus.

Lingkup: seluruh CSS aktif, material/lighting kantor dan portrait, warna robot, monitor, navigasi dashboard/kamera, pemilihan peserta ambient, tes preset/kontras/status, dokumentasi dan bukti. Tidak mengubah footprint, anchor interaksi, routing lantai, data pemilik atau konektor. Loading/empty/error/partial/success mempertahankan feedback dan pemulihan asli; permission tidak berlaku karena tidak ada izin/koneksi baru. Periksa render tiga viewport, header scroll, profil, monitoring, perpindahan agent dan fasilitas/malam bila akses browser tersedia. Bukti sebelum perubahan menu bukan validasi UI final; gate yang tidak diperiksa wajib ditandai belum teruji.

## Arah aktif v2.10 — navy studio dan robot

Arahan pengguna terbaru menggantikan palet cream/sage dan karakter manusia pada catatan historis di bawah. Surface: dashboard operasional dan kantor virtual. Job: memantau tim lalu membuka pekerjaan atau profil. Hierarki dashboard: navigasi tetap → ringkasan → pekerjaan; kantor: ruang → karakter → detail. Bar header sticky di batas atas viewport saat dokumen digulir; modal tetap di atas header. Target 1440×900, 768×1024, 390×844.

Delapan referensi lokal 12 Oktober: robot charcoal dengan visor hitam, mata LED dan ear pods; tiga interior sofa navy/putih dengan meja organik dan shelving tipis; palet Cinder #24292e, Chimney #4a5156, Sea Lion #808a92, Blue Dolphin #bdc7ce; studi accent wall; kamar navy/ivory; panel kayu dengan art geometris. Pilihan: dashboard putih sejuk, teks charcoal, kontrol navy, border abu; lantai oak pucat, accent wall navy, linen ivory, cushion navy, kaki graphite. Hijau tetap untuk tanaman/status, amber/merah hanya makna status. Hindari seluruh ruangan gelap dan semua robot berwarna mencolok.

Semua karakter menggunakan robot prosedural bersama: helmet membulat, visor hitam, mata LED, ear pods, badan kecil. Shell dan aksen deterministik dipreview Builder; Founder charcoal, manager navy. Profil menampilkan render robot miliknya, bukan sheet referensi. Furnitur mempertahankan footprint, tinggi bantalan dan anchor interaksi; modernisasi bentuk lewat sudut lembut, tabletop tipis, pedestal, kaki metal dan kabinet handleless. Rig harus tetap bisa mengetik, duduk, berjalan, berbaring dan mengambil kopi.

Lingkup: character/visuals → office/portrait → main/builder → CSS dashboard/operasional → tests → evidence/PRD. Tidak mengubah schema, data pemilik, provider, koneksi Obsidian, reservasi, pemulihan atau routing. Loading/empty/error/partial/success mempertahankan feedback dan pemulihan yang sudah ada; permission tidak berlaku karena tidak ada akses eksternal baru. Periksa header sebelum/sesudah scroll, tiga viewport, profil, pose fasilitas dan rute terhadap scene terbaru. Aksesibilitas/performa perangkat nyata yang belum diperiksa harus dicatat apa adanya.

Acuan kebutuhan dan arah visual: [PRD induk](docs/PRD.md), termasuk builder percakapan serta [enam screenshot dan ringkasan video](docs/references/office-video-reference-notes.md). Catatan terbaru dan bukti pemeriksaan tersedia di [IMPLEMENTATION](docs/IMPLEMENTATION.md).

Surface: workspace operasional dan kantor virtual dengan ruangan Founder serta divisi otomatis. Referensi kantor cutaway, kelompok meja, karakter chibi, label dan kontrol kamera diterjemahkan memakai geometry dan identitas lokal. Karakter duduk menghadap monitor. Ruangan divisi memuat area kerja, lounge kecil dan penyimpanan dengan jalur tengah terbuka.

Job: explore the founder room and inspect Kael. Primary action: select Kael. Hierarchy: office identity > 3D room > agent details > camera tools. Warm architectural miniature, green landscaping, cream workspace, orange selection. No marketing hero. Desktop 1440x900 and mobile 390x844. Canvas fits remaining viewport; mobile details are a dismissible sheet. Native buttons provide keyboard alternatives to canvas interactions. Reduced motion disables character idle animation and camera damping.

States: loading overlay during scene initialization; error overlay with retry if WebGL fails; empty/partial integration clearly marked as simulation and not connected; success is local status update with visible status feedback. Permission is not applicable (no account or external write). Room list follows persisted divisions. No agent API or credentials needed.

## v0.2 Operational extension

Ruang server: infrastruktur kompak di sisi ruang medis dengan frontage menyatu ke koridor. Tiga rack graphite, kaca sage, raised-floor modular, grille, pendingin putih, console kayu, kursi, kabinet dan UPS. Meja kontrol dan strip UI menampilkan Obsidian belum terhubung; tidak ada angka monitoring palsu atau tombol sesi istirahat. Detail ruang memakai dialog native yang sudah ada. Tidak mengubah ruangan divisi atau data pemilik.

Meja Founder is the default surface, preserving the 3D office as a separate sidebar destination. It prioritizes real briefs, task states, decisions and results. Use the existing warm cream/green design system. Desktop 1440x900 and mobile 390x844. Empty workspace starts with creating a division, not fabricated activity. Explicitly label manual execution and unconnected AI. Native dialogs support forms, keyboard and error feedback. Persist data on the local HTTP service; never imply that a failed save succeeded. Decisions show criteria and the exact result version before submission. Browser acceptance uses an isolated fixture while actual HTTP persistence has separate integration tests.

## Pembaruan 12 Oktober 2026

Modern Minimalist Premium: putih hangat, hijau gelap, aksen kayu/terracotta dan hierarki yang tenang. Halaman Founder memperlihatkan metrik state asli, preview kantor 3D, langkah berikutnya, briefing dan aktivitas. Navigasi terpisah untuk pekerjaan, briefing, keputusan, tim, pengetahuan dan builder. Pada ponsel, navigasi horizontal dan pemilih ruangan menggantikan sidebar penuh.

Builder menggunakan panduan lokal tiga langkah dengan draft dan preview; label AI belum terhubung selalu terlihat. Ruangan baru memakai slot tetap, empat kolom workstation, kedalaman sesuai anggota dan area furnitur depan. Pemeriksaan layout mencakup 2–13 anggota, batas ruangan, jarak furnitur, meja/kursi dan jalur masuk. Target pemeriksaan: desktop 1440×900, mobile 390×844; tablet 768×1024 untuk formulir.

Area manager kini terpisah di belakang barisan pelaksana: meja walnut lebih besar, kursi tinggi navy, karpet, signage dan partisi kaca dengan akses tengah. Koridor paving tersambung ke Founder dan seluruh divisi, dengan tepi jalan, lampu serta bangku di luar jalur. Kamera overview mencakup koridor; tinggi canvas desktop dibatasi agar kontrol tetap terlihat.

Karakter mempertahankan proporsi chibi dan bahasa bentuk referensi, dengan wajah/kacamata, rambut berlapis, detail pakaian/sepatu, rig sendi serta variasi outfit/aksesori deterministik yang dipreview builder. Ini model prosedural, bukan salinan model turnaround. Karakter idle boleh berkunjung lewat jalur aman yang membaca batas scene, dengan kecepatan dan belokan halus. Typing dan label aktivitas memetakan tugas manual; demo aktivitas ditandai jelas, tanpa progres palsu. Layar tema divisi selalu demo. Jeda gerak serta reduced-motion menghentikan animasi.

Label putih minimal memakai nama, badge peran, titik dan teks status; manager mendapat aksen brass. Label bertabrakan disembunyikan, dengan daftar tim sebagai alternatif. Overview mengutamakan label Founder/manager; fokus ruangan membuka label anggota. Tidak ada klaim pathfinding dinamis atau eksekusi AI.

Fasilitas bersama di kiri/belakang Founder: satu meeting room dan ruang medis, lounge, taman dan area olahraga; semua tersambung koridor tanpa mengambil slot divisi. Kapasitas dan status ruang visual tercantum jelas. Label fasilitas tetap dekat titik ruangan dan disembunyikan jika bertabrakan, dengan sidebar/selector sebagai alternatif.

Profil Founder, manager dan agent memakai panel bersama serta render dari rig dan preset kantor yang sama. Referensi turnaround hanya untuk dokumentasi. Desktop memakai sidebar yang bisa ditutup; tablet memakai overlay; ponsel memakai bottom sheet. Overlay mengunci fokus keyboard, membuat latar inert, mendukung Escape serta mengembalikan fokus setelah ditutup. Panel menunjukkan peran, outfit, status dan tugas lokal, dengan akses ke pekerjaan serta fokus kamera.

Meja memakai helper bersama untuk penempatan barang: zona layar di belakang, keyboard/mouse di depan, minuman di kiri dan notebook di kanan. Batas tabletop dan jarak antarbarang diuji. Furnitur memakai bentuk kayu lembut, cushion, bantal, throw, buku dan kaki yang konsisten; tidak ada editor furnitur pada tahap ini.

## Nate dan gerak sosial — v2.8

Nate memakai rig/preset kantor dengan profil sendiri dan monitor graph ungu berlabel contoh. Status default menunggu Obsidian; demo mengetik tidak mengganti status koneksi. Chip aksesibel menyebut aktivitas yang sama dengan visual.

Pasangan idle mengunjungi fasilitas bebas tanpa membuat sesi/riwayat palsu. Gestur percakapan dan rekreasi diberi keterangan Visual. Perjalanan bersamaan memiliki jeda keberangkatan, percepatan/pengereman, rotasi bertahap dan jalur yang membaca batas furnitur. Tugas atau reservasi fasilitas menghentikan kunjungan dan memulai kepulangan. Nama peserta perjalanan boleh terlihat di overview dengan penanganan tabrakan label yang sama; detail status tetap melalui hover/fokus/profil. Pencarian jalan membaca batas scene dan gagal secara aman; belum ada penghindaran antaragent atau simulasi permainan. Jeda gerak membekukan pose; reduced motion meniadakan kunjungan ambient.

## Kontrak perombakan open space dan fasilitas operasional

Surface: satu kantor terbuka yang kompak. Pemilik memilih anggota/ruang, memulai sesi fasilitas dan meninjau catatan hasil. Hierarki: nama ruang dan kapasitas → kantor → sesi aktif → detail anggota. Target 1440×900, 768×1024 dan 390×844. Screenshot pemilik menunjukkan jarak antarruang berlebihan, meja kecil dalam ruang besar, signage bertumpuk dan label besar: kurangi jarak serta ukuran ruang berdasarkan kapasitas, gunakan satu display yang rata pada dinding, isi sudut dengan huddle/penyimpanan yang berfungsi, perkecil chip nama dan tampilkan status lengkap ketika fokus/hover atau melalui profil.

Sesi fasilitas menyimpan peserta, tujuan, agenda, checkpoint dan catatan hasil. Satu ruang satu sesi; satu anggota satu sesi; kapasitas tervalidasi. Meeting melibatkan manager, hanya tugas peserta dijeda sesudah checkpoint. Istirahat menolak anggota yang sedang bekerja/review. Mulai tugas menolak peserta yang masih dalam sesi. Menutup sesi menyimpan catatan; tidak menyetujui hasil atau melanjutkan pekerjaan otomatis. State lama tanpa facilitySessions tetap valid. Gerak karakter memvisualisasikan state sesi melalui koridor; gerak bukan bukti eksekusi model. Provider AI belum terhubung, sehingga sesi dan catatan lokal belum merupakan percakapan AI otonom.

Keadaan kosong: undang anggota melalui Builder; tidak mengarang peserta. Ruang tersedia: pilih agenda dan peserta. Ruang terpakai: buka sesi serta kapasitas. Gagal simpan/validasi: pertahankan isian dan tampilkan alasan. Sukses: strip sesi aktif dan riwayat tersimpan. Mutasi QA memakai fixture terisolasi, bukan state pemilik.

Koreksi sambungan ruang/koridor: tepi jalan menempel sepanjang frontage, bukan hanya tersambung pada pintu. Ubin dipotong tepat pada batas jalur dan curb hanya mengelilingi sisi luar, tanpa bibir pemisah di sambungan lantai. Tim kecil merapat ke sisi koridor; lounge, courtyard dan studio memiliki garis belakang/depan yang sama. Partisi samping dan cap tembok berakhir sejajar tepi lantai. Identitas tim, tugas dan sesi tidak berubah oleh koreksi posisi render.

## Kontrak ruang medis, duduk dan kopi — v2.9

Surface: ruang medis menggantikan meeting kecil, dengan empat kasur sage, linen ivory, bantal, headboard, roda dan penyimpanan medis. Hanya meeting utama menerima sesi meeting baru. Hierarki medis: jumlah error → daftar nama/alasan/kasur → tindakan pemulihan → visual pasien. Ikon ⚠ kecil mengikuti kepala saat berdiri maupun rebahan, tanpa kartu nama besar yang menutupi kasur. Detail tetap tersedia melalui tooltip/profil dan daftar pasien. Target 1440×900, 768×1024 dan 390×844.

Kosong: empat kasur kosong dan penjelasan belum ada error. Error: alasan wajib, tugas berjalan dijeda, sesi peserta diakhiri dengan catatan. Sukses: pasien mendapat kasur stabil, berbaring di atas mattress, dengan riwayat tersimpan. Penuh: antrean tetap terlihat dan pasien menunggu di workstation. Pulih: catatan wajib; kasur dilepas untuk antrean; agent kembali ke meja tanpa melanjutkan tugas otomatis. Deteksi runtime dan perbaikan AI belum tersambung. Tidak ada pasien contoh di data pemilik.

Pose mengikuti fungsi furniture: tangan santai tidak memakai animasi mengetik, duduk mengikuti tinggi bantalan, rebahan memakai kaki lurus dan kepala terangkat di bantal. Naik/turun seat memakai transisi tinggi. Lounge memiliki action mesin kopi, gerak menyiapkan lalu minum dengan cangkir. Action kopi dan kunjungan sosial hanya visual, bukan hasil atau percakapan AI.

Jalur membaca bounding box furnitur/tembok dari scene, mengecualikan karakter, lantai rendah dan detail di atas tubuh. A* memakai clearance 0,4 unit, menolak sudut terpotong dan memeriksa seluruh segmen hasil. Tidak ada jalan aman berarti tidak berjalan. Pendekatan furnitur dan kontak duduk/rebahan terpisah dari koridor jalan; penempatan baru harus menguji anchor dan rute lagi. Penghindaran antaragent dan editor geometri belum tersedia.
