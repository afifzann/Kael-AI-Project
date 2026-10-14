# Building dari coding agent

**Pembaruan v2.39:** diskusi AI sekarang juga tersedia langsung pada halaman Builder web, dengan draft, preview tim/SOP dan penerapan oleh pemilik. Panduan: [Builder percakapan](BUILDER-DIALOGUE.md). Diskusi web terpisah dari riwayat sesi desktop; uraian bridge sesi Codex di bawah tetap berlaku untuk jalur coding agent. Ruang Builder mengutamakan giliran web yang sedang aktif, kemudian bridge desktop yang terverifikasi.

## Builder studio · sesi Builder

Sesi Codex pemilik yang semula bernama Kael AI sudah diganti menjadi **Builder**. ID tetap `01a1299a-b553-7902-921f-fa99bc978f1e`; riwayat sesi tetap berada di Codex. Kantor → Fasilitas & server → Builder studio berisi satu karakter Builder, workstation, papan rencana, rak dan penyimpanan.

Web hanya mengikuti aktivitas sesi: saat giliran task_started, Builder mengakhiri kunjungan fasilitas, berjalan pulang di jalur yang sama, lalu mengetik setelah sampai meja. Setelah task_complete atau turn_aborted, Builder boleh ikut socialVisit, kopi dan aktivitas fasilitas seperti penghuni luang lain. Status terputus, kedaluwarsa atau tidak diketahui tidak memulai kunjungan baru. Jeda/reduced motion tetap dihormati.

Backend memeriksa ID sesi dan cwd proyek, lalu membaca event status secara bertahap (maksimal 8MiB per pembacaan). Tidak menyimpan atau mengirim pesan percakapan ke web. Status kerja tanpa event baru lebih dari 120 detik belum dianggap terkonfirmasi, dan status sinkronisasi lebih dari 20 detik tidak dipercaya.

`GET /api/builder-status` memakai guard host/origin localhost dan sejak tahap 7 memerlukan sesi pemilik. Frontend mengambil status setiap 2 detik, termasuk saat dialog biasa terbuka. Endpoint/komponen riwayat chat dihapus. Presence di `/api/state` tidak dipersistenkan. Bridge masih bergantung format/lokasi catatan Codex lokal. `KAEL_BUILDER_SESSION_FILE` hanya override backend untuk log yang identitas/cwd-nya cocok; instance `KAEL_DATA_DIR` terpisah memakai log dalam direktori itu. Tautan “Lanjut di Codex” hanya tampil untuk sesi terverifikasi di kantor internal; instance buyer tidak mewarisinya. Pembukaan handler desktop belum diuji.

Builder adalah satu penghuni sistem seperti Nate, dengan ID `office-builder`, bukan divisi bisnis berisi manager dan pelaksana. Studio tidak dapat dipakai untuk sesi istirahat/meeting. Layout dan karakter tersedia dari source tanpa menulis state pemilik; bridge dan izin kerja yang sudah ada tetap berlaku.

Diskusi berjalan di sesi AI yang sedang digunakan. Skill ini menghubungkan **hasil konfigurasi tim** ke aplikasi lokal; bukan layanan chat web, login AI atau runtime karyawan otomatis.

1. Buka proyek `C:/Kael AI` di coding agent. Jalankan kantor dengan `npm run dev`.
2. Claude Code: `/building`. Codex: pilih skill `building` melalui menu skill atau tulis `$building` (sintaks slash bergantung client). Hermes: `/building` setelah skill termuat.
3. Diskusikan tujuan satu pertanyaan per giliran. AI memberi saran alur, peran dan nama, memeriksa kantor yang ada, lalu membuat preview konkret.
4. Setelah konfigurasi disepakati, AI menerapkannya melalui bridge lokal. Browser memuat revisi baru dalam interval sekitar 5 detik; jika dialog sedang terbuka pembaruan ditunda sampai dialog ditutup. Ruangan, karakter dan furniture divisi dibuat oleh layout yang sudah ada.

Sumber skill: `.agents/skills/building/SKILL.md`. Claude memuat entrypoint `.claude/skills/building/SKILL.md`. Entrypoint personal sudah dipasang di `C:/Users/afifz/.codex/skills/building/SKILL.md` dan `C:/Users/afifz/.hermes/skills/building/SKILL.md`, menunjuk ke sumber proyek. Hermes juga mendukung `.agents/skills` dalam checkout Git. Muat ulang sesi bila skill belum muncul. CLI Claude Code/Codex/Hermes belum terdeteksi pada PATH saat implementasi; login dan sesi model nyata tidak diuji.

## Bridge lokal

Sejak tahap 7, setup akun pemilik harus selesai terlebih dahulu. Bridge membaca kunci `builder-access.key` dari direktori data yang sama dengan server dan mengirimnya ke loopback tanpa mencetak nilainya. Kunci terbatas pada pembacaan kantor serta pengaturan tim, bukan runtime, pemulihan error atau keputusan Founder. API browser memakai sesi pemilik dan CSRF. Tautan sesi internal hanya ditampilkan jika status sesi terverifikasi; instalasi buyer terpisah tidak mewarisi tautan chat internal. Rincian: [Akses pemilik](OWNER-ACCESS.md).

Jalankan dari root proyek dengan Node.js 24+. Endpoint selalu loopback `127.0.0.1`; port data default 5174 dapat diubah melalui `KAEL_PORT`. Kunci akses lokal hanya dikirim ke loopback; bridge tidak mengirim permintaan ke provider AI.

```sh
node scripts/building.mjs inspect
node scripts/building.mjs preview request.json
node scripts/building.mjs apply request.json
```

`inspect` mengembalikan revision, divisi dan identitas/peran anggota; tidak menyalin fakta bisnis atau hasil pekerjaan. `preview` memvalidasi konfigurasi memakai domain tanpa menyimpan. `apply` menyimpan melalui API tervalidasi dan penulisan atomik yang sama dengan UI. Konflik revision ditolak, tanpa retry otomatis. Jangan mengedit file data langsung.

Contoh file konfigurasi pembuatan (ganti revision dengan hasil inspect terbaru):

```json
{
  "revision": 0,
  "command": {
    "type": "division",
    "name": "YouTube Kaelach",
    "manager": "Damar",
    "workers": [
      { "name": "Raka", "role": "Riset topik dan sumber" },
      { "name": "Nara", "role": "Menulis naskah" }
    ]
  }
}
```

Edit memakai `command.type: "division-edit"`, `id` divisi, `name`, `manager` (nama), dan array `workers` berisi `{id, name, role}` untuk anggota lama yang diubah. Boleh array kosong jika tidak mengubah pelaksana lama. Opsional `addWorkers: [{name, role}]` menambah 1–12 pelaksana baru, dengan total maksimal 12 pelaksana per divisi manual. Nama seluruh anggota dalam divisi wajib berbeda. Penambahan dan edit dilakukan atomik; ID, tugas, hasil dan keputusan lama dipertahankan. Konflik revision tetap ditolak untuk mencegah pengulangan anggota. Hapus anggota, penambahan pada divisi workflow, perubahan furniture manual dan akses Obsidian tidak dilakukan oleh endpoint ini.

Referensi resmi: [Claude Code skills](https://code.claude.com/docs/en/skills), [Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [OpenAI skills](https://developers.openai.com/codex/skills/).

## Playbook KaelaCH

Playbook khusus tim manual **Youtube KaelaCH**: [produksi recap manhwa/manga](KAELACH-RECAP.md). Kaela menangani koordinasi/QC, Nara cerita/naskah/metadata, Echo narasi/audio dan Zetsu editing/render/cover. Playbook tidak memasang Remotion, TTS atau runtime otomatis; bahan chapter diperlukan sebelum episode dimulai.

Untuk memulai setelah chapter tersedia, gunakan [template instruksi produksi KaelaCH](KAELACH-PRODUCTION-PROMPT.md). Materi tutorial tambahan sudah diadaptasi menjadi pemisahan folder sumber/referensi/B-roll serta enam lapisan RAW, Caption, Effect, Zoom, Color Grade dan SFX. Catatan pemeriksaan sumber ada pada [materi editing](references/kaelach-editing-material.md).

## Divisi workflow n8n

Bridge juga menerima command workflow-agent untuk satu workflow = satu agent terikat; manager dapat mengawasi beberapa agent: company, name (divisi), agent, role, workflowId, workflowName. Inspect turut menampilkan binding. Gunakan revisi terkini dan preview/apply; credential tetap hanya di .env backend. Konfigurasi ini mengaktifkan pemantauan baca, tanpa menjalankan workflow. Division-edit hanya untuk tim manual; agent workflow tidak menerima tugas/sesi manual. Lihat [N8N](N8N.md) untuk contoh, batas dan verifikasi.

Untuk menetapkan agent workflow yang sudah ada sebagai manager divisinya, gunakan `command: {"type":"workflow-manager","agentId":"<ID dari inspect>","role":"Manager Marketing Outdor · Katalog produk, AI Search, Product List & Telegram"}` dengan revision terkini, lalu preview/apply/inspect. Divisi harus belum memiliki manager. Identitas, binding, monitorFrom, insiden dan pekerjaan dipertahankan; tidak membuat agent atau menjalankan workflow. Divisi ini tetap pemantauan n8n, bukan tim briefing manual.

Untuk memisahkan manager dari pekerjaan workflow yang masih dimilikinya, gunakan `workflow-delegate`: `managerId`, `workflowId`, `agent` (misalnya Date), `role`, `managerRole`. Preview memvalidasi dan menampilkan satu agent tambahan dengan binding yang dipindah. Apply mempertahankan ID manager, workflowId/monitorFrom dan insiden executionId (dipindah ke pelaksana); insiden pribadi manager tetap. Tidak mengubah workflow produksi atau membuat koneksi chat Telegram. Contoh riwayat penerapan: `proposals/yuli-date-delegation.json`; jangan apply ulang tanpa inspect dan revision terkini.
