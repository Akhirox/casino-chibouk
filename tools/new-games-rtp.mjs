// Vérifie le RTP des jeux de la V9 : node tools/new-games-rtp.mjs
import { limboRoll } from '../js/games/limbo.js';
import { options } from '../js/games/hilo.js';
import { wheelRTP } from '../js/games/wheel.js';
import { KENO_TABLES, kenoRTP } from '../js/games/keno-math.js';
const N = 2_000_000;
for (const t of [1.5, 2, 10, 100]) { let w = 0; for (let i = 0; i < N; i++) if (limboRoll() >= t) w += t; console.log(`Limbo cible ×${t} : ${(w / N * 100).toFixed(2)} %`); }
// Hi-Lo : on parie toujours sur le côté le plus probable et on encaisse après k bonnes réponses
for (const k of [1, 3, 6]) {
  let paid = 0, won = 0;
  for (let i = 0; i < N / 2; i++) {
    paid++; let r = 1 + Math.floor(Math.random() * 13), m = 0.99, ok = true;
    for (let s = 0; s < k; s++) { const [hi, lo] = options(r); const o = hi.p >= lo.p ? hi : lo; const n = 1 + Math.floor(Math.random() * 13); if (!o.test(n)) { ok = false; break; } m /= o.p; r = n; }
    if (ok) won += m;
  }
  console.log(`Hi-Lo ${k} réponse(s) : ${(won / paid * 100).toFixed(2)} %`);
}
for (const r of ['low', 'medium', 'high']) console.log(`Roue ${r} : ${(wheelRTP(r) * 100).toFixed(2)} %`);
for (const r of Object.keys(KENO_TABLES)) console.log(`Keno ${r} : ${Array.from({ length: 10 }, (_, i) => (kenoRTP(r, i + 1) * 100).toFixed(1)).join(' / ')} %`);
