// NEON BAY HEAT 2 — the law.
// Heat is fractional; whole points become stars. Cruisers roll in from
// off-screen, steer for where the player is heading, and try to sit in
// the bust ring around a slow player. Unseen long enough, stars fall.

import { WORLD_W, WORLD_H, LAW } from './config.js';
import { makeCar, driveCar } from './vehicles.js';

export function newLaw() {
  return {
    stars: 0,
    heat: 0,
    fleet: [],
    unseenFor: 0,
    bustMeter: 0,
    busted: false,
  };
}

export function addHeat(law, amount) {
  law.heat += amount;
  while (law.heat >= 1 && law.stars < LAW.maxStars) {
    law.stars += 1;
    law.heat -= 1;
  }
  if (law.stars >= LAW.maxStars) law.heat = Math.min(law.heat, 0.95);
}

function rollIn(law, target) {
  const ang = Math.random() * Math.PI * 2;
  const dist = 600 + Math.random() * 140;
  const x = Math.max(26, Math.min(WORLD_W - 26, target.x + Math.cos(ang) * dist));
  const y = Math.max(26, Math.min(WORLD_H - 26, target.y + Math.sin(ang) * dist));
  const cop = makeCar(x, y, ang + Math.PI, 'cruiser', '#edf0f4');
  cop.top += law.stars * 7; // hotter chases run faster cruisers
  law.fleet.push(cop);
}

export function stepLaw(law, dt, target, city) {
  if (law.busted) return;
  const wanted = law.stars > 0;
  const strength = Math.min(2 + law.stars, 7);
  if (wanted && law.fleet.length < strength) rollIn(law, target);
  if (!wanted && law.fleet.length) {
    law.fleet = law.fleet.filter((c) => Math.hypot(c.x - target.x, c.y - target.y) < 950);
  }

  let anySight = false;
  let inRing = 0;
  for (const cop of law.fleet) {
    const dx = target.x - cop.x;
    const dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (dist < LAW.sightR) anySight = true;
    // Intercept steering: aim ahead of the target's motion.
    const aimX = target.x + (target.vx || 0) * 0.34;
    const aimY = target.y + (target.vy || 0) * 0.34;
    const want = Math.atan2(aimY - cop.y, aimX - cop.x);
    let diff = want - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.6));
    driveCar(cop, dt, dist > 52 ? 1 : 0.3, steer, city);
    if (dist < LAW.bustR && Math.abs(target.speed) < LAW.slowUnder) inRing++;
  }

  law.unseenFor = anySight ? 0 : law.unseenFor + dt;
  if (law.unseenFor > LAW.loseTime && law.stars > 0) {
    law.stars -= 1;
    law.unseenFor = 0;
    if (law.stars === 0) law.fleet.length = 0;
  }

  if (inRing > 0 && wanted) {
    law.bustMeter += dt / LAW.bustFill;
    if (law.bustMeter >= 1) { law.bustMeter = 1; law.busted = true; }
  } else {
    law.bustMeter = Math.max(0, law.bustMeter - dt * 0.65);
  }
}

export function settleBust(law, cash) {
  const fine = Math.min(cash, 140 + law.stars * 95);
  law.stars = 0;
  law.heat = 0;
  law.fleet.length = 0;
  law.bustMeter = 0;
  law.busted = false;
  law.unseenFor = 0;
  return fine;
}
