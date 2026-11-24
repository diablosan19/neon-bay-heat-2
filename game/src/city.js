// NEON BAY HEAT 2 — the city itself.
// Builds the static world from a seed: a grid of avenues, a building (or
// a small cluster) inside every block, scattered palms, and the beach
// strip down the eastern edge. Also owns the district map and the
// building-collision solver every moving thing uses.

import { WORLD_W, WORLD_H, GRID, ROAD_W, SHORE_X } from './config.js';
import { rngFrom, between, whole, choose, chance } from './random.js';

const ROOFS = ['#5d6a7a', '#71607c', '#77644c', '#51755f', '#6d5560', '#5a6e56', '#7c6a50', '#4f6274'];
const GLOWS = ['#ff2e88', '#22d3ee', '#facc15', '#a3e635', '#fb7185', '#38bdf8', '#f472b6'];
const SIGNS = ['HOTEL', 'BAR', 'DINER', 'CLUB NOVA', 'PIZZA', 'LIQUOR', 'TATTOO', 'MOTEL', 'CASINO', 'GYM', 'PAWN SHOP', '24H STORE', 'RAMEN', 'ARCADE'];

export const DISTRICTS = [
  { name: 'OLD TOWN', x0: 0, y0: 0, x1: 1680, y1: 1260 },
  { name: 'NEON BAY', x0: 1680, y0: 0, x1: SHORE_X, y1: 1260 },
  { name: 'THE DOCKS', x0: 0, y0: 1260, x1: 1680, y1: WORLD_H },
  { name: 'PALM HEIGHTS', x0: 1680, y0: 1260, x1: SHORE_X, y1: WORLD_H },
];

export function districtName(x, y) {
  if (x >= SHORE_X) return 'NEON BEACH';
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return 'OLD TOWN';
}

export function generateCity(seed) {
  const rng = rngFrom(seed * 7919 + 13);
  const vRoads = [];
  const hRoads = [];
  for (let x = GRID / 2; x < SHORE_X; x += GRID) vRoads.push(x);
  for (let y = GRID / 2; y < WORLD_H; y += GRID) hRoads.push(y);

  const buildings = [];
  const trees = [];

  // Blocks are the squares BETWEEN road centrelines: their centres sit a
  // full GRID from each centreline, and building size + jitter are capped
  // so no wall ever leans into the asphalt (centreline ± 46 keep-out).
  for (let cellX = GRID; cellX < SHORE_X; cellX += GRID) {
    for (let cellY = GRID; cellY < WORLD_H; cellY += GRID) {
      const count = whole(rng, 1, 3);
      for (let i = 0; i < count; i++) {
        const w = between(rng, 50, 88);
        const h = between(rng, 50, 88);
        const bx = cellX + between(rng, -26, 26) - w / 2;
        const by = cellY + between(rng, -26, 26) - h / 2;
        buildings.push({
          x: bx, y: by, w, h,
          roof: choose(rng, ROOFS),
          sign: chance(rng, 0.4) ? choose(rng, SIGNS) : null,
          glow: choose(rng, GLOWS),
          windows: Array.from({ length: 14 }, () => chance(rng, 0.55)),
        });
      }
      if (chance(rng, 0.65)) {
        trees.push({ x: cellX + between(rng, -62, 62), y: cellY + between(rng, -62, 62), r: between(rng, 9, 15), palm: false });
      }
    }
  }
  // Palms march down the sand.
  for (let y = 70; y < WORLD_H - 50; y += between(rng, 95, 170)) {
    trees.push({ x: SHORE_X + between(rng, 30, 110), y, r: between(rng, 10, 16), palm: true });
  }
  return { buildings, trees, vRoads, hRoads };
}

// Push a circle (x, y, r) out of every building it overlaps; mutates the
// passed object {x, y} and returns true if any push happened.
export function resolveBuildingHit(city, pos, r) {
  let pushed = false;
  for (const b of city.buildings) {
    const nearX = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - nearX;
    const dy = pos.y - nearY;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    pushed = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = nearX + (dx / d) * r;
      pos.y = nearY + (dy / d) * r;
    } else {
      // Centre is inside the box: leave by the shortest side.
      const left = pos.x - b.x, right = b.x + b.w - pos.x;
      const top = pos.y - b.y, bottom = b.y + b.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.x - r;
      else if (m === right) pos.x = b.x + b.w + r;
      else if (m === top) pos.y = b.y - r;
      else pos.y = b.y + b.h + r;
    }
  }
  return pushed;
}

export function insideBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
}
