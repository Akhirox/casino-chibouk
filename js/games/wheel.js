// Roue du Singe — 30 cases, 3 niveaux de risque. Chaque case a la même chance de tomber :
// RTP = moyenne des multiplicateurs de la roue = 99 % pour chaque risque.
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const SEG = 30;
// [multiplicateur, nombre de cases]
export const WHEEL_RISKS = {
  low: { name: 'Faible', parts: [[0, 10], [1.2, 14], [1.5, 4], [2, 1], [4.9, 1]] },
  medium: { name: 'Moyen', parts: [[0, 16], [1.5, 7], [2, 4], [3, 2], [5.2, 1]] },
  high: { name: 'Élevé', parts: [[0, 29], [29.7, 1]] },
};
const COLORS = { 0: '#2b3a31', 1.2: '#3ddc84', 1.5: '#2fb1ff', 1.7: '#2fb1ff', 2: '#f5c542', 3: '#ff8a3d', 4.9: '#c77dff', 5.2: '#c77dff', 29.7: '#ff4d5e' };
const colorOf = (m) => COLORS[m] || '#ff4d5e';
const fx = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

// Disposition : les cases gagnantes sont réparties régulièrement entre les zéros
export function layout(risk) {
  const parts = WHEEL_RISKS[risk].parts;
  const wins = parts.filter(([m]) => m > 0).flatMap(([m, n]) => Array(n).fill(m));
  // on alterne petits et gros gains pour l'œil
  wins.sort((a, b) => a - b);
  const mixed = [];
  while (wins.length) { mixed.push(wins.shift()); if (wins.length) mixed.push(wins.pop()); }
  const out = Array(SEG).fill(0);
  mixed.forEach((m, i) => { out[Math.floor((i * SEG) / mixed.length)] = m; });
  return out;
}
export const wheelRTP = (risk) => layout(risk).reduce((s, m) => s + m, 0) / SEG;

export function mount(view, { wallet }) {
  let alive = true, busy = false, autoLeft = 0, risk = 'medium', angle = 0;
  try { const r = localStorage.getItem('chibouk_wheel_risk'); if (WHEEL_RISKS[r]) risk = r; } catch {}
  let history = [];

  view.innerHTML = `
  <div class="wh-wrap">
    <div class="game-head"><h1>Roue du <span>Singe</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="wh-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('wh-bet')}
        <div class="seg-field"><label>Risque</label><div class="seg" id="wh-risk">${Object.entries(WHEEL_RISKS).map(([k, r]) => `<button data-v="${k}">${r.name}</button>`).join('')}</div></div>
        <button class="btn btn-gold btn-lg wide" id="wh-spin">Tourner la roue</button>
        ${autoHTML('wh-auto')}
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="wh-stage">
        <div class="wh-box">
          <div class="wh-pointer"></div>
          <svg class="wh-wheel" id="wh-wheel" viewBox="-110 -110 220 220"></svg>
          <div class="wh-center"><b id="wh-res">?</b></div>
        </div>
        <div class="wh-legend" id="wh-legend"></div>
        <div class="dc-hist" id="wh-hist"></div>
      </div>
    </div>
  </div>`;

  const bet = bindBetField(view, 'wh-bet', 'chibouk_wheel_bet', wallet, 10);
  const wheel = $('#wh-wheel', view);
  let cells = layout(risk);

  function draw() {
    cells = layout(risk);
    const a = (2 * Math.PI) / SEG;
    wheel.innerHTML = cells.map((m, i) => {
      const a0 = i * a - Math.PI / 2 - a / 2, a1 = a0 + a;
      const p = (r, t) => `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`;
      return `<path d="M${p(60, a0)} L${p(100, a0)} A100 100 0 0 1 ${p(100, a1)} L${p(60, a1)} A60 60 0 0 0 ${p(60, a0)}Z" fill="${colorOf(m)}" stroke="#0b120e" stroke-width="1.2" data-i="${i}"/>`;
    }).join('') + `<circle r="100" fill="none" stroke="#f5c542" stroke-width="3"/><circle r="60" fill="none" stroke="#0b120e" stroke-width="2"/>`;
    $('#wh-legend', view).innerHTML = WHEEL_RISKS[risk].parts.map(([m, n]) => `<span style="--c:${colorOf(m)}"><i></i>${fx(m)} <small>${Math.round((n / SEG) * 1000) / 10} %</small></span>`).join('');
    $$('#wh-risk button', view).forEach((b) => b.classList.toggle('on', b.dataset.v === risk));
  }
  $$('#wh-risk button', view).forEach((b) => (b.onclick = () => { if (busy) return; risk = b.dataset.v; try { localStorage.setItem('chibouk_wheel_risk', risk); } catch {} sfx.click(); draw(); }));

  function setDisabled(d) {
    bet.disabled = d;
    $$('#wh-risk button', view).forEach((b) => (b.disabled = d));
    $('#wh-spin', view).disabled = d;
  }

  async function spin() {
    if (busy) return false;
    const amount = bet.value;
    if (!wallet.bet('wheel', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    busy = true; setDisabled(true);
    const i = randInt(SEG);
    const m = cells[i];
    const payout = Math.floor(amount * m);
    if (payout) wallet.win('wheel', payout, amount);
    wallet.round('wheel', payout > amount ? payout : 0, { bet: amount, mult: m, risk, top: m === Math.max(...cells) });

    // la case i doit s'arrêter sous le pointeur (en haut)
    $$('path.hit', wheel).forEach((p) => p.classList.remove('hit'));
    $('#wh-res', view).textContent = '…';
    const jitter = (randInt(1000) / 1000 - 0.5) * (360 / SEG) * 0.7;
    const targetDeg = -(i * 360) / SEG + jitter;
    const turns = autoLeft ? 2 : 5;
    const cur = ((angle % 360) + 360) % 360;
    let delta = ((targetDeg - cur) % 360 + 360) % 360;
    angle = angle + delta + 360 * turns;
    const dur = autoLeft ? 900 : 3200;
    wheel.style.transition = `transform ${dur}ms cubic-bezier(.12,.75,.2,1)`;
    wheel.style.transform = `rotate(${angle}deg)`;
    sfx.spinStart();
    // petits clics pendant la rotation
    const ticks = setInterval(() => sfx.tick && sfx.tick(), autoLeft ? 120 : 160);
    await sleep(dur + 50);
    clearInterval(ticks);
    if (!alive) return true;
    wheel.querySelector(`path[data-i="${i}"]`)?.classList.add('hit');
    const res = $('#wh-res', view);
    res.textContent = fx(m);
    res.style.color = colorOf(m);
    if (m > 0) { sfx.coin(); if (m >= 5) { sfx.win(true); coinRain(m >= 20 ? 60 : 30); } } else sfx.lose();
    history.unshift(m); history = history.slice(0, 16);
    $('#wh-hist', view).innerHTML = history.map((x) => `<span class="${x > 1 ? 'good' : x > 0 ? '' : 'bad'}">${fx(x)}</span>`).join('');
    busy = false;
    if (!autoLeft) setDisabled(false);
    return true;
  }

  const auto = bindAuto(view, 'wh-auto', { wallet, game: 'wheel', delay: 300, play: () => spin(), onState: (on) => { autoLeft = on ? 1 : 0; if (alive) setDisabled(on); } });
  $('#wh-spin', view).onclick = () => spin();
  $('#wh-rules', view).onclick = () => modal({ title: 'Règles de la Roue du Singe', html: `
    <ul class="muted"><li>La roue a <b>30 cases</b>, chacune a la même chance de tomber sous le pointeur.</li>
    <li>Tu gagnes <b>mise × le multiplicateur</b> de la case. ×0 = perdu.</li>
    <li><b>Faible</b> : souvent un petit gain. <b>Moyen</b> : plus de zéros, jusqu'à ×5,2. <b>Élevé</b> : une seule case gagnante… à ×29,7.</li>
    <li>RTP de 99 % pour les trois niveaux.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  const onKey = (e) => {
    if (e.target.closest('input,textarea,button') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!autoLeft) spin(); }
  };
  document.addEventListener('keydown', onKey);
  draw();
  return () => { alive = false; autoLeft = 0; auto.stop(); document.removeEventListener('keydown', onKey); };
}
