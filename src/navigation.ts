import type { WalkPoint } from './layout';

export type Footprint = { x: number; z: number; width: number; depth: number };

// Body clearance uses the rendered furniture bounds; unreachable goals stay unreachable.
export function createNavigation(areas: readonly Footprint[], obstacles: readonly Footprint[], radius = .4) {
  const step = .3, minX = Math.min(...areas.map(a => a.x - a.width / 2)), minZ = Math.min(...areas.map(a => a.z - a.depth / 2));
  const nx = Math.ceil((Math.max(...areas.map(a => a.x + a.width / 2)) - minX) / step) + 1;
  const nz = Math.ceil((Math.max(...areas.map(a => a.z + a.depth / 2)) - minZ) / step) + 1;
  const inside = (p: WalkPoint, r: Footprint, margin = 0) => Math.abs(p.x - r.x) < r.width / 2 + margin && Math.abs(p.z - r.z) < r.depth / 2 + margin;
  const onFloor = (p: WalkPoint) => areas.some(a => inside(p, a, .001));
  const walkable = (p: WalkPoint) => [[radius, 0], [-radius, 0], [0, radius], [0, -radius]].every(([x, z]) => onFloor({ x: p.x + x, z: p.z + z })) && !obstacles.some(o => inside(p, o, radius));
  const clearSegment = (a: WalkPoint, b: WalkPoint) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .1));
    for (let i = 0; i <= count; i++) if (!walkable({ x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count })) return false;
    return true;
  };
  const point = (id: number) => ({ x: minX + id % nx * step, z: minZ + Math.floor(id / nx) * step });
  const free = new Uint8Array(nx * nz);
  for (let i = 0; i < free.length; i++) free[i] = Number(walkable(point(i)));
  function nearest(p: WalkPoint) {
    const ix = Math.round((p.x - minX) / step), iz = Math.round((p.z - minZ) / step);
    let best = -1, distance = Infinity;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const x = ix + dx, z = iz + dz, id = z * nx + x;
      if (x < 0 || x >= nx || z < 0 || z >= nz || !free[id]) continue;
      const d = Math.hypot(p.x - point(id).x, p.z - point(id).z);
      if (d < distance && clearSegment(p, point(id))) { best = id; distance = d; }
    }
    return best;
  }
  function route(start: WalkPoint, end: WalkPoint): WalkPoint[] {
    if (!walkable(start) || !walkable(end)) return [];
    if (clearSegment(start, end)) return [start, end];
    const first = nearest(start), last = nearest(end); if (first < 0 || last < 0) return [];
    const cost = new Float64Array(free.length).fill(Infinity), previous = new Int32Array(free.length).fill(-1), closed = new Uint8Array(free.length);
    const heap: { id: number; score: number }[] = [];
    const heuristic = (id: number) => Math.hypot(point(id).x - end.x, point(id).z - end.z);
    function push(id: number, score: number) {
      heap.push({ id, score }); let i = heap.length - 1;
      while (i > 0) { const parent = (i - 1) >> 1; if (heap[parent].score <= heap[i].score) break; [heap[parent], heap[i]] = [heap[i], heap[parent]]; i = parent; }
    }
    function pop() {
      const top = heap[0], tail = heap.pop()!;
      if (heap.length) { heap[0] = tail; let i = 0;
        while (true) { let child = i * 2 + 1; if (child >= heap.length) break; if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++; if (heap[i].score <= heap[child].score) break; [heap[i], heap[child]] = [heap[child], heap[i]]; i = child; }
      } return top.id;
    }
    cost[first] = 0; push(first, heuristic(first));
    while (heap.length) {
      const current = pop(); if (closed[current]) continue; closed[current] = 1;
      if (current === last) {
        const raw = [end]; let id = last;
        while (id !== -1) { raw.push(point(id)); id = previous[id]; } raw.push(start); raw.reverse();
        const result = [start]; let index = 0;
        while (index < raw.length - 1) { let next = raw.length - 1; while (next > index + 1 && !clearSegment(raw[index], raw[next])) next--; result.push(raw[next]); index = next; }
        return result.every((p, i) => !i || clearSegment(result[i - 1], p)) ? result : [];
      }
      const x = current % nx, z = Math.floor(current / nx);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (x + dx < 0 || x + dx >= nx || z + dz < 0 || z + dz >= nz) continue;
        const next = current + dx + dz * nx;
        if (!free[next] || closed[next] || dx && dz && (!free[current + dx] || !free[current + dz * nx])) continue;
        const candidate = cost[current] + Math.hypot(dx, dz) * step;
        if (candidate >= cost[next]) continue;
        cost[next] = candidate; previous[next] = current; push(next, candidate + heuristic(next));
      }
    }
    return [];
  }
  return { route, walkable, clearSegment };
}
