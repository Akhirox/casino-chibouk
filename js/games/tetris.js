// Tetris — mini-jeu gratuit (V41). Deux modes :
//  · Infini : vitesse tranquille et constante, des Brundles à chaque ligne, gros bonus pour un Tetris (4 lignes).
//  · Challenge : ça accélère d'un niveau toutes les 10 lignes, gains multipliés par le niveau, record au score.
// Règles modernes : rotations SRS avec décalages contre les murs, sac de 7 pièces, réserve, 5 pièces suivantes,
// pièce fantôme, temps de pose de 0,5 s, T-Spins, combos, back-to-back et plateau vidé.
// Clavier : ← → déplacer · ↓ descendre · Espace chute · ↑ / X tourner · Z / W / Ctrl tourner à gauche · C / Maj réserve · P / Échap pause.
// Téléphone : glisser pour déplacer, toucher pour tourner, glisser vite vers le bas pour la chute, ou les boutons.
import { $, $$, fmt, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { modesHTML, bindModes, savedLevel, saveLevel, endCardHTML } from './free-common.js';
import { submitRecord, recordEndHTML, fmtCs } from '../records.js';

export const TETRIS_MODES = [
  { name: 'Infini', desc: 'Vitesse tranquille et constante : joue aussi longtemps que tu tiens', key: 'zen' },
  { name: 'Challenge', desc: 'Ça accélère toutes les 10 lignes : gains multipliés par le niveau', key: 'marathon' },
];
// Brundles par action (× niveau en Challenge) : 1 ligne, 2, 3, Tetris
export const TT_LINES = [0, 3, 7, 12, 25];
const TT_TSPIN = [2, 8, 16, 28];  // T-Spin sans ligne, simple, double, triple
const TT_PC = 40;                 // plateau entièrement vidé
const B2B = 1.5;                  // Tetris ou T-Spin enchaînés
export const levelMult = (L) => 1 + 0.25 * (L - 1); // Challenge : ×2 au niveau 5, ×3 au niveau 9…
const ZEN_GRAVITY = 0.75;         // secondes par ligne en mode Infini
const gravityOf = (L) => Math.pow(Math.max(0.05, 0.8 - (L - 1) * 0.007), L - 1); // courbe officielle (s par ligne)
const LOCK_MS = 500, LOCK_RESETS = 15, DAS = 150, ARR = 40, CLEAR_MS = 260;

const W = 10, H = 22, VIS = 20; // 2 lignes cachées au-dessus
const COLORS = { I: '#3fd5ff', O: '#ffd23f', T: '#b86bff', S: '#3ddc84', Z: '#ff4d5e', J: '#4d7dff', L: '#ff9f43', X: '#7d8a83' };
const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};
const rot = (m) => m.map((r, y) => r.map((_, x) => m[m.length - 1 - x][y])); // quart de tour horaire
const ROTS = Object.fromEntries(Object.entries(SHAPES).map(([k, m]) => { const a = [m]; for (let i = 1; i < 4; i++) a.push(rot(a[i - 1])); return [k, a.map((s) => cells(s))]; }));
function cells(m) { const out = []; m.forEach((r, y) => r.forEach((v, x) => v && out.push([x, y]))); return out; }
// Décalages SRS (y vers le haut dans la norme : inversé ici)
const K = (a) => a.map(([x, y]) => [x, -y]);
const KICKS = {
  '01': K([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]), '10': K([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]),
  '12': K([[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]), '21': K([[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]),
  '23': K([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]), '32': K([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]),
  '30': K([[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]), '03': K([[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]),
};
const KICKS_I = {
  '01': K([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]), '10': K([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]),
  '12': K([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]), '21': K([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]),
  '23': K([[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]), '32': K([[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]]),
  '30': K([[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]), '03': K([[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]),
};
const CLEAR_NAME = ['', 'Simple', 'Double', 'Triple', 'TETRIS !'];

export function mount(view, { wallet }) {
  let gid = 0, alive = true, mode = savedLevel('chibouk_tetris_mode', 0, 1), state = 'intro', raf = 0, last = 0;
  // partie
  let board, bag, queue, cur, hold, holdUsed, score, lines, level, earned, combo, b2b, tetrises, tspins, pcs, gameMs, credited, recRes, maxCombo;
  let fallAcc, lockMs, lockResets, lowest, lastRot, clearing, clearT, countdown, fx, shake, bump, flash;
  // entrées
  const held = { left: false, right: false, down: false };
  let dir = 0, dasT = 0, arrT = 0;
  // dessin
  let cv = null, ctx = null, cs = 24, side = 0, sprites = {}, dpr = 1;

  view.innerHTML = `<div class="fg-wrap tt-wrap">
    <div class="game-head"><h1>Tet<span>ris</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${TT_LINES[1]} ${CUR} par ligne · Tetris +${TT_LINES[4]}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);

  /* ---------------- écran d'accueil ---------------- */
  function intro() {
    state = 'intro';
    const s = wallet.stats;
    stage.innerHTML = `<div class="qz-card tt-intro">${monkeySVG({ cap: true })}
      <h2>Les blocs de la jungle</h2>
      <p>Complète des lignes pour les faire disparaître. Chaque ligne rapporte des ${CUR}, et 4 lignes d'un coup (un <b>Tetris</b>) rapportent gros.</p>
      ${modesHTML(TETRIS_MODES, mode, (l, i) => (i === 0 ? `+${TT_LINES[1]} ${CUR} par ligne, Tetris +${TT_LINES[4]}${s.tetrisBest0 ? ` · record ${fmt(s.tetrisBest0)} lignes` : ''}` : `gains ×1 à ×5 selon le niveau${s.tetrisBest1 ? ` · record ${fmt(s.tetrisBest1)} pts` : ''}`), 'tetris')}
      <div class="tt-keys"><span><kbd>←</kbd><kbd>→</kbd> déplacer</span><span><kbd>↓</kbd> descendre</span><span><kbd>Espace</kbd> chute</span><span><kbd>↑</kbd><kbd>X</kbd> tourner</span><span><kbd>Z</kbd><kbd>W</kbd> tourner à gauche</span><span><kbd>C</kbd><kbd>Maj</kbd> réserve</span><span><kbd>P</kbd> pause</span></div>
      <p class="muted tt-touch">Sur téléphone : glisse pour déplacer, touche pour tourner, glisse vite vers le bas pour faire tomber la pièce.</p>
      <button class="btn btn-gold btn-lg" id="fg-start">Jouer</button></div>`;
    bindModes(stage, (i) => { mode = i; saveLevel('chibouk_tetris_mode', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  /* ---------------- partie ---------------- */
  function start() {
    stage.innerHTML = `<div class="fg-bar tt-bar"><span class="fg-timer" id="tt-score">0</span><span class="fg-info" id="tt-info">${TETRIS_MODES[mode].name}</span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="tt-pause">Pause</button><button class="btn btn-ghost btn-sm" id="tt-quit">Abandonner</button></span></div>
      <div class="tt-box"><canvas id="tt-cv" class="tt-cv"></canvas><div class="sn-over tt-over" id="tt-over" hidden></div></div>
      <div class="tt-pad">
        <button data-k="ccw" aria-label="tourner à gauche">⟲</button><button data-k="hold" aria-label="réserve">Réserve</button><button data-k="cw" aria-label="tourner">⟳</button>
        <button data-k="left" aria-label="gauche">◀</button><button data-k="down" aria-label="descendre">▼</button><button data-k="right" aria-label="droite">▶</button>
        <button data-k="drop" class="tt-drop" aria-label="chute">Chute ⤓</button></div>`;
    cv = $('#tt-cv', stage); ctx = cv.getContext('2d');
    board = Array.from({ length: H }, () => new Array(W).fill(null));
    bag = []; queue = []; hold = null; holdUsed = false;
    score = 0; lines = 0; level = 1; earned = 0; combo = -1; b2b = false; tetrises = 0; tspins = 0; pcs = 0; maxCombo = 0;
    gameMs = 0; credited = false; recRes = null;
    fallAcc = 0; lockMs = 0; lockResets = 0; lowest = 0; lastRot = false; clearing = null; clearT = 0;
    fx = []; shake = 0; bump = 0; flash = 0; countdown = 2100; gid++;
    dir = 0; held.left = held.right = held.down = false;
    while (queue.length < 6) queue.push(nextFromBag());
    spawn();
    resize();
    state = 'play';
    $('#tt-pause', stage).onclick = togglePause;
    $('#tt-quit', stage).onclick = () => { if (state === 'play' || state === 'paused') over(true); };
    bindPad(); bindTouch();
    sfx.click();
    hud();
    if (window.matchMedia && window.matchMedia('(pointer: coarse), (max-width: 700px)').matches) setTimeout(() => alive && stage.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function nextFromBag() {
    if (!bag.length) { bag = Object.keys(SHAPES); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    return bag.pop();
  }
  function spawn(t) {
    t = t || queue.shift();
    while (queue.length < 6) queue.push(nextFromBag());
    cur = { t, r: 0, x: t === 'O' ? 4 : 3, y: t === 'I' ? 0 : 1 };
    lockMs = 0; lockResets = 0; lowest = cur.y; lastRot = false; fallAcc = 0;
    if (collide(cur.x, cur.y, cur.r)) { // plus de place : on tente une ligne plus haut, sinon c'est fini
      if (!collide(cur.x, cur.y - 1, cur.r)) cur.y -= 1; else return over();
    }
    // la pièce apparaît dans la zone visible tout de suite si elle peut descendre
    if (!collide(cur.x, cur.y + 1, cur.r)) cur.y += 1;
  }
  const blocksOf = (p, x = p.x, y = p.y, r = p.r) => ROTS[p.t][r].map(([a, b]) => [x + a, y + b]);
  function collide(x, y, r, t = cur.t) {
    for (const [a, b] of ROTS[t][r]) { const X = x + a, Y = y + b; if (X < 0 || X >= W || Y >= H) return true; if (Y >= 0 && board[Y][X]) return true; }
    return false;
  }
  const onGround = () => collide(cur.x, cur.y + 1, cur.r);
  function ghostY() { let y = cur.y; while (!collide(cur.x, y + 1, cur.r)) y++; return y; }

  // un mouvement réussi au sol relance le temps de pose (15 fois au plus)
  function moved() {
    if (onGround() && lockResets < LOCK_RESETS) { lockMs = 0; lockResets++; }
  }
  function shift(dx, quiet = false) {
    if (!cur || collide(cur.x + dx, cur.y, cur.r)) return false;
    cur.x += dx; lastRot = false; moved(); if (!quiet) sfx.tick(); return true;
  }
  function rotate(d) {
    if (!cur || cur.t === 'O') { if (cur && cur.t === 'O') sfx.flip(); return; }
    const from = cur.r, to = (from + (d > 0 ? 1 : 3)) % 4;
    const kicks = (cur.t === 'I' ? KICKS_I : KICKS)['' + from + to];
    for (const [kx, ky] of kicks) {
      if (!collide(cur.x + kx, cur.y + ky, to)) {
        cur.x += kx; cur.y += ky; cur.r = to; lastRot = { kick: kx !== 0 || ky !== 0, big: Math.abs(kx) === 1 && Math.abs(ky) === 2 };
        moved(); sfx.flip(); return;
      }
    }
  }
  function softStep() {
    if (!collide(cur.x, cur.y + 1, cur.r)) { cur.y++; score += 1; lastRot = false; if (cur.y > lowest) { lowest = cur.y; lockResets = 0; } return true; }
    return false;
  }
  function hardDrop() {
    if (!cur) return;
    const y0 = cur.y, gy = ghostY();
    if (gy > y0) lastRot = false;
    score += 2 * (gy - y0);
    // traînée de la chute
    const xs = blocksOf(cur).map(([x]) => x);
    fx.push({ k: 'trail', x0: Math.min(...xs), x1: Math.max(...xs) + 1, y0: y0 + Math.min(...ROTS[cur.t][cur.r].map((c) => c[1])), y1: gy + Math.max(...ROTS[cur.t][cur.r].map((c) => c[1])) + 1, c: COLORS[cur.t], t: 0, d: 180 });
    cur.y = gy; bump = Math.min(6, 2 + (gy - y0) * 0.3);
    sfx.chip();
    lock();
  }
  function doHold() {
    if (!cur || holdUsed) return;
    const t = cur.t; holdUsed = true; sfx.card();
    if (hold) { const h = hold; hold = t; spawn(h); } else { hold = t; spawn(); }
  }

  // T-Spin : la dernière action est une rotation et 3 des 4 coins autour du centre sont pris
  function tspinKind() {
    if (cur.t !== 'T' || !lastRot) return 0;
    const cx = cur.x + 1, cy = cur.y + 1;
    const occ = (x, y) => x < 0 || x >= W || y >= H || (y >= 0 && !!board[y][x]);
    const corners = [[cx - 1, cy - 1], [cx + 1, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]].map(([x, y]) => occ(x, y));
    if (corners.filter(Boolean).length < 3) return 0;
    // coins « devant » la pointe du T
    const front = [[0, 1], [1, 2], [2, 3], [3, 0]][cur.r].map((i) => corners[i]);
    return front[0] && front[1] || lastRot.big ? 2 : 1; // 2 : vrai T-Spin · 1 : mini
  }

  function lock() {
    const ts = tspinKind();
    let top = false;
    for (const [x, y] of blocksOf(cur)) { if (y < 0) { top = true; continue; } board[y][x] = cur.t; }
    fx.push({ k: 'lock', cells: blocksOf(cur), t: 0, d: 160 });
    const placedAbove = blocksOf(cur).every(([, y]) => y < H - VIS); // posée entièrement hors de l'écran : perdu
    const full = [];
    for (let y = 0; y < H; y++) if (board[y].every(Boolean)) full.push(y);
    score_(full.length, ts);
    cur = null; holdUsed = false;
    if (full.length) { clearing = full; clearT = 0; sfx.brick(1 + full.length * 0.12); particles(full); }
    else { sfx.card(); if (top || placedAbove) return over(); spawn(); }
  }

  function score_(n, ts) {
    const L = mode === 1 ? level : 1, m = mode === 1 ? levelMult(level) : 1;
    let pts = 0, br = 0;
    const big = n === 4 || (ts === 2 && n > 0);
    if (ts === 2) { pts = [400, 800, 1200, 1600][n] * L; br = TT_TSPIN[n]; if (n) tspins++; }
    else if (ts === 1 && n <= 1) { pts = [100, 200][n] * L; br = n ? TT_LINES[1] + 2 : 1; }
    else if (n) { pts = [0, 100, 300, 500, 800][n] * L; br = TT_LINES[n]; }
    const chain = big && b2b && n > 0;
    if (n) {
      combo++;
      if (chain) { pts = Math.round(pts * 1.5); br = Math.round(br * B2B); }
      if (combo > 0) { pts += 50 * combo * L; br += combo; }
      b2b = big ? true : false;
      maxCombo = Math.max(maxCombo, combo);
      if (n === 4) tetrises++;
    } else combo = -1;
    // plateau vidé ?
    let pc = false;
    if (n) { const rest = board.filter((r) => !r.every(Boolean)); pc = rest.every((r) => r.every((c) => !c)); }
    if (pc) { pts += 2000 * L; br += TT_PC; pcs++; }
    br = Math.round(br * m);
    score += pts; earned += br;
    // textes flottants
    const label = ts === 2 ? `T-Spin ${['', 'simple', 'double', 'triple'][n]}`.trim() : ts === 1 && n ? 'Mini T-Spin' : CLEAR_NAME[n];
    if (label || br) {
      const parts = [];
      if (label) parts.push({ txt: label, big: n === 4 || ts === 2 });
      if (chain) parts.push({ txt: 'Back-to-back', small: true });
      if (combo > 0) parts.push({ txt: `Combo ×${combo + 1}`, small: true });
      if (pc) parts.push({ txt: 'Plateau vidé !', big: true });
      if (br) parts.push({ txt: `+${fmt(br)} ${CUR}`, gold: true });
      fx.push({ k: 'pop', parts, t: 0, d: n === 4 || pc ? 1400 : 1000 });
    }
    if (n === 4 || pc || (ts === 2 && n >= 2)) { shake = 9; flash = 1; sfx.bonus(); coinRain(n === 4 ? 8 : 12); }
    else if (n) sfx.coin();
    if (n) {
      lines += n;
      if (mode === 1 && Math.floor(lines / 10) + 1 > level) { level = Math.floor(lines / 10) + 1; fx.push({ k: 'pop', parts: [{ txt: `Niveau ${level}`, big: true }, { txt: `gains ×${String(levelMult(level)).replace('.', ',')}`, gold: true }], t: 0, d: 1300, y: 0.3 }); setTimeout(() => alive && sfx.turn(), 250); }
    }
    hud();
  }

  function particles(rows) {
    for (const y of rows) for (let x = 0; x < W; x++) {
      const c = COLORS[board[y][x]] || '#fff';
      for (let k = 0; k < 2; k++) fx.push({ k: 'pt', x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7 - 2, c, t: 0, d: 600 + Math.random() * 300 });
    }
  }
  function finishClear() {
    const rows = new Set(clearing);
    const keep = board.filter((_, y) => !rows.has(y));
    while (keep.length < H) keep.unshift(new Array(W).fill(null));
    board = keep; clearing = null;
    spawn();
  }

  function hud() {
    const sc = $('#tt-score', stage), inf = $('#tt-info', stage);
    if (sc) sc.textContent = fmt(score);
    if (inf) inf.textContent = `${TETRIS_MODES[mode].name}${mode === 1 ? ` · niveau ${level}` : ''} · ${fmt(lines)} ligne${lines > 1 ? 's' : ''} · +${fmt(earned)} ${CUR}`;
  }

  /* ---------------- boucle ---------------- */
  function loop(t) {
    if (!alive) return;
    let dt = Math.min(50, t - last); last = t;
    if (state === 'play') step(dt);
    animate(dt);
    draw();
    if (state === 'play' || (state === 'over' && (fx.length || shake > 0.2))) raf = requestAnimationFrame(loop);
  }

  function step(dt) {
    if (countdown > 0) { countdown -= dt; return; }
    gameMs += dt;
    if (clearing) { clearT += dt; if (clearT >= CLEAR_MS) finishClear(); return; }
    if (!cur) return;
    // déplacement latéral auto-répété
    if (dir) {
      dasT += dt;
      if (dasT >= DAS) { arrT += dt; while (arrT >= ARR) { arrT -= ARR; if (!shift(dir, true)) { arrT = 0; break; } } }
    }
    // gravité (et descente rapide)
    const g = (mode === 1 ? gravityOf(level) : ZEN_GRAVITY) * 1000;
    const per = held.down ? Math.min(g, Math.max(16, g / 20, 30)) : g;
    fallAcc += dt;
    while (fallAcc >= per && cur) {
      fallAcc -= per;
      if (!collide(cur.x, cur.y + 1, cur.r)) { cur.y++; lastRot = false; if (held.down) score += 1; if (cur.y > lowest) { lowest = cur.y; lockResets = 0; lockMs = 0; } }
      else { fallAcc = 0; break; }
    }
    if (cur && onGround()) { lockMs += dt; if (lockMs >= LOCK_MS) lock(); }
    else lockMs = 0;
    if (held.down) hud();
  }

  function animate(dt) {
    for (const e of fx) {
      e.t += dt;
      if (e.k === 'pt') { const s = dt / 1000; e.vy += 22 * s; e.x += e.vx * s; e.y += e.vy * s; }
    }
    fx = fx.filter((e) => e.t < e.d);
    shake *= Math.pow(0.86, dt / 16); bump *= Math.pow(0.8, dt / 16); flash = Math.max(0, flash - dt / 300);
  }

  /* ---------------- dessin ---------------- */
  function resize() {
    if (!cv) return;
    const availW = Math.min(stage.clientWidth || 600, 760) - 4;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse), (max-width: 700px)').matches;
    const availH = Math.max(touch ? 260 : 320, window.innerHeight - (touch ? 430 : 250)); // téléphone : place pour les boutons en dessous
    const sideCells = 4.6;
    cs = Math.max(13, Math.min(32, Math.floor(availW / (W + 2 * sideCells + 0.6)), Math.floor(availH / (VIS + 0.4))));
    side = Math.round(sideCells * cs);
    dpr = window.devicePixelRatio || 1;
    const w = side * 2 + W * cs + Math.round(cs * 0.6), h = VIS * cs + Math.round(cs * 0.4);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sprites = {};
    for (const [k, c] of Object.entries(COLORS)) sprites[k] = block(c, cs);
    draw();
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }
  // un bloc pré-dessiné (relief, reflet) pour chaque couleur
  function block(c, s) {
    const o = document.createElement('canvas'); o.width = o.height = Math.ceil(s * dpr);
    const x = o.getContext('2d'); x.scale(dpr, dpr);
    const r = Math.max(2, s * 0.16), p = 1;
    const g = x.createLinearGradient(0, 0, s, s); g.addColorStop(0, shade(c, 0.28)); g.addColorStop(1, shade(c, -0.25));
    x.fillStyle = g; rr(x, p, p, s - 2 * p, s - 2 * p, r); x.fill();
    x.fillStyle = shade(c, 0.05); rr(x, p + s * 0.14, p + s * 0.14, s - 2 * p - s * 0.28, s - 2 * p - s * 0.28, r * 0.7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; rr(x, p + s * 0.18, p + s * 0.16, s * 0.34, s * 0.12, s * 0.06); x.fill();
    x.strokeStyle = shade(c, -0.45); x.lineWidth = 1; rr(x, p + 0.5, p + 0.5, s - 2 * p - 1, s - 2 * p - 1, r); x.stroke();
    return o;
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); }

  function draw() {
    if (!ctx) return;
    const Wpx = cv.width / dpr, Hpx = cv.height / dpr;
    ctx.save();
    ctx.clearRect(0, 0, Wpx, Hpx);
    if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const bx = side + Math.round(cs * 0.3), by = Math.round(cs * 0.2) + bump;
    // panneaux
    panel(Math.round(cs * 0.1), by, side - Math.round(cs * 0.3), 'RÉSERVE', hold ? [hold] : [], holdUsed);
    panel(bx + W * cs + Math.round(cs * 0.3), by, side - Math.round(cs * 0.3), 'SUIVANTES', (queue || []).slice(0, 5));
    stats(Math.round(cs * 0.1), by + cs * 4.6, side - Math.round(cs * 0.3));
    // plateau
    ctx.fillStyle = '#081510'; rr(ctx, bx - 3, by - 3, W * cs + 6, VIS * cs + 6, 10); ctx.fill();
    ctx.strokeStyle = level >= 10 && mode === 1 ? '#ff4d5e88' : '#ffffff22'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, W * cs, VIS * cs); ctx.clip();
    ctx.fillStyle = '#0d1f16'; ctx.fillRect(bx, by, W * cs, VIS * cs);
    ctx.strokeStyle = '#ffffff0a'; ctx.lineWidth = 1;
    for (let x = 1; x < W; x++) { ctx.beginPath(); ctx.moveTo(bx + x * cs + 0.5, by); ctx.lineTo(bx + x * cs + 0.5, by + VIS * cs); ctx.stroke(); }
    for (let y = 1; y < VIS; y++) { ctx.beginPath(); ctx.moveTo(bx, by + y * cs + 0.5); ctx.lineTo(bx + W * cs, by + y * cs + 0.5); ctx.stroke(); }
    const off = H - VIS;
    const clr = clearing ? new Set(clearing) : null, k = clearing ? Math.min(1, clearT / CLEAR_MS) : 0;
    if (board) for (let y = off; y < H; y++) for (let x = 0; x < W; x++) {
      const t = board[y][x]; if (!t) continue;
      const px = bx + x * cs, py = by + (y - off) * cs;
      if (clr && clr.has(y)) { // ligne qui s'efface : flash blanc puis rétrécit depuis le centre
        const sc = 1 - k * k; ctx.globalAlpha = 1 - k * 0.6;
        const d = (cs * (1 - sc)) / 2; ctx.drawImage(sprites[t], px + d, py + d, cs * sc, cs * sc);
        ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - k)})`; ctx.fillRect(px, py, cs, cs); ctx.globalAlpha = 1;
      } else ctx.drawImage(sprites[t], px, py, cs, cs);
    }
    // traînées de chute
    for (const e of fx) if (e.k === 'trail') {
      const a = 1 - e.t / e.d, g = ctx.createLinearGradient(0, by + (e.y0 - off) * cs, 0, by + (e.y1 - off) * cs);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, e.c);
      ctx.globalAlpha = 0.35 * a; ctx.fillStyle = g; ctx.fillRect(bx + e.x0 * cs + cs * 0.15, by + (e.y0 - off) * cs, (e.x1 - e.x0) * cs - cs * 0.3, (e.y1 - e.y0) * cs); ctx.globalAlpha = 1;
    }
    if (cur && state !== 'over') {
      // fantôme
      const gy = ghostY();
      ctx.strokeStyle = COLORS[cur.t]; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
      for (const [x, y] of blocksOf(cur, cur.x, gy)) if (y >= off) { rr(ctx, bx + x * cs + 2, by + (y - off) * cs + 2, cs - 4, cs - 4, cs * 0.15); ctx.stroke(); }
      ctx.globalAlpha = 0.12; ctx.fillStyle = COLORS[cur.t];
      for (const [x, y] of blocksOf(cur, cur.x, gy)) if (y >= off) ctx.fillRect(bx + x * cs + 2, by + (y - off) * cs + 2, cs - 4, cs - 4);
      ctx.globalAlpha = 1;
      // pièce (elle pâlit pendant le temps de pose)
      const fade = onGround() ? 0.25 * Math.min(1, lockMs / LOCK_MS) : 0;
      for (const [x, y] of blocksOf(cur)) if (y >= off) { ctx.drawImage(sprites[cur.t], bx + x * cs, by + (y - off) * cs, cs, cs); if (fade) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(bx + x * cs + 1, by + (y - off) * cs + 1, cs - 2, cs - 2); } }
    }
    // flash de pose
    for (const e of fx) if (e.k === 'lock') { ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - e.t / e.d)})`; for (const [x, y] of e.cells) if (y >= off) ctx.fillRect(bx + x * cs + 1, by + (y - off) * cs + 1, cs - 2, cs - 2); }
    // particules
    for (const e of fx) if (e.k === 'pt') { ctx.globalAlpha = Math.max(0, 1 - e.t / e.d); ctx.fillStyle = e.c; const s = cs * 0.22; ctx.fillRect(bx + e.x * cs - s / 2, by + (e.y - off) * cs - s / 2, s, s); }
    ctx.globalAlpha = 1;
    if (flash > 0) { ctx.fillStyle = `rgba(255,230,140,${0.25 * flash})`; ctx.fillRect(bx, by, W * cs, VIS * cs); }
    // textes flottants
    let stack = 0;
    for (const e of fx) if (e.k === 'pop') {
      const p = e.t / e.d, a = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1, rise = p * cs * 1.5;
      let y = by + VIS * cs * (e.y ?? 0.42) - rise + stack;
      ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const part of e.parts) {
        const sz = part.big ? cs * 1.05 : part.small ? cs * 0.55 : cs * 0.7;
        const pop = part.big && p < 0.12 ? 1 + (0.12 - p) * 3 : 1;
        ctx.font = `800 ${Math.round(sz * pop)}px Rubik, system-ui, sans-serif`;
        ctx.lineWidth = Math.max(3, sz * 0.18); ctx.strokeStyle = '#04100a'; ctx.strokeText(part.txt, bx + (W * cs) / 2, y);
        ctx.fillStyle = part.gold ? '#f5c542' : part.big ? '#fff6c4' : '#e7f3ea'; ctx.fillText(part.txt, bx + (W * cs) / 2, y);
        y += sz * 1.15;
      }
      stack += cs * 0.3;
    }
    ctx.globalAlpha = 1;
    // compte à rebours
    if (state === 'play' && countdown > 0) {
      const n = Math.ceil((countdown - 300) / 600), p = n > 0 ? 1 - (((countdown - 300) % 600) / 600) : 1 - countdown / 300;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx, by, W * cs, VIS * cs);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1 - p * 0.7;
      ctx.font = `800 ${Math.round(cs * (2.4 - p * 0.6))}px Rubik, system-ui, sans-serif`; ctx.fillStyle = '#f5c542';
      ctx.fillText(n > 0 ? String(n) : 'Go !', bx + (W * cs) / 2, by + (VIS * cs) / 2); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
  }
  function mini(t, cx, cy, s, dim) {
    const c = ROTS[t][0], xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
    ctx.globalAlpha = dim ? 0.35 : 1;
    for (const [x, y] of c) ctx.drawImage(sprites[t], cx + (x - Math.min(...xs) - w / 2) * s, cy + (y - Math.min(...ys) - h / 2) * s, s, s);
    ctx.globalAlpha = 1;
  }
  function panel(x, y, w, title, list, dim) {
    const n = Math.max(1, title === 'RÉSERVE' ? 1 : 5), first = cs * 3.2, rest = cs * 2.2;
    const h = title === 'RÉSERVE' ? cs * 4 : cs * 1 + first + rest * (n - 1);
    ctx.fillStyle = '#0b1a12cc'; rr(ctx, x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = '#ffffff18'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#8fb39c'; ctx.font = `800 ${Math.max(9, Math.round(cs * 0.42))}px Rubik, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(title, x + w / 2, y + cs * 0.55);
    list.forEach((t, i) => {
      const s = i === 0 ? Math.min(cs * 0.8, w / 4.6) : Math.min(cs * 0.55, w / 5.5);
      const cy = i === 0 ? y + cs * 1 + first / 2 - cs * 0.2 : y + cs * 1 + first + rest * (i - 1) + rest / 2 - cs * 0.3;
      mini(t, x + w / 2, cy, s, dim);
    });
  }
  function stats(x, y, w) {
    const rows = [['Score', fmt(score || 0)], ['Lignes', fmt(lines || 0)], ...(mode === 1 ? [['Niveau', String(level || 1)]] : []), ['Gains', `+${fmt(earned || 0)}`], ...(combo > 0 ? [['Combo', `×${combo + 1}`]] : [])];
    const h = cs * 0.5 + rows.length * cs * 1.25;
    ctx.fillStyle = '#0b1a12cc'; rr(ctx, x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = '#ffffff18'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    rows.forEach(([k, v], i) => {
      const ry = y + cs * 0.5 + i * cs * 1.25;
      ctx.fillStyle = '#8fb39c'; ctx.font = `700 ${Math.max(8, Math.round(cs * 0.36))}px Rubik, system-ui, sans-serif`; ctx.fillText(k.toUpperCase(), x + cs * 0.35, ry + cs * 0.1);
      ctx.fillStyle = k === 'Gains' ? '#f5c542' : '#eaf2ec'; ctx.font = `800 ${Math.max(10, Math.round(cs * 0.55))}px Rubik, system-ui, sans-serif`; ctx.fillText(v, x + cs * 0.35, ry + cs * 0.62);
    });
  }

  /* ---------------- pause, fin ---------------- */
  function togglePause() {
    if (state === 'play') { state = 'paused'; release(); overlay('Pause', 'P, Échap ou un clic pour reprendre'); draw(); }
    else if (state === 'paused') { state = 'play'; $('#tt-over', stage).hidden = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    const b = $('#tt-pause', stage); if (b) b.textContent = state === 'paused' ? 'Reprendre' : 'Pause';
  }
  function overlay(t, sub) { const o = $('#tt-over', stage); if (!o) return; o.innerHTML = `<b>${t}</b><small>${sub}</small>`; o.hidden = false; o.onclick = () => state === 'paused' && togglePause(); }
  function release() { held.left = held.right = held.down = false; dir = 0; }

  function reward() {
    if (credited) return { amount: 0, record: false };
    credited = true;
    const s = wallet.stats;
    let record = false;
    if (mode === 0) { if (lines > (s.tetrisBest0 || 0)) { s.tetrisBest0 = lines; record = lines > 0; } }
    else {
      if (score > (s.tetrisBest1 || 0)) { s.tetrisBest1 = score; record = score > 0; }
      if (level > (s.tetrisLv || 0)) s.tetrisLv = level;
    }
    if (maxCombo + 1 > (s.tetrisCombo || 0) && maxCombo > 0) s.tetrisCombo = maxCombo + 1;
    const extra = { Lines: lines, ['Lines' + mode]: lines, Tetris: tetrises, TSpin: tspins, Pc: pcs };
    const meta = { log: { lv: mode, sec: Math.round(gameMs / 1000), lines, level, score } };
    if (mode === 1 && record && score >= 50000) meta.feed = { txt: 'a battu son record au', tail: `: ${fmt(score)} points (niveau ${level})` };
    wallet.freeReward('tetris', earned, extra, meta);
    if (mode === 1 && score > 0) recRes = submitRecord(wallet, 'tetris', { v: score, t: gameMs });
    return { amount: earned, record };
  }

  function over(quit = false) {
    if (state === 'over') return;
    state = 'over'; release();
    const { amount, record } = reward();
    // le plateau se remplit de gris, ligne par ligne
    if (!quit) {
      sfx.lose();
      let y = H - 1; const g0 = gid;
      const iv = setInterval(() => { if (!alive || g0 !== gid || y < H - VIS) { clearInterval(iv); return; } board[y] = board[y].map((c) => (c ? 'X' : null)); y--; draw(); }, 35);
    }
    if (amount >= 50) coinRain(15);
    setTimeout(() => {
      if (!alive) return;
      const title = mode === 1 ? `${fmt(score)} points` : `${fmt(lines)} ligne${lines > 1 ? 's' : ''}`;
      const det = `${fmt(lines)} ligne${lines > 1 ? 's' : ''}${tetrises ? ` · ${tetrises} Tetris` : ''}${tspins ? ` · ${tspins} T-Spin${tspins > 1 ? 's' : ''}` : ''}${mode === 1 ? ` · niveau ${level}` : ''} · ${fmtCs(gameMs)}`;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: record, title, amount,
        text: `${det}.${recRes ? `<br>${recordEndHTML('tetris', recRes, wallet)}` : mode === 0 ? ` Record : ${fmt(wallet.stats.tetrisBest0 || 0)} lignes.` : ''}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de mode</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, quit ? 150 : 800);
  }

  /* ---------------- commandes ---------------- */
  const playing = () => state === 'play' && countdown <= 0 && !clearing && cur;
  function press(k) {
    if (state === 'paused' && k !== 'pause') return;
    if (k === 'pause') return togglePause();
    if (state !== 'play' || countdown > 0) { if (k === 'left' || k === 'right' || k === 'down') held[k] = true; if (k === 'left' || k === 'right') { dir = k === 'left' ? -1 : 1; dasT = 0; arrT = 0; } return; }
    if (k === 'left' || k === 'right') { held[k] = true; dir = k === 'left' ? -1 : 1; dasT = 0; arrT = 0; if (playing()) shift(dir); }
    else if (k === 'down') { held.down = true; fallAcc = 0; if (playing() && softStep()) { hud(); } }
    else if (!playing()) return;
    else if (k === 'cw') rotate(1);
    else if (k === 'ccw') rotate(-1);
    else if (k === 'drop') hardDrop();
    else if (k === 'hold') doHold();
  }
  function unpress(k) {
    if (k === 'left' || k === 'right') { held[k] = false; const o = k === 'left' ? 'right' : 'left'; dir = held[o] ? (o === 'left' ? -1 : 1) : 0; dasT = 0; arrT = 0; }
    if (k === 'down') held.down = false;
  }
  const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', x: 'cw', X: 'cw', z: 'ccw', Z: 'ccw', w: 'ccw', W: 'ccw', Control: 'ccw', ' ': 'drop', c: 'hold', C: 'hold', Shift: 'hold', p: 'pause', P: 'pause', Escape: 'pause', q: 'left', d: 'right', s: 'down', a: 'left' };
  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || (e.target.closest && e.target.closest('input,textarea'))) return;
    if ((state === 'over' || state === 'intro') && e.key === 'Enter' && !(e.target.closest && e.target.closest('button'))) { start(); return; }
    if (state !== 'play' && state !== 'paused') return;
    const k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    press(k);
  };
  const onKeyUp = (e) => { const k = KEYMAP[e.key]; if (k) unpress(k); };
  function bindPad() {
    $$('.tt-pad button', stage).forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); press(k); });
      const up = () => unpress(k);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }
  // gestes sur le plateau : glisser = déplacer, toucher = tourner, glisser vite vers le bas = chute
  function bindTouch() {
    let s = null;
    cv.addEventListener('pointerdown', (e) => {
      if (state === 'paused') { togglePause(); return; }
      if (e.pointerType === 'mouse') return; // à la souris : le clavier suffit
      s = { x: e.clientX, y: e.clientY, t: performance.now(), mx: 0, my: 0, moved: false, ax: e.clientX, ay: e.clientY };
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!s || !playing()) return;
      const step = cs * 0.9;
      while (e.clientX - s.ax >= step) { s.ax += step; shift(1); s.moved = true; }
      while (s.ax - e.clientX >= step) { s.ax -= step; shift(-1); s.moved = true; }
      while (e.clientY - s.ay >= step && Math.abs(e.clientY - s.y) > Math.abs(e.clientX - s.x)) { s.ay += step; if (softStep()) hud(); s.moved = true; }
    });
    cv.addEventListener('pointerup', (e) => {
      if (!s) return;
      const dt = performance.now() - s.t, dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (playing()) {
        if (dy > cs * 2 && dt < 260 && dy > Math.abs(dx) * 1.5) hardDrop();
        else if (dy < -cs * 2 && dt < 300 && -dy > Math.abs(dx)) doHold();
        else if (!s.moved && Math.hypot(dx, dy) < 12 && dt < 300) { if (e.clientX < cv.getBoundingClientRect().left + side) doHold(); else rotate(1); }
      }
      s = null;
    });
    cv.addEventListener('pointercancel', () => { s = null; });
    cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  const onVis = () => { if (document.visibilityState === 'hidden' && state === 'play') togglePause(); };
  const onBlur = () => { release(); };
  const onResize = () => resize();
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onResize);
  intro();
  return () => {
    alive = false; cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); window.removeEventListener('resize', onResize);
    if ((state === 'play' || state === 'paused') && (lines > 0 || earned > 0)) reward();
  };
}
