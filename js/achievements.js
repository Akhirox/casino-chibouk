// Succès (achievements) : défis globaux et par jeu, débloqués automatiquement à partir des événements du portefeuille
import { CONFIG } from './config.js';

export const TIERS = {
  bronze: { name: 'Bronze', reward: 100 },
  silver: { name: 'Argent', reward: 500 },
  gold: { name: 'Or', reward: 2500 },
  legend: { name: 'Légende', reward: 10000 },
};

export const CATEGORIES = {
  global: 'Global', slots: 'Chibouk Slot', blackjack: 'Blackjack', roulette: 'Roulette', plinko: 'Plinkoko',
  crash: 'Crashibouk', tower: 'Tower', mines: 'Mines', dice: 'Dice', free: 'Jeux gratuits',
};

const CASINO_GAMES = ['slots', 'blackjack', 'roulette', 'plinko', 'crash', 'tower', 'mines', 'dice'];
const st = (w) => w.p.stats;
const g = (w, k) => st(w).games[k] || {};
const parisHour = () => +new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(new Date());
const isRound = (e, game) => e.type === 'round' && (!game || e.game === game);
const I = (e) => e.info || {};
const streak = (c, game, kind) => (c.streaks && c.streaks[game] && c.streaks[game][kind]) || 0;

// test(e, w, c) -> true pour débloquer ; progress(w, c) -> [actuel, objectif] (optionnel)
export const ACHIEVEMENTS = [
  /* ------------------------------ GLOBAL ------------------------------ */
  { id: 'first-bet', cat: 'global', tier: 'bronze', name: 'Premier pas dans la jungle', desc: 'Jouer ta toute première partie.', test: (e, w) => st(w).rounds >= 1 },
  { id: 'bal-10k', cat: 'global', tier: 'bronze', name: 'Petit singe', desc: 'Atteindre 10 000 Brundles.', test: (e, w) => w.balance >= 1e4, progress: (w) => [w.balance, 1e4] },
  { id: 'bal-100k', cat: 'global', tier: 'silver', name: 'Gorille d\'argent', desc: 'Atteindre 100 000 Brundles.', test: (e, w) => w.balance >= 1e5, progress: (w) => [w.balance, 1e5] },
  { id: 'bal-1m', cat: 'global', tier: 'gold', name: 'Roi de la jungle', desc: 'Atteindre 1 000 000 de Brundles.', test: (e, w) => w.balance >= 1e6, progress: (w) => [w.balance, 1e6] },
  { id: 'bal-10m', cat: 'global', tier: 'legend', name: 'Banane cosmique', desc: 'Atteindre 10 000 000 de Brundles.', test: (e, w) => w.balance >= 1e7, progress: (w) => [w.balance, 1e7] },
  { id: 'broke', cat: 'global', tier: 'bronze', name: 'Plus une banane', desc: 'Tomber à 0 Brundle.', test: (e, w) => e.type === 'bet' && w.balance < 1 },
  { id: 'phoenix', cat: 'global', tier: 'silver', name: 'Phénix de la canopée', desc: 'Remonter à 10 000 Brundles après être tombé sous 100.', test: (e, w, c) => c.wasLow && w.balance >= 1e4 },
  { id: 'all-in', cat: 'global', tier: 'silver', name: 'Tapis !', desc: 'Miser tout ton solde (au moins 1 000) en une seule fois.', test: (e, w) => e.type === 'bet' && e.amount >= 1000 && w.balance < 1 },
  { id: 'wager-100k', cat: 'global', tier: 'bronze', name: 'Gros joueur', desc: 'Miser 100 000 Brundles au total.', test: (e, w) => st(w).totalWagered >= 1e5, progress: (w) => [st(w).totalWagered, 1e5] },
  { id: 'wager-10m', cat: 'global', tier: 'gold', name: 'Baleine', desc: 'Miser 10 000 000 de Brundles au total.', test: (e, w) => st(w).totalWagered >= 1e7, progress: (w) => [st(w).totalWagered, 1e7] },
  { id: 'rounds-1000', cat: 'global', tier: 'silver', name: 'Marathonien', desc: 'Jouer 1 000 parties.', test: (e, w) => st(w).rounds >= 1000, progress: (w) => [st(w).rounds, 1000] },
  { id: 'rounds-10000', cat: 'global', tier: 'gold', name: 'Il n\'est jamais parti', desc: 'Jouer 10 000 parties.', test: (e, w) => st(w).rounds >= 10000, progress: (w) => [st(w).rounds, 10000] },
  { id: 'all-games', cat: 'global', tier: 'silver', name: 'Touche-à-tout', desc: 'Jouer au moins une fois à chacun des 8 jeux de casino.', test: (e, w) => CASINO_GAMES.every((k) => g(w, k).rounds > 0), progress: (w) => [CASINO_GAMES.filter((k) => g(w, k).rounds > 0).length, 8] },
  { id: 'x100', cat: 'global', tier: 'silver', name: 'Centuple', desc: 'Gagner au moins ×100 ta mise en une seule partie.', test: (e) => e.type === 'win' && e.bet > 0 && e.amount / e.bet >= 100 },
  { id: 'x1000', cat: 'global', tier: 'gold', name: 'Millénaire', desc: 'Gagner au moins ×1 000 ta mise en une seule partie.', test: (e) => e.type === 'win' && e.bet > 0 && e.amount / e.bet >= 1000 },
  { id: 'night-owl', cat: 'global', tier: 'bronze', name: 'Singe de nuit', desc: 'Jouer une partie entre 3 h et 5 h du matin.', test: (e) => isRound(e) && parisHour() >= 3 && parisHour() < 5 },
  { id: 'daily-7', cat: 'global', tier: 'bronze', name: 'Fidèle au poste', desc: 'Récupérer 7 bonus quotidiens.', test: (e, w) => st(w).dailyClaims >= 7, progress: (w) => [st(w).dailyClaims, 7] },
  { id: 'daily-30', cat: 'global', tier: 'silver', name: 'Abonné à la banane', desc: 'Récupérer 30 bonus quotidiens.', test: (e, w) => st(w).dailyClaims >= 30, progress: (w) => [st(w).dailyClaims, 30] },
  { id: 'gift-sent', cat: 'global', tier: 'bronze', name: 'Cœur sur la patte', desc: 'Envoyer des Brundles à un autre joueur.', test: (e, w) => (st(w).transfersSent || 0) > 0 },
  { id: 'gift-big', cat: 'global', tier: 'silver', name: 'Mécène de la jungle', desc: 'Envoyer 100 000 Brundles au total à d\'autres joueurs.', test: (e, w) => (st(w).transfersSent || 0) >= 1e5, progress: (w) => [st(w).transfersSent || 0, 1e5] },
  { id: 'gift-recv', cat: 'global', tier: 'bronze', name: 'Merci patron', desc: 'Recevoir des Brundles d\'un autre joueur.', test: (e, w) => (st(w).transfersReceived || 0) > 0 },
  { id: 'loss-streak-10', cat: 'global', tier: 'silver', name: 'Chat noir', desc: 'Perdre 10 parties d\'affilée, tous jeux confondus.', test: (e, w, c) => (c.gLose || 0) >= 10 },
  { id: 'win-streak-10', cat: 'global', tier: 'gold', name: 'Main chaude', desc: 'Gagner 10 parties d\'affilée en doublant au moins ta mise à chaque fois.', test: (e, w, c) => (c.gWin2 || 0) >= 10 },

  /* ------------------------------ SLOT ------------------------------ */
  { id: 'sl-first-bonus', cat: 'slots', tier: 'bronze', name: 'Audience royale', desc: 'Déclencher les tours gratuits du Roi Singe.', test: (e, w) => (g(w, 'slots').bonuses || 0) >= 1 },
  { id: 'sl-10-bonus', cat: 'slots', tier: 'silver', name: 'Favori du Roi', desc: 'Déclencher 10 fois les tours gratuits.', test: (e, w) => (g(w, 'slots').bonuses || 0) >= 10, progress: (w) => [g(w, 'slots').bonuses || 0, 10] },
  { id: 'sl-5-wild', cat: 'slots', tier: 'gold', name: 'Cour royale au complet', desc: 'Voir 5 WILD en même temps.', test: (e) => isRound(e, 'slots') && I(e).wilds >= 5 },
  { id: 'sl-x50', cat: 'slots', tier: 'silver', name: 'Jackpot de bananes', desc: 'Gagner au moins ×50 la mise totale en un spin.', test: (e) => e.type === 'win' && e.game === 'slots' && e.bet > 0 && e.amount / e.bet >= 50 },
  { id: 'sl-500', cat: 'slots', tier: 'silver', name: 'Accro au levier', desc: 'Faire 500 spins payants.', test: (e, w) => g(w, 'slots').rounds >= 500, progress: (w) => [g(w, 'slots').rounds, 500] },
  { id: 'sl-dry-20', cat: 'slots', tier: 'bronze', name: 'Désert sans banane', desc: 'Enchaîner 20 spins sans aucun gain.', test: (e, w, c) => streak(c, 'slots', 'zero') >= 20 },

  /* ------------------------------ BLACKJACK ------------------------------ */
  { id: 'bj-natural', cat: 'blackjack', tier: 'bronze', name: 'Blackjack !', desc: 'Obtenir un blackjack naturel.', test: (e) => isRound(e, 'blackjack') && I(e).bj },
  { id: 'bj-lose-5', cat: 'blackjack', tier: 'bronze', name: 'Pas de bol', desc: 'Perdre 5 mains de blackjack d\'affilée.', test: (e, w, c) => streak(c, 'blackjack', 'lose') >= 5 },
  { id: 'bj-win-5', cat: 'blackjack', tier: 'silver', name: 'Compteur de cartes', desc: 'Gagner 5 mains de blackjack d\'affilée.', test: (e, w, c) => streak(c, 'blackjack', 'win') >= 5 },
  { id: 'bj-4-hands', cat: 'blackjack', tier: 'silver', name: 'Pieuvre', desc: 'Séparer jusqu\'à jouer 4 mains en même temps.', test: (e) => isRound(e, 'blackjack') && I(e).hands >= 4 },
  { id: 'bj-double-win', cat: 'blackjack', tier: 'bronze', name: 'Quitte ou double', desc: 'Gagner une main après avoir doublé.', test: (e) => isRound(e, 'blackjack') && I(e).doubled },
  { id: 'bj-perfect', cat: 'blackjack', tier: 'silver', name: 'Paire parfaite', desc: 'Gagner une Perfect Pair (même valeur, même couleur, même enseigne).', test: (e) => isRound(e, 'blackjack') && I(e).pp === 'perfect' },
  { id: 'bj-suited-trips', cat: 'blackjack', tier: 'gold', name: 'Brelan royal', desc: 'Toucher un brelan couleur au 21+3 (100:1).', test: (e) => isRound(e, 'blackjack') && I(e).t3 === 'suitedTrips' },
  { id: 'bj-22', cat: 'blackjack', tier: 'bronze', name: 'Un de trop', desc: 'Sauter avec exactement 22.', test: (e) => isRound(e, 'blackjack') && I(e).bust22 },
  { id: 'bj-dealer-bj', cat: 'blackjack', tier: 'bronze', name: 'Le croupier triche ?', desc: 'Subir un blackjack du croupier.', test: (e) => isRound(e, 'blackjack') && I(e).dealerBJ },

  /* ------------------------------ ROULETTE ------------------------------ */
  { id: 'rl-straight', cat: 'roulette', tier: 'bronze', name: 'Plein dans le mille', desc: 'Gagner un pari sur un numéro plein (35:1).', test: (e) => isRound(e, 'roulette') && I(e).straightWin },
  { id: 'rl-zero', cat: 'roulette', tier: 'silver', name: 'Zéro magique', desc: 'Gagner en misant sur le 0.', test: (e) => isRound(e, 'roulette') && I(e).zeroWin },
  { id: 'rl-carpet', cat: 'roulette', tier: 'bronze', name: 'Tapis vert', desc: 'Miser sur 15 cases ou plus en un seul lancer.', test: (e) => isRound(e, 'roulette') && I(e).spots >= 15 },
  { id: 'rl-same', cat: 'roulette', tier: 'silver', name: 'Déjà-vu', desc: 'Voir le même numéro sortir deux fois de suite.', test: (e, w, c) => isRound(e, 'roulette') && c.rlPrev2 === I(e).number && c.rlPrevCount >= 2 },
  { id: 'rl-lose-7', cat: 'roulette', tier: 'bronze', name: 'La bille me déteste', desc: 'Perdre 7 lancers d\'affilée.', test: (e, w, c) => streak(c, 'roulette', 'lose') >= 7 },

  /* ------------------------------ PLINKOKO ------------------------------ */
  { id: 'pk-100', cat: 'plinko', tier: 'bronze', name: 'Pluie de noix', desc: 'Lâcher 100 noix de coco.', test: (e, w) => g(w, 'plinko').rounds >= 100, progress: (w) => [g(w, 'plinko').rounds, 100] },
  { id: 'pk-edge', cat: 'plinko', tier: 'silver', name: 'Au bord de la canopée', desc: 'Atterrir dans une case du bord (16 rangées).', test: (e) => isRound(e, 'plinko') && I(e).edge && I(e).rows === 16 },
  { id: 'pk-1000', cat: 'plinko', tier: 'legend', name: 'La noix légendaire', desc: 'Toucher le ×1 000 (16 rangées, risque élevé).', test: (e) => isRound(e, 'plinko') && I(e).mult >= 1000 },
  { id: 'pk-low', cat: 'plinko', tier: 'bronze', name: 'Atterrissage en douceur', desc: 'Faire 10 ×0,2 d\'affilée.', test: (e, w, c) => (c.pk02 || 0) >= 10 },

  /* ------------------------------ CRASHIBOUK ------------------------------ */
  { id: 'cr-x10', cat: 'crash', tier: 'silver', name: 'Mise en orbite', desc: 'Encaisser à ×10 ou plus.', test: (e) => isRound(e, 'crash') && I(e).cashed >= 10 },
  { id: 'cr-x100', cat: 'crash', tier: 'gold', name: 'Singe dans l\'espace', desc: 'Encaisser à ×100 ou plus.', test: (e) => isRound(e, 'crash') && I(e).cashed >= 100 },
  { id: 'cr-greedy', cat: 'crash', tier: 'bronze', name: 'Trop gourmand', desc: 'Ne pas encaisser alors que la fusée monte au-delà de ×10.', test: (e) => isRound(e, 'crash') && !I(e).cashed && I(e).crash >= 10 },
  { id: 'cr-instant', cat: 'crash', tier: 'bronze', name: 'Décollage raté', desc: 'Voir la fusée exploser à ×1,00.', test: (e) => isRound(e, 'crash') && I(e).crash <= 1 },
  { id: 'cr-close', cat: 'crash', tier: 'silver', name: 'Sueurs froides', desc: 'Encaisser à moins de 0,05 de l\'explosion.', test: (e) => isRound(e, 'crash') && I(e).cashed > 0 && I(e).crash - I(e).cashed < 0.05 },

  /* ------------------------------ TOWER ------------------------------ */
  { id: 'tw-top', cat: 'tower', tier: 'silver', name: 'Sommet de la jungle', desc: 'Atteindre le 9e étage de la Tower.', test: (e) => isRound(e, 'tower') && I(e).top },
  { id: 'tw-top-master', cat: 'tower', tier: 'legend', name: 'Maître grimpeur', desc: 'Atteindre le sommet en difficulté Maître.', test: (e) => isRound(e, 'tower') && I(e).top && I(e).level === 'master' },
  { id: 'tw-vertigo', cat: 'tower', tier: 'bronze', name: 'Vertige', desc: 'Exploser au tout dernier étage.', test: (e) => isRound(e, 'tower') && I(e).lostAt === 9 },
  { id: 'tw-first', cat: 'tower', tier: 'bronze', name: 'Faux départ', desc: 'Exploser dès le premier étage 3 fois d\'affilée.', test: (e, w, c) => (c.twFirst || 0) >= 3 },

  /* ------------------------------ MINES ------------------------------ */
  { id: 'mn-20', cat: 'mines', tier: 'silver', name: 'Démineur', desc: 'Révéler 20 bananes en une seule partie.', test: (e) => isRound(e, 'mines') && !I(e).lost && I(e).picks >= 20 },
  { id: 'mn-kamikaze', cat: 'mines', tier: 'gold', name: 'Kamikaze', desc: 'Gagner une partie avec 24 mines.', test: (e) => isRound(e, 'mines') && !I(e).lost && I(e).mines >= 24 },
  { id: 'mn-first-click', cat: 'mines', tier: 'bronze', name: 'Premier pas fatal', desc: 'Tomber sur une mine dès le premier clic.', test: (e) => isRound(e, 'mines') && I(e).lost && I(e).picks === 0 },
  { id: 'mn-x50', cat: 'mines', tier: 'silver', name: 'Nerfs d\'acier', desc: 'Encaisser à ×50 ou plus aux Mines.', test: (e) => isRound(e, 'mines') && !I(e).lost && I(e).mult >= 50 },

  /* ------------------------------ DICE ------------------------------ */
  { id: 'dc-sniper', cat: 'dice', tier: 'gold', name: 'Sniper', desc: 'Gagner un lancer avec 1 % de chance ou moins.', test: (e) => isRound(e, 'dice') && I(e).win && I(e).chance <= 1 },
  { id: 'dc-exact', cat: 'dice', tier: 'silver', name: 'Pile poil', desc: 'Tirer exactement 0,00, 50,00 ou 100,00.', test: (e) => isRound(e, 'dice') && [0, 50, 100].includes(I(e).roll) },
  { id: 'dc-win-10', cat: 'dice', tier: 'silver', name: 'Dé pipé ?', desc: 'Gagner 6 lancers d\'affilée avec 50 % de chance ou moins.', test: (e, w, c) => (c.dcHard || 0) >= 6 },
  { id: 'dc-safe-lose', cat: 'dice', tier: 'bronze', name: 'Malchance absolue', desc: 'Perdre un lancer avec 95 % de chance ou plus.', test: (e) => isRound(e, 'dice') && !I(e).win && I(e).chance >= 95 },

  /* ------------------------------ JEUX GRATUITS ------------------------------ */
  { id: 'qz-perfect', cat: 'free', tier: 'silver', name: 'Calculatrice humaine', desc: 'Faire un sans-faute au calcul mental.', test: (e, w) => (st(w).quizPerfect || 0) >= 1 },
  { id: 'qz-100', cat: 'free', tier: 'silver', name: 'Prof de maths', desc: 'Donner 100 bonnes réponses au calcul mental.', test: (e, w) => (st(w).quizCorrect || 0) >= 100, progress: (w) => [st(w).quizCorrect || 0, 100] },
  { id: 'bk-1', cat: 'free', tier: 'bronze', name: 'Casseur', desc: 'Terminer un niveau de casse-briques.', test: (e, w) => st(w).breakerLevels >= 1 },
  { id: 'bk-10', cat: 'free', tier: 'silver', name: 'Démolisseur', desc: 'Terminer 10 niveaux de casse-briques.', test: (e, w) => st(w).breakerLevels >= 10, progress: (w) => [st(w).breakerLevels, 10] },
];

/* ------------------------------ moteur ------------------------------ */
export function initAchievements(wallet, onUnlock) {
  const ach = wallet.p.ach || (wallet.p.ach = { u: {}, c: {} });
  ach.u = ach.u || {}; ach.c = ach.c || {};
  const c = ach.c;

  function updateCounters(e) {
    if (wallet.balance < 100) c.wasLow = true;
    if (e.type !== 'round') return;
    const info = e.info || {};
    const bet = info.bet || 0;
    const won = e.payout > bet, lost = e.payout < bet;
    c.streaks = c.streaks || {};
    const s = (c.streaks[e.game] = c.streaks[e.game] || { win: 0, lose: 0, zero: 0 });
    s.win = won ? s.win + 1 : 0;
    s.lose = lost ? s.lose + 1 : 0;
    s.zero = e.payout === 0 ? (s.zero || 0) + 1 : 0;
    c.gWin = won ? (c.gWin || 0) + 1 : 0;
    c.gLose = lost ? (c.gLose || 0) + 1 : 0;
    c.gWin2 = bet > 0 && e.payout >= 2 * bet ? (c.gWin2 || 0) + 1 : 0;
    if (e.game === 'dice') c.dcHard = info.win && info.chance <= 50 ? (c.dcHard || 0) + 1 : 0;
    if (e.game === 'roulette') { c.rlPrevCount = c.rlPrev2 === info.number ? (c.rlPrevCount || 1) + 1 : 1; c.rlPrev2 = info.number; }
    if (e.game === 'plinko') c.pk02 = info.mult === 0.2 ? (c.pk02 || 0) + 1 : 0;
    if (e.game === 'tower') c.twFirst = info.lostAt === 1 ? (c.twFirst || 0) + 1 : (info.lostAt ? 0 : c.twFirst || 0);
  }

  function check(e) {
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (ach.u[a.id]) continue;
      let ok = false;
      try { ok = a.test(e, wallet, c); } catch {}
      if (ok) { ach.u[a.id] = Date.now(); fresh.push(a); }
    }
    for (const a of fresh) {
      wallet.achReward(a.id, TIERS[a.tier].reward);
      onUnlock && onUnlock(a);
    }
  }

  const off = wallet.on((e) => {
    if (!e || e.type === 'ach' || e.type === 'set') return;
    updateCounters(e);
    check(e);
  });
  // rattrapage : succès déjà mérités avec l'historique existant (solde, totaux…)
  setTimeout(() => check({ type: 'init' }), 800);
  return { destroy: off };
}

export function achSummary(wallet) {
  const u = (wallet.p.ach && wallet.p.ach.u) || {};
  const done = ACHIEVEMENTS.filter((a) => u[a.id]).length;
  return { done, total: ACHIEVEMENTS.length };
}
