# Menyiapkan kantor sendiri — paket uji Kael

Paket sumber ini terpisah dari kantor pengembang. Tidak berisi akun, kode pembelian, password, konteks bisnis, tim, tugas, hasil, media produksi, konfigurasi integrasi atau sesi chat pengembang. Template hanya diterapkan setelah dipilih pemilik.

**Status: paket uji lokal, belum produk siap jual atau installer VPS.** Memerlukan Node.js 24+ dan npm. Paket ini belum menyediakan domain, HTTPS publik, layanan systemd, pembayaran, email aktivasi, backup/restore atau runtime Hermes. Jangan membuka server pengembangan langsung ke internet.

## 1. Jalankan pada folder paket

```sh
npm ci
npm run dev
```

Buka http://localhost:5173. Jika paket berada pada VPS untuk pengujian privat, jalankan dari laptop:

```sh
ssh -L 5173:127.0.0.1:5173 USER@IP_VPS
```

Ganti USER/IP dengan akses VPS sendiri, lalu buka localhost:5173 pada laptop. Ini tunnel privat, bukan alamat kantor publik. Server tetap mendengarkan loopback. Jika menjalankan lebih dari satu kantor pada komputer yang sama, port frontend/backend perlu dipisahkan; jangan menjalankan dua paket dev pada port bawaan bersamaan.

## 2. Buat akses pemilik

Di terminal kedua pada folder paket (VPS jika aplikasi berjalan di VPS):

```sh
node scripts/owner-access.mjs
```

Masukkan kode penyiapan yang tampil pada halaman setup, isi nama pemilik, email dan frasa sandi minimal 8 karakter. Kode penyiapan bukan kode pembelian dan berlaku sekali. Jangan mengirim kode/password ke chat AI. Login berikutnya cukup email dan password. Jika lupa password, jalankan `node scripts/owner-access.mjs --reset` di terminal server dari folder paket. Pilih **Lupa kata sandi?** di web, masukkan kode sekali pakai (15 menit), lalu tentukan password baru. Semua sesi lama keluar; akun dan data kantor dipertahankan. Jangan bagikan kode pemulihan. Reset lewat email belum tersedia.

## 3. Ikuti penyiapan kantor

1. **Bisnis:** isi nama kantor, pelanggan sasaran, fakta dan aturan. Jangan masukkan kredensial.
2. **Tim:** pilih Tim konten, Tim operasional atau mulai kosong. Nama manager, pelaksana, peran dan divisi dapat diedit sebelum penerapan. SOP template terlihat untuk ditinjau. Tidak ada pekerjaan, persetujuan atau pesan keluar otomatis.
3. **Pelaksanaan:** gunakan Codex atau Claude Code yang terdeteksi pada server, atau lanjut manual. Login sendiri melalui `codex login` atau `claude auth login` sebagai user server yang menjalankan Kael, kemudian periksa koneksi lagi. Pemeriksaan dapat tersimpan sampai 60 detik. Ini cek login, bukan bukti setiap model/kuota berhasil. Claude saat ini mengerjakan tugas teks dari brief/SOP, tanpa alat eksternal. Hermes belum tersedia. Produksi video khusus tetap memakai Codex.

Setiap langkah tersimpan setelah tombol Simpan/Terapkan berhasil. Tutup halaman atau restart tidak menghapus langkah yang sudah disimpan. Isian yang belum disimpan belum dicatat. Setelah selesai, nama kantor tampil di sidebar dan profil workspace.

## 4. Selesaikan tugas pertama

Ringkasan menampilkan panduan berdasarkan data sebenarnya: bentuk tim → buat briefing → ajukan dan setujui rencana → jalankan manual/AI → buka preview hasil → setujui atau minta revisi. Membuka preview tidak menyetujui hasil. Jika mulai kosong, buka Builder untuk membentuk divisi dahulu.

Untuk mengganti provider/model agent: Divisi → Anggota → pilih agent → Setelan → Claude/Codex. Kosongkan model untuk default CLI atau isi alias/ID yang tersedia pada akunmu. Pengaturan → AI pada server menunjukkan koneksi per provider. Setiap run menggunakan sesi baru dengan konteks tugas; bukan seluruh riwayat chat akunmu. Kuota menjadi tanggungan akun buyer sendiri.

Jalur utama: buka folder kantor pada Code di aplikasi Claude dan ketik **jadi builder**; untuk manager/pelaksana, buat chat lain dan ketik **jadi Nama Agent** sesuai Divisi. Pin chat dari aplikasi AI. Hook proyek menghubungkan konteks peran dengan data kantor; Codex dapat memakai bridge CLI/sessionId. Panduan: [Sesi kantor](OFFICE-ROLES.md). Halaman **Builder** menampilkan usulan sesi untuk ditinjau, diedit dan diterapkan pemilik; chat web tetap opsional. Pilih divisi baru atau edit divisi tugas lokal, ceritakan kebutuhan, tinjau proposal, lalu terapkan. Kirim koreksi jika perlu; simpan perubahan form sebelum menerapkan. Ruangan mengikuti preset anggota. Manager sesi dapat mengajukan rencana dan meninjau hasil. Otomasi tugas lokal tersedia lewat Divisi → SOP & integrasi → Atur otomasi, setelah provider manager/pelaksana dan SOP siap. Hanya rencana yang disetujui berikutnya yang berjalan, dengan batas run harian; hasil tetap menunggu keputusan pemilik. Edit geometri bebas dan integrasi otomatis belum tersedia. Bridge lokal `scripts/building.mjs` dan konfigurasi manual tetap tersedia. Paket tidak terhubung ke chat Builder pengembang. Pengaturan mengubah konteks bisnis; Anggota mengubah provider/model; Builder mengubah nama/peran dan menambah tim. Editor bebas ruangan, logo dan domain belum tersedia. Diskusi web tersimpan di direktori data kantor dan ikut dicadangkan secara privat; tidak menyalin riwayat desktop pengembang.

## Data dan bantuan

Setiap folder paket menyimpan akun/kunci/state sendiri di `app-data/` (atau direktori `KAEL_DATA_DIR` yang diatur operator). Jangan menyalin app-data dari kantor lain. Cadangkan seluruh data/media dan kredensial secara privat sebelum pindah server; ekspor JSON dashboard saja belum backup penuh.

Jika gagal, catat langkah terakhir dan pesan error tanpa kode, password, token, atau file rahasia. Jangan menghapus file akun/state sebagai cara memperbaiki masalah. Riwayat dan hasil versi lama harus dipertahankan.
