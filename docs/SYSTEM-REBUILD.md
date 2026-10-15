# Perombakan sistem kerja Kael

Permintaan pemilik 15 Oktober 2026: menerapkan pola operasional dalam dokumen investigasi kantor VPS ke proyek Kael sendiri. Kantor 3D, ruangan, material, furnitur dan animasi dipertahankan. Dokumen investigasi membahas instalasi kit Lembur di VPS, bukan sumber proyek C:\Kael AI; temuan tentang instalasi itu tidak otomatis berlaku di sini. Implementasi Kael ditulis sendiri, tanpa menyalin kit.

## Alur tujuan

Builder menyiapkan bisnis/tim/SOP → pemilik mengirim kebutuhan atau bahan → manager menyusun rencana → pemilik menyetujui → pelaksana bekerja → manager memeriksa → preview/hasil berversi → keputusan pemilik → kelanjutan atau revisi pada pekerjaan yang sama.

Manager dan agent mengikuti data divisi, bukan daftar nama tetap. Chat native dan web memakai konteks pekerjaan yang sama melalui bridge. Data terstruktur Kael tetap menjadi sumber status; berkas bahan/hasil ditautkan ke ID pekerjaan, bukan menjadi sumber status kedua yang dapat bertentangan.

## Tahap 1 — kotak masuk dan rencana manager (v2.44)

Tersedia di Divisi tugas lokal → Ringkasan → Kirim kebutuhan, atau Percakapan → Kotak masuk manager. Ini permintaan kerja terstruktur, bukan penyalinan histori chat privat.

- Pemilik mengisi judul, tujuan, bahan dan hasil yang diharapkan. Permintaan disimpan sebelum AI dipanggil.
- Pemeriksaan kode: profil bisnis (nama, sasaran, fakta/aturan), SOP, manager/pelaksana, provider manager, insiden, fasilitas dan sisa batas run harian. Prasyarat kurang membuat antrean menunggu; AI tidak dipanggil untuk menanyakan konfigurasi yang bisa diperiksa kode.
- Antrean existing menjalankan satu pekerjaan AI pada satu waktu. Manager memakai provider/model sendiri dan keluaran terstruktur; konteks berisi bisnis, anggota, SOP dan kebutuhan/jawaban pemilik.
- Manager boleh meminta informasi. Pemilik menjawab permintaan yang sama; riwayat dan ID tetap. Gagal/terputus memerlukan arahan dan percobaan eksplisit, tanpa retry otomatis.
- Rencana disimpan atomik melalui validasi manager-plan existing: 1–12 tugas, hanya pelaksana divisi tersebut. Rencana menjadi keputusan pending, tidak disetujui AI. Konteks yang berubah ketika AI bekerja membatalkan penyimpanan rencana lama.
- Setelah persetujuan, tugas memakai alur manual/runtime existing. Jika otomasi divisi aktif sebelum approval, pelaksana dan review manager dilanjutkan antrean existing. Kebutuhan asli pemilik tetap ikut dalam konteks pelaksana/pemeriksa.
- Satu percobaan rencana menggunakan satu run dari batas harian divisi yang sama dengan otomasi (default 8, 2–100/hari WIB). Jatah dipesan sebelum pemanggilan dan tidak dikembalikan saat gagal/dibatalkan. Permintaan rencana eksplisit tetap bisa diproses saat otomasi pelaksana nonaktif. Run manual pelaksana mengikuti aturan sebelumnya. Ini bukan pengukuran uang, token atau kuota akun provider.
- Batal mempertahankan riwayat dan menolak respons terlambat. Restart menandai percobaan yang sudah berjalan sebagai interrupted; permintaan yang belum dimulai tetap antre.
- Notifikasi membuka permintaan yang membutuhkan informasi/perbaikan. Rencana menggunakan notifikasi Keputusan existing. Bridge memberi ringkasan inbox kepada manager divisi sendiri/Builder; pelaksana tidak memperoleh inbox manager.

State schema 1 ditambah managerRequests opsional. Tidak ada migrasi destruktif, aktivasi otomatis pada tugas lama, atau perubahan akun/data pemilik. Workflow n8n dan produksi KaelaCH tetap memakai alur khusus agar tidak dijalankan ganda.

## Pekerjaan berikutnya

| Tahap | Hasil yang harus dibuktikan | Status |
| --- | --- | --- |
| 2. Bahan, artefak dan alat kerja | Satu jenis tugas dari bahan unggahan sampai berkas hasil; akses alat dibatasi per tugas, path aman, tanpa rahasia/shell bebas; preview dan keputusan terikat versi | Belum |
| 3. Titipan antar divisi | Manager menyerahkan kebutuhan dengan pengirim/penerima, izin data, hasil dan status; tidak membuat duplikat saat retry | Belum |
| 4. Jadwal dan laporan | Jam kerja, jadwal rutin dan laporan; cek pekerjaan secara lokal sebelum memanggil AI; deduplikasi, jeda dan alasan menunggu | Belum; antrean setelah approval sudah ada |
| 5. Izin integrasi dan notifikasi luar web | Pengiriman/upload/publikasi memakai tindakan eksplisit dan persetujuan sesuai payload; credential hanya server; notifikasi HP diuji | Belum; lonceng web sudah ada |
| 6. Operasional instalasi buyer | Layanan VPS, HTTPS, diagnosa tersaring, backup/restore teruji, update tidak menimpa data, installer dan aktivasi | Belum; paket sumber/onboarding lokal sudah ada |

Setiap tahap memakai tes data sementara, memelihara ID/riwayat/hasil dan keputusan, dan baru dinyatakan selesai berdasarkan bukti. Pemeriksaan AI tidak menggantikan persetujuan Founder. Integrasi/provider nyata, GUI, reboot dan pemulihan VPS perlu verifikasi terpisah; tes fixture tidak membuktikan semuanya.
