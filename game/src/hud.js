// NEON BAY HEAT 2 — screen-space drawing.
// Cash and stars up top, the job notice in the middle, mayhem bottom
// left, the bust meter under the stars, and a minimap bottom right
// with blips for the law, the traffic, the job and the player. Plus
// the three full-screen states: title, paused, busted.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, BEACH_X } from './config.js';
import { districtNameAt } from './city.js';

function starRow(g, stars, t) {
  for (let i = 0; i < 5; i++) {
    const x = VIEW_W - 172 + i * 31;
    g.font = '25px system-ui';
    g.textAlign = 'center';
    if (i < stars) {
      g.fillStyle = stars >= 4 && Math.sin(t * 9) > 0 ? '#ff4040' : '#ffd23f';
      g.fillText('★', x, 42);
    } else {
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.fillText('★', x, 42);
    }
  }
}

function minimap(g, s, t) {
  const mw = 198, mh = 150;
  const mx = VIEW_W - mw - 14, my = VIEW_H - mh - 14;
  const kx = mw / WORLD_W, ky = mh / WORLD_H;
  g.fillStyle = 'rgba(8,12,18,0.8)';
  g.beginPath(); g.roundRect(mx - 3, my - 3, mw + 6, mh + 6, 8); g.fill();
  g.save();
  g.beginPath(); g.roundRect(mx, my, mw, mh, 6); g.clip();
  g.fillStyle = '#47824a';
  g.fillRect(mx, my, mw, mh);
  g.fillStyle = '#0a3a56';
  g.fillRect(mx + BEACH_X * kx, my, mw - BEACH_X * kx, mh);
  g.strokeStyle = 'rgba(18,20,25,0.85)';
  g.lineWidth = 3;
  for (const x of s.city.vRoads) { g.beginPath(); g.moveTo(mx + x * kx, my); g.lineTo(mx + x * kx, my + mh); g.stroke(); }
  for (const y of s.city.hRoads) { g.beginPath(); g.moveTo(mx, my + y * ky); g.lineTo(mx + mw, my + y * ky); g.stroke(); }
  const dot = (x, y, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(mx + x * kx, my + y * ky, r, 0, Math.PI * 2); g.fill(); };
  const job = s.jobs.current;
  if (job) dot(job.goal.x, job.goal.y, '#ffd23f', 4);
  for (const c of s.traffic) if (!c.parked) dot(c.x, c.y, 'rgba(255,255,255,0.35)', 1.6);
  for (const c of s.law.fleet) dot(c.x, c.y, Math.sin(t * 8) > 0 ? '#ff4040' : '#5b8cff', 3);
  const f = s.onFoot ? s.player : s.car;
  dot(f.x, f.y, '#ffffff', 4);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = 'bold 10px system-ui';
  g.textAlign = 'left';
  g.fillText('NEON BAY', mx + 6, my + 14);
}

export function paintHud(g, s, t) {
  const f = s.onFoot ? s.player : s.car;
  g.textAlign = 'left';
  g.font = 'bold 27px system-ui, sans-serif';
  g.fillStyle = '#0b0e13';
  g.fillText(`$${s.cash}`, 20, 41);
  g.fillStyle = '#57e389';
  g.fillText(`$${s.cash}`, 18, 39);
  g.font = '13px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.fillText(`JOBS ${s.jobs.done} · BANKED $${s.jobs.banked}`, 18, 63);
  g.fillText(districtNameAt(f.x, f.y), 18, 81);

  starRow(g, s.law.stars, t);
  if (s.law.bustMeter > 0.02) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(VIEW_W - 192, 56, 172, 13);
    g.fillStyle = '#ff4040';
    g.fillRect(VIEW_W - 190, 58, 168 * s.law.bustMeter, 9);
    g.fillStyle = '#fff';
    g.font = 'bold 10px system-ui';
    g.textAlign = 'center';
    g.fillText('BUST METER', VIEW_W - 106, 66);
  }

  if (s.jobs.noticeT > 0) {
    g.textAlign = 'center';
    g.font = 'bold 26px system-ui, sans-serif';
    const w = g.measureText(s.jobs.notice).width + 46;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(VIEW_W / 2 - w / 2, 15, w, 44);
    g.fillStyle = '#ffd23f';
    g.fillText(s.jobs.notice, VIEW_W / 2, 48);
  }
  const job = s.jobs.current;
  if (job) {
    const d = Math.round(Math.hypot(f.x - job.goal.x, f.y - job.goal.y));
    const clock = job.stage === 'drop' ? ` · ⏱ ${Math.max(0, job.clock).toFixed(0)}s` : '';
    const gate = job.kind === 'GETAWAY' && job.stage === 'drop' && s.law.stars > 0 ? ' · LOSE THE HEAT' : '';
    g.textAlign = 'center';
    g.font = 'bold 16px system-ui, sans-serif';
    g.fillStyle = '#ffe9a8';
    g.fillText(`${job.kind}: ${job.text} — ${d}m${clock}${gate}`, VIEW_W / 2, 88);
    // Off-screen direction arrow for the goal.
    if (d > 330) {
      const ang = Math.atan2(job.goal.y - f.y, job.goal.x - f.x);
      const ax = VIEW_W / 2 + Math.cos(ang) * 120;
      const ay = 118 + Math.sin(ang) * 26;
      g.save();
      g.translate(ax, ay);
      g.rotate(ang);
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.moveTo(12, 0); g.lineTo(-7, -7); g.lineTo(-7, 7);
      g.closePath(); g.fill();
      g.restore();
    }
  }

  if (s.jobs.combo > 0) {
    g.textAlign = 'left';
    g.font = 'bold 19px system-ui, sans-serif';
    g.fillStyle = '#ff9f1c';
    g.fillText(`MAYHEM ×${s.jobs.mult}`, 18, VIEW_H - 48);
    g.font = '13px system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillText(`combo ${Math.floor(s.jobs.combo)} — pays out when the chaos cools`, 18, VIEW_H - 28);
  }

  minimap(g, s, t);
}

export function paintTitle(g, t) {
  g.fillStyle = 'rgba(4,7,12,0.6)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.font = 'bold 76px system-ui, sans-serif';
  g.fillStyle = '#ff5da2';
  g.fillText('NEON BAY', VIEW_W / 2, 262);
  g.fillStyle = '#37e0c8';
  g.fillText('HEAT 2', VIEW_W / 2, 342);
  g.font = '17px system-ui, sans-serif';
  g.fillStyle = '#f2f4f8';
  g.fillText('Steal cars. Run jobs. Outrun the law. The whole bay is yours.', VIEW_W / 2, 398);
  g.font = '14px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('WASD / arrows — move & drive · E — enter / exit car · SHIFT — sprint · P — pause', VIEW_W / 2, 442);
  if (Math.sin(t * 3.4) > -0.2) {
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
  g.fillStyle = '#ff4040';
  g.fillText('BUSTED', VIEW_W / 2, 356);
  g.font = '18px system-ui, sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText(`Fine paid: $${fine}. The heat is off — press ENTER to walk free.`, VIEW_W / 2, 404);
}

export function paintPaused(g) {
  g.fillStyle = 'rgba(4,7,12,0.5)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.font = 'bold 44px system-ui, sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText('PAUSED', VIEW_W / 2, 378);
  g.font = '15px system-ui, sans-serif';
  g.fillText('Progress saved. Press P to roll again.', VIEW_W / 2, 414);
}
