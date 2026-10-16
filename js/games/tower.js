// Tower — grimpe étage par étage : chaque case sûre augmente le multiplicateur, une bombe et c'est perdu
// Multiplicateur à l'étage k = 0,99 × (cases / cases sûres)^k  → RTP 99 % quel que soit le moment où on encaisse
import { randInt } from './slots-math.js';
import { icon, monkeySVG, bananaTileSVG, bombTileSVG } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR, isTurbo } from '../ui.js';
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
  let autoOn = false;

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
        ${autoHTML('tw-auto', 'Paris automatiques', `<label class="ab-extra">Étages à grimper avant d'encaisser<input class="bet-input" type="number" min="1" max="9" step="1" id="tw-auto-floors" value="2"></label>
          <div class="tw-plan"><button type="button" class="btn btn-ghost btn-sm" id="tw-top">Jusqu'en haut</button><button type="button" class="btn btn-ghost btn-sm" id="tw-plan-rand">Parcours au hasard</button><button type="button" class="btn btn-ghost btn-sm" id="tw-plan-clear">Effacer</button></div>
          <p class="ab-note" id="tw-plan-note"></p>`)}
        <div class="plk-info"><span>Multiplicateur actuel</span><b id="tw-cur">×1,00</b></div>
        <div class="plk-info"><span>Prochain étage</span><b id="tw-next">—</b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="tw-stage"><div class="tw-board" id="tw-board"></div><div class="tw-msg" id="tw-msg"></div></div>
    </div>
  </div>`;

  const board = $('#tw-board', view), msg = $('#tw-msg', view), mainBtn = $('#tw-main', view);
  const bet = bindBetField(view, 'tw-bet', 'chibouk_tower_bet', wallet, 10);
  const floorsIn = $('#tw-auto-floors', view);
  // Parcours de l'auto : une case choisie par étage (null = case au hasard), mémorisé par difficulté
  let plan = [];
  const loadPlan = () => { try { plan = JSON.parse(localStorage.getItem('chibouk_tw_plan_' + level) || '[]'); } catch { plan = []; } plan = Array.from({ length: FLOORS }, (_, i) => (Number.isInteger(plan[i]) && plan[i] < TOWER_LEVELS[level].tiles ? plan[i] : null)); };
  const savePlan = () => { try { localStorage.setItem('chibouk_tw_plan_' + level, JSON.stringify(plan)); } catch {} };
  const planFloors = () => Math.max(1, Math.min(FLOORS, +floorsIn.value || 1));
  function planNote() {
    const n = planFloors(), chosen = plan.slice(0, n).filter((x) => x !== null).length;
    const el = $('#tw-plan-note', view);
    if (el) el.innerHTML = `L'auto grimpe <b>${n} étage${n > 1 ? 's' : ''}</b>${n >= FLOORS ? ' (jusqu\'en haut)' : ''} puis encaisse ${fmtX(towerMult(level, n))}. ${chosen ? `${chosen} case${chosen > 1 ? 's' : ''} choisie${chosen > 1 ? 's' : ''} sur le plateau, le reste au hasard.` : 'Clique sur les cases du plateau pour choisir ton parcours, sinon c\'est au hasard.'}`;
  }
  loadPlan();

  function render() {
    const L = TOWER_LEVELS[game ? game.level : level];
    let html = '';
    for (let f = FLOORS - 1; f >= 0; f--) {
      const isCur = game && !game.over && f === game.floor;
      const passed = game && f < game.floor;
      html += `<div class="tw-row ${isCur ? 'current' : ''} ${passed ? 'passed' : ''} ${!game && f < planFloors() ? 'in-plan' : ''}" data-f="${f}">
        <span class="tw-mult">${fmtX(towerMult(game ? game.level : level, f + 1))}</span>
        <div class="tw-tiles" style="--n:${L.tiles}">`;
      for (let c = 0; c < L.tiles; c++) {
        let cls = 'tw-tile', inner = '';
        const planned = (!game || game.over) && plan[f] === c && f < planFloors();
        if (planned && !game) { cls += ' planned'; inner = `<span class="tw-step">${f + 1}</span>`; }
        if (game && game.auto && !game.over && plan[f] === c && f >= game.floor && f < planFloors()) cls += ' planned soft';
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
    $$('.tw-tile', board).forEach((b) => (b.onclick = () => {
      if (game && !game.over) { if (+b.dataset.f === game.floor && !autoOn) pick(+b.dataset.c); return; }
      if (autoOn) return;
      // pas de partie en cours : on trace le parcours de l'auto
      const f = +b.dataset.f, c = +b.dataset.c;
      game = null; msg.className = 'tw-msg';
      plan[f] = plan[f] === c ? null : c;
      if (f + 1 > +floorsIn.value && plan[f] !== null) floorsIn.value = f + 1;
      savePlan(); sfx.tick && sfx.tick(); render();
    }));
    updateSide();
    planNote();
  }

  function updateSide() {
    const playing = !!(game && !game.over);
    const lock = playing || autoOn;
    $$('#tw-level button', view).forEach((b) => { b.classList.toggle('on', b.dataset.v === (game ? game.level : level)); b.disabled = lock; });
    bet.disabled = lock;
    $('#tw-random', view).disabled = !playing || autoOn;
    const k = playing ? game.floor : 0;
    const lv = game ? game.level : level;
    $('#tw-cur', view).textContent = fmtX(game && !game.over ? towerMult(lv, k) : 1);
    $('#tw-next', view).textContent = k < FLOORS ? fmtX(towerMult(lv, k + 1)) : '—';
    if (playing && k > 0) { mainBtn.textContent = `Encaisser ${fmt(Math.floor(game.bet * towerMult(lv, k)))}`; mainBtn.className = 'btn btn-green btn-lg wide'; mainBtn.disabled = false; }
    else if (playing) { mainBtn.textContent = 'Choisis une case…'; mainBtn.className = 'btn btn-gold btn-lg wide'; mainBtn.disabled = true; }
    else { mainBtn.textContent = game ? 'Rejouer' : 'Commencer'; mainBtn.className = 'btn btn-gold btn-lg wide'; mainBtn.disabled = false; }
    if (autoOn) { mainBtn.disabled = true; if (!playing) mainBtn.textContent = 'Auto en cours…'; }
  }

  function say(html, cls = '') { msg.className = 'tw-msg show ' + cls; msg.innerHTML = html; }

  function start() {
    const amount = bet.value;
    if (!wallet.bet('tower', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
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
    return true;
  }

  function pick(c) {
    if (!game || game.over) return;
    const f = game.floor;
    game.picks[f] = c;
    if (game.bombs[f].includes(c)) {
      game.over = true;
      wallet.round('tower', 0, { bet: game.bet, level: game.level, floors: f, lostAt: f + 1 });
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
    wallet.win('tower', payout, game.bet);
    wallet.round('tower', payout > game.bet ? payout : 0, { bet: game.bet, level: game.level, floors: game.floor, mult: m, top: game.floor >= FLOORS });
    if (!alive) return;
    render();
    say(`Encaissé à <b>${fmtX(m)}</b> : +${money(payout)}`, 'win');
    sfx.win(m >= 10); if (m >= 10) coinRain(Math.min(60, 15 + m));
  }

  try { const v = +localStorage.getItem('chibouk_tw_auto_floors'); if (v >= 1 && v <= FLOORS) floorsIn.value = v; } catch {}
  floorsIn.onchange = () => { floorsIn.value = Math.max(1, Math.min(FLOORS, Math.floor(+floorsIn.value) || 1)); try { localStorage.setItem('chibouk_tw_auto_floors', floorsIn.value); } catch {} if (!game || game.over) { game = null; render(); } };
  $('#tw-top', view).onclick = () => { floorsIn.value = FLOORS; floorsIn.onchange(); sfx.click(); };
  $('#tw-plan-rand', view).onclick = () => { plan = plan.map(() => randInt(TOWER_LEVELS[level].tiles)); savePlan(); game = null; msg.className = 'tw-msg'; sfx.click(); render(); };
  $('#tw-plan-clear', view).onclick = () => { plan = plan.map(() => null); savePlan(); game = null; msg.className = 'tw-msg'; sfx.click(); render(); };
  const auto = bindAuto(view, 'tw-auto', { wallet, game: 'tower', turbo: true, bet, delay: 600,
    play: async () => {
      if (!start()) return false;
      const target = planFloors();
      game.auto = true;
      render();
      // découverte rapide, étage par étage, des cases du parcours (ou au hasard)
      while (alive && game && !game.over && game.floor < target) {
        await new Promise((r) => setTimeout(r, isTurbo('tower') ? 25 : 170));
        const c = plan[game.floor];
        pick(c !== null && c !== undefined ? c : randInt(TOWER_LEVELS[game.level].tiles));
      }
      if (alive && game && !game.over) { await new Promise((r) => setTimeout(r, isTurbo('tower') ? 25 : 150)); cashOut(); }
      await new Promise((r) => setTimeout(r, isTurbo('tower') ? 60 : game && game.cashed ? 350 : 650));
      return alive;
    },
    onState: (on) => { autoOn = on; floorsIn.disabled = on; $$('.tw-plan button', view).forEach((b) => (b.disabled = on)); if (alive) updateSide(); } });
  mainBtn.onclick = () => { if (game && !game.over) cashOut(); else start(); };
  $('#tw-random', view).onclick = () => { if (game && !game.over) pick(randInt(TOWER_LEVELS[game.level].tiles)); };
  $$('#tw-level button', view).forEach((b) => (b.onclick = () => {
    if (game && !game.over) return;
    level = b.dataset.v; try { localStorage.setItem('chibouk_tower_level', level); } catch {}
    loadPlan();
    game = null; msg.className = 'tw-msg'; sfx.click(); render();
  }));
  $('#tw-rules', view).onclick = () => modal({ title: 'Règles de la Tower', html: `
    <ul class="muted"><li>Mise, choisis une difficulté puis grimpe : à chaque étage, clique sur une case.</li>
    <li>Une banane : tu montes d'un étage et ton multiplicateur augmente. Une bombe : tu perds ta mise.</li>
    <li>Tu peux <b>encaisser</b> à tout moment après le premier étage. Arrivé en haut (${FLOORS} étages), l'encaissement est automatique.</li>
    <li>Facile : 1 bombe sur 4 cases · Moyen : 1 sur 3 · Difficile : 1 sur 2 · Expert : 2 sur 3 · Maître : 3 sur 4.</li>
    <li>Le multiplicateur est calculé pour un RTP de 99 % à chaque étage.</li>
    <li><b>Paris automatiques</b> : choisis le nombre d'étages (ou « Jusqu'en haut ») et, si tu veux, clique sur les cases du plateau avant de lancer pour tracer ton parcours. Les étages sans case choisie sont joués au hasard.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });

  const onKey = (e) => {
    if (e.target.closest('input,textarea') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (game && !game.over && game.floor > 0) cashOut(); else if (!game || game.over) start(); }
  };
  document.addEventListener('keydown', onKey);

  render();
  return () => {
    alive = false;
    auto.stop();
    document.removeEventListener('keydown', onKey);
    // partie en cours : on encaisse au palier atteint, ou on rembourse si aucune case n'a été choisie
    if (game && !game.over) {
      if (game.floor > 0) cashOut();
      else { game.over = true; wallet.refund('tower', game.bet); }
    }
  };
}
