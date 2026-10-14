# Kajian UI video dan usulan layout Kael

Status: kajian fitur untuk diskusi; usulan layout di bawah adalah riwayat. Tanggal kajian: 13 Oktober 2026, koreksi Founder: 14 Oktober 2026.

Founder menegaskan bahwa video menjadi patokan **fitur**, sedangkan layout harus dirancang sendiri. Rancangan aktif di PRD v2.23 memakai satu bangunan dengan lobby/parkiran depan, taman/lapangan luar dan grid kaca berframe hitam. Implementasi penataan tersebut tidak otomatis menerapkan fitur tambahan dari tabel di bawah.

Sumber lokal: `C:/Users/afifz/Downloads/ssstik.io_@dilhampm_1791895366619.mp4`. Durasi 65,48 detik, 576×1024. Tinjauan visual dari contact sheet tiap 3 detik dan frame rinci 14/31/35/43/47/50/52/53/56/59 detik. Tidak memakai nama/jabatan agent referensi sebagai struktur organisasi Kael. Ini kajian tampilan/interaksi video, bukan verifikasi backend referensi.

## Pengamatan dan adaptasi fitur

| Bagian video | Yang terlihat | Adaptasi untuk Kael |
| --- | --- | --- |
| ±14–31, 59 detik | Kantor 3D, karakter dapat dipilih, kontrol putar/reset, daftar tim/status, lampu per zona, audio | Pertahankan navigasi karakter dan kamera; rapikan kontrol menjadi toolbar kecil. Tambahkan fokus area/agent yang konsisten. Lampu zona dapat menjadi opsi suasana; audio bukan prioritas operasional. |
| ±19–29 detik | Kartu detail karakter dengan tombol memberi tugas | Profil menjadi pintu tindakan kontekstual: tugas, monitoring workflow atau ruang kerja sesuai koneksi nyata. Builder tetap mengikuti sesi Codex, tanpa riwayat chat web. |
| ±35–43 detik | Pilihan pelaksana, pilihan akun, template tugas, arahan, data pendukung, unggah screenshot dan pilihan menyertakan data dashboard | Form tugas ringkas di dalam workspace divisi; pilihan proyek/akun, template output, bahan dan kriteria selesai. Memakai gate rencana/review/Founder yang sudah ada. Workflow n8n tetap pantauan, tidak menerima tugas manual yang tidak didukung. |
| ±47 detik | Hasil teks, status selesai/tersimpan, tombol salin | Satu tempat hasil tugas/versi/preview dengan salin atau unduh, revisi, approve/tolak sesuai kemampuan alat. KaelaCH sudah memiliki preview dan keputusan; rapikan aksesnya, jangan buat halaman global baru khusus tiap divisi. |
| ±50 detik | Pusat akun: nama/username/platform, target posting/follower, gaya bahasa | Profil proyek/brand per divisi agar data KaelaCH dan Laxholm tidak tercampur. Tautan akun bukan otomatis login/koneksi API. |
| ±52 detik | Rapat mingguan: sasaran, pilihan akun, jumlah konten/budget dan tahap hasil berantai | Review berkala: kumpulkan pekerjaan, error dan keputusan yang nyata, tampilkan agenda → pembahasan → tindakan berikutnya. Review AI otomatis memerlukan runtime yang benar-benar tersedia. |
| ±53–56 detik | Kalkulator KPI dengan input manual dan rumus terlihat | Tambahan khusus workspace yang membutuhkan analitik. KaelaCH: output/publikasi/performa bila datanya tersedia. n8n: eksekusi berhasil/gagal/waktu proses. Bukan menu wajib semua divisi. |
| ±47 detik | Tab Kalender, Referensi, Riwayat, Memori Tim, Ide Konten, Performa Konten | Kandidat fitur; panelnya tidak semuanya dibuka dalam video. Prioritaskan kalender pekerjaan dan referensi/SOP per proyek. Riwayat pekerjaan dibedakan dari riwayat sesi Builder yang tidak diminta tampil di web. |

## Kondisi Kael dari source saat kajian

- Workspace divisi, tugas, keputusan, profil, navigasi agent, kontrol kamera dan pencatatan meeting sudah ada.
- KaelaCH punya unggahan bahan, SOP runner, preview, hasil ber-versi, percakapan produksi dan keputusan Founder.
- Laxholm memakai pemantauan n8n; Bu Yuli manager dan Date perwakilan workflow. Bahan contoh video tidak boleh mengganti peran ini.
- Profil bisnis masih global; akun/brand per divisi, template brief generik, lampiran tugas umum, kalender dan kalkulator KPI belum menjadi fitur umum.
- Builder memakai status sesi Codex yang sama. Riwayat sesi tidak ditampilkan di web.

## Arah layout yang disarankan

Satu bangunan kantor kompak dengan area kerja bersama, bukan deretan plot ruangan lepas dengan koridor panjang. Skema berikut menunjukkan hubungan ruang, belum merupakan denah ukuran final:

```text
┌───────────┬──────────────────┬───────────┐
│ Founder   │ Meeting bersama  │ Server    │
├───────────┼──────────────────┼───────────┤
│ Builder   │ Area kerja divisi│ Medis     │
│ kecil     │ + sirkulasi      │           │
├───────────┴──────────────────┴───────────┤
│ Lounge & kopi │ Courtyard │ Area aktif │
└────────────────────────────────────────┘
```

- Builder sekarang 8,4×10,4 = 87,36 unit persegi scene. Usulan awal sekitar 4,5×4,5 = 20,25 unit persegi, sekitar seperempatnya. Ukuran ini usulan proporsi, bukan ukuran meter dunia nyata. Meja ringkas, kursi, monitor, papan kerja/rak dinding dan satu tanaman; furniture harus ditata ulang agar pintu dan jalur kursi tetap lega.
- Founder dekat pintu masuk dan Builder; satu ruang meeting bersama dekat area kerja.
- Dua divisi awal berbagi area studio dengan zona yang terbaca, sudut manager terpisah dan akses depan meja. Area/ruang baru mengikuti kapasitas, bukan semua memakai ukuran yang sama.
- Server dan medis di tepi area tenang, tetap dapat diakses dari koridor utama.
- Lounge/kopi, courtyard dan area aktif berdekatan agar perjalanan santai masuk akal. Lapangan tetap punya interaksi yang sudah ada.
- Dinding luar memakai cutaway; partisi dalam kaca/low wall; batas divisi bisa dibantu karpet, penyimpanan dan tanaman. Hindari tembok tinggi menutup kamera dan label besar menghalangi karakter.
- Satu jalur utama yang jelas ditambah cabang pendek. Jalur masuk, jarak kursi, collision dan fasilitas harus dihitung bersama geometry, bukan sekadar memindah mesh.
- Re-layout awal boleh memindahkan semua ruangan secara visual sesuai permintaan. Setelah disepakati, penambahan divisi memakai area ekspansi agar tidak mengacak kantor setiap kali; ID agent/divisi, pekerjaan, binding n8n dan sesi Builder tetap dipertahankan.

## Prioritas usulan untuk diskusi

1. Sepakati denah kompak, ukuran Builder dan jenis pembatas antar-divisi.
2. Rapikan pintu masuk workspace/tugas/hasil/keputusan dalam navigasi yang sudah ada.
3. Pilih penambahan fitur: template tugas + konteks proyek + lampiran pendukung terlebih dahulu, lalu kalender/review berkala.
4. Kalkulator KPI, audio dan kontrol lampu detail opsional sesuai kebutuhan; tidak menambah semua menu video sekaligus.

Pertanyaan desain berikutnya: divisi memakai partisi kaca rendah dalam satu area studio, atau ruang kaca tertutup dengan pintu masing-masing? Rekomendasi awal: area studio dengan partisi rendah, Founder/meeting/server/medis sebagai ruang khusus.

Belum ada source/data/PRD aktif yang diubah untuk usulan ini. Tidak melakukan pengujian implementasi atau mengklaim hasil render kantor sudah sesuai. Frame analisis ada di `evidence/reference-dilhampm/`.
