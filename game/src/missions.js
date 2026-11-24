// NEON BAY HEAT 2 — jobs and mayhem.
// Two kinds of work rotate through the job slot:
//   DELIVER — collect a package, then beat the clock to the drop-off.
//   GETAWAY — grabbing the stash draws heat on purpose; reach the
//             hideout before the clock dies. The clock runs slower while
//             you still have stars, because shaking them IS the job.
// Mayhem is the side economy: near misses, drifts, shunts and scares
// stack a combo; when the combo timer lapses it pays out in cash.

import { PAY, WORLD_H, SHORE_X } from './config.js';
import { between } from './random.js';

function distantPoint(from, minDist) {
  for (let tries = 0; tries < 30; tries++) {
    const x = between(Math.random, 170, SHORE_X - 170);
    const y = between(Math.random, 170, WORLD_H - 170);
    if (Math.hypot(x - from.x, y - from.y) > minDist) return { x, y };
  }
  return { x: 480, y: 480 };
}

export function newJobs() {
  return {
    current: null,   // { kind, stage: 'fetch'|'drop', goal, reward, clock }
    done: 0,
    banked: 0,
    combo: 0,
    comboLeft: 0,
    mult: 1,
    notice: '',
    noticeT: 0,
  };
}

function postJob(jobs, from) {
  const kind = Math.random() < 0.55 ? 'DELIVER' : 'GETAWAY';
  jobs.current = {
    kind,
    stage: 'fetch',
    goal: distantPoint(from, 520),
    reward: 0,
    clock: 0,
    text: kind === 'DELIVER' ? 'Pick up the package' : 'Grab the stash',
  };
  jobs.notice = kind === 'DELIVER' ? 'NEW JOB — DELIVERY' : 'NEW JOB — GETAWAY';
  jobs.noticeT = 3;
}

function armDropLeg(jobs, from) {
  const job = jobs.current;
  const goal = distantPoint(from, 950);
  const dist = Math.hypot(goal.x - from.x, goal.y - from.y);
  job.stage = 'drop';
  job.goal = goal;
  job.clock = Math.max(PAY.minSeconds, dist * PAY.secondsPerPixel);
  const band = job.kind === 'DELIVER' ? PAY.deliver : PAY.getaway;
  job.reward = Math.round(between(Math.random, band[0], band[1]));
  job.text = job.kind === 'DELIVER' ? 'Drop the package off' : 'Reach the hideout';
}

// emit(event, job) — events: 'fetch', 'done', 'fail'. Guarded by caller contract.
export function stepJobs(jobs, dt, pos, police, emit) {
  jobs.noticeT = Math.max(0, jobs.noticeT - dt);
  if (jobs.comboLeft > 0) {
    jobs.comboLeft -= dt;
    if (jobs.comboLeft <= 0) {
      const payout = Math.floor(jobs.combo) * jobs.mult;
      jobs.combo = 0;
      jobs.mult = 1;
      if (payout > 0 && typeof emit === 'function') emit('combo-cash', { payout });
    }
  }
  if (!jobs.current) { postJob(jobs, pos); return; }
  const job = jobs.current;
  const d = Math.hypot(pos.x - job.goal.x, pos.y - job.goal.y);

  if (job.stage === 'fetch') {
    if (d < 48) {
      if (job.kind === 'GETAWAY') police.heat += 2.15; // the stash is hot
      armDropLeg(jobs, pos);
      if (typeof emit === 'function') emit('fetch', job);
    }
    return;
  }

  // Drop leg: the clock is the enemy, except a getaway clock forgives
  // time spent actually being chased.
  job.clock -= dt * (job.kind === 'GETAWAY' && police.stars > 0 ? 0.45 : 1);
  const arrived = d < 54 && (job.kind === 'DELIVER' || true);
  if (arrived) {
    jobs.done += 1;
    jobs.banked += job.reward;
    jobs.notice = `JOB DONE  +$${job.reward}`;
    jobs.noticeT = 3;
    if (typeof emit === 'function') emit('done', job);
    jobs.current = null;
    return;
  }
  if (job.clock <= 0) {
    jobs.notice = 'JOB FAILED — OUT OF TIME';
    jobs.noticeT = 3;
    if (typeof emit === 'function') emit('fail', job);
    jobs.current = null;
  }
}

export function addMayhem(jobs, points) {
  jobs.combo += points;
  jobs.comboLeft = 4;
  jobs.mult = 1 + Math.min(4, Math.floor(jobs.combo / 32));
}
