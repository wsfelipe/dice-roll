import type { Rng } from './rng';

export interface Point {
  x: number;
  z: number;
}

export function sampleLandings(
  count: number, halfW: number, halfH: number, minDist: number, fixed: Point[], rng: Rng,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    let best: Point = { x: 0, z: 0 };
    let bestD = -1;
    for (let tries = 0; tries < 60; tries++) {
      const p = { x: (rng() * 2 - 1) * halfW, z: (rng() * 2 - 1) * halfH };
      const d = Math.min(Infinity, ...[...fixed, ...out].map((q) => Math.hypot(q.x - p.x, q.z - p.z)));
      if (d >= minDist) { best = p; bestD = d; break; }
      if (d > bestD) { best = p; bestD = d; }
    }
    out.push(best);
  }
  return out;
}

export function sampleStart(
  landing: Point, tableHalfW: number, tableHalfH: number, size: number, entry: 'edge' | 'above', rng: Rng,
): Point {
  if (entry === 'above') {
    return { x: landing.x + (rng() - 0.5) * 3, z: landing.z + (rng() - 0.5) * 3 };
  }
  const out = size * 1.8;
  switch (Math.floor(rng() * 4)) {
    case 0: return { x: -(tableHalfW + out), z: (rng() * 2 - 1) * tableHalfH };
    case 1: return { x: tableHalfW + out, z: (rng() * 2 - 1) * tableHalfH };
    case 2: return { x: (rng() * 2 - 1) * tableHalfW, z: -(tableHalfH + out) };
    default: return { x: (rng() * 2 - 1) * tableHalfW, z: tableHalfH + out };
  }
}
