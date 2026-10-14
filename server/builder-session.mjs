import { open } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { StringDecoder } from 'node:string_decoder';
import { builderSession } from '../src/builder-room.ts';

const maxRead = 8 * 1024 * 1024, maxLine = 256 * 1024;
// shortcut: bound to this Codex rollout format; use supported app events if its schema or location changes.
export function createBuilderSession({ file = process.env.KAEL_BUILDER_SESSION_FILE || (process.env.KAEL_DATA_DIR ? path.join(process.env.KAEL_DATA_DIR, 'codex-builder.jsonl') : path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'sessions', '2026', '10', '11', `rollout-2026-10-11T13-16-07-${builderSession.threadId}.jsonl`)), cwd = process.cwd() } = {}) {
  let offset = 0, identity = '', remainder = '', status = 'unknown', turnId = '', lastEventAt = '', partial = false, pending, dropping = false, decoder = new StringDecoder('utf8');
  let snapshot = { connection: 'disconnected', status, checkedAt: '', lastEventAt, turnId, partial, error: 'Status sesi belum tersedia.' };
  function reset() { offset = 0; remainder = ''; status = 'unknown'; turnId = ''; lastEventAt = ''; partial = false; decoder = new StringDecoder('utf8'); dropping = false; }
  function consume(line) {
    if (line.length > maxLine) { partial = true; return; }
    let entry; try { entry = JSON.parse(line); } catch { partial = true; return; }
    const item = entry.payload;
    if (!item || typeof item !== 'object') return;
    if (Number.isFinite(Date.parse(entry.timestamp))) lastEventAt = entry.timestamp;
    if (entry.type !== 'event_msg') return;
    if (item.type === 'task_started') { status = 'working'; turnId = item.turn_id || ''; }
    else if (['task_complete', 'turn_aborted', 'task_failed'].includes(item.type) && (!turnId || !item.turn_id || item.turn_id === turnId)) status = item.type === 'task_complete' ? 'completed' : 'interrupted';
  }
  async function read() {
    let handle;
    try {
      handle = await open(file, 'r');
      const stat = await handle.stat(), head = Buffer.alloc(65536);
      const headerRead = await handle.read(head, 0, head.length, 0);
      const metadata = JSON.parse(head.subarray(0, headerRead.bytesRead).toString('utf8').split('\n')[0]);
      if (metadata.type !== 'session_meta' || metadata.payload?.id !== builderSession.threadId || path.resolve(metadata.payload?.cwd || '') !== path.resolve(cwd)) throw new Error('identity');
      const currentIdentity = `${stat.dev}/${stat.ino}/${stat.birthtimeMs}`;
      if (identity !== currentIdentity || stat.size < offset) reset();
      identity = currentIdentity;
      let start = offset;
      if (stat.size - start > maxRead) { start = stat.size - maxRead; remainder = ''; status = 'unknown'; turnId = ''; partial = true; decoder = new StringDecoder('utf8'); dropping = true; }
      if (stat.size > start) {
        const chunk = Buffer.alloc(stat.size - start), result = await handle.read(chunk, 0, chunk.length, start);
        let text = decoder.write(chunk.subarray(0, result.bytesRead));
        if (dropping) { const end = text.indexOf('\n'); if (end < 0) text = ''; else { text = text.slice(end + 1); dropping = false; } }
        const lines = (remainder + text).split('\n'); remainder = lines.pop() || '';
        if (remainder.length > maxLine) { remainder = ''; partial = true; dropping = true; }
        offset = start + result.bytesRead;
        for (const line of lines) if (line.trim()) consume(line);
      }
      snapshot = { connection: 'online', status, checkedAt: new Date().toISOString(), lastEventAt, turnId, partial, error: '' };
    } catch {
      reset(); identity = '';
      snapshot = { connection: 'disconnected', status, checkedAt: new Date().toISOString(), lastEventAt, turnId, partial, error: 'Status sesi Builder belum tersedia atau identitas sesi tidak cocok.' };
    } finally { if (handle) await handle.close().catch(() => {}); }
    return snapshot;
  }
  return {
    read() { if (!pending) pending = read().finally(() => { pending = null; }); return pending; },
    presence() { return { ...snapshot }; },
  };
}
