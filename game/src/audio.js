// NEON BAY HEAT 2 — synthesized sound.
// No audio files: everything is oscillators and envelopes through one
// WebAudio context. The engine is a sawtooth whose pitch follows the
// car's speed, the siren a triangle wave wobbling between two tones,
// and every event — theft, shunt, pickup, payout, bust — gets a short
// shaped blip. Browsers refuse audio before a gesture, so the context
// stays dormant until unlock() and every method is safe to call blind.

export function createAudio() {
  let ac = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function unlock() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return;
    }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ac.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      engineGain = ac.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(ac.destination);
      engineOsc.start();
      sirenOsc = ac.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ac.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(ac.destination);
      sirenOsc.start();
    } catch {
      ac = null;
    }
  }

  function blip(freq, dur, type, vol, delay = 0, slideTo = 0) {
    if (!ac) return;
    try {
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
    } catch { /* a missed blip is not an error worth surfacing */ }
  }

  return {
    unlock,
    engine(ratio, inCar) {
      if (!ac || !engineGain) return;
      const r = Math.min(1, Math.abs(ratio));
      engineGain.gain.setTargetAtTime(inCar ? 0.028 + r * 0.05 : 0, ac.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(50 + r * 135, ac.currentTime, 0.06);
    },
    siren(on, t) {
      if (!ac || !sirenGain) return;
      sirenGain.gain.setTargetAtTime(on ? 0.014 : 0, ac.currentTime, 0.1);
      if (on) sirenOsc.frequency.setTargetAtTime(715 + Math.sin(t * 5.4) * 185, ac.currentTime, 0.03);
    },
    horn() { blip(233, 0.16, 'square', 0.05); blip(175, 0.16, 'square', 0.04); },
    thud() { blip(118, 0.2, 'sine', 0.2, 0, 38); },
    grab() { blip(620, 0.09, 'sine', 0.13); blip(930, 0.13, 'sine', 0.13, 0.07); },
    paid() { blip(880, 0.09, 'triangle', 0.15); blip(1174, 0.1, 'triangle', 0.15, 0.06); blip(1568, 0.16, 'triangle', 0.15, 0.12); },
    alarm() { blip(1175, 0.11, 'square', 0.09); blip(1175, 0.11, 'square', 0.09, 0.16); },
    bustedJingle() {
      blip(392, 0.18, 'square', 0.12);
      blip(311, 0.18, 'square', 0.12, 0.17);
      blip(233, 0.4, 'square', 0.12, 0.34);
    },
  };
}
