// NEON BAY HEAT 2 — the game loop and everything that connects.
// This module owns the state: the player on foot or in a stolen car,
// the traffic and the crowd around them, the law on their tail, the
// jobs on offer and the cash in hand. Each frame it steps the world,
// adjudicates the collisions and the crimes, moves the camera, paints
// the frame, and periodically writes the save. The ?shot= scenes at
// the bottom pose the same world into the four framed screenshots.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, FOOT } from './config.js';
import { buildCity, pushOutOfBuildings, V_ROADS, H_ROADS } from './city.js';
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
  roads: { V_ROADS, H_ROADS },
  mode: !SHOT || SHOT === 'title' ? 'title' : 'play',
  time: 0,
  cash: 120,
  player: { x: 360, y: 472, heading: 0.5, vx: 0, vy: 0 },
  onFoot: true,
  car: null,
  traffic: seedTraffic(city, SEED),
  crowd: seedCrowd(SEED),
  law: newLaw(),
  jobs: newJobs(),
  cam: { x: 900, y: 620, zoom: 1 },
  fine: 0,
  saveT: 0,
};
window.__nbh = s;

// The red coupe parked by the spawn corner: most players' first theft.
const starter = makeCar(392, 545, 0, 'coupe', '#d64541');
starter.parked = true;
s.traffic.push(starter);

// --- save / restore ----------------------------------------------------------
const SAVE_KEY = 'nbh2-heat-save';
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: s.cash, done: s.jobs.done, banked: s.jobs.banked,
      px: Math.round(s.player.x), py: Math.round(s.player.y),
    }));
  } catch { /* storage unavailable: play on without a save */ }
}
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d) return;
    if (Number.isFinite(d.cash)) s.cash = d.cash;
    if (Number.isFinite(d.done)) s.jobs.done = d.done;
    if (Number.isFinite(d.banked)) s.jobs.banked = d.banked;
    if (!SHOT && Number.isFinite(d.px) && Number.isFinite(d.py)) {
      s.player.x = d.px;
      s.player.y = d.py;
    }
  } catch { /* a corrupt save is treated as no save */ }
}
restore();

// --- helpers -------------------------------------------------------------------
function focus() { return s.onFoot ? s.player : s.car; }
function focusMotion() {
  if (s.onFoot) {
    return { vx: s.player.vx, vy: s.player.vy, speed: Math.hypot(s.player.vx, s.player.vy) };
  }
  return { vx: s.car.vx, vy: s.car.vy, speed: speedAlong(s.car) };
}

function toggleCar() {
  if (!s.onFoot) {
    const car = s.car;
    s.player.x = car.x + Math.cos(car.heading + Math.PI / 2) * 27;
    s.player.y = car.y + Math.sin(car.heading + Math.PI / 2) * 27;
    s.player.heading = car.heading;
    car.parked = true;
    car.vx = 0;
    car.vy = 0;
    s.car = null;
    s.onFoot = true;
    return;
  }
  let best = null;
  let bestD = FOOT.enterRange;
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
    // Taking a moving car is a louder crime than taking a parked one.
    addHeat(s.law, Math.abs(speedAlong(best)) > 30 ? 1.1 : 0.7);
    addMayhem(s.jobs, 6);
    audio.thud();
  }
}

// --- the frame update ------------------------------------------------------------
function update(dt) {
  s.time += dt;

  if (s.mode === 'title') {
    if (hitKey('Enter')) { s.mode = 'play'; audio.unlock(); }
    idleWorld(dt);
    return;
  }
  if (s.mode === 'busted') {
    if (hitKey('Enter')) {
      s.cash -= settleBust(s.law, s.cash);
      s.onFoot = true;
      s.car = null;
      s.player.x = 360;
      s.player.y = 472;
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

  // Move the player: on foot, or through the car they're driving.
  if (s.onFoot) {
    let mx = 0;
    let my = 0;
    if (heldKey('KeyW', 'ArrowUp')) my -= 1;
    if (heldKey('KeyS', 'ArrowDown')) my += 1;
    if (heldKey('KeyA', 'ArrowLeft')) mx -= 1;
    if (heldKey('KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my);
    const sp = FOOT.speed * (heldKey('ShiftLeft', 'ShiftRight') ? FOOT.sprintMul : 1);
    s.player.vx = len ? (mx / len) * sp : 0;
    s.player.vy = len ? (my / len) * sp : 0;
    s.player.x += s.player.vx * dt;
    s.player.y += s.player.vy * dt;
    if (len) s.player.heading = Math.atan2(my, mx);
    s.player.x = Math.max(14, Math.min(WORLD_W - 14, s.player.x));
    s.player.y = Math.max(14, Math.min(WORLD_H - 14, s.player.y));
    pushOutOfBuildings(city, s.player, FOOT.radius);
  } else {
    const throttle = heldKey('KeyW', 'ArrowUp') ? 1 : heldKey('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = heldKey('KeyA', 'ArrowLeft') ? -1 : heldKey('KeyD', 'ArrowRight') ? 1 : 0;
    driveCar(s.car, dt, throttle, steer, city);
    // A long slide at speed is exactly the kind of thing mayhem counts.
    const fx = Math.cos(s.car.heading);
    const fy = Math.sin(s.car.heading);
    const lat = Math.abs(s.car.vx * -fy + s.car.vy * fx);
    if (lat > 90 && Math.abs(speedAlong(s.car)) > 205) addMayhem(s.jobs, dt * 8);
  }

  const at = focus();
  const motion = focusMotion();
  const world = { traffic: s.traffic, cops: s.law.fleet, playerCar: s.car };

  for (const c of s.traffic) {
    if (c !== s.car) stepTraffic(c, dt, city, world, Math.random);
    if (c.hitCd > 0) c.hitCd -= dt;
    if (c.nearMissCd > 0) c.nearMissCd -= dt;
  }

  // The player's car against everything else on wheels.
  if (!s.onFoot) {
    const rivals = [...s.traffic.filter((c) => c !== s.car), ...s.law.fleet];
    for (const o of rivals) {
      const hit = carOverlap(s.car, o);
      if (!hit) {
        if (o.nearMissCd <= 0 && Math.abs(motion.speed) > 228) {
          const d = Math.hypot(o.x - s.car.x, o.y - s.car.y);
          if (d > 34 && d < 56) {
            addMayhem(s.jobs, 5);
            o.nearMissCd = 2.5;
          }
        }
        continue;
      }
      o.x += hit.nx * hit.depth * 0.6;
      o.y += hit.ny * hit.depth * 0.6;
      s.car.x -= hit.nx * hit.depth * 0.4;
      s.car.y -= hit.ny * hit.depth * 0.4;
      if (Math.abs(motion.speed) > 90 && o.hitCd <= 0) {
        o.hitCd = 1.1;
        o.vx = s.car.vx * 0.35;
        o.vy = s.car.vy * 0.35;
        s.car.vx *= 0.55;
        s.car.vy *= 0.55;
        addMayhem(s.jobs, o.cop ? 18 : 12);
        addHeat(s.law, o.cop ? 0.8 : 0.5);
        audio.thud();
      }
    }
  }

  // The crowd reacts to fast metal; the player's own car scares best.
  const threats = [];
  for (const c of s.traffic) {
    const sp = Math.abs(speedAlong(c));
    if (sp > 120) threats.push({ x: c.x, y: c.y, speed: sp });
  }
  if (!s.onFoot && Math.abs(motion.speed) > 120) {
    threats.push({ x: s.car.x, y: s.car.y, speed: Math.abs(motion.speed) });
  }
  stepCrowd(s.crowd, dt, city, threats, (ped) => {
    if (!s.onFoot && Math.hypot(ped.x - s.car.x, ped.y - s.car.y) < 175) {
      addMayhem(s.jobs, 4);
      if (Math.random() < 0.35) audio.horn();
    }
  });
  if (!s.onFoot && Math.abs(motion.speed) > 105) {
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

// In title and shot modes the street keeps living but the posed
// principals — the player's car, the cruisers, the job — hold still.
function idleWorld(dt) {
  const world = { traffic: s.traffic, cops: s.law.fleet, playerCar: s.car };
  for (const c of s.traffic) {
    if (c !== s.car) stepTraffic(c, dt, city, world, Math.random);
  }
  stepCrowd(s.crowd, dt, city, [], null);
  if (SHOT === 'city') { s.cam.x = 2340; s.cam.y = 840; s.cam.zoom = 0.5; }
  else if (SHOT === 'title') { s.cam.x = 900; s.cam.y = 620; s.cam.zoom = 1; }
  else if (SHOT) {
    const at = focus();
    s.cam.x = at.x;
    s.cam.y = at.y;
  }
}

// --- composed scenes for the entry screenshots ---------------------------------
function poseShot(name) {
  if (name === 'title' || name === 'city') {
    if (name === 'city') {
      s.player.x = 2380;
      s.player.y = 820;
      s.cam.x = 2340;
      s.cam.y = 840;
      s.cam.zoom = 0.5;
    }
    return;
  }
  // Chase and mission share a stage: the eastbound lane of the avenue
  // at y = 500, the starter coupe running east, the law behind it.
  const car = starter;
  car.parked = false;
  car.stolen = true;
  s.car = car;
  s.onFoot = false;
  s.traffic = s.traffic.filter(
    (c) => c === car || Math.hypot(c.x - 1150, c.y - 500) > 280,
  );
  const cruiser = (x, y, vx) => {
    const cop = makeCar(x, y, 0, 'cruiser');
    cop.vx = vx;
    cop.stolen = true;
    return cop;
  };
  if (name === 'chase') {
    car.x = 1030; car.y = 517; car.heading = 0; car.vx = 335; car.vy = 0;
    s.law.stars = 4;
    s.law.heat = 0.4;
    s.law.fleet = [
      cruiser(905, 486, 300), cruiser(920, 548, 300),
      cruiser(836, 517, 292), cruiser(988, 470, 312),
    ];
    s.jobs.current = {
      kind: 'DELIVER', stage: 'drop', goal: { x: 1330, y: 500 },
      reward: 260, clock: 41, text: 'Drop the package off',
    };
    s.jobs.combo = 47;
    s.jobs.mult = 2;
    s.jobs.comboLeft = 3;
    s.cash = 860;
    s.cam.zoom = 1.7;
  }
  if (name === 'mission') {
    car.x = 1440; car.y = 517; car.heading = 0; car.vx = 105; car.vy = 0;
    s.law.stars = 2;
    s.law.fleet = [cruiser(1292, 486, 205), cruiser(1346, 548, 205)];
    s.jobs.current = {
      kind: 'DELIVER', stage: 'drop', goal: { x: 1565, y: 500 },
      reward: 260, clock: 23, text: 'Drop the package off',
    };
    s.jobs.combo = 18;
    s.jobs.mult = 1;
    s.jobs.comboLeft = 3;
    s.cash = 640;
    s.cam.zoom = 1.45;
  }
}
if (SHOT) poseShot(SHOT);

// --- draw ------------------------------------------------------------------------
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
    g.beginPath();
    g.ellipse(p.x + 2, p.y + 5, 9, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.arc(p.x, p.y, FOOT.radius, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#22334e';
    g.beginPath();
    g.arc(p.x, p.y - 2, 5.4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#22334e';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + Math.cos(p.heading) * 15, p.y + Math.sin(p.heading) * 15);
    g.stroke();
  }
  g.restore();

  if (s.mode === 'title') {
    paintTitle(g, s.time);
    return;
  }
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
  if (SHOT) {
    s.time += dt;
    idleWorld(dt);
  } else {
    update(dt);
  }
  draw();
  frameDone();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
