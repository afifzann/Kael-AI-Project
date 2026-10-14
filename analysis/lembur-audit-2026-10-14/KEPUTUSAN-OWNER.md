# Lembar keputusan owner Kael

Tanggal: 14 Oktober 2026. Ringkasan delapan keputusan di [10-QUESTIONS-AND-UNKNOWNS.md](10-QUESTIONS-AND-UNKNOWNS.md) bagian B. Semua rekomendasi di sini berstatus **REKOMENDASI** dan disusun untuk satu tujuan: Kael sebagai produk self-hosted yang dijual lepas, dipasang di VPS pelanggan, dengan pusat minimal hanya untuk lisensi dan update (pendekatan B, laporan 07).

Cukup jawab dengan huruf pilihan per nomor. Tiga yang paling mendesak, karena menentukan langkah koding berikutnya, adalah nomor 1, 2 dan 3.

## 1. Siapa pengguna pertama?

- **A. Pilot tertutup** (kamu sendiri + 1–3 pelanggan yang kamu kenal). Login, installer dan backup harus jadi, tapi dukungan bisa langsung lewat chat.
- **B. Langsung dijual publik.** Semua syarat laporan 08 §6 harus lolos dulu; paling lama sampai bisa mulai.
- **C. Pakai pribadi dulu.** Tetap di komputer lokal; login, installer dan lisensi bisa ditunda.

Rekomendasi: **A**. Memberi data nyata (gagal instal, waktu support, biaya AI) sebelum menentukan harga, tanpa risiko komplain publik.

## 2. Provider AI pertama yang didukung?

- **A. Codex CLI.** Sudah berjalan di tahap 5; pelanggan login dengan akunnya sendiri dan membayar sendiri.
- **B. Claude Code CLI.** Butuh adapter baru dan pemeriksaan cara login serta kuota.
- **C. API key berbayar per token** (provider mana pun). Biaya paling bisa diukur, tetapi pelanggan harus mengelola kunci dan tagihan.

Rekomendasi: **A** dulu, lalu C sebagai pilihan kedua. Ketentuan provider tentang pemakaian akun langganan di dalam produk yang dijual **BELUM DAPAT DIPASTIKAN** dan perlu kamu cek sebelum jual publik.

## 3. Model lisensi?

- **A. Sekali bayar per instalasi + update 1 tahun**, perpanjangan update opsional. Satu slot aktif, pindah VPS mudah.
- **B. Langganan bulanan.** Pendapatan rutin, tetapi aplikasi harus bisa terkunci saat berhenti bayar, yang lebih sering memicu komplain.
- **C. Sekali bayar, update selamanya.** Paling menarik saat jual, tetapi biaya support jangka panjang tidak tertutup.

Rekomendasi: **A**. Server lisensi mati atau masa update habis tidak boleh mengunci aplikasi, data, atau backup; hanya update baru yang berhenti. Harga diputuskan setelah pilot.

## 4. Seberapa jauh agent boleh bertindak?

- **A. Baca dan tulis di folder kerjanya sendiri; semua aksi keluar wajib approval** (kirim pesan, publikasi, pembayaran, menjalankan atau retry n8n).
- **B. Baca saja.** Paling aman, tetapi agent tidak bisa menghasilkan file kerja.
- **C. Bebas dalam divisinya.** Cepat, tetapi kesalahan bisa langsung keluar ke pelanggan atau publik.

Rekomendasi: **A**. Sejalan dengan aturan Kael sekarang: hasil AI selalu menunggu pemeriksaan dan approval tidak pernah otomatis.

## 5. Data dan backup?

- **A. Semua data di VPS pelanggan**, backup terenkripsi dengan kunci milik pelanggan, support hanya menerima paket diagnosis yang sudah disaring.
- **B. Backup otomatis ke cloud milik Kael.** Nyaman, tetapi Kael ikut menyimpan data pelanggan dan tanggung jawabnya naik.
- **C. Tanpa backup bawaan**; pelanggan atur sendiri.

Rekomendasi: **A**. Paling mudah dijelaskan ke pembeli dan sesuai pendekatan B. Lama penyimpanan chat bisa default "simpan semua" dulu, dengan opsi hapus nanti.

## 6. Telegram dan Obsidian?

- **A. Tunda sampai login dan izin (P2) selesai**, lalu Telegram baca-saja untuk manager dengan daftar chat yang diizinkan.
- **B. Aktifkan sekarang untuk pemakaian lokal** dengan batas localhost.
- **C. Tidak dijadikan fitur produk.**

Rekomendasi: **A**. Telegram ke Bu Yuli berguna, tetapi tanpa login dan allowlist ia membuka pintu ke data divisi.

## 7. Audio KaelaCH?

- **A. VO direkam atau diunggah sendiri** dulu.
- **B. TTS berbayar.** Lebih cepat per video, tetapi ada biaya dan hak suara yang harus jelas.
- **C. Tunda; video tanpa suara.**

Rekomendasi: **A**. Tanpa biaya tambahan dan hak suaranya jelas; TTS bisa ditambah setelah biaya per video diukur.

## 8. Distribusi dan dukungan?

- **A. Satu target: Ubuntu 24.04 x86_64**, domain milik pelanggan, satu kanal update stabil, dukungan lewat chat di jam kerja.
- **B. Banyak distro dan arsitektur sejak awal.** Pasar lebih luas, tetapi biaya uji jauh lebih besar.
- **C. Domain disediakan dan dikelola Kael.** Lebih mudah untuk pembeli awam, tetapi Kael harus mengurus DNS dan sertifikat semua pelanggan.

Rekomendasi: **A**. Satu jalur yang benar-benar diuji lebih berharga daripada banyak jalur setengah jadi; C bisa jadi add-on nanti.

## Setelah dijawab

Jawaban 1–3 menutup P0 di [09-IMPLEMENTATION-ROADMAP.md](09-IMPLEMENTATION-ROADMAP.md). Dengan rekomendasi di atas, langkah koding berikutnya adalah menyelesaikan P1 (konteks per agent yang tersimpan, antrean yang tahan restart), lalu P2 (login owner dan izin) sebelum Kael dibuka di luar localhost.
