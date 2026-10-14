# Audit alur dashboard — 14 Oktober 2026

Panduan: ECC click-path-audit untuk handler/state yang berubah, UI/UX Pro Max untuk navigasi dan status. Lingkup dashboard dan penghubung preview/profil; backend, SOP dan geometri kantor di luar perubahan. Ini audit kode dan tes otomatis, bukan hasil inspeksi browser.

## Peta state dan reset

| Pemilik | Aksi | State yang berubah / efek samping |
| --- | --- | --- |
| Operations | showOperations | Tutup profil, lepaskan inert, tampilkan dashboard, render, tutup menu HP |
| Operations | openDivision | Pilih divisi, reset pilihan workflow, buka ruang kerja |
| Operations | openProduction | Pilih divisi pemilik episode, pilih episode, buka produksi, scroll ke atas |
| Operations | enterRoom | Pilih ruangan, tampilkan kantor, dispatch room; URL menjadi office/room |
| Operations | render | Mengganti isi main; mempertahankan disclosure workflow/anggota/aktivitas dan fokus kontrol; commit URL hanya saat berubah |
| Operations | restoreRoute | Validasi konteks, reset pemilihan produksi untuk route, tampilkan halaman; menahan push history selama restore |
| Workflow | Filter/query/tanggal | Mengganti filter workflow tersebut, page kembali 1; tidak menulis backend |
| Production | select | Memilih episode/tab/versi; reset watched/edit/reject/confirmArchive |
| Production | act | Tangkap episode/revision/version, busy selama request; reset form hanya setelah berhasil |
| Builder | Lanjut/Ubah | Menyimpan draft browser dan langkah; belum membuat tim |
| Builder | Terapkan tim | API command revision-protected; membersihkan draft setelah berhasil |
| Preview | capture | Sementara mengganti ukuran/pixel ratio renderer; selalu mengembalikan keduanya; kamera viewport tidak dipakai untuk capture |

## Jalur yang ditelusuri

| Kontrol | Urutan & hasil yang diharapkan | Bukti / batas |
| --- | --- | --- |
| Ringkasan / sidebar / tab divisi | set konteks → render → push URL → scroll; Back memulihkan route tanpa push baru | Roundtrip route dan penolakan parameter tak valid diuji; browser belum diuji |
| Pekerjaan aktif | hitung produksi + manual + workflow → buka daftar → buka task/episode/workflow terkait | Tes hitungan tanpa duplikasi dan isolasi divisi |
| Error di Ringkasan | agent/binding/incident → workflow terkait atau profil agent; produksi blocked → episode | Penelusuran handler; tidak mengubah status error saat membuka |
| Preview Founder | request cuplikan → kamera Founder → render WebP → restore renderer → tampil timestamp | Bounding corners dan restore success/failure/context-lost diuji; gambar GPU belum dilihat |
| Buka ruang Kael | enterRoom(founder) → showOffice → event room → reset kamera Founder | Trace kode; layout/rig kantor tetap |
| Profil → Back dashboard | showOperations → close-profile → closeDetails → updateProfileModal → render dashboard | Menutup overlay dan inert yang sebelumnya bisa tertinggal; pemeriksaan DOM/browser belum tersedia |
| Workflow picker | pilih ID → scope binding → render → URL workflow | Konteks ID divalidasi saat restore |
| Query/status/tanggal | update filter milik workflow → reset page → render → restore fokus | Tes search ID/node/error, failed group, tanggal batas WIB, filter kosong dan tanpa mutasi |
| Paging/reset | page berubah → helper clamp → render; kontrol arah dipakai untuk mengembalikan fokus | Clamp/paging diuji; fokus aktual browser belum diuji |
| Keputusan episode | decision target → episode → openProduction → preview/versi/keputusan | Tidak membuka modal persetujuan manual untuk hasil produksi; gate backend tetap diuji |
| Pilih episode/tab/versi | update selection → write URL → render; video yang sama dipertahankan | Route serialisasi diuji; watched kembali false pada versi/episode berbeda |
| Setujui | watched + latest version + ready + review → action dengan revision/version | Tes server/production menolak bypass dan versi/state tidak valid |
| Minta revisi | buka form → simpan judul/arahan → action edit → versi baru | Backend version/revision dan pembatalan diuji; input tetap saat request gagal |
| Tolak | buka form inline → required alasan → action reject → form ditutup setelah berhasil | Tanpa window.prompt; validasi backend dan alasan tetap berlaku |
| Arsipkan | tampilkan dampak & nama episode → cancel atau confirm → action delete | Tidak mengirim request dari klik pertama; cancel tidak menulis. Backend abort/archive diuji |
| Upload | pilih chapter/VO → validasi → upload → episode terpilih/tab chat → URL baru | SOP, preview, keputusan dan archive persistence diuji di fixture terpisah |
| Menu HP | native summary → menu; Escape/klik luar/navigasi menutup | Lima tujuan utama, disclosure alat/ruangan; sentuhan/screen reader belum diperiksa |
| Builder | tautan ke sesi Codex atau buka konfigurasi manual → preview → terapkan | Tidak menampilkan chat Codex atau mengklaim form sebagai AI; command atomik diuji |

## Hasil dan pekerjaan yang belum diverifikasi

- 90 tes lulus; build berhasil. UI tests mencakup route, history, overview dan kamera/renderer preview.
- Frontend, stylesheet/source, API merespons HTTP 200. Data pemilik tetap revision 7, 2 divisi dan 6 anggota divisi.
- SHA256 state sebelum/sesudah: `045738D99BC34799CE73F3B5612E08BE17AC5F26EB143837AB086BB67B046DF4`.
- Riwayat hanya memfilter snapshot tersedia; batas backend 100 eksekusi tetap diberi label. Cuplikan Founder statis, bukan indikator kerja AI realtime.
- Browser alat menolak URL lokal; tidak memakai jalur browser/CDP alternatif. Layout aktual 375/768/1440, focus/paging/Back di browser, GPU/cuplikannya, menu HP, video/approval dan screen reader belum diverifikasi langsung.
