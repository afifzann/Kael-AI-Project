# Pemantauan n8n — Laxholm Furniture

## Konfigurasi yang disepakati

Perusahaan **Laxholm Furniture**, divisi **Marketing Outdor**, manager **Bu Yuli**, agent workflow **Date** dan **Mails**. Date mewakili **LAXHOLM Product Database & AI Search**. Mails mewakili **Laxholm - Email Order ke Order Sheet - Bu Yuli**, memantau proses, riwayat dan error workflow email order ke Order Sheet. Bu Yuli mengawasi agent divisinya, merangkum progres/error serta menjadi perantara laporan ke Founder; tidak lagi terikat langsung ke workflow. Satu workflow tetap satu binding/agent. Meja, badge dan identitas Bu Yuli tetap manager; setiap pelaksana mendapat karakter serta workstation otomatis. Pekerjaan dijalankan workflow n8n, bukan karakter visual.

Menurut kebutuhan pemilik, workflow mengelola tujuh kategori Google Sheets: tambah produk melalui form (validasi, CBM, urutan, verifikasi simpan), pencarian chat/Telegram (AI membantu memilih, angka tetap dari Sheets), Product List buyer (template, tautan Telegram, riwayat), dan akses Telegram satu pengguna. Ubah/hapus produk dimatikan; koreksi langsung di Sheets. Integrasi Kael tidak mengimplementasikan ulang atau mengaudit aturan bisnis tersebut, tidak membaca sheet langsung dan tidak mengubah workflow produksi.

## Akses dan menjalankan

Isi `N8N_BASE_URL` dan `N8N_API_KEY` di `.env`, kemudian `npm run dev`. URL instance HTTPS, tanpa kredensial/query/fragment; akhiran `/api/v1` juga dinormalisasi bila ada. Key dimuat hanya proses backend melalui fitur bawaan Node24; jangan gunakan prefix `VITE_`. File `.env` diabaikan Git, `.env.example` hanya template kosong. Mengubah file memerlukan restart backend.

Menu **Workflow n8n** memuat status dan riwayat. Tim & divisi atau karakter 3D membuka profil Date/Mails dengan panel workflow masing-masing; profil Bu Yuli menampilkan panel workflow anggota divisinya. Panel menampilkan waktu sinkron, jumlah berjalan/menunggu, metadata eksekusi, durasi, node/pesan error yang tersedia dan tautan n8n. Detail yang terbuka dipertahankan saat polling.

Backend hanya GET metadata workflow, daftar eksekusi dan detail error. Tidak ada run/retry/stop/activate/update/delete, akses credential n8n, pengiriman Telegram atau penulisan Sheets. Detail error memakai allowlist; payload input/output/runData dan stack tidak diteruskan. API key sendiri, pola token, URL diagnostik dan email disamarkan; jangan menganggap pemotongan diagnostik sebagai audit semua jenis data sensitif. Respons vendor gagal tidak ditampilkan mentah.

## Status dan error

- Backend memeriksa sekitar 5 detik **setelah** pemeriksaan sebelumnya selesai; kegagalan mencoba lagi setelah 15 detik. Browser mengambil state setiap 5 detik, ditunda ketika tab tersembunyi, dialog terbuka atau sedang mengisi form. Jadi pembaruan tidak instan dan dipengaruhi jaringan serta kedua interval.
- Eksekusi berjalan membuat agent mengetik. Menunggu, nonaktif, belum sinkron atau koneksi putus tidak dianggap bekerja. Data berumur lebih 20 detik dianggap kedaluwarsa. Saat workflow aktif dengan data lengkap menunggu trigger atau memiliki eksekusi waiting, agent boleh memakai aktivitas santai visual. Running/error menghentikan kunjungan; data putus/sebagian dan workflow nonaktif tidak ikut. Gerak ini tidak melanjutkan atau menyelesaikan eksekusi waiting.
- Monitor workstation menampilkan metadata/status n8n, menggantikan layar demo untuk agent workflow. Gerak karakter tetap representasi visual; pekerjaan tetap dijalankan n8n di VPS.
- Error baru sejak pemasangan/pemulihan dipetakan ke agent, divisi, workflow dan executionId, lalu disimpan atomik sebagai insiden medis. Pada koneksi awal agent tanpa riwayat insiden, hasil eksekusi selesai terakhir yang masih error/crashed juga masuk medis meskipun terjadi sebelum pemasangan. Error historis yang diikuti keberhasilan tidak ditarik sebagai pasien. Insiden tetap aktif sampai pemilik mencatat pemulihan; keberhasilan berikutnya tidak menutupnya otomatis. Pemulihan eksplisit mencegah error historis diputar ulang.
- Pemulihan tidak memperbaiki kredensial atau menghentikan/menjalankan ulang n8n. Workflow dapat tetap memiliki proses aktif sementara karakter berada di medis; panel menampilkan keduanya. Error lain selama satu insiden aktif tetap tersedia dalam riwayat n8n. Kasur/antrean memakai sistem medis yang sudah ada.
- Agent workflow ditolak dari briefing manual/sesi fasilitas lokal agar aksi lokal tidak menyatakan dapat menjeda proses eksternal. Kunjungan ambient saat idle/waiting yang memenuhi syarat tetap visual.

## Batas pemantauan

Polling dapat melewatkan fase berjalan yang sangat singkat; eksekusi tersimpan masih terlihat pada pembaruan berikutnya. Riwayat diambil dari 100 eksekusi terbaru, panel menampilkan maksimal 10 (profil 3); detail error maksimal 10 per pemeriksaan dan respons dibatasi2MB. Daftar running/waiting memakai pagination sampai 500 per status; bila terpotong, indikator data belum lengkap muncul. Ini bukan audit historis menyeluruh; error di luar jendela 100 atau eksekusi yang tidak disimpan n8n mungkin tidak terlihat. Penentuan error baru mengandalkan timestamp eksekusi VPS dan waktu lokal yang tersinkron.

Snapshots berada di memori backend, tidak ditulis ke `state.json`; binding, identitas dan insiden tetap tersimpan. Setelah restart koneksi disinkron ulang. Fitur instan melalui event/webhook, filter divisi pemakai pada workflow bersama, editor mapping web, edit identitas agent workflow, serta retry/perbaikan otomatis belum tersedia. `division-edit` tetap untuk tim manual, termasuk ketika manager n8n tidak memiliki binding langsung.

## Bridge

`workflow-agent` membuat satu anggota dengan `company`, `name` divisi, `agent`, `role`, `workflowId`, `workflowName`. Jika divisi/perusahaan sama sudah ada, workflow berikutnya menambahkan satu anggota, maksimal 12; workflow duplikat dan nama anggota ganda ditolak. Gunakan `inspect → preview → apply` dengan revisi terbaru. Contoh konfigurasi awal ada di `proposals/laxholm-marketing-outdor.json`; revision 2 di sana adalah riwayat penerapan, jangan diulang tanpa inspect. Binding tidak berisi API key.

## Bukti

45 tes otomatis termasuk polling → insiden medis → pemulihan → restart dengan transport palsu, pagination, validasi, redaksi dan pelestarian tim lama. Pembacaan API VPS nyata serta HTTP lokal berhasil; tidak ada mutasi n8n. Pada pengecekan 12 Oktober 2026: aktif, 0 berjalan, 50 menunggu; error historis#2397 pada Assistant Agent melaporkan kegagalan autentikasi. Angka ini observasi sesaat, bukan status tetap.

Lihat `../evidence/n8n-integration.json`. Pemeriksaan browser tidak terlaksana: automatic approval review gagal 429 Too Many Requests saat membuka localhost. Tidak ada screenshot atau klaim lulus visual untuk fitur baru. Belum memicu pekerjaan/error produksi demi pengujian.

Referensi resmi: [API key dan scopes](https://docs.n8n.io/connect/n8n-api/authentication.md), [error handling](https://docs.n8n.io/build/flow-logic/handle-errors-gracefully.md), [Log Streaming Enterprise](https://docs.n8n.io/administer/observe-and-log/stream-logs-to-external-systems.md).

## Manager dan delegasi

Pada 14 Oktober 2026, Mails ditambahkan melalui `proposals/laxholm-mails-email-order.json` (revision 7 → 8). Binding memakai workflow aktif `MNvhI66uX8w24INj`, dengan nama persis **Laxholm - Email Order ke Order Sheet - Bu Yuli**; workflow tanpa akhiran “Bu Yuli” adalah workflow lain. Konfigurasi Bu Yuli dan binding Date dipertahankan. Penambahan ini hanya memasang pemantauan; tidak mengubah atau memicu workflow VPS.

`workflow-delegate` menerima `managerId`, `workflowId`, `agent`, `role`, `managerRole`. Hanya manager yang masih memiliki binding tersebut boleh menyerahkannya ke satu agent baru dalam divisi yang sama. Nama unik dan batas12 anggota diperiksa. Binding dipindah, bukan disalin; monitorFrom tetap. Insiden executionId milik manager dipindahkan ke pelaksana baru, tanpa menghapus alasan, tanggal, kasur atau catatan pulih. Insiden pribadi manager tidak ikut. Pekerjaan/keputusan lama dan riwayat event tidak ditulis ulang, tidak ada resume/retry otomatis. Gunakan revision terbaru dan inspect → preview → apply → inspect.

Bu Yuli memantau hanya divisinya: insiden aktif agent menjadi “perlu bantuan”; running/waiting menunjukkan jumlah proses; workflow nonaktif ditandai. Data hilang/invalid/kedaluwarsa/sebagian menyebabkan pantauan belum lengkap. Insiden yang sudah diketahui tetap ditunjukkan meski koneksi putus; panel workflow menyertakan waktu sinkron dan ketidaktersediaan sumber. Bu Yuli tidak dianggap pasien karena error Date. Date tetap mengikuti aturan incident/recovery n8n. Chat AI dan perbaikan otomatis belum tersedia.

## Chat manager Telegram — target berikutnya

Tujuan: Founder dapat memanggil manager, misalnya `@buyuli apa ada error?`, dari Telegram tanpa membuka web. Routing memakai ID manager dan divisi yang tersimpan, dengan alias unik yang dikonfigurasi; perubahan nama tampilan tidak boleh mengganti identitas atau scope. Setiap jawaban membaca data divisinya sendiri dan menyebut waktu sinkron. Pertanyaan status/error merangkum agent, workflow, eksekusi, node, alasan tersamarkan yang tersedia dan status pemulihan; data putus/sebagian atau error lama harus dibedakan dari insiden aktif. Tidak mengirim API key, payload produk, stack atau kredensial.

Kebutuhan sebelum aktivasi: token bot BotFather hanya di env backend, identitas bot/alias yang benar, allowlist Telegram user ID dan chat ID milik Founder, pilihan long polling atau webhook, deduplikasi update dan penyimpanan mapping manager. Nama `@buyuli` masih contoh alias logis, bukan username bot yang sudah terdaftar. Bot bersama di grup dengan privacy mode tidak otomatis menerima semua alias mention; gunakan command ditujukan ke username bot yang sebenarnya atau konfigurasi privasi yang sengaja dipilih pemilik, tetap dengan allowlist. Lihat [BotFather](https://core.telegram.org/bots/features#botfather) dan [penerimaan pesan/privacy mode](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get).

Kriteria penerimaan koneksi nanti: chat Founder berizin dijawab identitas manager yang dipilih; lintas divisi/identitas tak dikenal ditolak; error Date dapat ditelusuri sampai workflow/eksekusi/node; koneksi putus tidak dijawab sehat; replay update tidak menggandakan jawaban; bot tidak menjalankan/retry/mengubah workflow; keputusan Founder tetap melalui gate preview/versi aplikasi. Sistem percakapan manager harus mengungkap sumber yang tidak tersedia, tanpa mengarang jawaban. Belum ada bot atau runtime chat manager yang diaktifkan oleh perubahan v2.19 ini.
