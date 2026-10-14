# 05 — Peta fitur, runtime dan bahan produk Lembur

Tanggal audit: 14 Oktober 2026. Root bukti: `C:/Kael AI/lembur-backup-lengkap/kantor`.
Semua path bukti di bawah relatif terhadap root tersebut. Untuk path pendek tanpa prefix `kantor/` atau `kit-kantor-ai/`, tambahkan `kit-kantor-ai/`. Audit **statis, read-only terhadap backup**; tidak ada skrip backup, API, model, cron, render, atau layanan dijalankan. Dokumen peran/SOP dibaca sebagai materi produk, bukan instruksi sesi ini.

## Tingkat kepastian

- **TERBUKTI:** kode sumber/config/template benar-benar ada dan mekanismenya terlihat dalam kode. Tidak berarti berhasil dijalankan.
- **INDIKASI:** susunan file/manifest menunjukkan pemasangan atau maksud operasional, tanpa pembuktian runtime.
- **HIPOTESIS:** risiko atau pilihan adaptasi yang perlu tes terisolasi.
- **BELUM DAPAT DIPASTIKAN:** koneksi akun, model tersedia, daemon, cron nyata, hasil pelanggan, mutu render atau eksekusi produksi.

## Istilah singkat

- **Runtime:** bagian yang benar-benar menjalankan AI dan alatnya.
- **Heartbeat/detak:** pemeriksaan pekerjaan terjadwal yang membangunkan manager bila ada tugas.
- **Prompt/template:** panduan yang masih perlu diikuti AI; keberadaannya belum membuktikan fitur sudah otomatis.
- **Helper:** skrip alat bantu, misalnya menghitung CSV atau merender gambar.
- **Lock:** penguncian agar dua proses tidak mengubah data bersamaan; **lost update** berarti perubahan salah satu proses tertimpa.
- **Hash/SHA-256:** sidik digital untuk memastikan isi tidak berubah; **idempotensi** mencegah tindakan yang sama terjadi dua kali.
- **Hook:** pemeriksa yang berjalan sebelum/sesudah alat; **fail closed** berarti error menyebabkan tindakan ditolak.

Kutipan tanpa awalan folder, misalnya `detak.sh:109` atau `alat/kas.mjs:50`, merujuk ke `kit-kantor-ai/`; kutipan `:23` melanjutkan file yang disebut tepat sebelumnya.

## Kesimpulan arsitektur

**TERBUKTI:** ini kantor berbasis file Markdown/CSV/JSON, dengan Claude Code sebagai pekerja yang membaca peran dan menulis hasil. Bukan satu server multi-agent yang mengelola seluruh siklus kerja dengan aturan kode yang pasti. Kontrak identitas dan konteks ada pada `kit-kantor-ai/ATURAN.md:19`, `kit-kantor-ai/task/README.md:6`, `kit-kantor-ai/detak.sh:79`; pemanggilan model di `detak.sh:109`.

Rantai utama:

```text
owner / task / kotak masuk
  → pemeriksaan jadwal + data bisnis + kuota + ada pekerjaan
  → lock per manager
  → susun role, 15 baris memori, task, SOP dan fakta brand
  → fresh Claude CLI -p (Sonnet default, 15 turns, 20 menit)
  → file task/hasil/catatan berubah melalui alat model
  → dashboard membaca file; ntfy memberi kabar
```

**TERBUKTI:** memori lintas sesi adalah file `catatan/<nama>.md`, bukan database percakapan per agent; heartbeat menyisipkan 15 baris terakhir. Tiap pemanggilan memakai `claude -p`, tidak ada `--resume` di jalur detak. Bukti `kit-kantor-ai/ATURAN.md:34`, `kit-kantor-ai/detak.sh:81`, `detak.sh:109`.

**TERBUKTI:** versi aktif memakai Sari, Bima, Builder; aturan menyebut bisnis Kael Ai. Bukti `kantor/CLAUDE.md:3`, `kantor/peran/PERAN-sari.md:1`, `kantor/peran/PERAN-bima.md:1`. Ini berbeda dari roster Kael AI sekarang dan tidak boleh diimpor dengan menimpa tim.

**TERBUKTI melalui perbandingan SHA-256:** `kantor/detak.sh`, `kantor/notif.sh`, seluruh 14 `kantor/alat/*.mjs`, empat SOP aktif, tiga kode sumber/contoh carousel aktif, enam skill aktif dan `kantor/.claude/settings.json` identik dengan padanan kit. Peran aktif dan CLAUDE.md berisi personalisasi; PERAN-builder berbeda dari template kit. Rincian cakupan ada di `coverage-runtime.json`.

## Peta fitur input → hasil → dependensi → status

Cara membaca tabel: **kode sumber** berarti fungsi pemrosesannya tersedia dalam skrip; **prompt/template/SOP** berarti panduan tersedia tetapi masih harus dijalankan atau diikuti AI. Seluruh fungsi dalam tabel **belum diuji berjalan** pada audit ini. Kehadiran file, paket atau konfigurasi tidak membuktikan koneksi layanan berhasil.

| Fitur | Input, keluaran dan data tersimpan | Dependensi dan status bukti | Relevansi bagi Kael AI |
|---|---|---|---|
| Identitas manager | `jadi <nama>` → baca PERAN-nama.md; konteks brief/fakta, hasil/file memori | **TERBUKTI sebagai panduan tertulis**: `kit-kantor-ai/ATURAN.md:21`, `peran/PERAN-kosong.md:5`; tidak ada pengarah perintah aplikasi di file itu | Ambil konsep role + lingkup divisi; jadikan konteks terstruktur per agent, bukan hanya ganti persona chat |
| Builder wawancara | Maks 6 pertanyaan → draft peran, SOP, kotak masuk, organisasi, task pertama | **TERBUKTI template** `kit-kantor-ai/peran/PERAN-builder.md:9`, `:23`; belum alur percakapan yang dikendalikan kode | Cocok untuk /builder Kael; validasi proposal/revisi tetap milik penghubung konfigurasi Kael |
| Task dan keputusan | Front matter kode/divisi/pegang/status/update, Tujuan/Udah/Keputusan/Berikutnya; Jawaban owner dikonsumsi detak | **TERBUKTI kontrak** `task/README.md:6`, `:48`; konsumsi jawaban **prompt** `DETAK-PROMPT.md:6` | Bisa menjadi adapter migrasi; tidak menggantikan task/result/version/decision Kael |
| Antrean/batas pekerjaan | antre/jalan/nunggu-kamu/parkir/beres; maksimal 5 tugas berjalan | **TERBUKTI panduan + skrip pemeriksa** `task/README.md:31`, `cek/cek-5.sh:14`; bukan transaksi scheduler | Tambahkan batas yang diperiksa server saat mengadaptasi, jangan hanya checker pasca-fakta |
| Koordinasi divisi | File titipan tujuan → manager buat/lanjut task → helper memindahkan ke selesai, dengan nama unik | **TERBUKTI kode sumber** `alat/selesai-titipan.mjs:14`; alur balasan/anti-bypass berupa panduan tertulis `kotak-masuk/README.md:24` | Inbox terstruktur lebih mudah dilacak daripada owner menjadi kurir |
| Heartbeat manager | Cron → 1 langkah kerja → task/log/memori; jadwal pagi/malam | **TERBUKTI kode sumber** `detak.sh:24`, `:50`, `:109`; cron aktif **BELUM DAPAT DIPASTIKAN** | Layak diadaptasi sebagai penjadwal dengan penguncian atau hak kerja sementara, bukan disalin Bash ke Windows |
| Notifikasi HP | Judul + teks → ntfy HTTPS; TSV antrian jam senyap → rangkuman maksimal 6 baris | **TERBUKTI kode sumber** `notif.sh:10`, `:15`, `:25`; delivery **BELUM DAPAT DIPASTIKAN** | Adopsi jam senyap dan rangkuman; gunakan model notifikasi Kael dan pesan tanpa isi data pribadi |
| Laporan berkala | Task/status/log → laporan tanggal-pagi/malam, keputusan di paling atas | **TERBUKTI template + trigger** `LAPORAN-template.md:7`, `detak.sh:60`; model yang menulis, bukan laporan deterministik | Dashboard Kael bisa membuat ringkasan data aktual, narasi opsional |
| Ide konten | Brief/fakta, 5 konten terakhir, performa → 10 ide → owner memilih 3 | **TERBUKTI SOP** `sop/ide-konten.md:6`, `:13`; output belum diperiksa | Berguna sebagai SOP divisi konten; berbeda dari recap chapter KaelaCH |
| Penulis/pemeriksa | Brief → 5 ide/naskah 5–7 slide → laporan QC → Sari | **TERBUKTI template subagent** `studi-kasus/sosmed/PERAN-penulis.md:1`, `PERAN-pemeriksa.md:1`; dua file aktif ada dengan brand Kael Ai | Ambil pemisahan penulis/QC; perlu runner yang benar-benar memanggil mereka |
| Carousel | JSON brand + slide → template HTML → PNG 1080×1350 per slide | **TERBUKTI kode sumber** `studi-kasus/sosmed/carousel/render.mjs:11`, `:16`; Playwright/Chromium diperlukan; runtime belum diuji | Alat keluaran yang dapat dipakai ulang untuk konten gambar, bukan engine video/manhwa |
| Draft CS | Chat disamarkan + fakta → draft ≤3 kalimat; komplain/ketidakpastian ke owner | **TERBUKTI SOP/skill** `sop/draf-balesan.md:11`, `skill/balas-pelanggan.md:15`; tidak ada API WA/email pengirim di fitur ini | Bagus untuk keputusan yang menunggu owner dan batas janji; jangan menyebut chatbot live |
| Rekap pesanan/stok | CSV/XLSX/teks → agregasi, terlaris/pending/stok menipis → file laporan | **TERBUKTI SOP + helper** `sop/rekap-pesanan.md:13`, `sop/rekap-stok.md:10`, `alat/hitung-csv.mjs:71` | Nilai alat perhitungan berbasis kode untuk data Laxholm; sumber fakta harus tetap n8n/Sheets |
| Laporan iklan | Ekspor CSV/XLSX → CTR/biaya/ROAS/usulan → owner mengatur budget | **TERBUKTI SOP/skill**, bukan konektor akun ads: `sop/laporan-iklan.md:7`, `skill/laporan-iklan.md:17` | Cocok sebagai workflow baru terpisah; tidak mengotomatisasi perubahan budget |
| Listing produk | Foto+fakta → listing CSV → pemeriksa judul/deskripsi/duplikat/perkiraan harga | **TERBUKTI kode sumber** `alat/cek-listing.mjs:31`, `:48`; kualitas faktual checker terbatas | Pemeriksaan kualitas aset untuk Laxholm, bukan master database produk |
| Buku kas | Nota/mutasi/catatan owner → kas.csv → rekap pemasukan/pengeluaran/laba kas | **TERBUKTI kode sumber** `alat/kas.mjs:93`, `:110`, `:176`; pembacaan nota oleh model bukan implementasi OCR tersendiri | Modul opsional; jangan campur uang kas dengan laba akuntansi/pajak |
| Penawaran/invoice PDF | JSON item + profil → nominal/nomor → PDF A4, PNG, arsip JSON, daftar CSV | **TERBUKTI kode sumber** `studi-kasus/tagihan/render.mjs:39`, `:75`, `:114`, `:123`; revisi hanya selama draft, tidak mengirim | Pelajaran: aritmetika deterministik + draft + preview + gate; batas validasi/perhitungan masih perlu diperbaiki |
| Piutang/status invoice | nomor/status/lunas → daftar CSV → daftar telat, rekap | **TERBUKTI kode sumber** `alat/tagihan.mjs:48`, `:59`; status lunas dari owner hanya panduan tertulis, bukan token approval | Pertahankan identitas pemberi persetujuan di server Kael bila diadaptasi |
| Website bisnis | Brief/fakta+aset → situs statis pratinjau → QA → version/live symlink, rollback 5 versi | **TERBUKTI kode sumber** `alat/web.mjs:50`, `:124`, `:135`; pemicu owner bergantung pagar dan server | Ambil pola draft → versi → publikasi; bukan framework frontend Kael |
| Pemeriksaan tampilan web | Pratinjau → screenshot 390/1440, laporan overflow/error/gambar/teks/target sentuh → web/foto | **TERBUKTI kode sumber** `studi-kasus/web/foto.mjs:20`, `:33`, `:43`; penilaian visual melalui prompt | Boleh jadi pipeline QA terisolasi; tidak membuktikan UI Kael pernah diperiksa |
| Arah desain/font | Query → Python UI/UX search; CSS Google Fonts → woff2 + font.css lokal | **TERBUKTI kode sumber** `alat/gaya.mjs:19`, `alat/font.mjs:19`; plugin desain eksternal dibutuhkan | Sudah ada skill Kael sejenis; jangan instal duplikat |
| Google Drive | Folder pilihan → konektor Claude → baca folder terbatas; create/copy ke Hasil; cache metadata file | **TERBUKTI hook** `alat/satpam-drive.mjs:73`; koneksi akun nyata belum dipastikan | Ambil adapter pengetahuan terbatas; bukan konektor Obsidian Nate |
| Publikasi Repliz | Plan JSON + akun + media + WIB → approval SHA-256 → POST penjadwalan → polling status → performa JSON/MD | **TERBUKTI kode sumber** `alat/repliz-inti.mjs:129`, `:233`, `:276`, `:334`; ketersediaan remote/harga paket belum diverifikasi | Calon adapter publikasi KaelaCH setelah approval Founder; jangan langsung hubungkan akun ke produksi |
| Reset password | Frasa acak → salt/hash scrypt + sesi kosong; restart tmux; password dicetak sekali | **TERBUKTI kode sumber** `alat/password-dashboard.mjs:17`, `:22`, `:25` | UX pemulihan saja; akses admin harus mensyaratkan kewenangan owner |
| Pencatatan pemakaian | Stream model usage → log input/cache/output, kuota 5 jam/minggu; BIAYA mingguan manual | **TERBUKTI skema log** `detak.sh:115`, `BIAYA.md:13`; belum ada buku biaya tagihan otomatis | Budget runtime penting; jangan pakai harga/template lama sebagai biaya aktual |
| OpenCode/DeepSeek | config model OpenCode + wrapper cron → PROMPT generik → log/rem/notifikasi | **TERBUKTI kode sumber bonus** `bonus/jalur-hemat/opencode.json:3`, `detak-opencode.sh:34`; instalasi aktif belum dipastikan | Multi-provider perlu adapter dengan kontrak setara, bukan memilih Bash berbeda saja |
| Telegram | /nunggu,/laporan,/ide, jawaban T-xx → file task | **TERBUKTI prompt pembuatan saja** `bonus/jalur-hemat/prompt-bot-telegram.md:29`; tidak ada bot/ aktif atau implementasi bot di kit dalam lingkup ini | Tidak memenuhi chat@buyuli atau manager AI live; harus dibangun |
| Pemeriksaan kesehatan | cek 1–12/pasang → indikator file/config/proses/log | **TERBUKTI skrip pemeriksa**, bukan bukti lulus: `cek/cek-pasang.sh:14`, `cek/cek-9.sh:5` | Pakai pemeriksaan kesiapan aman dijalankan berulang tanpa membocorkan secrets; tidak cukup audit keamanan |

## Runtime native: pengaman yang ada dan batasnya

Bukti terpusat `kit-kantor-ai/detak.sh`:

1. Jam kerja: baris 24–27 mendukung rentang menyeberang tengah malam.
2. Menunggu data bisnis: baris 31–37 memblokir manager selain Builder jika `task/T-*-data-bisnis.md` belum beres/parkir.
3. Cooldown batas pemakaian: baris 40–47 rem 1 jam dan quota terakhir diketahui sampai reset. Nilai default:5 jam 60%, minggu 70% (baris 15–16).
4. Pemeriksaan awal tanpa model: baris 50–63 memeriksa task jalan/jawaban owner/inbox/jadwal laporan.
5. Batas putaran: baris 66–74 default 30/hari/per nama; hitungan ini jumlah invocation, bukan batas biaya.
6. Anti tumpuk: baris 71–72 memakai `flock -n` per manager.
7. Penyusunan konteks: baris 78–95 memotong role 4 KB, task 6 KB, SOP 5 KB, titipan 3 KB, brief/fakta 3 KB masing-masing. Tidak ada budget total global; jumlah task/inbox bisa membesar.
8. Claude: baris 104–111 optional settings; MCP strict jika Drive belum ada; tools Read/Write/Edit/Bash/Glob/Grep, opsional ToolSearch. Model default Sonnet, timeout 20 menit, maksimal 15 giliran.
9. Usage: baris 115–135 parsing result+event rate limit, shared `catatan/.jatah`, rem jika rejected/teks limit. Exit akhir selalu 0 (baris 137), sehingga kode keluar tidak menggambarkan keberhasilan pekerjaan.
10. Tidak ada loop retry pekerjaan di wrapper. Cron berikut adalah kesempatan baru; ketepatan checkpoint bergantung model dan file task.

**HIPOTESIS risiko concurrency:** pembacaan hitungan harian terjadi sebelum flock (baris 67 vs 71), dan flock per nama tidak melindungi `.jatah`, kas.csv, tagihan/daftar.csv, bank ide, atau task yang disentuh manager lain. Penulisan ke file sementara lalu rename melindungi file parsial, bukan lost update antar penulis. Uji isolasi diperlukan.

**TERBUKTI batas klaim delegasi:** peran Sari menyebut penulis/pemeriksa aktif, tetapi tools detak eksplisit pada baris 107 tidak mencantumkan Agent/Task/Skill. Kemampuan subagent di heartbeat **BELUM DAPAT DIPASTIKAN**, meskipun template agent dipasang. Jangan menyebut dua agent benar-benar berkomunikasi saat detak tanpa trace/test.

**TERBUKTI laporan tidak dipisahkan per manager pada path:** baris 61 memakai `hasil/laporan-$HARI-$jenis.md`, tanpa nama/divisi. Manager pertama menulis dapat membuat manager lain melewati laporan. Klaim “tiap manager laporan” dalam DETAK.md:37 lebih luas dari gate nama file.

**INDIKASI, bukan bukti kesehatan:** checker `cek/cek-9.sh:9` menghitung baris `==`, bukan keberhasilan hasil model; `cek/cek-6.sh:8` hanya mencari beberapa izin kunci, bukan uji bypass.

## Jalur DeepSeek tidak setara jalur Claude

`bonus/jalur-hemat/README.md:25` menyebut pengaman sama. Kode sumber `detak-opencode.sh:16` sampai 43 hanya punya jam mulai, rem 1 jam, batas 30, flock, timeout 20 menit, notifikasi saldo/rate. **TERBUKTI tidak ada** pemeriksaan idle, gate data bisnis, kuota owner bersama, JAM_TIDUR, jendela laporan, penyusunan konteks, batas giliran, parsing token terstruktur pada wrapper tersebut.

Model `deepseek/deepseek-v4-flash` hanya string config (`opencode.json:3`); ketersediaan provider/model, kualitas, dan estimasi harga di README **BELUM DAPAT DIPASTIKAN**. Tanpa jaringan aktual, audit tidak mengonfirmasi nama model pasar.

**Telegram belum berupa bot siap pakai.** File bonus hanya berisi prompt untuk meminta AI membuat bot. Bot yang direncanakan hanya membaca/menulis file task, bukan percakapan AI manager. Aturan dalam prompt `:32` yang menganggap chat pertama sebagai owner berisiko diklaim orang lain saat pemasangan. Adaptasi perlu menetapkan owner ID terlebih dahulu atau memakai kode pemasangan sekali pakai.

## Approval: pembatas kode dibanding panduan prompt

| Aksi | Enforcement terlihat | Batas |
|---|---|---|
| Batas 5 task dan penggunaan jawaban owner | Prose + pemeriksa pasca-fakta | Bukan engine workflow transaksional; model yang mengubah status |
| Penulis → pemeriksa → Sari | Template agent + prompt | Tidak ada pipeline orchestrator pada wrapper detak |
| Harga sesuai fakta / jangan salin PII | Prompt/skill | Pemeriksa listing hanya mencari angka 3 digit atau lebih di fakta, bukan validasi pasangan produk-harga |
| Invoice/pencatatan lunas/refund | Prompt owner; alat memvalidasi status | kas/tagihan tidak meminta token approval per mutasi; `pagar/settings.json:42`–45 mengizinkan alat |
| Revisi invoice setelah terkirim | Kode menolak status bukan draft | `studi-kasus/tagihan/render.mjs:75`–78; register CSV sendiri membutuhkan integritas |
| Publikasi web | Allowlist model hanya status/ukur/cek/siapin; gate kualitas publikasi di kode | `pagar/settings.json:46`–49, `alat/web.mjs:124`; fungsi CLI terbitkan tidak memverifikasi identitas owner sendiri |
| Publikasi Repliz | Plan + media SHA-256, file approval terlindungi, konten berubah ditolak, pemeriksaan status ganda | `repliz-inti.mjs:160`, `:238`, `:241`; autentikasi route server dan locking harus diaudit tersendiri |
| Drive hapus/share | Hook dengan deny eksplisit | `satpam-drive.mjs:100`–102; mengandalkan hook terpasang dan prefix nama tool |
| Drive create/copy | Hook lingkup dikenal+zona tulis Hasil | `satpam-drive.mjs:85`–94; cache ID dikenal bukan pemeriksaan ancestry live |
| Reset password | Helper yang diizinkan menyimpan hash, sesi baru | Niat owner hanya prompt; perlu gate administratif |

**TERBUKTI:** config pagar menolak Write/Edit skrip helper, cron/detak, .drive, buku kas, register tagihan, web live, status Repliz. Namun itu **pola izin Claude**, bukan sandbox OS berbasis role. `pagar/settings.json:4`–6 mengizinkan Read/Edit/Write umum dan helper dengan argumen luas. Keamanan sesuai pola dan efektivitas versi Claude harus diuji secara terisolasi; jangan klaim pagar anti bypass sempurna.

## Integrasi dan penyimpanan

**Google Drive:** `drive-folder.mjs:57`–62 menulis folder utama + dikenal dan mengubah setting Claude global `disableClaudeAiConnectors=false`. Tidak menyimpan OAuth sendiri. Hook pre default deny/error fail closed (`satpam-drive.mjs:31`, `:74`, `:102`), post mencatat file dikenal dan metadata (`:105`). Pencarian wajib parentId terbatas + kurung seimbang (`:61`); daftar file global terbaru ditolak. Cache ID belum diverifikasi parent live setiap read, dan pembaruan cache post tidak memakai lock.

**Repliz:** Basic Auth dibuat dari file secret oleh helper (`repliz-inti.mjs:66`), request timeout 60 detik. Sumber plan JSON, SHA approval terlindungi, status JSON, akun/performa JSON/MD disimpan lokal (`:33`). Media disajikan VPS lewat acak 18 byte token, SHA isi dicek ulang, kedaluwarsa 3 hari setelah selesai (`:195`, `:245`). Tidak mengunggah media ke storage Repliz; VPS harus tersedia saat fetch. Status error tidak retry otomatis karena kemungkinan remote sudah publish (`:274`). Statistik dibaca dari akun/content, normalisasi angka tersedia saja (`:317`).
Klaim paket Standard/Premium/Gold berasal komentar/cabang penanganan error, **bukan verifikasi harga atau paket layanan terkini**.

**Filesystem:** penulisan kas memakai temp+rename (`alat/kas.mjs:50`); status tagihan juga (`alat/tagihan.mjs:32`); register invoice ditulis langsung saat render (`studi-kasus/tagihan/render.mjs:127`). Tidak ada SQLite atau server database dalam fitur yang diaudit. Lock per manager tidak melindungi ledger bersama.

## Temuan risiko statis untuk konsolidasi keamanan

1. **Batas argumen helper (TERBUKTI celah implementasi):** XLSX `--ke` menulis path argumen tanpa pemeriksaan lingkup atau realpath (`alat/xlsx-ke-csv.mjs:83`), CSV membaca input path bebas (`alat/hitung-csv.mjs:20`), carousel menerima folder output bebas (`render.mjs:14`). Izin menjalankan helper tidak mengurung filesystem sendiri. **HIPOTESIS dampak** bergantung izin CLI aktual; uji dengan workspace palsu, bukan secret asli.
2. **Template HTML dapat diedit + jaringan browser (TERBUKTI):** carousel membaca template dan memakai setContent (`render.mjs:12`, `:25`), template kit memakai Google Fonts remote (`template.html:6`), pagar menolak edit render tetapi tidak template (`pagar/settings.json:92`). HTML dapat memuat JavaScript/network. Eksfiltrasi aktual melalui jalur ini **belum diuji**; kode sumber backup tidak dieksekusi.
3. **Rotasi password bergantung prompt (TERBUKTI):** allow baris 41 dan helper baris 22/30 dapat mengeluarkan owner dari sesi dan mencetak password ke output tool; syarat permintaan owner hanya dalam peran. tmux baris 27 menyusun command string dari K, sehingga path yang tidak dipercaya perlu peninjauan shell escaping.
4. **Race/idempotensi Repliz (HIPOTESIS):** guard membaca status baris 239, menulis status 248 dan POST 258 tanpa lock; dua request bersamaan dapat lolos. Retry setelah status mengunggah lebih dari15 menit (240) dapat menggandakan posting jika remote berhasil tetapi state lokal gagal disimpan. Approval terikat konten kuat, tetapi bukan idempotency key remote.
5. **Symlink path Repliz (TERBUKTI celah):** periksa baris 139 memakai prefix leksikal; stat mengikuti link. mediaPublik baris 209–211 sama. Pemeriksaan realpath containment belum ada.
6. **Ledger lost update (HIPOTESIS):** kas/tagihan memakai read-modify-write tanpa lock bersama; ID dari max+1 dapat bertabrakan paralel. PDF, arsip dan CSV bukan satu transaksi.
7. **Kualitas angka/tanggal (TERBUKTI):** kas memeriksa hari 1–31 dan bulan 1–12 saja (`:86`), sehingga 30 Februari lolos. CSV melewati angka invalid dalam jumlah tetapi denominator rata-rata tetap semua baris (`hitung-csv.mjs:88`, `:98`). Pajak invoice tidak memiliki validasi finite/range eksplisit (`render.mjs:47`); XLSX tidak memiliki batas ukuran dekompresi ZIP (`xlsx-ke-csv.mjs:18`–32). Perlu uji edge case sebelum pemakaian keuangan.
8. **Concurrency antrean notif (HIPOTESIS):** append dan flush-truncate tanpa lock (`notif.sh:21`, `:29`) dapat kehilangan append bersamaan. Curl tanpa timeout di baris 12. Topik ntfy acak bertindak sebagai secret, bukan autentikasi penerima.
9. **Injeksi konteks (HIPOTESIS):** inbox, data brand dan task disisipkan ke prompt (`detak.sh:82`–94); tidak terlihat pemisahan tegas data dari instruksi. File berbahaya dapat memengaruhi model; aturan kepercayaan data perlu berlaku lintas provider.
10. **Lingkup Drive bukan sandbox OS (TERBUKTI batas):** connector akun Claude luas; satpam memakai cache keanggotaan dan prefix nama tool khusus. Layanan lain tidak dicakup (`PAGAR.md:45`).
11. **Larangan kirim keluar memiliki pengecualian:** notif dan pengunduhan font diizinkan otomatis (`pagar/settings.json:17`, `:53`); penulisan ke Hasil Drive diizinkan hook. UX perlu menyatakan pengecualian dengan jelas.
12. **Log/exit:** raw JSONL dan log result dapat berisi data bisnis (`detak.sh:103`, `:118`), meskipun komentar melarang pencetakan secret. Wrapper tidak mengontrol retention/redaction dan selalu exit0 (`:137`), sehingga kegagalan tugas tidak terwakili exit code.

Tidak ada credentials/session/history diakses untuk temuan ini; path secret disebut sebagai kontrak kode sumber saja.

## Rencana uji aman — belum dijalankan

| Area | Uji terisolasi tanpa production/secrets | Kriteria |
|---|---|---|
| Scheduler | Jam palsu, Claude palsu di PATH, task sintetis; tanpa cron aktual | Tidak ada kerja → 0 pemanggilan; jam lintas tengah malam; batas harian; timeout; kuota malformed/unknown; konkurensi manager |
| Task/approval | Fixture jawaban owner, jawaban palsu, klaim duplikat; model mock | Approval membutuhkan identitas owner; versi baru membatalkan keputusan lama; jawaban dikonsumsi sekali |
| Inbox | Tree sementara, nama duplikat, symlink, traversal | Tujuan tetap dalam inbox; tidak menimpa |
| CSV/kas/XLSX | Kutip/newline/debit sintetis, tanggal invalid, ZIP besar, penulis paralel | Total konsisten, data invalid terlihat, tidak ada lost update |
| Carousel/invoice | Chromium tanpa jaringan, font palsu, teks sintetis, output root terbatas | Dimensi benar; overflow dilaporkan; JS/network diblokir; matematika PDF dan halaman panjang benar |
| Drive | JSON hook mock dan cache lokal palsu; tanpa connector | Folder eksternal/OR query/hapus/share ditolak; error fail closed; cache dapat dibatalkan |
| Repliz | Stub minta dan HEAD, media/approval sintetis | SHA berubah ditolak; submit ganda terkunci; status parsial jelas; remote ambigu direkonsiliasi manual; symlink ditolak |
| Notifikasi | Stub curl tanpa delivery HTTP | Antrean bertahan sampai sukses, flush tidak kehilangan pesan, secret disensor |
| Password | Workspace palsu, tanpa tmux aktual, input admin owner eksplisit | Tidak ada rotasi otomatis; sesi dibatalkan dengan benar; secret tidak masuk log |
| Biaya | Fixture stream JSON dengan rate event/result hilang | Status tidak diketahui tidak dianggap nol; sumber/versi biaya jelas |
| Telegram | Bot masa depan dengan owner ID terkonfigurasi dan update mock | Chat pertama tidak dapat mengklaim owner; write hanya task yang diizinkan |

## Rekomendasi adaptasi ke Kael AI — bukan implementasi pada audit ini

1. Pertahankan data utama, persetujuan, versi dan n8n Kael sebagai sumber kebenaran. Import hanya template SOP terpilih setelah mapping; jangan timpa roster dengan Sari/Bima atau config global Claude.
2. Bentuk runner lintas provider dengan konteks per agent, lingkup tools, budget, checkpoint, antrean/hak kerja sementara dan hasil terstruktur. Ambil pola konteks baru + ringkasan memori Lembur, tambahkan penyimpanan status dan jejak eksekusi.
3. Ambil pola **draft → review → preview/approval Founder → publish** dan hash konten. Ikat approval pada versi hasil KaelaCH, pertahankan n8n sebagai pemantauan untuk Date/Mails.
4. Ambil tools deterministik untuk angka, pengetahuan terbatas dan digest jam senyap. Jangan import helper berizin luas tanpa containment path, lock dan tes.
5. Telegram Bu Yuli membutuhkan implementasi bot, autentikasi owner, routing dan query state divisi. Prompt bonus belum memenuhinya. Obsidian Nate juga belum tersedia dari integrasi Drive ini.
6. Utamakan eksekusi AI dan pemantauannya sebelum menu model yang belum dapat dijalankan. Pemilihan model per divisi dalam bonus berupa cron manual, bukan daftar konfigurasi agent/UI.
7. Jangan menjanjikan MP4/TTS dari carousel. Kode sumber ini menghasilkan PNG dan PDF; jalur Remotion Kael berbeda dan perlu dipertahankan.

## Cakupan dan yang tidak dibaca

Dibaca penuh: seluruh 14 helper kit, 13 skill, 13 SOP, 10 peran; detak/notif; DETAK/PROMPT/ATURAN/PAGAR/BIAYA/ORGANISASI; lima materi bonus; template task dan dua contoh; dua template brand; contoh CSV; studi kasus sosmed/carousel/invoice/web; 14 skrip pemeriksa; tiga peran + CLAUDE aktif; dua prompt agent aktif; carousel manifest dan lock.
Salinan aktif identik ditinjau melalui hash yang identik dengan kode sumber kit yang dibaca penuh, ditandai sebagai `reviewed-regex-only` dengan catatan hash pada coverage, bukan klaim membaca ulang.
Tidak dibaca: payload brand/task aktif, data pelanggan, hasil kerja nyata, log catatan, credential/session/auth/history, .rahasia/.ssh/.cache/.npm/node_modules/biner. UI/dashboard/installer/update/keamanan delivery ditangani audit lain; laporan ini tidak mengklaim kode sumber tersebut diperiksa penuh.


