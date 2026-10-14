# KaelaCH — alur produksi recap manhwa/manga

Disepakati dari arahan pemilik, 12 Oktober 2026. SOP ini dijalankan melalui halaman **Produksi & chat** menggunakan Codex CLI lokal dan renderer Remotion. Empat peran memakai sesi/model Codex yang sama secara bergiliran; bukan empat provider terpisah dan bukan workflow n8n.

## Cara memakai di web — v2.17

1. Buka **Produksi & chat → Upload chapter**. Pilih divisi Youtube KaelaCH, isi judul/chapter, upload ZIP/PDF/gambar bernomor, arah baca/arahan bila perlu. Maksimal60 berkas,50MB per berkas,100MB total; ZIP maksimal100 entri/200MB setelah dibuka, PDF100 halaman, total180 potongan gambar.
2. Sertakan satu VO WAV/MP3/M4A bila tersedia. Konfirmasi chapter lengkap dan nama berkas sudah berurutan, lalu **Upload & jalankan SOP**. Klik ini mengizinkan rencana kerja standar, bukan menyetujui hasil.
3. Nara membaca seluruh panel → Kaela review naskah → Echo catatan audio → Zetsu koreksi fokus/caption → Remotion render → Kaela QC sampel. **Percakapan tim** menyimpan ringkasan hasil nyata dari tiap panggilan AI dan aktivitas sistem; bukan percakapan contoh atau chain-of-thought. Founder dapat mengirim pertanyaan ke Kaela, menunggu giliran proses. Jika QC sampel gagal, tim menjalankan maksimal dua revisi otomatis dengan catatan QC sebelumnya; sesudah itu menunggu arahan Founder.
4. Buka **Preview & keputusan**, tonton MP4 versi yang dipilih, baca QC/naskah. **Approve** hanya untuk versi terbaru yang lulus review, setelah konfirmasi sudah ditonton. **Tolak** memerlukan alasan. **Edit / minta revisi** memberi arahan dan menjalankan versi baru pada chapter yang sama; hasil/persetujuan lama dipertahankan. Keputusan juga muncul di menu **Keputusan**.
5. **Hapus dari daftar** menghentikan proses/antrean, membatalkan pekerjaan belum selesai, dan mengarsipkan episode. Berkas dan riwayat tidak dihapus permanen. Error menyimpan bahan/versi lama dan alasan; retry membuat versi berikutnya. Restart server menandai pekerjaan terputus, tidak mengulang biaya AI otomatis.

Berkas web disimpan di `app-data/productions/<id>/raw`, `panels`, dan `v1`, `v2`, seterusnya. Ini struktur runtime web; struktur folder editorial di bawah adalah panduan produksi manual. Paket web berisi MP4, cover, naskah, scene plan, props, source composition/caption, manifest panel, SRT, metadata, daftar aset dan QC. Story map serta alignment per kata belum dihasilkan terpisah.

**Batas saat ini:** tanpa TTS, tanpa VO hasil adalah preview tanpa suara. VO unggahan dinormalisasi dan dipasang, tetapi timing scene/caption masih estimasi proporsional, bukan forced alignment atau pemeriksaan audio AI. Tidak mengambil musik/SFX eksternal tanpa izin. QC AI membaca sumber, rencana dan cover; bukan menonton/mendengar seluruh MP4. Founder tetap harus memeriksa gerak, crop dan audio lengkap. Approve tidak berarti publikasi; tidak ada upload YouTube otomatis. Target60–90 detik fleksibel, batas awal runtime180 detik. Web lokal harus berjalan; login/kuota Codex dipakai pada komputer server.

## Tim dan tanggung jawab

| Penanggung jawab | Tanggung jawab | Serah terima |
| --- | --- | --- |
| Founder | Menyediakan chapter sumber, tujuan episode dan bahan suara bila ada; meninjau hasil akhir | Chapter → Kaela; video yang lulus QC → keputusan tayang |
| Kaela — manager dan QC | Memeriksa kelengkapan sumber, menyusun brief, membagi pekerjaan, memeriksa naskah terhadap panel dan hasil akhir; memilih paket judul/cover untuk review | Brief → Nara; naskah lulus review → Echo/Zetsu; revisi atau paket hasil → Founder |
| Nara — cerita dan naskah | Membaca seluruh chapter, memastikan urutan panel, memetakan fakta/motivasi/konflik/akibat; menulis hook, narasi Indonesia, arahan adegan, tiga calon judul dan deskripsi | Manifest + story map + naskah ber-ID panel + draft metadata → Kaela; naskah yang sudah diperiksa → Echo/Zetsu |
| Echo — narasi dan audio | Menyiapkan/memeriksa VO Indonesia yang tersedia, pelafalan nama dan timing; memilih musik/SFX berizin, cue, mixing/fade/ducking | Audio + timing kata/frasa + cue + catatan lisensi → Zetsu; kekurangan VO/izin → Kaela |
| Zetsu — editor dan render | Menyusun storyboard/timeline dari naskah dan audio final; crop, kamera, Remotion, subtitle, efek, grade, cover serta render; pemeriksaan teknis awal | Source/props + preview/MP4 + SRT + cover + laporan teknis → Kaela |

Tim inti berisi empat anggota: Kaela dan Zetsu dipertahankan, Nara dan Echo ditambahkan pada divisi yang sama. Tidak memerlukan agent upload, riset web atau thumbnail tersendiri untuk produksi awal. ID lama, tugas, hasil dan riwayat tetap dipertahankan; penambahan anggota tidak memindahkan penanggung jawab pekerjaan lama. Manager di aplikasi tetap berperan Manager; tanggung jawab editorial dijelaskan oleh playbook ini.

## Pembagian kerja dan serah terima

1. Kaela menerima chapter lengkap dan membuat brief episode berisi sumber, tujuan, gaya, batas cerita dan kriteria selesai. Bila belum lengkap, catat kekurangan; jangan mulai episode tebakan.
2. Nara membaca chapter sampai akhir sebelum menulis; setiap beat menunjuk panel sumber. Nara menyerahkan naskah, manifest dan peta cerita ke Kaela. Kaela memeriksa nama, motivasi, kronologi dan akhir sebelum bahan dipakai tahap berikutnya.
3. Echo memakai naskah versi yang sudah diperiksa. VO nyata menjadi dasar timing kata/frasa dan cue audio. Tanpa VO/tool suara, Echo menyerahkan estimasi bertanda `preview_tanpa_vo` dan kebutuhan yang belum tersedia; tidak mengklaim sudah menghasilkan suara.
4. Zetsu boleh menyiapkan storyboard dari naskah tersebut, tetapi mengunci timing final sesudah audio tersedia. Subtitle berasal dari timing Echo; Zetsu memeriksa pemenggalan baris dan posisinya. Perubahan naskah/audio mengharuskan timing dan render terkait diperbarui.
5. Nara menyiapkan tiga opsi judul dan satu deskripsi yang sesuai chapter, tidak clickbait menyesatkan/spoiler lanjut. Zetsu membuat satu cover vertikal dari panel yang dipakai, tanpa menambah adegan. Kaela memeriksa paket ini bersama video.
6. Kaela memberi catatan revisi beserta timecode dan penanggung jawab: fakta/naskah → Nara, pelafalan/audio → Echo, visual/subtitle/render → Zetsu. Hasil baru memakai versi baru; bila naskah berubah Echo dan Zetsu memakai versi yang sama.
7. Founder menerima video, cover, metadata dan laporan QC untuk keputusan tayang. Tidak ada upload atau persetujuan hasil yang dibuat otomatis oleh penyimpanan tim ini.

Serah terima web dijalankan berurutan oleh runner produksi; satu tugas induk terikat satu episode untuk hasil/review/keputusan yang sudah ada. Peran aktif dan ringkasan tahap disimpan bersama episode. Brief manual di luar produksi tetap mengikuti alur manualnya.

## Referensi aktif dan batas pengamatan

File referensi: `C:/Users/afifz/Downloads/videoplayback.mp4`, 9.966.144 byte, durasi metadata 133,291 detik, track video 360×640 (9:16). Contact sheet yang tersedia di proyek: [cuplikan referensi](../video-reference.jpg). Script lama yang menghasilkan contact sheet menunjuk ke path file yang sama; dua belas sampel menunjukkan judul hook besar, panel karakter/aksi, teks pendek putih ber-outline gelap, serta penutup berupa promosi konten lain.

Yang dipakai: konflik sebagai pembuka, narasi padat, pergantian fokus wajah/aksi, subtitle singkat dan penyajian vertikal. Aturan pemilik mengatasi perbedaan referensi: highlight kuning, maksimal dua baris, target 60–90 detik dan akhir pada payoff/konflik chapter. Penutup promosi referensi tidak diadopsi.

Contact sheet hanya sampel visual, bukan pembacaan seluruh chapter atau transkrip audio. Voice-over, musik, efek, transisi antarframe dan urutan cerita lengkap referensi belum diverifikasi. Tidak menyalin watermark, audio, panel atau cerita video referensi sebagai bahan episode baru. Gunakan panel asli chapter untuk crop 1080×1920; render beresolusi tinggi tidak menambah detail pada sumber 360×640.

## Input tiap episode

Materi tambahan tentang persiapan folder dan enam lapisan editing sudah menjadi bagian playbook ini. Lihat [catatan materi dan batas pengamatan](references/kaelach-editing-material.md) serta [template instruksi produksi](KAELACH-PRODUCTION-PROMPT.md) untuk dipakai dalam sesi Codex/Claude/Hermes. Template ini untuk sesi coding manual; jalur web menggunakan runner produksi yang dijelaskan di atas.

- Seluruh chapter sebagai PDF atau gambar bernomor; judul, nomor chapter dan arah baca bila tidak jelas.
- Video referensi dipisahkan dari sumber cerita. Jangan menganggap video recap sebagai chapter lengkap.
- Voice-over Indonesia bila tersedia; musik/SFX beserta asal dan izin penggunaannya. Catat lisensi, atribusi, cakupan penggunaan dan file aset.
- Jika chapter/panel hilang atau teks penting tidak terbaca, tandai `butuh_bahan` dan minta sumbernya. Jangan menebak atau mengambil spoiler dari chapter berikutnya.

Episode awal saat ini **butuh_bahan**: belum ada chapter mentah atau voice-over produksi yang diberikan. Belum ada naskah cerita, render baru atau klaim siap tayang.

## Tahapan kerja dan hasil

| Tahap | Pekerjaan | Hasil dan syarat lanjut |
| --- | --- | --- |
| 1. Penerimaan sumber | Kaela memastikan seluruh chapter tersedia dan memisahkan referensi gaya | Manifest sumber lengkap; tidak ada panel hilang/urutan ambigu |
| 2. Baca dan petakan | Nara membaca seluruh chapter, menomori panel dan mencatat tokoh, motivasi, konflik, akibat serta akhir chapter | `panel-manifest.json`: ID panel, file, urutan baca, ringkasan fakta; `story-map.md` |
| 3. Naskah | Nara menulis hook konflik 0–3 detik dan narasi santai dengan motivasi → tindakan → akibat; Kaela memeriksa terhadap panel | `script.md` ber-ID panel dan versi naskah yang lulus review; tidak ada dialog/kejadian/spoiler karangan |
| 4. Susunan adegan | Zetsu menyusun storyboard dari naskah; jika cold open memakai panel lebih akhir, tandai perpindahan waktu dan kembali ke urutan sumber | `scene-plan.json`: panel, narasi, timing, crop/fokus, kamera, transisi, subtitle dan cue audio; timing awal boleh estimasi |
| 5. Narasi dan aset | Echo menyiapkan VO tersedia, alignment audio nyata serta musik/SFX berizin | `voiceover.wav` jika tersedia, `word-timings.json` dan `asset-licenses.csv`; tanpa VO jangan mengklaim audio tersinkron |
| 6. Editing Remotion | Zetsu mengunci panel/camera/teks/audio pada frame VO final | Source Remotion, props episode dan preview; durasi berasal dari timeline/VO, bukan hitungan acak |
| 7. Render, paket dan QC | Zetsu render/cover/pemeriksaan teknis; Nara metadata; Kaela QC sumber/cover dan Founder menonton/mendengar hasil lengkap | MP4 + SRT + `cover.png` + `metadata.md` + laporan QC bertimecode; revisi/render ulang bila perlu |
| 8. Review hasil | Kaela memeriksa cerita/teknis/lisensi; Founder meninjau hasil | Siap tayang hanya setelah gate terpenuhi; tidak mengunggah otomatis |

## Standar editing

- 1080×1920, 9:16; pilihan awal 30 fps, MP4 H.264 dengan AAC bila ada audio. Durasi 60–90 detik, boleh lebih panjang jika cerita memerlukannya. Jangan mengejar durasi dengan menghilangkan sebab-akibat penting.
- Crop per adegan menjaga wajah, aksi, teks dan informasi penting. Jika crop penuh layar menghilangkan informasi, lakukan pan/urutan crop atau tampilkan panel utuh dengan latar yang sesuai.
- Kamera lembut saat emosi/pengungkapan; cut dan gerak lebih cepat saat aksi. Semua animasi Remotion berasal dari frame timeline. Hindari animasi CSS/waktu browser yang tidak deterministik.
- Transisi singkat, umumnya 3–8 frame. Shake/flash hanya pada benturan atau kejutan yang memang ada. Bukan efek konstan.
- Subtitle tebal putih, outline hitam, kata kunci kuning. Maksimal dua baris, frasa singkat, penempatan per adegan menjauhi wajah/aksi. Periksa di layar ponsel, termasuk area kontrol platform.
- VO menjadi patokan timing final. Musik berada di bawah suara, dengan ducking dan fade; SFX mengikuti aksi relevan. Periksa clipping, perubahan volume dan artikulasi pada perangkat biasa.
- Tanpa VO: tetap siapkan naskah dan timing estimasi. Preview tanpa VO harus jelas ditandai, bukan diklaim sebagai recap final bersuara. Jangan menciptakan TTS/izin musik yang tidak tersedia.
- Akhiri pada payoff atau konflik yang terdapat di chapter. Tidak menambahkan kejadian sesudah chapter, CTA panjang atau promosi dari video referensi.

## Persiapan folder episode

Gunakan satu folder per episode di `productions/kaelach/<judul>-ch<nomor>/`, dibuat setelah sumber dan identitas chapter jelas. Struktur ini adalah kontrak produksi; belum membuat episode kosong atau menyalin video referensi sebagai chapter.

```text
raw/        chapter PDF/panel asli; tidak ditimpa
reference/  referensi gaya dan catatan pengamatan
b-roll/     insert opsional dari chapter yang sama, ID sumber wajib
audio/      VO, timing kata/frasa, musik, SFX dan catatan izin
planning/   panel-manifest.json, story-map.md, script.md, scene-plan.json
remotion/   proyek editable, props, aset yang dipakai
out/        recap-v001.mp4, captions-v001.srt, cover-v001.png,
            metadata-v001.md, asset-licenses.csv, qc-report-v001.md
```

Video sumber yang perlu dipotong disalin sebagai turunan; sumber tetap utuh. Referensi gaya tidak otomatis menjadi aset berizin. Ambil B-roll dari detail/wajah/reaksi pada panel sumber, bukan stok yang menyiratkan kejadian baru. Output revisi memakai versi baru, bukan menimpa hasil yang sudah direview. Paket akhir di bawah mengikuti struktur ini; nama `recap.mp4` berarti hasil versi yang dipilih.

## Enam lapisan editing KaelaCH

Lapisan merupakan urutan kerja/pemeriksaan, bukan enam efek wajib di setiap shot. Timeline tetap berpijak pada narasi; sesudah VO atau durasi berubah, perbarui semua cue dan subtitle.

| Lapisan | Penanggung jawab dan pelaksanaan | Pemeriksaan Kaela |
| --- | --- | --- |
| RAW | Nara membaca chapter utuh dan memilih beat/panel; Zetsu memakai manifest/naskah yang diperiksa dan memotong jeda tanpa menghilangkan makna. Simpan ID sumber setiap shot | Urutan, wajah, aksi, dialog penting dan sebab-akibat tetap benar |
| Caption | Echo menyediakan timing; Zetsu memecah menjadi frasa singkat. Highlight kata aktif/penting di dalam frasa stabil, bukan memindahkan seluruh blok setiap kata | Putih/outline hitam/kuning, maksimal dua baris, tidak menutup fokus; tanpa VO timing masih estimasi |
| Effect | Zetsu membuat judul pendek untuk hook bila diperlukan; transisi singkat; shake/flash hanya untuk benturan/kejutan yang didukung panel | Tidak mengarang kejadian, berlebihan atau mengganggu keterbacaan |
| Zoom | Zetsu menentukan titik fokus dan crop awal/akhir tiap adegan. Pan/reframe mengikuti wajah atau aksi; tempo lebih tenang pada emosi | Tidak memotong informasi penting, membuat gerakan tersentak atau mengulang zoom tanpa alasan |
| Color Grade | Zetsu mengoreksi brightness/contrast/saturation ringan per shot untuk menyatukan sumber; bandingkan dengan panel asli | Detail terang/gelap dan warna tokoh/petunjuk cerita terjaga; jangan memaksakan tema warna dashboard ke manga |
| SFX | Echo menyiapkan cue/aset berizin/mixing; Zetsu memasukkannya ke timeline dengan fade/ducking. Efek boleh kosong bila tidak membantu cerita | SFX tidak menenggelamkan VO, tidak clipping dan izin/atribusi tercatat |

`scene-plan.json` mencatat setiap shot: ID panel, awal/akhir frame, beat narasi, titik fokus/crop, gerak kamera, teks dan cue caption, transisi/efek, koreksi warna serta cue audio/file lisensi. Parameter yang tidak dipakai dicatat sebagai tanpa efek, bukan diisi dekorasi acak. Sinkronisasi final diperiksa pada hasil render, bukan hanya preview editor.

Source Remotion dan props harus bisa diedit kembali. Semua gerak/efek mengikuti frame yang sama; pemilihan font dan aset menunggu aset yang tersedia/berizin. Remotion4.0.535 dipasang untuk jalur web; semua parameter mengikuti scene plan yang tervalidasi.

## Gate pemeriksaan Kaela

1. Semua sumber terbaca dan urutan panel dikonfirmasi sebelum naskah.
2. Setiap kalimat narasi punya dukungan panel; nama, relasi, motivasi, dialog kutipan dan sebab-akibat benar.
3. Hook tidak memalsukan konflik; cold open tidak membuat kronologi menyesatkan.
4. Subtitle tidak lebih dua baris, terbaca dan tidak menutup fokus. Crop penting dicek per shot.
5. Seluruh video hasil render ditonton; panel/subtitle/audio sesuai, tidak ada frame kosong/gelap, klip terpotong atau audio hilang.
6. Musik/SFX memiliki catatan izin yang sesuai. Tidak menggunakan aset berlisensi tidak jelas sebagai fallback.
7. Render yang selesai dibedakan dari hasil yang sudah diperiksa. Catat yang belum dapat diuji; status `perlu_revisi` atau `preview_tanpa_vo` bila belum memenuhi syarat tayang.
8. Periksa keenam lapisan: sumber asli utuh, cut menjaga makna, caption stabil, efek/zoom tepat fokus, grade tidak merusak detail/warna cerita dan SFX tidak menutupi narasi. Source/props serta hasil versi tersimpan agar revisi dapat diulang.

## Kebutuhan operasional dan kesiapan saat ini

| Kebutuhan | Penanggung jawab | Status / tindakan |
| --- | --- | --- |
| Tim dengan peran terpisah | Kaela | Empat peran terhubung ke panggilan Codex saat episode berjalan; status mengikuti peran aktif |
| SOP, brief dan gate hasil | Kaela | SOP dan template instruksi tersedia; kode episode/path sumber diisi saat chapter masuk |
| Chapter utuh dan urutan baca | Founder → Nara | Belum tersedia; video referensi bukan pengganti chapter |
| VO natural Indonesia dan pelafalan nama | Echo | Belum ada VO produksi/provider suara; gunakan audio tersedia atau laporkan kebutuhan, tanpa pembelian otomatis |
| Musik/SFX/font dengan izin penggunaan | Echo/Zetsu | Aset produksi dan bukti izinnya belum disediakan; jangan mengambil audio dari tutorial sebagai fallback |
| Editing/render Remotion yang dapat diulang | Zetsu | Remotion lokal terhubung ke runner; render H.2641080×1920/30fps, AAC jika ada VO |
| Inspeksi media lokal | Zetsu | Decoder FFmpeg lokal tersedia; ini membantu membaca file, bukan generator VO atau renderer Remotion |
| Sinkronisasi tugas dengan runtime AI | Kaela | Runner web menyimpan tahap, groupchat, hasil/review/keputusan; pekerjaan non-produksi tetap manual |
| Video, cover, judul/deskripsi dan QC | Seluruh tim → Founder | Dibuat per episode setelah input lengkap, bukan hasil otomatis dari pemasangan anggota |

Prioritas pertama adalah sumber chapter, naskah yang telah diperiksa, VO dan renderer. Analitik YouTube, auto-upload, model baru atau agent tambahan tidak dibutuhkan untuk menyelesaikan satu episode awal dan tidak dibuat oleh konfigurasi ini.

## Paket akhir tiap episode

`panel-manifest.json`, `story-map.md`, `script.md`, `scene-plan.json`, `word-timings.json` (audio nyata atau ditandai estimasi), source Remotion + props, `captions.srt`, `asset-licenses.csv`, `recap.mp4`, `cover.png`, `metadata.md` dan `qc-report.md`. Laporan mencatat sumber chapter, versi naskah/audio/timeline, durasi/resolusi/FPS/audio, hasil QC, revisi serta keterbatasan. Gunakan folder per episode agar bahan dan output tidak tertukar.

Belum ada chapter: simpan brief/template; jangan membuat task episode berjalan, progres palsu atau MP4 berisi cerita tebakan. Sesudah chapter lengkap masuk, buat briefing episode pada divisi KaelaCH dan ikuti review/keputusan aplikasi yang sudah ada. Jalur web tersambung ke Codex lokal. Template sesi Claude/Hermes tetap manual dan tidak otomatis mengirim status ke kantor.
