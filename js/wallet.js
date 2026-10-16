// Portefeuille du joueur : tout se passe en local, et on synchronise avec la base
// au maximum toutes les SYNC_INTERVAL_MS (+ à la fermeture de l'onglet et aux événements importants).
import { CONFIG } from './config.js';
import { lazySave } from './lazysave.js';

export function parisDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function msUntilParisMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const secs = (+parts.hour) * 3600 + (+parts.minute) * 60 + (+parts.second);
  return Math.max(0, (86400 - secs) * 1000);
}

const SYNC_FIELDS = ['balance', 'lastDaily', 'breakerLevel', 'slotFS', 'stats', 'ach', 'shop', 'day', 'streak', 'week', 'lastWeek', 'rake', 'vipLevel', 'farm', 'vault', 'updatedAt', 'pseudo', 'pseudoLower'];

// Semaine ISO (lundi → dimanche, heure de Paris), ex : « 2026-W42 »
export function weekId(d = new Date()) {
  const [y, m, day] = parisDate(d).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, day));
  const dow = (t.getUTCDay() + 6) % 7; // lundi = 0
  t.setUTCDate(t.getUTCDate() - dow + 3); // jeudi de la même semaine
  const y1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const n = 1 + Math.round(((t - y1) / 86400000 - 3 + ((y1.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}
export function prevWeekId(d = new Date()) { return weekId(new Date(d.getTime() - 7 * 86400000)); }
export function yesterday(d = new Date()) { return parisDate(new Date(d.getTime() - 86400000)); }

export class Wallet {
  constructor(backend, uid, profile) {
    this.backend = backend;
    this.uid = uid;
    this.p = profile;
    this.dirty = false;
    this.lastSync = Date.now();
    this.syncPromise = null;
    this.listeners = new Set();
    this.syncListeners = new Set();
    this.backupKey = 'chibouk_backup_' + uid;
    this.timer = null;
    this.disabled = false;
  }

  /* ---------- Chargement avec récupération d'une sauvegarde locale non envoyée ---------- */
  static async open(backend, user) {
    const profile = await backend.loadProfile(user.uid, user.pseudo);
    const w = new Wallet(backend, user.uid, profile);
    try {
      const bk = JSON.parse(localStorage.getItem(w.backupKey) || 'null');
      if (bk && bk.dirty && bk.profile && (bk.profile.updatedAt || 0) > (profile.updatedAt || 0)) {
        w.p = { ...profile, ...bk.profile };
        w.dirty = true;
        await w.flush();
      }
    } catch {}
    w.start();
    // dernière connexion (affichée sur la fiche du joueur) : 1 écriture à l'ouverture
    w.p.lastLogin = Date.now();
    backend.saveProfile(user.uid, { lastLogin: w.p.lastLogin }).catch(() => {});
    return w;
  }

  start() {
    this.timer = setInterval(() => this.flush(), CONFIG.SYNC_INTERVAL_MS);
    this._onHide = () => { if (document.visibilityState === 'hidden') this.flush(); };
    this._onPageHide = () => this.flush();
    document.addEventListener('visibilitychange', this._onHide);
    window.addEventListener('pagehide', this._onPageHide);
  }

  async stop() {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this._onHide);
    window.removeEventListener('pagehide', this._onPageHide);
    await this.flush();
    this.listeners.clear();
    this.syncListeners.clear();
  }

  /* ---------- Accès ---------- */
  get balance() { return this.p.balance; }
  get pseudo() { return this.p.pseudo; }
  get stats() { return this.p.stats; }
  canAfford(n) { return n > 0 && n <= this.p.balance && !this.disabled; }

  on(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  onSync(cb) { this.syncListeners.add(cb); return () => this.syncListeners.delete(cb); }
  emit(evt) {
    if (this._capture) { this._capture.push(evt); return; }
    for (const cb of this.listeners) try { cb(evt, this); } catch (e) { console.error(e); }
  }

  // Résultat « sous le gobelet » : fn() crédite tout de suite (solde, stats, sauvegarde : rien n'est perdu si on
  // quitte la page pendant l'animation), mais les événements (affichage du solde, succès, quêtes, jackpot, fil…)
  // ne partent qu'au reveal(), une fois le résultat montré à l'écran. Filet de sécurité : reveal auto après 20 s.
  deferEvents(fn) {
    const queue = [], prev = this._capture, before = this.p.balance;
    this._capture = queue;
    try { fn(); } finally { this._capture = prev; }
    const delta = this.p.balance - before;
    this.hiddenDelta = (this.hiddenDelta || 0) + delta;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true; clearTimeout(t);
      this.hiddenDelta -= delta;
      queue.forEach((e) => this.emit(e));
    };
    const t = setTimeout(reveal, 20000);
    return reveal;
  }
  // Solde tel qu'il doit apparaître à l'écran (sans les gains dont l'animation n'est pas encore finie)
  get shownBalance() { return this.p.balance - (this.hiddenDelta || 0); }
  emitSync(state) { for (const cb of this.syncListeners) try { cb(state, this); } catch (e) { console.error(e); } }

  touch(evt) {
    this.p.updatedAt = Date.now();
    if (this.p.balance > (this.p.stats.peakBalance || 0)) this.p.stats.peakBalance = this.p.balance;
    this.dirty = true;
    // sauvegarde locale de secours, regroupée (le mode turbo enchaîne des dizaines de parties par seconde)
    if (!this._bk) this._bk = lazySave(() => { if (this.dirty) localStorage.setItem(this.backupKey, JSON.stringify({ dirty: true, profile: this.pick() })); }, 400);
    this._bk.save();
    this.emit(evt);
    this.emitSync('pending');
  }

  /* ---------- Opérations de jeu ---------- */
  // Comptes de la semaine (jeux de casino uniquement) : classement de la semaine
  wk() {
    const id = weekId();
    if (!this.p.week || this.p.week.id !== id) {
      if (this.p.week && this.p.week.id) this.p.lastWeek = { ...this.p.week, cb: false };
      this.p.week = { id, wagered: 0, won: 0 };
    }
    return this.p.week;
  }

  bet(game, amount) {
    amount = Math.floor(amount);
    if (!this.canAfford(amount)) return false;
    const s = this.p.stats, g = s.games[game];
    this.p.balance -= amount;
    s.totalWagered += amount;
    if (g) { g.wagered += amount; this.wk().wagered += amount; }
    this.touch({ type: 'bet', game, amount });
    return true;
  }

  // Une "manche" terminée (pour compter les parties jouées et les manches gagnantes)
  // info : détails de la manche (mise, résultat…) utilisés par les succès
  round(game, payout = 0, info = {}) {
    const s = this.p.stats, g = s.games[game];
    s.rounds += 1;
    if (g) { g.rounds += 1; if (payout > 0) g.wins += 1; }
    this.touch({ type: 'round', game, payout, info });
  }

  // Récompense d'un succès débloqué
  achReward(id, amount) {
    if (amount > 0) this.p.balance += amount;
    this.p.stats.achTotal = (this.p.stats.achTotal || 0) + Math.max(0, amount);
    this.touch({ type: 'ach', id, amount });
  }

  // bet (facultatif) = mise correspondant à ce gain, pour retenir le meilleur multiplicateur
  win(game, amount, bet = 0) {
    amount = Math.floor(amount);
    if (amount <= 0) return;
    const s = this.p.stats, g = s.games[game];
    this.p.balance += amount;
    s.totalWon += amount;
    if (g) {
      this.wk().won += amount;
      g.won += amount;
      if (amount > g.biggestWin) g.biggestWin = amount;
      if (bet > 0) { const m = Math.floor((amount / bet) * 100) / 100; if (m > (g.bestMult || 0)) g.bestMult = m; }
    }
    if (amount > s.biggestWin) { s.biggestWin = amount; s.biggestWinGame = game; }
    this.touch({ type: 'win', game, amount, bet });
  }

  // Rembourse une mise (partie annulée avant tout risque) : on annule aussi le "misé" des stats
  refund(game, amount) {
    amount = Math.floor(amount);
    if (amount <= 0) return;
    const s = this.p.stats, g = s.games[game];
    this.p.balance += amount;
    s.totalWagered = Math.max(0, s.totalWagered - amount);
    if (g) { g.wagered = Math.max(0, g.wagered - amount); const w = this.wk(); w.wagered = Math.max(0, w.wagered - amount); }
    this.touch({ type: 'refund', game, amount });
  }

  track(game, key, inc = 1) {
    const g = this.p.stats.games[game];
    if (g) { g[key] = (g[key] || 0) + inc; this.touch({ type: 'track', game }); }
  }

  set(key, value) { this.p[key] = value; this.touch({ type: 'set', key }); }
  get(key) { return this.p[key]; }

  /* ---------- Bonus ---------- */
  dailyAvailable() { return this.p.lastDaily !== parisDate(); }
  // Série de jours consécutifs si on récupère le bonus aujourd'hui
  nextStreak() {
    const st = this.p.streak || {};
    if (st.last === parisDate()) return st.n || 1;
    return st.last === yesterday() ? (st.n || 0) + 1 : 1;
  }
  // amount : gain de la roue du jour (déjà multiplié par la série)
  async claimDaily(amount = CONFIG.DAILY_BONUS, info = {}) {
    if (!this.dailyAvailable()) return false;
    amount = Math.floor(amount);
    const n = this.nextStreak();
    this.p.streak = { last: parisDate(), n, best: Math.max(n, (this.p.streak && this.p.streak.best) || 0) };
    this.p.lastDaily = parisDate();
    this.p.balance += amount;
    this.p.stats.dailyClaims += 1;
    this.p.stats.dailyTotal += amount;
    this.touch({ type: 'daily', amount, streak: n, ...info });
    await this.flush(); // événement important : on enregistre tout de suite
    return true;
  }

  // Crédit « hors jeu » (quêtes, rakeback, bonus VIP, jackpot…) compté dans stats[kind + 'Total']
  credit(kind, amount, evt = {}) {
    amount = Math.floor(amount);
    if (!(amount > 0)) return;
    this.p.balance += amount;
    this.p.stats[kind + 'Total'] = (this.p.stats[kind + 'Total'] || 0) + amount;
    this.touch({ type: kind, amount, ...evt });
  }

  // Dépense en boutique
  spend(amount, item) {
    amount = Math.floor(amount);
    if (!this.canAfford(amount)) return false;
    this.p.balance -= amount;
    this.p.stats.shopSpent = (this.p.stats.shopSpent || 0) + amount;
    this.touch({ type: 'shop', amount, item });
    this.flush();
    return true;
  }

  // Coffre-fort : des Brundles mis à l'abri, qu'on ne peut pas miser par erreur. Dépôt et retrait libres.
  get vault() { return Math.max(0, Math.floor(this.p.vault || 0)); }
  get fortune() { return this.p.balance + this.vault; }
  vaultDeposit(n) {
    n = Math.floor(n);
    if (!(n > 0) || n > this.p.balance) return false;
    this.p.balance -= n; this.p.vault = this.vault + n;
    this.touch({ type: 'vault', amount: n });
    this.flush();
    return true;
  }
  vaultWithdraw(n) {
    n = Math.floor(n);
    if (!(n > 0) || n > this.vault) return false;
    this.p.vault = this.vault - n; this.p.balance += n;
    this.touch({ type: 'vault', amount: -n });
    this.flush();
    return true;
  }

  // Dépense hors boutique (ferme : terrain, bâtisseurs, chantiers accélérés…) comptée dans stats[kind + 'Spent']
  debit(kind, amount, evt = {}) {
    amount = Math.ceil(amount);
    if (!this.canAfford(amount)) return false;
    this.p.balance -= amount;
    this.p.stats[kind + 'Spent'] = (this.p.stats[kind + 'Spent'] || 0) + amount;
    this.touch({ type: kind + '-spend', amount, ...evt });
    return true;
  }

  breakerReward() {
    this.p.balance += CONFIG.BREAKER_REWARD;
    this.p.breakerLevel = (this.p.breakerLevel || 0) + 1;
    this.p.stats.breakerLevels += 1;
    this.p.stats.breakerTotal += CONFIG.BREAKER_REWARD;
    this.touch({ type: 'breaker', amount: CONFIG.BREAKER_REWARD });
    this.vipBonus('breaker', CONFIG.BREAKER_REWARD);
    this.flush();
  }

  // Multiplicateur VIP des gains gratuits : la part en plus est versée à part (stats.vipfreeTotal)
  // pour que les stats de chaque jeu gardent les gains de base. freeMult() est branché par initVip().
  vipBonus(game, amount) {
    const m = this.freeMult ? this.freeMult() : 1;
    if (!(m > 1) || !(amount > 0)) return 0;
    const extra = Math.round(amount * (m - 1));
    this.credit('vipfree', extra, { game, mult: m, base: amount });
    return extra;
  }

  // Récompense d'un jeu gratuit (calcul mental…) — comptée à part, comme le casse-briques
  // meta (facultatif) : infos non comptées dans les stats, transmises avec l'événement (ex. texte pour le fil d'activité)
  freeReward(kind, amount, extra = {}, meta = null) {
    amount = Math.floor(amount);
    const s = this.p.stats;
    s[kind + 'Rounds'] = (s[kind + 'Rounds'] || 0) + 1;
    s[kind + 'Total'] = (s[kind + 'Total'] || 0) + Math.max(0, amount);
    for (const [k, v] of Object.entries(extra)) s[kind + k] = (s[kind + k] || 0) + v;
    if (amount > 0) this.p.balance += amount;
    this.touch({ type: 'free', game: kind, amount: Math.max(0, amount), extra, meta });
    this.vipBonus(kind, amount);
    this.flush();
  }

  // Profil public (photo + bio) : écrit tout de suite, une seule fois, hors de la synchro des 30 s
  async saveCard({ avatar, bio }) {
    const data = { avatar: String(avatar || ''), bio: String(bio || '').slice(0, 160), updatedAt: Date.now() };
    await this.exclusive(() => this.backend.saveProfile(this.uid, data));
    this.p.avatar = data.avatar; this.p.bio = data.bio;
    this.emit({ type: 'profile' });
  }

  /* ---------- Synchronisation ---------- */
  pick() {
    const o = {};
    for (const k of SYNC_FIELDS) o[k] = this.p[k] === undefined ? null : this.p[k];
    return JSON.parse(JSON.stringify(o));
  }

  // Exécute fn() en exclusivité avec les sauvegardes (pas d'écriture concurrente)
  async exclusive(fn) {
    while (this.syncPromise) { try { await this.syncPromise; } catch {} }
    let result;
    this.syncPromise = (async () => { result = await fn(); })();
    try { await this.syncPromise; } finally { this.syncPromise = null; }
    return result;
  }

  async flush() {
    if (!this.dirty || this.disabled) return;
    return this.exclusive(async () => {
      if (!this.dirty) return;
      this.emitSync('saving');
      const snapshot = this.pick();
      const stamp = this.p.updatedAt;
      try {
        await this.backend.saveProfile(this.uid, snapshot);
        if (this.p.updatedAt === stamp) {
          this.dirty = false;
          try { localStorage.setItem(this.backupKey, JSON.stringify({ dirty: false, profile: snapshot })); } catch {}
        }
        this.lastSync = Date.now();
        this.emitSync(this.dirty ? 'pending' : 'saved');
      } catch (e) {
        console.warn('Synchronisation échouée, nouvel essai plus tard', e);
        this.emitSync('error');
      }
    });
  }

  /* ---------- Transferts de Brundles entre joueurs ---------- */
  logTransfer(entry) {
    const key = 'chibouk_transfers_' + this.uid;
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ ...entry, at: Date.now() });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch {}
  }
  transferHistory() {
    try { return JSON.parse(localStorage.getItem('chibouk_transfers_' + this.uid) || '[]'); } catch { return []; }
  }

  async sendTo(target, amount) {
    amount = Math.floor(amount);
    if (!(amount > 0)) throw new Error('Montant invalide');
    if (target.uid === this.uid) throw new Error('Tu ne peux pas t\'envoyer des Brundles à toi-même');
    if (amount > this.p.balance) throw new Error('Solde insuffisant');
    await this.flush(); // le serveur doit connaître ton solde à jour avant le transfert
    return this.exclusive(async () => {
      if (this.dirty) {
        // une partie a modifié le solde entre-temps : on sauvegarde d'abord
        await this.backend.saveProfile(this.uid, this.pick());
        this.dirty = false;
      }
      if (amount > this.p.balance) throw new Error('Solde insuffisant');
      await this.backend.sendTransfer({ from: this.uid, fromPseudo: this.p.pseudo, to: target.uid, toPseudo: target.pseudo, amount });
      this.p.balance -= amount;
      this.p.stats.transfersSent = (this.p.stats.transfersSent || 0) + amount;
      this.logTransfer({ dir: 'out', pseudo: target.pseudo, amount });
      this.touch({ type: 'transfer-out', amount });
      return true;
    });
  }

  // Récupère les Brundles reçus (appelé à l'ouverture puis toutes les ~90 s)
  async checkInbox() {
    if (this.disabled || this.inboxBusy) return [];
    this.inboxBusy = true;
    const received = [];
    try {
      const list = await this.backend.fetchInbox(this.uid);
      for (const t of list) {
        await this.exclusive(async () => {
          await this.backend.claimTransfer(this.uid, t);
          this.p.balance += t.amount;
          this.p.stats.transfersReceived = (this.p.stats.transfersReceived || 0) + t.amount;
          this.logTransfer({ dir: 'in', pseudo: t.fromPseudo, amount: t.amount });
          this.touch({ type: 'transfer-in', amount: t.amount, from: t.fromPseudo });
          received.push(t);
        });
      }
    } catch (e) {
      console.warn('Lecture des transferts impossible', e);
    } finally {
      this.inboxBusy = false;
    }
    return received;
  }
}
