// Blackjack du Singe — 6 jeux, croupier reste sur 17 (soft 17 inclus), blackjack paie 3:2
// Doubler sur 2 cartes, séparer jusqu'à 4 mains (As séparés : une carte chacun)
import { randInt } from './slots-math.js';
import { monkeySVG, icon } from '../art.js';
import { h, $, $$, fmt, money, toast, sleep, coinRain, autoHTML, bindAuto, CUR , isTurbo, parseAmount } from '../ui.js';
import { sfx } from '../sfx.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CHIPS = [5, 25, 100, 500, 1000, 5000, 25000]; // aucune mise max : on empile les jetons ou on fait tapis
const DECKS = 6;

// Mises annexes (side bets) — paiements "x contre 1", RTP calculés exactement pour un sabot de 6 jeux
export const SIDE_PP = { perfect: { name: 'Paire parfaite', pay: 25 }, colored: { name: 'Paire de couleur', pay: 15 }, mixed: { name: 'Paire mixte', pay: 6 } }; // RTP ≈ 99,7 %
export const SIDE_T3 = { suitedTrips: { name: 'Brelan couleur', pay: 100 }, straightFlush: { name: 'Quinte flush', pay: 45 }, trips: { name: 'Brelan', pay: 30 }, straight: { name: 'Suite', pay: 11 }, flush: { name: 'Couleur', pay: 5 } }; // RTP ≈ 99,5 %
const isRed = (c) => c.s === '♥' || c.s === '♦';
const RANK_IDX = (c) => RANKS.indexOf(c.r);
export function perfectPairs(a, b) {
  if (a.r !== b.r) return null;
  if (a.s === b.s) return 'perfect';
  return isRed(a) === isRed(b) ? 'colored' : 'mixed';
}
export function twentyOneThree(cards) {
  const rs = cards.map(RANK_IDX).sort((x, y) => x - y);
  const flush = cards.every((c) => c.s === cards[0].s);
  const trips = rs[0] === rs[2];
  const distinct = new Set(rs).size === 3;
  const straight = distinct && (rs[2] - rs[0] === 2 || (rs[0] === 0 && rs[1] === 11 && rs[2] === 12));
  if (trips && flush) return 'suitedTrips';
  if (straight && flush) return 'straightFlush';
  if (trips) return 'trips';
  if (straight) return 'straight';
  if (flush) return 'flush';
  return null;
}

const cardValue = (c) => (c.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r);
function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += cardValue(c); if (c.r === 'A') aces++; }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const isBJ = (cards) => cards.length === 2 && handValue(cards).total === 21;

function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const s of SUITS) for (const r of RANKS) shoe.push({ r, s });
  for (let i = shoe.length - 1; i > 0; i--) { const j = randInt(i + 1); [shoe[i], shoe[j]] = [shoe[j], shoe[i]]; }
  return shoe;
}

function faceHTML(c) {
  const red = c.s === '♥' || c.s === '♦';
  let center;
  if (c.r === 'K') center = `<div class="court">${monkeySVG({ crown: true, fur: red ? '#8a3a2a' : '#5a3a22' })}</div>`;
  else if (c.r === 'Q') center = `<div class="court">${monkeySVG({ flower: true, fur: red ? '#a0522d' : '#6b4a2a' })}</div>`;
  else if (c.r === 'J') center = `<div class="court">${monkeySVG({ cap: true, fur: red ? '#8a4a2a' : '#4e3420' })}</div>`;
  else if (c.r === 'A') center = `<div class="ace">${c.s}</div>`;
  else center = `<div class="pips n${c.r}">${Array.from({ length: +c.r }, () => `<i>${c.s}</i>`).join('')}</div>`;
  return `<div class="face front ${red ? 'red' : ''}">
    <div class="corner tl"><b>${c.r}</b><span>${c.s}</span></div>${center}<div class="corner br"><b>${c.r}</b><span>${c.s}</span></div></div>`;
}
const backHTML = () => `<div class="face back"><div class="back-inner">${monkeySVG({ fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' })}</div></div>`;

export function mount(view, { wallet }) {
  // Turbo : toutes les animations et pauses du blackjack ~5 fois plus courtes (interrupteur dans « Mains automatiques »)
  const T = (ms) => (isTurbo('blackjack') ? Math.round(ms * 0.2) : ms);
  let shoe = newShoe();
  let cut = Math.floor(shoe.length * 0.25);
  let alive = true;
  let phase = 'bet'; // bet | deal | play | dealer | done
  let bet = 0, lastBet = 0;
  let selChip = 25, custom = 0; // custom : montant tapé au clavier (0 = jetons)
  let autoOn = false;
  let dealer = [];
  let hands = []; // { cards, bet, done, doubled, splitAces, el, result }
  let active = 0;
  let holeEl = null;
  let settled = true; // la main en cours a-t-elle déjà été payée ?
  let side = { pp: 0, t3: 0 };            // mises annexes choisies
  let sideRound = { stake: 0, pay: 0 };  // mises annexes de la main en cours
  let lastSide = { pp: 0, t3: 0 };
  try { const sb = JSON.parse(localStorage.getItem('chibouk_bj_side') || '{}'); side.pp = Math.max(0, sb.pp | 0); side.t3 = Math.max(0, sb.t3 | 0); } catch {}

  try { lastBet = +localStorage.getItem('chibouk_bj_bet') || 0; } catch {}

  view.innerHTML = `
  <div class="bj-wrap">
    <div class="game-head"><h1>Blackjack <span>du Singe</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="bj-rules">${icon('scroll')}Règles</button></div></div>
    <div class="bj-table">
      <div class="shoe"><div class="shoe-cards"></div><span>SABOT</span></div>
      <div class="discard"></div>
      <div class="dealer-zone">
        <div class="hand-label">Croupier <span class="total" id="dealer-total"></span></div>
        <div class="hand dealer-hand" id="dealer-hand"></div>
      </div>
      <div class="felt-text"><span>BLACKJACK PAIE 3 CONTRE 2</span><small>Le croupier tire jusqu'à 16 et reste sur tous les 17</small></div>
      <div class="table-monkey">${monkeySVG({ wink: true })}</div>
      <div class="player-zone"><div class="hands" id="player-hands"></div></div>
      <div class="bet-spot" id="bet-spot" data-spot="main" title="Clique pour poser le jeton sélectionné"><div class="bet-stack"></div><div class="bet-amt"></div><button class="spot-x" data-x="main" title="Retirer">×</button></div>
      <div class="side-spots">
        <div class="side-spot" id="ss-pp" data-spot="pp" title="Perfect Pairs : paire dans tes 2 premières cartes"><small>PAIRES</small><b></b><span class="ss-pay">jusqu'à 25:1</span><button class="spot-x" data-x="pp" title="Retirer">×</button></div>
        <div class="side-spot" id="ss-t3" data-spot="t3" title="21+3 : tes 2 cartes + la carte du croupier"><small>21+3</small><b></b><span class="ss-pay">jusqu'à 100:1</span><button class="spot-x" data-x="t3" title="Retirer">×</button></div>
      </div>
      <div class="side-res" id="side-res"></div>
      <div class="bj-msg" id="bj-msg"></div>
    </div>
    <div class="bj-controls">
      <div class="ctrl-bet">
        <div class="chip-row">${CHIPS.map((v) => `<button class="chip" data-v="${v}">${v >= 1000 ? v / 1000 + 'k' : v}</button>`).join('')}
          <label class="chip-custom" title="Montant libre : tape un montant, puis clique sur une case du tapis (Entrée = mise principale)"><input type="text" inputmode="numeric" class="bet-input" id="bj-custom" placeholder="Montant…" autocomplete="off"></label></div>
        <p class="bj-hint">Choisis un jeton (ou tape un montant), puis clique sur <b>MISE</b>, <b>PAIRES</b> ou <b>21+3</b> sur le tapis pour le poser. La croix retire la mise d'une case.</p>
        <div class="bet-actions">
          <button class="btn btn-ghost" id="clear">Effacer</button>
          <button class="btn btn-ghost" id="rebet">Remiser</button>
          <button class="btn btn-ghost" id="half-bet">½</button>
          <button class="btn btn-ghost" id="double-bet">×2</button>
          <button class="btn btn-ghost" id="allin">Tapis</button>
          <button class="btn btn-gold btn-lg" id="deal">Distribuer</button>
        </div>
        ${autoHTML('bj-auto', 'Mains automatiques', '<p class="ab-note">Rejoue tes mises (principale et annexes) et joue chaque main avec la stratégie de base.</p>')}
      </div>
      <div class="ctrl-play">
        <button class="btn btn-green btn-lg" id="hit">Tirer <kbd>H</kbd></button>
        <button class="btn btn-red btn-lg" id="stand">Rester <kbd>S</kbd></button>
        <button class="btn btn-gold btn-lg" id="dbl">Doubler <kbd>D</kbd></button>
        <button class="btn btn-blue btn-lg" id="split">Séparer <kbd>P</kbd></button>
      </div>
    </div>
  </div>`;

  const table = $('.bj-table', view);
  const dealerHandEl = $('#dealer-hand', view);
  const handsEl = $('#player-hands', view);
  const msgEl = $('#bj-msg', view);
  const shoeEl = $('.shoe', view);
  const discardEl = $('.discard', view);

  /* -------------------- mise -------------------- */
  function chipStackHTML(amount) {
    const out = []; let rest = amount;
    for (const v of [...CHIPS].reverse()) while (rest >= v && out.length < 12) { out.push(v); rest -= v; }
    return out.map((v, i) => `<div class="chip mini" data-v="${v}" style="--i:${i}"></div>`).join('');
  }
  function renderBet() {
    if (!alive) return;
    const spot = $('#bet-spot', view);
    const amount = phase === 'bet' ? bet : hands.reduce((a, hd) => a + hd.bet, 0);
    spot.querySelector('.bet-stack').innerHTML = chipStackHTML(amount);
    spot.querySelector('.bet-amt').innerHTML = amount ? money(amount) : 'Mise';
    spot.classList.toggle('empty', !amount);
    spot.classList.toggle('placeable', phase === 'bet' || phase === 'done');
    for (const k of ['pp', 't3']) {
      const v = phase === 'bet' ? side[k] : (sideRound[k] || 0);
      const el = $('#ss-' + k, view);
      el.classList.toggle('on', v > 0);
      el.classList.toggle('placeable', phase === 'bet' || phase === 'done');
      el.querySelector('b').textContent = v ? fmt(v) : '';
    }
    $$('.chip-row .chip', view).forEach((c) => c.classList.toggle('sel', !custom && +c.dataset.v === selChip));
    $('.chip-custom', view).classList.toggle('sel', !!custom);
  }
  const saveSide = () => { try { localStorage.setItem('chibouk_bj_side', JSON.stringify(side)); if (!custom) localStorage.setItem('chibouk_bj_chip', selChip); } catch {} };
  try { const c = +localStorage.getItem('chibouk_bj_chip'); if (CHIPS.includes(c)) selChip = c; } catch {}
  const totalStake = () => bet + side.pp + side.t3;
  // Poser le jeton sélectionné sur une case du tapis
  function place(spot) {
    if (phase === 'done') resetTable();
    if (phase !== 'bet') return;
    if (totalStake() + selChip > wallet.balance) { toast('Solde insuffisant', 'error'); return; }
    if (spot === 'main') bet += selChip; else side[spot] += selChip;
    sfx.chip(); saveSide(); renderBet(); updateControls();
  }
  function clearSpot(spot) {
    if (phase === 'done') resetTable();
    if (phase !== 'bet') return;
    if (spot === 'main') bet = 0; else side[spot] = 0;
    saveSide(); renderBet(); updateControls();
  }
  $$('[data-spot]', view).forEach((el) => {
    el.addEventListener('click', (e) => { if (e.target.closest('.spot-x')) return; place(el.dataset.spot); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); clearSpot(el.dataset.spot); });
  });
  $$('.spot-x', view).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); clearSpot(b.dataset.x); }));
  $$('.chip-row .chip', view).forEach((c) => {
    c.onclick = () => { selChip = +c.dataset.v; custom = 0; $('#bj-custom', view).value = ''; sfx.click(); saveSide(); renderBet(); };
  });
  // Montant libre (V39) : remplace le jeton sélectionné tant qu'il est rempli ; Entrée = le poser sur la mise principale
  const customIn = $('#bj-custom', view);
  customIn.oninput = () => { custom = Math.max(0, parseAmount(customIn.value)); if (custom) selChip = custom; else { try { selChip = CHIPS.includes(+localStorage.getItem('chibouk_bj_chip')) ? +localStorage.getItem('chibouk_bj_chip') : 25; } catch { selChip = 25; } } renderBet(); };
  customIn.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (custom) place('main'); } e.stopPropagation(); };
  $('#clear', view).onclick = () => { if (phase === 'done') resetTable(); bet = 0; side = { pp: 0, t3: 0 }; saveSide(); renderBet(); updateControls(); };
  $('#rebet', view).onclick = () => {
    if (phase === 'done') resetTable();
    const t = lastBet + lastSide.pp + lastSide.t3;
    if (lastBet && t <= wallet.balance) { bet = lastBet; side = { ...lastSide }; saveSide(); sfx.chip(); renderBet(); updateControls(); } else toast('Solde insuffisant pour remiser', 'error');
  };
  $('#double-bet', view).onclick = () => { if (phase === 'done') resetTable(); if (totalStake() && totalStake() * 2 <= wallet.balance) { bet *= 2; side.pp *= 2; side.t3 *= 2; saveSide(); sfx.chip(); renderBet(); updateControls(); } };
  $('#half-bet', view).onclick = () => { if (phase === 'done') resetTable(); bet = Math.floor(bet / 2); side.pp = Math.floor(side.pp / 2); side.t3 = Math.floor(side.t3 / 2); saveSide(); sfx.chip(); renderBet(); updateControls(); };
  $('#allin', view).onclick = () => { if (phase === 'done') resetTable(); bet = Math.max(0, Math.floor(wallet.balance) - side.pp - side.t3); sfx.chip(); renderBet(); updateControls(); };
  $('#deal', view).onclick = () => deal();
  $('#hit', view).onclick = () => hit();
  $('#stand', view).onclick = () => stand();
  $('#dbl', view).onclick = () => doubleDown();
  $('#split', view).onclick = () => split();
  $('#bj-rules', view).onclick = () => import('../ui.js').then(({ modal }) => modal({ title: 'Règles du Blackjack', html: `
    <ul class="muted">
      <li>But : battre le croupier en s'approchant de <b>21</b> sans dépasser.</li>
      <li><b>Blackjack</b> (As + figure/10 en 2 cartes) paie <b>3 contre 2</b>.</li>
      <li>Victoire normale paie 1 contre 1, égalité = mise rendue.</li>
      <li>Le croupier tire jusqu'à 16 et <b>reste sur tous les 17</b>. Il vérifie s'il a un blackjack quand il montre un As ou un 10.</li>
      <li><b>Doubler</b> : double la mise, une seule carte en plus (sur tes 2 premières cartes).</li>
      <li><b>Séparer</b> : n'importe quelles deux cartes → deux mains (jusqu'à 4). Deux As séparés : une carte chacun.</li>
      <li><b>Perfect Pairs</b> (sur tes 2 premières cartes) : paire mixte 6:1, paire de couleur 15:1, paire parfaite 25:1. RTP ≈ 99,7 %.</li>
      <li><b>21+3</b> (tes 2 cartes + la carte visible du croupier) : couleur 5:1, suite 11:1, brelan 30:1, quinte flush 45:1, brelan couleur 100:1. RTP ≈ 99,5 %.</li>
      <li>Les mises annexes sont réglées dès la distribution, quel que soit le résultat de la main.</li>
      <li>Sabot de ${DECKS} jeux, remélangé aux trois quarts.</li>
      <li>Raccourcis clavier : <b>Espace/Entrée</b> distribuer, <b>H</b> tirer, <b>S</b> rester, <b>D</b> doubler, <b>P</b> séparer.</li>
    </ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] }));

  function updateControls() {
    if (!alive) return;
    view.querySelector('.bj-controls').dataset.phase = phase === 'play' ? 'play' : phase === 'bet' || phase === 'done' ? 'bet' : 'busy';
    $('#deal', view).disabled = !(phase === 'bet' || phase === 'done') || !(bet > 0) || bet + side.pp + side.t3 > wallet.balance;
    $('#deal', view).textContent = phase === 'done' ? 'Rejouer' : 'Distribuer';
    view.querySelector('.bj-wrap').classList.toggle('auto-on', !!autoOn);
    const hd = hands[active];
    const can = phase === 'play' && hd && !hd.done;
    $('#hit', view).disabled = !can;
    $('#stand', view).disabled = !can;
    $('#dbl', view).disabled = !(can && hd.cards.length === 2 && wallet.balance >= hd.bet);
    $('#split', view).disabled = !(can && hd.cards.length === 2 && hands.length < 4 && wallet.balance >= hd.bet);
  }

  /* -------------------- cartes 3D -------------------- */
  function draw() {
    if (shoe.length < 10) { shoe = newShoe(); cut = Math.floor(shoe.length * 0.25); toast('Nouveau sabot mélangé'); }
    return shoe.pop();
  }

  function layoutHand(handEl) {
    const cards = $$('.card', handEl);
    const n = cards.length;
    handEl.style.setProperty('--n', n);
    cards.forEach((c, i) => c.style.setProperty('--i', i));
  }

  async function dealCard(card, handEl, { hidden = false, rotate = false } = {}) {
    if (!alive) return null;
    const el = h(`<div class="card"><div class="card3d ${hidden ? 'hidden' : ''}">${faceHTML(card)}${backHTML()}</div></div>`);
    handEl.append(el);
    layoutHand(handEl);
    const inner = el.firstElementChild;
    const from = shoeEl.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const endFlip = hidden ? 'rotateY(180deg)' : 'rotateY(0deg)';
    const finalT = `translate(0, 0) rotateZ(${rotate ? 90 : (Math.random() * 4 - 2).toFixed(1)}deg) scale(1)`;
    el.style.transform = finalT;
    sfx.card();
    const anim = el.animate([
      { transform: `translate(${dx}px, ${dy}px) rotateZ(-70deg) scale(.7)`, opacity: 0.6 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 30}px) rotateZ(-15deg) scale(1.12)`, opacity: 1, offset: 0.6 },
      { transform: finalT },
    ], { duration: T(520), easing: 'cubic-bezier(.2,.8,.25,1)' });
    inner.animate([
      { transform: 'translateZ(0) rotateY(180deg) rotateX(20deg)' },
      { transform: `translateZ(90px) rotateY(${hidden ? 180 : 90}deg) rotateX(10deg)`, offset: 0.55 },
      { transform: `translateZ(0) ${endFlip}` },
    ], { duration: T(520), easing: 'cubic-bezier(.3,.7,.3,1)' });
    await anim.finished.catch(() => {});
    if (!hidden) setTimeout(() => sfx.flip(), 0);
    return el;
  }

  async function flipHole() {
    if (!holeEl) return;
    const inner = holeEl.firstElementChild;
    sfx.flip();
    const a = inner.animate([
      { transform: 'translateZ(0) rotateY(180deg)' },
      { transform: 'translateZ(70px) rotateY(90deg) scale(1.08)', offset: 0.5 },
      { transform: 'translateZ(0) rotateY(0deg)' },
    ], { duration: T(560), easing: 'ease-in-out' });
    inner.classList.remove('hidden');
    await a.finished.catch(() => {});
  }

  function setTotal(el, cards, hideSecond = false) {
    if (!cards.length) { el.textContent = ''; return; }
    const shown = hideSecond ? [cards[0]] : cards;
    const v = handValue(shown);
    const lowTotal = v.total - 10;
    el.textContent = v.soft && v.total < 21 && !hideSecond ? `${lowTotal}/${v.total}` : String(v.total);
    el.className = 'total' + (v.total > 21 ? ' bust' : v.total === 21 ? ' bj' : '');
  }
  function refreshTotals() {
    if (!alive) return;
    setTotal($('#dealer-total', view), dealer, phase !== 'dealer' && phase !== 'done');
    hands.forEach((hd) => setTotal(hd.totalEl, hd.cards));
    hands.forEach((hd, i) => hd.el.classList.toggle('active', phase === 'play' && i === active && hands.length > 1));
  }

  function makeHandEl(hd) {
    const wrap = h(`<div class="phand"><div class="hand"></div><div class="hand-info"><span class="total"></span><span class="hand-bet"></span></div><div class="hand-result"></div></div>`);
    hd.el = wrap; hd.cardsEl = $('.hand', wrap); hd.totalEl = $('.total', wrap);
    $('.hand-bet', wrap).innerHTML = money(hd.bet);
    return wrap;
  }
  const updHandBet = (hd) => { $('.hand-bet', hd.el).innerHTML = money(hd.bet); };

  function say(text, cls = '') {
    if (!alive) return;
    msgEl.className = 'bj-msg show ' + cls;
    msgEl.innerHTML = text;
  }
  const hush = () => { msgEl.className = 'bj-msg'; };

  /* -------------------- déroulement -------------------- */
  async function clearCards() {
    const all = $$('.card', table);
    if (!all.length) return;
    const d = discardEl.getBoundingClientRect();
    await Promise.all(all.map((c, i) => {
      const r = c.getBoundingClientRect();
      return c.animate([{ transform: getComputedStyle(c).transform === 'none' ? 'none' : getComputedStyle(c).transform, opacity: 1 },
        { transform: `translate(${d.left - r.left}px, ${d.top - r.top}px) rotateZ(80deg) scale(.6)`, opacity: 0 }],
      { duration: T(380), delay: T(i * 30), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    }));
  }

  function resetTable() {
    $$('.card', table).forEach((c) => c.remove());
    dealerHandEl.innerHTML = '';
    handsEl.innerHTML = '';
    dealer = []; hands = []; holeEl = null; active = 0;
    sideRound = { stake: 0, pay: 0 };
    const sr = $('#side-res', view); if (sr) sr.className = 'side-res';
    $('#dealer-total', view).textContent = '';
    phase = 'bet';
    hush();
    renderBet();
  }

  async function deal() {
    if (!(phase === 'bet' || phase === 'done')) return;
    if (!bet || bet + side.pp + side.t3 > wallet.balance) { toast('Mise invalide ou solde insuffisant', 'error'); return; }
    const wasDone = phase === 'done';
    phase = 'deal'; updateControls(); // verrou : empêche un double clic de lancer deux mains
    if (wasDone) { await clearCards(); resetTable(); phase = 'deal'; }
    if (!alive) return;
    if (bet + side.pp + side.t3 > wallet.balance || !wallet.bet('blackjack', bet)) { phase = 'bet'; updateControls(); toast('Solde insuffisant', 'error'); return; }
    sideRound = { stake: side.pp + side.t3, pay: 0, pp: side.pp, t3: side.t3, res: [] };
    if (sideRound.stake > 0) wallet.bet('blackjack', sideRound.stake);
    $('#side-res', view).className = 'side-res';
    lastBet = bet; lastSide = { ...side };
    settled = false;
    try { localStorage.setItem('chibouk_bj_bet', bet); } catch {}
    if (shoe.length < cut) { shoe = newShoe(); cut = Math.floor(shoe.length * 0.25); toast('Nouveau sabot mélangé'); }
    phase = 'deal'; updateControls(); hush();
    hands = [{ cards: [], bet, done: false, doubled: false, splitAces: false }];
    handsEl.append(makeHandEl(hands[0]));
    renderBet();
    const p = hands[0];
    // les 4 cartes sont tirées d'abord : les mises annexes sont réglées tout de suite
    const c1 = draw(), d1 = draw(), c2 = draw(), d2 = draw();
    const revealSide = wallet.deferEvents(() => resolveSideBets(c1, c2, d1));
    p.cards.push(c1); await dealCard(p.cards[0], p.cardsEl); refreshTotals();
    dealer.push(d1); await dealCard(dealer[0], dealerHandEl); refreshTotals();
    p.cards.push(c2); await dealCard(p.cards[1], p.cardsEl); refreshTotals();
    dealer.push(d2); holeEl = await dealCard(dealer[1], dealerHandEl, { hidden: true }); refreshTotals();
    revealSide();
    if (!alive) return;
    showSideResults();

    const up = dealer[0];
    const dealerBJ = isBJ(dealer);
    const playerBJ = isBJ(p.cards);
    if ((up.r === 'A' || cardValue(up) === 10) && !playerBJ) {
      say('Le croupier vérifie…'); await sleep(T(800)); hush();
    }
    if (dealerBJ || playerBJ) {
      phase = 'dealer';
      await flipHole(); refreshTotals();
      return settle();
    }
    phase = 'play'; active = 0;
    refreshTotals(); updateControls();
  }

  function resolveSideBets(c1, c2, up) {
    if (sideRound.pp) {
      const k = perfectPairs(c1, c2);
      const pay = k ? sideRound.pp * (SIDE_PP[k].pay + 1) : 0;
      sideRound.res.push({ label: 'Perfect Pairs', name: k ? SIDE_PP[k].name : 'Pas de paire', pay, mult: k ? SIDE_PP[k].pay : 0 });
      sideRound.ppKind = k;
      sideRound.pay += pay;
    }
    if (sideRound.t3) {
      const k = twentyOneThree([c1, c2, up]);
      const pay = k ? sideRound.t3 * (SIDE_T3[k].pay + 1) : 0;
      sideRound.res.push({ label: '21+3', name: k ? SIDE_T3[k].name : 'Rien', pay, mult: k ? SIDE_T3[k].pay : 0 });
      sideRound.t3Kind = k;
      sideRound.pay += pay;
    }
    if (sideRound.pay > 0) wallet.win('blackjack', sideRound.pay, sideRound.stake);
  }
  function showSideResults() {
    if (!sideRound.res || !sideRound.res.length) return;
    const el = $('#side-res', view);
    el.innerHTML = sideRound.res.map((r) => `<span class="${r.pay ? 'win' : 'lose'}"><b>${r.label}</b> ${r.name}${r.pay ? ` ${r.mult}:1 +${fmt(r.pay - (r.label === '21+3' ? sideRound.t3 : sideRound.pp))}` : ''}</span>`).join('');
    el.className = 'side-res show';
    if (sideRound.pay > 0) { sfx.coin(); if (sideRound.res.some((r) => r.mult >= 25)) coinRain(30); }
  }

  async function nextHand() {
    while (active < hands.length && hands[active].done) active++;
    if (active < hands.length) {
      const hd = hands[active];
      if (hd.cards.length === 1) { // main issue d'un split : on complète
        phase = 'deal'; updateControls();
        hd.cards.push(draw()); await dealCard(hd.cards[1], hd.cardsEl); refreshTotals();
        if (hd.splitAces || handValue(hd.cards).total === 21) { hd.done = true; return nextHand(); }
        phase = 'play';
      }
      refreshTotals(); updateControls();
      return;
    }
    await dealerPlay();
  }

  async function hit() {
    if (phase !== 'play') return;
    const hd = hands[active];
    phase = 'deal'; updateControls();
    hd.cards.push(draw()); await dealCard(hd.cards.at(-1), hd.cardsEl); refreshTotals();
    phase = 'play';
    const v = handValue(hd.cards).total;
    if (v > 21) { hd.done = true; hd.el.classList.add('busted'); sfx.lose(); await sleep(T(350)); return nextHand(); }
    if (v === 21) { hd.done = true; await sleep(T(250)); return nextHand(); }
    updateControls();
  }
  async function stand() {
    if (phase !== 'play') return;
    sfx.click();
    hands[active].done = true;
    return nextHand();
  }
  async function doubleDown() {
    if (phase !== 'play') return;
    const hd = hands[active];
    if (hd.cards.length !== 2 || !wallet.bet('blackjack', hd.bet)) return;
    sfx.chip();
    hd.bet *= 2; hd.doubled = true; updHandBet(hd); renderBet();
    phase = 'deal'; updateControls();
    hd.cards.push(draw()); await dealCard(hd.cards.at(-1), hd.cardsEl, { rotate: true }); refreshTotals();
    phase = 'play';
    hd.done = true;
    if (handValue(hd.cards).total > 21) { hd.el.classList.add('busted'); sfx.lose(); }
    await sleep(T(300));
    return nextHand();
  }
  async function split() {
    if (phase !== 'play') return;
    const hd = hands[active];
    if (!(hd.cards.length === 2 && hands.length < 4)) return; // on peut séparer n'importe quelles cartes
    if (!wallet.bet('blackjack', hd.bet)) return;
    sfx.chip();
    const bothAces = hd.cards[0].r === 'A' && hd.cards[1].r === 'A';
    const second = hd.cards.pop();
    const nh = { cards: [second], bet: hd.bet, done: false, doubled: false, splitAces: bothAces };
    hd.splitAces = bothAces;
    hands.splice(active + 1, 0, nh);
    const nel = makeHandEl(nh);
    hd.el.after(nel);
    const lastCard = $$('.card', hd.cardsEl).at(-1);
    nh.cardsEl.append(lastCard);
    layoutHand(hd.cardsEl); layoutHand(nh.cardsEl);
    renderBet();
    phase = 'deal'; updateControls();
    hd.cards.push(draw()); await dealCard(hd.cards[1], hd.cardsEl); refreshTotals();
    phase = 'play';
    if (hd.splitAces || handValue(hd.cards).total === 21) { hd.done = true; return nextHand(); }
    refreshTotals(); updateControls();
  }

  async function dealerPlay() {
    phase = 'dealer'; updateControls(); refreshTotals();
    await flipHole(); refreshTotals();
    const anyLive = hands.some((hd) => handValue(hd.cards).total <= 21);
    if (anyLive) {
      while (handValue(dealer).total < 17 && alive) {
        await sleep(T(250));
        dealer.push(draw()); await dealCard(dealer.at(-1), dealerHandEl); refreshTotals();
      }
    }
    return settle();
  }

  function computeResults() {
    const dv = handValue(dealer).total;
    const dBJ = isBJ(dealer);
    let payout = 0, staked = 0;
    for (const hd of hands) {
      staked += hd.bet;
      const pv = handValue(hd.cards).total;
      const pBJ = hands.length === 1 && isBJ(hd.cards);
      let res, pay = 0;
      if (pBJ && !dBJ) { res = 'bj'; pay = hd.bet * 2.5; }
      else if (pBJ && dBJ) { res = 'push'; pay = hd.bet; }
      else if (dBJ) { res = 'lose'; }
      else if (pv > 21) { res = 'bust'; }
      else if (dv > 21 || pv > dv) { res = 'win'; pay = hd.bet * 2; }
      else if (pv === dv) { res = 'push'; pay = hd.bet; }
      else res = 'lose';
      hd.result = res; hd.pay = pay;
      payout += pay;
    }
    return { payout: Math.ceil(payout), staked };
  }

  async function settle() {
    if (settled) return;
    settled = true;
    const { payout, staked } = computeResults();
    if (payout > 0) wallet.win('blackjack', payout, staked);
    const totPay = payout + sideRound.pay, totStake = staked + sideRound.stake;
    wallet.round('blackjack', totPay > totStake ? totPay : 0, { bet: totStake, net: totPay - totStake, result: payout > staked ? 'win' : payout < staked ? 'lose' : 'push', bj: hands.some((hd) => hd.result === 'bj'), hands: hands.length, doubled: hands.some((hd) => hd.doubled && (hd.result === 'win')), dealerBJ: isBJ(dealer), dealerBust: handValue(dealer).total > 21, pp: sideRound.ppKind || null, t3: sideRound.t3Kind || null, pushAll: hands.every((hd) => hd.result === 'push'), bust22: hands.some((hd) => handValue(hd.cards).total === 22) });
    if (hands.some((hd) => hd.result === 'bj')) wallet.track('blackjack', 'blackjacks');
    if (hands.every((hd) => hd.result === 'push')) wallet.track('blackjack', 'pushes');
    if (!alive) return;
    const labels = { bj: 'BLACKJACK !', win: 'Gagné', push: 'Égalité', lose: 'Perdu', bust: 'Sauté' };
    hands.forEach((hd) => {
      const r = $('.hand-result', hd.el);
      r.className = 'hand-result show r-' + hd.result;
      r.innerHTML = `${labels[hd.result]}${hd.pay > 0 && hd.result !== 'push' ? ` <b>+${fmt(hd.pay - hd.bet)}</b>` : ''}`;
    });
    const net = payout - staked;
    const dv = handValue(dealer).total;
    if (hands.some((hd) => hd.result === 'bj')) { say(`BLACKJACK ! +${fmt(net)} ${CUR}`, 'win'); sfx.win(true); coinRain(25); }
    else if (net > 0) { say(`${dv > 21 ? 'Le croupier saute ! ' : ''}Tu gagnes +${fmt(net)} ${CUR}`, 'win'); sfx.win(); }
    else if (net === 0 && payout > 0) { say('Égalité, mise rendue', ''); sfx.click(); }
    else { say(isBJ(dealer) ? 'Blackjack du croupier…' : 'Le croupier gagne cette main', 'lose'); sfx.lose(); }
    phase = 'done';
    if (bet > wallet.balance) bet = 0;
    updateControls();
  }

  // Si le joueur quitte au milieu d'une main : on la termine automatiquement (en restant)
  function finishSilently() {
    if (settled || !hands.length) return;
    settled = true;
    for (const hd of hands) { if (hd.cards.length === 1) hd.cards.push(draw()); hd.done = true; }
    if (hands.some((hd) => handValue(hd.cards).total <= 21)) while (handValue(dealer).total < 17) dealer.push(draw());
    phase = 'done';
    const { payout, staked } = computeResults();
    if (payout > 0) wallet.win('blackjack', payout, staked);
    const totPay = payout + sideRound.pay, totStake = staked + sideRound.stake;
    wallet.round('blackjack', totPay > totStake ? totPay : 0, { bet: totStake, net: totPay - totStake, result: payout > staked ? 'win' : payout < staked ? 'lose' : 'push', bj: hands.some((hd) => hd.result === 'bj'), hands: hands.length, doubled: hands.some((hd) => hd.doubled && (hd.result === 'win')), dealerBJ: isBJ(dealer), dealerBust: handValue(dealer).total > 21, pp: sideRound.ppKind || null, t3: sideRound.t3Kind || null, pushAll: hands.every((hd) => hd.result === 'push'), bust22: hands.some((hd) => handValue(hd.cards).total === 22) });
  }

  /* -------------------- mains automatiques (stratégie de base) -------------------- */
  function basicStrategy(hd, up) {
    const u = up.r === 'A' ? 11 : cardValue(up);
    const v = handValue(hd.cards);
    const two = hd.cards.length === 2;
    const canDbl = two && wallet.balance >= hd.bet;
    const canSplit = two && hands.length < 4 && wallet.balance >= hd.bet && cardValue(hd.cards[0]) === cardValue(hd.cards[1]);
    if (canSplit) {
      const pv = hd.cards[0].r === 'A' ? 11 : cardValue(hd.cards[0]);
      if (pv === 11 || pv === 8) return 'P';
      if (pv === 9 && ![7, 10, 11].includes(u)) return 'P';
      if ((pv === 7 || pv === 2 || pv === 3) && u <= 7) return 'P';
      if (pv === 6 && u <= 6) return 'P';
      if (pv === 4 && (u === 5 || u === 6)) return 'P';
    }
    if (v.soft && v.total < 21) {
      const t = v.total;
      if (t >= 20) return 'S';
      if (t === 19) return u === 6 && canDbl ? 'D' : 'S';
      if (t === 18) return u >= 2 && u <= 6 ? (canDbl ? 'D' : 'S') : u <= 8 ? 'S' : 'H';
      if (t === 17) return u >= 3 && u <= 6 && canDbl ? 'D' : 'H';
      if (t >= 15) return u >= 4 && u <= 6 && canDbl ? 'D' : 'H';
      return u >= 5 && u <= 6 && canDbl ? 'D' : 'H';
    }
    const t = v.total;
    if (t >= 17) return 'S';
    if (t >= 13) return u <= 6 ? 'S' : 'H';
    if (t === 12) return u >= 4 && u <= 6 ? 'S' : 'H';
    if (t === 11) return canDbl ? 'D' : 'H';
    if (t === 10) return u <= 9 && canDbl ? 'D' : 'H';
    if (t === 9) return u >= 3 && u <= 6 && canDbl ? 'D' : 'H';
    return 'H';
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const auto = bindAuto(view, 'bj-auto', { wallet, game: 'blackjack', delay: 900, turbo: true,
    play: async () => {
      if (!(phase === 'bet' || phase === 'done')) return false;
      if (!bet) { toast('Pose d\'abord une mise sur le tapis', 'error'); return false; }
      if (bet + side.pp + side.t3 > wallet.balance) { toast('Solde insuffisant pour continuer', 'error'); return false; }
      deal();
      await wait(T(50));
      while (alive && phase !== 'done') {
        if (phase === 'play') {
          const hd = hands[active];
          const a = basicStrategy(hd, dealer[0]);
          if (a === 'P') await split(); else if (a === 'D') await doubleDown(); else if (a === 'H') await hit(); else await stand();
        }
        await wait(T(120));
      }
      return alive;
    },
    onState: (on) => { autoOn = on; updateControls(); } });

  const onKey = (e) => {
    if (e.target.closest('input,textarea') || document.querySelector('.modal-backdrop')) return;
    const k = e.key.toLowerCase();
    if ((k === ' ' || k === 'enter') && (phase === 'bet' || phase === 'done')) { e.preventDefault(); deal(); }
    else if (k === 'h') hit(); else if (k === 's') stand(); else if (k === 'd') doubleDown(); else if (k === 'p') split();
  };
  document.addEventListener('keydown', onKey);

  bet = lastBet && lastBet <= wallet.balance ? lastBet : 0;
  renderBet(); updateControls();

  return () => {
    alive = false;
    auto.stop();
    document.removeEventListener('keydown', onKey);
    finishSilently();
  };
}
