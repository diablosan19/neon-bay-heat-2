// NEON BAY HEAT 2 — cars: the player's ride, traffic and parked cars.
// One job: vehicle physics (arcade grip model) and traffic that drives the
// road grid, turns at junctions and brakes for trouble ahead.

import { CAR, WORLD } from './config.js';
import { makeRng, pick, range } from './random.js';
import { pushOut } from './city.js';

const PAINT = ['#d64541', '#3f7fbf', '#e0a51f', '#57a773', '#8e6cc8', '#c0c6cc', '#e2731d', '#4fb3bf', '#b83a5e', '#707880'];
const KINDS = [
  { name: 'COUPE', speed: 1.05, w: 34, l: 17 },
  { name: 'SEDAN', speed: 0.92, w: 36, l: 18 },
  { name: 'TAXI', speed: 0.9, w: 36, l: 18, paint: '#f2b705' },
  { name: 'VAN', speed: 0.78, w: 40, l: 20 },
  { name: 'PICKUP', speed: 0.85, w: 38, l: 19 },
];

export function makeCar(x, y, angle, rng, kind = null) {
  const k = kind || pick(rng, KINDS);
  return {
    x, y, angle, speed: 0, steer: 0,
    kind: k, paint: k.paint || pick(rng, PAINT),
    w: k.w, l: k.l, speedMul: k.speed,
    driver: null, parked: false, wrecked: 0, honk: 0,
  };
}

// Arcade car step shared by the player and AI drivers.
export function stepCar(car, dt, throttle, steer, city) {
  const target = throttle > 0 ? CAR.maxSpeed * car.speedMul : throttle < 0 ? -CAR.maxReverse : 0;
  const rate = throttle !== 0 ? CAR.accel : CAR.brake;
  car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), rate * dt * (throttle !== 0 ? 1 : 0.6));
  if (throttle === 0) car.speed *= Math.max(0, 1 - 1.6 * dt);
  car.steer += (steer - car.steer) * Math.min(1, 10 * dt);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += car.steer * CAR.turnRate * dir * dt * Math.min(1, Math.abs(car.speed) / 120);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(20, Math.min(WORLD.width - 20, car.x));
  car.y = Math.max(20, Math.min(WORLD.height - 20, car.y));
  pushOut(city, car, CAR.radius);
}

// Spawn parked cars along roadsides and a fleet of moving traffic.
export function spawnTraffic(city, seed, count = 26) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const cars = [];
  const allRoads = [...city.vRoads.map((x) => ({ v: true, at: x })), ...city.hRoads.map((y) => ({ v: false, at: y }))];
  for (let i = 0; i < count; i++) {
    const road = pick(rng, allRoads);
    const t = range(rng, 80, (road.v ? WORLD.height : WORLD.beachX) - 80);
    const lane = rng() < 0.5 ? -13 : 13;
    const x = road.v ? road.at + lane : t;
    const y = road.v ? t : road.at + lane;
    const angle = road.v ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
    const car = makeCar(x, y, angle, rng);
    car.road = road; car.lane = lane;
    car.speed = range(rng, 120, 200);
    cars.push(car);
  }
  // Parked cars tucked against blocks.
  for (let i = 0; i < 34; i++) {
    const road = pick(rng, allRoads);
    const t = range(rng, 90, (road.v ? WORLD.height : WORLD.beachX) - 90);
    const side = rng() < 0.5 ? -44 : 44;
    const x = road.v ? road.at + side : t;
    const y = road.v ? t : road.at + side;
    const car = makeCar(x, y, road.v ? Math.PI / 2 : 0, rng);
    car.parked = true;
    pushOut(city, car, 16); // never leave a parked car inside a building
    cars.push(car);
  }
  return cars;
}

// Traffic brain: follow the lane, slow for the car ahead, turn at junctions.
export function stepTraffic(car, dt, city, others, rng) {
  if (car.parked || car.wrecked > 0) return;
  let throttle = 0.75;
  // Brake for anything close ahead.
  const ax = car.x + Math.cos(car.angle) * 52, ay = car.y + Math.sin(car.angle) * 52;
  for (const o of others) {
    if (o === car) continue;
    const dx = o.x - ax, dy = o.y - ay;
    if (dx * dx + dy * dy < 34 * 34) { throttle = -0.4; car.honk = 0.7; break; }
  }
  // Junction turns: near a crossing, sometimes swing onto the cross road.
  const nearV = city.vRoads.some((x) => Math.abs(car.x - x) < 8);
  const nearH = city.hRoads.some((y) => Math.abs(car.y - y) < 8);
  let steer = 0;
  if (nearV && nearH && rng() < 0.012) {
    car.turning = (rng() < 0.5 ? -1 : 1) * (Math.PI / 2);
  }
  if (car.turning) {
    steer = Math.sign(car.turning);
    car.turning -= steer * CAR.turnRate * dt * 0.9;
    if (Math.abs(car.turning) < 0.06) { car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2); car.turning = 0; }
  }
  stepCar(car, dt, throttle, steer, city);
}

// Circle collision between two cars; returns overlap depth.
export function carHit(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const d = Math.hypot(dx, dy), min = 30;
  return d < min ? min - d : 0;
}
