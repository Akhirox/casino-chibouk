// Simulation Monte Carlo du RTP de la machine à sous.
// Usage (depuis la racine du projet) : node tools/simulate-rtp.mjs 2000000
import * as M from '../js/games/slots-math.js';

const N = +process.argv[2] || 1_000_000;
const rand = (n) => Math.floor(Math.random() * n);
let paid = 0, won = 0, hits = 0, triggers = 0, fsWon = 0, maxWin = 0;
for (let i = 0; i < N; i++) {
  paid += M.LINE_COUNT;
  const ev = M.evaluate(M.spinGrid(rand).grid);
  let spinWin = ev.total;
  let fs = ev.freeSpins;
  if (fs) triggers++;
  while (fs > 0) {
    fs--;
    const e2 = M.evaluate(M.spinGrid(rand).grid);
    const w = e2.total * M.FREE_SPIN_MULT;
    spinWin += w; fsWon += w; fs += e2.freeSpins;
  }
  if (spinWin > 0) hits++;
  maxWin = Math.max(maxWin, spinWin);
  won += spinWin;
}
console.log(`Tours simulés          : ${N.toLocaleString('fr-FR')}`);
console.log(`RTP total              : ${(won / paid * 100).toFixed(2)} %`);
console.log(`  dont tours gratuits  : ${(fsWon / paid * 100).toFixed(2)} %`);
console.log(`Tours gagnants         : ${(hits / N * 100).toFixed(1)} %`);
console.log(`Bonus tous les         : ${(N / triggers).toFixed(0)} tours en moyenne`);
console.log(`Plus gros gain observé : ${(maxWin / M.LINE_COUNT).toFixed(0)} × la mise totale`);
