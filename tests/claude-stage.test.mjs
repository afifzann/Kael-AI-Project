import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { claudeStatus, claudeStage } from '../server/claude-stage.mjs';

const result = { subtype: 'success', is_error: false, structured_output: { summary: 'Selesai', blocked: false, reason: '', payload: JSON.stringify({ content: 'Checklist Indonesia: siapkan bahan.' }) } };
async function options() {
  const folder = await mkdtemp(path.join(tmpdir(), 'kael-claude-stage-')), schema = path.join(folder, 'schema.json');
  await writeFile(schema, JSON.stringify({ type: 'object' }));
  return { folder, schema, signal: new AbortController().signal, prompt: 'Tugas fixture tanpa data pemilik', model: 'sonnet' };
}
function processFixture(output, inspect = () => {}, exit = 0) {
  return (command, args, config) => {
    inspect(command, args, config);
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    let closed = false;
    const close = code => { if (closed) return; closed = true; queueMicrotask(() => child.emit('close', code)); };
    child.kill = () => close(1);
    child.stdin.on('finish', () => { child.stdout.write(typeof output === 'string' || Buffer.isBuffer(output) ? output : JSON.stringify(output)); close(exit); });
    return child;
  };
}

test('Claude status exposes only connection state and fails closed on malformed or failed CLI output', () => {
  const login = claudeStatus((command, args, options) => {
    assert.deepEqual(args.slice(-3), ['auth', 'status', '--json']); assert.equal(options.windowsHide, true);
    return { status: 0, stdout: JSON.stringify({ loggedIn: true, email: 'PRIVATE-FIXTURE', accessToken: 'PRIVATE-FIXTURE' }) };
  });
  assert.equal(login.available, true); assert.doesNotMatch(JSON.stringify(login), /PRIVATE/);
  for (const output of [{ status: 0, stdout: '{}' }, { status: 1, stdout: '{"loggedIn":true}' }, { status: 0, stdout: 'PRIVATE-FIXTURE' }]) assert.equal(claudeStatus(() => output).available, false);
  assert.equal(claudeStatus(() => { throw new Error('PRIVATE-FIXTURE'); }).available, false);
});

test('Claude launches official CLI without a shell, with no tools/MCP/custom context and no inherited service keys', async () => {
  const input = await options(), previous = process.env.N8N_API_KEY; process.env.N8N_API_KEY = 'PRIVATE-FIXTURE';
  try {
    const value = await claudeStage(input, processFixture(result, (command, args, config) => {
      assert.ok(command); assert.equal(config.shell, false); assert.equal(config.cwd, input.folder); assert.equal(config.windowsHide, true); assert.equal(config.env.N8N_API_KEY, undefined);
      for (const flag of ['--safe-mode', '--restricted', '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands', '--no-chrome']) assert.ok(args.includes(flag), flag);
      assert.equal(args[args.indexOf('--tools') + 1], ''); assert.equal(args[args.indexOf('--disallowedTools') + 1], 'mcp__*'); assert.equal(args[args.indexOf('--permission-mode') + 1], 'dontAsk'); assert.equal(args[args.indexOf('--permission-prompts') + 1], 'none');
      assert.equal(args[args.indexOf('--model') + 1], 'sonnet'); assert.ok(args.includes('--json-schema')); assert.ok(args.includes('--max-turns'));
      assert.equal(args.some(v => /skip-permissions|--resume|--continue|--bare/.test(v)), false);
    }));
    assert.equal(value.data.content, 'Checklist Indonesia: siapkan bahan.'); assert.equal(value.blocked, false); assert.equal(value.session_id, undefined);
  } finally { if (previous === undefined) delete process.env.N8N_API_KEY; else process.env.N8N_API_KEY = previous; }
});

test('Claude malformed/error/oversized responses and process failures never become results or expose vendor output', async () => {
  const input = await options();
  for (const output of ['PRIVATE-FIXTURE', { ...result, is_error: true, error: 'PRIVATE-FIXTURE' }, { ...result, subtype: 'error_max_turns' }, { ...result, structured_output: { ...result.structured_output, blocked: 'false' } }, { ...result, structured_output: { ...result.structured_output, payload: 'PRIVATE-FIXTURE' } }, { ...result, structured_output: { ...result.structured_output, payload: '[]' } }]) {
    await assert.rejects(claudeStage(input, processFixture(output)), e => { assert.doesNotMatch(e.message, /PRIVATE-FIXTURE/); return /terstruktur/.test(e.message); });
  }
  await assert.rejects(claudeStage(input, processFixture(result, () => {}, 1)), /Run Claude gagal/);
  await assert.rejects(claudeStage(input, processFixture(Buffer.alloc(4_000_001))), /Run Claude gagal/);
  await assert.rejects(claudeStage({ ...input, model: 'sonnet;echo PRIVATE' }, () => { assert.fail('invalid model must not spawn'); }), /model Claude tidak valid/);
});

test('stopping Claude kills the owned child and does not accept a late successful response', async () => {
  const input = await options(), controller = new AbortController(); let killed = 0, launched;
  const launch = () => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = () => { killed++; child.stdout.write(JSON.stringify(result)); queueMicrotask(() => child.emit('close', 0)); };
    child.stdin.on('finish', () => launched()); return child;
  };
  const started = new Promise(resolve => launched = resolve);
  const pending = claudeStage({ ...input, signal: controller.signal }, launch); await started; controller.abort();
  await assert.rejects(pending, /dihentikan/); assert.equal(killed, 1);
  await assert.rejects(claudeStage({ ...input, signal: controller.signal }, () => assert.fail('aborted run must not spawn')), /aborted/i);
});

test('Claude timeout stops its process and keeps the failure retryable', async t => {
  const input = await options(); let started, killed = 0;
  const ready = new Promise(resolve => started = resolve);
  const launch = () => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = () => { killed++; queueMicrotask(() => child.emit('close', 1)); };
    child.stdin.on('finish', () => started()); return child;
  };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = claudeStage(input, launch); await ready; t.mock.timers.tick(600001);
  await assert.rejects(pending, /batas waktu/); assert.equal(killed, 1); t.mock.timers.reset();
});
