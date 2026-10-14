# 10 — Ketidakpastian dan keputusan penting

## A. Yang belum dapat dipastikan dari backup Lembur

| Pertanyaan | Mengapa belum pasti | Bukti tambahan yang diperlukan |
|---|---|---|
| Backend lisensi, database pembelian dan payment webhook | Source client hanya menunjukkan request/response yang diharapkan | Source/kontrak backend atau dokumentasi resmi yang pemilik berhak berikan |
| Penegakan slot VPS, pencabutan, refund dan masa link sebenarnya | Penanganan error/comment client bukan bukti kebijakan server | Test sandbox berizin + kontrak API/server; tidak menggunakan kode pembelian backup |
| Isi paket rilis yang saat ini dilayani | Audit hanya kit lokal versi 0.18.7, bukan server distribusi | Paket resmi yang diunduh pemilik, signature/manifest, release notes |
| Kondisi produksi VPS asli | Tidak ada akses runtime/crontab/systemd/Caddy efektif; backup home tidak memuat seluruh /etc | Export konfigurasi tersaring dan diagnosis read-only yang dijalankan owner sendiri |
| Status hidup/masa berlaku kredensial | Nilai tidak dibaca/digunakan | Owner memeriksa akun dan mempertimbangkan rotasi/revocation di layanan masing-masing |
| Hak seluruh kit dan aset hasil modifikasi | MIT/OFL pada aset tertentu bukan lisensi seluruh produk | Lisensi pembelian/distribusi kit dan provenance aset; review hukum bila dipakai komersial |
| Dependensi rentan/CVE saat ini | Tidak melakukan database advisory/network scan; CLI binary tidak dieksekusi | SBOM/lock lengkap dan audit advisory terkontrol yang disetujui |
| Kesiapan backup dipulihkan | Placeholder executable 0 B, tar/symlink/permission asli belum diverifikasi penuh | Restore terisolasi Linux dengan izin khusus, pemeriksaan owner/mode/link dan checksum |
| Efektivitas semua policy Claude | Settings lokal menambah izin; perilaku versi CLI/hook/MCP dan akun tidak diuji | Policy gabungan tersaring, versi runtime dan uji dummy berizin |
| Alur fitur berfungsi di akun pemilik | Keberadaan kode/log tidak sama dengan eksekusi berhasil | Data dummy, kredensial sandbox milik owner, observasi end-to-end setelah izin |

Tidak ada klaim bahwa fitur tidak ada di seluruh produk Lembur; ketidakhadiran hanya berlaku untuk lingkup source yang tersedia dan ditelusuri. Layanan vendor di luar backup tetap unknown.

## B. Keputusan owner KAEL yang benar-benar memengaruhi arsitektur

1. **Pengguna pertama:** pribadi/closed pilot atau langsung pelanggan publik? Menentukan kapan login, installer dan support harus menjadi release gate.
2. **Provider pertama:** akun/API/CLI mana yang akan didukung? Model harus dipilih dari capability terverifikasi, bukan label contoh. Siapa membayar biaya dan apakah penggunaan memenuhi ketentuan provider?
3. **Lingkup lisensi:** per bisnis/per VPS, slot produksi/standby, hak versi perpetual, masa update dan dukungan, kebijakan offline/migrasi/refund.
4. **Hak agent:** read-only atau boleh menulis? Aksi apa selalu butuh approval? Apa batas folder/egress dan siapa boleh menyetujui lintas divisi?
5. **Data:** retention chat/file, backup offsite/enkripsi, kunci recovery, dan kondisi data boleh dikirim ke provider/support.
6. **Telegram/Obsidian:** bot/user/chat allowlist, routing manager, vault/root folder dan hak baca/tulis. Tidak diperlukan untuk menyelesaikan audit statis ini, diperlukan sebelum integrasinya diaktifkan.
7. **Audio:** VO unggahan atau TTS berbayar, hak suara/musik, budget dan cara menguji sinkronisasi.
8. **Distribusi:** OS/arsitektur yang didukung, domain pelanggan atau layanan terkelola, kanal update, SLA/jam dukungan dan budget pengujian VPS.

Pilihan dan rekomendasi untuk kedelapan keputusan ini ada di [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md). Tidak perlu menjawab semuanya sekarang atau membuat puluhan pilihan UI dahulu. Urutan implementasi ada pada laporan 09; kelompok keputusan P0 cukup untuk memilih pilot pertama.

## C. Batas metode audit

Seluruh source inti ditelusuri statis dengan coverage tercatat; file identik dibandingkan hash. Direktori cache/dependensi/binary, sesi mentah, data pelanggan, secrets dan arsip historis ditandai metadata-only. Tidak ada installer/updater/heartbeat/serverbackup yang dijalankan; tidak ada request layanan produksi, pembayaran, aktivasi, deployment atau pengujian eksploitasi. Angka biaya/performance/maksimum VPS tidak diimpor sebagai fakta KAEL. Pengujian dinamis, jika dipilih berikutnya, memerlukan lingkungan terisolasi dan persetujuan owner.
