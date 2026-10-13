// Tower — grimpe étage par étage : chaque case sûre augmente le multiplicateur, une bombe et c'est perdu
// Multiplicateur à l'étage k = 0,99 × (cases / cases sûres)^k  → RTP 99 % quel que soit le moment où on encaisse
import { randInt } from './slots-math.js';
import { icon, monkeySVG, bananaTileSVG, bombTileSVG } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, betFieldHTML, bindBetField, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const FLOORS = 9;
export const TOWER_LEVELS = {
  easy: { name: 'Facile', tiles: 4, bombs: 1 },
  medium: { name: 'Moyen', tiles: 3, bombs: 1 },
  hard: { name: 'Difficile', tiles: 2, bombs: 1 },
  expert: { name: 'Expert', tiles: 3, bombs: 2 },
  master: { name: 'Maître', tiles: 4, bombs: 3 },
};
export function towerMult(levelKey, k) {
  const L = TOWER_LEVELS[levelKey];
  if (k <= 0) return 1;
  return Math.floor(0.99 * Math.pow(L.tiles / (L.tiles - L.bombs), k) * 100) / 100;
}
const fmtX = (m) => '×' + (m >= 1000 ? fmt(m) : m.toFixed(2).replace('.', ','));

export function mount(view, { wallet }) {
  let alive = true;
  let level = 'medium';
  try { const l = localStorage.getItem('chibouk_tower_level'); if (TOWER_LEVELS[l]) level = l; } catch {}
  let game = null; // { bet, level, bombs: [[col...] per floor], floor, picks: [col per floor], over, cashed }

  view.innerHTML = `
  <div class="tw-wrap">
    <div class="game-head"><h1><span>Tower</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="tw-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('tw-bet')}
        <div class="seg-field"><label>Difficulté</label>
          <div class="seg seg-wrap" id="tw-level">${Object.entries(TOWER_LEVELS).map(([k, l]) => `<button data-v="${k}">${l.name}</button>`).join('')}</div></div>
        <button class="btn btn-gold btn-lg wide" id="tw-main">Commencer</button>
        <button class="btn btn-ghost wide" id="tw-random">Case au hasard</button>
        <div class="plk-info"><span>Multiplicateur actuel</span><b id="tw-cur">×1,00</b></div>
        <div class="plk-info"><span>Prochain étage</span><b id="tw-next">—</b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="tw-stage"><div class="tw-board" id="tw-board"></div><div class="tw-msg" id="tw-msg"></div></div>
    </div>
  </div>`;

  const board = $('#tw-board', view), msg = $('#tw-msg', view), mainBtn = $('#tw-main', view);
  const bet = bindBetField(view, 'tw-bet', 'chibouk_tower_bet', wallet, 10);

  function render() {
    const L = TOWER_LEVELS[game ? game.level : level];
    let html = '';
    for (let f = FLOORS - 1; f >= 0; f--) {
      const isCur = game && !game.over && f === game.floor;
      const passed = game && f < game.floor;
      html += `<div class="tw-row ${isCur ? 'current' : ''} ${passed ? 'passed' : ''}" data-f="${f}">
        <span class="tw-mult">${fmtX(towerMult(game ? game.level : level, f + 1))}</span>
        <div class="tw-tiles" style="--n:${L.tiles}">`;
      for (let c = 0; c < L.tiles; c++) {
        let cls = 'tw-tile', inner = '';
        if (game) {
          const isBomb = game.bombs[f].includes(c);
          const picked = game.picks[f] === c;
          if (picked && !isBomb) { cls += ' safe'; inner = bananaTileSVG(); }
          else if (picked && isBomb) { cls += ' bomb boom'; inner = bombTileSVG(); }
          else if (game.over && isBomb) { cls += ' bomb dim'; inner = bombTileSVG(); }
          else if (game.over && f < FLOORS) { cls += ' dim'; inner = isBomb ? '' : bananaTileSVG(); if (!isBomb) cls += ' safe ghost'; }
        }
        html += `<button class="${cls}" data-f="${f}" data-c="${c}" ${isCur ? '' : 'tabindex="-1"'}>${inner}</button>`;
      }
      html += `</div>${passed && game.floor - 1 === f && !game.over ? `<span class="tw-monkey">${monkeySVG({ wink: true })}</span>` : ''}</div>`;
    }
    board.innerHTML = html;
    $$('.tw-row.current .tw-tile', board).forEach((b) => (b.onclick = () => pick(+b.dataset.c)));
    updateSide();
  }

  function updateSide() {
    const playing = game && !game.over;
    $$('#tw-level button', view).forEach((b) => { b.classList.toggle('on', b.dataset.v === (game ? game.level : level)); b.disabled = playing; });
    bet.disabled = playing;
    $('#tw-random', view).disabled = !playing;
    const k = playing ? game.floor : 0;
    const lv = game ? game.level : level;
    $('#tw-cur', view).textContent = fmtX(game && !game.over ? towerMult(lv, k) : 1);
    $('#tw-next', view).textContent = k < FLOORS ? fmtX(towerMult(lv, k + 1)) : '—';
    if (playing && k > 0) { mainBtn.textContent = `Encaisser ${fmt(Math.floor(game.bet * towerMult(lv, k)))}`; mainBtn.className = 'btn btn-green btn-lg wide'; mainBtn.disabled = false; }
    else if (playing) { mainBtn.textContent = 'Choisis une case…'; mainBtn.className = 'btn btn-gold btn-lg wide'; mainBtn.disabled = true; }
    else { mainBtn.textContent = game ? 'Rejouer' : 'Commencer'; mainBtn.className = 'btn btn-gold btn-lg wide'; mainBtn.disabled = false; }
  }

  function say(html, cls = '') { msg.className = 'tw-msg show ' + cls; msg.innerHTML = html; }

  function start() {
    const amount = bet.value;
    if (!wallet.bet('tower', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return; }
    const L = TOWER_LEVELS[level];
    const bombs = [];
    for (let f = 0; f < FLOORS; f++) {
      const cols = [...Array(L.tiles).keys()];
      for (let i = cols.length - 1; i > 0; i--) { const j = randInt(i + 1); [cols[i], cols[j]] = [cols[j], cols[i]]; }
      bombs.push(cols.slice(0, L.bombs));
    }
    game = { bet: amount, level, bombs, floor: 0, picks: [], over: false };
    msg.className = 'tw-msg';
    sfx.click();
    render();
  }

  function pick(c) {
    if (!game || game.over) return;
    const f = game.floor;
    game.picks[f] = c;
    if (game.bombs[f].includes(c)) {
      game.over = true;
      wallet.round('tower', 0);
      sfx.lose();
      render();
      board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
      say(`Boum ! Bombe à l'étage ${f + 1}, mise perdue`, 'lose');
      return;
    }
    game.floor++;
    sfx.brick(1 + game.floor * 0.08);
    if (game.floor >= FLOORS) { render(); cashOut(); return; }
    render();
  }

  function cashOut() {
    if (!game || game.over || game.floor === 0) return;
    const m = towerMult(game.level, game.floor);
    const payout = Math.floor(game.bet * m);
    game.over = true; game.cashed = true;
    wallet.win('tower', payout);
    wallet.round('tower', payout > game.bet ? payout : 0);
    if (!alive) return;
    render();
    say(`Encaissé à <b>${fmtX(m)}</b> : +${money(payout)}`, 'win');
    sfx.win(m >= 10); if (m >= 10) coinRain(Math.min(60, 15 + m));
  }

  mainBtn.onclick = () => { if (game && !game.over) cashOut(); else start(); };
  $('#tw-random', view).onclick = () => { if (game && !game.over) pick(randInt(TOWER_LEVELS[game.level].tiles)); };
  $$('#tw-level button', view).forEach((b) => (b.onclick = () => {
    if (game && !game.over) return;
    level = b.dataset.v; try { localStorage.setItem('chibouk_tower_level', level); } catch {}
    game = null; msg.className = 'tw-msg'; sfx.click(); render();
  }));
  $('#tw-rules', view).onclick = () => modal({ title: 'Règles de la Tower', html: `
    <ul class="muted"><li>Mise, choisis une difficulté puis grimpe : à chaque étage, clique sur une case.</li>
    <li>Une banane : tu montes d'un étage et ton multiplicateur augmente. Une bombe : tu perds ta mise.</li>
    <li>Tu peux <b>encaisser</b> à tout moment après le premier étage. Arrivé en haut (${FLOORS} étages), l'encaissement est automatique.</li>
    <li>Facile : 1 bombe sur 4 cases · Moyen : 1 sur 3 · Difficile : 1 sur 2 · Expert : 2 sur 3 · Maître : 3 sur 4.</li>
    <li>Le multiplicateur est calculé pour un RTP de 99 % à chaque étage.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });

  const onKey = (e) => {
    if (e.target.closest('input,textarea') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (game && !game.over && game.floor > 0) cashOut(); else if (!game || game.over) start(); }
  };
  document.addEventListener('keydown', onKey);

  render();
  return () => {
    alive = false;
    document.removeEventListener('keydown', onKey);
    // partie en cours : on encaisse au palier atteint, ou on rembourse si aucune case n'a été choisie
    if (game && !game.over) {
      if (game.floor > 0) cashOut();
      else { game.over = true; wallet.refund('tower', game.bet); }
    }
  };
}
