import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, access, mkdir, rename, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAuth, createRecoveryCode, checkOwnerLogin } from '../server/auth.mjs';
import { rawFetch, testOwner } from './helpers/auth-client.mjs';
import { building } from '../scripts/building.mjs';

async function launch(directory) {
  const child = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(new Error('Startup timed out')); }, 10000); child.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); child.on('error', reject); child.on('exit', () => { clearTimeout(timer); reject(new Error('Server exited')); }); });
  return { url, async stop() { const ended = once(child, 'exit'); child.kill(); await ended; } };
}
const post = (url, input, headers = {}) => rawFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(input) });
async function account(server, directory) {
  const setupKey = (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim();
  const r = await post(server.url + '/api/auth/setup', { ...testOwner, setupKey }); assert.equal(r.status, 200);
  const body = await r.json(); return { cookie: r.headers.get('set-cookie').split(';')[0], csrf: body.csrf, body };
}

test('owner setup, all API gates, scoped Builder, restart and independent buyer installations', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'kael-auth-')), otherDir = await mkdtemp(path.join(tmpdir(), 'kael-buyer-'));
  let server = await launch(dir), other;
  try {
    const status = await (await rawFetch(server.url + '/api/auth/status')).json(); assert.deepEqual(status, { needsSetup: true, signedIn: false });
    const stateBefore = await readFile(path.join(dir, 'state.json'), 'utf8');
    for (const endpoint of ['/api/state', '/api/builder-status', '/api/production', '/api/production/abc/v1/preview.mp4']) assert.equal((await rawFetch(server.url + endpoint)).status, 401, endpoint);
    for (const endpoint of ['/api/command', '/api/runtime/start', '/api/runtime/cancel', '/api/production/upload']) assert.equal((await post(server.url + endpoint, {})).status, 401, endpoint);
    assert.equal((await post(server.url + '/api/auth/setup', { ...testOwner, setupKey: 'wrong' })).status, 403);
    const setupKey = (await readFile(path.join(dir, 'owner-setup.key'), 'utf8')).trim();
    assert.equal((await post(server.url + '/api/auth/setup', { ...testOwner, setupKey, password: 'short', confirm: 'short' })).status, 400);
    const signed = await account(server, dir), headers = { Cookie: signed.cookie, 'X-Kael-CSRF': signed.csrf };
    assert.equal(signed.body.signedIn, true); assert.equal(signed.body.owner.name, testOwner.name);
    await assert.rejects(() => access(path.join(dir, 'owner-setup.key')), { code: 'ENOENT' });
    const stored = await readFile(path.join(dir, 'owner-auth.json'), 'utf8'); assert.equal(stored.includes(testOwner.password), false); assert.equal(stored.includes(signed.cookie), false);
    assert.equal(await readFile(path.join(dir, 'state.json'), 'utf8'), stateBefore, 'account setup must not change work data');
    assert.equal((await post(server.url + '/api/auth/setup', { ...testOwner, setupKey })).status, 409);
    assert.equal((await post(server.url + '/api/command', {}, { Cookie: signed.cookie })).status, 403);
    assert.equal((await post(server.url + '/api/command', {}, { ...headers, Origin: 'https://foreign.example' })).status, 403);
    assert.equal((await rawFetch(server.url + '/api/state', { headers: { Cookie: 'kael_session=forged' } })).status, 401);
    const builder = (await readFile(path.join(dir, 'builder-access.key'), 'utf8')).trim(), tokenHeaders = { Authorization: `Bearer ${builder}` };
    assert.equal((await rawFetch(server.url + '/api/state', { headers: tokenHeaders })).status, 200);
    assert.equal((await post(server.url + '/api/runtime/start', {}, tokenHeaders)).status, 403);
    const command = { type: 'division', name: 'Kantor Buyer A', manager: 'Manager A', worker: 'Agent A', role: 'Riset' };
    let r = await post(server.url + '/api/command', { revision: 0, command }, headers); assert.equal(r.status, 200); const created = await r.json();
    assert.equal((await post(server.url + '/api/command', { revision: created.revision, command: { type: 'decide', id: 'any', outcome: 'approved' } }, tokenHeaders)).status, 403);
    assert.equal((await building(['inspect'], new URL(server.url).port, dir)).divisions[0].name, 'Kantor Buyer A');
    other = await launch(otherDir); const buyer = await account(other, otherDir);
    const empty = await (await rawFetch(other.url + '/api/state', { headers: { Cookie: buyer.cookie } })).json();
    assert.deepEqual(empty.divisions, []); assert.deepEqual(empty.agents, []); assert.deepEqual(empty.tasks, []);
    assert.equal(empty.builderChat.chatUrl, undefined, 'new buyer has no link to the internal Builder chat');
    assert.equal((await rawFetch(other.url + '/api/state', { headers })).status, 401, 'sessions cannot cross installations');
    assert.equal((await rawFetch(other.url + '/api/state', { headers: tokenHeaders })).status, 401, 'Builder keys cannot cross installations');
    await server.stop(); server = await launch(dir);
    assert.equal((await rawFetch(server.url + '/api/state', { headers })).status, 401, 'restart invalidates sessions');
    assert.equal((await post(server.url + '/api/auth/login', { ...testOwner, password: 'incorrect' })).status, 401);
    r = await post(server.url + '/api/auth/login', testOwner); assert.equal(r.status, 200);
    const logged = await r.json(), cookie = r.headers.get('set-cookie').split(';')[0]; assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const read = await (await rawFetch(server.url + '/api/state', { headers: { Cookie: cookie } })).json(); assert.deepEqual(read.divisions, created.divisions);
    assert.equal((await post(server.url + '/api/auth/logout', {}, { Cookie: cookie })).status, 403);
    assert.equal((await post(server.url + '/api/auth/logout', {}, { Cookie: cookie, 'X-Kael-CSRF': logged.csrf })).status, 200);
    assert.equal((await rawFetch(server.url + '/api/state', { headers: { Cookie: cookie } })).status, 401);
  } finally { await server.stop(); if (other) await other.stop(); }
});

test('session rotation, inactivity expiry, secure cookie and login throttling', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-session-')); let clock = 1000;
  const auth = await createAuth({ directory, secure: true, now: () => clock });
  const setupKey = (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim();
  async function request(url, data, headers = {}, method = 'POST') {
    const req = { url, method, headers: { 'content-type': 'application/json', ...headers }, socket: { remoteAddress: '127.0.0.1' }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(data)); } };
    const result = { headers: {} }, res = { setHeader: (k, v) => result.headers[k] = v };
    await auth.handle(req, res, (_res, status, body) => { result.status = status; result.body = body; }); return result;
  }
  const first = await request('/api/auth/setup', { ...testOwner, setupKey }); assert.equal(first.status, 200); assert.match(first.headers['Set-Cookie'], /; Secure$/);
  const oldCookie = first.headers['Set-Cookie'].split(';')[0];
  const next = await request('/api/auth/login', testOwner, { cookie: oldCookie }); assert.equal(next.status, 200);
  assert.equal((await request('/api/auth/status', {}, { cookie: oldCookie }, 'GET')).body.signedIn, false);
  const cookie = next.headers['Set-Cookie'].split(';')[0];
  clock += 30 * 60 * 1000; assert.equal((await request('/api/auth/status', {}, { cookie }, 'GET')).body.signedIn, false);
  for (let i = 0; i < 5; i++) assert.equal((await request('/api/auth/login', { ...testOwner, password: 'bad-password' })).status, 401);
  const limited = await request('/api/auth/login', testOwner); assert.equal(limited.status, 429); assert.ok(Number(limited.headers['Retry-After']) > 0);
  clock += 15 * 60 * 1000; const active = await request('/api/auth/login', testOwner); assert.equal(active.status, 200);
  const activeCookie = active.headers['Set-Cookie'].split(';')[0];
  for (let i = 1; i <= 25; i++) { clock += 29 * 60 * 1000; assert.equal((await request('/api/auth/status', {}, { cookie: activeCookie }, 'GET')).body.signedIn, i < 25, 'absolute expiry still applies while requests continue'); }
});

test('setup and recovery accept 8–128 characters and preserve password confirmation', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-password-length-'));
  const auth = await createAuth({ directory });
  async function request(url, data) {
    const req = { url, method: 'POST', headers: { 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(data)); } };
    const result = {}; await auth.handle(req, { setHeader() {} }, (_res, status, body) => Object.assign(result, { status, body })); return result;
  }
  const setupKey = (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim();
  for (const password of ['a'.repeat(7), 'a'.repeat(129)]) {
    const result = await request('/api/auth/setup', { ...testOwner, setupKey, password, confirm: password });
    assert.equal(result.status, 400); assert.match(result.body.error, /8–128/);
  }
  const password = 'Abc!2345';
  assert.equal((await request('/api/auth/setup', { ...testOwner, setupKey, password, confirm: password + 'x' })).status, 400);
  assert.equal((await request('/api/auth/setup', { ...testOwner, setupKey, password, confirm: password })).status, 200);
  assert.equal((await request('/api/auth/login', { email: testOwner.email, password })).status, 200);
  let recoveryCode = await createRecoveryCode(directory);
  for (const value of ['a'.repeat(7), 'a'.repeat(129)]) assert.equal((await request('/api/auth/reset-password', { recoveryCode, password: value, confirm: value })).status, 400);
  const maximum = 'b'.repeat(128);
  assert.equal((await request('/api/auth/reset-password', { recoveryCode, password: maximum, confirm: 'mismatch' })).status, 400);
  assert.equal((await request('/api/auth/reset-password', { recoveryCode, password: maximum, confirm: maximum })).status, 200);
  assert.equal((await request('/api/auth/login', { email: testOwner.email, password: maximum })).status, 200);
  assert.equal((await request('/api/auth/login', { email: testOwner.email, password })).status, 401);
  recoveryCode = await createRecoveryCode(directory);
  assert.equal((await request('/api/auth/reset-password', { recoveryCode, password, confirm: password })).status, 200);
  assert.equal((await request('/api/auth/login', { email: testOwner.email, password })).status, 200);
});

test('corrupt owner records fail closed instead of creating a replacement owner', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-auth-corrupt-'));
  const file = path.join(directory, 'owner-auth.json'); await writeFile(file, '{broken');
  await assert.rejects(() => createAuth({ directory }), /berkas dipertahankan/);
  assert.equal(await readFile(file, 'utf8'), '{broken'); await assert.rejects(() => access(path.join(directory, 'owner-setup.key')), { code: 'ENOENT' });
});

test('local diagnosis identifies email/password mismatches without mutation and CLI refuses noninteractive input', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-login-check-')); let server = await launch(directory);
  try {
    const signed = await account(server, directory), file = path.join(directory, 'owner-auth.json'), original = await readFile(file, 'utf8');
    assert.deepEqual(await checkOwnerLogin(directory, 'wrong@example.test', testOwner.password), { passwordCorrect: true, emailCorrect: false, email: testOwner.email });
    assert.deepEqual(await checkOwnerLogin(directory, testOwner.email, 'wrong-password'), { passwordCorrect: false, emailCorrect: true });
    assert.deepEqual(await checkOwnerLogin(directory, 'wrong@example.test', 'wrong-password'), { passwordCorrect: false, emailCorrect: false });
    assert.equal(await readFile(file, 'utf8'), original);
    assert.equal((await rawFetch(server.url + '/api/auth/status', { headers: { Cookie: signed.cookie } })).status, 200);
    const recoveryCode = await createRecoveryCode(directory), password = ' 8chars! ';
    assert.equal((await post(server.url + '/api/auth/reset-password', { recoveryCode, password, confirm: password })).status, 200);
    const saved = await readFile(file, 'utf8'); await server.stop(); server = await launch(directory);
    const result = await checkOwnerLogin(directory, ' OWNER@EXAMPLE.TEST ', password); assert.equal(result.passwordCorrect, true); assert.equal(result.emailCorrect, true);
    assert.equal((await checkOwnerLogin(directory, testOwner.email, password.trim())).passwordCorrect, false, 'password whitespace must not be silently changed');
    assert.equal((await post(server.url + '/api/auth/login', { email: testOwner.email, password })).status, 200);
    assert.equal(await readFile(file, 'utf8'), saved);
    const cli = spawn(process.execPath, ['scripts/owner-access.mjs', '--check-login'], { env: { ...process.env, KAEL_DATA_DIR: directory }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; cli.stdout.on('data', chunk => output += chunk); cli.stderr.on('data', chunk => output += chunk);
    const [code] = await once(cli, 'exit'); assert.equal(code, 1); assert.match(output, /CMD\/PowerShell/); assert.equal(output.includes(password), false); assert.equal(output.includes(testOwner.email), false);
  } finally { await server.stop(); }
});

test('local recovery preserves account/work, revokes sessions, persists and cannot be replayed', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-recovery-'));
  let server = await launch(directory);
  try {
    const signed = await account(server, directory), ownerFile = path.join(directory, 'owner-auth.json'), recoveryFile = path.join(directory, 'owner-recovery.json');
    const original = JSON.parse(await readFile(ownerFile, 'utf8')), stateBefore = await readFile(path.join(directory, 'state.json'), 'utf8');
    const builder = await readFile(path.join(directory, 'builder-access.key'), 'utf8');
    assert.equal((await post(server.url + '/api/auth/reset-password', { recoveryCode: builder.trim() })).status, 403, 'Builder key cannot recover the owner');
    const cli = spawn(process.execPath, ['scripts/owner-access.mjs', '--reset'], { env: { ...process.env, KAEL_DATA_DIR: directory }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; cli.stdout.on('data', b => output += b.toString());
    const [exit] = await once(cli, 'exit'); assert.equal(exit, 0);
    const recoveryCode = output.match(/\b[a-f0-9]{64}\b/)?.[0]; assert.ok(recoveryCode);
    const recoveryRecord = await readFile(recoveryFile, 'utf8'); assert.equal(recoveryRecord.includes(recoveryCode), false);
    const replacement = { recoveryCode, password: 'replacement-password-only-2026', confirm: 'replacement-password-only-2026' };
    assert.equal((await post(server.url + '/api/auth/reset-password', { ...replacement, confirm: 'mismatch' })).status, 400);
    // A failed atomic replacement must leave both the old account and the recovery code usable.
    await rename(ownerFile, ownerFile + '.fixture'); await mkdir(ownerFile);
    assert.equal((await post(server.url + '/api/auth/reset-password', replacement)).status, 400);
    await rmdir(ownerFile); await rename(ownerFile + '.fixture', ownerFile);
    assert.deepEqual(JSON.parse(await readFile(ownerFile, 'utf8')), original);
    assert.equal((await rawFetch(server.url + '/api/state', { headers: { Cookie: signed.cookie } })).status, 200);
    const replies = await Promise.all([post(server.url + '/api/auth/reset-password', replacement), post(server.url + '/api/auth/reset-password', replacement)]);
    assert.equal(replies.filter(r => r.status === 200).length, 1); assert.ok(replies.some(r => [403, 409].includes(r.status)));
    const result = replies.find(r => r.status === 200); assert.equal((await result.json()).owner.name, original.name);
    const next = JSON.parse(await readFile(ownerFile, 'utf8')); assert.equal(next.name, original.name); assert.equal(next.email, original.email); assert.notEqual(next.salt, original.salt); assert.notEqual(next.hash, original.hash);
    assert.equal(JSON.stringify(next).includes(replacement.password), false);
    assert.equal(await readFile(path.join(directory, 'state.json'), 'utf8'), stateBefore);
    assert.equal(await readFile(path.join(directory, 'builder-access.key'), 'utf8'), builder);
    assert.equal((await rawFetch(server.url + '/api/state', { headers: { Cookie: signed.cookie } })).status, 401);
    await writeFile(recoveryFile, recoveryRecord);
    assert.equal((await post(server.url + '/api/auth/reset-password', replacement)).status, 403, 'old hash binding rejects replay even if cleanup failed');
    assert.equal((await post(server.url + '/api/auth/login', testOwner)).status, 401);
    await server.stop(); server = await launch(directory);
    assert.equal((await post(server.url + '/api/auth/login', { email: testOwner.email, password: replacement.password })).status, 200);
    assert.equal((await post(server.url + '/api/auth/reset-password', replacement)).status, 403);
  } finally { await server.stop(); }
});

test('recovery codes expire, rotate, fail closed on corruption and have their own rate limit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-recovery-expiry-')); let clock = 1000;
  await assert.rejects(createRecoveryCode(directory), { code: 'ENOENT' });
  const auth = await createAuth({ directory, now: () => clock });
  async function request(url, data) {
    const req = { url, method: 'POST', headers: { 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(data)); } };
    const result = {}; await auth.handle(req, { setHeader() {} }, (_res, status, body) => Object.assign(result, { status, body })); return result;
  }
  const setupKey = (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim();
  assert.equal((await request('/api/auth/setup', { ...testOwner, setupKey })).status, 200);
  const code = await createRecoveryCode(directory, () => clock); clock += 15 * 60 * 1000;
  const input = { recoveryCode: code, password: testOwner.password, confirm: testOwner.password };
  assert.equal((await request('/api/auth/reset-password', input)).status, 403);
  input.recoveryCode = await createRecoveryCode(directory, () => clock);
  const newest = await createRecoveryCode(directory, () => clock);
  assert.equal((await request('/api/auth/reset-password', input)).status, 403, 'new code invalidates previous code');
  await writeFile(path.join(directory, 'owner-recovery.json'), '{broken'); input.recoveryCode = newest;
  assert.equal((await request('/api/auth/reset-password', input)).status, 403);
  for (let i = 0; i < 5; i++) assert.equal((await request('/api/auth/login', { ...testOwner, password: 'wrong' })).status, 401);
  input.recoveryCode = await createRecoveryCode(directory, () => clock);
  assert.equal((await request('/api/auth/reset-password', input)).status, 200, 'login throttling does not block local recovery');
  for (let i = 0; i < 5; i++) assert.equal((await request('/api/auth/reset-password', input)).status, 403);
  assert.equal((await request('/api/auth/reset-password', input)).status, 429);
});
