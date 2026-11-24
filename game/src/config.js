// NEON BAY HEAT 2 — tuning constants shared by every module.
// One place for the numbers, so balancing never means hunting files.

export const VIEW_W = 1280;
export const VIEW_H = 800;

// World geometry: a grid city of square blocks, beach on the east edge.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const PITCH = 260;        // spacing between road centrelines
export const ROAD_W = 74;        // asphalt width, kerb to kerb
export const LANE = ROAD_W / 4;  // right-hand lane offset from a centreline
export const BEACH_X = 2790;     // east of this the turf gives way to sand

export const WALK = {
  speed: 172,
  sprint: 1.5,
  radius: 11,
};

export const CAR_PHYS = {
  grip: 8.0,          // lateral velocity killed per second
  dragK: 0.35,        // quadratic-ish top-speed shaping
  brake: 620,
  reverseMax: 135,
  steerMax: 0.62,     // rad of front-wheel angle at full lock
  wheelbase: 52,
  crashR: 18,
};

export const LAW = {
  maxStars: 5,
  sightR: 480,        // cruiser visual range on the player
  loseTime: 12,       // unseen seconds to shed one star
  bustR: 78,          // cruisers inside this ring can bust a slow player
  bustFill: 2.3,      // seconds pinned before the bust lands
  slowUnder: 42,      // player speed below which a bust can fill
};

export const JOB_PAY = {
  deliverMin: 160, deliverMax: 320,
  getawayMin: 280, getawayMax: 520,
  secPerPx: 0.05, minClock: 25,
};

export const COL = {
  sea: '#0a3a56',
  seaFoam: '#17607f',
  sand: '#dfc286',
  sandWet: '#cdb077',
  lawn: '#47824a',
  lawnAlt: '#407843',
  road: '#2f3237',
  roadEdge: '#23262b',
  kerb: '#a7adb3',
  dash: '#eec93c',
  playerBody: '#ffd23f',
  copPaint: '#edf0f4',
  copStripe: '#22334e',
  lampR: '#ff3f3f',
  lampB: '#3f8cff',
};
