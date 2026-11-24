// NEON BAY HEAT 2 — missions and the mayhem combo.
// One job: hand the player work. DELIVER a package across town against the
// clock; GETAWAY — shake a 2-star heat and reach the hideout; plus the
// mayhem combo that pays for near misses, drifts and general chaos.

import { MISSION, WORLD } from './config.js';
import { makeRng, range } from './random.js';

const rng = makeRng(777);

function farPoint(from, minDist) {
  for (let i = 0; i < 24; i++) {
    const x = range(rng, 160, WORLD.beachX - 160);
    const y = range(rng, 160, WORLD.height - 160);
    if (Math.hypot(x - from.x, y - from.y) > minDist) return { x, y };
  }
  return { x: 400, y: 400 };
}

export function makeMissions() {
  return {
    active: null,      // { type, phase, target, pay, timeLeft, label }
    combo: 0, comboTimer: 0, multiplier: 1,
    completed: 0, earned: 0,
    banner: '', bannerT: 0,
  };
}

export function offerMission(m, playerPos) {
  if (m.active) return;
  const type = rng() < 0.55 ? 'DELIVER' : 'GETAWAY';
  const pickup = farPoint(playerPos, 500);
  m.active = {
    type, phase: 'pickup', target: pickup,
    pay: 0, timeLeft: 0,
    label: type === 'DELIVER' ? 'Pick up the package' : 'Reach the stash house',
  };
  m.banner = type === 'DELIVER' ? 'NEW JOB: DELIVERY' : 'NEW JOB: GETAWAY';
  m.bannerT = 3;
}

function startTimedLeg(m, from) {
  const drop = farPoint(from, 900);
  const dist = Math.hypot(drop.x - from.x, drop.y - from.y);
  const a = m.active;
  a.phase = 'dropoff';
  a.target = drop;
  a.timeLeft = Math.max(28, dist * MISSION.timePerMeter);
  a.pay = Math.round(range(rng, ...(a.type === 'DELIVER' ? MISSION.deliverPay : MISSION.getawayPay)));
  a.label = a.type === 'DELIVER' ? 'Drop the package off' : 'Lose the heat, reach the hideout';
}

export function stepMissions(m, dt, player, police, onEvent) {
  m.bannerT = Math.max(0, m.bannerT - dt);
  if (m.comboTimer > 0) {
    m.comboTimer -= dt;
    if (m.comboTimer <= 0) { m.combo = 0; m.multiplier = 1; }
  }
  const a = m.active;
  if (!a) { offerMission(m, player); return; }
  const d = Math.hypot(player.x - a.target.x, player.y - a.target.y);
  if (a.phase === 'pickup' && d < 46) {
    if (a.type === 'GETAWAY') police.heat += 2.2; // grabbing the stash draws heat
    startTimedLeg(m, player);
    onEvent('pickup', a);
    return;
  }
  if (a.phase === 'dropoff') {
    a.timeLeft -= dt;
    if (a.type === 'GETAWAY' && police.stars > 0) a.timeLeft += dt * 0.55; // clock waits while heat is on
    if (d < 52 && (a.type === 'DELIVER' || police.stars === 0)) {
      m.completed += 1; m.earned += a.pay;
      onEvent('complete', a);
      m.active = null;
      m.banner = `JOB DONE  +$${a.pay}`;
      m.bannerT = 3;
      return;
    }
    if (a.timeLeft <= 0) {
      onEvent('fail', a);
      m.active = null;
      m.banner = 'JOB FAILED';
      m.bannerT = 3;
    }
  }
}

// Mayhem: feed chaos in, get combo + cash out.
export function mayhem(m, points, onEvent) {
  m.combo += points;
  m.comboTimer = 4;
  m.multiplier = 1 + Math.min(4, Math.floor(m.combo / 30));
  if (onEvent && m.combo >= 30 && m.combo - points < 30) onEvent('combo', m);
}

export function comboCash(m) {
  return Math.floor(m.combo) * m.multiplier;
}
