// Casse-briques de la dèche — accessible quand le solde est bas, chaque niveau terminé rapporte des Brundles
import { CONFIG } from '../config.js';
import { monkeySVG } from '../art.js';
import { h, $, fmt, money, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const W = 800, H = 560;
const COLS = 10, BW = 70, BH = 24, GAP = 6;
const OX = (W - (COLS * BW + (COLS - 1) * GAP)) / 2, OY = 64;

// 1 = 1 coup, 2 = 2 coups, 3 = 3 coups, . = vide
const LEVELS = [
  { name: 'La clairière', rows: ['1111111111', '1111111111', '1111111111', '1111111111', '1111111111'] },
  { name: 'Tête de singe', rows: ['..111111..', '.11111111.', '1122112211', '1122112211', '1111111111', '.11.11.11.', '..111111..'] },
  { name: 'Le régime de bananes', rows: ['2........2', '12......21', '112....211', '1112..2111', '1111221111', '.11111111.', '..111111..'] },
  { name: 'Le temple', rows: ['....33....', '...2222...', '..111111..', '.22222222.', '1111111111', '1.1.1.1.1.', '1111111111'] },
  { name: 'La cascade', rows: ['1.1.1.1.1.', '.2.2.2.2.2', '1.1.1.1.1.', '.2.2.2.2.2', '1.1.1.1.1.', '.3.3.3.3.3', '1111111111'] },
  { name: 'Le roi de la jungle', rows: ['3.3.33.3.3', '3333333333', '2222222222', '2112112112', '1111111111', '1111111111', '.11.11.11.', '2222222222'] },
];
const ROW_HUES = [0, 28, 48, 95, 160, 200, 260, 310];

export function mount(view, { wallet, navigate }) {
  let alive = true;
  let raf = null;
  let state = 'locked';
  const levelNum = () => wallet.get('breakerLevel') || 0;

  view.innerHTML = `
  <div class="bk-wrap">
    <div class="game-head"><h1>Casse-briques <span>de la dèche</span></h1>
      <div class="actions bk-hud"><span class="bk-level"></span><span class="bk-lives"></span><span class="bk-left"></span></div></div>
    <div class="bk-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="bk-overlay"></div>
    </div>
    <p class="hint">Souris, doigt ou flèches ← → pour bouger · clic, appui ou Espace pour lancer la noix de coco · bananes = raquette plus large</p>
  </div>`;
  const canvas = $('canvas', view);
  const g = canvas.getContext('2d');
  const overlay = $('.bk-overlay', view);

  // Décor de fond pré-rendu
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  (function () {
    const b = bg.getContext('2d');
    const grd = b.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#071a12'); grd.addColorStop(1, '#03080a');
    b.fillStyle = grd; b.fillRect(0, 0, W, H);
    b.fillStyle = 'rgba(40,110,60,.18)';
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % W, y = H - 40 - ((i * 53) % 160);
      b.beginPath(); b.ellipse(x, y, 60, 18, (i % 5) * 0.6, 0, Math.PI * 2); b.fill();
    }
    b.strokeStyle = 'rgba(60,140,70,.35)'; b.lineWidth = 4;
    for (let i = 0; i < 5; i++) { b.beginPath(); b.moveTo(60 + i * 170, 0); b.quadraticCurveTo(40 + i * 170, 60, 70 + i * 170, 110); b.stroke(); }
  })();

  let bricks = [], balls = [], particles = [], drops = [];
  let paddle = { x: W / 2, w: 120, y: H - 38, wideUntil: 0 };
  let lives = 3, speedMul = 1, keys = { left: false, right: false };
  let lastT = 0;
  let levelIdx = 0;

  function buildLevel() {
    const n = levelNum();
    levelIdx = n % LEVELS.length;
    speedMul = 1 + Math.floor(n / LEVELS.length) * 0.15 + levelIdx * 0.04;
    bricks = [];
    LEVELS[levelIdx].rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const hp = ch === '.' || ch === ' ' ? 0 : +ch;
      if (hp > 0) bricks.push({ x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), hp, max: hp, hue: ROW_HUES[r % ROW_HUES.length], flash: 0 });
    }));
    lives = 3; drops = []; particles = [];
    paddle.w = 120; paddle.wideUntil = 0; paddle.x = W / 2;
    resetBall();
    hud();
  }
  function resetBall() {
    balls = [{ x: paddle.x, y: paddle.y - 12, vx: 0, vy: 0, r: 9, stuck: true }];
  }
  function hud() {
    $('.bk-level', view).textContent = `Niveau ${levelNum() + 1} · ${LEVELS[levelIdx].name}`;
    $('.bk-lives', view).textContent = '🥥'.repeat(Math.max(0, lives));
    $('.bk-left', view).textContent = `${bricks.length} briques`;
  }

  function showOverlay(html) { overlay.innerHTML = html; overlay.classList.add('show'); }
  function hideOverlay() { overlay.classList.remove('show'); }

  function checkLock() {
    if (wallet.balance >= CONFIG.BREAKER_UNLOCK_BELOW) {
      state = 'locked';
      showOverlay(`<div class="bk-card">${monkeySVG({ wink: true })}<h2>Tu as encore des ${CUR} !</h2>
        <p>Le casse-briques s'ouvre quand ton solde passe sous <b>${fmt(CONFIG.BREAKER_UNLOCK_BELOW)} ${CUR}</b>.<br>Ton solde : ${money(wallet.balance)}</p>
        <button class="btn btn-gold" data-go="slots">Retourner jouer 🎰</button></div>`);
      overlay.querySelector('[data-go]').onclick = () => navigate('slots');
      return true;
    }
    return false;
  }

  function intro() {
    if (checkLock()) { drawFrame(); return; }
    buildLevel();
    state = 'ready';
    showOverlay(`<div class="bk-card">${monkeySVG({})}<h2>À sec ? Pas de panique.</h2>
      <p>Casse <b>toutes les briques</b> du niveau ${levelNum() + 1} pour gagner <b>${money(CONFIG.BREAKER_REWARD)}</b>.<br>3 noix de coco, pas de mise. Bonne chance !</p>
      <button class="btn btn-gold btn-lg" id="bk-go">Jouer</button></div>`);
    $('#bk-go', view).onclick = () => { hideOverlay(); state = 'serve'; sfx.click(); };
    drawFrame();
  }

  /* ---------------- contrôles ---------------- */
  function toLocal(clientX) {
    const r = canvas.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  }
  const onMove = (e) => { if (state === 'serve' || state === 'play') paddle.x = toLocal(e.clientX); };
  const onDown = (e) => { if (state === 'serve' || state === 'play') { paddle.x = toLocal(e.clientX); launch(); } };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.style.touchAction = 'none';
  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop')) return;
    const down = e.type === 'keydown';
    if (e.key === 'ArrowLeft') { keys.left = down; e.preventDefault(); }
    if (e.key === 'ArrowRight') { keys.right = down; e.preventDefault(); }
    if (down && e.code === 'Space' && (state === 'serve' || state === 'play')) { e.preventDefault(); launch(); }
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKey);

  function launch() {
    let any = false;
    for (const b of balls) if (b.stuck) {
      const sp = 6.2 * speedMul;
      const a = (Math.random() * 0.6 - 0.3);
      b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; b.stuck = false; any = true;
    }
    if (any) { state = 'play'; sfx.bounce(1.2); }
  }

  /* ---------------- physique ---------------- */
  function update(dt) {
    const k = dt * 60; // normalisé à 60 fps
    if (keys.left) paddle.x -= 11 * k;
    if (keys.right) paddle.x += 11 * k;
    const now = performance.now();
    const targetW = now < paddle.wideUntil ? 180 : 120;
    paddle.w += (targetW - paddle.w) * Math.min(1, 0.15 * k);
    paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));

    for (const b of balls) {
      if (b.stuck) { b.x = paddle.x; b.y = paddle.y - b.r - 2; continue; }
      const sp = Math.hypot(b.vx, b.vy);
      const steps = Math.ceil((sp * k) / 4);
      for (let s = 0; s < steps && !b.dead; s++) stepBall(b, k / steps);
    }
    balls = balls.filter((b) => !b.dead);
    if (state === 'play' && balls.length === 0) loseLife();

    for (const d of drops) {
      d.y += 3 * k; d.rot += 0.08 * k;
      if (d.y > paddle.y - 10 && d.y < paddle.y + 14 && Math.abs(d.x - paddle.x) < paddle.w / 2 + 12) {
        d.dead = true; paddle.wideUntil = performance.now() + 12000; sfx.coin();
      } else if (d.y > H + 20) d.dead = true;
    }
    drops = drops.filter((d) => !d.dead);
    for (const p of particles) { p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.25 * k; p.life -= 0.025 * k; }
    particles = particles.filter((p) => p.life > 0);
    for (const br of bricks) if (br.flash > 0) br.flash -= 0.1 * k;
  }

  function stepBall(b, k) {
    b.x += b.vx * k; b.y += b.vy * k;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); sfx.bounce(0.8); }
    if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); sfx.bounce(0.8); }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); sfx.bounce(0.8); }
    if (b.y > H + 30) { b.dead = true; return; }
    // raquette
    const ph = 16;
    if (b.vy > 0 && b.y + b.r >= paddle.y && b.y - b.r <= paddle.y + ph && b.x >= paddle.x - paddle.w / 2 - b.r && b.x <= paddle.x + paddle.w / 2 + b.r) {
      const rel = Math.max(-1, Math.min(1, (b.x - paddle.x) / (paddle.w / 2)));
      const ang = rel * (Math.PI / 3);
      const sp = Math.min(13, Math.hypot(b.vx, b.vy));
      b.vx = Math.sin(ang) * sp; b.vy = -Math.abs(Math.cos(ang) * sp);
      b.y = paddle.y - b.r - 0.5;
      sfx.bounce(1);
    }
    // briques
    for (const br of bricks) {
      if (br.hp <= 0) continue;
      const cx = Math.max(br.x, Math.min(b.x, br.x + BW));
      const cy = Math.max(br.y, Math.min(b.y, br.y + BH));
      const dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy <= b.r * b.r) {
        const overX = Math.min(b.x + b.r - br.x, br.x + BW - (b.x - b.r));
        const overY = Math.min(b.y + b.r - br.y, br.y + BH - (b.y - b.r));
        if (overX < overY) { b.vx = b.x < br.x + BW / 2 ? -Math.abs(b.vx) : Math.abs(b.vx); }
        else { b.vy = b.y < br.y + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy); }
        hitBrick(br);
        // légère accélération
        const sp = Math.hypot(b.vx, b.vy), max = 11.5 * speedMul;
        if (sp < max) { b.vx *= 1.012; b.vy *= 1.012; }
        break;
      }
    }
  }

  function hitBrick(br) {
    br.hp--; br.flash = 1;
    sfx.brick(1 + (br.max - br.hp) * 0.15);
    if (br.hp <= 0) {
      for (let i = 0; i < 14; i++) particles.push({ x: br.x + BW / 2, y: br.y + BH / 2, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.8) * 6, life: 1, hue: br.hue });
      if (Math.random() < 0.09) drops.push({ x: br.x + BW / 2, y: br.y + BH / 2, rot: 0 });
      bricks = bricks.filter((x) => x.hp > 0);
      hud();
      if (bricks.length === 0) winLevel();
    }
  }

  function loseLife() {
    lives--;
    hud();
    sfx.lose();
    if (lives <= 0) {
      state = 'over';
      showOverlay(`<div class="bk-card">${monkeySVG({})}<h2>Plus de noix de coco !</h2><p>Pas grave, le niveau est gratuit. On recommence ?</p>
        <button class="btn btn-gold btn-lg" id="bk-retry">Réessayer</button></div>`);
      $('#bk-retry', view).onclick = () => { if (checkLock()) return; buildLevel(); hideOverlay(); state = 'serve'; };
    } else { resetBall(); state = 'serve'; }
  }

  function winLevel() {
    state = 'won';
    wallet.breakerReward();
    sfx.win(true); coinRain(30);
    const stillBroke = wallet.balance < CONFIG.BREAKER_UNLOCK_BELOW;
    showOverlay(`<div class="bk-card">${monkeySVG({ crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' })}<h2>Niveau terminé !</h2>
      <p>+${money(CONFIG.BREAKER_REWARD)} ajoutés à ton solde.<br>Solde : ${money(wallet.balance)}</p>
      ${stillBroke ? `<button class="btn btn-gold btn-lg" id="bk-next">Niveau suivant</button>` : `<button class="btn btn-gold btn-lg" data-go="slots">Retour au casino 🎰</button> <button class="btn btn-ghost" data-go="blackjack">Blackjack 🃏</button>`}</div>`);
    overlay.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => navigate(b.dataset.go)));
    const nx = $('#bk-next', view);
    if (nx) nx.onclick = () => { buildLevel(); hideOverlay(); state = 'serve'; };
  }

  /* ---------------- rendu ---------------- */
  function roundRect(x, y, w, hh, r) { g.beginPath(); g.roundRect(x, y, w, hh, r); }
  function drawFrame() {
    g.drawImage(bg, 0, 0);
    for (const br of bricks) {
      const l = 52 - (br.max - br.hp) * 10 + br.flash * 25;
      const grd = g.createLinearGradient(0, br.y, 0, br.y + BH);
      grd.addColorStop(0, `hsl(${br.hue} 85% ${l + 14}%)`); grd.addColorStop(1, `hsl(${br.hue} 85% ${l - 8}%)`);
      roundRect(br.x, br.y, BW, BH, 5); g.fillStyle = grd; g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(br.x + 4, br.y + 3, BW - 8, 3);
      if (br.max > 1) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.font = '700 13px Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('●'.repeat(br.hp), br.x + BW / 2, br.y + BH / 2 + 1);
      }
    }
    for (const p of particles) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = `hsl(${p.hue} 90% 60%)`; g.fillRect(p.x - 3, p.y - 3, 6, 6); }
    g.globalAlpha = 1;
    for (const d of drops) { g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.font = '26px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🍌', 0, 0); g.restore(); }
    // raquette (planche de bois + liane)
    const px = paddle.x - paddle.w / 2, py = paddle.y;
    const wood = g.createLinearGradient(0, py, 0, py + 16);
    wood.addColorStop(0, '#c98a4a'); wood.addColorStop(1, '#6b3e18');
    roundRect(px, py, paddle.w, 16, 8); g.fillStyle = wood; g.fill();
    g.strokeStyle = '#3fae4b'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= paddle.w; x += 12) g.lineTo(px + x, py + 8 + Math.sin(x / 6) * 4);
    g.stroke();
    if (performance.now() < paddle.wideUntil) { g.shadowColor = '#ffd34d'; g.shadowBlur = 16; roundRect(px, py, paddle.w, 16, 8); g.strokeStyle = '#ffd34d'; g.lineWidth = 2; g.stroke(); g.shadowBlur = 0; }
    // noix de coco
    for (const b of balls) {
      const cg = g.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
      cg.addColorStop(0, '#a87046'); cg.addColorStop(1, '#4a2a12');
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fillStyle = cg; g.fill();
      g.fillStyle = '#1e0f05';
      [[-3, -2], [2, -3], [0, 2]].forEach(([dx, dy]) => { g.beginPath(); g.arc(b.x + dx, b.y + dy, 1.5, 0, Math.PI * 2); g.fill(); });
    }
    if (state === 'serve') {
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 18px Rubik, sans-serif'; g.textAlign = 'center';
      g.fillText('Clique ou appuie sur Espace pour lancer', W / 2, H / 2 + 60);
    }
  }

  function loop(t) {
    if (!alive) return;
    const dt = Math.min(0.033, lastT ? (t - lastT) / 1000 : 0.016);
    lastT = t;
    if (state === 'play' || state === 'serve') update(dt);
    else if (particles.length) update(dt);
    drawFrame();
    raf = requestAnimationFrame(loop);
  }

  intro();
  raf = requestAnimationFrame(loop);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keyup', onKey);
  };
}
