# Usulan pengembangan produk Kael AI

Tanggal: 11 Oktober 2026.

Status: bahan diskusi. Usulan dalam dokumen ini belum menjadi keputusan pemilik, spesifikasi final, atau izin untuk menghubungkan layanan maupun menjalankan tindakan bisnis.

Sumber: seluruh 13 halaman `C:/Kael-Workspace/exports/Ide-Kael-AI-Tanpa-Desain-Kantor.pdf`. Referensi ke PRD dan percakapan di dalam PDF belum diperiksa secara terpisah.

## Arah produk yang dipahami

Kael adalah kantor AI untuk mengerjakan pekerjaan bisnis. Pemilik memberi arahan; manager menerjemahkan arahan menjadi pekerjaan dan memeriksa hasil; agent pelaksana menghasilkan berkas atau perubahan yang bisa diperiksa. Pemilik memutuskan tindakan penting. Kantor visual memperlihatkan keadaan pekerjaan yang tercatat.

Dokumen sumber sudah mencakup manager per divisi, antrean tugas, persetujuan, revisi maksimal dua putaran mandiri, kesinambungan konteks, konfigurasi organisasi, serta integrasi provider yang masih harus dibuktikan. Semua ini adalah arah produk, bukan kemampuan yang sudah berjalan.

Proyek lokal saat ini baru mempunyai satu ruangan 3D Founder/Kael dan kontrol simulasi. Belum ada penyimpanan tugas, eksekusi AI, persetujuan yang persisten, maupun integrasi provider.

## Pengembangan yang diusulkan

### Ruang Founder sebagai meja kendali

Ruang Founder menjadi tempat pemilik memulai briefing dan melihat keputusan yang memerlukan perhatian. Empat bagian utama: tujuan aktif, pekerjaan berjalan, keputusan menunggu, dan hasil terbaru.

Setiap keputusan memperlihatkan apa yang akan dilakukan, hasil versi berapa yang digunakan, dampak, rekomendasi manager, dan pilihan pemilik. Ringkasan harian dibuat dari aktivitas nyata dan menyoroti penyimpangan dari rencana. Jika tidak ada pekerjaan, tampilkan keadaan kosong dengan pilihan memulai briefing.

### Pengetahuan bisnis yang disepakati

Sediakan profil bisnis bersama: produk, harga yang berlaku, pelanggan sasaran, gaya bahasa, aset merek, SOP, serta batas tindakan. Setiap fakta penting memiliki sumber, tanggal pembaruan, dan status konfirmasi. Harga atau kebijakan yang bertentangan harus ditandai, bukan dipilih diam-diam.

Pisahkan pengetahuan bersama dari dokumen terbatas per divisi. Kredensial tidak dimasukkan ke memori percakapan. Pemilik bisa meninjau perubahan pengetahuan agar asumsi sementara tidak berubah menjadi kebijakan permanen.

### Briefing menghasilkan paket pekerjaan

Setiap briefing memiliki tujuan, masukan, hasil yang diharapkan, kriteria selesai, pembagian tugas, urutan ketergantungan, batas penggunaan, dan tindakan yang belum diizinkan. Pertanyaan hanya diajukan untuk informasi yang belum tersedia dan berpengaruh terhadap pekerjaan.

Contoh: brief promosi produk menghasilkan riset bahan, draft konten, pemeriksaan, dan paket siap ditinjau. Setiap keluaran terhubung ke brief asal, sumber data, versi, dan pemeriksa. Menyetujui rencana kerja tidak otomatis menyetujui publikasi hasil.

### Satu sumber keadaan pekerjaan

Pisahkan status tugas, keadaan eksekusi, koneksi provider, dan posisi karakter. Provider terputus tidak berarti tugas batal; karakter sampai di meja tidak membuktikan proses AI sedang berjalan.

Alur kerja awal yang diusulkan: draft → menunggu persetujuan rencana → siap → berjalan → diperiksa manager → menunggu keputusan pemilik → selesai. Cabang yang perlu dicatat: menunggu informasi, menunggu jatah, dijeda, gagal, dan dibatalkan. Gunakan langkah nyata sebagai progres, bukan persentase perkiraan tanpa dasar.

Tindakan eksternal memiliki catatan terpisah, misalnya publikasi yang telah disetujui. Simpan identitas tindakan, versi materi, tujuan, dan hasil eksekusi. Sebelum mengulang setelah koneksi terputus, periksa apakah tindakan sebelumnya sudah terjadi. Hasil yang belum diketahui harus ditandai belum diketahui.

### Persetujuan yang spesifik dan tidak membebani

Pertahankan izin untuk tindakan penting sesuai dokumen sumber. Manager boleh melakukan langkah internal yang sudah termasuk brief dan batas revisinya. Kelompokkan keputusan yang saling terkait dalam satu laporan, dengan keputusan terpisah per tindakan bila dibutuhkan.

Usulan tambahan: tampilkan prioritas keputusan dan tugas mana yang tertahan. Jangan mengubah prioritas tugas hanya karena sistem menilai sebuah keputusan mendesak. Jika isi atau tujuan tindakan berubah setelah persetujuan, minta persetujuan baru untuk versi tersebut.

### Integrasi provider yang bisa dibuktikan

Pertahankan pilihan satu provider untuk kantor. Pisahkan identitas agent, riwayat, dan tugas dari mekanisme koneksi provider. Mulai dengan satu jalur yang sudah diuji sebelum menawarkan pergantian provider.

Sediakan status yang jujur: belum tersambung, salin konteks manual, atau eksekusi terhubung. Menyalin konteks tidak mengubah tugas menjadi berjalan otomatis. Akun, langganan, akses API/CLI, autentikasi, pembacaan jatah, dan dukungan perintah harus diverifikasi per layanan sebelum membuat janji produk. Usulan ini tidak menyatakan provider tertentu sudah mendukung semua kemampuan tersebut.

### Evaluasi manfaat dengan pekerjaan nyata

Ukur pekerjaan yang diterima tanpa revisi besar, waktu sampai hasil layak pakai, jumlah intervensi pemilik, penggunaan yang benar-benar bisa diukur, dan kegagalan yang berhasil dipulihkan. Jangan menggunakan jumlah karakter, pesan, atau lama animasi sebagai ukuran produktivitas.

Saat data belum cukup, tampilkan belum tersedia. Waktu atau biaya yang diklaim dihemat memerlukan pembanding yang disepakati; jangan dibuat otomatis dari perkiraan model.

## Aturan sumber yang perlu dibahas

### Ruang meeting dan antrean approval

PDF mengaitkan tempat menunggu approval dengan ketersediaan ruang meeting. Usulan alternatif: antrean keputusan tetap dapat diakses dari ruang Founder dan tidak mengunci ruang meeting. Meeting tetap merupakan sesi briefing yang dipilih pemilik. Ini perubahan dari aturan sumber dan belum diterapkan.

### Jeda seluruh anggota saat briefing

PDF mengusulkan peserta menyimpan pekerjaan sebelum meeting. Usulan penyempurnaan: pemilik dapat meninjau anggota mana yang benar-benar diperlukan; hanya peserta terkait yang dijeda pada titik aman. Pekerjaan lain dalam brief yang sudah disetujui tetap berjalan. Perubahan pola ini perlu disepakati dahulu.

### Janji komersial

PDF mencatat sekali beli dengan pembaruan gratis selamanya. Sebelum peluncuran, usulku definisikan secara terpisah pembaruan produk, dukungan pemasangan, dan bantuan operasional. Jangan menetapkan harga baru atau menganggap rencana harga di PDF sebagai keputusan final hanya dari usulan ini. Beban dukungan dan biaya pemeliharaan perlu diuji melalui pemakaian nyata terlebih dahulu.

## Urutan pembangunan yang diusulkan

| Tahap | Hasil yang bisa dicoba | Syarat selesai |
| --- | --- | --- |
| 1. Ruang Founder berfungsi | Membuat brief, menyimpan tujuan dan melihat daftar keputusan serta hasil | Data tetap ada setelah reload; perubahan simulasi tidak dianggap aktivitas asli |
| 2. Satu divisi percontohan | Satu manager dan sedikit agent pelaksana; satu alur kerja lengkap | Brief disetujui, tugas dikerjakan, hasil diperiksa, revisi/keputusan tercatat |
| 3. Satu koneksi AI | Eksekusi pekerjaan dari provider yang telah diuji | Status autentikasi, gagal, batas penggunaan dan lanjut setelah jeda terbukti |
| 4. Kantor mengikuti pekerjaan | Karakter dan panel mencerminkan peristiwa pekerjaan nyata | Tidak ada status bekerja palsu; keadaan setelah restart konsisten |
| 5. Paket pelanggan | Setup, backup/pemulihan, pembaruan dan konfigurasi organisasi | Skenario instalasi baru serta pemulihan diuji sebelum penjualan |

Tahap 2 dapat memakai runner simulasi untuk menguji alur; keberhasilan tahap itu belum membuktikan kemampuan AI. Tahap 3 harus mengulangi alur yang sama menggunakan keluaran AI nyata. Pemilihan divisi ditentukan oleh pekerjaan pertama yang ingin diselesaikan pemilik.

## Skenario awal yang disarankan

Gunakan Kael HQ sendiri sebagai pengguna pertama dan pilih satu pekerjaan terbatas, misalnya membuat paket materi pengenalan Kael AI. Pemilik memberikan fakta produk dan sasaran. Manager menyusun pekerjaan; agent membuat draft; manager memeriksa klaim terhadap fakta; pemilik meninjau hasil. Publikasi menjadi keputusan dan tindakan terpisah.

Keberhasilan awal: satu pekerjaan benar-benar menghasilkan materi yang diterima pemilik, dengan riwayat dan hasil yang tetap ada setelah aplikasi dimulai ulang. Setelah itu baru menambah divisi dan pekerjaan yang lebih rumit.

## Keputusan berikutnya

Tentukan pekerjaan nyata pertama untuk Kael. Rekomendasi awal: paket konten pengenalan produk Kael AI untuk kebutuhan HQ sendiri. Pilihan ini adalah usulan, belum keputusan pemilik.
