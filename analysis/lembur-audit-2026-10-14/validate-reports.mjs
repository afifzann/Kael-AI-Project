import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const output = path.dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(await readFile(path.join(output, 'inventory.json'), 'utf8'));
const coverage = JSON.parse(await readFile(path.join(output, 'coverage.json'), 'utf8'));
const reports = (await readdir(output)).filter(f => /^\d{2}-.*\.md$/.test(f)).sort();
if (reports.length !== 12) throw new Error('Dua belas laporan belum lengkap.');
const failures = [], warnings = [];
let references = 0, links = 0, checksums = 0;
for (const report of reports) {
  const text = await readFile(path.join(output, report), 'utf8');
  if (text.length < 1500) failures.push({ report, issue: 'report too short' });
  if (/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{24,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./.test(text)) failures.push({ report, issue: 'possible secret pattern; inspect locally without printing match' });
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1]; if (/^(?:https?:|#|C:)/i.test(target)) continue;
    links++;
    try { await lstat(path.resolve(output, target.split('#')[0])); }
    catch { failures.push({ report, issue: 'broken local link', target }); }
  }
  for (const match of text.matchAll(/((?:kit-kantor-ai|kantor)\/[\w./-]+\.(?:mjs|js|sh|md|json|css|txt)):(\d+)(?:[–-](\d+))?/g)) {
    references++;
    const entry = inventory.entries.find(e => e.path === match[1]);
    if (!entry) { warnings.push({ report, file: match[1], issue: 'reference outside initial inventory; may be safe metadata exception' }); continue; }
    if (entry.lines && Math.max(Number(match[2]), Number(match[3] || 0)) > entry.lines) failures.push({ report, file: match[1], issue: 'line number outside snapshot', line: Number(match[3] || match[2]), maximum: entry.lines });
  }
}
// Re-read hashes only, never display or interpret values of business/status data.
for (const entry of inventory.entries.filter(e => e.sha256)) {
  const bytes = await readFile(path.join(inventory.summary.source, entry.path));
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) failures.push({ file: entry.path, issue: 'source changed since inventory' });
  checksums++;
}
const result = { generatedAt: new Date().toISOString(), method: 'audit-output validation and source checksum comparison only; no product code executed', reports: reports.map(file => ({ file })), count: reports.length, referenceChecks: references, localLinks: links, sourceChecksums: checksums, coverage: coverage.totals, failures, warnings };
await writeFile(path.join(output, 'validation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ reports: reports.length, referenceChecks: references, localLinks: links, sourceChecksums: checksums, coverage: coverage.totals, failures, warnings }, null, 2));
if (failures.length) process.exitCode = 1;
