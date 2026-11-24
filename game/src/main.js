// NEON BAY HEAT 2 — the game.
// Owns the state and the frame loop and stitches the modules together:
// the player on foot and behind wheels, theft, shunts and mayhem, the
// crowd, the law, the jobs, sound, camera, saving — and the composed
// ?shot= scenes the entry screenshots are framed from.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, WALK, COL } from './config.js';
import { buildCity, pushOutOfBuildings } from './city.js';
import { bindKeyboard, heldKey, hitKey, frameDone } from './input.js';
import { makeCar, driveCar, speedAlong, seedTraffic, stepTraffic, carOverlap } from './vehicles.js';
import { seedCrowd, stepCrowd } from './peds.js';
import { newLaw, addHeat, stepLaw, settleBust } from './police.js';
import { newJobs, stepJobs, addMayhem } from './missions.js';
import { createAudio } from './audio.js';
import { paintWorld, paintCar, paintPed, paintGoal } from './render.js';
import { paintHud, paintTitle, paintBusted, paintPaused } from './hud.js';

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '7', 10) || 7;
const SHOT = params.get('shot');

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const audio = createAudio();
const city = buildCity(SEED);

const s = {
  city,
  mode: SHOT === 'title' ? 'title' : 'play',
  time: 0,
  cash: 120,
  player: { x: 322, y: 356, heading: 0, vx: 0, vy: 0 },
  onFoot: true,
  car: null,
  traffic: seedTraffic(city, SEED),
  crowd: seedCrowd(SEED),
  law: newLaw(),
  jobs: newJobs(),
  cam: { x: 600, y: 480, zoom: 1 },
  fine: 0,
  saveT: 0,
};
window.__nbh = s;

// A red coupe idling by the spawn corner — most players' first theft.
const starter = makeCar(384, 372, 0, 'coupe', '#d64541');
starter.parked = true;
s.traffic.push(starter);

// --- save / restore ----------------------------------------------------------
function persist() {
  try {
    localStorage.setItem('nbh2-save', JSON.stringify({
      cash: s.cash, done: s.jobs.done, banked: s.jobs.banked,
      px: Math.round(s.player.x), py: Math.round(s.player.y),
    }));
  } catch { /* storage blocked: the run just won't persist */ }
}
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem('nbh2-save') || 'null');
    if (!d) return;
    if (Number.isFinite(d.cash)) s.cash = d.cash;
    if (Number.isFinite(d.done)) s.jobs.done = d.done;
    if (Number.isFinite(d.banked)) s.jobs.banked = d.banked;
    if (!SHOT && Number.isFinite(d.px)) { s.player.x = d.px; s.player.y = d.py; }
  } catch { /* a broken save is no save */ }
}
restore();

function focus() { return s.onFoot ? s.player : s.car; }
function focusMotion() {
  if (s.onFoot) return { vx: s.player.vx, vy: s.player.vy, speed: Math.hypot(s.player.vx, s.player.vy) };
  return { vx: s.car.vx, vy: s.car.vy, speed: speedAlong(s.car) };
}

// --- getting in and out of cars ----------------------------------------------
function toggleCar() {
  if (!s.onFoot) {
    const car = s.car;
    s.player.x = car.x + Math.cos(car.heading + Math.PI / 2) * 28;
    s.player.y = car.y + Math.sin(car.heading + Math.PI / 2) * 28;
    s.player.heading = car.heading;
    car.parked = true;
    car.vx = 0; car.vy = 0;
    s.car = null;
    s.onFoot = true;
    return;
  }
  let best = null, bestD = 58;
  for (const c of s.traffic) {
    const d = Math.hypot(c.x - s.player.x, c.y - s.player.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return;
  s.car = best;
  s.onFoot = false;
  best.parked = false;
  if (!best.stolen) {
    best.stolen = true;
    addHeat(s.law, Math.abs(speedAlong(best)) > 30 ? 1.1 : 0.7);
    addMayhem(s.jobs, 6);
    audio.thud();
  }
}

// --- composed scenes for the screenshots ---------------------------------------
function poseShot(name) {
  if (name === 'title') { s.cam.x = 880; s.cam.y = 600; s.cam.zoom = 1; return; }
  if (name === 'city') {
    s.player.x = 2380; s.player.y = 820;
    s.cam.x = 2340; s.cam.y = 840; s.cam.zoom = 0.5;
    return;
  }
  // Chase and mission both put the player in the starter coupe on the
  // east–west avenue at y = 650 (a road centreline), goal to the east.
  const car = starter;
  car.parked = false;
  car.stolen = true;
  s.car = car;
  s.onFoot = false;
  s.traffic = s.traffic.filter((c) => c === car || Math.hypot(c.x - 1100, c.y - 650) > 260);
  const cruiserAt = (x, y, vx) => {
    const cop = makeCar(x, y, 0, 'cruiser', '#edf0f4');
    cop.vx = vx;
    cop.stolen = true;
    return cop;
  };
  if (name === 'chase') {
    car.x = 1030; car.y = 667; car.heading = 0; car.vx = 335; car.vy = 0;
    s.law.stars = 4;
    s.law.heat = 0.4;
    s.law.fleet = [cruiserAt(905, 632, 305), cruiserAt(918, 702, 305), cruiserAt(838, 667, 295), cruiserAt(985, 616, 315)];
    s.jobs.current = {
      kind: 'DELIVER', stage: 'drop', goal: { x: 1330, y: 650 },
      reward: 260, clock: 41, text: 'Drop the package off',
    };
    s.jobs.combo = 47; s.jobs.mult = 2; s.jobs.comboLeft = 3;
    s.cash = 860;
    s.cam.zoom = 1.7;
  }
  if (name === 'mission') {
    car.x = 1440; car.y = 667; car.heading = 0; car.vx = 105; car.vy = 0;
    s.law.stars = 2;
    s.law.fleet = [cruiserAt(1292, 632, 205), cruiserAt(1340, 702, 205)];
    s.jobs.current = {
      kind: 'DELIVER', stage: 'drop', goal: { x: 1565, y: 650 },
      reward: 260, clock: 23, text: 'Drop the package off',
    };
    s.jobs.combo = 18; s.jobs.mult = 1; s.jobs.comboLeft = 3;
    s.cash = 640;
    s.cam.zoom = 1.45;
  }
}
if (SHOT) poseShot(SHOT);

// --- update ---------------------------------------------------------------------
function update(dt) {
  s.time += dt;

  if (s.mode === 'title') {
    if (hitKey('Enter')) { s.mode = 'play'; audio.unlock(); }
    idle(dt);
    return;
  }
  if (s.mode === 'busted') {
    if (hitKey('Enter')) {
      s.cash -= settleBust(s.law, s.cash);
      s.onFoot = true;
      s.car = null;
      s.player.x = 322; s.player.y = 356;
      s.mode = 'play';
      persist();
    }
    return;
  }
  if (hitKey('KeyP')) {
    s.mode = s.mode === 'paused' ? 'play' : 'paused';
    if (s.mode === 'paused') persist();
  }
  if (s.mode === 'paused') return;

  if (hitKey('KeyE')) toggleCar();

  if (s.onFoot) {
    let mx = 0, my = 0;
    if (heldKey('KeyW', 'ArrowUp')) my -= 1;
    if (heldKey('KeyS', 'ArrowDown')) my += 1;
    if (heldKey('KeyA', 'ArrowLeft')) mx -= 1;
    if (heldKey('KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my);
    const sp = WALK.speed * (heldKey('ShiftLeft', 'ShiftRight') ? WALK.sprint : 1);
    s.player.vx = len ? (mx / len) * sp : 0;
    s.player.vy = len ? (my / len) * sp : 0;
    s.player.x += s.player.vx * dt;
    s.player.y += s.player.vy * dt;
    if (len) s.player.heading = Math.atan2(my, mx);
    s.player.x = Math.max(14, Math.min(WORLD_W - 14, s.player.x));
    s.player.y = Math.max(14, Math.min(WORLD_H - 14, s.player.y));
    pushOutOfBuildings(city, s.player, WALK.radius);
  } else {
    const throttle = heldKey('KeyW', 'ArrowUp') ? 1 : heldKey('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = heldKey('KeyA', 'ArrowLeft') ? -1 : heldKey('KeyD', 'ArrowRight') ? 1 : 0;
    driveCar(s.car, dt, throttle, steer, city);
    // Long slides at speed are mayhem.
    const fx = Math.cos(s.car.heading), fy = Math.sin(s.car.heading);
    const lat = Math.abs(s.car.vx * -fy + s.car.vy * fx);
    if (lat > 92 && Math.abs(speedAlong(s.car)) > 210) addMayhem(s.jobs, dt * 8);
  }

  const at = focus();
  const motion = focusMotion();
  const world = { traffic: s.traffic, cops: s.law.fleet, playerCar: s.car };

  for (const c of s.traffic) {
    if (c !== s.car) stepTraffic(c, dt, city, world, Math.random);
    if (c.hitCd > 0) c.hitCd -= dt;
    if (c.nearMissCd > 0) c.nearMissCd -= dt;
  }

  // Player-car shunts and near misses.
  if (!s.onFoot) {
    const rivals = [...s.traffic.filter((c) => c !== s.car), ...s.law.fleet];
    for (const o of rivals) {
      const hit = carOverlap(s.car, o);
      if (!hit) {
        if (o.nearMissCd <= 0 && Math.abs(motion.speed) > 230) {
          const d = Math.hypot(o.x - s.car.x, o.y - s.car.y);
          if (d > 36 && d < 54) { addMayhem(s.jobs, 5); o.nearMissCd = 2.5; }
        }
        continue;
      }
      o.x += hit.nx * hit.depth * 0.6;
      o.y += hit.ny * hit.depth * 0.6;
      s.car.x -= hit.nx * hit.depth * 0.4;
      s.car.y -= hit.ny * hit.depth * 0.4;
      if (Math.abs(motion.speed) > 92 && o.hitCd <= 0) {
        o.hitCd = 1.1;
        o.vx = s.car.vx * 0.35; o.vy = s.car.vy * 0.35;
        s.car.vx *= 0.55; s.car.vy *= 0.55;
        addMayhem(s.jobs, o.cop ? 18 : 12);
        addHeat(s.law, o.cop ? 0.8 : 0.5);
        audio.thud();
      }
    }
  }

  // Crowd: scares from the player's driving feed the combo; contact is worse.
  const threats = [];
  for (const c of s.traffic) {
    const sp = Math.abs(speedAlong(c));
    if (sp > 125) threats.push({ x: c.x, y: c.y, speed: sp });
  }
  if (!s.onFoot && Math.abs(motion.speed) > 125) threats.push({ x: s.car.x, y: s.car.y, speed: Math.abs(motion.speed) });
  stepCrowd(s.crowd, dt, city, threats, (ped) => {
    if (!s.onFoot && Math.hypot(ped.x - s.car.x, ped.y - s.car.y) < 175) {
      addMayhem(s.jobs, 4);
      if (Math.random() < 0.35) audio.horn();
    }
  });
  if (!s.onFoot && Math.abs(motion.speed) > 108) {
    for (const p of s.crowd) {
      if (p.downT <= 0 && Math.hypot(p.x - s.car.x, p.y - s.car.y) < 21) {
        p.downT = 3;
        addMayhem(s.jobs, 15);
        addHeat(s.law, 1.25);
        audio.thud();
      }
    }
  }

  stepJobs(s.jobs, dt, at, s.law, (event, payload) => {
    if (event === 'fetch') audio.grab();
    if (event === 'done') { s.cash += payload.reward; audio.paid(); persist(); }
    if (event === 'fail') audio.alarm();
    if (event === 'combo-cash') { s.cash += payload.payout; audio.paid(); }
  });

  const starsBefore = s.law.stars;
  stepLaw(s.law, dt, { x: at.x, y: at.y, vx: motion.vx, vy: motion.vy, speed: motion.speed }, city);
  if (s.law.stars > starsBefore) audio.alarm();
  if (s.law.busted && s.mode === 'play') {
    s.fine = Math.min(s.cash, 140 + s.law.stars * 95);
    s.mode = 'busted';
    audio.bustedJingle();
    persist();
  }

  audio.engine(s.onFoot ? 0 : speedAlong(s.car) / s.car.top, !s.onFoot);
  audio.siren(s.law.stars > 0 && s.law.fleet.length > 0, s.time);

  s.cam.x = at.x;
  s.cam.y = at.y;
  s.cam.zoom = 1;

  s.saveT += dt;
  if (s.saveT > 5) { s.saveT = 0; persist(); }
}

// Title and shot modes: the street keeps living, the posed actors hold.
function idle(dt) {
  const world = { traffic: s.traffic, cops: s.law.fleet, playerCar: s.car };
  for (const c of s.traffic) if (c !== s.car) stepTraffic(c, dt, city, world, Math.random);
  stepCrowd(s.crowd, dt, city, [], null);
  if (SHOT === 'city') { s.cam.x = 2340; s.cam.y = 840; s.cam.zoom = 0.5; }
  else if (SHOT === 'title') { s.cam.x = 880; s.cam.y = 600; s.cam.zoom = 1; }
  else if (SHOT) { const at = focus(); s.cam.x = at.x; s.cam.y = at.y; }
}

// --- draw -----------------------------------------------------------------------
function draw() {
  const vw = VIEW_W / s.cam.zoom;
  const vh = VIEW_H / s.cam.zoom;
  const view = { x: s.cam.x - vw / 2, y: s.cam.y - vh / 2, w: vw, h: vh };
  g.save();
  g.translate(VIEW_W / 2, VIEW_H / 2);
  g.scale(s.cam.zoom, s.cam.zoom);
  g.translate(-s.cam.x, -s.cam.y);

  paintWorld(g, city, view, s.time);
  const job = s.jobs.current;
  if (job && s.mode !== 'title') {
    paintGoal(g, job.goal, job.stage === 'fetch' ? '#57e389' : '#ffd23f', job.kind, s.time);
  }
  for (const p of s.crowd) paintPed(g, p);
  for (const c of s.traffic) if (c !== s.car) paintCar(g, c, s.time);
  for (const cop of s.law.fleet) paintCar(g, cop, s.time);
  if (!s.onFoot && s.car) paintCar(g, s.car, s.time);
  if (s.onFoot) {
    const p = s.player;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(p.x + 2, p.y + 5, 9, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = COL.playerBody;
    g.beginPath(); g.arc(p.x, p.y, WALK.radius, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#22334e';
    g.beginPath(); g.arc(p.x, p.y - 2, 5.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#22334e';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + Math.cos(p.heading) * 15, p.y + Math.sin(p.heading) * 15);
    g.stroke();
  }
  g.restore();

  if (s.mode === 'title') { paintTitle(g, s.time); return; }
  paintHud(g, s, s.time);
  if (s.mode === 'busted') paintBusted(g, s.fine);
  if (s.mode === 'paused') paintPaused(g);
}

// --- boot -------------------------------------------------------------------------
bindKeyboard();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (SHOT) { s.time += dt; idle(dt); }
  else update(dt);
  draw();
  frameDone();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
