# 11 — Indeks rujukan file

Root seluruh path: `C:/Kael AI/lembur-backup-lengkap/kantor`. Laporan03/04 memakai root pendek kit-kantor-ai; tambahkan prefix tersebut ketika mencocokkan rujukannya. Semua path lain menyatakan rootnya di awal dokumen. Nomor baris berdasarkan snapshot0.18.7; tidak menjamin sama dengan server vendor.

## Cara memverifikasi

Buka path relatif pada root backup, cocokkan baris/simbol, lalu lihat laporan tematik. SHA-256 tersedia di inventory.json untuk membuktikan salinan yang sama tanpa menyalin file ke aplikasi. Checksum inventaris adalah identitas snapshot audit, bukan tanda tangan penerbit.

## Berkas source/teks dan status review

| File relatif | Baris | Review | Pemeriksa |
|---|---:|---|---|
| `kantor/alat/cek-listing.mjs` | 77 | hash-identical | coverage-runtime.json |
| `kantor/alat/drive-folder.mjs` | 66 | read-static | coverage-dashboard.json |
| `kantor/alat/font.mjs` | 60 | hash-identical | coverage-runtime.json |
| `kantor/alat/gaya.mjs` | 27 | hash-identical | coverage-runtime.json |
| `kantor/alat/hitung-csv.mjs` | 112 | hash-identical | coverage-runtime.json |
| `kantor/alat/kas.mjs` | 215 | hash-identical | coverage-runtime.json |
| `kantor/alat/password-dashboard.mjs` | 33 | read-static | coverage-dashboard.json |
| `kantor/alat/repliz-inti.mjs` | 405 | read-static | coverage-dashboard.json |
| `kantor/alat/repliz.mjs` | 72 | read-static | coverage-dashboard.json |
| `kantor/alat/satpam-drive.mjs` | 132 | read-static | coverage-dashboard.json |
| `kantor/alat/selesai-titipan.mjs` | 24 | hash-identical | coverage-runtime.json |
| `kantor/alat/tagihan.mjs` | 83 | hash-identical | coverage-runtime.json |
| `kantor/alat/web.mjs` | 172 | read-static | coverage-dashboard.json |
| `kantor/alat/xlsx-ke-csv.mjs` | 85 | hash-identical | coverage-runtime.json |
| `kantor/BANK-IDE.md` | 18 | hash-identical | coverage-runtime.json |
| `kantor/BIAYA.md` | 31 | hash-identical | coverage-runtime.json |
| `kantor/carousel/naskah-contoh.json` | 2 | hash-identical | coverage-runtime.json |
| `kantor/carousel/package-lock.json` | 41 | read-static | coverage-runtime.json |
| `kantor/carousel/package.json` | 1 | read-static | coverage-runtime.json |
| `kantor/carousel/render.mjs` | 32 | hash-identical | coverage-runtime.json |
| `kantor/carousel/template.html` | 29 | hash-identical | coverage-runtime.json |
| `kantor/CLAUDE.md` | 61 | read-static | coverage-runtime.json |
| `kantor/dashboard/aset/app.js` | 279 | read-static | coverage-dashboard.json |
| `kantor/dashboard/aset/gaya.css` | 667 | read-static | coverage-dashboard.json |
| `kantor/dashboard/aset/kantor.js` | 348 | read-static | coverage-dashboard.json |
| `kantor/dashboard/aset/LISENSI-font-OFL.txt` | 94 | hash-identical | coverage-installer.json |
| `kantor/dashboard/aset/LISENSI-karakter-MIT.txt` | 27 | hash-identical | coverage-installer.json |
| `kantor/dashboard/drive-cek.json` | 2 | metadata-only | coverage-parent.json |
| `kantor/dashboard/server.mjs` | 1155 | read-static | coverage-dashboard.json |
| `kantor/dashboard/situs.mjs` | 94 | read-static | coverage-dashboard.json |
| `kantor/dashboard/tampilan.json` | 5 | metadata-only | coverage-parent.json |
| `kantor/DETAK-PROMPT.md` | 30 | hash-identical | coverage-runtime.json |
| `kantor/detak.sh` | 138 | hash-identical | coverage-runtime.json |
| `kantor/LAPORAN-template.md` | 30 | hash-identical | coverage-runtime.json |
| `kantor/notif.sh` | 35 | hash-identical | coverage-runtime.json |
| `kantor/ORGANISASI.md` | 19 | read-static | coverage-parent.json |
| `kantor/PAGAR.md` | 62 | hash-identical | coverage-runtime.json |
| `kantor/panduan-hp.md` | 67 | hash-identical | coverage-parent.json |
| `kantor/peran/PERAN-bima.md` | 25 | read-static | coverage-runtime.json |
| `kantor/peran/PERAN-builder.md` | 128 | read-static | coverage-runtime.json |
| `kantor/peran/PERAN-sari.md` | 25 | read-static | coverage-runtime.json |
| `kantor/skill/anti-slop-indo.md` | 59 | hash-identical | coverage-runtime.json |
| `kantor/sop/draf-balesan.md` | 26 | hash-identical | coverage-runtime.json |
| `kantor/sop/ide-konten.md` | 28 | hash-identical | coverage-runtime.json |
| `kantor/sop/posting-sosmed.md` | 32 | hash-identical | coverage-runtime.json |
| `kantor/sop/rekap-pesanan.md` | 29 | hash-identical | coverage-runtime.json |
| `kantor/SOP-template.md` | 39 | hash-identical | coverage-runtime.json |
| `kit-kantor-ai/alat/cek-listing.mjs` | 77 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/drive-folder.mjs` | 66 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/font.mjs` | 60 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/gaya.mjs` | 27 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/hitung-csv.mjs` | 112 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/kas.mjs` | 215 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/password-dashboard.mjs` | 33 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/repliz-inti.mjs` | 405 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/repliz.mjs` | 72 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/satpam-drive.mjs` | 132 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/selesai-titipan.mjs` | 24 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/tagihan.mjs` | 83 | read-static | coverage-runtime.json |
| `kit-kantor-ai/alat/web.mjs` | 172 | read-static | coverage-installer.json |
| `kit-kantor-ai/alat/xlsx-ke-csv.mjs` | 85 | read-static | coverage-runtime.json |
| `kit-kantor-ai/ATURAN.md` | 63 | read-static | coverage-runtime.json |
| `kit-kantor-ai/BANK-IDE.md` | 18 | read-static | coverage-runtime.json |
| `kit-kantor-ai/BIAYA.md` | 31 | read-static | coverage-runtime.json |
| `kit-kantor-ai/bonus/jalur-hemat/detak-opencode.sh` | 44 | read-static | coverage-runtime.json |
| `kit-kantor-ai/bonus/jalur-hemat/opencode.json` | 37 | read-static | coverage-runtime.json |
| `kit-kantor-ai/bonus/jalur-hemat/prompt-bot-telegram.md` | 60 | read-static | coverage-runtime.json |
| `kit-kantor-ai/bonus/jalur-hemat/README.md` | 98 | read-static | coverage-runtime.json |
| `kit-kantor-ai/bonus/prompt-dashboard-visual.md` | 62 | read-static | coverage-runtime.json |
| `kit-kantor-ai/brand/brief-template.md` | 24 | read-static | coverage-runtime.json |
| `kit-kantor-ai/brand/fakta-template.md` | 23 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-1.sh` | 14 | read-static | coverage-installer.json |
| `kit-kantor-ai/cek/cek-10.sh` | 12 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-11.sh` | 15 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-12.sh` | 12 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-2.sh` | 13 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-3.sh` | 19 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-4.sh` | 14 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-5.sh` | 17 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-6.sh` | 15 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-7.sh` | 12 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-8.sh` | 11 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-9.sh` | 15 | read-static | coverage-runtime.json |
| `kit-kantor-ai/cek/cek-pasang.sh` | 37 | read-static | coverage-installer.json |
| `kit-kantor-ai/cek/_alat.sh` | 9 | read-static | coverage-installer.json |
| `kit-kantor-ai/checklist-vps.md` | 65 | read-static | coverage-installer.json |
| `kit-kantor-ai/contoh-data/README.md` | 13 | read-static | coverage-runtime.json |
| `kit-kantor-ai/dashboard/aset/app.js` | 279 | read-static | coverage-dashboard.json |
| `kit-kantor-ai/dashboard/aset/gaya.css` | 667 | read-static | coverage-dashboard.json |
| `kit-kantor-ai/dashboard/aset/kantor.js` | 348 | read-static | coverage-dashboard.json |
| `kit-kantor-ai/dashboard/aset/LISENSI-font-OFL.txt` | 94 | read-static | coverage-installer.json |
| `kit-kantor-ai/dashboard/aset/LISENSI-karakter-MIT.txt` | 27 | read-static | coverage-installer.json |
| `kit-kantor-ai/dashboard/server.mjs` | 1155 | read-static | coverage-dashboard.json |
| `kit-kantor-ai/dashboard/situs.mjs` | 94 | read-static | coverage-dashboard.json |
| `kit-kantor-ai/DETAK-PROMPT.md` | 30 | read-static | coverage-runtime.json |
| `kit-kantor-ai/DETAK.md` | 72 | read-static | coverage-runtime.json |
| `kit-kantor-ai/detak.sh` | 138 | read-static | coverage-runtime.json |
| `kit-kantor-ai/diagnosa.sh` | 214 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/alamat.sh` | 170 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/aset/LISENSI-font-OFL.txt` | 94 | read-static | coverage-parent.json |
| `kit-kantor-ai/installer/aset/LISENSI-karakter-MIT.txt` | 25 | read-static | coverage-parent.json |
| `kit-kantor-ai/installer/aset/wizard.css` | 178 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/aset/wizard.js` | 48 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/pasang-awal.sh` | 70 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/pasang.mjs` | 443 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/perbarui.mjs` | 108 | read-static | coverage-installer.json |
| `kit-kantor-ai/installer/wizard.mjs` | 298 | read-static | coverage-installer.json |
| `kit-kantor-ai/kotak-masuk/README.md` | 30 | read-static | coverage-runtime.json |
| `kit-kantor-ai/LAPORAN-template.md` | 30 | read-static | coverage-runtime.json |
| `kit-kantor-ai/MULAI-DI-SINI.md` | 86 | read-static | coverage-installer.json |
| `kit-kantor-ai/mulai.sh` | 195 | read-static | coverage-installer.json |
| `kit-kantor-ai/notif.sh` | 35 | read-static | coverage-runtime.json |
| `kit-kantor-ai/ORGANISASI.md` | 18 | read-static | coverage-runtime.json |
| `kit-kantor-ai/pagar/settings.json` | 155 | read-static | coverage-runtime.json |
| `kit-kantor-ai/PAGAR.md` | 62 | read-static | coverage-runtime.json |
| `kit-kantor-ai/panduan-hp.md` | 67 | read-static | coverage-parent.json |
| `kit-kantor-ai/pasang.sh` | 51 | read-static | coverage-installer.json |
| `kit-kantor-ai/peran/PERAN-builder.md` | 131 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-admin.md` | 25 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-jualan.md` | 27 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-katalog.md` | 27 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-keuangan.md` | 28 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-marketing.md` | 26 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-sosmed.md` | 28 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-tagihan.md` | 26 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-contoh-web.md` | 34 | read-static | coverage-runtime.json |
| `kit-kantor-ai/peran/PERAN-kosong.md` | 18 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/anti-slop-indo.md` | 59 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/balas-pelanggan.md` | 43 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/carousel.md` | 36 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/cek-tampilan.md` | 27 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/google-drive.md` | 44 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/jaga-web.md` | 33 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/laporan-iklan.md` | 45 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/listing-marketplace.md` | 48 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/pembukuan.md` | 42 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/penawaran-tagihan.md` | 46 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/posting-repliz.md` | 55 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/rekap-angka.md` | 51 | read-static | coverage-runtime.json |
| `kit-kantor-ai/skill/web-bisnis.md` | 71 | read-static | coverage-runtime.json |
| `kit-kantor-ai/SKILL-REKOMENDASI.md` | 86 | read-static | coverage-installer.json |
| `kit-kantor-ai/sop/catat-kas.md` | 32 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/draf-balesan.md` | 26 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/ide-konten.md` | 28 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/jaga-web.md` | 22 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/laba-rugi.md` | 25 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/landing-page.md` | 29 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/laporan-iklan.md` | 25 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/listing-produk.md` | 26 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/penawaran.md` | 23 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/posting-sosmed.md` | 32 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/rekap-pesanan.md` | 29 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/rekap-stok.md` | 26 | read-static | coverage-runtime.json |
| `kit-kantor-ai/sop/tagihan.md` | 27 | read-static | coverage-runtime.json |
| `kit-kantor-ai/SOP-template.md` | 39 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/brief-contoh.md` | 28 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/carousel/naskah-contoh.json` | 2 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/carousel/pasang-carousel.sh` | 34 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/carousel/render.mjs` | 32 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/carousel/template.html` | 29 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/PERAN-pemeriksa.md` | 26 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/PERAN-penulis.md` | 28 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/sosmed/README.md` | 61 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/tagihan/render.mjs` | 130 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/tagihan/template.html` | 56 | read-static | coverage-runtime.json |
| `kit-kantor-ai/studi-kasus/web/foto.mjs` | 83 | read-static | coverage-runtime.json |
| `kit-kantor-ai/task/README.md` | 57 | read-static | coverage-runtime.json |
| `kit-kantor-ai/task/T-01-contoh-ide-konten.md` | 28 | read-static | coverage-runtime.json |
| `kit-kantor-ai/task/T-02-contoh-rekap-pesanan.md` | 22 | read-static | coverage-runtime.json |
| `kit-kantor-ai/update.sh` | 101 | read-static | coverage-installer.json |
| `kit-kantor-ai/VERSI` | 2 | read-static | coverage-installer.json |

## Rujukan tematik utama

- Instalasi, user/root, wizard dan domain: laporan 03; bootstrap/installer/mulai/alamat.
- Hak unduh, aktivasi, hash mesin, distribusi dan update: laporan 04; client bukan backend lisensi.
- Dashboard/auth/API/storage/animasi: laporan 02; server, situs, app dan kantor.js.
- Heartbeat, memory/file task, SOP, policy dan integrasi: laporan 05; detak, pagar, alat, skill, bonus.
- Prasyarat dan dampak risiko: laporan 06; seluruh temuan memiliki bukti file/baris.
- KAEL saat ini: package.json, server/index.mjs, server/codex-stage.mjs, server/production.mjs, src/domain.ts dan docs/PRD.md di C:/Kael AI; bukan di root backup.
- Desain/biaya/roadmap KAEL: laporan 07–10 berlabel rekomendasi, bukan source Lembur atau fitur yang sudah dibuat.

Catatan rinci dan tambahan source di direktori yang awalnya metadata-only: [coverage.json](coverage.json) serta coverage tiap reviewer. Rahasia tidak diberi link isi; nilainya tidak diperlukan untuk audit.
