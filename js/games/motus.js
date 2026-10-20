// Mot du jour — façon Motus : le même mot pour tout le monde, 6 essais, la première lettre est donnée.
// Rouge = bonne lettre bien placée, jaune = lettre présente mais mal placée.
import { CONFIG } from '../config.js';
import { gotHTML, withFreeBonus } from '../rewards.js';
import { parisDate, yesterday } from '../wallet.js';
import { today } from '../progress.js';
import { monkeySVG } from '../art.js';
import { $, $$, fmt, money, toast, coinRain, CUR } from '../ui.js';
import { sfx } from '../sfx.js';

export const TRIES = 6;
export const MOTUS_REWARDS = [1200, 900, 650, 480, 330, 210]; // selon le nombre d'essais (×3 en V30)
const DAY0 = Date.UTC(2026, 0, 1);

let dict = null, targets = null;
async function loadData() {
  if (!dict) {
    const [txt, list] = await Promise.all([
      fetch('data/mots.txt', { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }),
      fetch('data/mots-cibles.json', { cache: 'force-cache' }).then((r) => r.json()),
    ]);
    dict = new Set(txt.split('\n'));
    targets = list;
  }
  return { dict, targets };
}

// Mot du jour : même ordre mélangé pour tout le monde, un mot par jour
function seededPerm(n, seed) {
  const a = Array.from({ length: n }, (_, i) => i);
  let h = seed >>> 0;
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function wordOfDay(list, date = parisDate()) {
  const [y, m, d] = date.split('-').map(Number);
  const day = Math.round((Date.UTC(y, m - 1, d) - DAY0) / 86400000);
  const perm = seededPerm(list.length, 0xc0ffee);
  return list[perm[((day % list.length) + list.length) % list.length]];
}

// Couleurs façon Motus (gère les lettres en double)
export function score(guess, word) {
  const res = Array(word.length).fill('absent');
  const left = {};
  for (let i = 0; i < word.length; i++) {
    if (guess[i] === word[i]) res[i] = 'ok';
    else left[word[i]] = (left[word[i]] || 0) + 1;
  }
  for (let i = 0; i < word.length; i++) {
    if (res[i] === 'ok') continue;
    if (left[guess[i]]) { res[i] = 'mis'; left[guess[i]]--; }
  }
  return res;
}
const clean = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');

export function mount(view, { wallet }) {
  let alive = true, word = null, input = '', state = null, busy = false;
  view.innerHTML = `<div class="mo-wrap">
    <div class="game-head"><h1>Mot du <span>jour</span></h1>
      <div class="actions"><span class="gc-tag">Gratuit · jusqu'à ${MOTUS_REWARDS[0]} ${CUR}</span></div></div>
    <div class="mo-stage" id="mo-stage"><div class="qz-card">${monkeySVG({ cls: 'bounce' })}<p>Chargement du dictionnaire…</p></div></div></div>`;
  const stage = $('#mo-stage', view);

  const day = () => today(wallet);
  function saveState() { day().motus = { ...state }; wallet.set('day', wallet.p.day); }

  function rowHTML(g, res, cls = '') {
    return `<div class="mo-row ${cls}">${[...word].map((_, i) => `<span class="mo-c ${res ? res[i] : ''}">${g[i] || ''}</span>`).join('')}</div>`;
  }
  // lettres déjà trouvées à leur place (affichées en fantôme sur la ligne en cours)
  function knownLetters() {
    return [...word].map((c, i) => (i === 0 || state.guesses.some((g) => g[i] === c) ? c : '.'));
  }
  function render() {
    if (!alive) return;
    const rows = [];
    state.guesses.forEach((g) => rows.push(rowHTML(g, score(g, word))));
    if (!state.done) {
      const known = knownLetters();
      rows.push(`<div class="mo-row cur">${[...word].map((_, i) => {
        const v = input[i] || (i === 0 ? word[0] : '');
        return `<span class="mo-c ${v ? 'typed' : ''} ${!input[i] && known[i] !== '.' ? 'ghost' : ''}">${v || (known[i] !== '.' ? known[i] : '')}</span>`;
      }).join('')}</div>`);
    }
    while (rows.length < TRIES) rows.push(rowHTML('', null, 'empty'));
    const letters = {};
    state.guesses.forEach((g) => score(g, word).forEach((r, i) => { const c = g[i]; const rank = { ok: 3, mis: 2, absent: 1 }; if (!letters[c] || rank[r] > rank[letters[c]]) letters[c] = r; }));
    const kb = ['AZERTYUIOP', 'QSDFGHJKLM', '⌫WXCVBN⏎'];
    stage.innerHTML = `
      <p class="mo-info">${word.length} lettres · commence par <b>${word[0]}</b> · ${TRIES} essais. Le mot change chaque jour à minuit.</p>
      <div class="mo-grid" style="--n:${word.length}">${rows.join('')}</div>
      ${state.done ? endHTML() : `<div class="mo-msg" id="mo-msg"></div>
      <div class="mo-kb">${kb.map((r) => `<div>${[...r].map((k) => `<button data-k="${k}" class="${letters[k] || ''} ${k === '⌫' || k === '⏎' ? 'wide' : ''}">${k === '⏎' ? 'Valider' : k}</button>`).join('')}</div>`).join('')}</div>`}`;
    $$('.mo-kb button', stage).forEach((b) => (b.onclick = () => key(b.dataset.k)));
    const share = $('#mo-share', stage);
    if (share) share.onclick = copyShare;
  }
  function endHTML() {
    const n = state.guesses.length;
    return `<div class="qz-card mo-end">${monkeySVG(state.won ? { crown: n <= 2, wink: true } : { wink: false })}
      <h2>${state.won ? `Trouvé en ${n} essai${n > 1 ? 's' : ''} !` : `Raté… le mot était ${word}`}</h2>
      <p>${state.won ? `${gotHTML(state.reward || 0, 'motus')} gagnés.` : 'Pas de Brundles aujourd\'hui.'} Reviens demain pour un nouveau mot${state.won && (wallet.stats.motusStreak || 0) > 1 ? ` (série de <b>${wallet.stats.motusStreak} jours</b>)` : ''}.</p>
      <button class="btn btn-ghost" id="mo-share">Copier mon résultat</button></div>`;
  }
  function copyShare() {
    const n = state.won ? state.guesses.length : 'X';
    const grid = state.guesses.map((g) => score(g, word).map((r) => (r === 'ok' ? '🟥' : r === 'mis' ? '🟡' : '🟦')).join('')).join('\n');
    const txt = `Casino Chibouk · Mot du jour ${parisDate()} ${n}/${TRIES}\n${grid}`;
    navigator.clipboard?.writeText(txt).then(() => toast('Résultat copié, colle-le à tes potes !'), () => toast('Copie impossible'));
  }
  const msg = (t) => { const m = $('#mo-msg', stage); if (m) { m.textContent = t; m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); } };

  function key(k) {
    if (!state || state.done || busy) return;
    if (k === '⌫' || k === 'Backspace') { input = input.length > 1 ? input.slice(0, -1) : ''; render(); return; }
    if (k === '⏎' || k === 'Enter') { submit(); return; }
    const c = clean(k);
    if (c.length !== 1) return;
    if (!input) input = word[0] === c ? c : word[0] + c; // la première lettre est donnée
    else if (input.length < word.length) input += c;
    sfx.tick && sfx.tick();
    render();
  }

  function submit() {
    const g = input;
    if (g.length !== word.length) { msg(`Il faut ${word.length} lettres`); sfx.lose(); return; }
    if (g[0] !== word[0]) { msg(`Le mot commence par ${word[0]}`); return; }
    if (!dict.has(g) && g !== word) { msg('Ce mot n\'est pas dans le dictionnaire'); sfx.lose(); return; }
    state.guesses.push(g);
    input = '';
    const won = g === word;
    if (won || state.guesses.length >= TRIES) finish(won);
    else { saveState(); sfx.click(); }
    render();
    const last = $$('.mo-row:not(.empty)', stage)[state.guesses.length - 1];
    last && last.classList.add('reveal');
  }

  function finish(won) {
    state.done = true; state.won = won;
    const n = state.guesses.length;
    const s = wallet.stats;
    if (won) {
      s.motusStreak = s.motusLastWin === yesterday() ? (s.motusStreak || 0) + 1 : 1;
      s.motusBestStreak = Math.max(s.motusBestStreak || 0, s.motusStreak);
      s.motusLastWin = parisDate();
    } else s.motusStreak = 0;
    state.reward = won ? MOTUS_REWARDS[n - 1] : 0;
    saveState();
    wallet.freeReward('motus', state.reward, { Won: won ? 1 : 0, Tries: won ? n : 0, Fast: won && n <= 2 ? 1 : 0 });
    if (won) { sfx.win(n <= 3); coinRain(n <= 2 ? 40 : 20); } else sfx.lose();
    window.dispatchEvent(new CustomEvent('chibouk:feed', { detail: { type: 'motus', won, tries: n } }));
  }

  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop') || e.target.closest('input,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-ZÀ-ÿ]$/.test(e.key)) { e.preventDefault(); key(e.key); }
  };
  document.addEventListener('keydown', onKey);

  loadData().then(() => {
    if (!alive) return;
    word = wordOfDay(targets);
    const d = day();
    state = d.motus && d.motus.word === word ? { ...d.motus } : { word, guesses: [], done: false, won: false };
    render();
  }).catch((e) => { console.error(e); stage.innerHTML = '<p class="neg">Impossible de charger le dictionnaire. Réessaie plus tard.</p>'; });

  return () => { alive = false; document.removeEventListener('keydown', onKey); };
}
