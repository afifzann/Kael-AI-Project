# 09 — Roadmap implementasi KAEL setelah audit

Status: usulan urutan; **tidak ada pekerjaan pengembangan produk atau deployment yang diaktifkan oleh dokumen ini**. Estimasi tanggal/biaya menunggu kapasitas tim dan pilihan owner. Setiap tahap memiliki acceptance criteria, bukan label selesai berdasarkan keberadaan file.

Label kepastian: **TERBUKTI** = terlihat langsung di kode/metadata; **INDIKASI** = didukung struktur tetapi belum diuji; **HIPOTESIS** = penalaran yang perlu diuji; **BELUM DAPAT DIPASTIKAN** = butuh server vendor, VPS Linux, atau uji jalan yang tidak dilakukan; **REKOMENDASI** = usulan untuk Kael, bukan fakta tentang Lembur. Urutan fase = **REKOMENDASI**. Baris "Status Kael" = **TERBUKTI** dari repo per 14 Oktober 2026 (lihat `docs/PROGRESS.md`).

## P0 — Keputusan dan baseline

Status Kael: belum. Keputusan dirangkum di [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md).

Kunci kebutuhan self-hosted, satu bisnis per instalasi, role owner/operator/reviewer, satu provider pertama, batas tindakan eksternal, versi/lisensi/update/support, platform Linux yang akan diuji dan perlakuan data bisnis. Rekonsiliasi PRD: F17/F20/F23 lama tidak menggambarkan pipeline KaelaCH/n8n terbaru. Simpan capability manifest dan daftar perbedaan.

Keluar bila: keputusan penting laporan 10 terjawab; data Kael sekarang punya backup terverifikasi; scope migrasi dan invariannya tertulis. Bergantung audit ini, bukan perubahan UI baru.

## P1 — Runtime dan konteks per agent

Status Kael: sebagian. Ada runtime Codex per agent dengan model per agent, satu run per agent, hentikan run, dan run berjalan menjadi interrupted saat server restart tanpa ulang otomatis (`server/runtime.mjs`). Belum: konteks percakapan/memori per agent yang tersimpan, antrean durable dengan lease, adapter Claude/Hermes.

Ekstrak adapter Codex yang sudah ada ke kontrak capability/status/start/cancel/checkpoint/output/usage. Pilih satu adapter produksi terlebih dahulu; Claude/Hermes kemudian setelah verifikasi auth dan capability. Persist conversation ID, ringkasan memori dan model binding per agent. Gunakan queue durable/lease, pembatasan concurrency dan retry policy.

Keluar bila: dua agent punya konteks terpisah; mengubah model tidak menghapus hasil; restart di tengah run menjadi interrupted tanpa biaya ulang otomatis; kuota/auth error tampil jujur; task bersamaan tidak menguasai satu agent; lease hilang tidak menggandakan side effect. Uji dummy adapter dan satu sandbox provider yang disetujui owner sebelum klaim E2E.

## P2 — Login, izin, approval dan broker

Status Kael: belum. Yang ada baru Host/Origin guard loopback dan approval terikat versi hasil terbaru.

Sebelum app diakses publik: login aman, rate limit, session expiry/rotation, server-side scopes, CSRF/origin guard, tool allowlist dan secret isolation. Approval atomik mengikat versi/hash/action; external action memakai outbox dan rekonsiliasi unknown. Prompt SOP tidak menggantikan pemeriksaan server.

Keluar bila: pengguna tak berizin/lintas divisi ditolak; stale/hash berubah/replay keputusan gagal; credential tak muncul di API/log/support bundle; timeout publikasi tidak menimbulkan retry otomatis; model tak dapat mereset login owner atau mengedit policy. Bisa dikembangkan paralel dengan P1, tetapi keduanya harus lulus sebelum deployment publik.

## P3 — Migrasi storage dan backup/restore

Status Kael: belum. Data masih satu file JSON dengan revision check.

Migrasikan revision JSON ke storage transaksional secara idempotent. Pertahankan semua ID Bu Yuli/Date/Mails/Kaela, task, result versions, decisions, workflow bindings dan incidents. File besar tetap di artifact store. Tambahkan backup/restore preview, metadata/checksum, maintenance lock dan retention.

Keluar bila: perbandingan fixture sebelum/sesudah lengkap; dua proses tidak menimpa data; restore pada instalasi baru mempertahankan approval dan status action sent tanpa mengirim ulang; gagal restore kembali ke baseline. Enkripsi memakai kunci recovery pelanggan dan tidak menganggap salinan DB hidup sebagai snapshot konsisten.

## P4 — Jalur installer pelanggan

Status Kael: belum.

Preflight OS/disk/RAM/ports, perubahan proxy yang dapat ditinjau, user non-root tanpa sudo runtime, setup DB/direktori, bootstrap owner sekali pakai, service healthcheck, domain sendiri/HTTPS dan diagnosis. Installer memiliki step journal dan tidak menimpa layanan host yang sudah ada.

Keluar bila: install bersih dan rerun lolos; crash tiap tahap bisa dilanjutkan; port DB/worker tak terbuka publik; secret permission terverifikasi; VPS dengan proxy/aplikasi lain tidak rusak; instalasi baru dapat menjalankan satu tugas melalui jalur P1/P2/P3.

## P5 — Update/release/lisensi minimum

Status Kael: belum.

Pipeline build SBOM/daftar dependensi → manifest signed → staging → backup/migrasi → switch → healthcheck → commit/rollback. Pusat hak unduh/update terpisah dari task/customer data. Lisensi memisahkan pembelian, slot aktivasi, hak software, hak update dan dukungan.

Keluar bila: paket salah signature/hash/versi/arsip ditolak; update gagal tidak meninggalkan campuran file; rollback DB/kode kompatibel; offline grace dan migrasi slot mengikuti kontrak; server pusat mati tidak menghilangkan pekerjaan/data/akses backup. Backend lisensi buatan KAEL harus diuji sendiri, bukan menganggap respons client Lembur membuktikan implementasinya.

## P6 — Integrasi yang diminta owner

Status Kael: belum; Telegram, Obsidian dan audio belum dimulai.

| Urutan | Kemampuan | Prasyarat | Acceptance |
|---|---|---|---|
| 1 | Telegram Bu Yuli dan manager lain | P1/P2, bot/customer auth | Alias/command dipetakan ke manager; pertanyaan error membaca n8n divisinya dan menyebut freshness; user/chat tak berizin dan replay ditolak; tanpa menjalankan/retry workflow |
| 2 | Obsidian Nate | P2/P3, vault/scope/read-write dipilih | Sinkron/pencarian bersumber, batas folder, versi dan konflik; graph berasal data vault; disconnected tak dianggap bekerja; tidak membaca vault lain |
| 3 | Audio KaelaCH | P1/P2, suara/lisensi/budget | VO nyata, timing per kata terukur, SRT/scene sinkron, musik/SFX berizin, QA audio/frame dan preview versi sebelum approval |
| 4 | Builder web adaptif + edit anggota | P1/P3 | Pertanyaan satu per giliran, draft koreksi/reload, preview penerapan, ID terjaga; arsip/penggantian anggota bertugas memakai handoff; tidak mulai task diam-diam |
| 5 | Deadline/dependensi/meeting AI | P1/P3 | Scheduler durable, dependency cycles ditolak, hasil meeting/keputusan nyata, batas revisi/escalation, checkpoint peserta |

P6 bukan alasan menunda P2–P5 jika produk akan dijual/di-host publik. Untuk penggunaan pribadi lokal, pilot satu integrasi bisa lebih awal dengan batas localhost yang tetap jelas.

## P7 — QA produk, pilot dan penjualan

Status Kael: belum.

Uji desktop/mobile/keyboard/reduced motion, GPU/tekstur/navigasi antaragent dan ukuran kantor yang sebenarnya. Tentukan batas geometri/tekstur/drawcalls dan konsumsi worker berdasarkan pengukuran. Lengkapi filter agent/divisi, preview layout sebelum apply dan dokumentasi setup/support.

Pilot terbatas dengan data dummy/akun pelanggan yang memberi izin, ukur kegagalan install/upgrade/restore, waktu support dan biaya AI/render. Baru tetapkan harga, SLA, periode dukungan, sistem pembayaran, refund dan layanan add-on.

Keluar bila: seluruh minimum layak jual pada laporan 08 lolos dengan bukti; tidak ada risiko keamanan prioritas tinggi yang belum diterima/dimitigasi; pemasangan dapat diulang tanpa operator vendor memegang akses permanen VPS.

## Yang tidak perlu ditulis ulang

Scene Three.js, identitas anggota, monitoring n8n, incident medical, notifikasi header, renderer Remotion dan gate preview/revisi KAEL sudah ada. Perlu perluasan kontrak dan pengujian, bukan menggantinya dengan dashboard Lembur atau memindahkan kredensial backup.
