// NEON BAY HEAT 2 — everything nailed to the screen.
// Cash and career stats top-left, the wanted stars top-right with the
// bust meter under them when the law has its hands on the player, the
// current job's objective across the top centre, the mayhem combo
// bottom-left, and a living minimap bottom-right. Plus the three full
// overlays: title, busted, paused.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, BEACH_X, SEA_X } from './config.js';
import { districtAt } from './city.js';

function panel(g, x, y, w, h) {
  g.fillStyle = 'rgba(8,12,18,0.62)';
  g.beginPath();
  g.roundRect(x, y, w, h, 8);
  g.fill();
}

function drawStars(g, x, y, stars, t) {
  g.font = '25px system-ui, sans-serif';
  g.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    if (i < stars) {
      g.fillStyle = stars >= 4 && Math.sin(t * 9) > 0 ? '#ff3b30' : '#ffd23f';
    } else {
      g.fillStyle = 'rgba(255,255,255,0.2)';
    }
    g.fillText('★', x + i * 29, y);
  }
}

function drawMinimap(g, s, t) {
  const mw = 198;
  const mh = 150;
  const mx = VIEW_W - mw - 14;
  const my = VIEW_H - mh - 14;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  panel(g, mx - 3, my - 3, mw + 6, mh + 6);
  g.save();
  g.beginPath();
  g.roundRect(mx, my, mw, mh, 6);
  g.clip();
  g.fillStyle = '#2f6b4f';
  g.fillRect(mx, my, mw, mh);
  g.fillStyle = '#d9b878';
  g.fillRect(mx + BEACH_X * sx, my, (SEA_X - BEACH_X) * sx, mh);
  g.fillStyle = '#0b3d5c';
  g.fillRect(mx + SEA_X * sx, my, mw - SEA_X * sx, mh);
  g.strokeStyle = 'rgba(18,20,26,0.8)';
  g.lineWidth = 2.6;
  const { V_ROADS, H_ROADS } = s.roads;
  for (const x of V_ROADS) {
    g.beginPath(); g.moveTo(mx + x * sx, my); g.lineTo(mx + x * sx, my + mh); g.stroke();
  }
  for (const y of H_ROADS) {
    g.beginPath(); g.moveTo(mx, my + y * sy); g.lineTo(mx + mw, my + y * sy); g.stroke();
  }
  const dot = (x, y, color, r) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(mx + x * sx, my + y * sy, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const c of s.traffic) if (!c.parked) dot(c.x, c.y, 'rgba(255,255,255,0.35)', 1.5);
  for (const cop of s.law.fleet) dot(cop.x, cop.y, Math.sin(t * 8) > 0 ? '#ff5147' : '#5b8cff', 3);
  const job = s.jobs.current;
  if (job) dot(job.goal.x, job.goal.y, '#ffd23f', 3.6);
  const at = s.onFoot ? s.player : s.car;
  dot(at.x, at.y, '#ffffff', 3.8);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = 'bold 9.6px system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText('NEON BAY', mx + 6, my + 13);
}

// If the goal is off-screen, an arrow on the view's edge points to it.
function drawGoalArrow(g, s) {
  const job = s.jobs.current;
  if (!job) return;
  const vw = VIEW_W / s.cam.zoom;
  const vh = VIEW_H / s.cam.zoom;
  const gx = (job.goal.x - s.cam.x) * s.cam.zoom + VIEW_W / 2;
  const gy = (job.goal.y - s.cam.y) * s.cam.zoom + VIEW_H / 2;
  if (gx > -20 && gx < VIEW_W + 20 && gy > -20 && gy < VIEW_H + 20) return;
  const cx = Math.max(34, Math.min(VIEW_W - 34, gx));
  const cy = Math.max(90, Math.min(VIEW_H - 190, gy));
  const ang = Math.atan2(gy - cy, gx - cx);
  g.save();
  g.translate(cx, cy);
  g.rotate(ang);
  g.fillStyle = job.stage === 'fetch' ? '#57e389' : '#ffd23f';
  g.beginPath();
  g.moveTo(15, 0);
  g.lineTo(-9, -9);
  g.lineTo(-9, 9);
  g.closePath();
  g.fill();
  g.restore();
  void vw; void vh;
}

export function paintHud(g, s, t) {
  const at = s.onFoot ? s.player : s.car;

  panel(g, 12, 12, 218, 74);
  g.textAlign = 'left';
  g.font = 'bold 25px system-ui, sans-serif';
  g.fillStyle = '#57e389';
  g.fillText(`$${s.cash}`, 24, 44);
  g.font = '12.6px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.fillText(`JOBS ${s.jobs.done} · BANKED $${s.jobs.banked}`, 24, 64);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillText(at.x >= BEACH_X ? 'NEON BEACH' : districtAt(at.x, at.y).name, 24, 80);

  drawStars(g, VIEW_W - 168, 42, s.law.stars, t);
  if (s.law.bust > 0.02) {
    panel(g, VIEW_W - 190, 52, 176, 26);
    g.fillStyle = '#ff3b30';
    g.fillRect(VIEW_W - 184, 68, 164 * Math.min(1, s.law.bust), 5);
    g.fillStyle = s.law.bust > 0.7 && Math.sin(t * 10) > 0 ? '#ff5147' : '#ffffff';
    g.font = 'bold 10.6px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('BUSTED', VIEW_W - 102, 64);
  }

  const jobs = s.jobs;
  if (jobs.bannerT > 0 && jobs.banner) {
    g.font = 'bold 26px system-ui, sans-serif';
    const w = g.measureText(jobs.banner).width + 46;
    panel(g, VIEW_W / 2 - w / 2, 14, w, 42);
    g.fillStyle = '#ffd23f';
    g.textAlign = 'center';
    g.fillText(jobs.banner, VIEW_W / 2, 45);
  } else if (jobs.current) {
    const job = jobs.current;
    const dist = Math.round(Math.hypot(at.x - job.goal.x, at.y - job.goal.y));
    const clock = job.stage === 'drop' || job.kind === 'GETAWAY'
      ? ` · ${Math.max(0, Math.ceil(job.clock))}s` : '';
    const line = `${job.kind} — ${job.text} · ${dist}m${clock}`;
    g.font = 'bold 15.6px system-ui, sans-serif';
    const w = g.measureText(line).width + 34;
    panel(g, VIEW_W / 2 - w / 2, 16, w, 32);
    g.fillStyle = job.stage === 'fetch' ? '#a9f0c0' : '#ffe9a8';
    g.textAlign = 'center';
    g.fillText(line, VIEW_W / 2, 38);
  }

  if (jobs.combo > 0) {
    panel(g, 12, VIEW_H - 84, 208, 70);
    g.textAlign = 'left';
    g.font = 'bold 19px system-ui, sans-serif';
    g.fillStyle = '#ff9f1c';
    g.fillText(`MAYHEM ×${jobs.mult}`, 24, VIEW_H - 56);
    g.font = '12.6px system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillText(`${Math.floor(jobs.combo)} pts — let it lapse to bank`, 24, VIEW_H - 36);
    g.fillStyle = '#ff9f1c';
    g.fillRect(24, VIEW_H - 28, 184 * Math.max(0, jobs.comboLeft / 4), 4);
  }

  drawGoalArrow(g, s);
  drawMinimap(g, s, t);
}

export function paintTitle(g, t) {
  const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, 'rgba(4,6,12,0.72)');
  grad.addColorStop(0.55, 'rgba(4,6,12,0.45)');
  grad.addColorStop(1, 'rgba(4,6,12,0.78)');
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.font = 'bold 76px system-ui, sans-serif';
  g.shadowColor = '#ff2e88';
  g.shadowBlur = 26;
  g.fillStyle = '#ff2e88';
  g.fillText('NEON BAY', VIEW_W / 2, 262);
  g.shadowColor = '#22d3ee';
  g.fillStyle = '#22d3ee';
  g.fillText('HEAT 2', VIEW_W / 2, 344);
  g.shadowBlur = 0;
  g.font = '17px system-ui, sans-serif';
  g.fillStyle = '#f2f4f8';
  g.fillText('Steal cars. Run jobs. Outrun the law. The whole bay is yours.', VIEW_W / 2, 398);
  g.font = '14px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('WASD / arrows — drive & walk      E — enter / exit car      SHIFT — sprint      P — pause', VIEW_W / 2, 442);
  if (Math.sin(t * 3.4) > -0.25) {
    g.font = 'bold 20px system-ui, sans-serif';
    g.fillStyle = '#ffd23f';
    g.fillText('PRESS ENTER TO PLAY', VIEW_W / 2, 508);
  }
}

export function paintBusted(g, fine) {
  g.fillStyle = 'rgba(24,4,4,0.55)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.font = 'bold 70px system-ui, sans-serif';
  g.shadowColor = '#ff3b30';
  g.shadowBlur = 22;
  g.fillStyle = '#ff3b30';
  g.fillText('BUSTED', VIEW_W / 2, 356);
  g.shadowBlur = 0;
  g.font = '18px system-ui, sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText(`Fine paid: $${fine}. The slate is clean — press ENTER.`, VIEW_W / 2, 404);
}

export function paintPaused(g) {
  g.fillStyle = 'rgba(4,6,12,0.5)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.font = 'bold 44px system-ui, sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText('PAUSED', VIEW_W / 2, 376);
  g.font = '15px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('Progress saved. P to resume.', VIEW_W / 2, 412);
}
