import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { initialState, applyCommand } from '../src/domain.ts';
import { divisionState, divisionOverview, findDivisions, divisionTools } from '../src/workspace.ts';
import { workflowHistory } from '../src/n8n.ts';
import { readRoute, routeHash, parentRoute, workspaceViews, divisionSections } from '../src/routes.ts';
import * as THREE from 'three';
import { founderFloor } from '../src/layout.ts';
import { founderPreviewCamera, captureFounderPreview } from '../src/office-preview.ts';
import { workspaceNotifications } from '../src/notifications.ts';

// Exercise the actual delegated handlers without a browser or owner data.
function changeHandler(surface) {
  const source = ts.createSourceFile('operations.ts', readFileSync(new URL('../src/operations.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let handler;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === `${surface}.addEventListener` && node.arguments[0]?.text === 'change') handler = node.arguments[1].getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(handler, `${surface} change handler is registered`);
  return ts.transpileModule(`const handler = ${handler}; handler(event);`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

test('decision division picker applies, clears and rejects unknown divisions without changing data', () => {
  const code = changeHandler('host'), state = { divisions: [{ id: 'marketing' }, { id: 'creative' }] };
  const before = structuredClone(state);
  for (const value of ['marketing', 'creative', '', 'missing']) {
    let renders = 0;
    const scope = { state, selectedDivisionId: 'creative', workFilter: { page: 3 }, render: () => renders++, event: { target: { id: 'decision-division', value } } };
    runInNewContext(code, scope);
    assert.equal(scope.selectedDivisionId, state.divisions.some(d => d.id === value) ? value : '');
    assert.equal(renders, 1); assert.equal(scope.workFilter.page, 1);
  }
  assert.deepEqual(state, before);
});

test('result version picker opens the selected version and decision notes follow the selected outcome', () => {
  const code = changeHandler('dialog'), note = { required: false }, previews = [];
  const scope = { busy: false, dialog: { querySelector: () => note }, manualResult: (...args) => previews.push(args) };
  for (const value of ['revision', 'rejected', 'approved']) {
    runInNewContext(code, { ...scope, event: { target: { name: 'outcome', value, dataset: {} } } });
    assert.equal(note.required, value !== 'approved');
  }
  const event = { target: { dataset: { resultTask: 'task-1' }, value: '2' } };
  runInNewContext(code, { ...scope, event });
  assert.deepEqual(previews, [['task-1', 2]]);
  runInNewContext(code, { ...scope, busy: true, event });
  assert.equal(previews.length, 1, 'saving a form must not switch its preview version');
});

test('notifications link active issues to their exact targets and do not duplicate production approval', () => {
  const s = initialState(), now = Date.parse('2026-10-14T10:00:00Z');
  s.divisions = [{ id: 'outdoor', name: 'Marketing Outdor', managerId: 'yuli' }, { id: 'video', name: 'Youtube KaelaCH', managerId: 'kaela' }];
  s.agents = [{ id: 'mails', name: 'Mails', divisionId: 'outdoor', manager: false, role: 'Email' }];
  s.incidents = [{ id: 'failed', agentId: 'mails', reason: 'Node gagal', reportedAt: '', resolvedAt: '', resolution: '', bedIndex: 0 }, { id: 'old', agentId: 'mails', reason: 'Lama', resolvedAt: '2026-10-13', bedIndex: 1 }];
  s.workflowBindings = [{ agentId: 'mails', workflowId: 'email', workflowName: 'Email order', monitorFrom: '' }];
  s.n8n = [{ workflowId: 'email', connection: 'disconnected', checkedAt: '', running: [], waiting: [], recent: [], partial: false }];
  s.briefs = [{ id: 'brief', divisionId: 'video', title: 'Rencana' }];
  s.tasks = [{ id: 'render', briefId: 'brief', status: 'blocked', title: 'Render episode' }, { id: 'manual', briefId: 'brief', status: 'blocked', title: 'Periksa bahan' }];
  s.productions = [{ id: 'episode', divisionId: 'video', taskId: 'render', title: 'Chapter 1', status: 'review' }];
  s.decisions = [{ id: 'result', type: 'result', targetId: 'render', title: 'Review episode', status: 'pending' }, { id: 'plan', type: 'plan', targetId: 'brief', title: 'Rencana video', status: 'pending' }];
  const before = structuredClone(s), notices = workspaceNotifications(s, '', now);
  assert.equal(notices.length, 5);
  assert.deepEqual(notices.map(n => n.action), ['incident', 'task', 'production', 'decision', 'workflow']);
  const incident = notices.find(n => n.action === 'incident');
  assert.equal(incident.targetId, 'mails'); assert.equal(incident.divisionId, 'outdoor'); assert.match(incident.detail, /Email order/);
  assert.equal(notices.find(n => n.action === 'production').targetId, 'episode');
  assert.equal(notices.find(n => n.action === 'decision').targetId, 'plan');
  assert.equal(notices.find(n => n.action === 'workflow').targetId, 'email');
  assert.deepEqual(s, before, 'notification reads do not resolve errors or approve work');
  s.incidents[0].resolvedAt = '2026-10-14'; s.productions[0].status = 'approved'; s.decisions[1].status = 'approved'; s.tasks[1].status = 'paused';
  s.n8n[0].connection = 'online'; s.n8n[0].checkedAt = new Date(now).toISOString();
  assert.deepEqual(workspaceNotifications(s, '', now), []);
});

test('notification connections distinguish healthy data from stale, partial and missing monitoring', () => {
  const s = initialState(), now = Date.now();
  s.workflowBindings = [{ agentId: 'a', workflowId: 'wf', workflowName: 'Workflow', monitorFrom: '' }];
  const read = () => workspaceNotifications(s, '', now);
  assert.equal(read()[0].action, 'workflow');
  s.n8n = [{ workflowId: 'wf', connection: 'online', checkedAt: new Date(now).toISOString(), partial: false }];
  assert.equal(read().length, 0);
  s.n8n[0].partial = true; assert.equal(read().length, 1);
  s.n8n[0].partial = false; s.n8n[0].checkedAt = new Date(now - 21000).toISOString(); assert.equal(read().length, 1);
  s.n8n[0].checkedAt = 'invalid'; assert.equal(read().length, 1);
  assert.equal(workspaceNotifications(null, 'Disconnected')[0].action, 'retry');
  assert.deepEqual(workspaceNotifications(null), []);
});

test('workspace routes restore division, episode, tab and version and discard unrelated fields', () => {
  const route = { view: 'production', divisionId: 'division-1', episodeId: 'episode-4', tab: 'chat', version: 2 };
  const restored = readRoute(routeHash(route));
  for (const key of Object.keys(route)) assert.equal(restored[key], route[key]);
  assert.equal(routeHash({ ...route, view: 'team', workflowId: 'wf-1' }), '#view=team');
  assert.equal(readRoute('#view=home&division=division-1').divisionId, '');
  assert.equal(routeHash({ ...route, view: 'office', roomId: 'server' }), '#view=office&room=server');
  assert.equal(readRoute('#view=not-a-page&division=%3Cscript%3E&version=NaN&tab=other').view, 'home');
  assert.equal(readRoute('#view=production&division=%3Cscript%3E&version=-2&tab=other').divisionId, '');
  assert.equal(readRoute('#view=production&version=-2&tab=other').version, 0);
  assert.equal(readRoute('#view=production&version=1.5&tab=other').tab, 'preview');
  assert.equal(readRoute('#view=workflows&workflow=abc_123').workflowId, 'abc_123');
});

test('division sections survive reload and Back without leaking into other workspace pages', () => {
  for (const section of divisionSections) {
    const hash = routeHash({ view: 'division', divisionId: 'new-division', section });
    const route = readRoute(hash);
    assert.equal(route.divisionId, 'new-division'); assert.equal(route.section, section);
    assert.equal(routeHash(route), hash);
  }
  assert.equal(readRoute('#view=division&division=new-division&section=unknown').section, 'overview');
  assert.equal(routeHash({ view: 'home', divisionId: 'new-division', section: 'members' }), '#view=home');
  assert.equal(routeHash({ view: 'division', section: 'setup' }), '#view=division');
  assert.equal(readRoute('#view=team&section=setup').section, 'overview');
});

test('every workspace page has an internal Back fallback and division tools return to their own division', () => {
  for (const view of workspaceViews) {
    const parent = parentRoute({ view });
    assert.deepEqual(parent, view === 'home' ? null : { view: 'home' });
  }
  for (const view of ['production', 'workflows', 'tasks', 'briefs', 'decisions', 'activity']) assert.deepEqual(parentRoute({ view, divisionId: 'creative', episodeId: 'old', workflowId: 'old' }), { view: 'division', divisionId: 'creative' });
  for (const section of divisionSections) assert.deepEqual(parentRoute({ view: 'division', divisionId: 'creative', section }), section === 'overview' ? { view: 'team' } : { view: 'division', divisionId: 'creative' });
});

test('actual workspace Back handlers preserve history and filters, and direct links never navigate to an external previous page', () => {
  const source = ts.createSourceFile('operations.ts', readFileSync(new URL('../src/operations.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true), functions = [];
  function visit(node) { if (ts.isFunctionDeclaration(node) && ['writeRoute', 'updateBack', 'goBack'].includes(node.name?.text)) functions.push(node.getText(source)); ts.forEachChild(node, visit); }
  visit(source); assert.equal(functions.length, 3);
  const location = { hash: '#view=home' }, entries = [], backButton = { disabled: true, title: '' }; let backs = 0, restores = 0;
  const history = {
    state: null,
    replaceState(value, _title, url) { this.state = value; if (url) location.hash = url; },
    pushState(value, _title, url) { this.state = value; location.hash = url; entries.push({ state: structuredClone(value), hash: url }); },
    back() { backs++; }
  };
  const scope = { history, location, backButton, routeHash, readRoute, parentRoute, restoringRoute: false, busy: false, host: { hidden: false }, activeRoomId: 'founder', view: 'home', selectedDivisionId: '', divisionSection: 'overview', workFilter: {}, productionUI: { selection: () => ({}) }, window: { scrollY: 120, scrollTo() {} }, restoreRoute: () => { restores++; } };
  runInNewContext(ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  scope.writeRoute(true); assert.equal(backButton.disabled, true);
  scope.view = 'activity'; scope.workFilter = { query: 'catalog', status: 'review', page: 2 }; scope.writeRoute();
  assert.equal(history.state.kaelDepth, 1); assert.equal(backButton.disabled, false);
  assert.equal(readRoute(entries[0].hash).query, 'catalog');
  scope.selectedDivisionId = 'creative'; scope.view = 'division'; scope.writeRoute(); assert.equal(history.state.kaelDepth, 2);
  scope.goBack(); assert.equal(backs, 1); assert.equal(restores, 0);
  location.hash = entries[0].hash; history.state = entries[0].state; scope.view = 'activity'; scope.selectedDivisionId = ''; scope.writeRoute(true);
  assert.equal(history.state.kaelDepth, 1); assert.equal(entries.length, 2); assert.equal(readRoute(location.hash).page, 2);
  history.state = null; location.hash = '#view=production&division=creative&episode=old'; scope.goBack();
  assert.equal(location.hash, '#view=division&division=creative'); assert.equal(backs, 1); assert.equal(restores, 1);
  scope.goBack(); assert.equal(location.hash, '#view=team'); scope.goBack(); assert.equal(location.hash, '#view=home');
  scope.updateBack(); assert.equal(backButton.disabled, true); scope.goBack(); assert.equal(restores, 3);
  history.state = { kaelDepth: 2 }; scope.busy = true; scope.goBack(); assert.equal(backs, 1);
});

test('division directory searches new companies, managers and specialist roles without changing data', () => {
  let s = applyCommand(initialState(), { type: 'division', name: 'Produk Baru', manager: 'Rani', worker: 'Dimas', role: 'Riset material' });
  s.business.name = 'Studio Baru';
  s = applyCommand(s, { type: 'workflow-agent', name: 'Operasional', company: 'Laxholm Furniture', agent: 'Mails', role: 'Email order', workflowId: 'email', workflowName: 'Email order' });
  const before = structuredClone(s);
  for (const query of [' produk ', 'RANI', 'riset material', 'studio baru']) assert.equal(findDivisions(s, query)[0].id, s.divisions[0].id);
  for (const query of ['laxholm furniture', 'MAILS', 'email order']) assert.equal(findDivisions(s, query)[0].id, s.divisions[1].id);
  assert.equal(findDivisions(s, '').length, 2);
  assert.equal(findDivisions(s, 'rani laxholm').length, 0, 'search never combines unrelated divisions');
  assert.deepEqual(s, before);
  assert.deepEqual(divisionTools(divisionState(s, s.divisions[0].id)), { workflows: false, production: false });
  assert.deepEqual(divisionTools(divisionState(s, s.divisions[1].id)), { workflows: true, production: false });
  s.productions = [{ id: 'episode', divisionId: s.divisions[0].id }];
  assert.equal(divisionTools(divisionState(s, s.divisions[0].id)).production, true);
  assert.equal(divisionTools(divisionState(s, s.divisions[1].id)).production, false);
  assert.deepEqual(divisionTools(initialState()), { workflows: false, production: false });
});

test('history filters status, ID, node and WIB dates, deduplicates active runs and pages without mutation', () => {
  const execution = (id, status, startedAt, node = '', error = '') => ({ id, status, startedAt, stoppedAt: '', url: '', node, error });
  const active = execution('active', 'running', '2026-10-13T17:00:01Z');
  const snapshot = { running: [active], waiting: [], recent: [
    { ...active, status: 'success' },
    execution('bad-1', 'error', '2026-10-13T17:30:00Z', 'Google Sheets', 'Data tidak ditemukan'),
    execution('crash-1', 'crashed', '2026-10-13T16:59:59Z', 'HTTP Request'),
    ...Array.from({ length: 12 }, (_, i) => execution(`ok-${i}`, 'success', '2026-10-12T10:00:00Z')),
  ] };
  const original = structuredClone(snapshot);
  assert.equal(workflowHistory(snapshot).available, 15);
  assert.equal(workflowHistory(snapshot, { query: 'ACTIVE' }).executions[0].status, 'running');
  assert.equal(workflowHistory(snapshot, { status: 'failed' }).total, 2);
  assert.equal(workflowHistory(snapshot, { query: 'sheets' }).executions[0].id, 'bad-1');
  assert.equal(workflowHistory(snapshot, { query: 'tidak ditemukan' }).total, 1);
  assert.equal(workflowHistory(snapshot, { from: '2026-10-14', to: '2026-10-14' }).total, 2);
  assert.equal(workflowHistory(snapshot, { from: '2026-10-15', to: '2026-10-14' }).total, 0);
  const last = workflowHistory(snapshot, { status: 'success', page: 99 });
  assert.equal(last.page, 2); assert.equal(last.executions.length, 2);
  assert.equal(workflowHistory(snapshot, { query: 'no-match', page: 99 }).page, 1);
  assert.equal(workflowHistory(undefined).total, 0);
  assert.deepEqual(snapshot, original);
});

test('overview counts real production once and retains unknown workflow and division isolation', () => {
  let state = applyCommand(initialState(), { type: 'division', name: 'KaelaCH', manager: 'Kaela', worker: 'Nara', role: 'Naskah' });
  const creativeId = state.divisions[0].id, nara = state.agents[1];
  state = applyCommand(state, { type: 'workflow-agent', name: 'Marketing', company: 'Laxholm', agent: 'Date', role: 'Katalog', workflowId: 'wf-1', workflowName: 'Katalog produk' });
  const marketingId = state.divisions[1].id;
  state.briefs = [{ id: 'brief-1', divisionId: creativeId }];
  state.tasks = [{ id: 'prod-task', briefId: 'brief-1', agentId: nara.id, status: 'running' }, { id: 'manual-task', briefId: 'brief-1', agentId: nara.id, status: 'running' }];
  state.productions = [{ id: 'episode-1', divisionId: creativeId, taskId: 'prod-task', status: 'running', stage: 'Nara menulis naskah' }];
  state.n8n = [{ workflowId: 'wf-1', connection: 'online', checkedAt: new Date().toISOString(), active: true, partial: false, running: [{ id: 'run-1' }], waiting: [], recent: [] }];
  const original = structuredClone(state);
  assert.equal(divisionOverview(state).activeCount, 3);
  assert.equal(divisionOverview(divisionState(state, creativeId)).activeCount, 2);
  assert.match(divisionOverview(divisionState(state, creativeId)).text, /Nara/);
  assert.equal(divisionOverview(divisionState(state, marketingId)).activeCount, 1);
  assert.equal(divisionOverview(state).complete, true);
  assert.deepEqual(state, original);
  state.n8n[0].checkedAt = '2020-01-01T00:00:00Z';
  assert.equal(divisionOverview(divisionState(state, marketingId)).complete, false);
  assert.equal(divisionOverview(divisionState(state, marketingId)).kind, 'unknown');
  state.n8n[0].checkedAt = new Date().toISOString(); state.n8n[0].partial = true;
  assert.equal(divisionOverview(state).complete, false);
  state.productions[0].status = 'blocked';
  assert.equal(divisionOverview(divisionState(state, creativeId)).kind, 'error');
  state.productions[0].status = 'review'; state.tasks = [];
  assert.equal(divisionOverview(divisionState(state, creativeId)).kind, 'review');
  assert.equal(divisionOverview(initialState()).activeCount, 0);
  assert.equal(divisionOverview(initialState()).complete, true);
});

test('Founder preview frames the room and restores the shared renderer after success or failure', () => {
  const floor = founderFloor;
  for (const aspect of [1.2, 1.8, 3.5, 4.5]) {
  const camera = founderPreviewCamera(aspect);
  for (const x of [floor.x - floor.width / 2, floor.x + floor.width / 2]) {
    for (const z of [floor.z - floor.depth / 2, floor.z + floor.depth / 2]) {
      for (const y of [0, 3.4]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        assert.ok(Math.abs(point.x) < .94 && Math.abs(point.y) < .94, 'the room fits with a visible margin');
      }
    }
  }
  assert.ok(Math.abs((camera.right - camera.left) / (camera.top - camera.bottom) - aspect) < 1e-8);
  }
  let ratio = 2, size = [640, 480], fail = false, lost = false, expectedSize = [900, 500];
  const renderer = {
    getContext: () => ({ isContextLost: () => lost }),
    getSize: target => target.set(...size), getPixelRatio: () => ratio,
    setPixelRatio: value => ratio = value,
    setSize: (width, height, updateStyle) => { assert.equal(updateStyle, false); size = [width, height]; },
    render: (_scene, lens) => { assert.ok(lens.isOrthographicCamera); assert.deepEqual(size, expectedSize); assert.ok(Math.abs((lens.right - lens.left) / (lens.top - lens.bottom) - size[0] / size[1]) < 1e-8); },
    domElement: { toDataURL: type => { assert.equal(type, 'image/webp'); if (fail) throw new Error('capture failed'); return 'data:image/webp;base64,preview'; } },
  };
  assert.match(captureFounderPreview(renderer, new THREE.Scene()), /^data:image/);
  assert.deepEqual(size, [640, 480]); assert.equal(ratio, 2);
  expectedSize = [1400, 350];
  assert.match(captureFounderPreview(renderer, new THREE.Scene(), ...expectedSize), /^data:image/);
  assert.deepEqual(size, [640, 480]); assert.equal(ratio, 2);
  assert.throws(() => captureFounderPreview(renderer, new THREE.Scene(), 0, 280), /Ukuran/);
  expectedSize = [900, 500];
  fail = true;
  assert.throws(() => captureFounderPreview(renderer, new THREE.Scene()), /capture failed/);
  assert.deepEqual(size, [640, 480]); assert.equal(ratio, 2);
  lost = true;
  assert.throws(() => captureFounderPreview(renderer, new THREE.Scene()), /grafis/);
  assert.deepEqual(size, [640, 480]); assert.equal(ratio, 2);
});
