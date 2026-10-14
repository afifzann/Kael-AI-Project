# Tambahan acuan alur bisnis dan kantor buyer

14 Oktober 2026. Sumber: dokumen pemilik **Alur Sistem Kantor AI — Kael Ai**, versi 2, 24 bagian; lampiran `C:/Users/afifz/.codex/attachments/c0adc72b-f227-41a4-889e-a51c71a163d8/Pasted text.txt`. Seluruh lampiran sudah dibaca. Dokumen menyatakan hasil pemeriksaan VPS Lembur/kit 0.19.2; klaim tersebut belum diverifikasi ulang terhadap VPS atau source versi itu. Ini tambahan referensi, bukan instruksi untuk menjalankan perintah/cron, membuka rahasia, menyalin kode Lembur atau mengubah kantor pemilik. Detail kantor asal, task, domain dan pengaturan pribadinya tidak masuk paket buyer.

Tujuan Kael tetap produk self-hosted yang dijual lepas: buyer memakai VPS dan akun AI sendiri; kantor bisnis pengembang dan kantor buyer terpisah. Divisi, agent dan SOP dapat bertambah, tidak mengikuti roster contoh secara permanen.

## Perbandingan dengan kode Kael sekarang

| Kemampuan | Status Kael yang terverifikasi | Pekerjaan berikutnya |
| --- | --- | --- |
| Setup buyer dan template | Akun pemilik, profil bisnis, dua template editable/mulai kosong, resume per langkah; paket sumber bersih. `src/onboarding.ts`, `scripts/package-buyer.mjs` | Installer VPS, onboarding Claude, Builder wawancara adaptif, panduan diagnosis |
| Tugas sebagai sumber status | Brief, task, versi, alasan kendala, keputusan, event; UI/karakter membaca status. `src/domain.ts`, `src/work.ts` | Rencana langkah dan serah terima terstruktur; status menunggu input tidak dianggap aktif |
| Peran dan konteks agent | Manager/pelaksana dinamis, SOP berversi, setelan provider/model, konteks tugas dan sampai tiga hasil sebelumnya. `src/domain.ts` | Tujuan peran, sumber kebenaran dan izin tindakan lebih terstruktur; memori manager dan aturan bisnis dari revisi pemilik |
| Builder sebagai pengurus | Konfigurasi tim manual dan bridge lokal dengan revision guard. Tidak ada dialog AI adaptif di web. `src/builder.ts`, `scripts/building.mjs` | Percakapan → usulan perubahan → preview → penerapan terverifikasi; tidak menganggap template sebagai percakapan AI |
| Manager membagi pekerjaan | Briefing/pembagian masih dikendalikan pemilik. Antrean runtime menjalankan tugas pelaksana; belum manager otonom. `server/runtime.mjs` | Manager menyusun usulan rencana, mendelegasikan satu langkah, memantau kendala, meminta keputusan dan melanjutkan secara terkendali |
| Pemeriksa terpisah | Pemeriksaan tugas umum manual; produksi khusus memiliki gate/QC. `src/domain.ts` case review, `server/production.mjs` | Run pemeriksa dengan identitas/konteks terpisah; temuan terikat versi hasil, jumlah revisi dibatasi dan kegagalan dieskalasi |
| Keputusan dan kelanjutan | Keputusan/hasil terikat versi; run dipilih manual, antrean persisten. Restart run aktif menjadi interrupted. Tidak ada bangunkan-manager otomatis sesudah keputusan. | Simpan jawaban dahulu; antrekan kelanjutan sekali dengan status terlihat, idempotensi, pembatalan dan batas pemakaian; tanpa replay tindakan keluar |
| Serah terima antar-divisi | Catatan per divisi tersedia; bukan kotak masuk antar-manager. `src/domain.ts` case division-note | Permintaan asal/tujuan, tugas induk, kebutuhan, tenggat dan status diterima/dikerjakan/selesai; jejak dan izin tidak bisa dilewati lewat divisi lain |
| Jadwal kerja dan kuota | Antrean satu proses, penghentian dan timeout tersedia. Belum jadwal manager, budget token/biaya atau pembacaan kuota lintas provider. `server/runtime.mjs` | Jadwal per divisi, quiet hours, batas run/waktu/biaya dan jeda pada kendala; angka tidak tersedia ditampilkan tidak diketahui |
| Notifikasi dan laporan | Bell dashboard mengarahkan error/persetujuan ke target sebenarnya. `src/notifications.ts` | Kanal HP, ringkasan tindakan pemilik, deduplikasi dan laporan berkala dengan sumber angka |
| Izin dan alat eksternal | Auth pemilik/CSRF, scope bridge Builder, sandbox Codex baca-saja dan gate approval. Bukan broker tindakan keluar lengkap. `server/auth.mjs`, `server/codex-stage.mjs` | Pisahkan menghasilkan draft, menyetujui versi, dan izin mengirim/membayar/memublikasikan; alat berizin sempit, audit dan pembatasan rahasia |
| Penjualan, instalasi dan perawatan | Paket sumber/checksum tersedia; belum transaksi/aktivasi/email/installer/update signed/backup penuh | Uji Ubuntu bersih, installer/diagnosis, backup-restore, pembaruan aman, lisensi/checkout/email |

## Urutan implementasi yang disarankan

1. **Tuntaskan pekerjaan pertama buyer:** runtime provider yang didukung (terutama Claude yang diinginkan pemilik), Builder yang benar-benar berdiskusi dan memandu konteks bisnis. Uji dari kantor kosong hingga hasil diperiksa; jangan menambah provider yang hanya tersimpan sebagai label.
2. **Manager, pelaksana dan pemeriksa:** rencana, delegasi, pemeriksaan terpisah, temuan terikat versi, eskalasi dan kelanjutan sesudah keputusan. Mulai satu tugas manual/AI umum, tanpa tindakan keluar. Tugas tidak berjalan sebelum rencana disetujui.
3. **Operasional antar-divisi:** serah terima terstruktur, jadwal terbatas, penghentian, jatah yang dapat dibuktikan, notifikasi dan laporan. Tidak membangunkan AI hanya untuk mencatat bahwa bahan belum ada.
4. **Paket VPS yang dapat dirawat:** pemasangan user non-root/layanan/TLS, backup-restore, diagnosis tersaring dan update yang mempertahankan data/customisasi. Uji pemasangan baru, restart dan pemulihan. Paket sumber saat ini bukan bukti installer sudah bekerja.
5. **Penjualan otomatis:** pembayaran terverifikasi → kode aktivasi → email → installer → onboarding. Kode, pembayaran dan pengiriman harus deterministik, bukan tebakan AI.
6. **Divisi bisnis internal:** Produk & Teknis, Marketing & Penjualan, Operasional & Layanan Pelanggan, masing-masing manager dan alat yang sesuai. Tidak ikut paket buyer, tidak otomatis mengakses kantor buyer.

Nomor 1–3 menjelaskan pekerjaan inti yang perlu dilengkapi sebelum menjanjikan kantor beroperasi sendiri; nomor 4–5 menyiapkan distribusi dan penjualan. Ini usulan urutan lanjutan berdasarkan lampiran, bukan klaim semua fitur telah disetujui/dibuat.

## Hal yang perlu disesuaikan, bukan disalin

- Pertahankan state terstruktur dan revision guard Kael; tidak perlu mengganti seluruh penyimpanan menjadi file Markdown agar menyerupai referensi.
- Referensi memuat SOP bisnis contoh yang tidak sesuai bisnis sebenarnya, manager terjadwal yang hanya menunggu bahan, dan izin Drive yang bertentangan dengan pipeline. Template Kael harus menanyakan sumber/bahan yang memang tersedia dan menampilkan kemampuan konektor sebenarnya.
- Perubahan template/SOP setelah update tidak boleh menimpa penyesuaian buyer atau diam-diam mengubah tugas lama. Versi dan konflik perlu terlihat.
- Preview/approval yang sudah ada diteruskan. Approval hasil tidak berarti izin publikasi otomatis; publikasi perlu target, versi aset, waktu dan izin spesifik.
- Jangan menyalin nama bawaan, domain, struktur divisi, tema kantor, harga, angka kuota atau daftar perintah berizin dari referensi sebagai keputusan Kael. Tarif, lisensi, kemampuan provider dan klaim keamanan memerlukan verifikasi resmi saat benar-benar dipakai.
- UI menampilkan langkah berikutnya, pemilik tugas, kendala dan keputusan pada tempat yang sama; tidak menambah menu global untuk setiap divisi/alat atau menjadikan aktivitas karakter sebagai bukti pekerjaan AI.

Verifikasi Kael pada checkpoint `5175e88`: 131 tes lulus, build aplikasi/paket lulus, startup paket terpisah memakai akun/data fixture. Belum QA visual langsung, instalasi VPS/Claude baru atau bisnis berjalan otonom. Tidak ada perubahan operasional kantor/VPS asal berdasarkan lampiran ini.
