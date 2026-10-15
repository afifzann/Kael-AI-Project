# Akses pemilik kantor — tahap 7 bagian awal

Satu instalasi Kael memiliki satu akun pemilik. Akun dashboard berbeda dari kode pembelian, akun provider AI dan kunci integrasi. Pembelian/email lisensi/installer pelanggan belum tersedia pada tahap ini.

## Penyiapan pertama

1. Jalankan `npm run dev` dari folder Kael, lalu buka `http://localhost:5173`.
2. Di terminal server yang kamu kendalikan, dari folder proyek, jalankan:

   ```sh
   node scripts/owner-access.mjs
   ```

3. Masukkan kode penyiapan yang tampil ke halaman penyiapan, isi nama/email, lalu tentukan sendiri frasa sandi 8–128 karakter dan konfirmasinya. Jangan kirim kode atau kata sandi ke chat/support.
4. Sesudah akun tersimpan, kode penyiapan dikonsumsi dan kantor terbuka. Penyiapan tidak mengubah divisi, task, hasil, keputusan atau ID yang sudah ada.

Jika instalasi memakai `KAEL_DATA_DIR`, jalankan perintah kode dengan variabel direktori yang sama. Kode penyiapan tidak tersedia melalui API dan tidak dicetak oleh server ke log. Pada pemasangan pelanggan nanti, installer perlu menyediakan langkah ini secara aman; jangan menjanjikan wizard installer sudah dibuat.

## Lupa kata sandi

Jika login terus menolak setelah reset, periksa langsung di CMD/PowerShell komputer server dengan `node "C:\Kael AI\scripts\owner-access.mjs" --check-login` (sesuaikan path bila instalasi berbeda). Perintah menanyakan email dan password secara interaktif; input password tersembunyi dan tidak disimpan pada histori readline, argumen atau log. Hasil membedakan kecocokan email/password terhadap akun tersimpan; email akun ditampilkan hanya jika password cocok. Pemeriksaan tidak mengubah akun/sesi atau memakai jatah percobaan web. Jangan menjalankannya lewat chat AI, pipe atau membagikan password. Jika keduanya cocok tetapi web tetap menolak, periksa alamat/instalasi dan autofill browser; jangan langsung mereset lagi. Password dibandingkan persis, termasuk spasi; email di-trim dan dibandingkan tanpa membedakan huruf besar/kecil. CLI memakai direktori instalasinya sendiri atau KAEL_DATA_DIR jika disetel; gunakan direktori data yang sama dengan server.

Pemilik yang mengendalikan terminal server dapat menjalankan dari folder Kael:

```sh
node scripts/owner-access.mjs --reset
```

Di halaman masuk pilih **Lupa kata sandi?**, masukkan kode yang tampil, lalu tentukan dan konfirmasi frasa sandi baru minimal 8 karakter. Kode hanya berlaku sekali selama 15 menit; membuat kode baru membatalkan kode sebelumnya. Jangan kirim kode/password ke AI atau support. Pada VPS, jalankan perintah di VPS dengan user/direktori data yang sama dengan aplikasi. Server tidak perlu dihentikan untuk membuat kode.

Perintah hanya menerbitkan kode, belum mengubah password. Setelah reset berhasil, nama/email akun dan semua data pekerjaan tetap sama; seluruh sesi lama dicabut dan browser pemulihan masuk dengan sesi baru. Password lama ditolak. Hash kode terikat pada hash password sebelumnya sehingga tidak dapat dipakai ulang setelah reset, termasuk jika pembersihan berkas kode gagal. Password baru disimpan dengan penggantian berkas atomik; kegagalan penulisan tidak membuang akun lama. File akun rusak tidak dapat dipulihkan dengan membuat akun pengganti otomatis. Belum ada reset melalui email.

## Login dan sesi

Form login/setup/pemulihan menyediakan Lihat kata sandi serta petunjuk Caps Lock dan spasi tepi. Menampilkan isian tidak mengubah password; spasi tetap dihitung. Setelah pemulihan berhasil atau link pemulihan dibuka dengan sesi valid, parameter reset-password dibuang tanpa menghapus hash halaman/filter lain. Logout atau restart berikutnya kembali ke halaman login biasa.

Server menyegarkan rekaman akun sebelum menangani request, serta memeriksa lagi setelah verifikasi password. Perubahan akun oleh proses lain membatalkan sesi/jatah percobaan lama pada proses yang mendeteksinya; password baru tidak menunggu restart server tersebut. Pembacaan yang gagal menunda akses dengan HTTP 503 dan tidak mengganti akun. Ini tidak menambah dukungan multi-worker untuk state pekerjaan atau transaksi reset paralel lintasproses.

Email/kata sandi disimpan sebagai akun lokal dengan hash scrypt dan salt acak. Parameter `N=32768,r=8,p=3` mengikuti salah satu pilihan dasar [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html); implementasi memakai `node:crypto` tanpa dependency tambahan.

Sesi memakai token acak dalam cookie HttpOnly, SameSite=Strict, tanpa token login di localStorage. Token sesi di server disimpan sebagai hash. Masa maksimal 12 jam, kedaluwarsa setelah 30 menit tanpa request; polling ikut dihitung sebagai aktivitas request. Login mengganti sesi yang diberikan oleh browser tersebut; logout mencabut sesi. Restart server membatalkan semua sesi dan pengguna masuk kembali. Maksimal 10 sesi tersimpan dalam proses.

Percobaan setup/login dan pemulihan masing-masing dibatasi 5 dalam 15 menit per alamat koneksi. Status 429 mencantumkan waktu tunggu. Server mengembalikan kesalahan login generik. Endpoint akun tidak mengembalikan salt, hash, kata sandi atau kunci penyiapan.

## API dan kewenangan

Semua API pekerjaan, Builder status, runtime, produksi dan media preview memerlukan sesi. Mutasi memakai token CSRF dari sesi, di samping guard Host/Origin yang sudah ada. API publik hanya status autentikasi dan formulir setup/login/pemulihan. Kode pemulihan tidak bisa diterbitkan melalui API. Logout membutuhkan sesi dan CSRF.

Pemilik yang masuk dapat mengelola kantor dan memberi keputusan melalui gate rencana/versi hasil yang sudah ada. Belum ada akun operator/reviewer terpisah atau izin per divisi. Ini tidak menambah izin model AI untuk tindakan eksternal.

Bridge `scripts/building.mjs` memakai kunci lokal yang dibuat sesudah akun pemilik tersedia. Kunci ini hanya boleh membaca state dan mengirim perintah pengaturan tim yang diizinkan: `division`, `division-edit`, `workflow-agent`, `workflow-manager`, `workflow-delegate`. Endpoint langsung runtime/hasil/approval/media tetap ditolak. Sejak v2.40, kunci lokal yang sama juga dapat memakai POST /api/office-bridge sebagai operator lokal terpercaya: mengikat peran agent, membaca konteks lingkup peran, mengirim rencana/hasil/catatan, menjalankan task yang rencananya sudah disetujui dan mengirim proposal Builder ke preview. Server mengambil identitas dari ikatan sesi, menolak command lintasdivisi serta seluruh keputusan Founder. Ini bukan sandbox OS bagi proses yang berbagi user dan filesystem. `inspect` hanya mencetak ringkasan identitas tim; kunci tidak dicetak. Akses ke file kunci tetap harus dibatasi pada user aplikasi/pengelola yang dipercaya.

## Instalasi buyer terpisah

Setiap `KAEL_DATA_DIR` menyimpan state, akun, kode penyiapan dan kunci Builder sendiri. Direktori baru mendapat state kosong, bukan salinan tim/hasil/binding pemilik. Sesi dan kunci dari instalasi A ditolak di instalasi B.

Paket pelanggan nantinya harus mengecualikan `app-data/`, `.env`, backup pribadi, kredensial provider dan lampiran sesi. Menyalin direktori data lama bukan cara membuat instalasi buyer baru. Template produk harus berasal dari preset yang memang disiapkan untuk distribusi, bukan data kantor internal.

Tautan ke sesi Codex internal hanya tampil dari status sesi yang terverifikasi pada kantor internal. Instance direktori terpisah tidak mendapat tautan tersebut. Builder percakapan milik buyer dan konfigurasi sesinya masih bagian onboarding berikutnya; konfigurasi tim manual tetap ada.

## Penyimpanan dan batas verifikasi

Berkas akun/kunci berada di direktori data yang dikecualikan dari Git. Pembuatan file meminta permission 0600; ACL Windows dan permission deployment harus diperiksa pada lingkungan target. Rekaman akun rusak menyebabkan startup gagal tertutup, tidak dihapus atau diganti akun baru otomatis.

Pengujian memakai dua server sementara dan akun sintetis: setup, hash/password tidak bocor, API anonim ditolak, CSRF, logout, restart, rate limit, expiry, scope Builder, pemisahan buyer dan record rusak. Tes frontend memakai handler dengan DOM tiruan; belum membuktikan tampilan, password manager atau pengalaman browser nyata.

Server tetap loopback dan guard Origin masih khusus localhost. `KAEL_HTTPS=1` mengaktifkan atribut Secure pada cookie untuk konfigurasi HTTPS yang benar; flag ini tidak memasang TLS atau membuka akses domain. Reverse proxy/domain/HTTPS publik, konfigurasi provider untuk deployment, recovery melalui email, MFA, isolasi proses AI, izin tindakan eksternal, backup/restore dan paket installer belum lengkap. Jangan membuka port dev langsung ke internet berdasarkan fitur login ini saja.
