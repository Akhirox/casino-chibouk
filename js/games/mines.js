// Mines — grille 5×5 : choisis le nombre de mines, révèle des bananes, encaisse avant de tomber sur une mine
// Multiplicateur après k bananes = 0,99 × Π (25−i)/(25−mines−i)  → RTP 99 %
import { randInt } from './slots-math.js';
import { icon, bananaTileSVG, bombTileSVG } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const N = 25;
export function minesMult(mines, k) {
  let m = 0.99;
  if (k <= 0) return 1;
  for (let i = 0; i < k; i++) m *= (N - i) / (N - mines - i);
  return Math.floor(m * 100) / 100;
}
const fmtX = (m) => '×' + (m >= 1000 ? fmt(m) : m.toFixed(2).replace('.', ','));

export function mount(view, { wallet }) {
  let alive = true;
  let mines = 3;
  try { const v = +localStorage.getItem('chibouk_mines_n'); if (v >= 1 && v <= 24) mines = v; } catch {}
  let game = null; // { bet, mines, set: Set(mine positions), revealed: Set, over, lostAt }

  view.innerHTML = `
  <div class="mn-wrap">
    <div class="game-head"><h1><span>Mines</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="mn-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('mn-bet')}
        <div class="bet-field"><label for="mn-count">Nombre de mines : <b id="mn-count-val" class="gold"></b></label>
          <input type="range" id="mn-count" min="1" max="24" step="1" class="range">
          <div class="auto-row">${[1, 3, 5, 10, 24].map((v) => `<button class="btn btn-ghost btn-sm" data-m="${v}">${v}</button>`).join('')}</div></div>
        <button class="btn btn-gold btn-lg wide" id="mn-main">Commencer</button>
        <button class="btn btn-ghost wide" id="mn-random">Case au hasard</button>
        ${autoHTML('mn-auto', 'Paris automatiques', '<label class="ab-extra">Bananes à révéler avant d\'encaisser<input class="bet-input" type="number" min="1" max="24" step="1" id="mn-auto-picks" value="3"></label>')}
        <div class="plk-info"><span>Multiplicateur actuel</span><b id="mn-cur">×1,00</b></div>
        <div class="plk-info"><span>Prochaine banane</span><b id="mn-next"></b></div>
        <div class="plk-info"><span>Chance de banane</span><b id="mn-chance"></b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="mn-stage"><div class="mn-grid" id="mn-grid">${Array.from({ length: N }, (_, i) => `<button class="mn-tile" data-i="${i}"></button>`).join('')}</div><div class="tw-msg" id="mn-msg"></div></div>
    </div>
  </div>`;

  const grid = $('#mn-grid', view), msg = $('#mn-msg', view), mainBtn = $('#mn-main', view);
  const range = $('#mn-count', view);
  const bet = bindBetField(view, 'mn-bet', 'chibouk_mines_bet', wallet, 10);
  range.value = mines;

  function setMines(v) {
    if (game && !game.over) return;
    mines = Math.max(1, Math.min(24, v | 0));
    range.value = mines;
    try { localStorage.setItem('chibouk_mines_n', mines); } catch {}
    if (game && game.over) { game = null; msg.className = 'tw-msg'; }
    render();
  }
  range.oninput = () => setMines(+range.value);
  $$('[data-m]', view).forEach((b) => (b.onclick = () => { setMines(+b.dataset.m); sfx.click(); }));

  function render() {
    const tiles = $$('.mn-tile', grid);
    tiles.forEach((t, i) => {
      t.className = 'mn-tile';
      t.innerHTML = '';
      if (!game) return;
      const isMine = game.set.has(i), rev = game.revealed.has(i);
      if (rev) { t.classList.add('safe'); t.innerHTML = bananaTileSVG(); }
      else if (game.over && isMine) { t.classList.add('bomb'); if (game.lostAt !== i) t.classList.add('dim'); else t.classList.add('boom'); t.innerHTML = bombTileSVG(); }
      else if (game.over) { t.classList.add('safe', 'ghost'); t.innerHTML = bananaTileSVG(); }
    });
    updateSide();
  }

  function updateSide() {
    const playing = !!(game && !game.over);
    const lock = playing || autoOn;
    const m = game ? game.mines : mines;
    const k = game ? game.revealed.size : 0;
    $('#mn-count-val', view).textContent = m;
    range.disabled = lock;
    $$('[data-m]', view).forEach((b) => (b.disabled = lock));
    bet.disabled = lock;
    $('#mn-random', view).disabled = !playing || autoOn;
    $('#mn-cur', view).textContent = fmtX(playing ? minesMult(m, k) : 1);
    const left = N - m - (playing ? k : 0);
    $('#mn-next', view).textContent = left > 0 ? fmtX(minesMult(m, (playing ? k : 0) + 1)) : '—';
    $('#mn-chance', view).textContent = left > 0 ? ((left / (N - (playing ? k : 0))) * 100).toFixed(1).replace('.', ',') + ' %' : '—';
    grid.classList.toggle('playing', !!playing);
    if (playing && k > 0) { mainBtn.textContent = `Encaisser ${fmt(Math.floor(game.bet * minesMult(m, k)))}`; mainBtn.className = 'btn btn-green btn-lg wide'; mainBtn.disabled = false; }
    else if (playing) { mainBtn.textContent = 'Choisis une case…'; mainBtn.className = 'btn btn-gold btn-lg wide'; mainBtn.disabled = true; }
    else { mainBtn.textContent = game ? 'Rejouer' : 'Commencer'; mainBtn.className = 'btn btn-gold btn-lg wide'; mainBtn.disabled = false; }
    if (autoOn) { mainBtn.disabled = true; if (!playing) mainBtn.textContent = 'Auto en cours…'; }
  }

  function say(html, cls = '') { msg.className = 'tw-msg show ' + cls; msg.innerHTML = html; }

  function start() {
    const amount = bet.value;
    if (!wallet.bet('mines', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    const pos = [...Array(N).keys()];
    for (let i = N - 1; i > 0; i--) { const j = randInt(i + 1); [pos[i], pos[j]] = [pos[j], pos[i]]; }
    game = { bet: amount, mines, set: new Set(pos.slice(0, mines)), revealed: new Set(), over: false, lostAt: -1 };
    msg.className = 'tw-msg';
    sfx.click();
    render();
    return true;
  }

  function reveal(i) {
    if (!game || game.over || game.revealed.has(i)) return;
    if (game.set.has(i)) {
      game.over = true; game.lostAt = i;
      wallet.round('mines', 0, { bet: game.bet, mines: game.mines, picks: game.revealed.size, lost: true });
      sfx.lose();
      render();
      grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
      say(`Boum ! Mine trouvée après ${game.revealed.size} banane${game.revealed.size > 1 ? 's' : ''}, mise perdue`, 'lose');
      return;
    }
    game.revealed.add(i);
    sfx.brick(1 + game.revealed.size * 0.05);
    render();
    if (game.revealed.size >= N - game.mines) cashOut();
  }

  function cashOut() {
    if (!game || game.over || game.revealed.size === 0) return;
    const m = minesMult(game.mines, game.revealed.size);
    const payout = Math.floor(game.bet * m);
    game.over = true;
    wallet.win('mines', payout, game.bet);
    wallet.round('mines', payout > game.bet ? payout : 0, { bet: game.bet, mines: game.mines, picks: game.revealed.size, mult: m, lost: false });
    if (!alive) return;
    render();
    say(`Encaissé à <b>${fmtX(m)}</b> : +${money(payout)}`, 'win');
    sfx.win(m >= 10); if (m >= 10) coinRain(Math.min(60, 15 + m));
  }

  let autoOn = false;
  const picksIn = $('#mn-auto-picks', view);
  try { const v = +localStorage.getItem('chibouk_mn_auto_picks'); if (v >= 1 && v <= 24) picksIn.value = v; } catch {}
  picksIn.onchange = () => { picksIn.value = Math.max(1, Math.min(24, Math.floor(+picksIn.value) || 1)); try { localStorage.setItem('chibouk_mn_auto_picks', picksIn.value); } catch {} };
  const auto = bindAuto(view, 'mn-auto', { wallet, game: 'mines', delay: 600,
    play: async () => {
      if (!start()) return false;
      const target = Math.max(1, Math.min(N - game.mines, +picksIn.value || 1));
      while (alive && game && !game.over && game.revealed.size < target) {
        await new Promise((r) => setTimeout(r, 200));
        const free = [...Array(N).keys()].filter((i) => !game.revealed.has(i));
        reveal(free[randInt(free.length)]);
      }
      if (alive && game && !game.over) { await new Promise((r) => setTimeout(r, 200)); cashOut(); }
      return alive;
    },
    onState: (on) => { autoOn = on; picksIn.disabled = on; if (alive) updateSide(); } });
  grid.addEventListener('click', (e) => { const t = e.target.closest('.mn-tile'); if (t) reveal(+t.dataset.i); });
  mainBtn.onclick = () => { if (game && !game.over) cashOut(); else start(); };
  $('#mn-random', view).onclick = () => {
    if (!game || game.over) return;
    const free = [...Array(N).keys()].filter((i) => !game.revealed.has(i));
    reveal(free[randInt(free.length)]);
  };
  $('#mn-rules', view).onclick = () => modal({ title: 'Règles des Mines', html: `
    <ul class="muted"><li>Choisis ta mise et le nombre de mines (1 à 24) cachées dans la grille de 25 cases, puis clique sur <b>Commencer</b>.</li>
    <li>Chaque banane trouvée augmente le multiplicateur. Plus il y a de mines, plus il monte vite… et plus c'est risqué.</li>
    <li>Tu peux <b>encaisser</b> à tout moment après la première banane. Si tu tombes sur une mine, tu perds ta mise.</li>
    <li>Exemple avec 3 mines : 1 banane = ×1,12, 5 bananes = ×1,99, 10 bananes = ×5,00. Avec 24 mines, la seule banane paie ×24,75.</li>
    <li>RTP de 99 % quel que soit le moment où tu encaisses.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });

  const onKey = (e) => {
    if (e.target.closest('input,textarea') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (game && !game.over && game.revealed.size > 0) cashOut(); else if (!game || game.over) start(); }
  };
  document.addEventListener('keydown', onKey);

  render();
  return () => {
    alive = false;
    auto.stop();
    document.removeEventListener('keydown', onKey);
    if (game && !game.over) {
      if (game.revealed.size > 0) cashOut();
      else { game.over = true; wallet.refund('mines', game.bet); }
    }
  };
}
