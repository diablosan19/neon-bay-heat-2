// NEON BAY HEAT 2 — the wanted system and its cruisers.
// Heat is a fractional score; whole points become stars. Cruisers roll in
// from just off-screen, steer for an intercept point ahead of the player,
// and try to sit on top of a slow player until the bust meter fills.
// Break sight for long enough and the stars cool off one at a time.

import { HEAT, WORLD_W, WORLD_H } from './config.js';
import { stepVehicle, forwardSpeed } from './vehicles.js';

export function newPolice() {
  return {
    stars: 0,
    heat: 0,
    fleet: [],        // live cruiser objects
    lostT: 0,         // seconds since a cruiser last had eyes on the player
    bust: 0,          // 0..1
    busted: false,
    flashT: 0,
  };
}

export function addHeat(police, amount) {
  if (police.busted) return;
  police.heat += amount;
  while (police.heat >= 1 && police.stars < HEAT.starCap) {
    police.stars += 1;
    police.heat -= 1;
  }
  if (police.stars >= HEAT.starCap) police.heat = Math.min(police.heat, 0.95);
}

function launchCruiser(police, target) {
  const ang = Math.random() * Math.PI * 2;
  const dist = 580 + Math.random() * 140;
  const x = Math.max(26, Math.min(WORLD_W - 26, target.x + Math.cos(ang) * dist));
  const y = Math.max(26, Math.min(WORLD_H - 26, target.y + Math.sin(ang) * dist));
  police.fleet.push({
    x, y, heading: ang + Math.PI, vx: 0, vy: 0,
    w: 39, l: 20, type: 'cruiser', color: '#eef1f5',
    top: 415 + police.stars * 14, accelMul: 1.04,
    parked: false, taken: false, cop: true,
    cruise: 0, axis: null, laneSign: 1, honkT: 0, smashT: 0,
  });
}

export function stepPolice(police, dt, target, city) {
  police.flashT += dt;
  if (police.busted) return;

  const wanted = police.stars;
  const strength = wanted === 0 ? 0 : Math.min(2 + wanted, 7);
  if (wanted > 0 && police.fleet.length < strength) launchCruiser(police, target);
  if (wanted === 0) {
    // No heat: cruisers give up and leave the world.
    police.fleet = police.fleet.filter((c) => Math.hypot(c.x - target.x, c.y - target.y) < 950);
  }

  let eyesOn = false;
  let pinning = false;
  const targetSpeed = Math.abs(target.speed);

  for (const cop of police.fleet) {
    const dx = target.x - cop.x;
    const dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (dist < HEAT.viewDist) eyesOn = true;

    // Aim where the target will be shortly, then settle onto its tail.
    const aimX = target.x + target.vx * 0.38;
    const aimY = target.y + target.vy * 0.38;
    let want = Math.atan2(aimY - cop.y, aimX - cop.x);
    let diff = want - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.5));
    const fwd = forwardSpeed(cop);
    let throttle = 1;
    if (dist < 42) throttle = 0.15;
    else if (dist < 90 && fwd > targetSpeed + 30) throttle = -0.3;
    stepVehicle(cop, dt, throttle, steer, city);

    if (dist < HEAT.bustRange && targetSpeed < 58) pinning = true;
  }

  police.lostT = eyesOn ? 0 : police.lostT + dt;
  if (police.lostT > HEAT.coolTime && police.stars > 0) {
    police.stars -= 1;
    police.lostT = 0;
    if (police.stars === 0) { police.heat = 0; police.fleet.length = 0; }
  }

  if (pinning && police.stars > 0) {
    police.bust += dt / HEAT.bustSeconds;
    if (police.bust >= 1) { police.bust = 1; police.busted = true; }
  } else {
    police.bust = Math.max(0, police.bust - dt * 0.65);
  }
}

export function bustFine(police, cash) {
  const fine = Math.min(cash, 140 + police.stars * 95);
  police.stars = 0;
  police.heat = 0;
  police.fleet.length = 0;
  police.bust = 0;
  police.busted = false;
  police.lostT = 0;
  return fine;
}
