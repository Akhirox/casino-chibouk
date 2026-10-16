// RTP du Plinkoko : calcul exact (loi binomiale) + simulation. Usage : node tools/plinko-rtp.mjs [billes par mode]
import { TABLES, ROWS, RISKS, rtp, probability } from '../js/games/plinko-math.js';
import { webcrypto } from 'node:crypto';
const N = +process.argv[2] || 1e7;
let buf = new Uint32Array(16384), bi = buf.length, bits = 0, nb = 0;
const bit = () => { if (!nb) { if (bi >= buf.length) { webcrypto.getRandomValues(buf); bi = 0; } bits = buf[bi++]; nb = 32; } nb--; const b = bits & 1; bits >>>= 1; return b; };
const u = () => { if (bi >= buf.length) { webcrypto.getRandomValues(buf); bi = 0; } return buf[bi++] / 2 ** 32; };
console.log(`Plinkoko : RTP exact (loi binomiale) et simulation de ${N.toLocaleString('fr')} billes par mode`);
for (const rows of ROWS) for (const risk of Object.keys(RISKS)) {
  const T = TABLES[rows][risk], ex = rtp(rows, risk);
  let sum = 0, sq = 0, sum1 = 0;
  for (let i = 0; i < N; i++) {
    let k = 0; for (let r = 0; r < rows; r++) k += bit();
    const m = T[k]; sum += m; sq += m * m;
    // mise de 1 avec l'arrondi aléatoire
    sum1 += Math.floor(m) + (u() < m - Math.floor(m) ? 1 : 0);
  }
  const mean = sum / N, sd = Math.sqrt((sq / N - mean * mean) / N);
  console.log(`${String(rows).padStart(2)} rangées ${risk.padEnd(7)} exact ${(ex * 100).toFixed(3)} % | simulé ${(mean * 100).toFixed(3)} % ± ${(sd * 100).toFixed(3)} (écart ${((mean - ex) / sd).toFixed(2)} σ) | mise de 1 : ${(sum1 / N * 100).toFixed(2)} % | symétrique ${T.every((m, k) => m === T[T.length - 1 - k]) ? 'oui' : 'NON'} | max ×${Math.max(...T)}`);
}
