import type { State } from './domain';
import { facilityLayouts, facilitySeats } from './facilities.ts';

export { facilityLayouts } from './facilities.ts';

const corridorWidth = 2.4, spineX = 6.4;
export const founderFloor = { x: 0, z: -.3, width: 10.4, depth: 8.6 };

type FloorArea = { x: number; z: number; width: number; depth: number };

function siteDimensions(rooms: readonly FloorArea[]) {
  const teamFront = Math.max(0, ...rooms.filter(r => r.x > 7).map(r => r.z + r.depth / 2));
  const front = Math.max(29.05, teamFront + 7.2);
  const left = -18.2, right = Math.max(21.6, ...rooms.map(r => r.x + r.width / 2)), back = -6.35;
  const entrance = { x: 0, z: front, width: 3.2 };
  const approach = { x: entrance.x, z: front + 1, width: entrance.width, depth: 2.2 };
  const gardenDoor = { x: spineX, z: back, width: 2.4 };
  return {
    left, right, back, front,
    floor: { x: (left + right) / 2, z: (back + front) / 2, width: right - left, depth: front - back },
    lobby: { x: 14.6, z: front - 3.6, width: 14, depth: 4.8 },
    entrance, gardenDoor, approach,
    parking: { x: (left + right) / 2, z: front + 7.2, width: right - left, depth: 10.4 },
  };
}

export function officeSite(rooms: readonly FloorArea[]) {
  const dimensions = siteDimensions(rooms), { back, front } = dimensions;
  const indoor = rooms.filter(r => r.z + r.depth / 2 > back);
  const corridors = officeWalkways(rooms).flatMap(p => {
    const a = Math.max(back, p.z - p.depth / 2), b = Math.min(front, p.z + p.depth / 2);
    return b > a ? [{ ...p, z: (a + b) / 2, depth: b - a }] : [];
  });
  // The envelope follows occupied wings; the central circulation stays continuous without holes.
  const floors = [founderFloor, ...indoor, ...corridors, { x: 0, z: (back + front) / 2, width: 10.4, depth: front - back }];
  const tiles = walkwayTiles(floors);
  const edgeGroups = new Map<string, { horizontal: boolean; fixed: number; spans: number[][] }>();
  const rounded = (v: number) => Math.round(v * 1e6) / 1e6;
  for (const tile of tiles) for (const [dx, dz] of tile.edges) {
    const horizontal = !!dz, fixed = rounded(horizontal ? tile.z + dz * tile.depth / 2 : tile.x + dx * tile.width / 2);
    const centre = horizontal ? tile.x : tile.z, size = horizontal ? tile.width : tile.depth;
    const key = `${horizontal}/${fixed}`;
    if (!edgeGroups.has(key)) edgeGroups.set(key, { horizontal, fixed, spans: [] });
    edgeGroups.get(key)!.spans.push([rounded(centre - size / 2), rounded(centre + size / 2)]);
  }
  const walls: FloorArea[] = [];
  for (const edge of edgeGroups.values()) {
    const spans: number[][] = [];
    for (const span of edge.spans.sort((a, b) => a[0] - b[0])) {
      const last = spans.at(-1);
      if (last && Math.abs(last[1] - span[0]) < .00001) last[1] = span[1]; else spans.push([...span]);
    }
    for (const [a, b] of spans) {
      const door = edge.horizontal && [dimensions.entrance, dimensions.gardenDoor].find(d => Math.abs(d.z - edge.fixed) < .00001 && d.x - d.width / 2 >= a - .00001 && d.x + d.width / 2 <= b + .00001);
      const pieces = door ? [[a, door.x - door.width / 2], [door.x + door.width / 2, b]] : [[a, b]];
      for (const [start, end] of pieces) if (end - start > .001) walls.push(edge.horizontal
        ? { x: (start + end) / 2, z: edge.fixed, width: end - start, depth: .14 }
        : { x: edge.fixed, z: (start + end) / 2, width: .14, depth: end - start });
    }
  }
  const publicTiles = tiles.filter(tile => ![founderFloor, ...indoor].some(r => Math.abs(tile.x - r.x) < r.width / 2 && Math.abs(tile.z - r.z) < r.depth / 2));
  return { ...dimensions, floors, tiles, publicTiles, walls };
}

export function workstationItems(manager: boolean) {
  return [
    { kind: 'monitor-base', x: 0, z: -.28, width: .48, depth: .23 },
    { kind: 'keyboard', x: 0, z: .25, width: .65, depth: .20 },
    { kind: 'mouse', x: .53, z: .25, width: .11, depth: .17 },
    { kind: 'cup', x: manager ? -1.23 : -.86, z: .22, width: .3, depth: .24 },
    { kind: 'notebook', x: manager ? 1.2 : .86, z: -.12, width: .32, depth: .4 },
    ...(manager ? [{ kind: 'lamp', x: -1.23, z: -.4, width: .24, depth: .20 }] : []),
  ];
}

// Teams extend one wing; adding a division preserves existing desks and room positions.
export function divisionLayouts(state: Pick<State, 'divisions' | 'agents'>) {
  let nextBack = -5.15;
  return state.divisions.map(division => {
    const agents = state.agents.filter(a => a.divisionId === division.id);
    const workers = agents.filter(a => !a.manager);
    const width = workers.length <= 2 ? 10.8 : 14;
    const depth = (workers.length <= 2 ? 9.6 : 12) + Math.max(0, Math.ceil(workers.length / 4) - 1) * 3.4;
    const front = depth / 2, back = -depth / 2;
    const z = nextBack + depth / 2;
    nextBack += depth + corridorWidth;
    return {
    id: division.id, name: division.name,
    x: spineX + corridorWidth / 2 + width / 2, z,
    width, depth,
    entrance: { x: 0, z: front },
    rugs: [
      ...(agents.some(a => a.manager) ? [{ x: -width / 2 + 2.6, z: back + 2.1, width: 3.9, depth: 3.0 }] : []),
      { x: -width / 2 + 2.4, z: front - 1.55, width: 3.9, depth: 2.65 },
    ],
    furniture: [
      { kind: 'sofa', x: -width / 2 + 2.4, z: front - .8, width: 3.2, depth: 1.1 },
      { kind: 'coffee-table', x: -width / 2 + 2.4, z: front - 2.1, width: .9, depth: .9 },
      { kind: 'cabinet', x: width / 2 - 1.65, z: front - .55, width: 2.5, depth: .7 },
      { kind: 'bookshelf', x: width / 2 - 1.1, z: back + .5, width: 1.6, depth: .65 },
      { kind: 'huddle', x: width / 2 - 2.5, z: back + 2.4, width: 2.6, depth: 2.6 },
      { kind: 'plant', x: -width / 2 + .6, z: front - 2.5, width: .9, depth: .9 },
      { kind: 'plant', x: width / 2 - .6, z: front - 1.7, width: .9, depth: .9 },
    ],
    members: agents.map(agent => {
      const i = workers.findIndex(a => a.id === agent.id);
      const singleWorkflow = !division.managerId && agents.length === 1;
      return { ...agent, ordinal: agent.manager ? -1 : i, x: agent.manager || singleWorkflow ? -width / 2 + 2.6 : workers.length <= 2 ? [-2.8, 1.6][i] : [-4.8, -1.8, 1.8, 4.8][i % 4], z: back + (agent.manager || singleWorkflow ? 1.75 : (workers.length <= 2 ? 5.15 : 5.8) + Math.floor(i / 4) * 3.4) };
    }),
  }; });
}

export type WalkPoint = { x: number; z: number };
export function facilityRoute(room: ReturnType<typeof divisionLayouts>[number], member: ReturnType<typeof divisionLayouts>[number]['members'][number], roomId: string, seatIndex: number): WalkPoint[] {
  const target = facilityLayouts.find(r => r.id === roomId), seat = facilitySeats(roomId)[seatIndex];
  if (!target || !seat) return [];
  const start = strollRoute(room, member).slice(0, -1).map(p => ({ x: p.x + room.x, z: p.z + room.z }));
  const sourceFront = room.z + room.depth / 2 + corridorWidth / 2, targetFront = target.z + target.depth / 2 + corridorWidth / 2;
  const points = [...start, { x: spineX, z: sourceFront }];
  const targetSpine = target.kind === 'garden' || target.kind === 'sport' ? spineX : target.x < -5 ? -6.3 : spineX;
  if (targetSpine < 0) points.push({ x: spineX, z: 5.05 }, { x: targetSpine, z: 5.05 });
  points.push({ x: targetSpine, z: targetFront });
  points.push({ x: target.x, z: targetFront }, { x: target.x, z: target.z + target.depth / 2 - .9 });
  const side = seat.x < 0 ? -1 : 1;
  if (target.kind === 'meeting') points.push({ x: target.x + side * 3.35, z: target.z + target.depth / 2 - .9 }, { x: target.x + side * 3.35, z: target.z + seat.z + .65 });
  else points.push({ x: target.x + seat.x, z: target.z + target.depth / 2 - .9 });
  points.push({ x: target.x + seat.x, z: target.z + seat.z });
  return smoothRoute(points.filter((p, i, all) => !i || Math.hypot(p.x - all[i - 1].x, p.z - all[i - 1].z) > .001));
}
export function officeWalkways(rooms: readonly { x: number; z: number; width: number; depth: number }[]) {
  if (!rooms.length) return [];
  const site = siteDimensions(rooms), start = site.back, end = site.front;
  return [
    { x: .55, z: 4.5, width: 1.8, depth: 3.5 },
    { x: 0, z: 5.05, width: 15.2, depth: corridorWidth },
    ...[-6.3, spineX].map(x => ({ x, z: (start + end) / 2, width: x < 0 ? 2.2 : corridorWidth, depth: end - start })),
    { x: spineX, z: -7.1, width: corridorWidth, depth: 2.1 },
    { x: 0, z: -7.85, width: 34, depth: corridorWidth },
    { x: site.floor.x, z: site.front - 1.2, width: site.floor.width, depth: corridorWidth },
    site.lobby,
    site.approach,
    ...rooms.filter(r => Math.abs(r.x) < 5 && r.z > site.back).flatMap(r => [
      { x: (-7.4 + r.x - r.width / 2) / 2, z: r.z, width: r.x - r.width / 2 + 7.4, depth: r.depth },
      { x: (7.6 + r.x + r.width / 2) / 2, z: r.z, width: 7.6 - r.x - r.width / 2, depth: r.depth },
    ]),
    ...rooms.map(r => {
      const left = Math.min(r.x - r.width / 2, r.x < -5 ? -7.4 : 5.2);
      const right = Math.max(r.x + r.width / 2, r.x < -5 ? -5.2 : 7.6);
      return { x: (right + left) / 2, z: r.z + r.depth / 2 + corridorWidth / 2, width: right - left, depth: corridorWidth };
    }),
  ];
}

export function walkwayTiles(paths: ReturnType<typeof officeWalkways>) {
  if (!paths.length) return [];
  // Split at path boundaries as well as grout lines so edge tiles cannot leave gaps or overhang rooms.
  const axis = (key: 'x' | 'z', size: 'width' | 'depth') => {
    const values = paths.flatMap(p => [p[key] - p[size] / 2, p[key] + p[size] / 2]);
    const min = Math.min(...values), max = Math.max(...values);
    for (let v = Math.ceil(min / 1.2) * 1.2; v < max; v += 1.2) values.push(v);
    return [...new Set(values.map(v => Math.round(v * 1e6) / 1e6))].sort((a, b) => a - b);
  };
  const xs = axis('x', 'width'), zs = axis('z', 'depth');
  const tiles = new Map<string, { x: number; z: number; width: number; depth: number; ix: number; iz: number; edges: number[][] }>();
  for (let ix = 0; ix < xs.length - 1; ix++) for (let iz = 0; iz < zs.length - 1; iz++) {
    const x = (xs[ix] + xs[ix + 1]) / 2, z = (zs[iz] + zs[iz + 1]) / 2;
    if (paths.some(p => Math.abs(x - p.x) < p.width / 2 && Math.abs(z - p.z) < p.depth / 2)) {
      tiles.set(`${ix},${iz}`, { x, z, width: xs[ix + 1] - xs[ix], depth: zs[iz + 1] - zs[iz], ix, iz, edges: [] });
    }
  }
  for (const tile of tiles.values()) tile.edges = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => !tiles.has(`${tile.ix + dx},${tile.iz + dz}`));
  return [...tiles.values()];
}

// shortcut: fixed aisle routes support local strolling; use a navmesh for arbitrary destinations or editable furniture.
export function strollRoute(room: ReturnType<typeof divisionLayouts>[number], member: ReturnType<typeof divisionLayouts>[number]['members'][number]): WalkPoint[] {
  return [
    { x: member.x, z: member.z + .75 },
    { x: member.x + .75, z: member.z + .9 },
    { x: member.x + .75, z: member.z + 1.65 },
    { x: 0, z: member.z + 1.65 },
    { x: 0, z: room.depth / 2 + corridorWidth / 2 },
    { x: -3, z: room.depth / 2 + corridorWidth / 2 },
  ];
}
export function routeLength(points: WalkPoint[]) {
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.z - points[i].z), 0);
}
export function smoothRoute(points: WalkPoint[]) {
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], p = points[i], b = points[i + 1];
    const incoming = Math.hypot(p.x - a.x, p.z - a.z), outgoing = Math.hypot(b.x - p.x, b.z - p.z);
    const r = Math.min(.2, incoming / 3, outgoing / 3);
    if (!r) { result.push(p); continue; }
    const entry = { x: p.x + (a.x - p.x) * r / incoming, z: p.z + (a.z - p.z) * r / incoming };
    const exit = { x: p.x + (b.x - p.x) * r / outgoing, z: p.z + (b.z - p.z) * r / outgoing };
    result.push(entry);
    for (let j = 1; j <= 8; j++) {
      const t = j / 8, u = 1 - t;
      result.push({ x: u * u * entry.x + 2 * u * t * p.x + t * t * exit.x, z: u * u * entry.z + 2 * u * t * p.z + t * t * exit.z });
    }
  }
  result.push(points[points.length - 1]); return result;
}
export function sampleRoute(points: WalkPoint[], distance: number) {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= length || i === points.length - 1) {
      const t = Math.min(1, remaining / (length || 1));
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    remaining -= length;
  }
  return { ...points[0], heading: Math.PI };
}
