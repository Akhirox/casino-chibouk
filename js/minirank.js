// Classement des mini-jeux : pour chaque jeu gratuit, parties jouées, réussite, moyenne (score ou temps), record et gains.
// Tout vient des statistiques déjà synchronisées dans les profils (aucune lecture en plus).
import { $, $$, fmt, esc } from './ui.js';
import { avatarHTML } from './profile.js';
import { titleHTML } from './shop.js';
import { icon } from './art.js';
import { entryOf, entryText, entrySort, recordCat } from './records.js';

const tm = (sec) => { if (!(sec > 0)) return '—'; sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? `${m} min ${String(s).padStart(2, '0')}` : `${s} s`; };
const n1 = (x) => (x > 0 ? x.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—');
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + ' %' : '—');
const S = (s, k) => (s && s[k]) || 0;
const avgTime = (s, g) => (S(s, g + 'Timed') ? S(s, g + 'Sec') / S(s, g + 'Timed') : 0);
// meilleur temps : niveau le plus dur qui a un record
const LV = ['facile', 'moyen', 'difficile'];
// record absolu du joueur (même calcul que les records : niveau, score, chrono au centième)
const recCol = (k) => ['Record', (s) => entrySort(recordCat(k), entryOf(k, s)), (s) => { const e = entryOf(k, s); return e ? esc(entryText(k, e)) : '—'; }, 1];

// Colonnes : [titre, valeur(s) pour le tri, texte affiché, ordre (1 = plus grand d'abord, -1 = plus petit d'abord)]
const rounds = (g) => ['Parties', (s) => S(s, g + 'Rounds'), (s) => fmt(S(s, g + 'Rounds')), 1];
const gains = (g) => ['Gagné', (s) => S(s, g + 'Total'), (s) => fmt(S(s, g + 'Total')), 1];
const quizCols = (g) => [rounds(g), ['Moyenne', (s) => (S(s, g + 'Rounds') ? S(s, g + 'Correct') / S(s, g + 'Rounds') : 0), (s) => (S(s, g + 'Rounds') ? `${n1(S(s, g + 'Correct') / S(s, g + 'Rounds'))} / 10` : '—'), 1],
  ['Sans-faute', (s) => S(s, g + 'Perfect'), (s) => fmt(S(s, g + 'Perfect')), 1], ['Temps moyen', (s) => avgTime(s, g) || Infinity, (s) => tm(avgTime(s, g)), -1], recCol(g), gains(g)];
const timed = (g, bestKeys, labels, unit = 'time') => [rounds(g), ['Réussies', (s) => S(s, g + 'Won'), (s) => `${fmt(S(s, g + 'Won'))} <small class="muted">${pct(S(s, g + 'Won'), S(s, g + 'Rounds'))}</small>`, 1],
  ['Temps moyen', (s) => avgTime(s, g) || Infinity, (s) => tm(avgTime(s, g)), -1],
  recCol(g), gains(g)];

export const MINI_GAMES = [
  { k: 'quiz', name: 'Calcul mental', cols: quizCols('quiz') },
  { k: 'capitals', name: 'Capitales', cols: quizCols('capitals') },
  { k: 'flags', name: 'Drapeaux', cols: quizCols('flags') },
  { k: 'movies', name: 'Quiz ciné', cols: quizCols('movies') },
  { k: 'higher', name: 'Plus ou moins', cols: [rounds('higher'), ['Moyenne', (s) => (S(s, 'higherRounds') ? S(s, 'higherCorrect') / S(s, 'higherRounds') : 0), (s) => (S(s, 'higherRounds') ? n1(S(s, 'higherCorrect') / S(s, 'higherRounds')) : '—'), 1],
    recCol('higher'), ['Séries complètes', (s) => S(s, 'higherPerfect'), (s) => fmt(S(s, 'higherPerfect')), 1], gains('higher')] },
  { k: 'motus', name: 'Mot du jour', cols: [rounds('motus'), ['Trouvés', (s) => S(s, 'motusWon'), (s) => `${fmt(S(s, 'motusWon'))} <small class="muted">${pct(S(s, 'motusWon'), S(s, 'motusRounds'))}</small>`, 1],
    ['Essais moyens', (s) => (S(s, 'motusWon') ? S(s, 'motusTries') / S(s, 'motusWon') : Infinity), (s) => (S(s, 'motusWon') ? n1(S(s, 'motusTries') / S(s, 'motusWon')) : '—'), -1],
    ['Meilleure série', (s) => S(s, 'motusBestStreak'), (s) => fmt(S(s, 'motusBestStreak')), 1], gains('motus')] },
  { k: 'geo', name: 'Géographie', cols: quizCols('geo') },
  { k: 'culture', name: 'Culture G', cols: quizCols('culture') },
  { k: 'typing', name: 'Frappe éclair', cols: [rounds('typing'), ['Mots / min moyen', (s) => (S(s, 'typingRounds') ? S(s, 'typingWords') / S(s, 'typingRounds') : 0), (s) => (S(s, 'typingRounds') ? n1(S(s, 'typingWords') / S(s, 'typingRounds')) : '—'), 1],
    recCol('typing'),
    ['Précision', (s) => { const t = S(s, 'typingWords') + S(s, 'typingErrors'); return t ? S(s, 'typingWords') / t : 0; }, (s) => pct(S(s, 'typingWords'), S(s, 'typingWords') + S(s, 'typingErrors')), 1], gains('typing')] },
  { k: 'pinpoint', name: 'Pinpoint', cols: [rounds('pinpoint'), ['Trouvées', (s) => S(s, 'pinpointWon'), (s) => `${fmt(S(s, 'pinpointWon'))} <small class="muted">${pct(S(s, 'pinpointWon'), S(s, 'pinpointRounds'))}</small>`, 1],
    ['Indices moyens', (s) => { const w = S(s, 'pinpointWon'); return w ? [1, 2, 3, 4, 5].reduce((a, k) => a + k * S(s, 'pinpointClue' + k), 0) / w : Infinity; },
      (s) => { const w = S(s, 'pinpointWon'); return w ? n1([1, 2, 3, 4, 5].reduce((a, k) => a + k * S(s, 'pinpointClue' + k), 0) / w) : '—'; }, -1],
    ['Dès le 1er indice', (s) => S(s, 'pinpointClue1'), (s) => fmt(S(s, 'pinpointClue1')), 1], gains('pinpoint')] },
  { k: 'queens', name: 'Queens', cols: timed('queens', ['queensBest7', 'queensBest8', 'queensBest9'], ['7×7', '8×8', '9×9']) },
  { k: 'tango', name: 'Tango', cols: timed('tango', ['tangoBest0', 'tangoBest1', 'tangoBest2'], LV) },
  { k: 'sudoku', name: 'Sudoku', cols: timed('sudoku', ['sudokuBest0', 'sudokuBest1', 'sudokuBest2'], LV) },
  { k: 'demineur', name: 'Démineur', cols: timed('demineur', ['demineurBest0', 'demineurBest1', 'demineurBest2'], LV) },
  { k: 'crossword', name: 'Mots croisés', cols: timed('crossword', ['crosswordBest0', 'crosswordBest1', 'crosswordBest2'], LV) },
  { k: 'memory', name: 'Memory', cols: timed('memory', ['memoryBest0', 'memoryBest1', 'memoryBest2'], LV, 'moves') },
  { k: 'snake', name: 'Snake', cols: [rounds('snake'), ['Bananes / partie', (s) => (S(s, 'snakeRounds') ? S(s, 'snakeBananas') / S(s, 'snakeRounds') : 0), (s) => (S(s, 'snakeRounds') ? n1(S(s, 'snakeBananas') / S(s, 'snakeRounds')) : '—'), 1],
    recCol('snake'),
    ['Bananes mangées', (s) => S(s, 'snakeBananas'), (s) => fmt(S(s, 'snakeBananas')), 1], gains('snake')] },
  { k: 'breaker', name: 'Casse-briques', cols: [['Niveaux cassés', (s) => S(s, 'breakerLevels'), (s) => fmt(S(s, 'breakerLevels')), 1], gains('breaker')] },
];

// Vue d'ensemble : total des mini-jeux par joueur
const ALL = { k: '_all', name: 'Tous', cols: [
  ['Parties', (s) => MINI_GAMES.reduce((a, g) => a + S(s, g.k + 'Rounds'), 0), (s) => fmt(MINI_GAMES.reduce((a, g) => a + S(s, g.k + 'Rounds'), 0)), 1],
  ['Jeux joués', (s) => MINI_GAMES.filter((g) => S(s, g.k + 'Rounds') || S(s, g.k + 'Levels')).length, (s) => `${MINI_GAMES.filter((g) => S(s, g.k + 'Rounds') || S(s, g.k + 'Levels')).length} / ${MINI_GAMES.length}`, 1],
  ['Jeu préféré', (s) => 0, (s) => { const g = [...MINI_GAMES].sort((a, b) => S(s, b.k + 'Rounds') - S(s, a.k + 'Rounds'))[0]; return S(s, g.k + 'Rounds') ? esc(g.name) : '—'; }, 0],
  ['Gagné', (s) => MINI_GAMES.reduce((a, g) => a + S(s, g.k + 'Total'), 0), (s) => fmt(MINI_GAMES.reduce((a, g) => a + S(s, g.k + 'Total'), 0)), 1],
] };

export function miniRankPanel(root, { wallet, getRows }) {
  let game = '_all', sortCol = -1;
  try { game = localStorage.getItem('chibouk_minirank') || '_all'; } catch {}
  const list = [ALL, ...MINI_GAMES];
  function render() {
    const rowsAll = getRows();
    if (!rowsAll) { root.innerHTML = '<p class="muted">Chargement…</p>'; return; }
    const g = list.find((x) => x.k === game) || ALL;
    const ci = sortCol >= 0 && sortCol < g.cols.length && g.cols[sortCol][3] ? sortCol : g.cols.length - 1;
    const [, key, , dir] = g.cols[ci];
    // le joueur connecté : ses stats en direct plutôt que celles du cache
    const rows = rowsAll.map((p) => (p.uid === wallet.uid ? { ...p, stats: wallet.p.stats, shop: wallet.p.shop, tags: wallet.p.tags } : p))
      .filter((p) => (g.k === '_all' ? MINI_GAMES.some((x) => S(p.stats, x.k + 'Rounds') || S(p.stats, x.k + 'Levels')) : S(p.stats, g.k + 'Rounds') || S(p.stats, g.k + 'Levels')))
      .sort((a, b) => { const va = key(a.stats), vb = key(b.stats); return dir > 0 ? vb - va : va - vb; });
    root.innerHTML = `<div class="mr-tabs">${list.map((x) => `<button type="button" data-mr="${x.k}" class="${x.k === g.k ? 'on' : ''}">${esc(x.name)}</button>`).join('')}</div>
      ${rows.length ? `<div class="tbl-scroll"><table class="tbl mr-tbl"><thead><tr><th>#</th><th>Joueur</th>${g.cols.map((c, i) => `<th class="r ${c[3] ? 'sortable' : ''} ${i === ci ? 'sorted' : ''}" ${c[3] ? `data-sort="${i}" title="Trier"` : ''}>${c[0]}${i === ci ? ` <small>${dir > 0 ? '▼' : '▲'}</small>` : ''}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.uid === wallet.uid ? 'me' : ''}"><td><span class="rank r${i + 1}">${i + 1}</span></td><td><button type="button" class="pl-link" data-player="${r.uid}">${avatarHTML(r.uid === wallet.uid ? { ...r, avatar: wallet.p.avatar } : r, 'av-sm')}${esc(r.pseudo)}</button> ${titleHTML(r)}</td>
        ${g.cols.map((c, j) => `<td class="r${j === ci ? ' mr-key' : ''}">${c[2](r.stats || {})}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">Personne n\'a encore joué à ce jeu.</p>'}
      <p class="muted mr-note">${icon('hourglass')}Temps moyen : parties réussies depuis la V28. Clique sur une colonne pour changer le tri.</p>`;
    $$('[data-mr]', root).forEach((b) => (b.onclick = () => { game = b.dataset.mr; sortCol = -1; try { localStorage.setItem('chibouk_minirank', game); } catch {} render(); }));
    $$('[data-sort]', root).forEach((th) => (th.onclick = () => { sortCol = +th.dataset.sort; render(); }));
  }
  render();
  return { render };
}
