# Sesi agent — v2.40

Jalur utama sekarang: `jadi <nama agent>` di sesi aplikasi AI pada folder kantor. Ikatan peran/memori/task/keputusan tersinkron melalui server Kael; hook Claude membaca konteks native, Codex memakai bridge sessionId. Tidak mengimpor atau mengubah memori uji Kaela lama. Rincian: [OFFICE-ROLES.md](OFFICE-ROLES.md).

## Arsip uji sesi Kaela di Codex

Sesi ini adalah chat khusus Kaela di project Kael AI, dengan model sesuai pengaturan Codex. Tidak mengganti model/runner produksi web.

## Cara melanjutkan riwayat

1. Buka project Kael AI di sidebar Codex, lalu pilih chat **Kaela** yang sama.
2. Kirim pesan lanjutan di sana. Jangan membuat chat baru untuk setiap pesan.
3. Profil: `docs/agents/kaela/PROFILE.md`. Ringkasan konteks: `MEMORY.md`. Catatan penting: `HISTORY.md`, di direktori yang sama.
4. Jika membuat sesi baru, minta sesi itu membaca profil, memori dan catatan terbaru terlebih dahulu. File tersebut menyediakan ringkasan, bukan seluruh riwayat chat lama.

Instruksi awal sudah meminta Kaela memperbarui catatan penting setelah gilirannya; ini perilaku sesi agent, bukan service sinkronisasi background. Keberhasilan tulis harus diperiksa. Jangan menyimpan rahasia, seluruh chain-of-thought atau payload sensitif.

## Pengujian

Pesan pertama memberikan catatan TEST yang tidak terkait produksi. Pesan kedua di chat yang sama meminta identitas dan catatan itu tanpa mengulang nilainya. Periksa respons, file memori dan catatan hasil. Tes ini tidak membuktikan pemulihan setelah laptop mati, sinkronisasi Claude, atau koneksi percakapan web. Jangan membuat keputusan produksi berdasarkan catatan TEST.

### Hasil 13 Oktober 2026

Chat Codex **Kaela** dibuat dalam project Kael AI, threadId `01a1350c-9a52-73c3-ba7d-beaa9c24b741`, dengan model default sesi (tidak mengunci model tertentu). Dua giliran selesai. Pada giliran kedua, commentary menyebut identitas Kaela, kode TEST `KAELA-RIWAYAT-13OCT` dan preferensi preview ditonton sebelum approval, sebelum command membaca file. MEMORY/HISTORY kemudian diverifikasi dan diperbarui. Urutan tersebut diperiksa melalui read_thread, bukan hanya klaim jawaban akhir.

Hash state kantor tetap `045738D99BC34799CE73F3B5612E08BE17AC5F26EB143837AB086BB67B046DF4`; pengujian tidak menjalankan produksi atau mengubah binding/workflow. Bukti: `evidence/kaela-session-check.json`. Ketersediaan model tertentu, restart laptop, sesi Claude dan sinkronisasi percakapan web belum diuji.

Jika dua aplikasi memakai profil Kaela yang sama nanti, keduanya harus membaca catatan terkini sebelum bekerja. Penyimpanan file belum memiliki antrean penulisan lintas aplikasi; gunakan satu sesi penulis pada satu waktu.
