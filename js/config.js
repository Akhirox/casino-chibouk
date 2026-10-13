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
  BREAKER_UNLOCK_BELOW: 100,    // casse-briques accessible quand le solde est sous ce seuil
  BREAKER_REWARD: 100,          // gain par niveau terminé
  FIREBASE_SDK_VERSION: '10.12.2',
};

// Pseudo -> faux email pour Firebase Auth
export const PSEUDO_DOMAIN = 'joueurs.casino-chibouk.fr';
export const PSEUDO_RE = /^[a-zA-Z0-9_\-]{3,16}$/;
