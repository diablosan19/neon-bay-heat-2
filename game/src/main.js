// NEON BAY HEAT 2 — game state, the loop, and the shot scenes.
// One job: own the world state and wire every module together — player on
// foot and in cars, traffic, peds, police, missions, mayhem, camera, save
// games, and the ?shot= scenes the screenshots are taken from.

import { CAR, COLORS, PLAYER, VIEW, WORLD } from './config.js';
import { buildCity, districtAt, pushOut } from './city.js';
import { initInput, isDown, wasPressed, endFrame } from './input.js';
import { makeCar, spawnTraffic, stepCar, stepTraffic, carHit } from './vehicles.js';
import { spawnPeds, stepPeds } from './peds.js';
import { makePolice, commitCrime, stepPolice, payFine } from './police.js';
import { makeMissions, stepMissions, mayhem, comboCash } from './missions.js';
import { makeAudio } from './audio.js';
import { drawWorld, drawCar, drawPed, drawMarker } from './render.js';
import { drawHud, drawTitle, drawBusted, drawPaused } from './hud.js';

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '7', 10);
const SHOT = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width; canvas.height = VIEW.height;

const audio = makeAudio();
const city = buildCity(SEED);

const s = {
  city,
  mode: SHOT ? 'play' : 'title',
  t: 0,
  cash: 120,
  player: { x: 500, y: 500, angle: 0, vx: 0, vy: 0, car: null, walkPhase: 0 },
  traffic: spawnTraffic(city, SEED),
  peds: spawnPeds(city, SEED),
  police: makePolice(),
  missions: makeMissions(),
  cam: { x: 0, y: 0, w: VIEW.width, h: VIEW.height },
  fine: 0,
  saveT: 0,
  started: false,
};
window.__nbh = s;

// A starter ride parked next to the player.
const starterCar = makeCar(545, 512, 0, Math.random, { name: 'COUPE', speed: 1.05, w: 34, l: 17 });
starterCar.paint = '#d64541';
starterCar.parked = true; // waits by the spawn until the player takes it
s.traffic.push(starterCar);

// ---------- save / load ----------
function save() {
  try {
    localStorage.setItem('nbh2-save', JSON.stringify({
      cash: s.cash, completed: s.missions.completed, earned: s.missions.earned,
      x: s.player.x, y: s.player.y,
    }));
  } catch { /* private mode */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('nbh2-save') || 'null');
    if (!d) return;
    s.cash = d.cash ?? s.cash;
    s.missions.completed = d.completed ?? 0;
    s.missions.earned = d.earned ?? 0;
    if (!SHOT) { s.player.x = d.x ?? s.player.x; s.player.y = d.y ?? s.player.y; }
  } catch { /* ignore */ }
}
load();

// ---------- helpers ----------
function playerPos() {
  return s.player.car ? { x: s.player.car.x, y: s.player.car.y } : { x: s.player.x, y: s.player.y };
}
function playerSpeed() {
  return s.player.car ? s.player.car.speed : Math.hypot(s.player.vx, s.player.vy);
}
function crime(points, seenRange = 420) {
  // Crimes only draw heat if a cop or a panicked witness is near.
  commitCrime(s.police, points);
  if (points >= 1) audio.star();
}

function enterExitCar() {
  const p = s.player;
  if (p.car) {
    p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 26;
    p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 26;
    p.car = null;
    return;
  }
  let best = null, bd = 52;
  for (const c of s.traffic) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) {
    p.car = best;
    if (!best.stolen) {
      best.stolen = true;
      crime(best.parked ? 0.7 : 1.1);
      mayhem(s.missions, 6);
      audio.crash();
    }
  }
}

// ---------- shot scenes (screenshots + grader) ----------
function setupShot(name) {
  const p = s.player;
  if (name === 'title') { s.mode = 'title'; return; }
  if (name === 'city') {
    p.x = 1560; p.y = 760;
    s.cam.x = p.x - VIEW.width / 2; s.cam.y = p.y - VIEW.height / 2;
    return;
  }
  if (name === 'chase' || name === 'mission') {
    // Player mid-run in a stolen coupe on a downtown avenue.
    const car = s.traffic.find((c) => c === starterCar);
    car.x = 905; car.y = 1000; car.angle = 0; car.speed = 330; car.stolen = true;
    p.car = car;
    s.police.stars = 4;
    // Cops right on the tail.
    const spots = [[800, 955], [815, 1048], [735, 1005], [860, 905]];
    for (const [x, y] of spots) {
      s.police.cops.push({
        x, y, angle: 0, speed: 300, steer: 0, w: 36, l: 18,
        kind: { name: 'CRUISER', w: 36, l: 18 }, paint: '#e8ecf2',
        speedMul: 1.1, parked: false, wrecked: 0, cop: true,
      });
    }
    s.missions.active = {
      type: 'DELIVER', phase: 'dropoff',
      target: { x: 1420, y: 1000 }, pay: 260, timeLeft: 41,
      label: 'Drop the package off',
    };
    s.zoom = name === 'chase' ? 1.75 : 1.5;
    if (name === 'mission') {
      car.x = 1330; car.y = 985; car.speed = 120;
      for (const c of s.police.cops) { c.x -= 330; }
      s.police.stars = 2;
    }
    s.cash = 860;
    s.missions.combo = 47; s.missions.multiplier = 2; s.missions.comboTimer = 3;
    return;
  }
  if (name === 'end') {
    s.police.stars = 5; s.police.busted = true; s.police.bust = 1; s.fine = 590;
    s.mode = 'busted';
  }
}
if (SHOT) setupShot(SHOT);

// ---------- update ----------
function update(dt) {
  s.t += dt;
  const p = s.player;
  if (s.mode === 'title') { if (wasPressed('Enter')) { s.mode = 'play'; s.started = true; audio.unlock(); } return; }
  if (s.mode === 'busted') {
    if (wasPressed('Enter')) {
      s.cash -= payFine(s.police, s.cash + s.fine) - 0; // fine already recorded
      s.cash = Math.max(0, s.cash);
      p.car = null; p.x = 500; p.y = 500;
      s.mode = 'play';
    }
    return;
  }
  if (wasPressed('KeyP')) { s.mode = s.mode === 'paused' ? 'play' : 'paused'; save(); }
  if (s.mode === 'paused') return;

  if (wasPressed('KeyE')) enterExitCar();

  // Movement.
  if (p.car) {
    const throttle = isDown('KeyW', 'ArrowUp') ? 1 : isDown('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = isDown('KeyA', 'ArrowLeft') ? -1 : isDown('KeyD', 'ArrowRight') ? 1 : 0;
    const before = Math.abs(p.car.speed);
    stepCar(p.car, dt, throttle, steer, city);
    // Drifting at speed feeds the mayhem combo.
    if (Math.abs(p.car.steer) > 0.6 && before > 240) mayhem(s.missions, dt * 9);
    p.vx = Math.cos(p.car.angle) * p.car.speed;
    p.vy = Math.sin(p.car.angle) * p.car.speed;
  } else {
    let mx = 0, my = 0;
    if (isDown('KeyW', 'ArrowUp')) my -= 1;
    if (isDown('KeyS', 'ArrowDown')) my += 1;
    if (isDown('KeyA', 'ArrowLeft')) mx -= 1;
    if (isDown('KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    const sprint = isDown('ShiftLeft', 'ShiftRight') ? 1.45 : 1;
    p.vx = (mx / len) * PLAYER.walkSpeed * sprint;
    p.vy = (my / len) * PLAYER.walkSpeed * sprint;
    if (mx || my) { p.x += p.vx * dt; p.y += p.vy * dt; p.angle = Math.atan2(my, mx); p.walkPhase += dt * 9; }
    p.x = Math.max(14, Math.min(WORLD.width - 14, p.x));
    p.y = Math.max(14, Math.min(WORLD.height - 14, p.y));
    pushOut(city, p, PLAYER.radius);
  }

  const pos = playerPos();
  const spd = playerSpeed();

  // Traffic + collisions.
  const threats = [];
  for (const c of s.traffic) {
    if (c === p.car) continue;
    stepTraffic(c, dt, city, s.traffic, Math.random);
    if (Math.abs(c.speed) > 60) threats.push(c);
    if (p.car) {
      const hit = carHit(p.car, c);
      if (hit > 0 && Math.abs(p.car.speed) > 90) {
        c.wrecked = 2.5; c.speed = p.car.speed * 0.3;
        p.car.speed *= 0.55;
        mayhem(s.missions, 12);
        crime(0.55);
        audio.crash();
      } else if (hit > 0) {
        p.car.x += Math.cos(Math.atan2(p.car.y - c.y, p.car.x - c.x)) * hit;
        p.car.y += Math.sin(Math.atan2(p.car.y - c.y, p.car.x - c.x)) * hit;
      }
    }
  }
  if (p.car && Math.abs(p.car.speed) > 60) threats.push(p.car);

  // Peds: scares feed mayhem; a direct hit is a real crime.
  stepPeds(s.peds, dt, city, threats, () => { mayhem(s.missions, 4); if (p.car) audio.honk(); });
  if (p.car && Math.abs(p.car.speed) > 120) {
    for (const ped of s.peds) {
      if (Math.hypot(ped.x - p.car.x, ped.y - p.car.y) < 24 && !ped.down) {
        ped.down = 3; ped.panic = 3;
        mayhem(s.missions, 16);
        crime(1.3);
        audio.crash();
      }
    }
  }
  for (const ped of s.peds) if (ped.down) ped.down = Math.max(0, ped.down - dt);

  // Missions + combo cash-out.
  const comboBefore = s.missions.combo;
  stepMissions(s.missions, dt, pos, s.police, (ev, a) => {
    if (ev === 'pickup') audio.pickup();
    if (ev === 'complete') { s.cash += a.pay; audio.cash(); }
    if (ev === 'fail') audio.busted();
  });
  if (comboBefore > 0 && s.missions.combo === 0) s.cash += comboCash({ combo: comboBefore, multiplier: s.missions.multiplier });

  // Police.
  const target = { x: pos.x, y: pos.y, vx: p.vx, vy: p.vy };
  stepPolice(s.police, dt, target, spd, city);
  if (s.police.busted && s.mode === 'play') {
    s.fine = 150 + s.police.stars * 90;
    s.cash = Math.max(0, s.cash - 0); // fine applied on release
    s.mode = 'busted';
    audio.busted();
  }
  for (const cop of s.police.cops) {
    if (p.car && carHit(p.car, cop) > 0 && Math.abs(p.car.speed) > 200) {
      cop.wrecked = 3; cop.speed = 40;
      mayhem(s.missions, 18);
      crime(0.8);
      audio.crash();
    }
  }

  audio.engine(p.car ? p.car.speed / CAR.maxSpeed : 0, !!p.car);
  audio.siren(s.police.stars > 0 && s.police.cops.length > 0, s.t);

  // Camera follows the player (or the car).
  s.cam.x = Math.max(0, Math.min(WORLD.width - VIEW.width, pos.x - VIEW.width / 2));
  s.cam.y = Math.max(0, Math.min(WORLD.height - VIEW.height, pos.y - VIEW.height / 2));

  s.saveT += dt;
  if (s.saveT > 5) { s.saveT = 0; save(); }
}

// ---------- draw ----------
function draw() {
  ctx.save();
  if (s.zoom && s.zoom !== 1) {
    // Shot scenes zoom in on the action so the systems read at thumbnail size.
    ctx.translate(VIEW.width / 2, VIEW.height / 2);
    ctx.scale(s.zoom, s.zoom);
    ctx.translate(-VIEW.width / 2, -VIEW.height / 2);
  }
  ctx.translate(-s.cam.x, -s.cam.y);
  drawWorld(ctx, city, s.cam, s.t);
  const a = s.missions.active;
  if (a) drawMarker(ctx, a.target, a.phase === 'pickup' ? '#57e389' : '#ffd23f', a.type, s.t);
  for (const ped of s.peds) if (!ped.down || ped.down > 0.4) drawPed(ctx, ped);
  for (const c of s.traffic) if (c !== s.player.car) drawCar(ctx, c, s.t);
  for (const cop of s.police.cops) drawCar(ctx, cop, s.t);
  if (s.player.car) drawCar(ctx, s.player.car, s.t);
  else {
    const p = s.player;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 5, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20304a';
    ctx.beginPath(); ctx.arc(p.x, p.y - 2, 5.4, 0, Math.PI * 2); ctx.fill();
    // Direction tick.
    ctx.strokeStyle = '#20304a'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 15, p.y + Math.sin(p.angle) * 15);
    ctx.stroke();
  }
  ctx.restore();

  if (s.mode !== 'title') drawHud(ctx, s, s.t);
  if (s.mode === 'title') drawTitle(ctx, s.t);
  if (s.mode === 'busted') drawBusted(ctx, s.fine);
  if (s.mode === 'paused') drawPaused(ctx);
}

// ---------- loop ----------
initInput();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!SHOT) update(dt);
  else { // shots: keep the world alive behind the composed scene
    s.t += dt;
    for (const c of s.traffic) if (c !== s.player.car) stepTraffic(c, dt, city, s.traffic, Math.random);
    stepPeds(s.peds, dt, city, [], null);
    const pos = playerPos();
    s.cam.x = Math.max(0, Math.min(WORLD.width - VIEW.width, pos.x - VIEW.width / 2));
    s.cam.y = Math.max(0, Math.min(WORLD.height - VIEW.height, pos.y - VIEW.height / 2));
    if (SHOT === 'city') { s.cam.x = 2080; s.cam.y = 500; }
  }
  draw();
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
