// NEON BAY HEAT 2 — painting the world.
// Everything here works in world coordinates under the camera transform
// the main loop sets up: sea and sand first, turf, the avenue grid,
// buildings with their windows and neon, trees, then the actors.

import { WORLD_W, WORLD_H, PITCH, ROAD_W, BEACH_X, COL } from './config.js';

export function paintWorld(g, city, view, t) {
  // Sea covers the whole view; land is drawn over it.
  g.fillStyle = COL.sea;
  g.fillRect(view.x, view.y, view.w, view.h);
  g.fillStyle = 'rgba(255,255,255,0.055)';
  for (let i = 0; i < 30; i++) {
    const wx = BEACH_X + 190 + ((i * 167) % 260) + Math.sin(t * 0.6 + i * 1.7) * 16;
    const wy = (i * 293) % WORLD_H;
    if (wx > view.x - 50 && wx < view.x + view.w + 50 && wy > view.y && wy < view.y + view.h) {
      g.fillRect(wx, wy, 40, 3);
    }
  }
  // Landmass: turf, with a sand apron from BEACH_X to the world edge.
  g.fillStyle = COL.lawn;
  g.fillRect(0, 0, WORLD_W, WORLD_H);
  g.fillStyle = COL.sand;
  g.fillRect(BEACH_X, 0, WORLD_W - BEACH_X, WORLD_H);
  g.fillStyle = COL.sandWet;
  g.fillRect(BEACH_X, 0, 26, WORLD_H);
  // Checker the turf lightly so open ground reads as ground.
  g.fillStyle = COL.lawnAlt;
  const step = PITCH;
  for (let x = 0; x < BEACH_X; x += step) {
    for (let y = 0; y < WORLD_H; y += step) {
      if (((x / step) + (y / step)) % 2 === 0) g.fillRect(x, y, step, step);
    }
  }

  // Avenues: edge, asphalt, kerbs, centre dashes.
  const drawRoads = (lines, vertical) => {
    for (const c of lines) {
      const a = c - ROAD_W / 2, b = c + ROAD_W / 2;
      g.fillStyle = COL.roadEdge;
      if (vertical) g.fillRect(a - 4, 0, ROAD_W + 8, WORLD_H); else g.fillRect(0, a - 4, WORLD_W, ROAD_W + 8);
      g.fillStyle = COL.road;
      if (vertical) g.fillRect(a, 0, ROAD_W, WORLD_H); else g.fillRect(0, a, WORLD_W, ROAD_W);
      g.fillStyle = COL.dash;
      const lim = vertical ? WORLD_H : WORLD_W;
      for (let d = 14; d < lim; d += 58) {
        if (vertical) g.fillRect(c - 2, d, 4, 27); else g.fillRect(d, c - 2, 27, 4);
      }
    }
  };
  drawRoads(city.vRoads, true);
  drawRoads(city.hRoads, false);

  // Buildings, culled to the view.
  for (const b of city.buildings) {
    if (b.x + b.w < view.x - 40 || b.x > view.x + view.w + 40 || b.y + b.h < view.y - 40 || b.y > view.y + view.h + 40) continue;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    g.fillStyle = b.roof;
    g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(b.x, b.y, b.w, 5);
    g.fillRect(b.x, b.y, 5, b.h);
    // Window grid, some lit.
    const cols = Math.max(2, Math.floor(b.w / 17));
    const rows = Math.max(2, Math.floor(b.h / 17));
    for (let i = 0; i < cols * rows; i++) {
      if (!b.wins[i % b.wins.length]) continue;
      g.fillStyle = 'rgba(255,216,130,0.8)';
      g.fillRect(b.x + 7 + (i % cols) * 16, b.y + 8 + Math.floor(i / cols) * 16, 6, 8);
    }
    if (b.sign) {
      g.font = 'bold 11px system-ui, sans-serif';
      g.textAlign = 'center';
      g.shadowColor = b.signCol;
      g.shadowBlur = 10;
      g.fillStyle = b.signCol;
      g.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + 4);
      g.shadowBlur = 0;
    }
  }

  // Trees and palms.
  for (const tr of city.trees) {
    if (tr.x < view.x - 40 || tr.x > view.x + view.w + 40 || tr.y < view.y - 40 || tr.y > view.y + view.h + 40) continue;
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.beginPath(); g.ellipse(tr.x + 4, tr.y + 6, tr.r, tr.r * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = tr.palm ? '#3f9e58' : '#2e6b34';
    g.beginPath(); g.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.13)';
    g.beginPath(); g.arc(tr.x - tr.r * 0.3, tr.y - tr.r * 0.3, tr.r * 0.48, 0, Math.PI * 2); g.fill();
  }
}

// Cars are drawn nose-east at heading 0, so w runs along the nose and
// l across it. Cruisers get the white livery, a stripe and a lightbar
// whose two lamps alternate with time.
export function paintCar(g, car, t) {
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.heading);
  const w = car.w, l = car.l;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.roundRect(-w / 2 + 3, -l / 2 + 4, w, l, 5); g.fill();
  g.fillStyle = car.paint;
  g.beginPath(); g.roundRect(-w / 2, -l / 2, w, l, 5); g.fill();
  if (car.cop) {
    g.fillStyle = COL.copStripe;
    g.fillRect(-w * 0.3, -l / 2, w * 0.24, l);
    g.fillRect(w * 0.14, -l / 2, w * 0.1, l);
  }
  if (car.type === 'taxi') {
    g.fillStyle = '#14181f';
    g.fillRect(-6, -4.5, 12, 9);
    g.fillStyle = '#ffd23f';
    g.font = 'bold 7px system-ui';
    g.textAlign = 'center';
    g.fillText('TAXI', 0, 2.5);
  }
  // Cabin and glass.
  g.fillStyle = 'rgba(13,18,26,0.92)';
  g.beginPath(); g.roundRect(-w * 0.2, -l * 0.34, w * 0.42, l * 0.68, 3); g.fill();
  g.fillStyle = 'rgba(175,215,250,0.45)';
  g.fillRect(w * 0.24, -l * 0.3, w * 0.12, l * 0.6);
  // Lights.
  g.fillStyle = '#fff3b0';
  g.fillRect(w / 2 - 3, -l / 2 + 2, 3, 4);
  g.fillRect(w / 2 - 3, l / 2 - 6, 3, 4);
  g.fillStyle = '#ff4545';
  g.fillRect(-w / 2, -l / 2 + 2, 3, 4);
  g.fillRect(-w / 2, l / 2 - 6, 3, 4);
  if (car.cop) {
    const phase = Math.sin(t * 13) > 0;
    g.fillStyle = phase ? COL.lampR : '#7a1d1d';
    g.beginPath(); g.arc(-3.5, 0, 4.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = phase ? '#1d3f7a' : COL.lampB;
    g.beginPath(); g.arc(3.5, 0, 4.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(10,10,10,0.85)';
    g.fillRect(-1, -l / 2, 2, l);
  }
  g.restore();
}

export function paintPed(g, p) {
  if (p.downT > 0) {
    g.save();
    g.translate(p.x, p.y);
    g.rotate(Math.PI / 2);
    g.fillStyle = p.top;
    g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = p.skin;
    g.beginPath(); g.arc(8, 0, 3.4, 0, Math.PI * 2); g.fill();
    g.restore();
    return;
  }
  const bob = Math.sin(p.phase) * 1.6;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(p.x + 2, p.y + 4, 7, 3.2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = p.top;
  g.beginPath(); g.arc(p.x, p.y + bob * 0.3, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = p.skin;
  g.beginPath(); g.arc(p.x, p.y - 1 + bob * 0.3, 3.6, 0, Math.PI * 2); g.fill();
  if (p.panic > 0) {
    g.fillStyle = '#ffffff';
    g.font = 'bold 12px system-ui';
    g.textAlign = 'center';
    g.fillText('!', p.x + 10, p.y - 8);
  }
}

// The job marker: a pulsing ring, a bobbing chevron and a label.
export function paintGoal(g, goal, colour, label, t) {
  const pulse = 30 + Math.sin(t * 4) * 4.5;
  g.strokeStyle = colour;
  g.lineWidth = 3;
  g.beginPath(); g.arc(goal.x, goal.y, pulse, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(goal.x, goal.y, pulse + 7, 0, Math.PI * 2); g.stroke();
  const bob = Math.sin(t * 4) * 5;
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(goal.x, goal.y - 42 + bob);
  g.lineTo(goal.x - 11, goal.y - 64 + bob);
  g.lineTo(goal.x + 11, goal.y - 64 + bob);
  g.closePath(); g.fill();
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(label, goal.x, goal.y - 72 + bob);
}
