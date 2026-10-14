import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, appendFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createBuilderSession } from '../server/builder-session.mjs';
import { builderSession } from '../src/builder-room.ts';

const at = '2026-10-13T13:00:00.000Z';
const record = (type, payload) => JSON.stringify({ type, timestamp: at, payload }) + '\n';
const header = () => record('session_meta', { id: builderSession.threadId, cwd: process.cwd() });
async function fixture(content) {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-builder-session-')), file = path.join(directory, 'session.jsonl');
  await writeFile(file, content);
  return { file, bridge: createBuilderSession({ file }) };
}

test('session status follows the selected turn without publishing any conversation or modifying its log', async () => {
  const secret = 'private-user-and-assistant-text';
  const { file, bridge } = await fixture(header() + record('event_msg', { type: 'task_started', turn_id: 'turn-a' }) + record('response_item', { type: 'message', role: 'user', content: [{ type: 'input_text', text: secret }] }));
  const before = await stat(file), first = await bridge.read();
  assert.equal(first.status, 'working'); assert.equal(first.connection, 'online');
  assert.equal(first.messages, undefined); assert.equal(JSON.stringify(first).includes(secret), false);
  assert.deepEqual(await bridge.read(), { ...first, checkedAt: bridge.presence().checkedAt });
  assert.equal((await stat(file)).mtimeMs, before.mtimeMs);
  await appendFile(file, record('event_msg', { type: 'task_complete', turn_id: 'unrelated' }));
  assert.equal((await bridge.read()).status, 'working');
  await appendFile(file, record('event_msg', { type: 'task_complete', turn_id: 'turn-a' }));
  assert.equal((await bridge.read()).status, 'completed');
  await appendFile(file, record('event_msg', { type: 'task_started', turn_id: 'next' }));
  assert.equal((await bridge.read()).status, 'working');
  await appendFile(file, record('event_msg', { type: 'turn_aborted', turn_id: 'next' }));
  assert.equal((await bridge.read()).status, 'interrupted');
});

test('partial JSON and UTF8 wait for a complete event and wrong session/cwd fail closed', async () => {
  const { file, bridge } = await fixture(header()); await bridge.read();
  const encoded = Buffer.from(record('event_msg', { type: 'task_started', turn_id: 'a', label: '✨' })), index = encoded.indexOf(Buffer.from('✨')) + 1;
  await appendFile(file, encoded.subarray(0, index)); assert.equal((await bridge.read()).status, 'unknown');
  await appendFile(file, encoded.subarray(index)); assert.equal((await bridge.read()).status, 'working');
  await writeFile(file, record('session_meta', { id: 'other-chat', cwd: process.cwd() }));
  assert.equal((await bridge.read()).connection, 'disconnected');
  await writeFile(file, record('session_meta', { id: builderSession.threadId, cwd: tmpdir() }));
  assert.equal((await bridge.read()).connection, 'disconnected');
  await writeFile(file, header()); assert.equal((await bridge.read()).status, 'unknown');
  assert.equal((await createBuilderSession({ file: file + '.missing' }).read()).connection, 'disconnected');
});

test('a bounded tail finds task status after a large payload without returning message history', async () => {
  const giant = record('response_item', { type: 'function_call_output', output: 'x'.repeat(9 * 1024 * 1024) });
  const { file, bridge } = await fixture(header() + giant + record('event_msg', { type: 'task_started', turn_id: 'latest' }));
  const data = await bridge.read(); assert.equal(data.partial, true); assert.equal(data.status, 'working'); assert.equal(data.messages, undefined);
  await appendFile(file, '{malformed}\n' + record('event_msg', { type: 'task_complete', turn_id: 'latest' }));
  assert.equal((await bridge.read()).status, 'completed');
});
