// NEON BAY HEAT 2 — shared tuning for every module.
// All numbers that more than one file needs are gathered here so the
// balance of the game can be adjusted from a single place.

export const VIEW_W = 1280;
export const VIEW_H = 800;

export const WORLD_W = 3360;
export const WORLD_H = 2520;
export const GRID = 240;          // distance between neighbouring road centrelines
export const ROAD_W = 64;         // full asphalt width
export const SHORE_X = 2920;      // sand starts here; water beyond WORLD edge + margin

export const FOOT = {
  speed: 178,
  sprintMul: 1.5,
  radius: 11,
};

export const DRIVE = {
  engine: 395,        // px/s^2 of throttle force
  brake: 640,
  reverseTop: 138,
  drag: 0.55,         // 1/s velocity bleed with no throttle
  rollDrag: 1.9,      // extra bleed while coasting
  steerRate: 2.65,    // rad/s at full lock, scaled by speed factor
  lateralGrip: 9.5,   // how hard sideways slide is killed each second
  hitRadius: 17,
};

export const HEAT = {
  starCap: 5,
  coolTime: 13,       // seconds out of sight to shed one star
  viewDist: 470,      // how far a cruiser can spot the player
  bustSeconds: 2.4,   // pinned-and-slow time that ends the run
  bustRange: 74,
};

export const PAY = {
  deliver: [170, 330],
  getaway: [290, 540],
  secondsPerPixel: 0.052,
  minSeconds: 26,
};

export const PALETTE = {
  sea: '#0b3552',
  seaLight: '#12506e',
  sand: '#dec084',
  sandDark: '#cda964',
  turf: '#437c46',
  turfDark: '#39693c',
  asphalt: '#2e3138',
  asphaltEdge: '#22252b',
  kerb: '#9aa0a6',
  dash: '#f0c93e',
  roofA: '#66707e',
  you: '#ffd23f',
  copBody: '#eef1f5',
  copTrim: '#24344d',
  lightRed: '#ff4040',
  lightBlue: '#3f8cff',
};
