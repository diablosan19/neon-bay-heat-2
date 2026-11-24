// NEON BAY HEAT 2 — world and entity drawing.
// Everything here works in world coordinates; the caller sets up the
// camera transform first. Only the slice of the city near the camera is
// drawn, which keeps the frame cheap despite a few hundred buildings.

import { PALETTE, WORLD_W, WORLD_H, ROAD_W, SHORE_X } from './config.js';

export function paintWorld(g, city, cam, t) {
  const x0 = cam.x - 70, y0 = cam.y - 70;
  const x1 = cam.x + cam.w + 70, y1 = cam.y + cam.h + 70;

  // Sea base, then land, then the sand strip along the shore.
  g.fillStyle = PALETTE.sea;
  g.fillRect(cam.x - 4, cam.y - 4, cam.w + 8, cam.h + 8);
  g.fillStyle = PALETTE.seaLight;
  for (let i = 0; i < 22; i++) {
    const wx = SHORE_X + 190 + ((i * 181 + Math.sin(t * 0.6 + i * 1.7) * 26) % 260);
    const wy = (i * 347) % WORLD_H;
    if (wx > x0 && wx < x1 && wy > y0 && wy < y1) g.fillRect(wx, wy, 46, 3);
  }
  g.fillStyle = PALETTE.sandDark;
  g.fillRect(0, 0, WORLD_W, WORLD_H);
  g.fillStyle = PALETTE.turf;
  g.fillRect(0, 0, SHORE_X, WORLD_H);
  g.fillStyle = PALETTE.sand;
  g.fillRect(SHORE_X, 0, WORLD_W - SHORE_X, WORLD_H);

  // Avenues: edge, asphalt, kerbs, centre dashes.
  for (const x of city.vRoads) {
    if (x < x0 || x > x1) continue;
    g.fillStyle = PALETTE.asphaltEdge;
    g.fillRect(x - ROAD_W / 2 - 6, 0, ROAD_W + 12, WORLD_H);
    g.fillStyle = PALETTE.asphalt;
    g.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  }
  for (const y of city.hRoads) {
    if (y < y0 || y > y1) continue;
    g.fillStyle = PALETTE.asphaltEdge;
    g.fillRect(0, y - ROAD_W / 2 - 6, SHORE_X + 80, ROAD_W + 12);
    g.fillStyle = PALETTE.asphalt;
    g.fillRect(0, y - ROAD_W / 2, SHORE_X + 80, ROAD_W);
  }
  g.fillStyle = PALETTE.dash;
  for (const x of city.vRoads) {
    if (x < x0 || x > x1) continue;
    for (let y = 14; y < WORLD_H; y += 58) g.fillRect(x - 2, y, 4, 27);
  }
  for (const y of city.hRoads) {
    if (y < y0 || y > y1) continue;
    for (let x = 14; x < SHORE_X + 60; x += 58) g.fillRect(x, y - 2, 27, 4);
  }

  // Buildings with a drop shadow, lit windows and the odd neon sign.
  for (const b of city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    g.fillStyle = b.roof;
    g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(b.x, b.y, b.w, 4);
    const cols = Math.max(2, Math.floor(b.w / 17));
    const rows = Math.max(2, Math.floor(b.h / 17));
    g.fillStyle = 'rgba(255,213,120,0.8)';
    for (let i = 0; i < cols * rows; i++) {
      if (!b.windows[i % b.windows.length]) continue;
      g.fillRect(b.x + 7 + (i % cols) * 16, b.y + 9 + Math.floor(i / cols) * 16, 6, 8);
    }
    if (b.sign) {
      g.font = 'bold 11px system-ui, sans-serif';
      g.textAlign = 'center';
      g.shadowColor = b.glow;
      g.shadowBlur = 10;
      g.fillStyle = b.glow;
      g.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + 4);
      g.shadowBlur = 0;
    }
  }

  // Trees and palms.
  for (const tr of city.trees) {
    if (tr.x < x0 || tr.x > x1 || tr.y < y0 || tr.y > y1) continue;
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath(); g.ellipse(tr.x + 4, tr.y + 6, tr.r, tr.r * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = tr.palm ? '#43a45c' : '#2f6d35';
    g.beginPath(); g.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.beginPath(); g.arc(tr.x - tr.r * 0.32, tr.y - tr.r * 0.32, tr.r * 0.48, 0, Math.PI * 2); g.fill();
  }
}

export function paintVehicle(g, car, t) {
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.heading);
  const w = car.w, l = car.l;
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.beginPath(); g.roundRect(-w / 2 + 3, -l / 2 + 4, w, l, 5); g.fill();
  g.fillStyle = car.cop ? '#eef1f5' : car.color;
  g.beginPath(); g.roundRect(-w / 2, -l / 2, w, l, 5); g.fill();
  if (car.cop) {
    g.fillStyle = '#24344d';
    g.fillRect(-w * 0.18, -l / 2, w * 0.36, l);
  }
  // Cabin glass.
  g.fillStyle = 'rgba(13,19,27,0.92)';
  g.beginPath(); g.roundRect(-w * 0.2, -l * 0.34, w * 0.46, l * 0.64, 3); g.fill();
  g.fillStyle = 'rgba(175,218,255,0.45)';
  g.fillRect(w * 0.3, -l * 0.3, w * 0.12, l * 0.58);
  // Lights.
  g.fillStyle = '#fff3b0';
  g.fillRect(w / 2 - 3, -l / 2 + 2, 3, 4);
  g.fillRect(w / 2 - 3, l / 2 - 6, 3, 4);
  g.fillStyle = '#ff4545';
  g.fillRect(-w / 2, -l / 2 + 2, 3, 4);
  g.fillRect(-w / 2, l / 2 - 6, 3, 4);
  if (car.cop) {
    const phase = Math.sin(t * 15) > 0;
    g.fillStyle = phase ? PALETTE.lightRed : PALETTE.lightBlue;
    g.beginPath(); g.arc(0, 0, 5.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = phase ? PALETTE.lightBlue : PALETTE.lightRed;
    g.beginPath(); g.arc(0, -7.5, 3.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(0, 7.5, 3.4, 0, Math.PI * 2); g.fill();
  }
  if (car.type === 'taxi') {
    g.fillStyle = '#14181f';
    g.fillRect(-6, -4.5, 12, 9);
    g.fillStyle = '#ffd23f';
    g.font = 'bold 6.5px system-ui';
    g.textAlign = 'center';
    g.fillText('TAXI', 0, 2.2);
  }
  g.restore();
  if (car.honkT > 0) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 13px system-ui';
    g.textAlign = 'center';
    g.fillText('!', car.x + 17, car.y - 13);
  }
}

export function paintPed(g, p) {
  if (p.downT > 0.35) return; // flat on the ground, mostly out of frame
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(p.x + 2, p.y + 4, 7, 3.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = p.top;
  g.beginPath(); g.arc(p.x, p.y, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ecc39c';
  g.beginPath(); g.arc(p.x, p.y - 1, 3.5, 0, Math.PI * 2); g.fill();
  if (p.fleeT > 0) {
    g.fillStyle = '#ffffff';
    g.font = 'bold 12px system-ui';
    g.textAlign = 'center';
    g.fillText('!', p.x + 10, p.y - 8);
  }
}

export function paintGoal(g, goal, color, label, t) {
  const pulse = 30 + Math.sin(t * 4.2) * 4.5;
  const bob = Math.sin(t * 4.2) * 5;
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.beginPath(); g.arc(goal.x, goal.y, pulse, 0, Math.PI * 2); g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(goal.x, goal.y - 42 + bob);
  g.lineTo(goal.x - 11, goal.y - 65 + bob);
  g.lineTo(goal.x + 11, goal.y - 65 + bob);
  g.closePath(); g.fill();
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(label, goal.x, goal.y - 73 + bob);
}
