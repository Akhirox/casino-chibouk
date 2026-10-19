// Portefeuille du joueur : tout se passe en local, et on synchronise avec la base
// au maximum toutes les SYNC_INTERVAL_MS (+ à la fermeture de l'onglet et aux événements importants).
import { CONFIG } from './config.js';
import { lazySave } from './lazysave.js';
import { cosBonus } from './bonus.js';

// Sauvegarde locale de secours signée : une copie modifiée à la main (solde gonflé dans le localStorage…) est ignorée
const BK_SALT = 'chibouk/bk/v2/9f3a';
async function bkSign(uid, json) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(BK_SALT + '|' + uid + '|' + json));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return ''; }
}
export function parisDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function msUntilParisMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const secs = (+parts.hour) * 3600 + (+parts.minute) * 60 + (+parts.second);
  return Math.max(0, (86400 - secs) * 1000);
}

const SYNC_FIELDS = ['balance', 'lastDaily', 'breakerLevel', 'slotFS', 'stats', 'ach', 'shop', 'day', 'streak', 'week', 'lastWeek', 'rake', 'vipLevel', 'farm', 'vault', 'fair', 'adminRev', 'updatedAt', 'pseudo', 'pseudoLower', 'lastLogin', 'vipV', 'loot', 'vaultT'];

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
      // on ne reprend une sauvegarde locale non envoyée que si elle est intacte (signature), récente (moins de 24 h),
      // plus récente que la base, et faite avant toute intervention d'un admin sur le compte
      let saved = null;
      try { saved = bk && bk.json ? JSON.parse(bk.json) : null; } catch {}
      const signed = !!(saved && bk.sig && bk.sig === (await bkSign(user.uid, bk.json)));
      const ok = bk && bk.dirty && signed
        && (saved.updatedAt || 0) > (profile.updatedAt || 0) && Date.now() - (saved.updatedAt || 0) < 86400000
        && (saved.adminRev || 0) === (profile.adminRev || 0) && !profile.banned;
      if (ok) {
        w.p = { ...profile, ...saved, adminRev: profile.adminRev || 0, banned: profile.banned || false };
        w.dirty = true;
        await w.flush();
      } else if (bk && bk.dirty) {
        try { localStorage.removeItem(w.backupKey); } catch {}
        // sauvegarde modifiée à la main : signature fausse, ou ancien format avec un solde bien plus haut que celui de la base
        const old = bk.profile || saved;
        if (bk.json ? !signed : old && (old.balance || 0) > (profile.balance || 0) + 1e6) w.tampered = { balance: old ? old.balance : null, base: profile.balance };
      }
    } catch {}
    w.start();
    // dernière connexion (affichée sur la fiche du joueur) : envoyée avec la prochaine sauvegarde, pas d'écriture en plus
    w.p.lastLogin = Date.now();
    return w;
  }

  start() {
    this.timer = setInterval(() => this.flush(), CONFIG.SYNC_INTERVAL_MS);
    // onglet caché : sauvegarde, mais pas plus d'une fois toutes les 20 s (ceux qui jonglent entre les onglets
    // ne déclenchent pas une écriture à chaque fois ; la sauvegarde locale signée couvre le reste)
    this._onHide = () => { if (document.visibilityState === 'hidden' && Date.now() - (this.lastSync || 0) > 20000) this.flush(); };
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
  deferEvents(fn, maxMs = 20000) {
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
    const t = setTimeout(reveal, maxMs);
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
    if (!this._bk) this._bk = lazySave(() => {
      if (!this.dirty) return;
      const json = JSON.stringify(this.pick());
      bkSign(this.uid, json).then((sig) => { if (this.dirty) { try { localStorage.setItem(this.backupKey, JSON.stringify({ dirty: true, json, sig })); } catch {} } });
    }, 400);
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
  // Intérêts : 5 % par jour (+ bonus de l'effet de victoire équipé), au prorata du temps passé dans le coffre.
  // Calculés à la volée (aucune écriture en plus) et ajoutés au coffre à chaque dépôt, retrait ou sauvegarde.
  // + bonus permanent des caisses (p.loot.vault, plafonné à +100 %)
  get vaultRate() { return CONFIG.VAULT_DAILY_RATE * (1 + cosBonus(this.p, 'vault') + Math.min(1, Math.max(0, (this.p.loot && this.p.loot.vault) || 0))); }
  vaultPending(now = Date.now()) {
    const v = Math.max(0, this.p.vault || 0), t = this.p.vaultT || now;
    return v > 0 ? v * this.vaultRate * Math.max(0, now - t) / 86400000 : 0;
  }
  accrueVault(now = Date.now()) {
    const x = this.vaultPending(now);
    this.p.vaultT = now;
    if (x > 0) { this.p.vault = (this.p.vault || 0) + x; this.p.stats.interestTotal = (this.p.stats.interestTotal || 0) + x; }
    return x;
  }
  get vault() { return Math.max(0, Math.floor((this.p.vault || 0) + this.vaultPending())); }
  get fortune() { return this.p.balance + this.vault; }
  vaultDeposit(n) {
    n = Math.floor(n);
    if (!(n > 0) || n > this.p.balance) return false;
    this.accrueVault();
    this.p.balance -= n; this.p.vault = this.vault + n;
    this.touch({ type: 'vault', amount: n });
    this.flush();
    return true;
  }
  vaultWithdraw(n) {
    n = Math.floor(n);
    if (!(n > 0) || n > this.vault) return false;
    this.accrueVault();
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
    const vx = this.vipBonus('breaker', CONFIG.BREAKER_REWARD);
    const lx = this.lootBonus ? this.lootBonus('breaker', CONFIG.BREAKER_REWARD + vx) || 0 : 0; // boost de caisse
    this.lastFree = { kind: 'breaker', base: CONFIG.BREAKER_REWARD, total: CONFIG.BREAKER_REWARD + vx + lx, at: Date.now() };
    // pas d'envoi immédiat : la synchro régulière s'en charge (1 écriture par minute au lieu d'1 par partie)
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
    const vx = this.vipBonus(kind, amount);
    const lx = this.lootBonus ? this.lootBonus(kind, amount + vx) || 0 : 0; // boost de caisse sur ce mini-jeu
    this.lastFree = { kind, base: Math.max(0, amount), total: Math.max(0, amount) + vx + lx, at: Date.now() }; // affichage « base → avec bonus »
    // pas d'envoi immédiat : la synchro régulière s'en charge (1 écriture par minute au lieu d'1 par partie)
  }

  // Amende (triche détectée sur un mini-jeu) : prise sur le solde, puis sur le coffre si besoin. Renvoie le montant pris.
  penalty(game, amount) {
    amount = Math.max(0, Math.floor(amount));
    this.accrueVault();
    const fromBal = Math.min(amount, Math.floor(this.p.balance)), fromVault = Math.min(amount - fromBal, this.vault);
    this.p.balance -= fromBal;
    if (fromVault) this.p.vault = this.vault - fromVault;
    const taken = fromBal + fromVault;
    this.p.stats.penaltyTotal = (this.p.stats.penaltyTotal || 0) + taken;
    this.touch({ type: 'penalty', game, amount: taken });
    this.flush();
    return taken;
  }

  // Profil public (photo + bio) : écrit tout de suite, une seule fois, hors de la synchro régulière
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
    o.adminRev = this.p.adminRev || 0; // jamais null : les règles comparent ce compteur à celui de la base
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
      if ((this.p.vault || 0) > 0) this.accrueVault(); // intérêts du coffre ajoutés avec la sauvegarde
      const snapshot = this.pick();
      const stamp = this.p.updatedAt;
      try {
        await this.backend.saveProfile(this.uid, snapshot);
        if (this.p.updatedAt === stamp) {
          this.dirty = false;
          try { localStorage.setItem(this.backupKey, JSON.stringify({ dirty: false })); } catch {}
        }
        this.lastSync = Date.now();
        this.emitSync(this.dirty ? 'pending' : 'saved');
      } catch (e) {
        console.warn('Synchronisation échouée, nouvel essai plus tard', e);
        this.emitSync('error');
        // refus des règles : compte suspendu ou modifié par un admin depuis l'ouverture → l'app recharge le profil
        if (String((e && e.code) || '').includes('permission-denied') && this.onRejected) this.onRejected(e);
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

  // Récupère les Brundles reçus (appelé à l'ouverture puis toutes les 3 min si le joueur est là)
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
