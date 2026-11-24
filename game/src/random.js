// NEON BAY HEAT 2 — deterministic randomness.
// A splitmix-style generator: fast, seedable, and good enough that the
// same seed always grows the same city, traffic and crowd.

export function rngFrom(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  };
}

export function between(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function whole(rng, lo, hi) {
  return Math.floor(between(rng, lo, hi + 1));
}

export function choose(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function chance(rng, p) {
  return rng() < p;
}
