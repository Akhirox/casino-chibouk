// Limbo — choisis un multiplicateur cible : si le multiplicateur tiré l'atteint, tu gagnes mise × cible.
// Résultat = 0,99 ÷ U (U uniforme) → P(résultat ≥ cible) = 0,99 ÷ cible → RTP 99 %
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const MIN_T = 1.01, MAX_T = 1000000;
const f2 = (x) => x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function limboRoll() {
  const u = (randInt(1000000000) + 1) / 1000000000; // ]0, 1]
  return Math.max(1, Math.floor((0.99 / u) * 100) / 100);
}

export function mount(view, { wallet }) {
  let alive = true, busy = false, autoLeft = 0, target = 2;
  try { const t = +localStorage.getItem('chibouk_limbo_target'); if (t >= MIN_T) target = t; } catch {}
  let history = [];

  view.innerHTML = `
  <div class="lb-wrap">
    <div class="game-head"><h1><span>Limbo</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="lb-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('lb-bet')}
        <div class="dc-fields lb-fields">
          <div class="bet-field"><label for="lb-target">Multi cible ×</label><input id="lb-target" class="bet-input" type="number" step="0.01" min="${MIN_T}" inputmode="decimal"></div>
          <div class="bet-field"><label for="lb-chance">Chance %</label><input id="lb-chance" class="bet-input" type="number" step="0.000001" inputmode="decimal"></div>
        </div>
        <div class="lb-quick">${[1.5, 2, 3, 5, 10, 100].map((v) => `<button class="btn btn-ghost btn-sm" data-t="${v}">×${String(v).replace('.', ',')}</button>`).join('')}</div>
        <button class="btn btn-gold btn-lg wide" id="lb-play">Jouer</button>
        ${autoHTML('lb-auto')}
        <div class="plk-info"><span>Gain si victoire</span><b id="lb-pot"></b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="lb-stage">
        <div class="lb-rocket">${icon('rocket')}</div>
        <div class="lb-result" id="lb-result">1,00×</div>
        <div class="lb-sub" id="lb-sub">Fixe ta cible : plus elle est haute, plus c'est rare… et plus ça paie.</div>
        <div class="dc-hist" id="lb-hist"></div>
      </div>
    </div>
  </div>`;

  const bet = bindBetField(view, 'lb-bet', 'chibouk_limbo_bet', wallet, 10);
  const tIn = $('#lb-target', view), cIn = $('#lb-chance', view), res = $('#lb-result', view), sub = $('#lb-sub', view);

  function refresh(skip) {
    target = Math.min(MAX_T, Math.max(MIN_T, Math.round(target * 100) / 100));
    if (skip !== tIn) tIn.value = target.toFixed(2);
    if (skip !== cIn) cIn.value = +(99 / target).toFixed(6);
    $('#lb-pot', view).innerHTML = money(Math.floor(bet.value * target));
    try { localStorage.setItem('chibouk_limbo_target', target); } catch {}
  }
  tIn.onchange = () => { target = +String(tIn.value).replace(',', '.') || 2; refresh(); };
  cIn.onchange = () => { const c = Math.min(98.02, Math.max(0.000099, +cIn.value || 49.5)); target = 99 / c; refresh(); };
  $$('.lb-quick button', view).forEach((b) => (b.onclick = () => { target = +b.dataset.t; sfx.click(); refresh(); }));
  view.querySelector('#lb-bet').addEventListener('input', () => refresh());
  view.querySelector('.bet-field').addEventListener('click', () => setTimeout(() => refresh(), 0));

  function setDisabled(d) {
    bet.disabled = d;
    [tIn, cIn].forEach((el) => (el.disabled = d));
    $$('.lb-quick button', view).forEach((b) => (b.disabled = d));
    $('#lb-play', view).disabled = d;
  }

  async function play() {
    if (busy) return false;
    const amount = bet.value, t = target;
    if (!wallet.bet('limbo', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    busy = true; setDisabled(true);
    const r = limboRoll();
    const win = r >= t;
    const payout = win ? Math.floor(amount * t) : 0;
    if (payout) wallet.win('limbo', payout, amount);
    wallet.round('limbo', payout > amount ? payout : 0, { bet: amount, target: t, result: r, win });

    // animation : le multiplicateur grimpe jusqu'au résultat
    res.className = 'lb-result rolling';
    view.querySelector('.lb-stage').classList.remove('win', 'lose');
    sfx.spinStart();
    const dur = autoLeft ? 260 : Math.min(1100, 380 + Math.log10(r) * 260);
    const t0 = performance.now();
    while (alive) {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      res.textContent = f2(Math.pow(r, e)) + '×';
      if (k >= 1) break;
      await sleep(16);
    }
    if (!alive) return true;
    res.textContent = f2(r) + '×';
    res.className = 'lb-result ' + (win ? 'win' : 'lose');
    view.querySelector('.lb-stage').classList.add(win ? 'win' : 'lose');
    sub.innerHTML = win ? `Gagné ! ${f2(r)}× ≥ ${f2(t)}× : +${money(payout)}` : `Perdu : ${f2(r)}× n'atteint pas ${f2(t)}×`;
    if (win) { sfx.coin(); if (t >= 10) { sfx.win(true); coinRain(Math.min(60, 10 + Math.log10(t) * 15)); } } else sfx.lose();
    history.unshift({ r, win }); history = history.slice(0, 16);
    $('#lb-hist', view).innerHTML = history.map((x) => `<span class="${x.win ? 'good' : 'bad'}">${f2(x.r)}×</span>`).join('');
    busy = false;
    if (!autoLeft) setDisabled(false);
    return true;
  }

  const auto = bindAuto(view, 'lb-auto', { wallet, game: 'limbo', delay: 200, play: () => play(), onState: (on) => { autoLeft = on ? 1 : 0; if (alive) setDisabled(on); } });
  $('#lb-play', view).onclick = () => play();
  $('#lb-rules', view).onclick = () => modal({ title: 'Règles du Limbo', html: `
    <ul class="muted"><li>Choisis un <b>multiplicateur cible</b> (de ×1,01 à ×1 000 000).</li>
    <li>Un multiplicateur est tiré au hasard. S'il est <b>supérieur ou égal</b> à ta cible, tu gagnes <b>mise × cible</b>.</li>
    <li>Chance de gagner = 99 ÷ cible : ×2 → 49,5 %, ×10 → 9,9 %, ×100 → 0,99 %.</li>
    <li>RTP de 99 % quelle que soit la cible.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  const onKey = (e) => {
    if (e.target.closest('input,textarea,button') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!autoLeft) play(); }
  };
  document.addEventListener('keydown', onKey);
  refresh();
  return () => { alive = false; autoLeft = 0; auto.stop(); document.removeEventListener('keydown', onKey); };
}
