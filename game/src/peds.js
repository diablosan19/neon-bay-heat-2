// NEON BAY HEAT 2 — pedestrians.
// Beachgoers and sidewalk wanderers. They amble between waypoints, and
// when a fast car gets close they bolt directly away from it — the scare
// is worth mayhem points, running one down is a crime (handled in main).

import { WORLD_W, WORLD_H, SHORE_X } from './config.js';
import { rngFrom, between, choose } from './random.js';
import { resolveBuildingHit } from './city.js';

const TOPS = ['#e8e3d9', '#c94f4f', '#4f79c9', '#53a06a', '#d9a441', '#9a6bc9', '#4fb3bf', '#e2731d', '#e87ea1'];

export function spawnCrowd(seed, count = 44) {
  const rng = rngFrom(seed * 131 + 29);
  const crowd = [];
  for (let i = 0; i < count; i++) {
    const beach = rng() < 0.16;
    crowd.push({
      x: beach ? between(rng, SHORE_X + 24, WORLD_W - 50) : between(rng, 70, SHORE_X - 60),
      y: between(rng, 70, WORLD_H - 70),
      heading: between(rng, 0, Math.PI * 2),
      pace: between(rng, 36, 64),
      top: choose(rng, TOPS),
      fleeT: 0,
      thinkT: between(rng, 0.5, 4),
      downT: 0,
      beach,
    });
  }
  return crowd;
}

// threats: fast-moving cars [{x, y, speed}]. onFlee(ped) fires once per scare.
export function stepCrowd(crowd, dt, city, threats, onFlee) {
  for (const p of crowd) {
    if (p.downT > 0) { p.downT -= dt; continue; }
    p.thinkT -= dt;
    if (p.thinkT <= 0) {
      p.heading += between(Math.random, -1.3, 1.3);
      p.thinkT = between(Math.random, 1.2, 4.5);
    }
    let speed = p.pace;
    let fleeing = false;
    for (const t of threats) {
      const dx = p.x - t.x, dy = p.y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 128 * 128 && t.speed > 128) {
        if (p.fleeT <= 0 && typeof onFlee === 'function') onFlee(p);
        p.fleeT = 1.3;
        p.heading = Math.atan2(dy, dx);
        fleeing = true;
        break;
      }
    }
    if (fleeing) speed = 238;
    p.fleeT = Math.max(0, p.fleeT - dt);
    p.x += Math.cos(p.heading) * speed * dt;
    p.y += Math.sin(p.heading) * speed * dt;
    p.x = Math.max(14, Math.min(WORLD_W - 14, p.x));
    p.y = Math.max(14, Math.min(WORLD_H - 14, p.y));
    if (!p.beach) resolveBuildingHit(city, p, 9);
  }
}
