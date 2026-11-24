// NEON BAY HEAT 2 — the law.
// A wanted level from zero to five stars. Heat is earned in fractions
// (a theft is worth most of a star, a knocked-down pedestrian more
// than one) and spent by staying out of sight: when no cruiser is
// close enough to see the player for long enough, a star falls off.
// Cruisers steer for an intercept point ahead of the player rather
// than the player's tail, and the bust lands only when they can hold
// the player slow inside a tight ring — speed is always an escape.

import { LAW } from './config.js';
import { makeRng } from './random.js';
import { makeCar, driveCar, roadPointAtRing } from './vehicles.js';

export function newLaw() {
  return {
    stars: 0,
    heat: 0,        // fractional progress toward the next star
    fleet: [],      // cruisers, all built by the vehicles factory
    unseen: 0,      // seconds since a cruiser last had eyes on
    bust: 0,        // 0..1 meter
    busted: false,
    spawnT: 0,
    rng: makeRng(4242),
  };
}

export function addHeat(law, points) {
  law.heat += points;
  while (law.heat >= 1 && law.stars < LAW.maxStars) {
    law.stars += 1;
    law.heat -= 1;
  }
  if (law.stars >= LAW.maxStars) law.heat = Math.min(law.heat, 0.95);
}

function cruisersWanted(law) {
  return law.stars === 0 ? 0 : Math.min(law.stars + 1, 6);
}

export function stepLaw(law, dt, target, city) {
  if (law.busted) return;
  law.spawnT -= dt;

  const want = cruisersWanted(law);
  if (law.fleet.length < want && law.spawnT <= 0) {
    law.spawnT = 0.7;
    const dist = LAW.spawnMin + law.rng() * (LAW.spawnMax - LAW.spawnMin);
    const p = roadPointAtRing(target.x, target.y, dist, law.rng);
    const cop = makeCar(p.x, p.y, Math.atan2(target.y - p.y, target.x - p.x), 'cruiser');
    cop.stolen = true; // not a car the player can be accused of taking
    law.fleet.push(cop);
  }
  // Cruisers give up and peel off when the heat is gone or they're lost.
  law.fleet = law.fleet.filter((cop) => {
    const d = Math.hypot(cop.x - target.x, cop.y - target.y);
    return !(law.stars === 0 && d > 700) && d < 1150;
  });

  let seen = false;
  let pinning = 0;
  for (const cop of law.fleet) {
    const dx = target.x - cop.x;
    const dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (dist < LAW.sightR) seen = true;
    if (dist < LAW.bustR) pinning += 1;

    // Intercept: aim where the player will be, not where they were.
    const lead = Math.min(0.55, dist / 320);
    const ax = target.x + (target.vx || 0) * lead;
    const ay = target.y + (target.vy || 0) * lead;
    let diff = Math.atan2(ay - cop.y, ax - cop.x) - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.3));
    const throttle = dist > 52 ? 1 : 0.2;
    driveCar(cop, dt, throttle, steer, city);
  }

  if (seen) {
    law.unseen = 0;
  } else if (law.stars > 0) {
    law.unseen += dt;
    if (law.unseen >= LAW.loseTime) {
      law.stars -= 1;
      law.heat = 0;
      law.unseen = 0;
    }
  }

  if (pinning > 0 && law.stars > 0 && target.speed < LAW.slowUnder) {
    law.bust += dt / LAW.bustFill;
    if (law.bust >= 1) {
      law.bust = 1;
      law.busted = true;
    }
  } else {
    law.bust = Math.max(0, law.bust - dt * 0.55);
  }
}

// After a bust: the fine is scaled by the stars at capture, and the
// slate is wiped clean. Returns the amount actually taken.
export function settleBust(law, cash) {
  const fine = Math.min(cash, 140 + law.stars * 95);
  law.stars = 0;
  law.heat = 0;
  law.fleet = [];
  law.unseen = 0;
  law.bust = 0;
  law.busted = false;
  return fine;
}
