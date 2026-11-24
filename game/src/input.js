// NEON BAY HEAT 2 — keyboard handling.
// Tracks held keys for continuous movement and a per-frame set of fresh
// presses for one-shot actions (enter car, pause, confirm). The main loop
// calls clearPresses() once it has consumed them.

const held = new Set();
const fresh = new Set();
let listening = false;

export function initKeyboard() {
  if (listening) return;
  listening = true;
  addEventListener('keydown', (ev) => {
    if (!ev.repeat) fresh.add(ev.code);
    held.add(ev.code);
    if (ev.code.startsWith('Arrow') || ev.code === 'Space') ev.preventDefault();
  });
  addEventListener('keyup', (ev) => held.delete(ev.code));
  addEventListener('blur', () => { held.clear(); fresh.clear(); });
}

export function down(...codes) {
  return codes.some((c) => held.has(c));
}

export function tapped(...codes) {
  return codes.some((c) => fresh.has(c));
}

export function clearPresses() {
  fresh.clear();
}
