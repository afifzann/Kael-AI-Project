# Tahap 1 — navigasi dan pusat divisi

14 Oktober 2026. Scope: UI dashboard; tanpa perubahan backend, schema, roster, workflow binding, approval atau kantor 3D.

## Perubahan dan jalur tindakan

| Tujuan | Jalur |
|---|---|
| Ringkasan | Preview Founder → enterRoom(founder); pekerjaan → taskDetail/openProduction/workflow-open |
| Pemberitahuan Ringkasan/lonceng | workspaceNotifications → activateNotification; insiden → medis + detail, approval → preview/keputusan, koneksi → workflow |
| Divisi | findDivisions → openDivision; manager dan anggota dibaca dari state |
| Bagian divisi | openDivisionSection; manual → tugas/hasil, n8n → monitoring, recap → productionUI preview/chat/files |
| Anggota | openAgent → profil karakter yang ada |
| Keputusan | decisionDetail; gate versi/QC/watched tetap pada implementasi produksi |
| Pekerjaan | divisionState untuk scope; opsi semua divisi mengembalikan daftar global |
| Pengaturan | business/provider command yang ada, workflowDashboard, ruang server, Builder, ekspor JSON |
| Builder | antarmuka yang ada dan sesi Codex; tidak menampilkan transcript sesi ini |

URL bagian divisi divalidasi melalui allowlist dan dipertahankan pada reload/Back. Nama agent/divisi baru tidak menambah menu utama. Produksi masih memakai kontrak onboarding KaelaCH lama; kemampuan SOP baru belum dapat dikonfigurasi pada tahap 1. Chat umum, Telegram, Obsidian dan model per agent tidak diklaim terhubung.

## Pemeriksaan

- Delapan tes UI lulus: route, bagian divisi, pencarian perusahaan/anggota/peran, isolasi kemampuan, notifikasi, sejarah n8n, hitungan dan preview camera.
- Seluruh 95 tes lulus. Percobaan sandbox pertama gagal pada rename temporer dan server fixture; pengulangan scoped di luar sandbox lulus, memakai data dummy.
- TypeScript dan Vite build lulus; peringatan bundle >500 kB yang sudah ada tetap muncul.
- Frontend `/`, `/src/operations.ts`, `/src/dashboard.css`, `/api/state`: HTTP 200.
- Server sebelumnya tidak memiliki listener. Dev coordinator dijalankan tersembunyi (PID 9936 saat pemeriksaan).
- Persisted state tetap revision 9, 2 divisi, 7 agent, 2 binding. SHA256 sebelum/sesudah: `FF4149D5C6B5150C7E3833BA6917D470B6D6A3EF5FCFCDB726F35A868BF979F4`.
- Tidak mengirim command ke API produksi, menjalankan workflow eksternal, mengubah keputusan atau membaca kredensial.

## Batas pemeriksaan

Pemeriksaan visual langsung, layout pixel aktual, sentuhan, keyboard/screen reader di browser dan kinerja GPU belum dilakukan. Pembatasan browser yang telah dilaporkan tidak dilewati dengan alat alternatif. Build/tes/HTTP bukan bukti bahwa seluruh tampilan telah ditinjau visual.
