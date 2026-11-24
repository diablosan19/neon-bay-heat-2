// NEON BAY HEAT 2 — HUD and minimap.
// One job: everything drawn in screen space — cash, combo, wanted stars,
// the mission banner and objective line, the bust meter, the minimap with
// its blips, and the title / busted / paused overlays.

import { VIEW, WORLD } from './config.js';
import { districtAt } from './city.js';

function stars(ctx, x, y, n, t) {
  for (let i = 0; i < 5; i++) {
    const sx = x + i * 30;
    ctx.font = '24px system-ui';
    ctx.textAlign = 'center';
    if (i < n) {
      ctx.fillStyle = (n >= 4 && Math.sin(t * 9) > 0) ? '#ff3b30' : '#ffd23f';
      ctx.fillText('★', sx, y);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillText('★', sx, y);
    }
  }
}

export function drawHud(ctx, s, t) {
  const { cash, missions, police, player } = s;
  // Top-left: cash + jobs done.
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#0b0e13';
  ctx.fillText(`$${cash}`, 20, 40);
  ctx.fillStyle = '#57e389';
  ctx.fillText(`$${cash}`, 18, 38);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`JOBS ${missions.completed}   EARNED $${missions.earned}`, 18, 62);
  ctx.fillText(districtAt(player.x, player.y), 18, 80);

  // Top-right: wanted stars.
  stars(ctx, VIEW.width - 168, 42, police.stars, t);
  if (police.bust > 0.02 && !police.busted) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(VIEW.width - 190, 56, 170, 13);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(VIEW.width - 188, 58, 166 * police.bust, 9);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED METER', VIEW.width - 105, 66);
  }

  // Combo, bottom-left.
  if (missions.combo > 0) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillStyle = '#ff9f1c';
    ctx.fillText(`MAYHEM x${missions.multiplier}`, 18, VIEW.height - 46);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`combo ${Math.floor(missions.combo)} — cash out by stopping the chaos`, 18, VIEW.height - 26);
  }

  // Mission banner + objective, top centre.
  if (missions.bannerT > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 27px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const w = ctx.measureText(missions.banner).width + 44;
    ctx.fillRect(VIEW.width / 2 - w / 2, 16, w, 44);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(missions.banner, VIEW.width / 2, 48);
  }
  const a = missions.active;
  if (a) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    const dist = Math.round(Math.hypot(player.x - a.target.x, player.y - a.target.y));
    const clock = a.phase === 'dropoff' ? `   ⏱ ${Math.max(0, a.timeLeft).toFixed(0)}s` : '';
    ctx.fillText(`${a.type}: ${a.label} — ${dist}m${clock}`, VIEW.width / 2, 88);
  }

  drawMinimap(ctx, s, t);
}

function drawMinimap(ctx, s, t) {
  const mw = 196, mh = 148, mx = VIEW.width - mw - 14, my = VIEW.height - mh - 14;
  const sx = mw / WORLD.width, sy = mh / WORLD.height;
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  ctx.beginPath(); ctx.roundRect(mx - 3, my - 3, mw + 6, mh + 6, 8); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 6); ctx.clip();
  ctx.fillStyle = '#3f7a44';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#0d3b56';
  ctx.fillRect(mx + WORLD.beachX * sx, my, mw - WORLD.beachX * sx, mh);
  ctx.strokeStyle = 'rgba(20,22,28,0.85)';
  ctx.lineWidth = 3;
  for (const x of s.city.vRoads) { ctx.beginPath(); ctx.moveTo(mx + x * sx, my); ctx.lineTo(mx + x * sx, my + mh); ctx.stroke(); }
  for (const y of s.city.hRoads) { ctx.beginPath(); ctx.moveTo(mx, my + y * sy); ctx.lineTo(mx + mw, my + y * sy); ctx.stroke(); }
  const blip = (x, y, color, r = 3) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(mx + x * sx, my + y * sy, r, 0, Math.PI * 2); ctx.fill(); };
  const a = s.missions.active;
  if (a) blip(a.target.x, a.target.y, '#ffd23f', 4);
  for (const c of s.police.cops) blip(c.x, c.y, Math.sin(t * 8) > 0 ? '#ff3b30' : '#5b8cff', 3);
  for (const c of s.traffic) if (!c.parked) blip(c.x, c.y, 'rgba(255,255,255,0.35)', 1.6);
  blip(s.player.x, s.player.y, '#ffffff', 4);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('NEON BAY', mx + 6, my + 14);
}

export function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(5,8,14,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.font = 'bold 74px system-ui, sans-serif';
  ctx.fillStyle = '#ff2e88';
  ctx.fillText('NEON BAY', VIEW.width / 2, 268);
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('HEAT 2', VIEW.width / 2, 348);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#f2f4f8';
  ctx.fillText('Steal cars. Run jobs. Outrun the law. The whole bay is yours.', VIEW.width / 2, 402);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('WASD / arrows — drive & walk      E — enter / exit car      SHIFT — sprint      P — pause', VIEW.width / 2, 448);
  if (Math.sin(t * 3.4) > -0.2) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('PRESS ENTER TO PLAY', VIEW.width / 2, 512);
  }
}

export function drawBusted(ctx, fine) {
  ctx.fillStyle = 'rgba(20,4,4,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.font = 'bold 68px system-ui, sans-serif';
  ctx.fillStyle = '#ff3b30';
  ctx.fillText('BUSTED', VIEW.width / 2, 360);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`The fine: $${fine}. Your heat is gone — press ENTER to walk free.`, VIEW.width / 2, 408);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5,8,14,0.5)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('PAUSED', VIEW.width / 2, 380);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Progress is saved. P to resume.', VIEW.width / 2, 418);
}
