# 00 — Audit Lembur.id dan blueprint KAEL AI

Tanggal: **14 Oktober 2026**. Snapshot kit: **0.18.7**. Sumber: `C:/Kael AI/lembur-backup-lengkap/kantor`. Hasil: `C:/Kael AI/analysis/lembur-audit-2026-10-14`.

Catatan 14 Oktober 2026 (lanjutan): backup dipindah dari folder Downloads ke `C:/Kael AI/lembur-backup-lengkap/kantor`; path di semua laporan sudah disesuaikan. Laporan 01 dan 07–09 kini memakai label kepastian, laporan 03 punya kolom padanan Kael, laporan 07 menilai semua 11 aspek dari prompt, dan keputusan owner dirangkum di [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md).

## Hasil paling penting bagi pemilik

**Lembur yang ditemukan adalah kantor berbasis berkas, Claude Code, cron dan dashboard Node.** Owner/peran menulis tugas Markdown; Claude dipanggil melalui sesi interaktif atau skrip detak; hasil dan catatan disimpan ke disk; dashboard membaca perubahan dan menulis jawaban owner. Sprite kantor mengikuti status berkas. Ini memberi pola organisasi yang praktis, tetapi bukan bukti server multi-agent dengan session/model persisten per karakter.

**KAEL tidak perlu menyalin dashboard atau menulis ulang kantor 3D.** Proyek KAEL sudah punya identitas agent, monitoring n8n, insiden medis, notifikasi, render Remotion dan approval versi. Kekurangan untuk produk self-hosted terutama runtime/konteks per agent yang umum, izin tindakan yang kuat, storage/backup, installer, update aman, autentikasi publik dan dukungan pelanggan.

**Usulan produk:** aplikasi dan data tetap pada VPS pelanggan; pusat KAEL cukup melayani entitlement, aktivasi dan rilis resmi. Akun AI, hosting, domain serta integrasi dibayar/dikendalikan pelanggan. Lisensi perpetual, periode update dan masa dukungan harus dipisahkan, belum diputuskan audit. Ini rekomendasi, bukan implementasi baru atau fakta model bisnis Lembur.

## Peta bukti utama

Root pada tabel ini adalah root backup di atas; semua fakta TERBUKTI berarti terlihat di kode, **bukan sudah berhasil diuji berjalan**.

| Temuan | Status | Bukti | Arti bagi KAEL |
|---|---|---|---|
| Dashboard membaca task/peran/log; jawaban owner ditulis kembali ke task | TERBUKTI | `kit-kantor-ai/dashboard/server.mjs:133–225,846–864,1106–1136` | Pertahankan pemisahan UI dan eksekusi; jangan menjadikan animasi bukti kerja. |
| Detak memanggil Claude CLI baru dengan file konteks, timeout dan lock per manager | TERBUKTI | `kit-kantor-ai/detak.sh:79–111`; model default `:17` | Berguna sebagai pola kerja berkala, tetapi KAEL memerlukan queue/checkpoint/session yang lebih eksplisit. |
| Bootstrap dan update meminta hak unduh dengan kode serta hash mesin | TERBUKTI client; backend BELUM DAPAT DIPASTIKAN | `kit-kantor-ai/installer/pasang-awal.sh:14–64`, `kit-kantor-ai/update.sh` | Pisahkan produk berlisensi dari login owner/AI; bangun backend KAEL sendiri. |
| Setup root dilanjutkan materialisasi sebagai user aplikasi | TERBUKTI | `kit-kantor-ai/mulai.sh:18,46–53,126–190`, `installer/pasang.mjs:246–442` | Installer perlu privilege minimum; user aplikasi tidak perlu sudo rutin. |
| Approval Repliz mengikat rencana/media melalui hash; Drive punya hook scope nyata | TERBUKTI | `kit-kantor-ai/alat/repliz-inti.mjs` simbol `periksa`, `semuaRencana` dan operasi penjadwalan; `kit-kantor-ai/alat/satpam-drive.mjs:73–102` | Adaptasi prinsip hash/scope/idempotency, bukan kode/vendor endpoint. |
| Tidak semua janji dipaksakan program; beberapa batas tugas/review merupakan SOP | TERBUKTI per sumber; efektivitas runtime BELUM DAPAT DIPASTIKAN | `kit-kantor-ai/task/README.md`, `peran/`, `ATURAN.md`, laporan 05 | Approval dan batas biaya harus ditegakkan broker/server, bukan prompt saja. |
| Jalur DeepSeek merupakan bonus; Telegram berupa prompt pembuatan bot | TERBUKTI dalam source yang tersedia | `kit-kantor-ai/bonus/jalur-hemat/`, laporan 05 | Tidak menganggap Telegram manager KAEL sudah tersedia karena ada dokumen referensi. |
| Sebagian besar source aktif sama dengan kit | TERBUKTI SHA-256 | `inventory.json`, laporan 02/05 | Pembacaan file identik tidak perlu diulang; personalisasi tetap dibedakan. |
| Aset memiliki notice MIT/OFL tertentu; lisensi seluruh kit tidak tersedia sebagai izin redistribusi menyeluruh | TERBUKTI notice; hak kit BELUM DAPAT DIPASTIKAN | `kit-kantor-ai/dashboard/aset/LISENSI-*.txt`, laporan 04 | KAEL memakai source/aset/merek sendiri; jangan menganggap seluruh produk MIT. |

## Risiko yang memengaruhi keputusan produk

Audit06 memuat 15 temuan dengan prasyarat, dampak, kemungkinan dan mitigasi. Prioritasnya:

1. **Secret dan identitas owner terlalu dekat dengan kemampuan proses AI.** Native deny path tidak otomatis melindungi dari helper/shell yang berjalan sebagai user Linux sama; password reset juga diizinkan pada policy kit. Efektivitas konfigurasi runtime belum diuji.
2. **Update dan rerun belum transaksi penuh.** Sebagian file dapat berubah sebelum penggantian kit selesai; backup tertentu tidak mencakup semua task/SOP yang dapat ditimpa. Kegagalan dapat menghasilkan campuran versi.
3. **Trust chain distribusi perlu diperkuat.** Hash paket berasal respons server yang sama; tidak terlihat signature independen. Arsip diekstrak tanpa preflight lengkap path/type/link.
4. **Host pelanggan harus dilindungi.** Setup awal dapat menimpa Caddyfile global; root menjalankan beberapa installer jarak jauh; wizard timeout bisa menulis marker selesai meskipun pemasangan belum selesai.
5. **Mutasi dan side effect perlu konsistensi.** Beberapa route memakai kontrol CSRF berbeda; penjadwalan/persistensi file memiliki risiko race; path media memerlukan containment canonical. Ini bukan klaim exploit remote yang telah dibuktikan.
6. **Backup bukan paket publik.** Keberadaan file kredensial Claude, kode aktivasi, SSH dan rahasia aplikasi terkonfirmasi sebagai metadata. Nilainya tidak dibaca/dipakai. Jangan menyalinnya ke KAEL atau membagikan backup mentah; validitas credential tidak diketahui.

Kontrol baik yang ditemukan juga dicatat: loopback, hash password/sesi, cookie acak, CSP, token form pada sebagian aksi, validasi helper, approval hash dan batas detak. Audit tidak menyatakan seluruh produk tidak aman; setiap risiko mempunyai konteks dan pengaman yang sudah ada.

## Apa yang telah diperiksa dan apa yang tetap dibatasi

Inventaris menelusuri **785 entri produk yang terjangkau**, dengan **171 berkas teks/source ber-hash** dan **28 path metadata-only**. Cakupan teks terdiri atas **142 berkas dibaca penuh, 27 salinan hash-identik, dan dua JSON operasional metadata-only**. Ini bukan jumlah seluruh file home: cache, binary, dependensi, transcript, data pelanggan dan arsip lama sengaja dibatasi. Source inti installer, updater, HTTP/dashboard, heartbeat, policy, helpers, SOP dan contoh render ditelusuri melalui reviewer independen; cakupan rinci ada pada laporan 01/11 dan coverage.json. Validasi 95 rujukan baris, 16 tautan lokal dan 171 checksum tidak menemukan kegagalan; checksum source tetap sama dengan inventaris awal.

Tidak ada installer/updater/heartbeat/server backup, request vendor/VPS, model, publikasi, pembayaran, aktivasi, restore atau eksploit yang dijalankan. Pemeriksaan checksum source dan pembuatan laporan memakai skrip audit sendiri, bukan menjalankan kode produk. Source backup dan aplikasi KAEL tidak diubah oleh pekerjaan ini.

Backend lisensi/pembayaran/domain, policy server, status akun, crontab/service Linux dan kualitas runtime tidak dapat dibuktikan dari backup home. Wrapper executable yang ditemukan0B membuat hasil ekstrak Windows bukan salinan siap-jalan tanpa pemeriksaan restore. Lihat laporan 10 untuk ketidakpastian dan bukti tambahan yang diperlukan.

## Urutan keputusan dan pengerjaan KAEL

1. Tetapkan scope pilot, provider pertama dan izin agent/owner.
2. Bangun kontrak runtime/konteks per agent dan queue/checkpoint yang terpersisten.
3. Perkuat login, scope, approval hash dan broker tindakan sebelum app dipublikasikan.
4. Tambahkan migrasi storage serta backup/restore yang diuji pada instalasi baru.
5. Rancang installer dan update bertanda tangan dengan rollback; baru aktifkan backend lisensi dan proses penjualan.
6. Hubungkan Telegram Bu Yuli, Obsidian Nate dan audio KaelaCH melalui kontrak di atas, sesuai prioritas owner.

Tidak ada harga yang ditetapkan. Dukungan, biaya AI/VPS/domain/media, offline grace, slot VPS dan hak update memerlukan keputusan bisnis berdasarkan pengukuran pilot.

## Dokumen hasil

| Dokumen | Isi |
|---|---|
| [01 — Inventaris](01-CODEBASE-INVENTORY.md) | Struktur, entry point, dependensi, cakupan dan pengecualian |
| [02 — Arsitektur](02-ARCHITECTURE.md) | Diagram nyata, route, auth, storage dan alur permintaan |
| [03 — Instalasi](03-INSTALLATION-DEEP-DIVE.md) | Tahapan root/user, wizard, domain, rerun, update dan kegagalan |
| [04 — Lisensi/distribusi](04-LICENSING-AND-DISTRIBUTION.md) | Request client, update, hak penggunaan dan backend yang tidak tersedia |
| [05 — Fitur](05-PRODUCT-FEATURE-MAP.md) | Input/output/data, enforcement versus prompt, runtime, helpers dan integrasi |
| [06 — Keamanan](06-SECURITY-AUDIT.md) | 15 temuan, threat model, kontrol, mitigasi dan rencana uji aman |
| [07 — Blueprint KAEL](07-KAEL-ARCHITECTURE-BLUEPRINT.md) | Tiga model hosting, komponen, DB/API, adapter, queue, secrets, update/restore |
| [08 — Strategi jual lepas](08-SELL-AND-SELF-HOST-STRATEGY.md) | Skema lisensi, biaya dan tanggung jawab vendor/pelanggan |
| [09 — Roadmap](09-IMPLEMENTATION-ROADMAP.md) | P0–P7, dependensi dan acceptance criteria |
| [10 — Unknowns](10-QUESTIONS-AND-UNKNOWNS.md) | Keterbatasan bukti dan keputusan penting owner |
| [11 — Indeks file](11-FILE-REFERENCE-INDEX.md) | Path/baris/coverage untuk memverifikasi temuan |

## Status handoff

Hasil ini cukup untuk memilih arsitektur dan menurunkan backlog implementasi independen. Ini **audit statis source yang tersedia**, bukan sertifikasi keamanan, pembuktian layanan vendor, atau persetujuan untuk menjalankan instalasi. Pengujian dinamis berikutnya, bila dibutuhkan, harus terisolasi, memakai data dummy dan memperoleh izin terlebih dahulu.
