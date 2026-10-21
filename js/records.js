// Records (V32) : le meilleur joueur de chaque catégorie détient le record. Chaque record détenu donne un tag
// honorifique sur le profil et +5 % sur les gains des mini-jeux et des défis de la jungle (au plus +50 %).
// Calculé à partir de la liste des joueurs déjà gardée pour les classements (aucune lecture en plus).
import { esc, fmt } from './ui.js';
import { icon } from './art.js';
// (liste recopiée de stats.js : records.js est importé par players.js, qui est importé par stats.js)
const GAMES = [['slots', 'Chibouk Slot'], ['jungle', 'Jungle Connect'], ['craps', 'Craps'], ['blackjack', 'Blackjack'], ['roulette', 'Roulette'], ['plinko', 'Plinkoko'], ['crash', 'Crashibouk'], ['tower', 'Tower'], ['mines', 'Mines'], ['dice', 'Dice'], ['hilo', 'Hi-Lo'], ['keno', 'Keno'], ['wheel', 'Roue du Singe'], ['limbo', 'Limbo'], ['scratch', 'Jeux à gratter']].map(([k, name]) => ({ k, name }));

export const RECORD_BONUS = 0.05, RECORD_CAP = 0.5;
const S = (s, k) => (s && s[k]) || 0;
const tm = (sec) => { sec = Math.round(sec); const m = Math.floor(sec / 60), x = sec % 60; return m ? `${m} min ${String(x).padStart(2, '0')}` : `${x} s`; };
const LV = ['facile', 'moyen', 'difficile'];
// meilleure valeur au niveau le plus dur joué : le niveau compte d'abord, puis la valeur (low = plus petit = mieux)
const levelBest = (keys, labels, low = false) => (s) => { for (let i = keys.length - 1; i >= 0; i--) { const v = S(s, keys[i]); if (v) return { v: i * 1e7 + (low ? 1e6 - v : v), txt: low ? `${labels === 'moves' ? `${v} coups` : tm(v)} (${LV[i] || ''})` : `${fmt(v)} (${LV[i] || ''})` }; } return null; };
// moyenne sur 10 aux quiz, à partir de 10 parties
const quizAvg = (g) => (s) => (S(s, g + 'Rounds') >= 10 ? { v: S(s, g + 'Correct') / S(s, g + 'Rounds'), txt: `${(S(s, g + 'Correct') / S(s, g + 'Rounds')).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}/10 de moyenne` } : null);

// { k, name, val(stats) → { v (plus grand = meilleur), txt } | null }
export const RECORD_CATS = [
  { k: 'quiz', name: 'Calcul mental', val: quizAvg('quiz') },
  { k: 'capitals', name: 'Capitales', val: quizAvg('capitals') },
  { k: 'flags', name: 'Drapeaux', val: quizAvg('flags') },
  { k: 'movies', name: 'Quiz ciné', val: quizAvg('movies') },
  { k: 'geo', name: 'Géographie', val: quizAvg('geo') },
  { k: 'culture', name: 'Culture G', val: quizAvg('culture') },
  { k: 'higher', name: 'Plus ou moins', val: (s) => (S(s, 'higherBest') ? { v: S(s, 'higherBest'), txt: `série de ${S(s, 'higherBest')}` } : null) },
  { k: 'motus', name: 'Mot du jour', val: (s) => (S(s, 'motusBestStreak') ? { v: S(s, 'motusBestStreak'), txt: `${S(s, 'motusBestStreak')} jours de suite` } : null) },
  { k: 'pinpoint', name: 'Pinpoint', val: (s) => (S(s, 'pinpointWon') >= 10 ? (() => { const a = [1, 2, 3, 4, 5].reduce((x, k) => x + k * S(s, 'pinpointClue' + k), 0) / S(s, 'pinpointWon'); return { v: 10 - a, txt: `${a.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} indices en moyenne` }; })() : null) },
  { k: 'queens', name: 'Queens', val: (s) => { for (const n of [9, 8, 7]) { const v = S(s, 'queensBest' + n); if (v) return { v: n * 1e7 + 1e6 - v, txt: `${tm(v)} (${n}×${n})` }; } return null; } },
  { k: 'tango', name: 'Tango', val: levelBest(['tangoBest0', 'tangoBest1', 'tangoBest2'], LV, true) },
  { k: 'sudoku', name: 'Sudoku', val: levelBest(['sudokuBest0', 'sudokuBest1', 'sudokuBest2'], LV, true) },
  { k: 'demineur', name: 'Démineur', val: levelBest(['demineurBest0', 'demineurBest1', 'demineurBest2'], LV, true) },
  { k: 'crossword', name: 'Mots croisés', val: levelBest(['crosswordBest0', 'crosswordBest1', 'crosswordBest2'], LV, true) },
  { k: 'memory', name: 'Memory', val: levelBest(['memoryBest0', 'memoryBest1', 'memoryBest2'], 'moves', true) },
  { k: 'snake', name: 'Snake', val: levelBest(['snakeBest0', 'snakeBest1', 'snakeBest2'], LV) },
  { k: 'typing', name: 'Frappe éclair', val: (s) => { const r = levelBest(['typingBest0', 'typingBest1', 'typingBest2'], LV)(s); return r && { ...r, txt: r.txt.replace(/^([\d\s ]+)/, '$1 mots/min') }; } },
  { k: 'breaker', name: 'Casse-briques', val: (s) => (S(s, 'breakerLevels') ? { v: S(s, 'breakerLevels'), txt: `${fmt(S(s, 'breakerLevels'))} niveaux` } : null) },
  // jeux de casino : plus gros multiplicateur (tag « Record Multi … »)
  ...GAMES.map((g) => ({ k: 'm_' + g.k, name: 'Multi ' + g.name, casino: true, val: (s) => { const b = s && s.games && s.games[g.k] && s.games[g.k].bestMult; return b ? { v: b, txt: `×${b.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}` } : null; } })),
];

let holders = new Map(); // k → [{ uid, pseudo, txt }]
let myUid = null;
const subs = new Set();
export function onRecords(cb) { subs.add(cb); return () => subs.delete(cb); }
// Recalcul à partir de la liste des joueurs (appelé à chaque relecture de la liste)
export function setRecordPlayers(rows, uid) {
  myUid = uid;
  const next = new Map();
  for (const c of RECORD_CATS) {
    let best = null, list = [];
    for (const p of rows) {
      if (p.banned) continue;
      let r = null; try { r = c.val(p.stats || {}); } catch {}
      if (!r || !(r.v > 0)) continue;
      if (!best || r.v > best + 1e-9) { best = r.v; list = [{ uid: p.uid, pseudo: p.pseudo, txt: r.txt }]; }
      else if (Math.abs(r.v - best) <= 1e-9) list.push({ uid: p.uid, pseudo: p.pseudo, txt: r.txt });
    }
    if (list.length) next.set(c.k, list);
  }
  holders = next;
  subs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
}
export const recordsOf = (uid) => RECORD_CATS.filter((c) => (holders.get(c.k) || []).some((h) => h.uid === uid)).map((c) => ({ ...c, txt: holders.get(c.k).find((h) => h.uid === uid).txt }));
export const recordHolders = (k) => holders.get(k) || [];
// bonus du joueur connecté : +5 % par record, au plus +50 %
export const recordBonus = () => (myUid ? Math.min(RECORD_CAP, RECORD_BONUS * recordsOf(myUid).length) : 0);
export const recordCount = () => (myUid ? recordsOf(myUid).length : 0);

// tags honorifiques (profil)
export function recordTagsHTML(p, max = 99) {
  const list = recordsOf(p.uid);
  if (!list.length) return '';
  const shown = list.slice(0, max);
  return `<div class="rec-tags">${shown.map((c) => `<span class="rec-tag${c.casino ? ' casino' : ''}" title="Record ${esc(c.name)} : ${esc(c.txt)}">${icon('trophy')}Record ${esc(c.name)}</span>`).join('')}${list.length > shown.length ? `<span class="rec-tag more">+${list.length - shown.length}</span>` : ''}</div>`;
}
