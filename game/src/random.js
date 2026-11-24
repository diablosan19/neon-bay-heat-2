// NEON BAY HEAT 2 — a small deterministic random toolkit.
// The city is grown from a seed, so every load of the same seed must
// produce the same streets. mulberry32 is plenty for that.

export function rng32(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function betweenInt(rng, lo, hi) {
  return Math.floor(between(rng, lo, hi + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function chance(rng, p) {
  return rng() < p;
}
