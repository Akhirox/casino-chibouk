// Réglages généraux du casino — modifie librement
export const CONFIG = {
  CASINO_NAME: 'Casino Chibouk',
  CURRENCY: 'Brundles',
  START_BALANCE: 1000,          // solde offert à la création du compte
  DAILY_BONUS: 1000,            // bonus quotidien (1 fois par jour calendaire, heure de Paris)
  TIMEZONE: 'Europe/Paris',
  // ----- Économie de la base de données (offre gratuite Firebase : 50 000 lectures et 20 000 écritures par jour) -----
  SYNC_INTERVAL_MS: 60000,      // envoi du solde/stats vers Firebase au maximum toutes les 60 s (1 écriture)
  LEADERBOARD_CACHE_MS: 600000, // liste des joueurs relue au bout de 10 min, et seulement les profils qui ont changé
  PLAYERS_FULL_MS: 12 * 3600000, // relecture complète de tous les profils au plus toutes les 12 h
  IDLE_MS: 4 * 60000,           // sans clic ni touche depuis 4 min : plus aucune lecture en arrière-plan
  JACKPOT_PUSH_MS: 300000,      // contributions de la slot au jackpot envoyées toutes les 5 min (1 écriture)
  LOG_BATCH: 60,                // journal des mini-jeux : jusqu'à 60 parties par écriture…
  LOG_BATCH_MS: 10 * 60000,     // …envoyées au plus tard 10 min après la première
  LEADERBOARD_SIZE: 15,
  INBOX_INTERVAL_MS: 180000,    // vérification des Brundles reçus toutes les 3 min (1 lecture si rien de neuf)
  BREAKER_REWARD: 100,          // gain par niveau terminé
  QUIZ_PER_CORRECT: 10,         // calcul mental : gain par bonne réponse
  QUIZ_PERFECT_BONUS: 50,       // bonus si 10/10
  QUIZ_QUESTIONS: 10,
  QUIZ_SECONDS: 10,
  CAPITALS_SECONDS: 10,  // quiz capitales (mode facile)
  CAPITALS_EXPERT_SECONDS: 15,          // mode expert : réponse à écrire
  CAPITALS_EXPERT_PER_CORRECT: 20,      // mode expert : gain doublé
  CAPITALS_EXPERT_PERFECT_BONUS: 100,
  MOVIES_SECONDS: 15,    // quiz ciné (questions plus longues à lire)
  DAILY_WHEEL: [500, 1000, 750, 2000, 500, 1000, 750, 5000, 500, 1000, 750, 1500], // roue du bonus quotidien
  STREAK_STEP: 0.1,             // +10 % par jour consécutif…
  STREAK_MAX: 2,                // …jusqu'à ×2
  JACKPOT_SEED: 10000,          // mise de départ du jackpot commun (si tu la changes, change aussi 10000 dans firestore.rules)
  JACKPOT_RATE: 0.01,           // 1 % de chaque mise à la slot part dans le jackpot (payé par le casino)
  FEED_INTERVAL_MS: 120000,     // fil d'activité + jackpot relus toutes les 2 min (2 lectures si rien de neuf)
  QUEST_BONUS: 500,             // bonus quand les 3 quêtes du jour sont terminées
  FIREBASE_SDK_VERSION: '10.12.2',
};

// Pseudo -> faux email pour Firebase Auth
export const PSEUDO_DOMAIN = 'joueurs.casino-chibouk.fr';
export const PSEUDO_RE = /^[a-zA-Z0-9_\-]{3,16}$/;
