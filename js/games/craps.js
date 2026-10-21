// Craps — table de dés : Pass Line / Don't Pass avec cotes, Field, mises Place, Any 7, Any Craps.
// Les mises posées sur la table depuis le dernier lancer (en pointillés) sont payées au lancer suivant ;
// les mises en jeu restent sur la table d'un lancer à l'autre et sont sauvegardées dans le profil (p.craps).
import * as C from './craps-math.js';
import { randInt } from './slots-math.js';
import { icon } from '../art.js';
import { $, $$, fmt, money, toast, modal, coinRain, sleep, autoHTML, bindAuto, CUR, isTurbo } from '../ui.js';
import { sfx } from '../sfx.js';

const CHIPS = [1, 5, 25, 100, 500, 1000, 5000, 25000];
const LABEL = { pass: 'Pass Line', dpass: 'Don\'t Pass', odds: 'Cote (Pass)', lay: 'Cote (Don\'t Pass)', field: 'Field', any7: 'Any 7', craps: 'Any Craps', p4: 'Place 4', p5: 'Place 5', p6: 'Place 6', p8: 'Place 8', p9: 'Place 9', p10: 'Place 10' };
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieHTML = (n) => `<div class="cr-die" data-n="${n}">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'on' : ''}"></i>`).join('')}</div>`;
const short = (a) => (a >= 1000 ? (a / 1000).toFixed(a % 1000 ? 1 : 0).replace('.', ',') + 'k' : String(a));

export function mount(view, { wallet }) {
  let alive = true, busy = false, autoLeft = 0;
  let selChip = 25;
  try { const v = +localStorage.getItem('chibouk_craps_chip'); if (CHIPS.includes(v)) selChip = v; } catch {}
  const saved = wallet.get('craps') || {};
  let point = saved.point || null, bets = { ...(saved.bets || {}) }; // mises en jeu (déjà payées)
  let pending = {}, lastLayout = null, history = [];
  try { lastLayout = JSON.parse(localStorage.getItem('chibouk_craps_last') || 'null'); } catch {}
  const save = () => wallet.set('craps', { point, bets: { ...bets } });

  const spot = (k, cls, inner) => `<button type="button" class="cr-spot ${cls}" data-k="${k}">${inner}</button>`;
  view.innerHTML = `
  <div class="cr-wrap">
    <div class="game-head"><h1><span>Craps</span></h1>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="cr-rules">${icon('scroll')}Règles & gains</button></div></div>
    <div class="side-layout">
      <aside class="side-panel">
        <div class="bet-field"><label>Jeton</label><div class="chip-row cr-chips">${CHIPS.map((v) => `<button class="chip ${v === selChip ? 'sel' : ''}" data-v="${v}">${short(v)}</button>`).join('')}</div></div>
        <div class="plk-info"><span>Sur la table</span><b id="cr-total"></b></div>
        <div class="plk-info"><span>À payer au lancer</span><b id="cr-pend"></b></div>
        <button class="btn btn-gold btn-lg wide" id="cr-roll">Lancer les dés</button>
        <div class="cr-btns"><button class="btn btn-ghost btn-sm" id="cr-clear">Effacer</button><button class="btn btn-ghost btn-sm" id="cr-rebet">Remettre</button><button class="btn btn-ghost btn-sm" id="cr-take" title="Reprendre les mises Place et les cotes">Retirer</button></div>
        ${autoHTML('cr-auto', 'Lancers automatiques', `<div class="cr-plan">
          <div class="cr-plan-h">Stratégie de l'auto <small class="muted">appliquée avant chaque lancer</small></div>
          <label>Mise de ligne<span class="cr-plan-row"><select class="bet-input" data-p="line"><option value="pass">Pass Line</option><option value="dpass">Don't Pass</option><option value="">aucune</option></select><input class="bet-input" type="number" min="0" step="1" data-p="lineAmt" placeholder="0"></span></label>
          <label>Cote quand le point est établi<select class="bet-input" data-p="odds"><option value="0">aucune</option><option value="1">1× la ligne</option><option value="2">2× la ligne</option><option value="3">3× la ligne (max)</option></select></label>
          <label>Mises Place (avec un point)<span class="cr-plan-row"><select class="bet-input" data-p="place"><option value="">aucune</option><option value="68">6 et 8</option><option value="5689">5, 6, 8 et 9</option><option value="all">4 à 10</option><option value="nopoint">4 à 10 sauf le point</option></select><input class="bet-input" type="number" min="0" step="1" data-p="placeAmt" placeholder="par case"></span></label>
          <label class="cr-plan-chk"><input type="checkbox" data-p="takeDown"> Reprendre les mises Place quand le point est fait</label>
          <div class="cr-plan-3"><label>Field<input class="bet-input" type="number" min="0" step="1" data-p="field" placeholder="0"></label><label>Any 7<input class="bet-input" type="number" min="0" step="1" data-p="any7" placeholder="0"></label><label>Any Craps<input class="bet-input" type="number" min="0" step="1" data-p="craps" placeholder="0"></label></div>
          <small class="muted cr-plan-sum" id="cr-plan-sum"></small>
        </div>`)}
        <div class="plk-info"><span>RTP</span><b>98,6 à 100 %</b></div>
      </aside>
      <div class="cr-stage">
        <div class="cr-table">
          <div class="cr-dice" id="cr-dice">${dieHTML(3)}${dieHTML(4)}</div>
          <div class="cr-places">${C.POINTS.map((n) => spot('p' + n, 'cr-place', `<b>${n}</b><small>${n === 6 || n === 8 ? '7:6' : n === 5 || n === 9 ? '7:5' : '9:5'}</small><span class="cr-puck" hidden>ON</span>`)).join('')}</div>
          ${spot('field', 'cr-field', `<b>FIELD</b><span class="cr-fnums"><i class="x2">2</i> 3 · 4 · 9 · 10 · 11 <i class="x3">12</i></span><small>2 paie 2:1 · 12 paie 3:1 · le reste 1:1</small>`)}
          <div class="cr-row3">
            ${spot('dpass', 'cr-dpass', '<b>DON\'T PASS BAR</b><small>1:1 · 12 remboursé</small>')}
            ${spot('lay', 'cr-lay', '<b>Cote contre</b><small>jusqu\'à 3×</small>')}
            ${spot('any7', 'cr-any7', '<b>ANY 7</b><small>4:1</small>')}
            ${spot('craps', 'cr-anycraps', '<b>ANY CRAPS</b><small>2 · 3 · 12 → 7:1</small>')}
          </div>
          <div class="cr-row4">
            ${spot('pass', 'cr-pass', '<b>PASS LINE</b><small>1:1</small>')}
            ${spot('odds', 'cr-odds', '<b>Cote</b><small>jusqu\'à 3× · cote réelle</small>')}
          </div>
        </div>
        <div class="cr-msg" id="cr-msg"></div>
        <div class="dc-hist cr-hist" id="cr-hist"></div>
      </div>
    </div>
  </div>`;

  const sum = (o) => Object.values(o).reduce((a, x) => a + (x || 0), 0);
  function render() {
    $$('.cr-spot', view).forEach((s) => {
      const k = s.dataset.k, amt = (bets[k] || 0) + (pending[k] || 0);
      let m = s.querySelector('.rl-chip');
      if (amt) {
        if (!m) { m = document.createElement('div'); m.className = 'rl-chip'; s.append(m); }
        m.dataset.v = [...CHIPS].reverse().find((v) => amt >= v) || 1;
        m.textContent = short(amt);
        m.classList.toggle('pend', !!pending[k] && !bets[k]);
      } else if (m) m.remove();
      s.classList.toggle('off', !C.canBet(k, point, { ...bets, ...sumBets() }) && !amt);
      s.classList.toggle('working', !!bets[k] && (!/^p\d/.test(k) || !!point)); // les mises Place ne travaillent qu'avec un point
    });
    $$('.cr-place', view).forEach((s) => { const n = +s.dataset.k.slice(1); const pk = s.querySelector('.cr-puck'); pk.hidden = point !== n; s.classList.toggle('point', point === n); });
    $('#cr-total', view).innerHTML = money(sum(bets));
    $('#cr-pend', view).innerHTML = money(sum(pending));
    $('#cr-roll', view).disabled = busy || autoLeft > 0 || !(sum(bets) + sum(pending));
    $('#cr-clear', view).disabled = busy || !sum(pending);
    $('#cr-rebet', view).disabled = busy || !lastLayout || !!point || sum(pending) > 0;
    $('#cr-take', view).disabled = busy || !C.POINTS.some((n) => bets['p' + n]) && !bets.odds && !bets.lay;
    if (!busy) $('#cr-msg', view).innerHTML = point ? `Point : <b>${point}</b>. Fais ${point} avant un 7 pour la Pass Line.` : 'Lancer de sortie : 7 ou 11 gagne pour la Pass Line, 2, 3 ou 12 perd.';
  }
  const sumBets = () => { const o = { ...bets }; for (const k in pending) o[k] = (o[k] || 0) + pending[k]; return o; };

  function place(k, remove = false) {
    if (busy || autoLeft) return;
    if (remove) { if (pending[k]) { delete pending[k]; sfx.chip(); render(); } return; }
    const all = sumBets();
    if (!C.canBet(k, point, all)) {
      toast(k === 'pass' || k === 'dpass' ? 'Les mises de ligne se posent au lancer de sortie (sans point).' : k === 'odds' ? 'La cote se pose derrière la Pass Line, une fois le point établi.' : k === 'lay' ? 'La cote contre se pose derrière le Don\'t Pass, une fois le point établi.' : 'Mise impossible', 'error');
      return;
    }
    const v = Math.min(selChip, C.oddsRoom(k, all));
    if (v <= 0) { toast('Cote maximum atteinte (3× la mise de ligne)', 'error'); return; }
    if (!wallet.canAfford(sum(pending) + v)) { toast(`Solde insuffisant`, 'error'); return; }
    pending[k] = (pending[k] || 0) + v;
    sfx.chip(); render();
  }
  $$('.cr-spot', view).forEach((s) => {
    s.onclick = () => place(s.dataset.k);
    s.oncontextmenu = (e) => { e.preventDefault(); place(s.dataset.k, true); };
  });
  $$('.cr-chips .chip', view).forEach((c) => (c.onclick = () => { selChip = +c.dataset.v; try { localStorage.setItem('chibouk_craps_chip', selChip); } catch {} $$('.cr-chips .chip', view).forEach((x) => x.classList.toggle('sel', x === c)); sfx.click(); }));
  $('#cr-clear', view).onclick = () => { pending = {}; sfx.chip(); render(); };
  $('#cr-rebet', view).onclick = () => rebet();
  function rebet() {
    if (!lastLayout || point) return false;
    const want = Object.fromEntries(Object.entries(lastLayout).filter(([k, v]) => v > 0 && C.canBet(k, null, lastLayout) && !(bets[k] && ['pass', 'dpass'].includes(k))));
    if (sum(want) > 0 && !wallet.canAfford(sum(want))) { toast('Solde insuffisant pour remettre la mise', 'error'); return false; }
    pending = want; sfx.chip(); render(); return true;
  }
  // reprendre les mises Place et les cotes (les mises de ligne, elles, restent jusqu'à la décision)
  $('#cr-take', view).onclick = () => {
    let back = 0;
    for (const k of ['odds', 'lay', ...C.POINTS.map((n) => 'p' + n)]) if (bets[k]) { back += bets[k]; delete bets[k]; }
    if (back) { wallet.refund('craps', back); save(); sfx.chip(); toast(`${fmt(back)} ${CUR} repris`); }
    render();
  };

  async function animate(d1, d2) {
    const box = $('#cr-dice', view), fast = isTurbo('craps');
    if (!fast) sfx.spinStart();
    box.classList.remove('land'); box.classList.add('roll');
    const t0 = performance.now(), dur = fast ? 120 : autoLeft ? 450 : 900;
    while (alive && performance.now() - t0 < dur) { box.innerHTML = dieHTML(1 + randInt(6)) + dieHTML(1 + randInt(6)); await sleep(fast ? 40 : 70); }
    box.innerHTML = dieHTML(d1) + dieHTML(d2);
    box.classList.remove('roll'); void box.offsetWidth; box.classList.add('land');
    if (!fast) sfx.reelStop(1);
  }

  async function roll() {
    if (busy) return false;
    if (autoLeft) { if (!applyPlan()) return false; }
    const pay = sum(pending);
    if (!(sum(bets) + pay)) { toast('Pose une mise d\'abord', 'error'); return false; }
    if (pay && !wallet.bet('craps', pay)) { toast(`Solde insuffisant pour miser ${fmt(pay)} ${CUR}`, 'error'); return false; }
    busy = true;
    if (!point && pay) { lastLayout = { ...pending }; try { localStorage.setItem('chibouk_craps_last', JSON.stringify(lastLayout)); } catch {} }
    for (const k in pending) bets[k] = (bets[k] || 0) + pending[k];
    pending = {};
    const d1 = 1 + randInt(6), d2 = 1 + randInt(6);
    const res = C.resolve(point, bets, d1, d2);
    const before = point;
    const takeDown = autoLeft && plan.takeDown && before && res.sum === before;
    point = res.point; bets = res.bets;
    save();
    const reveal = wallet.deferEvents(() => {
      if (res.ret > 0) wallet.win('craps', res.ret, res.stake);
      if (res.stake > 0) wallet.round('craps', res.ret, { bet: res.stake, dice: [d1, d2], sum: res.sum, point: before, made: before && res.sum === before, mult: res.stake ? Math.round((res.ret / res.stake) * 100) / 100 : 0 });
    });
    render(); // point déjà à jour, mais le message attend l'animation
    $('#cr-msg', view).textContent = 'Les dés roulent…';
    await animate(d1, d2);
    reveal();
    if (!alive) return true;
    // cases gagnantes / perdantes
    for (const k of Object.keys(res.won)) { const s = view.querySelector(`.cr-spot[data-k="${k}"]`); if (s) { s.classList.add('won'); setTimeout(() => s.classList.remove('won'), 1400); } }
    for (const k of res.lost) { const s = view.querySelector(`.cr-spot[data-k="${k}"]`); if (s) { s.classList.add('lost'); setTimeout(() => s.classList.remove('lost'), 1100); } }
    const gain = res.ret;
    // stratégie : mises Place reprises quand le point est fait
    if (takeDown) { let back = 0; for (const n of C.POINTS) if (bets['p' + n]) { back += bets['p' + n]; delete bets['p' + n]; } if (back) { wallet.refund('craps', back); save(); } }
    busy = false;
    render();
    $('#cr-msg', view).innerHTML = `<b class="cr-sum">${d1} + ${d2} = ${res.sum}</b> ${res.msg}${gain ? ` <span class="pos">+${money(gain)}</span>` : res.lost.length ? ' <span class="neg">mise perdue</span>' : ''}`;
    if (gain) { sfx.coin(); if (gain >= 10 * Math.max(1, res.stake)) { sfx.win(true); coinRain(40); } else if (gain >= 3 * res.stake) sfx.win(); }
    else if (res.lost.length && !isTurbo('craps')) sfx.lose();
    history.unshift({ s: res.sum, p: before, made: before && res.sum === before, seven: before && res.sum === 7 }); history = history.slice(0, 18);
    $('#cr-hist', view).innerHTML = history.map((h) => `<span class="${h.made ? 'good' : h.seven ? 'bad' : h.s === 7 || h.s === 11 ? 'gold' : ''}">${h.s}</span>`).join('');
    return true;
  }

  /* ---------- stratégie de l'auto : les décisions prévues à l'avance ---------- */
  let plan = { line: 'pass', lineAmt: 100, odds: 0, place: '', placeAmt: 0, takeDown: false, field: 0, any7: 0, craps: 0 };
  try { plan = { ...plan, ...(JSON.parse(localStorage.getItem('chibouk_craps_plan') || 'null') || {}) }; } catch {}
  const planEl = (k) => view.querySelector(`[data-p="${k}"]`);
  Object.keys(plan).forEach((k) => { const el = planEl(k); if (!el) return; if (el.type === 'checkbox') el.checked = !!plan[k]; else el.value = plan[k] || (el.tagName === 'SELECT' ? (k === 'odds' ? '0' : '') : ''); });
  if (planEl('line')) planEl('line').value = plan.line;
  const PLACE_SETS = { 68: [6, 8], 5689: [5, 6, 8, 9], all: C.POINTS, nopoint: C.POINTS };
  function readPlan() {
    const num = (k) => Math.max(0, Math.floor(+planEl(k).value || 0));
    plan = { line: planEl('line').value, lineAmt: num('lineAmt'), odds: +planEl('odds').value || 0, place: planEl('place').value, placeAmt: num('placeAmt'), takeDown: planEl('takeDown').checked, field: num('field'), any7: num('any7'), craps: num('craps') };
    try { localStorage.setItem('chibouk_craps_plan', JSON.stringify(plan)); } catch {}
    const parts = [];
    if (plan.line && plan.lineAmt) parts.push(`${plan.line === 'pass' ? 'Pass Line' : 'Don\'t Pass'} ${fmt(plan.lineAmt)}${plan.odds ? ` + cote ${plan.odds}×` : ''}`);
    if (plan.place && plan.placeAmt) parts.push(`Place ${plan.place === '68' ? '6/8' : plan.place === '5689' ? '5/6/8/9' : plan.place === 'all' ? '4 à 10' : '4 à 10 sauf le point'} à ${fmt(plan.placeAmt)}${plan.takeDown ? ' (reprises au point fait)' : ''}`);
    ['field', 'any7', 'craps'].forEach((k) => plan[k] && parts.push(`${LABEL[k]} ${fmt(plan[k])} à chaque lancer`));
    $('#cr-plan-sum', view).textContent = parts.length ? 'Prévu : ' + parts.join(' · ') : 'Rien de prévu : l\'auto remettra ta dernière mise de départ.';
  }
  view.querySelectorAll('[data-p]').forEach((el) => (el.onchange = el.oninput = readPlan));
  readPlan();
  // ajoute aux jetons à jouer ce que la stratégie prévoit pour ce lancer (false si le solde ne suffit pas)
  function applyPlan() {
    const want = { ...pending };
    const add = (k, v) => { if (v > 0) want[k] = (want[k] || 0) + v; };
    const empty = !(plan.line && plan.lineAmt) && !(plan.place && plan.placeAmt) && !plan.field && !plan.any7 && !plan.craps;
    if (empty) { if (!point && !sum(pending) && !bets.pass && !bets.dpass && lastLayout) return rebet(); return true; }
    if (!point && plan.line && plan.lineAmt && !bets[plan.line] && !want[plan.line]) add(plan.line, plan.lineAmt);
    if (point && plan.odds) {
      const k = bets.pass ? 'odds' : bets.dpass ? 'lay' : null, line = bets.pass || bets.dpass || 0;
      if (k) add(k, Math.max(0, Math.min(C.ODDS_MAX, plan.odds) * line - (bets[k] || 0) - (want[k] || 0)));
    }
    if (point && plan.place && plan.placeAmt) for (const n of PLACE_SETS[plan.place]) { if (plan.place === 'nopoint' && n === point) continue; const k = 'p' + n; if (!bets[k] && !want[k]) add(k, plan.placeAmt); }
    ['field', 'any7', 'craps'].forEach((k) => { if (plan[k] && !want[k]) add(k, plan[k]); });
    // rien à ajouter (point en cours, mises déjà posées) : on relance simplement (canAfford(0) répond toujours non)
    const need = sum(want);
    if (need > 0 && !wallet.canAfford(need)) { toast('Auto arrêtée : solde insuffisant pour la stratégie prévue', 'error'); return false; }
    pending = want; render();
    return true;
  }

  const auto = bindAuto(view, 'cr-auto', { wallet, game: 'craps', turbo: true, delay: 500, play: () => roll(), onState: (on) => { autoLeft = on ? 1 : 0; if (alive) render(); } });
  $('#cr-roll', view).onclick = () => roll();
  $('#cr-rules', view).onclick = () => modal({ title: 'Règles du Craps', cls: 'wide', html: `<ul class="muted fm-help">
    <li><b>Lancer de sortie</b> (pas de point) : 7 ou 11 → la <b>Pass Line</b> gagne (1:1) ; 2, 3 ou 12 (« craps ») → elle perd. Tout autre total devient le <b>point</b>.</li>
    <li><b>Point établi</b> : on relance jusqu'à refaire le point (la Pass Line gagne) ou sortir un 7 (elle perd, « sept dehors »).</li>
    <li><b>Don't Pass</b> : l'inverse. 2 ou 3 gagne, 7 ou 11 perd, 12 remboursé au lancer de sortie ; ensuite le 7 gagne et le point perd.</li>
    <li><b>Cote</b> : une fois le point établi, mise jusqu'à 3× ta Pass Line (ou ton Don't Pass) payée à la cote réelle, sans avantage pour le casino : 4 ou 10 → 2:1, 5 ou 9 → 3:2, 6 ou 8 → 6:5 (cote contre : 1:2, 2:3, 5:6).</li>
    <li><b>Place 4 à 10</b> : le numéro sort avant un 7 → gain (9:5 sur 4 et 10, 7:5 sur 5 et 9, 7:6 sur 6 et 8), la mise reste en place. Un 7 et elles sont perdues. Elles ne travaillent pas au lancer de sortie. Mise des multiples de 6 sur le 6 et le 8, de 5 sur les autres, pour être payé sans arrondi.</li>
    <li><b>Field</b> (un lancer) : 3, 4, 9, 10, 11 → 1:1 ; 2 → 2:1 ; 12 → 3:1 ; 5, 6, 7, 8 → perdu. <b>Any 7</b> : 4:1. <b>Any Craps</b> (2, 3 ou 12) : 7:1.</li>
    <li>Clic sur une case = un jeton ; clic droit = enlever les jetons pas encore joués. Les mises en pointillés sont payées au prochain lancer. « Retirer » reprend tes mises Place et tes cotes.</li>
    <li>RTP : Pass Line 98,6 %, Don't Pass 98,6 %, cotes 100 %, Place 6/8 98,5 %, Place 5/9 96 %, Place 4/10 93,3 %, Field 97,2 %, Any Craps 88,9 %, Any 7 83,3 %.</li></ul>`, buttons: [{ label: 'Compris', value: true, primary: true }] });
  const onKey = (e) => {
    if (e.target.closest('input,textarea,button') || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!autoLeft) roll(); }
  };
  document.addEventListener('keydown', onKey);
  render();
  if (point) $('#cr-msg', view).innerHTML = `Tes mises sont restées sur la table. Point : <b>${point}</b>.`;
  return () => { alive = false; auto.stop(); document.removeEventListener('keydown', onKey); };
}
