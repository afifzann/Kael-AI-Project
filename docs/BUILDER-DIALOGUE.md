# Builder — preview tim dan SOP

**v2.40:** percakapan utama ada di aplikasi Claude/Codex, melalui peran `jadi builder`. Usulan sesi itu muncul pada preview web yang dijelaskan di sini; draft desktop tidak berubah menjadi chat web. Fitur percakapan web tetap menjadi pilihan opsional dan draft lama dipertahankan. Mulai dari [OFFICE-ROLES.md](OFFICE-ROLES.md).

Buka **Builder → Mulai diskusi**, pilih divisi baru atau edit divisi tugas lokal, lalu pilih Claude/Codex dan model opsional yang tersedia pada akun server. Diskusi memakai login CLI pemilik instalasi. Model kosong memakai default CLI; koneksi terdeteksi tidak menjamin semua model/kuota tersedia.

1. Ceritakan tujuan dan output yang diinginkan. Builder memakai konteks bisnis serta jawaban sebelumnya, bertanya satu hal per giliran jika perlu, dan menyarankan tim kecil.
2. Preview memuat nama divisi, manager, pelaksana/tugas, SOP/serah terima, kriteria hasil, batas tindakan, serta kebutuhan ruangan dari preset kantor.
3. Koreksi lewat chat atau edit form preview. Klik **Simpan perubahan** sebelum menerapkan; keystroke form/pesan yang belum dikirim tidak disimpan. Perubahan lokal dapat dibuang untuk kembali ke draft terakhir.
4. Klik **Buat divisi & SOP** atau **Terapkan perubahan tim & SOP**. Tombol ini menyetujui konfigurasi, bukan rencana/hasil kerja. Belum ada pekerjaan dimulai otomatis.
5. Buka Divisi untuk memeriksa anggota/SOP dan membuat briefing. Provider/model preview hanya berlaku bagi anggota baru; setelan anggota lama tetap. SOP baru menjadi versi baru, briefing lama mempertahankan versi sebelumnya.

Diskusi tersimpan pada instalasi ini dan bisa dipilih kembali setelah refresh/restart. **Batalkan usulan** menutup draft tanpa mengubah tim; riwayat tetap tersimpan. **Hentikan giliran** membatalkan respons yang sedang berjalan; hasil terlambat diabaikan. Jika server berhenti, pesan terakhir tetap ada dan giliran tidak diulang otomatis. Pilih **Coba lagi** dengan sadar karena memakai kuota provider.

Jika kantor berubah setelah proposal dibuat, penerapan ditolak. Lanjutkan diskusi agar Builder meninjau data terbaru, kemudian periksa usulan baru. Konflik versi diskusi juga ditolak; perubahan yang belum disimpan tidak boleh menimpa diskusi halaman lain. Catatan penerapan disimpan atomik bersama tim/SOP sehingga retry atau restart tidak menggandakan divisi setelah penerapan berhasil.

## Batas yang tersedia sekarang

- Satu giliran Builder aktif per instalasi, satu manager dan 1–12 pelaksana per usulan. Arsip lokal dibatasi 100 diskusi, masing-masing sekitar 30 giliran; pengarsipan/ekspor khusus belum tersedia.
- Edit mempertahankan semua pelaksana lama dan manager ID; bisa mengubah nama/peran dan menambah pelaksana. Pengarsipan anggota tetap memakai alur Anggota. Divisi dengan binding workflow dan produksi khusus KaelaCH tidak diedit melalui chat ini; keduanya memakai konfigurasi tersendiri agar routing eksekusi tetap terjaga.
- Ruangan, furnitur dan karakter mengikuti preset jumlah anggota. Preview berupa daftar kebutuhan, bukan render draft 3D atau editor geometri/furnitur bebas. Penambahan anggota dapat menyesuaikan penataan otomatis.
- Belum membuat integrasi n8n/Telegram/Obsidian, rahasia, editor profil bisnis, manager otonom atau tindakan eksternal. Jangan memasukkan password/token ke chat.
- Percakapan ini dibuat di web, terpisah dari riwayat Codex/Claude desktop. Riwayat desktop tetap tidak dibaca/ditampilkan. Studio Builder mengikuti giliran web yang aktif; bridge sesi coding agent lama tetap ada.

## Implementasi dan pemeriksaan

`server/builder-dialogue.mjs` menyimpan `builder-discussions.json` di direktori data instalasi. Tidak masuk paket buyer atau Git. API `/api/builder-discussions` membutuhkan sesi pemilik dan CSRF untuk mutasi; kunci Builder bridge tidak mendapat akses chat/penerapan. Model hanya mengembalikan usulan; perubahan kantor memakai perintah internal `builder-apply` dengan validasi domain dan revision guard. Claude memakai adapter tanpa alat/MCP, Codex memakai adapter sandbox read-only yang sama dengan tugas lokal; ini bukan klaim sandbox OS lengkap.

Arsip chat harus ikut backup privat direktori data. Rekaman rusak gagal tertutup dan tidak diganti otomatis. Tes otomatis memakai fixture, mencakup ID/versi/SOP, gagal/retry/stop/restart, konflik, autentikasi, provenance penerapan, escaping dan handler UI. Uji opt-in `node scripts/check-builder-runtime.mjs Claude` memakai kuota akun dengan data sintetis terpisah; tidak memuat/mengubah kantor pemilik. Uji nyata Claude menghasilkan tim/SOP pada `evidence/builder-smoke/run-yktSFw/check.json`, tanpa tugas/keputusan otomatis. Codex Builder, seluruh model dan QA visual/browser langsung belum diuji sungguhan.
