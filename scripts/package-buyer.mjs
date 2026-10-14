import { mkdir, readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sources only: dependencies/build are prepared on the destination, never copied from the owner's machine.
export async function packageBuyer(root, output) {
  const files = ['package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'scripts/dev.mjs', 'scripts/owner-access.mjs', 'scripts/building.mjs', 'docs/BUYER-SETUP.md'];
  async function visit(relative) {
    const stat = await lstat(path.join(root, relative));
    if (stat.isSymbolicLink()) throw new Error(`Tautan file tidak boleh masuk paket: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of (await readdir(path.join(root, relative))).sort()) if (name !== '__pycache__') await visit(`${relative}/${name}`);
    } else {
      if (!stat.isFile() || (!/\.(ts|css|mjs|jsx|py|svg|png)$/.test(relative) && relative !== 'server/recap/sop.md')) throw new Error(`File bukan sumber aplikasi: ${relative}`);
      files.push(relative);
    }
  }
  for (const folder of ['src', 'server', 'public']) await visit(folder);
  for (const relative of files) if (!(await lstat(path.join(root, relative))).isFile()) throw new Error(`Sumber tidak aman: ${relative}`);
  // Refuse overwrite: a destination might already contain a customer's working installation.
  await mkdir(path.dirname(output), { recursive: true }); await mkdir(output);
  const hashes = {};
  async function save(relative, bytes) {
    await mkdir(path.dirname(path.join(output, relative)), { recursive: true });
    await writeFile(path.join(output, relative), bytes, { flag: 'wx' });
    hashes[relative] = createHash('sha256').update(bytes).digest('hex');
  }
  for (const relative of files) {
    let bytes = await readFile(path.join(root, relative));
    if (relative === 'src/builder-room.ts') {
      const source = bytes.toString(), clean = source.replace(/\/\/ This is the owner's existing Codex chat[^\r\n]*\r?\nexport const builderSession = \{[\s\S]*?\n\};/, "// Buyer connects their own Builder session; no owner session is bundled.\nexport const builderSession = { title: 'Builder', threadId: '', url: '' };");
      if (source === clean) throw new Error('Konfigurasi Builder berubah. Periksa isolasi sesi sebelum membuat paket.');
      bytes = Buffer.from(clean);
    }
    if (relative === 'package.json') {
      const config = JSON.parse(bytes); delete config.scripts.test; delete config.scripts['package:buyer'];
      bytes = Buffer.from(JSON.stringify(config, null, 2) + '\n');
    }
    await save(relative, bytes);
  }
  await save('README.md', await readFile(path.join(root, 'docs/BUYER-SETUP.md')));
  await save('.gitignore', Buffer.from('node_modules/\ndist/\napp-data/\n.env\n.env.*\n*.log\n'));
  const instructions = '# Kantor buyer\n\nBaca README.md. Data kantor berada di app-data; jangan mengubahnya langsung. Jangan membaca atau mencetak .env, password, atau kunci. Pengaturan tim dilakukan melalui node scripts/building.mjs inspect, preview, apply dengan revision terbaru. Tugas dan persetujuan hasil dilakukan melalui dashboard. Jangan menyatakan provider terhubung sebelum status runtime terverifikasi. Jangan memberi persetujuan pemilik otomatis.\n';
  await save('AGENTS.md', Buffer.from(instructions)); await save('CLAUDE.md', Buffer.from(instructions));
  await writeFile(path.join(output, 'buyer-manifest.json'), JSON.stringify({ format: 1, version: JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version, files: hashes }, null, 2) + '\n', { flag: 'wx' });
  return { output, files: Object.keys(hashes).length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), releases = path.join(root, 'releases');
  const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
  const output = path.resolve(root, process.argv[2] || `releases/kael-buyer-${version}`);
  const relative = path.relative(releases, output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Tujuan paket harus folder baru di dalam releases/.');
  try { const result = await packageBuyer(root, output); console.log(`Paket sumber buyer dibuat: ${result.output}\n${result.files} file, tanpa data kantor dan kredensial. Baca README paket; ini belum installer VPS.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
