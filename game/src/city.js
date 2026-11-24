// NEON BAY HEAT 2 — city generation.
// One job: turn a seed into the static world — road grid, city blocks with
// buildings and neon signs, palm trees, the beach and the water, plus the
// four named districts the HUD and minimap label.

import { WORLD } from './config.js';
import { makeRng, pick, range, intRange } from './random.js';

const BUILDING_COLORS = ['#5b6b7f', '#6e5a7e', '#7a6248', '#4f7267', '#74565e', '#556270', '#6b7a56', '#7e6a4f'];
const NEON = ['#ff2e88', '#22d3ee', '#facc15', '#a3e635', '#fb7185', '#38bdf8'];
const SIGNS = ['HOTEL', 'BAR', 'DINER', 'CLUB NOVA', 'PIZZA', 'LIQUOR', 'TATTOO', 'MOTEL', 'CASINO', 'GYM', 'PAWN', '24H'];

export const DISTRICTS = [
  { name: 'DOWNTOWN', x: 200, y: 200, w: 1200, h: 900 },
  { name: 'NEON BAY', x: 1500, y: 200, w: 1100, h: 900 },
  { name: 'PORTSIDE', x: 200, y: 1200, w: 1200, h: 1000 },
  { name: 'PALM HEIGHTS', x: 1500, y: 1200, w: 1150, h: 1000 },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return x >= WORLD.beachX ? 'NEON BEACH' : 'DOWNTOWN';
}

export function buildCity(seed) {
  const rng = makeRng(seed);
  const { width, height, block, beachX } = WORLD;
  const buildings = [];
  const trees = [];

  // Blocks sit between the roads; each block holds 1-4 buildings.
  for (let bx = block / 2; bx < beachX - 80; bx += block) {
    for (let by = block / 2; by < height - 60; by += block) {
      const cx = bx + block / 2, cy = by + block / 2;
      const n = intRange(rng, 1, 3);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 52, 92), h = range(rng, 52, 92);
        const x = cx + range(rng, -38, 38) - w / 2;
        const y = cy + range(rng, -38, 38) - h / 2;
        buildings.push({
          x, y, w, h,
          color: pick(rng, BUILDING_COLORS),
          floors: intRange(rng, 2, 9),
          sign: rng() < 0.42 ? pick(rng, SIGNS) : null,
          signColor: pick(rng, NEON),
          lit: Array.from({ length: 12 }, () => rng() < 0.55),
        });
      }
      if (rng() < 0.7) {
        trees.push({ x: cx + range(rng, -70, 70), y: cy + range(rng, -70, 70), r: range(rng, 9, 15) });
      }
    }
  }
  // Palms line the beach.
  for (let y = 60; y < height - 40; y += range(rng, 90, 160)) {
    trees.push({ x: beachX + range(rng, 26, 90), y, r: range(rng, 10, 16), palm: true });
  }

  // Road centre-lines for traffic: verticals and horizontals.
  const vRoads = [], hRoads = [];
  for (let x = block; x < beachX; x += block) vRoads.push(x);
  for (let y = block; y < height; y += block) hRoads.push(y);

  return { buildings, trees, vRoads, hRoads, seed };
}

// Is a point inside any building? (collision + spawn checks)
export function hitsBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// Snap a point out of a building along the smaller penetration axis.
export function pushOut(city, p, radius) {
  const b = hitsBuilding(city, p.x, p.y, radius * 0.4);
  if (!b) return;
  const left = Math.abs(p.x - (b.x - radius));
  const right = Math.abs(p.x - (b.x + b.w + radius));
  const top = Math.abs(p.y - (b.y - radius));
  const bottom = Math.abs(p.y - (b.y + b.h + radius));
  const m = Math.min(left, right, top, bottom);
  if (m === left) p.x = b.x - radius;
  else if (m === right) p.x = b.x + b.w + radius;
  else if (m === top) p.y = b.y - radius;
  else p.y = b.y + b.h + radius;
}
