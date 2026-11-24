// NEON BAY HEAT 2 — tuning constants for the whole game.
// One job: every magic number the other modules share lives here.

export const WORLD = {
  width: 3200,
  height: 2400,
  block: 200,          // city grid pitch (road + block)
  roadHalf: 26,        // half width of a road lane pair
  beachX: 2720,        // east of this x is sand, then water
};

export const VIEW = { width: 1280, height: 800 };

export const PLAYER = {
  walkSpeed: 165,
  radius: 11,
  bustTime: 2.6,       // seconds inside the bust ring while slow = busted
};

export const CAR = {
  accel: 340,
  brake: 520,
  maxSpeed: 430,
  maxReverse: 130,
  turnRate: 2.5,
  grip: 7.5,
  radius: 15,
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 14,    // unseen time needed to lose one star
  sightRange: 460,
};

export const MISSION = {
  deliverPay: [180, 320],
  getawayPay: [300, 520],
  timePerMeter: 0.055,
};

export const COLORS = {
  water: '#0d3b56',
  sand: '#d9b878',
  grass: '#3f7a44',
  road: '#2c2f36',
  roadLine: '#e8c832',
  sidewalk: '#8d9299',
  player: '#ffd23f',
  police: '#2f6df6',
  policeLight: '#ff3b30',
};
