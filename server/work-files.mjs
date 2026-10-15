import { createHash } from 'node:crypto';
import { validateMaterials, materialTools } from '../src/work-materials.ts';

const digest = content => createHash('sha256').update(content).digest('hex');
const encoded = name => encodeURIComponent(name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

// Downloads are generated from immutable state records; no user-controlled filesystem path is opened.
export function workFiles(req, res, state, send) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/work-files/')) return false;
  if (req.method !== 'GET') { send(res, 405, { error: 'Berkas kerja hanya dapat dibaca.' }); return true; }
  try {
    let content, name;
    const source = url.pathname.match(/^\/api\/work-files\/source\/(request|brief)\/([\w-]{1,80})\/([0-4])$/);
    const report = url.pathname.match(/^\/api\/work-files\/result\/([\w-]{1,80})\/v([1-9]\d{0,5})\.(txt|md)$/);
    const tools = url.pathname.match(/^\/api\/work-files\/tools\/([\w-]{1,80})\.json$/);
    if (source) {
      const record = (source[1] === 'request' ? state.managerRequests || [] : state.briefs).find(v => v.id === source[2]);
      const material = record && validateMaterials(record.materials)[Number(source[3])];
      if (material) { content = material.content; name = material.name; }
    } else if (report) {
      const task = state.tasks.find(t => t.id === report[1]), brief = state.briefs.find(b => b.id === task?.briefId), result = task?.results.find(r => r.version === Number(report[2]));
      if (brief && result && !state.productionTaskIds?.includes(task.id) && !state.productions?.some(p => p.taskId === task.id)) {
        name = `kael-hasil-${task.id}-v${result.version}.${report[3]}`;
        const materials = validateMaterials(brief.materials);
        content = report[3] === 'txt' ? result.content : `# ${task.title}\n\nTugas: ${task.id}\nBriefing: ${brief.id}\nVersi: ${result.version}\nDisimpan: ${result.createdAt}\n\nUnduhan tidak memberi persetujuan. Lihat keputusan versi ini di dashboard Kael.\n\n## Hasil\n\n${result.content}\n\n## Bahan sumber\n\n${materials.map((m, i) => `${i + 1}. ${m.name} — SHA-256 ${digest(m.content)}`).join('\n') || 'Tidak ada berkas bahan unggahan.'}\n\n## Hasil alat lokal csv-summary\n\n${JSON.stringify(materialTools(materials), null, 2)}\n`;
      }
    } else if (tools) {
      const brief = state.briefs.find(b => b.id === tools[1]);
      if (brief) { content = JSON.stringify({ briefId: brief.id, sources: validateMaterials(brief.materials).map(m => ({ name: m.name, sha256: digest(m.content) })), observations: materialTools(brief.materials) }, null, 2) + '\n'; name = `kael-alat-${brief.id}.json`; }
    }
    if (content === undefined) send(res, 404, { error: 'Bahan atau versi hasil tidak ditemukan.' });
    else {
      const bytes = Buffer.from(content);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="kael-download.txt"; filename*=UTF-8''${encoded(name)}`, 'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'X-Kael-Content-SHA256': digest(bytes) }); res.end(bytes);
    }
  } catch { send(res, 400, { error: 'Berkas kerja tidak dapat dibaca. Data tersimpan dipertahankan; periksa format bahan.' }); }
  return true;
}
