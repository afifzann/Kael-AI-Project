import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { officeRoleCommand } from '../src/office-role.ts';
import { workItems } from '../src/work.ts';

export async function createOfficeBridge({ directory, getState, mutate, runtime, dialogue }) {
  const file = path.join(directory, 'office-sessions.json');
  const resultReads = new Map();
  let data = { sessions: [], memories: [] }, queue = Promise.resolve();
  try {
    data = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(data.sessions) || !Array.isArray(data.memories) || data.sessions.some(v => !v || typeof v.id !== 'string' || typeof v.nativeId !== 'string' || typeof v.agentId !== 'string' || !['Claude', 'Codex'].includes(v.client)) || data.memories.some(v => !v || typeof v.agentId !== 'string' || !Number.isSafeInteger(v.version) || typeof v.text !== 'string')) throw new Error();
  } catch (e) { if (e.code !== 'ENOENT') throw new Error('Konteks sesi kantor rusak; berkas dipertahankan.'); }
  async function save(fn) {
    const operation = queue.then(async () => { const next = structuredClone(data), result = await fn(next); await writeFile(file + '.tmp', JSON.stringify(next), { mode: 0o600, flush: true }); await rename(file + '.tmp', file); data = next; return result; });
    queue = operation.catch(() => {}); return operation;
  }
  const roles = () => [{ id: 'builder', name: 'Builder', role: 'Pengurus kantor', division: '', manager: false }, ...getState().agents.map(a => ({ id: a.id, name: a.name, role: a.role, manager: a.manager, division: getState().divisions.find(d => d.id === a.divisionId)?.name || '' }))];
  function resolveRole(name) {
    if (typeof name !== 'string') throw new Error('Sebut nama peran atau ID agent.');
    const exact = roles().find(a => a.id === name.trim()); if (exact) return exact.id;
    const found = roles().filter(a => a.id === name || a.name.toLowerCase() === name.trim().toLowerCase());
    if (found.length !== 1) throw new Error('Peran tidak ditemukan atau namanya berulang. Jalankan office.mjs roles dan pilih ID yang sesuai.');
    return found[0].id;
  }
  function session(input) {
    const s = data.sessions.find(s => s.id === input.sessionId || input.nativeId && s.nativeId === input.nativeId && s.client === input.client);
    return s?.bound ? s : null;
  }
  function context(s) {
    if (!s) return { bound: false };
    const state = getState(), actor = state.agents.find(a => a.id === s.agentId), builder = s.agentId === 'builder';
    if (!builder && !actor) throw new Error('Agent sesi sudah tidak aktif. Pilih peran lagi.');
    const division = state.divisions.find(d => d.id === actor?.divisionId);
    const members = builder ? state.agents : state.agents.filter(a => a.divisionId === division.id);
    const tasks = state.tasks.filter(t => builder || members.some(a => a.id === t.agentId) && (actor.manager || t.agentId === actor.id));
    const briefIds = new Set(tasks.map(t => t.briefId)), taskIds = new Set(tasks.map(t => t.id));
    const scopedDecisions = state.decisions.filter(d => builder || (d.type === 'plan' ? briefIds.has(d.targetId) : taskIds.has(d.targetId)));
    const decisions = scopedDecisions.filter(d => d.status === 'pending');
    const work = new Map(workItems(state).filter(w => w.source === 'manual').map(w => [w.targetId, w]));
    const bindings = state.workflowBindings?.filter(b => members.some(a => a.id === b.agentId)) || [];
    const memory = data.memories.find(v => v.agentId === s.agentId) || { version: 0, text: '' };
    const chosen = [...tasks.filter(t => !['done', 'cancelled'].includes(t.status)).slice(0, 30), ...tasks.filter(t => ['done', 'cancelled'].includes(t.status)).slice(-5)];
    return { bound: true, sessionId: s.id, nativeId: s.nativeId, client: s.client, role: builder ? { id: 'builder', name: 'Builder', manager: false } : actor, revision: state.revision, business: state.business, division: division || null,
      managerRequests: (state.managerRequests || []).filter(r => builder || actor.manager && r.divisionId === division.id).slice(-20).map(({ basis, ...request }) => request),
      members, divisions: builder ? state.divisions : undefined, memory,
      tasks: chosen.map(t => ({ id: t.id, title: t.title, agentId: t.agentId, status: t.status, workStatus: work.get(t.id)?.status, stage: work.get(t.id)?.stage, nextStep: work.get(t.id)?.nextStep, reason: t.reason, version: t.results.length, latestResult: builder ? '' : t.results.at(-1)?.content.slice(0, 2000) || '', resultPartial: (t.results.at(-1)?.content.length || 0) > 2000, briefId: t.briefId })), taskCount: tasks.length,
      briefs: state.briefs.filter(b => builder || b.divisionId === division.id).slice(-30),
      automation: state.automations?.find(v => v.divisionId === division?.id), runs: state.runs?.filter(r => members.some(a => a.id === r.agentId)).slice(-10).map(r => ({ id: r.id, taskId: r.taskId, agentId: r.agentId, kind: r.kind || 'work', status: r.status, provider: r.provider, reviewVersion: r.reviewVersion, resultVersion: r.resultVersion, summary: r.summary, error: r.error })), decisions, recentDecisions: scopedDecisions.filter(d => d.status !== 'pending').slice(0, 20), incidents: state.incidents?.filter(i => !i.resolvedAt && members.some(a => a.id === i.agentId)) || [],
      workflows: bindings.map(b => ({ ...b, snapshot: state.n8n?.find(w => w.workflowId === b.workflowId) || null })),
      sops: state.sops?.filter(v => builder || v.divisionId === division.id).slice(-10) || [],
      notes: state.divisionNotes?.filter(n => n.divisionId === division?.id).slice(-10) || [],
      productions: state.productions?.filter(p => builder || p.divisionId === division.id).map(p => ({ id: p.id, title: p.title, status: p.status, stage: p.stage })),
      proposals: builder ? dialogue.list().slice(0, 10).map((d, i) => ({ id: d.id, name: d.proposal?.name, proposal: i < 3 ? d.proposal : undefined, status: d.status, appliedDivisionId: d.appliedDivisionId, baseRevision: d.baseRevision })) : undefined,
      instructions: builder ? 'Kamu Builder. Wawancarai satu hal per giliran, susun usulan tim/SOP melalui action propose. Usulan masuk preview web; jangan menerapkan atau menyetujui sendiri. Gunakan data kantor ini, bukan nama/tim referensi.' : actor.manager ? 'Kamu manager divisi ini. managerRequests adalah permintaan dari web yang disusun antrean server; jangan membuat manager-plan duplikat untuk permintaan itu. Pertanyaan/kegagalan dijawab pemilik lewat kotak masuk. baru: berarti susun rencana berisi tujuan, kriteria dan tugas per pelaksana, kirim manager-plan. Tunggu approval Founder di web. Saat pengguna mengatakan lanjut, baca konteks terbaru dan nextStep: tugas queued/paused dengan rencana approved dapat dijalankan melalui action run; blocked memerlukan informasi dulu; review memerlukan hasil penuh via action task lalu command review terikat version; approval menunggu Founder; done/cancelled tidak dijalankan lagi. Revisi mengikuti catatan Founder pada task ID yang sama, bukan rencana baru. Jika workflows berisi binding, divisi ini hanya memantau workflow eksternal: laporkan snapshot/insiden dan jangan membuat manager-plan manual, menjalankan ulang atau memperbaikinya tanpa izin. Jika productions berisi episode atau nama divisi KaelaCH, pantau statusnya dan gunakan alur produksi khusus, bukan task umum.' : 'Kamu pelaksana. Kerjakan hanya tugasmu yang rencananya disetujui; start sebelum bekerja, result untuk hasil berversi, hold untuk kendala. Jangan melakukan review sendiri atau memberi keputusan Founder.',
      rules: 'Baca context sebelum setiap perubahan. Kirim base revision terbaru; jika konflik, baca ulang dan tinjau, jangan retry buta. Semua decide/approval/penghapusan/publikasi/pembayaran ditolak untuk sesi AI. Tidak membaca .env, kunci, password atau transcript privat. Simpan ringkasan penting via memory (version terbaru), catatan kerja via division-note; jangan menyimpan chain-of-thought atau rahasia. Model sesi dipilih dalam aplikasi AI; setelan runtime agent tidak mengganti model chat ini. Setelah hasil/keputusan berubah, baca context lagi: recentDecisions berisi keputusan Founder terbaru, tasks.nextStep mengikuti tahap pada web. Jika automation.enabled aktif dan briefing ditandai automation, antrean server melanjutkan pekerjaan/review: jangan mengirim run/review duplikat; pantau runs dan keputusan. Saat lanjut, gunakan task ID yang sama untuk revisi, pertahankan hasil lama, dan ikuti arahan versi terbaru; jangan membuat brief/tugas pengganti untuk menghindari penolakan. Pertanyaan status hanya dibaca, tidak memulai run. Di luar briefing dengan otomasi aktif, kelanjutan memerlukan prompt pengguna. Riwayat percakapan asli tetap pada client, web menerima catatan/hasil kerja yang sengaja dikirim.',
      tools: `Gunakan node scripts/office.mjs context ${s.id}; atau node scripts/office.mjs send ${s.id} request.json. Request JSON berisi action command + revision + command, action run + revision + taskId, action propose + revision + targetId + proposal, atau action memory + version + text. roleID diambil server dari sesi, jangan mengirim role lain.` };
  }
  async function action(input) {
    await queue;
    if (input.action === 'roles') return { roles: roles() };
    if (input.action === 'open' || input.action === 'hook' && input.role) {
      if (!['Claude', 'Codex'].includes(input.client) || typeof input.nativeId !== 'string' || !/^[\w-]{1,120}$/.test(input.nativeId)) throw new Error('Client atau identitas sesi tidak valid.');
      const agentId = resolveRole(input.role);
      await save(next => { let s = next.sessions.find(s => s.nativeId === input.nativeId && s.client === input.client);
        if (!s) { s = { id: randomUUID(), nativeId: input.nativeId, client: input.client, agentId, bound: true, phase: 'idle', model: '', updatedAt: '' }; next.sessions.push(s); }
        Object.assign(s, { agentId, bound: true, phase: input.event === 'prompt' ? 'working' : 'idle', updatedAt: new Date().toISOString() });
      });
      return context(session(input));
    }
    const s = session(input);
    if (!s) { if (input.action === 'hook') return { bound: false }; throw new Error('Sesi belum memiliki peran. Gunakan open atau ketik jadi <nama>.'); }
    if (input.action === 'context') return context(s);
    if (input.action === 'task') {
      const state = getState(); officeRoleCommand(state, s.agentId, { type: 'hold', id: input.taskId });
      const t = state.tasks.find(t => t.id === input.taskId), version = input.version ?? t.results.length;
      if (!Number.isInteger(version) || version < 0 || version > t.results.length) throw new Error('Versi hasil tidak ditemukan.');
      const result = t.results.find(r => r.version === version);
      if (result) resultReads.set(s.id, { taskId: t.id, version });
      return { task: { ...t, results: result ? [result] : [] }, brief: state.briefs.find(b => b.id === t.briefId), revision: state.revision };
    }
    if (input.action === 'hook' || input.action === 'leave') {
      await save(next => { const current = next.sessions.find(v => v.id === s.id); current.phase = ['prompt', 'tool'].includes(input.event) ? 'working' : 'idle'; current.updatedAt = new Date().toISOString(); if (input.action === 'leave' || input.event === 'leave') current.bound = false; });
      return context(session(input));
    }
    if (input.action === 'memory') {
      if (typeof input.text !== 'string' || input.text.length > 5000) throw new Error('Ringkasan memori maksimal 5000 karakter.');
      await save(next => { const old = next.memories.find(v => v.agentId === s.agentId); if (input.version !== (old?.version || 0)) throw new Error('Memori peran berubah. Baca konteks terbaru sebelum menyimpan.');
        next.memories = [...next.memories.filter(v => v.agentId !== s.agentId), { agentId: s.agentId, version: (old?.version || 0) + 1, text: input.text.trim(), updatedAt: new Date().toISOString() }];
      }); return context(s);
    }
    if (input.revision !== getState().revision) throw new Error('Kantor berubah. Baca konteks terbaru sebelum mengirim ulang.');
    if (input.action === 'propose') {
      if (s.agentId !== 'builder') throw new Error('Hanya Builder boleh mengirim usulan konfigurasi.');
      const discussions = await dialogue.action({ action: 'propose', provider: s.client, model: '', targetId: input.targetId || '', revision: input.revision, proposal: input.proposal, requestId: typeof input.requestId === 'string' ? input.requestId.slice(0, 80) : '' });
      return { proposalId: discussions.find(d => input.requestId && d.sourceRequest === input.requestId)?.id || discussions[0].id, context: context(s) };
    }
    if (input.action === 'command') {
      officeRoleCommand(getState(), s.agentId, input.command);
      if (input.command.type === 'review') {
        const read = resultReads.get(s.id);
        if (!read || read.taskId !== input.command.id || read.version !== input.command.version) throw new Error('Baca hasil penuh dengan action task dan versi yang sama sebelum melakukan review.');
      }
      await mutate({ type: 'office-command', actorId: s.agentId, baseRevision: input.revision, command: input.command }); return context(s);
    }
    if (input.action === 'run') {
      const state = getState(), actor = state.agents.find(a => a.id === s.agentId), task = state.tasks.find(t => t.id === input.taskId), worker = state.agents.find(a => a.id === task?.agentId);
      if (!actor || !task || worker?.divisionId !== actor.divisionId || !actor.manager && actor.id !== worker.id) throw new Error('Tugas berada di luar lingkup sesi.');
      const brief = state.briefs.find(b => b.id === task.briefId);
      if (brief?.automation && state.automations?.some(v => v.divisionId === brief.divisionId && v.enabled)) throw new Error('Briefing dikelola otomasi. Pantau antrean; batas atau jeda hanya diatur pemilik pada web.');
      if (state.productionTaskIds?.includes(task.id) || state.productions?.some(p => p.taskId === task.id) || state.workflowBindings?.some(b => b.agentId === worker.id)) throw new Error('Workflow/produksi khusus tetap memakai alurnya sendiri.');
      await runtime.start(task.id); return context(s);
    }
    throw new Error('Tindakan sesi kantor tidak didukung.');
  }
  const presence = () => data.sessions.filter(s => s.bound).map(({ id, agentId, client, model, phase, updatedAt }) => ({ sessionId: id, agentId, client, model, phase, updatedAt }));
  return { action, presence };
}
