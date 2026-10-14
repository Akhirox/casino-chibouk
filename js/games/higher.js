// Plus ou moins — jeu gratuit : le film de droite a-t-il eu un plus gros ou un plus petit budget que celui de gauche ?
// Série jusqu'à la première erreur (15 au maximum), +10 Brundles par bonne réponse, bonus si 15/15.
import { CONFIG } from '../config.js';
import { loadMovies } from './movies.js';
import { pickDistinct } from './mcq.js';
import { monkeySVG } from '../art.js';
import { $, esc, money, fmt, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

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
      Enchaîne jusqu'à ${MAX_STREAK} bonnes réponses : <b>+${PER} ${CUR}</b> chacune, <b>+${BONUS} ${CUR}</b> si tu vas au bout. Une erreur et la série s'arrête.</p>
      <button class="btn btn-gold btn-lg" id="hi-start">Commencer</button></div>`;
    $('#hi-start', stage).onclick = start;
  }

  async function start() {
    if (!pool) {
      stage.innerHTML = `<div class="qz-card">${monkeySVG({ cls: 'bounce' })}<p>Chargement des films…</p></div>`;
      try { pool = (await loadMovies()).filter((m) => m.b >= 1000000); } catch (e) { console.error(e); if (alive) intro(); return; }
      if (!alive) return;
    }
    streak = 0; used = new Set(); credited = false;
    left = nextMovie(pool, null, used); used.add(left);
    right = nextMovie(pool, left, used); used.add(right);
    sfx.click();
    ask();
  }

  function ask() {
    state = 'ask';
    stage.innerHTML = `<div class="hi-score">Série : <b>${streak}</b> / ${MAX_STREAK}</div>
      <div class="hi-duel">${cardHTML(left, 'l', true)}<div class="hi-vs">VS</div>${cardHTML(right, 'r', false)}</div>`;
    stage.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => answer(b.dataset.a)));
  }

  function answer(a) {
    if (state !== 'ask') return;
    state = 'feedback';
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
    if (credited) return 0;
    credited = true;
    const perfect = streak >= MAX_STREAK;
    const amount = streak * PER + (perfect ? BONUS : 0);
    const s = wallet.stats;
    s.higherBest = Math.max(s.higherBest || 0, streak);
    wallet.freeReward('higher', amount, { Correct: streak, Perfect: perfect ? 1 : 0 });
    return amount;
  }

  function finish() {
    state = 'done';
    const amount = reward();
    const perfect = streak >= MAX_STREAK;
    stage.innerHTML = `<div class="qz-card">${monkeySVG(perfect ? { crown: true, fur: '#c98a00', face: '#ffe6a6', ear: '#ffd36b' } : { wink: streak >= 5 })}
      <h2>${perfect ? `${MAX_STREAK}/${MAX_STREAK}, sans-faute !` : `Série de ${streak}`}</h2>
      <p>${amount ? `+${money(amount)} ajoutés à ton solde.` : 'Pas de Brundles cette fois.'} Ton record : <b>${wallet.stats.higherBest || 0}</b>.</p>
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
    alive = false; document.removeEventListener('keydown', onKey);
    if ((state === 'ask' || state === 'feedback') && streak > 0 && !credited) reward();
  };
}
