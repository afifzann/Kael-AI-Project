import { readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Audit-owned metadata scanner; never executes, modifies or copies the backup's code or credentials.
const source = 'C:/Kael AI/lembur-backup-lengkap/kantor';
const output = path.dirname(fileURLToPath(import.meta.url));
const entries = [], excluded = [], manifests = [];
const protectedRoots = new Set(['.cache', '.npm', '.ssh', '.config', '.local', '.claude', 'cadangan-kantor']);
const protectedNames = new Set(['.rahasia', 'node_modules', '.git', '.credentials.json', '.env', '.env.local', '.kit-id']);
const runtimeData = new Set(['brand', 'task', 'catatan', 'hasil', 'kotak-masuk', 'masuk']);
async function walk(relative = '') {
  for (const item of await readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = relative ? relative + '/' + item.name : item.name;
    const absolute = path.join(source, name), stat = await lstat(absolute);
    const sensitive = protectedNames.has(item.name) || !relative && (protectedRoots.has(item.name) || item.name.startsWith('.'))
      || relative === 'kantor' && (runtimeData.has(item.name) || item.name === '.claude');
    const entry = { path: name, kind: stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : 'file', bytes: stat.size, modified: stat.mtime.toISOString(), status: sensitive ? 'metadata-only' : 'inventoried' };
    entries.push(entry);
    if (stat.isSymbolicLink()) { excluded.push({ path: name, reason: 'symlink not followed' }); continue; }
    if (sensitive) { excluded.push({ path: name, reason: protectedNames.has(item.name) || !relative ? 'credentials, environment, dependencies, caches or historical archive: metadata only' : 'active business/session data: metadata only; template counterpart reviewed' }); continue; }
    if (stat.isDirectory()) { await walk(name); continue; }
    if (/\.(?:mjs|js|jsx|ts|tsx|sh|md|json|ya?ml|html|css|txt)$/.test(name) || /(?:^|\/)(?:VERSI|Dockerfile|LICENSE)$/.test(name)) {
      const bytes = await readFile(absolute);
      entry.sha256 = createHash('sha256').update(bytes).digest('hex');
      entry.lines = bytes.toString('utf8').split('\n').length;
      if (item.name === 'package.json') {
        try { const p = JSON.parse(bytes.toString('utf8')); manifests.push({ path: name, name: p.name, version: p.version, type: p.type, engines: p.engines, scripts: p.scripts, dependencies: p.dependencies, devDependencies: p.devDependencies }); }
        catch { manifests.push({ path: name, error: 'invalid JSON' }); }
      }
    }
  }
}
await walk();
const summary = { source, generatedAt: new Date().toISOString(), entries: entries.length, files: entries.filter(e => e.kind === 'file').length, directories: entries.filter(e => e.kind === 'directory').length, excluded: excluded.length };
await writeFile(path.join(output, 'inventory.json'), JSON.stringify({ summary, entries, excluded, manifests }, null, 2));
await writeFile(path.join(output, 'inventory-tree.txt'), entries.map(e => `${'  '.repeat(e.path.split('/').length - 1)}${e.path.split('/').at(-1)}${e.kind === 'directory' ? '/' : ''}${e.status === 'metadata-only' ? ' [METADATA ONLY]' : ''}`).join('\n') + '\n');
console.log(JSON.stringify({ summary, manifests, textFiles: entries.filter(e => e.lines).map(e => ({ path: e.path, lines: e.lines, bytes: e.bytes })) }, null, 2));
