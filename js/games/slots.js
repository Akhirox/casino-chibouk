// Machine à sous "Chibouk Slot" — 5 rouleaux, 3 rangées, 21 lignes, tours gratuits x2
import { STRIPS, PAYTABLE, PAYLINES, LINE_COUNT, SYMBOLS, FREE_SPINS_AWARD, FREE_SPIN_MULT, spinGrid, evaluate, randInt } from './slots-math.js';
import { symbolSVG, monkeySVG, goldMonkeySVG, icon } from '../art.js';
import { h, $, $$, fmt, money, modal, toast, countUp, coinRain, sleep, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

// Paliers des boutons − / + (aucune limite : on peut aussi taper n'importe quel montant ou cliquer MAX)
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
const SYM_ORDER = ['W', 'M', 'S', 'B', 'C', 'P', 'R', 'N', 'L', 'K'];
const lineColor = (i) => `hsl(${(i * 137.5 + 40) % 360} 90% 60%)`;
const cache = {};
const sym = (s) => (cache[s] ||= symbolSVG(s));

export function mount(view, { wallet }) {
  let curLineBet = 5;
  try { const v = Math.floor(+localStorage.getItem('chibouk_slot_bet')); if (v >= 1) curLineBet = v; } catch {}
  let spinning = false, turbo = false, autoLeft = 0, alive = true;
  let cycleTimer = null;
  let grid = spinGrid().grid; // grille de départ décorative
  let fs = wallet.get('slotFS'); // { left, lineBet, won, total }

  view.innerHTML = `
  <div class="slot-wrap">
    <div class="game-head"><h1>Chibouk <span>Slot</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="paytable">${icon('scroll')}Table des gains</button></div></div>
    <div class="slot-machine">
      <div class="slot-top">
        ${monkeySVG({ cls: 'st-monkey left' })}
        <div class="marquee"><div class="bulbs"></div><span>CHIBOUK SLOT</span></div>
        ${monkeySVG({ cls: 'st-monkey right', wink: true })}
      </div>
      <div class="fs-banner"><span class="fs-title">TOURS GRATUITS</span><span class="fs-count"></span><span class="fs-mult">×${FREE_SPIN_MULT}</span><span class="fs-won"></span></div>
      <div class="reels-frame">
        <div class="reels">${[0, 1, 2, 3, 4].map((r) => `<div class="reel" data-r="${r}"><div class="strip"></div></div>`).join('')}</div>
        <svg class="win-lines" viewBox="0 0 500 300" preserveAspectRatio="none"></svg>
        <div class="big-win"><div class="bw-title"></div><div class="bw-amount"></div></div>
      </div>
      <div class="slot-info">
        <div class="win-display"><span>GAIN</span><b class="win-amt">0</b></div>
        <div class="slot-msg">Bonne chance ! 3 WILD n'importe où = tours gratuits ×2</div>
      </div>
      <div class="slot-controls">
        <div class="bet-box">
          <div class="bet-label">Mise / ligne</div>
          <div class="bet-ctrl"><button class="btn btn-ghost btn-sm" id="bet-down">−</button><input id="line-bet" class="bet-input" type="number" min="1" step="1" inputmode="numeric" aria-label="Mise par ligne"><button class="btn btn-ghost btn-sm" id="bet-up">+</button><button class="btn btn-ghost btn-sm max-btn" id="bet-max">MAX</button></div>
          <div class="bet-total">${LINE_COUNT} lignes · Total <b id="total-bet"></b></div>
        </div>
        <button class="spin-btn" id="spin" title="Espace"><span>SPIN</span></button>
        <div class="auto-box">
          <div class="bet-label">Options</div>
          <label class="turbo"><input type="checkbox" id="turbo"> Turbo ${icon('bolt')}</label>
          <button class="btn btn-ghost btn-sm" id="to-auto">Auto ↓</button>
        </div>
      </div>
    </div>
    <div class="slot-auto">${autoHTML('sl-auto', 'Spins automatiques', '<p class="ab-note">Les tours gratuits se jouent tout seuls pendant l\'auto, puis l\'auto reprend.</p>')}</div>
  </div>`;

  const machine = $('.slot-machine', view);
  const reelsEl = $('.reels', view);
  const reels = $$('.reel', view);
  const svg = $('.win-lines', view);
  const winAmt = $('.win-amt', view);
  const msg = $('.slot-msg', view);
  const spinBtn = $('#spin', view);
  const bigWin = $('.big-win', view);

  // Ampoules du fronton
  $('.bulbs', view).innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="animation-delay:${(i % 2) * 0.4}s"></i>`).join('');

  /* ---------- taille des cases ---------- */
  let cell = 100;
  const ro = new ResizeObserver(() => {
    cell = reelsEl.clientHeight / 3;
    reelsEl.style.setProperty('--cell', cell + 'px');
  });
  ro.observe(reelsEl);

  function renderStatic() {
    reels.forEach((reel, r) => {
      const strip = $('.strip', reel);
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = grid[r].map((s, row) => `<div class="cell" data-row="${row}" data-s="${s}">${sym(s)}</div>`).join('');
    });
  }
  renderStatic();

  /* ---------- mises ---------- */
  const lineBet = () => (fs && fs.left > 0 ? fs.lineBet : curLineBet);
  const totalBet = () => lineBet() * LINE_COUNT;
  function updateBet() {
    const inp = $('#line-bet', view);
    if (document.activeElement !== inp) inp.value = lineBet();
    $('#total-bet', view).innerHTML = money(totalBet());
    const locked = spinning || (fs && fs.left > 0);
    $('#bet-down', view).disabled = locked || curLineBet <= 1;
    $('#bet-up', view).disabled = locked;
    $('#bet-max', view).disabled = locked;
    inp.disabled = locked;
    spinBtn.disabled = (spinning && !autoLeft) || (fs && fs.left > 0);
    spinBtn.classList.toggle('stop', autoLeft > 0);
    spinBtn.querySelector('span').textContent = autoLeft > 0 ? 'STOP' : 'SPIN';
    if (autoLeft) { $('#bet-down', view).disabled = $('#bet-up', view).disabled = $('#bet-max', view).disabled = inp.disabled = true; }
  }
  const setLineBet = (v) => { curLineBet = Math.max(1, Math.floor(v) || 1); try { localStorage.setItem('chibouk_slot_bet', curLineBet); } catch {} updateBet(); };
  $('#bet-down', view).onclick = () => { const prev = [...STEPS].reverse().find((x) => x < curLineBet); setLineBet(prev || Math.max(1, Math.floor(curLineBet / 2))); sfx.click(); };
  $('#bet-up', view).onclick = () => { const next = STEPS.find((x) => x > curLineBet); setLineBet(next || curLineBet * 2); sfx.click(); };
  $('#bet-max', view).onclick = () => { setLineBet(Math.max(1, Math.floor(wallet.balance / LINE_COUNT))); sfx.click(); };
  $('#line-bet', view).onchange = (e) => setLineBet(+e.target.value);
  $('#line-bet', view).oninput = (e) => { const v = Math.floor(+e.target.value); if (v >= 1) { curLineBet = v; $('#total-bet', view).innerHTML = money(v * LINE_COUNT); } };
  $('#turbo', view).onchange = (e) => { turbo = e.target.checked; };
  $('#to-auto', view).onclick = () => $('.slot-auto', view).scrollIntoView({ behavior: 'smooth', block: 'center' });
  spinBtn.onclick = () => {
    if (autoLeft > 0) { auto.stop(); autoLeft = 0; updateBet(); return; }
    if (!spinning) spin();
  };
  const onKey = (e) => {
    if (e.code === 'Space' && !e.target.closest('input,textarea,button') && !document.querySelector('.modal-backdrop')) {
      e.preventDefault();
      if (!spinning && !(fs && fs.left > 0)) spin();
    }
  };
  document.addEventListener('keydown', onKey);
  $('#paytable', view).onclick = showPaytable;

  const auto = bindAuto(view, 'sl-auto', { wallet, game: 'slots', delay: 50,
    play: async () => {
      // tours gratuits en cours : on attend qu'ils se terminent
      while (alive && (spinning || (fs && fs.left > 0))) await sleep(200);
      if (!alive) return false;
      if (!wallet.canAfford(totalBet())) { toast(`Solde insuffisant pour continuer l'auto`, 'error'); return false; }
      const res = await spin(true);
      if (!res) return false;
      while (alive && (spinning || (fs && fs.left > 0))) await sleep(200);
      await sleep(res.win > 0 ? (turbo ? 600 : 1100) : (turbo ? 120 : 300));
      return alive;
    },
    onState: (on) => { autoLeft = on ? 1 : 0; if (alive) updateBet(); } });

  /* ---------- lignes gagnantes ---------- */
  function clearWins() {
    clearInterval(cycleTimer); cycleTimer = null;
    svg.innerHTML = '';
    $$('.cell.win, .cell.wild-hit', view).forEach((c) => c.classList.remove('win', 'wild-hit'));
    bigWin.classList.remove('show');
  }
  function cellEl(reel, row) { return reels[reel].querySelector(`.cell[data-row="${row}"]`); }
  function drawLine(win, only = false) {
    const pts = PAYLINES[win.line].map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`).join(' ');
    const col = lineColor(win.line);
    const g = `<g class="wl"><polyline points="${pts}" stroke="#000" stroke-opacity=".5" stroke-width="9" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <polyline points="${pts}" stroke="${col}" stroke-width="5" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ${col})"/></g>`;
    if (only) svg.innerHTML = g; else svg.insertAdjacentHTML('beforeend', g);
  }
  function showWins(ev, mult) {
    if (!ev.wins.length) return;
    ev.wins.forEach((w) => { drawLine(w); w.cells.forEach(([r, row]) => cellEl(r, row)?.classList.add('win')); });
    let i = -1;
    cycleTimer = setInterval(() => {
      if (!alive) return;
      i = (i + 1) % ev.wins.length;
      const w = ev.wins[i];
      $$('.cell.win', view).forEach((c) => c.classList.remove('win'));
      w.cells.forEach(([r, row]) => cellEl(r, row)?.classList.add('win'));
      drawLine(w, true);
      msg.innerHTML = `<span class="line-tag" style="--lc:${lineColor(w.line)}">Ligne ${w.line + 1}</span> ${w.count} × ${SYMBOLS[w.symbol].short} = ${money(w.pay * lineBet() * mult)}${mult > 1 ? ' (×2)' : ''}`;
    }, 1600);
  }

  /* ---------- animation des rouleaux ---------- */
  function animateReels(newGrid) {
    const fillerBase = turbo ? 6 : 14;
    // Suspense : si 2 WILD sont déjà visibles, les rouleaux suivants ralentissent
    let wildsSoFar = 0, extra = 0;
    const durations = [];
    for (let r = 0; r < 5; r++) {
      const antic = wildsSoFar >= 2;
      if (antic) extra += turbo ? 500 : 1000;
      durations.push({ d: (turbo ? 420 : 950) + r * (turbo ? 110 : 260) + extra, antic });
      wildsSoFar += newGrid[r].filter((s) => s === 'W').length;
    }
    return Promise.all(reels.map((reel, r) => new Promise((resolve) => {
      const strip = $('.strip', reel);
      const old = grid[r];
      const n = fillerBase + r * (turbo ? 2 : 5) + Math.round(durations[r].d / 120);
      const fill = Array.from({ length: n }, () => STRIPS[r][randInt(STRIPS[r].length)]);
      const all = [...newGrid[r], ...fill, ...old];
      strip.style.transition = 'none';
      strip.innerHTML = all.map((s, i) => `<div class="cell" ${i < 3 ? `data-row="${i}"` : ''} data-s="${s}">${sym(s)}</div>`).join('');
      const startY = -(all.length - 3) * cell;
      strip.style.transform = `translateY(${startY}px)`;
      strip.classList.add('blur');
      void strip.offsetHeight;
      const { d, antic } = durations[r];
      if (antic) setTimeout(() => reel.classList.add('anticipate'), d - (turbo ? 500 : 1000));
      strip.style.transition = `transform ${d}ms cubic-bezier(.25,.1,.25,1.06)`;
      strip.style.transform = 'translateY(0)';
      setTimeout(() => strip.classList.remove('blur'), d * 0.8);
      setTimeout(() => {
        reel.classList.remove('anticipate');
        sfx.reelStop(r);
        // on retire le surplus pour garder le DOM léger
        strip.style.transition = 'none';
        while (strip.children.length > 3) strip.lastElementChild.remove();
        resolve();
      }, d + 30);
    })));
  }

  /* ---------- un tour ---------- */
  async function spin(fromAuto = false) {
    if (spinning || !alive) return null;
    const isFree = !!(fs && fs.left > 0);
    const lb = lineBet();
    if (!isFree) {
      if (!wallet.bet('slots', lb * LINE_COUNT)) {
        toast(wallet.balance < lb * LINE_COUNT ? `Pas assez de ${CUR}. Baisse la mise${wallet.balance < 100 ? ' ou va au casse-briques' : ''}` : 'Mise impossible', 'error');
        return null;
      }
    } else {
      fs.left--;
      wallet.set('slotFS', { ...fs });
    }
    spinning = true;
    updateBet();
    clearWins();
    winAmt.textContent = '0';
    msg.textContent = isFree ? `Tour gratuit… (${fs.left} restant${fs.left > 1 ? 's' : ''})` : 'Ça tourne…';
    sfx.spinStart();
    updateFsBanner();

    const { grid: g } = spinGrid();
    const ev = evaluate(g);
    // Le résultat est crédité tout de suite (même si le joueur quitte la page pendant l'animation)
    const mult = isFree ? FREE_SPIN_MULT : 1;
    const win = ev.total * lb * mult;
    if (win > 0) wallet.win('slots', win, lb * LINE_COUNT);
    if (!isFree) wallet.round('slots', win, { bet: lb * LINE_COUNT, wilds: ev.wilds, bonus: !!ev.freeSpins, mult: win / (lb * LINE_COUNT) });
    if (isFree) fs.won += win;
    if (ev.freeSpins) {
      if (isFree) { fs.left += ev.freeSpins; fs.total += ev.freeSpins; }
      else { wallet.track('slots', 'bonuses'); fs = { left: ev.freeSpins, total: ev.freeSpins, lineBet: lb, won: 0 }; }
    }
    if (fs) wallet.set('slotFS', fs.left > 0 ? { ...fs } : null);
    if (isFree && fs.left <= 0) wallet.set('slotFS', null);

    await animateReels(g);
    grid = g;
    if (!alive) return null;

    // Présentation
    if (win > 0) {
      showWins(ev, mult);
      const ratio = win / (lb * LINE_COUNT);
      sfx.win(ratio >= 10);
      msg.innerHTML = `${ev.wins.length} ligne${ev.wins.length > 1 ? 's' : ''} gagnante${ev.wins.length > 1 ? 's' : ''} !${mult > 1 ? ' Gains ×2' : ''}`;
      const p = countUp(winAmt, win, { ms: Math.min(2500, 400 + ratio * 60) });
      if (ratio >= 15) await bigWinShow(win, ratio);
      await p;
    } else if (!ev.freeSpins) {
      msg.textContent = isFree ? `Rien sur ce tour… ${fs.left} tour${fs.left > 1 ? 's' : ''} gratuit${fs.left > 1 ? 's' : ''} restant${fs.left > 1 ? 's' : ''}` : pick(['Raté ! Le singe se moque de toi', 'Pas cette fois…', 'Les bananes sont pas mûres', 'Encore un ?', 'La jungle est cruelle']);
    }

    let bonus = false;
    if (ev.freeSpins) {
      bonus = true;
      ev.wildCells.forEach(([r, row]) => cellEl(r, row)?.classList.add('wild-hit'));
      sfx.bonus();
      if (isFree) {
        toast(`+${ev.freeSpins} tours gratuits !`, 'win');
      } else if (autoLeft) {
        toast(`BONUS DU ROI SINGE : ${ev.freeSpins} tours gratuits ×${FREE_SPIN_MULT} !`, 'win');
        await sleep(900);
      } else {
        await sleep(900);
        await modal({ title: 'BONUS DU ROI SINGE', html: `<div class="bonus-pop">${goldMonkeySVG('bonus-monkey')}<p><b>${ev.wilds} WILD</b> !</p><p class="big">${ev.freeSpins} TOURS GRATUITS</p><p>Tous les gains <b>×${FREE_SPIN_MULT}</b></p></div>`, buttons: [{ label: "C'est parti !", value: true, primary: true }], dismissable: false });
      }
    }
    spinning = false;
    updateFsBanner();
    updateBet();
    if (fs && fs.left > 0 && alive && (isFree || bonus)) {
      await sleep(win > 0 ? 1200 : 500);
      if (alive) spin();
    } else if (isFree && fs && fs.left <= 0) {
      await endFreeSpins();
    }
    return { win, bonus };
  }

  async function endFreeSpins() {
    const total = fs.won;
    fs = null;
    wallet.set('slotFS', null);
    updateFsBanner(); updateBet();
    if (total > 0) { coinRain(Math.min(60, 15 + Math.round(total / 50))); sfx.win(true); }
    if (autoLeft) { toast(`Fin des tours gratuits : +${fmt(total)} ${CUR}`, 'win'); return; }
    await modal({ title: 'Fin des tours gratuits', html: `<div class="bonus-pop">${monkeySVG({ wink: true, cls: 'bonus-monkey' })}<p>Total gagné pendant le bonus</p><p class="big">${money(total)}</p></div>`, buttons: [{ label: 'Super !', value: true, primary: true }] });
  }

  async function bigWinShow(win, ratio) {
    bigWin.querySelector('.bw-title').textContent = ratio >= 50 ? 'MÉGA GAIN !' : ratio >= 30 ? 'SUPER GAIN !' : 'GROS GAIN !';
    bigWin.classList.add('show');
    coinRain(ratio >= 50 ? 70 : 35);
    await countUp(bigWin.querySelector('.bw-amount'), win, { ms: 1800 });
    await sleep(900);
    bigWin.classList.remove('show');
  }

  function updateFsBanner() {
    const on = !!(fs && (fs.left > 0 || spinning));
    machine.classList.toggle('fs-mode', on);
    if (on) {
      $('.fs-count', view).textContent = `${fs.left} restant${fs.left > 1 ? 's' : ''}`;
      $('.fs-won', view).innerHTML = `Gains bonus : ${money(fs.won)}`;
    }
  }

  async function showPaytable() {
    const lb = lineBet();
    const rows = SYM_ORDER.map((s) => `<div class="pt-row"><div class="pt-sym">${sym(s)}</div><div class="pt-name">${SYMBOLS[s].name}</div>
      ${PAYTABLE[s].map((p, i) => `<div class="pt-pay"><small>${i + 3}×</small>${fmt(p * lb)}</div>`).join('')}</div>`).join('');
    const lines = PAYLINES.map((l, i) => `<div class="pl"><small>${i + 1}</small><div class="pl-grid">${[0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((reel) => `<i class="${l[reel] === row ? 'on' : ''}" style="--lc:${lineColor(i)}"></i>`).join('')).join('')}</div></div>`).join('');
    await modal({
      title: 'Table des gains', cls: 'wide', html: `
      <p class="muted">Gains pour ta mise actuelle de <b>${money(lb)}</b> par ligne (${money(lb * LINE_COUNT)} au total). Les symboles doivent être alignés <b>depuis le rouleau de gauche</b> sur une ligne.</p>
      <div class="pt">${rows}</div>
      <h3>Le Roi Singe (WILD)</h3>
      <ul class="muted"><li>Remplace n'importe quel symbole sur les lignes.</li>
      <li><b>3, 4 ou 5 WILD n'importe où</b> = <b>${FREE_SPINS_AWARD[3]}, ${FREE_SPINS_AWARD[4]} ou ${FREE_SPINS_AWARD[5]} tours gratuits</b>, tous les gains <b>×${FREE_SPIN_MULT}</b>. Re-déclenchable pendant le bonus !</li>
      <li>Taux de redistribution théorique (RTP) : <b>≈ 100 %</b>, simulé sur 20 millions de tours : ni le casino ni les joueurs n'ont l'avantage.</li></ul>
      <h3>Les ${LINE_COUNT} lignes</h3><div class="paylines">${lines}</div>`,
      buttons: [{ label: 'Fermer', value: true, primary: true }],
    });
  }

  updateBet();
  updateFsBanner();
  if (fs && fs.left > 0) {
    setTimeout(async () => {
      await modal({ title: 'Tours gratuits en attente', html: `<p>Il te reste <b>${fs.left} tours gratuits ×${FREE_SPIN_MULT}</b> (mise ${money(fs.lineBet)}/ligne). On reprend !</p>`, buttons: [{ label: 'Reprendre', value: true, primary: true }], dismissable: false });
      if (alive) spin();
    }, 300);
  }

  return () => {
    alive = false;
    autoLeft = 0;
    auto.stop();
    clearInterval(cycleTimer);
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
  };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
