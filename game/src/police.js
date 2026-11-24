// NEON BAY HEAT 2 — wanted level and the police.
// One job: track heat. Crimes raise stars; cops spawn at the edges, chase,
// box the player in, and fill the bust meter when they pin a slow player.
// Stay unseen and the heat decays, one star at a time.

import { CAR, PLAYER, WANTED, WORLD } from './config.js';
import { makeRng } from './random.js';
import { stepCar } from './vehicles.js';

export function makePolice() {
  return {
    stars: 0,           // 0..5
    heat: 0,            // fractional progress toward the next star
    cops: [],
    unseen: 0,          // seconds since any cop saw the player
    bust: 0,            // 0..1 bust meter
    busted: false,
    rng: makeRng(20261124),
  };
}

export function commitCrime(police, points) {
  police.heat += points;
  while (police.heat >= 1 && police.stars < WANTED.maxStars) {
    police.stars += 1;
    police.heat -= 1;
  }
  if (police.stars >= WANTED.maxStars) police.heat = Math.min(police.heat, 0.99);
}

function spawnCop(police, target) {
  const a = police.rng() * Math.PI * 2;
  const d = 560 + police.rng() * 160;
  const x = Math.max(30, Math.min(WORLD.width - 30, target.x + Math.cos(a) * d));
  const y = Math.max(30, Math.min(WORLD.height - 30, target.y + Math.sin(a) * d));
  police.cops.push({
    x, y, angle: a + Math.PI, speed: 0, steer: 0, w: 36, l: 18,
    kind: { name: 'CRUISER', w: 36, l: 18 }, paint: '#e8ecf2',
    speedMul: 0.98 + police.stars * 0.035, parked: false, wrecked: 0, cop: true,
  });
}

export function stepPolice(police, dt, target, targetSpeed, city) {
  if (police.busted) return;
  const want = police.stars; // cruisers fielded = stars + 1, capped
  const fielded = Math.min(2 + want, 7);
  if (want > 0) {
    if (police.cops.length < fielded) spawnCop(police, target);
  } else if (police.cops.length) {
    police.cops = police.cops.filter((c) => Math.hypot(c.x - target.x, c.y - target.y) < 900);
  }

  let seen = false;
  let pinning = 0;
  for (const cop of police.cops) {
    const dx = target.x - cop.x, dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (dist < WANTED.sightRange) seen = true;
    // Chase: aim at a point just behind the target to box in, not ram through.
    const lead = 0.35;
    const tx = target.x - Math.cos(Math.atan2(dy, dx)) * 6 + (target.vx || 0) * lead;
    const ty = target.y - Math.sin(Math.atan2(dy, dx)) * 6 + (target.vy || 0) * lead;
    let wantAngle = Math.atan2(ty - cop.y, tx - cop.x);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.4));
    const throttle = dist > 46 ? 1 : 0.25;
    stepCar(cop, dt, throttle, steer, city);
    if (dist < 64 && Math.abs(targetSpeed) < 55) pinning++;
  }
  police.unseen = seen ? 0 : police.unseen + dt;
  if (police.unseen > WANTED.decaySeconds && police.stars > 0) {
    police.stars -= 1;
    police.unseen = 0;
    if (police.stars === 0) police.cops.length = 0;
  }
  // Bust meter fills while pinned and slow, drains otherwise.
  if (pinning > 0 && police.stars > 0) {
    police.bust += dt / PLAYER.bustTime;
    if (police.bust >= 1) { police.bust = 1; police.busted = true; }
  } else {
    police.bust = Math.max(0, police.bust - dt * 0.7);
  }
}

export function payFine(police, cash) {
  // Busted: lose a cut of your cash and all your heat.
  const fine = Math.min(cash, 150 + police.stars * 90);
  police.stars = 0; police.heat = 0; police.cops.length = 0;
  police.bust = 0; police.busted = false; police.unseen = 0;
  return fine;
}
