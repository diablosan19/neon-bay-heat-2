// NEON BAY HEAT 2 — the crowd.
// Pedestrians drift along the pavements and the beach, minding their
// own business until a fast car gets close; then they run directly
// away from it, which is both self-preservation and, for the driver,
// mayhem points. A pedestrian the car actually reaches goes down for
// a few seconds — the heat that follows is the police module's problem.

import { WORLD_W, WORLD_H, ROAD_W, BEACH_X, SEA_X } from './config.js';
import { makeRng, pick, randRange } from './random.js';
import { V_ROADS, H_ROADS, pushOutOfBuildings } from './city.js';

const SHIRTS = ['#e8e3d9', '#c94f4f', '#4f79c9', '#53a06a', '#d9a441', '#9a6bc9', '#4fb3bf', '#e2731d', '#d9709e'];

export function seedCrowd(seed, count = 46) {
  const rng = makeRng(seed * 101 + 29);
  const peds = [];
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    if (rng() < 0.16) {
      // Beach wanderers, between the palms and the waterline.
      x = randRange(rng, BEACH_X + 24, SEA_X - 26);
      y = randRange(rng, 60, WORLD_H - 60);
    } else if (rng() < 0.5) {
      const road = pick(rng, V_ROADS);
      x = road + (rng() < 0.5 ? -1 : 1) * (ROAD_W / 2 + randRange(rng, 7, 16));
      y = randRange(rng, 60, WORLD_H - 60);
    } else {
      const road = pick(rng, H_ROADS);
      y = road + (rng() < 0.5 ? -1 : 1) * (ROAD_W / 2 + randRange(rng, 7, 16));
      x = randRange(rng, 60, BEACH_X - 40);
    }
    peds.push({
      x, y,
      heading: randRange(rng, 0, Math.PI * 2),
      speed: randRange(rng, 34, 60),
      shirt: pick(rng, SHIRTS),
      retarget: randRange(rng, 0.5, 4),
      panic: 0,
      downT: 0,
    });
  }
  return peds;
}

// threats: [{x, y, speed}] of fast-moving cars. onScare is optional —
// it fires once per fresh fright, and only if it is actually callable.
export function stepCrowd(peds, dt, city, threats, onScare) {
  for (const p of peds) {
    if (p.downT > 0) {
      p.downT -= dt;
      continue;
    }
    let fleeing = false;
    for (const t of threats) {
      const dx = p.x - t.x;
      const dy = p.y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 112 * 112 && t.speed > 118) {
        if (p.panic <= 0 && typeof onScare === 'function') onScare(p);
        p.panic = 1.3;
        p.heading = Math.atan2(dy, dx);
        fleeing = true;
        break;
      }
    }
    p.panic = Math.max(0, p.panic - dt);
    if (!fleeing) {
      p.retarget -= dt;
      if (p.retarget <= 0) {
        p.heading += randRange(Math.random, -1.3, 1.3);
        p.retarget = randRange(Math.random, 1.5, 5);
      }
    }
    const sp = fleeing || p.panic > 0 ? 232 : p.speed;
    p.x += Math.cos(p.heading) * sp * dt;
    p.y += Math.sin(p.heading) * sp * dt;
    p.x = Math.max(14, Math.min(WORLD_W - 14, p.x));
    p.y = Math.max(14, Math.min(WORLD_H - 14, p.y));
    pushOutOfBuildings(city, p, 9);
  }
}
