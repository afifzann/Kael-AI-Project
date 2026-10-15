import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { builderChatLink } from '../src/builder-room.ts';

function accessModule(globals) {
  const source = readFileSync(new URL('../src/access.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {}; runInNewContext(code, { exports, require: () => ({}), Headers, Request, URL, ...globals }); return exports;
}

test('frontend sends CSRF only to own API and reloads once when authentication expires', async () => {
  const calls = []; let reloads = 0, status = 200;
  const window = { fetch: async (input, options) => { calls.push({ input, options }); return { status }; } };
  const access = accessModule({ window, location: { href: 'http://localhost:5173/', origin: 'http://localhost:5173', reload: () => reloads++ } });
  access.protectRequests({ csrf: 'fixture-csrf' });
  const body = new FormData(); body.set('title', 'Upload fixture');
  await window.fetch('/api/production/upload', { method: 'POST', body });
  assert.equal(calls[0].options.headers.get('X-Kael-CSRF'), 'fixture-csrf'); assert.equal(calls[0].options.credentials, 'same-origin'); assert.equal(calls[0].options.body, body);
  await window.fetch(new Request('http://localhost:5173/api/command', { method: 'POST', headers: { 'X-Trace': 'fixture' } }));
  assert.equal(calls[1].options.headers.get('X-Trace'), 'fixture'); assert.equal(calls[1].options.headers.get('X-Kael-CSRF'), 'fixture-csrf');
  await window.fetch('https://external.example/api/command', { method: 'POST' });
  assert.equal(new Headers(calls[2].options.headers).has('X-Kael-CSRF'), false);
  await window.fetch('/api/state'); assert.equal(calls[3].options.headers.has('X-Kael-CSRF'), false);
  status = 401; await window.fetch('/api/state'); await window.fetch('/api/state'); assert.equal(reloads, 1);
});

test('first-owner UI asks for a server setup key, validates confirmation and opens only after API success', async () => {
  const calls = [], error = { textContent: '' }, button = { disabled: false };
  const password = { value: 'test-password-only-2026', focus() {}, addEventListener() {} }, confirm = { value: 'different', valid: '', addEventListener() {}, setCustomValidity(v) { this.valid = v; } };
  const form = { querySelector(selector) { return selector === 'button' ? button : selector === '.access-error' ? error : selector.includes('confirm') ? confirm : password; }, setAttribute() {}, removeAttribute() {}, reportValidity: () => !confirm.valid, reset() {} };
  const root = { innerHTML: '', querySelector: () => form };
  class FixtureFormData extends Map { constructor() { super([['email', 'owner@example.test'], ['password', password.value], ['confirm', confirm.value], ['setupKey', 'fixture-key']]); } }
  const access = accessModule({ document: { querySelector: () => root }, FormData: FixtureFormData, fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => calls.length === 1 ? { needsSetup: true, signedIn: false } : { signedIn: true, csrf: 'fixture' } }; } });
  const pending = access.requireOwner(); await new Promise(setImmediate);
  assert.match(root.innerHTML, /name="setupKey"/); assert.match(root.innerHTML, /minlength="8"/); assert.match(root.innerHTML, /owner-access\.mjs/);
  await form.onsubmit({ preventDefault() {} }); assert.equal(calls.length, 1, 'invalid confirmation must not submit');
  confirm.value = password.value; await form.onsubmit({ preventDefault() {} });
  assert.equal(calls[1].url, '/api/auth/setup'); assert.equal((await pending).signedIn, true); assert.equal(button.disabled, false);
});

test('buyer Builder links require a verified installation session and reject arbitrary URLs', () => {
  assert.doesNotMatch(builderChatLink(), /href=/);
  assert.doesNotMatch(builderChatLink({ connection: 'disconnected', chatUrl: 'codex://threads/00000000-0000-0000-0000-000000000000' }), /href=/);
  assert.doesNotMatch(builderChatLink({ connection: 'online', chatUrl: 'https://other.example' }), /href=/);
  assert.match(builderChatLink({ connection: 'online', chatUrl: 'codex://threads/00000000-0000-0000-0000-000000000000' }), /href="codex:/);
});

test('recovery form validates confirmation, retains errors and opens only after reset succeeds', async () => {
  const calls = [], error = { textContent: '' }, button = { disabled: false };
  const password = { value: 'replacement-password-only-2026', focus() {}, addEventListener() {} }, confirm = { value: 'mismatch', valid: '', addEventListener() {}, setCustomValidity(v) { this.valid = v; } };
  let resetCount = 0, accepted = false;
  const form = { querySelector(selector) { return selector === 'button' ? button : selector === '.access-error' ? error : selector.includes('confirm') ? confirm : password; }, setAttribute() {}, removeAttribute() {}, reportValidity: () => !confirm.valid, reset() { resetCount++; } };
  const root = { innerHTML: '', querySelector: () => form };
  class FixtureFormData extends Map { constructor() { super([['recoveryCode', 'fixture-code'], ['password', password.value], ['confirm', confirm.value]]); } }
  const access = accessModule({ document: { querySelector: () => root }, location: { href: 'http://localhost:5173/?reset-password=1' }, FormData: FixtureFormData, fetch: async (url, options) => { calls.push({ url, options }); return { ok: calls.length === 1 || accepted, json: async () => calls.length === 1 ? { needsSetup: false, signedIn: false } : accepted ? { signedIn: true, csrf: 'fixture' } : { error: 'Kode kedaluwarsa.' } }; } });
  const pending = access.requireOwner(); await new Promise(setImmediate);
  assert.match(root.innerHTML, /name="recoveryCode"/); assert.match(root.innerHTML, /owner-access\.mjs --reset/); assert.doesNotMatch(root.innerHTML, /name="email"|name="setupKey"/);
  await form.onsubmit({ preventDefault() {} }); assert.equal(calls.length, 1);
  confirm.value = password.value; await form.onsubmit({ preventDefault() {} });
  assert.equal(calls[1].url, '/api/auth/reset-password'); assert.equal(error.textContent, 'Kode kedaluwarsa.'); assert.equal(resetCount, 0); assert.equal(button.disabled, false);
  accepted = true; await form.onsubmit({ preventDefault() {} }); assert.equal((await pending).signedIn, true); assert.equal(resetCount, 1);
});
