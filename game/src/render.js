// NEON BAY HEAT 2 — world rendering.
// One job: draw the city from the camera's view — water, sand, grass,
// roads with lane markings, buildings with lit windows and neon signs,
// palm trees, then the mission markers the player drives toward.

import { COLORS, WORLD } from './config.js';
import { districtAt } from './city.js';

export function drawWorld(ctx, city, cam, t) {
  const { width: W, height: H } = WORLD;
  // Ground: water everywhere first, then the land mass, sand, grass.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  // gentle water shimmer
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 26; i++) {
    const wx = WORLD.beachX + 130 + ((i * 173 + Math.sin(t * 0.7 + i) * 24) % 300);
    const wy = (i * 331) % H;
    if (wx > cam.x - 40 && wx < cam.x + cam.w + 40 && wy > cam.y && wy < cam.y + cam.h) ctx.fillRect(wx, wy, 44, 3);
  }
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, WORLD.beachX, H);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(WORLD.beachX, 0, W - WORLD.beachX, H);

  // Roads.
  ctx.fillStyle = COLORS.road;
  for (const x of city.vRoads) ctx.fillRect(x - WORLD.roadHalf, 0, WORLD.roadHalf * 2, H);
  for (const y of city.hRoads) ctx.fillRect(0, y - WORLD.roadHalf, WORLD.beachX + 60, WORLD.roadHalf * 2);
  // Sidewalk edges.
  ctx.fillStyle = COLORS.sidewalk;
  for (const x of city.vRoads) { ctx.fillRect(x - WORLD.roadHalf - 5, 0, 5, H); ctx.fillRect(x + WORLD.roadHalf, 0, 5, H); }
  // Lane dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const x of city.vRoads) for (let y = 12; y < H; y += 56) ctx.fillRect(x - 2, y, 4, 26);
  for (const y of city.hRoads) for (let x = 12; x < WORLD.beachX + 40; x += 56) ctx.fillRect(x, y - 2, 26, 4);

  // Buildings (only those near the view).
  for (const b of city.buildings) {
    if (b.x + b.w < cam.x - 60 || b.x > cam.x + cam.w + 60 || b.y + b.h < cam.y - 60 || b.y > cam.y + cam.h + 60) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(b.x, b.y, b.w, 5);
    // Lit windows.
    const cols = Math.max(2, Math.floor(b.w / 16)), rows = Math.max(2, Math.floor(b.h / 16));
    for (let i = 0; i < cols * rows; i++) {
      if (!b.lit[i % b.lit.length]) continue;
      const wx = b.x + 7 + (i % cols) * 15, wy = b.y + 8 + Math.floor(i / cols) * 15;
      ctx.fillStyle = 'rgba(255, 214, 120, 0.75)';
      ctx.fillRect(wx, wy, 6, 8);
    }
    if (b.sign) {
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = b.signColor;
      ctx.shadowColor = b.signColor; ctx.shadowBlur = 9;
      ctx.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + 4);
      ctx.shadowBlur = 0;
    }
  }
  // Trees / palms.
  for (const tr of city.trees) {
    if (tr.x < cam.x - 40 || tr.x > cam.x + cam.w + 40 || tr.y < cam.y - 40 || tr.y > cam.y + cam.h + 40) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(tr.x + 4, tr.y + 6, tr.r, tr.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tr.palm ? '#3e9e57' : '#2e6b34';
    ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(tr.x - tr.r * 0.3, tr.y - tr.r * 0.3, tr.r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const w = car.w, l = car.l;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-w / 2 + 3, -l / 2 + 4, w, l);
  ctx.fillStyle = car.paint;
  ctx.beginPath(); ctx.roundRect(-w / 2, -l / 2, w, l, 5); ctx.fill();
  ctx.fillStyle = 'rgba(15,20,28,0.9)';
  ctx.beginPath(); ctx.roundRect(-w * 0.22, -l * 0.32, w * 0.44, l * 0.6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.5)';
  ctx.fillRect(w * 0.28, -l * 0.3, w * 0.14, l * 0.6);
  // Headlights + tail lights.
  ctx.fillStyle = '#fff6bf';
  ctx.fillRect(w / 2 - 3, -l / 2 + 2, 3, 4); ctx.fillRect(w / 2 - 3, l / 2 - 6, 3, 4);
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(-w / 2, -l / 2 + 2, 3, 4); ctx.fillRect(-w / 2, l / 2 - 6, 3, 4);
  if (car.cop) {
    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(-w * 0.3, -l / 2, w * 0.6, l);
    const flash = Math.sin(t * 14) > 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f6df6';
    ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? '#2f6df6' : '#ff3b30';
    ctx.beginPath(); ctx.arc(0, -7, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 7, 3.4, 0, Math.PI * 2); ctx.fill();
  }
  if (car.kind && car.kind.name === 'TAXI') {
    ctx.fillStyle = '#14181f';
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 2.5);
  }
  ctx.restore();
  if (car.honk > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', car.x + 16, car.y - 14);
  }
}

export function drawPed(ctx, p) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 4, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.shirt;
  ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(p.x, p.y - 1, 3.6, 0, Math.PI * 2); ctx.fill();
  if (p.panic > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', p.x + 9, p.y - 8);
  }
}

export function drawMarker(ctx, target, color, label, t) {
  const bob = Math.sin(t * 4) * 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(target.x, target.y, 30 + Math.sin(t * 4) * 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(target.x, target.y - 44 + bob);
  ctx.lineTo(target.x - 11, target.y - 66 + bob);
  ctx.lineTo(target.x + 11, target.y - 66 + bob);
  ctx.closePath(); ctx.fill();
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, target.x, target.y - 74 + bob);
}

export { districtAt };
