// NEON BAY HEAT 2 — keyboard input.
// One job: track which keys are down and expose one-shot presses.

const down = new Set();
const pressed = new Set();

export function initInput() {
  addEventListener('keydown', (e) => {
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => { down.clear(); });
}

export function isDown(...codes) {
  return codes.some((c) => down.has(c));
}

export function wasPressed(...codes) {
  for (const c of codes) {
    if (pressed.has(c)) { pressed.delete(c); return true; }
  }
  return false;
}

export function endFrame() {
  pressed.clear();
}
