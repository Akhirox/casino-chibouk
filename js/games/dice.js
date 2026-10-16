// Dice — choisis ta chance de gain : un nombre entre 0,00 et 100,00 est tiré, plus la chance est faible plus ça paie
// Multiplicateur = 99 / chance  → RTP ≈ 99 %
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR, isTurbo } from '../ui.js';
import { sfx } from '../sfx.js';

const MIN_CH = 0.01, MAX_CH = 98;
const r2 = (x) => Math.round(x * 100) / 100;
const fmt2 = (x) => x.toFixed(2).replace('.', ',');
export const diceMult = (chance) => Math.floor((99 / chance) * 10000) / 10000;

export function mount(view, { wallet }) {
  let alive = true;
  let mode = 'under', target = 50;
  try {
    const m = localStorage.getItem('chibouk_dice_mode'); if (m === 'under' || m === 'over') mode = m;
    const t = +localStorage.getItem('chibouk_dice_target'); if (t > 0 && t < 100) target = t;
  } catch {}
  let rolling = false, autoLeft = 0, lastResult = null;
  let history = [];

  view.innerHTML = `
  <div class="dc-wrap">
    <div class="game-head"><h1><span>Dice</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="dc-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('dc-bet')}
        <div class="seg-field"><label>Je gagne si le résultat est</label>
          <div class="seg" id="dc-mode"><button data-v="under">En dessous</button><button data-v="over">Au-dessus</button></div></div>
        <div class="dc-fields">
          <div class="bet-field"><label for="dc-target">Objectif</label><input id="dc-target" class="bet-input" type="number" step="0.01" inputmode="decimal"></div>
          <div class="bet-field"><label for="dc-chance">Chance %</label><input id="dc-chance" class="bet-input" type="number" step="0.01" inputmode="decimal"></div>
          <div class="bet-field"><label for="dc-mult">Multi ×</label><input id="dc-mult" class="bet-input" type="number" step="0.0001" inputmode="decimal"></div>
        </div>
        <button class="btn btn-gold btn-lg wide" id="dc-roll">Lancer le dé</button>
        ${autoHTML('dc-auto')}
        <div class="plk-info"><span>Gain si victoire</span><b id="dc-pot"></b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="dc-stage">
        <div class="dc-result" id="dc-result">50,00</div>
        <div class="dc-sub" id="dc-sub">Choisis ta chance, puis lance le dé</div>
        <div class="dc-slider">
          <div class="dc-track" id="dc-track"></div>
          <div class="dc-marker" id="dc-marker"><span></span></div>
          <input type="range" id="dc-range" min="0.01" max="99.99" step="0.01" aria-label="Objectif">
          <div class="dc-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
        </div>
        <div class="dc-hist" id="dc-hist"></div>
      </div>
    </div>
  </div>`;

  const bet = bindBetField(view, 'dc-bet', 'chibouk_dice_bet', wallet, 10);
  const tIn = $('#dc-target', view), cIn = $('#dc-chance', view), mIn = $('#dc-mult', view), range = $('#dc-range', view);
  const resEl = $('#dc-result', view), subEl = $('#dc-sub', view), marker = $('#dc-marker', view), track = $('#dc-track', view);

  const chance = () => r2(mode === 'under' ? target : 100 - target);
  function clampTargetFromChance(ch) {
    ch = Math.min(MAX_CH, Math.max(MIN_CH, r2(ch)));
    target = r2(mode === 'under' ? ch : 100 - ch);
  }
  function save() { try { localStorage.setItem('chibouk_dice_mode', mode); localStorage.setItem('chibouk_dice_target', target); } catch {} }

  function refresh(skip) {
    clampTargetFromChance(chance());
    const ch = chance();
    if (skip !== tIn) tIn.value = target.toFixed(2);
    if (skip !== cIn) cIn.value = ch.toFixed(2);
    if (skip !== mIn) mIn.value = diceMult(ch).toFixed(4);
    if (skip !== range) range.value = target;
    $$('#dc-mode button', view).forEach((b) => b.classList.toggle('on', b.dataset.v === mode));
    const red = '#ff4d5e', green = '#3ddc84';
    track.style.background = mode === 'under'
      ? `linear-gradient(90deg, ${green} 0 ${target}%, ${red} ${target}% 100%)`
      : `linear-gradient(90deg, ${red} 0 ${target}%, ${green} ${target}% 100%)`;
    $('#dc-pot', view).innerHTML = money(Math.floor(bet.value * diceMult(ch)));
    save();
  }

  tIn.onchange = () => { target = +tIn.value || 50; refresh(); };
  cIn.onchange = () => { clampTargetFromChance(+cIn.value || 50); refresh(); };
  mIn.onchange = () => { const m = Math.max(1.0102, +mIn.value || 2); clampTargetFromChance(99 / m); refresh(); };
  range.oninput = () => { target = +range.value; refresh(range); };
  range.onchange = () => refresh();
  view.querySelector('#dc-bet').addEventListener('input', () => refresh());
  view.querySelector('.bet-field').addEventListener('click', () => setTimeout(() => refresh(), 0));
  $$('#dc-mode button', view).forEach((b) => (b.onclick = () => {
    if (b.dataset.v === mode) return;
    const ch = chance();
    mode = b.dataset.v;
    clampTargetFromChance(ch);   // on garde la même chance, l'objectif bascule de côté
    sfx.click(); refresh();
  }));

  function setDisabled(d) {
    bet.disabled = d;
    [tIn, cIn, mIn, range].forEach((el) => (el.disabled = d));
    $$('#dc-mode button', view).forEach((b) => (b.disabled = d));
    $('#dc-roll', view).disabled = d;
  }

  async function roll() {
    if (rolling) return false;
    const amount = bet.value;
    if (!wallet.bet('dice', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    rolling = true;
    setDisabled(true);
    const ch = chance(), mult = diceMult(ch);
    const r = randInt(10001) / 100; // 0,00 … 100,00
    const win = mode === 'under' ? r < target : r > target;
    const payout = win ? Math.floor(amount * mult) : 0;
    const reveal = wallet.deferEvents(() => {
      if (payout) wallet.win('dice', payout, amount);
      wallet.round('dice', payout > amount ? payout : 0, { bet: amount, chance: ch, mult, win, roll: r, mode });
    });

    // animation : défilement des chiffres puis le marqueur glisse sur le résultat
    if (!isTurbo('dice')) sfx.spinStart();
    resEl.className = 'dc-result rolling';
    const t0 = performance.now(), dur = isTurbo('dice') ? 70 : autoLeft > 0 ? 220 : 420;
    while (performance.now() - t0 < dur && alive) {
      resEl.textContent = fmt2(randInt(10001) / 100);
      await sleep(40);
    }
    reveal();
    if (!alive) return true;
    resEl.textContent = fmt2(r);
    resEl.className = 'dc-result ' + (win ? 'win' : 'lose');
    marker.style.left = r + '%';
    marker.className = 'dc-marker show ' + (win ? 'win' : 'lose');
    marker.querySelector('span').textContent = fmt2(r);
    subEl.innerHTML = win ? `Gagné ! ${fmt2(r)} est ${mode === 'under' ? 'sous' : 'au-dessus de'} ${fmt2(target)} : +${money(payout)}` : `Perdu : ${fmt2(r)} n'est pas ${mode === 'under' ? 'sous' : 'au-dessus de'} ${fmt2(target)}`;
    if (win) { sfx.coin(); if (mult >= 10) { sfx.win(true); coinRain(Math.min(60, 10 + mult)); } } else if (!isTurbo('dice')) sfx.lose();
    history.unshift({ r, win }); history = history.slice(0, 18);
    $('#dc-hist', view).innerHTML = history.map((x) => `<span class="${x.win ? 'good' : 'bad'}">${fmt2(x.r)}</span>`).join('');
    lastResult = r;
    rolling = false;
    if (autoLeft === 0) setDisabled(false);
    return true;
  }

  const auto = bindAuto(view, 'dc-auto', { wallet, game: 'dice', turbo: true, bet, delay: 220,
    play: () => roll(),
    onState: (on) => { autoLeft = on ? 1 : 0; if (alive) setDisabled(on); } });

  $('#dc-roll', view).onclick = () => roll();
  $('#dc-rules', view).onclick = () => modal({ title: 'Règles du Dice', html: `
    <ul class="muted"><li>Un nombre est tiré entre <b>0,00 et 100,00</b> (deux décimales).</li>
    <li>Choisis si tu gagnes quand il tombe <b>en dessous</b> ou <b>au-dessus</b> de ton objectif. Glisse le curseur ou tape l'objectif, la chance ou le multiplicateur : les trois sont liés.</li>
    <li>Plus ta chance est faible, plus le gain est gros : multiplicateur = 99 ÷ chance. Exemples : 50 % → ×1,98, 10 % → ×9,9, 1 % → ×99, 0,01 % → ×9 900.</li>
    <li>Chance possible de 0,01 % à 98 %. RTP de 99 %.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });

  const onKey = (e) => {
    if (e.target.closest('input,textarea,button') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!autoLeft) roll(); }
  };
  document.addEventListener('keydown', onKey);

  refresh();
  setDisabled(false);
  return () => { alive = false; autoLeft = 0; auto.stop(); document.removeEventListener('keydown', onKey); };
}
