// Hi-Lo — la carte suivante sera-t-elle plus haute ou plus basse ? Chaque bonne réponse fait grimper le multiplicateur.
// Paquet infini (chaque rang a 1 chance sur 13). Multiplicateur = 0,99 × Π(1 / probabilité de chaque pari) → RTP 99 %.
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];
const SUITS = [['♠', 0], ['♥', 1], ['♦', 1], ['♣', 0]];
const fx = (m) => '×' + m.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const drawCard = () => ({ r: randInt(13) + 1, s: randInt(4) });

// Les deux paris possibles sur une carte de rang r (1 = As … 13 = Roi)
export function options(r) {
  const hi = r === 1 ? { k: 'hi', label: 'Plus haut', p: 12 / 13, test: (n) => n > r }
    : r === 13 ? { k: 'eq', label: 'Égal', p: 1 / 13, test: (n) => n === r }
      : { k: 'hi', label: 'Plus haut ou égal', p: (14 - r) / 13, test: (n) => n >= r };
  const lo = r === 13 ? { k: 'lo', label: 'Plus bas', p: 12 / 13, test: (n) => n < r }
    : r === 1 ? { k: 'eq', label: 'Égal', p: 1 / 13, test: (n) => n === r }
      : { k: 'lo', label: 'Plus bas ou égal', p: r / 13, test: (n) => n <= r };
  return [hi, lo];
}

function cardHTML(c, cls = '') {
  const [s, red] = SUITS[c.s];
  return `<div class="hl-card ${red ? 'red' : ''} ${cls}"><span class="tl">${RANKS[c.r - 1]}<i>${s}</i></span><b>${s}</b><span class="br">${RANKS[c.r - 1]}<i>${s}</i></span></div>`;
}

export function mount(view, { wallet }) {
  let alive = true, busy = false, autoLeft = 0;
  let game = null; // { bet, card, mult, steps, trail: [] }
  let autoSteps = 3;
  try { const a = +localStorage.getItem('chibouk_hilo_auto'); if (a >= 1) autoSteps = a; } catch {}

  view.innerHTML = `
  <div class="hl-wrap">
    <div class="game-head"><h1>Hi-<span>Lo</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="hl-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('hl-bet')}
        <button class="btn btn-gold btn-lg wide" id="hl-start">Miser</button>
        <button class="btn btn-gold btn-lg wide" id="hl-cash" hidden>Encaisser</button>
        ${autoHTML('hl-auto', 'Paris automatiques', `<div class="bet-field"><label for="hl-auto-steps">Encaisser après (bonnes réponses)</label><input id="hl-auto-steps" class="bet-input" type="number" min="1" max="20" step="1" inputmode="numeric"></div><p class="ab-note">L'auto parie toujours sur le côté le plus probable.</p>`)}
        <div class="plk-info"><span>Multiplicateur</span><b id="hl-mult">×1,00</b></div>
        <div class="plk-info"><span>Gain actuel</span><b id="hl-pot">—</b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="hl-stage">
        <div class="hl-table">
          <div class="hl-deck">${cardHTML({ r: 1, s: 0 }, 'back')}</div>
          <div class="hl-current" id="hl-current"></div>
        </div>
        <div class="hl-actions">
          <button class="hl-btn hi" id="hl-hi" disabled><span class="hl-lab"></span><small></small></button>
          <button class="btn btn-ghost" id="hl-skip" disabled>Passer la carte</button>
          <button class="hl-btn lo" id="hl-lo" disabled><span class="hl-lab"></span><small></small></button>
        </div>
        <div class="hl-msg" id="hl-msg">Mise, puis devine si la carte suivante sera plus haute ou plus basse.</div>
        <div class="hl-trail" id="hl-trail"></div>
      </div>
    </div>
  </div>`;

  const bet = bindBetField(view, 'hl-bet', 'chibouk_hilo_bet', wallet, 10);
  const stepsIn = $('#hl-auto-steps', view);
  stepsIn.value = autoSteps;
  stepsIn.onchange = () => { autoSteps = Math.max(1, Math.min(20, Math.floor(+stepsIn.value) || 3)); stepsIn.value = autoSteps; try { localStorage.setItem('chibouk_hilo_auto', autoSteps); } catch {} };
  let current = drawCard();
  $('#hl-current', view).innerHTML = cardHTML(current);

  function render() {
    if (!alive) return;
    const playing = !!game;
    $('#hl-start', view).hidden = playing;
    $('#hl-cash', view).hidden = !playing;
    $('#hl-cash', view).disabled = !playing || busy || game.steps === 0 || autoLeft > 0;
    bet.disabled = playing || autoLeft > 0;
    $('#hl-start', view).disabled = busy || autoLeft > 0;
    const [hi, lo] = options(current.r);
    const m = game ? game.mult : 0.99;
    for (const [id, o] of [['#hl-hi', hi], ['#hl-lo', lo]]) {
      const b = $(id, view);
      b.disabled = !playing || busy || autoLeft > 0;
      $('.hl-lab', b).textContent = o.label;
      $('small', b).textContent = `${(o.p * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % · ${fx((game ? game.mult : 0.99) / o.p)}`;
      b.dataset.k = o.k;
    }
    $('#hl-skip', view).disabled = !playing || busy || autoLeft > 0;
    $('#hl-mult', view).textContent = game ? fx(game.mult) : '×1,00';
    $('#hl-pot', view).innerHTML = game && game.steps ? money(Math.floor(game.bet * game.mult)) : '—';
    $('#hl-trail', view).innerHTML = game ? game.trail.map((t) => `<span class="${t.ok ? 'good' : 'bad'}">${RANKS[t.r - 1]} ${t.k === 'hi' ? '▲' : t.k === 'lo' ? '▼' : t.k === 'eq' ? '=' : '↷'}</span>`).join('') : '';
    void m;
  }

  function start() {
    if (game || busy) return false;
    const amount = bet.value;
    if (!wallet.bet('hilo', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    game = { bet: amount, mult: 0.99, steps: 0, trail: [] };
    $('#hl-msg', view).textContent = 'Plus haut ou plus bas ?';
    sfx.click();
    render();
    return true;
  }

  async function flip(next) {
    const cur = $('#hl-current', view);
    cur.innerHTML = cardHTML(next, 'deal');
    sfx.tick && sfx.tick();
    await sleep(autoLeft ? 160 : 380);
  }

  async function guess(which) {
    if (!game || busy) return;
    const [hi, lo] = options(current.r);
    const o = which === 'hi' ? hi : lo;
    busy = true; render();
    const next = drawCard();
    await flip(next);
    if (!alive) return;
    const ok = o.test(next.r);
    game.trail.push({ r: current.r, k: o.k, ok });
    current = next;
    if (ok) {
      game.mult = game.mult / o.p;
      game.steps++;
      sfx.coin();
      $('#hl-msg', view).innerHTML = `Bien vu ! Multiplicateur ${fx(game.mult)}. Continue ou encaisse.`;
      busy = false; render();
    } else {
      sfx.lose();
      view.querySelector('.hl-stage').classList.add('lose');
      setTimeout(() => view.querySelector('.hl-stage')?.classList.remove('lose'), 600);
      $('#hl-msg', view).innerHTML = `Raté… La mise de ${money(game.bet)} est perdue.`;
      wallet.round('hilo', 0, { bet: game.bet, steps: game.steps, lost: true, eq: false });
      game = null; busy = false; render();
    }
    return ok;
  }

  function skip() {
    if (!game || busy) return;
    game.trail.push({ r: current.r, k: 'skip', ok: true });
    current = drawCard();
    flip(current).then(() => render());
  }

  function cash() {
    if (!game || busy || game.steps === 0) return;
    const payout = Math.floor(game.bet * game.mult);
    wallet.win('hilo', payout, game.bet);
    wallet.round('hilo', payout > game.bet ? payout : 0, { bet: game.bet, steps: game.steps, mult: game.mult, lost: false, eq: game.trail.some((t) => t.k === 'eq' && t.ok) });
    $('#hl-msg', view).innerHTML = `Encaissé : +${money(payout)} (${fx(game.mult)})`;
    sfx.win(game.mult >= 10);
    if (game.mult >= 10) coinRain(Math.min(60, 10 + game.mult));
    game = null;
    render();
  }

  $('#hl-start', view).onclick = start;
  $('#hl-cash', view).onclick = cash;
  $('#hl-hi', view).onclick = () => guess('hi');
  $('#hl-lo', view).onclick = () => guess('lo');
  $('#hl-skip', view).onclick = skip;

  const auto = bindAuto(view, 'hl-auto', { wallet, game: 'hilo', delay: 250,
    play: async () => {
      if (!start()) return false;
      while (alive && game && game.steps < autoSteps) {
        const [hi, lo] = options(current.r);
        const ok = await guess(hi.p >= lo.p ? 'hi' : 'lo');
        if (!ok) return alive;
        await sleep(120);
      }
      if (alive && game) cash();
      return alive;
    },
    onState: (on) => { autoLeft = on ? 1 : 0; if (alive) render(); } });

  $('#hl-rules', view).onclick = () => modal({ title: 'Règles du Hi-Lo', html: `
    <ul class="muted"><li>Mise, puis devine si la <b>carte suivante</b> sera plus haute ou plus basse que celle affichée (As = la plus basse, Roi = la plus haute).</li>
    <li>« Plus haut ou égal » / « Plus bas ou égal » : une carte du même rang compte comme gagnée. Sur un As ou un Roi, tu peux parier « Égal ».</li>
    <li>Chaque bonne réponse multiplie ton gain selon sa difficulté (affiché sur les boutons). Une erreur et la mise est perdue.</li>
    <li><b>Encaisse</b> quand tu veux après au moins une bonne réponse. « Passer la carte » tire une nouvelle carte sans risque.</li>
    <li>Paquet infini : chaque rang a toujours 1 chance sur 13. RTP de 99 %.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });

  const onKey = (e) => {
    if (e.target.closest('input,textarea') || document.querySelector('.modal-backdrop') || autoLeft) return;
    if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); if (!game) start(); else cash(); }
    if (game && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); guess(e.key === 'ArrowUp' ? 'hi' : 'lo'); }
  };
  document.addEventListener('keydown', onKey);
  render();
  return () => {
    alive = false; autoLeft = 0; auto.stop(); document.removeEventListener('keydown', onKey);
    // partie en cours : encaissée si au moins une bonne réponse, sinon remboursée
    if (game) {
      if (game.steps > 0) { const payout = Math.floor(game.bet * game.mult); wallet.win('hilo', payout, game.bet); wallet.round('hilo', payout > game.bet ? payout : 0, { bet: game.bet, steps: game.steps, mult: game.mult }); }
      else wallet.refund('hilo', game.bet);
    }
  };
}
