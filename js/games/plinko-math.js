// Mathématiques du Plinko — module pur (navigateur + Node)
// À chaque rangée la bille part à gauche ou à droite (50/50) : la case d'arrivée suit une loi binomiale.

export const RISKS = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };
export const ROWS = [8, 12, 16];

// Multiplicateurs par case, de gauche à droite (symétriques). RTP exact ≈ 99 % pour chaque combinaison.
export const TABLES = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

function comb(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
export function probability(rows, k) { return comb(rows, k) / 2 ** rows; }
export function rtp(rows, risk) {
  return TABLES[rows][risk].reduce((acc, m, k) => acc + m * probability(rows, k), 0);
}

// Tire le chemin : tableau de 0 (gauche) / 1 (droite), la case = nombre de 1
export function dropPath(rows, randBit) {
  const path = [];
  for (let i = 0; i < rows; i++) path.push(randBit());
  const bin = path.reduce((a, b) => a + b, 0);
  return { path, bin };
}
