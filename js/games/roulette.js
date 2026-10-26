// Roulette Banane — roulette européenne (un seul zéro), roue animée sur canvas
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { h, $, $$, fmt, money, toast, sleep, coinRain, autoHTML, bindAuto, CUR, isTurbo, parseAmount } from '../ui.js';
import { sfx } from '../sfx.js';

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const CHIPS = [1, 5, 25, 100, 500, 1000, 5000, 25000]; // aucune mise max
const colorOf = (n) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
const TAU = Math.PI * 2;
const STEP = TAU / 37;

// Gain (mise incluse) par type de pari
function payoutFor(key, n) {
  const [t, v] = key.split(':');
  switch (t) {
    case 'n': return +v === n ? 36 : 0;
    case 'dz': return n >= (+v - 1) * 12 + 1 && n <= +v * 12 ? 3 : 0;
    case 'col': return n !== 0 && ((n - 1) % 3) + 1 === +v ? 3 : 0;
    case 'red': return n !== 0 && REDS.has(n) ? 2 : 0;
    case 'black': return n !== 0 && !REDS.has(n) ? 2 : 0;
    case 'odd': return n !== 0 && n % 2 === 1 ? 2 : 0;
    case 'even': return n !== 0 && n % 2 === 0 ? 2 : 0;
    case 'low': return n >= 1 && n <= 18 ? 2 : 0;
    case 'high': return n >= 19 ? 2 : 0;
  }
  return 0;
}
const BET_NAMES = { dz: (v) => `${v}${v === '1' ? 're' : 'e'} douzaine`, col: (v) => `Colonne ${v}`, red: () => 'Rouge', black: () => 'Noir', odd: () => 'Impair', even: () => 'Pair', low: () => '1-18', high: () => '19-36', n: (v) => `Plein ${v}` };

export function mount(view, { wallet }) {
  let alive = true;
  let spinning = false;
  let selChip = 5;
  let bets = {};        // clé -> montant
  let undo = [];        // historique des jetons posés
  let lastBets = null;
  let history = [];
  try { history = JSON.parse(localStorage.getItem('chibouk_rl_hist') || '[]'); } catch {}

  // Tapis : 3 rangées de 12 numéros (rangée du haut = 3,6,9…)
  let cells = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) {
    const n = 3 * (c + 1) - r;
    cells += `<button class="rl-spot num ${colorOf(n)}" data-k="n:${n}" style="grid-row:${r + 1};grid-column:${c + 2}"><span>${n}</span></button>`;
  }
  view.innerHTML = `
  <div class="rl-wrap">
    <div class="game-head"><h1>Roulette <span>Banane</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="rl-rules">${icon('scroll')}Paiements</button></div></div>
    <div class="rl-top">
      <div class="wheel-box">
        <canvas id="wheel" width="600" height="600"></canvas>
        <div class="rl-result"><b></b></div>
      </div>
      <div class="rl-side">
        <div class="rl-panel"><span class="lbl">Derniers numéros</span><div class="rl-history"></div></div>
        <div class="rl-panel"><span class="lbl">Mise totale</span><b class="rl-total"></b></div>
        <div class="rl-panel"><span class="lbl">Dernier gain</span><b class="rl-lastwin">—</b></div>
        <div class="rl-msg">Place tes jetons sur le tapis, puis lance la bille !</div>
      </div>
    </div>
    <div class="rl-board-scroll"><div class="rl-board">
      <button class="rl-spot zero green" data-k="n:0" style="grid-row:1 / span 3;grid-column:1"><span>0</span></button>
      ${cells}
      ${[1, 2, 3].map((v, i) => `<button class="rl-spot col" data-k="col:${3 - i}" style="grid-row:${i + 1};grid-column:14">2:1</button>`).join('')}
      ${[1, 2, 3].map((v) => `<button class="rl-spot out" data-k="dz:${v}" style="grid-row:4;grid-column:${2 + (v - 1) * 4} / span 4">${v}${v === 1 ? 're' : 'e'} 12</button>`).join('')}
      <button class="rl-spot out" data-k="low" style="grid-row:5;grid-column:2 / span 2">1-18</button>
      <button class="rl-spot out" data-k="even" style="grid-row:5;grid-column:4 / span 2">PAIR</button>
      <button class="rl-spot out red-bet" data-k="red" style="grid-row:5;grid-column:6 / span 2"><i class="diamond red"></i></button>
      <button class="rl-spot out black-bet" data-k="black" style="grid-row:5;grid-column:8 / span 2"><i class="diamond black"></i></button>
      <button class="rl-spot out" data-k="odd" style="grid-row:5;grid-column:10 / span 2">IMPAIR</button>
      <button class="rl-spot out" data-k="high" style="grid-row:5;grid-column:12 / span 2">19-36</button>
    </div></div>
    <div class="rl-controls">
      <div class="chip-row">${CHIPS.map((v) => `<button class="chip ${v === selChip ? 'sel' : ''}" data-v="${v}">${v >= 1000 ? v / 1000 + 'k' : v}</button>`).join('')}
        <label class="chip-custom" title="Montant libre : tape un montant, puis clique sur les cases du tapis"><input type="text" inputmode="numeric" class="bet-input" id="rl-custom" placeholder="Montant…" autocomplete="off"></label></div>
      <div class="bet-actions">
        <button class="btn btn-ghost" id="rl-undo">${icon('undo')}Annuler</button>
        <button class="btn btn-ghost" id="rl-clear">Effacer</button>
        <button class="btn btn-ghost" id="rl-rebet">Remiser</button>
        <button class="btn btn-ghost" id="rl-double">×2</button>
        <button class="btn btn-gold btn-lg" id="rl-spin">Lancer la bille</button>
      </div>
      ${autoHTML('rl-auto', 'Lancers automatiques', '<p class="ab-note">Relance la bille avec les jetons posés sur le tapis.</p>')}
      <p class="hint">Clic = poser un jeton · Clic droit (ou appui long) = retirer la mise d'une case</p>
    </div>
  </div>`;

  const canvas = $('#wheel', view);
  const g = canvas.getContext('2d');
  const total = () => Object.values(bets).reduce((a, b) => a + b, 0);

  /* ------------------------- rendu du tapis ------------------------- */
  function renderBets() {
    $$('.rl-spot', view).forEach((s) => {
      const amt = bets[s.dataset.k] || 0;
      let m = s.querySelector('.rl-chip');
      if (amt) {
        if (!m) { m = h('<div class="rl-chip"></div>'); s.append(m); }
        const top = [...CHIPS].reverse().find((v) => amt >= v) || 1;
        m.dataset.v = top;
        m.textContent = amt >= 1000 ? (amt / 1000).toFixed(amt % 1000 ? 1 : 0) + 'k' : amt;
      } else if (m) m.remove();
    });
    $('.rl-total', view).innerHTML = money(total());
    $('#rl-spin', view).disabled = spinning || !total();
    $('#rl-undo', view).disabled = spinning || !undo.length;
    $('#rl-clear', view).disabled = spinning || !total();
    $('#rl-rebet', view).disabled = spinning || !lastBets;
    $('#rl-double', view).disabled = spinning || !total();
  }
  function renderHistory() {
    $('.rl-history', view).innerHTML = history.slice(0, 14).map((n, i) => `<span class="hn ${colorOf(n)} ${i === 0 ? 'last' : ''}">${n}</span>`).join('') || '<span class="muted">—</span>';
  }

  function place(key, amount) {
    if (spinning) return;
    if (total() + amount > wallet.balance) { toast(`Solde insuffisant`, 'error'); return; }
    bets[key] = (bets[key] || 0) + amount;
    undo.push([key, amount]);
    sfx.chip();
    $$('.rl-spot.won, .rl-spot.hit', view).forEach((s) => s.classList.remove('won', 'hit'));
    renderBets();
  }
  $$('.rl-spot', view).forEach((s) => {
    s.onclick = () => place(s.dataset.k, selChip);
    s.oncontextmenu = (e) => { e.preventDefault(); if (spinning) return; delete bets[s.dataset.k]; undo = undo.filter(([k]) => k !== s.dataset.k); renderBets(); };
    let lp;
    s.addEventListener('touchstart', () => { lp = setTimeout(() => { if (!spinning) { delete bets[s.dataset.k]; undo = undo.filter(([k]) => k !== s.dataset.k); renderBets(); navigator.vibrate?.(30); } lp = 'done'; }, 550); }, { passive: true });
    s.addEventListener('touchend', (e) => { if (lp === 'done') e.preventDefault(); clearTimeout(lp); lp = null; });
    s.addEventListener('mouseenter', () => highlightCover(s.dataset.k, true));
    s.addEventListener('mouseleave', () => highlightCover(s.dataset.k, false));
  });
  function highlightCover(key, on) {
    if (key.startsWith('n:')) return;
    for (let n = 1; n <= 36; n++) if (payoutFor(key, n)) view.querySelector(`[data-k="n:${n}"]`)?.classList.toggle('cover', on);
  }
  $$('.chip-row .chip', view).forEach((c) => (c.onclick = () => {
    selChip = +c.dataset.v; sfx.click(); lastChip = selChip;
    $('#rl-custom', view).value = ''; $('.chip-custom', view).classList.remove('sel');
    $$('.chip-row .chip', view).forEach((x) => x.classList.toggle('sel', x === c));
  }));
  // Montant libre (V39) : tant qu'il est rempli, chaque clic sur le tapis pose ce montant
  let lastChip = selChip;
  const customIn = $('#rl-custom', view);
  customIn.oninput = () => {
    const v = parseAmount(customIn.value);
    selChip = v > 0 ? v : lastChip;
    $('.chip-custom', view).classList.toggle('sel', v > 0);
    $$('.chip-row .chip', view).forEach((x) => x.classList.toggle('sel', !(v > 0) && +x.dataset.v === selChip));
  };
  customIn.onkeydown = (e) => e.stopPropagation();
  $('#rl-undo', view).onclick = () => {
    const last = undo.pop(); if (!last) return;
    bets[last[0]] -= last[1]; if (bets[last[0]] <= 0) delete bets[last[0]];
    renderBets();
  };
  $('#rl-clear', view).onclick = () => { bets = {}; undo = []; renderBets(); };
  $('#rl-rebet', view).onclick = () => {
    if (!lastBets) return;
    const t = Object.values(lastBets).reduce((a, b) => a + b, 0);
    if (t > wallet.balance) { toast('Solde insuffisant pour remiser', 'error'); return; }
    bets = { ...lastBets }; undo = Object.entries(bets); sfx.chip(); renderBets();
  };
  $('#rl-double', view).onclick = () => {
    if (total() * 2 > wallet.balance) { toast('Solde insuffisant pour doubler', 'error'); return; }
    for (const k in bets) { undo.push([k, bets[k]]); bets[k] *= 2; }
    sfx.chip(); renderBets();
  };
  $('#rl-spin', view).onclick = () => spin();
  $('#rl-rules', view).onclick = () => import('../ui.js').then(({ modal }) => modal({ title: 'Paiements de la roulette', html: `
    <ul class="muted"><li><b>Plein</b> (un numéro) : 35 contre 1</li><li><b>Douzaine</b> ou <b>colonne</b> : 2 contre 1</li>
    <li><b>Rouge/Noir, Pair/Impair, 1-18/19-36</b> : 1 contre 1</li><li>Le <b>0</b> fait perdre toutes les mises extérieures.</li>
    <li>Roulette européenne à un zéro : avantage de la maison 2,7 %, comme au vrai casino.</li></ul>`, buttons: [{ label: 'OK', value: true, primary: true }] }));

  /* ------------------------- la roue ------------------------- */
  const S = 600, C = S / 2, R = 290;
  const wheelImg = document.createElement('canvas');
  wheelImg.width = wheelImg.height = S;
  (function drawWheel() {
    const w = wheelImg.getContext('2d');
    w.translate(C, C);
    // anneau des numéros + cases
    const rNumOut = R * 0.86, rNumIn = R * 0.72, rPocketIn = R * 0.58;
    for (let i = 0; i < 37; i++) {
      const a0 = i * STEP - STEP / 2 - Math.PI / 2, a1 = a0 + STEP;
      const n = ORDER[i];
      const col = n === 0 ? '#0a8a3a' : REDS.has(n) ? '#c8102e' : '#151515';
      w.beginPath(); w.arc(0, 0, rNumOut, a0, a1); w.arc(0, 0, rPocketIn, a1, a0, true); w.closePath();
      w.fillStyle = col; w.fill();
      // poches plus sombres
      w.beginPath(); w.arc(0, 0, rNumIn, a0, a1); w.arc(0, 0, rPocketIn, a1, a0, true); w.closePath();
      const pg = w.createRadialGradient(0, 0, rPocketIn, 0, 0, rNumIn);
      pg.addColorStop(0, 'rgba(0,0,0,.55)'); pg.addColorStop(1, 'rgba(0,0,0,.15)');
      w.fillStyle = pg; w.fill();
      // numéro
      w.save(); w.rotate(i * STEP); w.translate(0, -(rNumOut + rNumIn) / 2);
      w.fillStyle = '#fff'; w.font = '700 22px Rubik, sans-serif'; w.textAlign = 'center'; w.textBaseline = 'middle';
      w.fillText(String(n), 0, 1); w.restore();
    }
    // séparateurs dorés
    w.strokeStyle = '#e8b84a'; w.lineWidth = 2;
    for (let i = 0; i < 37; i++) {
      const a = i * STEP - STEP / 2 - Math.PI / 2;
      w.beginPath(); w.moveTo(Math.cos(a) * rPocketIn, Math.sin(a) * rPocketIn); w.lineTo(Math.cos(a) * rNumOut, Math.sin(a) * rNumOut); w.stroke();
    }
    [rNumOut, rNumIn, rPocketIn].forEach((r) => { w.beginPath(); w.arc(0, 0, r, 0, TAU); w.lineWidth = r === rNumIn ? 2 : 3; w.stroke(); });
    // cône central en bois
    const cone = w.createRadialGradient(-30, -30, 10, 0, 0, rPocketIn);
    cone.addColorStop(0, '#a8713a'); cone.addColorStop(.6, '#6b3e18'); cone.addColorStop(1, '#3a200a');
    w.beginPath(); w.arc(0, 0, rPocketIn - 2, 0, TAU); w.fillStyle = cone; w.fill();
    // rayons décoratifs
    w.strokeStyle = 'rgba(245,197,66,.35)'; w.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; w.beginPath(); w.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); w.lineTo(Math.cos(a) * (rPocketIn - 14), Math.sin(a) * (rPocketIn - 14)); w.stroke(); }
    // tourelle dorée (croix + banane)
    const gold = w.createRadialGradient(-10, -10, 2, 0, 0, 46);
    gold.addColorStop(0, '#fff3b0'); gold.addColorStop(.5, '#f5c542'); gold.addColorStop(1, '#8a5a00');
    w.fillStyle = gold;
    for (let i = 0; i < 4; i++) { w.save(); w.rotate(i * Math.PI / 2); w.beginPath(); w.roundRect(-7, -70, 14, 70, 7); w.fill(); w.beginPath(); w.arc(0, -70, 11, 0, TAU); w.fill(); w.restore(); }
    w.beginPath(); w.arc(0, 0, 30, 0, TAU); w.fill();
    // petite banane dorée au centre
    w.save(); w.rotate(-0.5); w.beginPath(); w.moveTo(-14, -9); w.bezierCurveTo(-15, 7, 2, 15, 15, 6); w.bezierCurveTo(16, 4, 15, 2, 13, 3);
    w.bezierCurveTo(2, 8, -7, 1, -8, -9); w.closePath(); w.fillStyle = '#ffe14a'; w.fill(); w.lineWidth = 2; w.strokeStyle = '#8a5a00'; w.stroke(); w.restore();
  })();

  // Bol extérieur fixe
  const bowl = document.createElement('canvas');
  bowl.width = bowl.height = S;
  (function drawBowl() {
    const b = bowl.getContext('2d');
    b.translate(C, C);
    const wood = b.createRadialGradient(0, 0, R * 0.85, 0, 0, R + 10);
    wood.addColorStop(0, '#2a1608'); wood.addColorStop(.5, '#7a4a20'); wood.addColorStop(.85, '#5a3214'); wood.addColorStop(1, '#2a1406');
    b.beginPath(); b.arc(0, 0, R + 8, 0, TAU); b.fillStyle = wood; b.fill();
    b.beginPath(); b.arc(0, 0, R * 0.98, 0, TAU); b.strokeStyle = '#e8b84a'; b.lineWidth = 3; b.stroke();
    // piste de la bille
    const track = b.createRadialGradient(0, 0, R * 0.86, 0, 0, R * 0.97);
    track.addColorStop(0, '#1a0e05'); track.addColorStop(1, '#4a2a10');
    b.beginPath(); b.arc(0, 0, R * 0.97, 0, TAU); b.arc(0, 0, R * 0.86, 0, TAU, true); b.fillStyle = track; b.fill();
    // losanges déflecteurs
    b.fillStyle = '#e8b84a';
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + TAU / 16;
      b.save(); b.rotate(a); b.translate(0, -R * 0.915); b.beginPath(); b.moveTo(0, -7); b.lineTo(4, 0); b.lineTo(0, 7); b.lineTo(-4, 0); b.closePath(); b.fill(); b.restore();
    }
  })();

  let wheelAngle = 0;
  let ball = { angle: -Math.PI / 2, r: R * 0.915, visible: false, lockedPocket: -1 };
  let anim = null;
  let lastT = performance.now();
  let raf;
  const IDLE = 0.25; // rad/s

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (anim) {
      const t = Math.min(1, (now - anim.start) / anim.dur);
      const ew = 1 - Math.pow(1 - t, 3);
      wheelAngle = anim.w0 + anim.W * ew + IDLE * (now - anim.start) / 1000;
      const LAND = 0.82;
      if (t < LAND) {
        const tb = t / LAND;
        const eb = 1 - Math.pow(1 - tb, 2.4);
        ball.angle = anim.b0 - anim.B * eb;
        // la bille descend de la piste vers les cases avec quelques rebonds
        const outR = R * 0.915, inR = R * 0.65;
        if (tb < 0.6) ball.r = outR;
        else {
          const k = (tb - 0.6) / 0.4;
          ball.r = outR - (outR - inR) * Math.min(1, k * 1.25) + Math.abs(Math.sin(k * 14)) * (1 - k) * R * 0.06;
          if (Math.random() < 0.15) sfx.ball();
        }
      } else {
        ball.angle = wheelAngle + anim.idx * STEP - Math.PI / 2;
        ball.r = R * 0.65;
      }
      if (t >= 1) { const done = anim.resolve; anim = null; ball.lockedPocket = ball.lockedPocket; done(); }
    } else {
      wheelAngle += IDLE * dt;
      if (ball.lockedPocket >= 0) ball.angle = wheelAngle + ball.lockedPocket * STEP - Math.PI / 2;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function draw() {
    g.clearRect(0, 0, S, S);
    g.drawImage(bowl, 0, 0);
    g.save(); g.translate(C, C); g.rotate(wheelAngle); g.drawImage(wheelImg, -C, -C); g.restore();
    // ombre douce
    if (ball.visible) {
      const x = C + Math.cos(ball.angle) * ball.r, y = C + Math.sin(ball.angle) * ball.r;
      g.beginPath(); g.arc(x + 3, y + 4, 9, 0, TAU); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill();
      const bg = g.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(.6, '#e6e6e6'); bg.addColorStop(1, '#9a9a9a');
      g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fillStyle = bg; g.fill();
    }
  }
  raf = requestAnimationFrame(frame);

  function animateTo(number, fast) {
    const idx = ORDER.indexOf(number);
    const dur = isTurbo('roulette') ? 1500 : fast ? 4200 : 6800;
    const w0 = wheelAngle;
    const W = TAU * (fast ? 1.6 : 2.6);
    const LAND = 0.82;
    // angle de la roue au moment où la bille se pose
    const wLand = w0 + W * (1 - Math.pow(1 - LAND, 3)) + IDLE * (dur * LAND) / 1000;
    const target = wLand + idx * STEP - Math.PI / 2;
    const b0 = ball.visible ? ball.angle : -Math.PI / 2 + Math.random() * TAU;
    let B = ((b0 - target) % TAU + TAU) % TAU + TAU * (fast ? 4 : 6);
    ball.visible = true; ball.lockedPocket = -1; ball.r = R * 0.915;
    return new Promise((resolve) => {
      anim = { start: performance.now(), dur, w0, W, b0, B, idx, resolve: () => { ball.lockedPocket = idx; resolve(); } };
    });
  }

  /* ------------------------- un lancer ------------------------- */
  async function spin() {
    if (spinning) return false;
    const t = total();
    if (!t) { toast('Pose au moins un jeton sur le tapis', 'error'); return false; }
    if (!wallet.bet('roulette', t)) { toast('Solde insuffisant', 'error'); return false; }
    spinning = true;
    lastBets = { ...bets };
    $$('.rl-spot.won, .rl-spot.hit', view).forEach((s) => s.classList.remove('won', 'hit'));
    $('.rl-result', view).classList.remove('show');
    renderBets();
    $('.rl-msg', view).textContent = 'Rien ne va plus…';
    sfx.spinStart();
    const n = randInt(37);
    // paiement calculé immédiatement (si on quitte la page, le gain est quand même crédité)
    let win = 0;
    for (const [k, a] of Object.entries(bets)) win += a * payoutFor(k, n);
    const reveal = wallet.deferEvents(() => {
      if (win > 0) wallet.win('roulette', win, t);
      wallet.round('roulette', win > t ? win : 0, { bet: t, number: n, spots: Object.keys(bets).length, straightWin: !!bets['n:' + n], zeroWin: n === 0 && !!bets['n:0'] });
    });

    await animateTo(n, autoOn);
    reveal();
    if (!alive) return true;
    history.unshift(n); history = history.slice(0, 30);
    try { localStorage.setItem('chibouk_rl_hist', JSON.stringify(history)); } catch {}
    renderHistory();
    const res = $('.rl-result', view);
    res.className = 'rl-result show ' + colorOf(n);
    res.querySelector('b').textContent = n;
    view.querySelector(`[data-k="n:${n}"]`)?.classList.add('hit');
    const winners = Object.keys(bets).filter((k) => payoutFor(k, n));
    winners.forEach((k) => view.querySelector(`[data-k="${k}"]`)?.classList.add('won'));
    const colName = n === 0 ? 'Vert' : REDS.has(n) ? 'Rouge' : 'Noir';
    const net = win - t;
    $('.rl-lastwin', view).innerHTML = win ? money(win) : '0';
    if (win > 0) {
      $('.rl-msg', view).innerHTML = `<b>${n} ${colName}</b> : tu remportes ${money(win)} ${net > 0 ? `(+${fmt(net)})` : ''}<br><small>${winners.map((k) => { const [a, b] = k.split(':'); return BET_NAMES[a](b); }).join(', ')}</small>`;
      sfx.win(win >= t * 10);
      if (win >= t * 10) coinRain(35);
    } else {
      $('.rl-msg', view).innerHTML = `<b>${n} ${colName}</b>… perdu cette fois`;
      sfx.lose();
    }
    spinning = false;
    // on laisse les jetons en place pour rejouer facilement, sauf si le solde ne suit plus
    if (total() > wallet.balance) { bets = {}; undo = []; }
    renderBets();
    return true;
  }

  let autoOn = false;
  const auto = bindAuto(view, 'rl-auto', { wallet, game: 'roulette', turbo: true, delay: 700,
    play: () => spin(),
    onState: (on) => { autoOn = on; view.classList.toggle('rl-autoing', on); } });
  renderBets();
  renderHistory();
  return () => { alive = false; auto.stop(); cancelAnimationFrame(raf); if (anim) { const done = anim.resolve; anim = null; done(); } };
}
