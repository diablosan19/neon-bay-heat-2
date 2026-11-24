// NEON BAY HEAT 2 — synthesized sound, no samples.
// An engine saw that follows speed, a two-tone siren while the law is
// interested, and little one-shot blips for game events. Everything is
// built lazily on first unlock so a page load never makes a sound.

export function createAudio() {
  let ac = null;
  let engineOsc = null, engineGain = null;
  let sirenOsc = null, sirenGain = null;

  function open() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ac.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = ac.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(ac.destination);
      engineOsc.start();
      sirenOsc = ac.createOscillator();
      sirenOsc.type = 'triangle';
      sirenGain = ac.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(ac.destination);
      sirenOsc.start();
    } catch { ac = null; }
    return !!ac;
  }

  function tone(freq, dur, type = 'square', vol = 0.1, slideTo = 0, delay = 0) {
    if (!open()) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const gn = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(28, slideTo), t0 + dur);
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  return {
    unlock() { if (open() && ac.state === 'suspended') ac.resume(); },
    engine(ratio, active) {
      if (!ac) return;
      engineGain.gain.value = active ? 0.028 + Math.abs(ratio) * 0.05 : 0;
      engineOsc.frequency.value = 52 + Math.abs(ratio) * 138;
    },
    siren(on, t) {
      if (!ac) return;
      sirenGain.gain.value = on ? 0.014 : 0;
      if (on) sirenOsc.frequency.value = 715 + Math.sin(t * 5.4) * 185;
    },
    horn() { tone(196, 0.15, 'square', 0.05); tone(147, 0.15, 'square', 0.04); },
    thud() { tone(110, 0.2, 'sawtooth', 0.15, 55); },
    grab() { tone(620, 0.09, 'sine', 0.13); tone(930, 0.13, 'sine', 0.13, 0, 0.07); },
    paid() { tone(880, 0.08, 'triangle', 0.14); tone(1318, 0.15, 'triangle', 0.14, 0, 0.06); },
    alarm() { tone(1175, 0.1, 'square', 0.09); },
    bustedJingle() {
      tone(392, 0.18, 'square', 0.13);
      tone(311, 0.18, 'square', 0.13, 0, 0.16);
      tone(233, 0.4, 'square', 0.13, 0, 0.32);
    },
  };
}
