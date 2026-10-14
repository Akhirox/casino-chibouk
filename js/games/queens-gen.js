// Queens : génération d'une grille n×n découpée en n zones, avec UNE seule solution
// (une reine par ligne, colonne et zone, deux reines jamais adjacentes, même en diagonale).
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Placement aléatoire valide : une reine par ligne/colonne, pas de contact entre deux lignes consécutives
function placeQueens(n) {
  const cols = [], used = new Array(n).fill(false);
  const rec = (r) => {
    if (r === n) return true;
    for (const c of shuffle([...Array(n).keys()])) {
      if (used[c] || (r && Math.abs(c - cols[r - 1]) <= 1)) continue;
      used[c] = true; cols[r] = c;
      if (rec(r + 1)) return true;
      used[c] = false;
    }
    return false;
  };
  rec(0);
  return cols;
}

// Zones : chaque zone part d'une reine et grandit au hasard (zones contiguës de tailles variées)
function growRegions(n, cols) {
  const reg = Array.from({ length: n }, () => new Array(n).fill(-1));
  const weight = Array.from({ length: n }, () => 0.4 + Math.random() * 1.6);
  cols.forEach((c, r) => (reg[r][c] = r));
  let left = n * n - n;
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (left > 0) {
    // zone tirée au hasard, pondérée (certaines zones deviennent grandes, d'autres restent petites)
    const tot = weight.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot, k = 0;
    while ((x -= weight[k]) > 0) k++;
    const front = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (reg[r][c] === -1 && D.some(([dr, dc]) => reg[r + dr] && reg[r + dr][c + dc] === k)) front.push([r, c]);
    if (!front.length) { weight[k] *= 0.5; continue; }
    const [r, c] = front[Math.floor(Math.random() * front.length)];
    reg[r][c] = k; left--;
  }
  return reg;
}

// Nombre de solutions (on s'arrête à `max`)
export function countQueens(reg, max = 2) {
  const n = reg.length, colUsed = new Array(n).fill(false), regUsed = new Array(n).fill(false);
  let count = 0, prev = -9;
  const rec = (r, prevC) => {
    if (r === n) { count++; return; }
    for (let c = 0; c < n && count < max; c++) {
      const g = reg[r][c];
      if (colUsed[c] || regUsed[g] || Math.abs(c - prevC) <= 1) continue;
      colUsed[c] = regUsed[g] = true;
      rec(r + 1, c);
      colUsed[c] = regUsed[g] = false;
    }
  };
  rec(0, prev);
  return count;
}

// Une solution différente de la solution prévue (ou null)
function otherSolution(reg, planted) {
  const n = reg.length, colUsed = new Array(n).fill(false), regUsed = new Array(n).fill(false), cur = [];
  let found = null;
  const rec = (r, prevC) => {
    if (found) return;
    if (r === n) { if (cur.some((c, i) => c !== planted[i])) found = [...cur]; return; }
    for (let c = 0; c < n && !found; c++) {
      const g = reg[r][c];
      if (colUsed[c] || regUsed[g] || Math.abs(c - prevC) <= 1) continue;
      colUsed[c] = regUsed[g] = true; cur[r] = c;
      rec(r + 1, c);
      colUsed[c] = regUsed[g] = false;
    }
  };
  rec(0, -9);
  return found;
}

// La zone k reste-t-elle d'un seul tenant si on lui retire (r, c) ?
function staysConnected(reg, k, r0, c0) {
  const n = reg.length, cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (reg[r][c] === k && !(r === r0 && c === c0)) cells.push(r * n + c);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), stack = [cells[0]], set = new Set(cells);
  while (stack.length) {
    const x = stack.pop(), r = Math.floor(x / n), c = x % n;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc, y = rr * n + cc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n || !set.has(y) || seen.has(y)) continue;
      seen.add(y); stack.push(y);
    }
  }
  return seen.size === cells.length;
}

// Corrige les zones jusqu'à ce que la solution prévue soit la seule :
// une case-reine d'une autre solution passe dans une zone voisine, ce qui casse cette solution.
function repair(reg, planted, maxSteps = 120) {
  const n = reg.length;
  for (let step = 0; step < maxSteps; step++) {
    const alt = otherSolution(reg, planted);
    if (!alt) return true;
    const moves = [];
    alt.forEach((c, r) => {
      if (planted[r] === c) return;
      const k = reg[r][c];
      if (!staysConnected(reg, k, r, c)) return;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || reg[rr][cc] === k) continue;
        moves.push([r, c, reg[rr][cc]]);
      }
    });
    if (!moves.length) return false;
    const [r, c, k2] = moves[Math.floor(Math.random() * moves.length)];
    reg[r][c] = k2;
  }
  return false;
}

export function generateQueens(n, maxTries = 60) {
  for (let t = 0; t < maxTries; t++) {
    const cols = placeQueens(n);
    const reg = growRegions(n, cols);
    if (repair(reg, cols) && countQueens(reg) === 1) {
      // numérotation des zones dans l'ordre de lecture (couleurs plus agréables)
      const map = new Map(); let k = 0;
      for (const row of reg) for (const g of row) if (!map.has(g)) map.set(g, k++);
      return { n, regions: reg.map((row) => row.map((g) => map.get(g))), solution: cols, tries: t + 1 };
    }
  }
  return null;
}
