import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAuth } from '../server/auth.mjs';
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

test('corrupt owner records fail closed instead of creating a replacement owner', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kael-auth-corrupt-'));
  const file = path.join(directory, 'owner-auth.json'); await writeFile(file, '{broken');
  await assert.rejects(() => createAuth({ directory }), /berkas dipertahankan/);
  assert.equal(await readFile(file, 'utf8'), '{broken'); await assert.rejects(() => access(path.join(directory, 'owner-setup.key')), { code: 'ENOENT' });
});
