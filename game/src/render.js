// NEON BAY HEAT 2 — painting the world.
// Everything the camera sees, drawn in world space: sea and sand, turf
// and block pavement, the avenue grid with its dashes and crosswalks,
// buildings with lit windows and neon signs, palms, then the actors —
// cars with proper bodies (a cruiser is a white car with a lightbar,
// never a dot), pedestrians, and the pulsing goal ring for the job.

import {
  WORLD_W, WORLD_H, ROAD_W, BEACH_X, SEA_X, PALETTE,
} from './config.js';
import { V_ROADS, H_ROADS } from './city.js';
import { hash2 } from './random.js';

function inView(x, y, w, h, view) {
  return x + w >= view.x && y + h >= view.y && x <= view.x + view.w && y <= view.y + view.h;
}

export function paintWorld(g, city, view, t) {
  // Sea first: it is the backdrop for the whole map and everything
  // past the world's edges.
  g.fillStyle = PALETTE.sea;
  g.fillRect(view.x, view.y, view.w, view.h);
  g.fillStyle = PALETTE.seaSparkle;
  const step = 90;
  for (let gx = Math.floor(view.x / step) * step; gx < view.x + view.w; gx += step) {
    for (let gy = Math.floor(view.y / step) * step; gy < view.y + view.h; gy += step) {
      if (gx < SEA_X - 30 && gx >= 0 && gy >= 0 && gy < WORLD_H) continue;
      if (hash2(gx / step, gy / step) < 0.55) continue;
      const wob = Math.sin(t * 0.8 + gx * 0.05 + gy * 0.11) * 7;
      g.fillRect(gx + 18 + wob, gy + 40, 34, 3);
    }
  }

  // Land and beach.
  g.fillStyle = PALETTE.turf;
  g.fillRect(0, 0, BEACH_X, WORLD_H);
  g.fillStyle = PALETTE.sand;
  g.fillRect(BEACH_X, 0, SEA_X - BEACH_X, WORLD_H);

  // Block pavement slabs.
  g.fillStyle = PALETTE.slab;
  for (const c of city.cells) {
    if (!inView(c.x, c.y, c.w, c.h, view)) continue;
    g.fillRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
  }

  // Avenues.
  g.fillStyle = PALETTE.asphalt;
  for (const x of V_ROADS) g.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const y of H_ROADS) g.fillRect(0, y - ROAD_W / 2, SEA_X + 46, ROAD_W);
  // Kerb lines.
  g.fillStyle = PALETTE.kerb;
  for (const x of V_ROADS) {
    g.fillRect(x - ROAD_W / 2 - 2, 0, 2, WORLD_H);
    g.fillRect(x + ROAD_W / 2, 0, 2, WORLD_H);
  }
  for (const y of H_ROADS) {
    g.fillRect(0, y - ROAD_W / 2 - 2, SEA_X + 46, 2);
    g.fillRect(0, y + ROAD_W / 2, SEA_X + 46, 2);
  }
  // Centre dashes.
  g.fillStyle = PALETTE.dash;
  for (const x of V_ROADS) {
    for (let y = 14; y < WORLD_H; y += 58) g.fillRect(x - 2, y, 4, 27);
  }
  for (const y of H_ROADS) {
    for (let x = 14; x < SEA_X + 30; x += 58) g.fillRect(x, y - 2, 27, 4);
  }
  // Crosswalks at junctions.
  g.fillStyle = 'rgba(232,236,240,0.5)';
  for (const vx of V_ROADS) {
    for (const hy of H_ROADS) {
      if (!inView(vx - ROAD_W / 2, hy - ROAD_W / 2, ROAD_W, ROAD_W, view)) continue;
      for (let sIdx = -2; sIdx <= 2; sIdx++) {
        g.fillRect(vx + sIdx * 13 - 3, hy - ROAD_W / 2 - 9, 6, 7);
        g.fillRect(vx + sIdx * 13 - 3, hy + ROAD_W / 2 + 2, 6, 7);
        g.fillRect(vx - ROAD_W / 2 - 9, hy + sIdx * 13 - 3, 7, 6);
        g.fillRect(vx + ROAD_W / 2 + 2, hy + sIdx * 13 - 3, 7, 6);
      }
    }
  }

  // Buildings.
  for (const b of city.buildings) {
    if (!inView(b.x, b.y, b.w, b.h, view)) continue;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(b.x + 5, b.y + 7, b.w, b.h);
    g.fillStyle = b.roof;
    g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = 'rgba(255,255,255,0.09)';
    g.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Windows: a grid, some lit, pattern fixed at build time.
    const cw = b.w / b.cols;
    const ch = b.h / b.rows;
    for (let i = 0; i < b.cols; i++) {
      for (let j = 0; j < b.rows; j++) {
        if (!b.lit[j * b.cols + i]) continue;
        g.fillStyle = 'rgba(255,213,120,0.8)';
        g.fillRect(b.x + i * cw + cw * 0.28, b.y + j * ch + ch * 0.28, cw * 0.42, ch * 0.42);
      }
    }
    if (b.sign) {
      g.font = 'bold 11px system-ui, sans-serif';
      g.textAlign = 'center';
      g.shadowColor = b.signColor;
      g.shadowBlur = 8;
      g.fillStyle = b.signColor;
      g.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + 4);
      g.shadowBlur = 0;
    }
  }

  // Palms: a knotted trunk dot under a star of fronds.
  for (const p of city.palms) {
    if (!inView(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, view)) continue;
    g.strokeStyle = '#2c7a43';
    g.lineWidth = 3.4;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + p.x * 0.01;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.quadraticCurveTo(
        p.x + Math.cos(a) * p.r * 0.7, p.y + Math.sin(a) * p.r * 0.7 - 3,
        p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r + 3,
      );
      g.stroke();
    }
    g.fillStyle = '#6b4a2f';
    g.beginPath();
    g.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
    g.fill();
  }
}

export function paintCar(g, car, t) {
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.heading);
  const L = car.w; // along the heading
  const W = car.l; // across it
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.roundRect(-L / 2 + 3, -W / 2 + 4, L, W, 5);
  g.fill();
  g.fillStyle = car.color;
  g.beginPath();
  g.roundRect(-L / 2, -W / 2, L, W, 5);
  g.fill();
  if (car.cop) {
    // Black bonnet and boot bands mark the cruiser under its lightbar.
    g.fillStyle = '#1d2735';
    g.fillRect(L * 0.3, -W / 2, L * 0.2, W);
    g.fillRect(-L / 2, -W / 2, L * 0.18, W);
  }
  if (car.type === 'van' || car.type === 'pickup') {
    g.fillStyle = 'rgba(16,22,30,0.85)';
    g.beginPath();
    g.roundRect(L * 0.08, -W / 2 + 3, L * 0.2, W - 6, 3);
    g.fill();
    if (car.type === 'pickup') {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(-L / 2 + 3, -W / 2 + 3, L * 0.34, W - 6);
    }
  } else {
    // Cabin and glass.
    g.fillStyle = 'rgba(14,20,28,0.92)';
    g.beginPath();
    g.roundRect(-L * 0.2, -W * 0.36, L * 0.46, W * 0.72, 3);
    g.fill();
    g.fillStyle = 'rgba(178,220,255,0.45)';
    g.fillRect(L * 0.3, -W * 0.32, L * 0.1, W * 0.64);
  }
  // Lights: pale at the nose, red at the tail.
  g.fillStyle = '#fff3b0';
  g.fillRect(L / 2 - 3, -W / 2 + 2.5, 3, 4.4);
  g.fillRect(L / 2 - 3, W / 2 - 6.9, 3, 4.4);
  g.fillStyle = '#ff4545';
  g.fillRect(-L / 2, -W / 2 + 2.5, 3, 4.4);
  g.fillRect(-L / 2, W / 2 - 6.9, 3, 4.4);
  if (car.cop) {
    const phase = Math.sin(t * 13) > 0;
    g.fillStyle = phase ? '#ff3b30' : '#7a1610';
    g.fillRect(-5, -W / 2 + 2, 10, 5);
    g.fillStyle = phase ? '#1450c8' : '#2f7bff';
    g.fillRect(-5, W / 2 - 7, 10, 5);
    g.fillStyle = '#e8ecf2';
    g.fillRect(-2.4, -3, 4.8, 6);
  }
  if (car.type === 'taxi') {
    g.fillStyle = '#14181f';
    g.fillRect(-6, -4.4, 12, 8.8);
    g.fillStyle = '#ffd23f';
    g.font = 'bold 6.4px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('TAXI', 0, 2.4);
  }
  g.restore();

  if (car.downT > 0) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 13px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('✕', car.x, car.y - 20);
  }
}

export function paintPed(g, p) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(p.x + 2, p.y + 4, 7.4, 3.6, 0, 0, Math.PI * 2);
  g.fill();
  if (p.downT > 0) {
    // Knocked down: a sprawled shape, briefly.
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.heading + Math.PI / 2);
    g.fillStyle = p.shirt;
    g.beginPath();
    g.ellipse(0, 0, 4.6, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8c39e';
    g.beginPath();
    g.arc(0, -11, 3.6, 0, Math.PI * 2);
    g.fill();
    g.restore();
    return;
  }
  g.fillStyle = p.shirt;
  g.beginPath();
  g.arc(p.x, p.y, 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8c39e';
  g.beginPath();
  g.arc(p.x, p.y - 1, 3.6, 0, Math.PI * 2);
  g.fill();
  if (p.panic > 0) {
    g.fillStyle = '#ffffff';
    g.font = 'bold 12px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('!', p.x + 9, p.y - 7);
  }
}

export function paintGoal(g, goal, color, label, t) {
  const pulse = 1 + Math.sin(t * 4.2) * 0.1;
  g.strokeStyle = color;
  g.lineWidth = 3.4;
  g.beginPath();
  g.arc(goal.x, goal.y, 29 * pulse, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.65)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(goal.x, goal.y, 19 * pulse, 0, Math.PI * 2);
  g.stroke();
  const bob = Math.sin(t * 4.2) * 5;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(goal.x, goal.y - 40 + bob);
  g.lineTo(goal.x - 10, goal.y - 62 + bob);
  g.lineTo(goal.x + 10, goal.y - 62 + bob);
  g.closePath();
  g.fill();
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(label, goal.x, goal.y - 70 + bob);
}
