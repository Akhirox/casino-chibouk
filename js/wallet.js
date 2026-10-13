// Portefeuille du joueur : tout se passe en local, et on synchronise avec la base
// au maximum toutes les SYNC_INTERVAL_MS (+ à la fermeture de l'onglet et aux événements importants).
import { CONFIG } from './config.js';

export function parisDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function msUntilParisMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const secs = (+parts.hour) * 3600 + (+parts.minute) * 60 + (+parts.second);
  return Math.max(0, (86400 - secs) * 1000);
}

const SYNC_FIELDS = ['balance', 'lastDaily', 'breakerLevel', 'slotFS', 'stats', 'updatedAt', 'pseudo', 'pseudoLower'];

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
  emit(evt) { for (const cb of this.listeners) try { cb(evt, this); } catch (e) { console.error(e); } }
  emitSync(state) { for (const cb of this.syncListeners) try { cb(state, this); } catch (e) { console.error(e); } }

  touch(evt) {
    this.p.updatedAt = Date.now();
    if (this.p.balance > (this.p.stats.peakBalance || 0)) this.p.stats.peakBalance = this.p.balance;
    this.dirty = true;
    try { localStorage.setItem(this.backupKey, JSON.stringify({ dirty: true, profile: this.pick() })); } catch {}
    this.emit(evt);
    this.emitSync('pending');
  }

  /* ---------- Opérations de jeu ---------- */
  bet(game, amount) {
    amount = Math.floor(amount);
    if (!this.canAfford(amount)) return false;
    const s = this.p.stats, g = s.games[game];
    this.p.balance -= amount;
    s.totalWagered += amount;
    if (g) g.wagered += amount;
    this.touch({ type: 'bet', game, amount });
    return true;
  }

  // Une "manche" terminée (pour compter les parties jouées et les manches gagnantes)
  round(game, payout = 0) {
    const s = this.p.stats, g = s.games[game];
    s.rounds += 1;
    if (g) { g.rounds += 1; if (payout > 0) g.wins += 1; }
    this.touch({ type: 'round', game });
  }

  // bet (facultatif) = mise correspondant à ce gain, pour retenir le meilleur multiplicateur
  win(game, amount, bet = 0) {
    amount = Math.floor(amount);
    if (amount <= 0) return;
    const s = this.p.stats, g = s.games[game];
    this.p.balance += amount;
    s.totalWon += amount;
    if (g) {
      g.won += amount;
      if (amount > g.biggestWin) g.biggestWin = amount;
      if (bet > 0) { const m = Math.floor((amount / bet) * 100) / 100; if (m > (g.bestMult || 0)) g.bestMult = m; }
    }
    if (amount > s.biggestWin) { s.biggestWin = amount; s.biggestWinGame = game; }
    this.touch({ type: 'win', game, amount });
  }

  // Rembourse une mise (partie annulée avant tout risque) : on annule aussi le "misé" des stats
  refund(game, amount) {
    amount = Math.floor(amount);
    if (amount <= 0) return;
    const s = this.p.stats, g = s.games[game];
    this.p.balance += amount;
    s.totalWagered = Math.max(0, s.totalWagered - amount);
    if (g) g.wagered = Math.max(0, g.wagered - amount);
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
  async claimDaily() {
    if (!this.dailyAvailable()) return false;
    this.p.lastDaily = parisDate();
    this.p.balance += CONFIG.DAILY_BONUS;
    this.p.stats.dailyClaims += 1;
    this.p.stats.dailyTotal += CONFIG.DAILY_BONUS;
    this.touch({ type: 'daily', amount: CONFIG.DAILY_BONUS });
    await this.flush(); // événement important : on enregistre tout de suite
    return true;
  }

  breakerReward() {
    this.p.balance += CONFIG.BREAKER_REWARD;
    this.p.breakerLevel = (this.p.breakerLevel || 0) + 1;
    this.p.stats.breakerLevels += 1;
    this.p.stats.breakerTotal += CONFIG.BREAKER_REWARD;
    this.touch({ type: 'breaker', amount: CONFIG.BREAKER_REWARD });
    this.flush();
  }

  // Récompense d'un jeu gratuit (calcul mental…) — comptée à part, comme le casse-briques
  freeReward(kind, amount, extra = {}) {
    amount = Math.floor(amount);
    const s = this.p.stats;
    s[kind + 'Rounds'] = (s[kind + 'Rounds'] || 0) + 1;
    s[kind + 'Total'] = (s[kind + 'Total'] || 0) + Math.max(0, amount);
    for (const [k, v] of Object.entries(extra)) s[kind + k] = (s[kind + k] || 0) + v;
    if (amount > 0) this.p.balance += amount;
    this.touch({ type: 'free', game: kind, amount: Math.max(0, amount) });
    this.flush();
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
