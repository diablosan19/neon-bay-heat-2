// NEON BAY HEAT 2 — the city itself.
// Grown from a seed: a grid of avenues, blocks packed with roofed
// buildings (some wearing neon), trees in the gaps, and a beach strip
// down the east side. Four districts, one per quadrant, each with its
// own roof palette and sign flavour.

import { WORLD_W, WORLD_H, PITCH, ROAD_W, BEACH_X } from './config.js';
import { rng32, between, betweenInt, pick, chance } from './random.js';

export const DISTRICTS = [
  { name: 'VICE POINT', roofs: ['#5d6a7a', '#6b7686', '#54626f'], signs: ['HOTEL', 'CASINO', 'BAR VICE', 'CLUB 88', 'DINER'] },
  { name: 'CORAL DOCKS', roofs: ['#71604c', '#7d6a52', '#665741'], signs: ['FISH CO', 'TACKLE', 'PORT BAR', 'CRATES', 'FERRY'] },
  { name: 'PALM TERRACE', roofs: ['#5f7a68', '#6c8574', '#55705f'], signs: ['MOTEL', 'SURF SHOP', 'CAFE PALM', 'GYM', '24H STORE'] },
  { name: 'OLD MARKET', roofs: ['#77626e', '#836e7a', '#6d5864'], signs: ['PAWN', 'NOODLES', 'MARKET', 'TATTOO', 'LIQUOR'] },
];
const NEON_COLS = ['#ff5da2', '#37e0c8', '#ffd23f', '#7ab8ff', '#ff8a5c', '#b28dff'];

export function districtIndexAt(x, y) {
  const east = x >= WORLD_W / 2 ? 1 : 0;
  const south = y >= WORLD_H / 2 ? 1 : 0;
  return south * 2 + east; // 0 NW, 1 NE, 2 SW, 3 SE
}
export function districtNameAt(x, y) {
  return DISTRICTS[districtIndexAt(x, y)].name;
}

// Road centrelines: verticals at x = PITCH/2 + k*PITCH, same for rows.
export function vRoads() {
  const xs = [];
  for (let x = PITCH / 2; x < WORLD_W; x += PITCH) xs.push(x);
  return xs;
}
export function hRoads() {
  const ys = [];
  for (let y = PITCH / 2; y < WORLD_H; y += PITCH) ys.push(y);
  return ys;
}

export function buildCity(seed) {
  const rng = rng32(seed * 7919 + 13);
  const buildings = [];
  const trees = [];
  const half = ROAD_W / 2 + 14; // keep-out from each centreline

  // Blocks live between neighbouring centrelines: block (bx, by) fills
  // the square whose top-left centreline crossing is (bx, by).
  for (let bx = 0; PITCH / 2 + (bx + 1) * PITCH <= WORLD_W; bx++) {
    for (let by = 0; PITCH / 2 + (by + 1) * PITCH <= WORLD_H; by++) {
      const x0 = PITCH / 2 + bx * PITCH + half;
      const y0 = PITCH / 2 + by * PITCH + half;
      const span = PITCH - half * 2;
      const cx = PITCH / 2 + bx * PITCH + PITCH / 2;
      const cy = PITCH / 2 + by * PITCH + PITCH / 2;
      if (cx > BEACH_X) continue; // beach blocks stay open sand
      const district = DISTRICTS[districtIndexAt(cx, cy)];
      const count = betweenInt(rng, 1, 3);
      for (let i = 0; i < count; i++) {
        const w = between(rng, 56, span - 30);
        const h = between(rng, 56, span - 30);
        const x = x0 + between(rng, 0, Math.max(1, span - w));
        const y = y0 + between(rng, 0, Math.max(1, span - h));
        const signed = chance(rng, 0.4);
        buildings.push({
          x, y, w, h,
          roof: pick(rng, district.roofs),
          sign: signed ? pick(rng, district.signs) : null,
          signCol: pick(rng, NEON_COLS),
          wins: Array.from({ length: 10 }, () => chance(rng, 0.5)),
        });
      }
      const grove = betweenInt(rng, 0, 3);
      for (let i = 0; i < grove; i++) {
        trees.push({ x: x0 + between(rng, 6, span - 6), y: y0 + between(rng, 6, span - 6), r: between(rng, 10, 17) });
      }
    }
  }
  // Palms along the sand.
  for (let y = 60; y < WORLD_H - 40; y += between(rng, 120, 210)) {
    trees.push({ x: BEACH_X + between(rng, 30, 130), y, r: between(rng, 11, 16), palm: true });
  }
  return { buildings, trees, vRoads: vRoads(), hRoads: hRoads() };
}

// Circle-vs-buildings: push the circle out along the shallowest axis.
export function pushOutOfBuildings(city, body, radius) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - nx;
    const dy = body.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      body.x = nx + (dx / d) * radius;
      body.y = ny + (dy / d) * radius;
    } else {
      // Centre inside the footprint: exit through the nearest face.
      const left = body.x - b.x, right = b.x + b.w - body.x;
      const top = body.y - b.y, bot = b.y + b.h - body.y;
      const m = Math.min(left, right, top, bot);
      if (m === left) body.x = b.x - radius;
      else if (m === right) body.x = b.x + b.w + radius;
      else if (m === top) body.y = b.y - radius;
      else body.y = b.y + b.h + radius;
    }
  }
}

export function insideBuilding(city, x, y) {
  return city.buildings.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
}
