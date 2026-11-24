// NEON BAY HEAT 2 — pedestrians.
// One job: people who stroll the sidewalks, wander the beach, and dive out
// of the way of speeding cars (which is where mayhem points come from).

import { WORLD } from './config.js';
import { makeRng, pick, range } from './random.js';
import { pushOut } from './city.js';

const SHIRTS = ['#e8e3d9', '#c94f4f', '#4f79c9', '#53a06a', '#d9a441', '#9a6bc9', '#4fb3bf', '#e2731d'];

export function spawnPeds(city, seed, count = 42) {
  const rng = makeRng(seed ^ 0x51ab);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const onBeach = rng() < 0.18;
    const x = onBeach ? range(rng, WORLD.beachX + 20, WORLD.width - 60) : range(rng, 80, WORLD.beachX - 60);
    const y = range(rng, 80, WORLD.height - 80);
    peds.push({
      x, y, angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 34, 62), shirt: pick(rng, SHIRTS),
      panic: 0, retarget: range(rng, 1, 5), onBeach,
    });
  }
  return peds;
}

export function stepPeds(peds, dt, city, threats, onScare) {
  for (const p of peds) {
    p.retarget -= dt;
    if (p.retarget <= 0) { p.angle += range(Math.random, -1.2, 1.2); p.retarget = range(Math.random, 1.5, 5); }
    let speed = p.speed;
    p.panic = Math.max(0, p.panic - dt);
    for (const t of threats) {
      const dx = p.x - t.x, dy = p.y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 130 * 130 && Math.abs(t.speed || 0) > 130) {
        if (p.panic <= 0 && onScare) onScare(p);
        p.panic = 1.4;
        p.angle = Math.atan2(dy, dx);
        speed = 235;
        break;
      }
    }
    p.x += Math.cos(p.angle) * speed * dt;
    p.y += Math.sin(p.angle) * speed * dt;
    p.x = Math.max(16, Math.min(WORLD.width - 16, p.x));
    p.y = Math.max(16, Math.min(WORLD.height - 16, p.y));
    if (!p.onBeach) pushOut(city, p, 10);
  }
}
