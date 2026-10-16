// Keno — choisis de 1 à 10 numéros sur 40, 10 numéros sont tirés. Plus tu en touches, plus ça paie.
import { randInt } from './slots-math.js';
import { KENO_N, KENO_DRAW, KENO_TABLES, kenoP } from './keno-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, betFieldHTML, bindBetField, autoHTML, bindAuto, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

const RISKS = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };
const fx = (m) => '×' + m.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export function drawNumbers() {
  const pool = Array.from({ length: KENO_N }, (_, i) => i + 1);
  const out = [];
  for (let i = 0; i < KENO_DRAW; i++) out.push(pool.splice(randInt(pool.length), 1)[0]);
  return out;
}

export function mount(view, { wallet }) {
  let alive = true, busy = false, autoLeft = 0, risk = 'medium';
  let picks = new Set();
  try {
    const r = localStorage.getItem('chibouk_keno_risk'); if (RISKS[r]) risk = r;
    const p = JSON.parse(localStorage.getItem('chibouk_keno_picks') || '[]'); if (Array.isArray(p)) picks = new Set(p.filter((x) => x >= 1 && x <= KENO_N).slice(0, 10));
  } catch {}

  view.innerHTML = `
  <div class="kn-wrap">
    <div class="game-head"><h1><span>Keno</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="kn-rules">${icon('scroll')}Règles</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        ${betFieldHTML('kn-bet')}
        <div class="seg-field"><label>Risque</label><div class="seg" id="kn-risk">${Object.entries(RISKS).map(([k, n]) => `<button data-v="${k}">${n}</button>`).join('')}</div></div>
        <div class="kn-tools"><button class="btn btn-ghost btn-sm" id="kn-random">Choix au hasard</button><button class="btn btn-ghost btn-sm" id="kn-clear">Effacer</button></div>
        <button class="btn btn-gold btn-lg wide" id="kn-play">Tirer</button>
        ${autoHTML('kn-auto', 'Paris automatiques', '<p class="ab-note">L\'auto rejoue les mêmes numéros.</p>')}
        <div class="plk-info"><span>Numéros choisis</span><b id="kn-count">0 / 10</b></div>
        <div class="plk-info"><span>RTP</span><b>99 %</b></div>
      </aside>
      <div class="kn-stage">
        <div class="kn-grid" id="kn-grid">${Array.from({ length: KENO_N }, (_, i) => `<button class="kn-n" data-n="${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="kn-pay" id="kn-pay"></div>
        <div class="kn-msg" id="kn-msg">Choisis de 1 à 10 numéros, puis lance le tirage.</div>
      </div>
    </div>
  </div>`;

  const bet = bindBetField(view, 'kn-bet', 'chibouk_keno_bet', wallet, 10);
  const save = () => { try { localStorage.setItem('chibouk_keno_picks', JSON.stringify([...picks])); localStorage.setItem('chibouk_keno_risk', risk); } catch {} };

  function renderPay(hits = -1) {
    const k = picks.size;
    const box = $('#kn-pay', view);
    if (!k) { box.innerHTML = '<span class="muted">Le tableau des gains apparaît quand tu choisis des numéros.</span>'; return; }
    const t = KENO_TABLES[risk][k - 1];
    box.innerHTML = t.map((m, h) => `<div class="kn-p ${h === hits ? 'cur' : ''} ${m ? '' : 'zero'}"><b>${fx(m)}</b><small>${h} touché${h > 1 ? 's' : ''}</small><em>${(kenoP(k, h) * 100).toLocaleString('fr-FR', { maximumFractionDigits: h > 6 ? 4 : 2 })} %</em></div>`).join('');
  }
  function render() {
    $$('.kn-n', view).forEach((b) => { b.classList.toggle('pick', picks.has(+b.dataset.n)); b.disabled = busy || autoLeft > 0; });
    $$('#kn-risk button', view).forEach((b) => { b.classList.toggle('on', b.dataset.v === risk); b.disabled = busy || autoLeft > 0; });
    $('#kn-count', view).textContent = `${picks.size} / 10`;
    $('#kn-play', view).disabled = busy || autoLeft > 0 || !picks.size;
    $('#kn-random', view).disabled = $('#kn-clear', view).disabled = busy || autoLeft > 0;
    bet.disabled = busy || autoLeft > 0;
  }
  const clearDraw = () => $$('.kn-n', view).forEach((b) => b.classList.remove('drawn', 'hit', 'miss'));

  $('#kn-grid', view).onclick = (e) => {
    const b = e.target.closest('.kn-n');
    if (!b || busy || autoLeft) return;
    const n = +b.dataset.n;
    clearDraw();
    if (picks.has(n)) picks.delete(n);
    else if (picks.size < 10) picks.add(n);
    else { toast('10 numéros maximum'); return; }
    sfx.tick && sfx.tick();
    save(); render(); renderPay();
  };
  $$('#kn-risk button', view).forEach((b) => (b.onclick = () => { risk = b.dataset.v; sfx.click(); save(); render(); renderPay(); }));
  $('#kn-clear', view).onclick = () => { picks.clear(); clearDraw(); save(); render(); renderPay(); };
  $('#kn-random', view).onclick = () => {
    const k = picks.size || 10;
    picks = new Set(drawNumbers().slice(0, k));
    clearDraw(); sfx.click(); save(); render(); renderPay();
  };

  async function play() {
    if (busy || !picks.size) return false;
    const amount = bet.value;
    if (!wallet.bet('keno', amount)) { toast(`Solde insuffisant pour miser ${fmt(amount)} ${CUR}`, 'error'); return false; }
    busy = true; render(); clearDraw(); renderPay();
    const drawn = drawNumbers();
    const hits = drawn.filter((n) => picks.has(n)).length;
    const k = picks.size;
    const m = KENO_TABLES[risk][k - 1][hits];
    const payout = Math.floor(amount * m);
    const reveal = wallet.deferEvents(() => {
      if (payout) wallet.win('keno', payout, amount);
      wallet.round('keno', payout > amount ? payout : 0, { bet: amount, picks: k, hits, mult: m, risk });
    });

    let shown = 0;
    for (const n of drawn) {
      if (!alive) { reveal(); return true; }
      const b = view.querySelector(`.kn-n[data-n="${n}"]`);
      const hit = picks.has(n);
      b.classList.add('drawn', hit ? 'hit' : 'miss');
      if (hit) { shown++; sfx.coin(); renderPay(shown); } else sfx.tick && sfx.tick();
      await sleep(autoLeft ? 45 : 140);
    }
    reveal();
    if (!alive) return true;
    renderPay(hits);
    $('#kn-msg', view).innerHTML = payout ? `${hits} numéro${hits > 1 ? 's' : ''} touché${hits > 1 ? 's' : ''} : ${fx(m)} → +${money(payout)}` : `${hits} numéro${hits > 1 ? 's' : ''} touché${hits > 1 ? 's' : ''}… pas de gain cette fois.`;
    if (m >= 10) { sfx.win(true); coinRain(Math.min(60, 15 + m / 5)); } else if (!payout) sfx.lose();
    busy = false; render();
    return true;
  }

  const auto = bindAuto(view, 'kn-auto', { wallet, game: 'keno', bet, delay: 400, play: () => play(), onState: (on) => { autoLeft = on ? 1 : 0; if (alive) render(); } });
  $('#kn-play', view).onclick = () => play();
  $('#kn-rules', view).onclick = () => modal({ title: 'Règles du Keno', cls: 'wide', html: `
    <ul class="muted"><li>Choisis de <b>1 à 10 numéros</b> sur 40. Le tirage sort <b>10 numéros</b>.</li>
    <li>Ton gain dépend du nombre de numéros choisis et du nombre de numéros touchés (tableau sous la grille, avec les probabilités).</li>
    <li><b>Faible</b> : gains plus fréquents. <b>Élevé</b> : il faut toucher beaucoup de numéros, mais ça peut monter jusqu'à ×10 000.</li>
    <li>RTP de 99 % pour chaque combinaison.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  const onKey = (e) => {
    if (e.target.closest('input,textarea,button') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!autoLeft) play(); }
  };
  document.addEventListener('keydown', onKey);
  render(); renderPay();
  return () => { alive = false; autoLeft = 0; auto.stop(); document.removeEventListener('keydown', onKey); };
}
