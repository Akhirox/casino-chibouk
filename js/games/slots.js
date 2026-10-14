// Machine à sous "Chibouk Slot" — 5 rouleaux, 3 rangées, 99 lignes connectées, SCATTER, WILD ×2, tours gratuits ×2
import { STRIPS, PAYTABLE, PAYLINES, LINE_COUNT, SYMBOLS, FREE_SPINS_AWARD, FREE_SPIN_MULT, SCATTER_PAY, spinGrid, evaluate, spinMultiple, randInt } from './slots-math.js';
import { symbolSVG, monkeySVG, goldMonkeySVG, icon } from '../art.js';
import { $, $$, fmt, money, modal, toast, countUp, coinRain, sleep, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

// Paliers des boutons − / + de la mise TOTALE (aucune limite : on peut taper n'importe quel montant ou cliquer MAX)
const MIN_BET = 10;
const STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
const SYM_ORDER = ['W', 'M', 'S', 'B', 'C', 'P', 'R', 'N', 'L', 'K'];
const lineColor = (i) => `hsl(${(i * 137.5 + 40) % 360} 90% 60%)`;
const cache = {};
const sym = (s) => (cache[s] ||= symbolSVG(s));
const multFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const mx = (m) => '×' + multFmt.format(m);
// Paliers de l'animation des gros gains (en × la mise totale)
const TIERS = [[100, 'GAIN ÉNORME !'], [50, 'MÉGA GAIN !'], [25, 'SUPER GAIN !'], [10, 'GROS GAIN !']];
const BIG_WIN_MIN = 10;

export function mount(view, { wallet }) {
  let curBet = 100;
  try {
    const v = Math.floor(+localStorage.getItem('chibouk_slot_total'));
    const old = Math.floor(+localStorage.getItem('chibouk_slot_bet')); // ancienne mise par ligne (21 lignes)
    if (v >= MIN_BET) curBet = v; else if (old >= 1) curBet = Math.max(MIN_BET, old * 21);
  } catch {}
  let spinning = false, turbo = false, autoLeft = 0, alive = true;
  let cycleTimer = null, skipBig = null;
  let grid = spinGrid().grid; // grille de départ décorative
  let fs = wallet.get('slotFS'); // { left, bet, won, total }
  if (fs && !fs.bet && fs.lineBet) fs = { ...fs, bet: fs.lineBet * 21 }; // tours gratuits gagnés avant la V8

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
        <div class="big-win"><div class="bw-rays"></div><div class="bw-title"></div><div class="bw-mult"></div><div class="bw-amount"></div><small class="bw-skip">Clique pour passer</small></div>
      </div>
      <div class="slot-info">
        <div class="win-display"><span>GAIN</span><b class="win-amt">0</b><small class="win-mult"></small></div>
        <div class="slot-msg">Bonne chance ! 3 SCATTER n'importe où = tours gratuits ×2</div>
      </div>
      <div class="slot-controls">
        <div class="bet-box">
          <div class="bet-label">Mise totale</div>
          <div class="bet-ctrl"><button class="btn btn-ghost btn-sm" id="bet-down">−</button><input id="line-bet" class="bet-input" type="number" min="${MIN_BET}" step="1" inputmode="numeric" aria-label="Mise totale"><button class="btn btn-ghost btn-sm" id="bet-up">+</button><button class="btn btn-ghost btn-sm max-btn" id="bet-max">MAX</button></div>
          <div class="bet-total">${LINE_COUNT} lignes · <b id="total-bet"></b> par spin</div>
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
  const winMult = $('.win-mult', view);
  const msg = $('.slot-msg', view);
  const spinBtn = $('#spin', view);
  const bigWin = $('.big-win', view);
  bigWin.onclick = () => skipBig && skipBig();

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
  const totalBet = () => (fs && fs.left > 0 ? fs.bet : curBet);
  function updateBet() {
    const inp = $('#line-bet', view);
    if (document.activeElement !== inp) inp.value = totalBet();
    $('#total-bet', view).innerHTML = money(totalBet());
    const locked = spinning || (fs && fs.left > 0) || autoLeft > 0;
    $('#bet-down', view).disabled = locked || curBet <= MIN_BET;
    $('#bet-up', view).disabled = locked;
    $('#bet-max', view).disabled = locked;
    inp.disabled = locked;
    spinBtn.disabled = (spinning && !autoLeft) || (fs && fs.left > 0);
    spinBtn.classList.toggle('stop', autoLeft > 0);
    spinBtn.querySelector('span').textContent = autoLeft > 0 ? 'STOP' : 'SPIN';
  }
  const setBet = (v) => { curBet = Math.max(MIN_BET, Math.floor(v) || MIN_BET); try { localStorage.setItem('chibouk_slot_total', curBet); } catch {} updateBet(); };
  $('#bet-down', view).onclick = () => { const prev = [...STEPS].reverse().find((x) => x < curBet); setBet(prev || Math.floor(curBet / 2)); sfx.click(); };
  $('#bet-up', view).onclick = () => { const next = STEPS.find((x) => x > curBet); setBet(next || curBet * 2); sfx.click(); };
  $('#bet-max', view).onclick = () => { setBet(Math.max(MIN_BET, Math.floor(wallet.balance))); sfx.click(); };
  $('#line-bet', view).onchange = (e) => setBet(+e.target.value);
  $('#line-bet', view).oninput = (e) => { const v = Math.floor(+e.target.value); if (v >= MIN_BET) { curBet = v; $('#total-bet', view).innerHTML = money(v); } };
  $('#turbo', view).onchange = (e) => { turbo = e.target.checked; };
  $('#to-auto', view).onclick = () => $('.slot-auto', view).scrollIntoView({ behavior: 'smooth', block: 'center' });
  spinBtn.onclick = () => {
    if (autoLeft > 0) { auto.stop(); autoLeft = 0; updateBet(); return; }
    if (!spinning) spin();
  };
  const onKey = (e) => {
    if (e.code === 'Space' && !e.target.closest('input,textarea,button') && !document.querySelector('.modal-backdrop')) {
      e.preventDefault();
      if (skipBig) { skipBig(); return; }
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
    const line = PAYLINES[win.line].slice(0, Math.max(win.count, 5));
    const pts = line.map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`).join(' ');
    const col = lineColor(win.line);
    const g = `<g class="wl"><polyline points="${pts}" stroke="#000" stroke-opacity=".5" stroke-width="9" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <polyline points="${pts}" stroke="${col}" stroke-width="5" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ${col})"/></g>`;
    if (only) svg.innerHTML = g; else svg.insertAdjacentHTML('beforeend', g);
  }
  // Affiche toutes les lignes, puis les fait défiler une par une (les plus grosses d'abord)
  function showWins(ev, bet, mult) {
    const items = [...ev.wins].sort((a, b) => b.pay - a.pay).map((w) => ({ kind: 'line', w }));
    if (ev.scatterPay) items.unshift({ kind: 'scatter' });
    if (!items.length) return;
    ev.wins.slice(0, 40).forEach((w) => drawLine(w));
    ev.wins.forEach((w) => w.cells.forEach(([r, row]) => cellEl(r, row)?.classList.add('win')));
    let i = -1;
    const step = () => {
      if (!alive) return;
      i = (i + 1) % items.length;
      const it = items[i];
      $$('.cell.win', view).forEach((c) => c.classList.remove('win'));
      if (it.kind === 'scatter') {
        svg.innerHTML = '';
        ev.scatterCells.forEach(([r, row]) => cellEl(r, row)?.classList.add('win'));
        msg.innerHTML = `${ev.scatters} × SCATTER = ${money(Math.round(ev.scatterPay * bet * mult))}${mult > 1 ? ' (×2)' : ''}`;
        return;
      }
      const w = it.w;
      w.cells.forEach(([r, row]) => cellEl(r, row)?.classList.add('win'));
      drawLine(w, true);
      const amt = (w.pay * bet * mult) / LINE_COUNT;
      msg.innerHTML = `<span class="line-tag" style="--lc:${lineColor(w.line)}">Ligne ${w.line + 1}</span> ${w.count} × ${SYMBOLS[w.symbol].short}${w.mult > 1 ? ` <b class="gold">WILD ×${w.mult}</b>` : ''} = ${money(amt < 10 ? Math.round(amt * 10) / 10 : Math.round(amt))}${mult > 1 ? ' (×2)' : ''}`;
    };
    cycleTimer = setInterval(step, 1500);
  }

  /* ---------- animation des rouleaux ---------- */
  function animateReels(newGrid) {
    const fillerBase = turbo ? 6 : 14;
    // Suspense : si 2 SCATTER sont déjà visibles, les rouleaux suivants ralentissent
    let scatSoFar = 0, extra = 0;
    const durations = [];
    for (let r = 0; r < 5; r++) {
      const antic = scatSoFar >= 2;
      if (antic) extra += turbo ? 500 : 1000;
      durations.push({ d: (turbo ? 420 : 950) + r * (turbo ? 110 : 260) + extra, antic });
      scatSoFar += newGrid[r].filter((s) => s === 'F').length;
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
      if (antic) setTimeout(() => reel.classList.add('anticipate', 'anticipate-scatter'), d - (turbo ? 500 : 1000));
      strip.style.transition = `transform ${d}ms cubic-bezier(.25,.1,.25,1.06)`;
      strip.style.transform = 'translateY(0)';
      setTimeout(() => strip.classList.remove('blur'), d * 0.8);
      setTimeout(() => {
        reel.classList.remove('anticipate', 'anticipate-scatter');
        sfx.reelStop(r);
        // on retire le surplus pour garder le DOM léger
        strip.style.transition = 'none';
        while (strip.children.length > 3) strip.lastElementChild.remove();
        resolve();
      }, d + 30);
    })));
  }

  /* ---------- un tour ---------- */
  async function spin() {
    if (spinning || !alive) return null;
    const isFree = !!(fs && fs.left > 0);
    const bet = totalBet();
    if (!isFree) {
      if (!wallet.bet('slots', bet)) {
        toast(wallet.balance < bet ? `Pas assez de ${CUR}. Baisse la mise${wallet.balance < 100 ? ' ou va au casse-briques' : ''}` : 'Mise impossible', 'error');
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
    winMult.textContent = '';
    msg.textContent = isFree ? `Tour gratuit… (${fs.left} restant${fs.left > 1 ? 's' : ''})` : 'Ça tourne…';
    sfx.spinStart();
    updateFsBanner();

    const { grid: g } = spinGrid();
    const ev = evaluate(g);
    // Le résultat est crédité tout de suite (même si le joueur quitte la page pendant l'animation)
    const mult = isFree ? FREE_SPIN_MULT : 1;
    const win = Math.round(spinMultiple(ev, mult) * bet);
    const ratio = win / bet;
    if (win > 0) wallet.win('slots', win, bet);
    if (!isFree) wallet.round('slots', win, { bet, wilds: ev.wilds, wildX: ev.wildX, scatters: ev.scatters, lineMult: Math.max(1, ...ev.wins.map((w) => w.mult)), bonus: !!ev.freeSpins, mult: ratio });
    if (isFree) fs.won += win;
    if (ev.freeSpins) {
      if (isFree) { fs.left += ev.freeSpins; fs.total += ev.freeSpins; }
      else { wallet.track('slots', 'bonuses'); fs = { left: ev.freeSpins, total: ev.freeSpins, bet, won: 0 }; }
    }
    if (fs) wallet.set('slotFS', fs.left > 0 ? { ...fs } : null);
    if (isFree && fs.left <= 0) wallet.set('slotFS', null);

    await animateReels(g);
    grid = g;
    if (!alive) return null;

    // Présentation
    if (win > 0) {
      showWins(ev, bet, mult);
      sfx.win(ratio >= BIG_WIN_MIN);
      const nLines = ev.wins.length;
      msg.innerHTML = `${nLines ? `${nLines} ligne${nLines > 1 ? 's' : ''} gagnante${nLines > 1 ? 's' : ''}` : ''}${nLines && ev.scatterPay ? ' + ' : ''}${ev.scatterPay ? `${ev.scatters} SCATTER` : ''} !${mult > 1 ? ' Gains ×2' : ''}`;
      winMult.textContent = mx(ratio);
      if (ratio >= BIG_WIN_MIN) { await bigWinShow(win, ratio); winAmt.innerHTML = fmt(win); }
      else await countUp(winAmt, win, { ms: Math.min(1500, 400 + ratio * 80) });
    } else if (!ev.freeSpins) {
      msg.textContent = isFree ? `Rien sur ce tour… ${fs.left} tour${fs.left > 1 ? 's' : ''} gratuit${fs.left > 1 ? 's' : ''} restant${fs.left > 1 ? 's' : ''}` : pick(['Raté ! Le singe se moque de toi', 'Pas cette fois…', 'Les bananes sont pas mûres', 'Encore un ?', 'La jungle est cruelle']);
    }

    let bonus = false;
    if (ev.freeSpins) {
      bonus = true;
      ev.scatterCells.forEach(([r, row]) => cellEl(r, row)?.classList.add('wild-hit'));
      sfx.bonus();
      if (isFree) {
        toast(`+${ev.freeSpins} tours gratuits !`, 'win');
      } else if (autoLeft) {
        toast(`BONUS DU TOTEM : ${ev.freeSpins} tours gratuits ×${FREE_SPIN_MULT} !`, 'win');
        await sleep(900);
      } else {
        await sleep(900);
        await modal({ title: 'BONUS DU TOTEM', html: `<div class="bonus-pop">${goldMonkeySVG('bonus-monkey')}<p><b>${ev.scatters} SCATTER</b> !</p><p class="big">${ev.freeSpins} TOURS GRATUITS</p><p>Tous les gains <b>×${FREE_SPIN_MULT}</b></p></div>`, buttons: [{ label: "C'est parti !", value: true, primary: true }], dismissable: false });
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
    const total = fs.won, bet = fs.bet;
    fs = null;
    wallet.set('slotFS', null);
    updateFsBanner(); updateBet();
    if (total > 0) { coinRain(Math.min(60, 15 + Math.round(total / bet))); sfx.win(true); }
    if (autoLeft) { toast(`Fin des tours gratuits : +${fmt(total)} ${CUR} (${mx(total / bet)})`, 'win'); return; }
    await modal({ title: 'Fin des tours gratuits', html: `<div class="bonus-pop">${monkeySVG({ wink: true, cls: 'bonus-monkey' })}<p>Total gagné pendant le bonus</p><p class="big">${money(total)}</p><p><b class="gold">${mx(total / bet)}</b> ta mise</p></div>`, buttons: [{ label: 'Super !', value: true, primary: true }] });
  }

  // Animation des gros gains : le multiplicateur et le gain montent ensemble, le titre change de palier en route
  function bigWinShow(win, ratio) {
    return new Promise((resolve) => {
      const titleEl = $('.bw-title', bigWin), multEl = $('.bw-mult', bigWin), amtEl = $('.bw-amount', bigWin);
      const ms = autoLeft ? 1400 : ratio >= 100 ? 5200 : ratio >= 50 ? 4200 : ratio >= 25 ? 3200 : 2200;
      let tier = 0, done = false, raf = null, rain = null;
      const setTier = (m) => {
        const t = TIERS.find(([min]) => m >= min);
        if (!t || t[0] === tier) return;
        tier = t[0];
        bigWin.className = `big-win show t-${tier}`;
        titleEl.textContent = t[1];
        titleEl.classList.remove('pop'); void titleEl.offsetWidth; titleEl.classList.add('pop');
        coinRain(tier >= 100 ? 80 : tier >= 50 ? 55 : tier >= 25 ? 40 : 25);
        sfx.win(true);
      };
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf); clearInterval(rain);
        setTier(ratio);
        multEl.textContent = mx(ratio);
        amtEl.innerHTML = money(win);
        skipBig = null;
        setTimeout(() => { bigWin.classList.remove('show'); resolve(); }, autoLeft ? 700 : 1500);
      };
      skipBig = finish;
      multEl.textContent = mx(0);
      amtEl.innerHTML = money(0);
      bigWin.className = 'big-win show';
      setTier(BIG_WIN_MIN);
      const start = performance.now();
      const stepF = (now) => {
        if (!alive) { done = true; resolve(); return; }
        const t = Math.min(1, (now - start) / ms);
        const e = 1 - Math.pow(1 - t, 2.2);
        const m = ratio * e;
        multEl.textContent = mx(m);
        amtEl.innerHTML = money(win * e);
        setTier(Math.max(BIG_WIN_MIN, m));
        if (t < 1) raf = requestAnimationFrame(stepF); else finish();
      };
      raf = requestAnimationFrame(stepF);
      rain = setInterval(() => coinRain(8), 700);
    });
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
    const bet = totalBet();
    const v = (p) => { const x = (p * bet) / LINE_COUNT; return x < 10 ? multFmt.format(Math.round(x * 10) / 10) : fmt(x); };
    const rows = SYM_ORDER.map((s) => `<div class="pt-row"><div class="pt-sym">${sym(s)}</div><div class="pt-name">${s === 'W' ? 'Ligne de WILD' : SYMBOLS[s].name}</div>
      ${PAYTABLE[s].map((p, i) => `<div class="pt-pay"><small>${i + 3}×</small>${v(p)}</div>`).join('')}</div>`).join('');
    const scat = `<div class="pt-row"><div class="pt-sym">${sym('F')}</div><div class="pt-name">SCATTER (n'importe où)</div>
      ${[3, 4, 5].map((k) => `<div class="pt-pay"><small>${k}×</small>${fmt(SCATTER_PAY[k] * bet)}</div>`).join('')}</div>`;
    const lines = PAYLINES.map((l, i) => `<div class="pl"><small>${i + 1}</small><div class="pl-grid">${[0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((reel) => `<i class="${l[reel] === row ? 'on' : ''}" style="--lc:${lineColor(i)}"></i>`).join('')).join('')}</div></div>`).join('');
    await modal({
      title: 'Table des gains', cls: 'wide', html: `
      <p class="muted">Gains en ${CUR} pour ta mise de <b>${money(bet)}</b> par spin, répartie sur les <b>${LINE_COUNT} lignes</b>. Les symboles doivent se suivre <b>depuis le rouleau de gauche</b> le long d'une ligne. Tous les gains des lignes s'additionnent.</p>
      <div class="pt">${scat}${rows}</div>
      <h3>Symboles spéciaux</h3>
      <ul class="muted">
        <li><b>SCATTER (Totem)</b> : paie n'importe où sur l'écran (×${SCATTER_PAY[3]}, ×${SCATTER_PAY[4]} ou ×${SCATTER_PAY[5]} la mise). <b>3, 4 ou 5 SCATTER</b> = <b>${FREE_SPINS_AWARD[3]}, ${FREE_SPINS_AWARD[4]} ou ${FREE_SPINS_AWARD[5]} tours gratuits</b>, tous les gains <b>×${FREE_SPIN_MULT}</b>. Re-déclenchable pendant le bonus !</li>
        <li><b>WILD (Roi Singe)</b> : remplace n'importe quel symbole sur les lignes, sauf le SCATTER.</li>
        <li><b>WILD ×2 (Roi Singe violet)</b>, plus rare, seulement sur les rouleaux 2, 3 et 4 : remplace aussi n'importe quel symbole et <b>double le gain de la ligne</b>.</li>
        <li>Taux de redistribution théorique (RTP) : <b>≈ 100 %</b> (calcul exact : 100,1 %).</li>
      </ul>
      <h3>Les ${LINE_COUNT} lignes</h3>
      <p class="muted">Toutes les lignes où chaque symbole touche le suivant : en face ou en diagonale, jamais 2 rangées d'écart.</p>
      <div class="paylines">${lines}</div>`,
      buttons: [{ label: 'Fermer', value: true, primary: true }],
    });
  }

  updateBet();
  updateFsBanner();
  if (fs && fs.left > 0) {
    setTimeout(async () => {
      await modal({ title: 'Tours gratuits en attente', html: `<p>Il te reste <b>${fs.left} tours gratuits ×${FREE_SPIN_MULT}</b> (mise ${money(fs.bet)}). On reprend !</p>`, buttons: [{ label: 'Reprendre', value: true, primary: true }], dismissable: false });
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
