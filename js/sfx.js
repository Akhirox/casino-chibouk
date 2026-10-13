// Petits effets sonores synthétisés (aucun fichier audio à charger)
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('chibouk_mute') === '1'; } catch {}

function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.1, { type = 'sine', vol = 0.12, delay = 0, slide = 0 } = {}) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur = 0.05, { vol = 0.08, delay = 0, freq = 2000 } = {}) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem('chibouk_mute', muted ? '1' : '0'); } catch {} return muted; },
  unlock() { ac(); },
  click() { tone(660, 0.05, { type: 'triangle', vol: 0.08 }); },
  chip() { noise(0.04, { vol: 0.12, freq: 3500 }); tone(1800, 0.03, { type: 'square', vol: 0.03 }); },
  card() { noise(0.07, { vol: 0.1, freq: 1500 }); },
  flip() { noise(0.05, { vol: 0.08, freq: 2500 }); },
  reelStop(i = 0) { tone(180 + i * 25, 0.08, { type: 'square', vol: 0.06 }); noise(0.03, { vol: 0.06, freq: 800 }); },
  spinStart() { tone(300, 0.25, { type: 'sawtooth', vol: 0.04, slide: 400 }); },
  tick() { tone(1200, 0.02, { type: 'square', vol: 0.025 }); },
  win(big = false) {
    const notes = big ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    notes.forEach((n, i) => tone(n, 0.16, { type: 'triangle', vol: 0.1, delay: i * 0.09 }));
  },
  lose() { tone(330, 0.18, { type: 'triangle', vol: 0.07 }); tone(247, 0.25, { type: 'triangle', vol: 0.07, delay: 0.15 }); },
  bonus() { [392, 523, 659, 784, 659, 784, 1047].forEach((n, i) => tone(n, 0.14, { type: 'square', vol: 0.06, delay: i * 0.1 })); },
  coin() { tone(988, 0.07, { type: 'square', vol: 0.05 }); tone(1319, 0.2, { type: 'square', vol: 0.05, delay: 0.07 }); },
  ball() { noise(0.02, { vol: 0.05, freq: 4000 }); },
  bounce(p = 1) { tone(400 * p, 0.05, { type: 'square', vol: 0.05 }); },
  brick(p = 1) { tone(700 * p, 0.06, { type: 'triangle', vol: 0.08 }); },
};
