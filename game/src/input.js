// NEON BAY HEAT 2 — keyboard state.
// held() answers "is it down right now", hit() answers "did it go down
// this frame" and is consumed by the main loop once per frame.

const held = new Set();
const fresh = new Set();

export function bindKeyboard() {
  addEventListener('keydown', (e) => {
    if (!held.has(e.code)) fresh.add(e.code);
    held.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => { held.clear(); fresh.clear(); });
}

export function heldKey(...codes) {
  return codes.some((c) => held.has(c));
}

export function hitKey(...codes) {
  return codes.some((c) => fresh.has(c));
}

export function frameDone() {
  fresh.clear();
}
