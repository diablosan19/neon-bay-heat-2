// NEON BAY HEAT 2 — shared tuning.
// Every module reads its numbers from here so the game's feel can be
// balanced in one place instead of by grepping constants out of code.

export const VIEW_W = 1280;
export const VIEW_H = 800;

// The world is a grid city three kilometres wide. Avenues run on a
// regular pitch; the east edge gives up to beach, then open sea.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const PITCH = 300;          // distance between road centrelines
export const ROAD_W = 76;          // asphalt width, kerb to kerb
export const LANE_OFF = 19;        // right-hand lane offset from centreline
export const FIRST_RD = 200;       // centreline of the westernmost avenue
export const BEACH_X = 2780;       // turf ends, sand begins
export const SEA_X = 2980;         // sand ends, water begins

export const FOOT = {
  speed: 176,
  sprintMul: 1.5,
  radius: 11,
  enterRange: 58,                  // how close to a car E will reach
};

export const PHYS = {
  grip: 7.6,          // per-second decay of sideways velocity
  drag: 0.32,         // rolling drag coefficient
  brakeDecel: 640,
  reverseTop: 132,
  steerMax: 0.6,      // front-wheel angle at full lock, radians
  wheelbase: 54,
  hitR: 15,           // building collision radius for cars
};

export const LAW = {
  maxStars: 5,
  sightR: 470,        // a cruiser this close has eyes on the player
  loseTime: 11,       // hidden seconds needed to shed one star
  bustR: 80,          // cruisers inside this ring can make the bust
  bustFill: 2.4,      // seconds pinned and slow before it lands
  slowUnder: 44,      // player speed under which the meter can fill
  spawnMin: 520,      // cruiser spawn ring, inner edge
  spawnMax: 640,      // cruiser spawn ring, outer edge
};

export const PAY = {
  deliverBase: 150,
  deliverPerMeter: 0.14,
  getawayBase: 260,
  getawayPerMeter: 0.16,
  clockPerMeter: 0.052,
  clockFloor: 24,
};

export const PALETTE = {
  sea: '#0b3d5c',
  seaSparkle: 'rgba(190,230,255,0.20)',
  sand: '#d9b878',
  turf: '#2f6b4f',
  slab: '#878e93',
  asphalt: '#2f333a',
  kerb: '#c8ccd0',
  dash: '#e8c832',
  playerBody: '#ffd23f',
  skin: '#e8c39e',
};
