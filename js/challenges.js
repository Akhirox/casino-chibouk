// Défi de la jungle : un défi commun à tous les joueurs toutes les 15 minutes (casino et mini-jeux en alternance).
// Seul le premier joueur qui le réussit remporte la récompense.
//
// - Le défi du créneau est tiré au sort de façon déterministe à partir du numéro de créneau : tous les navigateurs
//   affichent le même sans rien lire en base.
// - Le vainqueur est désigné par Firestore : le premier qui crée le document challenges/c<créneau> gagne
//   (création unique garantie par les règles, qui vérifient aussi l'heure du serveur).
// - Les autres joueurs l'apprennent par le fil d'activité (déjà relu régulièrement) : aucune lecture en plus.
import { freeMult } from './progress.js';
import { isIdle } from './activity.js';
import { chalBoost, lootPerm } from './loot.js';

export const SLOT_MS = 15 * 60000;
export const slotOf = (t = Date.now()) => Math.floor(t / SLOT_MS);
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
  { id: 'breaker3', tier: 0, game: 'breaker', n: 3, text: 'Termine 3 niveaux de casse-briques', ev: (e) => (e.type === 'breaker' ? 1 : 0) },
  { id: 'quizMed', tier: 0, game: 'quiz', text: 'Fais un sans-faute au calcul mental en moyen ou difficile', ev: free('quiz', (x) => x.MediumPerfect || x.HardPerfect) },
  { id: 'sudoku', tier: 0, game: 'sudoku', text: 'Résous un sudoku', ev: free('sudoku', (x) => x.Won) },
  { id: 'pinpoint2', tier: 1, game: 'pinpoint', n: 6, text: 'Trouve 6 catégories Pinpoint en 2 indices ou moins', ev: free('pinpoint', (x) => x.Clue1 || x.Clue2) },
  { id: 'capitalsX8', tier: 1, game: 'capitals', text: 'Fais au moins 8/10 au quiz capitales en mode expert', ev: free('capitals', (x) => x.ExpertCorrect >= 8) },
  { id: 'flagsX8', tier: 1, game: 'flags', text: 'Fais au moins 8/10 au quiz drapeaux en mode expert', ev: free('flags', (x) => x.ExpertCorrect >= 8) },
  { id: 'movies9', tier: 1, game: 'movies', text: 'Fais au moins 9/10 au quiz ciné', ev: free('movies', (x) => x.Correct >= 9) },
  { id: 'higher12', tier: 1, game: 'higher', text: 'Fais une série de 12 au Plus ou moins', ev: free('higher', (x) => x.Correct >= 12) },
  { id: 'msMid', tier: 1, game: 'demineur', text: 'Gagne au démineur en moyen ou difficile', ev: free('demineur', (x) => x.Won1 || x.Won2) },
  { id: 'cwClean2', tier: 1, game: 'crossword', n: 2, text: 'Termine 2 grilles de mots croisés moyennes ou difficiles sans révéler de lettre', ev: free('crossword', (x) => x.Clean && (x.Won1 || x.Won2)) },
  { id: 'sudokuMed', tier: 1, game: 'sudoku', text: 'Résous un sudoku moyen ou difficile', ev: free('sudoku', (x) => x.Won1 || x.Won2) },
  { id: 'queens9', tier: 1, game: 'queens', text: 'Résous une grille de Queens en 9 × 9', ev: free('queens', (x) => x.Won9) },
  { id: 'pinpoint1', tier: 2, game: 'pinpoint', n: 5, text: 'Trouve 5 catégories Pinpoint dès le premier indice', ev: free('pinpoint', (x) => x.Clue1) },
  { id: 'sudokuHard', tier: 2, game: 'sudoku', text: 'Résous un sudoku difficile', ev: free('sudoku', (x) => x.Won2) },
  { id: 'msHard', tier: 2, game: 'demineur', text: 'Gagne au démineur en difficile', ev: free('demineur', (x) => x.Won2) },
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
// Suivi en direct : progression locale, tentative de victoire, vainqueur (appris par le fil d'activité)
export function initChallenges(wallet, backend, social, { onWin, onLost, onNew } = {}) {
  const key = 'chibouk_chal_' + wallet.uid;
  let st = load(), alive = true, busy = false;
  const subs = new Set();
  function fresh(slot) { return { slot, p: 0, done: false, claimed: false, winner: null, lost: false }; }
  function load() { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && s.slot === slotOf()) return s; } catch {} return fresh(slotOf()); }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch {} };
  const current = () => challengeFor(st.slot);
  const notify = () => subs.forEach((cb) => { try { cb(view()); } catch (e) { console.error(e); } });
  // bonus VIP réduit × bonus permanent « défis » des coffres royaux × boosts « défis » des caisses (empilés)
  const prizeNow = (c) => Math.round(c.prize * challengeMult(wallet) * (1 + lootPerm(wallet.p, 'chalp')) * chalBoost(wallet.p));
  const view = () => { const c = current(); return { ...st, c, prize: prizeNow(c), end: slotEnd(st.slot), history }; };
  let history = [];

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
    if (busy || st.claimed || st.winner || !alive) return;
    const c = current();
    if (Date.now() > slotEnd(c.slot) + 60000) return; // trop tard, le créneau est fini
    busy = true;
    const prize = prizeNow(c);
    try {
      const r = await backend.claimChallenge(c.slot, { uid: wallet.uid, pseudo: wallet.pseudo, at: Date.now(), slot: c.slot, ch: c.id, prize });
      if (st.slot !== c.slot) return;
      if (r.ok) {
        st.claimed = true; st.winner = { uid: wallet.uid, pseudo: wallet.pseudo, at: Date.now() }; save();
        wallet.p.stats.challengesWon = (wallet.p.stats.challengesWon || 0) + 1;
        wallet.credit('challenge', prize, { ch: c.id, slot: c.slot });
        wallet.flush();
        if (social) social.post({ kind: 'challenge', slot: c.slot, amount: prize, txt: c.text.slice(0, 80) });
        onWin && onWin(c, prize);
      } else if (r.winner) {
        st.winner = r.winner; st.lost = r.winner.uid !== wallet.uid; save(); // déjà remporté depuis un autre appareil : rien de plus
        if (st.lost) onLost && onLost(c, r.winner);
      } else {
        st.error = r.error || 'Validation impossible'; save();
      }
    } catch (e) {
      console.warn('Défi : validation impossible, nouvel essai bientôt', e);
      setTimeout(() => { if (alive && st.done && !st.claimed && !st.winner) claim(); }, 15000);
    } finally { busy = false; notify(); }
  }

  const off = wallet.on((e) => {
    if (!e) return;
    roll();
    if (st.done || st.winner) return;
    const c = current();
    let v = 0;
    try { v = c.ev(e); } catch {}
    if (!v) return;
    st.p = Math.min(c.n, st.p + v);
    if (st.p >= c.n) st.done = true;
    save(); notify();
    if (st.done) claim();
  });

  // Vainqueurs connus grâce au fil d'activité (messages « challenge »)
  let entries = [];
  function learnFromFeed() {
    const wins = entries.filter((x) => x.kind === 'challenge' && Number.isInteger(x.slot));
    const seen = new Set();
    history = wins.sort((a, b) => b.slot - a.slot).filter((x) => (seen.has(x.slot) ? false : seen.add(x.slot))).slice(0, 5)
      .map((x) => ({ slot: x.slot, pseudo: x.pseudo, uid: x.uid, amount: x.amount, txt: x.txt }));
    const w = history.find((x) => x.slot === st.slot);
    if (w && !st.winner) { st.winner = { uid: w.uid, pseudo: w.pseudo }; st.lost = w.uid !== wallet.uid; save(); return true; }
    return false;
  }
  const offSocial = social ? social.subscribe((s) => { entries = s.entries || []; learnFromFeed(); notify(); }) : () => {};

  // Vérification directe du créneau (1 lecture) quand l'accueil est affiché et qu'aucun vainqueur n'est connu :
  // le fil peut avoir du retard, ou le message du vainqueur ne jamais partir (page fermée juste après).
  let lastCheck = 0;
  async function verify(minGap = 3 * 60000) {
    if (!alive || st.winner || !backend.getChallenge || !subs.size || isIdle()) return;
    if (Date.now() - lastCheck < minGap || Date.now() - st.slot * SLOT_MS < 45000) return;
    lastCheck = Date.now();
    const slot = st.slot;
    try {
      const d = await backend.getChallenge(slot);
      if (d && st.slot === slot && !st.winner) { st.winner = { uid: d.uid, pseudo: d.pseudo, at: d.at }; st.lost = d.uid !== wallet.uid; save(); notify(); }
    } catch (e) { console.warn('Défi : lecture impossible', e); }
  }
  const tick = setInterval(() => { roll(); verify(); }, 1000);

  return {
    subscribe(cb) { subs.add(cb); cb(view()); setTimeout(() => verify(60000), 300); return () => subs.delete(cb); },
    get state() { return view(); },
    destroy() { alive = false; off(); offSocial(); clearInterval(tick); subs.clear(); },
  };
}

export const challengeRoute = (c) => (c.game === 'lobby' ? '#/lobby' : '#/' + c.game);
