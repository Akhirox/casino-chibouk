// Couche d'accès aux données : Firebase (Auth + Firestore) ou mode démo local (localStorage)
import { firebaseConfig } from './firebase-config.js';
import { CONFIG, PSEUDO_DOMAIN, PSEUDO_RE } from './config.js';

export function emptyStats() {
  const g = () => ({ wagered: 0, won: 0, rounds: 0, wins: 0, biggestWin: 0, bestMult: 0 });
  return {
    totalWagered: 0, totalWon: 0, rounds: 0, biggestWin: 0, biggestWinGame: '',
    peakBalance: CONFIG.START_BALANCE,
    dailyClaims: 0, dailyTotal: 0,
    breakerLevels: 0, breakerTotal: 0,
    transfersSent: 0, transfersReceived: 0,
    quizRounds: 0, quizTotal: 0, quizCorrect: 0, quizPerfect: 0,
    capitalsRounds: 0, capitalsTotal: 0, capitalsCorrect: 0, capitalsPerfect: 0, capitalsExpertCorrect: 0, capitalsExpertPerfect: 0,
    moviesRounds: 0, moviesTotal: 0, moviesCorrect: 0, moviesPerfect: 0,
    games: {
      slots: { ...g(), bonuses: 0 },
      blackjack: { ...g(), blackjacks: 0, pushes: 0 },
      roulette: { ...g() },
      plinko: { ...g() },
      crash: { ...g() },
      tower: { ...g() },
      mines: { ...g() },
      dice: { ...g() },
      hilo: { ...g() },
      keno: { ...g() },
      wheel: { ...g() },
      limbo: { ...g() },
    },
  };
}

export function newProfile(pseudo) {
  return {
    pseudo,
    pseudoLower: pseudo.toLowerCase(),
    balance: CONFIG.START_BALANCE,
    lastDaily: '',
    breakerLevel: 0,
    slotFS: null,
    ach: { u: {}, c: {} },
    shop: { owned: {}, eq: {} },
    day: null,
    streak: null,
    week: null,
    lastWeek: null,
    stats: emptyStats(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Complète un profil existant avec les champs manquants (évolution du site)
export function normalizeProfile(p) {
  const base = newProfile(p.pseudo || 'Joueur');
  const stats = { ...base.stats, ...(p.stats || {}) };
  stats.games = { ...base.stats.games };
  for (const k of Object.keys(base.stats.games)) stats.games[k] = { ...base.stats.games[k], ...((p.stats && p.stats.games && p.stats.games[k]) || {}) };
  const ach = { u: {}, c: {}, ...(p.ach || {}) };
  const shop = { owned: {}, eq: {}, ...(p.shop || {}) };
  return { ...base, ...p, stats, ach, shop };
}

export function validatePseudo(pseudo) {
  if (!PSEUDO_RE.test(pseudo)) return 'Pseudo : 3 à 16 caractères (lettres, chiffres, - ou _)';
  return null;
}

const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REMPLACER');

export async function createBackend() {
  return isConfigured ? createFirebaseBackend() : createDemoBackend();
}

/* ------------------------------------------------------------------ */
/*                               FIREBASE                              */
/* ------------------------------------------------------------------ */
async function createFirebaseBackend() {
  const v = CONFIG.FIREBASE_SDK_VERSION;
  const base = `https://www.gstatic.com/firebasejs/${v}`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const toEmail = (p) => `${p.toLowerCase()}@${PSEUDO_DOMAIN}`;

  const errMsg = (e) => {
    const c = e && e.code || '';
    if (c.includes('email-already-in-use')) return 'Ce pseudo est déjà pris';
    if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Pseudo ou mot de passe incorrect';
    if (c.includes('weak-password')) return 'Mot de passe trop court (6 caractères minimum)';
    if (c.includes('too-many-requests')) return 'Trop de tentatives, réessaie dans quelques minutes';
    if (c.includes('network')) return 'Problème de connexion réseau';
    if (c.includes('unauthorized-domain')) return "Domaine non autorisé : ajoute-le dans Firebase → Authentication → Paramètres";
    return 'Erreur : ' + (e.message || c);
  };

  return {
    mode: 'firebase',
    onAuth(cb) {
      return A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, pseudo: u.displayName || '' } : null));
    },
    async signUp(pseudo, password) {
      const bad = validatePseudo(pseudo); if (bad) throw new Error(bad);
      try {
        const cred = await A.createUserWithEmailAndPassword(auth, toEmail(pseudo), password);
        await A.updateProfile(cred.user, { displayName: pseudo });
        const profile = newProfile(pseudo);
        await F.setDoc(F.doc(db, 'users', cred.user.uid), profile);
        return { uid: cred.user.uid, pseudo };
      } catch (e) { throw new Error(errMsg(e)); }
    },
    async signIn(pseudo, password) {
      try {
        const cred = await A.signInWithEmailAndPassword(auth, toEmail(pseudo), password);
        return { uid: cred.user.uid, pseudo: cred.user.displayName || pseudo };
      } catch (e) { throw new Error(errMsg(e)); }
    },
    async signOut() { await A.signOut(auth); },
    async loadProfile(uid, pseudoHint) {
      const ref = F.doc(db, 'users', uid);
      const snap = await F.getDoc(ref);
      if (!snap.exists()) {
        // Compte Auth sans document (ex : création interrompue) -> on le crée
        const p = newProfile(pseudoHint || 'Joueur');
        await F.setDoc(ref, p);
        return p;
      }
      return normalizeProfile(snap.data());
    },
    async saveProfile(uid, data) {
      await F.setDoc(F.doc(db, 'users', uid), data, { merge: true });
    },
    async leaderboard(n) {
      const q = F.query(F.collection(db, 'users'), F.orderBy('balance', 'desc'), F.limit(n));
      const snap = await F.getDocs(q);
      return snap.docs.map((d) => ({ uid: d.id, ...normalizeProfile(d.data()) }));
    },
    // Tous les joueurs (petit groupe d'amis) : sert au classement, aux meilleures wins et aux transferts
    async listPlayers(n = 200) {
      const snap = await F.getDocs(F.query(F.collection(db, 'users'), F.limit(n)));
      return snap.docs.map((d) => ({ uid: d.id, ...normalizeProfile(d.data()) }));
    },
    // Envoi : en une seule écriture atomique, on débite l'expéditeur et on crée le transfert
    async sendTransfer(t) {
      const batch = F.writeBatch(db);
      batch.update(F.doc(db, 'users', t.from), { balance: F.increment(-t.amount), updatedAt: Date.now() });
      batch.set(F.doc(F.collection(db, 'transfers')), { ...t, claimed: false, createdAt: Date.now() });
      try { await batch.commit(); } catch (e) {
        const c = (e && e.code) || '';
        if (c.includes('permission-denied')) throw new Error("Transfert refusé par Firebase. Vérifie que la dernière version de firestore.rules est bien publiée (Firestore → Règles → Publier), puis réessaie dans une minute.");
        throw new Error('Transfert impossible : ' + (c || e.message));
      }
    },
    async fetchInbox(uid) {
      const q = F.query(F.collection(db, 'transfers'), F.where('to', '==', uid), F.where('claimed', '==', false));
      const snap = await F.getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    // Réception : on marque le transfert comme encaissé et on crédite son propre compte, atomiquement
    async claimTransfer(uid, t) {
      const batch = F.writeBatch(db);
      batch.update(F.doc(db, 'transfers', t.id), { claimed: true, claimedAt: Date.now() });
      batch.update(F.doc(db, 'users', uid), { balance: F.increment(t.amount), updatedAt: Date.now() });
      await batch.commit();
    },
    // Fil d'activité : seulement les nouveaux messages depuis `since` (1 lecture s'il n'y a rien)
    async postFeed(entry) { await F.addDoc(F.collection(db, 'feed'), { ...entry, at: Date.now() }); },
    async fetchFeed(since = 0, n = 25) {
      const q = F.query(F.collection(db, 'feed'), F.where('at', '>', since), F.orderBy('at', 'desc'), F.limit(n));
      const snap = await F.getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    // Jackpot commun : amount = montant accumulé au-dessus de la mise de départ
    async getJackpot() {
      const snap = await F.getDoc(F.doc(db, 'meta', 'jackpot'));
      return snap.exists() ? { amount: 0, ...snap.data() } : { amount: 0 };
    },
    async addJackpot(delta) {
      await F.setDoc(F.doc(db, 'meta', 'jackpot'), { amount: F.increment(Math.floor(delta)) }, { merge: true });
    },
    async winJackpot(uid, pseudo) {
      const ref = F.doc(db, 'meta', 'jackpot');
      return F.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const amount = (snap.exists() && snap.data().amount) || 0;
        const total = CONFIG.JACKPOT_SEED + amount;
        tx.set(ref, { amount: 0, lastWinner: uid, lastPseudo: pseudo, lastAmount: total, lastAt: Date.now() }, { merge: true });
        return total;
      });
    },
    // Palmarès des semaines (un document par semaine, créé une seule fois)
    async listWeeks() {
      const snap = await F.getDocs(F.query(F.collection(db, 'weeks'), F.limit(200)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async createWeek(id, data) {
      try { await F.setDoc(F.doc(db, 'weeks', id), data); return true; } catch { return false; } // déjà créé par un autre joueur
    },
  };
}

/* ------------------------------------------------------------------ */
/*                       MODE DÉMO (localStorage)                       */
/* ------------------------------------------------------------------ */
function createDemoBackend() {
  const K_USERS = 'chibouk_demo_users';
  const K_SESSION = 'chibouk_demo_session';
  const K_TRANSFERS = 'chibouk_demo_transfers';
  const K_FEED = 'chibouk_demo_feed', K_JACKPOT = 'chibouk_demo_jackpot', K_WEEKS = 'chibouk_demo_weeks';
  const kProfile = (uid) => 'chibouk_demo_profile_' + uid;
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let listener = null;
  const hash = async (s) => {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('chibouk:' + s));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch { return 'plain:' + s; }
  };
  const emit = () => { if (listener) { const s = read(K_SESSION, null); listener(s); } };

  return {
    mode: 'demo',
    onAuth(cb) { listener = cb; setTimeout(emit, 0); return () => { listener = null; }; },
    async signUp(pseudo, password) {
      const bad = validatePseudo(pseudo); if (bad) throw new Error(bad);
      if (!password || password.length < 6) throw new Error('Mot de passe trop court (6 caractères minimum)');
      const users = read(K_USERS, {});
      if (users[pseudo.toLowerCase()]) throw new Error('Ce pseudo est déjà pris');
      const uid = 'demo_' + Math.random().toString(36).slice(2, 10);
      users[pseudo.toLowerCase()] = { uid, pseudo, pw: await hash(password) };
      write(K_USERS, users);
      write(kProfile(uid), newProfile(pseudo));
      const s = { uid, pseudo }; write(K_SESSION, s); emit();
      return s;
    },
    async signIn(pseudo, password) {
      const u = read(K_USERS, {})[(pseudo || '').toLowerCase()];
      if (!u || u.pw !== await hash(password)) throw new Error('Pseudo ou mot de passe incorrect');
      const s = { uid: u.uid, pseudo: u.pseudo }; write(K_SESSION, s); emit();
      return s;
    },
    async signOut() { localStorage.removeItem(K_SESSION); emit(); },
    async loadProfile(uid, pseudoHint) {
      const p = read(kProfile(uid), null);
      if (!p) { const np = newProfile(pseudoHint || 'Joueur'); write(kProfile(uid), np); return np; }
      return normalizeProfile(p);
    },
    async saveProfile(uid, data) {
      const p = read(kProfile(uid), {});
      write(kProfile(uid), { ...p, ...data });
    },
    async leaderboard(n) {
      const users = Object.values(read(K_USERS, {}));
      return users.map((u) => ({ uid: u.uid, ...normalizeProfile(read(kProfile(u.uid), newProfile(u.pseudo))) }))
        .sort((a, b) => b.balance - a.balance).slice(0, n);
    },
    async listPlayers(n = 200) {
      const users = Object.values(read(K_USERS, {}));
      return users.slice(0, n).map((u) => ({ uid: u.uid, ...normalizeProfile(read(kProfile(u.uid), newProfile(u.pseudo))) }));
    },
    async sendTransfer(t) {
      const p = read(kProfile(t.from), null);
      if (!p || p.balance < t.amount) throw new Error('Solde insuffisant');
      p.balance -= t.amount; p.updatedAt = Date.now();
      write(kProfile(t.from), p);
      const list = read(K_TRANSFERS, []);
      list.push({ ...t, id: 'tr_' + Math.random().toString(36).slice(2, 10), claimed: false, createdAt: Date.now() });
      write(K_TRANSFERS, list);
    },
    async fetchInbox(uid) {
      return read(K_TRANSFERS, []).filter((t) => t.to === uid && !t.claimed);
    },
    async claimTransfer(uid, t) {
      const list = read(K_TRANSFERS, []);
      const x = list.find((y) => y.id === t.id);
      if (!x || x.claimed) throw new Error('Déjà encaissé');
      x.claimed = true; x.claimedAt = Date.now();
      write(K_TRANSFERS, list);
      const p = read(kProfile(uid), null);
      if (p) { p.balance += t.amount; p.updatedAt = Date.now(); write(kProfile(uid), p); }
    },
    async postFeed(entry) {
      const list = read(K_FEED, []);
      list.push({ ...entry, id: 'f_' + Math.random().toString(36).slice(2, 10), at: Date.now() });
      write(K_FEED, list.slice(-100));
    },
    async fetchFeed(since = 0, n = 25) {
      return read(K_FEED, []).filter((e) => e.at > since).sort((a, b) => b.at - a.at).slice(0, n);
    },
    async getJackpot() { return { amount: 0, ...read(K_JACKPOT, {}) }; },
    async addJackpot(delta) { const j = read(K_JACKPOT, {}); j.amount = (j.amount || 0) + Math.floor(delta); write(K_JACKPOT, j); },
    async winJackpot(uid, pseudo) {
      const j = read(K_JACKPOT, {});
      const total = CONFIG.JACKPOT_SEED + (j.amount || 0);
      write(K_JACKPOT, { amount: 0, lastWinner: uid, lastPseudo: pseudo, lastAmount: total, lastAt: Date.now() });
      return total;
    },
    async listWeeks() { return Object.entries(read(K_WEEKS, {})).map(([id, d]) => ({ id, ...d })); },
    async createWeek(id, data) { const w = read(K_WEEKS, {}); if (w[id]) return false; w[id] = data; write(K_WEEKS, w); return true; },
  };
}
