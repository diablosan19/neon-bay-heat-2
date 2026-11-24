// NEON BAY HEAT 2 — the city itself.
// buildCity grows the whole map from one seed: the avenue grid, four
// named districts with their own roof palettes and neon vocabularies,
// and every block filled as buildings, a parking lot or a palm plaza.
// Everything static lives here; the moving pieces live elsewhere.

import {
  WORLD_W, WORLD_H, PITCH, ROAD_W, FIRST_RD, BEACH_X,
} from './config.js';
import { makeRng, randRange, randInt, pick } from './random.js';

// Avenues west to east, streets north to south.
export const V_ROADS = [];
for (let x = FIRST_RD; x < WORLD_W - 180; x += PITCH) V_ROADS.push(x);
export const H_ROADS = [];
for (let y = FIRST_RD; y < WORLD_H - 80; y += PITCH) H_ROADS.push(y);

export const DISTRICTS = [
  { name: 'OLD MARKET', x0: 0, y0: 0, x1: 1600, y1: 1200,
    roofs: ['#7a5c48', '#6e5646', '#83644e', '#75584a'],
    signs: ['DELI', 'PAWN', 'HOTEL', 'BAR', 'BAKERY', 'LOANS'] },
  { name: 'VICE POINT', x0: 1600, y0: 0, x1: BEACH_X, y1: 1200,
    roofs: ['#4d5a78', '#5a4a72', '#44586e', '#524a80'],
    signs: ['CLUB NEON', 'CASINO', 'HOTEL', 'LOUNGE', '24H', 'INK'] },
  { name: 'PALM TERRACE', x0: 0, y0: 1200, x1: 1600, y1: WORLD_H,
    roofs: ['#5d7263', '#687a5e', '#5a6e60', '#716f56'],
    signs: ['CAFE', 'GYM', 'FLORIST', 'BOOKS', 'DINER', 'YOGA'] },
  { name: 'CORAL DOCKS', x0: 1600, y0: 1200, x1: BEACH_X, y1: WORLD_H,
    roofs: ['#6e5a52', '#5f6068', '#71604e', '#64555f'],
    signs: ['TACKLE', 'MOTEL', 'FUEL', 'BOATS', 'PIZZA', 'BAR'] },
];

const NEON = ['#ff5da2', '#37e0c8', '#ffd23f', '#8ab6ff', '#ff8a5c', '#c792ff'];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[1];
}

export function buildCity(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const buildings = [];
  const parkingSpots = [];
  const palms = [];
  const cells = [];

  // Block interiors are the land between road edges, from the map rim
  // in the west to the beach in the east.
  const xEdges = [24, ...V_ROADS, BEACH_X];
  const yEdges = [24, ...H_ROADS, WORLD_H - 24];
  const half = ROAD_W / 2 + 8;

  for (let i = 0; i < xEdges.length - 1; i++) {
    for (let j = 0; j < yEdges.length - 1; j++) {
      const x0 = xEdges[i] + (i === 0 ? 0 : half);
      const x1 = xEdges[i + 1] - (i === xEdges.length - 2 ? 0 : half);
      const y0 = yEdges[j] + (j === 0 ? 0 : half);
      const y1 = yEdges[j + 1] - (j === yEdges.length - 2 ? 0 : half);
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const cell = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      cells.push(cell);
      const d = districtAt(x0 + cell.w / 2, y0 + cell.h / 2);
      const roll = rng();

      if (roll < 0.66) {
        // Buildings: one slab or a pair, never touching the pavement edge.
        const count = rng() < 0.45 ? 1 : 2;
        for (let k = 0; k < count; k++) {
          const bw = randRange(rng, 0.34, 0.44) * cell.w;
          const bh = randRange(rng, 0.34, 0.44) * cell.h;
          const bx = count === 1
            ? x0 + (cell.w - bw) / 2
            : x0 + 10 + k * (cell.w - bw - 16);
          const by = count === 1
            ? y0 + (cell.h - bh) / 2
            : y0 + 10 + ((k * 53) % Math.max(20, cell.h - bh - 20));
          const cols = Math.max(2, Math.floor(bw / 17));
          const rows = Math.max(2, Math.floor(bh / 17));
          const lit = [];
          for (let n = 0; n < cols * rows; n++) lit.push(rng() < 0.52);
          buildings.push({
            x: bx, y: by, w: bw, h: bh,
            roof: pick(rng, d.roofs),
            lit, cols, rows,
            sign: rng() < 0.5 ? pick(rng, d.signs) : null,
            signColor: pick(rng, NEON),
          });
        }
      } else if (roll < 0.84) {
        // Parking lot: two rows of marked bays along the cell's long axis.
        const alongX = cell.w >= cell.h;
        const n = randInt(rng, 3, 5);
        for (let k = 0; k < n; k++) {
          for (const side of [-1, 1]) {
            parkingSpots.push({
              x: alongX ? x0 + 26 + k * ((cell.w - 52) / Math.max(1, n - 1)) : x0 + cell.w / 2 + side * (cell.w / 4),
              y: alongX ? y0 + cell.h / 2 + side * (cell.h / 4) : y0 + 26 + k * ((cell.h - 52) / Math.max(1, n - 1)),
              heading: alongX ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : (side < 0 ? 0 : Math.PI),
              lot: true,
            });
          }
        }
      } else {
        // Plaza: palms in a loose ring, room to cut through.
        const n = randInt(rng, 4, 7);
        for (let k = 0; k < n; k++) {
          palms.push({
            x: x0 + randRange(rng, 18, cell.w - 18),
            y: y0 + randRange(rng, 18, cell.h - 18),
            r: randRange(rng, 13, 19),
          });
        }
      }
    }
  }

  // A palm fringe along the sand.
  for (let y = 70; y < WORLD_H - 40; y += randRange(rng, 120, 210)) {
    palms.push({ x: randRange(rng, BEACH_X + 30, BEACH_X + 130), y, r: randRange(rng, 14, 20) });
  }

  return { buildings, parkingSpots, palms, cells, seed };
}

// Circle against every nearby building footprint; resolves the overlap
// by pushing the circle out along its smallest escape axis.
export function pushOutOfBuildings(city, o, r) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(o.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(o.y, b.y + b.h));
    const dx = o.x - nx;
    const dy = o.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      o.x = nx + (dx / d) * r;
      o.y = ny + (dy / d) * r;
    } else {
      // Centre is inside the footprint: leave by the nearest face.
      const left = o.x - b.x;
      const right = b.x + b.w - o.x;
      const top = o.y - b.y;
      const bottom = b.y + b.h - o.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) o.x = b.x - r;
      else if (m === right) o.x = b.x + b.w + r;
      else if (m === top) o.y = b.y - r;
      else o.y = b.y + b.h + r;
    }
    return true;
  }
  return false;
}

// The road point nearest to (x, y): used to put spawning cruisers and
// job goals on asphalt instead of in someone's lobby.
export function nearestRoadPoint(x, y) {
  let bestX = V_ROADS[0];
  for (const vx of V_ROADS) if (Math.abs(vx - x) < Math.abs(bestX - x)) bestX = vx;
  let bestY = H_ROADS[0];
  for (const hy of H_ROADS) if (Math.abs(hy - y) < Math.abs(bestY - y)) bestY = hy;
  return Math.abs(bestX - x) < Math.abs(bestY - y)
    ? { x: bestX, y }
    : { x, y: bestY };
}
