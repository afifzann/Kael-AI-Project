import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const proposal = { name: 'Support', manager: 'Maya', workers: [{ id: '', name: '<img src=x onerror=unsafe()>', role: 'Riset jawaban' }], steps: 'Brief → kerja → review', criteria: 'Berdasarkan fakta', limits: 'Founder memberi keputusan', provider: 'manual', model: '' };
async function surface(ready = true, offline = false) {
  let record = { id: 'fixture', version: 3, targetId: '', provider: 'Claude', model: '', status: ready ? 'ready' : 'discussing', messages: [{ role: 'assistant', text: 'Apa kebutuhanmu? <script>unsafe()</script>' }], proposal: ready ? structuredClone(proposal) : null, baseRevision: 0, error: '', appliedDivisionId: '', updatedAt: '' };
  const calls = [], callbacks = {}, fields = new Map(Object.entries(proposal).filter(([k]) => k !== 'workers'));
  fields.set('worker-0-name', proposal.workers[0].name); fields.set('worker-0-role', proposal.workers[0].role);
  let fail = false, html = '', interval, networkDown = offline, reads = 0;
  const input = { value: '', focus() {} }, save = { disabled: true }, status = { textContent: '' }, picker = { value: 'fixture', disabled: false };
  const composer = { reportValidity: () => true, querySelector: () => input };
  const draftForm = { reportValidity: () => true, querySelector: selector => selector === '[type="submit"]' ? save : status };
  const buttons = new Map();
  const host = { querySelector(selector) {
    if (selector === '#builder-chat') return { contains: () => false };
    if (selector === '#builder-chat-start') return null;
    if (selector === '#builder-chat-form') return html.includes('id="builder-chat-form"') ? composer : null;
    if (selector === '#builder-draft-form') return html.includes('id="builder-draft-form"') ? draftForm : null;
    if (selector === '#builder-discussion') return picker;
    if (selector === '#builder-chat-message') return input;
    if (selector === '.builder-chat-error') return { focus() {} };
    if (!buttons.has(selector)) buttons.set(selector, { disabled: false, addEventListener: (_event, fn) => callbacks[selector] = fn });
    return buttons.get(selector);
  }, querySelectorAll: () => [] };
  class FixtureFormData extends Map { constructor() { super(fields); } }
  const source = readFileSync(new URL('../src/builder-dialogue.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: name => name.includes('runtime-status') ? { runtimeFor: () => ({ available: true }) } : {}, structuredClone, FormData: FixtureFormData, AbortSignal, setInterval: fn => interval = fn, document: { hidden: false, activeElement: null }, window: { dispatchEvent() {} }, CustomEvent: class {}, fetch: async (_url, options) => {
    if (options?.method !== 'POST') { reads++; if (networkDown) throw new Error('Offline fixture'); }
    if (options?.method === 'POST') { const body = JSON.parse(options.body); calls.push(body);
      if (fail) return { ok: false, json: async () => ({ error: 'Konflik fixture. Muat ulang.' }) };
      if (body.action === 'save') record = { ...record, version: record.version + 1, proposal: body.proposal };
      if (body.action === 'message') record = { ...record, version: record.version + 1, status: 'working', messages: [...record.messages, { role: 'user', text: body.text }] };
    }
    return { ok: true, json: async () => ({ discussions: [structuredClone(record)] }) };
  } });
  const ui = exports.createBuilderDialogueUI(() => ({ revision: 0, divisions: [], agents: [] }), () => {});
  let renders = 0; const render = () => { if (++renders > 20) throw Error('Unexpected UI render loop'); html = ui.render(); ui.bind(host, render); };
  render(); await new Promise(setImmediate); await new Promise(setImmediate);
  return { ui, fields, callbacks, composer, draftForm, input, save, calls, render, get reads() { return reads; }, get html() { return html; }, network: value => networkDown = value, fail: value => fail = value, record: value => record = { ...record, ...value }, async poll() { interval(); await new Promise(setImmediate); await new Promise(setImmediate); } };
}

test('Builder UI escapes AI content and holds local preview edits until save; applying a dirty draft sends nothing', async () => {
  const h = await surface(); assert.match(h.html, /&lt;script&gt;/); assert.match(h.html, /&lt;img/); assert.doesNotMatch(h.html, /<script>|<img src=x/);
  h.fields.set('name', 'Tim layanan'); h.draftForm.oninput(); assert.equal(h.save.disabled, false);
  h.callbacks['[data-chat-apply]'](); assert.equal(h.calls.length, 0);
  h.draftForm.onsubmit({ preventDefault() {} }); await new Promise(setImmediate); await new Promise(setImmediate);
  assert.equal(h.calls[0].action, 'save'); assert.equal(h.calls[0].version, 3); assert.equal(h.calls[0].proposal.name, 'Tim layanan');
  assert.match(h.html, /value="Tim layanan"/); assert.doesNotMatch(h.html, /Ada perubahan yang belum disimpan/);
});

test('Builder UI retains message/error on failed submit, then polls working turn into a preview without applying', async () => {
  const h = await surface(false); h.fail(true); h.input.value = 'Tujuan saya tim support.'; h.composer.oninput(); h.composer.onsubmit({ preventDefault() {} });
  await new Promise(setImmediate); await new Promise(setImmediate);
  assert.match(h.html, /Konflik fixture/); assert.match(h.html, />Tujuan saya tim support\.<\/textarea>/);
  h.fail(false); h.composer.onsubmit({ preventDefault() {} }); await new Promise(setImmediate); await new Promise(setImmediate);
  assert.match(h.html, /Builder sedang menyusun jawaban/);
  h.record({ status: 'ready', version: 5, proposal: structuredClone(proposal) }); await h.poll();
  assert.match(h.html, /Preview usulan/); assert.match(h.html, /Buat divisi & SOP/); assert.equal(h.calls.some(c => c.action === 'apply'), false);
});

test('Builder UI keeps the original draft version during concurrent update so saving cannot overwrite silently', async () => {
  const h = await surface(); h.fields.set('manager', 'Dina'); h.draftForm.oninput();
  h.record({ version: 4, proposal: { ...proposal, manager: 'Manager halaman lain' } }); await h.poll();
  h.fail(true); h.draftForm.onsubmit({ preventDefault() {} }); await new Promise(setImmediate); await new Promise(setImmediate);
  assert.equal(h.calls[0].version, 3); assert.equal(h.calls[0].proposal.manager, 'Dina'); assert.match(h.html, /Konflik fixture/); assert.match(h.html, /value="Dina"/);
});

test('Builder offline loading stops instead of looping; explicit reload resumes the saved discussion', async () => {
  const h = await surface(true, true); assert.equal(h.reads, 1); assert.match(h.html, /Draft belum dapat dimuat/);
  h.network(false); h.callbacks['[data-chat-reload]'](); await new Promise(setImmediate); await new Promise(setImmediate);
  assert.equal(h.reads, 2); assert.match(h.html, /Preview usulan/);
});
