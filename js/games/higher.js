// Plus ou moins — jeu gratuit : le film de droite a-t-il eu un plus gros ou un plus petit budget que celui de gauche ?
// Série jusqu'à la première erreur (15 au maximum), +10 Brundles par bonne réponse, bonus si 15/15.
import { CONFIG } from '../config.js';
import { gotHTML, withFreeBonus } from '../rewards.js';
import { loadMovies } from './movies.js';
import { pickDistinct } from './mcq.js';
import { monkeySVG, icon } from '../art.js';
import { $, esc, money, fmt, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';
import { submitRecord, recordEndHTML, fmtCs } from '../records.js';
import { createGuard, judgeReactions, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';

export const MAX_STREAK = 15;
const PER = CONFIG.QUIZ_PER_CORRECT, BONUS = CONFIG.QUIZ_PERFECT_BONUS;
const budgetFmt = (b) => (b >= 1e6 ? `${(b / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M$` : `${fmt(b)} $`);

// Prochain film : budget connu et assez différent du précédent (au moins 15 % d'écart) pour éviter le pile ou face
export function nextMovie(pool, prev, used) {
  return pickDistinct(pool, 1, (m) => !used.has(m) && (!prev || Math.abs(m.b - prev.b) / Math.max(m.b, prev.b) >= 0.15))[0] || pickDistinct(pool, 1, (m) => !used.has(m))[0];
}

export function mount(view, { wallet }) {
  let alive = true, pool = null, left = null, right = null, streak = 0, used = new Set(), state = 'intro', credited = false;
  view.innerHTML = `<div class="hi-wrap">
    <div class="game-head"><h1>Plus ou <span>moins</span></h1>
      <div class="actions"><span class="gc-tag">Gratuit · ${PER} ${CUR} par bonne réponse</span></div></div>
    <div class="hi-stage" id="hi-stage"></div></div>`;
  const stage = $('#hi-stage', view);

  const poster = (m) => (m.p ? `<img src="https://image.tmdb.org/t/p/w342${m.p}" alt="" loading="lazy" onerror="this.remove()">` : '');
  function cardHTML(m, side, reveal) {
    return `<div class="hi-card ${side}">${poster(m)}<div class="hi-shade"></div>
      <div class="hi-info"><b>${esc(m.t)}</b><small>${m.y} · ${esc(m.d[0])}</small>
        ${reveal ? `<div class="hi-budget">${budgetFmt(m.b)}</div><small>de budget</small>` : `<div class="hi-q">a eu un budget…</div>
        <div class="hi-btns"><button class="btn btn-gold" data-a="up">▲ Plus gros</button><button class="btn btn-ghost" data-a="down">▼ Plus petit</button></div>
        <small>que ${esc(left.t)}</small>`}</div></div>`;
  }

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Quel film a coûté le plus cher ?</h2>
      <p>Le budget du film de gauche est affiché. Devine si celui de droite a eu un budget <b>plus gros</b> ou <b>plus petit</b>.<br>
      Enchaîne jusqu'à ${MAX_STREAK} bonnes réponses : <b>${withFreeBonus(`+${PER}`, 'higher')} ${CUR}</b> chacune, <b>${withFreeBonus(`+${BONUS}`, 'higher')} ${CUR}</b> si tu vas au bout. Une erreur et la série s'arrête.</p>
      ${lockBannerHTML(wallet, 'higher')}
      <button class="btn btn-gold btn-lg" id="hi-start" ${lockedUntil(wallet, 'higher') ? 'disabled' : ''}>Commencer</button></div>`;
    $('#hi-start', stage).onclick = start;
  }

  let guard = null, rts = [], shownAt = 0, recRes = null, cIv = null;
  // chrono : temps de réflexion cumulé (affichage du budget et animations exclus), au centième — départage les records
  const spent = () => rts.reduce((a, b) => a + b, 0);
  async function start() {
    if (lockedUntil(wallet, 'higher')) { intro(); return; }
    if (!pool) {
      stage.innerHTML = `<div class="qz-card">${monkeySVG({ cls: 'bounce' })}<p>Chargement des films…</p></div>`;
      try { pool = (await loadMovies()).filter((m) => m.b >= 1000000); } catch (e) { console.error(e); if (alive) intro(); return; }
      if (!alive) return;
    }
    streak = 0; used = new Set(); credited = false;
    guard && guard.destroy(); guard = createGuard(stage); rts = []; recRes = null;
    left = nextMovie(pool, null, used); used.add(left);
    right = nextMovie(pool, left, used); used.add(right);
    sfx.click();
    ask();
  }

  function ask() {
    state = 'ask';
    stage.innerHTML = `<div class="hi-score">Série : <b>${streak}</b> / ${MAX_STREAK} <span class="qz-chrono" title="Temps de réflexion cumulé (sert à départager les records)">${icon('hourglass')}<b id="hi-chrono">${fmtCs(spent())}</b></span></div>
      <div class="hi-duel">${cardHTML(left, 'l', true)}<div class="hi-vs">VS</div>${cardHTML(right, 'r', false)}</div>`;
    stage.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => answer(b.dataset.a)));
    shownAt = performance.now();
    clearInterval(cIv);
    cIv = setInterval(() => { const ch = $('#hi-chrono', stage); if (!alive || state !== 'ask' || !ch) return clearInterval(cIv); ch.textContent = fmtCs(spent() + performance.now() - shownAt); }, 37);
  }

  function answer(a) {
    if (state !== 'ask') return;
    state = 'feedback';
    rts.push(performance.now() - shownAt);
    clearInterval(cIv);
    { const ch = $('#hi-chrono', stage); if (ch) ch.textContent = fmtCs(spent()); }
    const ok = a === 'up' ? right.b >= left.b : right.b <= left.b;
    const r = stage.querySelector('.hi-card.r .hi-info');
    r.innerHTML = `<b>${esc(right.t)}</b><small>${right.y} · ${esc(right.d[0])}</small><div class="hi-budget count">${budgetFmt(right.b)}</div><small>de budget</small>`;
    stage.querySelector('.hi-card.r').classList.add(ok ? 'good' : 'bad');
    if (ok) { streak++; sfx.coin(); } else sfx.lose();
    setTimeout(() => {
      if (!alive) return;
      if (!ok || streak >= MAX_STREAK) return finish();
      left = right;
      right = nextMovie(pool, left, used); used.add(right);
      ask();
    }, ok ? 1300 : 1900);
  }

  function reward() {
    if (credited) return { amount: 0 };
    credited = true;
    const perfect = streak >= MAX_STREAK;
    const amount = streak * PER + (perfect ? BONUS : 0);
    const total = spent();
    const v = judgeReactions(guard, rts); guard = null;
    if (v.flag === 'cheat') return { refused: v, p: punish(wallet, 'higher', null, v, Math.max(amount, PER * 5)) };
    if (v.flag === 'fast') { tooFast(wallet, 'higher', null, v); return { refused: v }; }
    const s = wallet.stats;
    s.higherBest = Math.max(s.higherBest || 0, streak);
    wallet.freeReward('higher', amount, { Correct: streak, Perfect: perfect ? 1 : 0 }, { log: { sec: v.sec, actions: v.actions, ms: v.medianMs } });
    // record : longueur de la série, puis temps de réflexion jusqu'à la dernière bonne réponse (au centième)
    if (streak > 0) recRes = submitRecord(wallet, 'higher', { v: streak, t: rts.slice(0, streak).reduce((a, b) => a + b, 0) || total });
    return { amount };
  }

  function finish() {
    state = 'done';
    const res = reward();
    if (res.refused) { stage.innerHTML = refusedHTML(res.refused, res.p); $('[data-again]', stage).onclick = res.refused.flag === 'cheat' ? intro : start; return; }
    const amount = res.amount;
    const perfect = streak >= MAX_STREAK;
    stage.innerHTML = `<div class="qz-card">${monkeySVG(perfect ? { crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' } : { wink: streak >= 5 })}
      <h2>${perfect ? `${MAX_STREAK}/${MAX_STREAK}, sans-faute !` : `Série de ${streak}`}</h2>
      <p>${amount ? `${gotHTML(amount)} ajoutés à ton solde.` : 'Pas de Brundles cette fois.'} </p>
      <p class="qz-time">Temps de réflexion : <b>${fmtCs(spent())}</b>${recRes ? `<br>${recordEndHTML('higher', recRes, wallet)}` : ''}</p>
      <button class="btn btn-gold btn-lg" id="hi-again">Rejouer</button></div>`;
    $('#hi-again', stage).onclick = start;
    if (amount) { sfx.win(perfect); coinRain(perfect ? 40 : 12); }
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.closest('input,textarea')) return;
    if (state === 'ask' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); answer(e.key === 'ArrowUp' ? 'up' : 'down'); }
    else if ((state === 'intro' || state === 'done') && e.key === 'Enter' && !e.target.closest('button')) start();
  };
  document.addEventListener('keydown', onKey);
  intro();
  return () => {
    alive = false; clearInterval(cIv); document.removeEventListener('keydown', onKey);
    if ((state === 'ask' || state === 'feedback') && streak >= 3 && !credited) reward(); else if (guard) guard.destroy();
  };
}
