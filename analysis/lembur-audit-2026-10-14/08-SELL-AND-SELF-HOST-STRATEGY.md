# 08 — Strategi jual lepas dan self-hosted KAEL

Status: **REKOMENDASI BISNIS**, bukan harga pasar, nasihat hukum, atau fakta kontrak Lembur. Observasi mekanisme client ada pada laporan 04; implementasi backend, pembayaran, batas VPS efektif dan kebijakan komersial Lembur belum dapat dipastikan dari backup.

Label kepastian: **TERBUKTI** = terlihat langsung di kode/metadata; **INDIKASI** = didukung struktur tetapi belum diuji; **HIPOTESIS** = penalaran yang perlu diuji; **BELUM DAPAT DIPASTIKAN** = butuh server vendor, VPS Linux, atau uji jalan yang tidak dilakukan; **REKOMENDASI** = usulan untuk Kael, bukan fakta tentang Lembur. Di laporan ini semua isi adalah **REKOMENDASI**, kecuali yang diberi label lain. Angka biaya dan harga **BELUM DAPAT DIPASTIKAN** sampai ada data pilot.

## 1. Pilihan lisensi

| Opsi | Yang perlu didefinisikan | Kelebihan | Beban/risiko |
|---|---|---|---|
| Perpetual sekali bayar | Hak memakai versi yang dibeli, batas instalasi, durasi dukungan/update | Mudah dipahami pelanggan | Pendapatan baru tidak otomatis menutup support bertahun-tahun |
| Per VPS/installation | Slot aktif, reinstall, standby, migrasi dan server rusak | Aktivasi dapat dibatasi dan dilacak | Jangan menghukum reinstall sebagai pembelian baru; sediakan transfer/offline support |
| Per bisnis/workspace | Definisi satu bisnis, banyak cabang/server, perubahan nama | Sesuai data dan organisasi | Sulit ditegakkan hanya melalui fingerprint mesin |
| Perpetual + pembaruan tahunan opsional | Hak kode inti tetap, update/support memiliki periode | Membiayai pemeliharaan tanpa mencabut software yang dibeli | Harus jelas membedakan update keamanan, versi baru dan dukungan |
| Inti + add-on opsional | Layanan/model/hosting apa yang ditagih terpisah | Pelanggan memilih biaya | Peningkatan kompleksitas billing, privasi dan ekspektasi uptime |

Usulan awal: lisensi inti perpetual untuk versi/entitlement yang dibeli, jumlah instalasi aktif eksplisit dan pemindahan slot yang mudah. Periode dukungan dan pembaruan dipisah dari hak menjalankan kode. Pilihan pembayaran sekali/tahunan serta jumlah slot adalah keputusan owner, belum ditentukan audit.

## 2. Bukan satu jenis autentikasi

1. **Pembelian**: transaksi dan identitas pembeli; webhook pembayaran tervalidasi/idempotent.
2. **Entitlement produk**: hak unduh/update/fitur tertentu.
3. **Aktivasi instalasi**: pemasangan tertentu memakai satu slot.
4. **Login pengguna**: siapa boleh masuk dashboard dan memberi approval.
5. **Login provider/integrasi**: akun AI, n8n, Telegram atau Drive milik pelanggan.

Jangan menggabungkan kode pembelian dengan password dashboard atau token model. Pembayaran berhasil tidak berarti provider AI sudah login. Klaim biaya harus menjelaskan setiap komponen.

## 3. Lifecycle lisensi KAEL yang diusulkan

Pembayaran terkonfirmasi → terbitkan entitlement → pelanggan membuat aktivasi memakai installationId acak → pusat menerbitkan token lisensi bertanda tangan → installer memverifikasi → simpan lokal dengan permission terbatas → unduh rilis yang berhak diperoleh. Gunakan kode aktivasi sekali pakai/berumur terbatas dan tampilkan pemulihan lewat portal.

Jangan menjadikan hash machine-id satu-satunya bukti identitas. Lembur memakai hash machine-id sebagai fingerprint (**TERBUKTI**, laporan 04). Template VPS dapat memiliki ID duplikat (**INDIKASI**, belum diuji pada penyedia VPS tertentu) dan migrasi dapat menggantinya. Gunakan installationId/activation record, serta atribut mesin minimum jika diperlukan untuk deteksi penyalahgunaan. Hindari pengiriman hardware fingerprint terperinci tanpa kebutuhan dan pemberitahuan.

Token mengandung issuer/audience/keyId/licenseId/installationId/entitlements dan versi schema. Hak memakai inti, masa update dan masa dukungan adalah field berbeda. Kontrak offline/grace/revocation harus diputuskan sebelum code ditulis: usulan awal server lisensi gagal tidak menghapus file, menghentikan run berjalan atau mengunci akses backup. Batasi pembelian fitur/update baru bila perlu, dengan alasan, masa tenggang dan jalur banding yang terlihat.

Migrasi: export backup → hentikan pekerjaan baru → nonaktifkan/transfer slot lama atau proses recovery bila server hilang → aktivasi baru → restore dan healthcheck. Reinstall pada mesin sama harus idempotent. Kebijakan fraud/refund/revocation perlu owner dan review hukum sebelum dijual; tidak diasumsikan dari kode referensi.

## 4. Pembagian tanggung jawab

| Komponen | Pembuat KAEL | Pelanggan |
|---|---|---|
| Paket resmi | Membangun, menandatangani, mengarsipkan versi, mencatat provenance/dependensi | Mengunduh kanal resmi, menjaga akses lisensi |
| VPS/OS/disk | Menetapkan support matrix, preflight dan panduan minimum terukur | Membayar VPS, akses admin, kapasitas disk dan pemeliharaan OS sesuai kontrak |
| Akun/model AI | Adapter, validasi capability, penjelasan batas/biaya | Akun dan biaya provider; memastikan penggunaan memenuhi syarat provider |
| Domain/HTTPS | Konfigurasi aman, diagnosis dan jalur domain sendiri | Membeli domain, mengatur DNS; opsi terkelola jika dipilih |
| Update/keamanan | Patch, signature, migration/rollback teruji, pemberitahuan kerentanan | Menjadwalkan penerapan, menyimpan backup, tidak membuka port aplikasi langsung |
| Backup/restore | Mekanisme konsisten, enkripsi opsional dan latihan restore yang terdokumentasi | Jadwal/retention/media offsite/kunci recovery dan verifikasi berkala |
| Integrasi | Broker scope, allowlist, redaksi dan dokumentasi izin | Kredensial serta approval tindakan bisnis |
| Dukungan | Jam layanan, versi yang didukung, diagnosis tersamarkan, batas bantuan | Bukti masalah yang disaring, persetujuan akses bila diperlukan |

Remote support bukan izin permanen untuk masuk VPS. Gunakan persetujuan sesi, akses minimum, pencatatan dan pencabutan setelah selesai.

## 5. Kerangka biaya, tanpa angka fiktif

Margin bersih per kohort = penjualan − biaya pembayaran/pajak yang berlaku − bandwidth/distribusi − waktu onboarding − waktu support − alokasi pengembangan/patch − refund/fraud. Ukur waktu support dan tingkat kegagalan instalasi, bukan hanya biaya server lisensi.

Biaya pelanggan = VPS + domain + penyimpanan/backup + model/token/langganan + konektor/media berbayar + waktu pengelolaan. Jangan menawarkan "AI unlimited" atau "update gratis selamanya" sebelum ada perhitungan biaya dan ketentuan tertulis.

Eksperimen pilot: catat keberhasilan instalasi tanpa bantuan, waktu sampai tugas pertama, frekuensi restore, biaya per task, biaya render dan jumlah kasus support per instalasi. Tentukan harga setelah data tersedia; nominal di dokumen referensi bukan harga KAEL.

## 6. Minimum layak dijual

- Satu jalur instalasi Linux yang diuji, owner login, HTTPS dan reset/recovery yang aman.
- Satu adapter AI yang didukung dengan status error/kuota, task terpersisten dan approval versi yang benar.
- Integrasi n8n read-only yang jelas; tidak mengklaim model atau Obsidian otomatis tersambung.
- Backup/restore teruji, installer rerun aman, update ditandatangani dan rollback kompatibel.
- Dokumentasi kemampuan/batas yang sama dengan perilaku UI, paket diagnosis tanpa secrets dan kebijakan dukungan.
- Daftar hak penggunaan source/dependensi/aset. Lisensi MIT pada aset tertentu di backup tidak memberi lisensi seluruh kit atau merek.

Tunda marketplace plugin, multi-tenant cloud, pembayaran agent otomatis, puluhan provider, DRM agresif dan layanan domain terkelola sampai kebutuhan dan biaya terbukti. Jangan menyebut prototype lokal sekarang sudah memenuhi minimum ini.

## 7. Risiko komplain yang harus dijawab sebelum checkout

"Sekali bayar tetapi tetap bayar AI/VPS", "model tertentu tidak tersedia", "video tanpa suara dianggap siap tayang", "server mati lalu tugas berulang", "update menghapus konfigurasi", "lisensi terkunci saat pindah VPS", "owner mengira animasi berarti pekerjaan selesai", dan "backup ada tetapi tidak bisa di-restore" harus dicegah melalui kontrak produk dan uji nyata, bukan hanya disclaimer.
