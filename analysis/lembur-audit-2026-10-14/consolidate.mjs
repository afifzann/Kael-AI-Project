import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(await readFile(path.join(directory, 'inventory.json'), 'utf8'));
const sources = ['coverage-installer.json', 'coverage-runtime.json', 'coverage-dashboard.json', 'coverage-parent.json'];
const reviews = new Map();
for (const source of sources) {
  const records = JSON.parse(await readFile(path.join(directory, source), 'utf8'));
  if (!Array.isArray(records)) throw new Error(`Coverage format: ${source}`);
  for (const record of records) {
    const name = /^(?:kantor|kit-kantor-ai|\.[^/]+)\//.test(record.path) ? record.path : 'kit-kantor-ai/' + record.path;
    const status = /^HANYA\s+rentang|\bpartial\b|range.only/i.test(record.note || '') ? 'partial-static' : record.status;
    if (!reviews.has(name)) reviews.set(name, []);
    reviews.get(name).push({ ...record, path: name, status, reviewer: source });
  }
}
const rank = { 'read-static': 4, 'hash-identical': 3, 'partial-static': 2, 'reviewed-regex-only': 1, 'not-read': 0 };
const reviewed = file => (reviews.get(file) || []).sort((a, b) => (rank[b.status] || 0) - (rank[a.status] || 0))[0];
const rows = inventory.entries.filter(e => e.sha256).map(e => {
  let review = reviewed(e.path);
  if (e.path.startsWith('kantor/')) {
    const counterpart = inventory.entries.find(k => k.path === 'kit-kantor-ai/' + e.path.slice(7));
    const counterpartReview = counterpart && reviewed(counterpart.path);
    if (counterpart?.sha256 === e.sha256 && counterpartReview?.status === 'read-static' && review?.status !== 'read-static') {
      review = { path: e.path, status: 'hash-identical', note: `Identik SHA-256 dengan ${counterpart.path} yang dibaca penuh.`, reviewer: counterpartReview.reviewer };
    }
  }
  if (!review || !['read-static', 'hash-identical', 'metadata-only'].includes(review.status)) {
    const duplicate = inventory.entries.find(k => k.path !== e.path && k.sha256 === e.sha256 && reviewed(k.path)?.status === 'read-static');
    if (duplicate) review = { path: e.path, status: 'hash-identical', note: `Identik dengan ${duplicate.path} yang dibaca penuh.`, reviewer: reviewed(duplicate.path).reviewer };
  }
  return { ...e, status: review?.status || 'inventoried-not-read', note: review?.note || 'Metadata/hash tersedia; isi belum dibaca oleh reviewer.', reviewer: review?.reviewer || '' };
});
const extraReviews = [...reviews.entries()].filter(([name]) => !inventory.entries.some(e => e.path === name)).map(([file, records]) => ({ path: file, reviews: records }));
const totals = {};
for (const row of rows) totals[row.status] = (totals[row.status] || 0) + 1;
await writeFile(path.join(directory, 'coverage.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totals, rows, extraReviews, excluded: inventory.excluded }, null, 2));

const componentRows = [
  ['Bootstrap lisensi', 'kit-kantor-ai/installer/pasang-awal.sh', 'Validasi hak unduh, hash mesin, unduh/hash/ekstraksi, panggil setup', 'Perintah install pelanggan; laporan03/04'],
  ['Setup root', 'kit-kantor-ai/mulai.sh', 'OS, user, CLI, proxy/HTTPS, login provider dan tmux wizard', 'Bootstrap; laporan03'],
  ['Setup manual', 'kit-kantor-ai/pasang.sh', 'Struktur folder dan template dasar; berbeda jalur wizard', 'Owner manual; laporan03'],
  ['Wizard', 'kit-kantor-ai/installer/wizard.mjs', 'HTTP loopback, token/cookie, formulir, status dan selesai', 'mulai.sh; memanggil pasang.mjs; laporan03'],
  ['Materialisasi', 'kit-kantor-ai/installer/pasang.mjs', 'Peran, aturan, fakta, skill, task, dashboard, cron dan tools', 'Wizard; laporan03/05'],
  ['Dashboard', 'kit-kantor-ai/dashboard/server.mjs', 'Status file task, login, jawaban owner, helper tools, update', 'tmux/cron; laporan02/06'],
  ['Situs', 'kit-kantor-ai/dashboard/situs.mjs', 'Preview/public website dan batas filesystem', 'Proxy + web helper; laporan02/06'],
  ['UI', 'kit-kantor-ai/dashboard/aset/app.js', 'Tampilan task dan polling', 'Dashboard HTML; laporan02'],
  ['Kantor visual', 'kit-kantor-ai/dashboard/aset/kantor.js', 'Sprite/gambar ruang/graf jalur dan status task', 'Dashboard HTML; laporan02'],
  ['Heartbeat', 'kit-kantor-ai/detak.sh', 'Jam kerja, task/idle, kuota/cooldown, flock, Claude CLI baru', 'Cron manager; laporan05'],
  ['Notifikasi', 'kit-kantor-ai/notif.sh', 'Transport notif opsional dari config pelanggan', 'Heartbeat/manual; laporan05'],
  ['Policy AI', 'kit-kantor-ai/pagar/settings.json', 'Allow/ask/deny tools dan hook Google Drive', 'Installer + Claude CLI; laporan05/06'],
  ['Tools bisnis', 'kit-kantor-ai/alat/', 'CSV/XLSX, kas, tagihan, Drive, web, Repliz dan lainnya', 'CLI/AI/dashboard sesuai alat; laporan05/06'],
  ['Kontrak kerja', 'kit-kantor-ai/{peran,skill,sop,task,kotak-masuk}/', 'Prompt, SOP, status task dan handoff berkas', 'AI membaca; bukan semua aturan dipaksakan server; laporan05'],
  ['Update', 'kit-kantor-ai/update.sh', 'Cek versi/hak, unduh/hash, stage, invoke updater', 'Dashboard/cron/manual; laporan03/04'],
  ['Penerapan update', 'kit-kantor-ai/installer/perbarui.mjs', 'Pelestarian/konflik konfigurasi dan penggantian file', 'update.sh; laporan03/04'],
  ['Diagnosis/check', 'kit-kantor-ai/{diagnosa.sh,cek/}', 'Pemeriksaan pemasangan source; tidak dijalankan audit', 'Owner/installer; laporan03/05'],
  ['Bonus alternatif', 'kit-kantor-ai/bonus/jalur-hemat/', 'OpenCode/DeepSeek dan prompt pembuatan bot', 'Jalur opsional; bukan native runtime; laporan05'],
];
const groups = {};
for (const e of inventory.entries.filter(e => e.kind === 'file')) {
  const root = e.path.split('/')[0]; groups[root] ||= { files: 0, bytes: 0, text: 0 };
  groups[root].files++; groups[root].bytes += e.bytes; if (e.sha256) groups[root].text++;
}
const md = `# 01 — Inventaris codebase dan cakupan pembacaan\n\nTanggal: 14 Oktober 2026. Root sumber: \`${inventory.summary.source}\`. Seluruh operasi pada backup read-only.\n\n## Angka dan batas lingkup\n\nPemindaian menghasilkan **${inventory.summary.entries} entri terjangkau**, terdiri atas ${inventory.summary.files} file dan ${inventory.summary.directories} direktori. Ada **${inventory.excluded.length} path/direktori metadata-only** yang tidak ditelusuri isinya oleh pemindai. Angka ini **bukan total seluruh isi home**, karena cache, dependensi, sesi, rahasia, data bisnis aktif dan arsip historis dikecualikan. File biner/aset hanya dihitung metadata; **${rows.length} berkas teks/source** memiliki checksum dan jumlah baris.\n\nKit lokal: **0.18.7** dari \`kit-kantor-ai/VERSI:1\`. Runtime \`mulai.sh:65–72\` menerima Node major≥20 dan menawarkan instalasi kanal22; kompatibilitas semua versi belum diuji. Basis dashboard memakai modul bawaan Node, tanpa manifest aplikasi utama. Manifest \`kantor/carousel/package.json\` mendeklarasikan Playwright; lock yang tersedia dianalisis di laporan05. Tidak ada bukti database SQL/Redis pada arsitektur inti yang ditelusuri; penyimpanan utama Markdown/CSV/JSON dan file.\n\nStruktur lengkap pada [inventory-tree.txt](inventory-tree.txt); metadata/hash pada [inventory.json](inventory.json).\n\n~~~text\nkantor/                         aplikasi/config saat dicadangkan\n  dashboard/ alat/              source aktif (banyak identik kit)\n  peran/ skill/ sop/            identitas dan aturan kerja\n  task/ hasil/ brand/ catatan/   data aktif — metadata saja\n  .claude/ .rahasia/            policy/prompt tertentu diperiksa aman; secrets tidak\nkit-kantor-ai/                  paket produk referensi\n  installer/ dashboard/ alat/\n  peran/ skill/ sop/ task/\n  pagar/ cek/ bonus/ studi-kasus/\ncadangan-kantor/                arsip lama — tidak diekstrak\n.claude/ .ssh/ .local/           akun, sesi, binary — metadata saja\n.cache/ .npm/ .config/          cache/browser/dependensi — metadata saja\n.kantor-*                      konfigurasi instalasi/aktivasi — nilai tidak dibaca\n~~~\n\n## Peta komponen\n\n| Komponen | Lokasi relatif | Fungsi | Dipanggil oleh / analisis |\n|---|---|---|---|\n${componentRows.map(r => '| ' + r.join(' | ') + ' |').join('\n')}\n\n## Urutan pembacaan\n\n1. Inventaris + VERSI + manifest; bedakan kit dan runtime aktif.\n2. pasang-awal → mulai/alamat → wizard → pasang; bedah hak root/user, token dan perubahan host.\n3. update → perbarui; trace lisensi/manifest/backup/restart.\n4. server/situs → app/kantor/assets; inventaris semua route dan boundary login/file/helper.\n5. detak/notif → aturan/peran/task/SOP → helpers/policy/bonus; bedakan prose dan enforcement.\n6. Bandingkan salinan aktif memakai SHA-256; perbedaan konfigurasi/prompt diperiksa tanpa nilai secret.\n7. Konsolidasi keamanan, batas sumber, perbandingan KAEL dan blueprint independen.\n\n## Cakupan hasil\n\n| Status | Jumlah berkas teks dalam inventaris |\n|---|---:|\n${Object.entries(totals).map(([k,v]) => '| ' + k + ' | ' + v + ' |').join('\n')}\n\n\`read-static\` = reviewer mencatat pembacaan penuh source; \`hash-identical\` = salinan identik file yang dibaca; \`partial-static\` = hanya rentang tertentu; \`reviewed-regex-only\` = pencarian terarah; \`inventoried-not-read\` = belum dibaca. Bukti per file: [coverage.json](coverage.json), [11-FILE-REFERENCE-INDEX.md](11-FILE-REFERENCE-INDEX.md). Penilaian ini bukan hasil tes runtime.\n\nPengecualian aman pada direktori .claude: key/config metadata yang disaring dan prompt agent/skill nonrahasia diperiksa tersendiri; file credentials, transcript/session, cookie dan private key tidak dibaca. Catatan tambahan tersebut ada pada coverage reviewer walaupun direktori induk dikecualikan pemindai awal.\n\n## Bagian metadata-only dan alasannya\n\n${inventory.excluded.map(e => '- \`' + e.path + '\`: ' + ({"credentials, environment, dependencies, caches or historical archive: metadata only":"rahasia, lingkungan akun, dependensi, cache atau arsip historis: metadata saja","active business/session data: metadata only; template counterpart reviewed":"data bisnis/sesi aktif: metadata saja; template padanannya ditinjau","symlink not followed":"tautan simbolik tidak diikuti"}[e.reason] || e.reason) + '.').join('\n')}\n\n546 gambar WebP, font WOFF2 dan binary lain tidak dinilai visual satu per satu. Pemberitahuan MIT/OFL aset dibaca; hak keseluruhan kit tidak disimpulkan dari notice aset. Arsip lama tidak dibuka ulang agar tidak memuat kembali secrets/data pelanggan.\n\n## Keutuhan dan pemulihan\n\nMetadata menunjukkan \`.local/bin/claude\` dan wrapper \`kantor/carousel/node_modules/.bin/playwright\` berukuran0B, tanpa jenis link pada hasil ekstrak Windows. Versi-folder Claude2.1.294 ada sebagai metadata; itu bukan bukti CLI hasil ekstrak bisa berjalan. Backup tidak mencakup bukti konfigurasi /etc, crontab efektif atau service Linux. Pemulihan symlink/permissions dan runtime perlu restore terisolasi berizin, bukan menjalankan file backup sekarang.\n`;
await writeFile(path.join(directory, '01-CODEBASE-INVENTORY.md'), md);

const index = `# 11 — Indeks rujukan file\n\nRoot seluruh path: \`${inventory.summary.source}\`. Laporan03/04 memakai root pendek kit-kantor-ai; tambahkan prefix tersebut ketika mencocokkan rujukannya. Semua path lain menyatakan rootnya di awal dokumen. Nomor baris berdasarkan snapshot0.18.7; tidak menjamin sama dengan server vendor.\n\n## Cara memverifikasi\n\nBuka path relatif pada root backup, cocokkan baris/simbol, lalu lihat laporan tematik. SHA-256 tersedia di inventory.json untuk membuktikan salinan yang sama tanpa menyalin file ke aplikasi. Checksum inventaris adalah identitas snapshot audit, bukan tanda tangan penerbit.\n\n## Berkas source/teks dan status review\n\n| File relatif | Baris | Review | Pemeriksa |\n|---|---:|---|---|\n${rows.map(e => '| ' + '\`' + e.path + '\`' + ' | ' + e.lines + ' | ' + e.status + ' | ' + e.reviewer + ' |').join('\n')}\n\n## Rujukan tematik utama\n\n- Instalasi, user/root, wizard dan domain: laporan03; bootstrap/installer/mulai/alamat.\n- Hak unduh, aktivasi, hash mesin, distribusi dan update: laporan04; client bukan backend lisensi.\n- Dashboard/auth/API/storage/animasi: laporan02; server, situs, app dan kantor.js.\n- Heartbeat, memory/file task, SOP, policy dan integrasi: laporan05; detak, pagar, alat, skill, bonus.\n- Prasyarat dan dampak risiko: laporan06; seluruh temuan memiliki bukti file/baris.\n- KAEL saat ini: package.json, server/index.mjs, server/codex-stage.mjs, server/production.mjs, src/domain.ts dan docs/PRD.md di C:/Kael AI; bukan di root backup.\n- Desain/biaya/roadmap KAEL: laporan07–10 berlabel rekomendasi, bukan source Lembur atau fitur yang sudah dibuat.\n\nCatatan rinci dan tambahan source di direktori yang awalnya metadata-only: [coverage.json](coverage.json) serta coverage tiap reviewer. Rahasia tidak diberi link isi; nilainya tidak diperlukan untuk audit.\n`;
await writeFile(path.join(directory, '11-FILE-REFERENCE-INDEX.md'), index);
console.log(JSON.stringify({ textFiles: rows.length, totals, additionalReviewedPaths: extraReviews.length, notFullRead: rows.filter(r => !['read-static','hash-identical'].includes(r.status)).map(r => ({ path:r.path, status:r.status, note:r.note })) }, null, 2));
