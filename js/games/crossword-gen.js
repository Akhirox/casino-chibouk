// Mots croisés : génération d'une grille en croisant des mots de la liste (chaque mot touche les autres
// uniquement par ses croisements). Renvoie la grille recadrée, numérotée, avec les définitions.
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function tryBuild(pool, target, maxSize) {
  const cells = new Map(); // "r,c" -> { ch, h: bool, v: bool }
  const placed = [];
  const at = (r, c) => cells.get(r + ',' + c);
  let minR = 0, maxR = 0, minC = 0, maxC = 0;
  const fits = (word, r, c, dir) => {
    const dr = dir === 'v' ? 1 : 0, dc = dir === 'h' ? 1 : 0;
    const er = r + dr * (word.length - 1), ec = c + dc * (word.length - 1);
    if (Math.max(maxR, er) - Math.min(minR, r) + 1 > maxSize || Math.max(maxC, ec) - Math.min(minC, c) + 1 > maxSize) return -1;
    if (at(r - dr, c - dc) || at(er + dr, ec + dc)) return -1; // rien juste avant ni juste après
    let cross = 0;
    for (let k = 0; k < word.length; k++) {
      const rr = r + dr * k, cc = c + dc * k, x = at(rr, cc);
      if (x) {
        if (x.ch !== word[k] || x[dir]) return -1;
        cross++;
      } else {
        // une nouvelle lettre ne doit pas toucher une autre lettre sur les côtés
        if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1;
      }
    }
    return cross;
  };
  const put = (w, r, c, dir) => {
    const dr = dir === 'v' ? 1 : 0, dc = dir === 'h' ? 1 : 0;
    for (let k = 0; k < w.word.length; k++) {
      const key = (r + dr * k) + ',' + (c + dc * k);
      const x = cells.get(key) || { ch: w.word[k], h: false, v: false };
      x[dir] = true; cells.set(key, x);
    }
    minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r + dr * (w.word.length - 1)); maxC = Math.max(maxC, c + dc * (w.word.length - 1));
    placed.push({ ...w, r, c, dir });
  };
  const list = [...pool];
  const first = list.shift();
  put(first, 0, 0, Math.random() < 0.5 ? 'h' : 'v');
  let guard = 0;
  while (placed.length < target && list.length && guard++ < 400) {
    const w = list.shift();
    let best = null;
    for (const [key, x] of cells) {
      const [r0, c0] = key.split(',').map(Number);
      for (let k = 0; k < w.word.length; k++) {
        if (w.word[k] !== x.ch) continue;
        for (const dir of ['h', 'v']) {
          if (x[dir]) continue;
          const r = dir === 'v' ? r0 - k : r0, c = dir === 'h' ? c0 - k : c0;
          const n = fits(w.word, r, c, dir);
          if (n > 0) { const score = n * 10 + Math.random() * 5; if (!best || score > best.score) best = { r, c, dir, score }; }
        }
      }
    }
    if (best) put(w, best.r, best.c, best.dir); else if (guard < 200) list.push(w); // on le retentera plus tard
  }
  return { placed, cells, minR, minC, maxR, maxC };
}

// level : { words, maxSize, minLen, maxLen }
export function generateCrossword(WORDS, { words = 8, maxSize = 13, minLen = 3, maxLen = 10 } = {}) {
  const candidates = WORDS.filter((w) => w.word.length >= minLen && w.word.length <= maxLen);
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    // on commence par des mots plutôt longs (plus faciles à croiser)
    const pool = shuffle([...candidates]).slice(0, words * 6).sort((a, b) => b.word.length - a.word.length + (Math.random() - 0.5) * 6);
    const g = tryBuild(pool, words, maxSize);
    const area = (g.maxR - g.minR + 1) * (g.maxC - g.minC + 1);
    const score = g.placed.length * 1000 - area;
    if (!best || score > best.score) best = { ...g, score };
    if (g.placed.length >= words && area < maxSize * maxSize * 0.7) break;
  }
  const { placed, minR, minC, maxR, maxC } = best;
  const rows = maxR - minR + 1, cols = maxC - minC + 1;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(null));
  for (const p of placed) for (let k = 0; k < p.word.length; k++) {
    const r = p.r - minR + (p.dir === 'v' ? k : 0), c = p.c - minC + (p.dir === 'h' ? k : 0);
    grid[r][c] = p.word[k];
  }
  // numérotation dans l'ordre de lecture
  const starts = placed.map((p) => ({ ...p, r: p.r - minR, c: p.c - minC })).sort((a, b) => a.r - b.r || a.c - b.c);
  let n = 0; const num = {};
  for (const s of starts) { const key = s.r + ',' + s.c; if (!num[key]) num[key] = ++n; s.n = num[key]; }
  return { rows, cols, grid, words: starts, numbers: num };
}
