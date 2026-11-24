// NEON BAY HEAT 2 — the crowd.
// Pedestrians amble along block edges and across the sand. A fast car
// nearby sends them sprinting away from it; a car that actually reaches
// one knocks them down for a few seconds (the main loop scores that).

import { WORLD_W, WORLD_H, BEACH_X } from './config.js';
import { rng32, between, pick } from './random.js';
import { pushOutOfBuildings } from './city.js';

const SKIN = ['#e8b98d', '#c98d5f', '#8a5a3b', '#f0cfa8'];
const TOPS = ['#d95f4b', '#4b7ad9', '#53a06a', '#d9a441', '#9a6bc9', '#4fb3bf', '#e8e3d9'];

export function seedCrowd(seed, count = 44) {
  const rng = rng32(seed * 131 + 3);
  const crowd = [];
  for (let i = 0; i < count; i++) {
    const onSand = rng() < 0.16;
    crowd.push({
      x: onSand ? between(rng, BEACH_X + 24, WORLD_W - 50) : between(rng, 70, BEACH_X - 50),
      y: between(rng, 70, WORLD_H - 70),
      heading: between(rng, 0, Math.PI * 2),
      pace: between(rng, 30, 58),
      skin: pick(rng, SKIN), top: pick(rng, TOPS),
      panic: 0, downT: 0, think: between(rng, 1, 5),
      sand: onSand, phase: between(rng, 0, 6),
    });
  }
  return crowd;
}

// threats: [{x, y, speed}] of fast-moving cars. onScare(ped) is called
// the moment a pedestrian bolts — the caller decides whether the player
// caused it. The callback is optional and always guarded.
export function stepCrowd(crowd, dt, city, threats, onScare) {
  for (const p of crowd) {
    if (p.downT > 0) { p.downT -= dt; continue; }
    p.think -= dt;
    if (p.think <= 0) {
      p.heading += between(Math.random, -1.1, 1.1);
      p.think = between(Math.random, 1.5, 5);
    }
    p.panic = Math.max(0, p.panic - dt);
    let speed = p.pace;
    for (const t of threats) {
      const dx = p.x - t.x, dy = p.y - t.y;
      if (dx * dx + dy * dy < 135 * 135 && t.speed > 125) {
        if (p.panic <= 0 && typeof onScare === 'function') onScare(p);
        p.panic = 1.3;
        p.heading = Math.atan2(dy, dx);
        speed = 238;
        break;
      }
    }
    p.phase += dt * (speed > 100 ? 13 : 7);
    p.x += Math.cos(p.heading) * speed * dt;
    p.y += Math.sin(p.heading) * speed * dt;
    p.x = Math.max(14, Math.min(WORLD_W - 14, p.x));
    p.y = Math.max(14, Math.min(WORLD_H - 14, p.y));
    if (!p.sand) pushOutOfBuildings(city, p, 10);
  }
}
