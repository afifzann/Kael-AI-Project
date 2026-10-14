import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState, applyCommand, contextFor } from '../src/domain.ts';
import { divisionLayouts, facilityLayouts, workstationItems, officeWalkways, walkwayTiles, strollRoute, facilityRoute, smoothRoute, routeLength, sampleRoute, officeSite, founderFloor } from '../src/layout.ts';
import { facilitySeats, serverAgent, medicalPatients } from '../src/facilities.ts';
import { builderAgent, builderSession, builderActivity } from '../src/builder-room.ts';
import { createMonitor } from '../src/monitor.ts';
import { createNavigation } from '../src/navigation.ts';
import { createCharacter } from '../src/character.ts';
import { surfaceTexture, createSurfaceMaterials, createOfficeMaterials, createFloorGeometry } from '../src/materials.ts';
import * as THREE from 'three';
import { socialVisit, advanceTravel, courtPlay } from '../src/social.ts';
import { characterLook, divisionTheme, agentActivity, serverIndicatorIntensity } from '../src/visuals.ts';
import { divisionState } from '../src/workspace.ts';

test('division workspaces isolate tasks, plans, result decisions, errors, episodes and n8n monitoring', () => {
  let s = applyCommand(initialState(), { type: 'division', name: 'KaelaCH', manager: 'Kaela', worker: 'Nara', role: 'Naskah' });
  const creative = s.divisions[0].id;
  s = applyCommand(s, { type: 'brief', divisionId: creative, agentId: s.agents[1].id, title: 'Episode', goal: 'Recap', criteria: 'Sesuai chapter', tasks: ['Tulis'] });
  s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id });
  s = applyCommand(s, { type: 'workflow-agent', name: 'Marketing Outdor', company: 'Laxholm Furniture', agent: 'Bu Yuli', role: 'Katalog', workflowId: 'wf1', workflowName: 'LAXHOLM' });
  const marketing = s.divisions[1].id, yuli = s.agents[2];
  s = applyCommand(s, { type: 'agent-error', agentId: yuli.id, reason: 'Node gagal' });
  s.n8n = [{ workflowId: 'wf1', connection: 'online' }];
  s.productions = [{ id: 'episode1', divisionId: creative, taskId: s.tasks[0].id, status: 'review' }];
  s.decisions.push({ id: 'result1', type: 'result', targetId: s.tasks[0].id, status: 'pending' });
  const original = structuredClone(s), recap = divisionState(s, creative), outdoor = divisionState(s, marketing);
  assert.deepEqual(recap.divisions.map(d => d.id), [creative]); assert.equal(recap.agents.length, 2);
  assert.equal(recap.briefs.length, 1); assert.equal(recap.tasks.length, 1); assert.equal(recap.decisions.length, 2); assert.equal(recap.productions.length, 1);
  assert.equal(recap.workflowBindings.length, 0); assert.equal(recap.n8n.length, 0); assert.equal(recap.incidents.length, 0);
  assert.deepEqual(outdoor.agents.map(a => a.id), [yuli.id]); assert.equal(outdoor.workflowBindings.length, 1); assert.equal(outdoor.n8n.length, 1); assert.equal(outdoor.incidents.length, 1);
  for (const key of ['briefs', 'tasks', 'decisions', 'productions']) assert.equal(outdoor[key].length, 0);
  const missing = divisionState(s, 'missing');
  for (const key of ['divisions', 'agents', 'briefs', 'tasks', 'decisions', 'productions', 'workflowBindings', 'n8n', 'incidents']) assert.equal(missing[key].length, 0);
  assert.deepEqual(s, original);
});

test('new manual divisions have their own empty workspace without inheriting another division tools or results', () => {
  let s = initialState();
  for (let i = 0; i < 20; i++) s = applyCommand(s, { type: 'division', name: `Divisi ${i}`, manager: `Manager ${i}`, worker: `Agent ${i}`, role: 'Operasi' });
  const scoped = divisionState(s, s.divisions[19].id);
  assert.equal(scoped.divisions[0].name, 'Divisi 19'); assert.equal(scoped.agents.length, 2);
  assert.equal(scoped.workflowBindings, undefined); assert.equal(scoped.productions, undefined); assert.equal(scoped.tasks.length, 0);
  assert.equal(s.divisions.length, 20); assert.equal(s.agents.length, 40);
});

function setup(approved = true) {
  let s = applyCommand(initialState(), { type: 'division', name: 'Produk', manager: 'Manager', worker: 'Bayu', role: 'Developer' });
  s = applyCommand(s, { type: 'brief', title: 'Produk pertama', goal: 'Buat draft', criteria: 'Bisa dibaca', divisionId: s.divisions[0].id, agentId: s.agents[1].id, tasks: ['Tugas pertama', 'Tugas kedua'] });
  if (approved) { s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id }); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' }); }
  return s;
}
const run = (s, type, extra = {}) => applyCommand(s, { type, id: s.tasks[0].id, ...extra });
test('production revision and cancellation reject invalid states or missing reasons without mutating history',()=>{
  const queued=setup();assert.throws(()=>run(queued,'revise-task',{reason:'Revisi'}),/Hentikan/);
  let s=run(queued,'start');assert.throws(()=>run(s,'revise-task',{reason:'Revisi'}),/Hentikan/);
  s=run(s,'result',{content:'Hasil pertama'});s=run(s,'review',{accept:true,note:'Sesuai'});const previous=structuredClone(s);
  assert.throws(()=>run(s,'revise-task',{reason:''}),/wajib/);assert.deepEqual(s,previous);
  s=run(s,'revise-task',{reason:'Perbaiki crop'});assert.equal(s.decisions[0].status,'revision');assert.deepEqual(s.tasks[0].results,previous.tasks[0].results);
  assert.throws(()=>run(s,'cancel-task',{reason:''}),/wajib/);s=run(s,'cancel-task',{reason:'Hapus dari daftar'});assert.equal(s.tasks[0].status,'cancelled');assert.deepEqual(s.tasks[0].results,previous.tasks[0].results);
  assert.throws(()=>run(s,'cancel-task',{reason:'Ulang'}),/sudah/);
});
test('division always has a separate manager and executor', () => { const s = setup(); assert.notEqual(s.agents[0].id, s.agents[1].id); assert.equal(s.divisions[0].managerId, s.agents[0].id); });

test('builder creates several distinct agents atomically without starting work', () => {
  const before = initialState();
  const command = { type: 'division', name: 'Kaelach', manager: 'Damar', workers: [{ name: 'Raka', role: 'Riset' }, { name: 'Nara', role: 'Naskah' }, { name: 'Mika', role: 'Thumbnail' }] };
  const s = applyCommand(before, command);
  assert.equal(s.agents.length, 4);
  assert.equal(new Set(s.agents.map(a => a.id)).size, 4);
  assert.equal(s.agents.filter(a => a.manager).length, 1);
  assert.equal(s.tasks.length, 0);
  assert.equal(before.divisions.length, 0);
  assert.throws(() => applyCommand(before, { ...command, workers: [{ name: ' damar ', role: 'Riset' }] }), /berbeda/);
  assert.throws(() => applyCommand(before, { ...command, workers: [{ name: 'Raka', role: '' }] }), /wajib/);
  assert.throws(() => applyCommand(before, { ...command, workers: [] }), /1 sampai 12/);
  assert.throws(() => applyCommand(before, { ...command, workers: Array(13).fill({ name: 'A', role: 'B' }) }), /1 sampai 12/);
  assert.equal(before.agents.length, 0);
});

test('automatic room slots preserve old rooms and keep desks inside non-overlapping areas', () => {
  let s = initialState();
  s = applyCommand(s, { type: 'division', name: 'Pertama', manager: 'M', workers: Array.from({ length: 12 }, (_, i) => ({ name: `A${i}`, role: 'Pelaksana' })) });
  const first = divisionLayouts(s)[0];
  for (let i = 0; i < 4; i++) s = applyCommand(s, { type: 'division', name: `Tim${i}`, manager: 'M', worker: 'A', role: 'Pelaksana' });
  const rooms = divisionLayouts(s);
  assert.deepEqual(rooms[0], first);
  for (const room of rooms) {
    assert.ok(room.x - room.width / 2 > 7, 'Founder plot is kept clear');
    for (const member of room.members) {
      assert.ok(Math.abs(member.x) + 1.1 < room.width / 2);
      assert.ok(member.z - .55 > -room.depth / 2);
      assert.ok(member.z + 1.2 < room.depth / 2);
    }
    for (const other of rooms.filter(r => r.id !== room.id)) {
      assert.ok(Math.abs(room.x - other.x) >= (room.width + other.width) / 2 + 2 || Math.abs(room.z - other.z) >= (room.depth + other.depth) / 2 + 2);
    }
  }
});
test('unapproved plans cannot start tasks or accept results', () => { const s = setup(false); assert.throws(() => run(s, 'start'), /belum disetujui/); assert.throws(() => run(s, 'result', { content: 'Tidak sah' }), /Mulai tugas/); });

test('furnished rooms leave desks and a central walkway clear at every team size', () => {
  const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
  for (let workers = 1; workers <= 12; workers++) {
    const state = applyCommand(initialState(), { type: 'division', name: 'Tim', manager: 'Manager', workers: Array.from({ length: workers }, (_, i) => ({ name: `A${i}`, role: 'Pelaksana' })) });
    const room = divisionLayouts(state)[0];
    const desks = room.members.map(member => ({ x: member.x, z: member.z + .4, width: member.manager ? 3.2 : 2.15, depth: 1.9 }));
    assert.deepEqual([...new Set(room.furniture.map(f => f.kind))], ['sofa', 'coffee-table', 'cabinet', 'bookshelf', 'huddle', 'plant']);
    for (const item of room.furniture) {
      assert.ok(Math.abs(item.x) + item.width / 2 < room.width / 2);
      assert.ok(Math.abs(item.z) + item.depth / 2 < room.depth / 2);
      assert.ok(Math.abs(item.x) - item.width / 2 > .55, 'central entrance stays clear');
      for (const desk of desks) assert.ok(!overlaps(item, desk), `${item.kind} must not intersect a workstation`);
      for (const other of room.furniture.filter(f => f !== item)) assert.ok(!overlaps(item, other), 'furniture must not intersect');
    }
  }
});

test('manager zone is separate from every worker and walking routes avoid furniture', () => {
  for (let workers = 1; workers <= 12; workers++) {
    const s = applyCommand(initialState(), { type: 'division', name: 'Studio', manager: 'M', workers: Array.from({ length: workers }, (_, i) => ({ name: `A${i}`, role: 'Riset' })) });
    const room = divisionLayouts(s)[0], manager = room.members.find(a => a.manager), paths = officeWalkways([room]);
    assert.ok(room.members.filter(a => !a.manager).every(a => a.z - manager.z >= 3.3));
    for (const member of room.members) {
      const route = smoothRoute(strollRoute(room, member)), length = routeLength(route);
      assert.deepEqual(sampleRoute(route, -1), { ...route[0], heading: sampleRoute(route, 0).heading });
      assert.deepEqual({ x: sampleRoute(route, length + 1).x, z: sampleRoute(route, length + 1).z }, route.at(-1));
      let last = sampleRoute(route, 0);
      for (let distance = .1; distance <= length; distance += .1) {
        const point = sampleRoute(route, distance);
        assert.ok(Number.isFinite(point.heading));
        assert.ok(Math.hypot(point.x - last.x, point.z - last.z) <= .10001, 'constant-speed sampling must never jump');
        for (const furniture of room.furniture) assert.ok(Math.abs(point.x - furniture.x) > furniture.width / 2 + .24 || Math.abs(point.z - furniture.z) > furniture.depth / 2 + .24, 'walking body stays clear of furniture');
        if (point.z > room.depth / 2 || Math.abs(point.x) > room.width / 2) {
          const wx = point.x + room.x, wz = point.z + room.z;
          for (const dx of [-.24, .24]) for (const dz of [-.24, .24]) {
            const px = wx + dx, pz = wz + dz;
            const onRoom = Math.abs(px - room.x) <= room.width / 2 && Math.abs(pz - room.z) <= room.depth / 2;
            assert.ok(onRoom || paths.some(p => Math.abs(px - p.x) <= p.width / 2 && Math.abs(pz - p.z) <= p.depth / 2), 'walking footprint stays on the joined room and pavement surfaces');
          }
        }
        last = point;
      }
    }
  }
});

test('all room entrances and Founder share a connected walkway network without crossing other rooms', () => {
  let s = initialState();
  for (let i = 0; i < 7; i++) s = applyCommand(s, { type: 'division', name: `Team ${i}`, manager: 'M', workers: Array.from({ length: i % 2 ? 12 : 1 }, (_, j) => ({ name: `W${j}`, role: 'Agent' })) });
  const rooms = divisionLayouts(s), paths = officeWalkways(rooms);
  const touches = (a, b) => Math.abs(a.x - b.x) <= (a.width + b.width) / 2 && Math.abs(a.z - b.z) <= (a.depth + b.depth) / 2;
  const reached = new Set([0]);
  for (let pass = 0; pass < paths.length; pass++) paths.forEach((path, i) => { if (paths.some((p, j) => reached.has(j) && touches(path, p))) reached.add(i); });
  assert.equal(reached.size, paths.length);
  for (const room of rooms) {
    assert.ok(paths.some(p => Math.abs(room.x - p.x) < p.width / 2 && Math.abs(room.z + room.depth / 2 + .25 - p.z) < p.depth / 2));
    for (const path of paths) assert.ok(!touches(path, { x: room.x, z: room.z, width: room.width - .6, depth: room.depth - .6 }), 'external pavement must not cut through the interior');
  }
});

test('paving reaches complete room frontages and clips edge tiles to corridor bounds', () => {
  let s = initialState();
  for (let i = 0; i < 4; i++) s = applyCommand(s, { type: 'division', name: `T${i}`, manager: 'M', workers: Array.from({ length: i % 2 ? 12 : 1 }, (_, j) => ({ name: `A${j}`, role: 'Agent' })) });
  const rooms = [...facilityLayouts, ...divisionLayouts(s)], paths = officeWalkways(rooms);
  for (const room of rooms) for (const offset of [-room.width / 2 + .1, 0, room.width / 2 - .1]) {
    const x = room.x + offset, z = room.z + room.depth / 2 + .001;
    assert.ok(paths.some(p => Math.abs(x - p.x) <= p.width / 2 && Math.abs(z - p.z) <= p.depth / 2), 'no gap anywhere along the room frontage');
  }
  for (const room of divisionLayouts(s)) {
    const x = room.x - room.width / 2 - .001;
    assert.ok(paths.some(p => Math.abs(x - p.x) <= p.width / 2 && Math.abs(room.z - p.z) <= p.depth / 2), 'side corridor meets the division wall');
  }
  const irregular = [{ x: .33, z: .27, width: 1.8, depth: 1.1 }, { x: 1.23, z: .97, width: .6, depth: 1.9 }];
  const tiles = walkwayTiles(irregular), [a, b] = irregular;
  const overlapX = Math.max(0, Math.min(a.x + a.width / 2, b.x + b.width / 2) - Math.max(a.x - a.width / 2, b.x - b.width / 2));
  const overlapZ = Math.max(0, Math.min(a.z + a.depth / 2, b.z + b.depth / 2) - Math.max(a.z - a.depth / 2, b.z - b.depth / 2));
  assert.ok(Math.abs(tiles.reduce((sum, t) => sum + t.width * t.depth, 0) - (a.width * a.depth + b.width * b.depth - overlapX * overlapZ)) < 1e-6, 'paving exactly covers the union, without missing or doubled tiles');
  for (const t of tiles) {
    assert.ok(t.width > 0 && t.depth > 0);
    for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) assert.ok(irregular.some(p => Math.abs(t.x + t.width * dx - p.x) <= p.width / 2 + 1e-6 && Math.abs(t.z + t.depth * dz - p.z) <= p.depth / 2 + 1e-6), 'clipped tile corners stay on paving');
  }
  assert.deepEqual(walkwayTiles([]), []);
});

test('builder appearance is deterministic and distinct, with division-appropriate monitor themes', () => {
  const worker = { name: 'Raka', role: 'Analis', manager: false };
  assert.deepEqual(characterLook('Trading', worker, 0), characterLook('Trading', { ...worker, id: 'new-id' }, 0));
  const looks = Array.from({ length: 12 }, (_, i) => characterLook('Trading', { ...worker, name: `Agent ${i}` }, i));
  assert.equal(new Set(looks.map(l => `${l.color}/${l.accent}`)).size, 12);
  assert.ok(looks.every(l => l.model === 'robot' && !/sweater|blazer|kacamata/i.test(l.description)));
  assert.equal(characterLook('Trading', { ...worker, manager: true }).color, '#2d3238');
  assert.equal(characterLook('Founder', { ...worker, name: 'Kael' }).color, '#1c1c1e');
  assert.equal(divisionTheme('Trading', 'Manager'), 'trading');
  assert.equal(divisionTheme('YouTube Kaelach', 'Penulis'), 'content');
  assert.equal(divisionTheme('YouTube Kaelach', 'Thumbnail designer'), 'design');
  assert.equal(divisionTheme('Engineering', 'Developer'), 'code');
});

test('one building encloses indoor rooms, keeps leisure outside and connects through real door openings', () => {
  const s = setup(), rooms = [...facilityLayouts, ...divisionLayouts(s)], site = officeSite(rooms);
  const overlap = (a, b) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
  for (const room of [founderFloor, ...rooms]) {
    if (['garden', 'sport'].includes(room.kind)) { assert.ok(!overlap(room, site.floor), 'outdoor facilities stay outside the shell'); continue; }
    assert.ok(room.x - room.width / 2 >= site.left - 1e-6 && room.x + room.width / 2 <= site.right + 1e-6);
    assert.ok(room.z - room.depth / 2 >= site.back && room.z + room.depth / 2 <= site.front);
    assert.ok(!overlap(room, site.lobby), 'reception must not occupy another room');
  }
  const builder = rooms.find(r => r.id === 'builder');
  assert.ok(builder.width * builder.depth < 8.4 * 10.4 * .4, 'single occupant studio is substantially smaller');
  assert.ok(site.parking.z - site.parking.depth / 2 > site.front);
  assert.ok(site.approach.z - site.approach.depth / 2 <= site.front, 'landing overlaps the threshold without a floor gap');
  assert.ok(site.approach.z + site.approach.depth / 2 <= site.parking.z - site.parking.depth / 2 + .2, 'entrance paving stops at the parking edge');
  const navigation = createNavigation([...site.floors, ...rooms, ...officeWalkways(rooms)], site.walls);
  const inside = { x: 6.4, z: 5.05 };
  for (const id of ['garden', 'sport']) {
    const room = rooms.find(r => r.id === id), goal = { x: room.x, z: room.z + room.depth / 2 + 1.2 };
    const route = navigation.route(inside, goal);
    assert.ok(route.length >= 2, `${id} is reachable through the rear door`);
    assert.ok(route.slice(1).every((p, i) => navigation.clearSegment(route[i], p)));
    const division = divisionLayouts(s)[0], itinerary = facilityRoute(division, division.members[0], id, 0);
    assert.ok(itinerary.slice(1).every((p, i) => navigation.clearSegment(itinerary[i], p)), 'facility itinerary also uses the rear opening');
  }
  assert.equal(navigation.clearSegment({ x: -6.3, z: site.back + 1 }, { x: -6.3, z: site.back - 1 }), false, 'solid facade cannot be crossed');
  assert.equal(navigation.clearSegment({ x: site.gardenDoor.x, z: site.back + 1 }, { x: site.gardenDoor.x, z: site.back - 1 }), true);
  assert.ok(navigation.route(inside, { x: 0, z: site.front + 1.5 }).length >= 2, 'front approach remains connected to the office');
  assert.equal(navigation.route(inside, { x: 0, z: site.parking.z }).length, 0, 'agents cannot wander onto the vehicle apron');
});

test('shared facilities keep division plots free and connect to the Founder even before a team exists', () => {
  let s = initialState();
  for (let i = 0; i < 7; i++) s = applyCommand(s, { type: 'division', name: `Team ${i}`, manager: 'M', worker: 'W', role: 'Agent' });
  const touches = (a, b) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
  assert.equal(new Set(facilityLayouts.map(r => r.id)).size, 7);
  for (const divisions of [[], divisionLayouts(s)]) {
    const rooms = [...facilityLayouts, ...divisions], paths = officeWalkways(rooms);
    const reached = new Set([0]);
    for (let pass = 0; pass < paths.length; pass++) paths.forEach((p, i) => { if (paths.some((other, j) => reached.has(j) && touches(p, other))) reached.add(i); });
    assert.equal(reached.size, paths.length);
    for (const room of rooms) {
      assert.ok(!touches(room, { x: 0, z: 0, width: 14, depth: 11.7 }), 'Founder plot remains free');
      for (const other of rooms.filter(r => r.id !== room.id)) assert.ok(!touches(room, other), 'rooms must not overlap');
      for (const path of paths) assert.ok(!touches(path, { ...room, width: room.width - .6, depth: room.depth - .6 }), 'roads cannot cut through rooms');
      assert.ok(paths.some(p => Math.abs(room.x - p.x) < p.width / 2 && Math.abs(room.z + room.depth / 2 + .25 - p.z) < p.depth / 2), 'each facility entrance joins the network');
    }
  }
});

test('stepped envelope hugs the floor union and central corridors meet each room wall', () => {
  const state = applyCommand(setup(), { type: 'division', name: 'Studio kedua', manager: 'M', worker: 'W', role: 'Agent' });
  const rooms = [...facilityLayouts, ...divisionLayouts(state)], site = officeSite(rooms), paths = officeWalkways(rooms);
  const inside = p => site.floors.some(r => Math.abs(p.x - r.x) <= r.width / 2 + 1e-6 && Math.abs(p.z - r.z) <= r.depth / 2 + 1e-6);
  assert.ok(site.tiles.reduce((sum, t) => sum + t.width * t.depth, 0) < site.floor.width * site.floor.depth * .97, 'unused corners are removed from the envelope');
  for (const wall of site.walls) {
    const horizontal = wall.depth === .14;
    const a = { x: wall.x + (horizontal ? 0 : .12), z: wall.z + (horizontal ? .12 : 0) };
    const b = { x: wall.x - (horizontal ? 0 : .12), z: wall.z - (horizontal ? .12 : 0) };
    assert.notEqual(inside(a), inside(b), 'each exterior wall sits directly on a floor boundary');
  }
  for (const room of rooms.filter(r => Math.abs(r.x) < 5 && r.z > site.back)) for (const side of [-1, 1]) {
    const point = { x: room.x + side * (room.width / 2 + .01), z: room.z };
    assert.ok(paths.some(p => Math.abs(point.x - p.x) < p.width / 2 && Math.abs(point.z - p.z) < p.depth / 2), 'paving reaches the central room wall without an empty strip');
  }
});

test('division rugs fit furniture zones without covering entrances or overlapping one another', () => {
  for (let count = 1; count <= 12; count++) {
    const state = applyCommand(initialState(), { type: 'division', name: 'Studio', manager: 'M', workers: Array.from({ length: count }, (_, i) => ({ name: `W${i}`, role: 'Agent' })) });
    const room = divisionLayouts(state)[0];
    assert.equal(room.rugs.length, 2);
    for (const rug of room.rugs) {
      assert.ok(Math.abs(rug.x) + rug.width / 2 < room.width / 2);
      assert.ok(Math.abs(rug.z) + rug.depth / 2 < room.depth / 2);
      assert.ok(Math.abs(rug.x) - rug.width / 2 > .55, 'central doorway and aisle remain bare');
      for (const other of room.rugs.filter(r => r !== rug)) assert.ok(Math.abs(rug.x - other.x) >= (rug.width + other.width) / 2 || Math.abs(rug.z - other.z) >= (rug.depth + other.depth) / 2);
    }
    const manager = room.members.find(a => a.manager), mat = room.rugs[0];
    assert.ok(Math.abs(manager.x - mat.x) + 1.6 < mat.width / 2);
    assert.ok(Math.abs(manager.z + .83 - mat.z) + .3 < mat.depth / 2, 'manager chair stays on its rug');
  }
});

test('public paving covers the entire foyer and all circulation without drawing over rooms', () => {
  const rooms = [...facilityLayouts, ...divisionLayouts(setup())], site = officeSite(rooms);
  const indoor = [founderFloor, ...rooms.filter(r => r.z + r.depth / 2 > site.back)];
  const area = tiles => tiles.reduce((sum, t) => sum + t.width * t.depth, 0);
  assert.ok(Math.abs(area(site.publicTiles) + area(indoor) - area(site.tiles)) < 1e-6, 'public paving plus rooms covers the whole floor exactly once');
  for (const tile of site.publicTiles) for (const room of indoor) assert.ok(Math.abs(tile.x - room.x) >= (tile.width + room.width) / 2 - 1e-6 || Math.abs(tile.z - room.z) >= (tile.depth + room.depth) / 2 - 1e-6, 'paving does not overlay the room finish');
  for (const x of [-4.7, -2.5, 0, 2.9, 4.7]) for (const offset of [5.5, 4, 2.5]) {
    const z = site.front - offset;
    assert.ok(site.publicTiles.some(t => Math.abs(x - t.x) <= t.width / 2 + 1e-6 && Math.abs(z - t.z) <= t.depth / 2 + 1e-6), 'no untiled rectangular island remains around the seating');
  }
});

test('Builder has one dedicated resident, existing Codex chat and no simulated employee work', () => {
  const s = setup(), before = structuredClone(s), room = facilityLayouts.find(r => r.id === 'builder');
  assert.equal(room.kind, 'builder'); assert.equal(room.capacity, 0);
  assert.deepEqual(facilitySeats(room.id), []);
  assert.equal(builderAgent.divisionId, room.id);
  assert.equal(characterLook(room.name, builderAgent, 3).theme, 'code');
  assert.deepEqual(agentActivity(s, builderAgent), { kind: 'offline', text: 'Chat belum tersinkron', typing: false, canWalk: false });
  assert.equal(new URL(builderSession.url).protocol, 'codex:');
  assert.equal(new URL(builderSession.url).pathname, '/' + builderSession.threadId);
  assert.throws(() => applyCommand(s, { type: 'facility-start', roomId: room.id, purpose: 'break', title: 'Visit', agenda: 'Test', participantIds: [s.agents[0].id] }), /infrastruktur/);
  assert.ok(!s.agents.some(a => a.id === builderAgent.id));
  assert.deepEqual(s, before);
});

test('Builder monitor identifies the selected chat without drawing live messages or fake execution', () => {
  const previous = globalThis.document, lines = [];
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText(value) { lines.push(value); } }) }) };
  try {
    const monitor = createMonitor(characterLook('Builder studio', builderAgent, 3), false, builderSession);
    assert.ok(lines.includes(builderSession.title));
    assert.ok(lines.includes('Chat belum tersinkron'));
    const initial = [...lines]; lines.length = 0;
    monitor.draw(42, 'Fake task must not appear');
    assert.deepEqual(lines, initial);
    monitor.texture.dispose();
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});

test('Builder works on fresh session events and becomes available for leisure when its own turn ends', () => {
  const now = Date.now(), at = new Date(now).toISOString();
  const presence = { connection: 'online', status: 'working', checkedAt: at, lastEventAt: at };
  assert.equal(builderActivity(presence, now).typing, true);
  assert.equal(builderActivity(presence, now).canWalk, false);
  assert.equal(builderActivity({ ...presence, connection: 'disconnected' }, now).typing, false);
  assert.equal(builderActivity(presence, now + 21000).typing, false);
  assert.equal(builderActivity({ ...presence, lastEventAt: new Date(now - 121000).toISOString() }, now).typing, false);
  assert.equal(builderActivity({ ...presence, status: 'completed' }, now).text, 'Santai · Sesi Builder');
  assert.equal(builderActivity({ ...presence, status: 'completed' }, now).canWalk, true);
  assert.equal(builderActivity({ ...presence, status: 'interrupted' }, now).canWalk, true);
  assert.equal(builderActivity({ ...presence, status: 'unknown' }, now).canWalk, false);
  assert.equal(builderActivity({ ...presence, status: 'interrupted' }, now).typing, false);
  assert.equal(builderActivity({ ...presence, checkedAt: 'bad' }, now).typing, false);
});

test('Builder joins ordinary social visits when idle and stops participating as soon as its session works', () => {
  const s = initialState(), at = new Date().toISOString();
  s.builderChat = { connection: 'online', status: 'completed', checkedAt: at, lastEventAt: at, turnId: 'a', partial: false, error: '' };
  assert.ok(Array.from({ length: 6 }, (_, cycle) => socialVisit(s, cycle)).some(visit => visit?.participantIds.includes(builderAgent.id)));
  s.builderChat.status = 'working';
  assert.equal(agentActivity(s, builderAgent).typing, true);
  assert.equal(agentActivity(s, builderAgent).canWalk, false, 'existing ambient trip now returns home');
  assert.ok(Array.from({ length: 6 }, (_, cycle) => socialVisit(s, cycle)).every(visit => !visit?.participantIds.includes(builderAgent.id)));
  s.builderChat.status = 'completed';
  assert.equal(agentActivity(s, builderAgent).canWalk, true);
});

test('server infrastructure has no leisure seats or sessions and preserves existing data', () => {
  const room = facilityLayouts.find(r => r.id === 'server');
  assert.equal(room.kind, 'server'); assert.equal(room.capacity, 0);
  assert.deepEqual(facilitySeats(room.id), []);
  const s = setup(), before = structuredClone(s);
  const division = divisionLayouts(s)[0];
  assert.deepEqual(facilityRoute(division, division.members[0], room.id, 0), []);
  assert.throws(() => applyCommand(s, { type: 'facility-start', roomId: room.id, purpose: 'break', title: 'Visit', agenda: 'Test', participantIds: s.agents.map(a => a.id) }), /infrastruktur/);
  assert.deepEqual(s, before);
});

test('desktop accessories fit the tabletop and leave separate working zones', () => {
  for (const manager of [false, true]) {
    const items = workstationItems(manager), width = manager ? 3.2 : 2.15, depth = manager ? 1.3 : 1.05;
    for (const item of items) {
      assert.ok(Math.abs(item.x) + item.width / 2 < width / 2, `${item.kind} stays on desk`);
      assert.ok(Math.abs(item.z) + item.depth / 2 < depth / 2);
      for (const other of items.filter(i => i !== item)) assert.ok(Math.abs(item.x - other.x) >= (item.width + other.width) / 2 + .015 || Math.abs(item.z - other.z) >= (item.depth + other.depth) / 2 + .015, 'accessories have clearance');
    }
  }
});

test('facility sessions enforce seats, occupancy, manager and checkpoints atomically', () => {
  const before = run(setup(), 'start'), ids = before.agents.map(a => a.id);
  const command = { type: 'facility-start', roomId: 'meeting-main', purpose: 'briefing', title: 'Briefing episode', agenda: 'Periksa outline', participantIds: ids, briefId: before.briefs[0].id };
  assert.throws(() => applyCommand(before, command), /Checkpoint/);
  assert.equal(before.tasks[0].status, 'running'); assert.equal(before.facilitySessions, undefined);
  assert.throws(() => applyCommand(before, { ...command, participantIds: [ids[1]] }), /manager/);
  assert.throws(() => applyCommand(before, { ...command, participantIds: [ids[0], ids[0]] }), /berulang/);
  let s = applyCommand(before, { ...command, checkpoints: { [before.tasks[0].id]: 'Outline tersimpan sampai bagian 2' } });
  assert.equal(s.tasks[0].status, 'paused'); assert.match(s.tasks[0].reason, /bagian 2/);
  assert.equal(s.tasks[1].status, 'queued'); assert.equal(s.facilitySessions[0].status, 'active');
  assert.equal(agentActivity(s, s.agents[1]).kind, 'facility');
  assert.throws(() => run(s, 'start'), /sesi fasilitas/);
  assert.throws(() => applyCommand(s, { ...command, roomId: 'lounge', purpose: 'break' }), /sesi lain/);
  assert.throws(() => applyCommand(s, command), /sedang digunakan/);
  assert.throws(() => applyCommand(s, { type: 'facility-end', id: s.facilitySessions[0].id, notes: '' }), /wajib/);
  s = applyCommand(s, { type: 'facility-end', id: s.facilitySessions[0].id, notes: 'Perbaiki judul; lanjutkan tugas setelah kembali.' });
  assert.equal(s.tasks[0].status, 'paused'); assert.equal(s.facilitySessions[0].status, 'ended');
  assert.throws(() => applyCommand(s, { type: 'facility-end', id: s.facilitySessions[0].id, notes: 'Duplikat' }), /sudah/);
  assert.equal(run(s, 'start').tasks[0].status, 'running');
});

test('every leisure facility accepts real idle participants and rejects busy work', () => {
  for (const roomId of ['lounge', 'garden', 'sport']) {
    let s = setup(), command = { type: 'facility-start', roomId, purpose: 'break', title: 'Istirahat', agenda: 'Rehat tim', participantIds: s.agents.map(a => a.id) };
    assert.throws(() => applyCommand(run(s, 'start'), command), /sedang bekerja/);
    s = applyCommand(s, command); assert.equal(s.facilitySessions[0].roomId, roomId);
    assert.throws(() => applyCommand(setup(), { ...command, roomId: 'unknown' }), /tidak ditemukan/);
  }
  const s = applyCommand(initialState(), { type: 'division', name: 'Large', manager: 'M', workers: Array.from({ length: 8 }, (_, i) => ({ name: `A${i}`, role: 'Riset' })) });
  assert.throws(() => applyCommand(s, { type: 'facility-start', roomId: 'meeting-main', purpose: 'briefing', title: 'T', agenda: 'A', participantIds: s.agents.map(a => a.id) }), /1 sampai 8/);
});

test('facility routes connect assigned desks to distinct seats on walkable surfaces', () => {
  const s = applyCommand(initialState(), { type: 'division', name: 'Team', manager: 'M', workers: Array.from({ length: 7 }, (_, i) => ({ name: `A${i}`, role: 'Riset' })) });
  const room = divisionLayouts(s)[0], rooms = [room, ...facilityLayouts], paths = officeWalkways(rooms);
  for (const facility of facilityLayouts) {
    const seats = facilitySeats(facility.id); assert.equal(seats.length, facility.capacity);
    assert.equal(new Set(seats.map(p => `${p.x}/${p.z}`)).size, seats.length);
    for (const [i, member] of room.members.slice(0, facility.capacity).entries()) {
      const route = facilityRoute(room, member, facility.id, i), length = routeLength(route);
      assert.deepEqual(route[0], { x: room.x + member.x, z: room.z + member.z + .75 });
      assert.deepEqual(route.at(-1), { x: facility.x + seats[i].x, z: facility.z + seats[i].z });
      for (let d = 0; d < length; d += .15) {
        const p = sampleRoute(route, d);
        assert.ok([...rooms, ...paths].some(r => Math.abs(p.x - r.x) <= r.width / 2 + .01 && Math.abs(p.z - r.z) <= r.depth / 2 + .01), 'journey stays on a room or corridor');
        if (Math.abs(p.x - facility.x) < facility.width / 2 && Math.abs(p.z - facility.z) < facility.depth / 2 && facility.kind === 'meeting') assert.ok(Math.abs(p.x - facility.x) >= 1.6 || p.z > facility.z + 2, 'walk around conference table');
      }
    }
  }
});

test('visual activity follows actual task and manager-review state without inventing AI execution', () => {
  let s = setup(); const manager = s.agents[0], worker = s.agents[1];
  assert.equal(agentActivity(s, worker).text, 'Dalam antrean');
  s = run(s, 'start'); assert.deepEqual(agentActivity(s, worker), { kind: 'running', text: 'Bekerja · Manual', typing: true, canWalk: false });
  s = run(s, 'hold', { status: 'blocked', reason: 'Perlu data' }); assert.equal(agentActivity(s, worker).typing, false);
  s = run(s, 'start'); s = run(s, 'result', { content: 'Outline' });
  assert.equal(agentActivity(s, worker).typing, false); assert.equal(agentActivity(s, manager).typing, true);
  s = run(s, 'review', { accept: true, note: 'Sesuai' }); assert.equal(agentActivity(s, worker).text, 'Menunggu Founder');
  const empty = initialState(); empty.agents = [worker]; assert.equal(agentActivity(empty, worker).text, 'Santai · Simulasi');
});
test('rejection cancels all planned work', () => { let s = setup(false); s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id }); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'rejected', note: 'Belum cocok' }); assert.ok(s.tasks.every(t => t.status === 'cancelled')); assert.throws(() => run(s, 'start')); });
test('one executor cannot run two tasks simultaneously', () => { const s = run(setup(), 'start'); assert.throws(() => applyCommand(s, { type: 'start', id: s.tasks[1].id }), /tugas lain/); });
test('hold retains reason and resuming clears it', () => { let s = run(setup(), 'start'); s = run(s, 'hold', { status: 'blocked', reason: 'Perlu foto' }); assert.equal(s.tasks[0].reason, 'Perlu foto'); s = run(s, 'start'); assert.equal(s.tasks[0].reason, ''); });
test('full manual work review and approval cycle', () => { let s = run(setup(), 'start'); s = run(s, 'result', { content: 'Hasil nyata' }); s = run(s, 'review', { accept: true, note: 'Sesuai kriteria' }); assert.equal(s.tasks[0].status, 'approval'); const d = s.decisions[0]; assert.equal(d.version, 1); s = applyCommand(s, { type: 'decide', id: d.id, outcome: 'approved' }); assert.equal(s.tasks[0].status, 'done'); assert.throws(() => applyCommand(s, { type: 'decide', id: d.id, outcome: 'approved' }), /sudah dijawab/); });
test('old version cannot be approved after contents change', () => { let s = run(setup(), 'start'); s = run(s, 'result', { content: 'v1' }); s = run(s, 'review', { accept: true, note: 'Periksa' }); const d = s.decisions[0]; s.tasks[0].results.push({ version: 2, content: 'v2', createdAt: new Date().toISOString() }); assert.throws(() => applyCommand(s, { type: 'decide', id: d.id, outcome: 'approved' }), /Versi hasil/); });
test('revision preserves old result and requires a new decision', () => { let s = run(setup(), 'start'); s = run(s, 'result', { content: 'v1' }); s = run(s, 'review', { accept: true, note: 'Periksa' }); s = applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'revision', note: 'Tambahkan sumber' }); s = run(s, 'start'); s = run(s, 'result', { content: 'v2 dengan sumber' }); assert.equal(s.tasks[0].results.length, 2); assert.equal(s.tasks[0].results[0].content, 'v1'); assert.equal(s.tasks[0].status, 'review'); });
test('third failed manager review escalates instead of looping', () => { let s = setup(); for (let i = 0; i < 3; i++) { s = run(s, 'start'); s = run(s, 'result', { content: `Draft ${i}` }); s = run(s, 'review', { accept: false, note: 'Belum sesuai' }); } assert.equal(s.tasks[0].revisions, 2); assert.equal(s.decisions[0].type, 'guidance'); assert.equal(s.tasks[0].status, 'approval'); assert.throws(() => applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'approved' }), /Beri arahan/); });
test('rejection and revision need explicit explanation', () => { let s = setup(false); s = applyCommand(s, { type: 'submit-plan', id: s.briefs[0].id }); assert.throws(() => applyCommand(s, { type: 'decide', id: s.decisions[0].id, outcome: 'rejected' }), /Alasan/); });
test('invalid division and manager assignment are rejected', () => { const s = setup(); assert.throws(() => applyCommand(s, { type: 'brief', title: 'X', goal: 'Y', criteria: 'Z', divisionId: s.divisions[0].id, agentId: s.agents[0].id, tasks: ['Tugas'] }), /Pelaksana/); });
test('failed command does not mutate original state', () => { const s = setup(); const before = JSON.stringify(s); assert.throws(() => run(s, 'result', { content: 'bad' })); assert.equal(JSON.stringify(s), before); });
test('context states manual integration and preserves known brief', () => { const s = setup(); const context = contextFor(s, s.tasks[0].id); assert.match(context, /Produk pertama/); assert.match(context, /bukan bukti koneksi/); assert.match(context, /Belum diisi/); });
test('changing provider preserves results and pending decisions', () => { const s = setup(); const next = applyCommand(s, { type: 'provider', provider: 'Codex' }); assert.deepEqual(next.tasks, s.tasks); assert.deepEqual(next.decisions, s.decisions); assert.equal(next.provider, 'Codex'); });

test('Nate has a knowledge monitor and cannot pretend to work without Obsidian', () => {
  assert.equal(characterLook('Server & Obsidian', serverAgent, 3).theme, 'knowledge');
  assert.deepEqual(agentActivity(initialState(), serverAgent), { kind: 'offline', text: 'Menunggu Obsidian', typing: false, canWalk: true });
});

test('ambient visits pair only idle agents, avoid reserved facilities and do not create work', () => {
  const s = applyCommand(initialState(), { type: 'division', name: 'Studio', manager: 'M', workers: [{ name: 'A', role: 'Riset' }, { name: 'B', role: 'Naskah' }] });
  const before = structuredClone(s);
  const visit = socialVisit(s, 0); assert.equal(visit.roomId, 'lounge');
  assert.equal(new Set(visit.participantIds).size, 2); assert.deepEqual(visit.seatIndices, [0, 2]);
  assert.deepEqual(s, before);
  const occupied = applyCommand(s, { type: 'facility-start', roomId: 'lounge', purpose: 'break', title: 'Rehat', agenda: 'Test', participantIds: [s.agents[2].id] });
  assert.notEqual(socialVisit(occupied, 0).roomId, 'lounge');
  assert.deepEqual(socialVisit(run(setup(), 'start'), 0).participantIds, [serverAgent.id]);
  for (let cycle = 0; cycle < 3; cycle++) {
    const v = socialVisit(s, cycle), layouts = divisionLayouts(s);
    for (let i = 0; i < v.participantIds.length; i++) {
      if (v.participantIds[i] === serverAgent.id) continue;
      const room = layouts.find(r => r.members.some(a => a.id === v.participantIds[i]));
      assert.ok(facilityRoute(room, room.members.find(a => a.id === v.participantIds[i]), v.roomId, v.seatIndices[i]).length > 1);
    }
  }
});

test('waiting workflow can relax with Nate, but active runs and errors take priority', () => {
  const s = applyCommand(initialState(), { type: 'workflow-agent', name: 'Marketing', company: 'Laxholm Furniture', agent: 'Bu Yuli', role: 'Katalog', workflowId: 'wf1', workflowName: 'Product Database' });
  s.n8n = [{ workflowId: 'wf1', connection: 'online', checkedAt: new Date().toISOString(), active: true, running: [], waiting: [{ id: 'wait', status: 'waiting' }], recent: [], partial: false, error: '' }];
  const before = structuredClone(s);
  assert.deepEqual(socialVisit(s, 0).participantIds, [s.agents[0].id, serverAgent.id]);
  assert.deepEqual(s, before);
  s.n8n[0].running = [{ id: 'run', status: 'running' }];
  assert.deepEqual(socialVisit(s, 0).participantIds, [serverAgent.id]);
  s.n8n[0].running = [];
  const failed = applyCommand(s, { type: 'agent-error', agentId: s.agents[0].id, reason: 'Node gagal' });
  assert.deepEqual(socialVisit(failed, 0).participantIds, [serverAgent.id]);
  assert.equal(agentActivity(failed, failed.agents[0]).kind, 'error');
});

test('idle agents leave independently without waiting for other visits to finish', () => {
  const s = applyCommand(initialState(), { type: 'division', name: 'Studio', manager: 'M', workers: [{ name: 'A', role: 'Riset' }, { name: 'B', role: 'Naskah' }] });
  const visits = [...s.agents.slice(0, 2).map(a => ({ agentId: a.id, roomId: 'garden' })), { agentId: serverAgent.id, roomId: 'lounge' }];
  const before = structuredClone(s), visit = socialVisit(s, 0, visits);
  assert.equal(visit.roomId, 'sport'); assert.deepEqual(visit.participantIds, [s.agents[2].id]);
  assert.deepEqual(s, before);
  assert.equal(socialVisit(s, 0, [...visits, { agentId: s.agents[2].id, roomId: 'sport' }]), null);
});

test('basketball practice dribbles, crosses the hoop and hands the ball to the next player continuously', () => {
  const players = facilitySeats('sport').slice(0, 2);
  assert.equal(courtPlay(0, []), null);
  assert.equal(courtPlay(.25, players).action, 'dribble');
  assert.ok(courtPlay(.25, players).y > courtPlay(0, players).y);
  assert.equal(courtPlay(2.1, players).action, 'shoot');
  assert.deepEqual([courtPlay(3.8, players).x, courtPlay(3.8, players).z], [-1.3, -4.35]);
  assert.ok(Math.abs(courtPlay(3.8, players).y - 2.55) < 1e-8);
  assert.equal(courtPlay(6, players).playerIndex, 1);
  assert.equal(courtPlay(12, players).playerIndex, 0);
  for (const time of [2, 2.6, 3.8, 4.3, 6, 12]) {
    const a = courtPlay(time - 1e-6, players), b = courtPlay(time, players);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < .0001);
  }
  for (let time = 0; time < 12; time += .05) { const point = courtPlay(time, players); assert.ok(point.y >= .53 - 1e-8); }
  const character = createCharacter(characterLook('Test', { name: 'A', role: 'Riset', manager: false }), color => new THREE.MeshBasicMaterial({ color }));
  const arm = character.root.children.find(c => c.type === 'Group' && c.position.y === 1.5);
  character.animate(0, 0, false, 1, true, false, true, false, 0, 2);
  assert.equal(arm.rotation.x, -2.3);
  character.animate(0, 0, false, 1, true, false, true);
  assert.equal(arm.rotation.x, 0);
});

test('travel accelerates, brakes and reverses continuously before reaching the desk', () => {
  let motion = { distance: 0, speed: 0 };
  motion = advanceTravel(motion.distance, motion.speed, 8, false, .016);
  assert.ok(motion.speed > 0 && motion.speed < .1);
  for (let i = 0; i < 4000 && motion.distance < 8; i++) {
    const before = motion.distance; motion = advanceTravel(motion.distance, motion.speed, 8, false, .016);
    assert.ok(motion.distance >= before && motion.distance - before <= 1.55 * .016 + 1e-8);
  }
  assert.equal(motion.distance, 8);
  const first = advanceTravel(4, 1.2, 8, true, .016); assert.ok(first.distance > 4 && first.distance < 4.03);
  motion = { distance: 8, speed: 0 };
  for (let i = 0; i < 4000 && motion.distance > 0; i++) motion = advanceTravel(motion.distance, motion.speed, 8, true, .016);
  assert.equal(motion.distance, 0);
  assert.deepEqual(advanceTravel(3, 1, 8, false, 0), { distance: 3, speed: 1 });
});

test('building edits preserve identities and results, rejecting cross-team edits atomically', () => {
  const s = run(setup(), 'start'), worker = s.agents[1];
  const command = { type: 'division-edit', id: s.divisions[0].id, name: 'Produk baru', manager: 'Arden', workers: [{ id: worker.id, name: 'Sora', role: 'Engineer' }] };
  const edited = applyCommand(s, command);
  assert.deepEqual(edited.agents.map(a => a.id), s.agents.map(a => a.id));
  assert.deepEqual(edited.tasks, s.tasks); assert.deepEqual(edited.decisions, s.decisions);
  assert.equal(edited.agents[1].name, 'Sora');
  const other = applyCommand(s, { type: 'division', name: 'Lain', manager: 'N', worker: 'Z', role: 'Riset' });
  assert.throws(() => applyCommand(other, { ...command, workers: [{ id: other.agents[3].id, name: 'Sora', role: 'Engineer' }] }), /divisi yang dipilih/);
  assert.throws(() => applyCommand(s, { ...command, manager: 'Sora' }), /berbeda/);
  assert.equal(s.agents[1].name, 'Bayu');
});

test('building adds specialists atomically, preserving work and rejecting duplicate, malformed or oversized teams', () => {
  const s = run(run(setup(), 'start'), 'result', { content: 'Hasil lama tetap tersedia.' }), before = structuredClone(s);
  const command = { type: 'division-edit', id: s.divisions[0].id, name: s.divisions[0].name, manager: s.agents[0].name, workers: [], addWorkers: [{ name: 'Nara', role: 'Naskah' }, { name: 'Echo', role: 'Audio' }] };
  const edited = applyCommand(s, command);
  assert.deepEqual(edited.agents.slice(0, s.agents.length), s.agents);
  for (const key of ['divisions', 'tasks', 'briefs', 'decisions', 'business', 'provider']) assert.deepEqual(edited[key], s[key]);
  assert.equal(edited.revision, s.revision + 1);
  assert.equal(new Set(edited.agents.map(a => a.id)).size, 4);
  assert.ok(edited.agents.slice(2).every(a => !a.manager && a.divisionId === s.divisions[0].id));
  assert.equal(divisionLayouts(edited)[0].members.length, 4);
  for (const addWorkers of [[], null, {}, [null], [[]], [{ name: ' NARA ', role: 'Audio' }, { name: 'Nara', role: 'Riset' }], [{ name: s.agents[0].name, role: 'Audio' }], [{ name: 'Baru', role: '' }], [{ name: 'Baru', role: 'X'.repeat(151) }]]) {
    assert.throws(() => applyCommand(s, { ...command, addWorkers }));
    assert.deepEqual(s, before, 'rejected edits must leave the original untouched');
  }
  const eleven = Array.from({ length: 11 }, (_, i) => ({ name: `Agent ${i}`, role: 'Produksi' }));
  const full = applyCommand(s, { ...command, addWorkers: eleven });
  assert.equal(full.agents.filter(a => !a.manager).length, 12);
  assert.throws(() => applyCommand(full, { ...command, addWorkers: [{ name: 'Overflow', role: 'Audio' }] }), /maksimal/);
  const workflow = applyCommand(s, { type: 'workflow-agent', name: 'Marketing', company: 'Laxholm', agent: 'Yuli', role: 'Monitor', workflowId: 'wf', workflowName: 'Katalog' });
  assert.throws(() => applyCommand(workflow, { ...command, id: workflow.divisions[1].id }), /workflow/);
});

test('medical replaces the second meeting and records error, pause and explicit recovery atomically', () => {
  assert.equal(facilityLayouts.filter(r => r.kind === 'meeting').length, 1);
  assert.equal(facilityLayouts.find(r => r.id === 'meeting-alt').kind, 'medical');
  let s = run(setup(), 'start'), worker = s.agents[1], before = structuredClone(s);
  assert.throws(() => applyCommand(s, { type: 'agent-error', agentId: worker.id, reason: '' }), /wajib/);
  assert.deepEqual(s, before);
  s = applyCommand(s, { type: 'agent-error', agentId: worker.id, reason: 'Runtime terputus' });
  assert.equal(s.tasks[0].status, 'paused'); assert.equal(s.tasks[0].results.length, 0);
  assert.equal(agentActivity(s, worker).kind, 'error'); assert.equal(medicalPatients(s)[0].bedIndex, 0);
  assert.throws(() => run(s, 'start'), /sedang error/);
  assert.throws(() => applyCommand(s, { type: 'agent-error', agentId: worker.id, reason: 'Duplikat' }), /error aktif/);
  assert.throws(() => applyCommand(s, { type: 'facility-start', roomId: 'meeting-alt', purpose: 'break', title: 'X', agenda: 'Y', participantIds: [worker.id] }), /infrastruktur/);
  assert.throws(() => applyCommand(s, { type: 'agent-recover', id: s.incidents[0].id, resolution: '' }), /wajib/);
  s = applyCommand(s, { type: 'agent-recover', id: s.incidents[0].id, resolution: 'Koneksi diperbaiki' });
  assert.equal(medicalPatients(s).length, 0); assert.equal(s.tasks[0].status, 'paused'); assert.ok(s.incidents[0].resolvedAt);
  assert.equal(run(s, 'start').tasks[0].status, 'running');
});

test('medical beds are stable, queued errors get released beds and Nate can recover', () => {
  let s = applyCommand(initialState(), { type: 'division', name: 'Clinic', manager: 'M', workers: Array.from({ length: 4 }, (_, i) => ({ name: `A${i}`, role: 'Riset' })) });
  for (const a of s.agents) s = applyCommand(s, { type: 'agent-error', agentId: a.id, reason: 'Koneksi gagal' });
  s = applyCommand(s, { type: 'agent-error', agentId: serverAgent.id, reason: 'Layanan tidak tersedia' });
  assert.deepEqual(medicalPatients(s).map(p => p.bedIndex), [0, 1, 2, 3, -1, -1]);
  s = applyCommand(s, { type: 'agent-recover', id: s.incidents[1].id, resolution: 'Sudah diperiksa' });
  assert.deepEqual(medicalPatients(s).map(p => p.bedIndex), [0, 2, 3, 1, -1]);
  s = applyCommand(s, { type: 'agent-recover', id: s.incidents[0].id, resolution: 'Sudah diperiksa' });
  assert.equal(medicalPatients(s).find(p => p.agent.id === 'nate').bedIndex, 0);
  assert.equal(new Set(medicalPatients(s).map(p => p.bedIndex)).size, 4);
});

test('error closes an active meeting without losing notes or resuming work', () => {
  let s = setup(); s = applyCommand(s, { type: 'facility-start', roomId: 'meeting-main', purpose: 'review', title: 'Review', agenda: 'Periksa', participantIds: s.agents.map(a => a.id) });
  s = applyCommand(s, { type: 'agent-error', agentId: s.agents[1].id, reason: 'Runtime gagal' });
  assert.equal(s.facilitySessions[0].status, 'ended'); assert.match(s.facilitySessions[0].notes, /Runtime gagal/);
  assert.ok(s.tasks.every(t => t.status === 'queued'));
});

test('navigation detours around furniture, respects walls and floor edges and fails closed', () => {
  const floor = [{ x: 0, z: 0, width: 12, depth: 10 }], desk = { x: 0, z: 0, width: 3, depth: 3 };
  const nav = createNavigation(floor, [desk]);
  const route = nav.route({ x: -4, z: 0 }, { x: 4, z: 0 });
  assert.ok(route.length > 2); assert.ok(route.slice(1).every((p, i) => nav.clearSegment(route[i], p)));
  assert.equal(nav.walkable({ x: 0, z: 0 }), false); assert.equal(nav.walkable({ x: 5.8, z: 0 }), false);
  assert.deepEqual(nav.route({ x: 0, z: 0 }, { x: 4, z: 0 }), []);
  const wall = createNavigation(floor, [{ x: 0, z: 0, width: .1, depth: 10 }]);
  assert.deepEqual(wall.route({ x: -4, z: 0 }, { x: 4, z: 0 }), []);
  const doorway = createNavigation(floor, [{ x: 0, z: -3.2, width: .1, depth: 3.6 }, { x: 0, z: 3.2, width: .1, depth: 3.6 }]);
  assert.ok(doorway.route({ x: -4, z: -3 }, { x: 4, z: -3 }).length > 2);
});

test('leisure seats carry surface heights and the idle rig rests its arms instead of typing', () => {
  assert.equal(facilitySeats('lounge')[0].height, .97); assert.equal(facilitySeats('garden')[0].height, .86);
  assert.ok(facilitySeats('meeting-alt').every(s => s.lying && !s.seated));
  const character = createCharacter(characterLook('Test', { name: 'A', role: 'Riset', manager: false }), color => new THREE.MeshBasicMaterial({ color }));
  const arm = character.root.children.find(c => c.type === 'Group' && c.position.y === 1.5);
  character.animate(0, 0, false, 1, true); assert.equal(arm.rotation.x, -.15);
  character.animate(0, 0, true, 1, true); assert.equal(arm.rotation.x, -1.35);
  character.animate(0, 0, false, 1, true, false, true, true); assert.equal(arm.rotation.x, 0);
});

test('robot helmet fits travel clearance and seated body retains furniture contact', () => {
  const model = createCharacter(characterLook('Founder', { name: 'Kael', role: 'Founder', manager: false }), color => new THREE.MeshBasicMaterial({ color }));
  const head = model.root.children.find(c => c.type === 'Group' && c.position.y === 1.96);
  const bounds = new THREE.Box3().setFromObject(head);
  assert.ok(bounds.max.x <= .501 && bounds.min.x >= -.501, 'scaled helmet/ear pods fit the 0.4 navigation radius');
  model.animate(0, 0, false, 1, true);
  const bodyBounds = new THREE.Box3().setFromObject(model.root.children[0]);
  assert.ok(Math.abs(bodyBounds.min.y - .64) < .001, 'same seat contact as existing rig');
  const eyes = head.children.filter(c => c.type === 'Group');
  assert.equal(eyes[0].visible, true); assert.equal(eyes[1].visible, false);
  model.animate(0, 0, true, 1, true);
  assert.equal(eyes[0].visible, false); assert.equal(eyes[1].visible, true);
});

test('atelier materials are repeatable, opaque and distinct without external assets', () => {
  const signatures = [];
  for (const kind of ['stone', 'wood', 'linen', 'plaster', 'metal']) {
    const texture = surfaceTexture(kind), again = surfaceTexture(kind);
    assert.equal(texture.image.width, 256); assert.equal(texture.image.height, 256);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace); assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.deepEqual(texture.image.data, again.image.data);
    const shades = new Set();
    for (let i = 0; i < texture.image.data.length; i += 4) {
      assert.equal(texture.image.data[i + 3], 255);
      assert.ok(texture.image.data[i] >= 200);
      shades.add(texture.image.data[i]);
    }
    assert.ok(shades.size > 4); signatures.push([...texture.image.data.slice(0, 128)]);
    texture.dispose(); again.dispose();
  }
  assert.notDeepEqual(signatures[0], signatures[1]); assert.notDeepEqual(signatures[1], signatures[2]);
});

test('floor UVs align between room and corridor, retain metre scale and face upwards', () => {
  const areas = [{ x: 0, z: 0, width: 6, depth: 4 }];
  const local = createFloorGeometry(areas, { x: 8, z: 12 });
  const world = createFloorGeometry([{ ...areas[0], x: 8, z: 12 }]);
  assert.deepEqual(local.attributes.uv.array, world.attributes.uv.array);
  const position = local.attributes.position, uv = local.attributes.uv, normal = local.attributes.normal;
  for (let i = 0; i < position.count; i++) {
    assert.ok(Math.abs(uv.getX(i) - (position.getX(i) + 8) / 1.2) < 1e-6);
    assert.ok(Math.abs(uv.getY(i) - (position.getZ(i) + 12) / 1.2) < 1e-6);
    assert.equal(normal.getY(i), 1);
  }
  const material = createSurfaceMaterials(), tile = material('#f3efe0', 'tile'), asphalt = material('#5e646e', 'asphalt');
  assert.equal(tile.map.repeat.x, 1); assert.ok(tile.roughness < asphalt.roughness);
  assert.notDeepEqual(tile.map.image.data, asphalt.map.image.data);
  local.dispose(); world.dispose();
});

test('surface palette separates matte walls, woven upholstery, wood, stone and brushed metal with linear relief', () => {
  const mat = createSurfaceMaterials(), stone = mat('#e8dfd0'), wood = mat('#b68a5d'), fabric = mat('#faf9f5'), wall = mat('#ede6dc'), metal = mat('#242a28');
  assert.equal(mat('#b68a5d'), wood);
  assert.ok(stone.roughness < wood.roughness && wood.roughness < wall.roughness);
  assert.equal(metal.metalness, .65); assert.equal(wood.metalness, 0);
  assert.notEqual(mat('#faf9f5', 'metal'), fabric); assert.equal(mat('#faf9f5', 'metal').metalness, .65);
  assert.equal(mat('#617c70').map, null); assert.equal(mat('#252622').bumpMap, null);
  for (const material of [stone, wood, fabric, wall, metal]) {
    assert.equal(material.map.colorSpace, THREE.SRGBColorSpace); assert.equal(material.bumpMap.colorSpace, THREE.NoColorSpace);
    assert.equal(material.bumpMap, material.roughnessMap); assert.notEqual(material.map, material.bumpMap);
    assert.ok(material.bumpScale > 0 && material.bumpScale <= .03);
    assert.deepEqual(material.map.repeat, material.bumpMap.repeat);
    assert.ok(material.map.anisotropy <= 4);
  }
});

test('palette preserves finishes and night ground cannot recolour ivory walls, seats or floors', () => {
  const mat = createOfficeMaterials();
  const ground = mat('#e8e1d7'), wall = mat('#ede6dc'), floor = mat('#e8dfd0'), seat = mat('#faf9f5');
  assert.equal(ground, mat('#e8e1d7'));
  assert.notEqual(ground, wall); assert.notEqual(wall, floor); assert.notEqual(floor, seat);
  assert.ok(wall.roughness > floor.roughness);
  assert.notEqual(wall.map, floor.map); assert.notEqual(seat.map, floor.map);
  ground.color.set('#1e122a');
  for (const material of [wall, floor, seat]) assert.equal(material.color.getHexString(), 'f3efe0');
  const rug = mat('#d9cebd', 'linen');
  assert.notEqual(rug, mat('#d9cebd')); assert.equal(rug.map, seat.map);
  assert.equal(mat('#66503d').map, mat('#926b47').map);
  assert.equal(mat('#ab9b85').map, mat('#926b47').map);
  assert.equal(mat('#e3ddcc').map, floor.map);
  const shell = createSurfaceMaterials()('#f3efe0', 'shell');
  assert.equal(shell.map, null); assert.equal(shell.bumpMap, null); assert.ok(shell.roughness < seat.roughness);
});

test('decorative hardware LEDs pulse smoothly with staggered phases and remain steady for reduced motion', () => {
  let varied = false;
  for (let index = 0; index < 22; index++) for (let frame = 0; frame < 600; frame++) {
    const time = frame / 60, value = serverIndicatorIntensity(time, index);
    assert.ok(value >= .45 && value <= 1.3);
    assert.ok(Math.abs(value - serverIndicatorIntensity(time + .001, index)) < .01);
    assert.equal(serverIndicatorIntensity(time, index, true), .65);
    varied ||= Math.abs(value - serverIndicatorIntensity(time, index + 1)) > .3;
  }
  assert.ok(varied);
});

test('atelier core text and control tokens retain readable contrast', () => {
  const css = ['style', 'redesign'].map(name => readFileSync(new URL(`../src/${name}.css`, import.meta.url), 'utf8')).join('\n');
  const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})\b/gi)].map(m => [m[1], m[2]]));
  const luminance = hex => {
    const values = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
  };
  for (const [ink, paper] of [['--green', '--surface'], ['--green', '--surface-soft'], ['--muted', '--surface-soft'], ['--ink-secondary', '--surface-soft']]) {
    const a = luminance(tokens[ink]), b = luminance(tokens[paper]);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${ink} on ${paper}`);
  }
  assert.ok(!/--([\w-]+):var\(--\1\)/.test(css), 'tokens must not reference themselves');
});

