// NEON BAY HEAT 2 — vehicles: one factory, one physics step, one
// traffic brain. Every car on the street — civilian, parked, stolen or
// police — comes from makeCar, so every car always carries its size in
// top-level w/l fields, its velocity in vx/vy and its nose in heading.

import { WORLD_W, WORLD_H, PITCH, ROAD_W, LANE, CAR_PHYS } from './config.js';
import { rng32, between, pick, chance } from './random.js';
import { pushOutOfBuildings } from './city.js';

export const CAR_TYPES = {
  coupe:   { w: 40, l: 20, top: 452, accel: 372, paint: ['#d64541', '#3f7fbf', '#e2731d', '#8e6cc8'] },
  sedan:   { w: 42, l: 21, top: 402, accel: 318, paint: ['#c0c6cc', '#5b7a99', '#707880', '#4fb3bf'] },
  taxi:    { w: 42, l: 21, top: 392, accel: 312, paint: ['#f2b705'] },
  pickup:  { w: 44, l: 22, top: 372, accel: 300, paint: ['#57a773', '#96684a', '#7a8894'] },
  van:     { w: 47, l: 24, top: 338, accel: 272, paint: ['#d8d3c8', '#88a0b4', '#b08968'] },
  cruiser: { w: 42, l: 21, top: 468, accel: 384, paint: ['#edf0f4'] },
};
const CIVIL = ['coupe', 'sedan', 'sedan', 'taxi', 'pickup', 'van'];

export function makeCar(x, y, heading, type, paint) {
  const spec = CAR_TYPES[type];
  return {
    x, y, heading, vx: 0, vy: 0,
    w: spec.w, l: spec.l,               // top-level size, always present
    type, paint, top: spec.top, accel: spec.accel,
    cop: type === 'cruiser',
    parked: false, stolen: false,
    laneAxis: null,                      // traffic: 'v' | 'h' road it rides
    turnCooldown: 0, nearMissCd: 0, hitCd: 0,
  };
}

export function speedAlong(car) {
  return car.vx * Math.cos(car.heading) + car.vy * Math.sin(car.heading);
}

// Arcade step: throttle along the nose, steering bends the nose, grip
// bleeds sideways slide. Shared by the player and every AI driver.
export function driveCar(car, dt, throttle, steer, city) {
  const fx = Math.cos(car.heading), fy = Math.sin(car.heading);
  let fwd = car.vx * fx + car.vy * fy;
  let lat = car.vx * -fy + car.vy * fx;

  if (throttle > 0) fwd += car.accel * dt;
  else if (throttle < 0) fwd -= (fwd > 4 ? CAR_PHYS.brake : car.accel * 0.7) * dt;
  fwd -= fwd * CAR_PHYS.dragK * dt * (throttle === 0 ? 2.2 : 1);
  fwd = Math.max(-CAR_PHYS.reverseMax, Math.min(car.top, fwd));

  lat -= lat * Math.min(1, CAR_PHYS.grip * dt);
  // Bicycle steering: the nose swings with forward travel and lock.
  car.heading += (fwd / CAR_PHYS.wheelbase) * Math.tan(steer * CAR_PHYS.steerMax) * dt;

  const nfx = Math.cos(car.heading), nfy = Math.sin(car.heading);
  car.vx = nfx * fwd + -nfy * lat;
  car.vy = nfy * fwd + nfx * lat;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.x = Math.max(18, Math.min(WORLD_W - 18, car.x));
  car.y = Math.max(18, Math.min(WORLD_H - 18, car.y));
  pushOutOfBuildings(city, car, CAR_PHYS.crashR);
}

// --- traffic ---------------------------------------------------------------
// A traffic car rides the right-hand lane of one road. Rolling along a
// vertical road its lane is centreline + LANE when heading south and
// centreline - LANE heading north; mirrored for horizontal roads. At a
// junction it may swing onto the crossing road, snapping to that lane.

function nearestLine(lines, v) {
  let best = lines[0], bd = Infinity;
  for (const l of lines) { const d = Math.abs(l - v); if (d < bd) { bd = d; best = l; } }
  return best;
}

export function seedTraffic(city, seed, moving = 24, parked = 30) {
  const rng = rng32(seed * 31 + 7);
  const cars = [];
  const place = (vertical) => {
    const line = vertical ? pick(rng, city.vRoads) : pick(rng, city.hRoads);
    const along = between(rng, 90, (vertical ? WORLD_H : WORLD_W) - 90);
    const dirSign = chance(rng, 0.5) ? 1 : -1;
    const off = LANE * dirSign;
    return {
      x: vertical ? line + off : along,
      y: vertical ? along : line + off,
      heading: vertical ? (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2) : (dirSign > 0 ? 0 : Math.PI),
      axis: vertical ? 'v' : 'h',
    };
  };
  for (let i = 0; i < moving; i++) {
    const p = place(chance(rng, 0.5));
    const car = makeCar(p.x, p.y, p.heading, pick(rng, CIVIL), null);
    car.paint = pick(rng, CAR_TYPES[car.type].paint);
    car.laneAxis = p.axis;
    car.vx = Math.cos(p.heading) * between(rng, 110, 175);
    car.vy = Math.sin(p.heading) * between(rng, 110, 175);
    cars.push(car);
  }
  for (let i = 0; i < parked; i++) {
    const vertical = chance(rng, 0.5);
    const line = vertical ? pick(rng, city.vRoads) : pick(rng, city.hRoads);
    const along = between(rng, 90, (vertical ? WORLD_H : WORLD_W) - 90);
    const side = (ROAD_W / 2 + 16) * (chance(rng, 0.5) ? 1 : -1);
    const car = makeCar(
      vertical ? line + side : along,
      vertical ? along : line + side,
      vertical ? Math.PI / 2 : 0,
      pick(rng, CIVIL), null,
    );
    car.paint = pick(rng, CAR_TYPES[car.type].paint);
    car.parked = true;
    cars.push(car);
  }
  return cars;
}

export function stepTraffic(car, dt, city, world, rng) {
  if (car.parked) return;
  car.turnCooldown -= dt;
  car.nearMissCd -= dt;
  car.hitCd -= dt;

  // Slow for anything looming in the lane ahead.
  let throttle = 0.8;
  const lookX = car.x + Math.cos(car.heading) * 58;
  const lookY = car.y + Math.sin(car.heading) * 58;
  const everyone = [...world.traffic, ...world.cops];
  if (world.playerCar) everyone.push(world.playerCar);
  for (const o of everyone) {
    if (o === car) continue;
    if (Math.hypot(o.x - lookX, o.y - lookY) < 30) { throttle = -0.5; break; }
  }

  // Junction logic: near a crossing centreline, sometimes turn.
  const onV = car.laneAxis === 'v';
  const crossLines = onV ? city.hRoads : city.vRoads;
  const along = onV ? car.y : car.x;
  const cross = nearestLine(crossLines, along);
  let steer = 0;
  if (Math.abs(cross - along) < 10 && car.turnCooldown <= 0 && chance(rng, 0.35)) {
    const turn = chance(rng, 0.5) ? 1 : -1;
    car.heading += turn * Math.PI / 2;
    car.laneAxis = onV ? 'h' : 'v';
    car.turnCooldown = 2.5;
    // Snap onto the new road's right-hand lane.
    if (car.laneAxis === 'v') {
      const line = nearestLine(city.vRoads, car.x);
      const south = Math.sin(car.heading) > 0;
      car.x = line + (south ? LANE : -LANE);
    } else {
      const line = nearestLine(city.hRoads, car.y);
      const east = Math.cos(car.heading) > 0;
      car.y = line + (east ? -LANE : LANE);
    }
  }
  // Gentle lane keeping: drift back toward the lane centre.
  if (car.laneAxis === 'v') {
    const line = nearestLine(city.vRoads, car.x);
    const want = line + (Math.sin(car.heading) > 0 ? LANE : -LANE);
    steer = Math.max(-0.4, Math.min(0.4, (want - car.x) * 0.02));
  } else if (car.laneAxis === 'h') {
    const line = nearestLine(city.hRoads, car.y);
    const want = line + (Math.cos(car.heading) > 0 ? -LANE : LANE);
    steer = Math.max(-0.4, Math.min(0.4, (car.y - want) * 0.02 * (Math.cos(car.heading) > 0 ? 1 : -1)));
  }
  driveCar(car, dt, throttle, steer, city);
}

// Circle overlap between two cars; returns push-apart info or null.
export function carOverlap(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const min = (a.w + b.w) / 2.6;
  const d = Math.hypot(dx, dy);
  if (d >= min || d === 0) return null;
  return { nx: dx / d, ny: dy / d, depth: min - d };
}
