# Sesi kantor pada Claude Code dan Codex

Tujuan alur ini: percakapan berada pada aplikasi AI, kantor/data berada pada instalasi Kael, sedangkan dashboard menampilkan pekerjaan, preview dan keputusan. Gunakan satu chat tetap per peran. Ini implementasi Kael sendiri; tidak memakai kode, aset, akun atau endpoint produk referensi.

## Memulai

Buka **folder instalasi kantor yang menjalankan server** di bagian Code aplikasi Claude. Untuk checkout pengembang: `C:/Kael AI`. Pada VPS, sambungkan aplikasi ke folder kantor di VPS melalui koneksi SSH yang didukung client; login provider/VPS tetap milik pengguna. Membuka folder lain bernama serupa tidak memuat instruksi/hook kantor ini.

Buat chat baru dan ketik `jadi builder`. Untuk manager/pelaksana, buat chat lain dan ketik `jadi Nama Agent` menggunakan nama pada menu Divisi. Pin chat tersebut dari aplikasi AI. Ketik `udahan` untuk melepaskan peran sesi. Kael tidak membuat atau mengeklik chat/sidebar aplikasi desktop secara otomatis.

Claude memakai hook proyek `.claude/settings.json`: `UserPromptSubmit` mengikat peran pada ID sesi Claude dan menyisipkan konteks terbaru; `SessionStart` memulihkan ikatan saat resume; `PostToolUse` memperbarui aktivitas; `Stop`/`SessionEnd` menandai luang. Hanya event identitas/perintah peran yang diproses, tidak membaca file transcript atau seluruh riwayat chat. Hook harus dimuat oleh client pada proyek yang dipercaya. Restart/buka ulang sesi jika konfigurasi baru belum terbaca. Jika hook tidak tersedia, ikuti jalur CLI di bawah.

Untuk Codex atau sesi tanpa hook: setelah pengguna mengatakan `jadi <nama>`, jalankan `node scripts/office.mjs open "Nama Agent" Codex` (gunakan Claude untuk client Claude). Simpan `sessionId` keluaran di konteks chat, lalu baca `node scripts/office.mjs context SESSION_ID` sebelum bekerja. Jangan membuka sesi peran baru setiap pesan. Saat melanjutkan chat yang sama, gunakan ID yang sama. Memori peran dapat dibaca dari sesi baru tanpa menyalin seluruh riwayat client.

Jika nama berulang, jalankan `node scripts/office.mjs roles` lalu minta pengguna memilih ID/divisi. Jangan memilih agent lain secara diam-diam. Nama/peran berasal dari data kantor, bukan daftar tetap; divisi baru langsung dapat dibuka sebagai sesi.

## Tindakan yang tersedia

Semua perubahan melalui `node scripts/office.mjs send SESSION_ID request.json`. File permintaan boleh dibuat di `proposals/`; jangan mengubah `app-data/` langsung. Baca ulang context sebelum mengirim, gunakan revision/memory version terkini, dan laporkan tersimpan hanya setelah API mengonfirmasi. Jika timeout atau konflik, periksa kondisi sumber dahulu dan jangan mengulang buta.

Builder berdiskusi satu hal per giliran dan menyiapkan JSON:

```json
{"action":"propose","revision":0,"targetId":"","proposal":{"name":"Layanan pelanggan","manager":"Maya","workers":[{"id":"","name":"Nara","role":"Menyusun draft jawaban"}],"steps":"Brief → draft → review manager → keputusan Founder","criteria":"Sesuai fakta produk","limits":"Tidak mengirim, membayar atau menyetujui otomatis","provider":"manual","model":""}}
```

`targetId` kosong membuat usulan divisi baru; edit mempertahankan semua ID anggota lama. Preview tim/SOP muncul di web **Builder**. Tunggu pemilik menerapkan melalui web; baca context untuk memeriksa `proposals[].status`. Ruangan/furnitur memakai preset kantor. Workflow dan produksi khusus tetap memakai konfigurasi tersendiri. Ini tidak menyediakan editor ruang bebas.

Manager menerima `baru: <pekerjaan>` dengan menyusun rencana, kemudian mengirim:

```json
{"action":"command","revision":0,"command":{"type":"manager-plan","divisionId":"ID_DIVISI_SENDIRI","title":"Riset jawaban pelanggan","goal":"Tujuan dari pemilik","criteria":"Kriteria yang dapat diperiksa","tasks":[{"agentId":"ID_PELAKSANA","title":"Susun draft sesuai katalog"}]}}
```

Satu rencana dapat membagi 1–12 tugas ke pelaksana berbeda. Rencana masuk Keputusan dan **belum boleh berjalan sebelum disetujui pemilik**. Setelah disetujui, `lanjut` dapat memanggil `{"action":"run","revision":0,"taskId":"ID_TUGAS"}` untuk runner pelaksana yang dikonfigurasi. Jika provider belum tersedia, minta pengaturan; jangan mengaku agent sudah bekerja. Runner menyimpan hasil untuk review, tanpa approval otomatis.

Pelaksana pada sesi aplikasi AI dapat memakai command `start`, `result` (dengan `content`), dan `hold` (dengan status paused/blocked dan reason) hanya pada tugasnya sendiri. Baca hasil penuh melalui `{"action":"task","taskId":"ID_TUGAS","version":1}`; context umum hanya memberi cuplikan. Manager wajib membaca hasil penuh pada sesi yang sama sebelum mengirim `review` dengan `id`, `version`, `accept` dan `note`. Review diterima membuat keputusan hasil bagi pemilik; tidak mengesahkan hasil. Produksi KaelaCH dan workflow n8n tidak boleh dijalankan ulang melalui jalur task umum.

## Melanjutkan setelah keputusan

Setelah memilih keputusan di web, kembali ke sesi manager dan ketik `lanjut`. Manager membaca konteks terbaru: rencana disetujui → mulai tugas; hasil tersedia → baca versi penuh dan review; menunggu approval → tunggu Founder; revisi → kerjakan versi berikutnya pada task ID yang sama; ditolak/selesai → tidak dijalankan ulang. Provider runner harus sudah tersedia dan disetel; tugas yang meminta informasi dilengkapi dahulu.

`recentDecisions` berisi maksimal 20 keputusan yang sudah dijawab dalam lingkup peran, termasuk catatan dan versi. Daftar `decisions` tetap khusus yang menunggu. Setiap tugas lokal memiliki `workStatus`, `stage` dan `nextStep` dari logika halaman Pekerjaan yang sama; raw status dan seluruh hasil lama tetap dipertahankan. Konteks runner memuat tiga arahan terbaru, termasuk catatan persetujuan rencana.

Perpindahan Claude/Codex membaca data kantor dan memori peran yang sama. Persetujuan tidak memicu agent desktop otomatis. Briefing dengan otomasi aktif dilanjutkan oleh runtime server; briefing lainnya dilanjutkan lewat prompt. Chat/transcript tetap dikelola masing-masing client.

`apa aja yang nunggu aku?`, `ada error?`, `laporan` berarti baca context terbaru lalu jelaskan keputusan, kendala, hasil dan status yang benar-benar ada. Manager hanya melihat divisinya; Builder dapat merangkum seluruh kantor. Status n8n yang terputus/parsial tidak boleh disimpulkan sehat. Jangan memperbaiki atau mengirim data ke layanan luar dari pertanyaan status.

Catat ringkasan penting dengan `{"action":"memory","version":0,"text":"Ringkasan fakta dan langkah berikutnya"}`. Memori dibagi per ID peran dan memiliki version guard antarclient. Catatan kerja yang sengaja dibagikan ke divisi memakai command `division-note` dengan `divisionId` dan `text`; server menambahkan identitas penulis. Catatan/hasiI tersimpan menjadi konteks sesi berikutnya. Jangan menyalin chain-of-thought, credential, seluruh transcript atau payload sensitif.

## Otomasi manager pada server

Kotak masuk manager (v2.44): pemilik mengirim kebutuhan melalui Divisi tugas lokal → Kirim kebutuhan / Percakapan. Server memeriksa kesiapan bisnis, SOP, provider manager dan batas harian, lalu manager menyusun rencana. Informasi kurang menjadi pertanyaan pada permintaan yang sama. Rencana tetap menunggu approval Founder; gagal/terputus menunggu arahan pemilik, bukan retry sendiri. Satu percobaan rencana memakai satu jatah harian divisi, termasuk jika otomasi pelaksana nonaktif. Bridge menampilkan managerRequests sesuai lingkup manager/Builder; jangan membuat rencana duplikat untuk inbox yang sedang dikelola server.

Pada Divisi → SOP & integrasi → Atur otomasi, pemilik dapat mengaktifkan otomasi tugas lokal. SOP harus sudah tersimpan dan provider Codex/Claude manager serta seluruh pelaksana harus tersedia. Default nonaktif. Otomasi berlaku untuk rencana yang disetujui setelah aktivasi; briefing lama tidak diambil alih.

Sesudah approval rencana, antrean server menjalankan satu run AI pada satu waktu. Tugas dalam satu brief dijalankan berurutan; tugas berikutnya menunggu hasil sebelumnya disetujui Founder. Konteks pelaksana memuat sampai tiga hasil disetujui sebelumnya dari brief yang sama. Manager memakai provider/modelnya sendiri dan memeriksa versi penuh sesuai brief/SOP. Accept manager hanya membuat keputusan pending; kamu tetap memberi approval akhir. Penolakan manager memberi maksimal dua revisi otomatis, kemudian meminta arahan Founder. Arahan revisi Founder menggunakan task ID yang sama dan mempertahankan hasil lama.

Batas default 8 run AI otomatis per divisi per hari WIB, dapat diatur 2–100. Pelaksanaan dan review masing-masing memakai satu jatah; jatah dipesan saat antre dan tidak dikembalikan saat gagal/dihentikan. Mengubah batas tidak mereset penggunaan hari itu. Ini bukan batas biaya/token/kuota akun provider. Run manual yang dimulai pemilik berbeda dari jatah otomatis; sesi AI tidak boleh melewati antrean otomatis melalui action run.

Jeda menghentikan run otomatis aktif/antre, tanpa menghentikan run manual. Run yang sudah dimulai dan terputus ditandai interrupted, tidak dicoba ulang otomatis. Run yang masih queued dapat dilanjutkan sekali setelah restart. Respons gagal, malformed, blocked atau review usang menjaga hasil lama dan menunggu tindakan manusia. Gunakan detail Pekerjaan untuk memeriksa alasan, mencoba review manager lagi atau mereview manual. Aktivasi ulang tidak mengulang panggilan yang gagal/dihentikan sendiri.

Sesi Claude/Codex membaca konfigurasi, budget, run, hasil dan keputusan yang sama. Otomasi berjalan di proses server ketika server hidup; tidak membuka chat atau membangunkan sesi desktop. Workflow n8n dan produksi recap tetap memakai alur khusus.

## Batas dan keamanan

- Keputusan Founder, penghapusan data, penggantian identitas peran dalam command, publikasi, pembayaran dan pengiriman eksternal tidak tersedia bagi bridge sesi AI. Jawaban persetujuan tetap melalui web yang memakai autentikasi pemilik.
- Bridge memakai kunci lokal terbatas milik instalasi, bukan OAuth/password Claude. Helper membaca kunci tanpa mencetaknya; jangan membacanya melalui tool model. Kunci tersebut adalah akses operator lokal yang dipercaya, bukan sandbox OS antara proses AI yang berbagi user/filesystem.
- Model chat dipilih di aplikasi AI. Setelan provider/model pelaksana di dashboard berlaku untuk runner task, tidak mengubah model sesi desktop secara otomatis.
- Ikatan peran/memori tersimpan di `office-sessions.json` dalam direktori data; backup secara privat. Aktivitas lebih tua dari dua menit tidak dianggap sedang bekerja. Riwayat chat asli dan pin tetap dikelola aplikasi AI.
- Otomasi tugas lokal berjalan setelah persetujuan, bukan cron untuk pekerjaan bebas. Bot Telegram, provisioning SSH, installer VPS dan pemindahan seluruh chat web ke histori desktop belum tersedia.

Acuan perilaku hook: [Dokumentasi resmi Claude Code](https://code.claude.com/docs/en/hooks). Pola referensi yang diadaptasi secara independen: [Panduan peran Lembur](https://lembur.id/bantuan/kenalan-kantor/) dan audit lokal laporan 05; kode/aset/endpoint produk tersebut tidak disalin.
