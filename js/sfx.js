// Petits effets sonores synthétisés (aucun fichier audio à charger)
let ctx = null;
let muted = false, volume = 0.8, master = null;
try { muted = localStorage.getItem('chibouk_mute') === '1'; const v = localStorage.getItem('chibouk_volume'); if (v !== null && v !== '' && isFinite(+v)) volume = Math.max(0, Math.min(1, +v)); } catch {}
// volume perçu : on applique une courbe pour que le curseur paraisse linéaire à l'oreille
const gainOf = () => Math.pow(volume, 1.6);

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = gainOf(); master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const out = () => master || ctx.destination;
const silent = () => muted || volume <= 0;

function tone(freq, dur = 0.1, { type = 'sine', vol = 0.12, delay = 0, slide = 0 } = {}) {
  if (silent()) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out());
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur = 0.05, { vol = 0.08, delay = 0, freq = 2000 } = {}) {
  if (silent()) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(out());
  src.start(t);
}

export const sfx = {
  get muted() { return muted || volume <= 0; },
  get volume() { return volume; },
  // volume de 0 à 1 (enregistré sur l'appareil) ; le monter réactive le son s'il était coupé
  setVolume(v) {
    volume = Math.max(0, Math.min(1, +v || 0));
    if (volume > 0 && muted) { muted = false; try { localStorage.setItem('chibouk_mute', '0'); } catch {} }
    if (master && ctx) master.gain.setTargetAtTime(gainOf(), ctx.currentTime, 0.02);
    try { localStorage.setItem('chibouk_volume', String(volume)); } catch {}
    return volume;
  },
  toggle() { muted = !muted; if (!muted && volume <= 0) this.setVolume(0.5); try { localStorage.setItem('chibouk_mute', muted ? '1' : '0'); } catch {} return muted; },
  unlock() { ac(); },
  click() { tone(660, 0.05, { type: 'triangle', vol: 0.08 }); },
  chip() { noise(0.04, { vol: 0.12, freq: 3500 }); tone(1800, 0.03, { type: 'square', vol: 0.03 }); },
  card() { noise(0.07, { vol: 0.1, freq: 1500 }); },
  flip() { noise(0.05, { vol: 0.08, freq: 2500 }); },
  reelStop(i = 0) { tone(180 + i * 25, 0.08, { type: 'square', vol: 0.06 }); noise(0.03, { vol: 0.06, freq: 800 }); },
  spinStart() { tone(300, 0.25, { type: 'sawtooth', vol: 0.04, slide: 400 }); },
  tick() { tone(1200, 0.02, { type: 'square', vol: 0.025 }); },
  // poker : c'est à toi de jouer (petit carillon bien audible)
  turn() { tone(784, 0.12, { type: 'triangle', vol: 0.13 }); tone(1175, 0.18, { type: 'triangle', vol: 0.13, delay: 0.12 }); tone(1568, 0.22, { type: 'sine', vol: 0.08, delay: 0.24 }); },
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
