# 01 — Inventaris codebase dan cakupan pembacaan

Tanggal: 14 Oktober 2026. Root sumber: `C:/Kael AI/lembur-backup-lengkap/kantor`. Seluruh operasi pada backup read-only.

Label kepastian: **TERBUKTI** = terlihat langsung di kode/metadata; **INDIKASI** = didukung struktur tetapi belum diuji; **HIPOTESIS** = penalaran yang perlu diuji; **BELUM DAPAT DIPASTIKAN** = butuh server vendor, VPS Linux, atau uji jalan yang tidak dilakukan; **REKOMENDASI** = usulan untuk Kael, bukan fakta tentang Lembur.

## Angka dan batas lingkup

**TERBUKTI** (`inventory.json`): pemindaian menghasilkan **785 entri terjangkau**, terdiri atas 733 file dan 52 direktori. Ada **28 path/direktori metadata-only** yang tidak ditelusuri isinya oleh pemindai. Angka ini **bukan total seluruh isi home**, karena cache, dependensi, sesi, rahasia, data bisnis aktif dan arsip historis dikecualikan. File biner/aset hanya dihitung metadata; **171 berkas teks/source** memiliki checksum dan jumlah baris.

**TERBUKTI:** kit lokal **0.18.7** dari `kit-kantor-ai/VERSI:1`. Runtime `mulai.sh:65–72` menerima Node major ≥ 20 dan menawarkan instalasi kanal 22; **BELUM DAPAT DIPASTIKAN:** kompatibilitas semua versi belum diuji. Basis dashboard memakai modul bawaan Node, tanpa manifest aplikasi utama. Manifest `kantor/carousel/package.json` mendeklarasikan Playwright; lock yang tersedia dianalisis di laporan 05. **INDIKASI:** tidak ada bukti database SQL/Redis pada arsitektur inti yang ditelusuri; penyimpanan utama Markdown/CSV/JSON dan file.

Struktur lengkap pada [inventory-tree.txt](inventory-tree.txt); metadata/hash pada [inventory.json](inventory.json).

~~~text
kantor/                         aplikasi/config saat dicadangkan
  dashboard/ alat/              source aktif (banyak identik kit)
  peran/ skill/ sop/            identitas dan aturan kerja
  task/ hasil/ brand/ catatan/   data aktif — metadata saja
  .claude/ .rahasia/            policy/prompt tertentu diperiksa aman; secrets tidak
kit-kantor-ai/                  paket produk referensi
  installer/ dashboard/ alat/
  peran/ skill/ sop/ task/
  pagar/ cek/ bonus/ studi-kasus/
cadangan-kantor/                arsip lama — tidak diekstrak
.claude/ .ssh/ .local/           akun, sesi, binary — metadata saja
.cache/ .npm/ .config/          cache/browser/dependensi — metadata saja
.kantor-*                      konfigurasi instalasi/aktivasi — nilai tidak dibaca
~~~

## Peta komponen

| Komponen | Lokasi relatif | Fungsi | Dipanggil oleh / analisis | Kepastian |
|---|---|---|---|---|
| Bootstrap lisensi | kit-kantor-ai/installer/pasang-awal.sh | Validasi hak unduh, hash mesin, unduh/hash/ekstraksi, panggil setup | Perintah install pelanggan; laporan 03/04 | TERBUKTI (client); respons server BELUM DAPAT DIPASTIKAN |
| Setup root | kit-kantor-ai/mulai.sh | OS, user, CLI, proxy/HTTPS, login provider dan tmux wizard | Bootstrap; laporan 03 | TERBUKTI |
| Setup manual | kit-kantor-ai/pasang.sh | Struktur folder dan template dasar; berbeda jalur wizard | Owner manual; laporan 03 | TERBUKTI |
| Wizard | kit-kantor-ai/installer/wizard.mjs | HTTP loopback, token/cookie, formulir, status dan selesai | mulai.sh; memanggil pasang.mjs; laporan 03 | TERBUKTI |
| Materialisasi | kit-kantor-ai/installer/pasang.mjs | Peran, aturan, fakta, skill, task, dashboard, cron dan tools | Wizard; laporan 03/05 | TERBUKTI |
| Dashboard | kit-kantor-ai/dashboard/server.mjs | Status file task, login, jawaban owner, helper tools, update | tmux/cron; laporan 02/06 | TERBUKTI |
| Situs | kit-kantor-ai/dashboard/situs.mjs | Preview/public website dan batas filesystem | Proxy + web helper; laporan 02/06 | TERBUKTI |
| UI | kit-kantor-ai/dashboard/aset/app.js | Tampilan task dan polling | Dashboard HTML; laporan 02 | TERBUKTI |
| Kantor visual | kit-kantor-ai/dashboard/aset/kantor.js | Sprite/gambar ruang/graf jalur dan status task | Dashboard HTML; laporan 02 | TERBUKTI |
| Heartbeat | kit-kantor-ai/detak.sh | Jam kerja, task/idle, kuota/cooldown, flock, Claude CLI baru | Cron manager; laporan 05 | TERBUKTI |
| Notifikasi | kit-kantor-ai/notif.sh | Transport notif opsional dari config pelanggan | Heartbeat/manual; laporan 05 | TERBUKTI; transport aktif BELUM DAPAT DIPASTIKAN |
| Policy AI | kit-kantor-ai/pagar/settings.json | Allow/ask/deny tools dan hook Google Drive | Installer + Claude CLI; laporan 05/06 | TERBUKTI (isi); efektivitas BELUM DAPAT DIPASTIKAN |
| Tools bisnis | kit-kantor-ai/alat/ | CSV/XLSX, kas, tagihan, Drive, web, Repliz dan lainnya | CLI/AI/dashboard sesuai alat; laporan 05/06 | TERBUKTI |
| Kontrak kerja | kit-kantor-ai/{peran,skill,sop,task,kotak-masuk}/ | Prompt, SOP, status task dan handoff berkas | AI membaca; bukan semua aturan dipaksakan server; laporan 05 | TERBUKTI (teks); penegakan server sebagian INDIKASI |
| Update | kit-kantor-ai/update.sh | Cek versi/hak, unduh/hash, stage, invoke updater | Dashboard/cron/manual; laporan 03/04 | TERBUKTI (client); respons server BELUM DAPAT DIPASTIKAN |
| Penerapan update | kit-kantor-ai/installer/perbarui.mjs | Pelestarian/konflik konfigurasi dan penggantian file | update.sh; laporan 03/04 | TERBUKTI |
| Diagnosis/check | kit-kantor-ai/{diagnosa.sh,cek/} | Pemeriksaan pemasangan source; tidak dijalankan audit | Owner/installer; laporan 03/05 | TERBUKTI (isi); hasil jalan BELUM DAPAT DIPASTIKAN |
| Bonus alternatif | kit-kantor-ai/bonus/jalur-hemat/ | OpenCode/DeepSeek dan prompt pembuatan bot | Jalur opsional; bukan native runtime; laporan 05 | TERBUKTI |

## Urutan pembacaan

1. Inventaris + VERSI + manifest; bedakan kit dan runtime aktif.
2. pasang-awal → mulai/alamat → wizard → pasang; bedah hak root/user, token dan perubahan host.
3. update → perbarui; trace lisensi/manifest/backup/restart.
4. server/situs → app/kantor/assets; inventaris semua route dan boundary login/file/helper.
5. detak/notif → aturan/peran/task/SOP → helpers/policy/bonus; bedakan prose dan enforcement.
6. Bandingkan salinan aktif memakai SHA-256; perbedaan konfigurasi/prompt diperiksa tanpa nilai secret.
7. Konsolidasi keamanan, batas sumber, perbandingan KAEL dan blueprint independen.

## Cakupan hasil

| Status | Jumlah berkas teks dalam inventaris |
|---|---:|
| hash-identical | 27 |
| read-static | 142 |
| metadata-only | 2 |

`read-static` = reviewer mencatat pembacaan penuh source; `hash-identical` = salinan identik file yang dibaca; `partial-static` = hanya rentang tertentu; `reviewed-regex-only` = pencarian terarah; `inventoried-not-read` = belum dibaca. Bukti per file: [coverage.json](coverage.json), [11-FILE-REFERENCE-INDEX.md](11-FILE-REFERENCE-INDEX.md). Penilaian ini bukan hasil tes runtime.

Pengecualian aman pada direktori .claude: key/config metadata yang disaring dan prompt agent/skill nonrahasia diperiksa tersendiri; file credentials, transcript/session, cookie dan private key tidak dibaca. Catatan tambahan tersebut ada pada coverage reviewer walaupun direktori induk dikecualikan pemindai awal.

## Bagian metadata-only dan alasannya

- `.bashrc`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.bash_history`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.bash_logout`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.cache`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.claude`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.claude.json`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.config`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.kantor-alamat`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.kantor-alamat-lembur`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.kantor-kode`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.kantor-wizard-selesai`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.kantor-wizard.json`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.kantor-wizard.log`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.local`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.npm`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.profile`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `.ssh`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `cadangan-kantor`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `kantor/.claude`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kantor/.rahasia`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `kantor/brand`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kantor/carousel/node_modules`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.
- `kantor/catatan`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kantor/hasil`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kantor/kotak-masuk`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kantor/masuk`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kantor/task`: data bisnis/sesi aktif: metadata saja; template padanannya ditinjau.
- `kit-kantor-ai/.kit-id`: rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja.

546 gambar WebP, font WOFF2 dan binary lain tidak dinilai visual satu per satu. Pemberitahuan MIT/OFL aset dibaca; hak keseluruhan kit tidak disimpulkan dari notice aset. Arsip lama tidak dibuka ulang agar tidak memuat kembali secrets/data pelanggan.

## Keutuhan dan pemulihan

**TERBUKTI** (metadata): `.local/bin/claude` dan wrapper `kantor/carousel/node_modules/.bin/playwright` berukuran 0 B, tanpa jenis link pada hasil ekstrak Windows. Versi-folder Claude 2.1.294 ada sebagai metadata; **BELUM DAPAT DIPASTIKAN** apakah CLI hasil ekstrak bisa berjalan. Backup tidak mencakup bukti konfigurasi /etc, crontab efektif atau service Linux. Pemulihan symlink/permissions dan runtime perlu restore terisolasi berizin, bukan menjalankan file backup sekarang.

Catatan: laporan ini dibuat oleh `consolidate.mjs`. Label kepastian ditambahkan manual pada 14 Oktober 2026; menjalankan ulang script itu akan menimpa tambahan ini.
