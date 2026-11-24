// NEON BAY HEAT 2 — cars and driving.
// One factory builds every vehicle in the game, traffic, parked wrecks
// and police cruisers alike, so they all share the same shape: position,
// heading, a velocity vector, and top-level w (length along the heading)
// and l (width across it) that the renderer and collisions rely on.
// Driving is a light bicycle model: velocity is split into forward and
// sideways parts, grip bleeds the sideways part away, and the front
// wheels yaw the car in proportion to forward speed — so handbrake
// moments and long slides fall out of the maths rather than a script.

import { WORLD_W, WORLD_H, ROAD_W, LANE_OFF, PHYS } from './config.js';
import { makeRng, pick, randRange } from './random.js';
import { V_ROADS, H_ROADS, pushOutOfBuildings, nearestRoadPoint } from './city.js';

export const CAR_TYPES = {
  coupe:   { w: 44, l: 21, top: 336, accel: 305, colors: ['#d64541', '#3f7fbf', '#e0a51f', '#57a773', '#b83a5e'] },
  sedan:   { w: 47, l: 22, top: 292, accel: 258, colors: ['#8d99a6', '#4a5568', '#c0c6cc', '#5b7a99', '#707880'] },
  taxi:    { w: 47, l: 22, top: 284, accel: 252, colors: ['#f2b705'] },
  pickup:  { w: 48, l: 23, top: 272, accel: 246, colors: ['#7a4a2b', '#3e5c50', '#96502a', '#54606e'] },
  van:     { w: 52, l: 24, top: 244, accel: 218, colors: ['#d8d8d2', '#9fb3c8', '#c8b89a', '#88a0b0'] },
  cruiser: { w: 48, l: 22, top: 348, accel: 318, colors: ['#edf0f4'] },
};
const TRAFFIC_TYPES = ['coupe', 'sedan', 'sedan', 'taxi', 'pickup', 'van'];

export function makeCar(x, y, heading, type, color) {
  const spec = CAR_TYPES[type] || CAR_TYPES.sedan;
  return {
    x, y, heading,
    vx: 0, vy: 0,
    w: spec.w, l: spec.l,
    type, color: color || spec.colors[0],
    top: spec.top, accel: spec.accel,
    cop: type === 'cruiser',
    parked: false, stolen: false,
    steerVis: 0, hitCd: 0, nearMissCd: 0, downT: 0,
    ai: null,
  };
}

export function speedAlong(car) {
  return car.vx * Math.cos(car.heading) + car.vy * Math.sin(car.heading);
}

export function driveCar(car, dt, throttle, steer, city) {
  const fx = Math.cos(car.heading);
  const fy = Math.sin(car.heading);
  let fwd = car.vx * fx + car.vy * fy;
  let lat = car.vx * -fy + car.vy * fx;

  lat -= lat * Math.min(1, PHYS.grip * dt);
  if (throttle > 0) {
    fwd += car.accel * dt * Math.max(0, 1 - fwd / car.top);
  } else if (throttle < 0) {
    fwd -= (fwd > 8 ? PHYS.brakeDecel : car.accel * 0.7) * dt;
    if (fwd < -PHYS.reverseTop) fwd = -PHYS.reverseTop;
  }
  fwd -= fwd * PHYS.drag * dt;

  const steerAngle = steer * PHYS.steerMax;
  car.steerVis += (steerAngle - car.steerVis) * Math.min(1, 11 * dt);
  // Bicycle yaw: proportional to signed forward speed, so reversing
  // with the wheel turned swings the nose the way a real car does.
  if (Math.abs(fwd) > 1) {
    car.heading += (fwd / PHYS.wheelbase) * Math.tan(car.steerVis) * dt;
  }

  car.vx = fx * fwd - fy * lat;
  car.vy = fy * fwd + fx * lat;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.x = Math.max(18, Math.min(WORLD_W - 18, car.x));
  car.y = Math.max(18, Math.min(WORLD_H - 18, car.y));
  if (pushOutOfBuildings(city, car, PHYS.hitR)) {
    car.vx *= 0.4;
    car.vy *= 0.4;
  }
}

// Circle overlap between two cars, with the push-apart normal.
export function carOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = (a.w + b.w) * 0.32;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min || d2 === 0) return null;
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, depth: min - d };
}

// --- traffic -----------------------------------------------------------------
// A traffic car follows a lane: it aims at a point ahead of itself that
// is pinned to its lane centre, and at some junctions it elects to turn
// onto the crossing road. Right-hand traffic throughout: the lane sits
// on the driver's right of the centreline.

function lanePoint(car) {
  const ai = car.ai;
  const ahead = 150;
  if (ai.axis === 'v') {
    const laneX = ai.road + (ai.dir > 0 ? -LANE_OFF : LANE_OFF);
    return { x: laneX, y: car.y + ai.dir * ahead };
  }
  const laneY = ai.road + (ai.dir > 0 ? LANE_OFF : -LANE_OFF);
  return { x: car.x + ai.dir * ahead, y: laneY };
}

function seedAi(car, rng) {
  const vertical = rng() < 0.5;
  car.ai = {
    axis: vertical ? 'v' : 'h',
    road: vertical ? pick(rng, V_ROADS) : pick(rng, H_ROADS),
    dir: rng() < 0.5 ? 1 : -1,
    cruise: randRange(rng, 118, 196),
    junctionKey: '',
  };
  const ai = car.ai;
  if (ai.axis === 'v') {
    car.x = ai.road + (ai.dir > 0 ? -LANE_OFF : LANE_OFF);
    car.heading = ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.y = ai.road + (ai.dir > 0 ? LANE_OFF : -LANE_OFF);
    car.heading = ai.dir > 0 ? 0 : Math.PI;
  }
}

export function seedTraffic(city, seed) {
  const rng = makeRng(seed * 31 + 7);
  const cars = [];
  for (let i = 0; i < 26; i++) {
    const type = pick(rng, TRAFFIC_TYPES);
    const car = makeCar(randRange(rng, 120, 2600), randRange(rng, 120, 2280), 0, type, pick(rng, CAR_TYPES[type].colors));
    seedAi(car, rng);
    car.vx = Math.cos(car.heading) * car.ai.cruise * 0.7;
    car.vy = Math.sin(car.heading) * car.ai.cruise * 0.7;
    cars.push(car);
  }
  // Parked cars: some in the marked lots, some nosed to the kerb.
  for (const spot of city.parkingSpots) {
    if (rng() < 0.42) continue;
    const type = pick(rng, TRAFFIC_TYPES);
    const car = makeCar(spot.x, spot.y, spot.heading, type, pick(rng, CAR_TYPES[type].colors));
    car.parked = true;
    cars.push(car);
  }
  for (let i = 0; i < 10; i++) {
    const onV = rng() < 0.5;
    const road = onV ? pick(rng, V_ROADS) : pick(rng, H_ROADS);
    const along = randRange(rng, 120, onV ? WORLD_H - 120 : 2600);
    const side = rng() < 0.5 ? -1 : 1;
    const off = ROAD_W / 2 - 11;
    const type = pick(rng, TRAFFIC_TYPES);
    const car = makeCar(
      onV ? road + side * off : along,
      onV ? along : road + side * off,
      onV ? Math.PI / 2 : 0, type, pick(rng, CAR_TYPES[type].colors),
    );
    car.parked = true;
    cars.push(car);
  }
  return cars;
}

export function stepTraffic(car, dt, city, world, rng) {
  if (car.parked || car.downT > 0) return;
  const ai = car.ai;
  if (!ai) return;

  // Dead-end discipline: avenues stop at the beach and at the map rim,
  // so a car running out of road ahead turns around instead of driving
  // into the sea or the scenery.
  if (ai.axis === 'h') {
    if (ai.dir > 0 && car.x > V_ROADS[V_ROADS.length - 1] + 24) ai.dir = -1;
    if (ai.dir < 0 && car.x < V_ROADS[0] - 24) ai.dir = 1;
  } else {
    if (ai.dir > 0 && car.y > H_ROADS[H_ROADS.length - 1] + 24) ai.dir = -1;
    if (ai.dir < 0 && car.y < H_ROADS[0] - 24) ai.dir = 1;
  }

  // Junction election, rolled once per crossing.
  const cross = ai.axis === 'v' ? H_ROADS : V_ROADS;
  for (const c of cross) {
    const along = ai.axis === 'v' ? car.y : car.x;
    if (Math.abs(along - c) > 30) continue;
    const key = `${ai.axis}:${ai.road}:${c}`;
    if (ai.junctionKey !== key) {
      ai.junctionKey = key;
      if (rng() < 0.34) {
        ai.axis = ai.axis === 'v' ? 'h' : 'v';
        ai.road = c;
        ai.dir = rng() < 0.5 ? 1 : -1;
      }
    }
  }

  const target = lanePoint(car);
  let want = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.1));

  // Brake for anything solid in the next half-second of travel.
  let throttle = speedAlong(car) < ai.cruise ? 0.85 : 0;
  const fx = Math.cos(car.heading);
  const fy = Math.sin(car.heading);
  const others = [...world.traffic, ...world.cops];
  if (world.playerCar) others.push(world.playerCar);
  for (const o of others) {
    if (o === car) continue;
    const rx = o.x - car.x;
    const ry = o.y - car.y;
    const ahead = rx * fx + ry * fy;
    const side = Math.abs(rx * -fy + ry * fx);
    if (ahead > 6 && ahead < 52 && side < 15) { throttle = -0.6; break; }
  }
  driveCar(car, dt, throttle, steer, city);
}

// A spawn point on asphalt at a given distance from a target — cruisers
// roll in from here so the player never sees them pop into existence.
export function roadPointAtRing(x, y, dist, rng) {
  const a = rng() * Math.PI * 2;
  const p = nearestRoadPoint(
    Math.max(40, Math.min(WORLD_W - 40, x + Math.cos(a) * dist)),
    Math.max(40, Math.min(WORLD_H - 40, y + Math.sin(a) * dist)),
  );
  return p;
}
