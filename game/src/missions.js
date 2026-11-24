// NEON BAY HEAT 2 — jobs and mayhem.
// One job at a time. DELIVER runs fetch → drop across town against a
// clock. GETAWAY pays for reaching a hideout while the heat is on — the
// clock runs slow while stars are up, and grabbing the stash is what
// brings the heat. Mayhem is a separate combo: chaos feeds it, a lull
// cashes it out at a multiplier.

import { WORLD_W, WORLD_H, BEACH_X, JOB_PAY } from './config.js';

function farSpot(from, minDist) {
  for (let i = 0; i < 30; i++) {
    const x = 150 + Math.random() * (BEACH_X - 300);
    const y = 150 + Math.random() * (WORLD_H - 300);
    if (Math.hypot(x - from.x, y - from.y) > minDist) return { x, y };
  }
  return { x: 420, y: 420 };
}

export function newJobs() {
  return {
    current: null,       // {kind, stage, goal, reward, clock, text}
    combo: 0, mult: 1, comboLeft: 0,
    done: 0, banked: 0,
    notice: '', noticeT: 0,
    idleFor: 1.2,        // small breather before the first job appears
  };
}

function offer(jobs, at) {
  const kind = Math.random() < 0.55 ? 'DELIVER' : 'GETAWAY';
  jobs.current = {
    kind,
    stage: 'fetch',
    goal: farSpot(at, 520),
    reward: 0, clock: 0,
    text: kind === 'DELIVER' ? 'Pick up the package' : 'Grab the stash',
  };
  jobs.notice = kind === 'DELIVER' ? 'NEW JOB — DELIVERY' : 'NEW JOB — GETAWAY';
  jobs.noticeT = 3;
}

function armLeg(jobs, from) {
  const job = jobs.current;
  const drop = farSpot(from, 950);
  const dist = Math.hypot(drop.x - from.x, drop.y - from.y);
  job.stage = 'drop';
  job.goal = drop;
  job.clock = Math.max(JOB_PAY.minClock, dist * JOB_PAY.secPerPx);
  const span = job.kind === 'DELIVER'
    ? [JOB_PAY.deliverMin, JOB_PAY.deliverMax]
    : [JOB_PAY.getawayMin, JOB_PAY.getawayMax];
  job.reward = Math.round(span[0] + Math.random() * (span[1] - span[0]));
  job.text = job.kind === 'DELIVER' ? 'Drop the package off' : 'Reach the hideout clean';
}

// emit(event, payload) is optional; every call site guards it.
export function stepJobs(jobs, dt, at, law, emit) {
  const say = (ev, payload) => { if (typeof emit === 'function') emit(ev, payload); };
  jobs.noticeT = Math.max(0, jobs.noticeT - dt);

  if (jobs.comboLeft > 0) {
    jobs.comboLeft -= dt;
    if (jobs.comboLeft <= 0 && jobs.combo > 0) {
      const payout = Math.floor(jobs.combo) * jobs.mult;
      say('combo-cash', { payout });
      jobs.combo = 0;
      jobs.mult = 1;
    }
  }

  const job = jobs.current;
  if (!job) {
    jobs.idleFor -= dt;
    if (jobs.idleFor <= 0) offer(jobs, at);
    return;
  }

  const dist = Math.hypot(at.x - job.goal.x, at.y - job.goal.y);
  if (job.stage === 'fetch' && dist < 48) {
    if (job.kind === 'GETAWAY') addHeatFromStash(law);
    armLeg(jobs, at);
    say('fetch', job);
    return;
  }
  if (job.stage === 'drop') {
    job.clock -= dt * (job.kind === 'GETAWAY' && law.stars > 0 ? 0.45 : 1);
    const clean = job.kind === 'DELIVER' || law.stars === 0;
    if (dist < 54 && clean) {
      jobs.done += 1;
      jobs.banked += job.reward;
      jobs.notice = `JOB DONE — +$${job.reward}`;
      jobs.noticeT = 3;
      say('done', job);
      jobs.current = null;
      jobs.idleFor = 2.2;
      return;
    }
    if (job.clock <= 0) {
      jobs.notice = 'JOB FAILED — TOO SLOW';
      jobs.noticeT = 3;
      say('fail', job);
      jobs.current = null;
      jobs.idleFor = 2.2;
    }
  }
}

// The stash grab is a crime in itself: two stars of instant attention.
function addHeatFromStash(law) {
  law.heat += 2.15;
  while (law.heat >= 1 && law.stars < 5) { law.stars += 1; law.heat -= 1; }
}

export function addMayhem(jobs, points) {
  jobs.combo += points;
  jobs.comboLeft = 4;
  jobs.mult = 1 + Math.min(4, Math.floor(jobs.combo / 32));
}
