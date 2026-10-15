# Kael AI — Virtual Office & Meja Founder

Kantor Founder dan divisi 3D dengan workspace operasional lokal. Buat tim, susun brief, setujui rencana, jalankan tugas manual atau melalui runtime Codex/Claude Code, simpan hasil berversi, periksa hasil dan jawab keputusan. Pemeriksaan dan persetujuan tetap tindakan manusia. Status terbaru: [Progres](docs/PROGRESS.md). Panduan koneksi Claude: [Claude Code](docs/CLAUDE-RUNTIME.md).

Tema v2.10 memakai navy, charcoal, abu sejuk, ivory dan oak pucat; karakter robot dengan visor LED/ear pods, serta furnitur modern membulat. Header dashboard tetap di atas saat scroll. Referensi terbaru dan pilihan desain: [Navy & robot](docs/references/navy-robot-direction.md).

## Jalankan

Paket sumber buyer dan panduan setup terpisah: [Penyiapan buyer](docs/BUYER-SETUP.md). Jalankan `npm run package:buyer` untuk membuat folder baru `releases/kael-buyer-0.2.0/` tanpa data/kredensial/sesi kantor pengembang; paket menolak menimpa folder yang sudah ada. Ini paket uji lokal, belum installer VPS atau produk siap jual.

```sh
npm install
npm run dev
```

Buka http://localhost:5173. Memerlukan Node.js 24+. Perintah dev menjalankan Vite pada port 5173 dan server data lokal pada port 5174. Build produksi: `npm run build`. Untuk preview build, jalankan `npm run server` lalu `npm run preview` pada terminal terpisah. Pengujian: `npm test`.

Saat pertama dibuka, siapkan akun pemilik. Ambil kode sekali pakai dengan `node scripts/owner-access.mjs` di terminal server, lalu isi sendiri nama/email dan frasa sandi minimal 8 karakter. Data kantor yang sudah ada tetap dipertahankan. Berikutnya masuk dengan email/kata sandi; tombol Keluar ada di bar atas. API dan preview dilindungi sesi. Lupa password: jalankan `node scripts/owner-access.mjs --reset` sendiri di terminal server, lalu gunakan **Lupa kata sandi?** di web; kode berlaku sekali selama 15 menit. Panduan lengkap dan batas deployment: [Akses pemilik](docs/OWNER-ACCESS.md).

## Sesi AI dan dashboard

Kotak masuk manager (v2.44): buka Divisi tugas lokal → Kirim kebutuhan, atau Percakapan → Kotak masuk manager. Setelah profil bisnis, SOP dan provider manager siap, AI menyusun rencana dan mengajukannya untuk keputusanmu. Jawaban, kendala dan percobaan tersimpan pada permintaan yang sama; tidak ada approval otomatis. Satu percobaan rencana memakai satu jatah harian divisi. Arah perombakan sistem dan batas tahap ini: [Perombakan sistem](docs/SYSTEM-REBUILD.md).

Otomasi tugas lokal (v2.43): aktifkan per divisi melalui SOP & integrasi setelah provider manager/pelaksana dan SOP siap. Rencana yang disetujui berikutnya masuk antrean, manager mereview hasil, keputusan akhir tetap manusia. Default nonaktif; batas run harian dan checkpoint tersedia. Rincian: [Sesi kantor](docs/OFFICE-ROLES.md).

Buka folder kantor pada Code di aplikasi Claude, buat chat dan ketik `jadi builder`. Untuk manager/pelaksana, buat sesi lain dengan `jadi Nama Agent` sesuai data Divisi. Claude memakai hook proyek; Codex memakai bridge sessionId sesuai instruksi proyek. Diskusi berlangsung di aplikasi AI; rencana, hasil, catatan kerja dan preview tersimpan di Kael, persetujuan Founder tetap melalui web. Model sesi dipilih pada aplikasi AI. Panduan: [Sesi peran kantor](docs/OFFICE-ROLES.md).

## Builder percakapan

Buka Builder → Mulai diskusi, pilih Claude/Codex dan ceritakan kebutuhan tim. AI menyusun usulan manager/pelaksana dan SOP; koreksi melalui chat atau form preview, simpan perubahan, lalu terapkan saat siap. Draft tersimpan per instalasi, ruangan mengikuti preset, dan pekerjaan tidak dimulai otomatis. Panduan/batas: [Builder percakapan](docs/BUILDER-DIALOGUE.md).

## Monitoring n8n

Isi `N8N_BASE_URL` (URL instance, tanpa `/api/v1`) dan `N8N_API_KEY` di `.env` pada root proyek. Template tanpa rahasia tersedia di `.env.example`. `.env` dan variannya dikecualikan dari Git; jangan menaruh key dalam variabel berawalan `VITE_`, profil bisnis atau chat. `npm run dev` dan `npm run server` memuat konfigurasi ini ke proses backend saat mulai; restart setelah mengubahnya. Menu Workflow n8n memantau binding tersimpan dengan polling. Binding workflow mengikuti agent dan divisi yang dikonfigurasi, dengan satu workflow per agent pelaksana; manager mengawasi divisinya. Status, riwayat dan error dibaca tanpa menjalankan atau mengubah workflow. Error baru membuka insiden medis; pemulihan lokal tidak memperbaiki atau menjalankan ulang n8n. Panduan dan batas: [N8N](docs/N8N.md).

## Mulai menggunakan

1. Buka Meja Founder dan pilih Builder atau ketik `/builder` di kolom perintah. Panduan lokal meminta nama divisi, manager, lalu nama dan tugas agent satu per satu. Tinjau preview dan pilih Terapkan tim. Untuk input langsung tersedia Tim & divisi → Tambah langsung.
2. Isi Pengetahuan bisnis jika sudah tersedia, lalu buat briefing tiga langkah.
3. Buka draft briefing dan ajukan rencana. Tinjau di Keputusan dan setujui.
4. Buka Pekerjaan, pilih tugas, lalu mulai pekerjaan manual atau gunakan Jalankan dengan AI jika provider agent sudah diatur ke Codex/Claude dan login tersedia pada server. Provider/model dipilih di Divisi → Anggota → Setelan; koneksi terlihat di Pengaturan → AI pada server.
5. Buka konteks untuk disalin ke AI pilihanmu bila dibutuhkan. Kael tidak mengirimnya.
6. Masukkan hasil, lakukan pemeriksaan manual, lalu jawab keputusan Founder.
7. Pilih fasilitas di Kantor virtual untuk membuat sesi briefing, review atau istirahat. Pilih peserta; simpan checkpoint pekerjaan berjalan sebelum meeting. Akhiri sesi dengan catatan hasil yang dapat dibuka kembali melalui Riwayat.

Perintah tidak boleh dilompati: tugas belum disetujui tidak bisa dimulai dan versi hasil yang usang tidak dapat disetujui. Pemeriksaan gagal setelah dua revisi meminta arahan pemilik.

## Building dari coding agent

Untuk diskusi AI satu pertanyaan per giliran, buka proyek ini di Claude Code (`/building`), Codex (`$building`/pemilih skill), atau Hermes (`/building`). Skill meninjau kantor, menyarankan tim dan membuat preview; konfigurasi yang disepakati disimpan melalui bridge lokal. Entrypoint proyek/personal tersedia, tetapi sesi runtime/login belum diuji. Panduan: [BUILDING](docs/BUILDING.md).

Ruang server dihuni Nate dengan profil dan contoh graph Obsidian. Pasangan anggota idle dapat mengunjungi fasilitas bebas dan kembali saat tugas masuk. Gerak/gestur ini visual; koneksi vault dan percakapan agent mandiri belum tersedia.

## Penyimpanan

Data tersimpan di `app-data/state.json`, bukan hanya browser. Folder ini dikecualikan dari Git. Aplikasi menulis perubahan secara berurutan dan menolak perubahan dari halaman dengan revisi lama. Backup JSON dapat diunduh dari footer Meja Founder. Restore dari UI belum tersedia; jangan menimpa file data ketika server berjalan.

Server hanya untuk komputer lokal dan belum memiliki autentikasi produksi. Jangan membukanya ke internet. Koneksi provider AI, pengiriman, pembayaran dan publikasi otomatis belum diimplementasikan. Koneksi n8n hanya untuk pemantauan baca melalui backend.

## Fitur

- Ruangan Founder dengan meja, monitor, kursi, sofa, rak buku, tanaman, dan taman kecil.
- Ruang server dengan tiga rak, pendingin, grille lantai, tray kabel, meja kontrol, kabinet dan UPS. Buka dari sidebar atau pemilih ruangan. Detail ruang menjelaskan rencana Obsidian; koneksi vault dan monitoring hardware belum tersedia.
- Fasilitas bersama dalam layout kompak: meeting utama 8 kursi, ruang medis 4 kasur, AI Lounge, Courtyard dan Active studio masing-masing 4 tempat. Sesi lokal menyimpan agenda, peserta, checkpoint dan catatan hasil; karakter menuju tempat yang ditetapkan melalui koridor. Kapasitas, peserta ganda dan pekerjaan yang masih berjalan divalidasi. Percakapan AI dan jadwal otomatis belum terhubung.
- Divisi baru otomatis mendapat ruang, meja manager/agent, karakter yang duduk menghadap monitor, sofa, meja kopi, lemari, rak buku, jendela dan tanaman. Ukuran mengikuti jumlah anggota (1 manager + 1–12 pelaksana); slot tetap menjaga ruangan lama pada posisinya.
- Manager memiliki sudut khusus berpartisi kaca, meja lebih besar, kursi tinggi dan robot navy berinsignia. Divisi memiliki sudut diskusi, penyimpanan dan area duduk. Pintu ruangan terhubung koridor kompak dengan paving dan lampu; display dinding dipisahkan dari jendela dan rak.
- Shell dan aksen robot anggota dipilih otomatis dari preset deterministik. Preview builder dan profil menjelaskan tampilan yang diterapkan.
- Karakter idle dapat berkunjung melalui jalur yang menghindari batas furnitur/tembok; tangan/kaki bergerak dan belokan dihaluskan. Status tugas lokal mengatur label serta animasi mengetik. Demo aktivitas memperlihatkan simulasi tanpa mengubah tugas; tombol Jeda gerak menghentikannya.
- Monitor mengikuti tema divisi/peran: Trading, konten video, desain, kode atau catatan. Chart dan isi grafis adalah demo, bukan data live atau hasil pekerjaan AI.
- Pilih semua ruangan, Founder atau divisi melalui sidebar/dropdown. Cari anggota di Tim & divisi dan buka profil melalui kartu anggota atau karakter 3D.
- Builder menyimpan draft lokal di browser, menerima koreksi, menampilkan susunan slot dan menerapkan tim tanpa memulai pekerjaan. Ini panduan tiga langkah; diskusi adaptif di web belum tersedia; diskusi coding agent serta edit nama/peran memakai building.
- Klik karakter, label atau kartu anggota untuk profil yang konsisten: render model kantor sendiri, nama/peran, divisi, tampilan robot, status dan pekerjaan tercatat. Gambar referensi tidak ditampilkan di profil. Tombol fokus mengarahkan kamera ke anggota; panel menjadi sheet di ponsel.
- Aksesori meja dibagi menjadi zona monitor, input, minuman dan notebook; sofa berlapis cushion/bantal serta rak berisi buku.
- Pilih status Fokus, Santai, atau Offline untuk simulasi karakter.
- Geser dengan drag kiri, putar dengan drag kanan, zoom dengan scroll. Pada layar sentuh, satu jari untuk geser dan dua jari untuk zoom/putar. Tombol kamera dan tombol panah keyboard juga tersedia.
- Mode siang/malam dan reset kamera. Preferensi reduced motion menonaktifkan animasi karakter dan layar.

## Batas tahap ini

Karakter 3D dan gerak tetap representasi visual. Label nama kecil menampilkan detail aktivitas saat hover/fokus dan melalui profil. Perpindahan fasilitas memakai pencarian jalan dari batas scene dengan clearance tubuh; jalur yang tidak aman ditolak. Keberangkatan dijeda, belum ada penghindaran antaragent. Sesi fasilitas benar-benar tersimpan, tetapi tidak menghasilkan pembahasan AI atau persetujuan tugas otomatis. Model prosedural mengikuti gaya robot referensi, belum setara model/tekstur aslinya. Status tugas, hasil, divisi, keputusan dan sesi disimpan server; preferensi visual tidak disimpan antar reload. Belum ada backend eksekusi AI, akun pelanggan, atau deployment publik. Font web menggunakan Google Fonts dengan fallback sans-serif.

## Struktur

- `src/main.ts`: UI, daftar ruangan, dan interaksi.
- `src/operations.ts`: Meja Founder, formulir, riwayat, dan keputusan.
- `src/domain.ts`: model data, validasi transisi, dan konteks tugas.
- `src/builder.ts`: panduan pembentukan tim, draft browser dan preview.
- `src/layout.ts`: slot ruangan, posisi meja dan furnitur otomatis.
- `src/facilities.ts`: ukuran fasilitas, kapasitas dan posisi peserta bersama.
- `src/visuals.ts`: preset penampilan/tema divisi dan pemetaan aktivitas tugas.
- `src/character.ts`, `src/monitor.ts`: rig robot prosedural dan layar demo.
- `server/index.mjs`: API dan persistensi lokal.
- `server/n8n.mjs`, `src/n8n.ts`, `src/workflows.ts`: pemantauan n8n, pemetaan status dan dashboard.
- `src/office.ts`: scene 3D, kamera, karakter, furnitur, dan pencahayaan.
- `src/style.css`, `src/operations.css`, `src/redesign.css`: layout desktop dan mobile.
- `DESIGN.md`: kontrak desain dan cakupan tahap pertama.
- `docs/PRD.md`: kebutuhan lengkap, status implementasi dan tahapan berikutnya.
- `docs/IMPLEMENTATION.md`: bukti pengujian dan batas versi saat ini.
- `evidence/`: hasil pengecekan tampilan.

Fixture `evidence/workflow-qa.html` hanya untuk pengujian frontend dengan data sessionStorage terisolasi. Fixture tidak masuk build produksi dan tidak mengubah data kantor pemilik. Persistensi HTTP asli diuji terpisah oleh `tests/server.test.mjs`.

Ruang medis: buka fasilitas atau profil anggota → Catat error → isi alasan. Agent mendapat kasur, tugas berjalannya dijeda dan penanda ⚠ mengikuti kepala. Empat kasur dengan antrean stabil; Catat pemulihan menyimpan alasan perbaikan dan memulangkan agent, tanpa melanjutkan tugas otomatis. Nate memakai alur yang sama. Agent tanpa binding n8n masih memakai pencatatan error manual; error baru pada workflow terhubung dicatat otomatis melalui polling.

Mesin kopi: buka AI Lounge → Mesin kopi. Anggota idle yang tersedia berjalan ke coffee bar, menyiapkan dan minum kopi, lalu kembali. Aktivitas ini visual. Navigasi memakai batas furnitur/tembok scene dan berhenti bila tidak ada rute aman; pose santai, mengetik dan rebahan dipisah.


