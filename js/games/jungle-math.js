// Jungle Connect — mathématiques (sans DOM, testable sous Node)
// Grille 7×7, « cluster pays » : 5 symboles identiques ou plus reliés horizontalement / verticalement.
// Tumble : les symboles gagnants explosent, la gravité fait tomber le reste, de nouveaux symboles arrivent par le haut,
// et ainsi de suite tant qu'il y a des gains. Chaque symbole d'un cluster gagnant peut révéler un multiplicateur
// (×2 en jeu de base, ×2 ou ×4 en tours gratuits) : les multiplicateurs d'un même cluster se multiplient (plafond ×256).
// Masque Tribal (scatter) : 3 ou plus sur la grille à la fin de la cascade → 10 tours gratuits (+5 s'il en retombe 3 pendant le bonus).
import { randInt } from './slots-math.js';

export const N = 7;
export const MIN_CLUSTER = 5;
export const CLUSTER_CAP = 256;
export const MAX_WIN = 5000; // gain maximum d'un tour (bonus compris), en × la mise
export const FS_AWARD = 10, FS_RETRIGGER = 5;
export const SCATTER = 'X';
// du meilleur au moins bon
export const SYMS = ['G', 'O', 'T', 'S', 'B', 'L', 'P'];
export const SYM_NAME = { G: 'Singe Doré', O: 'Gorille', T: 'Toucan', S: 'Serpent', B: 'Régime de bananes', L: 'Liane', P: 'Feuille de palmier', X: 'Masque Tribal' };

// Poids de tirage : grille de départ / symboles qui tombent pendant la cascade (un peu plus de Singe et de Gorille)
// (tours gratuits : plus de Singes / Gorilles et de petits symboles, moins de symboles moyens → plus de clusters)
export const W = {
  base: { G: 7, O: 9, T: 12, S: 14, B: 16, L: 17, P: 18, X: 0.75 },
  refill: { G: 8.6, O: 10.6, T: 12, S: 14, B: 16, L: 17, P: 18, X: 0.5 },
  fsBase: { G: 10, O: 12, T: 10, S: 12, B: 17, L: 22, P: 28, X: 0.45 },
  fsRefill: { G: 12, O: 14, T: 10, S: 12, B: 17, L: 22, P: 28, X: 0.35 },
};
const table = (w) => { const keys = Object.keys(w), cum = []; let t = 0; for (const k of keys) { t += w[k]; cum.push(t); } return { keys, cum, t }; };
let T_BASE, T_REFILL, T_FS_BASE, T_FS_REFILL;
export const buildTables = () => { T_BASE = table(W.base); T_REFILL = table(W.refill); T_FS_BASE = table(W.fsBase); T_FS_REFILL = table(W.fsRefill); };
buildTables();
// Chance qu'un symbole d'un cluster gagnant révèle un multiplicateur
export const MULT_P = { base: 0.06, free: 0.1 };
export const MULT_X4 = 0.35; // en tours gratuits, part des ×4

// Gains en × la mise totale, selon la taille du cluster : 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15+
const RAW = {
  G: [1, 1.5, 2, 3, 4, 6, 8, 12, 20, 40, 100],
  O: [0.8, 1.2, 1.6, 2.4, 3.2, 5, 7, 10, 16, 30, 75],
  T: [0.5, 0.8, 1, 1.5, 2, 3, 4.5, 6, 10, 20, 50],
  S: [0.4, 0.6, 0.8, 1.2, 1.6, 2.4, 3.5, 5, 8, 16, 40],
  B: [0.3, 0.45, 0.6, 0.9, 1.2, 1.8, 2.5, 4, 6, 12, 30],
  L: [0.25, 0.35, 0.5, 0.7, 1, 1.5, 2, 3, 5, 10, 25],
  P: [0.2, 0.3, 0.4, 0.6, 0.8, 1.2, 1.6, 2.5, 4, 8, 20],
};
export let PAY_SCALE = 2.42; // réglé par simulation (28 M de parties) : RTP ≈ 98,5 % (± 0,4), bonus ≈ 1/127, bonus moyen ≈ 31× la mise
export const setPayScale = (k) => { PAY_SCALE = k; };
export const payOf = (s, size) => Math.round(RAW[s][Math.min(size, 15) - MIN_CLUSTER] * PAY_SCALE * 100) / 100;
export const PAY_SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const pick = (t, rand) => { const r = rand(1e9) / 1e9 * t.t; for (let i = 0; i < t.cum.length; i++) if (r < t.cum[i]) return t.keys[i]; return t.keys[t.keys.length - 1]; };
const idx = (r, c) => r * N + c;

// Clusters gagnants d'une grille (tableau de N*N symboles, ligne 0 en haut)
export function findClusters(g) {
  const seen = new Uint8Array(N * N), out = [];
  for (let i = 0; i < N * N; i++) {
    const s = g[i];
    if (seen[i] || s === SCATTER) continue;
    const cells = [], stack = [i]; seen[i] = 1;
    while (stack.length) {
      const k = stack.pop(); cells.push(k);
      const r = (k / N) | 0, c = k % N;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        const j = idx(rr, cc);
        if (!seen[j] && g[j] === s) { seen[j] = 1; stack.push(j); }
      }
    }
    if (cells.length >= MIN_CLUSTER) out.push({ s, cells: cells.sort((a, b) => a - b) });
  }
  return out;
}

// Un tour complet (cascade comprise). free = tour gratuit. Renvoie tout ce qu'il faut pour l'animer.
export function spinJungle({ free = false, rand = randInt, capLeft = MAX_WIN } = {}) {
  const tb = free ? T_FS_BASE : T_BASE, tr = free ? T_FS_REFILL : T_REFILL;
  let g = Array.from({ length: N * N }, () => pick(tb, rand));
  const start = g.slice(), steps = [];
  let total = 0, capped = false;
  for (let guard = 0; guard < 200; guard++) {
    const cl = findClusters(g);
    if (!cl.length) break;
    const clusters = cl.map(({ s, cells }) => {
      const mults = [];
      let m = 1;
      for (const k of cells) {
        if (rand(1e6) < (free ? MULT_P.free : MULT_P.base) * 1e6) {
          const v = free && rand(1e6) < MULT_X4 * 1e6 ? 4 : 2;
          mults.push([k, v]); m *= v;
        }
      }
      m = Math.min(CLUSTER_CAP, m);
      const base = payOf(s, cells.length);
      return { s, cells, mults, mult: m, base, win: Math.round(base * m * 100) / 100 };
    });
    let stepWin = clusters.reduce((a, c) => a + c.win, 0);
    if (total + stepWin >= capLeft) { stepWin = capLeft - total; capped = true; }
    total += stepWin;
    // explosion + gravité + remplissage
    const gone = new Uint8Array(N * N);
    for (const c of clusters) for (const k of c.cells) gone[k] = 1;
    const ng = new Array(N * N), drops = []; // drops : [colonne, de (ligne, -1.. pour les nouveaux), vers]
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const k = idx(r, c);
        if (gone[k]) continue;
        ng[idx(w, c)] = g[k];
        if (w !== r) drops.push([c, r, w]);
        w--;
      }
      for (let n = 0; w >= 0; w--, n++) { ng[idx(w, c)] = pick(tr, rand); drops.push([c, -1 - n, w]); }
    }
    steps.push({ clusters, win: stepWin, grid: ng.slice(), drops });
    g = ng;
    if (capped) break;
  }
  const scatters = g.filter((s) => s === SCATTER).length;
  return { start, steps, final: g, win: Math.round(total * 100) / 100, scatters, capped };
}

// Combien de tours gratuits rapporte un nombre de masques
export const fsFor = (scatters, free = false) => (scatters >= 3 ? (free ? FS_RETRIGGER : FS_AWARD) : 0);

// Partie complète pour la simulation : tour payant + éventuels tours gratuits
export function playRound(rand = randInt) {
  const base = spinJungle({ rand });
  let total = base.win, fsLeft = fsFor(base.scatters), fsPlayed = 0, fsWin = 0;
  const trig = fsLeft > 0;
  while (fsLeft > 0 && total < MAX_WIN) {
    fsLeft--; fsPlayed++;
    const r = spinJungle({ free: true, rand, capLeft: MAX_WIN - total });
    total += r.win; fsWin += r.win;
    fsLeft += fsFor(r.scatters, true);
  }
  return { total: Math.min(MAX_WIN, total), base: base.win, fsWin, trig, fsPlayed };
}
