# Audit keamanan dan privasi statis

Audit pada 14 Oktober 2026. Root sumber untuk semua path bukti: `C:/Kael AI/lembur-backup-lengkap/kantor/`. Audit hanya membaca source. Backup tidak dijalankan, kredensial tidak digunakan, dan endpoint vendor/VPS tidak dihubungi. Nilai rahasia tidak dimasukkan laporan.

Konvensi: referensi source pendek tanpa prefix `kantor/` atau `kit-kantor-ai/` merujuk `kit-kantor-ai/`. Nama file rahasia/runtime menunjukkan lokasi yang dipakai program; penyebutannya bukan bukti isinya dibuka. Nomor lanjutan dalam paragraf yang sama merujuk file source terakhir yang disebut.

**Kesimpulan:** source memiliki perlindungan nyata seperti listener loopback, password hash, cookie acak, CSP, approval yang terkait isi pekerjaan, serta helper dengan perintah tetap. Kekurangan utamanya adalah izin AI yang belum menjadi isolasi pada tingkat sistem operasi, password awal yang pendek, dan beberapa operasi tanpa transaksi atau penguncian.

Status kepastian:

- **TERBUKTI:** perilaku terlihat langsung dalam source.
- **INDIKASI:** alur kode mendukung kemungkinan dampak, tetapi belum diuji.
- **HIPOTESIS:** masih memerlukan asumsi atau bukti tambahan.
- **BELUM DAPAT DIPASTIKAN:** bukti deployment atau backend tidak tersedia.

Tingkat risiko menggabungkan dampak dan prasyarat. Tidak ada klaim CVE, exploit aktif, atau password pelanggan yang sudah berhasil ditebak.

## 1. Model ancaman

| Kondisi/pelaku | Kemampuan | Batas yang tetap berlaku |
|---|---|---|
| Pengunjung tanpa sesi | Mencoba login, membaca aset dan health, mengambil media bila token diketahui | Route owner tetap memakai sesi. Dashboard hanya mendengarkan loopback. |
| Situs lain di browser owner | Mengirim navigasi/form lintas situs | Cookie SameSite dan pemeriksaan asal membatasi serangan CSRF. |
| Pencuri cookie owner | Menggunakan seluruh hak owner | HttpOnly mengurangi pencurian lewat JavaScript; HTTPS tetap penting. |
| Konten berbahaya yang dibaca AI | Mencoba memengaruhi pilihan alat melalui prompt injection | Tidak otomatis memperoleh root. Dampak bergantung izin CLI dan alat yang tersedia. |
| AI dengan alat shell/file | Membaca atau menulis sesuai izin proses dan helper | Deny pada satu alat tidak otomatis menjadi larangan filesystem untuk semua program. |
| Pemilik VPS/root | Mengubah kode, konfigurasi, proxy dan environment | Ini kewenangan administratif yang disengaja, bukan kerentanan remote sendiri. |
| Sumber paket yang dikompromikan | Mengirim paket beserta hash yang sesuai | SHA-256 tidak mengautentikasi penerbit bila hash dan paket dikendalikan pihak yang sama. |

Policy kit dapat digabung dengan pengaturan lokal/user dan opsi CLI. Audit tidak menjalankan Claude untuk membuktikan izin efektif. Demikian pula, source backup tidak membuktikan firewall, sudoers, cron atau konfigurasi proxy yang sedang aktif di VPS.

## 2. Kontrol yang sudah terlihat

| Kontrol | Bukti source | Batas |
|---|---|---|
| HTTP internal loopback | `kit-kantor-ai/dashboard/server.mjs:1153`; `kit-kantor-ai/dashboard/situs.mjs:91` | Proxy dan proses lokal masih dapat mengaksesnya. |
| Password memakai salt, scrypt dan perbandingan waktu konstan | `kit-kantor-ai/dashboard/server.mjs:906–912`; `kit-kantor-ai/installer/pasang.mjs:237–243` | Password awal memiliki ruang kombinasi kecil; lihat S02. |
| Cookie acak 24 byte, hanya hash sesi disimpan | `kit-kantor-ai/dashboard/server.mjs:24–37,947–951` | Masa sesi 30 hari, satu identitas owner, tanpa MFA. |
| HttpOnly dan SameSite=Lax | `kit-kantor-ai/dashboard/server.mjs:951` | Atribut Secure bergantung header proxy. |
| CSP, frame DENY, escape teks HTML | `kit-kantor-ai/dashboard/server.mjs:60,211–213,914–915` | URL dari konfigurasi lokal tetap perlu validasi tersendiri. |
| Token form untuk update dan sosmed | `kit-kantor-ai/dashboard/server.mjs:1030–1053` | Belum diterapkan pada semua mutasi. |
| Subprocess HTTP memakai executable tetap dan array argumen | `kit-kantor-ai/dashboard/server.mjs:482,725,752,789,1023–1027` | Isi helper dan batas path masih perlu diaudit. |
| Nama file task dan pilihan keputusan diperiksa | `kit-kantor-ai/dashboard/server.mjs:888–890,1116–1132` | Belum ada nomor revisi atau penguncian antarpenulis. |
| Website memakai pemeriksaan realpath dan pergantian live melalui symlink | `kit-kantor-ai/dashboard/situs.mjs:32–50`; `kit-kantor-ai/alat/web.mjs:124–142` | Root live sengaja dipercaya; bukan verifikasi seluruh rantai update. |
| Approval terkait hash rencana dan media | `kit-kantor-ai/alat/repliz-inti.mjs:160–162,233–241` | Masih ada risiko symlink dan penjadwalan bersamaan. |
| Media publik memakai token, SHA dan masa akses | `kit-kantor-ai/alat/repliz-inti.mjs:198–213,245–248` | Token URL adalah izin akses yang dapat dipakai siapa pun yang memilikinya. |
| Hook Drive menolak alat tidak dikenal dan error pada pemeriksaan awal | `kit-kantor-ai/alat/satpam-drive.mjs:31–36,73–102` | Cache keanggotaan file dapat tertinggal dari keadaan Drive. |

## 3. Temuan prioritas

### S01 — Izin alat AI belum menjadi isolasi rahasia pada sistem operasi

**Status:** TERBUKTI pada kemampuan policy; dampak pada deployment efektif masih INDIKASI.

**Bukti:** `kit-kantor-ai/pagar/settings.json:4–14` mengizinkan alat baca/tulis workspace serta beberapa program shell pembaca umum. Baris 70–76 melarang alat native membaca/menulis `.rahasia` dan mengubah settings. `kit-kantor-ai/detak.sh:104–110` memuat settings dan menyediakan Bash, Read, Write dan Edit.

Larangan Read terhadap sebuah path tidak otomatis melarang program shell yang membaca path sama. Program tersebut berjalan dengan hak user Linux yang sama. Mode file 0600 melindungi dari user lain, bukan semua proses milik user aplikasi.

- **Prasyarat:** AI dapat memilih alat yang melewati batas yang dimaksud, izin efektif CLI mengizinkannya, dan file target dapat dibaca user aplikasi. Prompt injection mungkin menjadi pemicu, tetapi tidak terbukti terjadi.
- **Dampak:** rahasia terbaca atau kontrol berubah. **Severity tinggi; kemungkinan sedang bersyarat.** Ini bukan endpoint Internet tanpa login yang langsung membaca secret.
- **Mitigasi KAEL:** worker memakai user/container terpisah, secret disediakan broker hanya untuk operasi tertentu, mount read-only, alat dengan kemampuan minimum, dan validasi path pada setiap helper. Uji semua jalur baca—termasuk shell—menggunakan secret dummy.

### S02 — Password instalasi memiliki sekitar 21,1 bit entropi

**Status:** TERBUKTI sebagai perhitungan dari generator; risiko tebakan setelah hash bocor adalah INDIKASI.

**Bukti:** `kit-kantor-ai/installer/pasang.mjs:241–243` membuat dua kata dari 16 pilihan dan angka 1000 sampai 9998. Ruangnya `16² × 8999`, sekitar 2,3 juta kombinasi atau 21,1 bit. Hash scrypt terlihat pada 237–239. Reset memakai tiga kata dari 28 pilihan dan angka, sekitar 27,6 bit (`kit-kantor-ai/alat/password-dashboard.mjs:14–18`).

- **Prasyarat:** penyerang mendapat hash/salt dari file atau backup, atau mempunyai kemampuan mencoba banyak login online. Scrypt dan batas 10 kegagalan/15 menit/IP tetap menaikkan biaya (`kit-kantor-ai/dashboard/server.mjs:940–955`).
- **Dampak:** pengambilalihan dashboard bila tebakan berhasil. **Severity tinggi saat hash bocor; kemungkinan rendah–sedang**, bergantung akses backup dan pembatasan login.
- **Mitigasi:** password acak minimal 128 bit atau passphrase lebih panjang, password manager, MFA opsional, serta batas percobaan global dan per-IP.

Tidak ada password aktual yang dibaca atau dicoba. Perhitungan ini bukan klaim bahwa password saat ini sudah diketahui.

### S03 — AI diberi izin otomatis untuk mereset login owner

**Status:** TERBUKTI pada policy kit; izin runtime efektif BELUM DAPAT DIPASTIKAN.

**Bukti:** `kit-kantor-ai/pagar/settings.json:41` mengizinkan helper reset tanpa pertanyaan. `kit-kantor-ai/alat/password-dashboard.mjs:21–31` menulis hash baru, mengosongkan sesi, memulai ulang dashboard dan mencetak password baru. Helper tidak memverifikasi identitas owner sendiri.

- **Prasyarat:** AI menerima instruksi salah atau dipengaruhi konten tidak tepercaya dan izin otomatis berlaku. Permintaan reset langsung dari owner tetap penggunaan sah.
- **Dampak:** owner keluar dari sesi dan password baru masuk transcript. **Severity tinggi; kemungkinan sedang bersyarat.**
- **Mitigasi:** reset hanya melalui service identitas dengan autentikasi ulang dan approval eksplisit. Worker AI tidak mendapat kemampuan mengganti credential. Password baru diberikan langsung kepada owner, bukan sebagai hasil alat untuk model.

### S04 — Pemeriksaan media Repliz belum mengikuti realpath symlink

**Status:** TERBUKTI pada pemeriksaan path; kebocoran melalui symlink adalah INDIKASI.

**Bukti:** `kit-kantor-ai/alat/repliz-inti.mjs:138–144` memakai `path.resolve`, prefix root dan penolakan string `.rahasia`, kemudian `statSync/readFileSync` mengikuti symlink. `mediaPublik:209–211` juga memeriksa prefix teks dan SHA tanpa realpath.

- **Prasyarat:** ada symlink atau komponen direktori media yang mengarah ke file lain yang masih dapat dibaca user aplikasi. Penjadwalan tetap membutuhkan approval hash owner; preview media membutuhkan sesi. Audit belum membuktikan bahwa agent dapat membuat symlink otomatis pada izin efektif.
- **Dampak:** bytes di luar folder media dapat dibaca atau diterbitkan. **Severity tinggi; kemungkinan rendah–sedang bersyarat.**
- **Mitigasi:** folder upload khusus, penolakan symlink setiap komponen, perbandingan realpath kanonik, validasi isi/MIME dan snapshot media tetap saat approval. Gunakan handle file yang sama untuk pemeriksaan dan streaming.

Ekstensi gambar saja tidak menjamin isi file adalah gambar.

### S05 — Perlindungan CSRF belum seragam pada seluruh mutasi

**Status:** TERBUKTI pada perbedaan kontrol; exploit browser masih INDIKASI bersyarat.

**Bukti:** `kit-kantor-ai/dashboard/server.mjs:1015–1027,1101–1113,1138–1148` menolak asal berbeda hanya jika Origin/Referer tersedia. Publish/rollback web, jawaban task, tampilan dan cek Drive tidak memakai token form. Logout pada 963 mengubah sesi tanpa pembatasan metode. Update dan sosmed mewajibkan asal serta token (1030–1053).

CSRF adalah permintaan yang dikirim dari situs lain menggunakan sesi owner tanpa maksud owner.

- **Prasyarat:** browser owner memiliki sesi dan request membawa cookie serta lolos aturan same-site/proxy/header. SameSite=Lax memblokir kebanyakan POST lintas situs pada browser modern; serangan standar tidak boleh dianggap pasti berhasil.
- **Dampak:** keputusan/publish tanpa niat owner, perubahan tampilan atau logout paksa. **Severity sedang; kemungkinan rendah–sedang.**
- **Mitigasi:** seluruh mutasi memakai POST/PATCH/DELETE, asal yang diizinkan secara eksplisit, token CSRF terikat sesi, validasi jenis body, dan logout melalui POST.

### S06 — Login dan atribut cookie bergantung pada header proxy

**Status:** TERBUKTI ketergantungannya; pemalsuan dari Internet BELUM DAPAT DIPASTIKAN.

**Bukti:** `kit-kantor-ai/dashboard/server.mjs:938–955` menggunakan X-Forwarded-For langsung sebagai identitas IP dan X-Forwarded-Proto untuk Secure. Aplikasi tidak menentukan daftar proxy tepercaya sendiri. `kit-kantor-ai/mulai.sh:98–112` menggunakan konfigurasi reverse proxy standar Caddy.

- **Prasyarat:** akses langsung dari proses lokal, atau proxy yang meneruskan header tidak tepercaya tanpa normalisasi. Tidak ada bukti bahwa konfigurasi Caddy standar dalam backup membiarkan pemalsuan tersebut.
- **Dampak:** batas login tidak tepat atau cookie tanpa Secure pada konfigurasi salah. **Severity sedang; kemungkinan rendah pada proxy yang benar**, meningkat bila port internal dibuka.
- **Mitigasi:** Secure wajib pada produksi HTTPS, percaya header hanya dari proxy terdaftar, normalisasi IP dan batas login global. Uji rantai proxy di staging dengan header dummy.

### S07 — Penjadwalan sosmed dan penulisan task rentan konflik bersamaan

**Status:** TERBUKTI tidak ada transaksi/penguncian terkait; duplicate posting dan kehilangan perubahan adalah INDIKASI.

**Bukti:** `kit-kantor-ai/alat/repliz-inti.mjs:233–266` membaca status lama (239), memeriksanya (241), menulis status (248), lalu melakukan request API (258). Tidak ada lock per rencana atau kunci idempotensi. Dua request approval dapat masuk melalui `kit-kantor-ai/dashboard/server.mjs:1079–1085`. Jawaban task membaca state pada 964 lalu menulis ulang file pada 846–864 dan 1106–1136.

- **Prasyarat:** dua tab/request, retry client atau dua proses bekerja pada data sama. Node yang memakai satu thread tidak mencegah konflik antarproses atau antaroperasi await.
- **Dampak:** posting ganda atau jawaban/perubahan task tertimpa. **Severity sedang–tinggi; kemungkinan sedang.**
- **Mitigasi:** transaksi database dengan constraint unik, lock per rencana sebelum membaca status, idempotensi API bila tersedia, nomor revisi task dan penolakan perubahan versi lama.

Temp+rename mencegah file setengah tertulis, tetapi tidak mencegah writer terakhir menimpa perubahan writer lain. Tombol UI dinonaktifkan bukan penguncian server.

### S08 — Data lokal dengan tipe salah dapat menghentikan dashboard

**Status:** TERBUKTI kurangnya schema dan penanganan error menyeluruh; penghentian proses adalah INDIKASI.

**Bukti:** `kit-kantor-ai/dashboard/server.mjs:964` menjalankan `data()` dalam handler tanpa try/catch luar (918–1154). `repliz-inti.mjs:129–162` hanya memastikan rencana berupa object sebelum memakai field. `kit-kantor-ai/dashboard/server.mjs:708–710` menganggap performa berisi array; halaman web juga menganggap daftar domain berupa array (580–581,599).

- **Prasyarat:** agent/helper/restore menghasilkan tipe keliru, file hilang, disk atau izin bermasalah. Pengunjung tanpa login tidak otomatis dapat menulis file tersebut.
- **Dampak:** dashboard dan server situs, yang berjalan dalam proses sama, berhenti melayani. **Severity sedang; kemungkinan sedang.**
- **Mitigasi:** schema pada batas input, batas ukuran/jumlah, error per record, karantina file rusak, catch handler, dan service supervisor. Validasi dilakukan sebelum state diterbitkan.

### S09 — Cache izin Drive bisa tertinggal setelah file dipindah

**Status:** TERBUKTI penggunaan cache; akses di luar scope setelah perubahan adalah INDIKASI.

**Bukti:** `kit-kantor-ai/alat/satpam-drive.mjs:40–46,81–98,105–129` mengizinkan baca berdasarkan ID yang pernah dikenal. Tidak ada pemeriksaan ulang parent setiap baca atau penghapusan ID setelah perubahan di luar sistem. `drive-folder.mjs:57–60` mengosongkan cache saat mengganti folder utama.

- **Prasyarat:** file yang pernah diizinkan dipindahkan keluar folder, akun connector masih dapat mengaksesnya, dan registry lama tetap ada.
- **Dampak:** batas “hanya folder kantor” tidak lagi sesuai keadaan aktual. **Severity sedang; kemungkinan sedang bersyarat.** ACL Google tetap berlaku; ini bukan bypass izin Google.
- **Mitigasi:** broker memverifikasi rantai parent saat baca, cache mempunyai TTL dan pencabutan, akun Drive khusus, serta menolak akses bila keanggotaan tidak diketahui.

### S10 — Integritas update belum mengautentikasi penerbit secara independen

**Status:** TERBUKTI.

**Bukti:** `kit-kantor-ai/installer/pasang-awal.sh:51–62`; `kit-kantor-ai/update.sh:77–91`. Ada pemeriksaan versi, SHA-256 dan URL HTTPS. Tidak ditemukan tanda tangan paket/manifest yang diverifikasi memakai kunci publik tertanam sebelum kode baru dijalankan.

- **Prasyarat:** layanan penerbit/penyimpanan paket dikompromikan, atau admin mengubah trust endpoint. Perubahan download tanpa hash cocok tetap ditolak.
- **Dampak:** kode paket berbahaya dijalankan, termasuk sebagai root saat pemasangan awal. **Severity tinggi; kemungkinan rendah–sedang**, bergantung kontrol release backend yang tidak tersedia.
- **Mitigasi KAEL:** manifest bertanda tangan berisi versi, hash dan kedaluwarsa; kunci publik tertanam; rotasi kunci; proses build yang dapat diverifikasi; signer dipisahkan dari host unduhan; serta aturan rollback versi.

Ini bukan kelemahan SHA-256 dan bukan bukti paket arsip ini berbahaya.

### S11 — Arsip diekstrak tanpa pemeriksaan entry sebelum ekstraksi

**Status:** TERBUKTI tidak ada preflight khusus; dampak traversal/symlink masih INDIKASI.

**Bukti:** `kit-kantor-ai/installer/pasang-awal.sh:60–64`; `kit-kantor-ai/update.sh:87–94`: hash diperiksa, kemudian tar mengekstrak dan keberadaan beberapa file diperiksa. Tidak terlihat allowlist path/jenis entry, kebijakan link atau batas ukuran dekompresi.

- **Prasyarat:** paket berbahaya sudah lolos trust sumber/hash. Versi tar dapat menolak bentuk traversal tertentu; audit tidak mengklaim seluruh traversal pasti berhasil.
- **Dampak:** isi atau link berbahaya pada proses instalasi. **Severity tinggi saat instalasi root; kemungkinan rendah bersyarat.**
- **Mitigasi:** staging nonroot, pemeriksaan path yang dinormalisasi, penolakan link berbahaya, batas jumlah/ukuran entry, manifest file terverifikasi dan pemeriksaan realpath setelah ekstraksi.

### S12 — Installer dapat mengganggu VPS yang sudah mempunyai layanan

**Status:** TERBUKTI sebagai perilaku administratif; bukan exploit remote.

**Bukti:** `kit-kantor-ai/mulai.sh:43` mengaktifkan UFW jika tersedia; 48 menambah user ke grup sudo; 89–115 menimpa Caddyfile global lalu reload/restart tanpa backup/validate pada jalur ini. Rutin alamat lain mempunyai backup/validate, tetapi itu tidak berlaku otomatis pada jalur ini.

- **Prasyarat:** owner menjalankan installer sebagai root pada VPS yang sudah dikonfigurasi.
- **Dampak:** situs lain atau SSH pada port khusus terganggu. **Severity tinggi secara operasional; kemungkinan sedang untuk VPS bersama.**
- **Mitigasi KAEL:** preflight service/firewall/port SSH, dry-run, konfigurasi situs terpisah, backup+validate+rollback sebelum reload, user aplikasi tanpa sudo, serta syarat VPS baru bila coexistence belum didukung.

Anggota grup sudo tidak otomatis memiliki sudo tanpa password; konfigurasi sudoers aktif belum diperiksa.

### S13 — Instalasi dependensi mempercayai executable remote tanpa pin penuh

**Status:** TERBUKTI pola trust administratif.

**Bukti:** `kit-kantor-ai/mulai.sh:67` menjalankan installer NodeSource melalui curl→bash sebagai root; 71 memakai npx Playwright major 1 untuk dependensi browser; 133 menjalankan installer Claude remote sebagai user aplikasi. HTTPS tersedia, tetapi verifikasi hash/signature dan pin versi penuh tidak terlihat pada jalur tersebut.

- **Prasyarat:** pemasangan oleh owner, channel vendor/npm dikompromikan atau versi berubah menjadi tidak kompatibel.
- **Dampak:** kode dependensi atau perubahan sistem tidak sesuai harapan. **Severity tinggi pada supply chain; kemungkinan rendah–sedang.**
- **Mitigasi:** versi dipatok, repository paket tepercaya dan verifikasi penerbit, artefak installer yang ditinjau, lockfile/SBOM, dan fase root sekecil mungkin.

Ini instalasi yang disengaja, bukan shell injection dari input HTTP.

### S14 — Update dan pemasangan ulang belum mempunyai rollback transaksi penuh

**Status:** TERBUKTI alur perubahan; kerusakan saat gagal adalah INDIKASI.

**Bukti:** `kit-kantor-ai/installer/perbarui.mjs:53–94` mengganti file kantor satu per satu sebelum `kit-kantor-ai/update.sh:94` mengganti folder kit. Kegagalan pembaruan policy hanya menghasilkan warning. `kit-kantor-ai/installer/pasang.mjs:251–255` mencadangkan sebagian area pada rerun; penulisan task/SOP/helper berikutnya dijelaskan dokumen03.

- **Prasyarat:** disk penuh, proses mati, error migrasi, atau wizard diulang pada workspace yang sudah berisi pekerjaan.
- **Dampak:** campuran versi/konfigurasi atau pekerjaan tertimpa. **Severity tinggi secara operasional; kemungkinan sedang.**
- **Mitigasi KAEL:** release di staging, backup state dan konfigurasi dengan restore teruji, migrasi transaksi, pergantian release atomik, health check dan rollback otomatis. Wizard tidak menimpa task lama pada rerun.

Kit lama yang disimpan bukan rollback otomatis untuk seluruh state bisnis.

### S15 — Backup home mengandung area rahasia dan data pribadi

**Status:** TERBUKTI kelas file melalui inventaris; keaktifan nilainya BELUM DAPAT DIPASTIKAN.

**Bukti:** area SSH, konfigurasi/sesi Claude, kode install dan runtime `.rahasia` dicatat pada dokumen01. `kit-kantor-ai/dashboard/server.mjs:26,908` serta `kit-kantor-ai/alat/repliz-inti.mjs:33–39` menunjukkan tujuan file terkait. Isi credential tidak dibuka dalam audit ini.

- **Prasyarat:** backup mentah dibagikan, dimasukkan repository, diunggah ke hosting atau diakses perangkat lain.
- **Dampak:** credential dan data bisnis bocor. **Severity tinggi; kemungkinan belum dinilai** karena distribusi backup tidak diketahui.
- **Mitigasi:** sanitasi sebelum berbagi, backup terenkripsi, akses minimum, keluarkan credential dari artefak source, dan evaluasi rotasi/pencabutan credential yang pernah tersebar.

## 4. Observasi tambahan dan batas kesimpulan

### Command injection

Tidak ditemukan endpoint HTTP yang menerima perintah shell arbitrer pada dashboard/situs yang dibaca penuh. Pemanggilan `execFile` memakai executable tetap dan array argumen. Bash untuk update memakai parameter posisi, bukan input form sebagai program shell.

`kit-kantor-ai/alat/password-dashboard.mjs:27` dan `kit-kantor-ai/update.sh:98` memasukkan path K ke command tmux dengan kutip tunggal. Path dengan apostrof dapat merusak quoting; namun K berasal dari environment/admin, bukan field HTTP. Ini masalah robustness pada konfigurasi tepercaya, bukan RCE Internet terbukti.

### Path website

`kit-kantor-ai/dashboard/situs.mjs:32–50` memakai realpath containment. Direktori symlink yang tetap mengarah ke dalam root dapat lolos, meskipun komentar menyebut semua symlink internal ditolak. File yang akhirnya mengarah ke luar root ditolak. Root `web/live` memang symlink yang dikelola helper. Jangan menyamakan desain ini dengan traversal URL tanpa kontrol.

### SSRF dan URL eksternal

Tidak ditemukan URL bebas dari form HTTP yang langsung dipakai untuk request internal. `kit-kantor-ai/alat/web.mjs:143–146` menggunakan host konfigurasi; `repliz-inti.mjs:244–253` memakai alamat kantor konfigurasi. Penyalahgunaan membutuhkan penguasaan konfigurasi.

Environment `REPLIZ_API` pada `repliz-inti.mjs:18` tidak diwajibkan HTTPS. Admin yang mengarahkannya ke HTTP/host lain akan mengirim Basic Auth ke alamat tersebut. KAEL perlu membatasi origin service, HTTPS, dan target jaringan privat bila fiturnya menerima URL.

### HTML dan XSS

Teks task di-escape sebelum Markdown sederhana; hasil pencarian memakai textContent; inline JSON mengganti karakter kurang-dari. Ini perlindungan nyata.

Helper tautan `kit-kantor-ai/dashboard/server.mjs:501` memasukkan href mentah dari konfigurasi host/domain. Policy melindungi file tersebut (`kit-kantor-ai/pagar/settings.json:110–113`). Risiko membutuhkan penulis konfigurasi atau bypass policy; stored XSS remote belum dibuktikan. Validasi skema URL/hostname dan escape atribut tetap dianjurkan.

### Ketersediaan dan performa

Batas login disimpan dalam Map memori tanpa pembatasan jumlah IP. Entry lama hanya diperiksa ketika IP tersebut dipakai kembali. Verifikasi scrypt sinkron memblokir event loop. Banyak IP atau request dapat membebani proses; kapasitas VPS dan pembatasan Caddy aktif tidak diketahui. Gunakan verifikasi asynchronous, cache dengan TTL/batas ukuran dan anggaran request global.

### Media publik dan preview

Token URL adalah izin akses: robots/noindex bukan autentikasi. Media sosmed memang disediakan kepada Repliz dan pihak yang memiliki URL dalam masa akses. Token preview website dibuat 96 bit pada `kit-kantor-ai/alat/web.mjs:32–33`; `kit-kantor-ai/dashboard/situs.mjs:79–83` tidak menunjukkan kedaluwarsa atau rotasi otomatis.

### Permission, tenant dan dependensi

Mode 0600/0700 pada source menjelaskan pembuatan file, bukan membuktikan izin filesystem Linux setelah backup diekstrak Windows. Mode writeFile tidak memperketat file lama secara otomatis.

Dashboard menggunakan satu workspace/owner, tanpa tenant ID atau RBAC. Ini dapat sesuai satu pelanggan per VPS, tetapi tidak boleh langsung dipakai untuk banyak pelanggan dalam instance sama.

Tidak ada klaim dependensi rentan berdasarkan nomor versi saja. Pemeriksaan advisory, SBOM dan patch level perlu tahap terpisah; audit ini tidak melakukan request npm/vendor.

## 5. Rencana uji terisolasi—belum dijalankan

Pengujian dinamis hanya setelah izin, menggunakan workspace sementara, data dummy, user nonroot/container, listener loopback dan layanan vendor yang dimock atau diblokir. Jangan memuat credential backup atau menjalankan installer root pada mesin pengguna.

1. **Auth dan CSRF:** periksa seluruh route pada dokumen02 tanpa sesi, token invalid, asal kosong/berbeda, logout GET dan header proxy palsu.
2. **Batas izin AI:** file secret dummy di luar workspace; uji alat native, shell dan semua helper yang diizinkan dengan mode CLI yang sama. Pastikan isolasi OS menolak akses yang tidak diperlukan.
3. **Path kanonik:** media link internal/eksternal, traversal terenkode, dot/backslash/NUL. Sistem harus menolak akses secara aman.
4. **Concurrency:** dua approval bersamaan dengan Repliz mock harus membuat satu job; dua revisi task harus menghasilkan conflict, bukan perubahan hilang.
5. **Schema dan error:** JSON dengan tipe salah, record terlalu besar, file hilang atau disk read-only tidak boleh menghentikan seluruh service.
6. **Integritas update:** hash/signature salah, tautan kedaluwarsa, versi rollback dan entry arsip berbahaya; hentikan proses pada tiap fase dan verifikasi state lama atau pemulihan utuh.
7. **Privasi:** log/error/transcript tidak memuat key, sesi atau password; backup laporan disanitasi; restore memakai data dummy.
8. **Drive:** file yang pindah keluar scope setelah pernah dikenal harus ditolak. Error hook juga harus menolak akses.

Rencana ini bukan bukti test passed atau exploit. Kode KAEL tidak diubah oleh audit ini.

## 6. Cakupan dan prioritas

Semua route dashboard pada baris 918–1154 dan situs pada baris 67–92 ditelusuri penuh bersama helper Repliz, web, Drive dan password. Frontend JS/CSS dibaca penuh; aset biner hanya diinventarisasi. Hash source kit dan salinan kantor identik untuk file utama audit. Potongan installer/update dikonfirmasi dengan audit installer; pembacaan penuhnya dicatat di dokumen03/04. Credential dan data pelanggan tidak dibuka.

**Sebelum KAEL dijual:** utamakan isolasi worker/secret, password kuat dan autentikasi ulang, transaksi/idempotensi, CSRF seragam, schema dan realpath. Berikutnya manifest release bertanda tangan, ekstraksi aman, rollback, coexistence installer dan backup/restore teruji. MFA/RBAC, budget per model dan hardening service mengikuti model pelanggan.

Backend lisensi/pembayaran, penyimpanan paket, firewall aktif, cron/systemd hasil instalasi, mode CLI efektif, patch dependensi dan keaktifan credential **BELUM DAPAT DIPASTIKAN**. Laporan ini tidak menyatakan produk aman untuk produksi tanpa pengujian terisolasi dan review deployment.
