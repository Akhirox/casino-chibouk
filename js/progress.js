// Progression : rangs VIP + remboursement hebdomadaire, roue du bonus quotidien avec série, quêtes du jour
import { CONFIG } from './config.js';
import { parisDate, weekId, prevWeekId } from './wallet.js';
import { randInt } from './games/slots-math.js';

/* ------------------------------ VIP ------------------------------ */
// Rang selon le total misé depuis toujours ; cb = part des pertes nettes de la semaine remboursée le lundi
export const VIP = [
  { id: 'ouistiti', name: 'Ouistiti', min: 0, cb: 0, color: '#9aa79f' },
  { id: 'macaque', name: 'Macaque', min: 25000, cb: 0.01, color: '#cd7f32' },
  { id: 'babouin', name: 'Babouin', min: 250000, cb: 0.02, color: '#c0c9d0' },
  { id: 'chimpanze', name: 'Chimpanzé', min: 1000000, cb: 0.03, color: '#f5c542' },
  { id: 'orang', name: 'Orang-outan', min: 10000000, cb: 0.04, color: '#ff8a3d' },
  { id: 'gorille', name: 'Gorille', min: 100000000, cb: 0.05, color: '#3ddc84' },
  { id: 'roi', name: 'Roi Singe', min: 1000000000, cb: 0.07, color: '#c77dff' },
];
export function vipOf(totalWagered = 0) {
  let i = 0;
  while (i + 1 < VIP.length && totalWagered >= VIP[i + 1].min) i++;
  return { ...VIP[i], index: i, next: VIP[i + 1] || null };
}
export const vipBadge = (p) => { const v = vipOf((p.stats && p.stats.totalWagered) || 0); return `<span class="vip-badge vip-${v.id}" style="--vc:${v.color}" title="Rang VIP : ${v.name}">${v.name}</span>`; };

// Remboursement disponible pour la semaine dernière (pertes nettes aux jeux de casino × taux du rang actuel)
export function cashbackInfo(wallet) {
  wallet.wk();
  const lw = wallet.p.lastWeek;
  const v = vipOf(wallet.stats.totalWagered);
  if (!lw || lw.id !== prevWeekId() || lw.cb) return { amount: 0, vip: v, loss: 0 };
  const loss = Math.max(0, (lw.wagered || 0) - (lw.won || 0));
  return { amount: Math.floor(loss * v.cb), vip: v, loss };
}
export function claimCashback(wallet) {
  const c = cashbackInfo(wallet);
  if (!c.amount) return 0;
  wallet.p.lastWeek = { ...wallet.p.lastWeek, cb: true };
  wallet.credit('cashback', c.amount, { rate: c.vip.cb });
  wallet.flush();
  return c.amount;
}

/* ------------------------------ Roue du jour ------------------------------ */
export const streakMult = (n) => Math.min(CONFIG.STREAK_MAX, 1 + CONFIG.STREAK_STEP * Math.max(0, n - 1));
export function spinDaily(wallet) {
  const seg = randInt(CONFIG.DAILY_WHEEL.length);
  const n = wallet.nextStreak();
  const mult = streakMult(n);
  return { seg, base: CONFIG.DAILY_WHEEL[seg], streak: n, mult, amount: Math.round(CONFIG.DAILY_WHEEL[seg] * mult) };
}

/* ------------------------------ Quêtes du jour ------------------------------ */
const CASINO = { slots: 'à la Chibouk Slot', blackjack: 'au blackjack', roulette: 'à la roulette', plinko: 'au Plinkoko', crash: 'au Crashibouk', tower: 'à la Tower', mines: 'aux Mines', dice: 'au Dice', hilo: 'au Hi-Lo', keno: 'au Keno', wheel: 'à la Roue', limbo: 'au Limbo' };
const ROUNDS = { slots: 40, blackjack: 12, roulette: 15, plinko: 40, crash: 15, tower: 10, mines: 10, dice: 40, hilo: 10, keno: 20, wheel: 30, limbo: 30 };
const QUIZ = { quiz: 'au calcul mental', capitals: 'au quiz capitales', movies: 'au quiz ciné', flags: 'au quiz drapeaux' };

// Modèles : tier 0 = facile, 1 = moyen, 2 = difficile. n = objectif, ev(e, q) = progression apportée par l'événement
const TEMPLATES = [];
for (const [g, label] of Object.entries(CASINO)) {
  TEMPLATES.push({ id: 'play-' + g, tier: 0, n: ROUNDS[g], text: (n) => `Joue ${n} parties ${label}`, ev: (e) => (e.type === 'round' && e.game === g ? 1 : 0) });
  TEMPLATES.push({ id: 'win-' + g, tier: 1, n: Math.max(3, Math.round(ROUNDS[g] / 4)), text: (n) => `Gagne ${n} parties ${label}`, ev: (e) => (e.type === 'round' && e.game === g && e.payout > ((e.info && e.info.bet) || 0) ? 1 : 0) });
}
for (const [g, label] of Object.entries(QUIZ)) {
  TEMPLATES.push({ id: 'quiz7-' + g, tier: 1, n: 1, text: () => `Fais au moins 7/10 ${label}`, ev: (e) => (e.type === 'free' && e.game === g && e.extra && e.extra.Correct >= 7 ? 1 : 0) });
}
TEMPLATES.push(
  { id: 'mult10', tier: 2, n: 1, text: () => 'Gagne au moins ×10 ta mise en une partie (n\'importe quel jeu)', ev: (e) => (e.type === 'win' && e.bet > 0 && e.amount / e.bet >= 10 ? 1 : 0) },
  { id: 'mult3x5', tier: 1, n: 5, text: (n) => `Gagne ${n} fois au moins ×3 ta mise`, ev: (e) => (e.type === 'win' && e.bet > 0 && e.amount / e.bet >= 3 ? 1 : 0) },
  { id: 'games5', tier: 1, n: 5, text: (n) => `Joue à ${n} jeux de casino différents`, set: true, ev: (e) => (e.type === 'round' && CASINO[e.game] ? e.game : 0) },
  { id: 'rounds100', tier: 2, n: 100, text: (n) => `Joue ${n} parties de casino (tous jeux confondus)`, ev: (e) => (e.type === 'round' && CASINO[e.game] ? 1 : 0) },
  { id: 'breaker2', tier: 1, n: 2, text: (n) => `Termine ${n} niveaux de casse-briques`, ev: (e) => (e.type === 'breaker' ? 1 : 0) },
  { id: 'motus', tier: 2, n: 1, text: () => 'Trouve le mot du jour', ev: (e) => (e.type === 'free' && e.game === 'motus' && e.extra && e.extra.Won ? 1 : 0) },
  { id: 'higher8', tier: 2, n: 1, text: () => 'Fais une série de 8 au Plus ou moins', ev: (e) => (e.type === 'free' && e.game === 'higher' && e.extra && e.extra.Correct >= 8 ? 1 : 0) },
  { id: 'bjbj', tier: 2, n: 1, text: () => 'Fais un blackjack naturel', ev: (e) => (e.type === 'round' && e.game === 'blackjack' && e.info && e.info.bj ? 1 : 0) },
  { id: 'free3', tier: 0, n: 3, text: (n) => `Termine ${n} parties de jeux gratuits (quiz, Plus ou moins…)`, ev: (e) => (e.type === 'free' ? 1 : 0) },
);
export const QUEST_REWARD = [300, 600, 1000];

// Tirage déterministe (même quêtes pour toute la journée), une par niveau de difficulté
function seeded(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
export function questsFor(date, uid) {
  const rnd = seeded(date + '|' + uid);
  return [0, 1, 2].map((tier) => {
    const pool = TEMPLATES.filter((t) => t.tier === tier);
    const t = pool[Math.floor(rnd() * pool.length)];
    return { id: t.id, n: t.n, p: 0, done: false, r: QUEST_REWARD[tier], tier, seen: t.set ? [] : undefined };
  });
}
export const questText = (q) => { const t = TEMPLATES.find((x) => x.id === q.id); return t ? t.text(q.n) : q.id; };

// Journée en cours (quêtes + mot du jour), recréée chaque jour
export function today(wallet) {
  const d = parisDate();
  if (!wallet.p.day || wallet.p.day.date !== d) wallet.p.day = { date: d, quests: questsFor(d, wallet.uid), bonus: false };
  return wallet.p.day;
}

export function initQuests(wallet, onDone) {
  const off = wallet.on((e) => {
    if (!e || ['ach', 'set', 'quest', 'questbonus', 'profile', 'shop'].includes(e.type)) return;
    const day = today(wallet);
    let changed = false;
    for (const q of day.quests) {
      if (q.done) continue;
      const t = TEMPLATES.find((x) => x.id === q.id);
      if (!t) continue;
      let v = 0;
      try { v = t.ev(e, q); } catch {}
      if (!v) continue;
      if (t.set) { if (!q.seen.includes(v)) { q.seen.push(v); q.p = q.seen.length; changed = true; } } else { q.p = Math.min(q.n, q.p + v); changed = true; }
      if (q.p >= q.n) {
        q.done = true;
        setTimeout(() => { wallet.p.stats.questsDone = (wallet.p.stats.questsDone || 0) + 1; wallet.credit('quest', q.r, { quest: q.id }); onDone && onDone(q, false); }, 0);
      }
    }
    if (changed && !day.bonus && day.quests.every((q) => q.done)) {
      day.bonus = true;
      setTimeout(() => { wallet.credit('quest', CONFIG.QUEST_BONUS, { bonus: true }); onDone && onDone(null, true); }, 50);
    }
  });
  return { destroy: off };
}
