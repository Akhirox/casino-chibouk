// Réglages généraux du casino — modifie librement
export const CONFIG = {
  CASINO_NAME: 'Casino Chibouk',
  CURRENCY: 'Brundles',
  START_BALANCE: 1000,          // solde offert à la création du compte
  DAILY_BONUS: 1000,            // bonus quotidien (1 fois par jour calendaire, heure de Paris)
  TIMEZONE: 'Europe/Paris',
  SYNC_INTERVAL_MS: 30000,      // envoi du solde/stats vers Firebase au maximum toutes les 30 s
  LEADERBOARD_CACHE_MS: 120000, // le classement n'est relu qu'au bout de 2 min
  LEADERBOARD_SIZE: 15,
  INBOX_INTERVAL_MS: 90000,     // vérification des Brundles reçus toutes les 90 s (1 lecture si rien de neuf)
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
  FEED_INTERVAL_MS: 90000,      // fil d'activité + jackpot relus toutes les 90 s
  QUEST_BONUS: 500,             // bonus quand les 3 quêtes du jour sont terminées
  FIREBASE_SDK_VERSION: '10.12.2',
};

// Pseudo -> faux email pour Firebase Auth
export const PSEUDO_DOMAIN = 'joueurs.casino-chibouk.fr';
export const PSEUDO_RE = /^[a-zA-Z0-9_\-]{3,16}$/;
