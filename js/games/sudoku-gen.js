// Sudoku : grille complète au hasard puis on retire des chiffres tant que la solution reste unique.
// La grille est un tableau de 81 cases (0 = vide).
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ROW = (i) => Math.floor(i / 9), COL = (i) => i % 9, BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

// Solveur par bits (case la plus contrainte d'abord). Compte les solutions jusqu'à max ; remplit `out` avec la 1re.
export function solveSudoku(grid, max = 2, out = null) {
  const g = [...grid], rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) {
    const b = 1 << g[i];
    if ((rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & b) return 0;
    rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b;
  }
  let count = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const m = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3fe;
      let k = 0; for (let x = m; x; x &= x - 1) k++;
      if (k < bestN) { best = i; bestMask = m; bestN = k; if (!k) return; }
    }
    if (best < 0) { count++; if (out && count === 1) out.splice(0, 81, ...g); return; }
    for (let v = 1; v <= 9 && count < max; v++) {
      const b = 1 << v;
      if (!(bestMask & b)) continue;
      g[best] = v; rows[ROW(best)] |= b; cols[COL(best)] |= b; boxes[BOX(best)] |= b;
      rec();
      g[best] = 0; rows[ROW(best)] &= ~b; cols[COL(best)] &= ~b; boxes[BOX(best)] &= ~b;
    }
  };
  rec();
  return count;
}

function fullGrid() {
  const g = new Array(81).fill(0);
  // diagonale de blocs au hasard, puis le solveur complète (avec des chiffres mélangés)
  for (let b = 0; b < 3; b++) {
    const d = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let k = 0; k < 9; k++) g[(b * 3 + Math.floor(k / 3)) * 9 + b * 3 + (k % 3)] = d[k];
  }
  const out = [];
  solveSudoku(g, 1, out);
  // permutation des chiffres pour éviter les motifs du solveur
  const p = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])];
  return out.map((v) => p[v]);
}

// Nombre de chiffres donnés visé par niveau (facile, moyen, difficile)
export const SUDOKU_LEVELS = [{ name: 'Facile', clues: 40 }, { name: 'Moyen', clues: 32 }, { name: 'Difficile', clues: 25 }];

export function generateSudoku(level = 1) {
  const target = SUDOKU_LEVELS[level].clues;
  const sol = fullGrid(), g = [...sol];
  let clues = 81;
  // retrait par paires symétriques (plus joli) tant que la solution reste unique
  for (const i of shuffle([...Array(41).keys()])) {
    if (clues <= target) break;
    const j = 80 - i, a = g[i], b = g[j];
    g[i] = 0; g[j] = 0;
    if (solveSudoku(g, 2) !== 1) { g[i] = a; g[j] = b; } else clues -= i === j ? 1 : 2;
  }
  // puis case par case si on n'a pas encore atteint la cible
  for (const i of shuffle([...Array(81).keys()])) {
    if (clues <= target) break;
    if (!g[i]) continue;
    const a = g[i]; g[i] = 0;
    if (solveSudoku(g, 2) !== 1) g[i] = a; else clues--;
  }
  return { puzzle: g, solution: sol, level, clues };
}
