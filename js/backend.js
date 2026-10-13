// Couche d'accès aux données : Firebase (Auth + Firestore) ou mode démo local (localStorage)
import { firebaseConfig } from './firebase-config.js';
import { CONFIG, PSEUDO_DOMAIN, PSEUDO_RE } from './config.js';

export function emptyStats() {
  const g = () => ({ wagered: 0, won: 0, rounds: 0, wins: 0, biggestWin: 0 });
  return {
    totalWagered: 0, totalWon: 0, rounds: 0, biggestWin: 0, biggestWinGame: '',
    peakBalance: CONFIG.START_BALANCE,
    dailyClaims: 0, dailyTotal: 0,
    breakerLevels: 0, breakerTotal: 0,
    games: {
      slots: { ...g(), bonuses: 0 },
      blackjack: { ...g(), blackjacks: 0, pushes: 0 },
      roulette: { ...g() },
      plinko: { ...g() },
      crash: { ...g() },
      tower: { ...g() },
      mines: { ...g() },
      dice: { ...g() },
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
  return { ...base, ...p, stats };
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
  };
}

/* ------------------------------------------------------------------ */
/*                       MODE DÉMO (localStorage)                       */
/* ------------------------------------------------------------------ */
function createDemoBackend() {
  const K_USERS = 'chibouk_demo_users';
  const K_SESSION = 'chibouk_demo_session';
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
  };
}
