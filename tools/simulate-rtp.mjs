// RTP de la machine à sous : calcul exact + simulation Monte Carlo (avec l'arrondi au Brundle près).
// Usage (depuis la racine du projet) : node tools/simulate-rtp.mjs 1000000 [mise]
import * as M from '../js/games/slots-math.js';

const N = +process.argv[2] || 1_000_000;
const BET = +process.argv[3] || 100;
const exact = M.theoreticalRTP();
console.log(`RTP exact               : ${(exact.rtp * 100).toFixed(2)} %  (lignes ${(exact.lines * 100).toFixed(1)} %, scatter ${(exact.scatter * 100).toFixed(1)} %, tours gratuits ${(exact.freeSpins * 100).toFixed(1)} %)`);
console.log(`Bonus en moyenne tous les ${exact.triggerEvery.toFixed(0)} tours`);

const rand = (n) => Math.floor(Math.random() * n);
const payOf = (ev, mult) => Math.round(M.spinMultiple(ev, mult) * BET);
let paid = 0, won = 0, hits = 0, fsWon = 0, maxMult = 0;
const tiers = { 10: 0, 25: 0, 50: 0, 100: 0 };
for (let i = 0; i < N; i++) {
  paid += BET;
  const ev = M.evaluate(M.spinGrid(rand).grid);
  let spinWin = payOf(ev, 1);
  let fs = ev.freeSpins;
  while (fs > 0) {
    fs--;
    const e2 = M.evaluate(M.spinGrid(rand).grid);
    const w = payOf(e2, M.FREE_SPIN_MULT);
    spinWin += w; fsWon += w; fs += e2.freeSpins;
  }
  if (spinWin > 0) hits++;
  const m = spinWin / BET;
  for (const t of Object.keys(tiers)) if (m >= +t) tiers[t]++;
  maxMult = Math.max(maxMult, m);
  won += spinWin;
}
console.log(`\nSimulation : ${N.toLocaleString('fr-FR')} tours à ${BET} Brundles`);
console.log(`RTP simulé              : ${(won / paid * 100).toFixed(2)} %  (dont tours gratuits ${(fsWon / paid * 100).toFixed(1)} %)`);
console.log(`Tours gagnants          : ${(hits / N * 100).toFixed(1)} %`);
for (const [t, n] of Object.entries(tiers)) console.log(`Gain ≥ ×${t.padEnd(4)}           : 1 tour sur ${n ? Math.round(N / n).toLocaleString('fr-FR') : '∞'}`);
console.log(`Plus gros gain observé  : ×${maxMult.toFixed(1)} la mise totale`);
