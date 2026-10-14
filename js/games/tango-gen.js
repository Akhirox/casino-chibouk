// Tango : grille 6×6 de soleils (0) et de lunes (1). Chaque ligne et colonne a autant de soleils que de lunes,
// jamais 3 symboles identiques d'affilée, et des signes « = » / « × » entre certaines cases voisines.
// La génération garantit une solution unique.
export const N = 6;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Une case peut-elle prendre la valeur v (vérifie lignes/colonnes déjà remplies) ?
function okAt(g, r, c, v, cons) {
  const n = N, half = n / 2;
  // pas 3 d'affilée
  if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) return false;
  if (c >= 1 && c + 1 < n && g[r][c - 1] === v && g[r][c + 1] === v) return false;
  if (c + 2 < n && g[r][c + 1] === v && g[r][c + 2] === v) return false;
  if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false;
  if (r >= 1 && r + 1 < n && g[r - 1][c] === v && g[r + 1][c] === v) return false;
  if (r + 2 < n && g[r + 1][c] === v && g[r + 2][c] === v) return false;
  // équilibre
  let rc = 0, cc = 0;
  for (let i = 0; i < n; i++) { if (i !== c && g[r][i] === v) rc++; if (i !== r && g[i][c] === v) cc++; }
  if (rc + 1 > half || cc + 1 > half) return false;
  // signes
  if (cons) for (const k of cons.at[r * n + c] || []) {
    const o = g[k.r][k.c];
    if (o === -1) continue;
    if (k.t === '=' ? o !== v : o === v) return false;
  }
  return true;
}

// Grille complète valide au hasard
function fullGrid() {
  const g = Array.from({ length: N }, () => new Array(N).fill(-1));
  const rec = (i) => {
    if (i === N * N) return true;
    const r = Math.floor(i / N), c = i % N;
    for (const v of shuffle([0, 1])) {
      if (!okAt(g, r, c, v)) continue;
      g[r][c] = v;
      if (rec(i + 1)) return true;
      g[r][c] = -1;
    }
    return false;
  };
  rec(0);
  return g;
}

// index des contraintes par case
function indexCons(list) {
  const at = {};
  for (const k of list) {
    (at[k.r1 * N + k.c1] ||= []).push({ r: k.r2, c: k.c2, t: k.t });
    (at[k.r2 * N + k.c2] ||= []).push({ r: k.r1, c: k.c1, t: k.t });
  }
  return { list, at };
}

// Nombre de solutions (arrêt à max) pour des cases données + des signes
export function countTango(givens, consList, max = 2) {
  const g = givens.map((row) => [...row]);
  const cons = indexCons(consList);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] !== -1) {
    const v = g[r][c]; g[r][c] = -1;
    if (!okAt(g, r, c, v, cons)) return 0;
    g[r][c] = v;
  }
  let count = 0;
  const rec = (i) => {
    if (count >= max) return;
    while (i < N * N && g[Math.floor(i / N)][i % N] !== -1) i++;
    if (i === N * N) { count++; return; }
    const r = Math.floor(i / N), c = i % N;
    for (const v of [0, 1]) {
      if (!okAt(g, r, c, v, cons)) continue;
      g[r][c] = v; rec(i + 1); g[r][c] = -1;
    }
  };
  rec(0);
  return count;
}

// level : 0 facile, 1 moyen, 2 difficile
const LEVELS = [
  { signs: [7, 10], minGivens: 12 },
  { signs: [5, 8], minGivens: 6 },
  { signs: [4, 7], minGivens: 0 },
];

export function generateTango(level = 1) {
  const L = LEVELS[level];
  const sol = fullGrid();
  // signes entre cases voisines, tirés au hasard
  const edges = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c + 1 < N) edges.push({ r1: r, c1: c, r2: r, c2: c + 1 });
    if (r + 1 < N) edges.push({ r1: r, c1: c, r2: r + 1, c2: c });
  }
  const nSigns = L.signs[0] + Math.floor(Math.random() * (L.signs[1] - L.signs[0] + 1));
  const cons = shuffle(edges).slice(0, nSigns).map((e) => ({ ...e, t: sol[e.r1][e.c1] === sol[e.r2][e.c2] ? '=' : 'x' }));
  // on part de la grille pleine et on retire des cases tant que la solution reste unique
  const giv = sol.map((row) => [...row]);
  let count = N * N;
  for (const i of shuffle([...Array(N * N).keys()])) {
    if (count <= L.minGivens) break;
    const r = Math.floor(i / N), c = i % N, v = giv[r][c];
    giv[r][c] = -1;
    if (countTango(giv, cons) !== 1) giv[r][c] = v; else count--;
  }
  return { givens: giv, cons, solution: sol, level };
}
