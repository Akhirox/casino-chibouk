// Défi de la jungle : un défi commun à tous les joueurs toutes les 12 minutes (casino et mini-jeux en alternance).
// Podium : les 3 premiers qui le réussissent sont récompensés (100 %, 60 %, 35 % du prix).
//
// - Le défi du créneau est tiré au sort de façon déterministe à partir du numéro de créneau : tous les navigateurs
//   affichent le même sans rien lire en base.
// - Les places sont attribuées par Firestore : challenges/p<créneau>_<place> ne peut être créé qu'une fois, et la place 2
//   (puis 3) seulement si la précédente est prise par quelqu'un d'autre (règles, avec l'heure du serveur).
// - Les autres joueurs l'apprennent par le fil d'activité (déjà relu régulièrement) : aucune lecture en plus.
import { freeMult } from './progress.js';
import { isIdle } from './activity.js';
import { chalBoost, lootPerm } from './loot.js';
import { recordBonus, recordCount } from './records.js';

export const SLOT_MS = 12 * 60000;
export const PODIUM = [1, 0.6, 0.35]; // part du prix pour la 1re, 2e et 3e place
// Heure du serveur (V29) : les règles Firestore vérifient le créneau avec l'heure du serveur. Si l'horloge de l'appareil
// est décalée, on se cale sur l'en-tête « Date » renvoyé par le site lui-même (aucune lecture en base).
let clockOffset = 0;
export const serverNow = () => Date.now() + clockOffset;
export async function syncClock() {
  try {
    const t0 = Date.now(), r = await fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' }), t1 = Date.now();
    const d = Date.parse(r.headers.get('Date') || '');
    if (d > 0) { const off = d + 500 - (t0 + t1) / 2; clockOffset = Math.abs(off) > 20000 ? Math.round(off) : 0; } // l'en-tête est à la seconde près
  } catch {}
  return clockOffset;
}
export const slotOf = (t = serverNow()) => Math.floor(t / SLOT_MS);
export const slotEnd = (slot) => (slot + 1) * SLOT_MS;
export const CHALLENGE_PRIZE = [5000, 10000, 15000]; // facile, moyen, difficile (× challengeMult : bonus VIP réduit)
// Bonus VIP réduit sur les défis : un quart du bonus des gains gratuits, plafonné à ×2
// (VIP ×2,5 → ×1,375 ; VIP ×5 ou plus → ×2), sinon un défi difficile rapportait près de 40 000 dès les rangs moyens.
export const challengeMult = (wallet) => Math.min(2, 1 + (freeMult(wallet) - 1) * 0.25);
export const MIN_BET = 100; // mise minimale pour les défis de casino (évite les parties à 1 Brundle en turbo)

// Gain d'au moins ×m en une partie, avec une mise d'au moins MIN_BET
const multWin = (game, m) => (e) => (e.type === 'win' && e.game === game && e.bet >= MIN_BET && e.amount / e.bet >= m ? 1 : 0);
const free = (game, test) => (e) => (e.type === 'free' && e.game === game && e.extra && test(e.extra) ? 1 : 0);

// game : route du jeu (bouton « Y aller »), n : objectif, ev : progression apportée par un événement du portefeuille
const CASINO = [
  { id: 'plinko25', tier: 1, game: 'plinko', text: 'Obtiens ×25 ou plus au Plinkoko', ev: multWin('plinko', 25) },
  { id: 'plinko100', tier: 2, game: 'plinko', text: 'Obtiens ×100 ou plus au Plinkoko', ev: multWin('plinko', 100) },
  { id: 'slots20', tier: 1, game: 'slots', text: 'Gagne ×20 ta mise en un spin à la Chibouk Slot', ev: multWin('slots', 20) },
  { id: 'craps2', tier: 1, game: 'craps', n: 2, text: 'Refais ton point 2 fois au Craps (Pass Line)', ev: (e) => (e.type === 'round' && e.game === 'craps' && e.info && e.info.made && e.payout > 0 && e.info.bet >= MIN_BET ? 1 : 0) },
  { id: 'craps8', tier: 2, game: 'craps', text: 'Gagne ×8 ou plus ta mise en un lancer de Craps', ev: multWin('craps', 8) },
  { id: 'jungle30', tier: 1, game: 'jungle', text: 'Gagne ×30 ta mise en un tour à la Jungle Connect', ev: multWin('jungle', 30) },
  { id: 'slots50', tier: 2, game: 'slots', text: 'Gagne ×50 ta mise en un spin à la Chibouk Slot', ev: multWin('slots', 50) },
  { id: 'crash20', tier: 1, game: 'crash', text: 'Encaisse à ×20 ou plus au Crashibouk', ev: multWin('crash', 20) },
  { id: 'crash100', tier: 2, game: 'crash', text: 'Encaisse à ×100 ou plus au Crashibouk', ev: multWin('crash', 100) },
  { id: 'limbo100', tier: 1, game: 'limbo', text: 'Gagne avec une cible de ×100 ou plus au Limbo', ev: multWin('limbo', 100) },
  { id: 'dice50', tier: 0, game: 'dice', text: 'Gagne ×50 ou plus au Dice', ev: multWin('dice', 50) },
  { id: 'dice200', tier: 2, game: 'dice', text: 'Gagne ×200 ou plus au Dice', ev: multWin('dice', 200) },
  { id: 'mines20', tier: 1, game: 'mines', text: 'Encaisse ×20 ou plus aux Mines', ev: multWin('mines', 20) },
  { id: 'tower20', tier: 1, game: 'tower', text: 'Encaisse ×20 ou plus à la Tower', ev: multWin('tower', 20) },
  { id: 'hilo20', tier: 1, game: 'hilo', text: 'Encaisse ×20 ou plus au Hi-Lo', ev: multWin('hilo', 20) },
  { id: 'keno50', tier: 2, game: 'keno', text: 'Gagne ×50 ou plus au Keno', ev: multWin('keno', 50) },
  { id: 'wheel29', tier: 1, game: 'wheel', text: 'Tombe sur une case ×29 ou plus à la Roue du Singe', ev: multWin('wheel', 29) },
  { id: 'scratch25', tier: 1, game: 'scratch', text: 'Gagne ×25 ou plus aux jeux à gratter', ev: multWin('scratch', 25) },
  { id: 'roulette30', tier: 0, game: 'roulette', text: 'Gagne ×30 ta mise totale en un tour de roulette', ev: multWin('roulette', 30) },
  { id: 'bj2', tier: 1, game: 'blackjack', n: 2, text: 'Fais 2 blackjacks naturels', ev: (e) => (e.type === 'round' && e.game === 'blackjack' && e.info && e.info.bj && e.info.bet >= MIN_BET ? 1 : 0) },
  { id: 'bjwin8', tier: 0, game: 'blackjack', n: 8, text: 'Gagne 8 mains de blackjack', ev: (e) => (e.type === 'round' && e.game === 'blackjack' && e.info && e.info.result === 'win' && e.info.bet >= MIN_BET ? 1 : 0) },
  { id: 'mult10x3', tier: 0, game: 'lobby', n: 3, text: 'Gagne 3 fois ×10 ou plus ta mise (n\'importe quel jeu de casino)', ev: (e) => (e.type === 'win' && e.bet >= MIN_BET && e.amount / e.bet >= 10 ? 1 : 0) },
];
// Mini-jeux (V24 : plus durs, ils ne coûtent rien à tenter)
const MINI = [
  { id: 'queens8', tier: 0, game: 'queens', text: 'Résous une grille de Queens en 8 × 8 ou 9 × 9', ev: free('queens', (x) => x.Won8 || x.Won9) },
  { id: 'tangoMed2', tier: 1, game: 'tango', n: 2, text: 'Résous 2 grilles de Tango moyennes ou difficiles', ev: free('tango', (x) => x.Won1 || x.Won2) },
  { id: 'tangoHard2', tier: 2, game: 'tango', n: 2, text: 'Résous 2 grilles de Tango difficiles', ev: free('tango', (x) => x.Won2) },
  { id: 'memoryMed', tier: 0, game: 'memory', text: 'Gagne une partie de Memory moyenne ou difficile', ev: free('memory', (x) => x.Won1 || x.Won2) },
  { id: 'snake40', tier: 1, game: 'snake', text: 'Mange 40 bananes en une partie de Snake', ev: free('snake', (x) => x.Bananas >= 40) },
  { id: 'breaker1', tier: 0, game: 'breaker', text: 'Termine 1 niveau de casse-briques', ev: (e) => (e.type === 'breaker' ? 1 : 0) },
  { id: 'breaker2', tier: 1, game: 'breaker', n: 2, text: 'Termine 2 niveaux de casse-briques', ev: (e) => (e.type === 'breaker' ? 1 : 0) },
  { id: 'breaker3', tier: 2, game: 'breaker', n: 3, text: 'Termine 3 niveaux de casse-briques', ev: (e) => (e.type === 'breaker' ? 1 : 0) },
  { id: 'quizMed', tier: 0, game: 'quiz', text: 'Fais un sans-faute au calcul mental en moyen ou difficile', ev: free('quiz', (x) => x.MediumPerfect || x.HardPerfect) },
  { id: 'sudoku', tier: 0, game: 'sudoku', text: 'Résous un sudoku', ev: free('sudoku', (x) => x.Won) },
  { id: 'pinpoint2', tier: 1, game: 'pinpoint', n: 6, text: 'Trouve 6 catégories Pinpoint en 2 indices ou moins', ev: free('pinpoint', (x) => x.Clue1 || x.Clue2) },
  { id: 'capitalsX8', tier: 1, game: 'capitals', text: 'Fais au moins 8/10 au quiz capitales en mode expert', ev: free('capitals', (x) => x.ExpertCorrect >= 8) },
  { id: 'flagsX8', tier: 1, game: 'flags', text: 'Fais au moins 8/10 au quiz drapeaux en mode expert', ev: free('flags', (x) => x.ExpertCorrect >= 8) },
  { id: 'movies9', tier: 1, game: 'movies', text: 'Fais au moins 9/10 au quiz ciné', ev: free('movies', (x) => x.Correct >= 9) },
  { id: 'higher12', tier: 1, game: 'higher', text: 'Fais une série de 12 au Plus ou moins', ev: free('higher', (x) => x.Correct >= 12) },
  { id: 'culture5', tier: 0, game: 'culture', text: 'Fais au moins 5/10 au quiz Culture G', ev: free('culture', (x) => x.Correct >= 5) },
  { id: 'culture7', tier: 1, game: 'culture', text: 'Fais au moins 7/10 au quiz Culture G', ev: free('culture', (x) => x.Correct >= 7) },
  { id: 'culture9', tier: 2, game: 'culture', text: 'Fais au moins 9/10 au quiz Culture G', ev: free('culture', (x) => x.Correct >= 9) },
  { id: 'geo7', tier: 0, game: 'geo', text: 'Trouve au moins 7 pays sur 10 au quiz géographie', ev: free('geo', (x) => x.Correct >= 7) },
  { id: 'geoMed8', tier: 1, game: 'geo', text: 'Trouve au moins 8 pays sur 10 au quiz géographie en moyen ou difficile', ev: free('geo', (x) => (x.MediumCorrect || x.HardCorrect || 0) >= 8) },
  { id: 'geoHard8', tier: 2, game: 'geo', text: 'Trouve au moins 8 pays sur 10 au quiz géographie en difficile', ev: free('geo', (x) => (x.HardCorrect || 0) >= 8) },
  { id: 'typing30', tier: 0, game: 'typing', text: 'Tape au moins 30 mots en une partie de Frappe éclair', ev: free('typing', (x) => x.Words >= 30) },
  { id: 'typing45', tier: 1, game: 'typing', text: 'Tape au moins 45 mots en une partie de Frappe éclair', ev: free('typing', (x) => x.Words >= 45) },
  { id: 'typingHard30', tier: 2, game: 'typing', text: 'Tape au moins 30 mots en difficile à Frappe éclair', ev: free('typing', (x) => (x.Words2 || 0) >= 30) },
  { id: 'msEasy1', tier: 0, game: 'demineur', text: 'Gagne une partie de démineur (grille facile ou plus)', ev: free('demineur', (x) => x.Won) },
  { id: 'msEasy2', tier: 1, game: 'demineur', n: 2, text: 'Gagne 2 parties de démineur (grille facile ou plus)', ev: free('demineur', (x) => x.Won) },
  { id: 'cwClean2', tier: 1, game: 'crossword', n: 2, text: 'Termine 2 grilles de mots croisés moyennes ou difficiles sans révéler de lettre', ev: free('crossword', (x) => x.Clean && (x.Won1 || x.Won2)) },
  { id: 'sudokuMed', tier: 1, game: 'sudoku', text: 'Résous un sudoku moyen ou difficile', ev: free('sudoku', (x) => x.Won1 || x.Won2) },
  { id: 'queens9', tier: 1, game: 'queens', text: 'Résous une grille de Queens en 9 × 9', ev: free('queens', (x) => x.Won9) },
  { id: 'pinpoint1', tier: 2, game: 'pinpoint', n: 5, text: 'Trouve 5 catégories Pinpoint dès le premier indice', ev: free('pinpoint', (x) => x.Clue1) },
  { id: 'sudokuHard', tier: 2, game: 'sudoku', text: 'Résous un sudoku difficile', ev: free('sudoku', (x) => x.Won2) },
  { id: 'msEasy4', tier: 2, game: 'demineur', n: 4, text: 'Gagne 4 parties de démineur (grille facile ou plus)', ev: free('demineur', (x) => x.Won) },
  { id: 'queens9x2', tier: 2, game: 'queens', n: 2, text: 'Résous 2 grilles de Queens en 9 × 9', ev: free('queens', (x) => x.Won9) },
  { id: 'cwHard2', tier: 2, game: 'crossword', n: 2, text: 'Termine 2 grilles de mots croisés difficiles sans révéler de lettre', ev: free('crossword', (x) => x.CleanHard) },
  { id: 'snake65', tier: 2, game: 'snake', text: 'Mange 65 bananes en une partie de Snake', ev: free('snake', (x) => x.Bananas >= 65) },
  { id: 'quizHard', tier: 2, game: 'quiz', text: 'Fais un sans-faute au calcul mental en difficile', ev: free('quiz', (x) => x.HardPerfect) },
  { id: 'flagsX10', tier: 2, game: 'flags', text: 'Fais un sans-faute au quiz drapeaux en mode expert', ev: free('flags', (x) => x.ExpertPerfect) },
  { id: 'capitalsX10', tier: 2, game: 'capitals', text: 'Fais un sans-faute au quiz capitales en mode expert', ev: free('capitals', (x) => x.ExpertPerfect) },
];
export const CHALLENGES = [...CASINO.map((c) => ({ ...c, kind: 'casino' })), ...MINI.map((c) => ({ ...c, kind: 'mini' }))];

function seeded(n) { let h = (n * 2654435761) >>> 0 || 1; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
// Tirage brut d'un créneau : casino et mini-jeux en alternance, difficulté 30 % facile / 45 % moyen / 25 % difficile
function rawPick(slot, avoidGame = null) {
  const rnd = seeded(slot + 7);
  const pool = slot % 2 ? MINI : CASINO;
  const r = rnd(), tier = r < 0.3 ? 0 : r < 0.75 ? 1 : 2;
  let list = pool.filter((c) => c.tier === tier && c.game !== avoidGame);
  if (!list.length) list = pool.filter((c) => c.game !== avoidGame);
  return list[Math.floor(rnd() * list.length)];
}
// Défi du créneau (jamais deux fois de suite le même jeu dans la même famille)
export function challengeFor(slot) {
  const prev = rawPick(slot - 2);
  const c = rawPick(slot, prev.game);
  return { ...c, kind: slot % 2 ? 'mini' : 'casino', n: c.n || 1, slot, prize: CHALLENGE_PRIZE[c.tier] };
}

/* -------------------------------------------------------------------------------------------------- */
// Suivi en direct : progression locale, tentative de place sur le podium, podium (appris par le fil d'activité)
export function initChallenges(wallet, backend, social, { onWin, onLost, onNew } = {}) {
  const key = 'chibouk_chal2_' + wallet.uid;
  let st = load(), alive = true, busy = false;
  const subs = new Set();
  // podium : [{ place, uid, pseudo, amount }] ; claimed : ma place (1 à 3) ; full : les 3 places sont prises
  function fresh(slot) { return { slot, p: 0, done: false, claimed: 0, podium: [], lost: false }; }
  function load() { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && s.slot === slotOf()) return s; } catch {} return fresh(slotOf()); }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch {} };
  const current = () => challengeFor(st.slot);
  const notify = () => subs.forEach((cb) => { try { cb(view()); } catch (e) { console.error(e); } });
  // bonus VIP réduit × bonus permanent « défis » des coffres royaux × boosts « défis » des caisses (empilés)
  const multNow = () => challengeMult(wallet) * (1 + lootPerm(wallet.p, 'chalp')) * chalBoost(wallet.p) * (1 + recordBonus());
  const prizeAt = (c, place) => Math.round(c.prize * PODIUM[place - 1] * multNow());
  const nextPlace = () => { for (let k = 1; k <= 3; k++) if (!st.podium.some((x) => x.place === k)) return k; return 0; };
  const view = () => {
    const c = current(), np = nextPlace();
    return { ...st, c, full: !np, next: np, prize: prizeAt(c, 1), prizes: [1, 2, 3].map((k) => prizeAt(c, k)), end: slotEnd(st.slot) - clockOffset, history, // fin en heure de l'appareil (pour le chrono)
      winner: st.podium.find((x) => x.place === 1) || null };
  };
  let history = [];
  function addPodium(x) {
    if (!x || !x.place || st.podium.some((y) => y.place === x.place)) return false;
    st.podium = [...st.podium, { place: x.place, uid: x.uid, pseudo: x.pseudo, amount: x.amount || x.prize || 0 }].sort((a, b) => a.place - b.place);
    if (x.uid === wallet.uid && !st.claimed) st.claimed = x.place;
    return true;
  }

  // changement de créneau : nouveau défi
  function roll() {
    const s = slotOf();
    if (s === st.slot) return false;
    st = fresh(s); save();
    learnFromFeed();
    notify();
    onNew && onNew(view());
    return true;
  }

  async function claim() {
    if (busy || st.claimed || !alive) return;
    const c = current();
    if (serverNow() > slotEnd(c.slot) + 60000) return; // trop tard, le créneau est fini
    busy = true;
    try {
      for (let place = nextPlace(); place && place <= 3 && !st.claimed; place = nextPlace()) {
        const prize = prizeAt(c, place);
        const r = await backend.claimChallenge(c.slot, place, { uid: wallet.uid, pseudo: wallet.pseudo, at: Date.now(), slot: c.slot, place, ch: c.id, prize });
        if (st.slot !== c.slot) return;
        if (r.ok) {
          addPodium({ place, uid: wallet.uid, pseudo: wallet.pseudo, amount: prize });
          st.claimed = place; save();
          wallet.p.stats.challengesPodium = (wallet.p.stats.challengesPodium || 0) + 1;
          if (place === 1) wallet.p.stats.challengesWon = (wallet.p.stats.challengesWon || 0) + 1;
          wallet.credit('challenge', prize, { ch: c.id, slot: c.slot, place });
          wallet.flush();
          if (social) social.post({ kind: 'challenge', slot: c.slot, place, amount: prize, txt: c.text.slice(0, 80) });
          onWin && onWin(c, prize, place);
          return;
        }
        if (r.taken) { addPodium({ place, ...r.taken }); save(); if (r.taken.uid === wallet.uid) return; continue; } // place prise : on tente la suivante
        // refus sans place prise : version du site pas encore à jour, règles en cours de publication ou horloge décalée.
        // On recale l'horloge et on réessaie (2 fois au plus) avant d'afficher l'erreur.
        st.tries = (st.tries || 0) + 1;
        if (st.tries <= 2) { st.error = 'Validation en cours…'; save(); await syncClock(); setTimeout(() => { if (alive && st.slot === c.slot && !st.claimed) { st.error = ''; claim(); } }, 20000); return; }
        st.error = r.error || 'Validation impossible'; save();
        return;
      }
      if (!st.claimed) { st.lost = true; save(); onLost && onLost(c, st.podium); }
    } catch (e) {
      console.warn('Défi : validation impossible, nouvel essai bientôt', e);
      setTimeout(() => { if (alive && st.done && !st.claimed && nextPlace()) claim(); }, 15000);
    } finally { busy = false; notify(); }
  }

  const off = wallet.on((e) => {
    if (!e) return;
    roll();
    if (st.done || st.claimed || !nextPlace()) return;
    const c = current();
    let v = 0;
    try { v = c.ev(e); } catch {}
    if (!v) return;
    st.p = Math.min(c.n, st.p + v);
    if (st.p >= c.n) st.done = true;
    save(); notify();
    if (st.done) claim();
  });

  // Podiums connus grâce au fil d'activité (messages « challenge » avec une place ; ceux d'avant la V28 n'en ont pas)
  let entries = [];
  function learnFromFeed() {
    const wins = entries.filter((x) => x.kind === 'challenge' && Number.isInteger(x.slot) && Number.isInteger(x.place));
    let changed = false;
    wins.filter((x) => x.slot === st.slot).forEach((x) => { if (addPodium(x)) changed = true; });
    const bySlot = new Map();
    for (const x of wins.sort((a, b) => b.slot - a.slot || a.place - b.place)) { if (!bySlot.has(x.slot)) bySlot.set(x.slot, []); if (!bySlot.get(x.slot).some((y) => y.place === x.place)) bySlot.get(x.slot).push(x); }
    history = [...bySlot.entries()].slice(0, 5).map(([slot, list]) => ({ slot, podium: list.map((x) => ({ place: x.place, uid: x.uid, pseudo: x.pseudo, amount: x.amount })), pseudo: (list.find((x) => x.place === 1) || list[0]).pseudo }));
    if (changed) save();
    return changed;
  }
  const offSocial = social ? social.subscribe((s) => { entries = s.entries || []; learnFromFeed(); notify(); }) : () => {};

  // Vérification directe du podium (3 lectures au plus) quand l'accueil est affiché et qu'il reste des places :
  // le fil peut avoir du retard, ou le message d'un gagnant ne jamais partir (page fermée juste après).
  let lastCheck = 0;
  async function verify(minGap = 3 * 60000) {
    if (!alive || !nextPlace() || !backend.getChallenge || !subs.size || isIdle()) return;
    if (Date.now() - lastCheck < minGap || serverNow() - st.slot * SLOT_MS < 45000) return;
    lastCheck = Date.now();
    const slot = st.slot;
    try {
      const list = await backend.getChallenge(slot);
      if (st.slot !== slot) return;
      let ch = false;
      (list || []).forEach((d) => { if (addPodium(d)) ch = true; });
      if (ch) { save(); notify(); }
    } catch (e) { console.warn('Défi : lecture impossible', e); }
  }
  const tick = setInterval(() => { roll(); verify(); }, 1000);
  syncClock().then((off) => { if (off && alive) { roll(); notify(); } });

  return {
    subscribe(cb) { subs.add(cb); cb(view()); setTimeout(() => verify(60000), 300); return () => subs.delete(cb); },
    get state() { return view(); },
    destroy() { alive = false; off(); offSocial(); clearInterval(tick); subs.clear(); },
  };
}

export const challengeRoute = (c) => (c.game === 'lobby' ? '#/lobby' : '#/' + c.game);
