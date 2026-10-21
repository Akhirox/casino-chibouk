// Records : le meilleur joueur de chaque mini-jeu détient le record. Records absolus seulement (pas de moyenne,
// pas de jeux de casino), départagés au centième de seconde puis par la date : deux joueurs ne peuvent pas avoir
// le même record. Chaque record détenu donne un tag honorifique sur le profil et +5 % sur les gains des mini-jeux
// et des défis de la jungle (au plus +50 %).
//
// Chaque joueur garde son meilleur résultat par jeu dans stats.rec[jeu] = { l, v, t, at } :
//   l  : niveau (le plus dur l'emporte), v : score (ou nombre de coups, plus petit = mieux pour le Memory),
//   t  : chrono en ms, arrondi au centième (plus petit = mieux), at : date du record (le premier l'emporte).
// Les anciens records (avant le chrono) restent valables tant que personne ne fait mieux (« legacy »).
// Calculé à partir de la liste des joueurs déjà gardée pour les classements (aucune lecture en plus).
import { esc, fmt } from './ui.js';
import { icon } from './art.js';

export const RECORD_BONUS = 0.05, RECORD_CAP = 0.5;
const S = (s, k) => (s && s[k]) || 0;
const LV = ['Facile', 'Moyen', 'Difficile'];

// Chrono au centième : « 23,47 s », « 1 min 02,35 »
export function fmtCs(ms) {
  if (!(ms >= 0) || !isFinite(ms)) return '—';
  const cs = Math.round(ms / 10), m = Math.floor(cs / 6000), sec = Math.floor((cs % 6000) / 100), c = cs % 100;
  const sc = `${m ? String(sec).padStart(2, '0') : sec},${String(c).padStart(2, '0')}`;
  return m ? `${m} min ${sc}` : `${sc} s`;
}
const oldTime = (sec) => { const m = Math.floor(sec / 60), x = Math.round(sec % 60); return m ? `${m} min ${String(x).padStart(2, '0')}` : `${x} s`; };

// ——— types de records ———
// quiz : niveau, bonnes réponses, chrono total (somme des temps de réponse)
const quiz = (k, name, levels, n = 10) => ({
  k, name, levels,
  legacy: (s) => { // anciens sans-faute (sans chrono)
    for (let i = levels.length - 1; i >= 0; i--) if (levels[i].stat ? S(s, k + levels[i].stat + 'Perfect') : S(s, k + 'Perfect')) return { l: i, v: n };
    return null;
  },
  txt: (e) => `${e.v}/${n}${e.t != null ? ` en ${fmtCs(e.t)}` : ''}`,
});
// meilleur temps par niveau (puzzles)
const timeRec = (k, name, levels, keyOf) => ({
  k, name, levels: levels.map((label) => ({ label })),
  legacy: (s) => { for (let i = levels.length - 1; i >= 0; i--) { const v = S(s, keyOf(i)); if (v) return { l: i, v: 0, t: v * 1000, old: 1 }; } return null; },
  txt: (e) => (e.old ? oldTime(e.t / 1000) : fmtCs(e.t)),
});
// compteur (plus grand = mieux), départagé par la date à laquelle il a été atteint
const count = (k, name, stat, txt) => ({ k, name, count: stat, legacy: (s) => (S(s, stat) ? { v: S(s, stat) } : null), txt: (e) => txt(e.v) });

export const RECORD_CATS = [
  quiz('quiz', 'Calcul mental', [{ label: 'Facile', stat: 'Easy' }, { label: 'Moyen', stat: 'Medium' }, { label: 'Difficile', stat: 'Hard' }]),
  quiz('capitals', 'Capitales', [{ label: 'Facile' }, { label: 'Expert', stat: 'Expert' }]),
  quiz('flags', 'Drapeaux', [{ label: 'Facile' }, { label: 'Expert', stat: 'Expert' }]),
  quiz('movies', 'Quiz ciné', [{ label: '' }]),
  quiz('geo', 'Géographie', [{ label: 'Facile', stat: 'Easy' }, { label: 'Moyen', stat: 'Medium' }, { label: 'Difficile', stat: 'Hard' }]),
  quiz('culture', 'Culture G', [{ label: '', stat: 'Expert' }]),
  { k: 'higher', name: 'Plus ou moins', legacy: (s) => (S(s, 'higherBest') ? { v: S(s, 'higherBest') } : null), txt: (e) => `série de ${e.v}${e.t != null ? ` en ${fmtCs(e.t)}` : ''}` },
  count('motus', 'Mot du jour', 'motusBestStreak', (v) => `${v} jour${v > 1 ? 's' : ''} de suite`),
  count('pinpoint', 'Pinpoint', 'pinpointClue1', (v) => `${fmt(v)} trouvée${v > 1 ? 's' : ''} dès le 1er indice`),
  timeRec('queens', 'Queens', ['7×7', '8×8', '9×9'], (i) => 'queensBest' + (7 + i)),
  timeRec('tango', 'Tango', LV, (i) => 'tangoBest' + i),
  timeRec('sudoku', 'Sudoku', LV, (i) => 'sudokuBest' + i),
  timeRec('demineur', 'Démineur', LV, (i) => 'demineurBest' + i),
  timeRec('crossword', 'Mots croisés', LV, (i) => 'crosswordBest' + i),
  { k: 'memory', name: 'Memory', low: true, levels: LV.map((label) => ({ label })),
    legacy: (s) => { for (let i = 2; i >= 0; i--) if (S(s, 'memoryBest' + i)) return { l: i, v: S(s, 'memoryBest' + i) }; return null; },
    txt: (e) => `${e.v} coups${e.t != null ? ` en ${fmtCs(e.t)}` : ''}` },
  { k: 'snake', name: 'Snake', levels: LV.map((label) => ({ label })),
    legacy: (s) => { for (let i = 2; i >= 0; i--) if (S(s, 'snakeBest' + i)) return { l: i, v: S(s, 'snakeBest' + i) }; return null; },
    txt: (e) => `${e.v} banane${e.v > 1 ? 's' : ''}${e.t != null ? ` en ${fmtCs(e.t)}` : ''}` },
  { k: 'typing', name: 'Frappe éclair', levels: ['Facile', 'Normal', 'Difficile'].map((label) => ({ label })),
    legacy: (s) => { for (let i = 2; i >= 0; i--) if (S(s, 'typingBest' + i)) return { l: i, v: S(s, 'typingBest' + i) }; return null; },
    txt: (e) => `${e.v} mots/min${e.t != null ? `, dernier à ${fmtCs(e.t)}` : ''}` },
  count('breaker', 'Casse-briques', 'breakerLevels', (v) => `${fmt(v)} niveaux`),
];
const CAT = Object.fromEntries(RECORD_CATS.map((c) => [c.k, c]));
export const recordCat = (k) => CAT[k];

// ——— comparaison ———
const tOf = (e) => (e.t != null && isFinite(e.t) ? e.t : Infinity);
// > 0 si a est meilleur que b (niveau, puis score, puis chrono ; sans la date)
function cmpCore(c, a, b) {
  if (!a || !b) return a ? 1 : b ? -1 : 0;
  if ((a.l || 0) !== (b.l || 0)) return (a.l || 0) - (b.l || 0);
  if ((a.v || 0) !== (b.v || 0)) return c.low ? (b.v || 0) - (a.v || 0) : (a.v || 0) - (b.v || 0);
  const ta = tOf(a), tb = tOf(b);
  if (ta !== tb) return ta < tb ? 1 : -1;
  return 0;
}
// avec la date : le premier à l'avoir fait l'emporte (les anciens records, sans date, comptent comme les plus anciens)
const cmpFull = (c, a, b) => cmpCore(c, a, b) || ((b.at || 0) - (a.at || 0));

// meilleur résultat d'un joueur (record chronométré ou ancien record)
export function entryOf(c, s) {
  if (typeof c === 'string') c = CAT[c];
  const r = s && s.rec && s.rec[c.k];
  let old = null; try { old = c.legacy ? c.legacy(s || {}) : null; } catch {}
  if (!r) return old;
  if (!old) return r;
  return cmpCore(c, old, r) > 0 ? old : r;
}
export const entryText = (c, e) => {
  if (typeof c === 'string') c = CAT[c];
  if (!e) return '';
  const lab = c.levels && c.levels.length > 1 && c.levels[e.l || 0] ? ` (${c.levels[e.l || 0].label.toLowerCase()})` : '';
  return c.txt(e) + lab;
};
// valeur numérique pour trier un tableau (classement des mini-jeux)
export function entrySort(c, e) {
  if (!e) return -1;
  const v = c.low ? 1e5 - Math.min(1e5, e.v || 0) : Math.min(9.99e5, (e.v || 0));
  return (e.l || 0) * 1e15 + v * 1e8 + (1e8 - Math.min(1e8 - 1, tOf(e) === Infinity ? 1e8 - 1 : tOf(e)));
}

// Nouveau résultat : gardé s'il bat le meilleur du joueur. e = { l, v, t (ms) }.
// Renvoie { pb (record perso battu), best (meilleur du joueur), holder (détenteur actuel, autre que soi) }
export function submitRecord(wallet, k, e) {
  const c = CAT[k];
  if (!c || !wallet) return { pb: false };
  const s = wallet.stats;
  e = { l: e.l || 0, v: e.v || 0, ...(e.t != null && isFinite(e.t) ? { t: Math.max(0, Math.round(e.t / 10) * 10) } : {}), at: Date.now() };
  const cur = entryOf(c, s);
  const pb = !cur || cmpCore(c, e, cur) > 0;
  if (pb) { s.rec = { ...(s.rec || {}), [k]: e }; recompute(); }
  return { pb, best: pb ? e : cur, prev: cur };
}
// Compteurs (série au Mot du jour, Pinpoint, casse-briques) : date à laquelle la valeur a été atteinte
let counterSeen = null;
export function trackCounters(wallet) {
  const snap = () => Object.fromEntries(RECORD_CATS.filter((c) => c.count).map((c) => [c.k, S(wallet.stats, c.count)]));
  counterSeen = snap();
  return wallet.on(() => {
    let changed = false;
    for (const c of RECORD_CATS) {
      if (!c.count) continue;
      const v = S(wallet.stats, c.count);
      if (v > (counterSeen[c.k] || 0)) { wallet.stats.rec = { ...(wallet.stats.rec || {}), [c.k]: { v, at: Date.now() } }; changed = true; }
      counterSeen[c.k] = v;
    }
    if (changed) recompute();
  });
}

// ——— détenteurs ———
let holders = new Map(); // k → { uid, pseudo, txt, e }
let myUid = null, lastRows = null;
const subs = new Set();
export function onRecords(cb) { subs.add(cb); return () => subs.delete(cb); }
// Recalcul à partir de la liste des joueurs (appelé à chaque relecture de la liste)
export function setRecordPlayers(rows, uid) { myUid = uid; lastRows = rows; recompute(); }
function recompute() {
  if (!lastRows) return;
  const next = new Map();
  for (const c of RECORD_CATS) {
    let best = null;
    for (const p of lastRows) {
      if (p.banned) continue;
      const e = entryOf(c, p.stats || {});
      if (!e || !((e.v || 0) > 0 || e.t != null)) continue;
      const d = best ? cmpFull(c, e, best.e) : 1;
      if (d > 0 || (d === 0 && String(p.uid) < String(best.uid))) best = { uid: p.uid, pseudo: p.pseudo, e, txt: entryText(c, e) };
    }
    if (best) next.set(c.k, best);
  }
  holders = next;
  subs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
}
export const recordsOf = (uid) => RECORD_CATS.filter((c) => holders.get(c.k) && holders.get(c.k).uid === uid).map((c) => ({ ...c, txt: holders.get(c.k).txt }));
export const recordHolder = (k) => holders.get(k) || null;
// bonus du joueur connecté : +5 % par record, au plus +50 %
export const recordBonus = () => (myUid ? Math.min(RECORD_CAP, RECORD_BONUS * recordsOf(myUid).length) : 0);
export const recordCount = () => (myUid ? recordsOf(myUid).length : 0);

// Ligne « record » d'un jeu (page du jeu) : détenteur et meilleur résultat du joueur
export function recordLineHTML(k, wallet) {
  const c = CAT[k];
  if (!c) return '';
  const h = holders.get(k), mine = entryOf(c, wallet.stats);
  const me = h && h.uid === wallet.uid;
  if (!lastRows) return mine ? `<div class="gl-rec">${icon('trophy')}<div><b>Ton record : ${esc(entryText(c, mine))}</b></div></div>` : ''; // liste des joueurs pas encore lue
  return `<div class="gl-rec">${icon('trophy')}<div><b>Record : ${h ? `${esc(h.txt)} <small>par ${me ? 'toi' : esc(h.pseudo)}</small>` : 'personne pour l\'instant'}</b>
    ${!me ? `<small>Ton meilleur : ${mine ? esc(entryText(c, mine)) : '—'}</small>` : '<small>+5 % sur tes gains de mini-jeux et de défis tant que tu le gardes</small>'}</div></div>`;
}
// Petit texte de fin de partie : record perso battu, et record à battre
export function recordEndHTML(k, res, wallet) {
  const c = CAT[k];
  if (!c || !res) return '';
  const h = holders.get(k);
  const mine = res.best ? entryText(c, res.best) : '';
  const top = h && h.uid !== wallet.uid ? ` Record à battre : <b>${esc(h.txt)}</b> par ${esc(h.pseudo)}.` : h ? ' <b>Tu détiens le record !</b>' : '';
  return `<span class="rec-end">${res.pb ? `Nouveau record perso : <b>${esc(mine)}</b>.` : mine ? `Ton record : ${esc(mine)}.` : ''}${top}</span>`;
}

// tags honorifiques (profil)
export function recordTagsHTML(p, max = 99) {
  const list = recordsOf(p.uid);
  if (!list.length) return '';
  const shown = list.slice(0, max);
  return `<div class="rec-tags">${shown.map((c) => `<span class="rec-tag" title="Record ${esc(c.name)} : ${esc(c.txt)}">${icon('trophy')}Record ${esc(c.name)}</span>`).join('')}${list.length > shown.length ? `<span class="rec-tag more">+${list.length - shown.length}</span>` : ''}</div>`;
}
