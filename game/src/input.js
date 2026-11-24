// NEON BAY HEAT 2 — keyboard state.
// Tracks which keys are physically down plus a one-frame "just hit"
// edge for toggles like Enter, E and P. The frame loop must call
// frameDone() once per frame or edges would fire twice.

const down = new Set();
const hit = new Set();
let bound = false;

export function bindKeyboard() {
  if (bound) return;
  bound = true;
  addEventListener('keydown', (e) => {
    if (!down.has(e.code)) hit.add(e.code);
    down.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => { down.clear(); hit.clear(); });
}

export function heldKey(...codes) {
  return codes.some((c) => down.has(c));
}

export function hitKey(...codes) {
  return codes.some((c) => hit.has(c));
}

export function frameDone() {
  hit.clear();
}
