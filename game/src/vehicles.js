// NEON BAY HEAT 2 — vehicles.
// One physics step shared by the player, traffic and police: velocity is
// split into forward and sideways parts, the engine pushes the forward
// part, and grip bleeds the sideways part away — that is what makes
// handbrake-feel slides and tidy cornering come out of the same code.

import { DRIVE, ROAD_W, WORLD_W, WORLD_H, SHORE_X } from './config.js';
import { rngFrom, between, choose } from './random.js';
import { resolveBuildingHit } from './city.js';

export const CAR_TYPES = {
  coupe: { label: 'COUPE', w: 38, l: 19, top: 452, accelMul: 1.12, colors: ['#d64541', '#e2731d', '#b83a5e', '#3f7fbf'] },
  sedan: { label: 'SEDAN', w: 39, l: 20, top: 402, accelMul: 0.95, colors: ['#8f9aa6', '#4f6274', '#c0c6cc', '#5a6e56'] },
  taxi: { label: 'TAXI', w: 39, l: 20, top: 398, accelMul: 0.92, colors: ['#f2b705'] },
  van: { label: 'VAN', w: 43, l: 22, top: 348, accelMul: 0.8, colors: ['#d8d8d8', '#7a8894', '#a6542f'] },
  pickup: { label: 'PICKUP', w: 41, l: 21, top: 382, accelMul: 0.88, colors: ['#57a773', '#4fb3bf', '#707880', '#94572f'] },
};
const TYPE_KEYS = Object.keys(CAR_TYPES);

export function makeVehicle(x, y, heading, typeKey, color) {
  const t = CAR_TYPES[typeKey];
  return {
    x, y, heading, vx: 0, vy: 0,
    w: t.w, l: t.l, type: typeKey, color,
    top: t.top, accelMul: t.accelMul,
    parked: false, taken: false, cop: false,
    cruise: between(Math.random, 128, 196),
    axis: null, laneSign: 1, honkT: 0, smashT: 0,
  };
}

export function forwardSpeed(car) {
  return car.vx * Math.cos(car.heading) + car.vy * Math.sin(car.heading);
}

// throttle: -1..1, steer: -1..1. Returns the forward speed after the step.
export function stepVehicle(car, dt, throttle, steer, city) {
  const fx = Math.cos(car.heading), fy = Math.sin(car.heading);
  let fwd = car.vx * fx + car.vy * fy;
  let latX = car.vx - fx * fwd, latY = car.vy - fy * fwd;

  if (throttle > 0) {
    fwd += DRIVE.engine * car.accelMul * throttle * dt;
    if (fwd > car.top) fwd = Math.max(car.top, fwd - 260 * dt);
  } else if (throttle < 0) {
    if (fwd > 12) fwd -= DRIVE.brake * dt;                    // braking
    else fwd = Math.max(-DRIVE.reverseTop, fwd + DRIVE.engine * throttle * dt * 0.7);
  } else {
    const bleed = DRIVE.drag + DRIVE.rollDrag * Math.min(1, Math.abs(fwd) / 160);
    fwd -= fwd * Math.min(1, bleed * dt);
  }

  // Steering bites harder the faster you roll, and flips in reverse.
  const speedFactor = Math.max(-1, Math.min(1, fwd / 130));
  car.heading += steer * DRIVE.steerRate * speedFactor * dt * (Math.abs(fwd) > 4 ? 1 : 0);

  const grip = Math.exp(-DRIVE.lateralGrip * dt);
  latX *= grip; latY *= grip;

  const nfx = Math.cos(car.heading), nfy = Math.sin(car.heading);
  car.vx = nfx * fwd + latX;
  car.vy = nfy * fwd + latY;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.x = Math.max(18, Math.min(WORLD_W - 18, car.x));
  car.y = Math.max(18, Math.min(WORLD_H - 18, car.y));
  resolveBuildingHit(city, car, DRIVE.hitRadius);
  if (car.honkT > 0) car.honkT -= dt;
  if (car.smashT > 0) car.smashT -= dt;
  return fwd;
}

// --- traffic -------------------------------------------------------------
// Cars pick a road and a direction, hold the right-hand lane, and at each
// junction roll the dice on turning. Braking for the car ahead is a
// simple look-ahead along their own heading.

export function spawnTraffic(city, seed) {
  const rng = rngFrom(seed * 31 + 7);
  const cars = [];
  const roads = [];
  for (const x of city.vRoads) roads.push({ axis: 'v', at: x });
  for (const y of city.hRoads) roads.push({ axis: 'h', at: y });

  const place = (parked) => {
    const road = choose(rng, roads);
    const along = road.axis === 'v' ? between(rng, 90, WORLD_H - 90) : between(rng, 90, SHORE_X - 90);
    const dir = rng() < 0.5 ? 1 : -1;
    let x, y, heading;
    if (parked) {
      const side = rng() < 0.5 ? -1 : 1;
      const off = side * (ROAD_W / 2 + 13);
      x = road.axis === 'v' ? road.at + off : along;
      y = road.axis === 'v' ? along : road.at + off;
      heading = road.axis === 'v' ? Math.PI / 2 : 0;
      if (rng() < 0.5) heading += Math.PI;
    } else {
      const off = dir * (ROAD_W / 4) * (road.axis === 'v' ? 1 : -1);
      x = road.axis === 'v' ? road.at + off : along;
      y = road.axis === 'v' ? along : road.at - off;
      heading = road.axis === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    }
    const car = makeVehicle(x, y, heading, choose(rng, TYPE_KEYS));
    car.color = choose(rng, CAR_TYPES[car.type].colors);
    car.parked = parked;
    car.axis = road.axis;
    car.roadAt = road.at;
    car.dir = dir;
    return car;
  };

  for (let i = 0; i < 30; i++) cars.push(place(false));
  for (let i = 0; i < 36; i++) cars.push(place(true));
  return cars;
}

export function driveTraffic(car, dt, city, world) {
  if (car.parked || car === world.playerCar) return;
  // Look ahead: anything close in front means brake and lean on the horn.
  let throttle = 0.62;
  const noseX = car.x + Math.cos(car.heading) * 56;
  const noseY = car.y + Math.sin(car.heading) * 56;
  for (const other of world.cars) {
    if (other === car) continue;
    const dx = other.x - noseX, dy = other.y - noseY;
    if (dx * dx + dy * dy < 36 * 36) { throttle = -0.5; car.honkT = 0.6; break; }
  }
  for (const cop of world.cops) {
    const dx = cop.x - noseX, dy = cop.y - noseY;
    if (dx * dx + dy * dy < 36 * 36) { throttle = -0.5; break; }
  }
  if (world.onFoot) {
    const dx = world.player.x - noseX, dy = world.player.y - noseY;
    if (dx * dx + dy * dy < 34 * 34) throttle = -0.6;
  }

  // Junction logic: near a crossing road, sometimes take the turn.
  const crossList = car.axis === 'v' ? city.hRoads : city.vRoads;
  const along = car.axis === 'v' ? car.y : car.x;
  for (const cross of crossList) {
    if (Math.abs(along - cross) < 10 && Math.random() < 0.011) {
      car.axis = car.axis === 'v' ? 'h' : 'v';
      car.roadAt = cross;
      car.dir = Math.random() < 0.5 ? 1 : -1;
      break;
    }
  }
  // Steer toward the lane centre of the current road and the axis heading.
  const lateral = car.axis === 'v' ? car.x - car.roadAt : car.y - car.roadAt;
  const laneTarget = (car.axis === 'v' ? 1 : -1) * car.dir * (ROAD_W / 4);
  const baseHeading = car.axis === 'v'
    ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
    : (car.dir > 0 ? 0 : Math.PI);
  let want = baseHeading + Math.max(-0.5, Math.min(0.5, (lateral - laneTarget) * 0.012)) * (car.axis === 'v' ? -car.dir : car.dir);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.6));
  const fwd = forwardSpeed(car);
  if (fwd > car.cruise) throttle = Math.min(throttle, -0.25);
  stepVehicle(car, dt, throttle, steer, city);
}

// Circle overlap between two vehicles (used for shunts and rams).
export function overlap(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const d = Math.hypot(dx, dy);
  const min = 33;
  return d < min && d > 0.001 ? { depth: min - d, nx: dx / d, ny: dy / d } : null;
}
