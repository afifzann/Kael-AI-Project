# Menjalankan tugas Kael dengan Claude Code

Tersedia untuk tugas teks umum dari brief, SOP dan konteks agent. Memakai CLI Claude Code resmi pada user/komputer server, dengan login akun milik pengguna sendiri. Diuji di Windows dengan Claude Code 2.1.291 dan akun Pro. Instalasi Ubuntu/VPS baru belum diuji.

## Hubungkan dan pilih agent

1. Pasang Claude Code resmi dan login langsung lewat alur Anthropic: `claude auth login`. Pada CMD/PowerShell dengan launcher npm, bisa memakai `claude.cmd auth login`. Jangan kirim kode login, token atau password ke chat/Kael.
2. Buka **Pengaturan → AI pada server**. Status Codex dan Claude terpisah, diperbarui maksimal setiap 60 detik. Login tersedia tidak menjamin kuota dan seluruh model tersedia.
3. Buka **Divisi → Anggota → pilih agent → Setelan**. Pilih Claude. Model boleh dikosongkan untuk default CLI, atau isi alias/ID yang tersedia pada akun, misalnya `sonnet` atau `opus`. Kael tidak memverifikasi katalog model saat menyimpan setelan; kesalahan model dilaporkan ketika dijalankan.
4. Buat briefing dan ajukan rencana. Setelah kamu menyetujui rencana, buka tugas lalu pilih **Jalankan dengan AI**.
5. Hasil masuk sebagai versi baru **Perlu pemeriksaan**. Buka preview, catat pemeriksaan manual dan beri keputusan; revisi mempertahankan versi lama. Tidak ada persetujuan atau publikasi otomatis.

Buyer baru dapat memilih Claude saat langkah Pelaksanaan bila login CLI pada server terdeteksi. Agent lama tidak otomatis diganti provider/model. Produksi video KaelaCH tetap memakai runtime Codex; manager otonom dan Builder adaptif belum tersedia.

## Cara kerja dan batas

- `server/claude-stage.mjs` menjalankan binary resmi dengan argv terpisah dan `shell:false`; tidak memodifikasi binary, membaca file token atau meneruskan kredensial akun melalui layanan pusat Kael.
- Pada Windows, pencarian mencakup native `~/.local/bin/claude.exe` dan paket npm resmi. Pada Unix memakai `claude` di PATH. Operator bisa menunjuk executable langsung lewat variabel proses `KAEL_CLAUDE_PATH`; di Windows gunakan `.exe`, bukan launcher `.cmd`. Node CLI npm lama juga dikenali bila tersedia.
- Tugas berjalan di folder run kosong, memakai safe mode/restricted, tanpa alat bawaan, MCP, browser, skill/subagent atau sesi sebelumnya. Tidak memakai bypassPermissions. Kebijakan admin/managed Claude tetap berlaku; ini bukan bukti isolasi OS/VPS penuh.
- `--bare` tidak digunakan karena mode itu tidak membaca login subscription. Autentikasi ditangani CLI resmi; login subscription bukan token API untuk dipakai SDK atau dibagikan ke buyer lain.
- Prompt dikirim lewat stdin, keluaran memakai JSON schema. Metadata akun/sesi, output stderr vendor dan token tidak ditampilkan/disimpan sebagai hasil tugas. Payload/error yang salah, timeout, output berlebihan, kuota atau model gagal tidak menghasilkan hasil palsu.
- Maksimal 4 giliran agentic, waktu 10 menit dan stdout 4 MB. Hentikan run melalui tombol pada tugas; hasil yang terlambat dibuang. Gagal tidak diulang otomatis atau dipindah ke provider lain.
- Satu antrean global, provider dari snapshot run. Provider offline tidak menghalangi provider lain yang siap; run offline tetap antre dan dapat dibatalkan. Restart run aktif menjadi terputus; hasil lama tetap ada.
- Setiap run adalah sesi baru; konteks berasal dari profil/SOP/brief dan memori hasil agent terbatas. Ini bukan sinkronisasi seluruh riwayat chat Claude/Codex atau akses file kantor sembarangan.

## Pengujian

`npm test` memakai fixture, tidak memanggil AI. Uji sungguhan opt-in: `node scripts/check-agent-runtime.mjs Claude`. Script ini memakai kuota akun, membuat data sintetis terpisah di `evidence/agent-runtime-smoke/`, tidak menjalankan task pemilik dan tidak menyetujui hasil. Uji awal berhasil: `run-NvR1zi/check.json`, provider Claude, hasil v1, status review, founderApproval false.

Rujukan resmi yang diperiksa 14 Oktober 2026: [CLI reference](https://code.claude.com/docs/en/cli-reference), [penggunaan programatis dan JSON schema](https://code.claude.com/docs/en/headless), [ketentuan menjalankan CLI dalam produk](https://code.claude.com/docs/en/legal-and-compliance). Produk menggunakan CLI tak dimodifikasi dan autentikasi masing-masing pengguna; tidak menjual ulang kuota atau menyediakan login Claude.ai milik pengembang.
