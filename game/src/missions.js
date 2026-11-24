// NEON BAY HEAT 2 — work and mayhem.
// Two kinds of job. DELIVER: fetch a package from a green ring, then
// beat the clock to the gold ring. GETAWAY: the stash is already in
// the car and the pickup itself draws about two stars of heat — the
// drop only counts once the player has shaken the law off entirely,
// and the clock runs slow while the stars are up, so the real task is
// breaking line of sight, not driving fast.
// Alongside the jobs, mayhem: near misses, slides, shunts and scares
// feed a combo that multiplies as it grows and cashes out in full the
// moment the player lets it lapse.

import { WORLD_W, WORLD_H, BEACH_X, PAY } from './config.js';
import { makeRng, randRange } from './random.js';
import { nearestRoadPoint } from './city.js';
import { addHeat } from './police.js';

const rng = makeRng(90210);

function goalPoint(from, minD, maxD) {
  for (let tries = 0; tries < 30; tries++) {
    const x = randRange(rng, 130, BEACH_X - 120);
    const y = randRange(rng, 130, WORLD_H - 130);
    const d = Math.hypot(x - from.x, y - from.y);
    if (d >= minD && d <= maxD) return nearestRoadPoint(x, y);
  }
  return nearestRoadPoint(400, 400);
}

export function newJobs() {
  return {
    current: null,   // {kind, stage, goal, reward, clock, text}
    done: 0,
    banked: 0,
    idle: 0,
    combo: 0,
    mult: 1,
    comboLeft: 0,
    banner: '',
    bannerT: 0,
  };
}

function offerJob(jobs, at, law) {
  const kind = rng() < 0.55 ? 'DELIVER' : 'GETAWAY';
  if (kind === 'DELIVER') {
    jobs.current = {
      kind, stage: 'fetch',
      goal: goalPoint(at, 480, 1250),
      reward: 0, clock: 0,
      text: 'Pick up the package',
    };
  } else {
    const goal = goalPoint(at, 700, 1500);
    const dist = Math.hypot(goal.x - at.x, goal.y - at.y);
    jobs.current = {
      kind, stage: 'drop',
      goal,
      reward: Math.round(PAY.getawayBase + dist * PAY.getawayPerMeter),
      clock: Math.max(PAY.clockFloor, dist * PAY.clockPerMeter * 1.7),
      text: 'Lose the heat, reach the hideout',
    };
    addHeat(law, 2.1); // the stash pickup is loud
  }
  jobs.banner = kind === 'DELIVER' ? 'NEW JOB — DELIVERY' : 'NEW JOB — GETAWAY';
  jobs.bannerT = 3;
}

// emit(event, payload) is optional; every call site guards it.
export function stepJobs(jobs, dt, at, law, emit) {
  const fire = (ev, payload) => { if (typeof emit === 'function') emit(ev, payload); };
  jobs.bannerT = Math.max(0, jobs.bannerT - dt);

  if (jobs.comboLeft > 0) {
    jobs.comboLeft -= dt;
    if (jobs.comboLeft <= 0 && jobs.combo > 0) {
      fire('combo-cash', { payout: Math.floor(jobs.combo) * jobs.mult });
      jobs.combo = 0;
      jobs.mult = 1;
    }
  }

  const job = jobs.current;
  if (!job) {
    jobs.idle += dt;
    if (jobs.idle > 1.4) {
      jobs.idle = 0;
      offerJob(jobs, at, law);
    }
    return;
  }

  const dist = Math.hypot(at.x - job.goal.x, at.y - job.goal.y);

  if (job.kind === 'DELIVER' && job.stage === 'fetch') {
    if (dist < 46) {
      const drop = goalPoint(at, 750, 1500);
      const d2 = Math.hypot(drop.x - at.x, drop.y - at.y);
      job.stage = 'drop';
      job.goal = drop;
      job.reward = Math.round(PAY.deliverBase + d2 * PAY.deliverPerMeter);
      job.clock = Math.max(PAY.clockFloor, d2 * PAY.clockPerMeter);
      job.text = 'Drop the package off';
      fire('fetch', job);
    }
    return;
  }

  // Timed leg (DELIVER drop, or the whole GETAWAY).
  if (job.kind === 'GETAWAY' && law.stars > 0) job.clock -= dt * 0.45;
  else job.clock -= dt;

  const arrived = dist < 52 && (job.kind === 'DELIVER' || law.stars === 0);
  if (arrived) {
    jobs.done += 1;
    jobs.banked += job.reward;
    jobs.banner = `JOB DONE — +$${job.reward}`;
    jobs.bannerT = 3;
    fire('done', job);
    jobs.current = null;
    return;
  }
  if (job.clock <= 0) {
    jobs.banner = 'JOB FAILED';
    jobs.bannerT = 3;
    fire('fail', job);
    jobs.current = null;
  }
}

export function addMayhem(jobs, points) {
  jobs.combo += points;
  jobs.comboLeft = 4;
  jobs.mult = Math.min(5, 1 + Math.floor(jobs.combo / 45));
}
