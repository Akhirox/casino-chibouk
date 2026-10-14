// Snake — jeu gratuit classique : le serpent de la jungle mange des bananes. 3 niveaux.
// Flèches / ZQSD / WASD, glisser sur téléphone, Espace pour la pause.
import { $, $$, fmt, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { modesHTML, bindModes, savedLevel, saveLevel, endCardHTML } from './free-common.js';

export const SNAKE_LEVELS = [
  { name: 'Facile', desc: 'Lent, et les bords te font passer de l\'autre côté', step: 140, wrap: true, per: 1, feed: 60 },
  { name: 'Moyen', desc: 'Plus rapide, les bords sont des murs', step: 100, wrap: false, per: 2, feed: 40 },
  { name: 'Difficile', desc: 'Rapide, et ça accélère à chaque banane', step: 82, wrap: false, per: 4, accel: true, feed: 30 },
];
const G = 20; // grille 20 × 20

export function mount(view, { wallet }) {
  let alive = true, lv = savedLevel('chibouk_snake_lv', 0), state = 'intro', snake = [], dir = [1, 0], queue = [], food = null, score = 0, step = 140, acc = 0, last = 0, raf = 0, credited = false;
  view.innerHTML = `<div class="fg-wrap sn-wrap">
    <div class="game-head"><h1>Sna<span>ke</span></h1><div class="actions"><span class="gc-tag">Gratuit · +1 à +4 ${CUR} par banane</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);
  let cv = null, ctx = null, px = 20;

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Le serpent de la jungle a faim</h2>
      <p>Mange un max de bananes sans te mordre la queue. Chaque banane rapporte selon le niveau.</p>
      ${modesHTML(SNAKE_LEVELS, lv, (l, i) => `+${l.per} ${CUR} par banane${wallet.stats['snakeBest' + i] ? ` · record ${wallet.stats['snakeBest' + i]}` : ''}`)}
      <button class="btn btn-gold btn-lg" id="fg-start">Jouer</button></div>`;
    bindModes(stage, (i) => { lv = i; saveLevel('chibouk_snake_lv', i); sfx.click(); intro(); });
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    const L = SNAKE_LEVELS[lv];
    stage.innerHTML = `<div class="fg-bar"><span class="fg-timer" id="sn-score">0</span><span class="fg-info" id="sn-info">${L.name} · record ${wallet.stats['snakeBest' + lv] || 0}</span>
        <span class="fg-tools"><button class="btn btn-ghost btn-sm" id="sn-pause">Pause</button></span></div>
      <div class="sn-box"><canvas id="sn-cv" class="sn-cv"></canvas><div class="sn-over" id="sn-over" hidden></div></div>
      <div class="sn-pad"><button data-d="0,-1" aria-label="haut">▲</button><button data-d="-1,0" aria-label="gauche">◀</button><button data-d="1,0" aria-label="droite">▶</button><button data-d="0,1" aria-label="bas">▼</button></div>`;
    cv = $('#sn-cv', stage); ctx = cv.getContext('2d');
    resize();
    snake = [[8, 10], [7, 10], [6, 10]]; dir = [1, 0]; queue = []; score = 0; step = L.step; acc = 0; credited = false;
    placeFood();
    state = 'play';
    $('#sn-pause', stage).onclick = togglePause;
    $$('.sn-pad button', stage).forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); const [x, y] = b.dataset.d.split(',').map(Number); turn(x, y); }));
    bindSwipe();
    sfx.click();
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    draw();
  }

  function resize() {
    if (!cv) return;
    const w = Math.min(520, Math.max(240, stage.clientWidth - 4));
    px = Math.floor(w / G);
    const dpr = window.devicePixelRatio || 1;
    cv.style.width = cv.style.height = px * G + 'px';
    cv.width = cv.height = Math.round(px * G * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function placeFood() {
    const occ = new Set(snake.map(([x, y]) => y * G + x));
    const free = [...Array(G * G).keys()].filter((i) => !occ.has(i));
    const i = free[Math.floor(Math.random() * free.length)];
    food = [i % G, Math.floor(i / G)];
  }

  function turn(x, y) {
    if (state === 'paused') togglePause();
    if (state !== 'play') return;
    const ref = queue.length ? queue[queue.length - 1] : dir;
    if ((x === -ref[0] && y === -ref[1]) || (x === ref[0] && y === ref[1])) return;
    if (queue.length < 2) queue.push([x, y]);
  }

  function togglePause() {
    if (state === 'play') { state = 'paused'; overlay('Pause', 'Espace ou un clic pour reprendre'); }
    else if (state === 'paused') { state = 'play'; $('#sn-over', stage).hidden = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    const b = $('#sn-pause', stage); if (b) b.textContent = state === 'paused' ? 'Reprendre' : 'Pause';
  }
  function overlay(t, sub) { const o = $('#sn-over', stage); if (!o) return; o.innerHTML = `<b>${t}</b><small>${sub}</small>`; o.hidden = false; o.onclick = () => state === 'paused' && togglePause(); }

  function tick() {
    const L = SNAKE_LEVELS[lv];
    if (queue.length) dir = queue.shift();
    let [x, y] = snake[0];
    x += dir[0]; y += dir[1];
    if (L.wrap) { x = (x + G) % G; y = (y + G) % G; }
    else if (x < 0 || y < 0 || x >= G || y >= G) return over();
    const eating = food && x === food[0] && y === food[1];
    const body = eating ? snake : snake.slice(0, -1);
    if (body.some(([a, b]) => a === x && b === y)) return over();
    snake.unshift([x, y]);
    if (eating) {
      score++;
      sfx.coin();
      if (L.accel) step = Math.max(50, step - 1.5);
      $('#sn-score', stage).textContent = score;
      if (snake.length >= G * G) return over(true);
      placeFood();
    } else snake.pop();
  }

  function loop(t) {
    if (!alive || state !== 'play') return;
    acc += t - last; last = t;
    if (acc > 500) acc = step; // retour d'onglet : pas de rafale de déplacements
    while (acc >= step && state === 'play') { acc -= step; tick(); }
    draw();
    if (state === 'play') raf = requestAnimationFrame(loop);
  }

  function draw() {
    if (!ctx) return;
    const W = px * G;
    ctx.fillStyle = '#0c1a12'; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#10241a';
    for (let y = 0; y < G; y++) for (let x = (y % 2); x < G; x += 2) ctx.fillRect(x * px, y * px, px, px);
    if (!SNAKE_LEVELS[lv].wrap) { ctx.strokeStyle = '#ff4d5e66'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, W - 2); }
    if (food) { // banane
      const cx = food[0] * px + px / 2, cy = food[1] * px + px / 2;
      ctx.save(); ctx.translate(cx, cy + px * 0.12); ctx.rotate(-0.35);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = px * 0.3;
      ctx.beginPath(); ctx.arc(0, -px * 0.42, px * 0.42, 0.22 * Math.PI, 0.78 * Math.PI); ctx.stroke();
      ctx.strokeStyle = '#6b4a1a'; ctx.lineWidth = px * 0.12;
      ctx.beginPath(); ctx.moveTo(px * 0.27, -px * 0.12); ctx.lineTo(px * 0.36, -px * 0.24); ctx.stroke();
      ctx.restore();
    }
    snake.forEach(([x, y], i) => {
      const k = 1 - i / Math.max(8, snake.length);
      ctx.fillStyle = i === 0 ? '#3ddc84' : `rgb(${Math.round(40 + 20 * k)}, ${Math.round(150 + 60 * k)}, ${Math.round(80 + 40 * k)})`;
      const pad = i === 0 ? 1 : 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x * px + pad, y * px + pad, px - pad * 2, px - pad * 2, px * 0.3) : ctx.rect(x * px + pad, y * px + pad, px - pad * 2, px - pad * 2); ctx.fill();
      if (i === 0) { // yeux
        ctx.fillStyle = '#0a100c';
        const ex = dir[1] !== 0 ? [0.3, 0.7] : [0.5, 0.5], ey = dir[0] !== 0 ? [0.3, 0.7] : [0.5, 0.5];
        const ox = dir[0] * 0.15, oy = dir[1] * 0.15;
        for (let k2 = 0; k2 < 2; k2++) { ctx.beginPath(); ctx.arc(x * px + (ex[k2] + ox) * px, y * px + (ey[k2] + oy) * px, px * 0.09, 0, 7); ctx.fill(); }
      }
    });
  }

  function reward() {
    if (credited) return { amount: 0, record: false };
    credited = true;
    const L = SNAKE_LEVELS[lv], s = wallet.stats, key = 'snakeBest' + lv;
    const record = score > (s[key] || 0);
    if (record) s[key] = score;
    const amount = score * L.per;
    wallet.freeReward('snake', amount, { Bananas: score }, score >= L.feed ? { feed: { txt: `a mangé ${score} bananes au`, tail: `(${L.name.toLowerCase()})` } } : null);
    return { amount, record };
  }

  function over(full = false) {
    state = 'over';
    cancelAnimationFrame(raf);
    draw();
    const { amount, record } = reward();
    sfx[score ? 'win' : 'lose'](false);
    if (amount >= 30) coinRain(15);
    setTimeout(() => {
      if (!alive) return;
      stage.insertAdjacentHTML('beforeend', endCardHTML({ win: record && score > 0, title: full ? 'Grille remplie, incroyable !' : `${score} banane${score > 1 ? 's' : ''}`, amount,
        text: `${record && score ? 'Nouveau record !' : `Record : ${wallet.stats['snakeBest' + lv] || 0}.`}`,
        extraBtn: '<button class="btn btn-ghost" data-modes>Changer de niveau</button>' }));
      $('[data-again]', stage).onclick = start;
      $('[data-modes]', stage).onclick = intro;
      $('.fg-end', stage).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 500);
  }

  function bindSwipe() {
    let s0 = null;
    cv.addEventListener('pointerdown', (e) => { s0 = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', (e) => {
      if (!s0) return;
      const dx = e.clientX - s0[0], dy = e.clientY - s0[1]; s0 = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (state === 'paused') togglePause(); return; }
      if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
    });
    cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], z: [0, -1], w: [0, -1], s: [0, 1], q: [-1, 0], a: [-1, 0], d: [1, 0] };
  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.closest('input,textarea')) return;
    const k = KEYS[e.key] || KEYS[e.key.toLowerCase()];
    if (k && (state === 'play' || state === 'paused')) { e.preventDefault(); turn(k[0], k[1]); return; }
    if (e.code === 'Space' && (state === 'play' || state === 'paused')) { e.preventDefault(); togglePause(); return; }
    if ((state === 'over' || state === 'intro') && e.key === 'Enter' && !e.target.closest('button')) start();
  };
  const onVis = () => { if (document.visibilityState === 'hidden' && state === 'play') togglePause(); };
  const onResize = () => resize();
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  intro();
  return () => {
    alive = false; cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize);
    if ((state === 'play' || state === 'paused') && score > 0) reward();
  };
}
