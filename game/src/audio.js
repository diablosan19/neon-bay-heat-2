// NEON BAY HEAT 2 — synthesized sound.
// No audio assets: an oscillator pair for the engine, a wailing triangle
// for sirens, and short blips for game events. Everything fails silent if
// the browser refuses an AudioContext.

export function createSound() {
  let ac = null;
  let engineOsc = null, engineAmp = null, sirenOsc = null, sirenAmp = null;

  function boot() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ac.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      engineAmp = ac.createGain();
      engineAmp.gain.value = 0;
      engineOsc.connect(engineAmp).connect(ac.destination);
      engineOsc.start();
      sirenOsc = ac.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenAmp = ac.createGain();
      sirenAmp.gain.value = 0;
      sirenOsc.connect(sirenAmp).connect(ac.destination);
      sirenOsc.start();
    } catch {
      ac = null;
    }
    return !!ac;
  }

  function tone(freq, dur, type, vol, glideTo) {
    if (!boot()) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(28, glideTo), ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }

  return {
    unlock() { if (boot() && ac.state === 'suspended') ac.resume(); },
    engine(ratio, driving) {
      if (!ac) return;
      engineAmp.gain.value = driving ? 0.028 + Math.abs(ratio) * 0.05 : 0;
      engineOsc.frequency.value = 48 + Math.abs(ratio) * 135;
    },
    siren(active, t) {
      if (!ac) return;
      sirenAmp.gain.value = active ? 0.015 : 0;
      if (active) sirenOsc.frequency.value = 715 + Math.sin(t * 5.4) * 185;
    },
    horn() { tone(196, 0.15, 'square', 0.055); },
    grab() { tone(659, 0.09, 'sine', 0.13); setTimeout(() => tone(988, 0.13, 'sine', 0.13), 65); },
    paid() { tone(880, 0.08, 'triangle', 0.14); setTimeout(() => tone(1318, 0.15, 'triangle', 0.14), 55); },
    thud() { tone(115, 0.2, 'sawtooth', 0.15, 55); },
    alarm() { tone(1175, 0.09, 'square', 0.09); },
    bustedJingle() {
      tone(392, 0.18, 'square', 0.13);
      setTimeout(() => tone(311, 0.18, 'square', 0.13), 150);
      setTimeout(() => tone(233, 0.4, 'square', 0.13), 300);
    },
  };
}
