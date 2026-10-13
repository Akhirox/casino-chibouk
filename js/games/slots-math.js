// Mathématiques de la machine à sous "Chibouk Slot"
// Module pur (sans DOM) : importable par le navigateur et par Node pour la simulation du RTP.

export const SYMBOLS = {
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

// Gains en multiple de la MISE PAR LIGNE pour 3 / 4 / 5 symboles alignés depuis la gauche
export const PAYTABLE = {
  W: [100, 500, 3000],
  M: [60, 300, 1500],
  S: [40, 160, 600],
  B: [30, 100, 400],
  C: [20, 60, 240],
  P: [15, 45, 150],
  R: [11, 33, 110],
  N: [9, 28, 90],
  L: [8, 22, 70],
  K: [8, 22, 70],
};

// Les 21 lignes de paiement (rangée 0 = haut, 1 = milieu, 2 = bas), d'après le schéma fourni
export const PAYLINES = [
  [1, 1, 1, 1, 1], // 1
  [0, 0, 0, 0, 0], // 2
  [2, 2, 2, 2, 2], // 3
  [0, 1, 2, 1, 0], // 4
  [2, 1, 0, 1, 2], // 5
  [0, 0, 1, 0, 0], // 6
  [2, 2, 1, 2, 2], // 7
  [1, 0, 0, 0, 1], // 8
  [1, 2, 2, 2, 1], // 9
  [1, 1, 0, 1, 1], // 10
  [1, 1, 2, 1, 1], // 11
  [2, 2, 2, 1, 0], // 12
  [0, 0, 0, 1, 2], // 13
  [2, 1, 0, 0, 0], // 14
  [0, 1, 2, 2, 2], // 15
  [0, 2, 0, 2, 0], // 16
  [2, 0, 2, 0, 2], // 17
  [1, 0, 1, 0, 1], // 18
  [1, 2, 1, 2, 1], // 19
  [0, 1, 0, 1, 0], // 20
  [2, 1, 2, 1, 2], // 21
];

export const LINE_COUNT = PAYLINES.length;
export const REELS = 5;
export const ROWS = 3;

// Bonus : 3+ WILD n'importe où => tours gratuits, gains x2 (re-déclenchables)
export const FREE_SPINS_AWARD = { 3: 10, 4: 15, 5: 20 };
export const FREE_SPIN_MULT = 2;

// Composition des rouleaux (nombre d'occurrences de chaque symbole par rouleau)
const REEL_WEIGHTS = [
  { W: 2, M: 3, S: 3, B: 4, C: 5, P: 5, R: 6, N: 6, L: 7, K: 7 },
  { W: 2, M: 3, S: 3, B: 4, C: 5, P: 5, R: 6, N: 6, L: 7, K: 7 },
  { W: 2, M: 3, S: 3, B: 4, C: 5, P: 5, R: 6, N: 6, L: 7, K: 7 },
  { W: 2, M: 3, S: 3, B: 4, C: 5, P: 5, R: 6, N: 6, L: 7, K: 7 },
  { W: 2, M: 3, S: 3, B: 4, C: 5, P: 5, R: 6, N: 6, L: 7, K: 7 },
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

function buildStrip(weights, seed) {
  const rnd = mulberry32(seed);
  const arr = [];
  for (const [sym, n] of Object.entries(weights)) for (let i = 0; i < n; i++) arr.push(sym);
  // Mélange en évitant deux WILD adjacents (pour ne pas en voir 2 sur le même rouleau trop souvent)
  for (let tries = 0; tries < 500; tries++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    let ok = true;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i], b = arr[(i + 1) % arr.length], c = arr[(i + 2) % arr.length];
      if (a === 'W' && (b === 'W' || c === 'W')) { ok = false; break; }
    }
    if (ok) break;
  }
  return arr;
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

function linePay(symbols) {
  // symbols : 5 symboles le long de la ligne
  // 1) Gain des WILD seuls en tête
  let wildRun = 0;
  while (wildRun < 5 && symbols[wildRun] === 'W') wildRun++;
  const wildPay = wildRun >= 3 ? PAYTABLE.W[wildRun - 3] : 0;
  // 2) Gain du premier symbole non-WILD, les WILD se substituant
  let best = { pay: wildPay, sym: 'W', count: wildRun };
  const base = symbols.find((s) => s !== 'W');
  if (base) {
    let count = 0;
    while (count < 5 && (symbols[count] === base || symbols[count] === 'W')) count++;
    if (count >= 3) {
      const pay = PAYTABLE[base][count - 3];
      if (pay > best.pay) best = { pay, sym: base, count };
    }
  }
  return best.pay > 0 ? best : null;
}

// Évalue une grille : renvoie les lignes gagnantes, le total (en mises par ligne) et le nombre de WILD
export function evaluate(grid) {
  const wins = [];
  let total = 0;
  PAYLINES.forEach((line, idx) => {
    const syms = line.map((row, reel) => grid[reel][row]);
    const res = linePay(syms);
    if (res) {
      wins.push({ line: idx, symbol: res.sym, count: res.count, pay: res.pay,
        cells: line.slice(0, res.count).map((row, reel) => [reel, row]) });
      total += res.pay;
    }
  });
  let wilds = 0;
  const wildCells = [];
  grid.forEach((col, reel) => col.forEach((s, row) => { if (s === 'W') { wilds++; wildCells.push([reel, row]); } }));
  const freeSpins = wilds >= 3 ? FREE_SPINS_AWARD[Math.min(wilds, 5)] : 0;
  return { wins, total, wilds, wildCells, freeSpins };
}
