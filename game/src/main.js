// NEON BAY HEAT 2 — the game itself.
// Owns the world state and the frame loop, and wires the modules
// together: walking and driving, stealing, collisions and mayhem, the
// crowd, the police, jobs, sound, the camera, saving, and the composed
// ?shot= scenes the entry screenshots are taken from.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, FOOT } from './config.js';
import { generateCity, resolveBuildingHit, districtName } from './city.js';
import { initKeyboard, down, tapped, clearPresses } from './input.js';
import { makeVehicle, stepVehicle, forwardSpeed, spawnTraffic, driveTraffic, overlap } from './vehicles.js';
import { spawnCrowd, stepCrowd } from './peds.js';
import { newPolice, addHeat, stepPolice, bustFine } from './police.js';
import { newJobs, stepJobs, addMayhem } from './missions.js';
import { createSound } from './audio.js';
import { paintWorld, paintVehicle, paintPed, paintGoal } from './render.js';
import { paintHud, paintTitle, paintBusted, paintPaused } from './hud.js';

const query = new URLSearchParams(location.search);
const SEED = parseInt(query.get('seed') || '7', 10) || 7;
const SHOT = query.get('shot');

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const sound = createSound();
const city = generateCity(SEED);

const s = {
  city,
  mode: SHOT === 'title' ? 'title' : 'play',
  time: 0,
  cash: 120,
  player: { x: 330, y: 372, heading: 0, vx: 0, vy: 0 },
  onFoot: true,
  car: null,
  traffic: spawnTraffic(city, SEED),
  crowd: spawnCrowd(SEED),
  police: newPolice(),
  jobs: newJobs(),
  cam: { cx: 600, cy: 500, zoom: 1 },
  lastFine: 0,
  saveT: 0,
};
window.__nbh = s;

// The red coupe waiting by the spawn corner — most players' first theft.
const firstCar = makeVehicle(388, 386, 0, 'coupe', '#d64541');
firstCar.parked = true;
s.traffic.push(firstCar);

// --- save / restore -------------------------------------------------------
function persist() {
  try {
    localStorage.setItem('nbh2.save.v1', JSON.stringify({
      cash: s.cash, done: s.jobs.done, banked: s.jobs.banked,
      px: Math.round(s.player.x), py: Math.round(s.player.y),
    }));
  } catch { /* storage unavailable: play on without it */ }
}
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem('nbh2.save.v1') || 'null');
    if (!d) return;
    if (typeof d.cash === 'number') s.cash = d.cash;
    if (typeof d.done === 'number') s.jobs.done = d.done;
    if (typeof d.banked === 'number') s.jobs.banked = d.banked;
    if (!SHOT && typeof d.px === 'number') { s.player.x = d.px; s.player.y = d.py; }
  } catch { /* corrupted save: start fresh */ }
}
restore();

function focusPos() {
  return s.onFoot ? s.player : s.car;
}
function focusVel() {
  if (s.onFoot) return { vx: s.player.vx, vy: s.player.vy, speed: Math.hypot(s.player.vx, s.player.vy) };
  return { vx: s.car.vx, vy: s.car.vy, speed: forwardSpeed(s.car) };
}

// --- entering and leaving cars ---------------------------------------------
function toggleCar() {
  if (!s.onFoot) {
    const car = s.car;
    s.player.x = car.x + Math.cos(car.heading - Math.PI / 2) * 27;
    s.player.y = car.y + Math.sin(car.heading - Math.PI / 2) * 27;
    s.player.heading = car.heading;
    car.parked = true;      // abandoned where it stopped
    car.vx = 0; car.vy = 0;
    s.car = null;
    s.onFoot = true;
    return;
  }
  let best = null, bestD = 66;
  for (const c of s.traffic) {
    const d = Math.hypot(c.x - s.player.x, c.y - s.player.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return;
  s.car = best;
  s.onFoot = false;
  best.parked = false;
  if (!best.taken) {
    best.taken = true;
    addHeat(s.police, best.speedAtTakeover > 40 ? 1.15 : 0.75);
    addMayhem(s.jobs, 6);
    sound.thud();
  }
}

// --- composed scenes for screenshots ----------------------------------------
function composeShot(name) {
  const p = s.player;
  if (name === 'title') {
    s.cam.cx = 900; s.cam.cy = 620; s.cam.zoom = 1;
    return;
  }
  if (name === 'city') {
    p.x = 2520; p.y = 840;
    s.cam.cx = 2470; s.cam.cy = 860; s.cam.zoom = 0.5;
    return;
  }
  const car = firstCar;
  car.parked = false;
  car.taken = true;
  s.car = car;
  s.onFoot = false;
  // Keep the composed scene clean: no ambient traffic inside the frame.
  s.traffic = s.traffic.filter((c) => c === car || Math.hypot(c.x - 1150, c.y - 1080) > 240);
  if (name === 'chase') {
    car.x = 1060; car.y = 1093; car.heading = 0; car.vx = 330; car.vy = 0;
    s.police.stars = 4;
    s.police.heat = 0.4;
    const tails = [[945, 1062], [958, 1122], [882, 1094], [1022, 1046]];
    for (const [x, y] of tails) {
      s.police.fleet.push({
        x, y, heading: 0, vx: 300, vy: 0, w: 39, l: 20,
        type: 'cruiser', color: '#eef1f5', top: 470, accelMul: 1.05,
        parked: false, taken: true, cop: true, cruise: 0, axis: null, honkT: 0, smashT: 0,
      });
    }
    s.jobs.current = {
      kind: 'DELIVER', stage: 'drop', goal: { x: 1380, y: 1080 },
      reward: 260, clock: 41, text: 'Drop the package off',
    };
    s.jobs.combo = 47; s.jobs.mult = 2; s.jobs.comboLeft = 3;
    s.cash = 860;
    s.cam.zoom = 1.7;
  }
  if (name === 'mission') {
    car.x = 1452; car.y = 1093; car.heading = 0; car.vx = 95; car.vy = 0;
    s.police.stars = 2;
    const tails = [[1305, 1062], [1352, 1122]];
    for (const [x, y] of tails) {
      s.police.fleet.push({
        x, y, heading: 0, vx: 200, vy: 0, w: 39, l: 20,
        type: 'cruiser', color: '#eef1f5', top: 445, accelMul: 1.05,
        parked: false, taken: true, cop: true, cruise: 0, axis: null, honkT: 0, smashT: 0,
      });
    }
    s.jobs.current = {
      kind: 'DELIVER', stage: 'drop', goal: { x: 1560, y: 1080 },
      reward: 260, clock: 23, text: 'Drop the package off',
    };
    s.jobs.combo = 18; s.jobs.mult = 1; s.jobs.comboLeft = 3;
    s.cash = 640;
    s.cam.zoom = 1.45;
  }
}
if (SHOT) composeShot(SHOT);

// --- per-frame update ---------------------------------------------------------
function update(dt) {
  s.time += dt;

  if (s.mode === 'title') {
    if (tapped('Enter')) { s.mode = 'play'; sound.unlock(); }
    idleWorld(dt);
    return;
  }
  if (s.mode === 'busted') {
    if (tapped('Enter')) {
      const fine = bustFine(s.police, s.cash);
      s.cash -= fine;
      s.lastFine = fine;
      s.onFoot = true;
      s.car = null;
      s.player.x = 330; s.player.y = 372;
      s.mode = 'play';
      persist();
    }
    return;
  }
  if (tapped('KeyP')) {
    s.mode = s.mode === 'paused' ? 'play' : 'paused';
    if (s.mode === 'paused') persist();
  }
  if (s.mode === 'paused') return;

  if (tapped('KeyE')) toggleCar();

  // Movement.
  if (s.onFoot) {
    let mx = 0, my = 0;
    if (down('KeyW', 'ArrowUp')) my -= 1;
    if (down('KeyS', 'ArrowDown')) my += 1;
    if (down('KeyA', 'ArrowLeft')) mx -= 1;
    if (down('KeyD', 'ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    const sp = FOOT.speed * (down('ShiftLeft', 'ShiftRight') ? FOOT.sprintMul : 1);
    s.player.vx = (mx / len) * sp * (mx || my ? 1 : 0);
    s.player.vy = (my / len) * sp * (mx || my ? 1 : 0);
    s.player.x += s.player.vx * dt;
    s.player.y += s.player.vy * dt;
    if (mx || my) s.player.heading = Math.atan2(my, mx);
    s.player.x = Math.max(14, Math.min(WORLD_W - 14, s.player.x));
    s.player.y = Math.max(14, Math.min(WORLD_H - 14, s.player.y));
    resolveBuildingHit(city, s.player, FOOT.radius);
  } else {
    const throttle = down('KeyW', 'ArrowUp') ? 1 : down('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = down('KeyA', 'ArrowLeft') ? -1 : down('KeyD', 'ArrowRight') ? 1 : 0;
    stepVehicle(s.car, dt, throttle, steer, city);
    // A big slide at speed is mayhem, and the combo loves it.
    const fx = Math.cos(s.car.heading), fy = Math.sin(s.car.heading);
    const lat = Math.abs(s.car.vx * -fy + s.car.vy * fx);
    const fwd = forwardSpeed(s.car);
    if (lat > 95 && fwd > 215) addMayhem(s.jobs, dt * 8);
  }

  const pos = focusPos();
  const vel = focusVel();

  // Traffic lives its own life; note each car's speed for theft heat.
  const world = { cars: s.traffic, cops: s.police.fleet, playerCar: s.car, onFoot: s.onFoot, player: s.player };
  for (const c of s.traffic) {
    c.speedAtTakeover = Math.abs(forwardSpeed(c));
    if (c !== s.car) driveTraffic(c, dt, city, world);
  }

  // Shunts: the player's car against everything else.
  if (!s.onFoot) {
    const others = [...s.traffic.filter((c) => c !== s.car), ...s.police.fleet];
    for (const o of others) {
      const hit = overlap(s.car, o);
      if (!hit) {
        // Near miss at speed pays a little mayhem, once per car per while.
        if ((o.nearT || 0) <= 0 && Math.abs(vel.speed) > 235) {
          const d = Math.hypot(o.x - s.car.x, o.y - s.car.y);
          if (d > 34 && d < 52) { addMayhem(s.jobs, 5); o.nearT = 2.5; }
        }
        continue;
      }
      o.x += hit.nx * hit.depth * 0.6;
      o.y += hit.ny * hit.depth * 0.6;
      s.car.x -= hit.nx * hit.depth * 0.4;
      s.car.y -= hit.ny * hit.depth * 0.4;
      if (Math.abs(vel.speed) > 95 && (o.smashT || 0) <= 0) {
        o.smashT = 1.2;
        o.vx = s.car.vx * 0.35; o.vy = s.car.vy * 0.35;
        s.car.vx *= 0.55; s.car.vy *= 0.55;
        addMayhem(s.jobs, o.cop ? 18 : 12);
        addHeat(s.police, o.cop ? 0.8 : 0.5);
        sound.thud();
      }
    }
  }
  for (const c of s.traffic) if ((c.nearT || 0) > 0) c.nearT -= dt;

  // The crowd, and what happens when a fast car meets it.
  const threats = [];
  for (const c of s.traffic) {
    const sp = Math.abs(forwardSpeed(c));
    if (sp > 128) threats.push({ x: c.x, y: c.y, speed: sp });
  }
  if (!s.onFoot) {
    const sp = Math.abs(vel.speed);
    if (sp > 128) threats.push({ x: s.car.x, y: s.car.y, speed: sp });
  }
  stepCrowd(s.crowd, dt, city, threats, (ped) => {
    // Only scares the player causes count toward the player's combo.
    if (!s.onFoot && Math.hypot(ped.x - s.car.x, ped.y - s.car.y) < 175) {
      addMayhem(s.jobs, 4);
      if (Math.random() < 0.4) sound.horn();
    }
  });
  if (!s.onFoot && Math.abs(vel.speed) > 110) {
    for (const p of s.crowd) {
      if (p.downT <= 0 && Math.hypot(p.x - s.car.x, p.y - s.car.y) < 21) {
        p.downT = 3;
        addMayhem(s.jobs, 15);
        addHeat(s.police, 1.25);
        sound.thud();
      }
    }
  }

  // Jobs.
  stepJobs(s.jobs, dt, pos, s.police, (event, payload) => {
    if (event === 'fetch') sound.grab();
    if (event === 'done') { s.cash += payload.reward; sound.paid(); persist(); }
    if (event === 'fail') sound.alarm();
    if (event === 'combo-cash') { s.cash += payload.payout; sound.paid(); }
  });

  // The law.
  const starsBefore = s.police.stars;
  stepPolice(s.police, dt, { x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy, speed: vel.speed }, city);
  if (s.police.stars > starsBefore) sound.alarm();
  if (s.police.busted && s.mode === 'play') {
    s.lastFine = Math.min(s.cash, 140 + s.police.stars * 95);
    s.mode = 'busted';
    sound.bustedJingle();
    persist();
  }

  sound.engine(s.onFoot ? 0 : forwardSpeed(s.car) / s.car.top, !s.onFoot);
  sound.siren(s.police.stars > 0 && s.police.fleet.length > 0, s.time);

  // Camera tracks the focus.
  s.cam.cx = pos.x;
  s.cam.cy = pos.y;
  s.cam.zoom = 1;

  s.saveT += dt;
  if (s.saveT > 5) { s.saveT = 0; persist(); }
}

// In shot and title modes the world idles: traffic rolls, crowds wander,
// but no jobs tick and no heat builds — the composed scene stays composed.
function idleWorld(dt) {
  const world = { cars: s.traffic, cops: s.police.fleet, playerCar: s.car, onFoot: s.onFoot, player: s.player };
  for (const c of s.traffic) if (c !== s.car) driveTraffic(c, dt, city, world);
  stepCrowd(s.crowd, dt, city, [], null);
  if (SHOT === 'city') { s.cam.cx = 2470; s.cam.cy = 860; s.cam.zoom = 0.5; }
  if (SHOT === 'chase' || SHOT === 'mission') {
    const pos = focusPos();
    s.cam.cx = pos.x; s.cam.cy = pos.y;
  }
  if (SHOT === 'title') { s.cam.cx = 900; s.cam.cy = 620; s.cam.zoom = 1; }
}

// --- drawing ------------------------------------------------------------------
function draw() {
  const vw = VIEW_W / s.cam.zoom;
  const vh = VIEW_H / s.cam.zoom;
  const camRect = { x: s.cam.cx - vw / 2, y: s.cam.cy - vh / 2, w: vw, h: vh };
  g.save();
  g.translate(VIEW_W / 2, VIEW_H / 2);
  g.scale(s.cam.zoom, s.cam.zoom);
  g.translate(-s.cam.cx, -s.cam.cy);

  paintWorld(g, city, camRect, s.time);
  const job = s.jobs.current;
  if (job && s.mode !== 'title') {
    paintGoal(g, job.goal, job.stage === 'fetch' ? '#57e389' : '#ffd23f', job.kind, s.time);
  }
  for (const p of s.crowd) paintPed(g, p);
  for (const c of s.traffic) if (c !== s.car) paintVehicle(g, c, s.time);
  for (const cop of s.police.fleet) paintVehicle(g, cop, s.time);
  if (!s.onFoot && s.car) paintVehicle(g, s.car, s.time);
  if (s.onFoot) {
    const p = s.player;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(p.x + 2, p.y + 5, 9, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.arc(p.x, p.y, FOOT.radius, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#24344d';
    g.beginPath(); g.arc(p.x, p.y - 2, 5.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#24344d';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + Math.cos(p.heading) * 15, p.y + Math.sin(p.heading) * 15);
    g.stroke();
  }
  g.restore();

  if (s.mode === 'title') { paintTitle(g, s.time); return; }
  paintHud(g, s, s.time);
  if (s.mode === 'busted') paintBusted(g, s.lastFine);
  if (s.mode === 'paused') paintPaused(g);
}

// --- boot ---------------------------------------------------------------------
initKeyboard();
let lastStamp = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastStamp) / 1000);
  lastStamp = now;
  if (SHOT) { s.time += dt; idleWorld(dt); }
  else update(dt);
  draw();
  clearPresses();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export { districtName };
