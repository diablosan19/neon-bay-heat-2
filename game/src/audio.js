// NEON BAY HEAT 2 — WebAudio synth sound, no audio files.
// One job: engine hum, sirens, horns, pickup chimes and the bust sting,
// all synthesized from oscillators.

export function makeAudio() {
  let ctx = null, engine = null, engineGain = null, siren = null, sirenGain = null;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engine.connect(engineGain).connect(ctx.destination); engine.start();
      siren = ctx.createOscillator(); siren.type = 'triangle'; siren.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      siren.connect(sirenGain).connect(ctx.destination); siren.start();
    } catch { ctx = null; }
    return !!ctx;
  }
  function blip(freq, dur, type = 'square', vol = 0.12, slide = 0) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    engine(speedRatio, inCar) {
      if (!ctx) return;
      engineGain.gain.value = inCar ? 0.03 + Math.abs(speedRatio) * 0.05 : 0;
      engine.frequency.value = 50 + Math.abs(speedRatio) * 130;
    },
    siren(on, t) {
      if (!ctx) return;
      sirenGain.gain.value = on ? 0.016 : 0;
      if (on) siren.frequency.value = 700 + Math.sin(t * 5.2) * 190;
    },
    honk() { blip(220, 0.16, 'square', 0.06); },
    pickup() { blip(660, 0.1, 'sine', 0.14); setTimeout(() => blip(990, 0.14, 'sine', 0.14), 70); },
    cash() { blip(880, 0.09, 'triangle', 0.15); setTimeout(() => blip(1320, 0.16, 'triangle', 0.15), 60); },
    crash() { blip(120, 0.22, 'sawtooth', 0.16, -70); },
    busted() { blip(392, 0.2, 'square', 0.14); setTimeout(() => blip(311, 0.2, 'square', 0.14), 160); setTimeout(() => blip(233, 0.42, 'square', 0.14), 320); },
    star() { blip(1180, 0.1, 'square', 0.1); },
  };
}
