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
  FIREBASE_SDK_VERSION: '10.12.2',
};

// Pseudo -> faux email pour Firebase Auth
export const PSEUDO_DOMAIN = 'joueurs.casino-chibouk.fr';
export const PSEUDO_RE = /^[a-zA-Z0-9_\-]{3,16}$/;
