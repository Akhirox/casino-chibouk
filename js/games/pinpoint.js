// Pinpoint — jeu gratuit : trouver la catégorie commune à des indices dévoilés un par un (5 au maximum).
// Moins il faut d'indices, plus ça rapporte.
import { PINPOINT } from './pinpoint-data.js';
import { $, esc, fmt, coinRain, CUR } from '../ui.js';
import { monkeySVG } from '../art.js';
import { sfx } from '../sfx.js';
import { endCardHTML } from './free-common.js';
import { createGuard, judge, punish, tooFast, refusedHTML, lockBannerHTML, lockedUntil } from '../fairplay.js';

export const PP_REWARDS = [40, 28, 20, 12, 6]; // réduits de 60 % (V15.1)
const STOP = new Set(['le', 'la', 'les', 'l', 'de', 'des', 'du', 'd', 'un', 'une', 'et', 'en', 'a', 'au', 'aux', 'qui', 'que', 'ce', 'ces', 'sont', 'c', 'est', 'on', 'y']);

// « Les Planètes du système solaire ! » → « planete systeme solaire »
export function norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 3 && /[sx]$/.test(w) && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w)).join(' ');
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Bonne réponse si la proposition contient une des réponses acceptées (mots entiers), ou à une faute de frappe près
export function matches(guess, p) {
  const g = norm(guess);
  if (!g) return false;
  const words = ` ${g} `;
  return [p.c, ...p.a].map(norm).filter(Boolean).some((a) => {
    if (g === a || words.includes(` ${a} `)) return true;
    const tol = a.length >= 9 ? 2 : a.length >= 5 ? 1 : 0;
    if (!tol) return false;
    if (lev(g, a) <= tol) return true;
    // réponse en un mot : on la cherche, avec une faute permise, parmi les mots de la proposition
    return !a.includes(' ') && g.split(' ').some((w) => lev(w, a) <= tol);
  });
}

const SEEN_KEY = 'chibouk_pp_seen';
function pickPuzzle() {
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch {}
  let pool = PINPOINT.filter((p) => !seen.includes(p.c));
  if (!pool.length) { seen = []; pool = PINPOINT; }
  const p = pool[Math.floor(Math.random() * pool.length)];
  seen.push(p.c);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
  return { p, left: pool.length - 1 };
}

export function mount(view, { wallet }) {
  let alive = true, state = 'intro', cur = null, shown = 1, guesses = [], credited = false, guard = null;
  view.innerHTML = `<div class="fg-wrap pp-wrap">
    <div class="game-head"><h1>Pin<span>point</span></h1><div class="actions"><span class="gc-tag">Gratuit · +${PP_REWARDS[4]} à +${PP_REWARDS[0]} ${CUR}</span></div></div>
    <div id="fg-stage"></div></div>`;
  const stage = $('#fg-stage', view);

  function intro() {
    state = 'intro';
    stage.innerHTML = `<div class="qz-card">${monkeySVG({ cap: true })}
      <h2>Quel est le point commun ?</h2>
      <p>Un indice est dévoilé, devine la <b>catégorie</b> qui relie les mots. Raté ? Un nouvel indice apparaît (5 au maximum).<br>
      Gain selon le nombre d'indices : ${PP_REWARDS.map((r, i) => `<b>${i + 1}</b> → +${r}`).join(' · ')} ${CUR}.</p>
      <p class="muted pp-count">${PINPOINT.length} catégories à découvrir. Pas besoin de la formulation exacte : « planètes » suffit pour « Planètes du système solaire ».</p>
      ${lockBannerHTML(wallet, 'pinpoint')}
      <button class="btn btn-gold btn-lg" id="fg-start" ${lockedUntil(wallet, 'pinpoint') ? 'disabled' : ''}>Jouer</button></div>`;
    $('#fg-start', stage).onclick = start;
  }

  function start() {
    if (lockedUntil(wallet, 'pinpoint')) { intro(); return; }
    const pick = pickPuzzle();
    cur = pick.p; shown = 1; guesses = []; credited = false; state = 'play';
    stage.innerHTML = `<div class="pp-board">
      <div class="pp-clues" id="pp-clues"></div>
      <form class="pp-form" id="pp-form" autocomplete="off"><input id="pp-in" class="bet-input pp-in" type="text" maxlength="60" placeholder="Ta réponse (la catégorie)…" aria-label="Ta réponse">
        <button class="btn btn-gold" type="submit">Proposer</button><button class="btn btn-ghost" type="button" id="pp-skip">Indice suivant</button></form>
      <div class="pp-guesses" id="pp-guesses"></div>
      <p class="muted pp-gain" id="pp-gain"></p></div>`;
    $('#pp-form', stage).onsubmit = (e) => { e.preventDefault(); guess($('#pp-in', stage).value); };
    $('#pp-skip', stage).onclick = () => guess('');
    render();
    guard && guard.destroy(); guard = createGuard(stage);
    $('#pp-in', stage).focus();
    sfx.click();
  }

  function render() {
    if (!alive || !cur) return;
    $('#pp-clues', stage).innerHTML = cur.i.map((t, k) => `<div class="pp-clue ${k < shown ? 'on' : ''} ${k === shown - 1 && state === 'play' ? 'new' : ''}"><small>Indice ${k + 1}</small><b>${k < shown ? esc(t) : '?'}</b></div>`).join('');
    $('#pp-guesses', stage).innerHTML = guesses.map((g) => `<span class="${g.ok ? 'ok' : ''}">${g.text ? esc(g.text) : '<i>passé</i>'}</span>`).join('');
    $('#pp-gain', stage).innerHTML = state === 'play' ? `Si tu trouves maintenant : <b class="gold">+${PP_REWARDS[shown - 1]} ${CUR}</b>` : '';
  }

  function guess(text) {
    if (state !== 'play') return;
    text = text.trim();
    const input = $('#pp-in', stage);
    if (text && guesses.some((g) => norm(g.text) === norm(text))) { input.select(); return; }
    if (text && matches(text, cur)) {
      guesses.push({ text, ok: true });
      return finish(true);
    }
    guesses.push({ text, ok: false });
    input.value = '';
    if (text) { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); sfx.lose(); } else sfx.click();
    if (shown >= 5) return finish(false);
    shown++;
    render();
    input.focus();
  }

  function finish(won) {
    state = 'done';
    const amount = won ? PP_REWARDS[shown - 1] : 0;
    // fair-play : lire l'indice et taper la catégorie prend au moins quelques secondes
    const v = judge(guard, won ? { minActions: 3, cheatSec: 1.2, fastSec: 2.5 } : {}); guard = null;
    if (won && v.flag !== 'ok') {
      credited = true;
      let pn = null;
      if (v.flag === 'cheat') pn = punish(wallet, 'pinpoint', null, v, amount); else tooFast(wallet, 'pinpoint', null, v);
      render();
      $('#pp-form', stage).remove();
      stage.insertAdjacentHTML('beforeend', refusedHTML(v, pn));
      $('[data-again]', stage).onclick = v.flag === 'cheat' ? intro : start;
      return;
    }
    if (!credited) {
      credited = true;
      wallet.freeReward('pinpoint', amount, won ? { Won: 1, ['Clue' + shown]: 1 } : { Lost: 1 }, { log: { sec: v.sec, actions: v.actions } });
    }
    render();
    if (won) { sfx.win(shown <= 2); coinRain(shown === 1 ? 30 : 12); } else sfx.lose();
    stage.insertAdjacentHTML('beforeend', endCardHTML({ win: won && shown <= 2, title: won ? (shown === 1 ? 'Du premier coup !' : `Trouvé en ${shown} indices`) : 'Raté !', amount,
      text: `La catégorie était : <b>${esc(cur.c)}</b>.`, again: 'Catégorie suivante' }));
    $('#pp-form', stage).remove();
    $('[data-again]', stage).onclick = start;
    $('[data-again]', stage).focus();
  }

  const onKey = (e) => { if (state === 'intro' && e.key === 'Enter' && !e.target.closest('button,input')) start(); };
  document.addEventListener('keydown', onKey);
  intro();
  return () => { alive = false; guard && guard.destroy(); document.removeEventListener('keydown', onKey); };
}
