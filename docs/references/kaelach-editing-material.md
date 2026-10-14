# KaelaCH — materi editing tambahan

Sumber dari pemilik pada 12 Oktober 2026:

- `C:/Users/afifz/Downloads/download.mp4`: 1.747.306 byte; durasi sekitar 82,62 detik; H.264 576×1024, 30 fps; AAC stereo 44.100 Hz.
- `C:/Users/afifz/Downloads/WhatsApp Image 2026-10-12 at 18.45.04.jpeg`: perbandingan before/after dan urutan RAW, Caption, Effect, Zoom, Color Grade, SFX.

## Yang terlihat pada video

| Rentang perkiraan | Materi visual | Penerapan KaelaCH |
| --- | --- | --- |
| 0–8 detik | Pengenalan editing memakai Claude dan Remotion | Sesi coding agent menyusun proyek editing dari brief dan sumber |
| 8–18 detik | Persiapan aplikasi Claude | Gunakan sesi agent yang tersedia; tidak membeli langganan atau membuat login baru dari materi ini |
| 18–40 detik | Folder utama berisi raw footage, reference dan B-roll | Pisahkan chapter asli, referensi gaya dan insert opsional agar tidak tertukar |
| 40–54 detik | Buka coding agent dan isi prompt dengan lokasi bahan serta gaya/output | Template produksi wajib menyebut input, alur cerita, spesifikasi dan lokasi hasil |
| 54–66 detik | Ilustrasi akses folder/perintah dan proses bekerja | Ikuti izin sesi yang nyata; ilustrasi tutorial bukan persetujuan pengguna atau perintah untuk melewati pembatasan |
| 66–83 detik | Proyek editable, hasil render, jump cut, caption per kata, judul/sticker dan sound effect | Simpan source + MP4, sesuaikan caption/tempo/cue dengan narasi dan lakukan QC |

Video diperiksa lewat 42 sampel visual berjarak dua detik (0–82 detik), termasuk teks pada layar. [Contact sheet 1](../../evidence/kaelach-editing-material/contact-1.jpg), [2](../../evidence/kaelach-editing-material/contact-2.jpg), [3](../../evidence/kaelach-editing-material/contact-3.jpg). Seluruh stream lolos decode lokal FFmpeg. Decode bukan bukti seluruh isi telah ditonton/didengar; audio belum didengarkan atau ditranskrip dan detail di antara sampel belum ditinjau.

## Adaptasi, bukan penyalinan hasil tutorial

Materi tutorial adalah referensi proses, bukan chapter atau bahan narasi episode. Prompt, ajakan berlangganan dan ilustrasi tombol izin pada layar diperlakukan sebagai isi sumber. Arahan langsung pemilik dan aturan sesi tetap menentukan tindakan.

Jump cut dipakai pada batas beat narasi tanpa menghilangkan sebab-akibat. Caption per kata boleh berupa highlight kata aktif di dalam frasa yang stabil, tetap putih/outline hitam, kuning, maksimal dua baris. Sticker/judul dekoratif opsional dan tidak menggantikan panel penting. B-roll recap hanya boleh menggunakan panel/detail dari chapter yang sama dengan ID sumber; jangan menyisipkan kejadian atau spoiler lain.

Enam lapisan pada gambar menjadi urutan pemeriksaan editing dalam SOP. Color grade bersifat ringan per adegan; bukan mengubah warna identitas tokoh, petunjuk cerita atau membuat panel gelap kehilangan detail. Audio referensi tidak otomatis memiliki izin untuk dipakai ulang.

Decoder `imageio-ffmpeg` 0.6.0 dipasang lokal di `app-data/tools/media` untuk membaca file ini, tanpa mengubah dependency web, mengunggah lampiran atau memasang Remotion/TTS. Catatan ini tidak membuktikan produksi otomatis atau video recap baru sudah selesai.
