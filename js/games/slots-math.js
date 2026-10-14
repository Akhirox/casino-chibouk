// Mathématiques de la machine à sous "Chibouk Slot"
// Module pur (sans DOM) : importable par le navigateur et par Node pour le calcul du RTP.
//
// Règles (V8) :
// - 5 rouleaux × 3 rangées, 99 lignes : toutes les lignes où chaque symbole touche le suivant
//   (même rangée ou rangée voisine en diagonale, jamais 2 rangées d'écart).
// - WILD : remplace n'importe quel symbole (sauf le SCATTER). WILD ×2 : pareil, et double le gain de la ligne
//   (deux WILD ×2 sur la même ligne = ×4, trois = ×8).
// - SCATTER : paie n'importe où (× la mise totale) et 3+ SCATTER déclenchent les tours gratuits ×2.

export const SYMBOLS = {
  F: { name: 'Totem (SCATTER)', short: 'SCATTER' },
  X: { name: 'Roi Singe ×2 (WILD ×2)', short: 'WILD ×2' },
  W: { name: 'Roi Singe (WILD)', short: 'WILD' },
  M: { name: 'Singe', short: 'Singe' },
  S: { name: 'Sept', short: '7' },
  B: { name: 'BAR', short: 'BAR' },
  C: { name: 'Cloche', short: 'Cloche' },
  P: { name: 'Pastèque', short: 'Pastèque' },
  R: { name: 'Raisin', short: 'Raisin' },
  N: { name: 'Banane', short: 'Banane' },
  L: { name: 'Citron', short: 'Citron' },
  K: { name: 'Cerise', short: 'Cerise' },
};
export const isWild = (s) => s === 'W' || s === 'X';

// Gains en multiple de la MISE PAR LIGNE (= mise totale ÷ 99) pour 3 / 4 / 5 symboles alignés depuis la gauche.
// W = ligne de WILD seuls (WILD et WILD ×2 mélangés).
export const PAYTABLE = {
  W: [80, 400, 2000],
  M: [40, 200, 1000],
  S: [26, 100, 400],
  B: [20, 65, 260],
  C: [13, 40, 160],
  P: [9, 28, 100],
  R: [8, 21, 72],
  N: [6, 18, 60],
  L: [5, 14, 46],
  K: [5, 14, 46],
};

export const REELS = 5;
export const ROWS = 3;

// Toutes les lignes « connectées » : de rouleau en rouleau, on reste sur la rangée ou on passe à la voisine
function buildLines() {
  const out = [];
  const walk = (path) => {
    if (path.length === REELS) { out.push(path); return; }
    const last = path[path.length - 1];
    for (const r of [last - 1, last, last + 1]) if (r >= 0 && r < ROWS) walk([...path, r]);
  };
  for (let r = 0; r < ROWS; r++) walk([r]);
  const changes = (l) => l.slice(1).filter((r, i) => r !== l[i]).length;
  // les lignes droites d'abord (milieu, haut, bas), puis par nombre de changements de rangée
  return out.sort((a, b) => changes(a) - changes(b) || Math.abs(a[0] - 1) - Math.abs(b[0] - 1) || a.join('').localeCompare(b.join('')));
}
export const PAYLINES = buildLines(); // 99 lignes
export const LINE_COUNT = PAYLINES.length;

// SCATTER : gain en × la MISE TOTALE et tours gratuits selon le nombre visible (n'importe où)
export const SCATTER_PAY = { 3: 2, 4: 10, 5: 50 };
export const FREE_SPINS_AWARD = { 3: 10, 4: 15, 5: 20 };
export const FREE_SPIN_MULT = 2;

// Composition des rouleaux (occurrences de chaque symbole). Le WILD ×2 n'existe que sur les rouleaux 2 à 4.
const BASE = { W: 2, F: 2, M: 3, S: 3, B: 4, C: 5, P: 5, R: 6, N: 6, L: 7, K: 7 };
export const REEL_WEIGHTS = [
  { ...BASE },
  { ...BASE, X: 1 },
  { ...BASE, X: 1 },
  { ...BASE, X: 1 },
  { ...BASE },
];

// Générateur pseudo-aléatoire déterministe pour construire des bandes de rouleaux stables
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mélange en gardant au moins 2 cases entre deux SCATTER et entre deux WILD :
// on ne voit donc jamais 2 SCATTER (ni 2 WILD) sur le même rouleau.
function buildStrip(weights, seed) {
  const rnd = mulberry32(seed);
  const arr = [];
  for (const [sym, n] of Object.entries(weights)) for (let i = 0; i < n; i++) arr.push(sym);
  const cls = (s) => (s === 'F' ? 'F' : isWild(s) ? 'W' : '');
  for (let tries = 0; tries < 5000; tries++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    let ok = true;
    for (let i = 0; i < arr.length && ok; i++) {
      const a = cls(arr[i]);
      if (a && (cls(arr[(i + 1) % arr.length]) === a || cls(arr[(i + 2) % arr.length]) === a)) ok = false;
    }
    if (ok) return arr;
  }
  throw new Error('bande impossible');
}

export const STRIPS = REEL_WEIGHTS.map((w, i) => buildStrip(w, 1337 + i * 7919));

// RNG : crypto si disponible
export function randInt(n) {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { c.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }
  return Math.floor(Math.random() * n);
}

// Tire les positions d'arrêt et renvoie la grille grid[reel][row]
export function spinGrid(rand = randInt) {
  const stops = STRIPS.map((s) => rand(s.length));
  const grid = stops.map((stop, r) => {
    const s = STRIPS[r];
    return [s[stop % s.length], s[(stop + 1) % s.length], s[(stop + 2) % s.length]];
  });
  return { stops, grid };
}

// Gain d'une ligne (5 symboles) : { pay, sym, count, mult } ou null
export function linePay(symbols) {
  const xMult = (n) => { let m = 1; for (let i = 0; i < n; i++) if (symbols[i] === 'X') m *= 2; return m; };
  // 1) WILD seuls en tête
  let wildRun = 0;
  while (wildRun < 5 && isWild(symbols[wildRun])) wildRun++;
  let best = null;
  if (wildRun >= 3) { const mult = xMult(wildRun); best = { pay: PAYTABLE.W[wildRun - 3] * mult, sym: 'W', count: wildRun, mult }; }
  // 2) premier symbole « normal », les WILD le remplaçant (le SCATTER coupe la ligne)
  const base = symbols.find((s) => !isWild(s));
  if (base && base !== 'F') {
    let count = 0;
    while (count < 5 && (symbols[count] === base || isWild(symbols[count]))) count++;
    if (count >= 3) {
      const mult = xMult(count);
      const pay = PAYTABLE[base][count - 3] * mult;
      if (!best || pay > best.pay) best = { pay, sym: base, count, mult };
    }
  }
  return best;
}

// Évalue une grille. total = somme des gains des lignes (en mises par ligne) ;
// scatterPay = gain du SCATTER (en mises totales). Gain du tour = (total / 99 + scatterPay) × mise totale.
export function evaluate(grid) {
  const wins = [];
  let total = 0;
  PAYLINES.forEach((line, idx) => {
    const res = linePay(line.map((row, reel) => grid[reel][row]));
    if (res) {
      wins.push({ line: idx, symbol: res.sym, count: res.count, pay: res.pay, mult: res.mult,
        cells: line.slice(0, res.count).map((row, reel) => [reel, row]) });
      total += res.pay;
    }
  });
  const cellsOf = (pred) => { const out = []; grid.forEach((col, reel) => col.forEach((s, row) => { if (pred(s)) out.push([reel, row]); })); return out; };
  const scatterCells = cellsOf((s) => s === 'F');
  const wildCells = cellsOf(isWild);
  const scatters = scatterCells.length;
  const n = Math.min(scatters, 5);
  return {
    wins, total, scatters, scatterCells, wildCells,
    wilds: wildCells.length,
    wildX: cellsOf((s) => s === 'X').length,
    scatterPay: scatters >= 3 ? SCATTER_PAY[n] : 0,
    freeSpins: scatters >= 3 ? FREE_SPINS_AWARD[n] : 0,
  };
}

// Multiplicateur du tour (gain ÷ mise totale), hors arrondi
export function spinMultiple(ev, mult = 1) { return (ev.total / LINE_COUNT + ev.scatterPay) * mult; }

/* ---------- RTP théorique exact ----------
 * Sur une ligne, chaque rouleau donne un symbole selon la composition de sa bande (indépendants entre rouleaux),
 * donc l'espérance d'une ligne est la même pour les 99 lignes et le gain moyen des lignes vaut E[ligne] × mise.
 * Les SCATTER ne peuvent pas être 2 sur un même rouleau : P(SCATTER visible sur le rouleau r) = 3 × nF / longueur.
 * Tours gratuits : valeur V d'un tour gratuit = 2B + A·V  =>  RTP = B + A × 2B / (1 − A).
 */
export function theoreticalRTP() {
  const dist = STRIPS.map((s) => { const d = {}; s.forEach((x) => (d[x] = (d[x] || 0) + 1 / s.length)); return Object.entries(d); });
  let eLine = 0, hit = 0;
  const rec = (r, syms, p) => {
    if (r === REELS) { const res = linePay(syms); if (res) { eLine += p * res.pay; hit += p; } return; }
    for (const [s, q] of dist[r]) rec(r + 1, [...syms, s], p * q);
  };
  rec(0, [], 1);
  const pS = STRIPS.map((s) => (3 * s.filter((x) => x === 'F').length) / s.length);
  let pk = [1];
  for (const p of pS) { const nx = Array(pk.length + 1).fill(0); pk.forEach((v, k) => { nx[k] += v * (1 - p); nx[k + 1] += v * p; }); pk = nx; }
  let eScat = 0, A = 0, pTrig = 0;
  for (let k = 3; k <= 5; k++) { eScat += pk[k] * SCATTER_PAY[k]; A += pk[k] * FREE_SPINS_AWARD[k]; pTrig += pk[k]; }
  const lines = eLine; // déjà en × mise totale (99 lignes × mise/99)
  const B = lines + eScat;
  const fsPart = (A * FREE_SPIN_MULT * B) / (1 - A);
  return { rtp: B + fsPart, lines, scatter: eScat, freeSpins: fsPart, triggerEvery: 1 / pTrig, lineHit: hit };
}
