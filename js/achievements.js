// Succès (achievements) : défis globaux et par jeu, débloqués automatiquement à partir des événements du portefeuille
import { CONFIG } from './config.js';
import { vipOf, vipIndex } from './progress.js';

export const TIERS = {
  bronze: { name: 'Bronze', reward: 100 },
  silver: { name: 'Argent', reward: 500 },
  gold: { name: 'Or', reward: 2500 },
  legend: { name: 'Légende', reward: 10000 },
};

export const CATEGORIES = {
  global: 'Global', slots: 'Chibouk Slot', jungle: 'Jungle Connect', blackjack: 'Blackjack', roulette: 'Roulette', plinko: 'Plinkoko',
  crash: 'Crashibouk', tower: 'Tower', mines: 'Mines', dice: 'Dice', hilo: 'Hi-Lo', keno: 'Keno', wheel: 'Roue du Singe', limbo: 'Limbo', scratch: 'Jeux à gratter',
  free: 'Jeux gratuits', farm: 'Ferme', progress: 'Progression',
};

const CASINO_GAMES = ['slots', 'jungle', 'blackjack', 'roulette', 'plinko', 'crash', 'tower', 'mines', 'dice', 'hilo', 'keno', 'wheel', 'limbo', 'scratch'];
const st = (w) => w.p.stats;
const g = (w, k) => st(w).games[k] || {};
const parisHour = () => +new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(new Date());
const isRound = (e, game) => e.type === 'round' && (!game || e.game === game);
const I = (e) => e.info || {};
const streak = (c, game, kind) => (c.streaks && c.streaks[game] && c.streaks[game][kind]) || 0;

// test(e, w, c) -> true pour débloquer ; progress(w, c) -> [actuel, objectif] (optionnel)
// production horaire de la ferme (enregistrée à chaque seconde par la minuterie de la ferme)
const fr = (w) => (w.p.farm && w.p.farm.rate) || 0;
export const ACHIEVEMENTS = [
  /* ------------------------------ GLOBAL ------------------------------ */
  { id: 'first-bet', cat: 'global', tier: 'bronze', name: 'Premier pas dans la jungle', desc: 'Jouer ta toute première partie.', test: (e, w) => st(w).rounds >= 1 },
  { id: 'bal-10k', cat: 'global', tier: 'bronze', name: 'Petit singe', desc: 'Atteindre 10 000 Brundles.', test: (e, w) => w.fortune >= 1e4, progress: (w) => [w.fortune, 1e4] },
  { id: 'bal-100k', cat: 'global', tier: 'silver', name: 'Gorille d\'argent', desc: 'Atteindre 100 000 Brundles.', test: (e, w) => w.fortune >= 1e5, progress: (w) => [w.fortune, 1e5] },
  { id: 'bal-1m', cat: 'global', tier: 'gold', name: 'Roi de la jungle', desc: 'Atteindre 1 000 000 de Brundles.', test: (e, w) => w.fortune >= 1e6, progress: (w) => [w.fortune, 1e6] },
  { id: 'bal-10m', cat: 'global', tier: 'legend', name: 'Banane cosmique', desc: 'Atteindre 10 000 000 de Brundles.', test: (e, w) => w.fortune >= 1e7, progress: (w) => [w.fortune, 1e7] },
  { id: 'broke', cat: 'global', tier: 'bronze', name: 'Plus une banane', desc: 'Tomber à 0 Brundle.', test: (e, w) => e.type === 'bet' && w.balance < 1 },
  { id: 'phoenix', cat: 'global', tier: 'silver', name: 'Phénix de la canopée', desc: 'Remonter à 10 000 Brundles après être tombé sous 100.', test: (e, w, c) => c.wasLow && w.balance >= 1e4 },
  { id: 'all-in', cat: 'global', tier: 'silver', name: 'Tapis !', desc: 'Miser tout ton solde (au moins 1 000) en une seule fois.', test: (e, w) => e.type === 'bet' && e.amount >= 1000 && w.balance < 1 },
  { id: 'wager-100k', cat: 'global', tier: 'bronze', name: 'Gros joueur', desc: 'Miser 100 000 Brundles au total.', test: (e, w) => st(w).totalWagered >= 1e5, progress: (w) => [st(w).totalWagered, 1e5] },
  { id: 'wager-10m', cat: 'global', tier: 'gold', name: 'Baleine', desc: 'Miser 10 000 000 de Brundles au total.', test: (e, w) => st(w).totalWagered >= 1e7, progress: (w) => [st(w).totalWagered, 1e7] },
  { id: 'rounds-1000', cat: 'global', tier: 'silver', name: 'Marathonien', desc: 'Jouer 1 000 parties.', test: (e, w) => st(w).rounds >= 1000, progress: (w) => [st(w).rounds, 1000] },
  { id: 'rounds-10000', cat: 'global', tier: 'gold', name: 'Il n\'est jamais parti', desc: 'Jouer 10 000 parties.', test: (e, w) => st(w).rounds >= 10000, progress: (w) => [st(w).rounds, 10000] },
  { id: 'all-games', cat: 'global', tier: 'silver', name: 'Touche-à-tout', desc: 'Jouer au moins une fois à chacun des 12 jeux de casino.', test: (e, w) => CASINO_GAMES.every((k) => g(w, k).rounds > 0), progress: (w) => [CASINO_GAMES.filter((k) => g(w, k).rounds > 0).length, CASINO_GAMES.length] },
  { id: 'x100', cat: 'global', tier: 'silver', name: 'Centuple', desc: 'Gagner au moins ×100 ta mise en une seule partie.', test: (e) => e.type === 'win' && e.bet > 0 && e.amount / e.bet >= 100 },
  { id: 'x1000', cat: 'global', tier: 'gold', name: 'Millénaire', desc: 'Gagner au moins ×1 000 ta mise en une seule partie.', test: (e) => e.type === 'win' && e.bet > 0 && e.amount / e.bet >= 1000 },
  { id: 'night-owl', cat: 'global', tier: 'bronze', name: 'Singe de nuit', desc: 'Jouer une partie entre 3 h et 5 h du matin.', test: (e) => isRound(e) && parisHour() >= 3 && parisHour() < 5 },
  { id: 'profile', cat: 'global', tier: 'bronze', name: 'Carte de visite', desc: 'Mettre une photo (ou un singe) et une bio sur ton profil.', test: (e, w) => !!(w.p.avatar && w.p.bio) },
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
  { id: 'sl-5-wild', cat: 'slots', tier: 'gold', name: 'Cour royale au complet', desc: 'Voir 5 WILD en même temps (WILD ×2 compris).', test: (e) => isRound(e, 'slots') && I(e).wilds >= 5 },
  { id: 'sl-4-scatter', cat: 'slots', tier: 'silver', name: 'Allée des totems', desc: 'Voir 4 SCATTER ou plus en un spin.', test: (e) => isRound(e, 'slots') && I(e).scatters >= 4 },
  { id: 'sl-wild-x4', cat: 'slots', tier: 'silver', name: 'Double double', desc: 'Gagner une ligne avec deux WILD ×2 (gain ×4).', test: (e) => isRound(e, 'slots') && I(e).lineMult >= 4 },
  { id: 'sl-x100', cat: 'slots', tier: 'gold', name: 'Gain énorme', desc: 'Gagner au moins ×100 la mise en un spin.', test: (e) => e.type === 'win' && e.game === 'slots' && e.bet > 0 && e.amount / e.bet >= 100 },
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
  { id: 'mn-20', cat: 'mines', tier: 'silver', name: 'Cueilleur intrépide', desc: 'Aux Mines, révéler 20 bananes en une seule partie.', test: (e) => isRound(e, 'mines') && !I(e).lost && I(e).picks >= 20 },
  { id: 'mn-kamikaze', cat: 'mines', tier: 'gold', name: 'Kamikaze', desc: 'Gagner une partie avec 24 mines.', test: (e) => isRound(e, 'mines') && !I(e).lost && I(e).mines >= 24 },
  { id: 'mn-first-click', cat: 'mines', tier: 'bronze', name: 'Premier pas fatal', desc: 'Aux Mines (jeu de casino, pas le Démineur), tomber sur une mine dès la première case. Astuce : avec beaucoup de mines, c\'est presque sûr.', test: (e) => isRound(e, 'mines') && I(e).lost && I(e).picks === 0 },
  { id: 'mn-x50', cat: 'mines', tier: 'silver', name: 'Nerfs d\'acier', desc: 'Encaisser à ×50 ou plus aux Mines.', test: (e) => isRound(e, 'mines') && !I(e).lost && I(e).mult >= 50 },

  /* ------------------------------ DICE ------------------------------ */
  { id: 'dc-sniper', cat: 'dice', tier: 'gold', name: 'Sniper', desc: 'Gagner un lancer avec 1 % de chance ou moins.', test: (e) => isRound(e, 'dice') && I(e).win && I(e).chance <= 1 },
  { id: 'dc-exact', cat: 'dice', tier: 'silver', name: 'Pile poil', desc: 'Tirer exactement 0,00, 50,00 ou 100,00.', test: (e) => isRound(e, 'dice') && [0, 50, 100].includes(I(e).roll) },
  { id: 'dc-win-10', cat: 'dice', tier: 'silver', name: 'Dé pipé ?', desc: 'Gagner 6 lancers d\'affilée avec 50 % de chance ou moins.', test: (e, w, c) => (c.dcHard || 0) >= 6 },
  { id: 'dc-safe-lose', cat: 'dice', tier: 'bronze', name: 'Malchance absolue', desc: 'Perdre un lancer avec 95 % de chance ou plus.', test: (e) => isRound(e, 'dice') && !I(e).win && I(e).chance >= 95 },

  /* ------------------------------ JEUX GRATUITS ------------------------------ */
  { id: 'qz-perfect', cat: 'free', tier: 'silver', name: 'Calculatrice humaine', desc: 'Faire un sans-faute au calcul mental.', test: (e, w) => (st(w).quizPerfect || 0) >= 1 },
  { id: 'qz-hard', cat: 'free', tier: 'gold', name: 'Calculatrice de compétition', desc: 'Faire un sans-faute au calcul mental en mode difficile.', test: (e, w) => (st(w).quizHardPerfect || 0) >= 1 },
  { id: 'qz-100', cat: 'free', tier: 'silver', name: 'Prof de maths', desc: 'Donner 100 bonnes réponses au calcul mental.', test: (e, w) => (st(w).quizCorrect || 0) >= 100, progress: (w) => [st(w).quizCorrect || 0, 100] },
  { id: 'cap-perfect', cat: 'free', tier: 'silver', name: 'Globe-trotteur', desc: 'Faire un sans-faute au quiz des capitales.', test: (e, w) => (st(w).capitalsPerfect || 0) >= 1 },
  { id: 'cap-expert', cat: 'free', tier: 'gold', name: 'Géographe de compétition', desc: 'Faire un sans-faute au quiz des capitales en mode expert.', test: (e, w) => (st(w).capitalsExpertPerfect || 0) >= 1 },
  { id: 'cap-100', cat: 'free', tier: 'silver', name: 'Atlas sur pattes', desc: 'Donner 100 bonnes réponses au quiz des capitales.', test: (e, w) => (st(w).capitalsCorrect || 0) >= 100, progress: (w) => [st(w).capitalsCorrect || 0, 100] },
  { id: 'mv-perfect', cat: 'free', tier: 'silver', name: 'Cinéphile', desc: 'Faire un sans-faute au quiz ciné.', test: (e, w) => (st(w).moviesPerfect || 0) >= 1 },
  { id: 'mv-100', cat: 'free', tier: 'silver', name: 'Critique aux Cahiers', desc: 'Donner 100 bonnes réponses au quiz ciné.', test: (e, w) => (st(w).moviesCorrect || 0) >= 100, progress: (w) => [st(w).moviesCorrect || 0, 100] },
  /* ------------------------------ HI-LO ------------------------------ */
  { id: 'hl-first', cat: 'hilo', tier: 'bronze', name: 'Flair de primate', desc: 'Encaisser une partie de Hi-Lo.', test: (e) => isRound(e, 'hilo') && !I(e).lost && I(e).steps > 0 },
  { id: 'hl-8', cat: 'hilo', tier: 'silver', name: 'Devin de la jungle', desc: 'Enchaîner 8 bonnes réponses dans une partie de Hi-Lo.', test: (e) => isRound(e, 'hilo') && !I(e).lost && I(e).steps >= 8 },
  { id: 'hl-x50', cat: 'hilo', tier: 'gold', name: 'Lecture des cartes', desc: 'Encaisser au moins ×50 au Hi-Lo.', test: (e) => isRound(e, 'hilo') && !I(e).lost && I(e).mult >= 50 },
  { id: 'hl-eq', cat: 'hilo', tier: 'silver', name: 'Pile pareil', desc: 'Gagner un pari « Égal » au Hi-Lo puis encaisser.', test: (e) => isRound(e, 'hilo') && I(e).eq },
  /* ------------------------------ KENO ------------------------------ */
  { id: 'kn-first', cat: 'keno', tier: 'bronze', name: 'Numéro gagnant', desc: 'Gagner une partie de Keno.', test: (e) => isRound(e, 'keno') && e.payout > 0 },
  { id: 'kn-zero', cat: 'keno', tier: 'bronze', name: 'Grille maudite', desc: 'Choisir 10 numéros au Keno et n\'en toucher aucun.', test: (e) => isRound(e, 'keno') && I(e).picks === 10 && I(e).hits === 0 },
  { id: 'kn-7', cat: 'keno', tier: 'gold', name: 'Voyant extralucide', desc: 'Toucher au moins 7 numéros au Keno.', test: (e) => isRound(e, 'keno') && I(e).hits >= 7 },
  { id: 'kn-100', cat: 'keno', tier: 'silver', name: 'Habitué du tirage', desc: 'Jouer 100 parties de Keno.', test: (e, w) => g(w, 'keno').rounds >= 100, progress: (w) => [g(w, 'keno').rounds || 0, 100] },
  /* ------------------------------ ROUE ------------------------------ */
  { id: 'wh-top', cat: 'wheel', tier: 'gold', name: 'Le gros lot', desc: 'Tomber sur la case ×29,7 de la roue en risque élevé.', test: (e) => isRound(e, 'wheel') && I(e).risk === 'high' && I(e).mult > 0 },
  { id: 'wh-max', cat: 'wheel', tier: 'silver', name: 'Case violette', desc: 'Tomber sur la meilleure case en risque faible ou moyen.', test: (e) => isRound(e, 'wheel') && I(e).risk !== 'high' && I(e).top },
  { id: 'wh-zero', cat: 'wheel', tier: 'bronze', name: 'Roue voilée', desc: 'Tomber 8 fois de suite sur ×0.', test: (e, w, c) => streak(c, 'wheel', 'zero') >= 8 },
  { id: 'wh-100', cat: 'wheel', tier: 'silver', name: 'Tourne, tourne', desc: 'Faire tourner la roue 100 fois.', test: (e, w) => g(w, 'wheel').rounds >= 100, progress: (w) => [g(w, 'wheel').rounds || 0, 100] },
  /* ------------------------------ LIMBO ------------------------------ */
  { id: 'lb-first', cat: 'limbo', tier: 'bronze', name: 'Sous la barre', desc: 'Gagner une partie de Limbo.', test: (e) => isRound(e, 'limbo') && I(e).win },
  { id: 'lb-100', cat: 'limbo', tier: 'silver', name: 'Plus bas que terre', desc: 'Gagner au Limbo avec une cible d\'au moins ×100.', test: (e) => isRound(e, 'limbo') && I(e).win && I(e).target >= 100 },
  { id: 'lb-1000', cat: 'limbo', tier: 'gold', name: 'Limbo céleste', desc: 'Gagner au Limbo avec une cible d\'au moins ×1 000.', test: (e) => isRound(e, 'limbo') && I(e).win && I(e).target >= 1000 },
  { id: 'lb-200', cat: 'limbo', tier: 'silver', name: 'Danseur de limbo', desc: 'Jouer 200 parties de Limbo.', test: (e, w) => g(w, 'limbo').rounds >= 200, progress: (w) => [g(w, 'limbo').rounds || 0, 200] },
  { id: 'jc-1', cat: 'jungle', tier: 'bronze', name: 'Première connexion', desc: 'Gagner un tour à la Jungle Connect.', test: (e) => isRound(e, 'jungle') && e.payout > 0 },
  { id: 'jc-casc5', cat: 'jungle', tier: 'silver', name: 'Effet domino', desc: 'Enchaîner 5 cascades en un tour à la Jungle Connect.', test: (e) => isRound(e, 'jungle') && I(e).cascades >= 5 },
  { id: 'jc-bonus', cat: 'jungle', tier: 'silver', name: 'Esprit du masque', desc: 'Déclencher les tours gratuits de la Jungle Connect.', test: (e) => isRound(e, 'jungle') && I(e).bonus },
  { id: 'jc-x64', cat: 'jungle', tier: 'gold', name: 'Multiplication sauvage', desc: 'Obtenir un multiplicateur d\'au moins ×64 sur un seul cluster.', test: (e) => isRound(e, 'jungle') && I(e).clusterMult >= 64 },
  { id: 'jc-x500', cat: 'jungle', tier: 'gold', name: 'Canopée en or', desc: 'Gagner au moins ×500 la mise en un tour de Jungle Connect.', test: (e) => isRound(e, 'jungle') && I(e).mult >= 500 },
  { id: 'jc-gold15', cat: 'jungle', tier: 'legend', name: 'Le Roi Singe', desc: 'Former un cluster de 15 Singes Dorés ou plus.', test: (e) => isRound(e, 'jungle') && I(e).golden },
  { id: 'jc-300', cat: 'jungle', tier: 'silver', name: 'Accro aux lianes', desc: 'Jouer 300 tours de Jungle Connect.', test: (e, w) => g(w, 'jungle').rounds >= 300, progress: (w) => [g(w, 'jungle').rounds || 0, 300] },
  { id: 'sc-1', cat: 'scratch', tier: 'bronze', name: 'Coup de grattoir', desc: 'Gagner avec un ticket à gratter.', test: (e) => isRound(e, 'scratch') && e.payout > 0 },
  { id: 'sc-100', cat: 'scratch', tier: 'silver', name: 'Ongles usés', desc: 'Gratter 100 tickets.', test: (e, w) => g(w, 'scratch').rounds >= 100, progress: (w) => [g(w, 'scratch').rounds || 0, 100] },
  { id: 'sc-x100', cat: 'scratch', tier: 'gold', name: 'Ticket en or', desc: 'Gagner au moins ×100 le prix d\'un ticket à gratter.', test: (e) => isRound(e, 'scratch') && I(e).mult >= 100 },
  { id: 'sc-x1000', cat: 'scratch', tier: 'legend', name: 'Jackpot de la jungle', desc: 'Gagner au moins ×1 000 le prix d\'un ticket à gratter.', test: (e) => isRound(e, 'scratch') && I(e).mult >= 1000 },
  { id: 'sc-tresor', cat: 'scratch', tier: 'silver', name: 'Chasseur de trésor', desc: 'Gagner avec un ticket Trésor de la Jungle.', test: (e) => isRound(e, 'scratch') && e.payout > 0 && I(e).ticket === 'tresor' },
  /* ------------------------------ PROGRESSION ------------------------------ */
  { id: 'vip-macaque', cat: 'progress', tier: 'bronze', name: 'Carte de membre', desc: 'Atteindre le rang VIP Macaque (50 000 misés).', test: (e, w) => vipOf(st(w).totalWagered).index >= vipIndex('macaque'), progress: (w) => [st(w).totalWagered, 5e4] },
  { id: 'vip-chimp', cat: 'progress', tier: 'silver', name: 'Salon VIP', desc: 'Atteindre le rang VIP Chimpanzé (5 000 000 misés).', test: (e, w) => vipOf(st(w).totalWagered).index >= vipIndex('chimpanze'), progress: (w) => [st(w).totalWagered, 5e6] },
  { id: 'vip-gorille', cat: 'progress', tier: 'gold', name: 'Gorille en costume', desc: 'Atteindre le rang VIP Gorille (2,5 milliards misés).', test: (e, w) => vipOf(st(w).totalWagered).index >= vipIndex('gorille'), progress: (w) => [st(w).totalWagered, 2.5e9] },
  { id: 'vip-roi', cat: 'progress', tier: 'legend', name: 'Roi Singe', desc: 'Atteindre le rang VIP Roi Singe (250 milliards misés).', test: (e, w) => vipOf(st(w).totalWagered).index >= vipIndex('roi'), progress: (w) => [st(w).totalWagered, 2.5e11] },
  { id: 'cashback', cat: 'progress', tier: 'bronze', name: 'Petite cagnotte', desc: 'Récupérer ta cagnotte de rakeback VIP.', test: (e, w) => (st(w).rakebackTotal || 0) > 0 },
  { id: 'quest-day', cat: 'progress', tier: 'bronze', name: 'Journée bien remplie', desc: 'Terminer les 3 quêtes du jour.', test: (e) => e.type === 'quest' && e.bonus },
  { id: 'quest-30', cat: 'progress', tier: 'silver', name: 'Aventurier', desc: 'Terminer 30 quêtes du jour.', test: (e, w) => (st(w).questsDone || 0) >= 30, progress: (w) => [st(w).questsDone || 0, 30] },
  { id: 'streak-7', cat: 'progress', tier: 'silver', name: 'Fidèle au poste', desc: 'Récupérer le bonus quotidien 7 jours d\'affilée.', test: (e, w) => ((w.p.streak && w.p.streak.n) || 0) >= 7, progress: (w) => [(w.p.streak && w.p.streak.n) || 0, 7] },
  { id: 'streak-30', cat: 'progress', tier: 'gold', name: 'Un mois sans rater', desc: 'Récupérer le bonus quotidien 30 jours d\'affilée.', test: (e, w) => ((w.p.streak && w.p.streak.n) || 0) >= 30, progress: (w) => [(w.p.streak && w.p.streak.n) || 0, 30] },
  { id: 'wheel-5000', cat: 'progress', tier: 'silver', name: 'Roue de la fortune', desc: 'Tomber sur la case 5 000 de la roue du jour.', test: (e) => e.type === 'daily' && e.base === 5000 },
  { id: 'shop-1', cat: 'progress', tier: 'bronze', name: 'Premier achat', desc: 'Acheter un objet à la boutique.', test: (e, w) => Object.keys((w.p.shop && w.p.shop.owned) || {}).length >= 1 },
  { id: 'shop-10', cat: 'progress', tier: 'silver', name: 'Collectionneur', desc: 'Posséder 10 objets de la boutique.', test: (e, w) => Object.keys((w.p.shop && w.p.shop.owned) || {}).length >= 10, progress: (w) => [Object.keys((w.p.shop && w.p.shop.owned) || {}).length, 10] },
  { id: 'shop-1m', cat: 'progress', tier: 'gold', name: 'Flambeur', desc: 'Dépenser 1 000 000 de Brundles à la boutique.', test: (e, w) => (st(w).shopSpent || 0) >= 1e6, progress: (w) => [st(w).shopSpent || 0, 1e6] },
  { id: 'week-win', cat: 'progress', tier: 'gold', name: 'Champion de la semaine', desc: 'Finir premier du classement de la semaine.', test: (e, w) => (w.weekWins || 0) >= 1 },
  { id: 'jackpot', cat: 'progress', tier: 'legend', name: 'Jackpot !', desc: 'Remporter le jackpot commun de la slot.', test: (e, w) => (st(w).jackpotTotal || 0) > 0 },
  /* ------------------------------ JEUX GRATUITS (V9) ------------------------------ */
  { id: 'fl-perfect', cat: 'free', tier: 'silver', name: 'Porte-drapeau', desc: 'Faire un sans-faute au quiz drapeaux.', test: (e, w) => (st(w).flagsPerfect || 0) >= 1 },
  { id: 'fl-expert', cat: 'free', tier: 'gold', name: 'Vexillologue', desc: 'Faire un sans-faute au quiz drapeaux en mode expert.', test: (e, w) => (st(w).flagsExpertPerfect || 0) >= 1 },
  { id: 'mo-1', cat: 'free', tier: 'bronze', name: 'Mot de passe', desc: 'Trouver le mot du jour.', test: (e, w) => (st(w).motusWon || 0) >= 1 },
  { id: 'mo-fast', cat: 'free', tier: 'gold', name: 'Lecteur de pensées', desc: 'Trouver le mot du jour en 2 essais ou moins.', test: (e, w) => (st(w).motusFast || 0) >= 1 },
  { id: 'mo-7', cat: 'free', tier: 'silver', name: 'Dico vivant', desc: 'Trouver le mot du jour 7 jours d\'affilée.', test: (e, w) => (st(w).motusBestStreak || 0) >= 7, progress: (w) => [st(w).motusStreak || 0, 7] },
  { id: 'hi-10', cat: 'free', tier: 'silver', name: 'Producteur averti', desc: 'Faire une série de 10 au Plus ou moins.', test: (e, w) => (st(w).higherBest || 0) >= 10, progress: (w) => [st(w).higherBest || 0, 10] },
  { id: 'hi-15', cat: 'free', tier: 'gold', name: 'Nabab d\'Hollywood', desc: 'Aller au bout du Plus ou moins (15/15).', test: (e, w) => (st(w).higherPerfect || 0) >= 1 },
  { id: 'fm-sell', cat: 'farm', tier: 'bronze', name: 'Premier régime', desc: 'Vendre des bananes au marché de ta ferme.', test: (e, w) => ((w.p.farm && w.p.farm.sold) || 0) > 0 },
  { id: 'fm-100', cat: 'farm', tier: 'bronze', name: 'Petit producteur', desc: 'Produire 100 bananes par heure.', test: (e, w) => fr(w) >= 100, progress: (w) => [fr(w), 100] },
  { id: 'fm-1k', cat: 'farm', tier: 'silver', name: 'Exploitant agricole', desc: 'Produire 1 000 bananes par heure.', test: (e, w) => fr(w) >= 1000, progress: (w) => [fr(w), 1000] },
  { id: 'fm-10k', cat: 'farm', tier: 'gold', name: 'Empire de la banane', desc: 'Produire 10 000 bananes par heure.', test: (e, w) => fr(w) >= 10000, progress: (w) => [fr(w), 10000] },
  { id: 'fm-land', cat: 'farm', tier: 'silver', name: 'Propriétaire terrien', desc: 'Posséder 25 parcelles.', test: (e, w) => ((w.p.farm && w.p.farm.own && w.p.farm.own.length) || 0) >= 25, progress: (w) => [(w.p.farm && w.p.farm.own && w.p.farm.own.length) || 0, 25] },
  { id: 'fm-full', cat: 'farm', tier: 'legend', name: 'Domaine royal', desc: 'Posséder toute la ferme (49 parcelles).', test: (e, w) => ((w.p.farm && w.p.farm.own && w.p.farm.own.length) || 0) >= 49, progress: (w) => [(w.p.farm && w.p.farm.own && w.p.farm.own.length) || 0, 49] },
  { id: 'fm-f12', cat: 'farm', tier: 'gold', name: 'Bananeraie légendaire', desc: 'Monter une bananeraie au niveau 12.', test: (e, w) => !!(w.p.farm && Array.isArray(w.p.farm.g) && w.p.farm.g.some((x) => x && x.t === 'F' && x.l >= 12)) },
  { id: 'fm-rp', cat: 'farm', tier: 'silver', name: 'Replanteur', desc: 'Faire un prestige (ou une replantation) de ta ferme.', test: (e, w) => ((w.p.farm && w.p.farm.rp) || 0) >= 1 },
  { id: 'fm-pr3', cat: 'farm', tier: 'gold', name: 'Bananier légendaire', desc: 'Atteindre le prestige 3 de la ferme.', test: (e, w) => ((w.p.farm && w.p.farm.pr) || 0) >= 3, progress: (w) => [(w.p.farm && w.p.farm.pr) || 0, 3] },
  { id: 'fm-seeds10', cat: 'farm', tier: 'gold', name: 'Main verte', desc: 'Posséder 10 graines d\'or.', test: (e, w) => ((w.p.farm && w.p.farm.seeds) || 0) >= 10, progress: (w) => [(w.p.farm && w.p.farm.seeds) || 0, 10] },
  { id: 'fm-seeds30', cat: 'farm', tier: 'legend', name: 'Dynastie bananière', desc: 'Posséder 30 graines d\'or.', test: (e, w) => ((w.p.farm && w.p.farm.seeds) || 0) >= 30, progress: (w) => [(w.p.farm && w.p.farm.seeds) || 0, 30] },
  { id: 'fm-f15', cat: 'farm', tier: 'legend', name: 'Bananeraie mythique', desc: 'Monter une bananeraie au niveau 15.', test: (e, w) => !!(w.p.farm && Array.isArray(w.p.farm.g) && w.p.farm.g.some((x) => x && x.t === 'F' && x.l >= 15)) },
  { id: 'fm-1m', cat: 'farm', tier: 'legend', name: 'Magnat de la banane', desc: 'Vendre 1 000 000 de bananes au total.', test: (e, w) => ((w.p.farm && w.p.farm.sold) || 0) >= 1e6, progress: (w) => [(w.p.farm && w.p.farm.sold) || 0, 1e6] },
  { id: 'qn-1', cat: 'free', tier: 'bronze', name: 'Première couronne', desc: 'Résoudre une grille de Queens.', test: (e, w) => (st(w).queensWon || 0) >= 1 },
  { id: 'qn-9', cat: 'free', tier: 'silver', name: 'Reine des neuf', desc: 'Résoudre une grille de Queens en 9 × 9.', test: (e, w) => (st(w).queensWon9 || 0) >= 1 },
  { id: 'qn-fast', cat: 'free', tier: 'gold', name: 'Couronnement éclair', desc: 'Résoudre une grille de Queens en 9 × 9 en moins de 2 minutes.', test: (e, w) => (st(w).queensBest9 || 1e9) < 120 },
  { id: 'tg-1', cat: 'free', tier: 'bronze', name: 'Premier pas de danse', desc: 'Résoudre une grille de Tango.', test: (e, w) => (st(w).tangoWon || 0) >= 1 },
  { id: 'tg-hard', cat: 'free', tier: 'silver', name: 'Danseur étoile', desc: 'Résoudre une grille de Tango difficile.', test: (e, w) => (st(w).tangoWon2 || 0) >= 1 },
  { id: 'tg-fast', cat: 'free', tier: 'gold', name: 'Tango endiablé', desc: 'Résoudre une grille de Tango difficile en moins d\'1 minute 30.', test: (e, w) => (st(w).tangoBest2 || 1e9) < 90 },
  { id: 'pp-1', cat: 'free', tier: 'bronze', name: 'Bien vu', desc: 'Trouver une catégorie à Pinpoint.', test: (e, w) => (st(w).pinpointWon || 0) >= 1 },
  { id: 'pp-first', cat: 'free', tier: 'silver', name: 'Dans le mille', desc: 'Trouver une catégorie à Pinpoint dès le premier indice.', test: (e, w) => (st(w).pinpointClue1 || 0) >= 1 },
  { id: 'pp-10', cat: 'free', tier: 'gold', name: 'Télépathe', desc: 'Trouver 10 catégories à Pinpoint dès le premier indice.', test: (e, w) => (st(w).pinpointClue1 || 0) >= 10, progress: (w) => [st(w).pinpointClue1 || 0, 10] },
  { id: 'sd-1', cat: 'free', tier: 'bronze', name: 'Case départ', desc: 'Résoudre un sudoku.', test: (e, w) => (st(w).sudokuWon || 0) >= 1 },
  { id: 'sd-hard', cat: 'free', tier: 'silver', name: 'Neuf sur neuf', desc: 'Résoudre un sudoku difficile.', test: (e, w) => (st(w).sudokuWon2 || 0) >= 1 },
  { id: 'sd-10', cat: 'free', tier: 'gold', name: 'Maître du sudoku', desc: 'Résoudre 10 sudokus difficiles.', test: (e, w) => (st(w).sudokuWon2 || 0) >= 10, progress: (w) => [st(w).sudokuWon2 || 0, 10] },
  { id: 'ms-1', cat: 'free', tier: 'bronze', name: 'Déminage réussi', desc: 'Gagner une partie de démineur.', test: (e, w) => (st(w).demineurWon || 0) >= 1 },
  { id: 'ms-mid', cat: 'free', tier: 'silver', name: 'Artificier', desc: 'Gagner une partie de démineur en moyen.', test: (e, w) => (st(w).demineurWon1 || 0) >= 1 },
  { id: 'ms-hard', cat: 'free', tier: 'gold', name: 'Démineur d\'élite', desc: 'Gagner une partie de démineur en difficile.', test: (e, w) => (st(w).demineurWon2 || 0) >= 1 },
  { id: 'sn-15', cat: 'free', tier: 'bronze', name: 'Petit creux', desc: 'Manger 15 bananes en une partie de Snake.', test: (e, w) => Math.max(st(w).snakeBest0 || 0, st(w).snakeBest1 || 0, st(w).snakeBest2 || 0) >= 15 },
  { id: 'sn-40', cat: 'free', tier: 'silver', name: 'Boa constrictor', desc: 'Manger 40 bananes en une partie de Snake.', test: (e, w) => Math.max(st(w).snakeBest0 || 0, st(w).snakeBest1 || 0, st(w).snakeBest2 || 0) >= 40 },
  { id: 'sn-hard', cat: 'free', tier: 'gold', name: 'Anaconda', desc: 'Manger 30 bananes en une partie de Snake en difficile.', test: (e, w) => (st(w).snakeBest2 || 0) >= 30, progress: (w) => [st(w).snakeBest2 || 0, 30] },
  { id: 'geo-7', cat: 'free', tier: 'bronze', name: 'Globe-trotteur', desc: 'Trouver au moins 7 pays sur 10 au quiz géographie.', test: (e) => e.type === 'free' && e.game === 'geo' && e.extra && e.extra.Correct >= 7 },
  { id: 'geo-perfect', cat: 'free', tier: 'silver', name: 'Cartographe', desc: 'Faire un sans-faute au quiz géographie.', test: (e) => e.type === 'free' && e.game === 'geo' && e.extra && e.extra.Perfect },
  { id: 'geo-hard', cat: 'free', tier: 'gold', name: 'Atlas vivant', desc: 'Faire un sans-faute au quiz géographie en difficile.', test: (e) => e.type === 'free' && e.game === 'geo' && e.extra && e.extra.HardPerfect },
  { id: 'ty-1', cat: 'free', tier: 'bronze', name: 'Premiers mots', desc: 'Taper 25 mots justes en une partie de Frappe éclair.', test: (e) => e.type === 'free' && e.game === 'typing' && e.extra && e.extra.Words >= 25 },
  { id: 'ty-50', cat: 'free', tier: 'silver', name: 'Doigts de fée', desc: 'Taper 50 mots justes en une partie de Frappe éclair.', test: (e) => e.type === 'free' && e.game === 'typing' && e.extra && e.extra.Words >= 50 },
  { id: 'ty-80', cat: 'free', tier: 'gold', name: 'Machine à écrire', desc: 'Taper 80 mots justes en une partie de Frappe éclair.', test: (e) => e.type === 'free' && e.game === 'typing' && e.extra && e.extra.Words >= 80 },
  { id: 'ty-hard', cat: 'free', tier: 'gold', name: 'Plume accentuée', desc: 'Taper 40 mots justes en difficile à Frappe éclair.', test: (e) => e.type === 'free' && e.game === 'typing' && e.extra && (e.extra.Words2 || 0) >= 40 },
  { id: 'bk-1', cat: 'free', tier: 'bronze', name: 'Casseur', desc: 'Terminer un niveau de casse-briques.', test: (e, w) => st(w).breakerLevels >= 1 },
  { id: 'bk-10', cat: 'free', tier: 'silver', name: 'Démolisseur', desc: 'Terminer 10 niveaux de casse-briques.', test: (e, w) => st(w).breakerLevels >= 10, progress: (w) => [st(w).breakerLevels, 10] },
  { id: 'mm-1', cat: 'free', tier: 'bronze', name: 'Bonne mémoire', desc: 'Terminer une partie de Memory.', test: (e, w) => (st(w).memoryWon || 0) >= 1 },
  { id: 'mm-hard', cat: 'free', tier: 'silver', name: 'Mémoire d\'éléphant', desc: 'Terminer une partie de Memory en difficile.', test: (e, w) => (st(w).memoryWon2 || 0) >= 1 },
  { id: 'mm-perfect', cat: 'free', tier: 'gold', name: 'Photographique', desc: 'Terminer le Memory difficile en 30 coups ou moins.', test: (e, w) => (st(w).memoryBest2 || 1e9) <= 30 },
  { id: 'cw-1', cat: 'free', tier: 'bronze', name: 'Cruciverbiste', desc: 'Remplir une grille de mots croisés.', test: (e, w) => (st(w).crosswordWon || 0) >= 1 },
  { id: 'cw-hard', cat: 'free', tier: 'silver', name: 'Dictionnaire vivant', desc: 'Remplir une grille de mots croisés difficile.', test: (e, w) => (st(w).crosswordWon2 || 0) >= 1 },
  { id: 'cw-clean', cat: 'free', tier: 'gold', name: 'Sans filet', desc: 'Remplir une grille de mots croisés difficile sans aucun indice.', test: (e, w) => (st(w).crosswordCleanHard || 0) >= 1 },
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
